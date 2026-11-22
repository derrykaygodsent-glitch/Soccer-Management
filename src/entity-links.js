/* Turn known entity mentions in rendered career text into real, delegated-action buttons. */
(function (g) {
  'use strict';
  let cachedState = null, cachedPool = null, cachedFingerprint = '', byName = new Map(), matcher = null;
  const norm = value => String(value).normalize('NFC').toLocaleLowerCase();

  function fingerprint(s) {
    const board = s.club ? (g.TLBoardroom?.members?.(s) || s.club.governance?.members || []) : [];
    const staff = g.TLStaffOffice?.read(s)?.members || {};
    const managers = Object.entries(s.benches || {}).flatMap(([club, spells]) => (spells || []).flatMap(x => [x.coach, x.former].filter(Boolean).map(p => [club, p.id, p.name])));
    return JSON.stringify([s.id, s.profile?.name, s.club?.name, s.club?.owner, board.map(x => [x.i, x.share, x.seat]), Object.entries(staff).map(([k,v]) => [k,v?.name]), managers]);
  }
  function build(s) {
    const currentFingerprint = fingerprint(s);
    if (cachedState === s && cachedPool === g.TLManagerLife.pool && cachedFingerprint === currentFingerprint) return;
    cachedState = s;
    cachedPool = g.TLManagerLife.pool;
    cachedFingerprint = currentFingerprint;
    byName = new Map();
    matcher = null;
    const add = (name, target, rank) => {
      if (!name || !target || name.length < 2) return;
      const key = norm(name), previous = byName.get(key);
      if (!previous || rank > previous.rank) byName.set(key, { name, target, rank });
    };
    const clubTarget = name => ({ kind: 'club', name, ...(g.TLData?.CLUBS?.find(c => c.name === name)?.id ? { id: g.TLData.CLUBS.find(c => c.name === name).id } : {}) });
    const clubs = g.TLManagerLife.nations || {};
    for (const [nation, list] of Object.entries(clubs)) {
      for (const club of list || []) add(club, clubTarget(club), 1);
    }
    for (const club of g.TLData?.CLUBS || []) {
      if (club?.id && club.stadium) add(club.stadium, { kind: 'dossier', type: 'stadium', id: club.id }, 2);
    }
    for (const referee of g.TLSeasonCalendar?.referees || []) {
      if (referee?.id && referee.name) add(referee.name, { kind: 'dossier', type: 'referee', id: referee.id }, 2);
    }
    for (const country of g.TLMeridian?.countries || []) {
      add(country.name, { kind: 'league', name: country.name }, 1);
      for (const place of country.places || []) add(place.name, { kind: 'place', code: country.code, id: place.id }, 1);
      for (const member of country.members || []) add(member.name, clubTarget(member.name), 1);
    }
    for (const player of g.TLManagerLife.pool || []) {
      add(player.name, { kind: s.roster?.includes(player.id) ? 'squad' : 'player', id: player.id }, 2);
    }
    for (const [nation, list] of Object.entries(clubs)) {
      for (const club of list || []) {
        const coach = g.TLTechnical?.office(s, club, nation, list)?.coach;
        if (coach) add(coach.name, { kind: 'manager', id: coach.id, club }, 3);
      }
    }
    for (const [club, spells] of Object.entries(s.benches || {})) {
      for (const spell of spells || []) {
        for (const person of [spell.coach, spell.former]) {
          if (person?.id) add(person.name, { kind: 'manager', id: person.id, club }, 3);
        }
      }
    }
    // These targets are derived only from live world/career records; never infer a
    // dossier from a surname or a free-form descriptive phrase.
    for (const player of g.TLManagerLife.pool || []) {
      const agent = g.TLContracts?.representative(player);
      if (agent) add(agent, { kind: 'dossier', type: 'agent', id: agent }, 3);
    }
    const staff = g.TLStaffOffice?.read(s)?.members || {};
    for (const [role, member] of Object.entries(staff)) {
      if (member?.name) add(member.name, { kind: 'dossier', type: 'staff', id: role }, 3);
    }
    const board = s.club ? (g.TLBoardroom?.members?.(s) || s.club.governance?.members || []) : [];
    for (const member of board) {
      const person = g.TLBoardroom?.person?.(s, member.i);
      if (person?.name && s.club?.name) add(person.name, { kind: 'dossier', type: 'board', id: `${s.club.name}|${member.i}` }, 3);
    }
    if (s.profile?.name && s.id) add(s.profile.name, { kind: 'manager', id: 'user:' + s.id }, 4);
    const names = [...byName.keys()].sort((a, b) => b.length - a.length);
    if (names.length) matcher = new RegExp('(^|[^\\p{L}\\p{N}_])(' + names.map(escapeRegExp).join('|') + ')(?=$|[^\\p{L}\\p{N}_])', 'giu');
  }

  function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function descriptor(name, s) {
    build(s);
    return byName.get(norm(name))?.target || null;
  }
  function skip(node) {
    for (let el = node.parentElement; el; el = el.parentElement) {
      if (/^(A|BUTTON|INPUT|SELECT|OPTION|TEXTAREA|SUMMARY|SCRIPT|STYLE|SVG|CODE|PRE|LABEL)$/.test(el.tagName)) return true;
      if (el.isContentEditable || el.hasAttribute('data-no-entity-links') || el.getAttribute('aria-hidden') === 'true') return true;
    }
    return false;
  }
  function makeButton(label, target) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'world-entity-link auto-entity-link';
    button.textContent = label;
    if (target.kind === 'club') { button.dataset.worldClub = target.name; if (target.id) button.dataset.worldClubId = target.id; }
    else if (target.kind === 'league') button.dataset.worldLeague = target.name;
    else if (target.kind === 'place') { button.dataset.guideCountry = target.code; button.dataset.guidePlace = target.id; }
    else if (target.kind === 'player') button.dataset.leaguePlayer = target.id;
    else if (target.kind === 'squad') button.dataset.squadPlayer = target.id;
    else if (target.kind === 'dossier') {
      button.dataset.dossierOpen = `${target.type}|${target.id}`;
      button.dataset.entityType = target.type;
      button.dataset.entityId = target.id;
      button.title = `Open ${target.type} dossier`;
    } else {
      button.dataset.worldManager = target.id;
      if (target.club) button.dataset.worldManagerClub = target.club;
      button.title = 'Open manager dossier';
    }
    if (!button.title) button.title = `Open ${target.kind === 'league' ? 'competition' : target.kind} dossier`;
    return button;
  }
  function link(root, s) {
    if (!root || !s) return 0;
    build(s);
    if (!matcher) return 0;
    const walker = document.createTreeWalker(root, 4), nodes = [];
    while (walker.nextNode()) if (!skip(walker.currentNode)) nodes.push(walker.currentNode);
    let count = 0;
    for (const node of nodes) {
      const text = node.nodeValue;
      matcher.lastIndex = 0;
      let match, last = 0, changed = false;
      const fragment = document.createDocumentFragment();
      while ((match = matcher.exec(text))) {
        const prefix = match[1], label = match[2], start = match.index, entity = byName.get(norm(label));
        if (!entity) continue;
        if (start > last) fragment.append(document.createTextNode(text.slice(last, start)));
        if (prefix) fragment.append(document.createTextNode(prefix));
        fragment.append(makeButton(label, entity.target));
        last = start + match[0].length;
        changed = true;
        count++;
      }
      if (changed) {
        if (last < text.length) fragment.append(document.createTextNode(text.slice(last)));
        node.parentNode.replaceChild(fragment, node);
      }
    }
    return count;
  }
  g.TLEntityLinks = { link, descriptor };
  if (typeof module !== 'undefined') module.exports = g.TLEntityLinks;
})(typeof window === 'undefined' ? globalThis : window);
