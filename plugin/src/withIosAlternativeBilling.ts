import {
  ConfigPlugin,
  withEntitlementsPlist,
  withInfoPlist,
} from 'expo/config-plugins';

// Log a message only once per Node process
const logOnce = (() => {
  const printed = new Set<string>();
  return (msg: string) => {
    if (!printed.has(msg)) {
      console.log(msg);
      printed.add(msg);
    }
  };
})();

export interface IOSAlternativeBillingConfig {
  /** Country codes where external purchases are supported (ISO 3166-1 alpha-2) */
  countries?: string[];
  /** External purchase URLs per country (iOS 15.4+) */
  links?: Record<string, string>;
  /** Multiple external purchase URLs per country (iOS 17.5+, up to 5 per country) */
  multiLinks?: Record<string, string[]>;
  /** Custom link regions (iOS 18.1+) */
  customLinkRegions?: string[];
  /** Streaming link regions for music apps (iOS 18.2+) */
  streamingLinkRegions?: string[];
  /** Enable external purchase link entitlement */
  enableExternalPurchaseLink?: boolean;
  /** Enable external purchase link streaming entitlement (music apps only) */
  enableExternalPurchaseLinkStreaming?: boolean;
}

/** Add external purchase entitlements and Info.plist configuration */
export const withIosAlternativeBilling: ConfigPlugin<
  IOSAlternativeBillingConfig | undefined
> = (config, options) => {
  if (!options || !options.countries || options.countries.length === 0) {
    return config;
  }

  // Add entitlements
  config = withEntitlementsPlist(config, (config) => {
    // Always add basic external purchase entitlement when countries are specified
    config.modResults['com.apple.developer.storekit.external-purchase'] = true;
    logOnce(
      '✅ Added com.apple.developer.storekit.external-purchase to entitlements',
    );

    // Add external purchase link entitlement if enabled
    if (options.enableExternalPurchaseLink) {
      config.modResults['com.apple.developer.storekit.external-purchase-link'] =
        true;
      logOnce(
        '✅ Added com.apple.developer.storekit.external-purchase-link to entitlements',
      );
    }

    // Add streaming entitlement if enabled
    if (options.enableExternalPurchaseLinkStreaming) {
      config.modResults[
        'com.apple.developer.storekit.external-purchase-link-streaming'
      ] = true;
      logOnce(
        '✅ Added com.apple.developer.storekit.external-purchase-link-streaming to entitlements',
      );
    }

    return config;
  });

  // Add Info.plist configuration
  config = withInfoPlist(config, (config) => {
    const plist = config.modResults;

    // 1. SKExternalPurchase (Required)
    plist.SKExternalPurchase = options.countries;
    logOnce(
      `✅ Added SKExternalPurchase with countries: ${options.countries?.join(
        ', ',
      )}`,
    );

    // 2. SKExternalPurchaseLink (Optional - iOS 15.4+)
    if (options.links && Object.keys(options.links).length > 0) {
      plist.SKExternalPurchaseLink = options.links;
      logOnce(
        `✅ Added SKExternalPurchaseLink for ${
          Object.keys(options.links).length
        } countries`,
      );
    }

    // 3. SKExternalPurchaseMultiLink (iOS 17.5+)
    if (options.multiLinks && Object.keys(options.multiLinks).length > 0) {
      plist.SKExternalPurchaseMultiLink = options.multiLinks;
      logOnce(
        `✅ Added SKExternalPurchaseMultiLink for ${
          Object.keys(options.multiLinks).length
        } countries`,
      );
    }

    // 4. SKExternalPurchaseCustomLinkRegions (iOS 18.1+)
    if (options.customLinkRegions && options.customLinkRegions.length > 0) {
      plist.SKExternalPurchaseCustomLinkRegions = options.customLinkRegions;
      logOnce(
        `✅ Added SKExternalPurchaseCustomLinkRegions: ${options.customLinkRegions.join(
          ', ',
        )}`,
      );
    }

    // 5. SKExternalPurchaseLinkStreamingRegions (iOS 18.2+)
    if (
      options.streamingLinkRegions &&
      options.streamingLinkRegions.length > 0
    ) {
      plist.SKExternalPurchaseLinkStreamingRegions =
        options.streamingLinkRegions;
      logOnce(
        `✅ Added SKExternalPurchaseLinkStreamingRegions: ${options.streamingLinkRegions.join(
          ', ',
        )}`,
      );
    }

    return config;
  });

  return config;
};
