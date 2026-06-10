# Overview

**Native Scripts** is a cross-framework script ecosystem for FiveM and RedM (RDR3) servers. The goal: a single codebase that runs unchanged on VORP, RSG-Core, RedEM:RP, ESX and QBCore.

## Core component: `ns-lib`

Every script depends on the `ns-lib` resource. On startup the bridge auto-detects which framework, inventory system and SQL driver are running and loads the matching adapter. Script code only ever calls `NSLib.X(...)`:

```lua
NSLib.OnPlayerLoaded(function(source, player)
    -- player.identifier, .money.cash, .job.name — framework-agnostic
end)

if NSLib.HasItem(source, 'shovel', 1) then
    NSLib.AddItem(source, 'grape', 5)
    NSLib.Notify(source, 'You harvested 5 grapes', 'success')
end
```

You never need to know which framework is running.

## Server setup

1. Download **ns-lib** (free) from Tebex: [nativescripts.com/package/7428342](https://nativescripts.com/package/7428342)
2. Get any ns-* script from the [nativescripts.com](https://nativescripts.com) catalog
3. Drop both into your `resources/` folder
4. Add them to `server.cfg` **in order** (ns-lib first):
   ```cfg
   ensure ns-lib
   ensure ns-vineyard
   ```
5. Apply the SQL and item registrations from each script's README
6. Restart the server — you should see in the console:
   ```
   [ns-lib] v1.0.0 initialized
   [ns-lib] framework=vorp | inventory=vorp | sql=oxmysql
   [ns-lib] adapters loaded ✓
   ```

## Next

- [Bridge architecture →](./bridge) — adapter pattern, API surface, runtime detection
- [Conventions →](./conventions) — code style, folder structure, namespace model
- [Scripts →](/scripts/ns-lib) — detailed documentation for each script
