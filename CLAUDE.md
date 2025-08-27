# Implementation Guidelines

## Release Notes

### v2.8.1 (2025-08-19)

- Added `platform` field to all types for runtime type discrimination
- Moved common fields to shared base types (`ids`, `debugDescription`)
- Fixed iOS native code to populate missing subscription fields
- No breaking changes, but deprecated fields will be removed in v2.9.0

### v2.8.0 (2025-08-18)

- **Breaking**: iOS field naming convention changed (e.g., `quantityIos` → `quantityIOS`)
- All iOS-related field names ending with "Ios" now end with "IOS"

## Expo-Specific Guidelines

### iOS Pod Configuration

**CRITICAL WARNING**: Never modify the platform versions in `ios/ExpoIap.podspec`

- Both iOS and tvOS platform versions MUST remain at `13.4` even though the code requires iOS/tvOS 15.0+
- Changing to `15.0` can cause expo prebuild to exclude the module in certain Expo SDKs (known bug)
- See issue: [#168](https://github.com/hyochan/expo-iap/issues/168)
- This is kept at `13.4` for compatibility with affected Expo SDKs
- The actual iOS/tvOS 15.0+ requirement is enforced at build time via @available annotations
- Users must ensure their app target is set to iOS 15.0 or higher:
  - app.json: `"expo": { "ios": { "deploymentTarget": "15.0" } }`
  - or app.config.ts: `ios: { deploymentTarget: '15.0' }`

### Pre-Commit Checks

Before committing any changes:

1. Run `bun run lint` to ensure code quality
2. Run `bun run typecheck` to verify TypeScript types
3. Run `bun run test` to verify all tests pass (Note: Use `bun run test`, not `bun test`)
4. **IMPORTANT**: Run tests in the example directory as well:
   - `cd example && bun run test`
   - Ensure all tests pass with 100% success rate
   - Fix any failing tests before committing
5. Only commit if all checks succeed

### Platform-Specific Naming Conventions

#### Field Naming

- **iOS-related fields**: Use `IOS` suffix (e.g., `displayNameIOS`, `discountsIOS`, `introductoryPriceIOS`)
  - **Exception**: When an acronym appears at the end of a field name, use uppercase (e.g., `quantityIOS`, `appBundleIdIOS`, not `quantityIos`)
  - Platform-specific fields: `currencyCodeIOS`, `currencySymbolIOS`, `countryCodeIOS`
  - Product fields: `isFamilyShareableIOS`, `jsonRepresentationIOS`, `subscriptionInfoIOS`
- **Android-related fields**: Use `Android` suffix (e.g., `nameAndroid`)
  - Platform-specific fields: `oneTimePurchaseOfferDetailsAndroid`, `subscriptionOfferDetailsAndroid`
  - Keep `pricingPhases` (not `pricingPhasesAndroid`) for consistency with Google Play Billing
- **Common fields**: Fields shared across platforms go in Common types (e.g., `ids`, `platform`, `debugDescription`)
  - Use these for data that exists on both platforms without platform-specific variations

#### Type Naming

- **iOS types**: Use `IOS` suffix (e.g., `PurchaseIOS`, `ProductIOS`)
- **Android types**: Use descriptive prefixes to identify subtypes:
  - ✅ Good: `ProductAndroidOneTimePurchaseOfferDetail`, `ProductSubscriptionAndroidOfferDetails`, `PurchaseAndroidState`
  - ❌ Avoid: `OneTimePurchaseOfferDetails`, `SubscriptionOfferAndroid`, `PurchaseStateAndroid`
- **General IAP types**: Use `Iap` prefix (e.g., `IapPurchase`, not `IAPPurchase`)

#### General Rules

- **ID fields**: Use `Id` instead of `ID` (e.g., `productId`, `transactionId`, not `productID`, `transactionID`)
- **Consistent naming**: This applies to functions, types, and file names
- **Deprecation**: Fields without platform suffixes will be removed in v2.9.0

### Type System

For complete type definitions and documentation, see: <https://www.openiap.dev/docs/types>

The library follows the OpenIAP type specifications with platform-specific extensions using iOS/Android suffixes.

### React/JSX Conventions

- **Conditional Rendering**: Use ternary operator with null instead of logical AND
  - ✅ Good: `{condition ? <Component /> : null}`
  - ❌ Avoid: `{condition && <Component />}`

### API Method Naming

- Functions that depend on event results should use `request` prefix (e.g., `requestPurchase`, `requestSubscription`)
- Follow OpenIAP terminology: <https://www.openiap.dev/docs/apis#terminology>
- Do not use generic prefixes like `get`, `find` - refer to the official terminology

## IAP-Specific Guidelines

### OpenIAP Specification

All implementations must follow the OpenIAP specification:

- **APIs**: <https://www.openiap.dev/docs/apis>
- **Types**: <https://www.openiap.dev/docs/types>
- **Events**: <https://www.openiap.dev/docs/events>
- **Errors**: <https://www.openiap.dev/docs/errors>

### Feature Development Process

For new feature proposals:

1. Before implementing, discuss at: <https://github.com/hyochan/openiap.dev/discussions>
2. Get community feedback and consensus
3. Ensure alignment with OpenIAP standards
4. Implement following the agreed specification
