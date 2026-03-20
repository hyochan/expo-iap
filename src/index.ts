// External dependencies
import {Platform} from 'react-native';

// Internal modules
import ExpoIapModule, {getNativeModule} from './ExpoIapModule';
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
import {ExpoIapConsole} from './utils/debug';

// Types
import type {
  ActiveSubscription,
  AndroidSubscriptionOfferInput,
  DeepLinkOptions,
  DeveloperProvidedBillingDetailsAndroid,
  MutationField,
  MutationRequestPurchaseArgs,
  MutationValidateReceiptArgs,
  Product,
  ProductQueryType,
  ProductSubscription,
  Purchase,
  PurchaseOptions,
  QueryField,
  RequestPurchasePropsByPlatforms,
  RequestPurchaseAndroidProps,
  RequestPurchaseIosProps,
  RequestSubscriptionPropsByPlatforms,
  RequestSubscriptionAndroidProps,
  RequestSubscriptionIosProps,
  UserChoiceBillingDetails,
} from './types';
import {ErrorCode} from './types';
import {createPurchaseError, type PurchaseError} from './utils/errorMapping';

// Export all types
export * from './types';
export * from './modules/android';
export * from './modules/ios';
export * from './onside';

// Get the native constant value
export enum OpenIapEvent {
  PurchaseUpdated = 'purchase-updated',
  PurchaseError = 'purchase-error',
  PromotedProductIOS = 'promoted-product-ios',
  UserChoiceBillingAndroid = 'user-choice-billing-android',
  /**
   * Fired when user selects developer billing in External Payments flow (Android 8.3.0+)
   * Only available in Japan. Contains externalTransactionToken for reporting.
   */
  DeveloperProvidedBillingAndroid = 'developer-provided-billing-android',
}

type ExpoIapEventPayloads = {
  [OpenIapEvent.PurchaseUpdated]: Purchase;
  [OpenIapEvent.PurchaseError]: PurchaseError;
  [OpenIapEvent.PromotedProductIOS]: Product;
  [OpenIapEvent.UserChoiceBillingAndroid]: UserChoiceBillingDetails;
  [OpenIapEvent.DeveloperProvidedBillingAndroid]: DeveloperProvidedBillingDetailsAndroid;
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

// Use the raw native module for listener calls — JSI HostObjects require the
// real native module as `this` when calling addListener. Using a Proxy as
// `this` triggers "native state unsupported on Proxy" on New Architecture / Hermes.
// Resolved lazily so importing this module doesn't throw on unsupported platforms.
export const emitter: ExpoIapEmitter = {
  addListener(eventName, listener) {
    return getNativeModule().addListener(eventName, listener);
  },
  removeListener(eventName, listener) {
    return getNativeModule().removeListener(eventName, listener);
  },
};

/**
 * TODO(v3.1.0): Remove legacy 'inapp' alias once downstream apps migrate to 'in-app'.
 */
export type ProductTypeInput = ProductQueryType | 'inapp';

const normalizeProductType = (type?: ProductTypeInput) => {
  if (type === 'inapp') {
    ExpoIapConsole.warn(
      "'inapp' product type is deprecated and will be removed in v3.1.0. Use 'in-app' instead.",
    );
  }

  if (!type || type === 'inapp' || type === 'in-app') {
    return {
      canonical: 'in-app' as ProductQueryType,
      native: 'in-app' as const,
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

const normalizePurchasePlatform = (purchase: Purchase): Purchase => {
  const platform = purchase.platform;
  if (typeof platform !== 'string') {
    return purchase;
  }

  const lowered = platform.toLowerCase();
  if (lowered === platform || (lowered !== 'ios' && lowered !== 'android')) {
    return purchase;
  }

  return {...purchase, platform: lowered};
};

const normalizePurchaseArray = (purchases: Purchase[]): Purchase[] =>
  purchases.map((purchase) => normalizePurchasePlatform(purchase));

export const purchaseUpdatedListener = (
  listener: (event: Purchase) => void,
) => {
  const wrappedListener = (event: Purchase) => {
    const normalized = normalizePurchasePlatform(event);
    listener(normalized);
  };
  const emitterSubscription = emitter.addListener(
    OpenIapEvent.PurchaseUpdated,
    wrappedListener,
  );
  return emitterSubscription;
};

export const purchaseErrorListener = (
  listener: (error: PurchaseError) => void,
) => {
  const wrappedListener = (error: PurchaseError) => {
    listener(error);
  };
  const emitterSubscription = emitter.addListener(
    OpenIapEvent.PurchaseError,
    wrappedListener,
  );
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
    ExpoIapConsole.warn(
      'promotedProductListenerIOS: This listener is only available on iOS',
    );
    return {remove: () => {}};
  }
  return emitter.addListener(OpenIapEvent.PromotedProductIOS, listener);
};

/**
 * Android-only listener for User Choice Billing events.
 * This fires when a user selects alternative billing instead of Google Play billing
 * in the User Choice Billing dialog (only in 'user-choice' mode).
 *
 * @param listener - Callback function that receives the external transaction token and product IDs
 * @returns EventSubscription that can be used to unsubscribe
 *
 * @example
 * ```typescript
 * const subscription = userChoiceBillingListenerAndroid((details) => {
 *   console.log('User selected alternative billing');
 *   console.log('Token:', details.externalTransactionToken);
 *   console.log('Products:', details.products);
 *
 *   // Process payment in your system, then report token to Google
 *   await processPaymentAndReportToken(details);
 * });
 *
 * // Later, clean up
 * subscription.remove();
 * ```
 *
 * @platform Android
 */
export const userChoiceBillingListenerAndroid = (
  listener: (details: UserChoiceBillingDetails) => void,
) => {
  if (Platform.OS !== 'android') {
    ExpoIapConsole.warn(
      'userChoiceBillingListenerAndroid: This listener is only available on Android',
    );
    return {remove: () => {}};
  }
  return emitter.addListener(OpenIapEvent.UserChoiceBillingAndroid, listener);
};

/**
 * Android-only listener for Developer Provided Billing events (External Payments).
 * This fires when a user selects the developer's payment option in the External Payments
 * side-by-side choice dialog during purchase flow.
 *
 * Requires Google Play Billing Library 8.3.0+ and is currently only available in Japan.
 *
 * @param listener - Callback function that receives the external transaction token
 * @returns EventSubscription that can be used to unsubscribe
 *
 * @example
 * ```typescript
 * const subscription = developerProvidedBillingListenerAndroid(async (details) => {
 *   console.log('User selected developer billing');
 *   console.log('Token:', details.externalTransactionToken);
 *
 *   // Process payment with your payment gateway
 *   await processPaymentWithYourGateway(details.externalTransactionToken);
 *
 *   // IMPORTANT: Report the token to Google Play within 24 hours
 *   await reportExternalTransactionToGoogle(details.externalTransactionToken);
 * });
 *
 * // Later, clean up
 * subscription.remove();
 * ```
 *
 * @platform Android (8.3.0+, Japan only)
 */
export const developerProvidedBillingListenerAndroid = (
  listener: (details: DeveloperProvidedBillingDetailsAndroid) => void,
) => {
  if (Platform.OS !== 'android') {
    ExpoIapConsole.warn(
      'developerProvidedBillingListenerAndroid: This listener is only available on Android',
    );
    return {remove: () => {}};
  }
  return emitter.addListener(
    OpenIapEvent.DeveloperProvidedBillingAndroid,
    listener,
  );
};

export const initConnection: MutationField<'initConnection'> = async (config) =>
  ExpoIapModule.initConnection(config ?? null);

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
  ExpoIapConsole.debug('fetchProducts called with:', request);
  const {skus, type} = request ?? {};

  if (!Array.isArray(skus) || skus.length === 0) {
    throw createPurchaseError({
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
  ): (Product | ProductSubscription)[] =>
    items.filter((item): item is Product | ProductSubscription => {
      if (!isProductIOS(item)) {
        return false;
      }
      const candidate = item as Product | ProductSubscription;
      return typeof candidate.id === 'string' && skuSet.has(candidate.id);
    });

  const filterAndroidItems = (
    items: unknown[],
  ): (Product | ProductSubscription)[] =>
    items.filter((item): item is Product | ProductSubscription => {
      if (!isProductAndroid(item)) {
        return false;
      }
      const candidate = item as Product | ProductSubscription;
      return typeof candidate.id === 'string' && skuSet.has(candidate.id);
    });

  const castResult = (
    items: (Product | ProductSubscription)[],
  ):
    | (Product | ProductSubscription)[]
    | Product[]
    | ProductSubscription[]
    | null => {
    if (canonical === 'in-app') {
      return items as Product[];
    }
    if (canonical === 'subs') {
      return items as ProductSubscription[];
    }
    // For 'all' type, items contain both Product and ProductSubscription
    // Return as ProductOrSubscription[] to preserve discriminated union
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
    includeSuspendedAndroid: options?.includeSuspendedAndroid ?? false,
  };

  const resolvePurchases: () => Promise<Purchase[]> =
    Platform.select({
      ios: () =>
        ExpoIapModule.getAvailableItems(
          normalizedOptions.alsoPublishToEventListenerIOS,
          normalizedOptions.onlyIncludeActiveItemsIOS,
        ) as Promise<Purchase[]>,
      android: () =>
        ExpoIapModule.getAvailableItems(normalizedOptions) as Promise<
          Purchase[]
        >,
    }) ?? (() => Promise.resolve([] as Purchase[]));

  const purchases = await resolvePurchases();
  return normalizePurchaseArray(purchases as Purchase[]);
};

/**
 * Get all active subscriptions with detailed information.
 * Uses native OpenIAP module for accurate subscription status and renewal info.
 *
 * On iOS: Returns subscriptions with renewalInfoIOS containing pendingUpgradeProductId,
 * willAutoRenew, autoRenewPreference, and other renewal details.
 *
 * On Android: Filters available purchases to find active subscriptions (fallback implementation).
 *
 * @param subscriptionIds - Optional array of subscription product IDs to filter. If not provided, returns all active subscriptions.
 * @returns Promise resolving to array of active subscriptions with details
 *
 * @example
 * ```typescript
 * // Get all active subscriptions
 * const subs = await getActiveSubscriptions();
 *
 * // Get specific subscriptions
 * const premiumSubs = await getActiveSubscriptions(['premium', 'premium_year']);
 *
 * // Check for pending upgrades (iOS)
 * subs.forEach(sub => {
 *   if (sub.renewalInfoIOS?.pendingUpgradeProductId) {
 *     console.log(`Upgrade pending to: ${sub.renewalInfoIOS.pendingUpgradeProductId}`);
 *   }
 * });
 * ```
 */
export const getActiveSubscriptions: QueryField<
  'getActiveSubscriptions'
> = async (subscriptionIds) => {
  const result = await ExpoIapModule.getActiveSubscriptions(
    subscriptionIds ?? null,
  );
  return (result ?? []) as ActiveSubscription[];
};

/**
 * Check if user has any active subscriptions.
 *
 * @param subscriptionIds - Optional array of subscription product IDs to check. If not provided, checks all subscriptions.
 * @returns Promise resolving to true if user has at least one active subscription
 *
 * @example
 * ```typescript
 * // Check any active subscription
 * const hasAny = await hasActiveSubscriptions();
 *
 * // Check specific subscriptions
 * const hasPremium = await hasActiveSubscriptions(['premium', 'premium_year']);
 * ```
 */
export const hasActiveSubscriptions: QueryField<
  'hasActiveSubscriptions'
> = async (subscriptionIds) => {
  return !!(await ExpoIapModule.hasActiveSubscriptions(
    subscriptionIds ?? null,
  ));
};

export const getStorefront: QueryField<'getStorefront'> = async () => {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return '';
  }
  return ExpoIapModule.getStorefront();
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
  // Support both new (apple/google) and legacy (ios/android) field names
  // New fields take precedence over deprecated ones
  if (platform === 'ios') {
    return request.apple ?? request.ios;
  }
  return request.google ?? request.android;
}

/**
 * Request a purchase for products or subscriptions.
 *
 * @param requestObj - Purchase request configuration
 * @param requestObj.request - Store-specific purchase parameters
 * @param requestObj.type - Type of purchase: 'in-app' for products (default) or 'subs' for subscriptions
 *
 * @example
 * ```typescript
 * // Product purchase (recommended: use apple/google)
 * await requestPurchase({
 *   request: {
 *     apple: { sku: productId },
 *     google: { skus: [productId] }
 *   },
 *   type: 'in-app'
 * });
 *
 * // Subscription purchase
 * await requestPurchase({
 *   request: {
 *     apple: { sku: subscriptionId },
 *     google: {
 *       skus: [subscriptionId],
 *       subscriptionOffers: [{ sku: subscriptionId, offerToken: 'token' }]
 *     }
 *   },
 *   type: 'subs'
 * });
 *
 * // Legacy format (deprecated, but still supported)
 * await requestPurchase({
 *   request: {
 *     ios: { sku: productId },
 *     android: { skus: [productId] }
 *   },
 *   type: 'in-app'
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
        'Invalid request for Apple. The `sku` property is required and must be a string.\n\n' +
          'Expected format:\n' +
          '  requestPurchase({\n' +
          '    request: {\n' +
          '      apple: { sku: "product_id" },\n' +
          '      google: { skus: ["product_id"] }\n' +
          '    },\n' +
          '    type: "in-app"\n' +
          '  })\n\n' +
          'See: https://hyochan.github.io/expo-iap/docs/api/methods/core-methods#requestpurchase',
      );
    }

    if (canonical !== 'in-app' && canonical !== 'subs') {
      throw new Error(`Unsupported product type: ${canonical}`);
    }

    const payload: MutationRequestPurchaseArgs = {
      type: canonical === 'in-app' ? 'in-app' : 'subs',
      request: {ios: normalizedRequest},
      useAlternativeBilling: args.useAlternativeBilling,
    };

    const purchase = (await ExpoIapModule.requestPurchase(payload)) as
      | Purchase
      | Purchase[]
      | null;

    if (Array.isArray(purchase)) {
      return normalizePurchaseArray(purchase);
    }

    if (purchase) {
      return normalizePurchasePlatform(purchase);
    }

    return canonical === 'subs' ? [] : null;
  }

  if (Platform.OS === 'android') {
    if (isInAppPurchase) {
      const normalizedRequest = normalizeRequestProps(
        request as RequestPurchasePropsByPlatforms,
        'android',
      ) as RequestPurchaseAndroidProps | null | undefined;

      if (!normalizedRequest?.skus?.length) {
        throw new Error(
          'Invalid request for Google. The `skus` property is required and must be a non-empty array.\n\n' +
            'Expected format:\n' +
            '  requestPurchase({\n' +
            '    request: {\n' +
            '      apple: { sku: "product_id" },\n' +
            '      google: { skus: ["product_id"] }\n' +
            '    },\n' +
            '    type: "in-app"\n' +
            '  })\n\n' +
            'See: https://hyochan.github.io/expo-iap/docs/api/methods/core-methods#requestpurchase',
        );
      }

      const {
        skus,
        obfuscatedAccountId,
        obfuscatedProfileId,
        isOfferPersonalized,
        offerToken,
      } = normalizedRequest;

      const result = (await ExpoIapModule.requestPurchase({
        type: native,
        skuArr: skus,
        purchaseToken: undefined,
        replacementMode: -1,
        obfuscatedAccountId: obfuscatedAccountId,
        obfuscatedProfileId: obfuscatedProfileId,
        offerToken: offerToken,
        offerTokenArr: [],
        isOfferPersonalized: isOfferPersonalized ?? false,
      })) as Purchase[];

      return normalizePurchaseArray(result);
    }

    if (canonical === 'subs') {
      const normalizedRequest = normalizeRequestProps(
        request as RequestSubscriptionPropsByPlatforms,
        'android',
      ) as RequestSubscriptionAndroidProps | null | undefined;

      if (!normalizedRequest?.skus?.length) {
        throw new Error(
          'Invalid request for Google. The `skus` property is required and must be a non-empty array.\n\n' +
            'Expected format:\n' +
            '  requestPurchase({\n' +
            '    request: {\n' +
            '      apple: { sku: "subscription_id" },\n' +
            '      google: { skus: ["subscription_id"] }\n' +
            '    },\n' +
            '    type: "subs"\n' +
            '  })\n\n' +
            'See: https://hyochan.github.io/expo-iap/docs/api/methods/core-methods#requestpurchase',
        );
      }

      const {
        skus,
        obfuscatedAccountId,
        obfuscatedProfileId,
        isOfferPersonalized,
        subscriptionOffers,
        replacementMode: replacementModeInput,
        purchaseToken: purchaseTokenInput,
        subscriptionProductReplacementParams,
      } = normalizedRequest;

      const normalizedOffers = subscriptionOffers ?? [];
      const replacementMode = replacementModeInput ?? -1;
      const purchaseToken = purchaseTokenInput ?? undefined;

      const result = (await ExpoIapModule.requestPurchase({
        type: native,
        skuArr: skus,
        purchaseToken,
        replacementMode,
        obfuscatedAccountId: obfuscatedAccountId,
        obfuscatedProfileId: obfuscatedProfileId,
        offerTokenArr: normalizedOffers.map(
          (offer: AndroidSubscriptionOfferInput) => offer.offerToken,
        ),
        subscriptionOffers: normalizedOffers,
        isOfferPersonalized: isOfferPersonalized ?? false,
        subscriptionProductReplacementParams:
          subscriptionProductReplacementParams ?? undefined,
      })) as Purchase[];

      return normalizePurchaseArray(result);
    }

    throw new Error(
      "Invalid request for Android: Expected a valid request object with 'skus' array.",
    );
  }

  throw new Error('Platform not supported');
};

export const finishTransaction: MutationField<'finishTransaction'> = async ({
  purchase,
  isConsumable = false,
}) => {
  if (Platform.OS === 'ios') {
    await ExpoIapModule.finishTransaction(purchase, isConsumable);
    return;
  }

  if (Platform.OS === 'android') {
    const token = purchase.purchaseToken ?? undefined;

    if (!token) {
      throw createPurchaseError({
        message: 'Purchase token is required to finish transaction',
        code: ErrorCode.DeveloperError,
        productId: purchase.productId,
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
 * Restore completed transactions (cross-platform behavior)
 *
 * - iOS: perform a lightweight sync to refresh transactions and ignore sync errors,
 *   then fetch available purchases to surface restored items to the app.
 * - Android: simply fetch available purchases (restoration happens via query).
 *
 * This helper triggers the refresh flows but does not return the purchases; consumers should
 * call `getAvailablePurchases` or rely on hook state to inspect the latest items.
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

/**
 * Internal receipt validation function (NOT RECOMMENDED for production use)
 *
 * WARNING: This function performs client-side validation which is NOT secure.
 * For production apps, always validate receipts on your secure server:
 * - iOS: Send receipt data to Apple's verification endpoint from your server
 * - Android: Use Google Play Developer API with service account credentials
 *
 * @deprecated Use verifyPurchase instead
 */
export const validateReceipt: MutationField<'validateReceipt'> = async (
  options,
) => {
  const {apple, google} = options as MutationValidateReceiptArgs;

  if (Platform.OS === 'ios') {
    if (!apple?.sku) {
      throw new Error('iOS validation requires apple.sku');
    }
    return validateReceiptIOS({apple: {sku: apple.sku}});
  }

  if (Platform.OS === 'android') {
    if (
      !google ||
      !google.sku ||
      !google.packageName ||
      !google.purchaseToken ||
      !google.accessToken
    ) {
      throw new Error(
        'Android validation requires google.sku, google.packageName, google.purchaseToken, and google.accessToken',
      );
    }
    return validateReceiptAndroid({
      packageName: google.packageName,
      productId: google.sku,
      productToken: google.purchaseToken,
      accessToken: google.accessToken,
      isSub: google.isSub ?? undefined,
    });
  }

  throw new Error('Platform not supported');
};

/**
 * Verify purchase with the configured providers
 *
 * This function uses the native OpenIAP verifyPurchase implementation
 * which validates purchases using platform-specific methods.
 *
 * @param options - Receipt validation options containing the SKU
 * @returns Promise resolving to receipt validation result
 */
export const verifyPurchase: MutationField<'verifyPurchase'> = async (
  options,
) => {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return ExpoIapModule.verifyPurchase(options);
  }

  throw new Error(`Unsupported platform: ${Platform.OS}`);
};

/**
 * Verify purchase with a specific provider (e.g., IAPKit)
 *
 * This function allows you to verify purchases using external verification
 * services like IAPKit, which provide additional validation and security.
 *
 * @param options - Verification options including provider and credentials
 * @returns Promise resolving to provider-specific verification result
 *
 * @example
 * ```typescript
 * const result = await verifyPurchaseWithProvider({
 *   provider: 'iapkit',
 *   iapkit: {
 *     apiKey: 'your-api-key',
 *     apple: {
 *       jws: purchase.purchaseToken // JWS from purchase
 *     },
 *     google: {
 *       purchaseToken: purchase.purchaseToken
 *     }
 *   }
 * });
 * ```
 */
export const verifyPurchaseWithProvider: MutationField<
  'verifyPurchaseWithProvider'
> = async (options) => {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    // Auto-fill apiKey from config if not provided and provider is iapkit
    if (
      options.provider === 'iapkit' &&
      options.iapkit &&
      !options.iapkit.apiKey
    ) {
      try {
        // Dynamically import expo-constants to avoid hard dependency
        const {default: Constants} = await import('expo-constants');
        const configApiKey = Constants.expoConfig?.extra?.iapkitApiKey;
        if (configApiKey) {
          options = {
            ...options,
            iapkit: {
              ...options.iapkit,
              apiKey: configApiKey,
            },
          };
        }
      } catch {
        throw new Error(
          'expo-constants is required for auto-filling iapkitApiKey from config. ' +
            'Please install it: npx expo install expo-constants\n' +
            'Or provide apiKey directly in verifyPurchaseWithProvider options.',
        );
      }
    }
    return ExpoIapModule.verifyPurchaseWithProvider(options);
  }

  throw new Error(`Unsupported platform: ${Platform.OS}`);
};

export * from './useIAP';
export {
  ErrorCodeUtils,
  ErrorCodeMapping,
  createPurchaseError,
  createPurchaseErrorFromPlatform,
} from './utils/errorMapping';
export type {
  PurchaseError as ExpoPurchaseError,
  PurchaseErrorProps,
} from './utils/errorMapping';
export {ExpoIapConsole} from './utils/debug';
