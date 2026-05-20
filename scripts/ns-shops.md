# ns-shops

Cross-framework RedM shop UI via [ns-lib](https://github.com/NativeScriptsDev/ns-lib).
Players walk up to a vendor NPC, press `G`, browse stock with live opening
hours, and check out with cash and/or gold. Server is the single source of
truth — every wallet and inventory mutation happens server-side, the NUI
never touches the player's money directly.

UI is a modern glassmorphism panel with per-shop accent, real-time
in-game clock, and dual-currency wallet pills.

## Features

- VORP / RSG-Core auto-detected through ns-lib
- 9 default shops out of the box: 3 general stores, 3 gunsmiths, 3 saloons
- Per-shop stock with timed restock (in-memory, no DB)
- In-game opening hours (per-shop override supported)
- Distance-gated ped spawn (100m / 130m hysteresis) + permanent map blip
- Interaction via native `G` prompt **or** `rsg-target` eye (auto-detected)
- React + Vite + Tailwind NUI, fully self-hosted (no CDN dependencies)
- Transactional purchase commit — partial currency or inventory failures
  refund automatically; concurrent buys can't double-charge or grant items
  without payment

## Requirements

- **ns-lib** (mandatory — provides framework adapters, money + inventory API)
- One of the supported frameworks: VORP, RSG-Core

## Installation

1. Clone into your `[ns-development]` folder:
   ```
   git clone https://github.com/NativeScriptsDev/ns-shops.git resources/[ns-development]/ns-shops
   ```
2. Add to `server.cfg` after `ns-lib`:
   ```
   ensure ns-lib
   ensure ns-shops
   ```
3. Edit `config.lua` — tune `Shops`, `Items`, `Hours`, currency.
4. (Optional) Build the UI yourself if you forked it:
   ```
   cd ui
   npm install
   npm run build   # writes to ../html
   ```
   The prebuilt bundle ships under `html/` so a fresh clone runs as-is.

## Configuration

All knobs live in `config.lua`. Common edits:

- **Add a shop** — copy a `Config.Shops` entry, change `id`, `coords`,
  `ped`, `categories`, `stock_override`.
- **Adjust prices / items** — edit the `Config.Items` master table; each
  item has `price = { cash = ..., gold = ... }` (one or both).
- **Change opening hours** — `Config.Hours` (or per-shop `hours = {...}`).
- **Toggle target system** — `Config.Target.enabled = true|false`. When
  true, ns-shops uses `rsg-target` (or `ox_target` compat shim) instead
  of the `G` prompt; falls back to `G` if the target resource isn't
  running, so VORP servers can leave the flag on.
- **Hide gold pricing** — `Config.Currency.show_gold = false` for
  framework presets that don't carry a gold wallet.
- **RSG item keys** — for items where the canonical key differs from
  VORP (e.g. `consumable_coffee` → `coffee`), `server/itemmeta.lua`
  resolves the framework-correct key at runtime.

## Folder structure

```
ns-shops/
├── fxmanifest.lua
├── config.lua            # shops + items + hours + UI + target
├── client/
│   ├── main.lua          # NUI bridge + open/close
│   ├── interact.lua      # ped + blip + G prompt
│   ├── target.lua        # rsg-target adapter
│   └── nui.lua           # NUI callbacks
├── server/
│   ├── main.lua          # purchase validation + transactional commit
│   ├── stock.lua         # per-shop stock state + restock timer
│   ├── hours.lua         # in-game clock open/close gate
│   └── itemmeta.lua      # framework key resolver (vorp_key / rsg_key)
├── shared/
│   └── catalog.lua       # lookup helpers (no side effects)
├── ui/                   # vite + react + tailwind source
└── html/                 # vite build output (served by CFX)
```

## Security model

The NUI is treated as untrusted client input. The server re-validates
every purchase line (item key, category, quantity, price, opening hours,
stock, wallet balance, carry capacity) and reads prices from `Config.Items`
rather than the cart payload.

Purchase commit runs in three rollback-safe phases:

1. **Reserve stock** — `Decrement` is the atomic check; failures restore
   any already-reserved lines.
2. **Deduct money** — cash then gold; if gold fails, cash is refunded
   and stock is restored.
3. **Grant items** — `AddItem` failures refund just that line's price
   and restore its stock; the rest of the cart still completes.

A per-source mutex blocks concurrent purchase events from the same
player, closing the click-spam race window.
