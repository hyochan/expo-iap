import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# Types

<AdFitTopFixed />

This page contains the TypeScript types and interfaces used throughout the expo-iap library.

Note: expo-iap aligns closely with the OpenIAP type schema. For canonical definitions and cross-SDK parity, see OpenIAP Types:

- [OpenIAP Types](https://www.openiap.dev/docs/types)

## Core Types

### Product

```typescript
type ProductType = 'inapp' | 'subs';
interface Product {
  id: string;
  title: string;
  description: string;
  type: ProductType;
  displayName?: string;
  displayPrice: string;
  currency: string;
  price?: number;
}
```

### iOS product fields

The iOS product includes additional subscription and pricing information:

```typescript
type SubscriptionIosPeriod = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | '';
type PaymentMode = '' | 'FREETRIAL' | 'PAYASYOUGO' | 'PAYUPFRONT';

type ProductIOS = Product & {
  displayName: string;
  isFamilyShareable: boolean;
  jsonRepresentation: string;
  subscription?: SubscriptionInfo;
  introductoryPriceNumberOfPeriodsIOS?: string;
  introductoryPriceSubscriptionPeriodIOS?: SubscriptionIosPeriod;
};

type SubscriptionInfo = {
  introductoryOffer?: SubscriptionOffer;
  promotionalOffers?: SubscriptionOffer[];
  subscriptionGroupID: string;
  subscriptionPeriod: {
    unit: SubscriptionIosPeriod;
    value: number;
  };
};

type SubscriptionOffer = {
  displayPrice: string;
  id: string;
  paymentMode: PaymentMode;
  period: {
    unit: SubscriptionIosPeriod;
    value: number;
  };
  periodCount: number;
  price: number;
  type: 'introductory' | 'promotional';
};
```

### Purchase (v3)

```typescript
interface Purchase {
  id: string; // Transaction identifier
  productId: string;
  transactionDate: number;
  purchaseToken?: string; // Unified token (iOS JWS or Android token)
}
```

### Unified Purchase Token (v3)

Use `purchase.purchaseToken` for both platforms. On iOS it is the JWS; on Android it is the Play purchase token.

### PurchaseState

```typescript
enum PurchaseState {
  PURCHASED = 'PURCHASED',
  PENDING = 'PENDING',
  UNSPECIFIED_STATE = 'UNSPECIFIED_STATE',
}
```

### Subscription

```typescript
interface Subscription {
  productId: string;
  purchaseToken: string;
  isAutoRenewing: boolean;
  expiryTimeMillis: number;
  autoResumeTimeMillis?: number;
  priceCurrencyCode?: string;
  priceAmountMicros?: number;
  countryCode?: string;
  orderId?: string;
  packageName?: string;
}
```

## Subscription Status Types

### ActiveSubscription

Represents an active subscription with platform-specific details.

```typescript
interface ActiveSubscription {
  productId: string;
  isActive: boolean;
  expirationDateIOS?: Date;
  autoRenewingAndroid?: boolean;
  environmentIOS?: string;
  willExpireSoon?: boolean;
  daysUntilExpirationIOS?: number;
}
```

**Platform-Specific Behavior:**

- **iOS**: Provides exact `expirationDateIOS`, `daysUntilExpirationIOS`, and `environmentIOS` ("Sandbox" | "Production")
- **Android**: Provides `autoRenewingAndroid` status. When `false`, the subscription will not renew

**Usage with subscription status APIs:**

- Used as return type for `getActiveSubscriptions()`
- Contains `willExpireSoon` flag (true if expiring within 7 days)

## Platform-Specific Types

### iOS

For other iOS-specific types and enums, refer to the [iOS setup guide](../getting-started/setup-ios.md).

### Android

For Android-specific types and enums, refer to the [Android setup guide](../getting-started/setup-android.md).

## Full Type Reference

The following sections describe the complete TypeScript surface for expo‑iap. Deprecated fields are omitted.

### Core

```ts
export type ChangeEventPayload = {value: string};

// iOS detailed product types
export enum ProductTypeIOS {
  Consumable = 'consumable',
  NonConsumable = 'nonConsumable',
  AutoRenewableSubscription = 'autoRenewableSubscription',
  NonRenewingSubscription = 'nonRenewingSubscription',
}

// Shared product information
export type ProductCommon = {
  id: string;
  title: string;
  description: string;
  type: 'inapp' | 'subs';
  displayName?: string;
  displayPrice: string;
  currency: string;
  price?: number;
  debugDescription?: string;
  platform?: string;
};

export enum PurchaseState {
  Pending = 'pending',
  Purchased = 'purchased',
  Failed = 'failed',
  Restored = 'restored', // iOS only
  Deferred = 'deferred', // iOS only
  Unknown = 'unknown',
}

// Shared purchase information
export type PurchaseCommon = {
  id: string;
  productId: string;
  ids?: string[];
  transactionDate: number;
  purchaseToken?: string;
  platform?: string;
  quantity: number;
  purchaseState: PurchaseState;
  isAutoRenewing: boolean;
};

export type ProductSubscriptionCommon = ProductCommon & {type: 'subs'};

// Platform tags
export type IosPlatform = {platform: 'ios'};
export type AndroidPlatform = {platform: 'android'};
```

### iOS

```ts
type SubscriptionIosPeriod = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | '';
type PaymentMode = '' | 'FREETRIAL' | 'PAYASYOUGO' | 'PAYUPFRONT';

type SubscriptionOffer = {
  displayPrice: string;
  id: string;
  paymentMode: PaymentMode;
  period: {unit: SubscriptionIosPeriod; value: number};
  periodCount: number;
  price: number;
  type: 'introductory' | 'promotional';
};

type SubscriptionInfo = {
  introductoryOffer?: SubscriptionOffer;
  promotionalOffers?: SubscriptionOffer[];
  subscriptionGroupId: string;
  subscriptionPeriod: {unit: SubscriptionIosPeriod; value: number};
};

export type Discount = {
  identifier: string;
  type: string;
  numberOfPeriods: string;
  price: string;
  localizedPrice: string;
  paymentMode: PaymentMode;
  subscriptionPeriod: string;
};

export type ProductIOS = ProductCommon & {
  displayNameIOS: string;
  isFamilyShareableIOS: boolean;
  jsonRepresentationIOS: string;
  platform: 'ios';
  subscriptionInfoIOS?: SubscriptionInfo;
  typeIOS: ProductTypeIOS;
  introductoryPriceNumberOfPeriodsIOS?: string;
  introductoryPriceSubscriptionPeriodIOS?: SubscriptionIosPeriod;
};

export type ProductSubscriptionIOS = ProductIOS & {
  discountsIOS?: Discount[];
  introductoryPriceIOS?: string;
  introductoryPriceAsAmountIOS?: string;
  introductoryPricePaymentModeIOS?: PaymentMode;
  introductoryPriceNumberOfPeriodsIOS?: string;
  introductoryPriceSubscriptionPeriodIOS?: SubscriptionIosPeriod;
  subscriptionPeriodNumberIOS?: string;
  subscriptionPeriodUnitIOS?: SubscriptionIosPeriod;
};

export type PurchaseIOS = PurchaseCommon & {
  platform: 'ios';
  quantityIOS?: number;
  originalTransactionDateIOS?: number;
  originalTransactionIdentifierIOS?: string;
  appAccountToken?: string;
  expirationDateIOS?: number;
  webOrderLineItemIdIOS?: number;
  environmentIOS?: string;
  storefrontCountryCodeIOS?: string;
  appBundleIdIOS?: string;
  productTypeIOS?: string;
  subscriptionGroupIdIOS?: string;
  isUpgradedIOS?: boolean;
  ownershipTypeIOS?: string;
  reasonIOS?: string;
  reasonStringRepresentationIOS?: string;
  transactionReasonIOS?: 'PURCHASE' | 'RENEWAL' | string;
  revocationDateIOS?: number;
  revocationReasonIOS?: string;
  offerIOS?: {id: string; type: string; paymentMode: string};
  currencyCodeIOS?: string;
  currencySymbolIOS?: string;
  countryCodeIOS?: string;
};

type RenewalInfo = {
  jsonRepresentation?: string;
  willAutoRenew: boolean;
  autoRenewPreference?: string;
};

export type SubscriptionStatusIOS = {
  state: string; // StoreKit RenewalState
  renewalInfo?: RenewalInfo;
};

export type AppTransactionIOS = {
  appTransactionId?: string;
  originalPlatform?: string;
  bundleId: string;
  appVersion: string;
  originalAppVersion: string;
  originalPurchaseDate: number;
  deviceVerification: string;
  deviceVerificationNonce: string;
  environment: string;
  signedDate: number;
  appId?: number;
  appVersionId?: number;
  preorderDate?: number;
};
```

### Android

```ts
type ProductAndroidOneTimePurchaseOfferDetail = {
  priceCurrencyCode: string;
  formattedPrice: string;
  priceAmountMicros: string;
};

type PricingPhaseAndroid = {
  formattedPrice: string;
  priceCurrencyCode: string;
  billingPeriod: string; // P1W, P1M, P1Y
  billingCycleCount: number;
  priceAmountMicros: string;
  recurrenceMode: number;
};

type PricingPhasesAndroid = {pricingPhaseList: PricingPhaseAndroid[]};

type ProductSubscriptionAndroidOfferDetail = {
  basePlanId: string;
  offerId: string;
  offerToken: string;
  offerTags: string[];
  pricingPhases: PricingPhasesAndroid;
};

type ProductSubscriptionAndroidOfferDetails = {
  basePlanId: string;
  offerId: string | null;
  offerToken: string;
  pricingPhases: PricingPhasesAndroid;
  offerTags: string[];
};

export type ProductAndroid = ProductCommon & {
  nameAndroid: string;
  oneTimePurchaseOfferDetailsAndroid?: ProductAndroidOneTimePurchaseOfferDetail;
  platform: 'android';
  subscriptionOfferDetailsAndroid?: ProductSubscriptionAndroidOfferDetail[];
};

export type ProductSubscriptionAndroid = ProductAndroid & {
  subscriptionOfferDetailsAndroid: ProductSubscriptionAndroidOfferDetails[];
};

export type PurchaseAndroid = PurchaseCommon & {
  platform: 'android';
  dataAndroid?: string;
  signatureAndroid?: string;
  autoRenewingAndroid?: boolean;
  isAcknowledgedAndroid?: boolean;
  packageNameAndroid?: string;
  developerPayloadAndroid?: string;
  obfuscatedAccountIdAndroid?: string;
  obfuscatedProfileIdAndroid?: string;
};
```

### Union Types

```ts
export type Product =
  | (ProductAndroid & AndroidPlatform)
  | (ProductIOS & IosPlatform);

export type ProductSubscription =
  | (ProductSubscriptionAndroid & AndroidPlatform)
  | (ProductSubscriptionIOS & IosPlatform);

export type ProductPurchase =
  | (PurchaseAndroid & AndroidPlatform)
  | (PurchaseIOS & IosPlatform);

export type SubscriptionPurchase =
  | (PurchaseAndroid & AndroidPlatform & {autoRenewingAndroid: boolean})
  | (PurchaseIOS & IosPlatform);

export type Purchase =
  | (PurchaseAndroid & AndroidPlatform)
  | (PurchaseIOS & IosPlatform);
```

### Request Types

```ts
export interface ProductRequest {
  skus: string[];
  type?: 'inapp' | 'subs' | 'all';
}

export interface RequestPurchaseIosProps {
  readonly sku: string;
  readonly andDangerouslyFinishTransactionAutomatically?: boolean;
  readonly appAccountToken?: string;
  readonly quantity?: number;
  readonly withOffer?: DiscountOffer;
}

export interface RequestPurchaseAndroidProps {
  readonly skus: string[];
  readonly obfuscatedAccountIdAndroid?: string;
  readonly obfuscatedProfileIdAndroid?: string;
  readonly isOfferPersonalized?: boolean;
}

export interface RequestSubscriptionAndroidProps
  extends RequestPurchaseAndroidProps {
  readonly purchaseTokenAndroid?: string;
  readonly replacementModeAndroid?: number;
  readonly subscriptionOffers: {sku: string; offerToken: string}[];
}

export interface RequestPurchasePropsByPlatforms {
  readonly ios?: RequestPurchaseIosProps;
  readonly android?: RequestPurchaseAndroidProps;
}

export interface RequestSubscriptionPropsByPlatforms {
  readonly ios?: RequestPurchaseIosProps;
  readonly android?: RequestSubscriptionAndroidProps;
}

export type RequestPurchaseProps = RequestPurchasePropsByPlatforms;
export type RequestSubscriptionProps = RequestSubscriptionPropsByPlatforms;
```

### Errors

```ts
export enum ErrorCode {
  E_UNKNOWN = 'E_UNKNOWN',
  E_USER_CANCELLED = 'E_USER_CANCELLED',
  E_USER_ERROR = 'E_USER_ERROR',
  E_ITEM_UNAVAILABLE = 'E_ITEM_UNAVAILABLE',
  E_REMOTE_ERROR = 'E_REMOTE_ERROR',
  E_NETWORK_ERROR = 'E_NETWORK_ERROR',
  E_SERVICE_ERROR = 'E_SERVICE_ERROR',
  E_RECEIPT_FAILED = 'E_RECEIPT_FAILED',
  E_RECEIPT_FINISHED = 'E_RECEIPT_FINISHED',
  E_RECEIPT_FINISHED_FAILED = 'E_RECEIPT_FINISHED_FAILED',
  E_NOT_PREPARED = 'E_NOT_PREPARED',
  E_NOT_ENDED = 'E_NOT_ENDED',
  E_ALREADY_OWNED = 'E_ALREADY_OWNED',
  E_DEVELOPER_ERROR = 'E_DEVELOPER_ERROR',
  E_BILLING_RESPONSE_JSON_PARSE_ERROR = 'E_BILLING_RESPONSE_JSON_PARSE_ERROR',
  E_DEFERRED_PAYMENT = 'E_DEFERRED_PAYMENT',
  E_INTERRUPTED = 'E_INTERRUPTED',
  E_IAP_NOT_AVAILABLE = 'E_IAP_NOT_AVAILABLE',
  E_PURCHASE_ERROR = 'E_PURCHASE_ERROR',
  E_SYNC_ERROR = 'E_SYNC_ERROR',
  E_TRANSACTION_VALIDATION_FAILED = 'E_TRANSACTION_VALIDATION_FAILED',
  E_ACTIVITY_UNAVAILABLE = 'E_ACTIVITY_UNAVAILABLE',
  E_ALREADY_PREPARED = 'E_ALREADY_PREPARED',
  E_PENDING = 'E_PENDING',
  E_CONNECTION_CLOSED = 'E_CONNECTION_CLOSED',
  E_INIT_CONNECTION = 'E_INIT_CONNECTION',
  E_SERVICE_DISCONNECTED = 'E_SERVICE_DISCONNECTED',
  E_QUERY_PRODUCT = 'E_QUERY_PRODUCT',
  E_SKU_NOT_FOUND = 'E_SKU_NOT_FOUND',
  E_SKU_OFFER_MISMATCH = 'E_SKU_OFFER_MISMATCH',
  E_ITEM_NOT_OWNED = 'E_ITEM_NOT_OWNED',
  E_BILLING_UNAVAILABLE = 'E_BILLING_UNAVAILABLE',
  E_FEATURE_NOT_SUPPORTED = 'E_FEATURE_NOT_SUPPORTED',
  E_EMPTY_SKU_LIST = 'E_EMPTY_SKU_LIST',
}

export type PurchaseResult = {
  responseCode?: number;
  debugMessage?: string;
  code?: string;
  message?: string;
  purchaseToken?: string;
};

export interface PurchaseError {
  code: string;
  message: string;
  productId?: string;
}

export type DiscountOffer = {
  identifier: string;
  keyIdentifier: string;
  nonce: string;
  signature: string;
  timestamp: number;
};
```

### Method Options

```ts
export interface PurchaseOptions {
  alsoPublishToEventListenerIOS?: boolean;
  onlyIncludeActiveItemsIOS?: boolean;
}

export interface FinishTransactionParams {
  purchase: Purchase;
  isConsumable?: boolean;
}
```

### IAP Context

```ts
export interface IapContext {
  products: Product[];
  subscriptions: ProductSubscription[];
  availablePurchases: Purchase[];
  promotedProduct?: Product;
  currentPurchase?: Purchase;
  purchaseError?: PurchaseError;

  initConnection(): Promise<boolean>;
  endConnection(): Promise<void>;
  sync(): Promise<void>;

  fetchProducts(params: {
    skus: string[];
    type?: 'inapp' | 'subs' | 'all';
  }): Promise<Product[] | ProductSubscription[]>;

  requestPurchase(params: {
    request: RequestPurchaseProps | RequestSubscriptionProps;
    type?: 'inapp' | 'subs';
  }): Promise<Purchase | Purchase[] | void>;

  finishTransaction(
    params: FinishTransactionParams,
  ): Promise<PurchaseResult | boolean>;

  getAvailablePurchases(options?: PurchaseOptions): Promise<Purchase[]>;

  validateReceipt(
    sku: string,
    androidOptions?: {
      packageName: string;
      productToken: string;
      accessToken: string;
      isSub?: boolean;
    },
  ): Promise<ReceiptValidationResult>;
}
```

### Receipt Validation

```ts
export interface ReceiptValidationProps {
  sku: string;
  androidOptions?: {
    packageName: string;
    productToken: string;
    accessToken: string;
    isSub?: boolean;
  };
}

export interface ReceiptValidationResultIOS {
  isValid: boolean;
  receiptData: string;
  jwsRepresentation: string;
  latestTransaction?: Purchase;
}

export interface ReceiptValidationResultAndroid {
  autoRenewing: boolean;
  betaProduct: boolean;
  cancelDate: number | null;
  cancelReason: string;
  deferredDate: number | null;
  deferredSku: number | null;
  freeTrialEndDate: number;
  gracePeriodEndDate: number;
  parentProductId: string;
  productId: string;
  productType: 'inapp' | 'subs';
  purchaseDate: number;
  quantity: number;
  receiptId: string;
  renewalDate: number;
  term: string;
  termSku: string;
  testTransaction: boolean;
}

export type ReceiptValidationResult =
  | ReceiptValidationResultAndroid
  | ReceiptValidationResultIOS;
```

### Active Subscription

```ts
export interface ActiveSubscription {
  productId: string;
  isActive: boolean;
  expirationDateIOS?: Date;
  autoRenewingAndroid?: boolean;
  environmentIOS?: string;
  willExpireSoon?: boolean;
  daysUntilExpirationIOS?: number;
  transactionId: string;
  purchaseToken?: string;
  transactionDate: number;
}
```

For error codes and handling guidance, see [Error Codes](./error-codes.md).
