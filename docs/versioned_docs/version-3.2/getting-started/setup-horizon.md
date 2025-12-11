---
sidebar_position: 3
---

import GreatFrontendBanner from "@site/src/uis/GreatFrontendBanner";

# Horizon OS

<GreatFrontendBanner link="https://www.greatfrontend.com/questions/formats/system-design?fpr=hyo73" title="Front End System design questions" />

This guide covers setting up expo-iap for Meta Quest devices running Horizon OS.

:::info Horizon OS Support

Horizon OS support is available starting from **expo-iap 3.1.22**. See the [release announcement](/blog/3.1.22) for more details.

:::

:::tip Seamless Integration

Horizon OS follows the [OpenIAP specification](https://openiap.dev), which means **you can use the exact same expo-iap API** as you would for iOS and Android. No platform-specific code needed - just enable Horizon mode in your configuration and your existing purchase code works seamlessly!

:::

Horizon OS uses Meta's Platform SDK for in-app purchases instead of Google Play Billing, but expo-iap handles all the platform differences for you.

## Prerequisites & Setup

For detailed setup instructions including creating your Meta Quest app, configuring IAP products, and obtaining your Horizon App ID, please refer to:

**[OpenIAP Horizon OS Setup Guide](https://www.openiap.dev/docs/horizon-setup)**

Once you have your Horizon App ID ready, continue with the Expo configuration below.

## Configuration

### 1. Enable Horizon Mode

Add the Horizon configuration to your app.config.ts (or app.json):

```typescript
export default {
  expo: {
    // ... other config
    plugins: [
      [
        'expo-iap',
        {
          modules: {
            horizon: true, // Enable Horizon OS support
          },
          google: {
            horizonAppId: 'YOUR_HORIZON_APP_ID', // Required: Your Horizon App ID
          },
        },
      ],
    ],
  },
};
```

### 2. Rebuild Your App

After adding the configuration, rebuild your Android project:

```bash
npx expo prebuild --clean --platform android
```

This will:

- Set `horizonEnabled=true` in `gradle.properties`
- Use `openiap-google-horizon` artifact instead of `openiap-google`
- Add Horizon Platform SDK dependencies
- Configure the app with your Horizon App ID

## Platform Detection

:::warning

Currently, there is no reliable way to detect Horizon OS at runtime using React Native's Platform API. Horizon OS is based on Android and reports the same platform identifiers as standard Android devices.

:::

**Best Practice**: Design your app to work seamlessly on both standard Android and Horizon OS without runtime detection. expo-iap automatically handles the platform differences when Horizon mode is enabled in your configuration.

If you need to conditionally enable features for Horizon OS, configure them at build time using your app.config.ts rather than runtime detection.

## Testing

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

For expo-iap specific issues:

- Verify `horizon.appId` is correctly set in your app.config.ts
- Run `npx expo prebuild --clean` to regenerate native projects
- Check logs with `adb logcat | grep ExpoIap`

## Next Steps

- [Review the installation guide](./installation)
- [Explore core methods](../api/methods/core-methods)
- [Understand error codes](../api/error-codes)
