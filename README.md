# 돈 화분 (Money Pot)

An idle mini-game: plant a ₩100 coin in a flower pot, water it, and watch it grow into a ₩50,000 note. Pull the money out of the soil, bank it, and reach ₩100,000,000, then carry on to ₩1,000,000,000.

Built with React, TypeScript, Vite and Motion. No backend: progress is saved in the browser.

## How it plays

- **Plant, water, wait.** Money grows ₩100 → ₩500 → ₩1,000 → ₩5,000 → ₩10,000 → ₩50,000 in two minutes, but only while the soil is wet.
- **Pull to harvest.** Drag a note upwards and let go. Bigger notes sound and shake bigger.
- **Expand.** Buy more pots (5 slots), garden beds (9) and farms (100). On a farm you sweep a finger across grown notes to cut them like rice.
- **Automate.** Water tanks refill the soil; hired workers harvest, replant and water for a salary.
- **Gestures.** Swipe sideways to move between plots.
- **Idle.** Time away is credited up to 8 hours.

## Run it

```bash
npm install
npm run dev      # local dev server
npm run build    # type-check and build to dist/
```

## Project layout

```
src/
  game/
    config.ts     every tunable number (grow times, prices, salary, offline cap)
    engine.ts     pure game logic: no React, no DOM, no clock of its own
    feedback.ts   Web Audio sounds and vibration
    storage.ts    localStorage save/load
  components/     React views (plots, farm, shop, vault, ending); plotGeometry.ts maps soil positions in each photo
  art/            drop-in artwork (see below)
  App.tsx         wires state, gestures and views together
```

`engine.ts` takes a state and returns a new one, so the whole game can be simulated without a browser. Offline progress is computed in closed form (`workInBulk`) instead of replaying every worker action, with only the last four minutes stepped exactly so the board looks right on return.

## Artwork

The plots and money are AI-generated photos, shot from above at about 60 degrees with light from the upper left, cut out onto transparent backgrounds and stored as WebP in `src/art/`. Anything missing falls back to a drawing in code.

| File name | What it is | Status |
| --- | --- | --- |
| `pot` | Terracotta pot with flat soil | In use |
| `farm` | Square wooden field plot | In use (also used for the garden bed) |
| `bed` | Garden bed | Optional; the farm photo is used until one exists |
| `money-1000`, `money-5000`, `money-10000`, `money-50000` | Banknote rolled into a cylinder, standing upright | In use |
| `money-100`, `money-500` | Coin | In use (rendered from the code drawing; replace with photos later) |
| `veranda` | Floor background | Drawn in code (concrete) for now |
| `tank`, `worker` | Shop pictures | Drawn in code for now |

Replacing `pot`, `bed` or `farm` means re-measuring the soil area in `src/components/plotGeometry.ts`, since money is placed by fractions of the photo.

Coins and notes are raster images on purpose: Chrome's forced dark mode darkens shapes drawn in code but leaves images alone.

Banknote artwork follows the Bank of Korea's design-use rules: no portraits are drawn, and the portrait area is left as a plain oval.

## Deploy

Pushing to `main` builds and publishes to GitHub Pages through `.github/workflows/deploy.yml`. One-time setup: repository **Settings → Pages → Source: GitHub Actions**.

The share-preview tags in `index.html` assume the site lives at `https://edibulb.github.io/money-pot/`. Update them if the repository name changes.
