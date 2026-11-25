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
