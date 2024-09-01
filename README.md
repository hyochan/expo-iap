<img src="https://github.com/user-attachments/assets/f51a4b1b-b257-47bf-afe7-5ef8692f0594" height="200"/>

In App Purchase module in Expo

# API documentation

- [Documentation for the main branch](https://github.com/expo/expo/blob/main/docs/pages/versions/unversioned/sdk/iap.md)
- [Documentation for the latest stable release](https://docs.expo.dev/versions/latest/sdk/iap/)

# Installation in managed Expo projects

For [managed](https://docs.expo.dev/archive/managed-vs-bare/) Expo projects, please follow the installation instructions in the [API documentation for the latest stable release](#api-documentation). If you follow the link and there is no documentation available then this library is not yet usable within managed projects &mdash; it is likely to be included in an upcoming Expo SDK release.

# Installation in bare React Native projects

For bare React Native projects, you must ensure that you have [installed and configured the `expo` package](https://docs.expo.dev/bare/installing-expo-modules/) before continuing.

### Add the package to your npm dependencies

```
npm install expo-iap
```

### Configure for iOS

Run `npx pod-install` after installing the npm package. Sine we only support `StoreKit`, `deploymentTarget` should be `15.0`.

```json
"ios": {
  "deploymentTarget": "15.0"
},
```

## Sponsors

### <p style="color: gold;">Gold Tier</p>

| [NAMI](https://namiml.com) |
| :-: |
| <a href="https://namiml.com"><img src="https://github.com/dooboolab-community/react-native-iap/assets/27461460/89d71f61-bb73-400a-83bd-fe0f96eb726e" width="450"/></a> |
| Since 2023 Dec |
