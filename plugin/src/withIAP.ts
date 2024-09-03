import {
  WarningAggregator,
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
  // add after given line
  lines.splice(lineIndex + offset, 0, newLine);
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
  return config;
};

interface Props {}

const withIAP: ConfigPlugin<Props | undefined> = (config, props) => {
  try {
    config = withIAPAndroid(config);
  } catch (error) {
    WarningAggregator.addWarningAndroid(
      'expo-iap',
      `There was a problem configuring expo-iap in your native Android project: ${error}`,
    );
  }

  return config;
};

export default createRunOncePlugin(withIAP, pkg.name, pkg.version);
