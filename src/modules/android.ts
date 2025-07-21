// External dependencies
import {Linking} from 'react-native';

// Internal modules
import ExpoIapModule from '../ExpoIapModule';

// Types
import {PurchaseResult} from '../ExpoIap.types';
import {ReceiptAndroid} from '../types/ExpoIapAndroid.types';

// Type guards
export function isProductAndroid<T extends {platform?: string}>(
  item: unknown,
): item is T & {platform: 'android'} {
  return (
    item != null &&
    typeof item === 'object' &&
    'platform' in item &&
    item.platform === 'android'
  );
}

/**
 * Deep link to subscriptions screen on Android.
 * @param {string} sku The product's SKU (on Android)
 * @returns {Promise<void>}
 */
export const deepLinkToSubscriptionsAndroid = async ({
  sku,
}: {
  sku: string;
}): Promise<void> => {
  return Linking.openURL(
    `https://play.google.com/store/account/subscriptions?package=${await ExpoIapModule.getPackageName()}&sku=${sku}`,
  );
};

/**
 * Validate receipt for Android. NOTE: This method is here for debugging purposes only. Including
 * your access token in the binary you ship to users is potentially dangerous.
 * Use server side validation instead for your production builds
 * @param {string} packageName package name of your app.
 * @param {string} productId product id for your in app product.
 * @param {string} productToken token for your purchase (called 'token' in the API documentation).
 * @param {string} accessToken OAuth access token with androidpublisher scope. Required for authentication.
 * @param {boolean} isSub whether this is subscription or inapp. `true` for subscription.
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
}): Promise<ReceiptAndroid> => {
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
 * @param {string} token The product's token (on Android)
 * @returns {Promise<PurchaseResult | void>}
 */
export const acknowledgePurchaseAndroid = ({
  token,
  developerPayload,
}: {
  token: string;
  developerPayload?: string;
}): Promise<PurchaseResult | boolean | void> => {
  return ExpoIapModule.acknowledgePurchase(token, developerPayload);
};

/**
 * Open the Google Play Store to redeem offer codes (Android only).
 * Note: Google Play does not provide a direct API to redeem codes within the app.
 * This function opens the Play Store where users can manually enter their codes.
 * 
 * @returns {Promise<void>}
 */
export const openRedeemOfferCodeAndroid = async (): Promise<void> => {
  return Linking.openURL(
    `https://play.google.com/redeem?code=`
  );
};
