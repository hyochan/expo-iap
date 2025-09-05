// Centralized product ID constants for examples and internal usage
// Rename guide: subscriptionIds -> SUBSCRIPTION_PRODUCT_IDS, PRODUCT_IDS remains the same name

// One-time purchase product IDs (consumables/non-consumables)
export const PRODUCT_IDS: string[] = [
  'dev.hyo.martie.10bulbs',
  'dev.hyo.martie.30bulbs',
];

// Subscription product IDs
export const SUBSCRIPTION_PRODUCT_IDS: string[] = [
  'dev.hyo.martie.premium',
];

// Optionally export a single default subscription for convenience
export const DEFAULT_SUBSCRIPTION_PRODUCT_ID = SUBSCRIPTION_PRODUCT_IDS[0];

