type OneTimePurchaseOfferDetails = {
  priceCurrencyCode: string;
  formattedPrice: string;
  priceAmountMicros: string;
};

type SubscriptionOfferDetail = {
  basePlanId: string;
  offerId: string;
  offerToken: string;
  offerTags: string[];
  pricingPhases: PricingPhases;
};

type PricingPhases = {
  pricingPhaseList: PricingPhase[];
};

type PricingPhase = {
  formattedPrice: string;
  priceCurrencyCode: string;
  billingPeriod: string;
  billingCycleCount: number;
  priceAmountMicros: string;
  recurrenceMode: number;
};

export type ProductAndroid = {
  productId: string;
  title: string;
  description: string;
  productType: string;
  name: string;
  oneTimePurchaseOfferDetails?: OneTimePurchaseOfferDetails;
  subscriptionOfferDetails?: SubscriptionOfferDetail[];
};
