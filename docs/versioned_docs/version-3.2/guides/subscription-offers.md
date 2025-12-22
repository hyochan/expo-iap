---
title: Subscription Offers
sidebar_label: Subscription Offers
sidebar_position: 3
---

import IapKitBanner from "@site/src/uis/IapKitBanner";

# Subscription Offers

<IapKitBanner />

This guide explains how to handle subscription offers (pricing plans) when purchasing subscriptions on iOS and Android platforms.

For a complete implementation example, see the [Subscription Flow Example](../examples/subscription-flow.md).

## Overview

Subscription offers represent different pricing plans for the same subscription product:

- **Base Plan**: The standard pricing for a subscription
- **Introductory Offers**: Special pricing for new subscribers (free trial, discounted period)
- **Promotional Offers**: Limited-time discounts configured in the app stores

## Platform Differences

At a glance:

- Android: subscription offers are required when purchasing subscriptions. You must pass `subscriptionOffers` with one or more offer tokens from `fetchProducts()`.
- iOS: base plan is used by default. Promotional discounts are optional via `withOffer`.

Tip: Always fetch products first; offers only exist after `fetchProducts({ type: 'subs' })`.

### Android Subscription Offers

Android requires explicit specification of subscription offers when purchasing. Each offer is identified by an `offerToken` obtained from `fetchProducts()`.

#### Required for Android Subscriptions

Unlike iOS, Android subscriptions **must** include `subscriptionOffers` in the purchase request. Without it, the purchase will fail with:

```text
The number of skus (1) must match: the number of offerTokens (0)
```

#### Getting Offer Tokens

```tsx
import {useIAP} from 'expo-iap';

const SubscriptionComponent = () => {
  const {connected, subscriptions, fetchProducts, requestPurchase} = useIAP();

  // 1) Fetch subscription products
  useEffect(() => {
    if (connected) {
      fetchProducts({skus: ['premium_monthly'], type: 'subs'});
    }
  }, [connected]);

  // 2) Access offer details from fetched subscriptions
  const subscription = subscriptions.find((s) => s.id === 'premium_monthly');

  if (subscription?.subscriptionOfferDetailsAndroid) {
    console.log(
      'Available offers:',
      subscription.subscriptionOfferDetailsAndroid,
    );
    // Each offer contains: basePlanId, offerId?, offerTags, offerToken, pricingPhases
  }
};
```

#### Purchase with Offers

```tsx
const purchaseSubscription = async (subscriptionId: string) => {
  const subscription = subscriptions.find((s) => s.id === subscriptionId);
  if (!subscription) return;

  // Build subscriptionOffers from fetched data
  const subscriptionOffers = (
    subscription.subscriptionOfferDetailsAndroid ?? []
  )
    .map((offer) =>
      offer?.offerToken
        ? {
            sku: subscriptionId,
            offerToken: offer.offerToken,
          }
        : null,
    )
    .filter((offer): offer is {sku: string; offerToken: string} =>
      Boolean(offer?.offerToken),
    );

  // Only proceed if offers are available
  if (subscriptionOffers.length === 0) {
    console.error('No subscription offers available');
    return;
  }

  await requestPurchase({
    request: {
      apple: {sku: subscriptionId},
      google: {
        skus: [subscriptionId],
        subscriptionOffers:
          subscriptionOffers.length > 0 ? subscriptionOffers : undefined,
      },
    },
    type: 'subs',
  });
};
```

#### Understanding Offer Details

Each `subscriptionOfferDetailsAndroid` item contains:

```tsx
interface ProductSubscriptionAndroidOfferDetails {
  basePlanId: string; // Base plan identifier
  offerId?: string | null; // Offer identifier (null for base plan)
  offerTags: string[]; // Tags associated with the offer
  offerToken: string; // Token required for purchase
  pricingPhases: PricingPhasesAndroid; // Pricing information
}
```

### iOS Subscription Offers

iOS handles subscription offers differently - the base plan is used by default, and promotional offers are optional.

#### Base Plan (Default)

For standard subscription purchases, no special offer specification is needed:

```tsx
await requestPurchase({
  request: {
    apple: {sku: 'premium_monthly'},
    google: {
      skus: [
        'premium_monthly',
      ] /* include subscriptionOffers only if available */,
    },
  },
  type: 'subs',
});
```

#### Introductory Offers

iOS automatically applies introductory prices (free trials, intro pricing) configured in App Store Connect. No additional code is needed - users will see the introductory offer when eligible.

To check if a subscription has an introductory offer:

```tsx
const subscription = subscriptions.find((s) => s.id === 'premium_monthly');

if (subscription?.subscriptionInfoIOS?.introductoryOffer) {
  const offer = subscription.subscriptionInfoIOS.introductoryOffer;

  switch (offer.paymentMode) {
    case 'free-trial':
      console.log(
        `${offer.periodCount} ${offer.period.unit.toLowerCase()}(s) free trial`,
      );
      break;
    case 'pay-as-you-go':
      console.log(
        `${offer.displayPrice} for ${
          offer.periodCount
        } ${offer.period.unit.toLowerCase()}(s)`,
      );
      break;
    case 'pay-up-front':
      console.log(
        `${offer.displayPrice} for first ${
          offer.periodCount
        } ${offer.period.unit.toLowerCase()}(s)`,
      );
      break;
  }
}
```

#### Promotional Offers (Optional)

iOS supports promotional offers through the `withOffer` parameter. These are server-to-server offers that require signature generation from your backend.

##### Getting Available Promotional Offers

```tsx
const subscription = subscriptions.find((s) => s.id === 'premium_monthly');

if (subscription?.discountsIOS) {
  console.log('Available promotional offers:');
  subscription.discountsIOS.forEach((discount) => {
    console.log('- Identifier:', discount.identifier);
    console.log('  Price:', discount.localizedPrice);
    console.log('  Payment mode:', discount.paymentMode);
    console.log('  Subscription period:', discount.subscriptionPeriod);
    console.log('  Number of periods:', discount.numberOfPeriods);
  });
}
```

##### Applying Promotional Offers

To apply a promotional offer, you need to generate a signature on your backend server. See [Apple's documentation](https://developer.apple.com/documentation/storekit/in-app_purchase/original_api_for_in-app_purchase/subscriptions_and_offers/generating_a_signature_for_promotional_offers) for signature generation.

```tsx
interface DiscountOfferInputIOS {
  identifier: string; // Offer identifier from discountsIOS
  keyIdentifier: string; // Your App Store Connect key ID
  nonce: string; // UUID generated on device
  signature: string; // Generated by your backend
  timestamp: number; // Unix timestamp in milliseconds
}

const purchaseWithPromotionalOffer = async (
  subscriptionId: string,
  offerId: string,
) => {
  // 1. Generate signature on your backend
  const nonce = generateUUID(); // Use a UUID library
  const timestamp = Date.now();

  const signature = await fetch('https://your-backend.com/generate-signature', {
    method: 'POST',
    body: JSON.stringify({
      productId: subscriptionId,
      offerId: offerId,
      applicationUsername: 'user-123', // Optional
      nonce: nonce,
      timestamp: timestamp,
    }),
  }).then((res) => res.json());

  // 2. Purchase with the promotional offer
  await requestPurchase({
    request: {
      apple: {
        sku: subscriptionId,
        withOffer: {
          identifier: offerId,
          keyIdentifier: signature.keyIdentifier,
          nonce: nonce,
          signature: signature.signature,
          timestamp: timestamp,
        },
      },
      google: {skus: [subscriptionId], subscriptionOffers: [...]},
    },
    type: 'subs',
  });
};
```

## Common Patterns

### Selecting Specific Offers

```tsx
const selectOffer = (
  subscription: ProductSubscription,
  offerType: 'base' | 'introductory',
) => {
  if (Platform.OS === 'ios') {
    // iOS: Check for introductory offer
    if (offerType === 'introductory') {
      return subscription.subscriptionInfoIOS?.introductoryOffer ?? null;
    }
    // Base plan is default, no selection needed
    return null;
  }

  // Android: Select offer based on type
  const offers = subscription.subscriptionOfferDetailsAndroid ?? [];

  if (offerType === 'base') {
    // Find base plan (no offerId)
    return offers.find((offer) => !offer.offerId);
  } else {
    // Find introductory offer
    return offers.find((offer) => offer.offerId?.includes('introductory'));
  }
};

const purchaseWithSelectedOffer = async (
  subscriptionId: string,
  offerType: 'base' | 'introductory' = 'base',
) => {
  const subscription = subscriptions.find((s) => s.id === subscriptionId);
  if (!subscription) return;

  const selectedOffer = selectOffer(subscription, offerType);

  if (Platform.OS === 'android') {
    const subscriptionOffers = selectedOffer
      ? [
          {
            sku: subscriptionId,
            offerToken: selectedOffer.offerToken,
          },
        ]
      : [];

    if (subscriptionOffers.length === 0) {
      console.error('No suitable offer found');
      return;
    }

    await requestPurchase({
      request: {
        apple: {sku: subscriptionId},
        google: {
          skus: [subscriptionId],
          subscriptionOffers:
            subscriptionOffers.length > 0 ? subscriptionOffers : undefined,
        },
      },
      type: 'subs',
    });
  } else {
    // iOS: Introductory offers are automatically applied
    // selectedOffer contains intro price info for display purposes
    if (offerType === 'introductory' && selectedOffer) {
      console.log('Offer:', selectedOffer.displayPrice);
      console.log('Payment mode:', selectedOffer.paymentMode);
    }

    await requestPurchase({
      request: {
        apple: {sku: subscriptionId},
        google: {
          skus: [
            subscriptionId,
          ] /* include subscriptionOffers only if available */,
        },
      },
      type: 'subs',
    });
  }
};
```

## Error Handling

### Android Errors

```tsx
import {useIAP, ErrorCode} from 'expo-iap';

const {requestPurchase} = useIAP({
  onPurchaseError: (error) => {
    if (error.code === ErrorCode.PurchaseError) {
      console.error('Purchase failed - check subscription offers');
      // Ensure subscriptionOffers is included and valid
    }
  },
});
```

### iOS Errors

```tsx
import {useIAP, ErrorCode} from 'expo-iap';

const {requestPurchase} = useIAP({
  onPurchaseError: (error) => {
    if (error.code === ErrorCode.Unknown) {
      console.error('Invalid promotional offer for iOS');
      // Check offerIdentifier, signature, etc.
    }
  },
});
```

## Best Practices

1. **Always fetch products first**: Subscription offers are only available after `fetchProducts()`.

2. **Handle platform differences**: Android requires offers, iOS makes them optional.

3. **Validate offers**: Check that offers exist before attempting purchase.

4. **User selection**: Allow users to choose between different pricing plans when multiple offers are available.

5. **Error recovery**: Provide fallback to base plan if selected offer fails.

## See Also

- [useIAP Hook](../api/use-iap) - Main API documentation
- [Subscription Flow Example](../examples/subscription-flow) - Complete implementation
- [Error Codes](../api/error-codes) - Purchase error handling
