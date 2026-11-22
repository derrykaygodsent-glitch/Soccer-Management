/* Career club dossier: identity, ground, honours, form and the founding story. */
(function (g) {
  'use strict';
  const U = g.TLClubUI || {};
  const esc = U.esc || String;
  const art = U.art || (() => '');
  const W = () => g.TLManagerLife;
  const money = n => W().money(Number(n) || 0);
  const day = d => W().date(Number(d) || 0);
  const D = () => g.TLData;
  const maximum = new Proxy({}, { get: () => 20 });
  function ability(p) {
    const w = D().ROLE_WEIGHTS?.[p.pos === 'CB' ? 'DC' : p.pos];
    if (!w) return 0;
    return Math.max(0, Math.min(100, Math.round(100 * w(p.attrs || {}) / w(maximum))));
  }
  function clubNation(s) {
    const club = s.club;
    if (!club) return s.profile.nation;
    if (club.owner) return s.profile.nation;
    const nations = W().nations || {};
    return Object.keys(nations).find(k => (nations[k] || []).includes(club.name)) || s.profile.nation;
  }
  function leagueRow(s, club) {
    try {
      const rows = W().table(clubNation(s), s.day) || [];
      return rows.find(r => r.name === club.name) || null;
    } catch { return null; }
  }
  function roster(s) {
    const pool = W().pool || [];
    return (s.roster || []).map(id => pool.find(p => p.id === id)).filter(Boolean);
  }
  function ground(s) {
    try { return g.TLEstate?.venue?.(s) || null; } catch { return null; }
  }
  function honours(s, club) {
    const list = [];
    for (const season of s.seasonBook || []) {
      const national = season.nations?.[clubNation(s)];
      for (const a of [...(national?.honours || []), ...(season.cupAwards || [])]) {
        if ((a.club || a.name) === club.name) list.push({ season: `${season.year}/${String(season.year + 1).slice(-2)}`, title: a.title, level: a.level || '', cash: a.cash });
      }
    }
    return list;
  }
  function story(s, club) {
    const rows = [];
    const push = (label, text) => text && rows.push([label, text]);
    push('Club registered', `${club.owner ? 'Founded' : 'Taken over'} ${day(club.appointed)}`);
    if (s.foundingRival) push('First rival', `${s.foundingRival} were licensed in the same FA hearing.`);
    const entry = Object.entries(s.entries || {}).find(([, x]) => x?.name === club.name);
    if (entry) {
      const year = Number(entry[0]) || new Date(`${day(club.appointed)}T00:00:00Z`).getUTCFullYear();
      push('League entry', `Filed for the ${year}/${String(year + 1).slice(-2)} season.`);
    }
    if (club.promise) push('Board mandate', `${club.promise.answer === 'budget' ? 'Protect the club reserve' : club.promise.answer === 'academy' ? 'Build through the academy' : `Finish in the top ${club.promise.target}`} · set ${day(club.promise.day)}.`);
    if (club.report) push('Directors’ review', club.report);
    const minutes = club.governance?.minutes || [];
    if (minutes.length) push('Last board vote', `${day(minutes[0].day)} · ${minutes[0].text}`);
    return rows;
  }
  function kpis(s, club, row, team) {
    const wages = Object.values(s.contracts || {}).reduce((n, c) => n + (c.wage || 0), 0);
    const v = ground(s);
    return [
      ['League position', row?.rank ? `#${row.rank}` : '–', row?.p ? `${row.pts} pts · ${row.p} played` : 'Season not started'],
      ['Squad', `${team.length}`, team.length ? `Avg age ${(team.reduce((n, p) => n + p.age, 0) / team.length).toFixed(1)}` : 'No players yet'],
      ['Staff', `${(s.staff || []).length}`, 'Backroom team'],
      ['Club funds', money(s.fund), 'Not personal wallet'],
      ['Wage bill', wages ? `${money(wages)}/wk` : 'No wages', Object.keys(s.contracts || {}).length + ' contracts'],
      ['Ground', v ? `${(v.capacity || 0).toLocaleString('en-GB')}` : 'No venue', v ? v.name : 'Arrange in the boardroom'],
    ];
  }
  function render(s) {
    const club = s.club;
    if (!club) return `<section class="org"><header class="org-cover">${art('briefing')}<div><small>CLUB DOSSIER</small><h2>No club yet</h2><p>Found a club or take a managerial appointment to open a club profile.</p></div></header><article class="org-agenda"><h3>Start the club story</h3><p>Your founding charter, board and local ground all appear here once the FA registers the club.</p><button data-life="go" data-v="create">Open club registration</button></article></section>`;
    const row = leagueRow(s, club);
    const team = roster(s);
    const v = ground(s);
    const b = club.governance || {};
    const trophies = honours(s, club);
    const facts = [
      ['Nation', clubNation(s)],
      ['Founded', day(club.appointed)],
      ['Founder', club.owner ? s.profile.name : 'Appointed board'],
      ['Nickname', club.nick || '–'],
      ['Emblem', club.emblem || '◇'],
      ['Status', club.owner ? 'Founder-owned club' : 'Board-run club'],
      ['Board', club.board || 'Elected directors'],
      ['Captain', s.armband?.length ? (W().pool.find(p => p.id === s.armband[0])?.name || 'Automatic') : 'Automatic'],
    ];
    const factsHtml = (items) => `<dl class="cp-facts">${items.map(([k, v2]) => `<div><dt>${esc(k)}</dt><dd>${esc(v2)}</dd></div>`).join('')}</dl>`;
    const gates = (b.gates || []).slice(0, 4);
    const leagueRows = (() => {
      try {
        const rows = W().table(clubNation(s), s.day) || [];
        const i = rows.findIndex(r => r.name === club.name);
        if (i < 0) return [];
        return rows.slice(Math.max(0, i - 2), i + 3);
      } catch { return []; }
    })();
    const avgAbility = team.length ? Math.round(team.reduce((n, p) => n + ability(p), 0) / team.length) : 0;
    const squadValue = team.reduce((n, p) => n + (p.value || 0), 0);
    const storyRows = story(s, club);
    const switcher = `<nav class="profile-switch" aria-label="Switch profile"><button type="button" aria-pressed="true" data-life="go" data-v="club">Club profile</button><button type="button" aria-pressed="false" data-life="go" data-v="profile">Manager profile</button></nav>`;
    return `<section class="org club-file">${switcher}
      <header class="org-cover club-file-cover">${art('quayside')}<div><small>CLUB DOSSIER · ${esc(clubNation(s)).toUpperCase()}</small><h2><span class="club-file-emblem" aria-hidden="true">${esc(club.emblem || '◇')}</span>${esc(club.name)}</h2><p>${esc(club.nick || 'The first team')}${club.owner ? ` · founded by ${esc(s.profile.name)} on ${day(club.appointed)}` : ` · under new management since ${day(club.appointed)}`}</p><div class="club-file-chips"><span>${esc(row?.rank ? `#${row.rank} in the league` : 'New club')}</span><span>${team.length} players</span><span>${money(s.fund)} in the bank</span></div></div></header>
      <div class="cp-kpis">${kpis(s, club, row, team).map(([label, value, note]) => `<div><small>${esc(label)}</small><b>${esc(value)}</b><em>${esc(note)}</em></div>`).join('')}</div>
      <div class="cp-grid">
        <article class="org-agenda"><h3>Club identity</h3>${factsHtml(facts)}</article>
        <article class="org-agenda"><h3>Ground &amp; matchday</h3>${v ? `${factsHtml([['Venue', v.name], ['Capacity', (v.capacity || 0).toLocaleString('en-GB')], ['Agreement', v.owned ? 'Owned by the club' : b.lease ? `Lease until ${day(b.lease.until)}` : 'Matchday hire']])}${gates.length ? `<p class="cp-note">Recent gates</p>${gates.map(x => `<div class="cp-gate"><span>${esc(x.opponent)}</span><b>${x.attendance.toLocaleString('en-GB')} / ${x.capacity.toLocaleString('en-GB')}</b><em>${money(x.net)}</em></div>`).join('')}` : '<p class="cp-muted">No home gate receipts recorded yet.</p>'}` : `<p class="cp-muted">No ground agreement yet. The board must vote on a venue before the club can host matches.</p><button data-life="go" data-v="vision">Open the boardroom</button>`}${b.works ? `<p class="cp-note">Works in progress · ${esc(b.works.kind)} ready ${day(b.works.due)}</p>` : ''}</article>
        <article class="org-agenda"><h3>Honours</h3>${trophies.length ? `<div class="cp-trophies">${trophies.map(t => `<div><b>${esc(t.title)}</b><span>${esc(t.season)}${t.level ? ` · ${esc(t.level)}` : ''}${t.cash ? ` · ${money(t.cash)}` : ''}</span></div>`).join('')}</div>` : `<p class="cp-muted">No trophy in the cabinet yet. ${row?.p ? 'The first season is still being played.' : 'The first season has not started.'}</p>`}<p class="cp-note">Individual awards appear on the Competitions page when the season closes.</p></article>
        <article class="org-agenda"><h3>League snapshot</h3>${leagueRows.length ? `<table class="cp-table"><thead><tr><th scope="col">#</th><th scope="col">Club</th><th scope="col">P</th><th scope="col">Pts</th><th scope="col">Form</th></tr></thead><tbody>${leagueRows.map(r => `<tr${r.name === club.name ? ' class="cp-self"' : ''}><td>${r.rank}</td><td>${esc(r.name)}</td><td>${r.p}</td><td>${r.pts}</td><td>${(r.form || []).slice(-5).map(f => `<i class="cp-form cp-form-${f.toLowerCase()}">${f}</i>`).join('')}</td></tr>`).join('')}</tbody></table><button data-life="go" data-v="league">Full competition page</button>` : `<p class="cp-muted">The league table fills once fixtures start. Enter a competition from Competitions when the entry window opens.</p><button data-life="go" data-v="league">Open competitions</button>`}</article>
        <article class="org-agenda"><h3>Squad at a glance</h3>${team.length ? factsHtml([['Players', `${team.length}`], ['Average age', (team.reduce((n, p) => n + p.age, 0) / team.length).toFixed(1)], ['Average ability', `${avgAbility}/100`], ['Squad value', money(squadValue)], ['Youngest', [...team].sort((a, b) => a.age - b.age)[0].name], ['Most valuable', [...team].sort((a, b) => (b.value || 0) - (a.value || 0))[0].name]]) + `<button data-life="go" data-v="squad">Open the squad</button>` : `<p class="cp-muted">No players registered. Recruit in Scouting, or invite local players from the district.</p><button data-life="go" data-v="scouting">Open scouting</button>`}</article>
        <article class="org-agenda"><h3>The club story</h3>${storyRows.length ? `<ol class="cp-story">${storyRows.map(([label, text]) => `<li><small>${esc(label)}</small><span>${esc(text)}</span></li>`).join('')}</ol>` : '<p class="cp-muted">The story has just begun.</p>'}<div class="cp-actions"><button data-life="go" data-v="vision">Boardroom</button><button data-life="go" data-v="staff">Staff</button><button data-life="go" data-v="transfers">Transfers</button><button data-life="go" data-v="finance">Club account</button><button data-life="go" data-v="profile">Your manager profile</button></div></article>
      </div>
    </section>`;
  }
  function renderWorld(s,name){const Wm=W(),e=esc,nation=Object.keys(Wm.nations||{}).find(n=>(Wm.nations[n]||[]).includes(name)),clubs=nation?Wm.nations[nation]:[],pool=Wm.pool||[];if(!nation){const place=g.TLWorldGuide?.search(name).find(x=>x.type==='Football club'),location=place?`${place.t.name}, ${place.c.name}`:'No current league registry is available for this club.';return `<section class="org club-file world-club-file"><header class="org-cover club-file-cover">${art('quayside')}<div><small>WORLD CLUB DOSSIER</small><h2>${e(name)}</h2><p>${e(location)}</p></div></header><article class="org-agenda"><h3>Club record</h3><p>This founding club is listed in the world guide, but does not currently have an active league-table record in this career.</p>${place?`<button data-guide-country="${e(place.c.code)}" data-guide-place="${e(place.t.id)}">Open ${e(place.t.name)} atlas entry</button>`:''}</article></section>`;}const row=(Wm.table(nation,s.day)||[]).find(x=>x.name===name),team=pool.filter(p=>p.club===name).sort((a,b)=>a.pos.localeCompare(b.pos)||a.age-b.age),coach=g.TLTechnical.office(s,name,nation,clubs).coach,owner=s.clubOwnership?.[name],history=(s.benches?.[name]||[]).slice().reverse(),status=owner?`${owner.consortium} · ${owner.shares}% control`:'Independent club ownership';return `<section class="org club-file world-club-file"><header class="org-cover club-file-cover">${art('quayside')}<div><small>WORLD CLUB DOSSIER · ${e(nation).toUpperCase()}</small><h2>${e(name)}</h2><p>${e(status)} · ${row?.rank?`#${row.rank} in ${e(nation)}`:'League campaign not started'}</p></div></header><div class="cp-kpis"><div><small>Nation</small><b>${e(nation)}</b><em>${e(g.TLFASeason.profiles[nation]?.[5]||'Meridian association')}</em></div><div><small>League record</small><b>${row?`${row.w}-${row.d}-${row.l}`:'–'}</b><em>${row?`${row.pts} points · ${row.p} played`:'No fixtures played'}</em></div><div><small>First-team pool</small><b>${team.length}</b><em>${team.length?`Average age ${(team.reduce((n,p)=>n+p.age,0)/team.length).toFixed(1)}`:'No active player records'}</em></div><div><small>Board target</small><b>Top ${g.TLTechnical.office(s,name,nation,clubs).target}</b><em>Appointment budget ${money(g.TLTechnical.office(s,name,nation,clubs).budget)}</em></div></div><div class="cp-grid"><article class="org-agenda"><h3>In the dugout</h3>${coach?`<p><button class="world-entity-link" data-world-manager="${e(coach.id)}" data-world-manager-club="${e(name)}">${e(coach.name)}</button> · ${e(g.TLTechnical.labels[coach.style]||coach.style)}</p>`:'<p>Interim management.</p>'}${history.length?`<details open><summary>Managerial changes</summary>${history.slice(0,8).map(x=>`<p>${e(Wm.date(x.day))} · ${e(x.reason)} · ${x.former?`<button class="world-entity-link" data-world-manager="${e(x.former.id)}" data-world-manager-club="${e(name)}">${e(x.former.name)}</button>`:e(x.coach?.name||'')}</p>`).join('')}</details>`:''}</article><article class="org-agenda"><h3>Ownership &amp; investment</h3>${owner?`<p>${e(owner.consortium)} acquired ${owner.shares}% on ${e(Wm.date(owner.acquired))}.</p><p>Capital committed: ${money(owner.capital)} · board target: top ${owner.target}.</p>`:'<p>No consortium acquisition is recorded for this club in this career.</p>'}<button data-world-league="${e(nation)}">Open ${e(nation)} competition</button></article><article class="org-agenda"><h3>First-team players</h3>${team.length?`<div class="directory-scroll"><table class="player-directory"><thead><tr><th>Player</th><th>Position</th><th>Age</th><th>Nation</th></tr></thead><tbody>${team.map(p=>`<tr><th scope="row"><button data-league-player="${e(p.id)}">${e(p.name)}</button></th><td>${e(p.pos)}</td><td>${p.age}</td><td>${e(p.nation)}</td></tr>`).join('')}</tbody></table></div>`:'<p>No roster records are available.</p>'}</article></div></section>`;}
  g.TLClubProfile = { render, renderWorld, ability, clubNation, roster };
  if (typeof module !== 'undefined') module.exports = g.TLClubProfile;
})(typeof window === 'undefined' ? globalThis : window);
