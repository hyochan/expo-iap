# Contributing to expo-iap

Thank you for your interest in contributing to expo-iap! This guide will help you get started with development.

## 📋 Table of Contents

- [Development Setup](#-development-setup)
- [Package Manager](#-package-manager)
- [Running the Example App](#-running-the-example-app)
- [Development Guidelines](#-development-guidelines)
- [Testing](#-testing)
- [Code Style](#-code-style)
- [Submitting Changes](#-submitting-changes)
- [Reporting Issues](#-reporting-issues)
- [Feature Requests](#-feature-requests)
- [Additional Resources](#-additional-resources)

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

1. Install dependencies using Bun:

```bash
bun install
```

### VSCode Setup (Recommended)

This project includes VSCode configurations for easier development:

1. **Install recommended extensions**: When you open the project in VSCode, you'll be prompted to install recommended extensions. Accept to install them.

1. **Use Debug Configurations**: Press `F5` or go to Run → Start Debugging and select:

   - `Debug iOS (Expo)` - Runs the example app on iOS simulator
   - `Debug Android (Expo)` - Runs the example app on Android emulator
   - `iOS + Metro` - Starts Metro bundler and iOS app together
   - `Android + Metro` - Starts Metro bundler and Android app together

1. **Use Tasks**: Press `Cmd+Shift+P` → `Tasks: Run Task` to access:

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

The example app demonstrates all library features and is essential for testing your changes during development.

### Initial Setup

1. Navigate to the example directory:

```bash
cd example
```

1. Install example app dependencies:

```bash
bun install
```

1. **iOS Setup** (macOS only):

```bash
# Install CocoaPods dependencies
cd ios
pod install
cd ..
```

1. **Android Setup**:

```bash
# Ensure Android SDK is configured
# Set ANDROID_HOME environment variable if not already set
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### Running on iOS

#### Using Expo CLI (Recommended)

```bash
bun run ios
# Or specify a device
bun run ios --device "iPhone 15 Pro"
```

#### Using Xcode

```bash
# Open the workspace in Xcode
open ios/expoiapexample.xcworkspace
```

Then select a simulator or device and press Run (⌘R).

#### Troubleshooting iOS

- **Build errors**: Clean build folder in Xcode (Shift+⌘K)
- **Pod issues**: `cd ios && pod deintegrate && pod install`
- **Metro issues**: `bun start --reset-cache`

### Running on Android

#### Using Expo CLI (Recommended)

```bash
bun run android
# Or specify a device
bun run android --device "Pixel_7_API_34"
```

#### Using Android Studio

```bash
# Open the project in Android Studio
open -a "Android Studio" android
```

Then select an emulator or device and press Run.

#### Troubleshooting Android

- **Gradle issues**: `cd android && ./gradlew clean`
- **Emulator not starting**: Start it manually from Android Studio
- **Connection issues**: `adb reverse tcp:8081 tcp:8081`

### Development Server

The Metro bundler is automatically started when running the app. To start it manually:

```bash
bun start
# Or with cache reset
bun start --reset-cache
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

### Code Conventions and Standards

For detailed code conventions, naming standards, and implementation guidelines, please refer to [CLAUDE.md](./CLAUDE.md). This includes:

- Platform-specific naming conventions
- API method naming patterns
- Pre-commit checks
- OpenIAP specification compliance

### Updating OpenIAP Types

The generated TypeScript definitions in `src/types.ts` come from the [`openiap-gql`](https://github.com/hyodotdev/openiap-gql) release artifacts. Never edit this file by hand. When the schema changes or you need to pull newer types:

- Run `bun run generate:types` to download the latest pinned release and overwrite `src/types.ts`.
- To target a specific release, pass the tag: `bun run generate:types --tag <version>`.
- Commit the updated file alongside any related schema or documentation changes.

Always ensure the repository builds and tests succeed after regenerating the types.

### Development Workflow

1. **Before starting work**:

   - Pull latest changes from main branch
   - Create a feature branch: `git checkout -b feature/your-feature`
   - Review [CLAUDE.md](./CLAUDE.md) for coding standards

1. **During development**:

   - Make changes to the library source code in `src/`
   - Test changes in the example app
   - Write/update tests as needed
   - Keep commits atomic and well-described

1. **Before committing**:

   - Follow the pre-commit checks outlined in [CLAUDE.md](./CLAUDE.md)
   - Ensure all checks pass

1. **Testing your changes**:

   - The example app automatically uses the local library code
   - Changes to `src/` will be reflected after reloading the app
   - Test on both iOS and Android platforms when possible

### Code Conventions

For all code conventions including:

- Platform-specific naming conventions
- Type naming conventions
- API method naming patterns
- OpenIAP specification compliance

Please refer to [CLAUDE.md](./CLAUDE.md).

### AI Development Tools

We provide configuration files for AI-powered development tools:

- `CLAUDE.md` - Comprehensive guidelines for Claude and other AI assistants
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
import {render, fireEvent} from '@testing-library/react-native';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    const {getByText} = render(<MyComponent />);
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

```text
type(scope): subject

body

footer
```

Types:

- `feat`: new feature
- `fix`: bug fix
- `docs`: documentation changes
- `style`: code style changes (formatting, etc.)
- `refactor`: code refactoring
- `test`: test additions or modifications
- `chore`: maintenance tasks

Example:

```text
feat(ios): add getStorefrontIos function

Implements iOS-specific storefront retrieval using StoreKit.
Follows platform-specific naming convention.

Closes #123
```

### Pull Request Process

1. Fork the repository
1. Create a feature branch: `git checkout -b feature/your-feature`
1. Make your changes following the guidelines above
1. Run tests and ensure they pass: `cd example && bun test`
1. Run linting: `bun run lint:ci`
1. Commit your changes with a descriptive message
1. Push to your fork
1. Create a Pull Request with:

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

- [Documentation Site](https://hyochan.github.io/expo-iap)
- [API Reference](https://hyochan.github.io/expo-iap/docs/api/use-iap)
- [Example App](./example)

Thank you for contributing to expo-iap! 🎉
