import {Platform} from 'react-native';
import {emitter, IapEvent} from '..';
import {Product, PurchaseError, SubscriptionProduct} from '../ExpoIap.types';
import type {
  ProductIos,
  ProductStatusIos,
  SubscriptionProductIos,
  TransactionSk2,
} from '../types/ExpoIapIos.types';
import ExpoIapModule from '../ExpoIapModule';

type TransactionEvent = {
  transaction?: TransactionSk2;
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

// Functions
export function isProductIos(product: Product): product is ProductIos {
  return (product as ProductIos)?.displayName !== undefined;
}

export function isSubscriptionProductIos(
  product: SubscriptionProduct,
): product is SubscriptionProductIos {
  return (product as SubscriptionProductIos)?.displayName !== undefined;
}

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
export const currentEntitlement = (sku: string): Promise<TransactionSk2> =>
  ExpoIapModule.currentEntitlement(sku);

/**
 *
 */
export const latestTransaction = (sku: string): Promise<TransactionSk2> =>
  ExpoIapModule.latestTransaction(sku);

/**
 *
 */
type RefundRequestStatus = 'success' | 'userCancelled';
export const beginRefundRequest = (sku: string): Promise<RefundRequestStatus> =>
  ExpoIapModule.beginRefundRequest(sku);

/**
 *
 */
export const showManageSubscriptions = (): Promise<null> =>
  ExpoIapModule.showManageSubscriptions();
