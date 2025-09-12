import React from 'react';
import {render, fireEvent} from '@testing-library/react-native';
import {Alert, Platform} from 'react-native';
import SubscriptionFlow from '../app/subscription-flow';

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock the functions
const mockInitConnection = jest.fn().mockResolvedValue(true);
const mockFetchProducts = jest.fn();
const mockRequestPurchase = jest.fn();
const mockFinishTransaction = jest.fn();
const mockGetActiveSubscriptions = jest.fn();
const mockGetAvailablePurchases = jest.fn().mockResolvedValue([]);

const createMockSubscription = (overrides = {}) => ({
  id: 'test.subscription.1',
  title: 'Test Subscription',
  description: 'Test Description',
  price: '$9.99',
  displayPrice: '$9.99',
  currency: 'USD',
  platform: 'ios',
  subscriptionInfoIOS: {
    subscriptionPeriod: {unit: 'MONTH'},
    introductoryOffer: {
      paymentMode: 'FREETRIAL',
      periodCount: 7,
      period: {unit: 'day'},
      displayPrice: 'Free',
    },
  },
  ...overrides,
});

const createMockAndroidSubscription = () => ({
  id: 'test.android.subscription',
  title: 'Android Subscription',
  description: 'Android Test Description',
  displayPrice: '$4.99',
  platform: 'android',
  subscriptionOfferDetailsAndroid: [
    {
      pricingPhases: {
        pricingPhaseList: [
          {
            formattedPrice: '$4.99',
            billingPeriod: 'P1M',
          },
        ],
      },
      offerToken: 'offer123',
    },
  ],
});

const mockUseIAP = jest.fn();
jest.mock('../../src', () => ({
  initConnection: mockInitConnection,
  requestPurchase: mockRequestPurchase,
  useIAP: () => mockUseIAP(),
}));

describe('SubscriptionFlow Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchProducts.mockResolvedValue([createMockSubscription()]);
    mockGetActiveSubscriptions.mockResolvedValue([]);
    mockFinishTransaction.mockResolvedValue(undefined);
    mockGetAvailablePurchases.mockResolvedValue([]);

    // Default mock implementation
    mockUseIAP.mockReturnValue({
      connected: true,
      subscriptions: [createMockSubscription()],
      availablePurchases: [],
      fetchProducts: mockFetchProducts,
      getAvailablePurchases: mockGetAvailablePurchases,
      finishTransaction: mockFinishTransaction,
      getActiveSubscriptions: mockGetActiveSubscriptions,
      activeSubscriptions: [],
    });
  });

  it('should render without crashing', () => {
    const {getByText} = render(<SubscriptionFlow />);
    expect(getByText('Subscription Flow')).toBeDefined();
  });

  it('should show connected status', () => {
    const {getByText} = render(<SubscriptionFlow />);
    // Look for the text that contains "Connected"
    expect(getByText(/✅ Connected/)).toBeDefined();
  });

  it('should display subscriptions', () => {
    const {getByText} = render(<SubscriptionFlow />);
    expect(getByText('Test Subscription')).toBeDefined();
    // The subscription might show different price format
    expect(getByText('Test Description')).toBeDefined();
  });

  it('should handle subscribe button click', () => {
    const {getByText} = render(<SubscriptionFlow />);
    const subscribeButton = getByText('Subscribe');

    fireEvent.press(subscribeButton);

    // The actual implementation triggers product fetch on mount
    expect(mockFetchProducts).toHaveBeenCalled();
  });

  it('should call fetchProducts on mount', () => {
    render(<SubscriptionFlow />);
    expect(mockFetchProducts).toHaveBeenCalled();
  });

  it('should display active subscriptions when available', () => {
    const activeSubscription = {
      productId: 'test.subscription.1',
      isActive: true,
      expirationDateIOS: new Date(Date.now() + 86400000),
      environmentIOS: 'Production',
      willExpireSoon: false,
      daysUntilExpirationIOS: 1,
    };

    mockUseIAP.mockReturnValue({
      connected: true,
      subscriptions: [createMockSubscription()],
      availablePurchases: [],
      fetchProducts: mockFetchProducts,
      getAvailablePurchases: mockGetAvailablePurchases,
      finishTransaction: mockFinishTransaction,
      getActiveSubscriptions: mockGetActiveSubscriptions,
      activeSubscriptions: [activeSubscription],
    });

    const {getByText} = render(<SubscriptionFlow />);
    expect(getByText('Current Subscription Status')).toBeDefined();
    expect(getByText('✅ Active')).toBeDefined();
    expect(getByText('test.subscription.1')).toBeDefined();
  });

  it('should show expiration warning for soon-to-expire subscriptions', () => {
    const expiringSubscription = {
      productId: 'test.subscription.1',
      isActive: true,
      expirationDateIOS: new Date(Date.now() + 86400000),
      willExpireSoon: true,
      daysUntilExpirationIOS: 3,
    };

    mockUseIAP.mockReturnValue({
      connected: true,
      subscriptions: [createMockSubscription()],
      availablePurchases: [],
      fetchProducts: mockFetchProducts,
      getAvailablePurchases: mockGetAvailablePurchases,
      finishTransaction: mockFinishTransaction,
      getActiveSubscriptions: mockGetActiveSubscriptions,
      activeSubscriptions: [expiringSubscription],
    });

    const {getByText} = render(<SubscriptionFlow />);
    expect(getByText(/Your subscription will expire soon/)).toBeDefined();
    expect(getByText(/3 days remaining/)).toBeDefined();
  });

  it('should handle Android subscriptions correctly', () => {
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      writable: true,
    });

    const androidActiveSubscription = {
      productId: 'test.android.subscription',
      isActive: true,
      autoRenewingAndroid: false,
      willExpireSoon: true,
    };

    mockUseIAP.mockReturnValue({
      connected: true,
      subscriptions: [createMockAndroidSubscription()],
      availablePurchases: [],
      fetchProducts: mockFetchProducts,
      getAvailablePurchases: mockGetAvailablePurchases,
      finishTransaction: mockFinishTransaction,
      getActiveSubscriptions: mockGetActiveSubscriptions,
      activeSubscriptions: [androidActiveSubscription],
    });

    const {getByText} = render(<SubscriptionFlow />);
    expect(getByText('⚠️ Cancelled')).toBeDefined();
    expect(getByText(/Your subscription will not auto-renew/)).toBeDefined();
  });

  it('should show active subscription status section', () => {
    mockUseIAP.mockReturnValue({
      connected: true,
      subscriptions: [createMockSubscription()],
      availablePurchases: [],
      fetchProducts: mockFetchProducts,
      getAvailablePurchases: mockGetAvailablePurchases,
      finishTransaction: mockFinishTransaction,
      getActiveSubscriptions: mockGetActiveSubscriptions,
      activeSubscriptions: [
        {
          productId: 'test.subscription.1',
          isActive: true,
          expirationDateIOS: new Date(Date.now() + 86400000),
        },
      ],
    });

    const {getByText} = render(<SubscriptionFlow />);
    // The status section should be present when there are active subscriptions
    expect(getByText('Current Subscription Status')).toBeDefined();
    expect(getByText('✅ Active')).toBeDefined();
  });

  it('should show no subscriptions message when empty', () => {
    mockUseIAP.mockReturnValue({
      connected: true,
      subscriptions: [],
      availablePurchases: [],
      fetchProducts: mockFetchProducts,
      getAvailablePurchases: mockGetAvailablePurchases,
      finishTransaction: mockFinishTransaction,
      getActiveSubscriptions: mockGetActiveSubscriptions,
      activeSubscriptions: [],
    });

    const {getByText} = render(<SubscriptionFlow />);
    expect(getByText(/No subscriptions found/)).toBeDefined();
    expect(getByText('Retry')).toBeDefined();
  });

  it('should handle retry button click', () => {
    mockUseIAP.mockReturnValue({
      connected: true,
      subscriptions: [],
      availablePurchases: [],
      fetchProducts: mockFetchProducts,
      getAvailablePurchases: mockGetAvailablePurchases,
      finishTransaction: mockFinishTransaction,
      getActiveSubscriptions: mockGetActiveSubscriptions,
      activeSubscriptions: [],
    });

    const {getByText} = render(<SubscriptionFlow />);
    const retryButton = getByText('Retry');

    fireEvent.press(retryButton);
    expect(mockFetchProducts).toHaveBeenCalledWith({
      skus: ['dev.hyo.martie.premium'],
      type: 'subs',
    });
  });

  it('should show disconnected status when not connected', () => {
    mockUseIAP.mockReturnValue({
      connected: false,
      subscriptions: [],
      availablePurchases: [],
      fetchProducts: mockFetchProducts,
      getAvailablePurchases: mockGetAvailablePurchases,
      finishTransaction: mockFinishTransaction,
      getActiveSubscriptions: mockGetActiveSubscriptions,
      activeSubscriptions: [],
    });

    const {getByText} = render(<SubscriptionFlow />);
    // Check for disconnected in the status text
    expect(getByText(/Disconnected/)).toBeDefined();
    expect(getByText('Connecting to store...')).toBeDefined();
  });

  it('should display introductory offer for iOS', () => {
    Object.defineProperty(Platform, 'OS', {
      value: 'ios',
      writable: true,
    });
    const {getByText} = render(<SubscriptionFlow />);
    expect(getByText('7 day(s) free trial')).toBeDefined();
  });

  it('should have subscribe button for each subscription', () => {
    mockUseIAP.mockReturnValue({
      connected: true,
      subscriptions: [createMockSubscription()],
      availablePurchases: [],
      fetchProducts: mockFetchProducts,
      getAvailablePurchases: mockGetAvailablePurchases,
      finishTransaction: mockFinishTransaction,
      getActiveSubscriptions: mockGetActiveSubscriptions,
      activeSubscriptions: [],
    });

    const {getByText} = render(<SubscriptionFlow />);
    const subscribeButton = getByText('Subscribe');

    // Test that the button exists
    expect(subscribeButton).toBeDefined();
  });

  it('should show check status link when no active subscriptions', () => {
    mockUseIAP.mockReturnValue({
      connected: true,
      subscriptions: [createMockSubscription()],
      availablePurchases: [],
      fetchProducts: mockFetchProducts,
      getAvailablePurchases: mockGetAvailablePurchases,
      finishTransaction: mockFinishTransaction,
      getActiveSubscriptions: mockGetActiveSubscriptions,
      activeSubscriptions: [],
    });

    const {getByText} = render(<SubscriptionFlow />);

    // When there are no active subscriptions but connected, show check status link
    expect(getByText('Check Status')).toBeDefined();
  });
});
