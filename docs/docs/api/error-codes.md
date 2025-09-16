---
sidebar_position: 2
---

import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# Error Codes

<AdFitTopFixed />

Expo IAP provides a centralized error handling system with platform-specific error code mapping. This ensures consistent error handling across iOS and Android platforms.

## Error Code Enum

### ErrorCode

The `ErrorCode` enum provides standardized error codes that map to platform-specific errors:

```tsx
import {ErrorCode} from 'expo-iap';

enum ErrorCode {
  E_UNKNOWN = 'E_UNKNOWN',
  E_USER_CANCELLED = 'E_USER_CANCELLED',
  E_USER_ERROR = 'E_USER_ERROR',
  E_ITEM_UNAVAILABLE = 'E_ITEM_UNAVAILABLE',
  E_REMOTE_ERROR = 'E_REMOTE_ERROR',
  E_NETWORK_ERROR = 'E_NETWORK_ERROR',
  E_SERVICE_ERROR = 'E_SERVICE_ERROR',
  E_RECEIPT_FAILED = 'E_RECEIPT_FAILED',
  E_RECEIPT_FINISHED_FAILED = 'E_RECEIPT_FINISHED_FAILED',
  E_NOT_PREPARED = 'E_NOT_PREPARED',
  E_NOT_ENDED = 'E_NOT_ENDED',
  E_ALREADY_OWNED = 'E_ALREADY_OWNED',
  E_DEVELOPER_ERROR = 'E_DEVELOPER_ERROR',
  E_BILLING_RESPONSE_JSON_PARSE_ERROR = 'E_BILLING_RESPONSE_JSON_PARSE_ERROR',
  E_DEFERRED_PAYMENT = 'E_DEFERRED_PAYMENT',
  E_INTERRUPTED = 'E_INTERRUPTED',
  E_IAP_NOT_AVAILABLE = 'E_IAP_NOT_AVAILABLE',
  E_PURCHASE_ERROR = 'E_PURCHASE_ERROR',
  E_SYNC_ERROR = 'E_SYNC_ERROR',
  E_TRANSACTION_VALIDATION_FAILED = 'E_TRANSACTION_VALIDATION_FAILED',
  E_ACTIVITY_UNAVAILABLE = 'E_ACTIVITY_UNAVAILABLE',
  E_ALREADY_PREPARED = 'E_ALREADY_PREPARED',
  E_PENDING = 'E_PENDING',
  E_CONNECTION_CLOSED = 'E_CONNECTION_CLOSED',
}
```

## Error Descriptions

### Common Errors

#### E_UNKNOWN

- **Description**: Unknown or unspecified error
- **When it occurs**: Fallback for unmapped errors
- **User action**: General error handling, retry or contact support

#### E_USER_CANCELLED

- **Description**: User cancelled the purchase
- **When it occurs**: User taps "Cancel" in the payment dialog
- **User action**: No action needed, this is normal user behavior

#### E_NETWORK_ERROR

- **Description**: Network connection failed
- **When it occurs**: No internet connection or network timeout
- **User action**: Check internet connection and retry

#### E_SERVICE_ERROR

- **Description**: App Store/Play Store service error
- **When it occurs**: Store servers are down or experiencing issues
- **User action**: Try again later

#### E_ITEM_UNAVAILABLE

- **Description**: The requested item is not available for purchase
- **When it occurs**: Product not found in store or not available in user's region
- **User action**: Check product availability

### iOS-Specific Errors

#### E_RECEIPT_FAILED

- **Description**: Receipt validation failed
- **When it occurs**: Invalid receipt data or validation error
- **User action**: Retry purchase or contact support

#### E_DEFERRED_PAYMENT

- **Description**: Payment is deferred (requires parental approval)
- **When it occurs**: Family Sharing with Ask to Buy enabled
- **User action**: Wait for approval

#### E_TRANSACTION_VALIDATION_FAILED

- **Description**: Transaction validation failed
- **When it occurs**: StoreKit transaction validation error
- **User action**: Retry or contact support

### Android-Specific Errors

#### E_BILLING_RESPONSE_JSON_PARSE_ERROR

- **Description**: Failed to parse billing response
- **When it occurs**: Invalid response from Google Play Billing
- **User action**: Retry purchase

#### E_ALREADY_OWNED

- **Description**: User already owns this item
- **When it occurs**: Attempting to buy a non-consumable product already owned
- **User action**: Restore purchases or contact support

## PurchaseError Class

### Constructor

```tsx
class PurchaseError implements Error {
  constructor(
    public name: string,
    public message: string,
    public responseCode?: number,
    public debugMessage?: string,
    public code?: ErrorCode,
    public productId?: string,
    public platform?: 'ios' | 'android',
  );
}
```

### Static Methods

#### fromPlatformError

Creates a `PurchaseError` from platform-specific error data:

```tsx
static fromPlatformError(
  errorData: any,
  platform: 'ios' | 'android',
): PurchaseError
```

**Example**:

```tsx
const error = PurchaseError.fromPlatformError(
  {code: 2, message: 'User cancelled'},
  'ios',
);
console.log(error.code); // ErrorCode.UserCancelled
```

### Instance Methods

#### getPlatformCode

Gets the platform-specific error code:

```tsx
getPlatformCode(): string | number | undefined
```

**Example**:

```tsx
const error = new PurchaseError(
  'PurchaseError',
  'User cancelled',
  undefined,
  undefined,
  ErrorCode.UserCancelled,
  'com.app.premium',
  'ios',
);

console.log(error.getPlatformCode()); // 2 (iOS code)
```

## ErrorCodeUtils

Utility functions for error code mapping and validation.

### getNativeErrorCode

Gets the native error code for the current platform:

```tsx
ErrorCodeUtils.getNativeErrorCode(errorCode: ErrorCode): string
```

**Example**:

```tsx
const nativeCode = ErrorCodeUtils.getNativeErrorCode(ErrorCode.UserCancelled);
console.log(nativeCode); // Platform-specific code
```

### fromPlatformCode

Maps platform-specific error code to standardized ErrorCode:

```tsx
ErrorCodeUtils.fromPlatformCode(
  platformCode: string | number,
  platform: 'ios' | 'android',
): ErrorCode
```

**Example**:

```tsx
// iOS
const errorCode = ErrorCodeUtils.fromPlatformCode(2, 'ios');
console.log(errorCode); // ErrorCode.UserCancelled

// Android
const errorCode = ErrorCodeUtils.fromPlatformCode(
  'E_USER_CANCELLED',
  'android',
);
console.log(errorCode); // ErrorCode.UserCancelled
```

### toPlatformCode

Maps ErrorCode to platform-specific code:

```tsx
ErrorCodeUtils.toPlatformCode(
  errorCode: ErrorCode,
  platform: 'ios' | 'android',
): string | number
```

**Example**:

```tsx
// iOS
const iosCode = ErrorCodeUtils.toPlatformCode(ErrorCode.UserCancelled, 'ios');
console.log(iosCode); // 2

// Android
const androidCode = ErrorCodeUtils.toPlatformCode(
  ErrorCode.UserCancelled,
  'android',
);
console.log(androidCode); // 'E_USER_CANCELLED'
```

### isValidForPlatform

Checks if error code is valid for the specified platform:

```tsx
ErrorCodeUtils.isValidForPlatform(
  errorCode: ErrorCode,
  platform: 'ios' | 'android',
): boolean
```

**Example**:

```tsx
const isValid = ErrorCodeUtils.isValidForPlatform(
  ErrorCode.UserCancelled,
  'ios',
);
console.log(isValid); // true
```

## Platform Error Code Mappings

### iOS Error Codes

| ErrorCode          | iOS Code | StoreKit Error             |
| ------------------ | -------- | -------------------------- |
| E_UNKNOWN          | 0        | SKErrorUnknown             |
| E_USER_CANCELLED   | 2        | SKErrorPaymentCancelled    |
| E_SERVICE_ERROR    | 1        | SKErrorClientInvalid       |
| E_ITEM_UNAVAILABLE | 4        | SKErrorProductNotAvailable |
| E_NETWORK_ERROR    | 6        | SKErrorNetworkError        |

### Android Error Codes

| ErrorCode          | Android Code       | Billing Response    |
| ------------------ | ------------------ | ------------------- |
| E_UNKNOWN          | E_UNKNOWN          | BILLING_UNAVAILABLE |
| E_USER_CANCELLED   | E_USER_CANCELLED   | USER_CANCELED       |
| E_SERVICE_ERROR    | E_SERVICE_ERROR    | SERVICE_UNAVAILABLE |
| E_ITEM_UNAVAILABLE | E_ITEM_UNAVAILABLE | ITEM_UNAVAILABLE    |
| E_DEVELOPER_ERROR  | E_DEVELOPER_ERROR  | DEVELOPER_ERROR     |

## Usage Examples

### Basic Error Handling

```tsx
import {useIAP, ErrorCode, PurchaseError} from 'expo-iap';

const {requestPurchase} = useIAP({
  onPurchaseError: (error: PurchaseError) => {
    console.log('Error details:', {
      code: error.code,
      message: error.message,
      platform: error.platform,
      platformCode: error.getPlatformCode(),
    });

    switch (error.code) {
      case ErrorCode.UserCancelled:
        // Don't show error for user cancellation
        break;
      case ErrorCode.NetworkError:
        Alert.alert('Network Error', 'Please check your internet connection');
        break;
      case ErrorCode.ItemUnavailable:
        Alert.alert('Item Unavailable', 'This item is not available');
        break;
      default:
        Alert.alert('Purchase Failed', error.message);
    }
  },
});
```

### Advanced Error Handling with Retry Logic

```tsx
const handlePurchaseWithRetry = async (productId: string, retryCount = 0) => {
  const MAX_RETRIES = 2;

  try {
    await requestPurchase({
      request: {
        ios: {sku: productId},
        android: {skus: [productId]},
      },
    });
  } catch (error: any) {
    const purchaseError = PurchaseError.fromPlatformError(error, Platform.OS);

    // Determine if we should retry
    const retryableErrors = [
      ErrorCode.NetworkError,
      ErrorCode.ServiceError,
      ErrorCode.Interrupted,
    ];

    const shouldRetry =
      retryableErrors.includes(purchaseError.code!) && retryCount < MAX_RETRIES;

    if (shouldRetry) {
      console.log(`Retrying purchase (${retryCount + 1}/${MAX_RETRIES})`);
      setTimeout(() => {
        handlePurchaseWithRetry(productId, retryCount + 1);
      }, 1000);
    } else {
      handlePurchaseError(purchaseError);
    }
  }
};
```

### Error Logging and Analytics

```tsx
const logError = (error: PurchaseError) => {
  // Log to analytics service
  analytics.track('purchase_error', {
    error_code: error.code,
    platform_code: error.getPlatformCode(),
    platform: error.platform,
    product_id: error.productId,
    message: error.message,
  });

  // Log to crash reporting
  crashlytics.recordError(error);
};

const {requestPurchase} = useIAP({
  onPurchaseError: (error) => {
    logError(error);
    showUserFriendlyError(error);
  },
});
```

## Best Practices

1. **Always validate receipts server-side**: While Expo IAP provides built-in `validateReceiptIos` and `validateReceiptAndroid` functions for client-side validation, this is not safe for production. Always implement server-side receipt validation for both platforms:

   - [iOS Receipt Validation](https://developer.apple.com/documentation/storekit/validating-receipts-with-the-app-store)
   - [Android Receipt Validation](https://developer.android.com/google/play/licensing/server-side-verification)

   **Important**: Always call `finishTransaction` after successful receipt validation. Failing to finish transactions may result in automatic purchase cancellation.

2. **Understand the purchase lifecycle**: Familiarize yourself with the complete purchase flow and lifecycle management. See [Purchase Lifecycle Guide](../guides/lifecycle) for detailed information.

3. **Implement comprehensive error handling**: Use the error codes for proper error handling logic. See [Error Codes Reference](./error-codes) for complete error handling patterns.

4. **Test thoroughly**: Test with sandbox accounts and real devices. In-app purchases don't work in simulators/emulators.

5. **Restore purchases**: Implement purchase restoration for non-consumable products and subscriptions.

6. **Use open-source solutions for server validation**: Consider these libraries to make server-side validation easier:
   - [iap](https://github.com/jeremybarbet/iap) - Universal IAP validation library
   - [node-apple-receipt-verify](https://github.com/ladeiko/node-apple-receipt-verify) - Apple receipt validation for Node.js

## See Also

- [Error Handling Guide](../api/error-handling)
- [useIAP Hook](./use-iap)
- [Types Reference](./types)
- [Troubleshooting](../guides/troubleshooting)
