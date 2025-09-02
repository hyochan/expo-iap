/* global jest */
module.exports = {
  requireNativeModule: jest.fn(() => ({
    // iOS-specific methods with IOS suffix
    syncIOS: jest.fn(),
    isEligibleForIntroOfferIOS: jest.fn(),
    subscriptionStatusIOS: jest.fn(),
    currentEntitlementIOS: jest.fn(),
    latestTransactionIOS: jest.fn(),
    beginRefundRequestIOS: jest.fn(),
    showManageSubscriptionsIOS: jest.fn(),
    getReceiptDataIOS: jest.fn(),
    isTransactionVerifiedIOS: jest.fn(),
    getTransactionJwsIOS: jest.fn(),
    validateReceiptIOS: jest.fn(),
    presentCodeRedemptionSheetIOS: jest.fn(),
    getAppTransactionIOS: jest.fn(),
    getPromotedProductIOS: jest.fn(),
    getPendingTransactionsIOS: jest.fn(),
    clearTransactionIOS: jest.fn(),
    // Common methods
    requestProducts: jest.fn(),
    requestPurchase: jest.fn(),
    requestPurchaseOnPromotedProductIOS: jest.fn(),
    // Android-specific methods
    acknowledgePurchaseAndroid: jest.fn(),
    consumeProductAndroid: jest.fn(),
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  })),
  EventEmitter: jest.fn(() => ({
    addListener: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
  })),
};