// External dependencies
import {NativeModulesProxy} from 'expo-modules-core';
import {Platform} from 'react-native';

// Internal modules
import ExpoIapModule from './ExpoIapModule';
import {
  isProductIOS,
  validateReceiptIOS,
  deepLinkToSubscriptionsIOS,
  syncIOS,
} from './modules/ios';
import {
  isProductAndroid,
  validateReceiptAndroid,
  deepLinkToSubscriptionsAndroid,
} from './modules/android';

// Types
import type {
  AndroidSubscriptionOfferInput,
  DeepLinkOptions,
  FetchProductsResult,
  MutationField,
  MutationValidateReceiptArgs,
  Product,
  ProductAndroid,
  ProductIOS,
  ProductQueryType,
  ProductSubscription,
  Purchase,
  PurchaseInput,
  PurchaseOptions,
  QueryField,
  RequestPurchasePropsByPlatforms,
  RequestPurchaseAndroidProps,
  RequestPurchaseIosProps,
  RequestSubscriptionPropsByPlatforms,
  RequestSubscriptionAndroidProps,
  RequestSubscriptionIosProps,
  DiscountOfferInputIOS,
} from './types';
import {ErrorCode} from './types';
import {PurchaseError} from './purchase-error';
import {normalizePurchaseId, normalizePurchaseList} from './utils/purchase';

// Export all types
export * from './types';
export {ErrorCodeUtils, ErrorCodeMapping} from './purchase-error';
export * from './modules/android';
export * from './modules/ios';

// Export subscription helpers
export {
  getActiveSubscriptions,
  hasActiveSubscriptions,
} from './helpers/subscription';

// Get the native constant value
export const PI = ExpoIapModule.PI;

export enum OpenIapEvent {
  PurchaseUpdated = 'purchase-updated',
  PurchaseError = 'purchase-error',
  PromotedProductIOS = 'promoted-product-ios',
}

export function setValueAsync(value: string) {
  return ExpoIapModule.setValueAsync(value);
}

type ExpoIapEventPayloads = {
  [OpenIapEvent.PurchaseUpdated]: Purchase;
  [OpenIapEvent.PurchaseError]: PurchaseError;
  [OpenIapEvent.PromotedProductIOS]: Product;
};

type ExpoIapEventListener<E extends OpenIapEvent> = (
  payload: ExpoIapEventPayloads[E],
) => void;

type ExpoIapEmitter = {
  addListener<E extends OpenIapEvent>(
    eventName: E,
    listener: ExpoIapEventListener<E>,
  ): {remove: () => void};
  removeListener<E extends OpenIapEvent>(
    eventName: E,
    listener: ExpoIapEventListener<E>,
  ): void;
};

// Ensure the emitter has proper EventEmitter interface
export const emitter = (ExpoIapModule ||
  NativeModulesProxy.ExpoIap) as ExpoIapEmitter;

/**
 * TODO(v3.1.0): Remove legacy 'inapp' alias once downstream apps migrate to 'in-app'.
 */
export type ProductTypeInput = ProductQueryType | 'inapp';

const normalizeProductType = (type?: ProductTypeInput) => {
  if (type === 'inapp') {
    console.warn(
      "expo-iap: 'inapp' product type is deprecated and will be removed in v3.1.0. Use 'in-app' instead.",
    );
  }

  if (!type || type === 'inapp' || type === 'in-app') {
    return {
      canonical: 'in-app' as ProductQueryType,
      native: 'inapp' as const,
    };
  }
  if (type === 'subs') {
    return {
      canonical: 'subs' as ProductQueryType,
      native: 'subs' as const,
    };
  }
  if (type === 'all') {
    return {
      canonical: 'all' as ProductQueryType,
      native: 'all' as const,
    };
  }
  throw new Error(`Unsupported product type: ${type}`);
};

export const purchaseUpdatedListener = (
  listener: (event: Purchase) => void,
) => {
  console.log('[JS] Registering purchaseUpdatedListener');
  const wrappedListener = (event: Purchase) => {
    const normalized = normalizePurchaseId(event);
    console.log('[JS] purchaseUpdatedListener fired:', normalized);
    listener(normalized);
  };
  const emitterSubscription = emitter.addListener(
    OpenIapEvent.PurchaseUpdated,
    wrappedListener,
  );
  console.log('[JS] purchaseUpdatedListener registered successfully');
  return emitterSubscription;
};

export const purchaseErrorListener = (
  listener: (error: PurchaseError) => void,
) => {
  console.log('[JS] Registering purchaseErrorListener');
  const wrappedListener = (error: PurchaseError) => {
    console.log('[JS] purchaseErrorListener fired:', error);
    listener(error);
  };
  const emitterSubscription = emitter.addListener(
    OpenIapEvent.PurchaseError,
    wrappedListener,
  );
  console.log('[JS] purchaseErrorListener registered successfully');
  return emitterSubscription;
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
  return emitter.addListener(OpenIapEvent.PromotedProductIOS, listener);
};

export const initConnection: MutationField<'initConnection'> = async () =>
  ExpoIapModule.initConnection();

export const endConnection: MutationField<'endConnection'> = async () =>
  ExpoIapModule.endConnection();

/**
 * Fetch products with unified API (v2.7.0+)
 *
 * @param request - Product fetch configuration
 * @param request.skus - Array of product SKUs to fetch
 * @param request.type - Product query type: 'in-app', 'subs', or 'all'
 */
export const fetchProducts: QueryField<'fetchProducts'> = async (request) => {
  const {skus, type} = request ?? {};

  if (!Array.isArray(skus) || skus.length === 0) {
    throw new PurchaseError({
      message: 'No SKUs provided',
      code: ErrorCode.EmptySkuList,
    });
  }

  const {canonical, native} = normalizeProductType(
    type as ProductTypeInput | undefined,
  );
  const skuSet = new Set(skus);

  const filterIosItems = (
    items: unknown[],
  ): Product[] | ProductSubscription[] =>
    items.filter((item): item is ProductIOS | ProductSubscription => {
      if (!isProductIOS(item)) {
        return false;
      }
      const candidate = item as ProductIOS | ProductSubscription;
      return typeof candidate.id === 'string' && skuSet.has(candidate.id);
    });

  const filterAndroidItems = (
    items: unknown[],
  ): Product[] | ProductSubscription[] =>
    items.filter((item): item is ProductAndroid | ProductSubscription => {
      if (!isProductAndroid(item)) {
        return false;
      }
      const candidate = item as ProductAndroid | ProductSubscription;
      return typeof candidate.id === 'string' && skuSet.has(candidate.id);
    });

  const castResult = (
    items: Product[] | ProductSubscription[],
  ): FetchProductsResult => {
    if (canonical === 'in-app') {
      return items as Product[];
    }
    if (canonical === 'subs') {
      return items as ProductSubscription[];
    }
    return items;
  };

  if (Platform.OS === 'ios') {
    const rawItems = await ExpoIapModule.fetchProducts({skus, type: native});
    return castResult(filterIosItems(rawItems));
  }

  if (Platform.OS === 'android') {
    const rawItems = await ExpoIapModule.fetchProducts(native, skus);
    return castResult(filterAndroidItems(rawItems));
  }

  throw new Error('Unsupported platform');
};

export const getAvailablePurchases: QueryField<
  'getAvailablePurchases'
> = async (options) => {
  const normalizedOptions: PurchaseOptions = {
    alsoPublishToEventListenerIOS:
      options?.alsoPublishToEventListenerIOS ?? false,
    onlyIncludeActiveItemsIOS: options?.onlyIncludeActiveItemsIOS ?? true,
  };

  const resolvePurchases: () => Promise<Purchase[]> =
    Platform.select({
      ios: () =>
        ExpoIapModule.getAvailableItems(
          normalizedOptions.alsoPublishToEventListenerIOS,
          normalizedOptions.onlyIncludeActiveItemsIOS,
        ) as Promise<Purchase[]>,
      android: () => ExpoIapModule.getAvailableItems() as Promise<Purchase[]>,
    }) ?? (() => Promise.resolve([] as Purchase[]));

  const purchases = await resolvePurchases();
  return normalizePurchaseList(purchases);
};

/**
 * Restore completed transactions (cross-platform behavior)
 *
 * - iOS: perform a lightweight sync to refresh transactions and ignore sync errors,
 *   then fetch available purchases to surface restored items to the app.
 * - Android: simply fetch available purchases (restoration happens via query).
 *
 * This helper returns the restored/available purchases so callers can update UI/state.
 *
 * @param options.alsoPublishToEventListenerIOS - iOS only: whether to also publish to the event listener
 * @param options.onlyIncludeActiveItemsIOS - iOS only: whether to only include active items
 * @returns Promise resolving to the list of available/restored purchases
 */
export const restorePurchases: MutationField<'restorePurchases'> = async () => {
  if (Platform.OS === 'ios') {
    await syncIOS().catch(() => undefined);
  }

  await getAvailablePurchases({
    alsoPublishToEventListenerIOS: false,
    onlyIncludeActiveItemsIOS: true,
  });
};

const offerToRecordIOS = (
  offer: DiscountOfferInputIOS | undefined,
): Record<keyof DiscountOfferInputIOS, string> | undefined => {
  if (!offer) return undefined;
  return {
    identifier: offer.identifier,
    keyIdentifier: offer.keyIdentifier,
    nonce: offer.nonce,
    signature: offer.signature,
    timestamp: offer.timestamp.toString(),
  };
};

/**
 * Helper to normalize request props to platform-specific format
 */
function normalizeRequestProps(
  request: RequestPurchasePropsByPlatforms,
  platform: 'ios',
): RequestPurchaseIosProps | null | undefined;
function normalizeRequestProps(
  request: RequestPurchasePropsByPlatforms,
  platform: 'android',
): RequestPurchaseAndroidProps | null | undefined;
function normalizeRequestProps(
  request: RequestSubscriptionPropsByPlatforms,
  platform: 'ios',
): RequestSubscriptionIosProps | null | undefined;
function normalizeRequestProps(
  request: RequestSubscriptionPropsByPlatforms,
  platform: 'android',
): RequestSubscriptionAndroidProps | null | undefined;
function normalizeRequestProps(
  request:
    | RequestPurchasePropsByPlatforms
    | RequestSubscriptionPropsByPlatforms,
  platform: 'ios' | 'android',
) {
  // Platform-specific format - directly return the appropriate platform data
  return platform === 'ios' ? request.ios : request.android;
}

/**
 * Request a purchase for products or subscriptions.
 *
 * @param requestObj - Purchase request configuration
 * @param requestObj.request - Platform-specific purchase parameters
 * @param requestObj.type - Type of purchase: 'in-app' for products (default) or 'subs' for subscriptions
 *
 * @example
 * ```typescript
 * // Product purchase
 * await requestPurchase({
 *   request: {
 *     ios: { sku: productId },
 *     android: { skus: [productId] }
 *   },
 *   type: 'in-app'
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
export const requestPurchase: MutationField<'requestPurchase'> = async (
  args,
) => {
  const {request, type} = args;
  const {canonical, native} = normalizeProductType(type as ProductTypeInput);
  const isInAppPurchase = canonical === 'in-app';

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

    const offer = offerToRecordIOS(withOffer ?? undefined);
    const purchase = await ExpoIapModule.requestPurchase({
      sku,
      andDangerouslyFinishTransactionAutomatically,
      appAccountToken,
      quantity,
      withOffer: offer,
    });

    return normalizePurchaseId(purchase as Purchase);
  }

  if (Platform.OS === 'android') {
    if (isInAppPurchase) {
      const normalizedRequest = normalizeRequestProps(
        request as RequestPurchasePropsByPlatforms,
        'android',
      ) as RequestPurchaseAndroidProps | null | undefined;

      if (!normalizedRequest?.skus?.length) {
        throw new Error(
          'Invalid request for Android. The `skus` property is required and must be a non-empty array.',
        );
      }

      const {
        skus,
        obfuscatedAccountIdAndroid,
        obfuscatedProfileIdAndroid,
        isOfferPersonalized,
      } = normalizedRequest;

      const result = (await ExpoIapModule.requestPurchase({
        type: native,
        skuArr: skus,
        purchaseToken: undefined,
        replacementMode: -1,
        obfuscatedAccountId: obfuscatedAccountIdAndroid,
        obfuscatedProfileId: obfuscatedProfileIdAndroid,
        offerTokenArr: [],
        isOfferPersonalized: isOfferPersonalized ?? false,
      })) as Purchase[];

      return normalizePurchaseList(result);
    }

    if (canonical === 'subs') {
      const normalizedRequest = normalizeRequestProps(
        request as RequestSubscriptionPropsByPlatforms,
        'android',
      ) as RequestSubscriptionAndroidProps | null | undefined;

      if (!normalizedRequest?.skus?.length) {
        throw new Error(
          'Invalid request for Android. The `skus` property is required and must be a non-empty array.',
        );
      }

      const {
        skus,
        obfuscatedAccountIdAndroid,
        obfuscatedProfileIdAndroid,
        isOfferPersonalized,
        subscriptionOffers,
        replacementModeAndroid,
        purchaseTokenAndroid,
      } = normalizedRequest;

      const normalizedOffers = subscriptionOffers ?? [];
      const replacementMode = replacementModeAndroid ?? -1;
      const purchaseToken = purchaseTokenAndroid ?? undefined;

      const result = (await ExpoIapModule.requestPurchase({
        type: native,
        skuArr: skus,
        purchaseToken,
        replacementMode,
        obfuscatedAccountId: obfuscatedAccountIdAndroid,
        obfuscatedProfileId: obfuscatedProfileIdAndroid,
        offerTokenArr: normalizedOffers.map(
          (offer: AndroidSubscriptionOfferInput) => offer.offerToken,
        ),
        subscriptionOffers: normalizedOffers,
        isOfferPersonalized: isOfferPersonalized ?? false,
      })) as Purchase[];

      return normalizePurchaseList(result);
    }

    throw new Error(
      "Invalid request for Android: Expected a valid request object with 'skus' array.",
    );
  }

  throw new Error('Platform not supported');
};

const toPurchaseInput = (
  purchase: Purchase | PurchaseInput,
): PurchaseInput => ({
  id: purchase.id,
  ids: purchase.ids ?? undefined,
  isAutoRenewing: purchase.isAutoRenewing,
  platform: purchase.platform,
  productId: purchase.productId,
  purchaseState: purchase.purchaseState,
  purchaseToken: purchase.purchaseToken ?? null,
  quantity: purchase.quantity,
  transactionDate: purchase.transactionDate,
});

export const finishTransaction: MutationField<'finishTransaction'> = async ({
  purchase,
  isConsumable = false,
}) => {
  const normalizedPurchase = toPurchaseInput(purchase);

  if (Platform.OS === 'ios') {
    const transactionId = normalizedPurchase.id;
    if (!transactionId) {
      throw new Error('purchase.id required to finish iOS transaction');
    }
    await ExpoIapModule.finishTransaction(transactionId);
    return;
  }

  if (Platform.OS === 'android') {
    const token = normalizedPurchase.purchaseToken ?? undefined;

    if (!token) {
      throw new PurchaseError({
        message: 'Purchase token is required to finish transaction',
        code: ErrorCode.DeveloperError,
        productId: normalizedPurchase.productId,
        platform: 'android',
      });
    }

    if (isConsumable) {
      await ExpoIapModule.consumePurchaseAndroid(token);
      return;
    }

    await ExpoIapModule.acknowledgePurchaseAndroid(token);
    return;
  }

  throw new Error('Unsupported Platform');
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
  return ExpoIapModule.getStorefrontIOS();
};

/**
 * Gets the storefront country code from the underlying native store.
 * Returns a two-letter country code such as 'US', 'KR', or empty string on failure.
 *
 * @platform ios
 * @platform android
 */
export const getStorefront = (): Promise<string> => {
  // Cross-platform storefront
  if (Platform.OS === 'android') {
    if (typeof ExpoIapModule.getStorefrontAndroid === 'function') {
      return ExpoIapModule.getStorefrontAndroid();
    }
    return Promise.resolve('');
  }
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
export const validateReceipt: MutationField<'validateReceipt'> = async (
  options,
) => {
  const {sku, androidOptions} = options as MutationValidateReceiptArgs;

  if (Platform.OS === 'ios') {
    return validateReceiptIOS({sku});
  }

  if (Platform.OS === 'android') {
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
    return validateReceiptAndroid({
      packageName: androidOptions.packageName,
      productId: sku,
      productToken: androidOptions.productToken,
      accessToken: androidOptions.accessToken,
      isSub: androidOptions.isSub ?? undefined,
    });
  }

  throw new Error('Platform not supported');
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
export const deepLinkToSubscriptions: MutationField<
  'deepLinkToSubscriptions'
> = async (options) => {
  if (Platform.OS === 'ios') {
    await deepLinkToSubscriptionsIOS();
    return;
  }

  if (Platform.OS === 'android') {
    await deepLinkToSubscriptionsAndroid((options as DeepLinkOptions) ?? null);
    return;
  }

  throw new Error(`Unsupported platform: ${Platform.OS}`);
};

export * from './useIAP';
export * from './utils/errorMapping';
