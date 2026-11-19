/* Sample club readiness screens for the medical and training links in this pass. */
(function (global) {
  'use strict';
  const {M,U,preview,section,player,stage,dayName,longDate,sessionClass,sessionIcon}=global.TLMatchdayUI;
  const {H,C,icon,esc,tag,avatar,tabs,link,table,tr,stamp,values}=U;
  const riskTone=risk=>risk==='High'?'bad':risk==='Low'?'good':'warn';
  function riskTable(c){
    return table('Risk assessment',['Player','Match load','Training load','Susceptibility','Overall risk'],C.medical.map(r=>tr([player(r.id),`<b class="cc-${r.match==='Heavy'?'warn':'info'}">${r.match}</b>`,`<b class="cc-${r.training==='Heavy'?'bad':'info'}">${r.training}</b>`,r.susceptibility,tag(`${r.risk} risk`,riskTone(r.risk))])), 'md-medical-risk','cc-risk-table');
  }
  const medicalCopy=c=>{
    const out=C.medical.find(x=>x.status==='Out');
    return `<div class="md-medical-grid"><section class="cc-card md-injury-report"><div class="md-report-byline">${avatar(c,C.namedStaff['Head of Sports Science'])}<div><p class="cc-eyebrow">Head of Sports Science</p><h2>${esc(C.namedStaff['Head of Sports Science'])} · Injury risk update</h2></div>${tag('Injuries','bad')}</div><div class="cc-prose"><p>There are three first-team fixtures in seven days. ${player(out.id)} remains unavailable with a ${esc(out.issue.toLowerCase())}; the expected recovery window is ${out.return}.</p><p>${player('rvr_12')} and ${player('rvr_14')} can be selected for the cup tie. The medical team recommends lighter individual work until the next assessment.</p></div><div class="md-risk-summary"><div><small>Fixtures</small><b>3 in 7 days</b></div><div><small>Training workload</small><b>Medium</b></div><div><small>Unavailable</small><b>1 first-team player</b></div></div><h3 class="cc-title">Risk assessment</h3>${riskTable(c)}<div class="cc-actions">${link('training','Team training')}${link('squad','Injury table','medical')}${stage('touchline','In-play injury example')}</div></section><aside class="cc-card md-treatment"><h2 class="cc-title">Treatment room</h2><div class="cc-person">${avatar(c,C.players[out.id].name,out.id,'cc-avatar-lg')}<div>${player(out.id)}<p>${tag(out.status,'bad')}</p></div></div>${values([['Injury',out.issue],['Estimated return',out.return],['Plan','Individual recovery'],['Next assessment','Thursday 31 October']])}<hr><h3>Medical staff</h3><p>${esc(C.namedStaff['Head Physio'])} · Head Physio</p>${link('staff','Medical staff','medical')}</aside></div>`;
  };
  const timeSlots=['09:30','13:30','16:00'];
  const sessionList=(arr,date)=>`<div class="md-session-stack">${arr.map((label,i)=>`<span class="md-session md-session-${sessionClass(label)}">${sessionIcon(label)?icon(sessionIcon(label)):''}<span>${esc(label)}</span>${date?`<small>${timeSlots[i]}</small>`:''}</span>`).join('')}</div>`;
  const trainingDays=M.plan.slice(1,8);
  function training(c){
    const d=trainingDays.find(x=>x.id===c.r.id)||trainingDays[0];
    return `${preview('Training preview','Illustrative sessions · No workload or timetable is changed.',stage('calendar','Matchday calendar'))}${section('First-team training','October–November 2024 · Cup preparation',link('medical','Injury update'))}<div class="md-training-grid"><div class="cc-card md-training-schedule"><h2 class="cc-title">Weekly schedule</h2>${trainingDays.map(day=>`<div class="md-training-row${d===day?' md-training-selected':''}"><div><strong>${esc(dayName(day.date))}</strong><small>${H.calendar(day.date).date}</small></div>${sessionList(day.sessions,false)}${link('training','Details','week',day.id,'outline')}</div>`).join('')}</div><aside class="cc-card md-session-detail"><span class="cc-eyebrow">Session details</span><h2>${esc(longDate(d.date))}</h2>${d.fixture?`<p class="cc-icon-text">${icon('cup')}${esc(H.clubs[d.fixture.opponent].name)} · ${stamp(d.fixture.date)}</p>`:''}${sessionList(d.sessions,true)}<hr>${values([['Unit','First team'],['Workload',d.sessions.includes('Recovery')?'Light':'Medium'],['Session lead',C.namedStaff['Assistant Manager']]])}<p class="cc-muted">Weekly timetable shown for review; players’ attributes and fitness are unchanged.</p></aside></div>`;
  }
  U.views.medical={title:'Medical Centre',tabs:tabs(['overview','Injury Update']),render:c=>`${preview('Medical preview','Starter-season advisory and sample recovery plan.',link('training','Training'))}${medicalCopy(c)}`};
  U.views.training={title:'Training',tabs:tabs(['week','Weekly Schedule']),render:training};
  global.TLClubReadiness={riskTable,sessionList};
})(window);
