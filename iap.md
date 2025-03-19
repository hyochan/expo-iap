# Expo IAP Documentation

> **Key Feature**: `expo-iap` works seamlessly with Expo's managed workflow—no bare setup or native code required! This is a major improvement over `react-native-iap`, making it ideal for small teams using Expo SDK.

## Overview

`expo-iap` is an Expo module for handling in-app purchases (IAP) on iOS (StoreKit 2) and Android (Google Play Billing). It supports consumables, non-consumables, and subscriptions. While it’s functional in managed workflows, it’s still under active development—test thoroughly before deploying to production. For a fully stable alternative, consider RevenueCat.

## Installation in Managed Expo Projects

For [managed](https://docs.expo.dev/archive/managed-vs-bare/) Expo projects, add `expo-iap` and configure it via the Expo config plugin. It’s compatible with Expo SDK 51+ (check the [API documentation](#api-documentation) for official inclusion). If no documentation is available, it’s awaiting a future SDK release.

### Steps

1. **Add the Package**

   ```bash
   npm install expo-iap
   ```

2. **Configure with Expo Config Plugin** Add `'expo-iap'` to the `plugins` array in your `app.json` or `app.config.js`:

   ```json
   {
     "expo": {
       "plugins": ["expo-iap"]
     }
   }
   ```

   This automatically configures Android BILLING permissions and iOS setup.

3. **Run Your App** Use `expo run:android` or `expo run:ios` to build and test.

> **Example**: See a working sample at [example/App.tsx](https://github.com/hyochan/expo-iap/blob/main/example/App.tsx).

## Installation in Bare React Native Projects

For bare projects, ensure the [`expo` package is installed and configured](https://docs.expo.dev/bare/installing-expo-modules/).

### Add the Package

```bash
npm install expo-iap
```

### Configure for iOS

Run `npx pod-install`. Set `deploymentTarget` to `15.0` or higher (StoreKit 2 requirement):

```json
"ios": {
  "deploymentTarget": "15.0"
}
```

### Configure for Android

No additional configuration is needed—Google Play Billing is handled internally.

### Configure with Expo Config Plugin

Add 'expo-iap' to the plugins array in your app.json or app.config.js file:

```json
{
  "expo": {
    "plugins": ["expo-iap"]
  }
}
```

This plugin automatically sets up the necessary Android configuration, including adding the BILLING permission to your AndroidManifest.xml.

## IAP Types

`expo-iap` supports the following In-App Purchase types, aligned with platform-specific APIs (Google Play Billing for Android, StoreKit2 for iOS).

### Consumable

- **Description**: Items that are consumed after purchase and can be repurchased (e.g., in-game currency, boosts).
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
  - `displayPrice: string`: Formatted price.
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
  - Adds the following properties specific to in-app product purchases:
    - **`ids`**: `string[]` - A list of product IDs associated with the purchase (for multi-item purchases).
    - **`dataAndroid`**: `string` - The raw purchase data from Google Play (e.g., JSON payload).
    - **`signatureAndroid`**: `string` - The cryptographic signature from Google Play to verify the purchase's authenticity.
    - **`purchaseStateAndroid`**: `number` - The state of the purchase (e.g., 0 = purchased, 1 = canceled, 2 = pending).

- **`SubscriptionPurchase`**:
  - Extends the base properties and includes:
    - **`autoRenewingAndroid`**: `boolean` - Indicates whether the subscription automatically renews (true) or not (false).

- **`purchaseTokenAndroid`**:
  - **Description**: A unique identifier provided by Google Play for each purchase, used to track, verify, and manage the transaction. For example, it is required to "consume" a consumable product (e.g., in-game coins) or query purchase details via the Google Play Developer API.

### iOS-Only Purchase Types

- **`ProductPurchase`**:
  - Extends the base purchase properties with iOS-specific fields:
    - **`quantityIos`**: `number` - The quantity of the product purchased (e.g., how many units of an item were bought).
    - **`expirationDateIos`**: `number?` - The expiration date of the purchase as a Unix timestamp (in milliseconds), if applicable (optional, may be null for non-expiring products).
    - **`subscriptionGroupIdIos`**: `string?` - The identifier of the subscription group this product belongs to, used for managing related subscriptions in the App Store (optional, may be null for non-subscription products).

- **`SubscriptionPurchase`**:
  - Extends the base purchase properties with iOS-specific subscription handling:
    - Includes all fields from `ProductPurchase` where applicable, plus additional subscription-specific logic.
    - May include fields like:
      - **`expirationDateIos`**: `number?` - The date and time when the subscription expires, represented as a Unix timestamp (in milliseconds), unless auto-renewed.
      - **`autoRenewingIos`**: `boolean` - Indicates whether the subscription is set to automatically renew (true) or not (false).
    - Handles subscription-specific features such as renewals, grace periods, and App Store receipt validation.

## Implementation Notes

### Platform-Uniform Purchase Handling

Transactions are mapped directly to `Purchase` or `SubscriptionPurchase` with platform-specific fields (e.g., `expirationDateIos`, `purchaseStateAndroid`).

### Status

This module is under development—expect occasional bugs (e.g., Android acknowledgment issues). Test thoroughly and consider contributing fixes!

> **Sample Code**: See [example/App.tsx](https://github.com/hyochan/expo-iap/blob/main/example/App.tsx).

## Implementation

Below is a simple example of fetching products and making a purchase with `expo-iap` in a managed workflow:

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
        const products = await getProducts(['my.consumable.item']); // Replace with your product SKU
        if (products.length > 0) setProduct(products[0]);
      }
    };
    setupIAP();

    // Handle purchase updates
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
    await requestPurchase({skus: [product.id]});
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

## Using useIAP Hook

The `useIAP` hook simplifies managing in-app purchases with `expo-iap`. Below is an example that fetches products and subscriptions, and allows purchasing them, styled similarly to the `expo-iap` example app. It assumes you’ve implemented the custom `useIAP` hook in your project.

```tsx
import {useEffect, useState} from 'react';
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
import {useIap} from 'expo-iap';
import type {
  PurchaseError,
  ProductPurchase,
  SubscriptionProduct,
} from 'expo-iap';
import {RequestSubscriptionAndroidProps} from './types/ExpoIapAndroid.types'; // Adjust path as needed

// Define SKUs
const productSkus = [
  'cpk.points.1000',
  'cpk.points.5000',
  'cpk.points.10000',
  'cpk.points.30000',
];

const subscriptionSkus = [
  'cpk.membership.monthly.bronze',
  'cpk.membership.monthly.silver',
];

// Define operations
const operations = [
  'initConnection',
  'getProducts',
  'getSubscriptions',
  'endConnection',
];
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
    requestSubscription,
  } = useIAP();

  const [isConnected, setIsConnected] = useState(connected);

  // Handle operations
  const handleOperation = async (operation: Operation) => {
    switch (operation) {
      case 'initConnection':
        setIsConnected(true); // Connection is handled by useIAP hook
        break;
      case 'endConnection':
        setIsConnected(false); // Cleanup is handled by useIAP hook
        break;
      case 'getProducts':
        try {
          await getProducts(productSkus);
        } catch (error) {
          console.error('Error fetching products:', error);
        }
        break;
      case 'getSubscriptions':
        try {
          await getSubscriptions(subscriptionSkus);
        } catch (error) {
          console.error('Error fetching subscriptions:', error);
        }
        break;
      default:
        console.log('Unknown operation');
    }
  };

  // Handle purchase updates and errors
  useEffect(() => {
    if (currentPurchase) {
      InteractionManager.runAfterInteractions(async () => {
        try {
          await finishTransaction({
            purchase: currentPurchase,
            isConsumable: true,
          });
          Alert.alert('Purchase updated', JSON.stringify(currentPurchase));
        } catch (error) {
          console.error('Error finishing transaction:', error);
        }
      });
    }

    if (currentPurchaseError) {
      InteractionManager.runAfterInteractions(() => {
        Alert.alert('Purchase error', JSON.stringify(currentPurchaseError));
      });
    }
  }, [currentPurchase, currentPurchaseError, finishTransaction]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Expo IAP with useIAP Hook</Text>
      <View style={styles.buttons}>
        <ScrollView contentContainerStyle={styles.buttonsWrapper} horizontal>
          {operations.map((operation) => (
            <Pressable
              key={operation}
              onPress={() => handleOperation(operation)}
            >
              <View style={styles.buttonView}>
                <Text>{operation}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <View style={styles.content}>
        {!isConnected ? (
          <Text>Not connected</Text>
        ) : (
          <View style={{gap: 12}}>
            <Text style={{fontSize: 20}}>Products</Text>
            {products.map((item) => {
              if (item.platform === 'android') {
                return (
                  <View key={item.title} style={{gap: 12}}>
                    <Text>
                      {item.title} -{' '}
                      {item.oneTimePurchaseOfferDetails?.formattedPrice}
                    </Text>
                    <Button
                      title="Buy"
                      onPress={() => requestPurchase({skus: [item.id]})}
                    />
                  </View>
                );
              }
              if (item.platform === 'ios') {
                return (
                  <View key={item.id} style={{gap: 12}}>
                    <Text>
                      {item.title} - {item.displayPrice}
                    </Text>
                    <Button
                      title="Buy"
                      onPress={() => requestPurchase({sku: item.id})}
                    />
                  </View>
                );
              }
            })}

            <Text style={{fontSize: 20}}>Subscriptions</Text>
            {subscriptions.map((item) => {
              if (item.platform === 'android') {
                return item.subscriptionOfferDetails?.map((offer) => (
                  <View key={offer.offerId} style={{gap: 12}}>
                    <Text>
                      {item.title} -{' '}
                      {offer.pricingPhases.pricingPhaseList
                        .map((ppl) => ppl.billingPeriod)
                        .join(',')}
                    </Text>
                    <Button
                      title="Subscribe"
                      onPress={() =>
                        requestSubscription({
                          skus: [item.id],
                          ...(offer.offerToken && {
                            subscriptionOffers: [
                              {sku: item.id, offerToken: offer.offerToken},
                            ],
                          }),
                        } as RequestSubscriptionAndroidProps)
                      }
                    />
                  </View>
                ));
              }
              if (item.platform === 'ios') {
                return (
                  <View key={item.id} style={{gap: 12}}>
                    <Text>
                      {item.displayName} - {item.displayPrice}
                    </Text>
                    <Button
                      title="Subscribe"
                      onPress={() => requestSubscription({sku: item.id})}
                    />
                  </View>
                );
              }
            })}
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
