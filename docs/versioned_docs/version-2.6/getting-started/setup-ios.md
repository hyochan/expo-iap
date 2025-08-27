---
sidebar_position: 1
---

import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# iOS Setup

<AdFitTopFixed />

Setting up in-app purchases for iOS requires configuration in both Xcode and App Store Connect.

## App Store Connect Configuration

### 1. Create Your App Record

1. Sign in to [App Store Connect](https://appstoreconnect.apple.com/)
2. Navigate to "My Apps"
3. Create a new app or select your existing app
4. Fill in the required app information

### 2. Create In-App Purchase Products

1. In your app's page, go to **Features** > **In-App Purchases**
2. Click the **+** button to create a new product
3. Choose your product type:
   - **Consumable**: Can be purchased multiple times (coins, lives, etc.)
   - **Non-Consumable**: One-time purchase (premium features)
   - **Auto-Renewable Subscription**: Recurring subscription
   - **Non-Renewable Subscription**: Time-limited subscription

### 3. Configure Product Details

For each product, provide:

- **Product ID**: Unique identifier (e.g., `com.yourapp.premium`)
- **Reference Name**: Internal name for your team
- **Pricing**: Select price tier or custom pricing
- **Display Name**: Name shown to users
- **Description**: Product description for users

### 4. Submit for Review

- Add product screenshot (1024x1024px)
- Submit for review (first-time products need approval)

## Xcode Configuration

### 1. Enable In-App Purchase Capability

1. Open your project in Xcode
2. Select your app target
3. Go to **Signing & Capabilities**
4. Click **+ Capability**
5. Add **In-App Purchase**

### 2. Configure Bundle Identifier

Ensure your bundle identifier in Xcode matches the one in App Store Connect:

1. Select your target
2. Go to **General** tab
3. Verify **Bundle Identifier** matches App Store Connect

### 3. Code Signing

Make sure you have proper code signing set up:

1. Go to **Signing & Capabilities**
2. Select your development team
3. Choose appropriate provisioning profile

## Testing Setup

### 1. Create Sandbox Test User

1. In App Store Connect, go to **Users and Access**
2. Click **Sandbox Testers**
3. Create a new sandbox test user with a unique email
4. **Important**: Use a different email than your developer account

### 2. Configure Test Environment

On your iOS device:

1. Sign out of the App Store
2. Go to **Settings** > **App Store**
3. Sign out of your Apple ID
4. Install your app via Xcode or TestFlight
5. When prompted for App Store credentials, use your sandbox test user

## Code Integration

### Basic Setup

```tsx
import {useIAP, ErrorCode} from 'expo-iap';

const productIds = [
  'com.yourapp.premium',
  'com.yourapp.coins_100',
  'com.yourapp.subscription_monthly',
];

function App() {
  const {connected, products, getProducts, requestPurchase, validateReceipt} =
    useIAP({
      onPurchaseSuccess: (purchase) => {
        console.log('Purchase successful:', purchase);
        // Handle successful purchase
        validatePurchase(purchase);
      },
      onPurchaseError: (error) => {
        console.error('Purchase failed:', error);
        // Handle purchase error
      },
    });

  React.useEffect(() => {
    if (connected) {
      getProducts(productIds);
    }
  }, [connected]);

  const validatePurchase = async (purchase) => {
    try {
      const result = await validateReceipt(purchase.transactionId);
      if (result.isValid) {
        // Grant user the purchased content
        console.log('Receipt is valid');
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  return (
    <View>
      {products.map((product) => (
        <TouchableOpacity
          key={product.id}
          onPress={() => requestPurchase({request: {sku: product.id}})}
        >
          <Text>
            {product.title} - {product.displayPrice}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
```

> **💡 Cross-Platform Note:** This example shows iOS-specific usage with `sku`. For cross-platform compatibility, include both `sku` and `skus` in your request object. See the [Core Methods](/docs/api/methods/core-methods#requestpurchase) documentation for details.

### iOS-Specific Features

#### Receipt Validation

```tsx
const validateReceipt = async (productId: string) => {
  try {
    const result = await validateReceipt(productId);

    console.log('Receipt validation result:', {
      isValid: result.isValid,
      receiptData: result.receiptData,
      jwsRepresentation: result.jwsRepresentation, // iOS 15+
    });

    return result.isValid;
  } catch (error) {
    console.error('Receipt validation failed:', error);
    return false;
  }
};
```

#### Handling StoreKit Errors

```tsx
const handlePurchaseError = (error: any) => {
  switch (error.code) {
    case ErrorCode.E_USER_CANCELLED:
      // User cancelled - don't show error
      break;
    case ErrorCode.E_PAYMENT_NOT_ALLOWED:
      Alert.alert('Purchases are not allowed on this device');
      break;
    case ErrorCode.E_PAYMENT_INVALID:
      Alert.alert('Invalid payment information');
      break;
    default:
      Alert.alert('Purchase failed', error.message);
  }
};
```

## Common Issues

### Product IDs Not Found

**Problem**: Products return empty or undefined **Solution**:

- Verify product IDs match exactly between code and App Store Connect
- Ensure products are in "Ready to Submit" or "Approved" state
- Check bundle identifier matches

### Sandbox Testing Issues

**Problem**: "Cannot connect to iTunes Store" error **Solution**:

- Use a dedicated sandbox test user
- Sign out of regular App Store account
- Verify internet connection
- Try on a real device (simulator may have issues)

### Receipt Validation Failures

**Problem**: Receipt validation returns invalid **Solution**:

- Check if app is properly signed
- Verify receipt data is not corrupted
- Ensure proper error handling for network issues

## Best Practices

1. **Always validate receipts** server-side for production apps
2. **Handle all error cases** gracefully
3. **Test thoroughly** with sandbox users
4. **Provide restore functionality** for non-consumable products

## Next Steps

- [Learn about Android setup](./setup-android)
- [Explore getting started guide](../guides/getting-started)
- [Understand error codes](../api/error-codes)
