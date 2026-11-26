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

## 9. Phase 3 close

| FM26 pattern | Touchline now | Beyond FM26 |
|---|---|---|
| Registration list with the filed XI visible | The list opens with the chosen players in shirt order, the gaps by name, and a conflict line for players filed elsewhere | The conflict line names the players and says why they cannot appear, and the row below repeats it with a disabled select, so the reason is never a mystery |
| Medical urgency first | Training readiness is grouped In recovery, Needs work, Building, Match ready, each with a count, and an injured player states the return date | The group order matches what stops a selection, so the top of the list is the first decision |

## 10. Phase 4, first pass: contracts

| FM26 pattern | Touchline now | Beyond FM26 |
|---|---|---|
| A contracts panel that lists expiring deals and opens a renewal | A queue grouped by the 90-day rule with a count per group, the days left, the wage and a status chip that repeats the rule in words, above it the four facts a decision needs | The queue names the next player as a command (`Start with Kofi Vico · 18 days left`) instead of leaving the manager to read eleven rows, and the row, the command and the contract desk on the player file are one path |
| Renewal talks with an agent across a table | The desk states the wage, the expiry, the agent, up to four packages with a breakdown of wage, bonus, fee and full term cost, and answers in two days | The desk sits inside the player's own file rather than in a separate negotiation screen, so the role fit, the form and the cost are read together before a proposal is sent |
| A mobile view of a dense financial table | One card per player at 390 px: name and position, then labelled expiry, days left, wage and status; no sideways scroll and no hidden column | The card keeps the 90-day grouping visible, so the reason a player is on the screen is never lost on a phone |

## 11. Phase 4, second pass: the backroom

| FM26 pattern | Touchline now | Beyond FM26 |
|---|---|---|
| A staff screen split into responsibilities, appointments, recruitment and reports | Four views behind one nav with counts, each answering one question: what needs me, who do I have, who can I appoint, what was delivered | The landing view states "Nothing needs you" in words when no decision is waiting, instead of leaving an empty queue to be read as missing data |
| Staff list beside a detail panel | People pairs a roster row per appointment with one panel for the selected member: responsibility, monthly target, latest delivery, contract state and the decisions | The rating is repeated as a chip in the roster and with its score in the panel, so comparison happens in the list and judgement in the panel |
| A recruitment market with prepared deals | Recruitment holds the signature queue, the scouting reports and one row per open position, with a hiring panel naming both candidates, their wage and the fee | The screen states that no proposal joins a player until the manager signs, and that there is no cap on appointments |
| Mobile: one long administrative page | Phone fold 9.13 to 1.54 at 390 px, 0 sideways scroll, 44 px controls | The nav hides its counts at 390 px so all four views stay one tap apart rather than two scrolls apart |

## 12. Phase 4, third pass: the scouting board

| FM26 pattern | Touchline now | Beyond FM26 |
|---|---|---|
| A scouting list with a visible result count and paging | 25 a page with "Showing 26 to 50 of 366 players", "Page 2 of 15" and Prev/Next at both ends of the table; every filter, sort, reset and saved view returns to page 1 | The range is written twice, above the rows and under them, so a manager who has read to the bottom does not scroll up to find out where they are |
| A player card that keeps the decision facts on screen | A sticky identity bar carrying grade, role fit, value and status, pinned under the shell header at every width; 145 px on a desktop, 172 px on a phone | Status is phrased in the manager's terms — `With your squad`, `Shortlisted`, `Registered`, `Available` — rather than as a raw flag |
| Saved shortlists and filters | Six named views, defaulting to `Nation · Position`, stored per career and restored after a reload | A view holds the whole filter set, so reopening one is one tap, and a chip can be forgotten without leaving the board |
| A shortlist column in the list itself | A `Status` column repeats the four states in the table and on the phone card | The row and the file now say the same thing in the same words, so the list can be triaged without opening a player |

## 13. Phase 4, fourth pass: the boardroom

| FM26 pattern | Touchline now | Beyond FM26 |
|---|---|---|
| A boardroom with an ownership register | A register table sorted by stake value, with holder, seat, share, stake and dividends, and a live search that states `Showing 1 of 4 holders` | The selected row opens a pane with that holder's dividends, proposed payout and the buy-back price, so the decision is made on the register, not below it |
| A board of directors you can approach | A candidates table with what each one wants and their status (`Open to talk`, `Offer sent`, `Declined`) | The pane carries one candidate's four structures as priced buttons, and a declined candidate keeps the note that a different structure may still open the conversation |
| A record of decisions | Minutes as a table: when, motion, `3 for · 2 against` | A motion with no vote taken says so, rather than showing an empty list |
| Mobile: the same register | Phone cards with `Share`, `Stake` and `Dividends` labelled and the seat right-aligned; 0 sideways scroll | Selection is kept in desk state, so scrolling away and back does not lose the holder you were reading |

## 14. Phase 4, fifth pass: the transfer centre

| FM26 pattern | Touchline now | Beyond FM26 |
|---|---|---|
| Transfer activity split into your club and the rest of the market | Two scopes, `My club` and `World wire`, each with its own count; arrivals and departures are sub-tabs inside your club only | The scope is remembered with the page and the selected deal, so a reload returns to the same wire |
| A deal described as a route between clubs | `From Unattached → To Kay FC` with an arrow between the shields, and `Unattached → Kay FC` written on every row | On a phone, where two shields collapse to initials, the written route replaces them rather than stacking two boxes |
| An amateur invitation, which is not a transfer | `Unattached → Kay FC`, because that is the squad he is in, with `Terms: Amateur · no contract` on the card | Neither end invents a place: the from end is where he came from, the far end is the club whose roster he is on, and the terms say why there is no fee |
| A list you can page through | Twelve a page with `Showing 1 to 12 of 17 deals`, `Page 1 of 2` and Previous/Next at head and foot | The deal card follows the page — `Deal 13 of 17` is the first row of page two — instead of being steered by arrows |
| Rows that name the player and the money | Name, fee, route and status on every row; every "Unnamed player" is gone | The same row shape carries arrivals, departures and world moves, so the list reads the same in both scopes |
