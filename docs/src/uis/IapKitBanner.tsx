import React from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';

const TRACKING_URL = 'https://www.hyo.dev/api/ad-banner/cmjf0l1830000249hfa3h249z';

interface IapKitBannerProps {
  title?: string;
}

export default function IapKitBanner({title}: IapKitBannerProps) {
  const imageUrl = useBaseUrl('/img/iapkit-banner.gif');

  const handleClick = () => {
    fetch(TRACKING_URL, {method: 'POST'}).catch(() => {
      // Silently ignore tracking errors
    });
  };

  return (
    <div
      style={{
        flex: 1,
        marginTop: 24,
        marginBottom: 24,
      }}
    >
      <a
        href="https://iapkit.com"
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
      >
        <img
          src={imageUrl}
          alt="IAPKit - In-App Purchase Solution"
          style={{
            display: 'block',
            margin: '0 auto',
            objectFit: 'contain',
          }}
        />
      </a>
      {title ? (
        <a
          href="https://iapkit.com"
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          style={{
            display: 'block',
            fontSize: '0.875rem',
            color: '#666',
            textAlign: 'center',
            marginTop: '8px',
            textDecoration: 'none',
          }}
        >
          {title}
        </a>
      ) : null}
    </div>
  );
}
