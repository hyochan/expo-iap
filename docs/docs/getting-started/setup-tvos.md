---
sidebar_position: 2
---

import IapKitBanner from "@site/src/uis/IapKitBanner";

# tvOS Setup

<IapKitBanner />

Expo IAP supports Apple TV (tvOS) through the [react-native-tvos](https://github.com/react-native-tvos/react-native-tvos) project. This guide explains how to configure your Expo project for tvOS.

For general Expo TV development information, see the official [Expo TV Guide](https://docs.expo.dev/guides/building-for-tv/).

## Requirements

- **tvOS 16.0+** (required by openiap dependency)
- **Xcode 16+** with tvOS SDK
- **Node.js** (LTS)

## Installation

### 1. Configure package.json

Replace `react-native` with `react-native-tvos` and add the TV config plugin:

```json
{
  "dependencies": {
    "react-native": "npm:react-native-tvos@0.81.5-1",
    "@react-native-tvos/config-tv": "^0.1.4",
    "expo-iap": "latest"
  },
  "expo": {
    "install": {
      "exclude": ["react-native"]
    }
  }
}
```

> **Note:** The `react-native-tvos` version should match your Expo SDK. For SDK 54 (React Native 0.81), use `0.81.5-1` or check [npm](https://www.npmjs.com/package/react-native-tvos) for the latest `0.81.x` version.

### 2. Configure app.config.ts

Add the TV plugin conditionally based on the `EXPO_TV` environment variable:

```typescript
import type {ConfigContext, ExpoConfig} from '@expo/config';

export default ({config}: ConfigContext): ExpoConfig => {
  const isTV = process.env.EXPO_TV === '1';

  return {
    ...config,
    name: 'my-app',
    slug: 'my-app',
    plugins: [
      // TV config plugin (must be first for TV builds)
      ...(isTV
        ? [['@react-native-tvos/config-tv', {isTV: true}] as [string, any]]
        : []),
      // expo-iap plugin
      ['expo-iap', {}],
      // Set deployment target for tvOS
      [
        'expo-build-properties',
        {
          ios: {
            deploymentTarget: isTV ? '16.0' : '15.1',
          },
        },
      ],
    ],
  };
};
```

### 3. Add Build Scripts

Add tvOS-specific scripts to your `package.json`:

```json
{
  "scripts": {
    "tvos": "EXPO_TV=1 npx expo run:ios",
    "tvos:prebuild": "EXPO_TV=1 npx expo prebuild --platform ios --clean"
  }
}
```

## Building for tvOS

### Prebuild

First, generate the native tvOS project:

```bash
EXPO_TV=1 npx expo prebuild --platform ios --clean
```

Or using the script:

```bash
npm run tvos:prebuild
```

### Run on Simulator

```bash
EXPO_TV=1 npx expo run:ios --device "Apple TV 4K (3rd generation)"
```

Or using the script:

```bash
npm run tvos
```

## Code Implementation

The IAP code is identical to iOS. All core functions work on tvOS:

```tsx
import {useIAP} from 'expo-iap';

function App() {
  const {connected, products, fetchProducts, requestPurchase} = useIAP({
    onPurchaseSuccess: (purchase) => {
      console.log('Purchase successful:', purchase);
    },
    onPurchaseError: (error) => {
      console.error('Purchase failed:', error);
    },
  });

  React.useEffect(() => {
    if (connected) {
      fetchProducts({skus: ['com.yourapp.premium'], type: 'all'});
    }
  }, [connected]);

  // ... rest of your UI
}
```

## Supported Features

| Feature | tvOS Support |
|---------|--------------|
| `initConnection` | Supported |
| `fetchProducts` | Supported |
| `requestPurchase` | Supported |
| `finishTransaction` | Supported |
| `getAvailablePurchases` | Supported |
| `getActiveSubscriptions` | Supported |
| `verifyPurchase` | Supported |
| `presentCodeRedemptionSheetIOS` | **Not Supported** |

## Limitations

### presentCodeRedemptionSheetIOS

The offer code redemption sheet is **not available on tvOS**. This is an Apple platform limitation - tvOS does not support the code redemption UI.

If you need to support offer codes on tvOS, direct users to redeem codes on their iPhone or through the Apple TV settings.

## Testing

### Simulator

1. Download tvOS Simulator from Xcode > Settings > Platforms
2. Create a tvOS simulator device
3. Run the app using `npm run tvos`

### Real Device

Testing on a real Apple TV requires:

1. Apple Developer account
2. Proper provisioning profile for tvOS
3. Device registered in your developer account

## Troubleshooting

### "minimum deployment target of tvOS 16.0" Error

Ensure your `expo-build-properties` plugin sets the correct deployment target:

```typescript
[
  'expo-build-properties',
  {
    ios: {
      deploymentTarget: '16.0', // Required for tvOS
    },
  },
],
```

### Pod Install Fails

If CocoaPods fails due to deployment target mismatch:

1. Delete the `ios` folder
2. Run prebuild again with `EXPO_TV=1`

### Simulator Not Found

Install the tvOS simulator runtime:

```bash
xcodebuild -downloadPlatform tvOS
```

## Next Steps

- [Learn about iOS setup](./setup-ios)
- [Learn about Android setup](./setup-android)
- [Review error codes](../api/error-codes)
