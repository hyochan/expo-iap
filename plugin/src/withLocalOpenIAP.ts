import {
  ConfigPlugin,
  withDangerousMod,
  withSettingsGradle,
  withAppBuildGradle,
} from 'expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Plugin to add local OpenIAP pod dependency for development
 * This is only for local development with openiap-apple library
 */
type LocalPathOption = string | {ios?: string; android?: string};

const withLocalOpenIAP: ConfigPlugin<{localPath?: LocalPathOption} | void> = (
  config,
  props,
) => {
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

  // iOS: inject local pod path
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
      let podfileContent = fs.readFileSync(podfilePath, 'utf8');

      if (podfileContent.includes("pod 'openiap',")) {
        console.log('✅ Local OpenIAP pod already configured');
        return config;
      }

      const targetRegex =
        /target\s+['"][\w]+['"]\s+do\s*\n\s*use_expo_modules!/;

      if (targetRegex.test(podfileContent)) {
        podfileContent = podfileContent.replace(targetRegex, (match) => {
          return `${match}
  
  # Local OpenIAP pod for development (added by expo-iap plugin)
  pod 'openiap', :path => '${iosPath}'`;
        });
        fs.writeFileSync(podfilePath, podfileContent);
        console.log(`✅ Added local OpenIAP pod at: ${iosPath}`);
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
    console.log(`✅ Linked local Android module at: ${androidModulePath}`);
    return config;
  });

  // 2) app/build.gradle: add implementation project(':openiap-google')
  config = withAppBuildGradle(config, (config) => {
    const raw = props?.localPath;
    const projectRoot = (config.modRequest as any).projectRoot as string;
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

    // Remove any previously added Maven deps for openiap-google to avoid duplicate classes
    const removalPatterns = [
      // Groovy DSL: implementation "io.github.hyochan.openiap:openiap-google:x.y.z" or api "..."
      /^\s*(?:implementation|api)\s+["']io\.github\.hyochan\.openiap:openiap-google:[^"']+["']\s*$/gm,
      // Kotlin DSL: implementation("io.github.hyochan.openiap:openiap-google:x.y.z") or api("...")
      /^\s*(?:implementation|api)\s*\(\s*["']io\.github\.hyochan\.openiap:openiap-google:[^"']+["']\s*\)\s*$/gm,
    ];
    let contents = gradle.contents;
    let removedAny = false;
    for (const pattern of removalPatterns) {
      if (pattern.test(contents)) {
        contents = contents.replace(pattern, '\n');
        removedAny = true;
      }
    }
    if (removedAny) {
      gradle.contents = contents;
      console.log(
        '🧹 Removed Maven openiap-google to use local :openiap-google',
      );
    }
    if (!gradle.contents.includes(dependencyLine)) {
      const anchor = /dependencies\s*\{/m;
      if (anchor.test(gradle.contents)) {
        gradle.contents = gradle.contents.replace(
          anchor,
          (m) => `${m}\n${dependencyLine}`,
        );
      } else {
        gradle.contents += `\n\ndependencies {\n${dependencyLine}\n}\n`;
      }
      console.log('🛠️ Added dependency on local :openiap-google project');
    }
    return config;
  });

  // 3) Ensure final cleanup in app/build.gradle after all mods are applied
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      try {
        const {platformProjectRoot} = config.modRequest as any;
        const appBuildGradle = path.join(
          platformProjectRoot,
          'app',
          'build.gradle',
        );
        if (fs.existsSync(appBuildGradle)) {
          let contents = fs.readFileSync(appBuildGradle, 'utf8');
          const patterns = [
            // Groovy DSL
            /^\s*(?:implementation|api)\s+["']io\.github\.hyochan\.openiap:openiap-google:[^"']+["']\s*$/gm,
            // Kotlin DSL
            /^\s*(?:implementation|api)\s*\(\s*["']io\.github\.hyochan\.openiap:openiap-google:[^"']+["']\s*\)\s*$/gm,
          ];
          let changed = false;
          for (const p of patterns) {
            if (p.test(contents)) {
              contents = contents.replace(p, '\n');
              changed = true;
            }
          }
          if (changed) {
            fs.writeFileSync(appBuildGradle, contents);
            console.log(
              '🧹 expo-iap: Cleaned Maven openiap-google for local :openiap-google',
            );
          }
        }
      } catch (e) {
        console.warn('expo-iap: cleanup step failed:', e);
      }
      return config;
    },
  ]);

  // (removed) Avoid global root build.gradle mutations; included module should manage its plugins

  return config;
};

export default withLocalOpenIAP;
