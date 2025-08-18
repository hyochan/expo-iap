# Implementation Guidelines

## Expo-Specific Guidelines

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

- **iOS-related code**: Use `IOS` in naming (e.g., `PurchaseIOS`, `SubscriptionOfferIOS`)
  - **Exception**: When an acronym appears at the end of a field name, use uppercase (e.g., `quantityIOS`, `appBundleIdIOS`, not `quantityIos`)
- **Android-related code**: Use `Android` in naming (e.g., `PurchaseAndroid`, `SubscriptionOfferAndroid`)
- **IAP-related code**: Use `Iap` in naming (e.g., `IapPurchase`, not `IAPPurchase`)
- **ID fields**: Use `Id` instead of `ID` in field names (e.g., `productId`, `transactionId`, not `productID`, `transactionID`)
  - This applies across all platforms for consistency
  - Examples: `productId`, `originalTransactionId`, `purchaseId`
- This applies to both functions, types, and file names

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
