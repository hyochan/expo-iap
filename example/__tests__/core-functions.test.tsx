import * as ExpoIap from 'expo-iap';

describe('Core Functions Tests', () => {
  describe('Core Module Exports', () => {
    it('should export initConnection function', () => {
      expect(ExpoIap.initConnection).toBeDefined();
      expect(typeof ExpoIap.initConnection).toBe('function');
    });

    it('should export endConnection function', () => {
      expect(ExpoIap.endConnection).toBeDefined();
      expect(typeof ExpoIap.endConnection).toBe('function');
    });

    it('should export requestProducts function', () => {
      expect(ExpoIap.requestProducts).toBeDefined();
      expect(typeof ExpoIap.requestProducts).toBe('function');
    });

    it('should export deprecated getProducts function', () => {
      expect(ExpoIap.getProducts).toBeDefined();
      expect(typeof ExpoIap.getProducts).toBe('function');
    });

    it('should export deprecated getSubscriptions function', () => {
      expect(ExpoIap.getSubscriptions).toBeDefined();
      expect(typeof ExpoIap.getSubscriptions).toBe('function');
    });

    it('should export requestPurchase function', () => {
      expect(ExpoIap.requestPurchase).toBeDefined();
      expect(typeof ExpoIap.requestPurchase).toBe('function');
    });

    it('should export finishTransaction function', () => {
      expect(ExpoIap.finishTransaction).toBeDefined();
      expect(typeof ExpoIap.finishTransaction).toBe('function');
    });

    it('should export deprecated getPurchaseHistories function', () => {
      expect(ExpoIap.getPurchaseHistories).toBeDefined();
      expect(typeof ExpoIap.getPurchaseHistories).toBe('function');
    });

    it('should export getAvailablePurchases function', () => {
      expect(ExpoIap.getAvailablePurchases).toBeDefined();
      expect(typeof ExpoIap.getAvailablePurchases).toBe('function');
    });

    it('should export getStorefrontIOS function', () => {
      expect(ExpoIap.getStorefrontIOS).toBeDefined();
      expect(typeof ExpoIap.getStorefrontIOS).toBe('function');
    });

    it('should export deprecated getStorefront function', () => {
      expect(ExpoIap.getStorefront).toBeDefined();
      expect(typeof ExpoIap.getStorefront).toBe('function');
    });
  });

  describe('Event Listeners', () => {
    it('should export purchaseUpdatedListener', () => {
      expect(ExpoIap.purchaseUpdatedListener).toBeDefined();
      expect(typeof ExpoIap.purchaseUpdatedListener).toBe('function');
    });

    it('should export purchaseErrorListener', () => {
      expect(ExpoIap.purchaseErrorListener).toBeDefined();
      expect(typeof ExpoIap.purchaseErrorListener).toBe('function');
    });
  });

  describe('Hook', () => {
    it('should export useIAP hook', () => {
      expect(ExpoIap.useIAP).toBeDefined();
      expect(typeof ExpoIap.useIAP).toBe('function');
    });
  });

  describe('Android Functions', () => {
    it('should export deepLinkToSubscriptionsAndroid', () => {
      expect(ExpoIap.deepLinkToSubscriptionsAndroid).toBeDefined();
      expect(typeof ExpoIap.deepLinkToSubscriptionsAndroid).toBe('function');
    });

    it('should export validateReceiptAndroid', () => {
      expect(ExpoIap.validateReceiptAndroid).toBeDefined();
      expect(typeof ExpoIap.validateReceiptAndroid).toBe('function');
    });

    it('should export acknowledgePurchaseAndroid', () => {
      expect(ExpoIap.acknowledgePurchaseAndroid).toBeDefined();
      expect(typeof ExpoIap.acknowledgePurchaseAndroid).toBe('function');
    });
  });

  describe('Enums and Constants', () => {
    it('should export IapEvent enum', () => {
      expect(ExpoIap.IapEvent).toBeDefined();
      expect(ExpoIap.IapEvent.PurchaseUpdated).toBe('purchase-updated');
      expect(ExpoIap.IapEvent.PurchaseError).toBe('purchase-error');
    });

    it('should export ErrorCode enum', () => {
      expect(ExpoIap.ErrorCode).toBeDefined();
      expect(typeof ExpoIap.ErrorCode).toBe('object');
    });
  });

  describe('Type Guards', () => {
    it('should export isProductIOS function', () => {
      expect(ExpoIap.isProductIOS).toBeDefined();
      expect(typeof ExpoIap.isProductIOS).toBe('function');
    });

    it('should export isProductAndroid function', () => {
      expect(ExpoIap.isProductAndroid).toBeDefined();
      expect(typeof ExpoIap.isProductAndroid).toBe('function');
    });
  });
});
