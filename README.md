# Touchline 26

**Review build 01 — playable baseline.** The existing match engine, clubs, artwork and controls are unchanged. This workspace copy restores the original project structure. The uploads are not modified.

## Run

Open `index.html` in a browser for the offline build, or use Node.js 20+:

```sh
npm run preview
```

The preview builds from `src/` and serves on port `4173` (`PORT` overrides it). There are no packages to install. Edit source files, not the bundled `index.html`; run `npm run build` to refresh it.

## Checks

| Command | What it checks |
| --- | --- |
| `npm test` | Rebuild parity, self-contained browser bundle, and reproducible opening play with replay snapshots. |
| `npm run test:sim -- 1` | One complete seeded fixture with position sanity checks. Increase the last number for a longer sample. |
| `npm run test:smoke` | Original full-match DOM shim. It can hit the known goal-banner error; this is separate from the baseline gate. |

Reproduce the existing goal-banner error on a fixed seed: `node -e 'Date.now = () => 7; require("./test/dom-smoke.cjs")'`.

## Review this build

1. Pick your club and opposition, change formation, then kick off.
2. On desktop, pause/resume and switch between Tactics, Squad and Stats.
3. Open the same preview on a phone and note any controls or pitch details you can't reach or read.

This is the comparison point, not a fix for the assessed issues. Goal metadata and added time are next (step 2), followed by highlight pacing, replay and stats consistency, responsive match layout, tactics, coaching feedback, adaptive opponents and balance. Each step gets its own review. Standalone broadcast polish, progression and saves are deferred.
