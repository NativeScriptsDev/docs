# ns-bounty-hunter

Cross-framework bounty hunter system for RedM: a Wanted Ledger (NUI), NPC + player + civilian bounty generation, sheriff posters, co-op posses, and persistent DB storage.

> **Discord:** https://discord.gg/UyyngemnF8 — support, bug reports, suggestions.

---

## Features

### Three bounty sources
- **NPC bounty** — the system auto-generates one every `Config.NpcInterval` (default 30 min); name/alias/ped/location are pulled at random from `Config.NpcBountyPool`.
- **Sheriff wanted** — players holding a job listed in `Config.SheriffJobs` issue crime-based wanted on real players. The treasury (state fund) covers the payout.
- **Civilian bounty** — any player can put a reward on another player out of their own pocket (`Config.MinCivilianBounty`–`MaxCivilianBounty`).

### Wanted Ledger (NUI)
- Opens with **G** at sheriff offices (`Config.OpenLedgerKey`); the same key works at bounty board props.
- Left page is the list, right page is the Wanted poster detail, with an ACCEPTED stamp animation.
- Tabs for creating sheriff wanted and civilian bounties (toggle with `Config.SheriffWantedEnabled` / `Config.CivilianBountyEnabled`).

### Mission flow
- After a bounty is accepted, a **search-area circle** (`Config.MissionAreaRadius`, default 180 m) is marked on the map.
- The target ped's spawn pattern (`camp` / `cabin` / `ambush`) determines enemy count and trigger radius.
- The target no longer burns at the campfire — it spawns away from the fire via `targetPropOffset` and is fire/explosion-proofed with `SetEntityProofs`.
- Alive / dead capture: `alive` mode requires hog-tie + loading onto a horse; `dead_or_alive` mode grants a **bonus reward** for bringing the target in alive (`Config.DeadOrAliveAliveBonusPct`, default 20%). An alive-only violation is penalized (`Config.AliveOnlyDeadPenaltyPct`, default 20%).

### Wanted region & last-seen blip
- For player/civilian bounties, the target's RDR3 region (state/district) is marked on the map as a **red wanted region** (`Config.WantedRegionEnabled`).
- `Config.WantedRegionGlobal = true` → everyone sees it; `false` → only the hunter + group.
- When the region is disabled, the legacy **last-seen point blip** flow runs instead (`Config.LastSeenBlipInterval`).

### Co-op posse
- The leader creates a group, invites members, and **sets percentage shares manually** (total 100%, minimum per member `Config.GroupShareMin`%).
- Max group size is `Config.MaxGroupSize`.
- An accepted bounty is processed on behalf of the group; each member's share is distributed automatically after capture.

### Sheriff posters
- Sheriffs place them with the `/poster` command; position/rotation is set with the `object_gizmo` resource.
- Persistent in the DB; limited by `Config.MaxPostersPerWanted` and `Config.MaxPostersTotalPerSheriff`.
- The placer or any other sheriff can tear it down.
- Optional: `Config.PosterRequireItem = true` → consumes a `poster_blank` inventory item.

### Persistence
- `oxmysql` via the NSLib SQL adapter. All bounties, crimes, posters, capture log and sheriff cooldowns live in the DB.
- Active/accepted bounties are kept in-memory in the server cache and refreshed as the DB is written.

---

## Installation

### 1. Dependencies
- `ns-lib` — framework adapter (auto-detects VORP / RSG-Core / RedEM:RP). Required.
- [`object_gizmo`](https://github.com/DemiAutomatic/object_gizmo) — position/rotation gizmo for poster placement. Required (for the poster feature). Free on GitHub. **Note:** it is a FiveM (GTA5) resource — adapt it to RedM before use: in object_gizmo's own `fxmanifest.lua` set `game 'rdr3'` and add an `rdr3_warning` line.
- `oxmysql` — used through NSLib SQL.
- `ns-notify` (optional) — falls back to `NSLib.Notify` when absent.

### 2. SQL migration
```bash
mysql -u <user> -p <db> < sql/install.sql
```
Tables: `bounty_targets`, `bounty_crimes`, `bounty_posters`, `bounty_capture_log`, `bounty_sheriff_cooldown`. For older installs, the idempotent `MigratePosterRotation` adds the `rot_x` / `rot_y` columns at runtime.

### 3. NUI (pre-built)
The interface ships ready-to-use in the `html/` folder — no build step is required to run the resource. To customize the UI, edit the React source in `ui/` and rebuild with `npm install && npm run build` (output is written to `html/`).

### 4. server.cfg
```
ensure ns-lib
ensure object_gizmo
ensure ns-notify          # optional
ensure ns-bounty-hunter
```

---

## In-game usage

### Sheriff
1. Stand inside a sheriff office → open the ledger with **G**.
2. Top tab: **Create Wanted** → pick target player ID, crime(s), capture mode → confirm.
3. The treasury covers the payout. The target player is notified automatically and a wanted region opens on the map.
4. To re-issue a wanted on the same target, wait out `Config.SheriffCreateCooldown` (default 60 min).

### Civilian player — posting a bounty
1. The **Create Bounty** tab in the ledger (if the toggle is on).
2. Target ID + reward amount + capture mode → charged from your pocket.
3. The target and hunters are notified.

### Hunter
1. Open the ledger → pick a bounty from the **Available** list → **Accept**.
2. A search area (large circle) appears on the map; enter it.
3. As you approach the trigger radius, enemies + the target spawn and a head blip appears.
4. Clear the enemies → the target either flees or holds position.
5. Capture: in **alive** mode lasso + hog-tie + load onto a horse; in **dead_or_alive** mode kill them or bring them in alive (for the bonus).
6. Enter within `Config.TurnInRange` (default 4 m) of a sheriff office → turn them in with **G**.

### Co-op
- The **Group** tab in the ledger: Create → Invite → the invited player gets a notification, opens their own ledger Group tab, and accepts the invitation there.
- The leader uses Set Shares to set share percentages (total 100%, min 10%).
- When the leader accepts a bounty, all members share the same mission; the payout is distributed by percentage at the end of the capture.

### Sheriff poster placement
1. Open the ledger → pick a wanted → the **Place Poster** tab.
2. Placement mode starts automatically (the same flow as the `/wantedposter` command); place the prop with `object_gizmo`.
3. ESC = confirm, BCKSP = cancel.
4. Players approaching a placed poster can view the detail with **G**; the sheriff or placer can remove it with **Tear Poster**.

---

## Chat commands

| Command | Side | Description |
|---|---|---|
| `/bountyledger` | client | Opens the ledger from anywhere (debug/test) |
| `/cancelbounty` | client | Cancel the currently accepted bounty |
| `/bountytarget` | client | Place a waypoint blip on the current target |
| `/wantedposter` | client | Enter poster placement mode (sheriff or authorized) |

The command name can be changed with `Config.PosterCommand`.

---

## Server exports

Callable from other resources via `exports['ns-bounty-hunter']:X(...)`.

| Export | Signature | Description |
|---|---|---|
| `getTreasury` | `() → integer` | State treasury balance |
| `depositTreasury` | `(amount: integer)` | Deposit money into the treasury (admin/economy event) |
| `forceNpcBounty` | `() → string\|nil` | Generate one NPC bounty, returns its ID |
| `getCacheSize` | `() → integer` | Number of active bounties in the server cache |

**Client exports:**
| Export | Signature | Description |
|---|---|---|
| `getGroupState` | `() → table\|nil` | The local player's group state |

---

## Key net events

> All events live under the `ns-bounty-hunter:` namespace. The ones useful for external integration are listed below.

**Triggered on the server (client → server):**
- `ns-bounty-hunter:server:characterReady` — must be called from the client when character selection completes (triggers state sync).
- `ns-bounty-hunter:server:acceptBounty(bountyId)` — accept a bounty.
- `ns-bounty-hunter:server:cancelBounty(bountyId, reason)` — cancel it.
- `ns-bounty-hunter:server:turnInTarget(bountyId, captureState, x, y, z, horseNet)` — turn in at the sheriff office.
- `ns-bounty-hunter:server:createPlayerWanted({ targetId, crimes, captureMode, portraitUrl })` — create a sheriff wanted.
- `ns-bounty-hunter:server:createCivilianBounty({ targetId, amount, captureMode, portraitUrl })` — create a civilian bounty.

**Triggered on the client (server → client):**
- `ns-bounty-hunter:client:bountyAccepted(b, isGroupMember)` — start the mission.
- `ns-bounty-hunter:client:bountyExpired(bountyId, reason)` — mission ended.
- `ns-bounty-hunter:client:wantedRegionOpen(hash)` / `Close(hash)` — toggle the region blip.
- `ns-bounty-hunter:client:ledgerNeedsRefresh` — refresh the NUI fetch.

For the full list, see the `RegisterNetEvent` calls in `server/callbacks.lua` and `client/*.lua`.

---

## Config guide

`config.lua` top-level groups:

### General & time
- `Config.Debug` (bool) — debug log/print
- `Config.BountyLifetime` (seconds) — how long an active bounty stays open in the DB
- `Config.ArchiveAfter` (seconds) — expired → archived transition
- `Config.ExpireCheckInterval` (seconds) — periodic cleanup tick

### NPC generation
- `Config.NpcInterval` — new bounty generation interval
- `Config.MaxActiveNpcBounties` — concurrent NPC bounty limit
- `Config.NpcBountyPool` — name/alias/ped/spawn-pattern/location pool
- `Config.NpcPortraits` — portraits (male/female)
- `Config.NpcSheriffNames` — random NPC sheriff names

### Crime system
- `Config.Crimes` — `{ key = { name, baseAmount, multiplierRange } }` dictionary
- Total reward = Σ (baseAmount × random[multiplierRange])

### Sheriff
- `Config.SheriffJobs` — job names allowed to create wanted (`{'police', 'sheriff', 'deputy', 'sheriff_chief', 'marshal'}`)
- `Config.SheriffCreateCooldown` (seconds) — per-target cooldown
- `Config.SheriffOffices` — ledger access points + npc offset/heading
- `Config.SheriffNpcModel` / `Config.SheriffNpcScenario` / `Config.SheriffNpcSpawnRadius` — sheriff ped behavior

### Bounty board
- `Config.BountyBoardInteractDistance` / `Config.BountyBoardInteractKey`
- `Config.BountyBoards` — placement list; each board carries `{ name, prop, pos = vector4(x,y,z,heading) }`. A board with pos at zero is not spawned; if `prop` is nil only a blip/prompt appears.

### Co-op
- `Config.MaxGroupSize` — max members
- `Config.GroupShareMin` — min share percentage per member
- `Config.GroupShareDefault` — `{ leader = 50 }` default; the rest is split evenly

### Spawn patterns
- `Config.SpawnPatterns.{camp,cabin,ambush}` — each is `{ propModel, baseEnemyCount, enemyModels, targetModel, formationRadius, triggerRadius }`
- Optional `targetPropOffset` — how many m the target ped spawns away from the prop (camp default 3.0)

### Capture
- `Config.AliveOnlyDeadPenaltyPct` — alive-only violation penalty %
- `Config.DeadOrAliveAliveBonusPct` — dead-or-alive bonus %
- `Config.TurnInRange` — turn-in distance to the sheriff office (m)
- `Config.HorseDistanceMax` — horse distance limit for alive turn-in (m)
- _Evidence item flow removed_ — the target ped is physically carried and turned in directly at the sheriff office (alive: hog-tied + loaded on a horse; dead: corpse carried).

### Poster
- `Config.PosterPropModel` — wanted poster prop
- `Config.MaxPostersPerWanted` / `Config.MaxPostersTotalPerSheriff` — limits
- `Config.PosterRequireItem` (bool) + `Config.PosterPlaceItem` (item name) — inventory constraint
- `Config.PosterInteractDistance` / `Config.PosterStreamDistance`
- `Config.PosterInteractKey` / `Config.PosterCommand`
- `Config.DefaultWantedImage` — fallback when there's no portrait (local file or URL)

### Ledger
- `Config.OpenLedgerPromptDistance` / `Config.OpenLedgerKey`

### Blip settings
- Sprite hashes: `BlipSheriffOffice`, `BlipMissionArea`, `BlipTargetHead`, `BlipEnemy`, `BlipDestOffice`, `BlipPosterPlaced`
- `Config.BlipDestOfficeScale` — turn-in office blip scale-up
- `Config.MissionAreaRadius` — search-area circle radius
- `Config.LedgerBlipZOffset` — sheriff office blip z offset

### Toggles
- `Config.SheriffWantedEnabled` — show/hide the sheriff tab
- `Config.CivilianBountyEnabled` — show/hide the civilian tab

### Civilian bounty
- `Config.MinCivilianBounty` / `Config.MaxCivilianBounty` — server-side clamp
- `Config.LastSeenBlipInterval` / `Config.LastSeenBlipDuration` — legacy blip flow
- `Config.PlayerBountyBlipRange` / `Config.PlayerBountyBlipInterval` — proximity coord blip

### Wanted region
- `Config.WantedRegionEnabled` — true = region flow, false = last-seen blip
- `Config.WantedRegionInterval` — recalculation interval (s)
- `Config.WantedRegionGlobal` — global or hunter-only
- `Config.WantedRegions` — region hash + center coordinate list (state/district/region)

### Message dictionary
- `Config.Messages` — all player-facing strings. Format strings use `%s`/`%d`.

---

## Database schema (summary)

| Table | Purpose |
|---|---|
| `bounty_targets` | All bounty records (npc/player/civilian). Status: active → accepted → closed/expired/archived |
| `bounty_crimes` | Crimes attached to each bounty (FK CASCADE) |
| `bounty_posters` | Placed poster positions + rotations (FK CASCADE) |
| `bounty_capture_log` | Payout audit log for closed bounties |
| `bounty_sheriff_cooldown` | Per-sheriff per-target cooldown table |

`status` lifecycle: `active` → `accepted` → `closed` (turn-in) / `expired` (timeout) / `archived` (old expired)

---

## NSLib dependency

All framework interaction goes through `ns-lib`. NSLib APIs this resource requires:

- `IsReady()` — bootstrap gate
- `GetIdentifier(src)`, `GetPlayer(src)`, `GetJob(src)`
- `AddMoney(src, amount, account)`, `RemoveMoney(src, amount, account)`, `GetMoney(src, account)`
- `AddItem(src, name, count, meta)`, `RemoveItem(src, name, count)`, `HasItem(src, name, count)`
- `RegisterUsableItem(name, cb)`
- `Notify(src, msg, type, duration)`
- `BlipCreate({...})`, `BlipCreateForEntity({...})`, `BlipRemove(blip)`, `BlipRemoveAll({...})`
- `PedLoadModel(model)`, `PedDelete(ped)`, `PedDeleteAll({...})`
- `Execute(sql, params)`, `QuerySingle(sql, params)`, `Query(sql, params)`

Framework swap: the NSLib adapter files (`ns-lib/adapters/vorp.lua`, etc.) change — this resource is untouched.

---

## Notes

- **Poster portraits** are set per wanted from a remote image URL (`portrait_url`), with `Config.DefaultWantedImage` as the fallback. The poster is rendered through the in-game NUI overlay.

---

## Support

Questions, bug reports and suggestions — join the Discord: https://discord.gg/UyyngemnF8
