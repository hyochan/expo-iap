---
sidebar_position: 0
---

import IapKitBanner from "@site/src/uis/IapKitBanner";

# Prerequisites

<IapKitBanner />

Before using expo-iap, ensure your environment meets the following requirements. This page is the single source of truth for all prerequisites — other pages link here instead of repeating this information.

## Platform Requirements

| Requirement | Details |
|-------------|---------|
| **Expo SDK** | 53+ (React Native 0.79+) |
| **iOS** | iOS 12+ (iOS 15+ required for StoreKit 2 features) |
| **Android** | API level 21+ |
| **Node.js** | 16 or later |
| **Xcode** | 16.4+ recommended ([why?](../guides/faq#build-error-apptransactionid-property-not-found)) |

## Android Kotlin Requirement

expo-iap 3.3+ uses Google Play Billing Library v8.2, which requires **Kotlin 2.0+**.

:::tip Expo SDK 54+ users

**Expo SDK 54 and 55 ship with Kotlin 2.0+ by default.** No manual configuration is needed — just install expo-iap and run prebuild.

:::

:::caution Expo SDK 53 users

Expo SDK 53 includes Kotlin 2.0+ natively as well, but if you encounter build issues, you can explicitly set the Kotlin version:

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

:::

:::warning Expo SDK 52 or earlier

Expo SDK 52 (React Native 0.76.x) uses Kotlin 1.9.x, which is **incompatible** with Google Play Billing Library v8. See the [Expo SDK 52 workaround](./installation#expo-sdk-52-users) in the installation guide.

:::

## Development Build Required

In-app purchases require native modules that are **not available in Expo Go**. You must use a [custom development client](https://docs.expo.dev/development/create-development-builds/).

```bash
# Build and run on a physical device
npx expo run:ios --device   # iOS
npx expo run:android        # Android
```

## Real Device Required

In-app purchases **cannot be tested on simulators or emulators**. You need:

- **iOS**: A physical iPhone/iPad with a sandbox Apple ID
- **Android**: A physical Android device with a signed build installed from a testing track

## Store Configuration

Before testing purchases, you must configure products in the respective app stores:

### iOS (App Store Connect)

1. Complete agreements, tax, and banking information
2. Create in-app purchase products with unique product IDs
3. Set up [sandbox test accounts](https://developer.apple.com/help/app-store-connect/test-in-app-purchases/create-sandbox-apple-accounts/)
4. Ensure products are in "Ready to Submit" or approved status

### Android (Google Play Console)

1. Upload your app to at least the internal testing track
2. Create in-app products with unique product IDs
3. Add [license test accounts](https://developer.android.com/google/play/billing/test)
4. Wait 6–12 hours after initial product creation for availability

:::info

For detailed platform setup, see:
- [iOS Setup Guide](./setup-ios)
- [Android Setup Guide](./setup-android)

:::

## Next Steps

Once prerequisites are met, proceed to [Installation](./installation).
