import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  requestPurchase,
  useIAP,
  showManageSubscriptionsIOS,
  deepLinkToSubscriptions,
} from '../../src';
import Loading from '../src/components/Loading';
import {SUBSCRIPTION_PRODUCT_IDS} from '../src/utils/constants';
import type {
  ActiveSubscription,
  ProductSubscription,
  PurchaseIOS,
  Purchase,
} from '../../src/types';
import type {PurchaseError} from '../../src/utils/errorMapping';
import PurchaseDetails from '../src/components/PurchaseDetails';
import PurchaseSummaryRow from '../src/components/PurchaseSummaryRow';

const deduplicatePurchases = (purchases: Purchase[]): Purchase[] => {
  const uniquePurchases = new Map<string, Purchase>();

  for (const purchase of purchases) {
    const existingPurchase = uniquePurchases.get(purchase.productId);
    if (!existingPurchase) {
      uniquePurchases.set(purchase.productId, purchase);
    } else {
      const existingTimestamp = existingPurchase.transactionDate || 0;
      const newTimestamp = purchase.transactionDate || 0;

      if (newTimestamp > existingTimestamp) {
        uniquePurchases.set(purchase.productId, purchase);
      }
    }
  }

  return Array.from(uniquePurchases.values());
};

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

type SubscriptionFlowProps = {
  connected: boolean;
  subscriptions: ProductSubscription[];
  availablePurchases: Purchase[];
  activeSubscriptions: ActiveSubscription[];
  purchaseResult: string;
  isProcessing: boolean;
  isCheckingStatus: boolean;
  lastPurchase: Purchase | null;
  onSubscribe: (productId: string) => void;
  onRetryLoadSubscriptions: () => void;
  onRefreshStatus: () => void;
  onManageSubscriptions: () => void;
};

function SubscriptionFlow({
  connected,
  subscriptions,
  availablePurchases,
  activeSubscriptions,
  purchaseResult,
  isProcessing,
  isCheckingStatus,
  lastPurchase,
  onSubscribe,
  onRetryLoadSubscriptions,
  onRefreshStatus,
  onManageSubscriptions,
}: SubscriptionFlowProps) {
  const [selectedSubscription, setSelectedSubscription] =
    useState<ProductSubscription | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(
    null,
  );
  const [purchaseDetailsVisible, setPurchaseDetailsVisible] = useState(false);

  const handleSubscription = useCallback(
    (itemId: string) => {
      // Check if already subscribed to this product
      const isAlreadySubscribed = activeSubscriptions.some(
        (sub) => sub.productId === itemId,
      );

      if (isAlreadySubscribed) {
        Alert.alert(
          'Already Subscribed',
          'You already have an active subscription to this product.',
          [{text: 'OK', style: 'default'}],
        );
        return;
      }
      onSubscribe(itemId);
    },
    [activeSubscriptions, onSubscribe],
  );

  const retryLoadSubscriptions = useCallback(() => {
    onRetryLoadSubscriptions();
  }, [onRetryLoadSubscriptions]);

  const handleRefreshStatus = useCallback(() => {
    onRefreshStatus();
  }, [onRefreshStatus]);

  const getSubscriptionDisplayPrice = (
    subscription: ProductSubscription,
  ): string => {
    if (
      'subscriptionOfferDetailsAndroid' in subscription &&
      subscription.subscriptionOfferDetailsAndroid
    ) {
      // Android subscription pricing structure
      const offers = subscription.subscriptionOfferDetailsAndroid;
      if (offers.length > 0) {
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

  const handleManageSubscriptions = useCallback(() => {
    onManageSubscriptions();
  }, [onManageSubscriptions]);

  const deduplicatedPurchases = useMemo(
    () => deduplicatePurchases(availablePurchases),
    [availablePurchases],
  );

  const getIntroductoryOffer = (
    subscription: ProductSubscription,
  ): string | null => {
    if (
      'subscriptionInfoIOS' in subscription &&
      subscription.subscriptionInfoIOS?.introductoryOffer
    ) {
      const offer = subscription.subscriptionInfoIOS.introductoryOffer;
      switch (offer.paymentMode) {
        case 'free-trial':
          return `${
            offer.periodCount
          } ${offer.period.unit.toLowerCase()}(s) free trial`;
        case 'pay-as-you-go':
          return `${offer.displayPrice} for ${
            offer.periodCount
          } ${offer.period.unit.toLowerCase()}(s)`;
        case 'pay-up-front':
          return `${offer.displayPrice} for first ${
            offer.periodCount
          } ${offer.period.unit.toLowerCase()}(s)`;
        default:
          return null;
      }
    }
    return null;
  };

  const getSubscriptionPeriod = (subscription: ProductSubscription): string => {
    if (
      'subscriptionOfferDetailsAndroid' in subscription &&
      subscription.subscriptionOfferDetailsAndroid
    ) {
      const offers = subscription.subscriptionOfferDetailsAndroid;
      if (offers.length > 0) {
        const pricingPhases = offers[0].pricingPhases;
        if (pricingPhases && pricingPhases.pricingPhaseList.length > 0) {
          return pricingPhases.pricingPhaseList[0].billingPeriod || 'Unknown';
        }
      }
      return 'Unknown';
    } else if (
      'subscriptionInfoIOS' in subscription &&
      subscription.subscriptionInfoIOS
    ) {
      return (
        subscription.subscriptionInfoIOS.subscriptionPeriod?.unit || 'Unknown'
      );
    }
    return 'Unknown';
  };

  const handleSubscriptionPress = (subscription: ProductSubscription) => {
    setSelectedSubscription(subscription);
    setModalVisible(true);
  };

  const renderSubscriptionDetails = () => {
    const subscription = selectedSubscription;
    if (!subscription) return null;

    const jsonString = JSON.stringify(subscription, null, 2);

    const copyToClipboard = async () => {
      try {
        await Clipboard.setStringAsync(jsonString);
        Alert.alert('Copied', 'Subscription JSON copied to clipboard');
      } catch {
        Alert.alert('Copy Failed', 'Failed to copy to clipboard');
      }
    };

    const logToConsole = () => {
      console.log('=== SUBSCRIPTION DATA ===');
      console.log(subscription);
      console.log('=== SUBSCRIPTION JSON ===');
      console.log(jsonString);
      Alert.alert('Console', 'Subscription data logged to console');
    };

    return (
      <View style={styles.modalContent}>
        <ScrollView style={styles.jsonContainer}>
          <Text style={styles.jsonText}>{jsonString}</Text>
        </ScrollView>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.copyButton]}
            onPress={copyToClipboard}
          >
            <Text style={styles.actionButtonText}>📋 Copy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.consoleButton]}
            onPress={logToConsole}
          >
            <Text style={styles.actionButtonText}>🖥️ Console</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
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
              <View
                key={sub.productId + index}
                style={styles.subscriptionStatusItem}
              >
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Product:</Text>
                  <Text style={styles.statusValue}>{sub.productId}</Text>
                </View>

                {Platform.OS === 'ios' && sub.expirationDateIOS ? (
                  <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>Expires:</Text>
                    <Text style={styles.statusValue}>
                      {new Date(sub.expirationDateIOS).toLocaleDateString()}
                    </Text>
                  </View>
                ) : null}

                {Platform.OS === 'android' &&
                sub.autoRenewingAndroid !== undefined ? (
                  <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>Auto-Renew:</Text>
                    <Text
                      style={[
                        styles.statusValue,
                        sub.autoRenewingAndroid
                          ? styles.activeStatus
                          : styles.cancelledStatus,
                      ]}
                    >
                      {sub.autoRenewingAndroid ? '✅ Enabled' : '⚠️ Cancelled'}
                    </Text>
                  </View>
                ) : null}

                {sub.environmentIOS ? (
                  <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>Environment:</Text>
                    <Text style={styles.statusValue}>{sub.environmentIOS}</Text>
                  </View>
                ) : null}

                {sub.willExpireSoon ? (
                  <Text style={styles.warningText}>
                    ⚠️ Your subscription will expire soon.{' '}
                    {sub.daysUntilExpirationIOS &&
                      `(${sub.daysUntilExpirationIOS} days remaining)`}
                  </Text>
                ) : null}
              </View>
            ))}

            {Platform.OS === 'android' &&
            activeSubscriptions.some((s) => !s.autoRenewingAndroid) ? (
              <Text style={styles.warningText}>
                ⚠️ Your subscription will not auto-renew. You'll lose access
                when the current period ends.
              </Text>
            ) : null}
          </View>

          <View style={styles.subscriptionActionButtons}>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={handleRefreshStatus}
              disabled={isCheckingStatus}
            >
              {isCheckingStatus ? (
                <ActivityIndicator color="#007AFF" />
              ) : (
                <Text style={styles.refreshButtonText}>🔄 Refresh Status</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.manageButton, {backgroundColor: '#007AFF'}]}
              onPress={handleManageSubscriptions}
            >
              <Text style={styles.manageButtonText}>
                ⚙️ Manage Subscription
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Available Subscriptions</Text>
          {activeSubscriptions.length === 0 && connected ? (
            <TouchableOpacity onPress={handleRefreshStatus}>
              <Text style={styles.checkStatusLink}>Check Status</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {!connected ? (
          <Loading message="Connecting to store..." />
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
              <View style={styles.subscriptionActions}>
                <TouchableOpacity
                  style={styles.infoButton}
                  onPress={() => handleSubscriptionPress(subscription)}
                >
                  <Text style={styles.infoButtonText}>ℹ️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.subscribeButton,
                    (isProcessing ||
                      activeSubscriptions.some(
                        (sub) => sub.productId === subscription.id,
                      )) &&
                      styles.disabledButton,
                    activeSubscriptions.some(
                      (sub) => sub.productId === subscription.id,
                    ) && styles.subscribedButton,
                  ]}
                  onPress={() => handleSubscription(subscription.id)}
                  disabled={
                    isProcessing ||
                    !connected ||
                    activeSubscriptions.some(
                      (sub) => sub.productId === subscription.id,
                    )
                  }
                >
                  <Text
                    style={[
                      styles.subscribeButtonText,
                      activeSubscriptions.some(
                        (sub) => sub.productId === subscription.id,
                      ) && styles.subscribedButtonText,
                    ]}
                  >
                    {isProcessing
                      ? 'Processing...'
                      : activeSubscriptions.some(
                          (sub) => sub.productId === subscription.id,
                        )
                      ? '✅ Subscribed'
                      : 'Subscribe'}
                  </Text>
                </TouchableOpacity>
              </View>
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

      {/* Available Purchases Section */}
      {deduplicatedPurchases.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Purchases History</Text>
          <Text style={styles.subtitle}>
            Past purchases and subscription transactions (deduplicated)
          </Text>
          {deduplicatedPurchases.map((purchase, index) => (
            <PurchaseSummaryRow
              key={`history-${purchase.productId}-${index}`}
              purchase={purchase}
              onPress={() => {
                setSelectedPurchase(purchase);
                setPurchaseDetailsVisible(true);
              }}
            />
          ))}
        </View>
      ) : null}

      {purchaseResult || lastPurchase ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Latest Activity</Text>
          <View style={styles.resultCard}>
            {purchaseResult ? (
              <Text style={styles.resultText}>{purchaseResult}</Text>
            ) : null}
            {lastPurchase ? (
              <View style={{marginTop: 8}}>
                <PurchaseSummaryRow
                  purchase={lastPurchase}
                  onPress={() => {
                    setSelectedPurchase(lastPurchase);
                    setPurchaseDetailsVisible(true);
                  }}
                />
              </View>
            ) : null}
            {purchaseResult ? (
              <TouchableOpacity
                style={styles.resultCopyButton}
                onPress={async () => {
                  if (purchaseResult) {
                    await Clipboard.setStringAsync(purchaseResult);
                    Alert.alert(
                      'Copied',
                      'Purchase message copied to clipboard',
                    );
                  }
                }}
              >
                <Text style={styles.resultCopyButtonText}>📋 Copy Message</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : null}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Subscription Details</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            {renderSubscriptionDetails()}
          </View>
        </View>
      </Modal>

      {/* Purchase Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={purchaseDetailsVisible}
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
                style={styles.closeButton}
                onPress={() => {
                  setPurchaseDetailsVisible(false);
                  setSelectedPurchase(null);
                }}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {selectedPurchase ? (
                <PurchaseDetails
                  purchase={selectedPurchase}
                  containerStyle={styles.purchaseDetailsContainer}
                  rowStyle={styles.purchaseDetailRow}
                  labelStyle={styles.detailLabel}
                  valueStyle={styles.detailValue}
                />
              ) : (
                <Text style={styles.detailValue}>No purchase selected.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

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

function SubscriptionFlowContainer() {
  const [purchaseResult, setPurchaseResult] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [lastPurchase, setLastPurchase] = useState<Purchase | null>(null);

  const isHandlingPurchaseRef = useRef(false);
  const isCheckingStatusRef = useRef(false);
  const didFetchSubsRef = useRef(false);

  const resetHandlingState = useCallback(() => {
    isHandlingPurchaseRef.current = false;
  }, []);

  const {
    connected,
    subscriptions,
    availablePurchases,
    fetchProducts,
    getAvailablePurchases,
    finishTransaction,
    getActiveSubscriptions,
    activeSubscriptions,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      const {purchaseToken: tokenToMask, ...rest} = purchase as any;
      const masked = {
        ...rest,
        ...(tokenToMask ? {purchaseToken: 'hidden'} : {}),
      };
      console.log('Subscription successful:', masked);
      setLastPurchase(purchase);

      if (isHandlingPurchaseRef.current) {
        console.log('Already handling a purchase, skipping duplicate callback');
        return;
      }

      isHandlingPurchaseRef.current = true;
      setIsProcessing(false);

      let isPurchased = false;
      let isRestoration = false;
      const purchasePlatform = (purchase.platform ?? '')
        .toString()
        .toLowerCase();

      if (Platform.OS === 'ios' && purchasePlatform === 'ios') {
        const iosPurchase = purchase as PurchaseIOS;
        const hasValidToken = !!(
          purchase.purchaseToken && purchase.purchaseToken.length > 0
        );
        const hasValidTransactionId = !!(purchase.id && purchase.id.length > 0);

        isPurchased = hasValidToken || hasValidTransactionId;
        isRestoration = Boolean(
          iosPurchase.originalTransactionIdentifierIOS &&
            iosPurchase.originalTransactionIdentifierIOS !== purchase.id &&
            iosPurchase.transactionReasonIOS &&
            iosPurchase.transactionReasonIOS !== 'PURCHASE',
        );

        console.log('iOS Purchase Analysis:');
        console.log('  hasValidToken:', hasValidToken);
        console.log('  hasValidTransactionId:', hasValidTransactionId);
        console.log('  isPurchased:', isPurchased);
        console.log('  isRestoration:', isRestoration);
        console.log(
          '  originalTransactionId:',
          iosPurchase.originalTransactionIdentifierIOS,
        );
        console.log('  currentTransactionId:', purchase.id);
        console.log('  transactionReason:', iosPurchase.transactionReasonIOS);
      } else if (Platform.OS === 'android' && purchasePlatform === 'android') {
        isPurchased = true;
        isRestoration = false;

        console.log('Android Purchase Analysis:');
        console.log('  isPurchased:', isPurchased);
        console.log('  isRestoration:', isRestoration);
      }

      if (!isPurchased) {
        console.warn(
          'Purchase callback received but purchase validation failed',
        );
        setPurchaseResult('Purchase validation failed.');
        Alert.alert(
          'Purchase Issue',
          'Purchase could not be validated. Please try again.',
        );
        resetHandlingState();
        return;
      }

      if (isRestoration) {
        setPurchaseResult('Subscription restored successfully.');

        try {
          await finishTransaction({
            purchase,
            isConsumable: false,
          });
        } catch (error) {
          console.warn('finishTransaction failed during restoration:', error);
        }

        console.log('✅ Subscription restoration completed');

        try {
          await getActiveSubscriptions();
          await getAvailablePurchases();
        } catch (error) {
          console.warn('Failed to refresh status:', error);
        }

        resetHandlingState();
        return;
      }

      setPurchaseResult('Subscription activated successfully.');

      try {
        await finishTransaction({
          purchase,
          isConsumable: false,
        });
      } catch (error) {
        console.warn('finishTransaction failed (new purchase):', error);
      }

      Alert.alert('Success', 'New subscription activated successfully!');
      console.log('✅ New subscription purchase completed');

      try {
        await getActiveSubscriptions();
        await getAvailablePurchases();
      } catch (error) {
        console.warn('Failed to refresh status:', error);
      }

      resetHandlingState();
      setIsProcessing(false);
    },
    onPurchaseError: (error: PurchaseError) => {
      console.error('Subscription failed:', error);
      setIsProcessing(false);
      resetHandlingState();
      setPurchaseResult(`Subscription failed: ${error.message}`);
    },
  });

  const handleRefreshStatus = useCallback(async () => {
    if (!connected || isCheckingStatusRef.current) {
      return;
    }

    console.log('Checking subscription status...');
    isCheckingStatusRef.current = true;
    setIsCheckingStatus(true);
    try {
      getActiveSubscriptions();
    } catch (error) {
      console.error('Error checking subscription status:', error);
      console.warn(
        'Subscription status check failed, but existing state preserved',
      );
    } finally {
      isCheckingStatusRef.current = false;
      setIsCheckingStatus(false);
    }
  }, [connected, getActiveSubscriptions]);

  useEffect(() => {
    const subscriptionIds = SUBSCRIPTION_PRODUCT_IDS;

    if (connected && !didFetchSubsRef.current) {
      didFetchSubsRef.current = true;
      console.log('Connected to store, loading subscription products...');
      fetchProducts({skus: subscriptionIds, type: 'subs'});
      console.log('Product loading request sent - waiting for results...');

      console.log('Loading available purchases...');
      getAvailablePurchases().catch((error) => {
        console.warn('Failed to load available purchases:', error);
      });
    } else if (!connected) {
      didFetchSubsRef.current = false;
    }
  }, [connected, fetchProducts, getAvailablePurchases]);

  useEffect(() => {
    if (connected) {
      void handleRefreshStatus();
    }
  }, [connected, handleRefreshStatus]);

  useEffect(() => {
    console.log(
      '[STATE CHANGE] activeSubscriptions:',
      activeSubscriptions.length,
      'items:',
      activeSubscriptions.map((sub) => ({
        productId: sub.productId,
        isActive: sub.isActive,
        expirationDateIOS: sub.expirationDateIOS?.toString(),
        environmentIOS: sub.environmentIOS,
        willExpireSoon: sub.willExpireSoon,
      })),
    );
  }, [activeSubscriptions]);

  useEffect(() => {
    console.log(
      '[STATE CHANGE] subscriptions (products):',
      subscriptions.length,
      subscriptions.map((s) => ({id: s.id, title: s.title, type: s.type})),
    );

    if (subscriptions.length > 0) {
      console.log(
        'Full subscription details:',
        JSON.stringify(subscriptions, null, 2),
      );
    }
  }, [subscriptions]);

  const handleSubscription = useCallback(
    (itemId: string) => {
      if (
        activeSubscriptions.some(
          (subscription) => subscription.productId === itemId,
        )
      ) {
        setPurchaseResult(
          'You already have an active subscription to this product.',
        );
        setIsProcessing(false);
        return;
      }

      setIsProcessing(true);
      setPurchaseResult('Processing subscription...');

      const subscription = subscriptions.find((sub) => sub.id === itemId);

      const androidOffers =
        subscription &&
        'subscriptionOfferDetailsAndroid' in subscription &&
        Array.isArray(subscription.subscriptionOfferDetailsAndroid)
          ? subscription.subscriptionOfferDetailsAndroid
              .map((offer) =>
                offer?.offerToken
                  ? {
                      sku: itemId,
                      offerToken: offer.offerToken,
                    }
                  : null,
              )
              .filter((offer): offer is {sku: string; offerToken: string} =>
                Boolean(offer?.offerToken),
              )
          : [];

      if (typeof requestPurchase !== 'function') {
        console.warn(
          '[SubscriptionFlow] requestPurchase missing (test/mock env)',
        );
        setIsProcessing(false);
        setPurchaseResult('Cannot start purchase in test/mock environment.');
        return;
      }

      void requestPurchase({
        request: {
          ios: {
            sku: itemId,
          },
          android: {
            skus: [itemId],
            subscriptionOffers:
              androidOffers.length > 0 ? androidOffers : undefined,
          },
        },
        type: 'subs',
      });
    },
    [activeSubscriptions, subscriptions],
  );

  const handleRetryLoadSubscriptions = useCallback(() => {
    fetchProducts({skus: SUBSCRIPTION_PRODUCT_IDS, type: 'subs'});
  }, [fetchProducts]);

  const handleManageSubscriptions = useCallback(async () => {
    try {
      if (Platform.OS === 'ios') {
        console.log('Opening subscription management (iOS)...');
        const openedNative = await showManageSubscriptionsIOS()
          .then(() => true)
          .catch((error) => {
            console.warn(
              '[SubscriptionFlow] showManageSubscriptionsIOS failed, falling back to deep link',
              error,
            );
            return false;
          });

        if (!openedNative) {
          await deepLinkToSubscriptions({});
        }
        console.log('Subscription management opened');

        console.log('Refreshing subscription status after management...');
        await handleRefreshStatus();
      } else {
        const sku = subscriptions[0]?.id ?? SUBSCRIPTION_PRODUCT_IDS[0];
        const packageName = 'dev.hyo.martie';
        console.log('Opening subscription management (Android)...');
        await deepLinkToSubscriptions(
          sku
            ? {skuAndroid: sku, packageNameAndroid: packageName}
            : {packageNameAndroid: packageName},
        );
      }
    } catch (error) {
      console.error('Failed to open subscription management:', error);
      Alert.alert('Error', 'Failed to open subscription management');
    }
  }, [handleRefreshStatus, subscriptions]);

  return (
    <SubscriptionFlow
      connected={connected}
      subscriptions={subscriptions}
      availablePurchases={availablePurchases}
      activeSubscriptions={activeSubscriptions}
      purchaseResult={purchaseResult}
      isProcessing={isProcessing}
      isCheckingStatus={isCheckingStatus}
      lastPurchase={lastPurchase}
      onSubscribe={handleSubscription}
      onRetryLoadSubscriptions={handleRetryLoadSubscriptions}
      onRefreshStatus={handleRefreshStatus}
      onManageSubscriptions={handleManageSubscriptions}
    />
  );
}

export default SubscriptionFlowContainer;

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
  subscriptionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoButton: {
    backgroundColor: '#e9ecef',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoButtonText: {
    fontSize: 18,
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
  resultActionsRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultCopyButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#28a745',
    minHeight: 44,
    justifyContent: 'center',
  },
  resultCopyButtonText: {
    color: '#28a745',
    fontWeight: '600',
    fontSize: 14,
  },
  resultDetailsButton: {
    minHeight: 44,
    justifyContent: 'center',
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
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 10,
    marginBottom: 5,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  purchaseDetailsContainer: {
    gap: 10,
  },
  purchaseDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailsButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
    alignItems: 'center',
  },
  detailsButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 14,
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
    justifyContent: 'center',
    flex: 1,
    minHeight: 44,
  },
  refreshButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  subscriptionActionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  manageButton: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  manageButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
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
  subscribedButton: {
    backgroundColor: '#6c757d',
  },
  subscribedButtonText: {
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    height: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  modalContent: {
    flex: 1,
    padding: 20,
    paddingTop: 0,
  },
  jsonContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  jsonText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    color: '#333',
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  copyButton: {
    backgroundColor: '#007AFF',
  },
  consoleButton: {
    backgroundColor: '#28a745',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
