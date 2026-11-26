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

  /* Dates read as a person writes them: 13 Nov 2027, never 2027-11-13. */
  const dayText = iso => { const d = new Date(String(iso) + 'T12:00:00Z'); return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); };

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
      const fixtures = g.TLFASeason.fixtures(s, n, season).sort((a, b) => a.day - b.day);
      panel = `<section class="org-agenda comp-fixtures"><header class="comp-panel-head"><h3>${e(n)} fixtures</h3><small>${fixtures.length} ${fixtures.length === 1 ? 'fixture' : 'fixtures'} this season</small></header><p class="comp-note">${e(g.TLFASeason.profiles[n][5])}</p>${fixtures.map(f => `<p data-day="${f.day}"><small>${dayText(W.date(f.day))}${g.TLFASeason.kickoff(f)}${f.day !== f.original ? ' · moved from ' + dayText(W.date(f.original)) : ''}</small>　${f.tier ? `D${f.tier} · ` : ''}<button data-world-club="${e(f.team)}">${e(f.team)}</button> v <button data-world-club="${e(f.host)}">${e(f.host)}</button></p>`).join('')}</section>`;
    } else if (tab === 'Bench') {
      panel = g.TLTechnical.render(s, n);
    } else if (tab === 'Honours') {
      panel = g.TLHonours.render(s, n);
    } else if (tab === 'Book') {
      panel = g.TLSeasonBook.render(s, n);
    } else if (cups) {
      panel = g.TLCups.render(s, n);
    } else if (stats) {
      panel = `<div class="comp-board"><header class="comp-panel-head"><h3>Leaders</h3><small>${ranked.length} ${ranked.length === 1 ? 'player' : 'players'} ranked by ${e(NOUN[metric] || metric)}</small></header><nav class="comp-metrics" aria-label="Leader category">${METS.map(([value, label]) => `<button type="button" data-comp-metric="${value}" aria-pressed="${value === metric}">${label}</button>`).join('')}</nav>${ranked.length ? `<div class="directory-scroll"><table class="player-directory" data-sort-table="leaders-${e(metric)}"><thead><tr><th>Rank</th><th>Name</th><th>Club</th><th>Position</th><th data-first="desc">${e(metric)}</th></tr></thead><tbody>${ranked.map((p, i) => `<tr><td>${i + 1}</td><th scope="row">${W.pool.some(x => x.id === p.id) ? `<button data-league-player="${e(p.id)}">${e(p.name)}</button>` : `<strong>${e(p.name)}</strong>`}</th><td><button data-world-club="${e(p.club)}">${e(p.club)}</button></td><td>${e(p.pos)}</td><td>${p[metric]}</td></tr>`).join('')}</tbody></table></div>` : '<p>No records in this category yet.</p>'}</div>`;
    } else {
      panel = `<div class="comp-board"><header><small>LEAGUE STANDINGS</small><span>Round ${rounds} · ${base.rows.length} clubs · ${dayText(W.date(s.day))}</span></header><div class="comp-scroll" tabindex="0" aria-label="District standings, scroll for all statistics"><table data-sort-table="standings" data-tl-table="cards" data-tl-layout="table"><thead><tr>${['#', 'Club', 'GP', 'W', 'D', 'L', 'GS', 'GC', 'GD', 'Pts', 'Last five'].map(k => `<th${k === '#' ? ' data-col="rank"' : k === 'Club' ? ' data-col="club"' : k === 'Pts' ? ' data-col="pts" data-label="Pts"' : k === 'Last five' ? ' data-col="form"' : ` data-label="${k}"`}>${k}</th>`).join('')}</tr></thead><tbody>${field.rows.map((r, i) => `${r.tier && r.rank === 1 ? `<tr class="tier-heading"><th colspan="11">${r.tier === 1 ? 'DIVISION ONE · Championship' : 'DIVISION TWO · Promotion race'}</th></tr>` : ''}<tr><td data-col="rank" class="${r.p ? (i === 0 ? 'top' : i === field.rows.length - 1 ? 'low' : '') : ''}">${r.rank || i + 1}</td><th scope="row" data-col="club">${g.TLWorldGuide.club(n, r.name)}</th>${['p', 'w', 'd', 'l', 'gs', 'gc', 'gd', 'pts'].map(k => k === 'pts' ? `<td data-col="pts">${r[k]}</td>` : `<td data-label="${k.toUpperCase()}">${k === 'gd' && r[k] > 0 ? '+' : ''}${r[k]}</td>`).join('')}<td data-col="form">${r.form.slice(-5).map(v => `<i class="form-${v}">${v}</i>`).join('') || '–'}</td></tr>`).join('')}</tbody></table></div><p>🟢 Leader　 🟠 Bottom place <small>${field.rows[0]?.tier ? 'Division Two winners go up. Last in Division One goes down.' : 'Qualifying season: the top three earn Division One places next campaign.'}</small></p></div>`;
    }

    return `<section class="comp-room" style="--nation:hsl(${h} 72% 72%);--deep:hsl(${h} 40% 22%)"><header class="comp-hero">${art(cups ? 'silverware' : 'terrace')}<div><small>${e(country?.continent || 'MERIDIAN')}　 /　 COMPETITION CENTRE</small><h2>${e(n)}<br>${competition}</h2><span>${cups ? 'Competition directory' : base.rows.length + ' clubs　·　Round ' + rounds}</span></div><b>${e(code)}</b></header>${trail}<div class="comp-tools"><label>Association <select data-comp-country>${Object.keys(W.nations).map(x => `<option ${x === n ? 'selected' : ''}>${e(x)}${g.TLFASeason.major(s, x, season) ? ' · major league' : ''}</option>`).join('')}</select></label><button data-life="go" data-v="atlas">Atlas</button></div><p class="org-agenda comp-note"><small data-offline-status>${e(g.TLOffline?.status() || 'Local competition data')}</small>${s.atlasLeagueFrom > season ? ` · Major leagues begin in July ${s.atlasLeagueFrom} in this save.` : ''}</p><nav class="comp-tabs" aria-label="Competition views"><div class="comp-tabs-main" role="group" aria-label="Views">${tabs(VIEWS, tab)}</div><div class="comp-tabs-records" role="group" aria-label="Records"><span class="comp-tabs-label">Records</span>${tabs(RECORDS, tab)}</div></nav>${panel}</section>`;
  }
  g.TLCompetitionRoom = { render, VIEWS, RECORDS };
})(window);
