import type {ExpoConfig} from '@expo/config-types';
import {
  computeAutolinkModules,
  modifyAppBuildGradle,
  resolveModuleSelection,
} from '../src/withIAP';
import type {AutolinkState} from '../src/withIAP';
import type {ExpoIapPluginCommonOptions} from '../src/expoConfig.augmentation';

// Type-level expectations
const autoModeOptions: ExpoIapPluginCommonOptions = {
  modules: {expoIap: false, onside: true},
};

const explicitModeOptions: ExpoIapPluginCommonOptions = {
  module: 'onside',
};

const invalidExplicitOptions: ExpoIapPluginCommonOptions = {
  module: 'expo-iap',
  // @ts-expect-error modules overrides are only supported in auto mode
  modules: {expoIap: false},
};
void autoModeOptions;
void explicitModeOptions;
void invalidExplicitOptions;

jest.mock('expo/config-plugins', () => {
  const plugins = jest.requireActual('expo/config-plugins');

  return {
    ...plugins,
    WarningAggregator: {addWarningAndroid: jest.fn()},
  };
});

describe('android configuration', () => {
  const dependencyVersion = require('../../openiap-versions.json').google;
  const dependencyRegex = new RegExp(
    `io\\.github\\.hyochan\\.openiap:openiap-google:${dependencyVersion}`,
    'g',
  );

  it('adds OpenIAP dependency when missing', () => {
    const baseGradle = 'dependencies {\n}\n';
    const result = modifyAppBuildGradle(baseGradle, 'groovy');
    expect(result).toContain(
      `    implementation "io.github.hyochan.openiap:openiap-google:${dependencyVersion}"`,
    );
    const matches = result.match(dependencyRegex) ?? [];
    expect(matches).toHaveLength(1);
  });

  it('keeps existing dependency untouched', () => {
    const baseGradle = `dependencies {\n    implementation "io.github.hyochan.openiap:openiap-google:0.0.1"\n}\n`;
    const result = modifyAppBuildGradle(baseGradle, 'groovy');
    const matches = result.match(dependencyRegex) ?? [];
    expect(matches).toHaveLength(1);
    expect(result).not.toContain('openiap-google:0.0.1');
  });
});

describe('ios module selection', () => {
  const createConfig = (ios?: ExpoConfig['ios']): ExpoConfig =>
    ({name: 'test-app', slug: 'test-app', ios} as ExpoConfig);

  it('defaults to Expo IAP only when no options provided', () => {
    const result = resolveModuleSelection(createConfig(), undefined);
    expect(result).toEqual({
      selection: 'auto',
      includeExpoIap: true,
      includeOnside: true,
    });
  });

  it('inherits existing ios.onside.enabled flag in auto mode', () => {
    const result = resolveModuleSelection(
      createConfig({onside: {enabled: true}}),
      undefined,
    );
    expect(result).toEqual({
      selection: 'auto',
      includeExpoIap: true,
      includeOnside: true,
    });
  });

  it('forces Expo IAP when module option is expo-iap', () => {
    const options: ExpoIapPluginCommonOptions = {module: 'expo-iap'};
    const result = resolveModuleSelection(createConfig(), options);
    expect(result).toEqual({
      selection: 'expo-iap',
      includeExpoIap: true,
      includeOnside: false,
    });
  });

  it('forces Onside when module option is onside', () => {
    const options: ExpoIapPluginCommonOptions = {module: 'onside'};
    const result = resolveModuleSelection(createConfig(), options);
    expect(result).toEqual({
      selection: 'onside',
      includeExpoIap: false,
      includeOnside: true,
    });
  });

  it('respects explicit modules overrides in auto mode', () => {
    const options: ExpoIapPluginCommonOptions = {
      modules: {expoIap: false, onside: true},
    };
    const result = resolveModuleSelection(createConfig(), options);
    expect(result).toEqual({
      selection: 'auto',
      includeExpoIap: false,
      includeOnside: true,
    });
  });

  it('disables Onside when modules override sets false', () => {
    const options: ExpoIapPluginCommonOptions = {
      modules: {expoIap: true, onside: false},
    };
    const result = resolveModuleSelection(createConfig(), options);
    expect(result).toEqual({
      selection: 'auto',
      includeExpoIap: true,
      includeOnside: false,
    });
  });

  describe('autolinking computation', () => {
    const entries = (state: AutolinkState) => [
      {name: 'ExpoIapModule', enable: state.expoIap},
      {name: 'OnsideIapModule', enable: state.onside},
    ];

    it('adds missing modules when enabled', () => {
      const result = computeAutolinkModules(
        [],
        entries({
          expoIap: true,
          onside: true,
        }),
      );
      expect(result.modules).toEqual(['ExpoIapModule', 'OnsideIapModule']);
      expect(result.added).toEqual(['ExpoIapModule', 'OnsideIapModule']);
      expect(result.removed).toEqual([]);
    });

    it('removes disabled modules while retaining enabled ones', () => {
      const result = computeAutolinkModules(
        ['ExpoIapModule', 'OnsideIapModule'],
        entries({expoIap: true, onside: false}),
      );
      expect(result.modules).toEqual(['ExpoIapModule']);
      expect(result.added).toEqual([]);
      expect(result.removed).toEqual(['OnsideIapModule']);
    });

    it('preserves unrelated modules when toggling state', () => {
      const result = computeAutolinkModules(
        ['CustomModule'],
        entries({expoIap: false, onside: true}),
      );
      expect(result.modules).toEqual(['CustomModule', 'OnsideIapModule']);
      expect(result.added).toEqual(['OnsideIapModule']);
      expect(result.removed).toEqual([]);
    });
  });
});
