---
title: Purchases
sidebar_label: Purchases
sidebar_position: 2
---

import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# Purchases

<AdFitTopFixed />

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

Once you have called `getProducts()`, and have a valid response, you can call `requestPurchase()`. Subscribable products can be purchased just like consumable products and users can cancel subscriptions by using the iOS System Settings.

Before you request any purchase, you should set `purchaseUpdatedListener` from `expo-iap`. It is recommended that you start listening to updates as soon as your application launches. And don't forget that even at launch you may receive successful purchases that either completed while your app was closed or that failed to be finished, consumed or acknowledged due to network errors or bugs.

### Key Concepts

1. **Event-driven**: Purchases are handled through events rather than promises
2. **Asynchronous**: Purchases may complete after your app is closed or crashed
3. **Validation required**: Always validate receipts on your server
4. **State management**: Use the `useIAP` hook for automatic state management

## Basic Purchase Flow

### 1. Setup Purchase Listeners

```tsx
import {
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  type ProductPurchase,
  type PurchaseError,
  finishTransaction,
} from 'expo-iap';

class App extends Component {
  purchaseUpdateSubscription = null;
  purchaseErrorSubscription = null;

  componentDidMount() {
    initConnection().then(() => {
      this.purchaseUpdateSubscription = purchaseUpdatedListener(
            (purchase: ProductPurchase) => {
              console.log('purchaseUpdatedListener', purchase);
              this.handlePurchaseUpdate(purchase);
            },
          );

          this.purchaseErrorSubscription = purchaseErrorListener(
            (error: PurchaseError) => {
              console.log('purchaseErrorListener', error);
              this.handlePurchaseError(error);
            },
          );
        });
    });
  }

  componentWillUnmount() {
    if (this.purchaseUpdateSubscription) {
      this.purchaseUpdateSubscription.remove();
      this.purchaseUpdateSubscription = null;
    }
    if (this.purchaseErrorSubscription) {
      this.purchaseErrorSubscription.remove();
      this.purchaseErrorSubscription = null;
    }
  }

  handlePurchaseUpdate = (purchase: ProductPurchase) => {
    const receipt = purchase.transactionReceipt;
    if (receipt) {
      yourAPI
        .deliverOrDownloadFancyInAppPurchase(purchase.transactionReceipt)
        .then(async (deliveryResult) => {
          if (isSuccess(deliveryResult)) {
            // Tell the store that you have delivered what has been paid for.
            // Failure to do this will result in the purchase being refunded on Android and
            // the purchase event will reappear on every relaunch of the app until you succeed
            // in doing the below. It will also be impossible for the user to purchase consumables
            // again until you do this.

            // If consumable (can be purchased again)
            await finishTransaction({purchase, isConsumable: true});
            // If not consumable
            await finishTransaction({purchase, isConsumable: false});
          } else {
            // Retry / conclude the purchase is fraudulent, etc.
          }
        });
    }
  };

  handlePurchaseError = (error: PurchaseError) => {
    console.warn('purchaseErrorListener', error);
  };
}
```

### 2. Using with Hooks (Recommended)

For a more modern approach using React hooks, here's a comprehensive implementation:

```tsx
import React, {useEffect, useState, useCallback} from 'react';
import {Platform, Alert, InteractionManager} from 'react-native';
import {useIAP} from 'expo-iap';

// Define your product SKUs
const bulbPackSkus = ['dev.hyo.luent.10bulbs', 'dev.hyo.luent.30bulbs'];
const subscriptionSkus = ['dev.hyo.luent.premium'];

export default function PurchaseScreen() {
  const {
    connected,
    products,
    subscriptions,
    currentPurchase,
    currentPurchaseError,
    getProducts,
    getSubscriptions,
    requestPurchase,
    finishTransaction,
    validateReceipt,
  } = useIAP();

  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Initialize products when IAP connection is established
  useEffect(() => {
    if (!connected) return;

    const initializeIAP = async () => {
      try {
        // Get both products and subscriptions
        await getProducts(bulbPackSkus);
        await getSubscriptions(subscriptionSkus);
        setIsReady(true);
      } catch (error) {
        console.error('Error initializing IAP:', error);
      }
    };

    initializeIAP();
  }, [connected, getProducts, getSubscriptions]);

  // Validate receipt helper
  const handleValidateReceipt = useCallback(
    async (sku: string, purchase: any) => {
      try {
        if (Platform.OS === 'ios') {
          return await validateReceipt(sku);
        } else if (Platform.OS === 'android') {
          const purchaseToken = purchase.purchaseTokenAndroid;
          const packageName =
            purchase.packageNameAndroid || 'your.package.name';
          const isSub = subscriptionSkus.includes(sku);

          return await validateReceipt(sku, {
            packageName,
            productToken: purchaseToken,
            isSub,
          });
        }
        return {isValid: true}; // Default for unsupported platforms
      } catch (error) {
        console.error('Receipt validation failed:', error);
        return {isValid: false};
      }
    },
    [validateReceipt],
  );

  // Handle successful purchases
  useEffect(() => {
    if (currentPurchase) {
      handlePurchaseUpdate(currentPurchase);
    }
  }, [currentPurchase]);

  // Handle purchase errors
  useEffect(() => {
    if (currentPurchaseError) {
      setIsLoading(false);

      // Don't show error for user cancellation
      if (currentPurchaseError.code === 'E_USER_CANCELLED') {
        return;
      }

      Alert.alert(
        'Purchase Error',
        'Failed to complete purchase. Please try again.',
      );
      console.error('Purchase error:', currentPurchaseError);
    }
  }, [currentPurchaseError]);

  const handlePurchaseUpdate = async (purchase: any) => {
    try {
      setIsLoading(true);
      console.log('Processing purchase:', purchase);

      const productId = purchase.id;

      // Validate receipt on your server
      const validationResult = await handleValidateReceipt(productId, purchase);

      if (validationResult.isValid) {
        // Determine if this is a consumable product
        const isConsumable = bulbPackSkus.includes(productId);

        // Finish the transaction
        await finishTransaction({
          purchase,
          isConsumable, // Set to true for consumable products
        });

        // Record purchase in your database
        await recordPurchaseInDatabase(purchase, productId);

        // Update local state (e.g., add bulbs, enable premium features)
        await updateLocalState(productId);

        // Show success message
        showSuccessMessage(productId);
      } else {
        Alert.alert(
          'Validation Error',
          'Purchase could not be validated. Please contact support.',
        );
      }
    } catch (error) {
      console.error('Error handling purchase:', error);
      Alert.alert('Error', 'Failed to process purchase.');
    } finally {
      setIsLoading(false);
    }
  };

  // Request purchase for products
  const handlePurchaseBulbs = async (productId: string) => {
    if (!connected) {
      Alert.alert(
        'Not Connected',
        'Store connection unavailable. Please try again later.',
      );
      return;
    }

    try {
      setIsLoading(true);

      if (Platform.OS === 'ios') {
        // iOS: single product purchase
        await requestPurchase({
          request: {
            sku: productId,
            andDangerouslyFinishTransactionAutomaticallyIOS: false,
          },
        });
      } else {
        // Android: array of products (even for single purchase)
        await requestPurchase({
          request: {skus: [productId]},
        });
      }
    } catch (error) {
      setIsLoading(false);
      console.error('Purchase request failed:', error);
    }
  };

  // Request purchase for subscriptions
  const handlePurchaseSubscription = async (subscriptionId: string) => {
    if (!connected) {
      Alert.alert(
        'Not Connected',
        'Store connection unavailable. Please try again later.',
      );
      return;
    }

    try {
      setIsLoading(true);

      if (Platform.OS === 'ios') {
        await requestPurchase({
          request: {sku: subscriptionId},
          type: 'subs',
        });
      } else if (Platform.OS === 'android') {
        // Find subscription to get offer details
        const subscription = subscriptions.find((s) => s.id === subscriptionId);

        if (subscription?.subscriptionOfferDetails?.length > 0) {
          const subscriptionOffers = subscription.subscriptionOfferDetails.map(
            (offer) => ({
              sku: subscriptionId,
              offerToken: offer.offerToken,
            }),
          );

          await requestPurchase({
            request: {
              skus: [subscriptionId],
              subscriptionOffers,
            },
            type: 'subs',
          });
        } else {
          // Fallback for subscriptions without offers
          await requestPurchase({
            request: {
              skus: [subscriptionId],
              subscriptionOffers: [{sku: subscriptionId, offerToken: ''}],
            },
            type: 'subs',
          });
        }
      }
    } catch (error) {
      setIsLoading(false);
      console.error('Subscription request failed:', error);
    }
  };

  const recordPurchaseInDatabase = async (purchase: any, productId: string) => {
    // Implement your database recording logic here
    console.log('Recording purchase in database:', {purchase, productId});
  };

  const updateLocalState = async (productId: string) => {
    // Update your local app state based on the purchase
    if (bulbPackSkus.includes(productId)) {
      // Add bulbs to user's account
      const bulbCount = productId.includes('10bulbs') ? 10 : 30;
      console.log(`Adding ${bulbCount} bulbs to user account`);
    } else if (subscriptionSkus.includes(productId)) {
      // Enable premium features
      console.log('Enabling premium features');
    }
  };

  const showSuccessMessage = (productId: string) => {
    InteractionManager.runAfterInteractions(() => {
      if (bulbPackSkus.includes(productId)) {
        const bulbCount = productId.includes('10bulbs') ? 10 : 30;
        Alert.alert(
          'Thank You!',
          `${bulbCount} bulbs have been added to your account.`,
        );
      } else if (subscriptionSkus.includes(productId)) {
        Alert.alert(
          'Thank You!',
          'Premium subscription activated successfully.',
        );
      }
    });
  };

  return (
    <View>
      {/* Your purchase UI components */}
      <Text>Connection Status: {connected ? 'Connected' : 'Disconnected'}</Text>
      <Text>Products Ready: {isReady ? 'Yes' : 'No'}</Text>
      {/* Add your purchase buttons and UI here */}
    </View>
  );
}
```

### 3. Request a Purchase

**Important Platform Difference:**
- **iOS**: Can only purchase one product at a time (single SKU)
- **Android**: Can purchase multiple products at once (array of SKUs)

This fundamental difference requires platform-specific handling:

```tsx
import {requestPurchase, Platform} from 'expo-iap';

// For regular products (consumables/non-consumables)
const handleBuyProduct = async (productId) => {
  try {
    if (Platform.OS === 'ios') {
      // iOS: single product purchase
      await requestPurchase({
        request: {sku: productId}
      });
    } else if (Platform.OS === 'android') {
      // Android: array of products (even for single purchase)
      await requestPurchase({
        request: {skus: [productId]}
      });
    }
  } catch (err) {
    console.warn(err.code, err.message);
  }
};
```

**For subscriptions, the platform differences are even more significant:**

```tsx
const handleBuySubscription = async (subscriptionId: string) => {
  try {
    if (Platform.OS === 'ios') {
      await requestPurchase({
        request: {sku: subscriptionId},
        type: 'subs',
      });
    } else if (Platform.OS === 'android') {
      // Find the subscription product to get its offer details
      const subscription = subscriptions.find((s) => s.id === subscriptionId);

      if (!subscription) {
        throw new Error(`Subscription with ID ${subscriptionId} not found`);
      }

      // Check if the subscription has offer details
      if (subscription.subscriptionOfferDetails?.length > 0) {
        // Create subscription offers with matching offerTokens
        const subscriptionOffers = subscription.subscriptionOfferDetails.map(
          (offer) => ({
            sku: subscriptionId,
            offerToken: offer.offerToken,
          }),
        );

        await requestPurchase({
          request: {
            skus: [subscriptionId],
            subscriptionOffers,
          },
          type: 'subs',
        });
      } else {
        // Fallback for subscriptions without offer details
        await requestPurchase({
          request: {
            skus: [subscriptionId],
            subscriptionOffers: [
              {
                sku: subscriptionId,
                offerToken: '',
              },
            ],
          },
          type: 'subs',
        });
      }
    }
  } catch (err) {
    console.warn(err.code, err.message);
  }
};
```

## Important Notes

### Purchase Flow Best Practices

1. **Always set up listeners first**: Set up `purchaseUpdatedListener` and `purchaseErrorListener` before making any purchase requests.

2. **Handle pending purchases**: On app launch, check for pending purchases that may have completed while the app was closed.

3. **Never rely on promises**: The purchase flow is event-driven, not promise-based. Always use listeners to handle purchase results.

4. **Validate receipts server-side**: Never trust client-side validation. Always validate receipts on your secure server.

5. **Finish transactions**: Always call `finishTransaction` after successful validation to complete the purchase.

### Pending Purchases

```tsx
// On app initialization
componentDidMount() {
  initConnection().then(() => {
    // Set up purchase listeners
    // Note: expo-iap handles pending purchases automatically
    this.setupPurchaseListeners();
  });
}
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

Subscriptions provide ongoing access to content or features:

```tsx
const buySubscription = async (product) => {
  await requestPurchase({
    sku: product.productId,
    subscriptionOffers: [
      {
        sku: product.productId,
        offerToken: product.subscriptionOfferDetails?.[0]?.offerToken,
      },
    ],
  });
};
```

## Advanced Purchase Handling

### Purchase Restoration

For non-consumable products and subscriptions, implement purchase restoration:

```tsx
const {getAvailablePurchases} = useIAP();

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
  } catch (error) {
    console.error('Failed to restore purchases:', error);
  }
};
```

### Handling Pending Purchases

Some purchases may be in a pending state (e.g., awaiting parental approval):

```tsx
useEffect(() => {
  if (currentPurchase?.purchaseState === 'pending') {
    // Inform user that purchase is pending
    showPendingPurchaseMessage();
  }
}, [currentPurchase]);
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
    if (purchase.environmentIos === 'Sandbox') {
      const dayInMs = 24 * 60 * 60 * 1000;
      return purchase.transactionDate && 
        (currentTime - purchase.transactionDate) < dayInMs;
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
  deepLinkToSubscriptions();
};
```

### Receipt Validation

**Important Platform Differences for Receipt Validation:**
- **iOS**: Only requires the SKU for validation
- **Android**: Requires additional parameters including `packageName`, `productToken`, and optionally `accessToken`

**Always validate receipts on your server for security and fraud prevention.** Client-side validation is not sufficient for production apps.

```tsx
const handleValidateReceipt = useCallback(
  async (sku: string, purchase: any) => {
    try {
      if (Platform.OS === 'ios') {
        // iOS: Simple validation with just SKU
        return await validateReceipt(sku);
      } else if (Platform.OS === 'android') {
        // Android: Requires additional validation parameters
        const purchaseToken = purchase.purchaseTokenAndroid;
        const packageName = purchase.packageNameAndroid || 'your.package.name';
        const isSub = subscriptionSkus.includes(sku);

        // Check required Android parameters before validation
        if (!purchaseToken || !packageName) {
          throw new Error(
            'Android validation requires packageName and productToken'
          );
        }

        return await validateReceipt(sku, {
          packageName,
          productToken: purchaseToken,
          isSub,
          // accessToken may be required for server-side validation
        });
      }
      return {isValid: true}; // Default for unsupported platforms
    } catch (error) {
      console.error('Receipt validation failed:', error);
      return {isValid: false};
    }
  },
  [validateReceipt],
);

// Use in purchase handler
const handlePurchaseUpdate = async (purchase: any) => {
  try {
    const productId = purchase.id;

    // Validate receipt on your server
    const validationResult = await handleValidateReceipt(productId, purchase);

    if (validationResult.isValid) {
      // Process the purchase
      await finishTransaction({
        purchase,
        isConsumable: bulbPackSkus.includes(productId),
      });

      // Update user's purchase state in your app
      updateUserPurchases(productId);
    } else {
      console.error('Receipt validation failed for:', productId);
      // Handle invalid receipt
    }
  } catch (error) {
    console.error('Purchase processing failed:', error);
  }
};
```

**Best Practices:**

- Always validate on your server, never trust client-side validation alone
- Store purchase receipts in your database for future reference
- Implement retry logic for failed validations due to network issues
- Log validation failures for fraud detection and analysis

## Error Handling

Implement comprehensive error handling for various scenarios:

```tsx
const handlePurchaseError = (error) => {
  switch (error.code) {
    case 'E_USER_CANCELLED':
      // User cancelled - no action needed
      break;

    case 'E_NETWORK_ERROR':
      // Show retry option
      showRetryDialog();
      break;

    case 'E_ITEM_UNAVAILABLE':
      // Product not available
      showProductUnavailableMessage();
      break;

    case 'E_ALREADY_OWNED':
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
- [Complete Store Example](../examples/complete-impl) for production-ready implementation
