/* Inbox, match reporting, and the starter season's football desk. */
(function (global) {
  'use strict';
  const U=global.TLClubUI, {H,C,views,esc,icon,art,btn,link,card,empty,values,tag,avatar,select,search,stamp,num,clubName,standings,score,table,tr,lookup,tabs,rank}=U;
  const K=global.TLSeasonCalendar, S=global.TLSeasonState, Q=global.TLSeasonMatch;
  const categories = [['all','All items'],['unread','Unread'],...['Match','Scouting','Media','Injuries','Club']];
  const color = {Match:'good',Scouting:'teal',Media:'violet',Injuries:'bad',Club:'info'};
  const player = (id,kind='text')=>btn(C.players[id].name,'player',id,{kind});
  const fixture = (f,label=H.clubs[f.opponent].name,kind='text')=>link('schedule',label,'fixtures',f.id,kind,kind!=='text');
  const footer = body => `<footer class="cc-reader-actions cc-actions">${body}</footer>`;
  const banner = (title,source,content) => `<section class="cc-editorial"><span class="cc-byline">${esc(source)}</span><h2>${esc(title)}</h2>${content}</section>`;
  const clubMatches = ()=>link('schedule','Riverside fixtures','fixtures',C.reportFixture.id);
  const league = ()=>link('competitions','League table','competitions','PD');
  const matchFooter = (f)=>`${fixture(f,'Match report','outline')}${league()}${link('squad','Player stats','stats')}`;
  const selectedMessage = c => lookup(c.mail(),c.r.id)||lookup(c.mail(),c.ui.selected)||lookup(c.mail(),'match');
  function messageList(c,m) {
    const filtered = c.mail().filter(a => (c.ui.filter==='unread'?!c.isRead(a):!c.ui.filter||c.ui.filter==='all'||a.category===c.ui.filter) && U.textMatch(c.ui.q,a.from,a.subject,a.category));
    const groups=Object.groupBy?Object.groupBy(filtered,a=>H.calendar(a.date).long):filtered.reduce((o,a)=>{(o[H.calendar(a.date).long]??=[]).push(a);return o;},{});
    const closed=c.ui.closed||[];
    return `<aside class="cc-inbox-nav" aria-label="Inbox messages"><div class="cc-inbox-tools">${select('filter','Filter messages',categories,c.ui.filter||'all')}${btn('Mark all read','read-all','',{icon:'mail',disabled:!c.unread().length})}${search('q',c.ui.q,'Search messages')}</div>
      ${U.scroll('inbox','Dated messages',filtered.length?Object.entries(groups).map(([date,list])=>{
        const hide=closed.includes(date);
        return `<div class="cc-date-group"><button class="cc-date-btn" type="button" data-c-do="inbox-group" data-c-val="${esc(date)}" aria-expanded="${!hide}">${esc(date)} <span>(${list.length})</span>${icon('down')}</button>${hide?'':list.map(a=>`<button class="cc-mail" data-c-go="inbox" data-c-tab="messages" data-c-id="${a.id}" type="button"${a===m?' aria-current="true"':''} data-unread="${!c.isRead(a)}"><span>${esc(a.from)}<time datetime="${new Date(a.date).toISOString()}">${stamp(a.date)}</time></span><strong>${esc(a.subject)}${a.required&&!c.season.value.answers[a.id]?'<i class="season-mail-alert" title="Action required" aria-label="Action required">!</i>':''}</strong>${!c.isRead(a)?'<i aria-label="Unread"></i>':''}</button>`).join('')}</div>`;
      }).join(''):empty('No matching messages','Try another category or search.'))}</aside>`;
  }
  function statRing(label,a,b){
    const p=(a/(a+b)*100).toFixed(1);
    const stat=label==='Possession'?`${a}/${b}%`:`${a}/${b}`;
    return `<div><span class="cc-stat-ring" style="--ring:${p}%">${esc(stat)}</span><strong>${esc(label)}</strong></div>`;
  }
  function match(c) {
    const f=C.reportFixture, r=C.matchReport, best=C.players[r.potm];
    return [`<p class="cc-intro">I’ve attached today’s match report from The Touchline.</p>${banner('Premier Division: Riverside meet expectations in dominant win','The Touchline',
      `<div class="cc-match-report"><div class="cc-prose"><div class="cc-story-meta"><span>Premier Division</span><span>Attendance: <b>${num(r.attendance)}</b> ${icon('weather')}</span></div><p>Eastvale struggled to contain Riverside at Vale Arena. A hat-trick from ${player(best.id)} made the difference as the visitors recorded a sixth straight league win.</p>
      <p>${player(best.id)} opened the scoring in the ${H.ordinal(r.goals[0][0])} minute with a first-time finish. A second arrived five minutes later, this time from the edge of the area.</p>
      <p>${player(C.leaders.winger)} headed in the third after the interval. ${player(best.id)} completed his hat-trick on ${r.goals[3][0]} minutes, finishing from close range after a low cross.</p><p>The result keeps Riverside ${H.ordinal(1)} in the ${esc(H.division)}, ${C.leagueGap} points clear of Northbridge, who have a match in hand.</p></div>
      <aside class="cc-report-aside">${score(c,f,true)}<div class="cc-stat-box"><h3>Match stats</h3><div class="cc-rings">${r.stats.slice(0,3).map(x=>statRing(...x)).join('')}</div></div><div class="cc-stat-box"><h3>Player of the match</h3><div class="cc-person">${avatar(c,best.name,best.id)}<div>${player(best.id)}<p class="cc-muted">Riverside FC · ${r.ratings[best.id]} rating</p><p class="cc-good">${r.goals.filter(x=>x[1]===best.id).length} goals</p></div></div></div></aside></div>`)}`,
      `${btn('Key moments','moments','',{kind:'solid',icon:'ball'})}${matchFooter(f)}`];
  }
  function formStory(c) {
    const recent=H.form.slice().reverse(), row=H.standings.find(r=>r.id===H.homeId);
    return [`<p class="cc-intro">I’m forwarding the following news article for your attention.</p>${banner('Riverside hit four as run goes on','Saturday Football',
      `<div class="cc-streak-grid"><div class="cc-streak-info"><div class="cc-streak">${c.crest(H.homeId)}<div><strong>${recent.length}</strong><p>matches won in a row</p></div></div><div class="cc-streak-matches">${recent.map(f=>`<button class="cc-streak-row" type="button" data-c-do="fixture" data-c-val="${f.id}"><time>${H.shortDate(f.date)}</time>${clubName(c,f.opponent,`${H.clubs[f.opponent].name} (${f.venue})`)}<strong>${f.score.join(' – ')}</strong></button>`).join('')}<div class="cc-actions">${clubMatches()}</div></div></div>
      <div class="cc-prose"><p>Riverside have extended their run of straight wins in the Premier Division to ${recent.length} games following their ${recent[0].score.join('–')} victory at Eastvale City.</p><p>${esc(H.manager)}’s side are unbeaten after ${row.played} matches. They have scored ${row.gf} times, giving them the best attack in the division.</p><p>Attention turns to the League Cup on Friday, when ${esc(H.clubs[H.next.opponent].name)} visit ${esc(H.clubs[H.homeId].stadium)}.</p></div></div>`)}`,
      `${fixture(H.next,'Next match','outline')}${league()}`];
  }
  function medicalTable(c){
    return table('Risk assessment',['Player','Match load','Training load','Susceptibility','Overall risk'],C.medical.map(r=>tr([player(r.id),`<b class="cc-${r.match==='Heavy'?'warn':'info'}">${r.match}</b>`,`<b class="cc-${r.training==='Heavy'?'bad':'info'}">${r.training}</b>`,r.susceptibility,tag(`${r.risk} risk`,r.risk==='High'?'bad':r.risk==='Low'?'good':'warn')])), 'risk','cc-risk-table');
  }
  function injury(c) {
    const out=C.medical.find(r=>r.status==='Out'), busy=H.fixtures.filter(f=>f.date>=H.next.date&&f.date<H.next.date+7*864e5).length;
    return [`<div class="cc-prose"><p>Our current match load could increase injury risk this week. ${player(out.id)} is out with a ${out.issue.toLowerCase()} and is expected back in ${out.return}.</p><p>${player('rvr_12')} and ${player('rvr_14')} are still available, but I recommend reducing their individual workload during the cup and league run.</p><p>The rest of the squad can continue with the planned sessions. We’ll reassess players after the next fixture.</p></div>
      <section class="cc-editorial cc-medical-advice"><div class="cc-grid2"><div><h3>${fixture(H.next,'Fixtures')}</h3><b>${busy} matches in 7 days</b><p class="cc-muted">League Cup, Premier Division and Continental Cup</p></div><div><h3>${btn('Training workload','workload','',{kind:'text',arrow:true})}</h3><b>Medium</b><p class="cc-muted">Individual recovery for at-risk players</p></div></div><h3 class="cc-title">Risk assessment</h3>${medicalTable(c)}</section>`,
      `${btn('Training workload','workload','',{kind:'outline'})}${link('medical','Medical Centre')}${link('training','Team training')}${link('squad','Injury table','medical')}${fixture(H.next,'Upcoming fixtures','outline')}`];
  }
  function press(c){
    const f=C.reportFixture;
    const attendees=table('Notable journalists',['Journalist','Influence','Relationship'],C.journalists.map(([name,outlet,influence,relationship])=>tr([`<div class="cc-person">${avatar(c,name)}<div><strong>${esc(name)}</strong><small>${esc(outlet)}</small></div></div>`,esc(influence),`<span class="cc-${relationship==='Neutral'?'muted':'good'}">${esc(relationship)}</span>`])),'press');
    return [`<p class="cc-intro">A press conference has been called at ${esc(H.clubs[f.opponent].stadium)} after the Premier Division match between ${esc(H.clubs[f.opponent].name)} and Riverside FC.</p>
      <section class="cc-editorial cc-press-grid"><div class="cc-press-side"><div class="cc-press-art">${art('pressroom')}<div>${icon('cup')}<strong>Post-match<br>press conference</strong></div></div><p class="cc-eyebrow">Premier Division</p><p class="cc-press-pair">${clubName(c,f.opponent)} <span>v</span> ${clubName(c,H.homeId)}</p><hr><h3>Press conference location</h3><p class="cc-icon-text">${icon('stadium')}${esc(H.clubs[f.opponent].stadium)}</p><hr><h3>Journalists expected</h3><strong class="cc-good">${C.journalists.length + 5} journalists</strong><p class="cc-muted">The win has attracted national and international press.</p></div>
      <div class="cc-press-main"><h3>Notable journalists in attendance</h3>${attendees}<div class="cc-talking"><h3>Likely talking points</h3><ul><li>Your reaction to the match</li><li>Fabio Novak’s hat-trick</li><li>Recent form and team selection</li><li>The upcoming cup tie</li></ul></div></div></section>
      ${c.s.media?`<p class="cc-callout cc-good">${c.s.media==='attended'?'You attended the press conference.':`${esc(C.namedStaff['Assistant Manager'])} handled this press conference.`}</p>`:''}`,
      `${btn('Attend press conference','attend','',{kind:'primary',disabled:!!c.s.media})}${btn('Send assistant','delegate-press','',{disabled:!!c.s.media})}${link('staff','Responsibilities','responsibilities')}`];
  }
  function simple(c,m){
    const opponent=H.clubs[H.next.opponent], home=H.clubs[H.homeId];
    const messages={
      fixture:[`<p>${esc(opponent.name)} will visit ${esc(home.stadium)} on Friday evening in the League Cup fourth round. Your kickoff is set for ${stamp(H.next.date)}.</p>${score(c,H.next)}`,`${fixture(H.next,'View fixture','outline')}${link('day','Club calendar','today',String(K.day(H.next.date)),'outline')}`],
      preview:[`<p>${esc(opponent.name)} typically use two forwards and look for early deliveries from wide areas. Look out for second balls at the edge of the box.</p><p>Use the schedule to compare recent meetings and check the time of kickoff.</p>`,fixture(H.next,'View fixture','outline')],
      analysis:[`<p>${player(C.leaders.forward)} leads the squad in goals, average rating and Player of the Match awards. ${player(C.leaders.winger)} is our leading provider.</p>${values(H.leaders.slice(0,4).map(row=>[row.label,`${row.player.name} · ${row.value}`]))}`,link('squad','Player stats','stats')],
      budget:[`<p>The latest transfer and wage allocations are available. Current and committed spending remain within the weekly wage budget.</p>${values([['Transfer budget',H.money(c.fiscal.transfer)],['Wage budget per week',H.money(c.fiscal.wage)],['Available per week',H.money(c.fiscal.wage-c.fiscal.committed)]])}`,link('finance','Finances','summary')],
      board:[`<p>The board has deferred further work at ${esc(home.stadium)}. The club’s current priority is to improve training and academy facilities while protecting its wage structure.</p><p>You can review objectives and log a new request in Club Vision.</p>`,link('vision','Club vision','overview')]
    };
    return messages[m.id];
  }
  function seasonReader(c,m){
    const s=c.season.value,id=m.id.startsWith('result-')?m.id.slice(7):'', f=id&&c.fixtures().find(x=>x.id===id), r=s.results[id];
    const picked=m.options.find(([k])=>k===s.answers[m.id]), best=r?.players.flat().slice().sort((a,b)=>b.rating-a.rating)[0];
    const advice=r&&f?Q.analyst(r,Q.managed(f)):null;
    const digest=advice?`<div class="season-mail-digest"><section class="cc-card"><span class="cc-eyebrow">Match statistics</span>${Q.teamStats(r.stats,r.possession).slice(0,4).map(([label,a,b])=>`<div class="season-digest-stat"><b>${a}</b><span>${esc(label)}</span><b>${b}</b></div>`).join('')}</section><section class="cc-card"><span class="cc-eyebrow">From the analysts</span><h3>${esc(advice.title)}</h3><p>${esc(advice.copy)}</p>${r.players[Q.managed(f)].some(p=>p.injury)?link('medical','Current medical report','overview',null,'text'):''}</section></div>`:'';
    const body=`<div class="season-letter"><div class="cc-prose"><p>${esc(m.body)}</p></div>${r&&f?`<div class="season-message-result">${global.TLMatchdayUI.scoreStrip(c,f,'Full time',r.goals,r.pen?`${r.pen.join('–')} on penalties`:'')}${best?`<p>Player of the match: <b>${esc(best.name)}</b> ${rank(best.rating)}</p>`:''}${digest}</div>`:''}${picked?`<p class="cc-callout cc-good">${esc(picked[2])}</p>`:''}${m.options.length&&!picked?`<section class="cc-editorial season-mail-actions"><h3>${m.required?'Decision required':'Reply to this message'}</h3><p>${m.required?'Make a decision before advancing to the next date. Reading this message does not clear it.':'This is optional and does not hold the calendar.'}</p>${m.options.map(([v,label])=>btn(label,'season-answer',`${m.id}:${v}`,{kind:'solid',arrow:true})).join('')}</section>`:''}</div>`;
    return [body,`${r&&f?btn('Match analysis','season-report',id,{kind:'primary',icon:'i-bars'}):''}${f?fixture(f,'Fixture details','outline'):''}${m.id==='load-review'||m.id==='staff-cup'?link('training','Training schedule','week'):m.id.startsWith('injury-')?link('medical','Medical Centre','overview'):''}${link('day','Back to calendar','today',null,'outline')}`];
  }
  const seasonPosts=(c,limit=12)=>c.mail().filter(m=>m.type==='season'&&(m.id.startsWith('result-')||m.id==='cup-observations'||c.season.value.answers[m.id]&&m.category==='Media')).slice(0,limit);
  function reader(c,m) {
    const parts=m.type==='season'?seasonReader(c,m):({match,form:formStory,injury,media:press,scout: x=>[U.scoutReport(x,C.prospects[0]),`${link('scouting','Scouted players','players')}${link('scouting','Scout report','report','marin')}`]})[m.type]?.(c) || simple(c,m);
    if(!parts) return empty('Select a message');
    return `<article class="cc-reader" data-message-type="${m.type}" aria-labelledby="inbox-subject"><div class="cc-reader-mobile">${link('inbox','Back to messages','messages',null,'solid',false)}</div><header class="cc-reader-head">${c.crest(H.homeId)}${avatar(c,m.from)}<div><p>${esc(m.from)} <span class="cc-muted">(${esc(m.role)})</span></p><h2 id="inbox-subject">${esc(m.subject)}</h2></div><div>${tag(m.category,color[m.category])}${m.required&&!c.season.value.answers[m.id]?tag('Action required','warn'):''}<time>${stamp(m.date)}</time></div></header>
      ${U.scroll('reader','Message content',parts[0],'cc-reader-copy')}${footer(parts[1])}</article>`;
  }
  function messages(c) {
    const m=selectedMessage(c), pending=S.pending(c.season.value), count=c.unread().length;
    const ribbon=`<div class="tl-inbox-ribbon"><span class="tl-inbox-symbol">${icon('mail')}</span><div><h2>Club correspondence</h2><p>${count} unread ${count===1?'message':'messages'} · ${c.mail().length} total</p></div>${pending.length?`<button class="cc-btn cc-btn-outline" type="button" data-hc-mail="${esc(pending[0].id)}">${pending.length} ${pending.length===1?'decision':'decisions'} due ${icon('i-arrow')}</button>`:!global.TLCalendarProgress.gate(c.season.value)?'<button class="cc-btn cc-btn-outline" type="button" data-hc-run>Process calendar '+icon('i-arrow')+'</button>':link('day','Calendar Desk','today',null,'text')}</div>`;
    return `${c.narrow()&&c.r.id?'':ribbon}<div class="cc-inbox cc-fill" data-mobile-reader="${!!lookup(c.mail(),c.r.id)}">${messageList(c,c.narrow()&&!c.r.id?null:m)}${reader(c,m)}</div>`;
  }

  function imageTile(c,story,feature=false) {
    return `<span class="cc-story-image${feature?' cc-story-feature-art':''}">${story.art?art(story.art):''}${c.crest(story.club)}</span>`;
  }
  function news(c,local=false) {
    const current=seasonPosts(c).filter(m=>m.category!=='Scouting');
    const latest=current.length?`<section class="season-news-updates"><h2>Latest from Riverside</h2>${current.map(m=>`<article><time>${H.shortDate(m.date)}</time>${link('inbox',m.subject,'messages',m.id,'text',false)}</article>`).join('')}</section>`:'';
    const featured=C.stories[0], rest=C.stories.slice(1).filter(s=>!local||s.club===H.homeId);
    const headlines=`<div class="cc-news-lead"><button class="cc-cover-btn" type="button" data-c-do="story" data-c-val="${featured.id}" aria-label="Read ${esc(featured.title)}">${imageTile(c,featured,true)}</button><div><p class="cc-story-meta"><strong>The Big Story</strong> ${esc(featured.category)}</p><h2>${btn(featured.title,'story',featured.id,{kind:'text'})}</h2><ul>${featured.bullets.map(s=>`<li>${esc(s)}</li>`).join('')}</ul></div></div>
      <div class="cc-story-grid">${rest.map(s=>`<article class="cc-story-card">${imageTile(c,s)}<div><p class="cc-eyebrow">${esc(s.category)}</p><h3>${btn(s.title,'story',s.id,{kind:'text'})}</h3><ul>${s.bullets.map(b=>`<li>${esc(b)}</li>`).join('')}</ul></div></article>`).join('')}</div>`;
    const side=card('Upcoming events',`<div class="cc-news-events">${c.fixtures().filter(f=>!f.score).slice(0,2).map(f=>`<div>${c.crest(f.opponent)}<div>${fixture(f, f.venue==='H'?`Riverside v ${H.clubs[f.opponent].name}`:`${H.clubs[f.opponent].name} v Riverside`)}<p class="cc-muted">${H.calendar(f.date).long}</p></div></div>`).join('')}</div>
      <hr><h2 class="cc-title">Manager watch</h2><p class="cc-muted">No recent movements.</p><hr><h2 class="cc-title">Recent transfer activity</h2><div class="cc-news-transfers">${C.transfers.filter(x=>x.status==='Completed').map(t=>`<div>${avatar(c,t.name)}<div><b>${esc(t.name)}</b><small>${esc(t.club)}</small></div><strong>${U.compact(t.fee)}</strong></div>`).join('')}</div><div class="cc-news-fact"><span class="cc-muted">${esc(H.division)}, England</span><p>${esc(C.players[C.leaders.captain].name)} leads the Riverside squad in pass completion with ${C.players[C.leaders.captain].pass}%.</p></div>`, 'cc-news-rail');
    return `${local?'':`<header class="tl-news-mast"><div><p class="tl-label">NEWSROOM / FOOTBALL DESK</p><h2>The Touchline Dispatch</h2></div><time>${esc(H.calendar(c.now).date)}</time></header>`}<div class="cc-news cc-fill">${U.scroll('stories','Football news',latest+headlines,'cc-news-list')}${side}</div>`;
  }
  U.clubNews = news;
  function leagues(c) {
    return `<div class="cc-leagues">${C.leagues.map((l,i)=>{
      const closed=(c.ui.folded||[]).includes(l.id);
      return `<section class="cc-league-focus"><header><span class="cc-league-badge" data-index="${i}">${icon('shield')}</span><h2>${esc(l.name)}</h2><button class="cc-icon-btn" type="button" data-c-do="league-fold" data-c-val="${l.id}" aria-expanded="${!closed}" aria-label="Toggle ${esc(l.name)}">${icon('down')}</button></header>
      ${closed?'':`<div class="cc-grid2"><div><h3 class="cc-title">Headlines</h3>${l.headlines.map((a,j)=>`<article class="cc-league-headline"><p class="cc-eyebrow">${esc(a.category||a[0])}</p>${btn(a.title||a[1],a.id?'story':'world-story',a.id||`${l.id}:${j}`,{kind:'text'})}</article>`).join('')}</div><div><h3>${btn('League table','league-table',l.id,{kind:'text',arrow:true})}</h3>${standings(c,l.name,l.id==='premier'?c.standings():l.rows,l.id)}</div></div>`}</section>`;
    }).join('')}</div>`;
  }
  function world(c){
    return `<div class="cc-grid2 cc-world">${C.leagues.map(l=>card(l.name,`<p class="cc-muted">Leading clubs · 2026/27 snapshot</p>${standings(c,l.name,(l.id==='premier'?c.standings():l.rows).slice(0,5),l.id)}<div class="cc-actions">${btn('View league table','league-table',l.id,{kind:'outline'})}</div>`)).join('')}</div>`;
  }
  const socialPeople=[['supporters','Riverside Supporters','Supporter group'],['touchline','The Touchline','Football press'],['chronicle','Quayside Chronicle','Local news'],['academy','Riverside Academy','Club account'],['marsh',C.namedStaff['Assistant Manager'],'Riverside staff']];
  const socialSubjects=[...['rvr','hpt','nbu','efc','kgd','oak','swl','crl','wst','sby'].map(id=>[id,H.clubs[id].name,'Club']),...socialPeople];
  const socialRows=[
    ['post','supporters','26 Oct · 16:55','Six wins in a row. Bring that energy back to Quayside Park for the cup.','form','1.2K'],
    ['news','touchline','26 Oct · 16:41','run'],
    ['post','chronicle','26 Oct · 16:38','Novak takes home the match ball from Vale Arena. That second goal was the pick of the three.','match','846'],
    ['post','hpt','26 Oct · 16:11','Next stop: Quayside Park. We’ll see you Friday night for the fourth round.','fixture','714'],
    ['post','academy','26 Oct · 15:20','The Under 21s head to Kingsdown on Wednesday after beating Westhaven.','','391'],
    ['news','rvr','26 Oct · 15:08','cup'],
    ['news','chronicle','25 Oct · 18:07','injury'],
    ['post','marsh','25 Oct · 15:30','A busy week ahead. Every player will have a part to play.','preview','237'],
    ['news','nbu','25 Oct · 14:44','title']
  ];
  const defaultFollows=['rvr','supporters','touchline'];
  const FEED_KEY='touchline26.2026.social.v1';
  function library(c){
    if(c.ui.feedLibrary)return c.ui.feedLibrary;
    let saved;
    try{saved=JSON.parse(global.localStorage.getItem(FEED_KEY));}catch{}
    const keys=(x,test)=>Array.isArray(x)?[...new Set(x.filter(v=>typeof v==='string'&&test(v)))].slice(0,450):[];
    const post=id=>/^(post-\d+|season-[\da-z-]+)$/.test(id);
    return c.ui.feedLibrary={follows:Array.isArray(saved?.follows)?keys(saved.follows,id=>socialSubjects.some(([x])=>x===id)):defaultFollows.slice(),
      likes:keys(saved?.likes,post), saved:keys(saved?.saved,post)};
  }
  function feedEntries(c){
    const season=seasonPosts(c,Infinity).map(m=>{
      const answered=m.options.find(([key])=>key===c.season.value.answers[m.id]);
      return {key:`season-${m.id}`,type:m.id.startsWith('result-')?'news':'post',author:'rvr',when:`${H.shortDate(m.date)} · ${stamp(m.date)}`,
        title:m.subject,copy:answered?answered[2]:m.body,mail:m.id,topic:m.category==='Match'?'Matchday':'Club'};
    });
    return [...season,...socialRows.map(([type,author,when,content,id,count],i)=>{
      const story=type==='news'?lookup(C.stories,content):null;
      return {key:`post-${i}`,type,author,when,title:story?.title||'',copy:story?.bullets[0]||content,story,mail:id,count,topic:author==='academy'?'Academy':content==='cup'||id==='fixture'||id==='match'?'Matchday':author==='nbu'?'Premier Division':'Club'};
    })];
  }
  function social(c){
    const mode=c.ui.feedMode||'all', manage=!!c.ui.feedManage, prefs=library(c), following=prefs.follows;
    const names=Object.fromEntries(socialSubjects.map(([id,name])=>[id,name]));
    const roles=Object.fromEntries(socialSubjects.map(([id,,type])=>[id,type]));
    const mark=id=>H.clubs[id]?`<span class="md-social-crest">${c.crest(id)}</span>`:avatar(c,names[id],null,`tl-social-avatar tl-social-${id}`);
    const entries=feedEntries(c), topics=['Matchday','Club','Academy','Premier Division'], query=c.ui.postSearch||'';
    const filter=[['all','Latest'],['following','Following'],['news','News'],['post','Supporters'],['saved','Saved']];
    const posts=entries.filter(e=>(mode==='all'||mode===e.type||mode==='following'&&following.includes(e.author)||mode==='saved'&&prefs.saved.includes(e.key))&&(!c.ui.feedTopic||e.topic===c.ui.feedTopic)&&U.textMatch(query,names[e.author],e.title,e.copy,e.topic)).map(e=>{
      const on=prefs.likes.includes(e.key), saved=prefs.saved.includes(e.key);
      const historic=e.count?.endsWith('K')?parseFloat(e.count)*1000:Number(e.count||0);
      const extra=e.story?btn('Read story','story',e.story.id,{kind:'text',arrow:true}):e.mail?link('inbox',e.type==='news'?'Match report':'Related update','messages',e.mail,'text'):e.author==='academy'?link('development','Academy report','overview',null,'text'):'';
      return `<article class="tl-post ${e.type==='news'?'tl-post-news':''}" data-feed-key="${e.key}"><header>${mark(e.author)}<div><strong>${esc(names[e.author])}</strong><p>${esc(roles[e.author])} <span>·</span> <time>${esc(e.when)}</time></p></div>${tag(e.type==='news'?'Story':'Post',e.type==='news'?'teal':'info')}</header><div class="tl-post-copy">${e.title?`<h3>${esc(e.title)}</h3>`:''}<p>${esc(e.copy)}</p>${btn('#'+e.topic.replaceAll(' ',''),'feed-topic',e.topic,{kind:'text',pressed:c.ui.feedTopic===e.topic})}</div>${e.story?.art?`<button class="tl-story-cover cc-cover-btn" data-c-do="story" data-c-val="${e.story.id}" type="button" aria-label="Read ${esc(e.title)}">${imageTile(c,e.story)}</button>`:''}<footer><div>${btn(historic||on?num(historic+Number(on)):'React','feed-like',e.key,{kind:'quiet',icon:'heart',pressed:on,label:on?'Remove reaction':'React to post'})}${btn(saved?'Saved':'Save','feed-save',e.key,{kind:'quiet',icon:'bookmark',pressed:saved,label:saved?'Remove saved post':'Save post'})}</div>${extra}</footer></article>`;
    }).join('');
    const accounts=socialSubjects.filter(([id,name,type])=>(!manage||following.includes(id))&&U.textMatch(c.ui.feedSearch,name,type));
    return `<div class="tl-social-page"><section class="tl-social-cover">${art('supporters')}<div><p class="tl-label"><i></i> RIVERSIDE SUPPORTERS & PRESS</p><h2>The Terrace</h2><p>Talk from the stands, the dressing room and the local papers.</p></div><dl><div><dt>Following</dt><dd>${following.length}</dd></div><div><dt>Saved posts</dt><dd>${prefs.saved.length}</dd></div></dl></section>
    <div class="tl-social-grid"><section class="tl-feed" aria-label="Social timeline"><div class="tl-feed-tools"><div class="tl-feed-tabs" aria-label="Feed views">${filter.map(([id,label])=>btn(label,'feed-mode',id,{pressed:mode===id})).join('')}<button class="tl-feed-skip cc-btn cc-btn-outline" type="button" data-c-do="feed-network" aria-controls="feedNetwork">Explore ${icon('i-arrow')}</button></div>${search('postSearch',query,'Search posts')}</div>${c.ui.feedTopic?`<div class="tl-topic-active">${tag('Topic: '+c.ui.feedTopic,'teal')} ${btn('Clear topic','feed-topic',c.ui.feedTopic,{kind:'text'})}</div>`:''}<div class="tl-feed-entries">${posts||empty(mode==='saved'?'No saved posts in this view':'Nothing matches this view','Change filters or explore the latest posts.')}</div></section>
    <aside class="tl-social-side" id="feedNetwork" tabindex="-1" aria-label="Social topics and accounts"><section class="tl-side-panel"><p class="tl-label">DISCOVER</p><h3>Topics</h3><div class="tl-topics">${topics.map(t=>btn(t,'feed-topic',t,{kind:'outline',pressed:c.ui.feedTopic===t})).join('')}</div></section><section class="tl-side-panel"><p class="tl-label">YOUR NETWORK</p><div class="tl-side-head"><h3>${manage?'Following':'Accounts'}</h3>${btn(manage?'All accounts':'Manage','feed-manage','',{kind:'text',pressed:manage})}</div>${search('feedSearch',c.ui.feedSearch,'Find clubs or people')}${U.scroll('tl-follow','Clubs and people to follow',accounts.length?accounts.map(([id,name,type])=>`<div class="tl-account">${mark(id)}<div><strong>${esc(name)}</strong><p>${esc(type)}</p></div>${btn(following.includes(id)?'Following':'Follow','feed-follow',id,{kind:'outline',pressed:following.includes(id),label:`${following.includes(id)?'Unfollow':'Follow'} ${name}`})}</div>`).join(''):empty('No matching accounts'),'tl-account-list')}<p class="tl-feed-caption">Follows, reactions and saved posts are local to this browser.</p></section><section class="tl-side-panel tl-press-link"><span>${icon('radar')}</span><div><p class="tl-label">FOOTBALL DESK</p><h3>Go beyond the feed</h3>${link('inbox','Read the news','news',null,'text')}</div></section></aside></div></div>`;
  }
  function feedAction(c,action,id){
    if(action==='feed-network'){
      const panel=document.getElementById('feedNetwork');panel?.focus({preventScroll:true});panel?.scrollIntoView({block:'start'});return;
    }
    const state=library(c), flip=(values,key)=>values.includes(key)?values.filter(x=>x!==key):[...values,key];
    if(action==='feed-like'||action==='feed-save'){
      if(!feedEntries(c).some(post=>post.key===id))return;
      const key=action==='feed-like'?'likes':'saved';state[key]=flip(state[key],id);
    }else if(action==='feed-follow'){
      if(!socialSubjects.some(subject=>subject[0]===id))return;state.follows=flip(state.follows,id);
    }else if(action==='feed-manage')c.ui.feedManage=!c.ui.feedManage;
    else if(action==='feed-mode')c.ui.feedMode=id;
    else if(action==='feed-topic')c.ui.feedTopic=c.ui.feedTopic===id?'':id;
    else return;
    try{global.localStorage.setItem(FEED_KEY,JSON.stringify(state));}catch{}
    c.render();
  }
  function moments(c) {
    c.show('Key moments · Eastvale v Riverside',`<p>Starter-season match report. No replay footage is stored for this result.</p><ol class="cc-moments">${C.matchReport.goals.map(([time,id,copy])=>`<li><b>${time}′</b><div>${player(id)}<p>${esc(copy)}</p></div></li>`).join('')}</ol>${fixture(C.reportFixture,'Full match report','outline')}`);
  }
  const inboxView={
    title:'Inbox',heading:c=>({social:'Social Feed',news:'News',leagues:'Leagues in Focus',world:'Around the World'})[c.r.tab]||'Inbox',tabs:tabs(['messages','Inbox'],['social','Social Feed'],['news','News'],['leagues','Leagues in Focus'],['world','Around the World']),
    enter(c){if(c.r.tab==='messages' && (c.r.id || !c.narrow())){const m=selectedMessage(c);c.ui.selected=m.id;c.apply('read',m.id);}},
    after(c,prev){
      if(c.r.tab!=='messages'||prev.id===c.r.id) return;
      if(!c.r.id) { if(c.narrow()) global.scrollTo(0,0); return; }
      const message=document.querySelector('.cc-mail[aria-current]');
      const list=message?.closest('[data-c-scroll]');
      if(message && list && !c.narrow()) {
        const mr=message.getBoundingClientRect(), lr=list.getBoundingClientRect();
        if(mr.bottom>lr.bottom) list.scrollTop+=mr.bottom-lr.bottom+5;
        if(mr.top<lr.top) list.scrollTop-=lr.top-mr.top+5;
      }
      const detail=document.querySelector('.cc-reader-copy'); if(detail) detail.scrollTop=0;
      if(c.narrow()) {global.scrollTo(0,0);document.querySelector('#inbox-subject')?.setAttribute('tabindex','-1');document.querySelector('#inbox-subject')?.focus({preventScroll:true});}
    },
    render(c){return ({messages,news,leagues,world,social})[c.r.tab](c);},
    action(c,action,id){
      if(action==='season-answer'){
        const [m,v]=id.split(':');if(c.season.answer(m,v)){c.render();c.note(S.pending(c.season.value).length?'Decision saved. There are other items to respond to.':'Decision saved. No further action is required today.');}
      }else if(action==='season-report'){
        const f=c.fixtures().find(f=>f.id===id), r=c.season.value.results[id];
        if(f&&r)c.show('Full-time match analysis',global.TLMatchReview.report({...c,f,side:Q.managed(f),ui:{}},r,true,true));
      }else if(action==='read-all'){c.apply('read-all'); c.render(); c.note('Inbox marked as read.');}
      else if(action==='inbox-group'||action==='league-fold'){
        const k=action==='inbox-group'?'closed':'folded', old=c.ui[k]||[];
        c.ui[k]=old.includes(id)?old.filter(x=>x!==id):[...old,id]; c.render();
      } else if(action.startsWith('feed-'))feedAction(c,action,id);
    else if(action==='moments') moments(c);
      else if(action==='workload') c.show('Training workload',`<p>Team training workload is <b>medium</b>. The sports science team recommends lighter individual sessions for players at high risk.</p>${medicalTable(c)}${link('squad','Medical overview','medical')}`);
      else if(action==='attend') c.show('Post-match press conference',U.editForm('press','',U.formSelect('response','How do you want to open?', ['Credit the team effort','Praise Fabio Novak','Focus on the next fixture']), 'Answer the press', 'The journalists are waiting at Vale Arena. Choose the tone for your opening answer.'));
      else if(action==='delegate-press'){if(c.apply('media','delegated')){c.render();c.note(`${C.namedStaff['Assistant Manager']} will handle the press conference.`);}}
      else if(action==='story') {
        const story=lookup(C.stories,id);if(!story)return;
        c.show(story.title,`<div class="cc-dialog-story">${imageTile(c,story,true)}</div><p>${esc(story.category)} · Riverside Football Desk</p><ul>${story.bullets.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><div class="cc-actions">${story.message?link('inbox','Read the full update','messages',story.message):league()}</div>`);
      } else if(action==='league-table') {
        const l=lookup(C.leagues,id);if(l)c.show(l.name,standings(c,`${l.name} standings`,l.id==='premier'?c.standings():l.rows,'focus-table',l.id==='premier'));
      } else if(action==='world-story') {
        const [l,i]=id.split(':'), league=lookup(C.leagues,l), headline=league?.headlines[+i];
        if(headline)c.show(headline[1],`<p>${esc(league.name)} · ${esc(headline[0])}</p>${standings(c,league.name,league.rows,'world-table')}`);
      } else U.scoutAction?.(c,action,id);
    },
    submit(c,cmd,id,data){
      if(cmd==='press'){if(c.apply('media','attended')) {c.close();c.render();c.note(`${data.get('response')}. Press conference completed.`);} return;}
      return U.scoutSubmit?.(c,cmd,id,data);
    }
  };
  views.inbox=inboxView;
  U.inboxActions=inboxView.action;
  U.matchMoments=moments;
})(window);
