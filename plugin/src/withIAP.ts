import {
  WarningAggregator,
  withAndroidManifest,
  withProjectBuildGradle,
} from 'expo/config-plugins';
import {ConfigPlugin, createRunOncePlugin} from 'expo/config-plugins';

const pkg = require('../../package.json');

const addToBuildGradle = (
  newLine: string,
  anchor: RegExp | string,
  offset: number,
  buildGradle: string,
) => {
  const lines = buildGradle.split('\n');
  const lineIndex = lines.findIndex((line) => line.match(anchor));
  if (lineIndex === -1) {
    console.warn('Anchor "ext" not found in build.gradle, appending to end');
    lines.push(newLine);
  } else {
    lines.splice(lineIndex + offset, 0, newLine);
  }
  return lines.join('\n');
};

export const modifyProjectBuildGradle = (buildGradle: string) => {
  const supportLibVersion = `supportLibVersion = "28.0.0"`;
  if (buildGradle.includes(supportLibVersion)) {
    return buildGradle;
  }
  return addToBuildGradle(supportLibVersion, 'ext', 1, buildGradle);
};

const withIAPAndroid: ConfigPlugin = (config) => {
  config = withProjectBuildGradle(config, (config) => {
    config.modResults.contents = modifyProjectBuildGradle(
      config.modResults.contents,
    );
    return config;
  });

  // Adding BILLING permission to AndroidManifest.xml
  config = withAndroidManifest(config, (config) => {
    console.log('Modifying AndroidManifest.xml...');
    const manifest = config.modResults;

    if (!manifest.manifest['uses-permission']) {
      manifest.manifest['uses-permission'] = [];
    }

    const permissions = manifest.manifest['uses-permission'];
    const billingPermission = {
      $: {'android:name': 'com.android.vending.BILLING'},
    };
    if (
      !permissions.some(
        (perm: any) => perm.$['android:name'] === 'com.android.vending.BILLING',
      )
    ) {
      permissions.push(billingPermission);
      console.log('Added com.android.vending.BILLING to permissions');
    } else {
      console.log('com.android.vending.BILLING already exists in manifest');
    }

    return config;
  });

  return config;
};

interface Props {}

const withIAP: ConfigPlugin<Props | undefined> = (config, props) => {
  try {
    console.log('Applying expo-iap plugin...');
    config = withIAPAndroid(config);
  } catch (error) {
    WarningAggregator.addWarningAndroid(
      'expo-iap',
      `There was a problem configuring expo-iap in your native Android project: ${error}`,
    );
    console.error('Error in expo-iap plugin:', error);
  }
  return config;
};

export default createRunOncePlugin(withIAP, pkg.name, pkg.version);
