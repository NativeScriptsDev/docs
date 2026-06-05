# ns-poster

Designable, syncable in-world posters for RedM. Players open a NUI editor to
compose a poster (text + images, presets, custom backgrounds), then place it
as an interactive prop anywhere in the world. Nearby players see the prop,
press `G` to inspect the full design, can **like** posters, **report** bad
ones, and owners can **renew** them before they auto-expire. Admins get a
moderation queue with one-click teleport. Cross-framework via
[ns-lib](https://nativescriptsdev.github.io/docs/scripts/ns-lib).

> **Discord:** https://discord.gg/UyyngemnF8 — support, bug reports, feedback.

---

## Features

### Designer (NUI)
- 4 built-in presets — **Wanted Poster**, **Newspaper Page**, **Classified Ad**,
  **Custom (blank canvas)**.
- Drag / resize / rotate text and image elements on a 600×800 (3:4) canvas.
- 4 fonts shipped: Rye (western), IM Fell English (serif), Inter (sans),
  Special Elite (typewriter).
- 8 image filters: None, Sepia, Wanted, Noir, B&W, Vintage, Faded, Cold.
- Image sources: built-in asset library + whitelisted-domain URLs.
- Custom backgrounds: library, https URL, or solid color.
- Undo/redo via design history.
- Save your own composition as a personal preset (`Config.MaxPresetsPerPlayer`).

### Placement
- Uses [object_gizmo](https://github.com/DemiAutomatic/object_gizmo) for full 3D
  position + rotation control while placing.
- Ghost prop is local-only; the canonical networked prop is spawned by the
  server on confirm — no duplicates.
- Cancel returns the player to the designer with the in-progress design intact.

### World + sync
- Distance-based streaming — props spawn at `Config.StreamDistance` (100m),
  despawn beyond `Config.UnstreamDistance` (120m), hard cap
  `Config.MaxActivePerClient` (30).
- Map blip per poster (single sprite, single name) — toggle with
  `Config.UseBlips`.
- `/posters` opens a list with GPS waypoint to any placed poster.
- Walk up to a poster, press **G** to open the inspect view.

### Social
- **Likes** — one per player per poster, rate-limited
  (`Config.LikeCooldown`). Owners can be blocked from liking their own
  (`Config.AllowSelfLike`).
- **Reports** — players flag offensive content with a reason.
  Per-identifier global cooldown (`Config.ReportCooldown`) plus a per-poster
  duplicate guard — you can't reopen a report on the same poster until an
  admin dismisses or resolves the previous one.

### Expiration (TTL)
- Posters auto-expire after `Config.PosterTtl` (default 7 days). Set to `0`
  to disable.
- Owners renew from the inspect screen — adds `Config.RenewExtension` from
  *now*, so frequent renewals don't accumulate. Per-identifier rate limit
  via `Config.RenewCooldown`.
- Server runs an expiry sweep every `Config.ExpirySweepTick` (default 1h)
  and broadcasts removal to all clients.

### Admin moderation
- `/posterreports` opens the report queue (server gates by ACE
  `Config.AdminAce`, default `ns-poster.admin`).
- One-click **teleport** to the reported poster.
- Dismiss / resolve / remove actions; report state is tracked in DB.
- Optional Discord webhook log when an admin teleports.

### Discord webhook (server-only)
- Set `Config.DiscordWebhook`, then toggle per-event:
  - `DiscordLogPlace` — poster placed.
  - `DiscordLogRemove` — poster removed (off by default; noisy).
  - `DiscordLogReport` — new report submitted.
  - `DiscordLogExpired` — auto-expiry sweep (off by default; noisy).
  - `DiscordLogAdminTeleport` — admin teleported from the report queue.
- Empty webhook URL disables **all** logging, regardless of toggles.

### Persistence
- Two backends, switched at runtime via `Config.UseMySQL`:
  - **oxmysql** (default) — `Config.UseMySQL = true`.
  - **JSON files** — `Config.UseMySQL = false`, written to `server/data/`.
    Autosaved on dirty with `Config.AutoSaveInterval` (60s).
- Cross-framework via the ns-lib SQL adapter (works against the framework's
  configured DB resource).

---

## Requirements

| Resource | Required | Purpose |
|---|---|---|
| [ns-lib](https://nativescriptsdev.github.io/docs/scripts/ns-lib) | ✅ | Framework adapter (VORP / RSG-Core / RedEM:RP auto-detect) |
| [object_gizmo](https://github.com/DemiAutomatic/object_gizmo) | ✅ | 3D placement gizmo. FiveM resource — adapt to RedM first (set `game 'rdr3'` + add `rdr3_warning` in its fxmanifest) |
| `oxmysql` | optional | Only if `Config.UseMySQL = true` |
| Node.js + npm | optional | Only for rebuilding the NUI |

---

## Installation

1. Drop the `ns-poster` folder into your server's `resources/` directory.

2. Add to `server.cfg` **after** ns-lib + object_gizmo:
   ```
   ensure ns-lib
   ensure object_gizmo
   ensure ns-poster
   ```

3. (Optional) grant admin moderation access:
   ```
   add_ace group.admin ns-poster.admin allow
   ```

4. (Optional, MySQL mode — default) `Config.UseMySQL = true` requires the
   `ns_poster_*` tables. Two install paths:
   - **Auto:** tables auto-create on first boot via `CREATE TABLE IF NOT
     EXISTS` in `server/db.lua`. No action needed.
   - **Manual (recommended for production):** import
     [`sql/install.sql`](sql/install.sql) before starting the resource.

5. (Optional) populate `Config.AllowedImageDomains` — empty by default, so
   only the built-in asset library is usable until you whitelist hosts.

---

## Commands & keys

| Action | How | Notes |
|---|---|---|
| Open designer | `/poster` | |
| Open posters list (with GPS waypoint) | `/posters` | |
| Open admin report queue | `/posterreports` | Server gates by ACE; non-admins get a silent no-op |
| Inspect a poster | Walk up, press `G` | Like / report / renew from this view |
| **Placement gizmo** (after pressing **Place** in designer) | `W` move, `R` rotate, `LAlt` snap to ground, `Esc` confirm, `Backspace` cancel | Driven by object_gizmo |

---

## Configuration

All settings live in [`config.lua`](config.lua). Highlights:

### Storage
| Key | Default | Notes |
|---|---|---|
| `UseMySQL` | `true` | `false` → JSON files in `server/data/` |
| `AutoSaveInterval` | `60` | seconds; JSON mode autosave when dirty |

### Streaming + limits
| Key | Default | Notes |
|---|---|---|
| `StreamDistance` / `UnstreamDistance` | `100` / `120` | meters (hysteresis) |
| `StreamTick` | `500` | ms between stream checks |
| `MaxActivePerClient` | `30` | hard cap on simultaneous spawned props |
| `PlaceCooldown` | `60` | seconds between placements (per player) |
| `MaxPostersPerPlayer` | `5` | cap per identifier |
| `MaxTextElements` | `12` | per design |
| `MaxImageElements` | `6` | per design |
| `MaxTextLength` | `280` | per text element |
| `MaxPayloadBytes` | `32 KB` | serialized JSON size limit |
| `MaxPresetsPerPlayer` | `10` | personal saved presets |

### Placement
| Key | Default | Notes |
|---|---|---|
| `DefaultProp` | `p_cs_advertposter01x` | |
| `AllowedProps` | 3 props | `p_cs_advertposter01x`, `p_gen_posterwanted05x`, `p_poster_troub01x_lrg` |
| `PlacementMaxDistance` | `5.0` | server-side anti-teleport clamp |
| `PlacementMinDistance` | `0.5` | minimum distance from player |
| `PlacementStartOffset` | `2.0` | ghost spawn distance in front of player |

### Blip
| Key | Default | Notes |
|---|---|---|
| `UseBlips` | `true` | `false` → no blips; players discover posters by walking into them |
| `BlipSpriteName` | `blip_wanted_poster` | resolved with `GetHashKey` at runtime |
| `BlipName` | `'Poster'` | |
| `BlipScale` | `0.2` | |

### Interact
| Key | Default | Notes |
|---|---|---|
| `InteractKey` | `0x760A9C6F` | `INPUT_INTERACT_OPTION1` = `G` |
| `InteractDistance` | `2.5` | meters |
| `InteractTick` | `250` | ms between proximity checks |

### Expiration + renew
| Key | Default | Notes |
|---|---|---|
| `PosterTtl` | `7 days` | `0` = posters never expire |
| `RenewExtension` | `7 days` | added from *now* per renew click |
| `RenewCooldown` | `30` | seconds per identifier |
| `ExpirySweepTick` | `3600` | seconds between cleanup sweeps |

### Social
| Key | Default | Notes |
|---|---|---|
| `AllowSelfLike` | `false` | owners can/can't like their own posters |
| `LikeCooldown` | `5` | seconds per identifier |
| `ReportCooldown` | `180` | seconds per identifier between any two reports |
| `MaxReportReasonLength` | `200` | chars |

### Permission + whitelist
| Key | Default | Notes |
|---|---|---|
| `AdminAce` | `ns-poster.admin` | ACE that overrides ownership for removal + report queue |
| `AllowCustomSignature` | `false` | `true` → users can override the "Posted by" text |
| `AllowedImageDomains` | `{}` (empty) | https hosts allowed for image URLs. Prefix with `.` for subdomain wildcard (e.g. `.imgur.com`) |

### Discord webhook (server-only)
| Key | Default | Notes |
|---|---|---|
| `DiscordWebhook` | `''` | Empty disables **all** webhook logging |
| `DiscordUsername` | `'ns-poster'` | |
| `DiscordAvatarUrl` | `''` | Optional |
| `DiscordLogPlace` | `true` | |
| `DiscordLogRemove` | `false` | Noisy on busy servers |
| `DiscordLogReport` | `true` | |
| `DiscordLogExpired` | `false` | Noisy |
| `DiscordLogAdminTeleport` | `true` | Logged with admin name + report id |

---

## Building the NUI

Pre-built output ships in `html/`. Only rebuild if you change anything under
`ui/`.

```
cd scripts/ns-poster/ui
npm install
npm run build
```

The build emits to `../html/` and regenerates the library manifest from
files in `library/`.

### Asset library

The designer references SVGs (PNG also accepted) under:

```
library/backgrounds/  parchment.svg, newspaper.svg, wanted_aged.svg,
                      white_paper.svg, dark_wood.svg, vintage_yellow.svg,
                      wanted-poster-bg.svg
library/decorations/  skull.svg, star.svg, frame_ornate.svg, eagle.svg,
                      dollar.svg, wanted_stamp.svg
```

These are placeholders — drop your own art in. The picker entries are
**auto-generated** by `ui/scripts/gen-library-manifest.mjs` on every build,
so you only need to add files and run `npm run build` (or `npm run
gen-library` manually).

---

## Security model

- Server is authoritative — every place / remove / save-preset / like /
  report / renew / resolve-report goes through `shared/schema.lua` validation,
  payload-size cap, image-URL whitelist, and (for remove/renew)
  ownership/ACE check.
- Placement coordinates are clamped to within `Config.PlacementMaxDistance`
  of the requesting player (anti-teleport).
- React renders all user text via `{value}` (not `dangerouslySetInnerHTML`),
  so HTML injection cannot reach the DOM.
- Image URLs must be `https://` and the host must match
  `Config.AllowedImageDomains`. Subdomain wildcards: prefix entry with `.`
  (e.g. `.imgur.com` matches `i.imgur.com`).
- All ACE checks and ownership comparisons run server-side; `/posterreports`
  is a no-op for non-admins (server never replies).
- Per-identifier rate limits on likes, reports, and renews prevent client
  hammering.

---

## Exports

All exports take a real player `source`. `source = 0` (console) is rejected
so a buggy/malicious peer resource can't bypass ownership.

```lua
-- Placement & lifecycle
exports['ns-poster']:placePoster(source, { design = {...}, world = { coords, heading, model } })
exports['ns-poster']:removePoster(source, posterId)
exports['ns-poster']:renewPoster(source, posterId)
exports['ns-poster']:getAllPosters()           -- read-only snapshot

-- Social
exports['ns-poster']:likePoster(source, posterId)
exports['ns-poster']:reportPoster(source, posterId, reason)

-- Moderation (require Config.AdminAce)
exports['ns-poster']:listReports(source, filterStatus)         -- 'open' | 'resolved' | 'dismissed' | nil (all)
exports['ns-poster']:resolveReport(source, reportId, action)   -- 'dismiss' | 'resolve' | 'remove'
```

---

## Roadmap

- v0.2 — Snap-to-wall placement (shape test against surfaces).
- v0.2 — Optional "publish preset" so admins can share presets server-wide.
- v0.3 — Per-poster view counter + simple analytics export.
