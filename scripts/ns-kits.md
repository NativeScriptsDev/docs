# ns-kits

Western (RDR2) styled kit menu for RedM. Players open the menu with the `/kit` chat command and claim from one of ten kit categories — three free, three Discord-gated, four donator tiers.

> **Support / Community:** [discord.gg/UyyngemnF8](https://discord.gg/UyyngemnF8) — bug reports, feature requests, server invite.

## Kits

### Free (no role required)

| ID | Cooldown | Contents |
|---|---|---|
| `starter` | **once per character** | Revolver ammo ×8, bandage ×3, peach ×2, $50 |
| `daily` | 24 hours | Kidney beans ×2, salmon can ×2, coffee ×1, $25 |
| `weekly` | 7 days | Repeater ×8, repeater express ×8, bandage ×5, herbal tonic ×3, $150 |

### Discord-gated

| ID | Required role | Cooldown | Contents |
|---|---|---|---|
| `discord` | `member` | 7 days | Haycube ×5, bandage ×3, meat stew ×2, $200 |
| `streamer` | `streamer` | 7 days | Revolver express ×8, bandage ×5, herbal tonic ×2, coffee ×2, $250 |
| `booster` | `booster` | 7 days | Rifle express ×8, rifle explosive ×8, bandage ×5, herbal tonic ×3, wine ×2, $500 |

### Donator tiers (Discord-gated)

| ID | Required role | Cooldown | Contents |
|---|---|---|---|
| `vip` | `vip` | 7 days | Revolver express ×8, bandage ×3, herbal tonic ×2, coffee ×2, $300 |
| `gold` | `gold` | 7 days | Repeater ×8, repeater express ×8, bandage ×5, herbal tonic ×2, wine ×1, $400 |
| `premium` | `premium` | 7 days | Rifle express ×8, rifle explosive ×8, bandage ×5, herbal tonic ×3, wine ×2, $600 |
| `diamond` | `diamond` | 7 days | Rifle express ×8, rifle explosive ×8, rifle velocity ×8, bandage ×5, herbal tonic ×3, wine ×3, meat stew ×2, $1000 |

Disable any kit you don't offer by setting `enabled = false` in `config.lua` — it'll be hidden in the menu and server-side claims will be rejected.

## Adding / removing kits

Open **`config.lua`** and edit the `Config.Kits = { ... }` table at the bottom. The block right above that table has a copy-paste template, a field reference, and notes on how to remove a kit cleanly. After editing, run `restart ns-kits` in-game — no build step required.

Available `icon` values (SVG icons shipped in `html/kit-menu.jsx`):

```
Starter | Daily | Weekly | Discord | Streamer | Booster
VIP | Gold | Premium | Diamond
```

Available `accent` values (card rail colors, defined in `html/styles.css`):

```
gold | amber | discord | rust | streamer
vip | gold-tier | premium | diamond
```

To add a new icon, see [`html/README.md`](html/README.md) → "Add a new icon".

## Running on RSG / QBCore / ESX / RedEM:RP

ns-lib auto-detects the framework, so `NSLib.AddItem`, `NSLib.AddMoney`, etc. are framework-agnostic. The only thing that varies between servers is **item key names**.

The kits ship with VORP item keys (e.g. `ammorevolvernormal`, `consumable_peach`). On a different framework, just edit each kit's `items[*].name` in `config.lua` to your real item keys. Look them up in:

- **RSG:** `rsg-core/shared/items.lua`
- **QBCore:** `qb-core/shared/items.lua`
- **ESX:** `SELECT name FROM items;`
- **RedEM:RP:** `SELECT item FROM items;`

## Dependencies

- **ns-lib** (required) — `ensure ns-lib` must come **before** `ns-kits` in `server.cfg`
- **VORP / RSG-Core / RedEM:RP / ESX / QBCore** — NSLib auto-detects whichever is running
- **oxmysql** or **mysql-async** — for cooldown persistence

## Installation

1. Make sure `ns-lib` is installed and `ensure`d.
2. Drop this folder into `resources/ns-kits/`.
3. Update `server.cfg`:
   ```
   ensure ns-lib
   ensure ns-kits
   ```
4. **Discord bot** — token + guild ID are configured **once** in `ns-lib` (see [ns-lib README §7](https://nativescriptsdev.github.io/docs/scripts/ns-lib#7-discord-server-only)) and shared by every dependent script. ns-kits only needs role IDs.
5. **For Discord-gated kits**, fill in the role IDs in `Config.Discord.Roles` in `config.lua` (see below). Set `Enabled = true` to enable role checks.
6. **Replace item names if not on VORP** — see [Running on RSG / QBCore / ESX / RedEM:RP](#running-on-rsg--qbcore--esx--redemrp).

## Discord role setup

The bot itself lives in ns-lib. ns-kits only maps **role IDs → kit gates**. Configure as many or as few as you sell on your server — disable kits you don't use with `enabled = false`.

1. Discord → Settings → Advanced → enable Developer Mode (if not already).
2. Server Settings → Roles → right-click each role → Copy Role ID.
3. Paste into `Config.Discord.Roles` in `config.lua`:
   ```lua
   Config.Discord = {
       Enabled = true,
       Roles = {
           member   = 'ROLE_ID',   -- discord kit
           booster  = 'ROLE_ID',   -- booster kit
           streamer = 'ROLE_ID',   -- streamer kit
           vip      = 'ROLE_ID',   -- vip kit
           gold     = 'ROLE_ID',   -- gold kit
           premium  = 'ROLE_ID',   -- premium kit
           diamond  = 'ROLE_ID',   -- diamond kit
       },
   }
   ```

If you don't run a tier (e.g. no `gold` rank on your server), set the corresponding kit's `enabled = false` in `Config.Kits` instead of leaving a junk role ID.

## Testing

```
/kit
```

The command name can be changed via `Config.OpenCommand` in `config.lua`.

## Database

The `ns_kits_claims` table is created automatically on first start. Manual reset queries:

```sql
TRUNCATE ns_kits_claims;                                    -- reset all cooldowns
DELETE FROM ns_kits_claims WHERE char_id = 'CHAR_ID';       -- reset a single character
DELETE FROM ns_kits_claims WHERE kit_id = 'starter';        -- let everyone claim starter again
```

## Cross-resource API

ns-lib already exposes a cross-resource API. `ns-kits` does not export its own surface — if another script needs to grant a kit, call `NSLib.AddItem` / `NSLib.AddMoney` directly.

## NUI / frontend

The menu is built with React 18. **No CDN dependencies** — React, ReactDOM and the fonts (Rye / Crimson Text / JetBrains Mono) are all bundled locally under `html/vendor/` and `html/fonts/`. The menu fully renders even on offline servers.

For build steps and customization (icons, colors, layout), see **[html/README.md](html/README.md)**.

## License

Proprietary / commercial — distribution governed by the [Native Scripts Tebex EULA](https://discord.gg/UyyngemnF8). Redistribution, resale, or republishing the source is prohibited.
