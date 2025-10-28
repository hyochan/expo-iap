---
sidebar_position: 3
---

import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# Horizon OS

<AdFitTopFixed />

![Horizon OS Support](/img/horizon-support.png)

This guide covers setting up expo-iap for Meta Quest devices running Horizon OS.

:::tip Seamless Integration Horizon OS follows the [OpenIAP specification](https://openiap.dev), which means **you can use the exact same expo-iap API** as you would for iOS and Android. No platform-specific code needed - just enable Horizon mode in your configuration and your existing purchase code works seamlessly! :::

Horizon OS uses Meta's Platform SDK for in-app purchases instead of Google Play Billing, but expo-iap handles all the platform differences for you.

## Prerequisites

- Meta Quest Developer account
- App created in Meta Quest Developer Hub
- Quest device or Quest Link for testing

## Configuration

### 1. Enable Horizon Mode

Add the `horizon` configuration to your app.config.ts (or app.json):

```typescript
export default {
  expo: {
    // ... other config
    plugins: [
      [
        'expo-iap',
        {
          horizon: {
            appId: 'YOUR_HORIZON_APP_ID', // Required: Your Horizon App ID
          },
        },
      ],
    ],
  },
};
```

### 2. Get Your Horizon App ID

1. Go to [Meta Quest Developer Hub](https://developer.oculus.com/)
2. Navigate to your app's dashboard
3. Copy your App ID from the app details
4. Add it to your app configuration

### 3. Rebuild Your App

After adding the configuration, rebuild your Android project:

```bash
npx expo prebuild --clean --platform android
```

This will:

- Set `horizonEnabled=true` in `gradle.properties`
- Use `openiap-google-horizon` artifact instead of `openiap-google`
- Add Horizon Platform SDK dependencies
- Configure the app with your Horizon App ID

## Code Integration

The code integration for Horizon OS is identical to standard Android integration. expo-iap handles the platform differences automatically.

### Basic Setup

```tsx
import {useIAP, ErrorCode} from 'expo-iap';

const productIds = ['premium_upgrade', 'coins_100', 'monthly_subscription'];

function App() {
  const {connected, products, subscriptions, fetchProducts, requestPurchase} =
    useIAP({
      onPurchaseSuccess: (purchase) => {
        console.log('Purchase successful:', purchase);
        handleSuccessfulPurchase(purchase);
      },
      onPurchaseError: (error) => {
        console.error('Purchase failed:', error);
        handlePurchaseError(error);
      },
    });

  React.useEffect(() => {
    if (connected) {
      // Fetch products - works the same on Horizon OS
      fetchProducts({
        skus: productIds,
        type: 'in-app',
      });
    }
  }, [connected]);

  return (
    <View>
      {products.map((product) => (
        <ProductItem key={product.id} product={product} />
      ))}
    </View>
  );
}
```

### Making Purchases

```tsx
const ProductItem = ({product}: {product: Product}) => {
  const {requestPurchase} = useIAP();

  const handlePurchase = () => {
    requestPurchase({
      request: {skus: [product.id]},
      type: 'in-app',
    });
  };

  return (
    <TouchableOpacity onPress={handlePurchase}>
      <Text>{product.title}</Text>
      <Text>{product.oneTimePurchaseOfferDetails?.formattedPrice}</Text>
    </TouchableOpacity>
  );
};
```

## Platform Detection

:::warning Currently, there is no reliable way to detect Horizon OS at runtime using React Native's Platform API. Horizon OS is based on Android and reports the same platform identifiers as standard Android devices.

**Best Practice**: Design your app to work seamlessly on both standard Android and Horizon OS without runtime detection. expo-iap automatically handles the platform differences when Horizon mode is enabled in your configuration. :::

If you need to conditionally enable features for Horizon OS, configure them at build time using your app.config.ts rather than runtime detection.

## Differences from Google Play

While expo-iap provides a unified API, there are some differences in the underlying platform:

### Supported Features

- ✅ In-app purchases (consumable and non-consumable)
- ✅ Subscriptions
- ✅ Purchase restoration
- ✅ Product fetching with localized pricing
- ✅ Purchase verification

### Platform Behavior

1. **Purchase Flow**: Uses Meta's purchase dialog instead of Google Play
2. **User Accounts**: Tied to Meta Quest accounts, not Google accounts
3. **Testing**: Must use Meta Quest test users
4. **Receipt Format**: Different from Google Play receipts

## Testing

### Setting Up Test Users

1. Go to Meta Quest Developer Hub
2. Navigate to your app's settings
3. Add test users under "Test Users" section
4. Test users can make purchases without being charged

### Installing Test Builds

```bash
# Build and install on Quest device
npx expo run:android --device
```

Or using ADB:

```bash
# Install APK on Quest device
adb install -r app-debug.apk

# View logs
adb logcat | grep ExpoIap
```

## Troubleshooting

### "Activity not available" Error

**Problem**: Horizon SDK initialization fails with null Activity

**Solution**: This was fixed in expo-iap 3.1.20+. Make sure you're using the latest version:

```bash
npx expo install expo-iap
```

### Product IDs Not Found

**Problem**: Products return empty or unavailable

**Solutions**:

- Verify product IDs match in Meta Quest Developer Hub
- Ensure products are published and active
- Check that your Horizon App ID is correct in app.config.ts
- Rebuild with `npx expo prebuild --clean`

### Purchase Dialog Not Appearing

**Problem**: Purchase request doesn't show Meta's purchase dialog

**Solutions**:

- Ensure app is running on actual Quest device (not emulator)
- Verify user is logged into Meta Quest account
- Check that product ID exists in Meta Quest Developer Hub
- Review logs for initialization errors

### Wrong Artifact Being Used

**Problem**: Build fails with "openiap-google" instead of "openiap-google-horizon"

**Solutions**:

- Check that `horizon.appId` is set in app.config.ts
- Run `npx expo prebuild --clean` to regenerate native projects
- Verify `gradle.properties` contains `horizonEnabled=true`
- Check `app/build.gradle` has `openiap-google-horizon` dependency

## Build Configuration

When you enable Horizon mode, expo-iap automatically:

1. **Adds Dependencies**: Includes Horizon Platform SDK and Horizon Billing SDK
2. **Sets Gradle Properties**: Adds `horizonEnabled=true` to gradle.properties
3. **Configures AndroidManifest**: Adds Horizon App ID metadata
4. **Selects Correct Artifact**: Uses `openiap-google-horizon` instead of `openiap-google`

You can verify the configuration by checking:

```bash
# Check gradle.properties
cat android/gradle.properties | grep horizonEnabled

# Check app/build.gradle for correct dependency
cat android/app/build.gradle | grep openiap-google

# Check dependency tree
cd android && ./gradlew :expo-iap:dependencies --configuration debugRuntimeClasspath | grep openiap-google
```

## Next Steps

- [Review the installation guide](./installation)
- [Explore core methods](../api/methods/core-methods)
- [Understand error codes](../api/error-codes)
- [Read the Horizon OS migration guide](../guides/horizon-migration)
