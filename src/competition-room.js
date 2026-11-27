/* Competition centre: one nation's league, cups, fixtures and records.
   Four views a manager uses weekly (Table · Fixtures · Leaders · Cups) and three record books
   (Dugouts · Trophy room · Season book) kept in their own group. */
(function (g) {
  'use strict';
  const W = g.TLManagerLife, { esc: e, art } = g.TLClubUI;

  /* The four views a week uses, in the order a manager reads them. */
  const VIEWS = [['Table', 'Table'], ['Diary', 'Fixtures'], ['Players', 'Leaders'], ['Cups', 'Cups']];
  /* Record books, in their own group so they never crowd the weekly four. */
  const RECORDS = [['Bench', 'Dugouts'], ['Honours', 'Trophy room'], ['Book', 'Season book']];
  const TABS = new Set([...VIEWS, ...RECORDS].map(([k]) => k));
  /* The leader categories a manager actually ranks players by. */
  const METS = [['goals', 'Scorers'], ['assists', 'Assists'], ['sheets', 'Clean sheets']];
  const NOUN = { goals: 'goals', assists: 'assists', sheets: 'clean sheets' };
  /* Positions the league records, grouped the way a manager asks about them. */
  const POS_GROUPS = [['', 'All positions'], ['GK', 'Goalkeepers'], ['DEF', 'Defenders'], ['MID', 'Midfielders'], ['FWD', 'Forwards']];
  const POS_OF = { DEF: ['DC', 'FB'], MID: ['DM', 'CM', 'AM'], FWD: ['W', 'ST'] };
  const inGroup = (pos, group) => !group || (group === 'GK' ? pos === 'GK' : (POS_OF[group] || []).includes(pos));
  const LEADER_PAGE = 25;
  const SING = { goals: 'goal', assists: 'assist', sheets: 'clean sheet' };

  /* Dates read as a person writes them: 13 Nov 2027, never 2027-11-13. */
  const dayText = iso => { const d = new Date(String(iso) + 'T12:00:00Z'); return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); };

  /* One round is one matchday: the fixtures share an index, and a round can run over two days. */
  function groupRounds(fixtures) {
    const byRound = new Map();
    for (const f of fixtures) {
      const key = f.i == null ? f.day : f.i;
      if (!byRound.has(key)) byRound.set(key, { round: key, fixtures: [] });
      byRound.get(key).fixtures.push(f);
    }
    return [...byRound.values()]
      .map(g => {
        const days = [...new Set(g.fixtures.map(f => f.day))].sort((a, b) => a - b);
        return { ...g, from: days[0], to: days[days.length - 1], days };
      })
      .sort((a, b) => a.from - b.from || a.round - b.round)
      .map((g, i) => ({ ...g, number: i + 1 }));
  }
  /* A round already behind the manager is a result; the round being played is upcoming. */
  const roundsFor = (rounds, filter, day) => filter === 'results'
    ? rounds.filter(r => r.to < day)
    : filter === 'all' ? rounds : rounds.filter(r => r.to >= day);
  /* The schedule carries no scores; the league simulation returns [home, away, goals, goals]. */
  function scoreOf(fixture, results) {
    if (!results || !results.length) return null;
    for (const r of results) if (r && r[0] === fixture.a && r[1] === fixture.b) return [r[2], r[3]];
    return null;
  }
  function spanText(from, to) {
    const a = dayText(from), b = dayText(to);
    if (a === b) return a;
    const [da, ma] = a.split(' '), [db, mb] = b.split(' ');
    return ma === mb ? `${da}–${db} ${ma} ${a.split(' ')[2]}` : `${a} – ${b}`;
  }

  const tabs = (items, current) => items.map(([value, label]) =>
    `<button type="button" data-comp-tab="${value}" aria-pressed="${value === current}">${e(label)}</button>`).join('');

  function render(s, ui) {
    ui = ui || {};
    const season = g.TLTurnover.season(s.day);
    const n = ui.nation || Object.keys(W.nations).find(k => W.nations[k].includes(s.club?.name)) || s.profile.nation;
    const country = W.atlas.countries.find(c => c.name === n);
    const tab = TABS.has(ui.tab) ? ui.tab : 'Table';
    const cups = tab === 'Cups', stats = tab === 'Players';
    const metric = ui.metric || 'goals';
    const major = g.TLFASeason.major(s, n, season);
    const competition = cups ? 'Cup circuit' : major ? 'Premier League' : 'District League';
    const code = country?.code || n.slice(0, 3).toUpperCase();
    const h = g.TLData.seedFor(n) % 360;
    const base = W.district(n, s.day);
    const field = stats ? W.district(n, s.day, true) : base;
    const ranked = stats ? field.players.filter(p => p[metric] > 0).sort((a, b) => b[metric] - a[metric] || a.name.localeCompare(b.name)) : [];
    const rounds = s.worldVersion ? g.TLFASeason.dates(s, n, season).filter(d => d <= s.day).length : g.TLTurnover.round(s.day, base.rows.length);
    const trail = g.TLScreenHead?.trail?.([
      { label: 'World', attrs: 'data-life="go" data-v="atlas"' },
      { label: n, attrs: `data-atlas-choose="${e(code)}"` },
      { label: competition, here: true }
    ]) || '';

    let panel;
    if (tab === 'Diary') {
      /* The league only returns simulated scores when it is asked for players too. */
      const results = (W.district(n, s.day, true).results) || [];
      const schedule = g.TLFASeason.fixtures(s, n, season).sort((a, b) => a.day - b.day || String(a.team).localeCompare(String(b.team)));
      const rounds = groupRounds(schedule);
      const filter = ['upcoming', 'results', 'all'].includes(ui.fixFilter) ? ui.fixFilter : 'upcoming';
      const scope = roundsFor(rounds, filter, s.day);
      const counts = { upcoming: roundsFor(rounds, 'upcoming', s.day).length, results: roundsFor(rounds, 'results', s.day).length, all: rounds.length };
      /* Default to the matchday being played, or the first one still to come. */
      const firstUpcoming = roundsFor(rounds, 'upcoming', s.day)[0];
      const fallback = scope.includes(firstUpcoming) ? firstUpcoming : scope[scope.length - 1] || scope[0];
      const want = scope.find(r => r.number === Number(ui.fixRound));
      const shown = want || fallback;
      const at = scope.indexOf(shown);
      const own = shown ? shown.fixtures.find(f => f.team === s.club?.name || f.host === s.club?.name) : null;
      const rows = shown ? shown.fixtures.map(f => {
        const score = scoreOf(f, results);
        return `<li class="fix-row${f === own ? ' fix-own' : ''}"><small><time datetime="${W.date(f.day)}">${dayText(W.date(f.day))}</time>${f.kickoff ? ' · ' + f.kickoff : ''}</small><span class="fix-teams"><button data-world-club="${e(f.team)}">${e(f.team)}</button> <i>v</i> <button data-world-club="${e(f.host)}">${e(f.host)}</button></span><span class="fix-score">${score ? `${score[0]}–${score[1]}` : ''}</span>${f.tier ? `<em class="fix-tier">D${f.tier}</em>` : ''}${f === own ? '<b class="fix-you">Your club</b>' : ''}</li>`;
      }).join('') : '';
      const spotlight = own ? `<p class="fix-spot"><small>${shown.to < s.day ? 'YOUR RESULT' : 'YOUR MATCH THIS ROUND'}</small><b>${e(own.team)} v ${e(own.host)}</b>${scoreOf(own, results) ? ` · ${scoreOf(own, results).join('–')}` : own.kickoff ? ` · ${own.kickoff}` : ''} · ${dayText(W.date(own.day))}</p>` : '';
      panel = `<section class="org-agenda comp-fixtures"><header class="comp-panel-head"><h3>${e(n)} fixtures</h3><small>${schedule.length} ${schedule.length === 1 ? 'fixture' : 'fixtures'} this season</small></header><div class="fix-filters" role="group" aria-label="Show fixtures"><button type="button" data-fix-filter="upcoming" aria-pressed="${filter === 'upcoming'}">Upcoming ${counts.upcoming}</button><button type="button" data-fix-filter="results" aria-pressed="${filter === 'results'}">Results ${counts.results}</button><button type="button" data-fix-filter="all" aria-pressed="${filter === 'all'}">All ${counts.all}</button></div>${!scope.length ? `<p class="cp-muted">${filter === 'results' ? 'No results yet this season. The first round is still to be played.' : 'No rounds left to play this season.'}</p>` : `<div class="fix-head"><button type="button" class="fix-step" data-fix-round="-1" aria-label="Previous round" ${at <= 0 ? 'disabled' : ''}>Previous</button><p><b>Round ${shown.number}</b><small>${spanText(W.date(shown.from), W.date(shown.to))} · ${shown.fixtures.length} ${shown.fixtures.length === 1 ? 'fixture' : 'fixtures'}</small></p><button type="button" class="fix-step" data-fix-round="1" aria-label="Next round" ${at >= scope.length - 1 ? 'disabled' : ''}>Next</button></div>${spotlight}<p class="fix-range" data-tl-meta>Round ${shown.number} of ${rounds.length} · showing ${shown.fixtures.length} of ${schedule.length} fixtures · ${counts[filter]} ${counts[filter] === 1 ? 'round' : 'rounds'} ${filter === 'results' ? 'played' : filter === 'upcoming' ? 'to come' : 'this season'}</p><ul class="fix-list">${rows}</ul>`}<p class="comp-note">${e(g.TLFASeason.profiles[n][5])}</p></section>`;
    } else if (tab === 'Bench') {
      panel = g.TLTechnical.render(s, n);
    } else if (tab === 'Honours') {
      panel = g.TLHonours.render(s, n);
    } else if (tab === 'Book') {
      panel = g.TLSeasonBook.render(s, n);
    } else if (cups) {
      panel = g.TLCups.render(s, n);
    } else if (stats) {
      const pos = ui.leaderPos && POS_GROUPS.some(([k]) => k === ui.leaderPos) ? ui.leaderPos : '';
      const clubPick = ui.leaderClub && base.rows.some(r => r.name === ui.leaderClub) ? ui.leaderClub : '';
      const min = Math.max(1, Math.min(5, Number(ui.leaderMin) || 1));
      /* The league records goals, assists and clean sheets per player — never appearances — so the
         "at least" filter counts the category being ranked. */
      const ranked = (field.players || [])
        .filter(p => inGroup(p.pos, pos) && (!clubPick || p.club === clubPick) && (metric !== 'sheets' || p.pos === 'GK') && (p[metric] || 0) >= min)
        .sort((a, b) => b[metric] - a[metric] || String(a.name).localeCompare(String(b.name)));
      const pages = Math.max(1, Math.ceil(ranked.length / LEADER_PAGE));
      const pageIdx = Math.min(pages - 1, Math.max(0, Number(ui.leaderPage) || 0));
      const shown = ranked.slice(pageIdx * LEADER_PAGE, pageIdx * LEADER_PAGE + LEADER_PAGE);
      const from = ranked.length ? pageIdx * LEADER_PAGE + 1 : 0, to = pageIdx * LEADER_PAGE + shown.length;
      const opts = (list, current, blank) => list.map(([value, label]) => `<option value="${e(value)}"${value === current ? ' selected' : ''}>${e(label)}</option>`).join('');
      const clubs = [...new Set(base.rows.map(r => r.name))].sort((a, b) => a.localeCompare(b));
      const filters = `<div class="lead-filters" role="group" aria-label="Filter leaders"><label>Position<select data-leader="pos">${opts(POS_GROUPS, pos)}</select></label><label>Club<select data-leader="club"><option value="">All clubs</option>${clubs.map(c => `<option value="${e(c)}"${c === clubPick ? ' selected' : ''}>${e(c)}</option>`).join('')}</select></label><label>At least<select data-leader="min">${opts([['1', '1'], ['2', '2'], ['3', '3'], ['5', '5']], String(min))}</select></label><span class="lead-min-note">${e(min === 1 ? (SING[metric] || metric) : (NOUN[metric] || metric))}</span></div>`;
      const table = shown.length
        ? `<div class="directory-scroll"><table class="player-directory comp-leaders" data-tl-table="cards"><caption>${e(n)} leaders by ${e(NOUN[metric] || metric)}</caption><thead><tr><th data-col="rank">#</th><th data-col="name">Name</th><th data-col="club">Club</th><th data-col="pos">Position</th><th data-col="value" data-first="desc">${e(metric)}</th></tr></thead><tbody>${shown.map((p, i) => `<tr><td data-col="rank">${from + i}</td><th scope="row" data-col="name">${W.pool.some(x => x.id === p.id) ? `<button data-league-player="${e(p.id)}">${e(p.name)}</button>` : `<strong>${e(p.name)}</strong>`}</th><td data-col="club"><button data-world-club="${e(p.club)}">${e(p.club)}</button></td><td data-col="pos">${e(p.pos)}</td><td data-col="value">${p[metric]}</td></tr>`).join('')}</tbody></table></div>`
        : '<p class="cp-muted">No player reaches that mark in this category. Lower the minimum or widen the filter.</p>';
      panel = `<div class="comp-board"><header class="comp-panel-head"><h3>Leaders</h3><small>${ranked.length} ${ranked.length === 1 ? 'player' : 'players'} ranked by ${e(NOUN[metric] || metric)}</small></header><nav class="comp-metrics" aria-label="Leader category">${METS.map(([value, label]) => `<button type="button" data-comp-metric="${value}" aria-pressed="${value === metric}">${label}</button>`).join('')}</nav>${filters}${table}${ranked.length ? `<p class="tl-range" data-tl-meta>Showing ${from} to ${to} of ${ranked.length} ${ranked.length === 1 ? 'player' : 'players'}</p><div class="lead-pager"><button type="button" data-leader-page="-1" ${pageIdx <= 0 ? 'disabled' : ''}>Previous</button><span>Page ${pageIdx + 1} of ${pages}</span><button type="button" data-leader-page="1" ${pageIdx >= pages - 1 ? 'disabled' : ''}>Next</button></div>` : ''}</div>`;
    } else {
      panel = `<div class="comp-board"><header><small>LEAGUE STANDINGS</small><span>Round ${rounds} · ${base.rows.length} clubs · ${dayText(W.date(s.day))}</span></header><div class="comp-scroll" tabindex="0" aria-label="District standings, scroll for all statistics"><table data-sort-table="standings" data-tl-table="cards" data-tl-layout="table"><thead><tr>${['#', 'Club', 'GP', 'W', 'D', 'L', 'GS', 'GC', 'GD', 'Pts', 'Last five'].map(k => `<th${k === '#' ? ' data-col="rank"' : k === 'Club' ? ' data-col="club"' : k === 'Pts' ? ' data-col="pts" data-label="Pts"' : k === 'Last five' ? ' data-col="form"' : ` data-label="${k}"`}>${k}</th>`).join('')}</tr></thead><tbody>${field.rows.map((r, i) => `${r.tier && r.rank === 1 ? `<tr class="tier-heading"><th colspan="11">${r.tier === 1 ? 'DIVISION ONE · Championship' : 'DIVISION TWO · Promotion race'}</th></tr>` : ''}<tr><td data-col="rank" class="${r.p ? (i === 0 ? 'top' : i === field.rows.length - 1 ? 'low' : '') : ''}">${r.rank || i + 1}</td><th scope="row" data-col="club">${g.TLWorldGuide.club(n, r.name)}</th>${['p', 'w', 'd', 'l', 'gs', 'gc', 'gd', 'pts'].map(k => k === 'pts' ? `<td data-col="pts">${r[k]}</td>` : `<td data-label="${k.toUpperCase()}">${k === 'gd' && r[k] > 0 ? '+' : ''}${r[k]}</td>`).join('')}<td data-col="form">${r.form.slice(-5).map(v => `<i class="form-${v}">${v}</i>`).join('') || '–'}</td></tr>`).join('')}</tbody></table></div><p>🟢 Leader　 🟠 Bottom place <small>${field.rows[0]?.tier ? 'Division Two winners go up. Last in Division One goes down.' : 'Qualifying season: the top three earn Division One places next campaign.'}</small></p></div>`;
    }

    return `<section class="comp-room" style="--nation:hsl(${h} 72% 72%);--deep:hsl(${h} 40% 22%)"><header class="comp-hero">${art(cups ? 'silverware' : 'terrace')}<div><small>${e(country?.continent || 'MERIDIAN')}　 /　 COMPETITION CENTRE</small><h2>${e(n)}<br>${competition}</h2><span>${cups ? 'Competition directory' : base.rows.length + ' clubs　·　Round ' + rounds}</span></div><b>${e(code)}</b></header>${trail}<div class="comp-tools"><label>Association <select data-comp-country>${Object.keys(W.nations).map(x => `<option ${x === n ? 'selected' : ''}>${e(x)}${g.TLFASeason.major(s, x, season) ? ' · major league' : ''}</option>`).join('')}</select></label><button data-life="go" data-v="atlas">Atlas</button></div><p class="org-agenda comp-note"><small data-offline-status>${e(g.TLOffline?.status() || 'Local competition data')}</small>${s.atlasLeagueFrom > season ? ` · Major leagues begin in July ${s.atlasLeagueFrom} in this save.` : ''}</p><nav class="comp-tabs" aria-label="Competition views"><div class="comp-tabs-main" role="group" aria-label="Views">${tabs(VIEWS, tab)}</div><div class="comp-tabs-records" role="group" aria-label="Records"><span class="comp-tabs-label">Records</span>${tabs(RECORDS, tab)}</div></nav>${panel}</section>`;
  }
  const api = { render, VIEWS, RECORDS, groupRounds, roundsFor, scoreOf, spanText, inGroup, POS_GROUPS };
  g.TLCompetitionRoom = api;
  if (typeof module !== 'undefined') module.exports = api;
})(window);
