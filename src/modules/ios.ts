// External dependencies

// Internal modules
import {purchaseUpdatedListener} from '..';
import ExpoIapModule from '../ExpoIapModule';

// Types
import {
  ProductPurchase,
  PurchaseError,
  Purchase,
  SubscriptionPurchase,
} from '../ExpoIap.types';
import type {ProductStatusIos, AppTransactionIOS} from '../types/ExpoIapIos.types';

export type TransactionEvent = {
  transaction?: ProductPurchase;
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
export const transactionUpdatedIos = (
  listener: (event: TransactionEvent) => void,
) => {

  const isProductPurchase = (item: unknown): item is ProductPurchase => {
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
    purchase: Purchase | SubscriptionPurchase,
  ): TransactionEvent => {
    // Validate the purchase object before casting
    if (isProductPurchase(purchase)) {
      return {
        transaction: purchase as ProductPurchase,
      };
    }

    // Fallback: create a basic TransactionEvent structure
    return {
      transaction: purchase as ProductPurchase,
    };
  };

  return purchaseUpdatedListener((purchase) => {
    // Convert Purchase to TransactionEvent format for backward compatibility
    const event = mapPurchaseToTransactionEvent(purchase);
    listener(event);
  });
};

// Type guards
export function isProductIos<T extends {platform?: string}>(
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
  return ExpoIapModule.sync();
};

/**
 * Check if user is eligible for introductory offer
 * 
 * @param groupID The subscription group ID
 * @returns Promise resolving to true if eligible
 * @throws Error if called on non-iOS platform
 * 
 * @platform iOS
 */
export const isEligibleForIntroOfferIOS = (groupID: string): Promise<boolean> => {
  return ExpoIapModule.isEligibleForIntroOffer(groupID);
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
export const subscriptionStatusIOS = (sku: string): Promise<ProductStatusIos[]> => {
  return ExpoIapModule.subscriptionStatus(sku);
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
export const currentEntitlementIOS = (sku: string): Promise<ProductPurchase> => {
  return ExpoIapModule.currentEntitlement(sku);
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
export const latestTransactionIOS = (sku: string): Promise<ProductPurchase> => {
  return ExpoIapModule.latestTransaction(sku);
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
export const beginRefundRequestIOS = (sku: string): Promise<RefundRequestStatus> => {
  return ExpoIapModule.beginRefundRequest(sku);
};

/**
 * Shows the system UI for managing subscriptions.
 * When the user changes subscription renewal status, the system will emit events to
 * purchaseUpdatedListener and transactionUpdatedIos listeners.
 * 
 * @returns Promise resolving to null on success
 * @throws Error if called on non-iOS platform
 * 
 * @platform iOS
 */
export const showManageSubscriptionsIOS = (): Promise<null> => {
  return ExpoIapModule.showManageSubscriptions();
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
  return ExpoIapModule.getReceiptData();
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
  return ExpoIapModule.isTransactionVerified(sku);
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
  return ExpoIapModule.getTransactionJws(sku);
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
 *   latestTransaction?: ProductPurchase;
 * }>}
 */
export const validateReceiptIOS = async (
  sku: string,
): Promise<{
  isValid: boolean;
  receiptData: string;
  jwsRepresentation: string;
  latestTransaction?: ProductPurchase;
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
  return ExpoIapModule.presentCodeRedemptionSheet();
};

/**
 * Get app transaction information (iOS 16.0+).
 * AppTransaction represents the initial purchase that unlocked the app.
 * 
 * @returns Promise resolving to the app transaction information or null if not available
 * @throws Error if called on non-iOS platform or iOS version < 16.0
 * 
 * @platform iOS
 */
export const getAppTransactionIOS = (): Promise<AppTransactionIOS | null> => {
  return ExpoIapModule.getAppTransaction();
};

// ============= DEPRECATED FUNCTIONS =============
// These will be removed in version 3.0.0

/**
 * @deprecated Use `syncIOS` instead. This function will be removed in version 3.0.0.
 */
export const sync = (): Promise<null> => {
  console.warn('`sync` is deprecated. Use `syncIOS` instead. This function will be removed in version 3.0.0.');
  return syncIOS();
};

/**
 * @deprecated Use `isEligibleForIntroOfferIOS` instead. This function will be removed in version 3.0.0.
 */
export const isEligibleForIntroOffer = (groupID: string): Promise<boolean> => {
  console.warn('`isEligibleForIntroOffer` is deprecated. Use `isEligibleForIntroOfferIOS` instead. This function will be removed in version 3.0.0.');
  return isEligibleForIntroOfferIOS(groupID);
};

/**
 * @deprecated Use `subscriptionStatusIOS` instead. This function will be removed in version 3.0.0.
 */
export const subscriptionStatus = (sku: string): Promise<ProductStatusIos[]> => {
  console.warn('`subscriptionStatus` is deprecated. Use `subscriptionStatusIOS` instead. This function will be removed in version 3.0.0.');
  return subscriptionStatusIOS(sku);
};

/**
 * @deprecated Use `currentEntitlementIOS` instead. This function will be removed in version 3.0.0.
 */
export const currentEntitlement = (sku: string): Promise<ProductPurchase> => {
  console.warn('`currentEntitlement` is deprecated. Use `currentEntitlementIOS` instead. This function will be removed in version 3.0.0.');
  return currentEntitlementIOS(sku);
};

/**
 * @deprecated Use `latestTransactionIOS` instead. This function will be removed in version 3.0.0.
 */
export const latestTransaction = (sku: string): Promise<ProductPurchase> => {
  console.warn('`latestTransaction` is deprecated. Use `latestTransactionIOS` instead. This function will be removed in version 3.0.0.');
  return latestTransactionIOS(sku);
};

/**
 * @deprecated Use `beginRefundRequestIOS` instead. This function will be removed in version 3.0.0.
 */
export const beginRefundRequest = (sku: string): Promise<RefundRequestStatus> => {
  console.warn('`beginRefundRequest` is deprecated. Use `beginRefundRequestIOS` instead. This function will be removed in version 3.0.0.');
  return beginRefundRequestIOS(sku);
};

/**
 * @deprecated Use `showManageSubscriptionsIOS` instead. This function will be removed in version 3.0.0.
 */
export const showManageSubscriptions = (): Promise<null> => {
  console.warn('`showManageSubscriptions` is deprecated. Use `showManageSubscriptionsIOS` instead. This function will be removed in version 3.0.0.');
  return showManageSubscriptionsIOS();
};

/**
 * @deprecated Use `getReceiptIOS` instead. This function will be removed in version 3.0.0.
 */
export const getReceiptIos = (): Promise<string> => {
  console.warn('`getReceiptIos` is deprecated. Use `getReceiptIOS` instead. This function will be removed in version 3.0.0.');
  return getReceiptIOS();
};

/**
 * @deprecated Use `isTransactionVerifiedIOS` instead. This function will be removed in version 3.0.0.
 */
export const isTransactionVerified = (sku: string): Promise<boolean> => {
  console.warn('`isTransactionVerified` is deprecated. Use `isTransactionVerifiedIOS` instead. This function will be removed in version 3.0.0.');
  return isTransactionVerifiedIOS(sku);
};

/**
 * @deprecated Use `getTransactionJwsIOS` instead. This function will be removed in version 3.0.0.
 */
export const getTransactionJws = (sku: string): Promise<string> => {
  console.warn('`getTransactionJws` is deprecated. Use `getTransactionJwsIOS` instead. This function will be removed in version 3.0.0.');
  return getTransactionJwsIOS(sku);
};

/**
 * @deprecated Use `validateReceiptIOS` instead. This function will be removed in version 3.0.0.
 */
export const validateReceiptIos = async (
  sku: string,
): Promise<{
  isValid: boolean;
  receiptData: string;
  jwsRepresentation: string;
  latestTransaction?: ProductPurchase;
}> => {
  console.warn('`validateReceiptIos` is deprecated. Use `validateReceiptIOS` instead. This function will be removed in version 3.0.0.');
  return validateReceiptIOS(sku);
};

/**
 * @deprecated Use `presentCodeRedemptionSheetIOS` instead. This function will be removed in version 3.0.0.
 */
export const presentCodeRedemptionSheet = (): Promise<boolean> => {
  console.warn('`presentCodeRedemptionSheet` is deprecated. Use `presentCodeRedemptionSheetIOS` instead. This function will be removed in version 3.0.0.');
  return presentCodeRedemptionSheetIOS();
};

/**
 * @deprecated Use `getAppTransactionIOS` instead. This function will be removed in version 3.0.0.
 */
export const getAppTransaction = (): Promise<AppTransactionIOS | null> => {
  console.warn('`getAppTransaction` is deprecated. Use `getAppTransactionIOS` instead. This function will be removed in version 3.0.0.');
  return getAppTransactionIOS();
};
