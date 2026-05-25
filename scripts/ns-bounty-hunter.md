# ns-bounty-hunter

RedM için cross-framework bounty hunter sistemi: wanted defteri (NUI), NPC + oyuncu + sivil bounty üretimi, sheriff posterleri, coop posse, kalıcı DB.

> **Discord:** https://discord.gg/UyyngemnF8 — destek, bug raporu, öneri.

---

## Özellikler

### Üç bounty kaynağı
- **NPC bounty** — sistem `Config.NpcInterval` (varsayılan 30 dk) aralıklarla otomatik üretir; isim/alias/ped/lokasyon `Config.NpcBountyPool`'dan random çekilir.
- **Sheriff wanted** — `Config.SheriffJobs` içindeki job sahibi oyuncular, gerçek oyunculardan suç-temelli wanted oluşturur. Treasury (devlet hazinesi) ödemeyi karşılar.
- **Sivil bounty** — herhangi bir oyuncu, kendi cebinden başka bir oyuncuya ödül koyabilir (`Config.MinCivilianBounty`–`MaxCivilianBounty`).

### Wanted defter (NUI)
- Sheriff ofislerinde **G** ile açılır (`Config.OpenLedgerKey`); bounty board prop'unda da aynı tuş çalışır.
- Sol sayfa liste, sağ sayfa Wanted poster detayı, ACCEPTED damga animasyonu.
- Sheriff wanted ve civilian bounty oluşturma sekmeleri (`Config.SheriffWantedEnabled` / `Config.CivilianBountyEnabled` ile toggle).

### Görev akışı
- Bounty kabul edildikten sonra harita üzerinde **arama alanı çemberi** (`Config.MissionAreaRadius`, default 180 m) işaretlenir.
- Hedef ped'in spawn pattern'ı (`camp` / `cabin` / `ambush`) düşman sayısını ve trigger radius'unu belirler.
- Hedef artık kamp ateşinde yanmıyor — `targetPropOffset` ile ateşten uzakta spawn olur ve `SetEntityProofs` ile yangın/patlama korumalı.
- Diri / ölü yakalama: `alive` modda hogtie + ata yükleme zorunlu; `dead_or_alive` modda diri getirmek **bonus ödül** verir (`Config.DeadOrAliveAliveBonusPct`, default %20). Alive-only ihlal cezalandırılır (`Config.AliveOnlyDeadPenaltyPct`, default %20).

### Wanted region & last-seen blip
- Player/civilian bounty'lerde hedefin bulunduğu RDR3 region (devlet/district) harita üzerinde **kırmızı wanted bölgesi** olarak işaretlenir (`Config.WantedRegionEnabled`).
- `Config.WantedRegionGlobal = true` → herkes görür; `false` → yalnız avcı + grup.
- Region devre dışıysa eski **last-seen point blip** akışı çalışır (`Config.LastSeenBlipInterval`).

### Coop posse
- Lider grup oluşturur, davet eder, **yüzde paylarını manuel ayarlar** (toplam %100, üye başı min `Config.GroupShareMin`%).
- Max grup boyutu `Config.MaxGroupSize`.
- Kabul edilen bounty grup adına işlenir; her üyenin payı capture sonrası otomatik dağıtılır.

### Sheriff posterleri
- Sheriff'ler `/poster` komutuyla yerleştirir; `object_gizmo` resource'u ile pozisyon/rotasyon ayarlanır.
- DB'de kalıcı; `Config.MaxPostersPerWanted` ve `Config.MaxPostersTotalPerSheriff` ile limitli.
- Yerleştiren veya başka bir sheriff yırtıp kaldırabilir.
- Opsiyonel: `Config.PosterRequireItem = true` → `poster_blank` envanter eşyası tüketilir.

### Persistence
- `oxmysql` üzerinden NSLib SQL adapter. Tüm bounty'ler, suçlar, posterler, capture log ve sheriff cooldown DB'de.
- Server cache'de aktif/accepted bounty'ler in-memory tutulur; DB'ye yazıldıkça refresh edilir.

---

## Kurulum

### 1. Bağımlılıklar
- `ns-lib` — framework adapter (VORP / RSG-Core / RedEM:RP otomatik tespit). Zorunlu.
- `object_gizmo` — poster yerleştirme için pozisyon/rotasyon gizmo. Zorunlu (poster özelliği için).
- `oxmysql` — NSLib SQL üzerinden kullanılır.
- `ns-notify` (opsiyonel) — yoksa `NSLib.Notify` fallback'i devreye girer.

### 2. SQL migration
```bash
mysql -u <user> -p <db> < sql/install.sql
```
Tablolar: `bounty_targets`, `bounty_crimes`, `bounty_posters`, `bounty_capture_log`, `bounty_sheriff_cooldown`. Eski kurulumlar için idempotent `MigratePosterRotation` runtime'da `rot_x` / `rot_y` kolonlarını ekler.

### 3. NUI build
```bash
cd ui
npm install
npm run build
```
Build çıktısı `html/` klasörüne yazılır. `npm run dev` ile hot-reload geliştirme.

### 4. server.cfg
```
ensure ns-lib
ensure object_gizmo
ensure ns-notify          # opsiyonel
ensure ns-bounty-hunter
```

---

## Oyun içi kullanım

### Sheriff
1. Bir sheriff ofisinde dur → **G** ile defter açılır.
2. Üst sekme: **Create Wanted** → hedef oyuncu ID, suç(lar), capture mode seç → onayla.
3. Treasury ödemeyi karşılar. Hedef oyuncuya otomatik bildirim gider, wanted region harita üzerinde açılır.
4. Aynı hedefe yeniden wanted için `Config.SheriffCreateCooldown` (default 60 dk) bekle.

### Sivil oyuncu — bounty koymak
1. Defterden **Create Bounty** sekmesi (toggle açıksa).
2. Hedef ID + ödül miktarı + capture mode → cebinden tahsil edilir.
3. Hedef ve avcılar bilgilendirilir.

### Hunter
1. Defteri aç → **Available** listesinden bir bounty seç → **Accept**.
2. Harita üzerinde arama alanı (büyük çember) belirir; içine gir.
3. Trigger radius'a yaklaşınca düşmanlar + hedef spawn olur, kafa blip'i belirir.
4. Düşmanları temizle → hedef ya kaçar ya da pozisyonunu korur.
5. Yakala: **alive** modda lasso + hogtie + ata yükle; **dead_or_alive** modda öldür veya canlı getir (bonus için).
6. Sheriff ofisi `Config.TurnInRange` (default 4m) içine gir → **G** ile teslim et.

### Coop
- Defterde **Group** sekmesi: Create → Invite → davetli `/bgrupkabul` ile kabul eder (ileride popup'a dönüşecek).
- Lider Set Shares ile pay yüzdelerini ayarlar (toplam %100, min %10).
- Lider bounty kabul ettiğinde tüm üyeler aynı görevi paylaşır; capture sonunda yüzdelere göre dağılım yapılır.

### Sheriff poster yerleştirme
1. Defteri aç → bir wanted seç → **Place Poster** sekmesi.
2. `/poster` komutu otomatik tetiklenir; `object_gizmo` ile prop'u yerleştir.
3. ESC = onayla, BCKSP = iptal.
4. Yerleştirilen poster'a yaklaşan oyuncular **G** ile detayı görür; sheriff veya yerleştiren **Tear Poster** ile sökebilir.

---

## Chat komutları

| Komut | Taraf | Açıklama |
|---|---|---|
| `/bountyledger` | client | Defteri her yerden açar (debug/test) |
| `/cancelbounty` | client | Aktif kabul edilmiş bounty'i iptal et |
| `/bountytarget` | client | Mevcut hedefe waypoint blip'i koy |
| `/poster` | client | Poster yerleştirme moduna gir (sheriff veya yetkili) |

Komut adı `Config.PosterCommand` ile değiştirilebilir.

---

## Server exports

Diğer resource'lardan `exports['ns-bounty-hunter']:X(...)` ile çağrılabilir.

| Export | İmza | Açıklama |
|---|---|---|
| `getTreasury` | `() → integer` | Devlet hazinesi bakiyesi |
| `depositTreasury` | `(amount: integer)` | Hazineye para yatır (admin/economy event) |
| `forceNpcBounty` | `() → string\|nil` | Bir NPC bounty üret, ID döner |
| `getCacheSize` | `() → integer` | Server cache'deki aktif bounty sayısı |

**Client exports:**
| Export | İmza | Açıklama |
|---|---|---|
| `getGroupState` | `() → table\|nil` | Local oyuncunun grup state'i |

---

## Önemli net event'ler

> Tüm event'ler `ns-bounty-hunter:` namespace'i altında. Aşağıda dış entegrasyon için faydalı olabilecekler listelenir.

**Server'a tetiklenenler (client → server):**
- `ns-bounty-hunter:server:characterReady` — karakter seçimi tamamlandığında client'tan çağrılmalı (state sync'i tetikler).
- `ns-bounty-hunter:server:acceptBounty(bountyId)` — bir bounty kabul et.
- `ns-bounty-hunter:server:cancelBounty(bountyId, reason)` — iptal et.
- `ns-bounty-hunter:server:turnInTarget(bountyId, captureState, x, y, z, horseNet)` — sheriff ofisinde teslim.
- `ns-bounty-hunter:server:createPlayerWanted({ targetId, crimes, captureMode, portraitUrl })` — sheriff wanted oluştur.
- `ns-bounty-hunter:server:createCivilianBounty({ targetId, amount, captureMode, portraitUrl })` — sivil bounty oluştur.

**Client'a tetiklenenler (server → client):**
- `ns-bounty-hunter:client:bountyAccepted(b, isGroupMember)` — görev başlat.
- `ns-bounty-hunter:client:bountyExpired(bountyId, reason)` — görev sonlandı.
- `ns-bounty-hunter:client:wantedRegionOpen(hash)` / `Close(hash)` — region blip'i toggle.
- `ns-bounty-hunter:client:ledgerNeedsRefresh` — NUI fetch yenile.

Tam liste için `server/callbacks.lua` ve `client/*.lua` `RegisterNetEvent` çağrılarına bak.

---

## Config rehberi

`config.lua` üst gruplar:

### Genel & zaman
- `Config.Debug` (bool) — debug log/print
- `Config.BountyLifetime` (saniye) — aktif bounty'nin DB'de açık kalma süresi
- `Config.ArchiveAfter` (saniye) — expired → archived geçişi
- `Config.ExpireCheckInterval` (saniye) — periyodik temizlik tick'i

### NPC üretim
- `Config.NpcInterval` — yeni bounty üretim aralığı
- `Config.MaxActiveNpcBounties` — eş zamanlı NPC bounty limiti
- `Config.NpcBountyPool` — isim/alias/ped/spawn pattern/lokasyon havuzu
- `Config.NpcPortraits` — portreler (male/female)
- `Config.NpcSheriffNames` — random NPC sheriff isimleri

### Suç sistemi
- `Config.Crimes` — `{ key = { name, baseAmount, multiplierRange } }` sözlüğü
- Toplam ödül = Σ (baseAmount × random[multiplierRange])

### Sheriff
- `Config.SheriffJobs` — wanted oluşturma yetkisi olan job adları (`{'police', 'sheriff', 'deputy', 'sheriff_chief', 'marshal'}`)
- `Config.SheriffCreateCooldown` (saniye) — hedef başına cooldown
- `Config.SheriffOffices` — defter erişim noktaları + npc ofset/heading
- `Config.SheriffNpcModel` / `Config.SheriffNpcScenario` / `Config.SheriffNpcSpawnRadius` — sheriff ped davranışı

### Bounty board
- `Config.BountyBoardProp` — tahta model hash'i
- `Config.BountyBoardInteractDistance` / `Config.BountyBoardInteractKey`
- `Config.BountyBoards` — yerleşim listesi (boş pos = spawn yok)

### Coop
- `Config.MaxGroupSize` — max üye
- `Config.GroupShareMin` — üye başı min pay yüzdesi
- `Config.GroupShareDefault` — `{ leader = 50 }` default; kalan eşit dağıtılır

### Spawn pattern
- `Config.SpawnPatterns.{camp,cabin,ambush}` — her biri `{ propModel, baseEnemyCount, enemyModels, targetModel, formationRadius, triggerRadius }`
- Opsiyonel `targetPropOffset` — hedef ped prop'tan kaç m uzakta spawn (camp default 3.0)

### Capture
- `Config.AliveOnlyDeadPenaltyPct` — alive-only ihlal cezası %
- `Config.DeadOrAliveAliveBonusPct` — dead-or-alive bonus %
- `Config.TurnInRange` — sheriff ofisine teslim mesafesi (m)
- `Config.HorseDistanceMax` — alive teslimde at uzaklığı limiti (m)
- _Evidence item akışı kaldırıldı_ — hedef ped fiziksel olarak taşınıp doğrudan sheriff ofisine teslim edilir (alive: hogtied + ata yüklü; dead: ceset taşınır).

### Poster
- `Config.PosterPropModel` — wanted poster prop
- `Config.MaxPostersPerWanted` / `Config.MaxPostersTotalPerSheriff` — limitler
- `Config.PosterRequireItem` (bool) + `Config.PosterPlaceItem` (item adı) — envanter kısıtı
- `Config.PosterInteractDistance` / `Config.PosterStreamDistance`
- `Config.PosterInteractKey` / `Config.PosterCommand`
- `Config.DefaultWantedImage` — portrait yoksa fallback (lokal dosya veya URL)

### Defter
- `Config.OpenLedgerPromptDistance` / `Config.OpenLedgerKey`

### Blip ayarları
- Sprite hash'leri: `BlipSheriffOffice`, `BlipMissionArea`, `BlipTargetHead`, `BlipEnemy`, `BlipDestOffice`, `BlipPosterPlaced`
- `Config.BlipDestOfficeScale` — teslim ofisi blip büyütme
- `Config.MissionAreaRadius` — arama alanı çemberi yarıçapı
- `Config.LedgerBlipZOffset` — sheriff ofisi blip z ofset

### Toggle
- `Config.SheriffWantedEnabled` — sheriff sekmesini aç/kapat
- `Config.CivilianBountyEnabled` — sivil sekmesini aç/kapat

### Civilian bounty
- `Config.MinCivilianBounty` / `Config.MaxCivilianBounty` — server-side clamp
- `Config.LastSeenBlipInterval` / `Config.LastSeenBlipDuration` — eski blip akışı
- `Config.PlayerBountyBlipRange` / `Config.PlayerBountyBlipInterval` — proximity coord blip

### Wanted region
- `Config.WantedRegionEnabled` — true = region akışı, false = last-seen blip
- `Config.WantedRegionInterval` — yeniden hesaplama aralığı (s)
- `Config.WantedRegionGlobal` — global mi yoksa avcı-only mi
- `Config.WantedRegions` — region hash + merkez koordinat listesi (state/district/region)

### Mesaj sözlüğü
- `Config.Messages` — tüm oyuncuya gözüken stringler. Format string'ler `%s`/`%d` kullanır.

---

## Database şeması (özet)

| Tablo | Amaç |
|---|---|
| `bounty_targets` | Tüm bounty kayıtları (npc/player/civilian). Status: active → accepted → closed/expired/archived |
| `bounty_crimes` | Her bounty'ye bağlı suçlar (FK CASCADE) |
| `bounty_posters` | Yerleştirilmiş poster pozisyonları + rotasyonları (FK CASCADE) |
| `bounty_capture_log` | Kapatılan bounty'lerin payout audit log'u |
| `bounty_sheriff_cooldown` | Sheriff başına hedef cooldown tablosu |

`status` lifecycle: `active` → `accepted` → `closed` (turn-in) / `expired` (timeout) / `archived` (eski expired)

---

## NSLib bağımlılığı

Tüm framework etkileşimi `ns-lib` üzerinden geçer. Bu resource'un gerektirdiği NSLib API'leri:

- `IsReady()` — bootstrap gate
- `GetIdentifier(src)`, `GetPlayer(src)`, `GetJob(src)`
- `AddMoney(src, amount, account)`, `RemoveMoney(src, amount, account)`, `GetMoney(src, account)`
- `AddItem(src, name, count, meta)`, `RemoveItem(src, name, count)`, `HasItem(src, name, count)`
- `RegisterUsableItem(name, cb)`
- `Notify(src, msg, type, duration)`
- `BlipCreate({...})`, `BlipCreateForEntity({...})`, `BlipRemove(blip)`, `BlipRemoveAll({...})`
- `PedLoadModel(model)`, `PedDelete(ped)`, `PedDeleteAll({...})`
- `Execute(sql, params)`, `QuerySingle(sql, params)`, `Query(sql, params)`

Framework swap: NSLib adapter dosyaları (`ns-lib/adapters/vorp.lua` vb.) değişti, bu resource'a dokunulmaz.

---

## Bilinen sınırlar / TODO

- **Pedheadshot kaldırıldı:** RedM'de `RegisterPedheadshot` native'i yok. Poster portrait şu an `Config.DefaultWantedImage` veya per-wanted `portrait_url` (remote URL) ile çalışıyor; sketch render veya base64 export ileride eklenebilir.
- **DUI removed:** Eski DUI poster akışı (poster_dui.lua, mugshot.lua) fxmanifest'te commented out. NUI overlay tek poster görüntüleyici.
- **Grup daveti chat komutu:** Şu anda `/bgrupkabul` ile kabul ediliyor. Sonraki iter'da ekran popup'ı planlandı.
- **Self-bounty kontrolü:** `selfWanted` server tarafında check edilebilir ama şu an commented out (bounty.lua:209, 299). Production'da etkinleştir.

---

## Lisans / katkı

Bu resource `NativeScriptsDev` GitHub organizasyonunda private repository olarak yayınlanır. Katkı/sorun için Discord: https://discord.gg/UyyngemnF8
