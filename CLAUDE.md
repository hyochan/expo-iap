# Implementation Guidelines

## Commit Message Convention

- Follow the Angular Conventional Commits format: `<type>(<scope>): <subject>`
- Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`
- Scope is optional but recommended (for example: `auth`, `api`, `ui`)
- Subject must be imperative, lowercase, without a trailing period, and roughly 50 characters
- Wrap commit body lines near 72 characters and include footers such as `BREAKING CHANGE:` or `Closes #123` when needed

## Tooling & Package Management

- **Use Bun exclusively.** Run installs with `bun install`, scripts with `bun run <script>`, add deps via `bun add` / `bun add -d`.
- Do **not** suggest or create `package-lock.json` or `yarn.lock`; `bun.lock` is the single source of truth.

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

#### Function Naming

- Functions that only operate on one platform must carry the suffix: `nameIOS` or `nameAndroid` (e.g. `getStorefrontIOS`, `deepLinkToSubscriptionsAndroid`).
- Cross-platform helpers should expose a single name and branch internally via `Platform.select` or equivalent.

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

> **Important:** `src/types.ts` is generated from the OpenIAP schema. Never edit this file manually or commit hand-written changes. After updating any `*.graphql` schema, run `bun run generate:types` (or the equivalent script in your package manager) to refresh the file.

- Whenever you need Request/Params/Result types in the JS API surface (`src/index.ts`, hooks, modules, examples), import them directly from the generated `src/types.ts` (e.g., `MutationRequestPurchaseArgs`, `QueryFetchProductsArgs`). Bind exported functions with the generated `QueryField` / `MutationField` helpers so their signatures stay in lockstep with `types.ts` instead of redefining ad-hoc unions like `ProductTypeInput`.

### React/JSX Conventions

- **Conditional Rendering**: Use ternary operator with null instead of logical AND
  - ✅ Good: `{condition ? <Component /> : null}`
  - ❌ Avoid: `{condition && <Component />}`

### Hook API Semantics (useIAP)

- Inside the `useIAP` hook, most methods return `Promise<void>` and update internal state. Do not design examples or implementations that expect data from these methods.
  - Examples: `fetchProducts`, `requestProducts`, `getProducts`/`getSubscriptions` (deprecated helpers), `requestPurchase`, `getAvailablePurchases`.
  - After calling, consume state from the hook: `products`, `subscriptions`, `availablePurchases`, etc.
- Defined exceptions that DO return values in the hook:
  - `getActiveSubscriptions(subscriptionIds?) => Promise<ActiveSubscription[]>` (also updates `activeSubscriptions` state)
  - `hasActiveSubscriptions(subscriptionIds?) => Promise<boolean>`
- The root (index) API is value-returning and can be awaited to receive data directly. Use root API when not using React state.

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

### State Management with OpenIapStore

#### IapStatus Structure

The `IapStatus` struct provides standardized state management for OpenIAP operations:

```swift
public struct IapStatus {
    public var loadings: LoadingStates = LoadingStates()
    public var lastPurchaseResult: PurchaseResultData?
    public var lastError: ErrorData?
    // ...
}

public struct LoadingStates {
    public var initConnection: Bool = false
    public var fetchProducts: Bool = false
    public var restorePurchases: Bool = false
    public var purchasing: Set<String> = []  // Product IDs currently being purchased
}
```

#### Usage Guidelines

- **OpenIapStore** manages data state only, not UI state
- UI components should manage their own display state (alerts, sheets, etc.)
- Loading states are automatically managed within OpenIapStore
- Use `status.loadings.purchasing.contains(productId)` to check if a specific product is being purchased
- Use `status.isLoading` computed property to check if any operation is in progress

## Documentation Guidelines

### Blog Post Conventions

- **Title format**: Use version number only (e.g., `v2.8.7 - Feature Description`, not `Expo IAP v2.8.7 - Feature Description`)
- **Heading format**: Use version number only in headings (e.g., `# v2.8.7 Release Notes`, not `# Expo IAP v2.8.7 Release Notes`)
