import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {requestPurchase, useIAP} from '../../src';
import type {SubscriptionProduct, PurchaseError} from '../../src/ExpoIap.types';
import type {SubscriptionProductAndroid} from '../../src/types/ExpoIapAndroid.types';

/**
 * Subscription Flow Example - Subscription Products
 *
 * Demonstrates useIAP hook approach for subscriptions:
 * - Uses useIAP hook for subscription management
 * - Handles subscription callbacks with proper types
 * - No manual promise handling required
 * - Clean success/error pattern through hooks
 * - Focused on recurring subscriptions
 * 
 * New subscription status checking API:
 * - getActiveSubscriptions() - gets all active subscriptions automatically
 * - getActiveSubscriptions(['id1', 'id2']) - gets specific subscriptions
 * - activeSubscriptions state - automatically updated subscription list
 */

export default function SubscriptionFlow() {
  const [purchaseResult, setPurchaseResult] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Use the useIAP hook for managing subscriptions with built-in subscription status
  const {
    connected,
    subscriptions,
    requestProducts,
    finishTransaction,
    getActiveSubscriptions,
    activeSubscriptions,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
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

      // IMPORTANT: Server-side receipt validation should be performed here
      // Send the receipt to your backend server for validation
      // Example:
      // const isValid = await validateReceiptOnServer(purchase.transactionReceipt);
      // if (!isValid) {
      //   Alert.alert('Error', 'Receipt validation failed');
      //   return;
      // }

      // After successful server validation, finish the transaction
      // For subscriptions, isConsumable should be false (subscriptions are non-consumable)
      await finishTransaction({
        purchase,
        isConsumable: false, // Set to false for subscriptions
      });

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

  // Check subscription status using the new library API
  const checkSubscriptionStatus = useCallback(async () => {
    if (!connected) return;
    
    setIsCheckingStatus(true);
    try {
      // No need to pass subscriptionIds - it will check all active subscriptions
      const subs = await getActiveSubscriptions();
      console.log('Active subscriptions:', subs);
    } catch (error) {
      console.error('Error checking subscription status:', error);
      Alert.alert('Error', 'Failed to check subscription status');
    } finally {
      setIsCheckingStatus(false);
    }
  }, [connected, getActiveSubscriptions]);

  // Load subscriptions and check status when component mounts
  useEffect(() => {
    if (connected) {
      const subscriptionIds = [
        'dev.hyo.martie.premium', // Example subscription ID
      ];
      requestProducts({ skus: subscriptionIds, type: 'subs' });
    }
  }, [connected, requestProducts]);
  
  // Check subscription status separately to avoid infinite loop
  useEffect(() => {
    if (connected) {
      checkSubscriptionStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  const handleSubscription = async (itemId: string) => {
    try {
      setIsProcessing(true);
      setPurchaseResult('Processing subscription...');

      // Find the subscription to get offer details for Android
      const subscription = subscriptions.find(sub => sub.id === itemId);
      
      // New platform-specific API (v2.7.0+) - no Platform.OS branching needed
      await requestPurchase({
        request: {
          ios: {
            sku: itemId,
            appAccountToken: 'user-123',
          },
          android: {
            skus: [itemId],
            subscriptionOffers: subscription?.platform === 'android' 
              ? (subscription as SubscriptionProductAndroid).subscriptionOfferDetails?.map(offer => ({
                  sku: itemId,
                  offerToken: offer.offerToken,
                })) || []
              : [],
          }
        },
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
    const subscriptionIds = ['dev.hyo.martie.premium'];
    requestProducts({ skus: subscriptionIds, type: 'subs' });
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

  const getIntroductoryOffer = (
    subscription: SubscriptionProduct,
  ): string | null => {
    if (
      subscription.platform === 'ios' &&
      subscription.subscription?.introductoryOffer
    ) {
      const offer = subscription.subscription.introductoryOffer;
      switch (offer.paymentMode) {
        case 'FREETRIAL':
          return `${offer.periodCount} ${offer.period.unit.toLowerCase()}(s) free trial`;
        case 'PAYASYOUGO':
          return `${offer.displayPrice} for ${offer.periodCount} ${offer.period.unit.toLowerCase()}(s)`;
        case 'PAYUPFRONT':
          return `${offer.displayPrice} for first ${offer.periodCount} ${offer.period.unit.toLowerCase()}(s)`;
        default:
          return null;
      }
    }
    return null;
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

      {/* Subscription Status Section - Using library's activeSubscriptions */}
      {activeSubscriptions.length > 0 ? (
        <View style={[styles.section, styles.statusSection]}>
          <Text style={styles.sectionTitle}>Current Subscription Status</Text>
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Status:</Text>
              <Text style={[styles.statusValue, styles.activeStatus]}>
                ✅ Active
              </Text>
            </View>
            
            {activeSubscriptions.map((sub, index) => (
              <View key={sub.productId + index} style={styles.subscriptionStatusItem}>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Product:</Text>
                  <Text style={styles.statusValue}>{sub.productId}</Text>
                </View>
                
                {Platform.OS === 'ios' && sub.expirationDateIOS ? (
                  <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>Expires:</Text>
                    <Text style={styles.statusValue}>
                      {sub.expirationDateIOS.toLocaleDateString()}
                    </Text>
                  </View>
                ) : null}
                
                {Platform.OS === 'android' && sub.autoRenewingAndroid !== undefined ? (
                  <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>Auto-Renew:</Text>
                    <Text style={[
                      styles.statusValue,
                      sub.autoRenewingAndroid ? styles.activeStatus : styles.cancelledStatus
                    ]}>
                      {sub.autoRenewingAndroid ? '✅ Enabled' : '⚠️ Cancelled'}
                    </Text>
                  </View>
                ) : null}
                
                {sub.environmentIOS ? (
                  <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>Environment:</Text>
                    <Text style={styles.statusValue}>
                      {sub.environmentIOS}
                    </Text>
                  </View>
                ) : null}
                
                {sub.willExpireSoon ? (
                  <Text style={styles.warningText}>
                    ⚠️ Your subscription will expire soon. {sub.daysUntilExpirationIOS && 
                      `(${sub.daysUntilExpirationIOS} days remaining)`}
                  </Text>
                ) : null}
              </View>
            ))}
            
            {Platform.OS === 'android' && activeSubscriptions.some(s => !s.autoRenewingAndroid) ? (
              <Text style={styles.warningText}>
                ⚠️ Your subscription will not auto-renew. You'll lose access when the current period ends.
              </Text>
            ) : null}
          </View>
          
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={checkSubscriptionStatus}
            disabled={isCheckingStatus}
          >
            {isCheckingStatus ? (
              <ActivityIndicator color="#007AFF" />
            ) : (
              <Text style={styles.refreshButtonText}>🔄 Refresh Status</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Available Subscriptions</Text>
          {activeSubscriptions.length === 0 && connected ? (
            <TouchableOpacity onPress={checkSubscriptionStatus}>
              <Text style={styles.checkStatusLink}>Check Status</Text>
            </TouchableOpacity>
          ) : null}
        </View>
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
                {getIntroductoryOffer(subscription) ? (
                  <View style={styles.offerBadge}>
                    <Text style={styles.offerText}>
                      {getIntroductoryOffer(subscription)}
                    </Text>
                  </View>
                ) : null}
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
  offerBadge: {
    backgroundColor: '#e7f3ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  offerText: {
    fontSize: 12,
    color: '#0066cc',
    fontWeight: '600',
  },
  statusSection: {
    backgroundColor: '#e8f4f8',
    borderColor: '#0066cc',
    borderWidth: 1,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  activeStatus: {
    color: '#28a745',
  },
  cancelledStatus: {
    color: '#ffc107',
  },
  warningText: {
    fontSize: 12,
    color: '#ff9800',
    fontStyle: 'italic',
    marginTop: 12,
    lineHeight: 18,
  },
  refreshButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    alignItems: 'center',
    marginTop: 8,
  },
  refreshButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  checkStatusLink: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  subscriptionStatusItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 12,
    marginBottom: 12,
  },
});
