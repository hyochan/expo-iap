# CHANGELOG

## [2.8.0] - 2025-08-18

### Breaking Changes

- **iOS Field Naming Convention**: All iOS-related field names ending with "Ios" have been renamed to end with "IOS" to follow the convention that acronyms at the end of field names should be uppercase.
  
  **Migration Guide**: See the full migration guide at [expo-iap.pages.dev/blog/v2-8-0-migration-guide](https://expo-iap.pages.dev/blog/v2-8-0-migration-guide)

  Affected fields:
  - `quantityIos` → `quantityIOS`
  - `expirationDateIos` → `expirationDateIOS`
  - `environmentIos` → `environmentIOS`
  - And all other iOS-suffixed fields

For older versions, checkout [Release Notes](https://github.com/hyochan/expo-iap/releases)
