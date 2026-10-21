# Changelog

## 1.1.0 — 2026-10-21

All of the game's art is now pixel art, matching the item icons.

**Art**
- Pixel-art village scenes for all six restoration stages, from overgrown mist to the
  Spirit Tree in bloom. They still crossfade as the village heals.
- Hana is pixel art too, with joyful and moved expressions that change with her lines.
- Pixel-art interface icons (energy, coins, petals, sparkle, gift, torii) and a Tanabata
  bamboo replace the Twemoji emoji, so the game now ships no third-party code.
- New app icon, browser-tab icon and link-preview image.
- Petal Rain and the splash screen drop the Sakura Petal item instead of an emoji.

**Polish**
- The restoration card shows its scene in full colour, with a readable title and a solid
  Restore button even while it's disabled.

**Behind the scenes**
- `tools/process_art.py` rebuilds all of this art from `art-source/`, and
  `tools/make_og.js` renders the link preview.
- 43 end-to-end tests, now also checking that every image loads undistorted and that the
  service worker's version matches the game's.

## 1.0.0 — 2026-10-20

First public release.

**Game**
- Pixel-art items in three chains of seven tiers: Sakura, Food and Tea.
- Five-step village restoration with Hana's story beats and painted scenes that heal
  from overgrown mist to an awakened spirit tree; an epilogue once it's done.
- Quests with a free swap, a Spirit Album, a 7-day daily blessing streak, and the Hanami
  Festival decoration shop.
- Selling: drag an item onto the sell bar to clear a crowded board, with Undo.
- Energy refills from the clock at 1 point per 20 seconds, including while the game is
  closed.
- Board grows a row at levels 5 and 10.

**Experience**
- Fits a single phone screen with no scrolling, from iPhone SE to desktop.
- iOS-style dragging: items lift, trail your finger, and settle with a spring; targets
  swell under the item and preview what a merge will make.
- Menu sheet with Album, Festival and Settings (sound, vibration, analytics opt-out,
  reset, privacy policy, credits).
- Installable (manifest, maskable icon) and fully playable offline.
- Respects reduced-motion settings.

**Behind the scenes**
- Saves migrate from earlier prototype versions.
- Optional, privacy-friendly analytics (off until configured).
- 41 end-to-end tests run before every deploy.

## Prototype history

- 0.12 — Merge particles, flying coins, haptics, reduced-motion support.
- 0.11 — iOS-style drag physics.
- 0.10 — Splash screen, installable web app, scene crossfades.
- 0.9 — Painted village scenes, merge previews.
- 0.8 — Original illustrated items replace emoji.
- 0.7 — Consistent cross-platform emoji.
- 0.6 — Daily blessing and Hanami Festival.
- 0.5 — Board expansion, Spirit Album, save migration.
- 0.4 — Third chain, saving, Hana's dialogue, GitHub Pages deploy.
- 0.3 — Second chain, sound, particles.
- 0.2 — Drag-and-drop and village restoration.
- 0.1 — First playable merge loop.
