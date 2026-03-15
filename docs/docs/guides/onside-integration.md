---
title: Onside Integration
sidebar_label: Onside Integration
---

# Onside Integration

**Onside** allows you to use an alternative payment system on iOS. It is perfect for apps in the European Union (DMA) or South Korea.

The best part: **you don't need to change your code** for making purchases. The library automatically switches between Apple and Onside depending on where the user installed your app.

## Features
- ✅ **Auto-Switch**: Everything works "out of the box" based on the installation source.
- ✅ **Unified API**: Use your familiar `useIAP` hooks as usual.
- ✅ **Easy Setup**: The Expo plugin handles all the heavy lifting (native configs).

## Requirements
1. **Register your app** at [developer.onside.io](https://developer.onside.io/) (Mandatory).
2. **iOS 16.0+** is required.
3. **Onside Store** must be installed on the user's device to process payments.

---

## 3 Simple Steps to Integrate

### 1. Enable the module in `app.json`
Add the plugin and set `onside: true`. Make sure you have a `bundleIdentifier`.

```json
{
  "expo": {
    "plugins": [
      ["expo-iap", { "modules": { "onside": true } }]
    ]
  }
}
```

### 2. Initialize at Startup
Call the check function when your app starts. This tells the library whether to use Onside or Apple.

**Important:** The library chooses the payment module (Onside or Apple) the first time IAP is used. So the Onside check must **finish before** any code runs that uses `useIAP` or other IAP methods. If you use IAP before the check completes, the library will use Apple IAP only.

**Option A: Using the hook (Recommended)**
Block rendering until the check is done. This guarantees the correct module is used.

```typescript
import { useOnside } from 'expo-iap';

export default function App() {
  const { isOnsideLoading } = useOnside();

  if (isOnsideLoading) return <SplashScreen />;

  return <MainApp />;
}
```

**Option B: Using the function**
If you don't block rendering, make sure no screen uses `useIAP` or IAP methods until after `checkInstallationFromOnside()` has resolved. Otherwise the app may use Apple IAP even when installed from Onside.

```typescript
import { useEffect } from 'react';
import { checkInstallationFromOnside } from 'expo-iap';

export default function App() {
  useEffect(() => {
    checkInstallationFromOnside();
  }, []);

  return <MainApp />;
}
```

### 3. Use `useIAP` as always
Your existing purchase logic remains exactly the same.

```typescript
import { useIAP } from 'expo-iap';

const { products, requestPurchase } = useIAP();


```

---

## Important Tips
- **Testing**: You need a real iPhone with the [Onside Store](https://onside.io) app installed.
- **How it works**: On iOS 17.4+, we use `MarketplaceKit` to detect the distributor. If the app was installed from Onside, the library uses the Onside native module for all IAP calls; otherwise it uses the standard Apple StoreKit module. The choice is made at startup when the first IAP API is used, based on the result of `checkInstallationFromOnside()`.
- **Fail-safe**: If the app was installed from the App Store, it will simply fall back to standard Apple IAP.
- **Clean Queue**: The library automatically cleans up failed or cancelled Onside transactions so they don't pop up again on the next launch.

## Note for contributors / CI
When `modules.onside` is enabled, the Expo config plugin updates the package `expo-module.config.json` at **prebuild time** (adds Onside native modules and app delegate subscriber). The file contents therefore depend on the last prebuild configuration. To keep the repo consistent, run `npx expo prebuild` (or your app's prebuild step) in CI or before committing after changing the Onside option.
