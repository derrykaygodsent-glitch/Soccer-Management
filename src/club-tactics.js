/* Preview tactics desk: all picks are ephemeral and never reach the match engine. */
(function (global) {
  'use strict';
  const {M,U,preview,player,shirt,condition,pitch,pitchLines,phaseSketch,stage}=global.TLMatchdayUI;
  const {C,esc,icon,tabs,btn,link,tag,stars,select,table,tr,rank,meter,empty}=U;
  const phases=[
    ['possession','In Possession','ball',['passing','tempo','build']],
    ['transition','In Transition','swap',['lost','won','target','delivery']],
    ['defending','Out of Possession','shield',['block','line','press']]
  ];
  const choices={
    passing:['Shorter','Standard','More direct'],tempo:['Lower','Standard','Higher'],width:['Narrow','Standard','Fairly wide'],build:['Play out of defence','Run at defence','Pass into space'],
    lost:['Counter-press','Regroup'],won:['Counter','Hold shape'],gk:['Distribute quickly','Slow pace down'],target:['Over opposition','Target forward','Flanks','Playmaker','Full-backs','Centre-backs'],delivery:['Roll it out','Throw it long','Take short kicks','Take long kicks'],
    line:['Deeper','Standard','Higher'],press:['Less often','Standard','More often','Much more often'],block:['Low block','Mid block','High press'],duels:['Stay on feet','Get stuck in']
  };
  const labels={passing:'Passing directness',tempo:'Tempo',width:'Attacking width',build:'Build-up play',lost:'When possession is lost',won:'When possession is won',gk:'Goalkeeper in possession',target:'Distribute to area / player',delivery:'Distribution type',line:'Defensive line',press:'Trigger press',block:'Line of engagement',duels:'Tackling'};
  const presetIndex=c=>Number(c.ui.tacticPreset)||0;
  const settings=c=>({...M.presets[presetIndex(c)],...c.ui.tacticSettings});
  const squadViews=tabs(['all','All players'],['xi','Starting XI'],['bench','Substitutes'],['out','Unavailable']);
  function tacticsRail(c,s,mini=false) {
    return `<aside class="md-tactics-rail"><div class="md-tactical-style"><p class="cc-eyebrow">Tactical Style</p><strong>${s.name}</strong></div>${select('tacticMentality','Mentality',['Cautious','Balanced','Positive','Attacking','All-Out Attack'],s.mentality,{show:true})}<div class="md-phase-list">${phases.map(([id,label,glyph,keys])=>`<button class="md-phase-link" type="button" data-c-go="tactics" data-c-tab="${id}"${c.r.tab===id?' aria-current="page"':''}><span>${icon(glyph)}${label}</span>${mini?'':`<small>${keys.map(key=>esc(s[key])).join('<br>')}</small>`}<b>${c.r.tab===id?'Selected':'Change'} ${icon('chevron')}</b></button>`).join('')}</div><div class="md-rail-foot"><span class="cc-eyebrow">Team Fluidity</span><b>Flexible</b></div></aside>`;
  }
  function controls(c,s){
    const expanded=c.ui.tacticLayout!=='compact';
    return `<div class="md-tactics-controls"><div class="md-preset-group" aria-label="Tactical presets">${M.presets.map((p,i)=>btn(i+1,'tactic-preset',i,{pressed:presetIndex(c)===i,label:`Preset ${i+1}: ${p.name}`})).join('')}<strong>${s.name}</strong></div><div class="md-tactics-meter"><span>Familiarity</span>${meter(s.familiarity,'Sample familiarity','good')}</div><div class="md-tactics-meter md-intensity"><span>Intensity</span>${meter(s.intensity,'Sample intensity')}</div>${c.r.tab==='overview'?btn(expanded?'Compact view':'Expand tactics','tactic-layout',expanded?'compact':'expanded',{icon:expanded?'i-bars':'i-pitch'}):link('tactics','Formation','overview',null,'solid')}</div>`;
  }
  const dutyClass=duty=>duty==='Attack'?'attack':duty==='Defend'?'defend':'support';
  function roster(c,sheet){
    const filter=c.ui.tacticFilter||'all';
    const {xi,bench,out}=sheet;
    const rows=[...xi.map(slot=>[slot.player,slot.label,'xi',slot.role]),...bench.map((p,i)=>[p,`S${i+1}`,'bench',p.pos]),...out.map(p=>[p,'–','out',p.pos])].filter(([, ,group])=>filter==='all'||filter===group);
    const body=rows.map(([p,slot,group,r])=>{
      const [role,desc,duty]=M.roleNames[r], isOut=group==='out';
      const con=isOut?36:p.injury?.risk==='High'?81:p.injury?.risk==='Elevated'?84:91+(p.num%8);
      return tr([`<b class="md-slot">${slot}</b>`,`<span class="md-duty md-duty-${dutyClass(duty)}" title="${desc} · ${duty}"><b>${role}</b><small>${duty}</small></span>`,
        `<span class="md-person-shirt">${shirt(p,M.home.id)}${player(p.id)}</span>`,stars(p.ability),p.goals,condition(con),isOut?tag('Out','bad'):p.injury?.risk==='High'?tag('Load','warn'):'<span aria-label="Available" class="cc-dot cc-good"></span>',rank(p.rating)],isOut?'md-unavailable':group==='bench'?'md-reserve':'');
    });
    return `<section class="md-roster"><div class="md-roster-tools"><div><h2 class="cc-title">Selection</h2><p>${xi.length} starters · ${bench.length} substitutes</p></div>${select('tacticFilter','Squad filter',squadViews,filter)}${btn('Selection advice','tactic-advice','',{icon:'team'})}</div>
      ${body.length?table('Tactical selection',['Pos','Role / Duty','Player','Role ability','Gls','Con','Info','Av Rat'],body,'tactic-roster','md-roster-table'):empty('No players in this group.')}
      <div class="md-roster-foot">${link('squad','Senior squad','overview')}<span class="cc-muted">Average ratings from the starter season</span></div></section>`;
  }
  function overview(c,s){
    const sheet=M.sheet(s.form), expanded=c.ui.tacticLayout!=='compact';
    const form=select('tacticForm','Formation',M.formationOptions,s.form,{show:true});
    return `<div class="md-tactics-grid" data-layout="${expanded?'expanded':'compact'}"><section class="md-tactics-board">${controls(c,s)}<div class="md-board-inner">${tacticsRail(c,s,!expanded)}<div class="md-formation"><div class="md-form-title">${icon('i-pitch')}${form}<span>First team</span></div>${pitch(c,sheet.xi,{mode:expanded?'roles':'numbers',clickable:expanded,label:`${s.form} preview formation`})}<div class="md-pitch-cap"><span><i></i> Attacking direction ↑</span><span>XI · Preview</span></div></div></div></section>${roster(c,sheet)}</div>`;
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
    const assignments=[['Captain',C.leaders.captain],['Vice-captain',C.leaders.vice],['Penalties',C.leaders.forward],['Direct free kicks',C.leaders.forward],['Left corners',C.leaders.winger],['Right corners','rvr_10'],['Long throws','rvr_7']];
    return `<div class="md-set-pieces">${U.card('Set-piece assignments',table('Sample responsibilities',['Responsibility','Player'],assignments.map(([label,id],i)=>tr([esc(label),select('mdDuty'+i,label,C.roster.filter(p=>p.pos!=='GK'&&p.injury?.status!=='Out').map(p=>[p.id,p.name]),c.ui['mdDuty'+i]||id)])),'md-pieces')+`<p class="cc-muted">These assignments are for layout review only.</p>`)}<section class="md-tactics-board md-set-sketch"><h2>Attacking corners</h2>${phaseSketch('run')}<p>Near-post runner · Far-post target · Two stay back</p></section></div>`;
  }
  U.views.tactics={title:'Tactics',tabs:tabs(['overview','Overview'],...phases.map(([id,label])=>[id,label]),['pieces','Set Pieces']),
    render(c){const s=settings(c);return `${preview('Tactics preview','Sample selection · No changes are sent to the playable match.',stage('briefing','Matchday briefing'))}${c.r.tab==='overview'?overview(c,s):c.r.tab==='pieces'?pieces(c):phaseView(c,s)}`;},
    field(c,key,value){const storeKey=({tacticForm:'form',tacticMentality:'mentality'})[key]; if(storeKey){c.ui.tacticSettings={...c.ui.tacticSettings,[storeKey]:value};c.render();return true;}return false;},
    action(c,cmd,value){
      if(cmd==='tactic-preset'&&M.presets[+value]){c.ui.tacticPreset=+value;c.ui.tacticSettings={};c.render();}
      else if(cmd==='tactic-layout'){c.ui.tacticLayout=value;c.render();}
      else if(cmd==='tactic-choice'){
        const [key,label]=value.split(':');if(!choices[key]?.includes(label))return;
        c.ui.tacticSettings={...c.ui.tacticSettings,[key]:label};c.render();
      }else if(cmd==='tactic-advice')return c.show('Selection advice · Preview',`<p>${esc(C.namedStaff['Assistant Manager'])} recommends retaining a familiar ${esc(settings(c).form)} for the cup tie, with cover on both flanks.</p><p>${esc(C.players.rvr_11.name)} is unavailable in the starter snapshot. ${esc(C.players.rvr_12.name)} and ${esc(C.players.rvr_14.name)} are managing workload.</p><div class="cc-actions">${link('medical','Injury update')}${stage('briefing','View briefing')}</div>`);
    }
  };
})(window);
