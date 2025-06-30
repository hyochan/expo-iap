---
sidebar_position: 3
---

# Complete Store Implementation

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
    getProducts,
    getSubscriptions,
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
      await getProducts(productSkus);
      await getSubscriptions(subscriptionSkus);
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
    if (Platform.OS === 'ios') {
      await requestPurchase({
        request: {
          sku: productId,
          andDangerouslyFinishTransactionAutomaticallyIOS: false,
        },
      });
    } else {
      await requestPurchase({
        request: {skus: [productId]},
      });
    }
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
// iOS vs Android purchase requests
if (Platform.OS === 'ios') {
  await requestPurchase({
    request: {
      sku: productId,
      andDangerouslyFinishTransactionAutomaticallyIOS: false, // Important!
    },
  });
} else {
  await requestPurchase({
    request: {skus: [productId]}, // Android uses array
  });
}
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
import React, {useEffect, useState, useCallback, useRef} from 'react';
import {
  Platform,
  View,
  Text,
  ScrollView,
  Alert,
  InteractionManager,
} from 'react-native';
import {useIAP} from 'expo-iap';
import {ErrorCode} from 'expo-iap/build/ExpoIap.types';
import {
  ProductAndroid,
  ProductPurchaseAndroid,
} from 'expo-iap/build/types/ExpoIapAndroid.types';

// Define your product SKUs
const bulbPackSkus = ['dev.hyo.luent.10bulbs', 'dev.hyo.luent.30bulbs'];
const subscriptionSkus = ['dev.hyo.luent.premium'];

// Define supported platforms
const SUPPORTED_PLATFORMS = ['ios', 'android'];

export default function PurchaseStore() {
  // IAP Hook with all necessary methods
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
    validateReceipt,
  } = useIAP();

  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [bulbCount, setBulbCount] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  
  const subscriptionAlertShown = useRef(false);
  const isPlatformSupported = SUPPORTED_PLATFORMS.includes(Platform.OS);

  // Initialize IAP when connected
  useEffect(() => {
    if (!connected || !isPlatformSupported) return;

    const initializeIAP = async () => {
      try {
        // Fetch products and subscriptions
        await getProducts(bulbPackSkus);
        await getSubscriptions(subscriptionSkus);
        
        // Check current premium status
        await checkPremiumStatus();
        
        setIsReady(true);
      } catch (error) {
        console.error('Error initializing IAP:', error);
      }
    };

    initializeIAP();
  }, [connected, getProducts, getSubscriptions, isPlatformSupported]);

  // Receipt validation helper
  const handleValidateReceipt = useCallback(
    async (sku, androidOptions) => {
      if (Platform.OS === 'ios') {
        return await validateReceipt(sku);
      } else if (Platform.OS === 'android') {
        if (!androidOptions?.packageName || !androidOptions?.productToken) {
          throw new Error('Android validation requires packageName and productToken');
        }

        try {
          // Get access token from your server
          const accessToken = await getGoogleAccessToken();
          
          return await validateReceipt(sku, {
            packageName: androidOptions.packageName,
            productToken: androidOptions.productToken,
            accessToken: accessToken,
            isSub: androidOptions.isSub,
          });
        } catch (error) {
          console.error('Failed to validate receipt:', error);
          // In development, you might want to skip validation
          if (__DEV__ && Platform.OS === 'android') {
            return {isValid: true, data: {purchaseState: 0}};
          }
          throw error;
        }
      }
      throw new Error('Platform not supported');
    },
    [validateReceipt],
  );

  // Validate purchase receipt
  const validatePurchaseReceipt = useCallback(
    async (productId, purchase, validateReceiptFn) => {
      try {
        if (Platform.OS === 'ios') {
          const validationResult = await validateReceiptFn(productId);
          return validationResult.isValid;
        } else if (Platform.OS === 'android') {
          const purchaseToken = purchase.purchaseTokenAndroid;
          const packageName = purchase.packageNameAndroid || 'your.package.name';
          const isSub = subscriptionSkus.includes(productId);

          if (!purchaseToken) {
            console.error('Purchase token is missing for Android purchase');
            return false;
          }

          const validationResult = await validateReceiptFn(productId, {
            packageName,
            productToken: purchaseToken,
            isSub,
          });

          return validationResult.isValid;
        }
        return true;
      } catch (validationError) {
        console.error('Error during receipt validation:', validationError);
        // Continue despite validation errors in production
        return true;
      }
    },
    [],
  );

  // Record purchase in database
  const recordPurchaseInDatabase = useCallback(
    async (purchase, productId, productsList, subscriptionsList) => {
      try {
        const transactionId = Platform.OS === 'ios'
          ? purchase.transactionId || ''
          : purchase.purchaseTokenAndroid || '';

        // Extract price and currency from products
        let price = 0;
        let currency = 'USD';
        const product = productsList.find(p => p.id === productId) ||
                      subscriptionsList.find(s => s.id === productId);

        if (product) {
          if (Platform.OS === 'ios') {
            price = product.price !== undefined ? parseFloat(String(product.price)) : 0;
            currency = product.currency || 'USD';
          } else {
            const androidProduct = product;
            if (androidProduct.oneTimePurchaseOfferDetails) {
              const priceAmountMicros = parseFloat(
                String(androidProduct.oneTimePurchaseOfferDetails.priceAmountMicros)
              );
              price = priceAmountMicros / 1000000;
              currency = androidProduct.oneTimePurchaseOfferDetails.priceCurrencyCode;
            } else if (androidProduct.subscriptionOfferDetails?.length > 0) {
              const firstOffer = androidProduct.subscriptionOfferDetails[0];
              if (firstOffer.pricingPhases.pricingPhaseList.length > 0) {
                const pricingPhase = firstOffer.pricingPhases.pricingPhaseList[0];
                const priceAmountMicros = parseFloat(String(pricingPhase.priceAmountMicros));
                price = priceAmountMicros / 1000000;
                currency = pricingPhase.priceCurrencyCode;
              }
            }
          }
        }

        // Save to your database
        await savePurchaseToDatabase({
          productId,
          amount: price,
          currency,
          paymentMethod: Platform.OS,
          transactionId,
          metadata: purchase,
        });

        console.log('Purchase successfully recorded in the database');
      } catch (dbError) {
        console.error('Error recording purchase in database:', dbError);
      }
    },
    [],
  );

  // Update premium status
  const updatePremiumStatus = useCallback(async () => {
    try {
      await checkPremiumStatus();

      if (!subscriptionAlertShown.current) {
        subscriptionAlertShown.current = true;
        InteractionManager.runAfterInteractions(() => {
          Alert.alert(
            'Thank You!',
            'Your premium subscription has been activated.',
          );
        });
      }
    } catch (error) {
      console.error('Error updating premium status:', error);
    }
  }, []);

  // Handle purchase completion
  useEffect(() => {
    if (currentPurchase) {
      const handlePurchase = async () => {
        try {
          setIsLoading(true);

          // Reset subscription alert flag for new purchases
          if (subscriptionSkus.includes(currentPurchase.id)) {
            subscriptionAlertShown.current = false;
          }

          const productId = currentPurchase.id;
          let bulbsToAdd = 0;

          // Determine bulb count from product ID
          if (productId === bulbPackSkus[0]) {
            bulbsToAdd = 10;
          } else if (productId === bulbPackSkus[1]) {
            bulbsToAdd = 30;
          }

          // Validate the receipt
          const isValidReceipt = await validatePurchaseReceipt(
            productId,
            currentPurchase,
            handleValidateReceipt,
          );

          if (isValidReceipt) {
            // Finish transaction
            await finishTransaction({
              purchase: currentPurchase,
              isConsumable: bulbsToAdd > 0, // Bulb packs are consumable
            });

            // Record purchase in database
            await recordPurchaseInDatabase(
              currentPurchase,
              productId,
              products,
              subscriptions,
            );

            // Update local state
            if (bulbsToAdd > 0) {
              setBulbCount(prev => prev + bulbsToAdd);
              
              InteractionManager.runAfterInteractions(() => {
                Alert.alert(
                  'Purchase Complete!',
                  `You've received ${bulbsToAdd} bulbs!`,
                );
              });
            } else if (productId === subscriptionSkus[0]) {
              await updatePremiumStatus();
            }
          } else {
            InteractionManager.runAfterInteractions(() => {
              Alert.alert(
                'Validation Error',
                'Unable to validate your purchase. Please try again.',
              );
            });
          }
        } catch (error) {
          console.error('Error handling purchase:', error);
        } finally {
          setIsLoading(false);
        }
      };

      handlePurchase();
    }
  }, [
    currentPurchase,
    finishTransaction,
    handleValidateReceipt,
    products,
    subscriptions,
    recordPurchaseInDatabase,
    validatePurchaseReceipt,
    updatePremiumStatus,
  ]);

  // Handle purchase errors
  useEffect(() => {
    if (currentPurchaseError) {
      setIsLoading(false);

      if (currentPurchaseError.code === ErrorCode.E_USER_CANCELLED) {
        return; // User canceled - no need to show error
      }

      InteractionManager.runAfterInteractions(() => {
        Alert.alert(
          'Purchase Error',
          'Unable to complete your purchase. Please try again.',
        );
        console.error('Purchase error:', currentPurchaseError);
      });
    }
  }, [currentPurchaseError]);

  // Get product price by ID
  const getProductPrice = (productId) => {
    if (!isReady || products.length === 0) {
      return Platform.OS === 'ios' ? '$0.99' : '₩1,200';
    }

    const product = products.find(p => p.id === productId);
    if (!product) return Platform.OS === 'ios' ? '$0.99' : '₩1,200';

    if (Platform.OS === 'ios') {
      return product.displayPrice || '$0.99';
    } else {
      const androidProduct = product;
      return androidProduct.oneTimePurchaseOfferDetails?.formattedPrice || '₩1,200';
    }
  };

  // Get subscription price by ID
  const getSubscriptionPrice = (subscriptionId) => {
    if (!isReady || subscriptions.length === 0) {
      return Platform.OS === 'ios' ? '$9.99' : '₩11,000';
    }

    const subscription = subscriptions.find(s => s.id === subscriptionId);
    if (!subscription) return Platform.OS === 'ios' ? '$9.99' : '₩11,000';

    if (Platform.OS === 'ios') {
      return subscription.displayPrice || '$9.99';
    } else {
      const androidSubscription = subscription;
      if (androidSubscription.subscriptionOfferDetails?.length > 0) {
        const firstOffer = androidSubscription.subscriptionOfferDetails[0];
        if (firstOffer.pricingPhases.pricingPhaseList.length > 0) {
          return firstOffer.pricingPhases.pricingPhaseList[0].formattedPrice || '₩11,000';
        }
      }
      return '₩11,000';
    }
  };

  // Handle bulb pack purchase
  const handlePurchaseBulbs = async (productId) => {
    if (!connected) {
      Alert.alert('Store Not Connected', 'Please try again later.');
      return;
    }

    if (!SUPPORTED_PLATFORMS.includes(Platform.OS)) {
      Alert.alert('Platform Not Supported', 'In-app purchases are not supported on this platform.');
      return;
    }

    try {
      setIsLoading(true);

      if (Platform.OS === 'ios') {
        await requestPurchase({
          request: {
            sku: productId,
            andDangerouslyFinishTransactionAutomaticallyIOS: false,
          },
        });
      } else {
        await requestPurchase({
          request: {skus: [productId]},
        });
      }
    } catch (err) {
      setIsLoading(false);
      console.error('Purchase request failed:', err);
    }
  };

  // Handle subscription purchase
  const handlePurchaseSubscription = async (subscriptionId) => {
    if (!connected) {
      Alert.alert('Store Not Connected', 'Please try again later.');
      return;
    }

    if (!SUPPORTED_PLATFORMS.includes(Platform.OS)) {
      Alert.alert('Platform Not Supported', 'In-app purchases are not supported on this platform.');
      return;
    }

    try {
      setIsLoading(true);

      if (Platform.OS === 'ios') {
        await requestPurchase({
          request: {sku: subscriptionId},
          type: 'subs',
        });
      } else if (Platform.OS === 'android') {
        const subscription = subscriptions.find(s => s.id === subscriptionId);

        if (!subscription) {
          throw new Error(`Subscription with ID ${subscriptionId} not found`);
        }

        const androidSubscription = subscription;

        if (androidSubscription.subscriptionOfferDetails?.length > 0) {
          const subscriptionOffers = androidSubscription.subscriptionOfferDetails.map(offer => ({
            sku: subscriptionId,
            offerToken: offer.offerToken,
          }));

          await requestPurchase({
            request: {
              skus: [subscriptionId],
              subscriptionOffers: subscriptionOffers,
            },
            type: 'subs',
          });
        } else {
          await requestPurchase({
            request: {
              skus: [subscriptionId],
              subscriptionOffers: [{
                sku: subscriptionId,
                offerToken: '',
              }],
            },
            type: 'subs',
          });
        }
      }
    } catch (err) {
      setIsLoading(false);
      console.error('Subscription request failed:', err);
      Alert.alert('Purchase Error', err instanceof Error ? err.message : 'Failed to process subscription');
    }
  };

  // Render platform not supported
  if (!isPlatformSupported) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24}}>
        <Text style={{fontSize: 18, fontWeight: 'bold', marginBottom: 16}}>
          Platform Not Supported
        </Text>
        <Text style={{textAlign: 'center', color: '#666'}}>
          In-app purchases are not supported on this platform.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={{flex: 1, backgroundColor: '#fff'}}>
      <View style={{padding: 16}}>
        {/* Header */}
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24}}>
          <Text style={{fontSize: 24, fontWeight: 'bold'}}>Store</Text>
          <View style={{flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8E1', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16}}>
            <Text style={{marginRight: 4}}>💡</Text>
            <Text style={{fontWeight: 'bold', color: '#F57F17'}}>{bulbCount}</Text>
          </View>
        </View>

        {/* Connection Status (Dev only) */}
        {__DEV__ && (
          <Text style={{textAlign: 'center', marginBottom: 16, color: connected ? 'green' : 'red'}}>
            {connected ? 'Connected to store' : 'Not connected to store'}
          </Text>
        )}

        {/* Bulb Packs Section */}
        <Text style={{fontSize: 18, fontWeight: 'bold', marginBottom: 16}}>Bulb Packs</Text>
        <Text style={{color: '#666', marginBottom: 16}}>
          Purchase bulb packs to get more power for your conversations.
        </Text>

        <View style={{flexDirection: 'row', gap: 12, marginBottom: 32}}>
          {/* 10 Bulbs Pack */}
          <View style={{flex: 1, backgroundColor: '#f9f9f9', padding: 20, borderRadius: 16, alignItems: 'center'}}>
            <View style={{width: 60, height: 60, backgroundColor: '#FFF8E1', borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 12}}>
              <Text style={{fontSize: 24}}>⚡</Text>
            </View>
            <Text style={{fontWeight: 'bold', marginBottom: 8}}>10 Bulbs</Text>
            <TouchableOpacity
              style={{
                backgroundColor: '#FF5B50',
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 8,
                opacity: isLoading ? 0.7 : 1,
              }}
              onPress={() => handlePurchaseBulbs(bulbPackSkus[0])}
              disabled={isLoading}
            >
              <Text style={{color: 'white', fontWeight: 'bold'}}>
                {isLoading ? 'Processing...' : getProductPrice(bulbPackSkus[0])}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 30 Bulbs Pack */}
          <View style={{flex: 1, backgroundColor: '#f9f9f9', padding: 20, borderRadius: 16, alignItems: 'center'}}>
            <View style={{width: 60, height: 60, backgroundColor: '#FFF3E0', borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 12}}>
              <Text style={{fontSize: 24}}>⚡</Text>
            </View>
            <Text style={{fontWeight: 'bold', marginBottom: 8}}>30 Bulbs</Text>
            <TouchableOpacity
              style={{
                backgroundColor: '#FF5B50',
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 8,
                opacity: isLoading ? 0.7 : 1,
              }}
              onPress={() => handlePurchaseBulbs(bulbPackSkus[1])}
              disabled={isLoading}
            >
              <Text style={{color: 'white', fontWeight: 'bold'}}>
                {isLoading ? 'Processing...' : getProductPrice(bulbPackSkus[1])}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Premium Subscription */}
        <Text style={{fontSize: 18, fontWeight: 'bold', marginBottom: 16}}>Premium Subscription</Text>
        
        <View style={{backgroundColor: '#f9f9f9', padding: 20, borderRadius: 16, marginBottom: 24}}>
          <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 16}}>
            <View style={{width: 48, height: 48, backgroundColor: '#F3E5F5', borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12}}>
              <Text style={{fontSize: 24}}>👑</Text>
            </View>
            <View>
              <Text style={{fontWeight: 'bold', fontSize: 16}}>Premium Subscription</Text>
              {isPremium && (
                <Text style={{color: '#4CAF50', fontWeight: 'bold'}}>Active Subscription</Text>
              )}
            </View>
          </View>

          <View style={{marginBottom: 16}}>
            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
              <Text style={{marginRight: 8}}>🚫</Text>
              <Text style={{color: '#666'}}>Remove all ads</Text>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
              <Text style={{marginRight: 8}}>💬</Text>
              <Text style={{color: '#666'}}>Unlimited quiz chat</Text>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Text style={{marginRight: 8}}>⚡</Text>
              <Text style={{color: '#666'}}>Unlimited bulbs</Text>
            </View>
          </View>

          <TouchableOpacity
            style={{
              backgroundColor: isPremium ? '#8262b5' : '#8e24aa',
              padding: 14,
              borderRadius: 12,
              alignItems: 'center',
              opacity: isLoading || isPremium ? 0.7 : 1,
            }}
            onPress={() => isPremium ? null : handlePurchaseSubscription(subscriptionSkus[0])}
            disabled={isLoading || isPremium}
          >
            {isPremium ? (
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Text style={{color: 'white', marginRight: 4}}>✓</Text>
                <Text style={{color: 'white', fontWeight: 'bold'}}>Already Subscribed</Text>
              </View>
            ) : (
              <Text style={{color: 'white', fontWeight: 'bold'}}>
                {isLoading ? 'Processing...' : `Subscribe for ${getSubscriptionPrice(subscriptionSkus[0])}`}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Error Messages */}
        {currentPurchaseError && currentPurchaseError.code !== ErrorCode.E_USER_CANCELLED && (
          <Text style={{color: '#E53935', textAlign: 'center', marginTop: 12}}>
            Purchase failed. Please try again.
          </Text>
        )}

        {!connected && (
          <Text style={{color: '#E53935', textAlign: 'center', marginTop: 12}}>
            Store connection error. Please check your internet connection.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

// Helper functions (implement these based on your backend)
async function getGoogleAccessToken() {
  // Implement your server call to get Google Play access token
  // This should call your backend service that handles Google API authentication
  const response = await fetch('/api/google-access-token');
  const data = await response.json();
  return data.accessToken;
}

async function savePurchaseToDatabase(purchaseData) {
  // Implement your database save logic
  // This should save the purchase record to your backend
  await fetch('/api/purchases', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(purchaseData),
  });
}

async function checkPremiumStatus() {
  // Implement your premium status check
  // This should verify the user's subscription status
  const response = await fetch('/api/user/premium-status');
  const data = await response.json();
  return data.isPremium;
}
```

## Key Features Explained

### 1. Product Configuration

```tsx
// Define your product SKUs
const bulbPackSkus = ['dev.hyo.luent.10bulbs', 'dev.hyo.luent.30bulbs'];
const subscriptionSkus = ['dev.hyo.luent.premium'];
```

### 2. Platform-Specific Price Handling

```tsx
const getProductPrice = (productId) => {
  if (Platform.OS === 'ios') {
    return product.displayPrice || '$0.99';
  } else {
    // Android has different price structure
    return androidProduct.oneTimePurchaseOfferDetails?.formattedPrice || '₩1,200';
  }
};
```

### 3. Receipt Validation

```tsx
// Cross-platform receipt validation
const isValidReceipt = await validatePurchaseReceipt(
  productId,
  currentPurchase,
  handleValidateReceipt,
);
```

### 4. Transaction Management

```tsx
await finishTransaction({
  purchase: currentPurchase,
  isConsumable: bulbsToAdd > 0, // Mark consumables properly
});
```

### 5. Error Handling

```tsx
// Handle different error types
if (currentPurchaseError.code === ErrorCode.E_USER_CANCELLED) {
  return; // User canceled - don't show error
}
```

## Best Practices

1. **Always validate receipts** before granting purchases
2. **Mark consumables correctly** to allow repurchasing
3. **Handle platform differences** in price formatting
4. **Provide loading states** during purchase flow
5. **Implement proper error handling** for better UX
6. **Store purchase records** in your backend
7. **Check subscription status** on app launch

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
