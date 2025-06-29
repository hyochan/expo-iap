# Error Code Management in expo-iap

## Overview

expo-iap now provides a centralized error code management system that ensures consistent error handling across iOS and Android platforms. This system addresses the issue where different platforms used different error code formats (numeric codes on iOS, string codes on Android) and provides a unified approach.

## Problem Solved

Previously, users experienced inconsistent error codes:
- iOS returned numeric error codes (e.g., "2" for user cancellation)
- Android returned string error codes (e.g., "E_USER_CANCELLED" for user cancellation)
- The TypeScript enum didn't align with platform-specific implementations

## New Error Code System

### Centralized ErrorCode Enum

All error codes are now defined in a single `ErrorCode` enum:

```typescript
export enum ErrorCode {
  E_UNKNOWN = 'E_UNKNOWN',
  E_USER_CANCELLED = 'E_USER_CANCELLED',
  E_USER_ERROR = 'E_USER_ERROR',
  E_ITEM_UNAVAILABLE = 'E_ITEM_UNAVAILABLE',
  E_REMOTE_ERROR = 'E_REMOTE_ERROR',
  E_NETWORK_ERROR = 'E_NETWORK_ERROR',
  E_SERVICE_ERROR = 'E_SERVICE_ERROR',
  // ... and more
}
```

### Platform-Specific Mappings

The system automatically maps between the centralized enum and platform-specific codes:

```typescript
export const ErrorCodeMapping = {
  ios: {
    [ErrorCode.E_USER_CANCELLED]: 2,
    [ErrorCode.E_SERVICE_ERROR]: 1,
    // ... more mappings
  },
  android: {
    [ErrorCode.E_USER_CANCELLED]: 'E_USER_CANCELLED',
    [ErrorCode.E_SERVICE_ERROR]: 'E_SERVICE_ERROR',
    // ... more mappings
  },
};
```

## Usage

### Basic Error Handling

```typescript
import { ErrorCode, PurchaseError } from 'expo-iap';

// Handle purchase errors consistently
const handleError = (error: PurchaseError) => {
  switch (error.code) {
    case ErrorCode.E_USER_CANCELLED:
      console.log('User cancelled the purchase');
      break;
    case ErrorCode.E_ITEM_UNAVAILABLE:
      console.log('Item is not available');
      break;
    default:
      console.log('Purchase failed:', error.message);
  }
};
```

### Creating Errors from Platform Data

```typescript
import { PurchaseError } from 'expo-iap';

// Create properly typed errors from platform-specific data
const error = PurchaseError.fromPlatformError(rawErrorData, 'ios');
```

### Error Code Utilities

```typescript
import { ErrorCodeUtils, ErrorCode } from 'expo-iap';

// Convert platform-specific codes to standard enum
const errorCode = ErrorCodeUtils.fromPlatformCode(2, 'ios'); 
// Returns ErrorCode.E_USER_CANCELLED

// Convert standard enum to platform-specific code  
const iosCode = ErrorCodeUtils.toPlatformCode(ErrorCode.E_USER_CANCELLED, 'ios');
// Returns 2

// Check platform support
const isSupported = ErrorCodeUtils.isValidForPlatform(ErrorCode.E_USER_CANCELLED, 'ios');
// Returns true
```

## Migration Guide

### Before (Inconsistent)

```typescript
// iOS would return numeric codes
if (error.code === '2') {
  // Handle user cancellation
}

// Android would return string codes  
if (error.code === 'E_USER_CANCELLED') {
  // Handle user cancellation
}
```

### After (Consistent)

```typescript
import { ErrorCode } from 'expo-iap';

// Works consistently across platforms
if (error.code === ErrorCode.E_USER_CANCELLED) {
  // Handle user cancellation on both iOS and Android
}
```

## Implementation Details

### iOS Changes

- Removed the `IapErrors` enum from `Types.swift` entirely to eliminate native error code duplication
- Updated all error throwing in `ExpoIapModule.swift` to use string error codes directly (e.g., "E_USER_CANCELLED", "E_SERVICE_ERROR")
- Fixed user cancellation error to return `E_USER_CANCELLED` instead of the previous numeric code "2"
- Native StoreKit errors are now passed through directly while custom errors use standardized string codes

### Android Changes

- Android implementation already used proper string codes
- No changes needed to Android error handling

### TypeScript Changes

- Added comprehensive `ErrorCode` enum with all error types
- Added `ErrorCodeMapping` for platform-specific code conversion
- Added `ErrorCodeUtils` utility functions for error code management
- Enhanced `PurchaseError` class with platform-aware error creation

## Benefits

1. **Consistency**: Same error codes across iOS and Android
2. **Type Safety**: Full TypeScript support with proper enums
3. **Maintainability**: Single source of truth for error codes
4. **Debugging**: Better error messages and debugging information
5. **Future-Proof**: Easy to add new error codes consistently

## Breaking Changes

This is a **non-breaking change** for most users:
- Existing error handling will continue to work
- New error code system provides additional functionality
- Users can migrate gradually to the new system

The only potential breaking change is for iOS users who were checking for specific numeric error codes like "2" for user cancellation, which now correctly returns `ErrorCode.E_USER_CANCELLED`.
