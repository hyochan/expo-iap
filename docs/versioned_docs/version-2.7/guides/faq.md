---
title: Frequently Asked Questions
sidebar_label: FAQ
sidebar_position: 6
---

import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# Frequently Asked Questions

<AdFitTopFixed />

## General Questions

### What is expo-iap?

`expo-iap` is a comprehensive in-app purchase solution specifically designed for Expo and React Native applications. It provides a unified API for handling purchases across iOS and Android with TypeScript support and modern React hooks.

### How is expo-iap different from react-native-iap?

`expo-iap` is the official successor to `react-native-iap`. After 8 years of maintaining `react-native-iap` (with 3K+ stars, 230+ contributors, and 214K monthly downloads), the project is being gradually deprecated in favor of `expo-iap`.

**Why the migration?**

- **Expo-first approach**: Expo is now the recommended way to start React Native projects
- **Better performance**: Built for New Architecture with no manual bridging required
- **Lower maintenance cost**: Easier to test, update, and support
- **Renderer-agnostic**: Works seamlessly across different React Native architectures
- **Production-ready**: Already used in major apps with 2M+ daily active users

**Key improvements in expo-iap:**

- Native Expo Modules integration
- Modern React hooks API (`useIAP`)
- Enhanced TypeScript support with full type safety
- Streamlined error handling with centralized error codes
- Cleaner APIs and smoother developer experience
- Out-of-the-box New Architecture support

For more details about the migration and reasoning, see:

- [Migration Discussion](https://github.com/hyochan/react-native-iap/discussions/2754)
- [Announcement Post](https://x.com/hyodotdev/status/1939420943665049961)

### Can I use expo-iap in a bare React Native project?

Yes! `expo-iap` works in both Expo managed and bare React Native projects. However, it's optimized for Expo workflows.

## Setup and Configuration

### Why can't I test in-app purchases in Expo Go?

In-app purchases require native modules that aren't available in Expo Go. You need to create a [custom development client](https://docs.expo.dev/development/create-development-builds/) or use a bare workflow.

### Do I need to configure anything in my app stores?

Yes, you need to:

**iOS (App Store Connect):**

- Complete agreements, tax, and banking information
- Create in-app purchase products
- Set up sandbox test accounts

**Android (Google Play Console):**

- Upload your app to a testing track
- Create in-app products
- Add test accounts

### How long does it take for products to become available?

- **iOS**: Products can take up to 24 hours to become available in sandbox
- **Android**: Products are usually available immediately after app upload

## Products and Purchases

### Why does `getProducts()` return an empty array?

Common causes:

1. Connection not established - check `connected` state
2. Product IDs don't match store configuration exactly
3. Products not yet approved/available (iOS)
4. App not uploaded to store (Android)
5. Testing on simulator/emulator

```tsx
const {connected, getProducts} = useIAP();

useEffect(() => {
  if (connected) {
    getProducts({skus: ['com.yourapp.product1']});
  }
}, [connected]);
```

### Can I purchase products without calling `getProducts()` first?

No, you should always call `getProducts()` first. This ensures:

- Products are available and properly configured
- You have the latest pricing and product information
- The store connection is established

### How do users cancel subscriptions?

Users cannot cancel subscriptions within your app. You need to direct them to the platform-specific subscription management:

```tsx
import {deepLinkToSubscriptions} from 'expo-iap';

const openSubscriptionManagement = () => {
  deepLinkToSubscriptions();
};
```

### How do I restore purchases?

For non-consumable products and subscriptions:

```tsx
const {getAvailablePurchases} = useIAP();

const restorePurchases = async () => {
  try {
    const purchases = await getAvailablePurchases();
    // Process and validate restored purchases
    for (const purchase of purchases) {
      await validateAndGrantPurchase(purchase);
    }
  } catch (error) {
    console.error('Restore failed:', error);
  }
};
```

## Receipt Validation

### Do I need to validate receipts on my server?

**Yes, absolutely!** Client-side validation is not secure. Always validate receipts on your secure server to prevent fraud.

### What should I do after successful receipt validation?

1. Grant the purchase to the user (update database, unlock features, etc.)
2. Call `finishTransaction()` to complete the purchase
3. Log the transaction for your records

```tsx
const handlePurchaseUpdate = async (purchase) => {
  try {
    // 1. Validate on server
    const isValid = await validateReceiptOnServer(purchase);

    if (isValid) {
      // 2. Grant purchase
      await grantPurchaseToUser(purchase);

      // 3. Finish transaction
      await finishTransaction({purchase});
    }
  } catch (error) {
    console.error('Purchase validation failed:', error);
  }
};
```

### What happens if I don't call `finishTransaction()`?

- The purchase will remain in a pending state
- The store will continue to notify your app about this purchase
- On iOS, the user may see repeated purchase prompts
- On Android, the purchase may be refunded automatically

## Error Handling

### What should I do when a purchase fails?

Handle different error types appropriately:

```tsx
const handlePurchaseError = (error) => {
  switch (error.code) {
    case 'E_USER_CANCELLED':
      // User cancelled - no action needed
      break;

    case 'E_NETWORK_ERROR':
      // Show retry option
      showRetryDialog();
      break;

    case 'E_ITEM_UNAVAILABLE':
      // Product not available
      showProductUnavailableMessage();
      break;

    case 'E_ALREADY_OWNED':
      // User already owns this
      showAlreadyOwnedMessage();
      break;

    default:
      // Log for investigation
      console.error('Purchase error:', error);
      break;
  }
};
```

### How do I handle network errors during purchases?

Network errors during purchases are tricky because the purchase might still go through. Always:

1. Don't retry the purchase immediately
2. Check for pending purchases on app restart
3. Implement proper error messaging for users

## Testing

### Can I test in-app purchases on simulators?

No, in-app purchases only work on real devices. Use:

- iOS: Real iPhone/iPad with sandbox account
- Android: Real Android device with signed build

### Why do my purchases work in testing but not in production?

Common issues:

- Different product IDs between testing and production
- App not properly signed for production
- Store review process not completed
- Different bundle ID or package name

### How do I test subscription cancellations?

You can't directly test cancellations in sandbox, but you can:

- Test subscription purchase flow
- Test subscription restoration
- Use server-side webhook notifications for cancellation handling

## Performance and Best Practices

### When should I initialize the connection?

Initialize as early as possible in your app's lifecycle:

```tsx
function App() {
  const {connected} = useIAP(); // Connection starts automatically

  return <YourAppContent />;
}
```

### How do I prevent multiple purchase attempts?

Implement purchase state management:

```tsx
const [isPurchasing, setIsPurchasing] = useState(false);

const handlePurchase = async (productId) => {
  if (isPurchasing) return;

  setIsPurchasing(true);
  try {
    await requestPurchase({sku: productId});
  } finally {
    setIsPurchasing(false);
  }
};
```

## Migration and Updates

### How do I migrate from react-native-iap?

`expo-iap` is the official successor to `react-native-iap`. The migration is straightforward with these key changes:

**Installation:**

```bash
# Remove react-native-iap
npm uninstall react-native-iap

# Install expo-iap
npx expo install expo-iap
```

**API Changes:**

```tsx
// react-native-iap (OLD)
import {useIAP, withIAPContext} from 'react-native-iap';

function App() {
  return (
    <withIAPContext>
      <YourApp />
    </withIAPContext>
  );
}

// expo-iap (NEW)
import {useIAP} from 'expo-iap'; // No context wrapper needed

function App() {
  return <YourApp />; // Hook works anywhere in your app
}
```

**Hook Usage (mostly compatible):**

```tsx
// Most of the useIAP API remains the same
const {
  connected,
  products,
  purchases,
  getProducts,
  requestPurchase,
  finishTransaction,
  // ... other methods
} = useIAP();
```

**Key Benefits of Migration:**

- **Automatic connection management** - no manual connection setup
- **Better error handling** - centralized error codes across platforms
- **Expo Config Plugin** - simplified native configuration
- **New Architecture support** - future-proof your app
- **Active maintenance** - continued updates and support

**Migration Timeline:**

- `react-native-iap` will be gradually deprecated over time
- Critical security updates will continue for existing users
- New features and improvements will only be added to `expo-iap`

For detailed migration guide and community support:

- [GitHub Migration Discussion](https://github.com/hyochan/react-native-iap/discussions/2754)
- [Official Announcement](https://x.com/hyodotdev/status/1939420943665049961)

### What if expo-iap doesn't support a feature I need?

1. Check if it's in the roadmap
2. File a feature request
3. Consider contributing to the project
4. For urgent needs, you might need to use react-native-iap

## Troubleshooting

### My app crashes when making purchases

Common causes:

- Not handling purchase updates properly
- Memory leaks from not cleaning up listeners
- Trying to finish transactions multiple times

### Purchases are successful but features aren't unlocked

This usually indicates:

- Receipt validation is failing
- Purchase handling logic has bugs
- Database/state updates are not working

Check your server logs and purchase handling code.

### I get "Item already owned" errors

This happens when:

- Trying to purchase a non-consumable product again
- Previous transaction wasn't finished properly
- Need to restore purchases instead

### [iOS] purchaseUpdatedListener is called twice after finishTransaction

**Issue:** On iOS, `purchaseUpdatedListener` may be called twice for the same transaction when using `andDangerouslyFinishTransactionAutomatically: false` and manually calling `finishTransaction()`.

**Symptoms:**

- First call: Immediate after successful purchase
- Second call: After `finishTransaction()` is called (or on app restart for products)
- Both calls have the same `transactionId`

**Example:**

```tsx
// This pattern may cause duplicate calls
const purchaseListener = purchaseUpdatedListener(async (purchase) => {
  console.log('Purchase received:', purchase.transactionId);
  await validateOnServer(purchase);
  await finishTransaction({purchase, isConsumable: false});
  // ⚠️ Listener may be called again after finishTransaction
});

await requestPurchase({
  sku: 'your.product.id',
  andDangerouslyFinishTransactionAutomatically: false,
});
```

**Workaround:** Track processed transactions to avoid duplicate processing:

```tsx
const processedTransactions = new Set();

const purchaseListener = purchaseUpdatedListener(async (purchase) => {
  const transactionId = purchase.transactionId;

  // Skip if already processed
  if (processedTransactions.has(transactionId)) {
    console.log('Transaction already processed:', transactionId);
    return;
  }

  // Mark as processed
  processedTransactions.add(transactionId);

  try {
    console.log('Processing purchase:', transactionId);
    await validateOnServer(purchase);
    await finishTransaction({purchase, isConsumable: false});
  } catch (error) {
    // Remove from processed set if validation fails
    processedTransactions.delete(transactionId);
    console.error('Purchase processing failed:', error);
  }
});
```

**Root Cause:** This appears to be an Apple StoreKit behavior where finishing a transaction triggers another purchase notification. This is a known iOS platform limitation, not specific to expo-iap.

**Related Issues:**

- [GitHub Issue #56](https://github.com/hyochan/expo-iap/issues/56)
- [react-native-iap Issue #2713](https://github.com/hyochan/react-native-iap/issues/2713)

## Still Need Help?

If your question isn't answered here:

1. Check the [GitHub issues](https://github.com/hyochan/expo-iap/issues)
2. Review the [troubleshooting guide](./troubleshooting)
3. Create a [minimal reproduction example](https://github.com/hyochan/expo-iap/issues/new)
4. Join the community discussions
