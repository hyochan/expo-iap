import {Linking} from 'react-native';
import {Product, PurchaseResult, SubscriptionProduct} from '../ExpoIap.types';
import {
  ProductAndroid,
  ReceiptAndroid,
  SubscriptionProductAndroid,
} from '../types/ExpoIapAndroid.types';
import ExpoIapModule from '../ExpoIapModule';

export function isProductAndroid(product: Product): product is ProductAndroid {
  return (product as ProductAndroid)?.title !== undefined;
}

export function isSubscriptionProductAndroid(
  product: SubscriptionProduct,
): product is SubscriptionProductAndroid {
  return (product as SubscriptionProductAndroid)?.title !== undefined;
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
 * @param {string} productToken token for your purchase.
 * @param {string} accessToken accessToken from googleApis.
 * @param {boolean} isSub whether this is subscription or inapp. `true` for subscription.
 * @returns {Promise<object>}
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
    `/tokens/${productToken}?access_token=${accessToken}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
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
