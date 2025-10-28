import {
  ConfigPlugin,
  createRunOncePlugin,
  WarningAggregator,
  withAndroidManifest,
  withAppBuildGradle,
  withGradleProperties,
  withPodfile,
} from 'expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';
import withLocalOpenIAP from './withLocalOpenIAP';
import {
  withIosAlternativeBilling,
  type IOSAlternativeBillingConfig,
} from './withIosAlternativeBilling';

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
  isHorizonEnabled?: boolean,
): string => {
  let modified = gradle;

  // Determine which flavor to use based on isHorizonEnabled
  const flavor = isHorizonEnabled ? 'horizon' : 'play';

  // Use openiap-google-horizon artifact when horizon is enabled
  const artifactId = isHorizonEnabled
    ? 'openiap-google-horizon'
    : 'openiap-google';

  // Ensure OpenIAP dependency exists at desired version in app-level build.gradle(.kts)
  const impl = (ga: string, v: string) =>
    language === 'kotlin'
      ? `    implementation("${ga}:${v}")`
      : `    implementation "${ga}:${v}"`;
  const openiapDep = impl(
    `io.github.hyochan.openiap:${artifactId}`,
    OPENIAP_ANDROID_VERSION,
  );

  // Remove any existing openiap-google or openiap-google-horizon lines (any version, groovy/kotlin, implementation/api)
  const openiapAnyLine =
    /^\s*(?:implementation|api)\s*\(?\s*["']io\.github\.hyochan\.openiap:openiap-google(?:-horizon)?:[^"']+["']\s*\)?\s*$/gm;
  const hadExisting = openiapAnyLine.test(modified);
  if (hadExisting) {
    modified = modified.replace(openiapAnyLine, '').replace(/\n{3,}/g, '\n\n');
  }

  // Ensure the desired dependency line is present
  if (
    !new RegExp(
      String.raw`io\.github\.hyochan\.openiap:${artifactId}:${OPENIAP_ANDROID_VERSION}`,
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

  // Add flavor dimension and default config for OpenIAP if horizon is enabled
  if (isHorizonEnabled) {
    // Add missingDimensionStrategy to select horizon flavor
    const defaultConfigRegex = /defaultConfig\s*{/;
    if (defaultConfigRegex.test(modified)) {
      const strategyLine =
        language === 'kotlin'
          ? `        missingDimensionStrategy("platform", "${flavor}")`
          : `        missingDimensionStrategy "platform", "${flavor}"`;

      // Remove any existing platform strategies first to avoid duplicates
      const strategyPattern =
        /^\s*missingDimensionStrategy\s*\(?\s*["']platform["']\s*,\s*["'](play|horizon)["']\s*\)?\s*$/gm;
      if (strategyPattern.test(modified)) {
        modified = modified.replace(strategyPattern, '');
        logOnce('🧹 Removed existing missingDimensionStrategy for platform');
      }

      // Add the new strategy
      if (!/missingDimensionStrategy.*platform/.test(modified)) {
        modified = addLineToGradle(
          modified,
          defaultConfigRegex,
          strategyLine,
          1,
        );
        logOnce(
          `🛠️ expo-iap: Added missingDimensionStrategy for ${flavor} flavor`,
        );
      }
    }
  }

  return modified;
};

const withIapAndroid: ConfigPlugin<
  {
    addDeps?: boolean;
    horizonAppId?: string;
    isHorizonEnabled?: boolean;
  } | void
> = (config, props) => {
  const addDeps = props?.addDeps ?? true;

  // Add dependencies if needed (only when not using local module)
  if (addDeps) {
    config = withAppBuildGradle(config, (config) => {
      const language = (config.modResults as any).language || 'groovy';
      config.modResults.contents = modifyAppBuildGradle(
        config.modResults.contents,
        language,
        props?.isHorizonEnabled,
      );
      return config;
    });
  }

  // Set horizonEnabled property in gradle.properties so expo-iap module can pick it up
  config = withGradleProperties(config, (config) => {
    const horizonValue = props?.isHorizonEnabled ?? false;

    // Remove any existing horizonEnabled entries
    config.modResults = config.modResults.filter(
      (item) => item.type !== 'property' || item.key !== 'horizonEnabled',
    );

    // Add the horizonEnabled property
    config.modResults.push({
      type: 'property',
      key: 'horizonEnabled',
      value: String(horizonValue),
    });

    logOnce(`✅ Set horizonEnabled=${horizonValue} in gradle.properties`);

    return config;
  });

  // Note: missingDimensionStrategy for local dev is handled in withLocalOpenIAP

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

    // Add Meta Horizon App ID if provided
    if (props?.horizonAppId) {
      if (
        !manifest.manifest.application ||
        manifest.manifest.application.length === 0
      ) {
        manifest.manifest.application = [
          {$: {'android:name': '.MainApplication'}},
        ];
      }

      const application = manifest.manifest.application![0];
      if (!application['meta-data']) {
        application['meta-data'] = [];
      }

      const metaData = application['meta-data'];

      // Use the correct meta-data name for Horizon Platform SDK
      const horizonMetaDataName = 'com.meta.horizon.platform.ovr.OCULUS_APP_ID';
      const horizonAppIdMeta = {
        $: {
          'android:name': horizonMetaDataName,
          'android:value': props.horizonAppId,
        },
      };

      const existingIndex = metaData.findIndex(
        (m) => m.$['android:name'] === horizonMetaDataName,
      );

      if (existingIndex !== -1) {
        metaData[existingIndex] = horizonAppIdMeta;
        logOnce(
          `✅ Updated ${horizonMetaDataName} to ${props.horizonAppId} in AndroidManifest.xml`,
        );
      } else {
        metaData.push(horizonAppIdMeta);
        logOnce(
          `✅ Added ${horizonMetaDataName}: ${props.horizonAppId} to AndroidManifest.xml`,
        );
      }
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

  return withPodfile(config, (config) => {
    let content = config.modResults.contents;

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

    config.modResults.contents = content;
    return config;
  });
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
   * Optional modules configuration
   */
  modules?: {
    /**
     * Onside module for iOS alternative billing (Korea market)
     * @platform ios
     */
    onside?: boolean;
    /**
     * Horizon module for Meta Quest/VR devices
     * @platform android
     */
    horizon?: boolean;
  };
  /**
   * iOS-specific configuration
   * @platform ios
   */
  ios?: {
    /**
     * iOS Alternative Billing configuration.
     * Configure external purchase countries, links, and entitlements.
     * Requires approval from Apple.
     */
    alternativeBilling?: IOSAlternativeBillingConfig;
  };
  /**
   * Android-specific configuration
   * @platform android
   */
  android?: {
    /**
     * Meta Horizon App ID for Quest/VR devices.
     * Required when modules.horizon is true.
     */
    horizonAppId?: string;
  };
  /** @deprecated Use ios.alternativeBilling instead */
  iosAlternativeBilling?: IOSAlternativeBillingConfig;
  /** @deprecated Use android.horizonAppId instead */
  horizonAppId?: string;
}

const withIap: ConfigPlugin<ExpoIapPluginOptions | void> = (
  config,
  options,
) => {
  try {
    // Read Horizon configuration from modules
    const isHorizonEnabled = options?.modules?.horizon ?? false;

    const horizonAppId =
      options?.android?.horizonAppId ?? options?.horizonAppId;
    const iosAlternativeBilling =
      options?.ios?.alternativeBilling ?? options?.iosAlternativeBilling;

    logOnce(
      `🔍 [expo-iap] Config values: horizonAppId=${horizonAppId}, isHorizonEnabled=${isHorizonEnabled}`,
    );

    // Respect explicit flag; fall back to presence of localPath only when flag is unset
    const isLocalDev = options?.enableLocalDev ?? !!options?.localPath;
    // Apply Android modifications (skip adding deps when linking local module)
    let result = withIapAndroid(config, {
      addDeps: !isLocalDev,
      horizonAppId,
      isHorizonEnabled,
    });

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
          iosAlternativeBilling,
          horizonAppId,
          isHorizonEnabled, // Resolved from modules.horizon (line 467)
        });
      }
    } else {
      // Ensure iOS Podfile is set up to resolve public CocoaPods specs
      result = withIapIOS(result, iosAlternativeBilling);
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
