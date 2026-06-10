# ns-deathcam

Cross-framework RedM death camera with full killer tracking, dual UI
designs, a personal death-message system, a per-session death log with
copyable identifiers, and an optional Discord kill-log webhook.

When the player dies, the camera swings to the killer for a configurable
duration, a HUD shows weapon / distance / damage / headshot / ping, and
the killer's chosen taunt message floats above their name. Respawn is
left entirely to the core/framework — ns-deathcam never resurrects the
player, it only handles the camera, HUD, log, and webhook.

Built on top of [ns-lib](https://nativescriptsdev.github.io/docs/scripts/redm/ns-lib);
works with **VORP**, **RSG-Core**, and **RedEM:RP** out of the box
because the only thing it asks the framework for is "is the player ped
dead" — which is detected client-side via natives.

## Features

- **Killer cam** — `DEFAULT_SCRIPTED_CAMERA` placed `KillerCamFrontDist`
  metres in front of the killer at `KillerCamHeight`, pointed at their
  head. Per-frame reassert (`SetCamActive` + `RenderScriptCams(true, …)`
  every tick with `p4=true`) keeps the cam alive when the framework's
  death scene tries to take it back. Set `Config.KillerCamDuration = 0`
  to skip the killer cam entirely.
- **Two UI designs** — switchable live:
  - **A — Cinematic Letterbox**: black bars top/bottom, weapon icon,
    distance, damage given/taken, ping.
  - **B — Parchment Scroll**: western aged-paper card with "YOU ARE
    DEAD" hero, death-report number, weapon, range label
    (CLOSE/MID/LONG/VERY LONG), killer HP/Core, ping.
- **Personal death message** — each player can set a short (<= 30 char)
  taunt via `/deathcamsettings`. Stored in client KVP and pushed to the
  server in-memory map; their victims see it on the death HUD. Strings
  are sanitised both client- and server-side (control chars + `<>`
  stripped, trimmed, length-capped).
- **Death log** — last `Config.MaxDeathLogEntries` deaths per player
  (in-memory, keyed by license). Each entry stores killer name, server
  ID, **Steam / FiveM license / Discord ID**, weapon, distance, damage,
  headshot flag, and timestamp. Open with `/deathlog`, sort by recent /
  killer / weapon, and copy any single ID or the whole row with one
  click.
- **Live damage capture** — `gameEventTriggered` /
  `CEventNetworkEntityDamage` records the latest attacker + weapon
  every frame. Used as the primary killer source because
  `GetPedSourceOfDeath` is unreliable on the second and later deaths of
  a session in RedM (the engine reuses the player ped instead of
  spawning a new one). Falls back to the native only when no damage
  event arrived in the last 6 seconds (environment kills — falls,
  drowning, fire).
- **Damage given / taken** — both totals are tracked across the
  player's life via 500 ms HP polling (the `CEventNetworkEntityDamage`
  event does **not** fire for AI ped damage in RedM, so polling is the
  only reliable signal).
- **Headshot detection** — compares `GetPedLastDamageBone(pp)` against
  `SKEL_Head`.
- **NPC vs player split** — NPC kills show "NPC KILLER", skip the
  message panel, skip the server-side message/ping lookup, and Discord
  embeds tag the killer as `NPC / Unknown` with no IDs.
- **Killer ping** — `GetPlayerPing` is server-only in RedM, so the
  server pushes the killer's ping back to the victim via
  `ns-deathcam:client:applyKillerExtras` and the HUD merges it in
  asynchronously.
- **Discord webhook** — every kill posts a detailed embed with weapon /
  distance / headshot flag and a monospace identity block for both
  killer and victim (server ID, Steam, FiveM license, Discord ID).
  Leave `Config.DiscordWebhook = ''` to disable.
- **Pure client-side detection** — no framework events required. The
  death-detection loop polls `IsEntityDead(PlayerPedId())` every 500 ms
  and triggers regardless of which core resurrects the player.

## Requirements

- **ns-lib** — only used as a soft dependency for the project's bridge
  pattern; ns-deathcam itself does not call any ns-lib export.
- One of: **VORP**, **RSG-Core**, **RedEM:RP** (or any custom core that
  eventually resurrects the player ped — ns-deathcam doesn't care which
  one).
- Node.js + npm — to build the NUI bundle.

## Installation

1. Make sure `ns-lib` is installed and started (`ensure ns-lib` in your `server.cfg`).
2. Drop this folder into `resources/ns-deathcam/`. The NUI bundle in
   `html/` is prebuilt and committed — no build step is required to run
   it.
3. Add to `server.cfg` after `ns-lib`:
   ```
   ensure ns-lib
   ensure ns-deathcam
   ```
4. (Optional) Set your Discord webhook in `config.lua` →
   `Config.DiscordWebhook`. Leave empty to disable kill logging.
5. Restart the server. No SQL migration — death log and message store
   are in-memory only.

To rebuild the UI after editing `ui/src/`:
```bash
cd ui
npm install
npm run build
```
Output goes to `html/` (already referenced by `fxmanifest.lua`).

## How it plays

1. Player ped dies. The 500 ms death-detection thread flips `isDead =
   true` on the next tick.
2. Killer resolution:
   - If `gameEventTriggered` captured a damage event in the last 6
     seconds → use that attacker + weapon.
   - Otherwise → fall back to `GetPedSourceOfDeath` /
     `GetPedCauseOfDeath` (typically only for environment kills).
3. If the killer is a real player → request their saved death message
   and their ping from the server, both pushed back in a single
   payload.
4. If `Config.KillerCamDuration > 0` → spawn the scripted cam, point
   it at the killer's head, reassert every frame.
5. NUI HUD opens (`DEATH_SHOW`) with the chosen design (A or B), the
   killer payload, the cam-timer seconds, and the death-report ID.
6. After `KillerCamDuration` seconds → HUD hides, scripted cam is
   destroyed, game camera resumes. `isDead` stays `true` until the
   core respawns the player ped.
7. Server records the death in `deathLog[<license>]` (capped at
   `Config.MaxDeathLogEntries`) and fires the Discord embed if a
   webhook is configured.

## Commands

| Command | Use |
|---|---|
| `/deathlog` | Opens the death-log modal — last *N* deaths with weapon icons, sort modes, full killer identity (Steam / license / Discord / server ID), one-click copy. `Esc` to close. |
| `/deathcamstyle [A\|B]` | Switch HUD design. With no arg, toggles A ↔ B. Persisted in client KVP (`ns_deathcam_design`). |
| `/deathcamsettings` | Opens the settings panel — pick design and set your taunt message (max `Config.MaxMessageLength` chars). |
| `/deathcamtest` | Debug only (requires `Config.Debug = true`). Spawns a hostile NPC next to the player that draws a Cattleman revolver and engages, so you can verify the full death → cam → HUD → respawn loop without finding a real fight. |

## Configuration

All settings live in `config.lua`.

### Camera

| Key | Default | Meaning |
|---|---|---|
| `Config.KillerCamDuration` | `8` | Seconds the killer cam runs after death. `0` disables the scripted cam entirely (HUD still shows). |
| `Config.KillerCamFrontDist` | `3.5` | Distance in metres in front of the killer where the camera sits. |
| `Config.KillerCamHeight` | `1.6` | Camera height above the killer's ground level (metres). |
| `Config.KillerCamFov` | `55.0` | Field-of-view for the scripted cam. |
| `Config.CorpseCamOffset` | `vector3(0,2.5,1.5)` | Reserved for a future corpse-cam fallback. Currently unused — when the killer cam timer ends the HUD hides and the game camera resumes. |
| `Config.CorpseCamFov` | `50.0` | Reserved (see above). |

### UI

| Key | Default | Meaning |
|---|---|---|
| `Config.DefaultDesign` | `'B'` | First-time design for a player who hasn't picked one yet. `'A'` = cinematic letterbox, `'B'` = parchment scroll. Player preference (KVP) wins after first use. |
| `Config.MaxMessageLength` | `30` | Max character length for the player-set death message. Enforced both client- and server-side. |
| `Config.Messages.died` | `'You have died.'` | Reserved label, not currently rendered by the HUD. |
| `Config.Messages.designChanged` | `'Death cam style set to: %s'` | Reserved toast string. |
| `Config.Messages.defaultDeathMessage` | `'—'` | Placeholder shown for real-player kills when the killer has not set a message. Set to `''` to hide the message panel entirely in that case. |

### Discord

| Key | Default | Meaning |
|---|---|---|
| `Config.DiscordWebhook` | `''` | Webhook URL. Empty by default — set it to enable kill logging. |
| `Config.DiscordServerName` | `sv_hostname` | Footer text in every embed. |
| `Config.DiscordColor` | `9109504` | Embed side-bar color (decimal). Default = `#8B0000` dark red. |

### Death log

| Key | Default | Meaning |
|---|---|---|
| `Config.MaxDeathLogEntries` | `50` | Per-player cap. In-memory only — cleared on `playerDropped` / resource stop. |

### Weapon names

`Config.WeaponNames` maps weapon model strings to display labels shown
in the HUD and death log. Add, rename, or remove entries freely — any
weapon hash that isn't in the table renders as `Unknown (0x<hash>)`.

## Architecture

```
ns-deathcam/
├── fxmanifest.lua
├── config.lua              # all settings + weapon name map
├── client/
│   └── main.lua            # death detection, killer cam, NUI bridge,
│                           #   damage polling, /deathlog /deathcamstyle
│                           #   /deathcamsettings /deathcamtest
├── server/
│   ├── main.lua            # kill event, death-log store, message
│   │                       #   store, identifier collection
│   └── discord.lua         # detailed embed builder + webhook POST
├── shared/
│   └── utils.lua           # Distance, Dbg, SanitizeMessage
└── ui/
    ├── src/
    │   ├── App.tsx         # HudA / HudB / SettingsPanel / DeathLogModal
    │   ├── App.css         # both designs + settings + log styling
    │   └── hooks/          # useNuiEvent, fetchNui
    └── html/               # vite build output (committed for releases)
```

## Events

### Client → Server

| Event | Payload | When |
|---|---|---|
| `ns-deathcam:server:reportDeath` | `killerServerId, weaponName, distance, headshot, hasar` | Right after death is detected. |
| `ns-deathcam:server:setMessage` | `rawMessage` (string) | Resource start + every settings save. |
| `ns-deathcam:server:requestDeathLog` | — | `/deathlog`. |

### Server → Client

| Event | Payload | When |
|---|---|---|
| `ns-deathcam:client:applyKillerExtras` | `{ message, ping }` | Answer to `reportDeath` for real-player killers. |
| `ns-deathcam:client:receiveDeathLog` | `entries` (array) | Answer to `requestDeathLog`. |

### NUI messages (Lua → React)

`DEATH_SHOW`, `DEATH_HIDE`, `KILLER_MESSAGE`, `KILLER_PING`,
`DESIGN_CHANGE`, `DEATHLOG_SHOW`, `DEATHLOG_HIDE`, `SETTINGS_SHOW`,
`SETTINGS_HIDE`.

### NUI callbacks (React → Lua)

`closeDeathLog`, `closeSettings`, `saveSettings` (`{ design, message }`).

## Notes

- **No exports.** ns-deathcam doesn't expose a cross-resource API yet.
  If you need to hook into kills from another resource, listen on
  `ns-deathcam:server:reportDeath` (or watch Discord — easier).
- **No SQL.** Death log and message store are in-memory. A server
  restart wipes both; clients re-push their message on resource start,
  but past deaths are gone.
- **Respawn is not handled here.** Whichever framework you run is the
  authority on resurrection. `isDead` is cleared on the first tick the
  player ped reports alive again.
- **Per-frame cam reassert.** The killer-cam thread re-asserts
  `SetCamActive` + `RenderScriptCams(true, false, 0, true, true)` on
  every frame. Removing this defeats the purpose — RedM framework
  death scenes call `RenderScriptCams(false)` repeatedly and will
  steal the camera otherwise. The `p4=true` argument matches the
  known-working ns-vineyard cam signature.
- **Damage events don't fire for AI in RedM.** All damage accounting
  uses 500 ms HP polling. The final lethal hit is closed out in the
  death branch using the last live `prevHp` reading.
- **Identifiers are collected server-side** (`GetPlayerIdentifier`)
  the moment the kill event fires. If a player disconnects before the
  death log is opened, their IDs are still cached in the entry.

## Support

- Discord: <https://discord.gg/UyyngemnF8>
