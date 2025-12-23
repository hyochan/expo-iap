---
title: iOS Specific
sidebar_label: iOS Specific
sidebar_position: 4
---

# iOS Specific APIs

The following iOS‑only helpers expose StoreKit and App Store specific capabilities. Most day‑to‑day flows are covered by the cross‑platform [Unified APIs](./unified-apis); use these only when you need iOS features.

## Alternative Billing (iOS 16.0+)

- [`canPresentExternalPurchaseNoticeIOS()`](#canpresentexternalpurchasenoticeios) — Check if notice sheet is available (iOS 18.2+)
- [`presentExternalPurchaseNoticeSheetIOS()`](#presentexternalpurchasenoticesheetios) — Present external purchase notice (iOS 18.2+)
- [`presentExternalPurchaseLinkIOS()`](#presentexternalpurchaselinkios) — Open external purchase link (iOS 16.0+)

## Transaction Management

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

### ~~requestPurchaseOnPromotedProductIOS()~~ (deprecated)

:::warning Deprecated
Use `promotedProductListenerIOS` to receive the productId, then call `requestPurchase` with that SKU instead.
:::

In StoreKit 2, promoted products can be purchased directly via the standard purchase flow:

```ts
import {promotedProductListenerIOS, requestPurchase} from 'expo-iap';

// Recommended approach
const subscription = promotedProductListenerIOS(async (productId) => {
  // Purchase directly using requestPurchase with the received SKU
  await requestPurchase({
    params: {apple: {sku: productId}},
    type: 'in-app',
  });
});
```

Returns: `Promise<boolean>`

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
