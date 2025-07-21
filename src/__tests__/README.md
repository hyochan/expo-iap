# expo-iap Tests

This directory contains comprehensive tests for the expo-iap library, covering purchase flows, API changes, and platform-specific behaviors.

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

### purchaseFlow.test.ts
Comprehensive tests for the purchase flow functionality:
- Purchase listener setup and cleanup
- iOS single product purchase handling
- Android multiple product purchase handling
- Subscription purchase flows for both platforms
- Receipt validation with platform-specific requirements
- Error handling for various scenarios
- Purchase restoration and recovery
- Transaction completion and state management

Key scenarios covered:
- User cancellation handling
- Network error recovery
- Product unavailability
- Already owned products
- Platform-specific price display
- Consumable vs non-consumable products

### advancedPurchaseScenarios.test.ts
Tests for advanced and edge-case scenarios:
- Pending and deferred purchases
- Subscription status checking (active, expired, cancelled)
- Multiple simultaneous purchases on Android
- iOS promoted products
- Receipt validation timeouts and retries
- Purchase completion after app restart
- Product price changes
- Sync errors and recovery

## Example App Tests

### example/app/__tests__/purchase-flow.test.tsx
Integration tests for the purchase-flow.tsx component:
- Component rendering and state management
- Product display and pricing
- Purchase button interactions
- Success and error handling
- Platform-specific UI behavior
- Loading and disconnected states

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test purchaseFlow.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="subscription"
```

## Platform Differences

The tests cover important platform differences:

### iOS
- Single product purchases (`sku` parameter)
- Receipt validation requires only SKU
- Subscription expiration dates
- Promoted products support

### Android
- Multiple product purchases (`skus` array)
- Receipt validation requires packageName, productToken, and accessToken
- Auto-renewal status
- Subscription offer tokens

## Test Coverage Areas

1. **Purchase Flow**
   - Event-driven purchase handling
   - Asynchronous purchase completion
   - State management through hooks

2. **Error Handling**
   - User cancellation (silent)
   - Network errors
   - Product unavailability
   - Already owned items

3. **Subscriptions**
   - Status checking
   - Offer handling
   - Renewal management
   - Expiration tracking

4. **Receipt Validation**
   - Platform-specific parameters
   - Server-side validation simulation
   - Retry logic

5. **Edge Cases**
   - App restart recovery
   - Pending transactions
   - Price updates
   - Sync failures

## Naming Convention

As of v2.6.0, the library uses plural forms for consistency:
- State: `purchaseHistories` (not `purchaseHistory`)
- Method: `getPurchaseHistories()` (not `getPurchaseHistory()`)
- Hook return: `{ purchaseHistories, getPurchaseHistories }`

The singular form `getPurchaseHistory()` is deprecated and will be removed in v3.0.0.