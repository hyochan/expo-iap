---
title: Migration from react-native-iap
sidebar_label: Migration Guide
sidebar_position: 7
---

import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# Migration from react-native-iap

<AdFitTopFixed />

This guide helps you migrate from `react-native-iap` to `expo-iap`. While the APIs are similar, there are some key differences and improvements in `expo-iap`.

## Key Differences

### Package Installation

```bash
# Before (react-native-iap)
npm install react-native-iap

# After (expo-iap)
npm install expo-iap
```

### Hook Usage

**react-native-iap:**

```tsx
import {useIAP, withIAPContext} from 'react-native-iap';

// Had to wrap app with context
const AppWithIAP = withIAPContext(App);

function App() {
  const {connected, products, getProducts} = useIAP();
  // ...
}
```

**expo-iap:**

```tsx
import {useIAP} from 'expo-iap';

// No context wrapper needed
function App() {
  const {connected, products, getProducts} = useIAP();
  // Connection and listeners are automatically managed
}
```

### Error Handling

**react-native-iap:**

```tsx
try {
  await requestPurchase({request: {sku: 'product_id'}});
} catch (error) {
  console.error(error.code, error.message);
}
```

**expo-iap:**

```tsx
import {PurchaseError} from 'expo-iap';

try {
  await requestPurchase({request: {sku: 'product_id'}});
} catch (error) {
  if (error instanceof PurchaseError) {
    // Enhanced error handling with better typing
    console.error(error.code, error.message, error.platform);
  }
}
```

## Step-by-Step Migration

### 1. Update Dependencies

Remove react-native-iap and install expo-iap:

```bash
npm uninstall react-native-iap
npm install expo-iap

# For iOS
cd ios && pod install && cd ..
```

### 2. Update Imports

Replace all react-native-iap imports:

```tsx
// Before
import {
  initConnection,
  getProducts,
  requestPurchase,
  useIAP,
  withIAPContext,
} from 'react-native-iap';

// After
import {
  initConnection,
  getProducts,
  requestPurchase,
  useIAP,
  // withIAPContext not needed
} from 'expo-iap';
```

### 3. Remove Context Wrapper

**Before:**

```tsx
import {withIAPContext} from 'react-native-iap';

const App = () => {
  return <YourAppContent />;
};

export default withIAPContext(App);
```

**After:**

```tsx
// No wrapper needed
const App = () => {
  return <YourAppContent />;
};

export default App;
```

### 4. Update Hook Usage

The `useIAP` hook signature is mostly the same, but with better TypeScript support:

**Before:**

```tsx
const {
  connected,
  products,
  subscriptions,
  purchaseHistory,
  availablePurchases,
  currentPurchase,
  currentPurchaseError,
  finishTransaction,
  getProducts,
  getSubscriptions,
} = useIAP();
```

**After:**

```tsx
const {
  connected,
  products,
  subscriptions,
  purchaseHistories, // Note: plural form in expo-iap
  availablePurchases,
  currentPurchase,
  currentPurchaseError,
  finishTransaction,
  getProducts,
  getSubscriptions,
  getPurchaseHistories, // Method: plural form in expo-iap v2.6.0+
  getAvailablePurchases,
  // Additional methods and better typing
} = useIAP();
```

### 5. Update to v2.8.1 Type System (Recommended)

Starting from v2.8.1, expo-iap provides improved type consistency across platforms:

**Platform Identification:**

```tsx
// v2.8.1+ includes platform fields for better type discrimination
if (product.platform === 'ios') {
  // TypeScript knows this is ProductIOS
  console.log(product.isFamilyShareableIOS);
} else if (product.platform === 'android') {
  // TypeScript knows this is ProductAndroid
  console.log(product.nameAndroid);
}
```

**Common Fields:**

```tsx
// Before v2.8.1
const ids = purchase.idsAndroid; // Android only

// After v2.8.1
const ids = purchase.ids; // Works for both platforms
```

**Note:** Deprecated fields will be removed in v2.9.0. Update your code to use platform-specific field names:

- Android: Use fields with `Android` suffix (e.g., `nameAndroid` instead of `name`)
- iOS: Use fields with `IOS` suffix (e.g., `displayNameIOS` instead of `displayName`)

### 6. Update Error Handling

Enhance error handling with the new error types:

**Before:**

```tsx
useEffect(() => {
  if (currentPurchaseError) {
    console.error('Purchase error:', currentPurchaseError);
  }
}, [currentPurchaseError]);
```

**After:**

```tsx
import {PurchaseError} from 'expo-iap';

useEffect(() => {
  if (currentPurchaseError) {
    if (currentPurchaseError instanceof PurchaseError) {
      switch (currentPurchaseError.code) {
        case 'E_USER_CANCELLED':
          // Handle user cancellation
          break;
        case 'E_NETWORK_ERROR':
          // Handle network error
          break;
        default:
          console.error('Purchase error:', currentPurchaseError);
      }
    }
  }
}, [currentPurchaseError]);
```

## Version-Specific Breaking Changes

### v2.9.0 Breaking Changes

**IapEvent → OpenIapEvent**

The `IapEvent` enum has been renamed to `OpenIapEvent` to align with the OpenIAP specification:

```tsx
// ❌ Before v2.9.0
import {IapEvent} from 'expo-iap';

purchaseUpdatedListener((purchase) => {
  console.log('Purchase updated');
}, IapEvent.PurchaseUpdated);

// ✅ After v2.9.0
import {OpenIapEvent} from 'expo-iap';

purchaseUpdatedListener((purchase) => {
  console.log('Purchase updated');
}, OpenIapEvent.PurchaseUpdated);
```

**Note:** The event values remain the same (`'purchase-updated'`, `'purchase-error'`), only the enum name has changed.

### v2.8.7 Changes

**fetchProducts() Introduction**

`fetchProducts()` was introduced to replace `requestProducts()` following OpenIAP terminology:

```tsx
// ❌ Old (deprecated in v2.8.7)
const products = await requestProducts({skus: ['product1'], type: 'inapp'});

// ✅ New (v2.8.7+)
const products = await fetchProducts({skus: ['product1'], type: 'inapp'});
```

## API Changes

### Method Naming Differences

expo-iap maintains API compatibility with react-native-iap, with the following naming conventions:

| react-native-iap | expo-iap | Status |
| --- | --- | --- |
| `getPurchaseHistory()` | `getPurchaseHistories()` | ✅ Updated in v2.6.0 |
| `purchaseHistory` (in hook) | `purchaseHistories` | ✅ Plural form |
| `getAvailablePurchases()` | `getAvailablePurchases()` | ✅ Same |
| `availablePurchases` (in hook) | `availablePurchases` | ✅ Same |

**⚠️ Breaking Change in v2.6.0:**

- `getPurchaseHistory()` (singular) is now deprecated
- Use `getPurchaseHistories()` (plural) instead
- The hook already uses `purchaseHistories` (plural)

### Method Signatures

Most method signatures remain the same, but with improved TypeScript definitions:

```tsx
// Both libraries have the same signature
await getProducts({skus: ['product1', 'product2']});
await requestPurchase({request: {sku: 'product_id'}});
await finishTransaction({purchase});
await getPurchaseHistories(); // Note: plural form in expo-iap v2.6.0+
```

### Deprecated Methods in expo-iap

> **⚠️ Important:** The following methods are deprecated and will be removed in a future version:

| Deprecated Method        | Replacement                                |
| ------------------------ | ------------------------------------------ |
| `getProducts(skus)`      | `requestProducts({ skus, type: 'inapp' })` |
| `getSubscriptions(skus)` | `requestProducts({ skus, type: 'subs' })`  |

**Migration Examples:**

```tsx
// Old way (deprecated)
import {getProducts, getSubscriptions} from 'expo-iap';

const products = await getProducts(['product1', 'product2']);
const subs = await getSubscriptions(['sub1', 'sub2']);

// New way (recommended)
import {requestProducts} from 'expo-iap';

const products = await requestProducts({
  skus: ['product1', 'product2'],
  type: 'inapp',
});

const subs = await requestProducts({
  skus: ['sub1', 'sub2'],
  type: 'subs',
});
```

### New Methods

expo-iap includes some additional utility methods:

```tsx
import {validateReceiptIos, validateReceiptAndroid} from 'expo-iap';

// Platform-specific receipt validation helpers
const isValidIOS = await validateReceiptIos({
  receiptBody: purchase.transactionReceipt,
  password: 'your_shared_secret',
});

const isValidAndroid = await validateReceiptAndroid({
  packageName: 'com.yourapp',
  productId: purchase.productId,
  productToken: purchase.purchaseToken,
  accessToken: 'your_access_token',
});
```

## Testing Migration

### 1. Test Basic Functionality

Create a simple test to ensure basic functionality works:

```tsx
import {useIAP} from 'expo-iap';

export default function MigrationTest() {
  const {connected, getProducts} = useIAP();

  useEffect(() => {
    if (connected) {
      console.log('✅ Connection successful');

      requestProducts({skus: ['test_product'], type: 'inapp'})
        .then((products) => {
          console.log('✅ Products fetched:', products.length);
        })
        .catch((error) => {
          console.error('❌ Product fetch failed:', error);
        });
    }
  }, [connected, getProducts]);

  return (
    <View>
      <Text>Migration Test</Text>
      <Text>Connected: {connected ? '✅' : '❌'}</Text>
    </View>
  );
}
```

### 2. Test Purchase Flow

Test the complete purchase flow:

```tsx
const testPurchaseFlow = async () => {
  try {
    // 1. Fetch products
    const products = await requestProducts({
      skus: ['test_product'],
      type: 'inapp',
    });
    console.log('✅ Products fetched');

    // 2. Request purchase
    await requestPurchase({sku: 'test_product'});
    console.log('✅ Purchase requested');

    // 3. Purchase handling will be automatic with useIAP
  } catch (error) {
    console.error('❌ Purchase flow failed:', error);
  }
};
```

### 3. Test Error Scenarios

Ensure error handling transitions properly:

```tsx
const testErrorHandling = () => {
  // Test with invalid product ID
  requestProducts({skus: ['invalid_product'], type: 'inapp'})
    .then((products) => {
      if (products.length === 0) {
        console.log('✅ Empty products handled correctly');
      }
    })
    .catch((error) => {
      console.log('✅ Error handled:', error.code);
    });
};
```

## Common Migration Issues

### 1. Context Not Working

If you're getting context errors:

```tsx
// ❌ This is no longer needed
import {withIAPContext} from 'expo-iap';

// ✅ Just use the hook directly
import {useIAP} from 'expo-iap';
```

### 2. TypeScript Errors

Update your TypeScript types if you were using custom interfaces:

```tsx
// Before
import {Product, Purchase} from 'react-native-iap';

// After
import {Product, Purchase} from 'expo-iap';
```

### 3. Purchase Listeners

If you were using manual listeners, consider switching to the hook:

**Before:**

```tsx
import {purchaseUpdatedListener} from 'react-native-iap';

useEffect(() => {
  const subscription = purchaseUpdatedListener((purchase) => {
    // Handle purchase
  });

  return () => subscription.remove();
}, []);
```

**After (using hook):**

```tsx
const {currentPurchase} = useIAP();

useEffect(() => {
  if (currentPurchase) {
    // Handle purchase automatically
  }
}, [currentPurchase]);
```

## Performance Improvements

expo-iap includes several performance improvements:

1. **Better caching**: Products and subscriptions are cached more efficiently
2. **Reduced re-renders**: The hook is optimized to minimize unnecessary re-renders
3. **Memory management**: Better cleanup of listeners and connections

## Getting Help

If you encounter issues during migration:

1. Check the [troubleshooting guide](./troubleshooting)
2. Review the [FAQ](./faq)
3. Create a [GitHub issue](https://github.com/hyochan/expo-iap/issues) with:
   - Your previous react-native-iap version
   - The migration step where you got stuck
   - Error messages and relevant code

## Next Steps

After successful migration:

1. Review the [new features](../api/use-iap) available in expo-iap
2. Consider implementing [enhanced error handling](./troubleshooting)
3. Explore [performance optimizations](./lifecycle)
4. Update your testing procedures if needed
