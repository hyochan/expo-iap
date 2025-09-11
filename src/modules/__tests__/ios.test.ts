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
  isEligibleForIntroOfferIOS,
  syncIOS,
  subscriptionStatusIOS,
  currentEntitlementIOS,
  latestTransactionIOS,
  beginRefundRequestIOS,
  showManageSubscriptionsIOS,
  getReceiptIOS,
  isTransactionVerifiedIOS,
  getTransactionJwsIOS,
  validateReceiptIOS,
  presentCodeRedemptionSheetIOS,
  getAppTransactionIOS,
  getPromotedProductIOS,
  requestPurchaseOnPromotedProductIOS,
  deepLinkToSubscriptionsIOS,
  isProductIOS,
  // Deprecated wrappers
  sync,
  isEligibleForIntroOffer,
  subscriptionStatus,
  currentEntitlement,
  latestTransaction,
  beginRefundRequest,
  showManageSubscriptions,
  isTransactionVerified,
  getTransactionJws,
  presentCodeRedemptionSheet,
  getAppTransaction,
  // Listener wrapper
  transactionUpdatedIOS,
} from '../ios';
import * as indexMod from '../../index';
/* eslint-enable import/first */

describe('iOS Module Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('transactionUpdatedIOS wrapper', () => {
    it('maps Purchase to TransactionEvent and forwards to listener', () => {
      const purchase: any = {
        id: 'tid',
        productId: 'sku',
        transactionId: 'tid',
        transactionDate: Date.now(),
        platform: 'ios',
        transactionReceipt: 'base64',
      };

      const userListener = jest.fn();
      const puSpy = jest
        .spyOn(indexMod, 'purchaseUpdatedListener')
        .mockImplementation((cb: any) => {
          cb(purchase);
          return {remove: jest.fn()} as any;
        });

      const sub = transactionUpdatedIOS(userListener);
      expect(typeof sub.remove).toBe('function');
      expect(userListener).toHaveBeenCalledWith({transaction: purchase});
      puSpy.mockRestore();
    });
  });

  describe('isEligibleForIntroOfferIOS', () => {
    it('should call native module with correct groupId parameter', async () => {
      const mockGroupId = 'test-subscription-group';
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

      for (const groupId of testCases) {
        (
          ExpoIapModule.isEligibleForIntroOfferIOS as jest.Mock
        ).mockResolvedValue(true);

        await isEligibleForIntroOfferIOS(groupId);

        expect(
          ExpoIapModule.isEligibleForIntroOfferIOS,
        ).toHaveBeenLastCalledWith(groupId);
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
  });

  describe('syncIOS', () => {
    it('should call native sync function', async () => {
      (ExpoIapModule.syncIOS as jest.Mock).mockResolvedValue(null);

      const result = await syncIOS();

      expect(ExpoIapModule.syncIOS).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
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

      const result = await validateReceiptIOS(mockSku);

      expect(ExpoIapModule.validateReceiptIOS).toHaveBeenCalledWith(mockSku);
      expect(result.isValid).toBe(true);
      expect(result.receiptData).toBeDefined();
      expect(result.jwsRepresentation).toBeDefined();
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

  describe('Deprecated wrappers delegate and warn', () => {
    let warnSpy: jest.SpyInstance;
    beforeEach(() => {
      warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
      warnSpy.mockRestore();
    });

    it('sync -> syncIOS', async () => {
      (ExpoIapModule.syncIOS as jest.Mock).mockResolvedValue(null);
      const res = await sync();
      expect(warnSpy).toHaveBeenCalled();
      expect(ExpoIapModule.syncIOS).toHaveBeenCalled();
      expect(res).toBeNull();
    });

    it('isEligibleForIntroOffer -> isEligibleForIntroOfferIOS', async () => {
      (ExpoIapModule.isEligibleForIntroOfferIOS as jest.Mock).mockResolvedValue(
        true,
      );
      const ok = await isEligibleForIntroOffer('group');
      expect(warnSpy).toHaveBeenCalled();
      expect(ExpoIapModule.isEligibleForIntroOfferIOS).toHaveBeenCalledWith(
        'group',
      );
      expect(ok).toBe(true);
    });

    it('subscriptionStatus -> subscriptionStatusIOS', async () => {
      const status = [{state: 'subscribed'}] as any;
      (ExpoIapModule.subscriptionStatusIOS as jest.Mock).mockResolvedValue(
        status,
      );
      const res = await subscriptionStatus('sku');
      expect(warnSpy).toHaveBeenCalled();
      expect(ExpoIapModule.subscriptionStatusIOS).toHaveBeenCalledWith('sku');
      expect(res).toBe(status);
    });

    it('currentEntitlement -> currentEntitlementIOS', async () => {
      const ent = {id: 'sku'} as any;
      (ExpoIapModule.currentEntitlementIOS as jest.Mock).mockResolvedValue(ent);
      const res = await currentEntitlement('sku');
      expect(warnSpy).toHaveBeenCalled();
      expect(ExpoIapModule.currentEntitlementIOS).toHaveBeenCalledWith('sku');
      expect(res).toBe(ent);
    });

    it('latestTransaction -> latestTransactionIOS', async () => {
      const tx = {id: 'sku', transactionId: 'tid'} as any;
      (ExpoIapModule.latestTransactionIOS as jest.Mock).mockResolvedValue(tx);
      const res = await latestTransaction('sku');
      expect(warnSpy).toHaveBeenCalled();
      expect(ExpoIapModule.latestTransactionIOS).toHaveBeenCalledWith('sku');
      expect(res).toBe(tx);
    });

    it('beginRefundRequest -> beginRefundRequestIOS', async () => {
      (ExpoIapModule.beginRefundRequestIOS as jest.Mock).mockResolvedValue(
        'success',
      );
      const res = await beginRefundRequest('sku');
      expect(warnSpy).toHaveBeenCalled();
      expect(ExpoIapModule.beginRefundRequestIOS).toHaveBeenCalledWith('sku');
      expect(res).toBe('success');
    });

    it('showManageSubscriptions -> showManageSubscriptionsIOS', async () => {
      (ExpoIapModule.showManageSubscriptionsIOS as jest.Mock).mockResolvedValue(
        [],
      );
      const res = await showManageSubscriptions();
      expect(warnSpy).toHaveBeenCalled();
      expect(ExpoIapModule.showManageSubscriptionsIOS).toHaveBeenCalled();
      expect(res).toEqual([]);
    });

    it('isTransactionVerified -> isTransactionVerifiedIOS', async () => {
      (ExpoIapModule.isTransactionVerifiedIOS as jest.Mock).mockResolvedValue(
        true,
      );
      const res = await isTransactionVerified('sku');
      expect(warnSpy).toHaveBeenCalled();
      expect(ExpoIapModule.isTransactionVerifiedIOS).toHaveBeenCalledWith(
        'sku',
      );
      expect(res).toBe(true);
    });

    it('getTransactionJws -> getTransactionJwsIOS', async () => {
      (ExpoIapModule.getTransactionJwsIOS as jest.Mock).mockResolvedValue(
        'jws',
      );
      const res = await getTransactionJws('sku');
      expect(warnSpy).toHaveBeenCalled();
      expect(ExpoIapModule.getTransactionJwsIOS).toHaveBeenCalledWith('sku');
      expect(res).toBe('jws');
    });

    it('presentCodeRedemptionSheet -> presentCodeRedemptionSheetIOS', async () => {
      (
        ExpoIapModule.presentCodeRedemptionSheetIOS as jest.Mock
      ).mockResolvedValue(true);
      const res = await presentCodeRedemptionSheet();
      expect(warnSpy).toHaveBeenCalled();
      expect(ExpoIapModule.presentCodeRedemptionSheetIOS).toHaveBeenCalled();
      expect(res).toBe(true);
    });

    it('getAppTransaction -> getAppTransactionIOS', async () => {
      (ExpoIapModule.getAppTransactionIOS as jest.Mock).mockResolvedValue(null);
      const res = await getAppTransaction();
      expect(warnSpy).toHaveBeenCalled();
      expect(ExpoIapModule.getAppTransactionIOS).toHaveBeenCalled();
      expect(res).toBeNull();
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
      const mockEntitlement = {id: mockSku, isActive: true};

      (ExpoIapModule.currentEntitlementIOS as jest.Mock).mockResolvedValue(
        mockEntitlement,
      );

      const result = await currentEntitlementIOS(mockSku);

      expect(ExpoIapModule.currentEntitlementIOS).toHaveBeenCalledWith(mockSku);
      expect(result).toEqual(mockEntitlement);
    });

    it('should call latestTransactionIOS with SKU', async () => {
      const mockSku = 'com.example.product';
      const mockTransaction = {id: mockSku, transactionId: '123'};

      (ExpoIapModule.latestTransactionIOS as jest.Mock).mockResolvedValue(
        mockTransaction,
      );

      const result = await latestTransactionIOS(mockSku);

      expect(ExpoIapModule.latestTransactionIOS).toHaveBeenCalledWith(mockSku);
      expect(result).toEqual(mockTransaction);
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

    it('should call showManageSubscriptionsIOS', async () => {
      const mockPurchases: any[] = [];
      (ExpoIapModule.showManageSubscriptionsIOS as jest.Mock).mockResolvedValue(
        mockPurchases,
      );

      const result = await showManageSubscriptionsIOS();

      expect(ExpoIapModule.showManageSubscriptionsIOS).toHaveBeenCalledTimes(1);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(mockPurchases);
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

    it('should call requestPurchaseOnPromotedProductIOS', async () => {
      (
        ExpoIapModule.requestPurchaseOnPromotedProductIOS as jest.Mock
      ).mockResolvedValue(undefined);

      await requestPurchaseOnPromotedProductIOS();

      expect(
        ExpoIapModule.requestPurchaseOnPromotedProductIOS,
      ).toHaveBeenCalledTimes(1);
    });
  });
});
