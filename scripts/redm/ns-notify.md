# ns-notify

> Western-themed, standalone notification system — RedM/FiveM compatible.

Parchment paper texture, Rye + IM Fell DW Pica fonts, brass-plated gold accents. Wanted-poster aesthetic.

## Features

- **7 notification types:** `info`, `warning`, `error`, `job`, `sheriff`, `doctor`, `bandit` — each with its own color, icon, sound and western label (TELEGRAPH, ALERT, DANGER, JOB, LAW, HEALER, OUTLAW)
- **9 positions** (3x3 grid) — chosen by the player, saved locally via **FiveM KVP**
- **3 animations:** `slide` / `fade` / `pop` — chosen by the player
- **Progress bar** (timeout indicator) and a **per-type sound effect**
- **Stack behavior** — multiple notifications pile up on top of each other
- **Standalone** — framework-agnostic (NO ns-lib dependency)
- **Hybrid API:** `show()` (short) + `advanced()` (detailed)

## Installation

1. Copy the `ns-notify` folder to the server (`resources/[mr_prof]/ns-notify`).
2. Add to `server.cfg`: `ensure ns-notify`.
3. (Optional) Customize the type colors, icons and sounds in `config.lua`.
4. **Icons:** `html/icons/<type>.png` — add your own western-themed PNGs (info, warning, error, job, sheriff, doctor, bandit). If an icon is missing, an automatic fallback (the first letter of the type label) is shown.

## Commands

| Command | Description |
|---|---|
| `/notifsettings` | Position and animation settings panel (NUI) |
| `/notiftest <type> [duration]` | Send a test notification. e.g. `/notiftest sheriff 5000` |

## Usage

### Client
```lua
-- Short
exports['ns-notify']:show('info', 'Money received')
exports['ns-notify']:show('warning', 'Low health', 6000)

-- Detailed
exports['ns-notify']:advanced({
    type     = 'sheriff',
    title    = 'New Job',
    message  = "There's a robbery in Valentine, partner.",
    duration = 5000,
})
```

### Server
```lua
-- Single player
exports['ns-notify']:show(source, 'warning', 'Low health')

exports['ns-notify']:advanced(source, {
    type    = 'sheriff',
    title   = 'Job',
    message = '...',
})

-- All players
exports['ns-notify']:showAll('info', 'Server is restarting')

-- Or via net event
TriggerClientEvent('ns-notify:show', source, {
    type = 'info', message = 'Welcome, partner',
})
```

## Types & Colors

| Type | Label | Color |
|---|---|---|
| `info`    | TELEGRAPH | Aged gold (#C9A961) |
| `warning` | ALERT     | Rust amber (#D97706) |
| `error`   | DANGER    | Barn red (#991B1B) |
| `job`     | JOB       | Forest green (#15803D) |
| `sheriff` | LAW       | Sheriff blue (#1E3A8A) |
| `doctor`  | HEALER    | Cyan (#0E7490) |
| `bandit`  | OUTLAW    | Coal (#1F1B16) |

## Configuration

In `config.lua`:

| Key | Description |
|---|---|
| `Config.DefaultDuration` | Default duration (ms) |
| `Config.DefaultPosition` | Default position for a new player |
| `Config.DefaultAnimation` | Default animation |
| `Config.Types[<type>].color` | Type color (hex) |
| `Config.Types[<type>].icon` | Icon path (`html/...`) |
| `Config.Types[<type>].sound` | RDR `HUD_DEAD_HORSE_SOUNDSET` sound name |
| `Config.Types[<type>].label` | Label shown at the start of the notification |
| `Config.ProgressBar` | Timeout bar on/off |
| `Config.PlaySound` | Sound on/off |

## Architecture

```
ns-notify/
├── fxmanifest.lua
├── config.lua              # All settings in one file
├── exports.lua             # Public API (client+server)
├── client/
│   ├── main.lua            # NUI bridge, Show/Advanced
│   ├── settings.lua        # KVP + /notifsettings
│   └── commands.lua        # /notiftest
├── server/
│   └── main.lua            # Server-side relay
└── html/
    ├── index.html          # Settings panel + container
    ├── style.css           # Western parchment theme
    ├── script.js           # NUI message handler
    └── icons/              # PNG icons (user-supplied)
```

## Notes

- **Standalone** — no framework like VORP/RSG/ESX is required.
- **Sound** comes from RDR's `HUD_DEAD_HORSE_SOUNDSET` palette; custom sound names can be changed in `config.lua`.
- **Fonts** are loaded from Google Fonts (Rye + IM Fell DW Pica). On NUIs without internet access, the fallback `Georgia` serif is used.
- **NUI focus** is only active while `/notifsettings` is open — player movement is never restricted while a notification is showing.
