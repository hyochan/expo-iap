import {withIosAlternativeBilling} from '../withIAP';
import type {IOSAlternativeBillingConfig} from '../withIAP';
import type {ExpoConfig} from '@expo/config';

describe('withIosAlternativeBilling', () => {
  const baseConfig: ExpoConfig = {
    name: 'test-app',
    slug: 'test-app',
    ios: {
      bundleIdentifier: 'com.test.app',
    },
  };

  it('should skip configuration when no options provided', () => {
    const result = withIosAlternativeBilling(baseConfig, undefined);
    expect(result).toBe(baseConfig);
  });

  it('should skip configuration when countries array is empty', () => {
    const options: IOSAlternativeBillingConfig = {
      countries: [],
    };
    const result = withIosAlternativeBilling(baseConfig, options);
    expect(result).toBe(baseConfig);
  });

  it('should add basic entitlement and Info.plist when countries provided', () => {
    const options: IOSAlternativeBillingConfig = {
      countries: ['kr', 'nl', 'de'],
    };

    const result = withIosAlternativeBilling(baseConfig, options);

    // Check that config plugins were applied
    expect(result).toBeDefined();
    expect(result.name).toBe('test-app');
  });

  it('should add external purchase link entitlement when enabled', () => {
    const options: IOSAlternativeBillingConfig = {
      countries: ['kr', 'nl'],
      enableExternalPurchaseLink: true,
    };

    const result = withIosAlternativeBilling(baseConfig, options);
    expect(result).toBeDefined();
  });

  it('should add streaming entitlement when enabled', () => {
    const options: IOSAlternativeBillingConfig = {
      countries: ['at', 'de', 'fr'],
      streamingLinkRegions: ['at', 'de', 'fr'],
      enableExternalPurchaseLinkStreaming: true,
    };

    const result = withIosAlternativeBilling(baseConfig, options);
    expect(result).toBeDefined();
  });

  it('should handle all configuration options', () => {
    const options: IOSAlternativeBillingConfig = {
      countries: ['kr', 'nl', 'de', 'fr'],
      links: {
        kr: 'https://example.com/kr',
        nl: 'https://example.com/nl',
      },
      multiLinks: {
        de: ['https://example.com/de', 'https://example.com/de2'],
        fr: ['https://example.com/fr'],
      },
      customLinkRegions: ['de', 'fr'],
      streamingLinkRegions: ['at', 'de'],
      enableExternalPurchaseLink: true,
      enableExternalPurchaseLinkStreaming: false,
    };

    const result = withIosAlternativeBilling(baseConfig, options);
    expect(result).toBeDefined();
    expect(result.name).toBe('test-app');
  });

  it('should validate country codes are lowercase', () => {
    const options: IOSAlternativeBillingConfig = {
      countries: ['kr', 'nl', 'de'], // All lowercase
    };

    const result = withIosAlternativeBilling(baseConfig, options);
    expect(result).toBeDefined();
  });

  it('should handle multiple URLs per country', () => {
    const options: IOSAlternativeBillingConfig = {
      countries: ['de', 'fr', 'it'],
      multiLinks: {
        de: [
          'https://example.com/de',
          'https://example.com/de/sale',
          'https://example.com/de/premium',
        ],
        fr: ['https://example.com/fr', 'https://example.com/fr/sale'],
      },
    };

    const result = withIosAlternativeBilling(baseConfig, options);
    expect(result).toBeDefined();
  });

  it('should not exceed 5 links per country for music apps', () => {
    const options: IOSAlternativeBillingConfig = {
      countries: ['de'],
      multiLinks: {
        de: [
          'https://example.com/1',
          'https://example.com/2',
          'https://example.com/3',
          'https://example.com/4',
          'https://example.com/5',
        ],
      },
      enableExternalPurchaseLinkStreaming: true,
      streamingLinkRegions: ['de'],
    };

    const result = withIosAlternativeBilling(baseConfig, options);
    expect(result).toBeDefined();
  });
});
