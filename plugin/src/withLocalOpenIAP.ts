import {
  ConfigPlugin,
  withDangerousMod,
  withSettingsGradle,
  withAppBuildGradle,
} from 'expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';
import {
  withIosAlternativeBilling,
  type IOSAlternativeBillingConfig,
} from './withIosAlternativeBilling';

/**
 * Plugin to add local OpenIAP pod dependency for development
 * This is only for local development with openiap-apple library
 */
type LocalPathOption = string | {ios?: string; android?: string};

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

const withLocalOpenIAP: ConfigPlugin<
  {
    localPath?: LocalPathOption;
    iosAlternativeBilling?: IOSAlternativeBillingConfig;
    horizonAppId?: string;
    /** Resolved from modules.horizon by withIAP */
    isHorizonEnabled?: boolean;
  } | void
> = (config, props) => {
  // Import and apply iOS alternative billing configuration if provided
  if (props?.iosAlternativeBilling) {
    config = withIosAlternativeBilling(config, props.iosAlternativeBilling);
  }
  // Helper to resolve Android module path
  const resolveAndroidModulePath = (p?: string): string | null => {
    if (!p) return null;
    // Prefer the module directory if it exists
    const candidates = [
      path.join(p, 'openiap-google'),
      path.join(p, 'openiap'),
      p,
    ];
    for (const c of candidates) {
      if (
        fs.existsSync(path.join(c, 'build.gradle')) ||
        fs.existsSync(path.join(c, 'build.gradle.kts'))
      ) {
        return c;
      }
    }
    return null;
  };

  // iOS: inject local pod path with wrapper podspec
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const {platformProjectRoot, projectRoot} = config.modRequest as any;
      const raw = props?.localPath;
      const iosPath =
        (typeof raw === 'string' ? raw : raw?.ios) ||
        path.resolve(projectRoot, 'openiap-apple');
      const podfilePath = path.join(platformProjectRoot, 'Podfile');

      if (!fs.existsSync(iosPath)) {
        console.warn(`⚠️  Local openiap-apple path not found: ${iosPath}`);
        console.warn('   Skipping local pod injection.');
        return config;
      }

      if (!fs.existsSync(podfilePath)) {
        console.warn(`⚠️  Podfile not found at ${podfilePath}. Skipping.`);
        return config;
      }

      logOnce(`✅ Using local OpenIAP from: ${iosPath}`);

      let podfileContent = fs.readFileSync(podfilePath, 'utf8');

      // Check if local OpenIAP pod is already configured
      if (podfileContent.includes("pod 'openiap',")) {
        logOnce('✅ Local OpenIAP pod already configured');
        return config;
      }

      const targetRegex =
        /target\s+['"][\w]+['"]\s+do\s*\n\s*use_expo_modules!/;
      const relativePath = path
        .relative(platformProjectRoot, iosPath)
        .replace(/\\/g, '/');

      if (targetRegex.test(podfileContent)) {
        podfileContent = podfileContent.replace(targetRegex, (match) => {
          return `${match}

  # Local OpenIAP pod for development (added by expo-iap plugin)
  pod 'openiap', :path => '${relativePath}'`;
        });
        fs.writeFileSync(podfilePath, podfileContent);
        logOnce(`✅ Added local OpenIAP pod at: ${iosPath}`);
      } else {
        console.warn('⚠️  Could not find target block in Podfile');
      }

      return config;
    },
  ]);

  // Android: include local module and add dependency if available
  config = withSettingsGradle(config, (config) => {
    const raw = props?.localPath;
    const projectRoot = (config.modRequest as any).projectRoot as string;
    const androidInput = typeof raw === 'string' ? undefined : raw?.android;
    const androidModulePath =
      resolveAndroidModulePath(androidInput) ||
      resolveAndroidModulePath(path.resolve(projectRoot, 'openiap-google')) ||
      null;

    if (!androidModulePath || !fs.existsSync(androidModulePath)) {
      if (androidInput) {
        console.warn(
          `⚠️  Could not resolve Android OpenIAP module at: ${androidInput}. Skipping local Android linkage.`,
        );
      }
      return config;
    }

    // 1) settings.gradle: include and map projectDir
    const settings = config.modResults;
    const includeLine = "include ':openiap-google'";
    const projectDirLine = `project(':openiap-google').projectDir = new File('${androidModulePath.replace(
      /\\/g,
      '/',
    )}')`;
    let contents = settings.contents ?? '';

    // Ensure pluginManagement has plugin mappings required by the included module
    const injectPluginManagement = () => {
      const header = 'pluginManagement {';
      const needsVannik =
        !/id\s*\(\s*["']com\.vanniktech\.maven\.publish["']/.test(contents);
      const needsKotlinAndroid =
        !/id\s*\(\s*["']org\.jetbrains\.kotlin\.android["']/.test(contents);
      const needsCompose =
        !/id\s*\(\s*["']org\.jetbrains\.kotlin\.plugin\.compose["']/.test(
          contents,
        );
      const needsRepos = !/pluginManagement[\s\S]*?repositories\s*\{/.test(
        contents,
      );

      const pluginLines: string[] = [];
      if (needsVannik)
        pluginLines.push(
          `  id("com.vanniktech.maven.publish") version "0.29.0"`,
        );
      if (needsKotlinAndroid)
        pluginLines.push(
          `  id("org.jetbrains.kotlin.android") version "2.0.21"`,
        );
      if (needsCompose)
        pluginLines.push(
          `  id("org.jetbrains.kotlin.plugin.compose") version "2.0.21"`,
        );

      // If everything already present, skip
      if (pluginLines.length === 0 && !needsRepos) return;

      const pluginsBlock = pluginLines.length
        ? `plugins {\n${pluginLines.join('\n')}\n}`
        : '';
      const reposBlock = `repositories { gradlePluginPortal(); google(); mavenCentral() }`;

      if (contents.includes(header)) {
        contents = contents.replace(/pluginManagement\s*\{/, (m) => {
          let injection =
            m + `\n  // Added by expo-iap (local openiap-google)\n`;
          if (pluginsBlock) injection += `  ${pluginsBlock}\n`;
          if (needsRepos) injection += `  ${reposBlock}\n`;
          return injection;
        });
      } else {
        contents =
          `pluginManagement {\n  // Added by expo-iap (local openiap-google)\n` +
          (pluginsBlock ? `  ${pluginsBlock}\n` : '') +
          `  ${reposBlock}\n}\n\n${contents}`;
      }
    };

    if (
      !/com\.vanniktech\.maven\.publish/.test(contents) ||
      !/org\.jetbrains\.kotlin\.android/.test(contents)
    ) {
      injectPluginManagement();
    }
    if (!contents.includes(includeLine)) contents += `\n${includeLine}\n`;
    if (!contents.includes(projectDirLine)) contents += `${projectDirLine}\n`;
    settings.contents = contents;
    logOnce(`✅ Linked local Android module at: ${androidModulePath}`);
    return config;
  });

  // 2) app/build.gradle: add implementation project(':openiap-google')
  config = withAppBuildGradle(config, (config) => {
    const projectRoot = (config.modRequest as any).projectRoot as string;
    const raw = props?.localPath;
    const androidInput = typeof raw === 'string' ? undefined : raw?.android;
    const androidModulePath =
      resolveAndroidModulePath(androidInput) ||
      resolveAndroidModulePath(path.resolve(projectRoot, 'openiap-google')) ||
      null;

    if (!androidModulePath || !fs.existsSync(androidModulePath)) {
      return config;
    }

    const gradle = config.modResults;
    const dependencyLine = `    implementation project(':openiap-google')`;
    const flavor = props?.isHorizonEnabled ? 'horizon' : 'play';
    const strategyLine = `        missingDimensionStrategy "platform", "${flavor}"`;

    let contents = gradle.contents;

    // Remove Maven deps (both openiap-google and openiap-google-horizon)
    // to avoid duplicate classes with local module
    const mavenPattern =
      /^\s*(?:implementation|api)\s*\(?\s*["']io\.github\.hyochan\.openiap:openiap-google(?:-horizon)?:[^"']+["']\s*\)?\s*$/gm;
    if (mavenPattern.test(contents)) {
      contents = contents.replace(mavenPattern, '\n');
      logOnce(
        '🧹 Removed Maven openiap-google* dependencies (using local module)',
      );
    }

    // Add missingDimensionStrategy (required for flavored module)
    // Remove any existing platform strategies first to avoid duplicates
    const strategyPattern =
      /^\s*missingDimensionStrategy\s*\(?\s*["']platform["']\s*,\s*["'](play|horizon)["']\s*\)?\s*$/gm;
    if (strategyPattern.test(contents)) {
      contents = contents.replace(strategyPattern, '');
      logOnce('🧹 Removed existing missingDimensionStrategy for platform');
    }

    if (!contents.includes(strategyLine)) {
      const lines = contents.split('\n');
      const idx = lines.findIndex((line) => line.match(/defaultConfig\s*\{/));
      if (idx !== -1) {
        lines.splice(idx + 1, 0, strategyLine);
        contents = lines.join('\n');
        logOnce(
          `🛠️ expo-iap: Added missingDimensionStrategy for ${flavor} flavor`,
        );
      }
    }

    // Add project dependency
    if (!contents.includes(dependencyLine)) {
      const anchor = /dependencies\s*\{/m;
      if (anchor.test(contents)) {
        contents = contents.replace(anchor, (m) => `${m}\n${dependencyLine}`);
      } else {
        contents += `\n\ndependencies {\n${dependencyLine}\n}\n`;
      }
      logOnce('🛠️ Added dependency on local :openiap-google project');
    }

    gradle.contents = contents;
    return config;
  });

  // 3) Set horizonEnabled in gradle.properties
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const {platformProjectRoot} = config.modRequest as any;
      const gradlePropertiesPath = path.join(
        platformProjectRoot,
        'gradle.properties',
      );

      if (fs.existsSync(gradlePropertiesPath)) {
        let contents = fs.readFileSync(gradlePropertiesPath, 'utf8');
        const isHorizon = props?.isHorizonEnabled ?? false;

        // Update horizonEnabled property
        contents = contents.replace(/^horizonEnabled=.*$/gm, '');
        if (!contents.endsWith('\n')) contents += '\n';
        contents += `horizonEnabled=${isHorizon}\n`;

        fs.writeFileSync(gradlePropertiesPath, contents);
        logOnce(
          `🛠️ expo-iap: Set horizonEnabled=${isHorizon} in gradle.properties`,
        );
      }

      return config;
    },
  ]);

  return config;
};

export default withLocalOpenIAP;
