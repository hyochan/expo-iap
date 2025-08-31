// External dependencies
import {NativeModulesProxy} from 'expo-modules-core';
import {Platform} from 'react-native';

// Internal modules
import ExpoIapModule from './ExpoIapModule';
import {
  isProductIOS,
  validateReceiptIOS,
  deepLinkToSubscriptionsIOS,
} from './modules/ios';
import {
  isProductAndroid,
  validateReceiptAndroid,
  deepLinkToSubscriptionsAndroid,
} from './modules/android';

// Types
import {
  Product,
  Purchase,
  PurchaseError,
  ErrorCode,
  PurchaseResult,
  RequestSubscriptionProps,
  RequestPurchaseProps,
  SubscriptionProduct,
} from './ExpoIap.types';
import {PurchaseAndroid} from './types/ExpoIapAndroid.types';
import {PaymentDiscount} from './types/ExpoIapIOS.types';

// Export all types
export * from './ExpoIap.types';
export * from './modules/android';
export * from './modules/ios';
export type {AppTransactionIOS} from './types/ExpoIapIOS.types';

// Export subscription helpers
export {
  getActiveSubscriptions,
  hasActiveSubscriptions,
  type ActiveSubscription,
} from './helpers/subscription';

// Get the native constant value
export const PI = ExpoIapModule.PI;

export enum IapEvent {
  PurchaseUpdated = 'purchase-updated',
  PurchaseError = 'purchase-error',
  /** @deprecated Use PurchaseUpdated instead. This will be removed in a future version. */
  TransactionIapUpdated = 'iap-transaction-updated',
  PromotedProductIOS = 'promoted-product-ios',
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

/**
 * iOS-only listener for App Store promoted product events.
 * This fires when a user taps on a promoted product in the App Store.
 *
 * @param listener - Callback function that receives the promoted product details
 * @returns EventSubscription that can be used to unsubscribe
 *
 * @example
 * ```typescript
 * const subscription = promotedProductListenerIOS((product) => {
 *   console.log('Promoted product:', product);
 *   // Handle the promoted product
 * });
 *
 * // Later, clean up
 * subscription.remove();
 * ```
 *
 * @platform iOS
 */
export const promotedProductListenerIOS = (
  listener: (product: Product) => void,
) => {
  if (Platform.OS !== 'ios') {
    console.warn(
      'promotedProductListenerIOS: This listener is only available on iOS',
    );
    return {remove: () => {}};
  }
  return emitter.addListener(IapEvent.PromotedProductIOS, listener);
};

export function initConnection(): Promise<boolean> {
  const result = ExpoIapModule.initConnection();
  return Promise.resolve(result);
}

export const getProducts = async (skus: string[]): Promise<Product[]> => {
  console.warn(
    "`getProducts` is deprecated. Use `requestProducts({ skus, type: 'inapp' })` instead. This function will be removed in version 3.0.0.",
  );
  if (!skus?.length) {
    return Promise.reject(new Error('"skus" is required'));
  }

  return Platform.select({
    ios: async () => {
      const rawItems = await ExpoIapModule.getItems(skus);
      return rawItems.filter((item: unknown) => {
        if (!isProductIOS(item)) return false;
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
  console.warn(
    "`getSubscriptions` is deprecated. Use `requestProducts({ skus, type: 'subs' })` instead. This function will be removed in version 3.0.0.",
  );
  if (!skus?.length) {
    return Promise.reject(new Error('"skus" is required'));
  }

  return Platform.select({
    ios: async () => {
      const rawItems = await ExpoIapModule.getItems(skus);
      return rawItems.filter((item: unknown) => {
        if (!isProductIOS(item)) return false;
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
 * Request products with unified API (v2.7.0+)
 *
 * @param params - Product request configuration
 * @param params.skus - Array of product SKUs to fetch
 * @param params.type - Type of products: 'inapp' for regular products (default) or 'subs' for subscriptions
 *
 * @example
 * ```typescript
 * // Regular products
 * const products = await requestProducts({
 *   skus: ['product1', 'product2'],
 *   type: 'inapp'
 * });
 *
 * // Subscriptions
 * const subscriptions = await requestProducts({
 *   skus: ['sub1', 'sub2'],
 *   type: 'subs'
 * });
 * ```
 */
export const requestProducts = async ({
  skus,
  type = 'inapp',
}: {
  skus: string[];
  type?: 'inapp' | 'subs';
}): Promise<Product[] | SubscriptionProduct[]> => {
  if (!skus?.length) {
    throw new Error('No SKUs provided');
  }

  if (Platform.OS === 'ios') {
    const rawItems = await ExpoIapModule.getItems(skus);
    const filteredItems = rawItems.filter((item: unknown) => {
      if (!isProductIOS(item)) return false;
      return (
        typeof item === 'object' &&
        item !== null &&
        'id' in item &&
        typeof item.id === 'string' &&
        skus.includes(item.id)
      );
    });

    return type === 'inapp'
      ? (filteredItems as Product[])
      : (filteredItems as SubscriptionProduct[]);
  }

  if (Platform.OS === 'android') {
    const items = await ExpoIapModule.getItemsByType(type, skus);
    const filteredItems = items.filter((item: unknown) => {
      if (!isProductAndroid(item)) return false;
      return (
        typeof item === 'object' &&
        item !== null &&
        'id' in item &&
        typeof item.id === 'string' &&
        skus.includes(item.id)
      );
    });

    return type === 'inapp'
      ? (filteredItems as Product[])
      : (filteredItems as SubscriptionProduct[]);
  }

  throw new Error('Unsupported platform');
};

/**
 * @deprecated Use `getPurchaseHistories` instead. This function will be removed in version 3.0.0.
 */
export const getPurchaseHistory = ({
  alsoPublishToEventListener = false,
  onlyIncludeActiveItems = false,
}: {
  alsoPublishToEventListener?: boolean;
  onlyIncludeActiveItems?: boolean;
} = {}): Promise<Purchase[]> => {
  console.warn(
    '`getPurchaseHistory` is deprecated. Use `getPurchaseHistories` instead. This function will be removed in version 3.0.0.',
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
} = {}): Promise<Purchase[]> =>
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
} = {}): Promise<Purchase[]> =>
  (
    Platform.select({
      ios: () =>
        ExpoIapModule.getAvailableItems(
          alsoPublishToEventListener,
          onlyIncludeActiveItems,
        ),
      android: async () => {
        const products = await ExpoIapModule.getAvailableItemsByType('inapp');
        const subscriptions =
          await ExpoIapModule.getAvailableItemsByType('subs');
        return products.concat(subscriptions);
      },
    }) || (() => Promise.resolve([]))
  )();

const offerToRecordIOS = (
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
      request: RequestPurchaseProps;
      type?: 'inapp';
    }
  | {
      request: RequestSubscriptionProps;
      type: 'subs';
    };

/**
 * Helper to normalize request props to platform-specific format
 */
const normalizeRequestProps = (
  request: RequestPurchaseProps | RequestSubscriptionProps,
  platform: 'ios' | 'android',
): any => {
  // Platform-specific format - directly return the appropriate platform data
  return platform === 'ios' ? request.ios : request.android;
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
  | Purchase
  | Purchase[]
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
      andDangerouslyFinishTransactionAutomatically = false,
      appAccountToken,
      quantity,
      withOffer,
    } = normalizedRequest;

    return (async () => {
      const offer = offerToRecordIOS(withOffer);
      const purchase = await ExpoIapModule.buyProduct(
        sku,
        andDangerouslyFinishTransactionAutomatically,
        appAccountToken,
        quantity ?? -1,
        offer,
      );

      return type === 'inapp'
        ? (purchase as Purchase)
        : (purchase as Purchase);
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
        }) as Promise<Purchase[]>;
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
        purchaseToken,
      } = normalizedRequest;

      return (async () => {
        return ExpoIapModule.buyItemByType({
          type: 'subs',
          skuArr: skus,
          purchaseToken: purchaseTokenAndroid || purchaseToken,
          replacementMode: replacementModeAndroid,
          obfuscatedAccountId: obfuscatedAccountIdAndroid,
          obfuscatedProfileId: obfuscatedProfileIdAndroid,
          offerTokenArr: subscriptionOffers.map((so: any) => so.offerToken),
          isOfferPersonalized: isOfferPersonalized ?? false,
        }) as Promise<Purchase[]>;
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
  request: RequestSubscriptionProps,
): Promise<Purchase | Purchase[] | null | void> => {
  console.warn(
    "`requestSubscription` is deprecated and will be removed in version 3.0.0. Use `requestPurchase({ request, type: 'subs' })` instead.",
  );
  return (await requestPurchase({request, type: 'subs'})) as
    | Purchase
    | Purchase[]
    | null
    | void;
};

export const finishTransaction = ({
  purchase,
  isConsumable = false,
}: {
  purchase: Purchase;
  isConsumable?: boolean;
}): Promise<PurchaseResult | boolean> => {
  return (
    Platform.select({
      ios: async () => {
        const transactionId = purchase.id;
        if (!transactionId) {
          return Promise.reject(
            new Error('purchase.id required to finish iOS transaction'),
          );
        }
        await ExpoIapModule.finishTransaction(transactionId);
        return Promise.resolve(true);
      },
      android: async () => {
        const androidPurchase = purchase as PurchaseAndroid;
        
        // Use purchaseToken if available, fallback to purchaseTokenAndroid for backward compatibility
        const token = androidPurchase.purchaseToken || androidPurchase.purchaseTokenAndroid;
        
        if (!token) {
          return Promise.reject(
            new PurchaseError(
              '[expo-iap]: PurchaseError',
              'Purchase token is required to finish transaction',
              undefined,
              undefined,
              'E_DEVELOPER_ERROR' as ErrorCode,
              androidPurchase.productId,
              'android'
            )
          );
        }

        if (isConsumable) {
          return ExpoIapModule.consumeProduct(token);
        }

        return ExpoIapModule.acknowledgePurchase(token);
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
    console.warn('getStorefrontIOS: This method is only available on iOS');
    return Promise.resolve('');
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

/**
 * Internal receipt validation function (NOT RECOMMENDED for production use)
 *
 * WARNING: This function performs client-side validation which is NOT secure.
 * For production apps, always validate receipts on your secure server:
 * - iOS: Send receipt data to Apple's verification endpoint from your server
 * - Android: Use Google Play Developer API with service account credentials
 */
export const validateReceipt = async (
  sku: string,
  androidOptions?: {
    packageName: string;
    productToken: string;
    accessToken: string;
    isSub?: boolean;
  },
): Promise<any> => {
  if (Platform.OS === 'ios') {
    return await validateReceiptIOS(sku);
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
};

/**
 * Deeplinks to native interface that allows users to manage their subscriptions
 * @param options.skuAndroid - Required for Android to locate specific subscription (ignored on iOS)
 * @param options.packageNameAndroid - Required for Android to identify your app (ignored on iOS)
 *
 * @returns Promise that resolves when the deep link is successfully opened
 *
 * @throws {Error} When called on unsupported platform or when required Android parameters are missing
 *
 * @example
 * import { deepLinkToSubscriptions } from 'expo-iap';
 *
 * // Works on both iOS and Android
 * await deepLinkToSubscriptions({
 *   skuAndroid: 'your_subscription_sku',
 *   packageNameAndroid: 'com.example.app'
 * });
 */
export const deepLinkToSubscriptions = (options: {
  skuAndroid?: string;
  packageNameAndroid?: string;
}): Promise<void> => {
  if (Platform.OS === 'ios') {
    return deepLinkToSubscriptionsIOS();
  }

  if (Platform.OS === 'android') {
    if (!options.skuAndroid) {
      return Promise.reject(
        new Error(
          'skuAndroid is required to locate subscription in Android Store',
        ),
      );
    }
    if (!options.packageNameAndroid) {
      return Promise.reject(
        new Error(
          'packageNameAndroid is required to identify your app in Android Store',
        ),
      );
    }
    return deepLinkToSubscriptionsAndroid({
      sku: options.skuAndroid,
      packageName: options.packageNameAndroid,
    });
  }

  return Promise.reject(new Error(`Unsupported platform: ${Platform.OS}`));
};

export * from './useIAP';
export * from './utils/errorMapping';
