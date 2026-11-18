# Touchline 26

**Classic 2D is the main game.** The approved fixed overhead pitch and match engine are the foundation. Make future changes in `touchline-26/`; `touchline-classic/` remains a copy of the approved motion review.

## Watch a match

Pick **Highlights** beneath the pitch or in **Match setup**. You can switch during a match without restarting it.

| Mode | What you'll see |
| --- | --- |
| **Key** | Goals, penalties, red cards, woodwork and the clearest chances. |
| **Standard** | Key moments plus shots on target and other good chances. |
| **Extended** | Every shot, dangerous crosses and attacking set pieces, with more buildup. |
| **Comprehensive** | Extended coverage plus promising attacks, more restarts and defensive moments. |
| **Full Match** | Continuous play from kickoff to full time. This is the default. |

Highlight modes fast-forward the same simulation, show the buildup before a moment, then play through the action and aftermath. Match length and results are not shortened. Play stops at halftime for changes. The **1× / 2× / 4×** controls set how fast visible play runs. **Next highlight** searches to the next moment (a Key moment in Full Match); **Watch live** cancels a search and switches to Full Match. Goal replays are separate and can be turned off in Match setup.

## Play and build

Open `index.html` offline, or run `npm run preview` with Node.js 20+. The preview builds from `src/` and serves on port `4173` (`PORT` overrides it). No installs or accounts are required. Edit `src/`, then run `npm run build` to regenerate the HTML.

- `npm test` checks the standalone build, seeded play, ball mechanics, acceleration and replay snapshots. Highlight tests cover mode selection, bounded skipping, exact event/break stopping, the buildup clock and deterministic results.
- `npm run test:sim -- 3` runs three complete seeded fixtures.

## Pinned checkpoints

- `classic-2d-approved` — local Git tag for the approved Classic 2D foundation. Its standalone HTML SHA-256 is `d19da99cb41ae886a1bef224ec712e67388556c39615f240b45909e3c3aa1aed`.
- `pre-classic-baseline` — the earlier playable version, kept for rollback or comparison.

The original uploads are unchanged. Roadmap steps are reviewed one at a time.
