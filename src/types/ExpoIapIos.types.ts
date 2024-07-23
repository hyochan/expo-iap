type SubscriptionIosPeriod = "DAY" | "WEEK" | "MONTH" | "YEAR" | "";
type PaymentMode = "freeTrial" | "payAsYouGo" | "payUpFront";

type SubscriptionOffer = {
  displayPrice: string;
  id: string;
  paymentMode: PaymentMode;
  period: SubscriptionIosPeriod;
  periodCount: number;
  price: number;
  type: "introductory" | "promotional";
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
  type: "autoRenewable" | "consumable" | "nonConsumable" | "nonRenewable";
  isFamilyShareable: boolean;
  jsonRepresentation: string;
  price: number;
  subscription: SubscriptionInfo;
  introductoryPriceNumberOfPeriodsIOS?: string;
  introductoryPriceSubscriptionPeriodIOS?: SubscriptionIosPeriod;
};
