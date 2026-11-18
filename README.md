# Touchline 26

**Classic 2D is the main game.** This is the approved fixed overhead view and motion engine, promoted from the separate review build without changing gameplay or appearance. Make future changes in `touchline-26/`; `touchline-classic/` remains an unchanged copy of the review.

## Play and build

Open `index.html` offline, or run `npm run preview` with Node.js 20+. The preview rebuilds from `src/` and serves on port `4173` (`PORT` overrides it). No installs or accounts are required. Edit `src/`, then run `npm run build` to regenerate the standalone HTML.

- At **1×**, follow off-ball runs and defensive shifts. Try **Tactics → Passing → Direct** for more lofted deliveries. Ball flight and its ground shadow are visible in live play and goal replays.
- **Next highlight** scans up to 2½ match minutes. **2×** and **4×** speed up continuous play; Quick Match is a later milestone.
- `npm test` checks the standalone build, deterministic play, ball mechanics, acceleration and replay snapshots. `npm run test:sim -- 3` runs three complete fixtures.

## Pinned checkpoints

- `classic-2d-approved` — local Git tag for the approved foundation. Its standalone HTML SHA-256 is `d19da99cb41ae886a1bef224ec712e67388556c39615f240b45909e3c3aa1aed`.
- `pre-classic-baseline` — local Git tag for the playable version this replaces, kept for rollback or comparison.

The original uploads are unchanged. Future roadmap steps start from `classic-2d-approved` and are reviewed one at a time.
