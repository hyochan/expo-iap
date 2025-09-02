# CHANGELOG

## [2.8.6] - TBD

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
