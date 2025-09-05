// External dependencies

// Internal modules
import {purchaseUpdatedListener} from '..';
import ExpoIapModule from '../ExpoIapModule';

// Types
import {
  Product,
  Purchase,
  PurchaseError,
} from '../ExpoIap.types';
import type {
  ProductStatusIOS,
  AppTransactionIOS,
} from '../types/ExpoIapIOS.types';
import {Linking} from 'react-native';

export type TransactionEvent = {
  transaction?: Purchase;
  error?: PurchaseError;
};

// Listeners
/**
 * @deprecated Use `purchaseUpdatedListener` instead. This function will be removed in a future version.
 *
 * The `transactionUpdatedIos` function is redundant as it simply wraps `purchaseUpdatedListener`.
 * You can achieve the same functionality by using `purchaseUpdatedListener` directly.
 *
 * @example
 * // Instead of:
 * // transactionUpdatedIos((event) => { ... });
 *
 * // Use:
 * // purchaseUpdatedListener((purchase) => { ... });
 */
export const transactionUpdatedIOS = (
  listener: (event: TransactionEvent) => void,
) => {
  const isPurchase = (item: unknown): item is Purchase => {
    return (
      item != null &&
      typeof item === 'object' &&
      'id' in item &&
      'transactionId' in item &&
      'platform' in item
    );
  };

  // Helper function to safely convert Purchase to TransactionEvent
  const mapPurchaseToTransactionEvent = (
    purchase: Purchase,
  ): TransactionEvent => {
    // Validate the purchase object before casting
    if (isPurchase(purchase)) {
      return {
        transaction: purchase as Purchase,
      };
    }

    // Fallback: create a basic TransactionEvent structure
    return {
      transaction: purchase as Purchase,
    };
  };

  return purchaseUpdatedListener((purchase) => {
    // Convert Purchase to TransactionEvent format for backward compatibility
    const event = mapPurchaseToTransactionEvent(purchase);
    listener(event);
  });
};

// Type guards
export function isProductIOS<T extends {platform?: string}>(
  item: unknown,
): item is T & {platform: 'ios'} {
  return (
    item != null &&
    typeof item === 'object' &&
    'platform' in item &&
    item.platform === 'ios'
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
export const syncIOS = (): Promise<null> => {
  return ExpoIapModule.syncIOS();
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
export const isEligibleForIntroOfferIOS = (
  groupId: string,
): Promise<boolean> => {
  return ExpoIapModule.isEligibleForIntroOfferIOS(groupId);
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
export const subscriptionStatusIOS = (
  sku: string,
): Promise<ProductStatusIOS[]> => {
  return ExpoIapModule.subscriptionStatusIOS(sku);
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
export const currentEntitlementIOS = (
  sku: string,
): Promise<Purchase> => {
  return ExpoIapModule.currentEntitlementIOS(sku);
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
export const latestTransactionIOS = (sku: string): Promise<Purchase> => {
  return ExpoIapModule.latestTransactionIOS(sku);
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
type RefundRequestStatus = 'success' | 'userCancelled';
export const beginRefundRequestIOS = (
  sku: string,
): Promise<RefundRequestStatus> => {
  return ExpoIapModule.beginRefundRequestIOS(sku);
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
export const showManageSubscriptionsIOS = (): Promise<Purchase[]> => {
  return ExpoIapModule.showManageSubscriptionsIOS();
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
export const getReceiptIOS = (): Promise<string> => {
  return ExpoIapModule.getReceiptDataIOS();
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
export const isTransactionVerifiedIOS = (sku: string): Promise<boolean> => {
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
export const getTransactionJwsIOS = (sku: string): Promise<string> => {
  return ExpoIapModule.getTransactionJwsIOS(sku);
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
export const validateReceiptIOS = async (
  sku: string,
): Promise<{
  isValid: boolean;
  receiptData: string;
  jwsRepresentation: string;
  latestTransaction?: Purchase;
}> => {
  const result = await ExpoIapModule.validateReceiptIOS(sku);
  return result;
};

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
export const presentCodeRedemptionSheetIOS = (): Promise<boolean> => {
  return ExpoIapModule.presentCodeRedemptionSheetIOS();
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
export const getAppTransactionIOS = (): Promise<AppTransactionIOS | null> => {
  return ExpoIapModule.getAppTransactionIOS();
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
export const getPromotedProductIOS = (): Promise<Product | null> => {
  return ExpoIapModule.getPromotedProductIOS();
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
export const requestPurchaseOnPromotedProductIOS = (): Promise<void> => {
  return ExpoIapModule.requestPurchaseOnPromotedProductIOS();
};

/**
 * @deprecated Use requestPurchaseOnPromotedProductIOS instead. Will be removed in v2.9.0
 */
export const buyPromotedProductIOS = (): Promise<void> => {
  return requestPurchaseOnPromotedProductIOS();
};

/**
 * Get pending transactions that haven't been finished yet (iOS only).
 * 
 * @returns Promise resolving to array of pending transactions
 * @platform iOS
 */
export const getPendingTransactionsIOS = (): Promise<any[]> => {
  return ExpoIapModule.getPendingTransactionsIOS();
};

/**
 * Clear a specific transaction (iOS only).
 * 
 * @returns Promise resolving when transaction is cleared
 * @platform iOS  
 */
export const clearTransactionIOS = (): Promise<void> => {
  return ExpoIapModule.clearTransactionIOS();
};

/**
 * Deep link to subscriptions screen on iOS.
 * @returns {Promise<void>}
 *
 * @platform iOS
 */
export const deepLinkToSubscriptionsIOS = (): Promise<void> =>
  Linking.openURL('https://apps.apple.com/account/subscriptions');

// ============= DEPRECATED FUNCTIONS =============
// These will be removed in version 3.0.0

/**
 * @deprecated Use `syncIOS` instead. This function will be removed in version 3.0.0.
 */
export const sync = (): Promise<null> => {
  console.warn(
    '`sync` is deprecated. Use `syncIOS` instead. This function will be removed in version 3.0.0.',
  );
  return syncIOS();
};

/**
 * @deprecated Use `isEligibleForIntroOfferIOS` instead. This function will be removed in version 3.0.0.
 */
export const isEligibleForIntroOffer = (groupId: string): Promise<boolean> => {
  console.warn(
    '`isEligibleForIntroOffer` is deprecated. Use `isEligibleForIntroOfferIOS` instead. This function will be removed in version 3.0.0.',
  );
  return isEligibleForIntroOfferIOS(groupId);
};

/**
 * @deprecated Use `subscriptionStatusIOS` instead. This function will be removed in version 3.0.0.
 */
export const subscriptionStatus = (
  sku: string,
): Promise<ProductStatusIOS[]> => {
  console.warn(
    '`subscriptionStatus` is deprecated. Use `subscriptionStatusIOS` instead. This function will be removed in version 3.0.0.',
  );
  return subscriptionStatusIOS(sku);
};

/**
 * @deprecated Use `currentEntitlementIOS` instead. This function will be removed in version 3.0.0.
 */
export const currentEntitlement = (sku: string): Promise<Purchase> => {
  console.warn(
    '`currentEntitlement` is deprecated. Use `currentEntitlementIOS` instead. This function will be removed in version 3.0.0.',
  );
  return currentEntitlementIOS(sku);
};

/**
 * @deprecated Use `latestTransactionIOS` instead. This function will be removed in version 3.0.0.
 */
export const latestTransaction = (sku: string): Promise<Purchase> => {
  console.warn(
    '`latestTransaction` is deprecated. Use `latestTransactionIOS` instead. This function will be removed in version 3.0.0.',
  );
  return latestTransactionIOS(sku);
};

/**
 * @deprecated Use `beginRefundRequestIOS` instead. This function will be removed in version 3.0.0.
 */
export const beginRefundRequest = (
  sku: string,
): Promise<RefundRequestStatus> => {
  console.warn(
    '`beginRefundRequest` is deprecated. Use `beginRefundRequestIOS` instead. This function will be removed in version 3.0.0.',
  );
  return beginRefundRequestIOS(sku);
};

/**
 * @deprecated Use `showManageSubscriptionsIOS` instead. This function will be removed in version 3.0.0.
 */
export const showManageSubscriptions = (): Promise<Purchase[]> => {
  console.warn(
    '`showManageSubscriptions` is deprecated. Use `showManageSubscriptionsIOS` instead. This function will be removed in version 3.0.0.',
  );
  return showManageSubscriptionsIOS();
};

/**
 * @deprecated Use `isTransactionVerifiedIOS` instead. This function will be removed in version 3.0.0.
 */
export const isTransactionVerified = (sku: string): Promise<boolean> => {
  console.warn(
    '`isTransactionVerified` is deprecated. Use `isTransactionVerifiedIOS` instead. This function will be removed in version 3.0.0.',
  );
  return isTransactionVerifiedIOS(sku);
};

/**
 * @deprecated Use `getTransactionJwsIOS` instead. This function will be removed in version 3.0.0.
 */
export const getTransactionJws = (sku: string): Promise<string> => {
  console.warn(
    '`getTransactionJws` is deprecated. Use `getTransactionJwsIOS` instead. This function will be removed in version 3.0.0.',
  );
  return getTransactionJwsIOS(sku);
};

/**
 * @deprecated Use `presentCodeRedemptionSheetIOS` instead. This function will be removed in version 3.0.0.
 */
export const presentCodeRedemptionSheet = (): Promise<boolean> => {
  console.warn(
    '`presentCodeRedemptionSheet` is deprecated. Use `presentCodeRedemptionSheetIOS` instead. This function will be removed in version 3.0.0.',
  );
  return presentCodeRedemptionSheetIOS();
};

/**
 * @deprecated Use `getAppTransactionIOS` instead. This function will be removed in version 3.0.0.
 */
export const getAppTransaction = (): Promise<AppTransactionIOS | null> => {
  console.warn(
    '`getAppTransaction` is deprecated. Use `getAppTransactionIOS` instead. This function will be removed in version 3.0.0.',
  );
  return getAppTransactionIOS();
};
