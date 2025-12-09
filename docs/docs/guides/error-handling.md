import GreatFrontendBanner from "@site/src/uis/GreatFrontendBanner";

# Error Handling

<GreatFrontendBanner link="https://www.greatfrontend.com/behavioral-interview-playbook?fpr=hyo73" title="Behavioral interview questions" />

This guide covers best practices for handling errors in your expo-iap implementation.

## Overview

Expo IAP provides comprehensive error handling through standardized error codes and messages. All errors are returned as structured objects with consistent properties across iOS and Android platforms.

## Error Structure

```typescript
interface IapError {
  code: string;
  message: string;
  debugMessage?: string;
  underlyingError?: any;
}
```

## Common Error Scenarios

### Network Errors

Handle network connectivity issues gracefully:

```typescript
import {useIAP, ErrorCode} from 'expo-iap';

const {purchaseProduct} = useIAP();

try {
  await purchaseProduct('product_id');
} catch (error) {
  if (error.code === ErrorCode.NetworkError) {
    // Handle network issues
    showRetryDialog();
  }
}
```

### User Cancellation

Gracefully handle when users cancel purchases:

```typescript
import {ErrorCode} from 'expo-iap';

try {
  await purchaseProduct('product_id');
} catch (error) {
  if (error.code === ErrorCode.UserCancelled) {
    // User cancelled the purchase
    // Don't show error message, just continue
    return;
  }
}
```

### Payment Issues

Handle various payment-related errors:

```typescript
import {ErrorCode} from 'expo-iap';

try {
  await purchaseProduct('product_id');
} catch (error) {
  switch (error.code) {
    case ErrorCode.UserError:
      showMessage(
        'Invalid payment method. Please check your payment settings.',
      );
      break;
    case ErrorCode.IapNotAvailable:
      showMessage('Payments are not allowed on this device.');
      break;
    default:
      showMessage('Purchase failed. Please try again.');
  }
}
```

## Error Recovery Strategies

### Retry Logic

Implement exponential backoff for transient errors:

```typescript
import {ErrorCode} from 'expo-iap';

const retryWithBackoff = async (fn: () => Promise<any>, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      // Only retry on network or temporary errors
      if (
        [ErrorCode.NetworkError, ErrorCode.ServiceError].includes(error.code)
      ) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, i) * 1000),
        );
      } else {
        throw error;
      }
    }
  }
};
```

### Graceful Degradation

Provide fallback experiences:

```typescript
import {ErrorCode} from 'expo-iap';

const handlePurchase = async (productId: string) => {
  try {
    await purchaseProduct(productId);
  } catch (error) {
    if (error.code === ErrorCode.IapNotAvailable) {
      // Redirect to web subscription
      redirectToWebPurchase(productId);
    } else {
      showErrorMessage(error.message);
    }
  }
};
```

## Logging and Analytics

Track errors for debugging and analytics:

```typescript
const trackError = (error: IapError, context: string) => {
  console.error(`IAP Error in ${context}:`, error);

  // Send to analytics
  analytics.track('iap_error', {
    error_code: error.code,
    error_message: error.message,
    context,
    platform: Platform.OS,
  });
};
```

## Best Practices

### 1. Always Handle Errors

Never leave IAP operations without error handling:

```typescript
// ❌ Bad
purchaseProduct('product_id');

// ✅ Good
try {
  await purchaseProduct('product_id');
} catch (error) {
  handlePurchaseError(error);
}
```

### 2. Provide User-Friendly Messages

Convert technical errors to user-friendly messages:

```typescript
import {ErrorCode} from 'expo-iap';

const getUserFriendlyMessage = (error: IapError): string => {
  switch (error.code) {
    case ErrorCode.UserCancelled:
      return null; // Don't show message
    case ErrorCode.NetworkError:
      return 'Please check your internet connection and try again.';
    case ErrorCode.UserError:
      return 'There was an issue with your payment method.';
    default:
      return 'Something went wrong. Please try again later.';
  }
};
```

### 3. Handle Platform Differences

Some errors may be platform-specific:

```typescript
import {ErrorCode} from 'expo-iap';

const handlePlatformSpecificError = (error: IapError) => {
  if (Platform.OS === 'ios' && error.code === ErrorCode.ItemUnavailable) {
    showMessage('This product is not available in your country.');
  } else if (
    Platform.OS === 'android' &&
    error.code === ErrorCode.DeveloperError
  ) {
    // Log for debugging but don't show to user
    console.error('Google Play configuration error:', error);
  }
};
```

## See Also

- [Error Codes Reference](../api/error-codes) - Complete list of error codes
- [Use IAP Hook](../api/use-iap) - Main API documentation
- [Troubleshooting](./troubleshooting) - Common issues and solutions
- [Verification Error Handling](../api/methods/unified-apis#verification-error-handling) - Error handling for `verifyPurchaseWithProvider()`
