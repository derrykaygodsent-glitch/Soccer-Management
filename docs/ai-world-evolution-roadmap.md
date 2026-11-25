# Touchline 26 AI and world-evolution roadmap

This is the durable working plan for the AI-management and world-evolution work. Update the status here as work is completed; do not rely on conversation history as the plan of record. Review work in the sandbox and run relevant tests. Deployment requires separate authorization.

## Status summary

- **Immediate three-step AI plan: 3 of 3 complete.** Gradual multi-season change is complete after reproducible long-save checks and a people/board progression audit. The separate league-tactical-trends feature is implemented, but its fit score and 11.5 cutoff are still provisional; endless-save continuity has checkpointing and exact-history export/restore, with compaction design documented and archive viewing/parity validation still ahead.
- **Broader long-term vision: league tactical trends and endless-save continuity remain in progress.** The confirmatory match run and its analysis are complete, but results did not validate the proxy or cutoff. Keep gameplay unchanged. The continuity audit and staged plan are in `docs/endless-save-continuity-plan.md`; checkpoints skip replay through the newest valid five-season boundary, and exact season-book records can be exported to and restored from a versioned sidecar. Full history remains in the save; no compaction has occurred.

## Immediate implementation plan

### 1. Persistent AI-manager traits — COMPLETE

Give managers stable characteristics beyond preferred style, including adaptability and risk tolerance; preserve saved ratings and assign deterministic defaults to legacy identities.

Implemented in `src/technical-area.js`, with presentation in the manager dossier and dugout.

### 2. Limited, explainable match-context decisions — COMPLETE

Managers make bounded decisions consistent with their style. Reasons are attached to tactical records and match events. This includes half-time responses to score/chance context, constrained injury/severe-fatigue substitutions, and in-play reactions to broad opposition tactics. In-play scouting also observes repeated advanced carries and nearest-cover gaps by flank, then can widen play and modestly favor passes toward the exposed side. Keep the user's out-of-possession behavior intact.

Implemented primarily in `src/manager-match-ai.js` and `src/engine.js`, with tests in `test/manager-match-ai.test.cjs`.

Known limitation: current movement scouting is narrow. It does not yet recognize off-ball runs, overlaps/underlaps, rotations, or pressing traps.

### 3. Gradual multi-season change — COMPLETE

Make long-term changes emerge from recorded match and club history rather than arbitrary resets or unrelated random events. **Foundation audit completed; do not rebuild systems that already exist.**

Existing foundations found:

- `src/season-turnover.js` advances player attributes deterministically from age, potential, match minutes, coaching, training, fitness, injury, form and team context. It handles decline, retirement and youth intake.
- `src/manager-life.js` archives seasonal tables, results, player development/workload and awards, then applies player turnover. `test/turnover.test.cjs` exercises twenty July turnovers, retained clubs and player identities, archive creation and reproducibility.
- `src/technical-area.js` gives coaches stable identities/styles and deterministic traits, records appointments and dismissals, rehires available former coaches, and dismisses managers against board-target/league-form evidence.
- Club mandates are checked against league position, youth/training or reserve evidence and stored in `boardMemory`; transfer and former-club systems preserve dated moves and club assets.

Implemented: `src/club-world-history.js` keeps a bounded five-season evidence window for manager style, youth-player starting share, permanent transfer counts and net transfer spending. The Technical Area reports the evidence; a style is recurring or a youth pathway sustained only after repeated seasons. League match records retain starter appearance evidence, with a fallback for older saves. Once the history is strong enough, recurring style influences manager appointments; established youth pathways bias AI recruitment toward younger players; and repeated net-selling histories favor lower-cost AI targets when positional need is equal. Sustained investor/seller patterns require at least three evidenced seasons. `src/club-rivalries.js` derives bounded emerging/established/dormant club rivalries from repeated close archived matches or a close title race, and the Club Dossier shows the recent evidence. Club identity does not drive in-match tactics.

**Completion review:** the identity and spending-history effects pass reproducible 20-season stress tests; rivalry history has bounded-window, evidence-threshold, reload/idempotence and 20-season coverage. The requested people/board progression audit found no justified missing mechanic: coach identities, appointments, dismissals and rehires already use stable IDs and dated history; dismissals require both board-target underperformance and recent results; user-manager mandates are evaluated against league, youth/training or reserve evidence and recorded in `boardMemory`. Regression checks now explicitly verify appointment/dismissal history and resolved board reports survive save/load without rewriting played fixtures or duplicating a resolved promise. Avoid inventing adaptive board targets without an evidence-backed requirement; people/board progression review is complete for this phase.

Long-term changes remain deterministic/reproducible and explainable, with consequential evidence retained in season or club history.

## Broader world-evolution follow-ons

### 4. Slow league tactical trends — IN PROGRESS

First slice implemented in `src/league-tactical-trends.js`: keep a rolling five-season record of manager styles among league top-three finishers. A local trend requires at least three observed seasons, representation by at least two clubs, and at least half of podium style appearances. At new appointments, a deterministic 28% subset of clubs without a proven recurring identity may favor the trend only when a projected XI's relevant attributes clear an 11.5/20 fit proxy; existing club identities take precedence. The Technical Area reports the top-three evidence as correlation, not causation, and appointment records include the squad-fit proxy when a manager follows the trend. Twenty-season world-save checks confirm that some suitably equipped clubs—but not all—copy a fashion, while low-fit squads do not.

The attribute lists and 11.5/20 threshold remain **provisional, not validated**. The preregistered 7,776-match confirmatory run and Phase 3 analysis are complete; the analysis found mixed effects by style and reputation and did not establish the preregistered +1.0 xG practical target in any primary cell. The results do not validate the fit proxy or cutoff, so no gameplay change is justified. Run details, results, and limits are recorded in [`docs/tactical-fit-calibration-plan.md`](tactical-fit-calibration-plan.md) and [`docs/tactical-fit-confirmatory-analysis.md`](tactical-fit-confirmatory-analysis.md), with raw data and machine-readable results alongside them. Do not treat league position as proof that a tactic caused success; preserve clubs that retain a philosophy and avoid making teams interchangeable.

### 5. Sustainable continuity for endless saves — CHECKPOINT + HISTORY SIDECAR IMPLEMENTED / COMPACTION DESIGN DOCUMENTED

The audit and staged implementation plan are in `docs/endless-save-continuity-plan.md`. `src/world-checkpoint.js` stores one compact, versioned snapshot at five-season replay intervals; older careers can create one at their next season boundary. The manager retains only the newest checkpoint and replays later seasons. Old saves without a checkpoint still use the original replay path, and a missing, mismatched, or corrupted checkpoint falls back to full replay. Checkpoint restoration matches full replay at 5, 20, 50, and 100 seasons, including an active manager with a full 24-player squad. However, that active-career fixture already exceeds the 3.8 MB cloud limit at 20 seasons and the 12 MB import check at 100; checkpointing alone is insufficient.

The initial retention inventory is in `docs/career-data-retention-map.md`, and the proposed compact format and recovery workflow are in `docs/career-archive-compaction-design.md`. The Cloud locker exports exact `seasonBook` records to a versioned JSON sidecar and restores missing records to the matching career; import rejects checksum errors, conflicting records, another career ID, and years outside that career's timeline. This is a recovery foundation only: full records remain in the save, with no compaction or gameplay changes. Next, implement read-only archive attachment/viewing and the version-2 validator, then run copied-career parity tests before considering any versioned migration.

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
