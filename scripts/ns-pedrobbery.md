# ns-pedrobbery

Cross-framework RedM ped robbery system. Aim at any NPC to make them
surrender, flee, or fight; loot them through an animated search NUI that
reveals items one-by-one. Anti-cheat is server-authoritative — every
loot mutation goes through a distance check, a NetworkId-bound loot
record, and the inventory API exposed by [ns-lib](https://nativescriptsdev.github.io/docs/scripts/ns-lib).

## Features

- **Aim-based reactions** — three weighted outcomes (surrender / flee /
  fight) configurable as percentages that sum to 100. Optional
  pre-react aim delay for "deliberate hold-up" feel.
- **Aggressive models always fight** — law enforcement and similar
  hostile peds bypass the random roll. Configurable by model name or
  hash.
- **Weapon blacklist** — holding a knife, bow, lasso, torch, etc.
  prevents the script from triggering a reaction (so you can hunt with
  a bow without civilians putting their hands up).
- **Mount / vehicle aware** — mounted or in-coach peds dismount before
  surrendering, and stay mounted/in-vehicle when fighting or fleeing
  so they can ride away or shoot from horseback.
- **NUI search mini-game** — western-themed stash UI with grid layout,
  per-item reveal timer, take-one / take-all flow, and inventory-icon
  auto-detection (VORP, RSG, ox).
- **Configurable search animations** — clip-based or scenario-based,
  with random selection from a list per robbery. Different anim for
  alive (patdown) vs dead/hogtied (kneeling pickup).
- **Per-model loot overrides** — give lawmen medicine and coal, gang
  members ammo and cash, generic civilians the default pool.
- **Two loot roll modes** — chance-based (each entry rolls
  independently) or pick-1-to-3 (random items from the pool). Auto-
  detected by whether entries have a `chance` field.
- **NetworkId-bound loot record** — the same ped maps to the same loot
  across all clients, so two players can't double-loot the same
  victim, and re-opening the stash returns the same items.
- **Server-side proximity gate** — every loot request, item take, and
  take-all is distance-checked server-side against the ped's
  NetworkId. Players who walk away get their stash closed and a
  "Too far" notification.
- **Surrender auto-release** — surrendered peds get released when the
  player walks far enough away, or after the stash is fully looted.
- **Cooldown + locking** — per-source request cooldown stops loot
  spam; per-loot `lockedBy` field prevents two players from looting
  the same ped concurrently.

## Requirements

- **ns-lib** — provides framework adapters, `AddItem`, `Notify`, and
  the inventory icon base URL.
- One of the supported frameworks: **VORP**, **RSG-Core**, or
  **RedEM:RP** (auto-detected through ns-lib).

## Installation

1. Drop this folder into `resources/ns-pedrobbery/`.
2. Add to `server.cfg` after `ns-lib`:
   ```
   ensure ns-lib
   ensure ns-pedrobbery
   ```
3. (Optional) Edit `config.lua` — reaction odds, aggressive model
   list, loot tables, search animations, distances.
4. Restart the server. No SQL migration; loot state is in-memory only.

Sold as two SKUs on Tebex: **escrow** (encrypted, `config.lua` + `html/style.css` stay editable) and **open source** (all source plaintext, full customization).

## How it plays

1. Player aims a non-blacklisted weapon at an NPC within
   `Config.MaxAimDistance` units.
2. After `Config.ReactionDelay` ms of continuous aiming (0 = instant),
   the ped rolls a reaction:
   - **surrender** — holsters current weapon (keeps it in their
     inventory), hands up, can be looted directly.
   - **flee** — runs away. Lootable if downed (dead / ragdolled /
     hogtied).
   - **fight** — draws and attacks. If the ped is unarmed, a
     revolver is given so civilians actually engage instead of
     running. Lootable when dead or hogtied.
3. Aggressive models in `Config.AggressiveModels` always fight.
4. Player walks within `Config.InteractionDistance` of a lootable
   ped — a `G` prompt appears (text changes between "Rob" and "Loot"
   depending on alive/dead state). Peds that are being **carried or
   dragged** by another ped (e.g. picked up on a shoulder) are not
   lootable until they are set back down.
5. Press `G` → search animation starts, NUI grid opens. Items reveal
   one-by-one over `Config.SearchingTime` ms each. Take one with
   click or take everything with the dedicated button. The player
   rotates to face the target ped before the animation begins.

## Configuration

All settings live in `config.lua`. The most relevant ones:

### Reaction tuning

| Key | Default | Meaning |
|---|---|---|
| `Config.ReactionChances.surrender` | `40` | % of peds that surrender |
| `Config.ReactionChances.flee` | `30` | % of peds that flee |
| `Config.ReactionChances.fight` | `25` | % of peds that fight |
| `Config.ReactionDelay` | `0` | ms of continuous aiming before reaction (0 = instant) |
| `Config.MaxAimDistance` | `7.0` | Max aim distance to trigger a reaction |
| `Config.InteractionDistance` | `2.0` | Max distance to open the stash |
| `Config.SearchingTime` | `1800` | ms per item before it's revealed in the NUI |

The roll uses `surrender` and `flee` as cumulative bands; **`fight`
is whatever is left over** (`100 − surrender − flee`). Set
`surrender + flee ≤ 100` and `fight` is implied — the literal value
of `Config.ReactionChances.fight` is informational, not read by the
script.

### Aggressive models

Peds whose model is listed in `Config.AggressiveModels` always fight,
regardless of the random roll. Accepts string names or numeric hashes.
Defaults cover ambient law, dispatch lawmen, deputies, sheriffs,
Pinkertons, MP lawmen, and story cutscene law.

### Blacklisted weapons

Holding a weapon in `Config.BlacklistedWeapons` skips the reaction
entirely — useful so hunting with a bow or skinning with a knife
doesn't accidentally hold up every civilian within 7 m. Defaults cover
all knives, bows, throwables, lassos, torch, and unarmed.

### Loot tables

The script supports two roll modes, auto-detected from the table
shape:

**Chance-based** (when any entry has a `chance` field) — each entry
rolls independently against `chance`:

```lua
Config.LootTable = {
    { item = 'money_coin', label = 'Coin',    chance = 50, min = 1, max = 5 },
    { item = 'whisky',     label = 'Whisky',  chance = 20, min = 1, max = 1 },
}
```

**Pick-1-to-3** (when no entry has `chance`) — 1 to 3 entries are
picked at random from the pool:

```lua
Config.LootTable = {
    { item = 'apple',   label = 'Apple',   min = 1, max = 2 },
    { item = 'bandage', label = 'Bandage', min = 1, max = 2 },
}
```

Per-model overrides live in `Config.ModelLoots` (keyed by model name
or hash). If a model isn't listed, the default `Config.LootTable`
applies.

### Search animations

`Config.SearchAnims` controls what the player does while looting.
Two `kind`s are supported:

| `kind` | Native | Fields | Notes |
|---|---|---|---|
| `'anim'` (default) | `TaskPlayAnim` | `dict`, `clip`, `cycle` | Clip is re-triggered every `cycle` ms |
| `'scenario'` | `TaskStartScenarioInPlaceHash` | `scenario` | World scenario; loops on its own |

Each variant (`alive`, `dead`) accepts **either a single entry or a
list of entries**. When a list is supplied, a random entry is picked
on every robbery — so each loot has visual variety.

```lua
Config.SearchAnims = {
    -- Single entry (every loot uses this one)
    dead = {
        kind  = 'anim',
        dict  = 'mech_pickup@treasure@rock_pile',
        clip  = 'pickup_coins_only',
        cycle = 1600,
    },

    -- List (random one picked per robbery)
    alive = {
        { kind = 'anim', dict = 'script_re@coach_robbery@skinner', clip = 'action_01_skinner01', cycle = 1600 },
        { kind = 'anim', dict = 'script_re@foot_robbery',          clip = 'action_victim',       cycle = 1400 },
        { kind = 'anim', dict = 'script_re@mech_patdown',          clip = 'loot_success_attacker', cycle = 1400 },
        -- Scenario alternative:
        -- { kind = 'scenario', scenario = 'WORLD_HUMAN_INSPECT_GROUND' },
    },
}
```

Scenario names: see the [femga discoveries scenarios
list](https://github.com/femga/rdr3_discoveries/tree/master/animations/scenarios).

### Messages

Strings in `Config.Messages` — keep them in English (project
convention). Used for notifications and prompt labels.

## Architecture

### Client

```
client/
├── main.lua      — prompt registration, resource lifecycle
├── robbery.lua   — aim detection, reaction state machine,
│                   prompt dispatcher, surrender monitor
└── nui.lua       — search anim dispatcher (anim/scenario),
                    stash open/close, NUI ↔ Lua bridge
```

The aim detection thread polls both free-aim (`GetEntityPlayerIsFreeAimingAt`)
and lock-on (`GetPlayerTargetEntity`) so RDR2's dual-targeting mode is
covered. Surrender uses `_HOLSTER_PED_WEAPONS` (the ped keeps its
weapon) + `TaskHandsUp` + config flags 166/408 (weapons unequip +
scared response) + `SetBlockingOfNonTemporaryEvents` so the ped
stays still. Fight uses `TaskCombatPed`, plus `GIVE_WEAPON_TO_PED`
with a `WEAPON_REVOLVER_CATTLEMAN` for unarmed civilians so they
actually engage instead of fleeing in panic.

### Server

```
server/
├── main.lua      — lifecycle stub, math.randomseed
└── loot.lua      — loot generation, NetworkId-bound stash records,
                    server-side proximity enforcement, item give
```

Loot records are keyed by `lootCount` (incrementing int) and
indexed by `pedLootMap[networkId]` so the same ped resolves to the
same record across all clients. Each record carries `lockedBy` for
mutex, `items` with `taken` flags, and `createdAt` for the 5-minute
GC sweep.

`EnforceProximity` runs on every server event (`takeItem`,
`takeAll`, and the initial `requestLoot`), resolving the ped from
NetworkId and rejecting requests where the player is farther than
`InteractionDistance + 1.5 m`. Failed checks notify the client and
trigger `tooFar` so the stash closes.

### NSLib usage

- `nslib:AddItem(src, itemName, count)` — give item (framework-
  agnostic).
- `nslib:Notify(src, msg, type)` — notification (info/success/error).
- `nslib:GetIconBase()` — returns the NUI image base URL for the
  detected inventory (VORP, RSG, ox). Lets the stash UI show the
  real inventory icons.

No direct framework calls anywhere in this resource — swapping VORP
for RSG-Core is a config change on ns-lib's side, not a code change
here.

## Tuning notes

- **Lethality.** The shipped defaults (40% surrender / 30% flee /
  30% fight) give a balanced wild-west feel. For a forgiving "easy
  rob" mode try `90 / 5 / 5`; for a hostile one try `10 / 20 / 70`.
- **Pre-react delay.** `ReactionDelay = 1500` makes players hold aim
  for 1.5 s before the ped reacts — feels more like a deliberate
  hold-up than a hair-trigger.
- **Interaction radius.** Server adds a 1.5 m buffer to
  `InteractionDistance` before kicking the player from a stash, so
  the prompt distance and the kick distance don't collide at the
  edge.
- **Loot persistence.** Once a ped is fully looted the server keeps
  an empty record for ~5 minutes so revisiting the same ped doesn't
  trigger a fresh roll. After the cleanup sweep the ped becomes
  re-rollable, which is intentional — by then the entity has
  usually despawned anyway.

## Known limits

- Loot state is in-memory only. A server restart resets every active
  loot record (intentional — peds despawn on restart anyway, so
  persistence would orphan the records).
- The aim-detection thread polls at 300 ms when idle and 0 ms while
  actively tracking a valid target. Heavy NPC density (saloons,
  busy main streets) hasn't shown measurable cost in profiling, but
  reduce `MaxAimDistance` if you see hitches.
- Scenarios that need a scenario-point (benches, leaning) won't work
  with `kind = 'scenario'` because the dispatcher uses
  `TASK_START_SCENARIO_IN_PLACE_HASH` (no point handle). Stick to
  in-place world scenarios.

## License

MIT
