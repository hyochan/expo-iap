# GitHub Copilot Instructions for expo-iap

## Package Manager
**IMPORTANT: This project uses Bun exclusively. Do not suggest npm, yarn, or pnpm commands.**

- Install dependencies: `bun install`
- Run scripts: `bun run <script>`
- Run tests: `bun test`
- Add packages: `bun add <package>`
- Add dev dependencies: `bun add -d <package>`

**NEVER suggest creating package-lock.json or yarn.lock files. Only bun.lock should exist.**

## Platform-Specific Function Naming

When suggesting code for expo-iap, follow these naming conventions:

### Platform-Specific Functions
Functions that only work on one platform MUST have platform suffixes:
- iOS: `functionNameIos()`
- Android: `functionNameAndroid()`

```typescript
// Correct examples:
export const getStorefrontIos = async (): Promise<string> => { ... }
export const consumeProductAndroid = async (token: string): Promise<void> => { ... }
export const getAppTransactionIos = async (): Promise<AppTransactionIOS | null> => { ... }
```

### Cross-Platform Functions
Functions that abstract platform differences don't need suffixes:

```typescript
// Correct cross-platform example:
export const getProducts = async (skus: string[]): Promise<Product[]> => {
  return Platform.select({
    ios: async () => { /* iOS implementation */ },
    android: async () => { /* Android implementation */ },
  })();
}
```

## Type Naming
- Platform-specific types: `ProductIos`, `ProductAndroid`, `PurchaseErrorIos`
- Cross-platform types: `Product`, `Purchase`, `PurchaseError`

## Code Suggestions

When generating code:
1. Check if the function is platform-specific
2. Add appropriate suffix if it only works on one platform
3. Use Platform.select() for cross-platform implementations
4. Always use TypeScript
5. Include proper error handling
6. Add JSDoc comments for public APIs

## Testing
Suggest tests that:
- Cover both iOS and Android paths
- Use `bun test` commands
- Include platform mocking when needed
- Test error scenarios

## Common Patterns

### Platform Selection
```typescript
Platform.select({
  ios: () => { /* iOS code */ },
  android: () => { /* Android code */ },
  default: () => { /* Fallback */ },
})
```

### Receipt Validation (Platform-specific parameters)
```typescript
// iOS only needs SKU
await validateReceiptIos(sku);

// Android needs additional parameters
await validateReceiptAndroid({
  packageName,
  productToken,
  accessToken,
});
```