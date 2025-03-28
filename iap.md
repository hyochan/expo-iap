# Expo IAP Documentation

> **Key Feature**: `expo-iap` works seamlessly with Expo's managed workflow—no native code required! This is a major improvement over `react-native-iap`, making it ideal for small teams using Expo SDK.

## Overview

`expo-iap` is an Expo module for handling in-app purchases (IAP) on iOS (StoreKit 2) and Android (Google Play Billing). It supports consumables, non-consumables, and subscriptions. Unlike [`react-native-iap`](https://github.com/hyochan/react-native-iap), which requires native setup, `expo-iap` integrates seamlessly into Expo's [managed workflow](https://docs.expo.dev/archive/managed-vs-bare)—no ejecting needed! However, you’ll need a [development client](https://docs.expo.dev/development/introduction/) instead of Expo Go for full functionality. Starting from version 2.2.8, most features of `react-native-iap` have been ported.

## Installation

`expo-iap` is compatible with [Expo SDK](https://expo.dev) 51+ and supports both managed workflows and React Native CLI projects. Official documentation is in progress for SDK inclusion (see [Expo IAP Documentation](link-to-docs)).

### Add the Package

```bash
npm install expo-iap
```

### Configure with Expo Config Plugin (Managed Workflow Only)

For managed workflows, add `'expo-iap'` to the `plugins` array in your `app.json` or `app.config.js`:

```json
{
  "expo": {
    "plugins": ["expo-iap"]
  }
}
```

This plugin automatically configures Android BILLING permissions and iOS setup, making it plug-and-play with a development client.

## Managed Expo Projects

> **No Native Code Required—Use a Development Client!**  
> Unlike `react-native-iap`, `expo-iap` works in Expo’s managed workflow without native modifications. However, you’ll need a [development client](https://docs.expo.dev/development/introduction/) instead of Expo Go.

1. **Run Your App**  
   After adding the package and configuring the plugin, build a development client and test with:

   ```bash
   expo run:android
   expo run:ios
   ```

2. **Example**  
   Check out a working sample at [example/App.tsx](https://github.com/hyochan/expo-iap/blob/main/example/App.tsx). It demonstrates:
   - Initializing the connection (`initConnection`)
   - Fetching products/subscriptions (`getProducts`, `getSubscriptions`)
   - Handling purchases (`requestPurchase`)
   - Listening for updates/errors (`purchaseUpdatedListener`, `purchaseErrorListener`)

## React Native CLI Projects

For React Native CLI environments, you’ll need to manually configure native settings that the Expo config plugin handles automatically in managed workflows. Follow these steps:

### Prerequisites

Ensure the Expo package is installed:

```bash
npx install-expo-modules@latest
```

Then configure it as described in [Installing Expo Modules](https://docs.expo.dev/bare/installing-expo-modules/).

### iOS Configuration

Run `npx pod-install` to install native dependencies. Update your `ios/Podfile` to set the deployment target to `15.0` or higher (required for StoreKit 2):

```ruby
platform :ios, '15.0'
```

### Android Configuration

Manually apply the following changes:

1. **Update `android/build.gradle`**  
   Add the `supportLibVersion` to the `ext` block:

   ```gradle
   buildscript {
       ext {
           supportLibVersion = "28.0.0"  // Add this line
           // Other existing ext properties...
       }
       // ...
   }
   ```

   If there’s no `ext` block, append it at the end.

2. **Update `android/app/src/main/AndroidManifest.xml`**  
   Add the BILLING permission:

   ```xml
   <manifest ...>
       <uses-permission android:name="com.android.vending.BILLING" />
       <!-- Other manifest content... -->
   </manifest>
   ```

## Current State & Feedback

Updates are in progress to improve reliability and address remaining edge cases. For production apps, test thoroughly. Contributions (docs, code, or bug reports) are welcome—especially detailed error logs or use cases!

## IAP Types

`expo-iap` supports the following In-App Purchase types, aligned with platform-specific APIs (Google Play Billing for Android, StoreKit 2 for iOS).

### Consumable

- **Description**: Items consumed after purchase and repurchasable (e.g., in-game currency, boosts).
- **Behavior**: Requires acknowledgment to enable repurchasing.
- **Platforms**: Supported on Android and iOS.

### Non-Consumable

- **Description**: One-time purchases owned permanently (e.g., ad removal, premium features).
- **Behavior**: Supports restoration; cannot be repurchased.
- **Platforms**: Supported on Android and iOS.

### Subscription

- **Description**: Recurring purchases for ongoing access (e.g., monthly memberships).
- **Behavior**: Includes auto-renewing options and restoration.
- **Platforms**: Supported on Android and iOS.

## Product Type

This section outlines the properties of products supported by `expo-iap`.

### Common Product Types (`BaseProduct`)

| Property       | Type          | Description                |
| -------------- | ------------- | -------------------------- |
| `id`           | `string`      | Unique product identifier  |
| `title`        | `string`      | Product title              |
| `description`  | `string`      | Product description        |
| `type`         | `ProductType` | `inapp` or `subs`          |
| `displayName`  | `string?`     | UI display name (optional) |
| `displayPrice` | `string?`     | Formatted price (optional) |
| `price`        | `number?`     | Price value (optional)     |
| `currency`     | `string?`     | Currency code (optional)   |

### Android-Only Product Types

- **`ProductAndroid`**
  - `name: string`: Product name (replaces `displayName` on Android).
  - `oneTimePurchaseOfferDetails?: OneTimePurchaseOfferDetails`: One-time purchase details.
  - `subscriptionOfferDetails?: SubscriptionOfferDetail[]`: Subscription offer details.
- **`SubscriptionProductAndroid`**
  - `subscriptionOfferDetails: SubscriptionOfferAndroid[]`: Subscription-specific offers.

### iOS-Only Product Types

- **`ProductIos`**
  - `isFamilyShareable: boolean`: Family sharing support.
  - `jsonRepresentation: string`: StoreKit 2 JSON data.
  - `subscription: SubscriptionInfo`: Subscription details.
- **`SubscriptionProductIos`**
  - `discounts?: Discount[]`: Discount details.
  - `introductoryPrice?: string`: Introductory pricing info.

## Purchase Type

This section describes purchase properties in `expo-iap`.

### Common Purchase Types (`ProductPurchase`)

| Property             | Type      | Description               |
| -------------------- | --------- | ------------------------- |
| `id`                 | `string`  | Purchased product ID      |
| `transactionId`      | `string?` | Transaction ID (optional) |
| `transactionDate`    | `number`  | Unix timestamp            |
| `transactionReceipt` | `string`  | Receipt data              |

### Android-Only Purchase Types

- **`ProductPurchase`**:
  - `ids?: string[]`: List of product IDs (multi-item purchases).
  - `dataAndroid?: string`: Raw purchase data from Google Play.
  - `signatureAndroid?: string`: Cryptographic signature.
  - `purchaseStateAndroid?: number`: Purchase state (e.g., 0 = purchased).
- **`SubscriptionPurchase`**:
  - `autoRenewingAndroid?: boolean`: Indicates auto-renewal status.
- **`purchaseTokenAndroid?`**: Unique identifier for tracking/verifying purchases.

### iOS-Only Purchase Types

- **`ProductPurchase`**:
  - `quantityIos?: number`: Quantity purchased.
  - `expirationDateIos?: number`: Expiration timestamp (optional).
  - `subscriptionGroupIdIos?: string`: Subscription group ID (optional).
- **`SubscriptionPurchase`**:
  - Extends `ProductPurchase` with subscription-specific fields like `expirationDateIos`.

## Implementation Notes

### Platform-Uniform Purchase Handling

Transactions map to `Purchase` or `SubscriptionPurchase` with platform-specific fields (e.g., `expirationDateIos`, `purchaseStateAndroid`).

> **Sample Code**: See [example/App.tsx](https://github.com/hyochan/expo-iap/blob/main/example/App.tsx).

## Implementation

Below is a simple example of fetching products and making a purchase with `expo-iap` in a managed workflow, updated to use the new `requestPurchase` signature:

```tsx
import { useEffect, useState } from 'react';
import { Button, Text, View } from 'react-native';
import {
  initConnection,
  endConnection,
  getProducts,
  requestPurchase,
  purchaseUpdatedListener,
  finishTransaction,
} from 'expo-iap';

export default function SimpleIAP() {
  const [isConnected, setIsConnected] = useState(false);
  const [product, setProduct] = useState(null);

  // Initialize IAP and fetch products
  useEffect(() => {
    const setupIAP = async () => {
      if (await initConnection()) {
        setIsConnected(true);
        const products = await getProducts(['my.consumable.item']); // Replace with your SKU
        if (products.length > 0) setProduct(products[0]);
      }
    };
    setupIAP();

    const purchaseListener = purchaseUpdatedListener(async (purchase) => {
      if (purchase) {
        await finishTransaction({ purchase, isConsumable: true });
        alert('Purchase completed!');
      }
    });

    return () => {
      purchaseListener.remove();
      endConnection();
    };
  }, []);

  // Trigger a purchase
  const buyItem = async () => {
    if (!product) return;
    await requestPurchase({
      request: { skus: [product.id] }, // Android expects 'skus'; iOS would use 'sku'
    });
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>{isConnected ? 'Connected' : 'Connecting...'}</Text>
      {product ? (
        <>
          <Text>{`${product.title} - ${product.displayPrice}`}</Text>
          <Button title="Buy Now" onPress={buyItem} />
        </>
      ) : (
        <Text>Loading product...</Text>
      )}
    </View>
  );
}
```

## Using useIAP Hook

The `useIAP` hook simplifies managing in-app purchases. Below is an example updated to use the new `requestPurchase` signature:

```tsx
import { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Button,
  InteractionManager,
  Alert,
} from 'react-native';
import { useIAP } from 'expo-iap';
import type { ProductPurchase, SubscriptionProduct } from 'expo-iap';

// Define SKUs
const productSkus = ['cpk.points.1000', 'cpk.points.5000', 'cpk.points.10000', 'cpk.points.30000'];
const subscriptionSkus = ['cpk.membership.monthly.bronze', 'cpk.membership.monthly.silver'];

// Define operations
const operations = ['getProducts', 'getSubscriptions'] as const;
type Operation = (typeof operations)[number];

export default function IAPWithHook() {
  const {
    connected,
    products,
    subscriptions,
    currentPurchase,
    currentPurchaseError,
    getProducts,
    getSubscriptions,
    finishTransaction,
    requestPurchase,
  } = useIAP();

  const [isReady, setIsReady] = useState(false);

  // Fetch products and subscriptions only when connected
  useEffect(() => {
    if (!connected) return;

    const initializeIAP = async () => {
      try {
        await Promise.all([getProducts(productSkus), getSubscriptions(subscriptionSkus)]);
        setIsReady(true);
      } catch (error) {
        console.error('Error initializing IAP:', error);
      }
    };
    initializeIAP();
  }, [connected, getProducts, getSubscriptions]);

  // Handle purchase updates and errors
  useEffect(() => {
    if (currentPurchase) {
      InteractionManager.runAfterInteractions(async () => {
        try {
          await finishTransaction({
            purchase: currentPurchase,
            isConsumable: currentPurchase.productType === 'inapp',
          });
          Alert.alert('Purchase Successful', JSON.stringify(currentPurchase));
        } catch (error) {
          console.error('Error finishing transaction:', error);
          Alert.alert('Transaction Error', String(error));
        }
      });
    }

    if (currentPurchaseError) {
      InteractionManager.runAfterInteractions(() => {
        Alert.alert('Purchase Error', JSON.stringify(currentPurchaseError));
      });
    }
  }, [currentPurchase, currentPurchaseError, finishTransaction]);

  // Handle operation buttons
  const handleOperation = async (operation: Operation) => {
    if (!connected) {
      Alert.alert('Not Connected', 'Please wait for IAP to connect.');
      return;
    }

    try {
      switch (operation) {
        case 'getProducts':
          await getProducts(productSkus);
          break;
        case 'getSubscriptions':
          await getSubscriptions(subscriptionSkus);
          break;
      }
    } catch (error) {
      console.error(`Error in ${operation}:`, error);
    }
  };

  if (!connected) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Connecting to IAP...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Expo IAP with useIAP Hook</Text>
      <View style={styles.buttons}>
        <ScrollView contentContainerStyle={styles.buttonsWrapper} horizontal>
          {operations.map((operation) => (
            <Pressable key={operation} onPress={() => handleOperation(operation)}>
              <View style={styles.buttonView}>
                <Text>{operation}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <View style={styles.content}>
        {!isReady ? (
          <Text>Loading...</Text>
        ) : (
          <View style={{ gap: 12 }}>
            <Text style={{ fontSize: 20 }}>Products</Text>
            {products.map((item) => (
              <View key={item.id} style={{ gap: 12 }}>
                <Text>
                  {item.title} -{' '}
                  {item.platform === 'android'
                    ? item.oneTimePurchaseOfferDetails?.formattedPrice
                    : item.displayPrice}
                </Text>
                <Button
                  title="Buy"
                  onPress={() =>
                    requestPurchase({
                      request: item.platform === 'android' ? { skus: [item.id] } : { sku: item.id },
                    })
                  }
                />
              </View>
            ))}

            <Text style={{ fontSize: 20 }}>Subscriptions</Text>
            {subscriptions.map((item) => (
              <View key={item.id} style={{ gap: 12 }}>
                <Text>
                  {item.title || item.displayName} -{' '}
                  {item.platform === 'android' && item.subscriptionOfferDetails
                    ? item.subscriptionOfferDetails[0]?.pricingPhases.pricingPhaseList[0].formattedPrice
                    : item.displayPrice}
                </Text>
                <Button
                  title="Subscribe"
                  onPress={() =>
                    requestPurchase({
                      request:
                        item.platform === 'android'
                          ? {
                              skus: [item.id],
                              subscriptionOffers:
                                item.subscriptionOfferDetails?.map((offer) => ({
                                  sku: item.id,
                                  offerToken: offer.offerToken,
                                })) || [],
                            }
                          : { sku: item.id },
                      type: 'subs',
                    })
                  }
                />
              </View>
            ))}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  title: {
    marginTop: 24,
    fontSize: 20,
    fontWeight: 'bold',
  },
  buttons: {
    height: 90,
  },
  buttonsWrapper: {
    padding: 24,
    gap: 8,
  },
  buttonView: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#000',
    padding: 8,
  },
  content: {
    flex: 1,
    alignSelf: 'stretch',
    padding: 24,
    gap: 12,
  },
});
```
