import {Platform} from 'react-native';
import {emitter, IapEvent} from '..';
import {ProductPurchase, PurchaseError} from '../ExpoIap.types';
import type {ProductStatusIos} from '../types/ExpoIapIos.types';
import ExpoIapModule from '../ExpoIapModule';

export type TransactionEvent = {
  transaction?: ProductPurchase;
  error?: PurchaseError;
};

// Listeners
export const transactionUpdatedIos = (
  listener: (event: TransactionEvent) => void,
) => {
  if (Platform.OS !== 'ios') {
    throw new Error('This method is only available on iOS');
  }

  return emitter.addListener(IapEvent.TransactionIapUpdated, listener);
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
