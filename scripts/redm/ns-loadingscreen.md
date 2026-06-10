# ns-loadingscreen

RDR2-themed RedM loading screen with rotating backgrounds, music player, server rules and rotating tips.

> **Support / Community:** [discord.gg/UyyngemnF8](https://discord.gg/UyyngemnF8)

## Features

- Cinematic background slider (configurable images and transition speed)
- Background music with play/pause, volume slider and track info
- Animated server logo with subtitle
- Server rules panel
- Rotating tips at the bottom
- Discord & website social buttons (uses `openUrl` native, falls back to `window.open`)
- Loading progress bar that listens to FiveM/RedM `loadProgress` events

## Folder layout

```
ns-loadingscreen/
├── fxmanifest.lua
├── client.lua              # Shuts the loading screen down on playerSpawned
├── README.md
└── html/
    ├── index.html
    ├── style.css
    ├── script.js
    ├── config.js           # All user-facing configuration
    └── assets/
        ├── audio/music.mp3
        └── images/bg*.jpg                # rotating background images
```

## Configuration

All editable settings live in `html/config.js`. Edit it to customize the screen — no other file should need changes.

### Backgrounds

```js
backgroundImages: [
    'assets/images/bg1.jpg',
    'assets/images/bg2.jpg',
    // ...
],
backgroundChangeInterval: 8000, // milliseconds between transitions
```

Drop additional images into `html/assets/images/` and reference them with the same relative path.

### Music

```js
musicFile: 'assets/audio/music.mp3',
musicStartVolume: 0.2,           // 0.0 – 1.0
musicName: "RDR2 Theme Ambient",
musicAuthor: "Red Dead Redemption",
```

Replace the file under `html/assets/audio/` and update the metadata above.

### Server identity & social links

```js
serverName: "NS",
serverSubtext: "Development",

discordText: "discord.gg/UyyngemnF8",
discordLink: "https://discord.gg/UyyngemnF8",
websiteText: "yourwebsite.com",
websiteLink: "https://yourwebsite.com",
```

### Rules and tips

```js
rulesTitle: "Server Rules",
rules: [
    "RDM / VDM is strictly prohibited.",
    // ...
],

tipsInterval: 6000,
tips: [
    "Welcome to the frontier. Build your legacy.",
    // ...
],
```

## Installation

1. Drop the `ns-loadingscreen/` folder into your server `resources/` directory.
2. Add `ensure ns-loadingscreen` to your `server.cfg`.
3. Customize `html/config.js` and replace media in `html/assets/`.
4. Restart the server.

## Notes

- Music auto-play depends on the CEF autoplay policy. In RedM/FiveM CEF this is permissive, so the track starts on its own. If `play()` is rejected the icon stays as "play" and the user starts it manually with one click.
- The loading screen listens for the standard FiveM/RedM `loadProgress` postMessage to update the progress bar. When opened in a normal browser (no `window.invokeNative`) it falls back to a mock loading animation for previewing the design.
- `loadscreen_manual_shutdown 'yes'` means the screen stays up until `client.lua` calls `ShutdownLoadingScreen()` and `ShutdownLoadingScreenNui()` on `playerSpawned`.
