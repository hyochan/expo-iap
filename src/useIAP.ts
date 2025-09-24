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
} from './index';
import {
  getPromotedProductIOS,
  requestPurchaseOnPromotedProductIOS,
  syncIOS,
} from './modules/ios';

// Types
import type {
  Product,
  ProductSubscription,
  ProductQueryType,
  ProductRequest,
  Purchase,
  MutationRequestPurchaseArgs,
  PurchaseInput,
  ReceiptValidationProps,
  ReceiptValidationResult,
} from './types';
import {ErrorCode} from './types';
import type {PurchaseError} from './utils/errorMapping';
import {
  getUserFriendlyErrorMessage,
  isUserCancelledError,
  isRecoverableError,
} from './utils/errorMapping';

type UseIap = {
  connected: boolean;
  products: Product[];
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
  }) => Promise<void>;
  getAvailablePurchases: () => Promise<void>;
  fetchProducts: (params: {
    skus: string[];
    type?: ProductTypeInput;
  }) => Promise<void>;

  requestPurchase: (
    params: MutationRequestPurchaseArgs,
  ) => ReturnType<typeof requestPurchaseInternal>;
  validateReceipt: (
    props: ReceiptValidationProps,
  ) => Promise<ReceiptValidationResult>;
  restorePurchases: () => Promise<void>;
  getPromotedProductIOS: () => Promise<Product | null>;
  requestPurchaseOnPromotedProductIOS: () => Promise<boolean>;
  getActiveSubscriptions: (subscriptionIds?: string[]) => Promise<void>;
  hasActiveSubscriptions: (subscriptionIds?: string[]) => Promise<boolean>;
};

export interface UseIAPOptions {
  onPurchaseSuccess?: (purchase: Purchase) => void;
  onPurchaseError?: (error: PurchaseError) => void;
  onPromotedProductIOS?: (product: Product) => void;
}

/**
 * React Hook for managing In-App Purchases.
 * See documentation at https://hyochan.github.io/expo-iap/docs/hooks/useIAP
 */
export function useIAP(options?: UseIAPOptions): UseIap {
  const [connected, setConnected] = useState<boolean>(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [subscriptions, setSubscriptions] = useState<ProductSubscription[]>([]);

  const [availablePurchases, setAvailablePurchases] = useState<Purchase[]>([]);
  const [promotedProductIOS, setPromotedProductIOS] = useState<Product>();
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
    promotedProductIOS?: EventSubscription;
  }>({});

  const subscriptionsRefState = useRef<ProductSubscription[]>([]);

  useEffect(() => {
    subscriptionsRefState.current = subscriptions;
  }, [subscriptions]);

  const normalizeProductQueryType = useCallback(
    (type?: ProductTypeInput): ProductQueryType => {
      if (!type || type === 'inapp' || type === 'in-app') {
        return 'in-app';
      }
      return type;
    },
    [],
  );

  const canonicalProductType = useCallback(
    (value?: string): ProductQueryType => {
      if (!value) {
        return 'in-app';
      }
      const normalized = value.trim().toLowerCase().replace(/[_-]/g, '');
      return normalized === 'subs' ? 'subs' : 'in-app';
    },
    [],
  );

  const toPurchaseInput = useCallback(
    (purchase: Purchase): PurchaseInput => ({
      id: purchase.id,
      ids: purchase.ids ?? undefined,
      isAutoRenewing: purchase.isAutoRenewing,
      platform: purchase.platform,
      productId: purchase.productId,
      purchaseState: purchase.purchaseState,
      purchaseToken: purchase.purchaseToken ?? null,
      quantity: purchase.quantity,
      transactionDate: purchase.transactionDate,
    }),
    [],
  );

  const fetchProductsInternal = useCallback(
    async (params: {
      skus: string[];
      type?: ProductTypeInput;
    }): Promise<void> => {
      try {
        const queryType = normalizeProductQueryType(params.type);
        const request: ProductRequest = {skus: params.skus, type: queryType};
        const result = await fetchProducts(request);
        const items = (result ?? []) as (Product | ProductSubscription)[];

        if (queryType === 'subs') {
          const subscriptionsResult = items as ProductSubscription[];
          setSubscriptions((prevSubscriptions) =>
            mergeWithDuplicateCheck(
              prevSubscriptions,
              subscriptionsResult,
              (subscription) => subscription.id,
            ),
          );
        } else if (queryType === 'in-app') {
          const productsResult = items as Product[];
          setProducts((prevProducts) =>
            mergeWithDuplicateCheck(
              prevProducts,
              productsResult,
              (product) => product.id,
            ),
          );
        } else {
          const productItems = items.filter(
            (item) => canonicalProductType(item.type as string) === 'in-app',
          ) as Product[];
          const subscriptionItems = items.filter(
            (item) => canonicalProductType(item.type as string) === 'subs',
          ) as ProductSubscription[];

          setProducts((prevProducts) =>
            mergeWithDuplicateCheck(
              prevProducts,
              productItems,
              (product) => product.id,
            ),
          );

          setSubscriptions((prevSubscriptions) =>
            mergeWithDuplicateCheck(
              prevSubscriptions,
              subscriptionItems,
              (subscription) => subscription.id,
            ),
          );
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    },
    [canonicalProductType, mergeWithDuplicateCheck, normalizeProductQueryType],
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
    async ({
      purchase,
      isConsumable,
    }: {
      purchase: Purchase;
      isConsumable?: boolean;
    }): Promise<void> => {
      await finishTransactionInternal({
        purchase: toPurchaseInput(purchase),
        isConsumable,
      });
    },
    [toPurchaseInput],
  );

  const requestPurchaseWithReset = useCallback(
    (requestObj: MutationRequestPurchaseArgs) => {
      return requestPurchaseInternal(requestObj);
    },
    [],
  );

  const refreshSubscriptionStatus = useCallback(
    async (productId: string) => {
      try {
        if (subscriptionsRefState.current.some((sub) => sub.id === productId)) {
          await fetchProductsInternal({skus: [productId], type: 'subs'});
          await getAvailablePurchasesInternal();
        }
      } catch (error) {
        console.warn('Failed to refresh subscription status:', error);
      }
    },
    [fetchProductsInternal, getAvailablePurchasesInternal],
  );

  // Restore completed transactions with cross-platform behavior.
  // iOS: best-effort sync (ignore sync errors) then fetch available purchases.
  // Android: fetch available purchases directly.
  const restorePurchasesInternal = useCallback(async (): Promise<void> => {
    try {
      // iOS: Try to sync first, but don't fail if sync errors occur
      if (Platform.OS === 'ios') {
        await syncIOS().catch(() => undefined); // syncIOS returns Promise<boolean>, we don't need the result
      }

      const purchases = await getAvailablePurchases({
        alsoPublishToEventListenerIOS: false,
        onlyIncludeActiveItemsIOS: true,
      });
      setAvailablePurchases(purchases);
    } catch (error) {
      console.warn('Failed to restore purchases:', error);
    }
  }, []);

  const validateReceipt = useCallback(async (props: ReceiptValidationProps) => {
    return validateReceiptInternal(props);
  }, []);

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
      subscriptionsRef.current.promotedProductIOS = promotedProductListenerIOS(
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
      subscriptionsRef.current.promotedProductIOS?.remove();
      subscriptionsRef.current.purchaseUpdate = undefined;
      subscriptionsRef.current.promotedProductIOS = undefined;
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
      currentSubscriptions.promotedProductIOS?.remove();
      endConnection();
      setConnected(false);
    };
  }, [initIapWithSubscriptions]);

  return {
    connected,
    products,
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
