import React from 'react';
import {render} from '@testing-library/react-native';
import RootLayout from '../app/_layout';

// Mock expo-router
jest.mock('expo-router', () => {
  const React = require('react');
  const Stack = ({children}: any) =>
    React.createElement('View', null, children);
  Stack.Screen = ({name, options}: any) =>
    React.createElement('View', {testID: name});
  return {
    Stack,
  };
});

describe('RootLayout', () => {
  it('should render without crashing', () => {
    // Just call the function to ensure it executes without errors
    const component = RootLayout();
    expect(component).toBeDefined();
  });

  it('should return a valid React element', () => {
    const component = RootLayout();
    expect(React.isValidElement(component)).toBe(true);
  });
});
