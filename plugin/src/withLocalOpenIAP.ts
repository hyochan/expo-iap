import {ConfigPlugin, withDangerousMod} from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Plugin to add local OpenIAP pod dependency for development
 * This is only for local development with openiap-apple library
 */
const withLocalOpenIAP: ConfigPlugin<{localPath?: string} | void> = (
  config,
  props,
) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const {platformProjectRoot} = config.modRequest;
      const podfilePath = path.join(platformProjectRoot, 'Podfile');

      // Default local path or use provided one
      const localOpenIapPath =
        props?.localPath ||
        '/Users/crossplatformkorea/Github/hyodotdev/openiap-apple';

      // Check if local path exists
      if (!fs.existsSync(localOpenIapPath)) {
        console.warn(
          `⚠️  Local openiap-apple path not found: ${localOpenIapPath}`,
        );
        console.warn(
          '   Skipping local pod injection. Using default pod resolution.',
        );
        return config;
      }

      // Read Podfile
      let podfileContent = fs.readFileSync(podfilePath, 'utf8');

      // Check if already has the local pod reference
      if (podfileContent.includes("pod 'openiap',")) {
        console.log('✅ Local OpenIAP pod already configured');
        return config;
      }

      // Find the target block and inject the local pod
      const targetRegex =
        /target\s+['"][\w]+['"]\s+do\s*\n\s*use_expo_modules!/;

      if (targetRegex.test(podfileContent)) {
        podfileContent = podfileContent.replace(targetRegex, (match) => {
          return `${match}
  
  # Local OpenIAP pod for development (added by expo-iap plugin)
  pod 'openiap', :path => '${localOpenIapPath}'`;
        });

        // Write back to Podfile
        fs.writeFileSync(podfilePath, podfileContent);
        console.log(`✅ Added local OpenIAP pod at: ${localOpenIapPath}`);
      } else {
        console.warn('⚠️  Could not find target block in Podfile');
      }

      return config;
    },
  ]);
};

export default withLocalOpenIAP;
