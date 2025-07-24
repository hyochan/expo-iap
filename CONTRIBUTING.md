# Contributing to expo-iap

Thank you for your interest in contributing to expo-iap! This guide will help you get started with development.

## 📋 Table of Contents

- [Development Setup](#development-setup)
- [Package Manager](#package-manager)
- [Running the Example App](#running-the-example-app)
- [Development Guidelines](#development-guidelines)
- [Testing](#testing)
- [Code Style](#code-style)
- [Submitting Changes](#submitting-changes)

## 🚀 Development Setup

### Prerequisites

- Node.js 18.x or later
- Bun (latest version)
- iOS development: macOS with Xcode
- Android development: Android Studio
- VSCode (recommended) with React Native extensions

### Installation

1. Clone the repository:
```bash
git clone https://github.com/hyochan/expo-iap.git
cd expo-iap
```

2. Install dependencies using Bun:
```bash
bun install
```

### VSCode Setup (Recommended)

This project includes VSCode configurations for easier development:

1. **Install recommended extensions**: When you open the project in VSCode, you'll be prompted to install recommended extensions. Accept to install them.

2. **Use Debug Configurations**: Press `F5` or go to Run → Start Debugging and select:
   - `Debug iOS (Expo)` - Runs the example app on iOS simulator
   - `Debug Android (Expo)` - Runs the example app on Android emulator
   - `iOS + Metro` - Starts Metro bundler and iOS app together
   - `Android + Metro` - Starts Metro bundler and Android app together

3. **Use Tasks**: Press `Cmd+Shift+P` → `Tasks: Run Task` to access:
   - `Start iOS Simulator` - Opens iOS Simulator
   - `Start Android Emulator` - Starts Android emulator
   - `Install Pods (iOS)` - Installs CocoaPods dependencies
   - `Clean Build (iOS/Android)` - Cleans build folders
   - `Run Tests` - Runs Jest tests

## 📦 Package Manager

**IMPORTANT: This project uses Bun exclusively. Do not use npm, yarn, or pnpm.**

### Bun Commands

- Install dependencies: `bun install`
- Add a package: `bun add <package>`
- Add a dev dependency: `bun add -d <package>`
- Remove a package: `bun remove <package>`
- Run scripts: `bun run <script>`

**Never create or commit `package-lock.json` or `yarn.lock` files. Only `bun.lock` should exist.**

## 🧪 Running the Example App

The example app is a great way to test your changes and see the library in action.

### Setup

1. Navigate to the example directory:
```bash
cd example
```

2. Install example app dependencies:
```bash
bun install
```

3. For iOS development, install pods:
```bash
cd ios
pod install
cd ..
```

### Running the App

#### iOS
```bash
bun run ios
```

Or open the project in Xcode:
```bash
open ios/cpk.xcworkspace
```

**Note**: If you encounter build errors, you may need to:
1. Clean the build: `cd ios && xcodebuild clean`
2. Update pods: `cd ios && pod install`
3. Open in Xcode and build from there for better error messages

#### Android
```bash
bun run android
```

Or open the project in Android Studio:
```bash
open -a "Android Studio" android
```

**Note**: First run may take longer as it downloads Gradle dependencies.

### Development Server

Start the Metro bundler:
```bash
bun start
```

### Available Scripts

The example app includes several useful scripts:

```bash
# Start the development server
bun start

# Run on iOS simulator
bun run ios

# Run on Android emulator  
bun run android

# Run tests
bun test

# Run tests in watch mode
bun run test:watch

# Run tests with coverage
bun run test:coverage

# Build preview APK locally using EAS
bun run eas:preview:android

# Reset project (useful for troubleshooting)
bun run reset-project
```

## 📖 Development Guidelines

### Platform-Specific Naming Conventions

Functions that only work on one platform MUST have platform suffixes:

- iOS-only functions: append `Ios` suffix
- Android-only functions: append `Android` suffix
- Cross-platform functions: no suffix needed

#### Examples:

```typescript
// ✅ Good - Platform-specific functions with suffixes
export const validateReceiptIos = async (sku: string) => { ... }
export const validateReceiptAndroid = async (options: AndroidValidationOptions) => { ... }
export const getStorefrontIos = async (): Promise<string> => { ... }
export const getAppTransactionIos = async (): Promise<AppTransactionIOS | null> => { ... }

// ✅ Good - Cross-platform function without suffix
export const requestProducts = async (params: { skus: string[], type?: 'inapp' | 'subs' }) => {
  return Platform.select({
    ios: async () => { /* iOS implementation */ },
    android: async () => { /* Android implementation */ },
  })();
}

// ❌ Bad - Platform-specific function without suffix
export const getStorefront = async () => { ... } // Only works on iOS, should be getStorefrontIos
```

### Type Naming Conventions

- Platform-specific types: `ProductIos`, `ProductAndroid`, `PurchaseErrorIos`
- Cross-platform types: `Product`, `Purchase`, `PurchaseError`

### AI Development Tools

We provide configuration files for AI-powered development tools:

- `.cursorrules` - Rules for Cursor IDE
- `.copilot-instructions.md` - Instructions for GitHub Copilot

These files ensure AI assistants follow our coding standards and use Bun correctly.

## 🧪 Testing

### Running Tests

Tests are located in the example app to ensure they run in a realistic environment.

```bash
cd example
bun test
```

Run tests with coverage:
```bash
bun run test:coverage
```

### Writing Tests

- Place test files in `example/app/__tests__/`
- Use `.test.tsx` or `.test.ts` file extensions
- Mock expo-iap module when needed
- Test both iOS and Android code paths

Example test structure:
```typescript
import { render, fireEvent } from '@testing-library/react-native';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    const { getByText } = render(<MyComponent />);
    expect(getByText('Expected Text')).toBeTruthy();
  });
});
```

**Known Issues**:
- React Native modules may need to be mocked in tests
- Use Jest's module mocking for native dependencies
- Some tests may fail due to native module dependencies

## 🎨 Code Style

### Linting

Run linting checks:
```bash
bun run lint
```

Fix linting issues:
```bash
bun run lint:eslint
bun run lint:prettier
```

### TypeScript

- Use TypeScript for all new code
- No `any` types in production code
- Provide explicit type definitions for public APIs
- Use discriminated unions for platform-specific types

### Code Formatting

We use Prettier for code formatting. Format your code:
```bash
bun run lint:prettier
```

## 📤 Submitting Changes

### Commit Messages

Follow conventional commit format:
```
type(scope): subject

body

footer
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test additions or modifications
- `chore`: Maintenance tasks

Example:
```
feat(ios): add getStorefrontIos function

Implements iOS-specific storefront retrieval using StoreKit.
Follows platform-specific naming convention.

Closes #123
```

### Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes following the guidelines above
4. Run tests and ensure they pass: `cd example && bun test`
5. Run linting: `bun run lint:ci`
6. Commit your changes with a descriptive message
7. Push to your fork
8. Create a Pull Request with:
   - Clear description of changes
   - Any breaking changes noted
   - Tests for new functionality
   - Documentation updates if needed

### PR Review Process

- All PRs require at least one review
- CI checks must pass
- Address review feedback promptly
- Keep PRs focused and atomic

## 🐛 Reporting Issues

When reporting issues, please include:
- expo-iap version
- React Native/Expo SDK version
- Platform (iOS/Android)
- Device/Simulator information
- Steps to reproduce
- Expected vs actual behavior
- Relevant code snippets or error messages

## 💡 Feature Requests

We welcome feature requests! Please:
- Check existing issues first
- Provide use case and motivation
- Consider implementation approach
- Be open to discussion and feedback

## 📚 Additional Resources

- [Documentation Site](https://expo-iap.hyo.dev)
- [API Reference](https://expo-iap.hyo.dev/docs/api/use-iap)
- [Example App](./example)
- [Platform-Specific Guidelines](./docs/PLATFORM_NAMING.md)

Thank you for contributing to expo-iap! 🎉