---
title: Migration to v2.8.6
sidebar_label: v2.8.6 Migration
sidebar_position: 2
---

# Migration Guide for v2.8.6

This version introduces a significant naming convention change for platform-specific functions to improve code clarity and maintainability.

## Breaking Changes

### Platform-Specific Function Naming

All platform-specific functions now have consistent suffixes:

- **iOS functions**: Use `IOS` suffix
- **Android functions**: Use `Android` suffix
- **Common functions**: No suffix

### iOS Function Changes

| Old Name | New Name |
|----------|----------|
| `buyPromotedProduct` | `requestPurchaseOnPromotedProductIOS` |
| `sync` | `syncIOS` |
| `isEligibleForIntroOffer` | `isEligibleForIntroOfferIOS` |
| `subscriptionStatus` | `subscriptionStatusIOS` |
| `currentEntitlement` | `currentEntitlementIOS` |
| `latestTransaction` | `latestTransactionIOS` |
| `showManageSubscriptions` | `showManageSubscriptionsIOS` |
| `beginRefundRequest` | `beginRefundRequestIOS` |
| `isTransactionVerified` | `isTransactionVerifiedIOS` |
| `getTransactionJws` | `getTransactionJwsIOS` |
| `getReceiptData` | `getReceiptIOS` |
| `presentCodeRedemptionSheet` | `presentCodeRedemptionSheetIOS` |
| `getAppTransaction` | `getAppTransactionIOS` |

### Android Function Changes

| Old Name | New Name |
|----------|----------|
| `acknowledgePurchase` | `acknowledgePurchaseAndroid` |
| `consumeProduct` | `consumeProductAndroid` |

### New Functions Added

- `getPendingTransactionsIOS()` - Get pending transactions on iOS
- `clearTransactionIOS()` - Clear a specific transaction on iOS

## Deprecated Functions

The following functions are deprecated and will be removed in v2.9.0:

### `getPurchaseHistories()`
- **Reason**: This function just calls `getAvailablePurchases()` internally
- **Migration**: Use `getAvailablePurchases()` instead

```tsx
// Before
const histories = await getPurchaseHistories();

// After
const purchases = await getAvailablePurchases();
```

### `buyPromotedProductIOS()`
- **Reason**: Renamed for consistency
- **Migration**: Use `requestPurchaseOnPromotedProductIOS()` instead

```tsx
// Before
await buyPromotedProductIOS();

// After
await requestPurchaseOnPromotedProductIOS();
```

### `disable()`
- **Reason**: Observer management is now automatic
- **Migration**: Remove calls to this function - it's no longer needed

## Migration Examples

### Using the useIAP Hook

```tsx
// Before
import { useIAP } from 'expo-iap';

const MyComponent = () => {
  const { 
    buyPromotedProductIOS,
    getPurchaseHistories 
  } = useIAP();
  
  // ...
};

// After
import { useIAP } from 'expo-iap';

const MyComponent = () => {
  const { 
    requestPurchaseOnPromotedProductIOS,
    getAvailablePurchases 
  } = useIAP();
  
  // ...
};
```

### Direct Function Imports

```tsx
// Before
import { 
  isEligibleForIntroOffer,
  acknowledgePurchase,
  getPurchaseHistories 
} from 'expo-iap';

// After
import { 
  isEligibleForIntroOfferIOS,
  acknowledgePurchaseAndroid,
  getAvailablePurchases 
} from 'expo-iap';
```

### Platform-Specific Code

```tsx
import { Platform } from 'react-native';
import { 
  acknowledgePurchaseAndroid,
  clearTransactionIOS 
} from 'expo-iap';

const finishPurchase = async (purchase: Purchase) => {
  if (Platform.OS === 'ios') {
    // iOS-specific function with IOS suffix
    await clearTransactionIOS();
  } else if (Platform.OS === 'android') {
    // Android-specific function with Android suffix
    await acknowledgePurchaseAndroid({ token: purchase.purchaseToken });
  }
};
```

## Benefits of the New Naming Convention

1. **Clarity**: Function names immediately indicate platform compatibility
2. **Type Safety**: Better TypeScript support with platform-specific types
3. **Maintainability**: Easier to identify and manage platform-specific code
4. **Consistency**: All platform-specific functions follow the same pattern

## Need Help?

If you encounter any issues during migration:

1. Check the [API documentation](/docs/api) for updated function signatures
2. Review the [example app](https://github.com/hyochan/expo-iap/tree/main/example) for usage patterns
3. Open an issue on [GitHub](https://github.com/hyochan/expo-iap/issues) if you need assistance