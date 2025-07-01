---
title: Basic Store Implementation
sidebar_label: Basic Store
sidebar_position: 1
---

import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# Basic Store Implementation

<AdFitTopFixed />

This example shows how to implement a basic in-app purchase store using expo-iap.

## Complete Store Component

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
} from 'react-native';
import {useIAP} from 'expo-iap';

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
    getProducts,
    getSubscriptions,
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
        getProducts({skus: PRODUCT_IDS}),
        getSubscriptions({skus: SUBSCRIPTION_IDS}),
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
      await requestPurchase({sku: productId});
    } catch (error) {
      console.error('Purchase request failed:', error);
      Alert.alert('Error', 'Failed to initiate purchase');
    }
  };

  const validatePurchase = async (purchase) => {
    // This is where you would validate the purchase on your server
    // For demo purposes, we'll just return true
    // In a real app, send the receipt to your server for validation

    try {
      const response = await fetch('https://your-server.com/validate-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receipt: purchase.transactionReceipt,
          productId: purchase.productId,
          // Add other necessary fields
        }),
      });

      const result = await response.json();
      return result.valid === true;
    } catch (error) {
      console.error('Receipt validation error:', error);
      // In case of server error, you might want to give benefit of doubt
      // or have a fallback validation mechanism
      return false;
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

## Key Features Demonstrated

### 1. Connection Management

- Automatic connection handling with `useIAP`
- Loading states for connection and products

### 2. Product Loading

- Loading both products and subscriptions
- Error handling for failed product fetches

### 3. Purchase Flow

- Initiating purchases with `requestPurchase`
- Handling purchase updates and errors
- Proper transaction finishing

### 4. Receipt Validation

- Server-side receipt validation (placeholder implementation)
- Error handling for validation failures

### 5. User Experience

- Visual feedback for purchase states
- Appropriate error messages
- Loading indicators

## Usage

```tsx
import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import Store from './Store';

export default function App() {
  return (
    <NavigationContainer>
      <Store />
    </NavigationContainer>
  );
}
```

## Customization

You can customize this example by:

1. **Styling**: Modify the `styles` object to match your app's design
2. **Product IDs**: Update `PRODUCT_IDS` and `SUBSCRIPTION_IDS` with your actual product IDs
3. **Validation**: Implement proper server-side receipt validation
4. **Error Handling**: Add more specific error handling for your use case
5. **Features**: Add features like purchase restoration, subscription management, etc.

## Next Steps

- Implement proper [receipt validation](../guides/purchases#purchase-flow-best-practices)
- Add [purchase restoration](../guides/purchases#purchase-restoration)
- Handle [subscription management](../api/methods/core-methods#deeplinktosubscriptions)
- Add comprehensive [error handling](../guides/troubleshooting)
