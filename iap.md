# Expo IAP Documentation

## Installation in Managed Expo Projects

For [managed](https://docs.expo.dev/archive/managed-vs-bare/) Expo projects, follow the installation instructions in the [API documentation for the latest stable release](#api-documentation). If the link shows no documentation, this library isn't yet supported in managed workflows—it's likely awaiting inclusion in a future Expo SDK release.

## Installation in Bare React Native Projects

For bare React Native projects, ensure the [`expo` package is installed and configured](https://docs.expo.dev/bare/installing-expo-modules/) before proceeding.

### Add the Package to Your npm Dependencies

```bash
npm install expo-iap
```

### Configure for iOS

Run `npx pod-install` after installing the npm package. Since `expo-iap` uses `StoreKit2`, set the `deploymentTarget` to `15.0` or higher in your project configuration.

```json
"ios": {
  "deploymentTarget": "15.0"
}
```

### Configure for Android

No additional configuration is required beyond installing the package, as `expo-iap` leverages Google Play Billing internally.

## IAP Types

`expo-iap` supports the following In-App Purchase types, aligned with platform-specific APIs (Google Play Billing for Android, StoreKit2 for iOS).

### Consumable

- **Description**: Items that are used up after purchase and can be bought again (e.g., in-game currency, consumable boosts).
- **Behavior**: Requires consumption acknowledgment after purchase to allow repurchasing.
- **Platforms**: Supported on both Android and iOS.

### Non-Consumable

- **Description**: One-time purchases that users own permanently (e.g., ad removal, premium features).
- **Behavior**: Supports restoration of previous purchases; cannot be repurchased.
- **Platforms**: Supported on both Android and iOS.

### Subscription

- **Description**: Recurring purchases for ongoing access to content or services (e.g., monthly premium membership).
- **Behavior**: Includes auto-renewing options and restore functionality.
- **Platforms**: Supported on both Android and iOS, with platform-specific subscription details.

## Product Type

This section outlines the properties of products supported by `expo-iap`, including common fields shared across platforms and platform-specific extensions.

### Common Product Types

These properties are shared between Android and iOS, defined in `BaseProduct`.

| Property       | Type          | Description                       |
| -------------- | ------------- | --------------------------------- |
| `id`           | `string`      | Unique identifier for the product |
| `title`        | `string`      | Title of the product              |
| `description`  | `string`      | Description of the product        |
| `type`         | `ProductType` | Product type (inapp or subs)      |
| `displayName`  | `string?`     | Name for UI display (optional)    |
| `displayPrice` | `string?`     | Display price (optional)          |
| `price`        | `number?`     | Actual price (optional)           |
| `currency`     | `string?`     | Currency code (optional)          |

### Android-Only Product Types

- **`ProductAndroid`**

  - `name: string`: Product name (used instead of `displayName` on Android).
  - `oneTimePurchaseOfferDetails?: OneTimePurchaseOfferDetails`: Details for one-time purchases (e.g., price, currency).
  - `subscriptionOfferDetails?: SubscriptionOfferDetail[]`: Subscription offer details.

- **`SubscriptionProductAndroid`**
  - `subscriptionOfferDetails: SubscriptionOfferAndroid[]`: Subscription-specific offers, including base plan ID, offer token, and pricing phases.

### iOS-Only Product Types

- **`ProductIos`**

  - `displayPrice: string`: Price formatted for display.
  - `isFamilyShareable: boolean`: Indicates if the product supports family sharing.
  - `jsonRepresentation: string`: JSON representation from StoreKit2.
  - `subscription: SubscriptionInfo`: Subscription details (e.g., introductory offers, group ID).

- **`SubscriptionProductIos`**
  - `discounts?: Discount[]`: Discount details (e.g., identifier, price).
  - `introductoryPrice?: string`: Introductory pricing details (with additional iOS-specific fields like `introductoryPricePaymentModeIos`).

## Purchase Type

This section describes the properties of purchases supported by `expo-iap`, covering common fields and platform-specific extensions.

### Common Purchase Types

These properties are shared between Android and iOS, defined in `ProductPurchase`.

| Property             | Type      | Description                              |
| -------------------- | --------- | ---------------------------------------- |
| `id`                 | `string`  | ID of the purchased product              |
| `transactionId`      | `string?` | Unique transaction identifier (optional) |
| `transactionDate`    | `number`  | Purchase timestamp (Unix)                |
| `transactionReceipt` | `string`  | Transaction receipt data                 |
| `purchaseToken`      | `string?` | Purchase token (optional)                |

### Android-Only Purchase Types

- **`ProductPurchase` (Android Extensions)**

  - `ids?: string[]`: List of purchased product IDs.
  - `dataAndroid?: string`: Payment data.
  - `signatureAndroid?: string`: Signature data.
  - `autoRenewingAndroid?: boolean`: Auto-renewal status.
  - `purchaseStateAndroid?: PurchaseStateAndroid`: Purchase state (e.g., PURCHASED, PENDING).

- **`SubscriptionPurchase` (Android Extensions)**
  - `autoRenewingAndroid?: boolean`: Subscription auto-renewal status.

### iOS-Only Purchase Types

- **`ProductPurchase` (iOS Extensions)**

  - `quantityIos?: number`: Purchase quantity.
  - `originalTransactionDateIos?: number`: Original transaction date.
  - `originalTransactionIdentifierIos?: string`: Original transaction ID.
  - `verificationResultIos?: string`: Verification result.
  - `appAccountToken?: string`: App account token.
  - `expirationDateIos?: number`: Expiration date for subscriptions.
  - `webOrderLineItemIdIos?: number`: Web order line item ID.
  - `environmentIos?: string`: App Store environment.
  - `storefrontCountryCodeIos?: string`: App Store storefront country code.
  - `appBundleIdIos?: string`: App bundle ID.
  - `productTypeIos?: string`: Product type (e.g., "autoRenewable").
  - `subscriptionGroupIdIos?: string`: Subscription group ID.
  - `isUpgradedIos?: boolean`: Whether the subscription was upgraded.
  - `ownershipTypeIos?: string`: Ownership type (e.g., individual, family sharing).
  - `reasonIos?: string`: Transaction reason.
  - `transactionReasonIos?: string`: Detailed transaction reason.
  - `revocationDateIos?: number`: Date of revocation if refunded.
  - `revocationReasonIos?: string`: Reason for revocation.

- **`SubscriptionPurchase` (iOS Extensions)**
  - All the iOS-specific fields from `ProductPurchase`
  - Automatic subscription-specific handling based on product type

## Implementation Notes

### Platform-Uniform Purchase Handling

`expo-iap` now processes transactions directly to `Purchase` or `SubscriptionPurchase` types on both platforms:

- **iOS**: StoreKit 2 transactions are directly mapped to `Purchase`/`SubscriptionPurchase` objects with iOS-specific fields using camelCase naming convention (e.g., `expirationDateIos`).
- **Android**: Google Play Billing purchases are similarly mapped to the same types with Android-specific fields.

This approach eliminates intermediate conversion layers, making the code more maintainable while still providing access to platform-specific details when needed.
