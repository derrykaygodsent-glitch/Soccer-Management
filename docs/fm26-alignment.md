# Alignment with Football Manager 26

The rebuild is judged against one competitor. If a manager who knows FM26 sits down at Touchline,
the shape of the game should feel familiar even where the football is different. This page records
what FM26 actually does, where we already match it, and where we do not.

Sources read on 25 November 2026:

- FMScout, "Football Manager 26: Reimagined User Interface" (11 September 2025)
  https://www.fmscout.com/a-fm26-reimagined-ui.html
- Recharge, "FM26: Release Date, New Features and Gameplay Guide"
  https://www.recharge.com/blog/en-ca/ca/fm26-release-date-new-features-gameplay-guide
- Sportsdunia, "Football Manager 26 New Features"
  https://www.sportsdunia.com/esports/football-manager-26-new-features

## 1. What FM26 changed

| FM26 behaviour | Detail from the sources |
|---|---|
| Navigation moved to the top | The long standing left sidebar is gone. A horizontal top navigation bar gives direct access to each area. |
| The Portal replaced the Inbox | One hub holds messages, news, upcoming fixtures and the club's critical information. |
| Tiles and cards | Screens are built from tiles and cards instead of dense nested menus. |
| Top navigation | Sections sit along the top of the screen and open a panel; the old left rail is now a drawer. |
| Bookmarks | A pin strip holds the screens a manager uses most, and every screen head can pin itself. |
| Bookmarks | A manager can pin the screens they use most and reach them in one click. |
| FMPedia in search | Searching also surfaces guides and help, not only data rows. |

## 2. Where Touchline already matches

| FM26 behaviour | Touchline now |
|---|---|
| Portal | The Overview screen already carries the decisions due, club KPIs, the fixture list and the league table in one place. The Assistant's notebook adds the staff voice. |
| One dominant next action | Every screen states exactly one primary action (`[data-tl-action="primary"]`, 70 of 70 screens). |
| Mail as a queue, not a list | The Inbox now opens with lanes: Needs response, New, Earlier, each with a count. |
| No hidden rows | Every long list states its range and pages a screenful at a time (0 lists hide rows, was 8 lists and 440 rows). |
| Keyboard reach | Yes. Back and Forward, plus a command palette on `Ctrl` or `Cmd` and `K`. |

## 3. Where Touchline still differs

| Gap | Why it matters | Plan |
|---|---|---|


| No search across everything | FM26 search also reaches help. Our search covers screens only. | Extend the existing search to players, staff, clubs and help pages. |
| Inbox is not yet a Portal | FM26 presents one hub. Ours still separates Overview and Inbox. | Merge the lane summary into the Overview tile board so unread mail is visible without leaving the desk. |

## 4. Rules this page adds to the build

1. No new navigation pattern that FM26 players would not recognise: hubs, a primary action, a breadcrumb, a queue with lanes.
2. Screens stay tile and card based. No new nested menu trees.
3. Every list a manager opens states its size.
4. When a behaviour must differ, it is written down here with the reason.

## 5. Squad family: player page and phone roster

One row per FM26 pattern we copied and one row per thing we added. Evidence is the rendered
frame and the numbers in [`ui-measurements.md` §15](./ui-measurements.md).

| FM26 pattern | Touchline now | Beyond FM26 |
|---|---|---|
| Attributes in three groups (technical, mental, physical) on a 1 to 20 scale | `src/player-intelligence.js` rates every attribute 1 to 20 and `src/scout-centre.js` prints them in named groups, goalkeeping only for keepers | Every row also carries the season trend (+1, -2) and the panel says what each group is for in one sentence |
| Role suitability, with key attributes highlighted | "ROLE FIT" box: each role for the position scored out of 20 from three key attributes, best role marked and named in the heading | The same three attributes are marked in the lists below with a light rail, so the score and the evidence sit on one page. The box also says the score is a training guide and does not change selection |
| Player condition and form | "FORM AND AVAILABILITY" box: place in the last five practice XIs, appearances, minutes, condition, sharpness | Missing numbers print "Not recorded" instead of a zero |
| Sort and choose columns | Any column sorts, columns can be hidden and extra player columns added (`src/table-headings.js`) | The choice survives a reload (`touchline.tables.v1`), so a view saved once opens the same way next time |
| A table on a phone | Card per player: position tag, name, value on one line, position, age, nation and availability underneath. Nothing is dropped | A "Sort by" select and one direction button sit above the cards, because the header row is gone on a phone |

## 6. Phase 3, second pass: tables and comparison

| FM26 pattern | Touchline now | Beyond FM26 |
|---|---|---|
| Compare two players | A COMPARE panel on the player page: one row per measure, two values, chosen from a select | The rows are group averages and the best-role score, so the panel answers "who is better for this job" rather than printing forty numbers. A missing value says "Not recorded" |
| League table with many columns | On a phone each club is three lines: rank, club and points; the seven numbers on one labelled line; form under them | Every number keeps its own label (`GS 12`, `GC 9`), so nothing has to be guessed from column position |
| Registration deadlines and eligibility | The list states `2 players have no number: Nico Koroma, Haru Vico` above the cards, and the window card states the deadline and the cap | The gap is stated by name, not only as a count, so the next action is obvious |

## 7. Phase 3, third pass: a player that follows you

| FM26 pattern | Touchline now | Beyond FM26 |
|---|---|---|
| A selected player stays in context while you browse | The player in focus bar under the screen head on every other screen: name, position, age, nation, best role with score, condition, value. One click to reopen, one to clear | The bar states the two facts that decide a selection (role and condition) instead of repeating the dossier, and it never appears on the player page itself, so nothing is stated twice |
| A squad overview before the list | Five facts above the table: registered, in recovery, no shirt number, outside the XI, thinnest unit | Only facts that need a decision are toned, and the tone uses the palette's attention blue, not a gold or an amber |

## 8. Phase 3, fourth pass: the local hub

| FM26 pattern | Touchline now | Beyond FM26 |
|---|---|---|
| A squad area with its own nav | Four views inside the squad screen: Roster, Availability, Registration, Development. Banner and unit counts stay above the nav | Availability is ordered by what stops a selection (recovery, then condition, then sharpness) and says the order in words, so the first name is the first decision |
| Registration with deadlines and a queue | Each competition list states `15 of 25 selected`, names the players with no number, and offers a search that reports `Showing 3 of 17 players` | The gap is a sentence with names, not a red badge |
