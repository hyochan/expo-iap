import AdFitTopFixed from "@site/src/uis/AdFitTopFixed";

# API Reference

<AdFitTopFixed />

Welcome to the Expo IAP API documentation. Here you'll find comprehensive guides and references for all the features and functionality available in Expo IAP.

Note: expo-iap follows the OpenIAP API model for consistency across platforms and SDKs. For the canonical API surface, see OpenIAP APIs:

- https://www.openiap.dev/docs/apis

## Available APIs

### 🎣 [useIAP Hook](./use-iap)

The main React hook for handling in-app purchases in your application.

- Purchase products and subscriptions
- Restore previous purchases
- Handle purchase states and loading
- Complete transactions

### ⚠️ [Error Codes](./error-codes)

Comprehensive list of all error codes that can be returned by Expo IAP.

- Centralized error management
- Platform-specific error mappings
- Troubleshooting guidelines
- Error handling best practices

## Quick Start

```javascript
import {useIAP} from 'expo-iap';

function MyComponent() {
  const {products, purchaseProduct, restorePurchases, isLoading, error} =
    useIAP();

  // Your component logic here
}
```

## TypeScript Support

Expo IAP is built with TypeScript and provides full type safety for all APIs. All types are automatically exported when you install the package.

## Need Help?

- Check our [Getting Started Guide](/docs/intro)
- Visit our [GitHub repository](https://github.com/hyochan/expo-iap)
- Read our [Blog](/blog) for latest updates
