import React, {useEffect, useCallback, useState} from 'react';
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
import {requestPurchase, useIAP, showManageSubscriptionsIOS} from '../../src';
import Loading from '../src/components/Loading';
import {SUBSCRIPTION_PRODUCT_IDS} from '../../src/utils/constants';
import type {
  SubscriptionProduct,
  PurchaseError,
  PurchaseIOS,
  Purchase,
} from '../../src/ExpoIap.types';

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

  // React state management
  const [purchaseResult, setPurchaseResult] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [selectedSubscription, setSelectedSubscription] =
    useState<SubscriptionProduct | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isHandlingPurchase, setIsHandlingPurchase] = useState(false);
  const [lastPurchase, setLastPurchase] = useState<Purchase | null>(null);
  const [purchaseDetailsVisible, setPurchaseDetailsVisible] = useState(false);

  // Use the useIAP hook for managing subscriptions with built-in subscription status
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
      // Avoid logging sensitive receipt; it's same as purchaseToken
      const {transactionReceipt: _omit, ...safePurchase} = purchase as any;
      console.log('Subscription successful:', safePurchase);
      setLastPurchase(purchase);

      // Prevent duplicate handling of the same purchase
      if (isHandlingPurchase) {
        console.log('Already handling a purchase, skipping duplicate callback');
        return;
      }

      setIsHandlingPurchase(true);
      setIsProcessing(false);

      // Determine if this is a valid purchase using logic similar to Flutter implementation
      let isPurchased = false;
      let isRestoration = false;

      if (Platform.OS === 'ios' && purchase.platform === 'ios') {
        // Type-safe access to iOS-specific fields
        const iosPurchase = purchase as PurchaseIOS;

        // Check if purchase was successful based on transaction data
        const hasValidToken = !!(
          purchase.purchaseToken && purchase.purchaseToken.length > 0
        );
        const hasValidTransactionId = !!(purchase.id && purchase.id.length > 0);

        isPurchased = hasValidToken || hasValidTransactionId;

        // For iOS, check if this is a restoration by comparing original vs current transaction
        // A restoration typically has originalTransactionIdentifierIOS different from transactionId
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
      } else if (Platform.OS === 'android' && purchase.platform === 'android') {
        // For Android, consider it purchased if we received the purchase callback
        // The purchase callback itself indicates success in most cases
        isPurchased = true;
        isRestoration = false; // Android doesn't have the same restoration concept

        console.log('Android Purchase Analysis:');
        console.log('  isPurchased:', isPurchased);
        console.log('  isRestoration:', isRestoration);
      }

      if (!isPurchased) {
        console.warn(
          'Purchase callback received but purchase validation failed',
        );
        setPurchaseResult(`⚠️ Purchase validation failed`);
        Alert.alert(
          'Purchase Issue',
          'Purchase could not be validated. Please try again.',
        );
        setIsHandlingPurchase(false); // Reset flag
        return;
      }

      if (isRestoration) {
        // This is a subscription restoration (existing subscription reactivated)
        setPurchaseResult(
          `ℹ️ Subscription restored (${purchase.platform})\n` +
            `Product: ${purchase.productId}\n` +
            `Original Transaction: ${
              (purchase as PurchaseIOS).originalTransactionIdentifierIOS ||
              'N/A'
            }\n` +
            `No additional charge - existing subscription confirmed`,
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

        // Only show alert if user explicitly requested restoration
        // Don't show on initial load
        console.log(
          'Subscription restoration detected - skipping alert on initial load',
        );

        console.log('✅ Subscription restoration completed');

        // Immediately refresh subscription status to update UI
        console.log(
          '🔄 Immediately refreshing subscription status after restoration...',
        );

        try {
          await getActiveSubscriptions();
          await getAvailablePurchases([]);
        } catch (error) {
          console.warn('Failed to refresh status:', error);
        }

        // Reset the handling flag
        setIsHandlingPurchase(false);
        return;
      }

      // Handle new subscription purchase
      setPurchaseResult(
        `✅ New subscription activated (${purchase.platform})\n` +
          `Product: ${purchase.productId}\n` +
          `Transaction ID: ${purchase.id || 'N/A'}\n` +
          `Date: ${new Date(purchase.transactionDate).toLocaleDateString()}`,
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

      Alert.alert('Success', 'New subscription activated successfully!');

      console.log('✅ New subscription purchase completed');

      // Immediately refresh subscription status to update UI
      console.log(
        '🔄 Immediately refreshing subscription status after purchase...',
      );

      try {
        await getActiveSubscriptions();
        await getAvailablePurchases([]);
      } catch (error) {
        console.warn('Failed to refresh status:', error);
      }

      // Reset the handling flag
      setIsHandlingPurchase(false);
      setIsProcessing(false);
    },
    onPurchaseError: (error: PurchaseError) => {
      console.error('Subscription failed:', error);
      setIsProcessing(false);
      setIsHandlingPurchase(false); // Reset both flags on error

      // Handle subscription error
      setPurchaseResult(`❌ Subscription failed: ${error.message}`);
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
    if (!connected || isCheckingStatus) return;

    console.log('Checking subscription status...');
    setIsCheckingStatus(true);
    try {
      // No need to pass subscriptionIds - it will check all active subscriptions
      await getActiveSubscriptions();
      console.log('Active subscriptions result (state):', activeSubscriptions);
    } catch (error) {
      console.error('Error checking subscription status:', error);
      // Don't show alert for every error - user might be offline or have temporary issues
      console.warn(
        'Subscription status check failed, but existing state preserved',
      );
    } finally {
      setIsCheckingStatus(false);
    }
  }, [
    connected,
    isCheckingStatus,
    getActiveSubscriptions,
    activeSubscriptions,
  ]);

  // Note: Do NOT fetch on mount before connection is ready.
  // Fetching happens in the connected effect below.

  // Load subscriptions and check status when connected (guard against dev double-invoke)
  const didFetchSubsRef = React.useRef(false);
  useEffect(() => {
    const subscriptionIds = SUBSCRIPTION_PRODUCT_IDS;

    if (connected && !didFetchSubsRef.current) {
      didFetchSubsRef.current = true;
      console.log('Connected to store, loading subscription products...');
      // requestProducts is event-based, not promise-based
      // Results will be available through the useIAP hook's subscriptions state
      fetchProducts({skus: subscriptionIds, type: 'subs'});
      console.log('Product loading request sent - waiting for results...');

      // Load available purchases to check subscription history
      console.log('Loading available purchases...');
      getAvailablePurchases([]).catch((error) => {
        console.warn('Failed to load available purchases:', error);
      });
    } else if (!connected) {
      didFetchSubsRef.current = false; // reset when disconnected
    }
  }, [connected, fetchProducts, getAvailablePurchases]);

  // Defer loading guard until after all hooks are declared

  // Check subscription status when connected
  useEffect(() => {
    if (connected) {
      checkSubscriptionStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  // Track activeSubscriptions state changes
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

  // Track subscriptions (products) state changes
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

  const handleSubscription = (itemId: string) => {
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

    setIsProcessing(true);
    setPurchaseResult('Processing subscription...');

    // Find the subscription to get offer details for Android
    const subscription = subscriptions.find((sub) => sub.id === itemId);

    // Fire-and-forget: requestPurchase is event-based; handle results via hook callbacks
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
          // appAccountToken can be provided in real apps if needed
        },
        android: {
          skus: [itemId],
          subscriptionOffers:
            subscription &&
            'subscriptionOfferDetailsAndroid' in subscription &&
            subscription.subscriptionOfferDetailsAndroid
              ? subscription.subscriptionOfferDetailsAndroid.map((offer) => ({
                  sku: itemId,
                  offerToken: offer.offerToken,
                }))
              : [],
        },
      },
      type: 'subs',
    });
  };

  const retryLoadSubscriptions = () => {
    fetchProducts({skus: SUBSCRIPTION_PRODUCT_IDS, type: 'subs'});
  };

  const getSubscriptionDisplayPrice = (
    subscription: SubscriptionProduct,
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

  const handleManageSubscriptions = async () => {
    try {
      if (Platform.OS === 'ios') {
        console.log('Opening subscription management...');
        await showManageSubscriptionsIOS();
        console.log('Subscription management opened');

        // After returning from subscription management, refresh status
        console.log('Refreshing subscription status after management...');
        checkSubscriptionStatus();
      } else {
        Alert.alert(
          'Manage Subscriptions',
          'On Android, subscriptions are managed through Google Play Store.\n\n' +
            'Go to: Play Store → Menu → Subscriptions',
          [{text: 'OK', style: 'default'}],
        );
      }
    } catch (error) {
      console.error('Failed to open subscription management:', error);
      Alert.alert('Error', 'Failed to open subscription management');
    }
  };

  const getIntroductoryOffer = (
    subscription: SubscriptionProduct,
  ): string | null => {
    if (
      'subscriptionInfoIOS' in subscription &&
      subscription.subscriptionInfoIOS?.introductoryOffer
    ) {
      const offer = subscription.subscriptionInfoIOS.introductoryOffer;
      switch (offer.paymentMode) {
        case 'FREETRIAL':
          return `${
            offer.periodCount
          } ${offer.period.unit.toLowerCase()}(s) free trial`;
        case 'PAYASYOUGO':
          return `${offer.displayPrice} for ${
            offer.periodCount
          } ${offer.period.unit.toLowerCase()}(s)`;
        case 'PAYUPFRONT':
          return `${offer.displayPrice} for first ${
            offer.periodCount
          } ${offer.period.unit.toLowerCase()}(s)`;
        default:
          return null;
      }
    }
    return null;
  };

  const getSubscriptionPeriod = (subscription: SubscriptionProduct): string => {
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

  const handleSubscriptionPress = (subscription: SubscriptionProduct) => {
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

      {/* Debug Information */}
      {__DEV__ && (
        <View style={[styles.section, {backgroundColor: '#fff3cd'}]}>
          <Text style={styles.sectionTitle}>Debug Info (Dev Only)</Text>
          <Text style={{fontSize: 12, fontFamily: 'monospace'}}>
            Connected: {connected.toString()}
            {'\n'}
            Subscriptions: {subscriptions.length}
            {'\n'}
            Active Subscriptions: {activeSubscriptions.length}
            {'\n'}
            Available Purchases: {availablePurchases.length}
            {'\n'}
            Checking Status: {isCheckingStatus.toString()}
            {'\n'}
            {activeSubscriptions.length > 0 &&
              `Active IDs: ${activeSubscriptions
                .map((s) => s.productId)
                .join(', ')}\n`}
            {activeSubscriptions.length > 0 &&
              `Active Status: ${JSON.stringify(
                activeSubscriptions[0],
                null,
                2,
              )}`}
          </Text>
        </View>
      )}

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
                      {sub.expirationDateIOS.toLocaleDateString()}
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
              onPress={checkSubscriptionStatus}
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
            <TouchableOpacity onPress={checkSubscriptionStatus}>
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
      {(() => {
        const deduplicatedPurchases = deduplicatePurchases(availablePurchases);
        return deduplicatedPurchases.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Purchases History</Text>
            <Text style={styles.subtitle}>
              Past purchases and subscription transactions (deduplicated)
            </Text>
            {deduplicatedPurchases.map((purchase, index) => (
              <View
                key={`${purchase.productId}-${index}`}
                style={styles.purchaseCard}
              >
                <View style={styles.purchaseInfo}>
                  <Text style={styles.purchaseTitle}>{purchase.productId}</Text>
                  <Text style={styles.purchaseDate}>
                    {new Date(purchase.transactionDate).toLocaleDateString()}
                  </Text>
                  <Text style={styles.purchasePlatform}>
                    Platform: {purchase.platform}
                  </Text>
                  {Platform.OS === 'ios' &&
                  'expirationDateIOS' in purchase &&
                  purchase.expirationDateIOS ? (
                    <Text style={styles.purchaseExpiry}>
                      Expires:{' '}
                      {new Date(
                        purchase.expirationDateIOS,
                      ).toLocaleDateString()}
                    </Text>
                  ) : null}
                  {Platform.OS === 'android' &&
                  'autoRenewingAndroid' in purchase ? (
                    <Text style={styles.purchaseRenewal}>
                      Auto-Renewing:{' '}
                      {purchase.autoRenewingAndroid ? 'Yes' : 'No'}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.purchaseStatus}>
                  <Text style={styles.purchaseStatusText}>
                    {purchase.platform === 'ios' &&
                    'expirationDateIOS' in purchase &&
                    purchase.expirationDateIOS
                      ? purchase.expirationDateIOS > Date.now()
                        ? '✅ Active'
                        : '❌ Expired'
                      : '✅ Purchased'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null;
      })()}

      {purchaseResult ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Result</Text>
          <View style={styles.resultCard}>
            <Text style={styles.resultText}>{purchaseResult}</Text>
            <View style={styles.resultActionsRow}>
              <TouchableOpacity
                style={styles.resultCopyButton}
                onPress={async () => {
                  if (purchaseResult) {
                    await Clipboard.setStringAsync(purchaseResult);
                    Alert.alert(
                      'Copied',
                      'Purchase result copied to clipboard',
                    );
                  }
                }}
              >
                <Text style={styles.resultCopyButtonText}>📋 Copy Result</Text>
              </TouchableOpacity>
              {lastPurchase ? (
                <TouchableOpacity
                  style={[styles.detailsButton, styles.resultDetailsButton]}
                  onPress={() => setPurchaseDetailsVisible(true)}
                >
                  <Text style={styles.detailsButtonText}>Details</Text>
                </TouchableOpacity>
              ) : null}
            </View>
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
        onRequestClose={() => setPurchaseDetailsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Purchase Details</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setPurchaseDetailsVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {lastPurchase && (
                <View style={{gap: 6}}>
                  <Text style={styles.detailLabel}>Transaction ID</Text>
                  <Text style={styles.detailValue}>{lastPurchase.id}</Text>

                  <Text style={styles.detailLabel}>Product ID</Text>
                  <Text style={styles.detailValue}>
                    {lastPurchase.productId}
                  </Text>

                  <Text style={styles.detailLabel}>Platform</Text>
                  <Text style={styles.detailValue}>
                    {lastPurchase.platform}
                  </Text>

                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>
                    {new Date(lastPurchase.transactionDate).toLocaleString()}
                  </Text>

                  {lastPurchase.purchaseToken ? (
                    <>
                      <Text style={styles.detailLabel}>Purchase Token</Text>
                      <Text style={styles.detailValue}>
                        {lastPurchase.purchaseToken}
                      </Text>
                    </>
                  ) : null}
                </View>
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
  purchaseCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  purchaseInfo: {
    flex: 1,
  },
  purchaseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  purchaseDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  purchasePlatform: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  purchaseExpiry: {
    fontSize: 12,
    color: '#28a745',
    marginBottom: 2,
  },
  purchaseRenewal: {
    fontSize: 12,
    color: '#007AFF',
  },
  purchaseStatus: {
    alignItems: 'center',
  },
  purchaseStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#28a745',
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
