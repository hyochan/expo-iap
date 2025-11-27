import React from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';

interface GreatFrontendBannerProps {
  link: string;
  title?: string;
}

export default function GreatFrontendBanner({
  link,
  title,
}: GreatFrontendBannerProps) {
  const imageUrl = useBaseUrl('/img/greatfrontend-js.gif');

  return (
    <div
      style={{
        flex: 1,
        marginTop: 24,
        marginBottom: 24,
      }}
    >
      <a href={link} target="_blank" rel="noopener noreferrer">
        <img
          src={imageUrl}
          alt="GreatFrontEnd"
          style={{
            width: '100%',
            maxWidth: '728px',
            height: 'auto',
            display: 'block',
            margin: '0 auto',
          }}
        />
      </a>
      {title ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
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
