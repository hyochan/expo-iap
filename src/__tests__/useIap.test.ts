import { renderHook, act } from '@testing-library/react-hooks';
import { useIAP } from '../useIap';
import * as IapModule from '../index';
import { Platform } from 'react-native';

// Mock the IAP module
jest.mock('../index', () => ({
  initConnection: jest.fn().mockResolvedValue(true),
  endConnection: jest.fn(),
  purchaseUpdatedListener: jest.fn(),
  purchaseErrorListener: jest.fn(),
  getProducts: jest.fn().mockResolvedValue([]),
  getSubscriptions: jest.fn().mockResolvedValue([]),
  getAvailablePurchases: jest.fn().mockResolvedValue([]),
  getPurchaseHistories: jest.fn().mockResolvedValue([]),
  finishTransaction: jest.fn().mockResolvedValue(true),
  requestPurchase: jest.fn().mockResolvedValue({}),
}));

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

// Mock expo-modules-core
jest.mock('expo-modules-core', () => ({
  EventSubscription: jest.fn(),
}));

describe('useIAP Hook', () => {
  let mockRemove: jest.Mock;
  let mockListeners: {
    purchaseUpdate?: { remove: jest.Mock };
    purchaseError?: { remove: jest.Mock };
    promotedProductsIos?: { remove: jest.Mock };
  };

  beforeEach(() => {
    mockRemove = jest.fn();
    mockListeners = {
      purchaseUpdate: { remove: mockRemove },
      purchaseError: { remove: mockRemove },
      promotedProductsIos: { remove: mockRemove },
    };

    // Setup listener mocks
    (IapModule.purchaseUpdatedListener as jest.Mock).mockReturnValue(mockListeners.purchaseUpdate);
    (IapModule.purchaseErrorListener as jest.Mock).mockReturnValue(mockListeners.purchaseError);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Purchase History Naming', () => {
    it('should expose purchaseHistories (plural) in the hook return value', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useIAP());

      await waitForNextUpdate();

      // Check that the hook exposes purchaseHistories (plural)
      expect(result.current).toHaveProperty('purchaseHistories');
      expect(result.current.purchaseHistories).toEqual([]);
    });

    it('should expose getPurchaseHistories (plural) method', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useIAP());

      await waitForNextUpdate();

      // Check that the hook exposes getPurchaseHistories (plural)
      expect(result.current).toHaveProperty('getPurchaseHistories');
      expect(typeof result.current.getPurchaseHistories).toBe('function');
    });

    it('should call getPurchaseHistories (plural) from the module', async () => {
      const mockHistories = [
        { id: 'purchase1', transactionId: 'tx1' },
        { id: 'purchase2', transactionId: 'tx2' },
      ];
      (IapModule.getPurchaseHistories as jest.Mock).mockResolvedValue(mockHistories);

      const { result, waitForNextUpdate } = renderHook(() => useIAP());

      await waitForNextUpdate();

      // Call the method
      await act(async () => {
        await result.current.getPurchaseHistories();
      });

      // Verify the correct function was called
      expect(IapModule.getPurchaseHistories).toHaveBeenCalled();
      expect(result.current.purchaseHistories).toEqual(mockHistories);
    });

    it('should NOT have purchaseHistory (singular) property', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useIAP());

      await waitForNextUpdate();

      // Ensure the singular form is not exposed
      expect(result.current).not.toHaveProperty('purchaseHistory');
    });

    it('should NOT have getPurchaseHistory (singular) method', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useIAP());

      await waitForNextUpdate();

      // Ensure the singular form method is not exposed
      expect(result.current).not.toHaveProperty('getPurchaseHistory');
    });
  });

  describe('Hook Initialization', () => {
    it('should initialize connection on mount', async () => {
      renderHook(() => useIAP());

      await act(async () => {
        await Promise.resolve();
      });

      expect(IapModule.initConnection).toHaveBeenCalled();
    });

    it('should set up purchase listeners on successful connection', async () => {
      const { waitForNextUpdate } = renderHook(() => useIAP());

      await waitForNextUpdate();

      expect(IapModule.purchaseUpdatedListener).toHaveBeenCalled();
      expect(IapModule.purchaseErrorListener).toHaveBeenCalled();
    });

    it('should clean up on unmount', async () => {
      const { unmount, waitForNextUpdate } = renderHook(() => useIAP());

      await waitForNextUpdate();

      unmount();

      expect(mockRemove).toHaveBeenCalled();
      expect(IapModule.endConnection).toHaveBeenCalled();
    });
  });

  describe('TypeScript Type Definitions', () => {
    it('should have correct type for purchaseHistories', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useIAP());

      await waitForNextUpdate();

      // This test primarily ensures TypeScript compilation works correctly
      // with the plural form. The actual runtime test is above.
      const histories: typeof result.current.purchaseHistories = [];
      expect(Array.isArray(histories)).toBe(true);
    });
  });
});