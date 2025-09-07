import {PurchaseCommon, ProductCommon} from '../ExpoIap.types';

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

export type ProductIOS = ProductCommon & {
  displayNameIOS: string;
  isFamilyShareableIOS: boolean;
  jsonRepresentationIOS: string;
  platform: 'ios';
  subscriptionInfoIOS?: SubscriptionInfo;
  /**
   * @deprecated Use `displayNameIOS` instead. This field will be removed in v2.9.0.
   */
  displayName?: string;
  /**
   * @deprecated Use `isFamilyShareableIOS` instead. This field will be removed in v2.9.0.
   */
  isFamilyShareable?: boolean;
  /**
   * @deprecated Use `jsonRepresentationIOS` instead. This field will be removed in v2.9.0.
   */
  jsonRepresentation?: string;
  /**
   * @deprecated Use `subscriptionInfoIOS` instead. This field will be removed in v2.9.0.
   */
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

export type ProductSubscriptionIOS = ProductIOS & {
  discountsIOS?: Discount[];
  introductoryPriceIOS?: string;
  introductoryPriceAsAmountIOS?: string;
  introductoryPricePaymentModeIOS?: PaymentMode;
  introductoryPriceNumberOfPeriodsIOS?: string;
  introductoryPriceSubscriptionPeriodIOS?: SubscriptionIosPeriod;
  platform: 'ios';
  subscriptionPeriodNumberIOS?: string;
  subscriptionPeriodUnitIOS?: SubscriptionIosPeriod;
  /**
   * @deprecated Use `discountsIOS` instead. This field will be removed in v2.9.0.
   */
  discounts?: Discount[];
  /**
   * @deprecated Use `introductoryPriceIOS` instead. This field will be removed in v2.9.0.
   */
  introductoryPrice?: string;
};

// Legacy naming for backward compatibility
export type SubscriptionProductIOS = ProductSubscriptionIOS;

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

export type RequestPurchaseIosProps = {
  sku: string;
  andDangerouslyFinishTransactionAutomatically?: boolean;
  /**
   * UUID representing user account
   */
  appAccountToken?: string;
  quantity?: number;
  withOffer?: PaymentDiscount;
};

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

// Legacy naming for backward compatibility
export type ProductPurchaseIOS = PurchaseCommon & {
  // iOS basic fields
  platform: 'ios';
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
  // Price locale fields
  currencyCodeIOS?: string;
  currencySymbolIOS?: string;
  countryCodeIOS?: string;
  /**
   * @deprecated Use `purchaseToken` instead. This field will be removed in a future version.
   * iOS 15+ JWS representation is now available through the `purchaseToken` field.
   */
  jwsRepresentationIOS?: string;
};

// Preferred naming
export type PurchaseIOS = ProductPurchaseIOS;

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
