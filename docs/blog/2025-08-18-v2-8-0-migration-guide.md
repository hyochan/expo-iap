---
slug: v2-8-0-migration-guide
title: v2.8.0 Migration Guide - iOS Field Naming Convention Update
authors: [hyochan]
tags: [release, breaking-change, migration]
---

# Migrating to expo-iap v2.8.0

## Breaking Changes

Version 2.8.0 introduces a naming convention change for iOS-related field names. Fields with iOS suffixes now use uppercase `IOS` instead of `Ios` to follow the convention that acronyms at the end of field names should be uppercase.

<!-- truncate -->

## What Changed

### Field Name Updates

All iOS-related field names ending with "Ios" have been renamed to end with "IOS":

| Old Field Name                     | New Field Name                     |
| ---------------------------------- | ---------------------------------- |
| `quantityIos`                      | `quantityIOS`                      |
| `originalTransactionDateIos`       | `originalTransactionDateIOS`       |
| `originalTransactionIdentifierIos` | `originalTransactionIdentifierIOS` |
| `appBundleIdIos`                   | `appBundleIdIOS`                   |
| `productTypeIos`                   | `productTypeIOS`                   |
| `subscriptionGroupIdIos`           | `subscriptionGroupIdIOS`           |
| `webOrderLineItemIdIos`            | `webOrderLineItemIdIOS`            |
| `expirationDateIos`                | `expirationDateIOS`                |
| `isUpgradedIos`                    | `isUpgradedIOS`                    |
| `ownershipTypeIos`                 | `ownershipTypeIOS`                 |
| `revocationDateIos`                | `revocationDateIOS`                |
| `revocationReasonIos`              | `revocationReasonIOS`              |
| `transactionReasonIos`             | `transactionReasonIOS`             |
| `environmentIos`                   | `environmentIOS`                   |
| `storefrontCountryCodeIos`         | `storefrontCountryCodeIOS`         |
| `reasonIos`                        | `reasonIOS`                        |
| `offerIos`                         | `offerIOS`                         |
| `priceIos`                         | `priceIOS`                         |
| `currencyIos`                      | `currencyIOS`                      |
| `jwsRepresentationIos`             | `jwsRepresentationIOS`             |
| `reasonStringRepresentationIos`    | `reasonStringRepresentationIOS`    |

## How to Migrate

### Step 1: Update Field References

Search your codebase for any references to the old field names and update them:

```typescript
// Before (v2.7.x)
const purchase = await requestPurchase({sku: 'product-id'});
if (purchase.expirationDateIos) {
  console.log('Expires:', purchase.expirationDateIos);
}

// After (v2.8.0)
const purchase = await requestPurchase({sku: 'product-id'});
if (purchase.expirationDateIOS) {
  console.log('Expires:', purchase.expirationDateIOS);
}
```

### Step 2: Update Type Imports and Declarations

Type names have also been updated to use uppercase `IOS`:

```typescript
// Before (v2.7.x)
import { ProductIos, ProductPurchaseIos, SubscriptionProductIos, ProductStatusIos } from 'expo-iap';

// After (v2.8.0)
import { ProductIOS, ProductPurchaseIOS, SubscriptionProductIOS, ProductStatusIOS } from 'expo-iap';
```

**Note:** The old type names are still available as deprecated aliases for backward compatibility, but we recommend updating to the new names.

### Step 3: Update Type Checks

If you're using TypeScript and checking for iOS-specific fields:

```typescript
// Before (v2.7.x)
if ('expirationDateIos' in purchase) {
  // Handle subscription
}

// After (v2.8.0)
if ('expirationDateIOS' in purchase) {
  // Handle subscription
}
```

### Step 4: Update Subscription Helpers

If you're using the subscription helper functions:

```typescript
// Before (v2.7.x)
const subscription = {
  expirationDateIos: purchase.expirationDateIos,
  environmentIos: purchase.environmentIos,
};

// After (v2.8.0)
const subscription = {
  expirationDateIOS: purchase.expirationDateIOS,
  environmentIOS: purchase.environmentIOS,
};
```

## Quick Migration Script

You can use this regex find/replace pattern in your IDE to quickly update most occurrences:

**Find Pattern (Regex):**

```text
\b(\w+)(Ios)\b
```

**Replace Pattern:**

```text
$1IOS
```

⚠️ **Note:** Review each replacement carefully as this might affect non-field references.

## Why This Change?

This change aligns with standard naming conventions where acronyms at the end of identifiers are written in uppercase (e.g., `userID`, `appURL`, `configJSON`). This makes the codebase more consistent and follows widely-adopted conventions in the TypeScript/JavaScript ecosystem.

## Need Help?

If you encounter any issues during migration:

- Check our [GitHub Issues](https://github.com/hyochan/expo-iap/issues)
- Join our [Discord community](https://discord.gg/example)
- Review the [full documentation](https://expo-iap.pages.dev)
