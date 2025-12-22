---
title: Error Handling
sidebar_label: Error Handling
---

import IapKitBanner from "@site/src/uis/IapKitBanner";

# Error Handling

<IapKitBanner />

All methods can throw errors that should be handled appropriately. Use the `PurchaseError` type to get consistent, cross‑platform error information.

```ts
import {PurchaseError, requestPurchase} from 'expo-iap';

try {
  await requestPurchase({request: {sku: 'product_id'}});
} catch (error) {
  if (error instanceof PurchaseError) {
    switch (error.code) {
      case 'E_USER_CANCELLED':
        console.log('User cancelled purchase');
        break;
      case 'E_NETWORK_ERROR':
        console.log('Network error, please try again');
        break;
      default:
        console.error('Purchase failed:', error.message);
    }
  }
}
```

## Error Codes

For the complete list of error codes and their meanings, see the reference below.

- [Error Codes](./error-codes)
