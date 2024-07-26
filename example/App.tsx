import {
  endConnection,
  getProducts,
  getSubscriptions,
  initConnection,
  isProductAndroid,
  isProductIos,
  isSubscriptionProductAndroid,
  isSubscriptionProductIos,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  requestSubscription,
} from 'expo-iap';
import {useEffect, useState} from 'react';
import {
  Alert,
  Button,
  InteractionManager,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Product,
  ProductPurchase,
  PurchaseError,
  SubscriptionProduct,
} from '../src/ExpoIap.types';
import {RequestSubscriptionAndroidProps} from '../src/types/ExpoIapAndroid.types';

const productSkus = [
  'com.cooni.point1000',
  'com.cooni.point5000',
  'com.cooni.con5000',
];

const subscriptionSkus = ['com.cooni.subscription1000'];

const operations = [
  'initConnection',
  'getProducts',
  'getSubscriptions',
  'endConnection',
];
type Operation = (typeof operations)[number];

export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionProduct[]>([]);

  const handleOperation = async (operation: Operation) => {
    switch (operation) {
      case 'initConnection':
        if (await initConnection()) setIsConnected(true);
        return;

      case 'endConnection':
        if (await endConnection()) {
          setProducts([]);
          setIsConnected(false);
        }
        break;

      case 'getProducts':
        try {
          const products = await getProducts(productSkus);
          setProducts(products);
        } catch (error) {
          console.error(error);
        }
        break;

      case 'getSubscriptions':
        try {
          const subscriptions = await getSubscriptions(subscriptionSkus);
          setSubscriptions(subscriptions);
        } catch (error) {
          console.error(error);
        }
        break;

      default:
        console.log('Unknown operation');
    }
  };

  useEffect(() => {
    const purchaseUpdatedSubs = purchaseUpdatedListener(
      (purchase: ProductPurchase) => {
        InteractionManager.runAfterInteractions(() => {
          Alert.alert('Purchase updated', JSON.stringify(purchase));
        });
      },
    );

    const purchaseErrorSubs = purchaseErrorListener((error: PurchaseError) => {
      InteractionManager.runAfterInteractions(() => {
        Alert.alert('Purchase error', JSON.stringify(error));
      });
    });

    return () => {
      purchaseUpdatedSubs.remove();
      purchaseErrorSubs.remove();
      endConnection();
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Expo IAP Example</Text>
      <View style={styles.buttons}>
        <ScrollView contentContainerStyle={styles.buttonsWrapper} horizontal>
          {operations.map((operation) => (
            <Pressable
              key={operation}
              onPress={() => handleOperation(operation)}
            >
              <View style={styles.buttonView}>
                <Text>{operation}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <View style={styles.content}>
        {!isConnected ? (
          <Text>Not connected</Text>
        ) : (
          <View style={{gap: 12}}>
            <Text style={{fontSize: 20}}>Products</Text>
            {products.map((item) => {
              if (isProductAndroid(item)) {
                return (
                  <View key={item.title} style={{gap: 12}}>
                    <Text>
                      {item.title} -{' '}
                      {item.oneTimePurchaseOfferDetails?.formattedPrice}
                    </Text>
                    <Button
                      title="Buy"
                      onPress={() => {
                        requestPurchase({
                          skus: [item.productId],
                        });
                      }}
                    />
                  </View>
                );
              }

              if (isProductIos(item)) {
                return (
                  <View key={item.id} style={{gap: 12}}>
                    <Text>
                      {item.displayName} - {item.displayPrice}
                    </Text>
                    <Button
                      title="Buy"
                      onPress={() => {
                        requestPurchase({
                          sku: item.id,
                        });
                      }}
                    />
                  </View>
                );
              }
            })}

            <Text style={{fontSize: 20}}>Subscriptions</Text>
            {subscriptions.map((item) => {
              if (isSubscriptionProductAndroid(item)) {
                return item.subscriptionOfferDetails?.map((offer) => (
                  <View key={offer.offerId} style={{gap: 12}}>
                    <Text>
                      {item.title} -{' '}
                      {offer.pricingPhases.pricingPhaseList
                        .map((ppl) => ppl.billingPeriod)
                        .join(',')}
                    </Text>
                    <Button
                      title="Subscribe"
                      onPress={() => {
                        requestSubscription({
                          skus: [item.productId],
                          ...(offer.offerToken && {
                            subscriptionOffers: [
                              {
                                sku: item.productId,
                                offerToken: offer.offerToken,
                              },
                            ],
                          }),
                        } as RequestSubscriptionAndroidProps);
                      }}
                    />
                  </View>
                ));
              }

              if (isSubscriptionProductIos(item)) {
                return (
                  <View key={item.id} style={{gap: 12}}>
                    <Text>
                      {item.displayName} - {item.displayPrice}
                    </Text>
                    <Button
                      title="Subscribe"
                      onPress={() => {
                        requestSubscription({sku: item.id});
                      }}
                    />
                  </View>
                );
              }
            })}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  title: {
    marginTop: 24,
    fontSize: 20,
    fontWeight: 'bold',
  },
  buttons: {
    height: 90,
  },
  buttonsWrapper: {
    padding: 24,

    gap: 8,
  },
  buttonView: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#000',
    padding: 8,
  },
  content: {
    flex: 1,
    alignSelf: 'stretch',
    padding: 24,
    gap: 12,
  },
});
