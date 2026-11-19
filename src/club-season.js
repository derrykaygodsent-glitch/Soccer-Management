/* The dated calendar desk. This view never opens a match stage. */
(function(global){
  'use strict';
  const K=global.TLSeasonCalendar, S=global.TLSeasonState, X=global.TLMatchdayUI, {U,longDate,dayName,sessionClass,sessionIcon}=X;
  const {H,icon,esc,tag,link,btn,empty,standings,stamp}=U;
  const kindIcon={training:'cone',staff:'team',press:'mail',news:'radar',fixture:'cup',mail:'mail'};
  const dayMs=K.DAY;
  function strips(c,s,ts){
    const d=K.day(ts), cols=Array.from({length:8},(_,i)=>d+(i-1)*dayMs);
    return `<div class="season-strip-frame"><header><h3>Club calendar</h3><span>One day at a time · <kbd>Space</kbd> to continue</span>${link('schedule','Full schedule','calendar',null,'text')}</header>${U.scroll('season-calendar','Eight-day club calendar',`<div class="season-strip">${cols.map(t=>{
      const classes=t===K.day(s.now)?' season-current':t<K.day(s.now)?' season-past':'';
      return `<article class="season-strip-day${classes}"><button type="button" data-c-do="day-open" data-c-val="${t}" aria-pressed="${t===d}"><b>${new Date(t).getUTCDate()}</b><span>${dayName(t).slice(0,3)}<small>${H.calendar(t).date.split(' ')[1]}</small></span>${t===K.day(s.now)?'<i></i>':''}</button><div>${S.activities(s,t).map(x=>`<span class="season-tile" data-kind="${x.kind}" data-session="${x.kind==='training'?sessionClass(x.label):''}" title="${esc(x.label)}">${icon(x.kind==='training'?sessionIcon(x.label)||'calendar':kindIcon[x.kind])}<span>${esc(x.label)}${x.kind==='fixture'?`<small>${esc(x.desc)}</small>`:''}</span>${x.required&&!x.done?'<b aria-label="Action required">!</b>':''}</span>`).join('')}</div></article>`;
    }).join('')}</div>`,'season-strip-scroll')}</div>`;
  }
  function fixtures(c,s,ts){
    const dateRow=K.onDate(s,ts), clubDay=dateRow.find(K.isClub), league=dateRow.some(f=>f.comp==='PD'), continental=!league&&dateRow.some(f=>f.comp==='CC'), hasTable=league||continental;
    return `<div class="season-fixtures-grid${hasTable?' has-table':''}"><section class="season-board season-fixture-board"><header><div><span class="cc-eyebrow">${clubDay?esc(H.fixtureCompetition(clubDay)):'Around the grounds'}</span><h2>Fixtures &amp; results</h2></div>${tag(longDate(ts),'info')}</header>${dateRow.length?dateRow.map(f=>{
      const r=f.result;
      const home=K.club(f.home), away=K.club(f.away);
      const scheduled=K.day(s.now)===K.day(ts)&&f.date<=s.now;
      return `<div class="season-match-row${K.isClub(f)?' season-our-match':''}" data-fixture="${f.id}" data-played="${!!r}"><span class="season-match-time"><time>${stamp(f.date)}</time><small>${esc(f.comp)}</small></span><span class="season-host"><b>${esc(home.name)}</b>${c.crest(home.id)}</span><span class="season-result" aria-label="${r?r.goals.join(' to '):'Not played'}"><strong>${r?r.goals.join(' – '):'v'}</strong>${r?.pen?`<small>${r.pen.join('–')}p</small>`:''}</span><span class="season-visitor">${c.crest(away.id)}<b>${esc(away.name)}</b></span><span class="season-fixture-status">${r?tag('FT','good'):K.isClub(f)&&scheduled?tag('Your fixture','teal'):tag(scheduled?'In progress':'Scheduled','info')}</span></div>`;
    }).join(''):empty('No senior fixtures on this date','Training, meetings and new messages appear in the club agenda.')}<footer>${link('schedule','Riverside fixtures','fixtures')}${link('competitions','Competitions','competitions')}${clubDay?.result&&s.results[clubDay.id]?link('inbox','Read match report','messages',`result-${clubDay.id}`):''}</footer></section>${hasTable?`<section class="season-board season-league"><header><div><span class="cc-eyebrow">Completed matches only</span><h2>${league?'Premier Division':H.competition.CC}</h2></div></header>${standings(c,league?H.division:H.competition.CC,league?K.standings(s):K.continentalStandings(s,U.C.continental),'season-table')}</section>`:''}</div>`;
  }
  function agenda(c,s,ts){
    const agenda=S.activities(s,ts), today=K.day(ts)===K.day(s.now);
    return `<section class="season-board season-agenda"><header><div><span class="cc-eyebrow">${today?'Today at the club':'Club agenda'}</span><h2>${longDate(ts)}</h2></div>${tag(`${agenda.length} activities`,'info')}</header><div>${agenda.map(a=>{
      const available=a.time<=s.now;
      const ctl=a.kind==='fixture'?link('schedule','Fixture details','fixtures',a.id,'outline'):a.id&&available?link('inbox',a.required&&!a.done?'Respond':'Read update','messages',a.id,a.required&&!a.done?'primary':'outline'):a.kind==='training'?link('training','Training details','week',K.iso(ts),'text'):'';
      return `<article class="season-agenda-row"><time>${stamp(a.time)}</time><span class="season-activity-icon" data-kind="${a.kind}">${icon(kindIcon[a.kind])}</span><div><b>${esc(a.label)}</b><small>${esc(a.desc)}</small></div><div>${a.required&&!a.done&&available?tag('Action required','warn'):a.done?tag('Complete','good'):a.kind==='training'&&available?tag('Completed','info'):''}${ctl}</div></article>`;
    }).join('')}</div></section>`;
  }
  const desk={title:'Calendar Desk',nav:'schedule',tabs:U.tabs(['today','Club calendar'],['fixtures','Fixtures & Results']),
    render(c){
      const s=c.season.value, now=s.now, ts=c.r.id?Number(c.r.id):now,
        d=Number.isFinite(ts)&&ts>=H.start-dayMs*15&&ts<K.end+dayMs*9?ts:now, next=K.next(s), need=S.pending(s);
      const banner=`<div class="season-next"><div class="season-count"><span>${next?'Next fixture':'Season calendar'}</span><strong>${next?K.countdown(now,next.date):'No fixture'}</strong></div>${next?`<div class="season-next-crests">${c.crest(next.home)}<small>v</small>${c.crest(next.away)}</div><div><h2>${esc(H.clubs[next.home].name)} <em>v</em> ${esc(H.clubs[next.away].name)}</h2><p>${esc(H.fixtureCompetition(next))} · ${longDate(next.date)} · ${stamp(next.date)}</p></div>`:'<div><h2>All published fixtures played</h2><p>The calendar remains available through August.</p></div>'}<div class="season-clock-card"><span>${need.length?`${need.length} inbox ${need.length===1?'decision':'decisions'} due`:'Club time'}</span><b>${H.calendar(now).day} · ${H.calendar(now).date}</b></div></div>`;
      const rows=K.onDate(s,d), focus=c.r.tab==='fixtures'||rows.some(f=>K.isClub(f)&&!f.result);
      const switcher=`<div class="season-date-actions"><span>${longDate(d)} ${K.day(d)===K.day(now)?tag('Current date','teal'):''}</span><div>${btn('‹','day-open',K.day(d)-dayMs,{label:'Previous calendar date'})}${btn('Today','day-now','',{kind:'solid'})}${btn('›','day-open',K.day(d)+dayMs,{label:'Next calendar date'})}</div></div>`;
      return `<div class="season-calendar">${banner}${strips(c,s,d)}${switcher}${focus?fixtures(c,s,d)+agenda(c,s,d):agenda(c,s,d)+(rows.length?fixtures(c,s,d):'')}</div>`;
    },
    action(c,key,v){if(key==='day-now'||key==='day-open')c.go('day',c.r.tab,key==='day-now'?'':v);}
  };
  U.views.day=desk;
  global.TLClubSeason={fixtures};
})(window);
