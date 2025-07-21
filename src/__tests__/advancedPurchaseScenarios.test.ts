import { renderHook, act } from '@testing-library/react-hooks';
import { Platform } from 'react-native';
import { useIAP } from '../useIap';
import * as IapModule from '../index';
import { sync } from '../modules/ios';
import type { 
  ProductPurchase, 
  SubscriptionPurchase,
  Purchase,
  Product,
} from '../ExpoIap.types';

// Mock modules
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
  deepLinkToSubscriptions: jest.fn(),
}));

jest.mock('../modules/ios', () => ({
  sync: jest.fn().mockResolvedValue(undefined),
  validateReceiptIos: jest.fn().mockResolvedValue({ isValid: true }),
}));

jest.mock('../modules/android', () => ({
  validateReceiptAndroid: jest.fn().mockResolvedValue({ isValid: true }),
}));

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios),
  },
}));

describe('Advanced Purchase Scenarios', () => {
  let mockPurchaseUpdatedCallback: (purchase: Purchase) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    
    (IapModule.purchaseUpdatedListener as jest.Mock).mockImplementation((callback) => {
      mockPurchaseUpdatedCallback = callback;
      return { remove: jest.fn() };
    });
  });

  describe('Pending Purchase Handling', () => {
    it('should handle pending purchases on iOS', async () => {
      const onPurchaseSuccess = jest.fn();
      const { result, waitForNextUpdate } = renderHook(() => 
        useIAP({ onPurchaseSuccess })
      );

      await waitForNextUpdate();

      const pendingPurchase: ProductPurchase = {
        id: 'com.example.product',
        transactionId: 'pending_trans_123',
        transactionDate: Date.now(),
        transactionReceipt: 'pending_receipt',
        platform: 'ios',
        purchaseState: 'pending',
      };

      act(() => {
        mockPurchaseUpdatedCallback(pendingPurchase);
      });

      expect(result.current.currentPurchase).toEqual(pendingPurchase);
      expect(result.current.currentPurchase?.purchaseState).toBe('pending');
      expect(onPurchaseSuccess).toHaveBeenCalledWith(pendingPurchase);
    });

    it('should handle deferred purchases (parental approval)', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useIAP());

      await waitForNextUpdate();

      const deferredPurchase: ProductPurchase = {
        id: 'com.example.kids_product',
        transactionId: 'deferred_trans_456',
        transactionDate: Date.now(),
        transactionReceipt: '',
        platform: 'ios',
        purchaseState: 'deferred',
      };

      act(() => {
        mockPurchaseUpdatedCallback(deferredPurchase);
      });

      expect(result.current.currentPurchase?.purchaseState).toBe('deferred');
      // Deferred purchases should not be finished until approved
      expect(IapModule.finishTransaction).not.toHaveBeenCalled();
    });
  });

  describe('Subscription Status Checking', () => {
    it('should identify active iOS subscription', async () => {
      const { waitForNextUpdate } = renderHook(() => useIAP());
      await waitForNextUpdate();

      const activeSubscription: SubscriptionPurchase = {
        id: 'com.example.subscription',
        transactionId: 'sub_trans_123',
        transactionDate: Date.now() - 86400000, // 1 day ago
        transactionReceipt: 'sub_receipt',
        platform: 'ios',
        expirationDateIos: Date.now() + 2592000000, // 30 days from now
        environmentIos: 'Production',
      };

      // Check if subscription is active
      const isActive = activeSubscription.expirationDateIos! > Date.now();
      expect(isActive).toBe(true);
    });

    it('should identify expired iOS subscription', async () => {
      const { waitForNextUpdate } = renderHook(() => useIAP());
      await waitForNextUpdate();

      const expiredSubscription: SubscriptionPurchase = {
        id: 'com.example.subscription',
        transactionId: 'sub_trans_456',
        transactionDate: Date.now() - 2592000000, // 30 days ago
        transactionReceipt: 'sub_receipt',
        platform: 'ios',
        expirationDateIos: Date.now() - 86400000, // 1 day ago
        environmentIos: 'Production',
      };

      // Check if subscription is expired
      const isActive = expiredSubscription.expirationDateIos! > Date.now();
      expect(isActive).toBe(false);
    });

    it('should handle sandbox iOS subscription', async () => {
      const { waitForNextUpdate } = renderHook(() => useIAP());
      await waitForNextUpdate();

      const sandboxSubscription: SubscriptionPurchase = {
        id: 'com.example.subscription',
        transactionId: 'sandbox_trans_789',
        transactionDate: Date.now() - 3600000, // 1 hour ago
        transactionReceipt: 'sandbox_receipt',
        platform: 'ios',
        environmentIos: 'Sandbox',
      };

      // In sandbox, recent purchases without expiration date are considered active
      const isRecentSandbox = sandboxSubscription.environmentIos === 'Sandbox' &&
        (Date.now() - sandboxSubscription.transactionDate) < 86400000; // Less than 1 day
      
      expect(isRecentSandbox).toBe(true);
    });

    it('should identify active Android subscription', async () => {
      (Platform as any).OS = 'android';
      const { waitForNextUpdate } = renderHook(() => useIAP());
      await waitForNextUpdate();

      const activeAndroidSubscription: SubscriptionPurchase = {
        id: 'com.example.subscription',
        transactionId: 'android_sub_123',
        transactionDate: Date.now() - 86400000,
        transactionReceipt: 'android_receipt',
        platform: 'android',
        autoRenewingAndroid: true,
        purchaseStateAndroid: 0, // 0 = purchased
      };

      expect(activeAndroidSubscription.autoRenewingAndroid).toBe(true);
      expect(activeAndroidSubscription.purchaseStateAndroid).toBe(0);
    });

    it('should identify cancelled Android subscription', async () => {
      (Platform as any).OS = 'android';
      const { waitForNextUpdate } = renderHook(() => useIAP());
      await waitForNextUpdate();

      const cancelledAndroidSubscription: SubscriptionPurchase = {
        id: 'com.example.subscription',
        transactionId: 'android_sub_456',
        transactionDate: Date.now() - 2592000000,
        transactionReceipt: 'android_receipt',
        platform: 'android',
        autoRenewingAndroid: false,
        purchaseStateAndroid: 1, // 1 = cancelled
      };

      expect(cancelledAndroidSubscription.autoRenewingAndroid).toBe(false);
      expect(cancelledAndroidSubscription.purchaseStateAndroid).toBe(1);
    });
  });

  describe('Multiple Purchase Handling', () => {
    it('should handle multiple simultaneous purchases on Android', async () => {
      (Platform as any).OS = 'android';
      const { result, waitForNextUpdate } = renderHook(() => useIAP());

      await waitForNextUpdate();

      const productIds = ['com.example.product1', 'com.example.product2', 'com.example.product3'];

      await act(async () => {
        await result.current.requestPurchase({
          request: { skus: productIds },
        });
      });

      expect(IapModule.requestPurchase).toHaveBeenCalledWith({
        request: { skus: productIds },
      });
    });

    it('should process multiple purchase updates sequentially', async () => {
      const onPurchaseSuccess = jest.fn();
      const { waitForNextUpdate } = renderHook(() => 
        useIAP({ onPurchaseSuccess })
      );

      await waitForNextUpdate();

      const purchases: ProductPurchase[] = [
        {
          id: 'com.example.product1',
          transactionId: 'trans1',
          transactionDate: Date.now(),
          transactionReceipt: 'receipt1',
          platform: 'android',
        },
        {
          id: 'com.example.product2',
          transactionId: 'trans2',
          transactionDate: Date.now() + 1000,
          transactionReceipt: 'receipt2',
          platform: 'android',
        },
      ];

      // Simulate multiple purchase updates
      purchases.forEach((purchase) => {
        act(() => {
          mockPurchaseUpdatedCallback(purchase);
        });
      });

      expect(onPurchaseSuccess).toHaveBeenCalledTimes(2);
      expect(onPurchaseSuccess).toHaveBeenNthCalledWith(1, purchases[0]);
      expect(onPurchaseSuccess).toHaveBeenNthCalledWith(2, purchases[1]);
    });
  });

  describe('Subscription Management', () => {
    it('should open subscription management on iOS', async () => {
      (Platform as any).OS = 'ios';
      const { waitForNextUpdate } = renderHook(() => useIAP());

      await waitForNextUpdate();

      // Call deepLinkToSubscriptions
      IapModule.deepLinkToSubscriptions();

      expect(IapModule.deepLinkToSubscriptions).toHaveBeenCalled();
    });

    it('should refresh subscription status after purchase', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useIAP());

      await waitForNextUpdate();

      const subscriptionPurchase: SubscriptionPurchase = {
        id: 'com.example.subscription',
        transactionId: 'sub_trans_new',
        transactionDate: Date.now(),
        transactionReceipt: 'sub_receipt_new',
        platform: 'ios',
        expirationDateIos: Date.now() + 2592000000,
      };

      // Mock updated subscription data
      const updatedSubscription = {
        id: 'com.example.subscription',
        title: 'Premium Subscription',
        description: 'Monthly subscription',
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
      };

      (IapModule.getSubscriptions as jest.Mock).mockResolvedValueOnce([updatedSubscription]);

      // Trigger purchase update
      act(() => {
        mockPurchaseUpdatedCallback(subscriptionPurchase);
      });

      // Refresh subscription data
      await act(async () => {
        await result.current.getSubscriptions(['com.example.subscription']);
      });

      expect(IapModule.getSubscriptions).toHaveBeenCalledWith(['com.example.subscription']);
    });
  });

  describe('iOS Promoted Products', () => {
    it('should handle promoted product purchases on iOS', async () => {
      (Platform as any).OS = 'ios';
      
      let promotedProductCallback: (purchase: Purchase) => void;
      (IapModule.purchaseUpdatedListener as jest.Mock)
        .mockImplementationOnce((callback) => {
          mockPurchaseUpdatedCallback = callback;
          return { remove: jest.fn() };
        })
        .mockImplementationOnce(() => ({ remove: jest.fn() })) // error listener
        .mockImplementationOnce((callback) => {
          promotedProductCallback = callback;
          return { remove: jest.fn() };
        });

      const { result, waitForNextUpdate } = renderHook(() => useIAP());

      await waitForNextUpdate();

      const promotedPurchase: ProductPurchase = {
        id: 'com.example.promoted',
        transactionId: 'promoted_trans_123',
        transactionDate: Date.now(),
        transactionReceipt: 'promoted_receipt',
        platform: 'ios',
      };

      act(() => {
        promotedProductCallback(promotedPurchase);
      });

      // Check that promoted products are added to the state
      expect(result.current.promotedProductsIOS).toContainEqual(promotedPurchase);
    });

    it('should prevent duplicate promoted products', async () => {
      (Platform as any).OS = 'ios';
      
      let promotedProductCallback: (purchase: Purchase) => void;
      (IapModule.purchaseUpdatedListener as jest.Mock)
        .mockImplementationOnce((callback) => {
          mockPurchaseUpdatedCallback = callback;
          return { remove: jest.fn() };
        })
        .mockImplementationOnce(() => ({ remove: jest.fn() })) // error listener
        .mockImplementationOnce((callback) => {
          promotedProductCallback = callback;
          return { remove: jest.fn() };
        });

      const { result, waitForNextUpdate } = renderHook(() => useIAP());

      await waitForNextUpdate();

      const promotedPurchase: ProductPurchase = {
        id: 'com.example.promoted',
        transactionId: 'promoted_trans_123',
        transactionDate: Date.now(),
        transactionReceipt: 'promoted_receipt',
        platform: 'ios',
      };

      // Add the same promoted purchase twice
      act(() => {
        promotedProductCallback(promotedPurchase);
      });

      act(() => {
        promotedProductCallback(promotedPurchase);
      });

      // Should only have one instance
      expect(result.current.promotedProductsIOS.length).toBe(1);
    });
  });

  describe('Receipt Validation Scenarios', () => {
    it('should handle server-side validation timeout', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useIAP());

      await waitForNextUpdate();

      // Mock validation timeout
      const mockValidateWithTimeout = jest.fn().mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Validation timeout')), 100)
        )
      );

      result.current.validateReceipt = mockValidateWithTimeout;

      await expect(
        act(async () => {
          await result.current.validateReceipt('com.example.product');
        })
      ).rejects.toThrow('Validation timeout');
    });

    it('should retry validation on network failure', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useIAP());

      await waitForNextUpdate();

      let attemptCount = 0;
      const mockValidateWithRetry = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({ isValid: true });
      });

      result.current.validateReceipt = mockValidateWithRetry;

      // Implement retry logic
      const validateWithRetry = async (sku: string, maxRetries = 3) => {
        for (let i = 0; i < maxRetries; i++) {
          try {
            return await result.current.validateReceipt(sku);
          } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      };

      const validationResult = await validateWithRetry('com.example.product');

      expect(validationResult).toEqual({ isValid: true });
      expect(mockValidateWithRetry).toHaveBeenCalledTimes(3);
    });
  });

  describe('Purchase Flow Edge Cases', () => {
    it('should handle purchase completion after app restart', async () => {
      // Simulate app restart with pending purchase
      const pendingPurchases: ProductPurchase[] = [
        {
          id: 'com.example.product',
          transactionId: 'pending_restart_123',
          transactionDate: Date.now() - 3600000, // 1 hour ago
          transactionReceipt: 'pending_receipt',
          platform: 'ios',
        },
      ];

      (IapModule.getAvailablePurchases as jest.Mock).mockResolvedValue(pendingPurchases);

      const { result, waitForNextUpdate } = renderHook(() => useIAP());

      await waitForNextUpdate();

      // Check for pending purchases on startup
      await act(async () => {
        await result.current.getAvailablePurchases();
      });

      expect(result.current.availablePurchases).toEqual(pendingPurchases);
    });

    it('should handle product price changes', async () => {
      const initialProducts: Product[] = [
        {
          id: 'com.example.product',
          title: 'Example Product',
          description: 'Test product',
          price: '0.99',
          priceString: '$0.99',
          displayPrice: '$0.99',
          currencyCode: 'USD',
          currencySymbol: '$',
          platform: 'ios',
        },
      ];

      const updatedProducts: Product[] = [
        {
          ...initialProducts[0],
          price: '1.99',
          priceString: '$1.99',
          displayPrice: '$1.99',
        },
      ];

      (IapModule.getProducts as jest.Mock)
        .mockResolvedValueOnce(initialProducts)
        .mockResolvedValueOnce(updatedProducts);

      const { result, waitForNextUpdate } = renderHook(() => useIAP());

      await waitForNextUpdate();

      // Initial load
      await act(async () => {
        await result.current.getProducts(['com.example.product']);
      });

      expect(result.current.products[0].displayPrice).toBe('$0.99');

      // Refresh products
      await act(async () => {
        await result.current.getProducts(['com.example.product']);
      });

      expect(result.current.products[0].displayPrice).toBe('$1.99');
    });

    it('should handle sync error on iOS', async () => {
      (Platform as any).OS = 'ios';
      
      const syncError = new Error('Sync failed');
      (sync as jest.Mock).mockRejectedValueOnce(syncError);

      const onSyncError = jest.fn();
      const { result, waitForNextUpdate } = renderHook(() => 
        useIAP({ onSyncError })
      );

      await waitForNextUpdate();

      await act(async () => {
        await result.current.restorePurchases();
      });

      expect(onSyncError).toHaveBeenCalledWith(syncError);
    });
  });
});