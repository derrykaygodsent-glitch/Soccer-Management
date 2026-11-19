/* The sample match creates no real inbox items. These layouts read one fixed editorial snapshot. */
(function (global) {
  'use strict';
  const X=global.TLMatchdayUI,{M,U,player,stage,scoreStrip,longDate}=X;
  const {C,icon,avatar,art,btn,tag,link,table,tr,esc,values}=U;
  const F=M.snapshot(90), best=C.players[F.best];
  const tones={Match:'good',Injuries:'bad',Media:'violet'};
  const pop=(title,source,contents)=>`<section class="md-editorial"><header><h3>${esc(title)}</h3>${tag(source,'teal')}</header>${contents}</section>`;
  const reportButtons=()=>`${stage('full','Match analysis')}${stage('fixtures','Cup results','cup-results')}`;
  function potm(c){
    const times=F.notable.filter(x=>x.player===best.id&&x.kind==='ball').map(x=>x.min), praised=!!c.ui.mdPraise;
    return [
      `<p>I’m forwarding the following article from The Touchline.</p>${pop('Novak at the double as Riverside go through','The Touchline',`<div class="md-potm-article"><aside class="md-star-player"><span class="cc-eyebrow">2024/25 · League Cup</span><h4>Player of the Match</h4><div class="md-star-art">${art('floodlights')}${c.crest(M.home.id)}${avatar(c,best.name,best.id,'cc-avatar-xl')}</div><strong>${player(best.id)}</strong><small>Riverside FC · ${esc(best.position)}</small><div class="md-potm-numbers"><div><span>Goals</span><b>${times.length}</b></div><div><span>Assists</span><b>0</b></div><div><span>Rating</span><b>${F.ratings[best.id].toFixed(1)}</b></div></div>${stage('full','Match analysis')}</aside><div class="cc-prose"><p>${player(best.id)} scored twice as Riverside edged Harbourport Town <strong>${F.score.join('–')}</strong> in the League Cup Fourth Round at Quayside Park.</p><p>The striker opened the scoring after ${times[0]} minutes, meeting a low ball across the box. He added the second on ${times[1]} minutes after finding space between the centre-backs.</p><p>Jonas Vidic pulled a goal back before the closing stages. Riverside held their lead and advance to the quarter-finals in this example result.</p>${praised?`<p class="cc-callout cc-good">Praise selected for this preview. No message has been sent.</p>`:''}</div></div>`)}`,
      btn(praised?'Praised (preview)':'Praise performance','md-praise','',{kind:'solid',icon:'mail',pressed:praised})
    ];
  }
  function report(c){
    return [`<p>Attached is the match desk’s summary of the fourth-round tie.</p>${pop('League Cup · Riverside edge Harbourport','Match desk',`${scoreStrip(c,'Full time',F.score,'Sample result')}<div class="md-report-columns"><div class="cc-prose"><p>A goal in each half from Fabio Novak put Riverside in control at Quayside Park. Harbourport halved the deficit in the 75th minute, but the hosts held on.</p><p>The numerical edge came from the home side’s chances in and around the penalty area. The backroom team has compiled a full report on the tie.</p></div>${table('Sample stats',['Stat','RVR','HPT'],F.stats.filter(([k])=>['Shots','xG','Possession'].includes(k)).map(row=>tr(row)),'md-report-summary')}</div>`)}`,reportButtons()];
  }
  function knock(c){
    const p=C.players[M.knock.id];
    return [`<p>${player(p.id)} took an ankle knock in the ${U.H.ordinal(M.knock.min)} minute and was replaced two minutes later. The medical team will assess him before the next session.</p>${pop('Post-match medical note','Medical team',`<div class="md-knock-card"><div class="cc-person">${avatar(c,p.name,p.id,'cc-avatar-lg')}<div>${player(p.id)}<p>${esc(M.knock.issue)}</p></div></div>${values([['Status','Awaiting assessment'],['Condition when withdrawn',`${M.knock.condition}%`],['Next step','Physio review']])}</div>`)}`,`${stage('touchline','View in-play tactics')}${link('medical','Medical Centre')}`];
  }
  function risk(c){
    return [`<div class="cc-prose"><p>There are three matches in seven days. The medical team is watching player workload in the build-up to the Harbourport tie. ${player('rvr_11')} remains out; the others listed below can be monitored in training.</p></div>${pop('Risk assessment','Sports science',`<div class="md-risk-summary"><div><small>Fixtures</small><b>3 matches in 7 days</b></div><div><small>Team workload</small><b>Medium</b></div></div>${global.TLClubReadiness.riskTable(c)}`)}`,`${link('training','Team training')}${link('medical','Medical Centre')}${link('squad','Injury table','medical')}`];
  }
  const pressAnswers=['Credit the team effort','Praise Fabio Novak','Focus on the next fixture'];
  function press(c){
    const response=c.ui.mdPress;
    const speakers=table('Notable journalists',['Journalist','Influence','Relationship'],C.journalists.map(([name,outlet,influence,relationship])=>tr([`<div class="cc-person">${avatar(c,name)}<div><strong>${esc(name)}</strong><small>${esc(outlet)}</small></div></div>`,esc(influence),tag(relationship,relationship==='Neutral'?'info':'good')])),'md-press-attendees');
    return [`<p>The press is gathering at ${esc(M.home.stadium)} after the League Cup tie against ${esc(M.away.name)}.</p><section class="cc-editorial cc-press-grid md-press-preview"><div class="cc-press-side"><div class="cc-press-art">${art('pressroom')}<div>${icon('cup')}<strong>Post-match<br>press conference</strong></div></div><p class="cc-eyebrow">League Cup · Fourth Round</p><p>${esc(M.matchTitle)}</p><hr><h3>Press conference location</h3><p class="cc-icon-text">${icon('stadium')}${esc(M.home.stadium)}</p><hr><h3>Journalists expected</h3><b class="cc-good">10 journalists</b><p class="cc-muted">National and international press are in attendance.</p></div><div class="cc-press-main"><h3>Notable journalists in attendance</h3>${speakers}<div class="cc-talking"><h3>Likely talking points</h3><ul><li>Your reaction to the match</li><li>Novak’s two goals</li><li>The late spell of Harbourport pressure</li><li>Selection for the next round</li></ul></div></div></section>${response?`<p class="cc-callout cc-good"><b>Preview:</b> ${esc(response)}. No press choice was saved.</p>`:''}`,
      `${btn('Attend press conference','md-press-attend','',{kind:'primary'})}${btn('Send assistant','md-press-answer',C.namedStaff['Assistant Manager']+' sent to the press',{kind:'solid'})}`];
  }
  const article={ 'player-of-match':potm, report, knock, risk, press };
  const getMessage=c=>M.messages.find(m=>m.id===c.r.id)||M.messages[0];
  function post(c){
    const m=getMessage(c), [contents,controls]=article[m.id](c);
    const visible=!!c.r.id;
    const list=`<aside class="cc-inbox-nav" aria-label="Sample messages"><div class="md-post-list-head"><h2 class="cc-title">Sample Inbox</h2>${tag(`${M.messages.length} items`,'info')}</div>${U.scroll('md-post-list','Cup coverage messages',`<div class="md-post-date">${esc(longDate(M.fixture.date))}</div>${M.messages.map(n=>`<button type="button" class="cc-mail" data-c-go="matchday" data-c-tab="post" data-c-id="${n.id}"${m===n?' aria-current="true"':''}><span>${esc(n.from)}<time>${n.time}</time></span><strong>${esc(n.subject)}</strong></button>`).join('')}`)}</aside>`;
    const roles={Match:'Press Officer',Injuries:m.id==='risk'?'Head of Sports Science':'Head Physio',Media:'Press Officer'};
    return `<div class="cc-inbox md-post-inbox" data-mobile-reader="${visible}">${list}<article class="cc-reader" aria-labelledby="md-post-subject"><div class="cc-reader-mobile">${btn('Back to sample messages','md-post-back','',{kind:'solid'})}</div><header class="cc-reader-head">${c.crest(M.home.id)}${avatar(c,m.from)}<div><p>${esc(m.from)} <span class="cc-muted">(${roles[m.kind]})</span></p><h2 id="md-post-subject" tabindex="-1">${esc(m.subject)}</h2></div><div>${tag(m.kind,tones[m.kind])}<time>${m.time}</time></div></header>${U.scroll('md-post-reader','Sample message',contents,'cc-reader-copy')}<footer class="cc-reader-actions cc-actions">${controls}</footer></article></div>`;
  }
  function postAction(c,cmd,value){
    if(cmd==='md-praise'){c.ui.mdPraise=!c.ui.mdPraise;c.render();}
    else if(cmd==='md-press-attend')c.show('Post-match press conference · Preview',`<p>How do you want to open the press conference?</p><div class="md-press-answers">${pressAnswers.map(a=>btn(a,'md-press-answer',a,{kind:'solid'})).join('')}</div><p class="cc-muted">Only the preview message is updated.</p>`);
    else if(cmd==='md-press-answer'){c.ui.mdPress=value;c.close();c.render();}
    else if(cmd==='md-post-back'){c.go('matchday','post');}
  }
  Object.assign(X,{post,postAction,getMessage});
})(window);
