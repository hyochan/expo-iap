---
title: Purchase Flow Example
sidebar_label: Purchase Flow
sidebar_position: 1
---

import IapKitBanner from "@site/src/uis/IapKitBanner";
import IapKitLink from "@site/src/uis/IapKitLink";

# Purchase Flow

<IapKitBanner />

:::tip What you'll build
This example walks through a clean purchase flow using expo-iap with the `useIAP` hook and the new platform‑specific request shape. It mirrors the working sample in `example/app/purchase-flow.tsx`.
:::

View the full example source:

- GitHub: [example/app/purchase-flow.tsx](https://github.com/hyochan/expo-iap/blob/main/example/app/purchase-flow.tsx)

## Flow Overview

- Initialize: `useIAP` manages the store connection lifecycle

- Load products:

  `fetchProducts({ skus, type: 'in-app' })`

- Start purchase:

  `requestPurchase({ request: { apple: { sku }, google: { skus: [sku] } }, type: 'in-app' })`

- Receive callbacks: `onPurchaseSuccess` / `onPurchaseError` (from `useIAP`)

- Validate server‑side: send receipt/JWS or token to your backend

- Finish transaction:

  `finishTransaction({ purchase, isConsumable })`

```txt
Connect → Fetch Products → Request Purchase → Server Validate → Finish Transaction
```

## Key Concepts

### 1. Connection Management

- `useIAP` automatically opens/closes the connection
- Exposes `connected`, convenient for showing loading states

### 2. Product Loading

- Load in‑app products or subscriptions (set `type`)
- Handle and log failed product fetches

### 3. Purchase Flow

- Start purchases via unified request shape (no `Platform.OS` branching)
- Use `onPurchaseSuccess`/`onPurchaseError` from `useIAP`
- Always call `finishTransaction` after server validation

### 4. Purchase Verification

- Perform verification on your backend (never only on device)
- iOS: verify the JWS token; Android: verify purchase token + package name

### 5. User Experience

- Provide clear states for loading, success, and error
- Show subscription management/deep‑links when appropriate

## Platform Differences

### Purchase Request Parameters

Use the modern, platform‑specific request container (v2.7.0+). This avoids manual `Platform.OS` checks:

```tsx
await requestPurchase({
  request: {
    apple: {sku: productId, quantity: 1},
    google: {skus: [productId]},
  },
  type: 'in-app',
});
```

Notes:

- Keep `andDangerouslyFinishTransactionAutomatically` off (default) to validate first.

### Key iOS Options

- `appAccountToken`: set per user to correlate receipts on your backend
- `quantity`: purchase quantity for iOS (consumables)

### Purchase Object Properties

Purchase objects have different properties on iOS and Android. When accessing platform-specific properties, TypeScript type casting is required:

```tsx
// Unified fields
const token = purchase.purchaseToken; // iOS JWS or Android token

// Android-only helpers
// const pkg = (purchase as PurchaseAndroid).packageNameAndroid;
```

### Purchase Verification

Purchase verification (aka receipt validation) requires different approaches:

- iOS: verify JWS token on your server against Apple
- Android: verify token and package name against Google Play Developer API

## Usage

```tsx
import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import PurchaseFlow from './purchase-flow';

export default function App() {
  return (
    <NavigationContainer>
      <PurchaseFlow />
    </NavigationContainer>
  );
}
```

## Customization

You can customize this example by:

1. **Styling**: Modify the `styles` object to match your app's design
2. **Product IDs**: Update `PRODUCT_IDS` with your actual product IDs
3. **Validation**: Implement proper server-side purchase verification
4. **Error Handling**: Add more specific error handling for your use case
5. **Features**: Add features like purchase restoration, subscription management, etc.

## IAPKit Server Verification

<IapKitLink>IAPKit</IapKitLink> is a server-side receipt verification service that simplifies purchase validation. The example app includes built-in support for IAPKit verification.

### Setup

1. **Get your API key** from <IapKitLink>IAPKit Dashboard</IapKitLink>

2. **Configure your API key** via the expo-iap config plugin:

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

3. **Select IAPKit verification** in the example app by tapping the "Purchase Verification" button and selecting "☁️ IAPKit (Server)"

### How It Works

When IAPKit verification is enabled, after a successful purchase:

```tsx
import {useIAP, type VerifyPurchaseWithProviderProps} from 'expo-iap';
import {Alert} from 'react-native';

// Note: apiKey is automatically injected from config plugin (iapkitApiKey)
// No need to manually pass it - expo-iap reads it from Constants.expoConfig.extra.iapkitApiKey

function PurchaseWithIAPKit() {
  const {verifyPurchaseWithProvider, finishTransaction} = useIAP({
    onPurchaseSuccess: async (purchase) => {
      const jwsOrToken = purchase.purchaseToken ?? '';

      // apiKey is auto-filled from config plugin - no need to specify it
      const verifyRequest: VerifyPurchaseWithProviderProps = {
        provider: 'iapkit',
        iapkit: {
          apple: {
            jws: jwsOrToken, // iOS: JWS token from StoreKit 2
          },
          google: {
            purchaseToken: jwsOrToken, // Android: purchase token
          },
        },
      };

      try {
        const result = await verifyPurchaseWithProvider(verifyRequest);

        if (result.iapkit) {
          const iapkitResult = result.iapkit;

          if (iapkitResult.isValid) {
            // Purchase is valid - grant entitlements
            console.log('Purchase verified:', iapkitResult.state);

            await finishTransaction({
              purchase,
              isConsumable: true, // or false for non-consumables
            });

            Alert.alert('Success', 'Purchase verified and completed!');
          } else {
            Alert.alert(
              'Verification Failed',
              'Purchase could not be verified',
            );
          }
        }
      } catch (error) {
        console.error('IAPKit verification failed:', error);
      }
    },
  });

  // ... rest of component
}
```

### Verification Response

IAPKit returns a standardized response:

```typescript
import type {IapkitPurchaseState, IapkitStore} from 'expo-iap';

export interface RequestVerifyPurchaseWithIapkitResult {
  /** Whether the purchase is valid (not falsified). */
  isValid: boolean;
  /** The current state of the purchase. */
  state: IapkitPurchaseState;
  store: IapkitStore;
}

// Available states:
type IapkitPurchaseState =
  | 'entitled'
  | 'pending-acknowledgment'
  | 'pending'
  | 'canceled'
  | 'expired'
  | 'ready-to-consume'
  | 'consumed'
  | 'unknown'
  | 'inauthentic';

// Available stores:
type IapkitStore = 'apple' | 'google';
```

### Verification Methods

The example app supports three verification methods:

| Method | Description | Use Case |
| --- | --- | --- |
| **None (Skip)** | Skip verification | Testing/Development |
| **Local (Device)** | Verify with Apple/Google directly | Simple validation |
| **IAPKit (Server)** | Server-side verification via IAPKit | Production recommended |

### Benefits of IAPKit

- **Unified API**: Same verification flow for iOS and Android
- **Server-side validation**: More secure than client-only validation
- **Fraud detection**: Built-in fraud prevention
- **Webhook support**: Real-time purchase notifications
- **Dashboard**: Monitor purchases and analytics

For more information, visit <IapKitLink path="/docs">IAPKit Documentation</IapKitLink>.

## Next Steps

- Implement proper [purchase verification](../guides/purchases#purchase-verification)
- Add [purchase restoration](../guides/purchases#purchase-restoration)
- Handle [subscription management](../api/methods/core-methods#deeplinktosubscriptions)
- Add comprehensive [error handling](../api/error-handling)
