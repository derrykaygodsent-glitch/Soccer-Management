# Touchline 26 — UI/UX audit

**Scope:** every screen, page, tab, dialog and transition reachable in the current build.
**Mode:** read-only assessment. No product code was changed to produce this document.
**Date:** 25 November 2026 · build `b8ca8d6` (branch `arena/35fc6963-soccer-management`)

---

## 0. How this audit was done (and its one blind spot)

I read the whole interface layer rather than eyeballing screenshots:

- all 7 stylesheets (`style.css`, `home.css`, `club.css`, `matchday.css`, `season.css`, `office.css`, `reading.css`) — **472,825 bytes of CSS**
- all 1,481,783 bytes of UI JavaScript, including every `views.*` renderer, every matchday `stage`, the entry flow and the 5 dialogs
- measured values pulled out mechanically: colour census, type-scale census, breakpoint census, tap-target sizes, table minimum widths, contrast ratios, class-namespace counts, artifact weight

**Now measured.** A browser became available part-way through this audit (Chromium 158, from an npm-only toolchain — see `docs/ui-measurements.md`), so the findings below were checked against **624 real screen-states**: 35 destinations × their tabs × 390 / 768 / 1440 px. The results, the screenshot evidence and the five places where pixels corrected me are in [`docs/ui-measurements.md`](./ui-measurements.md). Tool: [`scripts/ui-sweep.cjs`](../scripts/ui-sweep.cjs).

**Second pass, populated.** The sweep was then re-run against a **real career** (Kay FC, day 383, 17 players, 9 staff, 73 messages) loaded from an exported save — another **624 screen-states, 0 runtime errors**. Results and comparisons: §7 of [`docs/ui-measurements.md`](./ui-measurements.md). That pass confirmed the squad/scouting/league tables really do overflow on a phone (and at 1440), showed the inbox growing from 71 to **150** controls with real mail, and identified the Tactics contrast failures as the **star ratings (2.0:1)** and **role labels (2.9:1)**.


---

## 1. Verdict in one paragraph

This is genuinely ambitious work and the *bones* are better than most browser management games: real information architecture, real keyboard support, real focus management, real contrast discipline, a proper master–detail Inbox, an actual football-shaped Tactics screen, and a matchday ritual with a tunnel stepper that already feels like an event. What is holding it back is not taste — it is **system drift**. Three competing visual languages, 3,136 colours, 98 font sizes and 86 ad-hoc breakpoints have accumulated on top of each other, and the interface has defaulted to "dark dashboard with cards and buttons" exactly where you don't want it: the clubhouse. It reads like a *tool* that happens to be about football, when the thing that makes Football Manager's shell feel premium is that its chrome is more like a **broadcast product** than an admin panel.

The fix is not a redesign from zero. It is (1) one design language with a real token layer, (2) a navigation model built for 70 screens instead of 18, and (3) a flagship pass on the eight screens players actually live in. That is a buildable sequence, and it is what the roadmap sets out.

**Aggregate UI score today: 6.4 / 10** — strong structure, weak system, flat presentation.

---

## 2. There are three competing design languages in one product

This is the single most important finding. Counted directly from the CSS class namespaces:

| Namespace | Selectors | Where it lives | Its look |
|---|---:|---|---|
| `cc-` | 1,820 | shared clubhouse primitives (`club-ui.js`, `club.css`) | navy cards, 8 px radius, 10.6 px text |
| `md-` | 1,034 | tactics / matchday boards (`matchday.css`) | flatter, tighter, green-black |
| `tl-` | 602 | the clubhouse shell + Manager's Office (`home.css`) | slate-blue, lime accent, 13 px |
| `ms-` | 442 | matchday tunnel ("Managers' Studio") (`season.css`) | editorial paper, gold/teal |
| `hc-` | 364 | app chrome (sidebar, tabs, header) | flat slate, 11.75 px |
| `rec-`, `life-`, `mail-`, `terrace-`, `sq-`, `guide-`, `entry-`, `lm-`, `org-`, `desk-`, `look-`, `nation-`, `hub-`, `depth-`, `player-`, `photo-`, `career-`, `club-file-`, `field-` | 733 combined | manager-life shell, entry flow, life panels (`office.css`, `reading.css`) | warm-dark editorial, serif-ish rhythm |

Twenty-two prefix families. Concretely:

- the **base canvas** is `#101713` (green-black) on the pitch page but `#0d141e` (blue-black) in the clubhouse and `#0b1418` in the entry flow — three different "darks"
- the **body size** is 14 px on the match page, 13 px in the clubhouse, and 10.6 px inside clubhouse cards
- `.cc-btn` alone is redefined **79 times** across the stylesheets, with `min-height` values from 24 px to 33 px and font sizes from 9.5 px to 11.85 px depending on which file wins
- `reading.css` sets `.hc-tabs{display:none!important}` and then, 8 lines later, `display:flex!important` — two files actively fighting over the same element

**What would look better:** one surface system. One "abyss" background, one panel material (a single translucent plane with a 1 px inner hairline rather than opaque cards), one accent, one radius family, one type ramp. The match page, the clubhouse and the entry flow should read as *rooms in the same building* — same material, different lighting. That's how a game feels expensive; not by adding decoration, but by never letting the player notice a seam.

---

## 3. Cross-cutting findings

Each finding: **evidence → why it costs you → what to do.**

### 3.1 Typography is 2 mm tall (severity: critical)

- **Evidence:** 1,164 `font-size` declarations; **98 distinct px values** (including `7.45px`, `8.35px`, `10.65px`, `11-.85px`); **686 declarations (59%) are 8–11 px**. The census leaders are `10px` (142), `9px` (112), `11px` (107), `8px` (47). Sidebar group labels are 9 px, nav items 11.75 px, most card body 10.6 px.
- **Why it costs you:** at 8 px, lowercase x-height is ~1.2 mm on a phone. A player cannot scan 70 screens of dense data at that size, so they stop reading and start clicking. It also erases your hierarchy: when *everything* is small, the eye has nothing to grab, which is exactly the "flat dashboard" feeling you're trying to escape.
- **What to do:** adopt a hard 7-step ramp — `11 / 12 / 13 / 14 / 16 / 20 / 28` (plus display 34/44 in Barlow Condensed). Nothing below 11 px except legal micro-labels, and those only at ≥2.5:1 contrast on a solid fill. **Better:** add a Settings → Interface → *Text size* control (Compact / Comfortable / Large) that scales the root by 0.9 / 1.0 / 1.15 — FM ships this and its absence is the #1 complaint about FM's UI.

### 3.2 3,136 colours, and no token layer to fix it with

- **Evidence:** 3,136 unique hex values across the CSS. Per file: `office.css` 1,066, `reading.css` 907, `matchday.css` 415, `season.css` 292, `club.css` 259, `style.css` 174, `home.css` 75. Only `home.css` and `style.css` declare `:root` tokens; `club.css`, `matchday.css`, `season.css` and `office.css` declare none and hardcode everything.
- **Why it costs you:** you cannot retheme, cannot do a seasonal/light mode, and every new screen quietly invents three new greys. It is also why the three languages above exist — there was never a shared vocabulary to reuse.
- **What to do:** two tiers of tokens: *primitive* (`--ink-100…900`, `--lime-400`, `--slate-700…`) and *semantic* (`--surface-1/2/3`, `--text-primary/secondary/tertiary`, `--line`, `--accent`, `--positive/warn/danger`, `--elev-1/2/3`). Target **≤ 40 colour tokens** and ≈150 literal values in the whole product. Codify with a build-time lint that fails on new raw hex outside the token files.

### 3.3 86 breakpoints, no responsive strategy

- **Evidence:** 86 distinct `max-width` values. Peaks at 720 px (12 uses), 700 (8), 980 (6), 760 (6), 640 (6) — plus one-off widths at 465, 480, 500, 520, 530, 540, 560, 570, 600, 650, 740, 900, 926, 950, 1100, 1550, 1700 px and a `max-width:77px` that looks like a typo.
- **Why it costs you:** every screen has its own private set of breakpoints, so no two screens behave the same when you resize. That's the source of "it feels fine on my laptop but wrong on my phone".
- **What to do:** five breakpoints, named, applied by *layout role*, not by number: `sm 480` (single column, dock nav), `md 768` (tablet, two-pane collapses to drawer), `lg 1024` (sidebar appears), `xl 1440` (12-column grid, panels side-by-side), `2xl 1800` (max content width 1560 px, centred). Delete the rest.

### 3.3b Four defects the browser found (fix these first — they are small)

These are verified, reproducible, and each one makes the product feel broken on a phone:

1. **The Continue button is clipped at 390 px.** The header row does not fit; "Continue" is cut off at the right edge (`.audit/shots/390-home.png`). The page reports no horizontal overflow because the header clips it. The primary action of the whole game is partly off-screen.
2. **No page title on a phone.** `h1Count` is **0 at 390 px** on every screen and 1 at 1440 px — the title lives in a bar that collapses on mobile.
3. **A stray "Back" button inside the tab strip.** Every page shows Back twice: the history group up top, and again as the first chip of `Overview · Calendar · Inbox · Profile`.
4. **15 failing contrast pairs on Tactics** (vs 1–3 everywhere else) — muted labels on the green pitch panel. Palette-level contrast is fine, so this is one component, not a retune.

**Status, 25 November 2026:** all four are fixed and re-measured — before/after table in §8 of [`ui-measurements.md`](./ui-measurements.md). 

### 3.4 Navigation doesn't scale to 70 screens

- **Evidence:** the sidebar holds **26 destinations in 5 groups** in this build (18 clubhouse pages plus the manager-life pages share one sidebar; the sweep found **35 unique nav ids** across shell states) in a 215 px column at 11.75 px. A duplicate **Back** chip also sits inside the tab strip (see §3.3b). Each destination carries its own tab strip: Finances has **8 tabs**, Scouting 7, Dynamics 7, Club Info 6, Staff 6, Development 6, Squad/Eden 4, Transfers 4, Vision 4, Schedule 4, Tactics 6. `.hc-tabs` is `overflow:auto` with `scrollbar-width:none` and 21 px gaps — so on a phone the 8 Finances tabs silently run off-screen with **no fade, no arrows, no snap** to tell you they exist. There is also a page-level tab row (`Overview / Calendar Desk / Club vision`) *above* the section tabs, so there are two horizontal strips stacked, and the second one's contents change when you switch the first.
- **Why it costs you:** this is the #1 "casual dashboard" tell. Deep products feel deep when depth is *revealed*, not listed. Two stacked horizontal strips plus a hamburger is a lot of chrome to hold 70 screens and it never shows the *shape* of the game — no sense of "Club → Football → Squad", no breadcrumb, no favourites, no recents.
- **What to do (the "futuristic navigation" bit, concretely):**
  1. **Three-tier navigation.** L1 = 5 icon+label hubs in a 72 px rail (Clubhouse, Football, Season, Operations, Office) that stays visible at all widths. L2 = the chosen hub's pages in a collapsible 200 px panel with icons and live badges. L3 = the page's tabs, rendered as a **segmented rail directly under the title**, horizontally scrollable with edge fade + snap + keyboard arrows, and collapsing into a dropdown when > 5 tabs.
  2. **A command palette (`⌘K` / `Ctrl-K`) as the primary power-user entry** — fuzzy search over every page, player, club, competition, action and setting, with grouped results (`Jump`, `Players`, `Actions`, `Recent`). You already have `global-search.js` and a 142 px "Find a page" button; promote that engine into a palette and demote the button to an icon.
  3. **A persistent context spine** at the top of content: `Football / Squad / Player Stats` breadcrumb + "pin to rail" + "open in split view".
  4. **Mobile:** replace the hamburger drawer with a **5-slot dock** (Home, Inbox, Squad, Tactics, Continue) + the drawer for everything else, and swap the desktop sidebar for a *sheet*. Mobile nav should be thumb-reachable, not top-left.
  5. **Recents + favourites** in the palette and as a "Jump back in" strip on Home. This is what makes 70 screens feel navigable rather than daunting.

### 3.5 There are two products in the shell

- **Evidence:** two independent page systems share `#homeScreen`: the clubhouse router (`TLClubDesk.go(page, tab)` → `views.*`, 18 pages) and a second router in `manager-desk.js` (`page='home' | 'jobs' | 'interviewDesk' | 'district' | 'household' | 'personal' | 'legacy' | 'succession' | 'neighbourhood' | 'bids' | 'intelligence' | …`, rendered by `TLHousehold`, `TLDistrictLife`, `TLSquadRoom`, `TLSeasonBook`, `TLLuma`, etc. with `data-life="go"` buttons). They have different CSS families (`cc-/hc-/tl-` vs `sq-/org-/rec-/lm-/life-`), and they duplicate concepts under different names:

| Clubhouse page | Manager-life page | Same thing? |
|---|---|---|
| Squad | Squad room (`sq-room`) | yes — two squad lists |
| Squad Planner | Squad planner (`depth-board`) | yes — two depth charts |
| Player Profile | Player file (`sq-pass`) | yes — two player pages |
| Finances | Club account / wallet | two money views, one club one personal |
| Club Vision | Boardroom / board visit | overlapping |
| Competitions | Competition room / season book | overlapping |

- **Why it costs you:** a player who learns one half has to relearn the other, and "where do I do X?" has two answers. It's also a lot of the 3,136 colours.
- **What to do:** keep both *activities* (running a club; living a manager's life) but unify the **shell**: one rail, one tab component, one page-header component, one card/panel primitive. Then rename so no two things share a word: e.g. club side = `Squad`, `Selection`, `Player record`; life side = `Your squad` → `Your career`, `Your week`, `Your money`. Surface the life layer as a first-class hub ("Manager") rather than a second set of pages that look like a different game.

### 3.6 The default composition is a stack of cards

- **Evidence:** Home (`clubhouse()`) stacks nine modules in one scroll — match hero, today's desk, 4 KPI tiles, fixtures panel, league table, player leaders, club ledger, Terrace panel — with no reflow, no personalisation and no priority. Measured: the clubhouse Home is **2.19× viewport** at 390 px (≈1,850 px of scroll) — long, but not the worst offender; `intelligence` (15.06×), `jobs` (11.38×) and `atlas` (10.11×) are the pages that really need paging. Many workspaces are also 2-pane at every width until a breakpoint removes the pane entirely.
- **Why it costs you:** "cards and buttons" is precisely what you said you don't want. A card grid says *here is everything*; a game screen says *here is what matters now*.
- **What to do:** recompose Home as a **matchday poster with a modular board**:
  - a full-bleed hero (next fixture, countdown, opponent form, one primary CTA) that occupies ~38% of the fold at every size
  - **one** attention lane: "3 things need you" with decision cards, not a list of everything
  - then a **widget board** the player can reorder/hide (Fixture list, Table, Leaders, Ledger, Terrace) with density variants `rail / compact / detailed`
  - replace the 4 KPI tiles with an **instrument strip** (inline sparkline + delta + tap-through) that reads like telemetry, not marketing metrics
  - at < 768 px collapse to: hero → attention lane → 3 widgets, with the rest behind "More".

### 3.7 Tables have no mobile mode and there is no pagination

- **Evidence:** tables are the primary data surface (12 modules render `<table>`; `club-squad`, `club-people` alone emit 8 tables). Minimum widths are hard-coded: `355px`, `370px`, `407px`, `453px`, `600px`. They sit inside `.cc-scroll{overflow:auto}` — so on a 390 px screen a squad table is a horizontal scroll with no sticky first column. There is no pagination anywhere: lists render in full, and long ones are capped by `max-height` (e.g. `455px`, `clamp(340px, 100svh - 247px, 650px)`), which means three nested scroll areas (`page → panel → table`) on mobile. The player-dossier flow has a "More" that increments by 30 — the only paging gesture in the product.
- **Measured (populated save):** page-level horizontal overflow is still **0**, but four tables do overflow their own container at **390, 768 and 1440 px**: `squad` (the most-used table in the game — its `Nat`/`Value` columns run off a phone screen with no scroll cue), `scouting`, `league` and `kitOffice`. See `.audit/shots-career/390-squad.png`.
- **Why it costs you:** horizontal scrolling inside a vertically scrolling page inside a full-screen shell is the classic mobile-web failure. And a 38-row league table, 40+ fixtures or a 200-player shortlist all deserve explicit paging, not infinite scroll.
- **What to do:**
  1. **Responsive table contract** — at ≥1024 px: full table, sticky header inside one scroll container, sticky primary column. At 768–1023: drop to 4–5 essential columns with a row-expand for the rest. At <768: **switch component entirely** to a card/row list (name + 3 metrics + chevron), grouped by section with sticky group headers. Never a horizontally scrolling table on a phone.
  2. **Pagination component** — `Showing 1–25 of 214` + `‹ ›` + page-size (25/50/100) + "Jump to page". Apply to: Inbox, Schedule/fixtures, standings (full table), Scouting shortlist/players, Transfers history, Staff search, Competitions results, Season book. Keep scroll+capped heights for genuinely small lists (< 20 rows) — pagination for its own sake is worse than none.
  3. **One scroll per screen.** The page owns vertical scroll; panels own horizontal only when they're a deliberate rail (carousels).

### 3.8 The primary button changes identity six times

- **Evidence:** `home.js` `action()` returns `Continue` / `Stop processing` / `Next Unread` / `Inbox` (required) / `Tactical Meeting` / `Season complete` — same lime button, six labels, four colour states (`data-action=required|stop|meeting|next-unread`), plus it becomes disabled at season end.
- **What works:** this is a genuinely smart piece of UX — the most important action is always in the same muscle-memory position, and the *label* tells you what it will do. Keep it.
- **Problem:** colour + label + meaning all change in place, so the player must *read* the button every time, and a mis-click can advance the calendar when they meant to open a message.
- **What to do:** split it. A permanent `Continue` (calendar advance, always the same lime, always the same meaning) plus an adjacent **attention chip** that shows the queued interruption (`⚑ 3 decisions`, `⚽ Matchday`, `✉ Next unread`) and is what actually pulses. Same affordance, two honest verbs. Add a short confirm on the season-end state.

### 3.9 State feedback is thin where it matters

- **Evidence:** the built page contains **5 `aria-live` regions** and 63 `role=` attributes; feedback is mostly a transient `toast` (`#toast`, `#clubStatus`) plus inline `note()`. Saves are silent. There are no skeleton/loading states; the only progress UI is the entry flow's "Opening the world" and the match restore bar (`#clubRestore`). Long operations (calendar processing) do have a genuinely lovely dedicated screen.
- **What to do:** a **status layer** — a save indicator in the header (`Saving… / Saved 14:02`), an `aria-live="polite"` announcer for toasts and route changes, per-panel skeletons (not spinners) for anything > 300 ms, and consistent success/error/inline-validation patterns built once.

### 3.10 Accessibility: better than average, with three real gaps

**Good — protect this:** native `<dialog>` with `showModal()`, `inert` on the frame during the drawer, `focus-visible` rings everywhere, focus restored to the invoking control, `aria-current` on nav/tabs, `aria-pressed` on toggles, `<caption class="hc-sr">` on tables, `role="img"` with labels on charts, `prefers-reduced-motion` respected in 4 of 7 stylesheets, and **contrast is genuinely fine**: measured WCAG ratios — muted `#a6b3c5` on card `#172230` = **7.55:1**, dim `#8193ab` = **5.12:1**, ink = **14.68:1**. Most teams ship worse.

**Gaps:**
1. **No skip link** (0 occurrences). With 18 nav items + tabs + header tools, keyboard users tab through ~30 controls to reach content.
2. **Tap targets below 44 px.** The `min-height` census is dense at 24–36 px (`cc-btn` 24–33, nav 31, tabs 35, icon tools 32–34, mini 26). Mobile is where this hurts, and it's your stated target.
3. **Missing reduced-motion** in `club.css` and `matchday.css`, and only 3 `scroll-snap` usages for the many horizontal rails.

**Also:** no `<h1>` on most workspaces (the shell's `<h1 id="homeTitle">` is reused across pages, and 4 `<h1>`s exist in the whole built page), so heading navigation reads as one long document.

### 3.11 Weight and boot cost

- **Evidence:** the shipped artifact is a single **5.1 MB** `index.html` (**2.85 MB gzipped**) with all CSS, JS, fonts (base64) and 14 images inlined, and the artifact is committed to Git. `build.cjs` concatenates 118 modules in a fixed order.
- **Why it costs you:** first paint on a mid-range phone pays a multi-second parse before anything is interactive, and every visit re-downloads everything even though the shell is offline-cached. It also makes iteration slow and diffs unreadable.
- **What to do:** keep the offline-first promise, but split by *hub*: a core shell bundle (chrome + router + design tokens) plus lazily-loaded chunks per hub and a separate match-engine chunk. Preload the chunk for the hub the player is in. Keep fonts as woff2 files with `font-display:swap` rather than base64 (they're cached separately and don't block parse). Target: **shell < 300 KB gz**, first meaningful paint < 1.5 s on a throttled phone.

### 3.12 Motion has no language

- **Evidence:** 16 `@keyframes`, plus ad-hoc `element.animate()` calls in `career-entry.js` (260 ms fade-up), `club-matchday.js` (240 ms fade-up), and CSS transitions of 0.14–0.19 s scattered across files.
- **What to do:** three named motions, used everywhere: `enter` (180 ms, 4 px rise, `cubic-bezier(.2,.7,.25,1)`), `reveal` (260 ms for a screen change), `pulse` (attention only, 1.1 s alternate). Duration/easing as tokens. Nothing else animates. Motion should mark *navigation* (a page arriving from the direction you moved) and *consequence* (a result landing), never decorate.

### 3.13 Matchday is a 6-screen lock before kick-off

- **Evidence:** the tunnel is `meeting → selection → briefing → news → preTalk (dressing room) → preview → pitch → half → halfTalk → full → fullTalk`. Each transition is a gated "advance" button; `submitTeamDialog` blocks selection; the pitch only starts on an explicit Kick off.
- **What works:** this is the best idea in the product. The stepper (`#seasonMatchRoute`), the paper team sheet, the broadcast preview, the half-time/full-time report cards and the press room give matchday a *ritual* feel that FM largely lacks. Keep the ritual.
- **Problem:** six screens before a ball is kicked, every single fixture, with no way to compress. It's atmospheric once and tedious by fixture 12, and it's the moment a player is most likely to bounce.
- **What to do:** mark stages into three beats — **Prepare** (meeting + selection, merged into one screen with the pitch as the hero and the roster as a dock), **Dress** (briefing + team news + talk, one scroll with anchored sections), **Play** (preview collapsed into the pitch's pre-roll overlay). Add "Skip to pitch" after the first three fixtures, plus a "remember my choice" preference. Keep the stepper visible so the ritual is still legible.

### 3.14 Art direction: missing

There is no image or texture layer in the clubhouse at all — just flat planes on flat planes. The entry flow, by contrast, uses 14 photographs well (`entry-tunnel`, `club-briefing`, `club-dressing`, `floodlights`, `supporters`…), which is why the *start* of the game looks better than the *middle*.

**What would look better — the "gamy, not dashboard" direction, concretely:**

- **Material:** one dark material with a subtle noise/grain layer (2–3% opacity SVG noise, tiled) and a soft top-light gradient. Cards stop being opaque rectangles and become *planes* separated by light, not by borders.
- **Depth:** two elevations only — *field* (content) and *plate* (things you can act on). Hover raises 1 px + 2% brightness. No drop shadows on every card.
- **Colour discipline:** club colour drives the accent per-screen (Riverside blue/gold) while **lime stays the "you can act" signal only**. Right now lime is nav-current, primary button, chart fill, meter, tab underline and text accent simultaneously, which spends the whole attention budget in one place.
- **Typography:** Barlow Condensed is doing all the work and it's the right instinct — push further. Display numbers (scores, ratings, prices, dates) at 28–44 px condensed tabular; body at 13–14 px Inter; micro-labels 11 px uppercase +0.12 em tracking, nowhere below 11 px. One accent italic for editorial copy (press, terrace, season book).
- **Photography:** use the existing club imagery as *room headers* (a 180 px band behind each workspace title, 12% opacity, masked), so moving from Squad → Medical → Finances changes the light. That alone will kill 80% of the "dashboard" feeling.
- **Signature surfaces** (the things people screenshot): the matchday pitch HUD, the tactics board, the player record, the processing calendar, the season book. Spend the boldness there and keep everything else quiet.

---

## 4. Screen inventory

**Total distinct screens: ~92** (each `views.*` page × its tabs, plus matchday stages, entry flow, dialogs, and life-shell pages).

| Area | Screens | Count |
|---|---|---:|
| Entry | Main menu · Career setup (Apply/Found) · Manager file (Personal, Appearance, Review) · World guide (5 continents × country dossier) · Preparing | 8 |
| Clubhouse shell | Sidebar · header bar · tab rail · global search · notebook · help · cloud saves · mobile drawer · processing screen | 9 |
| Clubhouse — Clubhouse | Manager's Office (Home) · Inbox · Social Feed · News · Leagues in Focus · Around the World | 6 |
| Clubhouse — First team | Squad (Overview, International, Player Stats, Availability) · Squad Planner · Tactics (Overview, In Possession, In Transition, Out of Possession, Set Pieces) · Dynamics (7) · Training · Medical Centre | 20 |
| Clubhouse — Season | Schedule (Fixtures, Calendar, Events, Reminders) · Competitions | 5 |
| Clubhouse — Operations | Scouting (7) · Transfers (4) · Staff (6) · Development Centre (6) | 23 |
| Clubhouse — Front office | Club Info (6) · Club Vision (4) · Finances (8) | 18 |
| Detail pages | Player profile (3) · Calendar Desk (2) · Club profile · Manager profile | 7 |
| Matchday | Tactical meeting · Team selection · Briefing · Team news · Dressing room · Match preview · Live pitch · Touchline desk (4 tabs) · Half time · Half-time talk · Full time · Final talk · Press & supporters | 13 |
| Life shell | Manager home · Jobs · Interview desk · Personal · Household · District · Connections · People · Neighbourhood · Bids · Intelligence · Legacy · Succession · Season book | 14 |

---

## 5. Page-by-page assessment

Scoring: **Hierarchy** (can I tell what matters), **Legibility** (can I read it at arm's length), **Touch** (does it work with a thumb), **System** (does it obey a shared language), **Joy** (does it feel like football). 1–5 each.

### 5.1 Entry — Main menu

**Now:** there is a **splash stage first** (`data-entry="splash"` → a single **Enter Touchline** button), and the menu sits behind it. The menu is a full-bleed scene (`#careerScene`) with an editorial panel: `TL / 26 · CAREER CENTRE`, huge condensed `TOUCHLINE 26`, then Resume / Start a new game / Load game, footer "OFFLINE EDITION / SEASON 2026–27". Top-right: Cloud saves, Full screen, Open in new tab.

**Works:** the type is confident, the photo scene gives it a real identity, keyboard focus is moved to the `<h1>`, reduced-motion is respected. This is the best-looking screen in the product.

**Problems:** three utility links sit in the same visual weight as the game menu; "Load game" is disabled with no explanation; the panel is content-width so on a wide screen it floats in a lot of empty photograph; nothing indicates *where you'd continue from* in more than one line.

**Would look better:** treat it as a title screen — logo lockup top-left, menu bottom-left in a single column with 44 px targets, saves as a horizontal "continue card" row (club crest, manager name, date, last played) on the right; utilities demoted to a settings icon; a version string bottom-right. Add a slow 20-second Ken Burns drift on the scene image (disabled under reduced-motion) — cheap, and it's the difference between "a web page" and "a game".

`Hierarchy 4 · Legibility 3 · Touch 3 · System 3 · Joy 4`

### 5.2 Entry — Career setup, Manager file, World guide

**Now:** `paths` (Apply for a job / Found a club as two photo tiles) → `profiles` (create or reuse) → three steps *Personal / Appearance / Review* with `look-picker` radio tiles, live SVG portrait, `skin-sample` swatches → `countries` (continent tabs, country list, nation dossier with life/economy/calendar/clubs) → `preparing` (progress with country names).

**Works:** the `look-picker` radio-tile pattern is the right call (native radios = keyboard + SR + touch in sync), the portrait preview is charming, and the nation dossier is a lovely bit of world-building that most games skip.

**Problems:** it's a **9–11 click funnel before first value**, and the country step is a browsing surface (5 continents, dozens of countries, four dossier sections each) inserted *in the middle* of a setup wizard — people will wander and forget they were setting up. Defaults are invisible (name empty, age 28, job "Unemployed"). The Appearance step's eleven pickers are a wall of small tiles. Progress isn't shown as a stepper.

**Would look better:** a **three-step wizard with a visible stepper** — (1) *Who are you* (name, portrait, nationality as a searchable flag list with a "randomise" die), (2) *Where do you start* (Apply/Found), (3) *Confirm* — with a **"Quick start: Riverside"** button on step 1 that skips everything and drops you in the dugout. Move the world guide out of the funnel into an optional "Explore the world" link (it's reference material, and it's already good enough to be its own screen). Show a persistent `Step 1 of 3` and a live manager card that updates as you choose.

`Hierarchy 3 · Legibility 3 · Touch 3 · System 4 · Joy 4`

### 5.3 Clubhouse shell — sidebar, header, tabs, search

**Now:** 215 px sidebar: brand, club card, 18 nav items in 5 groups, display controls, Main menu, Cloud saves, manager card at the bottom. Header: back/forward, section kicker + page title, 142 px "Find a page" search, help, date/clock button, lime Continue. Below: page tab strip. Mobile: hamburger + scrim drawer; search collapses to an icon.

**Works:** grouping by domain is correct; badges on Inbox; the back/forward pair is rare in games and genuinely useful; the clock is a strong affordance; focus and `aria-current` are handled.

**Problems:** 18 items at 11.75 px is a wall (see §3.4). Two horizontal strips stacked. Selected state (lime text + dark green fill + dot) is three signals for one state. The sidebar's bottom third is four stacked buttons of near-identical weight (Display, New tab, Main menu, Cloud saves, Manager) — five "escape hatches" crowding the most valuable real estate in the product.

**Would look better:** the three-tier rail from §3.4; hub icons that are *pictorial* (a pitch, a shirt, a trophy, a briefcase, a ledger); current-hub accent as a 2 px edge line, not a filled pill; entity chips in the header (`Riverside FC · 2026/27` as one clickable club chip rather than a sidebar card); one "system" menu (☰) holding settings/fullscreen/new tab/cloud, so the escape hatches stop competing with navigation.

`Hierarchy 3 · Legibility 3 · Touch 2 · System 3 · Joy 2`

### 5.4 Home — Manager's Office

**Now:** `RIVERSIDE FC · CLUBHOUSE` kicker, "Manager's Office" title, Notebook button; then a 2-up grid of *match hero* (photo, competition, `A v B`, countdown, date/venue, CTA "Match centre" + "Club tactics", crest face-off) and *Today's desk* (status line, up to 3 tasks with Respond/Open actions, footer CTA); then 4 KPI tiles (League position, Squad available, Inbox, Transfer budget); then a 3-up board (Fixture list with date chips + opponent crests, League table with form dots and our-row highlight, Player leaders with avatars); then Club ledger (balance + area chart + four line items) and a Terrace card with photo.

**Works:** this is a real football dashboard, not a generic one — fixture list, table snapshot with form, leaders, ledger. The hero is a good idea. "Today's desk" answering *what needs me now* is the right north star for the page. The ledger chart is tasteful.

**Problems:** nine modules, no priority, no personalisation, no density control → on mobile it's ~2,400 px of scroll. The KPI row is decoration (it repeats facts available one click away and doesn't let you act except by hiding nav inside tiles). "Notebook" sits where a page-level action should be, with more weight than things players need. The league panel shows 6 rows and a "Full table" button — good — but the table's own header repeats `P GD Pts` in 10 px.

**Would look better:** hero at 38% of the fold, a single **attention lane** underneath, then a **widget board** (reorderable, 3 density modes) with an instrument strip instead of KPI tiles (sparkline + delta + tap-through). On mobile: hero → attention → 3 widgets → "More". Give the page a *time-of-day* voice — "Pre-season, week 3" or "Matchday minus 2" — because that's the cheapest way to make a dashboard feel like a season.

`Hierarchy 4 · Legibility 3 · Touch 2 · System 3 · Joy 4`

### 5.5 Inbox (messages) + News / Leagues in Focus / Around the World

**Now:** master–detail. Left list grouped by conversation, with unread state and `aria-current` on the open message; right reader with subject/tone/body, decision answers (`season-answer`) or story links. On narrow widths it collapses to one pane, scrolls the reader to top, moves focus to `#inbox-subject`. Plus four sibling tabs: Social Feed, News, Leagues in Focus, Around the World.

**Works:** this is the best-engineered screen in the product — real two-pane with a narrow fallback, scroll restoration into the list, focus management, and a decision model where "read ≠ answered" (a genuinely good rule). "Next Unread" as a header action is smart.

**Problems:** four sibling tabs inside Inbox make the Inbox do three jobs at once (correspondence, social, world news); each of those tabs then grows its own sub-filters (feed modes, topics, league folds, region folds). The list rows are 10–11 px and give no preview line, so triage is slow. Decisions are text blocks with buttons — the most important interaction in the game is styled like a form.

**Would look better:** (1) Inbox = correspondence only; move Social/News/World to their own hub destination ("Media"). (2) Row = avatar/crest + subject + 2-line preview + time + a tone strip on the left (lime = decision, ice = news, amber = medical, red = board pressure). (3) **Decision as a card, not a form**: headline, who it's from, the deadline, 2–3 options as full-width buttons with consequence hints, and a "what happens if I ignore it" line. That single change makes the game's core loop feel authored.

`Hierarchy 4 · Legibility 2 · Touch 3 · System 4 · Joy 3`

### 5.6 Social Feed

**Now:** a second world inside a tab: feed modes, topic filters, follow/unfollow, like, save, "manage", grouped subject directory, post cards, a moments/report modal.

**Works:** follow/like/save state is persisted and the topics are football-shaped.

**Problems:** four independent controls above one stream (mode, topic, manage, follow) is a filter cockpit for a read-only feed; and being a tab inside Inbox makes it undiscoverable.

**Would look better:** a single stream with a **chip rail** (`All · Club · Supporters · Press · Competition`) and one overflow menu. Promote to its own page with a 3-column "who to follow" rail on desktop, and make the source (crest/avatar/outlet) the visual anchor of each post so it reads like a timeline, not a list of cards.

`Hierarchy 3 · Legibility 2 · Touch 3 · System 3 · Joy 3`

### 5.7 Squad (Overview / International / Player Stats / Availability)

**Now:** intro room card (crest-less kicker + register copy + two metrics), then a filterable, sortable table: shirt, name, position, ability stars, condition, status, rating; "Quick Pick" and per-player slot assignment; `cc-squad-table` min-width 355 px; `field()` handles `sheet:` drag-equivalent assignment.

**Works:** sortable columns with remembered direction, availability colouring, and quick-pick are all real management-game features. Table is the right primitive here.

**Problems:** on a phone this is a horizontally scrolling 5-column table — the exact case from §3.7. 8–10 px cells. No grouping by unit. No compare/select-multiple. The "room intro" card above the table repeats what the page title says.

**Would look better:** group rows by unit (GK / DEF / MID / ATT) with sticky headers and an aggregate line per unit; on mobile switch to a **row card** (shirt + name + position + condition ring + rating, tap to expand into attributes); add a **compare tray** (select 2–3 players → side-by-side radar); drop the intro card on repeat visits (show it only when the tab is empty or filtered to zero).

`Hierarchy 4 · Legibility 2 · Touch 2 · System 3 · Joy 3`

### 5.8 Squad Planner (Depth chart)

**Now:** four lanes (GK/DEF/MID/ATT) of player buttons with avatar, position, condition and role tag; a pool filter (Full squad / Available / Starting XI & bench); "Edit club tactics" CTA.

**Works:** the lane metaphor is instantly legible and the role tags (Starting XI / Bench / Reserve) give it game meaning.

**Would look better:** make it **spatial** — a pitch-shaped depth board with 11 slots and stacked candidates beneath each slot, so "who is next in this position" is answered visually. Add drag-and-drop (the state model already supports `sheet:` assignment), availability as a ring around each avatar, and a "gaps" mode that collapses everything except positions with ≤1 available player.

`Hierarchy 5 · Legibility 3 · Touch 3 · System 3 · Joy 4`

### 5.9 Tactics (Overview / In Possession / In Transition / Out of Possession / Set Pieces)

**Now:** `md-tactics-grid` = *tactics board* (preset group, intensity meter, compact/expanded toggle, formation select, pitch with roles or numbers, attacking-direction caption) + *selection roster* (filter, role/duty/player/ability/goals/condition/info/rating table). Phase tabs open `md-instruction-grid` panels of option-button groups (`md-choice`) with SVG phase sketches and copy. Set pieces = takers table + routine selects + sketch.

**Works:** this is the flagship and it's close. The pitch as the centre of the screen, the phase split (possession / transition / defending) mapped to real football thinking, the sketch illustrations, the compact↔expanded layout toggle, and the preset row (1–5 buttons) are all correct. The intensity meter is a nice touch of abstraction.

**Problems:** the roster table again (8 columns at 453 px min-width). Option groups render every choice as buttons of equal weight, so 6 options look like 6 equal decisions. Rail links say "Change ›" for the *selected* tab, which reads wrong. The pitch doesn't show consequence — you pick "High press" and nothing on the pitch moves.

**Would look better:** (1) Pitch first, rest as a dock — 55% board / 45% dock on desktop, tabs as a segmented rail; (2) make choices **segmented dials** (3–4 named positions on a track, e.g. Deep ←→ High) rather than stacked buttons — the eye reads a scale, not a list; (3) **show the consequence**: selecting a line height nudges the defensive line on the pitch with a 200 ms tween and a live "who is exposed" hint; (4) role chips on the pitch that can be dragged between slots; (5) a **familiarity/chemistry overlay** (you have positional familiarity data already). Fix the rail's "Change" label to be state-aware ("Selected" on the active one only).

`Hierarchy 5 · Legibility 3 · Touch 2 · System 3 · Joy 5`

### 5.10 Dynamics (7 tabs), Training, Medical Centre

**Now:** Dynamics = Overview / Hierarchy / Social Groups / Happiness / Conduct / Team Meeting / Team Talk Feedback, mostly tables and card lists. Training = a 7-day strip of session chips with a detail aside (date, sessions, unit/lead/workload, readiness metrics). Medical = 3 metrics + treatment-room injury cards + availability table + staff list.

**Works:** the training week strip is a good spatial idea; medical metrics (unavailable / back within 7 days / available) are the right three numbers; the dressing-room tabs reflect real FM depth.

**Problems:** Dynamics' seven tabs is more surface than any single concept deserves — hierarchy, groups, happiness, conduct are four views of the same social graph. The intake of information is tables again. Nothing here is visual: morale, hierarchy and happiness are *relations*, and relations want a map.

**Would look better:** collapse Dynamics to **three** tabs: *Room* (a social graph / pecking-order wheel — avatars sized by influence, lines to cliques, colour by morale), *Mood* (a distribution + movers), *Talks* (history + feedback). Training: keep the week strip but add drag-to-schedule and a load heatmap. Medical: add an **injury timeline** (a horizontal Gantt of expected returns against fixture dates) — it answers "who's back for the cup tie?" in one glance, which is the actual question.

`Hierarchy 3 · Legibility 2 · Touch 2 · System 3 · Joy 3`

### 5.11 Schedule (Fixtures / Calendar / Events / Reminders)

**Now:** fixtures = toolbar (view mode, season, month stepper, competition filter) + table grouped by month with a month header row, TV icon, venue letter, result with a coloured dot, plus a **detail aside** (opponent, kick-off countdown, score, scorers, venue, attendance, action buttons). Calendar = a month grid with fixture chips per day and today highlighted. Events/Reminders = card + table with a reminder toggle. Youth fixtures swap in for u21/u18.

**Works:** this is a strong FM-style screen: month grouping, a persistent detail pane, and calendar/table duality for the same data. The `aria-current` on the selected fixture row and the "next match" bullet are thoughtful.

**Problems:** 7 columns + 355 px min-width again; the detail aside competes with the table on tablet widths; the year is abbreviated oddly (`Fri, 30 Oct/26`); the month stepper and the competition filter are the same visual weight as the "Fixtures" title.

**Would look better:** desktop keeps table+aside but with a **sticky detail card** and the month header pinned; tablet/mobile becomes **month accordions** of fixture rows (crest, opponent, H/A badge, result pill), tapping opens the detail as a bottom sheet. Add a **season spine** — a thin horizontal minimap of the 38 matchweeks coloured by result — at the top of Fixtures and Competitions so a season has a shape you can feel.

`Hierarchy 4 · Legibility 3 · Touch 2 · System 3 · Joy 4`

### 5.12 Competitions

**Now:** one tab, competition list, standings tables (short and full variants via `standings()`), cup circuits and honours.

**Problems:** a single tab holding several competitions means a long scroll of tables; honours are text.

**Would look better:** a competition **selector rail** (crest chips) with the selected competition taking the whole stage, a proper table with qualification bands (colour the top 4 / relegation), and a **cup bracket** drawn as a real bracket instead of lists. Honours as a trophy shelf with years.

`Hierarchy 3 · Legibility 3 · Touch 3 · System 3 · Joy 3`

### 5.13 Scouting (7 tabs) / Transfers (4) / Staff (6) / Development Centre (6)

**Now:** the deepest workspaces. Scouting: overview intro, Scouting Centre, Players, Recruitment Focus, Coverage, Shortlist, Scout Report. Transfers: Transfer Centre, Director of Football, Clauses, Transfer History. Staff: Overview, Responsibilities, Staff Search, Staff Shortlist, Job Centre, Job Security. Development: Overview, Loans, U21, U18, Youth Candidates, Staff. All table-and-card heavy, with `rec-box`/`scout` panels, star ratings, grade badges (`cc-grade`) and sparklines (`cc-spark`).

**Works:** the depth is real and the primitives (stars, grade, spark, meter, confidence) are good; search + filters + shortlist is the correct model for recruitment.

**Problems:** seven tabs for recruitment splits one workflow across seven places — the player has to remember which tab holds what. Everything is a list; a *pipeline* (watched → scouted → shortlisted → bid → negotiating) is the actual shape of recruitment, and it's invisible.

**Would look better:** a **recruitment board** — kanban columns for the pipeline, player cards that drag between columns, a right-side dossier that opens on selection, and filters applied globally. Keep the tab strip for *reference* views (Coverage, History, Clauses) rather than for the workflow. Same treatment for Staff (roles → candidates → shortlist) and Development (pathway: U18 → U21 → loan → first team, drawn as a ladder, not a tab per age group).

`Hierarchy 3 · Legibility 2 · Touch 2 · System 3 · Joy 3`

### 5.14 Club Info (6) / Club Vision (4) / Finances (8)

**Now:** Club Info = Profile, General, News, Facilities, Affiliates, History (12 cards, 3 tables, photo headers via `front()` room intros with `tl-room-art`). Vision = Overview, Performance, Board, Supporters. Finances = Summary, Income, Expenditure, Wages, FFP, Debt and Loans, Sponsors and Other, Projection — **8 tabs**, each a card or table, plus a hand-rolled SVG area `chart()` with a scale column and tick marks.

**Works:** the room-intro pattern (`front()`) with an image, kicker, headline, copy, CTAs and 2–3 metrics is genuinely good — it's the closest thing in the product to a "room" and it should be applied far more widely. The finance chart is well-built (proper axis, ticks, negative handling).

**Problems:** 8 finance tabs is a filing cabinet, not a dashboard; money is the one thing players want *aggregated*. Vision's four tabs each show a fragment of the board relationship. Facilities/history are lists where a club should have a *place*.

**Would look better:** Finances = **one financial dashboard**: balance + projection line at the top, then a stacked bar of income vs expenditure by category for the current month, wage bill vs budget as a gauge with the top 10 earners, FFP as a status meter, and drill-down panels that expand in place instead of navigating away. Vision = a **board relationship screen** (confidence dial, objectives as progress rings, promises with countdowns). Club Info = an **isometric club estate** (facilities as tiles you can upgrade) rather than six tabs of prose.

`Hierarchy 3 · Legibility 2 · Touch 2 · System 3 · Joy 3`

### 5.15 Player Profile (Overview / Attributes / Form & Stats)

**Now:** heading `12. Name`, subtitle position · club; overview with avatar and values; attributes; form/stats. Shared `player` page with `retainId`.

**Problems:** the most-visited detail page in any management game is text-first, and has no radar, no timeline, no comparison.

**Would look better:** a **player record**: full-height portrait panel (the `cc-art`/avatar system already exists), name/number/flag/age/value, a 6-axis attribute radar with role fit, a form sparkline over 10 matches, a development curve, a contract/availability strip, and a "compare" button. Absolute must: it should be reachable from every table row everywhere (it mostly is) and open as a **side sheet** on desktop so you don't lose your list context.

`Hierarchy 3 · Legibility 2 · Touch 3 · System 3 · Joy 3`

### 5.16 Calendar Desk (Club calendar / Fixtures & Results) + Processing screen

**Now:** the calendar desk is the date-driven view: `today` shows the day's activities and decisions, `fixtures` shows the day's league programme. The **processing screen** (`#homeProcessing`) is a dedicated full-pane: kicker with an animated three-dot "SEASON CLOCK", a big "Processing calendar" heading, a days-processed counter, six day-cards (past/current/future, with the day's activities and fixture counts), and a footer with automatic stops + "Stop here Esc". Screen readers get a `role=status` announcement per frame; all other chrome is `inert`; focus moves to Continue.

**Works:** this is the most *cinematic* interaction in the product and precisely the kind of thing that makes a management game feel alive. Day cards with real activity lists, an honest stop model, and correct inert/focus handling. Protect it.

**Problems:** it's the only place with this much craft; the calendar desk itself (its destination when processing finishes) is a plain two-tab page.

**Would look better:** keep the processing screen exactly as is, add (a) a per-day tally of results appearing as the clock passes them, (b) a subtle "ticker" of league goals for the days processed, and (c) after a stop, an **arrival card** that says why it stopped (`matchday in 2 days`) and offers the next action. Turn the Calendar Desk into a **year planner**: a horizontal 12-month filmstrip with fixture pins, decision pins, and the pause marker — the same mental model as the processing day-cards, scaled to a season.

`Hierarchy 4 · Legibility 3 · Touch 3 · System 4 · Joy 5 (processing) / 3 (desk)`

### 5.17 Matchday tunnel: Tactical Meeting → Selection → Briefing → Team News → Dressing Room → Preview

**Now:** a dedicated shell (`#seasonMatch`) with a kicker, title, meta, date/clock, a **tunnel stepper** (`#seasonMatchRoute`: 8 numbered steps, `aria-current="step"`, completed steps marked), a Back button (only on the first two stages), and one primary advance button whose label is stage-specific ("Go to Match", "Dressing Room", "Match Preview", "Go to Pitch", "Start Second Half", "Return to Clubhouse"). Content per stage:
- *Meeting*: tactical advice, preset/preset deltas, CTA into Selection
- *Selection*: tabbed (`overview / instructions / individual / opposition / pieces / captains / numbers`) with a pitch and slot pickers, layout toggle, and a `submitTeamDialog` confirmation
- *Briefing*: six feedback cards (Shape, Mentality, Leadership, On the ball, Without the ball, Set plays) with a player avatar + mood tag each
- *Team News*: an **official team sheet** on paper (crests, manager, XI, subs, referee) with staff reaction and press round-up asides
- *Dressing room*: team/unit/individual talk with audience + gesture + statement
- *Preview*: broadcast scene with photo, "ON AIR" line, score strip, both lineups on pitches, officials table

**Works:** genuinely inventive. The stepper, the paper team sheet, the broadcast preview, and per-stage advance labels give this a *producer's* feel. Focus is preserved across stage changes by re-finding the focused control (`data-ms-field`/`data-ms-do`), scroll is restored per panel, and stage transitions have a 240 ms rise. That's more care than most shipped products.

**Problems:** six gated screens per fixture (see §3.13). The stage transitions are full re-renders of `body.innerHTML` with only focus/scroll restoration — so there's no directional continuity, no sense of moving *through* a tunnel. Briefing feedback is six near-identical cards. The team sheet is beautiful but static.

**Would look better:** merge to **Prepare / Dress / Play** with an "advance" that slides horizontally (real spatial progression, matching the stepper); make the briefing a **single verdict banner** (the assistant's read plus three flags) with the six cards collapsible; make the team sheet interactive (tap a name → player record sheet); and let the preview be a **collapsed pre-roll** on the pitch rather than its own stage.

`Hierarchy 4 · Legibility 3 · Touch 3 · System 4 · Joy 5`

### 5.18 Live pitch (Classic 2D) + Touchline desk

**Now:** site bar (brand, "Match centre", Cloud saves, Home, "Classic 2D" pill) → fixture head (eyebrow competition, `A v B` h1, Match setup) → broadcast panel: header (brand, venue, score strip with clock / club blocks / score / status / "105 × 68 M · FULL PITCH"), canvas pitch with overlays (replay indicator, goal card, player focus card, field stamp, technical areas with M and numbered seat buttons), commentary line + events button, `<details open>` "Preferences" containing playback (Kick off / Speed / Next highlight) and view controls (Highlights / Names / Replay / Sound) → team deck (crest, XI label, formation, three actions, horizontal lineup of 100 px cards) → footer with keyboard hints. Touchline desk = a 4-tab modal (Tactics / Squad / Stats / Events). Half-time and full-time break dialogs.

**Works:** the score strip is good (the paper-white clock block against dark is a strong, broadcast-y detail). On-pitch affordances (manager M markers, numbered subs, referee R key) are genuinely novel. Keyboard shortcuts are surfaced in the footer. `prefers-reduced-motion` is respected. Player focus card with role select and substitute-off is the right idea.

**Problems:** on mobile the pitch is `aspect-ratio:1.475` capped by `calc(100svh - 348px)` — and the controls sit *below* the pitch inside a `<details>`, so the thing you need most (Kick off, speed) is under the fold at the exact moment you need it. Controls are native `<select>`s for speed and highlight mode (so they look like form fields, not game controls). The lineup is a horizontal scroller of 100 px cards at the very bottom. Three different button systems (`.button`, `.cc-btn`, `.icon-button`) are on screen simultaneously. Sound is opt-in but "Stadium sound" is a toggle buried in prefs.

**Would look better:** a proper **broadcast HUD**:
- score bug pinned top-centre *over* the pitch (crest–score–crest–clock), with the venue/competition as a lower-third at the top-left
- a **thumb dock** at the bottom (44–56 px): Kick off (primary), speed (segmented 1× 2× 4×), highlights mode (chips), names, replay, sound — always visible, never in a `<details>`
- the feed as a **lower-third caption bar** that rises from the bottom edge with the minute and event icon, auto-dismissing after 6 s (with a "log" button opening the events desk)
- commentary/events moved to a right rail on ≥1280 px (live log), so desktop players can watch and read
- the lineup as a **bench strip**: 11 numbered chips + 6 subs with a condition ring, tap to open the focus card
- half-time/full-time as full-bleed **analysis boards** (score, xG race, shot map, player ratings heat), not dialogs

`Hierarchy 4 · Legibility 3 · Touch 2 · System 2 · Joy 5`

### 5.19 Press, media conference, half-time/full-time reports

**Now:** press arrives as a modal `editForm` with a "How do you want to open?" select (three tones) and a submit; `media-conference.js` and `football-press.js` add a press desk and rivalry book; half/full-time use `breakDialog` with score and stats and three buttons; the match review (`R.report`) draws a richer analysis with a report-mode/side switch.

**Works:** the tone-select is a decent minimal interaction; the review panels are more interesting than the dialogs.

**Problems:** the most dramatic moment in football management — the press conference — is a `<dialog>` with a `<select>`. The full-time summary is a modal when it should be the reward screen of the match.

**Would look better:** press as a **scene**: dim room, journalist portraits (you have `local-reporter.webp`), a quoted question in display type, three tonal answers with a predicted reaction meter, and the headline previewed *before* you confirm. Full time as a **full-page analysis board** with the score hero, xG race, shot map, ratings, and "Continue" → press → clubhouse.

`Hierarchy 3 · Legibility 3 · Touch 3 · System 3 · Joy 3`

### 5.20 Dialogs: search, notebook, help, cloud saves, submit team

**Now:** native `<dialog>`s. Global search has a results panel with a per-row "Squad" shortcut; notebook is a `<textarea>` with 16,000 char limit and local persistence; help is a 5-bullet list; submit-team is a confirm.

**Works:** native dialogs, `autofocus` on close, `aria-labelledby`, backdrop blur (`::backdrop` with `backdrop-filter`).

**Problems:** help is a bullet list in a 660 px modal; search is a small results list rather than a command surface; notebook has no structure; cloud saves as a modal is fine but its trigger sits in nav where it competes.

**Would look better:** search → **command palette** (§3.4). Help → a searchable guide with section anchors and "show me" links that navigate. Notebook → a proper page with dated entries, pinning, and entity links (`@player`). Cloud saves → a page-level "Your saves" view with per-save cards, sizes, and last-played.

`Hierarchy 3 · Legibility 3 · Touch 3 · System 3 · Joy 2`

### 5.21 Manager-life shell (home, jobs, interview desk, personal, household, district, connections, people, neighbourhood, bids, intelligence, legacy, succession, season book)

**Now:** the second product (§3.5): `guide-hub` pages with `org-cover` photo headers, `org-agenda` panels, `sq-banner` rooms, `lm-statement` wallet statements, `rec-box` info boxes, `mail-layout` two-pane inbox, terrace/network feeds with threads, `depth-field` pitch diagrams. Typography here is warmer and the copy is more editorial.

**Works:** the *content* is excellent — founding a club from scratch, an FA licence hearing, a district practice with trials, a household budget, a neighbourhood, a season book with final tables and retirements. This is the part of the game that will make people tell their friends about it, and the record/list density is appropriate to its "career document" voice.

**Problems:** it looks like a different game (§3.5, 22 namespaces), it's reachable through `data-life` buttons scattered inside other pages (so there's no map of it), and its pages are long documents with no persistent local navigation — you scroll, then press Back mentally.

**Would look better:** give it a **visible hub** ("Manager") in the main rail with four sub-rails — *Career* (jobs, interviews, legacy, succession), *Money* (wallet, household, business), *District* (ground, connections, people, neighbourhood), *Archive* (season book, intelligence, records). Unify its components with the clubhouse (§3.5) but keep the warmer, editorial typography — that contrast is a feature, as long as the *chrome* is identical.

`Hierarchy 3 · Legibility 3 · Touch 3 · System 2 · Joy 4`

---

## 6. Scorecard and the 15 highest-leverage changes

### Scorecard

| Screen | Hier | Legi | Touch | System | Joy | Avg |
|---|---:|---:|---:|---:|---:|---:|
| Entry — menu | 4 | 3 | 3 | 3 | 4 | 3.4 |
| Entry — setup + world guide | 3 | 3 | 3 | 4 | 4 | 3.4 |
| Shell — sidebar / header / tabs | 3 | 3 | 2 | 3 | 2 | 2.6 |
| Home — Manager's Office | 4 | 3 | 2 | 3 | 4 | 3.2 |
| Inbox + News/World | 4 | 2 | 3 | 4 | 3 | 3.2 |
| Social Feed | 3 | 2 | 3 | 3 | 3 | 2.8 |
| Squad | 4 | 2 | 2 | 3 | 3 | 2.8 |
| Squad Planner | 5 | 3 | 3 | 3 | 4 | 3.6 |
| Tactics | 5 | 3 | 2 | 3 | 5 | 3.6 |
| Dynamics | 3 | 2 | 2 | 3 | 3 | 2.6 |
| Training | 4 | 3 | 2 | 3 | 3 | 3.0 |
| Medical | 4 | 3 | 2 | 3 | 3 | 3.0 |
| Schedule | 4 | 3 | 2 | 3 | 4 | 3.2 |
| Competitions | 3 | 3 | 3 | 3 | 3 | 3.0 |
| Scouting / Transfers | 3 | 2 | 2 | 3 | 3 | 2.6 |
| Staff / Development | 3 | 2 | 2 | 3 | 3 | 2.6 |
| Club Info / Vision / Finances | 3 | 2 | 2 | 3 | 3 | 2.6 |
| Player profile | 3 | 2 | 3 | 3 | 3 | 2.8 |
| Calendar Desk | 4 | 3 | 3 | 4 | 3 | 3.4 |
| Processing screen | 4 | 3 | 3 | 4 | 5 | 3.8 |
| Matchday tunnel | 4 | 3 | 3 | 4 | 5 | 3.8 |
| Live pitch | 4 | 3 | 2 | 2 | 5 | 3.2 |
| Press / reports | 3 | 3 | 3 | 3 | 3 | 3.0 |
| Dialogs | 3 | 3 | 3 | 3 | 2 | 2.8 |
| Manager-life shell | 3 | 3 | 3 | 2 | 4 | 3.0 |
| **Weighted average** | | | | | | **≈3.2 / 5 (6.4 / 10)** |

### The 15 changes, ranked by (impact ÷ effort)

1. **Token layer + one type ramp.** Biggest lever in the product; everything else gets cheaper afterwards.
2. **Kill 8–11 px text** (686 declarations). Instant legibility win on desktop and mobile.
3. **Ship a Text size / Density setting** (Compact / Comfortable / Large). This is the FM complaint you can beat them on.
4. **Three-tier navigation + command palette** (§3.4). The "futuristic navigation" ask, delivered as function.
5. **Mobile table contract** (list mode < 768 px, sticky headers, no horizontal scroll). Largest single mobile fix.
6. **Split Continue into Continue + attention chip** (§3.8). Removes the game's most dangerous misfire.
7. **Home recomposition** (hero + attention lane + widget board). Turns the dashboard into a game screen.
8. **Broadcast HUD for the live pitch** (score bug, thumb dock, lower-third feed). Makes the flagship screen feel triple-A.
9. **Decision cards in the Inbox** instead of forms. Makes the core loop feel authored.
10. **Collapse the matchday tunnel to 3 beats** with "skip to pitch". Fixes the biggest churn point.
11. **One card/panel primitive** (a single "plate" with hairline + top light). Ends the card-stack feeling.
12. **Pagination component** + one scroll per screen. Fixes 8 data-heavy workspaces at once.
13. **Player record page** (radar, timeline, side-sheet). Highest-traffic detail page in the genre.
14. **Room headers with photography** on every workspace. Cheapest "not a dashboard" win — reuse your existing 14 images.
15. **Branded attention motion + directional transitions.** Makes navigation feel physical; costs ~40 lines.

---

## 7. What I would *protect* while doing all of this

These are already better than the competition and must survive the redesign:

1. **The reading/answering distinction in the Inbox** ("reading is not answering"). It's a real design rule and it shapes the whole game's pace.
2. **The processing screen** — day cards, honest stop reasons, `role=status`, `inert` chrome.
3. **The matchday tunnel + paper team sheet + broadcast preview.**
4. **Accessibility fundamentals**: native dialogs, `inert`, focus restoration, `aria-current`/`aria-pressed`, table captions, chart labels, `prefers-reduced-motion`.
5. **Contrast discipline** (7.55:1 and 5.12:1 on the clubhouse palette). Don't let a "moodier" theme wreck it.
6. **The room-intro pattern** (`front()` with image + kicker + headline + copy + CTAs + metrics). Generalise it, don't replace it.
7. **Compact/expanded layout toggles** and the density instinct behind them.
8. **Offline-first.** It's a differentiator. Split the bundle, don't abandon the promise.

---

## 8. Three things I need from you before the redesign starts

1. **Density philosophy:** do you want *FM-deep* (dense tables, expert-facing) or *broadcast-glossy* (fewer numbers on screen, tap-through for depth)? My recommendation is glossy surface + deep drill-down, which is how you beat FM: they win on data, you win on *feel*.
2. **Art budget:** do we generate a small set of room images/crests (I can produce these) or stay typographic-only?
3. **Mobile posture:** is phone a first-class platform or a companion? The whole responsive strategy (dock nav, list-mode tables, 44 px targets) depends on the answer. My recommendation: first-class — that's where the "highly rated" audience is.

Everything in the roadmap assumes: **glossy surface + deep drill-down**, **small generated art set**, **phone first-class**.
