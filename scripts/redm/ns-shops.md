# ns-shops

Cross-framework RedM vendor shops via [ns-lib](https://nativescriptsdev.github.io/docs/scripts/redm/ns-lib). Players walk up to a shopkeeper NPC, press `G`, and buy items with cash or gold. Auto-detects **VORP** or **RSG-Core**.

## Requirements

- **ns-lib** (mandatory)
- **VORP** or **RSG-Core**

## Installation

1. Drop the folder into `resources/ns-shops/`.
2. Add to `server.cfg` after `ns-lib`:
   ```
   ensure ns-lib
   ensure ns-shops
   ```
3. Restart the server. 9 default shops (3 general stores, 3 gunsmiths, 3 saloons) will spawn around the map.

### Rebuilding the UI (optional)

A prebuilt UI ships under `html/` — a fresh install runs as-is. Only rebuild if you edit the React source under `ui/`:

```
cd ui
npm install
npm run build   # writes to ../html
```

## Configuration

All settings live in `config.lua`:

| What you want to do | Where to edit |
|---|---|
| Add / remove / move a shop | `Config.Shops` |
| Change items, prices, or stock | `Config.Items` — each item has `price = { cash = ..., gold = ... }` |
| Set opening hours globally | `Config.Hours` |
| Set opening hours per shop | `hours = { ... }` inside that shop's entry |
| Switch from `G` prompt to `rsg-target` eye | `Config.Target.enabled = true` |
| Hide gold pricing | `Config.Currency.show_gold = false` |

To **add a shop**, copy any entry in `Config.Shops` and change `id`, `coords`, `ped`, and `categories`. After editing, `restart ns-shops` in-game.

## Item keys on RSG

The default item list uses VORP keys (e.g. `consumable_coffee`). On RSG, the script resolves the equivalent RSG key automatically for known items. For custom items, add your own VORP↔RSG mapping in `server/itemmeta.lua`.
