import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  lang: 'en-US',
  title: 'Native Scripts',
  description: 'Native Scripts — FiveM and RedM script documentation',

  // Repo serves at https://nativescriptsdev.github.io/docs/
  base: '/docs/',
  cleanUrls: true,

  // Lock the site to dark mode and hide the appearance toggle in the nav.
  appearance: 'force-dark',

  // ns-vineyard is hidden until launch — re-enable by removing this entry
  // and restoring its sidebar item below.
  srcExclude: ['scripts/ns-vineyard.md'],

  // Synced READMEs may reference repo-relative files (./config.lua, ./sql/install.sql)
  // that don't exist in the docs site context. Don't fail the build for those.
  ignoreDeadLinks: [
    /^\.\/.+\.lua$/,
    /^\.\/sql\//,
    /^\.\/config\.lua$/,
    /^\.\/html\//,
    /^html\/README/,
  ],

  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/docs/logo.png' }],
    ['meta', { name: 'theme-color', content: '#7c2d12' }],

    // Open Graph — controls the preview card on Discord, Slack, Twitter,
    // Facebook, etc. The og:image MUST be an absolute URL; relative
    // paths are silently ignored by every social crawler. The logo lives
    // at /docs/logo.png on the live site, so we hard-code the full URL.
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'Native Scripts' }],
    ['meta', { property: 'og:title', content: 'Native Scripts' }],
    ['meta', { property: 'og:description', content: 'Cross-framework FiveM and RedM script ecosystem — VORP, RSG-Core, RedEM:RP, ESX, QBCore.' }],
    ['meta', { property: 'og:url', content: 'https://nativescriptsdev.github.io/docs/' }],
    ['meta', { property: 'og:image', content: 'https://nativescriptsdev.github.io/docs/logo.png' }],
    ['meta', { property: 'og:image:width', content: '1254' }],
    ['meta', { property: 'og:image:height', content: '1254' }],
    ['meta', { property: 'og:image:alt', content: 'Native Scripts logo' }],

    // Twitter card (also picked up by Discord as a fallback / supplement)
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'Native Scripts' }],
    ['meta', { name: 'twitter:description', content: 'Cross-framework FiveM and RedM script ecosystem.' }],
    ['meta', { name: 'twitter:image', content: 'https://nativescriptsdev.github.io/docs/logo.png' }],
  ],

  markdown: {
    // Custom slugify mirrors GitHub's anchor algorithm exactly. VitePress's
    // default prepends '_' to slugs starting with a digit (legacy HTML4 rule),
    // which breaks links like #7-discord-server-only that READMEs use to point
    // at numbered sections. Our slugify keeps the digit, matching GitHub.
    anchor: {
      slugify: (str: string) =>
        str
          .toLowerCase()
          .trim()
          .replace(/[\s_]+/g, '-')      // spaces & underscores → hyphen
          .replace(/[^\w\-]+/g, '')     // strip everything except word chars and hyphens
          .replace(/--+/g, '-')         // collapse runs of hyphens
          .replace(/^-+|-+$/g, ''),     // trim leading/trailing hyphens
    },
  },

  themeConfig: {
    logo: '/logo.png',
    siteTitle: 'Native Scripts',

    // No top nav — GitBook-style sidebar-first navigation. The sidebar
    // below is registered globally so every page (including '/') shows it.
    nav: [],

    sidebar: [
      {
        text: '⚙️ Core',
        collapsed: false,
        items: [
          { text: '🔗 ns-lib', link: '/scripts/redm/ns-lib' },
        ],
      },
      {
        text: '🤠 RedM Resources',
        collapsed: false,
        items: [
          { text: '🪙 ns-auction-house', link: '/scripts/redm/ns-auction-house' },
          { text: '🎯 ns-bounty-hunter', link: '/scripts/redm/ns-bounty-hunter' },
          { text: '💀 ns-deathcam', link: '/scripts/redm/ns-deathcam' },
          { text: '🪦 ns-killfeed', link: '/scripts/redm/ns-killfeed' },
          { text: '🎁 ns-kits', link: '/scripts/redm/ns-kits' },
          { text: '🎬 ns-loadingscreen', link: '/scripts/redm/ns-loadingscreen' },
          { text: '🔔 ns-notify', link: '/scripts/redm/ns-notify' },
          { text: '🤠 ns-pedrobbery', link: '/scripts/redm/ns-pedrobbery' },
          { text: '🪧 ns-poster', link: '/scripts/redm/ns-poster' },
          { text: '🛒 ns-shops', link: '/scripts/redm/ns-shops' },
          { text: '🌀 ns-teleport', link: '/scripts/redm/ns-teleport' },
          { text: '🍇 ns-vineyard', link: '/scripts/redm/ns-vineyard' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'discord', link: 'https://discord.gg/UyyngemnF8' },
      {
        icon: {
          svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
        },
        link: 'https://nativescripts.com/',
        ariaLabel: 'Store',
      },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Native Scripts',
    },

    search: {
      provider: 'local',
    },

    outline: { label: 'On this page' },
    docFooter: { prev: 'Previous', next: 'Next' },
    lastUpdated: { text: 'Last updated', formatOptions: { dateStyle: 'medium' } },
  },

  lastUpdated: true,
})
