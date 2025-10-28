---
sidebar_position: 2
---

import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# Onside

<AdFitTopFixed />

This guide covers setting up expo-iap for Onside, an alternative iOS app marketplace available in the European Union.

:::info EU Alternative App Marketplace Onside is an official alternative app marketplace for iOS devices, available exclusively in the European Union. It enables developers to distribute apps outside the traditional Apple App Store while maintaining a familiar user experience. :::

:::tip Optional Integration Onside integration is **completely optional**. The `expo-onside` package is not a required dependency of `expo-iap`. Your app will work perfectly fine without it - Onside support is only needed if you want to distribute your app through the Onside marketplace. :::

## What is Onside?

[Onside](https://onside.io) is an alternative iOS app marketplace that provides:

- **EU-wide Distribution**: Distribute your apps to iOS users across the European Union
- **Alternative to App Store**: Offer apps through a different marketplace while maintaining quality and security
- **Familiar APIs**: Use StoreKit-compatible APIs for seamless in-app purchase integration
- **Competitive Pricing**: Potentially better revenue sharing and pricing flexibility
- **Security Guarantee**: All apps undergo moderation and security checks

## Prerequisites

Before setting up Onside with expo-iap, you need to:

1. Register as a developer with Onside
2. Submit and configure your app in the Onside dashboard
3. Set up your in-app products in Onside's system
4. Obtain necessary credentials and configuration

**System Requirements**:

- iOS 17.6 or later
- App distributed through Onside marketplace
- Apple ID set to an EU country (for users)

For detailed setup instructions and registration, please visit [Onside's official website](https://onside.io).

## Configuration

### 1. Install expo-onside

First, install the `expo-onside` package:

```bash
bun add expo-onside
# or
npm install expo-onside
# or
yarn add expo-onside
```

### 2. Enable Onside Module

Add the Onside configuration to your app.config.ts (or app.json):

```typescript
export default {
  expo: {
    // ... other config
    plugins: [
      [
        'expo-iap',
        {
          modules: {
            onside: true, // Enable Onside support
          },
        },
      ],
    ],
  },
};
```

When you enable `modules.onside: true`, the expo-iap config plugin will:

- Detect if `expo-onside` is installed
- Automatically add `expo-onside` to your package.json if missing
- Display installation instructions in the console

### 3. Install Dependencies

If expo-onside was automatically added to package.json, install it:

```bash
bun install
# or
npm install
# or
yarn install
```

### 4. Rebuild Your App

After adding the configuration and installing dependencies, rebuild your iOS project:

```bash
npx expo prebuild --clean --platform ios
```

This will configure your iOS project with Onside module support.

## Runtime Detection

expo-iap provides a helper function to detect if your app was installed from the Onside store:

```typescript
import {checkInstalledFromOnside} from 'expo-iap';

// Check if app was installed from Onside
const isFromOnside = checkInstalledFromOnside();

if (isFromOnside) {
  console.log('App installed from Onside store');
} else {
  console.log('App installed from App Store');
}
```

This function:

- Returns `true` if the app was installed from Onside
- Returns `false` if expo-onside is not installed (graceful fallback)
- Returns `false` if the app was installed from the regular App Store

### Usage Example

```typescript
import React, {useEffect, useState} from 'react';
import {checkInstalledFromOnside} from 'expo-iap';

function MyComponent() {
  const [installSource, setInstallSource] = useState<string>('');

  useEffect(() => {
    const isFromOnside = checkInstalledFromOnside();
    setInstallSource(isFromOnside ? 'Onside' : 'App Store');
  }, []);

  return (
    <View>
      <Text>Install Source: {installSource}</Text>
    </View>
  );
}
```

## Purchase Flow

Once configured, expo-iap automatically uses the appropriate payment provider:

- If installed from **Onside**: Uses Onside payment system
- If installed from **App Store**: Uses StoreKit

The API remains the same regardless of the payment provider:

```typescript
import {useIAP} from 'expo-iap';

function PurchaseScreen() {
  const {requestPurchase} = useIAP({
    onPurchaseSuccess: (purchase) => {
      console.log('Purchase successful:', purchase);
    },
    onPurchaseError: (error) => {
      console.error('Purchase failed:', error);
    },
  });

  const handlePurchase = () => {
    requestPurchase({
      request: {
        ios: {
          sku: 'com.example.product',
          quantity: 1,
        },
      },
      type: 'in-app',
    });
  };

  return <Button title="Purchase" onPress={handlePurchase} />;
}
```

## Important Notes

### Optional Dependency

`expo-onside` is an **optional dependency**. Your app will:

- Build and run normally without expo-onside installed
- Automatically fall back to StoreKit if expo-onside is not available
- Use Onside payment system only when:
  1. `expo-onside` package is installed
  2. `modules.onside: true` is set in app.config
  3. App is installed from Onside store

### No Hard Dependency

Unlike typical dependencies, expo-iap:

- Does NOT require expo-onside to be installed
- Uses dynamic require to check for expo-onside at runtime
- Gracefully handles cases where expo-onside is not available

This approach allows you to:

- Build apps without Onside support by simply not installing expo-onside
- Add Onside support later without changing your purchase code
- Maintain a single codebase for both App Store and Onside distributions

## Troubleshooting

### expo-onside not automatically added

If the config plugin doesn't automatically add expo-onside:

1. Manually add it to package.json:

   ```json
   {
     "dependencies": {
       "expo-onside": "^1.0.2"
     }
   }
   ```

2. Run install:

   ```bash
   bun install
   ```

3. Run prebuild again:
   ```bash
   npx expo prebuild --clean --platform ios
   ```

### Verify Onside Integration

Check if Onside is properly integrated:

```typescript
import {checkInstalledFromOnside} from 'expo-iap';

console.log('Onside available:', checkInstalledFromOnside());
```

## Next Steps

- [Review the iOS Setup guide](./setup-ios)
- [Learn about purchase flows](../guides/purchases)
- [Explore core methods](../api/methods/core-methods)
- [Understand error codes](../api/error-codes)
