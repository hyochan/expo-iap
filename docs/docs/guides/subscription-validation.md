---
id: subscription-validation
title: Subscription Validation
sidebar_label: Subscription Validation
description: Understand how React Native IAP surfaces StoreKit 2 subscription data, from getAvailablePurchases to the StoreKit status API.
---

import IapKitBanner from "@site/src/uis/IapKitBanner";
import IapKitLink from "@site/src/uis/IapKitLink";

<IapKitBanner />

React Native IAP exposes modern StoreKit&nbsp;2 (iOS) and Google Play Billing (Android) pipelines. This guide walks through the data that is available on the JavaScript side, how it maps to the underlying native APIs, and practical strategies to answer common lifecycle questions such as _"is the user currently inside their free trial?"_

> iOS and Android share the same high-level API surface, but individual capabilities differ. Notes in each section call out platform-specific behaviour—for example, `subscriptionStatusIOS` only exists on Apple platforms, whereas Android relies on Purchase objects and the Play Developer API.

## Summary of key surfaces

| Capability | API | iOS | Android |
| --- | --- | --- | --- |
| Fetch latest entitlement records the store still considers active | [`getAvailablePurchases`](../api/methods/core-methods.md#getavailablepurchases) | Wraps StoreKit&nbsp;2 `Transaction.currentEntitlements`; optional flags control listener mirror & active-only filtering | Queries Play Billing twice (`inapp` + `subs`) and merges validated purchases, exposing `purchaseToken` for server use |
| Filter entitlements down to subscriptions only | [`getActiveSubscriptions`](../api/methods/core-methods.md#getactivesubscriptions) | Adds `expirationDateIOS`, `daysUntilExpirationIOS`, `environmentIOS` convenience fields | Re-shapes merged purchase list and surfaces `autoRenewingAndroid`, `purchaseToken`, and `willExpireSoon` placeholders |
| Inspect fine-grained subscription phase | [`subscriptionStatusIOS`](../api/methods/core-methods.md#subscriptionstatusios) | StoreKit&nbsp;2 status API (`inTrialPeriod`, `inGracePeriod`, etc.) | _Not available_; pair `getAvailablePurchases` with Play Developer API (`purchases.subscriptions`/`purchases.products`) for phase data |
| Retrieve receipts for validation | [`getReceiptDataIOS`](../api/methods/core-methods.md#getreceiptdataios), [`validateReceipt`](../api/methods/core-methods.md#validatereceiptios) | Provides App Store receipt / JWS for backend validation | `validateReceipt` forwards to OpenIAP’s Google Play validator and expects `purchaseToken` / `packageName` |

## Working with `getAvailablePurchases`

`getAvailablePurchases` returns every purchase that the native store still considers _active_ for the signed-in user.

- **iOS** — The library bridges directly to StoreKit 2’s `Transaction.currentEntitlements`, so each item is a fully validated `PurchaseIOS`. Optional flags (`onlyIncludeActiveItemsIOS`, `alsoPublishToEventListenerIOS`) are forwarded to StoreKit and mimic the native behaviour.
- **Android** — Google Play Billing keeps one list for in-app products and another for subscriptions. The React Native IAP wrapper automatically queries both (`type: 'inapp'` and `type: 'subs'`), merges the results, and validates them before returning control to JavaScript.

Because the data flows through the same validation pipeline as the purchase listeners, every element in the array has the same shape you receive when a new transaction comes in.

```tsx
import {useEffect} from 'react';
import {useIAP} from 'expo-iap';

export function SubscriptionGate({subscriptionId}: {subscriptionId: string}) {
  const {getAvailablePurchases, availablePurchases} = useIAP();

  useEffect(() => {
    getAvailablePurchases([subscriptionId]);
  }, [getAvailablePurchases, subscriptionId]);

  const active = availablePurchases.some(
    (purchase) => purchase.productId === subscriptionId,
  );

  // ...render locked/unlocked UI...
}
```

### Data included

For each purchase you can inspect fields such as:

- `expirationDateIOS`: milliseconds since epoch when the current period expires
- `isAutoRenewing`: whether auto-renew is still enabled
- `offerIOS`: original offer metadata (`paymentMode`, `period`, etc.)
- `environmentIOS`: `Sandbox` or `Production`

### Limitations

StoreKit does **not** bake "current phase" indicators into these records—`offerIOS.paymentMode` tells you which introductory offer was used initially, but does not tell you whether the user is still inside that offer window. To answer questions like "is the user still in a free trial?" you need either the StoreKit status API or server-side purchase verification.

#### Android `basePlanId` Limitation

:::warning Critical Limitation
On Android, the `currentPlanId` and `basePlanIdAndroid` fields may return **incorrect values** for subscription groups with multiple base plans.
:::

**Root Cause:** Google Play Billing API's `Purchase` object does NOT include `basePlanId` information. When a subscription group has multiple base plans (weekly, monthly, yearly), there is no way to determine which specific plan was purchased from the client-side `Purchase` object.

You may see this warning in logs:

```
Multiple offers (3) found for premium_subscription, using first basePlanId (may be inaccurate)
```

**What Works Correctly:**
- `productId` — Subscription group ID
- `purchaseToken` — Purchase token
- `isActive` — Subscription active status
- `transactionId` — Transaction ID

**What May Be Incorrect:**
- `currentPlanId` / `basePlanIdAndroid` — May return first plan instead of purchased plan

##### Solutions

**1. Client-side Tracking (Recommended for most apps)**

Track `basePlanId` yourself during the purchase flow:

```ts
// Track basePlanId BEFORE calling requestPurchase
let purchasedBasePlanId: string | null = null;

const handlePurchase = async (basePlanId: string) => {
  const offers = product.subscriptionOfferDetailsAndroid ?? [];
  const offer = offers.find(o => o.basePlanId === basePlanId && !o.offerId);

  // Store it before purchase
  purchasedBasePlanId = basePlanId;

  await requestPurchase({
    request: {
      google: {
        skus: [subscriptionGroupId],
        subscriptionOffers: [
          { sku: subscriptionGroupId, offerToken: offer.offerToken },
        ],
      },
    },
    type: 'subs',
  });
};

// Use YOUR tracked value in onPurchaseSuccess
onPurchaseSuccess: async (purchase) => {
  // DON'T rely on purchase.currentPlanId - it may be wrong!
  const actualBasePlanId = purchasedBasePlanId;

  await saveToBackend({
    purchaseToken: purchase.purchaseToken,
    basePlanId: actualBasePlanId,  // Use YOUR tracked value
    productId: purchase.productId,
  });
}
```

**2. <IapKitLink>IAPKit</IapKitLink> Backend Validation (Recommended)**

Use [`verifyPurchaseWithProvider`](../api/methods/unified-apis.md#verifypurchasewithprovider) with <IapKitLink>IAPKit</IapKitLink> to get accurate `basePlanId` from Google Play Developer API:

```ts
import {verifyPurchaseWithProvider} from 'expo-iap';

const result = await verifyPurchaseWithProvider({
  provider: 'iapkit',
  iapkit: {
    apiKey: 'your-iapkit-api-key',
    google: { purchaseToken: purchase.purchaseToken },
  },
});

// Access basePlanId from the response
const basePlanId = result.iapkit?.google?.lineItems?.[0]?.offerDetails?.basePlanId;
console.log('Actual basePlanId:', basePlanId);
```

**3. Single Base Plan Per Subscription Group**

If your subscription group has only one base plan, the `basePlanId` will always be accurate. This is the simplest solution if your product design allows it.

:::note
This is a fundamental limitation of Google Play Billing API, not a bug in this library. The `Purchase` object from Google simply does not include `basePlanId` information.
:::

**See also:**
- [SubscriptionOfferDetailsAndroid](https://www.openiap.dev/docs/types#subscriptionofferdetailsandroid) — Each offer contains `basePlanId`, `offerId`, `offerTags`, `offerToken`, and `pricingPhases`.
- [GitHub Issue #3096](https://github.com/hyochan/react-native-iap/issues/3096) — Original discussion about this limitation.

## Using `getActiveSubscriptions`

[`getActiveSubscriptions`](../api/methods/core-methods.md#getactivesubscriptions) is a thin helper that filters `getAvailablePurchases` down to subscription products. It returns an array of `ActiveSubscription` objects with convenience fields:

- `isActive`: always `true` as long as the subscription remains in the current entitlement set
- `expirationDateIOS` & `daysUntilExpirationIOS`: surfaced directly from StoreKit
- `transactionId` / `purchaseToken`: handy for reconciling with receipts or Play Billing
- `willExpireSoon`: flag set by the helper when the subscription is within its grace window
- `autoRenewingAndroid`: reflects the Google Play auto-renew status for subscriptions
- `environmentIOS`: tells you whether the entitlement came from `Sandbox` or `Production`

The helper does **not** fetch additional metadata beyond what `getAvailablePurchases` already provides. It exists to make stateful hooks easier to consume.

> **Platform note:** On iOS the helper simply re-shapes the StoreKit 2 entitlement objects. On Android it operates on the merged `inapp` + `subs` purchase list returned by Play Billing, so the output always contains both one-time products and subscriptions unless you pass specific product IDs.

```ts
import {getActiveSubscriptions} from 'expo-iap';

const active = await getActiveSubscriptions(['your.yearly.subscription']);
if (active.length === 0) {
  // user has no valid subscription
}
```

### Deriving a lightweight phase without `subscriptionStatusIOS`

If you want a coarse subscription phase that works the same way on iOS and Android, you can compute it from the entitlement cache that backs `getActiveSubscriptions`.

```ts
import {getActiveSubscriptions} from 'expo-iap';

const MS_IN_DAY = 1000 * 60 * 60 * 24;
const GRACE_WINDOW_DAYS = 3;

type DerivedPhase = 'subscribed' | 'expiringSoon' | 'expired';

export async function getCurrentPhase(sku: string): Promise<DerivedPhase> {
  const subscriptions = await getActiveSubscriptions([sku]);
  const entry = subscriptions.find((sub) => sub.productId === sku);

  if (!entry) {
    return 'expired';
  }

  const now = Date.now();
  const expiresAt = entry.expirationDateIOS ?? null;

  if (
    typeof entry.daysUntilExpirationIOS === 'number' &&
    entry.daysUntilExpirationIOS <= 0
  ) {
    return 'expired';
  }

  if (expiresAt && expiresAt <= now) {
    return 'expired';
  }

  const graceWindowMs = GRACE_WINDOW_DAYS * MS_IN_DAY;
  if (
    (expiresAt && expiresAt - now <= graceWindowMs) ||
    (typeof entry.daysUntilExpirationIOS === 'number' &&
      entry.daysUntilExpirationIOS * MS_IN_DAY <= graceWindowMs) ||
    entry.autoRenewingAndroid === false
  ) {
    return 'expiringSoon';
  }

  return 'subscribed';
}
```

> Tweak `GRACE_WINDOW_DAYS` (or add additional checks such as `willExpireSoon`) to match how your product defines "grace period". For Android plans you can also look at `autoRenewingAndroid` and the Play Developer API for richer state.

````

## StoreKit 2 status API (`subscriptionStatusIOS`)

When you need to know the exact lifecycle phase, call [`subscriptionStatusIOS`](../api/methods/core-methods.md#subscriptionstatusios). This maps to StoreKit&nbsp;2’s `Product.SubscriptionInfo.Status` API and returns an array of status entries for the subscription group. Each `status.state` comes through as a string so you can forward unknown values to your analytics or logging when Apple adds new phases.

```ts
import {subscriptionStatusIOS} from 'expo-iap';

const statuses = await subscriptionStatusIOS('your.yearly.subscription');
const latestState = statuses[0]?.state ?? 'unknown';
````

### Phase reference

| `state` value | Meaning |
| --- | --- |
| `subscribed` | Subscription is active and billing is up to date |
| `expired` | Subscription is no longer active |
| `inGracePeriod` | Auto-renewal failed but StoreKit granted a grace period before suspending access |
| `inBillingRetryPeriod` | Auto-renewal failed and StoreKit is retrying the payment method |
| `revoked` | Apple revoked the subscription (for example, due to customer support refunds) |
| `inIntroOfferPeriod` | User is currently inside a paid introductory offer (e.g., pay upfront or pay-as-you-go) |
| `inTrialPeriod` | User is currently in the free-trial window |
| `paused` | Subscription manually paused by the user (where supported) |

### Relationship with other APIs

- Use `getActiveSubscriptions` (or the helper shown above) to keep your UI in sync with entitlement data across both platforms, then enhance it with `subscriptionStatusIOS` when you need the StoreKit-specific phase strings.
- `latestTransactionIOS` returns the full `Purchase` object tied to the most recent status entry—useful when storing transaction IDs on your backend.
- `currentEntitlementIOS` shortcuts to the single entitlement for a SKU if you do not need the full array.

## Server-side validation and trials

If you already maintain a server, Apple’s `/verifyReceipt` endpoint exposes `is_trial_period` and `is_in_intro_offer_period` flags for each transaction in the receipt. In newer builds, the hosted validation helper that backs `validateReceipt` also normalises the response into a cross-platform shape so your backend sees the same fields for both stores:

```ts
// Normalised validation payload (fields shown when available)
{
  transactionId: '1000000000000000',
  originalTransactionId: '1000000000000000',
  productId: 'com.example.premium.yearly',
  purchaseDate: 1758086400000,        // epoch ms
  expiresDate: 1760764800000,         // epoch ms or null for non-recurring products
  type: 'AutoRenewableSubscription',  // StoreKit or Play Billing product type
  environment: 'Production',
  receiptId: 'iap-rec-abcdef',        // internal receipt reference
  appleAppStoreData?: {
    transaction: { ... },             // StoreKit transactionData payload
    originalTransaction: { ... }
  },
  googlePlayData?: {
    rawGooglePlayResponse: { ... },   // Play Billing purchase JSON
    expiryTimeMillis: '1760764800000'
  }
}
```

> On iOS the helper maps StoreKit 2’s `transactionData` fields (transaction ids, environment, expires date). On Android you receive the raw Play Billing response along with derived timestamps such as `expiryTimeMillis`.

We recommend the following layering:

1. Use `subscriptionStatusIOS` for fast, on-device checks when UI needs to react immediately.
2. Periodically upload receipts (via [`getReceiptDataIOS`](../api/methods/core-methods.md#getreceiptdataios)) to your backend for authoritative validation and entitlement provisioning.
3. Recalculate client caches (`getAvailablePurchases`) after server reconciliation to ensure consistency across devices.

## Subscription renewal detection

Subscription renewals happen automatically when a user's subscription period ends and they haven't cancelled. Detecting these renewals differs significantly between platforms.

### Platform differences

| Aspect | iOS (StoreKit 2) | Android (Google Play Billing) |
| --- | --- | --- |
| **Auto-detection on launch** | ✅ Renewed subscriptions automatically appear in `Transaction.currentEntitlements` | ❌ `purchaseUpdatedListener` does NOT fire for renewals that occurred while app was closed |
| **Listener behavior** | Renewals trigger transaction updates if app is running | Listener only fires for purchases made during active session |
| **Recommended approach** | Use `getAvailablePurchases()` or `subscriptionStatusIOS` | Always call `getAvailablePurchases()` on app launch + verify with backend |

### The Android renewal detection problem

On Android, the `purchaseUpdatedListener` is designed to handle real-time purchase events during an active session. When a subscription renews while the app is closed (the typical case), this listener **will not fire** when the app reopens.

This means:
- You cannot rely solely on `purchaseUpdatedListener` for subscription status
- You **must** check subscription status proactively on app launch
- Server-side verification provides the authoritative source of truth

### Recommended: IAPKit server-side verification

<IapKitLink>IAPKit</IapKitLink> provides reliable subscription status checking through the `verifyPurchaseWithProvider` API. The response includes a `state` field that indicates the current subscription status:

| State | Description | Action |
| --- | --- | --- |
| `entitled` | User has an active, valid subscription | Grant access |
| `expired` | Subscription has expired and not renewed | Remove access |
| `canceled` | User cancelled but may still have access until period ends | Check expiration date |
| `pending` | Payment is pending (e.g., awaiting parental approval) | Show pending UI |
| `pending-acknowledgment` | Purchase needs acknowledgment (Android) | Call `finishTransaction` |
| `inauthentic` | Purchase could not be verified / fraudulent | Deny access |

### Checking subscription status on app launch

Always verify subscription status when your app launches or returns to foreground:

```tsx
import {useEffect, useCallback} from 'react';
import {AppState, AppStateStatus} from 'react-native';
import {useIAP} from 'expo-iap';

function useSubscriptionStatus(subscriptionIds: string[]) {
  const {
    getAvailablePurchases,
    verifyPurchaseWithProvider,
    availablePurchases,
  } = useIAP();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkSubscriptionStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      // Step 1: Get available purchases from the store
      await getAvailablePurchases();

      // Step 2: Find subscription purchases
      const subscriptionPurchase = availablePurchases.find((p) =>
        subscriptionIds.includes(p.productId),
      );

      if (!subscriptionPurchase?.purchaseToken) {
        setIsSubscribed(false);
        return;
      }

      // Step 3: Verify with IAPKit for authoritative status
      const result = await verifyPurchaseWithProvider({
        provider: 'iapkit',
        iapkit: {
          apple: {jws: subscriptionPurchase.purchaseToken},
          google: {purchaseToken: subscriptionPurchase.purchaseToken},
        },
      });

      // Step 4: Check the subscription state
      const verification = result.iapkit;
      const isEntitled = verification?.state === 'entitled';
      setIsSubscribed(isEntitled);
    } catch (error) {
      console.error('Failed to check subscription:', error);
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  }, [getAvailablePurchases, verifyPurchaseWithProvider, subscriptionIds]);

  // Check on mount
  useEffect(() => {
    checkSubscriptionStatus();
  }, [checkSubscriptionStatus]);

  // Re-check when app returns to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkSubscriptionStatus();
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => subscription?.remove();
  }, [checkSubscriptionStatus]);

  return {isSubscribed, isLoading, refresh: checkSubscriptionStatus};
}
```

### Usage example

```tsx
function PremiumContent() {
  const {isSubscribed, isLoading} = useSubscriptionStatus([
    'premium_monthly',
    'premium_yearly',
  ]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isSubscribed) {
    return <SubscriptionPaywall />;
  }

  return <PremiumFeatures />;
}
```

### Best practices

1. **Always check on launch**: Don't rely solely on cached subscription state
2. **Use server-side verification**: <IapKitLink>IAPKit</IapKitLink> provides authoritative subscription status
3. **Re-check on foreground**: Subscriptions may have renewed or expired while the app was backgrounded
4. **Handle edge cases**: Grace periods, billing retry, and pending payments
5. **Cache carefully**: Store verification timestamps and refresh periodically

## Putting everything together

A typical subscription screen in React Native IAP might:

1. Call `initConnection` and `fetchProducts` when mounted.
2. Use `useIAP` to observe purchase updates and update local state.
3. Fetch `getAvailablePurchases` on launch to restore entitlements.
4. Query `subscriptionStatusIOS` to display whether the user is inside a trial or grace period.
5. Sync receipts to your server to unlock cross-device access.

By combining these surfaces you can offer a reliable experience that embraces StoreKit&nbsp;2’s richer metadata while preserving backwards compatibility with existing server flows.
