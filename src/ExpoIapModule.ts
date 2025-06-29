import {requireNativeModule} from 'expo-modules-core';

// It loads the native module object from the JSI or falls back to
// the bridge module (from NativeModulesProxy) if the remote debugger is on.
const ExpoIapModule = requireNativeModule('ExpoIap');

// Platform-specific error codes from native modules
export const NATIVE_ERROR_CODES = ExpoIapModule.ERROR_CODES || {};

export default ExpoIapModule;
