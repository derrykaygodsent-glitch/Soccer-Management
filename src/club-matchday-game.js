/* Half time, full time, dressing rooms and an illustrative touchline interruption. */
(function (global) {
  'use strict';
  const X=global.TLMatchdayUI,{M,U,stage,player,shirt,short,pitch,pitchLines,phaseSketch,condition,scoreStrip,scene,teamSwitch}=X;
  const {H,C,icon,esc,avatar,btn,tag,link,table,tr,select,rank}=U;
  const M45=M.snapshot(45), M90=M.snapshot(90), choices=M.starting.bench.filter(p=>p.pos!=='GK');
  const homeName=id=>M.byPlayer(id).name;
  function xgChart(s){
    const max=Math.max(1.5,Math.ceil(Math.max(...s.xg)*2)/2),w=390,h=158,x0=34,y0=123;
    const x=n=>+(x0+n*(w-x0-13)/s.minutes).toFixed(2),y=n=>+(y0-n*(y0-15)/max).toFixed(2);
    const tones=['#78a9ff','#f5c06b'];
    const lines=M.matchSide.map((id,i)=>{
      let sum=0, d=`M${x(0)} ${y(0)}`;const goals=[];
      s.attempts.filter(a=>a.side===i).forEach(a=>{sum+=a.xg;d+=` H${x(a.min)} V${y(sum)}`;if(a.scorer)goals.push(`<circle cx="${x(a.min)}" cy="${y(sum)}" r="4" fill="${tones[i]}" stroke="#e8f1fc" stroke-width="1.45"><title>${a.min}′ ${esc(homeName(a.scorer))} scores</title></circle>`);});
      return `<path d="${d} H${x(s.minutes)}" stroke="${tones[i]}" stroke-width="2.65" fill="none" stroke-linecap="round" stroke-linejoin="round"/>${goals.join('')}`;
    }).join('');
    const xTicks=s.minutes===45?[0,15,30,45]:[0,15,30,45,60,75,90], yTicks=Array.from({length:4},(_,i)=>max*i/3);
    const grid=[...xTicks.map(n=>`<path d="M${x(n)} 15v${y0-15}"/>`),...yTicks.map(n=>`<path d="M${x0} ${y(n)}H${x(s.minutes)}"/>`)].join('');
    return `<svg class="md-xg-plot" viewBox="0 0 ${w} ${h}" role="img" aria-label="Cumulative expected goals at ${s.minutes} minutes: Riverside ${s.xg[0].toFixed(2)}, Harbourport ${s.xg[1].toFixed(2)}"><g stroke="#566176" stroke-opacity=".55" stroke-width=".8" fill="none">${grid}</g><g font-size="10.5" fill="#b5c2d6">${xTicks.map(n=>`<text x="${x(n)}" y="${y0+17}" text-anchor="middle">${n}′</text>`).join('')}${yTicks.map(n=>`<text x="${x0-7}" y="${y(n)+4}" text-anchor="end">${n.toFixed(1)}</text>`).join('')}</g>${lines}</svg>`;
  }
  function story(c,s){
    return `<section class="md-xg-card"><div class="md-xg-head"><div><h3>xG Match Story</h3><p>${esc(M.matchTitle)} · 30/10/2024</p></div>${icon('i-bars')}</div><div class="md-xg-key">${M.matchSide.map((t,i)=>`<span><i></i>${H.clubs[t].short} <b>${s.xg[i].toFixed(2)}</b></span>`).join('')}</div>${xgChart(s)}<p class="md-xg-desc">${s.minutes===45?'Riverside have the better chances at the break, with the breakthrough coming from the centre of the box.':'Riverside created the greater volume of chances, although Harbourport’s late goal kept the tie close.'}</p></section>`;
  }
  function matchStats(c,s){
    const stats=s.stats.map(([label,left,right])=>{
      const sum=parseFloat(left)+parseFloat(right), share=sum?Math.floor(parseFloat(left)/sum*100):50;
      return `<div class="md-stat-row"><div><b>${left}</b><span>${esc(label)}</span><b>${right}</b></div><i style="--md-stat:${share}%" aria-hidden="true"></i></div>`;
    }).join('');
    const note=(e)=>{
      const description=e.kind==='ball'?'Goal':e.kind==='card'?'Yellow card':e.kind==='medical'?'Injury':'Substitution';
      const name=e.kind==='swap'?`${homeName(e.player)} on`:homeName(e.player);
      return `<li><time>${e.min}′</time><span class="md-event-icon md-event-${e.kind}" title="${description}">${icon(e.kind)}</span><span>${C.players[e.player]?player(e.player,name):esc(name)} <small>${H.clubs[M.matchSide[e.side]].short} · ${description}</small></span></li>`;
    };
    return `<aside class="md-review-panel md-match-stats"><h2 class="cc-title">Match stats</h2><div class="md-stat-head">${c.crest(M.home.id)}<span>Team comparison</span>${c.crest(M.away.id)}</div><div class="md-stat-rows">${stats}</div><h3 class="cc-title">Notable events</h3><ol class="md-notable">${s.notable.map(note).join('')}</ol></aside>`;
  }
  function ratingsStrip(c,s){return `<section class="md-ratings-strip"><div><h3 class="cc-title">Riverside XI</h3><p>Ratings at ${s.minutes===45?'the break':'full time'}</p></div>${U.scroll('md-rating-strip','Riverside ratings',`<div class="md-rating-tiles">${s.xi.map(slot=>`<button type="button" data-c-do="player" data-c-val="${slot.player.id}" aria-label="Open ${esc(slot.player.name)}"><small>${slot.label}</small>${shirt(slot.player,M.home.id)}<strong>${esc(short(slot.player))}</strong>${rank(s.ratings[slot.player.id])}</button>`).join('')}</div>`)}</section>`;}
  const reviewTools=()=>`<div class="md-review-actions"><div>${btn('Player statistics','md-player-stats','',{icon:'team'})}${btn('Analytical data','md-analysis','',{icon:'i-bars'})}</div>${stage('fixtures','Latest scores & table','league')}</div>`;
  function half(c){
    const s=M45;
    return `<div class="md-review md-review-half">${scoreStrip(c,'Half time',s.score,'45′ · Interval')}
      <div class="md-analysis-ground"><div class="md-review-bg">${pitchLines()}</div><div class="md-review-grid">${matchStats(c,s)}<section class="md-review-panel md-backroom"><div class="md-report-byline">${avatar(c,C.namedStaff['Head Performance Analyst'])}<div><h2 class="cc-title">Half-time backroom advice</h2><p>${esc(C.namedStaff['Head Performance Analyst'])} · Performance analysis</p></div>${tag('Interval','teal')}</div><div class="md-halftime-core"><section class="md-advice"><span class="cc-eyebrow">Chance creation</span><h3>Find the inside channel</h3>${phaseSketch('build')}<p>Harbourport are leaving space between the right-back and centre-back. Keep Berg wide, then let Novak attack the gap when the ball comes inside.</p><div class="md-advice-note">${icon('medical')}<span>Monitor the players already carrying a heavy workload.</span></div></section>${story(c,s)}</div>${reviewTools()}<div class="cc-actions cc-actions-start">${stage('lineups','Lineups')}${stage('half','Dressing room','talk','primary')}</div></section></div></div>${ratingsStrip(c,s)}</div>`;
  }
  function full(c){
    const s=M90, active=c.ui.mdReportTeam===M.away.id?M.away.id:M.home.id, visiting=active===M.away.id;
    const ratings=visiting?Object.fromEntries(M.opposition.xi.map(({player},i)=>[player.id,+(6.3+(i*17%12)*.1).toFixed(1)])):s.ratings;
    const best=C.players[s.best];
    return `<div class="md-review md-review-full">${scoreStrip(c,'Full time',s.score,'90′ · Final whistle')}
      <div class="md-analysis-ground"><div class="md-review-bg">${pitchLines()}</div><div class="md-review-grid">${matchStats(c,s)}<section class="md-review-panel md-full-shape"><div class="md-report-shape-head"><h2 class="cc-title">Player ratings</h2>${teamSwitch(c,'md-report-team',active)}</div>${pitch(c,visiting?M.opposition.xi:s.xi,{club:active,mode:'ratings',ratings,clickable:!visiting,label:`${H.clubs[active].name} full-time positions and ratings`})}<p class="cc-muted">${visiting?'4–4–2 · Starting XI':'4–3–3 · As at the final whistle'}</p>${!visiting?`<div class="md-sub-summary">${icon('i-swap')}<span><b>${player(M.knock.sub)}</b><small>58′ · Replaced ${esc(homeName(M.knock.id))}</small></span>${rank(s.ratings[M.knock.sub])}</div>`:''}</section>
        <section class="md-review-panel md-full-staff"><h2 class="cc-title">Staff feedback</h2>${story(c,s)}<div class="md-potm-mini"><h3 class="cc-title">Best performer</h3><div class="cc-person">${avatar(c,best.name,best.id,'cc-avatar-lg')}<div>${player(best.id)}<p>${rank(s.ratings[best.id])} · Two goals</p></div></div></div>${reviewTools()}<div class="cc-actions">${stage('full','Dressing room','talk','primary')}</div></section></div></div></div>`;
  }
  const gestures=['No gesture','Hands together','Hands on hips','Pump fists','Outstretched arms'];
  const audiences=['Room','Defenders','Midfielders','Attackers','Individuals'];
  const statements={
    half:['I’m pleased with the chances we’ve created. Keep finding those spaces.','We’ve had a lot of the ball but need to move it quicker.','Stay focused at the back. Don’t let them play out easily.','Keep getting the ball wide, then play the next pass inside.','There’s more in this for us. Keep the pressure on.','Don’t let the score change how we’re playing.'],
    full:['Well done, that was a good win for us.','I’m pleased with the win, but we gave them too much late on.','I’m very happy with the result and the way you played.','The second goal was excellent. Take that confidence into the next match.','You handled the pressure well when they came back at us.','Enjoy the win, then we’ll turn our attention to the league.']
  };
  const defensive = new Set(['GK','DC','FB','WB']), midfield = new Set(['DM','CM','AM']);
  const talkKey=c=>c.r.tab==='full'?'talkFull':'talkHalf';
  const getTalk=c=>({audience:'Room',gesture:'No gesture',player:'rvr_17',statement:null,assistant:false,...c.ui[talkKey(c)]});
  function reacts(slot,talk){
    return talk.audience==='Room'||talk.audience==='Individuals'&&talk.player===slot.player.id||talk.audience==='Defenders'&&defensive.has(slot.role)||talk.audience==='Midfielders'&&midfield.has(slot.role)||talk.audience==='Attackers'&&!defensive.has(slot.role)&&!midfield.has(slot.role);
  }
  function roomPlayer(s,slot,talk,i,reserve=false){
    const p=slot.player, hasResponse=(talk.statement!=null||talk.assistant)&&reacts(slot,talk), confidence=reserve?'Composed':s.minutes===90&&s.ratings[p.id]>=7.5?'Assured':i%3===0?'Calm':'Confident';
    const mood=hasResponse?'Encouraged':confidence;
    return `<article class="md-room-player"><div><span class="md-room-position">${slot.label}</span>${shirt(p,M.home.id)}<div>${player(p.id)}<small>${reserve?'Substitute':p.id===C.leaders.captain?'Team leader':p.id===C.leaders.vice?'Highly influential player':'First-team player'}</small></div>${s.ratings[p.id]!=null?rank(s.ratings[p.id]):''}</div><p class="md-room-mood ${mood==='Calm'||mood==='Composed'?'md-mood-calm':'md-mood-good'}">${mood}</p></article>`;
  }
  function dressing(c){
    const late=c.r.tab==='full',s=late?M90:M45,talk=getTalk(c),msg=late?statements.full:statements.half;
    const selected=(talk.statement!=null?`${msg[talk.statement]}`:talk.assistant?'Assistant handles the talk.':'Choose an audience, then select a statement.');
    const eleven=s.xi.slice().sort((a,b)=>b.x-a.x), used=late?M.knock.sub:'', bench=M.starting.bench.filter(p=>p.id!==used).map((p,i)=>({player:p,role:p.pos,label:`S${i+1}`}));
    return `<div class="md-dressing">${scoreStrip(c,late?'Full time':'Half time',s.score,late?'Final team talk':'Dressing room')}${scene('dressing',`<div class="md-locker-grid"><div class="md-locker-top">${eleven.slice(0,4).map((slot,i)=>roomPlayer(s,slot,talk,i)).join('')}</div><div class="md-locker-side md-locker-left"><h2>On the pitch</h2>${eleven.slice(4).map((slot,i)=>roomPlayer(s,slot,talk,i+4)).join('')}</div>
      <section class="md-scene-panel md-talk-box"><span class="cc-eyebrow">${late?'After the final whistle':'Half-time interval'}</span><h2>${late?'Final team talk':'Team talk'}</h2><div class="md-audience"><span>Talk to</span>${audiences.map(a=>btn(a,'md-audience',a,{pressed:talk.audience===a})).join('')}</div>${talk.audience==='Individuals'?select('talkPlayer','Choose player',s.xi.map(({player:p})=>[p.id,p.name]),talk.player,{show:true}):''}
      <h3 class="cc-title">Gesture</h3><div class="md-talk-gestures">${gestures.map(g=>btn(g,'md-gesture',g,{pressed:talk.gesture===g})).join('')}</div><h3 class="cc-title">Statement</h3><div class="md-statement-list">${msg.map((statement,i)=>`<button type="button" data-c-do="md-statement" data-c-val="${i}" aria-pressed="${i===talk.statement}"><span>${esc(statement)}</span>${i===(late?2:0)?tag('Assistant recommends','teal'):''}</button>`).join('')}</div><p class="md-talk-status" role="status">${(talk.statement!=null||talk.assistant)?`<b>Preview:</b> `:''}${esc(selected)}</p></section><div class="md-locker-side md-locker-right"><h2>Substitutes</h2>${bench.map((slot,i)=>roomPlayer(s,slot,talk,i,true)).join('')}</div></div>`,'md-locker-scene')}
      <div class="md-talk-footer"><div>${stage(c.r.tab,late?'Full-time review':'Half-time review','','outline',false)}${link('tactics','Tactics','overview',null,'solid',false)}</div><div class="cc-person md-talk-manager">${avatar(c,H.manager)}<div><strong>${esc(H.manager)}</strong><small>Manager</small></div></div><div>${btn('Hand over to assistant','md-assistant','',{pressed:talk.assistant})}${stage(late?'post':'touchline',late?'Post-match Inbox':'Second-half preview','','primary')}</div></div></div>`;
  }
  function touchline(c){
    const p=C.players[M.knock.id], picked=choices.find(v=>v.id===c.ui.mdSubPick), confirmed=choices.find(v=>v.id===c.ui.mdSubConfirm);
    const xi=M.starting.xi.map(slot=>slot.player.id===p.id&&confirmed?{...slot,player:confirmed}:slot), bench=M.starting.bench.filter(b=>b!==confirmed);
    const row=(p,label,bench=false)=>{
      const injured=p.id===M.knock.id, tone=injured?'bad':bench?'info':'good', status=injured?'Needs assessment':bench?'Available':'Composed';
      return tr([`<b>${label}</b>`,`<span class="md-person-shirt">${shirt(p,M.home.id)}${player(p.id)}</span>`,injured?tag('Inj','bad'):'–',condition(injured?M.knock.condition:bench?97:75+p.num%15),tag(status,tone),bench||p===confirmed?'–':rank(M45.ratings[p.id])],injured?'md-live-injured':confirmed===p?'md-live-sent':picked===p?'md-live-picked':bench?'md-reserve':'');
    };
    return `<div class="md-touchline">${scoreStrip(c,'56:00',M45.score,'Paused · Sample incident')}<div class="md-touchline-alert">${icon('medical')}<div><b>${confirmed?'Preview substitution confirmed':`${esc(p.name)} has picked up a knock`}</b><p>${confirmed?`${esc(confirmed.name)} on for ${esc(p.name)}. The example full-time report is scripted separately.`:`${M.knock.issue} · condition at ${M.knock.condition}% · the physio recommends a change.`}</p></div>${tag('Injury example','bad')}</div><div class="md-touchline-grid"><section class="md-tactics-board md-live-pitch"><h2>4–3–3 · Control Possession</h2><p>Positive mentality</p>${pitch(c,xi,{mode:'numbers',clickable:true,label:'In-play preview formation',knock:confirmed?'':p.id})}<div class="cc-actions">${link('tactics','Tactics desk','overview',null,'solid')}</div></section>
      <section class="cc-card md-touchline-sheet"><div class="md-results-head"><div><h2 class="cc-title">Matchday squad</h2><p>${confirmed?'4 of 5 changes remaining in preview':'5 of 5 changes available in preview'}</p></div>${tag('Riverside FC','info')}</div>${table('Sample in-play squad',['Pos','Player','Info','Con','Body language','Rat'],[...xi.map(s=>row(s.player,s.label)),...bench.map((p,i)=>row(p,`S${i+1}`,true))],'md-touchline-sheet','md-live-table')}
      <div class="md-sub-controls"><div><span class="cc-eyebrow">Player off</span><strong>${esc(p.name)}</strong></div>${select('mdSubPick','Replacement',[['','Select a substitute'],...choices.map(b=>[b.id,`${b.name}${b.pos===p.pos?' · '+b.bestPos:''}`])],c.ui.mdSubPick||'',{show:true})}<div>${btn('Undo','md-sub-undo','',{disabled:!picked&&!confirmed})}${btn('Confirm preview','md-sub-confirm','',{kind:'primary',disabled:!picked||picked===confirmed})}</div></div></section></div><div class="cc-actions cc-actions-start">${stage('half','Dressing room','talk')}${stage('full','Full-time review','','primary')}</div></div>`;
  }
  function gameAction(c,cmd,id){
    if(cmd==='md-report-team'){c.ui.mdReportTeam=id;c.render();}
    else if(cmd==='md-player-stats'||cmd==='md-analysis'){
      const s=c.r.tab==='full'?M90:M45;
      c.show(cmd==='md-analysis'?'Analytical data · Preview':'Player statistics · Preview',cmd==='md-analysis'?`${story(c,s)}<p>Expected goals describe the quality of the sample shots, not the result of the playable match.</p>`:table('Sample Riverside ratings',['Player','Rating','Goals'],Object.entries(s.ratings).sort((a,b)=>b[1]-a[1]).map(([id,v])=>tr([player(id),rank(v),s.notable.filter(e=>e.kind==='ball'&&e.player===id).length])),'md-popup-ratings'));
    }else if(['md-audience','md-gesture','md-statement','md-assistant'].includes(cmd)){
      const t=getTalk(c);
      if(cmd==='md-audience')Object.assign(t,{audience:id,statement:null,assistant:false});
      if(cmd==='md-gesture')t.gesture=id;
      if(cmd==='md-statement')Object.assign(t,{statement:+id,assistant:false});
      if(cmd==='md-assistant')Object.assign(t,{assistant:!t.assistant,statement:null});
      c.ui[talkKey(c)]=t;c.render();
    }else if(cmd==='md-sub-confirm'&&choices.some(p=>p.id===c.ui.mdSubPick)){c.ui.mdSubConfirm=c.ui.mdSubPick;c.render();c.note('Preview only. No change to Classic 2D.');}
    else if(cmd==='md-sub-undo'){delete c.ui.mdSubPick;delete c.ui.mdSubConfirm;c.render();}
  }
  function gameField(c,key,value){
    if(key==='talkPlayer'){c.ui[talkKey(c)]={...getTalk(c),player:value,statement:null,assistant:false};c.render();return true;}
    return false;
  }
  Object.assign(X,{half,full,dressing,touchline,gameAction,gameField,story});
})(window);
