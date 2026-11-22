/* FM-style global navigation search for the active career. */
(function (g) {
  'use strict';
  const norm = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const esc = value => g.TLClubUI.esc(String(value ?? ''));
  let cachedCareer = null, cachedPool = null, index = null;

  function build(s) {
    const W = g.TLManagerLife, pool = W.pool || [];
    if (cachedCareer === s && cachedPool === pool && index) return index;
    cachedCareer = s; cachedPool = pool;
    const rows = [], clubs = new Map(), managers = new Map(), agents = new Map(), seen = new Set();
    const add = (type, title, meta, target, values = []) => {
      if (!title) return;
      const key = `${type}|${target.id || target.name || target.nation || target.page || title}`;
      if (seen.has(key)) return;
      seen.add(key);
      rows.push({ type, title: String(title), meta, target, values: [type, title, meta, ...values].map(norm) });
    };
    const addClub = (name, nation, id = '') => {
      if (!name) return;
      const key = id ? `${nation}|${id}` : `${nation}|${name}`;
      if (!clubs.has(key)) clubs.set(key, { name, nation, id });
    };
    const countryByName = new Map((g.TLMeridian?.countries || []).map(country => [country.name, country]));
    const clubIds = new Map();
    for (const country of g.TLMeridian?.countries || []) {
      for (const member of country.members || []) {
        const club = typeof member === 'string' ? { name: member } : member;
        addClub(club.name, country.name, club.id || '');
        if (club.id) clubIds.set(`${country.name}|${club.name}`, club.id);
      }
      add('Nation', country.name, `${country.continent} · ${country.code}`, { kind: 'nation', nation: country.name }, [country.code]);
      for (const place of country.places || []) {
        add('Settlement', place.name, `${country.name} · ${place.id}`, { kind: 'place', code: country.code, place: place.id }, [place.id, country.code]);
      }
    }
    for (const [nation, list] of Object.entries(W.nations || {})) {
      for (const item of list || []) {
        const name = typeof item === 'string' ? item : item?.name;
        const id = typeof item === 'object' ? item?.id : clubIds.get(`${nation}|${name}`);
        addClub(name, nation, id || '');
      }
    }
    for (const player of pool) {
      const own = s.roster?.includes(player.id);
      add('Player', player.name, `${player.pos} · ${player.age} · ${player.club || 'Unattached'} · ${player.nation} · ID ${player.id}`,
        { kind: own ? 'squad' : 'player', id: player.id }, [player.id, player.club, player.nation, player.pos, own ? 'Squad' : 'Player']);
      const agent = g.TLPlayerContracts?.representative(player);
      if (agent) {
        if (!agents.has(agent)) agents.set(agent, new Set());
        agents.get(agent).add(player.id);
      }
    }
    for (const club of clubs.values()) {
      const count = pool.filter(player => player.club === club.name).length;
      const id = club.id ? ` · ID ${club.id}` : '';
      add('Club', club.name, `${club.nation} · ${count} players${id} · Club dossier & squad`,
        { kind: 'club', name: club.name, id: club.id }, [club.id, club.nation, 'club', 'squad', 'team']);
    }
    for (const [nation, list] of Object.entries(W.nations || {})) {
      for (const club of list || []) {
        const name = typeof club === 'string' ? club : club?.name;
        const manager = g.TLTechnical?.office(s, name, nation, list)?.coach;
        if (manager) managers.set(manager.id, { ...manager, club: name, nation });
      }
    }
    for (const [club, spells] of Object.entries(s.benches || {})) {
      for (const spell of spells || []) for (const person of [spell.coach, spell.former]) {
        if (person?.id) managers.set(person.id, { ...person, club });
      }
    }
    for (const person of managers.values()) add('Manager', person.name,
      `${person.club} · Manager profile · ID ${person.id}`, { kind: 'manager', id: person.id, club: person.club },
      [person.id, person.club, person.nation, 'manager']);
    add('Manager', s.profile?.name, `Your manager profile · ID ${s.id}`,
      { kind: 'manager', id: 'user:' + s.id }, [s.id, 'manager']);

    const season = g.TLTurnover?.season(s.day) ?? 2026;
    for (const nation of Object.keys(W.nations || {})) {
      const title = g.TLFASeason?.leagueName(s, nation, season) || 'League';
      const compId = `${nation} ${season} league`;
      add('Competition', `${nation} ${title}`, `${nation} · League table · ${compId}`,
        { kind: 'competition', nation, tab: 'Table' }, [nation, title, compId, 'competition', 'league']);
    }
    for (const cup of g.TLCups?.circuit(s, pool) || []) {
      let nation = Object.hasOwn(W.nations || {}, cup.scope) ? cup.scope : s.profile?.nation;
      if (cup.scope !== 'World' && !Object.hasOwn(W.nations || {}, cup.scope)) {
        nation = Object.keys(W.nations || {}).find(n => countryByName.get(n)?.continent === cup.scope) || nation;
      }
      const compId = `${cup.scope} ${cup.title}`;
      add('Competition', cup.title, `${cup.scope} · Cup circuit · ${compId}`,
        { kind: 'competition', nation, tab: 'Cups' }, [cup.scope, cup.title, compId, 'competition', 'cup']);
    }
    for (const [agent, playerIds] of agents) add('Agent', agent,
      `Player representative · ${playerIds.size} players · Search represented players`,
      { kind: 'agent', name: agent }, [agent, 'agent', 'representative']);

    const pages = [
      ['home', 'Overview'], ['inbox', 'Inbox'], ['day', 'Calendar'], ['jobs', 'Job market'], ['interviewDesk', 'Board interview'],
      ['scouting', 'Scouting centre'], ['transfers', 'Transfers'], ['squad', 'Squad'], ['league', 'Competitions'], ['fixtures', 'Matches'],
      ['club', 'Club profile'], ['profile', 'Manager profile'], ['atlas', 'World atlas'], ['social', 'News & social'],
      ['staff', 'Staff'], ['finance', 'Finance'], ['training', 'Training'], ['succession', 'Career history'],
    ];
    for (const [page, title] of pages) add('Page', title, 'Open desk', { kind: 'page', page }, [page, title, 'page', 'desk']);
    index = rows;
    return index;
  }

  function search(s, query, limit = 18) {
    const q = norm(query);
    if (!q) return [];
    return build(s).map(row => {
      const matching = row.values.filter(value => value.includes(q));
      if (!matching.length) return null;
      const rank = matching.some(value => value === q) ? 0 : matching.some(value => value.startsWith(q)) ? 1 : 2;
      return { ...row, rank };
    }).filter(Boolean).sort((a, b) => a.rank - b.rank || typeRank(a.type) - typeRank(b.type) || a.title.localeCompare(b.title)).slice(0, limit);
  }
  function typeRank(type) { return ({ Player: 0, Club: 1, Manager: 2, Competition: 3, Nation: 4, Settlement: 5, Agent: 6, Page: 7 })[type] ?? 9; }
  function resultAttrs(target) {
    return target.kind === 'club' ? `data-world-club="${esc(target.name)}"`
      : target.kind === 'player' ? `data-league-player="${esc(target.id)}"`
      : target.kind === 'squad' ? `data-squad-player="${esc(target.id)}"`
      : target.kind === 'manager' ? `data-world-manager="${esc(target.id)}" ${target.club ? `data-world-manager-club="${esc(target.club)}"` : ''}`
      : target.kind === 'nation' ? `data-world-league="${esc(target.nation)}"`
      : target.kind === 'place' ? `data-guide-country="${esc(target.code)}" data-guide-place="${esc(target.place)}"`
      : target.kind === 'competition' ? `data-search-competition="${esc(target.nation)}|${esc(target.tab)}"`
      : target.kind === 'agent' ? `data-search-agent="${esc(target.name)}"`
      : `data-search-page="${esc(target.page)}"`;
  }
  function results(s, query) {
    const found = search(s, query);
    if (!found.length) return '<p class="hc-global-empty" role="status">No matching game entities.</p>';
    return found.map(row => {
      const primary = `<button class="hc-global-result" type="button" data-global-result ${resultAttrs(row.target)}><strong>${esc(row.title)}</strong><small>${esc(row.type)} · ${esc(row.meta)}</small></button>`;
      const club = row.type === 'Player' && row.target?.id
        ? ((g.TLManagerLife.pool || []).find(player => player.id === row.target.id)?.club || '') : '';
      const squad = club ? `<button class="hc-global-squad" type="button" data-global-result data-search-club-squad="${esc(club)}" aria-label="Open ${esc(club)} club dossier and squad">Open ${esc(club)} squad</button>` : '';
      return `<div class="hc-global-result-row">${primary}${squad}</div>`;
    }).join('');
  }
  function agentPanel(s, agent) {
    const W = g.TLManagerLife, players = (W.pool || []).filter(player => g.TLPlayerContracts?.representative(player) === agent);
    return `<section class="org agent-search"><header class="org-cover"><div><small>PLAYER REPRESENTATION / SEARCH</small><h2>${esc(agent)}</h2><p>${players.length} represented players in the current world</p></div></header><p>Search result · Select a player to open their file.</p>${players.length ? `<div class="directory-scroll"><table class="player-directory"><thead><tr><th>Player</th><th>Position</th><th>Age</th><th>Nation</th><th>Club</th></tr></thead><tbody>${players.map(player => `<tr><th scope="row"><button data-${s.roster?.includes(player.id) ? 'squad' : 'league'}-player="${esc(player.id)}">${esc(player.name)}</button></th><td>${esc(player.pos)}</td><td>${player.age}</td><td>${esc(player.nation)}</td><td>${esc(player.club || 'Unattached')}</td></tr>`).join('')}</tbody></table></div>` : '<p>No players are currently represented here.</p>'}</section>`;
  }
  g.TLGlobalSearch = { search, results, agentPanel };
  if (typeof module !== 'undefined') module.exports = g.TLGlobalSearch;
})(typeof window === 'undefined' ? globalThis : window);
