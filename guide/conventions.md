# Conventions

The code and structure standards every script in this org follows.

## Folder structure (layered)

```
scripts/<resource-name>/
├── fxmanifest.lua
├── config.lua                # Config table + Config.Messages
├── README.md
├── .gitignore
├── client/                   # client-side
│   └── main.lua
├── server/                   # server-side
│   └── main.lua
└── shared/                   # shared client + server
    └── utils.lua
```

If there's a NUI: `ui/` (React source) + `html/` (vite build output).

## Naming

- **Functions:** `PascalCase` — `GetPlayerMoney(source)`, `IsInJail(playerId)`
- **Variables / locals / parameters:** `camelCase` — `playerData`, `targetSource`
- **Constants / Config keys:** `PascalCase` — `Config.JailTime`, `Config.MaxFine`
- **Resource namespace:** `PascalCase` (kebab → Pascal) — `redm-jail` → `RedmJail`
- **Event names:** `<resource-name>:<side>:<action>` — `redm-jail:server:imprison`
- **Repo / folder / resource:** `kebab-case-lower`

## Module pattern (hybrid)

A single namespace shared across files; external resources reach it through `exports`.

```lua
-- shared/utils.lua
RedmJail = RedmJail or {}
RedmJail.utils = {}

function RedmJail.utils.Distance(a, b)
    return #(a - b)
end

-- server/main.lua
local function CalculateFine(crime)         -- local: file-private
    return Config.Fines[crime] or 100
end

function RedmJail.ImprisonPlayer(source, time)  -- namespace: cross-file
    -- ...
end

-- Cross-resource API
exports('imprisonPlayer', RedmJail.ImprisonPlayer)
```

**Rules:**
- File-private functions use `local function`.
- Functions shared across files use the `<ResourceName>.<submodule>.<Func>` form.
- Direct `_G` manipulation is forbidden.
- Functions exposed to external resources are exposed with `exports(...)`.

## Config

A single `config.lua`, no i18n, messages live in `Config.Messages`.

```lua
Config = {}

Config.JailTime = 600
Config.MaxFine = 5000

Config.Messages = {
    jailed       = 'You were jailed. Time: %s seconds',
    released     = 'You were released',
    notEnough    = 'You do not have enough money',
    noPermission = 'You do not have permission',
}
```

## Bridge requirement

**Every script** runs through `ns-lib`. Not allowed:

- `exports.vorp_core`, `exports['rsg-core']`, `exports['qb-core']`, `exports['es_extended']` — never called directly
- `MySQL.*` — never used directly, use `NSLib.Query/Execute/...`
- Direct `lib.notify` calls — use `NSLib.Notify` (it already prefers ox_lib)
- Don't touch framework-specific player object fields

If a bridge function you need is missing, it's added to the bridge — not to the script.

## fxmanifest template

```lua
fx_version 'cerulean'
game 'rdr3'   -- or 'gta5'
rdr3_warning '...'

author 'Native Scripts'
description '<...>'
version '0.1.0'

lua54 'yes'

dependency 'ns-lib'

shared_scripts {
    '@ns-lib/lib/init.lua',
    'config.lua',
    'shared/*.lua',
}
client_scripts { 'client/*.lua' }
server_scripts { 'server/*.lua' }
```

## GitHub workflow

- Each script is a separate **private** repo (in the NativeScriptsDev org)
- The `mr-claude-setup` and **`docs`** repos are the public exceptions
- A script's README is mirrored to the docs site (`/sync-docs <script>`)
- Code style: imperative present-tense commit messages

## Anti-cheat

- The server validates everything
- Distance checks are server-side (`GetEntityCoords`)
- Inventory operations are atomic (mutex per-source)
- Never trust the client — it can't send coordinates, counts or time
