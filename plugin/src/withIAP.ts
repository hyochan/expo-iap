import {
  ConfigPlugin,
  createRunOncePlugin,
  WarningAggregator,
  withAndroidManifest,
  withAppBuildGradle,
  withEntitlementsPlist,
} from 'expo/config-plugins';

const pkg = require('../../package.json');

// Global flag to prevent duplicate logs
let hasLoggedPluginExecution = false;

const addLineToGradle = (
  content: string,
  anchor: RegExp | string,
  lineToAdd: string,
  offset: number = 1,
): string => {
  const lines = content.split('\n');
  const index = lines.findIndex((line) => line.match(anchor));
  if (index === -1) {
    console.warn(
      `Anchor "${anchor}" not found in build.gradle. Appending to end.`,
    );
    lines.push(lineToAdd);
  } else {
    lines.splice(index + offset, 0, lineToAdd);
  }
  return lines.join('\n');
};

const modifyAppBuildGradle = (gradle: string): string => {
  let modified = gradle;

  // Add billing library dependencies to app-level build.gradle
  const billingDep = `    implementation "com.android.billingclient:billing-ktx:8.0.0"`;
  const gmsDep = `    implementation "com.google.android.gms:play-services-base:18.1.0"`;

  let hasAddedDependency = false;

  if (!modified.includes(billingDep)) {
    modified = addLineToGradle(modified, /dependencies\s*{/, billingDep);
    hasAddedDependency = true;
  }
  if (!modified.includes(gmsDep)) {
    modified = addLineToGradle(modified, /dependencies\s*{/, gmsDep, 1);
    hasAddedDependency = true;
  }

  // Log only once and only if we actually added dependencies
  if (hasAddedDependency && !hasLoggedPluginExecution) {
    console.log('🛠️ expo-iap: Added billing dependencies to build.gradle');
  }

  return modified;
};

const withIapIOS: ConfigPlugin = (config) => {
  // Add In-App Purchase capability to entitlements
  config = withEntitlementsPlist(config, (config) => {
    config.modResults['com.apple.developer.in-app-payments'] = ['Default'];
    
    if (!hasLoggedPluginExecution) {
      console.log('✅ Added In-App Purchase capability to iOS entitlements');
    }
    
    return config;
  });

  return config;
};

const withIapAndroid: ConfigPlugin = (config) => {
  // Add IAP dependencies to app build.gradle
  config = withAppBuildGradle(config, (config) => {
    config.modResults.contents = modifyAppBuildGradle(
      config.modResults.contents,
    );
    return config;
  });

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
      if (!hasLoggedPluginExecution) {
        console.log(
          '✅ Added com.android.vending.BILLING to AndroidManifest.xml',
        );
      }
    } else {
      if (!hasLoggedPluginExecution) {
        console.log(
          'ℹ️ com.android.vending.BILLING already exists in AndroidManifest.xml',
        );
      }
    }

    return config;
  });

  return config;
};

const withIAP: ConfigPlugin = (config, _props) => {
  try {
    // Apply both iOS and Android configurations
    config = withIapIOS(config);
    config = withIapAndroid(config);
    
    // Set flag after first execution to prevent duplicate logs
    hasLoggedPluginExecution = true;
    return config;
  } catch (error) {
    WarningAggregator.addWarningAndroid(
      'expo-iap',
      `expo-iap plugin encountered an error: ${error}`,
    );
    console.error('expo-iap plugin error:', error);
    return config;
  }
};

export default createRunOncePlugin(withIAP, pkg.name, pkg.version);
