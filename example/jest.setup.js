// Jest setup for example app
import '@testing-library/jest-native/extend-expect';

// Mock expo modules
jest.mock('expo-font', () => ({
  loadAsync: jest.fn(),
  isLoaded: jest.fn(() => true),
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}));

// Mock react-native modules that cause issues in test environment
// Skip mocking NativeAnimatedHelper as it's not available in newer React Native versions
// jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock expo-modules-core
jest.mock('expo-modules-core', () => ({
  NativeModulesProxy: {},
  EventEmitter: jest.fn(),
}));

// Mock the expo-iap module
jest.mock('expo-iap', () => {
  // Create stable mock functions inside the factory
  const mockFetchProducts = jest.fn();
  const mockGetAvailablePurchases = jest.fn();
  const mockFinishTransaction = jest.fn();
  const mockGetActiveSubscriptions = jest.fn();
  const mockGetProducts = jest.fn();
  const mockGetSubscriptions = jest.fn();
  const mockRequestPurchase = jest.fn();
  const mockGetPurchaseHistories = jest.fn();

  return {
    // Core functions
    initConnection: jest.fn(),
    endConnection: jest.fn(),
    getProducts: mockGetProducts,
    getSubscriptions: mockGetSubscriptions,
    fetchProducts: mockFetchProducts,
    requestProducts: jest.fn(),
    requestPurchase: mockRequestPurchase,
    finishTransaction: mockFinishTransaction,
    getPurchaseHistories: mockGetPurchaseHistories,
    getAvailablePurchases: mockGetAvailablePurchases,

    // iOS functions with IOS suffix
    getStorefrontIOS: jest.fn(),
    syncIOS: jest.fn(),
    isEligibleForIntroOfferIOS: jest.fn(),
    subscriptionStatusIOS: jest.fn(),
    currentEntitlementIOS: jest.fn(),
    latestTransactionIOS: jest.fn(),
    beginRefundRequestIOS: jest.fn(),
    showManageSubscriptionsIOS: jest.fn(),
    getReceiptIOS: jest.fn(),
    isTransactionVerifiedIOS: jest.fn(),
    getTransactionJwsIOS: jest.fn(),
    presentCodeRedemptionSheetIOS: jest.fn(),
    getAppTransactionIOS: jest.fn(),
    validateReceiptIOS: jest.fn(),

    // Deprecated iOS functions
    getStorefront: jest.fn(),
    sync: jest.fn(),
    isEligibleForIntroOffer: jest.fn(),
    subscriptionStatus: jest.fn(),
    currentEntitlement: jest.fn(),
    latestTransaction: jest.fn(),
    beginRefundRequest: jest.fn(),
    showManageSubscriptions: jest.fn(),
    getReceiptIOS: jest.fn(),
    isTransactionVerified: jest.fn(),
    getTransactionJws: jest.fn(),
    presentCodeRedemptionSheet: jest.fn(),
    getAppTransaction: jest.fn(),
    validateReceiptIOS: jest.fn(),

    // Android functions
    deepLinkToSubscriptionsAndroid: jest.fn(),
    validateReceiptAndroid: jest.fn(),
    acknowledgePurchaseAndroid: jest.fn(),

    // Event listeners
    purchaseUpdatedListener: jest.fn(),
    purchaseErrorListener: jest.fn(),

    // Hook
    useIAP: jest.fn(() => ({
      connected: false,
      products: [],
      subscriptions: [],
      availablePurchases: [],
      activeSubscriptions: [],
      currentPurchase: null,
      currentPurchaseError: null,
      fetchProducts: mockFetchProducts,
      getProducts: mockGetProducts,
      getSubscriptions: mockGetSubscriptions,
      requestPurchase: mockRequestPurchase,
      getAvailablePurchases: mockGetAvailablePurchases,
      getPurchaseHistories: mockGetPurchaseHistories,
      finishTransaction: mockFinishTransaction,
      getActiveSubscriptions: mockGetActiveSubscriptions,
    })),

    // Enums
    OpenIapEvent: {
      PurchaseUpdated: 'purchase-updated',
      PurchaseError: 'purchase-error',
    },
    ErrorCode: {
      E_DEVELOPER_ERROR: 'E_DEVELOPER_ERROR',
      E_ITEM_UNAVAILABLE: 'E_ITEM_UNAVAILABLE',
      E_NETWORK_ERROR: 'E_NETWORK_ERROR',
      E_RECEIPT_FAILED: 'E_RECEIPT_FAILED',
      E_RECEIPT_FINISHED_FAILED: 'E_RECEIPT_FINISHED_FAILED',
      E_USER_CANCELLED: 'E_USER_CANCELLED',
      E_NOT_PREPARED: 'E_NOT_PREPARED',
      E_UNKNOWN: 'E_UNKNOWN',
    },

    // Type guards
    isProductIOS: jest.fn(),
    isProductAndroid: jest.fn(),

    // Mock types
    AppTransactionIOS: {},
  };
});
