import {
  ConfigPlugin,
  createRunOncePlugin,
  WarningAggregator,
  withAndroidManifest,
  withAppBuildGradle,
  withDangerousMod,
  withEntitlementsPlist,
  withInfoPlist,
} from 'expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';
import withLocalOpenIAP from './withLocalOpenIAP';

const pkg = require('../../package.json');
const openiapVersions = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, '../../openiap-versions.json'),
    'utf8',
  ),
);
const OPENIAP_ANDROID_VERSION = openiapVersions.google;

// Log a message only once per Node process
const logOnce = (() => {
  const printed = new Set<string>();
  return (msg: string) => {
    if (!printed.has(msg)) {
      console.log(msg);
      printed.add(msg);
    }
  };
})();

const addLineToGradle = (
  content: string,
  anchor: RegExp | string,
  lineToAdd: string,
  offset: number = 1,
): string => {
  const lines = content.split('\n');
  const index = lines.findIndex((line) => line.match(anchor));
  if (index === -1) {
    WarningAggregator.addWarningAndroid(
      'expo-iap',
      `dependencies { ... } block not found; skipping injection: ${lineToAdd.trim()}`,
    );
    return content;
  } else {
    lines.splice(index + offset, 0, lineToAdd);
  }
  return lines.join('\n');
};

const modifyAppBuildGradle = (
  gradle: string,
  language: 'groovy' | 'kotlin',
): string => {
  let modified = gradle;

  // Ensure OpenIAP dependency exists at desired version in app-level build.gradle(.kts)
  const impl = (ga: string, v: string) =>
    language === 'kotlin'
      ? `    implementation("${ga}:${v}")`
      : `    implementation "${ga}:${v}"`;
  const openiapDep = impl(
    'io.github.hyochan.openiap:openiap-google',
    OPENIAP_ANDROID_VERSION,
  );

  // Remove any existing openiap-google lines (any version, groovy/kotlin, implementation/api)
  const openiapAnyLine =
    /^\s*(?:implementation|api)\s*\(?\s*["']io\.github\.hyochan\.openiap:openiap-google:[^"']+["']\s*\)?\s*$/gm;
  const hadExisting = openiapAnyLine.test(modified);
  if (hadExisting) {
    modified = modified.replace(openiapAnyLine, '').replace(/\n{3,}/g, '\n\n');
  }

  // Ensure the desired dependency line is present
  if (
    !new RegExp(
      String.raw`io\.github\.hyochan\.openiap:openiap-google:${OPENIAP_ANDROID_VERSION}`,
    ).test(modified)
  ) {
    // Insert just after the opening `dependencies {` line
    modified = addLineToGradle(modified, /dependencies\s*{/, openiapDep, 1);
    logOnce(
      hadExisting
        ? `🛠️ expo-iap: Replaced OpenIAP dependency with ${OPENIAP_ANDROID_VERSION}`
        : `🛠️ expo-iap: Added OpenIAP dependency (${OPENIAP_ANDROID_VERSION}) to build.gradle`,
    );
  }

  return modified;
};

const withIapAndroid: ConfigPlugin<{addDeps?: boolean} | void> = (
  config,
  props,
) => {
  const addDeps = props?.addDeps ?? true;

  if (addDeps) {
    config = withAppBuildGradle(config, (config) => {
      // language provided by config-plugins: 'groovy' | 'kotlin'
      const language = (config.modResults as any).language || 'groovy';
      config.modResults.contents = modifyAppBuildGradle(
        config.modResults.contents,
        language,
      );
      return config;
    });
  }

  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    if (!manifest.manifest['uses-permission']) {
      manifest.manifest['uses-permission'] = [];
    }

    const permissions = manifest.manifest['uses-permission'];
    const billingPerm = {$: {'android:name': 'com.android.vending.BILLING'}};

    const alreadyExists = permissions.some(
      (p) => p.$['android:name'] === 'com.android.vending.BILLING',
    );
    if (!alreadyExists) {
      permissions.push(billingPerm);
      logOnce('✅ Added com.android.vending.BILLING to AndroidManifest.xml');
    } else {
      logOnce(
        'ℹ️ com.android.vending.BILLING already exists in AndroidManifest.xml',
      );
    }

    return config;
  });

  return config;
};

export interface IOSAlternativeBillingConfig {
  /** Country codes where external purchases are supported (ISO 3166-1 alpha-2) */
  countries?: string[];
  /** External purchase URLs per country (iOS 15.4+) */
  links?: Record<string, string>;
  /** Multiple external purchase URLs per country (iOS 17.5+, up to 5 per country) */
  multiLinks?: Record<string, string[]>;
  /** Custom link regions (iOS 18.1+) */
  customLinkRegions?: string[];
  /** Streaming link regions for music apps (iOS 18.2+) */
  streamingLinkRegions?: string[];
  /** Enable external purchase link entitlement */
  enableExternalPurchaseLink?: boolean;
  /** Enable external purchase link streaming entitlement (music apps only) */
  enableExternalPurchaseLinkStreaming?: boolean;
}

/** Add external purchase entitlements and Info.plist configuration */
const withIosAlternativeBilling: ConfigPlugin<
  IOSAlternativeBillingConfig | undefined
> = (config, options) => {
  if (!options || !options.countries || options.countries.length === 0) {
    return config;
  }

  // Add entitlements
  config = withEntitlementsPlist(config, (config) => {
    // Always add basic external purchase entitlement when countries are specified
    config.modResults['com.apple.developer.storekit.external-purchase'] = true;
    logOnce(
      '✅ Added com.apple.developer.storekit.external-purchase to entitlements',
    );

    // Add external purchase link entitlement if enabled
    if (options.enableExternalPurchaseLink) {
      config.modResults['com.apple.developer.storekit.external-purchase-link'] =
        true;
      logOnce(
        '✅ Added com.apple.developer.storekit.external-purchase-link to entitlements',
      );
    }

    // Add streaming entitlement if enabled
    if (options.enableExternalPurchaseLinkStreaming) {
      config.modResults[
        'com.apple.developer.storekit.external-purchase-link-streaming'
      ] = true;
      logOnce(
        '✅ Added com.apple.developer.storekit.external-purchase-link-streaming to entitlements',
      );
    }

    return config;
  });

  // Add Info.plist configuration
  config = withInfoPlist(config, (config) => {
    const plist = config.modResults;

    // 1. SKExternalPurchase (Required)
    plist.SKExternalPurchase = options.countries;
    logOnce(
      `✅ Added SKExternalPurchase with countries: ${options.countries?.join(
        ', ',
      )}`,
    );

    // 2. SKExternalPurchaseLink (Optional - iOS 15.4+)
    if (options.links && Object.keys(options.links).length > 0) {
      plist.SKExternalPurchaseLink = options.links;
      logOnce(
        `✅ Added SKExternalPurchaseLink for ${
          Object.keys(options.links).length
        } countries`,
      );
    }

    // 3. SKExternalPurchaseMultiLink (iOS 17.5+)
    if (options.multiLinks && Object.keys(options.multiLinks).length > 0) {
      plist.SKExternalPurchaseMultiLink = options.multiLinks;
      logOnce(
        `✅ Added SKExternalPurchaseMultiLink for ${
          Object.keys(options.multiLinks).length
        } countries`,
      );
    }

    // 4. SKExternalPurchaseCustomLinkRegions (iOS 18.1+)
    if (options.customLinkRegions && options.customLinkRegions.length > 0) {
      plist.SKExternalPurchaseCustomLinkRegions = options.customLinkRegions;
      logOnce(
        `✅ Added SKExternalPurchaseCustomLinkRegions: ${options.customLinkRegions.join(
          ', ',
        )}`,
      );
    }

    // 5. SKExternalPurchaseLinkStreamingRegions (iOS 18.2+)
    if (
      options.streamingLinkRegions &&
      options.streamingLinkRegions.length > 0
    ) {
      plist.SKExternalPurchaseLinkStreamingRegions =
        options.streamingLinkRegions;
      logOnce(
        `✅ Added SKExternalPurchaseLinkStreamingRegions: ${options.streamingLinkRegions.join(
          ', ',
        )}`,
      );
    }

    return config;
  });

  return config;
};

/** Ensure Podfile uses CocoaPods CDN and no stale local OpenIAP entry remains. */
const withIapIOS: ConfigPlugin<IOSAlternativeBillingConfig | undefined> = (
  config,
  options,
) => {
  // Add iOS alternative billing configuration if provided
  if (options) {
    config = withIosAlternativeBilling(config, options);
  }

  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const {platformProjectRoot} = config.modRequest;
      const podfilePath = path.join(platformProjectRoot, 'Podfile');

      if (!fs.existsSync(podfilePath)) {
        return config;
      }

      let content = fs.readFileSync(podfilePath, 'utf8');

      // 1) Ensure CocoaPods CDN source is present at the very top
      const cdnLine = `source 'https://cdn.cocoapods.org/'`;
      if (!content.includes(cdnLine)) {
        content = `${cdnLine}\n\n${content}`;
        logOnce('📦 expo-iap: Added CocoaPods CDN source to Podfile');
      }

      // 2) Remove any lingering local OpenIAP pod injection
      const localPodRegex =
        /^\s*pod\s+'openiap'\s*,\s*:path\s*=>\s*['"][^'"]+['"][^\n]*$/gm;
      if (localPodRegex.test(content)) {
        content = content.replace(localPodRegex, '').replace(/\n{3,}/g, '\n\n');
        logOnce('🧹 expo-iap: Removed local OpenIAP pod from Podfile');
      }

      fs.writeFileSync(podfilePath, content);
      return config;
    },
  ]);
};

export interface ExpoIapPluginOptions {
  /** Local development path for OpenIAP library */
  localPath?:
    | string
    | {
        ios?: string;
        android?: string;
      };
  /** Enable local development mode */
  enableLocalDev?: boolean;
  /**
   * iOS Alternative Billing configuration.
   * Configure external purchase countries, links, and entitlements.
   * Requires approval from Apple.
   * @platform ios
   */
  iosAlternativeBilling?: IOSAlternativeBillingConfig;
}

const withIap: ConfigPlugin<ExpoIapPluginOptions | void> = (
  config,
  options,
) => {
  try {
    // Respect explicit flag; fall back to presence of localPath only when flag is unset
    const isLocalDev = options?.enableLocalDev ?? !!options?.localPath;
    // Apply Android modifications (skip adding deps when linking local module)
    let result = withIapAndroid(config, {addDeps: !isLocalDev});

    // iOS: choose one path to avoid overlap
    if (isLocalDev) {
      if (!options?.localPath) {
        WarningAggregator.addWarningIOS(
          'expo-iap',
          'enableLocalDev is true but no localPath provided. Skipping local OpenIAP integration.',
        );
      } else {
        const raw = options.localPath;
        const resolved =
          typeof raw === 'string'
            ? path.resolve(raw)
            : {
                ios: raw.ios ? path.resolve(raw.ios) : undefined,
                android: raw.android ? path.resolve(raw.android) : undefined,
              };

        const preview =
          typeof resolved === 'string'
            ? resolved
            : `ios=${resolved.ios ?? 'auto'}, android=${
                resolved.android ?? 'auto'
              }`;
        logOnce(`🔧 [expo-iap] Enabling local OpenIAP: ${preview}`);
        result = withLocalOpenIAP(result, {
          localPath: resolved,
          iosAlternativeBilling: options?.iosAlternativeBilling,
        });
      }
    } else {
      // Ensure iOS Podfile is set up to resolve public CocoaPods specs
      result = withIapIOS(result, options?.iosAlternativeBilling);
      logOnce('📦 [expo-iap] Using OpenIAP from CocoaPods');
    }

    return result;
  } catch (error) {
    WarningAggregator.addWarningAndroid(
      'expo-iap',
      `expo-iap plugin encountered an error: ${error}`,
    );
    console.error('expo-iap plugin error:', error);
    return config;
  }
};

export {withIosAlternativeBilling};
export default createRunOncePlugin(withIap, pkg.name, pkg.version);
