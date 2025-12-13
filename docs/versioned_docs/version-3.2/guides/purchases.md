---
title: Purchases
sidebar_label: Purchases
sidebar_position: 2
---

import GreatFrontendBanner from "@site/src/uis/GreatFrontendBanner";

# Purchases

<GreatFrontendBanner link="https://www.greatfrontend.com/questions?fpr=hyo73" title="Framework-specific practice questions" />

> :warning: **Purchase Flow Redesign** :warning:
>
> The `purchase` flow has been updated as a result of the findings in issue [#307](https://github.com/hyochan/react-native-iap/issues/307). The resulting flow has been redesign to not rely on `Promise` or `Callback`.
>
> Below are some of the specific reasons for the redesign:
>
> 1. There may be more than one response when requesting a payment.
> 2. Purchases are inter-session `asynchronuous` meaning requests that are made may take several hours to complete and continue to exist even after the app has been closed or crashed.
> 3. The purchase may be pending and hard to track what has been done (for [example](https://github.com/hyochan/react-native-iap/issues/307)).
> 4. The Billing Flow is an `event` pattern rather than a `callback` pattern.

For a comprehensive understanding of the purchase lifecycle, see our [Purchase Lifecycle Guide](./lifecycle).

## Purchase Flow Overview

Once you have called `fetchProducts()`, and have a valid response, you can call `requestPurchase()`. Subscribable products can be purchased just like consumable products and users can cancel subscriptions by using the iOS System Settings.

Before you request any purchase, you should set `purchaseUpdatedListener` from `expo-iap`. It is recommended that you start listening to updates as soon as your application launches. And don't forget that even at launch you may receive successful purchases that either completed while your app was closed or that failed to be finished, consumed or acknowledged due to network errors or bugs.

### Key Concepts

1. **Event-driven**: Purchases are handled through events rather than promises
2. **Asynchronous**: Purchases may complete after your app is closed or crashed
3. **Validation required**: Always validate purchases on your server
4. **State management**: Use the `useIAP` hook for automatic state management

## Basic Purchase Flow

### 1. Setup Purchase Listeners (Without Hook)

```tsx
import {
  initConnection,
  purchaseUpdatedListener,
  purchaseErrorListener,
  finishTransaction,
  type ProductPurchase,
  type PurchaseError,
} from 'expo-iap';

function App() {
  useEffect(() => {
    initConnection().then(() => {
      const purchaseUpdate = purchaseUpdatedListener(
        (purchase: ProductPurchase) => {
          // Validate on server, then finish transaction
          finishTransaction({purchase, isConsumable: true});
        },
      );

      const purchaseError = purchaseErrorListener((error: PurchaseError) => {
        console.warn('Purchase error:', error);
      });

      return () => {
        purchaseUpdate.remove();
        purchaseError.remove();
      };
    });
  }, []);
}
```

### 2. Using with Hooks (Recommended)

```tsx
import {useIAP, ErrorCode} from 'expo-iap';

function PurchaseScreen() {
  const {
    connected,
    products,
    fetchProducts,
    requestPurchase,
    finishTransaction,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      const isValid = await validateOnServer(purchase);
      if (!isValid) return;
      await finishTransaction({purchase, isConsumable: true});
    },
    onPurchaseError: (error) => {
      if (error.code !== ErrorCode.UserCancelled) {
        console.error('Purchase failed:', error);
      }
    },
  });

  useEffect(() => {
    if (connected) {
      fetchProducts({skus: ['product.id'], type: 'in-app'});
    }
  }, [connected]);

  const handlePurchase = async (productId: string) => {
    await requestPurchase({
      request: {
        apple: {sku: productId},
        google: {skus: [productId]},
      },
    });
  };
}
```

For a complete implementation, see [example/app/purchase-flow.tsx](https://github.com/hyochan/expo-iap/blob/main/example/app/purchase-flow.tsx).

### 3. Request a Purchase

**Platform Differences:**

- **iOS**: Single SKU per purchase
- **Android**: Array of SKUs (supports multiple)

```tsx
// Products
await requestPurchase({
  request: {
    apple: {sku: productId},
    google: {skus: [productId]},
  },
});

// Subscriptions (Android requires offerToken)
const subscription = subscriptions.find((s) => s.id === subscriptionId);
await requestPurchase({
  request: {
    apple: {sku: subscriptionId},
    google: {
      skus: [subscriptionId],
      subscriptionOffers:
        subscription?.subscriptionOfferDetailsAndroid?.map((offer) => ({
          sku: subscriptionId,
          offerToken: offer.offerToken,
        })) || [],
    },
  },
  type: 'subs',
});
```

## Important Notes

### Purchase Flow Best Practices

1. **Always set up listeners first**: Set up `purchaseUpdatedListener` and `purchaseErrorListener` before making any purchase requests.

2. **Handle pending purchases**: On app launch, check for pending purchases that may have completed while the app was closed.

3. **Never rely on promises**: The purchase flow is event-driven, not promise-based. Always use listeners to handle purchase results.

4. **Validate purchases server-side**: Never trust client-side validation. Always validate purchases on your secure server.

5. **Finish transactions**: Always call `finishTransaction` after successful validation to complete the purchase.

6. **Handle unfinished transactions on iOS**: iOS will replay unfinished transactions on app startup. Always call `finishTransaction` to prevent `onPurchaseSuccess` from triggering automatically on every app launch.

### Pending and Unfinished Purchases

#### iOS Unfinished Transactions

On iOS, if you don't call `finishTransaction` after a successful purchase, the transaction remains in an "unfinished" state. This causes:

- `onPurchaseSuccess` to trigger automatically on every app startup
- The same purchase to appear repeatedly until finished
- Users unable to make new purchases of consumable items

**Solution**: Always finish transactions after processing:

```tsx
const {finishTransaction} = useIAP({
  onPurchaseSuccess: async (purchase) => {
    try {
      // 1. IMPORTANT: Validate purchase on your server before finishing transaction
      // This is crucial for security and fraud prevention
      let isValid = false;

      if (Platform.OS === 'ios') {
        // Send purchase info to your server for validation with Apple
        isValid = await validatePurchaseOnServer({
          transactionId: purchase.transactionId,
          productId: purchase.productId,
        });
      } else if (Platform.OS === 'android') {
        // Send purchase info to your server for validation with Google
        const purchaseToken = purchase.purchaseTokenAndroid;
        const packageName = purchase.packageNameAndroid;

        // Your server should:
        // 1. Get Google Play service account credentials
        // 2. Use Google Play Developer API to verify the purchase
        isValid = await validateAndroidPurchaseOnServer({
          purchaseToken,
          packageName,
          productId: purchase.productId,
        });
      }

      if (!isValid) {
        console.error('Invalid purchase - validation failed');
        return;
      }

      // 2. Process the purchase (grant items, unlock features, etc.)
      await processPurchase(purchase);

      // 3. IMPORTANT: Finish the transaction
      await finishTransaction({
        purchase,
        isConsumable: false, // defaults to false
      });
    } catch (error) {
      console.error('Purchase processing failed:', error);
    }
  },
  onPurchaseError: (error) => {
    console.error('Purchase failed:', error);
  },
});
```

**Handle unfinished transactions on startup**:

```tsx
useEffect(() => {
  initConnection().then(async () => {
    const purchases = await getAvailablePurchases();
    for (const purchase of purchases) {
      if (await isAlreadyProcessed(purchase)) {
        await finishTransaction({purchase});
      }
    }
  });
}, []);
```

## Getting Product Information

### Retrieving Product Prices

Here's how to get product prices across platforms:

```tsx
// Get product price by ID with proper platform checking
const getProductPrice = (productId: string): string => {
  if (!isReady || products.length === 0) {
    return Platform.OS === 'ios' ? '$0.99' : '₩1,200'; // Default prices
  }

  const product = products.find((p) => p.id === productId);
  if (!product) return Platform.OS === 'ios' ? '$0.99' : '₩1,200';

  if (Platform.OS === 'ios') {
    return product.displayPrice || '$0.99';
  } else {
    // Android
    const androidProduct = product as ProductAndroid;
    return (
      androidProduct.oneTimePurchaseOfferDetails?.formattedPrice || '₩1,200'
    );
  }
};

// Get subscription price by ID with proper platform checking
const getSubscriptionPrice = (subscriptionId: string): string => {
  if (!isReady || subscriptions.length === 0) {
    return Platform.OS === 'ios' ? '$9.99' : '₩11,000'; // Default prices
  }

  const subscription = subscriptions.find((s) => s.id === subscriptionId);
  if (!subscription) return Platform.OS === 'ios' ? '$9.99' : '₩11,000';

  if (Platform.OS === 'ios') {
    return subscription.displayPrice || '$9.99';
  } else {
    // Android
    const androidSubscription = subscription as ProductAndroid;
    if (androidSubscription.subscriptionOfferDetails?.length > 0) {
      const firstOffer = androidSubscription.subscriptionOfferDetails[0];
      if (firstOffer.pricingPhases.pricingPhaseList.length > 0) {
        return (
          firstOffer.pricingPhases.pricingPhaseList[0].formattedPrice ||
          '₩11,000'
        );
      }
    }
    return '₩11,000'; // Default Android price
  }
};
```

## Platform Support

### Checking Platform Compatibility

```tsx
// Define supported platforms
const SUPPORTED_PLATFORMS = ['ios', 'android'];

export default function PurchaseScreen() {
  const isPlatformSupported = SUPPORTED_PLATFORMS.includes(Platform.OS);

  if (!isPlatformSupported) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <Text>Platform Not Supported</Text>
        <Text>In-app purchases are only available on iOS and Android.</Text>
      </View>
    );
  }

  // Rest of your purchase implementation
}
```

## Product Types

### Consumable Products

Consumable products can be purchased multiple times (e.g., coins, gems):

```tsx
const buyConsumable = async (productId) => {
  await requestPurchase({sku: productId});
  // After successful validation and finishing transaction,
  // the product can be purchased again
};
```

### Non-Consumable Products

Non-consumable products are purchased once and remain available (e.g., premium features):

```tsx
const buyNonConsumable = async (productId) => {
  await requestPurchase({sku: productId});
  // After purchase, check availablePurchases to restore
};
```

### Subscriptions

Subscriptions require special handling on Android due to the offer token requirement:

```tsx
const buySubscription = async (subscriptionId: string) => {
  if (Platform.OS === 'ios') {
    // iOS: Simple SKU-based purchase
    await requestPurchase({
      request: {sku: subscriptionId},
      type: 'subs',
    });
  } else {
    // Android: Requires offerToken for each subscription
    const subscription = subscriptions.find((s) => s.id === subscriptionId);

    if (!subscription?.subscriptionOfferDetails?.length) {
      throw new Error('No subscription offers available');
    }

    // Use the first available offer (or let user choose)
    const firstOffer = subscription.subscriptionOfferDetails[0];

    await requestPurchase({
      request: {
        skus: [subscriptionId],
        subscriptionOffers: [
          {
            sku: subscriptionId,
            offerToken: firstOffer.offerToken, // Required!
          },
        ],
      },
      type: 'subs',
    });
  }
};
```

**Important Android Notes:**

- Each subscription SKU must have a corresponding offerToken
- The number of SKUs must match the number of offerTokens
- offerToken comes from `subscriptionOfferDetails` in the product details
- Without offerToken, you'll get: "The number of skus must match the number of offerTokens"

## Purchase Verification

Purchase verification ensures purchases are legitimate.

:::warning Production Requirement
Always validate purchases on a secure server for production apps. Client-side verification can be tampered with and should only be used for local development and testing.
:::

### Server-Side Verification with IAPKit (Recommended)

[IAPKit](https://iapkit.com) provides a unified server-side verification API for both iOS and Android:

First, configure your IAPKit API key in the expo-iap config plugin:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-iap",
        {
          "iapkitApiKey": "your_iapkit_api_key_here"
        }
      ]
    ]
  }
}
```

Then use it in your code. The `apiKey` is automatically injected from the config plugin:

```tsx
import {verifyPurchaseWithProvider} from 'expo-iap';

// Note: apiKey is automatically injected from config plugin (iapkitApiKey)
// No need to manually pass it - expo-iap reads it from Constants.expoConfig.extra.iapkitApiKey

const verifyWithIAPKit = async (purchase: Purchase) => {
  if (!purchase.purchaseToken) {
    console.error('No purchase token available');
    return {isValid: false};
  }

  // apiKey is auto-filled from config plugin - no need to specify it
  const result = await verifyPurchaseWithProvider({
    provider: 'iapkit',
    iapkit: {
      apple: {jws: purchase.purchaseToken},
      google: {purchaseToken: purchase.purchaseToken},
    },
  });

  const verification = result.iapkit;
  return {
    isValid: verification?.isValid ?? false,
    state: verification?.state,
  };
};
```

For complete IAPKit integration, see [Purchase Flow Example](../examples/purchase-flow#iapkit-server-verification) and [API Reference](/docs/api/methods/unified-apis#verifypurchasewithprovider).

**Best Practices:**

- Always validate on your server, never trust client-side validation alone
- Store purchase data in your database for future reference
- Implement retry logic for failed validations due to network issues
- Log validation failures for fraud detection and analysis

## Advanced Purchase Handling

### Purchase Restoration

For non-consumable products and subscriptions, implement purchase restoration:

```tsx
const {getAvailablePurchases, availablePurchases} = useIAP();

const restorePurchases = async () => {
  try {
    // In hook: updates state, does not return purchases
    await getAvailablePurchases();

    for (const purchase of availablePurchases) {
      // Validate and restore each purchase
      const isValid = await validatePurchaseOnServer(purchase);
      if (isValid) {
        await grantPurchaseToUser(purchase);
      }
    }
  } catch (error) {
    console.error('Failed to restore purchases:', error);
  }
};
```

### Handling Pending Purchases

Some purchases may be in a pending state (e.g., awaiting parental approval):

```tsx
const {requestPurchase} = useIAP({
  onPurchaseSuccess: async (purchase) => {
    if (purchase.purchaseState === 'pending') {
      // Inform user that purchase is pending
      showPendingPurchaseMessage();
      return;
    }

    // Process normal purchase
    await processPurchase(purchase);
  },
});
```

### Subscription Management

#### Checking Subscription Status

Platform-specific properties are available to check if a subscription is active:

```tsx
const isSubscriptionActive = (purchase: Purchase): boolean => {
  const currentTime = Date.now();

  if (Platform.OS === 'ios') {
    // iOS: Check expiration date
    if (purchase.expirationDateIos) {
      // expirationDateIos is in milliseconds
      return purchase.expirationDateIos > currentTime;
    }

    // For Sandbox environment, consider recent purchases as active
    if (purchase.environmentIOS === 'Sandbox') {
      const dayInMs = 24 * 60 * 60 * 1000;
      return (
        purchase.transactionDate &&
        currentTime - purchase.transactionDate < dayInMs
      );
    }
  } else if (Platform.OS === 'android') {
    // Android: Check auto-renewal status
    if (purchase.autoRenewingAndroid !== undefined) {
      return purchase.autoRenewingAndroid;
    }

    // Check purchase state (0 = purchased, 1 = canceled)
    if (purchase.purchaseStateAndroid === 0) {
      return true;
    }
  }

  return false;
};
```

**Key Properties for Subscription Status:**

- **iOS**: `expirationDateIos` - Unix timestamp when subscription expires
- **Android**: `autoRenewingAndroid` - Boolean indicating if subscription will renew

#### Managing Subscriptions

Provide users with subscription management options:

```tsx
import {deepLinkToSubscriptions} from 'expo-iap';

const openSubscriptionManagement = () => {
  // This opens the platform-specific subscription management UI
  deepLinkToSubscriptions({skuAndroid: 'your_subscription_sku'});
};
```

## Error Handling

Implement comprehensive error handling for various scenarios:

```tsx
const handlePurchaseError = (error) => {
  switch (error.code) {
    case ErrorCode.UserCancelled:
      // User cancelled - no action needed
      break;

    case ErrorCode.NetworkError:
      // Show retry option
      showRetryDialog();
      break;

    case ErrorCode.ItemUnavailable:
      // Product not available
      showProductUnavailableMessage();
      break;

    case ErrorCode.AlreadyOwned:
      // User already owns this product
      showAlreadyOwnedMessage();
      break;

    default:
      // Generic error handling
      showGenericErrorMessage(error.message);
      break;
  }
};
```

## Testing Purchases

### iOS Testing

1. Create sandbox accounts in App Store Connect
2. Sign out of App Store on device
3. Sign in with sandbox account when prompted during purchase
4. Test with TestFlight builds

### Android Testing

1. Create test accounts in Google Play Console
2. Upload signed APK to internal testing track
3. Add test accounts to the testing track
4. Test with signed builds (not debug builds)

## Next Steps

For comprehensive information about purchase lifecycle management, best practices, and common pitfalls, see our detailed [Purchase Lifecycle Guide](./lifecycle).

Other helpful resources:

- [Error Handling Guide](./troubleshooting) for debugging purchase issues
- [API Reference](../api/) for detailed method documentation
- See [Available Purchases Example](../examples/available-purchases) for a concrete restore flow
