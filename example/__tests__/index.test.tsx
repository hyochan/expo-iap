import React from 'react';
import {render, waitFor} from '@testing-library/react-native';
import {Platform} from 'react-native';
import Home from '../app/index';

// Mock expo-router
jest.mock('expo-router', () => ({
  Link: ({children}: any) => children,
}));

// Mock expo-iap
jest.mock('expo-iap', () => ({
  getStorefront: jest.fn(() => Promise.resolve('US')),
}));

describe('Home Component', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      get: jest.fn(() => originalPlatform),
      configurable: true,
    });
  });

  it('should render without crashing', () => {
    const {getByText} = render(<Home />);
    expect(getByText('expo-iap Examples')).toBeDefined();
  });

  it('should render on iOS platform', async () => {
    // Mock Platform.OS to be iOS
    Object.defineProperty(Platform, 'OS', {
      get: jest.fn(() => 'ios'),
      configurable: true,
    });

    const getStorefrontMock = require('expo-iap').getStorefront;

    const {getByText} = render(<Home />);
    expect(getByText('expo-iap Examples')).toBeDefined();

    // Wait for async operations to complete
    await waitFor(() => {
      expect(getStorefrontMock).toHaveBeenCalled();
    });
  });

  it('should render on Android platform', () => {
    // Mock Platform.OS to be Android
    Object.defineProperty(Platform, 'OS', {
      get: jest.fn(() => 'android'),
      configurable: true,
    });

    const consoleLog = jest.spyOn(console, 'log').mockImplementation();

    const {getByText} = render(<Home />);
    expect(getByText('expo-iap Examples')).toBeDefined();

    // getStorefront is called but resolves to empty string on unsupported platforms
    const getStorefrontMock = require('expo-iap').getStorefront;
    expect(getStorefrontMock).toHaveBeenCalled();

    consoleLog.mockRestore();
  });
});
