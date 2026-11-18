# Touchline 26

**Classic 2D is the main game.** The approved fixed overhead pitch and match engine are the foundation. Make future changes in `touchline-26/`; `touchline-classic/` remains a copy of the approved motion review.

## Watch a match

Choose **Highlights** beneath the pitch or in **Match setup**, then press **Kick off**. You can change the viewing mode mid-match without restarting. A passage already on screen plays out before the new setting takes over.

| Mode | Best for | Approx. viewing time at 1× | What you'll see |
| --- | --- | ---: | --- |
| **Full Match** | Tactical analysis | 15–25 min | Continuous play: routine possession, off-ball movement, buildup and defending, as well as chances. |
| **Comprehensive** | Important matches | 10–18 min | More attacking spells, defensive recoveries and restarts, with longer buildup and aftermath. Still skips quiet play. |
| **Extended** (default) | Normal league matches | 7–12 min | Key moments plus selected attacks, chances and attacking set pieces. |
| **Key** | Quick season progression | 3–7 min | Goals, major chances, penalties, woodwork and dismissals. |

These are real-world estimates, not timers or quotas. Actual viewing time depends on the fixture, device, replay settings and pauses. All modes still play 90 in-game minutes plus stoppage time.

Highlight modes fast-forward through quiet play, then show real buildup, the action itself and what follows. How much footage you see depends on the fixture. The same engine still plays every tick and records all events and stats. With the same seed and instructions at the same match times, the four modes produce identical results.

At **1×**, one shared broadcast pace moves routine play along and eases into attacks, shots and key restarts so they stay readable. **2× / 4×** speed up that same presentation in any mode. A highlight never changes the speed of a passage you are watching. Full Match runs continuously with no automatic cuts. **Next highlight** jumps to the next qualifying passage (a Key moment in Full Match). **Stop here** ends a search and shows the current passage without changing the mode. The game still stops at halftime and full time. In the Touchline desk, changes take effect at the displayed effective time; they do not alter recorded buildup. Goal replays are separate and can be turned off in Match setup.

The **referee** is the dark square marked **R**. The official follows the play and appears in both highlights and goal replays. Existing foul, offside and card decisions are unchanged.

## How players choose

In v0.4.5, the ball carrier reads the play before committing. An onside run can open a through ball, but a defender closing in can make a short pass back the better option. A clean reception can lead to a quick pass or strike; a closed body position can cost an extra touch. Out wide, a cross competes with cutting inside, carrying on and recycling. A pause can buy a better angle or give the defender time to win it back.

Role, attributes, individual tendencies, fatigue, tactics and the score affect those choices. The seed breaks close calls between credible options; it does not select a prewritten attack. This changes the football a seed produces compared with older builds, not the ability to reproduce a fixture within this build. The Classic 2D presentation, ball physics and viewing controls are unchanged.

## Play and build

Open `index.html` offline, or run `npm run preview` with Node.js 20+. The preview builds from `src/` and serves on port `4173` (`PORT` overrides it). No installs or accounts are required. Edit `src/`, then run `npm run build` to regenerate the HTML.

- `npm test` checks the standalone build, choices under pressure, legal targets, seeded play, ball mechanics, the referee’s visual tracking and replay snapshots. Highlight tests cover mode eligibility, bounded search, exact event and whistle stops, the buildup clock, and deterministic play with matching tactics and substitutions.
- `npm run test:sim -- 3` runs three complete seeded fixtures.

## Pinned checkpoints

- `classic-2d-approved` — local Git tag for the approved Classic 2D foundation. Its standalone HTML SHA-256 is `d19da99cb41ae886a1bef224ec712e67388556c39615f240b45909e3c3aa1aed`.
- `pre-classic-baseline` — the earlier playable version, kept for rollback or comparison.

The original uploads are unchanged. Roadmap steps are reviewed one at a time.
