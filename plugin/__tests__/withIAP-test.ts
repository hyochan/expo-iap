import {modifyProjectBuildGradle} from '../src/withIAP';

import {
  projectBuildGradleWithIAP,
  projectBuildGradleWithoutIAP,
} from './fixtures/buildGradleFiles';

jest.mock('expo/config-plugins', () => {
  const plugins = jest.requireActual('expo/config-plugins');

  return {
    ...plugins,
    WarningAggregator: {addWarningAndroid: jest.fn()},
  };
});

describe('Configures Android native project correctly', () => {
  it(`Add supportLibVersion to android/build.gradle if it is not present`, () => {
    expect(modifyProjectBuildGradle(projectBuildGradleWithoutIAP)).toMatch(
      projectBuildGradleWithIAP,
    );
  });

  it(`Doesn't modify android/build.gradle if supportLibVersion already configured`, () => {
    expect(modifyProjectBuildGradle(projectBuildGradleWithIAP)).toMatch(
      projectBuildGradleWithIAP,
    );
  });
});
