import React, {useCallback, useEffect, useRef, useState} from 'react';
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
import {useActionSheet} from '@expo/react-native-action-sheet';
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
  Purchase,
  VerifyPurchaseWithProviderProps,
} from '../../src/types';
import type {PurchaseError} from '../../src/utils/errorMapping';
import PurchaseDetails from '../src/components/PurchaseDetails';
import PurchaseSummaryRow from '../src/components/PurchaseSummaryRow';
import {extractErrorMessage} from '../src/utils/errorUtils';

type VerificationMethod = 'ignore' | 'local' | 'iapkit';

// Subscription tier mapping - defined outside component to avoid recreation
const TIER_MAP: Record<string, number> = {
  'dev.hyo.martie.premium': 1, // Monthly tier
  'dev.hyo.martie.premium_year': 2, // Yearly tier (higher)
};

const getSubscriptionTier = (productId: string): number => {
  return TIER_MAP[productId] ?? 0;
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
  activeSubscriptions: ActiveSubscription[];
  purchaseResult: string;
  isProcessing: boolean;
  isCheckingStatus: boolean;
  lastPurchase: Purchase | null;
  onSubscribe: (productId: string) => void;
  onRetryLoadSubscriptions: () => void;
  onRefreshStatus: () => void;
  onManageSubscriptions: () => void;
  verificationMethod: VerificationMethod;
  onChangeVerificationMethod: () => void;
};

function SubscriptionFlow({
  connected,
  subscriptions,
  activeSubscriptions,
  purchaseResult,
  isProcessing,
  isCheckingStatus,
  lastPurchase,
  onSubscribe,
  onRetryLoadSubscriptions,
  onRefreshStatus,
  onManageSubscriptions,
  verificationMethod,
  onChangeVerificationMethod,
}: SubscriptionFlowProps) {
  const [selectedSubscription, setSelectedSubscription] =
    useState<ProductSubscription | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(
    null,
  );
  const [purchaseDetailsVisible, setPurchaseDetailsVisible] = useState(false);

  // Helper to get subscription title by product ID
  const getSubscriptionTitle = useCallback(
    (productId: string | null | undefined): string => {
      if (!productId) return 'Unknown';
      return subscriptions.find((s) => s.id === productId)?.title || productId;
    },
    [subscriptions],
  );

  // Note: getSubscriptionTier is now defined outside the component for better performance

  // Get current active subscription
  const getCurrentSubscription = useCallback((): ActiveSubscription | null => {
    const activeSubs = activeSubscriptions.filter((sub) => sub.isActive);
    if (activeSubs.length === 0) return null;

    // Return the subscription with the highest tier
    // If tiers are equal, prefer the one with later expiration date
    return activeSubs.reduce((best, cur) => {
      const bestTier = getSubscriptionTier(best.productId);
      const curTier = getSubscriptionTier(cur.productId);

      if (curTier > bestTier) return cur;
      if (curTier === bestTier) {
        const bestExp = best.expirationDateIOS ?? 0;
        const curExp = cur.expirationDateIOS ?? 0;
        return curExp > bestExp ? cur : best;
      }
      return best;
    }, activeSubs[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSubscriptions]);

  // Check if subscription is cancelled (active but won't auto-renew)
  const isCancelled = useCallback(
    (productId: string): boolean => {
      if (Platform.OS !== 'ios') return false;

      const subscription = activeSubscriptions.find(
        (sub) => sub.productId === productId,
      );
      if (!subscription || !subscription.renewalInfoIOS) return false;

      return (
        subscription.isActive &&
        subscription.renewalInfoIOS.willAutoRenew === false
      );
    },
    [activeSubscriptions],
  );

  // Check if a product is pending upgrade (scheduled to activate)
  const isPendingUpgrade = useCallback(
    (productId: string): boolean => {
      if (Platform.OS !== 'ios') return false;

      return activeSubscriptions.some(
        (sub) =>
          sub.renewalInfoIOS?.pendingUpgradeProductId === productId &&
          sub.productId !== productId,
      );
    },
    [activeSubscriptions],
  );

  // Determine upgrade possibilities
  type UpgradeInfo = {
    canUpgrade: boolean;
    isDowngrade: boolean;
    currentTier: string | null;
    message?: string;
    isPending?: boolean;
  };

  const getUpgradeInfo = useCallback(
    (targetProductId: string): UpgradeInfo => {
      const currentSubscription = getCurrentSubscription();

      if (!currentSubscription) {
        // No active subscription = no upgrade
        return {canUpgrade: false, isDowngrade: false, currentTier: null};
      }

      // Check if current subscription is cancelled
      const isCurrentCancelled = isCancelled(currentSubscription.productId);

      // If trying to subscribe to the same product (whether cancelled or active)
      if (currentSubscription.productId === targetProductId) {
        return {
          canUpgrade: false,
          isDowngrade: false,
          currentTier: currentSubscription.productId,
        };
      }

      // Check renewalInfo for pending upgrade (only for active, non-cancelled subscriptions)
      if (
        !isCurrentCancelled &&
        currentSubscription.renewalInfoIOS?.pendingUpgradeProductId ===
          targetProductId
      ) {
        return {
          canUpgrade: false,
          isDowngrade: false,
          currentTier: currentSubscription.productId,
          message: 'This upgrade will activate on your next renewal date',
          isPending: true,
        };
      }

      // Different product = upgrade or downgrade
      const currentTier = getSubscriptionTier(currentSubscription.productId);
      const targetTier = getSubscriptionTier(targetProductId);

      // If cancelled, don't allow tier changes (user should reactivate or wait for expiry)
      if (isCurrentCancelled) {
        return {
          canUpgrade: false,
          isDowngrade: false,
          currentTier: currentSubscription.productId,
          message: 'Reactivate current subscription or wait until it expires',
        };
      }

      // Active subscription: allow upgrades and downgrades
      const canUpgrade = targetTier > currentTier;
      const isDowngrade = targetTier < currentTier;

      return {
        canUpgrade,
        isDowngrade,
        currentTier: currentSubscription.productId,
        message: canUpgrade
          ? 'Upgrade available'
          : isDowngrade
          ? 'Downgrade option'
          : undefined,
      };
    },
    [getCurrentSubscription, isCancelled],
  );

  const handleSubscription = useCallback(
    (itemId: string) => {
      const upgradeInfo = getUpgradeInfo(itemId);
      const currentSubscription = getCurrentSubscription();
      const isSubscribed = activeSubscriptions.some(
        (sub) => sub.productId === itemId,
      );
      const isProductCancelled = isCancelled(itemId);

      // If trying to reactivate cancelled subscription
      if (isSubscribed && isProductCancelled) {
        Alert.alert(
          'Reactivate Subscription',
          'This subscription is cancelled but still active until expiry. Do you want to reactivate it?',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Reactivate', onPress: () => onSubscribe(itemId)},
          ],
        );
        return;
      }

      // If already subscribed (and not cancelled)
      if (isSubscribed && !isProductCancelled) {
        Alert.alert(
          'Already Subscribed',
          'You already have an active subscription to this product.',
          [{text: 'OK', style: 'default'}],
        );
        return;
      }

      // If upgrade is pending
      if (upgradeInfo.isPending) {
        Alert.alert(
          'Upgrade Scheduled',
          upgradeInfo.message ||
            'This subscription upgrade is already scheduled.',
          [{text: 'OK', style: 'default'}],
        );
        return;
      }

      // If upgrade available
      if (upgradeInfo.canUpgrade) {
        const currentProduct = subscriptions.find(
          (s) => s.id === currentSubscription?.productId,
        );
        const targetProduct = subscriptions.find((s) => s.id === itemId);

        Alert.alert(
          'Upgrade Subscription',
          `Upgrade from ${currentProduct?.title || 'current plan'} to ${
            targetProduct?.title || 'new plan'
          }?\n\n✅ Takes effect immediately\n💰 Pro-rated refund applied`,
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Upgrade Now', onPress: () => onSubscribe(itemId)},
          ],
        );
        return;
      }

      // If downgrade available
      if (upgradeInfo.isDowngrade) {
        const currentProduct = subscriptions.find(
          (s) => s.id === currentSubscription?.productId,
        );
        const targetProduct = subscriptions.find((s) => s.id === itemId);

        Alert.alert(
          'Downgrade Subscription',
          `Downgrade from ${currentProduct?.title || 'current plan'} to ${
            targetProduct?.title || 'new plan'
          }?\n\n⏰ Takes effect at next renewal date\n📅 Current subscription continues until then`,
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Downgrade', onPress: () => onSubscribe(itemId)},
          ],
        );
        return;
      }

      // Normal subscription (no current subscription)
      onSubscribe(itemId);
    },
    [
      activeSubscriptions,
      getCurrentSubscription,
      getUpgradeInfo,
      isCancelled,
      onSubscribe,
      subscriptions,
    ],
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
      'subscriptionOffers' in subscription &&
      subscription.subscriptionOffers
    ) {
      // Cross-platform subscription pricing structure
      const offers = subscription.subscriptionOffers;
      if (offers.length > 0) {
        // Use displayPrice from offer or fallback to pricingPhasesAndroid
        if (offers[0].displayPrice) {
          return offers[0].displayPrice;
        }
        const pricingPhases = offers[0].pricingPhasesAndroid;
        if (pricingPhases && pricingPhases.pricingPhaseList.length > 0) {
          return pricingPhases.pricingPhaseList[0].formattedPrice;
        }
      }
      return subscription.displayPrice;
    } else {
      // Fallback to subscription displayPrice
      return subscription.displayPrice;
    }
  };

  const handleManageSubscriptions = useCallback(() => {
    onManageSubscriptions();
  }, [onManageSubscriptions]);

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
      'subscriptionOffers' in subscription &&
      subscription.subscriptionOffers
    ) {
      const offers = subscription.subscriptionOffers;
      if (offers.length > 0) {
        // Use period from offer if available
        if (offers[0].period) {
          return `${offers[0].period.value} ${offers[0].period.unit}`;
        }
        // Fallback to pricingPhasesAndroid
        const pricingPhases = offers[0].pricingPhasesAndroid;
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
        <ScrollView style={styles.subscriptionDetailsScroll}>
          {/* Basic Info */}
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Basic Info</Text>
            <Text style={styles.detailRow}>ID: {subscription.id}</Text>
            <Text style={styles.detailRow}>Title: {subscription.title}</Text>
            <Text style={styles.detailRow}>
              Price: {subscription.displayPrice}
            </Text>
            <Text style={styles.detailRow}>
              Platform: {subscription.platform}
            </Text>
          </View>

          {/* iOS Discounts */}
          {'discountsIOS' in subscription &&
            subscription.discountsIOS &&
            Array.isArray(subscription.discountsIOS) &&
            subscription.discountsIOS.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>
                  iOS Discounts ({subscription.discountsIOS.length})
                </Text>
                {subscription.discountsIOS.map((discount, idx) => (
                  <View key={idx} style={styles.offerCard}>
                    <Text style={styles.offerTitle}>{discount.identifier}</Text>
                    <Text style={styles.offerDetail}>
                      Type: {discount.type}
                    </Text>
                    <Text style={styles.offerDetail}>
                      Price: {discount.localizedPrice || discount.price}
                    </Text>
                    <Text style={styles.offerDetail}>
                      Payment Mode: {discount.paymentMode}
                    </Text>
                    <Text style={styles.offerDetail}>
                      Periods: {discount.numberOfPeriods}
                    </Text>
                  </View>
                ))}
              </View>
            )}

          {/* iOS Subscription Info */}
          {'subscriptionInfoIOS' in subscription &&
            subscription.subscriptionInfoIOS && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>
                  iOS Subscription Info
                </Text>
                <View style={styles.offerCard}>
                  {subscription.subscriptionInfoIOS.subscriptionPeriod && (
                    <Text style={styles.offerDetail}>
                      Period:{' '}
                      {
                        subscription.subscriptionInfoIOS.subscriptionPeriod
                          .value
                      }{' '}
                      {subscription.subscriptionInfoIOS.subscriptionPeriod.unit}
                    </Text>
                  )}
                  {subscription.subscriptionInfoIOS.introductoryOffer && (
                    <>
                      <Text style={styles.offerSubtitle}>
                        Introductory Offer:
                      </Text>
                      <Text style={styles.offerDetail}>
                        Price:{' '}
                        {
                          subscription.subscriptionInfoIOS.introductoryOffer
                            .displayPrice
                        }
                      </Text>
                      <Text style={styles.offerDetail}>
                        Mode:{' '}
                        {
                          subscription.subscriptionInfoIOS.introductoryOffer
                            .paymentMode
                        }
                      </Text>
                      <Text style={styles.offerDetail}>
                        Periods:{' '}
                        {
                          subscription.subscriptionInfoIOS.introductoryOffer
                            .periodCount
                        }
                      </Text>
                    </>
                  )}
                  {subscription.subscriptionInfoIOS.promotionalOffers &&
                    subscription.subscriptionInfoIOS.promotionalOffers.length >
                      0 && (
                      <>
                        <Text style={styles.offerSubtitle}>
                          Promotional Offers (
                          {
                            subscription.subscriptionInfoIOS.promotionalOffers
                              .length
                          }
                          ):
                        </Text>
                        {subscription.subscriptionInfoIOS.promotionalOffers.map(
                          (promo, idx) => (
                            <View key={idx} style={styles.nestedOfferCard}>
                              <Text style={styles.offerDetail}>
                                ID: {promo.id}
                              </Text>
                              <Text style={styles.offerDetail}>
                                Price: {promo.displayPrice}
                              </Text>
                              <Text style={styles.offerDetail}>
                                Mode: {promo.paymentMode}
                              </Text>
                            </View>
                          ),
                        )}
                      </>
                    )}
                </View>
              </View>
            )}

          {/* Subscription Offers (Cross-platform) */}
          {'subscriptionOffers' in subscription &&
            subscription.subscriptionOffers &&
            subscription.subscriptionOffers.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>
                  Subscription Offers ({subscription.subscriptionOffers.length})
                </Text>
                {subscription.subscriptionOffers.map((offer, idx) => (
                  <View key={offer.id} style={styles.offerCard}>
                    <Text style={styles.offerTitle}>
                      {offer.basePlanIdAndroid ?? offer.id}
                      {offer.id &&
                      offer.basePlanIdAndroid &&
                      offer.id !== offer.basePlanIdAndroid
                        ? ` - ${offer.id}`
                        : ''}
                    </Text>
                    <Text style={styles.offerDetail}>
                      Price: {offer.displayPrice}
                    </Text>
                    {offer.paymentMode && (
                      <Text style={styles.offerDetail}>
                        Payment Mode: {offer.paymentMode}
                      </Text>
                    )}
                    {offer.period && (
                      <Text style={styles.offerDetail}>
                        Period: {offer.period.value} {offer.period.unit}
                      </Text>
                    )}
                    {offer.periodCount && (
                      <Text style={styles.offerDetail}>
                        Period Count: {offer.periodCount}
                      </Text>
                    )}
                    {offer.pricingPhasesAndroid?.pricingPhaseList?.map(
                      (phase, phaseIdx) => (
                        <View key={phaseIdx} style={styles.nestedOfferCard}>
                          <Text style={styles.offerDetail}>
                            Price: {phase.formattedPrice}
                          </Text>
                          <Text style={styles.offerDetail}>
                            Period: {phase.billingPeriod}
                          </Text>
                          <Text style={styles.offerDetail}>
                            Cycles: {phase.billingCycleCount}
                          </Text>
                          <Text style={styles.offerDetail}>
                            Recurrence: {phase.recurrenceMode}
                          </Text>
                        </View>
                      ),
                    )}
                    {offer.offerTagsAndroid &&
                      offer.offerTagsAndroid.length > 0 && (
                        <Text style={styles.offerDetail}>
                          Tags: {offer.offerTagsAndroid.join(', ')}
                        </Text>
                      )}
                  </View>
                ))}
              </View>
            )}

          {/* Discount Offers (Cross-platform) */}
          {'discountOffers' in subscription &&
            subscription.discountOffers &&
            subscription.discountOffers.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>
                  Discount Offers ({subscription.discountOffers.length})
                </Text>
                {subscription.discountOffers.map((offer, idx) => (
                  <View key={offer.id || idx} style={styles.offerCard}>
                    <Text style={styles.offerTitle}>
                      {offer.id || `Offer ${idx + 1}`}
                    </Text>
                    <Text style={styles.offerDetail}>
                      Price: {offer.displayPrice}
                    </Text>
                    {offer.fullPriceMicrosAndroid && (
                      <Text style={styles.offerDetail}>
                        Full Price (micros): {offer.fullPriceMicrosAndroid}
                      </Text>
                    )}
                    {offer.percentageDiscountAndroid && (
                      <Text style={styles.offerDetail}>
                        {offer.percentageDiscountAndroid}% off
                      </Text>
                    )}
                    {offer.formattedDiscountAmountAndroid && (
                      <Text style={styles.offerDetail}>
                        Discount: {offer.formattedDiscountAmountAndroid}
                      </Text>
                    )}
                    {offer.validTimeWindowAndroid && (
                      <Text style={styles.offerDetail}>
                        Valid:{' '}
                        {new Date(
                          Number(offer.validTimeWindowAndroid.startTimeMillis),
                        ).toLocaleDateString()}{' '}
                        -{' '}
                        {new Date(
                          Number(offer.validTimeWindowAndroid.endTimeMillis),
                        ).toLocaleDateString()}
                      </Text>
                    )}
                    {offer.offerTagsAndroid &&
                      offer.offerTagsAndroid.length > 0 && (
                        <Text style={styles.offerDetail}>
                          Tags: {offer.offerTagsAndroid.join(', ')}
                        </Text>
                      )}
                  </View>
                ))}
              </View>
            )}

          {/* Raw JSON section */}
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Raw JSON</Text>
            <View style={styles.jsonContainer}>
              <Text style={styles.jsonText}>{jsonString}</Text>
            </View>
          </View>
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
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Subscription Flow</Text>
            <Text style={styles.subtitle}>
              TypeScript-first approach for subscriptions
            </Text>
          </View>
          <TouchableOpacity
            style={styles.headerRefreshButton}
            onPress={handleRefreshStatus}
            disabled={isCheckingStatus}
          >
            {isCheckingStatus ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Text style={styles.headerRefreshIcon}>🔄</Text>
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            Store: {connected ? '✅ Connected' : '❌ Disconnected'}
          </Text>
          <Text style={styles.statusText}>
            Platform: {Platform.OS === 'ios' ? '🍎 iOS' : '🤖 Android'}
          </Text>
        </View>

        {/* Verification Method Selector */}
        <View style={styles.verificationContainer}>
          <Text style={styles.statusLabel}>Purchase Verification:</Text>
          <TouchableOpacity
            style={styles.verificationButton}
            onPress={onChangeVerificationMethod}
          >
            <Text style={styles.verificationButtonText}>
              {verificationMethod === 'ignore'
                ? '❌ None (Skip)'
                : verificationMethod === 'local'
                ? '📱 Local (Device)'
                : '☁️ IAPKit (Server)'}
            </Text>
            <Text style={styles.verificationButtonIcon}>▼</Text>
          </TouchableOpacity>
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

                {Platform.OS === 'ios' && sub.renewalInfoIOS ? (
                  <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>Auto-Renew:</Text>
                    <Text
                      style={[
                        styles.statusValue,
                        sub.renewalInfoIOS.willAutoRenew
                          ? styles.activeStatus
                          : styles.cancelledStatus,
                      ]}
                    >
                      {sub.renewalInfoIOS.willAutoRenew
                        ? '✅ Enabled'
                        : '⚠️ Cancelled'}
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

                {/* Next Renewal/Upgrade Information - iOS renewalInfo */}
                {Platform.OS === 'ios' && sub.renewalInfoIOS ? (
                  <>
                    {sub.renewalInfoIOS.pendingUpgradeProductId &&
                    sub.renewalInfoIOS.pendingUpgradeProductId !==
                      sub.productId ? (
                      <View style={styles.renewalInfoBox}>
                        <Text style={styles.renewalInfoTitle}>
                          🔄 Next Renewal
                        </Text>
                        <View style={styles.statusRow}>
                          <Text style={styles.statusLabel}>Upgrading to:</Text>
                          <Text
                            style={[styles.statusValue, styles.highlightText]}
                          >
                            {getSubscriptionTitle(
                              sub.renewalInfoIOS?.pendingUpgradeProductId,
                            )}
                          </Text>
                        </View>
                        {sub.expirationDateIOS ? (
                          <View style={styles.statusRow}>
                            <Text style={styles.statusLabel}>
                              Activation Date:
                            </Text>
                            <Text style={styles.statusValue}>
                              {new Date(
                                sub.expirationDateIOS,
                              ).toLocaleDateString()}
                            </Text>
                          </View>
                        ) : null}
                        <Text style={styles.renewalInfoNote}>
                          💡 Your subscription will automatically upgrade when
                          the current period ends.
                        </Text>
                      </View>
                    ) : sub.renewalInfoIOS.autoRenewPreference &&
                      sub.renewalInfoIOS.autoRenewPreference !==
                        sub.productId ? (
                      <View style={styles.renewalInfoBox}>
                        <Text style={styles.renewalInfoTitle}>
                          🔄 Next Renewal
                        </Text>
                        <View style={styles.statusRow}>
                          <Text style={styles.statusLabel}>Will renew as:</Text>
                          <Text
                            style={[styles.statusValue, styles.highlightText]}
                          >
                            {subscriptions.find(
                              (s) =>
                                s.id ===
                                sub.renewalInfoIOS?.autoRenewPreference,
                            )?.title || sub.renewalInfoIOS.autoRenewPreference}
                          </Text>
                        </View>
                        {sub.expirationDateIOS ? (
                          <View style={styles.statusRow}>
                            <Text style={styles.statusLabel}>
                              Renewal Date:
                            </Text>
                            <Text style={styles.statusValue}>
                              {new Date(
                                sub.expirationDateIOS,
                              ).toLocaleDateString()}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                  </>
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

          {/* Subscription Upgrade Detection - iOS renewalInfo */}
          {(() => {
            if (Platform.OS !== 'ios' || activeSubscriptions.length === 0) {
              return null;
            }

            const upgradableSubscriptions = activeSubscriptions.filter(
              (sub) => {
                const pendingProductId =
                  sub.renewalInfoIOS?.pendingUpgradeProductId;

                // Show upgrade card if there's a pending upgrade product that's different
                // from the current product. In production, you might want to also check
                // willAutoRenew, but Apple Sandbox behavior can be inconsistent.
                return pendingProductId && pendingProductId !== sub.productId;
              },
            );

            if (upgradableSubscriptions.length === 0) {
              return null;
            }

            return (
              <View style={styles.upgradeDetectionCard}>
                <Text style={styles.upgradeDetectionTitle}>
                  🎉 Subscription Upgrade Detected
                </Text>
                {upgradableSubscriptions.map((subscription, idx) => {
                  const renewalInfo = subscription.renewalInfoIOS;
                  const currentProduct = subscriptions.find(
                    (s) => s.id === subscription.productId,
                  );

                  return (
                    <View key={idx} style={styles.upgradeInfoBox}>
                      <View style={styles.upgradeRow}>
                        <Text style={styles.upgradeLabel}>Current:</Text>
                        <Text style={styles.upgradeValue}>
                          {currentProduct?.title || subscription.productId}
                        </Text>
                      </View>
                      <View style={styles.upgradeArrow}>
                        <Text style={styles.upgradeArrowText}>⬇️</Text>
                      </View>
                      <View style={styles.upgradeRow}>
                        <Text style={styles.upgradeLabel}>Upgrading to:</Text>
                        <Text
                          style={[styles.upgradeValue, styles.highlightText]}
                        >
                          {getSubscriptionTitle(
                            renewalInfo?.pendingUpgradeProductId,
                          )}
                        </Text>
                      </View>
                      {subscription.expirationDateIOS ? (
                        <View style={styles.upgradeRow}>
                          <Text style={styles.upgradeLabel}>Upgrade Date:</Text>
                          <Text style={styles.upgradeValue}>
                            {new Date(
                              subscription.expirationDateIOS,
                            ).toLocaleDateString()}
                          </Text>
                        </View>
                      ) : null}
                      {renewalInfo?.willAutoRenew !== undefined ? (
                        <View style={styles.upgradeRow}>
                          <Text style={styles.upgradeLabel}>Auto-Renew:</Text>
                          <Text
                            style={[
                              styles.upgradeValue,
                              renewalInfo.willAutoRenew
                                ? styles.activeStatus
                                : styles.cancelledStatus,
                            ]}
                          >
                            {renewalInfo.willAutoRenew
                              ? '✅ Enabled'
                              : '⚠️ Disabled'}
                          </Text>
                        </View>
                      ) : null}
                      <Text style={styles.upgradeNote}>
                        💡 Your subscription will automatically upgrade when the
                        current period ends.
                        {renewalInfo?.willAutoRenew === false
                          ? ' Note: Auto-renew is currently disabled.'
                          : ''}
                      </Text>

                      {/* Show renewalInfo details */}
                      <TouchableOpacity
                        style={styles.viewRenewalInfoButton}
                        onPress={() => {
                          Alert.alert(
                            'Renewal Info Details',
                            JSON.stringify(renewalInfo, null, 2),
                            [{text: 'OK'}],
                          );
                        }}
                      >
                        <Text style={styles.viewRenewalInfoButtonText}>
                          📋 View renewalInfo
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            );
          })()}

          {/* Subscription Cancellation Detection - iOS renewalInfo */}
          {(() => {
            if (Platform.OS !== 'ios') {
              return null;
            }

            const cancelledSubscriptions = activeSubscriptions.filter((sub) => {
              return (
                sub.renewalInfoIOS?.willAutoRenew === false &&
                !sub.renewalInfoIOS?.pendingUpgradeProductId
              );
            });

            if (cancelledSubscriptions.length === 0) {
              return null;
            }

            return (
              <View style={styles.cancellationDetectionCard}>
                <Text style={styles.cancellationDetectionTitle}>
                  ⚠️ Subscription Cancelled
                </Text>
                {cancelledSubscriptions.map((subscription, idx) => {
                  const renewalInfo = subscription.renewalInfoIOS;
                  const currentProduct = subscriptions.find(
                    (s) => s.id === subscription.productId,
                  );
                  const preferredProduct = subscriptions.find(
                    (s) => s.id === renewalInfo?.autoRenewPreference,
                  );

                  return (
                    <View key={idx} style={styles.cancellationInfoBox}>
                      <View style={styles.upgradeRow}>
                        <Text style={styles.upgradeLabel}>Product:</Text>
                        <Text style={styles.upgradeValue}>
                          {currentProduct?.title || subscription.productId}
                        </Text>
                      </View>
                      {subscription.expirationDateIOS ? (
                        <View style={styles.upgradeRow}>
                          <Text style={styles.upgradeLabel}>Expires:</Text>
                          <Text
                            style={[styles.upgradeValue, styles.expiredText]}
                          >
                            {new Date(
                              subscription.expirationDateIOS,
                            ).toLocaleDateString()}
                          </Text>
                        </View>
                      ) : null}
                      {renewalInfo?.pendingUpgradeProductId &&
                      renewalInfo.pendingUpgradeProductId !==
                        subscription.productId ? (
                        <View style={styles.upgradeRow}>
                          <Text style={styles.upgradeLabel}>Next Renewal:</Text>
                          <Text style={styles.upgradeValue}>
                            {preferredProduct?.title ||
                              renewalInfo.autoRenewPreference ||
                              'None'}
                          </Text>
                        </View>
                      ) : null}
                      <Text style={styles.cancellationNote}>
                        💡 Your subscription will not auto-renew. You'll have
                        access until the expiration date.
                      </Text>

                      {/* Show renewalInfo details */}
                      <TouchableOpacity
                        style={styles.viewRenewalInfoButton}
                        onPress={() => {
                          Alert.alert(
                            'Renewal Info Details',
                            JSON.stringify(renewalInfo, null, 2),
                            [{text: 'OK'}],
                          );
                        }}
                      >
                        <Text style={styles.viewRenewalInfoButtonText}>
                          📋 View renewalInfo
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            );
          })()}

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
          subscriptions.map((subscription) => {
            const isSubscribed = activeSubscriptions.some(
              (sub) => sub.productId === subscription.id,
            );
            const isPending = isPendingUpgrade(subscription.id);
            const upgradeInfo = getUpgradeInfo(subscription.id);
            const isProductCancelled = isCancelled(subscription.id);

            // Determine button state and text
            let buttonText = 'Subscribe';
            let buttonStyles = [styles.subscribeButton];
            let buttonDisabled = isProcessing || !connected;

            if (isProcessing) {
              buttonText = 'Processing...';
              buttonDisabled = true;
            } else if (isPending) {
              buttonText = '⏳ Scheduled';
              buttonStyles = [styles.pendingButton];
              buttonDisabled = true;
            } else if (isSubscribed && !isProductCancelled) {
              buttonText = '✅ Subscribed';
              buttonStyles = [styles.subscribedButton];
              buttonDisabled = true;
            } else if (isSubscribed && isProductCancelled) {
              buttonText = '🔄 Reactivate';
              buttonStyles = [styles.reactivateButton];
              buttonDisabled = false;
            } else if (upgradeInfo.canUpgrade) {
              buttonText = '⬆️ Upgrade';
              buttonStyles = [styles.upgradeButton];
              buttonDisabled = false;
            } else if (upgradeInfo.isDowngrade) {
              buttonText = '⬇️ Downgrade';
              buttonStyles = [styles.downgradeButton];
              buttonDisabled = false;
            }

            return (
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
                  {/* Show upgrade/downgrade/cancelled info */}
                  {upgradeInfo.message ? (
                    <View style={styles.upgradeBadge}>
                      <Text style={styles.upgradeText}>
                        {upgradeInfo.message}
                      </Text>
                    </View>
                  ) : null}
                  {isProductCancelled ? (
                    <View style={styles.cancelledBadge}>
                      <Text style={styles.cancelledText}>
                        ⚠️ Cancelled (active until expiry)
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
                      ...buttonStyles,
                      buttonDisabled && styles.disabledButton,
                    ]}
                    onPress={() => handleSubscription(subscription.id)}
                    disabled={buttonDisabled}
                  >
                    <Text
                      style={[
                        styles.subscribeButtonText,
                        (isSubscribed || isPending) &&
                          styles.subscribedButtonText,
                      ]}
                    >
                      {buttonText}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
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

/**
 * SubscriptionFlowContainer - Main Subscription IAP Flow Controller
 *
 * ============================================================
 * Subscription Flow Steps:
 * ============================================================
 * 1. initConnection     - Store connection (useIAP handles automatically)
 * 2. subscribeEvent     - Listen for purchase events (onPurchaseSuccess/Error)
 * 3. requestPurchase    - Apple: {sku}, Google: {skus, subscriptionOffers}
 * 4. verifyPurchase     - ignore | local | iapkit
 * 5. grant entitlement  - Update activeSubscriptions state
 * 6. finish transaction - finishTransaction({purchase, isConsumable: false})
 *
 * ============================================================
 * Platform Comparison (Subscription Info Availability):
 * ============================================================
 * | Information              | iOS Client | Android Client | Server |
 * |--------------------------|------------|----------------|--------|
 * | Auto-renew status        | willAutoRenew | isAutoRenewing | Yes |
 * | Next renewal product     | autoRenewPreference | No      | Yes    |
 * | Pending upgrade/downgrade| pendingUpgradeProductId | No  | Yes    |
 * | Expiration reason        | expirationReason | No        | Yes    |
 * | Grace period status      | gracePeriodExpirationDate | No| Yes   |
 * | Billing retry status     | isInBillingRetry | No        | Yes    |
 *
 * Key: iOS provides rich client-side data, Android needs server calls
 *
 * ============================================================
 * When to Validate (Server-side recommended):
 * ============================================================
 * - After purchase: Verify the purchase is legitimate
 * - On restore: Check current status (active/cancelled/refunded/expired)
 * - Periodically: Detect refunds and cancellations
 * - On app launch: Sync subscription state with server
 */
function SubscriptionFlowContainer() {
  // ============================================================
  // State Management
  // ============================================================
  const [purchaseResult, setPurchaseResult] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [lastPurchase, setLastPurchase] = useState<Purchase | null>(null);
  const [verificationMethod, setVerificationMethod] =
    useState<VerificationMethod>('ignore');
  const verificationMethodRef = useRef<VerificationMethod>(verificationMethod);

  // Keep ref in sync with state
  useEffect(() => {
    verificationMethodRef.current = verificationMethod;
  }, [verificationMethod]);

  const {showActionSheetWithOptions} = useActionSheet();

  const isHandlingPurchaseRef = useRef(false);
  const isCheckingStatusRef = useRef(false);
  const didFetchSubsRef = useRef(false);

  const resetHandlingState = useCallback(() => {
    isHandlingPurchaseRef.current = false;
  }, []);

  // ============================================================
  // Step 1: initConnection (automatic)
  // Step 2: subscribeEvent (onPurchaseSuccess, onPurchaseError)
  // ============================================================
  const {
    connected,
    subscriptions,
    fetchProducts,
    finishTransaction,
    getActiveSubscriptions,
    activeSubscriptions,
    verifyPurchase,
    verifyPurchaseWithProvider,
  } = useIAP({
    // ------------------------------------------------------------
    // Step 2: onPurchaseSuccess - New Purchase Flow
    // iOS: Check transactionState (purchased/pending/failed/deferred)
    // Android: purchaseState check
    // ------------------------------------------------------------
    onPurchaseSuccess: async (purchase) => {
      const {purchaseToken: tokenToMask, ...rest} = purchase as any;
      const masked = {
        ...rest,
        ...(tokenToMask ? {purchaseToken: 'hidden'} : {}),
      };
      console.log('Subscription successful:', masked);
      console.log('[SubscriptionFlow] onPurchaseSuccess called');
      console.log(
        '[SubscriptionFlow] Current verificationMethod ref:',
        verificationMethodRef.current,
      );
      setLastPurchase(purchase);

      if (isHandlingPurchaseRef.current) {
        console.log('Already handling a purchase, skipping duplicate callback');
        console.log(
          '[SubscriptionFlow] Early return: already handling purchase',
        );
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
        const hasValidToken = !!(
          purchase.purchaseToken &&
          typeof purchase.purchaseToken === 'string' &&
          purchase.purchaseToken.length > 0
        );
        const hasValidTransactionId = !!(purchase.id && purchase.id.length > 0);

        isPurchased = hasValidToken || hasValidTransactionId;
        isRestoration = Boolean(
          'originalTransactionIdentifierIOS' in purchase &&
            purchase.originalTransactionIdentifierIOS &&
            purchase.originalTransactionIdentifierIOS !== purchase.id &&
            'transactionReasonIOS' in purchase &&
            purchase.transactionReasonIOS &&
            purchase.transactionReasonIOS !== 'PURCHASE',
        );

        console.log('iOS Purchase Analysis:');
        console.log('  hasValidToken:', hasValidToken);
        console.log('  hasValidTransactionId:', hasValidTransactionId);
        console.log('  isPurchased:', isPurchased);
        console.log('  isRestoration:', isRestoration);
        console.log(
          '  originalTransactionId:',
          'originalTransactionIdentifierIOS' in purchase
            ? purchase.originalTransactionIdentifierIOS
            : undefined,
        );
        console.log('  currentTransactionId:', purchase.id);
        console.log(
          '  transactionReason:',
          'transactionReasonIOS' in purchase
            ? purchase.transactionReasonIOS
            : undefined,
        );
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

      // ------------------------------------------------------------
      // Restoring Purchases Flow
      // iOS: StoreKit fetches from Apple ID's purchase history
      // Android: queryPurchases returns purchase history
      // Note: iOS requires "Restore Purchases" button per App Store guidelines
      // ------------------------------------------------------------
      if (isRestoration) {
        console.log(
          '[SubscriptionFlow] This is a restoration, skipping verification',
        );
        setPurchaseResult('Subscription restored successfully.');

        // Step 6: finish transaction (restoration)
        try {
          await finishTransaction({
            purchase,
            isConsumable: false,
          });
        } catch (error) {
          console.warn('finishTransaction failed during restoration:', error);
        }

        console.log('✅ Subscription restoration completed');

        // Step 5: grant entitlement - refresh active subscriptions
        try {
          await getActiveSubscriptions();
        } catch (error) {
          console.warn('Failed to refresh status:', error);
        }

        resetHandlingState();
        return;
      }
      console.log(
        '[SubscriptionFlow] Not a restoration, proceeding to verification check',
      );

      setPurchaseResult('Subscription activated successfully.');

      const productId = purchase.productId;

      // ------------------------------------------------------------
      // Step 4: verifyPurchase - 3 methods available
      //   - ignore: Skip verification (for testing only)
      //   - local: Verify with Apple/Google directly (client-side)
      //   - iapkit: Verify using IAPKit service (server-side, recommended)
      //
      // Server-side validation recommended for:
      //   iOS: App Store Server API + Server Notifications V2
      //   Android: Google Play Developer API + RTDN
      // ------------------------------------------------------------
      const currentVerificationMethod = verificationMethodRef.current;
      console.log('[SubscriptionFlow] About to verify purchase:', {
        verificationMethod: currentVerificationMethod,
        productId,
        willVerify: currentVerificationMethod !== 'ignore' && !!productId,
      });

      if (currentVerificationMethod !== 'ignore' && productId) {
        setIsProcessing(true);
        try {
          if (currentVerificationMethod === 'local') {
            console.log('[SubscriptionFlow] Verifying with local method...');
            // All platform options can be provided - the library handles platform detection internally
            const result = await verifyPurchase({
              apple: {sku: productId},
              google: {
                sku: productId,
                packageName: 'dev.anthropic.iapexample',
                purchaseToken: purchase.purchaseToken ?? '',
                accessToken: '', // ⚠️ Requires server-issued OAuth token
                isSub: true,
              },
              // horizon: { sku: productId, userId: '', accessToken: '' }
            });
            console.log(
              '[SubscriptionFlow] Local verification result:',
              result,
            );
          } else if (currentVerificationMethod === 'iapkit') {
            console.log('[SubscriptionFlow] Verifying with IAPKit...');
            // Note: apiKey is automatically injected from config plugin (iapkitApiKey)
            // No need to manually pass it - expo-iap reads it from Constants.expoConfig.extra.iapkitApiKey

            console.log(
              '[SubscriptionFlow] purchase.purchaseToken:',
              purchase.purchaseToken &&
                typeof purchase.purchaseToken === 'string'
                ? `✓ Present (${purchase.purchaseToken.length} chars)`
                : '✗ Missing or empty',
            );

            const jwsOrToken = purchase.purchaseToken ?? '';
            if (!jwsOrToken) {
              console.warn(
                '[SubscriptionFlow] No purchaseToken/JWS available for verification',
              );
              throw new Error(
                'No purchase token available for IAPKit verification',
              );
            }

            // apiKey is auto-filled from config plugin - no need to specify it
            const verifyRequest: VerifyPurchaseWithProviderProps = {
              provider: 'iapkit',
              iapkit: {
                apple: {
                  jws: jwsOrToken,
                },
                google: {
                  purchaseToken: jwsOrToken,
                },
              },
            };

            console.log(
              '[SubscriptionFlow] Sending IAPKit verification request:',
              JSON.stringify(
                {
                  provider: verifyRequest.provider,
                  iapkit: {
                    ...(Platform.OS === 'ios'
                      ? {apple: {jws: `${jwsOrToken.substring(0, 50)}...`}}
                      : {
                          google: {
                            purchaseToken: `${jwsOrToken.substring(0, 50)}...`,
                          },
                        }),
                  },
                },
                null,
                2,
              ),
            );

            const result = await verifyPurchaseWithProvider(verifyRequest);
            console.log(
              '[SubscriptionFlow] IAPKit verification result:',
              result,
            );

            // Show verification result to user
            if (result.iapkit) {
              const iapkitResult = result.iapkit;
              const statusEmoji = iapkitResult.isValid ? '✅' : '⚠️';
              const stateText = iapkitResult.state || 'unknown';

              Alert.alert(
                `${statusEmoji} IAPKit Verification`,
                `Valid: ${iapkitResult.isValid}\nState: ${stateText}\nStore: ${
                  iapkitResult.store || 'unknown'
                }`,
              );
            }
          }
        } catch (error) {
          console.warn('[SubscriptionFlow] Verification failed:', error);
          Alert.alert(
            'Verification Failed',
            `Purchase verification failed: ${extractErrorMessage(error)}`,
          );
        } finally {
          setIsProcessing(false);
        }
      }

      // ------------------------------------------------------------
      // Step 6: finish transaction
      // IMPORTANT: Must call finishTransaction to complete the purchase
      // Subscriptions are NOT consumable (isConsumable: false)
      // ------------------------------------------------------------
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

      // ------------------------------------------------------------
      // Step 5: grant entitlement
      // Refresh active subscriptions to update UI state
      // getActiveSubscriptions: Returns only currently active subscriptions
      // ------------------------------------------------------------
      try {
        await getActiveSubscriptions();
      } catch (error) {
        console.warn('Failed to refresh status:', error);
      }

      resetHandlingState();
      setIsProcessing(false);
    },
    // ------------------------------------------------------------
    // Step 2: onPurchaseError callback
    // Handle purchase failures (user cancelled, payment failed, etc.)
    // ------------------------------------------------------------
    onPurchaseError: (error: PurchaseError) => {
      console.error('Subscription failed:', error);
      setIsProcessing(false);
      resetHandlingState();
      setPurchaseResult(`Subscription failed: ${error.message}`);
    },
  });

  // ============================================================
  // Checking Subscription Status (Periodically)
  // ============================================================
  // iOS: getActiveSubscriptions returns ActiveSubscriptionIOS with:
  //   - isActive: true -> grant access
  //   - renewalInfoIOS.willAutoRenew: false -> show renewal prompt
  //   - renewalInfoIOS.isInBillingRetry: true -> show payment issue
  //   - renewalInfoIOS.pendingUpgradeProductId -> show pending change
  //   - expirationDate -> show expiry info
  // Android: Limited client-side info, use server for details
  // ============================================================
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

  // ============================================================
  // On App Launch - Fetch Products
  // ============================================================
  useEffect(() => {
    const subscriptionIds = SUBSCRIPTION_PRODUCT_IDS;

    if (connected && !didFetchSubsRef.current) {
      didFetchSubsRef.current = true;
      console.log('Connected to store, loading subscription products...');
      fetchProducts({skus: subscriptionIds, type: 'subs'});
      console.log('Product loading request sent - waiting for results...');
    } else if (!connected) {
      didFetchSubsRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  // ============================================================
  // On App Launch - Check Existing Subscriptions
  // ============================================================
  // Check for existing subscriptions when the app starts.
  // This handles purchases made while the app was closed.
  // iOS: Transaction queue persists unfinished transactions
  // ============================================================
  useEffect(() => {
    if (connected && subscriptions.length > 0) {
      // Wait until subscriptions are loaded before checking status
      void handleRefreshStatus();
    }
  }, [connected, subscriptions.length, handleRefreshStatus]);

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

  // ============================================================
  // Step 3: requestPurchase - Subscription Purchase
  // ============================================================
  // Apple: { sku: productId }
  // Google: { skus: [productId], subscriptionOffers: [...] }
  //   - subscriptionOffers required for subscription purchases
  //   - Contains offerToken from subscriptionOfferDetailsAndroid
  // ============================================================
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

      // Extract Android subscription offers with offerToken
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
          // Apple subscription request
          apple: {
            sku: itemId,
          },
          // Google subscription request (requires subscriptionOffers)
          google: {
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

  const handleChangeVerificationMethod = useCallback(() => {
    const options = [
      'Ignore Verification',
      'Local Verification',
      'IAPKit Verification',
      'Cancel',
    ];
    const cancelButtonIndex = 3;

    showActionSheetWithOptions(
      {
        title: 'Select Purchase Verification Method',
        message:
          'Choose how to verify purchases after successful transactions.\n\n' +
          '• Ignore: Skip verification (for testing)\n' +
          '• Local: Verify with Apple/Google directly\n' +
          '• IAPKit: Verify using IAPKit service',
        options,
        cancelButtonIndex,
      },
      (selectedIndex?: number) => {
        switch (selectedIndex) {
          case 0:
            setVerificationMethod('ignore');
            break;
          case 1:
            setVerificationMethod('local');
            break;
          case 2:
            setVerificationMethod('iapkit');
            break;
        }
      },
    );
  }, [showActionSheetWithOptions]);

  return (
    <SubscriptionFlow
      connected={connected}
      subscriptions={subscriptions}
      activeSubscriptions={activeSubscriptions}
      purchaseResult={purchaseResult}
      isProcessing={isProcessing}
      isCheckingStatus={isCheckingStatus}
      lastPurchase={lastPurchase}
      onSubscribe={handleSubscription}
      onRetryLoadSubscriptions={handleRetryLoadSubscriptions}
      onRefreshStatus={handleRefreshStatus}
      onManageSubscriptions={handleManageSubscriptions}
      verificationMethod={verificationMethod}
      onChangeVerificationMethod={handleChangeVerificationMethod}
    />
  );
}

// Note: This is the default export required by Expo Router
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  headerLeft: {
    flex: 1,
  },
  headerRefreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  headerRefreshIcon: {
    fontSize: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 0,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  verificationContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginTop: 15,
  },
  verificationButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  verificationButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  verificationButtonIcon: {
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  subscribedButtonText: {
    color: '#fff',
  },
  pendingButton: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    opacity: 0.8,
  },
  pendingButtonText: {
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
  upgradeDetectionCard: {
    backgroundColor: '#fff5e6',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#ff9800',
  },
  upgradeDetectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e65100',
    marginBottom: 12,
  },
  upgradeInfoBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  upgradeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  upgradeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  upgradeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  highlightText: {
    color: '#ff9800',
    fontWeight: '700',
  },
  upgradeArrow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  upgradeArrowText: {
    fontSize: 24,
  },
  upgradeNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 12,
    lineHeight: 18,
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 6,
  },
  viewRenewalInfoButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  viewRenewalInfoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancellationDetectionCard: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#ffc107',
  },
  cancellationDetectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#856404',
    marginBottom: 12,
  },
  cancellationInfoBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  expiredText: {
    color: '#dc3545',
    fontWeight: '700',
  },
  cancellationNote: {
    fontSize: 12,
    color: '#856404',
    fontStyle: 'italic',
    marginTop: 12,
    lineHeight: 18,
    backgroundColor: '#fffbf0',
    padding: 8,
    borderRadius: 6,
  },
  renewalInfoBox: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  renewalInfoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1976d2',
    marginBottom: 8,
  },
  renewalInfoNote: {
    fontSize: 12,
    color: '#0d47a1',
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 18,
  },
  upgradeButton: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  downgradeButton: {
    backgroundColor: '#9e9e9e',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  reactivateButton: {
    backgroundColor: '#2196f3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  upgradeBadge: {
    backgroundColor: '#fff3e0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  upgradeText: {
    fontSize: 12,
    color: '#e65100',
    fontWeight: '600',
  },
  cancelledBadge: {
    backgroundColor: '#fff3cd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  cancelledText: {
    fontSize: 12,
    color: '#856404',
    fontWeight: '600',
  },
  subscriptionDetailsScroll: {
    flex: 1,
    marginBottom: 12,
  },
  detailSection: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 12,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  detailRow: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  offerCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  nestedOfferCard: {
    backgroundColor: '#e9ecef',
    borderRadius: 6,
    padding: 8,
    marginTop: 6,
    marginLeft: 8,
  },
  offerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 6,
  },
  offerSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
    marginTop: 8,
    marginBottom: 4,
  },
  offerDetail: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
});
