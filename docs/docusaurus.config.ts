import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Expo IAP',
  tagline: 'In-App Purchase solution for Expo and React Native',
  favicon: 'img/favicon.png',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://expo-iap.hyo.dev',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For custom domain, use root path
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'hyochan', // Usually your GitHub org/user name.
  projectName: 'expo-iap', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: 'https://github.com/hyochan/expo-iap/tree/main/docs/',
          lastVersion: 'current',
          versions: {
            current: {
              label: '2.9 (Current)',
              path: '',
            },
            '2.9': {
              label: '2.9',
              path: '2.9',
            },
            '2.7': {
              label: '2.7',
              path: '2.7',
            },
            '2.6': {
              label: '2.6',
              path: '2.6',
            },
          },
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: 'https://github.com/hyochan/expo-iap/tree/main/docs/',
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/icon.png',
    navbar: {
      title: 'Expo IAP',
      logo: {
        alt: 'Expo IAP Logo',
        src: 'img/icon.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          type: 'docsVersionDropdown',
          position: 'left',
          dropdownActiveClassDisabled: true,
        },
        {
          to: '/blog',
          label: 'Blog',
          position: 'left',
        },
        {
          href: 'https://github.com/hyochan/expo-iap',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://www.npmjs.com/package/expo-iap',
          label: 'NPM',
          position: 'right',
        },
        {
          href: 'https://x.com/hyodotdev',
          label: 'X',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/intro',
            },
            {
              label: 'API Reference',
              to: '/docs/api',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Stack Overflow',
              href: 'https://stackoverflow.com/questions/tagged/expo-iap',
            },
            {
              label: 'GitHub Issues',
              href: 'https://github.com/hyochan/expo-iap/issues',
            },
            {
              label: 'Slack',
              href: 'https://hyo.dev/joinSlack',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'NPM Package',
              href: 'https://www.npmjs.com/package/expo-iap',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/hyochan/expo-iap',
            },
            {
              label: 'Expo Documentation',
              href: 'https://docs.expo.dev/guides/in-app-purchases',
            },
          ],
        },
        {
          title: 'Social',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/hyochan',
            },
            {
              label: 'LinkedIn',
              href: 'https://linkedin.com/in/hyochanjang',
            },
            {
              label: 'X',
              href: 'https://x.com/hyodotdev',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} hyochan.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
