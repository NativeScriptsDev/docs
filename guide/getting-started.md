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

1. **ns-lib**'i (free) Tebex'ten indir: [nativescripts.com/package/7428342](https://nativescripts.com/package/7428342)
2. İstediğin ns-* scripti [nativescripts.com](https://nativescripts.com) kataloğundan al
3. İkisini de `resources/` klasörüne at
4. `server.cfg`'ye **sırayla** ekle (ns-lib önce):
   ```cfg
   ensure ns-lib
   ensure ns-vineyard
   ```
5. Her script'in README'sindeki SQL ve item kayıtlarını uygula
6. Sunucuyu restart et — console'da:
   ```
   [ns-lib] v1.0.0 initialized
   [ns-lib] framework=vorp | inventory=vorp | sql=oxmysql
   [ns-lib] adapters loaded ✓
   ```

## Sıradaki

- [Bridge mimarisi →](./bridge) — adapter pattern, API yüzeyi, runtime detection
- [Convention'lar →](./conventions) — kod stili, klasör yapısı, namespace mantığı
- [Scriptler →](/scripts/ns-lib) — her script'in detaylı dokümantasyonu
