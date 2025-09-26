module.exports = {
  preset: 'jest-expo',
  // Remove testEnvironment override to let jest-expo handle it
  // testEnvironment: 'node',
  // Disable watchman to avoid sandbox/permission issues in CI and sandboxes
  watchman: false,
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx,js,jsx}'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/app/$1',
    '^../../src$': '<rootDir>/../src',
    '^expo-iap$': '<rootDir>/../src/index',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: ['app/**/*.{ts,tsx}', '!app/**/*.d.ts', '!__tests__/**'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
};
