# Platform-Specific Function Naming Convention

This document outlines the naming conventions for platform-specific functions in expo-iap.

## Overview

To improve code clarity and prevent platform-related bugs, expo-iap follows a strict naming convention for platform-specific functions.

## Naming Rules

### 1. Platform-Specific Functions

Functions that only work on one platform MUST have platform suffixes:
- iOS-specific: `functionNameIos()`
- Android-specific: `functionNameAndroid()`

### 2. Cross-Platform Functions

Functions that abstract platform differences internally do NOT need suffixes.

## Examples

### ✅ Correct: Platform-Specific Functions

```typescript
// iOS-only functions
export const validateReceiptIos = async (sku: string) => { ... }
export const getReceiptIos = (): Promise<string> => { ... }
export const presentCodeRedemptionSheet = (): Promise<boolean> => { ... } // Should be presentCodeRedemptionSheetIos
export const getAppTransactionIos = (): Promise<AppTransactionIOS | null> => { ... }

// Android-only functions
export const validateReceiptAndroid = async (options: AndroidValidationOptions) => { ... }
export const deepLinkToSubscriptionsAndroid = async (sku: string) => { ... }
export const acknowledgePurchaseAndroid = (token: string) => { ... }
```

### ✅ Correct: Cross-Platform Functions

```typescript
// These functions handle platform differences internally
export const getProducts = async (skus: string[]): Promise<Product[]> => {
  return Platform.select({
    ios: async () => { /* iOS implementation */ },
    android: async () => { /* Android implementation */ },
  })();
}

export const finishTransaction = (purchase: Purchase) => {
  return Platform.select({
    ios: async () => { /* iOS implementation */ },
    android: async () => { /* Android implementation */ },
  })();
}
```

### ❌ Incorrect: Missing Platform Suffix

```typescript
// BAD: iOS-only function without suffix
export const getStorefront = (): Promise<string> => {
  return ExpoIapModule.getStorefront(); // Only available on iOS
}

// GOOD: Should be
export const getStorefrontIos = (): Promise<string> => {
  return ExpoIapModule.getStorefront();
}
```

## Current Functions Needing Updates

Based on the current codebase, these functions should be renamed to follow the convention:

1. `getStorefront()` → `getStorefrontIos()` (in index.ts)
2. `presentCodeRedemptionSheet()` → `presentCodeRedemptionSheetIos()` (already in ios module)
3. `getAppTransaction()` → `getAppTransactionIos()` (already named correctly)

## Platform Check Pattern

Platform-specific functions should include platform checks:

```typescript
export const functionNameIos = async (): Promise<ReturnType> => {
  if (Platform.OS !== 'ios') {
    throw new Error('This method is only available on iOS');
  }
  // iOS implementation
};

export const functionNameAndroid = async (): Promise<ReturnType> => {
  if (Platform.OS !== 'android') {
    throw new Error('This method is only available on Android');
  }
  // Android implementation
};
```

## Type Naming Convention

The same convention applies to types:

### Platform-Specific Types
- `ProductIos`
- `ProductAndroid`
- `AppTransactionIOS`
- `SubscriptionOfferAndroid`

### Cross-Platform Types
- `Product`
- `Purchase`
- `PurchaseError`

## Benefits

1. **Clarity**: Developers immediately know which platforms support a function
2. **Type Safety**: TypeScript can better infer platform-specific code
3. **Documentation**: Self-documenting code that reduces confusion
4. **Error Prevention**: Prevents calling iOS-only functions on Android and vice versa

## Migration Guide

When updating existing code:

1. Identify platform-specific functions (check for Platform.OS checks or native module calls)
2. Add appropriate suffix to the function name
3. Update all imports and usages
4. Add deprecation notice for old function name if needed
5. Update documentation and examples

Example migration:
```typescript
// Old
export const getStorefront = (): Promise<string> => {
  return ExpoIapModule.getStorefront();
}

// New with deprecation
/**
 * @deprecated Use getStorefrontIos instead
 */
export const getStorefront = (): Promise<string> => {
  console.warn('getStorefront is deprecated. Use getStorefrontIos instead.');
  return getStorefrontIos();
}

export const getStorefrontIos = (): Promise<string> => {
  if (Platform.OS !== 'ios') {
    throw new Error('This method is only available on iOS');
  }
  return ExpoIapModule.getStorefront();
}
```