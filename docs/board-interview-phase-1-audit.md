# Board Interview Experience — Phase 1 Audit

**Status:** Source/data-flow audit completed; exact browser discrepancy is not yet reproduced. No application or gameplay code was changed during this phase. The saved delivery plan is `docs/board-interview-experience-plan.md`.

## Findings

### 1. Two separate events currently read as one

Applying for a job in `src/manager-life.js` schedules two different plans against the same application:

- `application` is queued for two days later. When it resolves successfully, it sets `s.interview` / `s.interviewQueue` and mails an “Interview invitation: the board wants to hear…” message.
- `pressConference` is queued for one day later. It calls `TLPress.open(..., 'appointment', ...)`, which creates a journalist-led media event titled **Managerial application**.

That appointment conference has three journalist questions (`application`, `project`, `focus`) and journalist response options. Its attendance and transcript use reporter identities. It is not the club board’s interview invitation, despite its title and interview-like presentation. This is the central product/routing mismatch behind the user’s expectation.

### 2. The actual board interview exists, but is only a minimal generic form

The board interview lifecycle is in `src/manager-life.js`:

- Active interview is stored as `s.interview` (club name); queued interviews are stored in `s.interviewQueue`.
- `answer` accepts the existing priority/motivation values, schedules a board decision, records an application response, and advances to the next queued interview.
- The success chance and feedback are already calculated by `interviewChance` and `interviewFeedback`.
- `withdrawApplication` removes matching interview/queue state and withdraws its related appointment conference.

The current dedicated `career-guide.boardInterview(s)` view is routed through `careerDesk()` when `s.interview` is active, and the form submit handler calls the established `change('answer', ...)` action. But the view has one generic question, two select fields, no attendees, no named questioner, no per-question transcript/reaction, and no interview progress. There is also no member-level board roster in the vacancy data: `TLTechnical.office` returns the vacancy’s coach, budget, target, nation, and club; the visible board identity is currently a club-level label such as “Elected directors,” not a set of named interviewers.

### 3. The screenshot’s press-room route is not the board-interview route

The Inbox press-room view is selected by `organiser.pressView === 'room'` and renders `TLPress.conferencePanel(s, c)`. The appointment conference has `status: 'invited'`, a three-question queue, and journalist IDs. The Inbox board-interview CTA separately routes to `interviewDesk`; it does not select the appointment conference.

The current `conferencePanel` source includes a reporter attendance list, an attributed current question, response options, an optional comment, transcript entries, and response relationship data. A read-only end-to-end Node reproduction through `TLOfficeOrganiser.inbox(s, {pressView:'room', pressId})` with an `appointment` conference in `conversation` mode produced the Inbox press room, all three journalist attendees, `QUESTION 1 / 3`, the current reporter, and “Choose your response.” The source CSS has no rule hiding `.media-current-question`; the conversation mode changes hero height and response layout only. The reproduction contains no board-member panel, as expected for this reporter-led event.

Therefore the screenshot’s missing question/attendee content is **not explained by the current source renderer or a matching synthetic state**. The precise runtime cause remains open: we do not yet have the screenshot’s saved career state or live DOM to establish whether it is a stale built/service-worker bundle, a different view/state branch, or a rendering/layout issue. Reproduce against the exact saved career and live preview before modifying the press renderer. The screenshot’s visible “Use press-room view” button indicates the compact conversation mode, but current source still renders the question in that mode.

### 4. Current Inbox message/decision routes

- A press-conference request is classified as an Inbox message and its active request opens the focused Inbox conference room.
- A board “Interview invitation” is classified as a board-interview task; the “Attend board interview” CTA checks `s.interview` against the invitation sender and opens `interviewDesk`.
- `career-guide.decision` treats `s.interview`/queue as a blocking board decision; press requests are independently directed to `inbox`.

This routing separation is sound in principle, but the appointment press message titled “Managerial application” currently looks like the board appointment itself. The actual board interview screen also needs a real panel/question/answer/reaction experience.

## Phase 1 test inventory and gaps

Existing tests in `test/job-market.test.cjs`, `test/career-guide.test.cjs`, `test/media-conference.test.cjs`, and `test/football-press.test.cjs` cover application scheduling, appointment question generation, board answer/chance lifecycle, the Inbox board CTA, and journalist conference responses. Current board-interview regression coverage only asserts generic question/answer controls and absence of vacancy-market markup. It does not test a board panel, question attribution, reactions, a multi-question transcript, or save/reload stability for an in-progress board interview.

## Recommended Phase 2/3 implementation boundary

1. Keep the appointment-rumour press event explicitly journalist-led; fix the “Managerial application” naming/entry copy so it cannot be mistaken for a board interview. Keep its questions and answers in the Inbox press room.
2. Build the real board-panel experience on the existing `s.interview` / `s.interviewQueue` / `answer` lifecycle. Give it stable role-based attendees until actual board member entities exist; do not fabricate purportedly named board members.
3. Decide and document whether a question queue and reactions belong in a new interview record or can safely extend current application response data. Keep it serializable and reload-safe; preserve current outcome calculations unless separately authorized.
4. Add an end-to-end route test distinguishing the two events and a browser-level check for the screenshot discrepancy before changing conference-room CSS or state handling.

## Follow-up defect found during manual use

The user reported that the interview stayed on the last question, with progress shown as “4/2,” until they withdrew. The Continue handler had appended and cleared the last response before calling the completion action; completion therefore rejected the missing current response and left the interview active. Progression is now centralized in `advanceBoardInterview`: intermediate answers are consumed and advance the step, while the final response is retained until `completeBoardInterview` records it and invokes the existing board evaluation exactly once. Existing saves containing a final answer duplicated in the response list are repaired on resume, retaining the first final answer. Regressions exercise the final step, save/restore recovery, one transcript entry, and queued-invitation advancement.

## Phase 1 exit status

The source-level flow and data inventory are mapped, and a focused implementation boundary is established. Phase 1 is **not fully closed** because the exact screenshot DOM/state mismatch cannot be diagnosed from repository state alone. The next diagnostic step is to inspect/reproduce the screenshot against the same live build/save, then attach the concrete state/DOM finding here. No calibration results were inspected or used.
