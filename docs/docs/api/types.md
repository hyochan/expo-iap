import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# Types

<AdFitTopFixed />

The expo-iap type surface is now generated in one place: `src/types.ts`. The file is produced by our GraphQL schema and represents the canonical source for all product, purchase, subscription, and request shapes. After updating any schema definitions, run `npm run generate` to refresh the file.

Key runtime helpers that build on these types live alongside them:

- `src/types.ts` – auto-generated enums and interfaces
- `src/purchase-error.ts` – typed error helpers (`PurchaseError`, `ErrorCodeUtils`)
- `src/helpers/subscription.ts` – subscription utilities that re-export `ActiveSubscription`

Below is a curated overview of the most commonly used types. Consult `src/types.ts` for the full schema.

## Core Enumerations

```ts
export enum Platform {
  Android = 'ANDROID',
  Ios = 'IOS',
}

export enum ProductType {
  InApp = 'IN_APP',
  Subs = 'SUBS',
}

export enum PurchaseState {
  Deferred = 'DEFERRED',
  Failed = 'FAILED',
  Pending = 'PENDING',
  Purchased = 'PURCHASED',
  Restored = 'RESTORED',
  Unknown = 'UNKNOWN',
}
```

The `ErrorCode` enum now mirrors the OpenIAP schema without the legacy `E_` prefix:

```ts
export enum ErrorCode {
  ActivityUnavailable = 'ACTIVITY_UNAVAILABLE',
  AlreadyOwned = 'ALREADY_OWNED',
  ...
  Unknown = 'UNKNOWN',
  UserCancelled = 'USER_CANCELLED',
  UserError = 'USER_ERROR',
}
```

Use `PurchaseError` from `src/purchase-error.ts` to work with typed errors and platform mappings.

## Product Types

All products share the generated `ProductCommon` interface. Platform extensions discriminate on the `platform` field via the `Platform` enum.

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
  platform: Platform;
}

export interface ProductAndroid extends ProductCommon {
  nameAndroid: string;
  oneTimePurchaseOfferDetailsAndroid?: ProductAndroidOneTimePurchaseOfferDetail | null;
  subscriptionOfferDetailsAndroid?:
    | ProductSubscriptionAndroidOfferDetails[]
    | null;
}

export interface ProductIos extends ProductCommon {
  displayNameIOS: string;
  isFamilyShareableIOS: boolean;
  jsonRepresentationIOS: string;
  typeIOS: ProductTypeIos;
  subscriptionInfoIOS?: SubscriptionInfoIos | null;
}

export type Product = ProductAndroid | ProductIos;
export type ProductSubscription =
  | ProductSubscriptionAndroid
  | ProductSubscriptionIos;
```

## Purchase Types

Purchases share the `PurchaseCommon` shape and discriminate on the same `platform` enum. Both variants expose the unified `purchaseToken` field for server validation.

```ts
export interface PurchaseCommon {
  id: string;
  productId: string;
  platform: Platform;
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
}

export interface PurchaseIos extends PurchaseCommon {
  appAccountToken?: string | null;
  environmentIOS?: string | null;
  expirationDateIOS?: number | null;
  originalTransactionIdentifierIOS?: string | null;
  offerIOS?: PurchaseOfferIos | null;
}

export type Purchase = PurchaseAndroid | PurchaseIos;
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

The request types have been harmonised to match the schema definitions.

```ts
export interface RequestPurchaseProps {
  android?: RequestPurchaseAndroidProps | null;
  ios?: RequestPurchaseIosProps | null;
}

export interface RequestSubscriptionPropsByPlatforms {
  android?: RequestSubscriptionAndroidProps | null;
  ios?: RequestSubscriptionIosProps | null;
}

export interface RequestPurchaseParams {
  requestPurchase?: RequestPurchasePropsByPlatforms | null;
  requestSubscription?: RequestSubscriptionPropsByPlatforms | null;
  type?: ProductQueryType | null;
}
```

## Receipt Validation

Receipt validation results are platform-specific unions:

```ts
export type ReceiptValidationResult =
  | ReceiptValidationResultAndroid
  | ReceiptValidationResultIos;
```

Use the higher-level `validateReceipt` helper exported from `src/index.ts` for a strongly typed wrapper around the native modules.

## Where to Find Everything

- For the exhaustive list of enums and interfaces, open `src/types.ts`.
- For error handling utilities (`PurchaseError`, `ErrorCodeUtils`), use `src/purchase-error.ts`.
- All generated types are re-exported from the package root so consumers can import from `expo-iap` directly:

```ts
import type {
  Product,
  Purchase,
  ActiveSubscription,
  RequestPurchaseProps,
} from 'expo-iap';
```

If you need to regenerate types place new schema definitions under the GraphQL inputs and rerun the generator. EOF
