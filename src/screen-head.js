/* Every destination belongs to one of five hubs and declares one primary action. */
(function (g) {
  'use strict';

  /* 5 hubs · 35 destinations · every id in the old three-group rail is here exactly once. */
  const HUBS = [
    { id: 'today', label: 'Today', items: [
      ['home', 'Overview'], ['inbox', 'Inbox'], ['day', 'Calendar'], ['jobs', 'Job market']] },
    { id: 'squad', label: 'Squad', items: [
      ['squad', 'First team'], ['tactics', 'Tactics'], ['training', 'Training'], ['planner', 'Squad planner'],
      ['dynamics', 'Squad dynamics'], ['medical', 'Medical'], ['development', 'Player development'],
      ['kitOffice', 'Registration & numbers'], ['staff', 'Staff']] },
    { id: 'club', label: 'Club', items: [
      ['fixtures', 'Matches'], ['league', 'Competitions'], ['vision', 'Boardroom'], ['finance', 'Club account'],
      ['club', 'Club profile'], ['transfers', 'Transfers'], ['bids', 'Transfer talks'], ['scouting', 'Scouting'],
      ['intelligence', 'Football intelligence'], ['clubPromises', 'Club promises'],
      ['faOffice', 'Licensing & discipline'], ['create', 'Club founding'], ['succession', 'Career history']] },
    { id: 'world', label: 'World', items: [
      ['district', 'Explore district'], ['neighbourhood', 'Community'], ['people', 'People'],
      ['social', 'News & social'], ['atlas', 'Atlas']] },
    { id: 'life', label: 'Life', items: [
      ['household', 'Household'], ['personal', 'Personal accounts'], ['profile', 'Manager profile'],
      ['legacy', 'Health & legacy']] }
  ];

  /* The one dominant next decision on each screen.
     `do` runs a real command; `go` opens the screen where the decision is made.
     Phase 3 replaces the `go` entries with in-place commands as each screen is rebuilt. */
  const NEXT = {
    home: { do: 'continue', label: 'Continue' },
    inbox: { go: 'home', label: 'Open the desk' },
    day: { go: 'jobs', label: 'Find work for today' },
    jobs: { go: 'day', label: 'Open the calendar' },

    squad: { go: 'tactics', label: 'Set the line-up' },
    tactics: { go: 'fixtures', label: 'Open the next match' },
    training: { go: 'planner', label: 'Plan the week' },
    planner: { go: 'tactics', label: 'Open tactics' },
    dynamics: { go: 'squad', label: 'Open the squad' },
    medical: { go: 'squad', label: 'Check the squad' },
    development: { go: 'training', label: 'Open training' },
    kitOffice: { go: 'squad', label: 'Check the squad' },
    staff: { go: 'squad', label: 'Open the squad' },

    fixtures: { go: 'tactics', label: 'Pick the team' },
    league: { go: 'fixtures', label: 'Open matches' },
    vision: { go: 'club', label: 'Open the club profile' },
    finance: { go: 'transfers', label: 'Open transfers' },
    club: { go: 'finance', label: 'Open the account' },
    transfers: { go: 'bids', label: 'Open transfer talks' },
    bids: { go: 'transfers', label: 'Open transfers' },
    scouting: { go: 'intelligence', label: 'Open scouting reports' },
    intelligence: { go: 'scouting', label: 'Open scouting' },
    clubPromises: { go: 'vision', label: 'Open the boardroom' },
    faOffice: { go: 'club', label: 'Open the club profile' },
    create: { go: 'club', label: 'Open the club profile' },
    succession: { go: 'legacy', label: 'Open legacy' },

    district: { go: 'neighbourhood', label: 'Open the community' },
    neighbourhood: { go: 'people', label: 'Open people' },
    people: { go: 'social', label: 'Open news & social' },
    social: { go: 'neighbourhood', label: 'Open the community' },
    atlas: { go: 'scouting', label: 'Open scouting' },

    household: { go: 'personal', label: 'Open personal accounts' },
    personal: { go: 'finance', label: 'Open the club account' },
    profile: { go: 'legacy', label: 'Open legacy' },
    legacy: { go: 'succession', label: 'Open career history' }
  };

  /* Deadlines and queues that are already known to the desk, named instead of counted. */
  const WHY = {
    create: 'Club entry deadline',
    home: 'Board interview',
    kitOffice: 'Registration deadline',
    bids: 'Transfer talks',
    neighbourhood: 'Community invitation'
  };

  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const titles = () => {
    const map = new Map();
    for (const hub of HUBS) for (const [id, label] of hub.items) map.set(id, label);
    return map;
  };
  const TITLES = titles();
  /* The rail calls the squad screen "First team"; the breadcrumb must agree with it. */
  const RAIL_LABEL = { squad: 'First team' };
  const hubOf = page => HUBS.find(h => h.items.some(([id]) => id === page));

  /* The rail keeps the shape the desk renderer already knows: [groupLabel, [[id, label], …]] */
  function rail() {
    return HUBS.map(h => [h.label, h.items]);
  }

  function chips(page, ctx) {
    const out = [];
    const unread = Number(ctx && ctx.counts && ctx.counts.inbox) || 0;
    if (unread && page !== 'inbox') out.push(chip('due', unread + ' unread', 'in Inbox'));
    const due = Number(ctx && ctx.actions && ctx.actions[page]) || 0;
    if (due) out.push(chip('risk', due + ' to review', WHY[page] || 'Action needed'));
    return out.join('');
  }
  const chip = (state, small, words) =>
    `<span class="tl-status" data-tl-status="${state}"><small>${esc(small)}</small>${esc(words)}</span>`;

  /* One bar: where you are on the left, what needs doing and the one primary action on the right.
     The screen's own heading carries the title, so this line never repeats it. */
  function html(page, ctx) {
    const hub = hubOf(page);
    const title = RAIL_LABEL[page] || TITLES.get(page) || String(page || '');
    const next = NEXT[page];
    const crumbs = hub
      ? `<button type="button" class="tl-crumb-link" data-hc-open="${esc(hub.items[0][0])}">${esc(hub.label)}</button><span class="tl-crumb-sep" aria-hidden="true"></span><span class="tl-crumb-here" aria-current="page">${esc(title)}</span>`
      : `<span class="tl-crumb-here" aria-current="page">${esc(title)}</span>`;
    const action = next
      ? `<button type="button" class="tl-primary" data-tl-action="primary" ${next.do ? `data-tl-do="${esc(next.do)}"` : `data-hc-open="${esc(next.go)}"`}>${esc(next.label)}</button>`
      : '';
    return `<section class="tl-head" data-tl-page="${esc(page)}" aria-label="Screen header">
<nav class="tl-crumb" data-tl-breadcrumb aria-label="Breadcrumb">${crumbs}</nav>
<div class="tl-head-side">${chips(page, ctx)}${action}</div>
</section>`;
  }

  g.TLScreenHead = { HUBS, NEXT, rail, html, hubOf, titles: () => new Map(TITLES) };
  if (typeof module !== 'undefined') module.exports = g.TLScreenHead;
})(typeof window === 'undefined' ? globalThis : window);
