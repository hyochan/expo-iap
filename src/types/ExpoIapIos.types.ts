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
  subscriptionGroupID: string;
  subscriptionPeriod: {
    unit: SubscriptionIosPeriod;
    value: number;
  };
};

export type ProductIos = ProductBase & {
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

export type SubscriptionProductIos = ProductIos & {
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

export type RequestPurchaseIosProps = {
  sku: string;
  andDangerouslyFinishTransactionAutomaticallyIOS?: boolean;
  /**
   * UUID representing user account
   */
  appAccountToken?: string;
  quantity?: number;
  withOffer?: PaymentDiscount;
};

export type RequestSubscriptionIosProps = RequestPurchaseIosProps;

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

export type ProductStatusIos = {
  state: SubscriptionStatus;
  renewalInfo?: RenewalInfo;
};

export type ProductPurchaseIos = PurchaseBase & {
  // iOS basic fields
  quantityIos?: number;
  originalTransactionDateIos?: number;
  originalTransactionIdentifierIos?: string;
  appAccountToken?: string;
  // iOS additional fields from StoreKit 2
  expirationDateIos?: number;
  webOrderLineItemIdIos?: number;
  environmentIos?: string;
  storefrontCountryCodeIos?: string;
  appBundleIdIos?: string;
  productTypeIos?: string;
  subscriptionGroupIdIos?: string;
  isUpgradedIos?: boolean;
  ownershipTypeIos?: string;
  reasonIos?: string;
  reasonStringRepresentationIos?: string;
  transactionReasonIos?: 'PURCHASE' | 'RENEWAL' | string;
  revocationDateIos?: number;
  revocationReasonIos?: string;
  offerIos?: {
    id: string;
    type: string;
    paymentMode: string;
  };
  priceIos?: number;
  currencyIos?: string;
  jwsRepresentationIos?: string;
};
