import {
  createPurchaseError,
  createPurchaseErrorFromPlatform,
  ErrorCodeUtils,
  getUserFriendlyErrorMessage,
  isNetworkError,
  isRecoverableError,
  isUserCancelledError,
} from '../utils/errorMapping';
import {ErrorCode} from '../types';

jest.mock('../ExpoIapModule', () => {
  const ERROR_CODES = {
    E_NETWORK_ERROR: 'NATIVE_NETWORK',
    E_BILLING_UNAVAILABLE: 3,
    E_UNKNOWN: 'NATIVE_UNKNOWN',
  } as const;

  return {
    __esModule: true,
    default: {ERROR_CODES},
    NATIVE_ERROR_CODES: ERROR_CODES,
  };
});

describe('errorMapping utilities', () => {
  it('creates purchase error from platform code string', () => {
    const err = createPurchaseErrorFromPlatform(
      {code: 'E_ALREADY_OWNED', message: 'dup'},
      'ios',
    );
    expect(err.code).toBe(ErrorCode.AlreadyOwned);
    expect(err.platform).toBe('ios');
    expect(err.message).toBe('dup');
  });

  it('maps numeric platform code via native table', () => {
    const resolved = ErrorCodeUtils.fromPlatformCode(3, 'android');
    expect(resolved).toBe(ErrorCode.BillingUnavailable);
  });

  it('falls back to unknown for unmapped codes', () => {
    expect(ErrorCodeUtils.fromPlatformCode('E_STRANGE', 'ios')).toBe(
      ErrorCode.Unknown,
    );
  });

  it('returns native platform code when available', () => {
    const platformCode = ErrorCodeUtils.toPlatformCode(
      ErrorCode.NetworkError,
      'ios',
    );
    expect(platformCode).toBe('NATIVE_NETWORK');
  });

  it('validates error code support per platform', () => {
    expect(
      ErrorCodeUtils.isValidForPlatform(ErrorCode.NetworkError, 'ios'),
    ).toBe(true);
    expect(
      ErrorCodeUtils.isValidForPlatform(ErrorCode.QueryProduct, 'android'),
    ).toBe(false);
  });

  it('detects specific error categories', () => {
    expect(isUserCancelledError('USER_CANCELLED')).toBe(true);
    expect(isNetworkError({code: 'E_NETWORK_ERROR'})).toBe(true);
    expect(isRecoverableError('E_QUERY_PRODUCT')).toBe(true);
    expect(isNetworkError({code: undefined})).toBe(false);
    expect(isUserCancelledError(null)).toBe(false);
  });

  it('returns friendly messages and defaults', () => {
    expect(getUserFriendlyErrorMessage('USER_CANCELLED')).toMatch(/cancelled/);
    expect(
      getUserFriendlyErrorMessage({code: 'E_UNKNOWN', message: 'custom'}),
    ).toBe('custom');
    expect(getUserFriendlyErrorMessage('E_NOT_IN_MAP')).toBe(
      'An unexpected error occurred',
    );

    const expectations: [ErrorCode, RegExp][] = [
      [ErrorCode.NetworkError, /Network connection error/],
      [ErrorCode.ReceiptFinished, /Receipt already finished/],
      [ErrorCode.ServiceDisconnected, /Billing service disconnected/],
      [ErrorCode.BillingUnavailable, /Billing is unavailable/],
      [ErrorCode.ItemUnavailable, /not available/],
      [ErrorCode.ItemNotOwned, /don't own/],
      [ErrorCode.AlreadyOwned, /already own/],
      [ErrorCode.SkuNotFound, /could not be found/],
      [ErrorCode.SkuOfferMismatch, /Selected offer/],
      [ErrorCode.DeferredPayment, /pending approval/],
      [ErrorCode.NotPrepared, /not ready/],
      [ErrorCode.ServiceError, /Store service error/],
      [ErrorCode.FeatureNotSupported, /not supported/],
      [ErrorCode.TransactionValidationFailed, /could not be verified/],
      [ErrorCode.ReceiptFailed, /Receipt processing failed/],
      [ErrorCode.EmptySkuList, /No product IDs/],
      [ErrorCode.InitConnection, /Failed to initialize billing/],
      [ErrorCode.QueryProduct, /Failed to query products/],
    ];

    for (const [code, matcher] of expectations) {
      expect(getUserFriendlyErrorMessage(code)).toMatch(matcher);
    }
  });

  it('preserves createPurchaseError fields', () => {
    const native = createPurchaseError({
      message: 'fail',
      responseCode: 7,
      debugMessage: 'dbg',
      code: ErrorCode.PurchaseError,
      productId: 'sku1',
      platform: 'android',
    });

    expect(native.name).toBe('[expo-iap]: PurchaseError');
    expect(native.responseCode).toBe(7);
    expect(native.debugMessage).toBe('dbg');
    expect(native.code).toBe(ErrorCode.PurchaseError);
    expect(native.productId).toBe('sku1');
    expect(native.platform).toBe('android');
  });
});
