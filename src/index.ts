// Import the native module. On web, it will be resolved to ExpoIap.web.ts
// and on native platforms to ExpoIap.ts
import {NativeModulesProxy, EventEmitter} from 'expo-modules-core';
import {Platform} from 'react-native';
import {
  Product,
  ProductPurchase,
  ProductType,
  Purchase,
  PurchaseError,
  PurchaseResult,
  RequestSubscriptionProps,
  SubscriptionProduct,
  SubscriptionPurchase,
} from './ExpoIap.types';
import ExpoIapModule from './ExpoIapModule';
import {
  ProductPurchaseAndroid,
  RequestPurchaseAndroidProps,
  RequestSubscriptionAndroidProps,
} from './types/ExpoIapAndroid.types';
import {
  PaymentDiscount,
  RequestPurchaseIosProps,
  RequestSubscriptionIosProps,
} from './types/ExpoIapIos.types';
import {isProductIos, isSubscriptionProductIos} from './modules/ios';
import {
  isProductAndroid,
  isSubscriptionProductAndroid,
} from './modules/android';

export * from './modules/android';
export * from './modules/ios';

// Get the native constant value.
export const PI = ExpoIapModule.PI;

export enum IapEvent {
  PurchaseUpdated = 'purchase-updated',
  PurchaseError = 'purchase-error',
  TransactionIapUpdated = 'iap-transaction-updated',
}

export function setValueAsync(value: string) {
  return ExpoIapModule.setValueAsync(value);
}

export const emitter = new EventEmitter(
  ExpoIapModule || NativeModulesProxy.ExpoIap,
);

export const purchaseUpdatedListener = (
  listener: (event: Purchase) => void,
) => {
  const emitterSubscription = emitter.addListener(
    IapEvent.PurchaseUpdated,
    listener,
  );
  return emitterSubscription;
};

export const purchaseErrorListener = (
  listener: (error: PurchaseError) => void,
) => {
  return emitter.addListener<PurchaseError>(IapEvent.PurchaseError, listener);
};

export function initConnection() {
  return ExpoIapModule.initConnection();
}

export const getProducts = async (skus: string[]): Promise<Product[]> => {
  if (!skus?.length) {
    return Promise.reject(new Error('"skus" is required'));
  }

  return Platform.select({
    ios: async () => {
      const items = await ExpoIapModule.getItems(skus);
      return items.filter((item: unknown) => isProductIos<Product>(item));
    },
    android: async () => {
      const products = await ExpoIapModule.getItemsByType(
        ProductType.InAppPurchase,
        skus,
      );

      return products.filter((product: unknown) =>
        isProductAndroid<Product>(product),
      );
    },
    default: () => Promise.reject(new Error('Unsupported Platform')),
  })();
};

export const getSubscriptions = async (
  skus: string[],
): Promise<SubscriptionProduct[]> => {
  if (!skus?.length) {
    return Promise.reject(new Error('"skus" is required'));
  }

  return Platform.select({
    ios: async () => {
      const rawItems = await ExpoIapModule.getItems(skus);
      return rawItems.filter((item: unknown) => {
        if (!isSubscriptionProductIos(item)) return false;
        return (
          typeof item === 'object' &&
          item !== null &&
          'id' in item &&
          typeof item.id === 'string' &&
          skus.includes(item.id)
        );
      }) as SubscriptionProduct[];
    },
    android: async () => {
      const rawItems = await ExpoIapModule.getItemsByType('subs', skus);
      return rawItems.filter((item: unknown) => {
        if (!isSubscriptionProductAndroid(item)) return false;
        return (
          typeof item === 'object' &&
          item !== null &&
          'id' in item &&
          typeof item.id === 'string' &&
          skus.includes(item.id)
        );
      }) as SubscriptionProduct[];
    },
    default: () => Promise.reject(new Error('Unsupported Platform')),
  })();
};

export async function endConnection(): Promise<boolean> {
  return ExpoIapModule.endConnection();
}

export const getPurchaseHistory = ({
  alsoPublishToEventListener = false,
  onlyIncludeActiveItems = false,
}: {
  alsoPublishToEventListener?: boolean;
  onlyIncludeActiveItems?: boolean;
} = {}): Promise<ProductPurchase[]> =>
  (
    Platform.select({
      ios: async () => {
        return ExpoIapModule.getAvailableItems(
          alsoPublishToEventListener,
          onlyIncludeActiveItems,
        );
      },
      android: async () => {
        const products = await ExpoIapModule.getPurchaseHistoryByType(
          ProductType.InAppPurchase,
        );
        const subscriptions = await ExpoIapModule.getPurchaseHistoryByType(
          ProductType.Subscription,
        );
        return products.concat(subscriptions);
      },
    }) || (() => Promise.resolve([]))
  )();

export const getAvailablePurchases = ({
  alsoPublishToEventListener = false,
  onlyIncludeActiveItems = true,
}: {
  alsoPublishToEventListener?: boolean;
  onlyIncludeActiveItems?: boolean;
} = {}): Promise<ProductPurchase[]> =>
  (
    Platform.select({
      ios: () =>
        ExpoIapModule.getAvailableItems(
          alsoPublishToEventListener,
          onlyIncludeActiveItems,
        ),
      android: async () => {
        const products = await ExpoIapModule.getAvailableItemsByType(
          ProductType.InAppPurchase,
        );
        const subscriptions = await ExpoIapModule.getAvailableItemsByType(
          ProductType.Subscription,
        );
        return products.concat(subscriptions);
      },
    }) || (() => Promise.resolve([]))
  )();

const offerToRecordIos = (
  offer: PaymentDiscount | undefined,
): Record<keyof PaymentDiscount, string> | undefined => {
  if (!offer) {
    return undefined;
  }
  return {
    identifier: offer.identifier,
    keyIdentifier: offer.keyIdentifier,
    nonce: offer.nonce,
    signature: offer.signature,
    timestamp: offer.timestamp.toString(),
  };
};

export const requestPurchase = (
  request: RequestPurchaseIosProps | RequestPurchaseAndroidProps,
): Promise<ProductPurchase | ProductPurchase[] | void> =>
  (
    Platform.select({
      ios: async () => {
        if (!('sku' in request)) {
          throw new Error('sku is required for iOS purchase');
        }
        const {
          sku,
          andDangerouslyFinishTransactionAutomaticallyIOS = false,
          appAccountToken,
          quantity,
          withOffer,
        } = request;
        const offer = offerToRecordIos(withOffer);
        const purchase = await ExpoIapModule.buyProduct(
          sku,
          andDangerouslyFinishTransactionAutomaticallyIOS,
          appAccountToken,
          quantity ?? -1,
          offer,
        );
        return Promise.resolve(purchase);
      },
      android: async () => {
        if (!('skus' in request) || !request.skus.length) {
          throw new Error('skus is required for Android purchase');
        }
        const {
          skus,
          obfuscatedAccountIdAndroid,
          obfuscatedProfileIdAndroid,
          isOfferPersonalized,
        } = request;
        return ExpoIapModule.buyItemByType({
          type: ProductType.InAppPurchase,
          skuArr: skus,
          purchaseToken: undefined,
          replacementMode: -1,
          obfuscatedAccountId: obfuscatedAccountIdAndroid,
          obfuscatedProfileId: obfuscatedProfileIdAndroid,
          offerTokenArr: [],
          isOfferPersonalized: isOfferPersonalized ?? false,
        });
      },
    }) || Promise.resolve
  )();

export const requestSubscription = (
  request: RequestSubscriptionProps,
): Promise<SubscriptionPurchase | SubscriptionPurchase[] | null | void> =>
  (
    Platform.select({
      ios: async () => {
        if (!('sku' in request)) {
          throw new Error('sku is required for iOS subscriptions');
        }
        const {
          sku,
          andDangerouslyFinishTransactionAutomaticallyIOS = false,
          appAccountToken,
          quantity,
          withOffer,
        } = request as RequestSubscriptionIosProps;
        const offer = offerToRecordIos(withOffer);
        const purchase = await ExpoIapModule.buyProduct(
          sku,
          andDangerouslyFinishTransactionAutomaticallyIOS,
          appAccountToken,
          quantity ?? -1,
          offer,
        );
        return Promise.resolve(purchase as SubscriptionPurchase);
      },
      android: async () => {
        const {
          skus,
          isOfferPersonalized,
          obfuscatedAccountIdAndroid,
          obfuscatedProfileIdAndroid,
          subscriptionOffers,
          replacementModeAndroid,
          purchaseTokenAndroid,
        } = request as RequestSubscriptionAndroidProps;
        return ExpoIapModule.buyItemByType({
          type: ProductType.Subscription,
          skuArr: skus.map((so) => so),
          purchaseToken: purchaseTokenAndroid,
          replacementMode: replacementModeAndroid,
          obfuscatedAccountId: obfuscatedAccountIdAndroid,
          obfuscatedProfileId: obfuscatedProfileIdAndroid,
          offerTokenArr: subscriptionOffers.map((so) => so.offerToken),
          isOfferPersonalized: isOfferPersonalized ?? false,
        });
      },
    }) || (() => Promise.resolve(null))
  )();

export const finishTransaction = ({
  purchase,
  isConsumable,
}: {
  purchase: Purchase;
  isConsumable?: boolean;
}): Promise<PurchaseResult | boolean> => {
  return (
    Platform.select({
      ios: async () => {
        const transactionId = purchase.transactionId;
        if (!transactionId) {
          return Promise.reject(
            new Error('transactionId required to finish iOS transaction'),
          );
        }
        await ExpoIapModule.finishTransaction(transactionId);
        return Promise.resolve(true);
      },
      android: async () => {
        const androidPurchase = purchase as ProductPurchaseAndroid;

        if (!('purchaseTokenAndroid' in androidPurchase)) {
          return Promise.reject(
            new Error('purchaseToken is required to finish transaction'),
          );
        }
        if (isConsumable) {
          return ExpoIapModule.consumeProduct(
            androidPurchase.purchaseTokenAndroid,
          );
        } else {
          return ExpoIapModule.acknowledgePurchase(
            androidPurchase.purchaseTokenAndroid,
          );
        }
      },
    }) || (() => Promise.reject(new Error('Unsupported Platform')))
  )();
};

export * from './useIap';
