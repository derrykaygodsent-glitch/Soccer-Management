# Board Interview Experience — Delivery Plan

## Current progress

- Phase 1 source/data-flow audit is saved in `docs/board-interview-phase-1-audit.md`. The route mismatch is identified; reproducing the exact blank screenshot against its original save remains open.
- Phases 2–4 implementation is in place: the true board interview has a persisted, role-based three-person panel, two attributed questions, answer reactions, queued-invitation handling, a saved transcript/history, and a separate identity from application-rumour press coverage.
- Automated Phase 5 checks pass: all 375 tests, standalone build, syntax checks, and `git diff --check`. A reported loop on the final answer was fixed: the final response now remains available to the completion action and is recorded once.
- Renderer/lifecycle walkthrough results are saved in `docs/board-interview-visual-walkthrough.md`; browser-level visual inspection remains because this sandbox has no installed browser. Live preview runs on port 4177.
- Vercel project `touchline-26` is connected. No deployment was created: current tested changes are uncommitted, and a Git-based deployment would deploy a remote commit instead. No commit or push was made.
- The confirmatory calibration run remains independent and untouched; no partial outcomes have been analyzed and experiment Phase 3 remains blocked.

## Product decision

A manager’s appointment with a club board is a **board interview**, not a press conference. Board members ask the questions; the manager answers; the board reacts and reaches an outcome. A journalist-led press conference remains a distinct feature in the Inbox. Do not mix board attendees into the journalist room, or route press-conference actions to a separate media desk.

## Scope and guardrails

- Build the complete board-interview experience around the existing application, interview queue, answer, and decision lifecycle wherever possible.
- Enter an active interview from its Inbox invitation into a focused interview view, never the generic job market.
- Persist the interview’s progress and record; handle queued, withdrawn, completed, stale, and reload cases explicitly.
- Keep press-conference requests, active conferences, and press history within the Inbox. Press rooms show journalists; board interviews show board members.
- Do not change gameplay or calibration parameters as part of this UI work. The confirmatory squad-fit run is an independent experiment gate: do not analyze partial results or begin the experiment’s Phase 3 before both shards finish and are validated. UI work may proceed while that run continues, provided it does not alter the experiment or simulation outcomes.

## Phase 1 — Audit and reproduce the current experience

**Goal:** Establish the exact source-to-screen path behind the screenshot and identify why the expected interaction is absent. This phase is read-only apart from this plan and an audit record.

1. Trace the manager application/interview invitation from creation through Inbox classification, opening, click handling, route selection, rendering, answer submission, and post-answer lifecycle.
2. Trace the appointment-type media-conference path separately, including its question data, current room mode, attendance list, answer controls, and history behavior.
3. Reproduce the screenshot state as closely as possible. Inspect the selected conference/interview IDs, state status, cursor, question/answer arrays, mode, and actual rendered DOM. Determine whether the missing content is due to routing, stale compiled output/save data, state shape, a render branch, or styling.
4. Inventory the available board-member/ownership/governance data and what the interview lifecycle already records or evaluates. Identify any missing data needed for trustworthy board attendance, reactions, and outcomes.
5. Record the existing tests and gaps. Do not change simulation or calibration logic.

**Exit criteria:** A concise audit report names the exact route and state causing the screenshot, distinguishes board interview from journalist appointment coverage, maps reusable lifecycle/data, and lists the smallest implementation/test changes for Phases 2–5.

## Phase 2 — Model board attendance, questions, and reactions

**Goal:** Define a stable, context-aware interview record without inventing unsupported facts.

- Use actual board members when available. If the world has no member-level data, provide deterministic role-based panel identities (such as chair, football lead, and finance lead) and label them clearly as roles rather than claiming they are named people in the save.
- Tie the panel and interview to the application, club, role, club target/resources, and manager context. Stable IDs must survive save/reload and must not reshuffle an in-progress interview.
- Create an ordered question queue with one named board member per question. Questions should use available club and manager facts, handle missing data gracefully, and avoid asserting unknown information.
- Define answer options with distinct, understandable intent and map them to the existing board/interview outcome rules. Record which answer was selected and the resulting reaction/outcome; do not imply arbitrary free text is evaluated.
- Keep this model separate from journalist IDs, reporter relationships, and press coverage.

**Exit criteria:** A documented data contract and lifecycle mapping, with deterministic fixtures for single, queued, stale, and restored interviews.

## Phase 3 — Build the focused board-interview room

**Goal:** Make the interview feel like a live board conversation and ensure the correct invitation opens it.

- Inbox invitation action: “Attend board interview”; verify the invitation’s club and active interview ID before entering.
- Focused room: club/role, meeting context, progress, attendance cards with member role/name, one attributed question at a time, and relevant context.
- Clear answer choices; after submission, show the manager’s answer and the questioner’s reaction before offering Continue to the next question.
- End state: show the outcome/status and next step; preserve any existing board decision timing and career consequences.
- No open-vacancy listing, journalist roster, press-room controls, or press-history controls in the board room. Conversely, retain journalist question/answer controls in the Inbox press room.
- Include accessible labels, keyboard operation, responsive layout, safe escaping, and calm empty/stale states.

**Experiment boundary:** This product/UI phase is independent of the squad-fit experiment and may proceed while its confirmatory run continues. Do not inspect or use partial experiment results, alter simulation/calibration parameters, or advance the experiment’s Phase 3 before both shards finish and validate.

## Phase 4 — Persistence, routing, and lifecycle hardening

- Persist interview ID, panel, question order, cursor, answers, reactions, status, and outcome consistently with the existing career save model.
- Ensure returning to or reloading the interview resumes at the same unanswered question without duplicating effects.
- When a queue advances, route to the next actual board interview; when it ends, show the appropriate Inbox/decision path.
- Handle withdrawal, application cancellation, replaced/expired invitations, and missing club/member data without dead ends.
- Keep press requests and press records in the Inbox throughout; validate that completing a press conference cannot route into Careers or a board interview.

## Phase 5 — Regression, acceptance, and release verification

**Automated coverage**

- Inbox invitation opens the matching focused board interview, not `managerJobs`/open vacancies.
- Correct board panel and question attribution; exactly one active question; answer submission, visible reaction, progression, completion, and decision lifecycle.
- Queue advancement, stale/withdrawn invitations, and save/reload stability with no duplicate answers or outcomes.
- Missing optional board data remains safe and clearly labeled.
- Journalist conference continues to show reporter attendance, question, response controls, reactions/history in the Inbox only; no board members appear as reporters.
- Existing Inbox All/New/Tasks/Unread tabs and read/selection behavior remain intact.

**Final checks:** Relevant tests, full `npm test`, `npm run build`, JavaScript syntax checks, `git diff --check`, plus a manual preview walkthrough from Inbox invitation through answer, reaction, reload, and completion. Review the diff to ensure unrelated worktree/calibration files remain untouched. Do not commit or push unless asked.

## Recommended sequencing

Complete Phase 1 as a read-only diagnosis and save its report beside this plan. Implement Phases 2–5 independently of the calibration experiment, preserving all current simulation outcomes. The board-interview and journalist-conference experiences should be tested independently and then together to prevent the two workflows from being conflated again. The experiment’s own Phase 3 remains blocked until its confirmatory shards are complete and validated.
