/* Riverside's manager's office, the daily handover and the squad depth board. */
(function(global){
  'use strict';
  const U=global.TLClubUI, S=global.TLSeasonState, K=global.TLSeasonCalendar;
  const {H,C,esc,icon,art,link,btn,tag,stamp}=U;
  const {longDate,condition}=global.TLMatchdayUI;
  const action=(label,id,kind='outline',glyph='')=>`<button class="cc-btn cc-btn-${kind}" type="button" data-hc-open="${id}">${glyph?icon(glyph):''}${esc(label)}${icon('i-arrow')}</button>`;
  const panelHead=(title,small,extra='')=>`<header class="tl-panel-head"><div>${small?`<p class="tl-label">${esc(small)}</p>`:''}<h2>${esc(title)}</h2></div>${extra}</header>`;
  const comp=f=>H.fixtureCompetition(f);
  const home=H.clubs[H.homeId];
  const kinds={training:'cone',fixture:'cup',staff:'team',press:'tv',news:'radar',mail:'mail'};
  const resultText=f=>f.pen?`${f.score.join('–')} (${f.pen.join('–')}p)`:(f.score||[]).join('–');
  const resultStatus=f=>{const [a,b]=f.pen||f.score;return a>b?'W':a===b?'D':'L';};

  function matchHero(c,next){
    const s=c.season.value;
    const teams=next?[H.clubs[next.home],H.clubs[next.away]]:[];
    const date=next?`${longDate(next.date)} · ${stamp(next.date)}`:'All published fixtures played';
    const ground=next?H.clubs[next.home].stadium:home.stadium;
    return `<section class="tl-match-hero" aria-label="Next Riverside match">${art('quayside')}
      <div class="tl-hero-content"><div class="tl-hero-top"><p class="tl-label"><i></i>${next?'Next match':'Season review'}</p>${next?`<span class="tl-countdown">${esc(K.countdown(s.now,next.date))}</span>`:''}</div>
      <p class="tl-hero-comp" id="homeCompetition">${esc(next?comp(next):H.division)}</p>
      <h2 id="homeFixtureTitle">${next?`${esc(teams[0].name)} <em>v</em><br>${esc(teams[1].name)}`:'Season complete'}</h2>
      <div class="tl-hero-meta"><time id="homeNextDate"${next?` datetime="${new Date(next.date).toISOString()}"`:''}>${icon('calendar')}${esc(date)}${next?`<span class="hc-sr"> (${K.countdown(s.now,next.date)})</span>`:''}</time><span id="homeStadium">${icon('i-pin')}${esc(ground)}</span></div>
      <div class="tl-hero-cta">${next?link('schedule','Match centre','fixtures',next.id,'primary'):link('schedule','Season results','fixtures',null,'primary')}${link('tactics','Club tactics','overview',null,'outline',false)}</div></div>
      ${next?`<div class="tl-faceoff" aria-hidden="true"><span id="homeBigCrest">${c.crest(next.home)}</span><small>V</small><span id="homeOpponentCrest">${c.crest(next.away)}</span></div><div class="tl-hero-venue">${icon('stadium')} <span>${esc(ground)} / ${next.venue==='H'?'HOME':next.venue==='A'?'AWAY':'NEUTRAL'}</span></div>`:''}
    </section>`;
  }
  function taskRow(c,{label,detail,glyph,tone='',right='',control=''}){
    return `<li class="tl-task ${tone?`tl-task-${tone}`:''}"><span class="tl-task-mark">${icon(glyph)}</span><div><b>${esc(label)}</b><small>${esc(detail)}</small></div>${control||`<span class="tl-task-time">${esc(right)}</span>`}</li>`;
  }
  function todaysDesk(c){
    const s=c.season.value, pending=S.pending(s), due=K.due(s), available=S.activities(s,s.now);
    const slate=K.onDate(s,s.now);
    const items=pending.length?pending.slice(0,3).map(m=>taskRow(c,{label:m.subject,detail:`${m.from} · Response required`,glyph:'mail',tone:'alert',control:`<button type="button" class="tl-row-arrow" data-hc-mail="${esc(m.id)}" aria-label="Respond: ${esc(m.subject)}">${icon('i-arrow')}</button>`})).join(''):
      available.slice(0,3).map(a=>{
        const f=a.kind==='fixture'?slate.find(f=>f.id===a.id):null;
        const control=f?`<button class="tl-row-arrow" type="button" data-hc-fixture="${esc(f.id)}" aria-label="Open ${esc(a.label)} fixture details">${icon('i-arrow')}</button>`:'';
        const detail=f?.result?`${a.desc} · FT ${f.result.goals.join('–')}`:a.desc;
        return taskRow(c,{label:a.label,detail,glyph:kinds[a.kind]||'calendar',right:stamp(a.time),tone:f?'match':'',control});
      }).join('');
    return `<section class="tl-panel tl-agenda" aria-label="Today’s desk">${panelHead('Today’s desk',new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'}).format(s.now),`<button type="button" class="tl-icon" data-hc-open="day" aria-label="Open club calendar">${icon('calendar')}</button>`)}
      <div class="tl-agenda-status"><span></span><b>${pending.length?`${pending.length} ${pending.length===1?'decision':'decisions'} due`:due?'Matchday · Preparation ready':'No outstanding decisions'}</b></div><ul>${items||'<li class="tl-task-empty">No activities scheduled.</li>'}</ul>
      <footer>${due&&!pending.length?`<button type="button" class="cc-btn cc-btn-primary" data-hc-progress>Open tactical meeting ${icon('i-arrow')}</button>`:action('Open calendar','day','plain')}${pending.length?'':`<span class="tl-clock-hint">${icon('check')} Club time</span>`}</footer></section>`;
  }
  function metrics(c,rows){
    const s=c.season.value, pos=rows.findIndex(r=>r.id===H.homeId), row=rows[pos], f=c.fiscal;
    const out=C.roster.filter(p=>S.availability(s,p.id).out).length;
    const unread=c.unread().length;
    const list=[['League position',H.ordinal(pos+1),`${row.pts} points · ${row.played} played`,'cup','league','mint'],['Squad available',`${C.roster.length-out}/${C.roster.length}`,out?`${out} out of selection`:'All clear for selection','i-shirt','medical','blue'],['Inbox',`${unread} unread`,unread?'Review club updates':'You’re up to date','mail','inbox','amber'],['Transfer budget',H.millions(f.transfer),'Current allocation','money','finance','mint']];
    return `<div class="tl-kpis" aria-label="Club at a glance">${list.map(([label,v,copy,glyph,id,tone])=>`<button type="button" class="tl-kpi" data-hc-open="${id}"><span class="tl-kpi-top">${icon(glyph)}<span>${esc(label)}</span>${icon('i-arrow')}</span><strong data-tone="${tone}">${esc(v)}</strong><small>${esc(copy)}</small></button>`).join('')}</div>`;
  }
  function fixtures(c,next){
    const upcoming=c.fixtures().filter(f=>!f.score).slice(0,4), played=c.fixtures().filter(f=>f.score).slice(-2).reverse();
    const print=f=>{const opp=H.clubs[f.opponent], marker=f.score?resultStatus(f):f.id===next?.id?'next':'future', d=new Date(f.date), date=H.calendar(f.date).date.split(' ');
      return `<button type="button" class="tl-fixture" data-hc-fixture="${f.id}" data-next="${marker==='next'}" aria-label="${esc(`${opp.name} · ${comp(f)} · ${H.calendar(f.date).date}${f.score?` · ${resultText(f)}`:''}`)}"><span class="tl-fixture-date"><b>${d.getUTCDate()}</b><small>${date[1]}</small></span>${c.crest(opp.id)}<span class="tl-fixture-name"><b>${esc(opp.name)}</b><small>${f.venue==='H'?'Home':f.venue==='A'?'Away':'Neutral'} · ${esc(comp(f))}</small></span><span class="tl-fixture-pill" data-result="${marker}">${esc(f.score?resultText(f):stamp(f.date))}</span></button>`;};
    return `<section class="tl-panel tl-fixtures" aria-label="Club fixtures">${panelHead('Fixture list','First team',action('All fixtures','fixtures','plain'))}<div id="homeFixtures">${upcoming.map(print).join('')}${!upcoming.length?'<p class="tl-task-empty">No further published fixtures.</p>':''}${played.length?`<p class="tl-list-label">Recent results</p>${played.map(print).join('')}`:''}</div></section>`;
  }
  function league(c,rows){
    const pos=rows.findIndex(x=>x.id===H.homeId), start=Math.max(0,Math.min(pos-2,rows.length-6));
    const table=rows.slice(start,start+6).map((r,i)=>`<tr class="${r.id===H.homeId?'tl-our-row':''}"><td>${i+start+1}</td><td><span>${c.crest(r.id)}${esc(H.clubs[r.id].name)}</span></td><td>${r.played}</td><td>${r.gd>0?'+':''}${r.gd}</td><td><b>${r.pts}</b></td></tr>`).join('');
    const form=c.fixtures().filter(f=>f.score&&f.comp==='PD').slice(-5).map(f=>`<i data-result="${resultStatus(f)}">${resultStatus(f)}</i>`).join('');
    return `<section class="tl-panel tl-table-panel" aria-label="League table">${panelHead('League table',H.division,action('Full table','league','plain'))}<div class="tl-form"><span>Recent league form</span><div>${form}</div></div><div id="homeLeague"><table class="tl-league"><caption class="hc-sr">Premier Division snapshot</caption><thead><tr><th>Pos</th><th>Club</th><th>P</th><th>GD</th><th>Pts</th></tr></thead><tbody>${table}</tbody></table></div></section>`;
  }
  function leaders(c){
    const list=S.leaders(c.season.value);
    const people=list.map(({player,label,value})=>`<button type="button" class="tl-leader" data-c-do="player" data-c-val="${player.id}"><span class="tl-player-photo">${U.avatar(c,player.name,player.id)}</span><span><small>${esc(label)}</small><b>${esc(player.name)}</b></span><strong><span aria-hidden="true">${esc(value.split(' ')[0])}</span><span class="hc-sr">${esc(value)}</span></strong></button>`);
    return `<section class="tl-panel tl-leaders" aria-label="Player stats">${panelHead('Player leaders','Performance',`<button type="button" class="tl-icon" data-hc-collapse="homeLeaders" aria-controls="homeLeaders" aria-expanded="true" aria-label="Toggle player stats">${icon('down')}</button>`)}<div id="homeLeaders">${people.slice(0,4).join('')}<details class="tl-more-stats"><summary>More leaders</summary>${people.slice(4).join('')}</details><footer>${action('Player stats','leaders','plain')}</footer></div></section>`;
  }
  function finance(c){
    const f=c.fiscal, points=f.history.map((v,i)=>`${10+i*15},${47-v/14}`);
    return `<section class="tl-panel tl-ledger" aria-label="Finances">${panelHead('Club ledger','Financial summary',action('Finances','finance','plain'))}<div id="homeFinance"><div class="tl-ledger-amount"><span>Overall balance</span><strong>${H.millions(f.balance)}</strong>${tag('Strong','good')}</div><svg class="tl-ledger-chart" viewBox="0 0 320 84" preserveAspectRatio="none" role="img" aria-label="Balance history, September to October, from below zero to ${H.millions(f.balance)}"><defs><linearGradient id="tl-line-area" x2="0" y2="1"><stop stop-color="#d7f883" stop-opacity=".38"/><stop offset="1" stop-color="#d7f883" stop-opacity=".02"/></linearGradient></defs><path d="M10 47h300M10 26h300M10 68h300" stroke="#829390" opacity=".18"/><path d="M10 78 L${points.join(' L')} L310 78Z" fill="url(#tl-line-area)"/><polyline points="${points.join(' ')}" fill="none" stroke="#d7f883" stroke-width="2" vector-effect="non-scaling-stroke"/></svg><div class="tl-ledger-key"><span>SEP</span><span>OCT</span></div><div class="tl-ledger-detail"><div><span>Season profit</span><b>${H.millions(f.profit)}</b></div><div><span>Transfer budget</span><b>${H.money(f.transfer)}</b></div><div><span>Wage budget</span><b>${H.money(f.wage)}/wk</b></div><div><span>Wages committed</span><b>${H.money(f.committed)}/wk</b></div></div></div></section>`;
  }
  function clubhouse(c){
    const rows=c.standings(), next=K.next(c.season.value), m=c.mail().find(m=>m.id.startsWith('result-'));
    return `<div class="tl-office"><header class="tl-office-head"><div><p class="tl-label">RIVERSIDE FC <span></span> CLUBHOUSE</p><h2>Manager’s Office</h2><p>Your first-team briefing, fixtures and club priorities.</p></div><button type="button" class="tl-office-note" data-hc-open="notebook">${icon('pencil')} Notebook ${icon('i-arrow')}</button></header>
      <div class="tl-hero-grid">${matchHero(c,next)}${todaysDesk(c)}</div>${metrics(c,rows)}
      <div class="tl-office-board">${fixtures(c,next)}${league(c,rows)}${leaders(c)}</div>
      <div class="tl-office-bottom">${finance(c)}<section class="tl-panel tl-terrace" aria-label="The Terrace">${art('supporters')}<div><p class="tl-label">RIVERSIDE SOCIAL</p><h2>The Terrace</h2><p>${esc(m?m.subject:'The cup build-up is under way. See what supporters and the local press are saying.')}</p>${action('Open Social Feed','social','outline','social')}</div></section></div>
    </div>`;
  }
  function processing(c,frame){
    const s=c.season.value, now=K.day(s.now);
    const days=Array.from({length:6},(_,i)=>K.day(frame.now)+(i-1)*K.DAY);
    return days.map(ts=>{
      const date=H.calendar(ts), state=ts===now?'current':ts<now?'past':'future';
      const list=S.activities(s,ts).slice(0,3).map(a=>`<li data-kind="${a.kind}">${icon(kinds[a.kind]||'calendar')}<span>${esc(a.label)}</span></li>`).join('');
      const matches=K.onDate(s,ts), done=matches.filter(f=>f.result).length;
      return `<article class="tl-processing-day" data-day="${state}"${ts===now?' aria-current="date"':''}><header><span>${esc(date.day.slice(0,3))} · ${esc(date.date.split(' ')[1])}</span><strong>${new Date(ts).getUTCDate()}</strong><small>${state==='current'?'Club date':state==='past'?(ts>=K.day(frame.from)?'Processed':'Previous date'):frame.target===ts?'Pause here':'Ahead'}</small></header><ul>${list}</ul>${matches.length?`<p>${done?`${done}/${matches.length} results`:`${matches.length} ${matches.length===1?'fixture':'fixtures'}`}</p>`:''}</article>`;
    }).join('');
  }
  const pauseCopy={
    manual:['Processing stopped','You stopped the club clock. Continue whenever you’re ready.','stop'],
    decision:['Decision needed','Answer the required Inbox items to move the calendar forward.','mail'],
    fixture:['Riverside matchday','Open the tactical meeting when you’re ready. Kick-off remains manual.','cup'],
    target:['Calendar pause reached','The club clock reached the date you selected.','calendar'],
    end:['Season calendar complete','The final published date has been processed.','check'],
    session:['Match in progress','Finish the current matchday before advancing the calendar.','cup'],
    unchanged:['Calendar unchanged','No further time was processed.','stop']
  };
  function handover(c){
    const p=c.calendar?.();
    if(!p?.last||p.last.now!==c.now)return '';
    const {reason,days,messages}=p.last, [title,copy,glyph]=pauseCopy[reason]||pauseCopy.unchanged;
    return `<section class="tl-handover" data-reason="${reason}"><span>${icon(glyph)}</span><div><p class="tl-label">CALENDAR PAUSED · ${days} ${days===1?'DAY':'DAYS'} PROCESSED</p><h2>${esc(title)}</h2><p>${esc(copy)}</p></div>${reason==='decision'&&messages?.[0]?`<button class="cc-btn cc-btn-outline" type="button" data-hc-mail="${esc(messages[0])}">Review decision ${icon('i-arrow')}</button>`:reason==='fixture'?`<button class="cc-btn cc-btn-primary" type="button" data-hc-progress>Tactical Meeting ${icon('i-arrow')}</button>`:''}</section>`;
  }

  const units=[['GK','Keepers',['GK']],['DEF','Defence',['DC','FB']],['MID','Midfield',['DM','CM','AM']],['ATT','Attack',['W','ST']]];
  U.views.planner={title:'Squad Planner',tabs:U.tabs(['depth','Depth chart']),
    render(c){
      const s=c.season.value, p=s.plan, only=c.ui.pool||'all';
      const blocks=units.map(([id,label,positions],index)=>{
        const pool=C.roster.filter(x=>positions.includes(x.pos)).map(x=>S.availability(s,x.id));
        const roles=x=>p.xi.includes(x.p.id)?'Starting XI':p.bench.includes(x.p.id)?'Bench':'Reserve';
        const order=x=>x.out?3:roles(x)==='Starting XI'?0:roles(x)==='Bench'?1:2;
        const list=pool.filter(x=>only==='all'||only==='fit'&&!x.out||only==='picked'&&order(x)<2).sort((a,b)=>order(a)-order(b)||b.p.ability-a.p.ability||a.p.name.localeCompare(b.p.name));
        return `<section class="tl-depth-lane" data-unit="${id}"><header><span>${id}</span><h3>${label}</h3><p>${pool.filter(p=>!p.out).length}/${pool.length} available</p></header><div>${list.length?list.map(x=>`<button class="tl-depth-player" type="button" data-c-do="player" data-c-val="${x.p.id}">${U.avatar(c,x.p.name,x.p.id)}<span><b>${esc(x.p.name)}</b><small>${esc(x.p.position)}</small></span><span>${condition(x.today)}${tag(x.out?'Unavailable':roles(x),x.out?'bad':roles(x)==='Starting XI'?'good':'info')}</span></button>`).join(''):U.empty('No players in this view')}</div></section>`;
      });
      return `<div class="tl-depth"><header><div><p class="tl-label">FIRST TEAM / SELECTION</p><h2>Depth chart</h2><p>Natural positions and current availability, cross-checked against your saved ${esc(p.tactics.form)}.</p></div>${link('tactics','Edit club tactics','overview',null,'primary')}</header><div class="tl-depth-tools">${U.select('pool','Show players',[['all','Full squad'],['fit','Available'],['picked','Starting XI & bench']],only)}${link('medical','Medical Centre','overview',null,'text')}</div><div class="tl-depth-grid">${blocks.join('')}</div></div>`;
    }
  };

  // Compact, room-specific indexes double as shortcuts into each workspace.
  const front=(kicker,title,copy,actions='',metrics=[],image='')=>`<section class="tl-room-intro${image?' tl-room-art':''}">${image?art(image):''}<div><p class="tl-label">${esc(kicker)}</p><h2>${esc(title)}</h2><p>${esc(copy)}</p>${actions?`<div class="tl-room-actions">${actions}</div>`:''}</div>${metrics.length?`<dl>${metrics.map(([name,value])=>`<div><dt>${esc(name)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`:''}</section>`;
  const intro={
    squad:c=>{const ready=C.roster.filter(p=>!S.availability(c.season.value,p.id).out).length;return front('FOOTBALL / REGISTER','First-team register','Review the senior squad, filter by position and compare player attributes.',link('planner','Depth chart','depth',null,'outline'),[['Senior players',C.roster.length],['Available',ready]]);},
    schedule:c=>{const f=K.next(c.season.value);return front('SEASON / FIXTURES','Fixture runway',f?`Next: ${H.clubs[f.opponent].name} · ${longDate(f.date)} · ${stamp(f.date)}`:'Browse the completed season.',link('day','Open Calendar Desk','today',null,'outline'),[['Played',c.fixtures().filter(x=>x.score).length],['To play',c.fixtures().filter(x=>!x.score).length]]);},
    club:c=>front('CLUB / IDENTITY','Riverside Football Club',`The Quaysiders · Founded ${C.club.founded} · Quayside Park`,link('club','Explore facilities','facilities',null,'outline'),[['Founded',C.club.founded],['Location',home.city]],'quayside'),
    competitions:c=>{const f=K.next(c.season.value);return front('SEASON / COMPETITIONS','Chasing silverware',f?`Next competition: ${comp(f)}.`:'All published fixtures have been played.',link('day','Today’s fixtures','fixtures',null,'outline'),[['Competitions',C.comps.length]],'silverware');},
    vision:c=>front('CLUB / GOVERNANCE','The boardroom','Review the club plan, supporter expectations and outstanding board requests.',link('vision','Review objectives','performance',null,'outline'),[['Requests logged',c.s.board.length]]),
    dynamics:c=>front('FOOTBALL / PEOPLE','Inside the dressing room','Check the squad hierarchy and talk through team priorities.',link('dynamics','Team meeting','meeting',null,'outline'),[['Captain',C.players[c.season.value.plan.set.captain].name]]),
    staff:c=>front('FOOTBALL / OPERATIONS','The backroom','Coaching, recruitment and medicine. See who is responsible for each area.',link('staff','Responsibilities','responsibilities',null,'outline'),[['Staff members',C.staff.length],['Departments',C.staffGroups.length]]),
    development:c=>front('FOOTBALL / ACADEMY','The pathway','Monitor academy candidates and check how players out on loan are progressing.',link('development','Loan report','loans',null,'outline'),[['Academy prospects',C.youth.length],['Out on loan',C.loans.length]],'training'),
    training:c=>{const work=S.activities(c.season.value,c.now).filter(a=>a.kind==='training');return front('FOOTBALL / PERFORMANCE','Training ground',work.length?`Today: ${work.map(a=>a.label).join(' · ')}`:'No first-team session today.',link('medical','Player readiness','overview',null,'outline'),[['Today’s sessions',work.length]],'training');},
    medical:c=>{const f=global.TLClubReadiness.fitness(c);return front('FOOTBALL / WELFARE','Player readiness','Monitor injuries, workloads and expected return dates before selecting your team.',link('planner','Squad depth','depth',null,'outline'),[['Unavailable',f.filter(x=>x.out).length],['Under watch',f.filter(x=>!x.out&&x.risk!=='Low').length],['Full work',f.filter(x=>!x.out&&x.risk==='Low').length]]);},
    scouting:c=>front('RECRUITMENT / INTELLIGENCE','Recruitment radar','Track live assignments, examine reports and plan where to scout next.',link('scouting','Open shortlist','shortlist',null,'outline'),[['Active focuses',c.s.focus.length],['Shortlisted',c.s.shortlist.length]]),
    transfers:c=>front('RECRUITMENT / DEALS','The transfer desk','Review club activity, draft enquiries and outstanding clauses.',link('scouting','Find players','players',null,'outline'),[['Draft offers',Object.keys(c.s.offers).length],['Transfer budget',H.millions(c.fiscal.transfer)]]),
    finance:c=>front('CLUB / ACCOUNTS','The books','Review cash flow, commitments and cost controls.',link('finance','Review the wage bill','wages',null,'outline'),[['Cash balance',H.millions(c.fiscal.balance)],['Committed per week',H.millions(c.fiscal.committed)]])
  };
  const overviewTabs={squad:'overview',schedule:'fixtures',club:'profile',competitions:'competitions',vision:'overview',dynamics:'overview',staff:'overview',development:'overview',training:'week',medical:'overview',scouting:'overview',transfers:'centre',finance:'summary'};
  function room(c,view){
    const body=view.render(c), {page,tab}=c.r;
    return (intro[page]&&overviewTabs[page]===tab?intro[page](c):'')+body;
  }
  global.TLClubOffice={clubhouse,room,processing,handover};
})(window);
