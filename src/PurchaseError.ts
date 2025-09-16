import {NATIVE_ERROR_CODES} from './ExpoIapModule';
import {ErrorCode, Platform} from './types';

export type PurchaseErrorPlatform = Platform | 'ios' | 'android';

export interface PurchaseErrorProps {
  message: string;
  responseCode?: number;
  debugMessage?: string;
  code?: ErrorCode;
  productId?: string;
  platform?: PurchaseErrorPlatform;
}

const toStandardizedCode = (errorCode: ErrorCode): string => {
  if (errorCode.startsWith('E_')) {
    return errorCode;
  }
  return `E_${errorCode}`;
};

const normalizePlatform = (
  platform: PurchaseErrorPlatform,
): 'ios' | 'android' => {
  if (platform === Platform.Ios || platform === 'ios') {
    return 'ios';
  }
  return 'android';
};

const OPENIAP_ERROR_CODE_SET: Set<string> = new Set(
  Object.values(ErrorCode).map((code) => toStandardizedCode(code)),
);

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

export class PurchaseError implements Error {
  public name: string;
  public message: string;
  public responseCode?: number;
  public debugMessage?: string;
  public code?: ErrorCode;
  public productId?: string;
  public platform?: PurchaseErrorPlatform;

  constructor(messageOrProps: string | PurchaseErrorProps, ...rest: any[]) {
    this.name = '[expo-iap]: PurchaseError';

    if (typeof messageOrProps === 'string') {
      this.message = messageOrProps;
      this.responseCode = rest[0];
      this.debugMessage = rest[1];
      this.code = rest[2];
      this.productId = rest[3];
      this.platform = rest[4];
    } else {
      const props = messageOrProps;
      this.message = props.message;
      this.responseCode = props.responseCode;
      this.debugMessage = props.debugMessage;
      this.code = props.code;
      this.productId = props.productId;
      this.platform = props.platform;
    }
  }

  static fromPlatformError(
    errorData: any,
    platform: PurchaseErrorPlatform,
  ): PurchaseError {
    const normalizedPlatform = normalizePlatform(platform);

    const errorCode = errorData?.code
      ? ErrorCodeUtils.fromPlatformCode(errorData.code, normalizedPlatform)
      : ErrorCode.Unknown;

    return new PurchaseError({
      message: errorData?.message || 'Unknown error occurred',
      responseCode: errorData?.responseCode,
      debugMessage: errorData?.debugMessage,
      code: errorCode,
      productId: errorData?.productId,
      platform,
    });
  }

  getPlatformCode(): string | number | undefined {
    if (!this.code || !this.platform) {
      return undefined;
    }
    return ErrorCodeUtils.toPlatformCode(this.code, this.platform);
  }
}

export const ErrorCodeUtils = {
  getNativeErrorCode: (errorCode: ErrorCode): string => {
    const standardized = toStandardizedCode(errorCode);
    return (
      (NATIVE_ERROR_CODES as Record<string, string | undefined>)[
        standardized
      ] || standardized
    );
  },
  fromPlatformCode: (
    platformCode: string | number,
    platform: PurchaseErrorPlatform,
  ): ErrorCode => {
    const normalizedPlatform = normalizePlatform(platform);

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

    if (normalizedPlatform === 'ios') {
      for (const [key, value] of Object.entries(
        (NATIVE_ERROR_CODES || {}) as Record<string, string | number>,
      )) {
        if (value === platformCode && OPENIAP_ERROR_CODE_SET.has(key)) {
          const match = Object.entries(COMMON_ERROR_CODE_MAP).find(
            ([, mappedCode]) => mappedCode === key,
          );
          if (match) {
            return match[0] as ErrorCode;
          }
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
    platform: PurchaseErrorPlatform,
  ): string | number => {
    const normalizedPlatform = normalizePlatform(platform);

    if (normalizedPlatform === 'ios') {
      const standardized = toStandardizedCode(errorCode);
      const native = (NATIVE_ERROR_CODES as Record<string, string | number>)[
        standardized
      ];
      if (native !== undefined) {
        return native;
      }
    }

    return COMMON_ERROR_CODE_MAP[errorCode] ?? 'E_UNKNOWN';
  },
  isValidForPlatform: (
    errorCode: ErrorCode,
    platform: PurchaseErrorPlatform,
  ): boolean => {
    const normalizedPlatform = normalizePlatform(platform);
    const standardized = toStandardizedCode(errorCode);

    if (normalizedPlatform === 'ios') {
      return (
        standardized in (NATIVE_ERROR_CODES as Record<string, unknown>) ||
        errorCode in COMMON_ERROR_CODE_MAP
      );
    }

    return errorCode in COMMON_ERROR_CODE_MAP;
  },
};
