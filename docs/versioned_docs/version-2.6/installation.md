---
sidebar_position: 2
---

import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# Installation

<AdFitTopFixed />

This guide will help you install and configure Expo IAP in your React Native or Expo project.

## Prerequisites

Before installing Expo IAP, make sure you have:

- React Native 0.64 or later, or Expo SDK 45 or later
- Node.js 16 or later
- iOS 12+ for iOS apps
- Android API level 21+ for Android apps

## Package Installation

Install the package using your favorite package manager:

```bash
npm install expo-iap
```

## Platform Configuration

### For Expo Managed Workflow

If you're using Expo managed workflow, you'll need to create a [custom development client](https://docs.expo.dev/development/create-development-builds/) since in-app purchases require native modules that aren't available in Expo Go.

1. **Install Expo CLI** (if not already installed):

   ```bash
   npm install -g @expo/cli
   ```

2. **Create a development build**:

   ```bash
   eas build --platform ios --profile development
   eas build --platform android --profile development
   ```

### For Expo Bare Workflow

If you're using Expo bare workflow or vanilla React Native, you'll need to install the native dependencies:

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

No additional configuration needed for Android. The Google Play Billing library is automatically linked.

## Configuration

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

- [Set up iOS configuration](./getting-started/setup-ios)
- [Set up Android configuration](./getting-started/setup-android)
- [Learn basic usage](./guides/getting-started)

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

For more help, check our [Troubleshooting Guide](./guides/troubleshooting) or [open an issue](https://github.com/hyochan/expo-iap/issues) on GitHub.
