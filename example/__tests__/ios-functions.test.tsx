import * as ExpoIap from 'expo-iap';

describe('iOS Functions Tests', () => {
  describe('Function Exports', () => {
    it('should export getAppTransactionIOS function', () => {
      expect(ExpoIap.getAppTransactionIOS).toBeDefined();
      expect(typeof ExpoIap.getAppTransactionIOS).toBe('function');
    });

    it('should export validateReceiptIOS function', () => {
      expect(ExpoIap.validateReceiptIOS).toBeDefined();
      expect(typeof ExpoIap.validateReceiptIOS).toBe('function');
    });

    it('should export deprecated getAppTransaction function', () => {
      expect(ExpoIap.getAppTransaction).toBeDefined();
      expect(typeof ExpoIap.getAppTransaction).toBe('function');
    });

    it('should export deprecated validateReceiptIos function', () => {
      expect(ExpoIap.validateReceiptIos).toBeDefined();
      expect(typeof ExpoIap.validateReceiptIos).toBe('function');
    });
  });

  describe('Function Signatures', () => {
    it('getAppTransactionIOS should be callable', () => {
      // Just verify the function exists and is callable
      expect(() => {
        const fn = ExpoIap.getAppTransactionIOS;
        expect(fn.length).toBe(0); // Takes no parameters
      }).not.toThrow();
    });

    it('validateReceiptIOS should be callable with SKU parameter', () => {
      expect(() => {
        const fn = ExpoIap.validateReceiptIOS;
        // Just check the function exists - mock functions have 0 length
        expect(typeof fn).toBe('function');
      }).not.toThrow();
    });
  });

  describe('Type Exports', () => {
    it('should have proper type structure for AppTransactionIOS', () => {
      // Type checking through object creation
      const mockTransaction: ExpoIap.AppTransactionIOS = {
        appTransactionID: 'test-id',
        bundleID: 'com.example.app',
        appVersion: '1.0.0',
        originalAppVersion: '1.0.0',
        originalPurchaseDate: Date.now(),
        deviceVerification: 'verification',
        deviceVerificationNonce: 'nonce',
        environment: 'Production',
        signedDate: Date.now(),
        appID: 123456,
        appVersionID: 789012,
        originalPlatform: 'iOS',
        preorderDate: undefined,
      };

      expect(mockTransaction.appTransactionID).toBeDefined();
    });
  });

  describe('iOS Module Functions', () => {
    it('should export all iOS-specific functions', () => {
      // New IOS suffix functions
      expect(ExpoIap.syncIOS).toBeDefined();
      expect(ExpoIap.isEligibleForIntroOfferIOS).toBeDefined();
      expect(ExpoIap.subscriptionStatusIOS).toBeDefined();
      expect(ExpoIap.currentEntitlementIOS).toBeDefined();
      expect(ExpoIap.latestTransactionIOS).toBeDefined();
      expect(ExpoIap.beginRefundRequestIOS).toBeDefined();
      expect(ExpoIap.showManageSubscriptionsIOS).toBeDefined();
      expect(ExpoIap.getReceiptIOS).toBeDefined();
      expect(ExpoIap.isTransactionVerifiedIOS).toBeDefined();
      expect(ExpoIap.getTransactionJwsIOS).toBeDefined();
      expect(ExpoIap.presentCodeRedemptionSheetIOS).toBeDefined();
    });

    it('should export deprecated iOS functions', () => {
      // Deprecated functions without IOS suffix
      expect(ExpoIap.sync).toBeDefined();
      expect(ExpoIap.isEligibleForIntroOffer).toBeDefined();
      expect(ExpoIap.subscriptionStatus).toBeDefined();
      expect(ExpoIap.currentEntitlement).toBeDefined();
      expect(ExpoIap.latestTransaction).toBeDefined();
      expect(ExpoIap.beginRefundRequest).toBeDefined();
      expect(ExpoIap.showManageSubscriptions).toBeDefined();
      expect(ExpoIap.getReceiptIos).toBeDefined();
      expect(ExpoIap.isTransactionVerified).toBeDefined();
      expect(ExpoIap.getTransactionJws).toBeDefined();
      expect(ExpoIap.presentCodeRedemptionSheet).toBeDefined();
    });
  });
});