import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import {useIAP} from '../../src';
import Loading from '../src/components/Loading';
import {
  PRODUCT_IDS,
  SUBSCRIPTION_PRODUCT_IDS,
  CONSUMABLE_PRODUCT_IDS,
  NON_CONSUMABLE_PRODUCT_IDS,
} from '../src/utils/constants';
import type {Product, ProductSubscription} from '../../src/types';

const ALL_PRODUCT_IDS = [...PRODUCT_IDS, ...SUBSCRIPTION_PRODUCT_IDS];

/**
 * All Products Example - Show All Products and Subscriptions
 *
 * Demonstrates fetching all products (both in-app and subscriptions):
 * - Uses fetchProducts with 'all' type to get everything
 * - Displays products and subscriptions as they come from the API
 * - Single view for all product types
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 🎯 TypeScript Discriminated Union Type Narrowing Examples
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * This file demonstrates real-world usage of discriminated union type narrowing
 * with OpenIAP gql 1.2.4+ types. See the following functions for examples:
 *
 * Example 1 (Line ~90): handleShowDetails()
 *   - Demonstrates combining 'platform' and 'type' discriminators
 *   - Shows how to narrow to specific types like ProductSubscriptionIOS
 *   - Includes console.log examples showing type-safe field access
 *
 * Example 2 (Line ~125): getProductTypeLabel()
 *   - Shows basic type narrowing using the 'type' discriminator
 *   - Narrows Product | ProductSubscription -> ProductSubscription
 *
 * Key discriminator fields:
 * - `type`: 'in-app' | 'subs' - Distinguishes products from subscriptions
 * - `platform`: 'ios' | 'android' - Distinguishes platform-specific types
 *
 * Type hierarchy:
 * - Product = ProductIOS | ProductAndroid (type: 'in-app')
 * - ProductSubscription = ProductSubscriptionIOS | ProductSubscriptionAndroid (type: 'subs')
 *
 * Benefits:
 * ✅ Type-safe access to platform-specific fields (e.g., discountsIOS, subscriptionOffers)
 * ✅ Compile-time errors prevent accessing non-existent fields
 * ✅ Better IDE autocomplete and IntelliSense
 * ✅ Runtime safety - no accessing undefined fields
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

function AllProducts() {
  const [selectedProduct, setSelectedProduct] = useState<
    Product | ProductSubscription | null
  >(null);
  const [modalVisible, setModalVisible] = useState(false);

  const {connected, products, subscriptions, fetchProducts} = useIAP();

  useEffect(() => {
    console.log('[AllProducts] useEffect - connected:', connected);
    if (connected) {
      console.log('[AllProducts] Fetching all products');

      // Fetch all products with type 'all'
      fetchProducts({skus: ALL_PRODUCT_IDS, type: 'all'})
        .then(() => {
          console.log('[AllProducts] fetchProducts completed');
        })
        .catch((error) => {
          console.error('[AllProducts] fetchProducts error:', error);
        });
    }
  }, [connected, fetchProducts]);

  /**
   * 🎯 Type Narrowing Example 1: Platform + Type narrowing
   *
   * This demonstrates combining both 'platform' and 'type' discriminators
   * to narrow down to a specific type (e.g., ProductSubscriptionIOS).
   */
  const handleShowDetails = (product: Product | ProductSubscription) => {
    // Log type narrowing examples
    console.log('\n🎯 Type Narrowing Examples for:', product.id);

    // Example 1: Narrow by type
    if (product.type === 'subs') {
      // ✅ Narrowed to: ProductSubscription
      console.log('- This is a subscription');

      // Example 2: Further narrow by platform
      if (product.platform === 'ios') {
        // ✅ Narrowed to: ProductSubscriptionIOS
        console.log('- iOS Subscription detected');
        console.log(
          '- Subscription Period:',
          product.subscriptionPeriodUnitIOS,
        );
        console.log('- Has Discounts:', product.discountsIOS?.length || 0);
      } else if (product.platform === 'android') {
        // ✅ Narrowed to: ProductSubscriptionAndroid
        console.log('- Android Subscription detected');
        console.log(
          '- Subscription Offers:',
          product.subscriptionOffers?.length || 0,
        );
      }
    } else {
      // ✅ Narrowed to: Product (in-app)
      console.log('- This is an in-app product');

      if (product.platform === 'ios') {
        // ✅ Narrowed to: ProductIOS
        console.log('- iOS Product');
        console.log('- Family Shareable:', product.isFamilyShareableIOS);
      } else {
        // ✅ Narrowed to: ProductAndroid
        console.log('- Android Product');
        console.log('- Name:', product.nameAndroid);
      }
    }

    setSelectedProduct(product);
    setModalVisible(true);
  };

  /**
   * 🎯 Type Narrowing Example 2: Using 'type' discriminator
   *
   * This demonstrates how TypeScript narrows the union type
   * Product | ProductSubscription using the 'type' field.
   */
  const getProductTypeLabel = (product: Product | ProductSubscription) => {
    // Type narrowing using 'type' discriminator
    if (product.type === 'subs') {
      // ✅ TypeScript narrows to: ProductSubscription
      return 'SUBSCRIPTION';
    }
    // ✅ TypeScript narrows to: Product (type === 'in-app')
    if (CONSUMABLE_PRODUCT_IDS.includes(product.id)) {
      return 'CONSUMABLE';
    }
    if (NON_CONSUMABLE_PRODUCT_IDS.includes(product.id)) {
      return 'NON-CONSUMABLE';
    }
    return 'IN-APP';
  };

  const getProductTypeStyle = (product: Product | ProductSubscription) => {
    if (CONSUMABLE_PRODUCT_IDS.includes(product.id)) {
      return styles.typeBadgeConsumable;
    }
    if (NON_CONSUMABLE_PRODUCT_IDS.includes(product.id)) {
      return styles.typeBadgeNonConsumable;
    }
    return styles.typeBadgeInApp;
  };

  // Show loading screen while disconnected
  if (!connected) {
    return <Loading message="Connecting to Store..." />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>All Products</Text>
        <Text style={styles.subtitle}>In-App Purchases and Subscriptions</Text>
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
          <Text style={styles.sectionTitle}>Products (In-App)</Text>
          <Text style={styles.sectionSubtitle}>
            {products.length > 0
              ? `${products.length} product(s) loaded`
              : 'No products'}
          </Text>

          {products.map((product) => (
            <View key={product.id} style={styles.productCard}>
              <View style={styles.productHeader}>
                <View style={styles.productTitleContainer}>
                  <Text style={styles.productTitle}>{product.title}</Text>
                  <Text
                    style={[styles.typeBadge, getProductTypeStyle(product)]}
                  >
                    {getProductTypeLabel(product)}
                  </Text>
                </View>
                <Text style={styles.productPrice}>{product.displayPrice}</Text>
              </View>
              <Text style={styles.productDescription}>
                {product.description}
              </Text>
              <TouchableOpacity
                style={styles.detailsButton}
                onPress={() => handleShowDetails(product)}
              >
                <Text style={styles.detailsButtonText}>Details</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Subscriptions List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscriptions</Text>
          <Text style={styles.sectionSubtitle}>
            {subscriptions.length > 0
              ? `${subscriptions.length} subscription(s) loaded`
              : 'No subscriptions'}
          </Text>

          {subscriptions.map((subscription) => (
            <View key={subscription.id} style={styles.productCard}>
              <View style={styles.productHeader}>
                <View style={styles.productTitleContainer}>
                  <Text style={styles.productTitle}>{subscription.title}</Text>
                  <Text
                    style={[styles.typeBadge, styles.typeBadgeSubscription]}
                  >
                    SUBS
                  </Text>
                </View>
                <Text style={styles.productPrice}>
                  {subscription.displayPrice}
                </Text>
              </View>
              <Text style={styles.productDescription}>
                {subscription.description}
              </Text>
              <TouchableOpacity
                style={styles.detailsButton}
                onPress={() => handleShowDetails(subscription)}
              >
                <Text style={styles.detailsButtonText}>Details</Text>
              </TouchableOpacity>
            </View>
          ))}
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
          <ScrollView style={styles.modalScrollContent}>
            <View style={styles.modalInnerContent}>
              <Text style={styles.modalTitle}>Product Details</Text>
              {selectedProduct ? (
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

                  {'isFamilyShareableIOS' in selectedProduct && (
                    <>
                      <Text style={styles.modalLabel}>
                        Is Family Shareable:
                      </Text>
                      <Text style={styles.modalValue}>
                        {selectedProduct.isFamilyShareableIOS ? 'Yes' : 'No'}
                      </Text>
                    </>
                  )}

                  {/* iOS Discounts */}
                  {'discountsIOS' in selectedProduct &&
                    selectedProduct.discountsIOS &&
                    selectedProduct.discountsIOS.length > 0 && (
                      <View style={styles.offersSection}>
                        <Text style={styles.offersSectionTitle}>
                          iOS Discounts ({selectedProduct.discountsIOS.length})
                        </Text>
                        {selectedProduct.discountsIOS.map((discount, idx) => (
                          <View key={idx} style={styles.offerCard}>
                            <Text style={styles.offerTitle}>
                              {discount.identifier}
                            </Text>
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
                  {'subscriptionInfoIOS' in selectedProduct &&
                    selectedProduct.subscriptionInfoIOS && (
                      <View style={styles.offersSection}>
                        <Text style={styles.offersSectionTitle}>
                          iOS Subscription Info
                        </Text>
                        <View style={styles.offerCard}>
                          {selectedProduct.subscriptionInfoIOS
                            .subscriptionPeriod && (
                            <Text style={styles.offerDetail}>
                              Period:{' '}
                              {
                                selectedProduct.subscriptionInfoIOS
                                  .subscriptionPeriod.value
                              }{' '}
                              {
                                selectedProduct.subscriptionInfoIOS
                                  .subscriptionPeriod.unit
                              }
                            </Text>
                          )}
                          {selectedProduct.subscriptionInfoIOS
                            .introductoryOffer && (
                            <>
                              <Text style={styles.offerSubtitle}>
                                Introductory Offer:
                              </Text>
                              <Text style={styles.offerDetail}>
                                Price:{' '}
                                {
                                  selectedProduct.subscriptionInfoIOS
                                    .introductoryOffer.displayPrice
                                }
                              </Text>
                              <Text style={styles.offerDetail}>
                                Mode:{' '}
                                {
                                  selectedProduct.subscriptionInfoIOS
                                    .introductoryOffer.paymentMode
                                }
                              </Text>
                              <Text style={styles.offerDetail}>
                                Periods:{' '}
                                {
                                  selectedProduct.subscriptionInfoIOS
                                    .introductoryOffer.periodCount
                                }
                              </Text>
                            </>
                          )}
                          {selectedProduct.subscriptionInfoIOS
                            .promotionalOffers &&
                            selectedProduct.subscriptionInfoIOS
                              .promotionalOffers.length > 0 && (
                              <>
                                <Text style={styles.offerSubtitle}>
                                  Promotional Offers (
                                  {
                                    selectedProduct.subscriptionInfoIOS
                                      .promotionalOffers.length
                                  }
                                  ):
                                </Text>
                                {selectedProduct.subscriptionInfoIOS.promotionalOffers.map(
                                  (promo, idx) => (
                                    <View
                                      key={idx}
                                      style={styles.nestedOfferCard}
                                    >
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

                  {/* Discount Offers (Cross-platform) */}
                  {'discountOffers' in selectedProduct &&
                    selectedProduct.discountOffers &&
                    selectedProduct.discountOffers.length > 0 && (
                      <View style={styles.offersSection}>
                        <Text style={styles.offersSectionTitle}>
                          Discount Offers (
                          {selectedProduct.discountOffers.length})
                        </Text>
                        {selectedProduct.discountOffers.map((offer, idx) => (
                          <View key={offer.id || idx} style={styles.offerCard}>
                            <Text style={styles.offerTitle}>
                              {offer.id || `Offer ${idx + 1}`}
                            </Text>
                            <Text style={styles.offerDetail}>
                              Price: {offer.displayPrice}
                            </Text>
                            {offer.fullPriceMicrosAndroid && (
                              <Text style={styles.offerDetail}>
                                Full Price (micros):{' '}
                                {offer.fullPriceMicrosAndroid}
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
                                  Number(
                                    offer.validTimeWindowAndroid
                                      .startTimeMillis,
                                  ),
                                ).toLocaleDateString()}{' '}
                                -{' '}
                                {new Date(
                                  Number(
                                    offer.validTimeWindowAndroid.endTimeMillis,
                                  ),
                                ).toLocaleDateString()}
                              </Text>
                            )}
                            {offer.limitedQuantityInfoAndroid && (
                              <Text style={styles.offerDetail}>
                                Remaining:{' '}
                                {
                                  offer.limitedQuantityInfoAndroid
                                    .remainingQuantity
                                }{' '}
                                /{' '}
                                {
                                  offer.limitedQuantityInfoAndroid
                                    .maximumQuantity
                                }
                              </Text>
                            )}
                            {offer.preorderDetailsAndroid && (
                              <Text style={styles.offerDetail}>
                                Release:{' '}
                                {new Date(
                                  Number(
                                    offer.preorderDetailsAndroid
                                      .preorderReleaseTimeMillis,
                                  ),
                                ).toLocaleDateString()}
                              </Text>
                            )}
                            {offer.rentalDetailsAndroid && (
                              <Text style={styles.offerDetail}>
                                Rental Period:{' '}
                                {
                                  offer.rentalDetailsAndroid
                                    .rentalExpirationPeriod
                                }
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

                  {/* Subscription Offers (Cross-platform) */}
                  {'subscriptionOffers' in selectedProduct &&
                    selectedProduct.subscriptionOffers &&
                    selectedProduct.subscriptionOffers.length > 0 && (
                      <View style={styles.offersSection}>
                        <Text style={styles.offersSectionTitle}>
                          Subscription Offers (
                          {selectedProduct.subscriptionOffers.length})
                        </Text>
                        {selectedProduct.subscriptionOffers.map(
                          (offer, idx) => (
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
                                  Period: {offer.period.value}{' '}
                                  {offer.period.unit}
                                </Text>
                              )}
                              {offer.periodCount && (
                                <Text style={styles.offerDetail}>
                                  Period Count: {offer.periodCount}
                                </Text>
                              )}
                              {offer.pricingPhasesAndroid?.pricingPhaseList?.map(
                                (phase, phaseIdx) => (
                                  <View
                                    key={phaseIdx}
                                    style={styles.nestedOfferCard}
                                  >
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
                          ),
                        )}
                      </View>
                    )}
                </>
              ) : null}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

export default AllProducts;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#FF6B6B',
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
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productTitleContainer: {
    flex: 1,
    marginRight: 10,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
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
  typeBadge: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  typeBadgeInApp: {
    backgroundColor: '#E3F2FD',
    color: '#1565C0',
  },
  typeBadgeConsumable: {
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
  },
  typeBadgeNonConsumable: {
    backgroundColor: '#F3E5F5',
    color: '#6A1B9A',
  },
  typeBadgeSubscription: {
    backgroundColor: '#FFF8E1',
    color: '#F57C00',
  },
  detailsButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
    alignItems: 'center',
    alignSelf: 'flex-start',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '90%',
    maxHeight: '85%',
  },
  modalInnerContent: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
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
  offersSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
  },
  offersSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
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
