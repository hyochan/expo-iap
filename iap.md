# Expo IAP Documentation

> **Key Feature**: `expo-iap` works seamlessly with Expo's managed workflow—no native code required! This is a major improvement over `react-native-iap`, making it ideal for small teams using Expo SDK.

## Overview

`expo-iap` is an Expo module for handling in-app purchases (IAP) on iOS (StoreKit 2) and Android (Google Play Billing). It supports consumables, non-consumables, and subscriptions. Unlike [`react-native-iap`](https://github.com/hyochan/react-native-iap), which requires native setup, `expo-iap` integrates seamlessly into Expo's managed workflow! However, you’ll need a [development client](https://docs.expo.dev/development/introduction/) instead of Expo Go for full functionality. Starting from version 2.2.8, most features of `react-native-iap` have been ported.

## Installation

`expo-iap` is compatible with [Expo SDK](https://expo.dev) 51+ and supports both managed workflows and React Native CLI projects. Official documentation is in progress for SDK inclusion (see [Expo IAP Documentation](https://github.com/hyochan/expo-iap/blob/main/iap.md#expo-iap-documentation)).

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
import {useEffect, useState} from 'react';
import {Button, Text, View} from 'react-native';
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
        await finishTransaction({purchase, isConsumable: true});
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
      request: {skus: [product.id]}, // Android expects 'skus'; iOS would use 'sku'
    });
  };

  return (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
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

## Using `useIAP` Hook

The `useIAP` hook from `expo-iap` lets you manage in-app purchases in functional React components. This example reflects a **real-world production use case** with:

- Consumable & subscription support
- Purchase lifecycle management
- Platform-specific `requestPurchase` formats
- UX alerts and loading states
- Optional receipt validation before finishing the transaction

### 🧭 Flow Overview

| Step | Description |
| --- | --- |
| 1️⃣ | Wait for `connected === true` before fetching products and subscriptions |
| 2️⃣ | Render UI with products/subscriptions dynamically from store |
| 3️⃣ | Trigger purchases via `requestPurchase()` (with Android/iOS handling) |
| 4️⃣ | When `currentPurchase` updates, validate & finish the transaction |
| 5️⃣ | Handle `currentPurchaseError` for graceful UX |

### ✅ Realistic Example with `useIAP`

```tsx
import {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  Button,
  Alert,
  Platform,
  InteractionManager,
} from 'react-native';
import {useIAP} from 'expo-iap';
import type {
  ProductAndroid,
  ProductPurchaseAndroid,
} from 'expo-iap/build/types/ExpoIapAndroid.types';

const productSkus = ['dev.hyo.luent.10bulbs', 'dev.hyo.luent.30bulbs'];
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

  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 1️⃣ Initialize products & subscriptions
  useEffect(() => {
    if (!connected) return;

    const loadStoreItems = async () => {
      try {
        await getProducts(productSkus);
        await getSubscriptions(subscriptionSkus);
        setIsReady(true);
      } catch (e) {
        console.error('IAP init error:', e);
      }
    };

    loadStoreItems();
  }, [connected]);

  // 2️⃣ Purchase handler when currentPurchase updates
  useEffect(() => {
    if (!currentPurchase) return;

    const handlePurchase = async () => {
      try {
        setIsLoading(true);

        const productId = currentPurchase.id;
        const isConsumable = productSkus.includes(productId);

        // ✅ Optionally validate receipt before finishing
        let isValid = true;
        if (Platform.OS === 'ios') {
          const result = await validateReceipt(productId);
          isValid = result?.isValid ?? true;
        } else if (Platform.OS === 'android') {
          const token = (currentPurchase as ProductPurchaseAndroid)
            .purchaseTokenAndroid;
          const packageName = 'your.android.package.name';

          const result = await validateReceipt(productId, {
            productToken: token,
            packageName,
            isSub: subscriptionSkus.includes(productId),
          });
          isValid = result?.isValid ?? true;
        }

        if (!isValid) {
          Alert.alert('Invalid purchase', 'Receipt validation failed');
          return;
        }

        // 🧾 Finish transaction (important!)
        await finishTransaction({
          purchase: currentPurchase,
          isConsumable,
        });

        // ✅ Grant item or unlock feature
        Alert.alert(
          'Thank you!',
          isConsumable
            ? 'Bulbs added to your account!'
            : 'Premium subscription activated.',
        );
      } catch (err) {
        console.error('Finish transaction error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    handlePurchase();
  }, [currentPurchase]);

  // 3️⃣ Error handling
  useEffect(() => {
    if (currentPurchaseError) {
      InteractionManager.runAfterInteractions(() => {
        Alert.alert('Purchase error', currentPurchaseError.message);
      });
      setIsLoading(false);
    }
  }, [currentPurchaseError]);

  // 4️⃣ Purchase trigger
  const handleBuy = useCallback(
    async (productId: string, type?: 'subs') => {
      try {
        setIsLoading(true);

        if (Platform.OS === 'ios') {
          await requestPurchase({
            request: {sku: productId},
            type,
          });
        } else {
          const request: any = {skus: [productId]};

          if (type === 'subs') {
            const sub = subscriptions.find(
              (s) => s.id === productId,
            ) as ProductAndroid;
            const offers =
              sub?.subscriptionOfferDetails?.map((offer) => ({
                sku: productId,
                offerToken: offer.offerToken,
              })) || [];

            request.subscriptionOffers = offers;
          }

          await requestPurchase({request, type});
        }
      } catch (err) {
        console.error('Purchase request failed:', err);
        Alert.alert(
          'Error',
          err instanceof Error ? err.message : 'Purchase failed',
        );
        setIsLoading(false);
      }
    },
    [subscriptions],
  );

  if (!connected) return <Text>Connecting to store...</Text>;
  if (!isReady) return <Text>Loading products...</Text>;

  return (
    <ScrollView contentContainerStyle={{padding: 20}}>
      <Text style={{fontSize: 18, fontWeight: 'bold'}}>💡 Bulb Packs</Text>
      {products.map((p) => (
        <View key={p.id} style={{marginVertical: 10}}>
          <Text>
            {p.title} - {p.displayPrice}
          </Text>
          <Button
            title={isLoading ? 'Processing...' : 'Buy'}
            onPress={() => handleBuy(p.id)}
            disabled={isLoading}
          />
        </View>
      ))}

      <Text style={{fontSize: 18, fontWeight: 'bold', marginTop: 30}}>
        ⭐ Subscription
      </Text>
      {subscriptions.map((s) => (
        <View key={s.id} style={{marginVertical: 10}}>
          <Text>
            {s.title} - {s.displayPrice}
          </Text>
          <Button
            title={isLoading ? 'Processing...' : 'Subscribe'}
            onPress={() => handleBuy(s.id, 'subs')}
            disabled={isLoading}
          />
        </View>
      ))}
    </ScrollView>
  );
}
```

---

물론입니다. 아래는 보다 자연스럽고 요약된 느낌으로 다듬은 영어 버전입니다:

---

### 🔎 Key Benefits of This Approach

- ✅ Supports **both Android and iOS**, with platform-aware purchase handling
- ✅ Covers **both consumable items and subscriptions**
- ✅ Includes a **receipt validation flow** using `validateReceipt` (server-ready)
- ✅ Handles iOS cases where **auto-finishing transactions is disabled**
- ✅ Provides **user-friendly error and loading state management**
