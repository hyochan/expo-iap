# Expo IAP

<div align="center">
  <img src="https://hyochan.github.io/expo-iap/img/icon.png" alt="Expo IAP Logo" width="150" />
  
  [![Version](http://img.shields.io/npm/v/expo-iap.svg?style=flat-square)](https://npmjs.org/package/expo-iap) [![Download](http://img.shields.io/npm/dm/expo-iap.svg?style=flat-square)](https://npmjs.org/package/expo-iap) [![CI](https://github.com/hyochan/expo-iap/actions/workflows/ci.yml/badge.svg)](https://github.com/hyochan/expo-iap/actions/workflows/ci.yml) [![codecov](https://codecov.io/gh/hyochan/expo-iap/graph/badge.svg?token=47VMTY5NyM)](https://codecov.io/gh/hyochan/expo-iap) [![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fhyochan%2Fexpo-iap.svg?type=shield&issueType=license)](https://app.fossa.com/projects/git%2Bgithub.com%2Fhyochan%2Fexpo-iap?ref=badge_shield&issueType=license)
  
Expo IAP is a powerful in-app purchase solution for Expo and React Native applications that conforms to the Open IAP specification. It provides a unified API for handling in-app purchases across iOS and Android platforms with comprehensive error handling and modern TypeScript support.

If you're shipping an app with expo-iap, we’d love to hear about it—please share your product and feedback in [Who's using Expo IAP?](https://github.com/hyochan/expo-iap/discussions/143). Community stories help us keep improving the ecosystem.

<a href="https://openiap.dev"><img src="https://github.com/hyodotdev/openiap/blob/main/logo.png" alt="Open IAP" height="40" /></a>

</div>

## 🎨 Promotion

<div align="center">
  <a href="https://hyodotdev.github.io/kstyled">
    <img src="https://hyodotdev.github.io/kstyled/img/logo.png" alt="kstyled Logo" width="120" />
  </a>

**Compile-time CSS-in-JS for React Native**

✨ Experience the next generation of styling with **[kstyled](https://hyodotdev.github.io/kstyled)** - a blazing-fast, fully type-safe CSS-in-JS solution with zero runtime overhead.

🚀 **[Explore kstyled →](https://hyodotdev.github.io/kstyled)**

</div>

## 📚 Documentation

**[📖 Visit our comprehensive documentation site →](https://hyochan.github.io/expo-iap)**

## Notice

The `expo-iap` module has been migrated from [react-native-iap](https://github.com/hyochan/react-native-iap). While we initially considered fully merging everything into `react-native-iap`, we ultimately decided to maintain the two libraries in parallel, each tailored to its own ecosystem.

- **`react-native-iap`** → a **Nitro Modules–based** implementation for React Native.
- **`expo-iap`** → an **Expo Module** with tighter integration and smoother compatibility in the Expo ecosystem.

Both libraries will continue to be maintained in parallel going forward.

📖 See the [Future Roadmap and Discussion](https://github.com/hyochan/react-native-iap/discussions/2754) for more details.  
👉 Stay updated via the [Current Project Status comment](https://github.com/hyochan/react-native-iap/discussions/2754#discussioncomment-10510249).

## Installation

```bash
npx expo install expo-iap
```

For platform-specific configuration (Android Kotlin version, iOS deployment target, etc.), see the [Installation Guide](https://hyochan.github.io/expo-iap/getting-started/installation#important-for-expo-managed-workflow).

## Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details on:

- Development setup
- Running the example app
- Testing guidelines
- Code style and conventions
- Submitting pull requests

For detailed usage examples and error handling, see the [documentation](https://hyochan.github.io/expo-iap).

> Sharing your thoughts—any feedback would be greatly appreciated!

## Our Sponsors

💼 **[View Our Sponsors](https://openiap.dev/sponsors)**

We're building the OpenIAP ecosystem—defining the spec at [openiap.dev](https://www.openiap.dev), maintaining [OpenIAP](https://github.com/hyodotdev/openiap) for the shared type system, and shipping platform SDKs like [openiap-apple](https://github.com/hyodotdev/openiap/tree/main/packages/apple) and [openiap-google](https://github.com/hyodotdev/openiap/tree/main/packages/google) that power [expo-iap](https://github.com/hyochan/expo-iap), [flutter_inapp_purchase](https://github.com/hyochan/flutter_inapp_purchase), React Native, and [kmp-iap](https://github.com/hyochan/kmp-iap). The work so far has focused on untangling fragmented APIs; the next milestone is a streamlined purchase flow: `initConnection → fetchProducts → requestPurchase → (server receipt validation) → finishTransaction`.

Your sponsorship helps ensure developers across platforms, OS, and frameworks can implement in-app purchases without headaches. It also fuels new plugins, payment systems, and partner integrations already being explored in the OpenIAP community. Sponsors receive shout-outs in every release and can request tailored support depending on tier. If you’re interested—or have rollout feedback to share—you can view sponsorship options at [openiap.dev/sponsors](https://openiap.dev/sponsors).

### <p style="color: rgb(255, 182, 193);">Angel</p>

<a href="https://meta.com">
    <div style="display: inline-flex; flex-direction: column; align-items: center; gap: 0.25rem; padding: 0.75rem 1rem; border-radius: 12px; background: rgba(212, 165, 116, 0.12);">
      <img alt="Meta" src="https://www.openiap.dev/meta.svg" style="width: 120px;" />
      <span style="font-size: 0.85rem; font-weight: 600; color: rgb(107, 78, 61); text-align: center; width: 100%;">Meta</span>
    </div>
</a>

## Past Supporters

<div style="display: flex; align-items:center; gap: 10px;">
  <a href="https://namiml.com" style="opacity: 50%">
    <img src="https://github.com/hyochan/react-native-iap/assets/27461460/89d71f61-bb73-400a-83bd-fe0f96eb726e" alt="Nami ML" width="140"/>
  </a>
  <a href="https://www.courier.com/?utm_source=react-native-iap&utm_campaign=osssponsors" style="opacity: 50%;">
    <img width="80" alt="courier_dot_com" src="https://github.com/user-attachments/assets/319d8966-6839-498d-8ead-ce8cc72c3bca" />
  </a>
</div>
