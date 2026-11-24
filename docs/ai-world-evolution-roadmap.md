# Touchline 26 AI and world-evolution roadmap

This is the durable working plan for the AI-management and world-evolution work. Update the status here as work is completed; do not rely on conversation history as the plan of record. Review work in the sandbox and run relevant tests. Deployment requires separate authorization.

## Status summary

- **Immediate three-step AI plan: 2 of 3 complete; multi-season world evolution is in progress.** Club identity and rivalry effects have passed reproducible 20-season stress tests; the first league-tactical-trend slice is implemented and under validation, while endless-save continuity remains future roadmap work.
- **Broader long-term vision: league tactical trends are in progress; sustainable continuity for endless saves remains.** Trend adoption is a first, bounded slice; continuity work should be designed alongside multi-season progression and validated over long advances.

## Immediate implementation plan

### 1. Persistent AI-manager traits — COMPLETE

Give managers stable characteristics beyond preferred style, including adaptability and risk tolerance; preserve saved ratings and assign deterministic defaults to legacy identities.

Implemented in `src/technical-area.js`, with presentation in the manager dossier and dugout.

### 2. Limited, explainable match-context decisions — COMPLETE

Managers make bounded decisions consistent with their style. Reasons are attached to tactical records and match events. This includes half-time responses to score/chance context, constrained injury/severe-fatigue substitutions, and in-play reactions to broad opposition tactics. In-play scouting also observes repeated advanced carries and nearest-cover gaps by flank, then can widen play and modestly favor passes toward the exposed side. Keep the user's out-of-possession behavior intact.

Implemented primarily in `src/manager-match-ai.js` and `src/engine.js`, with tests in `test/manager-match-ai.test.cjs`.

Known limitation: current movement scouting is narrow. It does not yet recognize off-ball runs, overlaps/underlaps, rotations, or pressing traps.

### 3. Gradual multi-season change — IN PROGRESS

Make long-term changes emerge from recorded match and club history rather than arbitrary resets or unrelated random events. **Foundation audit completed; do not rebuild systems that already exist.**

Existing foundations found:

- `src/season-turnover.js` advances player attributes deterministically from age, potential, match minutes, coaching, training, fitness, injury, form and team context. It handles decline, retirement and youth intake.
- `src/manager-life.js` archives seasonal tables, results, player development/workload and awards, then applies player turnover. `test/turnover.test.cjs` exercises twenty July turnovers, retained clubs and player identities, archive creation and reproducibility.
- `src/technical-area.js` gives coaches stable identities/styles and deterministic traits, records appointments and dismissals, rehires available former coaches, and dismisses managers against board-target/league-form evidence.
- Club mandates are checked against league position, youth/training or reserve evidence and stored in `boardMemory`; transfer and former-club systems preserve dated moves and club assets.

First implementation slice underway: `src/club-world-history.js` keeps a bounded five-season evidence window for manager style, youth-player starting share, permanent transfer counts and net transfer spending. The Technical Area reports the evidence; a style is recurring or a youth pathway sustained only after repeated seasons. League match records retain starter appearance evidence, with a fallback for older saves. Once the history is strong enough, recurring style now influences manager appointments; established youth pathways bias AI recruitment toward younger players; and repeated net-selling histories favor lower-cost AI targets when positional need is equal. The Technical Area shows sustained investor/seller patterns only after at least three evidenced seasons. `src/club-rivalries.js` derives bounded emerging/established/dormant club rivalries from repeated close archived matches or a close title race, and the Club Dossier shows the recent evidence. Club identity does not yet drive in-match tactics.

Remaining gaps to implement incrementally:

1. **Club identity from repeated choices — CORE EFFECTS STRESS-TESTED:** a reproducible 20-season world save now verifies identity maturation, evidence-qualified manager hiring and actual youth-start-informed recruitment without resets; a separate 20-season spending-history run checks the investor-to-seller preference shift through the rolling evidence window. Do not add tactical effects unless a clearly supported, bounded decision can be identified; keep registered youth separate from actual playing time and never infer a durable identity from one season.
2. **Rivalries/narratives from encounters — IMPLEMENTED AND STRESS-TESTED:** a bounded, persisted club-rivalry history derives from archived league encounters. Repeated close meetings or a close title race create an emerging rivalry; qualifying evidence in multiple seasons establishes it, and lack of recent qualifying encounters lets it become dormant. The Club Dossier displays recent evidence. Tests cover single-season false positives, title-race evidence, reload idempotence, dormancy, bounded storage, and a reproducible 20-season save.
3. **Review people/board progression as needed:** build on the existing coach lifecycle, club promises and target reviews; add only history-backed gaps, not a duplicate hiring/retirement system.

Long-term changes should remain deterministic/reproducible and explainable. Keep consequential evidence available in the season or club history.

## Broader world-evolution follow-ons

### 4. Slow league tactical trends — IN PROGRESS

First slice implemented in `src/league-tactical-trends.js`: keep a rolling five-season record of manager styles among league top-three finishers. A local trend requires at least three observed seasons, representation by at least two clubs, and at least half of podium style appearances. At new appointments, a deterministic 28% subset of clubs without a proven recurring identity may favor the trend only when a projected XI's relevant attributes clear an 11.5/20 fit proxy (style-specific work rate/stamina/pace for pressing, passing/composure/dribbling for possession, and so on); existing club identities take precedence. The Technical Area reports the top-three evidence as correlation, not causation, and appointment records include the squad-fit proxy when a manager follows the trend. Twenty-season world-save checks confirm that some suitably equipped clubs—but not all—copy a fashion, while low-fit squads do not.

Next, calibrate these style-specific fit proxies against match-engine outcomes and player attributes before considering tactical adaptation beyond new appointments. Never treat league position as proof that a tactic caused success; preserve clubs that retain a philosophy and avoid making teams interchangeable. Preserve clubs that retain a philosophy, and avoid making teams interchangeable.

### 5. Sustainable continuity for endless saves — NOT STARTED / FUTURE

Preserve important histories and consequences without unbounded simulation/storage costs. Retain detailed records for important events and recent seasons; summarize less relevant activity for older or inactive clubs. Prefer deterministic or reproducible progression. Test multi-season advancement for identity, fixture, and record continuity and for silent resets.

## After the full world-evolution roadmap

### 6. Team and player instructions tabs — ADDED / AFTER ALL ABOVE

Review and improve the tactical editor's Team Instructions and Player Instructions tabs. The work should cover both behavior and usability: make sure team-wide instructions are complete and understandable, individual player instructions are accessible and meaningful, and both sets apply consistently to the correct possession phase without damaging the team's other shape or instructions. Add focused tests for editor behavior, saved/reloaded instructions, and match-engine effects. This is deliberately scheduled after multi-season evolution, league trends, and endless-save continuity are complete.

## Current audit for gradual multi-season change

*Foundation audit completed; bounded club-identity evidence capture is the first implementation slice.* Existing mechanics and remaining gaps are documented under item 3 above. Extend rather than duplicate the established player, manager, board, transfer and season-archive systems. Before classifying a club as academy-led, use actual appearance evidence; do not mistake a youth player merely being registered for receiving minutes. The profile remains mostly descriptive; its limited hiring and youth-recruitment effects activate only after evidence thresholds. Reproducible 20-season tests now verify their persistence and the rolling spending preference shift. Avoid broadening into tactics without a specific evidence-backed benefit.

## Working rules

- Explain consequential AI actions in the match feed or history.
- Keep decisions bounded, imperfect, style-sensitive, and supported by evidence.
- Reuse the same tactical systems available to the user; avoid breaking Out of Possession behavior while changing formations or tactics.
- Keep movement-pattern detections evidence-based and guard against overreaction.
- Preserve unrelated worktree changes.
- Do not deploy without authorization.
