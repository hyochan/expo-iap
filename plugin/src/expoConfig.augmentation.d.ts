import type {IOS} from '@expo/config-types';

export type ExpoIapModuleOverrides = {
  expoIap?: boolean;
  onside?: boolean;
};

type BaseExpoIapOptions = {
  enableLocalDev?: boolean;
  localPath?:
    | string
    | {
        ios?: string;
        android?: string;
      };
};

type AutoModuleOptions = BaseExpoIapOptions & {
  module?: 'auto';
  modules?: ExpoIapModuleOverrides;
};

type ExplicitModuleOptions = BaseExpoIapOptions & {
  module: 'expo-iap' | 'onside';
  modules?: never;
};

export type ExpoIapPluginCommonOptions =
  | AutoModuleOptions
  | ExplicitModuleOptions;

declare module '@expo/config-types' {
  interface IOS {
    onside?: {
      enabled?: boolean;
    };
  }
}
