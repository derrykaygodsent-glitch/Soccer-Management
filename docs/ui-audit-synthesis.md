# Soccer Management — Visual / UX Audit (supplied synthesis)

> **Provenance:** supplied by the project owner on 25 November 2026, synthesised from seven
> structured screen-group reviews. Stored here verbatim in substance; only table formatting
> was normalised. **This is advisory direction, not implementation instruction** — it is one
> of three evidence sources:
>
> | Document | What it is | Authority |
> |---|---|---|
> | **this file** | Qualitative audit of look, information architecture and UX risk | Advisory design direction |
> | [`ui-ux-audit.md`](./ui-ux-audit.md) | My measured page-by-page audit of this build | Evidence |
> | [`ui-measurements.md`](./ui-measurements.md) | Numbers from 624 screen-states at 390/768/1440 | Evidence |
> | [`ui-rebuild-plan.md`](./ui-rebuild-plan.md) | How the rebuild is executed | Plan |
>
> Where this document and the measurements disagree, the measurements win and the plan says so.

---

## Executive summary

Soccer Management has a distinctive, credible football-management identity: dark clubhouse and office surfaces, lime active states, ice/teal secondary accents, football photography and art, pitches, crests, official sheets, broadcast scenes, editorial letters, and room metaphors. The strongest moments are those where the interface makes time, consequence and the next managerial decision visible — Continue, unread or response states, calendar commitments, squad readiness, matchday progression, scouting decisions, transfer stories, and career milestones.

The central UX risk is **accumulation**. Many screens are individually polished but collectively behave like dense legacy control panels: long sidebars, duplicated entry points, stacked cards, repeated player records, prose-heavy explanations, large peer-level tab sets, wide tables, silent result caps, and mobile layouts that mostly stack desktop content. The product does not need fewer systems; it needs clearer priority, progressive disclosure, stable local navigation, explicit status and deadline treatments, and purpose-built mobile representations.

The highest-value redesign work is to establish a shared information architecture and visual hierarchy across the shell, Squad, operations, world intelligence, life/social, tactics and career/governance families. Home should become a concise command center; Inbox should make urgency and actionability scannable; Calendar and planner should expose the next commitment and reachable slots; football operations should share a Squad/Operations navigation model; tactics should have one canonical destination; database-like views should disclose counts and support filters and continuation; and consequential decisions should use consistent preflight and confirmation patterns.

The **Tactics route is treated here as the current baseline**. It already received the previously implemented shell/workspace/navigation restoration. The recommendations below assess the restored route's visual hierarchy, density, scope clarity, responsive behavior and relationship to preparation/matchday — not a request to redo that restoration or change functionality.

## 1. Scope and method

This audit synthesizes the seven supplied structured screen-group reviews. It is a visual and UX assessment only. Functionality, persistence, game rules and existing protected behavior are treated as fixed. Recommendations are advisory redesign direction, not implementation instructions or a request for code changes.

The review coverage spans:

1. Global shell, Home, Calendar, Inbox, office planner and adjacent career entry.
2. Squad overview, player dossier, registration, development, medical and dressing-room dynamics.
3. Tactics, match preparation, matchday presentation, live match, post-match review and Season Book.
4. Training, Staff, Boardroom, Scouting, Transfers, Contracts and Finance.
5. Competition Centre, fixtures, Football Intelligence, World Guide, Atlas, club and manager dossiers.
6. News/social, supporters, district life, community, contacts, people and household.
7. Manager profile, personal accounts, founding, licensing, governance, succession and legacy.

The synthesis uses only the supplied review findings. No additional screenshots, browser observations or implementation claims are introduced. The supplied review set reports no failed groups.

## 2. Current visual identity

### Strengths

- A coherent football-office language runs through most of the product: navy and charcoal surfaces, lime active/positive states, teal or ice-blue secondary accents, amber warnings, raised cards, restrained borders and uppercase editorial eyebrows.
- The product feels like a management game rather than a generic admin dashboard when it uses football-specific metaphors: pitches, shirts, formations, crests, official sheets, broadcast overlays, dugouts, dressing rooms, transfer routes, scouting radars, career journals and federation rooms.
- Editorial and cinematic moments — Home, player dossiers, transfer deal rooms, matchday, manager profiles, district covers and career entry — give the game personality and emotional continuity.
- Visible focus rings, semantic current/pressed states, ARIA labels and reduced-motion handling are valuable foundations. Statuses are often paired with text tags rather than color alone.
- Responsive CSS shows real intent through drawer breakpoints, auto-fit grids, table overflow, stacked rooms, touch targets and reduced motion.

### Risks in the identity

- Typography is uneven. Premium editorial heroes coexist with 8–12px utility copy, tiny uppercase labels and low-contrast metadata. This creates a split between "premium game" and "compressed legacy dashboard."
- Dark borders and similar rounded cards are used too frequently. Surface treatment often carries hierarchy that should instead come from composition, alignment, spacing, type scale and explicit status.
- Related areas use different visual dialects: newer squad workspaces, older office surfaces, tactics board-room screens, matchday rooms, archives, green guides and passport treatments. Personality can remain, but shared tokens and hierarchy should make them feel like one product.
- Atmospheric copy is often allowed to compete with the decision surface. Narrative is an asset when it frames a choice; it becomes friction when it precedes a deadline, eligibility state, filter or action that should be immediately scannable.

## 3. Global design-system findings

### Current strengths

- The palette is recognizable and game-appropriate; retain dark/lime/ice, football imagery, visible focus treatment and reduced-motion support.
- The product has strong contextual-action patterns: Continue, desk alerts, unread and due badges, current-day calendar state, response buttons, squad availability, match progression and status-led cards.
- Details/summary, tabs, drawers, compact/expanded modes and route-specific workspaces provide the right primitives for progressive disclosure.
- Semantic tables and visible selected/pressed/sorted states are strongest in newer workspaces and scouting surfaces.

### Observed problems

- There is no consistently shared grammar for `due`, `next`, `optional`, `completed`, `unavailable`, `selection-safe`, `pending`, `locked` and `needs response`.
- Navigation is often duplicated across sidebar, header tabs, Home pathways, inline links and embedded modules. This increases cognitive load and makes destinations versus reference material unclear.
- Headers frequently compete with themselves: back/forward, location, search, help, wallet, clock and Continue compress before the drawer breakpoint.
- Tables and lists use inconsistent mobile strategies: horizontal overflow, hidden columns, truncation, fixed-width controls, stacked cards and full desktop structures all occur without always signaling the chosen mode.
- Result caps and slices are frequently silent. Database-like pages need visible ranges, counts, filters and continuation controls.
- Color, tiny labels and title-only indicators carry too much meaning. Every important state needs words, icons, patterns, legends or accessible summaries as reinforcement.
- Consequential actions are not consistently separated from routine actions. Dismiss, resign, retire, appeal, pay, submit and high-impact budget actions need a common preflight/confirmation treatment.

### Advisory design-system direction

- Establish a type scale with a minimum comfortable body and table size; reserve microtype for metadata, not decisions.
- Define shared tokens for surface tiers, border strength, status chips, button hierarchy, spacing, radius, focus, tabular numerals and deadline urgency.
- Standardize a status anatomy: label, value, state, deadline/countdown and next action.
- Use a three-tier composition on major screens: context/room title, decision summary, detailed evidence.
- Prefer one strong primary action per surface, with secondary actions grouped in an overflow or clearly subordinate rail.
- Create common responsive patterns for: sticky identity columns, stacked player/entity cards, filter drawers, mobile action bars, accordions, timeline rows, score strips, pitches and archive tables.
- Treat accessible semantics as visible design: sort direction, active tab, selected player, pressed filter, disabled reason and focus location should be obvious without inspecting code.

## 4. Route and screen inventory

| Family | Screens / routes covered | Dominant UX job |
|---|---|---|
| Shell and daily loop | Shell, Home, Calendar, Inbox, planner, career entry | Orient the manager and surface the next commitment |
| Squad | Squad overview, player room/dossier, registration, development, medical, dynamics | Select, assess, register and develop people |
| Tactics and matchday | Tactics, preparation, team selection, briefing, team news, broadcast, live match, reports, Season Book | Convert football intent into a fixture and learn from it |
| Operations | Training, Staff, Boardroom, Scouting, Transfers, Contracts, Finance | Run the club and its resources |
| World intelligence | Competition Centre, fixtures, stats, Football Intelligence, World Guide, Atlas, club and manager profiles | Explore the football world and reference entities |
| Life and social | Meridian Wire, Terrace, supporters, district, community, people, contacts, household | Manage the manager's off-pitch life and relationships |
| Career and governance | Manager profile, personal enterprise, founding, licensing, FA discipline, governance, succession, legacy | Manage career status, institutions and long-term consequences |

## 5. Screen-group assessments

### 5.1 Global shell, Home, Calendar, Inbox and planner

**Strengths.** The shell has a strong game identity and useful persistent context: page title, manager/job, club, wallet, date/time, search and a high-salience Continue control. The sidebar clearly separates Today, Football and Life in town; current states, badges, focus rings and the mobile drawer are sound foundations. Home correctly frames itself around "your next step," while Calendar uses a familiar month grid and readable agenda. Inbox is unusually operational for a game, combining search, urgency filtering, sender/category labels, unread and due tags, editorial reading treatment and response actions. Planner makes travel, fare, energy, reachability and earliest slots visible, which supports trust.

**Observed problems**

- **Shell / High:** Football contains roughly twenty destinations, while header tabs and Home pathways duplicate entry points. The long tail should move behind grouped, collapsible sub-navigation or More; Today and pinned essentials should remain visible.
- **Home / Critical:** Diary, tips, founding/job prompts, pathways, matchday, Coming up and history form a long, text-led stack with several equally weighted cards. There is no compact command center with one dominant decision.
- **Header / Medium:** Too many controls compete at narrower desktop widths. Establish a clear order: page context, search, compact status cluster, Continue; move secondary controls to overflow.
- **Search / Medium:** Search is visually generic and result types are not discoverable. Add entity-type chips, recent searches, keyboard hint and explicit empty state.
- **Calendar / High:** Three event dots per day hide busy schedules; color alone is weak for low vision. Previous/Today/Next is insufficient for a simulation with many commitments.
- **Inbox / Critical:** The two-pane list is an unbounded stream of compact rows. Urgent and reference mail are not clearly separated, and there is no visible range, count, pinned priority or next-unread control.
- **Inbox / Medium:** Dynamic category selects can become opaque and long. Needs response and Unread should be visible lanes or count-bearing chips.
- **Planner / High:** Important constraints are explained in a long paragraph after the booking form rather than before the choice. Reachable slots, travel, cost and energy need a compact visual summary.
- **Cross-screen / Polish:** Editorial heroes and microtype do not consistently feel like the same design system.

**IA and navigation.** Retain the shell's compact left rail, but make Today, Inbox, Calendar and Continue the persistent daily loop. Put Football, Life in town and Settings into expandable secondary groups. On every deep screen, expose an active section label and breadcrumb/context so the drawer does not strand the user. Home should link to the full Calendar rather than rendering an ever-growing schedule.

**Responsive and mobile concerns.** The 980px drawer breakpoint and scrim are good foundations. At 320–375px, menu, search, clock and Continue compete in one row; prioritize menu, title, Continue and one compact status icon, with search and wallet in a second row or drawer. Home needs a single-column Today stack, not a narrower copy of every desktop card. Calendar should be agenda-first on mobile with a compact date strip. Inbox's list-only/reader-only switch at the 640px breakpoint is appropriate; add an explicit back-to-list control and keep unread/due state in the reader header. Planner inputs and actions should become full-width 44px controls.

**Pagination, list density and future-state layout**

- Inbox: show `1–25 of N`, preserve filter state, support next unread/next due, and paginate or virtualize long histories.
- Calendar: add month/year picker, week/list view, `+N` overflow and next-event jump; add a text legend.
- Home: show the next 3–5 commitments and link to View all in Calendar.
- Planner: add previous/next day and first reachable slot shortcuts.

Future desktop Home: a Matchday command center with one primary next decision, next fixture/date, unread/response counts and Continue; below, Today's agenda and Decisions alongside squad/club snapshot and Coming up. Future mobile: a sticky action rail followed by next decision, next match and unread/response counts, with guide prose and pathways collapsed.

**Priority.** **Critical:** Reframe Home around Today / Decisions / Next match, and make Inbox urgency and actionability scannable. **High:** Reduce sidebar overload; add calendar counts, legend and navigation; redesign planner availability as visual slot feedback. **Medium:** Rebalance headers/search and normalize typography.

### 5.2 Squad, player dossier, registration, development, medical and dynamics

**Strengths.** Squad overview is a credible management cockpit: lineup slots precede the roster, Quick Pick is prominent and selection signals are available in one scan path. The newer workspace has strong selected, pressed, sorted, table-caption and label conventions. Player dossiers combine portrait-led identity, value/practice context, a profile plot, attributes, history and growth. Registration communicates competition windows and locked/editable state. Development's summary-to-detail rhythm and Medical's distinction between recovery and low-condition players are valuable. Football imagery, shirt concepts, room metaphors, focus styling and reduced motion establish tone.

**Observed problems**

- **Roster / High:** Formation slots, toolbar, filters, search, wide table and rules disclosure compete before the primary pick-XI decision. The lineup bar is visually uniform across XI and bench.
- **Tables / High:** "Swipe the table" is insufficient on phones. Name, status and position should be sticky, with a deliberate mobile card/column mode.
- **IA / Critical:** Availability, Medical centre, Dressing room, Dynamics, Player file, Development and Academy & pathway overlap without a stable Squad family navigation.
- **Dossier / High:** Identity, history, growth and attributes lack a direct selection recommendation, availability state or next action. Profile plot and attribute panels duplicate numbers without a clear takeaway.
- **Registration / High:** Long explanatory prose precedes key state. Shirt-number controls with 99 options create repetitive height. Current list, pending changes and history are not clearly separated.
- **Development / High:** Repeated caveats and overlapping Ready, headroom and progress panels bury comparison; there is no unified filtering/sorting model.
- **Medical/dynamics / High-Medium:** Return date, risk, selection-safe state, morale/friction and intervention actions are not dominant enough.
- **Visual consistency / Medium:** Newer cc surfaces and older sq/org/kit/dv/dyn surfaces feel like different products.

**IA and navigation.** Create a consistent Squad hub with team/season context and sub-navigation: Roster, Player stats, Availability, Registration, Development and Dynamics. Player context should persist across roster, dossier, registration, development and medical, with breadcrumbs or contextual links. Medical and dynamics should be related decision views, not competing unlabeled destinations.

**Responsive and mobile concerns.** Default to stacked player cards on mobile, keeping table mode for power users. Make lineup slots a compact horizontal chip row with XI/bench grouping. Keep dossier identity, KPIs and actions in a compact sticky header. Registration needs selected-count/deadline bar and filters for selected, no shirt, conflict and ineligible. Development needs list mode, search, sort and a sticky summary. Medical/dynamics should prioritize urgent groups, with relationship and diary content collapsed.

**Pagination, list density and future-state layout.** Use grouped roster views with visible `N shown`; do not paginate active XI. Add page size and sortable columns to stats. Keep selected registration players pinned while progressively revealing the unselected queue. Development should use ranked views with 6–12 visible rows/cards and Show all. Do not paginate urgent medical items; collapse or paginate the full background list.

Future roster layout: summary rail for formation, XI, unavailable and next fixture; formation/bench strip; searchable roster with sticky player identity and one action column; rules in a collapsible footer. Future dossier: portrait/identity/availability hero, KPI rail for ability/potential/value/condition/role fit, attributes and role fit beside selection history/development/medical timeline. Future registration: competition/deadline/validation command header, pinned selected list, searchable queue and inline conflicts.

**Priority.** **Critical:** Establish shared Squad IA and redesign roster/registration mobile presentation. **High:** Make unavailable, return date, low condition, morale/friction, registration validation and development readiness dominant. **Medium:** Normalize office surfaces and table ergonomics.

### 5.3 Tactics, preparation, matchday, live match and Season Book

**Baseline note.** The Tactics route already received the previously implemented shell/workspace/navigation restoration. This audit treats that restored route as the current baseline. It does not propose undoing or redoing the restoration; it identifies remaining visual, information-architecture and responsive opportunities across Tactics and its connected preparation/matchday journey.

**Strengths.** The tactics workspace has an authentic model: Team Shape, Team Instructions and Player Instructions, phase switching, formation summary, familiarity/intensity meters and review warnings. The pitch visualizer makes intent concrete through shirts, roles, arrows and selectable markers. Preparation has a strong ritual — opposition XI, assistant advice, briefing feedback, official team sheet and broadcast preview. The match tunnel gives progression a visible eight-step spine. Live match prioritizes score, pitch, playback and touchline deck, while post-match evidence distinguishes observed, calculated and estimated interpretation. Season Book covers a broad archive.

**Observed problems**

- **Canonical destination / Critical:** Board-room tactics and matchday preparation use different visual systems and overlapping concepts. Clarify long-term tactic design versus fixture-specific preparation.
- **Tactics workspace / High:** Header metrics, phase buttons, controls, pitch, legend, quick actions, squad, player editor, opposition and leadership create one crowded continuous surface.
- **Scope / High:** Team, zone and player instruction scopes are not explicit enough; codes such as CB-At and NNCB-De are efficient for experts but opaque to newcomers.
- **Mobile selection / Critical:** Fixed-width tables, hidden Avg, truncated selects and tiny labels make safe comparison/editing difficult. Too many peer actions precede the main decision.
- **Match presentation / High:** Score, pitches, officials, official sheet, news, player grids and talks can bury the primary action beneath atmosphere.
- **Live match / High:** The desktop television composition risks an undersized pitch and crowded controls on mobile.
- **Terminology / Medium:** Team Selection, Briefing, Team News, Dressing Room, Broadcast, Submit Team, Go to Match and Go to Pitch are not fully normalized.
- **Season Book / High-Medium:** It is sparse and paragraph-led; standings are not aligned tables and records lack archive index, year, competition, search and filters.

**IA and navigation.** Retain the restored shell/workspace/navigation baseline, but define a canonical tactics model with Shape, Team Instructions and Players. Put opposition and leadership in a secondary Match Context drawer. Preparation should use a five-step rail: Plan, Select XI, Review, Team News, Kickoff. Match presentation should share one stage naming system and one primary CTA pattern. Season Book needs its own archive index rather than behaving like a long nested page.

**Responsive and mobile concerns.** Use a sticky summary with formation, mentality, readiness and unresolved warnings. Make pitch, selected-player assignment and squad collapsible. Team/player instructions should open as full-screen subviews with phase and scope in the header. On mobile, show line-grouped starters, a collapsed bench and a bottom-sheet role/duty/condition editor. Live match should default the touchline tray closed and expose one Tactical desk action. At very narrow widths, order broadcast explicitly as score/date, home XI, away XI, officials, Kick off.

**Pagination, list density and future-state layout.** Add a searchable saved-tactics library, squad search/filter and a selection checklist for unresolved items. Match reports should have Overview, Timeline, Shots, Tactical execution, Players and Opposition tabs with a pinned result. Season records need year/season, competition, record-type and player filters; long histories should be grouped and paged or incrementally loaded.

**Priority.** **Critical:** Clarify canonical tactics IA and make mobile selection/match progression decision-safe. **High:** Reduce density through sticky summaries and progressive disclosure; replace Season Book paragraph streams with structured archive views. **Medium:** Normalize terminology, statuses, type and mobile table behavior.

### 5.4 Training, Staff, Boardroom, Scouting, Transfers, Contracts and Finance

**Strengths.** Training's Match ready, Building, In recovery and Next session model gives the manager an immediate read; weakest-first ordering is strong decision support. Staff exposes accountability, targets, ratings, work history, contracts and renewal context. Scouting has the strongest information architecture in this group: rich filters, result count, sort hooks, shortlist, role fit, grade, radar, dossier, market and contract context. Transfers use a distinctive deal-room story and expose financial anchors. Finance has a sensible summary-to-detail tab structure. Shared responsive rules show meaningful intent.

**Observed problems**

- **IA / Critical:** Training, Staff, Recruitment, Transfers, Contracts and Finance are not one obvious operations taxonomy. Contracts are not a first-class destination and are discovered indirectly.
- **Training / High:** Long mechanics prose competes with schedule/readiness controls; the seven-day strip does not strongly distinguish session, delegation, matchday and recovery.
- **Staff / Critical:** The single-page surface is extremely long, mixing KPIs, approvals, recommendations, vacancies, departments, work logs, renewals, raises and dismissal.
- **Staff / High:** Routine edits and high-risk dismissal sit together in cards without strong action hierarchy. KPI semantics conflate reports, recommendations and approvals.
- **Boardroom / High:** Repeated club articles lack overview, ranking, vacancy count and club filters and visual league context.
- **Scouting / Medium-High:** Powerful filters are crowded; wide results hide decision columns on mobile; dossier modules lack persistent section navigation.
- **Transfers / High-Medium:** A 12-row cap and arrow-only browsing hide history; Arrivals/Departures and world wire scopes are not sufficiently distinct.
- **Finance / Critical:** Period presentation appears static, including a hard-coded-looking October 2026 label in the reviewed presentation. Charts lack clear range, units and a single executive narrative. Budget actions lack impact previews.
- **Visual / Polish:** Repeated small labels, dark borders and similar cards reduce scan speed.

**IA and navigation.** Create an Operations hub with Training, Staff, Recruitment/Scouting, Transfers, Contracts/Renewals and Finance. Staff should have Overview, People, Recruitment pipeline and Reports. Scouting dossier should use anchored Overview, Attributes, Development, Market, Contract and Notes. Transfers should clearly separate My club and World wire. Finance should keep a visible period selector and local navigation.

**Responsive and mobile concerns.** Training readiness rows should become compact cards with Player, status, sharpness and fitness first. Staff needs sticky section navigation or a one-open-section accordion. Boardroom needs club/nation/vacancy filters before the list. Scouting should pin identity and expose grade/value/status without two-dimensional scrolling. Transfers need a clear From → To route and amount/status above the fold. Finance should move budget rail above charts and provide chart table summaries. Contracts need an expiry queue, especially on mobile.

**Pagination, list density and future-state layout.** Use filters and segmented rendering for Training. Keep latest staff work visible and move full logs to drawers. Replace Boardroom card stacks with a searchable, sortable table and selected-club detail. Add visible ranges and saved views to Scouting. Replace transfer serial browsing with pagination or Load more. Build Contracts as a 30/60/90-day expiry queue. Finance needs period selectors and table/detail views for charts and long breakdowns.

**Priority.** **Critical:** Create Operations IA, make Contracts/Renewals first-class, break Staff into navigable sections and correct finance period presentation. **High:** Scale filtering, pagination and responsive rows/cards; clarify transfer scope and executive summaries. **Medium:** Reduce explanatory copy and add purpose-specific visuals such as readiness timelines, transfer routes, expiry runways and cash runways.

### 5.5 Competitions, fixtures, league intelligence, Atlas, clubs and managers

**Strengths.** Competition Centre has a convincing federation-room identity and useful table context. Fixtures expose an explicit Enter/Resume matchday action. Football Intelligence offers a reusable category/search/result/dossier pattern. World Guide and Atlas turn football geography into navigable context. Club Profile has one of the strongest dossier hierarchies, and Manager Profile adds a valuable human layer. Tables are generally more mature than repeated paragraph lists; focus and semantic states are present.

**Observed problems**

- **World IA / Critical:** Competition Centre, Football Intelligence, World Guide, Atlas and direct dossiers lack one persistent context trail. Country, competition, club and manager relationships are easy to lose.
- **Competition / High:** League table, Player stats, Cups, Fixtures, Dugouts, Trophy room and Season Book are peer tabs despite serving different purposes.
- **Fixtures / High:** A sorted paragraph list lacks round/month grouping, filters, current-matchday spotlight and pagination.
- **Stats / High:** Player stats lacks search, position/club/minimum appearances filters and result count; up to 120 rows is too much browsing.
- **Dossiers / High:** Sliced results do not disclose completeness or offer Load more.
- **Atlas / Medium:** Fixed SVG map, small labels and no equivalent text list make mobile and precision access difficult.
- **Profiles / Medium:** Club and manager dossiers mix current actions with archive material and lack consistent tabs/priority.
- **Visual / Polish:** Blue operations, green guide and passport treatments need shared link, badge, typography and contrast tokens.

**IA and navigation.** Use a shared breadcrumb such as Intelligence > Country > Competition and related-entity links. Competition primary views should be Table, Fixtures, Leaders and Cups; Dugouts, Trophy room and Season Book belong in an overflow Records group. The World Guide should be the hub for Continent > Country > Settlement > Club. Club and manager dossiers should share hero, KPI, action rail and archive patterns.

**Responsive and mobile concerns.** Keep league tables as deliberate horizontal-scroll surfaces with a sticky toolbar and explanation. Fixtures should be date/round cards. Player stats should become ranked cards. Dossier category pills need counts and clear-search. Atlas requires a Browse countries list or select below the map and larger region hit areas. Club and manager heroes should precede secondary history; manager history should show a recent slice and filters.

**Pagination, list density and future-state layout.** Group Fixtures by round/month and offer Upcoming, Results and All. Show 25 Player stats rows at a time with filters and result counts. Every sliced Football Intelligence category needs `Showing x–y of N` and Load more. Atlas needs browse parity rather than pagination. Competition history should use season navigation.

**Priority.** **Critical:** Establish shared world-intelligence navigation and breadcrumbs. **High:** Re-architect Competition tabs, fixture browsing and database result continuation; make Atlas usable without map precision. **Medium:** Separate overview from history and improve scope/legend/filter comprehension.

### 5.6 News/social, supporters, district, community, contacts and household

**Strengths.** The off-pitch world has a strong authored voice: datelines, districts, desks, community ground, Founders' notebook and social spaces. Meridian Wire has a recognizable editorial hierarchy. Terrace has good composer, account, quota, reply and pressed-state affordances. District life communicates place, time, wallet, energy and trust. Contacts makes social progression visible through reputation, introduction paths and outcome history. Household distinguishes private life and provides relationship, trust, reserve and journal structure. Responsive controls, focus and reduced motion are good foundations.

**Observed problems**

- **Wire / High:** Terrace, For you, Local, World and My feed scopes are not clearly related; My feed changes from feed to settings/control semantics.
- **Feed / High:** Repeated story cards and a standings rail create equal-weight vertical density. Read/react actions are mixed with Continue in game actions.
- **Terrace / High:** Nested replies and trial calls create tall surfaces; threads should default closed.
- **District / High:** Transport, work, practice, people, navigation and diary form one stack without a clear essential-versus-optional action hierarchy.
- **Beyond matchday / High:** Distinct narrative systems lack an active commitments/deadlines strip.
- **People / High:** Log-heavy records lack status filters, counts, due dates and grouping.
- **Household / Critical:** Relationship, money, circle, family and an 80-entry album read like an admin ledger. Sensitive encounter choices are dense and require stronger consent/consequence framing.
- **Accessibility / Medium:** Generated portrait labels are not person-specific; status and topic color need text/icon redundancy.

**IA and navigation.** Use stable social scopes: Wire, Terrace, Local, World and My feed, with My feed remaining a feed. District should have a location hero, HUD, Today at this place action rail, active commitments, opportunities, travel and recent diary. People should separate Encounter log, Promises, Contacts and Introductions. Household should use Relationship, Money, Circle, Family and Journal sections, with a single recommended action.

**Responsive and mobile concerns.** Add Stories/Table watch switching on mobile. Collapse Terrace threads by default and make reply composition contextual. Keep district action rail near the HUD. Household needs pinned relationship/reserve summary and section tabs or accordions. Test 320–375px with long names, money and relationship choices; full-width actions are safer than ambiguous wrapping.

**Pagination, list density and future-state layout.** Add older-edition controls to Wire, day separators and More from this week to Terrace. Expose Recent versus Archive for diary, album and contact histories. Add People filters for status, due date, place and encounter type. Add Contacts search by name, organization, nation and contact kind. Reuse club-people search/filter/empty-state patterns without importing its desktop density.

**Priority.** **Critical:** Reframe household encounter choices with explicit consent/consequence hierarchy. **High:** Normalize social scopes, reduce vertical density, surface commitments/deadlines and add People/Contacts discovery. **Medium:** Improve metadata contrast, labels and story-type variation.

### 5.7 Profile, accounts, founding, licensing, governance, succession and legacy

**Strengths.** Manager Profile has a convincing portrait-led identity and career archive. Club Profile is an excellent dossier reference with cover, KPI strip, facts, ground, honours, league snapshot, squad and story. Founding exposes windows, reserves, fee, draft and status. Licensing at least names ground, arrears, funds and governance evidence. Succession protects the club/world versus manager/household boundary. Legacy gives retirement and later life a memorable career-journal frame. Shared CSS supports focus, reduced motion, auto-fit grids and readable line-height.

**Observed problems**

- **Governance / Critical:** Board, FA governance record, founding, hearing and boardroom are fragmented; there is no single answer to who governs, what is pending, what evidence is missing and which deadline is next.
- **Manager profile / High:** Current chapter, next step, licence/application state and actionable status are buried below polished identity and prose.
- **History / High:** Biography, media, private archive and press details repeat concepts; capped history needs years/seasons, event filters, search and counts.
- **Enterprise / High:** Equal investment cards do not distinguish available, active, locked, maturing and unavailable money; there is no transaction/holding timeline.
- **Founding/licensing / High:** Similar language hides radically different states. Concatenated blockers are hard to scan; evidence and deadlines need checklists and state badges.
- **FA cases / High:** Licence, appeal, fine and disciplinary evidence are prose-heavy case sections.
- **Succession / High:** Former-club cards and player whereabouts create long pages; handover action competes with history.
- **Legacy / High:** Resign/retire/mortality are agenda-like cards rather than distinct consequence and confirmation surfaces.
- **Visual / Medium:** Manager and club profile grammars differ; labels such as Personal file, The dugout and Beyond the dugout need plain-language companions.

**IA and navigation.** Create an Association/Governance hub with a dependency rail: Founding registration, Club licence, League entry. Use separate Current licence, Applications/appeals and Disciplinary views. Give Manager Profile shared hero, KPI and segmented navigation: Overview, Career timeline, Personal life, Finances and Public record. Succession should use a handover hero and timeline. Legacy should distinguish active wellbeing, retirement endpoint and optional later-life chapter.

**Responsive and mobile concerns.** Stack portrait, identity, role/status and club/nation in the profile hero; keep switcher and segmented navigation close. Use one timeline row per history event with year separators. Enterprise mobile should lead with active money, holdings strip and one-column opportunities. Founding/licensing should put state, deadline and primary action above prose; blockers become pass/fail rows. FA cases need compact headers and collapsed evidence. Succession needs current handover first and collapsed player whereabouts. Retirement confirmation must fit within a readable viewport with bullet consequences.

**Pagination, list density and future-state layout.** Add year/season jump, event filters, search and `N of M` to manager history. Use indexed conference lists and on-demand transcripts. Filter former clubs by spell and year. Add Current/Pending/Appealable/Resolved/Disciplinary filters to FA records. Add recent transactions and maturity history to enterprise. Governance minutes need season/date filtering and latest unresolved mandate emphasis.

**Priority.** **Critical:** Consolidate governance, founding, licensing and league entry. **High:** Rework history, cases and succession as indexed timelines; standardize consequential-action preflight; turn enterprise into holdings plus ledger; normalize manager/club dossiers. **Medium:** Replace status paragraphs with checklists/badges and define mobile hierarchy.

## 6. Cross-game patterns

### What consistently works

1. **Contextual action.** The best screens answer "what should I do next?" through Continue, response, selection, booking, readiness, match progression, transfer and career deadlines.
2. **Football visualization.** Pitches, shirts, score strips, official documents, broadcast scenes, scouting radars and transfer routes make complex simulation state legible and memorable.
3. **Summary before evidence.** KPI rails, status cards, compact headers and dossier heroes work when they lead into detail.
4. **Protected system depth.** Details, drawers and expandable modules allow the game to retain depth without placing every explanation in the first viewport.
5. **Game tone.** The world feels authored when place, role, consequence, time and identity appear together.

### What consistently harms usability

1. Long single-page surfaces and equal-weight card stacks.
2. Duplicated navigation and unclear destination versus embedded module boundaries.
3. Prose used as the primary carrier of deadlines, blockers, eligibility and state.
4. Tables that are technically responsive but not decision-safe on phones.
5. Silent truncation, capped arrays and serial arrow browsing.
6. Tiny labels, low-contrast copy and color-only statuses.
7. High-consequence actions adjacent to routine actions.
8. Inconsistent terms for the same domain concept.

### Modern futuristic-but-usable football-management direction

Aim for a **managerial command system**, not a sci-fi ornament layer. Keep the dark clubhouse foundation, but make it feel more contemporary through a restrained "match intelligence" treatment:

- Use luminous lime/ice accents only for state, focus and next action; avoid neon decoration everywhere.
- Build screens from large aligned zones: context bar, decision rail, evidence workspace, history/archive.
- Use live-looking but calm status treatments: deadline counters, readiness bars, route lines, form strips and season markers.
- Make football-specific objects the visual language: pitch topology for tactics, squad bars for readiness, transfer routes for deals, timelines for careers, cash runway for finance, map/list parity for world intelligence.
- Use progressive disclosure and stable local navigation so depth feels powerful rather than crowded.
- Preserve editorial and cinematic scenes, but anchor them with explicit score/date/status/action structure.
- Favor "one decisive action, several inspectable consequences" over a wall of equally available controls.

## 7. Prioritized roadmap

### Foundation

- Establish shared tokens for type, spacing, surfaces, borders, focus, statuses, buttons, deadlines and numeric alignment.
- Define a common status vocabulary and anatomy: state, evidence, deadline/countdown, next action.
- Create shared responsive primitives for filters, tables, entity cards, timelines, score strips, pitches, drawers and mobile action bars.
- Normalize breadcrumbs, local tabs, entity links, empty/loading/error states and result counts.

### Global navigation

- Reduce sidebar overload while preserving functionality behind expandable Football and Life groups.
- Make Today, Inbox, Calendar and Continue the daily loop.
- Add stable local navigation to Squad, Operations, World Intelligence, Life and Association/Governance.
- Clarify destination screens versus embedded modules and archive/reference views.

### Football operations

- Create shared Squad IA and persistent player context.
- Make Operations a first-class family with Training, Staff, Scouting/Recruitment, Transfers, Contracts and Finance.
- Add Contracts/Renewals as a discoverable queue.
- Turn Staff into Overview, People, Recruitment pipeline and Reports.
- Create visual decision summaries for readiness, board pressure, transfer routes, contract expiry and finance runway.

### Tactics and matchday

- Keep the restored Tactics shell/workspace/navigation as the baseline.
- Clarify long-term tactic design versus fixture preparation.
- Add explicit team/zone/player scope and plain-language role explanations.
- Make mobile selection and match progression safe with sticky summaries, larger editors and collapsed secondary panels.
- Give Season Book an archive index and structured season tables.

### Career and life

- Reframe Home as a command center.
- Add a shared commitment/deadline model across Calendar, Inbox, planner, district, household and career governance.
- Build Association/Governance as the visible home for founding, licence, league entry, board obligations and discipline.
- Separate household relationship, money, circle, family and journal; use explicit consent/consequence framing.
- Use indexed career timelines for profiles, succession and legacy.

### Mobile

- Treat mobile as prioritization, not desktop stacking.
- Keep title/context, primary action and key state in the first viewport.
- Use full-width high-consequence actions, bottom sheets, drawers, accordions and deliberate card/table modes.
- Preserve safe-area space, focus visibility and sticky-control visibility.
- Test 320–375px for long labels, money, names, statuses and relationship choices.

### Pagination and tables

- Disclose every cap with ranges and total counts where known.
- Add filters, sort summaries, Load more or pagination to Inbox, stats, intelligence, fixtures, transfers, histories, contracts and archives.
- Prefer grouped/ranked views before pagination; do not paginate urgent queues or active XI selection.
- Standardize responsive tables: sticky identity, priority columns, expandable details and explicit scroll/stack mode.

### Motion, feedback, accessibility and game feel

- Preserve reduced-motion and focus-visible foundations.
- Add motion only to explain state changes: Continue readiness, new mail, selected player, deadline transition, match event and route progression.
- Pair color with text, icons, patterns or labels in every important status.
- Keep chart/table alternatives and visible explanations for observed, calculated and estimated evidence.
- Use confirmation and preflight patterns for resign, retire, dismiss, submit, appeal, pay and budget actions.
- Reinforce time, place, consequence and next commitment as the game's signature feedback loop.

## 8. Concise severity matrix

| Severity | Meaning | Representative findings |
|---|---|---|
| Critical | Cross-screen IA, safety or orientation issue that can obscure the next decision or create serious ambiguity | Home lacks a dominant next decision; Inbox urgency is hard to scan; operations and governance lack coherent hubs; tactics/mobile selection can be decision-unsafe; household sensitive choices need consent/consequence framing; finance period presentation appears stale/static |
| High | Major density, discoverability, responsive or data-comprehension problem that materially slows common use | Sidebar overload; wide squad/registration tables; calendar navigation; Staff single page; transfer 12-row cap; world-intelligence truncation; long career and district/household stacks |
| Medium | Important consistency, accessibility, taxonomy or efficiency improvement | Search/type chips; filter summaries; legends; breadcrumbs; terminology; mobile back controls; explicit result counts; contrast and touch-target refinement |
| Polish | Refinement that improves cohesion, tone or perceived quality after structural issues are addressed | Card/radius normalization; hero whitespace; editorial/archive alignment; richer story-type treatments; numeric alignment |

## 9. Limitations

This report is based solely on the seven supplied structured reviews. No failed review groups were reported. No screenshots, live browser observations, source-code reinspection or additional product behavior were used beyond what the reviews explicitly described. Recommendations therefore describe observed patterns and advisory future-state direction; they do not claim new implementation work or altered functionality.

---

## 10. Cross-check against the measurements (added by this workspace)

The supplied audit is qualitative. Here is where our own numbers agree, disagree, or add detail.
Nothing below changes the advisory text above; it calibrates it.

| Supplied finding | Our measurement | Verdict |
|---|---|---|
| "Long single-page surfaces" | `social` **13.39×** a phone viewport (11.52× desktop), `staff` **9.13×** | Agreed, and worse than "long" suggests |
| "Inbox is an unbounded stream" | 150 controls at 1440 on a real career (71 when empty) | Agreed; 150 is the number to design against |
| "Silent result caps" | Every capped array we measured had no range text | Agreed |
| "Tiny labels, 8–12px utility copy" | Sweep minimum **7 px**, widespread 8–10 px metadata | Agreed; Phase 0 sets an 11 px floor |
| "Tables not decision-safe on phones" | 4 tables overflowed at 390/768/1440; after Step B only `league` still does at 390 | Partly fixed; contract still needed |
| "Sidebar overload" | 26 destinations in the rail, **35** reachable ids in the shell | Agreed |
| "Headers compete" | Bar was 457 px wide on a 390 px screen; title width 0 | Fixed in Step B |
| "Color-only statuses" | 0 contrast failures remain after Step B, but colour still carries state in chips | Agreed — needs the status contract |
| "Mobile stacks desktop content" | 207 of 208 phone states still scroll a nested container | Agreed |
