/* Career player development: projected growth, minutes and the path to the first team. */
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
    const w = D().ROLE_WEIGHTS?.[p.pos==='CB'?'DC':p.pos];
    if (!w) return 0;
    return Math.max(0,Math.min(100,Math.round(100*w(p.attrs||{})/w(maximum))));
  }
  // Reuse the player model’s individual estimated ceiling rather than assigning the same age band to every prospect.
  function ceiling(p) {
    const current = ability(p);
    try {
      const projected = g.TLZones?.ability?.(p)?.pa;
      if (Number.isFinite(projected)) return Math.max(current, Math.min(100, Math.round(projected / 2)));
    } catch {}
    const room = p.age <= 17 ? 22 : p.age <= 19 ? 16 : p.age <= 21 ? 11 : p.age <= 23 ? 6 : 2;
    return Math.min(99, current + room);
  }
  function training(s, p) {
    try { return g.TLDynamics?.state?.(s, p) || null; } catch { return null; }
  }
  function minutes(s, p) {
    try { return s.dressing?.workload?.[p.id]?.minutes || 0; } catch { return 0; }
  }
  function sessions(s, p) {
    try { return s.dressing?.workload?.[p.id]?.sessions || 0; } catch { return 0; }
  }
  function staffProgress(s,p){const row=s.staffGrowth?.[p.id]||{};return {sessions:Number(row.sessions)||0,block:Math.max(0,Math.min(3,Number(row.points)||0))};}
  function attributeName(key){return String(key).replace(/([A-Z])/g,' $1').replace(/^./,x=>x.toUpperCase());}
  function changes(s,p){const logs=(s.playerGrowth?.[p.id]?.log||[]).filter(x=>Number.isFinite(Number(x.delta))&&Number(x.delta)!==0&&Number.isFinite(Number(x.day))&&s.day>=x.day&&s.day-x.day<=180).map(x=>({attribute:x.attribute,delta:Number(x.delta),source:x.staff||x.source||'Youth development staff',day:x.day}));const seen=new Set(logs.map(x=>x.attribute));for(const [attribute,delta] of Object.entries(p.change||{}))if(Number(delta)&&!seen.has(attribute))logs.push({attribute,delta:Number(delta),source:'Last season review',day:null});return logs.sort((a,b)=>(b.day??-Infinity)-(a.day??-Infinity)).slice(0,3);}
  function bar(cur, top, label) {
    const seg = n => `<span class="dv-seg ${n < cur ? 'full' : n < top ? 'empty' : 'gap'}"></span>`;
    return `<span class="dv-bar" aria-label="${esc(label)}: ${cur} now, ${top} projected"><span class="dv-track">${Array.from({ length: 10 }, (_, i) => seg(i * 10)).join('')}</span><b>${cur} to ${top}</b></span>`;
  }
  function staleness(v) {
    if (!v) return ['No data', 'info'];
    if (v.knock) return ['Knock', 'bad'];
    if (v.sharp < 55) return ['Needs training', 'warn'];
    if (v.sharp < 75) return ['Building sharpness', 'info'];
    return ['Match ready', 'good'];
  }
  function card(s, p) {
    const v = training(s, p), a = ability(p), c = ceiling(p), [state, tone] = staleness(v);
    const mins = minutes(s, p), staff=staffProgress(s,p), movement=changes(s,p);
    const movementMarkup=movement.length?`<ul class="dev-movement">${movement.map(x=>`<li data-trend="${x.delta>0?'up':'down'}"><span>${x.delta>0?'UP':'DOWN'} ${x.delta>0?'+':''}${x.delta}</span><b>${esc(attributeName(x.attribute))}</b><small>${esc(x.source)}${x.day==null?'':' · '+day(x.day)}</small></li>`).join('')}</ul>`:'<p class="dev-no-movement">No individual attribute change is recorded yet. Staff sessions and match opportunities are tracked separately.</p>';
    const coachLine=staff.sessions?`${staff.sessions} staff-led sessions · ${staff.block}/4 toward the next attribute increase`:'No staff-led development session recorded yet.';
    return `<article class="dv-card"><header><div><b>${esc(p.name)}</b><small>${esc(p.pos)} · age ${p.age} · ${esc(p.nation || '')}</small></div><span class="dv-tag ${tone}">${esc(state)}</span></header>
      ${bar(a, c, p.name)}<p class="dev-ceiling-note">Estimated potential uses this player’s individual ceiling; it is a projection, not a promise.</p>
      <p class="dv-meta"><span>Sharpness <b>${v ? v.sharp + '%' : '–'}</b></span><span>Condition <b>${v ? v.fitness + '%' : '–'}</b></span><span>Match minutes <b>${mins ? mins.toLocaleString('en-GB') : 0}</b></span><span>Team sessions <b>${sessions(s,p)}</b></span></p>
      <section class="dev-progress"><h4>Individual progress</h4>${movementMarkup}<p class="dev-staff-progress">Youth coaching · ${esc(coachLine)}</p></section>
      <p class="dv-advice">${esc(advice(p, a, c, v, mins, s))}</p></article>`;
  }
  function advice(p, a, c, v, mins, s) {
    if (v?.knock) return 'Recover first. Development sessions resume when the knock clears.';
    if (p.age <= 19 && mins < 300) return 'Give minutes in the district side or a friendly to turn potential into progress.';
    if (p.age <= 21 && !(s.staffGrowth?.[p.id]?.sessions||0)) return 'No staff-led development session is recorded yet. Assign a Youth development coach or Academy manager in Staff.';
    if (v && v.sharp < 65) return 'Schedule team practice. Sharpness is the quickest lever on match performance.';
    if (c - a <= 4) return 'Close to the estimated ceiling. Senior minutes or a new challenge may matter more than additional coaching.';
    return 'On track. Keep training and rotate him into the first team when the schedule allows.';
  }
  function render(s) {
    const team = (s.roster || []).map(id => (W().pool || []).find(p => p.id === id)).filter(Boolean);
    const youth = team.filter(p => p.age <= 21).sort((a, b) => ceiling(b) - ability(b) - (ceiling(a) - ability(a)) || b.age - a.age);
    const club = s.club?.name || 'your club';
    const growth = youth.filter(p => ceiling(p) - ability(p) >= 8);
    const ready = youth.filter(p => ability(p) >= 60 && !training(s, p)?.knock);
    const avgAge = team.length ? (team.reduce((n, p) => n + p.age, 0) / team.length).toFixed(1) : '–';
    const best = youth.slice().sort((a,b)=>ceiling(b)-ceiling(a))[0];
    const youthMinutes = youth.reduce((n, p) => n + minutes(s, p), 0);
    const counter = (label, value, note) => `<div><small>${esc(label)}</small><b>${esc(value)}</b><em>${esc(note)}</em></div>`;
    if (!team.length) {
      return `<section class="org"><header class="org-cover">${art('training')}<div><small>ACADEMY &amp; PATHWAY</small><h2>Player development</h2><p>No players to develop yet.</p></div></header><article class="org-agenda"><h3>Build the pathway</h3><p>Once players are registered, this page tracks their growth, sharpness and the minutes that turn potential into a first-team place.</p><button data-life="go" data-v="scouting">Open scouting</button></article>${g.TLStaffOffice?.reportPanel?.(s, 'development') || ''}</section>`;
    }
    return `<section class="org dev-page">
      <header class="org-cover">${art('training')}<div><small>ACADEMY &amp; PATHWAY · ${esc(club).toUpperCase()}</small><h2>Player development</h2><p>Projected growth, training load and the next first-team call-ups.</p></div></header>
      <div class="cp-kpis">${[
        counter('Under 22', `${youth.length}`, `of ${team.length} players`),
        counter('Average age', avgAge, 'First-team squad'),
        counter('Highest projected potential', best ? best.name : '–', best ? `${ability(best)} current ability · ${ceiling(best)} estimated potential` : 'No youth players'),
        counter('Youth minutes', youthMinutes.toLocaleString('en-GB'), 'Across all competitions'),
      ].join('')}</div>
      <div class="cp-grid">
        <article class="org-agenda dev-wide"><h3>Youth development · under 22</h3><p class="cp-muted">Each player has an individual current-ability and potential estimate. The estimate is not a promise; minutes, coaching, training, fitness and injuries affect what progress is realised.</p>${youth.length ? `<div class="dv-grid">${youth.map(p => card(s, p)).join('')}</div>` : '<p class="cp-muted">No player under 22 is registered. Youth signings appear here the day they join.</p>'}</article>
        <article class="org-agenda"><h3>First-team pathway</h3>${ready.length ? ready.map(p => `<div class="dv-row"><b>${esc(p.name)}</b><span>${esc(p.pos)} · ${ability(p)} current ability · ${ceiling(p)} potential estimate</span><button data-life="go" data-v="squad">Squad</button></div>`).join('') : '<p class="cp-muted">No under-22 player is currently ready for the next step. Check fitness, sharpness and match exposure before selection.</p>'}<button data-life="go" data-v="training">Plan training</button></article>
        <article class="org-agenda"><h3>Potential and headroom</h3>${growth.length ? growth.slice(0,6).map(p => `<div class="dv-row"><b>${esc(p.name)}</b><span>${ability(p)} current · ${ceiling(p)} estimate · ${ceiling(p)-ability(p)} headroom</span><span class="cp-muted">${staffProgress(s,p).sessions} staff sessions · ${minutes(s,p).toLocaleString('en-GB')} minutes</span></div>`).join('') : '<p class="cp-muted">No under-22 player currently has a large estimated gap. Potential estimates are individual, not guarantees of future growth.</p>'}<button data-life="go" data-v="scouting">Scout young players</button></article>
        <article class="org-agenda"><h3>First-team progress</h3>${team.slice().sort((a, b) => minutes(s, b) - minutes(s, a)).slice(0, 5).map(p => `<div class="dv-row"><b>${esc(p.name)}</b><span>${p.age} yrs · ${esc(p.pos)}</span><span>${minutes(s, p).toLocaleString('en-GB')} mins</span></div>`).join('')}<p class="cp-note">Minutes are recorded from competitive and practice appearances this season.</p><button data-life="go" data-v="training">Training &amp; readiness</button></article>
      </div>
      ${g.TLStaffOffice?.reportPanel?.(s, 'development') || ''}
    </section>`;
  }
  g.TLCareerDevelopment = { render, ability, ceiling };
  if (typeof module !== 'undefined') module.exports = g.TLCareerDevelopment;
})(typeof window === 'undefined' ? globalThis : window);
