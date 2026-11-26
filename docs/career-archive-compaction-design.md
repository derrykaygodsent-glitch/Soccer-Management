# Career archive compaction design

**Status:** Version-2 exact sidecar validation/export and read-only attachment/viewing are implemented. A non-mutating `dryRunCompact` candidate transformer and copied-career parity tests are implemented. The compact in-save summary schema below is still not enabled for live careers: no save migration has been implemented and no career history has been removed.

## Design goals

- Reduce the active save while preserving an exact, exportable copy of every removed season record.
- Keep simulation state and outcomes identical; this is a storage and presentation change only.
- Keep a useful season summary available even when the sidecar is not attached.
- Make exact old results viewable from the sidecar without merging them into gameplay state.
- Make restore explicit, validated, reversible, and safe for an interrupted or failed migration.
- Keep old full-detail saves and current version-1 sidecars readable.

## Two separate formats

Do not conflate a full history export with a compact season stub.

### Existing full-history sidecar — version 1

`src/career-archive.js` currently emits `kind: "touchline-career-history"`, `version: 1`, `careerId`, `managerName`, `createdAt`, exact `seasons`, and a checksum. It is an exact copy, not a compacted save. Its 32-bit checksum detects accidental changes only; it does not prove who created the file. The legacy `merge` operation still adds only missing exact rows for the same career/timeline and rejects conflicts. The cross-version restore path can replace a compact stub only when the stub's SHA-256 record digest matches the exact version-1 row.

### Full-history sidecar — version 2 IMPLEMENTED

Version 2 is a separate format; version 1 is not reinterpreted. `packV2` creates it, `inspectV2` strictly validates it, and `inspectAny`/`mergeAny` retain version-1 import support. The Cloud locker exports version 2. `attach` accepts either version, keeps matching records in memory for this browser session, and `readRecord` exposes an exact row only when the career ID, timeline, and stub digest match. Attachment is read-only and is not saved or synced.

```json
{
  "kind": "touchline-season-archive",
  "version": 2,
  "archiveId": "opaque unique archive identifier",
  "careerId": "career identifier",
  "managerName": "display name",
  "createdAt": "ISO-8601 timestamp",
  "firstSeason": 2026,
  "lastSeason": 2035,
  "records": [
    { "year": 2026, "sha256": "digest of canonical exact record", "record": { "year": 2026 } }
  ],
  "sha256": "digest of canonical manifest and records"
}
```

Requirements: years are unique and sorted; each record's `year` matches its wrapper; the record digest is over the canonical JSON representation of the exact original `seasonBook` row; and the manifest digest covers identity, coverage, record digests, and payloads. Use SHA-256 for v2 integrity checks. This detects accidental corruption, not authorship or malicious editing. Keep bounded input sizes and record counts. Version 1 remains importable and should never be silently upgraded by rewriting user files.

## Dry-run compact record in a copied career — IMPLEMENTED; LIVE SAVE MIGRATION NOT IMPLEMENTED

A compacted `seasonBook` row keeps the familiar summary fields and adds an explicit external-detail pointer:

```json
{
  "year": 2026,
  "seasonArchive": {
    "format": 1,
    "detail": "external",
    "archiveId": "opaque unique archive identifier",
    "recordSha256": "digest matching the version-2 sidecar row"
  },
  "nations": {
    "Valdoria": {
      "clubs": ["..."],
      "table": [["club", 20, 14, 42]],
      "honours": [],
      "boot": ["player", "club", 12],
      "resultsCount": 90
    }
  },
  "development": {},
  "departures": [],
  "intake": 0,
  "worldAwards": [],
  "cupAwards": [],
  "cupHonours": []
}
```

`TLCareerArchive.dryRunCompact(careerCopy, validateCheckpoint)` returns a separate `{ candidate, archive, compactedYears, removedResultRows, beforeBytes, afterBytes, archiveBytes, savedBytes }` result. It requires full-detail rows, a timeline-matched checkpoint accepted by the supplied validator, and no active match, practice, interview, legacy exit, or open bid. It validates the full archive before constructing a copied candidate, considers only rows outside the newest-five buffer whose replay year is checkpoint-covered, and removes only `nations[*].results`; each affected nation keeps `resultsCount` and each row points to its exact version-2 archive record. The source object is checked for unchanged JSON before returning. This is a test/measurement API only: it never writes to storage, changes a live career, deletes archive records, or opts a user into migration. Callers must provide a validator that actually verifies the checkpoint checksum, schema, and template compatibility.

The real summary must retain exact field shapes where existing readers depend on them. In particular:

- Keep club order, exact final table rows, division membership, movement/qualification, honors, golden-boot result, cup awards, cup-honors, retirements, academy intake, and manager/player milestones.
- Keep the full `development` rows for seasons still needed by checkpoint replay. For older seasons, retain at least the current player diary and milestone evidence until all consumers have a tested summary contract.
- Omit only the bulky match-level `nations[*].results` from the save; retain its count and a clear `detail: "external"` marker. The exact results remain in the sidecar.
- Never let an absent `results` property look like an empty season. The season book must label it “Detailed results in archive” and offer a read-only load/view action.
- Do not compact transfers, kit registration, current eligibility, club/league AI evidence, unresolved decisions, or other records as part of this schema. Their dependencies require a separate design and parity tests.

`seasonYears` remains the exact simulation timeline. Do not truncate, reorder, or reconstruct it from summary rows as part of this work.

## Consumer dependencies found in the current code

The copied-career audit now covers the result-sensitive paths and the adjacent story screens. Parity assertions confirm manager biography/history, honours-based district reputation, trophy-room rendering, cup draws and next-season gameplay match with results removed. Static consumer inspection confirms club profile, dossier competition history, and cup trophy-cabinet screens use retained tables, honours, cup awards, and summaries rather than the removed scorelines. Those static-only readers remain a review item if the compact summary schema ever changes; this slice does not compact their fields.

- `src/manager-life.js` replays `seasonBook[year - 1].development` for each year after the checkpoint. Those development records must remain exact until the checkpoint passes them.
- `src/cup-circuit.js` seeds cup entries from the previous completed season's ordered table. The table rows, club order, and club names must remain exact; the conservative recent-season buffer keeps that record full.
- `src/club-rivalries.js` consumes match results when a season closes. The close-season record is freshly generated and remains full; the rolling rivalry evidence is saved separately in `clubRivalries` and is not rebuilt from older compacted results during ordinary load.
- `src/season-book.js` displays tables, match results, and departures; `src/competition-honours.js`, `src/club-profile.js`, `src/manager-profile.js`, and `src/football-dossiers.js` read season tables, honors, development, and cup awards. These readers must understand a compact marker and provide a summary-only view when no exact archive file is attached.
- Transfer moves, kit registration, club-world history, league trends, unresolved mail/decisions, and current club/player state have separate simulation or eligibility consumers. They are explicitly outside this first season-results compaction proposal.

## Safe eligibility rule for future compaction

A season is only a candidate when all of the following are true:

1. A valid, current world checkpoint exists and has passed its checksum, schema, and template checks.
2. The season's replay year (`seasonBook.year + 1`) is at or before the checkpoint boundary. `activate()` reads `seasonBook[year - 1].development` for every post-checkpoint replay year, so those source rows must remain exact.
3. It is not in the newest five completed seasons. This is a conservative buffer for cup-seeding tables, rivalry evidence, recent archive screens, and active competition consumers.
4. The archive sidecar contains that exact record and its digest verifies.
5. Transfer moves, registration lists, club-world history, tactical trends, and every other gameplay-affecting record remain untouched by this migration.

This is a candidate rule, not proof that compaction is safe. If a consumer audit finds a newer dependency, retain more detail. Do not compact while an active match or unresolved season-end transaction is open.

## Viewing and restore workflow

1. Export a version-2 sidecar and verify the downloaded file by selecting it back in the same career. Confirm career ID, year coverage, every record digest, and archive ID before offering compaction.
2. Before compaction, create a full pre-migration career backup. Tell the manager that the existing one-slot recovery copy will be replaced, if present, and that the sidecar is a separate file not synced to cloud saves.
3. Compact only eligible rows. Write the summary and archive pointer, keep `seasonYears` and all simulation-critical data unchanged, and verify the resulting save before replacing the live slot.
4. The season book renders compact rows from the save immediately. Exact results remain read-only: the manager selects the matching sidecar when requested; the UI validates career ID, archive ID, year, and record digest, then renders the exact row without adding it to the simulation state. If the sidecar is missing, keep the summary visible and explain that detailed results need the exported file.
5. “Restore season detail” is a separate explicit action. It replaces only a matching compact stub whose archive pointer and summary contract verify, creates a pre-restore backup, and is idempotent. Conflicts, wrong careers, mismatched hashes, partial files, or unknown versions leave the save unchanged.
6. Never claim the sidecar is backed up or available on another device unless the manager actually exports and transfers it. A browser-local cache may be considered later, but must not be the only copy.

## Future proof that the archive was actually saved

A browser cannot prove that a download was kept permanently or copied to another device. The Cloud locker now does not treat “download started” as proof: after exporting, it asks the manager to select the saved file. `TLCareerArchive.verifyCompleteArchive(sourceCopy, parsedFile)` validates the selected version-2 manifest and every record against the still-full career, requires complete season coverage and the same career ID, and returns the archive ID, manifest SHA-256, coverage, and size. The UI displays the selected filename and verification details, binds the session-only confirmation to that career ID, unchanged career snapshot, and manifest digest, and invalidates it if the career changes. This step only verifies the file; it does not offer or perform compaction or replacement. The exact sidecar remains a separate file and is not synced to cloud saves or guaranteed permanent; the manager must keep it safe.

## Copied-save transaction protocol (test harness only)

`test/helpers/compaction-transaction.cjs` exercises the ordering required before a future migration. It is not imported by the app and cannot touch live saves.

1. Require an explicit confirmation that the exact archive was exported and verified.
2. Validate archive digests, career identity, and timeline; reconstruct the original from candidate plus archive and reject any change to non-result fields or compact summaries.
3. If a previous recovery copy exists, require explicit permission before replacing it.
4. Write and read back the full original career backup. If backup storage fails or does not verify, do not replace the career.
5. Write the candidate and verify the stored bytes. On a write or verification error, roll back from the durable backup.
6. Keep the backup after success. If interrupted after replacement, recover from that backup; recovery is idempotent.

The Node tests inject stops after backup and after replacement, backup quota failure, candidate-write failure, unverifiable partial output, declined backup replacement, and invalid archive/candidate data. In addition, a disposable headless Chromium session on 2026-11-19 exercised this same test-only helper against real browser `localStorage`: it committed and read back a compacted copy, recovered it, recovered after injected stops before and after replacement, rolled back an injected candidate-write failure, and confirmed an actual browser quota exhaustion blocks the backup before candidate replacement. The test fixture compacted only synthetic seasons 2026–2028; it did not touch a game career. A separate Chromium UI smoke test caught a real download, opened the browser's file-chooser event from the archive input, supplied the downloaded file through that chooser, and verified it; the synthetic career JSON remained byte-for-byte unchanged. These are disposable sandbox checks, not production storage integration. Headless Chromium does not display the operating-system picker window, so only the native browser file-input/chooser event path—not the OS dialog itself—was exercised. Cross-browser behavior and production interruption boundaries remain unverified.

## Migration and verification gates

Before any compaction can be offered:

- `src/season-book.js` now renders summary rows and shows a clear external-detail notice instead of treating missing results as an empty season. The Cloud locker validates and attaches version-1 or version-2 sidecars; exact rendering is read-only and session-scoped. The consumer audit is complete for results-only compaction; changing any other data shape requires a separate audit.
- **Implemented and tested:** build a non-mutating candidate for copied full-detail careers. Generated 20/50/100/500-season original and compact copies replayed from the start to exactly the same world-player pools. Additional eight-season and club-managed seven-season fixtures compare cup draws, next-season simulation, club/league AI evidence, shirt eligibility/drafts, rosters, manager biography, honours-based reputation, trophy-room rendering, and season-book display with/without attached history. Checkpoint-free legacy display, version-1 exact archive attachment, complete version-2 export verification, and oversize refusal are covered.
- **Test harness plus disposable browser-storage checks:** transaction ordering, backup readback, rollback, injected interruption, and an actual localStorage quota block passed in headless Chromium against synthetic copied-save keys. This helper remains test-only and is not called by the app. The normal Cloud history-restore path also has a pre-replacement failure/recovery test.
- **Consumer audit for this results-only proposal completed:** copied-career parity covers world replay, cup seeding/draws, next-season simulation, AI evidence, shirt eligibility/drafts, rosters, manager biography, honours-based reputation, trophy-room rendering, and season-book detail with/without the sidecar. A source-reader check confirms club profile and dossier competition history consume retained summary fields, not removed match scorelines. This is not approval to change any other `seasonBook` fields.
- **Still required before any migration:** test the operating-system file picker and download behavior across supported browser engines, then design and separately authorize production migration/storage wiring with recovery boundaries. No production migration or storage wiring exists.
- With the sidecar attached, compare exact historical table, awards, retirement and result rendering against the un-compacted save. With it absent, verify useful summaries remain and no crash occurs.
- Test export/verify/compact/restore, old version-1 sidecar import, legacy saves without checkpoints, checksum failures, interruption before save replacement, backup recovery, and duplicate/conflicting records.
- Measure 20, 50, 100, and 500-season active careers for file size, checkpoint replay work, and archive rendering time. Record both the compact save and external archive sizes.
- Do not turn the feature on by default until parity gates pass. Gameplay balance, transfer decisions, registration eligibility, and tactical-study outcomes must not change.

## Synthetic size/render benchmark (2026-11-19)

Run with `node test/career-compaction-benchmark.cjs`. This is a deterministic sizing and archive/render throughput fixture, not a gameplay or save-replay benchmark: it contains two nations, 40 match results per season, and a benchmark-only checkpoint accepted by a test validator. Times are from one local run and will vary by machine.

| Seasons | Source save | Dry-run candidate | External archive | Bytes saved in active save | Dry run | Attach/verify | Render |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 20 | 27,690 B | 24,600 B | 29,687 B | 3,090 B | 16.83 ms | 13.92 ms | 2.41 ms |
| 50 | 68,910 B | 59,640 B | 73,727 B | 9,270 B | 17.16 ms | 11.71 ms | 3.18 ms |
| 100 | 137,611 B | 118,041 B | 147,128 B | 19,570 B | 28.38 ms | 34.03 ms | 5.80 ms |
| 500 | 687,211 B | 585,241 B | 734,328 B | 101,970 B | 166.56 ms | 133.41 ms | 31.72 ms |

Real generated no-club careers were then built with checkpoint creation and dry-run validation using `node test/career-compaction-real-benchmark.cjs 20`, `50`, `100`, or `500`. For each length, the copied original and compact candidate were replayed from the start with their checkpoints removed, then their world-player pools were compared. All four matched exactly. A club-managed seven-season parity fixture also confirms the earlier checkpoint boundary retains the same world pool, cup draw, and roster.

| Seasons | Generation | Original save | Candidate save | Full archive | Active-save reduction | Dry-run/export | Original full replay | Compact full replay |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 20 | 5.62 s | 3,428,850 B | 3,248,374 B | 2,345,161 B | 180,476 B | 454 ms | 714 ms | 708 ms |
| 50 | 16.63 s | 7,140,447 B | 6,581,161 B | 5,994,960 B | 559,286 B | 1.04 s | 1.95 s | 1.88 s |
| 100 | 37.91 s | 13,279,035 B | 12,088,399 B | 12,033,077 B | 1,190,636 B | 2.06 s | 3.77 s | 3.94 s |
| 500 | 394.27 s | 62,252,127 B | 56,010,691 B | 60,280,426 B | 6,241,436 B | 9.17 s | 18.88 s | 19.60 s |

The 500-season archive is below the 64 MiB archive limit, but leaves only about 6.5 MiB of headroom; any larger or richer career may be refused by the current safety limit. A reduced-limit unit test confirms both export and import refuse oversized archives without changing the source, and a no-checkpoint legacy career is rejected by the dry-run before validation. The active-save reduction is 6.24 MB, while the full archive is 60.28 MB. Since the sidecar preserves all exact records, original plus candidate plus sidecar uses more total storage than the original save. The practical benefit measured here is reducing the active save, not reducing total storage. Generation and replay timings are from this sandbox and will vary by machine.

The synthetic 50/100/500 measurements remain useful only for quick sizing/render throughput; the real runs above supersede them for file size and full-replay parity. The synthetic fixtures still do **not** establish production archive rendering performance.

## Immediate next implementation after this slice

Test the operating-system file picker and download behavior in additional browser engines. The transaction helper has passed a disposable Chromium/localStorage check but remains test-only; do not wire it into live saves. Any production storage migration still needs separate authorization and must pass every parity, backup, recovery, and size gate.
