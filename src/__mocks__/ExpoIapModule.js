/* global jest */
const core = require('./expo-modules-core');
const nativeModule = core.requireNativeModule();

module.exports = {
  __esModule: true,
  default: nativeModule,
  getNativeModule: () => nativeModule,
  NATIVE_ERROR_CODES: nativeModule.ERROR_CODES || {},
};
