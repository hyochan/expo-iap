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

type IAP_STATUS = {
  connected: boolean;
  products: Product[];
  promotedProductsIOS: ProductPurchase[];
  subscriptions: SubscriptionProduct[];
  purchaseHistories: ProductPurchase[];
  availablePurchases: ProductPurchase[];
  currentPurchase?: ProductPurchase;
  currentPurchaseError?: PurchaseError;
  finishTransaction: ({
    purchase,
    isConsumable,
  }: {
    purchase: Purchase;
    isConsumable?: boolean;
  }) => Promise<string | boolean | PurchaseResult | void>;
  getAvailablePurchases: () => Promise<void>;
  getPurchaseHistories: () => Promise<void>;
  getProducts: (skus: string[]) => Promise<void>;
  getSubscriptions: (skus: string[]) => Promise<void>;
};

export function useIAP(): IAP_STATUS {
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

  // 구독을 훅 인스턴스별로 관리하기 위한 ref
  const subscriptionsRef = useRef<{
    purchaseUpdate?: Subscription;
    purchaseError?: Subscription;
    promotedProductsIos?: Subscription;
  }>({});

  const requestProducts = useCallback(async (skus: string[]): Promise<void> => {
    setProducts(await getProducts(skus));
  }, []);

  const requestSubscriptions = useCallback(
    async (skus: string[]): Promise<void> => {
      setSubscriptions(await getSubscriptions(skus));
    },
    [],
  );

  const requestAvailablePurchases = useCallback(async (): Promise<void> => {
    setAvailablePurchases(await getAvailablePurchases());
  }, []);

  const requestPurchaseHistories = useCallback(async (): Promise<void> => {
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
          setCurrentPurchase(undefined);
        }
        if (purchase.id === currentPurchaseError?.productId) {
          setCurrentPurchaseError(undefined);
        }
      }
    },
    [currentPurchase?.id, currentPurchaseError?.productId],
  );

  const initIapWithSubscriptions = useCallback(async (): Promise<void> => {
    const result = await initConnection();
    setConnected(result);

    if (result) {
      subscriptionsRef.current.purchaseUpdate = purchaseUpdatedListener(
        async (purchase: Purchase | SubscriptionPurchase) => {
          setCurrentPurchaseError(undefined);
          setCurrentPurchase(purchase);
        },
      );

      subscriptionsRef.current.purchaseError = purchaseErrorListener(
        (error: PurchaseError) => {
          setCurrentPurchase(undefined);
          setCurrentPurchaseError(error);
        },
      );

      if (Platform.OS === 'ios') {
        subscriptionsRef.current.promotedProductsIos = transactionUpdatedIos(
          (event: TransactionEvent) => {
            setPromotedProductsIOS((prevProducts) =>
              event.transaction
                ? [...prevProducts, event.transaction]
                : prevProducts,
            );
          },
        );
      }
    }
  }, []);

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
    getProducts: requestProducts,
    getSubscriptions: requestSubscriptions,
    getAvailablePurchases: requestAvailablePurchases,
    getPurchaseHistories: requestPurchaseHistories,
  };
}
