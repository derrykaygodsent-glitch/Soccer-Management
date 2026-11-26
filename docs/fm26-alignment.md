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
