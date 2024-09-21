import RNIap, {
  endConnection,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  transactionUpdatedIos,
} from '../';

import {useCallback, useEffect, useState} from 'react';
import {
  Product,
  ProductPurchase,
  PurchaseError,
  PurchaseResult,
  SubscriptionProduct,
  SubscriptionPurchase,
} from './ExpoIap.types';
import {Purchase} from '../build/ExpoIap.types';
import {TransactionEvent} from './modules/ios';
import {TransactionSk2} from './types/ExpoIapIos.types';
import {Subscription} from 'expo-modules-core';

type IAP_STATUS = {
  connected: boolean;
  products: Product[];
  promotedProductsIOS: TransactionSk2[];
  subscriptions: SubscriptionProduct[];
  purchaseHistories: ProductPurchase[];
  availablePurchases: ProductPurchase[];
  currentPurchase?: ProductPurchase;
  currentPurchaseError?: PurchaseError;
  finishTransaction: ({
    purchase,
    isConsumable,
    developerPayloadAndroid,
  }: {
    purchase: Purchase;
    isConsumable?: boolean;
    developerPayloadAndroid?: string;
  }) => Promise<string | boolean | PurchaseResult | void>;
  getAvailablePurchases: () => Promise<void>;
  getPurchaseHistories: () => Promise<void>;
  getProducts: (skus: string[]) => Promise<void>;
  getSubscriptions: (skus: string[]) => Promise<void>;
};

let purchaseUpdateSubscription: Subscription;
let purchaseErrorSubscription: Subscription;
let promotedProductsSubscription: Subscription;

export function useIAP(): IAP_STATUS {
  const [connected, setConnected] = useState<boolean>(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [promotedProductsIOS, setPromotedProductsIOS] = useState<
    TransactionSk2[]
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

  const getProducts = useCallback(async (skus: string[]): Promise<void> => {
    setProducts(await RNIap.getProducts(skus));
  }, []);

  const getSubscriptions = useCallback(
    async (skus: string[]): Promise<void> => {
      setSubscriptions(await RNIap.getSubscriptions(skus));
    },
    [],
  );

  const getAvailablePurchases = useCallback(async (): Promise<void> => {
    setAvailablePurchases(await RNIap.getAvailablePurchases());
  }, []);

  const getPurchaseHistories = useCallback(async (): Promise<void> => {
    setPurchaseHistories(await RNIap.getPurchaseHistory());
  }, []);

  const finishTransaction = useCallback(
    async ({
      purchase,
      isConsumable,
      developerPayloadAndroid,
    }: {
      purchase: ProductPurchase;
      isConsumable?: boolean;
      developerPayloadAndroid?: string;
    }): Promise<string | boolean | PurchaseResult | void> => {
      try {
        return await finishTransaction({
          purchase,
          isConsumable,
          developerPayloadAndroid,
        });
      } catch (err) {
        throw err;
      } finally {
        if (purchase.productId === currentPurchase?.productId) {
          setCurrentPurchase(undefined);
        }

        if (purchase.productId === currentPurchaseError?.productId) {
          setCurrentPurchaseError(undefined);
        }
      }
    },
    [
      currentPurchase?.productId,
      currentPurchaseError?.productId,
      setCurrentPurchase,
      setCurrentPurchaseError,
    ],
  );

  const initIapWithSubscriptions = useCallback(async (): Promise<void> => {
    const result = await initConnection();

    setConnected(result);

    if (result) {
      purchaseUpdateSubscription = purchaseUpdatedListener(
        async (purchase: Purchase | SubscriptionPurchase) => {
          setCurrentPurchaseError(undefined);
          setCurrentPurchase(purchase);
        },
      );

      purchaseErrorSubscription = purchaseErrorListener(
        (error: PurchaseError) => {
          setCurrentPurchase(undefined);
          setCurrentPurchaseError(error);
        },
      );

      promotedProductsSubscription = transactionUpdatedIos(
        (event: TransactionEvent) => {
          setPromotedProductsIOS((prevProducts) =>
            event.transaction
              ? [...prevProducts, event.transaction]
              : prevProducts,
          );
        },
      );
    }
  }, []);

  useEffect(() => {
    initIapWithSubscriptions();

    return (): void => {
      if (purchaseUpdateSubscription) purchaseUpdateSubscription.remove();
      if (purchaseErrorSubscription) purchaseErrorSubscription.remove();
      if (promotedProductsSubscription) promotedProductsSubscription.remove();

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
    getProducts,
    getSubscriptions,
    getAvailablePurchases,
    getPurchaseHistories,
  };
}
