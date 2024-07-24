type SubscriptionIosPeriod = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | '';
type PaymentMode = '' | 'FREETRIAL' | 'PAYASYOUGO' | 'PAYUPFRONT';

type SubscriptionOffer = {
  displayPrice: string;
  id: string;
  paymentMode: PaymentMode;
  period: SubscriptionIosPeriod;
  periodCount: number;
  price: number;
  type: 'introductory' | 'promotional';
};

type SubscriptionInfo = {
  introductoryOffer?: SubscriptionOffer;
  promotionalOffers?: SubscriptionOffer[];
  subscriptionGroupID: string;
  subscriptionPeriod: SubscriptionIosPeriod;
};

export type ProductIos = {
  currency: string;
  description: string;
  displayName: string;
  displayPrice: string;
  id: string;
  type: 'autoRenewable' | 'consumable' | 'nonConsumable' | 'nonRenewable';
  isFamilyShareable: boolean;
  jsonRepresentation: string;
  price: number;
  subscription: SubscriptionInfo;
  introductoryPriceNumberOfPeriodsIOS?: string;
  introductoryPriceSubscriptionPeriodIOS?: SubscriptionIosPeriod;
};

type Discount = {
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

export type TransactionSk2 = {
  appAccountToken: string;
  appBundleID: string;
  debugDescription: string;
  deviceVerification: string;
  deviceVerificationNonce: string;
  expirationDate: number;
  environment?: 'Production' | 'Sandbox' | 'Xcode'; // Could be undefined in some cases on iOS 15, but it's stable since iOS 16
  id: number;
  isUpgraded: boolean;
  jsonRepresentation: string;
  offerID: string;
  offerType: string;
  originalID: string;
  originalPurchaseDate: number;
  ownershipType: string;
  productID: string;
  productType: string;
  purchaseDate: number;
  purchasedQuantity: number;
  revocationDate: number;
  revocationReason: string;
  signedDate: number;
  subscriptionGroupID: number;
  webOrderLineItemID: number;
  verificationResult?: string;
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

export type ProductStatusIos = {
  state: SubscriptionStatus;
  renewalInfo?: RenewalInfo;
};
