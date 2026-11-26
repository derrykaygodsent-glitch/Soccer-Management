# Touchline 26 — measured UI results

Every number here was read from a live browser (Chromium 158) on **624 screen-states** — 35 destinations × their tabs × 3 widths (390 / 768 / 1440). Tool: [`scripts/ui-sweep.cjs`](../scripts/ui-sweep.cjs). Raw data: `.audit/sweep.json`. Screenshots: `.audit/shots/`.

**Zero runtime errors across all 624 loads.** The app is stable; everything below is presentation.

---

## 1. What was measured — and what was not

**Measured:** page-level horizontal overflow, fold depth (page height ÷ viewport height), interactive control count, controls smaller than 44 px, the smallest font actually rendered, real computed text-on-background contrast, table width against its container, tab-strip overflow, scroll containers, visible `<h1>` count.

**Not yet measured:** screens with real data. This save is a *founded club with no players*, so squad-dependent pages (Squad, Tactics selection, Finances, Schedule) rendered **empty states**. Those rows describe layout and chrome, not populated tables. Populating a save is the next job.

---

## 2. Headline numbers

| Measure | Result |
|---|---|
| Screen-states measured | 624 |
| Runtime errors | 0 |
| Page-level horizontal overflow | 0 of 624 |
| Smallest rendered font | **7.45 px** — present on every screen |
| Controls below 44 px | **88%** of all controls |
| Deepest page on a phone | `intelligence` — **15.06× viewport** |
| Most sub-44 px targets on one screen | `atlas` — **406** controls |
| Worst contrast | `tactics` 15, `jobs` 10, `home` 3, `inbox` 3 |

---

## 3. Per-page table (default tab of each destination)

| Page | fold @390 | fold @1440 | controls @1440 | sub-44px @390 | min type | contrast fails | tables |
|---|---:|---:|---:|---:|---:|---:|---:|
| `home` | 2.19× | 1.37× | 66 | 57 | 7.45px | 3 | 0 |
| `inbox` | 1.26× | 0.89× | 71 | 65 | 7.45px | 3 | 0 |
| `day` | 1.38× | 1.18× | 95 | 68 | 7.45px | 2 | 0 |
| `jobs` | 11.38× | 4.72× | 136 | 133 | 7.45px | 10 | 0 |
| `squad` | 0.87× | 0.89× | 58 | 55 | 7.45px | 2 | 0 |
| `kitOffice` | 0.87× | 0.89× | 56 | 53 | 7.45px | 2 | 0 |
| `planner` | 1.23× | 0.89× | 58 | 55 | 7.45px | 2 | 0 |
| `tactics` | 2.56× | 1.38× | 105 | 80 | 7.45px | 15 | 0 |
| `training` | 1.85× | 0.89× | 58 | 55 | 7.45px | 2 | 0 |
| `scouting` | 2.1× | 1.77× | 92 | 91 | 7.45px | 2 | 1 |
| `intelligence` | 15.06× | 3.85× | 188 | 65 | 7.45px | 2 | 0 |
| `bids` | 0.87× | 0.89× | 56 | 53 | 7.45px | 2 | 0 |
| `clubPromises` | 0.87× | 0.89× | 56 | 53 | 7.45px | 2 | 0 |
| `league` | 1.08× | 0.98× | 82 | 79 | 7.45px | 2 | 1 |
| `fixtures` | 1.38× | 1.18× | 95 | 61 | 7.45px | 2 | 0 |
| `vision` | 0.87× | 0.89× | 56 | 53 | 7.45px | 2 | 0 |
| `staff` | 0.87× | 0.89× | 56 | 53 | 7.45px | 2 | 0 |
| `dynamics` | 0.87× | 0.89× | 56 | 53 | 7.45px | 2 | 0 |
| `medical` | 0.87× | 0.89× | 56 | 53 | 7.45px | 2 | 0 |
| `development` | 0.87× | 0.89× | 57 | 54 | 7.45px | 2 | 0 |
| `transfers` | 0.87× | 0.89× | 65 | 61 | 7.45px | 2 | 0 |
| `club` | 0.87× | 0.89× | 57 | 54 | 7.45px | 2 | 0 |
| `create` | 0.87× | 0.89× | 61 | 57 | 7.45px | 2 | 0 |
| `faOffice` | 0.87× | 0.89× | 56 | 53 | 7.45px | 2 | 0 |
| `finance` | 2.53× | 1.43× | 60 | 57 | 7.45px | 2 | 0 |
| `succession` | 0.87× | 0.89× | 56 | 53 | 7.45px | 2 | 0 |
| `district` | 0.91× | 0.89× | 65 | 58 | 7.45px | 2 | 0 |
| `household` | 2.07× | 1.44× | 69 | 66 | 7.45px | 2 | 0 |
| `neighbourhood` | 0.99× | 0.89× | 59 | 56 | 7.45px | 2 | 0 |
| `people` | 0.87× | 0.89× | 60 | 57 | 7.45px | 2 | 0 |
| `social` | 4.18× | 3.57× | 89 | 87 | 7.45px | 2 | 0 |
| `atlas` | 10.11× | 8.8× | 416 | 406 | 7.45px | 2 | 0 |
| `personal` | 4.21× | 2.86× | 67 | 64 | 7.45px | 2 | 0 |
| `profile` | 1.7× | 1.4× | 69 | 66 | 7.45px | 2 | 0 |
| `legacy` | 0.91× | 0.89× | 60 | 57 | 7.45px | 2 | 0 |

---

## 4. Findings the pixels confirmed

### 4.1 The phone header overflows and clips the primary button
At 390 px the header row (menu · search · date · wallet · **Continue**) does not fit. `.audit/shots/390-home.png` shows **Continue cut off at the right edge**. The document reports no overflow because the header clips it — so no "is the page scrolling sideways?" check would catch this. **This is the worst mobile defect found: the main action of the whole game is partly off-screen.**

### 4.2 There is no visible page heading on a phone
`h1Count` is **0 at 390 px** on every screen, and 1 at 1440 px. The page title (`#homeTitle`) lives in the bar that collapses on mobile, so on a phone the player never sees which page they are on, and screen-reader heading navigation has nothing to land on. (`#homeTitle` keeps `tabindex="-1"`, so focus still works — but visually there is no title.)

### 4.3 A duplicate "Back" control sits inside the tab strip
Every screen at 1440 px shows **Back** twice: once in the history group at the top, and again as the first chip of the tab row (`Overview · Calendar · Inbox · Profile`). Visible in `1440-home.png` and `1440-tactics.png` — it looks like a stray button that leaked into the tab markup.

### 4.4 Tap targets are far below the platform minimum
**88%** of all interactive controls are smaller than 44 px in at least one dimension. On Home at 390 px: **57 of 66** controls. On Tactics: **80 of 104**. On `atlas`: **406** controls below 44 px — the map is a field of sub-touchable hotspots. This is the largest single barrier to "phone first-class".

### 4.5 7.45 px text is real, not a stylesheet artefact
The minimum rendered font size is **7.45 px** and it appears on **every** screen measured. That confirms the audit's §3.1 finding by observation rather than inference.

### 4.6 Two pages are enormous on a phone
`intelligence` is **15.06 viewports** tall at 390 px (≈12,700 px of scroll), `jobs` is 11.38×, `atlas` 10.11×. On desktop they shrink to 3.85× / 4.72× / 8.8× — so these pages stack instead of reflowing, and their length is largely unbroken card lists, which is exactly where pagination belongs.

### 4.7 Contrast failures are concentrated, not spread
Most screens show 1–3 failing text/background pairs, but **`tactics` shows 14–15** — genuinely unreadable label/background combinations. The palette-level pairs pass (7.55:1 / 5.12:1), so these are per-component pairings, e.g. muted labels sitting on the green pitch panel. Worth a targeted fix, not a global retune.

### 4.8 What is actually fine — protect it
- **No page ever scrolls sideways** at any width. The mobile-table failure I predicted did not happen at page level.
- **Zero runtime errors** in 624 loads, including every tab transition.
- The **tactics screen** in a real browser is much better than the stylesheet implied: a proper two-column board (tactical shape left, team sheet right), segmented phase chips, familiarity/intensity read-outs, and a save-tactic control. It reads like a real management tool, not a card grid.
- Mobile **card body text** is a comfortable 13–14 px with good spacing. The problem is the chrome and the micro-labels, not the prose.

---

## 5. Corrections to the audit (`docs/ui-ux-audit.md`)

| Audit claim | What the browser showed | Correction |
|---|---|---|
| "18 destinations in 5 groups" | The sidebar renders **26 destinations** in this state, and **35 unique nav ids** across shells — life-shell and clubhouse pages share one sidebar | "26–35 depending on shell state" |
| "The first screen is the main menu" | There is a **splash** first ("Enter Touchline"); the menu sits behind it | Added to the entry flow |
| "Tables force horizontal scroll on phones" | Page overflow is **0**; only 2 states have a table wider than its own container (`scouting`, `league`) | Softened — contained risk, not systemic |
| "Home is ~2,400 px on mobile" | Home measures **2.19×** (≈1,850 px) at 390 px. The long pages are `intelligence` (15×), `jobs` (11×), `atlas` (10×) | Replaced estimate with measurements |
| "Contrast discipline is good" | Palette pairs pass, but **15 rendered pairs fail on Tactics** | Keep the praise, add the exception |

---

## 6. Next steps

1. **Populate a save** (club + squad), then re-run `scripts/ui-sweep.cjs` so Squad, Tactics, Schedule, Finances and Transfers are measured with real rows.
2. **Fix the four bugs found here** — clipped Continue, duplicate Back chip, missing mobile heading, Tactics contrast. Small, self-contained, and they make every later screenshot honest.
3. **Start Phase 0** (tokens, type ramp, primitives) with this baseline in hand.


---

## 7. M2 — re-run with a real career (populated screens)

**Save measured:** *Kay FC* — manager *Derry Kay Godsent*, game day **383**, **17 players**, 9 staff, 73 messages, founded club. Loaded from your exported career file; **624 screen-states re-measured, 0 runtime errors.**

This closes the gap from §1: the shop windows now contain real rows.

| Page | empty 1440: fold / controls | **real 1440: fold / controls / contrast** | real 390: fold / sub-44px | tables wider than box |
|---|---|---|---|---:|
| `home` | 1.37× / 66 | **1.22× / 66 / 3** | 1.89× / 58 | 0 |
| `inbox` | 0.89× / 71 | **0.9× / 150 / 3** | 1.35× / 65 | 0 |
| `squad` | 0.89× / 58 | **1.1× / 97 / 2** | 1.16× / 94 | 1 |
| `tactics` | 1.38× / 105 | **2.14× / 122 / 12** | 3.13× / 107 | 0 |
| `fixtures` | 1.18× / 95 | **1.72× / 101 / 2** | 2.05× / 68 | 0 |
| `league` | 0.98× / 82 | **2.12× / 97 / 2** | 2.3× / 94 | 1 |
| `finance` | 1.43× / 60 | **2.68× / 65 / 2** | 3.84× / 62 | 0 |
| `transfers` | 0.89× / 65 | **1.1× / 80 / 2** | 1.6× / 76 | 0 |
| `scouting` | 1.77× / 92 | **2.39× / 104 / 2** | 3.08× / 101 | 1 |
| `staff` | 0.89× / 56 | **5.37× / 119 / 2** | 9.13× / 116 | 0 |
| `medical` | 0.89× / 56 | **2.06× / 84 / 2** | 2.57× / 81 | 0 |
| `dynamics` | 0.89× / 56 | **2.08× / 125 / 2** | 5.33× / 122 | 0 |
| `club` | 0.89× / 57 | **1.31× / 79 / 2** | 2.77× / 76 | 0 |
| `social` | 3.57× / 89 | **11.52× / 275 / 2** | 13.39× / 272 | 0 |

### New findings from real data

**7.1 The squad table overflows on every device — confirmed.**
`wideTables = 1` at 390, 768 **and** 1440. On the phone (`.audit/shots-career/390-squad.png`) the columns `Position · Age · Nat · Value` run past the right edge with no scrollbar and no fade. This is the most-used table in the game, and my earlier softened claim (§5 of the audit) is now restored for this table specifically: it *does* force a sideways scroll on a phone. `scouting`, `league` and `kitOffice` overflow the same way.

**7.2 The inbox triples in density when it has real mail.**
71 controls empty → **150 controls** at 1440. Most of the shortfall is gone from this screen (75 of 150 are under 44 px, versus 65 of 68 in the empty state), so the Inbox is the best-adapted screen in the product — but 150 interactive elements on one screen is a lot to scan.

**7.3 Two pages are effectively unrolled spreadsheets.**
- `social` — **13.39× viewport on a phone, 11.52× on desktop**, 275 controls, 273 below 44 px. Roughly 10,800 px of feed on a 900 px-tall desktop window.
- `staff` — 9.13× phone / 5.37× desktop.
Neither has pagination or a "load more". These are the two pages that most need the Phase 4 pagination component.

**7.4 Tactics has 12 failing contrast pairs — and now I know which.**
Measured samples: `Forward 2.9:1 @10.6px`, `★★☆ 2.0:1 @8px`, and a role dot at `3.0:1 @10px`. So it is the **role labels and star ratings on the pitch and in the roster**, not the coaching note. Any fix must lift those two, not darken the panel.

**7.5 7 px text appears once there is real data.**
The minimum rose from 7.45 px (empty) to **7 px** (populated). Star-rating and micro-badge glyphs are the culprits.

**7.6 The Tactics screen is a genuine strength — protect it.**
The populated screenshot (`.audit/shots-career/1440-tactics.png`) shows the real design: *Gegenpressing*, **4-1-4-1 out of possession / 4-2-1-3 in possession**, familiarity 92 %, intensity 50 %, a segmented *Combined / In Possession / Out of Possession / Both* control, four read-outs (active pair, mentality, familiarity + role fit, coaching note with a named player and a reason), and **two live pitches side by side**. That is a better tactics screen than most of the category, and it should be the reference for the rest of Phase 2.

### Measurement caveat (be honest)

The sub-44 px counts include the sidebar nav items (240 × 31), even when the drawer is closed on mobile. Real in-content shortfalls are therefore lower than the raw numbers — but every screen still has **50+** undersized controls, so the conclusion does not change: tap targets are the main thing between this and "phone first-class".

### Corrections carried into the audit

| Claim | Now | Correction |
|---|---|---|
| "Tables force sideways scroll" — softened in §5 of the audit | Squad, Scouting, League and Kit Office tables **do** overflow at 390, 768 and 1440 | Restore for these four; keep it softened for the other workspaces |
| "Tactics contrast is one component" | It is the **star ratings (2.0:1) and role labels (2.9:1)** | Fix those two elements specifically |
| "Home is the page that needs paging" | `social` (13.4× phone) and `staff` (9.1× phone) are far worse | Paging work starts there, not on Home |

---

## 8. Step B — what was fixed, and what it measures now

All five bugs were presentation-only: CSS and markup, no game rules, no save format, no simulation. Re-measured with the same real career (Kay FC, day 383): **624 screen-states, 0 errors**.

| # | Before (measured) | After (measured) | File |
|---|---|---|---|
| B1 | `.hc-bar` `scrollWidth` **457 @390 / 406 @360 / 483 @480**; Continue right edge **457** on a 390 px screen | Header is a two-row grid. Bar overflow **0 px** at 360/390/480/660/768/900/980/1100/1440; Continue right edge **377/390**, **349/360**, **647/660** | `src/home.css` |
| B2 | `.hc-location` width **0** at 390 px; `h1Count` **0** on every page at 390 and 768 | Title owns a full-width header row. States with no visible `h1`: **0** at 390, 768 and 1440 | `src/home.css` |
| B3 | Two Back controls at ≥661 px (header history **and** tab-strip chip) | Exactly **one** Back at ≤980 (tab chip; header history hidden), **no** duplicate chip at ≥981 | `src/home.css` |
| B4 | Tactics **12** failing pairs; **1–3 per state** on almost every screen; worst `★☆` 2.03:1 @8px | **0** failing pairs across all 624 states | `src/reading.css`, `src/home.css`, `src/office.css` |
| B5 | `wideTables` 1 on `squad`, `scouting`, `league`, `kitOffice` at 390, 768 **and** 1440 | **0** at 768 and 1440; only `league` still over at 390 | `src/reading.css` |

### 8.1 The three token changes behind B4

| Element | Was | Now | Ratio |
|---|---|---|---|
| `.fm-stars i` — empty star glyphs | `#3a5259` | `#7a8da0` | 2.03 → **4.93:1** |
| `.hc-tool:disabled` — header Back with no history | `#53647b` | `#7d90a6` | 2.90 → **5.35:1** |
| `.inbox-message-list small` — mail date line | `#8098b2` | `#93a9c0` | 3.76 → **4.63:1** on a selected row |

The "role labels 2.9:1" from §7.4 turned out to be the shell's history buttons, not text on the pitch: the pitch labels already passed. Nothing on the green panel was darkened.

Two decoration cases were left alone on purpose: `.life-face` (the dotted face on a skin-tone disc) and `.media-avatar` (initials on a gradient) are artwork, not text, and cannot be scored honestly.

### 8.2 B5 in practice

At 390 px the register now shows `Pkd · Name · Position` and wraps instead of scrolling (`.audit/shots-career/390-squad.png`). `Availability`, `Age` and `Nation` fold away at ≤1000 px, `Value` at ≤620 px, and the name cell wraps (`overflow-wrap:anywhere`) so a long name can never widen the table again.

This is the stop-the-bleeding version. The full row-card list (tap a row, read everything) stays in Phase 4.

### 8.3 Two metric corrections

1. **The stubborn 3 px** was `.table-column-resizer` — the column-width drag handle, which overhangs the table by 3 px by design. `wideTables` now compares the table's own box to its container, instead of the container's `scrollWidth`.
2. **Contrast over art is not measurable.** Text over photographs, gradients or avatar art has no single backdrop colour, so the sweep now skips it and says so. The first version of that skip walked all the way to `<body>`, hit a gradient and skipped *everything* — it printed a perfect 0 that meant nothing. It now follows the same path as the background lookup and stops at the first opaque colour.

### 8.4 New findings from this pass (for later phases)

- **The phone tab strip scrolls with no cue.** `#homeTabs` overflows on **207 of 208** states at 390 px (Back + 4 tabs is wider than 390). It does scroll, but nothing on screen says so. → Phase 1 navigation.
- **`league` still overflows at 390 px** — the last table waiting for the Phase 4 table→list contract.
- **Everything else is unchanged by design:** fold depth (social 13.39× at 390, staff 9.13×), tap targets (atlas 404, social 272 under 44 px at 1440) and the 7 px minimum text. Those are Phase 4 and Phase 6 work.

---

## 9. Phase 0 — Foundations (tokens and the type floor)

Two changes, both measurable: the product now has one token layer, and no text is smaller than 9 px.

### 9.1 Before and after

| Metric | Before Phase 0 | After Phase 0 | Gate |
|---|---|---|---|
| Smallest computed text | **7 px** | **9 px** | ✅ ≥ 9 px |
| Contrast failures (624 states) | 0 | **0** | ✅ = 0 |
| Pages with horizontal overflow | 0 | **0** | ✅ = 0 |
| Tables overflowing | 1 (`league` @390) | 1 | unchanged |
| Runtime errors | 0 | **0** | ✅ = 0 |
| Tests | 312 pass | **312 pass** | ✅ |
| Fold depth @390 — social / staff | 13.39 / 9.13 | 13.40 / 9.36 | unchanged (Phase 2/4 work) |
| Fold depth @1440 — staff | 5.37 | 5.48 | unchanged |
| Sub-44 px targets @1440 — atlas / social | 404 / 272 | 404 / 271 | unchanged (Phase 1/8 work) |

**587 font-size declarations were raised**: 539 + 6 (shorthand) + 11 (clamp minima) + 4 (second
pass for the 14 px root) + 27 glyph values held at 9 px. One UA behaviour mattered: `<small>` is
83 % of its parent, so a `<small>` inside a `.72rem` block computed to **8.4 px** even after the
sweep; a single `small { font-size: max(9px, .84em) }` rule closed it.

### 9.2 What was built

| File | What it does |
|---|---|
| `src/tokens.css` | ~90 tokens: surfaces, edges, ink, action, eight status pairs, type ramp, spacing, radius, motion, focus, layout |
| `docs/ui-tokens.md` | the rules, the ramp and what changed |
| `scripts/ui-inventory.cjs` | reads the stylesheets and reports what they actually use (11,252 declarations scanned) |
| `scripts/ui-contract.cjs` | walks 70 screens (35 destinations × 1440/390) and scores the six contracts |
| `.tl-status` | the eight-state chip with a deadline slot — built, not yet used on screens |
| `[data-tl-meta]` | marks the only text allowed below 11 px |

Palette mapping: `--tl-*` now point at `--ui-*` (same values, one source). `.cc-workspace` and
`.hc-dialog` moved their surfaces, edges, ink and status colours from the purple-grey family onto
the navy tokens; their identity accents (electric cyan, lime, purple data colours) were kept, so
the workspaces still read as their own rooms.

### 9.3 The contract baseline (this is what the rebuild has to close)

70 screens measured, 0 runtime errors:

| Contract | Baseline | Target |
|---|---|---|
| Page anchors `[data-tl-page]` | **0 / 70** | 70 / 70 |
| Screens with exactly one `h1` | **70 / 70** ✅ | keep |
| Screens with exactly one declared primary action | **0 / 70** | 70 / 70 |
| Status chips | 0 (component exists, unused) | every state on screen |
| Long lists with a visible range | **8 lists, 440 rows hidden** | 0 hidden |
| Tables declaring a phone mode | **0 / 14** | 14 / 14 |
| Danger actions without preflight | 0 / 0 (none declared yet) | must stay paired |
| Duplicate Back controls | **0** ✅ | keep (fixed in Step B) |
| Screens with a breadcrumb | **0 / 70** | 70 / 70 |
| Text under 11 px not marked metadata | **786** | 0 |

Those numbers are the Phase 1–8 scoreboard. `ui-contract.cjs --strict` fails the build on the five
that must be zero (contrast, danger-without-preflight, duplicate Back, no-h1, runtime errors).

### 9.4 A metric correction

SVG `<text>` was being counted as text (the Atlas map labels sit at 3.6 user units). Vector labels
scale with their drawing, so they are not a typographic choice; the sweep and the contract checker
now skip anything inside `<svg>`. Without that, the "smallest text" number could never reach the
floor, no matter how well the CSS was written.

## 10. Phase 1 — Shell and navigation (first pass)

Measured with `node scripts/ui-contract.cjs --live --career=.audit/career.json` (70 screens = 35
destinations × 1440/390) and `node scripts/ui-sweep.cjs --career=.audit/career.json` (624 states).

### 10.1 The contracts that moved

| Contract | §9 baseline | Now | Target |
|---|---:|---:|---:|
| Page anchors `[data-tl-page]` | 0 / 70 | **70 / 70** | 70 / 70 |
| Exactly one primary action | 0 / 70 | **70 / 70** | 70 / 70 |
| Screens without a breadcrumb | 70 / 70 | **0 / 70** | 0 / 70 |
| Status chips on screen | 0 | **68** | grows as states are marked |
| Exactly one `h1` | 70 / 70 | 70 / 70 | keep |
| Duplicate Back controls | 0 | 0 | keep |
| Contrast failures | 0 | 0 | keep |
| Text under 11 px, not metadata | 786 | 786 | 0 (Phases 2–7) |
| Long lists without a range | 8 lists / 440 rows | 8 / 440 | 0 (Phase 2) |
| Tables without a phone mode | 14 | 14 | 0 (Phase 4) |

Sweep after the change: **624 states, 0 runtime errors, 0 contrast failures, 0 horizontal overflow**
at 390 / 768 / 1440, smallest text **9 px** at all three widths. Widest fold 15.17 / 10.17 / 11.59
viewports (was 15.07 / 10.11 / 11.53 — the head adds ~20 px above the fold on a phone).

Tests: **313 pass, 0 fail**.

### 10.2 What was built

- **`src/screen-head.js` — the navigation model.** Five hubs (Today 4, Squad 9, Club 13, World 5,
  Life 4) covering all 35 destinations exactly once (asserted in the file's own smoke check), plus a
  `NEXT` table naming the one dominant action per screen. `rail()` returns the shape the desk
  renderer already knew, so replacing the old three-group literal was a one-line change in
  `manager-desk.js`.
- **One bar per screen**: `hub / screen` breadcrumb, `[data-tl-page]` anchor, status chips for queues
  already known to the desk (`1 unread in Inbox`, `2 to review · Registration deadline`), and exactly
  one `[data-tl-action="primary"]`. The bar carries no title of its own — the screen's heading already
  states it — so nothing is repeated twice above the fold.
- **Primary actions are honest about what they do.** `home` runs the real command
  (`data-tl-do="continue"`, same handler as the header's Continue). The other 34 declare the screen
  where the decision is finished and label it as a jump ("Open the transfer desk"). Phase 3 replaces
  them with in-place commands as each screen is rebuilt — the contract stays green either way because
  it measures *presence*, not intent.
- **The rail says where you are**: sticky hub headings, a fade at the scroll edge instead of a row
  sliced mid-height, and a lime inset marker on the current item.

### 10.3 Two things that were wrong in the tooling

1. **The checker was flaky in `--live` mode** — 3 of 5 runs reported 61–63 of 70 screens because the
   service worker reloaded the tab and destroyed the execution context mid-click. It now waits for
   the rail to be complete (reloading once if it is not) and retries a destroyed probe by reopening
   the same destination. Five consecutive runs: 70/70, 0 errors.
2. **`›` is banned** by `test/disclosure-defaults` (no arrow glyphs anywhere). The crumb separator is
   now `.tl-crumb-sep::before { content: '/' }` in CSS — the same rule the audit asked for, expressed
   without a glyph.

### 10.4 What is still open in Phase 1

| Item | State |
|---|---|
| Five-hub rail model | ✅ done |
| Breadcrumb + page anchor + one primary | ✅ done (70/70) |
| One Back that returns to `from` | ◐ kept the app's own history stack; it already returns to the previous screen and there are 0 duplicate controls. A deterministic `from` stack is scheduled with the phone dock. |
| Command palette (`Ctrl/⌘-K`) | ⬜ not started |
| Phone dock (Today / Inbox / Squad / Tactics / Continue) | ⬜ not started |
| Tier-2 panel and tier-3 tab rail as designed | ⬜ the rail is still one scrolling column of five hubs |

Phase 1 is therefore **partly shipped**: the contracts every screen now meets are in, the visual
shell redesign is not. Phase 2 (daily loop) can start on top of this without waiting for the palette.

## 11. Phase 2, first pass (daily loop)

### 11.1 The live screen was genuinely frozen

The picture stopped while the work log kept moving, so the screen looked live when it was not.
Cause: the viewer used a multipart MJPEG stream. A proxy in the path buffered it, the image never
advanced, and the log (a normal fetch) looked fine. The viewer now polls single JPEG frames every
220 ms and shows the age of the picture it is holding ("picture 0.4s old"). Checked by comparing five
frames one second apart during a driven tour: five different images.

### 11.2 Numbers after this pass

| Contract | §10 | Now |
|---|---:|---:|
| Long lists without a range | 8 lists / 440 rows | **0 / 0** |
| Page anchors | 70 / 70 | 70 / 70 |
| One primary action | 70 / 70 | 70 / 70 |
| Breadcrumbs | 70 / 70 | 70 / 70 |
| Status chips | 68 | 68 |
| Tables without a phone mode | 14 | 14 |
| Text under 11 px, not metadata | 786 | 786 |
| Contrast failures | 0 | **0** after the colour change |

Sweep: 624 states, 0 errors, 0 contrast failures, 0 horizontal overflow at 390 / 768 / 1440,
smallest text 9 px. Tests: 313 pass.

### 11.3 What was built

- **A pager for every long list** (`src/list-pager.js`). Lists of more than 25 rows state
  "Showing 1 to 25 of 148" and reveal 25 more per click. Rows stay in the document, so reading more
  never costs a redraw. Applied to the player dossier (120 results) and the social feed, and to the
  inbox at 60 rows a page so the urgent lanes stay on screen.
- **The calendar states what it shows.** The month grid is a layout, not a hidden list, so it now
  says "Showing 1 to 30 of 30 days, whole month" and is marked `data-tl-grid`. The checker skips
  declared grids, which removed two false positives at each width.
- **Inbox lanes.** The message list opens as Needs response, New, Earlier, each with a count. A
  chosen sort order turns the lanes off, because an explicit order is a request for one list. This
  also kept an existing test honest.
- **No gold.** The amber accent is now a cool periwinkle (`--ui-attention`), the same family as the
  `due` status pair. National flags and star ratings keep their own colours because they are artwork.

### 11.4 Tooling notes

- The contract checker and the screenshot helper both had to survive a service worker reload during
  a run. Both now wait for the rail to be complete and retry once.
- `data-tl-list` marks a container as a list of records, `data-tl-grid` marks a layout. Those two
  attributes are how the checker tells "hiding rows from me" apart from "drawing a month".

## 12. Phase 1 finished (the shell)

Measured the same way as §10 and §11. The six contracts stayed green while the shell changed shape.

### 12.1 What shipped

| Item | State |
|---|---|
| Five hubs | ✅ Today, Squad, Club, World, Life. 35 destinations, each in one hub, all still in the document. |
| Sections along the top | ✅ `#homeNav` moved into a `.tl-topnav` strip under the header. Each hub button opens a panel with that hub's screens. The left rail is now a drawer at every width, opened by the menu button. |
| Pinned screens | ✅ Three defaults (Inbox, First team, Tactics), plus the `Pin` button in every screen head. Stored in `localStorage` as `touchline.pins.v2`. |
| Command palette | ✅ `Ctrl` or `Cmd` and `K`. Type to filter, arrow keys to move, `Enter` to go, `Esc` to close. |
| Phone dock | ✅ Today, Inbox, Squad, Tactics, Continue. Hidden above 720 px. The section tab rail hides on a phone, so the phone shows one navigation row, not three. |
| One Back that returns to where you came from | ✅ Verified by driving it: palette to Squad / Tactics, then Back returns to Today / Overview. One Back control, zero duplicates. |

### 12.2 Verification (driven, not assumed)

At 1440: 35 destinations in the top bar, 5 hubs, panel opens with 9 items, palette opens on
`Ctrl-K`, typing "tac" lands on Squad / Tactics, Back returns to Today / Overview, dock hidden,
0 page errors.
At 390: same, plus the dock is visible, tapping Squad lands on Squad / First team, 0 page errors.

### 12.3 Numbers

| Contract | Now |
|---|---:|
| Page anchors | 70 / 70 |
| One primary action | 70 / 70 |
| Breadcrumbs | 70 / 70 |
| Long lists hiding rows | 0 |
| Duplicate Back | 0 |
| Contrast failures | 0 |
| Text under 11 px, not metadata | 786 (Phases 3 to 7) |
| Tables without a phone mode | 14 (Phase 4) |

Sweep: 624 states, 0 errors, 0 contrast failures, 0 horizontal overflow at 390 / 768 / 1440,
smallest text 9 px. Widest fold 13.06 / 9.82 / 11.20 viewports. Tests: 313 pass.

### 12.4 Still open from Phase 1

Nothing. The palette, the dock, the panels and the Back behaviour are in.
The rail is now a drawer rather than a column, which is what FM26 did with it.

## 13. Two shell bugs found on the phone preview

Reported from the running game preview at about 641 px wide. Both were real and reproduced first.

### 13.1 The sidebar was pinned open on Tactics only

`src/reading.css` carried a block from the old shell that forced the rail back into the layout
whenever the tactics workspace was on screen:

```
#homeScreen.hc-shell:has(.fm-tactics-workspace) .hc-sidebar{display:flex!important;position:relative!important;visibility:visible!important;transform:none!important}
```

With the rail replaced by a drawer, that meant Tactics kept a 265 px panel over the content that
could not be closed. Removed, the shell is now one column on Tactics like everywhere else, and the
drawer keeps its normal open and close behaviour.

### 13.2 A hub panel stayed open after choosing a screen

The click handler closed the panel only when the click landed outside the top bar. Choosing a
destination is a click *inside* it, so the panel stayed open over the new screen. Picking a screen
now closes the panel and refreshes the dock and the pin strip.

The drawer also hid late (visibility transitioned with the same timing as the slide). It now hides
deterministically: `transition: transform .19s ease-out, visibility 0s linear .19s`.

Verified at 641 px by driving it: open the drawer, pick Tactics, drawer closed and hidden; open the
Squad hub, pick First team, panel closed, dock marks Squad, breadcrumb `Squad / First team`.

### 13.3 Portal band on the Overview

The Overview now opens with a **Needs you** band: one row per queue that is actually open, each a
status chip and a name ("1 unread Inbox", "2 to review Registration deadline"), and one click to
the screen that resolves it. The head no longer repeats the same chip, so nothing is stated twice
on one screen.

Numbers after this pass: 70 screens, 0 errors, anchors 70/70, one primary 70/70, breadcrumbs 70/70,
long lists hiding rows 0, contrast 0. Sweep: 624 states, 0 errors, 0 contrast, 0 overflow,
smallest text 9 px. Tests: 313 pass.

## 14. Phase 2 closed (the daily loop)

### 14.1 The game preview now updates itself

The game preview (`preview.cjs`, port 4173) serves a build stamp at `/__build` and injects a small
watcher into every page. When `index.html` changes, the page drops its service worker registration
and reloads once. No refresh, and no stale build from the offline cache.

Checked by driving it: load the page, record `performance.timeOrigin`, touch `index.html`, wait.
The page reloaded on its own in under two seconds.

### 14.2 The live screen, again

The earlier freeze was the MJPEG stream. Two more holes were closed:

- `/frame.jpg` returned `204` before the first frame existed, which the browser drew as a broken
  image. It now returns a small placeholder that says "starting the browser".
- The idle frame grabber only ran while an MJPEG client was attached, so a polling viewer could
  receive the same still image forever. It now runs whenever a CDP page exists.

The viewer also prints the age of the picture it is holding, so a still frame cannot look live.

### 14.3 Calendar and planner

- Every calendar day states itself: `2 booked` chip, the next item with its time, and a legend for
  the coloured dots (Match, Personal, Training, Paid work, Medical). Until now the dots were
  unexplained and the day had no summary.
- The office planner states its load: `N booked` and `M free hours` out of the 06:00 to 22:00 day.

### 14.4 Numbers

| Contract | §13 | Now |
|---|---:|---:|
| Status chips | 68 | **76** |
| Long lists hiding rows | 0 | 0 |
| Page anchors / primary / breadcrumbs | 70/70 | 70/70 |
| Contrast failures | 0 | 0 |
| Text under 11 px, not metadata | 786 | 786 |
| Tables without a phone mode | 14 | 14 (Phase 4) |

Sweep: 624 states, 0 errors, 0 contrast failures, 0 horizontal overflow at 390 / 768 / 1440,
smallest text 9 px. Tests: 313 pass.

Phase 2 is complete: home queue, inbox lanes, list ranges, calendar summary, planner load.

---

## 15. Phase 3, first session: the squad family

Date: 25 November 2026. Career: Kay FC, day 13 November 2027, 17 players.

## 15.1 What changed

| Area | Before | Now |
|---|---|---|
| Squad table on a phone (390 px) | A seven column table; three columns hidden by an old phone rule | Card per player: `position tag · name · value` then `position · age · nation · availability`. Every cell renders, nothing is hidden |
| Sorting on a phone | Only the header row sorted, and the header row is not drawn in card mode | "Sort by" select plus one "Low to high / High to low" button above the cards |
| Saved table views | Kept in memory only, lost on reload | Written to `localStorage` under `touchline.tables.v1`, keyed by career, screen and table |
| Player page | Attributes, a radar plot and a scouting report | Adds a "ROLE FIT" box and a "FORM AND AVAILABILITY" box, and the key attributes of the best role are marked in the lists |
| Registration & numbers | A four column table at 390 px | Card per player, with the shirt select inside the card |
| Moving between squad work | No link from the squad screen | "Shirt numbers and registration" and "Squad planner" buttons under the position counts |

## 15.2 The render, looked at

- `.audit/look-390-squad.png`: cards at 390 px. Row reads `GK Ari Serra ₥432,000 GK · 25 · Zandora Available`.
- `.audit/phase3-squad-phone-sorted.png`: same screen after sorting by value.
- `.audit/phase3-player.png`: role fit, form, radar, scouting panel, then the four attribute groups.
- `.audit/phase3-player-phone.png`: the same page at 390 px, stacked, no sideways scroll.
- `.audit/phase3-kit-phone.png`: registration at 390 px, 34 cards, 34 shirt selects, 0 px overflow.

Role fit and form, measured on Ari Serra (GK, 25): best role Goalkeeper **13 / 20** from Handling 15,
Reflexes 14, Command of area 9. Sweeper keeper 10. Condition 87%, sharpness 94%,
1 of the last 1 practice XI, 1 appearance, 90 minutes.

## 15.3 Sorting and saved views, measured

Driving the browser through CDP at 390 px on the squad screen:

| Step | First card | Sort control reads |
|---|---|---|
| Default | Ari Serra | Pkd · Low to high |
| Sort by Value | Adan Keita | Value · Low to high |
| Reverse | Nico Koroma | Value · High to low |
| Sort by Age, then reload the page and reopen the squad | Haru Vico, ages 18, 20, 23 | Age · Low to high |

The last row is the saved view: the same sort comes back after a full reload.

## 15.4 Numbers

| Contract | §14 | Now |
|---|---:|---:|
| Page anchors / primary / breadcrumbs | 70/70 | 70/70 |
| Status chips | 76 | 76, 0 without words |
| Long lists hiding rows | 0 | 0 |
| Tables without a phone mode | 14 | **8** |
| Contrast failures | 0 | 0 |
| Text under 11 px, not metadata | 786 | 777 |

Sweep: 208 screens at 390, 768 and 1440 px. 0 horizontal overflow. 0 contrast failures.
Smallest text 9 px. 38 screens still contain a nested scroll area (atlas, social, kitOffice lead
it); that is the next sweep target, not a new regression from this session.

Tests: 313 pass, 0 fail.

## 15.5 What is still open in Phase 3

- 8 tables still have no phone mode (competition standings, season book, world tables).
- The player page is reached from the squad list only. A persistent player context and compare
  two players are not built.
- Shirt numbers: the page states the deadline and the list cap, but there is no plain "who is
  missing a number" count yet.

## 16. Phase 3, second session: compare, shirt numbers, every table on a phone

Date: 25 November 2026. Same career: Kay FC, 13 November 2027, 17 players.

### 16.1 Every table declares a phone mode

| Table | Screen | Phone treatment |
|---|---|---|
| Squad register (7 columns) | First team | Card per player, sortable from a select |
| Registration lists (4) | Registration & numbers | Card per player with the shirt select inside the card |
| Scouting results (8) | Scouting centre | Card per player: name, value, position, age, nation, club, role fit, grade |
| Training readiness (4) | Training | Card per player: name and minutes, then `Sharp 75%`, `Fit 100%`, status |
| League snapshot (5) | Club | One line per club: rank, club, `P 1`, `Pts 3`, form |
| League standings (11) | Competitions | Three lines per club: rank, club, points; then `P W D L GS GC GD` with labels; then form |

Count: **0 of 14 tables without a phone mode** (was 14 at the start of Phase 3, 8 after session 1).

The standings cards use a grid of eight columns so the seven numbers sit on one labelled line under
the club, and the form sits under that. Every number keeps its own label, so `GB 12` cannot be
confused with `GC 9`.

### 16.2 Compare two players

New panel on the player page. A select chooses the second player; the panel then shows one row per
measure with both values:

| Measure | Haru | Kofi |
|---|---:|---:|
| Age | 18 | 23 |
| Best role | Anchor 13 | Advanced playmaker 16 |
| Technical average | 9.6 | 13.6 |
| Mental average | 12.6 | 13.4 |
| Physical average | 8.0 | 11.1 |
| Condition | 100% | 58% |
| Value | ₥138,900 | ₥561,300 |

Eight rows, 364 px wide on a phone, 0 px page overflow. A missing number prints "Not recorded",
never a zero. The panel says in words what a group average is.

Every number comes from the same 1 to 20 rating source the rest of the page uses, so the comparison
cannot drift away from the attribute lists.

### 16.3 Shirt numbers: who has none

The registration list now states the gap above the cards:

- `2 players have no number: Nico Koroma, Haru Vico` (league list, 15 of 25 selected)
- `Every registered player has a number.` when the list is complete
- `N filed by another club` when a player cannot be picked at all

Measured in the browser at 390 px; the same sentence appears in both competition lists.

### 16.4 Numbers

| Contract | §15 | Now |
|---|---:|---:|
| Page anchors / primary / breadcrumbs | 70/70 | 70/70 |
| Status chips | 76 | 76, 0 without words |
| Tables without a phone mode | 8 | **0** of 14 |
| Contrast failures | 0 | 0 |
| Text under 11 px, not metadata | 777 | 762 |

Sweep: 208 screens at 390, 768 and 1440 px, 0 horizontal overflow, 0 contrast failures, smallest
text 9 px. Nested scroll areas: 40 at 390 px (was 42), still led by Atlas and Social.

Tests: 313 pass, 0 fail.

### 16.5 What is still open in Phase 3

- A persistent player context across screens (the player page is still reached from the list only).
- Season book and honours archives do not print player tables in a phone mode yet (they use
  summaries, not tables, so the contract is satisfied; the deeper archive work belongs to Phase 8).
- Club, training and scouting card heights are not enforced equal; a long club name adds a line.

## 17. Phase 3, third session: the player in focus and squad health

Date: 25 November 2026. Kay FC, 13 November 2027, 17 players.

### 17.1 The player in focus

Open a player, then leave the player page. A bar under the screen head keeps the player with you on
every other screen: name, position, age, nation, best role with its score out of 20, condition, and
value. One click reopens the player page, one click clears the bar.

Measured by driving the browser:

| Step | Result |
|---|---|
| Open Haru Vico, go to Training | bar shown: `IN FOCUS Haru Vico · Holding midfielder · 18 · Zandora · Role Anchor 13 · Condition 100% · Value ₥138,900` |
| Go to Club profile at 390 px | bar 364 px wide, 77 px tall, 0 px page overflow, both buttons 44 px or taller |
| Press Clear | bar removed, `[data-player-context-clear]` no longer in the page |
| Bar on the player page itself | not drawn, so nothing is stated twice |

The role and condition use the same rating and dynamics sources as the player page, so the bar
cannot disagree with the page it links to.

### 17.2 Squad health

The first team screen now states five facts above the table.

| Fact | Value on the real save | Watch tone |
|---|---|---|
| Registered | 17 players | no |
| In recovery | 0 | only when above zero |
| No shirt number | 2 | yes |
| Outside the XI | 6 | no |
| Thinnest unit | Goalkeepers 1 | no |

The watch tone uses `--ui-attention` (a blue), not an amber: the palette rule against gold holds.

### 17.3 A real bug found by the strip

The squad table printed `Available` for every player, including the two with no shirt number. The
cause: `register()` looked up the filed list with `s.kitScope`, and `s.kitScope` is null in this
career, so no list was found and everyone counted as available.

Both the squad screen and the registration page now resolve the list through one helper,
`s.kitScope || TLKit.league`. After the fix: `No shirt number 2` on the squad screen, and the
two players show `Not filed` in the Inf column, which matches the registration page sentence
`2 players have no number: Nico Koroma, Haru Vico`.

### 17.4 Numbers

| Contract | §16 | Now |
|---|---:|---:|
| Page anchors / primary / breadcrumbs | 70/70 | 70/70 |
| Status chips | 76 | 76, 0 without words |
| Tables without a phone mode | 0 | 0 of 14 |
| Contrast failures | 0 | 0 |
| Text under 11 px, not metadata | 762 | 762 |

Sweep: 208 screens at 390, 768 and 1440 px, 0 horizontal overflow, 0 contrast failures, smallest
text 9 px. Nested scroll areas: 40 at 390 px, 38 at 768 and 1440 px.

Tests: 313 pass, 0 fail.

### 17.5 What is still open in Phase 3

- The squad hub is a screen of facts plus links; a dedicated hub screen with priorities is not
  built, and the four phase-3 sessions are now used.
- The player bar holds one player at a time. A short recent list is not built.
- Nested scroll areas (40 screens at 390 px) are still the largest remaining sweep finding.

## 18. Phase 3, fourth session: the squad hub and the registration queue

Date: 25 November 2026. Kay FC, 13 November 2027, 17 players.

### 18.1 One local nav inside the squad

The first team screen keeps its banner and the four unit counts, then a local nav of four views.
Only the panel below changes, so the player never loses the squad.

| View | What it answers | What it showed on the real save |
|---|---|---|
| Roster | who is in the squad and where they play | 17 cards, register table, health strip, sort control |
| Availability | who needs attention, worst first | `9 players need attention`; Kofi Vico `Needs rest`, condition 58%, sharpness 77% |
| Registration | who has no shirt number | `2 players have no number`; League `15 of 25 filed`, names listed |
| Development | who moved this season | `No attribute movement recorded yet` (honest: no season review yet in this save) |

Availability sorts by state and then by the lowest condition, so recovery comes first. The text
above the list says the order, and the numbers are the ones the training screen uses.

### 18.2 Registration: search that states its range

Each competition list on the registration screen now has a search box and a range:

| State | Reads |
|---|---|
| Empty | `Showing all 17 players` |
| Typing `serra` | `Showing 3 of 17 players` |
| Cleared | `Showing all 17 players` |

The list also states `15 of 25 selected` and `2 players have no number: Nico Koroma, Haru Vico`
above it. Each competition filters on its own, so one list never hides rows on another.

### 18.3 Phone tap targets (Phase 3 gate)

Measured at 390 px on the squad screen, counting every button and select inside `.sq-room`:

| Control | Height |
|---|---|
| Squad tabs (4) | 44 px |
| Player name in a roster card | 44 px |
| Shirt number select | 44 px |
| Sort select and direction button | 44 px |
| Secondary buttons (registration, planner) | 44 px |

Inline entity links inside a fact line stay text sized but get a 24 px taller hit area
(`::after` overlay), so a 16 px word is not a 16 px target.

### 18.4 Numbers

| Contract | §17 | Now |
|---|---:|---:|
| Page anchors / primary / breadcrumbs | 70/70 | 70/70 |
| Status chips | 76 | 76, 0 without words |
| Tables without a phone mode | 0 | 0 of 14 |
| Contrast failures | 0 | 0 |
| Text under 11 px, not metadata | 762 | 762 |

Sweep: 208 screens at 390, 768 and 1440 px, 0 horizontal overflow, smallest text 9 px.
Sub-44 px targets on the registration screen fell from 111 to 93 with the taller shirt selects.
Tests: 313 pass.

### 18.5 Phase 3 status

Done: phone roster cards, table modes for all 14 tables, sort and saved views, player page with
role fit, form, compare and grouped attributes, player in focus across screens, squad health, the
squad hub with four views, registration gaps by name and a searchable registration queue.

Not done, and therefore the phase is not closed:

- A pinned "selected list" on the registration screen. The count and the gaps are stated, but the
  chosen players are not shown as a list of their own.
- Inline registration conflicts (a player filed by another club) are stated in the table but not
  raised as a queue above it.
- Medical and dynamics urgency outside the squad: training still lists readiness without an
  urgent-first grouping.

Those three carry into the next session rather than being called complete.

## 19. Phase 3 closed: the last three items

Date: 25 November 2026. Kay FC, 13 November 2027, 17 players.

### 19.1 Pinned list and conflict queue on registration

Each competition list now opens with, in this order: the search and its range, the selected count,
the gap by name, the conflict line, the list as it stands, then the searchable queue.

- Pinned list: `On this list` followed by the chosen players in shirt order. On the real save that
  is 15 chips from `#1 Ari Serra` to `#22 Luca Novak`.
- Conflict line: tested by filing two squad players with another club in a copy of the save.
  It read `2 players are filed by another club and cannot appear on this list: Kofi Vico, Haru Vale`,
  and both rows then showed `Filed by another club` with the shirt select disabled.
- The gap line now also ends with `2 filed by another club` when that is true.

### 19.2 Training readiness: urgent first

The readiness table is grouped and ordered by what stops a selection:

| Group | Order | Tone |
|---|---:|---|
| In recovery | 1 | danger |
| Needs work (sharpness under 60) | 2 | attention |
| Building (under 75) | 3 | neutral |
| Match ready | 4 | neutral |

Each group is a row that names itself and its count (`Match ready · 13` on the real save). A player
in recovery shows the return date under the status chip (`back 18 Nov 2027`).

### 19.3 Numbers

| Contract | §18 | Now |
|---|---:|---:|
| Page anchors / primary / breadcrumbs | 70/70 | 70/70 |
| Status chips | 76 | 76, 0 without words |
| Tables without a phone mode | 0 | 0 of 14 |
| Contrast failures | 0 | 0 |
| Text under 11 px, not metadata | 762 | 762 |

Sweep: 208 screens at 390, 768 and 1440 px, 0 horizontal overflow, smallest text 9 px.
Tests: 313 pass, 0 fail. Relays unchanged: passes per team 690.33, pass rate 76.59%.

### 19.4 Phase 3 gate

| Gate from the plan | Result |
|---|---|
| `wideTables` 0 at all widths | 0 tables without a phone mode, 0 overflow at 390, 768 and 1440 |
| Every table declares a mobile mode | 14 of 14 |
| Roster tap targets 44 px or more on phones | tabs, card names, shirt selects, sort controls and secondary buttons all 44 px |

Phase 3 is closed. What it delivered: phone roster cards, fourteen table modes, sort and saved views,
role fit, form, compare, grouped attributes, the player in focus, squad health, the four-view squad
hub, registration with gaps by name, a pinned list, a conflict queue and a searchable queue, and
urgent-first training readiness.

---

## 20. Phase 4, session 1: the contract expiry queue

### 20.1 What the screen is

`src/contract-queue.js` renders the Contracts destination in the Squad hub (10th item). The rule the
game already enforces is that renewal talks open inside the final 90 days, so the screen is grouped by
that rule rather than by table order:

| Group | What the screen says |
|---|---|
| Days left 30 or fewer | `Ends within 30 days` · count |
| 31 to 60 | `Ends in 31 to 60 days` · count |
| 61 to 90 | `Ends in 61 to 90 days` · count |
| More than 90 | `Beyond 90 days` · count |
| No professional terms | `13 players have no contract` (real career uses 17) |

Above the queue, four facts: players with terms, weekly wage bill, talks open now, wages still owed.
The status chip is the rule in words (`Renewal open`, `Too early to talk`, `Expired`,
`No professional terms`), and the tones are semantic only: bad for expired, the palette's attention blue
for open talks, plain for everything else. No amber and no gold on the screen.

### 20.2 The queue is a decision, not a report

The queue leads with one command naming the next player: `Start with Kofi Vico · 18 days left` when
terms exist, `Offer terms to Kofi Vico` when nobody has terms. It opens the player file, and the player
file now carries that player's contract desk (`g.TLContracts.render`) under the role fit, so the row,
the command and the desk are one path. The player file also stopped printing the raw page id: the
breadcrumb reads `Squad / Player profile` (`HUB_ALIAS` in `src/screen-head.js`), and the head bar has a
primary action again.

### 20.3 A phone

At 390 px the table becomes one card per player (`.contract-room` rules in `src/home.css`):
name and position on the first line, then `Ends 1 Dec 2027`, `18 days`, `Wage ₥120` and the status.
Nothing is dropped, there is no sideways scroll, and every control in the card is 44 px including the
player name and the sort bar. The sort bar hides itself when the table has no rows, so an empty queue
is not offered a sort order it cannot use.

### 20.4 Numbers

| Contract | §19 | Now |
|---|---:|---:|
| Page anchors / primary / breadcrumbs | 70/70 | 72/72 |
| Status chips | 76 | 78, 0 without words |
| Tables without a phone mode | 0 of 14 | 0 of 16 |
| Contrast failures | 0 | 0 |
| Text under 11 px, not metadata | 762 | 776 |
| Tests | 313 | 313 pass, 0 fail |

Sweep: 214 screens at 390, 768 and 1440 px, 0 horizontal overflow, smallest text 9 px, nested scroll
traps 41 / 38 / 38 (one more at 390 than §19: the phone tab strip plus the desk scroller on a page that
is now deeper). Sub-44 px targets are unchanged in kind: atlas 386/376/377, social 220/230/231,
registration 120/154/155.

Two defects fixed while measuring, both shell-wide:

- The last column's resize handle sat 3 px outside the table, so every table's scroller overflowed
  itself by 3 px. The handle now sits inside the edge: `.table-column-resizer` measured 3 px → 0.
- Empty tables still showed a phone sort bar. `src/table-headings.js` now skips the bar when the body
  has no data row.

Read on the real career (Kay FC, 13 Nov 2027): 0 players with terms, `₥0` wage bill, 0 talks open,
primary `Offer terms to Kofi Vico`, `17 players have no contract`, 0 overflow at both widths. Read on a
copy given four synthetic contracts: 4 with terms, `₥720` wage bill, 3 talks open, `₥90` owed, groups
1/1/1/1, rows `Kofi Vico · 1 Dec 2027 · 18 · ₥120 · Renewal open` to `Felix Ibarra · 10 Jun 2028 · 210 ·
₥240 · Too early to talk`.

---

## 21. Phase 4, session 2: the staff split

### 21.1 The problem the split fixes

Staff was one page: a hero, four facts, a long delegation paragraph, the approval queue, ten scouting
reports and sixteen role cards across six departments. On a phone that was a 9.13 fold scroll, the
worst in the game. The phase plan asks for four views, and the gate is a staff fold of 2.0 or less at
390 px.

| View | What it answers |
|---|---|
| Overview | What needs me, who is appointed, what each department costs, how the budget works |
| People | The appointments I have: one roster row each, one detail panel for the selected member |
| Recruitment | What is waiting for my signature, what scouting reported, which positions are open and who is available |
| Reports | The weekly work log, latest delivery per appointment |

The local nav carries a count per view (`People · 9 appointed`, `Recruitment · 1 to sign`). Notes are
hidden at 390 px so all four labels fit without a sideways scroll.

### 21.2 Both lists are splits, not walls

People and Recruitment each pair a compact roster with one detail panel, which is the pattern the plan
calls a split:

- People: a row per appointment (mark, name, role, wage, rating chip) and a panel for the selected
  member with the weekly responsibility, the monthly target, the latest delivery, the contract state
  and the three decisions (pay rise, renew, dismiss) plus a link to the work log.
- Recruitment: the signature queue and the scouting reports, then one row per open position grouped by
  department, and a hiring panel with the two candidates, their ability, their wage and the signing fee.
  The panel states that there is no fixed three-person cap.

Every `<details>` on the page renders `open`, per the disclosure rule the tests enforce.

### 21.3 Also fixed

- The staff stylesheet used a gold literal (`#e9c96e`) for the rating, the report grade and the
  "under review" label. All three now use `--ui-attention`, the palette's periwinkle.
- Staff dates were ISO (`2027-11-22`). They now read `22 Nov 2027` everywhere on the page, including the
  contract end, the next assignment and the 28-day budget reset.
- "Nothing needs you" replaces an empty pipeline: the screen states that no signature, wage or contract
  decision is waiting instead of showing an empty queue.
- A proposal waiting for signature no longer repeats as a scouting report in the same view.

### 21.4 Numbers

| Contract | §20 | Now |
|---|---:|---:|
| Page anchors / primary / breadcrumbs | 72/72 | 72/72 |
| Status chips | 78 | 78, 0 without words |
| Tables without a phone mode | 0 of 16 | 0 of 16 |
| Contrast failures | 0 | 0 |
| Text under 11 px, not metadata | 776 | 544 |
| Tests | 313 | 313 pass, 0 fail |

Staff fold at 390 px: **9.13 to 1.54** (0.92 at 768 and 1440). Per view at 390 px on the real career:
Overview 1.54, People 1.66, Recruitment 1.68, Reports 2.83. On a seeded career with three appointments,
a pending proposal and a scouting report: Overview 1.71, People 1.28, Recruitment 2.28, Reports 1.55.
None of the four views overflows at any width and all of them keep 0 horizontal scroll.

Sweep: 214 screens at 390, 768 and 1440 px, 0 horizontal overflow, nested scroll traps 41 / 38 / 38,
smallest text 9 px. Tests: 313 pass, 0 fail.

### 21.5 Gate

| Gate from the plan | Result |
|---|---|
| Staff fold 2.0 or less at 390 px | 1.54 (was 9.13) |
| Four views, not one page | Overview, People, Recruitment, Reports with counts in the nav |
| 0 tables overflow | 0 tables on the staff screen; 0 of 16 game wide without a phone mode |
| Actions still reachable | hire, assign responsibility, set target, approve pay rise, renew, dismiss, sign a proposal are all inside their own view |

The staff contract test now checks the four views together, because the roles, the target control and the
no-cap statement live in the view that owns them.


## 22. Phase 4, session 3: scouting ranges

### 22.1 The problem the ranges fix

The player directory held 366 players in one table and offered "Show 25 more". There was no count, no
page state and no way back to where you were: closing the tab, changing a filter or opening a player lost
your position, and the only number on the page was a footer that appeared once you had already scrolled
past twenty-five rows. Reading a scouting report meant scrolling back up to find out what the player was
worth, and the four things a scouting decision turns on — grade, role fit, value, status — were spread
between the row and the file.

### 22.2 What the board does now

| Before | Now |
|---|---|
| 366 rows, "Show 25 more" appended 25 at a time | 25 a page, "Showing 26 to 50 of 366 players", "Page 2 of 15" |
| No position to lose, so no position to restore | Previous / Next, disabled at the ends, repeated in the foot of the table |
| Filter, sort and the reset all kept whatever row count was left | Every filter change, sort, reset and saved view returns to page 1 |
| Status lived only inside the player file | A `Status` column: With your squad · Shortlisted · Registered · Available |
| No saved views | Up to six chips; the field defaults to `Nation · Position`; a chip reopens the whole filter set and a chip can be forgotten |

Saved views are stored per career in `touchline.scoutViews.v1`, the same localStorage pattern the table
columns already use, so they survive a reload without touching the career save. Verified by saving
"Persist test", reloading the app and finding the chip still on the board with the store intact.

The player file now opens with a sticky identity that carries the decision facts as four labelled cells:

`GRADE A · ROLE FIT 18/20 · VALUE ₥1,252,900 · STATUS Registered · Densari FC`, under the player's name,
position, age and nation.

| Measurement | 1440 px | 390 px |
|---|---:|---:|
| Identity height, at rest | 145 px | 172 px |
| Identity pinned at | 164 px | 196 px |
| Shell header above it | 143 px | 182 px |
| Horizontal overflow | 0 | 0 |

The pinned offset is 0 inside the desk's own scrollport (`#clubPage`), which already starts below the
shell header, so the identity sits exactly one hairline under it at every width. At 390 px the headshot
is hidden while pinned and the facts go two-up, which is what took the bar from 201 px to 172 px — a
quarter of a phone viewport, and the four facts stay legible without a sideways scroll.

### 22.3 Also fixed

- The board's legacy "row is a button" rule was reaching the sort controls, so at 390 px "High to low"
  rendered as a full-width box with three-line wrapping. The sort bar is now scoped back to a select and
  a 44 px button on one line.
- Phone cards put `Registered` first and the name second. Status now sorts to the end of the card, so a
  card reads name, value, position, age, then nation, club, role fit, grade and status.
- Status dates read `28 Nov 2027`, not `2027-11-28`.

### 22.4 Numbers

| Contract | §21 | Now |
|---|---:|---:|
| Page anchors / primary / breadcrumbs | 72/72 | 72/72 |
| Status chips | 78 | 78, 0 without words |
| Long lists without a range | 0 | 0 |
| Tables without a phone mode | 0 of 16 | 0 of 16 |
| Contrast failures | 0 | 0 |
| Text under 11 px, not metadata | 544 | 545 |
| Tests | 313 | 313 pass, 0 fail |

The single extra small-text node is the new `Status` header's sort button at 10.5 px, the same size as
every other sortable header in the game; the four-up fact labels were moved from 10 px to 11 px in the
same pass.

Depth on the real career, `scrollHeight / clientHeight` of the desk: board **4.26 at 1440**, 5.58 at
1200×760, 7.48 at 390 (25 cards); player file 1.12, 1.47, 2.30. The directory now carries a range at the
top and the foot, and the context blocks above it — the staff reports, the travel desk, the talent desk —
are the leftover depth this session did not move; the plan puts that sorting in Phase 8.

Sweep: 214 screens at 390, 768 and 1440 px, 0 horizontal overflow, nested scroll traps 38 / 38 / 38,
smallest text 9 px. Tests: 313 pass, 0 fail.

### 22.5 Gate

| Gate from the plan | Result |
|---|---|
| Scouting: sticky identity, grade/value/status always visible | Identity pinned under the shell header at 1440 and 390, four facts in it, 0 overflow |
| Visible ranges | "Showing x to y of N players" in the head and the foot, page count, Prev/Next, page resets on every filter change |
| Saved views | Six chips, named, persisted per career, reopen and forget |
| 0 tables overflow | 0 of 16 tables without a phone mode; 0 horizontal overflow at three widths |


## 23. Phase 4, session 4: the boardroom as tables

### 23.1 The problem the tables fix

The boardroom was four stacks of cards: the share register as one `<article>` per holder, the local
network as one `<details>` per candidate with all four offers already open, the ground agreements and
the minutes as more `<details>`. Nothing could be searched, nothing could be sorted, and every holder's
buy-back controls were spread down the page instead of attached to one holder. On a phone the page was
5.08 folds; the network alone was three 325 px cards.

### 23.2 What the boardroom is now

| Before | Now |
|---|---|
| One card per holder, in whatever order the career held them | A table sorted by stake value by default, with holder, seat, share, stake and dividends columns |
| No search | "Find a holder" filters rows as you type and the range says `Showing 1 of 4 holders` |
| Holder actions spread down the register | One detail pane for the selected holder: share, stake, dividends paid, proposed payout, and the buy-back control with its two prices and the personal-funds line |
| Three candidate cards, all four offers visible at once | A candidates table (wants, status) and a pane that carries the selected candidate's quote and the four offers |
| Minutes as five `<details>` cards | A table: when, motion, votes as `3 for · 2 against` or `No vote taken` |
| ISO dates inside the boardroom | `7 Dec 2027` for reply dates, ground agreements and minutes |

Sorting is the game's own table affordance (`data-sort-table`), so the register and the candidate list
carry the same header buttons and remembered order as every other table. The register defaults to stake
value descending. Selection lives in desk state (`board.sel`, `board.sel2`), so a redraw or a vote keeps
the holder you were looking at.

The commands did not move: `shareBuy`, `boardDividend`, `directorOffer`, `groundMotion` and `estateMotion`
are the same calls with the same preflight, and the buy-back buttons still name their price in the
button text. This session is markup and view state only.

### 23.3 Numbers

| Contract | §22 | Now |
|---|---:|---:|
| Page anchors / primary / breadcrumbs | 72/72 | 72/72 |
| Status chips | 78 | 78, 0 without words |
| Tables without a phone mode | 0 of 16 | 0 of 22 |
| Contrast failures | 0 | 0 |
| Text under 11 px, not metadata | 545 | 545 |
| Tests | 313 | 313 pass, 0 fail |

Three tables carry the boardroom now, each with a phone card mode, which is why the table count moved
from 16 to 22. The scoped rule `.br-table .column-sort{font-size:11px}` keeps the new header buttons at
the type floor; without it the tiny-text count read 551.

Depth, `scrollHeight / clientHeight` of the desk:

| Career | 1440 px | 390 px |
|---|---:|---:|
| The real career (one holder, 100 %) | 3.21 (was 3.27) | 5.25 (was 5.08) |
| Four holders, dividends and a buy-back | 3.03 | 4.74 |

The honest reading is a trade, not a saving. On the real career the network shrank (1177 px to 906 px at
390) because three 325 px cards became a 366 px table and a 440 px pane, but the register gained what
this session was for — a 217 px detail pane and the search field — so the phone page ends 126 px taller.
On a career whose register has something to sort, the page is 3.03 / 4.74 against 3.27 / 5.08. What is
left is the valuation header, the dividend rules, the ground agreements and the minutes, which are copy
and a legal record rather than card stacks: the sections, at 390 px, are valuation 1077, network 906,
ground and minutes 1014.

Behaviour, measured in the browser on a four-holder career at 1440 and 390 px:

- Register renders four rows in stake order, range `4 holders · you hold 65%`, 0 horizontal overflow.
- Search `Nico` leaves one row and the range reads `Showing 1 of 4 holders`.
- The Share header sorts 65, 20, 10, 5 to 5, 10, 20, 65 and back.
- Selecting the local investor moves the pane to `Emil Larne · Local investor · No vote` with 20 %,
  ₥860,617 stake, ₥3,000 dividends and the two buy-back buttons (5 % · ₥258,186, 20 % · ₥1,032,741).
- Exactly one row carries `aria-selected="true"`.

Sweep: 214 screens at 390, 768 and 1440 px, 0 horizontal overflow, nested scroll traps 41 / 38 / 38,
smallest text 9 px. Tests: 313 pass, 0 fail.

### 23.4 Gate

| Gate from the plan | Result |
|---|---|
| Boardroom card stacks to a searchable, sortable table | Register and candidates are tables with the game's sort headers; the register has a live search with a written range |
| A detail pane | One pane per table, selected by `aria-selected`, carrying the facts and the actions for that row |
| 0 tables overflow | 0 of 22 tables without a phone mode; 0 horizontal overflow at three widths |
| Nothing new in the engine | Same five commands, same confirmations, same arithmetic |


## 24. Phase 4, session 5: the transfer centre

### 24.1 The problem the scopes fix

Transfers had three tabs in one list — Arrivals, Departures, Around the leagues — so "my business" and
"everyone else's business" were the same control, one tab apart. The list rendered twelve rows and then
said "5 more in this list. Use the arrows on the deal card to step through them", which meant the only
way to reach deal thirteen was a Previous/Next arrow on a different card. Every row read "Unnamed
player" because the list looked for a name on the deal record while the name lives on the player. The
route existed as two labelled shields with no arrow between them, and the page printed ISO dates.

### 24.2 What the centre is now

| Before | Now |
|---|---|
| Three tabs: Arrivals, Departures, Around the leagues | Two scopes — **My club** (17) and **World wire** (15) — with Arrivals/Departures as sub-tabs inside My club only, which is what the world list never needed |
| Twelve rows, then "5 more… use the arrows on the deal card" | Twelve a page: `Showing 1 to 12 of 17 deals`, `Page 1 of 2`, Previous/Next at the head and the foot of the list |
| Reaching deal 13 meant stepping an arrow on the deal card | A page, and the deal card follows the page: `Deal 13 of 17` is the first row of page two |
| A deal card with Previous/Next and `1 / 17` | The card is a detail view for the selected row and says `Deal 3 of 15`; the browsing arrows are gone |
| `FC From Unattached KF To Kay FC`, no arrow | `From Unattached → To Kay FC` with an arrow between the shields, and a written line `Unattached → Kay FC` |
| A personal deal labelled `Manager’s project` at one end, which read `Unattached → Manager’s project` once an arrow was drawn | Both ends come from the record: the player was unattached, and the far end is the club he actually plays for — `Unattached → Kay FC` — with `Terms: Amateur · no contract` on the card |
| Every row "Unnamed player", status only | Name, fee, `From → To` and the status chip on every row; names resolve from the squad pool |
| `2027-11-13`, `2027-11-20`, `2027-11-11` | `13 Nov 2027`, `20 Nov 2027`, `11 Nov 2027` |

Page, tab and scope reset together: changing scope or tab returns to page one and deal one, and the whole
view (scope, tab, page, selected deal) is part of the desk's history state, so a reload lands where you
left off.

On a phone the two club shields shrink to their initials and the arrow has nothing to sit between, so at
560 px and below the shields are hidden and the route is the written line instead of two stacked boxes.

Seventeen of the seventeen arrivals on the real career are amateur invitations, and all seventeen of
them are in the club's roster: the manager's club, Kay FC, is where they went. Only four of the records
carry that club name, so the destination is read from the roster rather than from the deal record, and
every arrival now says `Unattached → Kay FC`. The card adds `Terms: Amateur · no contract`, because a
player in the squad with no contract is the fact a manager needs to see. A neutral dash badge survives
for the one case that has no club at all: a manager who has not founded or joined one yet.

The arrow is a text separator, not a disclosure icon: `test/disclosure-defaults.test.cjs` bans literal
arrow glyphs in `src/`, so it is written as `\u2192` in a constant and rendered as content. The built
`index.html` passes the same test.

### 24.3 Numbers

| Contract | §23 | Now |
|---|---:|---:|
| Page anchors / primary / breadcrumbs | 72/72 | 72/72 |
| Status chips | 78 | 78, 0 without words |
| Long lists without a range | 0 | 0 |
| Tables without a phone mode | 0 of 22 | 0 of 22 |
| Contrast failures | 0 | 0 |
| Text under 11 px, not metadata | 545 | 545 |
| Tests | 313 | 313 pass, 0 fail |

Depth, `scrollHeight / clientHeight` of the desk: **1.83 at 1440** and **2.64 at 390**, against 1.31 and
2.10 before. The page grew by the scope switch, the sub-tabs and a second line in every row — the row now
carries the route and a status chip — and it is still under three folds on a phone.

Behaviour, measured in the browser on the real career:

- Scopes read `My club 17` and `World wire 15`; My club opens on Arrivals with `Arrivals 17` /
  `Departures 0` sub-tabs, World wire has no sub-tabs.
- My club page one: 12 rows, `Showing 1 to 12 of 17 deals`, `Page 1 of 2`; page two: 5 rows,
  `Showing 13 to 17 of 17 deals`, and the card reads `Deal 13 of 17` with Amar Miro selected.
- World wire: 12 of 15 rows, routes like `Densari FC → East Kintaba FC`, `World wire · 15` heading.
- Selecting the third world row moves the card to `Luca Kone`, `Koroba City → Koroba Market Stars`,
  `Deal 3 of 15`, with exactly one `.tc-row-on`.
- Rows no longer read "Unnamed player"; names come from the pool (`Nico Koroma`, `Haru Vico`).
- 0 horizontal overflow at 1440 and 390.

Sweep: 214 screens at 390, 768 and 1440 px, 0 horizontal overflow, nested scroll traps 41 / 38 / 38,
smallest text 9 px. Tests: 313 pass, 0 fail.

### 24.4 Gate

| Gate from the plan | Result |
|---|---|
| My club / World wire as separate scopes | Two-scope switch with counts; sub-tabs only inside My club |
| Route line `From → To` | Shields with an arrow in the deal card, a written route on every row, and the written route replaces the shields at 560 px and below |
| Pagination replaces the 12-row arrow browsing | 12 a page with range and page count at both ends; the deal card's browsing arrows are gone and the card follows the page |
| Transfers show a range (Phase 4 gate) | `Showing 1 to 12 of 17 deals` on both scopes |

## 25. Phase 4, session 6: the club account you can set to a period — and the phase close

### 25.1 The problem

`[data-hc-open="finance"]` does not open `views.finance`. It opens **Club account**, which is
`TLLuma.wallet(s)` + the economy panel + enterprise + commercial. The rich finance screen in
`src/club-finance.js` — tabs, FFP, budget panel, `U.chart` — is registered on `views` and never called,
and its `Breakdown · October 2026` label is the static month the plan complained about. The live
surface had the opposite problem: a wallet with no period at all. `statement(s, account, days)` could
filter by account and page three days at a time, but nothing said *which* span of the season the manager
was looking at, and the £ figures in the header had no context above them.

### 25.2 What the account is now

| Before | Now |
|---|---|
| Two cards: `Personal wallet ₥3,878`, `Club treasury ₥223`, no relation stated | A four-cell rail above the activity: **Personal wallet** (yours to spend), **Club treasury** (club money — registration, staff, ground), **Wage bill** (`No contracts` / `17 players on amateur terms` when it is zero), and **Net** for the chosen period with the split `Wallet +₥2,703 · club −₥19,736` |
| No period control: the statement paged three days at a time with no label | `Today · 7 days · 30 days · Season` as pressed buttons, 44 px, default 30 days; the choice drives the rail, the chart, the table and the statement window |
| A chart's worth of numbers printed nowhere | `Club money` — bars above and below a zero line (green up = in, red down = out) for the days that moved money, with `in ₥15,000 · out ₥34,736 · net −₥19,736` and the span in days |
| No alternative to the picture | `Chart | Table` toggle: 13 rows — day, in, out, net — with a `Total` foot, phone cards showing `In ₥0  Out ₥31,153  −₥31,153`, and the same numbers in the chart's `aria-label` |
| No answer to "how long can the club keep spending" | A runway line under the chart: `At ₥1,158 a day the treasury covers less than a day of club spending` (warn tone). No spending in 30 days says so; a treasury that covers 30 days or more reads in the calm tone |
| `Recent movements` with no idea of the window | `ACCOUNT ACTIVITY · the last 30 days`, and the header follows the period |
| `Breakdown · October 2026` in `src/club-finance.js` | `Breakdown this month`. No rendered text on the account carries a month name; the only `October 2026` left in the DOM is inside the inline bundle `<script>` |

The rail, chart and runway only render on the finance surface (`wallet(s, {full:true})`). The Personal
money page keeps the original compact wallet — two pot cards, contributions, the statement — because it
is about the manager's money, not the club's books.

Burn is measured on club money over the last 30 days whatever period is showing, so the runway does not
flip to "infinite" when the manager looks at a quiet week. Days with no club movement are skipped rather
than drawn as zero bars: the first pass counted them and claimed `30 days with club movements` against
13 real ones, and its table foot totalled all days while the rows showed the last ten.

### 25.3 Numbers

| Contract | §24 | Now |
|---|---:|---:|
| Page anchors / primary / breadcrumbs | 72/72 | 72/72 |
| Status chips | 78 | 78, 0 without words |
| Tables without a phone mode | 0 of 22 | 0 of 22 |
| Contrast failures | 0 | 0 |
| Text under 11 px, not metadata | 545 | 545 |
| Tests | 313 | 313 pass, 0 fail |

Depth, `scrollHeight / clientHeight`: **3.34 at 1440** (2,694 px) and **5.41 at 390** (3,584 px), against
3.04 / 5.10 before — one rail, one selector row, one chart block and one runway line. The table view is
the longer state (3.71 / 6.55 with 13 rows) and it is a deliberate alternative, not the default.

Behaviour, measured in the browser on the real career (Kay FC, day 383 = Sat 13 Nov 2027, wallet ₥3,878,
treasury ₥223, no contracts):

- **30 days** (default): 6 days with club movements, `in ₥15,000 · out ₥34,736 · net −₥19,736`, rail
  `Net · 30 days −₥17,033  Wallet +₥2,703 · club −₥19,736`.
- **7 days**: `Net · 7 days −₥31,330  Wallet +₥754 · club −₥32,084` — the 9 Nov settlement of ₥31,153
  enters the window and the rail follows. **Today**: `Net · today +₥759  Wallet +₥759 · club +₥0`, and the
  chart says `No club movements today` instead of drawing an empty frame.
- **Season**: 13 days with club movements, `17 Sept 2027 to 13 Nov 2027`, `in ₥49,000 · out ₥60,717 ·
  net −₥11,717`; the table lists all 13 newest-first with the total in the foot.
- Statement follows the period: three day groups (`Today · Sat, 13 Nov 2027`, `Tue, 9 Nov 2027`,
  `Mon, 8 Nov 2027`) with `Show earlier activity` still available inside the window.
- Keyboard: focus a period button, press Enter or Space, the numbers change **and focus stays on the
  pressed button**. Before this session the redraw dropped focus to `<body>`, so a keyboard user was
  returned to the top of the page after every press.
- 6 controls (4 periods + 2 views), all 44 px tall, 13 px text. 0 horizontal overflow at 1440 and 390.

Phase 4 gate, all four items:

| Gate | Result |
|---|---|
| Staff fold ≤ 2.0× at 390 | **1.96** at 390 (1,297 px), 1.14 at 1440 |
| Transfers show a range | `Showing 1 to 12 of 17 deals`, `Page 1 of 2` (§24) |
| Finance period control changes the numbers | `−₥17,033` / `−₥31,330` / `+₥759` / `−₥24,950` across the four periods, rail, chart, table and statement together |
| 0 tables overflow | 0 of 22 tables without a phone mode, 0 overflow in the sweep |

Sweep: 214 screens at 390, 768 and 1440 px, 0 horizontal overflow, nested scroll traps 41 / 38 / 38,
smallest text 9 px.

## 26. Phase 5, session 1: a trail through the world, and four views instead of seven

### 26.1 The problem

Competitions opened with seven tabs of equal weight — League table, Player stats, Cups, Fixtures,
Dugouts, Trophy room, Season book — laid out in one strip, each 38 px tall, so the weekly four and the
three record books looked like the same kind of thing. The head crumb read `Club / Competitions`: the
country the screen is about (Zandora) lived only inside the hero, and nothing on the page could take you
up to the world. Dates printed raw (`2027-10-29`, `2027-08-01`, and the standings header's `2027-11-13`),
and the Leaders panel described its count as "9 players with a goals".

### 26.2 What the screen is now

| Before | Now |
|---|---|
| Seven same-weight tabs, 38 px | **Four views** — `Table · Fixtures · Leaders · Cups` — and a separate **Records** group holding `Dugouts · Trophy room · Season book`, every button 44 px |
| `Club / Competitions` only; the nation appeared in the hero and nowhere else | A trail inside the screen: `World / Zandora / Premier League`, where **World** opens the atlas, **Zandora** opens that country's atlas page, and the competition is `aria-current="page"` |
| Nothing above the league table but the table | `Round 1 · 20 clubs · 13 Nov 2027` in the standings header — a real round, a real count and a written date |
| `2027-10-29`, `2027-08-01`, `2027-11-13` | `29 Oct 2027`, `1 Aug 2027`, `13 Nov 2027` — the whole screen, all seven views, no ISO dates left |
| `Leaders` counted players "with a goals" | `9 players ranked by goals` (and `by assists`, `by clean sheets` when the category changes) |
| Fixtures headed by a flavour sentence about the association | `Zandora fixtures` with `380 fixtures this season`, the association line beneath it as context |
| Pressing a tab moved focus to `<body>` | The pressed tab keeps focus across the redraw — Enter and Space both work, and the same is true of the leader categories |

The trail is one component (`TLScreenHead.trail`), not a one-off: each step that is not the current one
carries the attributes of the control that opens it, so the trail is navigation rather than decoration,
and the competition page is the first caller. Phase 5 will use it for dossiers.

### 26.3 Numbers

| Contract | §25 | Now |
|---|---:|---:|
| Page anchors / primary / breadcrumbs | 72/72 | 72/72 |
| Status chips | 78 | 78, 0 without words |
| Tables without a phone mode | 0 of 22 | 0 of 22 |
| Contrast failures | 0 | 0 |
| Text under 11 px, not metadata | 545 | 545 |
| Tests | 313 | 313 pass, 0 fail |

Depth, `scrollHeight / clientHeight`: **2.50 at 1440** (2,017 px) and **4.37 at 390** (2,890 px) on the
Table view, against 2.44 / 4.25 before — a trail and a second tab row, paid for by 44 px tabs.
Leaders is 1.44 / 1.86 and the Trophy room 1.61 / 3.86.

Behaviour, measured in the browser on the real career:

- Tab press → the view changes and the pressed button keeps focus (`Trophy room` focused after Enter,
  `Assists` focused after Enter on a leader category).
- Trail **World** → atlas, head crumb `World / Atlas`. Trail **Zandora** → the atlas on that country
  (`Kintaba, Zandora`), and coming back to Competitions returns to the same nation and the same view
  (`Leaders`), because the view is part of the desk's history state.
- Seven views verified one by one: Table 20 rows, Fixtures `380 fixtures this season`, Leaders 9 rows
  `ranked by goals`, Cups (`Round 1 · 29 Oct 2027`), Dugouts, Trophy room, Season book — 0 horizontal
  overflow at both widths, no `20xx-xx-xx` anywhere in the rendered text.
- Sub-44 px buttons on this screen are inline text links in rows (34 club links in the standings,
  the club names inside fixture rows), not primary controls; the sweep's worst screens are unchanged
  (`atlas` 386, `social` 220, `kitOffice` 121).

### 26.4 What this session deliberately left

- **Fixtures still prints every one of the 380 fixtures** — 31.9 folds at 1440, 59.3 at 390. Grouping by
  round or month with `Upcoming / Results / All` and a current-matchday spotlight is session 2, and it is
  the reason that list is not in the sweep's tab walk yet.
- **Leaders has no filters, no page size and no phone mode** — 25 rows a page with position, club and
  minimum-appearances filters is session 3, along with `Showing x–y of N` on Football Intelligence.

Sweep: 214 screens at 390, 768 and 1440 px, 0 horizontal overflow, nested scroll traps 41 / 38 / 38,
smallest text 9 px.

## 27. Phase 5, session 2: fixtures as rounds, not a 380-row scroll

### 27.1 The problem

The Fixtures view printed the whole national schedule: 380 fixtures in one column, **31.88 folds at 1440**
and **59.27 at 390** (day 383, Zandora). There was no filter, no round grouping, no count and no price on
it — a manager scrolled past 380 rows to find the round being played. Scores existed in the engine but were
never printed, so a played match looked exactly like a future one.

### 27.2 What the view is now

| Before | Now |
|---|---|
| 380 rows, one column, no controls | One **round** at a time: `Round 1 · 13–14 Nov 2027 · 10 fixtures` with `Previous` / `Next` (words, not chevrons — the disclosure contract bans arrow glyphs in `src/`) |
| No filter | `Upcoming 38 · Results 0 · All 38` counts **rounds**, and the default is the round being played or the next one |
| No statement of where you are | `Round 1 of 38 · showing 10 of 380 fixtures · 38 rounds to come` (and `… 11 rounds played` in Results) |
| No spotlight | `YOUR MATCH THIS ROUND` — the manager's own fixture, lifted out of the round with date and kick-off; `YOUR RESULT` with the score once the round is behind him, and the row itself carries a `YOUR CLUB` mark |
| Scores stored but never shown | `Koroba Teachers v Kay FC 0–1` — the league's simulated result is joined to the fixture by the club pair it was played between |
| Empty filters said nothing useful | `No results yet this season. The first round is still to be played.` on Results at day 383 |

Rounds are the unit the engine already had (`fixtures()` returns an index per round) and a round is not a
day: Zandora's first round runs Sat 13 and Sun 14 November, so the heading states a span and every row
carries its own date. Rounds are numbered in date order rather than by index, so a postponed round is
still "round 12" to a reader who walks the list.

Three defects found and fixed while building it:

- `district(n, day)` returns `results: []` — the scores only come back when the call also asks for
  players. The first version of the panel joined an empty list and printed nothing; the fixtures view now
  asks for the richer call and the table view keeps the cheap one.
- The reading-measure rule (`:is(#clubPage, …) .org-agenda > p` at 72ch) was shrinking the round bar and
  the range line into prose boxes, because it is scoped with an id and beat the new class rules. The
  fixtures panel is UI, not prose, and now escapes the measure under the same `#clubPage` scope.
- `‹` / `›` as stepper glyphs failed `test/disclosure-defaults.test.cjs`. The steps read `Previous` and
  `Next`.

### 27.3 Numbers

| Contract | §26 | Now |
|---|---:|---:|
| Page anchors / primary / breadcrumbs | 72/72 | 72/72 |
| Status chips | 78 | 78, 0 without words |
| Tables without a phone mode | 0 of 22 | 0 of 22 |
| Contrast failures | 0 | 0 |
| Text under 11 px, not metadata | 545 | 545 |
| Tests | 318 | 318 pass, 0 fail (5 new: `test/competition-fixtures.test.cjs`) |

Depth on the Fixtures view, `scrollHeight / clientHeight`:

| Fixtures view | Before | Now |
|---|---:|---:|
| Upcoming, 1440 | 31.88 | **1.88** (1,516 px) |
| Upcoming, 390 | 59.27 | **3.15** (2,082 px) |
| Results (empty, day 383), 1440 / 390 | 31.88 | 1.11 / 1.59 |
| Results (11 rounds played, day 450), 1440 / 390 | — | 1.92 / 3.04 |

Behaviour, measured in the browser:

- Day 383: `Upcoming 38 · Results 0 · All 38`, `Round 1`, 10 rows, `Previous` disabled at the first round,
  spotlight `Kintaba United v Kay FC · 15:00 · 13 Nov 2027`.
- `Next` walks to `Round 2 · 20–21 Nov 2027` and the person's place in the list survives the redraw (focus
  stays on the step button). Walking to round 38 disables `Next`; `Round 38 of 38`.
- Mid-season (day 450, a copy of the career, tests only): `Upcoming 27 · Results 11 · All 38`, Results opens
  on `Round 11 · 15–16 Jan 2028` with ten real scores (`0–2`, `1–1`, `1–2`, `0–0`, `2–1`, …), the
  manager's own row marked and the spotlight reading `YOUR RESULT · Koroba Teachers v Kay FC · 0–1`.
- Switching filter keeps focus on the pressed filter; a club name in a row opens that club's dossier
  (`worldClub`, `Densari Railway`).
- 0 horizontal overflow at both widths; no ISO date anywhere in the view.

Sweep: 214 screens at 390, 768 and 1440 px, 0 horizontal overflow, nested scroll traps 41 / 38 / 38.

### 27.4 What this session deliberately left

- **Leaders** still has no filters, no page size and no phone mode (session 3: position, club and
  minimum-appearances filters, 25 rows a page, visible count).
- **Football Intelligence** still needs `Showing x–y of N` and Load more on every category (session 3).
- The club's own **Matches** screen (`[data-hc-open="fixtures"]`) is the matchday hub — fixture card,
  advance button, calendar — and was not part of this pass.

## 28. Phase 5, session 3: leaders you can filter, and dossiers that tell the truth about their totals

### 28.1 The problem

Two lists lied about their size. **Leaders** printed every player with a goal, no filters, no page and no
phone mode — a five-column table in a horizontal scroller. **Football Intelligence** sliced its categories
at 120 players, 100 clubs and 100 managers, and then printed `Showing 1 to 25 of 120` on top of a pool of
**3,888 players**: the range was counting the slice, not the records. Forty-two clubs could not be reached
at all.

### 28.2 What the two screens are now

| Before | After |
|---|---|
| Leaders: one table, no controls | `Position` (All / Goalkeepers / Defenders / Midfielders / Forwards), `Club` (all twenty), and `At least 1 · 2 · 3 · 5` in the ranked category |
| No page, no count | 25 rows a page with `Showing 1 to 25 of 119 players`, `Page 1 of 5`, `Previous` / `Next`, and the page reset when a filter or category changes |
| Five columns in a horizontal scroller on a phone | `data-tl-table="cards"`: rank, name, value and position on one line, club beneath, every row a card |
| `9 players ranked by goals` at a glance | The count is the filtered count and it says what it ranks: `119 players ranked by goals`, `26 players ranked by assists` |
| Dossiers sliced at 120 / 100 / 100 | No slice. `Showing 1 to 25 of 3888` players, `of 142` clubs, `of 100` managers, `Show 25 more` growing the page 25 at a time |
| A dossier range that could not be trusted | The total is the filtered total, the module owns the paging, and the shared list pager is told to stand down (`data-tl-grid`) so there is exactly one pager and one range on the screen |

Appearances are not modelled: the league records **goals, assists and clean sheets** per player, and no
appearance count exists on a player record. The plan asked for a minimum-appearances filter; printing one
would mean inventing a number, so the "at least" filter counts the category being ranked — `At least 3
assists` — and the note beside it names the unit (`goal`, `goal`, `clean sheet` when the minimum is 1).

### 28.3 Numbers

| Contract | §27 | Now |
|---|---:|---:|
| Page anchors / primary / breadcrumbs | 72/72 | 72/72 |
| Status chips | 78 | 78, 0 without words |
| Long lists without a range | 0 | 0 |
| Tables without a phone mode | 0 of 22 | 0 of 22 |
| Contrast failures | 0 | 0 |
| Tests | 318 | 319 pass, 0 fail (one new: position groups) |

Leaders depth, `scrollHeight / clientHeight`: **1.63 at 1440** and **3.09 at 390** on the day-383 career
(9 ranked players, one page). Mid-season (day 450 copy, tests only) **2.36 / 5.53** — twenty-five rows, which
is the page size the phase asked for.

Behaviour, measured in the browser:

- Day 383: `9 players ranked by goals`, `Showing 1 to 9 of 9 players`, `Page 1 of 1`, both pager buttons
  disabled; `Goalkeepers` with `At least 1 goal` is honestly empty and says so.
- Day 450: `119 players ranked by goals`, 25 rows, `Showing 1 to 25 of 119`, `Page 1 of 5`; `Next` gives
  `Showing 26 to 50 of 119`, first row `26 · Sergio Andersen · Kintaba Teachers · ST · 4`, and focus stays on
  the pager button. `At least 3 assists` → `26 players`, every value 3 or more.
- Football Intelligence: players `Showing 1 to 25 of 3888`; `Show 25 more` twice → `Showing 1 to 75 of 3888`
  with focus kept on the button; switching category resets to 25; `Agents` (four records) shows no range at
  all because there is no second page; searching `Koroma` gives `Showing 1 to 25 of 70`.
- Clubs `Showing 1 to 25 of 142` — the 42 clubs the old cap hid are now reachable.
- 0 horizontal overflow at 1440 and 390 on both screens.

Sweep: 214 screens at 390, 768 and 1440 px, 0 horizontal overflow, nested scroll traps 41 / 38 / 38.

### 28.4 What this leaves for session 4

The phase gate is "no sliced list without a range; every dossier reachable ≤ 2 taps with a breadcrumb". The
ranges are done; the reachability half is not: **Atlas** still opens on the map rather than a browsable
country list, and club and manager dossiers still have their own layouts instead of one hero → KPI → action
rail → archive shape with the trail above it.

## 29. Phase 5, session 4: an atlas you can read, and one dossier shape — the phase close

### 29.1 The problem

The World screen was a poster, not an index. **Atlas** opened on a passport card, a drawn map and five
continent cards — **8,105 px at 1440 (10.04 folds)** and **8,910 px at 390 (13.46 folds)** — and the
twenty nations existed only as pins on a picture. You could not read the list of countries the game
actually models (20 nations, 142 registered clubs, 5 continents) without hunting for it.

The dossiers were two different pages with no way back. **Club dossier** and **manager dossier** had
their own headers, no trail, and no way to move between club, manager, league and world. A club's squad
was a four-column table in a horizontal scroller on a phone (invisible columns, no caption, no count),
records printed raw ISO dates, and pressing a club's name inside a league table opened **the atlas**
instead of the club: the fast route to a club dossier did not exist at all.

### 29.2 The atlas is now a country list

| Before | After |
|---|---|
| Opens on a passport card, a map poster and five continent cards | Opens on the `Countries` / `Map` toggle, with the list pressed first: `20 nations · 142 registered clubs · 5 continents` |
| Twenty nations as map pins | Five continent groups (`Europa Champions Cup`…), one row per nation: flag, name, `CODE · capital X`, `N clubs`, a `Major league` chip where the season layer says so, and a `League` button |
| No filters | Continent pills carrying their own counts — `All 20`, `Europa 4`, `Afrania 4`… — that hide the other groups in place without a redraw, so focus and scroll stay put |
| The map is the screen | `Map` is the enhancement: the pick line names `nation · continent · capital`, the passport sits under it, and `Back to all 20 countries` returns to the index |
| A country is a poster | A country page states `Continental competition`, the league (one press to `Open the X competition`) and `Registered clubs` — `19 across 5 settlements` for Zandora — plus the division blueprint |

The copy was corrected while doing it: the header says **`142 registered clubs`**, not `founding
clubs`. One hundred clubs are founding clubs; the other forty-two were created in careers (Zandora alone
has nineteen members), and the atlas must not claim a total it does not have.

### 29.3 One dossier shape

Both dossiers are now, in order: **trail → hero → KPIs → action rail → archive**.

| Part | Club dossier | Manager dossier |
|---|---|---|
| Trail | `World / Zandora / Kintaba United` — World opens the atlas list, the nation opens that country's map, the club is the current page | `World / Zandora / Kintaba United / Mara Rivas` — every step up is a press, including the club |
| Hero | crest art, `WORLD CLUB DOSSIER · ZANDORA`, name, `Independent club ownership · #6 in Zandora` | the same cover, `WORLD MANAGER DOSSIER · ZANDORA`, the coach and the club |
| KPIs | Nation · League record · First-team pool · Board target | the same four-cell rail (club, record, squad, board reading) |
| Action rail | `Open the league` · `Open the manager` · `Open the atlas` | `Open the club` · `Open the league` · `Open the atlas` |
| Archive | dugout and benches, ownership, `First-team players` (captioned table, phone cards, `data-tl-table="cards"`) | career record, appointment history, links out |

Three supporting fixes came with it:

- The head bar no longer prints raw page ids: `worldClub` reads **`Club dossier`** and `worldManager`
  **`Manager dossier`**, each under a `World` crumb that goes to the atlas.
- Records are written, not dumped: `1 Aug 2027`, never `2027-08-01` (verified: 0 ISO dates left in either
  dossier).
- A club's name in the league table opens **the club**. The guide's country/place jump was handled before
  the club handler, so a club row in a league table, in the World wire standings, or on a passport opened
  the atlas map instead of the dossier. The dossier handler now runs first; country jumps still work from
  the buttons that are only country jumps.

### 29.4 Numbers

Atlas depth, `scrollHeight / clientHeight` on the day-383 career:

| | Before | After |
|---|---:|---:|
| Atlas @1440 | 10.04 (8,105 px) | **2.16 (1,745 px)** |
| Atlas @390 | 13.46 (8,910 px) | **3.99 (2,644 px)** |
| Atlas filtered to one continent | n/a | **1.00 / 1.37** |
| Atlas map view | 10.04 / 13.46 (it was the only view) | **3.76 / 5.06** |
| Club dossier | 1.63 / 2.70 (1,312 / 1,789 px) | 1.80 / 4.18 |
| Manager dossier | 1.00 / 1.39 (807 / 918 px) | 1.00 / 1.45 |

The club dossier is deeper on a phone than it was (2.70 → 4.18). That is deliberate: the old page hid the
squad's position, age and nation columns inside a horizontal scroller. The roster is now a captioned table
that turns into 24 phone cards of 62 px — legible, and `0` horizontal overflow — and the trail and the
44 px rail add about one more fold's worth of chrome at the top.

Reachability, measured in the browser at 1440 and 390:

- League table → club dossier: **2 taps** (`Competitions`, then the club name). It was 3 taps before,
  and the middle one used to land on the atlas.
- Club dossier → manager dossier → back to the club: **1 tap each**, on the rail.
- Club dossier → `World` → the atlas list of 20 rows: **1 tap**; → the nation → that country's map: **1 tap**.
- Trail steps keep their `data-` payloads, so the trail is navigation, not decoration: `World` carries
  `data-life="go" data-v="atlas"`, the nation carries `data-atlas-choose="ZAN"`, the club carries
  `data-world-club`.
- 0 horizontal overflow on all four screens at both widths.

| Contract | §28 | Now |
|---|---:|---:|
| Page anchors / primary / breadcrumbs | 72/72 | 72/72 |
| Status chips | 78 | 78, 0 without words |
| Long lists without a range | 0 | 0 |
| Tables without a phone mode | 0 of 22 | 0 of 22 |
| Contrast failures | 0 | 0 |
| Tests | 319 | **324 pass, 0 fail** |

Five new tests: four for the atlas (row-per-nation inside continent groups, pill counts that match the
data, the major chip appearing only where the season layer says so — and *nothing* where it does not, the
map view naming its nation and offering the list back, and the explicit code winning over the manager's
home nation), and one that walks both dossiers asserting the same trail, rail and archive order, the
captioned phone-mode roster and the absence of ISO dates.

Sweep: 214 screens at 390, 768 and 1440 px, **0 horizontal overflow**, nested scroll traps 40 / 38 / 38.

### 29.5 Phase 5 is closed

The phase gate was two statements. Both hold:

- **No sliced list without a range.** Sessions 1–3 removed the sliced lists (`Showing x–y of N` on
  Leaders, Football Intelligence, the dossiers and the competition tables); this session added no list
  without one — the atlas is 20 rows that fit, and the two dossier archives are full, not capped.
- **Every dossier reachable ≤ 2 taps with a breadcrumb.** Every dossier now carries the trail, and the
  two-tap route exists from the league table, from the atlas map's passport, from a club's own page and
  from the manager dossier's rail.

Out of scope, still: the club's own **Matches** screen (`[data-hc-open="fixtures"]`, the matchday hub) was
not touched — it belongs to Phase 6, with tactics and the Season Book.

## 30. Phase 6, session 1: one screen, one job — and codes that say their own name

### 30.1 The problem

The tactics page was two screens pretending to be one. The head said `SQUAD / TACTICS`; a strip above
the pitch said `TOUCHLINE 26 / MATCH PREPARATION` — a CSS pseudo-element, not a control — and neither
line said whether this was where you *design* a tactic or where you *prepare for a match*. The next match
was one press away in the head, so the two destinations existed without ever being named.

On a phone the header grid kept two columns at 390 px: the title column collapsed to **33 px**, so
`Kay FC` stacked one word per line and `Attacking mentality` broke mid-word (`Attac / king / menta / lity`).
The layout was measured at 392 px of header where it needed 240.

Every position was a bare code — `CB-De`, `FB-Su`, `LB`, `MR` — on the pitch, in the team sheet and on
the bench, with no words anywhere. And the four facts a manager checks constantly (formation, mentality,
familiarity, what needs reviewing) sat in the middle of the scroll, so reading them meant scrolling back
up on every one of the three workspace tabs.

### 30.2 What the screen is now

**Canonical destination, decided and written down:** *Tactics designs; the next match prepares.* Design
lives here — shape, phase roles, duties, instructions, the XI, saved tactics. Team news, the opposition
briefing and kickoff live in the match. The page says so in its own words (`TACTIC DESIGN · Kay FC`), the
strip that claimed "match preparation" is gone, and the screen keeps exactly one primary action,
`Open the next match`, as the bridge to prep.

| Before | After |
|---|---|
| `TOUCHLINE 26 / MATCH PREPARATION` printed above the workspace, cut from CSS | Removed. The head crumb (`Squad / Tactics`) and the hero (`TACTIC DESIGN · Kay FC`) are the only two labels |
| Codes and nothing else: `CB-De`, `FB-Su`, `LB`, `MR` | The pitch carries a key built from the same slots it draws: `CB-De Centre-back, defending` · `FB-Su Full-back, supporting` · `WM-Su Wide midfielder, supporting` — one line per distinct assignment, in sentence case |
| Position codes in the team sheet | `GK-De` over `Goalkeeper`; position codes carry their plain name as an `abbr` title (`LB` → Left-back, `MR` → Right midfielder) |
| Pitch markers titled `Drag Serra to change position` | `CB-De · Centre-back, defending — drag to move Serra`, and the button's accessible name says the role in words |
| Formation, mentality, familiarity and warnings scattered mid-scroll | A sticky summary above the tab content: `OUT OF POSSESSION 4-1-4-1 · IN POSSESSION 4-2-1-3 · MENTALITY Attacking · FAMILIARITY 92% · 14 to review`, pinned to the top of the scroll and present on all three tabs |
| `Combined` and `Both` as two names for two different views | `Out of possession` · `In possession` · `Average positions` · `Side by side` |
| Two commands for one job: `Auto-pick best XI` (panel) and `Auto-select best XI` (below) | One: `Auto-pick best XI` |
| Three different phrases for the review state, and a count that included notes | One phrase per state — `Needs review` / `Ready to rehearse` — and the sticky chip counts only things that need a decision: `14 to review`, not `15 warnings` |
| A phone header in two columns (title 33 px wide, 392 px tall) | One column: title 366 px wide, header **240 px**; metrics, then the save controls, then the tabs |

The team sheet's column header also stopped colliding with itself: `ABILITY` and `PLAYER` were printing on
top of each other because the header row and the data rows disagreed about their columns. They now share
one template (`34px · role · 58px · player · 46px · 62px · 54px`), and the player picker is capped at
230 px instead of stretching to whatever the row gave it.

### 30.3 Numbers

| | Before | After |
|---|---:|---:|
| Tactics depth @1440 | 2.55 (2,055 px) | 2.64 (2,127 px) |
| Tactics depth @390 | 4.27 (2,932 px) | 4.28 (2,939 px) |
| Header height @390 | 392 px | **240 px** |
| Team Instructions tab | — | 1.77 / 3.40 |
| Player Instructions tab | — | 1.69 / 2.44 |

The depth barely moved because the summary that was added is the same height as nothing at all on a
phone: the header lost 152 px and the sticky bar took back a row. The gate for this phase is a phone fold
of **≤ 3.0×**, and the screen is at **4.28** — session 2's work (line-grouped starters, collapsed bench,
a bottom-sheet editor) is where that gets paid for. Measured at 390: the pitch alone is the largest single
block, and the team sheet below it runs 11 starters plus 6 substitutes as 17 rows.

| Contract | §29 | Now |
|---|---:|---:|
| Page anchors / primary / breadcrumbs | 72/72 | 72/72 |
| Status chips | 78 | 78, 0 without words |
| Long lists without a range | 0 | 0 |
| Tables without a phone mode | 0 of 22 | 0 of 22 |
| Contrast failures | 0 | 0 |
| Tests | 324 | **327 pass, 0 fail** |

Three new tests: the pitch key names every code it draws (and never repeats one), the sticky summary is
above the tab content and states its four facts with a state that is either `Shape checked` or a count,
and the four shape views are named in words with a single auto-pick command and no `MATCH PREPARATION`
anywhere on the screen.

Behaviour, measured in the browser at 1440 and 390: the summary's `position` is `sticky`, it sits at the
scroll container's top after an 800 px scroll (`143 = 143` at 1440, `158 = 158` at 390), and it survives
switching to Team Instructions and Player Instructions. 0 horizontal overflow at both widths, 0 ISO dates
on the screen.

Sweep: 214 screens at 390, 768 and 1440 px, **0 horizontal overflow**, nested scroll traps 40 / 38 / 38.

### 30.4 What this leaves for session 2

The phone. Starters are still 11 identical rows, the bench is a flat list of 6, and the role/duty/condition
editor is a panel below both — the plan's "line-grouped starters, collapsed bench, bottom-sheet
role/duty/condition editor". That is also where the 4.28 folds get cut to under 3.0.
