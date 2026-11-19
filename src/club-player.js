/* Full-page first-team player dossier. Engine ratings shown on their existing 1–20 scale. */
(function (global) {
  'use strict';
  const {U,workspaceBanner,pitchLines,condition}=global.TLMatchdayUI;
  const S=global.TLSeasonState;
  const {H,C,esc,icon,avatar,tabs,tag,select,card,values,stars,nation,rank,table,tr,link}=U;
  const groups=[['Technical',[['Dribbling','dribbling'],['Finishing','shooting'],['Free kick taking','freeKicks'],['Long throws','throwing'],['Passing','passing'],['Penalty taking','penalties'],['Tackling','tackling']]],['Mental',[['Aggression','aggression'],['Composure','composure'],['Positioning','positioning'],['Work rate','workRate']]],['Physical',[['Pace','pace'],['Stamina','stamina'],['Throwing power','throwPower']]],['Goalkeeping',[['Handling','handling'],['Reflexes','reflexes']]]];
  const roleAttributes={GK:['handling','reflexes','positioning'],DC:['tackling','positioning','composure'],FB:['pace','workRate','tackling'],DM:['positioning','tackling','passing'],CM:['passing','workRate','composure'],AM:['passing','dribbling','composure'],W:['pace','dribbling','passing'],ST:['shooting','composure','pace']};
  const roles={GK:['Goalkeeper','Sweeper Keeper'],DC:['Central Defender','Ball-Playing Defender'],FB:['Full-Back','Wing-Back','Inverted Full-Back'],DM:['Ball-Winning Midfielder','Anchor','Defensive Midfielder'],CM:['Deep-Lying Playmaker','Central Midfielder','Box-to-Box Midfielder'],AM:['Advanced Playmaker','Attacking Midfielder','Shadow Striker'],W:['Inverted Winger','Winger','Inside Forward'],ST:['Advanced Forward','Pressing Forward','Poacher','Deep-Lying Forward']};
  const rolePositions={GK:[[[12,50]],[]],DC:[[[27,50]],[[32,35],[32,65]]],FB:[[[28,20],[28,80]],[[45,20],[45,80]]],DM:[[[39,50]],[[30,50],[51,50]]],CM:[[[51,50]],[[39,50],[65,50]]],AM:[[[66,50]],[[54,50],[78,50]]],W:[[[72,22],[72,78]],[[52,22],[52,78]]],ST:[[[83,50]],[[66,50],[75,22],[75,78]]]};
  const profile=c=>{const s=c.season.value,id=Object.hasOwn(C.players,c.r.id)?c.r.id:C.leaders.forward;return {...S.playerStats(s)[id],num:s.plan.numbers[id]};};
  function positionMap(p) {
    const [main,alt]=rolePositions[p.pos];
    return `<div class="md-position-map" role="img" aria-label="Natural position ${esc(p.position)} with nearby secondary positions"><div>${pitchLines()}</div>${[...alt.map(([x,y])=>[x,y,'other']),...main.map(([x,y])=>[x,y,'main'])].map(([x,y,kind])=>`<i class="md-pos-${kind}" style="left:${x}%;top:${y}%"></i>`).join('')}</div>`;
  }
  function profileHero(c,p){
    const grade=p.playing==='Important Player'?'Important player for Riverside':p.age<=22?'Promising first-team option':'Established first-team player';
    return `<section class="md-profile-hero" aria-label="Player overview"><div class="md-profile-ident">${avatar(c,p.name,p.id,'cc-avatar-xl')}<div><span class="cc-eyebrow">First team · No. ${p.num}</span><h2>${esc(p.name)}</h2><p>${nation(p.nation)} <span>${esc(C.nation[p.nation])} · ${p.age} years old</span></p><strong>${esc(p.position)}</strong></div></div><div class="md-player-contract">${c.crest(H.homeId)}<div><p class="cc-eyebrow">Contracted to Riverside FC</p><strong>${H.millions(p.value)}</strong><small>Estimated transfer value</small><p>${esc(p.playing)}</p></div></div><div class="md-coach-summary"><span class="md-mini-icon">${icon('search')}</span><div><p class="cc-eyebrow">Coach summary</p>${stars(p.ability)} <b>${esc(grade)}</b><p class="cc-eyebrow">Potential ability</p>${stars(p.potential)}</div></div></section>`;
  }
  function core(c,p){
    const ready=S.availability(c.season.value,p.id);
    const selected=c.ui.attrFocus||'role';
    const attrs=groups.map(([label,items])=>`<div class="md-attribute-group"><h3>${label}</h3><dl>${items.map(([name,key])=>{
      const v=p.attrs[key], highlight=selected==='role'&&roleAttributes[p.pos].includes(key)||selected==='best'&&v>=16;
      return `<div${highlight?' class="md-attribute-key"':''}><dt>${name}</dt><dd class="${v>=16?'cc-good':v>=13?'cc-info':v<=8?'cc-muted':'md-attr-neutral'}">${v}</dd></div>`;
    }).join('')}</dl></div>`).join('');
    return `<div class="md-profile-core"><section class="md-role-panel"><h3 class="cc-title">Positions</h3>${positionMap(p)}<p>${esc(p.position)} <small>${esc(p.bestPos)}</small></p><h3>Role and duty</h3><div class="md-player-roles">${[p.role,...roles[p.pos].filter(r=>r!==p.role)].map((title,i)=>`<div${i===0?' class="md-role-primary"':''}>${stars(Math.max(1,p.ability-i*.5))}<b>${esc(title)}</b></div>`).join('')}</div></section><section class="md-attr-panel"><div class="md-attr-tools"><h3 class="cc-title">Player attributes <small>1–20</small></h3>${select('attrFocus','Highlight attributes',[['role','Highlight best role'],['best','Highlight 16+'],['none','No highlight']],selected)}</div><div class="md-attr-grid">${attrs}</div></section><aside class="md-player-aside"><h3 class="cc-title">Player information</h3>${values([['Nationality',C.nation[p.nation]],['Age',p.age],['Playing time',p.playing],['Best role',p.role],['Footedness','Not recorded']])}<h3 class="cc-title">Squad status</h3><p>${tag(ready.status,ready.out?'bad':ready.risk!=='Low'?'warn':'good')}</p>${link('squad','Senior squad','overview')}</aside></div>`;
  }
  function fitness(c,p){
    const s=c.season.value, {out,today,risk,issue,returnDate,status}=S.availability(s,p.id);
    return `<div class="md-profile-metrics">${card('Fitness',`<strong>${esc(out?issue:risk!=='Low'?'Workload monitored':'Match fit')}</strong><div class="md-profile-fitness">${condition(today)}${!out?tag(`${risk} risk`,risk==='High'?'warn':'good'):tag('Unavailable','bad')}</div>${out?`<p>Expected return: ${H.calendar(returnDate).date}</p>`:''}`,'md-mini-card')}${card('Dynamics',`<strong>${p.id===s.plan.set.captain?'Club captain':p.id===s.plan.set.vice?'Vice-captain':'First-team group'}</strong><p>Squad hierarchy</p>${link('dynamics','Dressing room','overview',null,'text',false)}`,'md-mini-card')}${card('Plans',`<strong>${p.age<=22?'First-team development':'First-team football'}</strong><p>Role: ${esc(p.role)}</p>${link('development','Development Centre','overview',null,'text',false)}`,'md-mini-card')}${card('Availability',`<strong>${status}</strong><p>${p.yellow} yellows · ${p.redCards} reds this season</p>${link('medical','Medical Centre','overview',null,'text',false)}`,'md-mini-card')}</div>`;
  }
  function formChart(p){
    const events=p.form.slice(-5);
    if(!events.length)return '<p class="cc-muted">No individual match ratings recorded yet.</p>';
    const ys=v=>74-Math.max(0,v)*6.1, xs=i=>events.length===1?140:24+232*i/(events.length-1);
    const graph=events.map((e,i)=>`${xs(i)},${ys(e.rating)}`).join(' ');
    return `<svg class="md-form-chart" viewBox="0 0 280 96" role="img" aria-label="Recorded recent ratings: ${events.map(e=>e.rating.toFixed(2)).join(', ')}"><g fill="none" stroke="#565f76" stroke-width=".7">${[0,5,10].map(v=>`<path d="M24 ${ys(v)}h232"/>`).join('')}</g><g font-size="9" fill="#b7c3d7">${[0,5,10].map(v=>`<text x="5" y="${ys(v)+4}">${v}</text>`).join('')}${events.map((e,i)=>`<text x="${xs(i)}" y="91" text-anchor="middle">${H.shortDate(e.date)}</text>`).join('')}</g><polyline points="${graph}" fill="none" stroke="#a9e8ec" stroke-width="2" stroke-linejoin="round"/>${events.map((e,i)=>`<circle cx="${xs(i)}" cy="${ys(e.rating)}" r="3.4" fill="#68d994"><title>${H.calendar(e.date).date} · ${e.rating.toFixed(2)}</title></circle>`).join('')}</svg>`;
  }
  function season(c,p){
    return `<div class="md-player-stat-cards">${card('Recent form',`${formChart(p)}<p class="cc-muted">Last five recorded match ratings</p>`,'md-form-card')}${card('Season stats',table('Season statistics',['Competition','Apps','Gls','Ast','Pass %','PoM','Avg Rat'],[tr(['All competitions',p.appearances,p.goals,p.assists,`${p.pass}%`,p.awards,rank(p.rating)])],'md-player-stats')+`<div class="md-season-ledger">${values([['Appearances',p.appearances],['Goals',p.goals],['Assists',p.assists],['Average rating',p.rating.toFixed(2)]])}</div><div class="cc-actions">${link('squad','Squad stats','stats')}</div>`,'md-season-card')}</div>`;
  }
  U.views.player={title:'Player Profile',nav:'squad',retainId:true,heading:c=>{const p=profile(c);return `${p.num}. ${p.name}`;},subtitle:c=>`${profile(c).position} · Riverside FC`,tabs:tabs(['overview','Overview'],['attributes','Attributes'],['form','Form & Stats']),
    render(c){const p=profile(c);return `<div class="md-profile" data-player="${p.id}">${workspaceBanner('Player dossier','First-team attributes, availability and recorded form.',link('squad','Squad'))}${profileHero(c,p)}${c.r.tab!=='form'?core(c,p):''}${c.r.tab==='overview'?fitness(c,p):''}${c.r.tab!=='attributes'?season(c,p):''}${c.r.tab==='attributes'?`<p class="md-context-note">Coloured rows highlight ${c.ui.attrFocus==='best'?'attributes rated 16 or higher':c.ui.attrFocus==='none'?'no attributes':'attributes for the player’s best role'}.</p>`:''}</div>`;}
  };
})(window);
