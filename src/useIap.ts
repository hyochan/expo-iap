import {
  endConnection,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  transactionUpdatedIos,
  getProducts,
  getAvailablePurchases,
  getPurchaseHistory,
  finishTransaction as finishTransactionInternal,
  getSubscriptions,
  requestPurchase as requestPurchaseInternal,
  sync,
} from './';
import {useCallback, useEffect, useState, useRef} from 'react';
import {
  Product,
  ProductPurchase,
  Purchase,
  PurchaseError,
  PurchaseResult,
  SubscriptionProduct,
  SubscriptionPurchase,
} from './ExpoIap.types';
import {TransactionEvent} from './modules/ios';
import {Subscription} from 'expo-modules-core';
import {Platform} from 'react-native';

type UseIap = {
  connected: boolean;
  products: Product[];
  promotedProductsIOS: ProductPurchase[];
  subscriptions: SubscriptionProduct[];
  purchaseHistories: ProductPurchase[];
  availablePurchases: ProductPurchase[];
  currentPurchase?: ProductPurchase;
  currentPurchaseError?: PurchaseError;
  clearCurrentPurchase: () => void;
  clearCurrentPurchaseError: () => void;
  finishTransaction: ({
    purchase,
    isConsumable,
  }: {
    purchase: Purchase;
    isConsumable?: boolean;
  }) => Promise<string | boolean | PurchaseResult | void>;
  getAvailablePurchases: (skus: string[]) => Promise<void>;
  getPurchaseHistories: (skus: string[]) => Promise<void>;
  getProducts: (skus: string[]) => Promise<void>;
  getSubscriptions: (skus: string[]) => Promise<void>;
  requestPurchase: typeof requestPurchaseInternal;
};

export interface UseIAPOptions {
  onPurchaseSuccess?: (purchase: ProductPurchase | SubscriptionPurchase) => void;
  onPurchaseError?: (error: PurchaseError) => void;
  onSyncError?: (error: Error) => void;
}

export function useIAP(options?: UseIAPOptions): UseIap {
  const [connected, setConnected] = useState<boolean>(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [promotedProductsIOS, setPromotedProductsIOS] = useState<
    ProductPurchase[]
  >([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionProduct[]>([]);
  const [purchaseHistories, setPurchaseHistories] = useState<ProductPurchase[]>(
    [],
  );
  const [availablePurchases, setAvailablePurchases] = useState<
    ProductPurchase[]
  >([]);
  const [currentPurchase, setCurrentPurchase] = useState<ProductPurchase>();
  const [currentPurchaseError, setCurrentPurchaseError] =
    useState<PurchaseError>();

  const optionsRef = useRef<UseIAPOptions | undefined>(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const subscriptionsRef = useRef<{
    purchaseUpdate?: Subscription;
    purchaseError?: Subscription;
    promotedProductsIos?: Subscription;
  }>({});

  const clearCurrentPurchase = useCallback(() => {
    setCurrentPurchase(undefined);
  }, []);

  const clearCurrentPurchaseError = useCallback(() => {
    setCurrentPurchaseError(undefined);
  }, []);

  const getProductsInternal = useCallback(
    async (skus: string[]): Promise<void> => {
      setProducts(await getProducts(skus));
    },
    [],
  );

  const getSubscriptionsInternal = useCallback(
    async (skus: string[]): Promise<void> => {
      setSubscriptions(await getSubscriptions(skus));
    },
    [],
  );

  const getAvailablePurchasesInternal = useCallback(async (): Promise<void> => {
    setAvailablePurchases(await getAvailablePurchases());
  }, []);

  const getPurchaseHistoriesInternal = useCallback(async (): Promise<void> => {
    setPurchaseHistories(await getPurchaseHistory());
  }, []);

  const finishTransaction = useCallback(
    async ({
      purchase,
      isConsumable,
    }: {
      purchase: ProductPurchase;
      isConsumable?: boolean;
    }): Promise<string | boolean | PurchaseResult | void> => {
      try {
        return await finishTransactionInternal({
          purchase,
          isConsumable,
        });
      } catch (err) {
        throw err;
      } finally {
        if (purchase.id === currentPurchase?.id) {
          clearCurrentPurchase();
        }
        if (purchase.id === currentPurchaseError?.productId) {
          clearCurrentPurchaseError();
        }
      }
    },
    [currentPurchase?.id, currentPurchaseError?.productId, clearCurrentPurchase, clearCurrentPurchaseError],
  );

  const requestPurchaseWithReset = useCallback(
    async (requestObj: Parameters<typeof requestPurchaseInternal>[0]) => {
      clearCurrentPurchase();
      clearCurrentPurchaseError();
      
      try {
        return await requestPurchaseInternal(requestObj);
      } catch (error) {
        throw error;
      }
    },
    [clearCurrentPurchase, clearCurrentPurchaseError],
  );

  const refreshSubscriptionStatus = useCallback(async (productId: string) => {
    try {
      if (Platform.OS === 'ios') {
        await sync().catch((error) => {
          // Pass the error to the developer's handler if provided
          if (optionsRef.current?.onSyncError) {
            optionsRef.current.onSyncError(error);
          } else {
            // Fallback to original behavior
            console.warn('Sync error occurred. This might require user password:', error);
          }
        });
      }
      
      if (subscriptions.some(sub => sub.id === productId)) {
        await getSubscriptionsInternal([productId]);
        await getAvailablePurchasesInternal();
      }
    } catch (error) {
      console.warn('Failed to refresh subscription status:', error);
    }
  }, [getSubscriptionsInternal, getAvailablePurchasesInternal, subscriptions]);

  const initIapWithSubscriptions = useCallback(async (): Promise<void> => {
    const result = await initConnection();
    setConnected(result);

    if (result) {
      subscriptionsRef.current.purchaseUpdate = purchaseUpdatedListener(
        async (purchase: Purchase | SubscriptionPurchase) => {
          setCurrentPurchaseError(undefined);
          setCurrentPurchase(purchase);

          if ('expirationDateIos' in purchase) {
            await refreshSubscriptionStatus(purchase.id);
          }

          if (optionsRef.current?.onPurchaseSuccess) {
            optionsRef.current.onPurchaseSuccess(purchase);
          }
        },
      );

      subscriptionsRef.current.purchaseError = purchaseErrorListener(
        (error: PurchaseError) => {
          setCurrentPurchase(undefined);
          setCurrentPurchaseError(error);

          if (optionsRef.current?.onPurchaseError) {
            optionsRef.current.onPurchaseError(error);
          }
        },
      );

      if (Platform.OS === 'ios') {
        subscriptionsRef.current.promotedProductsIos = transactionUpdatedIos(
          async (event: TransactionEvent) => {
            if (event.transaction) {
              setPromotedProductsIOS((prevProducts) => 
                [...prevProducts, event.transaction!]
              );
              
              if ('expirationDateIos' in event.transaction) {
                await refreshSubscriptionStatus(event.transaction.id);
              }
            }
          },
        );
      }
    }
  }, [refreshSubscriptionStatus]);

  useEffect(() => {
    initIapWithSubscriptions();
    const currentSubscriptions = subscriptionsRef.current;

    return () => {
      currentSubscriptions.purchaseUpdate?.remove();
      currentSubscriptions.purchaseError?.remove();
      currentSubscriptions.promotedProductsIos?.remove();
      endConnection();
      setConnected(false);
    };
  }, [initIapWithSubscriptions]);

  return {
    connected,
    products,
    promotedProductsIOS,
    subscriptions,
    purchaseHistories,
    finishTransaction,
    availablePurchases,
    currentPurchase,
    currentPurchaseError,
    clearCurrentPurchase,
    clearCurrentPurchaseError,
    getAvailablePurchases: getAvailablePurchasesInternal,
    getPurchaseHistories: getPurchaseHistoriesInternal,
    getProducts: getProductsInternal,
    getSubscriptions: getSubscriptionsInternal,
    requestPurchase: requestPurchaseWithReset,
  };
}
