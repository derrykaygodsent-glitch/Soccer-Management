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
