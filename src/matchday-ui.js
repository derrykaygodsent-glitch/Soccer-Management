/* Shared view primitives for the review-only matchday and tactics screens. */
(function (global) {
  'use strict';
  const U=global.TLClubUI, M=global.TLMatchdayData;
  const {H,C,esc,icon,tag,btn,link,rank,art,stamp}=U;
  const stage=(tab,label,id='',kind='outline',arrow=true)=>link('matchday',label,tab,id,kind,arrow);
  const player=(id,label=C.players[id]?.name)=>btn(label,'player',id,{kind:'text',label:C.players[id]?.name});
  const preview=(title='Screen preview',text='Sample data · Changes do not affect the playable match or club save.',extra='')=>`<div class="md-preview"><div><span class="md-preview-badge"><i></i>${esc(title)}</span><span class="md-preview-note">${esc(text)}</span></div>${extra}</div>`;
  const short=p=>`${p.name[0]}. ${p.name.split(' ').at(-1)}`;
  const shirt=(p,club)=>`<span class="md-shirt${p.pos==='GK'?' md-keeper':club===M.away.id?' md-away-kit':''}" aria-hidden="true">${icon('i-shirt')}<b>${p.num}</b></span>`;
  const heart = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 17 2.5 9.8C-1.5 4.5 5.7.4 10 5c4.3-4.6 11.5-.5 7.5 4.8Z"/><path d="M4 9h3l1-2 2 5 1.6-3H16" fill="none" stroke="#1d3329" stroke-width=".85"/></svg>';
  const condition=pct=>`<span class="md-condition cc-${pct>=85?'good':pct>=65?'warn':'bad'}" aria-label="Condition ${pct}%">${heart}<span>${pct}%</span></span>`;
  const pitchLines=(extra='')=>`<svg class="md-pitch-lines" viewBox="0 0 300 400" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.4" opacity=".7" vector-effect="non-scaling-stroke"><rect x="6" y="7" width="288" height="386"/><path d="M6 200h288M76 7v60h148V7M76 393v-60h148v60M118 7v24h64V7M118 393v-24h64v24M121 67a37 37 0 0 0 58 0M121 333a37 37 0 0 1 58 0M138 7V2h24v5M138 393v5h24v-5"/><ellipse cx="150" cy="200" rx="34" ry="33"/></g><g fill="currentColor" opacity=".8"><circle cx="150" cy="200" r="2"/><circle cx="150" cy="50" r="2"/><circle cx="150" cy="350" r="2"/></g>${extra}</svg>`;
  function pitch(c,slots,{club=M.home.id,mode='roles',extra='',ratings={},clickable=false,knock='',label='Starting shape'}={}) {
    return `<div class="md-pitch md-pitch-${mode}${extra?' '+extra:''}" role="${clickable?'group':'img'}" aria-label="${esc(label)}${!clickable?`: ${esc(slots.map(s=>`${s.label} ${s.player.name}`).join(', '))}`:''}">${pitchLines()}
      ${slots.map(s=>{
        const p=s.player,zx=12+s.y*76,zy=86.7-(Math.max(0,s.x-.035)*98),injured=p.id===knock;
        const marker=`${shirt(p,club)}${mode==='roles'?`<span class="md-role-mark" title="${M.roleNames[s.role][1]}">${M.roleNames[s.role][0]} · ${M.roleNames[s.role][2][0]}</span>`:''}${mode==='numbers'?'':`<strong class="md-pitch-name">${esc(short(p))}</strong>`}${mode==='ratings'&&ratings[p.id]!=null?rank(ratings[p.id]):''}${injured?'<i class="md-injury-mark" title="Injury">+</i>':''}`;
        const attrs=`class="md-marker${injured?' md-marker-injured':''}" style="--mx:${zx}%;--my:${zy}%"`;
        return clickable&&C.players[p.id]?`<button type="button" ${attrs} data-c-do="player" data-c-val="${p.id}" aria-label="Open ${esc(p.name)}, ${s.label}">${marker}</button>`:`<span ${attrs}>${marker}</span>`;
      }).join('')}</div>`;
  }
  function phaseSketch(variant='') {
    const motion=({press:'M54 151l-16-24m0 0 2 10m-2-10 11 2m98 14v-30m0 0-8 9m8-9 8 9m99 29 16-24m0 0-2 10m2-10-11 2M92 250l-13-22m0 0 1 10m-1-10 10 2m128 22 13-22m0 0-1 10m1-10-10 2',deep:'M54 152l16 27m77-34v41m106-34-16 27m-145 62v25m127-25v25',run:'M57 148V92m0 0-7 11m7-11 7 11m83 36V70m0 0-7 11m7-11 7 11m98 66V92m0 0-7 11m7-11 7 11',build:'M147 350 99 290 147 225 222 158'})[variant];
    const shift=variant==='deep'?21:variant==='run'?-18:0;
    const markers=[[51,151],[147,136],[251,151],[80,216],[147,232],[220,216],[52,293],[111,302],[191,302],[249,293],[147,364]];
    return `<div class="md-phase-sketch" aria-hidden="true">${pitchLines(`${motion?`<path d="${motion}" fill="none" stroke="#82fac0" stroke-width="5" stroke-linecap="round" stroke-dasharray="${variant==='build'?'7 5':'none'}" opacity=".88"/>`:''}${markers.map(([x,y],i)=>`<circle cx="${x}" cy="${i<6?y+shift:y}" r="8" fill="${i===10?'#ffd276':'#5777d8'}" stroke="#e8f5fc" stroke-width="2.1"/>`).join('')}`)}</div>`;
  }
  const dayName=date=>new Intl.DateTimeFormat('en-GB',{weekday:'long',timeZone:'UTC'}).format(date);
  const longDate=date=>new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'}).format(date);
  const section=(title,meta='',actions='')=>`<div class="md-section"><div><h2>${esc(title)}</h2>${meta?`<p>${esc(meta)}</p>`:''}</div>${actions?`<div class="md-section-actions">${actions}</div>`:''}</div>`;
  function scoreStrip(c,label,score=null,extra=''){
    return `<div class="md-score-strip" aria-label="${esc(`${label}, ${M.matchTitle}${score?', '+score.join(' to '):''}`)}"><span class="md-score-stage">${icon('cup')}<b>${esc(label)}</b></span><div class="md-score-club md-score-home">${c.crest(M.home.id)}<b>${esc(M.home.name)}</b><abbr title="${esc(M.home.name)}">${M.home.short}</abbr></div><strong class="md-score-number">${score?score.join(' – '):'v'}</strong><div class="md-score-club md-score-away">${c.crest(M.away.id)}<b>${esc(M.away.name)}</b><abbr title="${esc(M.away.name)}">${M.away.short}</abbr></div>${extra?`<span class="md-score-extra">${esc(extra)}</span>`:''}</div>`;
  }
  const scene=(kind,inside,extra='')=>`<div class="md-scene ${extra}">${art(kind)}<div class="md-scene-body">${inside}</div></div>`;
  const sessionClass=label=>label==='Rest'?'rest':label==='Recovery'?'recover':label==='Travel'?'rest':/preview|review|briefing/i.test(label)?'media':'work';
  const sessionIcon=label=>label==='Rest'?'':label==='Travel'?'swap':label==='Recovery'?'medical':/preview|review|briefing/i.test(label)?'mail':'cone';
  function teamSwitch(c,namespace,active){
    return `<div class="md-segments" aria-label="Select team">${[M.home,M.away].map(team=>btn(team.name,namespace,team.id,{pressed:team.id===active})).join('')}</div>`;
  }
  const matchMeta=`${H.fixtureCompetition(M.fixture)} · ${M.home.stadium} · ${stamp(M.fixture.date)}`;
  global.TLMatchdayUI={M,U,stage,player,preview,short,shirt,condition,pitch,pitchLines,phaseSketch,dayName,longDate,section,scoreStrip,scene,sessionClass,sessionIcon,teamSwitch,matchMeta};
})(window);
