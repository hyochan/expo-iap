# Changelog

## [2.7.1] - 2025-07-22

### Fixed
- Add missing `requestProducts()` API that was discussed in PR #109 but not included in the merge
- Add deprecation warnings to `getProducts()` and `getSubscriptions()` 
- Fix `getStorefrontIOS()` to show warning instead of throwing error on non-iOS platforms
- Add `requestProducts` to useIap hook for consistency with other APIs
- Fix documentation CI build failures (broken anchors, missing tags, truncation marker)

## [2.7.0] - 2025-07-22

### Added
- New platform-specific API structure for `requestPurchase` with explicit `ios` and `android` parameters
- Support for Google Play Billing Library v8.0.0
- Automatic service reconnection on Android for improved reliability
- Detailed sub-response error codes for better error handling

### Changed
- Deprecated `requestSubscription` in favor of `requestPurchase` with `type: 'subs'`
- `getPurchaseHistory` is no longer available on Android (removed in Google Play Billing v8)

### Breaking Changes
- Android: `getPurchaseHistory()` removed - use `getAvailablePurchases()` instead
- Android: Requires Google Play Billing Library v8.0.0