/* Calendar, daily results, and the sample pre-match presentation. */
(function (global) {
  'use strict';
  const X=global.TLMatchdayUI,{M,U,stage,player,shirt,pitch,section,scoreStrip,scene,longDate,dayName,sessionClass,sessionIcon,teamSwitch,matchMeta}=X;
  const {H,C,esc,icon,btn,link,avatar,tag,select,card,clubName,stamp,standings}=U;
  const sessions=global.TLClubReadiness.sessionList;
  const progress = c=>M.day(c.r.id);
  const lead = d=>d.id===M.fixtureDay?'Matchday':H.leadTime(d.date,M.fixture.date)==='1 day'?'Tomorrow':H.leadTime(d.date,M.fixture.date);
  const mdDay=(d,label,kind='outline')=>stage('calendar',label,d.id,kind);
  function calendar(c){
    const day=progress(c),index=M.reviewDays.indexOf(day),next=M.reviewDays[index+1],prev=M.reviewDays[index-1], sinceStart=day.id===M.firstDay;
    const lane=M.plan.map(d=>{
      const active=d.id===day.id, canBrowse=M.reviewDays.includes(d), date=new Date(d.date);
      const fixture=d.fixture, cup=fixture===M.fixture;
      const open=canBrowse?`data-c-go="matchday" data-c-tab="calendar" data-c-id="${d.id}"`:`data-c-go="schedule" data-c-tab="calendar"`;
      return `<article class="md-cal-day${active?' md-cal-active':''}${cup?' md-cal-cup':''}" data-cal-day="${d.id}"><button type="button" class="md-cal-date" ${open}${active?' aria-current="date"':''} aria-label="${esc(longDate(d.date))}"><b>${date.getUTCDate()}</b><span>${dayName(d.date).slice(0,3)}<small>${date.getUTCMonth()===10?'Nov':'Oct'}</small></span></button><div class="md-cal-items">
        ${fixture?`<button class="md-cal-fixture" type="button" ${fixture===M.fixture?'data-c-go="matchday" data-c-tab="fixtures" data-c-id="cup"':fixture===C.reportFixture?'data-c-go="matchday" data-c-tab="fixtures" data-c-id="league"':`data-c-go="schedule" data-c-tab="fixtures" data-c-id="${fixture.id}"`}><span>${esc(fixture.comp==='LC'?'League Cup · R4':'Premier Division')}</span>${c.crest(fixture.opponent)}<b>${esc(H.clubs[fixture.opponent].name)}</b><small>${fixture.score?`${fixture.score[0]}–${fixture.score[1]} win`:fixture.venue==='H'?'Home':'Away'} · ${stamp(fixture.date)}</small></button>`:''}${sessions(d.sessions,false)}
        ${d.youth?`<div class="md-cal-youth">${c.crest(d.youth[1])}<div><b>Under 21s</b><small>${esc(H.clubs[d.youth[1]].name)} (A)</small></div></div>`:''}
      </div></article>`;
    }).join('');
    const agenda=day.id===M.fixtureDay?[
      ['Tactical meeting','Brief the selected squad on the cup plan.',stage('briefing','Briefing')],['Team sheets','Review both sides before the teams walk out.',stage('lineups','Lineups')],['Fixtures for the day','The other fourth-round ties kick off at 19:45.',stage('fixtures','Cup fixtures','cup')]
    ]:sinceStart?[
      ['League results','Riverside won 4–0 at Vale Arena.',stage('fixtures','Daily results','league')],['Press conference','Reporters are waiting for the post-match reaction.',stage('post','Press preview','press')],['Training and recovery','Review the squad’s expected workload ahead of the cup tie.',link('medical','Injury update')]
    ]:[
      ['Preparation',`Today: ${day.sessions.join(' · ')}.`,link('training','Training','week',day.id)],['Training workload','The medical team is monitoring four first-team players.',link('medical','Injury update')],['Cup opposition','Review the potential Harbourport shape and squad.',stage('lineups','Opposition lineup',M.away.id)]
    ];
    return `<div class="md-calendar" data-preview-date="${day.id}"><section class="md-calendar-hero"><div class="md-calendar-count"><span>Next fixture</span><strong>${lead(day)}</strong></div><div class="md-calendar-pair">${c.crest(M.home.id)}<span>v</span>${c.crest(M.away.id)}</div><div class="md-calendar-hero-copy"><p class="cc-eyebrow">${esc(H.fixtureCompetition(M.fixture))}</p><h2>${esc(M.matchTitle)}</h2><p>${esc(longDate(M.fixture.date))} · ${stamp(M.fixture.date)} · ${esc(M.home.stadium)}</p></div><div class="md-calendar-action">${next?mdDay(next,'Next day','primary'):stage('fixtures','Matchday fixtures','cup','primary')}${prev?mdDay(prev,'Previous day','solid'):btn('Previous day','no-day','',{disabled:true})}</div></section>
      <section class="md-calendar-card"><div class="md-calendar-toolbar"><div><h2 class="cc-title">Calendar</h2><b>October – November 2024</b></div><div class="md-date-control">${select('mdDay','Preview date',M.reviewDays.map(d=>[d.id,longDate(d.date)]),day.id)}</div></div>${U.scroll('md-calendar','Calendar: 25 October to 2 November',`<div class="md-cal-strip">${lane}</div>`,'md-calendar-scroll')}</section>
      <div class="md-calendar-bottom"><section class="cc-card md-agenda"><div><span class="cc-eyebrow">Club diary</span><h2>${esc(longDate(day.date))}</h2></div>${agenda.map(([title,copy,action])=>`<article><div><h3>${title}</h3><p>${copy}</p></div>${action}</article>`).join('')}</section><aside class="cc-card md-calendar-summary"><h2 class="cc-title">Week at a glance</h2><dl><div><dt>Recent league form</dt><dd>${U.form(H.form.slice(-5))}</dd></div><div><dt>First-team training</dt><dd>${tag('Medium','info')}</dd></div><div><dt>Next league fixture</dt><dd>${clubName(c,H.fixtures[H.fixtures.indexOf(M.fixture)+1].opponent)} <small>2 Nov</small></dd></div></dl><p>Browse these dates without advancing the club’s actual calendar.</p></aside></div></div>`;
  }
  function fixtureRows(c,list,mode,details){
    return list.map(([time,host,guest,score,scorers])=>{
      const results=mode!=='cup', ours=[host,guest].includes(M.home.id);
      const label=`${H.clubs[host].name} ${results?score.join(' to '):'v'} ${H.clubs[guest].name}`;
      const action=ours?mode==='league'?link('schedule','Report','fixtures',C.reportFixture.id,'outline',false):mode==='cup-results'?stage('full','Analysis','','outline',false):stage('briefing','Briefing','','primary',false):btn('Details','md-result-details',`${mode}:${host}`,{label:`Details: ${label}`});
      const side=(id,i)=>`<div class="md-fixture-team md-fixture-side${i}">${c.crest(id)}<div><strong>${esc(H.clubs[id].name)}</strong>${details&&results&&scorers[i]?`<small>${esc(scorers[i])}</small>`:''}</div></div>`;
      return `<article class="md-result-row${ours?' md-result-local':''}" aria-label="${esc(label)}"><time>${time}</time>${side(host,0)}<b class="md-result-score${results?' md-result-played':''}">${results?score.join(' – '):'v'}</b>${side(guest,1)}<div class="md-result-action">${action}</div></article>`;
    }).join('');
  }
  const dateArrow=(dir,label,id,disabled)=>`<button type="button" class="cc-btn cc-btn-solid" data-c-go="matchday" data-c-tab="fixtures" data-c-id="${id}" aria-label="${label}"${disabled?' disabled':''}>${dir}</button>`;
  function fixtures(c){
    const mode=['league','cup-results'].includes(c.r.id)?c.r.id:'cup', league=mode==='league', details=c.ui.fixtureDetails!==false, rows=league?M.leagueFixtures:M.cupFixtures;
    return `<div class="md-fixture-view"><div class="md-fixture-toolbar"><div class="md-fixture-title"><span class="md-mini-icon">${icon(league?'shield':'cup')}</span><div><h2>${esc(league?H.division:'League Cup')}</h2><p>${league?'Premier Division · Matchweek 11':'Fourth Round · 2024/25'}</p></div></div><div class="md-fixtures-controls">${dateArrow('‹','Previous fixture date','league',league)}${select('mdFixtureDate','Fixture date',[['league','Saturday 26 October'],[mode==='cup-results'?'cup-results':'cup','Wednesday 30 October']],mode)}${dateArrow('›','Next fixture date','cup',!league)}${stage('fixtures','Latest Results','cup-results',mode==='cup-results'?'primary':'solid',false)}${stage('fixtures','Next Fixtures','cup',mode==='cup'?'primary':'solid',false)}</div></div>
      <div class="md-fixture-layout"><section class="cc-card md-results-list"><div class="md-results-head"><div><span class="cc-eyebrow">${league?'Matchweek 11':mode==='cup'?'Fourth Round':'Fourth Round · Sample results'}</span><h2 class="cc-title">Fixtures &amp; Results</h2></div>${btn(details?'Hide scorer details':'Show scorer details','md-details','',{pressed:details,disabled:mode==='cup'})}</div>${fixtureRows(c,rows,mode,details)}<div class="cc-actions cc-actions-start">${league?stage('fixtures','Cup round','cup'):btn('View stage','md-round','',{kind:'outline',arrow:true})}${league?link('competitions','League table','competitions','PD'):stage(mode==='cup'?'briefing':'full',mode==='cup'?'Tactical meeting':'Full-time review','','primary')}</div></section>
        ${league?card('Premier Division standings',standings(c,H.division,H.standings,'md-league')+`<p class="cc-muted">Starter-season table, unaffected by preview scores.</p>`,'md-league-rail'):card('Cup at a glance',`<div class="md-cup-mark">${icon('cup')}<b>LEAGUE CUP</b><span>2024 / 25</span></div><dl class="md-compact-facts"><div><dt>Stage</dt><dd>Fourth Round</dd></div><div><dt>Selected ties</dt><dd>${M.cupFixtures.length}</dd></div><div><dt>Riverside venue</dt><dd>${esc(M.home.stadium)}</dd></div></dl>${stage('calendar','View calendar')}`,'md-cup-rail')}
      </div></div>`;
  }
  const briefingCards=[
    ['The group is comfortable in the 4–3–3 and knows the pressing triggers.','rvr_9','Encouraged','good'],
    ['The team is ready to use both flanks against Harbourport’s narrow midfield.','rvr_14','Satisfied','good'],
    ['The planned tempo should suit the players available for this tie.','rvr_17','Confident','good'],
    ['Leave a covering player behind the ball when the full-backs push up.','rvr_5','Understands','info'],
    ['Watch for the visitors’ direct outlet into their two strikers.','rvr_0','Focused','info'],
    ['Check the workload of players who started at Vale Arena before kick-off.','rvr_12','Managing load','warn']
  ];
  function briefing(c){
    const name=C.namedStaff['Assistant Manager'];
    return scene('briefing',`<section class="md-scene-panel md-briefing-panel"><div class="md-briefing-head"><div><span class="cc-eyebrow">Pre-match meeting</span><h2>Briefing feedback</h2><p>${esc(M.matchTitle)} · ${esc(matchMeta)}</p></div>${c.crest(M.home.id)}</div><div class="md-briefing-intro">${avatar(c,name)}<div><strong>${esc(name)} <small>Assistant Manager</small></strong><p>The matchday squad has been briefed on the team shape and approach for the cup tie.</p></div></div><h3 class="cc-title">Notable reactions</h3><div class="md-reaction-grid">${briefingCards.map(([copy,id,tone,color])=>`<article><p>${esc(copy)}</p><div class="cc-person">${avatar(c,C.players[id].name,id)}<div>${player(id)}<div>${tag(tone,color)}</div></div></div></article>`).join('')}</div><div class="cc-actions cc-actions-start"><span>${link('tactics','Tactics','overview')}${link('medical','Injury update')}</span>${stage('lineups','View lineups','','primary')}</div></section>`,'md-briefing-scene');
  }
  const lineupSide=c=>c.r.id===M.away.id?M.away.id:M.home.id;
  function lineups(c){
    const a=lineupSide(c),team=a===M.home.id?M.starting:M.opposition,club=H.clubs[a],staff=a===M.home.id?H.manager:H.opponentManager;
    const choice=[M.home,M.away].map(t=>`<button type="button" data-c-go="matchday" data-c-tab="lineups" data-c-id="${t.id}" aria-pressed="${t.id===a}">${c.crest(t.id)}${esc(t.name)}</button>`).join('');
    const eleven=team.xi.map(({player:p,label})=>`<li><b>${p.num}</b><span>${C.players[p.id]?player(p.id):esc(p.name)}</span><small>${label}</small></li>`).join('');
    return scene('floodlights',`<section class="md-lineup-sheet" data-lineup-team="${a}"><div class="md-lineup-overline">${icon('cup')}<b>League Cup</b><span>Fourth Round</span><span>Starting lineups</span></div><div class="md-lineup-top"><div class="md-lineup-toggle" aria-label="Lineup team">${choice}</div><span>${esc(M.home.stadium)} · ${stamp(M.fixture.date)}</span></div><div class="md-lineup-main"><div class="md-eleven"><span class="md-lineup-label">${a===M.home.id?'Home':'Away'} team · Starting XI</span><ol>${eleven}</ol></div><div class="md-lineup-pitch">${pitch(c,team.xi,{club:a,mode:'numbers',label:`${club.name} starting lineup`})}<p>${team.shape} · Attacking direction ↑</p></div><div class="md-lineup-club">${c.crest(a)}<h2>${esc(club.name)}</h2><span>${esc(staff)}</span><small>Manager</small></div></div><div class="md-lineup-bench"><b>Substitutes</b><span>${team.bench.map(p=>`${p.num} ${p.name}`).join(' · ')}</span></div><div class="cc-actions cc-actions-start"><div>${stage('briefing','Back to briefing','','outline',false)}</div><div>${btn('Open playable fixture','go-match','',{kind:'outline',icon:'i-play'})} ${stage('half','View half time','','primary')}</div></div></section>`,'md-lineup-scene');
  }
  function preAction(c,cmd,value){
    if(cmd==='md-details'){c.ui.fixtureDetails=c.ui.fixtureDetails===false;c.render();}
    else if(cmd==='md-result-details'){
      const [mode,id]=value.split(':'),fixture=(mode==='league'?M.leagueFixtures:M.cupFixtures).find(row=>row[1]===id);if(!fixture)return;
      const [time,host,guest,score,sc]=fixture;
      c.show('Fixture detail · Sample',`<p>${esc(H.clubs[host].name)} ${mode==='cup'?'v':score.join(' – ')} ${esc(H.clubs[guest].name)}</p><p class="cc-muted">${mode==='league'?'Saturday 26 October':'Wednesday 30 October'} · ${time}</p>${mode==='cup'?'':`<p>${sc.filter(Boolean).map(esc).join(' · ')||'No goalscorers.'}</p>`}<p>This fixture is part of the daily results preview.</p>`);
    }else if(cmd==='md-round')c.show('League Cup · Fourth Round',`<p>Wednesday 30 October 2024 · ${M.cupFixtures.length} ties shown</p><p>The winners progress to the quarter-finals. The Riverside tie can be played separately in Classic 2D.</p>${stage('fixtures','Sample cup results','cup-results')}`);
  }
  Object.assign(X,{calendar,fixtures,briefing,lineups,preAction});
})(window);
