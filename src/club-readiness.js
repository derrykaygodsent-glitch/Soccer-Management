/* Shared rolling training sessions and current first-team availability. */
(function(global){
  'use strict';
  const {M,U,section,player,condition,dayName,longDate,sessionClass,sessionIcon}=global.TLMatchdayUI;
  const S=global.TLSeasonState,K=global.TLSeasonCalendar;
  const {H,C,icon,esc,tag,avatar,tabs,link,table,tr,stamp,values,empty}=U;
  function fitness(c){
    const s=c.season.value;
    return C.roster.map(p=>S.availability(s,p.id)).sort((a,b)=>Number(b.out)-Number(a.out)||a.today-b.today);
  }
  function riskTable(c){
    return table('Current availability',['Player','Condition','Issue','Status','Expected return'],fitness(c).map(x=>tr([player(x.p.id),condition(x.today),esc(x.issue),tag(x.status,x.out?'bad':x.today<92?'warn':'good'),x.out?H.calendar(x.returnDate).date:'–'])), 'md-medical-risk','cc-risk-table');
  }
  function medical(c){
    const s=c.season.value,out=fitness(c).filter(p=>p.out), soon=c.fixtures().filter(f=>!f.score&&K.day(f.date)<K.day(c.now)+7*K.DAY).length;
    const light=s.answers['load-review']==='light';
    const backSoon=fitness(c).filter(x=>x.out&&x.returnDate<=K.day(c.now)+7*K.DAY).length;
    const ok=fitness(c).filter(x=>!x.out&&x.status==='Available').length;
    return `${section('First-team medical update',H.calendar(c.now).long,link('training','Team training'))}<div class="cc-medical-grid"><section class="cc-panel cc-injury-ward"><h2 class="cc-title">Treatment room</h2><div class="cc-med-summary"><div class="cc-med-metric"><strong>${out.length}</strong><p>Unavailable</p></div><div class="cc-med-metric"><strong>${backSoon}</strong><p>Back within 7 days</p></div><div class="cc-med-metric"><strong>${ok}</strong><p>Available for selection</p></div></div>${out.length?out.map(({p,returnDate,issue})=>`<div class="cc-injury-card"><div class="cc-person">${avatar(c,p.name,p.id,'cc-avatar-lg')}<div>${player(p.id)}<p>${esc(issue)} · Expected back ${H.shortDate(returnDate)}</p></div></div><span class="cc-tag bad">Out</span></div>`).join(''):empty('No players in treatment','The first team has no current injury absences.')}</section><aside class="cc-medical-aside"><section class="cc-panel"><h2 class="cc-title">Squad availability</h2>${riskTable(c)}</section><section class="cc-panel"><h2 class="cc-title">Medical staff</h2><p>${esc(C.namedStaff['Head Physio'])} · Head Physio</p><p>${esc(C.namedStaff['Chief Doctor'])} · Chief Doctor</p><p>${esc(C.namedStaff['Head of Sports Science'])} · Head of Sports Science</p>${link('staff','Medical staff directory','medical')}</section></aside></div>`;
  }
  const sessionList=(arr,withTime)=>`<div class="md-session-stack">${arr.map(({label,time})=>`<span class="md-session md-session-${sessionClass(label)}">${sessionIcon(label)?icon(sessionIcon(label)):''}<span>${esc(label)}</span>${withTime?`<small>${stamp(time)}</small>`:''}</span>`).join('')}</div>`;
  function training(c){
    const s=c.season.value, current=K.day(c.now);
    const start=current-K.DAY;
    const range=Array.from({length:7},(_,i)=>start+i*K.DAY);
    const sessions=t=>S.activities(s,t).filter(a=>a.kind==='training'||a.kind==='fixture');
    const requested=Date.parse(c.r.id), chosen=Number.isFinite(requested)&&Math.abs(requested-current)<60*K.DAY?requested:current;
    const selected=sessions(chosen), f=K.onDate(s,chosen).find(K.isClub);
    const load=selected.some(a=>a.label.includes('Recovery'))?'Light':'Standard';
    const roster=fitness(c);
    return `${section('First-team training',`${longDate(range[0])} – ${longDate(range.at(-1))}`,link('day','Club calendar','today'))}<div class="cc-training-grid"><div class="cc-tr-week">${range.map(t=>{const ss=sessions(t);const fx=K.onDate(s,t).find(K.isClub);return `<div class="cc-tr-day${t===chosen?' cc-tr-selected':''}"><div class="cc-tr-day-head"><strong>${esc(dayName(t)).slice(0,3)}</strong><small>${H.calendar(t).date}</small></div><div class="cc-tr-sessions">${ss.map(a=>`<span class="cc-tr-session${a.kind==='fixture'?' cc-tr-fixture':''}">${a.kind==='fixture'?icon('cup'):sessionIcon(a.label)?icon(sessionIcon(a.label)):''}<span>${esc(a.label)}</span>${a.time?`<small>${stamp(a.time)}</small>`:''}</span>`).join('')}${fx?`<span class="cc-tr-session cc-tr-fixture">${icon('cup')}<span>${esc(H.clubs[fx.home].short)} v ${esc(H.clubs[fx.away].short)}</span></span>`:''}</div>${link('training','Details','week',K.iso(t),'outline')}</div>`;}).join('')}</div><aside class="cc-tr-detail"><span class="cc-eyebrow">Session details</span><h2>${esc(longDate(chosen))}</h2>${f?`<p class="cc-icon-text">${icon('cup')}${esc(H.clubs[f.home].short)} v ${esc(H.clubs[f.away].short)} · ${stamp(f.date)}</p>`:''}${selected.length?`<div class="cc-tr-list">${selected.map(a=>`<div><span>${stamp(a.time)}</span><span>${esc(a.label)}</span><p>${esc(a.desc)}</p></div>`).join('')}</div>`:'<p class="cc-muted">No sessions planned.</p>'}<hr>${values([['Unit','First team'],['Session lead',C.namedStaff['Assistant Manager']],['Workload',load]])}${K.iso(chosen)<='2026-10-30'&&c.mail().some(x=>x.id==='load-review')?link('inbox','Training load decision','messages','load-review'):''}</aside></div><section class="cc-panel cc-tr-readiness"><h2 class="cc-title">Squad readiness</h2><div class="cc-tr-readiness-row">${[['Available',roster.filter(x=>!x.out&&x.status==='Available').length,'good'],['Managing load',roster.filter(x=>!x.out&&x.status==='Managing load').length,'warn'],['Unavailable',roster.filter(x=>x.out).length,'bad']].map(([k,v,t])=>`<div class="cc-med-metric"><strong>${v}</strong><p>${esc(k)}</p><span class="cc-tag cc-${t}">${esc(t)}</span></div>`).join('')}</div><p class="cc-muted">Condition rebuilds between fixtures; recovery sessions follow matchdays.</p>${link('medical','Injury update')}</section>`;
  }
  U.views.medical={title:'Medical Centre',tabs:tabs(['overview','Injury Update']),render:medical};
  U.views.training={title:'Training',tabs:tabs(['week','Weekly Schedule']),render:training};
  global.TLClubReadiness={riskTable,sessionList,fitness};
})(window);
