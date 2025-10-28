import {requireNativeModule, UnavailabilityError} from 'expo-modules-core';

type NativeIapModuleName = 'ExpoIapOnside' | 'ExpoIap';

/**
 * Safely check if expo-onside package is installed and app was installed from Onside
 * Returns false if package is not installed (optional dependency)
 * @platform iOS
 */
export function checkInstalledFromOnside(): boolean {
  try {
    // Try to dynamically import expo-onside
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const expoOnside = require('expo-onside');
    return expoOnside?.installedFromOnside === true;
  } catch {
    // expo-onside package not installed, return false
    return false;
  }
}

/**
 * Resolve the appropriate native module based on:
 * 1. Whether ExpoIapOnside module is available (expo-onside package installed)
 * 2. Whether OnsideKit is actually installed (IS_ONSIDE_KIT_INSTALLED_IOS)
 * 3. Whether app was installed from Onside store (installedFromOnside)
 */
function resolveNativeModule(): {
  storekit: any;
  onside: any | null;
} {
  const availableModules: any[] = [];
  const moduleNames: NativeIapModuleName[] = ['ExpoIapOnside', 'ExpoIap'];
  const installedFromOnside = checkInstalledFromOnside();

  for (const name of moduleNames) {
    try {
      const module = requireNativeModule(name);
      if (
        name === 'ExpoIapOnside' &&
        (module?.IS_ONSIDE_KIT_INSTALLED_IOS === false || !installedFromOnside)
      ) {
        continue;
      }
      availableModules.push(module);
    } catch (error) {
      // Module not available, skip
      if (name === 'ExpoIap' && error instanceof UnavailabilityError) {
        throw error; // ExpoIap is required
      }
    }
  }

  if (availableModules.length === 0) {
    throw new UnavailabilityError(
      'expo-iap',
      'No IAP native modules are available',
    );
  }

  // First module is either ExpoIapOnside (if available and conditions met) or ExpoIap
  const primaryModule = availableModules[0];
  const onsideModule = availableModules.find(
    (m) => m?.IS_ONSIDE_KIT_INSTALLED_IOS === true,
  );

  return {
    storekit: primaryModule,
    onside: onsideModule || null,
  };
}

// Load modules
const modules = resolveNativeModule();

// It loads the native module object from the JSI or falls back to
// the bridge module (from NativeModulesProxy) if the remote debugger is on.
const ExpoIapModule = modules.storekit;

// Platform-specific error codes from native modules
export const NATIVE_ERROR_CODES = ExpoIapModule.ERROR_CODES || {};

export default ExpoIapModule;
