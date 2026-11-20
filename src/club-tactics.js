/* Persistent first-team tactics, shared with the fixture selection room. */
(function (global) {
  'use strict';
  const {M,U,workspaceBanner,player,shirt,condition,pitch,pitchLines,phaseSketch}=global.TLMatchdayUI;
  const {C,esc,icon,tabs,btn,link,tag,stars,select,table,tr,rank,meter,empty}=U;
  const S=global.TLSeasonState;
  const phases=[
    ['possession','In Possession','ball',['passing','tempo','build']],
    ['transition','In Transition','swap',['lost','won','target','delivery']],
    ['defending','Out of Possession','shield',['block','line','press']]
  ];
  const choices=M.choices;
  const labels={passing:'Passing directness',tempo:'Tempo',width:'Attacking width',build:'Build-up play',lost:'When possession is lost',won:'When possession is won',gk:'Goalkeeper in possession',target:'Distribute to area / player',delivery:'Distribution type',line:'Defensive line',press:'Trigger press',block:'Line of engagement',duels:'Tackling'};
  const presetIndex=c=>c.season.value.plan.tactics.preset;
  const settings=c=>c.season.value.plan.tactics;
  const squadViews=tabs(['all','All players'],['xi','Starting XI'],['bench','Substitutes'],['out','Unavailable']);
  function tacticsRail(c,s,mini=false) {
    return `<aside class="md-tactics-rail"><div class="md-tactical-style"><p class="cc-eyebrow">Tactical Style</p><strong>${s.name}</strong></div>${select('tacticMentality','Mentality',M.choices.mentality,s.mentality,{show:true})}<div class="md-phase-list">${phases.map(([id,label,glyph,keys])=>`<button class="md-phase-link" type="button" data-c-go="tactics" data-c-tab="${id}"${c.r.tab===id?' aria-current="page"':''}><span>${icon(glyph)}${label}</span>${mini?'':`<small>${keys.map(key=>esc(s[key])).join('<br>')}</small>`}<b>${c.r.tab===id?'Selected':'Change'} ${icon('chevron')}</b></button>`).join('')}</div><div class="md-rail-foot"><span class="cc-eyebrow">Team Fluidity</span><b>Flexible</b></div></aside>`;
  }
  function controls(c,s){
    const expanded=c.ui.tacticLayout!=='compact';
    return `<div class="md-tactics-controls"><div class="md-preset-group" aria-label="Tactical presets">${M.presets.map((p,i)=>btn(i+1,'tactic-preset',i,{pressed:presetIndex(c)===i,label:`Preset ${i+1}: ${p.name}`})).join('')}<strong>${s.name}</strong></div><div class="md-tactics-meter md-intensity"><span>Intensity</span>${meter(32+(M.choices.tempo.indexOf(s.tempo)+M.choices.press.indexOf(s.press))*12,'Instruction intensity')}</div>${c.r.tab==='overview'?btn(expanded?'Compact view':'Expand tactics','tactic-layout',expanded?'compact':'expanded',{icon:expanded?'i-bars':'i-pitch'}):link('tactics','Formation','overview',null,'solid')}</div>`;
  }
  const dutyClass=duty=>duty==='Attack'?'attack':duty==='Defend'?'defend':'support';
  function roster(c,sheet){
    const state=c.season.value, stats=S.playerStats(state);
    const filter=c.ui.tacticFilter||'all';
    const {xi,bench,out}=sheet;
    const rows=[...xi.map(slot=>[slot.player,slot.label,'xi',slot.role]),...bench.map((p,i)=>[p,`S${i+1}`,'bench',p.pos]),...out.map(p=>[p,'–','out',p.pos])].filter(([, ,group])=>filter==='all'||filter===group);
    const body=rows.map(([p,slot,group,r])=>{
      const [role,desc,duty]=xi.find(x=>x.player.id===p.id)?.job||M.roleNames[r], isOut=group==='out';
      const {today,risk}=S.availability(state,p.id), current=stats[p.id];
      return tr([`<b class="md-slot">${slot}</b>`,`<span class="md-duty md-duty-${dutyClass(duty)}" title="${desc} · ${duty}"><b>${role}</b><small>${duty}</small></span>`,
        `<span class="md-person-shirt">${shirt(p,M.home.id)}${player(p.id)}</span>`,stars(p.ability),current.goals,condition(today),isOut?tag('Out','bad'):risk!=='Low'?tag('Load','warn'):'<span aria-label="Available" class="cc-dot cc-good"></span>',rank(current.rating)],isOut?'md-unavailable':group==='bench'?'md-reserve':'');
    });
    return `<section class="md-roster"><div class="md-roster-tools"><div><h2 class="cc-title">Selection</h2><p>${xi.length} starters · ${bench.length} substitutes</p></div>${select('tacticFilter','Squad filter',squadViews,filter)}${btn('Selection advice','tactic-advice','',{icon:'team'})}</div>
      ${body.length?table('Tactical selection',['Pos','Role / Duty','Player','Role ability','Gls','Con','Info','Av Rat'],body,'tactic-roster','md-roster-table'):empty('No players in this group.')}
      <div class="md-roster-foot">${link('squad','Senior squad','overview')}<span class="cc-muted">Competitive appearances and ratings</span></div></section>`;
  }
  function overview(c,s){
    const store=c.season.value, sheet=M.sheet(store.plan,store.now,store.injuries), expanded=c.ui.tacticLayout!=='compact';
    const form=select('tacticForm','Formation',M.formationOptions,s.form,{show:true});
    return `<div class="md-tactics-grid" data-layout="${expanded?'expanded':'compact'}"><section class="md-tactics-board">${controls(c,s)}<div class="md-board-inner">${tacticsRail(c,s,!expanded)}<div class="md-formation"><div class="md-form-title">${icon('i-pitch')}${form}<span>First team</span></div>${pitch(c,sheet.xi,{mode:expanded?'roles':'numbers',clickable:expanded,label:`${s.form} starting formation`})}<div class="md-pitch-cap"><span><i></i> Attacking direction </span><span>XI · Club plan</span></div></div></div></section>${roster(c,sheet)}</div>`;
  }
  const chosen=(s,key,label)=>btn(label,'tactic-choice',`${key}:${label}`,{pressed:s[key]===label,kind:'solid'});
  const choiceField=(s,key,extra='')=>`<div class="md-choice ${extra}"><h3>${labels[key]}</h3><div>${choices[key].map(v=>chosen(s,key,v)).join('')}</div></div>`;
  const sketchCard=(s,key,variant,copy)=>`<section class="md-instruction-panel">${choiceField(s,key)}${phaseSketch(variant)}<p>${esc(copy)}</p></section>`;
  function transition(s) {
    const targets=[['Over opposition','Over opposition'],['Flanks','Flank'],['Target forward','Target forward'],['Flanks','Flank'],['Playmaker','Playmaker'],['Full-backs','Full-backs'],['Centre-backs','Centre-backs'],['Full-backs','Full-backs']];
    return `<div class="md-instruction-grid">
      ${sketchCard(s,'lost',s.lost==='Counter-press'?'press':'deep',s.lost==='Counter-press'?'The nearest players close down the ball as soon as possession is lost.':'The team drops back into its defensive structure.')}
      ${sketchCard(s,'won',s.won==='Counter'?'run':'',s.won==='Counter'?'Forward runners attack space as soon as the ball is recovered.':'The team keeps its shape and looks for a safe first pass.')}
      <section class="md-instruction-panel md-keeper-instructions">${choiceField(s,'gk')}<h3>${labels.target}</h3><div class="md-target-map">${pitchLines()}<div>${targets.map(([item,name],i)=>`<button type="button" data-c-do="tactic-choice" data-c-val="target:${item}" data-c-key="target-${i}" aria-pressed="${s.target===item}" title="Distribute to ${name.toLowerCase()}">${esc(name)}</button>`).join('')}</div></div>${choiceField(s,'delivery')}</section></div>`;
  }
  function standardPhase(s,attack){
    return `<div class="md-instruction-grid">${attack?
      `${sketchCard(s,'passing','build','Choose how quickly the ball moves through the lines.')}${sketchCard(s,'width',s.width==='Narrow'?'':'run','Choose how much of the pitch the team uses in attack.')}<section class="md-instruction-panel">${choiceField(s,'tempo')}${choiceField(s,'build')}${phaseSketch('build')}</section>`:
      `${sketchCard(s,'line',s.line==='Deeper'?'deep':'press','Set the initial depth of your defenders.')}${sketchCard(s,'block',s.block==='High press'?'press':'deep','Choose where your front line engages the opposition.')}<section class="md-instruction-panel">${choiceField(s,'press')}${choiceField(s,'duels')}${phaseSketch('press')}</section>`}</div>`;
  }
  function phaseView(c,s) {
    return `<section class="md-tactics-board md-full-board">${controls(c,s)}<div class="md-instructions">${tacticsRail(c,s)}<div class="md-instructions-body"><div class="md-instructions-head"><h2>${phases.find(([id])=>id===c.r.tab)[1]}</h2><span><i></i> Selected instruction</span></div>${c.r.tab==='transition'?transition(s):standardPhase(s,c.r.tab==='possession')}</div></div></section>`;
  }
  function pieces(c){
    const s=c.season.value, p=s.plan, available=M.avail(s.now,s.injuries);
    return `<div class="md-set-pieces">${U.card('Set-piece assignments',table('Takers and captains',['Responsibility','Player'],M.takers.map(([key,label,id],i)=>tr([esc(label),select('set:'+key,label,[...available.filter(q=>i<2||q.pos!=='GK').map(q=>[q.id,q.name]),...(!available.some(q=>q.id===p.set[key])?[[p.set[key],M.byPlayer(p.set[key]).name+' · Unavailable']]:[])],p.set[key])])),'md-pieces')+`<p class="cc-muted">If a named taker is not playing, an available player takes the restart.</p>`)}<section class="md-tactics-board md-set-sketch"><h2>Restart routines</h2>${select('corner','Corner routine',M.choices.corner,p.tactics.corner,{show:true})}${select('free','Free-kick routine',M.choices.free,p.tactics.free,{show:true})}${phaseSketch('run')}</section></div>`;
  }
  U.views.tactics={title:'Tactics',tabs:tabs(['overview','Overview'],...phases.map(([id,label])=>[id,label]),['pieces','Set Pieces']),
    render(c){const s=settings(c);return `${workspaceBanner('Saved club tactics','Used as the starting point for your next team selection.',link('schedule','Fixture schedule','fixtures'))}${c.r.tab==='overview'?overview(c,s):c.r.tab==='pieces'?pieces(c):phaseView(c,s)}`;},
    field(c,key,value){const storeKey=({tacticForm:'form',tacticMentality:'mentality'})[key]||key;
      if(['tacticFilter'].includes(key))return false;
      if(c.season.edit(storeKey,value)){c.render();return true;}return false;},
    action(c,cmd,value){
      if(cmd==='tactic-preset'&&M.presets[+value]){c.season.edit('preset',value);c.render();}
      else if(cmd==='tactic-layout'){c.ui.tacticLayout=value;c.render();}
      else if(cmd==='tactic-choice'){
        const [key,label]=value.split(':');if(!choices[key]?.includes(label))return;
        c.season.edit(key,label);c.render();
      }else if(cmd==='tactic-advice')return c.show('Selection advice',`<p>${esc(C.namedStaff['Assistant Manager'])} recommends reviewing the balance of defending and attacking roles in the current ${esc(settings(c).form)}.</p><p>Check player workload, and use Team Selection on the fixture date to choose the exact XI and bench.</p><div class="cc-actions">${link('medical','Injury update')}${link('training','Training schedule','week')}</div>`);
    }
  };
})(window);
