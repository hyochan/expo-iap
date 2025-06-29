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
  Platform,
} from 'react-native';
// eslint-disable-next-line import/no-unresolved
import {useIAP, ErrorCode, PurchaseError, ErrorCodeUtils} from 'expo-iap';

const productSkus = [
  'cpk.points.1000',
  'cpk.points.5000',
  'cpk.points.10000',
  'cpk.points.30000',
];

const subscriptionSkus = [
  'cpk.membership.monthly.bronze',
  'cpk.membership.monthly.silver',
];

const operations = [
  'getProducts',
  'getSubscriptions',
  'validateReceipt',
  'simulateErrors',
] as const;
type Operation = (typeof operations)[number];

// Enhanced error handling function using our centralized error system
const handlePurchaseError = (error: any) => {
  console.log('Raw error:', error);

  // Try to create a PurchaseError with platform detection
  let enhancedError: PurchaseError;
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  
  try {
    enhancedError = PurchaseError.fromPlatformError(error, platform);
  } catch {
    // Fallback: map platform-specific error codes to our centralized ErrorCode
    let mappedErrorCode = ErrorCode.E_UNKNOWN;
    
    if (error.code !== undefined) {
      // Map platform-specific codes to our centralized error codes
      mappedErrorCode = ErrorCodeUtils.fromPlatformCode(error.code, platform);
      console.log(`Platform error code: ${error.code} → Mapped to: ${mappedErrorCode}`);
    }
    
    // Create a fallback error with mapped code
    enhancedError = new PurchaseError(
      'PurchaseError',
      error.message || 'Unknown error occurred',
      error.responseCode,
      error.debugMessage,
      mappedErrorCode,
      error.productId,
      platform,
    );
  }

  console.log('Enhanced error:', {
    code: enhancedError.code,
    message: enhancedError.message,
    platform: enhancedError.platform,
    platformSpecificCode: enhancedError.getPlatformCode(),
  });

  // Provide user-friendly error messages based on error type
  let userMessage = enhancedError.message;
  let shouldShowAlert = true;

  switch (enhancedError.code) {
    case ErrorCode.E_USER_CANCELLED:
      userMessage = 'Purchase was cancelled by user';
      shouldShowAlert = false; // Don't show alert for user cancellation
      break;
    case ErrorCode.E_ITEM_UNAVAILABLE:
      userMessage = 'This item is currently unavailable for purchase';
      break;
    case ErrorCode.E_NETWORK_ERROR:
      userMessage = 'Network error. Please check your connection and try again';
      break;
    case ErrorCode.E_SERVICE_ERROR:
      userMessage = 'App Store service error. Please try again later';
      break;
    case ErrorCode.E_NOT_PREPARED:
      userMessage = 'Purchase system is not ready. Please wait and try again';
      break;
    case ErrorCode.E_ALREADY_OWNED:
      userMessage = 'You already own this item';
      break;
    case ErrorCode.E_PURCHASE_ERROR:
      userMessage = 'Purchase failed. Please try again';
      break;
    case ErrorCode.E_DEVELOPER_ERROR:
      userMessage = 'Configuration error. Please contact support';
      break;
    default:
      userMessage = enhancedError.message || 'An unexpected error occurred';
  }

  // Show platform-specific debugging info in development
  if (__DEV__) {
    console.log('Error mapping details:', {
      originalError: error,
      mappedErrorCode: enhancedError.code,
      platformCode: enhancedError.getPlatformCode(),
      platform: platform,
      userMessage: userMessage,
    });
  }

  if (shouldShowAlert) {
    Alert.alert('Purchase Error', userMessage);
  }

  return enhancedError;
};

// Simulate real-world purchase errors that users commonly encounter
const simulateRealWorldErrors = () => {
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  
  // Common real-world error scenarios
  const errorScenarios = [
    {
      title: 'User Cancelled Purchase',
      description: 'User tapped "Cancel" in payment dialog',
      error: {
        code: platform === 'ios' ? 2 : 'E_USER_CANCELLED',
        message: 'User cancelled the purchase',
        debugMessage: 'Payment was cancelled by user interaction',
        productId: 'cpk.points.1000'
      }
    },
    {
      title: 'Network Connection Failed',
      description: 'No internet connection during purchase',
      error: {
        code: platform === 'ios' ? 6 : 'E_NETWORK_ERROR',
        message: 'Network connection error',
        debugMessage: 'Unable to connect to App Store/Play Store servers',
        productId: 'cpk.points.5000'
      }
    },
    {
      title: 'Item Not Available',
      description: 'Product is no longer available for purchase',
      error: {
        code: platform === 'ios' ? 4 : 'E_ITEM_UNAVAILABLE',
        message: 'The requested item is not available',
        debugMessage: 'Product SKU not found in store catalog',
        productId: 'cpk.points.invalid'
      }
    },
    {
      title: 'Already Owned',
      description: 'User already owns this non-consumable item',
      error: {
        code: platform === 'ios' ? 16 : 'E_ALREADY_OWNED',
        message: 'Item is already owned',
        debugMessage: 'Non-consumable product already purchased',
        productId: 'cpk.membership.premium'
      }
    },
    {
      title: 'Service Unavailable',
      description: 'App Store/Play Store service is down',
      error: {
        code: platform === 'ios' ? 1 : 'E_SERVICE_ERROR',
        message: 'Service temporarily unavailable',
        debugMessage: 'Store service is currently experiencing issues',
        responseCode: 503
      }
    }
  ];

  // Show selection dialog
  Alert.alert(
    'Simulate Real Purchase Errors',
    'Choose an error scenario to see how our error handling works:',
    [
      ...errorScenarios.map((scenario, index) => ({
        text: `${index + 1}. ${scenario.title}`,
        onPress: () => {
          console.log(`\n=== Simulating: ${scenario.title} ===`);
          console.log(`Description: ${scenario.description}`);
          console.log(`Platform: ${platform}`);
          console.log(`Error Details:`, scenario.error);
          
          // Demonstrate the error handling
          const enhancedError = handlePurchaseError(scenario.error);
          
          // Show additional info about the error processing
          console.log(`\n--- Error Processing Results ---`);
          console.log(`Original Platform Code: ${scenario.error.code}`);
          console.log(`Mapped to ErrorCode: ${enhancedError.code}`);
          console.log(`User Message: ${enhancedError.message}`);
          console.log(`Platform: ${enhancedError.platform}`);
          
          // Show the mapping in action
          setTimeout(() => {
            Alert.alert(
              'Error Handling Demo',
              `Scenario: ${scenario.title}\n\n` +
              `What happened: ${scenario.description}\n\n` +
              `Platform Error Code: ${scenario.error.code}\n` +
              `Mapped to: ${enhancedError.code}\n\n` +
              `User sees: "${enhancedError.message}"\n\n` +
              `This demonstrates how platform-specific error codes from iOS/Android Constants are automatically mapped to our centralized ErrorCode system.`,
              [{ text: 'OK' }]
            );
          }, 100);
        }
      })),
      { text: 'Cancel', style: 'cancel' }
    ]
  );
};

// Real-world purchase handling with retry logic and proper error handling
const handlePurchaseWithRetry = async (
  productId: string, 
  isSubscription: boolean, 
  purchaseFunc: any,
  subscriptionOffer?: any,
  retryCount = 0
) => {
  const MAX_RETRIES = 2;
  
  try {
    console.log(`Attempting purchase: ${productId} (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);
    
    if (isSubscription) {
      if (Platform.OS === 'android' && subscriptionOffer) {
        // Android subscription with offer
        await purchaseFunc({
          request: {
            skus: [productId],
            subscriptionOffers: [subscriptionOffer],
          },
          type: 'subs',
        });
      } else {
        // iOS subscription or Android without offer
        await purchaseFunc({
          request: { sku: productId },
          type: 'subs',
        });
      }
    } else {
      if (Platform.OS === 'ios') {
        await purchaseFunc({
          request: { sku: productId },
        });
      } else {
        await purchaseFunc({
          request: { skus: [productId] },
        });
      }
    }
    
    console.log(`Purchase initiated successfully for ${productId}`);
    
  } catch (error: any) {
    console.log(`Purchase failed for ${productId}:`, error);
    
    // Handle the error with our centralized error handling
    const enhancedError = handlePurchaseError(error);
    
    // Determine if we should retry based on error type
    const shouldRetry = canRetryError(enhancedError.code || ErrorCode.E_UNKNOWN) && retryCount < MAX_RETRIES;
    
    if (shouldRetry) {
      Alert.alert(
        'Purchase Failed',
        `${enhancedError.message}\n\nWould you like to try again?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Retry',
            onPress: () => {
              setTimeout(() => {
                handlePurchaseWithRetry(productId, isSubscription, purchaseFunc, subscriptionOffer, retryCount + 1);
              }, 1000); // Wait 1 second before retry
            }
          }
        ]
      );
    } else if (enhancedError.code === ErrorCode.E_ALREADY_OWNED) {
      // Special handling for already owned items
      Alert.alert(
        'Already Purchased',
        'You already own this item. You can restore your purchases from your account.',
        [
          { text: 'OK' },
          { text: 'Restore Purchases', onPress: () => console.log('Restore purchases triggered') }
        ]
      );
    } else {
      // Show appropriate error message for non-retryable errors
      const isUserCancelled = enhancedError.code === ErrorCode.E_USER_CANCELLED;
      if (!isUserCancelled) {
        Alert.alert(
          'Purchase Failed',
          enhancedError.message,
          [{ text: 'OK' }]
        );
      }
    }
  }
};

// Determine if an error is retryable
const canRetryError = (errorCode: ErrorCode): boolean => {
  const retryableErrors = [
    ErrorCode.E_NETWORK_ERROR,
    ErrorCode.E_SERVICE_ERROR,
    ErrorCode.E_REMOTE_ERROR,
    ErrorCode.E_INTERRUPTED,
    ErrorCode.E_NOT_PREPARED,
  ];
  
  return retryableErrors.includes(errorCode);
};

export default function App() {
  const [syncError, setSyncError] = useState<Error | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);

  const {
    connected,
    products,
    subscriptions,
    currentPurchase,
    currentPurchaseError,
    getProducts,
    getSubscriptions,
    requestPurchase,
    validateReceipt,
  } = useIAP({
    onPurchaseSuccess: (purchase) => {
      InteractionManager.runAfterInteractions(() => {
        Alert.alert('Purchase successful', JSON.stringify(purchase));
      });
    },
    onPurchaseError: (error) => {
      InteractionManager.runAfterInteractions(() => {
        handlePurchaseError(error);
      });
    },
    onSyncError: (error) => {
      console.log('Sync error occurred:', error);
      setSyncError(error);
      InteractionManager.runAfterInteractions(() => {
        Alert.alert(
          'Sync Error',
          'Failed to synchronize with App Store. You may need to enter your password to verify subscriptions.',
          [{text: 'OK', onPress: () => setSyncError(null)}],
        );
      });
    },
  });

  // Fetch products and subscriptions only when connected
  useEffect(() => {
    if (!connected) return;

    const initializeIAP = async () => {
      try {
        await Promise.all([
          getProducts(productSkus),
          getSubscriptions(subscriptionSkus),
        ]);
        setIsReady(true);
      } catch (error) {
        console.error('Error initializing IAP:', error);
        handlePurchaseError(error);
      }
    };
    initializeIAP();
  }, [connected, getProducts, getSubscriptions]);

  // Handle purchase updates and errors
  useEffect(() => {
    if (currentPurchase) {
      InteractionManager.runAfterInteractions(() => {
        Alert.alert('Purchase updated', JSON.stringify(currentPurchase));
      });
    }

    if (currentPurchaseError) {
      InteractionManager.runAfterInteractions(() => {
        handlePurchaseError(currentPurchaseError);
      });
    }
  }, [currentPurchase, currentPurchaseError]);

  const handleOperation = async (operation: Operation) => {
    if (!connected) {
      Alert.alert('Not Connected', 'Please wait for IAP to connect.');
      return;
    }

    try {
      switch (operation) {
        case 'getProducts':
          await getProducts(productSkus);
          break;
        case 'getSubscriptions':
          await getSubscriptions(subscriptionSkus);
          break;
        case 'validateReceipt':
          // Choose the first product for validation as an example
          const productToValidate =
            products.length > 0
              ? products[0].id
              : subscriptions.length > 0
                ? subscriptions[0].id
                : null;

          if (!productToValidate) {
            Alert.alert('No Products', 'Please fetch products first');
            return;
          }

          setValidationResult(null);

          if (Platform.OS === 'ios') {
            const result = await validateReceipt(productToValidate);
            setValidationResult(result);
            Alert.alert(
              'iOS Receipt Validation',
              `Result: ${result.isValid ? 'Valid' : 'Invalid'}\n` +
                `Receipt data available: ${result.receiptData ? 'Yes' : 'No'}\n` +
                `JWS data available: ${result.jwsRepresentation ? 'Yes' : 'No'}`,
            );
          } else if (Platform.OS === 'android') {
            Alert.alert(
              'Android Receipt Validation',
              'Android receipt validation requires additional server parameters.\n\n' +
                'For a real app, you would need:\n' +
                '- packageName\n' +
                '- productToken\n' +
                '- accessToken',
            );
          }
          break;
        case 'simulateErrors':
          // Simulate real-world purchase errors
          simulateRealWorldErrors();
          break;
      }
    } catch (error) {
      console.error(`Error in ${operation}:`, error);
      handlePurchaseError(error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Expo IAP Example with useIAP</Text>

      {/* Display sync error banner if there's an error */}
      {syncError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>
            Sync error: Please verify your App Store credentials
          </Text>
        </View>
      )}

      <View style={styles.buttons}>
        <ScrollView contentContainerStyle={styles.buttonsWrapper} horizontal>
          {operations.map((operation) => (
            <Pressable
              key={operation}
              onPress={() => handleOperation(operation)}
            >
              <View style={styles.buttonView}>
                <Text style={{fontSize: 12}}>
                  {operation === 'simulateErrors' ? 'Demo Errors' : operation}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {validationResult && (
        <View style={styles.validationResult}>
          <Text style={styles.validationTitle}>Receipt Validation Result:</Text>
          <Text>Valid: {validationResult.isValid ? 'Yes' : 'No'}</Text>
          <Text>
            Receipt data:{' '}
            {validationResult.receiptData ? 'Available' : 'Not available'}
          </Text>
          <Text>
            JWS data:{' '}
            {validationResult.jwsRepresentation ? 'Available' : 'Not available'}
          </Text>
        </View>
      )}

      <View style={styles.content}>
        {!connected ? (
          <Text>Not connected</Text>
        ) : !isReady ? (
          <Text>Loading...</Text>
        ) : (
          <View style={{gap: 12}}>
            <Text style={{fontSize: 20}}>Products</Text>
            {products.map((item) => {
              if (item.platform === 'android') {
                return (
                  <View key={item.title} style={{gap: 12}}>
                    <Text>
                      {item.title} -{' '}
                      {item.oneTimePurchaseOfferDetails?.formattedPrice}
                    </Text>
                    <Button
                      title="Buy"
                      onPress={() => {
                        handlePurchaseWithRetry(item.id, false, requestPurchase);
                      }}
                    />
                  </View>
                );
              }

              if (item.platform === 'ios') {
                return (
                  <View key={item.id} style={{gap: 12}}>
                    <Text>
                      {item.title} - {item.displayPrice}
                    </Text>
                    <Button
                      title="Buy"
                      onPress={() => {
                        handlePurchaseWithRetry(item.id, false, requestPurchase);
                      }}
                    />
                  </View>
                );
              }
            })}

            <Text style={{fontSize: 20}}>Subscriptions</Text>
            {subscriptions.map((item) => {
              if (item.platform === 'android') {
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
                        const subscriptionOffer = offer.offerToken ? {
                          sku: item.id,
                          offerToken: offer.offerToken,
                        } : undefined;
                        handlePurchaseWithRetry(item.id, true, requestPurchase, subscriptionOffer);
                      }}
                    />
                  </View>
                ));
              }

              if (item.platform === 'ios') {
                return (
                  <View key={item.id} style={{gap: 12}}>
                    <Text>
                      {item.displayName} - {item.displayPrice}
                    </Text>
                    <Button
                      title="Subscribe"
                      onPress={() => {
                        handlePurchaseWithRetry(item.id, true, requestPurchase);
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
  errorBanner: {
    backgroundColor: '#ffcccc',
    padding: 8,
    width: '100%',
    alignItems: 'center',
    marginVertical: 4,
  },
  errorText: {
    color: '#cc0000',
    fontWeight: '600',
  },
  validationResult: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    width: '90%',
    marginVertical: 10,
  },
  validationTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
});
