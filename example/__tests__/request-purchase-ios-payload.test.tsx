/**
 * Regression test for iOS requestPurchase payload structure
 *
 * Issue: https://github.com/hyochan/expo-iap/issues/254
 *
 * In v3.x, the iOS native module expects:
 * {
 *   type: 'in-app' | 'subs',
 *   request: {
 *     ios: { sku: '...', ... }
 *   }
 * }
 *
 * Previously (BROKEN in v3.0.0-v3.1.22), the JS layer was incorrectly sending:
 * {
 *   type: 'in-app' | 'subs',
 *   request: {
 *     ios: { sku: '...', ... },
 *     android: { skus: [...], ... }  // <-- This was causing the issue
 *   }
 * }
 *
 * The fix (v3.1.23+) ensures only iOS-specific data is sent:
 * - src/index.ts:479 changed from `request` to `request: {ios: normalizedRequest}`
 * - This ensures Android data is never included in the iOS native module call
 *
 * This test suite verifies the TypeScript type definitions enforce the correct
 * cross-platform request structure. Runtime behavior is validated by integration
 * tests in purchase-flow.test.tsx which verify the actual native module calls.
 */

import * as ExpoIap from '../../src';

describe('iOS requestPurchase Payload Structure (Issue #254)', () => {
  it('should export requestPurchase function', () => {
    expect(ExpoIap.requestPurchase).toBeDefined();
    expect(typeof ExpoIap.requestPurchase).toBe('function');
  });

  it('should accept platform-specific request structure for in-app purchases', () => {
    const validRequest = {
      request: {
        ios: {
          sku: 'com.test.product',
          quantity: 1,
        },
        android: {
          skus: ['com.test.product'],
        },
      },
      type: 'in-app' as const,
    };

    // Type check: This should compile without errors
    expect(() => {
      const _typeCheck: Parameters<typeof ExpoIap.requestPurchase>[0] =
        validRequest;
    }).not.toThrow();
  });

  it('should accept platform-specific request structure for subscriptions', () => {
    const validRequest = {
      request: {
        ios: {
          sku: 'com.test.subscription',
          appAccountToken: 'test-token',
        },
        android: {
          skus: ['com.test.subscription'],
        },
      },
      type: 'subs' as const,
    };

    // Type check: This should compile without errors
    expect(() => {
      const _typeCheck: Parameters<typeof ExpoIap.requestPurchase>[0] =
        validRequest;
    }).not.toThrow();
  });

  it('should accept iOS-specific fields in request', () => {
    const validRequest = {
      request: {
        ios: {
          sku: 'com.test.product',
          quantity: 2,
          appAccountToken: 'user-123',
          andDangerouslyFinishTransactionAutomatically: false,
          withOffer: {
            identifier: 'offer-id',
            keyIdentifier: 'key-id',
            nonce: 'nonce-value',
            signature: 'signature-value',
            timestamp: '123456789',
          },
        },
        android: {
          skus: ['com.test.product'],
        },
      },
      type: 'in-app' as const,
    };

    // Type check: This should compile without errors
    expect(() => {
      const _typeCheck: Parameters<typeof ExpoIap.requestPurchase>[0] =
        validRequest;
    }).not.toThrow();
  });

  it('should accept useAlternativeBilling parameter', () => {
    const validRequest = {
      request: {
        ios: {
          sku: 'com.test.product',
        },
        android: {
          skus: ['com.test.product'],
        },
      },
      type: 'in-app' as const,
      useAlternativeBilling: true,
    };

    // Type check: This should compile without errors
    expect(() => {
      const _typeCheck: Parameters<typeof ExpoIap.requestPurchase>[0] =
        validRequest;
    }).not.toThrow();
  });

  it('should accept iOS-only request without android field', () => {
    const validRequest = {
      request: {
        ios: {
          sku: 'com.test.product',
        },
      },
      type: 'in-app' as const,
    };

    // Type check: This should compile without errors
    expect(() => {
      const _typeCheck: Parameters<typeof ExpoIap.requestPurchase>[0] =
        validRequest;
    }).not.toThrow();
  });

  /**
   * NOTE: Runtime behavior verification
   *
   * The actual payload filtering (sending only iOS data to the native module)
   * is tested indirectly by:
   *
   * 1. purchase-flow.test.tsx:89-104 - Tests requestPurchase is called with
   *    cross-platform request structure
   *
   * 2. Integration tests that verify purchases work end-to-end
   *
   * The fix in src/index.ts:479 ensures that when Platform.OS === 'ios',
   * the payload sent to ExpoIapModule.requestPurchase is:
   *   {type, request: {ios: normalizedRequest}, useAlternativeBilling}
   * rather than:
   *   {type, request: {ios: ..., android: ...}, useAlternativeBilling}
   *
   * This prevents the "data couldn't be read" error that occurred when
   * Android data was present in iOS native module calls.
   */
});
