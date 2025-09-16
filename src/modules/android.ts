// External dependencies
import {Linking} from 'react-native';

// Internal modules
import ExpoIapModule from '../ExpoIapModule';

// Types
import type {ReceiptValidationResultAndroid, VoidResult} from '../types';

// Type guards
export function isProductAndroid<T extends {platform?: string}>(
  item: unknown,
): item is T & {platform: 'android'} {
  return (
    item != null &&
    typeof item === 'object' &&
    'platform' in item &&
    (item as any).platform === 'android'
  );
}

/**
 * Deep link to subscriptions screen on Android.
 * @param {Object} params - The parameters object
 * @param {string} params.sku - The product's SKU (on Android)
 * @param {string} params.packageName - The package name of your Android app (e.g., 'com.example.app')
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * await deepLinkToSubscriptionsAndroid({
 *   sku: 'subscription_id',
 *   packageName: 'com.example.app'
 * });
 * ```
 */
export const deepLinkToSubscriptionsAndroid = async ({
  sku,
  packageName,
}: {
  sku?: string;
  packageName?: string;
}): Promise<void> => {
  // Prefer native deep link implementation via OpenIAP module
  if (ExpoIapModule?.deepLinkToSubscriptionsAndroid) {
    return (ExpoIapModule as any).deepLinkToSubscriptionsAndroid({
      skuAndroid: sku,
      packageNameAndroid: packageName,
    });
  }

  // Fallback to Linking if native method unavailable
  if (!packageName) {
    throw new Error(
      'packageName is required for deepLinkToSubscriptionsAndroid',
    );
  }
  const base = `https://play.google.com/store/account/subscriptions?package=${encodeURIComponent(
    packageName,
  )}`;
  const url = sku ? `${base}&sku=${encodeURIComponent(sku)}` : base;
  return Linking.openURL(url);
};

/**
 * Validate receipt for Android. NOTE: This method is here for debugging purposes only. Including
 * your access token in the binary you ship to users is potentially dangerous.
 * Use server side validation instead for your production builds
 * @param {Object} params - The parameters object
 * @param {string} params.packageName - package name of your app.
 * @param {string} params.productId - product id for your in app product.
 * @param {string} params.productToken - token for your purchase (called 'token' in the API documentation).
 * @param {string} params.accessToken - OAuth access token with androidpublisher scope. Required for authentication.
 * @param {boolean} params.isSub - whether this is subscription or in-app. `true` for subscription.
 * @returns {Promise<ReceiptAndroid>}
 */
export const validateReceiptAndroid = async ({
  packageName,
  productId,
  productToken,
  accessToken,
  isSub,
}: {
  packageName: string;
  productId: string;
  productToken: string;
  accessToken: string;
  isSub?: boolean;
}): Promise<ReceiptValidationResultAndroid> => {
  const type = isSub ? 'subscriptions' : 'products';

  const url =
    'https://androidpublisher.googleapis.com/androidpublisher/v3/applications' +
    `/${packageName}/purchases/${type}/${productId}` +
    `/tokens/${productToken}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw Object.assign(new Error(response.statusText), {
      statusCode: response.status,
    });
  }

  return response.json();
};

/**
 * Acknowledge a product (on Android.) No-op on iOS.
 * @param {Object} params - The parameters object
 * @param {string} params.token - The product's token (on Android)
 * @returns {Promise<VoidResult | void>}
 */
export const acknowledgePurchaseAndroid = async ({
  token,
}: {
  token: string;
}): Promise<VoidResult | boolean | void> => {
  const result = await ExpoIapModule.acknowledgePurchaseAndroid(token);

  if (typeof result === 'boolean' || typeof result === 'undefined') {
    return result;
  }

  if (result && typeof result === 'object') {
    const record = result as Record<string, unknown>;
    if (typeof record.success === 'boolean') {
      return {success: record.success};
    }
    if (typeof record.responseCode === 'number') {
      return {success: record.responseCode === 0};
    }
  }

  return {success: true};
};

/**
 * Open the Google Play Store to redeem offer codes (Android only).
 * Note: Google Play does not provide a direct API to redeem codes within the app.
 * This function opens the Play Store where users can manually enter their codes.
 *
 * @returns {Promise<void>}
 */
export const openRedeemOfferCodeAndroid = async (): Promise<void> => {
  return Linking.openURL(`https://play.google.com/redeem?code=`);
};
