import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, Platform } from 'react-native';
import PurchaseFlow from '../purchase-flow';
import { useIAP } from '../../../src';
import type { Product, ProductPurchase, PurchaseError } from '../../../src/ExpoIap.types';

// Mock the useIAP hook
jest.mock('../../../src', () => ({
  useIAP: jest.fn(),
  requestPurchase: jest.fn(),
}));

// Mock React Native modules
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: 'ios',
  },
}));

describe('PurchaseFlow Component', () => {
  const mockProducts: Product[] = [
    {
      id: 'com.example.premium',
      title: 'Premium Feature',
      description: 'Unlock premium features',
      price: '4.99',
      priceString: '$4.99',
      displayPrice: '$4.99',
      currencyCode: 'USD',
      currencySymbol: '$',
      platform: 'ios',
    },
    {
      id: 'com.example.coins_100',
      title: '100 Coins',
      description: 'Get 100 coins',
      price: '0.99',
      priceString: '$0.99',
      displayPrice: '$0.99',
      currencyCode: 'USD',
      currencySymbol: '$',
      platform: 'ios',
    },
    {
      id: 'com.example.remove_ads',
      title: 'Remove Ads',
      description: 'Remove all advertisements',
      price: '2.99',
      priceString: '$2.99',
      displayPrice: '$2.99',
      currencyCode: 'USD',
      currencySymbol: '$',
      platform: 'ios',
    },
  ];

  const mockGetProducts = jest.fn();
  const mockRequestPurchase = jest.fn();

  const defaultHookReturn = {
    connected: true,
    products: mockProducts,
    subscriptions: [],
    purchaseHistories: [],
    availablePurchases: [],
    currentPurchase: undefined,
    currentPurchaseError: undefined,
    getProducts: mockGetProducts,
    getSubscriptions: jest.fn(),
    getAvailablePurchases: jest.fn(),
    getPurchaseHistories: jest.fn(),
    requestPurchase: mockRequestPurchase,
    finishTransaction: jest.fn(),
    validateReceipt: jest.fn(),
    clearCurrentPurchase: jest.fn(),
    clearCurrentPurchaseError: jest.fn(),
    restorePurchases: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useIAP as jest.Mock).mockReturnValue(defaultHookReturn);
  });

  describe('Component Rendering', () => {
    it('should render the component with initial state', () => {
      const { getByText } = render(<PurchaseFlow />);

      expect(getByText('In-App Purchase Flow')).toBeTruthy();
      expect(getByText('TypeScript-first approach for products')).toBeTruthy();
      expect(getByText('Store: ✅ Connected')).toBeTruthy();
      expect(getByText('Platform: 🍎 iOS')).toBeTruthy();
    });

    it('should show disconnected state when not connected', () => {
      (useIAP as jest.Mock).mockReturnValue({
        ...defaultHookReturn,
        connected: false,
      });

      const { getByText } = render(<PurchaseFlow />);

      expect(getByText('Store: ❌ Disconnected')).toBeTruthy();
      expect(getByText('Connecting to store...')).toBeTruthy();
    });

    it('should show Android platform indicator', () => {
      (Platform as any).OS = 'android';
      
      const { getByText } = render(<PurchaseFlow />);

      expect(getByText('Platform: 🤖 Android')).toBeTruthy();
    });
  });

  describe('Product Display', () => {
    it('should display all products when connected', () => {
      const { getByText } = render(<PurchaseFlow />);

      mockProducts.forEach(product => {
        expect(getByText(product.title)).toBeTruthy();
        expect(getByText(product.description)).toBeTruthy();
        expect(getByText(product.displayPrice)).toBeTruthy();
      });
    });

    it('should show no products message with retry button', () => {
      (useIAP as jest.Mock).mockReturnValue({
        ...defaultHookReturn,
        products: [],
      });

      const { getByText } = render(<PurchaseFlow />);

      expect(getByText(/No products found/)).toBeTruthy();
      expect(getByText('Retry')).toBeTruthy();
    });

    it('should handle retry button click', () => {
      (useIAP as jest.Mock).mockReturnValue({
        ...defaultHookReturn,
        products: [],
      });

      const { getByText } = render(<PurchaseFlow />);
      const retryButton = getByText('Retry');

      fireEvent.press(retryButton);

      expect(mockGetProducts).toHaveBeenCalledWith([
        'com.example.premium',
        'com.example.coins_100',
        'com.example.remove_ads',
      ]);
    });
  });

  describe('Purchase Handling', () => {
    it('should initiate purchase when purchase button is pressed', async () => {
      const { getAllByText } = render(<PurchaseFlow />);
      const purchaseButtons = getAllByText('Purchase');

      fireEvent.press(purchaseButtons[0]);

      await waitFor(() => {
        expect(mockRequestPurchase).toHaveBeenCalledWith({
          request: {
            sku: 'com.example.premium',
            quantity: 1,
          },
          type: 'inapp',
        });
      });
    });

    it('should handle Android purchase request format', async () => {
      (Platform as any).OS = 'android';
      
      const { getAllByText } = render(<PurchaseFlow />);
      const purchaseButtons = getAllByText('Purchase');

      fireEvent.press(purchaseButtons[1]);

      await waitFor(() => {
        expect(mockRequestPurchase).toHaveBeenCalledWith({
          request: {
            skus: ['com.example.coins_100'],
          },
          type: 'inapp',
        });
      });
    });

    it('should disable purchase buttons while processing', async () => {
      const { getAllByText, getByText } = render(<PurchaseFlow />);
      const purchaseButtons = getAllByText('Purchase');

      fireEvent.press(purchaseButtons[0]);

      await waitFor(() => {
        expect(getByText('Processing purchase...')).toBeTruthy();
        expect(getByText('Processing...')).toBeTruthy();
      });
    });

    it('should disable purchase buttons when not connected', () => {
      (useIAP as jest.Mock).mockReturnValue({
        ...defaultHookReturn,
        connected: false,
      });

      const { queryAllByText } = render(<PurchaseFlow />);
      const purchaseButtons = queryAllByText('Purchase');

      expect(purchaseButtons.length).toBe(0); // No purchase buttons when not connected
    });
  });

  describe('Purchase Success Handling', () => {
    it('should handle successful purchase callback', async () => {
      let onPurchaseSuccess: ((purchase: ProductPurchase) => void) | undefined;

      (useIAP as jest.Mock).mockImplementation((options) => {
        onPurchaseSuccess = options?.onPurchaseSuccess;
        return defaultHookReturn;
      });

      const { getByText, queryByText } = render(<PurchaseFlow />);

      const mockPurchase: ProductPurchase = {
        id: 'com.example.premium',
        transactionId: 'trans123',
        transactionDate: Date.now(),
        transactionReceipt: 'receipt_data_here_very_long_string_that_should_be_truncated',
        platform: 'ios',
      };

      act(() => {
        onPurchaseSuccess?.(mockPurchase);
      });

      await waitFor(() => {
        expect(getByText(/✅ Purchase successful/)).toBeTruthy();
        expect(getByText(/Product: com.example.premium/)).toBeTruthy();
        expect(getByText(/Transaction ID: trans123/)).toBeTruthy();
        expect(queryByText(/receipt_data_here_very_long_string_that_should_be_truncated/)).toBeFalsy();
        expect(getByText(/Receipt:.*\.\.\./)).toBeTruthy();
      });

      expect(Alert.alert).toHaveBeenCalledWith('Success', 'Purchase completed successfully!');
    });

    it('should display purchase result section', async () => {
      let onPurchaseSuccess: ((purchase: ProductPurchase) => void) | undefined;

      (useIAP as jest.Mock).mockImplementation((options) => {
        onPurchaseSuccess = options?.onPurchaseSuccess;
        return defaultHookReturn;
      });

      const { getByText } = render(<PurchaseFlow />);

      const mockPurchase: ProductPurchase = {
        id: 'com.example.coins_100',
        transactionId: 'trans456',
        transactionDate: Date.now(),
        transactionReceipt: 'receipt123',
        platform: 'ios',
      };

      act(() => {
        onPurchaseSuccess?.(mockPurchase);
      });

      await waitFor(() => {
        expect(getByText('Result')).toBeTruthy();
      });
    });
  });

  describe('Purchase Error Handling', () => {
    it('should handle purchase error callback', async () => {
      let onPurchaseError: ((error: PurchaseError) => void) | undefined;

      (useIAP as jest.Mock).mockImplementation((options) => {
        onPurchaseError = options?.onPurchaseError;
        return defaultHookReturn;
      });

      const { getByText } = render(<PurchaseFlow />);

      const mockError: PurchaseError = {
        code: 'E_NETWORK_ERROR',
        message: 'Network connection failed',
        productId: 'com.example.premium',
      };

      act(() => {
        onPurchaseError?.(mockError);
      });

      await waitFor(() => {
        expect(getByText(/❌ Purchase failed: Network connection failed/)).toBeTruthy();
      });

      expect(Alert.alert).toHaveBeenCalledWith('Purchase Failed', 'Network connection failed');
    });

    it('should handle sync error callback', async () => {
      let onSyncError: ((error: Error) => void) | undefined;

      (useIAP as jest.Mock).mockImplementation((options) => {
        onSyncError = options?.onSyncError;
        return defaultHookReturn;
      });

      render(<PurchaseFlow />);

      const mockError = new Error('Failed to sync with store');

      act(() => {
        onSyncError?.(mockError);
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Sync Error',
        'Failed to sync purchases: Failed to sync with store'
      );
    });

    it('should handle purchase request exception', async () => {
      mockRequestPurchase.mockRejectedValue(new Error('Request failed'));

      const { getAllByText, getByText } = render(<PurchaseFlow />);
      const purchaseButtons = getAllByText('Purchase');

      fireEvent.press(purchaseButtons[0]);

      await waitFor(() => {
        expect(getByText(/❌ Purchase failed: Request failed/)).toBeTruthy();
      });

      expect(Alert.alert).toHaveBeenCalledWith('Purchase Failed', 'Request failed');
    });
  });

  describe('Android-specific Product Display', () => {
    beforeEach(() => {
      (Platform as any).OS = 'android';
    });

    it('should display Android product price from oneTimePurchaseOfferDetails', () => {
      const androidProducts: Product[] = [
        {
          id: 'com.example.premium',
          title: 'Premium Feature',
          description: 'Unlock premium features',
          price: '4.99',
          priceString: '₩5,500',
          displayPrice: '₩5,500',
          currencyCode: 'KRW',
          currencySymbol: '₩',
          platform: 'android',
          oneTimePurchaseOfferDetails: {
            formattedPrice: '₩5,500',
            priceAmountMicros: '5500000000',
            priceCurrencyCode: 'KRW',
          },
        },
      ];

      (useIAP as jest.Mock).mockReturnValue({
        ...defaultHookReturn,
        products: androidProducts,
      });

      const { getByText } = render(<PurchaseFlow />);

      expect(getByText('₩5,500')).toBeTruthy();
    });

    it('should fallback to displayPrice when oneTimePurchaseOfferDetails is missing', () => {
      const androidProducts: Product[] = [
        {
          id: 'com.example.premium',
          title: 'Premium Feature',
          description: 'Unlock premium features',
          price: '4.99',
          priceString: '₩5,500',
          displayPrice: '₩5,500',
          currencyCode: 'KRW',
          currencySymbol: '₩',
          platform: 'android',
        },
      ];

      (useIAP as jest.Mock).mockReturnValue({
        ...defaultHookReturn,
        products: androidProducts,
      });

      const { getByText } = render(<PurchaseFlow />);

      expect(getByText('₩5,500')).toBeTruthy();
    });
  });

  describe('Component Lifecycle', () => {
    it('should load products on mount when connected', () => {
      render(<PurchaseFlow />);

      expect(mockGetProducts).toHaveBeenCalledWith([
        'com.example.premium',
        'com.example.coins_100',
        'com.example.remove_ads',
      ]);
    });

    it('should not load products when not connected', () => {
      (useIAP as jest.Mock).mockReturnValue({
        ...defaultHookReturn,
        connected: false,
      });

      render(<PurchaseFlow />);

      expect(mockGetProducts).not.toHaveBeenCalled();
    });
  });

  describe('Info Section', () => {
    it('should display key features information', () => {
      const { getByText } = render(<PurchaseFlow />);

      expect(getByText('🎯 Key Features Demonstrated')).toBeTruthy();
      expect(getByText(/Automatic TypeScript type inference/)).toBeTruthy();
      expect(getByText(/Platform-agnostic/)).toBeTruthy();
      expect(getByText(/No manual type casting required/)).toBeTruthy();
      expect(getByText(/Focused on one-time purchases/)).toBeTruthy();
      expect(getByText(/Type-safe error handling/)).toBeTruthy();
      expect(getByText(/CPK React Native compliance/)).toBeTruthy();
    });
  });
});