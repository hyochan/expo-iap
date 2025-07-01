---
title: Subscription Management
sidebar_label: Subscriptions
sidebar_position: 2
---

import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# Subscription Management Example

<AdFitTopFixed />

This example demonstrates how to implement subscription management with expo-iap, including subscription status checking, renewal handling, and subscription management UI.

## Complete Subscription Manager

```tsx
import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {useIAP} from 'expo-iap';

// Subscription product IDs
const SUBSCRIPTION_SKUS = [
  'com.yourapp.premium_monthly',
  'com.yourapp.premium_yearly',
];

interface SubscriptionStatus {
  isActive: boolean;
  productId?: string;
  expirationDate?: Date;
  autoRenewing?: boolean;
  inGracePeriod?: boolean;
}

export default function SubscriptionManager() {
  const {
    connected,
    subscriptions,
    currentPurchase,
    currentPurchaseError,
    getSubscriptions,
    getAvailablePurchases,
    requestPurchase,
    finishTransaction,
  } = useIAP();

  const [loading, setLoading] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus>({
      isActive: false,
    });

  // Initialize and load subscriptions
  useEffect(() => {
    if (connected) {
      loadSubscriptions();
      checkSubscriptionStatus();
    }
  }, [connected]);

  // Handle subscription purchases
  useEffect(() => {
    if (currentPurchase) {
      handleSubscriptionPurchase(currentPurchase);
    }
  }, [currentPurchase]);

  // Handle purchase errors
  useEffect(() => {
    if (currentPurchaseError) {
      handlePurchaseError(currentPurchaseError);
    }
  }, [currentPurchaseError]);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      await getSubscriptions({skus: SUBSCRIPTION_SKUS});
      console.log('Subscriptions loaded');
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
      Alert.alert('Error', 'Failed to load subscription options');
    } finally {
      setLoading(false);
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      const purchases = await getAvailablePurchases();
      const activeSubscription = findActiveSubscription(purchases);

      if (activeSubscription) {
        const status = await validateSubscriptionStatus(activeSubscription);
        setSubscriptionStatus(status);
      } else {
        setSubscriptionStatus({isActive: false});
      }
    } catch (error) {
      console.error('Failed to check subscription status:', error);
    }
  };

  const findActiveSubscription = (purchases) => {
    return purchases.find((purchase) =>
      SUBSCRIPTION_SKUS.includes(purchase.productId),
    );
  };

  const validateSubscriptionStatus = async (purchase) => {
    try {
      // Validate subscription on your server
      const response = await fetch(
        'https://your-server.com/validate-subscription',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            receipt: purchase.transactionReceipt,
            productId: purchase.productId,
            // Platform-specific fields
            purchaseToken: purchase.purchaseToken, // Android
            transactionId: purchase.transactionId, // iOS
          }),
        },
      );

      const result = await response.json();

      return {
        isActive: result.isActive,
        productId: purchase.productId,
        expirationDate: new Date(result.expirationDate),
        autoRenewing: result.autoRenewing,
        inGracePeriod: result.inGracePeriod,
      };
    } catch (error) {
      console.error('Subscription validation error:', error);
      return {isActive: false};
    }
  };

  const handleSubscriptionPurchase = async (purchase) => {
    try {
      console.log('Processing subscription purchase:', purchase.productId);

      // Validate the subscription purchase
      const subscriptionInfo = await validateSubscriptionStatus(purchase);

      if (subscriptionInfo.isActive) {
        // Grant subscription benefits
        await grantSubscriptionBenefits(purchase);

        // Update local status
        setSubscriptionStatus(subscriptionInfo);

        // Finish the transaction
        await finishTransaction({purchase});

        Alert.alert(
          'Subscription Activated',
          `Welcome to Premium! Your subscription is now active.`,
        );
      } else {
        Alert.alert('Error', 'Subscription validation failed');
      }
    } catch (error) {
      console.error('Error processing subscription:', error);
      Alert.alert('Error', 'Failed to activate subscription');
    }
  };

  const handlePurchaseError = (error) => {
    console.error('Subscription purchase error:', error);

    switch (error.code) {
      case 'E_USER_CANCELLED':
        // User cancelled - no action needed
        break;
      case 'E_ALREADY_OWNED':
        Alert.alert(
          'Already Subscribed',
          'You already have an active subscription. Check your subscription status.',
        );
        checkSubscriptionStatus(); // Refresh status
        break;
      default:
        Alert.alert(
          'Subscription Failed',
          error.message || 'Unknown error occurred',
        );
        break;
    }
  };

  const grantSubscriptionBenefits = async (purchase) => {
    try {
      // Grant subscription benefits on your server
      await fetch('https://your-server.com/grant-subscription', {
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

      console.log('Subscription benefits granted');
    } catch (error) {
      console.error('Failed to grant subscription benefits:', error);
      throw error;
    }
  };

  const purchaseSubscription = async (productId) => {
    if (!connected) {
      Alert.alert('Error', 'Store is not connected');
      return;
    }

    try {
      console.log('Requesting subscription:', productId);
      await requestPurchase({sku: productId});
    } catch (error) {
      console.error('Subscription request failed:', error);
      Alert.alert('Error', 'Failed to start subscription purchase');
    }
  };

  const openSubscriptionManagement = () => {
    import('expo-iap').then(({deepLinkToSubscriptions}) => {
      deepLinkToSubscriptions();
    });
  };

  const restoreSubscriptions = async () => {
    try {
      setLoading(true);
      await checkSubscriptionStatus();
      Alert.alert('Restore Complete', 'Subscription status has been updated');
    } catch (error) {
      Alert.alert('Error', 'Failed to restore subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderSubscriptionStatus = () => {
    if (subscriptionStatus.isActive) {
      return (
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Premium Active</Text>
          <Text style={styles.statusSubtitle}>
            Your premium subscription is active
          </Text>

          {subscriptionStatus.expirationDate && (
            <Text style={styles.statusDetail}>
              {subscriptionStatus.autoRenewing ? 'Renews' : 'Expires'} on{' '}
              {formatDate(subscriptionStatus.expirationDate)}
            </Text>
          )}

          {subscriptionStatus.inGracePeriod && (
            <Text style={styles.warningText}>
              Your subscription is in grace period. Please update your payment
              method.
            </Text>
          )}

          <TouchableOpacity
            style={styles.manageButton}
            onPress={openSubscriptionManagement}
          >
            <Text style={styles.manageButtonText}>Manage Subscription</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>No Active Subscription</Text>
        <Text style={styles.statusSubtitle}>
          Subscribe to unlock premium features
        </Text>
      </View>
    );
  };

  const renderSubscriptionOption = (subscription) => {
    const isYearly = subscription.productId.includes('yearly');
    const savings = isYearly ? '2 months free!' : null;

    return (
      <View key={subscription.productId} style={styles.subscriptionCard}>
        <View style={styles.subscriptionInfo}>
          <Text style={styles.subscriptionTitle}>
            {isYearly ? 'Yearly Premium' : 'Monthly Premium'}
          </Text>
          <Text style={styles.subscriptionPrice}>
            {subscription.localizedPrice}
          </Text>
          {subscription.subscriptionPeriod && (
            <Text style={styles.subscriptionPeriod}>
              per {subscription.subscriptionPeriod}
            </Text>
          )}
          {savings && <Text style={styles.savingsText}>{savings}</Text>}
        </View>

        <TouchableOpacity
          style={[styles.subscribeButton, isYearly && styles.yearlyButton]}
          onPress={() => purchaseSubscription(subscription.productId)}
          disabled={loading || subscriptionStatus.isActive}
        >
          <Text style={styles.subscribeButtonText}>
            {subscriptionStatus.isActive ? 'Active' : 'Subscribe'}
          </Text>
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

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Subscription Management</Text>

      {renderSubscriptionStatus()}

      <Text style={styles.sectionTitle}>Subscription Options</Text>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading subscriptions...</Text>
        </View>
      ) : (
        <View>{subscriptions.map(renderSubscriptionOption)}</View>
      )}

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={restoreSubscriptions}
          disabled={loading}
        >
          <Text style={styles.restoreButtonText}>Restore Purchases</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Subscriptions auto-renew unless cancelled. You can manage your
          subscriptions in your device settings.
        </Text>
      </View>
    </ScrollView>
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
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
    color: '#333',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 16,
    color: '#333',
  },
  statusCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  statusSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  statusDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#ff9800',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  manageButton: {
    backgroundColor: '#2196f3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  manageButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  subscriptionCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  subscriptionPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196f3',
    marginBottom: 4,
  },
  subscriptionPeriod: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  savingsText: {
    fontSize: 14,
    color: '#4caf50',
    fontWeight: 'bold',
  },
  subscribeButton: {
    backgroundColor: '#2196f3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
  },
  yearlyButton: {
    backgroundColor: '#ff9800',
  },
  subscribeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  actionButtons: {
    marginTop: 32,
    alignItems: 'center',
  },
  restoreButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2196f3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  restoreButtonText: {
    color: '#2196f3',
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 32,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
});
```

## Key Features

### 1. Subscription Status Tracking

- Real-time subscription status validation
- Grace period handling
- Auto-renewal status

### 2. Multiple Subscription Tiers

- Monthly and yearly options
- Pricing display with savings indicators
- Visual differentiation for different tiers

### 3. Subscription Management

- Direct links to platform subscription management
- Purchase restoration
- Status refresh capabilities

### 4. Server Integration

- Server-side subscription validation
- Benefit granting system
- Status synchronization

## Server-Side Implementation

### Subscription Validation Endpoint

```javascript
// Example Node.js/Express endpoint
app.post('/validate-subscription', async (req, res) => {
  const {receipt, productId, purchaseToken, transactionId} = req.body;

  try {
    let validationResult;

    if (purchaseToken) {
      // Android - Google Play Billing validation
      validationResult = await validateGooglePlaySubscription(
        productId,
        purchaseToken,
      );
    } else {
      // iOS - App Store validation
      validationResult = await validateAppStoreReceipt(receipt);
    }

    res.json({
      isActive: validationResult.isActive,
      expirationDate: validationResult.expirationDate,
      autoRenewing: validationResult.autoRenewing,
      inGracePeriod: validationResult.inGracePeriod,
    });
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({error: 'Validation failed'});
  }
});
```

## Usage

```tsx
import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import SubscriptionManager from './SubscriptionManager';

export default function App() {
  return (
    <NavigationContainer>
      <SubscriptionManager />
    </NavigationContainer>
  );
}
```

## Best Practices Demonstrated

1. **Status Validation**: Always validate subscription status server-side
2. **Grace Period Handling**: Handle billing issues gracefully
3. **User Experience**: Provide clear subscription status and management options
4. **Error Handling**: Comprehensive error handling for various scenarios
5. **Platform Integration**: Use platform-specific subscription management tools

## Customization

You can extend this example with:

- Multiple subscription tiers
- Promotional offers and trials
- Family sharing support
- Subscription analytics
- Custom subscription management UI
