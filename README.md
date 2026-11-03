# Key Quest (working title)

A story-driven typing game that teaches kids aged 5–10 to use a real keyboard. It's a web app first
(TypeScript + Phaser 4 + Vite), to be wrapped with Capacitor for the App Store (iPad with keyboard + Mac).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

## Check it

```bash
npm test           # unit tests (Vitest)
npm run test:e2e   # plays through in a real browser (Playwright)
npm run build      # typecheck + production build into dist/
```

## Where things live

- `src/input/` – keyboard events (`KeyboardInput.ts`) and the Mac key layout with finger assignments (`keyLayout.ts`)
- `src/ui/` – on-screen keyboard, target tiles, buttons, speech bubbles
- `src/engine/` – typing session scoring (accuracy, WPM, stars) and the seeded RNG
- `src/curriculum/` – key introduction order, word bank, drill generator
- `src/save/` – player profiles and progress, with versioned migrations
- `src/art/` – original SVG characters and scenery; static shapes are baked into textures (`bake.ts`)
- `src/scenes/` – Title, ProfileSelect, NewPlayer, Workshop

Fonts: Andika and Fredoka (SIL Open Font License), bundled in `public/assets/fonts/`.
