import {
  isProductActiveAndroid,
  isProductExpiredAndroid,
  isProductActiveIOS,
  isProductExpiredIOS,
  isProductActive,
  isProductExpired,
  willProductExpireSoon,
  daysUntilExpiration,
} from '../subscription';
import type { ProductPurchase } from '../../ExpoIap.types';

describe('Subscription Helper Functions', () => {
  const currentTime = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  describe('Android Subscription Helpers', () => {
    describe('isProductActiveAndroid', () => {
      it('should return true for active auto-renewing subscription', () => {
        const purchase: ProductPurchase = {
          productId: 'test.subscription',
          transactionId: '123',
          transactionDate: currentTime,
          platform: 'android',
          transactionReceipt: 'receipt',
          autoRenewingAndroid: true,
          purchaseStateAndroid: 1, // Purchased
        };

        expect(isProductActiveAndroid(purchase)).toBe(true);
      });

      it('should return false for cancelled subscription', () => {
        const purchase: ProductPurchase = {
          productId: 'test.subscription',
          transactionId: '123',
          transactionDate: currentTime,
          platform: 'android',
          transactionReceipt: 'receipt',
          autoRenewingAndroid: false,
          purchaseStateAndroid: 1,
        };

        expect(isProductActiveAndroid(purchase)).toBe(false);
      });

      it('should return false for pending purchase', () => {
        const purchase: ProductPurchase = {
          productId: 'test.subscription',
          transactionId: '123',
          transactionDate: currentTime,
          platform: 'android',
          transactionReceipt: 'receipt',
          autoRenewingAndroid: true,
          purchaseStateAndroid: 2, // Pending
        };

        expect(isProductActiveAndroid(purchase)).toBe(false);
      });
    });

    describe('isProductExpiredAndroid', () => {
      it('should return true for non-renewing subscription', () => {
        const purchase: ProductPurchase = {
          productId: 'test.subscription',
          transactionId: '123',
          transactionDate: currentTime,
          platform: 'android',
          transactionReceipt: 'receipt',
          autoRenewingAndroid: false,
        };

        expect(isProductExpiredAndroid(purchase)).toBe(true);
      });

      it('should return false for active subscription', () => {
        const purchase: ProductPurchase = {
          productId: 'test.subscription',
          transactionId: '123',
          transactionDate: currentTime,
          platform: 'android',
          transactionReceipt: 'receipt',
          autoRenewingAndroid: true,
        };

        expect(isProductExpiredAndroid(purchase)).toBe(false);
      });
    });
  });

  describe('iOS Subscription Helpers', () => {
    describe('isProductActiveIOS', () => {
      it('should return true for subscription with future expiration', () => {
        const purchase: ProductPurchase = {
          productId: 'test.subscription',
          transactionId: '123',
          transactionDate: currentTime,
          platform: 'ios',
          transactionReceipt: 'receipt',
          expirationDateIOS: currentTime + oneDayMs * 30, // 30 days from now
        };

        expect(isProductActiveIOS(purchase)).toBe(true);
      });

      it('should return false for expired subscription', () => {
        const purchase: ProductPurchase = {
          productId: 'test.subscription',
          transactionId: '123',
          transactionDate: currentTime,
          platform: 'ios',
          transactionReceipt: 'receipt',
          expirationDateIOS: currentTime - oneDayMs, // Yesterday
        };

        expect(isProductActiveIOS(purchase)).toBe(false);
      });

      it('should return false when no expiration date', () => {
        const purchase: ProductPurchase = {
          productId: 'test.subscription',
          transactionId: '123',
          transactionDate: currentTime,
          platform: 'ios',
          transactionReceipt: 'receipt',
        };

        expect(isProductActiveIOS(purchase)).toBe(false);
      });
    });

    describe('isProductExpiredIOS', () => {
      it('should return true for expired subscription', () => {
        const purchase: ProductPurchase = {
          productId: 'test.subscription',
          transactionId: '123',
          transactionDate: currentTime,
          platform: 'ios',
          transactionReceipt: 'receipt',
          expirationDateIOS: currentTime - oneDayMs,
        };

        expect(isProductExpiredIOS(purchase)).toBe(true);
      });

      it('should return false for active subscription', () => {
        const purchase: ProductPurchase = {
          productId: 'test.subscription',
          transactionId: '123',
          transactionDate: currentTime,
          platform: 'ios',
          transactionReceipt: 'receipt',
          expirationDateIOS: currentTime + oneDayMs,
        };

        expect(isProductExpiredIOS(purchase)).toBe(false);
      });
    });
  });

  describe('Cross-Platform Helpers', () => {
    describe('isProductActive', () => {
      it('should handle iOS purchases correctly', () => {
        const iosPurchase: ProductPurchase = {
          productId: 'test.subscription',
          transactionId: '123',
          transactionDate: currentTime,
          platform: 'ios',
          transactionReceipt: 'receipt',
          expirationDateIOS: currentTime + oneDayMs,
        };

        expect(isProductActive(iosPurchase)).toBe(true);
      });

      it('should handle Android purchases correctly', () => {
        const androidPurchase: ProductPurchase = {
          productId: 'test.subscription',
          transactionId: '123',
          transactionDate: currentTime,
          platform: 'android',
          transactionReceipt: 'receipt',
          autoRenewingAndroid: true,
          purchaseStateAndroid: 1,
        };

        expect(isProductActive(androidPurchase)).toBe(true);
      });

      it('should return false for unknown platform', () => {
        const unknownPurchase: ProductPurchase = {
          productId: 'test.subscription',
          transactionId: '123',
          transactionDate: currentTime,
          platform: 'unknown' as any,
          transactionReceipt: 'receipt',
        };

        expect(isProductActive(unknownPurchase)).toBe(false);
      });
    });

    describe('isProductExpired', () => {
      it('should handle iOS expired purchases', () => {
        const iosPurchase: ProductPurchase = {
          productId: 'test.subscription',
          transactionId: '123',
          transactionDate: currentTime,
          platform: 'ios',
          transactionReceipt: 'receipt',
          expirationDateIOS: currentTime - oneDayMs,
        };

        expect(isProductExpired(iosPurchase)).toBe(true);
      });

      it('should handle Android cancelled purchases', () => {
        const androidPurchase: ProductPurchase = {
          productId: 'test.subscription',
          transactionId: '123',
          transactionDate: currentTime,
          platform: 'android',
          transactionReceipt: 'receipt',
          autoRenewingAndroid: false,
        };

        expect(isProductExpired(androidPurchase)).toBe(true);
      });
    });

    describe('willProductExpireSoon', () => {
      it('should return true for iOS subscription expiring within threshold', () => {
        const purchase: ProductPurchase = {
          productId: 'test.subscription',
          transactionId: '123',
          transactionDate: currentTime,
          platform: 'ios',
          transactionReceipt: 'receipt',
          expirationDateIOS: currentTime + oneDayMs * 5, // 5 days from now
        };

        expect(willProductExpireSoon(purchase, 7)).toBe(true);
      });

      it('should return false for iOS subscription not expiring soon', () => {
        const purchase: ProductPurchase = {
          productId: 'test.subscription',
          transactionId: '123',
          transactionDate: currentTime,
          platform: 'ios',
          transactionReceipt: 'receipt',
          expirationDateIOS: currentTime + oneDayMs * 30,
        };

        expect(willProductExpireSoon(purchase, 7)).toBe(false);
      });

      it('should return false for Android auto-renewing subscription', () => {
        const purchase: ProductPurchase = {
          productId: 'test.subscription',
          transactionId: '123',
          transactionDate: currentTime,
          platform: 'android',
          transactionReceipt: 'receipt',
          autoRenewingAndroid: true,
        };

        expect(willProductExpireSoon(purchase, 7)).toBe(false);
      });

      it('should return true for Android non-renewing subscription', () => {
        const purchase: ProductPurchase = {
          productId: 'test.subscription',
          transactionId: '123',
          transactionDate: currentTime,
          platform: 'android',
          transactionReceipt: 'receipt',
          autoRenewingAndroid: false,
        };

        expect(willProductExpireSoon(purchase, 7)).toBe(true);
      });
    });

    describe('daysUntilExpiration', () => {
      it('should calculate days correctly for iOS', () => {
        const purchase: ProductPurchase = {
          productId: 'test.subscription',
          transactionId: '123',
          transactionDate: currentTime,
          platform: 'ios',
          transactionReceipt: 'receipt',
          expirationDateIOS: currentTime + oneDayMs * 10,
        };

        expect(daysUntilExpiration(purchase)).toBe(10);
      });

      it('should return null for expired iOS subscription', () => {
        const purchase: ProductPurchase = {
          productId: 'test.subscription',
          transactionId: '123',
          transactionDate: currentTime,
          platform: 'ios',
          transactionReceipt: 'receipt',
          expirationDateIOS: currentTime - oneDayMs,
        };

        expect(daysUntilExpiration(purchase)).toBeNull();
      });

      it('should return null for Android subscriptions', () => {
        const purchase: ProductPurchase = {
          productId: 'test.subscription',
          transactionId: '123',
          transactionDate: currentTime,
          platform: 'android',
          transactionReceipt: 'receipt',
          autoRenewingAndroid: true,
        };

        expect(daysUntilExpiration(purchase)).toBeNull();
      });

      it('should return null when no expiration date', () => {
        const purchase: ProductPurchase = {
          productId: 'test.subscription',
          transactionId: '123',
          transactionDate: currentTime,
          platform: 'ios',
          transactionReceipt: 'receipt',
        };

        expect(daysUntilExpiration(purchase)).toBeNull();
      });
    });
  });
});