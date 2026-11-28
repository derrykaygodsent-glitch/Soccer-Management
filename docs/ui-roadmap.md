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
| 4 | Operations family | Operations hub, Staff split, Contracts, Scouting, Transfers, Finance | 6 | ✅ **done** (6 sessions) |
| 5 | World intelligence | Breadcrumbs, Competition re-tab, Fixtures, Stats, Atlas | 4 | ✅ **done** (4 sessions) |
| 6 | Tactics & matchday | Canonical tactics, prep rail, phone selection, Season Book | ⏳ **tactics signed off 25 Nov 2026** · matchday + Season Book open |
| 7 | Life & career | Wire scopes, Household, People, Governance hub, timelines | 6 | ▶ **1 of 6** (Wire & Terrace done) |
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

**Now — 25 November 2026, evening. The tactics half of Phase 6 is signed off.** The owner closed the
tactics desk: "done with tactics ui/ux how I wanted it." Three rules came out of the review and now hold
everywhere: a team-sheet role cell behaves exactly like the Player column (one click opens the sheet, the
same click closes it, and the open cell carries no styling at all — no ring, no underline, no colour
change, no arrow flip), **no link or text button in the game is underlined**, and the five section menus
open on hover while click, keyboard and Escape keep working. Depth at the sign-off: tactics **1.15**
folds at 1440 and **1.91** at 390.

Measured on the real career the same evening (`1440 / 390` folds) — this is the queue for what is left:

| Screen | 1440 | 390 | What the numbers say |
|---|---:|---:|---|
| News & social (Wire · Terrace) | 13.23 → **2.62** | 16.17 → **2.43** | was 195 controls and 10 018 px; now five named scopes and 6/4 a page |
| Personal accounts | 4.51 → **1.00** | 6.46 → **1.64** | was 14 headings on one page; now four named sections — Overview · Movements · Investments · Getting around — and one page of movements at a time |
| Competitions | 2.64 | 4.25 | four views plus a Records group, no range on the long lists |
| Household | 2.89 → **1.00** | 4.41 → **1.49** | was 7 sections in one scroll; now six named sections, two summary cards and exactly one next step |
| Matches | 2.11 | 2.79 | no prep rail: six prep jobs share the page with the fixture list |
| Manager profile | 1.73 | 2.45 | one scroll instead of segmented views |
| People | 1.44 | 1.74 | no status/due-date/place filters |
| Health & legacy | 1.00 | 1.20 | fine |
| Career history (succession) | 1.00 | 1.00 | **one control on the whole page** — handover has not been built |
| Tactics | 1.15 | 1.91 | signed off |

So **Phase 7 is open** and it is where the remaining work is; the matchday half of Phase 6 (prep rail,
live-match tray, Season Book index) is the other open item. Phase 8 stays closed until both are done.

**Current phase: Phase 4 — Operations family.** Session 1 shipped the contract expiry queue (§20), session 2 the staff split (§21), session 3 the scouting board and its ranges (§22), session 4 the boardroom register (§23), session 5 the transfer centre (§24), session 6 the club account's period control, runway and chart table (§25). **Phase 5 is open**: session 1 rebuilt Competitions around a `World / Nation / Competition` trail and four views plus a Records group (§26). Session 2 turned the 380-row fixtures list into a round browser with `Upcoming / Results / All`, a `Previous`/`Next` stepper, the manager's own match (or result) lifted out of the round, and real scores joined from the league simulation (§27). Session 3 gave Leaders position, club and "at least" filters with 25 rows a page and phone cards, and stopped the dossier categories lying about their totals — `Showing 1 to 25 of 3888` instead of `of 120` (§28). Session 4 made the Atlas a browsable country list with the map as the enhancement (10.04 folds → 2.16 at 1440, 13.46 → 3.99 at 390), gave the club and manager dossiers one shape — trail → hero → KPIs → 44 px action rail → archive — and made a club's name in a league table open the club instead of the atlas (§29). **Phase 5 is closed**: no sliced list without a range, every dossier ≤ 2 taps with a trail. **Phase 6 is open**: session 1 decided the canonical destination (Tactics designs, the next match prepares), removed the `MATCH PREPARATION` strip, named every pitch and team-sheet code in words (`CB-De Centre-back, defending`), pinned a sticky summary above the tab content and fixed the 390 px header that had squeezed the title into 33 px (§30). Session 2 gave the phone a phone layout: the XI reads in named lines (Goalkeeper · Defence · Midfield · Attack), each row names its player and its role in words on one 38 px line, the bench folds behind `Substitutes · 6`, and the role/duty/condition editor became a sheet pulled up from the bottom instead of a panel under seventeen rows — **4.28 → 2.92 folds at 390** in the view the screen opens on, with `Side by side` stated at 3.27 (§31). A follow-up fix made the shirts actually draggable — every marker had carried `draggable="true"` with no drag handler, so the browser's native drag cancelled the board's pointer capture after 7 px and the pitch's own hint described a gesture that did nothing — and stopped the phone's sheet opening on a shirt tap, which had made a two-tap swap impossible (§31.5). **Both sessions were then reverted on the owner's instruction**: the tactics page is back to exactly its pre-Phase-6 state (`0a5b0d3`) for a joint review, and the phase counter is back to `0 of 5` until that review decides what returns. **Phase 4 is closed** — all four phase gates met (staff 1.96× at 390, transfers with a range, the finance period changing the numbers, 0 tables overflowing). Phase 3 is closed at `8e5d3bd` plus the closing pass: see [`ui-measurements.md` §19](./ui-measurements.md). Phase 0 closed the tokens and the type floor. Phase 1 shipped
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
| 2026-11-25 | 7 | **Phase 7, session 2 — Household and Personal accounts.** The two worst pages of the Life hub stopped being one long page each. Household (`src/household.js`) now draws six named sections — `Overview 4 · Relationship · Money · Circle · Family · Journal` — with the count on the tabs that own a list; the overview is two summary cards (`What you owe · Who you carry`) and **exactly one** `YOUR NEXT STEP` action naming the thing due, and the journal is a `TLWirePager` stream (`data-wire-stream="journal"`, twelve entries a desk page, eight a phone one) that keeps every entry in the document. Household **2.89 → 1.00 folds at 1440** and **4.41 → 1.49 at 390** (every section ≤ 1.28 / 1.64). Personal accounts is a new module, `src/personal-accounts.js`: `Overview · Movements · Investments · Getting around`, built from the pieces that already existed (`TLLuma.wallet`, `TLLuma.statement`, `TLPersonalEnterprise`, `TLNeighbour`) rather than re-drawn, and the wallet stopped printing its own three-day statement when a page has a movements section to do it properly. `statement()` grew a sixth argument so a page owns the wrapper: `data-wire-stream="movements"` over the day groups, ten days a desk page and six a phone one, `Showing 1 to 10 of 30 days`. A desk gets the full 1160 px measure here — the district cards read two across and the investments grid fills the width — while a phone gets the same content in one column with a scrolling section nav at 44 px. Personal accounts **4.51 → 1.00 folds at 1440** and **6.46 → 1.64 at 390** (movements 2.49 / 1.92, investments 1.00 / 1.79, getting around 1.00 / 1.70), 0 overflow at both widths, 0 console errors. A section tab is a real button: click redraws, keyboard keeps focus on the tab it pressed (`if(!e.detail)`), and both navs state their section with `aria-pressed`. Monies stay separate — every personal purchase leaves the club treasury untouched and both pages say so. 382 tests (+4 personal accounts, +6 household). | Matches 2.11 / 2.79 — the prep rail |
| 2026-11-25 | 7 | **Phase 7, session 1 — the Wire and the Terrace.** Five scopes named in the product's words — `Wire · Terrace · Local · World · My feed` — with Wire first, and the page now opens on the Wire instead of behind twenty-six posts. `src/wire-pager.js` (new) gives every stream a written range and real pages: `Showing 1 to 6 of 17 stories`, `Page 1 of 3`, `Previous`/`Next` at 44 px, six a page on a desk and four on a phone; hidden rows stay in the document, and turning a page brings the top of the stream back into view. A thread is no longer part of the markup of every post — it exists only for the post being read, and the comments button redraws the feed to open or close it (`aria-expanded` + `aria-controls`, focus returned to the button). The standing column shows the manager's own league table on a desk and its leading lines on a phone, with the rest left to Competitions. Two stories that repeated their own headline (breaking line, press result cards) now state it once, and the same filing reported for the League and the League Cup is printed once. Depth **13.23 → 2.62** at 1440 and **16.17 → 2.43** at 390 (Terrace), Wire **2.62 / 2.70**, Local **2.67 / 2.62**, World **2.96 / 2.97**, 0 overflow, 0 console errors, 6 new pager tests (372 total). | Phase 7, session 2: Household and Personal accounts |
| 2026-11-25 | 6 | **Tactics signed off by the owner.** The review produced three standing rules: the team-sheet role cell behaves exactly like the Player column (click opens the sheet, the same click closes it, no open-state styling at all — the arrow neither flips nor changes colour, the cell keeps its text colour, and the whole cell including the arrow is the click target), no link or text button anywhere in the game is underlined (the bundle ends with a blanket rule, and every `text-decoration: underline` / `text-underline-offset` / `text-decoration-color` declaration was deleted from `style.css`, `home.css`, `club.css`, `matchday.css`, `season.css`, `office.css`, `reading.css`, `tactics-desk.css`), and the five section menus open on hover with click, keyboard and Escape intact. Verified live on Today, Club, Inbox, Squad, World and Life: **0** underlined controls, hover included. Tactics depth **1.15 / 1.91** folds. 366 tests, build 5 546 KiB, 0 console errors. | Phase 7: Life and career — or the matchday half of Phase 6 |
| 2026-11-25 | 6 | **Role-cell dropdowns and the section menus.** A team-sheet role cell became a selection that opens the role sheet in place (no native `select`, lists filtered to genuinely playable roles, pitch↔pitch swaps kept), opening from the chevron as well as the name, and the sheet is placed from the whole cell block so it never covers the cell it came from. The five section menus lost the click-only gate that FM26 does not have: hovering a hub opens its panel, leaving the row closes it after 190 ms, a click keeps it and the next click closes it, `Enter` parks focus on the first item and `Escape` closes. 5 nav tests. | The tactics review that produced the three standing rules above |
| 2026-11-25 | 4 | **Phase 4, session 5.** Transfers are two scopes, `My club 17` and `World wire 15`, with Arrivals/Departures as sub-tabs inside the club scope only. Twelve a page (`Showing 1 to 12 of 17 deals`, `Page 1 of 2`) replaces the "5 more, use the arrows" note and the deal card's browsing arrows; the card follows the page (`Deal 13 of 17`) and every row carries name, fee, `From → To` and a status chip. The route reads `From Unattached → To Kay FC`, and on a phone the written route replaces the shields. Fixed on the way: every row said "Unnamed player" (the list looked for the name on the deal record), and the page printed ISO dates. Fold 1.83 at 1440 and 2.64 at 390 (1.31 / 2.10 before, for a scope switch, sub-tabs and a second line per row). 0 of 22 tables without a phone mode, 0 overflow at three widths, contrast 0, tiny text 545, sweep 214 x 3, 313 tests. | Phase 4, session 6: finance period, budget rail and runway |
| 2026-11-25 | 4 | **Phase 4, session 4.** The boardroom's card stacks are now tables with one detail pane each: the share register (holder, seat, share, stake, dividends) sorted by stake with a live search and a written range, and the local network (want, status) with the four priced offers moved into the pane for the selected candidate. Minutes are a table too (`3 for · 2 against`, `No vote taken`), and boardroom dates read `7 Dec 2027`. Selection lives in desk state, so a redraw keeps the holder. No engine change: the same five commands with the same preflight. Fold 3.03 at 1440 and 4.74 at 390 on a four-holder register (3.27 / 5.08 before); 0 of 22 tables without a phone mode, 0 overflow at three widths, contrast 0, tiny text 545, sweep 214 x 3, 313 tests. | Phase 4, session 5: transfers scopes and pagination |
| 2026-11-25 | 4 | **Phase 4, session 3.** The scouting board is 25 a page with a written range ("Showing 26 to 50 of 366 players"), "Page 2 of 15", Prev/Next at both ends and a page reset on every filter, sort, reset and saved view. A `Status` column says With your squad / Shortlisted / Registered / Available on the row and the card. Six named saved views per career survive a reload. The player file opens with a sticky identity carrying grade, role fit, value and status: 145 px at 1440, 172 px at 390, pinned under the shell header with 0 overflow. Fixed on the way: the row-button rule was swallowing the phone sort bar ("High to low" in a full-width box), phone cards led with the status chip, and status dates read ISO. 72/72 anchors, primary, breadcrumbs; 0 of 16 tables without a phone mode; contrast 0; tiny text 544 to 545 (one new sort header); sweep 214 x 3, 0 overflow; 313 tests. | Phase 4, session 4: boardroom stacks to table |
| 2026-11-25 | 4 | **Phase 4, session 2.** Staff is split into Overview, People, Recruitment and Reports behind one nav with counts. People and Recruitment are roster plus detail panel: the selected member carries responsibility, target, latest work and the three contract decisions; the selected position carries the two candidates and the signing fee. Phone fold **9.13 to 1.54** (gate 2.0). Fixed on the way: a gold literal in the staff stylesheet (rating, report grade, under review) replaced with `--ui-attention`; ISO staff dates now read `22 Nov 2027`; "Nothing needs you" instead of an empty queue; a proposal waiting for signature no longer repeats as a scouting report. 72/72 anchors, primary, breadcrumbs; 0 of 16 tables without a phone mode; contrast 0; tiny text 776 to 544; sweep 214 x 3, 0 overflow; 313 tests. | Phase 4, session 3: scouting ranges |
| 2026-11-25 | 4 | **Phase 4, session 1.** The contract expiry queue (`src/contract-queue.js`): four facts (players with terms, weekly wage bill, talks open, wages owed) and a queue grouped by the 90-day rule with counts, a status chip in the rule's words and one command naming the next player. The player file now carries that player's contract desk, so a row is a decision in one click; the breadcrumb reads `Squad / Player profile` instead of the raw page id. Phone: one card per player with `Ends`, `18 days`, `Wage` labelled, 0 overflow, every control 44 px. Fixed shell-wide: the last resize handle overflowed its own table by 3 px, and empty tables no longer show a sort bar. Contract 72/72 anchors, primary, breadcrumbs; 0 of 16 tables without a phone mode; contrast 0; sweep 214 x 3, 0 overflow; 313 tests. | Phase 4, session 2: staff split |
| 2026-11-25 | 3 | **Phase 3 closed.** Registration opens with the pinned list (15 chips, #1 to #22), the gap by name and a conflict queue; tested by filing two players with another club, which produced `2 players are filed by another club and cannot appear on this list` and disabled selects. Training readiness is grouped urgent first (In recovery, Needs work, Building, Match ready) with a return date under an injured player. Gates: 0 tables without a phone mode, 0 overflow at three widths, 44 px taps. 313 tests. | Phase 4: operations family |
| 2026-11-25 | 3 | **Phase 3, session 4.** Squad hub: one local nav (Roster, Availability, Registration, Development) under the banner and the unit counts. Availability is urgent-first (9 players need attention, condition ordered); registration states 2 players have no number by name and each list has a search that states its range ("Showing 3 of 17 players"); development states honestly that no movement is recorded yet. Phone taps: tabs, card names, shirt selects, sort controls and secondary buttons all 44 px. 70 screens, contrast 0, 313 tests, sweep 208 x 3, 0 overflow. Not closed: pinned selected list, conflict queue, medical urgency in training. | Phase 3 leftovers, then Phase 4 |
| 2026-11-25 | 5 | **Phase 5, session 3.** Leaders: `Position` / `Club` / `At least` filters, 25 rows a page, `Showing 1 to 25 of 119 players`, `Page 1 of 5`, phone cards instead of a five-column scroller (mid-season 119 ranked players). Football Intelligence stopped slicing: players `Showing 1 to 25 of 3888` (was `of 120`), clubs `of 142` (42 clubs were unreachable), managers uncapped, `Show 25 more` with focus kept, and no range where there is no second page. Appearances are not modelled, so "at least" counts the ranked category and says so. 319 tests, 0 contract errors, sweep 214 × 3, 0 overflow. | Phase 5, session 4: Atlas as a browsable country list, one dossier shape (hero → KPI → rail → archive) under the trail |
| 2026-11-25 | 5 | **Phase 5, session 2.** Fixtures went from 380 rows in one scroll (31.88 folds at 1440, 59.27 at 390) to one round at a time: `Upcoming / Results / All` counted in rounds, `Previous` / `Next`, `Round 1 · 13–14 Nov 2027 · 10 fixtures`, a `YOUR MATCH THIS ROUND` spotlight and `YOUR CLUB` marking, and real scores joined by club pair (`Koroba Teachers v Kay FC 0–1`). Depth **1.88 / 3.15**. Five new unit tests for round grouping, the filters, the score join and the date span (318 total). 72/72 anchors, contrast 0, sweep 214 × 3, 0 overflow. | Phase 5, session 3: Leaders filters, 25 a page, and `Showing x–y of N` on Football Intelligence |
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
| 2026-11-25 | 5 | **Phase 5, session 4 — phase closed.** The Atlas is a country list first: `Countries / Map`, `20 nations · 142 registered clubs · 5 continents`, five continent groups with a row per nation (flag, name, `VLD · capital Grandessa`, `5 clubs`, a `Major league` chip only where the season layer says so, a `League` button), continent pills that filter in place, and a family map view that names `nation · continent · capital` and offers `Back to all 20 countries`. Depth 10.04 → **2.16 at 1440** (8,105 → 1,745 px) and 13.46 → **3.99 at 390** (8,910 → 2,644 px); one continent 1.00 / 1.37. Both dossiers are one shape now — trail (`World / Zandora / Kintaba United / Mara Rivas`), hero, four KPIs, a 44 px rail (`Open the league · Open the manager · Open the atlas`) and the archive — with `Club dossier` / `Manager dossier` in the head instead of raw page ids, written dates instead of ISO, and a captioned phone-mode roster. A club name in a league table now opens the club (2 taps), not the atlas. 324 tests (+5), 0 contract errors, sweep 214 × 3, 0 overflow. | Phase 6: tactics and matchday |
| 2026-11-25 | 6 | **Phase 6, session 1.** Tactics is one screen with one job: *design*, said in its own words (`TACTIC DESIGN · Kay FC`), with the `TOUCHLINE 26 / MATCH PREPARATION` strip deleted and `Open the next match` as the single bridge to prep. Every code is named where it is drawn — a pitch key built from the same slots (`CB-De Centre-back, defending`, `FB-Su Full-back, supporting`), role names in sentence case in the team sheet, `abbr` titles on `LB`/`MR`/`CF` — and a sticky summary (`OUT OF POSSESSION 4-1-4-1 · IN POSSESSION 4-2-1-3 · MENTALITY Attacking · FAMILIARITY 92% · 14 to review`) stays pinned above all three workspace tabs. The four shape views are named in words (Out of possession · In possession · Average positions · Side by side), the duplicate auto-pick is gone, and the phone header went from two columns (title 33 px, header 392 px) to one (title 366 px, header 240 px). Depth 2.55 → 2.64 at 1440, 4.27 → 4.28 at 390 (the 3.0 gate is session 2's). 327 tests (+3), 0 contract errors, sweep 214 × 3, 0 overflow. | Phase 6, session 2: line-grouped starters, collapsed bench, bottom-sheet editor, phone fold ≤ 3.0 |
| 2026-11-25 | 6 | **Phase 6, session 2.** The phone stops being a desktop: the team sheet is grouped into `GOALKEEPER` · `DEFENCE` · `MIDFIELD` · `ATTACK` (each heading counting its rows, every starter in exactly one line), and a phone row is `CB · 4 Dario Novak · Centre-back · READY` — 38 px, no sideways scroll, no columns hidden from the manager that the sheet does not own. The bench folds behind `Substitutes · 6` (`Show`/`Hide`, `aria-expanded`, rows still in the document); the role/duty/condition editor becomes a bottom sheet (`position:fixed`, 82dvh, opened by tapping a mark or a row, with `Close` and the player picker) while a desktop keeps it inline. The pitch leads the card at 262 px after the phase switch and the two formation controls, the phase caption goes (the sticky bar already states it), the desk briefing is one line of named arrivals (169 → 113 px), and the pitch key keeps `DM-Su Defensive midfielder` on a phone with the duty verb in its own element — the 22 px of page overflow it caused at 390 is gone. **4.28 → 2.92 folds at 390** in the view the screen opens on (2,939 → 2,002 px), 3.27 for the opt-in `Side by side`, 240 → 188 px header, Team Instructions 3.40 → 3.19, Player Instructions 2.44 → 2.23; 1440 unchanged at 2.66 for `Side by side` and 1.99 for one shape. 331 tests (+4), 0 contract errors, 0 contrast failures, sweep 214 × 3, 0 overflow, nested scroll traps 39/38/38. | Phase 6, session 3: the match prepares — prep rail with one primary action per step |
| 2026-11-25 | 6 | **Phase 6, session 2, fix.** The pitch had never been draggable: every marker carried `draggable="true"` and `src/` has no `dragstart`/`drop` handler, so the browser's native drag cancelled the board's pointer capture after the 7 px threshold (`lostpointercapture` → `finish(ev,true)`) and the drop never happened — replayed identically on session 1's build. The attribute is gone; a shirt now carries under the pointer and drops where it is let go (390 `81.5%/28.6%` → `34.88%/41%`, 1440 → `50%/56%`, the point survives a tab switch, and a CDP touch drag does the same). The bottom sheet also stopped opening on every selection: a shirt tap selects, a team-sheet row opens the sheet, Close clears both — so a two-tap swap works on a phone again and a drag no longer covers the pitch it just rearranged. Fold unchanged: 2.92 at 390, 1.99 at 1440. 333 tests (+2), gates 18/18 drag, 28/28 session 2, 32/32 session 1, 0 contract errors, sweep 214 × 3, 0 overflow. | Phase 6, session 3: the match prepares — prep rail with one primary action per step |
| 2026-11-25 | 6 | **Phase 6, sessions 1–2 reverted.** `src/board-room.js`, `src/reading.css` and `test/tactics-board.test.cjs` were restored to `0a5b0d3` — the page as it was found before Phase 6 — because the pitch and the drag had lost something the owner wanted, and the page should be reviewed together before more is layered on it. The page is therefore back at **4.27 folds at 390** (2,932 px) and **2.55 at 1440** (2,055 px), with the 392 px phone header, the 439 px pitch, the flat 17-row team sheet, `Both` as the stored view and `draggable="true"` back on the markers. `index.html`, `offline-worker.js`, `src/` and `test/` are byte-identical to `0a5b0d3`, 324 tests, docs §30/§31 flagged as reverted, phase counter back to 0 of 5. Nothing was force-pushed: `16a51bc`, `76a7d5a` and `366e62f` still hold every shape, word, shadow and drag fix, to be brought back one at a time. | Phase 6, session 1 (again), after a joint review of the tactics page |
| 2026-11-25 | 6 | **The tactics page, with its drag restored.** The page stays as found (`0a5b0d3`, 4.27 folds at 390, 2.55 at 1440, 17-row team sheet, 439/494 px pitch, `Combined · In Possession · Out of Possession · Both`) with one attribute removed: markers no longer carry `draggable="true"`, so the board's own pointer drag runs instead of Chromium's native drag, which had been releasing the capture on the first move (`lostpointercapture` → cancel). A shirt now carries under the pointer and drops where it is let go at both widths (`81.5%/28.6%` → `34.88%/41%`), click-select-then-click-grass still moves, the keeper still cannot be moved, and the depth is unchanged. 324 tests, contract 72/72 (§32). | Review of the tactics page together; Phase 6 counter stays 0 of 5 until that decides what returns |
| 2026-11-25 | 6 | **Tactics is the page from the other Arena branch** (`origin/arena/ac97a20f-soccer-management`, PR #112, tip `8c38b02`), copied and nothing else. `src/board-room.js`, `src/match-board.js`, `src/tactical-zones.js`, `src/club-tactics.js` and the recognised-formation catalogue in `src/data.js` come from that branch verbatim; `src/reading.css` is a three-way merge against `b8ca8d6` (theirs for tactics, ours for the shell, both for the tail); two engine functions were taken so role and instruction edits reach the engine. The page is now two pitches side by side at 1440 (`Out of Possession` 4-1-4-1 · `In Possession` 4-2-1-3), 22 docked markers with hidden-position ghost labels, `Team Shape · Team Instructions · Player Instructions`, `Combined · In Possession · Out of Possession · Both`, and a pointer drag that shows a drop target and snaps. Fold 2.65 @1440. **357 tests** (their 43-test tactics suite replaces our 5), contract 72/72, sweep 214 × 3, 0 overflow, other screens pixel-identical. Two deliberate differences: a guarded `max-width:640px` header stack (our 11 px labels vs their 9–10 px) and their rail test rewritten for this branch's drawer-only shell (§33). | Phase 6 counter stays 0 of 5 until the tactics page is signed off |
| 2026-11-25 | 6 | **The tactics desk, redesigned around the pitch.** `src/tactics-desk.css` (new, every selector scoped to `#homeScreen:has(.fm-tactics-workspace)`, none of them touching `.shape-field`, the markers, the shirts or the pitch card) rebuilds the chrome: a hero that names the tactic in three chips, two metric tiles and a review chip, the tactics library on its own row, **tabs that stay at the top** (sticky) on every width, one toolbar for the four phase views and the four shape controls, a four-fact snapshot strip, a line-grouped team sheet (GK/Defence/Midfield/Attack with counts, 8 columns beside a pitch, 6 under it, a two-line card on a phone) with a foldable bench, three instruction cards, and a player rail in the player tab. Fold 4.34 → **4.11** at 390 in `Both` (3.66 one phase, 3.47 instructions), 2.66 → 2.66 at 1440 `Both` and **2.09** one phase; 357 tests, contract 72/72, 0 contrast failures, sweep 214 × 3, 0 overflow, drag re-verified by pointer path. The pitch was not touched, and nothing is anchored to the bottom of a phone. | Phase 6 counter stays 0 of 5 until the tactics page is signed off |
| 2026-11-25 | 6 | **The tactics desk, rebuilt flat (Round 2 after review).** Round 1 was gated and rejected on sight — *"too many lines and is too crowded"*, weak on a phone — so `src/tactics-desk.css` was **rewritten, not extended**: five horizontal bands before the pitch became three, six bordered panels became one (the pitch), the four-card snapshot went away, and the page now states each fact once. The live state (`Familiarity 95% · Intensity 50% · Needs review · 14`) sits in the **one sticky bar with the tabs at the top**, the hero is a name and its chips with the library pushed right (a `Tactics library` disclosure under 1100 px), the toolbar is one line of four phase views plus four shape controls, the team sheet is a six-column FM-style table (POS · In-Possession role · Out-of-Possession role · player · fit · readiness) with `GOALKEEPER 1` group rows and hairline separators — **and no inner scroll box**, so all eleven starters and the folded bench are reachable on a phone (Round 1 hid four behind a 60vh scroller). Team Instructions is two columns: a 520 px visualiser stack (header, phase switch, pitch, zone analysis) beside the contextual instructions with the tactical overview under them, the duplicated readiness pill gone; Player Instructions opens on the first starter instead of an empty pane, both phases side by side. Opposition analysis and the captaincy select became one `Match context` strip; the second `Auto-select best XI` went. Fold 4.11 / 3.66 / **2.82** / 2.50 at 390 (from 4.11 / 3.66 / 3.47 / —), **1.84** one shape and **1.59** instructions at 1440 (2.09 / 1.87). 357 tests, contract 72/72, **0 contrast failures** (tiny text 778 → 692), sweep 214 × 3, 0 overflow, nested scroll traps on tactics 2 → 0, drag re-verified by pointer path, 18/20 other-page captures byte-identical. | Phase 6 counter stays 0 of 5 until the tactics page is signed off |
