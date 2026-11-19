/* Club profile, competitions, and board / supporter feedback. */
(function (global) {
  'use strict';
  const U=global.TLClubUI, {H,C,views,esc,icon,btn,link,card,empty,tag,values,tr,table,avatar,clubName,standings,form,meter,lookup,score,num,tabs}=U;
  const home=H.clubs[H.homeId], ground=C.club.ground;
  const player = (id) => btn(C.players[id].name,'player',id,{kind:'text'});
  const head = label => `<h2 class="cc-title">${esc(label)}</h2>`;
  const pitchCrest = tone => `<span class="cc-comp-icon cc-comp-${tone}">${icon(tone==='paper'?'shield':tone==='green'?'ball':'cup')}</span>`;
  const shellPath='M48 16 61 8Q78 18 95 8L108 16 135 28 151 69 128 78 115 58 114 157Q78 165 42 157L41 58 28 78 5 69 21 28Z';
  function kit(index, size=''){
    const [name,main,accent,trim] = C.kits[index];
    const stripe=index===1?`<path d="M42 41h72v7H42zm0 40h72v7H42zm0 40h72v7H42zm0 24h72v7H42z" fill="${accent}" opacity=".8"/>`:index===0?'<path d="M47 41h10v115H47zm24-4h10v123H71zm24 4h9v115h-9Z" fill="#70a0e3" opacity=".105"/>':'<path d="m43 35 67 56v13L43 47zm0 22 67 56v7L43 64Z" fill="#ffffff" opacity=".105"/>';
    return `<svg class="cc-kit ${esc(size)}" viewBox="0 0 156 169" role="img" aria-label="${esc(name)} kit"><path d="${shellPath}" fill="${main}" stroke="${accent}" stroke-width="1"/><path d="m21 28 20 30-13 20L5 69zm114 0-20 30 13 20 23-9z" fill="${accent}" opacity=".5"/>${stripe}<path d="M61 8q17 10 34 0l3 3Q85 32 78 31 69 31 58 11Z" fill="${trim}"/><path d="M65 12q13 7 26 0-7 13-13 14-6-1-13-14Z" fill="${main}"/><path d="M43 67l4 81m64-80-4 81M13 63l16 6m98 0 16-6M27 30l16 17m86-17-16 17M48 152q30 3 60 0" stroke="#020919" opacity=".24" fill="none" stroke-width="2"/><circle cx="96" cy="45" r="7.4" fill="#1a528c" stroke="#ebc975" stroke-width=".9"/><path d="M91 45q3-2 6 0t5-1m-10 3q4-1 6 1l3-1" fill="none" stroke="#e9f4fa" stroke-width=".8"/><path d="m52 47 5-5 5 5" fill="none" stroke="${trim}" stroke-width="1.5"/><text x="78" y="78" text-anchor="middle" font-size="8.8" font-weight="850" letter-spacing=".55" fill="${trim}">QUAYSIDE</text><text x="78" y="86" text-anchor="middle" font-size="4.6" font-weight="700" letter-spacing="1.05" fill="${trim}">MUTUAL</text></svg>`;
  }
  function stadium(c){
    return `<section class="cc-stadium-panel"><h2>${link('club','Stadium','facilities',null,'text')}</h2><div class="cc-stadium-name"><strong>${esc(home.stadium)}</strong><p class="cc-eyebrow">${esc(home.city)}</p></div>${values([['Used capacity',num(ground.capacity)],['Surface',ground.surface],['Stadium condition',ground.condition],['Pitch dimensions',ground.pitch],['Year built',ground.built],['Season ticket holders',num(ground.tickets)],['Avg season ticket price',H.money(ground.seasonPrice)],['Avg ticket price',H.money(ground.matchPrice)]])}</section>`;
  }
  function people(c){
    const cap=C.players[C.leaders.captain], vice=C.players[C.leaders.vice];
    return `<section class="cc-key-people"><h2>${link('staff','Key people','overview',null,'text')}</h2>${[['Manager',H.manager],['Captain',cap.name,cap.id],['Vice-captain',vice.name,vice.id]].map(([role,name,id])=>`<div><span>${esc(role)}</span>${avatar(c,name,id)}<div>${id?player(id):link('staff',name,'overview',null,'text',false)}<p class="cc-muted">${id?esc(C.nation[C.players[id].nation]):'England'}</p></div></div>`).join('')}</section>`;
  }
  function rivalries(c){
    return `<section class="cc-rivals">${head('Rivalries')}<div>${C.club.rivals.map(([name,ids])=>`<div><h3 class="cc-eyebrow">${esc(name)}</h3><p>${ids.map(id=>btn(H.clubs[id].name,'rival',id,{kind:'text'})).join('<span class="cc-muted"> · </span>')}</p></div>`).join('')}</div></section>`;
  }
  function profile(c){
    const top=card('Club details',`<div class="cc-profile-meta"><div>${c.crest(H.homeId)}</div>${values([['Nation',C.club.nation],['Nickname',C.club.nickname],['Region',C.club.region],['Year founded',C.club.founded],['Division',H.division],['Professional status',C.club.status]])}</div>`,'cc-profile-card');
    const kits=`<section>${head('Kits')}<div class="cc-kits">${C.kits.map(([name,color],i)=>`<button class="cc-kit-card" type="button" data-c-do="kit" data-c-val="${i}">${kit(i)}<span style="background:${color};color:${i===0?'#fff':'#192033'}">${name}</span></button>`).join('')}</div></section>`;
    const history=`<div class="cc-legacy">${C.club.legacy.map(([label,list])=>`<section>${head(label)}<dl>${list.map(([person,role])=>`<div><dt>${esc(person)}</dt><dd>${esc(role)}</dd></div>`).join('')}</dl></section>`).join('')}</div>`;
    return `<div class="cc-club-profile"><div class="cc-profile-grid"><div>${top}${people(c)}${rivalries(c)}</div><div>${kits}${stadium(c)}</div></div>${history}<div class="cc-actions cc-actions-left">${link('club','Club honours','history')}${link('vision','Board vision','overview')}</div></div>`;
  }
  function facilities(c){
    return `<div class="cc-grid2">${card('Quayside Park',`<div class="cc-ground-art">${U.art('floodlights')}${c.crest(H.homeId)}</div>${stadium(c)}`)}${card('Training and youth facilities',`${values([['First-team pitches','4'],['Youth facilities','Excellent'],['Junior coaching','Good'],['Youth recruitment','Established'],['Training centre','North Quayside'],['Head of youth development',C.namedStaff['Head of Youth Development']]])}<div class="cc-actions">${link('development','Development Centre','overview')}${link('vision','Board requests','board')}</div>`)}</div>`;
  }
  function history(c){
    return `<div class="cc-grid2">${card('Club honours',table('Club honours',['Competition','Seasons won'],C.club.honours.map(([name,seasons])=>tr([`<span class="cc-icon-text">${icon('cup')}${esc(name)}</span>`,esc(seasons)])),'honours'))}${card('Riverside through the years',`<p>Founded in 1896, Riverside moved into Quayside Park in 1924. Our first National Cup came in 1984, and the club lifted its fourth league title in 2021/22.</p><p class="cc-muted">Current season: Community Shield winners.</p><div class="cc-actions">${link('competitions','Community Shield','competitions','CS')}</div>`)}</div>`;
  }
  views.club={
    title:'Club Info',tabs:tabs(['profile','Profile'],['general','General'],['news','News'],['facilities','Facilities'],['affiliates','Affiliates'],['history','History']),
    render(c){
      if(c.r.tab==='profile')return profile(c);
      if(c.r.tab==='facilities')return facilities(c);
      if(c.r.tab==='history')return history(c);
      if(c.r.tab==='news')return U.clubNews(c,true);
      if(c.r.tab==='affiliates')return card('Affiliated clubs',table('Club partnerships',['Club','Agreement','Focus'],[['mer','Development partnership','Senior minutes for academy players'],['brk','Loan partnership','Competitive loan placements']].map(([id,agreement,copy])=>tr([clubName(c,id),agreement,copy])),'affiliates')+`<div class="cc-actions">${link('development','Loan report','loans')}</div>`);
      return `<div class="cc-grid2">${card('Riverside FC',`${values([['Chairperson',C.club.chair],['Manager',H.manager],['Professional status',C.club.status],['Financial status','Strong'],['Club captain',C.players[C.leaders.captain].name],['Stadium',home.stadium]])}${rivalries(c)}`)}${card('First-team record',standings(c,H.division,H.standings.slice(0,5),'club-standings')+`<div class="cc-actions">${link('schedule','Fixtures','fixtures')}${link('competitions','League table','competitions','PD')}</div>`)}</div>`;
    },
    action(c,cmd,id){
      if(cmd==='kit'&&C.kits[+id])c.show(`${C.kits[+id][0]} kit · Riverside FC`,`<div class="cc-kit-preview">${kit(+id,'cc-kit-large')}</div>`);
      else if(cmd==='rival'){
        const club=H.clubs[id]; if(!club)return;
        c.show(club.name,`<div class="cc-rival-crest">${c.crest(id)}</div>${values([['Home ground',club.stadium||`${club.name} Ground`],['Division',H.division],['Rivalry',C.club.rivals.find(x=>x[1].includes(id))?.[0]||'Local rival']])}${H.fixtures.filter(f=>f.opponent===id).map(f=>link('schedule',`${H.calendar(f.date).date} · ${H.fixtureCompetition(f)}`,'fixtures',f.id)).join('')}`);
      } else U.inboxActions(c,cmd,id);
    }
  };

  function positionChart(){
    const points=H.positionHistory.map((n,i)=>`${3+i*8.75},${2+n*3}`).join(' ');
    return `<svg class="cc-position-chart" viewBox="0 0 164 37" preserveAspectRatio="none" role="img" aria-label="Premier Division position history: now first"><path d="${Array.from({length:33},(_,i)=>`M${2+i*5} 2v32`).join('')} M2 34h160" fill="none" stroke="#74798d" stroke-width=".5"/><polyline points="${points}" fill="none" stroke="#95a6ed" stroke-width="1.3"/></svg>`;
  }
  const trophy = () => `<svg viewBox="0 0 96 100" class="cc-trophy" role="img" aria-label="Community Shield trophy"><defs><radialGradient id="cc-silver" cx=".38" cy=".28"><stop stop-color="#fff"/><stop offset=".55" stop-color="#c6c8d2"/><stop offset=".8" stop-color="#7d879b"/><stop offset="1" stop-color="#d7dde4"/></radialGradient></defs><circle cx="48" cy="44" r="37" fill="url(#cc-silver)" stroke="#a0a7b3" stroke-width="2"/><circle cx="48" cy="44" r="32" fill="none" stroke="#eef1f7" stroke-width="1.2"/><circle cx="48" cy="44" r="23" fill="#7c86a0" stroke="#fafaff" stroke-width="1.2"/><path d="M48 28 58 32v13c0 8-6 12-10 16-5-4-10-8-10-16V32Z" fill="#e1e4ea"/><circle cx="48" cy="43" r="3.5" fill="#34466b"/><path d="M39 79h18l8 12H31Z" fill="#777f8b"/><path d="M22 91h52v6H22Z" fill="#ced4de"/></svg>`;
  function compFixtures(c,comp){
    if(comp.id==='NC')return `<div class="cc-competition-pairs">${[['mer','dun'],['val','sby'],['elm','red'],['brk','ash']].map(([a,b])=>`<div><span>${esc(H.clubs[a].name)}</span><small>v</small><span>${esc(H.clubs[b].name)}</span></div>`).join('')}</div>`;
    return `<div class="cc-competition-pairs">${H.fixtures.filter(f=>f.comp===comp.id).map(f=>`<button type="button" data-c-do="fixture" data-c-val="${f.id}"><span>${esc(H.clubs[f.venue==='A'?f.opponent:H.homeId].name)}</span><b>${f.score?f.score.join(' – '):'v'}</b><span>${esc(H.clubs[f.venue==='A'?H.homeId:f.opponent].name)}</span></button>`).join('')}</div>`;
  }
  function compCard(c,comp){
    const {id,name,tone} = comp;
    const win=H.fixtures.find(f=>f.comp==='CS');
    let body;
    if(id==='PD')body=`<div class="cc-comp-form"><div><p class="cc-eyebrow">Recent form</p>${form(H.form.slice(-5))}</div><div><p class="cc-eyebrow">League positions</p>${positionChart()}</div></div>${standings(c,H.division,H.standings,'premier',true)}<div class="cc-comp-scorer"><p class="cc-eyebrow">Top goalscorer for Riverside</p><div class="cc-person">${avatar(c,C.players[C.leaders.forward].name,C.leaders.forward)}<div>${player(C.leaders.forward)}<small>${C.players[C.leaders.forward].goals} goals in all competitions</small></div></div></div>`;
    else if(id==='CC')body=`<h3 class="cc-comp-phase">League Phase</h3>${standings(c,name,C.continental,'continental',true)}`;
    else if(id==='CS')body=`<div class="cc-trophy-block"><p>Competition finished on ${H.shortDate(win.date)}/2024</p>${trophy()}<strong>Winner</strong><small>Riverside FC · ${win.score.join('–')} v ${esc(H.clubs[win.opponent].name)}</small></div>`;
    else body=`<h3 class="cc-comp-phase">${id==='LC'?'Riverside fixtures':'First Round draw'}</h3>${compFixtures(c,comp)}`;
    const actions=`<div class="cc-actions">${btn('Team stats','comp-team',id,{kind:'outline',arrow:true})}${btn('Player stats','comp-players',id,{kind:'outline',arrow:true})}${btn('Rules','comp-rules',id,{kind:'outline',arrow:true})}${id==='PD'||id==='LC'?link('matchday',id==='PD'?'Daily results':'Matchday fixtures','fixtures',id==='PD'?'league':'cup'):''}</div>`;
    return `<section class="cc-comp-card${c.r.id===id?' cc-comp-active':''}" data-comp="${id}"><h2 class="cc-comp-banner cc-comp-${tone}">${pitchCrest(tone)}${esc(name)}</h2><div class="cc-comp-expect"><div><p class="cc-eyebrow">Board expectation</p><strong>${esc(comp.aim)}</strong></div><div><p class="cc-eyebrow">Performance</p>${meter(comp.progress,`${name} performance`)}</div></div>${body}${actions}</section>`;
  }
  views.competitions={
    title:'Competitions',tabs:tabs(['competitions','Competitions']),
    render(c){ const comp=id=>compCard(c,lookup(C.comps,id)); return `<div class="cc-competitions"><div>${comp('PD')}</div><div>${comp('CC')}${comp('NC')}</div><div>${comp('CS')}${comp('LC')}</div></div>`; },
    after(c){if(c.r.id && c.r.id!=='PD')document.querySelector(`[data-comp="${C.comps.find(x=>x.id===c.r.id)?.id}"]`)?.scrollIntoView({block:'nearest'});},
    action(c,cmd,id){
      const comp=lookup(C.comps,id);if(!comp)return;
      const matches=H.fixtures.filter(f=>f.comp===id), results=matches.filter(f=>f.score);
      if(cmd==='comp-team') c.show(`${comp.name} · Team stats`,id==='PD'||id==='CC'?standings(c,comp.name,id==='PD'?H.standings:C.continental,'comp-modal',true):`${values([['Matches',results.length],['Wins',results.filter(x=>U.result(x.score)==='W').length],['Goals for',results.reduce((a,x)=>a+x.score[0],0)],['Goals against',results.reduce((a,x)=>a+x.score[1],0)]])}${compFixtures(c,comp)}`);
      if(cmd==='comp-players') c.show(`${comp.name} · Player stats`,`<p>Career totals for Riverside's competitive fixtures. This starter save does not track a full player breakdown per competition.</p>${table('Season leaders',['Category','Player','Value'],H.leaders.map(r=>tr([esc(r.label),player(r.player.id),esc(r.value)])),'comp-players')}${link('squad','Full player statistics','stats')}`);
      if(cmd==='comp-rules'){
        const text={PD:'Three points for a win and one for a draw. Teams are ranked by points, then goal difference and goals scored.',CC:'League Phase fixtures contribute to the standings. This starter snapshot shows the leading clubs after three matches.',NC:'A straight knockout competition. Riverside’s entry is not yet on this fixture list.',LC:'A knockout cup. Riverside are scheduled to face Harbourport Town in the Fourth Round.',CS:'A single-match season opener. The starter season records Riverside as the winner.'}[id];
        c.show(`${comp.name} · Rules`,`<p>${esc(text)}</p><p>Only the advertised League Cup fixture opens the playable match centre in this starter season.</p>${id==='LC'?link('schedule','Go to the next fixture','fixtures',H.next.id):''}`);
      }
    }
  };

  const tone = { Pleased:'lime','On course':'good',Satisfied:'info','Not judging':'violet','Reserving judgment':'violet','Very pleased':'good',Delighted:'good',Passed:'good' };
  const objectiveRows = (entries,kind='Objective')=>`<div class="cc-objectives"><div class="cc-objective-head"><span>${esc(kind)}</span><span>Importance</span><span>Status</span></div>${entries.map(([label,importance,status,comp])=>`<div class="cc-objective-row"><span class="cc-icon-text">${icon(comp?'cup':'plan')}${comp?link('competitions',label,'competitions',comp,'text',false):esc(label)}</span><span>${esc(importance)}</span>${tag(status,tone[status]||'info')}</div>`).join('')}</div>`;
  const request = c => btn('Make board request','board-request','',{kind:'outline',icon:'case'});
  function requests(c){
    return c.s.board.length?`<section class="cc-board-requests">${head('Requests logged')}<ul>${c.s.board.map(r=>`<li>${esc(r)} ${tag('Pending','warn')}</li>`).join('')}</ul></section>`:'';
  }
  function visionPlan(c){
    const year=Math.max(0,Math.min(C.plan.length-1,Number(c.ui.year||0)));
    return `<section class="cc-board-plan"><div class="cc-vision-intro"><h2>Board vision</h2><p>The club’s long-term vision and expectations.</p></div>${objectiveRows(C.objectives,'Actionable objectives')}<hr>${objectiveRows([['Prioritise longer contracts for first-team players','Preferred','Not judging']],'Informational objectives')}<hr><h3>Five-year plan</h3><div class="cc-year-tabs">${['Current season','2025/26','2026/27','2027/28','2028/29'].map((name,i)=>btn(name,'plan-year',i,{pressed:i===year})).join('')}</div>${objectiveRows(C.plan[year],year?'By the end of this season':'End of current season')}</section>`;
  }
  function feedback(c,which){
    const board=which==='board', completed=c.s.board.length;
    const kind=board?'Board':'Supporters';
    const summary=board?'The board are very pleased with your overall leadership of the team.':'Supporters are delighted with the winning run and the football the team is playing.';
    const remarks=board?['Pleased with Riverside’s place at the top of the Premier Division.','Very pleased with the 4–0 league win at Eastvale City.','Delighted with the positive atmosphere in the dressing room.']:['Six straight league wins have lifted the mood around Quayside Park.','Fabio Novak’s hat-trick was a highlight of the season so far.','Fans are looking forward to a home cup tie.'];
    return `<section class="cc-card cc-feedback"><div class="cc-toolbar"><div class="cc-feedback-switch">${btn('Board','feedback','board',{pressed:board,icon:'case'})}${btn('Supporters','feedback','supporters',{pressed:!board,icon:'team'})}</div><span class="cc-spacer"></span>${request(c)}</div><h2>${kind} feedback</h2><p>Compiled by ${board?esc(C.club.chair)+' (Chairperson)':'Riverside Supporters’ Trust'}</p><div class="cc-feedback-grade ${board?'':'cc-feedback-grade-teal'}"><b>${board?'B':'A−'}</b><strong>${esc(summary)}</strong></div>
      ${objectiveRows(C.culture[which],board?'Board culture':'Supporter culture')}<h3>Notable highlights</h3><ul class="cc-ticks">${remarks.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><h3>Notable criticism</h3><p>No specific concerns have been raised in the starter snapshot.</p><hr><div class="cc-actions cc-actions-left">${board?btn('Board profile','board-profile','',{kind:'outline',arrow:true}):link('dynamics','Club atmosphere','overview')}</div>${completed?requests(c):''}</section>`;
  }
  views.vision={
    title:'Club Vision',subtitle:()=> 'Job security: Secure',tabs:tabs(['overview','Overview'],['performance','Performance'],['board','Board'],['supporters','Supporters']),
    render(c){
      if(c.r.tab==='performance')return `<div class="cc-grid2">${card('Performance against expectations',objectiveRows(C.plan[0],'Competitions')+objectiveRows(C.objectives,'Club management'))}${feedback(c,'board')}</div>`;
      return `<div class="cc-vision-grid">${visionPlan(c)}${feedback(c,c.r.tab==='supporters'||(c.r.tab==='overview'&&c.ui.who==='supporters')?'supporters':'board')}</div>`;
    },
    action(c,cmd,id){
      if(cmd==='plan-year'){c.ui.year=Number(id);c.render();}
      else if(cmd==='feedback'){
        if(c.r.tab==='overview'){c.ui.who=id;c.render();}else c.go('vision',id);
      } else if(cmd==='board-request'){
        const opts=C.boardOptions.filter(x=>!c.s.board.includes(x));
        c.show('Make board request',opts.length?U.editForm('board','',U.formSelect('request','Request',opts),'Log request','The request will appear as pending. Board decisions are not simulated in this starter season.'):empty('All available requests are logged'));
      } else if(cmd==='board-profile')c.show(C.club.chair,`${values([['Role','Chairperson'],['Club',home.name],['Job security','Secure'],['Board confidence','Very pleased']])}${link('club','Club profile','profile')}`);
    },
    submit(c,cmd,id,data){
      if(cmd==='board'&&c.apply('board',data.get('request'))){c.close();c.render();c.note('Board request logged as pending.');}
    }
  };
})(window);
