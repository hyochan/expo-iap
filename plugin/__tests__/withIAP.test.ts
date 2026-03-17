import type {ExpoConfig} from '@expo/config-types';
import {
  computeAutolinkModules,
  ensureOnsidePodIOS,
  modifyAppBuildGradle,
  resolveModuleSelection,
} from '../src/withIAP';
import type {AutolinkState} from '../src/withIAP';
import type {ExpoIapPluginCommonOptions} from '../src/expoConfig.augmentation';

// Type-level expectations
const autoModeOptions: ExpoIapPluginCommonOptions = {
  modules: {onside: true},
};

const explicitModeOptions: ExpoIapPluginCommonOptions = {
  module: 'onside',
};

const invalidExplicitOptions: ExpoIapPluginCommonOptions = {
  modules: {onside: false},
};
void autoModeOptions;
void explicitModeOptions;
void invalidExplicitOptions;

jest.mock('expo/config-plugins', () => {
  const plugins = jest.requireActual('expo/config-plugins');

  return {
    ...plugins,
    WarningAggregator: {addWarningAndroid: jest.fn(), addWarningIOS: jest.fn()},
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
      includeOnside: false,
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

  it('enables Onside when modules.onside is true in auto mode', () => {
    const options: ExpoIapPluginCommonOptions = {
      modules: {onside: true},
    };
    const result = resolveModuleSelection(createConfig(), options);
    expect(result).toEqual({
      selection: 'auto',
      includeExpoIap: true,
      includeOnside: true,
    });
  });

  it('disables Onside when modules.onside is false', () => {
    const options: ExpoIapPluginCommonOptions = {
      modules: {onside: false},
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
      {name: 'ExpoOnsideModule', enable: state.onside},
      {name: 'ExpoIapOnsideModule', enable: state.onside},
    ];

    it('adds missing modules when enabled', () => {
      const result = computeAutolinkModules(
        [],
        entries({
          expoIap: true,
          onside: true,
        }),
      );
      expect(result.modules).toEqual([
        'ExpoIapModule',
        'ExpoOnsideModule',
        'ExpoIapOnsideModule',
      ]);
      expect(result.added).toEqual([
        'ExpoIapModule',
        'ExpoOnsideModule',
        'ExpoIapOnsideModule',
      ]);
      expect(result.removed).toEqual([]);
    });

    it('removes disabled modules while retaining enabled ones', () => {
      const result = computeAutolinkModules(
        ['ExpoIapModule', 'ExpoOnsideModule', 'ExpoIapOnsideModule'],
        entries({expoIap: true, onside: false}),
      );
      expect(result.modules).toEqual(['ExpoIapModule']);
      expect(result.added).toEqual([]);
      expect(result.removed).toEqual([
        'ExpoOnsideModule',
        'ExpoIapOnsideModule',
      ]);
    });

    it('preserves unrelated modules when toggling state', () => {
      const result = computeAutolinkModules(
        ['CustomModule'],
        entries({expoIap: false, onside: true}),
      );
      expect(result.modules).toEqual([
        'CustomModule',
        'ExpoOnsideModule',
        'ExpoIapOnsideModule',
      ]);
      expect(result.added).toEqual(['ExpoOnsideModule', 'ExpoIapOnsideModule']);
      expect(result.removed).toEqual([]);
    });
  });
});

describe('ensureOnsidePodIOS', () => {
  const basePodfile = [
    "source 'https://cdn.cocoapods.org/'",
    '',
    "target 'MyApp' do",
    "  pod 'ExpoModulesCore'",
    'end',
    '',
  ].join('\n');

  it('adds OnsideKit pod and post_install hook', () => {
    const result = ensureOnsidePodIOS(basePodfile);
    expect(result).toContain("pod 'OnsideKit'");
    expect(result).toContain('# [expo-iap] Make OnsideKit visible');
    expect(result).toContain('post_install do |installer|');
    expect(result).toContain("target.name == 'ExpoIap'");
    expect(result).toContain('SWIFT_INCLUDE_PATHS');
  });

  it('inserts OnsideKit pod inside the target block', () => {
    const result = ensureOnsidePodIOS(basePodfile);
    const targetIndex = result.indexOf("target 'MyApp' do");
    const onsideKitIndex = result.indexOf("pod 'OnsideKit'");
    const endIndex = result.indexOf('end');
    expect(onsideKitIndex).toBeGreaterThan(targetIndex);
    expect(onsideKitIndex).toBeLessThan(endIndex);
  });

  it('appends into existing post_install block', () => {
    const podfileWithPostInstall = [
      "target 'MyApp' do",
      "  pod 'ExpoModulesCore'",
      'end',
      '',
      'post_install do |installer|',
      '  # existing hook',
      'end',
    ].join('\n');
    const result = ensureOnsidePodIOS(podfileWithPostInstall);
    expect(result).toContain("pod 'OnsideKit'");
    expect(result).toContain('# [expo-iap] Make OnsideKit visible');
    // Should not create a second post_install block
    const postInstallCount = (
      result.match(/post_install do \|installer\|/g) ?? []
    ).length;
    expect(postInstallCount).toBe(1);
  });

  it('skips if OnsideKit and post_install hook already exist', () => {
    const podfileComplete = [
      "target 'MyApp' do",
      "  pod 'OnsideKit', :podspec => 'https://example.com'",
      'end',
      '',
      'post_install do |installer|',
      '  # [expo-iap] Make OnsideKit visible',
      'end',
    ].join('\n');
    const result = ensureOnsidePodIOS(podfileComplete);
    expect(result).toBe(podfileComplete);
  });

  it('adds post_install hook when OnsideKit already exists', () => {
    const podfileWithOnsideKit = [
      "target 'MyApp' do",
      "  pod 'OnsideKit', :podspec => 'https://example.com'",
      'end',
    ].join('\n');
    const result = ensureOnsidePodIOS(podfileWithOnsideKit);
    expect(result).toContain('# [expo-iap] Make OnsideKit visible');
    // Should not add a duplicate OnsideKit pod
    const onsideKitCount = (result.match(/pod 'OnsideKit'/g) ?? []).length;
    expect(onsideKitCount).toBe(1);
  });

  it('returns unchanged content when no target block found', () => {
    const noPodfile = '# empty';
    const result = ensureOnsidePodIOS(noPodfile);
    expect(result).toBe(noPodfile);
  });

  it('does not modify Podfile when onside is disabled (not called)', () => {
    const enableOnside = false;
    let content = basePodfile;

    if (enableOnside) {
      content = ensureOnsidePodIOS(content);
    }

    expect(content).toBe(basePodfile);
    expect(content).not.toContain("pod 'OnsideKit'");
    expect(content).not.toContain('# [expo-iap] Make OnsideKit visible');
  });

  it('modifies Podfile when onside is enabled', () => {
    const enableOnside = true;
    let content = basePodfile;

    if (enableOnside) {
      content = ensureOnsidePodIOS(content);
    }

    expect(content).not.toBe(basePodfile);
    expect(content).toContain("pod 'OnsideKit'");
    expect(content).toContain('# [expo-iap] Make OnsideKit visible');
  });
});
