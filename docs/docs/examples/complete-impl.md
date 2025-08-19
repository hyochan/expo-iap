---
sidebar_position: 3
---

import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# Complete Implementation

<AdFitTopFixed />

This example shows a real-world implementation of a complete in-app purchase store with both consumable products (bulb packs) and subscriptions (premium features).

## Quick Start

### 1. Initialize the Connection

```tsx
import {useIAP} from 'expo-iap';

export default function MyStore() {
  const {
    connected,
    products,
    subscriptions,
    currentPurchase,
    currentPurchaseError,
    requestProducts,
    requestPurchase,
    finishTransaction,
    validateReceipt,
  } = useIAP();

  // Your product SKUs
  const productSkus = ['your.product.id'];
  const subscriptionSkus = ['your.subscription.id'];
}
```

### 2. Fetch Products on Connection

```tsx
useEffect(() => {
  if (!connected) return;

  const initializeStore = async () => {
    try {
      await requestProducts({skus: productSkus, type: 'inapp'});
      await requestProducts({skus: subscriptionSkus, type: 'subs'});
    } catch (error) {
      console.error('Failed to initialize store:', error);
    }
  };

  initializeStore();
}, [connected]);
```

### 3. Handle Purchases

```tsx
const handlePurchase = async (productId) => {
  try {
    // Platform-specific purchase requests (v2.7.0+)
    await requestPurchase({
      request: {
        ios: {
          sku: productId,
          andDangerouslyFinishTransactionAutomatically: false,
        },
        android: {
          skus: [productId],
        },
      },
    });
  } catch (error) {
    console.error('Purchase failed:', error);
  }
};
```

### 4. Complete Transactions

```tsx
useEffect(() => {
  if (currentPurchase) {
    const completePurchase = async () => {
      try {
        // Validate receipt (recommended)
        const isValid = await validateReceipt(currentPurchase.id);

        if (isValid) {
          // Finish the transaction
          await finishTransaction({
            purchase: currentPurchase,
            isConsumable: true, // Set true for consumable products
          });

          // Grant the purchase to user
          console.log('Purchase completed successfully!');
        }
      } catch (error) {
        console.error('Failed to complete purchase:', error);
      }
    };

    completePurchase();
  }
}, [currentPurchase]);
```

## Overview

This implementation includes:

- **Consumable Products**: Bulb packs that can be purchased multiple times
- **Subscriptions**: Premium subscription with recurring billing
- **Receipt Validation**: Server-side validation for both platforms
- **Error Handling**: Comprehensive error handling and user feedback
- **Loading States**: UI feedback during purchase flow
- **Premium Status**: Subscription status management

## Key Concepts

### Platform Differences

```tsx
// Platform-specific purchase requests (v2.7.0+)
await requestPurchase({
  request: {
    ios: {
      sku: productId,
      andDangerouslyFinishTransactionAutomatically: false, // Important!
    },
    android: {
      skus: [productId], // Android uses array
    },
  },
});
```

### Consumable vs Non-Consumable

```tsx
// Mark products as consumable to allow repurchasing
await finishTransaction({
  purchase: currentPurchase,
  isConsumable: bulbsToAdd > 0, // Consumable products can be bought again
});
```

### Receipt Validation

```tsx
// Always validate receipts before granting purchases
const isValidReceipt = await validatePurchaseReceipt(
  productId,
  currentPurchase,
  handleValidateReceipt,
);

if (isValidReceipt) {
  // Grant the purchase
  await finishTransaction({...});
}
```

### Error Handling

```tsx
// Handle different error types appropriately
if (currentPurchaseError.code === ErrorCode.E_USER_CANCELLED) {
  return; // Don't show error for user cancellation
}

// Show error for other cases
Alert.alert('Purchase Error', 'Please try again.');
```

## Complete Implementation

```tsx
import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {useIAP, ProductPurchaseAndroid} from 'expo-iap';

// Define your product IDs
const PRODUCT_IDS = [
  'com.yourapp.premium',
  'com.yourapp.remove_ads',
  'com.yourapp.extra_features',
];

const SUBSCRIPTION_IDS = [
  'com.yourapp.premium_monthly',
  'com.yourapp.premium_yearly',
];

export default function Store() {
  const {
    connected,
    products,
    subscriptions,
    currentPurchase,
    currentPurchaseError,
    requestProducts,
    requestPurchase,
    finishTransaction,
  } = useIAP();

  const [loading, setLoading] = useState(false);
  const [purchasedItems, setPurchasedItems] = useState(new Set());

  // Initialize store
  useEffect(() => {
    if (connected) {
      loadProducts();
    }
  }, [connected]);

  // Handle purchase updates
  useEffect(() => {
    if (currentPurchase) {
      handlePurchaseUpdate(currentPurchase);
    }
  }, [currentPurchase]);

  // Handle purchase errors
  useEffect(() => {
    if (currentPurchaseError) {
      handlePurchaseError(currentPurchaseError);
    }
  }, [currentPurchaseError]);

  const loadProducts = async () => {
    try {
      setLoading(true);

      // Load both products and subscriptions
      await Promise.all([
        requestProducts({skus: PRODUCT_IDS, type: 'inapp'}),
        requestProducts({skus: SUBSCRIPTION_IDS, type: 'subs'}),
      ]);

      console.log('Products loaded successfully');
    } catch (error) {
      console.error('Failed to load products:', error);
      Alert.alert('Error', 'Failed to load store products');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseUpdate = async (purchase) => {
    try {
      console.log('Processing purchase:', purchase.productId);

      // Here you would typically validate the receipt on your server
      const isValid = await validatePurchase(purchase);

      if (isValid) {
        // Grant the purchase to the user
        await grantPurchase(purchase);

        // Update local state
        setPurchasedItems((prev) => new Set([...prev, purchase.productId]));

        // Finish the transaction
        await finishTransaction({purchase});

        Alert.alert(
          'Purchase Successful',
          `Thank you for purchasing ${purchase.productId}!`,
        );
      } else {
        Alert.alert('Error', 'Purchase validation failed');
      }
    } catch (error) {
      console.error('Error processing purchase:', error);
      Alert.alert('Error', 'Failed to process purchase');
    }
  };

  const handlePurchaseError = (error) => {
    console.error('Purchase error:', error);

    switch (error.code) {
      case 'E_USER_CANCELLED':
        // User cancelled - no need to show error
        break;
      case 'E_NETWORK_ERROR':
        Alert.alert(
          'Network Error',
          'Please check your internet connection and try again.',
        );
        break;
      case 'E_ITEM_UNAVAILABLE':
        Alert.alert(
          'Product Unavailable',
          'This product is currently unavailable.',
        );
        break;
      default:
        Alert.alert(
          'Purchase Failed',
          error.message || 'Unknown error occurred',
        );
        break;
    }
  };

  const buyProduct = async (productId) => {
    if (!connected) {
      Alert.alert('Error', 'Store is not connected');
      return;
    }

    try {
      console.log('Requesting purchase for:', productId);

      // Platform-specific purchase requests (v2.7.0+)
      await requestPurchase({
        request: {
          ios: {
            sku: productId,
            // Important: Set to false to manually handle transaction finishing
            // This allows proper receipt validation before finishing the transaction
            andDangerouslyFinishTransactionAutomatically: false,
          },
          android: {
            skus: [productId],
          },
        },
      });
    } catch (error) {
      console.error('Purchase request failed:', error);
      Alert.alert('Error', 'Failed to initiate purchase');
    }
  };

  const validatePurchase = async (purchase) => {
    // IMPORTANT: Platform-specific validation requirements:
    // - iOS: Only needs receiptData and productId
    // - Android: Requires packageName, purchaseToken, and optionally accessToken
    // Always check required parameters BEFORE attempting validation!

    try {
      // Handle both iOS and Android validation
      if (Platform.OS === 'ios') {
        // iOS: Simple validation with receipt data
        const response = await fetch(
          'https://your-server.com/validate-receipt-ios',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              receiptData: purchase.transactionReceipt,
              productId: purchase.productId,
            }),
          },
        );

        const result = await response.json();
        return result.isValid;
      } else if (Platform.OS === 'android') {
        // Android: Extract required validation parameters
        const purchaseToken = purchase.purchaseToken; // Unified API (no type casting needed)
        const packageName =
          (purchase as ProductPurchaseAndroid).packageNameAndroid ||
          'com.yourapp.package';

        // Determine if it's a subscription
        const isSub = SUBSCRIPTION_IDS.includes(purchase.productId);

        // CRITICAL: Check required Android parameters before validation
        if (!purchaseToken || !packageName) {
          throw new Error(
            'Android validation requires packageName and purchaseToken',
          );
        }

        // Note: For server-side validation with Google Play API, you may also need:
        // - accessToken: OAuth2 token for accessing Google Play Developer API
        // This is typically handled server-side, not in the client app

        const response = await fetch(
          'https://your-server.com/validate-receipt-android',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              packageName,
              productToken: purchaseToken,
              productId: purchase.productId,
              isSub,
              // accessToken is typically managed server-side
            }),
          },
        );

        const result = await response.json();
        console.log('Receipt validation result:', result);
        return result.isValid;
      }

      return true; // Default to true for unsupported platforms in dev
    } catch (validationError) {
      console.error('Error during receipt validation:', validationError);
      // Continue despite validation errors in production to not block purchases
      // In a production app, you might want to handle this differently
      return true;
    }
  };

  const grantPurchase = async (purchase) => {
    // Grant the purchase to the user
    // This could involve:
    // - Updating user preferences
    // - Unlocking features
    // - Adding credits/coins
    // - Updating subscription status

    console.log('Granting purchase:', purchase.productId);

    // Example: Update local storage or send to your backend
    try {
      await fetch('https://your-server.com/grant-purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'current-user-id',
          productId: purchase.productId,
          transactionId: purchase.transactionId,
        }),
      });
    } catch (error) {
      console.error('Failed to grant purchase:', error);
      throw error;
    }
  };

  const renderProduct = ({item}) => {
    const isPurchased = purchasedItems.has(item.productId);

    return (
      <View style={styles.productCard}>
        <View style={styles.productInfo}>
          <Text style={styles.productTitle}>{item.title}</Text>
          <Text style={styles.productDescription}>{item.description}</Text>
          <Text style={styles.productPrice}>{item.localizedPrice}</Text>
        </View>

        <TouchableOpacity
          style={[styles.buyButton, isPurchased && styles.purchasedButton]}
          onPress={() => buyProduct(item.productId)}
          disabled={isPurchased || loading}
        >
          <Text
            style={[
              styles.buyButtonText,
              isPurchased && styles.purchasedButtonText,
            ]}
          >
            {isPurchased ? 'Purchased' : 'Buy'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSubscription = ({item}) => {
    return (
      <View style={styles.subscriptionCard}>
        <View style={styles.productInfo}>
          <Text style={styles.productTitle}>{item.title}</Text>
          <Text style={styles.productDescription}>{item.description}</Text>
          <Text style={styles.productPrice}>{item.localizedPrice}</Text>
          {item.subscriptionPeriod && (
            <Text style={styles.subscriptionPeriod}>
              per {item.subscriptionPeriod}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.subscribeButton}
          onPress={() => buyProduct(item.productId)}
          disabled={loading}
        >
          <Text style={styles.subscribeButtonText}>Subscribe</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (!connected) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Connecting to store...</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Products</Text>
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.productId}
        style={styles.productList}
      />

      <Text style={styles.sectionTitle}>Subscriptions</Text>
      <FlatList
        data={subscriptions}
        renderItem={renderSubscription}
        keyExtractor={(item) => item.productId}
        style={styles.productList}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 16,
    color: '#333',
  },
  productList: {
    marginBottom: 24,
  },
  productCard: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  subscriptionCard: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2196f3',
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  productDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196f3',
  },
  subscriptionPeriod: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  buyButton: {
    backgroundColor: '#2196f3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    minWidth: 80,
  },
  purchasedButton: {
    backgroundColor: '#4caf50',
  },
  buyButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  purchasedButtonText: {
    color: 'white',
  },
  subscribeButton: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  subscribeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
```

## Key Features Explained

### 1. Product Configuration

```tsx
// Define your product IDs
const PRODUCT_IDS = [
  'com.yourapp.premium',
  'com.yourapp.remove_ads',
  'com.yourapp.extra_features',
];

const SUBSCRIPTION_IDS = [
  'com.yourapp.premium_monthly',
  'com.yourapp.premium_yearly',
];
```

### 2. Platform-Specific Purchase Handling

```tsx
// Platform-specific purchase requests (v2.7.0+)
await requestPurchase({
  request: {
    ios: {
      sku: productId,
      andDangerouslyFinishTransactionAutomatically: false,
    },
    android: {
      skus: [productId],
    },
  },
});
```

### 3. Receipt Validation

```tsx
// Cross-platform receipt validation
const isValid = await validatePurchase(purchase);
if (isValid) {
  await grantPurchase(purchase);
  await finishTransaction({purchase});
}
```

### 4. Error Handling

```tsx
// Handle different error types
switch (error.code) {
  case 'E_USER_CANCELLED':
    // User cancelled - no error needed
    break;
  case 'E_NETWORK_ERROR':
    Alert.alert('Network Error', 'Check your connection');
    break;
  default:
    Alert.alert('Purchase Failed', error.message);
}
```

### 5. UI Components

```tsx
// FlatList for products and subscriptions
<FlatList
  data={products}
  renderItem={renderProduct}
  keyExtractor={(item) => item.productId}
/>
```

## Best Practices

1. **Always validate receipts** before granting purchases
2. **Mark consumables correctly** to allow repurchasing
3. **Handle platform differences** in price formatting
4. **Provide loading states** during purchase flow
5. **Implement proper error handling** for better UX
6. **Store purchase records** in your backend
7. **Check subscription status** on app launch

## Best Practices

1. **Always validate receipts** before granting purchases
2. **Handle platform differences** in purchase request parameters
3. **Provide loading states** during purchase flow
4. **Implement proper error handling** for better UX
5. **Store purchase records** in your backend
6. **Use FlatList** for better performance with large product lists
7. **Check connection status** before initiating purchases

## Testing

- Test on both iOS and Android devices
- Test with sandbox/test accounts
- Verify receipt validation works correctly
- Test error scenarios (network issues, invalid products)
- Test subscription renewal and cancellation

## Next Steps

Now that you've seen a complete store implementation, here are recommended next steps:

### 🚀 Setup & Configuration

- [**Android Setup**](../getting-started/setup-android): Configure Google Play Console and Android-specific settings
- [**iOS Setup**](../getting-started/setup-ios): Set up App Store Connect and iOS configuration

### 📖 Learn More

- [**Basic Usage Patterns**](./basic-store): Start with simpler examples before implementing a complete store
- [**Getting Started Guide**](../guides/getting-started): Learn the fundamentals of Expo IAP
- [**API Reference**](../api/use-iap): Detailed documentation for all useIAP methods and options
- [**Error Handling**](../api/error-codes): Comprehensive guide to error management and recovery

### 🔧 Advanced Topics

- [**Receipt Validation**](../guides/purchases): Implement secure server-side validation
- [**Subscription Management**](./subscription-manager): Handle recurring subscriptions and renewals
- [**Troubleshooting**](../guides/troubleshooting): Solutions to common issues and debugging tips

### 🧪 Testing

- Test your implementation with sandbox accounts on both platforms
- Verify receipt validation works correctly
- Test error scenarios (network issues, invalid products)
- Test subscription renewal and cancellation flows

This implementation provides a complete, production-ready in-app purchase system that handles both consumable products and subscriptions with proper error handling and receipt validation.
