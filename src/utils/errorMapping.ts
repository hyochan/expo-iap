/**
 * Error mapping utilities for expo-iap
 * Provides helper functions for handling platform-specific errors
 */

import {ErrorCode} from '../ExpoIap.types';

/**
 * Checks if an error is a user cancellation
 * @param error Error object or error code
 * @returns True if the error represents user cancellation
 */
export function isUserCancelledError(error: any): boolean {
  if (typeof error === 'string') {
    return error === ErrorCode.UserCancelled;
  }

  if (error && error.code) {
    return error.code === ErrorCode.UserCancelled;
  }

  return false;
}

/**
 * Checks if an error is related to network connectivity
 * @param error Error object or error code
 * @returns True if the error is network-related
 */
export function isNetworkError(error: any): boolean {
  const networkErrors = [
    ErrorCode.NetworkError,
    ErrorCode.RemoteError,
    ErrorCode.ServiceError,
    ErrorCode.ServiceDisconnected,
    ErrorCode.BillingUnavailable,
  ];

  const errorCode = typeof error === 'string' ? error : error?.code;
  return networkErrors.includes(errorCode);
}

/**
 * Checks if an error is recoverable (user can retry)
 * @param error Error object or error code
 * @returns True if the error is potentially recoverable
 */
export function isRecoverableError(error: any): boolean {
  const recoverableErrors = [
    ErrorCode.NetworkError,
    ErrorCode.RemoteError,
    ErrorCode.ServiceError,
    ErrorCode.Interrupted,
    ErrorCode.ServiceDisconnected,
    ErrorCode.BillingUnavailable,
    ErrorCode.QueryProduct,
    ErrorCode.InitConnection,
  ];

  const errorCode = typeof error === 'string' ? error : error?.code;
  return recoverableErrors.includes(errorCode);
}

/**
 * Gets a user-friendly error message for display
 * @param error Error object or error code
 * @returns User-friendly error message
 */
export function getUserFriendlyErrorMessage(error: any): string {
  const errorCode = typeof error === 'string' ? error : error?.code;

  switch (errorCode) {
    case ErrorCode.UserCancelled:
      return 'Purchase was cancelled by user';
    case ErrorCode.NetworkError:
      return 'Network connection error. Please check your internet connection and try again.';
    case ErrorCode.ReceiptFinished:
      return 'Receipt already finished';
    case ErrorCode.ServiceDisconnected:
      return 'Billing service disconnected. Please try again.';
    case ErrorCode.BillingUnavailable:
      return 'Billing is unavailable on this device or account.';
    case ErrorCode.ItemUnavailable:
      return 'This item is not available for purchase';
    case ErrorCode.ItemNotOwned:
      return "You don't own this item";
    case ErrorCode.AlreadyOwned:
      return 'You already own this item';
    case ErrorCode.SkuNotFound:
      return 'Requested product could not be found';
    case ErrorCode.SkuOfferMismatch:
      return 'Selected offer does not match the SKU';
    case ErrorCode.DeferredPayment:
      return 'Payment is pending approval';
    case ErrorCode.NotPrepared:
      return 'In-app purchase is not ready. Please try again later.';
    case ErrorCode.ServiceError:
      return 'Store service error. Please try again later.';
    case ErrorCode.FeatureNotSupported:
      return 'This feature is not supported on this device.';
    case ErrorCode.TransactionValidationFailed:
      return 'Transaction could not be verified';
    case ErrorCode.ReceiptFailed:
      return 'Receipt processing failed';
    case ErrorCode.EmptySkuList:
      return 'No product IDs provided';
    case ErrorCode.InitConnection:
      return 'Failed to initialize billing connection';
    case ErrorCode.QueryProduct:
      return 'Failed to query products. Please try again later.';
    default:
      return error?.message || 'An unexpected error occurred';
  }
}
