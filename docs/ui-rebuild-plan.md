# UI/UX rebuild — execution plan

**Owner:** this branch (`arena/35fc6963-soccer-management`)
**Created:** 25 November 2026
**Read with:** [`ui-audit-synthesis.md`](./ui-audit-synthesis.md) (what is wrong and why),
[`ui-measurements.md`](./ui-measurements.md) (the numbers), [`ui-roadmap.md`](./ui-roadmap.md) (where we are today).

This document answers one question: **how do we actually rebuild the interface, in what order,
and how do we prove each step worked?**

---

## 1. What "rebuilt" means

The rebuild is done when all ten statements are true, measured on a real career at 390, 768 and 1440:

1. **One shell.** Every screen — clubhouse, operations, world, life, career — is built from the same header, the same status language and the same components.
2. **Two taps to anywhere.** Any of the ~35 destinations is reachable in two taps from any screen, with one Back control and a visible breadcrumb.
3. **One dominant decision per screen.** Every page answers "what do I do next?" in the first viewport, with one primary action.
4. **Status is words first.** `due`, `next`, `locked`, `safe`, `risk`, `pending` are text chips with a deadline, never colour alone.
5. **No silent caps.** Every list longer than 25 rows shows `showing x–y of N` and a way forward.
6. **Tables are decision-safe on phones.** Every table declares a mobile mode (cards, sticky identity, or deliberate scroll) and no table scrolls sideways by accident.
7. **Readable type.** 11 px floor for anything a manager must read; 9 px only for metadata, marked as such.
8. **Thumbs work.** Content tap targets are ≥ 44 px, primary actions are full width on phones, and nothing important hides under the notch.
9. **Consequence is explicit.** Resign, retire, dismiss, submit, appeal, pay and budget actions all use one preflight pattern that lists what will change.
10. **Nothing above moves.** Zero contrast failures, zero page overflow, zero runtime errors, all tests green, gameplay untouched.

## 2. The six contracts (this is the actual rebuild)

The visual work is real, but the part that makes it *stay* rebuilt is a small set of markup
contracts that both the CSS and a checker script understand.

| Contract | Markup | Rule | Checked by |
|---|---|---|---|
| **Page** | `<section data-tl-page>` with eyebrow, `<h1>`, status line, primary action | One `h1`, one primary action, status line present | `ui-contract.cjs` |
| **Status** | `<span data-tl-status="due" data-deadline="3d">Due in 3 days</span>` | Always has a text label; state is never colour-only | `ui-contract.cjs` |
| **List** | `<div data-tl-list data-range="1–25 of 73">` + `[data-tl-pager]` | Any list > 25 shows a range; filters survive navigation | `ui-contract.cjs` |
| **Table** | `<table data-tl-table data-mobile="cards|scroll">` + `data-cell-priority="1..3"` | Declares its phone behaviour; priority 1 columns never hide | `ui-contract.cjs` |
| **Action** | `data-tl-action="primary|secondary|danger"`; danger also `data-tl-preflight` | Exactly one primary; danger always opens a consequence dialog | `ui-contract.cjs` |
| **Nav** | `data-tl-tier="1|2|3"`, `data-tl-breadcrumb` | Exactly one Back; breadcrumb on every deep page | `ui-contract.cjs` |

`scripts/ui-contract.cjs` (built in Phase 0) walks the same 208 screens the sweep walks and
fails loudly. **A phase is not finished until the contract checker is green.**

## 3. Phase sequence

| # | Phase | Outcome | Sessions | Risk |
|---|---|---|---:|---|
| **0** | Foundations | Tokens, type ramp, status anatomy, contract checker | 2 | Low |
| **1** | Shell & navigation | Three-tier nav, one Back, breadcrumbs, command palette, mobile dock | 4 | Medium — touches every page |
| **2** | Daily loop | Home as command centre, Inbox lanes, Calendar agenda, planner slots | 4 | Medium |
| **3** | Squad family | Shared Squad IA, player context, phone roster, dossier, registration | 4 | Medium |
| **4** | Operations family | Operations hub, Staff split, Contracts queue, Scouting/Transfers ranges, Finance period + runway | 6 | High — biggest surface |
| **5** | World intelligence | Breadcrumbs, Competition re-tab, Fixtures grouping, Stats filters, Atlas list parity | 4 | Low |
| **6** | Tactics & matchday | Canonical tactics, prep rail, phone selection sheet, live-match tray, Season Book archive | 5 | High — flagship screen |
| **7** | Life & career | Wire scopes, Household sections, People filters, Governance hub, timelines, legacy | 6 | Medium |
| **8** | Polish & proof | Motion rules, 320–375 px hardening, archive tables, final sweep | 3 | Low |

**Total ≈ 38 focused sessions.** The game reads as a different product after Phase 2 (≈ 10 sessions).
Everything after that is depth.

### Why this order

- **0 before 1:** the shell cannot be rebuilt twice. Tokens first, or every later screen re-invents values.
- **1 before 2:** Home's command centre needs the new nav to link into, and Inbox needs the new header.
- **2 before 3:** the daily loop is what players touch every session; families are visited weekly.
- **3 before 4:** Squad's persistent-player-context pattern is reused by Operations (contracts, scouting, transfers).
- **6 after 5:** Tactics and matchday are treated as the baseline per your audit — we change them last, once every shared primitive exists.
- **7 last but one:** life/governance has the most prose and the fewest players; it benefits from every pattern built before it.

## 4. Phase detail

### Phase 0 — Foundations (2 sessions)

**Deliverables**
- `src/tokens.css`: surface tiers, border strength, ink tiers, status colours, spacing scale, radius, elevation, focus, motion, tabular numerals.
- Type ramp: `--tl-text-decision` (≥ 12 px), `--tl-text-body` (14 px), `--tl-text-table` (12.5 px), `--tl-text-meta` (10 px, only with `data-tl-meta`), `--tl-text-micro` (9 px, badges only).
- Status anatomy: one component, six states, optional deadline, optional next action.
- `scripts/ui-contract.cjs` + `npm run`-free invocation documented.
- `docs/ui-tokens.md`: every token, its job, and what replaced it.

**Gate**
- Contract checker runs 208 screens with 0 errors.
- Sweep: 0 contrast failures, 0 page overflow, min font ≥ 9 px, decision text ≥ 11 px.
- No raw hex added to any new rule (checked by a grep step in the checker).

### Phase 1 — Shell and navigation (4 sessions)

**Deliverables**
- **Tier 1 rail:** five hubs (Today, Football, Operations, World, Life) + Continue. At rest: ≤ 12 visible destinations.
- **Tier 2 panel:** the chosen hub's pages with icons, live badges, and a "pinned" slot the player controls.
- **Tier 3 tab rail:** page tabs with edge fade, snap, keyboard arrows, and a count when > 5.
- **One Back.** Header history on desktop, thumb dock on phones, tab chip removed or merged.
- **Breadcrumb** on every deep page: `Football / Squad / Player`.
- **Command palette** (`Ctrl/⌘-K`): pages, players, clubs, actions, recents. Search becomes an icon plus hint.
- **Mobile:** 5-slot dock (Today, Inbox, Squad, Tactics, Continue) + sheet for the rest.

**Gate**
- Any destination ≤ 2 taps (measured by a script that walks the nav model).
- Tab strip overflow: 0 of 208 phone states, or an explicit fade + arrow + count.
- Contract checker: one Back, one h1, breadcrumb present on every page.

### Phase 2 — Daily loop (4 sessions)

- **Home = command centre:** one next decision, next fixture, unread/response counts, Today's 3–5 commitments, club snapshot. Guide prose and pathways collapse into a footer rail.
- **Inbox lanes:** *Needs response*, *Unread*, *Reference* as count-bearing chips; `1–25 of N`; next-unread button; reader keeps unread/due state in its header; phone keeps a clear back-to-list.
- **Calendar:** agenda-first on phones, month grid with `+N` overflow and a text legend, month/year jump, week/list switch.
- **Planner:** reachable slots drawn before the form; travel, fare and energy in one strip; previous/next day and first-slot shortcuts.

**Gate**
- Home fold ≤ 1.6× at 390, ≤ 1.2× at 1440.
- Inbox controls ≤ 70 per screen at 1440 (from 150), range text present.
- Calendar: every day with > 3 events shows `+N`.

### Phase 3 — Squad family (4 sessions)

- **Squad hub:** Roster, Stats, Availability, Registration, Development, Dynamics — one local nav, persistent player context.
- **Phone roster:** stacked player cards by default, table mode as an opt-in.
- **Dossier:** identity + availability + KPI rail (ability, potential, value, condition, role fit) above attributes and history.
- **Registration:** state/deadline/validation header, pinned selected list, searchable queue, inline conflicts.
- **Medical/dynamics:** urgent-first groups; return date and selection-safe state dominant.

**Gate** — `wideTables` 0 at all widths; contract checker: every table declares a mobile mode; roster tap targets ≥ 44 px on phones.

### Phase 4 — Operations family (6 sessions)

- **Operations hub:** Training, Staff, Scouting, Transfers, Contracts, Finance.
- **Contracts/Renewals** as a first-class 30/60/90-day expiry queue.
- **Staff** split: Overview · People · Recruitment pipeline · Reports (this alone removes the 9.13× phone scroll).
- **Boardroom** card stacks → searchable, sortable table + detail pane.
- **Scouting:** sticky identity, grade/value/status always visible, saved views, visible ranges.
- **Transfers:** My club / World wire as separate scopes; route line `From → To`; pagination replaces the 12-row arrow browsing.
- **Finance:** real period selector (kill the static October label), budget rail above charts, cash runway, chart→table alternative.

**Gate** — staff fold ≤ 2.0× at 390; transfers show a range; finance period control changes the numbers; 0 tables overflow.

### Phase 5 — World intelligence (4 sessions)

- Breadcrumbs `World / Country / Competition` and related-entity links everywhere.
- Competition tabs: **Table · Fixtures · Leaders · Cups**, with Records (Dugouts, Trophy room, Season Book) in an overflow group.
- Fixtures grouped by round/month with Upcoming / Results / All and a current-matchday spotlight.
- Player stats: filters (position, club, min appearances), 25 rows per page, visible count.
- Football Intelligence: `Showing x–y of N` + Load more on every category.
- Atlas: browse-countries list with the map as an enhancement.
- Club and manager dossiers share hero → KPI → action rail → archive.

**Gate** — no sliced list without a range; every dossier reachable ≤ 2 taps with a breadcrumb.

### Phase 6 — Tactics and matchday (5 sessions)

- Tactics stays the baseline shell; **canonical destination** decided: design (Tactics) vs fixture prep (Matchday).
- Scope made explicit: team / zone / player, with plain-language names beside codes (`CB-At · Centre-back, attacking`).
- Sticky summary: formation, mentality, readiness, unresolved warnings.
- Phone: line-grouped starters, collapsed bench, bottom-sheet role/duty/condition editor.
- Prep rail: Plan → Select XI → Review → Team News → Kickoff, one primary CTA throughout.
- Live match: touchline tray closed by default, one Tactical desk action.
- Season Book: archive index with season navigation and real tables.

**Gate** — tactics phone fold ≤ 3.0×; one CTA per prep step; Season Book has an index and filters.

### Phase 7 — Life and career/governance (6 sessions)

- **Wire scopes** stable: Wire · Terrace · Local · World · My feed (My feed stays a feed).
- **Household:** Relationship · Money · Circle · Family · Journal, with one recommended action and explicit consent/consequence framing on sensitive choices.
- **People/Contacts:** filters by status, due date, place, kind; recent vs archive.
- **Association/Governance hub:** founding → licence → league entry dependency rail, current licence, applications/appeals, discipline as separate views.
- **Manager profile:** hero + KPI + segmented nav (Overview, Career timeline, Personal life, Finances, Public record) with indexed timeline.
- **Succession:** handover hero first, history collapsed. **Legacy:** consequence surface with bullet facts, not agenda cards.
- **Enterprise:** holdings + ledger, not equal-weight investment cards.

**Gate** — household fold ≤ 2.0×; every governance deadline visible on one screen; danger actions all use preflight.

### Phase 8 — Polish and proof (3 sessions)

- Motion rules: only Continue readiness, new mail, selection, deadline change, match event, route progress.
- 320–375 px hardening with long names, big money, long statuses.
- Archive tables, numeric alignment, empty/loading/error states everywhere.
- Final sweep + contract run + screenshots for the record.

**Gate** — all ten statements in §1 true at 390/768/1440 on the real career.

## 5. Measurement gates (before → target)

| Metric | Now (measured) | Target | Verified by |
|---|---|---|---|
| Pages with horizontal overflow | 0 | 0 | sweep |
| Tables overflowing | 1 (`league` @390) | 0 | sweep |
| Contrast failures | 0 | 0 | sweep |
| Smallest text | 7 px | ≥ 9 px metadata, ≥ 11 px decision | sweep |
| Sub-44 px content targets @390 | social 272, atlas 404 | ≤ 10 % of controls | sweep |
| Fold depth @390 | social 13.39×, staff 9.13× | ≤ 3.0× per page | sweep |
| Controls per screen @1440 | inbox 150 | ≤ 70 | sweep |
| Nav destinations visible at rest | 26 | ≤ 12 | nav model |
| Taps to any destination | up to 4 | ≤ 2 | nav model |
| Lists > 25 with visible range | 0 | 100 % | contract checker |
| Nested scroll traps @390 | 207/208 states | ≤ 20 % | sweep |
| Phone tab strip overflow | 207/208 states | 0 (or explicit cue) | sweep |

## 6. How a phase runs

1. **Measure** the phase's screens with the sweep (numbers before).
2. **Design** on paper in the doc — layout zones, the one primary action, what collapses.
3. **Build** tokens/components first, then screens; CSS and render strings only.
4. **Verify** with `ui-contract.cjs`, the sweep, and the 312 tests.
5. **Screenshot** before/after at 390 and 1440 into `.audit/`.
6. **Log** the phase in `ui-roadmap.md` with the numbers that moved.

No phase skips step 4. If a number does not move, the phase is not done.

## 7. Risks and how we handle them

| Risk | Handling |
|---|---|
| Two chats editing the same files | This chat only touches `src/*.css` and render strings; anything that looks like rules gets left alone and reported |
| Rebuild breaks the offline single-file build | `npm run build` + tests after every change; bundle size watched |
| Design drift between families | Contracts and tokens land in Phase 0; later phases may not add raw values |
| Too big to finish | Phase 2 is the shippable slice; each phase stands alone |
| Measurement noise | Same sweep, same save file, same three widths every time |

## 8. What we will not do

- Change simulation, save format, or game rules.
- Paginate the active XI or an urgent queue.
- Add neon decoration, or use lime for anything that is not state, focus or next action.
- Add dependencies, fonts or network calls (offline-first stays).
- Rewrite Tactics' restored shell — it is the baseline.

## 9. First sprint — the exact next tasks

**Sprint 0-A (this week):**
1. Script that inventories every colour, font size and radius in `src/*.css` (measure, do not guess).
2. Write `src/tokens.css` and map existing variables onto it.
3. Type ramp pass: 11 px floor for decision text, 9 px metadata with `data-tl-meta`.
4. Status component + helper in `TLClubUI`.
5. `scripts/ui-contract.cjs` with the six contracts.
6. Run sweep + contract checker; record before/after in `ui-measurements.md` §9.

**Sprint 0-B (next):** shell navigation model prototype — the five hubs, the tap-count script, and a single-page proof before touching every screen.
