# Touchline 26 — UI/UX roadmap

**Owner:** this branch, `arena/35fc6963-soccer-management`
**Companion documents:**
[`ui-audit-synthesis.md`](./ui-audit-synthesis.md) — the supplied visual/UX audit (advisory) ·
[`ui-ux-audit.md`](./ui-ux-audit.md) — my measured page-by-page audit (evidence) ·
[`ui-measurements.md`](./ui-measurements.md) — the numbers ·
[`ui-rebuild-plan.md`](./ui-rebuild-plan.md) — how the rebuild is executed (contracts, gates, order).
**Created:** 25 November 2026

This file is the memory of this branch. Any session that picks this up should read §0 first, then the phase table, then only the phase named in the **Current phase** row. Update that row when a phase closes. Do not re-plan from scratch.

---

## 0. North star and working agreement

### The one-line goal

> Make Touchline 26 the best-looking and easiest-to-navigate football management game on any device — a game you play on a phone on the bus and on a monitor at home, that feels like a broadcast product rather than an admin dashboard.

### Position against Football Manager

FM wins on database depth and loses on feel: small type, nested panels, no text scaling, heavy mouse dependence. **We do not compete on data volume. We compete on:**

| Their weakness | Our move |
|---|---|
| 8–10 px type, no scaling | 11 px floor + a real Text size setting |
| Nested panels, no spatial model | three-tier rail + rooms + direction-aware transitions |
| Mouse-first | thumb dock, 44 px targets, list-mode tables |
| Dashboard chrome | broadcast HUD, room photography, attention motion |
| Static screens | consequence previews (a choice moves the pitch) |

### Design decisions already made (do not relitigate without a reason)

1. **Glossy surface, deep drill-down.** Few numbers on the first screen of any page; the depth is one tap away.
2. **Phone is first-class,** not a companion. Every screen ships in a 390 × 844 layout as a design target, not a fallback.
3. **One shell, many rooms.** Same rail, same tab component, same plate, same type ramp everywhere — including the manager-life pages.
4. **Lime = "you can act",** nothing else. Club colours drive ambience.
5. **Motion marks navigation and consequence only.** Three named motions, no decoration.
6. **Offline-first survives** the bundle split. It is a differentiator, not legacy.

### Hard rules for implementation work

- Every visual change lands behind the token layer. **No new raw hex, no new font size, no new breakpoint** after Phase 1. If a value is missing, add a token, don't inline it.
- Every page gets three tested widths before "done": 390, 768, 1440.
- Every interactive target ≥ 44 × 44 px on touch layouts.
- Never regress: focus restoration, `aria-current`, `prefers-reduced-motion`, table captions, chart labels, dialog semantics.
- `npm run build` + `npm test` must pass at every checkpoint. The build currently inlines everything; Phase 1 changes that, so keep `preview.cjs` working throughout.

### Tooling note (browser-based UI work)

A browser is available without the blocked download hosts:
`npm i -D playwright @sparticuz/chromium`, extract the binary with
`node -e "require('@sparticuz/chromium').default.executablePath()"`, decompress
`node_modules/@sparticuz/chromium/bin/al2023.tar.br` to `/tmp/al2023`, then run Chromium with
`LD_LIBRARY_PATH=/tmp/al2023/lib`. `scripts/ui-sweep.cjs` does all of this and prints its own setup reminder.
`package.json` is deliberately untouched until PR #112 (which also edits it) merges; `.audit/` is git-ignored.

### Coordination with the other chat

The other session works on gameplay/technical systems (PR #112: world checkpoints, save retention; it touches `src/`, `test/`, `docs/`, `scripts/`, `build.cjs`, `index.html`).

- **This branch owns:** `src/*.css`, the view/rendering layer (`club-ui.js`, `home.js`, `home.css`, `home.html`, `club-office.js`, `matchday.css`, `style.css`, `season.css`, `reading.css`, `office.css`), plus new `src/tokens.css` and `src/primitives.css`.
- **We do not touch:** `engine.js`, `physics.js`, `referee.js`, `setpieces.js`, `season-state.js`, `world-*.js`, `club-state.js` logic, save/serialisation code.
- Where a shared file must change (e.g. `build.cjs` module list), keep the edit to the minimum and mention it in the PR.
- One PR at a time per area; rebase on `main` before opening.

---

## 1. Phase table

The rebuild is planned in [`ui-rebuild-plan.md`](./ui-rebuild-plan.md) (contracts, gates, risks) and
informed by the supplied audit [`ui-audit-synthesis.md`](./ui-audit-synthesis.md). This table is the
short version — keep the status column honest.

| # | Phase | Outcome | Sessions | Status |
|---|---|---|---:|---|
| M | Measure | Sweep + real-career numbers | 2 | ✅ done |
| B | Measured bugs | Header, title, Back, contrast, tables | 1 | ✅ done |
| **0** | **Foundations** | Tokens, type ramp, status anatomy, contract checker | 2 | ✅ done |
| 1 | Shell & navigation | Three-tier nav, one Back, breadcrumbs, palette, dock | 4 | ✅ **done** (2 sessions) |
| 2 | Daily loop | Home command centre, Inbox lanes, Calendar, planner | 4 | ✅ **done** (3 sessions) |
| 3 | Squad family | Squad hub, player context, phone roster, registration | 4 | ✅ **done** (4 sessions) |
| 4 | Operations family | Operations hub, Staff split, Contracts, Scouting, Transfers, Finance | 6 | |
| 5 | World intelligence | Breadcrumbs, Competition re-tab, Fixtures, Stats, Atlas | 4 | |
| 6 | Tactics & matchday | Canonical tactics, prep rail, phone selection, Season Book | 5 | |
| 7 | Life & career | Wire scopes, Household, People, Governance hub, timelines | 6 | |
| 8 | Polish & proof | Motion, 320–375 px, archives, final sweep | 3 | |
| — | *Match engine* | Reserved — starts only after Phase 8 | — | |

**Where we are (25 Nov 2026):** Phase 3 has its first session in the tree: the squad table is a
card list on a phone with a sort control and views that survive a reload, the player page carries
role fit and form, and registration is a card list too. Tables without a phone mode went 14 to 8.
 audit done · browser toolchain works · live screen + game preview running ·
sweep run twice on a real career (624 states each, 0 errors) · **Step B closed** (5 bugs fixed, 0 contrast
failures). Results: [`docs/ui-measurements.md`](./ui-measurements.md).

**Also written: [`fm26-alignment.md`](./fm26-alignment.md)** — what FM26 does, what we match, and the
three remaining gaps (top navigation bar, bookmarks, one Portal hub).

**Current phase: Phase 4 — Operations family.** Session 1 shipped the contract expiry queue (§20), session 2 the staff split (§21), session 3 the scouting board and its ranges (§22), session 4 the boardroom register (§23), session 5 the transfer centre (§24), session 6 the club account's period control, runway and chart table (§25). **Phase 5 is open**: session 1 rebuilt Competitions around a `World / Nation / Competition` trail and four views plus a Records group (§26). **Phase 4 is closed** — all four phase gates met (staff 1.96× at 390, transfers with a range, the finance period changing the numbers, 0 tables overflowing). Phase 3 is closed at `8e5d3bd` plus the closing pass: see [`ui-measurements.md` §19](./ui-measurements.md). Phase 0 closed the tokens and the type floor. Phase 1 shipped
the part of the shell that is measurable: a five-hub navigation model (`src/screen-head.js`, 35
destinations, each in one hub), a single head bar per screen carrying the breadcrumb, the page anchor,
the queues that are due and exactly one primary action. Contracts: anchors 70/70, one primary 70/70,
breadcrumbs 70/70, 68 status chips, 0 contrast failures, 313 tests. Numbers:
[`ui-measurements.md` §10](./ui-measurements.md). Still open in Phase 1: command palette, phone dock,
and the tier-2/tier-3 panel — the rail is still one scrolling column.

## 2. Step M — measure (M1 and M2 done)

**M1 — done.** `scripts/ui-sweep.cjs` walks every destination and tab at 390/768/1440 and records overflow, fold depth, control count, sub-44 px targets, real computed contrast, table widths, scroll containers and heading count. 624 screen-states, zero runtime errors. Output: `.audit/sweep.json`, `.audit/shots/`, report in `docs/ui-measurements.md`.

**M2 — done.** The sweep now accepts a real career file and was re-run against *Kay FC* (day 383, 17 players):

```bash
node scripts/ui-sweep.cjs --career=.audit/career.json
```

It writes `.audit/sweep-career.json` and `.audit/shots-career/`. Every flagship page now has populated numbers; see §7 of `docs/ui-measurements.md`.

**Checkpoint M2 — met:** `tables > 0`, real rows on `squad`, `tactics`, `fixtures`, `finance`, `transfers`; 0 runtime errors.

**How to re-run any time:** export the career from the game (Cloud saves → Backup & account options → Export career file), then pass it with `--career=`. Nothing about the save is committed; `.audit/` is git-ignored.

---

## 3. Step B — the measured bugs — ✅ closed 25 November 2026

All five are fixed, re-measured and documented (before/after table in §8 of [`ui-measurements.md`](./ui-measurements.md)). CSS and markup only: no game rules, no save data, no simulation touched.

| # | Bug | What landed | Verified by |
|---|---|---|---|
| B1 | Continue clipped on a phone | Header is a two-row grid (title row, tool row); the wallet rides the title row; the clock drops its weekday at ≤660 | bar overflow **0 px** at 9 widths; Continue right edge **377/390**, **349/360** |
| B2 | No visible page title | Full-width title row at ≤980; narrow desktops (981–1240) get a 150 px title minimum | **0** states without a visible `h1` (was 0 at 390 and 768 only) |
| B3 | Duplicate Back chip | Header history hides ≤980, tab chip hides ≥981 | chip count **1 / 1 / 0** at 390 / 768 / 1440 |
| B4 | Faint text (scope grew from Tactics to the shell) | Empty stars `#7a8da0`, disabled header tools `#7d90a6`, inbox date `#93a9c0` | **0** contrast failures in 624 states (was 12 on Tactics, 1–3 everywhere) |
| B5 | Squad table overflow | Cells wrap; `Availability/Age/Nation` fold at ≤1000, `Value` at ≤620 | `wideTables` **0** at 768/1440; only `league` at 390 |

Bonus, same pass: the lime ring that looked like a text highlight behind the page title is gone — it was the shell focus style landing on a non-interactive `h1`.

**Deferred, on purpose:** the phone tab strip scrolls with no edge cue (207 of 208 phone states) → Phase 1. The `league` table at 390 px → Phase 4.

**Not in B** (they belong to later phases): the enormous `social` (13.4× on a phone) and `staff` (9.1×) pages need the Phase 4 pagination component; the 7 px star glyphs get fixed with the Phase 0 type ramp.

---

## 4. Phase detail

Phase-by-phase deliverables, gates and risks live in
[`ui-rebuild-plan.md` §3–§4](./ui-rebuild-plan.md). That is the single source of truth for
*what a phase contains*; this file only tracks *where we are*.

The short version, one line each:

| Phase | One line |
|---|---|
| 0 | Tokens, type ramp (11 px floor), status anatomy, six markup contracts, `ui-contract.cjs` |
| 1 | Five-hub rail + panel + tab rail, one Back, breadcrumbs, command palette, phone dock |
| 2 | Home command centre, Inbox lanes with ranges, agenda-first Calendar, planner slots |
| 3 | Squad hub + persistent player context, phone roster cards, dossier KPI rail, registration |
| 4 | Operations hub, Staff split, Contracts queue, Scouting ranges, Transfers scopes, Finance period |
| 5 | World breadcrumbs, Competition re-tab, Fixtures grouping, Stats filters, Atlas list parity |
| 6 | Canonical tactics, scope clarity, prep rail, phone selection sheet, Season Book archive |
| 7 | Wire scopes, Household sections, People filters, Governance hub, timelines, legacy surface |
| 8 | Motion rules, 320–375 px hardening, archives, final sweep and proof |

### Checkpoints (what must be measurable at the end of each phase)

These are the numbers from [`ui-measurements.md`](./ui-measurements.md) that must move. Full table in
[`ui-rebuild-plan.md` §5](./ui-rebuild-plan.md).

| Phase | Must be true afterwards |
|---|---|
| 0 | 0 contrast failures · 0 page overflow · min text ≥ 9 px (metadata) / ≥ 11 px (decisions) · contract checker 0 errors |
| 1 | any destination ≤ 2 taps · ≤ 12 nav items at rest · 0 tab-strip overflows or an explicit cue · breadcrumb on every page |
| 2 | Home fold ≤ 1.6× @390 · Inbox controls ≤ 70 @1440 with a visible range · calendar `+N` on busy days |
| 3 | 0 wide tables at any width · every table declares a mobile mode · roster targets ≥ 44 px |
| 4 | staff fold ≤ 2.0× @390 · contracts queue exists with counts · finance period control changes the numbers |
| 5 | no sliced list without `x–y of N` · every dossier ≤ 2 taps with a breadcrumb |
| 6 | tactics fold ≤ 3.0× @390 · one CTA per prep step · Season Book has an index |
| 7 | household fold ≤ 2.0× · every governance deadline on one screen · all danger actions use preflight |
| 8 | all ten statements in [`ui-rebuild-plan.md` §1](./ui-rebuild-plan.md) true at 390/768/1440 |

---

## 5. Reserved: match engine

Starts **only** after Phase 6 closes. Planned shape, subject to a fresh audit of `engine.js` / `render.js` / `physics.js` at that time:

1. Read-only audit of the engine's presentation surface (what the pitch draws, what the HUD can show).
2. Visual match analysis: shot maps, xG race, pass networks, pressure heat — fed by data the engine already records.
3. Camera and readability work: optional zoom-to-play, entity scaling at small viewports, colour-blind-safe team colours, name-plate collision handling.
4. Live analytics panels that reuse Phase 3's HUD components.

No engine changes are in scope for Phases 0–6. Rendering support (canvas DPR cap at 2, pitch colours pulled from tokens) is allowed and should happen in Phase 3.

---

## 6. Session log

| Date | Phase | What changed | Next |
|---|---|---|---|
| 2026-11-25 | 4 | **Phase 4, session 5.** Transfers are two scopes, `My club 17` and `World wire 15`, with Arrivals/Departures as sub-tabs inside the club scope only. Twelve a page (`Showing 1 to 12 of 17 deals`, `Page 1 of 2`) replaces the "5 more, use the arrows" note and the deal card's browsing arrows; the card follows the page (`Deal 13 of 17`) and every row carries name, fee, `From → To` and a status chip. The route reads `From Unattached → To Kay FC`, and on a phone the written route replaces the shields. Fixed on the way: every row said "Unnamed player" (the list looked for the name on the deal record), and the page printed ISO dates. Fold 1.83 at 1440 and 2.64 at 390 (1.31 / 2.10 before, for a scope switch, sub-tabs and a second line per row). 0 of 22 tables without a phone mode, 0 overflow at three widths, contrast 0, tiny text 545, sweep 214 x 3, 313 tests. | Phase 4, session 6: finance period, budget rail and runway |
| 2026-11-25 | 4 | **Phase 4, session 4.** The boardroom's card stacks are now tables with one detail pane each: the share register (holder, seat, share, stake, dividends) sorted by stake with a live search and a written range, and the local network (want, status) with the four priced offers moved into the pane for the selected candidate. Minutes are a table too (`3 for · 2 against`, `No vote taken`), and boardroom dates read `7 Dec 2027`. Selection lives in desk state, so a redraw keeps the holder. No engine change: the same five commands with the same preflight. Fold 3.03 at 1440 and 4.74 at 390 on a four-holder register (3.27 / 5.08 before); 0 of 22 tables without a phone mode, 0 overflow at three widths, contrast 0, tiny text 545, sweep 214 x 3, 313 tests. | Phase 4, session 5: transfers scopes and pagination |
| 2026-11-25 | 4 | **Phase 4, session 3.** The scouting board is 25 a page with a written range ("Showing 26 to 50 of 366 players"), "Page 2 of 15", Prev/Next at both ends and a page reset on every filter, sort, reset and saved view. A `Status` column says With your squad / Shortlisted / Registered / Available on the row and the card. Six named saved views per career survive a reload. The player file opens with a sticky identity carrying grade, role fit, value and status: 145 px at 1440, 172 px at 390, pinned under the shell header with 0 overflow. Fixed on the way: the row-button rule was swallowing the phone sort bar ("High to low" in a full-width box), phone cards led with the status chip, and status dates read ISO. 72/72 anchors, primary, breadcrumbs; 0 of 16 tables without a phone mode; contrast 0; tiny text 544 to 545 (one new sort header); sweep 214 x 3, 0 overflow; 313 tests. | Phase 4, session 4: boardroom stacks to table |
| 2026-11-25 | 4 | **Phase 4, session 2.** Staff is split into Overview, People, Recruitment and Reports behind one nav with counts. People and Recruitment are roster plus detail panel: the selected member carries responsibility, target, latest work and the three contract decisions; the selected position carries the two candidates and the signing fee. Phone fold **9.13 to 1.54** (gate 2.0). Fixed on the way: a gold literal in the staff stylesheet (rating, report grade, under review) replaced with `--ui-attention`; ISO staff dates now read `22 Nov 2027`; "Nothing needs you" instead of an empty queue; a proposal waiting for signature no longer repeats as a scouting report. 72/72 anchors, primary, breadcrumbs; 0 of 16 tables without a phone mode; contrast 0; tiny text 776 to 544; sweep 214 x 3, 0 overflow; 313 tests. | Phase 4, session 3: scouting ranges |
| 2026-11-25 | 4 | **Phase 4, session 1.** The contract expiry queue (`src/contract-queue.js`): four facts (players with terms, weekly wage bill, talks open, wages owed) and a queue grouped by the 90-day rule with counts, a status chip in the rule's words and one command naming the next player. The player file now carries that player's contract desk, so a row is a decision in one click; the breadcrumb reads `Squad / Player profile` instead of the raw page id. Phone: one card per player with `Ends`, `18 days`, `Wage` labelled, 0 overflow, every control 44 px. Fixed shell-wide: the last resize handle overflowed its own table by 3 px, and empty tables no longer show a sort bar. Contract 72/72 anchors, primary, breadcrumbs; 0 of 16 tables without a phone mode; contrast 0; sweep 214 x 3, 0 overflow; 313 tests. | Phase 4, session 2: staff split |
| 2026-11-25 | 3 | **Phase 3 closed.** Registration opens with the pinned list (15 chips, #1 to #22), the gap by name and a conflict queue; tested by filing two players with another club, which produced `2 players are filed by another club and cannot appear on this list` and disabled selects. Training readiness is grouped urgent first (In recovery, Needs work, Building, Match ready) with a return date under an injured player. Gates: 0 tables without a phone mode, 0 overflow at three widths, 44 px taps. 313 tests. | Phase 4: operations family |
| 2026-11-25 | 3 | **Phase 3, session 4.** Squad hub: one local nav (Roster, Availability, Registration, Development) under the banner and the unit counts. Availability is urgent-first (9 players need attention, condition ordered); registration states 2 players have no number by name and each list has a search that states its range ("Showing 3 of 17 players"); development states honestly that no movement is recorded yet. Phone taps: tabs, card names, shirt selects, sort controls and secondary buttons all 44 px. 70 screens, contrast 0, 313 tests, sweep 208 x 3, 0 overflow. Not closed: pinned selected list, conflict queue, medical urgency in training. | Phase 3 leftovers, then Phase 4 |
| 2026-11-25 | 5 | **Phase 5, session 1.** Competitions: seven equal tabs at 38 px became four views (`Table · Fixtures · Leaders · Cups`) plus a Records group (`Dugouts · Trophy room · Season book`), all 44 px. A new trail component names the world — `World / Zandora / Premier League` — where World opens the atlas and the nation opens that country's atlas page, and you come back to the same view. Every ISO date on the screen is now written (`29 Oct 2027`, `13 Nov 2027`, `1 Aug 2027`), Leaders says what it ranks, and keyboard focus survives a tab press. Table depth 2.44/4.25 → 2.50/4.37. 72/72 anchors, contrast 0, 313 tests, sweep 214 × 3, 0 overflow. | Phase 5, session 2: fixtures by round with Upcoming / Results / All (today 380 rows, 59 folds on a phone) |
| 2026-11-25 | 4 | **Phase 4, session 6 — phase closed.** The Club account is the live finance surface, not `views.finance`: it now opens with a four-cell rail (wallet, treasury, wage bill, net for the period), `Today / 7 days / 30 days / Season` drives rail, chart, table and statement together, `Club money` draws bars either side of a zero line with `Chart | Table` showing the same 13 days as rows, and a runway line states `₥1,158 a day ... covers less than a day`. `Breakdown · October 2026` is gone. Keyboard focus now survives the redraw (it fell to `<body>` before). Depth 3.04/5.10 → 3.34/5.41. 72/72 anchors, tables 0/22, contrast 0, 313 tests, sweep 214 × 3, 0 overflow. | Phase 5, session 1: breadcrumbs and competition tabs |
| 2026-11-25 | 3 | **Phase 3, session 3.** The player in focus: open a player and a bar under the screen head keeps name, role, condition and value on every other screen, with one click back and one click to clear (364 px, 77 px tall, 0 overflow at 390). Squad health strip states five facts, 2 of them watch-toned in the attention blue. Found and fixed a real bug: the squad table said Available for the two players with no shirt number because `kitScope` is null; both screens now resolve the list through one helper. 70 screens, contrast 0, 313 tests, sweep 208 x 3, 0 overflow. | Phase 3, session 4: squad hub priorities |
| 2026-11-25 | 3 | **Phase 3, session 2.** Every table in the game now declares a phone mode: 0 of 14 (was 14 at the start of the phase). Standings become three labelled lines per club, training readiness and scouting results become cards, the club snapshot becomes one line per club. Player page gains a COMPARE panel (8 rows, 364 px on a phone). Registration states the gap by name: "2 players have no number: Nico Koroma, Haru Vico". 70 screens, contrast 0, 313 tests, sweep 208 x 3 widths, 0 overflow. | Phase 3, session 3: persistent player context, squad hub |
| 2026-11-25 | 3 | **Phase 3, session 1.** Squad table becomes a phone card list (nothing hidden, 14 to 8 tables without a phone mode). Phone sort select and direction button; table views save to localStorage and come back after a reload. Player page gains ROLE FIT (best role 13/20 on Ari Serra, key attributes marked in the lists) and FORM AND AVAILABILITY. Registration list is a card list at 390 px; the squad screen links to it. 70 screens, 0 contrast, 313 tests, sweep 208 screens x 3 widths, 0 overflow. | Phase 3, session 2: compare, shirt gaps, every table on a phone |
| 2026-11-25 | 2 | **Phase 2 closed.** Game preview reloads itself on rebuild (`/__build` watcher, service worker dropped). Live screen: placeholder instead of a broken frame, idle grabber always on, picture age shown. Calendar day bar with next item and a dot legend; planner states booked and free hours. 70 screens, 0 errors, 0 contrast, chips 68 to 76; 624-state sweep clean, 0 overflow; 313 tests. | Phase 3: squad family |
| 2026-11-25 | 2 | **Shell bugs fixed and Portal band added.** Tactics no longer forces the rail open (`reading.css`), hub panels close when a screen is picked, the drawer hides deterministically. Overview now opens with a Needs you band. 70 screens, 0 errors, 0 contrast; 624-state sweep clean; 313 tests. | Phase 2 rest: calendar and planner |
| 2026-11-25 | 1 | **Phase 1 closed.** Sections moved to a top strip (FM26 retired the sidebar), hub panels, pinned screens, command palette (Ctrl/Cmd-K), phone dock, tab rail hidden on a phone. Back verified by driving it. 70 screens, 0 errors, 0 contrast; 624-state sweep clean, 0 overflow; 313 tests. | Phase 2 rest: Portal tiles on Overview, calendar and planner |
| 2026-11-25 | 2 | **Daily loop, first pass.** Live screen fixed (MJPEG buffered by the proxy, now polls JPEGs). Long lists now state a range and page: **8 lists / 440 rows hidden → 0**. Inbox opens in lanes (Needs response, New, Earlier) with the sort order winning when chosen. Gold removed from the palette. Calendar declares its month. FM26 comparison written (`fm26-alignment.md`). 70 screens, 0 errors, 0 contrast; 624-state sweep clean; 313 tests. | Phase 2 rest: Portal tiles on Overview, calendar and planner loop |
| 2026-11-25 | 1 | **Shell contracts shipped.** `src/screen-head.js`: five hubs, 35 destinations (each once), `NEXT` table for the one dominant action. One head bar per screen with breadcrumb, `[data-tl-page]`, status chips and exactly one `[data-tl-action="primary"]`. Contracts: anchors **0→70/70**, primary **0→70/70**, breadcrumbs **70 missing→0**, chips **0→68**, h1 70/70, contrast 0, tiny text unchanged at 786. Sweep 624 states, 0 errors, 0 overflow, min text 9 px; 313 tests. Checker hardened against service-worker reloads (was reporting 61–63/70). Rail: sticky hub headings + fade instead of a sliced row. Open: palette, phone dock, tier-2/3 panel. | Phase 2: daily loop |
| 2026-11-25 | — | Audit written (`docs/ui-ux-audit.md`); roadmap written; no product code touched | — |
| 2026-11-25 | 0 | Foundations shipped: `src/tokens.css` (~90 tokens), palette mapped for `--tl-*` and `.cc-*`, **587 font-size declarations raised** (7 px → 9 px floor), `.tl-status` component, `ui-inventory.cjs` + `ui-contract.cjs` (70 screens). Sweep: 624 states, 0 errors, 0 contrast, 0 overflow, min text 9 px, 312 tests pass. Contract baseline: 0/70 page anchors, 0/70 primary actions, 0/70 breadcrumbs, 440 rows hidden by caps. | Phase 1: shell + nav |
| 2026-11-25 | Plan | Stored the supplied visual/UX audit (`ui-audit-synthesis.md`) with a cross-check against our numbers, and wrote the execution plan (`ui-rebuild-plan.md`): six markup contracts, 9 phases, 12 measurement gates, ≈38 sessions. Phase 0 is next. | Phase 0: tokens + type ramp + contract checker |
| 2026-11-25 | B | Step B closed: B1–B5 fixed in CSS only, plus three contrast tokens lifted shell-wide. Sweep: 624 states, 0 errors, 0 contrast failures, 0 page overflow, 1 wide table left (`league` @390). | Phase 0: token layer + type ramp |
| 2026-11-25 | M2 | Real career (Kay FC, day 383, 17 players) measured: 624 states, 0 errors. Squad/scouting/league tables confirmed overflowing at all widths; inbox 150 controls; social 13.4x on a phone; tactics contrast isolated to star ratings + role labels. Added `--career=` support to the sweep. | Step B: fix B1-B5 |
| 2026-11-25 | M1 | Browser toolchain solved (npm-only); `scripts/ui-sweep.cjs` written; 624 screen-states measured at 390/768/1440; `docs/ui-measurements.md` written; audit corrected in 5 places; 4 verified bugs logged | M2: populate a save and re-measure the data screens |
