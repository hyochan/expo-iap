/**
 * Error mapping utilities for expo-iap
 * Provides helper functions for handling platform-specific errors
 */

import {ErrorCode} from '../types';

type ErrorLike = string | {code?: ErrorCode | string; message?: string};

const ERROR_CODES = new Set<string>(Object.values(ErrorCode));

const normalizeErrorCode = (code?: string | null): string | undefined => {
  if (!code) {
    return undefined;
  }

  if (ERROR_CODES.has(code)) {
    return code;
  }

  if (code.startsWith('E_')) {
    const trimmed = code.substring(2);
    if (ERROR_CODES.has(trimmed)) {
      return trimmed;
    }
  }

  return code;
};

function extractCode(error: unknown): string | undefined {
  if (typeof error === 'string') {
    return normalizeErrorCode(error);
  }

  if (error && typeof error === 'object' && 'code' in error) {
    return normalizeErrorCode((error as {code?: string}).code);
  }

  return undefined;
}

/**
 * Checks if an error is a user cancellation
 * @param error Error object or error code
 * @returns True if the error represents user cancellation
 */
export function isUserCancelledError(error: unknown): boolean {
  return extractCode(error) === ErrorCode.UserCancelled;
}

/**
 * Checks if an error is related to network connectivity
 * @param error Error object or error code
 * @returns True if the error is network-related
 */
export function isNetworkError(error: unknown): boolean {
  const networkErrors: ErrorCode[] = [
    ErrorCode.NetworkError,
    ErrorCode.RemoteError,
    ErrorCode.ServiceError,
    ErrorCode.ServiceDisconnected,
    ErrorCode.BillingUnavailable,
  ];

  const code = extractCode(error);
  return !!code && (networkErrors as string[]).includes(code);
}

/**
 * Checks if an error is recoverable (user can retry)
 * @param error Error object or error code
 * @returns True if the error is potentially recoverable
 */
export function isRecoverableError(error: unknown): boolean {
  const recoverableErrors: ErrorCode[] = [
    ErrorCode.NetworkError,
    ErrorCode.RemoteError,
    ErrorCode.ServiceError,
    ErrorCode.Interrupted,
    ErrorCode.ServiceDisconnected,
    ErrorCode.BillingUnavailable,
    ErrorCode.QueryProduct,
    ErrorCode.InitConnection,
  ];

  const code = extractCode(error);
  return !!code && (recoverableErrors as string[]).includes(code);
}

/**
 * Gets a user-friendly error message for display
 * @param error Error object or error code
 * @returns User-friendly error message
 */
export function getUserFriendlyErrorMessage(error: ErrorLike): string {
  const errorCode = extractCode(error);

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
    default: {
      if (error && typeof error === 'object' && 'message' in error) {
        return (
          (error as {message?: string}).message ??
          'An unexpected error occurred'
        );
      }
      return 'An unexpected error occurred';
    }
  }
}
