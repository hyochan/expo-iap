---
title: Troubleshooting
sidebar_label: Troubleshooting
sidebar_position: 4
---

import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# Troubleshooting

<AdFitTopFixed />

This guide covers common issues you might encounter when implementing in-app purchases with expo-iap and how to resolve them.

## Prerequisites Checklist

Before diving into troubleshooting, ensure you have completed these essential steps:

### App Store Setup (iOS)

- [ ] **Agreements**: Completed all agreements, tax, and banking information in App Store Connect
- [ ] **Sandbox Account**: Created sandbox testing accounts in "Users and Roles"
- [ ] **Device Setup**: Signed into iOS device with sandbox account in "Settings > iTunes & App Stores"
- [ ] **Products Created**: Set up In-App Purchase products with status "Ready to Submit"

### Google Play Setup (Android)

- [ ] **Play Console**: Completed all required information in Google Play Console
- [ ] **Test Accounts**: Added test accounts to your app's testing track
- [ ] **Signed Build**: Using signed APK/AAB (not debug builds)
- [ ] **Upload**: Uploaded at least one version to internal testing

## Common Issues

### `getProducts()` returns an empty array

This is one of the most common issues. Here are the potential causes and solutions:

#### 1. Connection not established

```tsx
const {connected, getProducts} = useIAP();

useEffect(() => {
  if (connected) {
    // ✅ Only call getProducts when connected
    getProducts({skus: productIds});
  } else {
    console.log('Not connected to store yet');
  }
}, [connected]);
```

#### 2. Product IDs don't match

Ensure your product IDs exactly match those configured in the stores:

```tsx
// ❌ Wrong: Using different IDs
const productIds = ['my_product_1', 'my_product_2'];

// ✅ Correct: Using exact IDs from store
const productIds = ['com.yourapp.product1', 'com.yourapp.premium'];
```

#### 3. Products not approved (iOS)

Products need time to propagate through Apple's systems:

- Wait up to 24 hours after creating products
- Ensure products are in "Ready to Submit" status
- Test with sandbox accounts

#### 4. App not uploaded to Play Console (Android)

For Android, your app must be uploaded to Play Console:

```bash
# Create signed build
./gradlew assembleRelease

# Upload to Play Console internal testing track
```

### `useIAP` hook not working

#### 1. Missing provider setup

Ensure you're using the hook within the provider context:

```tsx
// ❌ Wrong: Hook used outside provider
function App() {
  const {connected} = useIAP(); // This will fail
  return <MyApp />;
}

// ✅ Correct: Hook used within provider
import {IAPProvider} from 'expo-iap';

function AppWithProvider() {
  return (
    <IAPProvider>
      <App />
    </IAPProvider>
  );
}

function App() {
  const {connected} = useIAP(); // This works
  return <MyApp />;
}
```

#### 2. Multiple providers

Don't wrap your app with multiple IAP providers:

```tsx
// ❌ Wrong: Multiple providers
<IAPProvider>
  <IAPProvider>
    <App />
  </IAPProvider>
</IAPProvider>

// ✅ Correct: Single provider
<IAPProvider>
  <App />
</IAPProvider>
```

### Purchase flow issues

#### 1. Purchases not completing

Always handle purchase updates and finish transactions:

```tsx
const {currentPurchase, finishTransaction} = useIAP();

useEffect(() => {
  if (currentPurchase) {
    handlePurchase(currentPurchase);
  }
}, [currentPurchase]);

const handlePurchase = async (purchase) => {
  try {
    // Validate receipt
    const isValid = await validateOnServer(purchase);

    if (isValid) {
      // Grant purchase to user
      await grantPurchase(purchase);

      // ✅ Always finish the transaction
      await finishTransaction({purchase});
    }
  } catch (error) {
    console.error('Purchase handling failed:', error);
  }
};
```

#### 2. Testing on simulators/emulators

In-app purchases only work on real devices:

```tsx
import {Platform} from 'react-native';
import {isEmulator} from 'react-native-device-info';

const checkDeviceSupport = async () => {
  if (__DEV__) {
    const emulator = await isEmulator();
    if (emulator) {
      console.warn('In-app purchases not supported on simulators/emulators');
      return false;
    }
  }
  return true;
};
```

### Connection issues

#### 1. Network connectivity

Handle network errors gracefully:

```tsx
const {connectionError} = useIAP();

if (connectionError) {
  return (
    <View>
      <Text>Store connection failed</Text>
      <Text>{connectionError.message}</Text>
      <Button
        title="Retry"
        onPress={() => {
          // Implement retry logic
          retryConnection();
        }}
      />
    </View>
  );
}
```

#### 2. Store service unavailable

Sometimes store services are temporarily unavailable:

```tsx
const handleStoreUnavailable = () => {
  // Show user-friendly message
  Alert.alert(
    'Store Unavailable',
    'The App Store is temporarily unavailable. Please try again later.',
    [{text: 'OK'}],
  );
};
```

### Platform-specific issues

#### iOS Issues

1. **Invalid product ID error**:

   ```tsx
   // Ensure you're signed in with sandbox account
   // Check product IDs match exactly
   // Verify app bundle ID matches
   ```

2. **StoreKit configuration**:
   ```tsx
   // Add StoreKit capability in Xcode
   // For iOS 12.x, add SwiftUI.framework as optional
   ```

#### Android Issues

1. **Billing client setup**:

   ```gradle
   // android/app/build.gradle
   dependencies {
     implementation 'com.android.billingclient:billing:5.0.0'
   }
   ```

2. **Missing permissions**:
   ```xml
   <!-- android/app/src/main/AndroidManifest.xml -->
   <uses-permission android:name="com.android.vending.BILLING" />
   ```

## Debugging Tips

### 1. Enable verbose logging

```tsx
import {setDebugMode} from 'expo-iap';

// Enable debug mode in development
if (__DEV__) {
  setDebugMode(true);
}
```

### 2. Log purchase events

```tsx
const {currentPurchase, currentPurchaseError} = useIAP();

useEffect(() => {
  if (currentPurchase) {
    console.log('Purchase received:', JSON.stringify(currentPurchase, null, 2));
  }
}, [currentPurchase]);

useEffect(() => {
  if (currentPurchaseError) {
    console.error(
      'Purchase error:',
      JSON.stringify(currentPurchaseError, null, 2),
    );
  }
}, [currentPurchaseError]);
```

### 3. Monitor connection state

```tsx
const {connected, connectionError} = useIAP();

useEffect(() => {
  console.log('Connection state changed:', {connected, error: connectionError});
}, [connected, connectionError]);
```

## Testing Strategies

### 1. Staged testing approach

1. **Unit tests**: Test your purchase logic without actual store calls
2. **Sandbox testing**: Use store sandbox/test accounts
3. **Internal testing**: Test with real store in closed testing
4. **Production testing**: Final verification in live environment

### 2. Test different scenarios

```tsx
const testScenarios = [
  'successful_purchase',
  'user_cancelled',
  'network_error',
  'insufficient_funds',
  'product_unavailable',
  'pending_purchase',
];

// Test each scenario with appropriate mocks
```

### 3. Device testing matrix

Test on various devices and OS versions:

- iOS: Different iPhone/iPad models, iOS versions
- Android: Different manufacturers, Android versions, Play Services versions

## Error Code Reference

Common error codes and their meanings:

| Code | Description | Action |
| --- | --- | --- |
| `E_USER_CANCELLED` | User cancelled purchase | No action needed |
| `E_NETWORK_ERROR` | Network connectivity issue | Show retry option |
| `E_ITEM_UNAVAILABLE` | Product not available | Check product setup |
| `E_ALREADY_OWNED` | User already owns product | Check ownership status |
| `E_INSUFFICIENT_FUNDS` | Not enough funds | Direct to payment method |
| `E_UNKNOWN` | Unknown error | Log for investigation |

## Getting Help

If you're still experiencing issues:

1. **Check logs**: Review device logs and crash reports
2. **Search issues**: Check the [GitHub issues](https://github.com/hyochan/expo-iap/issues)
3. **Minimal reproduction**: Create a minimal example that reproduces the issue
4. **Report bug**: File a detailed issue with reproduction steps

### Bug report template

```markdown
**Environment:**

- expo-iap version: x.x.x
- Platform: iOS/Android
- OS version: x.x.x
- Device: Device model

**Description:** Clear description of the issue

**Steps to reproduce:**

1. Step 1
2. Step 2
3. Step 3

**Expected behavior:** What should happen

**Actual behavior:** What actually happens

**Logs:** Relevant logs and error messages
```
