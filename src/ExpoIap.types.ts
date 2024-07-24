import {
  ProductAndroid,
  RequestPurchaseAndroidProps,
  RequestSubscriptionAndroidProps,
  SubscriptionProductAndroid,
} from './types/ExpoIapAndroid.types';
import {
  ProductIos,
  RequestPurchaseIosProps,
  RequestSubscriptionIosProps,
  SubscriptionProductIos,
} from './types/ExpoIapIos.types';
export type ChangeEventPayload = {
  value: string;
};

export type Product = ProductAndroid | ProductIos;
export enum ProductType {
  InAppPurchase = 'inapp',
  Subscription = 'subs',
}

export type SubscriptionProduct =
  | SubscriptionProductAndroid
  | SubscriptionProductIos;

export type RequestPurchaseProps =
  | RequestPurchaseIosProps
  | RequestPurchaseAndroidProps;

enum PurchaseStateAndroid {
  UNSPECIFIED_STATE = 0,
  PURCHASED = 1,
  PENDING = 2,
}

export type ProductPurchase = {
  productId: string;
  transactionId?: string;
  transactionDate: number;
  transactionReceipt: string;
  purchaseToken?: string;
  //iOS
  quantityIOS?: number;
  originalTransactionDateIOS?: number;
  originalTransactionIdentifierIOS?: string;
  verificationResultIOS?: string;
  appAccountToken?: string;
  //Android
  productIds?: string[];
  dataAndroid?: string;
  signatureAndroid?: string;
  autoRenewingAndroid?: boolean;
  purchaseStateAndroid?: PurchaseStateAndroid;
  isAcknowledgedAndroid?: boolean;
  packageNameAndroid?: string;
  developerPayloadAndroid?: string;
  obfuscatedAccountIdAndroid?: string;
  obfuscatedProfileIdAndroid?: string;
};

export type RequestSubscriptionProps =
  | RequestSubscriptionAndroidProps
  | RequestSubscriptionIosProps;

enum TransactionReason {
  PURCHASE = 'PURCHASE',
  RENEWAL = 'RENEWAL',
}

export type SubscriptionPurchase = {
  autoRenewingAndroid?: boolean;
  originalTransactionDateIOS?: number;
  originalTransactionIdentifierIOS?: string;
  verificationResultIOS?: string;
  transactionReasonIOS?: TransactionReason | string;
} & ProductPurchase;

export type Purchase = ProductPurchase | SubscriptionPurchase;

export type PurchaseResult = {
  responseCode?: number;
  debugMessage?: string;
  code?: string;
  message?: string;
  purchaseToken?: string;
};

export enum ErrorCode {
  E_UNKNOWN = 'E_UNKNOWN',
  E_USER_CANCELLED = 'E_USER_CANCELLED',
  E_USER_ERROR = 'E_USER_ERROR',
  E_ITEM_UNAVAILABLE = 'E_ITEM_UNAVAILABLE',
  E_REMOTE_ERROR = 'E_REMOTE_ERROR',
  E_NETWORK_ERROR = 'E_NETWORK_ERROR',
  E_SERVICE_ERROR = 'E_SERVICE_ERROR',
  E_RECEIPT_FAILED = 'E_RECEIPT_FAILED',
  E_RECEIPT_FINISHED_FAILED = 'E_RECEIPT_FINISHED_FAILED',
  E_NOT_PREPARED = 'E_NOT_PREPARED',
  E_NOT_ENDED = 'E_NOT_ENDED',
  E_ALREADY_OWNED = 'E_ALREADY_OWNED',
  E_DEVELOPER_ERROR = 'E_DEVELOPER_ERROR',
  E_BILLING_RESPONSE_JSON_PARSE_ERROR = 'E_BILLING_RESPONSE_JSON_PARSE_ERROR',
  E_DEFERRED_PAYMENT = 'E_DEFERRED_PAYMENT',
  E_INTERRUPTED = 'E_INTERRUPTED',
  E_IAP_NOT_AVAILABLE = 'E_IAP_NOT_AVAILABLE',
}

export class PurchaseError implements Error {
  constructor(
    public name: string,
    public message: string,
    public responseCode?: number,
    public debugMessage?: string,
    public code?: ErrorCode,
    public productId?: string,
  ) {
    this.name = '[react-native-iap]: PurchaseError';
    this.message = message;
    this.responseCode = responseCode;
    this.debugMessage = debugMessage;
    this.code = code;
    this.productId = productId;
  }
}
