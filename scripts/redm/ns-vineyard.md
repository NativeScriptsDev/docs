# ns-vineyard

Grape growing + wine production system. Cross-framework via [ns-lib](/scripts/redm/ns-lib).

## Flow

```
[Vineyard plot]            [Press machine]           [Cellar — fixed slots]
  3×3 cell, 2×2 vine          public, open to all       per-player, client-only
  → unlock ($100/cell)        → 10 grapes = 1 bucket     → place a barrel
  → grow vines (5 min)        → animation + cooldown     → 2 buckets = full barrel
  → harvest (1-10 grapes)                                → wait (quality 1→5)
                                                         → collect (4 bottles wine_q[N])
```

## Requirements

- **ns-lib** (mandatory) — one of the supported frameworks must be running (VORP, RSG-Core, RedEM:RP, ESX, QBCore)
- **oxmysql** or **mysql-async**
- (Recommended) **ox_lib** — nicer notifications

## Installation

1. Copy this folder to `resources/ns-vineyard/`
2. Apply the `sql/install.sql` file to your database
3. Add the items below to your framework's item DB (see [Items](#items))
4. Add `ensure ns-lib` and then `ensure ns-vineyard` to `server.cfg`
5. Restart the server

## Items (add to your inventory)

| Item name | Description | Stackable |
|---|---|---|
| `grape` | Grape | yes |
| `grape_juice` | Grape Juice (bucket) | yes |
| `wine_q1` | Young Wine | yes |
| `wine_q2` | Mature Wine | yes |
| `wine_q3` | Quality Wine | yes |
| `wine_q4` | Premium Wine | yes |
| `wine_q5` | Vintage Wine | yes |

### ox_inventory (`data/items.lua`)
```lua
['grape']       = { label = 'Grape',        weight = 50,  stack = true },
['grape_juice'] = { label = 'Grape Juice',  weight = 500, stack = true },
['wine_q1']     = { label = 'Young Wine',    weight = 600, stack = true },
['wine_q2']     = { label = 'Mature Wine',   weight = 600, stack = true },
['wine_q3']     = { label = 'Quality Wine',  weight = 600, stack = true },
['wine_q4']     = { label = 'Premium Wine',  weight = 600, stack = true },
['wine_q5']     = { label = 'Vintage Wine',  weight = 600, stack = true },
```

### vorp_inventory (SQL)
```sql
INSERT INTO items (item, label, type, usable, can_remove) VALUES
  ('grape',       'Grape',        'item_standard', 0, 1),
  ('grape_juice', 'Grape Juice',  'item_standard', 0, 1),
  ('wine_q1',     'Young Wine',   'item_standard', 0, 1),
  ('wine_q2',     'Mature Wine',  'item_standard', 0, 1),
  ('wine_q3',     'Quality Wine', 'item_standard', 0, 1),
  ('wine_q4',     'Premium Wine', 'item_standard', 0, 1),
  ('wine_q5',     'Vintage Wine', 'item_standard', 0, 1);
```

### qb-core / rsg-core (`shared/items.lua`)
```lua
grape       = { name = 'grape',       label = 'Grape',        weight = 50,  type = 'item', image = 'grape.png',       unique = false, useable = false, shouldClose = false, combinable = nil, description = 'A grape.' },
grape_juice = { name = 'grape_juice', label = 'Grape Juice',  weight = 500, type = 'item', image = 'grape_juice.png', unique = false, useable = false, shouldClose = false, combinable = nil, description = 'A bucket of grape juice.' },
wine_q1     = { name = 'wine_q1',     label = 'Young Wine',   weight = 600, type = 'item', image = 'wine.png',        unique = false, useable = true,  shouldClose = true,  combinable = nil },
wine_q2     = { name = 'wine_q2',     label = 'Mature Wine',  weight = 600, type = 'item', image = 'wine.png',        unique = false, useable = true,  shouldClose = true,  combinable = nil },
wine_q3     = { name = 'wine_q3',     label = 'Quality Wine', weight = 600, type = 'item', image = 'wine.png',        unique = false, useable = true,  shouldClose = true,  combinable = nil },
wine_q4     = { name = 'wine_q4',     label = 'Premium Wine', weight = 600, type = 'item', image = 'wine.png',        unique = false, useable = true,  shouldClose = true,  combinable = nil },
wine_q5     = { name = 'wine_q5',     label = 'Vintage Wine', weight = 600, type = 'item', image = 'wine.png',        unique = false, useable = true,  shouldClose = true,  combinable = nil },
```

## Configuration

All settings live in `config.lua`. The most important ones:

| Setting | Default | Description |
|---|---|---|
| `Config.PlotOrigin` | `vector3(2604, -1041, 47)` | Center coordinate of the vineyard plot — change for your server |
| `Config.PressLocation` | `vector3(2640, -1042, 46)` | Press machine location |
| `Config.CellarLocation` | `vector3(2630, -1050, 47)` | Cellar center (slots are arranged nearby) |
| `Config.BarrelSlots` | 5 slots, 1.5m apart on the x axis | Position + heading per slot |
| `Config.GrowDuration` | `300` | Seconds, from vine to harvestable grapes (5 min — test/dev) |
| `Config.QualityThresholds` | `{0,300,900,1800,3600}` | Quality tier thresholds (1→5) |
| `Config.CellCost` | `100` | Cost to unlock a cell |
| `Config.WinePerBarrel` | `4` | Number of bottles produced per barrel |

Set the time scale to **medium** or **slow** for a live server — see the comment lines in the [config.lua](./config.lua) file referenced at the top of the README.

## Architecture

```
client (each player sees their own props)
  ├ propmgr.lua      — local-only prop registry, cleanup
  ├ main.lua         — state + DrawText3DLocal helper
  ├ vineyard.lua     — vine props, unlock cell + harvest prompt
  ├ press.lua        — press animation + prompt
  └ barrel.lua       — slot props, add bucket + collect prompt + DrawText3D quality

server (DB + validation)
  ├ db.lua           — SQL queries (NSLib.Query)
  ├ main.lua         — lifecycle, OnPlayerLoaded, sync push
  ├ vineyard.lua     — UnlockCell, HarvestVine (mutex + dist + time check)
  ├ press.lua        — PressGrapes (cooldown + dist check)
  └ barrel.lua       — PlaceBarrel, AddBucket, CollectWine (slot-based)
```

### Sync strategy

1. Player join → `OnPlayerLoaded` → DB load → cache → `syncState` event push
2. The client keeps the cache + server clock offset and does time calculations locally
3. On an action → server validate → DB update → cache update → new `syncState`
4. All time-based UI (ripening countdown, quality progress) is rendered on the client only

### Anti-cheat

- Cell ID, vine idx and slot ID are validated on the server
- Distance is checked server-side on every action (`GetEntityCoords`)
- Inventory operations are atomic (mutex per-source)
- A cell can't be unlocked without the cost being deducted
- Quality is computed from `filled_at`, based on server time

## FAQ

**Q: The vine prop doesn't show up**
A: Verify the `Config.VineModelEmpty` / `Config.VineModelRipe` hashes against your own RedM build (CodeWalker / OpenIV).

**Q: DrawText3D renders special characters incorrectly**
A: RedM supports UTF-8 via `LITERAL_STRING`, but some fonts are incompatible. Try `SetTextFontForCurrentCommand(2)` or `(9)` instead of `(0)`.

**Q: I want to charge for the press**
A: Add an `NSLib.RemoveMoney` call in `server/press.lua` and a `PressCost` in the config.

**Q: I want a single wine item with ox_inventory metadata**
A: Change `Config.Items.wineQ` in `config.lua` to a single name and, in `CollectWine` in `server/barrel.lua`, call `NSLib.AddItem(source, 'wine', amount, { quality = quality })`. Collapse the 5 items in the README into a single `wine`.

## License

MIT
