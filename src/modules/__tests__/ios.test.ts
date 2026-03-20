// Mock the native module first
jest.mock('../../ExpoIapModule', () => ({
  __esModule: true,
  default: {
    isEligibleForIntroOfferIOS: jest.fn(),
    syncIOS: jest.fn(),
    subscriptionStatusIOS: jest.fn(),
    currentEntitlementIOS: jest.fn(),
    latestTransactionIOS: jest.fn(),
    beginRefundRequestIOS: jest.fn(),
    showManageSubscriptionsIOS: jest.fn(),
    getReceiptDataIOS: jest.fn(),
    requestReceiptRefreshIOS: jest.fn(),
    isTransactionVerifiedIOS: jest.fn(),
    getTransactionJwsIOS: jest.fn(),
    validateReceiptIOS: jest.fn(),
    presentCodeRedemptionSheetIOS: jest.fn(),
    getAppTransactionIOS: jest.fn(),
    getPromotedProductIOS: jest.fn(),
    requestPurchaseOnPromotedProductIOS: jest.fn(),
    getPendingTransactionsIOS: jest.fn(),
    clearTransactionIOS: jest.fn(),
    canPresentExternalPurchaseNoticeIOS: jest.fn(),
    presentExternalPurchaseNoticeSheetIOS: jest.fn(),
    presentExternalPurchaseLinkIOS: jest.fn(),
    isEligibleForExternalPurchaseCustomLinkIOS: jest.fn(),
    getExternalPurchaseCustomLinkTokenIOS: jest.fn(),
    showExternalPurchaseCustomLinkNoticeIOS: jest.fn(),
  },
}));

jest.mock('expo-onside');

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
  isEligibleForIntroOfferIOS,
  syncIOS,
  subscriptionStatusIOS,
  currentEntitlementIOS,
  latestTransactionIOS,
  beginRefundRequestIOS,
  showManageSubscriptionsIOS,
  getReceiptIOS,
  requestReceiptRefreshIOS,
  isTransactionVerifiedIOS,
  getTransactionJwsIOS,
  validateReceiptIOS,
  presentCodeRedemptionSheetIOS,
  getAppTransactionIOS,
  getPromotedProductIOS,
  requestPurchaseOnPromotedProductIOS,
  deepLinkToSubscriptionsIOS,
  isProductIOS,
  getPendingTransactionsIOS,
  clearTransactionIOS,
  canPresentExternalPurchaseNoticeIOS,
  presentExternalPurchaseNoticeSheetIOS,
  presentExternalPurchaseLinkIOS,
  isEligibleForExternalPurchaseCustomLinkIOS,
  getExternalPurchaseCustomLinkTokenIOS,
  showExternalPurchaseCustomLinkNoticeIOS,
} from '../ios';
/* eslint-enable import/first */

describe('iOS Module Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isEligibleForIntroOfferIOS', () => {
    it('should call native module with correct groupId parameter', async () => {
      const mockGroupId = 'com.example.monthly';
      const mockResult = true;

      (ExpoIapModule.isEligibleForIntroOfferIOS as jest.Mock).mockResolvedValue(
        mockResult,
      );

      const result = await isEligibleForIntroOfferIOS(mockGroupId);

      expect(ExpoIapModule.isEligibleForIntroOfferIOS).toHaveBeenCalledWith(
        mockGroupId,
      );
      expect(ExpoIapModule.isEligibleForIntroOfferIOS).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockResult);
    });

    it('should handle different groupId values', async () => {
      const testCases = [
        'premium-group',
        'basic-group',
        'enterprise-group-123',
        'com.example.subscriptions.monthly',
      ];

      for (const groupID of testCases) {
        (
          ExpoIapModule.isEligibleForIntroOfferIOS as jest.Mock
        ).mockResolvedValue(true);

        await isEligibleForIntroOfferIOS(groupID);

        expect(
          ExpoIapModule.isEligibleForIntroOfferIOS,
        ).toHaveBeenLastCalledWith(groupID);
      }
    });

    it('should propagate errors from native module', async () => {
      const mockError = new Error('Native module error');
      (ExpoIapModule.isEligibleForIntroOfferIOS as jest.Mock).mockRejectedValue(
        mockError,
      );

      await expect(isEligibleForIntroOfferIOS('test-group')).rejects.toThrow(
        'Native module error',
      );
    });

    it('should throw when groupId missing', async () => {
      // @ts-expect-error force undefined to exercise runtime guard
      await expect(isEligibleForIntroOfferIOS(undefined)).rejects.toThrow(
        /requires a groupID/,
      );
    });
  });

  describe('syncIOS', () => {
    it('should call native sync function', async () => {
      (ExpoIapModule.syncIOS as jest.Mock).mockResolvedValue(true);

      const result = await syncIOS();

      expect(ExpoIapModule.syncIOS).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });
  });

  describe('subscriptionStatusIOS', () => {
    it('should call native module with SKU parameter', async () => {
      const mockSku = 'com.example.subscription';
      const mockStatus = [
        {
          state: 'subscribed',
          renewalInfo: {
            willAutoRenew: true,
            autoRenewPreference: 'com.example.subscription.premium',
          },
        },
      ];

      (ExpoIapModule.subscriptionStatusIOS as jest.Mock).mockResolvedValue(
        mockStatus,
      );

      const result = await subscriptionStatusIOS(mockSku);
      expect(ExpoIapModule.subscriptionStatusIOS).toHaveBeenCalledWith(mockSku);
      expect(result).toEqual(mockStatus);
    });

    it('should return empty array when native module returns null', async () => {
      const mockSku = 'com.example.subscription';
      (ExpoIapModule.subscriptionStatusIOS as jest.Mock).mockResolvedValue(
        null,
      );

      const result = await subscriptionStatusIOS(mockSku);

      expect(result).toEqual([]);
    });

    it('should throw when SKU missing', async () => {
      // @ts-expect-error runtime guard
      await expect(subscriptionStatusIOS(undefined)).rejects.toThrow(
        /requires a SKU/,
      );
    });
  });

  describe('getAppTransactionIOS', () => {
    it('should return app transaction with Id fields (not ID)', async () => {
      const mockTransaction = {
        appTransactionId: 'test-transaction-123',
        bundleId: 'com.example.app',
        appVersion: '1.0.0',
        originalAppVersion: '1.0.0',
        originalPurchaseDate: Date.now(),
        deviceVerification: 'verification-data',
        deviceVerificationNonce: 'nonce-123',
        environment: 'Production',
        signedDate: Date.now(),
        appId: 123456,
        appVersionId: 789012,
      };

      (ExpoIapModule.getAppTransactionIOS as jest.Mock).mockResolvedValue(
        mockTransaction,
      );

      const result = await getAppTransactionIOS();

      expect(ExpoIapModule.getAppTransactionIOS).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockTransaction);
      expect(result?.appTransactionId).toBe('test-transaction-123');
      expect(result?.bundleId).toBe('com.example.app');
      expect(result?.appId).toBe(123456);
      expect(result?.appVersionId).toBe(789012);
    });

    it('should handle null response', async () => {
      (ExpoIapModule.getAppTransactionIOS as jest.Mock).mockResolvedValue(null);

      const result = await getAppTransactionIOS();

      expect(result).toBeNull();
    });
  });

  describe('validateReceiptIOS', () => {
    it('should validate receipt for given SKU', async () => {
      const mockSku = 'com.example.product';
      const mockValidationResult = {
        isValid: true,
        receiptData: 'receipt-data-base64',
        jwsRepresentation: 'jws-token',
        latestTransaction: {
          id: 'com.example.product',
          transactionId: 'transaction-123',
          platform: 'ios',
        },
      };

      (ExpoIapModule.validateReceiptIOS as jest.Mock).mockResolvedValue(
        mockValidationResult,
      );

      const result = (await validateReceiptIOS({apple: {sku: mockSku}})) as any;

      expect(ExpoIapModule.validateReceiptIOS).toHaveBeenCalledWith(mockSku);
      expect(result.isValid).toBe(true);
      expect(result.receiptData).toBeDefined();
      expect(result.jwsRepresentation).toBeDefined();
      expect(result.latestTransaction?.id).toBe('com.example.product');
    });

    it('should throw when SKU missing', async () => {
      // @ts-expect-error runtime guard
      await expect(validateReceiptIOS(undefined)).rejects.toThrow(
        /requires a SKU/,
      );
      // Also test with empty apple options
      await expect(validateReceiptIOS({apple: {sku: ''}})).rejects.toThrow(
        /requires a SKU/,
      );
    });

    it('returns original result when already normalized', async () => {
      const mockResult: any = {
        isValid: true,
        receiptData: 'data',
        jwsRepresentation: 'jws',
        latestTransaction: {
          id: 'transaction-123',
          transactionId: 'transaction-123',
          platform: 'ios',
        },
      };

      (ExpoIapModule.validateReceiptIOS as jest.Mock).mockResolvedValue(
        mockResult,
      );

      const result = await validateReceiptIOS({apple: {sku: 'product.id'}});

      expect(result).toBe(mockResult);
    });

    it('allows string SKU argument for backward compatibility', async () => {
      (ExpoIapModule.validateReceiptIOS as jest.Mock).mockResolvedValue({
        isValid: true,
        receiptData: 'data',
        jwsRepresentation: 'jws',
        latestTransaction: undefined,
      });

      const result = await validateReceiptIOS('string.sku' as any);

      expect(result).toEqual({
        isValid: true,
        receiptData: 'data',
        jwsRepresentation: 'jws',
        latestTransaction: undefined,
      });
    });
  });

  describe('Type Guards', () => {
    describe('isProductIOS', () => {
      it('should correctly identify iOS products', () => {
        const iosProduct = {
          platform: 'ios',
          id: 'com.example.product',
          price: '$9.99',
        };

        const androidProduct = {
          platform: 'android',
          id: 'com.example.product',
          price: '$9.99',
        };

        const invalidProduct = {
          id: 'com.example.product',
          price: '$9.99',
        };

        expect(isProductIOS(iosProduct)).toBe(true);
        expect(isProductIOS(androidProduct)).toBe(false);
        expect(isProductIOS(invalidProduct)).toBe(false);
        expect(isProductIOS(null)).toBe(false);
        expect(isProductIOS(undefined)).toBe(false);
      });
    });
  });

  describe('Deep Link Functions', () => {
    it('should open subscriptions management URL', async () => {
      await deepLinkToSubscriptionsIOS();

      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://apps.apple.com/account/subscriptions',
      );
    });
  });

  describe('Other iOS Functions', () => {
    it('should call currentEntitlementIOS with SKU', async () => {
      const mockSku = 'com.example.entitlement';
      const mockEntitlement = {
        id: 'legacy-id',
        productId: mockSku,
        transactionId: 'txn-1',
      } as any;

      (ExpoIapModule.currentEntitlementIOS as jest.Mock).mockResolvedValue(
        mockEntitlement,
      );

      const result = (await currentEntitlementIOS(mockSku)) as any;

      expect(ExpoIapModule.currentEntitlementIOS).toHaveBeenCalledWith(mockSku);
      expect(result?.id).toBe('legacy-id');
      expect(result?.transactionId).toBe('txn-1');
    });

    it('currentEntitlementIOS throws when SKU missing', async () => {
      // @ts-expect-error runtime guard
      await expect(currentEntitlementIOS(undefined)).rejects.toThrow(
        /requires a SKU/,
      );
    });

    it('currentEntitlementIOS returns null when native returns null', async () => {
      const mockSku = 'com.example.entitlement';
      (ExpoIapModule.currentEntitlementIOS as jest.Mock).mockResolvedValue(
        null,
      );

      const result = await currentEntitlementIOS(mockSku);

      expect(result).toBeNull();
    });

    it('should call latestTransactionIOS with SKU', async () => {
      const mockSku = 'com.example.product';
      const mockTransaction = {id: mockSku, transactionId: '123'};

      (ExpoIapModule.latestTransactionIOS as jest.Mock).mockResolvedValue(
        mockTransaction,
      );

      const result = (await latestTransactionIOS(mockSku)) as any;

      expect(ExpoIapModule.latestTransactionIOS).toHaveBeenCalledWith(mockSku);
      expect(result?.id).toBe('com.example.product');
      expect(result?.transactionId).toBe('123');
    });

    it('latestTransactionIOS throws when SKU missing', async () => {
      // @ts-expect-error runtime guard
      await expect(latestTransactionIOS(undefined)).rejects.toThrow(
        /requires a SKU/,
      );
    });

    it('latestTransactionIOS returns null when native module returns undefined', async () => {
      const mockSku = 'com.example.product';

      (ExpoIapModule.latestTransactionIOS as jest.Mock).mockResolvedValue(
        undefined,
      );

      const result = await latestTransactionIOS(mockSku);

      expect(result).toBeNull();
    });

    it('should call beginRefundRequestIOS with SKU', async () => {
      const mockSku = 'com.example.product';
      const mockStatus = 'success';

      (ExpoIapModule.beginRefundRequestIOS as jest.Mock).mockResolvedValue(
        mockStatus,
      );

      const result = await beginRefundRequestIOS(mockSku);

      expect(ExpoIapModule.beginRefundRequestIOS).toHaveBeenCalledWith(mockSku);
      expect(result).toBe(mockStatus);
    });

    it('beginRefundRequestIOS throws when SKU missing', async () => {
      // @ts-expect-error runtime guard
      await expect(beginRefundRequestIOS(undefined)).rejects.toThrow(
        /requires a SKU/,
      );
    });

    it('beginRefundRequestIOS returns null when native module returns undefined', async () => {
      const mockSku = 'com.example.product';
      (ExpoIapModule.beginRefundRequestIOS as jest.Mock).mockResolvedValue(
        undefined,
      );

      const result = await beginRefundRequestIOS(mockSku);

      expect(result).toBeNull();
    });

    it('should call showManageSubscriptionsIOS', async () => {
      const mockPurchases: any[] = [
        {id: 'legacy', transactionId: 'txn-77', platform: 'ios'},
      ];
      (ExpoIapModule.showManageSubscriptionsIOS as jest.Mock).mockResolvedValue(
        mockPurchases,
      );

      const result = (await showManageSubscriptionsIOS()) as any[];

      expect(ExpoIapModule.showManageSubscriptionsIOS).toHaveBeenCalledTimes(1);
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]?.id).toBe('legacy');
      expect(result[0]?.transactionId).toBe('txn-77');
    });

    it('showManageSubscriptionsIOS returns empty array when native returns null', async () => {
      (ExpoIapModule.showManageSubscriptionsIOS as jest.Mock).mockResolvedValue(
        null,
      );

      const result = await showManageSubscriptionsIOS();

      expect(result).toEqual([]);
    });

    it('should call getReceiptIOS', async () => {
      const mockReceipt = 'base64-receipt-data';

      (ExpoIapModule.getReceiptDataIOS as jest.Mock).mockResolvedValue(
        mockReceipt,
      );

      const result = await getReceiptIOS();

      expect(ExpoIapModule.getReceiptDataIOS).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockReceipt);
    });

    it('should call requestReceiptRefreshIOS and return refreshed receipt', async () => {
      const mockReceipt = 'refreshed-base64-receipt-data';

      (ExpoIapModule.requestReceiptRefreshIOS as jest.Mock).mockResolvedValue(
        mockReceipt,
      );

      const result = await requestReceiptRefreshIOS();

      expect(ExpoIapModule.requestReceiptRefreshIOS).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockReceipt);
    });

    it('requestReceiptRefreshIOS should propagate errors', async () => {
      const mockError = new Error('Sync failed');
      (ExpoIapModule.requestReceiptRefreshIOS as jest.Mock).mockRejectedValue(
        mockError,
      );

      await expect(requestReceiptRefreshIOS()).rejects.toThrow('Sync failed');
    });

    it('should call isTransactionVerifiedIOS with SKU', async () => {
      const mockSku = 'com.example.product';

      (ExpoIapModule.isTransactionVerifiedIOS as jest.Mock).mockResolvedValue(
        true,
      );

      const result = await isTransactionVerifiedIOS(mockSku);

      expect(ExpoIapModule.isTransactionVerifiedIOS).toHaveBeenCalledWith(
        mockSku,
      );
      expect(result).toBe(true);
    });

    it('isTransactionVerifiedIOS throws when SKU missing', async () => {
      // @ts-expect-error runtime guard
      await expect(isTransactionVerifiedIOS(undefined)).rejects.toThrow(
        /requires a SKU/,
      );
    });

    it('should call getTransactionJwsIOS with SKU', async () => {
      const mockSku = 'com.example.product';
      const mockJws = 'jws-token-string';

      (ExpoIapModule.getTransactionJwsIOS as jest.Mock).mockResolvedValue(
        mockJws,
      );

      const result = await getTransactionJwsIOS(mockSku);

      expect(ExpoIapModule.getTransactionJwsIOS).toHaveBeenCalledWith(mockSku);
      expect(result).toBe(mockJws);
    });

    it('getTransactionJwsIOS returns empty string when native returns null', async () => {
      (ExpoIapModule.getTransactionJwsIOS as jest.Mock).mockResolvedValue(null);

      const result = await getTransactionJwsIOS('com.example.product');

      expect(result).toBe('');
    });

    it('getTransactionJwsIOS throws when SKU missing', async () => {
      // @ts-expect-error runtime guard
      await expect(getTransactionJwsIOS(undefined)).rejects.toThrow(
        /requires a SKU/,
      );
    });

    it('should call presentCodeRedemptionSheetIOS', async () => {
      (
        ExpoIapModule.presentCodeRedemptionSheetIOS as jest.Mock
      ).mockResolvedValue(true);

      const result = await presentCodeRedemptionSheetIOS();

      expect(ExpoIapModule.presentCodeRedemptionSheetIOS).toHaveBeenCalledTimes(
        1,
      );
      expect(result).toBe(true);
    });

    it('should call getPromotedProductIOS', async () => {
      const mockProduct = {id: 'promoted-product', price: '$4.99'};

      (ExpoIapModule.getPromotedProductIOS as jest.Mock).mockResolvedValue(
        mockProduct,
      );

      const result = await getPromotedProductIOS();

      expect(ExpoIapModule.getPromotedProductIOS).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockProduct);
    });

    it('getPromotedProductIOS returns null when native returns null', async () => {
      (ExpoIapModule.getPromotedProductIOS as jest.Mock).mockResolvedValue(
        null,
      );

      const result = await getPromotedProductIOS();

      expect(result).toBeNull();
    });

    it('should call requestPurchaseOnPromotedProductIOS (deprecated)', async () => {
      // Note: This function is deprecated. Use promotedProductListenerIOS + requestPurchase instead.
      (
        ExpoIapModule.requestPurchaseOnPromotedProductIOS as jest.Mock
      ).mockResolvedValue(undefined);

      const result = await requestPurchaseOnPromotedProductIOS();

      expect(
        ExpoIapModule.requestPurchaseOnPromotedProductIOS,
      ).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });

    it('requestPurchaseOnPromotedProductIOS returns true on success', async () => {
      (
        ExpoIapModule.requestPurchaseOnPromotedProductIOS as jest.Mock
      ).mockResolvedValue(true);

      const result = await requestPurchaseOnPromotedProductIOS();

      expect(result).toBe(true);
    });

    it('requestPurchaseOnPromotedProductIOS propagates errors', async () => {
      const mockError = new Error('Feature not supported');
      (
        ExpoIapModule.requestPurchaseOnPromotedProductIOS as jest.Mock
      ).mockRejectedValue(mockError);

      await expect(requestPurchaseOnPromotedProductIOS()).rejects.toThrow(
        'Feature not supported',
      );
    });

    it('normalizes pending transactions list', async () => {
      (ExpoIapModule.getPendingTransactionsIOS as jest.Mock).mockResolvedValue([
        {id: 'legacy-id', transactionId: 'txn-pending', platform: 'ios'},
      ]);

      const result = await getPendingTransactionsIOS();

      expect(ExpoIapModule.getPendingTransactionsIOS).toHaveBeenCalledTimes(1);
      expect(result[0].id).toBe('legacy-id');
    });

    it('clears iOS transactions', async () => {
      (ExpoIapModule.clearTransactionIOS as jest.Mock).mockResolvedValue(true);

      const result = await clearTransactionIOS();

      expect(ExpoIapModule.clearTransactionIOS).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });

    it('getPendingTransactionsIOS returns empty list when native returns null', async () => {
      (ExpoIapModule.getPendingTransactionsIOS as jest.Mock).mockResolvedValue(
        null,
      );

      const result = await getPendingTransactionsIOS();

      expect(result).toEqual([]);
    });

    it('clearTransactionIOS returns false when native resolves undefined', async () => {
      (ExpoIapModule.clearTransactionIOS as jest.Mock).mockResolvedValue(
        undefined,
      );

      const result = await clearTransactionIOS();

      expect(result).toBe(false);
    });
  });

  describe('External Purchase APIs', () => {
    describe('canPresentExternalPurchaseNoticeIOS', () => {
      it('should return true when native module returns true', async () => {
        (
          ExpoIapModule.canPresentExternalPurchaseNoticeIOS as jest.Mock
        ).mockResolvedValue(true);

        const result = await canPresentExternalPurchaseNoticeIOS();

        expect(
          ExpoIapModule.canPresentExternalPurchaseNoticeIOS,
        ).toHaveBeenCalledTimes(1);
        expect(result).toBe(true);
      });

      it('should return false when native module returns false', async () => {
        (
          ExpoIapModule.canPresentExternalPurchaseNoticeIOS as jest.Mock
        ).mockResolvedValue(false);

        const result = await canPresentExternalPurchaseNoticeIOS();

        expect(result).toBe(false);
      });

      it('should return false when native module returns null', async () => {
        (
          ExpoIapModule.canPresentExternalPurchaseNoticeIOS as jest.Mock
        ).mockResolvedValue(null);

        const result = await canPresentExternalPurchaseNoticeIOS();

        expect(result).toBe(false);
      });
    });

    describe('presentExternalPurchaseNoticeSheetIOS', () => {
      it('should return result with continue and token', async () => {
        const mockResult = {
          result: 'continue',
          externalPurchaseToken: 'token-abc-123',
        };
        (
          ExpoIapModule.presentExternalPurchaseNoticeSheetIOS as jest.Mock
        ).mockResolvedValue(mockResult);

        const result = await presentExternalPurchaseNoticeSheetIOS();

        expect(
          ExpoIapModule.presentExternalPurchaseNoticeSheetIOS,
        ).toHaveBeenCalledTimes(1);
        expect(result.result).toBe('continue');
        expect(result.externalPurchaseToken).toBe('token-abc-123');
      });

      it('should return result with dismissed action', async () => {
        const mockResult = {
          result: 'dismissed',
        };
        (
          ExpoIapModule.presentExternalPurchaseNoticeSheetIOS as jest.Mock
        ).mockResolvedValue(mockResult);

        const result = await presentExternalPurchaseNoticeSheetIOS();

        expect(result.result).toBe('dismissed');
        expect(result.externalPurchaseToken).toBeUndefined();
      });

      it('should propagate errors from native module', async () => {
        const mockError = new Error('External purchase notice failed');
        (
          ExpoIapModule.presentExternalPurchaseNoticeSheetIOS as jest.Mock
        ).mockRejectedValue(mockError);

        await expect(presentExternalPurchaseNoticeSheetIOS()).rejects.toThrow(
          'External purchase notice failed',
        );
      });
    });

    describe('presentExternalPurchaseLinkIOS', () => {
      it('should call native module with URL parameter', async () => {
        const mockUrl = 'https://example.com/purchase';
        const mockResult = {success: true};
        (
          ExpoIapModule.presentExternalPurchaseLinkIOS as jest.Mock
        ).mockResolvedValue(mockResult);

        const result = await presentExternalPurchaseLinkIOS(mockUrl);

        expect(
          ExpoIapModule.presentExternalPurchaseLinkIOS,
        ).toHaveBeenCalledWith(mockUrl);
        expect(result.success).toBe(true);
      });

      it('should return error result when link fails', async () => {
        const mockUrl = 'https://example.com/purchase';
        const mockResult = {
          success: false,
          error: 'Network unavailable',
        };
        (
          ExpoIapModule.presentExternalPurchaseLinkIOS as jest.Mock
        ).mockResolvedValue(mockResult);

        const result = await presentExternalPurchaseLinkIOS(mockUrl);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Network unavailable');
      });
    });
  });

  describe('ExternalPurchaseCustomLink APIs (iOS 18.1+)', () => {
    describe('isEligibleForExternalPurchaseCustomLinkIOS', () => {
      it('should return true when eligible', async () => {
        (
          ExpoIapModule.isEligibleForExternalPurchaseCustomLinkIOS as jest.Mock
        ).mockResolvedValue(true);

        const result = await isEligibleForExternalPurchaseCustomLinkIOS();

        expect(
          ExpoIapModule.isEligibleForExternalPurchaseCustomLinkIOS,
        ).toHaveBeenCalledTimes(1);
        expect(result).toBe(true);
      });

      it('should return false when not eligible', async () => {
        (
          ExpoIapModule.isEligibleForExternalPurchaseCustomLinkIOS as jest.Mock
        ).mockResolvedValue(false);

        const result = await isEligibleForExternalPurchaseCustomLinkIOS();

        expect(result).toBe(false);
      });

      it('should return false when native returns null', async () => {
        (
          ExpoIapModule.isEligibleForExternalPurchaseCustomLinkIOS as jest.Mock
        ).mockResolvedValue(null);

        const result = await isEligibleForExternalPurchaseCustomLinkIOS();

        expect(result).toBe(false);
      });

      it('should propagate errors from native module', async () => {
        const mockError = new Error('iOS version not supported');
        (
          ExpoIapModule.isEligibleForExternalPurchaseCustomLinkIOS as jest.Mock
        ).mockRejectedValue(mockError);

        await expect(
          isEligibleForExternalPurchaseCustomLinkIOS(),
        ).rejects.toThrow('iOS version not supported');
      });
    });

    describe('getExternalPurchaseCustomLinkTokenIOS', () => {
      it('should call native module with acquisition token type', async () => {
        const mockResult = {token: 'acquisition-token-xyz'};
        (
          ExpoIapModule.getExternalPurchaseCustomLinkTokenIOS as jest.Mock
        ).mockResolvedValue(mockResult);

        const result = await getExternalPurchaseCustomLinkTokenIOS(
          'acquisition',
        );

        expect(
          ExpoIapModule.getExternalPurchaseCustomLinkTokenIOS,
        ).toHaveBeenCalledWith('acquisition');
        expect(result.token).toBe('acquisition-token-xyz');
      });

      it('should call native module with services token type', async () => {
        const mockResult = {token: 'services-token-abc'};
        (
          ExpoIapModule.getExternalPurchaseCustomLinkTokenIOS as jest.Mock
        ).mockResolvedValue(mockResult);

        const result = await getExternalPurchaseCustomLinkTokenIOS('services');

        expect(
          ExpoIapModule.getExternalPurchaseCustomLinkTokenIOS,
        ).toHaveBeenCalledWith('services');
        expect(result.token).toBe('services-token-abc');
      });

      it('should return error when token fetch fails', async () => {
        const mockResult = {
          error: 'App not eligible',
        };
        (
          ExpoIapModule.getExternalPurchaseCustomLinkTokenIOS as jest.Mock
        ).mockResolvedValue(mockResult);

        const result = await getExternalPurchaseCustomLinkTokenIOS(
          'acquisition',
        );

        expect(result.error).toBe('App not eligible');
        expect(result.token).toBeUndefined();
      });

      it('should throw when tokenType missing', async () => {
        await expect(
          getExternalPurchaseCustomLinkTokenIOS(undefined as any),
        ).rejects.toThrow(/requires a tokenType/);
      });

      it('should throw when tokenType is empty string', async () => {
        await expect(
          getExternalPurchaseCustomLinkTokenIOS('' as any),
        ).rejects.toThrow(/requires a tokenType/);
      });

      it('should propagate errors from native module', async () => {
        const mockError = new Error('Failed to get token');
        (
          ExpoIapModule.getExternalPurchaseCustomLinkTokenIOS as jest.Mock
        ).mockRejectedValue(mockError);

        await expect(
          getExternalPurchaseCustomLinkTokenIOS('acquisition'),
        ).rejects.toThrow('Failed to get token');
      });
    });

    describe('showExternalPurchaseCustomLinkNoticeIOS', () => {
      it('should call native module with browser notice type', async () => {
        const mockResult = {continued: true};
        (
          ExpoIapModule.showExternalPurchaseCustomLinkNoticeIOS as jest.Mock
        ).mockResolvedValue(mockResult);

        const result = await showExternalPurchaseCustomLinkNoticeIOS('browser');

        expect(
          ExpoIapModule.showExternalPurchaseCustomLinkNoticeIOS,
        ).toHaveBeenCalledWith('browser');
        expect(result.continued).toBe(true);
      });

      it('should return continued false when user cancels', async () => {
        const mockResult = {continued: false};
        (
          ExpoIapModule.showExternalPurchaseCustomLinkNoticeIOS as jest.Mock
        ).mockResolvedValue(mockResult);

        const result = await showExternalPurchaseCustomLinkNoticeIOS('browser');

        expect(result.continued).toBe(false);
      });

      it('should return error when notice fails', async () => {
        const mockResult = {
          continued: false,
          error: 'Not eligible',
        };
        (
          ExpoIapModule.showExternalPurchaseCustomLinkNoticeIOS as jest.Mock
        ).mockResolvedValue(mockResult);

        const result = await showExternalPurchaseCustomLinkNoticeIOS('browser');

        expect(result.continued).toBe(false);
        expect(result.error).toBe('Not eligible');
      });

      it('should throw when noticeType missing', async () => {
        await expect(
          showExternalPurchaseCustomLinkNoticeIOS(undefined as any),
        ).rejects.toThrow(/requires a noticeType/);
      });

      it('should throw when noticeType is empty string', async () => {
        await expect(
          showExternalPurchaseCustomLinkNoticeIOS('' as any),
        ).rejects.toThrow(/requires a noticeType/);
      });

      it('should propagate errors from native module', async () => {
        const mockError = new Error('Notice display failed');
        (
          ExpoIapModule.showExternalPurchaseCustomLinkNoticeIOS as jest.Mock
        ).mockRejectedValue(mockError);

        await expect(
          showExternalPurchaseCustomLinkNoticeIOS('browser'),
        ).rejects.toThrow('Notice display failed');
      });
    });
  });
});
