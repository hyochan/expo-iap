import React from 'react';
import {render, fireEvent, act} from '@testing-library/react-native';
import PurchaseFlow from '../app/purchase-flow';

// Mock the useIAP hook
const mockFetchProducts = jest.fn();
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
  fetchProducts: mockFetchProducts,
};

jest.mock('../../src', () => ({
  useIAP: jest.fn(() => mockUseIAP),
  requestPurchase: jest.fn(),
}));

describe('PurchaseFlow Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchProducts.mockResolvedValue([]);
  });

  it('should render without crashing', () => {
    const {getByText} = render(<PurchaseFlow />);
    expect(getByText('In-App Purchase Flow')).toBeDefined();
  });

  it('should show connected status', () => {
    const {getByText} = render(<PurchaseFlow />);
    // Look for the text that contains "Connected"
    expect(getByText(/✅ Connected/)).toBeDefined();
  });

  it('should load products on mount', () => {
    render(<PurchaseFlow />);
    expect(mockFetchProducts).toHaveBeenCalled();
  });

  it('should display products', () => {
    const {getByText} = render(<PurchaseFlow />);
    expect(getByText('Test Product')).toBeDefined();
    // The price is rendered by getProductDisplayPrice which returns displayPrice
    expect(getByText('Test Description')).toBeDefined();
  });

  it('should handle purchase button click', async () => {
    const requestPurchase = require('../../src').requestPurchase;
    const {getByText} = render(<PurchaseFlow />);

    const purchaseButton = getByText('Purchase');
    fireEvent.press(purchaseButton);

    // The actual call includes platform-specific request structure
    expect(requestPurchase).toHaveBeenCalledWith({
      request: {
        ios: {sku: 'test.product.1', quantity: 1},
        android: {skus: ['test.product.1']},
      },
      type: 'inapp',
    });
  });
});
