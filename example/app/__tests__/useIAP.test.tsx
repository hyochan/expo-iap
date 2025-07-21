import { renderHook, act } from '@testing-library/react-hooks';

// Mock the useIAP hook
const mockUseIAP = jest.fn();

jest.mock('expo-iap', () => ({
  useIAP: mockUseIAP,
}));

describe('useIAP Hook', () => {
  const mockReturnValue = {
    connected: false,
    products: [],
    subscriptions: [],
    purchaseHistories: [],
    availablePurchases: [],
    currentPurchase: null,
    currentPurchaseError: null,
    initConnection: jest.fn().mockResolvedValue(true),
    endConnection: jest.fn(),
    getProducts: jest.fn().mockResolvedValue([]),
    getSubscriptions: jest.fn().mockResolvedValue([]),
    getPurchaseHistories: jest.fn().mockResolvedValue([]),
    requestPurchase: jest.fn(),
    finishTransaction: jest.fn(),
    restorePurchases: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIAP.mockReturnValue(mockReturnValue);
  });

  it('should initialize with default values', () => {
    const { useIAP } = require('expo-iap');
    const { result } = renderHook(() => useIAP());

    expect(result.current.connected).toBe(false);
    expect(result.current.products).toEqual([]);
    expect(result.current.subscriptions).toEqual([]);
    expect(result.current.purchaseHistories).toEqual([]);
  });

  it('should connect to store', async () => {
    const { result } = renderHook(() => useIAP());

    await act(async () => {
      await result.current.initConnection();
    });

    expect(mockUseIAP.initConnection).toHaveBeenCalled();
  });

  it('should fetch products', async () => {
    const mockProducts = [
      {
        id: 'com.example.product',
        title: 'Test Product',
        price: '1.99',
        displayPrice: '$1.99',
        description: 'Test description',
        currencyCode: 'USD',
        currencySymbol: '$',
        platform: 'ios',
      },
    ];

    mockUseIAP.getProducts.mockResolvedValueOnce(mockProducts);

    const { result } = renderHook(() => useIAP());

    await act(async () => {
      await result.current.getProducts(['com.example.product']);
    });

    expect(mockUseIAP.getProducts).toHaveBeenCalledWith(['com.example.product']);
  });

  it('should fetch subscriptions', async () => {
    const mockSubscriptions = [
      {
        id: 'com.example.subscription',
        title: 'Test Subscription',
        price: '9.99',
        displayPrice: '$9.99',
        description: 'Monthly subscription',
        currencyCode: 'USD',
        currencySymbol: '$',
        platform: 'ios',
        subscription: {
          subscriptionPeriod: {
            unit: 'MONTH',
            value: 1,
          },
        },
      },
    ];

    mockUseIAP.getSubscriptions.mockResolvedValueOnce(mockSubscriptions);

    const { result } = renderHook(() => useIAP());

    await act(async () => {
      await result.current.getSubscriptions(['com.example.subscription']);
    });

    expect(mockUseIAP.getSubscriptions).toHaveBeenCalledWith(['com.example.subscription']);
  });

  it('should fetch purchase histories (plural)', async () => {
    const mockHistories = [
      {
        productId: 'com.example.product',
        transactionId: '123456',
        transactionDate: Date.now(),
        transactionReceipt: 'receipt_data',
      },
    ];

    mockUseIAP.getPurchaseHistories.mockResolvedValueOnce(mockHistories);

    const { result } = renderHook(() => useIAP());

    await act(async () => {
      await result.current.getPurchaseHistories();
    });

    expect(mockUseIAP.getPurchaseHistories).toHaveBeenCalled();
  });

  it('should request purchase', async () => {
    const { result } = renderHook(() => useIAP());

    await act(async () => {
      await result.current.requestPurchase({
        request: { sku: 'com.example.product' },
      });
    });

    expect(mockUseIAP.requestPurchase).toHaveBeenCalledWith({
      request: { sku: 'com.example.product' },
    });
  });

  it('should finish transaction', async () => {
    const { result } = renderHook(() => useIAP());

    await act(async () => {
      await result.current.finishTransaction({
        transactionId: '123456',
        platform: 'ios',
      });
    });

    expect(mockUseIAP.finishTransaction).toHaveBeenCalledWith({
      transactionId: '123456',
      platform: 'ios',
    });
  });

  it('should disconnect from store', async () => {
    const { result } = renderHook(() => useIAP());

    await act(async () => {
      await result.current.endConnection();
    });

    expect(mockUseIAP.endConnection).toHaveBeenCalled();
  });
});