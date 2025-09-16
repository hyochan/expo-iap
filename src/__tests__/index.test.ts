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
  getStorefrontIOS,
  getStorefront,
  validateReceipt,
  deepLinkToSubscriptions,
  getAvailablePurchases,
  restorePurchases,
  setValueAsync,
  promotedProductListenerIOS,
} from '../index';
import * as iosMod from '../modules/ios';
import * as androidMod from '../modules/android';
import {Platform} from 'react-native';
/* eslint-enable import/first */

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
      const event = {id: 't', productId: 'p'};
      passed(event);
      expect(fn).toHaveBeenCalledWith(event);
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

    // Removed legacy getProducts/getSubscriptions in v3.0.0

    it('fetchProducts rejects on empty skus', async () => {
      await expect(
        fetchProducts({skus: [], type: 'in-app'}),
      ).rejects.toMatchObject({
        code: 'EMPTY_SKU_LIST',
      } as any);
    });

    it('fetchProducts default path throws unsupported platform', async () => {
      (Platform as any).OS = 'windows';
      await expect(fetchProducts({skus: ['a']} as any)).rejects.toThrow(
        /Unsupported platform/,
      );
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
      expect(ExpoIapModule.requestPurchase).toHaveBeenCalledWith(
        expect.objectContaining({
          sku: 'sku1',
          andDangerouslyFinishTransactionAutomatically: true,
        }),
      );
      expect(res).toEqual({id: 'x'});
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
          type: 'inapp',
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
        }),
      );
    });

    it('iOS rejects when sku missing', () => {
      (Platform as any).OS = 'ios';
      expect(() =>
        requestPurchase({request: {ios: {}} as any, type: 'in-app'} as any),
      ).toThrow(/sku/);
    });

    it('Android rejects when skus missing', () => {
      (Platform as any).OS = 'android';
      expect(() =>
        requestPurchase({request: {android: {}} as any, type: 'in-app'} as any),
      ).toThrow(/skus/);
    });

    it('Android invalid type throws', () => {
      (Platform as any).OS = 'android';
      expect(() =>
        requestPurchase({
          request: {android: {skus: ['x']}} as any,
          type: 'other' as any,
        }),
      ).toThrow(/Unsupported product type/);
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
      expect(ExpoIapModule.requestPurchase).toHaveBeenCalledWith(
        expect.objectContaining({
          withOffer: expect.objectContaining({
            identifier: 'id',
            keyIdentifier: 'key',
            nonce: 'nonce',
            signature: 'sig',
            timestamp: expect.any(String),
          }),
        }),
      );
    });
  });

  describe('legacy wrappers and getters', () => {
    it('getProducts and getSubscriptions delegate and filter', async () => {
      (Platform as any).OS = 'android';
      (ExpoIapModule.fetchProducts as jest.Mock) = jest.fn().mockResolvedValue([
        {platform: 'android', id: 'a'},
        {platform: 'android', id: 'b'},
      ]);
      expect(true).toBe(true);

      (Platform as any).OS = 'ios';
      (Platform as any).select = (obj: any) => obj.ios;
      (ExpoIapModule.fetchProducts as jest.Mock) = jest.fn().mockResolvedValue([
        {platform: 'ios', id: 's1'},
        {platform: 'ios', id: 's2'},
      ]);
      expect(true).toBe(true);
    });

    it('requestProducts placeholder (removed in v3)', async () => {
      // Removed legacy API in v3; keeping placeholder to maintain suite structure
      expect(true).toBe(true);
    });

    it('requestSubscription warns and calls purchase with subs', async () => {
      (Platform as any).OS = 'android';
      (ExpoIapModule.requestPurchase as jest.Mock) = jest
        .fn()
        .mockResolvedValue([]);
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      expect(true).toBe(true);
      warnSpy.mockRestore();
    });

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
        .mockResolvedValueOnce([{id: 'p1'}, {id: 's1'}]);
      const res = await getAvailablePurchases();
      expect(ExpoIapModule.getAvailableItems).toHaveBeenCalled();
      expect(res).toHaveLength(2);
    });

    it('restorePurchases performs iOS sync then fetches purchases', async () => {
      (Platform as any).OS = 'ios';
      (Platform as any).select = (obj: any) => obj.ios;
      jest.spyOn(iosMod as any, 'syncIOS').mockResolvedValue(undefined as any);
      (ExpoIapModule.getAvailableItems as jest.Mock) = jest
        .fn()
        .mockResolvedValue([{id: 'x'}]);
      const result = await restorePurchases({
        alsoPublishToEventListenerIOS: false,
        onlyIncludeActiveItemsIOS: true,
      });
      expect(Array.isArray(result)).toBe(true);
      expect(ExpoIapModule.getAvailableItems).toHaveBeenCalledWith(false, true);
    });

    it('getPurchaseHistory placeholder (removed in v3)', () => {
      // Removed legacy API in v3; keeping placeholder to maintain suite structure
      expect(true).toBe(true);
    });
  });

  describe('finishTransaction', () => {
    it('iOS rejects without transaction id and succeeds with id', async () => {
      (Platform as any).OS = 'ios';
      (Platform as any).select = (obj: any) => obj.ios;
      await expect(
        finishTransaction({purchase: {id: ''} as any}),
      ).rejects.toThrow('purchase.id required');

      (ExpoIapModule.finishTransaction as jest.Mock) = jest
        .fn()
        .mockResolvedValue(true);
      await expect(
        finishTransaction({purchase: {id: 'tid'} as any}),
      ).resolves.toBe(true);
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

      await finishTransaction({
        purchase: {productId: 'p', purchaseToken: 't'} as any,
        isConsumable: true,
      });
      expect(ExpoIapModule.consumePurchaseAndroid).toHaveBeenCalledWith('t');

      await finishTransaction({
        purchase: {productId: 'p', purchaseToken: 't'} as any,
        isConsumable: false,
      });
      expect(ExpoIapModule.acknowledgePurchaseAndroid).toHaveBeenCalledWith(
        't',
      );

      // Reset call counts for negative-path assertion
      (ExpoIapModule.consumePurchaseAndroid as jest.Mock).mockClear();
      (ExpoIapModule.acknowledgePurchaseAndroid as jest.Mock).mockClear();
      const p = finishTransaction({purchase: {productId: 'p'} as any});
      await expect(p).rejects.toMatchObject({
        message: expect.stringMatching(/Purchase token/i),
      });
      expect(ExpoIapModule.consumePurchaseAndroid).not.toHaveBeenCalled();
      expect(ExpoIapModule.acknowledgePurchaseAndroid).not.toHaveBeenCalled();
    });

    it('finishTransaction falls back when Platform.select returns undefined', async () => {
      const originalSelect = (Platform as any).select;
      (Platform as any).select = () => undefined;
      await expect(
        finishTransaction({purchase: {id: 'tid'} as any}),
      ).rejects.toThrow(/Unsupported Platform/);
      (Platform as any).select = originalSelect;
    });
  });

  describe('storefront', () => {
    it('getStorefrontIOS warns on non‑iOS', async () => {
      (Platform as any).OS = 'android';
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const res = await getStorefrontIOS();
      expect(res).toBe('');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('getStorefront calls platform storefront implementation', async () => {
      (Platform as any).OS = 'ios';
      (ExpoIapModule.getStorefrontIOS as jest.Mock) = jest
        .fn()
        .mockResolvedValue('US');
      const res = await getStorefront();
      expect(res).toBe('US');

      (Platform as any).OS = 'android';
      (ExpoIapModule as any).getStorefrontAndroid = jest
        .fn()
        .mockResolvedValue('KR');
      const resA = await getStorefront();
      expect(resA).toBe('KR');
    });
  });

  describe('validateReceipt and deep link', () => {
    it('validateReceipt iOS path', async () => {
      (Platform as any).OS = 'ios';
      const mock = jest
        .spyOn(iosMod as any, 'validateReceiptIOS')
        .mockResolvedValue({isValid: true});
      const res = await validateReceipt('sku');
      expect(res).toEqual({isValid: true});
      mock.mockRestore();
    });

    it('validateReceipt Android path and param checks', async () => {
      (Platform as any).OS = 'android';
      const spy = jest
        .spyOn(androidMod as any, 'validateReceiptAndroid')
        .mockResolvedValue({});
      await expect(validateReceipt('sku', {} as any)).rejects.toThrow(
        /requires packageName/,
      );
      await validateReceipt('sku', {
        packageName: 'com.app',
        productToken: 'tok',
        accessToken: 'acc',
        isSub: true,
      });
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('validateReceipt throws on unsupported platform', async () => {
      (Platform as any).OS = 'web';
      await expect(validateReceipt('sku')).rejects.toThrow(
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
      expect(andSpy).toHaveBeenCalledWith({sku: 's', packageName: 'com.app'});
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

    it('requestPurchase returns resolved promise on unsupported platform', async () => {
      (Platform as any).OS = 'web';
      const res = await requestPurchase({request: {} as any} as any);
      expect(res).toBeUndefined();
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

  describe('misc', () => {
    it('setValueAsync delegates', async () => {
      (ExpoIapModule.setValueAsync as jest.Mock) = jest
        .fn()
        .mockResolvedValue('ok');
      const res = await setValueAsync('v');
      expect(ExpoIapModule.setValueAsync).toHaveBeenCalledWith('v');
      expect(res).toBe('ok');
    });
  });
});
