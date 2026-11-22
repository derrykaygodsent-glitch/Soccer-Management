/* Dressing room, staff desk, and the development pathway. */
(function (global) {
  'use strict';
  const U=global.TLClubUI, {H,C,views,esc,icon,btn,link,card,empty,values,tag,select,search,table,tr,avatar,rank,stars,spark,nation,clubName,meter,lookup,tabs}=U;
  const playerLink = id => btn(C.players[id].name,'player',id,{kind:'text'});
  const leaders = [C.leaders.captain,C.leaders.vice];
  const social = [ ['Core social group',C.roster.filter(p=>p.age>=22)],['Secondary social group',C.roster.filter(p=>p.age<22)] ];
  const dynCards = () => `<div class="cc-grid3 cc-dyn-cards">${C.dynamics.map(t=>card('',`<div class="cc-dyn-head"><span class="cc-resource-icon">${icon(t.symbol)}</span><div><h2 class="cc-title">${esc(t.name)}</h2><div>${meter(t.score,t.name,'good')}<strong class="cc-good">${esc(t.status)}</strong></div></div></div><p>${esc(t.copy)}</p><hr><ul class="cc-ticks">${t.reasons.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`,'cc-dyn-card')).join('')}</div>`;
  const dynCard = t => `<section class="cc-dyn-strip-card"><div class="cc-dyn-strip-head"><span class="cc-resource-icon">${icon(t.symbol)}</span><h2 class="cc-title">${esc(t.name)}</h2></div><div class="cc-dyn-strip-foot">${meter(t.score,t.name,'good')}<strong class="cc-dyn-status">${esc(t.status)}</strong></div><p class="cc-dyn-copy">${esc(t.copy)}</p><ul class="cc-dyn-reasons">${t.reasons.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section>`;
  const influencer = (c,id,rank) => `<div class="cc-influencer"><button type="button" data-c-do="player" data-c-val="${id}" aria-label="${esc(C.players[id].name)}">${avatar(c,C.players[id].name,id,'cc-avatar-lg')}</button><strong>${esc(C.players[id].name)}</strong><small>${rank}</small></div>`;
  function mood(c){
    return `<div class="cc-dynamics"><div class="cc-dyn-strip">${C.dynamics.map(dynCard).join('')}</div><div class="cc-dyn-floor"><aside class="cc-dyn-side"><section class="cc-panel"><h2 class="cc-title">${link('dynamics','Top influencers','hierarchy',null,'text')}</h2><div class="cc-influencer-list">${leaders.map(id=>influencer(c,id,'Team leader')).join('')}</div></section><section class="cc-panel"><h2 class="cc-title">${link('dynamics','Social groups','groups',null,'text')}</h2>${social.map(([name,players],i)=>`<div class="cc-social-row"><span>${link('dynamics',name,'groups',String(i+1),'text',false)}</span><span>${players.length} players</span></div>`).join('')}</section></aside><section class="cc-dyn-main"><h2 class="cc-title">Issues</h2>${empty('There are currently no player issues within the team.')}</section></div></div>`;
  }
  function hierarchy(c){
    const high = [C.leaders.forward,'rvr_5','rvr_10','rvr_15'];
    return `<div class="cc-stack">${card('Team leaders',`<div class="cc-influencers">${leaders.map(id=>influencer(c,id,'Team leader')).join('')}</div>`)}${card('Highly influential players',`<div class="cc-influencers">${high.map(id=>influencer(c,id,'Highly influential')).join('')}</div>`)}${card('Other first-team players',table('Other first-team players',['Player','Position','Squad role'],C.roster.filter(p=>![...high,...leaders].includes(p.id)).map(p=>tr([playerLink(p.id),esc(p.position),esc(p.playing)])),'hierarchy'))}</div>`;
  }
  function groups(c){
    return `<div class="cc-grid2">${social.map(([name,players],i)=>card(name,`<p class="cc-muted">${players.length} players in the starter squad.</p>${table(name,['Player','Age','Nation'],players.map(p=>tr([playerLink(p.id),p.age,nation(p.nation)])),`group-${i}`)}`,String(i+1)===c.r.id?'cc-highlight-card':'')).join('')}</div>`;
  }
  views.dynamics={
    title:'Dynamics',subtitle:()=> 'Dressing room atmosphere: Excellent',tabs:tabs(['overview','Overview'],['hierarchy','Hierarchy'],['groups','Social Groups'],['happiness','Happiness'],['conduct','Code of Conduct'],['meeting','Team Meeting'],['talk','Team Talk Feedback']),
    render(c){
      switch(c.r.tab){
        case 'overview':return mood(c);
        case 'hierarchy':return hierarchy(c);
        case 'groups':return groups(c);
        case 'happiness':return card('Squad happiness',`<p class="cc-muted">No dressing-room issues are recorded for the starter squad.</p>${table('Squad happiness',['Player','Influence','Agreed playing time','Happiness'],C.roster.map(p=>tr([playerLink(p.id),leaders.includes(p.id)?'Team leader':'First team',esc(p.playing),tag(p.rating>7.6?'Very happy':'Happy','good')])),'happiness')}`);
        case 'conduct':return card('Current code of conduct',`<p class="cc-muted">Standing expectations for the senior squad. No disciplinary action is applied from this page.</p>${table('Code of conduct',['Incident','Club guideline'],[['Missed training','Staff discussion'],['Repeated lateness','Formal warning'],['Dismissal for violent conduct','Manager review']].map(([a,b])=>tr([a,b])),'conduct')}`);
        case 'meeting':return card('Team meeting',`${c.s.meeting?`<p class="cc-callout cc-good">Last topic noted: ${esc(c.s.meeting)}</p>`:''}${U.editForm('meeting','',U.formSelect('topic','Talking point',C.meetingTopics,c.s.meeting),'Log team meeting','Record a topic for the dressing room. Meeting outcomes aren’t simulated yet.')}`);
        default:return `<div class="cc-grid2">${card('Team talk feedback',`<p>The group responded well to encouragement following the 4–0 league win at Vale Arena.</p>${c.s.meeting?`<p class="cc-callout">Last meeting topic: ${esc(c.s.meeting)}.</p>`:''}<div class="cc-actions">${link('inbox','Match report','messages','match')}${link('dynamics','Team meeting','meeting')}</div>`)}${dynCards().replace('cc-grid3 cc-dyn-cards','cc-stack cc-dyn-cards')}</div>`;
      }
    },
    submit(c,cmd,id,data){if(cmd==='meeting'&&c.apply('meeting',data.get('topic'))){c.render();c.note('Team meeting topic saved.');}}
  };

  const allStaff=[...C.staff,...C.staffPool];
  const groupName = id=>lookup(C.staffGroups,id)?.name;
  const units = { first:'First team',u21:'Under 21s',u18:'Under 18s',available:'Available' };
  function staffTable(c,list,id,label='Staff members',hasActions=false){
    return list.length?table(label,['Name','Role','Team','Assessment',...(hasActions?['Shortlist']:[])],list.map(p=>tr([
      `<div class="cc-person">${avatar(c,p.name)}<div>${btn(p.name,'staff-person',p.id,{kind:'text'})}<small>${esc(groupName(p.group))}</small></div></div>`,esc(p.role),esc(units[p.unit]),`${p.score}/20`,...(hasActions?[btn(c.s.staffList.includes(p.id)?'Remove':'Shortlist','staff-shortlist',p.id,{kind:'outline',pressed:c.s.staffList.includes(p.id)})]:[])
    ])),id, 'cc-staff-table'):empty('No staff match this view','Change the filters or shortlist a staff candidate.');
  }
  function comparison(g) {
    return `<section class="cc-staff-compare"><h3>${esc(g.name)} comparison</h3><p><span class="cc-dot cc-lime"></span> Riverside <span class="cc-dot cc-muted"></span> Division average</p><div class="cc-staff-bars" role="list" aria-label="${esc(g.name)} comparison, scale out of 20">${g.comparison.map(([label,mine,division])=>`<div role="listitem" title="${esc(label)}: Riverside ${mine}, division average ${division}"><div class="cc-staff-bar"><i style="height:${mine*5}%" class="cc-bar-${g.tone}"></i><b style="bottom:${division*5}%"></b></div><span>${esc(label)}</span><span class="hc-sr">Riverside ${mine}, division average ${division}</span></div>`).join('')}</div></section>`;
  }
  function staffGroup(c,g){
    const sum=g.roles.reduce((a,x)=>a+x[1],0), max=g.roles.reduce((a,x)=>a+x[2],0);
    const figures=Array.from({length:max},(_,i)=>`<span class="cc-staff-figure${i>=sum?' cc-vacant':''}" data-shade="${i%6}" aria-hidden="true"><svg viewBox="0 0 12 18"><circle cx="6" cy="3" r="2.2"/><path d="M2.8 6h6.4L10 11H8.2l-.5 5H4.3l-.5-5H2Z"/></svg></span>`).join('');
    return `<div class="cc-staff-group">${card('',`<h2>${btn(g.name,'staff-group',g.id,{kind:'text',arrow:true})}</h2><strong>${sum} ${g.id==='coaching'?'coaching staff':g.id==='recruitment'?'recruitment team members':'medical staff'}</strong><p class="cc-muted">The board have no concerns about the size of the ${g.id} team.</p><div class="cc-staff-figures cc-fig-${g.tone}" aria-label="${sum} of ${max} staff positions filled">${figures}</div><hr><dl class="cc-staff-roles">${g.roles.map(([title,a,b])=>`<div><dt>${a}/${b}</dt><dd>${esc(title)}</dd></div>`).join('')}</dl>`,'cc-staff-card')}${comparison(g)}</div>`;
  }
  function staffOverview(c){
    return `<div class="cc-staff cc-fill"><div class="cc-grid3">${C.staffGroups.map(g=>staffGroup(c,g)).join('')}</div><footer class="cc-actions cc-actions-start"><span>${btn('Board staff','board-staff','',{kind:'outline',arrow:true})}${link('staff','Riverside U21 staff','search','u21')}${link('staff','Riverside U18 staff','search','u18')}</span>${link('staff','Responsibilities','responsibilities')}</footer></div>`;
  }
  function searchStaff(c,short=false){
    const use = short?C.staffPool.filter(s=>c.s.staffList.includes(s.id)):c.ui.staffUnit==='available'?C.staffPool:c.ui.staffUnit==='all'?[...C.staff,...C.staffPool]:C.staff.filter(s=>!c.ui.staffUnit||s.unit===c.ui.staffUnit);
    const list=use.filter(s=>(!c.ui.staffGroup||c.ui.staffGroup==='all'||s.group===c.ui.staffGroup)&&U.textMatch(c.ui.staffQ,s.name,s.role));
    return card(short?'Staff shortlist':'Staff search',`<div class="cc-toolbar">${search('staffQ',c.ui.staffQ,'Find a staff member')}${select('staffGroup','Staff department',[['all','All departments'],...C.staffGroups.map(g=>[g.id,g.name])],c.ui.staffGroup||'all')}${short?'':select('staffUnit','Staff team',[['all','All teams'],...Object.entries(units)],c.ui.staffUnit||'all')}</div>${staffTable(c,list,'staff-search',short?'Staff shortlist':'Staff search',short||c.ui.staffUnit==='available')}${short?`<div class="cc-actions">${link('staff','Search available staff','search','available')}</div>`:''}`);
  }
  views.staff={
    title:'Staff',subtitle:()=>`${C.staff.length} staff members across first team and academy`,tabs:tabs(['overview','Overview'],['responsibilities','Responsibilities'],['search','Staff Search'],['shortlist','Staff Shortlist'],['jobs','Job Centre'],['security','Job Security']),
    enter(c){if(c.r.tab==='search'&&Object.hasOwn(units,c.r.id)){c.ui.staffUnit=c.r.id;c.ui.staffGroup='all';c.ui.staffQ='';}},
    render(c){
      if(c.r.tab==='overview')return staffOverview(c);
      if(c.r.tab==='responsibilities')return card('Staff responsibilities',`<p class="cc-muted">Choose who handles each area of the starter save.</p>${U.responsibilitiesForm(c)}<div class="cc-actions">${link('transfers','Transfer Centre','centre')}${link('inbox','Press conference','messages','media')}</div>`);
      if(c.r.tab==='security')return `<div class="cc-grid2">${card('Job security',`${values([['Manager',H.manager],['Club',H.clubs[H.homeId].name],['Confidence','Secure'],['Board feedback','Very pleased']])}<div class="cc-actions">${link('vision','Board feedback','board')}</div>`)}</div>`;
      if(c.r.tab==='jobs')return `<div class="cc-grid2">${card('Club vacancies',table('Vacancies',['Department','Role','Open positions'],C.staffGroups.flatMap(g=>g.roles.filter(x=>x[2]>x[1]).map(([role,n,max])=>tr([g.name,role,max-n]))),'vacancies'))}${card('Available staff',staffTable(c,C.staffPool,'available-staff','Available staff',true))}</div>`;
      return searchStaff(c,c.r.tab==='shortlist');
    },
    field:U.delegationField,
    action(c,cmd,id){
      if(cmd==='staff-group'){
        const g=lookup(C.staffGroups,id);if(g)c.show(g.name,staffTable(c,C.staff.filter(s=>s.group===id),'department-staff'));
      } else if(cmd==='board-staff')c.show('Board staff',values([['Chairperson',C.club.chair],['Director of Football',C.namedStaff['Director of Football']],['Technical Director',C.namedStaff['Technical Director']],['Finance Director','Nadia Arch']])+link('vision','Club Vision','board'));
      else if(cmd==='staff-person'){
        const s=lookup(allStaff,id);if(!s)return;
        c.show(s.name,`<div class="cc-person">${avatar(c,s.name,s.id,'cc-avatar-lg')}<div><strong>${esc(s.role)}</strong><p class="cc-muted">${esc(groupName(s.group))} · ${esc(units[s.unit])}</p></div></div>${values([['Department',groupName(s.group)],['Assessment',`${s.score}/20`],['Current team',units[s.unit]]])}${s.unit==='available'?btn(c.s.staffList.includes(s.id)?'Remove from shortlist':'Shortlist staff member','staff-shortlist',s.id,{kind:'outline'}):''}`);
      } else if(cmd==='staff-shortlist'&&c.apply('staffList',id)){c.close();c.render();c.note(c.s.staffList.includes(id)?'Staff member shortlisted.':'Staff member removed.');}
    }
  };

  const devTeam = id=>id==='u21'?'U21 Squad':'U18 Squad';
  const candidate = id=>lookup(C.youth,id)||lookup(C.loans,id);
  const playerButton=p=>btn(p.name,'dev-player',p.id,{kind:'text'});
  function candidateTable(c,list,short=false,which='candidates'){
    const columns=short?['Name','Progress','Development advice']:['Rank','Name','Squad','Progress','Ability','Potential','Trn rat','Av rat','Development advice'];
    const advice=p=>`<span class="cc-dev-advice">${btn(p.advice,'dev-player',p.id,{kind:'text'})}</span>`;
    const rows=list.map((p,i)=>{
      const name=`<div class="cc-person">${avatar(c,p.name)}<div>${playerButton(p)}<small>${p.age}-year-old ${esc(C.roles[p.pos][0].toLowerCase())}</small></div></div>`;
      return tr(short?[name,spark(p.progress),advice(p)]:[`<b class="cc-teal">${i+1}</b>`,name,devTeam(p.unit),spark(p.progress),stars(p.ability),stars(p.potential),rank(p.training),rank(p.rating),advice(p)]);
    });
    return rows.length?table('Development candidates',columns,rows,which,short?'cc-dev-compact':'cc-dev-table'):empty('No players in this view');
  }
  function devOverview(c){
    const youth=C.youth, loans=C.loans;
    return `<div class="cc-development cc-fill"><p class="cc-dev-author"><b>REPORT BY:</b> ${esc(C.namedStaff['Head of Youth Development'])} (Head of Youth Development)</p>
      <div class="cc-dev-summary"><div><h2>${link('development','Players out on loan','loans',null,'text')}</h2><strong>${loans.length} players out on loan</strong><p>Most loan players are getting regular minutes. Two could benefit from more competitive experience.</p></div><div><h2>${link('development','U21 squad','u21',null,'text')}</h2><strong>Average squad</strong><p>There are players close to first-team opportunities and some promising prospects still building experience.</p></div><div><h2>${link('development','U18 squad','u18',null,'text')}</h2><strong class="cc-lime">Strong squad</strong><p>The group includes several players with high potential, particularly in defence and midfield.</p></div></div>
      ${card('First-team candidates',candidateTable(c,youth.slice(0,4)), 'cc-first-candidates')}
      <div class="cc-dev-floor"><section><h2 class="cc-title">Needs attention</h2>${candidateTable(c,youth.slice(4,6),true,'attention')}</section><section><h2 class="cc-title">Ones to watch</h2>${candidateTable(c,youth.slice(6,9),true,'players-to-watch')}</section></div></div>`;
  }
  function loanReport(c){
    const list=C.loans.filter(p=>!c.ui.devWatched||c.s.watch.includes(p.id));
    return card('Players out on loan',`<div class="cc-toolbar">${U.check('devWatched','Watched only',c.ui.devWatched)}<span class="cc-spacer"></span><span class="cc-muted">Report by ${esc(C.namedStaff['Loan Manager'])}</span></div>${table('Loan report',['Player','Position','Loan club','Apps','Avg rating','Development advice'],list.map(p=>tr([playerButton(p),esc(C.roles[p.pos][0]),clubName(c,p.club),p.apps,rank(p.rating),esc(p.advice)])),'loans')}${list.length?'':empty('No watched loan players','Open a player’s report to add them to your watch list.')}`);
  }
  views.development={
    title:'Development Centre',subtitle:()=> 'First-team pathway and academy reports',tabs:tabs(['overview','Overview'],['loans','Loans'],['u21','Under 21s'],['u18','Under 18s'],['candidates','Youth Candidates'],['staff','Staff']),
    render(c){
      const tab=c.r.tab;
      if(tab==='overview')return devOverview(c);
      if(tab==='loans')return loanReport(c);
      if(tab==='staff') return `<div class="cc-grid2">${['u21','u18'].map(id=>card(`${devTeam(id)} staff`,`${staffTable(c,C.staff.filter(s=>s.unit===id),'academy-'+id)}<div class="cc-actions">${link('staff','Open staff directory','search',id)}</div>`)).join('')}</div>`;
      const list=C.youth.filter(p=>(tab==='candidates'||p.unit===tab)&&(!c.ui.devWatched||c.s.watch.includes(p.id)));
      return card(tab==='candidates'?'Youth candidates':devTeam(tab),`<div class="cc-toolbar">${U.check('devWatched','Watched only',c.ui.devWatched)}<span class="cc-spacer"></span>${tab==='candidates'?'':link('schedule','View fixtures','fixtures',tab)}</div>${candidateTable(c,list)}`);
    },
    action(c,cmd,id){
      if(cmd==='staff-person')return views.staff.action(c,cmd,id);
      const p=candidate(id);if(!p)return;
      if(cmd==='dev-player'){
        const lineup=p.unit?values([['Squad',devTeam(p.unit)],['Age',p.age],['Best role',C.roles[p.pos][2]],['Training rating',p.training.toFixed(2)],['Average rating',p.rating.toFixed(2)]])+`<p>${spark(p.progress)} Ability ${stars(p.ability)} Potential ${stars(p.potential)}</p>`:values([['Loan club',H.clubs[p.club].name],['Position',C.roles[p.pos][0]],['Apps',p.apps],['Average rating',p.rating.toFixed(2)]]);
        c.show(p.name,`${lineup}<p class="cc-callout">${esc(p.advice)}</p><div class="cc-actions">${btn(c.s.watch.includes(p.id)?'Stop watching':'Add to watch list','dev-watch',p.id,{kind:'outline',pressed:c.s.watch.includes(p.id)})}</div>`);
      } else if(cmd==='dev-watch'&&c.apply('watch',id)){c.close();c.render();c.note(c.s.watch.includes(id)?'Player added to your development watch list.':'Player removed from your watch list.');}
    }
  };
})(window);
