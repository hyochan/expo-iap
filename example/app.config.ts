import type {ConfigContext, ExpoConfig} from '@expo/config';
import type {ExpoIapPluginCommonOptions} from '../plugin/src/expoConfig.augmentation';

const LOCAL_OPENIAP_PATHS = {
  ios: '/Users/crossplatformkorea/Github/hyodotdev/openiap/packages/apple',
  android: '/Users/crossplatformkorea/Github/hyodotdev/openiap/packages/google',
} as const;

export default ({config}: ConfigContext): ExpoConfig => {
  const iapPluginOptions: ExpoIapPluginCommonOptions = {
    enableLocalDev: false,
    localPath: {
      ios: LOCAL_OPENIAP_PATHS.ios,
      android: LOCAL_OPENIAP_PATHS.android,
    },
    module: 'auto',
    // modules: {
    //   expoIap: true,
    //   onside: false,
    // },
  };

  const pluginEntries: NonNullable<ExpoConfig['plugins']> = [
    ['../app.plugin.js', iapPluginOptions],
    'expo-font',
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
      },
    ],
    [
      'expo-build-properties',
      {
        ios: {
          deploymentTarget: '16.0',
        },
        android: {
          kotlinVersion: '2.0.21',
        },
      },
    ],
  ];

  const expoConfig: ExpoConfig = {
    ...config,
    name: 'expo-iap-example',
    slug: 'expo-iap-example',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'expo-iap-example',
    userInterfaceStyle: 'automatic',
    ios: {
      ...config.ios,
      supportsTablet: true,
      bundleIdentifier: 'dev.hyo.martie',
    },
    android: {
      ...config.android,
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      package: 'dev.hyo.martie',
    },
    plugins: pluginEntries,
    experiments: {
      ...config.experiments,
      typedRoutes: true,
    },
  };

  return expoConfig;
};
