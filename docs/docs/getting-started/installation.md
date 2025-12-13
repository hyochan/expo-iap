---
sidebar_position: 0
---

import GreatFrontendBanner from "@site/src/uis/GreatFrontendBanner";

# Installation

<GreatFrontendBanner link="https://www.greatfrontend.com/front-end-system-design-playbook?fpr=hyo73" title="Front End System Design Guidebook" />

This guide will help you install and configure Expo IAP in your React Native or Expo project.

## Prerequisites

Before installing Expo IAP, make sure you have:

- **Expo SDK 53+** or **React Native 0.79+** (required for Android - see [Kotlin 2.0+ requirement](#expo-sdk-52-users))
- Node.js 16 or later
- iOS 12+ for iOS apps (iOS 15+ required for StoreKit 2 features)
- Android API level 21+ for Android apps

:::caution Android Kotlin Requirement

expo-iap 3.3+ uses Google Play Billing Library v8.2, which requires **Kotlin 2.0+**. This is natively supported in Expo SDK 53+ (React Native 0.79+). If you're using Expo SDK 52 or earlier, see the [workaround section](#expo-sdk-52-users) below.

:::

## Package Installation

Install the package using your favorite package manager:

```bash
npm install expo-iap
```

### Important for Expo Managed Workflow

If you're using the Expo managed workflow, you **must** use a [custom development client](https://docs.expo.dev/versions/latest/sdk/dev-client/) since in-app purchases require native modules that aren't available in Expo Go.

After installing the package, you need to:

1. **Configure expo-build-properties for Android** (required for Kotlin 2.0+ support):

   expo-iap 3.3+ uses Google Play Billing Library v8.2, which requires Kotlin 2.0+. You need to manually configure the Kotlin version via `expo-build-properties`.

   Add the following to your `app.json`:

   ```json
   {
     "expo": {
       "plugins": [
         "expo-iap",
         [
           "expo-build-properties",
           {
             "android": {
               "kotlinVersion": "2.2.0"
               // If you're targeting Expo SDK 54 or newer, confirm whether this manual override is still required.
               // Please share findings with the community at https://github.com/hyochan/expo-iap/discussions.
             }
           }
         ]
       ]
     }
   }
   ```

2. **Install the plugin and run prebuild**:

   ```bash
   npx expo prebuild --clean
   ```

   This will generate the native iOS and Android directories with the necessary configurations. Learn more about [adopting prebuild](https://docs.expo.dev/guides/adopting-prebuild/).

3. **Create a development build** (see the Platform Configuration section below for details)

## Platform Configuration

### For Expo Managed Workflow

If you're using Expo managed workflow, you'll need to create a [custom development client](https://docs.expo.dev/development/create-development-builds/) since in-app purchases require native modules that aren't available in Expo Go.

1. **Install EAS CLI** (if not already installed):

```bash
npm install -g eas-cli
```

1. **Create a development build**:

```bash
eas build --platform ios --profile development
eas build --platform android --profile development
```

### For React Native CLI Projects

If you're using React Native CLI projects, you'll need to install expo-modules-core first:

```bash
npx install-expo-modules@latest
```

Learn more about [installing Expo modules in existing React Native projects](https://docs.expo.dev/bare/installing-expo-modules/).

Then install the native dependencies:

#### iOS

1. **Install pods**:

   ```bash
   cd ios && pod install
   ```

2. **Add StoreKit capability** to your iOS app in Xcode:
   - Open your project in Xcode
   - Select your app target
   - Go to "Signing & Capabilities"
   - Click "+ Capability" and add "In-App Purchase"

#### Android

**Important:** Starting from version 2.7, expo-iap supports Google Play Billing Library v8, which requires Kotlin 2.0+. Since `expo-modules-core` doesn't support Kotlin 2.0 yet, you need to configure your project with `expo-build-properties`.

Add the following to your `app.json`:

```json
{
  "expo": {
    "plugins": [
      "expo-iap",
      [
        "expo-build-properties",
        {
          "android": {
            "kotlinVersion": "2.2.0"
          }
        }
      ]
    ]
  }
}
```

After adding this configuration, run:

```bash
npx expo prebuild --clean
```

This configuration ensures compatibility with Google Play Billing Library v8.0.0.

## Config Plugin Options

The expo-iap config plugin supports the following options:

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

### Available Options

| Option | Type | Description |
|--------|------|-------------|
| `iapkitApiKey` | `string` | IAPKit API key for server-side receipt verification. Get your key from [iapkit.com](https://iapkit.com). Available via `Constants.expoConfig?.extra?.iapkitApiKey`. |
| `enableLocalDev` | `boolean` | Enable local development mode for OpenIAP library. |
| `localPath` | `string \| {ios?: string, android?: string}` | Local development path for OpenIAP library. |
| `modules.onside` | `boolean` | Enable Onside module for iOS alternative billing (Korea market). |
| `modules.horizon` | `boolean` | Enable Horizon module for Meta Quest/VR devices (Android). |
| `ios.alternativeBilling` | `object` | iOS Alternative Billing configuration for external purchases. |
| `android.horizonAppId` | `string` | Meta Horizon App ID for Quest/VR devices. |

### Using IAPKit API Key

After configuring the plugin, access the API key in your app using `expo-constants`:

```tsx
import Constants from 'expo-constants';
import { verifyPurchaseWithProvider } from 'expo-iap';

const iapkitApiKey = Constants.expoConfig?.extra?.iapkitApiKey;

// The `purchase` object is typically received from the `onPurchaseSuccess` callback of the `useIAP` hook.
// Use with verifyPurchaseWithProvider
const result = await verifyPurchaseWithProvider({
  provider: 'iapkit',
  iapkit: {
    apiKey: iapkitApiKey,
    apple: {
      jws: purchase.purchaseToken, // JWS from purchase (iOS)
    },
    google: {
      purchaseToken: purchase.purchaseToken, // Purchase token (Android)
    },
  },
});

if (result.iapkit?.isValid) {
  // Purchase verified - grant entitlement
  console.log('Purchase state:', result.iapkit.state);
}
```

## App Store Configuration

### App Store Connect (iOS)

Before you can use in-app purchases on iOS, you need to set up your products in App Store Connect:

1. Sign in to [App Store Connect](https://appstoreconnect.apple.com/)
2. Navigate to your app
3. Go to "Features" > "In-App Purchases"
4. Create your products with unique product IDs

### Google Play Console (Android)

For Android, set up your products in Google Play Console:

1. Sign in to [Google Play Console](https://play.google.com/console/)
2. Navigate to your app
3. Go to "Monetize" > "Products" > "In-app products"
4. Create your products with unique product IDs

## Verification

To verify that Expo IAP is properly installed, create a simple test:

```tsx
import {useIAP} from 'expo-iap';

function TestComponent() {
  const {connected} = useIAP();

  console.log('IAP Connection status:', connected);

  return null;
}
```

If everything is set up correctly, you should see the connection status logged in your console.

## Next Steps

Now that you have Expo IAP installed, you can:

- [Set up iOS configuration](./setup-ios)
- [Set up Android configuration](./setup-android)
- [Learn basic usage](../guides/purchases)

## Expo SDK 52 Users

:::warning Compatibility Issue

Expo SDK 52 (React Native 0.76.x) uses a Gradle plugin compiled against **Kotlin 1.9.x**, which is incompatible with Google Play Billing Library v8 (requires Kotlin 2.0+). This creates a build conflict that cannot be resolved by simply overriding the Kotlin version.

:::

If you cannot upgrade to Expo SDK 53+, you have the following options:

### Option 1: Downgrade Billing Library (Recommended for SDK 52)

Create a custom config plugin to force an older billing library version compatible with Kotlin 1.9.x:

```js
// plugins/withBillingLibraryDowngrade.js
const {withGradleProperties} = require('@expo/config-plugins');

module.exports = function withBillingLibraryDowngrade(config) {
  return withGradleProperties(config, (config) => {
    // Force billing library version compatible with Kotlin 1.9.x
    config.modResults.push({
      type: 'property',
      key: 'billingClientVersion',
      value: '6.2.1',
    });
    return config;
  });
};
```

Then add it to your `app.json`:

```json
{
  "expo": {
    "plugins": ["./plugins/withBillingLibraryDowngrade", "expo-iap"]
  }
}
```

**Note:** This downgrades to Billing Library v6.2.1, which may lack some features available in v8.

### Option 2: Upgrade to Expo SDK 53+ (Recommended)

The cleanest solution is to upgrade your project:

```bash
npx expo install expo@^53
npx expo install --fix
npx expo prebuild --clean
```

Expo SDK 53+ uses React Native 0.79+ with native Kotlin 2.x support, eliminating the compatibility issue entirely.

## Troubleshooting

If you encounter issues during installation:

1. **Clear node_modules and reinstall**:

   ```bash
   rm -rf node_modules
   npm install
   ```

2. **For iOS, clean and rebuild pods**:

   ```bash
   cd ios
   rm -rf Pods Podfile.lock
   pod install
   ```

   **For Expo projects**, use prebuild instead:

   ```bash
   npx expo prebuild --clean
   ```

3. **For React Native, reset Metro cache**:

```bash
 npx react-native start --reset-cache
```

For more help, check our [Troubleshooting Guide](../guides/troubleshooting) or [open an issue](https://github.com/hyochan/expo-iap/issues) on GitHub.
