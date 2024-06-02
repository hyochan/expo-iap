import { requireNativeViewManager } from 'expo-modules-core';
import * as React from 'react';

import { ExpoIapViewProps } from './ExpoIap.types';

const NativeView: React.ComponentType<ExpoIapViewProps> =
  requireNativeViewManager('ExpoIap');

export default function ExpoIapView(props: ExpoIapViewProps) {
  return <NativeView {...props} />;
}
