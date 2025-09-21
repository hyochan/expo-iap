import {requireNativeModule} from 'expo-modules-core';

export type InstalledFromOnside = boolean | null | string;

type NativeModuleType = {
  checkInstallationFromOnsideAsync(): Promise<InstalledFromOnside>;
};

export const ExpoOnsideMarketplaceAvailabilityModule: NativeModuleType =
  (() => {
    try {
      return requireNativeModule<NativeModuleType>('ExpoOnsideModule');
    } catch {
      return {
        async checkInstallationFromOnsideAsync() {
          return null;
        },
      };
    }
  })();
