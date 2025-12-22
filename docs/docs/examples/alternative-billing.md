---
title: Alternative Billing Example
sidebar_label: Alternative Billing
sidebar_position: 5
---

import IapKitBanner from "@site/src/uis/IapKitBanner";

# Alternative Billing

<IapKitBanner />

:::tip What you'll build
Use alternative billing to redirect users to external payment systems or offer payment choices alongside platform billing.
:::

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
          apple: {
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

## Android - Billing Programs API (8.2.0+)

The new Billing Programs API provides a unified way to handle external billing:

```tsx
import {Platform, Button, Alert} from 'react-native';
import {
  isBillingProgramAvailableAndroid,
  launchExternalLinkAndroid,
  createBillingProgramReportingDetailsAndroid,
  type Product,
} from 'expo-iap';

function AndroidBillingPrograms({product}: {product: Product}) {
  const handlePurchase = async () => {
    if (Platform.OS !== 'android') return;

    try {
      // Step 1: Check availability
      const availability = await isBillingProgramAvailableAndroid('external-offer');
      if (!availability.isAvailable) {
        Alert.alert('Error', 'External offer program not available');
        return;
      }

      // Step 2: Launch external link
      await launchExternalLinkAndroid({
        billingProgram: 'external-offer',
        launchMode: 'launch-in-external-browser-or-app',
        linkType: 'link-to-digital-content-offer',
        linkUri: `https://your-payment-site.com/purchase/${product.id}`,
      });

      // Step 3: After payment completes externally, get reporting token
      const details = await createBillingProgramReportingDetailsAndroid('external-offer');
      console.log('Token:', details.externalTransactionToken);

      // Step 4: Report token to Google Play backend within 24 hours
      // await reportToGoogleBackend(details.externalTransactionToken);

      Alert.alert('Success', 'Billing program flow completed');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return <Button title="Buy (Billing Programs)" onPress={handlePurchase} />;
}
```

### Billing Program Types

- `external-offer` - External offer programs
- `external-content-link` - External content link programs

### Launch Modes

- `launch-in-external-browser-or-app` - Opens in external browser
- `caller-will-launch-link` - App handles the launch

### Link Types

- `link-to-digital-content-offer` - Digital content offers
- `link-to-app-download` - App download links

## Android - Alternative Billing (Legacy)

:::warning Deprecated
The legacy alternative billing API is deprecated. Use the [Billing Programs API](#android---billing-programs-api-820) instead.
:::

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
          google: {
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
  isBillingProgramAvailableAndroid,
  launchExternalLinkAndroid,
  createBillingProgramReportingDetailsAndroid,
  type Product,
  type AlternativeBillingModeAndroid,
} from 'expo-iap';

type BillingMode = 'billing-programs' | 'user-choice' | 'legacy';

function AlternativeBillingScreen() {
  const [billingMode, setBillingMode] = useState<BillingMode>('billing-programs');

  const {connected, products} = useIAP({
    alternativeBillingModeAndroid:
      Platform.OS === 'android' && billingMode === 'user-choice'
        ? 'user-choice'
        : undefined,
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
        apple: {
          sku: product.id,
          quantity: 1,
        },
      },
      type: 'in-app',
      useAlternativeBilling: true,
    });

    Alert.alert('Redirected', 'Complete purchase on external website');
  }, []);

  const handleAndroidBillingPrograms = useCallback(async (product: Product) => {
    const availability = await isBillingProgramAvailableAndroid('external-offer');
    if (!availability.isAvailable) {
      Alert.alert('Error', 'Billing program not available');
      return;
    }

    await launchExternalLinkAndroid({
      billingProgram: 'external-offer',
      launchMode: 'launch-in-external-browser-or-app',
      linkType: 'link-to-digital-content-offer',
      linkUri: `https://your-payment-site.com/purchase/${product.id}`,
    });

    const details = await createBillingProgramReportingDetailsAndroid('external-offer');
    Alert.alert('Success', `Token: ${details.externalTransactionToken.substring(0, 20)}...`);
  }, []);

  const handleAndroidUserChoice = useCallback(async (product: Product) => {
    await requestPurchase({
      request: {
        google: {
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
      if (billingMode === 'billing-programs') {
        handleAndroidBillingPrograms(product);
      } else {
        handleAndroidUserChoice(product);
      }
    }
  };

  const cycleBillingMode = () => {
    const modes: BillingMode[] = ['billing-programs', 'user-choice', 'legacy'];
    const currentIndex = modes.indexOf(billingMode);
    setBillingMode(modes[(currentIndex + 1) % modes.length]);
  };

  return (
    <View>
      {/* Android: Mode selector */}
      {Platform.OS === 'android' ? (
        <Button title={`Mode: ${billingMode}`} onPress={cycleBillingMode} />
      ) : null}

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

- Configure billing programs in Google Play Console
- Test Billing Programs API (8.2.0+) first
- Fall back to legacy API if needed
- Verify token generation and reporting

## Best Practices

1. **Use Billing Programs API** - Prefer the new 8.2.0+ API over legacy methods
2. **Backend Validation** - Always validate on server
3. **Clear UI** - Show users they're leaving the app
4. **Error Handling** - Handle all error cases
5. **Token Reporting** - Report within 24 hours (Android)
6. **Deep Linking** - Essential for iOS return flow

## See Also

- [Alternative Billing Guide](/docs/guides/alternative-billing)
- [Android-Specific APIs](/docs/api/methods/android-specific)
- [Error Handling](/docs/guides/error-handling)
- [Purchase Flow](/docs/examples/purchase-flow)
