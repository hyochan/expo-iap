import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, Platform } from 'react-native';
import SubscriptionFlow from '../subscription-flow';

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock Platform
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Platform: {
    OS: 'ios',
  },
}));

// Mock expo-iap
jest.mock('expo-iap', () => ({
  useIAP: () => ({
    connected: true,
    products: [],
    subscriptions: [
      {
        id: 'com.example.monthly',
        title: 'Monthly Subscription',
        description: 'Access all features for a month',
        price: '9.99',
        priceString: '$9.99',
        displayPrice: '$9.99',
        currencyCode: 'USD',
        currencySymbol: '$',
        platform: 'ios',
        subscription: {
          subscriptionPeriod: {
            unit: 'MONTH',
            value: 1,
          },
        },
      },
      {
        id: 'com.example.yearly',
        title: 'Yearly Subscription',
        description: 'Best value - save 20%',
        price: '99.99',
        priceString: '$99.99',
        displayPrice: '$99.99',
        currencyCode: 'USD',
        currencySymbol: '$',
        platform: 'ios',
        subscription: {
          subscriptionPeriod: {
            unit: 'YEAR',
            value: 1,
          },
        },
      },
    ],
    purchaseHistories: [],
    availablePurchases: [],
    currentPurchase: null,
    currentPurchaseError: null,
    getProducts: jest.fn(),
    getSubscriptions: jest.fn().mockResolvedValue([]),
    requestPurchase: jest.fn().mockResolvedValue({}),
    getPurchaseHistories: jest.fn().mockResolvedValue([]),
    finishTransaction: jest.fn(),
    restorePurchases: jest.fn(),
  }),
  deepLinkToSubscriptionsAndroid: jest.fn(),
}));

describe('SubscriptionFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render subscription flow screen', () => {
    const { getByText } = render(<SubscriptionFlow />);
    
    expect(getByText('Subscription Management')).toBeTruthy();
    expect(getByText('TypeScript-first subscription handling')).toBeTruthy();
  });

  it('should display subscriptions list', () => {
    const { getByText } = render(<SubscriptionFlow />);
    
    expect(getByText('Monthly Subscription')).toBeTruthy();
    expect(getByText('$9.99')).toBeTruthy();
    expect(getByText('Yearly Subscription')).toBeTruthy();
    expect(getByText('$99.99')).toBeTruthy();
  });

  it('should display subscription period', () => {
    const { getByText } = render(<SubscriptionFlow />);
    
    expect(getByText('Period: 1 MONTH')).toBeTruthy();
    expect(getByText('Period: 1 YEAR')).toBeTruthy();
  });

  it('should handle subscription purchase', async () => {
    const mockRequestPurchase = jest.fn().mockResolvedValue({
      transactionId: '123',
      productId: 'com.example.monthly',
    });
    
    jest.mocked(require('expo-iap').useIAP).mockReturnValue({
      connected: true,
      products: [],
      subscriptions: [
        {
          id: 'com.example.monthly',
          title: 'Monthly Subscription',
          description: 'Access all features for a month',
          price: '9.99',
          priceString: '$9.99',
          displayPrice: '$9.99',
          currencyCode: 'USD',
          currencySymbol: '$',
          platform: 'ios',
          subscription: {
            subscriptionPeriod: {
              unit: 'MONTH',
              value: 1,
            },
          },
        },
      ],
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

    const { getAllByText } = render(<SubscriptionFlow />);
    const subscribeButton = getAllByText('Subscribe')[0];
    
    fireEvent.press(subscribeButton);
    
    await waitFor(() => {
      expect(mockRequestPurchase).toHaveBeenCalledWith({
        request: { sku: 'com.example.monthly' },
      });
    });
  });

  it('should show manage subscriptions button on Android', () => {
    // Change platform to Android
    (Platform as any).OS = 'android';
    
    const { getByText } = render(<SubscriptionFlow />);
    
    expect(getByText('Manage Subscriptions (Android)')).toBeTruthy();
  });

  it('should call deepLinkToSubscriptionsAndroid on Android', () => {
    (Platform as any).OS = 'android';
    const mockDeepLink = jest.fn();
    
    jest.mocked(require('expo-iap')).deepLinkToSubscriptionsAndroid = mockDeepLink;
    
    const { getByText } = render(<SubscriptionFlow />);
    const manageButton = getByText('Manage Subscriptions (Android)');
    
    fireEvent.press(manageButton);
    
    expect(mockDeepLink).toHaveBeenCalled();
  });

  it('should handle subscription error', async () => {
    const mockRequestPurchase = jest.fn().mockRejectedValue(new Error('Subscription failed'));
    
    jest.mocked(require('expo-iap').useIAP).mockReturnValue({
      connected: true,
      products: [],
      subscriptions: [
        {
          id: 'com.example.monthly',
          title: 'Monthly Subscription',
          description: 'Access all features for a month',
          price: '9.99',
          priceString: '$9.99',
          displayPrice: '$9.99',
          currencyCode: 'USD',
          currencySymbol: '$',
          platform: 'ios',
          subscription: {
            subscriptionPeriod: {
              unit: 'MONTH',
              value: 1,
            },
          },
        },
      ],
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

    const { getAllByText } = render(<SubscriptionFlow />);
    const subscribeButton = getAllByText('Subscribe')[0];
    
    fireEvent.press(subscribeButton);
    
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Subscription Error',
        'Subscription failed',
        [{ text: 'OK' }]
      );
    });
  });

  it('should refresh subscriptions list', () => {
    const mockGetSubscriptions = jest.fn();
    
    jest.mocked(require('expo-iap').useIAP).mockReturnValue({
      connected: true,
      products: [],
      subscriptions: [],
      purchaseHistories: [],
      availablePurchases: [],
      currentPurchase: null,
      currentPurchaseError: null,
      getProducts: jest.fn(),
      getSubscriptions: mockGetSubscriptions,
      requestPurchase: jest.fn(),
      getPurchaseHistories: jest.fn(),
      finishTransaction: jest.fn(),
      restorePurchases: jest.fn(),
    });

    const { getByText } = render(<SubscriptionFlow />);
    const refreshButton = getByText('Refresh Subscriptions');
    
    fireEvent.press(refreshButton);
    
    expect(mockGetSubscriptions).toHaveBeenCalled();
  });
});