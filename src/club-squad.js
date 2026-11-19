/* Schedule and squad: browse the same fixtures and players as Home and Inbox. */
(function (global) {
  'use strict';
  const U=global.TLClubUI, {H,C,views,esc,icon,btn,link,values,card,tag,empty,select,search,week,stamp,month,tr,table,clubName,lookup,score,num,rank,stars,nation,tabs,avatar}=U;
  const K=global.TLSeasonCalendar,S=global.TLSeasonState;
  const teams = [['senior','First team'],['u21','Under 21s'],['u18','Under 18s']];
  const iso = date => new Date(date).toISOString().slice(0,10);
  const dayMs=864e5;
  const allFixtures = c => [...c.fixtures(),...c.s.friendlies.map(f=>({...f,comp:'FR',date:Date.parse(`${f.date}T15:00:00Z`),planned:true}))].sort((a,b)=>a.date-b.date);
  const monthId = f => iso(f.date).slice(0,7);
  const months = Array.from({length:14},(_,i)=>iso(Date.UTC(2024,6+i,1)).slice(0,7));
  const periods = () => months;
  const readableMonth = id => month(Date.parse(`${id}-01T12:00Z`));
  const compFilter = [['all','All competitions'], ...C.comps.filter(x=>x.id!=='NC').map(x=>[x.id,x.name]),['FR','Friendlies']];
  const timeSpan = (f,when) => {
    const diff=Math.floor(f.date/dayMs)-Math.floor(when/dayMs);
    return diff<0?`${-diff} ${diff===-1?'day':'days'} ago`:diff===0?'Today':H.leadTime(when,f.date);
  };
  const stadium = f => f.venue==='N'?'Union Stadium':H.clubs[f.venue==='H'?H.homeId:f.opponent].stadium || `${H.clubs[f.opponent].name} Ground`;
  const playerLink = id => btn(C.players[id].name,'player',id,{kind:'text'});
  const fixturesNav = () => `<div class="cc-actions cc-actions-start"><span>${link('schedule','U21 fixtures','fixtures','u21')}${link('schedule','U18 fixtures','fixtures','u18')}</span><span>${link('staff','Responsibilities','responsibilities')}${btn('Arrange friendly','plan-friendly','',{kind:'outline'})}</span></div>`;
  function commonPeriod(c,calendar=false) {
    const list=periods(c);
    const selected=(calendar?c.ui.calendar:c.ui.period)||(calendar?iso(c.now).slice(0,7):'all');
    const idx=list.indexOf(selected);
    return `<div class="cc-period-controls">${select(calendar?'calendar':'period','Fixture month',[...(calendar?[]:[['all','All months']]),...list.map(id=>[id,readableMonth(id)])],selected)}${btn('‹',calendar?'calendar-step':'period-step','-1',{label:'Previous month',disabled:idx===0})}${btn('›',calendar?'calendar-step':'period-step','1',{label:'Next month',disabled:idx===list.length-1})}</div>`;
  }
  function fixturesTable(c,rows,selected) {
    const groups = rows.reduce((acc,f)=>{(acc[month(f.date)]??=[]).push(f);return acc;},{});
    const columns=['Date','Time','Opposition','TV','Venue','Result','Competition'];
    const markup=Object.entries(groups).map(([group,list])=>`<tbody><tr class="cc-month-row"><th scope="rowgroup" colspan="7">${esc(group)}</th></tr>${list.map(f=>{
      const active=f.id===selected?.id, comp=H.fixtureCompetition(f);
      const cls=active?'cc-selected-fixture':f.comp==='FR'?'cc-friendly-row':f.comp==='LC'||f.comp==='CC'||f.comp==='CS'?'cc-cup-row':'';
      return `<tr class="${cls}" data-fixture-row="${f.id}"><td><button class="cc-fixture-button" type="button" data-c-go="schedule" data-c-tab="fixtures" data-c-id="${f.id}" aria-label="${esc(H.clubs[f.opponent].name)}, ${H.calendar(f.date).date}${f.id===K.next(c.season.value)?.id?', next match':''}"${active?' aria-current="true"':''}><span class="cc-fixture-bullet ${f.id===K.next(c.season.value)?.id?'cc-next-fixture':''}"></span>${week(f.date)}, ${H.shortDate(f.date)}/${String(new Date(f.date).getUTCFullYear()).slice(-2)}</button></td><td>${stamp(f.date)}</td><td>${clubName(c,f.opponent,`${H.clubs[f.opponent].name}`)}<small class="cc-fixture-venue-mobile">${f.venue}</small></td><td>${['LC','CC','CS'].includes(f.comp)?`<span role="img" aria-label="Televised">${icon('tv')}</span>`:''}</td><td title="${{H:'Home',A:'Away',N:'Neutral'}[f.venue]}">${f.venue}</td><td><span class="cc-fixture-result"><i class="cc-result-dot cc-${U.resultColor(f.pen||f.score)}"></i>${f.score?f.score.join(' – '):f.id===K.next(c.season.value)?.id?'Next':f.planned?'Draft':'–'}</span></td><td>${esc(comp)}</td></tr>`;
    }).join('')}</tbody>`).join('');
    return rows.length?U.scroll('fixtures','First-team fixtures',`<table class="cc-table cc-fixtures-table"><caption class="hc-sr">Riverside schedule, season 2024/25</caption><thead><tr>${columns.map(x=>`<th scope="col">${x}</th>`).join('')}</tr></thead>${markup}</table>`,'cc-table-wrap'):empty('No fixtures match these filters','Choose another month or competition.');
  }
  function reportRows(c,f){
    if(f.id!==C.matchReport.fixtureId) return '';
    const r=C.matchReport;
    return `<div class="cc-goals-line">${r.goals.map(([min,id])=>`<span>${playerLink(id)} (${min}′)</span>`).join('')}</div>`;
  }
  function fixtureDetail(c,f){
    if(!f)return card('Fixture detail',empty('Select a fixture','Choose a visible date to inspect the match.'),'cc-fixture-detail');
    const done=f.score, report=f.id===C.matchReport.fixtureId, actual=c.season.value.results[f.id], next=f.id===K.next(c.season.value)?.id, opponent=H.clubs[f.opponent];
    const upcoming=next?`<div class="cc-forecast">${values([['Opponent manager',K.manager(f.opponent)],['Kick-off',stamp(f.date)],['Availability',`${C.roster.filter(p=>!global.TLMatchdayData.avail(c.now,c.season.value.injuries).some(q=>q.id===p.id)).length} out`]])}</div>`:f.planned?'<p class="cc-callout">Planned friendly · Not confirmed or playable.</p>':'';
    const ratings = report ? `<hr><h3 class="cc-eyebrow">Riverside player ratings</h3><div class="cc-line-ratings">${Object.entries(C.matchReport.ratings).map(([id,r])=>`<div>${playerLink(id)} <b>${esc(r)}</b></div>`).join('')}</div>`:'';
    const body=`<h2 class="cc-title">${esc(opponent.name)} (${f.venue}) · ${esc(timeSpan(f,c.now))}</h2>${score(c,f)}${reportRows(c,f)}<div class="cc-fixture-meta">${icon(f.comp==='FR'?'ball':'cup')}<strong>${esc(H.fixtureCompetition(f))}</strong><p>${H.calendar(f.date).long} · ${stamp(f.date)}</p><p class="cc-icon-text">${icon('stadium')}${esc(stadium(f))}</p>${report?`<p>Attendance: ${num(C.matchReport.attendance)}</p>`:''}</div>${upcoming}${ratings}${actual?`<p class="cc-muted cc-archive-note">${f.pen?`Shootout: ${f.pen.join(' – ')} (Riverside first).`:'Result recorded at the final whistle.'}</p>`:done&&!report?'<p class="cc-muted cc-archive-note">Archive result from the opening season record.</p>':''}`;
    const actions=`${btn('Past meetings','meetings',f.id,{kind:'outline',arrow:true})}${report?link('inbox','View match report','messages','match'):''}${actual?link('inbox','View match report','messages',`result-${f.id}`):''}${!done&&!f.planned?btn(c.s.reminders.includes(f.id)?'Remove reminder':'Set reminder','reminder',f.id,{kind:'outline',pressed:c.s.reminders.includes(f.id)}):''}${f.planned?btn('Remove draft','delete-friendly',f.id,{kind:'outline'}):''}`;
    return `<aside class="cc-card cc-fixture-detail">${U.scroll('fixture-detail','Selected fixture details',body,'cc-fixture-detail-scroll')}<div class="cc-actions">${actions}</div></aside>`;
  }
  function youthFixtures(c,key){
    const team=teams.find(x=>x[0]===key)[1];
    return `<div class="cc-toolbar"><h2 class="cc-title">${esc(team)} fixtures</h2>${link('schedule','First team fixtures','fixtures')}${link('schedule',key==='u21'?'Under 18s':'Under 21s','fixtures',key==='u21'?'u18':'u21')}</div>${card('',table(`${team} fixtures`,['Date','Opposition','Venue','Result'],C.youthFixtures[key].map(([date,club,venue,result])=>tr([H.calendar(Date.parse(date)).long,clubName(c,club),venue,result||'Scheduled'])),'youth-fixtures')+`<div class="cc-actions">${link('development',`${team} squad`,key)}</div>`)}`;
  }
  function fixturePage(c){
    if(C.youthFixtures[c.r.id])return youthFixtures(c,c.r.id);
    const rows=allFixtures(c).filter(f=>(!c.ui.comp||c.ui.comp==='all'||c.ui.comp===f.comp)&&(!c.ui.period||c.ui.period==='all'||c.ui.period===monthId(f))&&(!c.ui.fixtureMode||c.ui.fixtureMode==='all'||(c.ui.fixtureMode==='played'?!!f.score:!f.score)));
    const selected=lookup(rows,c.r.id)||lookup(rows,c.ui.selected)||rows.find(f=>f.id===K.next(c.season.value)?.id)||rows[0];
    return `<div class="cc-schedule cc-fill"><section class="cc-schedule-list"><div class="cc-toolbar cc-schedule-tools"><h2 class="cc-title">Fixtures</h2>${select('fixtureMode','Fixture view',[['all','All fixtures'],['upcoming','Upcoming'],['played','Results']],c.ui.fixtureMode||'all')}<span class="cc-spacer"></span><span class="cc-season">2024/25</span>${commonPeriod(c)}${select('comp','Competition filter',compFilter,c.ui.comp||'all')}</div>${fixturesTable(c,rows,selected)}${fixturesNav()}</section>${fixtureDetail(c,selected)}</div>`;
  }
  function calendar(c){
    const id=c.ui.calendar||iso(c.now).slice(0,7), start=Date.parse(`${id}-01T00:00Z`), startDay=(new Date(start).getUTCDay()+6)%7;
    const [y,m]=id.split('-').map(Number), max=new Date(Date.UTC(y,m,0)).getUTCDate(), boxCount=Math.ceil((startDay+max)/7)*7;
    const fixtures=allFixtures(c);
    const boxes=Array.from({length:boxCount},(_,i)=>{
      const d=i-startDay+1;
      if(d<1||d>max)return '<div class="cc-calendar-blank"></div>';
      const date=iso(start+(d-1)*dayMs), f=fixtures.find(x=>iso(x.date)===date);
      return `<div${date===iso(c.now)?' class="cc-today"':''}><strong>${d}</strong>${f?`<button type="button" class="cc-calendar-fixture" data-c-go="schedule" data-c-tab="fixtures" data-c-id="${f.id}" title="${esc(H.clubs[f.opponent].name)} (${f.venue})">${c.crest(f.opponent)}<span>${esc(H.clubs[f.opponent].short)} ${f.score?f.score.join('–'):f.venue}</span></button>`:''}</div>`;
    }).join('');
    return `<div class="cc-toolbar"><h2 class="cc-title">${readableMonth(id)}</h2><span class="cc-spacer"></span>${commonPeriod(c,true)}</div><div class="cc-calendar">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>`<header>${d}</header>`).join('')}${boxes}</div>`;
  }
  function events(c,reminders=false){
    const saved=c.s.reminders;
    const list=allFixtures(c).filter(f=>!f.score&&!f.planned&&(!reminders||saved.includes(f.id)));
    return card(reminders?'Fixture reminders':'Upcoming events',`<p class="cc-muted">${reminders?'Saved here for this starter season. No external notifications are sent.':'Confirmed fixtures on the first-team calendar.'}</p>${list.length?table('Upcoming fixtures',['Date','Fixture','Competition','Reminder'],list.map(f=>tr([H.calendar(f.date).date,`<button type="button" class="cc-text" data-c-do="fixture" data-c-val="${f.id}">${clubName(c,f.opponent)}</button>`,esc(H.fixtureCompetition(f)),btn(saved.includes(f.id)?'Remove reminder':'Set reminder','reminder',f.id,{kind:'outline',pressed:saved.includes(f.id)})])),'events'):empty('No reminders set','You can set one from any upcoming fixture.')}<div class="cc-actions">${link('schedule',reminders?'Upcoming events':'Reminders',reminders?'events':'reminders')}${link('inbox','Press conference','messages','media')}</div>`);
  }
  views.schedule={
    title:'Schedule',tabs:tabs(['fixtures','Fixtures'],['calendar','Calendar'],['events','Events'],['reminders','Reminders']),
    enter(c){
      if(c.r.tab!=='fixtures')return;
      if(lookup(allFixtures(c),c.r.id)) { c.ui.selected=c.r.id;c.ui.comp='all';c.ui.period='all';c.ui.fixtureMode='all'; }
    },
    after(c,prev){
      if(c.r.tab!=='fixtures'||C.youthFixtures[c.r.id])return;
      const row=document.querySelector('.cc-selected-fixture'), list=row?.closest('[data-c-scroll]');
      if(row && list && (prev.page!=='schedule'||prev.tab!=='fixtures'||c.r.id)) {
        if(c.r.id && c.narrow()) {
          const detail=document.querySelector('.cc-fixture-detail');
          detail?.querySelector('h2')?.setAttribute('tabindex','-1');
          detail?.querySelector('h2')?.focus({preventScroll:true});
          detail?.scrollIntoView({block:'start'});
        } else {
          const rr=row.getBoundingClientRect(), lr=list.getBoundingClientRect();
          if(rr.bottom>lr.bottom || rr.top<lr.top+31) list.scrollTop+=rr.top-lr.top-Math.min(125,list.clientHeight*.38);
        }
      }
    },
    render(c){return c.r.tab==='fixtures'?fixturePage(c):c.r.tab==='calendar'?calendar(c):events(c,c.r.tab==='reminders');},
    action(c,cmd,id){
      if(cmd==='period-step'||cmd==='calendar-step'){
        const list=periods(c), key=cmd==='period-step'?'period':'calendar';
        const i=list.indexOf(c.ui[key]||(key==='calendar'?iso(c.now).slice(0,7):'all'));
        c.ui[key]=i<0?(id==='1'?list[0]:list.at(-1)):list[i+Number(id)]||c.ui[key]; c.render(false);
      } else if(cmd==='reminder'){
        const removing=c.s.reminders.includes(id); if(c.apply('reminders',id)){c.render();c.note(removing?'Fixture reminder removed.':'Fixture reminder saved.');}
      } else if(cmd==='meetings'){
        const f=lookup(allFixtures(c),id); if(!f)return;
        const history=c.fixtures().filter(x=>x.id!==f.id&&x.score&&x.opponent===f.opponent&&x.date<=f.date).reverse();
        const previous=f.opponent===H.next.opponent?[...history,...C.lastMeetings.filter(x=>!history.some(y=>y.date===x.date))]:history;
        c.show(`Past meetings · ${H.clubs[f.opponent].name}`,previous.length?table('Past meetings',['Date','Venue','Riverside score','Competition'],previous.map(x=>tr([H.calendar(x.date).date,x.venue,x.score.join(' – '),esc(H.fixtureCompetition(x))])),'meetings'):empty('No result in the starter records'));
      } else if(cmd==='plan-friendly'){
        const candidates=Object.values(H.clubs).filter(x=>x.id!==H.homeId).map(x=>[x.id,x.name]);
        const first=Math.max(K.day(c.now)+K.DAY,K.date('2024-10-31')), occupied=new Set(allFixtures(c).map(f=>K.iso(f.date)));
        let free=first;while(occupied.has(K.iso(free)))free+=K.DAY;
        const max=K.date('2025-05-31'), available=free<=max;
        if(!available)return c.show('Arrange a friendly',empty('No dates left for friendly drafts','Published fixtures and results stay unchanged.'));
        c.show('Arrange a friendly',U.editForm('friendly','',U.formSelect('opponent','Opponent',candidates)+U.formField('date','Preferred date','date',K.iso(free),`min="${K.iso(first)}" max="2025-05-31"`)+U.formSelect('venue','Venue',[['H','Home'],['A','Away']]),'Save friendly draft','Plan a date for the staff to review. This only adds a draft to the schedule.'));
      } else if(cmd==='delete-friendly' && c.apply('friendly-delete',id)) { c.go('schedule','fixtures','',true); c.note('Friendly draft removed.'); }
    },
    submit(c,cmd,id,data){
      if(cmd!=='friendly')return;
      const date=data.get('date'),opponent=data.get('opponent'),venue=data.get('venue'),key=`friendly-${date}-${opponent}`;
      if(date<=K.iso(c.now)||c.fixtures().some(f=>K.iso(f.date)===date)||!c.apply('friendly',{id:key,date,opponent,venue}))return 'Choose a free day in the future. Up to eight friendlies can be planned.';
      c.close();c.go('schedule','fixtures',key);c.note('Friendly draft saved.');
    }
  };

  const squadTabs=tabs(['overview','Overview'],['international','International'],['stats','Player Stats'],['medical','Availability']);
  const posGroup = { GK:['GK'],Defense:['DC','FB'],Midfield:['DM','CM','AM'],Attack:['W','ST'] };
  const slotNames=[...C.positions,...Array.from({length:6},(_,i)=>'S'+(i+1))];
  const playerCard = (c,p)=>`<div class="cc-person">${avatar(c,p.name,p.id)}<div>${playerLink(p.id)}<small>${esc(p.position)}</small></div></div>`;
  function filteredRoster(c){
    const stats = c.r.tab==='stats';
    const {q,position,available,slot}=c.ui;
    const {sort:key, direction}=sortState(c);
    const s=c.season.value, ready=new Set(global.TLMatchdayData.avail(s.now,s.injuries).map(p=>p.id)), source=stats?Object.values(S.playerStats(s)):C.roster;
    return source.filter(p=>U.textMatch(stats?c.ui.statsQ:q,p.name,p.role,p.nation,C.nation[p.nation])&&(stats||((!position||position==='all'||posGroup[position]?.includes(p.pos))&&(!available||ready.has(p.id))&&(slot==null||slot===''||c.s.sheet[Number(slot)]===p.id)))).sort((a,b)=>{
      const av=a[key], bv=b[key];
      const value=typeof av==='string'?av.localeCompare(bv):(av-bv);
      return (direction==='desc'?-value:value)||a.name.localeCompare(b.name);
    });
  }
  function sortState(c){
    return c.r.tab==='stats'? (c.ui.statsOrder||{sort:'goals',direction:'desc'}) : (c.ui.overviewOrder||{sort:'num',direction:'asc'});
  }
  function sortCol(c,key,label){
    const {sort,direction}=sortState(c);
    return {sort:key===sort?(direction==='desc'?'descending':'ascending'):null,html:btn(label,'sort-squad',key,{kind:'sort'})};
  }
  const slotSelect = (c,p) => S.availability(c.season.value,p.id).out?tag('Out','bad'):p.injury?.status==='Out'?tag('Tactics','info'):select(`sheet:${p.id}`,`Lineup slot for ${p.name}`,[[-1,'Not in lineup'],...slotNames.map((name,i)=>[i,name])],c.s.sheet.indexOf(p.id));
  function positionChips(c){
    return `<div class="cc-slot-bar" aria-label="Lineup slots"><span>${btn('All','slot','',{pressed:!c.ui.slot})}</span>${slotNames.map((n,i)=>`<span data-sub="${i>=11}" data-filled="${!!c.s.sheet[i]}">${btn(n,'slot',i,{pressed:c.ui.slot===String(i),label:c.s.sheet[i]?`${n}: ${C.players[c.s.sheet[i]].name}`:`${n}: unassigned`})}</span>`).join('')}</div>`;
  }
  function overview(c){
    const attrs=c.ui.squadView==='attributes', all=filteredRoster(c), ready=p=>S.availability(c.season.value,p.id), issue=p=>ready(p).out?tag('Inj','bad'):ready(p).risk!=='Low'?tag('Load','warn'):'';
    const col=attrs?['Pkd','Inf',sortCol(c,'name','Name'),'Position','Pace','Passing','Shooting','Tackling','Dribbling','Positioning','Stamina']:['Pkd','Inf',sortCol(c,'name','Name'),'Position','Best pos','Best role',sortCol(c,'age','Age'),'Nat','Agreed playing time',sortCol(c,'ability','Ability'),sortCol(c,'potential','Potential'),sortCol(c,'value','Transfer value')];
    const rows=all.map(p=>tr([slotSelect(c,p),issue(p),`<span class="cc-player-table-name"><span aria-hidden="true">${c.season.value.plan.numbers[p.id]}</span>${playerLink(p.id)}</span>`,esc(p.position),...(attrs?['pace','passing','shooting','tackling','dribbling','positioning','stamina'].map(k=>`<b class="cc-${p.attrs[k]>=15?'good':p.attrs[k]>=10?'text-muted':'warn'}">${p.attrs[k]}</b>`):[p.bestPos,esc(p.role),p.age,nation(p.nation),esc(p.playing),stars(p.ability),stars(p.potential),`<span class="cc-price-chip">${H.millions(p.value)}</span>`])],ready(p).out?'cc-out-row':''));
    return `<div class="cc-squad cc-fill"><div class="cc-toolbar"><h2 class="cc-title">Players</h2>${select('squadView','Squad table view',[['general','General info'],['attributes','Attributes']],c.ui.squadView||'general')}<span class="cc-spacer"></span>${btn('Quick Pick','quick-pick','balanced',{kind:'solid',icon:'team'})}${select('pickMode','Quick Pick options',[['','Selection options'],['fitness','Prioritise fitness'],['clear','Clear team sheet']], '')}</div>
    ${positionChips(c)}<div class="cc-toolbar cc-squad-filters">${search('q',c.ui.q,'Find a player')}${select('position','Filter positions',[['all','All positions'],...Object.keys(posGroup)],c.ui.position||'all')}${U.check('available','Available only',c.ui.available)}<span class="cc-spacer"></span>${btn('New advice','squad-advice','',{kind:'text',arrow:true})}</div>
    <p class="cc-mobile-table-hint cc-muted">Swipe the table to see all columns.</p>
    ${rows.length?table('Riverside senior squad',col,rows,'squad',`cc-squad-table${attrs?' cc-attributes':''}`):empty('No players match this selection','Check the lineup slot, availability and position filters.')}
    <div class="cc-squad-rules"><details><summary>Selection and cup fixture rules</summary><p>This is a draft team sheet. Use Club tactics or Team Selection on the fixture date to choose your competitive XI.</p></details><span class="cc-muted">4-3-3 · ${c.s.sheet.slice(0,11).filter(Boolean).length}/11 picked · ${all.length} shown</span>${link('tactics','Club tactics','overview')}</div></div>`;
  }
  function international(c){
    const group=C.roster.reduce((acc,p)=>{(acc[p.nation]??=[]).push(p);return acc;},{});
    return `<div class="cc-grid3">${Object.entries(group).sort(([a],[b])=>a.localeCompare(b)).map(([id,players])=>card(C.nation[id],`<p class="cc-muted">${nation(id)} · ${players.length} ${players.length===1?'player':'players'}</p>${players.map(p=>playerCard(c,p)).join('')}`)).join('')}</div>`;
  }
  function stats(c){
    const rows=filteredRoster(c).map(p=>tr([playerLink(p.id),esc(p.position),p.appearances,p.goals,p.assists,`${p.pass}%`,p.awards,p.yellow,p.redCards,rank(p.rating)]));
    return card('Player statistics',`<p class="cc-muted">Riverside first team · All competitive fixtures</p><div class="cc-toolbar">${search('statsQ',c.ui.statsQ,'Find a player')}<span class="cc-spacer"></span>${link('inbox','Latest match report','messages',c.mail().find(m=>m.id.startsWith('result-'))?.id||'match')}</div>${rows.length?table('Player statistics',[sortCol(c,'name','Player'),'Position',sortCol(c,'appearances','Apps'),sortCol(c,'goals','Goals'),sortCol(c,'assists','Assists'),sortCol(c,'pass','Pass %'),sortCol(c,'awards','POTM'),sortCol(c,'yellow','YC'),sortCol(c,'redCards','RC'),sortCol(c,'rating','Avg rating')],rows,'squad-stats'):empty('No matching players')}`);
  }

  function medical(c){
    const fit=global.TLClubReadiness.fitness(c), out=fit.filter(p=>p.out).length, risk=fit.filter(p=>p.risk!=='Low').length;
    return card('Squad availability',`<div class="cc-toolbar"><span>${tag(`${out} unavailable`,out?'bad':'good')} ${tag(`${risk} monitored`,'info')}</span><span class="cc-spacer"></span>${link('medical','Medical Centre','overview')}</div>${global.TLClubReadiness.riskTable(c)}`);
  }
  views.squad={
    title:'Squad',tabs:squadTabs,
    render(c){return ({overview,international,stats,medical})[c.r.tab](c);},
    field(c,key,value){
      if(key.startsWith('sheet:')) {c.apply('sheet-player',{id:key.slice(6),slot:Number(value)});c.ui.slot='';c.render();return true;}
      if(key==='pickMode'&&value){c.apply(value==='clear'?'clear-sheet':'quick-pick',value);c.ui.slot='';c.render();c.note(value==='clear'?'Team sheet cleared.':'Team sheet updated, prioritising fitness.');return true;}
    },
    action(c,cmd,id){
      if(cmd==='slot'){c.ui.slot=c.ui.slot===id?'':(id??'');c.render();}
      else if(cmd==='sort-squad'){
        const prior=sortState(c), order=c.r.tab==='stats'?'statsOrder':'overviewOrder';
        c.ui[order]={sort:id,direction:prior.sort===id?(prior.direction==='desc'?'asc':'desc'):['value','ability','potential','goals','assists','rating','pass','appearances'].includes(id)?'desc':'asc'}; c.render();
      } else if(cmd==='quick-pick'){c.apply('quick-pick',id);c.ui.slot='';c.render();c.note('Quick Pick updated the planning lineup.');}
      else if(cmd==='squad-advice')c.show('Squad advice',`<p>${c.fixtures().filter(f=>!f.score&&K.day(f.date)<K.day(c.now)+7*K.DAY).length} confirmed first-team fixtures in the next seven days. Check condition before picking the XI.</p><div class="cc-actions">${link('medical','Current injury update','overview')}${link('development','First-team candidates','overview')}</div>`);
    }
  };
})(window);
