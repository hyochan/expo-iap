import {
  ExpoOnsideMarketplaceAvailabilityModule,
  InstalledFromOnside,
} from './ExpoOnsideMarketplaceAvailabilityModule';
import {useEffect, useState} from 'react';

let installedFromOnside: InstalledFromOnside = null;

/**
 * IMPORTANT:
 * Note: call it BEFORE initializing useIAP, for example during SplashScreen initialization.
 *
 * 1) Call checkInstallationFromOnside BEFORE initializing useIAP.
 *    Reason: this is an asynchronous check and cannot run during module import/initialization.
 *    Always reference useIAP after this check to ensure the correct platform is being used.
 * 2) Make sure the Onside module is enabled in your Expo config plugin:
 *
 *    plugins: [
 *      [
 *        'expo-iap',
 *        {
 *          modules: {
 *            onside: true,
 *            //Keep other modules
 *          },
 *        },
 *      ],
 *    ];
 *
 *    Without this, the Onside integration won’t be linked and the availability check will always be false.
 */

// checkInstallationFromOnside is required to switch the payment module at runtime based on marketplace installation.
async function checkInstallationFromOnside(): Promise<InstalledFromOnside> {
  const onsideInstallation =
    await ExpoOnsideMarketplaceAvailabilityModule.checkInstallationFromOnsideAsync();
  installedFromOnside = onsideInstallation;
  return onsideInstallation;
}

function useOnside() {
  const [isOnsideLoading, setIsOnsideLoading] = useState(true);

  useEffect(() => {
    checkInstallationFromOnside()
      .then((result) => {
        installedFromOnside = result;
      })
      .finally(() => {
        setIsOnsideLoading(false);
      });
  }, []);

  return {isOnsideLoading};
}

export {checkInstallationFromOnside, installedFromOnside, useOnside};
