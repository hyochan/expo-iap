/**
 * Tests for openiapVersion config plugin option
 *
 * These tests verify that the modifyAppBuildGradle function correctly handles
 * custom OpenIAP versions for Kotlin compatibility (e.g., Expo SDK 53).
 */

// Use built JS file to avoid Node.js module resolution issues in Jest
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {modifyAppBuildGradle} = require('../../plugin/build/withIAP');

const appBuildGradleWithDependencies = `
apply plugin: "com.android.application"

android {
    compileSdkVersion 34

    defaultConfig {
        applicationId 'com.test.withIAP'
        minSdkVersion 21
    }
}

dependencies {
    implementation "org.jetbrains.kotlin:kotlin-stdlib"
    implementation "com.facebook.react:react-native"
}
`;

const appBuildGradleWithExistingOpeniap = `
apply plugin: "com.android.application"

android {
    compileSdkVersion 34

    defaultConfig {
        applicationId 'com.test.withIAP'
        minSdkVersion 21
    }
}

dependencies {
    implementation "io.github.hyochan.openiap:openiap-google:1.3.11"
    implementation "org.jetbrains.kotlin:kotlin-stdlib"
}
`;

const appBuildGradleKotlinDsl = `
plugins {
    id("com.android.application")
}

android {
    compileSdk = 34

    defaultConfig {
        applicationId = "com.test.withIAP"
        minSdk = 21
    }
}

dependencies {
    implementation("org.jetbrains.kotlin:kotlin-stdlib")
}
`;

describe('modifyAppBuildGradle with openiapVersion option', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should add default openiap-google dependency when no custom version is provided', () => {
    const result = modifyAppBuildGradle(
      appBuildGradleWithDependencies,
      'groovy',
      false, // isHorizonEnabled
      undefined, // customOpeniapVersion (use default)
    );

    // Should contain openiap-google dependency
    expect(result).toMatch(/io\.github\.hyochan\.openiap:openiap-google:/);
  });

  it('should add custom openiap-google version when provided (Groovy DSL)', () => {
    const customVersion = '1.3.11';
    const result = modifyAppBuildGradle(
      appBuildGradleWithDependencies,
      'groovy',
      false,
      customVersion,
    );

    // Should contain the custom version
    expect(result).toContain(
      `implementation "io.github.hyochan.openiap:openiap-google:${customVersion}"`,
    );
    // Should be in dependencies block
    expect(result).toMatch(
      /dependencies\s*{\s*\n\s*implementation "io\.github\.hyochan\.openiap:openiap-google:1\.3\.11"/,
    );
  });

  it('should add custom openiap-google version when provided (Kotlin DSL)', () => {
    const customVersion = '1.3.11';
    const result = modifyAppBuildGradle(
      appBuildGradleKotlinDsl,
      'kotlin',
      false,
      customVersion,
    );

    // Should contain the custom version with Kotlin DSL syntax
    expect(result).toContain(
      `implementation("io.github.hyochan.openiap:openiap-google:${customVersion}")`,
    );
  });

  it('should replace existing openiap-google version with custom version', () => {
    const newVersion = '1.3.20';
    const result = modifyAppBuildGradle(
      appBuildGradleWithExistingOpeniap,
      'groovy',
      false,
      newVersion,
    );

    // Should contain the new version
    expect(result).toContain(
      `implementation "io.github.hyochan.openiap:openiap-google:${newVersion}"`,
    );
    // Should NOT contain the old version
    expect(result).not.toContain('openiap-google:1.3.11');
  });

  it('should use openiap-google-horizon artifact when horizon is enabled', () => {
    const customVersion = '1.3.11';
    const result = modifyAppBuildGradle(
      appBuildGradleWithDependencies,
      'groovy',
      true, // isHorizonEnabled
      customVersion,
    );

    // Should contain horizon artifact
    expect(result).toContain(
      `implementation "io.github.hyochan.openiap:openiap-google-horizon:${customVersion}"`,
    );
    // Should NOT contain regular openiap-google (without -horizon suffix)
    expect(result).not.toMatch(/openiap-google:1\.3\.11[^-]/);
  });

  it('should work with Expo SDK 53 compatible version (1.3.11)', () => {
    // This test verifies the workaround for Expo SDK 53 Kotlin 2.0.x compatibility
    const expoSdk53CompatibleVersion = '1.3.11';
    const result = modifyAppBuildGradle(
      appBuildGradleWithDependencies,
      'groovy',
      false,
      expoSdk53CompatibleVersion,
    );

    expect(result).toContain(
      `io.github.hyochan.openiap:openiap-google:${expoSdk53CompatibleVersion}`,
    );
  });

  it('should not duplicate dependency when same version already exists', () => {
    // First add the dependency
    const firstResult = modifyAppBuildGradle(
      appBuildGradleWithDependencies,
      'groovy',
      false,
      '1.3.11',
    );

    // Then try to add it again
    const secondResult = modifyAppBuildGradle(
      firstResult,
      'groovy',
      false,
      '1.3.11',
    );

    // Count occurrences of the dependency
    const matches = secondResult.match(
      /io\.github\.hyochan\.openiap:openiap-google:1\.3\.11/g,
    );
    expect(matches?.length).toBe(1);
  });
});
