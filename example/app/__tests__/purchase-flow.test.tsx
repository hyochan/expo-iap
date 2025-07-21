import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import PurchaseFlow from '../purchase-flow';

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock expo-iap
jest.mock('expo-iap', () => ({
  useIAP: () => ({
    connected: true,
    products: [
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
    ],
    subscriptions: [],
    purchaseHistories: [],
    availablePurchases: [],
    currentPurchase: null,
    currentPurchaseError: null,
    getProducts: jest.fn().mockResolvedValue([]),
    getSubscriptions: jest.fn().mockResolvedValue([]),
    requestPurchase: jest.fn().mockResolvedValue({}),
    getPurchaseHistories: jest.fn().mockResolvedValue([]),
    finishTransaction: jest.fn(),
    restorePurchases: jest.fn(),
  }),
  initConnection: jest.fn().mockResolvedValue(true),
  endConnection: jest.fn(),
  getProducts: jest.fn().mockResolvedValue([]),
  requestPurchase: jest.fn().mockResolvedValue({}),
}));

describe('PurchaseFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render purchase flow screen', () => {
    const { getByText } = render(<PurchaseFlow />);
    
    expect(getByText('In-App Purchase Flow')).toBeTruthy();
    expect(getByText('TypeScript-first approach for products')).toBeTruthy();
  });

  it('should display connection status', () => {
    const { getByText } = render(<PurchaseFlow />);
    
    expect(getByText('Store: ✅ Connected')).toBeTruthy();
  });

  it('should display platform information', () => {
    const { getByText } = render(<PurchaseFlow />);
    
    expect(getByText(/Platform:/)).toBeTruthy();
  });

  it('should display products list', () => {
    const { getByText } = render(<PurchaseFlow />);
    
    expect(getByText('Premium Feature')).toBeTruthy();
    expect(getByText('$4.99')).toBeTruthy();
    expect(getByText('100 Coins')).toBeTruthy();
    expect(getByText('$0.99')).toBeTruthy();
  });

  it('should handle product purchase when Buy button is pressed', () => {
    const mockRequestPurchase = jest.fn();
    jest.mocked(require('expo-iap').useIAP).mockReturnValue({
      connected: true,
      products: [
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
      ],
      subscriptions: [],
      purchaseHistories: [],
      availablePurchases: [],
      currentPurchase: null,
      currentPurchaseError: null,
      getProducts: jest.fn(),
      getSubscriptions: jest.fn(),
      requestPurchase: mockRequestPurchase,
      getPurchaseHistories: jest.fn(),
      finishTransaction: jest.fn(),
      restorePurchases: jest.fn(),
    });

    const { getAllByText } = render(<PurchaseFlow />);
    const buyButton = getAllByText('Buy')[0];
    
    fireEvent.press(buyButton);
    
    expect(mockRequestPurchase).toHaveBeenCalledWith({
      request: { sku: 'com.example.premium' },
    });
  });

  it('should display loading state during purchase', async () => {
    const mockRequestPurchase = jest.fn(() => new Promise(() => {})); // Never resolves
    jest.mocked(require('expo-iap').useIAP).mockReturnValue({
      connected: true,
      products: [
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
      ],
      subscriptions: [],
      purchaseHistories: [],
      availablePurchases: [],
      currentPurchase: null,
      currentPurchaseError: null,
      getProducts: jest.fn(),
      getSubscriptions: jest.fn(),
      requestPurchase: mockRequestPurchase,
      getPurchaseHistories: jest.fn(),
      finishTransaction: jest.fn(),
      restorePurchases: jest.fn(),
    });

    const { getAllByText, getByText } = render(<PurchaseFlow />);
    const buyButton = getAllByText('Buy')[0];
    
    fireEvent.press(buyButton);
    
    await waitFor(() => {
      expect(getByText('Processing...')).toBeTruthy();
    });
  });

  it('should show error alert on purchase failure', async () => {
    const mockRequestPurchase = jest.fn().mockRejectedValue(new Error('Purchase failed'));
    jest.mocked(require('expo-iap').useIAP).mockReturnValue({
      connected: true,
      products: [
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
      ],
      subscriptions: [],
      purchaseHistories: [],
      availablePurchases: [],
      currentPurchase: null,
      currentPurchaseError: null,
      getProducts: jest.fn(),
      getSubscriptions: jest.fn(),
      requestPurchase: mockRequestPurchase,
      getPurchaseHistories: jest.fn(),
      finishTransaction: jest.fn(),
      restorePurchases: jest.fn(),
    });

    const { getAllByText } = render(<PurchaseFlow />);
    const buyButton = getAllByText('Buy')[0];
    
    fireEvent.press(buyButton);
    
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Purchase Error',
        'Purchase failed',
        [{ text: 'OK' }]
      );
    });
  });

  it('should handle refresh products', () => {
    const mockGetProducts = jest.fn();
    jest.mocked(require('expo-iap').useIAP).mockReturnValue({
      connected: true,
      products: [],
      subscriptions: [],
      purchaseHistories: [],
      availablePurchases: [],
      currentPurchase: null,
      currentPurchaseError: null,
      getProducts: mockGetProducts,
      getSubscriptions: jest.fn(),
      requestPurchase: jest.fn(),
      getPurchaseHistories: jest.fn(),
      finishTransaction: jest.fn(),
      restorePurchases: jest.fn(),
    });

    const { getByText } = render(<PurchaseFlow />);
    const refreshButton = getByText('Refresh Products');
    
    fireEvent.press(refreshButton);
    
    expect(mockGetProducts).toHaveBeenCalled();
  });

  it('should display purchase histories section', () => {
    const { getByText } = render(<PurchaseFlow />);
    
    expect(getByText('Purchase Histories (Plural)')).toBeTruthy();
    expect(getByText('Fetch Histories')).toBeTruthy();
  });
});