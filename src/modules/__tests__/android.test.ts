// Mock the native module first
jest.mock('../../ExpoIapModule');

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
});
