# Touchline 26

**Classic 2D is the main game.** The approved fixed overhead pitch and match engine are the foundation. Make future changes in `touchline-26/`; `touchline-classic/` remains a copy of the approved motion review.

## Watch a match

Choose **Highlights** beneath the pitch or in **Match setup**, then press **Kick off**. You can change the viewing mode mid-match without restarting. A passage already on screen plays out before the new setting takes over.

| Mode | Best for | Approx. viewing time at 1× | What you'll see |
| --- | --- | ---: | --- |
| **Full Match** | Tactical analysis | 15–25 min | Continuous play: routine possession, off-ball movement, buildup and defending, as well as chances. |
| **Comprehensive** | Important matches | 10–18 min | More attacking spells, defensive recoveries and restarts, with longer buildup and aftermath. Still skips quiet play. |
| **Extended** (default) | Normal league matches | 7–12 min | Key moments plus selected attacks, chances and attacking set pieces. |
| **Key** | Quick season progression | 3–7 min | Goals, major chances, penalties, woodwork, dismissals and VAR checks. |

These are real-world estimates, not timers or quotas. Actual viewing time depends on the fixture, device, replay settings and pauses. All modes still play 90 in-game minutes plus stoppage time.

Highlight modes fast-forward through quiet play, then show real buildup, the action itself and what follows. How much footage you see depends on the fixture. The same engine still plays every tick and records all events and stats. With the same seed and instructions at the same match times, the four modes produce identical results.

At **1×**, routine movement is about 13% slower than v0.4.5, with a slightly larger reduction for shots and penalties. **2× / 4×** are multiples of that shared pace. The speed of a passage does not depend on the chosen mode. Full Match runs continuously with no automatic cuts; **Next highlight** jumps to the next qualifying passage, and **Stop here** ends a search without changing the mode. The game stops at halftime and full time. In the Touchline desk, changes take effect at the displayed effective time; they do not alter recorded buildup. Goal replays are separate and can be turned off in Match setup.

## Refereeing and VAR

The **referee** is the dark square marked **R** and follows play in the match, highlights and replays. Fouls use the spot of contact for a free kick or penalty. A foul on the penalty-area line is inside the area. Corners and goal kicks use the last touch when the whole ball crosses the goal line. A penalty awarded before the whistle is taken and resolved even if the allotted time runs out during setup.

**VAR** checks close penalty-area decisions and goals where a player involved in the buildup was close to the offside line. The match feed shows the check and the ruling. A reviewed goal is not added to the score or replay queue unless confirmed. VAR uses recorded positions and contact in the 2D simulation; it can confirm or overturn the on-field call. Reviews add stoppage time and are shown in all four viewing modes. This is a limited VAR implementation: it does not review every possible handball, red-card incident or other real-world decision.

## How players choose

In v0.4.5, the ball carrier reads the play before committing. An onside run can open a through ball, but a defender closing in can make a short pass back the better option. A clean reception can lead to a quick pass or strike; a closed body position can cost an extra touch. Out wide, a cross competes with cutting inside, carrying on and recycling. A pause can buy a better angle or give the defender time to win it back.

Role, attributes, individual tendencies, fatigue, tactics and the score affect those choices. The seed breaks close calls between credible options; it does not select a prewritten attack. This changes the football a seed produces compared with older builds, not the ability to reproduce a fixture within this build. The Classic 2D presentation, ball physics and viewing controls are unchanged.

## Play and build

Open `index.html` offline, or run `npm run preview` with Node.js 20+. The preview builds from `src/` and serves on port `4173` (`PORT` overrides it). No installs or accounts are required. Edit `src/`, then run `npm run build` to regenerate the HTML.

- `npm test` checks the standalone build, seeded play, referee tracking, restarts, penalty outcomes and VAR confirmations and reversals. Highlight tests cover bounded search, exact event and whistle stops, the shared clock and deterministic play with matching tactics and substitutions.
- `npm run test:sim -- 3` runs three complete seeded fixtures.

## Pinned checkpoints

- `classic-2d-approved` — local Git tag for the approved Classic 2D foundation. Its standalone HTML SHA-256 is `d19da99cb41ae886a1bef224ec712e67388556c39615f240b45909e3c3aa1aed`.
- `pre-classic-baseline` — the earlier playable version, kept for rollback or comparison.

The original uploads are unchanged. Roadmap steps are reviewed one at a time.
