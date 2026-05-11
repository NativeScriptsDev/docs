# ns-lib

Cross-framework abstraction layer for FiveM and RedM resources.

- **Frameworks:** VORP, RSG-Core, RedEM:RP, ESX, QBCore (auto-detected)
- **Inventory:** ox_inventory, vorp_inventory, rsg-inventory, qb-inventory, redemrp_inventory
- **SQL:** oxmysql, mysql-async
- **Notify:** ox_lib → framework native → game native (auto fallback)
- **Discord:** shared bot for every dependent script — no per-script HTTP duplication

> Support / community: [discord.gg/UyyngemnF8](https://discord.gg/UyyngemnF8)

---

## 1. Setup

Follow these steps **in order** — every dependent script assumes ns-lib is already running.

### 1.1 Install

1. Drop this resource into your `resources/` folder as `ns-lib`.
2. Open your `server.cfg` and add `ensure ns-lib` **before** any script that depends on it.
3. (Optional) Configure Discord — see [§7](#7-discord-server-only).
4. Restart the server. On a healthy boot you should see:
   ```
   [ns-lib] v1.3.0 initializing...
   [ns-lib] framework=rsg | inventory=ox | sql=oxmysql
   [ns-lib] adapters loaded ✓
   [ns-lib] discord helpers enabled (guild=...)   -- or "idle" if not configured
   ```

If detection fails, the resource **stops itself** with a loud red error — fix the missing framework / SQL driver and restart.

### 1.2 Wire it into a dependent script

In your script's `fxmanifest.lua`:

```lua
dependency 'ns-lib'

shared_scripts {
    '@ns-lib/lib/init.lua',   -- MUST be first; loads NSLib namespace
    'config.lua',
    'shared/*.lua',
}

client_scripts { 'client/*.lua' }
server_scripts { 'server/*.lua' }
```

After this, `NSLib.*` is available everywhere (with the [client/server split](#3-clientserver-split) below). No framework-specific code needed.

---

## 2. Boot sequence

What actually happens during startup, in order:

```
1. ns-lib starts (server)
   ├─ shared/version.lua, shared/types.lua, shared/api.lua loaded
   │  → NSLib.* defined as "not implemented" stubs
   ├─ server-config.lua reads convars (Discord)
   ├─ server/detect.lua scans GetResourceState(...)
   │  → picks framework, inventory, sql
   │  → loads adapters/<kind>/<name>.lua into NSLib._fw / _inv / _db
   ├─ adapter Init() hooks run (if defined)
   ├─ NSLib.ready = true
   ├─ TriggerEvent('ns-lib:ready', { framework, inventory, sql, version })
   └─ Already-connected players receive 'ns-lib:client:info'

2. Dependent script starts
   ├─ '@ns-lib/lib/init.lua' wires NSLib.* via exports['ns-lib']
   │  ├─ server side → full API
   │  └─ client side → events + framework info; mutating calls become "server-only" stubs
   └─ Your script can now call NSLib.* freely

3. A player connects / spawns
   ├─ Framework's own loaded event fires
   ├─ Adapter fans out into NSLib._events.playerLoaded
   ├─ NSLib.OnPlayerLoaded(...) callbacks run
   ├─ TriggerEvent('ns-lib:playerLoaded', source, player)   -- proxy event
   └─ TriggerClientEvent('ns-lib:client:info', source, ...) -- pushes detection info to client
```

Use `AddEventHandler('ns-lib:ready', ...)` if you need to defer setup until the bridge is fully online (rare — the `@-import` already blocks until the resource started).

---

## 3. Client/server split

| Capability | Server | Client |
|---|---|---|
| Player / money / inventory / job | ✅ | ❌ (calls error — use `TriggerServerEvent`) |
| Database (`Query`, `Execute`, …) | ✅ | ❌ |
| Permissions (`IsAdmin`, `HasGroup`, `HasAce`) | ✅ | ❌ |
| Discord (`GetDiscordId`, `GetDiscordRoles`) | ✅ | ❌ |
| `Notify(source, msg, type)` | ✅ (targets a player) | ✅ (renders for self, ignores `source` arg) |
| `Teleport(coords, opts)` | — | ✅ |
| `TeleportPlayer(src, coords, opts)` | ✅ | ❌ |
| `Blip.*`, `Ped.*` (RedM) | — | ✅ |
| Events (`OnPlayerLoaded`, `OnPlayerLogout`, `OnJobChange`) | ✅ | ✅ (listen-only) |
| `NSLib.framework` / `.inventory` / `.sql` | ✅ | ✅ (auto-pushed) |

Calling a server-only function from the client raises a clear error:
`[ns-lib] NSLib.X is server-only. Trigger a server event from the client instead.`

---

## 4. Events

```lua
-- Player joined and the framework reports them as fully loaded.
NSLib.OnPlayerLoaded(function(source, player)
    print(('Player loaded: %s (%s)'):format(player.name, player.identifier))
end)

-- Player disconnected (only the source is given — Player record is gone).
NSLib.OnPlayerLogout(function(source) end)

-- Job changed (fired on SetJob and on framework's own job-change event).
NSLib.OnJobChange(function(source, newJob) end)
```

Equivalent standard events (for resources that don't `@-import` the lib):

```lua
AddEventHandler('ns-lib:ready',         function(info) end)
AddEventHandler('ns-lib:playerLoaded',  function(source, player) end)
AddEventHandler('ns-lib:playerLogout',  function(source) end)
AddEventHandler('ns-lib:jobChange',     function(source, newJob) end)
```

---

## 5. API reference

### 5.1 Player

```lua
NSLib.GetPlayer(source)       -- → Player | nil
NSLib.GetIdentifier(source)   -- → "steam:..." | "license:..." | nil  (raw account id)
NSLib.GetAllPlayers()         -- → Player[]
NSLib.IsLoaded(source)        -- → bool
```

`Player.identifier` is always the raw `steam:xxx` / `license:xxx` — **not** VORP's `charIdentifier` (1, 2, 3…) which is a slot index.
For the character primary key (cross-framework), use `Player.charId`:

| Framework | `charId` source |
|---|---|
| VORP | `char.charIdentifier` |
| QBCore / RSG | `PlayerData.citizenid` |
| ESX | `xPlayer.identifier` |
| RedEM:RP | `user:getIdentifier()` |

### 5.2 Money

```lua
NSLib.GetMoney(source, type)          -- type: 'cash' | 'bank' | 'gold' | 'rol'
NSLib.AddMoney(source, type, amount)
NSLib.RemoveMoney(source, type, amount)
```

### 5.3 Inventory

```lua
NSLib.AddItem(source, name, count, metadata?)
NSLib.RemoveItem(source, name, count, metadata?)
NSLib.GetItemCount(source, name)
NSLib.HasItem(source, name, count?)        -- count defaults to 1
NSLib.GetInventory(source)                 -- → Item[]
NSLib.RegisterUsableItem(name, callback)
NSLib.CanCarry(source, name, count)
```

ns-lib does **not** auto-register items. Each dependent script's README lists items it needs — add them manually to your framework's item DB (`ox_inventory/data/items.lua`, `vorp_inventory` SQL, `qb-core/shared/items.lua`, …).

### 5.4 Job

```lua
NSLib.GetJob(source)                  -- → { name, grade, label }
NSLib.SetJob(source, name, grade)
NSLib.HasJob(source, name, minGrade?) -- → bool
```

### 5.5 Database (hybrid sync/async)

Pass a callback for async, omit it for sync (waits via `Citizen.Await`).

```lua
local rows = NSLib.Query('SELECT * FROM players WHERE id = ?', { id })

NSLib.Query('SELECT * FROM players', {}, function(rows)
    print(#rows)
end)

NSLib.QuerySingle(sql, params, cb?)  -- single row
NSLib.Scalar(sql, params, cb?)       -- first column of first row
NSLib.Execute(sql, params, cb?)      -- → affected rows
NSLib.Insert(sql, params, cb?)       -- → insertId
```

### 5.6 Notify

```lua
NSLib.Notify(source, message, type, duration?)
-- type: 'success' | 'error' | 'info' | 'warning'
-- duration in ms (optional)
```

Resolution chain: `ox_lib` → framework's native notification → game-native fallback.

### 5.7 Permissions (server-only)

Three-layer resolution: console (`source = 0`) → CFX `ace` (any in `NSLib.AdminAces`) → framework `Player.group` ∈ `NSLib.AdminGroups`.

```lua
NSLib.IsAdmin(source)            -- any AdminAces ACE OR Player.group ∈ AdminGroups
NSLib.HasGroup(source, 'mod')    -- group.mod OR Player.group == 'mod'
NSLib.HasAce(source, 'command.ban')  -- shortcut around IsPlayerAceAllowed (console = true)
```

`NSLib.IsAdmin` does not assume `'group.admin'` — different cores wire ACE names differently. RSG-Core boots with `add_ace rsgcore.god god allow` (so `IsPlayerAceAllowed(src, 'god')` is true for admins, but `'group.admin'` is not). The default `AdminAces` covers the common ones across VORP / RSG / ESX:

```lua
NSLib.AdminAces = { 'group.admin', 'admin', 'god', 'superadmin', 'owner' }
```

Extend the admin set at runtime:

```lua
NSLib.AdminGroups['supporter'] = true   -- match Player.group == 'supporter'
NSLib.AdminAces[#NSLib.AdminAces+1] = 'staff'  -- match IsPlayerAceAllowed(src, 'staff')
```

Where `Player.group` comes from per framework:
- VORP → `char.group`
- QB / RSG → `PlayerData.permission`
- ESX → `xPlayer:getGroup()`
- RedEM → `user:getGroup()`

### 5.8 Teleport

One-shot teleport with screen fade and ground-snap. Coordinates accept `vector3`, `vector4`, or `{ x, y, z, h?/w? }`. Mounts, wagons, and boats follow the player automatically (the ped is re-attached after the entity is moved).

Outdoor destinations use the engine's baked heightmap to find the surface — no streaming wait required. Interior destinations are auto-detected via `GetInteriorAtCoords` and skip the heightmap snap, so the player lands on the floor instead of the building roof. Pass `interior = true` to force interior mode when auto-detect misses.

```lua
-- CLIENT (teleport self)
NSLib.Teleport(vector4(-178.5, 631.5, 113.5, 90.0))

NSLib.Teleport(vector3(2641.5, -1037.4, 47.5), {
    heading  = 180.0,
    fade     = true,    -- screen fade (default true)
    fadeMs   = 500,     -- fade duration ms (default 500)
    interior = nil,     -- nil = auto-detect | true = force interior | false = force outdoor
})

-- SERVER (teleport another player — fires 'ns-lib:client:teleport' to target)
NSLib.TeleportPlayer(targetSrc, vector4(2641.5, -1037.4, 47.5, 180.0))
NSLib.TeleportPlayer(targetSrc, { x = 2641.5, y = -1037.4, z = 47.5 }, { heading = 180.0, fade = false })
```

### 5.9 Blip (RedM, client-only)

Declarative wrapper over `BlipAddForCoords` / `BlipAddForEntity` / `BlipAddForRadius` — no scattered `SetBlipSprite/SetBlipName/SetBlipScale` boilerplate. String hash names (e.g. `'blip_ambient_sheriff'`) are auto-`joaat`'d.

```lua
-- Static map marker
local b = NSLib.Blip.Create({
    coords        = vector3(-178.5, 631.5, 113.5),
    sprite        = `blip_ambient_sheriff`,
    name          = 'Valentine Sheriff',
    scale         = 0.9,
    extraModifier = `BLIP_MODIFIER_LAW_DEFAULT`,
})

-- Attached to an entity (moves with the ped/horse/vehicle)
local headBlip = NSLib.Blip.CreateForEntity({
    entity = somePed,
    sprite = `blip_ambient_bounty_target`,
    name   = 'Wanted Outlaw',
})

-- Radius circle on the map (RDR Online "search area" style)
local areaBlip = NSLib.Blip.CreateRadius({
    coords = vector3(2641.5, -1037.4, 47.5),
    radius = 180.0,
    sprite = `blip_mission_area_bounty`,
})

-- Update / extend / remove
NSLib.Blip.Update(b, { name = 'New Name', scale = 1.2, flashes = true })
NSLib.Blip.AddModifier(b, `BLIP_MODIFIER_USE_HEADING_INDICATOR`)
NSLib.Blip.Remove(b)                          -- nil-safe
myBlipList = NSLib.Blip.RemoveAll(myBlipList)
```

All `Create*` opts: `coords`, `entity`, `radius`, `sprite`, `name`, `scale`, `modifier`, `extraModifier`, `extraModifiers`, `colour`, `flashes`, `shortRange`, `priority`.

### 5.10 Ped (RedM, client-only)

```lua
-- Static NPC (vendor, quest giver, …)
local vendor = NSLib.Ped.Spawn({
    model         = `cs_mp_jackmarston`,
    coords        = vector4(-178.5, 631.5, 113.5, 90.0),
    freeze        = true,
    invincible    = true,
    blockEvents   = true,
    noFlee        = true,
    noTarget      = true,
    placeOnGround = true,
})

-- Hostile / target ped (armed, AI free)
local enemy = NSLib.Ped.Spawn({
    model   = `g_m_m_unidustergang_01`,
    coords  = pos,
    heading = math.random(0, 359) + 0.0,
    weapon  = `WEAPON_REVOLVER_CATTLEMAN`,
    ammo    = 100,
})

NSLib.Ped.Update(vendor, { freeze = false, invincible = false })
NSLib.Ped.Delete(vendor)                       -- safe DeletePed with mission flag
myEnemies = NSLib.Ped.DeleteAll(myEnemies)

-- Just load a model (useful outside Spawn for CreateObject etc.)
if NSLib.Ped.LoadModel(`p_campfire01x`, 5000) then
    -- ...
end
```

Spawn opts: `model`, `coords` (vector3/vector4/table), `heading`, `network`, `mission`, `freeze`, `invincible`, `health`, `blockEvents`, `noFlee`, `noTarget`, `noRagdoll`, `relationGroup`, `weapon`, `ammo`, `scenario`, `placeOnGround`, `releaseModel`, `loadTimeoutMs`. The same opts apply to `Update()`.

> **Client-only.** These natives don't exist on the server — calling them from server code throws "attempt to call nil". Use `TriggerClientEvent` to reach the player.

---

## 6. Usage example

```lua
-- server/main.lua
NSLib.OnPlayerLoaded(function(source, player)
    print(('Player loaded: %s (%s)'):format(player.name, player.identifier))
end)

function GiveWine(source, quality)
    if not NSLib.HasItem(source, 'empty_bottle', 1) then
        return NSLib.Notify(source, 'You need an empty bottle', 'error')
    end
    NSLib.RemoveItem(source, 'empty_bottle', 1)
    NSLib.AddItem(source, 'wine', 1, { quality = quality })
    NSLib.Notify(source, 'Wine bottled', 'success')
end
```

---

## 7. Discord (server-only)

Bot token + guild ID are read from **server convars** (`ns_lib_discord_token`, `ns_lib_discord_guild`) — set them once in `server.cfg` and every dependent script gets Discord access for free. The token stays out of git history and never reaches the client.

### 7.1 API

```lua
NSLib.GetDiscordId(source)
-- → "315214743864344586" or nil if the player hasn't linked Discord to FiveM.

NSLib.GetDiscordRoles(source, function(roleIds, err)
    -- roleIds : array of role-ID strings (snowflakes), [] when not in guild or err set
    -- err     : nil | 'no_discord_id' | 'auth' | 'parse' | 'network' | 'http_<status>' | 'disabled'
end)
```

### 7.2 Setup checklist

1. **Create a bot:** https://discord.com/developers/applications → New Application → Bot → Reset Token
2. **Enable `Server Members Intent`** under the Bot tab → Privileged Gateway Intents (REQUIRED — without it `body.roles` is missing).
3. **Invite the bot:** OAuth2 → URL Generator → scope `bot`, perm `Read Messages` → open the URL → add to your guild.
4. Discord Settings → Advanced → enable Developer Mode.
5. Right-click your server → Copy Server ID.
6. Add the convars to your `server.cfg` (use `set`, NOT `setr` — `set` keeps them server-only and never replicates to clients):

   ```cfg
   set ns_lib_discord_enabled "true"
   set ns_lib_discord_token   "YOUR_BOT_TOKEN"
   set ns_lib_discord_guild   "YOUR_GUILD_ID"
   ```

After restart, the console stays silent on success. If `Enabled=true` but either secret is missing, ns-lib prints a loud red warning at boot:

```
[ns-lib] Discord enabled but ns_lib_discord_token / ns_lib_discord_guild not set in server.cfg — Discord helpers will fail.
```

To disable Discord entirely without removing convars, set `ns_lib_discord_enabled "false"`.

### 7.3 Mapping role IDs to keys

The library returns *raw* role IDs. Each script decides how to map them to its own role-key vocabulary (member / vip / staff / …).

```lua
-- your_script/config.lua
Config.Roles = {
    member = '1089999246914232381',
    vip    = '1324526243689009236',
}

-- your_script/server/foo.lua
local function MapRoles(rawIds)
    local found = {}
    for _, id in ipairs(rawIds) do
        for key, configured in pairs(Config.Roles) do
            if id == configured then found[key] = true end
        end
    end
    return found
end

local function OnSomeEvent(source)
    NSLib.GetDiscordRoles(source, function(roles, err)
        if err == 'no_discord_id' then
            return NSLib.Notify(source, 'Link your Discord first', 'error')
        elseif err then
            return NSLib.Notify(source, 'Discord check failed: ' .. err, 'error')
        end
        local has = MapRoles(roles)
        if has.vip then
            -- grant VIP perks
        end
    end)
end
```

### 7.4 Notes

- **No caching** — every call hits Discord directly. Role changes show up live. Bot's global rate limit is ~50 req/s, comfortable for any normal server population.
- A **404** (player isn't in the guild) returns `err = nil, roles = {}` — not an error. Treat empty `roles` as "no privileges".
- The HTTP request is async; `NSLib.GetDiscordRoles` always uses a callback. There is no sync wrapper.

---

## 8. Admin & versioning

```
/lib-status     -- prints detected framework / inventory / sql, lists mounted adapters
```

Pin a minimum major version in your script's init code:

```lua
NSLib.RequireMinVersion(1)   -- errors if NSLib.VERSION < 1.x
```

---

## 9. Caveats

- **No standalone fallback.** ns-lib requires one of the supported frameworks. If none is detected at startup, the resource errors out and stops.
- **Hot reload.** Restarting `ns-lib` invalidates `NSLib` references in dependent scripts because `@-import` runs once on resource start. **Restart all dependent scripts** after restarting ns-lib.
- **Items are not auto-registered.** See [§5.3](#53-inventory).

---

## License

MIT
