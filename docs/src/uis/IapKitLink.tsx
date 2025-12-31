import React from 'react';

import {IAPKIT_URL, TRACKING_URL} from '../constants';

interface IapKitLinkProps {
  children: React.ReactNode;
  path?: string;
}

export default function IapKitLink({children, path = ''}: IapKitLinkProps) {
  const handleClick = () => {
    fetch(TRACKING_URL, {method: 'POST'}).catch(() => {
      // Silently ignore tracking errors
    });
  };

  return (
    <a
      href={`${IAPKIT_URL}${path}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
    >
      {children}
    </a>
  );
}
