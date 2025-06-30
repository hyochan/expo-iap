# Expo IAP Complete Setup Guide

This comprehensive guide covers everything you need to know to successfully implement in-app purchases with expo-iap, from store setup to production deployment.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Google Play Store Setup](#google-play-store-setup)
3. [Apple App Store Setup](#apple-app-store-setup)
4. [Expo Project Configuration](#expo-project-configuration)
5. [Backend Receipt Validation](#backend-receipt-validation)
6. [Development & Testing](#development--testing)
7. [Production Deployment](#production-deployment)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

Before starting, ensure you have:

- An active Google Play Developer account ($25 one-time fee)
- An active Apple Developer account ($99/year)
- An Expo project with SDK 51+
- Basic understanding of React Native/Expo development

## Google Play Store Setup

### Store Requirements

Your app must meet these requirements before publishing with IAP:

1. **App Bundle/APK**: Upload a signed app bundle to Google Play Console
2. **Privacy Policy**: Required for apps with IAP functionality
3. **Content Rating**: Complete the content rating questionnaire
4. **Target API Level**: Must target latest Android API level (currently API 34+)

### Creating In-App Products

1. **Access Google Play Console**

   - Go to [Google Play Console](https://play.google.com/console)
   - Select your app

2. **Navigate to In-App Products**

   ```
   Monetize → Products → In-app products
   ```

3. **Create Product Types**

   **For One-Time Purchases (Managed Products):**

   ```
   - Product ID: com.yourapp.premium_unlock
   - Name: Premium Unlock
   - Description: Unlock all premium features
   - Price: Set your desired price
   - Status: Active
   ```

   **For Subscriptions:**

   ```
   - Navigate to: Monetize → Products → Subscriptions
   - Product ID: com.yourapp.premium_monthly
   - Name: Premium Monthly
   - Billing period: 1 month
   - Price: Set your monthly price
   - Free trial: Optional (e.g., 7 days)
   - Grace period: Recommended (e.g., 3 days)
   ```

### Linking Products to expo-iap

Use the exact Product IDs in your code:

```typescript
import {getProducts, getSubscriptions} from 'expo-iap';

// For managed products
const products = await getProducts({
  skus: ['com.yourapp.premium_unlock', 'com.yourapp.remove_ads'],
});

// For subscriptions
const subscriptions = await getSubscriptions({
  skus: ['com.yourapp.premium_monthly', 'com.yourapp.premium_yearly'],
});
```

### API Keys (Optional)

For backend validation, you'll need:

1. **Service Account Key**:

   ```
   Google Cloud Console → IAM & Admin → Service Accounts
   → Create Service Account → Generate JSON key
   ```

2. **Google Play Developer API**:
   ```
   Google Cloud Console → APIs & Services → Library
   → Search "Google Play Developer API" → Enable
   ```

### Android Testing

1. **Internal Testing**:

   - Upload your app to Internal Testing track
   - Add test accounts in Play Console
   - Test purchases will be free for internal testers

2. **License Testing**:
   ```
   Google Play Console → Setup → License testing
   → Add test accounts → Set response for test accounts
   ```

## Apple App Store Setup

### Store Requirements

Your app must meet Apple's requirements:

1. **App Store Guidelines**: Follow Apple's App Store Review Guidelines
2. **Paid Applications Agreement**: Sign the agreement in App Store Connect
3. **Banking Information**: Add your banking details for revenue
4. **Tax Information**: Complete tax forms

### Creating In-App Purchases

1. **Access App Store Connect**

   - Go to [App Store Connect](https://appstoreconnect.apple.com)
   - Select your app

2. **Navigate to In-App Purchases**

   ```
   App Store Connect → Your App → Features → In-App Purchases
   ```

3. **Create Product Types**

   **For Consumables:**

   ```
   - Type: Consumable
   - Product ID: com.yourapp.coins_100
   - Reference Name: 100 Coins
   - Price Tier: Select appropriate tier
   - Localizations: Add descriptions for each market
   ```

   **For Non-Consumables:**

   ```
   - Type: Non-Consumable
   - Product ID: com.yourapp.premium_unlock
   - Reference Name: Premium Unlock
   - Price Tier: Select appropriate tier
   ```

   **For Auto-Renewable Subscriptions:**

   ```
   - Type: Auto-Renewable Subscription
   - Product ID: com.yourapp.premium_monthly
   - Reference Name: Premium Monthly
   - Subscription Group: Create/select group
   - Subscription Duration: 1 Month
   - Price Tier: Select appropriate tier
   - Free Trial: Optional
   ```

### API Keys and Certificates

1. **App Store Connect API Key** (for backend validation):

   ```
   App Store Connect → Users and Access → Keys → App Store Connect API
   → Generate API Key → Download .p8 file
   ```

2. **Shared Secret** (for receipt validation):
   ```
   App Store Connect → Your App → App Information → App Store Connect
   → Master Shared Secret → Generate
   ```

### iOS Sandbox Testing

1. **Create Sandbox Accounts**:

   ```
   App Store Connect → Users and Access → Sandbox Testers
   → Add new tester with unique email
   ```

2. **Testing Setup**:
   - Sign out of App Store on test device
   - Install your app via TestFlight or development build
   - When prompted for purchase, use sandbox account credentials

## Expo Project Configuration

### App Configuration

Update your `app.json` or `app.config.js`:

```json
{
  "expo": {
    "name": "Your App",
    "slug": "your-app",
    "version": "1.0.0",
    "platforms": ["ios", "android"],
    "plugins": ["expo-iap"],
    "ios": {
      "bundleIdentifier": "com.yourcompany.yourapp",
      "buildNumber": "1"
    },
    "android": {
      "package": "com.yourcompany.yourapp",
      "versionCode": 1,
      "permissions": ["com.android.vending.BILLING"]
    }
  }
}
```

### Required Permissions

**Android** (automatically handled by expo-iap plugin):

```xml
<uses-permission android:name="com.android.vending.BILLING" />
```

**iOS** (automatically handled by expo-iap plugin):

- StoreKit framework is automatically linked

### Development Build Setup

Since expo-iap requires native code, you need a development build:

```bash
# Install expo-iap
npx expo install expo-iap

# Create development build
npx expo run:ios
npx expo run:android

# Or use EAS Build
npx eas build --profile development --platform all
```

## Backend Receipt Validation

### Why Validate Receipts?

- Prevent fraud and unauthorized purchases
- Ensure purchase integrity
- Handle subscription renewals properly
- Track revenue accurately

### Google Play Store Validation

```typescript
// Server-side validation example (Node.js)
import {google} from 'googleapis';

async function validateGooglePlayReceipt(
  packageName: string,
  productId: string,
  purchaseToken: string,
) {
  const auth = new google.auth.GoogleAuth({
    keyFile: 'path/to/service-account-key.json',
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });

  const androidpublisher = google.androidpublisher({version: 'v3', auth});

  try {
    const response = await androidpublisher.purchases.products.get({
      packageName,
      productId,
      token: purchaseToken,
    });

    // Check if purchase is valid
    if (response.data.purchaseState === 0) {
      return {valid: true, data: response.data};
    }

    return {valid: false};
  } catch (error) {
    return {valid: false, error};
  }
}
```

### Apple App Store Validation

```typescript
// Server-side validation example (Node.js)
async function validateAppleReceipt(
  receiptData: string,
  isProduction: boolean = true,
) {
  const endpoint = isProduction
    ? 'https://buy.itunes.apple.com/verifyReceipt'
    : 'https://sandbox.itunes.apple.com/verifyReceipt';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      'receipt-data': receiptData,
      password: 'your-shared-secret', // From App Store Connect
      'exclude-old-transactions': true,
    }),
  });

  const result = await response.json();

  if (result.status === 0) {
    return {valid: true, data: result};
  }

  // If production validation fails, try sandbox
  if (isProduction && result.status === 21007) {
    return validateAppleReceipt(receiptData, false);
  }

  return {valid: false, status: result.status};
}
```

### Crucial Data Points from expo-iap

When validating receipts, ensure you capture:

```typescript
import {purchaseUpdatedListener} from 'expo-iap';

purchaseUpdatedListener((purchase) => {
  // Essential data for validation
  const validationData = {
    // Common fields
    productId: purchase.productId,
    transactionId: purchase.transactionId,
    transactionDate: purchase.transactionDate,

    // Android specific
    purchaseToken: purchase.purchaseToken, // For Google Play validation
    packageName: purchase.packageName,

    // iOS specific
    receiptData: purchase.transactionReceipt, // For Apple validation
    originalTransactionId: purchase.originalTransactionId,

    // Subscription specific
    autoRenewing: purchase.autoRenewing,
    expirationDate: purchase.expirationDate,
  };

  // Send to your backend for validation
  validatePurchase(validationData);
});
```

## Development & Testing

### Expo Dev Client Integration

1. **Install Dependencies**:

   ```bash
   npx expo install expo-iap
   ```

2. **Create Development Build**:

   ```bash
   # For iOS
   npx expo run:ios

   # For Android
   npx expo run:android
   ```

3. **Testing Configuration**:

   ```typescript
   import { initConnection, getProducts } from 'expo-iap';

   export default function App() {
     useEffect(() => {
       const initIAP = async () => {
         try {
           await initConnection();
           console.log('IAP connection initialized');

           // Test product loading
           const products = await getProducts({
             skus: ['com.yourapp.test_product']
           });
           console.log('Products:', products);
         } catch (error) {
           console.error('IAP initialization failed:', error);
         }
       };

       initIAP();
     }, []);

     return (
       // Your app content
     );
   }
   ```

### Recommended Testing Workflow

1. **Development Phase**:

   - Use development build with expo-dev-client
   - Test initialization and product loading
   - Mock purchase flows for UI testing

2. **Testing Phase**:

   - Use internal testing (Android) or TestFlight (iOS)
   - Test actual purchase flows with test accounts
   - Verify receipt validation

3. **Pre-Production**:
   - Test with production store setup
   - Verify all subscription scenarios
   - Test edge cases and error handling

### Common Development Issues

1. **"Products not found"**:

   - Ensure product IDs match exactly
   - Check if products are active in store console
   - Wait for store propagation (can take hours)

2. **"Not connected to store"**:

   - Ensure proper app signing
   - Check if app is uploaded to store
   - Verify store account permissions

3. **"Purchase failed"**:
   - Check test account setup
   - Verify app permissions
   - Ensure proper error handling

## Production Deployment

### Pre-Launch Checklist

- [ ] All products created and active in both stores
- [ ] Receipt validation backend implemented
- [ ] Error handling for all purchase scenarios
- [ ] Subscription management UI implemented
- [ ] Terms of service and privacy policy updated
- [ ] App thoroughly tested with real purchases

### Store Submission

1. **Google Play Store**:

   - Upload signed app bundle
   - Complete store listing
   - Set up merchant account
   - Submit for review

2. **Apple App Store**:
   - Upload build via Xcode or Application Loader
   - Complete app metadata
   - Submit for review
   - Ensure all IAP products are submitted too

### Post-Launch Monitoring

- Monitor purchase success rates
- Track subscription renewals and cancellations
- Monitor backend validation logs
- Set up alerts for purchase failures

## Troubleshooting

### Common Issues and Solutions

1. **Products not loading**:

   ```typescript
   // Add retry logic
   const getProductsWithRetry = async (skus: string[], retries = 3) => {
     for (let i = 0; i < retries; i++) {
       try {
         const products = await getProducts({skus});
         if (products.length > 0) return products;
       } catch (error) {
         console.log(`Attempt ${i + 1} failed:`, error);
         if (i === retries - 1) throw error;
         await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
       }
     }
   };
   ```

2. **Purchase validation failing**:

   ```typescript
   // Implement robust error handling
   const validatePurchase = async (purchase) => {
     try {
       const result = await validateWithBackend(purchase);
       if (result.valid) {
         await finishTransaction({purchase});
         // Grant user access
       } else {
         // Handle invalid purchase
         console.error('Invalid purchase:', result.error);
       }
     } catch (error) {
       // Handle network errors, retry logic
       console.error('Validation error:', error);
     }
   };
   ```

3. **Subscription status sync**:
   ```typescript
   // Regularly check subscription status
   const checkSubscriptionStatus = async () => {
     try {
       const purchases = await getAvailablePurchases();
       const activeSubscriptions = purchases.filter(
         (p) => p.autoRenewing && new Date(p.expirationDate) > new Date(),
       );

       // Update user's subscription status
       updateUserSubscriptionStatus(activeSubscriptions);
     } catch (error) {
       console.error('Failed to check subscription status:', error);
     }
   };
   ```

### Debug Tips

1. **Enable detailed logging**:

   ```typescript
   import {setDebugMode} from 'expo-iap';

   // Only in development
   if (__DEV__) {
     setDebugMode(true);
   }
   ```

2. **Test with multiple scenarios**:

   - New purchases
   - Restored purchases
   - Failed purchases
   - Network interruptions
   - Subscription renewals
   - Subscription cancellations

3. **Monitor store console logs**:
   - Check Google Play Console for Android errors
   - Monitor App Store Connect for iOS issues
   - Review crash reports and user feedback

## Additional Resources

- [expo-iap API Documentation](./IAP.md)
- [Error Code Reference](./ERROR_CODES.md)
- [Google Play Billing Documentation](https://developer.android.com/google/play/billing)
- [Apple In-App Purchase Programming Guide](https://developer.apple.com/in-app-purchase/)
- [Expo Development Build Guide](https://docs.expo.dev/development/introduction/)

## Support

If you encounter issues not covered in this guide:

1. Check the [GitHub Issues](https://github.com/hyochan/expo-iap/issues)
2. Start a [GitHub Discussion](https://github.com/hyochan/expo-iap/discussions)
3. Review the [example app](../example/) for implementation reference
4. Join our [Slack community](https://hyo.dev/joinSlack) for support

---

_This guide is maintained by the expo-iap community. Contributions and improvements are welcome!_
