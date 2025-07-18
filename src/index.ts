// Import the native module. On web, it will be resolved to ExpoIap.web.ts
// and on native platforms to ExpoIap.ts
import {NativeModulesProxy} from 'expo-modules-core';
import {Platform} from 'react-native';
import {
  Product,
  ProductPurchase,
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
import {isProductIos} from './modules/ios';
import {isProductAndroid} from './modules/android';

export * from './ExpoIap.types';
export * from './modules/android';
export * from './modules/ios';

// Get the native constant value
export const PI = ExpoIapModule.PI;

export enum IapEvent {
  PurchaseUpdated = 'purchase-updated',
  PurchaseError = 'purchase-error',
  /** @deprecated Use PurchaseUpdated instead. This will be removed in a future version. */
  TransactionIapUpdated = 'iap-transaction-updated',
}

export function setValueAsync(value: string) {
  return ExpoIapModule.setValueAsync(value);
}

// Ensure the emitter has proper EventEmitter interface
export const emitter = (ExpoIapModule || NativeModulesProxy.ExpoIap) as {
  addListener: (
    eventName: string,
    listener: (...args: any[]) => void,
  ) => {remove: () => void};
  removeListener: (
    eventName: string,
    listener: (...args: any[]) => void,
  ) => void;
};

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
  return emitter.addListener(IapEvent.PurchaseError, listener);
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
      const rawItems = await ExpoIapModule.getItems(skus);
      return rawItems.filter((item: unknown) => {
        if (!isProductIos(item)) return false;
        return (
          typeof item === 'object' &&
          item !== null &&
          'id' in item &&
          typeof item.id === 'string' &&
          skus.includes(item.id)
        );
      }) as Product[];
    },
    android: async () => {
      const products = await ExpoIapModule.getItemsByType('inapp', skus);
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
        if (!isProductIos(item)) return false;
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
        if (!isProductAndroid(item)) return false;
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
        const products = await ExpoIapModule.getPurchaseHistoryByType('inapp');
        const subscriptions = await ExpoIapModule.getPurchaseHistoryByType(
          'subs',
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
        const products = await ExpoIapModule.getAvailableItemsByType('inapp');
        const subscriptions = await ExpoIapModule.getAvailableItemsByType(
          'subs',
        );
        return products.concat(subscriptions);
      },
    }) || (() => Promise.resolve([]))
  )();

const offerToRecordIos = (
  offer: PaymentDiscount | undefined,
): Record<keyof PaymentDiscount, string> | undefined => {
  if (!offer) return undefined;
  return {
    identifier: offer.identifier,
    keyIdentifier: offer.keyIdentifier,
    nonce: offer.nonce,
    signature: offer.signature,
    timestamp: offer.timestamp.toString(),
  };
};

// Define discriminated union with explicit type parameter
type PurchaseRequest =
  | {
      request: RequestPurchaseIosProps | RequestPurchaseAndroidProps;
      type?: 'inapp';
    }
  | {
      request: RequestSubscriptionAndroidProps | RequestSubscriptionIosProps;
      type: 'subs';
    };

// Type guards for request objects
const isIosRequest = (
  request: any,
): request is RequestPurchaseIosProps | RequestSubscriptionIosProps =>
  'sku' in request && typeof request.sku === 'string';

export const requestPurchase = (
  requestObj: PurchaseRequest,
): Promise<
  | ProductPurchase
  | SubscriptionPurchase
  | ProductPurchase[]
  | SubscriptionPurchase[]
  | void
> => {
  const {request, type = 'inapp'} = requestObj;

  if (Platform.OS === 'ios') {
    if (!isIosRequest(request)) {
      throw new Error(
        'Invalid request for iOS. The `sku` property is required and must be a string.',
      );
    }

    const {
      sku,
      andDangerouslyFinishTransactionAutomaticallyIOS = false,
      appAccountToken,
      quantity,
      withOffer,
    } = request;

    return (async () => {
      const offer = offerToRecordIos(withOffer);
      const purchase = await ExpoIapModule.buyProduct(
        sku,
        andDangerouslyFinishTransactionAutomaticallyIOS,
        appAccountToken,
        quantity ?? -1,
        offer,
      );

      return type === 'inapp'
        ? (purchase as ProductPurchase)
        : (purchase as SubscriptionPurchase);
    })();
  }

  if (Platform.OS === 'android') {
    if (type === 'inapp') {
      const {
        skus,
        obfuscatedAccountIdAndroid,
        obfuscatedProfileIdAndroid,
        isOfferPersonalized,
      } = request as RequestPurchaseAndroidProps;

      return (async () => {
        return ExpoIapModule.buyItemByType({
          type: 'inapp',
          skuArr: skus,
          purchaseToken: undefined,
          replacementMode: -1,
          obfuscatedAccountId: obfuscatedAccountIdAndroid,
          obfuscatedProfileId: obfuscatedProfileIdAndroid,
          offerTokenArr: [],
          isOfferPersonalized: isOfferPersonalized ?? false,
        }) as Promise<ProductPurchase[]>;
      })();
    }

    if (type === 'subs') {
      const {
        skus,
        obfuscatedAccountIdAndroid,
        obfuscatedProfileIdAndroid,
        isOfferPersonalized,
        subscriptionOffers = [],
        replacementModeAndroid = -1,
        purchaseTokenAndroid,
      } = request as RequestSubscriptionAndroidProps;

      return (async () => {
        return ExpoIapModule.buyItemByType({
          type: 'subs',
          skuArr: skus,
          purchaseToken: purchaseTokenAndroid,
          replacementMode: replacementModeAndroid,
          obfuscatedAccountId: obfuscatedAccountIdAndroid,
          obfuscatedProfileId: obfuscatedProfileIdAndroid,
          offerTokenArr: subscriptionOffers.map((so) => so.offerToken),
          isOfferPersonalized: isOfferPersonalized ?? false,
        }) as Promise<SubscriptionPurchase[]>;
      })();
    }

    throw new Error(
      "Invalid request for Android: Expected a 'RequestPurchaseAndroidProps' object with a valid 'skus' array or a 'RequestSubscriptionAndroidProps' object with 'skus' and 'subscriptionOffers'.",
    );
  }

  return Promise.resolve(); // Fallback for unsupported platforms
};

/**
 * @deprecated Use `requestPurchase({ request, type: 'subs' })` instead. This method will be removed in version 3.0.0+.
 */
export const requestSubscription = async (
  request: RequestSubscriptionProps,
): Promise<SubscriptionPurchase | SubscriptionPurchase[] | null | void> => {
  console.warn(
    "`requestSubscription` is deprecated. Use `requestPurchase({ request, type: 'subs' })` instead. This method will be removed in version 3.0.0+.",
  );
  return (await requestPurchase({request, type: 'subs'})) as
    | SubscriptionPurchase
    | SubscriptionPurchase[]
    | null
    | void;
};

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

export const getStorefront = (): Promise<string> => {
  return ExpoIapModule.getStorefront();
};

export * from './useIap';
export * from './utils/errorMapping';
