// Mock native module and RN
jest.mock('../ExpoIapModule');
jest.mock('react-native', () => ({
  Platform: {OS: 'ios', select: jest.fn((obj) => obj.ios)},
  NativeEventEmitter: jest.fn(() => ({
    addListener: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
  })),
}));

/* eslint-disable import/first */
import ExpoIapModule from '../ExpoIapModule';
import {
  purchaseUpdatedListener,
  purchaseErrorListener,
  OpenIapEvent,
  fetchProducts,
  requestPurchase,
  initConnection,
  endConnection,
  finishTransaction,
  getStorefront,
  validateReceipt,
  deepLinkToSubscriptions,
  getAvailablePurchases,
  restorePurchases,
  promotedProductListenerIOS,
  PurchaseInput,
  getActiveSubscriptions,
  hasActiveSubscriptions,
} from '../index';
import * as iosMod from '../modules/ios';
import * as androidMod from '../modules/android';
import {Platform} from 'react-native';
/* eslint-enable import/first */

const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

afterEach(() => {
  consoleLogSpy.mockClear();
});

afterAll(() => {
  consoleLogSpy.mockRestore();
});

describe('Public API (index.ts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listeners', () => {
    it('registers purchase updated listener', () => {
      const addListener = (ExpoIapModule as any).addListener as jest.Mock;
      const fn = jest.fn();
      purchaseUpdatedListener(fn);
      expect(addListener).toHaveBeenCalledWith(
        OpenIapEvent.PurchaseUpdated,
        expect.any(Function),
      );
      const passed = addListener.mock.calls[0][1];
      const event = {id: 't', productId: 'p', platform: 'IOS'} as any;
      passed(event);
      expect(fn).toHaveBeenCalledWith({...event, platform: 'ios'});
    });

    it('registers purchase error listener', () => {
      const addListener = (ExpoIapModule as any).addListener as jest.Mock;
      const fn = jest.fn();
      purchaseErrorListener(fn);
      expect(addListener).toHaveBeenCalledWith(
        OpenIapEvent.PurchaseError,
        expect.any(Function),
      );
      const passed = addListener.mock.calls[0][1];
      const err = {message: 'm', code: 'UNKNOWN'} as any;
      passed(err);
      expect(fn).toHaveBeenCalledWith(err);
    });

    it('promotedProductListenerIOS warns on non‑iOS, adds on iOS', () => {
      (Platform as any).OS = 'android';
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const sub = promotedProductListenerIOS(jest.fn());
      expect(typeof sub.remove).toBe('function');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();

      (Platform as any).OS = 'ios';
      (Platform as any).select = (obj: any) => obj.ios;
      const addListener = (ExpoIapModule as any).addListener as jest.Mock;
      promotedProductListenerIOS(jest.fn());
      expect(addListener).toHaveBeenCalledWith(
        'promoted-product-ios',
        expect.any(Function),
      );
    });
  });

  describe('connection', () => {
    it('initConnection and endConnection delegate to native', async () => {
      (ExpoIapModule.initConnection as jest.Mock) = jest
        .fn()
        .mockResolvedValue(true);
      (ExpoIapModule.endConnection as jest.Mock) = jest
        .fn()
        .mockResolvedValue(true);
      await expect(initConnection()).resolves.toBe(true);
      await expect(endConnection()).resolves.toBe(true);
      expect(ExpoIapModule.initConnection).toHaveBeenCalled();
      expect(ExpoIapModule.endConnection).toHaveBeenCalled();
    });
  });

  describe('fetchProducts', () => {
    it('filters iOS products by skus', async () => {
      (Platform as any).OS = 'ios';
      (Platform as any).select = (obj: any) => obj.ios;
      (ExpoIapModule.fetchProducts as jest.Mock) = jest.fn().mockResolvedValue([
        {platform: 'ios', id: 'a'},
        {platform: 'ios', id: 'b'},
        {platform: 'android', id: 'a'},
      ]);
      const res = await fetchProducts({skus: ['b', 'c'], type: 'in-app'});
      expect(res).toEqual([{platform: 'ios', id: 'b'}]);
    });

    it('filters Android products by skus', async () => {
      (Platform as any).OS = 'android';
      (Platform as any).select = (obj: any) => obj.android;
      (ExpoIapModule.fetchProducts as jest.Mock) = jest.fn().mockResolvedValue([
        {platform: 'android', id: 'sub1'},
        {platform: 'android', id: 'sub2'},
        {platform: 'ios', id: 'sub1'},
      ]);
      const res = await fetchProducts({skus: ['sub2'], type: 'subs'});
      expect(ExpoIapModule.fetchProducts).toHaveBeenCalledWith('subs', [
        'sub2',
      ]);
      expect(res).toEqual([{platform: 'android', id: 'sub2'}]);
    });

    it('fetchProducts rejects on empty skus', async () => {
      await expect(
        fetchProducts({skus: [], type: 'in-app'}),
      ).rejects.toMatchObject({
        code: 'empty-sku-list',
      } as any);
    });

    it('fetchProducts default path throws unsupported platform', async () => {
      (Platform as any).OS = 'windows';
      await expect(fetchProducts({skus: ['a']} as any)).rejects.toThrow(
        /Unsupported platform/,
      );
    });

    it('warns when using legacy inapp type alias', async () => {
      (Platform as any).OS = 'ios';
      (Platform as any).select = (obj: any) => obj.ios;
      (ExpoIapModule.fetchProducts as jest.Mock) = jest
        .fn()
        .mockResolvedValue([{platform: 'ios', id: 'legacy'}]);
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      await fetchProducts({skus: ['legacy'], type: 'inapp' as any});

      expect(warnSpy).toHaveBeenCalledWith(
        '[Expo-IAP]',
        "'inapp' product type is deprecated and will be removed in v3.1.0. Use 'in-app' instead.",
      );
      warnSpy.mockRestore();
    });

    it('returns results unchanged when querying all product types', async () => {
      (Platform as any).OS = 'ios';
      (Platform as any).select = (obj: any) => obj.ios;
      (ExpoIapModule.fetchProducts as jest.Mock) = jest.fn().mockResolvedValue([
        {platform: 'ios', id: 'a'},
        {platform: 'ios', id: 'b'},
      ]);

      const res = await fetchProducts({skus: ['a', 'b'], type: 'all'});

      expect(res).toEqual([
        {platform: 'ios', id: 'a'},
        {platform: 'ios', id: 'b'},
      ]);
    });
  });

  describe('requestPurchase', () => {
    it('passes through iOS purchase params', async () => {
      (Platform as any).OS = 'ios';
      (ExpoIapModule.requestPurchase as jest.Mock) = jest
        .fn()
        .mockResolvedValue({id: 'x'});
      const res: any = await requestPurchase({
        request: {
          ios: {
            sku: 'sku1',
            andDangerouslyFinishTransactionAutomatically: true,
          },
        },
        type: 'in-app',
      });
      expect(ExpoIapModule.requestPurchase).toHaveBeenCalledWith({
        type: 'in-app',
        request: {
          ios: {
            sku: 'sku1',
            andDangerouslyFinishTransactionAutomatically: true,
          },
        },
      });
      expect(res).toEqual({id: 'x'});
    });

    it('throws on unsupported iOS product type', async () => {
      (Platform as any).OS = 'ios';
      (ExpoIapModule.requestPurchase as jest.Mock) = jest.fn();
      await expect(
        requestPurchase({
          request: {ios: {sku: 'skuX'}},
          type: 'all',
        } as any),
      ).rejects.toThrow(/Unsupported product type/);
      expect(ExpoIapModule.requestPurchase).not.toHaveBeenCalled();
    });

    it('normalizes iOS array purchases', async () => {
      (Platform as any).OS = 'ios';
      (ExpoIapModule.requestPurchase as jest.Mock) = jest
        .fn()
        .mockResolvedValue([{id: 'a', platform: 'IOS'}]);

      const res = await requestPurchase({
        request: {ios: {sku: 'skuSub'}},
        type: 'subs',
      });

      expect(res).toEqual([{id: 'a', platform: 'ios'}]);
    });

    it('returns empty array when iOS subs resolves null', async () => {
      (Platform as any).OS = 'ios';
      (ExpoIapModule.requestPurchase as jest.Mock) = jest
        .fn()
        .mockResolvedValue(null);

      const res = await requestPurchase({
        request: {ios: {sku: 'skuSub'}},
        type: 'subs',
      });

      expect(res).toEqual([]);
    });

    it('maps Android in-app request properly', async () => {
      (Platform as any).OS = 'android';
      (Platform as any).select = (obj: any) => obj.android;
      (ExpoIapModule.requestPurchase as jest.Mock) = jest
        .fn()
        .mockResolvedValue([]);
      await requestPurchase({
        request: {android: {skus: ['p1']}},
        type: 'in-app',
      });
      expect(ExpoIapModule.requestPurchase).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'in-app',
          skuArr: ['p1'],
          offerTokenArr: [],
        }),
      );
    });

    it('maps Android subs request using subscriptionOffers', async () => {
      (Platform as any).OS = 'android';
      (ExpoIapModule.requestPurchase as jest.Mock) = jest
        .fn()
        .mockResolvedValue([]);
      await requestPurchase({
        request: {
          android: {
            skus: ['sub1'],
            subscriptionOffers: [{sku: 'sub1', offerToken: 'token-123'}],
          },
        },
        type: 'subs',
      });
      expect(ExpoIapModule.requestPurchase).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'subs',
          skuArr: ['sub1'],
          offerTokenArr: ['token-123'],
          subscriptionOffers: [{sku: 'sub1', offerToken: 'token-123'}],
        }),
      );
    });

    it('iOS rejects when sku missing', async () => {
      (Platform as any).OS = 'ios';
      await expect(
        requestPurchase({request: {ios: {}} as any, type: 'in-app'} as any),
      ).rejects.toThrow(/sku/);
    });

    it('Android rejects when skus missing', async () => {
      (Platform as any).OS = 'android';
      await expect(
        requestPurchase({request: {android: {}} as any, type: 'in-app'} as any),
      ).rejects.toThrow(/skus/);
    });

    it('Android invalid type throws', async () => {
      (Platform as any).OS = 'android';
      await expect(
        requestPurchase({
          request: {android: {skus: ['x']}} as any,
          type: 'other' as any,
        }),
      ).rejects.toThrow(/Unsupported product type/);
    });

    it('Android rejects purchase requests for all product types', async () => {
      (Platform as any).OS = 'android';
      await expect(
        requestPurchase({
          request: {android: {skus: ['x']}} as any,
          type: 'all' as any,
        }),
      ).rejects.toThrow(/valid request object/);
    });

    it('Android subscription requests require skus array', async () => {
      (Platform as any).OS = 'android';
      await expect(
        requestPurchase({
          request: {android: {}} as any,
          type: 'subs',
        }),
      ).rejects.toThrow(/The `skus` property is required/);
    });

    it('iOS maps withOffer through offerToRecordIOS', async () => {
      (Platform as any).OS = 'ios';
      const offer = {
        identifier: 'id',
        keyIdentifier: 'key',
        nonce: 'nonce',
        signature: 'sig',
        timestamp: 1234567890,
      } as any;
      (ExpoIapModule.requestPurchase as jest.Mock) = jest
        .fn()
        .mockResolvedValue({id: 'x'});
      await requestPurchase({
        request: {ios: {sku: 'sku1', withOffer: offer}},
        type: 'in-app',
      } as any);
      expect(ExpoIapModule.requestPurchase).toHaveBeenCalledWith({
        type: 'in-app',
        request: {
          ios: {
            sku: 'sku1',
            withOffer: offer,
          },
        },
      });
    });
  });

  describe('legacy wrappers and getters', () => {
    it('getAvailablePurchases: iOS and Android paths', async () => {
      // iOS path
      (Platform as any).OS = 'ios';
      (Platform as any).select = (obj: any) => obj.ios;
      (ExpoIapModule.getAvailableItems as jest.Mock) = jest
        .fn()
        .mockResolvedValue([]);
      await getAvailablePurchases({
        alsoPublishToEventListenerIOS: true,
        onlyIncludeActiveItemsIOS: false,
      });
      expect(ExpoIapModule.getAvailableItems).toHaveBeenCalledWith(true, false);

      // Android path (unified getAvailableItems)
      (Platform as any).OS = 'android';
      (Platform as any).select = (obj: any) => obj.android;
      (ExpoIapModule.getAvailableItems as jest.Mock) = jest
        .fn()
        .mockResolvedValueOnce([
          {id: 'p1', transactionId: 'txn-1'},
          {id: 's1', transactionId: 'txn-2'},
        ]);
      const res = await getAvailablePurchases();
      expect(ExpoIapModule.getAvailableItems).toHaveBeenCalled();
      expect(res).toHaveLength(2);
      expect(res.map((p) => p.id)).toEqual(['p1', 's1']);
    });

    it('restorePurchases performs iOS sync then fetches purchases', async () => {
      (Platform as any).OS = 'ios';
      (Platform as any).select = (obj: any) => obj.ios;
      jest.spyOn(iosMod as any, 'syncIOS').mockResolvedValue(undefined as any);
      (ExpoIapModule.getAvailableItems as jest.Mock) = jest
        .fn()
        .mockResolvedValue([{id: 'legacy', transactionId: 'txn-restore'}]);
      await restorePurchases();
      expect(ExpoIapModule.getAvailableItems).toHaveBeenCalledWith(false, true);
    });

    it('getPurchaseHistory placeholder (removed in v3)', () => {
      // Removed legacy API in v3; keeping placeholder to maintain suite structure
      expect(true).toBe(true);
    });
  });

  describe('finishTransaction', () => {
    it('iOS forwards purchase payload to native finishTransaction', async () => {
      (Platform as any).OS = 'ios';
      (Platform as any).select = (obj: any) => obj.ios;
      const basePurchase = {
        platform: 'ios',
        productId: 'prod.ios',
        isAutoRenewing: false,
        purchaseState: 'purchased',
        purchaseToken: 'jws-token',
        quantity: 1,
        transactionDate: Date.now(),
        id: 'transaction-identifier',
      } as PurchaseInput;
      (ExpoIapModule.finishTransaction as jest.Mock) = jest
        .fn()
        .mockResolvedValue(true);
      await expect(
        finishTransaction({purchase: basePurchase as any}),
      ).resolves.toBeUndefined();
      expect(ExpoIapModule.finishTransaction).toHaveBeenCalledWith(
        basePurchase,
        false,
      );

      await finishTransaction({
        purchase: basePurchase,
        isConsumable: true,
      });
      expect(ExpoIapModule.finishTransaction).toHaveBeenLastCalledWith(
        basePurchase,
        true,
      );
    });

    it('Android consume vs acknowledge flows', async () => {
      (Platform as any).OS = 'android';
      (Platform as any).select = (obj: any) => obj.android;
      (ExpoIapModule.consumePurchaseAndroid as jest.Mock) = jest
        .fn()
        .mockResolvedValue({responseCode: 0});
      (ExpoIapModule.acknowledgePurchaseAndroid as jest.Mock) = jest
        .fn()
        .mockResolvedValue({responseCode: 0});

      const basePurchase = {
        platform: 'android',
        productId: 'p',
        isAutoRenewing: false,
        purchaseState: 'purchased',
        purchaseToken: 't',
        quantity: 1,
        transactionDate: Date.now(),
        id: 'txn-android',
      };

      await finishTransaction({
        purchase: basePurchase as any,
        isConsumable: true,
      });
      expect(ExpoIapModule.consumePurchaseAndroid).toHaveBeenCalledWith('t');

      await finishTransaction({
        purchase: basePurchase as any,
        isConsumable: false,
      });
      expect(ExpoIapModule.acknowledgePurchaseAndroid).toHaveBeenCalledWith(
        't',
      );

      // Reset call counts for negative-path assertion
      (ExpoIapModule.consumePurchaseAndroid as jest.Mock).mockClear();
      (ExpoIapModule.acknowledgePurchaseAndroid as jest.Mock).mockClear();
      const p = finishTransaction({
        purchase: {
          platform: 'android',
          productId: 'p',
          isAutoRenewing: false,
          purchaseState: 'purchased',
          quantity: 1,
          transactionDate: Date.now(),
          id: 'txn-missing-token',
        } as any,
      });
      await expect(p).rejects.toMatchObject({
        message: expect.stringMatching(/Purchase token/i),
      });
      expect(ExpoIapModule.consumePurchaseAndroid).not.toHaveBeenCalled();
      expect(ExpoIapModule.acknowledgePurchaseAndroid).not.toHaveBeenCalled();
    });

    it('finishTransaction rejects on unsupported platform', async () => {
      const originalOs = (Platform as any).OS;
      (Platform as any).OS = 'web';
      await expect(
        finishTransaction({
          purchase: {
            id: 'tid',
            platform: 'web',
            productId: 'prod.web',
            isAutoRenewing: false,
            purchaseState: 'purchased',
            purchaseToken: 'token',
            quantity: 1,
            transactionDate: Date.now(),
          } as any,
        }),
      ).rejects.toThrow(/Unsupported Platform/);
      (Platform as any).OS = originalOs;
    });
  });

  describe('storefront', () => {
    it('getStorefront delegates to native getStorefront method', async () => {
      const nativeSpy = jest.fn().mockResolvedValue('US');
      (ExpoIapModule as any).getStorefront = nativeSpy;

      const res = await getStorefront();

      expect(nativeSpy).toHaveBeenCalledTimes(1);
      expect(res).toBe('US');

      delete (ExpoIapModule as any).getStorefront;
    });

    it('getStorefront supports synchronous native responses', async () => {
      const nativeSpy = jest.fn().mockReturnValue('CA');
      (ExpoIapModule as any).getStorefront = nativeSpy;

      const res = await getStorefront();

      expect(nativeSpy).toHaveBeenCalledTimes(1);
      expect(res).toBe('CA');

      delete (ExpoIapModule as any).getStorefront;
    });
  });

  describe('validateReceipt and deep link', () => {
    it('validateReceipt iOS path', async () => {
      (Platform as any).OS = 'ios';
      const mock = jest
        .spyOn(iosMod as any, 'validateReceiptIOS')
        .mockResolvedValue({isValid: true});
      const res = await validateReceipt({sku: 'sku'});
      expect(res).toEqual({isValid: true});
      mock.mockRestore();
    });

    it('validateReceipt Android path and param checks', async () => {
      (Platform as any).OS = 'android';
      const spy = jest
        .spyOn(androidMod as any, 'validateReceiptAndroid')
        .mockResolvedValue({});
      await expect(
        validateReceipt({sku: 'sku', androidOptions: {} as any}),
      ).rejects.toThrow(/requires packageName/);
      await validateReceipt({
        sku: 'sku',
        androidOptions: {
          packageName: 'com.app',
          productToken: 'tok',
          accessToken: 'acc',
          isSub: true,
        },
      });
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('validateReceipt throws on unsupported platform', async () => {
      (Platform as any).OS = 'web';
      await expect(validateReceipt({sku: 'sku'})).rejects.toThrow(
        /Platform not supported/,
      );
    });

    it('deepLinkToSubscriptions iOS delegates, Android validates', async () => {
      (Platform as any).OS = 'ios';
      const iosSpy = jest
        .spyOn(iosMod as any, 'deepLinkToSubscriptionsIOS')
        .mockResolvedValue(undefined as any);
      await deepLinkToSubscriptions({});
      expect(iosSpy).toHaveBeenCalled();
      iosSpy.mockRestore();

      (Platform as any).OS = 'android';
      await expect(deepLinkToSubscriptions({} as any)).rejects.toThrow(
        'packageName is required',
      );
      await expect(
        deepLinkToSubscriptions({skuAndroid: 's'} as any),
      ).rejects.toThrow('packageName is required');
      const andSpy = jest
        .spyOn(androidMod as any, 'deepLinkToSubscriptionsAndroid')
        .mockResolvedValue(undefined as any);
      await deepLinkToSubscriptions({
        skuAndroid: 's',
        packageNameAndroid: 'com.app',
      });
      expect(andSpy).toHaveBeenCalledWith({
        skuAndroid: 's',
        packageNameAndroid: 'com.app',
      });
      andSpy.mockRestore();
    });

    it('deepLinkToSubscriptions rejects on unsupported platform', async () => {
      (Platform as any).OS = 'web';
      await expect(
        deepLinkToSubscriptions({
          skuAndroid: 's',
          packageNameAndroid: 'com.app',
        }),
      ).rejects.toThrow(/Unsupported platform: web/);
    });

    it('requestPurchase rejects on unsupported platform', async () => {
      (Platform as any).OS = 'web';
      await expect(
        requestPurchase({request: {} as any} as any),
      ).rejects.toThrow(/Platform not supported/);
    });
  });

  describe('getAvailablePurchases fallback', () => {
    it('returns [] when Platform.select returns undefined', async () => {
      const originalSelect = (Platform as any).select;
      (Platform as any).select = () => undefined;
      const res = await getAvailablePurchases();
      expect(res).toEqual([]);
      (Platform as any).select = originalSelect;
    });
  });

  describe('getActiveSubscriptions', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('calls native module and returns active subscriptions', async () => {
      const mockSubscriptions = [
        {
          productId: 'premium_monthly',
          isActive: true,
          transactionId: 'txn-123',
          purchaseToken: 'token-abc',
          transactionDate: 1234567890,
          autoRenewingAndroid: true,
        },
        {
          productId: 'premium_yearly',
          isActive: true,
          transactionId: 'txn-456',
          purchaseToken: 'token-def',
          transactionDate: 1234567891,
          renewalInfoIOS: {
            pendingUpgradeProductId: 'premium_lifetime',
            willAutoRenew: true,
            autoRenewPreference: 'premium_lifetime',
          },
        },
      ];

      (ExpoIapModule.getActiveSubscriptions as jest.Mock) = jest
        .fn()
        .mockResolvedValue(mockSubscriptions);

      const result = await getActiveSubscriptions();

      expect(ExpoIapModule.getActiveSubscriptions).toHaveBeenCalledWith(null);
      expect(result).toEqual(mockSubscriptions);
    });

    it('filters by subscription IDs when provided', async () => {
      const mockSubscriptions = [
        {
          productId: 'premium_monthly',
          isActive: true,
          transactionId: 'txn-123',
          purchaseToken: 'token-abc',
          transactionDate: 1234567890,
        },
      ];

      (ExpoIapModule.getActiveSubscriptions as jest.Mock) = jest
        .fn()
        .mockResolvedValue(mockSubscriptions);

      const subscriptionIds = ['premium_monthly', 'premium_yearly'];
      const result = await getActiveSubscriptions(subscriptionIds);

      expect(ExpoIapModule.getActiveSubscriptions).toHaveBeenCalledWith(
        subscriptionIds,
      );
      expect(result).toEqual(mockSubscriptions);
    });

    it('returns empty array when native module returns null', async () => {
      (ExpoIapModule.getActiveSubscriptions as jest.Mock) = jest
        .fn()
        .mockResolvedValue(null);

      const result = await getActiveSubscriptions();

      expect(result).toEqual([]);
    });

    it('returns empty array when native module returns undefined', async () => {
      (ExpoIapModule.getActiveSubscriptions as jest.Mock) = jest
        .fn()
        .mockResolvedValue(undefined);

      const result = await getActiveSubscriptions();

      expect(result).toEqual([]);
    });

    it('handles iOS subscriptions with renewalInfoIOS', async () => {
      const mockIOSSubscription = [
        {
          productId: 'premium_monthly',
          isActive: true,
          transactionId: 'txn-ios-123',
          purchaseToken: 'ios-token',
          transactionDate: 1234567890,
          renewalInfoIOS: {
            pendingUpgradeProductId: 'premium_yearly',
            willAutoRenew: true,
            autoRenewPreference: 'premium_yearly',
          },
        },
      ];

      (ExpoIapModule.getActiveSubscriptions as jest.Mock) = jest
        .fn()
        .mockResolvedValue(mockIOSSubscription);

      const result = await getActiveSubscriptions(['premium_monthly']);

      expect(result).toEqual(mockIOSSubscription);
      expect(result[0].renewalInfoIOS?.pendingUpgradeProductId).toBe(
        'premium_yearly',
      );
    });

    it('handles Android subscriptions with autoRenewingAndroid', async () => {
      const mockAndroidSubscription = [
        {
          productId: 'premium_monthly',
          isActive: true,
          transactionId: 'txn-android-123',
          purchaseToken: 'android-token',
          transactionDate: 1234567890,
          autoRenewingAndroid: false,
        },
      ];

      (ExpoIapModule.getActiveSubscriptions as jest.Mock) = jest
        .fn()
        .mockResolvedValue(mockAndroidSubscription);

      const result = await getActiveSubscriptions();

      expect(result).toEqual(mockAndroidSubscription);
      expect(result[0].autoRenewingAndroid).toBe(false);
    });
  });

  describe('hasActiveSubscriptions', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns true when user has active subscriptions', async () => {
      (ExpoIapModule.hasActiveSubscriptions as jest.Mock) = jest
        .fn()
        .mockResolvedValue(true);

      const result = await hasActiveSubscriptions();

      expect(ExpoIapModule.hasActiveSubscriptions).toHaveBeenCalledWith(null);
      expect(result).toBe(true);
    });

    it('returns false when user has no active subscriptions', async () => {
      (ExpoIapModule.hasActiveSubscriptions as jest.Mock) = jest
        .fn()
        .mockResolvedValue(false);

      const result = await hasActiveSubscriptions();

      expect(result).toBe(false);
    });

    it('filters by subscription IDs when provided', async () => {
      (ExpoIapModule.hasActiveSubscriptions as jest.Mock) = jest
        .fn()
        .mockResolvedValue(true);

      const subscriptionIds = ['premium_monthly', 'premium_yearly'];
      const result = await hasActiveSubscriptions(subscriptionIds);

      expect(ExpoIapModule.hasActiveSubscriptions).toHaveBeenCalledWith(
        subscriptionIds,
      );
      expect(result).toBe(true);
    });

    it('returns false when native module returns null', async () => {
      (ExpoIapModule.hasActiveSubscriptions as jest.Mock) = jest
        .fn()
        .mockResolvedValue(null);

      const result = await hasActiveSubscriptions();

      expect(result).toBe(false);
    });

    it('returns false when native module returns undefined', async () => {
      (ExpoIapModule.hasActiveSubscriptions as jest.Mock) = jest
        .fn()
        .mockResolvedValue(undefined);

      const result = await hasActiveSubscriptions();

      expect(result).toBe(false);
    });

    it('handles checking specific premium subscription', async () => {
      (ExpoIapModule.hasActiveSubscriptions as jest.Mock) = jest
        .fn()
        .mockResolvedValue(false);

      const result = await hasActiveSubscriptions(['premium_lifetime']);

      expect(ExpoIapModule.hasActiveSubscriptions).toHaveBeenCalledWith([
        'premium_lifetime',
      ]);
      expect(result).toBe(false);
    });

    it('coerces truthy values correctly', async () => {
      // Test that the !! coercion works
      (ExpoIapModule.hasActiveSubscriptions as jest.Mock) = jest
        .fn()
        .mockResolvedValue(1); // Truthy non-boolean

      const result = await hasActiveSubscriptions();

      expect(result).toBe(true);
    });

    it('coerces falsy values correctly', async () => {
      // Test that the !! coercion works
      (ExpoIapModule.hasActiveSubscriptions as jest.Mock) = jest
        .fn()
        .mockResolvedValue(0); // Falsy non-boolean

      const result = await hasActiveSubscriptions();

      expect(result).toBe(false);
    });
  });
});
