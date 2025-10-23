import {requireNativeModule, UnavailabilityError} from 'expo-modules-core';
import {installedFromOnside} from './onside';

type NativeIapModuleName = 'ExpoIapOnside' | 'ExpoIap';

const {module: ExpoIapModule, name: resolvedNativeModuleName} =
  resolveNativeModule();

export const USING_ONSIDE_SDK = resolvedNativeModuleName === 'ExpoIapOnside';

// Platform-specific error codes from native modules
export const NATIVE_ERROR_CODES = ExpoIapModule.ERROR_CODES || {};

export default ExpoIapModule;

function resolveNativeModule(): {
  module: any;
  name: NativeIapModuleName;
} {
  const candidates: NativeIapModuleName[] = ['ExpoIapOnside', 'ExpoIap'];

  for (const name of candidates) {
    try {
      const module = requireNativeModule(name);
      if (
        name === 'ExpoIapOnside' &&
        (module?.IS_ONSIDE_KIT_INSTALLED_IOS === false || !installedFromOnside)
      ) {
        continue;
      }
      return {module, name};
    } catch (error) {
      if (name === 'ExpoIapOnside' && isMissingModuleError(error, name)) {
        // Onside module is optional. If unavailable, fall back to ExpoIap.
        continue;
      }

      throw error;
    }
  }

  throw new UnavailabilityError(
    'expo-iap',
    'ExpoIap native module is unavailable',
  );
}

function isMissingModuleError(error: unknown, moduleName: string): boolean {
  if (error instanceof UnavailabilityError) {
    return true;
  }

  if (error instanceof Error) {
    return error.message.includes(`Cannot find native module '${moduleName}'`);
  }

  return false;
}
