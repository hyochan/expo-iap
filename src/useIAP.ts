// External dependencies
import {useCallback, useEffect, useState, useRef} from 'react';
import {Platform} from 'react-native';
import {EventSubscription} from 'expo-modules-core';

// Internal modules
import {
  endConnection,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  promotedProductListenerIOS,
  getAvailablePurchases,
  finishTransaction as finishTransactionInternal,
  requestPurchase as requestPurchaseInternal,
  fetchProducts,
  validateReceipt as validateReceiptInternal,
  getActiveSubscriptions,
  hasActiveSubscriptions,
  type ActiveSubscription,
  type ProductTypeInput,
  type PurchaseRequestInput,
  restorePurchases,
} from './index';
import {
  getPromotedProductIOS,
  requestPurchaseOnPromotedProductIOS,
} from './modules/ios';

// Types
import {
  Product,
  Purchase,
  ProductSubscription,
  ErrorCode,
  VoidResult,
  ReceiptValidationResult,
} from './types';
import {PurchaseError} from './purchase-error';
import {
  getUserFriendlyErrorMessage,
  isUserCancelledError,
  isRecoverableError,
} from './utils/errorMapping';

type UseIap = {
  connected: boolean;
  products: Product[];
  promotedProductsIOS: Purchase[];
  promotedProductIdIOS?: string;
  subscriptions: ProductSubscription[];
  availablePurchases: Purchase[];
  promotedProductIOS?: Product;
  activeSubscriptions: ActiveSubscription[];
  finishTransaction: ({
    purchase,
    isConsumable,
  }: {
    purchase: Purchase;
    isConsumable?: boolean;
  }) => Promise<VoidResult | boolean>;
  getAvailablePurchases: () => Promise<void>;
  fetchProducts: (params: {
    skus: string[];
    type?: ProductTypeInput;
  }) => Promise<void>;

  requestPurchase: (
    params: PurchaseRequestInput,
  ) => ReturnType<typeof requestPurchaseInternal>;
  validateReceipt: (
    sku: string,
    androidOptions?: {
      packageName: string;
      productToken: string;
      accessToken: string;
      isSub?: boolean;
    },
  ) => Promise<ReceiptValidationResult>;
  restorePurchases: () => Promise<void>;
  getPromotedProductIOS: () => Promise<Product | null>;
  requestPurchaseOnPromotedProductIOS: () => Promise<void>;
  getActiveSubscriptions: (subscriptionIds?: string[]) => Promise<void>;
  hasActiveSubscriptions: (subscriptionIds?: string[]) => Promise<boolean>;
};

export interface UseIAPOptions {
  onPurchaseSuccess?: (purchase: Purchase) => void;
  onPurchaseError?: (error: PurchaseError) => void;
  onSyncError?: (error: Error) => void;
  shouldAutoSyncPurchases?: boolean; // New option to control auto-syncing
  onPromotedProductIOS?: (product: Product) => void;
}

/**
 * React Hook for managing In-App Purchases.
 * See documentation at https://hyochan.github.io/expo-iap/docs/hooks/useIAP
 */
export function useIAP(options?: UseIAPOptions): UseIap {
  const [connected, setConnected] = useState<boolean>(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [promotedProductsIOS] = useState<Purchase[]>([]);
  const [subscriptions, setSubscriptions] = useState<ProductSubscription[]>([]);

  const [availablePurchases, setAvailablePurchases] = useState<Purchase[]>([]);
  const [promotedProductIOS, setPromotedProductIOS] = useState<Product>();
  const [promotedProductIdIOS] = useState<string>();
  const [activeSubscriptions, setActiveSubscriptions] = useState<
    ActiveSubscription[]
  >([]);

  const optionsRef = useRef<UseIAPOptions | undefined>(options);
  const connectedRef = useRef<boolean>(false);

  // Helper function to merge arrays with duplicate checking
  const mergeWithDuplicateCheck = useCallback(
    <T>(
      existingItems: T[],
      newItems: T[],
      getKey: (item: T) => string,
    ): T[] => {
      const merged = [...existingItems];
      newItems.forEach((newItem) => {
        const isDuplicate = merged.some(
          (existingItem) => getKey(existingItem) === getKey(newItem),
        );
        if (!isDuplicate) {
          merged.push(newItem);
        }
      });
      return merged;
    },
    [],
  );

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    connectedRef.current = connected;
  }, [connected]);

  const subscriptionsRef = useRef<{
    purchaseUpdate?: EventSubscription;
    purchaseError?: EventSubscription;
    promotedProductsIOS?: EventSubscription;
    promotedProductIOS?: EventSubscription;
  }>({});

  const subscriptionsRefState = useRef<ProductSubscription[]>([]);

  useEffect(() => {
    subscriptionsRefState.current = subscriptions;
  }, [subscriptions]);

  const getSubscriptionsInternal = useCallback(
    async (skus: string[]): Promise<void> => {
      try {
        const result = await fetchProducts({skus, type: 'subs'});
        setSubscriptions((prevSubscriptions) =>
          mergeWithDuplicateCheck(
            prevSubscriptions,
            result as ProductSubscription[],
            (subscription) => subscription.id,
          ),
        );
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
      }
    },
    [mergeWithDuplicateCheck],
  );

  const fetchProductsInternal = useCallback(
    async (params: {
      skus: string[];
      type?: ProductTypeInput;
    }): Promise<void> => {
      try {
        const result = await fetchProducts(params);

        if (params.type === 'subs') {
          setSubscriptions((prevSubscriptions) =>
            mergeWithDuplicateCheck(
              prevSubscriptions,
              result as ProductSubscription[],
              (subscription) => subscription.id,
            ),
          );
        } else {
          setProducts((prevProducts) =>
            mergeWithDuplicateCheck(
              prevProducts,
              result as Product[],
              (product) => product.id,
            ),
          );
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    },
    [mergeWithDuplicateCheck],
  );

  const getAvailablePurchasesInternal = useCallback(async (): Promise<void> => {
    try {
      const result = await getAvailablePurchases({
        alsoPublishToEventListenerIOS: false,
        onlyIncludeActiveItemsIOS: true,
      });
      setAvailablePurchases(result);
    } catch (error) {
      console.error('Error fetching available purchases:', error);
    }
  }, []);

  const getActiveSubscriptionsInternal = useCallback(
    async (subscriptionIds?: string[]): Promise<void> => {
      try {
        const result = await getActiveSubscriptions(subscriptionIds);
        setActiveSubscriptions(result);
      } catch (error) {
        console.error('Error getting active subscriptions:', error);
        // Preserve existing state on error
      }
    },
    [],
  );

  const hasActiveSubscriptionsInternal = useCallback(
    async (subscriptionIds?: string[]): Promise<boolean> => {
      try {
        return await hasActiveSubscriptions(subscriptionIds);
      } catch (error) {
        console.error('Error checking active subscriptions:', error);
        return false;
      }
    },
    [],
  );

  const finishTransaction = useCallback(
    ({
      purchase,
      isConsumable,
    }: {
      purchase: Purchase;
      isConsumable?: boolean;
    }): Promise<VoidResult | boolean> => {
      return finishTransactionInternal({
        purchase,
        isConsumable,
      });
    },
    [],
  );

  const requestPurchaseWithReset = useCallback(
    (requestObj: PurchaseRequestInput) => {
      return requestPurchaseInternal(requestObj);
    },
    [],
  );

  const refreshSubscriptionStatus = useCallback(
    async (productId: string) => {
      try {
        if (subscriptionsRefState.current.some((sub) => sub.id === productId)) {
          await getSubscriptionsInternal([productId]);
          await getAvailablePurchasesInternal();
        }
      } catch (error) {
        console.warn('Failed to refresh subscription status:', error);
      }
    },
    [getAvailablePurchasesInternal, getSubscriptionsInternal],
  );

  // Restore completed transactions with cross-platform behavior.
  // iOS: best-effort sync (ignore sync errors) then fetch available purchases.
  // Android: fetch available purchases directly.
  const restorePurchasesInternal = useCallback(async (): Promise<void> => {
    try {
      const purchases = await restorePurchases({
        alsoPublishToEventListenerIOS: false,
        onlyIncludeActiveItemsIOS: true,
      });
      setAvailablePurchases(purchases);
    } catch (error) {
      console.warn('Failed to restore purchases:', error);
    }
  }, []);

  const validateReceipt = useCallback(
    async (
      sku: string,
      androidOptions?: {
        packageName: string;
        productToken: string;
        accessToken: string;
        isSub?: boolean;
      },
    ) => {
      return validateReceiptInternal(sku, androidOptions);
    },
    [],
  );

  const initIapWithSubscriptions = useCallback(async (): Promise<void> => {
    // CRITICAL: Register listeners BEFORE initConnection to avoid race condition
    // Events might fire immediately after initConnection, so listeners must be ready
    // Register purchase update listener BEFORE initConnection to avoid race conditions.
    subscriptionsRef.current.purchaseUpdate = purchaseUpdatedListener(
      async (purchase: Purchase) => {
        if ('expirationDateIOS' in purchase) {
          await refreshSubscriptionStatus(purchase.id);
        }

        if (optionsRef.current?.onPurchaseSuccess) {
          optionsRef.current.onPurchaseSuccess(purchase);
        }
      },
    );

    // Register purchase error listener EARLY. Ignore init-related errors until connected.
    subscriptionsRef.current.purchaseError = purchaseErrorListener(
      (error: PurchaseError) => {
        if (!connectedRef.current && error.code === ErrorCode.InitConnection) {
          return; // Ignore initialization error before connected
        }
        const friendly = getUserFriendlyErrorMessage(error);
        if (!isUserCancelledError(error) && !isRecoverableError(error)) {
          console.warn('[useIAP] Purchase error:', friendly);
        }

        if (optionsRef.current?.onPurchaseError) {
          optionsRef.current.onPurchaseError(error);
        }
      },
    );

    if (Platform.OS === 'ios') {
      // iOS promoted products listener
      subscriptionsRef.current.promotedProductsIOS = promotedProductListenerIOS(
        (product: Product) => {
          setPromotedProductIOS(product);

          if (optionsRef.current?.onPromotedProductIOS) {
            optionsRef.current.onPromotedProductIOS(product);
          }
        },
      );
    }

    // NOW call initConnection after listeners are ready
    const result = await initConnection();
    setConnected(result);
    if (!result) {
      // If connection failed, clean up listeners
      console.warn('[useIAP] Connection failed, cleaning up listeners...');
      subscriptionsRef.current.purchaseUpdate?.remove();
      subscriptionsRef.current.promotedProductsIOS?.remove();
      subscriptionsRef.current.purchaseUpdate = undefined;
      subscriptionsRef.current.promotedProductsIOS = undefined;
      // Keep purchaseError listener registered to capture subsequent retries
      return;
    }
  }, [refreshSubscriptionStatus]);

  useEffect(() => {
    initIapWithSubscriptions();
    const currentSubscriptions = subscriptionsRef.current;

    return () => {
      currentSubscriptions.purchaseUpdate?.remove();
      currentSubscriptions.purchaseError?.remove();
      currentSubscriptions.promotedProductsIOS?.remove();
      currentSubscriptions.promotedProductIOS?.remove();
      endConnection();
      setConnected(false);
    };
  }, [initIapWithSubscriptions]);

  return {
    connected,
    products,
    promotedProductsIOS,
    promotedProductIdIOS,
    subscriptions,
    finishTransaction,
    availablePurchases,
    promotedProductIOS,
    activeSubscriptions,
    getAvailablePurchases: getAvailablePurchasesInternal,
    fetchProducts: fetchProductsInternal,
    requestPurchase: requestPurchaseWithReset,
    validateReceipt,
    restorePurchases: restorePurchasesInternal,
    // internal getters kept for hook state management
    getPromotedProductIOS,
    requestPurchaseOnPromotedProductIOS,
    getActiveSubscriptions: getActiveSubscriptionsInternal,
    hasActiveSubscriptions: hasActiveSubscriptionsInternal,
  };
}
