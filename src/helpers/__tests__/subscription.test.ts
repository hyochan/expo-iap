// Mock getAvailablePurchases
jest.mock('../../index', () => ({
  getAvailablePurchases: jest.fn(),
}));

/* eslint-disable import/first */
import {
  getActiveSubscriptions,
  hasActiveSubscriptions,
} from '../subscription';
import type { Purchase } from '../../ExpoIap.types';
import { Platform } from 'react-native';
import { getAvailablePurchases } from '../../index';
/* eslint-enable import/first */

describe('Subscription Helper Functions', () => {
  const currentTime = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getActiveSubscriptions', () => {
    describe('iOS', () => {
      beforeEach(() => {
        Platform.OS = 'ios';
      });

      it('should return active subscriptions with valid expiration date', async () => {
        const mockPurchases: Purchase[] = [
          {
            id: 'trans-123', // transaction ID
            productId: 'test.subscription',
            transactionId: 'trans-123',
            transactionDate: currentTime,
            platform: 'ios',
            transactionReceipt: 'receipt',
            expirationDateIOS: currentTime + (7 * oneDayMs), // Expires in 7 days
            environmentIOS: 'Production',
          } as Purchase,
        ];

        (getAvailablePurchases as jest.Mock).mockResolvedValue(mockPurchases);

        const result = await getActiveSubscriptions();

        expect(result).toHaveLength(1);
        expect(result[0].productId).toBe('test.subscription');
        expect(result[0].isActive).toBe(true);
        expect(result[0].transactionId).toBe('trans-123');
        expect(result[0].transactionDate).toBe(currentTime);
        expect(result[0].expirationDateIOS).toBeInstanceOf(Date);
        expect(result[0].daysUntilExpirationIOS).toBe(7);
        expect(result[0].willExpireSoon).toBe(true); // <= 7 days
        expect(result[0].environmentIOS).toBe('Production');
      });

      it('should filter expired subscriptions', async () => {
        const mockPurchases: Purchase[] = [
          {
            id: 'trans-123',
            productId: 'test.subscription',
            transactionId: 'trans-123',
            transactionDate: currentTime - (10 * oneDayMs),
            platform: 'ios',
            transactionReceipt: 'receipt',
            expirationDateIOS: currentTime - oneDayMs, // Expired yesterday
          } as Purchase,
        ];

        (getAvailablePurchases as jest.Mock).mockResolvedValue(mockPurchases);

        const result = await getActiveSubscriptions();

        expect(result).toHaveLength(0);
      });

      it('should handle sandbox subscriptions within 24 hours', async () => {
        const mockPurchases: Purchase[] = [
          {
            id: 'trans-123',
            productId: 'test.subscription',
            transactionId: 'trans-123',
            transactionDate: currentTime - (12 * 60 * 60 * 1000), // 12 hours ago
            platform: 'ios',
            transactionReceipt: 'receipt',
            environmentIOS: 'Sandbox',
          } as Purchase,
        ];

        (getAvailablePurchases as jest.Mock).mockResolvedValue(mockPurchases);

        const result = await getActiveSubscriptions();

        expect(result).toHaveLength(1);
        expect(result[0].productId).toBe('test.subscription');
        expect(result[0].environmentIOS).toBe('Sandbox');
      });

      it('should filter by subscription IDs when provided', async () => {
        const mockPurchases: Purchase[] = [
          {
            id: 'trans-123',
            productId: 'sub1',
            transactionId: 'trans-123',
            transactionDate: currentTime,
            platform: 'ios',
            transactionReceipt: 'receipt',
            expirationDateIOS: currentTime + (7 * oneDayMs),
          } as Purchase,
          {
            id: 'trans-456',
            productId: 'sub2',
            transactionId: 'trans-456',
            transactionDate: currentTime,
            platform: 'ios',
            transactionReceipt: 'receipt',
            expirationDateIOS: currentTime + (7 * oneDayMs),
          } as Purchase,
        ];

        (getAvailablePurchases as jest.Mock).mockResolvedValue(mockPurchases);

        const result = await getActiveSubscriptions(['sub1']);

        expect(result).toHaveLength(1);
        expect(result[0].productId).toBe('sub1');
      });

      it('should mark subscription as expiring soon if <= 7 days remaining', async () => {
        const mockPurchases: Purchase[] = [
          {
            id: 'trans-123',
            productId: 'test.subscription',
            transactionId: 'trans-123',
            transactionDate: currentTime,
            platform: 'ios',
            transactionReceipt: 'receipt',
            expirationDateIOS: currentTime + (5 * oneDayMs), // 5 days remaining
          } as Purchase,
        ];

        (getAvailablePurchases as jest.Mock).mockResolvedValue(mockPurchases);

        const result = await getActiveSubscriptions();

        expect(result[0].willExpireSoon).toBe(true);
        expect(result[0].daysUntilExpirationIOS).toBe(5);
      });

      it('should include purchaseToken when available', async () => {
        const mockPurchases: Purchase[] = [
          {
            id: 'trans-123',
            productId: 'test.subscription',
            transactionId: 'trans-123',
            transactionDate: currentTime,
            platform: 'ios',
            transactionReceipt: 'receipt',
            purchaseToken: 'jwt-token-example',
            expirationDateIOS: currentTime + (7 * oneDayMs),
          } as Purchase,
        ];

        (getAvailablePurchases as jest.Mock).mockResolvedValue(mockPurchases);

        const result = await getActiveSubscriptions();

        expect(result[0].purchaseToken).toBe('jwt-token-example');
      });

      it('should not mark subscription as expiring soon if > 7 days remaining', async () => {
        const mockPurchases: Purchase[] = [
          {
            id: 'trans-123',
            productId: 'test.subscription',
            transactionId: 'trans-123',
            transactionDate: currentTime,
            platform: 'ios',
            transactionReceipt: 'receipt',
            expirationDateIOS: currentTime + (10 * oneDayMs), // 10 days remaining
          } as Purchase,
        ];

        (getAvailablePurchases as jest.Mock).mockResolvedValue(mockPurchases);

        const result = await getActiveSubscriptions();

        expect(result[0].willExpireSoon).toBe(false);
        expect(result[0].daysUntilExpirationIOS).toBe(10);
      });
    });

    describe('Android', () => {
      beforeEach(() => {
        Platform.OS = 'android';
      });

      it('should return active subscriptions', async () => {
        const mockPurchases: Purchase[] = [
          {
            id: 'trans-123',
            productId: 'test.subscription',
            transactionId: 'trans-123',
            transactionDate: currentTime,
            platform: 'android',
            transactionReceipt: 'receipt',
            autoRenewingAndroid: true,
          } as Purchase,
        ];

        (getAvailablePurchases as jest.Mock).mockResolvedValue(mockPurchases);

        const result = await getActiveSubscriptions();

        expect(result).toHaveLength(1);
        expect(result[0].productId).toBe('test.subscription');
        expect(result[0].isActive).toBe(true);
        expect(result[0].transactionId).toBe('trans-123');
        expect(result[0].transactionDate).toBe(currentTime);
        expect(result[0].autoRenewingAndroid).toBe(true);
        expect(result[0].willExpireSoon).toBe(false);
      });

      it('should mark cancelled subscriptions as expiring soon', async () => {
        const mockPurchases: Purchase[] = [
          {
            id: 'trans-123',
            productId: 'test.subscription',
            transactionId: 'trans-123',
            transactionDate: currentTime,
            platform: 'android',
            transactionReceipt: 'receipt',
            autoRenewingAndroid: false,
          } as Purchase,
        ];

        (getAvailablePurchases as jest.Mock).mockResolvedValue(mockPurchases);

        const result = await getActiveSubscriptions();

        expect(result).toHaveLength(1);
        expect(result[0].autoRenewingAndroid).toBe(false);
        expect(result[0].willExpireSoon).toBe(true);
      });

      it('should filter by subscription IDs when provided', async () => {
        const mockPurchases: Purchase[] = [
          {
            id: 'trans-123',
            productId: 'sub1',
            transactionId: 'trans-123',
            transactionDate: currentTime,
            platform: 'android',
            transactionReceipt: 'receipt',
            autoRenewingAndroid: true,
          } as Purchase,
          {
            id: 'trans-456',
            productId: 'sub2',
            transactionId: 'trans-456',
            transactionDate: currentTime,
            platform: 'android',
            transactionReceipt: 'receipt',
            autoRenewingAndroid: true,
          } as Purchase,
        ];

        (getAvailablePurchases as jest.Mock).mockResolvedValue(mockPurchases);

        const result = await getActiveSubscriptions(['sub2']);

        expect(result).toHaveLength(1);
        expect(result[0].productId).toBe('sub2');
      });
    });

    describe('Edge cases', () => {
      it('should handle purchases without subscription fields', async () => {
        const mockPurchases: Purchase[] = [
          {
            id: 'trans-123',
            productId: 'regular.product',
            transactionId: 'trans-123',
            transactionDate: currentTime,
            platform: 'ios',
            transactionReceipt: 'receipt',
            // No subscription-specific fields
          } as Purchase,
        ];

        (getAvailablePurchases as jest.Mock).mockResolvedValue(mockPurchases);

        const result = await getActiveSubscriptions();

        expect(result).toHaveLength(0);
      });

      it('should return empty array when getAvailablePurchases throws error', async () => {
        (getAvailablePurchases as jest.Mock).mockRejectedValue(new Error('Network error'));

        const result = await getActiveSubscriptions();

        expect(result).toHaveLength(0);
      });

      it('should return all active subscriptions when no IDs filter provided', async () => {
        Platform.OS = 'ios';
        const mockPurchases: Purchase[] = [
          {
            id: 'trans-123',
            productId: 'sub1',
            transactionId: 'trans-123',
            transactionDate: currentTime,
            platform: 'ios',
            transactionReceipt: 'receipt',
            expirationDateIOS: currentTime + (7 * oneDayMs),
          } as Purchase,
          {
            id: 'trans-456',
            productId: 'sub2',
            transactionId: 'trans-456',
            transactionDate: currentTime,
            platform: 'ios',
            transactionReceipt: 'receipt',
            expirationDateIOS: currentTime + (7 * oneDayMs),
          } as Purchase,
        ];

        (getAvailablePurchases as jest.Mock).mockResolvedValue(mockPurchases);

        const result = await getActiveSubscriptions();

        expect(result).toHaveLength(2);
      });

      it('should return empty array when no purchases available', async () => {
        (getAvailablePurchases as jest.Mock).mockResolvedValue([]);

        const result = await getActiveSubscriptions();

        expect(result).toHaveLength(0);
      });
    });
  });

  describe('hasActiveSubscriptions', () => {
    it('should return true when active subscriptions exist', async () => {
      Platform.OS = 'ios';
      const mockPurchases: Purchase[] = [
        {
          id: 'trans-123',
          productId: 'test.subscription',
          transactionId: 'trans-123',
          transactionDate: currentTime,
          platform: 'ios',
          transactionReceipt: 'receipt',
          expirationDateIOS: currentTime + (7 * oneDayMs),
        } as Purchase,
      ];

      (getAvailablePurchases as jest.Mock).mockResolvedValue(mockPurchases);

      const result = await hasActiveSubscriptions();

      expect(result).toBe(true);
    });

    it('should return false when no active subscriptions exist', async () => {
      (getAvailablePurchases as jest.Mock).mockResolvedValue([]);

      const result = await hasActiveSubscriptions();

      expect(result).toBe(false);
    });

    it('should check specific subscription IDs when provided', async () => {
      Platform.OS = 'ios';
      const mockPurchases: Purchase[] = [
        {
          id: 'trans-123',
          productId: 'sub1',
          transactionId: 'trans-123',
          transactionDate: currentTime,
          platform: 'ios',
          transactionReceipt: 'receipt',
          expirationDateIOS: currentTime + (7 * oneDayMs),
        } as Purchase,
      ];

      (getAvailablePurchases as jest.Mock).mockResolvedValue(mockPurchases);

      const result1 = await hasActiveSubscriptions(['sub1']);
      const result2 = await hasActiveSubscriptions(['sub2']);

      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });
  });
});