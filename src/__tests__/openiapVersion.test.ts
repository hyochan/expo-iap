/**
 * Tests for openiapVersion config plugin option
 *
 * These tests verify that the modifyAppBuildGradle and modifyPodfile functions
 * correctly handle custom OpenIAP versions for Kotlin/Swift compatibility.
 */

// Import shared fixtures from plugin tests
import {
  appBuildGradleWithDependencies,
  appBuildGradleWithExistingOpeniap,
  appBuildGradleKotlinDsl,
} from '../../plugin/__tests__/fixtures/buildGradleFiles';

// Use built JS file to avoid Node.js module resolution issues in Jest
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const {
  modifyAppBuildGradle,
  modifyPodfile,
} = require('../../plugin/build/withIAP');

// iOS Podfile fixtures
const podfileBasic = `
platform :ios, '15.0'

target 'MyApp' do
  use_frameworks!
  pod 'React'
end
`;

const podfileWithExistingOpeniap = `
source 'https://cdn.cocoapods.org/'

platform :ios, '15.0'

target 'MyApp' do
  use_frameworks!
  pod 'React'
  pod 'openiap', '1.2.0'
end
`;

const podfileWithLocalOpeniap = `
source 'https://cdn.cocoapods.org/'

platform :ios, '15.0'

target 'MyApp' do
  use_frameworks!
  pod 'React'
  pod 'openiap', :path => '../openiap-apple'
end
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

describe('modifyPodfile with openiapVersion option', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should add CocoaPods CDN source when not present', () => {
    const result = modifyPodfile(podfileBasic);

    expect(result).toContain("source 'https://cdn.cocoapods.org/'");
  });

  it('should add custom openiap pod version when provided', () => {
    const customVersion = '1.3.0';
    const result = modifyPodfile(podfileBasic, customVersion);

    expect(result).toContain(`pod 'openiap', '${customVersion}'`);
  });

  it('should replace existing openiap pod version with custom version', () => {
    const newVersion = '1.4.0';
    const result = modifyPodfile(podfileWithExistingOpeniap, newVersion);

    // Should contain the new version
    expect(result).toContain(`pod 'openiap', '${newVersion}'`);
    // Should NOT contain the old version
    expect(result).not.toContain("pod 'openiap', '1.2.0'");
  });

  it('should remove local OpenIAP pod path and use version instead', () => {
    const newVersion = '1.3.0';
    const result = modifyPodfile(podfileWithLocalOpeniap, newVersion);

    // Should contain the new version
    expect(result).toContain(`pod 'openiap', '${newVersion}'`);
    // Should NOT contain local path reference
    expect(result).not.toContain(':path =>');
  });

  it('should not add openiap pod when no version is specified', () => {
    const result = modifyPodfile(podfileBasic);

    // Should not contain openiap pod line
    expect(result).not.toContain("pod 'openiap'");
  });

  it('should not duplicate CDN source when already present', () => {
    const result = modifyPodfile(podfileWithExistingOpeniap);

    // Count occurrences of CDN source
    const matches = result.match(/source 'https:\/\/cdn\.cocoapods\.org\/'/g);
    expect(matches?.length).toBe(1);
  });

  it('should not duplicate openiap pod when same version already exists', () => {
    const version = '1.3.0';
    // First add the version
    const firstResult = modifyPodfile(podfileBasic, version);
    // Then try to add it again
    const secondResult = modifyPodfile(firstResult, version);

    // Count occurrences of the pod
    const matches = secondResult.match(/pod 'openiap', '1\.3\.0'/g);
    expect(matches?.length).toBe(1);
  });
});
