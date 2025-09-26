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

// Mock react-native modules that cause issues in test environment
// TouchableOpacity uses Animated API internally, so we mock it with Pressable

// Mock TouchableOpacity to avoid Animated API issues in tests
jest.mock(
  'react-native/Libraries/Components/Touchable/TouchableOpacity',
  () => {
    const React = require('react');
    const {Pressable} = require('react-native');

    const TouchableOpacity = React.forwardRef((props, ref) => {
      const {activeOpacity = 0.2, ...otherProps} = props;
      return (
        <Pressable
          ref={ref}
          style={({pressed}) => [
            otherProps.style,
            {opacity: pressed ? activeOpacity : 1},
          ]}
          {...otherProps}
        />
      );
    });

    TouchableOpacity.displayName = 'TouchableOpacity';

    return {TouchableOpacity, default: TouchableOpacity};
  },
);

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
