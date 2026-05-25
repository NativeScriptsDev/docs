---
title: Native Scripts
---

# Native Scripts

A cross-framework, modular, production-ready script ecosystem for **FiveM** and **RedM** (RDR3) servers. The same codebase runs unchanged on **VORP, RSG-Core, RedEM:RP, ESX, and QBCore**.

> **🔗 Core:** Every script depends on `ns-lib`, which detects the active framework, inventory system, and SQL driver at runtime. Your code only ever calls `NSLib.X(...)` — adapters route the call to the right implementation.

## Quick start

```bash
cd resources
git clone https://github.com/NativeScriptsDev/ns-lib.git
git clone https://github.com/NativeScriptsDev/ns-kits.git
```

```cfg
ensure ns-lib
ensure ns-kits
```

For full setup details, open the [ns-lib](/scripts/ns-lib) page in the sidebar.

## Scripts

### Core

- **[ns-lib](/scripts/ns-lib)** — Cross-framework abstraction layer. One unified API for VORP/RSG/RedEM/ESX/QB. SQL via oxmysql/mysql-async. Built-in helpers for Discord, permissions, teleport, blips, and peds.

### Resources

- **[ns-auction-house](/scripts/ns-auction-house)** — Cross-framework player marketplace. Direct sale or auction, cash or gold, escrowed bids, mailbox, pending earnings, 6-language UI with admin-editable per-language locale files.
- **[ns-kits](/scripts/ns-kits)** — Western-themed kit menu. 10 kits across three tiers: free (starter / daily / weekly), Discord-gated (member, streamer, booster), and donator (vip, gold, premium, diamond).
- **[ns-loadingscreen](/scripts/ns-loadingscreen)** — RDR2-themed loading screen. Rotating backgrounds, in-screen music player, server rules panel, rotating tips, Discord/website buttons.

## Conventions

Every script follows the same folder layout, naming convention, module pattern, and config format — once you've read one, the rest feel familiar.

## Community

- **GitHub:** [NativeScriptsDev](https://github.com/NativeScriptsDev)
- **Discord:** [discord.gg/UyyngemnF8](https://discord.gg/UyyngemnF8) — bug reports, feature requests, server invites
