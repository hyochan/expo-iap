import {
  ProductAndroid,
  ProductPurchaseAndroid,
  RequestPurchaseAndroidProps,
  RequestSubscriptionAndroidProps,
  SubscriptionProductAndroid,
} from './types/ExpoIapAndroid.types';
import {
  ProductIos,
  ProductPurchaseIos,
  RequestPurchaseIosProps,
  RequestSubscriptionIosProps,
  SubscriptionProductIos,
} from './types/ExpoIapIos.types';

export type ChangeEventPayload = {
  value: string;
};

/**
 * Base product type with common properties shared between iOS and Android
 */
export type ProductBase = {
  id: string;
  title: string;
  description: string;
  type: ProductType;
  displayName?: string;
  displayPrice: string;
  currency: string;
  price?: number;
};

// Define literal platform types for better type discrimination
export type IosPlatform = {platform: 'ios'};
export type AndroidPlatform = {platform: 'android'};

export enum ProductType {
  InAppPurchase = 'inapp',
  Subscription = 'subs',
}

// Common base purchase type
export type PurchaseBase = {
  id: string;
  transactionId?: string;
  transactionDate: number;
  transactionReceipt: string;
};

// Union type for platform-specific product types with proper discriminators
export type Product =
  | (ProductAndroid & AndroidPlatform)
  | (ProductIos & IosPlatform);

// Union type for platform-specific purchase types with proper discriminators
export type ProductPurchase =
  | (ProductPurchaseAndroid & AndroidPlatform)
  | (ProductPurchaseIos & IosPlatform);

// Union type for platform-specific subscription purchase types with proper discriminators
export type SubscriptionPurchase =
  | (ProductPurchaseAndroid & AndroidPlatform & {autoRenewingAndroid: boolean})
  | (ProductPurchaseIos & IosPlatform);

export type Purchase = ProductPurchase | SubscriptionPurchase;

export type RequestPurchaseProps =
  | RequestPurchaseIosProps
  | RequestPurchaseAndroidProps;

export type SubscriptionProduct =
  | (SubscriptionProductAndroid & AndroidPlatform)
  | (SubscriptionProductIos & IosPlatform);

export type RequestSubscriptionProps =
  | RequestSubscriptionAndroidProps
  | RequestSubscriptionIosProps;

export type PurchaseResult = {
  responseCode?: number;
  debugMessage?: string;
  code?: string;
  message?: string;
  purchaseTokenAndroid?: string;
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
    this.name = '[expo-iap]: PurchaseError';
    this.message = message;
    this.responseCode = responseCode;
    this.debugMessage = debugMessage;
    this.code = code;
    this.productId = productId;
  }
}
