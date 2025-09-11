import {
  isUserCancelledError,
  isNetworkError,
  isRecoverableError,
  getUserFriendlyErrorMessage,
} from '../errorMapping';
import {ErrorCode} from '../../ExpoIap.types';

describe('errorMapping utils', () => {
  it('detects user cancelled errors from string or object', () => {
    expect(isUserCancelledError(ErrorCode.E_USER_CANCELLED)).toBe(true);
    expect(isUserCancelledError({code: ErrorCode.E_USER_CANCELLED})).toBe(true);
    expect(isUserCancelledError('other')).toBe(false);
  });

  it('detects network related errors', () => {
    expect(isNetworkError(ErrorCode.E_NETWORK_ERROR)).toBe(true);
    expect(isNetworkError({code: ErrorCode.E_SERVICE_DISCONNECTED})).toBe(true);
    expect(isNetworkError('random')).toBe(false);
  });

  it('detects recoverable errors', () => {
    expect(isRecoverableError(ErrorCode.E_QUERY_PRODUCT)).toBe(true);
    expect(isRecoverableError({code: ErrorCode.E_INIT_CONNECTION})).toBe(true);
    expect(isRecoverableError('nonrecoverable')).toBe(false);
  });

  it('returns user friendly messages', () => {
    expect(
      getUserFriendlyErrorMessage({code: ErrorCode.E_USER_CANCELLED}),
    ).toMatch(/cancelled/i);
    expect(
      getUserFriendlyErrorMessage({code: ErrorCode.E_EMPTY_SKU_LIST}),
    ).toMatch(/No product IDs/i);
    expect(getUserFriendlyErrorMessage({code: 'UNKNOWN'} as any)).toBe(
      'An unexpected error occurred',
    );
  });
});
