# expo-iap Tests

This directory contains tests for the expo-iap library, with a focus on the purchase history naming convention changes introduced in v2.6.0.

## Test Files

### purchaseHistory.test.ts
Tests for the purchase history API methods:
- `getPurchaseHistory()` - Deprecated method that should show a warning
- `getPurchaseHistories()` - New plural method that replaces the deprecated one

Key test cases:
- Deprecation warning is shown when using the old method
- The deprecated method still works by calling the new method internally
- Platform-specific implementations (iOS and Android)
- Default parameter handling

### useIap.test.ts
Tests for the useIAP React hook:
- Ensures the hook uses `purchaseHistories` (plural) in its state
- Ensures the hook exposes `getPurchaseHistories()` method (plural)
- Verifies the deprecated singular forms are not exposed
- Tests initialization and cleanup behavior

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

## Naming Convention

As of v2.6.0, the library uses plural forms for consistency:
- State: `purchaseHistories` (not `purchaseHistory`)
- Method: `getPurchaseHistories()` (not `getPurchaseHistory()`)
- Hook return: `{ purchaseHistories, getPurchaseHistories }`

The singular form `getPurchaseHistory()` is deprecated and will be removed in v3.0.0.