import {Platform} from 'react-native';
import {emitter} from '..';
import {Product} from '../ExpoIap.types';
import type {
  ProductIos,
  ProductStatusIos,
  TransactionSk2,
} from '../types/ExpoIapIos.types';
import ExpoIapModule from '../ExpoIapModule';

// Listeners
export const promotedProductListenerIos = (listener: () => void) => {
  if (Platform.OS !== 'ios') {
    throw new Error('This method is only available on iOS');
  }

  return emitter.addListener('iap-promoted-product', listener);
};

export const transactionUpdatedIos = (listener: () => void) => {
  if (Platform.OS !== 'ios') {
    throw new Error('This method is only available on iOS');
  }

  return emitter.addListener('iap-transaction-updated', listener);
};

// Functions
export function isProductIos(product: Product): product is ProductIos {
  return (product as ProductIos).displayName !== undefined;
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
