import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# Types

<AdFitTopFixed />

This page contains the TypeScript types and interfaces used throughout the expo-iap library.

## Core Types

### Product

```typescript
interface Product {
  productId: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  localizedPrice?: string;
}
```

### Purchase

```typescript
interface Purchase {
  purchaseId: string;
  productId: string;
  transactionId: string;
  transactionDate: number;
  purchaseState: PurchaseState;
  isAcknowledged: boolean;
  originalJson?: string;
  signature?: string;
}
```

### PurchaseState

```typescript
enum PurchaseState {
  PURCHASED = 'PURCHASED',
  PENDING = 'PENDING',
  UNSPECIFIED_STATE = 'UNSPECIFIED_STATE',
}
```

### Subscription

```typescript
interface Subscription {
  productId: string;
  purchaseToken: string;
  isAutoRenewing: boolean;
  expiryTimeMillis: number;
  autoResumeTimeMillis?: number;
  priceCurrencyCode?: string;
  priceAmountMicros?: number;
  countryCode?: string;
  orderId?: string;
  packageName?: string;
}
```

## Platform-Specific Types

### iOS

For iOS-specific types and enums, refer to the [iOS setup guide](../getting-started/setup-ios.md).

### Android

For Android-specific types and enums, refer to the [Android setup guide](../getting-started/setup-android.md).

## Error Types

For error codes and error handling types, see the [Error Codes](./error-codes.md) documentation.
