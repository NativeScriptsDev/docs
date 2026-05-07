# Convention'lar

Bu org'daki tüm script'lerin uyduğu kod ve yapı standartları.

## Klasör yapısı (layered)

```
scripts/<resource-adı>/
├── fxmanifest.lua
├── config.lua                # Config table + Config.Messages
├── README.md
├── .gitignore
├── client/                   # client-side
│   └── main.lua
├── server/                   # server-side
│   └── main.lua
└── shared/                   # client + server ortak
    └── utils.lua
```

NUI varsa: `ui/` (React kaynak) + `html/` (vite build çıktısı).

## Naming

- **Fonksiyonlar:** `PascalCase` — `GetPlayerMoney(source)`, `IsInJail(playerId)`
- **Değişkenler / locals / parametreler:** `camelCase` — `playerData`, `targetSource`
- **Sabitler / Config keys:** `PascalCase` — `Config.JailTime`, `Config.MaxFine`
- **Resource namespace:** `PascalCase` (kebab → Pascal) — `redm-jail` → `RedmJail`
- **Event isimleri:** `<resource-adı>:<side>:<action>` — `redm-jail:server:imprison`
- **Repo / klasör / resource:** `kebab-case-lower`

## Module pattern (hibrit)

Dosyalar arası tek namespace, dış resource'lar `exports` üzerinden erişir.

```lua
-- shared/utils.lua
RedmJail = RedmJail or {}
RedmJail.utils = {}

function RedmJail.utils.Distance(a, b)
    return #(a - b)
end

-- server/main.lua
local function CalculateFine(crime)         -- local: dosya-private
    return Config.Fines[crime] or 100
end

function RedmJail.ImprisonPlayer(source, time)  -- namespace: cross-file
    -- ...
end

-- Cross-resource API
exports('imprisonPlayer', RedmJail.ImprisonPlayer)
```

**Kurallar:**
- Dosya-içi private fonksiyonlar `local function` ile.
- Dosyalar arası paylaşılan fonksiyonlar `<ResourceName>.<submodule>.<Func>` formunda.
- `_G` direkt manipülasyonu yasak.
- Dış resource'lara açılan fonksiyonlar `exports(...)` ile expose.

## Config

Tek `config.lua`, i18n yok, mesajlar `Config.Messages` içinde.

```lua
Config = {}

Config.JailTime = 600
Config.MaxFine = 5000

Config.Messages = {
    jailed       = 'Hapse atıldın. Süre: %s saniye',
    released     = 'Serbest bırakıldın',
    notEnough    = 'Yeterli paran yok',
    noPermission = 'Yetkin yok',
}
```

## Bridge zorunluluğu

**Tüm script'ler** `ns-lib` üzerinden çalışır. Yasaklar:

- `exports.vorp_core`, `exports['rsg-core']`, `exports['qb-core']`, `exports['es_extended']` — direkt çağrılmaz
- `MySQL.*` — direkt kullanılmaz, `NSLib.Query/Execute/...`
- `lib.notify` direkt çağrı — `NSLib.Notify` (zaten ox_lib'i tercih eder)
- Framework-spesifik player object field'larına dokunma

İhtiyacın olan bir Bridge fonksiyonu yoksa, Bridge'e eklenir — script'e değil.

## fxmanifest şablonu

```lua
fx_version 'cerulean'
game 'rdr3'   -- veya 'gta5'
rdr3_warning '...'

author 'Native Scripts'
description '<...>'
version '0.1.0'
repository 'https://github.com/NativeScriptsDev/<resource-adı>'

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

- Her script ayrı **private** repo (NativeScriptsDev org'da)
- `mr-claude-setup` ve **`docs`** repo'ları public istisna
- Script'in README'si docs site'a yansır (`/sync-docs <script>`)
- Kod stili: imperative present-tense commit mesajları

## Anti-cheat

- Server validate her şey
- Distance check server-side (`GetEntityCoords`)
- Inventory işlemleri atomic (mutex per-source)
- Client'a güvenme — client coord, count, time gönderemez
