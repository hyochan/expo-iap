import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import {useIAP} from '../../src';
import Loading from '../src/components/Loading';
import {SUBSCRIPTION_PRODUCT_IDS} from '../../src/utils/constants';
import type {Purchase, PurchaseError} from '../../src/ExpoIap.types';

export default function AvailablePurchases() {
  const [loading, setLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Deduplicate purchases by productId, keeping the most recent transaction
  const deduplicatePurchases = (purchases: Purchase[]): Purchase[] => {
    const uniquePurchases = new Map<string, Purchase>();

    for (const purchase of purchases) {
      const existingPurchase = uniquePurchases.get(purchase.productId);
      if (!existingPurchase) {
        uniquePurchases.set(purchase.productId, purchase);
      } else {
        // Keep the most recent transaction (higher timestamp)
        const existingTimestamp = existingPurchase.transactionDate || 0;
        const newTimestamp = purchase.transactionDate || 0;

        if (newTimestamp > existingTimestamp) {
          uniquePurchases.set(purchase.productId, purchase);
        }
      }
    }

    return Array.from(uniquePurchases.values());
  };

  // Use the useIAP hook like subscription-flow does
  const {
    connected,
    subscriptions,
    availablePurchases,
    activeSubscriptions,
    getAvailablePurchases,
    getActiveSubscriptions,
    fetchProducts,
    finishTransaction,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      // Avoid logging sensitive receipt; it's same as purchaseToken
      const {transactionReceipt: _omit, ...safePurchase} = purchase as any;
      console.log('[AVAILABLE-PURCHASES] Purchase successful:', safePurchase);

      // Finish transaction like in subscription-flow
      await finishTransaction({
        purchase,
        isConsumable: false,
      });

      // Refresh status after success
      checkSubscriptionStatus();
    },
    onPurchaseError: (error: PurchaseError) => {
      console.error('[AVAILABLE-PURCHASES] Purchase failed:', error);
      Alert.alert('Purchase Failed', error.message);
    },
  });

  // Check subscription status like subscription-flow does
  const checkSubscriptionStatus = useCallback(async () => {
    if (!connected || isCheckingStatus) {
      console.log(
        '[AVAILABLE-PURCHASES] Skipping subscription status check - not connected or already checking',
      );
      return;
    }

    console.log('[AVAILABLE-PURCHASES] Checking subscription status...');
    setIsCheckingStatus(true);
    try {
      await getActiveSubscriptions();
      console.log(
        '[AVAILABLE-PURCHASES] Active subscriptions result (state):',
        activeSubscriptions,
      );
    } catch (error) {
      console.error(
        '[AVAILABLE-PURCHASES] Error checking subscription status:',
        error,
      );
      console.warn(
        '[AVAILABLE-PURCHASES] Subscription status check failed, but existing state preserved',
      );
    } finally {
      setIsCheckingStatus(false);
    }
  }, [
    activeSubscriptions,
    connected,
    getActiveSubscriptions,
    isCheckingStatus,
  ]);

  const handleGetAvailablePurchases = async () => {
    if (!connected) return;

    setLoading(true);
    try {
      console.log(
        '[AVAILABLE-PURCHASES] Loading available purchases and active subscriptions...',
      );

      // Load available purchases and active subscriptions
      // getPurchaseHistories is deprecated on Android, so we use these instead
      await Promise.all([getAvailablePurchases([]), getActiveSubscriptions()]);

      console.log(
        '[AVAILABLE-PURCHASES] Available purchases and active subscriptions loaded',
      );
    } catch (error) {
      console.error('[AVAILABLE-PURCHASES] Error loading purchases:', error);
      Alert.alert('Error', 'Failed to load purchase data');
    } finally {
      setLoading(false);
    }
  };

  // Load products and available purchases when connected - follow subscription-flow pattern
  useEffect(() => {
    if (connected) {
      console.log(
        '[AVAILABLE-PURCHASES] Connected to store, loading subscription products...',
      );
      // Request products first - this is event-based, not promise-based
      fetchProducts({skus: SUBSCRIPTION_PRODUCT_IDS, type: 'subs'});
      console.log(
        '[AVAILABLE-PURCHASES] Product loading request sent - waiting for results...',
      );

      // Then load available purchases and active subscriptions
      console.log(
        '[AVAILABLE-PURCHASES] Loading available purchases and active subscriptions...',
      );
      Promise.all([getAvailablePurchases([]), getActiveSubscriptions()]).catch(
        (error) => {
          console.warn(
            '[AVAILABLE-PURCHASES] Failed to load purchase data:',
            error,
          );
        },
      );
    }
  }, [connected, fetchProducts, getAvailablePurchases, getActiveSubscriptions]);

  // Check subscription status when connected
  useEffect(() => {
    if (connected) {
      checkSubscriptionStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  // Create deduplicated versions of purchases for display
  const deduplicatedAvailablePurchases =
    deduplicatePurchases(availablePurchases);

  // Track state changes for debugging
  useEffect(() => {
    console.log(
      '[AVAILABLE-PURCHASES] availablePurchases:',
      availablePurchases.length,
      'items (raw)',
    );
    console.log(
      '[AVAILABLE-PURCHASES] deduplicatedAvailablePurchases:',
      deduplicatedAvailablePurchases.length,
      'items (deduplicated)',
    );
  }, [availablePurchases, deduplicatedAvailablePurchases]);

  useEffect(() => {
    console.log(
      '[AVAILABLE-PURCHASES] activeSubscriptions:',
      activeSubscriptions.length,
      activeSubscriptions,
    );
  }, [activeSubscriptions]);

  useEffect(() => {
    console.log(
      '[AVAILABLE-PURCHASES] subscriptions (products):',
      subscriptions.length,
      subscriptions,
    );
  }, [subscriptions]);

  // Show loading while disconnected
  if (!connected) {
    return <Loading message="Connecting to Store..." />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Store Connection: {connected ? '✅ Connected' : '❌ Disconnected'}
        </Text>
      </View>

      {/* Active Subscriptions Section */}
      {activeSubscriptions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔄 Active Subscriptions</Text>
          <Text style={styles.subtitle}>
            Currently active subscription services
          </Text>

          {activeSubscriptions.map((subscription, index) => (
            <View
              key={subscription.productId + index}
              style={[styles.purchaseItem, styles.activeSubscriptionItem]}
            >
              <View style={styles.purchaseHeader}>
                <Text style={styles.productId}>{subscription.productId}</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>✅ Active</Text>
                </View>
              </View>

              <View style={styles.purchaseDetails}>
                {subscription.expirationDateIOS && (
                  <View style={styles.purchaseRow}>
                    <Text style={styles.label}>Expires:</Text>
                    <Text
                      style={[
                        styles.value,
                        subscription.willExpireSoon && styles.expiredText,
                      ]}
                    >
                      {new Date(
                        subscription.expirationDateIOS,
                      ).toLocaleDateString()}
                      {subscription.willExpireSoon && ' (Soon)'}
                    </Text>
                  </View>
                )}

                {subscription.environmentIOS && (
                  <View style={styles.purchaseRow}>
                    <Text style={styles.label}>Environment:</Text>
                    <Text style={styles.value}>
                      {subscription.environmentIOS}
                    </Text>
                  </View>
                )}

                {subscription.daysUntilExpirationIOS !== undefined && (
                  <View style={styles.purchaseRow}>
                    <Text style={styles.label}>Days Left:</Text>
                    <Text
                      style={[
                        styles.value,
                        subscription.daysUntilExpirationIOS <= 3 &&
                          styles.expiredText,
                      ]}
                    >
                      {subscription.daysUntilExpirationIOS} days
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Available Purchases Section - Non-consumed/Non-acknowledged purchases */}
      {deduplicatedAvailablePurchases.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Available Purchases</Text>
          <Text style={styles.subtitle}>
            Non-consumed purchases and active transactions (deduplicated)
          </Text>

          {deduplicatedAvailablePurchases.map((purchase, index) => (
            <View
              key={`available-${purchase.productId}-${index}`}
              style={[styles.purchaseItem, styles.availablePurchaseItem]}
            >
              <View style={styles.purchaseHeader}>
                <Text style={styles.productId}>{purchase.productId}</Text>
                <View style={[styles.statusBadge, styles.availableBadge]}>
                  <Text style={styles.statusBadgeText}>💰 Available</Text>
                </View>
              </View>

              <View style={styles.purchaseDetails}>
                <View style={styles.purchaseRow}>
                  <Text style={styles.label}>Platform:</Text>
                  <Text style={styles.value}>{purchase.platform}</Text>
                </View>
                {purchase.transactionDate && (
                  <View style={styles.purchaseRow}>
                    <Text style={styles.label}>Date:</Text>
                    <Text style={styles.value}>
                      {new Date(purchase.transactionDate).toLocaleDateString()}
                    </Text>
                  </View>
                )}
                {purchase.transactionId && (
                  <View style={styles.purchaseRow}>
                    <Text style={styles.label}>Transaction ID:</Text>
                    <Text style={styles.value}>{purchase.transactionId}</Text>
                  </View>
                )}

                {/* iOS-specific fields */}
                {Platform.OS === 'ios' &&
                  'expirationDateIOS' in purchase &&
                  purchase.expirationDateIOS && (
                    <View style={styles.purchaseRow}>
                      <Text style={styles.label}>Expires:</Text>
                      <Text
                        style={[
                          styles.value,
                          purchase.expirationDateIOS < Date.now() &&
                            styles.expiredText,
                        ]}
                      >
                        {new Date(
                          purchase.expirationDateIOS,
                        ).toLocaleDateString()}
                        {purchase.expirationDateIOS < Date.now()
                          ? ' (Expired)'
                          : ''}
                      </Text>
                    </View>
                  )}

                {Platform.OS === 'ios' &&
                  'environmentIOS' in purchase &&
                  purchase.environmentIOS && (
                    <View style={styles.purchaseRow}>
                      <Text style={styles.label}>Environment:</Text>
                      <Text style={styles.value}>
                        {purchase.environmentIOS}
                      </Text>
                    </View>
                  )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Empty State */}
      {deduplicatedAvailablePurchases.length === 0 &&
        activeSubscriptions.length === 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Purchase Status</Text>
            <Text style={styles.emptyText}>
              No purchases or active subscriptions found
            </Text>
          </View>
        )}

      <TouchableOpacity
        style={[styles.button, !connected && styles.buttonDisabled]}
        onPress={handleGetAvailablePurchases}
        disabled={!connected || loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>🔄 Refresh Purchases</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  statusContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  purchaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    backgroundColor: '#e8f4f8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  purchaseDetails: {
    gap: 8,
  },
  activeSubscriptionItem: {
    borderLeftColor: '#28a745',
    backgroundColor: '#f8fff9',
    borderLeftWidth: 4,
  },
  availablePurchaseItem: {
    borderLeftColor: '#007AFF',
    backgroundColor: '#f0f8ff',
    borderLeftWidth: 4,
  },
  availableBadge: {
    backgroundColor: '#e7f3ff',
  },
  historyPurchaseItem: {
    borderLeftColor: '#6c757d',
    backgroundColor: '#f8f9fa',
    borderLeftWidth: 4,
  },
  historyBadge: {
    backgroundColor: '#f0f0f0',
  },
  emptyText: {
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  purchaseItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  purchaseRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    fontWeight: '500',
    width: 120,
    color: '#333',
  },
  value: {
    flex: 1,
    color: '#666',
  },
  activeText: {
    color: '#28a745',
    fontWeight: '600',
  },
  expiredText: {
    color: '#dc3545',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
