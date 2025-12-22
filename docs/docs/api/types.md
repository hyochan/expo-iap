import IapKitBanner from "@site/src/uis/IapKitBanner";

# Types

<IapKitBanner />

The expo-iap type surface is now generated in one place: `src/types.ts`. The file is produced by our GraphQL schema and represents the canonical source for all product, purchase, subscription, and request shapes. After updating any schema definitions, run `bun run generate:types` to refresh the file.

Key runtime helpers that build on these types live alongside them:

- `src/types.ts` – auto-generated enums and interfaces
- `src/utils/errorMapping.ts` – typed error helpers (`createPurchaseError`, `ErrorCodeUtils`)
- `src/helpers/subscription.ts` – subscription utilities that re-export `ActiveSubscription`

Below is a curated overview of the most commonly used types. Consult `src/types.ts` for the full schema.

## Core Type Aliases

```ts
export type IapPlatform = 'android' | 'ios';

export type IapStore = 'unknown' | 'apple' | 'google' | 'horizon';

export type ProductType = 'in-app' | 'subs';

export type PurchaseState =
  | 'deferred'
  | 'failed'
  | 'pending'
  | 'purchased'
  | 'restored'
  | 'unknown';
```

The `ErrorCode` enum now mirrors the OpenIAP schema without the legacy `E_` prefix:

```ts
export enum ErrorCode {
  ActivityUnavailable = 'activity-unavailable',
  AlreadyOwned = 'already-owned',
  ...
  Unknown = 'unknown',
  UserCancelled = 'user-cancelled',
  UserError = 'user-error',
}
```

Use `createPurchaseError` from `src/utils/errorMapping.ts` to work with typed errors and platform mappings.

## Product Types

All products share the generated `ProductCommon` interface. Platform extensions discriminate on the `store` field via the `IapStore` string union.

```ts
export interface ProductCommon {
  id: string;
  title: string;
  description: string;
  type: ProductType;
  displayName?: string | null;
  displayPrice: string;
  currency: string;
  price?: number | null;
  store: IapStore;
}

export interface ProductAndroid extends ProductCommon {
  nameAndroid: string;
  // Array of offers with discount support (7.0+)
  oneTimePurchaseOfferDetailsAndroid?: ProductAndroidOneTimePurchaseOfferDetail[] | null;
  subscriptionOfferDetailsAndroid?:
    | ProductSubscriptionAndroidOfferDetails[]
    | null;
}

export interface ProductIOS extends ProductCommon {
  displayNameIOS: string;
  isFamilyShareableIOS: boolean;
  jsonRepresentationIOS: string;
  typeIOS: ProductTypeIOS;
  subscriptionInfoIOS?: SubscriptionInfoIOS | null;
}

export type Product = ProductAndroid | ProductIOS;
export type ProductSubscription =
  | ProductSubscriptionAndroid
  | ProductSubscriptionIOS;
```

## Purchase Types

Purchases share the `PurchaseCommon` shape and discriminate on the `store` union. Both variants expose the unified `purchaseToken` field for server validation.

```ts
export interface PurchaseCommon {
  id: string;
  productId: string;
  store: IapStore;
  purchaseState: PurchaseState;
  transactionDate: number;
  quantity: number;
  isAutoRenewing: boolean;
  purchaseToken?: string | null;
  ids?: string[] | null;
}

export interface PurchaseAndroid extends PurchaseCommon {
  autoRenewingAndroid?: boolean | null;
  packageNameAndroid?: string | null;
  signatureAndroid?: string | null;
  dataAndroid?: string | null;
  // Subscription suspension status (8.1.0+)
  isSuspendedAndroid?: boolean | null;
}

export interface PurchaseIOS extends PurchaseCommon {
  appAccountToken?: string | null;
  environmentIOS?: string | null;
  expirationDateIOS?: number | null;
  originalTransactionIdentifierIOS?: string | null;
  offerIOS?: PurchaseOfferIOS | null;
}

export type Purchase = PurchaseAndroid | PurchaseIOS;
```

## Active Subscriptions

`ActiveSubscription` is now part of the generated schema and shared across helpers.

```ts
export interface ActiveSubscription {
  productId: string;
  isActive: boolean;
  transactionId: string;
  transactionDate: number;
  purchaseToken?: string | null;
  autoRenewingAndroid?: boolean | null;
  environmentIOS?: string | null;
  expirationDateIOS?: number | null;
  daysUntilExpirationIOS?: number | null;
  willExpireSoon?: boolean | null;
}
```

The helper `getActiveSubscriptions` in `src/helpers/subscription.ts` converts `Purchase` records into this shape and re-exports the type for convenience.

## Request Parameters

The request types have been harmonised to match the schema definitions. Use `apple`/`google` for platform-specific parameters (the legacy `ios`/`android` keys are deprecated).

```ts
export interface RequestPurchasePropsByPlatforms {
  apple?: RequestPurchaseIosProps | null;
  google?: RequestPurchaseAndroidProps | null;
  /** @deprecated Use apple instead */
  ios?: RequestPurchaseIosProps | null;
  /** @deprecated Use google instead */
  android?: RequestPurchaseAndroidProps | null;
}

export interface RequestSubscriptionPropsByPlatforms {
  apple?: RequestSubscriptionIosProps | null;
  google?: RequestSubscriptionAndroidProps | null;
  /** @deprecated Use apple instead */
  ios?: RequestSubscriptionIosProps | null;
  /** @deprecated Use google instead */
  android?: RequestSubscriptionAndroidProps | null;
}

export type MutationRequestPurchaseArgs =
  | {
      request: RequestPurchasePropsByPlatforms;
      type: 'in-app';
    }
  | {
      request: RequestSubscriptionPropsByPlatforms;
      type: 'subs';
    };
```

## Purchase Verification

Purchase verification (aka receipt validation) results are platform-specific unions:

```ts
export type ReceiptValidationResult =
  | ReceiptValidationResultAndroid
  | ReceiptValidationResultIos;
```

Use the higher-level `validateReceipt` helper exported from `src/index.ts` for a strongly typed wrapper around the native modules.

## Where to Find Everything

- For the exhaustive list of enums and interfaces, open `src/types.ts`.
- For error handling utilities (`createPurchaseError`, `ErrorCodeUtils`), use `src/utils/errorMapping.ts`.
- All generated types are re-exported from the package root so consumers can import from `expo-iap` directly:

```ts
import type {
  Product,
  Purchase,
  ActiveSubscription,
  RequestPurchaseProps,
} from 'expo-iap';
```

If you need to regenerate types place new schema definitions under the GraphQL inputs and rerun the generator.

## Android Billing Programs API Types (8.2.0+)

New types for the Google Play Billing Programs API:

```ts
// Billing program types
type BillingProgramAndroid = 'unspecified' | 'external-content-link' | 'external-offer';

// Launch mode for external links
type ExternalLinkLaunchModeAndroid =
  | 'unspecified'
  | 'launch-in-external-browser-or-app'
  | 'caller-will-launch-link';

// Link type for external links
type ExternalLinkTypeAndroid =
  | 'unspecified'
  | 'link-to-digital-content-offer'
  | 'link-to-app-download';

// Parameters for launching external links
interface LaunchExternalLinkParamsAndroid {
  billingProgram: BillingProgramAndroid;
  launchMode: ExternalLinkLaunchModeAndroid;
  linkType: ExternalLinkTypeAndroid;
  linkUri: string;
}

// Result of checking billing program availability
interface BillingProgramAvailabilityResultAndroid {
  billingProgram: BillingProgramAndroid;
  isAvailable: boolean;
}

// Reporting details for external transactions
interface BillingProgramReportingDetailsAndroid {
  billingProgram: BillingProgramAndroid;
  externalTransactionToken: string;
}
```

## Android One-Time Product Discount Types (7.0+)

Types for one-time purchase product discounts:

```ts
// Discount amount details
interface DiscountAmountAndroid {
  discountAmountMicros: string;
  formattedDiscountAmount: string;
}

// Discount display information
interface DiscountDisplayInfoAndroid {
  percentageDiscount?: number | null;
  discountAmount?: DiscountAmountAndroid | null;
}

// Limited quantity information
interface LimitedQuantityInfoAndroid {
  maximumQuantity: number;
  remainingQuantity: number;
}

// Offer validity period
interface ValidTimeWindowAndroid {
  startTimeMillis: string;
  endTimeMillis: string;
}

// Pre-order details (8.1.0+)
interface PreorderDetailsAndroid {
  preorderReleaseTimeMillis: string;
  preorderPresaleEndTimeMillis: string;
}

// Rental details
interface RentalDetailsAndroid {
  rentalPeriod: string;
  rentalExpirationPeriod?: string | null;
}

// One-time purchase offer with discount support
interface ProductAndroidOneTimePurchaseOfferDetail {
  formattedPrice: string;
  priceAmountMicros: string;
  priceCurrencyCode: string;
  offerId?: string | null;
  offerToken: string;
  offerTags: string[];
  fullPriceMicros?: string | null;
  discountDisplayInfo?: DiscountDisplayInfoAndroid | null;
  limitedQuantityInfo?: LimitedQuantityInfoAndroid | null;
  validTimeWindow?: ValidTimeWindowAndroid | null;
  preorderDetailsAndroid?: PreorderDetailsAndroid | null;
  rentalDetailsAndroid?: RentalDetailsAndroid | null;
}
```

## Android Subscription Replacement Types (8.1.0+)

Types for subscription upgrade/downgrade:

```ts
// Product-level replacement parameters
interface SubscriptionProductReplacementParamsAndroid {
  oldProductId: string;
  replacementMode: SubscriptionReplacementModeAndroid;
}

// Replacement mode options
type SubscriptionReplacementModeAndroid =
  | 'unknown-replacement-mode'
  | 'with-time-proration'
  | 'charge-prorated-price'
  | 'charge-full-price'
  | 'without-proration'
  | 'deferred'
  | 'keep-existing';
