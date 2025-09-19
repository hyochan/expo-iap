// External dependencies

// Internal modules
// import removed: use purchaseUpdatedListener directly in app code
import ExpoIapModule from '../ExpoIapModule';

// Types
import type {
  MutationField,
  ProductIOS,
  Purchase,
  PurchaseIOS,
  QueryField,
  ReceiptValidationProps,
  ReceiptValidationResultIOS,
  SubscriptionStatusIOS,
} from '../types';
import type {PurchaseError} from '../utils/errorMapping';
import {Linking, Platform} from 'react-native';

export type TransactionEvent = {
  transaction?: Purchase;
  error?: PurchaseError;
};

// Listeners

// Type guards
export function isProductIOS<T extends {platform?: string}>(
  item: unknown,
): item is T & {platform: 'ios'} {
  return (
    item != null &&
    typeof item === 'object' &&
    'platform' in item &&
    typeof (item as any).platform === 'string' &&
    (item as any).platform.toLowerCase() === 'ios'
  );
}

// Functions
/**
 * Sync state with Appstore (iOS only)
 * https://developer.apple.com/documentation/storekit/appstore/3791906-sync
 *
 * @returns Promise resolving to null on success
 * @throws Error if called on non-iOS platform
 *
 * @platform iOS
 */
export const syncIOS: MutationField<'syncIOS'> = async () => {
  return Boolean(await ExpoIapModule.syncIOS());
};

/**
 * Check if user is eligible for introductory offer
 *
 * @param groupId The subscription group ID
 * @returns Promise resolving to true if eligible
 * @throws Error if called on non-iOS platform
 *
 * @platform iOS
 */
export const isEligibleForIntroOfferIOS: QueryField<
  'isEligibleForIntroOfferIOS'
> = async (groupID) => {
  if (!groupID) {
    throw new Error('isEligibleForIntroOfferIOS requires a groupID');
  }
  return ExpoIapModule.isEligibleForIntroOfferIOS(groupID);
};

/**
 * Get subscription status for a specific SKU
 *
 * @param sku The product SKU
 * @returns Promise resolving to array of subscription status
 * @throws Error if called on non-iOS platform
 *
 * @platform iOS
 */
export const subscriptionStatusIOS: QueryField<
  'subscriptionStatusIOS'
> = async (sku) => {
  if (!sku) {
    throw new Error('subscriptionStatusIOS requires a SKU');
  }
  const status = await ExpoIapModule.subscriptionStatusIOS(sku);
  return (status ?? []) as SubscriptionStatusIOS[];
};

/**
 * Get current entitlement for a specific SKU
 *
 * @param sku The product SKU
 * @returns Promise resolving to current entitlement
 * @throws Error if called on non-iOS platform
 *
 * @platform iOS
 */
export const currentEntitlementIOS: QueryField<
  'currentEntitlementIOS'
> = async (sku) => {
  if (!sku) {
    throw new Error('currentEntitlementIOS requires a SKU');
  }
  const purchase = await ExpoIapModule.currentEntitlementIOS(sku);
  return (purchase ?? null) as PurchaseIOS | null;
};

/**
 * Get latest transaction for a specific SKU
 *
 * @param sku The product SKU
 * @returns Promise resolving to latest transaction
 * @throws Error if called on non-iOS platform
 *
 * @platform iOS
 */
export const latestTransactionIOS: QueryField<'latestTransactionIOS'> = async (
  sku,
) => {
  if (!sku) {
    throw new Error('latestTransactionIOS requires a SKU');
  }
  const transaction = await ExpoIapModule.latestTransactionIOS(sku);
  return (transaction ?? null) as PurchaseIOS | null;
};

/**
 * Begin refund request for a specific SKU
 *
 * @param sku The product SKU
 * @returns Promise resolving to refund request status
 * @throws Error if called on non-iOS platform
 *
 * @platform iOS
 */
export const beginRefundRequestIOS: MutationField<
  'beginRefundRequestIOS'
> = async (sku) => {
  if (!sku) {
    throw new Error('beginRefundRequestIOS requires a SKU');
  }
  const status = await ExpoIapModule.beginRefundRequestIOS(sku);
  return status ?? null;
};

/**
 * Shows the system UI for managing subscriptions.
 * Returns an array of subscriptions that had status changes after the UI is closed.
 *
 * @returns Promise<Purchase[]> - Array of subscriptions with status changes (e.g., auto-renewal toggled)
 * @throws Error if called on non-iOS platform
 *
 * @platform iOS
 */
export const showManageSubscriptionsIOS: MutationField<
  'showManageSubscriptionsIOS'
> = async () => {
  const purchases = await ExpoIapModule.showManageSubscriptionsIOS();
  return (purchases ?? []) as PurchaseIOS[];
};

/**
 * Get the receipt data from the iOS device.
 * This returns the base64 encoded receipt data which can be sent to your server
 * for verification with Apple's server.
 *
 * NOTE: For proper security, always verify receipts on your server using
 * Apple's verifyReceipt endpoint, not directly from the app.
 *
 * @returns {Promise<string>} Base64 encoded receipt data
 */
export const getReceiptDataIOS: QueryField<'getReceiptDataIOS'> = async () => {
  return ExpoIapModule.getReceiptDataIOS();
};

export const getReceiptIOS = getReceiptDataIOS;

/**
 * Retrieves the current storefront information from the iOS App Store.
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
export const getStorefrontIOS: QueryField<'getStorefrontIOS'> = async () => {
  if (Platform.OS !== 'ios') {
    console.warn('getStorefrontIOS: This method is only available on iOS');
    return '';
  }
  return ExpoIapModule.getStorefrontIOS();
};

/**
 * Check if a transaction is verified through StoreKit 2.
 * StoreKit 2 performs local verification of transaction JWS signatures.
 *
 * @param sku The product's SKU (on iOS)
 * @returns Promise resolving to true if the transaction is verified
 * @throws Error if called on non-iOS platform
 *
 * @platform iOS
 */
export const isTransactionVerifiedIOS: QueryField<
  'isTransactionVerifiedIOS'
> = async (sku) => {
  if (!sku) {
    throw new Error('isTransactionVerifiedIOS requires a SKU');
  }
  return ExpoIapModule.isTransactionVerifiedIOS(sku);
};

/**
 * Get the JWS representation of a purchase for server-side verification.
 * The JWS (JSON Web Signature) can be verified on your server using Apple's public keys.
 *
 * @param sku The product's SKU (on iOS)
 * @returns Promise resolving to JWS representation of the transaction
 * @throws Error if called on non-iOS platform
 *
 * @platform iOS
 */
export const getTransactionJwsIOS: QueryField<'getTransactionJwsIOS'> = async (
  sku,
) => {
  if (!sku) {
    throw new Error('getTransactionJwsIOS requires a SKU');
  }
  const jws = await ExpoIapModule.getTransactionJwsIOS(sku);
  return jws ?? '';
};

/**
 * Validate receipt for iOS using StoreKit 2's built-in verification.
 * Returns receipt data and verification information to help with server-side validation.
 *
 * NOTE: For proper security, Apple recommends verifying receipts on your server using
 * the verifyReceipt endpoint rather than relying solely on client-side verification.
 *
 * @param {string} sku The product's SKU (on iOS)
 * @returns {Promise<{
 *   isValid: boolean;
 *   receiptData: string;
 *   jwsRepresentation: string;
 *   latestTransaction?: Purchase;
 * }>}
 */
const validateReceiptIOSImpl = async (
  props: ReceiptValidationProps | string,
) => {
  const sku =
    typeof props === 'string' ? props : (props as ReceiptValidationProps)?.sku;

  if (!sku) {
    throw new Error('validateReceiptIOS requires a SKU');
  }

  return (await ExpoIapModule.validateReceiptIOS(
    sku,
  )) as ReceiptValidationResultIOS;
};

export const validateReceiptIOS =
  validateReceiptIOSImpl as QueryField<'validateReceiptIOS'>;

/**
 * Present the code redemption sheet for offer codes (iOS only).
 * This allows users to redeem promotional codes for in-app purchases and subscriptions.
 *
 * Note: This only works on real devices, not simulators.
 *
 * @returns Promise resolving to true if the sheet was presented successfully
 * @throws Error if called on non-iOS platform or tvOS
 *
 * @platform iOS
 */
export const presentCodeRedemptionSheetIOS: MutationField<
  'presentCodeRedemptionSheetIOS'
> = async () => {
  return Boolean(await ExpoIapModule.presentCodeRedemptionSheetIOS());
};

/**
 * Get app transaction information (iOS 16.0+).
 * AppTransaction represents the initial purchase that unlocked the app.
 *
 * NOTE: This function requires:
 * - iOS 16.0 or later at runtime
 * - Xcode 15.0+ with iOS 16.0 SDK for compilation
 *
 * @returns Promise resolving to the app transaction information or null if not available
 * @throws Error if called on non-iOS platform, iOS version < 16.0, or compiled with older SDK
 *
 * @platform iOS
 * @since iOS 16.0
 */
export const getAppTransactionIOS: QueryField<
  'getAppTransactionIOS'
> = async () => {
  return (await ExpoIapModule.getAppTransactionIOS()) ?? null;
};

/**
 * Get information about a promoted product if one is available (iOS only).
 * Promoted products are products that the App Store promotes on your behalf.
 * This is called after a promoted product event is received from the App Store.
 *
 * @returns Promise resolving to the promoted product information or null if none available
 * @throws Error if called on non-iOS platform
 *
 * @platform iOS
 */
export const getPromotedProductIOS: QueryField<
  'getPromotedProductIOS'
> = async () => {
  const product = await ExpoIapModule.getPromotedProductIOS();
  return (product ?? null) as ProductIOS | null;
};

/**
 * Complete the purchase of a promoted product (iOS only).
 * This should be called after showing your purchase UI for a promoted product.
 *
 * @returns Promise resolving when the purchase is initiated
 * @throws Error if called on non-iOS platform or no promoted product is available
 *
 * @platform iOS
 */
export const requestPurchaseOnPromotedProductIOS: MutationField<
  'requestPurchaseOnPromotedProductIOS'
> = async () => {
  await ExpoIapModule.requestPurchaseOnPromotedProductIOS();
  return true;
};

/**
 * Get pending transactions that haven't been finished yet (iOS only).
 *
 * @returns Promise resolving to array of pending transactions
 * @platform iOS
 */
export const getPendingTransactionsIOS: QueryField<
  'getPendingTransactionsIOS'
> = async () => {
  const transactions = await ExpoIapModule.getPendingTransactionsIOS();
  return (transactions ?? []) as PurchaseIOS[];
};

/**
 * Clear a specific transaction (iOS only).
 *
 * @returns Promise resolving when transaction is cleared
 * @platform iOS
 */
export const clearTransactionIOS: MutationField<
  'clearTransactionIOS'
> = async () => {
  return Boolean(await ExpoIapModule.clearTransactionIOS());
};

/**
 * Deep link to subscriptions screen on iOS.
 * @returns {Promise<void>}
 *
 * @platform iOS
 */
export const deepLinkToSubscriptionsIOS = (): Promise<void> =>
  Linking.openURL('https://apps.apple.com/account/subscriptions');

// iOS-specific APIs only; cross-platform wrappers live in src/index.ts
