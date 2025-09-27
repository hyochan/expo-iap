import type {ConfigContext, ExpoConfig} from '@expo/config';

const LOCAL_OPENIAP_PATHS = {
  ios: '/Users/hyo/Github/hyodotdev/openiap-apple',
  android: '/Users/hyo/Github/hyodotdev/openiap-google',
} as const;

export default ({config}: ConfigContext): ExpoConfig => {
  const pluginEntries: NonNullable<ExpoConfig['plugins']> = [
    [
      '../app.plugin.js',
      {
        enableLocalDev: false,
        localPath: {
          ios: LOCAL_OPENIAP_PATHS.ios,
          android: LOCAL_OPENIAP_PATHS.android,
        },
      },
    ],
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
        android: {
          kotlinVersion: '2.1.20',
        },
        ios: {
          deploymentTarget: '15.1',
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
