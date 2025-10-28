import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  // Manual sidebar configuration for expo-iap documentation
  tutorialSidebar: [
    {
      type: 'doc',
      id: 'intro',
      label: 'Introduction',
    },
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/installation',
        'getting-started/setup-ios',
        {
          type: 'category',
          label: 'Android Setup',
          link: {type: 'doc', id: 'getting-started/setup-android'},
          items: ['getting-started/setup-horizon'],
        },
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/purchases',
        'guides/lifecycle',
        'guides/subscription-offers',
        'guides/subscription-validation',
        'guides/offer-code-redemption',
        'guides/alternative-billing',
        'guides/error-handling',
        'guides/expo-plugin',
        'guides/troubleshooting',
        'guides/faq',
        'guides/support',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      link: {
        type: 'doc',
        id: 'api/index',
      },
      items: [
        'api/types',
        {
          type: 'category',
          label: 'Core Methods',
          link: {type: 'doc', id: 'api/methods/core-methods'},
          items: [
            {
              type: 'link',
              label: 'Unified APIs',
              href: '/docs/api/methods/core-methods#unified-apis',
            },
            // Nest the separate Listeners doc under Core Methods
            'api/methods/listeners',
            {
              type: 'link',
              label: 'iOS Specific',
              href: '/docs/api/methods/core-methods#ios-specific',
            },
            {
              type: 'link',
              label: 'Android Specific',
              href: '/docs/api/methods/core-methods#android-specific',
            },
          ],
        },
        'api/use-iap',
        {
          type: 'category',
          label: 'Error Handling',
          link: {type: 'doc', id: 'api/error-handling'},
          items: ['api/error-codes'],
        },
      ],
    },
    {
      type: 'category',
      label: 'Examples',
      items: [
        'examples/purchase-flow',
        'examples/subscription-flow',
        'examples/available-purchases',
        'examples/offer-code',
        'examples/alternative-billing',
      ],
    },
    {
      type: 'doc',
      id: 'sponsors',
      label: 'Sponsors',
    },
  ],
};

export default sidebars;
