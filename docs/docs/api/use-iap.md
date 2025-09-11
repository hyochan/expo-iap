---
title: useIAP Hook
sidebar_label: useIAP Hook
sidebar_position: 1
---

import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# useIAP Hook

<AdFitTopFixed />

The `useIAP` hook is the main interface for interacting with in-app purchases in Expo IAP. It provides a comprehensive API for managing purchases, subscriptions, and error handling.

## Import

```tsx
import {useIAP} from 'expo-iap';
```

## Important: Hook Behavior

The `useIAP` hook follows React Hooks conventions and differs from calling functions directly from `expo-iap` (index exports):

- **Automatic connection**: Automatically calls `initConnection` on mount and `endConnection` on unmount.
- **Void-returning methods**: Methods like `fetchProducts`, `requestProducts`, `getProducts`, `getSubscriptions`, `requestPurchase`, `getAvailablePurchases`, etc. return `Promise<void>` in the hook. They do not resolve to data. Instead, they update internal state exposed by the hook: `products`, `subscriptions`, `availablePurchases`, `currentPurchase`, etc.
- **Don’t await for data**: When using the hook, do not write `const x = await fetchProducts(...)`. Call the method, then read the corresponding state from the hook.
- **Prefer callbacks over `currentPurchase`**: `currentPurchase` was historically useful for debugging and migration, but for new code you should rely on `onPurchaseSuccess` and `onPurchaseError` options passed to `useIAP`.

## Basic Usage

```tsx
const {
  connected,
  products,
  subscriptions,
  availablePurchases,
  currentPurchase, // Debugging/migration friendly; prefer callbacks
  currentPurchaseError, // Debugging/migration friendly; prefer callbacks
  fetchProducts,
  requestProducts, // deprecated alias to fetchProducts inside the hook
  getProducts, // deprecated helper; keep for migration
  getSubscriptions, // deprecated helper; keep for migration
  requestPurchase,
  validateReceipt,
} = useIAP({
  onPurchaseSuccess: (purchase) => {
    // Validate on your backend, then finish the transaction
    console.log('Purchase successful:', purchase);
  },
  onPurchaseError: (error) => {
    console.error('Purchase failed:', error);
  },
  onSyncError: (error) => {
    console.warn('Sync error:', error);
  },
});
```

## Configuration Options

### useIAP(options)

| Parameter | Type            | Required | Description          |
| --------- | --------------- | -------- | -------------------- |
| `options` | `UseIAPOptions` | No       | Configuration object |

#### UseIAPOptions

```tsx
interface UseIAPOptions {
  onPurchaseSuccess?: (purchase: Purchase) => void;
  onPurchaseError?: (error: PurchaseError) => void;
  onSyncError?: (error: Error) => void;
  shouldAutoSyncPurchases?: boolean; // Controls auto sync behavior inside the hook
  onPromotedProductIOS?: (product: Product) => void; // iOS promoted products
}
```

### Configuration Properties

#### onPurchaseSuccess

- **Type**: `(purchase: Purchase) => void`
- **Description**: Called when a purchase completes successfully
- **Example**:

  ```tsx
  onPurchaseSuccess: (purchase) => {
    // Grant user access to purchased content
    unlockFeature(purchase.productId);
  };
  ```

#### onPurchaseError

- **Type**: `(error: PurchaseError) => void`
- **Description**: Called when a purchase fails
- **Example**:

  ```tsx
  onPurchaseError: (error) => {
    if (error.code !== ErrorCode.E_USER_CANCELLED) {
      Alert.alert('Purchase Failed', error.message);
    }
  };
  ```

#### onSyncError

- **Type**: `(error: Error) => void`
- **Description**: Called when there's an error syncing with the store
- **Example**:

  ```tsx
  onSyncError: (error) => {
    console.warn('Store sync error:', error.message);
  };
  ```

#### autoFinishTransactions

- **Type**: `boolean`
- **Default**: `true`
- **Description**: Whether to automatically finish transactions after successful purchases

## Return Values

### State Properties

#### connected

- **Type**: `boolean`
- **Description**: Whether the IAP service is connected and ready
- **Example**:

  ```tsx
  if (connected) {
    // Safe to make IAP calls
    getProducts(['product.id']);
  }
  ```

#### products

- **Type**: `Product[]`
- **Description**: Array of available products
- **Example**:

  ```tsx
  products.map((product) => <ProductItem key={product.id} product={product} />);
  ```

#### subscriptions

- **Type**: `SubscriptionProduct[]`
- **Description**: Array of available subscription products
- **Example**:

  ```tsx
  subscriptions.map((subscription) => (
    <SubscriptionItem key={subscription.id} subscription={subscription} />
  ));
  ```

#### currentPurchase

- **Type**: `Purchase | null`
- **Description**: Last purchase event captured by the hook. This value is primarily helpful for debugging and migration. For production flows, prefer handling purchase results via `onPurchaseSuccess` and errors via `onPurchaseError` passed to `useIAP`.
- **Example (debug logging only)**:

  ```tsx
  useEffect(() => {
    if (currentPurchase) {
      console.log('Debug purchase event:', currentPurchase.id);
    }
  }, [currentPurchase]);
  ```

#### currentPurchaseError

- **Type**: `PurchaseError | null`
- **Description**: Current purchase error (if any)
- **Example**:

  ```tsx
  useEffect(() => {
    if (currentPurchaseError) {
      handlePurchaseError(currentPurchaseError);
    }
  }, [currentPurchaseError]);
  ```

#### availablePurchases

- **Type**: `Purchase[]`
- **Description**: Array of available purchases (restorable items)
- **Example**:

  ```tsx
  availablePurchases.map((purchase) => (
    <RestorableItem key={purchase.id} purchase={purchase} />
  ));
  ```

#### promotedProductIOS

- **Type**: `Product | undefined`
- **Description**: The promoted product details (iOS only)
- **Example**:

  ```tsx
  useEffect(() => {
    if (promotedProductIOS) {
      // Handle promoted product
      handlePromotedProduct(promotedProductIOS);
    }
  }, [promotedProductIOS]);
  ```

### Methods

#### fetchProducts / requestProducts (hook)

- **Type**: `(params: { skus: string[]; type?: 'inapp' | 'subs' }) => Promise<void>`
- **Description**: Fetch products or subscriptions and update `products` / `subscriptions` state. In the hook these functions return `void` (no data result), by design.
- **Do not await for data**: Call them, then consume `products` / `subscriptions` state from the hook.
- **Example**:

  ```tsx
  useEffect(() => {
    if (!connected) return;
    // In hook: returns void, updates state
    fetchProducts({
      skus: ['com.app.premium', 'com.app.coins_100'],
      type: 'inapp',
    });
    fetchProducts({skus: ['com.app.premium_monthly'], type: 'subs'});
  }, [connected, fetchProducts]);

  // Later in render/effects
  products.forEach((p) => console.log('product', p.id));
  subscriptions.forEach((s) => console.log('sub', s.id));
  ```

#### getProducts (Deprecated helper)

> ⚠️ Deprecated. Inside the hook, prefer `fetchProducts({ skus, type: 'inapp' })`.

- **Type**: `(productIds: string[]) => Promise<void>`
- **Migration**:

  ```tsx
  // Old way (deprecated helper)
  getProducts(['product1', 'product2']); // updates `products` state

  // Preferred
  fetchProducts({skus: ['product1', 'product2'], type: 'inapp'}); // updates `products` state
  ```

#### getSubscriptions (Deprecated helper)

> ⚠️ Deprecated. Inside the hook, prefer `fetchProducts({ skus, type: 'subs' })`.

- **Type**: `(subscriptionIds: string[]) => Promise<void>`
- **Migration**:

  ```tsx
  // Old way (deprecated helper)
  getSubscriptions(['sub1', 'sub2']); // updates `subscriptions` state

  // Preferred
  fetchProducts({skus: ['sub1', 'sub2'], type: 'subs'}); // updates `subscriptions` state
  ```

#### requestPurchase

- **Type**: `(request: RequestPurchaseProps) => Promise<void>`
- **Description**: Initiate a purchase request
- **Parameters**:
  - `request`: Purchase request configuration
- **Example**:

  ```tsx
  const buyProduct = async (productId: string) => {
    try {
      // In hook: returns void. Listen via callbacks or `currentPurchase`.
      await requestPurchase({
        request: {
          ios: {sku: productId},
          android: {skus: [productId]},
        },
      });
    } catch (error) {
      console.error('Purchase request failed:', error);
    }
  };
  ```

#### Subscription helpers (hook)

- `getActiveSubscriptions(subscriptionIds?) => Promise<ActiveSubscription[]>`

  - Returns active subscription info and also updates `activeSubscriptions` state.
  - Exception to the hook’s void-return design: this method returns data for convenience.
  - Example:

    ```tsx
    const {getActiveSubscriptions, activeSubscriptions} = useIAP();

    useEffect(() => {
      if (!connected) return;
      (async () => {
        const subs = await getActiveSubscriptions(['premium_monthly']);
        console.log('Subs from return:', subs.length);
        console.log('Subs from state:', activeSubscriptions.length);
      })();
    }, [connected]);
    ```

- `hasActiveSubscriptions(subscriptionIds?) => Promise<boolean>`
  - Boolean convenience check to see if any active subscriptions exist (optionally filtered by IDs).

> Removed in v2.9.0: `purchaseHistories` state and `getPurchaseHistories()` method. Use `getAvailablePurchases()` and `availablePurchases` instead.

#### getAvailablePurchases

- **Type**: `() => Promise<void>`
- **Description**: Fetch available purchases (restorable items) from the store
- **Example**:

  ```tsx
  const restorePurchases = async () => {
    try {
      // Updates `availablePurchases` state; do not expect a return value
      await getAvailablePurchases();
      // Read from state afterwards
      console.log('Available purchases count:', availablePurchases.length);
    } catch (error) {
      console.error('Failed to fetch available purchases:', error);
    }
  };
  ```

#### validateReceipt

- **Type**: `(productId: string, params?: ValidationParams) => Promise<ValidationResult>`
- **Description**: Validate a purchase receipt
- **Parameters**:
  - `productId`: ID of the product to validate
  - `params`: **Required for Android**, optional for iOS:
    - `packageName` (string, Android): Package name of your app
    - `productToken` (string, Android): Purchase token from the purchase
    - `accessToken` (string, Android): Optional access token for server validation
    - `isSub` (boolean, Android): Whether this is a subscription
- **Returns**: Promise resolving to validation result

**Important Platform Differences:**

- **iOS**: Only requires the product ID
- **Android**: Requires additional parameters (packageName, productToken)

- **Example**:

  ```tsx
  const validatePurchase = async (productId: string, purchase: any) => {
    try {
      if (Platform.OS === 'ios') {
        // iOS: Simple validation with just product ID
        const result = await validateReceipt(productId);
        return result;
      } else if (Platform.OS === 'android') {
        // Android: Requires additional parameters
        const purchaseToken = purchase.purchaseToken;
        const packageName = purchase.packageNameAndroid;

        if (!purchaseToken || !packageName) {
          throw new Error(
            'Android validation requires packageName and productToken',
          );
        }

        const result = await validateReceipt(productId, {
          packageName,
          productToken: purchaseToken,
          isSub: false, // Set to true for subscriptions
        });
        return result;
      }
    } catch (error) {
      console.error('Validation failed:', error);
      throw error;
    }
  };
  ```

#### getPromotedProductIOS

- **Type**: `() => Promise<any | null>`
- **Description**: Get the promoted product details (iOS only)
- **Example**:

  ```tsx
  const handlePromotedProduct = async () => {
    const promotedProduct = await getPromotedProductIOS();
    if (promotedProduct) {
      console.log('Promoted product:', promotedProduct);
      // Show custom purchase UI
    }
  };
  ```

#### requestPurchaseOnPromotedProductIOS

- **Type**: `() => Promise<void>`
- **Description**: Complete the purchase of a promoted product (iOS only)
  > Removed in v2.9.0: `buyPromotedProductIOS`. Use `requestPurchaseOnPromotedProductIOS` instead.
- **Example**:

  ```tsx
  const completePurchase = async () => {
    try {
      await requestPurchaseOnPromotedProductIOS();
      console.log('Promoted product purchase completed');
    } catch (error) {
      console.error('Failed to purchase promoted product:', error);
    }
  };
  ```

## Platform-Specific Usage

### iOS Example

```tsx
const IOSPurchaseExample = () => {
  const {connected, products, requestPurchase, validateReceipt} = useIAP({
    onPurchaseSuccess: async (purchase) => {
      // Validate receipt on iOS
      const validation = await validateReceipt(purchase.productId);
      if (validation.isValid) {
        unlockContent(purchase.productId);
      }
    },
  });

  const buyProduct = (product: Product) => {
    requestPurchase({
      request: {
        ios: {sku: product.id},
        android: {skus: [product.id]},
      },
    });
  };

  return (
    <View>
      {products
        .filter((p) => p.platform === 'ios')
        .map((product) => (
          <Button
            key={product.id}
            title={`${product.title} - ${product.displayPrice}`}
            onPress={() => buyProduct(product)}
          />
        ))}
    </View>
  );
};
```

### Android Example

```tsx
const AndroidPurchaseExample = () => {
  const {connected, products, requestPurchase} = useIAP({
    onPurchaseSuccess: (purchase) => {
      // Android purchases are automatically validated by Google Play
      unlockContent(purchase.productId);
    },
  });

  const buyProduct = (product: Product) => {
    requestPurchase({
      request: {
        ios: {sku: product.id},
        android: {skus: [product.id]},
      },
    });
  };

  return (
    <View>
      {products
        .filter((p) => p.platform === 'android')
        .map((product) => (
          <Button
            key={product.id}
            title={`${product.title} - ${product.displayPrice}`}
            onPress={() => buyProduct(product)}
          />
        ))}
    </View>
  );
};
```

## Error Handling

The `useIAP` hook integrates with the centralized error handling system:

```tsx
const {requestPurchase} = useIAP({
  onPurchaseError: (error) => {
    // Error is automatically typed as PurchaseError
    switch (error.code) {
      case ErrorCode.E_USER_CANCELLED:
        // Don't show error for user cancellation
        break;
      case ErrorCode.E_NETWORK_ERROR:
        Alert.alert('Network Error', 'Please check your connection');
        break;
      case ErrorCode.E_ITEM_UNAVAILABLE:
        Alert.alert(
          'Item Unavailable',
          'This item is not available for purchase',
        );
        break;
      default:
        Alert.alert('Purchase Failed', error.message);
    }
  },
});
```

## Best Practices

1. **Always check `connected` before making IAP calls**:

   ```tsx
   useEffect(() => {
     if (connected) {
       fetchProducts({skus: productIds, type: 'inapp'});
     }
   }, [connected, fetchProducts]);
   ```

2. **Handle loading states**:

   ```tsx
   const [loading, setLoading] = useState(false);

   const buyProduct = async (productId: string) => {
     setLoading(true);
     try {
       await requestPurchase({
         request: {
           ios: {sku: productId},
           android: {skus: [productId]},
         },
       });
     } finally {
       setLoading(false);
     }
   };
   ```

3. **Implement proper error handling**:

   ```tsx
   const handleError = (error: PurchaseError) => {
     // Log for debugging
     console.error('IAP Error:', error);

     // Show user-friendly message
     if (error.code !== ErrorCode.E_USER_CANCELLED) {
       Alert.alert('Purchase Failed', error.message);
     }
   };
   ```

## Promoted Products (iOS Only)

Handle App Store promoted products when users tap on them in the App Store:

```tsx
const PromotedProductExample = () => {
  const {promotedProductIOS, requestPurchaseOnPromotedProductIOS} = useIAP({
    onPromotedProductIOS: (product) => {
      console.log('Promoted product detected:', product);
    },
    onPurchaseSuccess: (purchase) => {
      // Recommended: handle success via callback
    },
    onPurchaseError: (error) => {
      // Recommended: handle errors via callback
    },
  });

  useEffect(() => {
    if (promotedProductIOS) {
      handlePromotedProduct();
    }
  }, [promotedProductIOS]);

  const handlePromotedProduct = async () => {
    try {
      // Show your custom purchase UI
      const confirmed = await showPurchaseConfirmation(promotedProductIOS);

      if (confirmed) {
        // Complete the promoted purchase
        await requestPurchaseOnPromotedProductIOS();
      }
    } catch (error) {
      console.error('Error handling promoted product:', error);
    }
  };

  const showPurchaseConfirmation = async (product: any) => {
    return new Promise((resolve) => {
      Alert.alert(
        'Purchase Product',
        `Would you like to purchase ${product.localizedTitle} for ${product.price}?`,
        [
          {text: 'Cancel', onPress: () => resolve(false), style: 'cancel'},
          {text: 'Buy', onPress: () => resolve(true)},
        ],
      );
    });
  };

  return <View>{/* Your regular store UI */}</View>;
};
```

## See Also

- [Error Codes Reference](./error-codes)
- [Types Reference](./types)
- [Error Handling Guide](../guides/error-handling)
- [Purchase Flow Guide](../guides/lifecycle)
