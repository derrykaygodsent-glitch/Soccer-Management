# Endless-save continuity — audit and first implementation plan

**Status:** Audit complete; deterministic world-checkpoint slice implemented and under validation. No archive compaction, gameplay rebalance, or tactical-calibration changes.

## Goal

Keep a career playable, loadable, and historically meaningful over a very large number of seasons. Do not silently discard important player, club, or manager history. Keep saving, loading, and archive screens responsive as the save grows.

## What the audit found

- **Full season records grow without a retention limit.** `src/manager-life.js` appends every completed season to `seasonBook`, including nation-by-nation results, standings, honours, player development, departures, and cup records. `src/season-book.js`, `src/competition-honours.js`, and `src/club-profile.js` read across the full archive; the season book expands all recorded seasons when rendered.
- **A small 20-season test career already uses about 2.9 MB.** A controlled 20-season advance produced a 2,905,075-byte serialized career, of which 2,342,407 bytes were the season archive. This fixture had no active club or player roster, so it is not a worst case. The cloud-save validator rejects serialized saves above 3.8 MB (`src/cloud.js`). Local saves serialize every career slot into one `localStorage` value (`src/manager-desk.js`), so browser storage limits can also become a problem.
- **Loading replays every saved season.** `src/manager-life.js` rebuilds the world by looping through all `seasonYears` and calling season evolution for each one. `seasonYears` and `seasonBook` both grow forever. Trimming old years alone would break this reconstruction path.
- **Some histories already have sensible bounds.** Club identity and tactical-trend evidence keep five seasons; rivalry records keep five seasons and cap the total at 300; player scouting reports cap at 120; retirement notices cap at 80. These are useful patterns, but there is no shared save-wide retention policy.
- **Other career logs need a focused inventory before changing them.** Mail, transfer moves, plan/board records, and several career/event histories are appended in multiple modules. Some may be needed for the user's story or future decisions; do not truncate them blindly.
- **Current long-save coverage is not enough for “endless.”** `test/turnover.test.cjs` advances 20 seasons and checks continuity and reload behavior, but does not measure save size, load work, archive rendering, cloud limits, or very long advances.

## Active-career stress results

A controlled active-career fixture used a real existing club, a full 24-player roster, staff, player contracts, a manager/family profile, and normal generated club mail/history. The same saved world was reloaded through its checkpoint and compared against the full-replay state at each measured horizon.

| Seasons | Checkpoint | Career JSON | Cloud snapshot JSON | Cloud 3.8 MB limit | Local 12 MB import limit | World replay parity |
|---:|---:|---:|---:|---|---|---|
| 20 | 520 KB | 3.81 MB | 3.81 MB | Exceeded | Within | Exact |
| 50 | 529 KB | 7.98 MB | 7.98 MB | Exceeded | Within | Exact |
| 100 | 529 KB | 14.97 MB | 14.97 MB | Exceeded | Exceeded | Exact |

The checkpoint itself stays bounded and world restoration is deterministic at 20, 50, and 100 seasons. **The save as a whole still grows too much:** this active-career fixture crosses the cloud limit by season 20 and the current 12 MB import check by season 100. Full archives, rivals, kits, news, and other histories still accumulate; checkpointing alone does not solve storage growth. No compaction has been implemented.

## Recommended sequence

### 1. Define what must stay exact — INVENTORY COMPLETE

The initial map is in `docs/career-data-retention-map.md`. It classifies save records by simulation need, user-visible history, and candidate summary/export treatment. It identifies the previous-season table as a cup-seeding dependency and transfer/registration history as unsafe to trim until current player-club state is checkpointed. No retention limits have been changed.

### 2. Add a versioned world checkpoint

Before reducing `seasonYears` or old development detail, save a complete deterministic world snapshot at a fixed interval (initially test every 5 seasons). On load, start from the newest valid checkpoint and replay only later seasons. Keep the original replay path for old saves and provide a migration/fallback if a checkpoint is missing or fails validation. Checkpoint state must include stable player/club identities, season, and any seeds/history needed for exactly reproducible future evolution.

### 3. Compact archives without losing the user's story

Keep the latest several seasons in full detail. Convert older season records into a smaller, clearly labelled summary only after the checkpoint path can rebuild the world without them. Preserve important manager-club results, trophies, player milestones, transfers, and rivalry evidence; allow export/recovery of detailed history before compaction. Do not silently delete a save's only copy of a user-visible record.

### 4. Keep screens and saves bounded

Paginate or progressively load old season records rather than rendering every season at once. Establish explicit limits for secondary logs only after the retention map identifies safe summaries. Keep cloud and local save errors recoverable and explain how to export a backup before any compaction.

### 5. Prove continuity at increasing horizons

Add deterministic tests at 20, 100, and 500 seasons (or a faster test fixture with the same state transitions). At each horizon, compare continued simulation with save/reload, verify identities and key records do not reset, measure serialized size and number of replayed seasons, test old-save migration, and check that archive rendering remains bounded. Do not change gameplay balance as part of storage work.

## First implementation slice — checkpoint-only, history retained

Implemented in `src/world-checkpoint.js` and connected to `src/manager-life.js`:

- Keep one compact, versioned world-player checkpoint at five-season replay intervals; old saves without one create it at their next season boundary, then replace it after each further five seasons.
- On load, validate its checksum, schema, template fingerprint and size, player identities, and attributes. Restore from the newest checkpoint and replay only later seasons.
- If no checkpoint exists, its season is not in the saved ledger, or validation fails, use the original full replay path. Existing saves remain readable.
- Store the evolved world as deltas against the bundled player templates, including youth identities and development changes. Do not delete or compact season archives.
- Compare canonical saved world state and next-season evolution with full replay. A controlled 20-season no-club fixture now stores a 521 KB checkpoint in a 2.72 MB career, below the current 3.8 MB cloud-save limit.

Tests: `test/world-checkpoint.test.cjs` covers compact round trips, checksum/schema failure, five-season full-replay parity, deterministic next evolution, and old-save checkpoint creation. `test/turnover.test.cjs` covers the 20-season no-club checkpoint/save-size fixture. Active-career parity and size measurements at 20, 50, and 100 seasons are recorded in `docs/career-data-retention-map.md`. This is still only the checkpoint slice: bounded archive display, 500-season coverage, and a reversible compaction/export migration remain before storage continuity is complete.

## Guardrails

- Keep old saves loadable; never require users to lose a career to upgrade.
- Do not change match, tactical, transfer, or player-development outcomes to make a benchmark pass.
- Keep checkpoints deterministic and validate them before use; a bad snapshot must fall back to safe replay.
- Preserve raw user history through export or a summary that keeps important events visible.
- The tactical-fit study is a separate completed experiment; this work must not modify its parameters or outcomes.
