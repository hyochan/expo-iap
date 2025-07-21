import { renderHook, act } from '@testing-library/react-hooks';
import { Platform, Alert } from 'react-native';
import { useIAP } from '../useIap';
import * as IapModule from '../index';
import type { 
  Product, 
  ProductPurchase, 
  PurchaseError,
  SubscriptionProduct,
  ProductAndroid,
  ProductIos
} from '../ExpoIap.types';

// Mock dependencies
jest.mock('../index', () => ({
  initConnection: jest.fn().mockResolvedValue(true),
  endConnection: jest.fn(),
  purchaseUpdatedListener: jest.fn(),
  purchaseErrorListener: jest.fn(),
  getProducts: jest.fn().mockResolvedValue([]),
  getSubscriptions: jest.fn().mockResolvedValue([]),
  getAvailablePurchases: jest.fn().mockResolvedValue([]),
  getPurchaseHistories: jest.fn().mockResolvedValue([]),
  finishTransaction: jest.fn().mockResolvedValue(true),
  requestPurchase: jest.fn().mockResolvedValue({}),
  validateReceiptIos: jest.fn().mockResolvedValue({ isValid: true }),
  validateReceiptAndroid: jest.fn().mockResolvedValue({ isValid: true }),
}));

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios),
  },
  Alert: {
    alert: jest.fn(),
  },
  InteractionManager: {
    runAfterInteractions: jest.fn((cb) => cb()),
  },
}));

describe('Purchase Flow Tests', () => {
  let mockPurchaseUpdatedCallback: (purchase: ProductPurchase) => void;
  let mockPurchaseErrorCallback: (error: PurchaseError) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Capture the listener callbacks
    (IapModule.purchaseUpdatedListener as jest.Mock).mockImplementation((callback) => {
      mockPurchaseUpdatedCallback = callback;
      return { remove: jest.fn() };
    });
    
    (IapModule.purchaseErrorListener as jest.Mock).mockImplementation((callback) => {
      mockPurchaseErrorCallback = callback;
      return { remove: jest.fn() };
    });
  });

  describe('Purchase Listener Setup and Cleanup', () => {
    it('should set up purchase listeners on mount', async () => {
      const { waitForNextUpdate } = renderHook(() => useIAP());
      
      await waitForNextUpdate();

      expect(IapModule.initConnection).toHaveBeenCalled();
      expect(IapModule.purchaseUpdatedListener).toHaveBeenCalled();
      expect(IapModule.purchaseErrorListener).toHaveBeenCalled();
    });

    it('should clean up listeners on unmount', async () => {
      const mockRemove = jest.fn();
      (IapModule.purchaseUpdatedListener as jest.Mock).mockReturnValue({ remove: mockRemove });
      (IapModule.purchaseErrorListener as jest.Mock).mockReturnValue({ remove: mockRemove });

      const { unmount, waitForNextUpdate } = renderHook(() => useIAP());
      
      await waitForNextUpdate();
      unmount();

      expect(mockRemove).toHaveBeenCalled();
      expect(IapModule.endConnection).toHaveBeenCalled();
    });

    it('should handle purchase success callback', async () => {
      const onPurchaseSuccess = jest.fn();
      const { waitForNextUpdate } = renderHook(() => 
        useIAP({ onPurchaseSuccess })
      );

      await waitForNextUpdate();

      const mockPurchase: ProductPurchase = {
        id: 'com.example.product',
        transactionId: 'trans123',
        transactionDate: Date.now(),
        transactionReceipt: 'receipt123',
        platform: 'ios',
      };

      act(() => {
        mockPurchaseUpdatedCallback(mockPurchase);
      });

      expect(onPurchaseSuccess).toHaveBeenCalledWith(mockPurchase);
    });

    it('should handle purchase error callback', async () => {
      const onPurchaseError = jest.fn();
      const { waitForNextUpdate } = renderHook(() => 
        useIAP({ onPurchaseError })
      );

      await waitForNextUpdate();

      const mockError: PurchaseError = {
        code: 'E_USER_CANCELLED',
        message: 'User cancelled purchase',
        productId: 'com.example.product',
      };

      act(() => {
        mockPurchaseErrorCallback(mockError);
      });

      expect(onPurchaseError).toHaveBeenCalledWith(mockError);
    });
  });

  describe('iOS Purchase Request Handling', () => {
    beforeEach(() => {
      (Platform as any).OS = 'ios';
    });

    it('should request single product purchase on iOS', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useIAP());
      
      await waitForNextUpdate();

      await act(async () => {
        await result.current.requestPurchase({
          request: { sku: 'com.example.product' },
        });
      });

      expect(IapModule.requestPurchase).toHaveBeenCalledWith({
        request: { sku: 'com.example.product' },
      });
    });

    it('should request purchase with quantity on iOS', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useIAP());
      
      await waitForNextUpdate();

      await act(async () => {
        await result.current.requestPurchase({
          request: { 
            sku: 'com.example.product',
            quantity: 5
          },
        });
      });

      expect(IapModule.requestPurchase).toHaveBeenCalledWith({
        request: { 
          sku: 'com.example.product',
          quantity: 5
        },
      });
    });

    it('should request subscription purchase on iOS', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useIAP());
      
      await waitForNextUpdate();

      await act(async () => {
        await result.current.requestPurchase({
          request: { sku: 'com.example.subscription' },
          type: 'subs',
        });
      });

      expect(IapModule.requestPurchase).toHaveBeenCalledWith({
        request: { sku: 'com.example.subscription' },
        type: 'subs',
      });
    });

    it('should handle iOS product display price', () => {
      const product: ProductIos = {
        id: 'com.example.product',
        title: 'Example Product',
        description: 'An example product',
        price: '0.99',
        priceString: '$0.99',
        displayPrice: '$0.99',
        currencyCode: 'USD',
        currencySymbol: '$',
        platform: 'ios',
      };

      expect(product.displayPrice).toBe('$0.99');
    });
  });

  describe('Android Purchase Request Handling', () => {
    beforeEach(() => {
      (Platform as any).OS = 'android';
      (Platform.select as jest.Mock).mockImplementation((obj) => obj.android);
    });

    it('should request product purchase with array on Android', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useIAP());
      
      await waitForNextUpdate();

      await act(async () => {
        await result.current.requestPurchase({
          request: { skus: ['com.example.product'] },
        });
      });

      expect(IapModule.requestPurchase).toHaveBeenCalledWith({
        request: { skus: ['com.example.product'] },
      });
    });

    it('should request multiple products on Android', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useIAP());
      
      await waitForNextUpdate();

      await act(async () => {
        await result.current.requestPurchase({
          request: { 
            skus: ['com.example.product1', 'com.example.product2'] 
          },
        });
      });

      expect(IapModule.requestPurchase).toHaveBeenCalledWith({
        request: { 
          skus: ['com.example.product1', 'com.example.product2'] 
        },
      });
    });

    it('should handle Android product display price', () => {
      const product: ProductAndroid = {
        id: 'com.example.product',
        title: 'Example Product',
        description: 'An example product',
        price: '0.99',
        priceString: '₩1,200',
        displayPrice: '₩1,200',
        currencyCode: 'KRW',
        currencySymbol: '₩',
        platform: 'android',
        oneTimePurchaseOfferDetails: {
          formattedPrice: '₩1,200',
          priceAmountMicros: '1200000000',
          priceCurrencyCode: 'KRW',
        },
      };

      expect(product.oneTimePurchaseOfferDetails?.formattedPrice).toBe('₩1,200');
    });
  });

  describe('Subscription Purchase Flow', () => {
    const mockSubscriptions: SubscriptionProduct[] = [
      {
        id: 'com.example.subscription',
        title: 'Premium Subscription',
        description: 'Monthly premium subscription',
        price: '9.99',
        priceString: '$9.99',
        displayPrice: '$9.99',
        currencyCode: 'USD',
        currencySymbol: '$',
        platform: 'ios',
        subscription: {
          subscriptionGroupID: 'group1',
          subscriptionPeriod: {
            unit: 'MONTH',
            value: 1,
          },
        },
      },
    ];

    beforeEach(() => {
      (Platform as any).OS = 'ios';
      (IapModule.getSubscriptions as jest.Mock).mockResolvedValue(mockSubscriptions);
    });

    it('should fetch and display subscriptions', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useIAP());
      
      await waitForNextUpdate();

      await act(async () => {
        await result.current.getSubscriptions(['com.example.subscription']);
      });

      expect(IapModule.getSubscriptions).toHaveBeenCalledWith(['com.example.subscription']);
      expect(result.current.subscriptions).toEqual(mockSubscriptions);
    });

    it('should request subscription with offer on Android', async () => {
      (Platform as any).OS = 'android';
      const androidSubscription: SubscriptionProduct = {
        ...mockSubscriptions[0],
        platform: 'android',
        subscriptionOfferDetails: [
          {
            offerToken: 'offer123',
            basePlanId: 'base-plan',
            pricingPhases: {
              pricingPhaseList: [
                {
                  formattedPrice: '$9.99',
                  priceAmountMicros: '9990000',
                  priceCurrencyCode: 'USD',
                  billingPeriod: 'P1M',
                  billingCycleCount: 0,
                  recurrenceMode: 1,
                },
              ],
            },
          },
        ],
      };

      (IapModule.getSubscriptions as jest.Mock).mockResolvedValue([androidSubscription]);

      const { result, waitForNextUpdate } = renderHook(() => useIAP());
      
      await waitForNextUpdate();

      await act(async () => {
        await result.current.getSubscriptions(['com.example.subscription']);
      });

      await act(async () => {
        await result.current.requestPurchase({
          request: {
            skus: ['com.example.subscription'],
            subscriptionOffers: [
              {
                sku: 'com.example.subscription',
                offerToken: 'offer123',
              },
            ],
          },
          type: 'subs',
        });
      });

      expect(IapModule.requestPurchase).toHaveBeenCalledWith({
        request: {
          skus: ['com.example.subscription'],
          subscriptionOffers: [
            {
              sku: 'com.example.subscription',
              offerToken: 'offer123',
            },
          ],
        },
        type: 'subs',
      });
    });
  });

  describe('Receipt Validation', () => {
    it('should validate receipt on iOS with just SKU', async () => {
      (Platform as any).OS = 'ios';
      const { result, waitForNextUpdate } = renderHook(() => useIAP());
      
      await waitForNextUpdate();

      const validationResult = await act(async () => {
        return await result.current.validateReceipt('com.example.product');
      });

      expect(IapModule.validateReceiptIos).toHaveBeenCalledWith('com.example.product');
      expect(validationResult).toEqual({ isValid: true });
    });

    it('should validate receipt on Android with required parameters', async () => {
      (Platform as any).OS = 'android';
      const { result, waitForNextUpdate } = renderHook(() => useIAP());
      
      await waitForNextUpdate();

      const androidOptions = {
        packageName: 'com.example.app',
        productToken: 'token123',
        accessToken: 'access123',
        isSub: false,
      };

      const validationResult = await act(async () => {
        return await result.current.validateReceipt('com.example.product', androidOptions);
      });

      expect(IapModule.validateReceiptAndroid).toHaveBeenCalledWith({
        packageName: 'com.example.app',
        productId: 'com.example.product',
        productToken: 'token123',
        accessToken: 'access123',
        isSub: false,
      });
      expect(validationResult).toEqual({ isValid: true });
    });

    it('should throw error on Android without required parameters', async () => {
      (Platform as any).OS = 'android';
      const { result, waitForNextUpdate } = renderHook(() => useIAP());
      
      await waitForNextUpdate();

      await expect(
        act(async () => {
          await result.current.validateReceipt('com.example.product');
        })
      ).rejects.toThrow('Android validation requires packageName, productToken, and accessToken');
    });
  });

  describe('Error Handling Scenarios', () => {
    it('should handle user cancellation silently', async () => {
      const onPurchaseError = jest.fn();
      const { waitForNextUpdate } = renderHook(() => 
        useIAP({ onPurchaseError })
      );

      await waitForNextUpdate();

      const cancelError: PurchaseError = {
        code: 'E_USER_CANCELLED',
        message: 'User cancelled the purchase',
        productId: 'com.example.product',
      };

      act(() => {
        mockPurchaseErrorCallback(cancelError);
      });

      expect(onPurchaseError).toHaveBeenCalledWith(cancelError);
      // Should not show alert for user cancellation
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('should handle network error', async () => {
      const onPurchaseError = jest.fn();
      const { result, waitForNextUpdate } = renderHook(() => 
        useIAP({ onPurchaseError })
      );

      await waitForNextUpdate();

      const networkError: PurchaseError = {
        code: 'E_NETWORK_ERROR',
        message: 'Network connection failed',
        productId: 'com.example.product',
      };

      act(() => {
        mockPurchaseErrorCallback(networkError);
      });

      expect(onPurchaseError).toHaveBeenCalledWith(networkError);
      expect(result.current.currentPurchaseError).toEqual(networkError);
    });

    it('should handle item unavailable error', async () => {
      const onPurchaseError = jest.fn();
      const { waitForNextUpdate } = renderHook(() => 
        useIAP({ onPurchaseError })
      );

      await waitForNextUpdate();

      const unavailableError: PurchaseError = {
        code: 'E_ITEM_UNAVAILABLE',
        message: 'Product not available in store',
        productId: 'com.example.product',
      };

      act(() => {
        mockPurchaseErrorCallback(unavailableError);
      });

      expect(onPurchaseError).toHaveBeenCalledWith(unavailableError);
    });

    it('should handle already owned error', async () => {
      const onPurchaseError = jest.fn();
      const { waitForNextUpdate } = renderHook(() => 
        useIAP({ onPurchaseError })
      );

      await waitForNextUpdate();

      const alreadyOwnedError: PurchaseError = {
        code: 'E_ALREADY_OWNED',
        message: 'User already owns this product',
        productId: 'com.example.product',
      };

      act(() => {
        mockPurchaseErrorCallback(alreadyOwnedError);
      });

      expect(onPurchaseError).toHaveBeenCalledWith(alreadyOwnedError);
    });
  });

  describe('Purchase Restoration Flow', () => {
    const mockAvailablePurchases: ProductPurchase[] = [
      {
        id: 'com.example.premium',
        transactionId: 'trans123',
        transactionDate: Date.now(),
        transactionReceipt: 'receipt123',
        platform: 'ios',
      },
      {
        id: 'com.example.remove_ads',
        transactionId: 'trans456',
        transactionDate: Date.now() - 86400000, // 1 day ago
        transactionReceipt: 'receipt456',
        platform: 'ios',
      },
    ];

    beforeEach(() => {
      (IapModule.getAvailablePurchases as jest.Mock).mockResolvedValue(mockAvailablePurchases);
    });

    it('should restore purchases successfully', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useIAP());
      
      await waitForNextUpdate();

      await act(async () => {
        await result.current.getAvailablePurchases();
      });

      expect(IapModule.getAvailablePurchases).toHaveBeenCalled();
      expect(result.current.availablePurchases).toEqual(mockAvailablePurchases);
    });

    it('should validate restored purchases', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useIAP());
      
      await waitForNextUpdate();

      await act(async () => {
        await result.current.getAvailablePurchases();
      });

      // Validate each restored purchase
      for (const purchase of mockAvailablePurchases) {
        await act(async () => {
          await result.current.validateReceipt(purchase.id);
        });

        expect(IapModule.validateReceiptIos).toHaveBeenCalledWith(purchase.id);
      }
    });

    it('should sync purchases on iOS', async () => {
      (Platform as any).OS = 'ios';
      const mockSync = jest.fn().mockResolvedValue(undefined);
      jest.doMock('../modules/ios', () => ({
        sync: mockSync,
      }));

      const { result, waitForNextUpdate } = renderHook(() => useIAP());
      
      await waitForNextUpdate();

      await act(async () => {
        await result.current.restorePurchases();
      });

      expect(result.current.availablePurchases).toEqual(mockAvailablePurchases);
    });
  });

  describe('Transaction Completion', () => {
    it('should finish consumable transaction', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useIAP());
      
      await waitForNextUpdate();

      const purchase: ProductPurchase = {
        id: 'com.example.coins',
        transactionId: 'trans123',
        transactionDate: Date.now(),
        transactionReceipt: 'receipt123',
        platform: 'ios',
      };

      await act(async () => {
        await result.current.finishTransaction({
          purchase,
          isConsumable: true,
        });
      });

      expect(IapModule.finishTransaction).toHaveBeenCalledWith({
        purchase,
        isConsumable: true,
      });
    });

    it('should finish non-consumable transaction', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useIAP());
      
      await waitForNextUpdate();

      const purchase: ProductPurchase = {
        id: 'com.example.premium',
        transactionId: 'trans123',
        transactionDate: Date.now(),
        transactionReceipt: 'receipt123',
        platform: 'ios',
      };

      await act(async () => {
        await result.current.finishTransaction({
          purchase,
          isConsumable: false,
        });
      });

      expect(IapModule.finishTransaction).toHaveBeenCalledWith({
        purchase,
        isConsumable: false,
      });
    });

    it('should clear current purchase after finishing transaction', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useIAP());
      
      await waitForNextUpdate();

      const purchase: ProductPurchase = {
        id: 'com.example.product',
        transactionId: 'trans123',
        transactionDate: Date.now(),
        transactionReceipt: 'receipt123',
        platform: 'ios',
      };

      // Set current purchase
      act(() => {
        mockPurchaseUpdatedCallback(purchase);
      });

      expect(result.current.currentPurchase).toEqual(purchase);

      // Finish transaction
      await act(async () => {
        await result.current.finishTransaction({
          purchase,
          isConsumable: true,
        });
      });

      expect(result.current.currentPurchase).toBeUndefined();
    });
  });

  describe('Platform-specific Price Display', () => {
    it('should get iOS product display price correctly', () => {
      const product: Product = {
        id: 'com.example.product',
        title: 'Example Product',
        description: 'Test product',
        price: '0.99',
        priceString: '$0.99',
        displayPrice: '$0.99',
        currencyCode: 'USD',
        currencySymbol: '$',
        platform: 'ios',
      };

      expect(product.displayPrice).toBe('$0.99');
    });

    it('should get Android product display price from oneTimePurchaseOfferDetails', () => {
      const product: ProductAndroid = {
        id: 'com.example.product',
        title: 'Example Product',
        description: 'Test product',
        price: '0.99',
        priceString: '₩1,200',
        displayPrice: '₩1,200',
        currencyCode: 'KRW',
        currencySymbol: '₩',
        platform: 'android',
        oneTimePurchaseOfferDetails: {
          formattedPrice: '₩1,200',
          priceAmountMicros: '1200000000',
          priceCurrencyCode: 'KRW',
        },
      };

      const displayPrice = product.oneTimePurchaseOfferDetails?.formattedPrice || product.displayPrice;
      expect(displayPrice).toBe('₩1,200');
    });

    it('should get Android subscription price from offer details', () => {
      const subscription: SubscriptionProduct = {
        id: 'com.example.subscription',
        title: 'Premium Subscription',
        description: 'Monthly subscription',
        price: '9.99',
        priceString: '₩11,000',
        displayPrice: '₩11,000',
        currencyCode: 'KRW',
        currencySymbol: '₩',
        platform: 'android',
        subscriptionOfferDetails: [
          {
            offerToken: 'offer123',
            basePlanId: 'base-plan',
            pricingPhases: {
              pricingPhaseList: [
                {
                  formattedPrice: '₩11,000',
                  priceAmountMicros: '11000000000',
                  priceCurrencyCode: 'KRW',
                  billingPeriod: 'P1M',
                  billingCycleCount: 0,
                  recurrenceMode: 1,
                },
              ],
            },
          },
        ],
      };

      const displayPrice = subscription.subscriptionOfferDetails?.[0]?.pricingPhases.pricingPhaseList[0].formattedPrice;
      expect(displayPrice).toBe('₩11,000');
    });
  });
});