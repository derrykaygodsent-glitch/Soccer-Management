/* Dressing-room talks and engine-backed analysis, shared with the read-only archive. */
(function(global){
  'use strict';
  const X=global.TLMatchdayUI, {M,U,pitch,shirt,short,scene,phaseSketch,scoreStrip,condition}=X, Q=global.TLSeasonMatch, K=global.TLSeasonCalendar;
  const {cmd,ctl}=global.TLMatchPrep, {H,C,esc,icon,rank,tag,empty,stamp,tr,table}=U;
  function xgChart(r){
    const max=Math.max(.75,Math.ceil(Math.max(...r.stats.map(t=>t.xG))*2)/2), maxTime=r.minutes, px=n=>+(37+n*370/maxTime).toFixed(2), py=n=>+(148-n*123/max).toFixed(2);
    const colors=['#83aaff','#ffc473'], times=maxTime===45?[0,15,30,45]:[0,15,30,45,60,75,90], scale=Array.from({length:4},(_,i)=>max*i/3);
    const grid=[...times.map(n=>`<path d="M${px(n)} 25v123"/><text x="${px(n)}" y="166" text-anchor="middle">${n}′</text>`),...scale.map(n=>`<path d="M37 ${py(n)}h370"/><text x="31" y="${py(n)+3}" text-anchor="end">${n.toFixed(2)}</text>`)].join('');
    const lines=r.clubs.map((id,i)=>{
      let total=0,d=`M${px(0)} ${py(0)}`,goals=[];
      r.shots.filter(s=>s.team===i).forEach(s=>{total+=s.xg;d+=`H${px(s.minute)}V${py(total)}`;if(s.outcome==='goal')goals.push(`<circle cx="${px(s.minute)}" cy="${py(total)}" r="4.1" fill="${colors[i]}" stroke="#121a29"/>`);});
      return `<path d="${d}H${px(maxTime)}" fill="none" stroke="${colors[i]}" stroke-width="2.3" stroke-linejoin="round"/>${goals.join('')}`;
    });
    return `<div class="ms-xg"><h2>xG match story</h2><div class="ms-xg-legend">${r.clubs.map((id,i)=>`<span style="--tone:${colors[i]}"><i></i>${esc(H.clubs[id].short)} <b>${r.stats[i].xG.toFixed(2)}</b></span>`).join('')}</div><svg viewBox="0 0 420 173" role="img" aria-label="Cumulative expected goals. ${r.clubs.map((id,i)=>`${H.clubs[id].name}: ${r.stats[i].xG.toFixed(2)}`).join(' and ')}"><g class="ms-xg-grid">${grid}</g>${lines.join('')}</svg></div>`;
  }
  const eventGlyph={goal:'ball',og:'ball',penscore:'ball',penmiss:'ball',pen:'ball',yellow:'card',red:'redcard',sub:'swap',injury:'medical',stoppage:'calendar',ht:'i-bars',ft:'i-bars'};
  function events(r){
    const es=r.events.filter(e=>!['ht','ft','stoppage'].includes(e.type));
    return `<div class="ms-events"><h3>Notable events</h3>${es.length?`<ol>${es.map(e=>`<li data-kind="${e.type}"><time>${e.time}</time>${icon(eventGlyph[e.type]||'ball')}<span>${e.team==null?'':`<b>${esc(H.clubs[r.clubs[e.team]].short)}</b> `}${esc(e.text)}</span></li>`).join('')}</ol>`:empty('No notable events')}</div>`;
  }
  function stats(r){return `<div class="ms-box-stats"><h3>Match stats</h3><div class="ms-stats-head">${r.clubs.map(id=>`<b>${esc(H.clubs[id].short)}</b>`).join('')}</div>${Q.teamStats(r.stats,r.possession).map(([k,a,b])=>`<div><strong>${a}</strong><span>${esc(k)}</span><strong>${b}</strong></div>`).join('')}</div>`;}
  function playerTable(r,side){
    const group=r.players[side].slice().sort((a,b)=>b.rating-a.rating);
    return table(`${H.clubs[r.clubs[side]].name} ratings`,['Player','Rating','Gls','Ast','Shots','Passes','Condition'],group.map(p=>tr([`<span class="ms-rated-name">${shirt(p,r.clubs[side])}${esc(p.name)}${p.red?tag('Red card','bad'):p.injury?tag('Knock','warn'):''}</span>`,rank(p.rating),p.stats.goals,p.stats.assists,p.stats.shots,p.stats.passWon,condition(p.cond)])),`ratings-${side}`,'ms-player-stats');
  }
  function shape(c,r,side){
    const ratings=Object.fromEntries(r.players[side].map(p=>[p.id,p.rating]));
    const slots=r.lineup[side].map(s=>({...s,player:r.players[side].find(p=>p.id===s.id)}));
    return `<div class="ms-final-pitch"><header><h2>${esc(H.clubs[r.clubs[side]].name)}</h2>${tag(r.shapes[side],'teal')}</header>${pitch(c,slots,{club:r.clubs[side],mode:'ratings',ratings,label:`${H.clubs[r.clubs[side]].name} closing shape`})}</div>`;
  }
  function resultLetter(r,side){
    const a=(r.pen||r.goals)[side], b=(r.pen||r.goals)[1-side];return a===b?'Draw':a>b?'Win':'Defeat';
  }
  function dispatch(c,r,side,best){
    const f=c.f, club=H.clubs[f.home], away=H.clubs[f.away], outcome=resultLetter(r,side), headline=`${club.name} ${r.goals.join('–')} ${away.name}`;
    const line=outcome==='Win'?'Riverside saw it out. The away end will remember this one.':outcome==='Defeat'?'A difficult result. On to the next fixture.':'Nothing to separate the sides. Both had chances to take more from it.';
    const quote=outcome==='Win'&&(f.home===H.homeId)?line.replace('The away end','The Quayside crowd'):line;
    return `<div class="tl-match-dispatch"><section class="tl-dispatch-lead">${U.art('supporters')}<div><p class="cc-eyebrow">QUAYSIDE CHRONICLE · FINAL WHISTLE</p><h2>${esc(headline)}</h2><p>${esc(K.club(f.home).stadium)} · ${esc(H.fixtureCompetition(f))}${r.pen?` · ${r.pen.join('–')} on penalties`:''}</p></div></section><div class="tl-dispatch-grid"><section class="ms-panel"><p class="cc-eyebrow">ON THE TERRACE</p><h2>Supporter reaction</h2><blockquote>${esc(quote)}</blockquote></section><section class="ms-panel"><p class="cc-eyebrow">MATCH DESK</p><h2>${esc(best.name)}</h2><p>Player of the match · ${best.rating.toFixed(2)} rating</p><p class="ms-hint">The full report and press request are in your Inbox after the final team talk.</p></section></div></div>`;
  }
  function report(c,r,full,archived=false){
    const side=c.side, chosen=c.ui.reportSide??side, advisor=Q.analyst(r,side), best=r.players.flat().sort((a,b)=>b.rating-a.rating)[0];
    const pen=r.pen?`<p class="ms-pen-summary">${esc(H.clubs[r.clubs[r.pen[0]>r.pen[1]?0:1]].name)} win ${r.pen.join('–')} on penalties</p>`:'';
    const intro=scoreStrip(c,c.f,full?'Full time':'Half time',r.goals,r.added.filter(x=>x>0).length?(full?`Added time +${r.added[0]}′ / +${r.added[1]}′`:`Added time +${r.added[0]}′`):'');
    const feedback=`<div class="ms-backroom"><span class="cc-eyebrow">${full?'Staff feedback':'Half-time backroom advice'}</span><h2>${full?`${resultLetter(r,side)} · ${advisor.title}`:advisor.title}</h2><p>${esc(advisor.copy)}</p>${!full?`<p class="ms-hint">${esc(advisor.hint)}</p>`:''}</div>`;
    if(archived)return `<div class="ms-archive">${intro}${pen}<div class="ms-archive-grid">${stats(r)}${xgChart(r)}</div>${events(r)}${playerTable(r,side)}${r.kicks?.length?shootoutDetails(r):''}</div>`;
    const selection=c.ui.reportMode||'overview', ratings=selection==='players', around=selection==='grounds', detailed=selection==='analysis';
    const right=headCounts(r,full);
    const switcher=`<div class="ms-review-switch" aria-label="Match report view">${[['overview','Overview'],['players','Player statistics'],['analysis','Analytical data'],['grounds','Around the grounds'],...(full?[['dispatch','Press & supporters']]:[])].map(([k,l])=>cmd(l,'report-mode',k,{pressed:selection===k})).join('')}${!full?cmd('Tactics & subs','interval-desk','',{icon:'tactics'}):''}</div>`;
    const teamSelect=`<div class="ms-review-team">${r.clubs.map((id,i)=>cmd(H.clubs[id].name,'report-side',i,{pressed:i===chosen})).join('')}</div>`;
    return `<div class="ms-review">${intro}${pen}${switcher}${selection==='dispatch'&&full?dispatch(c,r,side,best):around?global.TLClubSeason.fixtures(c,c.s,c.f.date):`<div class="ms-review-ground">${U.art('floodlights')}<div class="ms-review-layout"><aside class="ms-panel ms-report-rail">${stats(r)}${events(r)}</aside><section class="ms-panel ms-report-main">${ratings?`${teamSelect}${playerTable(r,chosen)}`:detailed?`${xgChart(r)}${shotMap(r)}${r.kicks?.length?shootoutDetails(r):''}`:full?`${teamSelect}${shape(c,r,chosen)}`:`${feedback}<div class="ms-review-sketch">${phaseSketch(advisor.shape)}<div><h3>At the interval</h3><p>${esc(right)}</p></div></div>`}</section><aside class="ms-panel ms-report-analysis">${!detailed?xgChart(r):''}${full?`${feedback}<div class="ms-best"><span class="cc-eyebrow">Player of the match</span><div>${U.avatar(c,best.name,best.id)}<strong>${esc(best.name)}</strong>${rank(best.rating)}</div></div>`:`<p class="ms-analysis-note">${esc(right)}</p>`}</aside></div></div>`}</div>`;
  }
  const headCounts=(r,full)=>`${r.shots.length} ${r.shots.length===1?'attempt':'attempts'} recorded ${full?'by the final whistle':'before the break'} · ${r.clock} on the match clock.`;
  function shotMap(r){
    const a=r.shots.map(s=>`<circle cx="${(4+s.x*292/105).toFixed(1)}" cy="${(5+s.y*180/68).toFixed(1)}" r="${(2+s.xg*4).toFixed(1)}" fill="${s.team?'#ffc473':'#83aaff'}" stroke="${s.outcome==='goal'?'white':'#22322f'}"><title>${esc(H.clubs[r.clubs[s.team]].short)} · ${Math.ceil(s.minute)}′ · ${s.xg.toFixed(2)} xG · ${esc(s.outcome)}</title></circle>`);
    return `<div class="ms-shotmap"><h3>Shot locations</h3><svg viewBox="0 0 300 190" role="img" aria-label="${r.shots.length} shots located on a football pitch"><g fill="none" stroke="#aabfa9" stroke-width=".7"><rect x="4" y="5" width="292" height="180"/><path d="M150 5v180M4 61h44v68H4M296 61h-44v68h44"/><circle cx="150" cy="95" r="23"/></g>${a.join('')}</svg></div>`;
  }
  function shootoutDetails(r){return `<div class="ms-shootout"><h3>Penalty shootout</h3><ol>${r.kicks.map(k=>`<li><span>${esc(H.clubs[r.clubs[k.team]].short)} · ${esc(k.player)}</span>${tag(k.scored?'Scored':'Missed',k.scored?'good':'bad')}</li>`).join('')}</ol></div>`;}
  function talkPlayers(c,phase){
    const r=phase==='half'?c.a.half:phase==='full'?c.s.results[c.a.id]:null;
    if(!r)return [...c.our.xi.map(s=>({...s.player,role:s.role,label:s.label,cond:c.a.submitted.fitness[s.player.id],active:true,job:s.job})),...c.our.bench.map((p,i)=>({...p,label:`S${i+1}`,cond:c.a.submitted.fitness[p.id],active:false}))];
    const active=r.lineup[c.side].map(s=>({...r.players[c.side].find(p=>p.id===s.id),role:s.role,label:s.label,active:true}));
    return [...active,...r.players[c.side].filter(p=>!p.active).map(p=>({...p,label:p.red?'RC':'OFF'})),...r.benches[c.side].map((p,i)=>({...p,label:`S${i+1}`,active:false}))];
  }
  function room(c,phase){
    const ledger=c.a.talks[phase]||[], last=ledger.at(-1), info=c.ui.talk||{}, audience=info.audience||'Room', gesture=info.gesture||'No gesture', ps=talkPlayers(c,phase), current=info.id||ps[0].id;
    const locked=ledger.some(t=>t.audience===audience&&(audience!=='Individuals'||t.id===current));
    const r=phase==='half'?c.a.half:phase==='full'?c.s.results[c.a.id]:null;
    const moods=Object.assign({},...ledger.map(t=>t.reactions));
    const tile=p=>{
      const reaction=moods[p.id], mood=reaction?.mood||(Number.isInteger(p.injury)&&p.injury>0?'Took a knock':p.red?'Sent off':'Composed');
      return `<div class="ms-room-player" data-mood="${esc(mood)}"><span class="ms-room-pos">${esc(p.label)}</span>${shirt(p,H.homeId)}<div><strong>${esc(p.name)}</strong><small>${esc(p.job?.[1]||p.position||M.roleNames[p.role||p.pos]?.[1]||(p.active?'On the pitch':'Bench'))}</small></div>${r&&p.rating!=null?rank(p.rating):''}<div class="ms-mood"><i></i>${esc(mood)}</div></div>`;
    };
    const active=ps.filter(p=>p.active).slice().reverse(), bench=ps.filter(p=>!p.active), top=active.slice(0,4), left=active.slice(4);
    const msg=last?`<div class="ms-utterance" role="status"><span>To ${esc(last.audience==='Individuals'?ps.find(p=>p.id===last.id)?.name||'player':last.audience.toLowerCase())}</span><b>${esc(last.text)}</b></div>`:'';
    const talks=`<section class="ms-panel ms-talk-box"><span class="cc-eyebrow">${phase==='pre'?'Pre-match':phase==='half'?'Half-time':'Full-time'} team talk</span><h2>${phase==='pre'?'Address the players':phase==='half'?'Set the tone for the second half':'Final word in the dressing room'}</h2>${msg}
    <div class="ms-audience"><b>Talk to</b>${Q.audiences.map(x=>cmd(x,'audience',x,{pressed:audience===x})).join('')}</div>
    ${audience==='Individuals'?ctl('talk-player','Choose a player',ps.map(p=>[p.id,p.name]),current):''}<div class="ms-gestures"><b>Gesture</b>${Q.gestures.map(x=>cmd(x,'gesture',x,{pressed:gesture===x})).join('')}</div>
    <div class="ms-talk-statements"><h3>${locked?'Talk delivered to this audience':'Choose a statement'}</h3>${locked?'<p>Players’ reactions are shown around the room. You can still speak to another group or an individual.</p>':Q.choices[phase].map(([key,text])=>cmd(text,'statement',key)).join('')}</div><footer><span>${esc(H.manager)} · Manager</span>${!ledger.some(t=>t.audience==='Room')?cmd('Hand over to Elliot Marsh','assistant','',{icon:'team'}):tag('Team talk delivered','good')}</footer></section>`;
    return scene('dressing',`<div class="ms-dressing-room"><div class="ms-room-top">${top.map(tile).join('')}</div><div class="ms-room-side">${left.map(tile).join('')}</div>${talks}<div class="ms-room-side ms-room-bench">${bench.map(tile).join('')}</div></div>`,'ms-room-scene ms-dressing-scene');
  }
  global.TLMatchReview={report,room,talkPlayers,stats,events,xgChart};
})(window);
