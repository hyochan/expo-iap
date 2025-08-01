# Changelog

## [2.7.7] - TBD

### Fixed

- iOS: Fixed hot reload issues with concurrent StoreKit operations
- iOS: Resolved race conditions in `Promise.all` usage
- iOS: Improved state cleanup on `initConnection()`
- Fixed `useIAP` hook's internal methods to use `requestProducts` instead of deprecated `getSubscriptions`

### Changed

- iOS: Added `ensureConnection()` pattern matching Android
- iOS: Simplified module architecture

## [2.7.6] - 2025-08-01

### Fixed

- Fixed `initConnection()` return type

### Documentation

- Added available-purchases example
- Improved build error FAQs
- Enhanced setup documentation

## [2.7.5] - 2025-07-24

### Added

- iOS promoted product support
- `promotedProductListenerIOS()`, `getPromotedProductIOS()`, `buyPromotedProductIOS()` methods
- Promoted product support in useIAP hook

### Changed

- Promoted product listener now returns full Product object
- Updated documentation and examples

### Fixed

- iOS build error in promoted product handler
- Type safety improvements

## [2.7.4] - 2025-07-24

### Fixed

- iOS 18.4+ availability check for `appTransactionID`
- TypeScript compatibility for older iOS versions

## [2.7.3] - 2025-07-23

### Fixed

- Android Google Play Billing Library v8.0.0 upgrade
- Kotlin version compatibility

### Changed

- Android requires Kotlin 2.0+
- Added expo-build-properties requirement

### Documentation

- Android configuration guide
- Kotlin version requirements

## [2.7.2] - 2025-07-22

### Added

- iOS 16.0+ app transaction support

## [2.7.1] - 2025-07-22

### Fixed

- Added missing `requestProducts()` API
- Fixed `getStorefrontIOS()` platform handling
- Documentation build fixes

### Changed

- Added deprecation warnings to `getProducts()` and `getSubscriptions()`

## [2.7.0] - 2025-07-22

### Added

- Platform-specific API for `requestPurchase`
- Google Play Billing Library v8.0.0 support
- Android automatic reconnection
- Detailed error codes

### Changed

- Deprecated `requestSubscription`
- Removed Android `getPurchaseHistory()`

### Breaking Changes

- Android: `getPurchaseHistory()` removed
- Android: Requires Google Play Billing v8.0.0
