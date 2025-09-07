# CHANGELOG

## [2.9.0] - 2025-09-05

### Added

- iOS: Integrated OpenIAP Apple v1.1.6
- Updated types to match OpenIAP v1.1.0 specification
- Enhanced error handling with `PurchaseError` type and native error code mapping
- New type system: `ProductRequest`, `RequestPurchaseProps`, `ReceiptValidationProps`
- Improved receipt validation with `ReceiptValidationResult`
- Root-level type re-exports to avoid deep imports (e.g., `ProductAndroid`, `ProductIOS`, `PaymentDiscount`)

### Changed

- Updated serializers for purchases/products to follow OpenIAP structure
- Updated listener setup to use new OpenIAP methods (`purchaseUpdatedListener`, `purchaseErrorListener`)
- Added unified `removeAllListeners()` for cleanup
- `showManageSubscriptionsIOS()` now returns updated subscriptions array (not boolean)

### Fixed

- Fixed duplicate purchase success alerts
- Fixed restore purchase alerts on screen entry
- Improved purchase validation logic

### Note

- Android native module integration with OpenIAP Android is planned for v3.0.0

## [2.8.8] - 2025-09-05

### Added

- Enhanced `ActiveSubscription` interface with backend validation fields:
  - `transactionId` - Transaction identifier for backend validation
  - `purchaseToken` - JWT token (iOS) or purchase token (Android) for backend validation
  - `transactionDate` - Transaction timestamp
- Return subscription changes from `showManageSubscriptionsIOS()` as Promise data

### Fixed

- Fixed iOS `getAvailablePurchases({ onlyIncludeActiveItemsIOS: true })` returning expired subscriptions
  - Now correctly uses `Transaction.currentEntitlements` for better performance and accuracy
- Fixed subscription status matching to specific SKU in `showManageSubscriptionsIOS()`
  - Prevents picking wrong status when multiple statuses exist in a subscription group

### Changed

- Removed unnecessary event sending from `getAvailableItems()` - events are only sent from `requestPurchase()`
- Removed polling logic from subscription status monitoring for cleaner code
- Updated to comply with OpenIAP v1.1.1 specification

## [2.8.7] - 2025-09-03

### Added

- `fetchProducts` function following OpenIAP terminology (replaces `requestProducts`)

### Deprecated

- `requestProducts` - Use `fetchProducts` instead (will be removed in v3.0.0)

### Changed

- Internal useIAP hook now uses `fetchProducts`
- Updated documentation and deprecation messages

## [2.8.6]

### Changed

- **BREAKING NAMING CONVENTION**: Added platform-specific suffixes to native functions for clarity
  - iOS functions now use `IOS` suffix (e.g., `getPromotedProductIOS`, `clearTransactionIOS`)
  - Android functions now use `Android` suffix (e.g., `acknowledgePurchaseAndroid`, `consumeProductAndroid`)
  - Common cross-platform functions remain without suffix (`requestProducts`, `requestPurchase`)
- Renamed `buyPromotedProductIOS` to `requestPurchaseOnPromotedProductIOS` for consistency

### Added

- Added `getPendingTransactionsIOS` function for iOS
- Added `clearTransactionIOS` function for iOS

### Deprecated

- `getPurchaseHistories` - Use `getAvailablePurchases` instead (will be removed in v2.9.0)
- `buyPromotedProductIOS` - Use `requestPurchaseOnPromotedProductIOS` instead (will be removed in v2.9.0)
- `disable` function - No longer needed, observer management is automatic (will be removed in v2.9.0)

## [2.8.5] - 2025-09-03

### Fixed

- Fixed Android `finishTransaction` null error by adding fallback to `purchaseTokenAndroid` (#180)

## [2.8.4] - 2025-08-31

### Fixed

- Fixed iOS 18.4 properties build failure on Xcode 16.3 and below by adding Swift 6.1 compiler guard

### Changed

- Android: Enabled automatic service reconnection (Android Billing Client v8 feature) and simplified connection logic (#178)

## [2.8.3] - 2025-08-27

### Fixed

- Fixed TypeScript type issues
- Added critical warning about iOS platform version in podspec (#169)

## [2.8.2] - 2025-08-26

### Added

- Added `platform` field to all IAP types for improved runtime type discrimination
- Consolidated `Purchase` types and deprecated legacy type aliases for consistency

### Changed

- Refactored and consolidated Purchase types to follow OpenIAP specification
- Improved type consistency across iOS and Android platforms

### Deprecated

**Note**: The following deprecated type aliases will be removed in v2.9.0:

- `ProductPurchase` (use `Purchase` instead)
- `SubscriptionPurchase` (use `Purchase` instead)

## [2.8.1] - 2025-08-19

### Added

- Added `debugDescription?: string` field to `ProductCommon` for debugging purposes
- Added `platform?: string` field to `ProductCommon` and `PurchaseCommon` for platform identification
- Added `platform: "ios"` to iOS-specific types (`ProductIOS`, `ProductSubscriptionIOS`, `PurchaseIOS`)
- Added `platform: "android"` to Android-specific types (`ProductAndroid`, `ProductSubscriptionAndroid`, `PurchaseAndroid`)
- Added `ids?: string[]` field to `PurchaseCommon` (moved from Android-specific types)

### Changed

- Moved common fields from platform-specific types to shared Common types
- Updated iOS native code to populate missing subscription fields:
  - `introductoryPriceAsAmountIOS`
  - `introductoryPricePaymentModeIOS`
  - `introductoryPriceNumberOfPeriodsIOS`
  - `introductoryPriceSubscriptionPeriodIOS`
  - `subscriptionPeriodNumberIOS`
  - `subscriptionPeriodUnitIOS`
- Updated Android native code to use common `ids` field instead of platform-specific `idsAndroid`

### Fixed

- Fixed type mismatches between Product and Purchase types across iOS and Android platforms
- Resolved missing field mappings in iOS native subscription data extraction
- Improved type consistency for cross-platform compatibility

### Deprecated

**Note**: No breaking changes in this release. The following deprecated fields will be removed in v2.9.0:

- Android: `idsAndroid` (use common `ids` field instead)
- Android: `name`, `oneTimePurchaseOfferDetails`, `subscriptionOfferDetails` (use fields with `Android` suffix)
- iOS: `displayName`, `isFamilyShareable`, `jsonRepresentation`, `subscription` (use fields with `IOS` suffix)
- iOS: `discounts`, `introductoryPrice` (use fields with `IOS` suffix)

## [2.8.0] - 2025-08-18

### Breaking Changes

- **iOS Field Naming Convention**: All iOS-related field names ending with "Ios" have been renamed to end with "IOS" to follow the convention that acronyms at the end of field names should be uppercase.

  **Migration Guide**: See the full migration guide at [expo-iap.hyo.dev/blog/v2-8-0-migration-guide](https://expo-iap.hyo.dev/blog/v2-8-0-migration-guide)

  Affected fields:

  - `quantityIos` → `quantityIOS`
  - `expirationDateIos` → `expirationDateIOS`
  - `environmentIos` → `environmentIOS`
  - And all other iOS-suffixed fields

For older versions, checkout [Release Notes](https://github.com/hyochan/expo-iap/releases)
