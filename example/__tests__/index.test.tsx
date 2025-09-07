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
  getStorefrontIOS: jest.fn(() => Promise.resolve('US')),
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

    const getStorefrontIOS = require('expo-iap').getStorefrontIOS;

    const {getByText} = render(<Home />);
    expect(getByText('expo-iap Examples')).toBeDefined();

    // Wait for async operations to complete
    await waitFor(() => {
      expect(getStorefrontIOS).toHaveBeenCalled();
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

    // getStorefrontIOS is called but will catch error on Android
    const getStorefrontIOS = require('expo-iap').getStorefrontIOS;
    expect(getStorefrontIOS).toHaveBeenCalled();

    consoleLog.mockRestore();
  });
});
