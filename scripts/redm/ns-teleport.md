# ns-teleport

Cross-framework RedM teleport menu via [ns-lib](https://nativescriptsdev.github.io/docs/scripts/redm/ns-lib).
Players walk up to a stagecoach NPC, press `G`, pick a destination, optionally
pay a fee, and travel with a cinematic fade.

UI is themed in the **Frontier Outlaw** RDR2 style: parchment + wood + signature
red, sharp shapes, Newsreader headlines.

## Features

- VORP / RSG-Core / RedEM:RP / ESX / QBCore — auto-detected through ns-lib
- One NPC + map blip per configured hub
- Auto interior detection — players land on the floor, not the roof
- Dismount required — riders can't TP while in a vehicle or on a horse
- Optional charge per hub, configurable cash/bank source
- One unified `Config.Hubs` table — the same coord drives the NPC stand point
  and the teleport arrival; no separate "NPC here, TP there" split

## Requirements

- **ns-lib** (mandatory — provides framework adapters, money API, base teleport)
- One of the supported frameworks: VORP, RSG-Core, RedEM:RP, ESX, QBCore

## Installation

1. Make sure `ns-lib` is installed and `ensure`d.
2. Drop this folder into `resources/ns-teleport/`.
3. Add to `server.cfg` after `ns-lib`:
   ```
   ensure ns-lib
   ensure ns-teleport
   ```
4. Edit `config.lua` — edit `Hubs`, tune `Cost`.
5. (Optional) Drop your Newsreader & Noto Serif `.woff2` files into `html/fonts/`.
   Without them the menu falls back to Georgia gracefully.

## Hubs

Each entry in `Config.Hubs` is **one coord, two roles** — the NPC stands there
*and* the teleport arrival lands there. Required fields: `id`, `label`, `coord`.
Optional: `region`, `category`, `price`, `image`, `blipLabel`, and any of the
`NpcDefaults` overrides (`model`, `scenario`, `interactDist`, `interactKey`,
`blipSprite`).

```lua
{
    id        = 'valentine',
    label     = 'Valentine',
    region    = 'The Heartlands',
    category  = 'town',          -- drives the footer icon
    coord     = vector4(-314.78, 784.45, 117.46, 90.0),
    price     = 50,
    image     = 'images/valentine.jpg',
    blipLabel = 'Valentine Stagecoach',
},
```

`category` values: `town`, `city`, `outpost`, `wilderness`, `ranch`,
`mountain`, `camp`.

## Usage

Walk up to any configured hub NPC. A prompt appears — press `G` (default)
to open the menu, click a destination card to teleport. The player must be
on foot; mounted or seated players see a dismount-required notice instead.

## License

Private — Native Scripts internal use.
