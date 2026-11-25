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
