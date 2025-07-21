import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import {requestPurchase, useIAP} from '../../src';
import type {SubscriptionProduct, PurchaseError} from '../../src/ExpoIap.types';

/**
 * Subscription Flow Example - Subscription Products
 *
 * Demonstrates useIAP hook approach for subscriptions:
 * - Uses useIAP hook for subscription management
 * - Handles subscription callbacks with proper types
 * - No manual promise handling required
 * - Clean success/error pattern through hooks
 * - Focused on recurring subscriptions
 */
export default function SubscriptionFlow() {
  const [purchaseResult, setPurchaseResult] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Use the useIAP hook for managing subscriptions
  const {connected, subscriptions, getSubscriptions} = useIAP({
    onPurchaseSuccess: (purchase) => {
      console.log('Subscription successful:', purchase);
      setIsProcessing(false);

      // Handle successful subscription
      setPurchaseResult(
        `✅ Subscription successful (${purchase.platform})\n` +
          `Product: ${purchase.id}\n` +
          `Transaction ID: ${purchase.transactionId || 'N/A'}\n` +
          `Date: ${new Date(purchase.transactionDate).toLocaleDateString()}\n` +
          `Receipt: ${purchase.transactionReceipt?.substring(0, 50)}...`,
      );

      Alert.alert('Success', 'Subscription activated successfully!');
    },
    onPurchaseError: (error: PurchaseError) => {
      console.error('Subscription failed:', error);
      setIsProcessing(false);

      // Handle subscription error
      setPurchaseResult(`❌ Subscription failed: ${error.message}`);
      Alert.alert('Subscription Failed', error.message);
    },
    onSyncError: (error: Error) => {
      console.warn('Sync error:', error);
      Alert.alert(
        'Sync Error',
        `Failed to sync subscriptions: ${error.message}`,
      );
    },
  });

  // Load subscriptions when component mounts
  useEffect(() => {
    if (connected) {
      const subscriptionIds = [
        'com.example.premium_monthly',
        'com.example.premium_yearly',
        'com.example.pro_subscription',
      ];
      getSubscriptions(subscriptionIds);
    }
  }, [connected, getSubscriptions]);

  const handleSubscription = async (itemId: string) => {
    try {
      setIsProcessing(true);
      setPurchaseResult('Processing subscription...');

      // Use requestPurchase for subscriptions - the result will be handled by callbacks
      await requestPurchase({
        request:
          Platform.OS === 'ios'
            ? {sku: itemId, appAccountToken: 'user-123'}
            : {skus: [itemId], subscriptionOffers: []},
        type: 'subs',
      });
    } catch (error) {
      setIsProcessing(false);
      const errorMessage =
        error instanceof Error ? error.message : 'Subscription failed';
      setPurchaseResult(`❌ Subscription failed: ${errorMessage}`);
      Alert.alert('Subscription Failed', errorMessage);
    }
  };

  const retryLoadSubscriptions = () => {
    const subscriptionIds = [
      'com.example.premium_monthly',
      'com.example.premium_yearly',
      'com.example.pro_subscription',
    ];
    getSubscriptions(subscriptionIds);
  };

  const getSubscriptionDisplayPrice = (
    subscription: SubscriptionProduct,
  ): string => {
    if (subscription.platform === 'android') {
      // Android subscription pricing structure
      const offers = subscription.subscriptionOfferDetails;
      if (offers && offers.length > 0) {
        const pricingPhases = offers[0].pricingPhases;
        if (pricingPhases && pricingPhases.pricingPhaseList.length > 0) {
          return pricingPhases.pricingPhaseList[0].formattedPrice;
        }
      }
      return subscription.displayPrice;
    } else {
      // iOS subscription pricing
      return subscription.displayPrice;
    }
  };

  const getSubscriptionPeriod = (subscription: SubscriptionProduct): string => {
    if (subscription.platform === 'android') {
      const offers = subscription.subscriptionOfferDetails;
      if (offers && offers.length > 0) {
        const pricingPhases = offers[0].pricingPhases;
        if (pricingPhases && pricingPhases.pricingPhaseList.length > 0) {
          return pricingPhases.pricingPhaseList[0].billingPeriod || 'Unknown';
        }
      }
      return 'Unknown';
    } else {
      return subscription.subscription?.subscriptionPeriod?.unit || 'Unknown';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Subscription Flow</Text>
        <Text style={styles.subtitle}>
          TypeScript-first approach for subscriptions
        </Text>
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            Store: {connected ? '✅ Connected' : '❌ Disconnected'}
          </Text>
          <Text style={styles.statusText}>
            Platform: {Platform.OS === 'ios' ? '🍎 iOS' : '🤖 Android'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Available Subscriptions</Text>
        {!connected ? (
          <Text style={styles.loadingText}>Connecting to store...</Text>
        ) : subscriptions.length > 0 ? (
          subscriptions.map((subscription) => (
            <View key={subscription.id} style={styles.subscriptionCard}>
              <View style={styles.subscriptionInfo}>
                <Text style={styles.subscriptionTitle}>
                  {subscription.title}
                </Text>
                <Text style={styles.subscriptionDescription}>
                  {subscription.description}
                </Text>
                <View style={styles.subscriptionDetails}>
                  <Text style={styles.subscriptionPrice}>
                    {getSubscriptionDisplayPrice(subscription)}
                  </Text>
                  <Text style={styles.subscriptionPeriod}>
                    per {getSubscriptionPeriod(subscription)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.subscribeButton,
                  isProcessing && styles.disabledButton,
                ]}
                onPress={() => handleSubscription(subscription.id)}
                disabled={isProcessing || !connected}
              >
                <Text style={styles.subscribeButtonText}>
                  {isProcessing ? 'Processing...' : 'Subscribe'}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.noSubscriptionsCard}>
            <Text style={styles.noSubscriptionsText}>
              No subscriptions found. Make sure to configure your subscription
              IDs in your app store.
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={retryLoadSubscriptions}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {purchaseResult ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Result</Text>
          <View style={styles.resultCard}>
            <Text style={styles.resultText}>{purchaseResult}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>🔄 Key Features Demonstrated</Text>
        <Text style={styles.infoText}>
          • Automatic TypeScript type inference{'\n'}• Platform-agnostic
          subscription handling{'\n'}• No manual type casting required{'\n'}•
          Subscription-specific pricing display{'\n'}• Auto-renewal state
          management
          {'\n'}• CPK React Native compliance
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    padding: 20,
  },
  subscriptionCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  subscriptionInfo: {
    flex: 1,
    marginRight: 15,
  },
  subscriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  subscriptionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  subscriptionDetails: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  subscriptionPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745',
  },
  subscriptionPeriod: {
    fontSize: 12,
    color: '#666',
  },
  subscribeButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  subscribeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  noSubscriptionsCard: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
  },
  noSubscriptionsText: {
    textAlign: 'center',
    color: '#856404',
    marginBottom: 15,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#ffc107',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#212529',
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  resultText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 20,
    color: '#333',
  },
  infoSection: {
    padding: 20,
    backgroundColor: '#f0f8ff',
    margin: 20,
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#0066cc',
  },
  infoText: {
    fontSize: 14,
    color: '#0066cc',
    lineHeight: 20,
  },
});
