// Mock native module and RN
jest.mock('../ExpoIapModule', () => require('../__mocks__/ExpoIapModule'));
jest.mock('react-native', () => ({
  Platform: {OS: 'ios', select: jest.fn((obj: any) => obj.ios)},
  NativeEventEmitter: jest.fn(() => ({
    addListener: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
  })),
}));

/* eslint-disable import/first */
import * as React from 'react';
import * as ReactTestRenderer from 'react-test-renderer';
import ExpoIapModule from '../ExpoIapModule';
import {useIAP, UseIAPOptions} from '../useIAP';
/* eslint-enable import/first */

// Suppress console output during tests
const consoleErrorSpy = jest
  .spyOn(console, 'error')
  .mockImplementation(() => {});
const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

afterEach(() => {
  consoleErrorSpy.mockClear();
  consoleWarnSpy.mockClear();
  consoleLogSpy.mockClear();
});

afterAll(() => {
  consoleErrorSpy.mockRestore();
  consoleWarnSpy.mockRestore();
  consoleLogSpy.mockRestore();
});

// Helper component to test the hook
function TestComponent({
  options,
  onHookReady,
}: {
  options?: UseIAPOptions;
  onHookReady: (hook: ReturnType<typeof useIAP>) => void;
}) {
  const hook = useIAP(options);
  React.useEffect(() => {
    onHookReady(hook);
  }, [hook, onHookReady]);
  return null;
}

// Helper to wait for async operations
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('useIAP hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock for initConnection
    (ExpoIapModule.initConnection as jest.Mock) = jest
      .fn()
      .mockResolvedValue(true);
    (ExpoIapModule.endConnection as jest.Mock) = jest
      .fn()
      .mockResolvedValue(true);
    (ExpoIapModule.addListener as jest.Mock) = jest.fn().mockReturnValue({
      remove: jest.fn(),
    });
  });

  describe('onError callback', () => {
    it('calls onError when fetchProducts fails', async () => {
      const mockError = new Error('Failed to query product');
      (ExpoIapModule.fetchProducts as jest.Mock) = jest
        .fn()
        .mockRejectedValue(mockError);

      const onError = jest.fn();
      let hookResult: ReturnType<typeof useIAP> | null = null;

      await ReactTestRenderer.act(async () => {
        ReactTestRenderer.create(
          <TestComponent
            options={{onError}}
            onHookReady={(hook) => {
              hookResult = hook;
            }}
          />,
        );
        await flushPromises();
      });

      expect(hookResult).not.toBeNull();

      // Wait for connection
      await ReactTestRenderer.act(async () => {
        await flushPromises();
      });

      // Trigger fetchProducts
      await ReactTestRenderer.act(async () => {
        try {
          await hookResult!.fetchProducts({skus: ['product_1']});
        } catch {
          // Expected to throw
        }
      });

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(mockError);
    });

    it('calls onError when getAvailablePurchases fails', async () => {
      const mockError = new Error('Network error');
      (ExpoIapModule.getAvailableItems as jest.Mock) = jest
        .fn()
        .mockRejectedValue(mockError);

      const onError = jest.fn();
      let hookResult: ReturnType<typeof useIAP> | null = null;

      await ReactTestRenderer.act(async () => {
        ReactTestRenderer.create(
          <TestComponent
            options={{onError}}
            onHookReady={(hook) => {
              hookResult = hook;
            }}
          />,
        );
        await flushPromises();
      });

      await ReactTestRenderer.act(async () => {
        await flushPromises();
      });

      await ReactTestRenderer.act(async () => {
        try {
          await hookResult!.getAvailablePurchases();
        } catch {
          // Expected to throw
        }
      });

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(mockError);
    });

    it('calls onError when getActiveSubscriptions fails', async () => {
      const mockError = new Error('Store unavailable');
      (ExpoIapModule.getActiveSubscriptions as jest.Mock) = jest
        .fn()
        .mockRejectedValue(mockError);

      const onError = jest.fn();
      let hookResult: ReturnType<typeof useIAP> | null = null;

      await ReactTestRenderer.act(async () => {
        ReactTestRenderer.create(
          <TestComponent
            options={{onError}}
            onHookReady={(hook) => {
              hookResult = hook;
            }}
          />,
        );
        await flushPromises();
      });

      await ReactTestRenderer.act(async () => {
        await flushPromises();
      });

      await ReactTestRenderer.act(async () => {
        try {
          await hookResult!.getActiveSubscriptions();
        } catch {
          // Expected to throw
        }
      });

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(mockError);
    });

    it('calls onError when restorePurchases fails', async () => {
      const mockError = new Error('Restore failed');
      (ExpoIapModule.getAvailableItems as jest.Mock) = jest
        .fn()
        .mockRejectedValue(mockError);

      const onError = jest.fn();
      let hookResult: ReturnType<typeof useIAP> | null = null;

      await ReactTestRenderer.act(async () => {
        ReactTestRenderer.create(
          <TestComponent
            options={{onError}}
            onHookReady={(hook) => {
              hookResult = hook;
            }}
          />,
        );
        await flushPromises();
      });

      await ReactTestRenderer.act(async () => {
        await flushPromises();
      });

      await ReactTestRenderer.act(async () => {
        try {
          await hookResult!.restorePurchases();
        } catch {
          // Expected to throw
        }
      });

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(mockError);
    });

    it('does not call onError when fetchProducts succeeds', async () => {
      (ExpoIapModule.fetchProducts as jest.Mock) = jest
        .fn()
        .mockResolvedValue([{platform: 'ios', id: 'product_1'}]);

      const onError = jest.fn();
      let hookResult: ReturnType<typeof useIAP> | null = null;

      await ReactTestRenderer.act(async () => {
        ReactTestRenderer.create(
          <TestComponent
            options={{onError}}
            onHookReady={(hook) => {
              hookResult = hook;
            }}
          />,
        );
        await flushPromises();
      });

      await ReactTestRenderer.act(async () => {
        await flushPromises();
      });

      await ReactTestRenderer.act(async () => {
        await hookResult!.fetchProducts({skus: ['product_1']});
      });

      expect(onError).not.toHaveBeenCalled();
    });

    it('does not call onError when getAvailablePurchases succeeds', async () => {
      (ExpoIapModule.getAvailableItems as jest.Mock) = jest
        .fn()
        .mockResolvedValue([]);

      const onError = jest.fn();
      let hookResult: ReturnType<typeof useIAP> | null = null;

      await ReactTestRenderer.act(async () => {
        ReactTestRenderer.create(
          <TestComponent
            options={{onError}}
            onHookReady={(hook) => {
              hookResult = hook;
            }}
          />,
        );
        await flushPromises();
      });

      await ReactTestRenderer.act(async () => {
        await flushPromises();
      });

      await ReactTestRenderer.act(async () => {
        await hookResult!.getAvailablePurchases();
      });

      expect(onError).not.toHaveBeenCalled();
    });

    it('still throws error after calling onError', async () => {
      const mockError = new Error('Failed to query product');
      (ExpoIapModule.fetchProducts as jest.Mock) = jest
        .fn()
        .mockRejectedValue(mockError);

      const onError = jest.fn();
      let hookResult: ReturnType<typeof useIAP> | null = null;

      await ReactTestRenderer.act(async () => {
        ReactTestRenderer.create(
          <TestComponent
            options={{onError}}
            onHookReady={(hook) => {
              hookResult = hook;
            }}
          />,
        );
        await flushPromises();
      });

      await ReactTestRenderer.act(async () => {
        await flushPromises();
      });

      let thrownError: Error | null = null;
      await ReactTestRenderer.act(async () => {
        try {
          await hookResult!.fetchProducts({skus: ['product_1']});
        } catch (error) {
          thrownError = error as Error;
        }
      });

      expect(onError).toHaveBeenCalledWith(mockError);
      expect(thrownError).toBe(mockError);
    });

    it('works without onError callback (optional)', async () => {
      const mockError = new Error('Failed to query product');
      (ExpoIapModule.fetchProducts as jest.Mock) = jest
        .fn()
        .mockRejectedValue(mockError);

      let hookResult: ReturnType<typeof useIAP> | null = null;

      // No onError callback provided
      await ReactTestRenderer.act(async () => {
        ReactTestRenderer.create(
          <TestComponent
            onHookReady={(hook) => {
              hookResult = hook;
            }}
          />,
        );
        await flushPromises();
      });

      await ReactTestRenderer.act(async () => {
        await flushPromises();
      });

      let thrownError: Error | null = null;
      await ReactTestRenderer.act(async () => {
        try {
          await hookResult!.fetchProducts({skus: ['product_1']});
        } catch (error) {
          thrownError = error as Error;
        }
      });

      // Should still throw even without onError callback
      expect(thrownError).toBe(mockError);
    });

    it('calls onError when initConnection fails', async () => {
      const mockError = new Error('Failed to initialize connection');
      (ExpoIapModule.initConnection as jest.Mock) = jest
        .fn()
        .mockRejectedValue(mockError);

      const onError = jest.fn();

      await ReactTestRenderer.act(async () => {
        ReactTestRenderer.create(
          <TestComponent options={{onError}} onHookReady={() => {}} />,
        );
        await flushPromises();
      });

      // Wait for initConnection to be called and fail
      await ReactTestRenderer.act(async () => {
        await flushPromises();
      });

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(mockError);
    });

    it('does not throw unhandled exception when initConnection fails with onError', async () => {
      const mockError = new Error('Store unavailable');
      (ExpoIapModule.initConnection as jest.Mock) = jest
        .fn()
        .mockRejectedValue(mockError);

      const onError = jest.fn();

      // This should not throw an unhandled promise rejection
      await ReactTestRenderer.act(async () => {
        ReactTestRenderer.create(
          <TestComponent options={{onError}} onHookReady={() => {}} />,
        );
        await flushPromises();
      });

      await ReactTestRenderer.act(async () => {
        await flushPromises();
      });

      // onError should be called, error should be handled gracefully
      expect(onError).toHaveBeenCalledWith(mockError);
    });

    it('handles initConnection failure without onError callback', async () => {
      const mockError = new Error('Connection failed');
      (ExpoIapModule.initConnection as jest.Mock) = jest
        .fn()
        .mockRejectedValue(mockError);

      // No onError callback - should not throw unhandled exception
      await ReactTestRenderer.act(async () => {
        ReactTestRenderer.create(<TestComponent onHookReady={() => {}} />);
        await flushPromises();
      });

      await ReactTestRenderer.act(async () => {
        await flushPromises();
      });

      // Test passes if no unhandled exception is thrown
      expect(ExpoIapModule.initConnection).toHaveBeenCalled();
    });
  });
});
