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
  Modal,
} from 'react-native';
import {useIAP, getStorefront, deepLinkToSubscriptions} from '../../src';
import type {ActiveSubscription} from '../../src';
import Loading from '../src/components/Loading';
import {SUBSCRIPTION_PRODUCT_IDS} from '../src/utils/constants';
import type {Purchase} from '../../src/types';
import type {PurchaseError} from '../../src/utils/errorMapping';
import PurchaseDetails from '../src/components/PurchaseDetails';
import PurchaseSummaryRow from '../src/components/PurchaseSummaryRow';

export default function AvailablePurchases() {
  const [loading, setLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [selectedSubscription, setSelectedSubscription] =
    useState<ActiveSubscription | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(
    null,
  );
  const [purchaseDetailsVisible, setPurchaseDetailsVisible] = useState(false);
  const [storefront, setStorefront] = useState<string>('');

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
      // Avoid logging sensitive token in console output
      const {purchaseToken: _omit, ...safePurchase} = purchase as any;
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
      await Promise.all([getAvailablePurchases(), getActiveSubscriptions()]);

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

  // Example helpers: storefront + subscription management
  const handleGetStorefront = async () => {
    try {
      const code = await getStorefront();
      setStorefront(code || '');
      Alert.alert('Storefront', code || '(empty)');
    } catch (e: any) {
      console.warn('Failed to get storefront:', e?.message);
      Alert.alert('Storefront', 'Failed to get storefront');
    }
  };

  const handleOpenSubscriptions = async () => {
    try {
      if (Platform.OS === 'android') {
        // Use first known subscription id if available, else fall back to constant
        const sku = subscriptions[0]?.id ?? SUBSCRIPTION_PRODUCT_IDS[0];
        // Example app package name
        const pkg = 'dev.hyo.martie';
        await deepLinkToSubscriptions(
          sku
            ? {skuAndroid: sku, packageNameAndroid: pkg}
            : {packageNameAndroid: pkg},
        );
      } else {
        await deepLinkToSubscriptions({});
      }
    } catch (e: any) {
      Alert.alert('Deep Link Error', e?.message || 'Failed to open');
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
      Promise.all([getAvailablePurchases(), getActiveSubscriptions()]).catch(
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
        {!!storefront && (
          <Text style={[styles.statusText, {marginTop: 6}]}>
            Storefront: {storefront}
          </Text>
        )}
      </View>

      {/* Active Subscriptions Section */}
      {activeSubscriptions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔄 Active Subscriptions</Text>
          <Text style={styles.subtitle}>
            Currently active subscription services
          </Text>

          {activeSubscriptions.map((subscription, index) => (
            <TouchableOpacity
              key={subscription.productId + index}
              style={[styles.purchaseItem, styles.activeSubscriptionItem]}
              activeOpacity={0.7}
              onPress={() => {
                setSelectedSubscription(subscription);
                setModalVisible(true);
              }}
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

                {subscription.daysUntilExpirationIOS != null && (
                  <View style={styles.purchaseRow}>
                    <Text style={styles.label}>Days Left:</Text>
                    <Text
                      style={[
                        styles.value,
                        subscription.daysUntilExpirationIOS != null &&
                        subscription.daysUntilExpirationIOS <= 3
                          ? styles.expiredText
                          : undefined,
                      ]}
                    >
                      {subscription.daysUntilExpirationIOS} days
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
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
            <PurchaseSummaryRow
              key={`available-${purchase.productId}-${index}`}
              purchase={purchase}
              style={styles.availableSummaryRow}
              onPress={() => {
                setSelectedPurchase(purchase);
                setPurchaseDetailsVisible(true);
              }}
            />
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

      {/* Tools */}
      <View style={[styles.section, {gap: 12}]}>
        <Text style={styles.sectionTitle}>🛠️ Tools</Text>
        <TouchableOpacity style={styles.button} onPress={handleGetStorefront}>
          <Text style={styles.buttonText}>🌐 Get Storefront</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={handleOpenSubscriptions}
        >
          <Text style={styles.buttonText}>🔗 Manage Subscriptions</Text>
        </TouchableOpacity>
      </View>
      {/* Subscription Details Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Subscription Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {!!selectedSubscription && (
              <View style={styles.modalContent}>
                <View style={styles.purchaseRow}>
                  <Text style={styles.label}>Product ID</Text>
                  <Text style={styles.value}>
                    {selectedSubscription.productId}
                  </Text>
                </View>
                <View style={styles.purchaseRow}>
                  <Text style={styles.label}>Transaction ID</Text>
                  <Text style={styles.value}>
                    {selectedSubscription.transactionId}
                  </Text>
                </View>
                {selectedSubscription.purchaseToken && (
                  <View style={styles.purchaseRow}>
                    <Text style={styles.label}>Purchase Token</Text>
                    <Text style={styles.value}>
                      {selectedSubscription.purchaseToken}
                    </Text>
                  </View>
                )}
                <View style={styles.purchaseRow}>
                  <Text style={styles.label}>Active</Text>
                  <Text style={styles.value}>
                    {selectedSubscription.isActive ? 'Yes' : 'No'}
                  </Text>
                </View>
                <View style={styles.purchaseRow}>
                  <Text style={styles.label}>Date</Text>
                  <Text style={styles.value}>
                    {new Date(
                      selectedSubscription.transactionDate,
                    ).toLocaleString()}
                  </Text>
                </View>
                {typeof selectedSubscription.autoRenewingAndroid ===
                  'boolean' && (
                  <View style={styles.purchaseRow}>
                    <Text style={styles.label}>Auto Renew</Text>
                    <Text style={styles.value}>
                      {selectedSubscription.autoRenewingAndroid ? 'Yes' : 'No'}
                    </Text>
                  </View>
                )}
                {typeof selectedSubscription.willExpireSoon === 'boolean' && (
                  <View style={styles.purchaseRow}>
                    <Text style={styles.label}>Will Expire Soon</Text>
                    <Text style={styles.value}>
                      {selectedSubscription.willExpireSoon ? 'Yes' : 'No'}
                    </Text>
                  </View>
                )}
                {selectedSubscription.environmentIOS && (
                  <View style={styles.purchaseRow}>
                    <Text style={styles.label}>Environment</Text>
                    <Text style={styles.value}>
                      {selectedSubscription.environmentIOS}
                    </Text>
                  </View>
                )}
                {selectedSubscription.expirationDateIOS && (
                  <View style={styles.purchaseRow}>
                    <Text style={styles.label}>Expires</Text>
                    <Text style={styles.value}>
                      {new Date(
                        selectedSubscription.expirationDateIOS,
                      ).toLocaleString()}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={purchaseDetailsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setPurchaseDetailsVisible(false);
          setSelectedPurchase(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Purchase Details</Text>
              <TouchableOpacity
                onPress={() => {
                  setPurchaseDetailsVisible(false);
                  setSelectedPurchase(null);
                }}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {selectedPurchase ? (
                <PurchaseDetails
                  purchase={selectedPurchase}
                  containerStyle={styles.purchaseDetails}
                  rowStyle={styles.purchaseRow}
                  labelStyle={styles.label}
                  valueStyle={styles.value}
                />
              ) : (
                <Text style={styles.emptyText}>No purchase selected.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  availableSummaryRow: {
    backgroundColor: '#eef5ff',
    borderColor: '#c8ddff',
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalCloseText: {
    fontSize: 18,
  },
  modalContent: {
    maxHeight: 360,
  },
});
