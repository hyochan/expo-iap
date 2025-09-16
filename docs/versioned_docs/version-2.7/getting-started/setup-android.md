---
sidebar_position: 2
---

import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# Android Setup

<AdFitTopFixed />

Setting up in-app purchases for Android requires configuration in Google Play Console and proper Android app setup.

## Google Play Console Configuration

### 1. Create Your App

1. Sign in to [Google Play Console](https://play.google.com/console/)
2. Create a new app or select your existing app
3. Complete the app information and store listing

### 2. Set Up In-App Products

1. Navigate to **Monetize** > **Products** > **In-app products**
2. Click **Create product**
3. Choose your product type:
   - **Managed product**: One-time purchase (non-consumable)
   - **Consumable**: Can be purchased multiple times

### 3. Configure Product Details

For each product, provide:

- **Product ID**: Unique identifier (e.g., `premium_upgrade`)
- **Name**: Product name shown to users
- **Description**: Product description
- **Default price**: Set pricing for different countries
- **Status**: Activate the product

### 4. Set Up Subscriptions (Optional)

1. Navigate to **Monetize** > **Products** > **Subscriptions**
2. Click **Create subscription**
3. Configure subscription details:
   - **Product ID**: Unique identifier
   - **Base plans**: Pricing and billing periods
   - **Offers**: Special pricing (optional)

## Android App Configuration

### 1. Google Play Billing Dependencies

Expo IAP automatically includes the necessary Google Play Billing dependencies. No manual configuration needed.

### 2. Permissions

The required billing permission is automatically added. Your `android/app/src/main/AndroidManifest.xml` should include:

```xml
<uses-permission android:name="com.android.vending.BILLING" />
```

### 3. ProGuard Configuration

If you're using ProGuard, add these rules to your `android/app/proguard-rules.pro`:

```proguard
-keep class com.android.vending.billing.**
```

## Testing Setup

### 1. Upload to Play Console

To test in-app purchases, you must upload your app to Google Play Console:

1. Build a signed APK/AAB
2. Upload to **Internal testing** track
3. Add test users to the testing track

### 2. Create Test Accounts

1. In Play Console, go to **Setup** > **License testing**
2. Add Gmail accounts as test users
3. Test users can make purchases without being charged

### 3. Test Payment Method

Test users should:

1. Use the added test Gmail account on their device
2. Have a valid payment method (won't be charged for test purchases)
3. Install the app from the testing track

## Code Integration

### Basic Setup

```tsx
import {useIAP, ErrorCode} from 'expo-iap';

const androidProductIds = [
  'premium_upgrade',
  'coins_100',
  'monthly_subscription',
];

function App() {
  const {
    connected,
    products,
    subscriptions,
    getProducts,
    getSubscriptions,
    requestPurchase,
  } = useIAP({
    onPurchaseSuccess: (purchase) => {
      console.log('Purchase successful:', purchase);
      handleSuccessfulPurchase(purchase);
    },
    onPurchaseError: (error) => {
      console.error('Purchase failed:', error);
      handlePurchaseError(error);
    },
  });

  React.useEffect(() => {
    if (connected) {
      // Fetch products and subscriptions
      getProducts(
        androidProductIds.filter((id) => !id.includes('subscription')),
      );
      getSubscriptions(
        androidProductIds.filter((id) => id.includes('subscription')),
      );
    }
  }, [connected]);

  return (
    <View>
      {/* Render products */}
      {products.map((product) => (
        <AndroidProductItem key={product.id} product={product} />
      ))}

      {/* Render subscriptions */}
      {subscriptions.map((subscription) => (
        <AndroidSubscriptionItem
          key={subscription.id}
          subscription={subscription}
        />
      ))}
    </View>
  );
}
```

### Android-Specific Product Handling

```tsx
const AndroidProductItem = ({product}: {product: Product}) => {
  const {requestPurchase} = useIAP();

  const handlePurchase = () => {
    if (product.platform === 'android') {
      requestPurchase({
        request: {skus: [product.id]},
        type: 'inapp',
      });
    }
  };

  if (product.platform !== 'android') return null;

  return (
    <TouchableOpacity onPress={handlePurchase}>
      <Text>{product.title}</Text>
      <Text>{product.oneTimePurchaseOfferDetails?.formattedPrice}</Text>
    </TouchableOpacity>
  );
};
```

> **💡 Cross-Platform Note:** This example shows Android-specific usage with `skus`. For cross-platform compatibility, include both `sku` and `skus` in your request object. See the [Core Methods](/docs/api/methods/core-methods#requestpurchase) documentation for details.

### Android-Specific Subscription Handling

```tsx
const AndroidSubscriptionItem = ({
  subscription,
}: {
  subscription: ProductSubscription;
}) => {
  const {requestPurchase} = useIAP();

  const handleSubscribe = (offer: any) => {
    if (subscription.platform === 'android') {
      requestPurchase({
        request: {
          skus: [subscription.id],
          subscriptionOffers: [
            {
              sku: subscription.id,
              offerToken: offer.offerToken,
            },
          ],
        },
        type: 'subs',
      });
    }
  };

  if (subscription.platform !== 'android') return null;

  return (
    <View>
      <Text>{subscription.title}</Text>
      {subscription.subscriptionOfferDetails?.map((offer) => (
        <TouchableOpacity
          key={offer.offerId}
          onPress={() => handleSubscribe(offer)}
        >
          <Text>
            {offer.pricingPhases.pricingPhaseList
              .map((phase) => `${phase.formattedPrice}/${phase.billingPeriod}`)
              .join(' then ')}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};
```

### Error Handling for Android

```tsx
const handleAndroidError = (error: PurchaseError) => {
  switch (error.code) {
    case ErrorCode.UserCancelled:
      // User cancelled - no action needed
      break;
    case ErrorCode.ItemUnavailable:
      Alert.alert(
        'Product Unavailable',
        'This item is not available for purchase',
      );
      break;
    case ErrorCode.ServiceError:
      Alert.alert('Service Error', 'Google Play services are unavailable');
      break;
    case ErrorCode.DeveloperError:
      Alert.alert('Configuration Error', 'Please contact support');
      break;
    default:
      Alert.alert('Purchase Failed', error.message);
  }
};
```

## Common Issues

### Product IDs Not Found

**Problem**: Products return empty or show as unavailable **Solutions**:

- Verify product IDs match exactly between code and Play Console
- Ensure products are **Active** in Play Console
- Check that app is uploaded to at least Internal testing track
- Verify the app package name matches

### Testing Issues

**Problem**: "Item not found" or "Authentication required" errors **Solutions**:

- Use Gmail accounts added as test users
- Install app from testing track, not directly via ADB
- Ensure test user has a valid payment method
- Clear Google Play Store cache and data

### Purchase Flow Issues

**Problem**: Purchase dialog doesn't appear or fails immediately **Solutions**:

- Verify Google Play services are updated
- Check device has valid Google account
- Ensure app is properly signed
- Test on different devices

### Subscription Issues

**Problem**: Subscription offers not showing or failing **Solutions**:

- Verify base plans are properly configured
- Check offer eligibility rules
- Ensure proper offer token handling
- Test with different user accounts

## Best Practices

1. **Always test on real devices** - emulators may have issues with Google Play services
2. **Use proper product IDs** - follow reverse domain naming (com.yourapp.product)
3. **Handle all error cases** - especially network and service errors
4. **Test with multiple accounts** - verify behavior for new and existing users
5. **Implement proper retry logic** - for transient failures
6. **Cache purchase state** - to handle app restarts gracefully

## Android-Specific Features

### Proration for Subscription Changes

```tsx
const upgradeSubscription = async (
  newSkuId: string,
  oldPurchaseToken: string,
) => {
  try {
    await requestPurchase({
      request: {
        skus: [newSkuId],
        subscriptionOffers: [
          {
            sku: newSkuId,
            offerToken: 'new_offer_token',
          },
        ],
        replacementMode: 'IMMEDIATE_WITH_TIME_PRORATION',
        oldPurchaseToken: oldPurchaseToken,
      },
      type: 'subs',
    });
  } catch (error) {
    console.error('Subscription upgrade failed:', error);
  }
};
```

### Pending Purchases

Handle purchases that require additional verification:

```tsx
const handlePendingPurchase = (purchase: Purchase) => {
  if (purchase.purchaseState === 'pending') {
    // Show pending message to user
    Alert.alert(
      'Purchase Pending',
      'Your purchase is being processed. You will receive access once payment is confirmed.',
    );

    // Store pending purchase for later verification
    storePendingPurchase(purchase);
  }
};
```

## Next Steps

- [Learn about getting started guide](../guides/getting-started)
- [Explore iOS setup](./setup-ios)
- [Understand error codes](../api/error-codes)
