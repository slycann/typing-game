# Letterlings

A story-driven typing game that teaches kids aged 5–10 to use a real keyboard.

**Play it:** https://slycann.github.io/typing-game/ (works offline after the first visit; progress stays on the device). It's a web app
(TypeScript + Phaser 4 + Vite), also wrapped with Capacitor as an App Store app for iPad (with a keyboard) and Apple-silicon Macs.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

## Check it

```bash
npm test           # unit tests (Vitest)
npm run test:e2e   # plays through in a real browser (Playwright); uses a dev-only star grant to reach later worlds
npm run build      # typecheck + production build into dist/
BASE_URL=https://slycann.github.io/typing-game/ npx playwright test milestone1   # smoke-test the live site
```

Pushing to `main` runs `.github/workflows/deploy.yml`, which tests, builds and publishes to GitHub Pages.

## iPad app

```bash
npm run ios                     # build, copy into ios/ and open Xcode
scripts/ios-release.sh upload   # archive and upload to App Store Connect (run from the Mac's desktop session)
```

The App Store listing text and submission checklist are in `docs/app-store.md`.

## Where things live

- `src/input/` – keyboard events (`KeyboardInput.ts`) and the Mac key layout with finger assignments (`keyLayout.ts`)
- `src/ui/` – on-screen keyboard, target tiles, buttons, speech bubbles, HUD, banners
- `src/engine/` – scoring, mastery (fading hints), progress and unlocks, power-ups, leaderboards, daily adventure, ranks and badges
- `src/curriculum/` – key introduction order (home row → capitals → numbers → symbols → Option accents), word bank and phrases, the seven worlds and their level content, speed-race passages
- `src/games/` – the mini-games (Finger Fitness, Key Hop, Bubble Pop, Fruit Catch, Word Train, Bake Shop, Story Pages, Grumble's Rainy Day) on a shared `GameBase` (`SequenceGame` for word-at-a-time games)
- `src/scenes/` – title, players, story, world map, workshop, garden, rocket race, leaderboard, shop, treehouse, sticker book, grown-ups
- `src/shop/` – the shop catalogue
- `src/save/` – player profiles and progress, with versioned migrations
- `src/art/` – original characters, scenery, world themes, shop items and avatar; static shapes are baked into textures (`bake.ts`)

Fonts: Andika and Fredoka (SIL Open Font License), bundled in `public/assets/fonts/`.
