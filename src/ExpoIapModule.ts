import {requireNativeModule, UnavailabilityError} from 'expo-modules-core';
import {installedFromOnside} from './onside';

type NativeIapModuleName = 'ExpoIapOnside' | 'ExpoIap';

let cached: {module: any; name: NativeIapModuleName} | null = null;

function getResolved(): {module: any; name: NativeIapModuleName} {
  if (!cached) {
    cached = resolveNativeModule();
  }
  return cached;
}

function resolveNativeModule(): {
  module: any;
  name: NativeIapModuleName;
} {
  const candidates: NativeIapModuleName[] = ['ExpoIapOnside', 'ExpoIap'];

  for (const name of candidates) {
    try {
      const module = requireNativeModule(name);
      if (name === 'ExpoIapOnside' && !installedFromOnside) {
        continue;
      }
      return {module, name};
    } catch (error) {
      if (name === 'ExpoIapOnside' && isMissingModuleError(error, name)) {
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

export const NATIVE_ERROR_CODES: Record<string, unknown> = new Proxy(
  {} as Record<string, unknown>,
  {
    get(_, prop) {
      return (getResolved().module.ERROR_CODES || {})[prop as string];
    },
  },
);

/**
 * Returns the raw native module (not wrapped in a Proxy).
 * Use this for EventEmitter / addListener calls — JSI HostObjects
 * require the real native module as `this`; a Proxy triggers
 * "native state unsupported on Proxy" on New Architecture / Hermes.
 */
export function getNativeModule() {
  return getResolved().module;
}

export default new Proxy({} as any, {
  get(_, prop) {
    if (prop === 'USING_ONSIDE_SDK') {
      return getResolved().name === 'ExpoIapOnside';
    }
    return getResolved().module[prop];
  },
});
