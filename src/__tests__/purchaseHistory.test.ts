import { getPurchaseHistory, getPurchaseHistories } from '../index';
import ExpoIapModule from '../ExpoIapModule';
import { Platform } from 'react-native';

// Mock the console.warn
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();

// Mock ExpoIapModule
jest.mock('../ExpoIapModule', () => ({
  getAvailableItems: jest.fn(),
  getPurchaseHistoryByType: jest.fn(),
}));

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    select: jest.fn(),
  },
}));

describe('Purchase History API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleWarn.mockClear();
  });

  afterAll(() => {
    mockConsoleWarn.mockRestore();
  });

  describe('getPurchaseHistory (deprecated)', () => {
    it('should log deprecation warning when called', async () => {
      // Setup
      const mockPlatformSelect = Platform.select as jest.Mock;
      mockPlatformSelect.mockReturnValue(() => Promise.resolve([]));

      // Act
      await getPurchaseHistory();

      // Assert
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        '`getPurchaseHistory` is deprecated. Use `getPurchaseHistories` instead. This function will be removed in version 3.0.0.'
      );
    });

    it('should call getPurchaseHistories internally', async () => {
      // Setup
      const mockPlatformSelect = Platform.select as jest.Mock;
      const mockIosImplementation = jest.fn().mockResolvedValue([]);
      mockPlatformSelect.mockReturnValue(mockIosImplementation);

      // Act
      await getPurchaseHistory({
        alsoPublishToEventListener: true,
        onlyIncludeActiveItems: true,
      });

      // Assert
      expect(mockPlatformSelect).toHaveBeenCalled();
      // The function should be called via getPurchaseHistories
      expect(mockIosImplementation).toHaveBeenCalled();
    });
  });

  describe('getPurchaseHistories', () => {
    it('should NOT log deprecation warning when called', async () => {
      // Setup
      const mockPlatformSelect = Platform.select as jest.Mock;
      mockPlatformSelect.mockReturnValue(() => Promise.resolve([]));

      // Act
      await getPurchaseHistories();

      // Assert
      expect(mockConsoleWarn).not.toHaveBeenCalled();
    });

    describe('iOS', () => {
      beforeEach(() => {
        const mockPlatformSelect = Platform.select as jest.Mock;
        mockPlatformSelect.mockImplementation((options) => options.ios);
      });

      it('should call getAvailableItems on iOS', async () => {
        // Setup
        const mockItems = [
          { id: 'item1', transactionId: 'tx1' },
          { id: 'item2', transactionId: 'tx2' },
        ];
        (ExpoIapModule.getAvailableItems as jest.Mock).mockResolvedValue(mockItems);

        // Act
        const result = await getPurchaseHistories({
          alsoPublishToEventListener: true,
          onlyIncludeActiveItems: false,
        });

        // Assert
        expect(ExpoIapModule.getAvailableItems).toHaveBeenCalledWith(true, false);
        expect(result).toEqual(mockItems);
      });

      it('should use default parameters on iOS', async () => {
        // Setup
        (ExpoIapModule.getAvailableItems as jest.Mock).mockResolvedValue([]);

        // Act
        await getPurchaseHistories();

        // Assert
        expect(ExpoIapModule.getAvailableItems).toHaveBeenCalledWith(false, false);
      });
    });

    describe('Android', () => {
      beforeEach(() => {
        const mockPlatformSelect = Platform.select as jest.Mock;
        mockPlatformSelect.mockImplementation((options) => options.android);
      });

      it('should call getPurchaseHistoryByType for both inapp and subs on Android', async () => {
        // Setup
        const mockProducts = [{ id: 'product1', purchaseToken: 'token1' }];
        const mockSubscriptions = [{ id: 'sub1', purchaseToken: 'token2' }];
        
        (ExpoIapModule.getPurchaseHistoryByType as jest.Mock)
          .mockResolvedValueOnce(mockProducts)
          .mockResolvedValueOnce(mockSubscriptions);

        // Act
        const result = await getPurchaseHistories();

        // Assert
        expect(ExpoIapModule.getPurchaseHistoryByType).toHaveBeenCalledTimes(2);
        expect(ExpoIapModule.getPurchaseHistoryByType).toHaveBeenNthCalledWith(1, 'inapp');
        expect(ExpoIapModule.getPurchaseHistoryByType).toHaveBeenNthCalledWith(2, 'subs');
        expect(result).toEqual([...mockProducts, ...mockSubscriptions]);
      });
    });

    describe('Unsupported Platform', () => {
      beforeEach(() => {
        const mockPlatformSelect = Platform.select as jest.Mock;
        mockPlatformSelect.mockReturnValue(null);
      });

      it('should return empty array for unsupported platforms', async () => {
        // Act
        const result = await getPurchaseHistories();

        // Assert
        expect(result).toEqual([]);
      });
    });
  });
});