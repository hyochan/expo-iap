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

The `useIAP` hook follows React Hooks conventions and differs from the underlying native module methods:

- **Automatic Connection Management**: The hook automatically calls `initConnection` when the component mounts and `endConnection` when it unmounts.
- **State Management**: Hook methods like `requestProducts`, `getProducts`, etc., return `Promise<void>` instead of returning data directly. They update the internal state which you access through the returned properties.
- **Product Caching**: Product caching is handled automatically by the native module - you don't need to implement caching at the application level.

## Basic Usage

```tsx
const {
  connected,
  products,
  subscriptions,
  currentPurchase,
  currentPurchaseError,
  getProducts,
  getSubscriptions,
  requestPurchase,
  validateReceipt,
} = useIAP({
  onPurchaseSuccess: (purchase) => {
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
  autoFinishTransactions?: boolean; // Default: true
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
- **Description**: Currently active purchase (if any)
- **Example**:

  ```tsx
  useEffect(() => {
    if (currentPurchase) {
      processPurchase(currentPurchase);
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

#### purchaseHistories

- **Type**: `ProductPurchase[]`
- **Description**: Array of purchase history items
- **Example**:

  ```tsx
  purchaseHistories.map((purchase) => (
    <PurchaseHistoryItem key={purchase.transactionId} purchase={purchase} />
  ));
  ```

#### availablePurchases

- **Type**: `ProductPurchase[]`
- **Description**: Array of available purchases (restorable items)
- **Example**:

  ```tsx
  availablePurchases.map((purchase) => (
    <RestorableItem key={purchase.transactionId} purchase={purchase} />
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

#### requestProducts

- **Type**: `(params: RequestProductsParams) => Promise<void>`
- **Description**: Fetch products or subscriptions from the store and update the `products` or `subscriptions` state
- **Parameters**:
  - `params`: Object containing:
    - `skus`: Array of product/subscription IDs to fetch
    - `type`: Product type - either `'inapp'` for products or `'subs'` for subscriptions
- **Returns**: `Promise<void>` - The fetched products are available in the `products` or `subscriptions` state properties
- **Example**:

  ```tsx
  // Fetch in-app products
  const fetchProducts = async () => {
    try {
      const products = await requestProducts({
        skus: ['com.app.premium', 'com.app.coins_100'],
        type: 'inapp',
      });
      console.log('Fetched products:', products);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  // Fetch subscriptions
  const fetchSubscriptions = async () => {
    try {
      const subs = await requestProducts({
        skus: ['com.app.premium_monthly', 'com.app.premium_yearly'],
        type: 'subs',
      });
      console.log('Fetched subscriptions:', subs);
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
    }
  };
  ```

#### getProducts (Deprecated)

> **⚠️ DEPRECATED:** This method is deprecated. Use `requestProducts({ skus, type: 'inapp' })` instead.

- **Type**: `(productIds: string[]) => Promise<void>`
- **Migration**:

  ```tsx
  // Old way (deprecated)
  const products = await getProducts(['product1', 'product2']);

  // New way
  const products = await requestProducts({
    skus: ['product1', 'product2'],
    type: 'inapp',
  });
  ```

#### getSubscriptions (Deprecated)

> **⚠️ DEPRECATED:** This method is deprecated. Use `requestProducts({ skus, type: 'subs' })` instead.

- **Type**: `(subscriptionIds: string[]) => Promise<void>`
- **Migration**:

  ```tsx
  // Old way (deprecated)
  const subs = await getSubscriptions(['sub1', 'sub2']);

  // New way
  const subs = await requestProducts({
    skus: ['sub1', 'sub2'],
    type: 'subs',
  });
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

#### getPurchaseHistories

- **Type**: `() => Promise<void>`
- **Description**: Fetch purchase history from the store
- **Example**:

  ```tsx
  const fetchPurchaseHistory = async () => {
    try {
      await getPurchaseHistories();
      console.log('Purchase history fetched:', purchaseHistories);
    } catch (error) {
      console.error('Failed to fetch purchase history:', error);
    }
  };
  ```

#### getAvailablePurchases

- **Type**: `() => Promise<void>`
- **Description**: Fetch available purchases (restorable items) from the store
- **Example**:

  ```tsx
  const restorePurchases = async () => {
    try {
      await getAvailablePurchases();
      console.log('Available purchases:', availablePurchases);
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
- **Note**: `buyPromotedProductIOS` is deprecated, use `requestPurchaseOnPromotedProductIOS` instead
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
            title={`${product.title} - ${product.oneTimePurchaseOfferDetails?.formattedPrice}`}
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
       requestProducts({skus: productIds, type: 'inapp'});
     }
   }, [connected]);
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
