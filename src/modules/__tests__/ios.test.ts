// Mock the native module first
jest.mock('../../ExpoIapModule');

import ExpoIapModule from '../../ExpoIapModule';
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
  buyPromotedProductIOS,
  deepLinkToSubscriptionsIOS,
  isProductIOS,
} from '../ios';

// Mock React Native's Linking module
jest.mock('react-native', () => ({
  Linking: {
    openURL: jest.fn(),
  },
}));

describe('iOS Module Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isEligibleForIntroOfferIOS', () => {
    it('should call native module with correct groupId parameter', async () => {
      const mockGroupId = 'test-subscription-group';
      const mockResult = true;
      
      (ExpoIapModule.isEligibleForIntroOffer as jest.Mock).mockResolvedValue(mockResult);
      
      const result = await isEligibleForIntroOfferIOS(mockGroupId);
      
      expect(ExpoIapModule.isEligibleForIntroOffer).toHaveBeenCalledWith(mockGroupId);
      expect(ExpoIapModule.isEligibleForIntroOffer).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockResult);
    });

    it('should handle different groupId values', async () => {
      const testCases = [
        'premium-group',
        'basic-group',
        'enterprise-group-123',
        'com.example.subscriptions.monthly'
      ];

      for (const groupId of testCases) {
        (ExpoIapModule.isEligibleForIntroOffer as jest.Mock).mockResolvedValue(true);
        
        await isEligibleForIntroOfferIOS(groupId);
        
        expect(ExpoIapModule.isEligibleForIntroOffer).toHaveBeenLastCalledWith(groupId);
      }
    });

    it('should propagate errors from native module', async () => {
      const mockError = new Error('Native module error');
      (ExpoIapModule.isEligibleForIntroOffer as jest.Mock).mockRejectedValue(mockError);
      
      await expect(isEligibleForIntroOfferIOS('test-group')).rejects.toThrow('Native module error');
    });
  });

  describe('syncIOS', () => {
    it('should call native sync function', async () => {
      (ExpoIapModule.sync as jest.Mock).mockResolvedValue(null);
      
      const result = await syncIOS();
      
      expect(ExpoIapModule.sync).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });
  });

  describe('subscriptionStatusIOS', () => {
    it('should call native module with SKU parameter', async () => {
      const mockSku = 'com.example.subscription';
      const mockStatus = [{
        state: 'subscribed',
        renewalInfo: {
          willAutoRenew: true,
          autoRenewPreference: 'com.example.subscription.premium'
        }
      }];
      
      (ExpoIapModule.subscriptionStatus as jest.Mock).mockResolvedValue(mockStatus);
      
      const result = await subscriptionStatusIOS(mockSku);
      
      expect(ExpoIapModule.subscriptionStatus).toHaveBeenCalledWith(mockSku);
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
      
      (ExpoIapModule.getAppTransaction as jest.Mock).mockResolvedValue(mockTransaction);
      
      const result = await getAppTransactionIOS();
      
      expect(ExpoIapModule.getAppTransaction).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockTransaction);
      expect(result?.appTransactionId).toBe('test-transaction-123');
      expect(result?.bundleId).toBe('com.example.app');
      expect(result?.appId).toBe(123456);
      expect(result?.appVersionId).toBe(789012);
    });

    it('should handle null response', async () => {
      (ExpoIapModule.getAppTransaction as jest.Mock).mockResolvedValue(null);
      
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
        }
      };
      
      (ExpoIapModule.validateReceiptIOS as jest.Mock).mockResolvedValue(mockValidationResult);
      
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


  describe('Deep Link Functions', () => {
    it('should open subscriptions management URL', async () => {
      const { Linking } = require('react-native');
      
      await deepLinkToSubscriptionsIOS();
      
      expect(Linking.openURL).toHaveBeenCalledWith('https://apps.apple.com/account/subscriptions');
    });
  });

  describe('Other iOS Functions', () => {
    it('should call currentEntitlementIOS with SKU', async () => {
      const mockSku = 'com.example.entitlement';
      const mockEntitlement = { id: mockSku, isActive: true };
      
      (ExpoIapModule.currentEntitlement as jest.Mock).mockResolvedValue(mockEntitlement);
      
      const result = await currentEntitlementIOS(mockSku);
      
      expect(ExpoIapModule.currentEntitlement).toHaveBeenCalledWith(mockSku);
      expect(result).toEqual(mockEntitlement);
    });

    it('should call latestTransactionIOS with SKU', async () => {
      const mockSku = 'com.example.product';
      const mockTransaction = { id: mockSku, transactionId: '123' };
      
      (ExpoIapModule.latestTransaction as jest.Mock).mockResolvedValue(mockTransaction);
      
      const result = await latestTransactionIOS(mockSku);
      
      expect(ExpoIapModule.latestTransaction).toHaveBeenCalledWith(mockSku);
      expect(result).toEqual(mockTransaction);
    });

    it('should call beginRefundRequestIOS with SKU', async () => {
      const mockSku = 'com.example.product';
      const mockStatus = 'success';
      
      (ExpoIapModule.beginRefundRequest as jest.Mock).mockResolvedValue(mockStatus);
      
      const result = await beginRefundRequestIOS(mockSku);
      
      expect(ExpoIapModule.beginRefundRequest).toHaveBeenCalledWith(mockSku);
      expect(result).toBe(mockStatus);
    });

    it('should call showManageSubscriptionsIOS', async () => {
      (ExpoIapModule.showManageSubscriptions as jest.Mock).mockResolvedValue(null);
      
      const result = await showManageSubscriptionsIOS();
      
      expect(ExpoIapModule.showManageSubscriptions).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });

    it('should call getReceiptIOS', async () => {
      const mockReceipt = 'base64-receipt-data';
      
      (ExpoIapModule.getReceiptData as jest.Mock).mockResolvedValue(mockReceipt);
      
      const result = await getReceiptIOS();
      
      expect(ExpoIapModule.getReceiptData).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockReceipt);
    });

    it('should call isTransactionVerifiedIOS with SKU', async () => {
      const mockSku = 'com.example.product';
      
      (ExpoIapModule.isTransactionVerified as jest.Mock).mockResolvedValue(true);
      
      const result = await isTransactionVerifiedIOS(mockSku);
      
      expect(ExpoIapModule.isTransactionVerified).toHaveBeenCalledWith(mockSku);
      expect(result).toBe(true);
    });

    it('should call getTransactionJwsIOS with SKU', async () => {
      const mockSku = 'com.example.product';
      const mockJws = 'jws-token-string';
      
      (ExpoIapModule.getTransactionJws as jest.Mock).mockResolvedValue(mockJws);
      
      const result = await getTransactionJwsIOS(mockSku);
      
      expect(ExpoIapModule.getTransactionJws).toHaveBeenCalledWith(mockSku);
      expect(result).toBe(mockJws);
    });

    it('should call presentCodeRedemptionSheetIOS', async () => {
      (ExpoIapModule.presentCodeRedemptionSheet as jest.Mock).mockResolvedValue(true);
      
      const result = await presentCodeRedemptionSheetIOS();
      
      expect(ExpoIapModule.presentCodeRedemptionSheet).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });

    it('should call getPromotedProductIOS', async () => {
      const mockProduct = { id: 'promoted-product', price: '$4.99' };
      
      (ExpoIapModule.getPromotedProduct as jest.Mock).mockResolvedValue(mockProduct);
      
      const result = await getPromotedProductIOS();
      
      expect(ExpoIapModule.getPromotedProduct).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockProduct);
    });

    it('should call buyPromotedProductIOS', async () => {
      (ExpoIapModule.buyPromotedProduct as jest.Mock).mockResolvedValue(undefined);
      
      await buyPromotedProductIOS();
      
      expect(ExpoIapModule.buyPromotedProduct).toHaveBeenCalledTimes(1);
    });
  });
});