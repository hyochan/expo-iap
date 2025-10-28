export interface ExpoIapPluginCommonOptions {
  enableLocalDev?: boolean;
  localPath?:
    | string
    | {
        ios?: string;
        android?: string;
      };
  /**
   * Module-specific configuration
   */
  modules?: {
    /**
     * Enable Onside (Korean alternative billing) support
     * When enabled, expo-onside will be automatically added to package.json
     * @platform iOS
     */
    onside?: boolean;
  };
}
