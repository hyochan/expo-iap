import {
  ConfigPlugin,
  createRunOncePlugin,
  WarningAggregator,
  withAndroidManifest,
  withAppBuildGradle,
  withGradleProperties,
  withPodfile,
} from 'expo/config-plugins';
import type {ExpoConfig} from '@expo/config-types';
import * as fs from 'fs';
import * as path from 'path';
import withLocalOpenIAP from './withLocalOpenIAP';
import {
  withIosAlternativeBilling,
  type IOSAlternativeBillingConfig,
} from './withIosAlternativeBilling';
import type {ExpoIapPluginCommonOptions} from './expoConfig.augmentation';

const pkg = require('../../package.json');
const openiapVersions = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, '../../openiap-versions.json'),
    'utf8',
  ),
);
const OPENIAP_ANDROID_VERSION = openiapVersions.google;
const AUTOLINKING_CONFIG_PATH = path.resolve(
  __dirname,
  '../../expo-module.config.json',
);

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

export const modifyAppBuildGradle = (
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

const ensureOnsidePod = (content: string): string => {
  const podLine =
    "  pod 'OnsideKit', :podspec => 'https://raw.githubusercontent.com/onside-io/OnsideKit-iOS/0.1.20/OnsideKit.podspec'";
  const podRegex = /^\s*pod\s+'OnsideKit'\b.*$/m;

  if (podRegex.test(content)) {
    return content;
  }

  const targetMatch = content.match(/target\s+'[^']+'\s+do\s*\n/);
  if (!targetMatch) {
    WarningAggregator.addWarningIOS(
      'expo-iap',
      'Could not find a target block in Podfile when adding OnsideKit; skipping installation.',
    );
    return content;
  }

  const insertIndex = targetMatch.index! + targetMatch[0].length;
  const before = content.slice(0, insertIndex);
  const after = content.slice(insertIndex);

  logOnce('📦 expo-iap: Added OnsideKit pod to Podfile');

  return `${before}${podLine}\n${after}`;
};

export type AutolinkState = {expoIap: boolean; onside: boolean};

type AutolinkEntry = {name: string; enable: boolean};

export function computeAutolinkModules(
  existing: string[],
  desired: AutolinkEntry[],
): {modules: string[]; added: string[]; removed: string[]} {
  let modules = [...existing];
  const added: string[] = [];
  const removed: string[] = [];

  for (const entry of desired) {
    const hasModule = modules.includes(entry.name);
    if (entry.enable && !hasModule) {
      modules = [...modules, entry.name];
      added.push(entry.name);
    } else if (!entry.enable && hasModule) {
      modules = modules.filter((module) => module !== entry.name);
      removed.push(entry.name);
    }
  }

  return {modules, added, removed};
}

const syncAutolinking = (state: AutolinkState) => {
  if (!fs.existsSync(AUTOLINKING_CONFIG_PATH)) {
    return;
  }

  try {
    const raw = fs.readFileSync(AUTOLINKING_CONFIG_PATH, 'utf8');
    const config = JSON.parse(raw);
    const iosConfig = config.ios ?? (config.ios = {});
    const existing: string[] = Array.isArray(iosConfig.modules)
      ? iosConfig.modules.filter((module: string) => module !== 'OneSideModule')
      : [];

    const desiredEntries: {
      name: string;
      enable: boolean;
      addLog: string;
      removeLog: string;
    }[] = [
      {
        name: 'ExpoIapModule',
        enable: state.expoIap,
        addLog: '🔗 expo-iap: Enabled ExpoIapModule autolinking',
        removeLog: '🧹 expo-iap: Disabled ExpoIapModule autolinking',
      },
      {
        name: 'OnsideIapModule',
        enable: state.onside,
        addLog: '🔗 expo-iap: Enabled OnsideIapModule autolinking',
        removeLog: '🧹 expo-iap: Disabled OnsideIapModule autolinking',
      },
    ];

    const {
      modules: nextModules,
      added,
      removed,
    } = computeAutolinkModules(
      existing,
      desiredEntries.map(({name, enable}) => ({name, enable})),
    );

    for (const name of added) {
      const entry = desiredEntries.find((candidate) => candidate.name === name);
      if (entry) {
        logOnce(entry.addLog);
      }
    }

    for (const name of removed) {
      const entry = desiredEntries.find((candidate) => candidate.name === name);
      if (entry) {
        logOnce(entry.removeLog);
      }
    }

    if (added.length > 0 || removed.length > 0) {
      iosConfig.modules = nextModules;
      fs.writeFileSync(
        AUTOLINKING_CONFIG_PATH,
        `${JSON.stringify(config, null, 2)}\n`,
        'utf8',
      );
    }
  } catch (error) {
    WarningAggregator.addWarningIOS(
      'expo-iap',
      `Failed to sync Expo IAP autolinking modules: ${String(error)}`,
    );
  }
};

type WithIapIosOptions = {
  enableOnside?: boolean;
  iosAlternativeBilling?: IOSAlternativeBillingConfig;
  /**
   * Custom URL scheme used by OnsideKit to return to the app
   * Example: "com.yourapp.auth" or "onside-yourapp-login"
   */
  callbackScheme?: string;
};

//TODO: some init stuff for https://docs.onside.io/sdk/installation-guide

// Derive scheme from bundle identifier with ".auth" suffix
// function deriveOnsideScheme(config: any): string {
//   const bundleId =
//     config.ios?.bundleIdentifier ??
//     config.bundleIdentifier ??
//     config?.extra?.eas?.projectId /* fallback unlikely to be right */ ??
//     'com.example.app';
//   return `${bundleId}.auth`;
// }

// const withOnsideCallbackSchemeInfoPlist: ConfigPlugin<{scheme: string}> = (
//   config,
//   {scheme},
// ) => {
//   return withInfoPlist(config, (cfg) => {
//     const plist = cfg.modResults;
//
//     // Ensure CFBundleURLTypes contains our scheme
//     const arr = (plist.CFBundleURLTypes ??= []);
//     const hasScheme =
//       Array.isArray(arr) &&
//       arr.some(
//         (it: any) =>
//           Array.isArray(it?.CFBundleURLSchemes) &&
//           it.CFBundleURLSchemes.includes(scheme),
//       );
//     if (!hasScheme) {
//       arr.push({
//         CFBundleURLSchemes: [scheme],
//         CFBundleURLName: 'onside-callback',
//       } as any);
//     }
//
//     // Ensure LSApplicationQueriesSchemes contains 'onside'
//     const queries = (plist.LSApplicationQueriesSchemes ??= []);
//     if (!queries.includes('onside')) {
//       queries.push('onside');
//     }
//
//     (plist as any)[ONSIDE_CALLBACK_SCHEME_KEY] = scheme;
//     return cfg;
//   });
// };

// const withOnsideAppDelegate: ConfigPlugin<{scheme: string}> = (
//   config,
//   {scheme},
// ) => {
//   return withAppDelegate(config, (cfg) => {
//     const mod = cfg.modResults;
//     // Ensure `import OnsideKit` is guarded to avoid compile errors when the pod/package isn't present yet
//     const hasUnguardedImport = /^\s*import\s+OnsideKit/m.test(mod.contents);
//     const hasGuardedImport =
//       /#if\s+canImport\(OnsideKit\)[\s\S]*import\s+OnsideKit[\s\S]*#endif/m.test(
//         mod.contents,
//       );
//     if (hasUnguardedImport && !hasGuardedImport) {
//       // Wrap existing unguarded import with canImport guard
//       mod.contents = mod.contents.replace(
//         /^(\s*)import\s+OnsideKit\s*$/m,
//         `$1#if canImport(OnsideKit)\n$1import OnsideKit\n$1#endif`,
//       );
//     } else if (!hasUnguardedImport && !hasGuardedImport) {
//       // Insert a guarded import at the top of the file
//       mod.contents = `#if canImport(OnsideKit)\nimport OnsideKit\n#endif\n${mod.contents}`;
//     }
//
//     // Inject Onside.callbackScheme in didFinishLaunchingWithOptions
//     // 1) Try to find an existing method (works with multiline signatures)
//     const didFinishRegex =
//       /func\s+application\s*\([\s\S]*?didFinishLaunchingWithOptions[\s\S]*?\)\s*->\s*Bool\s*\{\s*/m;
//     if (didFinishRegex.test(mod.contents)) {
//       const injectLine = `\n        #if canImport(OnsideKit)\n        // Use the exact same URL Scheme you defined in your Info.plist\n        Onside.callbackScheme = "${scheme}"\n        #endif\n`;
//       if (!mod.contents.includes('Onside.callbackScheme')) {
//         mod.contents = mod.contents.replace(
//           didFinishRegex,
//           (m) => m + injectLine,
//         );
//       }
//     } else {
//       // 2) If method is missing, create a minimal implementation inside AppDelegate
//       const classEndRegex = /\n}\s*$/;
//       if (classEndRegex.test(mod.contents)) {
//         const createMethod = `
//
//     func application(
//       _ application: UIApplication,
//       didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
//     ) -> Bool {
//         // Use the exact same URL Scheme you defined in your Info.plist
//         #if canImport(OnsideKit)
//         Onside.callbackScheme = "${scheme}"
//         #endif
//         return true
//     }
// `;
//         mod.contents = mod.contents.replace(
//           classEndRegex,
//           `${createMethod}\n}\n`,
//         );
//       } else {
//         WarningAggregator.addWarningIOS(
//           'expo-iap',
//           'Could not find or create application(_:didFinishLaunchingWithOptions:) in AppDelegate.swift to set Onside.callbackScheme.',
//         );
//       }
//     }
//
//     // Ensure application(_:open:options:) forwards URLs to Onside
//     const openUrlRegex =
//       /func\s+application\(\s*_?\s*app:\s*UIApplication,\s*open\s+url:\s*URL,\s*options:\s*\[UIApplication\.OpenURLOptionsKey\s*:\s*Any\]\s*=\s*\[:\]\)\s*->\s*Bool\s*{/;
//     if (!openUrlRegex.test(mod.contents)) {
//       const classEndRegex = /\n}\s*$/;
//       if (classEndRegex.test(mod.contents)) {
//         const openImpl = `
//
//     func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
//         #if canImport(OnsideKit)
//         let handledByOnside = Onside.handle(url: url)
//         if handledByOnside {
//             return true
//         }
//         #endif
//         return false
//     }
// `;
//         mod.contents = mod.contents.replace(classEndRegex, `${openImpl}\n}\n`);
//       } else {
//         WarningAggregator.addWarningIOS(
//           'expo-iap',
//           'Could not inject application(_:open:options:) into AppDelegate.swift.',
//         );
//       }
//     }
//     return cfg;
//   });
// };

const withIapIOS: ConfigPlugin<WithIapIosOptions | undefined> = (
  config,
  options,
) => {
  // Add iOS alternative billing configuration if provided
  if (options?.iosAlternativeBilling) {
    config = withIosAlternativeBilling(config, options.iosAlternativeBilling);
  }

  //TODO: some init stuff for https://docs.onside.io/sdk/installation-guide
  // // If Onside enabled, wire URL scheme + AppDelegate injection.
  // if (options?.enableOnside) {
  //   const fromConfig = (config as any)?.ios?.onside?.callbackScheme;
  //   const scheme =
  //     options?.callbackScheme ??
  //     fromConfig ??
  //     deriveOnsideScheme(config as any);
  //   config = withOnsideCallbackSchemeInfoPlist(config, {scheme});
  //   config = withOnsideAppDelegate(config, {scheme});
  // }

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

    // 3) Optionally install OnsideKit when enabled in config
    if (options?.enableOnside) {
      content = ensureOnsidePod(content);
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

export interface ModuleSelectionResult {
  selection: 'auto' | 'expo-iap' | 'onside';
  includeExpoIap: boolean;
  includeOnside: boolean;
}

/**
 * Determines which modules to include based on configuration.
 * - ExpoIap: Always included (standard StoreKit 2 support)
 * - Onside: Only when modules.onside is true (iOS alternative billing)
 */
export function resolveModuleSelection(
  config: ExpoConfig,
  options?: ExpoIapPluginCommonOptions | void,
): ModuleSelectionResult {
  const normalizedOptions = (options ?? undefined) as
    | ExpoIapPluginCommonOptions
    | undefined;

  const selection = normalizedOptions?.module ?? 'auto';

  // Determine includeExpoIap based on explicit module selection
  let includeExpoIap = true;
  let includeOnside = false;

  if (selection === 'expo-iap') {
    // Explicit expo-iap: only ExpoIap, no Onside
    includeExpoIap = true;
    includeOnside = false;
  } else if (selection === 'onside') {
    // Explicit onside: only Onside, no ExpoIap
    includeExpoIap = false;
    includeOnside = true;
  } else {
    // Auto mode: ExpoIap always included, Onside based on config
    includeExpoIap = true;
    includeOnside =
      normalizedOptions?.modules?.onside ??
      config.ios?.onside?.enabled ??
      false;
  }

  return {selection, includeExpoIap, includeOnside};
}

const withIAP: ConfigPlugin<ExpoIapPluginCommonOptions | void> = (
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

    const {includeExpoIap, includeOnside} = resolveModuleSelection(
      config as ExpoConfig,
      options,
    );

    const autolinkState: AutolinkState = {
      expoIap: includeExpoIap,
      onside: includeOnside,
    };

    if (includeOnside) {
      config.ios = {
        ...config.ios,
        onside: {
          ...(config.ios?.onside ?? {}),
          enabled: true,
        },
      } as typeof config.ios;
    } else if (config.ios?.onside?.enabled) {
      config.ios.onside.enabled = false;
    }

    // Respect explicit flag; fall back to presence of localPath only when flag is unset
    const isLocalDev = options?.enableLocalDev ?? !!options?.localPath;
    const shouldConfigureAndroid = includeExpoIap;
    const shouldAddAndroidDeps = includeExpoIap && !isLocalDev;

    // Apply Android modifications (skip adding deps when linking local module or when Expo IAP disabled)
    let result = shouldConfigureAndroid
      ? withIapAndroid(config, {
          addDeps: shouldAddAndroidDeps,
          horizonAppId,
          isHorizonEnabled,
        })
      : config;

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
      result = withIapIOS(result, {
        enableOnside: includeOnside,
        iosAlternativeBilling,
      });
      if (includeExpoIap) {
        logOnce('📦 [expo-iap] Using OpenIAP from CocoaPods');
      }
    }

    syncAutolinking(autolinkState);

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
export default createRunOncePlugin(withIAP, pkg.name, pkg.version);
