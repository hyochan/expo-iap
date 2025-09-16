import {
  isUserCancelledError,
  isNetworkError,
  isRecoverableError,
  getUserFriendlyErrorMessage,
} from '../errorMapping';
import {ErrorCode} from '../../ExpoIap.types';

describe('errorMapping utils', () => {
  it('detects user cancelled errors from string or object', () => {
    expect(isUserCancelledError(ErrorCode.UserCancelled)).toBe(true);
    expect(isUserCancelledError({code: ErrorCode.UserCancelled})).toBe(true);
    expect(isUserCancelledError('other')).toBe(false);
  });

  it('detects network related errors', () => {
    expect(isNetworkError(ErrorCode.NetworkError)).toBe(true);
    expect(isNetworkError({code: ErrorCode.ServiceDisconnected})).toBe(true);
    expect(isNetworkError('random')).toBe(false);
  });

  it('detects recoverable errors', () => {
    expect(isRecoverableError(ErrorCode.QueryProduct)).toBe(true);
    expect(isRecoverableError({code: ErrorCode.InitConnection})).toBe(true);
    expect(isRecoverableError('nonrecoverable')).toBe(false);
  });

  it('returns user friendly messages', () => {
    expect(
      getUserFriendlyErrorMessage({code: ErrorCode.UserCancelled}),
    ).toMatch(/cancelled/i);
    expect(
      getUserFriendlyErrorMessage({code: ErrorCode.EmptySkuList}),
    ).toMatch(/No product IDs/i);
    expect(getUserFriendlyErrorMessage({code: 'UNKNOWN'} as any)).toBe(
      'An unexpected error occurred',
    );
  });
});
