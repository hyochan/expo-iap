---
slug: ios-type-improvements-v2-6
title: iOS Type Improvements in Expo IAP v2.6
authors: [hyochan]
tags: [expo-iap, ios, typescript, breaking-changes]
date: 2025-07-21
---

We're excited to announce significant improvements to our iOS type definitions in Expo IAP v2.6! These changes bring better type safety and more accurate representation of Apple's StoreKit 2 data structures.

<!-- truncate -->

## Breaking Changes

This release includes breaking changes to iOS-specific types that improve accuracy and developer experience. Here's what you need to know:

### 1. Period Structure Changes

The `period` and `subscriptionPeriod` properties now return objects with `unit` and `value` properties instead of just the unit string.

**Before (v2.5.x):**
```typescript
type SubscriptionOffer = {
  // ...
  period: SubscriptionIosPeriod; // 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'
};

type SubscriptionInfo = {
  // ...
  subscriptionPeriod: SubscriptionIosPeriod;
};
```

**After (v2.6.0):**
```typescript
type SubscriptionOffer = {
  // ...
  period: {
    unit: SubscriptionIosPeriod; // 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'
    value: number; // e.g., 1, 3, 6, 12
  };
};

type SubscriptionInfo = {
  // ...
  subscriptionPeriod: {
    unit: SubscriptionIosPeriod;
    value: number;
  };
};
```

This change provides more detailed information about subscription periods. For example, instead of just knowing a subscription is "MONTH", you now know if it's "1 MONTH", "3 MONTHS", etc.

### 2. Optional Subscription Property

The `subscription` property on `ProductIos` is now optional, reflecting that not all products are subscriptions.

**Before (v2.5.x):**
```typescript
export type ProductIos = ProductBase & {
  // ...
  subscription: SubscriptionInfo; // Always required
};
```

**After (v2.6.0):**
```typescript
export type ProductIos = ProductBase & {
  // ...
  subscription?: SubscriptionInfo; // Optional - only present for subscription products
};
```

## Migration Guide

### Updating Period Handling

If your code accesses period information, update it to use the new structure:

```typescript
// Before
if (offer.period === 'MONTH') {
  console.log('Monthly offer');
}

// After
if (offer.period.unit === 'MONTH') {
  console.log(`${offer.period.value} month(s) offer`);
}
```

### Handling Optional Subscriptions

Add null checks when accessing subscription information:

```typescript
// Before
const groupId = product.subscription.subscriptionGroupID;

// After
const groupId = product.subscription?.subscriptionGroupID;

// Or with explicit checking
if (product.subscription) {
  const groupId = product.subscription.subscriptionGroupID;
  // Handle subscription-specific logic
} else {
  // Handle non-subscription products
}
```

## Example Usage

Here's a complete example showing how to work with the new types:

```typescript
import { useIAP } from 'expo-iap';

function ProductList() {
  const { products } = useIAP();

  return (
    <View>
      {products.map((product) => (
        <View key={product.productId}>
          <Text>{product.displayName}</Text>
          <Text>{product.localizedPrice}</Text>
          
          {product.subscription && (
            <View>
              <Text>
                Subscription Period: {product.subscription.subscriptionPeriod.value}{' '}
                {product.subscription.subscriptionPeriod.unit.toLowerCase()}(s)
              </Text>
              
              {product.subscription.introductoryOffer && (
                <Text>
                  Intro Offer: {product.subscription.introductoryOffer.displayPrice} for{' '}
                  {product.subscription.introductoryOffer.period.value}{' '}
                  {product.subscription.introductoryOffer.period.unit.toLowerCase()}(s)
                </Text>
              )}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}
```

## Benefits

These type improvements provide several benefits:

1. **Better Type Safety**: The TypeScript compiler can now catch more potential errors at compile time
2. **More Accurate Data**: Period information now includes both unit and value, providing complete subscription duration details
3. **Clearer Intent**: Optional types make it explicit which products are subscriptions
4. **Future-Proof**: These changes align better with Apple's StoreKit 2 data structures

## Conclusion

While these are breaking changes, they significantly improve the developer experience and type safety of expo-iap. The migration is straightforward, and the benefits of more accurate types will help prevent runtime errors and improve code maintainability.

For more details on all the types available, check out our [API Types documentation](/docs/api/types).

Questions or feedback? Join the discussion on [GitHub](https://github.com/hyochan/expo-iap/discussions)!