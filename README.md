# Touchline 26

**Classic 2D is the main game.** The approved fixed overhead pitch and match engine are the foundation. Make future changes in `touchline-26/`; `touchline-classic/` remains a copy of the approved motion review.

## Play the Riverside season (v0.9)

A new save opens in the **Manager’s Office on 26 October 2024**. The redesigned clubhouse brings the fixture, daily priorities, player leaders, standings and club finances together on Home. The Terrace is a separate social timeline for club updates, supporters and the fictional football press. Club roles, plans and match reports still draw from the same season ledger. There is no matchday picker or prewritten cup score.

1. **Continue** or **Space** starts automatic day-by-day processing. Press **Stop processing**, **Space** or **Esc** to pause at the last saved date. Processing stops automatically for required decisions, Riverside matchday and the end of the calendar. Click the header date to inspect the calendar or select a future date and choose **Pause on this date** for a one-time stop. The Premier Division table and published results follow the club clock. At the start, Riverside’s completed Eastvale result is historical; the upcoming Harbourport tie is unplayed.
2. **Inbox** holds the date only for items marked **Action required**. The opening week includes a training-load decision, a coaches’ meeting and a press decision. Reading or marking mail read is not the same as answering. **Next Unread** follows the Inbox order; optional updates do not hold the calendar.
3. On **30 October**, after the required decisions, the header opens **Tactical Meeting**. The selection room lets you set the formation, roles, instructions, available XI and six-player bench, captaincy and restart takers. Competitive squad numbers are locked; the pre-season fixture lets you register free numbers. **Submit Team** confirms and freezes the team and brief for that fixture.
4. Continue through the **Briefing**, official **Team News**, **Dressing Room** and **Match Preview**. Team talks can address the room, a unit or an individual; the reactions influence player composure in the engine. **Go to Pitch** opens the submitted fixture in Classic 2D, paused at **00:00**. Only **Kick off** starts it.
5. **Tactics & subs** lets you change instructions or use the submitted bench after kickoff. A Riverside knock can pause play and open the squad desk. Live changes are match-only unless you confirm **Save tactics to club**; substitutions never rewrite the saved XI. At the interval you can review the numbers, make changes, give a talk and start the second half.
6. **Full Time** shows the actual score, xG, events, shots, player statistics and closing shape. **Press & supporters** covers the actual result and player of the match. Tied League Cup matches are settled by a simulated shootout. After the final talk, the result is available in **Schedule**, the **Calendar Desk** and the **Inbox**, alongside the optional press reply and any medical update. Continue toward the next fixture rather than replaying the cup tie.

Confirmed Riverside fixtures use the Classic engine, at home or away. Other clubs’ results are seeded and appear when the club clock passes their finish time. The league schedule runs to 38 matches per team, and League Cup qualification sets later rounds. Early archives, non-playable editorial snapshots, recruitment drafts and board requests remain part of the fictional starter club. Drafts do not sign players, spend money or create a playable match.

**Saving:** Existing v0.8.x saves work without conversion. The date, decisions, club tactics, submitted team, talks and results are stored locally in the browser. A live reload restores a paused match from its checkpoint and accepted touchline actions. A late restore may take a few seconds. The file also runs with no network or sign-in. In a script-only viewer that blocks storage, progress lasts only in the open session; use the live preview or an ordinary browser window for a continuing save.

### The Match Office

| View | Where to find it |
| --- | --- |
| Club calendar, pause date, countdown, partial results and standings | Click the header date, then **Club calendar** or **Fixtures & Results** |
| Compact and expanded tactics, possession and transition instructions | **Tactics** in the sidebar |
| Attributes, availability and recorded player ratings | Select a player from **Home**, **Squad** or **Tactics** |
| Supporter posts, football news and completed match updates | **Social Feed**, then The Terrace. Follow accounts, filter topics, react to posts and save them locally. |
| Team correspondence, decisions and current medical notices | **Inbox**, **Medical Centre** and **Training** |
| Natural positions, current condition and selections | **Squad Planner** shows the depth chart, **Club tactics** holds the competitive XI |
| Recruitment, staff responsibilities, budget and club planning | **Scouting**, **Transfers**, **Staff**, **Finances**, **Club Vision** |

## Touchline and run-off (v0.8.1)

Balls shown going out for a throw-in, corner or goal kick keep their original direction and height across the line. There’s room beyond the pitch markings to see the ball slow or bounce before it’s brought back to the restart spot. The referee still awards the restart when the whole ball crosses; the retrieval does not change restart timing or affect play. Choose **Extended** to see routine throw-ins or **Full Match** to see all exits.

The two marked technical areas sit beyond the far touchline. Click or tap either **M** to identify that club’s manager, or select a numbered seat to identify a substitute. These markers can also be selected with Tab and Enter. The incoming player leaves the bench when the substitution appears on screen; an outgoing player’s marker is labelled **Substituted off** if they cannot return.

## Watch a match

In the match centre, choose **Highlights** beneath the pitch, then press **Kick off**. Season fixtures open in **Key** at **1×**; **Extended** is the exhibition default. You can change the viewing mode mid-match without restarting. A passage already on screen plays out before the new setting takes over.

| Mode | Best for | Approx. viewing time at 1× | What you'll see |
| --- | --- | ---: | --- |
| **Full Match** | Tactical analysis | 90+ min | Continuous play: routine possession, off-ball movement, buildup and defending, as well as chances. |
| **Comprehensive** | Important matches | 40–65 min | Everything in Extended, plus goal kicks, routine chances and more defensive recoveries. |
| **Extended** | Normal league matches | 30–50 min | Everything in Key, plus other free kicks, offsides, throw-ins and selected attacks. |
| **Key** | Quick season progression | 10–25 min | Goals, major chances, dangerous free kicks, corners, penalties, cards, woodwork and VAR. |

**1× is real time** and is the default for each new fixture. The **Speed** menu offers **0.75×** to slow down, **1.25× / 1.5× / 1.75×** for smaller steps above normal, and **2× / 4×** for faster viewing. The same rate applies to continuous play, highlight clips and goal replays. The keyboard shortcuts **1**, **2** and **3** still select **1×**, **2×** and **4×**. For a shorter watch at normal speed, use **Key at 1×**. Season goal replays are available with **Replay** when footage exists.

Highlight modes save time by cutting between passages. The times above are rough guides from seeded fixtures, not limits; they exclude pauses and replays. All modes still simulate 90 in-game minutes plus stoppage time. The engine plays every tick and records all events and stats. With the same seed and instructions at the same match times, the four modes produce identical results.

Full Match has no automatic cuts. **Next highlight** jumps to the next qualifying passage when no important action is in progress, and **Stop here** ends a search without changing the mode. The game stops at halftime and full time. In the Touchline desk, changes take effect at the displayed effective time; they do not alter recorded buildup.

## Set pieces, offside and VAR

**Throw-ins** are two-handed overhead releases from the touchline. The taker chooses among short, backward, down-the-line and, where plausible, long options. Pressure, cover, player attributes and the state of the match affect the decision. A suitable specialist may reach the near side of the area; a blocked short option never turns into a kicked cross.

**Free kicks** can be taken quickly by a nearby player if there's an available outlet. For a managed kick in shooting or dangerous delivery range, the defending side builds a wall appropriate to the angle while its keeper covers the open side. The referee supervises the setup before the taker runs up. The taker can still pass, deliver or shoot. **Corners** can be swung into the area or played short; the whole ball and the actual last touch determine the award.

Attackers read a moving defensive line, and a passer can take an extra stride before releasing the ball. The offside decision uses the positions **at the kick**, not when the pass was chosen. It is called when the player touches or actively challenges for the ball, not just for being in an offside position. A save or ricochet can preserve that offside picture; controlled defending clears it. There is no offside directly from a corner, throw-in or goal kick. An offside call gives the other team an **indirect free kick** where the involvement occurred. This 2D model uses player centres and does not attempt to model every form of interference or every restart infringement ([IFAB laws 11](https://www.theifab.com/laws/latest/offside/), [13](https://www.theifab.com/laws/latest/free-kicks/) and [17](https://www.theifab.com/laws/latest/the-corner-kick/)).

The broadcast shares the same core buildup window in every edited mode. An earlier minor highlight can't cut into that buildup to get on screen sooner. The decision, the approach and the live restart are shown in order, with room for the immediate result. Extended adds ordinary free kicks, offside restarts and throw-ins; Comprehensive adds goal kicks and more general play. There are no quotas for important incidents.

The **referee** is the dark square marked **R**. Watch the directional arm, the point to the penalty mark, the raised indirect-kick arm, and the coloured cards held beside the offender. Penalties wait for the taker, the keeper on the line, and the players outside the area and arc. A penalty awarded before the end of the half can still be completed. [Research and modelling notes](docs/set-piece-research.md) explain the football evidence behind this pass and the rules it models.

**VAR** checks close penalty-area decisions and goals where a player involved in the buildup was close to the offside line. The match feed shows the check and the ruling. A reviewed goal is not added to the score or replay queue unless confirmed. VAR uses recorded positions and contact in the 2D simulation; it can confirm or overturn the on-field call. Reviews add stoppage time and are shown in all four viewing modes. This is a limited VAR implementation: it does not review every possible handball, red-card incident or other real-world decision.

## How players choose

The ball carrier reads the play before committing. An onside run can open a through ball, but a defender closing in can make a short pass back the better option. A clean reception can lead to a quick pass or strike; a closed body position can cost an extra touch. Out wide, a cross competes with cutting inside, carrying on and recycling. A pause can buy a better angle or give the defender time to win it back.

Role, attributes, individual tendencies, fatigue, tactics and the score affect those choices. The seed breaks close calls between credible options; it does not select a prewritten attack. This changes the football a seed produces compared with older builds, not the ability to reproduce a fixture within this build. Classic 2D remains the fixed overhead view.

## Interaction and motion

Every control that can be chosen answers the pointer: buttons lift a little, brighten and take a colour wash, list rows show a coloured edge, and board markers slide up with their name plate lit. Icons move on the controls that navigate, the scoreboard pulses when a goal goes in, and a short passage into the Classic 2D view settles the page. Clubhouse photography drifts slowly, the clubhouse brandmark catches the light, and live indicators breathe.

The motion is deliberately quiet: nothing flashes, nothing loops faster than a heartbeat, and hover states stay readable at 200 percent zoom. Every animation is turned off when the operating system asks for reduced motion. The layer lives in `src/polish.css` and is loaded after the page styles.

## Play and build

Open `index.html` offline, or run `npm run preview` with Node.js 20+. The preview builds from `src/` and serves on port `4173` (`PORT` overrides it). No installs or accounts are required. Edit `src/`, then run `npm run build` to regenerate the HTML.

- `npm test` checks the standalone build, calendar gates, released standings, submitted lineups, deterministic checkpoint replay, match statistics, result idempotency and shootouts. Engine and broadcast tests also check restarts, offside, VAR, highlight boundaries, timing and seeded play.
- `npm run test:sim -- 3` runs three complete seeded fixtures.

## Pinned checkpoints

- `classic-2d-approved`: local Git tag for the approved Classic 2D foundation. Its standalone HTML SHA-256 is `d19da99cb41ae886a1bef224ec712e67388556c39615f240b45909e3c3aa1aed`.
- `pre-classic-baseline`: the earlier playable version, kept for rollback or comparison.

The original uploads are unchanged. The clubhouse art, fonts and icons are bundled offline. Navigation and room transitions respect reduced-motion settings. The match engine, saved-season schema and the approved Classic 2D copy were not changed in v0.9.0.
