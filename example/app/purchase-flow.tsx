import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  ScrollView,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  requestPurchase,
  useIAP,
  getAppTransactionIOS,
  isProductIOS,
} from '../../src';
import Loading from '../src/components/Loading';
import {PRODUCT_IDS} from '../../src/utils/constants';
import type {Product, Purchase, PurchaseError} from '../../src/ExpoIap.types';

/**
 * Purchase Flow Example - In-App Products
 *
 * Demonstrates useIAP hook approach for in-app products:
 * - Uses useIAP hook for purchase management
 * - Handles purchase callbacks with proper types
 * - No manual promise handling required
 * - Clean success/error pattern through hooks
 * - Focused on one-time purchases (products)
 */

export default function PurchaseFlow() {
  // State management with useState
  const [purchaseResult, setPurchaseResult] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [lastPurchase, setLastPurchase] = useState<Purchase | null>(null);
  const [purchaseDetailsVisible, setPurchaseDetailsVisible] = useState(false);

  // Use the useIAP hook for managing purchases
  const {connected, products, fetchProducts, finishTransaction} = useIAP({
    onPurchaseSuccess: async (purchase: Purchase) => {
      // Avoid logging sensitive receipt; it's same as purchaseToken
      const {transactionReceipt: _omit, ...safePurchase} = purchase as any;
      console.log('Purchase successful:', safePurchase);
      setLastPurchase(purchase);
      setIsProcessing(false);

      // Handle successful purchase
      setPurchaseResult(
        `✅ Purchase successful (${purchase.platform})\n` +
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
      // For consumable products (like bulb packs), set isConsumable to true
      await finishTransaction({
        purchase,
        isConsumable: true, // Set to true for consumable products
      });

      Alert.alert('Success', 'Purchase completed successfully!');
    },
    onPurchaseError: (error: PurchaseError) => {
      console.error('Purchase failed:', error);
      setIsProcessing(false);

      // Handle purchase error
      setPurchaseResult(`❌ Purchase failed: ${error.message}`);
    },
    onSyncError: (error: Error) => {
      console.warn('Sync error:', error);
      Alert.alert('Sync Error', `Failed to sync purchases: ${error.message}`);
    },
  });

  // Load products when component mounts
  useEffect(() => {
    console.log('[PurchaseFlow] useEffect - connected:', connected);
    console.log('[PurchaseFlow] PRODUCT_IDS:', PRODUCT_IDS);
    if (connected) {
      console.log('[PurchaseFlow] Calling fetchProducts with:', PRODUCT_IDS);
      fetchProducts({skus: PRODUCT_IDS, type: 'inapp'})
        .then(() => {
          console.log('[PurchaseFlow] fetchProducts completed');
        })
        .catch((error) => {
          console.error('[PurchaseFlow] fetchProducts error:', error);
        });
    } else {
      console.log('[PurchaseFlow] Not fetching products - not connected');
    }
  }, [connected, fetchProducts]);

  // Defer loading guard until after all hooks are declared

  const handlePurchase = async (itemId: string) => {
    try {
      setIsProcessing(true);
      setPurchaseResult('Processing purchase...');

      // New platform-specific API (v2.7.0+) - no Platform.OS branching needed
      await requestPurchase({
        request: {
          ios: {
            sku: itemId,
            quantity: 1,
          },
          android: {
            skus: [itemId],
          },
        },
        type: 'inapp',
      });
    } catch (error) {
      setIsProcessing(false);
      const errorMessage =
        error instanceof Error ? error.message : 'Purchase failed';
      setPurchaseResult(`❌ Purchase failed: ${errorMessage}`);
    }
  };

  // Monitor products changes
  useEffect(() => {
    console.log('[PurchaseFlow] Products updated:', products.length, 'items');
    products.forEach((product, index) => {
      console.log(
        `[PurchaseFlow] Product ${index}:`,
        product.id,
        product.title,
        product.displayPrice,
      );
    });
  }, [products]);

  const handleCopyResult = async () => {
    if (purchaseResult) {
      await Clipboard.setStringAsync(purchaseResult);
      Alert.alert('Copied', 'Purchase result copied to clipboard');
    }
  };

  const checkAppTransaction = async () => {
    try {
      console.log('Checking app transaction...');
      const transaction = await getAppTransactionIOS();

      if (transaction) {
        Alert.alert(
          'App Transaction',
          `App Transaction Found:\n\n` +
            `Original App Version: ${
              transaction.originalAppVersion || 'N/A'
            }\n` +
            `Purchase Date: ${
              transaction.originalPurchaseDate
                ? new Date(
                    transaction.originalPurchaseDate,
                  ).toLocaleDateString()
                : 'N/A'
            }\n` +
            `Device Verification: ${
              transaction.deviceVerification || 'N/A'
            }\n` +
            `Environment: ${transaction.environment || 'N/A'}`,
          [{text: 'OK'}],
        );
      } else {
        Alert.alert('App Transaction', 'No app transaction found');
      }
    } catch (error) {
      console.error('Failed to get app transaction:', error);
      Alert.alert('Error', 'Failed to get app transaction');
    }
  };

  const handleShowDetails = (product: Product) => {
    setSelectedProduct(product);
    setModalVisible(true);
  };

  // Show loading screen while disconnected
  if (!connected) {
    return <Loading message="Connecting to Store..." />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>In-App Purchase Flow</Text>
        <Text style={styles.subtitle}>
          Testing consumable and non-consumable products
        </Text>
      </View>

      <View style={styles.content}>
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
        </View>

        {/* Products List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Products</Text>
          <Text style={styles.sectionSubtitle}>
            {products.length > 0
              ? `${products.length} product(s) loaded`
              : 'Loading products...'}
          </Text>

          {products.map((product) => (
            <View key={product.id} style={styles.productCard}>
              <View style={styles.productHeader}>
                <Text style={styles.productTitle}>{product.title}</Text>
                <Text style={styles.productPrice}>{product.displayPrice}</Text>
              </View>
              <Text style={styles.productDescription}>
                {product.description}
              </Text>
              <View style={styles.productActions}>
                <TouchableOpacity
                  style={[
                    styles.purchaseButton,
                    isProcessing && {opacity: 0.5},
                  ]}
                  onPress={() => handlePurchase(product.id)}
                  disabled={isProcessing}
                >
                  <Text style={styles.purchaseButtonText}>
                    {isProcessing ? 'Processing...' : `Purchase`}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.detailsButton}
                  onPress={() => handleShowDetails(product)}
                >
                  <Text style={styles.detailsButtonText}>Details</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {products.length === 0 && connected && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No products available. Please check your App Store Connect
                configuration.
              </Text>
            </View>
          )}
        </View>

        {/* Purchase Result */}
        {purchaseResult ? (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>Purchase Result:</Text>
            <Text style={styles.resultText}>{purchaseResult}</Text>
            <View style={styles.resultActionsRow}>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={handleCopyResult}
              >
                <Text style={styles.copyButtonText}>📋 Copy Result</Text>
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
        ) : null}

        {/* App Transaction Check (iOS) */}
        {Platform.OS === 'ios' && (
          <TouchableOpacity
            style={styles.appTransactionButton}
            onPress={checkAppTransaction}
          >
            <Text style={styles.appTransactionButtonText}>
              🔍 Check App Transaction (iOS 16+)
            </Text>
          </TouchableOpacity>
        )}

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>How to test:</Text>
          <Text style={styles.instructionsText}>
            1. Make sure you're signed in with a Sandbox account
          </Text>
          <Text style={styles.instructionsText}>
            2. Products must be configured in App Store Connect
          </Text>
          <Text style={styles.instructionsText}>
            3. Tap "Purchase" to initiate the transaction
          </Text>
          <Text style={styles.instructionsText}>
            4. The transaction will be processed via the hook callbacks
          </Text>
          <Text style={styles.instructionsText}>
            5. Server-side receipt validation is recommended for production
          </Text>
        </View>
      </View>

      {/* Product Details Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Product Details</Text>
            {selectedProduct && (
              <>
                <Text style={styles.modalLabel}>Product ID:</Text>
                <Text style={styles.modalValue}>{selectedProduct.id}</Text>

                <Text style={styles.modalLabel}>Title:</Text>
                <Text style={styles.modalValue}>{selectedProduct.title}</Text>

                <Text style={styles.modalLabel}>Description:</Text>
                <Text style={styles.modalValue}>
                  {selectedProduct.description}
                </Text>

                <Text style={styles.modalLabel}>Price:</Text>
                <Text style={styles.modalValue}>
                  {selectedProduct.displayPrice}
                </Text>

                <Text style={styles.modalLabel}>Currency:</Text>
                <Text style={styles.modalValue}>
                  {selectedProduct.currency || 'N/A'}
                </Text>

                <Text style={styles.modalLabel}>Type:</Text>
                <Text style={styles.modalValue}>
                  {selectedProduct.type || 'N/A'}
                </Text>

                {isProductIOS(selectedProduct) && (
                  <>
                    <Text style={styles.modalLabel}>Is Family Shareable:</Text>
                    <Text style={styles.modalValue}>
                      {selectedProduct.isFamilyShareableIOS ? 'Yes' : 'No'}
                    </Text>
                  </>
                )}
              </>
            )}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Purchase Details Modal */}
      <Modal
        visible={purchaseDetailsVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPurchaseDetailsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Purchase Details</Text>
              <TouchableOpacity
                onPress={() => setPurchaseDetailsVisible(false)}
                style={styles.modalCloseIconButton}
              >
                <Text style={styles.modalCloseIconText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {lastPurchase && (
                <>
                  <Text style={styles.modalLabel}>Transaction ID</Text>
                  <Text style={styles.modalValue}>{lastPurchase.id}</Text>

                  <Text style={styles.modalLabel}>Product ID</Text>
                  <Text style={styles.modalValue}>
                    {lastPurchase.productId}
                  </Text>

                  <Text style={styles.modalLabel}>Platform</Text>
                  <Text style={styles.modalValue}>{lastPurchase.platform}</Text>

                  <Text style={styles.modalLabel}>Date</Text>
                  <Text style={styles.modalValue}>
                    {new Date(lastPurchase.transactionDate).toLocaleString()}
                  </Text>

                  {lastPurchase.purchaseToken ? (
                    <>
                      <Text style={styles.modalLabel}>Purchase Token</Text>
                      <Text style={styles.modalValue}>
                        {lastPurchase.purchaseToken}
                      </Text>
                    </>
                  ) : null}
                </>
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
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
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
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    padding: 15,
  },
  statusContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 10,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    color: '#007AFF',
  },
  productDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  productActions: {
    flexDirection: 'row',
    gap: 10,
  },
  purchaseButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  purchaseButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
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
  emptyState: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  resultContainer: {
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 12,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  resultActionsRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  copyButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#4CAF50',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4CAF50',
    minHeight: 44,
    justifyContent: 'center',
  },
  copyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  resultDetailsButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  appTransactionButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 15,
  },
  appTransactionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  instructions: {
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    padding: 15,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    color: '#e65100',
  },
  instructionsText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
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
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalCloseIconButton: {
    padding: 4,
  },
  modalCloseIconText: {
    fontSize: 22,
    color: '#666',
  },
  modalLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 10,
    marginBottom: 5,
  },
  modalValue: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  closeButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});
