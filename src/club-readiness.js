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
    return table('Current availability',['Player','Condition','Issue','Status','Expected return'],fitness(c).map(x=>tr([player(x.p.id),condition(x.today),esc(x.issue),tag(x.status,x.out?'bad':x.today<92?'warn':'good'),x.out?H.calendar(x.returnDate).date:'Not set'])), 'md-medical-risk','cc-risk-table');
  }
  function medical(c){
    const s=c.season.value,out=fitness(c).filter(p=>p.out), soon=c.fixtures().filter(f=>!f.score&&K.day(f.date)<K.day(c.now)+7*K.DAY).length;
    const light=s.answers['load-review']==='light';
    return `${section('First-team medical update',H.calendar(c.now).long,link('training','Training'))}<div class="md-medical-grid"><section class="cc-card md-injury-report"><div class="md-report-byline">${avatar(c,C.namedStaff['Head of Sports Science'])}<div><p class="cc-eyebrow">Head of Sports Science</p><h2>${esc(C.namedStaff['Head of Sports Science'])} · Player readiness</h2></div>${tag('Medical','bad')}</div><div class="cc-prose"><p>${out.length?`${out.length} ${out.length===1?'player is':'players are'} unavailable for selection.`:'The first team has no current injury absences.'} Starting condition includes recovery from completed fixtures.</p></div><div class="md-risk-summary"><div><small>Fixtures</small><b>${soon} in 7 days</b></div><div><small>Training programme</small><b>${K.iso(c.now)<='2024-10-30'&&light?'Individual recovery':'Standard programme'}</b></div><div><small>Unavailable</small><b>${out.length} first-team ${out.length===1?'player':'players'}</b></div></div><h3 class="cc-title">Availability</h3>${riskTable(c)}<div class="cc-actions">${link('training','Team training')}${link('squad','Injury table','medical')}</div></section><aside class="cc-card md-treatment"><h2 class="cc-title">Treatment room</h2>${out.length?out.map(({p,returnDate,issue})=>`<div class="cc-person">${avatar(c,p.name,p.id,'cc-avatar-lg')}<div>${player(p.id)}<p>${esc(issue)} · ${H.shortDate(returnDate)}</p></div></div>`).join(''):empty('No players in treatment')}<hr><h3>Medical staff</h3><p>${esc(C.namedStaff['Head Physio'])} · Head Physio</p>${link('staff','Medical staff','medical')}</aside></div>`;
  }
  const sessionList=(arr,withTime)=>`<div class="md-session-stack">${arr.map(({label,time})=>`<span class="md-session md-session-${sessionClass(label)}">${sessionIcon(label)?icon(sessionIcon(label)):''}<span>${esc(label)}</span>${withTime?`<small>${stamp(time)}</small>`:''}</span>`).join('')}</div>`;
  function training(c){
    const s=c.season.value, current=K.day(c.now), requested=Date.parse(c.r.id), chosen=Number.isFinite(requested)&&Math.abs(requested-current)<60*K.DAY?requested:current;
    const start=chosen-K.DAY;
    const range=Array.from({length:7},(_,i)=>start+i*K.DAY);
    const sessions=t=>S.activities(s,t).filter(a=>a.kind==='training'||a.kind==='fixture');
    const selected=sessions(chosen), f=K.onDate(s,chosen).find(K.isClub);
    return `${section('First-team training',`${longDate(range[0])} – ${longDate(range.at(-1))}`,link('day','Club calendar','today'))}<div class="md-training-grid"><div class="cc-card md-training-schedule"><h2 class="cc-title">Weekly schedule</h2>${range.map(t=>`<div class="md-training-row${t===chosen?' md-training-selected':''}"><div><strong>${esc(dayName(t))}</strong><small>${H.calendar(t).date}</small></div>${sessionList(sessions(t),false)}${link('training','Details','week',K.iso(t),'outline')}</div>`).join('')}</div><aside class="cc-card md-session-detail"><span class="cc-eyebrow">Session details</span><h2>${esc(longDate(chosen))}</h2>${f?`<p class="cc-icon-text">${icon('cup')}${esc(H.clubs[f.home].short)} v ${esc(H.clubs[f.away].short)} · ${stamp(f.date)}</p>`:''}${sessionList(selected,true)}<hr>${values([['Unit','First team'],['Session lead',C.namedStaff['Assistant Manager']],['Workload',selected.some(a=>a.label.includes('Recovery'))?'Light':'Standard']])}${K.iso(chosen)<='2024-10-30'&&c.mail().some(x=>x.id==='load-review')?link('inbox','Training load decision','messages','load-review'):''}</aside></div>`;
  }
  U.views.medical={title:'Medical Centre',tabs:tabs(['overview','Injury Update']),render:medical};
  U.views.training={title:'Training',tabs:tabs(['week','Weekly Schedule']),render:training};
  global.TLClubReadiness={riskTable,sessionList,fitness};
})(window);
