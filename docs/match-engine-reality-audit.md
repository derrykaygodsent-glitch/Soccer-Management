# Match engine reality audit and FM26-parity programme

**Status: system-level audit and baseline, not sign-off.** Scope is the playable match path and the whole-game systems that feed into, observe, save, or consume a match. The target is a believable and enjoyable football-management match—not imitation of Football Manager’s proprietary implementation. This map is broad, but it is **not a claim that every line, UI route, device, rule branch, or feature has been exhaustively reviewed**. Continue call-chain review and E2E validation as each delivery gate advances. This document is the source of truth for the match-engine workstream; keep it current as each gate is completed.

## Executive assessment

The engine has substantially more than a score generator. It simulates a 22-player match in 2D with seeded decisions, player and ball motion, separate in-/out-of-possession roles, tactics, physical condition, events, football restarts, and season persistence. Its hardest gaps are not a missing list of menu options. They are **football behaviour fidelity, transparent tactical cause and effect, model calibration against an external baseline, and verified full-match experience**.

Current source is a useful playable simulation, but it is **not yet demonstrated to be close to FM26 or to a real match distribution**. The latest historical 50-match seeded audit (seed offset 13) reported 18.02 shots, 1.753 xG, 1.82 goals and 4.18 corners per match. The test harness itself documents approximately 2.7 goals/match as a rough reference. In that historical sample, scorelines were 0-0 in 11/50, 1-1 in 14/50, 1-0 in 4/50 and 0-1 in 5/50. Penalty conversion was 17/20 (85%), a small sample and still high relative to a typical professional baseline.

A fresh 10-match diagnostic on this branch, seeds 13 through 922, reported 1.90 goals, 17.90 shots, 1.661 xG, 4.50 corners, 19.60 fouls, 1.20 offsides and 2.90 yellows per match; combined pass completion was 72.30% across about 1,324 attempted deliveries, and possession was 48.81% for the home side. Its scorelines included two 0-0s. Ten matches are far too few for a reliable calibration claim, and a single 0-0 at seed 13 also had one team with nine corners and 1.413 xG. These figures illustrate why results, events and distributions must all be considered together, not why any one match proves the model is wrong or right. They are internal simulation diagnostics, not an external validation set.

## 1. Existing match pipeline and systems

### Fixture, squad, and career integration

- `src/league-matchday.js`, `src/cup-circuit.js`, `src/club-matchday.js`, `src/club-matchday-game.js`, and `src/district-session.js` construct different playable contexts. They supply fixture identity, clubs, squads, lineups, competition rules, manager profiles, seed, and team tactics.
- `src/matchday-data.js`, `src/match-board.js`, `src/tactical-zones.js`, `src/team-dynamics.js`, `src/player-intelligence.js`, `src/football-memory.js`, `src/technical-area.js`, and `src/manager-life.js` feed readiness, injuries/knocks, role fit, tactical familiarity, player tendencies, manager traits, and player selection into the engine.
- `src/season-match.js` creates a sealed match manifest and replays fixed ticks plus commands on restore. It records tactical changes, events, shots, player statistics, ratings, lineup and tactical assessments; result handlers in league/cup/club code update the season, player history, reports, morale and development.
- Pre-match selection, talks, condition, squad registration, tactical rehearsal, substitutions, half-time changes and post-match reports are therefore part of match realism. A visually plausible standalone match is not enough if career inputs, resume, stats, and results disagree.

### Match simulation (`src/engine.js`, 2,344 lines at audit)

- 40 Hz simulation steps (25 ms), with decision/target refresh on a 125 ms brain cadence.
- Dedicated deterministic random streams for match execution, action choice, commentary and season injuries; fixture identity and ticks are recorded for seeded reproduction.
- 22 active players, formation anchors, attacking and defensive shapes, phase transitions, roles/duties, individual instructions, rehearsals, player familiarity, hidden traits and manager profile influences.
- Ball ownership and flight, ground/aerial ball physics, drag, gravity, bounce, spin/bend, ball radius, swept line exits, run-off, passes, switches, clearances, crosses, headers, shots, rebounds, blocks and goalkeeper distribution.
- Carrier choices compare action families (pass, carry, cross, shot, clear) and then plausible options. Read delay, facing, pressure, space, score, risk, fatigue, player identity and selected instructions change utility. This remains primarily a local heuristic policy, not a long-horizon tactical planner.
- Off-ball target generation covers width, depth, lines, support, tracking/marking, pressing, chasers, forward runs, offside awareness, keeper positioning, transition responses, overlaps/underlaps and phase anchors. Player movement uses acceleration/turning/speed/fatigue and pairwise separation; it is not a full rigid-body or mocap model.
- Attribute execution includes passing, first touch, technique, shooting, finishing, heading, tackling, positioning, pace, agility, stamina, goalkeeper handling/reflexes and other skills. Individual intelligence and traits can affect choices. These influences need broader calibration and causal tests.
- Match state includes possession, score/stats, fatigue, injury, substitutions, cards, added time, stoppage, half/full time, tactical changes, momentum, event log and shot map.
- Discipline/restart coverage includes corners, goal kicks, throw-ins, direct/indirect free kicks, penalties, offside involvement, second touch, advantage/restarts, cards, second yellow, VAR checks, goal confirmation and late penalty completion. `README.md` correctly notes that this is a 2D rules model, not a complete IFAB law simulator: it does not model every interference/restart infringement, nor review every possible handball/red-card case.
- `src/referee.js` tracks the official and signals without consuming match RNG. `src/setpieces.js` provides dead-ball geometry and options. `src/physics.js` is separated from rendering and random decisions.
- In-play AI manager review runs on a five-minute bucket and uses opposition structure/flank observations; half-time AI can change tactics and substitute. This is bounded adaptation, not yet a rich opponent memory/planning system.
- `tacticalMetrics` records anchor distance, press eligibility/engagement, recoveries, defensive actions, cover proxies, flank observations and tactical changes. Some are explicitly proxies, not outcomes. Do not present those proxies as proven tactical success.

### Match observation and interaction

- `src/render.js` paints the fixed overhead 2D pitch, players, number/name labels, kits, referee, ball height/shadow, flight/shot traces, technical areas and dugout players. The tactical-view toggle currently adds facing, low-condition rings, some flight trails and progressive-pass indication.
- `src/ui.js`, `src/template.html`, `src/style.css`, `src/audio.js`, `src/highlights.js` and `src/broadcast.js` provide match controls, highlights/full-match playback, replay, speed, touchline shouts, tactical/squad/stats/events desks, substitutions, role changes, momentum, xG and a shot-location plot.
- Highlights are a viewing policy over the same simulation; they do not change the underlying result. Full Match is continuous; Key/Extended/Comprehensive seek between passages. Saved career playback checkpoints and replays have dedicated tests.
- Current match stats show possession, shots, on target, xG, passes/accuracy, corners, offsides, fouls, saves, shot locations and events. The full game also creates tactical and opposition assessments in `src/season-match.js`, but several interpretations use named proxies and should be labeled as such.

### Existing test/diagnostic coverage

- `npm test` exercises rules, set pieces, offside/VAR, match board, decisions, player intelligence, tactical zones, manager AI, motion, highlights, deterministic resume, matchday and whole-career integration. The last recorded complete suite passed 423 tests before this audit task.
- `test/sim-test.cjs` finishes complete seeded matches, asserts state/stat invariants, and prints rough match-stat reference ranges. `scripts/audit-match-realism.cjs` records seeded scorelines, shot/xG calibration, locations, decisions, penalties, cards, pass/possession totals, event counts and per-match/per-team spread summaries (n, mean, SD, quantiles, min/max).
- This is good regression scaffolding, but current reference data and calibration remain game-generated and the main simulation gate is not yet a league-calibrated, high-sample comparison with confidence intervals.

## 2. The complete requirements to reach a top-tier, real-feeling engine

Priority legend: **P0** = blocks claiming realism/ship sign-off; **P1** = core parity work; **P2** = completeness/polish; **P3** = long-tail specialist fidelity. Items marked **existing / improve** are not greenfield features.

### P0 — Make football behaviour correct, measurable, and explainable

1. **Reference data and calibration protocol**
   - Select named competition/level baselines (not one universal average): goals, shots, shots on target, xG, possession, passes/accuracy, corners, fouls, cards, offsides, saves, penalties, substitutions, stoppage and outcome distribution.
   - Record source, season, sample size, definitions, exclusions, team-strength bands and uncertainty. Separate league/team quality from engine behaviour.
   - Run several hundred seeded fixtures per profile; report distributions, quantiles, scoreline frequencies, paired sides and confidence intervals, not just one mean or one favourable 50-match sample.
   - Calibrate distinct submodels—choice frequency, action execution, xG, goalkeeper response, penalties, crossing/aerial, fouls/cards—against held-out data. Avoid fitting and validating on the same seeds. Do not tune goals by simply multiplying shot success.
   - Keep golden baselines and fail tests on statistically meaningful drift, while allowing documented, reviewed model updates.

2. **Match event and state integrity** (existing / improve)
   - Every shot, pass, cross, restart, card, injury, goal, substitution and review must reconcile between live state, official stats, event log, replay, save/restore and season report.
   - Prove determinism across highlight modes, browser resume, tactic/substitution commands, home/away orientation, lineups and same-seed replays.
   - Add property tests for spatial/legal bounds, rare branches, match end timing, no duplicate actions, no deadlocks and no unresolved ball/VAR/restart state.

3. **Tactical cause/effect experiments**
   - For each team instruction, role, duty, shape and manager change, define which observable behaviors it should alter and what must not change.
   - Use paired seed experiments (same teams/seed except one tactical intervention) and report changes to location, lane occupancy, run type, pressing, possession progression, chance quality, turnovers and outcomes.
   - Reject settings that change only text/UI, make no measurable difference, or produce the same exaggerated behaviour regardless of player skill/shape.

4. **Real football possession grammar**
   - Cover repeatable, connected phases: build from keeper/backs; progress through/around pressure; establish width/depth/support; create an entry; choose cross/cutback/through ball/shot; defend the transition; recycle or clear when sensible.
   - Require off-ball players to provide distinct passing lanes, third-player support, overlaps/underlaps, counter-runs, rest-defence cover and marking handoffs—not just chase a ball or move to one anchor.
   - Prevent pathological loops: endless low-value recycling, unrealistic long-ball spam, automatic keeper catches, repeated identical crosses/shots, stalled owner/ball states and scripted chances.

### P1 — Make tactics and opponents feel intelligent

5. **Team shape / role execution** (existing / improve)
   - Verify every supported formation/role against actual locations across all phases: settled possession, attacking transition, settled defence, counter-press/recovery and set-piece transition.
   - Add spacing constraints and coordinated rotations: e.g. a fullback overlap requires winger/inside support and cover; a press requires nearby cover and a protected line; a low block must preserve compactness without teleporting.
   - Model pressing triggers as coordinated team decisions (jump, cover shadow, lock-on, trap, recovery), with stamina/risk trade-offs and clear failure modes.
   - Make player attributes, preferred foot, traits, role fit, familiarity and condition affect the right behaviors, with diminishing returns and tests that demonstrate them.

6. **Opponent manager intelligence** (existing / improve)
   - Add match-plan identity and in-play observation memory (where attacks progress, what the opponent targets, press bypasses, role overloads, set-piece threats, substitutions and fatigue).
   - Decisions need budgets, delays, manager traits, score/time context and causal reasons; avoid both managers oscillating forever or countering every small sample.
   - Ensure human and AI managers have comparable tactical actions, restrictions and information, with tests for viable counterplay and readable reactions.

7. **Player-level realism** (existing / improve)
   - Calibrate attribute-to-behaviour mappings; distinguish ability from execution noise, composure, vision, anticipation, work rate, body orientation, weak foot, aerial duels, first touch, goalkeeper positioning and distribution.
   - Improve contact/duel/space constraints so players do not overlap, phase-anchor teleport, ignore nearby opponents, or make physically impossible turns/accelerations.
   - Validate stamina, fatigue, knocks/injury probability, substitutions and late-game quality against position/workload and recovery; avoid cosmetic condition bars.

8. **Ball, goalkeeper and shot/cross calibration** (existing / improve)
   - Validate trajectories, spin, ground friction, bounce, flight time, post/bar/crossbar, keeper reaction, reach, handling/catch/tips/rebounds and defender blocks over controlled geometry grids.
   - Fit shot outcomes by location, angle, body part, pressure, defensive density, keeper position, foot, shooter skill and shot type; report reliability/calibration plots.
   - Fit penalties and free kicks separately. Penalty save/miss/goal rates need sufficient attempts and keeper-quality strata; 20 kicks is not conclusive.
   - Validate crosses, headers, cutbacks and set-piece outcomes against attempted-delivery, target, contest and second-ball rates so higher action is not just repeated events.

### P1 — Make the match understandable and satisfying to play

9. **Tactical observation and analytics** (existing / improve)
   - Present live attacking/defensive shape, actual vs intended positions, pressure/cover, passing options, overloads, space conceded and transition risks without covering the pitch in noise.
   - Add useful team/player heatmaps, pass networks, possession/progression chains, chance map with outcome/xG, territory/entries and role-specific action evidence.
   - Tie coaching advice to observed events and label fact vs calculation vs heuristic estimate. Current tactical report already contains explicit proxy disclaimers; preserve that standard.

10. **Broadcast, commentary, audio and replay** (existing / improve)
    - Commentary should explain a coherent passage (cause, action, outcome), use event context, name players correctly, avoid repetitive filler and never contradict pitch/stat state.
    - Replay/highlights should show enough buildup and aftermath, use consistent time and score state, support all modes/speeds and never hide a decisive incident.
    - Improve 2D rendering readability, motion, facing/body/ball contact, player identity and match atmosphere within the project’s chosen 2D scope. FM26 uses a newer Unity visual/animation presentation; an overhead-only engine should differentiate on tactical clarity rather than promise equivalent mocap.
    - Sound/crowd response, goals, saves, tension, cards and substitutions need restraint, accessibility controls and reduced-motion support.

11. **Manager agency and match pacing** (existing / improve)
    - Tactical edits and shouts must take effect at a defined time, affect intended behaviors, be reversible, and be explainable in match reports.
    - Subs should change player/role/shape as expected; fatigue/injury and opponent reactions should make timing meaningful.
    - Full Match must be watchable at chosen speed; highlight modes must save time without distorting outcomes. Provide clear controls for pause, speed, skip, replay and tactical desk on mobile and desktop.

### P2 — Close the rules, competition, and career loop

12. **Rules edge cases** (existing / improve)
    - Maintain a competition rules matrix for offside (including interference, rebounds and deliberate play), advantage, handball, DOGSO/SPA, serious foul play, cards/second yellow, goal-line, goalkeeper handling/back-pass, penalty encroachment/rebounds, throw-ins, indirect kicks, substitutions, added time, VAR scope and shootouts.
    - Mark which laws are fully modeled, approximated or unsupported in UI/docs. Do not claim complete IFAB coverage without tests for each.

13. **Competition/team context**
    - Tune match length, schedule density, pitch/weather/altitude if modeled, home advantage, travel/fatigue, refereeing style, ball, competition tactics and player quality only where evidence supports them.
    - Keep generated and user squads consistent with legal registrations, injuries, suspensions, development, contracts, history and season statistics.

14. **Reports, history and persistence** (existing / improve)
    - Keep live, halftime, full-time, inbox, league table, player histories and saved match journal aligned and idempotent.
    - Persist tactical changes, substitutions, seed, model/version, state checkpoints and event/shot records so a restored match is exactly reproducible.
    - Add post-match tactical review that distinguishes measured facts from model interpretation and lets the player trace a recommendation back to the pitch/events.

### P2/P3 — Engineering quality and maintainability

15. **Architecture and performance**
    - Preserve the 40 Hz deterministic core, but split `engine.js` by stable responsibilities (state/clock, movement/shape, decisions, execution, rules/restarts, goalkeepers, analytics) behind tested interfaces. The 2,344-line monolith and dense one-line routines increase change risk.
    - Profile 22-player collision/target loops and browser rendering on low-end phones; keep input latency, CPU, memory, save/replay size and frame pacing within explicit budgets.
    - Keep model parameters centralised/versioned and explainable; remove magic numbers only when replaced by measured parameters, not to cosmetically refactor.
    - Add debug overlays and deterministic scenario fixtures for difficult states (packed box, counter, keeper sweep, high line, injury, card, penalty, stoppage, save/restore).

16. **Accessibility, device and reliability**
    - Test small screens, keyboard, screen readers, reduced motion, colour contrast, hit targets, pausing, long sessions, tab visibility, offline mode, storage failure, reload and old-save migration.
    - Add browser E2E tests at mobile and desktop for complete 90-minute fixtures; test full/key/highlight modes, halftime, substitutions, match exit and resume, errors and score/stat consistency.

17. **Art/audio/content boundaries**
    - Build original and licensed-safe team/player identity, kits, commentary, stadium/crowd/audio, competition rules and data. Do not copy FM art, names, animation, code or proprietary datasets.
    - Keep the fictional world’s rich career systems (media, club, supporters, training, recruitment, staff and history) connected to match outcomes but do not mistake off-pitch breadth for match-engine fidelity.

## 3. Ordered delivery gates

1. **Baseline lock:** version the current rules/model; run current seeded audits; preserve golden saves/fixtures; define chosen competition reference distributions and source.
2. **Behaviour instrumentation:** add per-phase/per-action/player telemetry that records attempted and successful actions, pressure, space, choice alternatives, execution and outcome. Make it reproducible and cheap enough for large batches.
3. **Football movement/decision pass:** fix the highest-impact spatial/action pathologies from telemetry; add deterministic scenario tests and paired-seed tactical experiments.
4. **Tactical identity and opponent adaptation:** implement coordinated attack/defence/transition behaviors with testable causes, manager reaction budgets and counterplay.
5. **Execution calibration:** fit passes, crosses, shots, goalkeeper, set pieces, discipline and fatigue separately on train/holdout match samples.
6. **Readable 2D broadcast and review:** expose tactical behavior and chance chains; add a coherent event/passage commentary and clear analytics; verify usability on mobile.
7. **Whole-game integration:** run league/cup/friendly/career fixtures, restore from checkpoints, verify match reports, tables, player stats, season state and manager history.
8. **Release gate:** 100+ browser-observed full matches across strengths/styles plus large seeded distribution runs; no unresolved invariants; documented unsupported rules; compare observations and reference metrics before claiming “close to real.”

## 4. Acceptance gates (no feature-count sign-off)

- **Rules:** every supported rule has state-level tests and both directions/home-away cases; unsupported rules are declared.
- **Determinism:** same version, fixture seed, inputs and timed commands yield identical score, event log, shot map, stats and final tactical report across view modes and restore.
- **Calibration:** held-out competition profile lands within agreed confidence intervals for goals, shots, xG, pass volume/accuracy, corners, fouls/cards, offsides, saves and penalty outcomes; distribution tails and scorelines are checked too.
- **Causality:** each major tactical setting has a paired seeded test showing the intended behavior changes, plus no-regression bounds for unrelated phases.
- **Watchability:** full-match browser tests have no freezes/JS errors; key events, buildup and aftermath are legible; commentary/replay never contradict score/stats; player can pause, inspect, alter tactics and observe an effect.
- **Career:** match state survives resume; lineups, registration, injuries, stats, results, reports, morale/development and history reconcile exactly.
- **Performance/accessibility:** mobile/desktop FPS and CPU targets are measured; keyboard/screen-reader/reduced-motion paths work.
- **Honesty:** only mark an acceptance gate complete when its evidence and test artifact are recorded here.

## 5. Gameplay change delivered in this iteration

**Cross decisions now account for the live box matchup.** Previously, the engine rated the best individual receiver by separation, role and distance, but did not reward legal supporting runners or discount a defensive overload. `Match.crossOption()` now counts onside attacking teammates in the central scoring area and defenders in the box, then applies a bounded numerical-support adjustment to delivery merit. Offside teammates are excluded. This changes the action choice, not just the event text.

- Focused behavior tests verify that a legal extra runner raises cross merit, a defender overload lowers it, and an offside runner does not count. The existing seeded flank-choice test still requires crossing, carrying and cutting inside to remain viable options.
- `node scripts/audit-cross-box.cjs 12 731` compares 12 same-seed full-match control/treatment pairs (one generated club matchup, balanced seed progression). The single-target control averaged **37.67 crosses, 12.92 shots and 1.043 xG per match**; box-aware treatment averaged **27.92 crosses, 11.67 shots and 1.023 xG**. Paired mean deltas were **−9.75 crosses, −1.25 shots, −0.021 xG and +0.083 goals**. Descriptive 95% paired-t intervals were [−17.09, −2.41] crosses, [−4.61, 2.11] shots, [−0.46, 0.42] xG and [−0.79, 0.96] goals. Cross volume fell in 10/12 pairs, while xG and outcome effects are inconclusive; this does not establish non-inferiority or realism. Treat it as a promising bounded decision improvement, not proof. Test additional squad strengths, opponent shapes and venues before calibration claims.
- This experiment supports a concrete next direction: model whether an attacking option has coordinated support and credible numbers, rather than judging one player/action in isolation. It does **not** solve the wider possession-grammar gap.

## 6. Current open work

- Full 90-minute browser playthrough using `/tmp/touchline-day-390.json` is not complete. This turn installed/used Chromium dependencies, loaded the save in Playwright, entered Mavelle Teachers v Kay FC on 20 Nov 2027, and observed live play to 7:24 with no page errors. A 4× accelerated attempt was CPU-bound; at a goal replay the harness had to dismiss the replay to continue. Do not count this as full-match QA or infer that the replay behaviour is defective from the accelerated harness. Earlier browser QA reached approximately minute 23; the resume/restore stall still needs a controlled reproduction.
- Last audit means are below the documented 2.7 goals/match reference; 0-0 remains common. The engine needs reference-driven calibration and tactical/shot-volume work, not an unbounded goal multiplier.
- Penalty conversion remains statistically unsettled (latest sample 17/20 after save tuning); collect substantially more kicks, stratify by keeper/kicker and compare held-out seeds.
- No direct FM26 side-by-side playback/agency study has been completed; current parity ratings are qualitative, not benchmark measurements.
- Several tactical analytics are explicitly proximity/anchor heuristics. Keep their disclaimers and do not equate them with measured success until validated.
