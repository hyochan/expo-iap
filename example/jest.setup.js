/* eslint-env jest */

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

// Mock react-native Animated API to avoid TouchableOpacity animation issues
// Create a manual mock for Animated to prevent TouchableOpacity errors
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');

  // Override Animated.timing to return a simple mock
  RN.Animated.timing = () => ({
    start: (callback) => callback && callback({finished: true}),
    stop: jest.fn(),
    reset: jest.fn(),
  });

  return RN;
});

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
  const mockRequestPurchase = jest.fn();

  return {
    // Core functions
    initConnection: jest.fn(),
    endConnection: jest.fn(),
    fetchProducts: mockFetchProducts,

    requestPurchase: mockRequestPurchase,
    finishTransaction: mockFinishTransaction,

    getAvailablePurchases: mockGetAvailablePurchases,

    // iOS functions with IOS suffix
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

    // Cross-platform storefront helper
    getStorefront: jest.fn(),

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

      requestPurchase: mockRequestPurchase,
      getAvailablePurchases: mockGetAvailablePurchases,
      finishTransaction: mockFinishTransaction,
      getActiveSubscriptions: mockGetActiveSubscriptions,
    })),

    // Enums
    OpenIapEvent: {
      PurchaseUpdated: 'purchase-updated',
      PurchaseError: 'purchase-error',
    },
    ErrorCode: {
      DeveloperError: 'DEVELOPER_ERROR',
      ItemUnavailable: 'ITEM_UNAVAILABLE',
      NetworkError: 'NETWORK_ERROR',
      ReceiptFailed: 'RECEIPT_FAILED',
      ReceiptFinishedFailed: 'RECEIPT_FINISHED_FAILED',
      UserCancelled: 'USER_CANCELLED',
      NotPrepared: 'NOT_PREPARED',
      Unknown: 'UNKNOWN',
    },

    // Type guards
    isProductIOS: jest.fn(),
    isProductAndroid: jest.fn(),

    // Mock types
    AppTransaction: {},
  };
});
