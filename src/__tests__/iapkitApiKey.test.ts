/**
 * Tests for iapkitApiKey config plugin option
 */

import {withIap} from '../../plugin/build/withIAP';

// Mock expo/config-plugins
jest.mock('expo/config-plugins', () => {
  const plugins = jest.requireActual('expo/config-plugins');

  return {
    ...plugins,
    WarningAggregator: {
      addWarningAndroid: jest.fn(),
      addWarningIOS: jest.fn(),
    },
    withAndroidManifest: jest.fn((config) => config),
    withAppBuildGradle: jest.fn((config) => config),
    withGradleProperties: jest.fn((config) => config),
    withPodfile: jest.fn((config) => config),
    createRunOncePlugin: jest.fn((plugin) => plugin),
  };
});

describe('withIap config plugin - iapkitApiKey option', () => {
  function createMockConfig(extra?: Record<string, unknown>) {
    return {
      name: 'test-app',
      slug: 'test-app',
      extra,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should add iapkitApiKey to config.extra when provided', () => {
    const config = createMockConfig();
    const result = withIap(config, {
      iapkitApiKey: 'test-api-key-123',
    });

    expect(result.extra).toBeDefined();
    expect(result.extra?.iapkitApiKey).toBe('test-api-key-123');
  });

  it('should preserve existing extra fields when adding iapkitApiKey', () => {
    const config = createMockConfig({
      existingField: 'existing-value',
      anotherField: 42,
    });
    const result = withIap(config, {
      iapkitApiKey: 'test-api-key-456',
    });

    expect(result.extra).toBeDefined();
    expect(result.extra?.iapkitApiKey).toBe('test-api-key-456');
    expect(result.extra?.existingField).toBe('existing-value');
    expect(result.extra?.anotherField).toBe(42);
  });

  it('should not add iapkitApiKey to config.extra when not provided', () => {
    const config = createMockConfig();
    const result = withIap(config, {});

    expect(result.extra?.iapkitApiKey).toBeUndefined();
  });

  it('should not add iapkitApiKey when options is undefined', () => {
    const config = createMockConfig();
    const result = withIap(config, undefined);

    expect(result.extra?.iapkitApiKey).toBeUndefined();
  });

  it('should handle empty string iapkitApiKey (should not add)', () => {
    const config = createMockConfig();
    const result = withIap(config, {
      iapkitApiKey: '',
    });

    // Empty string is falsy, so it should not be added
    expect(result.extra?.iapkitApiKey).toBeUndefined();
  });

  it('should work with all other plugin options', () => {
    const config = createMockConfig({preExisting: true});
    const result = withIap(config, {
      iapkitApiKey: 'my-api-key',
      modules: {
        horizon: false,
        onside: false,
      },
      android: {
        horizonAppId: '12345',
      },
    });

    expect(result.extra?.iapkitApiKey).toBe('my-api-key');
    expect(result.extra?.preExisting).toBe(true);
  });
});
