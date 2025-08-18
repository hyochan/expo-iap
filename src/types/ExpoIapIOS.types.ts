import {PurchaseBase, ProductBase} from '../ExpoIap.types';

type SubscriptionIosPeriod = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | '';
type PaymentMode = '' | 'FREETRIAL' | 'PAYASYOUGO' | 'PAYUPFRONT';

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

type SubscriptionInfo = {
  introductoryOffer?: SubscriptionOffer;
  promotionalOffers?: SubscriptionOffer[];
  subscriptionGroupId: string;
  subscriptionPeriod: {
    unit: SubscriptionIosPeriod;
    value: number;
  };
};

export type ProductIOS = ProductBase & {
  displayName: string;
  isFamilyShareable: boolean;
  jsonRepresentation: string;
  subscription?: SubscriptionInfo;
  introductoryPriceNumberOfPeriodsIOS?: string;
  introductoryPriceSubscriptionPeriodIOS?: SubscriptionIosPeriod;
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

export type SubscriptionProductIOS = ProductIOS & {
  discounts?: Discount[];
  introductoryPrice?: string;
  introductoryPriceAsAmountIOS?: string;
  introductoryPricePaymentModeIOS?: PaymentMode;
  introductoryPriceNumberOfPeriodsIOS?: string;
  introductoryPriceSubscriptionPeriodIOS?: SubscriptionIosPeriod;
  subscriptionPeriodNumberIOS?: string;
  subscriptionPeriodUnitIOS?: SubscriptionIosPeriod;
};

export type PaymentDiscount = {
  /**
   * A string used to uniquely identify a discount offer for a product.
   */
  identifier: string;
  /**
   * A string that identifies the key used to generate the signature.
   */
  keyIdentifier: string;
  /**
   * A universally unique ID (UUID) value that you define.
   */
  nonce: string;
  /**
   * A UTF-8 string representing the properties of a specific discount offer, cryptographically signed.
   */
  signature: string;
  /**
   * The date and time of the signature's creation in milliseconds, formatted in Unix epoch time.
   */
  timestamp: number;
};

export type RequestPurchaseIOSProps = {
  sku: string;
  andDangerouslyFinishTransactionAutomaticallyIOS?: boolean;
  /**
   * UUID representing user account
   */
  appAccountToken?: string;
  quantity?: number;
  withOffer?: PaymentDiscount;
};

export type RequestSubscriptionIOSProps = RequestPurchaseIOSProps;

/**
 * @deprecated Use RequestPurchaseIOSProps instead. This alias will be removed in v3.0.0.
 */
export type RequestPurchaseIosProps = RequestPurchaseIOSProps;

/**
 * @deprecated Use RequestSubscriptionIOSProps instead. This alias will be removed in v3.0.0.
 */
export type RequestSubscriptionIosProps = RequestSubscriptionIOSProps;

type SubscriptionStatus =
  | 'expired'
  | 'inBillingRetryPeriod'
  | 'inGracePeriod'
  | 'revoked'
  | 'subscribed';

type RenewalInfo = {
  jsonRepresentation?: string;
  willAutoRenew: boolean;
  autoRenewPreference?: string;
};

export type ProductStatusIOS = {
  state: SubscriptionStatus;
  renewalInfo?: RenewalInfo;
};

export type ProductPurchaseIOS = PurchaseBase & {
  // iOS basic fields
  quantityIOS?: number;
  originalTransactionDateIOS?: number;
  originalTransactionIdentifierIOS?: string;
  appAccountToken?: string;
  // iOS additional fields from StoreKit 2
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
  offerIOS?: {
    id: string;
    type: string;
    paymentMode: string;
  };
  priceIOS?: number;
  currencyIOS?: string;
  /**
   * @deprecated Use `purchaseToken` instead. This field will be removed in a future version.
   * iOS 15+ JWS representation is now available through the `purchaseToken` field.
   */
  jwsRepresentationIOS?: string;
};

export type AppTransactionIOS = {
  appTransactionId?: string; // Only available in iOS 18.4+
  originalPlatform?: string; // Only available in iOS 18.4+
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
