# ns-lib

Cross-framework abstraction layer for RedM resources. One dependency line, then every script you ship runs unchanged on **VORP**, **RSG-Core**, or **RedEM:RP** — and uses whichever inventory, SQL driver, and notification system happens to be installed.

| Capability | Supported |
|---|---|
| **Frameworks** | `vorp_core` · `rsg-core` · `redemrp_base` (auto-detected) |
| **Inventory** | `ox_inventory` · `vorp_inventory` · `rsg-inventory` · `redemrp_inventory` |
| **SQL** | `oxmysql` · `mysql-async` (legacy) |
| **Notify** | `ns-notify` → `okokNotify` → `pNotify` → `ox_lib` → framework-native → chat fallback |
| **Discord** | Shared bot for every dependent script — no per-script HTTP duplication |
| **In-world helpers** | `Blip`, `Ped`, `Teleport` declarative wrappers |
| **Version** | `1.3.2` |

> Support & community: [discord.gg/UyyngemnF8](https://discord.gg/UyyngemnF8)

---

## 1. Setup

### 1.1 Install

1. Drop this resource into your `resources/` folder as `ns-lib`.
2. In `server.cfg`, ensure ns-lib **before** any script that depends on it:
   ```
   ensure ns-lib
   ensure ns-poster        # or any ns-* script
   ```
3. (Optional) Configure Discord — see [§6](#6-discord-server-only).
4. Restart. On a healthy boot you should see:
   ```
   [ns-lib] v1.3.2 initializing...
   [ns-lib] framework=rsg | inventory=ox | sql=oxmysql
   [ns-lib] adapters loaded ✓
   [ns-lib] discord helpers enabled (guild=...)     -- or "idle" if not configured
   ```

If detection fails (no framework or no SQL driver), ns-lib **stops itself** with a loud red error. Fix the missing dependency and restart.

### 1.2 Wire it into a dependent script

In your script's `fxmanifest.lua`:

```lua
dependency 'ns-lib'

shared_scripts { 'config.lua', 'shared/*.lua' }
client_scripts { 'client/*.lua' }
server_scripts { 'server/*.lua' }
```

That's it. No `@-import` needed — exports + global namespace are available as soon as ns-lib has started.

---

## 2. Two ways to call ns-lib

Both patterns work. **Project convention is `exports['ns-lib']:Func(...)`** because it's stable regardless of resource load order and shows in tooling as a real cross-resource call. The `NSLib.X` global is also wired up (it lives in `shared/api.lua` and runs in every dependent resource) — handy in one-liners.

```lua
-- Exports (recommended)
local identifier = exports['ns-lib']:GetIdentifier(source)
exports['ns-lib']:Notify(source, 'Welcome', 'success')

-- Global (equivalent)
local identifier = NSLib.GetIdentifier(source)
NSLib.Notify(source, 'Welcome', 'success')
```

Mixed code is fine; both surfaces hit the same adapters. The complete export list is in [§4.10](#410-export-surface).

---

## 3. Boot sequence

```
1. ns-lib starts (server)
   ├─ shared/version.lua, types.lua, utils.lua, api.lua, blip.lua, ped.lua, teleport.lua
   │     → NSLib.* defined as "not implemented" stubs + helper modules
   ├─ server-config.lua reads convars (Discord)
   ├─ server/detect.lua scans GetResourceState(...)
   │     → picks framework, inventory, sql
   │     → loads adapters/<kind>/<name>.lua into NSLib._fw / _inv / _db
   ├─ adapter Init() hooks run (binds Core handles, registers framework events)
   ├─ NSLib.ready = true
   ├─ TriggerEvent('ns-lib:ready', { framework, inventory, sql, version })
   └─ Already-connected players receive 'ns-lib:client:info'

2. Dependent script starts (any time after step 1)
   └─ Calls exports['ns-lib']:X(...) or NSLib.X(...) freely

3. A player connects / spawns
   ├─ Framework's own "loaded" event fires
   ├─ Adapter fans out into NSLib._events.playerLoaded
   ├─ NSLib.OnPlayerLoaded(...) callbacks run
   ├─ TriggerEvent('ns-lib:playerLoaded', source, player)   -- proxy event
   └─ TriggerClientEvent('ns-lib:client:info', source, ...) -- pushes detection info to client
```

If your script needs to wait for ns-lib readiness (rare):

```lua
AddEventHandler('ns-lib:ready', function(info)
    -- info = { framework, inventory, sql, version }
end)

-- or polling:
while not exports['ns-lib']:IsReady() do Wait(50) end
```

---

## 4. API reference

### 4.1 Player

```lua
exports['ns-lib']:GetPlayer(source)       -- → Player | nil
exports['ns-lib']:GetIdentifier(source)   -- → "steam:..." | "license:..." (raw account id)
exports['ns-lib']:GetAllPlayers()         -- → Player[]
exports['ns-lib']:IsLoaded(source)        -- → bool
```

`Player.identifier` is always the raw `steam:xxx` / `license:xxx` — **not** VORP's slot index. For the character primary key, use `Player.charId`:

| Framework | `charId` source |
|---|---|
| VORP | `char.charIdentifier` (1, 2, 3…) |
| RSG | `PlayerData.citizenid` |
| RedEM:RP | `user:getIdentifier()` |

`Player` shape (see `shared/types.lua`):

```lua
{
    source     = 5,
    identifier = 'license:abc...',
    charId     = 1,                -- or 'ABC12345' on RSG
    steam      = 'license:abc...', -- alias kept for back-compat
    name       = 'John Marston',
    money      = { cash = 100, bank = 0, gold = 5, rol = 0 },
    job        = { name = 'sheriff', grade = 2, label = 'Sheriff' },
    group      = 'admin',          -- maps to VORP char.group / RSG permission / RedEM user:getGroup()
    _raw       = { ... },          -- escape hatch to the underlying framework object
}
```

### 4.2 Money

```lua
exports['ns-lib']:GetMoney(source, type)          -- type: 'cash' | 'bank' | 'gold' | 'rol'
exports['ns-lib']:AddMoney(source, type, amount)
exports['ns-lib']:RemoveMoney(source, type, amount)
```

VORP only exposes `cash`, `gold`, `rol` — `bank` reads as 0 and writes are no-ops.

### 4.3 Inventory

```lua
exports['ns-lib']:AddItem(source, name, count, metadata?)
exports['ns-lib']:RemoveItem(source, name, count, metadata?)
exports['ns-lib']:GetItemCount(source, name)
exports['ns-lib']:HasItem(source, name, count?)     -- count defaults to 1
exports['ns-lib']:GetInventory(source)              -- → Item[]
exports['ns-lib']:RegisterUsableItem(name, cb)      -- cb(source, payload?)
exports['ns-lib']:CanCarry(source, name, count)
```

Inventory resolution order: `ox_inventory` → `vorp_inventory` → `rsg-inventory` → `redemrp_inventory`. If none are running, ns-lib falls back to the framework's built-in adapter (`inventory = 'framework'` resolves to `adapters/inventory/<framework>.lua`).

ns-lib does **not** auto-register items — each dependent script's README lists items it needs. Add them manually to your framework's item DB:

- `ox_inventory/data/items.lua`
- `vorp_inventory` SQL `items` table
- `rsg-core/shared/items.lua`

### 4.4 Job

```lua
exports['ns-lib']:GetJob(source)                  -- → { name, grade, label }
exports['ns-lib']:SetJob(source, name, grade)
exports['ns-lib']:HasJob(source, name, minGrade?) -- → bool
```

### 4.5 Database (hybrid sync / async)

Pass a callback for async, omit it for sync (waits via `Citizen.Await` — must be called inside a coroutine: `CreateThread`, event handler, command).

```lua
-- Sync (blocks current coroutine)
local rows = exports['ns-lib']:Query('SELECT * FROM players WHERE id = ?', { id })

-- Async (callback)
exports['ns-lib']:Query('SELECT * FROM players', {}, function(rows)
    print(#rows)
end)

exports['ns-lib']:QuerySingle(sql, params, cb?)  -- single row
exports['ns-lib']:Scalar(sql, params, cb?)       -- first column of first row
exports['ns-lib']:Execute(sql, params, cb?)      -- → affected rows
exports['ns-lib']:Insert(sql, params, cb?)       -- → insertId
```

Adapter resolution: `oxmysql` if started, else `mysql-async`. Both expose the same five methods.

### 4.6 Notify

```lua
-- Server: targets a player
exports['ns-lib']:Notify(source, message, type, duration?)

-- Client: shows to the local player
exports['ns-lib']:Notify(message, type, duration?)
-- type: 'success' | 'error' | 'info' | 'warning'  (duration in ms, default 4000)
```

Resolution chain (first match wins, re-resolves when a notification provider starts/stops):

1. **Dedicated notification scripts** in priority order: `ns-notify`, `okokNotify`, `pNotify`
2. `ox_lib` (`ox_lib:notify` event — RSG-Core is also caught here, since rsg-core hard-depends on ox_lib)
3. Framework-native: `vorp:TipRight` / `redem_roleplay:Tip`
4. Game-native chat (last resort)

To add a custom provider, edit `client/notify.lua` `NOTIFY_PROVIDERS` table.

### 4.7 Permissions (server-only)

Three-layer resolution: console (`source = 0`) → CFX `ace` (any in `NSLib.AdminAces`) → framework `Player.group` ∈ `NSLib.AdminGroups`.

```lua
exports['ns-lib']:IsAdmin(source)              -- any AdminAces ACE OR Player.group ∈ AdminGroups
exports['ns-lib']:HasGroup(source, 'mod')      -- group.mod OR Player.group == 'mod'
exports['ns-lib']:HasAce(source, 'command.ban')  -- shortcut around IsPlayerAceAllowed (console = true)
```

`IsAdmin` does not assume `'group.admin'` — different cores wire ACE names differently. RSG-Core boots with `add_ace rsgcore.god god allow` (so `IsPlayerAceAllowed(src, 'god')` returns true for admins). The default `AdminAces` covers common cases:

```lua
NSLib.AdminAces   = { 'group.admin', 'admin', 'god', 'owner' }
NSLib.AdminGroups = { admin = true, superadmin = true, owner = true, god = true }
```

Extend at runtime:

```lua
NSLib.AdminGroups['supporter']       = true
NSLib.AdminAces[#NSLib.AdminAces+1]  = 'staff'
```

Where `Player.group` comes from per framework:

| Framework | `group` source |
|---|---|
| VORP | `char.group` |
| RSG | `PlayerData.permission` |
| RedEM:RP | `user:getGroup()` |

### 4.8 Teleport

One-shot teleport with screen fade and ground-snap. Coordinates accept `vector3`, `vector4`, or `{ x, y, z, h?/w? }`. Mounts, wagons, and boats follow the player automatically.

Outdoor destinations use the engine's baked heightmap (`GetHeightmapBottomZForPosition`) to find the surface without waiting for the streaming pipeline. Interiors auto-detect via `GetInteriorAtCoords` and skip the heightmap snap so the player lands on the floor instead of the roof.

```lua
-- CLIENT (teleport self)
exports['ns-lib']:Teleport(vector4(-178.5, 631.5, 113.5, 90.0))

exports['ns-lib']:Teleport(vector3(2641.5, -1037.4, 47.5), {
    heading  = 180.0,
    fade     = true,    -- screen fade (default true)
    fadeMs   = 500,
    interior = nil,     -- nil = auto-detect | true = force | false = force outdoor
})

-- SERVER (teleport another player — fires 'ns-lib:client:teleport' on target)
exports['ns-lib']:TeleportPlayer(targetSrc, vector4(2641.5, -1037.4, 47.5, 180.0))
```

### 4.9 Blip (RedM, client-only)

Declarative wrapper over `BlipAddForCoords` / `BlipAddForEntity` / `BlipAddForRadius`. String hash names (e.g. `'blip_ambient_sheriff'`) are auto-`joaat`'d.

```lua
-- Static map marker
local b = exports['ns-lib']:BlipCreate({
    coords        = vector3(-178.5, 631.5, 113.5),
    sprite        = `blip_ambient_sheriff`,
    name          = 'Valentine Sheriff',
    scale         = 0.9,
    extraModifier = `BLIP_MODIFIER_LAW_DEFAULT`,
})

-- Attached to an entity (moves with the ped/horse/vehicle)
local headBlip = exports['ns-lib']:BlipCreateForEntity({
    entity = somePed,
    sprite = `blip_ambient_bounty_target`,
    name   = 'Wanted Outlaw',
})

-- Radius circle on the map ("search area")
local areaBlip = exports['ns-lib']:BlipCreateRadius({
    coords = vector3(2641.5, -1037.4, 47.5),
    radius = 180.0,
    sprite = `blip_mission_area_bounty`,
})

-- Update / extend / remove
exports['ns-lib']:BlipUpdate(b, { name = 'New Name', scale = 1.2, flashes = true })
exports['ns-lib']:BlipAddModifier(b, `BLIP_MODIFIER_USE_HEADING_INDICATOR`)
exports['ns-lib']:BlipRemove(b)                  -- nil-safe
myBlips = exports['ns-lib']:BlipRemoveAll(myBlips)
```

All `BlipCreate*` opts: `coords`, `entity`, `radius`, `sprite`, `name`, `scale`, `modifier`, `extraModifier`, `extraModifiers`, `colour`, `flashes`, `shortRange`, `priority`. Default creation modifier is `BLIP_STYLE_CREATOR_DEFAULT` — the value RSG-Core's own scripts use; works across builds where other modifier hashes silently fail.

### 4.10 Ped (RedM, client-only)

```lua
-- Static NPC (vendor, quest giver, …)
local vendor = exports['ns-lib']:PedSpawn({
    model         = `cs_mp_jackmarston`,
    coords        = vector4(-178.5, 631.5, 113.5, 90.0),
    freeze        = true,
    invincible    = true,
    blockEvents   = true,
    noFlee        = true,
    noTarget      = true,
    placeOnGround = true,
})

-- Hostile / target ped
local enemy = exports['ns-lib']:PedSpawn({
    model   = `g_m_m_unidustergang_01`,
    coords  = pos,
    heading = math.random(0, 359) + 0.0,
    weapon  = `WEAPON_REVOLVER_CATTLEMAN`,
    ammo    = 100,
})

exports['ns-lib']:PedUpdate(vendor, { freeze = false, invincible = false })
exports['ns-lib']:PedDelete(vendor)
myEnemies = exports['ns-lib']:PedDeleteAll(myEnemies)

-- Just load a model (e.g. for CreateObject)
if exports['ns-lib']:PedLoadModel(`p_campfire01x`, 5000) then
    -- ...
end
```

Spawn opts: `model`, `coords` (vector3/vector4/table), `heading`, `network`, `mission`, `freeze`, `invincible`, `health`, `blockEvents`, `noFlee`, `noTarget`, `noRagdoll`, `relationGroup`, `weapon`, `ammo`, `placeOnGround`, `releaseModel`, `loadTimeoutMs`, `spawnTimeoutMs`, `streamWaitMs`. `_SET_RANDOM_OUTFIT_VARIATION` is called automatically — RedM peds spawn naked without it.

> **Client-only.** These natives don't exist on the server. Use `TriggerClientEvent` to reach a player.

### 4.11 Export surface

Complete list (mirrors of every NSLib API — call via `exports['ns-lib']:Func(...)`):

**Server (`server/exports.lua`):**

```
Player   : GetPlayer, GetIdentifier, GetAllPlayers, IsLoaded
Money    : GetMoney, AddMoney, RemoveMoney
Job      : GetJob, SetJob, HasJob
Inventory: AddItem, RemoveItem, GetItemCount, HasItem, GetInventory,
           RegisterUsableItem, CanCarry
Database : Query, QuerySingle, Scalar, Execute, Insert
Notify   : Notify
Perms    : IsAdmin, HasGroup, HasAce
Teleport : TeleportPlayer
Discord  : GetDiscordId, GetDiscordRoles
Info     : GetInfo, GetFramework, GetVersion, IsReady,
           GetDiscordEnabled, RequireMinVersion
```

**Client (`client/exports.lua`):**

```
Notify        : Notify(msg, type, duration)
Teleport      : Teleport(coords, opts)
Info          : GetFramework
Blip          : BlipCreate, BlipCreateRadius, BlipCreateForEntity,
                BlipUpdate, BlipAddModifier, BlipRemove, BlipRemoveAll
Ped           : PedLoadModel, PedSpawn, PedUpdate, PedDelete, PedDeleteAll
```

---

## 5. Events

Proxy events fired by every framework adapter — no need to import the lib:

```lua
AddEventHandler('ns-lib:ready',         function(info) end)                 -- {framework, inventory, sql, version}
AddEventHandler('ns-lib:playerLoaded',  function(source, player) end)       -- post-spawn, full Player object
AddEventHandler('ns-lib:playerLogout',  function(source) end)               -- disconnect (any cause)
AddEventHandler('ns-lib:jobChange',     function(source, newJob) end)       -- {name, grade, label}
```

Equivalent NSLib subscriptions (with the lib's global):

```lua
NSLib.OnPlayerLoaded(function(source, player) end)
NSLib.OnPlayerLogout(function(source) end)
NSLib.OnJobChange(function(source, newJob) end)
```

Client side: `ns-lib:playerLoaded` is **not** retransmitted to the client (player object is server-only). Use `'ns-lib:client:info'` if you need framework/inventory/sql names client-side:

```lua
AddEventHandler('ns-lib:client:info', function(info)
    -- info = { framework, inventory, sql, version }
end)
```

---

## 6. Discord (server-only)

Bot token + guild ID are read from **server convars** — set them once in `server.cfg` and every dependent script gets Discord access for free. The token stays out of git and never reaches the client.

### 6.1 API

```lua
exports['ns-lib']:GetDiscordId(source)
-- → "315214743864344586" or nil if the player hasn't linked Discord to their CFX account.

exports['ns-lib']:GetDiscordRoles(source, function(roleIds, err)
    -- roleIds : array of role-ID strings (snowflakes); [] when not in guild or err set
    -- err     : nil | 'no_discord_id' | 'auth' | 'parse' | 'network' | 'http_<status>' | 'disabled'
end)
```

Role results are **cached for 60s** per Discord user ID to stay within Discord's rate limit on busy servers.

### 6.2 Setup checklist

1. **Create a bot:** https://discord.com/developers/applications → New Application → Bot → Reset Token
2. **Enable "Server Members Intent"** under Bot → Privileged Gateway Intents (REQUIRED — without it `body.roles` is missing).
3. **Invite the bot:** OAuth2 → URL Generator → scope `bot`, perm `Read Messages` → open the URL → add to your guild.
4. Discord Settings → Advanced → enable Developer Mode.
5. Right-click your server → Copy Server ID.
6. Add convars to `server.cfg` (use `set`, **NOT** `setr` — `set` keeps them server-only):

   ```cfg
   set ns_lib_discord_enabled "true"
   set ns_lib_discord_token   "YOUR_BOT_TOKEN"
   set ns_lib_discord_guild   "YOUR_GUILD_ID"
   ```

> **⚠️ Token paranoia.** If you use `setr` instead of `set`, the token replicates to every client at connect time. ns-lib detects this at boot and prints a loud red warning. Always use `set`.

After restart, if `Enabled=true` but either secret is missing, ns-lib prints:

```
[ns-lib] Discord enabled but ns_lib_discord_token / ns_lib_discord_guild not set in server.cfg — Discord helpers will fail.
```

To disable Discord entirely: `set ns_lib_discord_enabled "false"`.

### 6.3 Mapping role IDs

The library returns *raw* role IDs. Each script decides how to map them to its own role-key vocabulary.

```lua
-- your_script/config.lua
Config.Roles = {
    member = '1089999246914232381',
    vip    = '1324526243689009236',
}

local function MapRoles(rawIds)
    local found = {}
    for _, id in ipairs(rawIds) do
        for key, configured in pairs(Config.Roles) do
            if id == configured then found[key] = true end
        end
    end
    return found
end

exports['ns-lib']:GetDiscordRoles(source, function(roles, err)
    if err == 'no_discord_id' then
        return exports['ns-lib']:Notify(source, 'Link your Discord first', 'error')
    elseif err then
        return exports['ns-lib']:Notify(source, 'Discord check failed: ' .. err, 'error')
    end
    local has = MapRoles(roles)
    if has.vip then -- grant VIP perks
    end
end)
```

### 6.4 Notes

- A **404** (player isn't in the guild) returns `err = nil, roles = {}` — not an error. Treat empty `roles` as "no privileges".
- The HTTP request is async; `GetDiscordRoles` always uses a callback. No sync wrapper.
- The 60s cache is per-Discord-ID; role changes show up at most 60s later.

---

## 7. Admin & versioning

```
/lib-status      -- dump detected adapters and listener counts (ACE: command.lib-status or group.admin)
/bridge-test     -- run a smoke test against your own account (GetPlayer, money, job)
```

Pin a minimum major version in your script's init code:

```lua
exports['ns-lib']:RequireMinVersion(1)  -- errors if NSLib.VERSION < 1.x
```

---

## 8. Usage example

```lua
-- server/main.lua
AddEventHandler('ns-lib:playerLoaded', function(source, player)
    print(('Player loaded: %s (%s)'):format(player.name, player.identifier))
end)

local function GiveWine(source, quality)
    local lib = exports['ns-lib']
    if not lib:HasItem(source, 'empty_bottle', 1) then
        return lib:Notify(source, 'You need an empty bottle', 'error')
    end
    lib:RemoveItem(source, 'empty_bottle', 1)
    lib:AddItem(source, 'wine', 1, { quality = quality })
    lib:Notify(source, 'Wine bottled', 'success')
end
```

---

## 9. Caveats

- **No standalone fallback.** ns-lib requires one of the supported frameworks. If none is detected at startup, the resource errors out and stops.
- **No item auto-registration.** Each dependent script's README lists what it needs.
- **Hot reload.** Restarting `ns-lib` invalidates adapter state in dependent scripts that called `Init` hooks. **Restart all dependent scripts** after restarting ns-lib.
- **Client mutating calls.** Calling a server-only function from the client (e.g. `NSLib.AddItem` on the client VM) raises a clear error — use `TriggerServerEvent` from the client instead.
- **`ox_inventory` `RegisterUsableItem`.** ns-lib uses the `usingItem` hook with `itemFilter`. Re-registering the same item name overwrites the callback (warning logged); old hook is **not** removed.

---

## 10. Repository layout

```
ns-lib/
├── fxmanifest.lua              # game 'rdr3', server/client/shared split, escrow_ignore { server-config }
├── server-config.lua           # Discord convar reader (server-only, never replicated)
├── shared/
│   ├── version.lua             # NSLib.VERSION + RequireMinVersion
│   ├── types.lua               # LuaLS / EmmyLua annotations
│   ├── api.lua                 # All NSLib.* signatures + adapter dispatcher
│   ├── utils.lua               # Merge, Contains, Safe, Log, IsValidInt
│   ├── blip.lua                # NSLib.Blip.* (RedM, client-only)
│   ├── ped.lua                 # NSLib.Ped.*  (RedM, client-only)
│   └── teleport.lua            # NSLib.Teleport (client-only natives)
├── client/
│   ├── main.lua                # Boot, ns-lib:client:teleport handler
│   ├── notify.lua              # Provider chain (ns-notify → ox_lib → framework → chat)
│   └── exports.lua             # Client-side export surface
├── server/
│   ├── main.lua                # Boot sequence, readiness signal
│   ├── detect.lua              # Adapter detection & loading
│   ├── sql.lua                 # Reserved (future)
│   ├── notify.lua              # NSLib.Notify(source, msg, …) → TriggerClientEvent
│   ├── events.lua              # Proxy events (ns-lib:ready, :playerLoaded, …)
│   ├── discord.lua             # GetDiscordId / GetDiscordRoles + 60s cache
│   ├── permissions.lua         # IsAdmin, HasGroup, HasAce
│   ├── teleport.lua            # NSLib.TeleportPlayer(source, ...)
│   ├── admin.lua               # /lib-status, /bridge-test commands
│   └── exports.lua             # Server-side export surface
└── adapters/
    ├── framework/   vorp.lua · rsg.lua · redemrp.lua
    ├── inventory/   ox.lua · vorp.lua · rsg.lua · redemrp.lua
    └── sql/         oxmysql.lua · mysql-async.lua
```

---

## License

MIT
