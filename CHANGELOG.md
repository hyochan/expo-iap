# CHANGELOG

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
