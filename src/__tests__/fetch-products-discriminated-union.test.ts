import {fetchProducts} from '../index';
import ExpoIapModule from '../ExpoIapModule';

// Mock the module
jest.mock('../ExpoIapModule', () => ({
  __esModule: true,
  default: {
    fetchProducts: jest.fn(),
  },
}));

describe('fetchProducts with discriminated union', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return Product[] for in-app type and allow narrowing', async () => {
    const mockProducts = [
      {
        id: 'com.example.product1',
        type: 'in-app' as const,
        platform: 'ios' as const,
        title: 'Product 1',
        description: 'Description',
        displayPrice: '$0.99',
        price: 0.99,
        currency: 'USD',
      },
    ];

    (ExpoIapModule.fetchProducts as jest.Mock).mockResolvedValue(mockProducts);

    const result = await fetchProducts({
      skus: ['com.example.product1'],
      type: 'in-app',
    });

    expect(result).toHaveLength(1);
    if (result && result.length > 0) {
      const item = result[0];
      // TypeScript should allow this check
      if (item.type === 'in-app') {
        expect(item.type).toBe('in-app');
      }
    }
  });

  it('should return ProductSubscription[] for subs type and allow narrowing', async () => {
    const mockSubscriptions = [
      {
        id: 'com.example.sub1',
        type: 'subs' as const,
        platform: 'ios' as const,
        title: 'Subscription 1',
        description: 'Description',
        displayPrice: '$4.99',
        price: 4.99,
        currency: 'USD',
      },
    ];

    (ExpoIapModule.fetchProducts as jest.Mock).mockResolvedValue(
      mockSubscriptions,
    );

    const result = await fetchProducts({
      skus: ['com.example.sub1'],
      type: 'subs',
    });

    expect(result).toHaveLength(1);
    if (result && result.length > 0) {
      const item = result[0];
      // TypeScript should allow this check
      if (item.type === 'subs') {
        expect(item.type).toBe('subs');
      }
    }
  });

  it('should return mixed array for all type and allow discriminated narrowing', async () => {
    const mockMixed = [
      {
        id: 'com.example.product1',
        type: 'in-app' as const,
        platform: 'ios' as const,
        title: 'Product 1',
        description: 'Description',
        displayPrice: '$0.99',
        price: 0.99,
        currency: 'USD',
      },
      {
        id: 'com.example.sub1',
        type: 'subs' as const,
        platform: 'ios' as const,
        title: 'Subscription 1',
        description: 'Description',
        displayPrice: '$4.99',
        price: 4.99,
        currency: 'USD',
      },
    ];

    (ExpoIapModule.fetchProducts as jest.Mock).mockResolvedValue(mockMixed);

    const result = await fetchProducts({
      skus: ['com.example.product1', 'com.example.sub1'],
      type: 'all',
    });

    expect(result).toHaveLength(2);
    if (result && result.length > 0) {
      // Test discriminated union narrowing works for 'all' type
      const products = result.filter((item) => item.type === 'in-app');
      const subscriptions = result.filter((item) => item.type === 'subs');

      expect(products).toHaveLength(1);
      expect(subscriptions).toHaveLength(1);

      // TypeScript should properly narrow these types
      expect(products[0].type).toBe('in-app');
      expect(subscriptions[0].type).toBe('subs');
    }
  });
});
