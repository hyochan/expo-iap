---
title: Getting Started
sidebar_label: Getting Started
sidebar_position: 1
---

import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# Getting Started

<AdFitTopFixed />

`expo-iap` is a powerful in-app purchase solution specifically designed for Expo and React Native applications. It provides a unified API for handling in-app purchases across iOS and Android platforms with comprehensive error handling and modern TypeScript support.

:::note This library provides the basic features to consume In-App purchases on the client-side, however you'll have to implement the server-side to validate your receipts (which is probably the most time consuming part to do it correctly). :::

## Requirements

- React Native 0.64 or later, or Expo SDK 45 or later
- Node.js 16 or later
- iOS 12+ for iOS apps
- Android API level 21+ for Android apps

## Installation

Install the package using your favorite package manager:

```bash
npm install expo-iap
```

### Expo Managed Workflow

Since in-app purchases require native modules that aren't available in Expo Go, you'll need to use `expo-dev-client` for development builds.

```bash
npx expo install expo-dev-client
npx expo run:ios # or npx expo run:android
```

Learn more about [converting from Expo Go to development builds](https://docs.expo.dev/guides/adopting-prebuild/).

### React Native CLI Projects

For React Native CLI projects, install `expo-modules-core` first:

```bash
npx install-expo-modules@latest
```

Learn more about [installing Expo modules in existing React Native projects](https://docs.expo.dev/bare/installing-expo-modules/).

### iOS Configuration

For iOS projects, you need to configure StoreKit capabilities:

1. Open your iOS project in Xcode
2. Select your target in the project navigator
3. Go to "Signing & Capabilities" tab
4. Click "+" and add "In-App Purchase" capability

### Android Configuration

For Android, ensure your app is configured for Google Play Billing:

1. Open `android/app/build.gradle`
2. Add the billing permission:

```gradle
android {
    defaultConfig {
        // ... other configurations
    }
}

dependencies {
    // ... other dependencies
    implementation 'com.android.billingclient:billing:5.0.0'
}
```

## Quick Start

### 1. Initialize the connection

```tsx
import {useIAP} from 'expo-iap';

export default function App() {
  const {
    connected,
    products,
    purchaseHistory,
    getProducts,
    requestPurchase,
    finishTransaction,
  } = useIAP();

  // Initialize connection when component mounts
  useEffect(() => {
    // Connection is automatically handled by useIAP
  }, []);

  return (
    <View>
      <Text>Connection Status: {connected ? 'Connected' : 'Disconnected'}</Text>
      {/* Your app content */}
    </View>
  );
}
```

### 2. Fetch available products

```tsx
const productIds = [
  'com.example.product1',
  'com.example.product2',
  'com.example.subscription1',
];

useEffect(() => {
  if (connected) {
    getProducts({skus: productIds});
  }
}, [connected, getProducts]);
```

### 3. Request a purchase

**Important**: iOS and Android have different parameter requirements:

```tsx
import {Platform} from 'react-native';

const handlePurchase = async (productId: string) => {
  try {
    if (Platform.OS === 'ios') {
      // iOS: single product purchase
      await requestPurchase({
        request: {sku: productId},
      });
    } else if (Platform.OS === 'android') {
      // Android: array of products (even for single purchase)
      await requestPurchase({
        request: {skus: [productId]},
      });
    }
  } catch (error) {
    console.error('Purchase failed:', error);
  }
};
```

This platform difference exists because iOS can only purchase one product at a time, while Android supports purchasing multiple products in a single transaction.

### 4. Handle purchase updates

The `useIAP` hook automatically handles purchase updates. When a purchase is successful, you should validate the receipt on your server and then finish the transaction.

**Important**: Receipt validation also has platform-specific requirements:

- **iOS**: Only needs the receipt data
- **Android**: Requires `packageName`, `purchaseToken`, and optionally `accessToken`

```tsx
useEffect(() => {
  if (currentPurchase) {
    // Platform-specific validation
    const validateAndFinish = async () => {
      try {
        if (Platform.OS === 'ios') {
          // iOS: Simple validation
          await validateReceiptOnServer({
            receiptData: currentPurchase.transactionReceipt,
            productId: currentPurchase.productId,
          });
        } else if (Platform.OS === 'android') {
          // Android: Check required parameters first
          const purchaseToken = currentPurchase.purchaseTokenAndroid;
          const packageName = currentPurchase.packageNameAndroid;

          if (!purchaseToken || !packageName) {
            throw new Error(
              'Android validation requires packageName and purchaseToken',
            );
          }

          await validateReceiptOnServer({
            packageName,
            purchaseToken,
            productId: currentPurchase.productId,
          });
        }

        // If validation successful, finish the transaction
        await finishTransaction({purchase: currentPurchase});
      } catch (error) {
        console.error('Receipt validation failed:', error);
      }
    };

    validateAndFinish();
  }
}, [currentPurchase, finishTransaction]);
```

## Best Practices

1. **Handle connection lifecycle**: The `useIAP` hook automatically manages the connection lifecycle, but be aware of when your app is connected before making purchase requests.

2. **Test thoroughly**: Test with sandbox accounts and real devices. In-app purchases don't work in simulators/emulators. Use Apple's Sandbox environment and Google Play Console's testing features.

3. **Implement comprehensive error handling**: Handle various purchase scenarios including user cancellation, network errors, and invalid products. See our [error handling guide](./troubleshooting) for common issues and solutions.

4. **Restore purchases properly**: Implement purchase restoration for non-consumable products and subscriptions. This is required by app store guidelines and essential for users who reinstall your app.

5. **Server-side receipt validation is recommended**: For production apps, it's highly recommended to validate receipts on your secure server before granting access to content or features. See [Apple's receipt validation guide](https://developer.apple.com/documentation/storekit/in-app_purchase/validating_receipts_with_the_app_store) and [Google Play's verification guide](https://developer.android.com/google/play/billing/security#verify).

6. **Finish transactions after validation**: Always call `finishTransaction` after successfully validating a purchase on your server. Failing to do so will cause the purchase to remain in a pending state and may trigger repeated purchase prompts.

7. **Check server-side validation libraries**: Consider using open-source libraries like [node-app-store-receipt-verify](https://github.com/ladeiko/node-app-store-receipt-verify) for iOS or [google-play-billing-validator](https://github.com/macklinu/google-play-billing-validator) for Android to simplify server-side validation.

## Next Steps

- Review our [Complete Store Implementation](../examples/complete-impl) for a full, production-ready example
- Learn about the [purchase lifecycle](./lifecycle) and proper state management
- Check out [common troubleshooting tips](./troubleshooting) and solutions
- Explore the [API reference](../api/) for detailed method documentation
