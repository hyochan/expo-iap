import React from 'react';
import {render, fireEvent, waitFor} from '@testing-library/react-native';
import PurchaseFlow from '../app/purchase-flow';
import {requestPurchase, getStorefront} from '../../src';

// Mock the useIAP hook
const mockFetchProducts = jest.fn();
const mockGetAvailablePurchases = jest.fn();
const mockFinishTransaction = jest.fn();
const mockUseIAP = {
  connected: true,
  products: [
    {
      id: 'test.product.1',
      title: 'Test Product',
      description: 'Test Description',
      price: '$0.99',
      displayPrice: '$0.99',
      currency: 'USD',
      platform: 'ios',
    },
  ],
  availablePurchases: [],
  fetchProducts: mockFetchProducts,
  finishTransaction: mockFinishTransaction,
  getAvailablePurchases: mockGetAvailablePurchases,
};

jest.mock('../../src', () => ({
  useIAP: jest.fn(() => mockUseIAP),
  requestPurchase: jest.fn(),
  getAppTransactionIOS: jest.fn(),
  getStorefront: jest.fn(),
}));

describe('PurchaseFlow Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchProducts.mockResolvedValue([]);
    mockGetAvailablePurchases.mockResolvedValue([]);
    mockFinishTransaction.mockResolvedValue(undefined);
    (getStorefront as jest.Mock).mockResolvedValue('US');
  });

  it('should render without crashing', async () => {
    const {getByText} = render(<PurchaseFlow />);
    await waitFor(() => expect(getStorefront).toHaveBeenCalled());
    expect(getByText('In-App Purchase Flow')).toBeDefined();
    expect(getByText('Available Purchases')).toBeDefined();
  });

  it('should show connected status', async () => {
    const {getByText} = render(<PurchaseFlow />);
    await waitFor(() => expect(getStorefront).toHaveBeenCalled());
    // Look for the text that contains "Connected"
    expect(getByText(/✅ Connected/)).toBeDefined();
  });

  it('should load products on mount', async () => {
    render(<PurchaseFlow />);
    await waitFor(() => expect(mockFetchProducts).toHaveBeenCalled());
    expect(getStorefront).toHaveBeenCalled();
  });

  it('should display products', async () => {
    const {getByText} = render(<PurchaseFlow />);
    await waitFor(() => expect(getStorefront).toHaveBeenCalled());
    expect(getByText('Test Product')).toBeDefined();
    // The price is rendered by getProductDisplayPrice which returns displayPrice
    expect(getByText('Test Description')).toBeDefined();
  });

  it('should fetch and show storefront information', async () => {
    (getStorefront as jest.Mock).mockResolvedValue('KR');
    const {getByText} = render(<PurchaseFlow />);

    await waitFor(() => expect(getStorefront).toHaveBeenCalled());
    await waitFor(() => expect(getByText('KR')).toBeDefined());
    expect(getByText(/Storefront:/)).toBeDefined();
  });

  it('should handle purchase button click', async () => {
    const {getByText} = render(<PurchaseFlow />);
    await waitFor(() => expect(getStorefront).toHaveBeenCalled());

    const purchaseButton = getByText('Purchase');
    fireEvent.press(purchaseButton);

    // The actual call includes platform-specific request structure
    expect(requestPurchase).toHaveBeenCalledWith({
      request: {
        ios: {sku: 'test.product.1', quantity: 1},
        android: {skus: ['test.product.1']},
      },
      type: 'in-app',
    });
  });
});
