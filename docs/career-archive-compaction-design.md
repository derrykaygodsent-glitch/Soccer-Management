# Career archive compaction design

**Status:** Design proposal only. The current version-1 history sidecar remains exact and reversible, but no compact-save schema or migration is implemented. No career history has been removed.

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

`src/career-archive.js` currently emits `kind: "touchline-career-history"`, `version: 1`, `careerId`, `managerName`, `createdAt`, exact `seasons`, and a checksum. It is an exact copy, not a compacted save. Its 32-bit checksum detects accidental changes only; it does not prove who created the file. Keep its current import behavior: merge only missing exact rows for the same career and timeline, and reject conflicting rows.

### Proposed full-history sidecar — version 2

Version 2 should be introduced separately (do not reinterpret version 1):

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

## Proposed compact record in a career save

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

The real summary must retain exact field shapes where existing readers depend on them. In particular:

- Keep club order, exact final table rows, division membership, movement/qualification, honors, golden-boot result, cup awards, cup-honors, retirements, academy intake, and manager/player milestones.
- Keep the full `development` rows for seasons still needed by checkpoint replay. For older seasons, retain at least the current player diary and milestone evidence until all consumers have a tested summary contract.
- Omit only the bulky match-level `nations[*].results` from the save; retain its count and a clear `detail: "external"` marker. The exact results remain in the sidecar.
- Never let an absent `results` property look like an empty season. The season book must label it “Detailed results in archive” and offer a read-only load/view action.
- Do not compact transfers, kit registration, current eligibility, club/league AI evidence, unresolved decisions, or other records as part of this schema. Their dependencies require a separate design and parity tests.

`seasonYears` remains the exact simulation timeline. Do not truncate, reorder, or reconstruct it from summary rows as part of this work.

## Consumer dependencies found in the current code

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

## Migration and verification gates

Before the first compaction implementation:

- Add readers for both full and compact rows and enumerate every `seasonBook` consumer. Test that missing match results are handled as “external detail,” not as zero results.
- Migrate copied full-detail careers only. Compare the original and compacted careers at the checkpoint boundary and after continued seasons for world players, season evolution, cup draws, club and league AI decisions, shirt eligibility, and current rosters.
- With the sidecar attached, compare exact historical table, awards, retirement and result rendering against the un-compacted save. With it absent, verify useful summaries remain and no crash occurs.
- Test export/verify/compact/restore, old version-1 sidecar import, legacy saves without checkpoints, checksum failures, interruption before save replacement, backup recovery, and duplicate/conflicting records.
- Measure 20, 50, 100, and 500-season active careers for file size, checkpoint replay work, and archive rendering time. Record both the compact save and external archive sizes.
- Do not turn the feature on by default until parity gates pass. Gameplay balance, transfer decisions, registration eligibility, and tactical-study outcomes must not change.

## Immediate next implementation after this design

Build read-only attachment and viewing for the existing exact version-1 sidecar, then add the version-2 validator and round-trip/parity fixtures. Do not implement removal of `seasonBook` results until those UI and migration tests pass and the dependency checkpoint work is complete.
