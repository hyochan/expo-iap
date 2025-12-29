import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import {
  useIAP,
  requestPurchase,
  initConnection,
  endConnection,
  presentExternalPurchaseLinkIOS,
  isBillingProgramAvailableAndroid,
  launchExternalLinkAndroid,
  createBillingProgramReportingDetailsAndroid,
  type Product,
  type Purchase,
  type BillingProgramAndroid,
} from '../../src';
import type {PurchaseError} from '../../src/utils/errorMapping';
import Loading from '../src/components/Loading';
import {CONSUMABLE_PRODUCT_IDS} from '../src/utils/constants';

/**
 * Alternative Billing Example
 *
 * Demonstrates alternative billing flows for iOS and Android:
 *
 * iOS (Alternative Billing):
 * - Redirects users to external website configured in app.config.ts
 * - No onPurchaseUpdated callback when using external URL
 * - User completes purchase on external website
 * - Must implement deep link to return to app
 *
 * Android (Alternative Billing Only):
 * - Step 1: Check availability with checkAlternativeBillingAvailabilityAndroid()
 * - Step 2: Show information dialog with showAlternativeBillingDialogAndroid()
 * - Step 3: Process payment in your payment system
 * - Step 4: Create token with createAlternativeBillingTokenAndroid()
 * - Must report token to Google Play backend within 24 hours
 * - No onPurchaseUpdated callback
 *
 * Android (User Choice Billing):
 * - Call requestPurchase() normally
 * - Google shows selection dialog automatically
 * - If user selects Google Play: onPurchaseUpdated callback
 * - If user selects alternative: No callback (manual flow required)
 */

type AndroidBillingFlow = 'billing-programs' | 'user-choice-billing';

// Billing programs that support external link flow (not user-choice-billing)
const EXTERNAL_BILLING_PROGRAMS: BillingProgramAndroid[] = [
  'external-offer',
  'external-payments',
  'external-content-link',
];

function AlternativeBillingScreen() {
  const [externalUrl, setExternalUrl] = useState('https://openiap.dev');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [billingProgram, setBillingProgram] =
    useState<BillingProgramAndroid>('external-offer');
  const [androidBillingFlow, setAndroidBillingFlow] =
    useState<AndroidBillingFlow>('billing-programs');
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [showProgramSelector, setShowProgramSelector] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState<string>('');
  const [lastPurchase, setLastPurchase] = useState<Purchase | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Initialize with billing program config (new API)
  const {connected, products, fetchProducts, finishTransaction} = useIAP({
    // New API: use enableBillingProgramAndroid instead of alternativeBillingModeAndroid
    enableBillingProgramAndroid:
      Platform.OS === 'android' ? billingProgram : undefined,
    onPurchaseSuccess: async (purchase: Purchase) => {
      console.log('Purchase successful:', purchase);
      setLastPurchase(purchase);
      setIsProcessing(false);

      const productId = purchase.productId ?? '';
      const isConsumable = CONSUMABLE_PRODUCT_IDS.includes(productId);

      setPurchaseResult(
        `✅ Purchase successful\nProduct: ${productId}\nTransaction ID: ${
          purchase.id
        }\nDate: ${new Date(purchase.transactionDate).toLocaleString()}`,
      );

      try {
        await finishTransaction({
          purchase,
          isConsumable,
        });
        console.log('Transaction finished');
      } catch (error) {
        console.warn('Failed to finish transaction:', error);
      }

      Alert.alert('Success', 'Purchase completed successfully!');
    },
    onPurchaseError: (error: PurchaseError) => {
      console.error('Purchase failed:', error);
      setIsProcessing(false);
      setPurchaseResult(`❌ Purchase failed: ${error.message}`);

      if (error.code !== 'user-cancelled') {
        Alert.alert('Error', error.message);
      }
    },
  });

  // Load products when connected
  useEffect(() => {
    if (connected) {
      fetchProducts({skus: CONSUMABLE_PRODUCT_IDS, type: 'in-app'}).catch(
        (error) => {
          console.error('Failed to load products:', error);
          Alert.alert('Error', 'Failed to load products');
        },
      );
    }
  }, [connected, fetchProducts]);

  // Reconnect with new billing program
  const reconnectWithProgram = useCallback(
    async (newProgram: BillingProgramAndroid) => {
      try {
        setIsReconnecting(true);
        setPurchaseResult('Reconnecting with new billing program...');

        // End current connection
        await endConnection();

        // Wait a bit for cleanup
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Reinitialize with new program (new API)
        const config =
          Platform.OS === 'android'
            ? {enableBillingProgramAndroid: newProgram}
            : undefined;
        await initConnection(config);

        const programNames: Record<BillingProgramAndroid, string> = {
          unspecified: 'Unspecified',
          'external-content-link': 'External Content Link',
          'external-offer': 'External Offer',
          'external-payments': 'External Payments',
          'user-choice-billing': 'User Choice Billing',
        };

        setPurchaseResult(
          `✅ Reconnected with ${programNames[newProgram]} program`,
        );

        // Reload products
        await fetchProducts({skus: CONSUMABLE_PRODUCT_IDS, type: 'in-app'});
      } catch (error: any) {
        console.error('Reconnection error:', error);
        setPurchaseResult(`❌ Reconnection failed: ${error.message}`);
      } finally {
        setIsReconnecting(false);
      }
    },
    [fetchProducts],
  );

  // Handle iOS alternative billing purchase (external URL)
  const handleIOSAlternativeBillingPurchase = useCallback(
    async (product: Product) => {
      console.log('[iOS] Starting alternative billing purchase:', product.id);
      console.log('[iOS] External URL:', externalUrl);
      console.log('[iOS] Platform.Version:', Platform.Version);

      if (!externalUrl || externalUrl.trim() === '') {
        Alert.alert('Error', 'Please enter a valid external purchase URL');
        return;
      }

      setIsProcessing(true);
      setPurchaseResult('🌐 Opening external purchase link...');

      try {
        // Use StoreKit External Purchase Link API
        const result = await presentExternalPurchaseLinkIOS(externalUrl);
        console.log('[iOS] External purchase link result:', result);

        if (result.error) {
          setPurchaseResult(`❌ Error: ${result.error}`);
          Alert.alert('Error', result.error);
        } else if (result.success) {
          setPurchaseResult(
            `✅ External purchase link opened successfully\n\nProduct: ${product.id}\nURL: ${externalUrl}\n\nUser was redirected to external website.\n\nNote: Complete purchase on your website and implement server-side validation.`,
          );
          Alert.alert(
            'Redirected',
            'User was redirected to your external purchase website. Complete the purchase there.',
          );
        }
      } catch (error: any) {
        console.error('[iOS] Alternative billing error:', error);
        setPurchaseResult(`❌ Error: ${error.message}`);
        Alert.alert('Error', error.message);
      } finally {
        setIsProcessing(false);
      }
    },
    [externalUrl],
  );

  // Handle Android Billing Programs API (8.2.0+)
  const handleAndroidBillingPrograms = useCallback(
    async (product: Product) => {
      console.log('[Android] Starting Billing Programs API flow:', product.id);

      setIsProcessing(true);
      setPurchaseResult('Checking billing program availability...');

      try {
        // Step 1: Check if billing program is available
        const availability = await isBillingProgramAvailableAndroid(
          billingProgram,
        );
        console.log('[Android] Billing program available:', availability);

        if (!availability.isAvailable) {
          setPurchaseResult(
            `❌ Billing program not available\n\nProgram: ${availability.billingProgram}`,
          );
          Alert.alert(
            'Error',
            `${billingProgram} billing program is not available for this user/device`,
          );
          setIsProcessing(false);
          return;
        }

        setPurchaseResult('Launching external link...');

        // Step 2: Launch external link
        await launchExternalLinkAndroid({
          billingProgram,
          launchMode: 'launch-in-external-browser-or-app',
          linkType: 'link-to-digital-content-offer',
          linkUri: `https://openiap.dev/purchase/${product.id}`,
        });

        setPurchaseResult('Getting reporting token...');

        // Step 3: Get reporting details (after payment completes externally)
        const details = await createBillingProgramReportingDetailsAndroid(
          billingProgram,
        );
        console.log('[Android] Reporting details:', details);

        setPurchaseResult(
          `✅ Billing Programs API flow completed\n\nProduct: ${
            product.id
          }\nProgram: ${
            details.billingProgram
          }\nToken: ${details.externalTransactionToken.substring(
            0,
            20,
          )}...\n\n⚠️ Important:\n1. Report token to Google Play within 24 hours\n2. Process payment on your external site`,
        );

        Alert.alert(
          'Demo Complete',
          'Billing Programs API flow completed.\n\nIn production, report the token to Google Play backend within 24 hours.',
        );
      } catch (error: any) {
        console.error('[Android] Billing Programs API error:', error);
        setPurchaseResult(`❌ Error: ${error.message}`);
        Alert.alert('Error', error.message);
      } finally {
        setIsProcessing(false);
      }
    },
    [billingProgram],
  );

  // Handle Android User Choice Billing (new enableBillingProgramAndroid: 'user-choice-billing')
  const handleAndroidUserChoiceBilling = useCallback((product: Product) => {
    console.log('[Android] Starting user choice billing:', product.id);

    setIsProcessing(true);
    setPurchaseResult('Showing user choice dialog...');

    // With enableBillingProgramAndroid: 'user-choice-billing', Google shows selection dialog
    requestPurchase({
      request: {
        google: {
          skus: [product.id],
        },
      },
      type: 'in-app',
      // developerBillingOption can be set to specify developer billing behavior
    })
      .then(() => {
        // Google will show selection dialog
        // If user selects Google Play: onPurchaseUpdated callback
        // If user selects alternative: No callback (manual flow required)
        setPurchaseResult(
          `🔄 User choice dialog shown\n\nProduct: ${product.id}\n\nIf user selects:\n- Google Play: onPurchaseUpdated callback\n- Alternative: Manual flow required`,
        );
      })
      .catch((error) => {
        console.error('[Android] User choice billing error:', error);
        setPurchaseResult(`❌ Error: ${error.message}`);
        Alert.alert('Error', error.message);
      });
  }, []);

  // Handle purchase based on platform and mode
  const handlePurchase = useCallback(
    (product: Product) => {
      if (Platform.OS === 'ios') {
        handleIOSAlternativeBillingPurchase(product);
      } else if (Platform.OS === 'android') {
        switch (androidBillingFlow) {
          case 'billing-programs':
            void handleAndroidBillingPrograms(product);
            break;
          case 'user-choice-billing':
            handleAndroidUserChoiceBilling(product);
            break;
        }
      }
    },
    [
      androidBillingFlow,
      handleIOSAlternativeBillingPurchase,
      handleAndroidBillingPrograms,
      handleAndroidUserChoiceBilling,
    ],
  );

  if (!connected) {
    return <Loading message="Connecting to Store..." />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Alternative Billing</Text>
        <Text style={styles.subtitle}>
          {Platform.OS === 'ios'
            ? 'External purchase links (iOS 16.0+)'
            : 'Google Play alternative billing'}
        </Text>
      </View>

      <View style={styles.content}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>ℹ️ How It Works</Text>
          {Platform.OS === 'ios' ? (
            <>
              <Text style={styles.infoText}>
                • Enter your external purchase URL{'\n'}• Tap Purchase on any
                product{'\n'}• User will be redirected to the external URL{'\n'}
                • Complete purchase on your website{'\n'}• No onPurchaseUpdated
                callback{'\n'}• Implement deep link to return to app
              </Text>
              <Text style={styles.warningText}>
                ⚠️ iOS 16.0+ required{'\n'}
                ⚠️ Valid external URL needed{'\n'}
                ⚠️ useAlternativeBilling: true is set
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.infoText}>
                {billingProgram === 'user-choice-billing'
                  ? '• User Choice Billing Mode\n• Users choose between:\n  - Google Play (30% fee)\n  - Your payment system (lower fee)\n• Google shows selection dialog\n• If Google Play: onPurchaseUpdated\n• If alternative: Manual flow'
                  : '• External Offer / Billing Programs Mode\n• Uses new Billing Programs API (8.2.0+)\n• External link flow for purchases\n• No onPurchaseUpdated callback\n• Must report to Google within 24h'}
              </Text>
              <Text style={styles.warningText}>
                ⚠️ Requires approval from Google{'\n'}
                ⚠️ Must report tokens within 24 hours{'\n'}
                ⚠️ Backend integration required
              </Text>
            </>
          )}
        </View>

        {/* Mode Selector (Android only) */}
        {Platform.OS === 'android' ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Billing Flow</Text>
            <TouchableOpacity
              style={styles.modeSelector}
              onPress={() => setShowModeSelector(true)}
            >
              <Text style={styles.modeSelectorText}>
                {androidBillingFlow === 'billing-programs'
                  ? 'Billing Programs API (8.2.0+)'
                  : 'User Choice Billing (7.0+)'}
              </Text>
              <Text style={styles.modeSelectorArrow}>▼</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Billing Program Selector (Android billing-programs only) */}
        {Platform.OS === 'android' &&
        androidBillingFlow === 'billing-programs' ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Billing Program</Text>
            <TouchableOpacity
              style={styles.modeSelector}
              onPress={() => setShowProgramSelector(true)}
            >
              <Text style={styles.modeSelectorText}>
                {billingProgram === 'external-offer'
                  ? 'External Offer'
                  : billingProgram === 'external-payments'
                  ? 'External Payments'
                  : billingProgram === 'external-content-link'
                  ? 'External Content Link'
                  : billingProgram}
              </Text>
              <Text style={styles.modeSelectorArrow}>▼</Text>
            </TouchableOpacity>
            <Text style={styles.urlHint}>
              Select the billing program to use for external purchases
            </Text>
          </View>
        ) : null}

        {/* External URL Input (iOS only) */}
        {Platform.OS === 'ios' ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>External Purchase URL</Text>
            <TextInput
              style={styles.urlInput}
              value={externalUrl}
              onChangeText={setExternalUrl}
              placeholder="https://your-payment-site.com/checkout"
              autoCapitalize="none"
              keyboardType="url"
            />
            <Text style={styles.urlHint}>
              This URL will be opened when a user taps Purchase
            </Text>
          </View>
        ) : null}

        {/* Reconnecting Status */}
        {isReconnecting ? (
          <View style={styles.warningBanner}>
            <Text style={styles.warningBannerText}>
              🔄 Reconnecting with new billing mode...
            </Text>
          </View>
        ) : null}

        {/* Connection Status */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Store Connection:</Text>
          <Text
            style={[
              styles.statusValue,
              {color: connected ? '#4CAF50' : '#F44336'},
            ]}
          >
            {connected ? '✅ Connected' : '❌ Disconnected'}
          </Text>
          {Platform.OS === 'android' ? (
            <Text style={styles.statusSubtext}>
              Current program: {billingProgram.toUpperCase().replace(/-/g, '_')}
            </Text>
          ) : null}
        </View>

        {/* Products */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Product</Text>
          {products.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Loading products...</Text>
            </View>
          ) : (
            products.map((product) => (
              <TouchableOpacity
                key={product.id}
                style={[
                  styles.productCard,
                  selectedProduct?.id === product.id &&
                    styles.productCardSelected,
                ]}
                onPress={() => setSelectedProduct(product)}
              >
                <View style={styles.productHeader}>
                  <Text style={styles.productTitle}>{product.title}</Text>
                  <Text style={styles.productPrice}>
                    {product.displayPrice}
                  </Text>
                </View>
                <Text style={styles.productDescription}>
                  {product.description}
                </Text>
                {selectedProduct?.id === product.id ? (
                  <View style={styles.selectedBadge}>
                    <Text style={styles.selectedBadgeText}>✓ Selected</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Product Details & Action */}
        {selectedProduct ? (
          <View style={styles.section}>
            <View style={styles.detailsCard}>
              <Text style={styles.detailsTitle}>Product Details</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>ID:</Text>
                <Text style={styles.detailValue}>{selectedProduct.id}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Title:</Text>
                <Text style={styles.detailValue}>{selectedProduct.title}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Price:</Text>
                <Text style={styles.detailValue}>
                  {selectedProduct.displayPrice}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Type:</Text>
                <Text style={styles.detailValue}>{selectedProduct.type}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.purchaseButton, isProcessing && {opacity: 0.5}]}
              onPress={() => handlePurchase(selectedProduct)}
              disabled={isProcessing || !connected}
            >
              <Text style={styles.purchaseButtonText}>
                {isProcessing
                  ? 'Processing...'
                  : Platform.OS === 'ios'
                  ? '🛒 Buy (External URL)'
                  : androidBillingFlow === 'billing-programs'
                  ? '🛒 Buy (Billing Programs)'
                  : '🛒 Buy (User Choice Billing)'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Purchase Result */}
        {purchaseResult ? (
          <View style={styles.resultContainer}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>Purchase Result</Text>
              <TouchableOpacity
                onPress={() => {
                  setPurchaseResult('');
                  setLastPurchase(null);
                }}
              >
                <Text style={styles.dismissButton}>Dismiss</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.resultText}>{purchaseResult}</Text>
          </View>
        ) : null}

        {/* Last Purchase */}
        {lastPurchase ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Last Purchase</Text>
            <View style={styles.purchaseCard}>
              <Text style={styles.purchaseText}>
                Product: {lastPurchase.productId}
              </Text>
              <Text style={styles.purchaseText}>
                Transaction: {lastPurchase.id}
              </Text>
              <Text style={styles.purchaseText}>
                Date: {new Date(lastPurchase.transactionDate).toLocaleString()}
              </Text>
              <Text style={styles.purchaseWarning}>
                ℹ️ Transaction auto-finished for testing.{'\n'}
                PRODUCTION: Validate on backend first!
              </Text>
            </View>
          </View>
        ) : null}

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>Testing Instructions:</Text>
          <Text style={styles.instructionsText}>
            1. Select a product from the list{'\n'}
            2. Tap the purchase button{'\n'}
            3. Follow the platform-specific flow{'\n'}
            4. Check the purchase result{'\n'}
            5. Verify token/URL behavior
          </Text>
        </View>
      </View>

      {/* Mode Selector Modal (Android) */}
      <Modal
        visible={showModeSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModeSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Billing Flow</Text>
            <TouchableOpacity
              style={[
                styles.modeOption,
                androidBillingFlow === 'billing-programs' &&
                  styles.modeOptionSelected,
              ]}
              onPress={() => {
                setAndroidBillingFlow('billing-programs');
                // Reset to default external billing program when switching from user-choice
                if (billingProgram === 'user-choice-billing') {
                  setBillingProgram('external-offer');
                  void reconnectWithProgram('external-offer');
                }
                setShowModeSelector(false);
              }}
            >
              <Text style={styles.modeOptionTitle}>
                Billing Programs API (8.2.0+)
              </Text>
              <Text style={styles.modeOptionDescription}>
                New unified API for external billing. Uses
                isBillingProgramAvailableAndroid, launchExternalLinkAndroid, and
                createBillingProgramReportingDetailsAndroid.
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeOption,
                androidBillingFlow === 'user-choice-billing' &&
                  styles.modeOptionSelected,
              ]}
              onPress={() => {
                setAndroidBillingFlow('user-choice-billing');
                setBillingProgram('user-choice-billing');
                setShowModeSelector(false);
                void reconnectWithProgram('user-choice-billing');
              }}
            >
              <Text style={styles.modeOptionTitle}>
                User Choice Billing (7.0+)
              </Text>
              <Text style={styles.modeOptionDescription}>
                Users can choose between Google Play and your payment system.
                Uses enableBillingProgramAndroid: 'user-choice-billing'.
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowModeSelector(false)}
            >
              <Text style={styles.modalCloseButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Billing Program Selector Modal (Android) */}
      <Modal
        visible={showProgramSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProgramSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Billing Program</Text>
            {EXTERNAL_BILLING_PROGRAMS.map((program) => (
              <TouchableOpacity
                key={program}
                style={[
                  styles.modeOption,
                  billingProgram === program && styles.modeOptionSelected,
                ]}
                onPress={() => {
                  setBillingProgram(program);
                  setShowProgramSelector(false);
                  void reconnectWithProgram(program);
                }}
              >
                <Text style={styles.modeOptionTitle}>
                  {program === 'external-offer'
                    ? 'External Offer'
                    : program === 'external-payments'
                    ? 'External Payments'
                    : program === 'external-content-link'
                    ? 'External Content Link'
                    : program}
                </Text>
                <Text style={styles.modeOptionDescription}>
                  {program === 'external-offer'
                    ? 'For apps that offer digital content outside Google Play. Requires approval.'
                    : program === 'external-payments'
                    ? 'For apps in eligible regions to use alternative payment processors.'
                    : program === 'external-content-link'
                    ? 'For linking to external content already purchased outside the app.'
                    : ''}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowProgramSelector(false)}
            >
              <Text style={styles.modalCloseButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

export default AlternativeBillingScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#FF9800',
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    padding: 15,
  },
  infoCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#E65100',
  },
  infoText: {
    fontSize: 13,
    color: '#5D4037',
    marginBottom: 8,
    lineHeight: 20,
  },
  warningText: {
    fontSize: 12,
    color: '#D84315',
    lineHeight: 18,
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  modeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  modeSelectorText: {
    fontSize: 14,
    color: '#333',
  },
  modeSelectorArrow: {
    fontSize: 12,
    color: '#999',
  },
  urlInput: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 14,
  },
  urlHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  warningBanner: {
    backgroundColor: '#FFF3CD',
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  warningBannerText: {
    fontSize: 14,
    color: '#856404',
    fontWeight: '600',
  },
  statusContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  productCardSelected: {
    borderColor: '#FF9800',
    backgroundColor: '#FFF3E0',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  productDescription: {
    fontSize: 14,
    color: '#666',
  },
  selectedBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#FF9800',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  selectedBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  detailsCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  purchaseButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  purchaseButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  resultContainer: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  dismissButton: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '600',
  },
  resultText: {
    fontSize: 13,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    lineHeight: 18,
  },
  purchaseCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
  },
  purchaseText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  purchaseWarning: {
    fontSize: 12,
    color: '#FF9800',
    marginTop: 10,
    lineHeight: 18,
  },
  emptyState: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
  },
  instructions: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 15,
    marginTop: 10,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    color: '#1565C0',
  },
  instructionsText: {
    fontSize: 12,
    color: '#333',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  modeOption: {
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    marginBottom: 10,
  },
  modeOptionSelected: {
    borderColor: '#FF9800',
    backgroundColor: '#FFF3E0',
  },
  modeOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  modeOptionDescription: {
    fontSize: 13,
    color: '#666',
  },
  modalCloseButton: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  modalCloseButtonText: {
    fontSize: 16,
    color: '#666',
  },
});
