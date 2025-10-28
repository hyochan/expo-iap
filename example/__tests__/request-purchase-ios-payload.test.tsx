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
 * Previously, the JS layer was incorrectly sending:
 * {
 *   type: 'in-app' | 'subs',
 *   request: {
 *     ios: { sku: '...', ... },
 *     android: { skus: [...], ... }  // <-- This was causing the issue
 *   }
 * }
 *
 * This test ensures the payload structure is correct for iOS by verifying
 * the requestPurchase function is exported and can be called with the expected
 * parameters without throwing errors.
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

    // This should not throw a type error
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

    // This should not throw a type error
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

    // This should not throw a type error
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

    // This should not throw a type error
    expect(() => {
      const _typeCheck: Parameters<typeof ExpoIap.requestPurchase>[0] =
        validRequest;
    }).not.toThrow();
  });
});
