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
    if (error.code !== ErrorCode.UserCancelled) {
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

- **Type**: `ProductSubscription[]`
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

### Methods

#### getProducts

- **Type**: `(productIds: string[]) => Promise<Product[]>`
- **Description**: Fetch products from the store
- **Parameters**:
  - `productIds`: Array of product IDs to fetch
- **Returns**: Promise resolving to array of products
- **Example**:

  ```tsx
  const fetchProducts = async () => {
    try {
      const products = await getProducts([
        'com.app.premium',
        'com.app.coins_100',
      ]);
      console.log('Fetched products:', products);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };
  ```

#### getSubscriptions

- **Type**: `(subscriptionIds: string[]) => Promise<ProductSubscription[]>`
- **Description**: Fetch subscription products from the store
- **Parameters**:
  - `subscriptionIds`: Array of subscription IDs to fetch
- **Returns**: Promise resolving to array of subscription products
- **Example**:

  ```tsx
  const fetchSubscriptions = async () => {
    try {
      const subs = await getSubscriptions([
        'com.app.premium_monthly',
        'com.app.premium_yearly',
      ]);
      console.log('Fetched subscriptions:', subs);
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
    }
  };
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
        request: {sku: productId},
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
        const purchaseToken = purchase.purchaseTokenAndroid;
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
    if (product.platform === 'ios') {
      requestPurchase({
        request: {sku: product.id},
      });
    }
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
    if (product.platform === 'android') {
      requestPurchase({
        request: {skus: [product.id]},
      });
    }
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
      case ErrorCode.UserCancelled:
        // Don't show error for user cancellation
        break;
      case ErrorCode.NetworkError:
        Alert.alert('Network Error', 'Please check your connection');
        break;
      case ErrorCode.ItemUnavailable:
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
       getProducts(productIds);
     }
   }, [connected]);
   ```

2. **Handle loading states**:

   ```tsx
   const [loading, setLoading] = useState(false);

   const buyProduct = async (productId: string) => {
     setLoading(true);
     try {
       await requestPurchase({request: {sku: productId}});
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
     if (error.code !== ErrorCode.UserCancelled) {
       Alert.alert('Purchase Failed', error.message);
     }
   };
   ```

## See Also

- [Error Codes Reference](./error-codes)
- [Types Reference](./types)
- [Error Handling Guide](../guides/error-handling)
- [Purchase Flow Guide](../guides/lifecycle)
