# ns-auction-house

Cross-framework player marketplace for RedM via [ns-lib](https://nativescriptsdev.github.io/docs/scripts/redm/ns-lib). Players open the auction house with `/ah` and list items for direct sale or auction, in cash or gold. Auto-detects **VORP** or **RSG-Core**.

> Status: **0.1.0 — feature complete.** Six phases (scaffold, listings, purchase, auctions, mailbox + earnings, NUI) are wired end-to-end. Localization shipped in 6 languages with admin-editable per-language files and UI string overrides.

## Requirements

- **ns-lib** (mandatory)
- **oxmysql** (mandatory)
- **VORP** or **RSG-Core** (auto-detected by ns-lib)

## Installation

1. Drop the folder into `resources/ns-auction-house/`.
2. Ensure your `server.cfg` starts these in order:
   ```
   ensure oxmysql
   ensure ns-lib
   ensure ns-auction-house
   ```
3. Restart the server. On first start, ns-auction-house creates four tables:
   - `ns_ah_listings`
   - `ns_ah_bids`
   - `ns_ah_mailbox`
   - `ns_ah_earnings`
4. In-game, run `/ah` to open the auction house.

### Rebuilding the UI (optional)

A prebuilt UI ships under `html/` — a fresh install runs as-is. Only rebuild if you edit the React source under `ui/`:

```
cd ui
npm install
npm run build   # writes to ../html
```

The build is CDN-free: React, ReactDOM, and all CSS are bundled into `html/assets/`. No `unpkg`, `jsdelivr`, or Google Fonts imports.

## Configuration

All settings live in `config.lua`:

| What you want to do | Where to edit |
|---|---|
| Switch active language | `Config.Locale` (`'en' \| 'tr' \| 'de' \| 'fr' \| 'es' \| 'pt'`) |
| Toggle test fixtures (2-min duration) | `Config.DeveloperMode` |
| Place / rename / restyle auctioneer peds + minimap blips | `Config.Peds.list` — each entry's `blip` table forwards every key to ns-lib (`sprite`, `name`, `scale`, `colour`, `shortRange`, `modifier`, …) |
| Change the G prompt label or key | `Config.Interact.prompt_label` / `prompt_key` |
| Enable ox_target / rsg-target eye interaction | `Config.Target.enabled` |
| Add / rename a category tab | `Config.Categories` |
| Set a custom icon or label for an item | `Config.Items[key]` |
| Block items from being sold | `Config.Blacklist` |
| Set per-item price floor / ceiling | `Config.PriceLimits[key]` |
| Change the listing duration packages | `Config.DurationPackages` |
| Change the auction duration choices | `Config.AuctionDurations` |
| Adjust minimum bid increment (cash / gold) | `Config.MinBidIncrement` |
| Disable or tune the house cut | `Config.HouseCut` |
| Cap active listings per player | `Config.MaxActiveListings` |
| Enable anonymous seller mode | `Config.AnonymousMode = true` |
| Change how often expired listings sweep | `Config.SweepIntervalSeconds` |
| Disable or rename the open command | `Config.Command.enabled` / `Config.Command.name` |
| Allow sellers to cancel auctions that already have bids | `Config.AllowCancelAuctionWithBids` |
| Trim resolved listing history after N days | `Config.HistoryRetentionDays` |
| Translate in-game notify text | `locales/<code>.lua` |
| Override UI wording (no rebuild) | `Config.UIStrings.<code>` inside `locales/<code>.lua` |

## Localization

The script ships with full translations for **en, tr, de, fr, es, pt**. Two layers live side by side:

1. **In-game notify text** — `locales/<code>.lua` → `Config.Messages.<code>`
   Lua-side toasts / chat messages. Edit any value freely; do NOT rename keys (server code references them by name).
2. **NUI (in-game UI) text** — `locales/<code>.lua` → `Config.UIStrings.<code>`
   Sparse override map for the React UI. Keys you set here win over the bundled translation, so you can re-word the UI **without rebuilding React**. Full key list lives in `ui/src/lib/strings.ts` (`const EN = { ... }` block).

### Switching language

```lua
-- config.lua
Config.Locale = 'tr'
```

`restart ns-auction-house` and both notify text and UI flip in lockstep.

### Adding a new language

1. Clone `locales/en.lua` to `locales/<code>.lua` (e.g. `locales/it.lua`).
2. Translate every value in `Config.Messages.<code>`. Missing keys fall back to English so a partial translation never crashes.
3. Add `'locales/<code>.lua'` to `fxmanifest.lua`'s `shared_scripts` block.
4. Set `Config.Locale = '<code>'` and restart.

### Overriding a UI string

Inside any `locales/<code>.lua`, uncomment / add an entry under `Config.UIStrings.<code>`:

```lua
Config.UIStrings.tr = {
    ['header.brand']  = 'Mezat Salonu',
    ['currency.cash'] = 'Dolar',
}
```

`restart ns-auction-house` → the next time the UI opens, the new wording renders. No React rebuild needed.

## Developer mode

`Config.DeveloperMode = true` appends a `2 Minutes (TEST)` row to `Config.DurationPackages` and `Config.AuctionDurations` so you can verify the **sweep → expired → mailbox** flow without waiting hours for a real listing to expire.

**Never ship to production with `DeveloperMode = true`** — players will see the test entry in their Sell tab.

## Roadmap

| Phase | Scope |
|---|---|
| **A** *(done)* | Scaffold: fxmanifest, config, catalog helpers, DB schema, lifecycle, sweep skeleton |
| **B** *(done)* | Listings: create + cancel + fee + per-source lock + metadata snapshot |
| **C** *(done)* | Purchase: direct-sale 3-pass + atomic qty claim + house cut + earnings credit + sales receipt |
| **D** *(done)* | Auctions: PlaceBid escrow + atomic top-bidder claim + outbid refund + sweep expiry resolver + cancel-with-bid path |
| **E** *(done)* | Mailbox + earnings: FetchForOwner + Claim + ClaimAll + earnings ClaimAll (atomic zero-out UPSERT) |
| **F** *(done)* | NUI: React + Vite from the design handoff, full Lua bridge, 4 tabs wired (Market / Sell / My Listings / Mailbox) |
| **G** *(done)* | i18n: 6-language bundle, per-language Lua files, server-pushed UI overrides, DeveloperMode gate |
