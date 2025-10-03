---
title: Alternative Billing Example
sidebar_label: Alternative Billing
sidebar_position: 5
---

import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# Alternative Billing

<AdFitTopFixed />

Use alternative billing to redirect users to external payment systems or offer payment choices alongside platform billing.

View the full example source:

- GitHub: [alternative-billing.tsx](https://github.com/hyochan/expo-iap/blob/main/example/app/alternative-billing.tsx)

## iOS - External Purchase URL

Redirect users to an external website for payment (iOS 16.0+):

```tsx
import {Platform, Button, Alert} from 'react-native';
import {requestPurchase, type Product} from 'expo-iap';

function IOSAlternativeBilling({product}: {product: Product}) {
  const handlePurchase = async () => {
    if (Platform.OS !== 'ios') return;

    try {
      await requestPurchase({
        request: {
          ios: {
            sku: product.id,
            quantity: 1,
          },
        },
        type: 'in-app',
        useAlternativeBilling: true,
      });

      Alert.alert(
        'Redirected',
        'Complete purchase on the external website. You will be redirected back to the app.',
      );
    } catch (error: any) {
      if (error.code !== 'user-cancelled') {
        Alert.alert('Error', error.message);
      }
    }
  };

  return <Button title="Buy (External URL)" onPress={handlePurchase} />;
}
```

### Important Notes

- **iOS 16.0+ Required**: External URLs only work on iOS 16.0 and later
- **Configuration Required**: External URLs must be configured in `app.config.ts` (see [Alternative Billing Guide](/docs/guides/alternative-billing))
- **No Callback**: `onPurchaseUpdated` will NOT fire when using external URLs
- **Deep Linking**: Implement deep linking to return users to your app

## Android - Alternative Billing Only

Manual 3-step flow for alternative billing only:

```tsx
import {Platform, Button, Alert} from 'react-native';
import {
  checkAlternativeBillingAvailabilityAndroid,
  showAlternativeBillingDialogAndroid,
  createAlternativeBillingTokenAndroid,
  type Product,
} from 'expo-iap';

function AndroidAlternativeBillingOnly({product}: {product: Product}) {
  const handlePurchase = async () => {
    if (Platform.OS !== 'android') return;

    try {
      // Step 1: Check availability
      const isAvailable = await checkAlternativeBillingAvailabilityAndroid();
      if (!isAvailable) {
        Alert.alert('Error', 'Alternative billing not available');
        return;
      }

      // Step 2: Show information dialog
      const userAccepted = await showAlternativeBillingDialogAndroid();
      if (!userAccepted) {
        console.log('User declined');
        return;
      }

      // Step 2.5: Process payment with your payment system
      // ... your payment processing logic here ...
      console.log('Processing payment...');

      // Step 3: Create reporting token (after successful payment)
      const token = await createAlternativeBillingTokenAndroid(product.id);
      console.log('Token created:', token);

      // Step 4: Report token to Google Play backend within 24 hours
      // await reportToGoogleBackend(token);

      Alert.alert('Success', 'Alternative billing completed (DEMO)');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return <Button title="Buy (Alternative Only)" onPress={handlePurchase} />;
}
```

### Flow Steps

1. **Check availability** - Verify alternative billing is enabled
2. **Show info dialog** - Display Google's information dialog
3. **Process payment** - Handle payment with your system
4. **Create token** - Generate reporting token
5. **Report to Google** - Send token to Google within 24 hours

## Android - User Choice Billing

Let users choose between Google Play and alternative billing:

```tsx
import {Platform, Button} from 'react-native';
import {useIAP, requestPurchase, type Product} from 'expo-iap';

function AndroidUserChoiceBilling({product}: {product: Product}) {
  // Initialize with user choice mode
  const {connected} = useIAP({
    alternativeBillingModeAndroid: 'user-choice',
    onPurchaseSuccess: (purchase) => {
      // Fires if user selects Google Play
      console.log('Google Play purchase:', purchase);
    },
  });

  const handlePurchase = async () => {
    if (Platform.OS !== 'android' || !connected) return;

    try {
      // Google will show selection dialog automatically
      await requestPurchase({
        request: {
          android: {
            skus: [product.id],
          },
        },
        type: 'in-app',
        useAlternativeBilling: true,
      });

      // If user selects Google Play: onPurchaseSuccess fires
      // If user selects alternative: manual flow required
    } catch (error: any) {
      console.error('Purchase error:', error);
    }
  };

  return <Button title="Buy (User Choice)" onPress={handlePurchase} />;
}
```

### Selection Dialog

- Google shows automatic selection dialog
- User chooses: Google Play (30% fee) or Alternative (lower fee)
- Different callbacks based on user choice

## Complete Cross-Platform Example

```tsx
import {useState, useCallback} from 'react';
import {Platform, View, Button, Alert} from 'react-native';
import {
  useIAP,
  requestPurchase,
  checkAlternativeBillingAvailabilityAndroid,
  showAlternativeBillingDialogAndroid,
  createAlternativeBillingTokenAndroid,
  type Product,
  type AlternativeBillingModeAndroid,
} from 'expo-iap';

function AlternativeBillingScreen() {
  const [billingMode, setBillingMode] =
    useState<AlternativeBillingModeAndroid>('alternative-only');

  const {connected, products, fetchProducts} = useIAP({
    alternativeBillingModeAndroid:
      Platform.OS === 'android' ? billingMode : undefined,
    onPurchaseSuccess: (purchase) => {
      console.log('Purchase successful:', purchase);
    },
    onPurchaseError: (error) => {
      console.error('Purchase error:', error);
    },
  });

  const handleIOSPurchase = useCallback(async (product: Product) => {
    await requestPurchase({
      request: {
        ios: {
          sku: product.id,
          quantity: 1,
        },
      },
      type: 'in-app',
      useAlternativeBilling: true,
    });

    Alert.alert('Redirected', 'Complete purchase on external website');
  }, []);

  const handleAndroidAlternativeOnly = useCallback(async (product: Product) => {
    const isAvailable = await checkAlternativeBillingAvailabilityAndroid();
    if (!isAvailable) {
      Alert.alert('Error', 'Alternative billing not available');
      return;
    }

    const userAccepted = await showAlternativeBillingDialogAndroid();
    if (!userAccepted) return;

    // Process payment...
    const token = await createAlternativeBillingTokenAndroid(product.id);
    Alert.alert('Success', `Token created: ${token?.substring(0, 20)}...`);
  }, []);

  const handleAndroidUserChoice = useCallback(async (product: Product) => {
    await requestPurchase({
      request: {
        android: {
          skus: [product.id],
        },
      },
      type: 'in-app',
      useAlternativeBilling: true,
    });
  }, []);

  const handlePurchase = (product: Product) => {
    if (Platform.OS === 'ios') {
      handleIOSPurchase(product);
    } else if (Platform.OS === 'android') {
      if (billingMode === 'alternative-only') {
        handleAndroidAlternativeOnly(product);
      } else {
        handleAndroidUserChoice(product);
      }
    }
  };

  return (
    <View>
      {/* Android: Mode selector */}
      {Platform.OS === 'android' && (
        <Button
          title={`Mode: ${billingMode}`}
          onPress={() =>
            setBillingMode(
              billingMode === 'alternative-only'
                ? 'user-choice'
                : 'alternative-only',
            )
          }
        />
      )}

      {/* Products list */}
      {products.map((product) => (
        <Button
          key={product.id}
          title={`Buy ${product.title}`}
          onPress={() => handlePurchase(product)}
        />
      ))}
    </View>
  );
}
```

## Configuration

### useIAP Hook

```tsx
const {connected} = useIAP({
  alternativeBillingModeAndroid: 'alternative-only', // or 'user-choice' or 'none'
});
```

### Root API

```tsx
import {initConnection} from 'expo-iap';

await initConnection({
  alternativeBillingModeAndroid: 'alternative-only',
});
```

## Testing

### iOS

- Test on iOS 16.0+ devices
- Verify external URL opens in Safari
- Test deep link return flow

### Android

- Configure alternative billing in Google Play Console
- Test both modes separately
- Verify token generation

## Best Practices

1. **Backend Validation** - Always validate on server
2. **Clear UI** - Show users they're leaving the app
3. **Error Handling** - Handle all error cases
4. **Token Reporting** - Report within 24 hours (Android)
5. **Deep Linking** - Essential for iOS return flow

## See Also

- [Alternative Billing Guide](/docs/guides/alternative-billing)
- [Error Handling](/docs/guides/error-handling)
- [Purchase Flow](/docs/examples/purchase-flow)
