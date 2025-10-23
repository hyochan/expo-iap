import {requireNativeModule, UnavailabilityError} from 'expo-modules-core';
import {installedFromOnside} from 'expo-onside';

type NativeIapModuleName = 'ExpoIapOnside' | 'ExpoIap';

const {module: ExpoIapModule, name: resolvedNativeModuleName} =
  resolveNativeModule();

export const USING_ONSIDE_SDK = resolvedNativeModuleName === 'ExpoIapOnside';

// Platform-specific error codes from native modules
export const NATIVE_ERROR_CODES = ExpoIapModule.ERROR_CODES || {};

export default ExpoIapModule;

/**
 * Selects and returns the appropriate native IAP module implementation for the current runtime.
 *
 * Tries to use 'ExpoIapOnside' when that native module is present and the Onside integration is detected; otherwise falls back to 'ExpoIap'. The returned object contains the resolved native module instance and its name.
 *
 * @returns An object with `module` set to the resolved native module instance and `name` set to the resolved native module name (`'ExpoIapOnside'` or `'ExpoIap'`).
 * @throws UnavailabilityError if neither native module is available.
 */
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