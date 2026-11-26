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
    const staffSharpnessBonus = Math.min(4, Math.floor(coaches.length / 2));
    const workload=s.dressing?.workload||{},trainingSessions=team.reduce((n,p)=>n+(workload[p.id]?.sessions||0),0),coachedContributions=team.reduce((n,p)=>n+(workload[p.id]?.coached||0),0),groundSessions=team.reduce((n,p)=>n+(workload[p.id]?.ground||0),0);
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
        <article class="org-agenda"><h3>Squad readiness</h3>${rows.length ? `<table class="cp-table tr-table" data-tl-table="cards"><thead><tr><th scope="col" data-col="name">Player</th><th scope="col" data-col="sharp">Sharp</th><th scope="col" data-col="fit">Fit</th><th scope="col" data-col="status">Status</th></tr></thead><tbody>${(()=>{const rank=v=>!v?2:v.knock?0:v.sharp<60?1:v.sharp<75?2:3,label=r=>r===0?'In recovery':r===1?'Needs work':r===2?'Building':'Match ready';const sorted=rows.slice().sort((a,b)=>{const ra=rank(a.v),rb=rank(b.v);return ra!==rb?ra-rb:(a.v?.sharp??0)-(b.v?.sharp??0);});let last=null,out='';for(const {p,v} of sorted){const r=rank(v);if(r!==last){const n=sorted.filter(x=>rank(x.v)===r).length;out+=`<tr class="tr-group" data-group="${r}"><th colspan="4" scope="colgroup">${label(r)} · ${n}</th></tr>`;last=r;}const [text,tone]=status(v),back=v&&v.injuredUntil>s.day?`back ${day(v.injuredUntil)}`:'';out+=`<tr><td data-col="name">${esc(p.name)}<small>${esc(p.pos)} · ${workload[p.id]?.sessions||0} sessions · ${(workload[p.id]?.minutes||0).toLocaleString('en-GB')} minutes</small></td><td data-col="sharp">${v ? v.sharp + '%' : '–'}</td><td data-col="fit">${v ? v.fitness + '%' : '–'}</td><td data-col="status"><span class="dv-tag ${tone}">${esc(text)}</span>${back?`<small>${esc(back)}</small>`:''}</td></tr>`;}return out;})()}</tbody></table>` : '<p class="cp-muted">No players registered yet.</p>'}</article>
        <article class="org-agenda"><h3>The sessions</h3><p>Team practice lifts sharpness across the squad by 6 points plus up to 4 from the coaching team, and costs condition. Players in recovery sit it out.</p><p class="cp-muted">${coaches.length ? `Coaching team: ${esc(coaches.join(', '))}. Current team-practice coaching bonus: +${staffSharpnessBonus} sharpness.` : 'No coaching staff appointed. Appoint a coach to improve team practice. Your own team session remains available.'}</p><p class="cp-muted">Delegated assignments run weekly on Continue and are separate from your team-wide session. Their player-specific work and monthly ratings are reported below.</p><div class="cp-actions"><button data-life="go" data-v="staff">Staff</button><button data-life="go" data-v="development">Player development</button></div></article>
        <article class="org-agenda"><h3>Season training record</h3><p class="cp-muted">Player-level totals from completed sessions and matchdays this season.</p><dl class="tr-record"><div><dt>Team sessions</dt><dd>${trainingSessions}</dd></div><div><dt>Coach contributions</dt><dd>${coachedContributions}</dd></div><div><dt>Ground sessions</dt><dd>${groundSessions}</dd></div></dl></article>
      </div>
      ${g.TLStaffOffice?.reportPanel?.(s, 'training') || ''}
    </section>`;
  }
  g.TLTrainingRoom = { render };
  if (typeof module !== 'undefined') module.exports = g.TLTrainingRoom;
})(typeof window === 'undefined' ? globalThis : window);
