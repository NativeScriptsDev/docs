# Native Scripts Docs

Documentation site for the [Native Scripts](https://github.com/NativeScriptsDev) FiveM/RedM script ecosystem.

🌐 **Live site:** https://nativescriptsdev.github.io/docs/

Built with [VitePress](https://vitepress.dev/). Deployed automatically to GitHub Pages on every push to `main`.

## Local development

```bash
npm install
npm run docs:dev      # http://localhost:5173/docs/
```

Build:

```bash
npm run docs:build
npm run docs:preview
```

## How docs get updated

Each script's `README.md` is the source of truth for its docs page. From the parent `RedM-Scripts/` workspace:

```bash
# inside a Claude Code session
/sync-docs <script-name>
```

This copies `scripts/<script-name>/README.md` → `scripts/docs/scripts/<script-name>.md`, commits, and pushes. GitHub Actions then rebuilds and redeploys.

For new scripts, also update `.vitepress/config.ts` to add the entry to `nav` and `sidebar`.

## Structure

```
docs/
├── .vitepress/config.ts      # site config (nav, sidebar, theme)
├── .github/workflows/deploy.yml
├── index.md                  # landing page
├── guide/
│   ├── getting-started.md
│   ├── bridge.md
│   └── conventions.md
└── scripts/
    ├── ns-lib.md          # synced from NativeScriptsDev/ns-lib/README.md
    └── ns-vineyard.md      # synced from NativeScriptsDev/ns-vineyard/README.md
```

## Why this repo is public

GitHub Pages requires the source repo to be public on the free plan. Documentation is also intended to be publicly accessible — readers shouldn't need org membership. All other NativeScriptsDev repos remain private.

## License

MIT
