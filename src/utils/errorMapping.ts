/**
 * Error mapping utilities for expo-iap.
 * Provides helpers for working with platform-specific error codes
 * and constructing structured purchase errors.
 */

import {NATIVE_ERROR_CODES} from '../ExpoIapModule';
import {ErrorCode, IapPlatform} from '../types';

export interface PurchaseErrorProps {
  message: string;
  responseCode?: number;
  debugMessage?: string;
  code?: ErrorCode;
  productId?: string;
  platform?: IapPlatform;
}

type PlatformErrorData = {
  code?: string | number;
  message?: string;
  responseCode?: number;
  debugMessage?: string;
  productId?: string;
};

export type PurchaseError = Error & PurchaseErrorProps;

const toStandardizedCode = (errorCode: ErrorCode): string =>
  errorCode.startsWith('E_') ? errorCode : `E_${errorCode}`;

const normalizePlatform = (platform: IapPlatform): 'ios' | 'android' =>
  typeof platform === 'string' && platform.toLowerCase() === 'ios'
    ? 'ios'
    : 'android';

const COMMON_ERROR_CODE_MAP: Record<ErrorCode, string> = {
  [ErrorCode.Unknown]: toStandardizedCode(ErrorCode.Unknown),
  [ErrorCode.UserCancelled]: toStandardizedCode(ErrorCode.UserCancelled),
  [ErrorCode.UserError]: toStandardizedCode(ErrorCode.UserError),
  [ErrorCode.ItemUnavailable]: toStandardizedCode(ErrorCode.ItemUnavailable),
  [ErrorCode.RemoteError]: toStandardizedCode(ErrorCode.RemoteError),
  [ErrorCode.NetworkError]: toStandardizedCode(ErrorCode.NetworkError),
  [ErrorCode.ServiceError]: toStandardizedCode(ErrorCode.ServiceError),
  [ErrorCode.ReceiptFailed]: toStandardizedCode(ErrorCode.ReceiptFailed),
  [ErrorCode.ReceiptFinished]: toStandardizedCode(ErrorCode.ReceiptFinished),
  [ErrorCode.ReceiptFinishedFailed]: toStandardizedCode(
    ErrorCode.ReceiptFinishedFailed,
  ),
  [ErrorCode.NotPrepared]: toStandardizedCode(ErrorCode.NotPrepared),
  [ErrorCode.NotEnded]: toStandardizedCode(ErrorCode.NotEnded),
  [ErrorCode.AlreadyOwned]: toStandardizedCode(ErrorCode.AlreadyOwned),
  [ErrorCode.DeveloperError]: toStandardizedCode(ErrorCode.DeveloperError),
  [ErrorCode.BillingResponseJsonParseError]: toStandardizedCode(
    ErrorCode.BillingResponseJsonParseError,
  ),
  [ErrorCode.DeferredPayment]: toStandardizedCode(ErrorCode.DeferredPayment),
  [ErrorCode.Interrupted]: toStandardizedCode(ErrorCode.Interrupted),
  [ErrorCode.IapNotAvailable]: toStandardizedCode(ErrorCode.IapNotAvailable),
  [ErrorCode.PurchaseError]: toStandardizedCode(ErrorCode.PurchaseError),
  [ErrorCode.SyncError]: toStandardizedCode(ErrorCode.SyncError),
  [ErrorCode.TransactionValidationFailed]: toStandardizedCode(
    ErrorCode.TransactionValidationFailed,
  ),
  [ErrorCode.ActivityUnavailable]: toStandardizedCode(
    ErrorCode.ActivityUnavailable,
  ),
  [ErrorCode.AlreadyPrepared]: toStandardizedCode(ErrorCode.AlreadyPrepared),
  [ErrorCode.Pending]: toStandardizedCode(ErrorCode.Pending),
  [ErrorCode.ConnectionClosed]: toStandardizedCode(ErrorCode.ConnectionClosed),
  [ErrorCode.InitConnection]: toStandardizedCode(ErrorCode.InitConnection),
  [ErrorCode.ServiceDisconnected]: toStandardizedCode(
    ErrorCode.ServiceDisconnected,
  ),
  [ErrorCode.QueryProduct]: toStandardizedCode(ErrorCode.QueryProduct),
  [ErrorCode.SkuNotFound]: toStandardizedCode(ErrorCode.SkuNotFound),
  [ErrorCode.SkuOfferMismatch]: toStandardizedCode(ErrorCode.SkuOfferMismatch),
  [ErrorCode.ItemNotOwned]: toStandardizedCode(ErrorCode.ItemNotOwned),
  [ErrorCode.BillingUnavailable]: toStandardizedCode(
    ErrorCode.BillingUnavailable,
  ),
  [ErrorCode.FeatureNotSupported]: toStandardizedCode(
    ErrorCode.FeatureNotSupported,
  ),
  [ErrorCode.EmptySkuList]: toStandardizedCode(ErrorCode.EmptySkuList),
};

export const ErrorCodeMapping = {
  ios: COMMON_ERROR_CODE_MAP,
  android: COMMON_ERROR_CODE_MAP,
} as const;

const OPENIAP_ERROR_CODE_SET: Set<string> = new Set(
  Object.values(ErrorCode).map((code) => toStandardizedCode(code)),
);

export const createPurchaseError = (
  props: PurchaseErrorProps,
): PurchaseError => {
  const error = new Error(props.message) as PurchaseError;
  error.name = '[expo-iap]: PurchaseError';
  error.responseCode = props.responseCode;
  error.debugMessage = props.debugMessage;
  error.code = props.code;
  error.productId = props.productId;
  error.platform = props.platform;
  return error;
};

export const createPurchaseErrorFromPlatform = (
  errorData: PlatformErrorData,
  platform: IapPlatform,
): PurchaseError => {
  const normalizedPlatform = normalizePlatform(platform);
  const errorCode = errorData.code
    ? ErrorCodeUtils.fromPlatformCode(errorData.code, normalizedPlatform)
    : ErrorCode.Unknown;

  return createPurchaseError({
    message: errorData.message ?? 'Unknown error occurred',
    responseCode: errorData.responseCode,
    debugMessage: errorData.debugMessage,
    code: errorCode,
    productId: errorData.productId,
    platform,
  });
};

export const ErrorCodeUtils = {
  getNativeErrorCode: (errorCode: ErrorCode): string => {
    const standardized = toStandardizedCode(errorCode);
    return (
      (NATIVE_ERROR_CODES as Record<string, string | undefined>)[
        standardized
      ] ?? standardized
    );
  },
  fromPlatformCode: (
    platformCode: string | number,
    _platform: IapPlatform,
  ): ErrorCode => {
    if (typeof platformCode === 'string' && platformCode.startsWith('E_')) {
      if (OPENIAP_ERROR_CODE_SET.has(platformCode)) {
        const match = Object.entries(COMMON_ERROR_CODE_MAP).find(
          ([, value]) => value === platformCode,
        );
        if (match) {
          return match[0] as ErrorCode;
        }
      }
    }

    for (const [standardized, nativeCode] of Object.entries(
      (NATIVE_ERROR_CODES || {}) as Record<string, string | number>,
    )) {
      if (
        nativeCode === platformCode &&
        OPENIAP_ERROR_CODE_SET.has(standardized)
      ) {
        const match = Object.entries(COMMON_ERROR_CODE_MAP).find(
          ([, mappedCode]) => mappedCode === standardized,
        );
        if (match) {
          return match[0] as ErrorCode;
        }
      }
    }

    for (const [errorCode, mappedCode] of Object.entries(
      COMMON_ERROR_CODE_MAP,
    )) {
      if (mappedCode === platformCode) {
        return errorCode as ErrorCode;
      }
    }

    return ErrorCode.Unknown;
  },
  toPlatformCode: (
    errorCode: ErrorCode,
    _platform: IapPlatform,
  ): string | number => {
    const standardized = toStandardizedCode(errorCode);
    const native = (NATIVE_ERROR_CODES as Record<string, string | number>)[
      standardized
    ];
    return native ?? COMMON_ERROR_CODE_MAP[errorCode] ?? 'E_UNKNOWN';
  },
  isValidForPlatform: (
    errorCode: ErrorCode,
    platform: IapPlatform,
  ): boolean => {
    const standardized = toStandardizedCode(errorCode);
    if (
      (NATIVE_ERROR_CODES as Record<string, unknown>)[standardized] !==
      undefined
    ) {
      return true;
    }
    return standardized in ErrorCodeMapping[normalizePlatform(platform)];
  },
};

// ---------------------------------------------------------------------------
// Convenience helpers for interpreting error objects
// ---------------------------------------------------------------------------

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

export function isUserCancelledError(error: unknown): boolean {
  return extractCode(error) === ErrorCode.UserCancelled;
}

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
