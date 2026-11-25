# Touchline 26 — UI/UX roadmap

**Owner:** this branch, `arena/35fc6963-soccer-management`
**Companion document:** [`docs/ui-ux-audit.md`](./ui-ux-audit.md) — the page-by-page assessment this plan is built from.
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

| # | Phase | Outcome | Sessions |
|---|---|---|---:|
| 0 | Foundations | Token layer, type ramp, plate/button/field primitives, five breakpoints | 1–2 |
| 1 | Shell & navigation | Three-tier rail, command palette, mobile dock, breadcrumbs, tab rail | 2 |
| 2 | Flagship screens | Home, Inbox decisions, Tactics, Squad, Player record | 2–3 |
| 3 | Matchday | Broadcast HUD, tunnel compressed to 3 beats, full-time board, press scene | 2 |
| 4 | Data workspaces | Responsive table contract, pagination, Schedule, Transfers, Finances, Competitions | 2–3 |
| 5 | Rooms & life layer | Room headers, one shell across clubhouse + manager life, hub for the life layer | 2 |
| 6 | Polish & proof | Motion, empty/loading/error, a11y pass, text size + density settings, perf budget | 1–2 |
| — | *Match engine* | Reserved — starts only after Phase 6 | — |

**Where we are (25 Nov 2026):** audit done · browser toolchain works · sweep run twice — once on an empty career, once on **Kay FC (day 383, 17 players)** from your exported save. 624 screen-states each, zero runtime errors. Results: [`docs/ui-measurements.md`](./ui-measurements.md).

Next: **(B)** fix the measured bugs below, then **(0)** the token layer.

**Current phase: Phase 0 — Foundations (tokens, type ramp, spacing). Step B closed 25 November 2026.**

---

## 2. Step M — measure (M1 done, M2 next)

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

## 4. Phase 0 — Foundations

**Goal:** one vocabulary. After this phase, every later screen is assembled, not hand-painted.

### Deliverables

1. `src/tokens.css` — two tiers.
   - Primitives: `--ink-50…900` (cool neutrals), `--lime-300/400/500`, `--ice`, `--teal`, `--amber`, `--danger`, club accents `--club-primary/secondary` (driven at runtime).
   - Semantics: `--surface-1` (field) `--surface-2` (plate) `--surface-3` (raised/active), `--line` `--line-strong`, `--text-1/2/3`, `--accent` `--accent-ink`, `--good/warn/bad`, `--focus`, `--elev-1/2`, `--radius-s/m/l`, `--space-1…8`, `--dur-fast/base/slow`, `--ease`.
   - **Budget: ≤ 40 semantic tokens, ≤ 150 literal colours in the entire product.**
2. Type ramp — 7 steps, applied by role, not by taste:
   `--fs-micro 11` (labels/eyebrows, +0.12em, uppercase) · `--fs-xs 12` (table meta) · `--fs-sm 13` (body in panels) · `--fs-base 14` (body) · `--fs-lg 16` (panel heads) · `--fs-xl 20` (page subheads) · `--fs-2xl 28` · display `34/44` in Barlow Condensed tabular.
   Nothing below 11 px. **Delete all 98 ad-hoc sizes.**
3. `src/primitives.css` — `.tl-plate` (the one card material: `--surface-2`, 1 px `--line`, 12 px radius, inner top hairline `inset 0 1px #ffffff0a`, no drop shadow), `.tl-btn` (one button, 4 kinds: `primary / quiet / ghost / danger`, one height scale 32/40/44), `.tl-field`, `.tl-chip`, `.tl-tag`, `.tl-table`, `.tl-meter`, `.tl-rail`, `.tl-scroll` (one scroll container contract).
4. Five breakpoints only: `480 / 768 / 1024 / 1440 / 1800`. Add `--page-max: 1560px`; content centres above 1800.
5. Destroy the duplicates: one `.cc-btn` (today redefined 79×), one `.cc-card`, one tab strip. Keep old class names as aliases during migration so nothing breaks mid-flight.
6. Grain and top-light: one `.tl-material` utility (tiled SVG noise at 2.5%, radial top light) applied to the app background.
7. A build-time guard: `scripts/lint-tokens.cjs` fails the build on a raw hex or a non-token `font-size` in any CSS/JS template string outside `tokens.css`.

### Checkpoint 0 (must all be true)

- [ ] `grep -c '#[0-9a-f]\{3,8\}' src/*.css` outside `tokens.css` ≤ 150 total.
- [ ] Distinct `font-size` px values across the product ≤ 12.
- [ ] Distinct `max-width` breakpoints = 5.
- [ ] `.cc-btn` / `.tl-btn` resolve to one base rule with ≤ 6 variants.
- [ ] Build + tests green; `index.html` still renders and the preview server serves it.
- [ ] Visual smoke check at 390/768/1440 on **five** screens (Home, Inbox, Tactics, Schedule, pitch).

---

## 5. Phase 1 — Shell and navigation

**Goal:** 92 screens become feelable.

### Deliverables

1. **Three-tier navigation.** L1 hub rail (72 px, 5 hubs: Clubhouse · Football · Season · Operations · Office) always visible ≥ 1024 px. L2 page panel (200 px, collapsible) with icons + live badges. L3 = page tabs as a segmented rail under the title, scrollable with edge fade, snap, arrow keys, and a "more" overflow.
2. **Command palette** (`⌘K` / `Ctrl-K` / long-press search): fuzzy over pages, players, clubs, competitions, actions and settings, grouped (`Jump / Players / Actions / Recent`). Reuse `global-search.js` as the engine. Esc closes, ↑↓ moves, ↵ enters, `⌘1–5` jumps hubs.
3. **Header rebuild:** breadcrumb (`Football / Squad / Player Stats`) + club chip + date/clock + save status + Continue (calendar) + attention chip (interruptions). Split the mutating Continue per audit §3.8.
4. **Mobile:** 5-slot thumb dock (Home · Inbox · Squad · Tactics · Continue) at 56 px + safe-area inset; everything else in a bottom sheet. Sidebar becomes a sheet above 768 as well.
5. **Favourites + recents.** Pin any page (star in the header), shown at the top of L2 and in the palette; "Jump back in" strip on Home.
6. **Direction-aware transitions** (`enter` 180 ms rise / horizontal slide for L2→L3 depth), respecting reduced-motion.

### Checkpoint 1

- [ ] Every one of the 92 screens reachable in ≤ 3 taps from Home on mobile and ≤ 2 clicks on desktop.
- [ ] Palette finds any page by fuzzy name; keyboard-only journey from boot → any page.
- [ ] No screen shows two stacked horizontal tab strips.
- [ ] Zero horizontal page scroll at 320 px width.
- [ ] Lighthouse a11y ≥ 95 on the shell (skip link present, targets ≥ 44 px on touch).

---

## 6. Phase 2 — Flagship screens

**Goal:** the five screens players see most stop looking like a dashboard.

### 2a. Home — Manager's Office
- Hero at ~38% of the fold: next fixture, countdown, opponent form, one primary CTA, club colour wash, room photograph at 12% opacity.
- **Attention lane**: up to 3 decision cards (not a task list) with "what happens if ignored".
- **Widget board**: reorderable/hideable, 3 densities (`rail / compact / detailed`); persists per career.
- **Instrument strip** replaces 4 KPI tiles: sparkline + delta + tap-through.
- Mobile: hero → attention → 3 widgets → "More". Total scroll ≤ 2 viewports.

### 2b. Inbox decisions
- Row = source mark + crest/avatar + subject + 2-line preview + time + tone strip.
- **Decision card**: headline, sender, deadline, 2–3 options as full-width buttons with consequence hints, "if I ignore it" line.
- Split the four sibling tabs out: Inbox = correspondence only; Social / News / World move to a **Media** hub destination.

### 2c. Tactics
- Pitch-first layout (55/45 desktop, pitch then dock on mobile).
- Choice groups become **segmented dials** (3–4 stops on a track), not stacked buttons.
- **Consequence preview**: changing line height/press tweens the pitch shape and highlights exposed players. Show role familiarity overlay.
- State-aware rail labels; roster becomes drag-and-drop slots.

### 2d. Squad
- Unit grouping (GK/MID/…), sticky headers, per-unit aggregates.
- < 768 px: row cards with condition ring + rating, tap → player record sheet.
- Compare tray (2–3 players → radar).

### 2e. Player record
- Portrait panel, identity block, 6-axis radar with role fit, 10-match form sparkline, development curve, contract/availability strip, compare button.
- On desktop opens as a **side sheet** so list context survives.

### Checkpoint 2

- [ ] 390 × 844 portrait: each screen complete and operable without zoom; no horizontal scroll.
- [ ] Home above-the-fold shows next fixture + what needs doing, nothing else.
- [ ] A decision is answerable in one tap from the Inbox list preview.
- [ ] Tactics: changing a phase instruction visibly changes the pitch within 200 ms.

---

## 7. Phase 3 — Matchday

**Goal:** make the ritual shorter and the pitch feel like a broadcast.

### Deliverables
1. **Compress the tunnel** from 6 pre-match stages to 3 beats — *Prepare* (meeting + selection on one screen: pitch hero + roster dock), *Dress* (briefing verdict banner + collapsible cards, team sheet, talk), *Play* (preview folded into the pitch pre-roll).
2. **Skip to pitch** unlocked after the first three fixtures, plus a "remember this choice" preference. Stepper stays visible.
3. **Broadcast HUD**: score bug pinned over the pitch (crest–score–crest–clock), venue lower-third, 56 px **thumb dock** (Kick off · speed segments · highlights chips · names · replay · sound) always visible, feed as a rising lower-third caption with an auto-dismiss + log button.
4. ≥ 1280 px: live events rail on the right.
5. **Half-time and full time as full-page analysis boards** (score hero, xG race, shot map, ratings heat), replacing `breakDialog`.
6. **Press scene**: dim room, reporter portrait, quoted question in display type, three tonal answers with a reaction meter and a headline preview.

### Checkpoint 3
- [ ] Boot → kick-off on a phone ≤ 4 taps using skip.
- [ ] Every match control reachable with one thumb, ≥ 44 px, no `<details>`.
- [ ] Match runs at 60 fps at 390 px width; the pitch never causes horizontal scroll.
- [ ] Full time is a page, not a dialog.

---

## 8. Phase 4 — Data workspaces

**Goal:** no horizontal tables on phones; every long list has an honest end.

### Deliverables
1. **Responsive table contract**: ≥ 1024 full table + sticky header + sticky primary column; 768–1023 four essential columns + row expand; < 768 **row-card list** with sticky group headers.
2. **Pagination component**: `Showing 1–25 of 214`, `‹ ›`, page size 25/50/100, jump-to-page. Applied to Inbox, Schedule, standings, Scouting shortlist/players, Transfers history, Staff search, Competition results, Season book.
3. **One scroll per screen**: page owns vertical; only deliberate rails scroll horizontally, and with snap + fade.
4. **Schedule**: month accordions on mobile, sticky detail card on desktop, **season spine** minimap (38 matchweeks coloured by result) on Schedule and Competitions.
5. **Transfers / Scouting**: pipeline board (watched → scouted → shortlisted → bid → done) as the primary view; tabs demoted to reference views. **Staff / Development**: roles → candidates → shortlist, and a pathway ladder U18 → U21 → loan → first team.
6. **Finances**: one dashboard — balance + projection line, income vs expenditure bars, wage gauge with top 10 earners, FFP meter, in-place drill-downs. **Vision**: confidence dial + objective rings. **Competitions**: selector rail + qualification bands + real cup bracket.

### Checkpoint 4
- [ ] Zero `<table>` rendered as a horizontal scroller below 768 px (verify by code path, not by eye).
- [ ] Every list > 25 rows paginated with a visible total.
- [ ] Each workspace readable at 390 px with no scroll trap (nested scrollers count as a trap).

---

## 9. Phase 5 — Rooms and the manager-life layer

**Goal:** the product stops looking like two products.

### Deliverables
1. **Room headers everywhere**: a 180 px band behind each workspace title using the existing 14 images (`club-briefing`, `club-dressing`, `club-training`, `club-quayside`, `briefing`, `floodlights`, `supporters`, `terrace`…), 12% opacity, masked to the title edge. Generalise `front()` into one `.tl-room-head` primitive.
2. **A "Manager" hub** in the L1 rail with four sub-rails: *Career* (jobs, interviews, legacy, succession) · *Money* (wallet, household, business) · *District* (ground, connections, people, neighbourhood) · *Archive* (season book, intelligence, records).
3. **One shell for both layers**: same rail/tab/plate/header/type ramp. Keep the warmer editorial typography of the life pages as a deliberate second voice — identical chrome, different paper.
4. **Retire duplicate names.** Club side: `Squad`, `Selection`, `Player record`. Life side: `Your career`, `Your week`, `Your money`. No two destinations share a word.
5. **Dynamics** collapses from 7 tabs to 3: *Room* (social graph wheel), *Mood* (distribution + movers), *Talks* (history + feedback). **Medical** gains an injury timeline (Gantt against fixture dates).

### Checkpoint 5
- [ ] One `.tl-btn`, one `.tl-plate`, one tab strip used by clubhouse **and** life pages (grep-verifiable).
- [ ] Manager-life destinations reachable from the rail, not only from in-page buttons.
- [ ] No two pages share a name in the palette.

---

## 10. Phase 6 — Polish and proof

**Goal:** nothing feels unfinished, and the claims are measurable.

### Deliverables
1. **Motion**: exactly three (`enter`, `reveal`, `pulse`), tokenised durations/easings, reduced-motion honoured in all 7 stylesheets (currently 4).
2. **State layer**: skeletons for > 300 ms, save indicator (`Saving… / Saved 14:02`), `aria-live` announcer for toasts + route changes, inline validation pattern, error panel pattern.
3. **Settings → Interface**: Text size (0.9 / 1.0 / 1.15) and Density (Compact / Comfortable) — the anti-FM feature. Persisted per device.
4. **Accessibility pass**: skip link, 44 px touch targets, heading order per screen (`<h1>` per workspace), focus visible on every interactive element, keyboard journey test on 10 screens.
5. **Performance**: split the 5.1 MB artifact — core shell (< 300 KB gz), per-hub lazy chunks, separate match-engine chunk, fonts as cached `.woff2` rather than base64. Budget: FMP < 1.5 s on a throttled phone, TTI < 2.5 s.
6. **Evidence pack**: screenshots at 390/768/1440 for all 92 screens, an a11y report, and a measured before/after table (colour count, type sizes, breakpoints, artifact size, FMP).

### Checkpoint 6
- [ ] Colour literals ≤ 150; type sizes ≤ 12; breakpoints = 5; artifact shell < 300 KB gz.
- [ ] Zero critical a11y violations; skip link; every touch target ≥ 44 px.
- [ ] Text size + density settings work on 10 representative screens without layout breakage.
- [ ] Before/after table measured and written into `docs/ui-ux-audit.md` as a closing section.

---

## 11. Reserved: match engine

Starts **only** after Phase 6 closes. Planned shape, subject to a fresh audit of `engine.js` / `render.js` / `physics.js` at that time:

1. Read-only audit of the engine's presentation surface (what the pitch draws, what the HUD can show).
2. Visual match analysis: shot maps, xG race, pass networks, pressure heat — fed by data the engine already records.
3. Camera and readability work: optional zoom-to-play, entity scaling at small viewports, colour-blind-safe team colours, name-plate collision handling.
4. Live analytics panels that reuse Phase 3's HUD components.

No engine changes are in scope for Phases 0–6. Rendering support (canvas DPR cap at 2, pitch colours pulled from tokens) is allowed and should happen in Phase 3.

---

## 12. Session log

| Date | Phase | What changed | Next |
|---|---|---|---|
| 2026-11-25 | — | Audit written (`docs/ui-ux-audit.md`); roadmap written; no product code touched | — |
| 2026-11-25 | B | Step B closed: B1–B5 fixed in CSS only, plus three contrast tokens lifted shell-wide. Sweep: 624 states, 0 errors, 0 contrast failures, 0 page overflow, 1 wide table left (`league` @390). | Phase 0: token layer + type ramp |
| 2026-11-25 | M2 | Real career (Kay FC, day 383, 17 players) measured: 624 states, 0 errors. Squad/scouting/league tables confirmed overflowing at all widths; inbox 150 controls; social 13.4x on a phone; tactics contrast isolated to star ratings + role labels. Added `--career=` support to the sweep. | Step B: fix B1-B5 |
| 2026-11-25 | M1 | Browser toolchain solved (npm-only); `scripts/ui-sweep.cjs` written; 624 screen-states measured at 390/768/1440; `docs/ui-measurements.md` written; audit corrected in 5 places; 4 verified bugs logged | M2: populate a save and re-measure the data screens |
