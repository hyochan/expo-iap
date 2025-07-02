# GitHub Copilot Custom Instructions for expo-iap

## Project Overview

This is the **expo-iap** library - a modern React Native/Expo module for handling in-app purchases across iOS and Android platforms. The library provides a unified, TypeScript-first API with automatic type inference and platform abstraction.

## Key Principles

### 🎯 Modern TypeScript-First API

- **Automatic Type Inference**: No manual type casting required
- **Unified Platform API**: Single API that works across iOS and Android
- **Consistent Results**: Unified data structure regardless of platform
- **Clean Error Handling**: Result pattern with detailed error information

### 🚀 Primary API Pattern

```typescript
const result = await requestPurchase({
  request: {sku: 'product.id'},
  type: 'inapp',
});

if (result.success) {
  console.log('Purchase successful:', result.transactionId);
} else {
  console.error('Purchase failed:', result.error.message);
}
```

### 🏗️ Code Style Guidelines

#### TypeScript Best Practices

- **Explicit Type Definitions**: Always define types explicitly for public APIs
- **Function Overloads**: Provide multiple signatures for better IntelliSense
- **Discriminated Unions**: Use for platform-specific types and conditional returns
- **Strict Type Safety**: No `any` types in production code

#### Naming Conventions

- **PascalCase**: Interfaces, types, enums, classes
- **camelCase**: Functions, variables, methods, properties
- **kebab-case**: File names (except for React components)
- **Descriptive Names**: Avoid abbreviations, use clear intent-revealing names

#### Error Handling Pattern

```typescript
type PurchaseResult<T = unknown> =
  | {success: true; data: T; platform: 'ios' | 'android'}
  | {success: false; error: PurchaseError; platform: 'ios' | 'android'};
```

## API Implementation Patterns

### Core Purchase Functions

```typescript
export function requestPurchase(params: {
  readonly request: {sku: string; quantity?: number};
  readonly type: 'inapp';
}): Promise<ProductPurchase | ProductPurchase[]>;

export function requestSubscription(params: {
  readonly request: {sku: string};
}): Promise<SubscriptionPurchase | SubscriptionPurchase[]>;
```

### Platform Abstraction

The library automatically handles platform differences:

- **iOS**: Uses `sku` directly with StoreKit
- **Android**: Converts to Google Play Billing format
- **Unified Properties**: Both platforms return consistent data

### Type Guards for Advanced Usage

```typescript
export const isPurchaseResult = (
  result: unknown,
): result is ProductPurchase | SubscriptionPurchase => {
  return (
    result !== null &&
    typeof result === 'object' &&
    'transactionId' in result &&
    'productId' in result
  );
};
```

## File Organization

```
src/
├── index.ts                    # Main exports
├── ExpoIap.types.ts           # Core type definitions
├── ExpoIapModule.ts           # Native module interface
├── useIap.ts                  # React hook (legacy support)
├── modules/
│   ├── android.ts             # Android-specific utilities
│   └── ios.ts                 # iOS-specific utilities
└── types/
    ├── ExpoIapAndroid.types.ts # Android type definitions
    └── ExpoIapIos.types.ts     # iOS type definitions
```

## Usage Examples

### Simple Product Purchase

```typescript
import {requestPurchase} from 'expo-iap';

const handlePurchase = async (productId: string) => {
  const result = await requestPurchase({
    request: {sku: productId},
    type: 'inapp',
  });

  if (result.success) {
    console.log('Purchase successful:', result.data);
  } else {
    console.error('Purchase failed:', result.error.message);
  }
};
```

### Subscription Purchase

```typescript
import {requestSubscription} from 'expo-iap';

const handleSubscription = async (subscriptionId: string) => {
  const result = await requestSubscription({
    request: {sku: subscriptionId},
  });

  if (result.success) {
    console.log('Subscription activated:', result.data);
  } else {
    console.error('Subscription failed:', result.error.message);
  }
};
```

## Documentation Standards

### Code Comments

- **Document the "why"**, not just the "what"
- **Explain platform differences** and how they're handled
- **Provide usage examples** for complex APIs
- **Use JSDoc format** for all public APIs

### Example Documentation Pattern

````typescript
/**
 * Enhanced requestPurchase with unified API support
 *
 * This function automatically handles platform differences:
 * - iOS: Uses `sku` directly with StoreKit
 * - Android: Converts to Google Play Billing format
 *
 * @param params - Purchase request parameters
 * @param params.request - Request object with product details
 * @param params.type - Purchase type: 'inapp' for products
 *
 * @returns Promise resolving to purchase result
 *
 * @example
 * ```typescript
 * const result = await requestPurchase({
 *   request: { sku: 'com.example.premium' },
 *   type: 'inapp'
 * });
 * ```
 */
````

## Development Philosophy

The expo-iap library provides a **world-class developer experience**:

### ✅ Core Achievements

- **🎯 Zero Manual Casting**: Automatic type inference
- **🔄 Unified API**: Single codebase for iOS and Android
- **⚡ Enhanced DX**: Better IntelliSense and error messages
- **🛡️ Full Backward Compatibility**: Existing code continues to work
- **📚 Modern Patterns**: TypeScript-first, result pattern error handling

### 🎯 When Contributing, Always Consider:

1. **Developer Experience First** - Eliminate manual work and reduce cognitive load
2. **Platform Differences** - Handle iOS/Android disparities transparently
3. **Type Safety** - Provide automatic inference with compile-time guarantees
4. **Documentation Excellence** - Explain the "why" behind solutions
5. **Backward Compatibility** - Never break existing code
6. **Performance** - Optimize for common use cases
7. **Testing** - Comprehensive coverage across platforms and scenarios

### 🚀 Ultimate Goal

Transform in-app purchases from a complex, error-prone process into something as simple as:

```typescript
const result = await requestPurchase({
  request: {sku: 'premium.product'},
  type: 'inapp',
});
```

While maintaining full power and flexibility for advanced enterprise use cases.
