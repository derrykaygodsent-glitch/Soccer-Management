/* The contract expiry queue. Renewal talks open in the last 90 days, so the screen is grouped by
   that rule and every row states the days left, the wage and what can be done today. */
(function (g) {
  'use strict';
  const e = g.TLClubUI.esc, U = g.TLClubUI, W = g.TLManagerLife;
  const BUCKETS = [
    [30, 'Ends within 30 days', 'Renewal talks are open now'],
    [60, 'Ends in 31 to 60 days', 'Renewal talks are open now'],
    [90, 'Ends in 61 to 90 days', 'Renewal talks are open now'],
    [null, 'Beyond 90 days', 'Talks open in the last 90 days']
  ];

  function lines(s, roster) {
    return roster.map(p => {
      const c = s.contracts?.[p.id];
      return { p, c, days: c ? Math.round(c.end - s.day) : null };
    });
  }
  function bucketOf(days) {
    if (days == null) return BUCKETS.length;
    for (let i = 0; i < BUCKETS.length - 1; i++) if (days <= BUCKETS[i][0]) return i;
    return BUCKETS.length - 1;
  }
  function money(n) { return W.money(n || 0); }
  function fmtDate(day) { const iso = W.date(Number(day)); const d = new Date(iso + 'T12:00:00Z'); return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); }

  function summary(s, rows) {
    const held = rows.filter(r => r.c);
    const wage = held.reduce((n, r) => n + (r.c.wage || 0), 0);
    const owed = held.reduce((n, r) => n + (r.c.arrears || 0), 0);
    const inside = held.filter(r => r.days <= 90).length;
    const tiles = [
      ['Players with terms', held.length, held.length === 1 ? 'player' : 'players'],
      ['Weekly wage bill', money(wage), 'paid each week'],
      ['Talks open now', inside, 'inside 90 days'],
      ['Wages still owed', money(owed), owed ? 'pay from club funds' : 'nothing outstanding']
    ];
    return `<div class="cp-kpis">${tiles.map(([label, value, note]) => `<div><small>${e(label)}</small><b>${e(String(value))}</b><em>${e(note)}</em></div>`).join('')}</div>`;
  }

  function row(r) {
    const { p, c, days } = r;
    const state = days == null ? 'No professional terms' : days < 0 ? 'Expired' : days <= 90 ? 'Renewal open' : 'Too early to talk';
    const tone = days == null ? '' : days < 0 ? 'bad' : days <= 90 ? 'info' : '';
    return `<tr><td data-col="name"><button type="button" data-squad-player="${e(p.id)}">${e(p.name)}</button></td>` +
      `<td data-col="pos">${e(p.pos)}</td>` +
      `<td data-col="ends" data-label="Ends">${c ? e(fmtDate(c.end)) : 'No terms'}</td>` +
      `<td data-col="days" data-key="${days == null ? 9999 : days}">${days == null ? '–' : days}</td>` +
      `<td data-col="wage" data-label="Wage" data-key="${c?.wage || 0}">${c ? money(c.wage) : '–'}</td>` +
      `<td data-col="state"><span class="dv-tag${tone ? ' ' + tone : ''}">${e(state)}</span></td></tr>`;
  }

  function render(s, roster) {
    if (!s.club) return `<section class="org contract-room"><header class="org-cover">${U.art('dressing')}<div><small>TEAM ADMINISTRATION</small><h2>Contracts</h2><p>Take charge of a club to see contract expiry.</p></div></header><p class="cp-muted">No club is registered in this career yet.</p></section>`;
    const rows = lines(s, roster).filter(r => r.c || r.p);
    const held = rows.filter(r => r.c).sort((a, b) => a.days - b.days);
    const free = rows.filter(r => !r.c);
    const groups = BUCKETS.map(([limit, label, note], i) => ({ i, label, days: limit, note }));
    const urgent = held.filter(r => r.days <= 90)[0] || held[0];
    const next = urgent
      ? `<div class="cp-next"><button type="button" class="cc-btn" data-squad-player="${e(urgent.p.id)}">Start with ${e(urgent.p.name)} · ${urgent.days} ${urgent.days === 1 ? 'day' : 'days'} left</button></div>`
      : free.length
        ? `<div class="cp-next"><button type="button" class="cc-btn" data-squad-player="${e(free[0].p.id)}">Offer terms to ${e(free[0].p.name)}</button></div>`
        : '';
    const body = groups.map(g => {
      const list = held.filter(r => bucketOf(r.days) === g.i);
      if (!list.length) return '';
      return `<tr class="tr-group" data-group="${g.i}"><th colspan="6" scope="colgroup">${e(g.label)} · ${list.length}</th></tr>${list.map(row).join('')}`;
    }).join('');
    return `<section class="org contract-room"><header class="org-cover">${U.art('dressing')}<div><small>TEAM ADMINISTRATION\u3000 /\u3000 ${e(s.club.name)}</small><h2>Contracts</h2><p>Who is under terms, how long is left, and which talks open today.</p></div></header>` +
      summary(s, rows) +
      `<article class="org-agenda"><h3>Expiry queue</h3><p class="cp-muted">Grouped by what the rules allow: talks open inside the final 90 days, and wages owed are paid from club funds before anything else.</p>` +
      next +
      `<div class="directory-scroll"><table class="cp-table tr-table" data-tl-table="cards" data-sort-table="contracts"><thead><tr><th scope="col" data-col="name">Player</th><th scope="col" data-col="pos">Position</th><th scope="col" data-col="ends">Expires</th><th scope="col" data-col="days">Days left</th><th scope="col" data-col="wage">Wage</th><th scope="col" data-col="state">Status</th></tr></thead><tbody>${body || '<tr><td colspan="6">No player is under professional terms.</td></tr>'}</tbody></table></div></article>` +
      (free.length ? `<article class="org-agenda"><small>NO PROFESSIONAL TERMS</small><h3>${free.length} ${free.length === 1 ? 'player has' : 'players have'} no contract</h3><p>Amateur squad members cost no wages. Open a player to offer professional terms from the contract desk.</p><div class="sq-list">${free.map(r => `<div data-state="ok"><button type="button" data-squad-player="${e(r.p.id)}"><b>${e(r.p.name)}</b><small>${e(r.p.pos)} · ${r.p.age}</small></button><span class="tl-status">No terms</span></div>`).join('')}</div></article>` : '') +
      `</section>`;
  }

  g.TLContractQueue = { render, lines, bucketOf };
})(window);
