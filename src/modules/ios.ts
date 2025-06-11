import {Platform} from 'react-native';
import {purchaseUpdatedListener} from '..';
import {
  ProductPurchase,
  PurchaseError,
  Purchase,
  SubscriptionPurchase,
} from '../ExpoIap.types';
import type {ProductStatusIos} from '../types/ExpoIapIos.types';
import ExpoIapModule from '../ExpoIapModule';

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
  if (Platform.OS !== 'ios') {
    throw new Error('This method is only available on iOS');
  }

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
 */
export const sync = (): Promise<null> => ExpoIapModule.sync();

/**
 *
 */
export const isEligibleForIntroOffer = (groupID: string): Promise<boolean> =>
  ExpoIapModule.isEligibleForIntroOffer(groupID);

/**
 *
 */

export const subscriptionStatus = (sku: string): Promise<ProductStatusIos[]> =>
  ExpoIapModule.subscriptionStatus(sku);

/**
 *
 */
export const currentEntitlement = (sku: string): Promise<ProductPurchase> =>
  ExpoIapModule.currentEntitlement(sku);

/**
 *
 */
export const latestTransaction = (sku: string): Promise<ProductPurchase> =>
  ExpoIapModule.latestTransaction(sku);

/**
 *
 */
type RefundRequestStatus = 'success' | 'userCancelled';
export const beginRefundRequest = (sku: string): Promise<RefundRequestStatus> =>
  ExpoIapModule.beginRefundRequest(sku);

/**
 * Shows the system UI for managing subscriptions.
 * When the user changes subscription renewal status, the system will emit events to
 * purchaseUpdatedListener and transactionUpdatedIos listeners.
 * @returns {Promise<null>}
 */
export const showManageSubscriptions = (): Promise<null> =>
  ExpoIapModule.showManageSubscriptions();

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
export const getReceiptIos = (): Promise<string> => {
  if (Platform.OS !== 'ios') {
    throw new Error('This method is only available on iOS');
  }
  return ExpoIapModule.getReceiptData();
};

/**
 * Check if a transaction is verified through StoreKit 2.
 * StoreKit 2 performs local verification of transaction JWS signatures.
 *
 * @param {string} sku The product's SKU (on iOS)
 * @returns {Promise<boolean>} True if the transaction is verified
 */
export const isTransactionVerified = (sku: string): Promise<boolean> => {
  if (Platform.OS !== 'ios') {
    throw new Error('This method is only available on iOS');
  }
  return ExpoIapModule.isTransactionVerified(sku);
};

/**
 * Get the JWS representation of a purchase for server-side verification.
 * The JWS (JSON Web Signature) can be verified on your server using Apple's public keys.
 *
 * @param {string} sku The product's SKU (on iOS)
 * @returns {Promise<string>} JWS representation of the transaction
 */
export const getTransactionJws = (sku: string): Promise<string> => {
  if (Platform.OS !== 'ios') {
    throw new Error('This method is only available on iOS');
  }
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
export const validateReceiptIos = async (
  sku: string,
): Promise<{
  isValid: boolean;
  receiptData: string;
  jwsRepresentation: string;
  latestTransaction?: ProductPurchase;
}> => {
  if (Platform.OS !== 'ios') {
    throw new Error('This method is only available on iOS');
  }

  const result = await ExpoIapModule.validateReceiptIos(sku);
  return result;
};
