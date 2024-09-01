// Import the native module. On web, it will be resolved to ExpoIap.web.ts
// and on native platforms to ExpoIap.ts
import {NativeModulesProxy, EventEmitter} from 'expo-modules-core';
import {Platform} from 'react-native';

import {
  Product,
  ProductPurchase,
  ProductType,
  Purchase,
  PurchaseError,
  PurchaseResult,
  RequestSubscriptionProps,
  SubscriptionProduct,
  SubscriptionPurchase,
} from './ExpoIap.types';
import ExpoIapModule from './ExpoIapModule';
import {
  RequestPurchaseAndroidProps,
  RequestSubscriptionAndroidProps,
} from './types/ExpoIapAndroid.types';
import {
  PaymentDiscount,
  ProductIos,
  RequestPurchaseIosProps,
  RequestSubscriptionIosProps,
  SubscriptionProductIos,
  TransactionSk2,
} from './types/ExpoIapIos.types';
import {isProductIos} from './modules/ios';

export * from './modules/android';
export * from './modules/ios';

// Get the native constant value.
export const PI = ExpoIapModule.PI;

export enum IapEvent {
  PurchaseUpdated = 'purchase-updated',
  PurchaseError = 'purchase-error',
  TransactionIapUpdated = 'iap-transaction-updated',
}

export async function setValueAsync(value: string) {
  return await ExpoIapModule.setValueAsync(value);
}

export const emitter = new EventEmitter(
  ExpoIapModule ?? NativeModulesProxy.ExpoIap,
);

export const purchaseUpdatedListener = (
  listener: (event: Purchase) => void,
) => {
  const emitterSubscription = emitter.addListener(
    IapEvent.PurchaseUpdated,
    listener,
  );
  return emitterSubscription;
};

export const purchaseErrorListener = (
  listener: (error: PurchaseError) => void,
) => {
  return emitter.addListener<PurchaseError>(IapEvent.PurchaseError, listener);
};

export function initConnection() {
  return ExpoIapModule.initConnection();
}

export const getProducts = async (skus: string[]): Promise<Product[]> => {
  if (!skus?.length) {
    return Promise.reject(new Error('"skus" is required'));
  }

  return Platform.select({
    ios: async () => {
      const items = (await ExpoIapModule.getItems(skus)) as ProductIos[];
      return items.filter((item: ProductIos) => isProductIos(item));
    },
    android: async () => {
      const products = await ExpoIapModule.getItemsByType(
        ProductType.InAppPurchase,
        skus,
      );

      return products;
    },
    default: () => Promise.reject(new Error('Unsupported Platform')),
  })();
};

export const getSubscriptions = async (
  skus: string[],
): Promise<SubscriptionProduct[]> => {
  if (!skus?.length) {
    return Promise.reject(new Error('"skus" is required'));
  }

  return Platform.select({
    ios: async (): Promise<SubscriptionProductIos[]> => {
      const items: SubscriptionProductIos[] = (
        (await ExpoIapModule.getItems(skus)) as SubscriptionProductIos[]
      ).filter((item: SubscriptionProductIos) => skus.includes(item.id));

      return items;
    },
    android: async () => {
      return ExpoIapModule.getItemsByType('subs', skus);
    },
    default: () => Promise.reject(new Error('Unsupported Platform')),
  })();
};

export async function endConnection(): Promise<boolean> {
  return ExpoIapModule.endConnection();
}

export const getPurchaseHistory = ({
  alsoPublishToEventListener = false,
  automaticallyFinishRestoredTransactions = true,
  onlyIncludeActiveItems = false,
}: {
  alsoPublishToEventListener?: boolean;
  automaticallyFinishRestoredTransactions?: boolean;
  onlyIncludeActiveItems?: boolean;
} = {}): Promise<ProductPurchase[]> =>
  (
    Platform.select({
      ios: async () => {
        return ExpoIapModule.getAvailableItems(
          alsoPublishToEventListener,
          onlyIncludeActiveItems,
        );
      },
      android: async () => {
        const products = await ExpoIapModule.getPurchaseHistoryByType(
          ProductType.InAppPurchase,
        );

        const subscriptions = await ExpoIapModule.getPurchaseHistoryByType(
          ProductType.Subscription,
        );

        return products.concat(subscriptions);
      },
    }) || (() => Promise.resolve([]))
  )();

export const getAvailablePurchases = ({
  alsoPublishToEventListener = false,
  automaticallyFinishRestoredTransactions = false,
  onlyIncludeActiveItems = true,
}: {
  alsoPublishToEventListener?: boolean;
  automaticallyFinishRestoredTransactions?: boolean;
  onlyIncludeActiveItems?: boolean;
} = {}): Promise<ProductPurchase[]> =>
  (
    Platform.select({
      ios: () =>
        ExpoIapModule.getAvailableItems(
          alsoPublishToEventListener,
          onlyIncludeActiveItems,
        ),
      android: async () => {
        const products = await ExpoIapModule.getAvailableItemsByType(
          ProductType.InAppPurchase,
        );

        const subscriptions = await ExpoIapModule.getAvailableItemsByType(
          ProductType.Subscription,
        );

        return products.concat(subscriptions);
      },
    }) || (() => Promise.resolve([]))
  )();

const offerToRecordIos = (
  offer: PaymentDiscount | undefined,
): Record<keyof PaymentDiscount, string> | undefined => {
  if (!offer) {
    return undefined;
  }
  return {
    identifier: offer.identifier,
    keyIdentifier: offer.keyIdentifier,
    nonce: offer.nonce,
    signature: offer.signature,
    timestamp: offer.timestamp.toString(),
  };
};

const iosTransactionToPurchaseMap = ({
  id,
  originalPurchaseDate,
  productID,
  purchaseDate,
  purchasedQuantity,
  originalID,
  verificationResult,
  appAccountToken,
  jsonRepresentation,
}: TransactionSk2): Purchase => {
  let transactionReasonIOS;

  try {
    if (jsonRepresentation) {
      const transactionData = JSON.parse(jsonRepresentation);
      transactionReasonIOS = transactionData.transactionReason;
    }
  } catch (e) {
    console.log('SK2 Error parsing jsonRepresentation', e);
  }
  const purchase: Purchase = {
    productId: productID,
    transactionId: String(id),
    transactionDate: purchaseDate, //??
    transactionReceipt: '', // Not available
    purchaseToken: '', //Not available
    quantityIOS: purchasedQuantity,
    originalTransactionDateIOS: originalPurchaseDate,
    originalTransactionIdentifierIOS: originalID,
    verificationResultIOS: verificationResult ?? '',
    appAccountToken: appAccountToken ?? '',
    transactionReasonIOS: transactionReasonIOS ?? '',
  };
  return purchase;
};

export const requestPurchase = (
  request: RequestPurchaseIosProps | RequestPurchaseAndroidProps,
): Promise<ProductPurchase | ProductPurchase[] | void> =>
  (
    Platform.select({
      ios: async () => {
        if (!('sku' in request)) {
          throw new Error('sku is required for iOS purchase');
        }

        const {
          sku,
          andDangerouslyFinishTransactionAutomaticallyIOS = false,
          appAccountToken,
          quantity,
          withOffer,
        } = request;

        if (andDangerouslyFinishTransactionAutomaticallyIOS) {
          console.warn(
            'You are dangerously allowing expo-iap to finish your transaction automatically. You should set andDangerouslyFinishTransactionAutomatically to false when calling requestPurchase and call finishTransaction manually when you have delivered the purchased goods to the user. It defaults to true to provide backwards compatibility. Will default to false in version 4.0.0.',
          );
        }

        const offer = offerToRecordIos(withOffer);

        const result = await ExpoIapModule.buyProduct(
          sku,
          andDangerouslyFinishTransactionAutomaticallyIOS,
          appAccountToken,
          quantity ?? -1,
          offer,
        );

        const purchase = iosTransactionToPurchaseMap(result);
        return Promise.resolve(purchase);
      },
      android: async () => {
        if (!('skus' in request) || !request.skus.length) {
          throw new Error('skus is required for Android purchase');
        }

        const {
          skus,
          obfuscatedAccountIdAndroid,
          obfuscatedProfileIdAndroid,
          isOfferPersonalized,
        } = request;

        return ExpoIapModule.buyItemByType({
          type: ProductType.InAppPurchase,
          skuArr: skus,
          purchaseToken: undefined,
          replacementMode: -1,
          obfuscatedAccountId: obfuscatedAccountIdAndroid,
          obfuscatedProfileId: obfuscatedProfileIdAndroid,
          offerTokenArr: [],
          isOfferPersonalized: isOfferPersonalized ?? false,
        });
      },
    }) || Promise.resolve
  )();

export const requestSubscription = (
  request: RequestSubscriptionProps,
): Promise<SubscriptionPurchase | SubscriptionPurchase[] | null | void> =>
  (
    Platform.select({
      ios: async () => {
        if (!('sku' in request)) {
          throw new Error('sku is required for iOS subscriptions');
        }

        const {
          sku,
          andDangerouslyFinishTransactionAutomaticallyIOS = false,
          appAccountToken,
          quantity,
          withOffer,
        } = request as RequestSubscriptionIosProps;

        if (andDangerouslyFinishTransactionAutomaticallyIOS) {
          console.warn(
            'You are dangerously allowing expo-iap to finish your transaction automatically. You should set andDangerouslyFinishTransactionAutomatically to false when calling requestPurchase and call finishTransaction manually when you have delivered the purchased goods to the user. It defaults to true to provide backwards compatibility. Will default to false in version 4.0.0.',
          );
        }

        const offer = offerToRecordIos(withOffer);

        const purchase = iosTransactionToPurchaseMap(
          await ExpoIapModule.buyProduct(
            sku,
            andDangerouslyFinishTransactionAutomaticallyIOS,
            appAccountToken,
            quantity ?? -1,
            offer,
          ),
        );
        return Promise.resolve(purchase);
      },
      android: async () => {
        console.log('requestSubscription', request);
        const {
          skus,
          isOfferPersonalized,
          obfuscatedAccountIdAndroid,
          obfuscatedProfileIdAndroid,
          subscriptionOffers,
          replacementModeAndroid,
          purchaseTokenAndroid,
        } = request as RequestSubscriptionAndroidProps;

        return ExpoIapModule.buyItemByType({
          type: ProductType.Subscription,
          skuArr: skus.map((so) => so),
          purchaseToken: purchaseTokenAndroid,
          replacementMode: replacementModeAndroid,
          obfuscatedAccountId: obfuscatedAccountIdAndroid,
          obfuscatedProfileId: obfuscatedProfileIdAndroid,
          offerTokenArr: subscriptionOffers.map((so) => so.offerToken),
          isOfferPersonalized: isOfferPersonalized ?? false,
        });
      },
    }) || (() => Promise.resolve(null))
  )();

export const finishTransaction = ({
  purchase,
  isConsumable,
  developerPayloadAndroid,
}: {
  purchase: Purchase;
  isConsumable?: boolean;
  developerPayloadAndroid?: string;
}): Promise<PurchaseResult | boolean> => {
  return (
    Platform.select({
      ios: async () => {
        const transactionId = purchase.transactionId;

        if (!transactionId) {
          return Promise.reject(
            new Error('transactionId required to finish iOS transaction'),
          );
        }
        await ExpoIapModule.finishTransaction(transactionId);
        return Promise.resolve(true);
      },
      android: async () => {
        if (purchase?.purchaseToken) {
          if (!isConsumable) {
            return Promise.reject(
              new Error('purchase is not suitable to be purchased'),
            );
          }

          return ExpoIapModule.consumeProduct(
            purchase.purchaseToken,
            developerPayloadAndroid,
          );
        }
        return Promise.reject(
          new Error('purchase is not suitable to be purchased'),
        );
      },
    }) || (() => Promise.reject(new Error('Unsupported Platform')))
  )();
};
