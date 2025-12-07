---
title: Core Methods
sidebar_label: Core Methods
sidebar_position: 1
---

import GreatFrontendBanner from "@site/src/uis/GreatFrontendBanner";

# Core Methods

<GreatFrontendBanner link="https://www.greatfrontend.com/interviews/study-plans?fpr=hyo73" title="Study Plan" />

This section covers the core methods available in expo-iap for managing in-app purchases.

Note: expo-iap aligns with the OpenIAP API surface. For canonical cross-SDK API docs, see:

- [OpenIAP APIs](https://www.openiap.dev/docs/apis)

## Unified APIs

These cross‑platform methods work on both iOS and Android. For StoreKit/Play‑specific helpers, see the Platform‑specific APIs section below.

- [`initConnection()`](#initconnection) — Initialize the store connection
- [`endConnection()`](#endconnection) — End the store connection and cleanup
- [`fetchProducts()`](#fetchproducts) — Fetch product and subscription metadata
- [`requestPurchase()`](#requestpurchase) — Start a purchase for products or subscriptions
- [`finishTransaction()`](#finishtransaction) — Complete a transaction after validation
- [`getAvailablePurchases()`](#getavailablepurchases) — Restore non‑consumables and subscriptions
- [`deepLinkToSubscriptions()`](#deeplinktosubscriptions) — Open native subscription management UI
- [`getStorefront()`](#getstorefront) — Get current storefront country code
- [`hasActiveSubscriptions()`](#hasactivesubscriptions) — Check if user has active subscriptions
- [`verifyPurchaseWithProvider()`](#verifypurchasewithprovider) — Verify purchase with external provider (e.g., IAPKit)

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

## fetchProducts()

Fetches product or subscription information from the store.

```tsx
import {fetchProducts} from 'expo-iap';

// Fetch in-app products
const loadProducts = async () => {
  try {
    const products = await fetchProducts({
      skus: ['com.example.product1', 'com.example.product2'],
      type: 'in-app',
    });

    console.log('Products:', products);
    return products;
  } catch (error) {
    console.error('Failed to fetch products:', error);
  }
};

// Fetch subscriptions
const loadSubscriptions = async () => {
  try {
    const subscriptions = await fetchProducts({
      skus: ['com.example.premium_monthly', 'com.example.premium_yearly'],
      type: 'subs',
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
  - `skus` (string[]): Array of product or subscription IDs to fetch
  - `type` ('in-app' | 'subs'): Product type - 'in-app' for products, 'subs' for subscriptions

**Returns:** `Promise<Product[]>`

[**Product Type Overview**](../types.md#product-types)

## requestPurchase()

Initiates a purchase request for products or subscriptions.

> **⚠️ Platform Differences:**
>
> - **iOS**: Can only purchase one product at a time (uses `sku: string`)
> - **Android**: Can purchase multiple products at once (uses `skus: string[]`)
>
> This exists because the iOS App Store processes purchases individually, while Google Play supports batch purchases.

### Recommended usage (no Platform checks)

```tsx
import {requestPurchase} from 'expo-iap';

// Product purchase
const buyProduct = (productId: string) => {
  requestPurchase({
    request: {
      ios: {
        sku: productId,
        quantity: 1,
      },
      android: {
        skus: [productId],
      },
    },
    type: 'in-app',
  });
  // Purchase result is handled via purchaseUpdatedListener/purchaseErrorListener or useIAP hook's onPurchaseSuccess/onPurchaseError callbacks
};

// Subscription purchase
const buySubscription = (subscriptionId: string, subscription?: any) => {
  requestPurchase({
    request: {
      ios: {
        sku: subscriptionId,
        appAccountToken: 'user-123',
      },
      android: {
        skus: [subscriptionId],
        subscriptionOffers:
          subscription?.subscriptionOfferDetails?.map((offer) => ({
            sku: subscriptionId,
            offerToken: offer.offerToken,
          })) || [],
      },
    },
    type: 'subs',
  });
  // Purchase result is handled via purchaseUpdatedListener/purchaseErrorListener or useIAP hook's onPurchaseSuccess/onPurchaseError callbacks
};
```

**Note:** `requestPurchase` initiates the purchase flow but does not return the purchase result directly. Instead, handle purchase outcomes through [`purchaseUpdatedListener`](listeners.md#purchaseupdatedlistener) and [`purchaseErrorListener`](listeners.md#purchaseerrorlistener) event listeners or the `useIAP` hook's `onPurchaseSuccess` and `onPurchaseError` callbacks.

### Detailed Platform Examples

#### iOS Only

```tsx
await requestPurchase({
  request: {
    sku: productId,
    quantity: 1,
    appAccountToken: 'user-account-token',
  },
  type: 'in-app',
});
```

#### Android Only

```tsx
await requestPurchase({
  request: {
    skus: [productId],
    obfuscatedAccountIdAndroid: 'user-account-id',
    obfuscatedProfileIdAndroid: 'user-profile-id',
  },
  type: 'in-app',
});
```

**Parameters:**

- `params` (object):
  - `request` (object): Purchase request configuration
    - **iOS**: `sku` (string) - Product ID to purchase
    - **Android**: `skus` (string[]) - Array of product IDs to purchase
    - **Cross-platform**: Include both `sku` and `skus` for compatibility
    - `quantity?` (number, iOS only): Purchase quantity
    - `appAccountToken?` (string, iOS only): User identifier for receipt validation
    - `obfuscatedAccountIdAndroid?` (string, Android only): Obfuscated account ID
    - `obfuscatedProfileIdAndroid?` (string, Android only): Obfuscated profile ID
    - `isOfferPersonalized?` (boolean, Android only): Whether offer is personalized
  - `type?` ('in-app' | 'subs'): Purchase type, defaults to 'in-app'

**Returns:** `Promise<Purchase | Purchase[] | void>`

**Note:** The actual purchase result is delivered through purchase listeners or the `useIAP` hook callbacks, not as a return value.

**Note on Consumable Products:** `requestPurchase` is called the same way for both consumable and non-consumable products using `type: 'in-app'`. The consumable behavior is determined later in `finishTransaction()` by setting `isConsumable: true` for consumable products.

#### Important Subscription Properties

For subscription status checks after a purchase or when listing entitlements:

- iOS: Check `expirationDateIOS` to determine if the subscription is still active
- Android: Check `autoRenewingAndroid` to see if auto‑renewal has been canceled

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

**Returns:** `Promise<VoidResult | boolean>`

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

**Parameters:**

- `options?` (iOS only):
  - `alsoPublishToEventListenerIOS?`: boolean
  - `onlyIncludeActiveItemsIOS?`: boolean

**Returns:** `Promise<Purchase[]>`

**Platform behavior:**

- **iOS** – The optional flags are forwarded to StoreKit 2. `onlyIncludeActiveItemsIOS` defaults to `true`, so results only include active entitlements unless you explicitly pass `false`. Setting `alsoPublishToEventListenerIOS` mirrors the restored purchases through [`purchaseUpdatedListener`](listeners.md#purchaseupdatedlistener) and [`purchaseErrorListener`](listeners.md#purchaseerrorlistener) for apps that consume those callbacks directly.
- **Android** – Google Play separates `inapp` (one-time) and `subs` purchases. The library queries both internally, merges the results, and then runs the unified validation flow, so no additional options are required and both product classes are returned together.

## deepLinkToSubscriptions()

Opens the platform-specific subscription management UI.

```tsx
import {deepLinkToSubscriptions} from 'expo-iap';

const openSubscriptionSettings = () => {
  try {
    deepLinkToSubscriptions({skuAndroid: 'your_subscription_sku'});
  } catch (error) {
    console.error('Failed to open subscription settings:', error);
  }
};
```

**Returns:** `Promise<void>`

## getStorefront()

Returns the current storefront in ISO 3166-1 alpha-2 or ISO 3166-1 alpha-3 format. Works on iOS and Android; on other platforms it resolves to an empty string.

```tsx
import {getStorefront} from 'expo-iap';

const storeFront = await getStorefront();
```

**Returns:** `Promise<string>`

## getActiveSubscriptions()

Retrieves all active subscriptions with detailed status information. This method follows the OpenIAP specification for cross-platform subscription management.

```tsx
import {getActiveSubscriptions} from 'expo-iap';

const checkSubscriptions = async () => {
  try {
    // Get all active subscriptions
    const allActiveSubscriptions = await getActiveSubscriptions();

    // Or filter by specific subscription IDs
    const specificSubscriptions = await getActiveSubscriptions([
      'premium_monthly',
      'premium_yearly',
    ]);

    for (const subscription of allActiveSubscriptions) {
      console.log('Product ID:', subscription.productId);
      console.log('Is Active:', subscription.isActive);

      if (Platform.OS === 'ios') {
        console.log('Expiration Date:', subscription.expirationDateIOS);
        console.log(
          'Days until expiration:',
          subscription.daysUntilExpirationIOS,
        );
        console.log('Environment:', subscription.environmentIOS);
      } else if (Platform.OS === 'android') {
        console.log('Auto Renewing:', subscription.autoRenewingAndroid);
      }

      console.log('Will expire soon:', subscription.willExpireSoon);
    }
  } catch (error) {
    console.error('Failed to get active subscriptions:', error);
  }
};
```

**Parameters:**

- `subscriptionIds?` (string[]): Optional array of subscription product IDs to filter. If not provided, returns all active subscriptions.

**Returns:** `Promise<ActiveSubscription[]>`

**ActiveSubscription Interface:**

```typescript
interface ActiveSubscription {
  productId: string;
  isActive: boolean;
  transactionId: string;
  transactionDate: number; // Epoch milliseconds
  expirationDateIOS?: number | null; // Epoch milliseconds
  daysUntilExpirationIOS?: number | null;
  willExpireSoon?: boolean | null;
  environmentIOS?: string | null; // "Sandbox" | "Production"
  autoRenewingAndroid?: boolean | null;
  purchaseToken?: string | null; // JWS (iOS) or purchaseToken (Android)
}
```

> Optional properties may be `undefined` or `null` when the store does not provide the value (for example, `expirationDateIOS` is only present for auto-renewing products).

**Platform Behavior:**

- **iOS** – Derives status from the latest StoreKit transaction, populating `expirationDateIOS`, `daysUntilExpirationIOS`, and `willExpireSoon` when available.
- **Android** – Aggregates billing client purchases across base plans and auto-renewing states; `autoRenewingAndroid` reflects the current renewal preference.

## hasActiveSubscriptions()

Checks if the user has any active subscriptions. This is a convenience method that returns a boolean result.

```tsx
import {hasActiveSubscriptions} from 'expo-iap';

const checkIfUserHasSubscription = async () => {
  try {
    // Check if user has any active subscriptions
    const hasAny = await hasActiveSubscriptions();

    // Or check for specific subscriptions
    const hasPremium = await hasActiveSubscriptions([
      'premium_monthly',
      'premium_yearly',
    ]);

    if (hasAny) {
      console.log('User has active subscriptions');
    }

    if (hasPremium) {
      console.log('User has premium subscription');
    }
  } catch (error) {
    console.error('Failed to check subscription status:', error);
  }
};
```

**Parameters:**

- `subscriptionIds?` (string[]): Optional array of subscription product IDs to check. If not provided, checks all subscriptions.

**Returns:** `Promise<boolean>` - Returns true if user has at least one active subscription

## verifyPurchaseWithProvider()

Verifies a purchase using an external verification provider. Currently supports [IAPKit](https://iapkit.com) for server-side purchase validation.

### Basic Usage

```tsx
import {verifyPurchaseWithProvider} from 'expo-iap';

const verifyWithIAPKit = async (purchase: Purchase) => {
  try {
    const result = await verifyPurchaseWithProvider({
      provider: 'iapkit',
      iapkit: {
        apiKey: 'your-iapkit-api-key',
        apple: {
          jws: purchase.purchaseToken, // JWS from iOS purchase
        },
        google: {
          purchaseToken: purchase.purchaseToken, // Token from Android purchase
        },
      },
    });

    if (result.iapkit && result.iapkit.length > 0) {
      const verification = result.iapkit[0];
      console.log('Is Valid:', verification.isValid);
      console.log('State:', verification.state);
      console.log('Store:', verification.store);
    }
  } catch (error) {
    console.error('Verification failed:', error);
  }
};
```

### Integration with useIAP Hook

```tsx
import {useIAP, verifyPurchaseWithProvider} from 'expo-iap';
import type {VerifyPurchaseWithProviderProps} from 'expo-iap';
import {Platform} from 'react-native';

function PurchaseScreen() {
  const {requestPurchase, finishTransaction} = useIAP({
    onPurchaseSuccess: async (purchase) => {
      // Ensure purchaseToken exists before verification
      if (!purchase.purchaseToken) {
        console.error('No purchase token available for verification');
        // Still finish transaction to avoid stuck state
        await finishTransaction({purchase, isConsumable: false});
        return;
      }

      // Verify with IAPKit before granting entitlement
      const verifyRequest: VerifyPurchaseWithProviderProps = {
        provider: 'iapkit',
        iapkit: {
          apiKey: process.env.EXPO_PUBLIC_IAPKIT_API_KEY!,
          apple: {
            jws: purchase.purchaseToken,
          },
          google: {
            purchaseToken: purchase.purchaseToken,
          },
        },
      };

      try {
        const result = await verifyPurchaseWithProvider(verifyRequest);
        const verification = result.iapkit?.[0];

        if (verification?.isValid) {
          // Grant entitlement to user
          await grantPurchaseToUser(purchase);
        } else {
          console.warn('Purchase verification failed:', verification?.state);
        }
      } catch (error) {
        console.error('Verification error:', error);
      }

      // Always finish the transaction
      await finishTransaction({
        purchase,
        isConsumable: false,
      });
    },
  });

  // ... rest of component
}
```

**Parameters:**

- `options` (object):
  - `provider` ('iapkit'): The verification provider to use
  - `iapkit` (object): IAPKit-specific configuration
    - `apiKey` (string): Your IAPKit API key from [iapkit.com](https://iapkit.com)
    - `apple` (object): iOS verification data
      - `jws` (string): The JWS token from the purchase (available as `purchase.purchaseToken` on iOS)
    - `google` (object): Android verification data
      - `purchaseToken` (string): The purchase token from the purchase (available as `purchase.purchaseToken` on Android)

**Returns:** `Promise<VerifyPurchaseWithProviderResult>`

```typescript
interface VerifyPurchaseWithProviderResult {
  provider: 'iapkit';
  iapkit?: IapkitPurchaseResult[];
}

interface IapkitPurchaseResult {
  isValid: boolean;
  state: IapkitPurchaseState;
  store: 'apple' | 'google';
  // Additional fields may be present based on IAPKit response
}

type IapkitPurchaseState =
  | 'entitled' // User is entitled to the product
  | 'pending-acknowledgment' // Purchase pending acknowledgment (Android)
  | 'pending' // Purchase is pending
  | 'canceled' // Purchase was canceled
  | 'expired' // Subscription has expired
  | 'ready-to-consume' // Consumable ready to be consumed
  | 'consumed' // Consumable has been consumed
  | 'unknown' // Unknown state
  | 'inauthentic'; // Purchase could not be verified
```

**Platform Support:**

- **iOS**: Uses the JWS (JSON Web Signature) from StoreKit 2 transactions
- **Android**: Uses the purchase token from Google Play Billing

**Best Practices:**

1. **Store API key securely**: Use environment variables (e.g., `EXPO_PUBLIC_IAPKIT_API_KEY`) rather than hardcoding
2. **Handle all states**: The `state` field provides detailed status - handle each appropriately
3. **Always finish transactions**: Call `finishTransaction()` regardless of verification result to avoid stuck transactions
4. **Retry on network errors**: Network issues can cause temporary failures - implement retry logic

**See also:**

- [IAPKit](https://iapkit.com)
- [OpenIAP Verification API](https://www.openiap.dev/docs/apis#verify-purchase-with-provider)

## Purchase Interface

```tsx
interface Purchase {
  id: string; // Transaction identifier
  productId: string;
  transactionDate: number;
  purchaseToken?: string; // Unified token (iOS JWS or Android token)

  // iOS-specific properties
  originalTransactionDateIOS?: number;
  originalTransactionIdentifierIOS?: string;
  expirationDateIOS?: number;
  environmentIOS?: 'Production' | 'Sandbox';

  // Android-specific properties
  dataAndroid?: string;
  signatureAndroid?: string;
  purchaseStateAndroid?: number;
  isAcknowledgedAndroid?: boolean;
  packageNameAndroid?: string;
  developerPayloadAndroid?: string;
  obfuscatedAccountIdAndroid?: string;
  obfuscatedProfileIdAndroid?: string;
  autoRenewingAndroid?: boolean;
}
```

## Platform-specific APIs

### iOS Specific

The following iOS‑only helpers expose StoreKit and App Store specific capabilities. Most day‑to‑day flows are covered by the cross‑platform Core Methods above; use these only when you need iOS features.

**Alternative Billing (iOS 16.0+):**

- `canPresentExternalPurchaseNoticeIOS()` — Check if notice sheet is available (iOS 18.2+)
- `presentExternalPurchaseNoticeSheetIOS()` — Present external purchase notice (iOS 18.2+)
- `presentExternalPurchaseLinkIOS()` — Open external purchase link (iOS 16.0+)

**Transaction Management:**

### clearTransactionIOS()

Clears all pending transactions from the iOS payment queue. Useful if your app previously crashed or missed finishing transactions.

```ts
import {clearTransactionIOS, getPendingTransactionsIOS} from 'expo-iap';

// Inspect then clear
const pending = await getPendingTransactionsIOS();
if (pending.length) {
  await clearTransactionIOS();
}
```

Returns: `Promise<void>`

### getPromotedProductIOS()

Gets the currently promoted product, if any. Requires iOS 11+.

```ts
import {getPromotedProductIOS} from 'expo-iap';

const promoted = await getPromotedProductIOS();
if (promoted) {
  // Show your purchase UI for the promoted product
}
```

Returns: `Promise<Product | null>`

### requestPurchaseOnPromotedProductIOS()

Initiates the purchase flow for the currently promoted product. Requires iOS 11+.

```ts
import {requestPurchaseOnPromotedProductIOS} from 'expo-iap';

await requestPurchaseOnPromotedProductIOS();
// Purchase result is delivered via purchase listeners/useIAP callbacks
```

Returns: `Promise<void>`

### getPendingTransactionsIOS()

Returns all transactions that are pending completion in the StoreKit payment queue.

```ts
import {getPendingTransactionsIOS} from 'expo-iap';

const pending = await getPendingTransactionsIOS();
```

Returns: `Promise<Purchase[]>`

### isEligibleForIntroOfferIOS()

Checks if the user is eligible for an introductory offer for a subscription group. Requires iOS 12.2+.

```ts
import {isEligibleForIntroOfferIOS, fetchProducts} from 'expo-iap';

// Example: derive group ID from a fetched subscription product
const [sub] = await fetchProducts({skus: ['your_sub_sku'], type: 'subs'});
const groupId = sub?.subscriptionInfoIOS?.subscriptionGroupId ?? '';
const eligible = groupId ? await isEligibleForIntroOfferIOS(groupId) : false;
```

Returns: `Promise<boolean>`

### subscriptionStatusIOS()

Returns detailed subscription status information using StoreKit 2. Requires iOS 15+.

```ts
import {subscriptionStatusIOS} from 'expo-iap';

const statuses = await subscriptionStatusIOS('your_sub_sku');
```

Returns: `Promise<SubscriptionStatusIOS[]>`

### currentEntitlementIOS()

Returns the current entitlement for a given SKU using StoreKit 2. Requires iOS 15+.

```ts
import {currentEntitlementIOS} from 'expo-iap';

const entitlement = await currentEntitlementIOS('your_sub_or_product_sku');
```

Returns: `Promise<Purchase | null>`

### latestTransactionIOS()

Returns the most recent transaction for a given SKU using StoreKit 2. Requires iOS 15+.

```ts
import {latestTransactionIOS} from 'expo-iap';

const last = await latestTransactionIOS('your_sku');
```

Returns: `Promise<Purchase | null>`

### showManageSubscriptionsIOS()

Opens the native subscription management interface and returns purchases for subscriptions whose auto‑renewal status changed while the sheet was open. Requires iOS 15+.

```ts
import {showManageSubscriptionsIOS} from 'expo-iap';

const changed = await showManageSubscriptionsIOS();
if (changed.length > 0) {
  // Update your UI / server using returned purchases
}
```

Returns: `Promise<Purchase[]>`

### beginRefundRequestIOS()

Presents the refund request sheet for a specific SKU. Requires iOS 15+.

```ts
import {beginRefundRequestIOS} from 'expo-iap';

const status = await beginRefundRequestIOS('your_sku');
// status: 'success' | 'userCancelled'
```

Returns: `Promise<'success' | 'userCancelled'>`

### isTransactionVerifiedIOS()

Verifies the latest transaction for a given SKU using StoreKit 2. Requires iOS 15+.

```ts
import {isTransactionVerifiedIOS} from 'expo-iap';

const ok = await isTransactionVerifiedIOS('your_sku');
```

Returns: `Promise<boolean>`

### getTransactionJwsIOS()

Returns the JSON Web Signature (JWS) for a transaction derived from a given SKU. Use this for server‑side validation. Requires iOS 15+.

```ts
import {getTransactionJwsIOS} from 'expo-iap';

const jws = await getTransactionJwsIOS('your_sku');
```

Returns: `Promise<string>`

### getReceiptDataIOS()

Returns the base64‑encoded receipt data for server validation.

```ts
import {getReceiptDataIOS} from 'expo-iap';

const receipt = await getReceiptDataIOS();
```

Returns: `Promise<string>`

### syncIOS()

Forces a sync with StoreKit to ensure all transactions are up to date. Requires iOS 15+.

```ts
import {syncIOS} from 'expo-iap';

await syncIOS();
```

Returns: `Promise<void>`

### presentCodeRedemptionSheetIOS()

Presents the system sheet for redeeming App Store promo/offer codes.

```ts
import {presentCodeRedemptionSheetIOS} from 'expo-iap';

await presentCodeRedemptionSheetIOS();
```

Returns: `Promise<boolean>`

### getAppTransactionIOS()

Gets app transaction information for iOS apps (iOS 16.0+). AppTransaction represents the initial purchase that unlocked the app, useful for premium apps or apps that were previously paid.

> Runtime: iOS 16.0+; Build: Xcode 15.0+ with iOS 16.0 SDK. Older SDKs will throw.

```tsx
import {getAppTransactionIOS} from 'expo-iap';

const fetchAppTransaction = async () => {
  try {
    const appTransaction = await getAppTransactionIOS();
    if (appTransaction) {
      console.log('App Transaction ID:', appTransaction.appTransactionId);
      console.log(
        'Original Purchase Date:',
        new Date(appTransaction.originalPurchaseDate),
      );
      console.log('Device Verification:', appTransaction.deviceVerification);
    }
  } catch (error) {
    console.error('Failed to get app transaction:', error);
  }
};
```

**Returns:** `Promise<AppTransaction | null>`

```ts
interface AppTransaction {
  appTransactionId?: string; // iOS 18.4+
  originalPlatform?: string; // iOS 18.4+
  bundleId: string;
  appVersion: string;
  originalAppVersion: string;
  originalPurchaseDate: number; // ms since epoch
  deviceVerification: string;
  deviceVerificationNonce: string;
  environment: string;
  signedDate: number;
  appId?: number;
  appVersionId?: number;
  preorderDate?: number;
}
```

### canPresentExternalPurchaseNoticeIOS()

Check if the device can present an external purchase notice sheet. Requires iOS 18.2+.

```ts
import {canPresentExternalPurchaseNoticeIOS} from 'expo-iap';

const canPresent = await canPresentExternalPurchaseNoticeIOS();
if (canPresent) {
  console.log('External purchase notice sheet is available');
}
```

**Returns:** `Promise<boolean>`

**Platform:** iOS 18.2+

**Note:** This notice sheet must be presented before redirecting users to external purchase links on iOS 18.2+.

### presentExternalPurchaseNoticeSheetIOS()

Present an external purchase notice sheet to inform users about external purchases. This must be called before opening an external purchase link on iOS 18.2+.

```ts
import {presentExternalPurchaseNoticeSheetIOS} from 'expo-iap';

const result = await presentExternalPurchaseNoticeSheetIOS();

if (result.error) {
  console.error('Failed to present notice:', result.error);
} else if (result.result === 'continue') {
  // User chose to continue to external purchase
  console.log('User accepted external purchase notice');
} else if (result.result === 'dismissed') {
  // User dismissed the sheet
  console.log('User dismissed notice');
}
```

**Returns:** `Promise<ExternalPurchaseNoticeResultIOS>`

```ts
interface ExternalPurchaseNoticeResultIOS {
  error: string | null;
  result: 'continue' | 'dismissed';
}
```

**Platform:** iOS 18.2+

**See also:** [StoreKit External Purchase documentation](https://developer.apple.com/documentation/storekit/external-purchase)

### presentExternalPurchaseLinkIOS()

Open an external purchase link in Safari to redirect users to your website for purchase. Requires iOS 16.0+.

```ts
import {presentExternalPurchaseLinkIOS} from 'expo-iap';

const result = await presentExternalPurchaseLinkIOS(
  'https://your-site.com/checkout',
);

if (result.error) {
  console.error('Failed to open link:', result.error);
} else if (result.success) {
  console.log('User redirected to external purchase website');
}
```

**Parameters:**

- `url` (string): The external purchase URL to open

**Returns:** `Promise<ExternalPurchaseLinkResultIOS>`

```ts
interface ExternalPurchaseLinkResultIOS {
  error: string | null;
  success: boolean;
}
```

**Platform:** iOS 16.0+

**Requirements:**

- Must configure `iosAlternativeBilling` in your Expo config plugin
- Requires Apple approval and proper provisioning profile with external purchase entitlements
- URLs must be configured in Info.plist via the config plugin

**Example Config:**

```ts
// app.config.ts
export default {
  plugins: [
    [
      'expo-iap',
      {
        iosAlternativeBilling: {
          countries: ['kr', 'nl'], // ISO 3166-1 alpha-2
          links: {
            kr: 'https://your-site.com/kr',
            nl: 'https://your-site.com/nl',
          },
          enableExternalPurchaseLink: true,
        },
      },
    ],
  ],
};
```

**See also:**

- [StoreKit External Purchase documentation](https://developer.apple.com/documentation/storekit/external-purchase)
- [Config Plugin Guide](/docs/guides/expo-plugin)

### Android Specific

**Alternative Billing:**

- `checkAlternativeBillingAvailabilityAndroid()` — Check if alternative billing is available
- `showAlternativeBillingDialogAndroid()` — Show required information dialog
- `createAlternativeBillingTokenAndroid()` — Generate reporting token

**Purchase Management:**

### checkAlternativeBillingAvailabilityAndroid()

Check if alternative billing is available for the current user. This must be called before showing the alternative billing dialog.

```ts
import {checkAlternativeBillingAvailabilityAndroid} from 'expo-iap';

const isAvailable = await checkAlternativeBillingAvailabilityAndroid();
if (isAvailable) {
  console.log('Alternative billing is available');
} else {
  console.log('Alternative billing not available for this user');
}
```

**Returns:** `Promise<boolean>`

**Platform:** Android

**Requirements:**

- Must initialize connection with alternative billing mode
- User must be eligible for alternative billing (determined by Google)

**See also:** [Google Play Alternative Billing documentation](https://developer.android.com/google/play/billing/alternative)

### showAlternativeBillingDialogAndroid()

Show Google's required information dialog to inform users about alternative billing. This must be called after checking availability and before processing payment.

```ts
import {showAlternativeBillingDialogAndroid} from 'expo-iap';

const userAccepted = await showAlternativeBillingDialogAndroid();
if (userAccepted) {
  console.log('User accepted alternative billing');
  // Proceed with your payment flow
} else {
  console.log('User declined alternative billing');
}
```

**Returns:** `Promise<boolean>`

**Platform:** Android

**Note:** This dialog is required by Google Play's alternative billing policy. You must show this before redirecting users to your payment system.

### createAlternativeBillingTokenAndroid()

Generate a reporting token after successfully processing payment through your payment system. This token must be reported to Google Play within 24 hours.

```ts
import {createAlternativeBillingTokenAndroid} from 'expo-iap';

// After successfully processing payment in your system
const token = await createAlternativeBillingTokenAndroid('com.example.product');

if (token) {
  console.log('Token created:', token);
  // Send this token to your backend to report to Google
  await reportTokenToGooglePlay(token);
} else {
  console.error('Failed to create token');
}
```

**Parameters:**

- `sku` (string, optional): The product SKU that was purchased

**Returns:** `Promise<string | null>`

**Platform:** Android

**Important:**

- Token must be reported to Google Play backend within 24 hours
- Requires server-side integration with Google Play Developer API
- Failure to report will result in refund and possible account suspension

**Alternative Billing Configuration:**

```ts
import {initConnection, endConnection} from 'expo-iap';

// Initialize with alternative billing mode
await initConnection({
  alternativeBillingModeAndroid: 'user-choice', // or 'alternative-only'
});

// To change mode, reinitialize
await endConnection();
await initConnection({
  alternativeBillingModeAndroid: 'alternative-only',
});
```

**Billing Modes:**

- `user-choice` - Users choose between Google Play billing or your payment system
- `alternative-only` - Only your payment system is available

**Complete Flow Example:**

```ts
import {
  checkAlternativeBillingAvailabilityAndroid,
  showAlternativeBillingDialogAndroid,
  createAlternativeBillingTokenAndroid,
} from 'expo-iap';

async function purchaseWithAlternativeBilling(productId: string) {
  // Step 1: Check availability
  const isAvailable = await checkAlternativeBillingAvailabilityAndroid();
  if (!isAvailable) {
    throw new Error('Alternative billing not available');
  }

  // Step 2: Show required dialog
  const userAccepted = await showAlternativeBillingDialogAndroid();
  if (!userAccepted) {
    throw new Error('User declined alternative billing');
  }

  // Step 3: Process payment in your system
  const paymentResult = await processPaymentInYourSystem(productId);
  if (!paymentResult.success) {
    throw new Error('Payment failed');
  }

  // Step 4: Create reporting token
  const token = await createAlternativeBillingTokenAndroid(productId);
  if (!token) {
    throw new Error('Failed to create token');
  }

  // Step 5: Report to Google (must be done within 24 hours)
  await reportToGooglePlayBackend(token, productId, paymentResult);

  return {success: true, token};
}
```

**See also:**

- [Google Play Alternative Billing documentation](https://developer.android.com/google/play/billing/alternative)
- [Alternative Billing Example](/docs/guides/alternative-billing)

#### acknowledgePurchaseAndroid

Acknowledge a non‑consumable purchase or subscription on Android.

```ts
import {acknowledgePurchaseAndroid} from 'expo-iap';

await acknowledgePurchaseAndroid({token: purchase.purchaseToken!});
```

Notes:

- finishTransaction() calls this automatically when `isConsumable` is false. You typically do not need to call it directly.

#### consumePurchaseAndroid

Consume a purchase (consumables only). This marks an item as consumed so it can be purchased again.

Notes:

- finishTransaction() calls Android consumption automatically when `isConsumable` is true.
- A direct JS helper is not exposed; consumption is handled internally via the native module.

#### flushFailedPurchasesCachedAsPendingAndroid (Removed)

This legacy helper from older libraries has been removed. The modern flow is:

```ts
// On app startup (Android)
const purchases = await getAvailablePurchases();

for (const p of purchases) {
  if (/* consumable */) {
    // finishTransaction will consume on Android when isConsumable is true
    await finishTransaction({ purchase: p, isConsumable: true });
  } else {
    // finishTransaction will acknowledge on Android when isConsumable is false
    await finishTransaction({ purchase: p, isConsumable: false });
  }
}
```

This ensures pending transactions are surfaced and properly resolved without a separate “flush” API.

## Removed APIs

- `requestProducts()` — Removed in v3.0.0. Use `fetchProducts({ skus, type })` instead.
