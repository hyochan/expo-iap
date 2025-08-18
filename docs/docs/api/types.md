import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# Types

<AdFitTopFixed />

This page contains the TypeScript types and interfaces used throughout the expo-iap library.

## Core Types

### Product

```typescript
type ProductType = 'inapp' | 'subs';
interface Product {
  id: string;
  title: string;
  description: string;
  type: ProductType;
  displayName?: string;
  displayPrice: string;
  currency: string;
  price?: number;
}
```

### ⚠️ Breaking Change Notice (v2.6+)

**Version 2.6+ Migration**: The `subscription` field in `ProductIOS` has changed from a required field to an optional field (`subscription?`). This reflects that not all iOS products have subscription information. Please update your code to handle this field as optional when working with non-subscription products.

iOS product contains additional information:

```typescript
type SubscriptionIosPeriod = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | '';
type PaymentMode = '' | 'FREETRIAL' | 'PAYASYOUGO' | 'PAYUPFRONT';

type ProductIOS = Product & {
  displayName: string;
  isFamilyShareable: boolean;
  jsonRepresentation: string;
  subscription?: SubscriptionInfo;
  introductoryPriceNumberOfPeriodsIOS?: string;
  introductoryPriceSubscriptionPeriodIOS?: SubscriptionIosPeriod;
};

type SubscriptionInfo = {
  introductoryOffer?: SubscriptionOffer;
  promotionalOffers?: SubscriptionOffer[];
  subscriptionGroupID: string;
  subscriptionPeriod: {
    unit: SubscriptionIosPeriod;
    value: number;
  };
};

type SubscriptionOffer = {
  displayPrice: string;
  id: string;
  paymentMode: PaymentMode;
  period: {
    unit: SubscriptionIosPeriod;
    value: number;
  };
  periodCount: number;
  price: number;
  type: 'introductory' | 'promotional';
};
```

### Purchase

```typescript
interface Purchase {
  id: string; // Transaction identifier
  productId: string;
  transactionId?: string; // @deprecated - use id instead
  transactionDate: number;
  transactionReceipt: string;
  purchaseToken?: string; // Unified purchase token (jwsRepresentation for iOS, purchaseToken for Android)
  // Platform-specific fields
  purchaseTokenAndroid?: string; // @deprecated - use purchaseToken instead
  jwsRepresentationIos?: string; // @deprecated - use purchaseToken instead
}
```

### ⚠️ Breaking Change Notice (Unified Purchase Token)

**Unified API**: Starting from v2.7+, we've introduced a unified `purchaseToken` field that works across both iOS and Android platforms:

- **iOS**: `purchaseToken` contains the JWS representation (previously `jwsRepresentationIos`)
- **Android**: `purchaseToken` contains the purchase token (previously `purchaseTokenAndroid`)

**Migration Guide:**

```typescript
// ❌ Old way (platform-specific)
if (Platform.OS === 'ios') {
  const token = purchase.jwsRepresentationIos;
} else {
  const token = purchase.purchaseTokenAndroid;
}

// ✅ New way (unified)
const token = purchase.purchaseToken;
```

The platform-specific fields (`purchaseTokenAndroid`, `jwsRepresentationIos`) are now deprecated but still available for backward compatibility.

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

## Subscription Status Types

### ActiveSubscription

Represents an active subscription with platform-specific details.

```typescript
interface ActiveSubscription {
  productId: string;
  isActive: boolean;
  expirationDateIOS?: Date;
  autoRenewingAndroid?: boolean;
  environmentIOS?: string;
  willExpireSoon?: boolean;
  daysUntilExpirationIOS?: number;
}
```

**Platform-Specific Behavior:**

- **iOS**: Provides exact `expirationDateIOS`, `daysUntilExpirationIOS`, and `environmentIOS` ("Sandbox" | "Production")
- **Android**: Provides `autoRenewingAndroid` status. When `false`, the subscription will not renew

**Usage with subscription status APIs:**

- Used as return type for `getActiveSubscriptions()`
- Contains `willExpireSoon` flag (true if expiring within 7 days)

## Platform-Specific Types

### iOS

For other iOS-specific types and enums, refer to the [iOS setup guide](../getting-started/setup-ios.md).

### Android

For Android-specific types and enums, refer to the [Android setup guide](../getting-started/setup-android.md).

## Error Types

For error codes and error handling types, see the [Error Codes](./error-codes.md) documentation.
