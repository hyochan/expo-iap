// Mock the native module first
jest.mock('../../ExpoIapModule', () =>
  require('../../__mocks__/ExpoIapModule'),
);

// Mock React Native's Linking module
jest.mock('react-native', () => ({
  Linking: {
    openURL: jest.fn(),
  },
}));

/* eslint-disable import/first */
import ExpoIapModule from '../../ExpoIapModule';
import {Linking} from 'react-native';
import {
  isProductAndroid,
  deepLinkToSubscriptionsAndroid,
  validateReceiptAndroid,
  acknowledgePurchaseAndroid,
  openRedeemOfferCodeAndroid,
  isBillingProgramAvailableAndroid,
  launchExternalLinkAndroid,
  createBillingProgramReportingDetailsAndroid,
} from '../android';
/* eslint-enable import/first */

describe('Android Module Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Type Guards', () => {
    it('isProductAndroid should correctly identify Android products', () => {
      const androidProduct = {platform: 'android', id: 'p1'} as any;
      const iosProduct = {platform: 'ios', id: 'p1'} as any;
      const invalidProduct = {id: 'p1'} as any;

      expect(isProductAndroid(androidProduct)).toBe(true);
      expect(isProductAndroid(iosProduct)).toBe(false);
      expect(isProductAndroid(invalidProduct)).toBe(false);
      expect(isProductAndroid(null)).toBe(false);
      expect(isProductAndroid(undefined)).toBe(false);
    });
  });

  describe('deepLinkToSubscriptionsAndroid', () => {
    it('opens correct Play Store URL', async () => {
      await deepLinkToSubscriptionsAndroid({
        skuAndroid: 'monthly_premium',
        packageNameAndroid: 'com.example.app',
      });
      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://play.google.com/store/account/subscriptions?package=com.example.app&sku=monthly_premium',
      );
    });

    it('throws when packageName missing', async () => {
      await expect(
        deepLinkToSubscriptionsAndroid({
          skuAndroid: 'id',
          packageNameAndroid: '' as any,
        }),
      ).rejects.toThrow('packageName is required');
    });

    it('delegates to native module when available', async () => {
      const original = (ExpoIapModule as any).deepLinkToSubscriptionsAndroid;
      const nativeFn = jest.fn().mockResolvedValue(undefined);
      (ExpoIapModule as any).deepLinkToSubscriptionsAndroid = nativeFn;

      await deepLinkToSubscriptionsAndroid({
        skuAndroid: 'monthly_premium',
        packageNameAndroid: 'com.example.app',
      });

      expect(nativeFn).toHaveBeenCalledWith({
        skuAndroid: 'monthly_premium',
        packageNameAndroid: 'com.example.app',
      });

      (ExpoIapModule as any).deepLinkToSubscriptionsAndroid = original;
    });
  });

  describe('validateReceiptAndroid', () => {
    const originalFetch = (globalThis as any).fetch;
    beforeEach(() => {
      (globalThis as any).fetch = jest.fn();
    });
    afterEach(() => {
      (globalThis as any).fetch = originalFetch as any;
    });

    it('returns JSON on success', async () => {
      (globalThis.fetch as any as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({purchaseState: 0}),
      });

      const res = await validateReceiptAndroid({
        packageName: 'com.example.app',
        productId: 'prod1',
        productToken: 'token',
        accessToken: 'access',
        isSub: true,
      });
      expect(res).toEqual({purchaseState: 0});
      expect((globalThis as any).fetch).toHaveBeenCalled();
    });

    it('throws with statusCode on failure', async () => {
      (globalThis.fetch as any as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Forbidden',
        status: 403,
      });

      await expect(
        validateReceiptAndroid({
          packageName: 'com.example.app',
          productId: 'prod1',
          productToken: 'token',
          accessToken: 'access',
          isSub: false,
        }),
      ).rejects.toMatchObject({message: 'Forbidden', statusCode: 403});
    });
  });

  describe('acknowledgePurchaseAndroid', () => {
    it('delegates to native module', async () => {
      (ExpoIapModule.acknowledgePurchaseAndroid as jest.Mock).mockResolvedValue(
        {responseCode: 0},
      );
      const res = await acknowledgePurchaseAndroid('tkn');
      expect(ExpoIapModule.acknowledgePurchaseAndroid).toHaveBeenCalledWith(
        'tkn',
      );
      expect(res).toBe(true);
    });

    it('returns direct boolean when native resolves boolean', async () => {
      (ExpoIapModule.acknowledgePurchaseAndroid as jest.Mock).mockResolvedValue(
        false,
      );
      const res = await acknowledgePurchaseAndroid('token');
      expect(res).toBe(false);
    });

    it('defaults to true when native returns undefined', async () => {
      (ExpoIapModule.acknowledgePurchaseAndroid as jest.Mock).mockResolvedValue(
        undefined,
      );
      const res = await acknowledgePurchaseAndroid('token');
      expect(res).toBe(true);
    });

    it('returns native success boolean when provided', async () => {
      (ExpoIapModule.acknowledgePurchaseAndroid as jest.Mock).mockResolvedValue(
        {
          success: false,
        },
      );
      const res = await acknowledgePurchaseAndroid('token-value');
      expect(res).toBe(false);
    });

    it('returns success when responseCode provided', async () => {
      (ExpoIapModule.acknowledgePurchaseAndroid as jest.Mock).mockResolvedValue(
        {
          responseCode: 42,
        },
      );
      const res = await acknowledgePurchaseAndroid('token-value');
      expect(res).toBe(false);
    });
  });

  describe('openRedeemOfferCodeAndroid', () => {
    it('opens redeem URL', async () => {
      await openRedeemOfferCodeAndroid();
      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://play.google.com/redeem?code=',
      );
    });
  });

  describe('Billing Programs API (8.2.0+)', () => {
    describe('isBillingProgramAvailableAndroid', () => {
      it('delegates to native module with external-offer', async () => {
        const mockResult = {
          billingProgram: 'external-offer',
          isAvailable: true,
        };
        (
          ExpoIapModule.isBillingProgramAvailableAndroid as jest.Mock
        ).mockResolvedValue(mockResult);

        const result = await isBillingProgramAvailableAndroid('external-offer');

        expect(
          ExpoIapModule.isBillingProgramAvailableAndroid,
        ).toHaveBeenCalledWith('external-offer');
        expect(result).toEqual(mockResult);
      });

      it('delegates to native module with external-content-link', async () => {
        const mockResult = {
          billingProgram: 'external-content-link',
          isAvailable: false,
        };
        (
          ExpoIapModule.isBillingProgramAvailableAndroid as jest.Mock
        ).mockResolvedValue(mockResult);

        const result = await isBillingProgramAvailableAndroid(
          'external-content-link',
        );

        expect(
          ExpoIapModule.isBillingProgramAvailableAndroid,
        ).toHaveBeenCalledWith('external-content-link');
        expect(result).toEqual(mockResult);
      });

      it('handles unspecified billing program', async () => {
        const mockResult = {
          billingProgram: 'unspecified',
          isAvailable: false,
        };
        (
          ExpoIapModule.isBillingProgramAvailableAndroid as jest.Mock
        ).mockResolvedValue(mockResult);

        const result = await isBillingProgramAvailableAndroid('unspecified');

        expect(
          ExpoIapModule.isBillingProgramAvailableAndroid,
        ).toHaveBeenCalledWith('unspecified');
        expect(result).toEqual(mockResult);
      });

      it('handles user-choice-billing program (7.0+)', async () => {
        const mockResult = {
          billingProgram: 'user-choice-billing',
          isAvailable: true,
        };
        (
          ExpoIapModule.isBillingProgramAvailableAndroid as jest.Mock
        ).mockResolvedValue(mockResult);

        const result = await isBillingProgramAvailableAndroid(
          'user-choice-billing',
        );

        expect(
          ExpoIapModule.isBillingProgramAvailableAndroid,
        ).toHaveBeenCalledWith('user-choice-billing');
        expect(result).toEqual(mockResult);
      });

      it('propagates errors from native module', async () => {
        const error = new Error('Billing program not supported');
        (
          ExpoIapModule.isBillingProgramAvailableAndroid as jest.Mock
        ).mockRejectedValue(error);

        await expect(
          isBillingProgramAvailableAndroid('external-offer'),
        ).rejects.toThrow('Billing program not supported');
      });
    });

    describe('launchExternalLinkAndroid', () => {
      it('delegates to native module with valid params', async () => {
        (
          ExpoIapModule.launchExternalLinkAndroid as jest.Mock
        ).mockResolvedValue(undefined);

        await launchExternalLinkAndroid({
          billingProgram: 'external-offer',
          launchMode: 'launch-in-external-browser-or-app',
          linkType: 'link-to-digital-content-offer',
          linkUri: 'https://example.com/purchase',
        });

        expect(ExpoIapModule.launchExternalLinkAndroid).toHaveBeenCalledWith({
          billingProgram: 'external-offer',
          launchMode: 'launch-in-external-browser-or-app',
          linkType: 'link-to-digital-content-offer',
          linkUri: 'https://example.com/purchase',
        });
      });

      it('supports external-content-link billing program', async () => {
        (
          ExpoIapModule.launchExternalLinkAndroid as jest.Mock
        ).mockResolvedValue(undefined);

        await launchExternalLinkAndroid({
          billingProgram: 'external-content-link',
          launchMode: 'caller-will-launch-link',
          linkType: 'link-to-app-download',
          linkUri: 'https://example.com/app',
        });

        expect(ExpoIapModule.launchExternalLinkAndroid).toHaveBeenCalledWith({
          billingProgram: 'external-content-link',
          launchMode: 'caller-will-launch-link',
          linkType: 'link-to-app-download',
          linkUri: 'https://example.com/app',
        });
      });

      it('propagates errors from native module', async () => {
        const error = new Error('Activity not available');
        (
          ExpoIapModule.launchExternalLinkAndroid as jest.Mock
        ).mockRejectedValue(error);

        await expect(
          launchExternalLinkAndroid({
            billingProgram: 'external-offer',
            launchMode: 'launch-in-external-browser-or-app',
            linkType: 'link-to-digital-content-offer',
            linkUri: 'https://example.com/purchase',
          }),
        ).rejects.toThrow('Activity not available');
      });

      it('rejects when billingProgram is missing (native validation)', async () => {
        const error = new Error('`billingProgram` is a required parameter.');
        (
          ExpoIapModule.launchExternalLinkAndroid as jest.Mock
        ).mockRejectedValue(error);

        await expect(
          launchExternalLinkAndroid({
            billingProgram: '' as any,
            launchMode: 'launch-in-external-browser-or-app',
            linkType: 'link-to-digital-content-offer',
            linkUri: 'https://example.com/purchase',
          }),
        ).rejects.toThrow('`billingProgram` is a required parameter.');
      });

      it('rejects when linkUri is missing (native validation)', async () => {
        const error = new Error(
          '`linkUri` is a required and non-empty parameter.',
        );
        (
          ExpoIapModule.launchExternalLinkAndroid as jest.Mock
        ).mockRejectedValue(error);

        await expect(
          launchExternalLinkAndroid({
            billingProgram: 'external-offer',
            launchMode: 'launch-in-external-browser-or-app',
            linkType: 'link-to-digital-content-offer',
            linkUri: '' as any,
          }),
        ).rejects.toThrow('`linkUri` is a required and non-empty parameter.');
      });
    });

    describe('createBillingProgramReportingDetailsAndroid', () => {
      it('delegates to native module and returns reporting details', async () => {
        const mockResult = {
          billingProgram: 'external-offer',
          externalTransactionToken: 'token-abc-123-xyz',
        };
        (
          ExpoIapModule.createBillingProgramReportingDetailsAndroid as jest.Mock
        ).mockResolvedValue(mockResult);

        const result = await createBillingProgramReportingDetailsAndroid(
          'external-offer',
        );

        expect(
          ExpoIapModule.createBillingProgramReportingDetailsAndroid,
        ).toHaveBeenCalledWith('external-offer');
        expect(result).toEqual(mockResult);
        expect(result.externalTransactionToken).toBe('token-abc-123-xyz');
      });

      it('handles external-content-link program', async () => {
        const mockResult = {
          billingProgram: 'external-content-link',
          externalTransactionToken: 'content-link-token',
        };
        (
          ExpoIapModule.createBillingProgramReportingDetailsAndroid as jest.Mock
        ).mockResolvedValue(mockResult);

        const result = await createBillingProgramReportingDetailsAndroid(
          'external-content-link',
        );

        expect(
          ExpoIapModule.createBillingProgramReportingDetailsAndroid,
        ).toHaveBeenCalledWith('external-content-link');
        expect(result.billingProgram).toBe('external-content-link');
      });

      it('propagates errors from native module', async () => {
        const error = new Error('Failed to create reporting details');
        (
          ExpoIapModule.createBillingProgramReportingDetailsAndroid as jest.Mock
        ).mockRejectedValue(error);

        await expect(
          createBillingProgramReportingDetailsAndroid('external-offer'),
        ).rejects.toThrow('Failed to create reporting details');
      });
    });
  });
});
