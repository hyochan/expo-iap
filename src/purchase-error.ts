import {NATIVE_ERROR_CODES} from './ExpoIapModule';
import {ErrorCode, IapPlatform} from './types';

/** Properties used to construct a {@link PurchaseError}. */
export interface PurchaseErrorProps {
  message: string;
  responseCode?: number;
  debugMessage?: string;
  code?: ErrorCode;
  productId?: string;
  platform?: IapPlatform;
}

/** Shape of raw platform error objects coming from native modules. */
type PlatformErrorData = {
  code?: string | number;
  message?: string;
  responseCode?: number;
  debugMessage?: string;
  productId?: string;
};

const toStandardizedCode = (errorCode: ErrorCode): string =>
  errorCode.startsWith('E_') ? errorCode : `E_${errorCode}`;

const normalizePlatform = (platform: IapPlatform): 'ios' | 'android' =>
  typeof platform === 'string' && platform.toLowerCase() === 'ios'
    ? 'ios'
    : 'android';

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

/**
 * Mapping between platforms and their canonical error codes.
 * Values are platform-native string identifiers.
 */
export const ErrorCodeMapping = {
  ios: COMMON_ERROR_CODE_MAP,
  android: COMMON_ERROR_CODE_MAP,
} as const;

/**
 * Error thrown by expo-iap when purchases fail.
 */
export class PurchaseError extends Error {
  public responseCode?: number;
  public debugMessage?: string;
  public code?: ErrorCode;
  public productId?: string;
  public platform?: IapPlatform;

  constructor(
    message: string,
    responseCode?: number,
    debugMessage?: string,
    code?: ErrorCode,
    productId?: string,
    platform?: IapPlatform,
  );
  constructor(props: PurchaseErrorProps);
  constructor(
    messageOrProps: string | PurchaseErrorProps,
    responseCode?: number,
    debugMessage?: string,
    code?: ErrorCode,
    productId?: string,
    platform?: IapPlatform,
  ) {
    super(
      typeof messageOrProps === 'string'
        ? messageOrProps
        : messageOrProps.message,
    );
    this.name = '[expo-iap]: PurchaseError';
    Object.setPrototypeOf(this, new.target.prototype);

    if (typeof messageOrProps === 'string') {
      this.responseCode = responseCode;
      this.debugMessage = debugMessage;
      this.code = code;
      this.productId = productId;
      this.platform = platform;
    } else {
      this.responseCode = messageOrProps.responseCode;
      this.debugMessage = messageOrProps.debugMessage;
      this.code = messageOrProps.code;
      this.productId = messageOrProps.productId;
      this.platform = messageOrProps.platform;
    }
  }

  /**
   * Create a {@link PurchaseError} from raw platform error data.
   */
  static fromPlatformError(
    errorData: PlatformErrorData,
    platform: IapPlatform,
  ): PurchaseError {
    const normalizedPlatform = normalizePlatform(platform);

    const errorCode = errorData.code
      ? ErrorCodeUtils.fromPlatformCode(errorData.code, normalizedPlatform)
      : ErrorCode.Unknown;

    return new PurchaseError({
      message: errorData.message ?? 'Unknown error occurred',
      responseCode: errorData.responseCode,
      debugMessage: errorData.debugMessage,
      code: errorCode,
      productId: errorData.productId,
      platform,
    });
  }

  /**
   * Returns the platform specific error code for this instance.
   */
  getPlatformCode(): string | number | undefined {
    if (!this.code || !this.platform) {
      return undefined;
    }
    return ErrorCodeUtils.toPlatformCode(this.code, this.platform);
  }
}

/** Utility helpers for translating error codes between platforms. */
export const ErrorCodeUtils = {
  /**
   * Returns the native error code for the provided {@link ErrorCode}.
   */
  getNativeErrorCode: (errorCode: ErrorCode): string => {
    const standardized = toStandardizedCode(errorCode);
    return (
      (NATIVE_ERROR_CODES as Record<string, string | undefined>)[
        standardized
      ] ?? standardized
    );
  },
  /**
   * Converts a platform-specific error code into a standardized {@link ErrorCode}.
   */
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
  /**
   * Converts a standardized {@link ErrorCode} into its platform-specific value.
   */
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
  /**
   * Determines whether the error code is supported on the given platform.
   */
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
