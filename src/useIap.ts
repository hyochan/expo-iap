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
  validateReceiptIos,
  validateReceiptAndroid,
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
  validateReceipt: (
    sku: string,
    androidOptions?: {
      packageName: string;
      productToken: string;
      accessToken: string;
      isSub?: boolean;
    },
  ) => Promise<any>;
  restorePurchases: () => Promise<void>; // 구매 복원 함수 추가
};

export interface UseIAPOptions {
  onPurchaseSuccess?: (
    purchase: ProductPurchase | SubscriptionPurchase,
  ) => void;
  onPurchaseError?: (error: PurchaseError) => void;
  onSyncError?: (error: Error) => void;
  shouldAutoSyncPurchases?: boolean; // New option to control auto-syncing
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

  const subscriptionsRefState = useRef<SubscriptionProduct[]>([]);

  useEffect(() => {
    subscriptionsRefState.current = subscriptions;
  }, [subscriptions]);

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
    [
      currentPurchase?.id,
      currentPurchaseError?.productId,
      clearCurrentPurchase,
      clearCurrentPurchaseError,
    ],
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

  const restorePurchases = useCallback(async (): Promise<void> => {
    try {
      if (Platform.OS === 'ios') {
        await sync().catch((error) => {
          if (optionsRef.current?.onSyncError) {
            optionsRef.current.onSyncError(error);
          } else {
            console.warn('Error restoring purchases:', error);
          }
        });
      }
      await getAvailablePurchasesInternal();
    } catch (error) {
      console.warn('Failed to restore purchases:', error);
    }
  }, [getAvailablePurchasesInternal]);

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
      if (Platform.OS === 'ios') {
        return await validateReceiptIos(sku);
      } else if (Platform.OS === 'android') {
        if (
          !androidOptions ||
          !androidOptions.packageName ||
          !androidOptions.productToken ||
          !androidOptions.accessToken
        ) {
          throw new Error(
            'Android validation requires packageName, productToken, and accessToken',
          );
        }
        return await validateReceiptAndroid({
          packageName: androidOptions.packageName,
          productId: sku,
          productToken: androidOptions.productToken,
          accessToken: androidOptions.accessToken,
          isSub: androidOptions.isSub,
        });
      } else {
        throw new Error('Platform not supported');
      }
    },
    [],
  );

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
            setPromotedProductsIOS((prevProducts) =>
              event.transaction
                ? [...prevProducts, event.transaction]
                : prevProducts,
            );

            if (event.transaction && 'expirationDateIos' in event.transaction) {
              await refreshSubscriptionStatus(event.transaction.id);
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
    validateReceipt,
    restorePurchases,
  };
}
