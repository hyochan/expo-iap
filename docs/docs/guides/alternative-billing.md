---
title: Alternative Billing
sidebar_label: Alternative Billing
---

import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# Alternative Billing

<AdFitTopFixed />

This guide explains how to implement alternative billing functionality in your app using expo-iap, allowing you to use external payment systems alongside or instead of the App Store/Google Play billing.

## Official Documentation

### Apple (iOS)

- [StoreKit External Purchase Documentation](https://developer.apple.com/documentation/storekit/external-purchase) - Official StoreKit external purchase API reference
- [External Purchase Link Entitlement](https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.storekit.external-purchase-link) - Entitlement configuration
- [ExternalPurchaseCustomLink API](https://developer.apple.com/documentation/storekit/externalpurchasecustomlink) - Custom link API documentation
- [OpenIAP External Purchase](https://www.openiap.dev/docs/external-purchase) - OpenIAP external purchase specification

**Configuration**: Configure iOS alternative billing in your `app.config.ts`:

```typescript
export default {
  // ... other config
  plugins: [
    [
      'expo-iap',
      {
        iosAlternativeBilling: {
          // Required: Countries where external purchases are supported
          countries: ['kr', 'nl', 'de', 'fr'], // ISO 3166-1 alpha-2

          // Optional: Enable external purchase link entitlement
          enableExternalPurchaseLink: true,
        },
      },
    ],
  ],
};
```

### Google Play (Android)

- [Alternative Billing APIs](https://developer.android.com/google/play/billing/alternative) - Official Android alternative billing API guide
- [User Choice Billing Overview](https://support.google.com/googleplay/android-developer/answer/13821247) - Understanding user choice billing
- [User Choice Billing Pilot](https://support.google.com/googleplay/android-developer/answer/12570971) - Enrollment and setup
- [Payments Policy](https://support.google.com/googleplay/android-developer/answer/10281818) - Google Play's payment policy
- [UX Guidelines (User Choice)](https://developer.android.com/google/play/billing/alternative/interim-ux/user-choice) - User choice billing UX guidelines
- [UX Guidelines (Alternative Billing)](https://developer.android.com/google/play/billing/alternative/interim-ux/billing-choice) - Alternative billing UX guidelines
- [EEA Alternative Billing](https://support.google.com/googleplay/android-developer/answer/12348241) - European Economic Area specific guidance

### Platform Updates (2024)

#### iOS

- US apps can use StoreKit External Purchase Link Entitlement
- System disclosure sheet shown each time external link is accessed
- Commission: 27% (reduced from 30%) for first year, 12% for subsequent years
- EU apps have additional flexibility for external purchases

#### Android

- As of March 13, 2024: Alternative billing APIs must be used (manual reporting deprecated)
- Service fee reduced by 4% when using alternative billing (e.g., 15% → 11%)
- Available in South Korea, India, and EEA
- Gaming and non-gaming apps eligible (varies by region)

## Overview

Alternative billing enables developers to offer payment options outside of the platform's standard billing systems:

- **iOS**: Redirect users to external websites for payment (iOS 16.0+)
- **Android**: Use Google Play's alternative billing options (requires approval)

:::warning Platform Approval Required Both platforms require special approval to use alternative billing:

- **iOS**: Must be approved for external purchase entitlement
- **Android**: Must be approved for alternative billing in Google Play Console :::

## iOS Alternative Billing (External Purchase URLs)

On iOS, alternative billing works by redirecting users to an external website where they complete the purchase.

### Configuration

Configure iOS alternative billing in your `app.config.ts`:

```typescript
export default {
  // ... other config
  plugins: [
    [
      'expo-iap',
      {
        iosAlternativeBilling: {
          // Required: Countries where external purchases are supported (ISO 3166-1 alpha-2)
          countries: ['kr', 'nl', 'de', 'fr', 'it', 'es'],

          // Optional: External purchase URLs per country (iOS 15.4+)
          links: {
            kr: 'https://your-site.com/kr/checkout',
            nl: 'https://your-site.com/nl/checkout',
            de: 'https://your-site.com/de/checkout',
          },

          // Optional: Multiple URLs per country (iOS 17.5+, up to 5)
          multiLinks: {
            fr: [
              'https://your-site.com/fr',
              'https://your-site.com/global-sale',
            ],
            it: ['https://your-site.com/global-sale'],
          },

          // Optional: Custom link regions (iOS 18.1+)
          customLinkRegions: ['de', 'fr', 'nl'],

          // Optional: Streaming regions for music apps (iOS 18.2+)
          streamingLinkRegions: ['at', 'de', 'fr', 'nl', 'is', 'no'],

          // Enable external purchase link entitlement
          enableExternalPurchaseLink: true,

          // Enable streaming entitlement (music apps only)
          enableExternalPurchaseLinkStreaming: false,
        },
      },
    ],
  ],
};
```

This automatically adds the required configuration to your iOS app:

**Entitlements:**

```xml
<plist>
<dict>
    <!-- Automatically added when countries are specified -->
    <key>com.apple.developer.storekit.external-purchase</key>
    <true/>

    <!-- Added when enableExternalPurchaseLink is true -->
    <key>com.apple.developer.storekit.external-purchase-link</key>
    <true/>

    <!-- Added when enableExternalPurchaseLinkStreaming is true -->
    <key>com.apple.developer.storekit.external-purchase-link-streaming</key>
    <true/>
</dict>
</plist>
```

**Info.plist:**

```xml
<plist>
<dict>
    <!-- Countries where external purchases are supported -->
    <key>SKExternalPurchase</key>
    <array>
        <string>kr</string>
        <string>nl</string>
        <string>de</string>
    </array>

    <!-- External purchase URLs (optional) -->
    <key>SKExternalPurchaseLink</key>
    <dict>
        <key>kr</key>
        <string>https://your-site.com/kr/checkout</string>
    </dict>

    <!-- Multiple URLs per country (optional) -->
    <key>SKExternalPurchaseMultiLink</key>
    <dict>
        <key>fr</key>
        <array>
            <string>https://your-site.com/fr</string>
            <string>https://your-site.com/global-sale</string>
        </array>
    </dict>
</dict>
</plist>
```

:::warning Requirements

- **Approval Required**: You must obtain approval from Apple to use external purchase features
- **URL Format**: URLs must use HTTPS, have no query parameters, and be 1,000 characters or fewer
- **Link Limits**:
  - Music streaming apps: up to 5 links per country (EU + Iceland, Norway)
  - Other apps: 1 link per country
- **Supported Regions**: Different features support different regions (EU, US, etc.)

See [External Purchase Link Entitlement](https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.storekit.external-purchase-link) for details. :::

### Basic Usage

```typescript
import {requestPurchase} from 'expo-iap';

const purchaseWithExternalUrl = async () => {
  try {
    await requestPurchase({
      request: {
        ios: {
          sku: 'com.example.product',
          quantity: 1,
        },
      },
      type: 'in-app',
      useAlternativeBilling: true,
    });

    // User will be redirected to the external URL
    // No onPurchaseUpdated callback will fire
    console.log('User redirected to external payment site');
  } catch (error) {
    console.error('Alternative billing error:', error);
  }
};
```

### Important Notes

- **iOS 16.0+ Required**: External purchase links only work on iOS 16.0 and later
- **No Purchase Callback**: The `onPurchaseUpdated` callback will NOT fire when using external URLs
- **Deep Link Required**: Implement deep linking to return users to your app after purchase
- **Manual Validation**: You must validate purchases on your backend server

### Complete iOS Example

```typescript
import {useIAP, requestPurchase} from 'expo-iap';
import {Platform, Alert} from 'react-native';

function MyComponent() {
  const handleAlternativeBillingPurchase = async (productId: string) => {
    if (Platform.OS !== 'ios') return;

    try {
      await requestPurchase({
        request: {
          ios: {
            sku: productId,
            quantity: 1,
          },
        },
        type: 'in-app',
        useAlternativeBilling: true,
      });

      Alert.alert(
        'Redirected',
        'Complete your purchase on the external website. You will be redirected back to the app.',
      );
    } catch (error: any) {
      if (error.code === 'user-cancelled') {
        console.log('User cancelled');
      } else {
        Alert.alert('Error', error.message);
      }
    }
  };

  // ... rest of component
}
```

## Android Alternative Billing

Android supports two alternative billing modes:

1. **Alternative Billing Only**: Users can ONLY use your payment system
2. **User Choice Billing**: Users choose between Google Play or your payment system

### Mode 1: Alternative Billing Only

This mode requires a manual 3-step flow:

```typescript
import {
  useIAP,
  checkAlternativeBillingAvailabilityAndroid,
  showAlternativeBillingDialogAndroid,
  createAlternativeBillingTokenAndroid,
} from 'expo-iap';

const handleAlternativeBillingOnly = async (productId: string) => {
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

    // Step 3: Create reporting token (after successful payment)
    const token = await createAlternativeBillingTokenAndroid(productId);

    // Step 4: Report token to Google Play backend within 24 hours
    await reportToGoogleBackend(token);

    console.log('Alternative billing completed');
  } catch (error) {
    console.error('Alternative billing error:', error);
  }
};
```

### Mode 2: User Choice Billing

With user choice, Google automatically shows a selection dialog:

```typescript
import {useIAP, requestPurchase} from 'expo-iap';

// Initialize with user choice mode
const {connected, products, fetchProducts} = useIAP({
  alternativeBillingModeAndroid: 'user-choice',
  onPurchaseSuccess: (purchase) => {
    // This fires if user selects Google Play
    console.log('Google Play purchase:', purchase);
  },
});

const handleUserChoicePurchase = async (productId: string) => {
  try {
    // Google will show selection dialog automatically
    await requestPurchase({
      request: {
        android: {
          skus: [productId],
        },
      },
      type: 'in-app',
      useAlternativeBilling: true,
    });

    // If user selects Google Play: onPurchaseSuccess callback fires
    // If user selects alternative: No callback (manual flow required)
  } catch (error) {
    console.error('Purchase error:', error);
  }
};
```

### Configuring Alternative Billing Mode

Set the billing mode when initializing the connection:

```typescript
import {useIAP} from 'expo-iap';

const {connected} = useIAP({
  // 'none' (default), 'user-choice', or 'alternative-only'
  alternativeBillingModeAndroid: 'alternative-only',
});
```

Or use the root API:

```typescript
import {initConnection, type AlternativeBillingModeAndroid} from 'expo-iap';

await initConnection({
  alternativeBillingModeAndroid:
    'alternative-only' as AlternativeBillingModeAndroid,
});
```

## Complete Cross-Platform Example

```typescript
import {Platform, Alert} from 'react-native';
import {
  useIAP,
  requestPurchase,
  checkAlternativeBillingAvailabilityAndroid,
  showAlternativeBillingDialogAndroid,
  createAlternativeBillingTokenAndroid,
  type AlternativeBillingModeAndroid,
} from 'expo-iap';

function AlternativeBillingComponent() {
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

  const handlePurchase = async (productId: string) => {
    if (Platform.OS === 'ios') {
      // iOS: External URL
      await requestPurchase({
        request: {
          ios: {
            sku: productId,
            quantity: 1,
          },
        },
        type: 'in-app',
        useAlternativeBilling: true,
      });
    } else if (Platform.OS === 'android') {
      if (billingMode === 'alternative-only') {
        // Android: Alternative Billing Only (3-step flow)
        const isAvailable = await checkAlternativeBillingAvailabilityAndroid();
        if (!isAvailable) {
          Alert.alert('Error', 'Alternative billing not available');
          return;
        }

        const userAccepted = await showAlternativeBillingDialogAndroid();
        if (!userAccepted) return;

        // Process payment...
        const token = await createAlternativeBillingTokenAndroid(productId);
        // Report to backend...
      } else {
        // Android: User Choice
        await requestPurchase({
          request: {
            android: {
              skus: [productId],
            },
          },
          type: 'in-app',
          useAlternativeBilling: true,
        });
      }
    }
  };

  // ... rest of component
}
```

## Best Practices

### General

1. **Backend Validation**: Always validate purchases on your backend server
2. **Clear Communication**: Inform users they're leaving the app for external payment
3. **Deep Linking**: Implement deep links to return users to your app (iOS)
4. **Error Handling**: Handle all error cases gracefully

### iOS Specific

1. **iOS Version Check**: Verify iOS 16.0+ before enabling alternative billing
2. **URL Validation**: Ensure external URLs are valid and secure (HTTPS)
3. **No Purchase Events**: Don't rely on `onPurchaseUpdated` when using external URLs
4. **Deep Link Implementation**: Crucial for returning users to your app

### Android Specific

1. **24-Hour Reporting**: Report tokens to Google within 24 hours
2. **Mode Selection**: Choose the appropriate mode for your use case
3. **User Experience**: User Choice mode provides better UX but shares revenue with Google
4. **Backend Integration**: Implement proper token reporting to Google Play

## Testing

### iOS Testing

1. Test on real devices running iOS 16.0+
2. Verify external URL opens correctly in Safari
3. Test deep link return flow
4. Ensure StoreKit is configured for alternative billing

### Android Testing

1. Configure alternative billing in Google Play Console
2. Test both billing modes separately
3. Verify token generation and reporting
4. Test user choice dialog behavior

## Troubleshooting

### iOS Issues

#### "Feature not supported"

- Ensure iOS 16.0 or later
- Verify external purchase entitlement is approved

#### "External URL not opening"

- Check URL format (must be valid HTTPS)
- Verify `useAlternativeBilling` flag is set

#### "User stuck on external site"

- Implement deep linking to return to app
- Test deep link handling

### Android Issues

#### "Alternative billing not available"

- Verify Google Play approval
- Check device and Play Store version
- Ensure billing mode is configured

#### "Token creation failed"

- Verify product ID is correct
- Check billing mode configuration
- Ensure user completed info dialog

#### "User choice dialog not showing"

- Verify `alternativeBillingModeAndroid: 'user-choice'`
- Ensure `useAlternativeBilling: true` in request
- Check Google Play configuration

## Platform Requirements

- **iOS**: iOS 16.0+ for external purchase URLs
- **Android**: Google Play Billing Library 5.0+ with alternative billing enabled
- **Approval**: Both platforms require approval for alternative billing features

## See Also

- [OpenIAP Alternative Billing Specification](https://www.openiap.dev/docs/apis#alternative-billing)
- [Alternative Billing Example](/docs/examples/alternative-billing)
