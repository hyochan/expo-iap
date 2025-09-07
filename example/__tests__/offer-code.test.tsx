import React from 'react';
import {render, fireEvent, waitFor} from '@testing-library/react-native';
import {Platform, Alert} from 'react-native';
import OfferCode from '../app/offer-code';

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Mock the functions
const mockPresentCodeRedemptionSheetIOS = jest.fn();
const mockOpenRedeemOfferCodeAndroid = jest.fn();

jest.mock('expo-iap', () => ({
  presentCodeRedemptionSheetIOS: jest.fn(() => Promise.resolve(true)),
  openRedeemOfferCodeAndroid: jest.fn(() => Promise.resolve()),
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
    const {getByText} = render(<OfferCode />);
    expect(getByText('Offer Code Redemption')).toBeDefined();
  });

  it('should show iOS instructions on iOS', () => {
    Object.defineProperty(Platform, 'OS', {
      get: jest.fn(() => 'ios'),
      configurable: true,
    });

    const {getByText} = render(<OfferCode />);
    // Check for iOS-specific text from the actual component
    expect(
      getByText(/Tap the button below to open the redemption sheet/),
    ).toBeDefined();
    expect(
      getByText(/iOS supports in-app code redemption via StoreKit/),
    ).toBeDefined();
  });

  it('should show Android instructions on Android', () => {
    Object.defineProperty(Platform, 'OS', {
      get: jest.fn(() => 'android'),
      configurable: true,
    });

    const {getByText} = render(<OfferCode />);
    // Check for Android-specific text from the actual component
    expect(getByText(/Tap the button to open Google Play Store/)).toBeDefined();
    expect(
      getByText(/Android requires redemption through Google Play Store/),
    ).toBeDefined();
  });

  it('should handle redeem button press on iOS', async () => {
    Object.defineProperty(Platform, 'OS', {
      get: jest.fn(() => 'ios'),
      configurable: true,
    });

    const presentCodeRedemptionSheetIOS =
      require('expo-iap').presentCodeRedemptionSheetIOS;

    const {getByText} = render(<OfferCode />);
    // The button text is "🎁 Redeem Offer Code" on iOS
    const redeemButton = getByText('🎁 Redeem Offer Code');

    fireEvent.press(redeemButton);

    // Wait for async operation and Alert
    await waitFor(() => {
      expect(presentCodeRedemptionSheetIOS).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'Code redemption sheet presented. After successful redemption, the purchase will appear in your purchase history.',
      );
    });
  });
});
