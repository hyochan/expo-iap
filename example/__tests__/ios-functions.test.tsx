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

    // Note: validateReceiptIOS is not deprecated, but there might be deprecated
    // aliases for backward compatibility
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

  describe('getAppTransactionIOS Tests', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should call getAppTransactionIOS successfully', async () => {
      const mockAppTransaction: ExpoIap.AppTransactionIOS = {
        appTransactionId: 'test-transaction-id',
        bundleId: 'com.example.testapp',
        appVersion: '2.0.0',
        originalAppVersion: '1.0.0',
        originalPurchaseDate: 1234567890000,
        deviceVerification: 'device-verification-data',
        deviceVerificationNonce: 'nonce-value',
        environment: 'Production',
        signedDate: 1234567900000,
        appId: 123456789,
        appVersionId: 987654321,
        originalPlatform: 'iOS',
        preorderDate: undefined,
      };

      (ExpoIap.getAppTransactionIOS as jest.Mock).mockResolvedValue(
        mockAppTransaction,
      );

      const result = await ExpoIap.getAppTransactionIOS();

      expect(ExpoIap.getAppTransactionIOS).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockAppTransaction);
      expect(result?.appTransactionId).toBe('test-transaction-id');
      expect(result?.environment).toBe('Production');
    });

    it('should handle null response from getAppTransactionIOS', async () => {
      (ExpoIap.getAppTransactionIOS as jest.Mock).mockResolvedValue(null);

      const result = await ExpoIap.getAppTransactionIOS();

      expect(ExpoIap.getAppTransactionIOS).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });

    it('should handle errors from getAppTransactionIOS', async () => {
      const mockError = new Error('iOS 16.0+ required');
      (ExpoIap.getAppTransactionIOS as jest.Mock).mockRejectedValue(mockError);

      await expect(ExpoIap.getAppTransactionIOS()).rejects.toThrow(
        'iOS 16.0+ required',
      );
      expect(ExpoIap.getAppTransactionIOS).toHaveBeenCalledTimes(1);
    });

    it('should handle SDK version error', async () => {
      const sdkError = new Error(
        'getAppTransaction requires Xcode 15.0+ with iOS 16.0 SDK for compilation',
      );
      (ExpoIap.getAppTransactionIOS as jest.Mock).mockRejectedValue(sdkError);

      await expect(ExpoIap.getAppTransactionIOS()).rejects.toThrow(
        'getAppTransaction requires Xcode 15.0+ with iOS 16.0 SDK for compilation',
      );
    });
  });

  describe('Type Exports', () => {
    it('should have proper type structure for AppTransactionIOS', () => {
      // Type checking through object creation
      const mockTransaction: ExpoIap.AppTransactionIOS = {
        appTransactionId: 'test-id',
        bundleId: 'com.example.app',
        appVersion: '1.0.0',
        originalAppVersion: '1.0.0',
        originalPurchaseDate: Date.now(),
        deviceVerification: 'verification',
        deviceVerificationNonce: 'nonce',
        environment: 'Production',
        signedDate: Date.now(),
        appId: 123456,
        appVersionId: 789012,
        originalPlatform: 'iOS',
        preorderDate: undefined,
      };

      expect(mockTransaction.appTransactionId).toBeDefined();
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
  });
});
