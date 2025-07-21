import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Platform } from 'react-native';
import OfferCode from '../app/offer-code';

// Mock the functions
const mockPresentCodeRedemptionSheetIOS = jest.fn();
const mockOpenRedeemOfferCodeAndroid = jest.fn();

jest.mock('expo-iap', () => ({
  presentCodeRedemptionSheetIOS: mockPresentCodeRedemptionSheetIOS,
  openRedeemOfferCodeAndroid: mockOpenRedeemOfferCodeAndroid,
  useIAP: jest.fn(() => ({
    connected: true,
  })),
}));

describe('OfferCode Component', () => {
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
    const { getByText } = render(<OfferCode />);
    expect(getByText('Offer Code Redemption')).toBeDefined();
  });

  it('should show iOS instructions on iOS', () => {
    Object.defineProperty(Platform, 'OS', {
      get: jest.fn(() => 'ios'),
      configurable: true,
    });
    
    const { getByText } = render(<OfferCode />);
    // Check for iOS-specific text
    expect(getByText(/Enter your offer code/)).toBeDefined();
    expect(getByText(/redemption sheet/)).toBeDefined();
  });

  it('should show Android instructions on Android', () => {
    Object.defineProperty(Platform, 'OS', {
      get: jest.fn(() => 'android'),
      configurable: true,
    });
    
    const { getByText } = render(<OfferCode />);
    // Check for Android-specific text
    expect(getByText(/Google Play Store/)).toBeDefined();
  });

  it('should handle redeem button press on iOS', async () => {
    Object.defineProperty(Platform, 'OS', {
      get: jest.fn(() => 'ios'),
      configurable: true,
    });
    
    mockPresentCodeRedemptionSheetIOS.mockResolvedValue(true);
    
    const { getByText } = render(<OfferCode />);
    const redeemButton = getByText(/Redeem Offer Code/);
    
    fireEvent.press(redeemButton);
    
    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(mockPresentCodeRedemptionSheetIOS).toHaveBeenCalled();
  });
});