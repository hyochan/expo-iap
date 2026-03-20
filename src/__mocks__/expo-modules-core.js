/* global jest */
const mockNativeModule = {
  ERROR_CODES: {},
  // iOS-specific methods with IOS suffix
  syncIOS: jest.fn(),
  isEligibleForIntroOfferIOS: jest.fn(),
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
  getPendingTransactionsIOS: jest.fn(),
  clearTransactionIOS: jest.fn(),
  // Common methods
  fetchProducts: jest.fn(),
  requestPurchase: jest.fn(),
  requestPurchaseOnPromotedProductIOS: jest.fn(),
  getAvailableItems: jest.fn(),
  getActiveSubscriptions: jest.fn(),
  hasActiveSubscriptions: jest.fn(),
  getStorefront: jest.fn(),
  finishTransaction: jest.fn(),
  verifyPurchase: jest.fn(),
  verifyPurchaseWithProvider: jest.fn(),
  initConnection: jest.fn(),
  endConnection: jest.fn(),
  // Android-specific methods
  acknowledgePurchaseAndroid: jest.fn(),
  consumeProductAndroid: jest.fn(),
  // Billing Programs API (8.2.0+)
  isBillingProgramAvailableAndroid: jest.fn(),
  launchExternalLinkAndroid: jest.fn(),
  createBillingProgramReportingDetailsAndroid: jest.fn(),
  addListener: jest.fn(),
  removeListeners: jest.fn(),
};

module.exports = {
  requireNativeModule: jest.fn(() => mockNativeModule),
  EventEmitter: jest.fn(() => ({
    addListener: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
  })),
};
