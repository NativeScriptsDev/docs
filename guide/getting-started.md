# Genel bakış

**Native Scripts**, FiveM ve RedM (RDR3) sunucuları için cross-framework çalışan bir script ekosistemi. Hedef: tek kod tabanı VORP, RSG-Core, RedEM:RP, ESX ve QBCore'da değiştirmeden çalışsın.

## Çekirdek bileşen: `ns-lib`

Her script `ns-lib` resource'una bağımlıdır. Bridge başlangıçta hangi framework'ün, inventory sisteminin ve SQL driver'ının çalıştığını otomatik tespit eder ve uygun adapter'ı yükler. Script kodu sadece `NSLib.X(...)` çağrılarını kullanır:

```lua
NSLib.OnPlayerLoaded(function(source, player)
    -- player.identifier, .money.cash, .job.name — framework-bağımsız
end)

if NSLib.HasItem(source, 'shovel', 1) then
    NSLib.AddItem(source, 'grape', 5)
    NSLib.Notify(source, '5 üzüm topladın', 'success')
end
```

Hangi framework çalıştığının bilinmesi gerekmez.

## Sunucu kurulumu

1. NativeScriptsDev org'undan istediğin script'i clone'la (her biri ayrı repo):
   ```bash
   cd resources
   git clone https://github.com/NativeScriptsDev/ns-lib.git
   git clone https://github.com/NativeScriptsDev/ns-vineyard.git
   ```
2. `server.cfg`'ye **sırayla** ekle (ns-lib önce):
   ```cfg
   ensure ns-lib
   ensure ns-vineyard
   ```
3. Her script'in README'sindeki SQL ve item kayıtlarını uygula
4. Sunucuyu restart et — console'da:
   ```
   [ns-lib] v1.0.0 initialized
   [ns-lib] framework=vorp | inventory=vorp | sql=oxmysql
   [ns-lib] adapters loaded ✓
   ```

## Sıradaki

- [Bridge mimarisi →](./bridge) — adapter pattern, API yüzeyi, runtime detection
- [Convention'lar →](./conventions) — kod stili, klasör yapısı, namespace mantığı
- [Scriptler →](/scripts/ns-lib) — her script'in detaylı dokümantasyonu
