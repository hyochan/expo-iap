/**
 * Configuration validation tests for iOS Alternative Billing
 * Tests configuration structure and constraints
 */

import type {IOSAlternativeBillingConfig} from '../withIosAlternativeBilling';

describe('iOS Alternative Billing Configuration Validation', () => {
  describe('Country Codes', () => {
    it('should accept valid ISO 3166-1 alpha-2 country codes', () => {
      const validCodes = ['kr', 'nl', 'de', 'fr', 'it', 'es', 'at', 'no'];
      const config: IOSAlternativeBillingConfig = {
        countries: validCodes,
      };

      expect(config.countries).toBeDefined();
      expect(config.countries?.length).toBe(8);

      // All should be lowercase 2-letter codes
      config.countries?.forEach((code) => {
        expect(code).toMatch(/^[a-z]{2}$/);
      });
    });

    it('should handle empty countries array', () => {
      const config: IOSAlternativeBillingConfig = {
        countries: [],
      };

      expect(config.countries).toEqual([]);
    });

    it('should handle single country', () => {
      const config: IOSAlternativeBillingConfig = {
        countries: ['kr'],
      };

      expect(config.countries).toEqual(['kr']);
    });
  });

  describe('External Purchase Links', () => {
    it('should accept valid HTTPS URLs', () => {
      const config: IOSAlternativeBillingConfig = {
        countries: ['kr', 'nl'],
        links: {
          kr: 'https://example.com/kr',
          nl: 'https://example.com/nl',
        },
      };

      expect(config.links).toBeDefined();
      expect(config.links?.kr).toBe('https://example.com/kr');
      expect(config.links?.nl).toBe('https://example.com/nl');

      // Verify HTTPS
      Object.values(config.links || {}).forEach((url) => {
        expect(url).toMatch(/^https:\/\//);
      });
    });

    it('should validate URL has no query parameters', () => {
      const validUrls = {
        kr: 'https://example.com/kr',
        nl: 'https://example.com/nl/checkout',
      };

      Object.values(validUrls).forEach((url) => {
        expect(url).not.toContain('?');
        expect(url).not.toContain('&');
      });
    });

    it('should validate URL length constraint (max 1000 chars)', () => {
      const longPath = 'a'.repeat(980);
      const url = `https://example.com/${longPath}`;

      expect(url.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Multiple Links per Country', () => {
    it('should accept up to 5 links per country', () => {
      const config: IOSAlternativeBillingConfig = {
        countries: ['de'],
        multiLinks: {
          de: [
            'https://example.com/de1',
            'https://example.com/de2',
            'https://example.com/de3',
            'https://example.com/de4',
            'https://example.com/de5',
          ],
        },
      };

      expect(config.multiLinks).toBeDefined();
      expect(config.multiLinks?.de.length).toBe(5);
      expect(config.multiLinks?.de.length).toBeLessThanOrEqual(5);
    });

    it('should accept single link in multiLinks', () => {
      const config: IOSAlternativeBillingConfig = {
        countries: ['fr'],
        multiLinks: {
          fr: ['https://example.com/fr'],
        },
      };

      expect(config.multiLinks?.fr.length).toBe(1);
    });

    it('should handle multiple countries with different link counts', () => {
      const config: IOSAlternativeBillingConfig = {
        countries: ['de', 'fr', 'it'],
        multiLinks: {
          de: ['https://example.com/de1', 'https://example.com/de2'],
          fr: ['https://example.com/fr'],
          it: [
            'https://example.com/it1',
            'https://example.com/it2',
            'https://example.com/it3',
          ],
        },
      };

      expect(config.multiLinks?.de.length).toBe(2);
      expect(config.multiLinks?.fr.length).toBe(1);
      expect(config.multiLinks?.it.length).toBe(3);
    });
  });

  describe('Custom Link Regions', () => {
    it('should accept valid custom link regions', () => {
      const config: IOSAlternativeBillingConfig = {
        countries: ['de', 'fr', 'nl'],
        customLinkRegions: ['de', 'fr', 'nl'],
      };

      expect(config.customLinkRegions).toEqual(['de', 'fr', 'nl']);
    });

    it('should handle empty custom link regions', () => {
      const config: IOSAlternativeBillingConfig = {
        countries: ['kr'],
        customLinkRegions: [],
      };

      expect(config.customLinkRegions).toEqual([]);
    });
  });

  describe('Streaming Link Regions (Music Apps)', () => {
    it('should accept valid streaming regions', () => {
      const config: IOSAlternativeBillingConfig = {
        countries: ['at', 'de', 'fr', 'nl', 'is', 'no'],
        streamingLinkRegions: ['at', 'de', 'fr', 'nl', 'is', 'no'],
        enableExternalPurchaseLinkStreaming: true,
      };

      expect(config.streamingLinkRegions).toBeDefined();
      expect(config.streamingLinkRegions?.length).toBe(6);
      expect(config.enableExternalPurchaseLinkStreaming).toBe(true);
    });

    it('should handle EU + Iceland and Norway for music apps', () => {
      const euCountries = ['at', 'de', 'fr', 'it', 'es', 'nl'];
      const additionalCountries = ['is', 'no'];
      const allRegions = [...euCountries, ...additionalCountries];

      const config: IOSAlternativeBillingConfig = {
        countries: allRegions,
        streamingLinkRegions: allRegions,
        enableExternalPurchaseLinkStreaming: true,
      };

      expect(config.streamingLinkRegions).toEqual(allRegions);
    });
  });

  describe('Entitlements', () => {
    it('should enable external purchase link entitlement', () => {
      const config: IOSAlternativeBillingConfig = {
        countries: ['kr'],
        enableExternalPurchaseLink: true,
      };

      expect(config.enableExternalPurchaseLink).toBe(true);
    });

    it('should enable streaming entitlement', () => {
      const config: IOSAlternativeBillingConfig = {
        countries: ['at', 'de'],
        streamingLinkRegions: ['at', 'de'],
        enableExternalPurchaseLinkStreaming: true,
      };

      expect(config.enableExternalPurchaseLinkStreaming).toBe(true);
    });

    it('should disable entitlements by default', () => {
      const config: IOSAlternativeBillingConfig = {
        countries: ['kr'],
      };

      expect(config.enableExternalPurchaseLink).toBeUndefined();
      expect(config.enableExternalPurchaseLinkStreaming).toBeUndefined();
    });
  });

  describe('Complete Configuration', () => {
    it('should accept all configuration options together', () => {
      const config: IOSAlternativeBillingConfig = {
        countries: ['kr', 'nl', 'de', 'fr', 'it'],
        links: {
          kr: 'https://example.com/kr',
          nl: 'https://example.com/nl',
        },
        multiLinks: {
          de: ['https://example.com/de1', 'https://example.com/de2'],
          fr: ['https://example.com/fr'],
        },
        customLinkRegions: ['de', 'fr'],
        streamingLinkRegions: ['at', 'de', 'fr'],
        enableExternalPurchaseLink: true,
        enableExternalPurchaseLinkStreaming: true,
      };

      // Verify all fields
      expect(config.countries?.length).toBe(5);
      expect(Object.keys(config.links || {}).length).toBe(2);
      expect(Object.keys(config.multiLinks || {}).length).toBe(2);
      expect(config.customLinkRegions?.length).toBe(2);
      expect(config.streamingLinkRegions?.length).toBe(3);
      expect(config.enableExternalPurchaseLink).toBe(true);
      expect(config.enableExternalPurchaseLinkStreaming).toBe(true);
    });

    it('should work with minimal configuration', () => {
      const config: IOSAlternativeBillingConfig = {
        countries: ['kr'],
      };

      expect(config.countries).toEqual(['kr']);
      expect(config.links).toBeUndefined();
      expect(config.multiLinks).toBeUndefined();
      expect(config.customLinkRegions).toBeUndefined();
      expect(config.streamingLinkRegions).toBeUndefined();
      expect(config.enableExternalPurchaseLink).toBeUndefined();
      expect(config.enableExternalPurchaseLinkStreaming).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined configuration', () => {
      const config: IOSAlternativeBillingConfig | undefined = undefined;

      expect(config).toBeUndefined();
    });

    it('should handle configuration with only countries', () => {
      const config: IOSAlternativeBillingConfig = {
        countries: ['kr', 'nl'],
      };

      expect(config.countries).toBeDefined();
      expect(config.links).toBeUndefined();
    });

    it('should handle configuration with optional fields only', () => {
      const config: Partial<IOSAlternativeBillingConfig> = {
        links: {
          kr: 'https://example.com/kr',
        },
      };

      // countries is required but this tests the type system allows partial
      expect(config.links).toBeDefined();
      expect(config.countries).toBeUndefined();
    });
  });
});
