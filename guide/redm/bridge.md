# Bridge architecture

`ns-lib` is an abstraction layer that lets FiveM/RedM scripts run framework-agnostically.

## Why a bridge?

When you want the same script to run on VORP, RSG-Core, ESX and QBCore, each one has a different API:

| Operation | VORP | RSG-Core | ESX |
|---|---|---|---|
| Add money | `Char.addCurrency(0, 100)` | `Player.Functions.AddMoney('cash', 100)` | `xPlayer.addMoney(100)` |
| Add item | `exports.vorp_inventory:addItem(src, 'item', 1)` | `Player.Functions.AddItem('item', 1)` | `xPlayer.addInventoryItem('item', 1)` |
| Player data | `Core.getUser(src).getUsedCharacter` | `RSGCore.Functions.GetPlayer(src)` | `ESX.GetPlayerFromId(src)` |

The bridge hides these differences. Every script writes `NSLib.AddMoney(src, 'cash', 100)` and it doesn't matter which framework is running.

## Auto-detection

On resource start the bridge checks these sources in order:

```
framework: vorp_core → rsg-core → redemrp_base → es_extended → qb-core
inventory: ox_inventory → vorp_inventory → rsg-inventory → qb-inventory → redemrp_inventory
sql:       oxmysql → mysql-async
```

The first matching adapters are loaded. If a dependency is missing the bridge fails fast and the resource won't start.

## Adapter pattern

```
ns-lib/adapters/
├── framework/      vorp.lua, rsg.lua, redemrp.lua, esx.lua, qbcore.lua
├── inventory/      ox.lua, vorp.lua, rsg.lua, qb.lua, esx.lua, redemrp.lua
└── sql/            oxmysql.lua, mysql-async.lua
```

Each adapter implements the same interface. At runtime the bridge decides which adapter to load and places it into the `NSLib._fw / _inv / _db` slots. Public API calls (`NSLib.GetPlayer`, `NSLib.AddItem`, etc.) execute through those slots.

## Hybrid integration: `@-import` + `exports`

A dependent script can pick one of two ways in its `fxmanifest.lua`:

### Fast path — `@-import`

```lua
shared_scripts {
    '@ns-lib/lib/init.lua',     -- sets up the Bridge global
    -- ...
}
```

`NSLib.X(...)` becomes a direct function call — fast in tight loops.

### Cross-resource path — `exports`

```lua
exports['ns-lib']:AddItem(source, 'wine', 1)
```

Slightly slower (~10x msgpack overhead) but doesn't require importing the bridge.

## Server-only API

The functions below are **server-side only**. Calling them from the client throws an explanatory error:

- `GetPlayer`, `GetMoney`, `AddMoney`, `RemoveMoney`
- `AddItem`, `RemoveItem`, `GetItemCount`, `GetInventory`, `RegisterUsableItem`, `CanCarry`
- `GetJob`, `SetJob`, `HasJob`
- `Query`, `QuerySingle`, `Scalar`, `Execute`, `Insert`

If you need them on the client, ask the server via `TriggerServerEvent` and let the server decide through the bridge.

## Client-side API

Safe to call from the client:

- `NSLib.Notify(_, msg, type, duration)` — show a local notification
- `NSLib.OnPlayerLoaded`, `OnPlayerLogout`, `OnJobChange` — subscribe to events
- `NSLib.framework`, `NSLib.inventory`, `NSLib.sql` — info pushed from the server

## Versioning

The bridge exposes `NSLib.VERSION` and `NSLib.RequireMinVersion(major)`. Dependent scripts can enforce a minimum version to guarantee the API:

```lua
NSLib.RequireMinVersion(1)
```

If a breaking change is made the major version is bumped, so dependents know to update.

## /bridge-status

Admin commands for testing:

```
/bridge-status      detected framework / inventory / sql + adapter map
/bridge-test        run GetPlayer + Money + Job on your own player
```
