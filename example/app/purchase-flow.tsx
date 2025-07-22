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
import type {
  Product,
  ProductPurchase,
  PurchaseError,
} from '../../src/ExpoIap.types';

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
  const [purchaseResult, setPurchaseResult] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Use the useIAP hook for managing purchases
  const {connected, products, getProducts} = useIAP({
    onPurchaseSuccess: (purchase: ProductPurchase) => {
      console.log('Purchase successful:', purchase);
      setIsProcessing(false);

      // Handle successful purchase
      setPurchaseResult(
        `✅ Purchase successful (${purchase.platform})\n` +
          `Product: ${purchase.id}\n` +
          `Transaction ID: ${purchase.transactionId || 'N/A'}\n` +
          `Date: ${new Date(purchase.transactionDate).toLocaleDateString()}\n` +
          `Receipt: ${purchase.transactionReceipt?.substring(0, 50)}...`,
      );

      Alert.alert('Success', 'Purchase completed successfully!');
    },
    onPurchaseError: (error: PurchaseError) => {
      console.error('Purchase failed:', error);
      setIsProcessing(false);

      // Handle purchase error
      setPurchaseResult(`❌ Purchase failed: ${error.message}`);
      Alert.alert('Purchase Failed', error.message);
    },
    onSyncError: (error: Error) => {
      console.warn('Sync error:', error);
      Alert.alert('Sync Error', `Failed to sync purchases: ${error.message}`);
    },
  });

  // Load products when component mounts
  useEffect(() => {
    if (connected) {
      const productIds = ['dev.hyo.martie.10bulbs', 'dev.hyo.martie.30bulbs'];
      getProducts(productIds);
    }
  }, [connected, getProducts]);

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
          }
        },
        type: 'inapp',
      });
    } catch (error) {
      setIsProcessing(false);
      const errorMessage =
        error instanceof Error ? error.message : 'Purchase failed';
      setPurchaseResult(`❌ Purchase failed: ${errorMessage}`);
      Alert.alert('Purchase Failed', errorMessage);
    }
  };

  const retryLoadProducts = () => {
    const productIds = [
      'com.example.premium',
      'com.example.coins_100',
      'com.example.remove_ads',
    ];
    getProducts(productIds);
  };

  const getProductDisplayPrice = (product: Product): string => {
    if (product.platform === 'android') {
      return (
        product.oneTimePurchaseOfferDetails?.formattedPrice ||
        product.displayPrice
      );
    } else {
      return product.displayPrice;
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>In-App Purchase Flow</Text>
        <Text style={styles.subtitle}>
          TypeScript-first approach for products
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
        <Text style={styles.sectionTitle}>Available Products</Text>
        {!connected ? (
          <Text style={styles.loadingText}>Connecting to store...</Text>
        ) : products.length > 0 ? (
          products.map((product) => (
            <View key={product.id} style={styles.productCard}>
              <View style={styles.productInfo}>
                <Text style={styles.productTitle}>{product.title}</Text>
                <Text style={styles.productDescription}>
                  {product.description}
                </Text>
                <Text style={styles.productPrice}>
                  {getProductDisplayPrice(product)}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.purchaseButton,
                  isProcessing && styles.disabledButton,
                ]}
                onPress={() => handlePurchase(product.id)}
                disabled={isProcessing || !connected}
              >
                <Text style={styles.purchaseButtonText}>
                  {isProcessing ? 'Processing...' : 'Purchase'}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.noProductsCard}>
            <Text style={styles.noProductsText}>
              No products found. Make sure to configure your product IDs in your
              app store.
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={retryLoadProducts}
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
        <Text style={styles.infoTitle}>🎯 Key Features Demonstrated</Text>
        <Text style={styles.infoText}>
          • Automatic TypeScript type inference{'\n'}• Platform-agnostic
          property access{'\n'}• No manual type casting required{'\n'}• Focused
          on one-time purchases{'\n'}• Type-safe error handling
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
  productCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productInfo: {
    flex: 1,
    marginRight: 15,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  purchaseButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  purchaseButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  noProductsCard: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
  },
  noProductsText: {
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
    borderLeftColor: '#007AFF',
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
