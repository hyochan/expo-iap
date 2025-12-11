---
title: Android Specific
sidebar_label: Android Specific
sidebar_position: 5
---

# Android Specific APIs

The following Android‑only helpers expose Google Play Billing specific capabilities. Most day‑to‑day flows are covered by the cross‑platform [Unified APIs](./unified-apis); use these only when you need Android-specific features.

## Alternative Billing

- [`checkAlternativeBillingAvailabilityAndroid()`](#checkalternativebillingavailabilityandroid) — Check if alternative billing is available
- [`showAlternativeBillingDialogAndroid()`](#showalternativebillingdialogandroid) — Show required information dialog
- [`createAlternativeBillingTokenAndroid()`](#createalternativebillingtokenandroid) — Generate reporting token

## Purchase Management

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

### Alternative Billing Configuration

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

### Complete Flow Example

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

### acknowledgePurchaseAndroid()

Acknowledge a non‑consumable purchase or subscription on Android.

```ts
import {acknowledgePurchaseAndroid} from 'expo-iap';

await acknowledgePurchaseAndroid({token: purchase.purchaseToken!});
```

Notes:

- finishTransaction() calls this automatically when `isConsumable` is false. You typically do not need to call it directly.

### consumePurchaseAndroid()

Consume a purchase (consumables only). This marks an item as consumed so it can be purchased again.

Notes:

- finishTransaction() calls Android consumption automatically when `isConsumable` is true.
- A direct JS helper is not exposed; consumption is handled internally via the native module.

### flushFailedPurchasesCachedAsPendingAndroid (Removed)

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

This ensures pending transactions are surfaced and properly resolved without a separate "flush" API.
