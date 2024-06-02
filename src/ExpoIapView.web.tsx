import * as React from 'react';

import { ExpoIapViewProps } from './ExpoIap.types';

export default function ExpoIapView(props: ExpoIapViewProps) {
  return (
    <div>
      <span>{props.name}</span>
    </div>
  );
}
