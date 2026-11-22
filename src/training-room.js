/* Career training ground: the weekly plan, sharpness and who is ready to play. */
(function (g) {
  'use strict';
  const U = g.TLClubUI || {};
  const esc = U.esc || String;
  const art = U.art || (() => '');
  const W = () => g.TLManagerLife;
  const day = d => W().date(Number(d) || 0);
  function state(s, p) {
    try { return g.TLDynamics?.state?.(s, p) || null; } catch { return null; }
  }
  function render(s, players) {
    const team = players || [];
    const club = s.club?.name || 'your club';
    const staff = s.staff || [];
    const coaches = staff.filter(name => ['Assistant coach','Head coach','Tactical coach','Goalkeeping coach','Fitness coach','Youth development coach','Academy manager'].includes(name));
    const leadCoach = staff.includes('Head coach') ? 'Head coach' : staff.includes('Assistant coach') ? 'Assistant coach' : coaches[0];
    const rows = team.map(p => ({ p, v: state(s, p) }));
    const ready = rows.filter(r => r.v && !r.v.knock && r.v.sharp >= 75 && r.v.fitness >= 70);
    const loading = rows.filter(r => r.v && !r.v.knock && (r.v.sharp < 75 || r.v.fitness < 70));
    const out = rows.filter(r => r.v?.knock);
    const next = (s.plans || []).filter(e => e.kind === 'training').sort((a, b) => a.due - b.due)[0];
    const pending = (s.plans || []).some(e => e.kind === 'training');
    const counter = (label, value, note) => `<div><small>${esc(label)}</small><b>${esc(value)}</b><em>${esc(note)}</em></div>`;
    const status = v => !v ? ['No data', 'info'] : v.knock ? ['In recovery', 'bad'] : v.sharp < 60 ? ['Needs work', 'warn'] : v.sharp < 75 ? ['Building', 'info'] : ['Match ready', 'good'];
    const week = Array.from({ length: 7 }, (_, i) => {
      const d = s.day + i;
      const plan = (s.plans || []).filter(e => e.due === d);
      return `<div class="tr-day${i === 0 ? ' tr-today' : ''}"><small>${i === 0 ? 'Today' : day(d).slice(5)}</small>${plan.length ? plan.map(e => `<span class="tr-chip">${esc(e.kind === 'training' ? 'Team practice' : e.kind)}</span>`).join('') : '<span class="tr-chip tr-none">Rest</span>'}</div>`;
    }).join('');
    return `<section class="org training-room">
      <header class="org-cover">${art('training')}<div><small>TRAINING GROUND · ${esc(club).toUpperCase()}</small><h2>Training &amp; readiness</h2><p>Plan the week, rebuild sharpness and protect the players who are struggling.</p></div></header>
      <div class="cp-kpis">${[
        counter('Match ready', `${ready.length}`, `of ${team.length} players`),
        counter('Building', `${loading.length}`, 'Below full sharpness'),
        counter('In recovery', `${out.length}`, 'Carrying a knock'),
        counter('Next session', next ? day(next.due) : pending ? 'Planned' : 'None booked', leadCoach ? `${esc(leadCoach)} leads · ${coaches.length} coaches appointed` : 'Take the session yourself'),
      ].join('')}</div>
      <div class="cp-grid">
        <article class="org-agenda"><h3>This week</h3><div class="tr-week">${week}</div>${team.length ? `<div class="cp-actions">${pending ? '<button data-life="go" data-v="day">Open the calendar</button>' : '<button data-life="train">Schedule team practice tomorrow</button>'}<button data-life="go" data-v="medical">Medical centre</button></div>` : '<p class="cp-muted">Recruit players before planning sessions.</p>'}</article>
        <article class="org-agenda"><h3>Squad readiness</h3>${rows.length ? `<table class="cp-table tr-table"><thead><tr><th scope="col">Player</th><th scope="col">Sharp</th><th scope="col">Fit</th><th scope="col">Status</th></tr></thead><tbody>${rows.slice().sort((a, b) => (a.v?.sharp ?? 0) - (b.v?.sharp ?? 0)).map(({ p, v }) => { const [label, tone] = status(v); return `<tr><td>${esc(p.name)}<small>${esc(p.pos)}</small></td><td>${v ? v.sharp + '%' : '–'}</td><td>${v ? v.fitness + '%' : '–'}</td><td><span class="dv-tag ${tone}">${esc(label)}</span></td></tr>`; }).join('')}</tbody></table>` : '<p class="cp-muted">No players registered yet.</p>'}</article>
        <article class="org-agenda"><h3>The sessions</h3><p>Team practice lifts sharpness across the squad and costs condition. Players in recovery sit it out.</p><p class="cp-muted">${coaches.length ? `Coaching team: ${esc(coaches.join(', '))}.` : 'No coaching staff appointed. Appoint an assistant or head coach to delegate sessions.'}</p><div class="cp-actions"><button data-life="go" data-v="staff">Staff</button><button data-life="go" data-v="development">Player development</button></div></article>
      </div>
    </section>`;
  }
  g.TLTrainingRoom = { render };
  if (typeof module !== 'undefined') module.exports = g.TLTrainingRoom;
})(typeof window === 'undefined' ? globalThis : window);
