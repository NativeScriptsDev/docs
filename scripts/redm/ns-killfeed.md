# ns-killfeed

A two-way verified killfeed for RedM with a draggable NUI overlay, per-player
visual themes, weapon-specific icons, and a spoof-resistant kill-confirmation
pipeline. Drop-in friendly across **VORP**, **RSG-Core** and **RedEM:RP**
through `ns-lib`.

> Each player picks the look they want from the settings panel; the server
> never trusts a single client's word for a kill.

---

## Table of Contents

- [Highlights](#highlights)
- [Themes](#themes)
- [Weapon icons](#weapon-icons)
- [Two-way verification](#two-way-verification)
- [Installation](#installation)
- [Configuration](#configuration)
- [Player commands & keybinds](#player-commands--keybinds)
- [Settings panel & persistence](#settings-panel--persistence)
- [Cross-resource API](#cross-resource-api)
- [File structure](#file-structure)
- [Building the NUI](#building-the-nui)
- [Troubleshooting](#troubleshooting)
- [Discord](#discord)

---

## Highlights

- **Four themes, swappable on the fly** — Telegraph Wire, Wanted Ledger
  *(default)*, Wild Headline, Tally Marks. Same data, four visual takes.
- **23 weapon-specific icons** — every cattleman, every shotgun, every
  thrown bottle gets the right silhouette. Falls back to a category SVG
  for environment and fist kills.
- **Spoof-resistant pairing** — both the victim and the killer must report,
  inside a configurable window. A lone victim can never fabricate a kill in
  strict mode; `fallback` mode pings the alleged killer for a one-shot ack
  when the killer's report is missing.
- **Per-player UI** — drag to position, scale 0.5×–1.5×, opacity, max rows,
  per-row lifetime, fade-out duration, theme selection. Everything is
  KVP-persisted on the player's client.
- **Server-side validation** — death check on every suicide claim, two rate
  limits (general + extended suicide cooldown), `source` capture on every
  net event, ack timeouts on fallback pings.
- **Cross-framework via ns-lib** — no direct VORP/RSG/RedEM calls. The
  resource works on any of the three with no code changes.
- **Cross-resource API** — admin tools, deathmatch resources or duel scripts
  can push rows directly with `exports['ns-killfeed']:Push(...)`.
- **Suicide rendering** — fall, drown, fire, bleed-out are emitted as
  italicised single-name rows with an environment icon.

---

## Themes

All four themes render the same row data; you swap the look from the
settings panel without restarting anything.

| Theme           | Vibe                                 | Layout                                              |
|-----------------|--------------------------------------|-----------------------------------------------------|
| `telegraph`     | Brutalist mono terminal              | `[HH:MM]  KILLER  <icon>  »  VICTIM`                |
| `ledger` *(default)* | Editorial parchment, two-line   | Line 1: `<icon>  KILLER`<br>Line 2: *killed* `VICTIM · clean shot` |
| `headline`      | Old newspaper bold serif             | Headline: `KILLER FELLS VICTIM`<br>Subhead: `<icon> · clean shot` |
| `tally`         | Dark leather + brass, compact 32px   | `KILLER  <icon>  ▸  VICTIM`                         |

Each theme has its own CSS file under `ui/src/themes/<theme>.css` and a
matching `<Theme>Row.jsx` component. Adding a new theme is a self-contained
change: drop a fifth pair of files and append the slug to
`Config.AvailableThemes`.

---

## Weapon icons

Every entry in `shared/weapons.lua` carries three pieces of information:

```lua
W[`weapon_revolver_schofield`] = {
    label    = 'Schofield Revolver',
    category = 'revolver',          -- colour hint for the row
    icon     = 'schofield_revolver' -- maps to ui/src/assets/weapons/<icon>.png
}
```

The 23 icon slugs ship with the resource:

```
single_action_revolver   double_action_revolver   schofield_revolver
volcanic_pistol          semi_auto_pistol_1       semi_auto_pistol_2
mauser_pistol            sawed_off_shotgun        pump_action_shotgun
lever_action_rifle       bolt_action_rifle        repeater_carbine
springfield_rifle        bow                      tomahawk
hunting_knife            knuckle_knife            machete
lasso                    dynamite                 throwing_knife
throwing_hatchet         fire_bottle
```

Multiple weapons share the same icon when they belong to the same visual
family (e.g. Cattleman, Vaquero and Navy all use `single_action_revolver`;
all bolas use `lasso`). Weapons with `category = 'env'` or `'fist'` and no
`icon` field fall back to a vector SVG drawn in `WeaponIcon.jsx`, so kills
from `weapon_fall`, `weapon_drowning`, `weapon_unarmed` etc. always render
something sensible.

To swap an icon, drop a replacement PNG into `ui/src/assets/weapons/`
keeping the same slug, then run `npm run build`.

---

## Two-way verification

Killfeeds are a classic spoofing target — a single client can claim "I just
killed X" without anyone dying. ns-killfeed pairs **two independent reports**
on the server before broadcasting.

```
   Victim client         Server                     Killer client
   ─────────────         ──────                     ─────────────
   I died → killer S     ┐
   weapon W              │
   ──────────────────────┼─►  pending[victim] = { killer S, W, ts }
                         │
   "Killer S killed me"  │
                         │
   ┌─ I killed victim    ◄──── (killer client sees victim die)
   │  with W
   └──────────────────────────►  pending[victim].killerReported = true
                         │      ↓
                         │      both flags? → broadcast
                         │
   pending expires       │
   without killer ack:   │
   ── strict   → drop    │
   ── soft     → emit    │      (flagged unconfirmed)
   ── fallback → ping ──────►  did you kill victim S?
                         │ ◄────── yes / no
                         │      yes → broadcast, no → drop
```

### Match modes

| `Config.MatchMode` | Behaviour                                                                                   |
|--------------------|---------------------------------------------------------------------------------------------|
| `strict`           | Both reports required within `MatchWindow`. Drops legit kills on packet loss or DC.         |
| `soft`             | Victim report alone is enough. **Not spoof-proof** — trusted/small servers only.            |
| `fallback` *(default)* | Try strict; if only the victim reported, server pings the alleged killer for a one-shot ack within `FallbackPingTimeout`. Best balance. |

Suicide reports skip pairing: when `killerSrc == victimSrc` or `killerSrc == 0`
the server confirms the reporter is actually dead
(`IsEntityDead(GetPlayerPed(src))`), enforces a 30-second per-player cooldown,
and broadcasts.

---

## Installation

### Requirements

- A running RedM server with one of:
  - **VORP** core
  - **RSG-Core**
  - **RedEM:RP**
- **ns-lib** loaded before this resource (cross-framework abstraction layer)
- Node.js + npm — only required to **build** the NUI; not needed at runtime

### Steps

1. Drop the resource into your `resources/[Scripts]/ns-killfeed` folder.
2. Build the NUI (one-time, or when you change UI source):
   ```bash
   cd ns-killfeed/ui
   npm install
   npm run build
   ```
   This emits the production bundle to `ns-killfeed/html/`, which
   `fxmanifest.lua` serves to the game client.
3. In your `server.cfg`, make sure `ns-lib` starts before this resource:
   ```cfg
   ensure ns-lib
   ensure ns-killfeed
   ```
4. Join the server and press **F10** (or run `/killfeed`) to open the
   settings panel.

---

## Configuration

All knobs live in `config.lua`. Player-tunable UI defaults are overridden
per-player via KVP once the player saves settings.

### Verification

| Key                          | Default     | Meaning                                            |
|------------------------------|-------------|----------------------------------------------------|
| `Config.MatchMode`           | `'fallback'`| `strict` \| `soft` \| `fallback`                   |
| `Config.MatchWindow`         | `3000`      | ms — pair must arrive within this                  |
| `Config.FallbackPingTimeout` | `1500`      | ms — killer must ack the fallback ping by this     |

### Scope

| Key                          | Default     | Meaning                                            |
|------------------------------|-------------|----------------------------------------------------|
| `Config.ShowPvP`             | `true`      | broadcast player-vs-player kills                   |
| `Config.ShowSuicide`         | `true`      | broadcast self / environment deaths                |
| `Config.ShowNpcKill`         | `false`     | player killed by an NPC                            |
| `Config.ShowEnvKill`         | `false`     | dedicated environmental death lines (future)      |

### Rate limit

| Key                          | Default     | Meaning                                            |
|------------------------------|-------------|----------------------------------------------------|
| `Config.MinReportInterval`   | `800`       | ms between victim reports per source               |

### UI defaults (overridable per-player)

| Key                          | Default       | Meaning                                          |
|------------------------------|---------------|--------------------------------------------------|
| `Config.DefaultPosition`     | `{x=78, y=4}` | % of viewport (top-right corner by default)      |
| `Config.DefaultScale`        | `1.0`         | 0.5 .. 1.5                                       |
| `Config.DefaultOpacity`      | `0.92`        | 0.3 .. 1.0                                       |
| `Config.MaxRows`             | `4`           | visible rows                                     |
| `Config.FadeMs`              | `5000`        | per-row visible lifetime                         |
| `Config.FadeOutMs`           | `600`         | fade transition duration                         |
| `Config.DefaultTheme`        | `'ledger'`    | `telegraph` \| `ledger` \| `headline` \| `tally` |
| `Config.AvailableThemes`     | (all four)    | list shown in the settings UI picker             |

### Keybinds & debug

| Key                          | Default                  | Meaning                                |
|------------------------------|--------------------------|----------------------------------------|
| `Config.SettingsKey`         | `'F10'`                  | default keybind (rebindable in-game)   |
| `Config.SettingsKeyMapping`  | `'killfeedsettings'`     | RegisterKeyMapping ID                  |
| `Config.Debug`               | `true`                   | enables `/killfeed_test` + log output  |

### Messages (English, no i18n)

`Config.Messages` holds the strings shown to the player (suicide line,
settings open/saved toast, unknown-weapon label). Edit in-place if you want
custom wording.

---

## Player commands & keybinds

| Command           | Effect                                                              |
|-------------------|---------------------------------------------------------------------|
| `/killfeed`       | Open the settings panel (same as the keybind)                       |
| **F10** *(default)* | Open the settings panel — rebindable from the in-game key map     |
| `/killfeed_test`  | Spawn four demo rows (cattleman / sawed-off / carcano / fall). **Only available while `Config.Debug = true`.** |

The keybind is registered via `RegisterKeyMapping`, so each player can rebind
it from the RedM key-mapping menu (Settings → Key Bindings → FiveM/RedM).

---

## Settings panel & persistence

Open the panel with the keybind or `/killfeed`. While the panel is open:

- The feed shows **four preview rows** so you can see what the chosen theme
  + scale + opacity actually look like.
- The feed becomes **draggable**: click-and-hold anywhere on the killfeed
  anchor to drop it elsewhere on the screen. Live preview, no commit until
  you press **Save**.
- Adjust **theme**, **scale**, **opacity**, **max rows**, **fade duration**.
- **Save** commits everything to KVP and closes the panel.
- **Cancel** / **ESC** reverts to the previous committed settings.

KVP key (single blob, JSON-encoded):

```
ns-killfeed:settings
```

To wipe a player's settings (debug): clear that KVP key from their client
and rejoin.

---

## Cross-resource API

Other resources — admin menus, deathmatch arenas, duel scripts, custom RP
events — can push rows directly. The server-side export skips the pairing
step (the caller is trusted).

```lua
-- Force a row from another resource.
exports['ns-killfeed']:Push(killerSrc, victimSrc, weaponHash, 'pvp')
exports['ns-killfeed']:Push(killerSrc, victimSrc, weaponHash, 'pvp', true)  -- headshot
exports['ns-killfeed']:Push(victimSrc, victimSrc, weaponHash, 'suicide')
```

| Arg           | Type                  | Notes                                                      |
|---------------|-----------------------|------------------------------------------------------------|
| `killerSrc`   | `number`              | Player server-id, or `0` / `victimSrc` for suicide         |
| `victimSrc`   | `number`              | Player server-id of the victim                             |
| `weaponHash`  | `number` (uint32)     | Use a backtick hash literal: `` `weapon_revolver_cattleman` `` |
| `killType`    | `'pvp'` \| `'suicide'`| Suicide rows never render a headshot badge                 |
| `isHeadshot`  | `boolean` *(opt)*     | Defaults to `false`                                        |

Anything you push appears on every client respecting their personal theme
and UI settings.

---

## File structure

```
ns-killfeed/
├── fxmanifest.lua
├── config.lua
├── README.md
├── shared/
│   ├── utils.lua
│   └── weapons.lua            ← hash → { label, category, icon }
├── client/
│   ├── main.lua               ← death watcher, victim reporter
│   ├── nui.lua                ← inbound row pusher, /killfeed_test
│   ├── settings.lua           ← KVP load/save, settings panel bridge
│   └── command.lua            ← /killfeed + RegisterKeyMapping
├── server/
│   ├── verify.lua             ← pairing window, fallback ping, rate limits
│   └── main.lua               ← net events, Push export
├── html/                      ← built NUI (git-ignored if you prefer)
│   ├── index.html
│   └── assets/
│       ├── index-*.js
│       ├── index-*.css
│       ├── <weapon>-<hash>.png   (23 icons)
│       └── *.woff / *.woff2      (Rye, IM Fell English)
└── ui/                        ← React + Vite source
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── components/        ← KillFeed, KillRow, SettingsPanel, DragAnchor
        ├── themes/            ← *.css + *Row.jsx for the four themes
        ├── icons/             ← WeaponIcon.jsx + SkullBadge.jsx
        ├── hooks/             ← useNuiEvent
        ├── lib/               ← nui.js (NUI fetch bridge)
        ├── styles/            ← global.css
        └── assets/
            └── weapons/       ← 23 source PNGs
```

---

## Building the NUI

```bash
cd ui
npm install
npm run build      # → ../html/ (production bundle, Vite hashes the assets)
```

For UI development:

```bash
npm run dev        # opens localhost:5175 in the browser
```

The NUI no-ops its `fetch('https://ns-killfeed/...')` calls when it is not
running inside the RedM client (see `ui/src/lib/nui.js`), so theme/layout
work in a normal browser is safe — drag-positioning, theme picker, and live
preview all work without a server.

When you change any file under `ui/src/`, you must `npm run build` again
and restart the resource (or `refresh; ensure ns-killfeed`) for the changes
to appear in-game.

---

## Troubleshooting

| Symptom                                      | Likely cause / fix                                                                  |
|----------------------------------------------|-------------------------------------------------------------------------------------|
| Resource fails to start                      | `ns-lib` not loaded first. Add `ensure ns-lib` *above* `ensure ns-killfeed`.        |
| Settings panel won't open                    | Another resource is grabbing F10. Rebind from the in-game key map or change `Config.SettingsKey`. |
| Kills never appear                           | Likely `strict` mode + lossy network. Switch `Config.MatchMode` to `'fallback'`.    |
| Suicide rows spammed                         | Lower `Config.MinReportInterval` or check that the client isn't double-reporting. The 30-second per-player suicide cooldown is hard-coded server-side. |
| Wrong icon for a custom weapon               | Add the hash to `shared/weapons.lua` with the matching `icon` slug.                 |
| `unknown` weapon label                       | The hash isn't in `weapons.lua`. The row still renders, just with a hex placeholder label. |
| Icons look pixelated                         | `objectFit: contain` keeps aspect ratio. Bump `Config.DefaultScale` or row size in the theme CSS. |
| `/killfeed_test` does nothing                | `Config.Debug = false`. Set it to `true` and restart.                               |
| Drag handle never appears                    | The drag anchor only activates while the settings panel is open. Open the panel first. |

---

## Discord

Updates, bug reports, and other NativeScriptsDev releases:
<https://discord.gg/UyyngemnF8>
