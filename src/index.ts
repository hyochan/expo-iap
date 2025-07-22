// External dependencies
import {NativeModulesProxy} from 'expo-modules-core';
import {Platform} from 'react-native';

// Internal modules
import ExpoIapModule from './ExpoIapModule';
import {isProductIos} from './modules/ios';
import {isProductAndroid} from './modules/android';

// Types
import {
  Product,
  ProductPurchase,
  Purchase,
  PurchaseError,
  PurchaseResult,
  RequestSubscriptionPropsWithLegacy,
  RequestPurchasePropsWithLegacy,
  SubscriptionProduct,
  SubscriptionPurchase,
  isPlatformRequestProps,
  isUnifiedRequestProps,
} from './ExpoIap.types';
import {
  ProductPurchaseAndroid,
} from './types/ExpoIapAndroid.types';
import {
  PaymentDiscount,
} from './types/ExpoIapIos.types';

// Export all types
export * from './ExpoIap.types';
export * from './modules/android';
export * from './modules/ios';
export type {AppTransactionIOS} from './types/ExpoIapIos.types';

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

/**
 * @deprecated Use `getPurchaseHistories` instead. This function will be removed in version 3.0.0.
 */
export const getPurchaseHistory = ({
  alsoPublishToEventListener = false,
  onlyIncludeActiveItems = false,
}: {
  alsoPublishToEventListener?: boolean;
  onlyIncludeActiveItems?: boolean;
} = {}): Promise<ProductPurchase[]> => {
  console.warn(
    "`getPurchaseHistory` is deprecated. Use `getPurchaseHistories` instead. This function will be removed in version 3.0.0.",
  );
  return getPurchaseHistories({
    alsoPublishToEventListener,
    onlyIncludeActiveItems,
  });
};

export const getPurchaseHistories = ({
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
        // getPurchaseHistoryByType was removed in Google Play Billing Library v8
        // Android doesn't provide purchase history anymore, only active purchases
        console.warn(
          'getPurchaseHistories is not supported on Android with Google Play Billing Library v8. Use getAvailablePurchases instead to get active purchases.',
        );
        return [];
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
// Using legacy types internally for backward compatibility
type PurchaseRequest =
  | {
      request: RequestPurchasePropsWithLegacy;
      type?: 'inapp';
    }
  | {
      request: RequestSubscriptionPropsWithLegacy;
      type: 'subs';
    };

/**
 * Helper to normalize request props to platform-specific format
 */
const normalizeRequestProps = (
  request: RequestPurchasePropsWithLegacy | RequestSubscriptionPropsWithLegacy,
  platform: 'ios' | 'android',
): any => {
  // If it's already platform-specific format
  if (isPlatformRequestProps(request)) {
    return platform === 'ios' ? request.ios : request.android;
  }

  // If it's unified format, convert to platform-specific
  if (isUnifiedRequestProps(request)) {
    if (platform === 'ios') {
      return {
        sku: request.sku || (request.skus?.[0] ?? ''),
        andDangerouslyFinishTransactionAutomaticallyIOS: request.andDangerouslyFinishTransactionAutomaticallyIOS,
        appAccountToken: request.appAccountToken,
        quantity: request.quantity,
        withOffer: request.withOffer,
      };
    } else {
      const androidRequest: any = {
        skus: request.skus || (request.sku ? [request.sku] : []),
        obfuscatedAccountIdAndroid: request.obfuscatedAccountIdAndroid,
        obfuscatedProfileIdAndroid: request.obfuscatedProfileIdAndroid,
        isOfferPersonalized: request.isOfferPersonalized,
      };
      
      // Add subscription-specific fields if present
      if ('subscriptionOffers' in request && request.subscriptionOffers) {
        androidRequest.subscriptionOffers = request.subscriptionOffers;
      }
      if ('purchaseTokenAndroid' in request) {
        androidRequest.purchaseTokenAndroid = request.purchaseTokenAndroid;
      }
      if ('replacementModeAndroid' in request) {
        androidRequest.replacementModeAndroid = request.replacementModeAndroid;
      }
      
      return androidRequest;
    }
  }

  // Legacy format handling
  return request;
};

/**
 * Request a purchase for products or subscriptions.
 * 
 * @param requestObj - Purchase request configuration
 * @param requestObj.request - Platform-specific purchase parameters
 * @param requestObj.type - Type of purchase: 'inapp' for products (default) or 'subs' for subscriptions
 * 
 * @example
 * ```typescript
 * // Product purchase
 * await requestPurchase({
 *   request: {
 *     ios: { sku: productId },
 *     android: { skus: [productId] }
 *   },
 *   type: 'inapp'
 * });
 * 
 * // Subscription purchase
 * await requestPurchase({
 *   request: {
 *     ios: { sku: subscriptionId },
 *     android: { 
 *       skus: [subscriptionId],
 *       subscriptionOffers: [{ sku: subscriptionId, offerToken: 'token' }]
 *     }
 *   },
 *   type: 'subs'
 * });
 * ```
 */
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
    const normalizedRequest = normalizeRequestProps(request, 'ios');
    
    if (!normalizedRequest?.sku) {
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
    } = normalizedRequest;

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
    const normalizedRequest = normalizeRequestProps(request, 'android');
    
    if (!normalizedRequest?.skus?.length) {
      throw new Error(
        'Invalid request for Android. The `skus` property is required and must be a non-empty array.',
      );
    }

    if (type === 'inapp') {
      const {
        skus,
        obfuscatedAccountIdAndroid,
        obfuscatedProfileIdAndroid,
        isOfferPersonalized,
      } = normalizedRequest;

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
      } = normalizedRequest;

      return (async () => {
        return ExpoIapModule.buyItemByType({
          type: 'subs',
          skuArr: skus,
          purchaseToken: purchaseTokenAndroid,
          replacementMode: replacementModeAndroid,
          obfuscatedAccountId: obfuscatedAccountIdAndroid,
          obfuscatedProfileId: obfuscatedProfileIdAndroid,
          offerTokenArr: subscriptionOffers.map((so: any) => so.offerToken),
          isOfferPersonalized: isOfferPersonalized ?? false,
        }) as Promise<SubscriptionPurchase[]>;
      })();
    }

    throw new Error(
      "Invalid request for Android: Expected a valid request object with 'skus' array.",
    );
  }

  return Promise.resolve(); // Fallback for unsupported platforms
};

/**
 * @deprecated Use `requestPurchase({ request, type: 'subs' })` instead. This method will be removed in version 3.0.0.
 * 
 * @example
 * ```typescript
 * // Old way (deprecated)
 * await requestSubscription({
 *   sku: subscriptionId,
 *   // or for Android
 *   skus: [subscriptionId],
 * });
 * 
 * // New way (recommended)
 * await requestPurchase({
 *   request: {
 *     ios: { sku: subscriptionId },
 *     android: { 
 *       skus: [subscriptionId],
 *       subscriptionOffers: [{ sku: subscriptionId, offerToken: 'token' }]
 *     }
 *   },
 *   type: 'subs'
 * });
 * ```
 */
export const requestSubscription = async (
  request: RequestSubscriptionPropsWithLegacy,
): Promise<SubscriptionPurchase | SubscriptionPurchase[] | null | void> => {
  console.warn(
    "`requestSubscription` is deprecated and will be removed in version 3.0.0. Use `requestPurchase({ request, type: 'subs' })` instead.",
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

/**
 * Retrieves the current storefront information from iOS App Store
 * 
 * @returns Promise resolving to the storefront country code
 * @throws Error if called on non-iOS platform
 * 
 * @example
 * ```typescript
 * const storefront = await getStorefrontIOS();
 * console.log(storefront); // 'US'
 * ```
 * 
 * @platform iOS
 */
export const getStorefrontIOS = (): Promise<string> => {
  if (Platform.OS !== 'ios') {
    throw new Error('getStorefrontIOS: This method is only available on iOS');
  }
  return ExpoIapModule.getStorefront();
};

/**
 * @deprecated Use `getStorefrontIOS` instead. This function will be removed in version 3.0.0.
 */
export const getStorefront = (): Promise<string> => {
  console.warn(
    '`getStorefront` is deprecated. Use `getStorefrontIOS` instead. This function will be removed in version 3.0.0.',
  );
  return getStorefrontIOS();
};

export * from './useIap';
export * from './utils/errorMapping';
