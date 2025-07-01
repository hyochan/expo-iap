---
title: Core Methods
sidebar_label: Core Methods
sidebar_position: 1
---

import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# Core Methods

<AdFitTopFixed />

This section covers the core methods available in expo-iap for managing in-app purchases.

## initConnection()

Initializes the connection to the store. This method must be called before any other store operations.

```tsx
import {initConnection} from 'expo-iap';

const initialize = async () => {
  try {
    await initConnection();
    console.log('Store connection initialized');
  } catch (error) {
    console.error('Failed to initialize connection:', error);
  }
};
```

**Returns:** `Promise<boolean>`

**Note:** When using the `useIAP` hook, connection is automatically managed.

## endConnection()

Ends the connection to the store and cleans up resources.

```tsx
import {endConnection} from 'expo-iap';

const cleanup = async () => {
  try {
    await endConnection();
    console.log('Store connection ended');
  } catch (error) {
    console.error('Failed to end connection:', error);
  }
};
```

**Returns:** `Promise<void>`

**Note:** When using the `useIAP` hook, connection cleanup is automatic.

## getProducts()

Fetches product information from the store.

```tsx
import {getProducts} from 'expo-iap';

const fetchProducts = async () => {
  try {
    const products = await getProducts({
      skus: ['com.example.product1', 'com.example.product2'],
    });

    console.log('Products:', products);
    return products;
  } catch (error) {
    console.error('Failed to fetch products:', error);
  }
};
```

**Parameters:**

- `params` (object):
  - `skus` (string[]): Array of product IDs to fetch

**Returns:** `Promise<Product[]>`

**Product Interface:**

```tsx
interface Product {
  productId: string;
  price: string;
  currency: string;
  localizedPrice: string;
  title: string;
  description: string;
  type: 'inapp' | 'subs';
  // Platform-specific fields
  introductoryPrice?: string;
  subscriptionPeriod?: string;
  introductoryPricePeriod?: string;
  freeTrialPeriod?: string;
}
```

## getSubscriptions()

Fetches subscription product information from the store.

```tsx
import {getSubscriptions} from 'expo-iap';

const fetchSubscriptions = async () => {
  try {
    const subscriptions = await getSubscriptions({
      skus: ['com.example.premium_monthly', 'com.example.premium_yearly'],
    });

    console.log('Subscriptions:', subscriptions);
    return subscriptions;
  } catch (error) {
    console.error('Failed to fetch subscriptions:', error);
  }
};
```

**Parameters:**

- `params` (object):
  - `skus` (string[]): Array of subscription IDs to fetch

**Returns:** `Promise<Subscription[]>`

## requestPurchase()

Initiates a purchase request for a product.

```tsx
import {requestPurchase} from 'expo-iap';

const buyProduct = async (productId: string) => {
  try {
    await requestPurchase({
      sku: productId,
    });
    // Purchase result will be delivered via purchase listeners
  } catch (error) {
    console.error('Purchase request failed:', error);
  }
};
```

**Parameters:**

- `params` (object):
  - `sku` (string): Product ID to purchase
  - `subscriptionOffers?` (array): For Android subscriptions
  - `quantity?` (number): Purchase quantity (iOS only)
  - `applicationUsername?` (string): User identifier for receipt validation

**Returns:** `Promise<void>`

**Note:** The actual purchase result is delivered through purchase listeners, not as a return value.

## requestSubscription()

Initiates a subscription purchase request.

```tsx
import {requestSubscription} from 'expo-iap';

const buySubscription = async (subscriptionId: string) => {
  try {
    await requestSubscription({
      sku: subscriptionId,
      subscriptionOffers: [
        {
          sku: subscriptionId,
          offerToken: 'offer_token_from_product',
        },
      ],
    });
  } catch (error) {
    console.error('Subscription request failed:', error);
  }
};
```

**Parameters:**

- `params` (object):
  - `sku` (string): Subscription ID to purchase
  - `subscriptionOffers?` (array): Android subscription offers
  - `applicationUsername?` (string): User identifier

**Returns:** `Promise<void>`

## finishTransaction()

Completes a purchase transaction. Must be called after successful receipt validation.

```tsx
import {finishTransaction} from 'expo-iap';

const completePurchase = async (purchase) => {
  try {
    // Validate receipt on your server first
    const isValid = await validateReceiptOnServer(purchase);

    if (isValid) {
      // Grant purchase to user
      await grantPurchaseToUser(purchase);

      // Finish the transaction
      await finishTransaction({
        purchase,
        isConsumable: true, // Set to true for consumable products
      });

      console.log('Transaction completed');
    }
  } catch (error) {
    console.error('Failed to finish transaction:', error);
  }
};
```

**Parameters:**

- `params` (object):
  - `purchase` (Purchase): The purchase object to finish
  - `isConsumable?` (boolean): Whether the product is consumable (Android)

**Returns:** `Promise<void>`

## getAvailablePurchases()

Retrieves available purchases for restoration (non-consumable products and subscriptions).

```tsx
import {getAvailablePurchases} from 'expo-iap';

const restorePurchases = async () => {
  try {
    const purchases = await getAvailablePurchases();

    for (const purchase of purchases) {
      // Validate and restore each purchase
      const isValid = await validateReceiptOnServer(purchase);
      if (isValid) {
        await grantPurchaseToUser(purchase);
      }
    }

    console.log('Purchases restored');
  } catch (error) {
    console.error('Failed to restore purchases:', error);
  }
};
```

**Returns:** `Promise<Purchase[]>`

## getPurchaseHistory()

Retrieves purchase history for the user.

```tsx
import {getPurchaseHistory} from 'expo-iap';

const fetchPurchaseHistory = async () => {
  try {
    const history = await getPurchaseHistory();
    console.log('Purchase history:', history);
    return history;
  } catch (error) {
    console.error('Failed to fetch purchase history:', error);
  }
};
```

**Returns:** `Promise<Purchase[]>`

## deepLinkToSubscriptions()

Opens the platform-specific subscription management UI.

```tsx
import {deepLinkToSubscriptions} from 'expo-iap';

const openSubscriptionSettings = () => {
  try {
    deepLinkToSubscriptions();
  } catch (error) {
    console.error('Failed to open subscription settings:', error);
  }
};
```

**Returns:** `Promise<void>`

## Purchase Interface

```tsx
interface Purchase {
  productId: string;
  transactionId: string;
  transactionDate: number;
  transactionReceipt: string;
  purchaseToken?: string;
  dataAndroid?: string;
  signatureAndroid?: string;
  purchaseStateAndroid?: number;
  isAcknowledgedAndroid?: boolean;
  packageNameAndroid?: string;
  developerPayloadAndroid?: string;
  obfuscatedAccountIdAndroid?: string;
  obfuscatedProfileIdAndroid?: string;
}
```

## Error Handling

All methods can throw errors that should be handled appropriately:

```tsx
import {IAPError} from 'expo-iap';

try {
  await requestPurchase({sku: 'product_id'});
} catch (error) {
  if (error instanceof IAPError) {
    switch (error.code) {
      case 'E_USER_CANCELLED':
        console.log('User cancelled purchase');
        break;
      case 'E_NETWORK_ERROR':
        console.log('Network error, please try again');
        break;
      default:
        console.error('Purchase failed:', error.message);
    }
  }
}
```

For a complete list of error codes, see the [Error Codes](../error-codes) documentation.
