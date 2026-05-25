# ns-vineyard

Üzüm yetiştirme + şarap üretim sistemi. Cross-framework via [ns-lib](/scripts/ns-lib).

## Akış

```
[Bağ tarlası]              [Pres makinesi]            [Kiler — sabit slot'lar]
  3×3 cell, 2×2 vine          public, herkese açık       per-player, client-only
  → kilit aç ($100/cell)      → 10 üzüm = 1 kova         → fıçı yerleştir
  → asma yetiştir (5 dk)      → animasyon + cooldown     → 2 kova = dolu fıçı
  → hasat (1-10 üzüm)                                    → bekle (kalite 1→5)
                                                         → topla (4 şişe wine_q[N])
```

## Gereksinimler

- **ns-lib** (zorunlu) — herhangi bir desteklenen framework çalışıyor olmalı (VORP, RSG-Core, RedEM:RP, ESX, QBCore)
- **oxmysql** veya **mysql-async**
- (Önerilen) **ox_lib** — daha güzel notify

## Kurulum

1. `resources/ns-vineyard/` altına bu klasörü kopyala
2. `sql/install.sql` dosyasını veritabanına uygula
3. Aşağıdaki itemleri framework'ünün item DB'sine ekle (bkz. [Items](#items))
4. `server.cfg`'ye `ensure ns-lib` ve sonrasına `ensure ns-vineyard` ekle
5. Sunucuyu restart et

## Items (envanterine ekle)

| Item adı | Açıklama | Stackable |
|---|---|---|
| `grape` | Üzüm | yes |
| `grape_juice` | Üzüm Suyu (kova) | yes |
| `wine_q1` | Genç Şarap | yes |
| `wine_q2` | Olgun Şarap | yes |
| `wine_q3` | Kaliteli Şarap | yes |
| `wine_q4` | Premium Şarap | yes |
| `wine_q5` | Vintage Şarap | yes |

### ox_inventory (`data/items.lua`)
```lua
['grape']       = { label = 'Üzüm',           weight = 50,  stack = true },
['grape_juice'] = { label = 'Üzüm Suyu',      weight = 500, stack = true },
['wine_q1']     = { label = 'Genç Şarap',     weight = 600, stack = true },
['wine_q2']     = { label = 'Olgun Şarap',    weight = 600, stack = true },
['wine_q3']     = { label = 'Kaliteli Şarap', weight = 600, stack = true },
['wine_q4']     = { label = 'Premium Şarap',  weight = 600, stack = true },
['wine_q5']     = { label = 'Vintage Şarap',  weight = 600, stack = true },
```

### vorp_inventory (SQL)
```sql
INSERT INTO items (item, label, type, usable, can_remove) VALUES
  ('grape',       'Üzüm',           'item_standard', 0, 1),
  ('grape_juice', 'Üzüm Suyu',      'item_standard', 0, 1),
  ('wine_q1',     'Genç Şarap',     'item_standard', 0, 1),
  ('wine_q2',     'Olgun Şarap',    'item_standard', 0, 1),
  ('wine_q3',     'Kaliteli Şarap', 'item_standard', 0, 1),
  ('wine_q4',     'Premium Şarap',  'item_standard', 0, 1),
  ('wine_q5',     'Vintage Şarap',  'item_standard', 0, 1);
```

### qb-core / rsg-core (`shared/items.lua`)
```lua
grape       = { name = 'grape',       label = 'Üzüm',           weight = 50,  type = 'item', image = 'grape.png',       unique = false, useable = false, shouldClose = false, combinable = nil, description = 'Üzüm.' },
grape_juice = { name = 'grape_juice', label = 'Üzüm Suyu',      weight = 500, type = 'item', image = 'grape_juice.png', unique = false, useable = false, shouldClose = false, combinable = nil, description = 'Bir kova üzüm suyu.' },
wine_q1     = { name = 'wine_q1',     label = 'Genç Şarap',     weight = 600, type = 'item', image = 'wine.png',        unique = false, useable = true,  shouldClose = true,  combinable = nil },
wine_q2     = { name = 'wine_q2',     label = 'Olgun Şarap',    weight = 600, type = 'item', image = 'wine.png',        unique = false, useable = true,  shouldClose = true,  combinable = nil },
wine_q3     = { name = 'wine_q3',     label = 'Kaliteli Şarap', weight = 600, type = 'item', image = 'wine.png',        unique = false, useable = true,  shouldClose = true,  combinable = nil },
wine_q4     = { name = 'wine_q4',     label = 'Premium Şarap',  weight = 600, type = 'item', image = 'wine.png',        unique = false, useable = true,  shouldClose = true,  combinable = nil },
wine_q5     = { name = 'wine_q5',     label = 'Vintage Şarap',  weight = 600, type = 'item', image = 'wine.png',        unique = false, useable = true,  shouldClose = true,  combinable = nil },
```

## Yapılandırma

Tüm ayarlar `config.lua` içinde. En önemli olanlar:

| Ayar | Default | Açıklama |
|---|---|---|
| `Config.PlotOrigin` | `vector3(2604, -1041, 47)` | Bağ tarlasının merkez koordinatı — server'ında değiştir |
| `Config.PressLocation` | `vector3(2640, -1042, 46)` | Pres makinesi konumu |
| `Config.CellarLocation` | `vector3(2630, -1050, 47)` | Kiler merkezi (slot'lar civarda dizili) |
| `Config.BarrelSlots` | 5 slot, x ekseninde 1.5m aralıklı | Her slot konum + heading |
| `Config.GrowDuration` | `300` | Saniye, asmadan üzüm hasada (5 dk — test/dev) |
| `Config.QualityThresholds` | `{0,300,900,1800,3600}` | Kalite seviye eşiği (1→5) |
| `Config.CellCost` | `100` | Hücre açma maliyeti |
| `Config.WinePerBarrel` | `4` | Bir fıçıdan çıkan şişe sayısı |

Süre ölçeğini canlı sunucu için **orta** veya **yavaş** yap — README'nin başındaki [config.lua](./config.lua) dosyasındaki yorum satırlarına bak.

## Mimarisi

```
client (her oyuncu kendi propunu görür)
  ├ propmgr.lua      — local-only prop registry, cleanup
  ├ main.lua         — state + DrawText3DLocal helper
  ├ vineyard.lua     — vine props, hücre aç + hasat prompt
  ├ press.lua        — pres animasyonu + prompt
  └ barrel.lua       — slot props, kova ekle + topla prompt + DrawText3D quality

server (DB + validation)
  ├ db.lua           — SQL queries (NSLib.Query)
  ├ main.lua         — lifecycle, OnPlayerLoaded, sync push
  ├ vineyard.lua     — UnlockCell, HarvestVine (mutex + dist + time check)
  ├ press.lua        — PressGrapes (cooldown + dist check)
  └ barrel.lua       — PlaceBarrel, AddBucket, CollectWine (slot bazlı)
```

### Sync stratejisi

1. Player join → `OnPlayerLoaded` → DB load → cache → `syncState` event push
2. Client cache + server clock offset tutar, zaman hesaplarını lokalde yapar
3. Action olduğunda → server validate → DB update → cache update → yeni `syncState`
4. Tüm time-based UI (olgunlaşma countdown, kalite progress) sadece client tarafında render

### Anti-cheat

- Cell ID, vine idx, slot ID server'da validate edilir
- Distance check her action'da server-side (`GetEntityCoords`)
- Inventory işlemleri atomic (mutex per-source)
- Cell maliyet düşmeden cell unlock olmaz
- Kalite hesabı `filled_at`'tan, server zamanı baz alır

## SSS

**Q: Asma propu görünmüyor**
A: `Config.VineModelEmpty` / `Config.VineModelRipe` hash'lerini kendi RedM build'in ile doğrula (CodeWalker / OpenIV).

**Q: DrawText3D Türkçe karakterleri yanlış gösteriyor**
A: RedM `LITERAL_STRING` ile UTF-8 destekler ama bazı font'lar uyumsuz. `SetTextFontForCurrentCommand(0)` yerine `(2)` veya `(9)` dene.

**Q: Pres'i ücretli yapmak istiyorum**
A: `server/press.lua`'da `NSLib.RemoveMoney` çağrısı ekle, config'e `PressCost` koy.

**Q: ox_inventory metadata'lı tek wine item istiyorum**
A: `config.lua`'da `Config.Items.wineQ`'yu tek isime çevir, `server/barrel.lua`'da `CollectWine`'da `NSLib.AddItem(source, 'wine', amount, { quality = quality })` yap. README'deki 5 item'i tek `wine`'a indir.

## License

MIT
