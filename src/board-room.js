(function(g){'use strict';let selected=null,selectedBench=null,context='',workspaceTab='shape';const B=()=>g.TLMatchBoard,e=x=>g.TLClubUI.esc(String(x??''));
// Match coordinates describe compact playing positions. Stretch the lines on the chalkboard
// without changing the underlying tactic, and invert the same projection for touch placement.
const depth=[[0,5],[.035,8],[.10,24],[.32,41],[.45,56],[.59,72],[.75,89],[1,95]];
function project(value,inverse=false){const a=inverse?1:0,b=1-a;let i=1;while(i<depth.length-1&&value>depth[i][a])i++;const l=depth[i-1],r=depth[i];return l[b]+(value-l[a])*(r[b]-l[b])/(r[a]-l[a]);}
function positionalNumbers(f){const used=new Set([1]),roles=g.TLData.FORMATIONS[f];return [1,...roles.map(({role,y})=>{const preferred=({FB:y<.5?[3]:[2],WB:y<.5?[3,11]:[2,7],DC:[5,4,6],DM:[6,4,8],CM:[8,6,10],AM:[10,8],W:y<.5?[11,7]:[7,11],ST:[9,10]})[role]||[];const n=[...preferred, ...Array.from({length:10},(_,i)=>i+2)].find(n=>!used.has(n));used.add(n);return n;})];}
const fieldLines=`<svg class="board-lines" viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width=".6"><rect x="1" y="1" width="98" height="138"/><path d="M1 70h98M20 1v21h60V1M37 1v8h26V1M20 139v-21h60v21M37 139v-8h26v8M39 22q11 9 22 0M39 118q11-9 22 0"/><circle cx="50" cy="70" r="11"/></g></svg>`;
function jersey(n){return `<svg class="tactic-shirt" viewBox="0 0 42 38" aria-hidden="true"><path d="m14 2-8 3-5 9 7 4 3-5-1 22q11 2 22 0l-1-22 3 5 7-4-5-9-8-3q-7 6-14 0Z" fill="currentColor" stroke="#d6e9ea" stroke-width="1.2"/><path d="m15 2 6 6 6-6" fill="none" stroke="#d6e9ea"/><text x="21" y="26" text-anchor="middle" fill="white" font-size="16" font-weight="800">${n}</text></svg>`;}
function render(s,players){
  const stars=g.TLDynamics.squadStars(players),lists=g.TLKit.current(s).filter(r=>r.day<=s.day),filed=lists.find(r=>r.title===s.kitScope),numbers=(filed||lists.find(r=>r.title===g.TLKit.league))?.numbers||{},defaults=positionalNumbers(s.tactic);
  if(filed)players=players.filter(p=>filed.numbers[p.id]);
  const key=[s.id,s.boardIndex,s.tactic,s.kitScope].join(':');if(context!==key){selected=null;selectedBench=null;workspaceTab='shape';context=key;}
  const {slots,bench}=B().sheet(s.tactic,B().active(s),players),W=g.TLManagerLife,Z=g.TLZones,D=g.TLData,plan=B().active(s),phase=s.boardPhase||'base',inst=Z.settings(plan),visualMode=phase;
  const options=(values,current)=>values.map(v=>`<option value="${e(v)}"${v===current?' selected':''}>${e(v)}</option>`).join('');
  const picker=(label,cmd,values,current)=>`<label>${label}<select data-plan="${cmd}">${options(values,current)}</select></label>`;
  const familiarity=g.TLTacticalAnalysis?.familiarity(slots,s.boardReps)||{position:0,role:0,coordination:0};
  const warnings=g.TLTacticalAnalysis?.evaluate(slots,plan,{reps:s.boardReps,readiness:g.TLDynamics.snapshot(s,players).players,familiarity:true})||[];
  const readiness=g.TLDynamics.snapshot(s,players).players,selectedZone=s.tacticZone||'middle-centre';
  const zoneCols=['left','centre','right'],zoneNames={defense:'Own third',middle:'Middle third',attack:'Final third'},zoneSide={left:'Left channel',centre:'Central area',right:'Right channel'};
  const zoneCells=['attack','middle','defense'].flatMap(row=>zoneCols.map(col=>({id:`${row}-${col}`,row,col,label:`${zoneNames[row]} · ${zoneSide[col]}`})));
  const intensity=Math.round(((inst.fine?.tempo??inst.tempo??1)+(inst.fine?.press??inst.press??1))/4*100);
  const status=p=>{if(!p)return '';const v=readiness[p.id];if(!v)return '';if(v.knock)return '<i class="fm-pip bad" title="Carrying a knock">Injured</i>';if(v.fitness<70)return '<i class="fm-pip warn" title="Low condition">Low</i>';if(v.sharp<70)return '<i class="fm-pip warn" title="Needs match sharpness">Sharpness</i>';return '<i class="fm-pip good" title="Ready">Ready</i>';};
  const starsOf=p=>{const n=p?(stars[p.id]||0):0;return `<span class="fm-stars" role="img" aria-label="Squad ability ${n} of 5"><span>${'★'.repeat(n)}</span><i>${'☆'.repeat(5-n)}</i></span>`;};
  const code=(role,job,duty)=>{const names={'Goalkeeper':'GK','Sweeper Keeper':'SK','Ball-Playing Goalkeeper':'BPG','Centre-Back':'CB','Ball-Playing Defender':'BPD','No-Nonsense Centre-Back':'NNCB','Libero':'Lib','Stopper':'Stop','Cover Defender':'Cov','Full-Back':'FB','Wing-Back':'WB','Complete Wing-Back':'CWB','Inverted Wing-Back':'IWB','Inverted Full-Back':'IFB','No-Nonsense Full-Back':'NNFB','Defensive Midfielder':'DM','Anchor':'A','Half-Back':'HB','Deep-Lying Playmaker':'DLP','Segundo Volante':'SV','Regista':'Reg','Ball-Winning Midfielder':'BWM','Central Midfielder':'CM','Box-to-Box Midfielder':'BBM','Mezzala':'Mez','Carrilero':'Car','Advanced Playmaker':'AP','Roaming Playmaker':'RPM','Attacking Midfielder':'AM','Shadow Striker':'SS','Trequartista':'Treq','Enganche':'Eng','Wide Midfielder':'WM','Wide Playmaker':'WP','Winger':'W','Defensive Winger':'DW','Inside Forward':'IF','Inverted Winger':'IW','Advanced Winger':'AW','Raumdeuter':'Rau','Wide Target Forward':'WTF','Striker':'ST','Advanced Forward':'AF','Complete Forward':'CF','Deep-Lying Forward':'DLF','Target Forward':'TF','Poacher':'P','Pressing Forward':'PF','False Nine':'F9','Defensive Forward':'DF'};return `${names[job]||job||role}-${duty==='Attack'?'At':duty==='Defend'?'De':'Su'}`;};
  const captain=B().captain({tactics:{captains:s.armband||[]},slots:slots.filter(v=>v.player)})?.id;
  const location=(v,index,mode)=>{
    const base={x:v.x,y:v.y},forward=v.attack||base;
    if(mode==='attack')return {point:forward,role:v.attack?v.attackPosition:v.position,job:v.attackJob||v.job};
    if(mode==='combined'){
      const point={x:(base.x+forward.x)/2,y:(base.y+forward.y)/2};
      return {point,role:v.attack?Z.zone(point.x,point.y,index===0):v.position,job:v.job};
    }
    return {point:base,role:v.position,job:v.job};
  };
  const zoneOf=(pt,index)=>{const row=pt.x<.34?'defense':pt.x<.66?'middle':'attack',col=pt.y<.34?'left':pt.y>.66?'right':'centre';return `${row}-${col}`;};
  const field=(mode='defense',orientation='portrait',withZones=false)=>{
    const wide=orientation==='wide',zone=selectedZone;
    const markers=slots.map((v,i)=>{
      const {point,role,job}=location(v,i,mode),p=v.player,n=numbers[p?.id]??p?.num??defaults[i]??'–',label=p?.name||'Open position';
      const left=wide?project(point.x):8+84*point.y,bottom=wide?8+84*(1-point.y):project(point.x);
      return `<button type="button" title="Drag ${e(label)} to move or swap; select then click a destination" data-slot="${i}" data-player-id="${e(p?.id||'')}" class="shirt-marker${i===0?' keeper':''}${p?'':' vacant'}${selected===i?' selected':''}" aria-label="Select ${e(role)} · ${e(label)} · shirt ${e(n)}" aria-pressed="${selected===i}" style="left:${left}%;bottom:${bottom}%">${jersey(n)}<b>${e(code(role,job?.[0],job?.[2]))}</b><small>${e(p?label.split(' ').at(-1):'Open')}</small></button>`;
    }).join('');
    const fieldSvg=wide?`<svg class="board-lines" viewBox="0 0 140 100" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width=".6"><rect x="1" y="1" width="138" height="98"/><path d="M70 1v98M1 20h21V80H1M1 37h8v26H1M139 20h-21v60h21m0-43h-8v26h8"/><circle cx="70" cy="50" r="11"/></g></svg>`:fieldLines;
    const markersInZone=withZones?`<div class="fm-zone-overlay" aria-label="Select a tactical pitch zone">${zoneCells.map(z=>`<button type="button" data-board="zone|0|${z.id}" aria-label="${e(z.label)}" aria-pressed="${zone===z.id}"></button>`).join('')}</div>`:'';
    const tracks=['both','combined'].includes(mode)?`<svg class="phase-arrows" viewBox="0 0 100 100" aria-hidden="true"><defs><marker id="phase-arrow" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto"><path d="M0 0 L4 2 L0 4" fill="none" stroke="#e5f3a4" stroke-width=".7"/></marker></defs>${slots.filter(v=>v.player&&v.attack).map(v=>{const f=location(v,slots.indexOf(v),mode),a=v,b=v.attack;if(wide)return `<line x1="${project(a.x)}" y1="${100-(8+84*(1-a.y))}" x2="${project(b.x)}" y2="${100-(8+84*(1-b.y))}"/>`;return `<line x1="${8+84*a.y}" y1="${100-project(a.x)}" x2="${8+84*b.y}" y2="${100-project(b.x)}"/>`;}).join('')}</svg>`:'';
    return `<div class="shape-field${wide?' field-wide':''}" data-orientation="${orientation}" data-phase-view="${mode}" aria-label="${mode==='combined'?'Combined average positions':mode==='attack'?'In-possession shape':mode==='both'?'Both tactical phases':'Out-of-possession shape'}">${fieldSvg}${tracks}${markersInZone}${markers}</div>`;
  };
  const posSelect=(slot,phaseName)=>{
    if(!slot?.player)return '<p class="fm-editor-empty">Select a player to edit their assignment.</p>';
    const attack=phaseName==='attack',role=attack?(slot.attackPosition||slot.position):slot.position,job=attack?slot.attackJob:slot.job;
    return `<div class="fm-assignment-row"><label>${attack?'In-possession role':'Out-of-possession role'}<select ${attack?`data-phase-job="attack|${selected}"`:`data-job="${selected}"`}>${options(Z.choices(role),job[0])}</select></label><label>${attack?'Duty in possession':'Defensive duty'}<select ${attack?`data-phase-duty="attack|${selected}"`:`data-duty="${selected}"`}>${options(Z.jobs[job[0]].duties,job[2])}</select></label></div>`;
  };
  const instructionEditor=slot=>{
    if(!slot?.player)return '<div class="fm-player-editor empty"><h3>Player instructions</h3><p>Select a player on the pitch or in the squad. Their phase roles, duties and personal instructions will appear here.</p></div>';
    const p=slot.player,groups=Object.entries(Z.individualInstructions);
    const phasePanel=phaseName=>`<section class="fm-player-phase"><header><b>${phaseName==='attack'?'In Possession':'Out of Possession'}</b><span>${phaseName==='attack'?code(slot.attackPosition||slot.position,slot.attackJob[0],slot.attackJob[2]):code(slot.position,slot.job[0],slot.job[2])}</span></header>${posSelect(slot,phaseName)}<div class="fm-player-instruction-grid">${groups.map(([k,values])=>`<label>${({position:'Positioning',risk:'Passing risk',shooting:'Shooting',dribbling:'Dribbling',pressing:'Pressing'})[k]}<select data-player-instruction="${phaseName}|${e(p.id)}|${k}">${options(values,slot.instructions?.[phaseName]?.[k]||'Team default')}</select></label>`).join('')}</div></section>`;
    return `<section class="fm-player-editor"><header class="fm-player-editor-head"><div><small>PLAYER DETAILS · ${e(slot.position)}</small><h3>${e(p.name)}</h3><p>${e(p.club||s.club?.name||'First team')} · ${e(p.pos)} · Shirt ${e(numbers[p.id]??p.num??'—')}</p></div><div class="fm-player-readiness">${starsOf(p)} ${status(p)} <b>${readiness[p.id]?.fitness??'—'}% condition</b></div><button type="button" data-league-player="${e(p.id)}">Player profile</button></header><div class="fm-player-phase-grid">${phasePanel('attack')}${phasePanel('defense')}</div><footer><small>Role familiarity · ${slot.experience||0}/20 sessions · Suitability ${Z.fit(p,slot.position,slot.job[0],s.boardReps?.[p.id])}% in current defensive assignment</small></footer></section>`;
  };
  const playerPicker=(slot,i)=>`<select class="fm-player-picker" data-player-pick="${i}" aria-label="Select player for ${e(slot.position)}"><option value="">Open position</option>${players.filter(p=>!p.red&&!readiness[p.id]?.knock).map(p=>`<option value="${e(p.id)}"${slot.player?.id===p.id?' selected':''}>${e(p.name)} · ${e(p.pos)}</option>`).join('')}</select>`;
  const row=(slot,i)=>{
    const p=slot.player,attack=phase==='attack',combined=phase==='combined',averaged=combined?location(slot,i,'combined'):null,pos=combined?averaged.role:attack&&slot.attack?slot.attackPosition:slot.position,job=attack?slot.attackJob:slot.job,ready=p?readiness[p.id]:null;
    return `<button type="button" class="fm-row${selected===i?' on':''}" data-slot="${i}" data-player-id="${e(p?.id||'')}" data-player-pos="${e(p?.pos||'')}" aria-pressed="${selected===i}"><span class="fm-pos">${e(pos)}</span><span class="fm-role"><b>${e(code(pos,job[0],job[2]))}</b><small>${e(job[2])}</small></span>${starsOf(p)}<span class="fm-person"><i class="fm-number">${p?e(numbers[p.id]??p.num??defaults[i]??'—'):'—'}</i>${playerPicker(slot,i)}${p?.id===captain?'<b title="Match captain">(c)</b>':''}</span><span class="fm-suitability">${p?Z.fit(p,pos,job[0],s.boardReps?.[p.id])+'%':'—'}</span><span class="fm-status">${status(p)}</span><span class="fm-stat">${ready?.fitness!=null?ready.fitness+'%':'—'}</span></button>`;
  };
  const subRow=(p,i)=>`<button type="button" class="fm-row fm-sub${selectedBench===p.id?' on':''}" data-player-id="${e(p.id)}" data-player-pos="${e(p.pos)}" data-board="${selected!=null?`pick|${selected}|${e(p.id)}`:`bench|${e(p.id)}`}" aria-pressed="${selectedBench===p.id}"><span class="fm-pos">S${i+1}</span><span class="fm-role"><b>${e(p.pos)}</b><small>${selected!=null?'Replace selected starter':selectedBench===p.id?'Now choose a starter':'Tap, then choose a starter'}</small></span>${starsOf(p)}<span class="fm-person"><i class="fm-number">${e(numbers[p.id]??p.num??'—')}</i><span>${e(p.name)}</span></span><span class="fm-suitability">${e(p.pos)}</span><span class="fm-status">${status(p)}</span><span class="fm-stat">${readiness[p.id]?.fitness!=null?readiness[p.id].fitness+'%':'—'}</span></button>`;
  const squad=(title='First-team selection')=>`<aside class="fm-squad-panel" id="tactic-roles"><header class="fm-panel-head"><div><small>TEAM SHEET</small><h3>${title}</h3><p>${slots.filter(x=>x.player).length} starters · ${bench.length} substitutes · click starter then sub, or drag a row to a shirt</p></div><button type="button" data-board="bestXI">Auto-pick best XI</button></header><div class="fm-squad-table"><div class="fm-squad-columns"><span>POS</span><span>ROLE / DUTY</span><span>ABILITY</span><span>PLAYER</span><span>FIT</span><span>STATUS</span><span>COND.</span></div>${slots.map(row).join('')}<div class="fm-squad-subhead">SUBSTITUTES</div>${bench.map(subRow).join('')||'<p class="fm-empty">No substitutes available.</p>'}</div>${selected!=null?instructionEditor(slots[selected]):''}</aside>`;
  const phaseButtons=()=>`<div class="fm-shape-switch" role="group" aria-label="Team shape view">${[['combined','Combined'],['attack','In Possession'],['base','Out of Possession'],['both','Both']].map(([v,label])=>`<button type="button" data-board="phase|0|${v}" aria-pressed="${phase===v}">${label}</button>`).join('')}</div>`;
  const shapeFormationControls=`<div class="fm-shape-controls">${picker('Out of possession','tactic',Object.keys(D.FORMATIONS),s.tactic)}<label>In-possession formation<select data-attack-formation>${options(B().phaseFormationOptions(),plan.attackFormation||((plan.attack||Object.keys(plan.attackByPlayer||{}).length)?'Custom':'Same as defensive shape'))}</select></label>${picker('Mentality','mentality',['Very Defensive','Defensive','Cautious','Balanced','Positive','Attacking','Very Attacking'],s.mentality||'Balanced')}<label>Team system<select data-system><option value="">${e(s.style||'Balanced shape')}</option>${options(Object.keys(Z.systems),plan.system)}</select></label></div>`;
  const quickSelect=`<div class="fm-quick-actions"><button type="button" data-board="bestXI" ${players.length?'':'disabled'}>Auto-select best XI</button><button type="button" data-board="rotate" ${bench.some(p=>!p.red&&!readiness[p.id]?.knock)?'':'disabled'}>Rotate squad</button>${plan.previousXI?.shape===s.tactic&&plan.previousXI.scope===(s.kitScope||'')?'<button type="button" data-board="undoXI">Undo selection</button>':''}<small>Selection weighs role fit, readiness and squad ability.</small></div>`;
  const viewSummary=`<div class="fm-phase-caption"><span>${phase==='attack'?'IN POSSESSION':phase==='both'?'PHASE COMPARISON':phase==='combined'?'AVERAGE POSITIONS':'OUT OF POSSESSION'}</span><b>${e(s.tactic)} OOP · ${e(plan.attackFormation||'same shape')} IP</b></div>`;
  const reviewText=warnings[0]?.text||'The current shape is ready for the next rehearsal.';
  const shapeIntel=`<section class="fm-shape-intel" aria-label="Tactical snapshot"><div><small>ACTIVE PAIR</small><b>${e(s.tactic)} OOP</b><span>${e(plan.attackFormation||'Same shape')} IP</span></div><div><small>MENTALITY</small><b>${e(s.mentality||'Balanced')}</b><span>${e(inst.club?.trigger||inst.trigger||'System default')} press</span></div><div><small>FAMILIARITY</small><b>${familiarity.position}%</b><span>${familiarity.role}% role fit · ${familiarity.coordination}% coordination</span></div><div><small>COACHING NOTE</small><b>${warnings.length?'Needs review':'Ready to rehearse'}</b><span>${e(reviewText)}</span></div></section>`;
  const shapeContent=phase==='both'?`<div class="fm-both-view">${phaseButtons()}${shapeIntel}<div class="fm-both-pitches"><section class="fm-pitch-card"><header><b>Out of Possession</b><small>${e(s.tactic)}</small></header>${field('defense','wide')}</section><section class="fm-pitch-card"><header><b>In Possession</b><small>${e(plan.attackFormation||'Same as defensive shape')}</small></header>${field('attack','wide')}</section></div>${squad()}${quickSelect}</div>`:`<div class="fm-shape-workspace"><section class="fm-pitch-card fm-primary-pitch"><header><div><small>TACTICAL SHAPE</small><h3>${phase==='attack'?'In Possession':phase==='combined'?'Combined · average player positions':'Out of Possession'}</h3></div><span>${phase==='combined'?'Shared player selection':'Drag a shirt to adjust positions'}</span></header>${viewSummary}${shapeIntel}${phaseButtons()}${shapeFormationControls}${field(phase==='attack'?'attack':phase==='combined'?'combined':'defense')}<div class="fm-pitch-legend"><span>Selected player remains linked to the squad</span><span>Drag a player marker to adjust positions</span></div>${quickSelect}</section>${squad()}</div>`;
  const selectedZoneLabel=zoneCells.find(z=>z.id===selectedZone)?.label||'Middle third · Centre';
  const zoneLabel=(row,col)=>`${zoneNames[row]} · ${zoneSide[col]}`;
  const selectedZonePositions=slots.filter((v,i)=>zoneOf((phase==='attack'?v.attack||v:v),i)===selectedZone);
  const zoneContext=zoneParts=>{
    const row=zoneParts[0],col=zoneParts[1],attack=row==='attack',center=col==='centre';
    if(phase==='attack')return attack?['tempo','width','build','deliveryCross']:row==='middle'?['passing','tempo','build','trigger']:['passing','build','won'];
    return attack?['press','trigger','block','step']:row==='middle'?['press','block','duels','trigger']:['line','block','step','duels'];
  };
  const instructionPhase=phase==='attack'?'attack':'defense',instructionKeys=zoneContext(selectedZone.split('-'));
  const choiceValues=k=>k==='passing'?['Much shorter','Shorter','Standard','More direct','Much more direct']:k==='tempo'?['Much lower','Lower','Standard','Higher','Much higher']:k==='press'?['Much less often','Less often','Standard','More often','Much more often']:k==='width'?['Narrow','Fairly narrow','Standard','Fairly wide','Wide']:k==='line'?['Much lower','Lower','Standard','Higher','Much higher']:null;
  const instructionControl=k=>{
    const axis=choiceValues(k);
    if(axis){const value=inst.fine?.[k]??inst[k]??1,custom=Object.hasOwn(plan.instructions||{},k);return `<label class="fm-instruction-control" data-customized="${custom}"><span>${({passing:'Passing directness',tempo:'Tempo',press:'Trigger press',width:'Attacking width',line:'Defensive line'})[k]}${custom?'<i>EDITED</i>':''}</span><select data-axis="${k}">${axis.map((v,i)=>`<option value="${i/2}"${i/2===value?' selected':''}>${v}</option>`).join('')}</select></label>`;}
    const labels={build:'Build-up approach',deliveryCross:'Crossing style',trigger:'Press trigger',lost:'On losing possession',won:'On winning possession',block:'Line of engagement',step:'Defensive line behaviour',duels:'Tackling approach'};
    const values=Z.choicesTeam[k]||[];if(!values.length)return '';
    const chosen=inst.club?.[k],custom=Object.hasOwn(plan.orders||{},k);return `<label class="fm-instruction-control" data-customized="${custom}"><span>${labels[k]||k}${custom?'<i>EDITED</i>':''}</span><select data-order="${k}"><option value=""${chosen?'':' selected'}>Use system default</option>${options(values,chosen)}</select></label>`;
  };
  const contextualGroups=instructionKeys.map(k=>instructionControl(k)).filter(Boolean).join('');
  const zoneOverlay=field(instructionPhase,'portrait',true);
  const overview=()=>`<aside class="fm-tactical-overview"><header><div><small>TACTICAL OVERVIEW</small><h3>Match plan</h3></div><span class="fm-review-state ${warnings.length?'has-risks':'is-clear'}">${warnings.length?`${warnings.length} review${warnings.length===1?'':'s'}`:'Shape checked'}</span></header><dl><div><dt>Formation</dt><dd>${e(s.tactic)}${plan.attackFormation?` / ${e(plan.attackFormation)}`:''}</dd></div><div><dt>Mentality</dt><dd>${e(s.mentality||'Balanced')}</dd></div><div><dt>Pressing</dt><dd>${e(inst.club?.trigger||inst.trigger||'System default')}</dd></div><div><dt>Familiarity</dt><dd>${familiarity.position}% <small>positions</small></dd></div></dl><section class="fm-overview-risks"><b>${warnings.length?'Priority review':'Tactical risks'}</b>${warnings.length?warnings.slice(0,2).map(w=>`<p class="fm-warning fm-${e(w.level)}">${e(w.text)}</p>`).join(''):'<p>No flagged structural risks.</p>'}</section><button type="button" data-tactic-jump="opposition">Opposition report</button></aside>`;
  const instructionContent=`<section class="fm-instruction-workspace"><aside class="fm-instruction-visual"><header><small>TACTICAL VISUALISER</small><h3>${phase==='attack'?'In Possession':'Out of Possession'}</h3><p>Choose a pitch zone to focus the coaching view.</p></header><div class="fm-instruction-phase"><button type="button" data-board="phase|0|attack" aria-pressed="${phase==='attack'}">In Possession</button><button type="button" data-board="phase|0|base" aria-pressed="${phase!=='attack'}">Out of Possession</button></div>${zoneOverlay}<div class="fm-zone-analysis"><b>Nine-zone responsibilities · ${e(selectedZoneLabel)}</b><div>${selectedZonePositions.length?selectedZonePositions.map(v=>{const job=instructionPhase==='attack'?v.attackJob:v.job;return `<span><b>${e(v.player?.name||'Open slot')}</b> · ${e(instructionPhase==='attack'?v.attackPosition||v.position:v.position)} · ${e(job[0])}</span>`;}).join(''):'No starters currently occupy this area.'}</div></div></aside><section class="fm-context-controls"><header><small>CONTEXTUAL TEAM INSTRUCTIONS</small><h3>${instructionPhase==='attack'?'In Possession':'Out of Possession'} · ${e(selectedZoneLabel)}</h3><p>Changes apply to the active phase of the match plan.</p></header><div class="fm-context-control-list">${contextualGroups||'<p>No team instruction is assigned to this context.</p>'}</div><section class="fm-player-context"><h4>Players in this area</h4>${selectedZonePositions.length?selectedZonePositions.map(v=>`<button type="button" data-slot="${slots.indexOf(v)}">${e(v.player?.name||'Open slot')} <small>${e(v.attackPosition||v.position)} · ${e(v.attackJob?.[0]||v.job[0])}</small></button>`).join(''):'<p>Choose another zone to inspect its assigned players.</p>'}</section></section>${overview()}</section>${selected!=null?`<section class="fm-instruction-player-detail"><div><small>SELECTED PLAYER</small><p>Personal instructions stay linked to the same squad assignment.</p></div>${instructionEditor(slots[selected])}</section>`:''}`;
  const playerContent=`<section class="fm-player-workspace"><div class="fm-player-list"><header><small>FIRST TEAM</small><h3>Player assignments</h3><p>Select a player to edit their phase-specific role and instructions.</p></header>${slots.map(row).join('')}${bench.map(subRow).join('')}</div><div class="fm-player-detail">${instructionEditor(selected==null?null:slots[selected])}</div></section>`;
  const library=B().presetLibrary(s),savedOptions=library.map(x=>`<option value="${e(x.id)}"${s.activeTacticPreset===x.id?' selected':''}>${e(x.name)}</option>`).join('');
  const nav=[['shape','Team Shape'],['instructions','Team Instructions'],['players','Player Instructions']];
  const reviewLabel=warnings.length?`Needs review · ${warnings.length}`:'Ready for review',reviewHelp=warnings.length?`${warnings.length} tactical concern${warnings.length===1?'':'s'} need review.`:'No structural risks are currently flagged.';
  const header=`<header class="fm-workspace-header"><div class="fm-title-group"><small>TACTICS · ${e(s.club?.name||'FIRST TEAM')}</small><h2>${e(plan.system||s.style||'Balanced shape')}</h2><p>${e(s.tactic)} OOP · ${e(plan.attackFormation||'Same shape')} IP · ${e(s.mentality||'Balanced')} mentality</p></div><div class="fm-header-metrics"><span><small>Familiarity</small><b>${familiarity.position}%</b><i><b style="width:${familiarity.position}%"></b></i></span><span><small>Intensity</small><b>${intensity}%</b><i><b style="width:${intensity}%"></b></i></span><span class="fm-status-chip ${warnings.length?'has-risks':'is-clear'}" role="status" title="${e(reviewHelp)}">${e(reviewLabel)}</span></div><div class="fm-save-controls"><label class="sr-only" for="fm-tactic-name">Saved tactic name</label><input id="fm-tactic-name" type="text" data-preset-name maxlength="48" placeholder="Name this tactic"><button type="button" data-library-action="save">Save tactic</button><select aria-label="Load saved tactic" data-preset-select><option value="">Saved tactics</option>${savedOptions}</select><button type="button" data-library-action="load" ${library.length?'':'disabled'}>Load</button></div></header>`;
  const workspaceNav=`<nav class="fm-workspace-nav" aria-label="Tactical workspace">${nav.map(([id,label])=>`<button type="button" data-workspace-tab="${id}" aria-current="${workspaceTab===id?'page':'false'}">${label}</button>`).join('')}</nav>`;
  const content=workspaceTab==='instructions'?instructionContent:workspaceTab==='players'?playerContent:shapeContent;
  const oppFixture=g.TLLeagueMatchday?.fixture(s),oppName=oppFixture?(oppFixture.own===0?oppFixture.host:oppFixture.team):'',oppPlayers=oppName?W.pool.filter(p=>p.club===oppName):[],oppKey=oppPlayers.slice().sort((a,b)=>D.ROLE_WEIGHTS[b.pos](b.attrs)-D.ROLE_WEIGHTS[a.pos](a.attrs)).slice(0,3),oppBacks=oppPlayers.filter(p=>['DC','FB','WB'].includes(p.pos)),oppPace=oppBacks.length?Math.round(oppBacks.reduce((n,p)=>n+(p.attrs.pace||0),0)/oppBacks.length):null;
  const opposition=`<section class="fm-opposition" id="tactic-opposition"><header><small>OPPOSITION ANALYSIS</small>${oppFixture?`<h3>Next: ${e(oppName)}</h3><p>Scheduled shape ${e(oppFixture.tactics?.[oppFixture.own===0?1:0]?.formation||'not recorded')} · ${oppPlayers.length} players indexed in the current world.</p><p>${oppKey.length?'Players to watch: '+oppKey.map(p=>e(p.name)+' ('+e(p.pos)+')').join(' · '):'No opponent player ratings are on file yet.'}${oppPace!=null?' · Defensive pace average '+oppPace+'/20':''}</p><button type="button" data-board="order|0|trigger|Carrier facing own goal">Use facing-away pressing trigger</button>`:'<h3>No upcoming opponent</h3><p>Opposition notes will appear when a fixture is scheduled; unobserved adjustments are not inferred.</p>'}</header></section>`;
  const leadership=`<section class="fm-leadership"><small>DRESSING ROOM</small><label>Match captain<select data-arm="0"><option value="">Automatic captain</option>${players.map(p=>`<option value="${e(p.id)}"${s.armband?.[0]===p.id?' selected':''}>${e(p.name)} · Composure ${e(p.attrs.composure)}</option>`).join('')}</select></label></section>`;
  return `<section class="board-room fm-tactics-workspace">${header}${workspaceNav}<main class="fm-workspace-content" data-workspace="${workspaceTab}">${content}</main>${opposition}${leadership}</section>`;
}
function bind(root,change,draw){
 let drag=null,suppressUntil=0;
 const act=value=>{
  const [cmd,a,b]=value.split('|'),i=cmd==='move'?a:null;
  if(cmd==='bench'){selected=null;selectedBench=b||a;draw();return;}
  const button=()=>root.querySelector(`.shape-field [data-slot="${i}"]`),before=i&&button()?.getBoundingClientRect();
  if(['bestXI','rotate','undoXI','preset','loadPreset','importPreset'].includes(cmd)){selected=null;selectedBench=null;}
  else if(['move','pick','swap'].includes(cmd)){selected=Number(a);selectedBench=null;}
  change('matchBoard',value);
  const after=i&&button()?.getBoundingClientRect();
  if(before&&after&&!matchMedia('(prefers-reduced-motion: reduce)').matches)button().animate([{translate:`${before.left-after.left}px ${before.top-after.top}px`},{translate:'0 0'}],{duration:170,easing:'ease-out'});
 };
 function nearestSlot(field,x,y){const markers=[...(field?.querySelectorAll?.('[data-slot]')||[])];return markers.sort((a,b)=>{const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();return Math.hypot(ar.left+ar.width/2-x,ar.top+ar.height/2-y)-Math.hypot(br.left+br.width/2-x,br.top+br.height/2-y);})[0]||null;}
 function moveValue(field,i,x,y){
  const r=field.getBoundingClientRect(),clamp=v=>Math.min(.97,Math.max(.03,v)).toFixed(3),wide=field.dataset.orientation==='wide';
  const longitudinal=wide?project((x-r.left)/r.width*100,true):project((r.bottom-y)/r.height*100,true),lateral=wide?1-(y-r.top)/r.height:((x-r.left)/r.width-.08)/.84;
  const phase=['attack','combined'].includes(field.dataset.phaseView)?field.dataset.phaseView:'defense';
  return `move|${i}|${clamp(longitudinal)}|${clamp(lateral)}|${phase}`;
 }
 function move(field,i,x,y){act(moveValue(field,i,x,y));}
 root.addEventListener('change',ev=>{
  if(ev.target.hasAttribute('data-tactic-import')){const file=ev.target.files?.[0];if(file)file.text().then(text=>change('matchBoard',`importPreset|0|${encodeURIComponent(text)}`)).catch(()=>change('matchBoard','importPreset|0|invalid'));return;}
  if(ev.target.hasAttribute('data-attack-formation'))act(`attackFormation|0|${ev.target.value}`);
  else if(ev.target.hasAttribute('data-phase-job')){const [phase,index]=ev.target.dataset.phaseJob.split('|');act(`phaseJob|${phase}|${index}|${ev.target.value}`);}
  else if(ev.target.hasAttribute('data-phase-duty')){const [phase,index]=ev.target.dataset.phaseDuty.split('|');act(`phaseDuty|${phase}|${index}|${ev.target.value}`);}
  else if(ev.target.hasAttribute('data-player-instruction'))act(`individual|${ev.target.dataset.playerInstruction}|${ev.target.value}`);
  else if(ev.target.hasAttribute('data-response'))act(`response|${ev.target.dataset.response}|${ev.target.dataset.moment}|${ev.target.value}`);
  else if(ev.target.hasAttribute('data-order'))act(`order|0|${ev.target.dataset.order}|${ev.target.value}`);
  else if(ev.target.hasAttribute('data-job'))act(`job|${ev.target.dataset.job}|${ev.target.value}`);
  else if(ev.target.hasAttribute('data-system'))act(`system|0|${ev.target.value}`);
  else if(ev.target.hasAttribute('data-axis'))act(`axis|0|${ev.target.dataset.axis}|${ev.target.value}`);
  else if(ev.target.hasAttribute('data-duty'))act(`duty|${ev.target.dataset.duty}|${ev.target.value}`);
  else if(ev.target.hasAttribute('data-arm'))act(`skipper|${ev.target.dataset.arm}|${ev.target.value}`);
  else if(ev.target.hasAttribute('data-player-pick'))act(`pick|${ev.target.dataset.playerPick}|${ev.target.value}`);
 });
 root.addEventListener('click',ev=>{
  if(performance.now()<suppressUntil&&ev.target.closest('.shape-field,.fm-squad-panel .fm-row'))return;
  if(ev.target.closest('[data-player-pick]'))return;
  const b=ev.target.closest('button'),f=ev.target.closest('.shape-field');
  if(b?.dataset.workspaceTab){workspaceTab=b.dataset.workspaceTab;selected=null;selectedBench=null;draw();return;}
  if(b?.dataset.tacticJump){root.querySelector('#tactic-'+b.dataset.tacticJump)?.scrollIntoView({behavior:'smooth',block:'start'});return;}
  if(b?.dataset.libraryAction){const id=root.querySelector('[data-preset-select]')?.value,name=root.querySelector('[data-preset-name]')?.value?.trim()||'',action=b.dataset.libraryAction;if(action==='save')act(`savePreset|0|${name}`);else if(!id)return;else if(action==='load')act(`loadPreset|0|${id}`);else if(action==='rename')act(`renamePreset|0|${id}|${name}`);else if(action==='duplicate')act(`duplicatePreset|0|${id}|${name}`);else if(action==='delete')act(`deletePreset|0|${id}`);return;}
  if(b?.hasAttribute('data-tactic-export')){const name=root.querySelector('[data-preset-select]')?.selectedOptions?.[0]?.textContent||`${s.tactic} ${B().active(s).system||'Custom'}`,data={version:1,name,formation:s.tactic,plan:B().copyPlan(B().active(s))},blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'tactic'}.json`;a.click();URL.revokeObjectURL(url);return;}
  if(b?.dataset.board){act(b.dataset.board);return;}
  if(b?.hasAttribute('data-clear-slot')){selected=null;selectedBench=null;draw();return;}
  if(b?.hasAttribute('data-slot')){const i=+b.dataset.slot;if(selectedBench)act(`pick|${i}|${selectedBench}`);else if(f&&selected!=null&&selected!==i)act(`swap|${selected}|${i}`);else{selected=selected===i?null:i;draw();}return;}
  if(f&&selected!=null)move(f,selected,ev.clientX,ev.clientY);
 });
 function begin(ev){
  if(!ev.isPrimary||ev.button!==0)return;
  const shirt=ev.target.closest('.shape-field [data-slot]'),row=shirt?null:ev.target.closest('.fm-squad-panel .fm-row[data-player-id]');
  if((!shirt&&!row)||(row&&(!row.dataset.playerId||ev.target.closest('select,input,option'))))return;
  drag={id:ev.pointerId,kind:shirt?'shirt':'player',shirt,row,playerId:shirt?.dataset.playerId||row?.dataset.playerId,playerLabel:row?.querySelector('.fm-person span')?.textContent||row?.dataset.playerId,x:ev.clientX,y:ev.clientY,source:shirt||row,moving:false,hover:null};
  root.setPointerCapture?.(ev.pointerId);
 }
 root.addEventListener('pointerdown',begin);
 root.addEventListener('pointermove',ev=>{
  if(drag?.id!==ev.pointerId)return;
  if(!drag.moving&&Math.hypot(ev.clientX-drag.x,ev.clientY-drag.y)<7)return;
  drag.moving=true;
  if(drag.kind==='player'&&!drag.rowDetached){
   const r=drag.source.getBoundingClientRect(),placeholder=document.createElement('div');placeholder.className='fm-drag-placeholder';placeholder.style.height=`${r.height}px`;placeholder.style.width=`${r.width}px`;drag.source.parentNode?.insertBefore(placeholder,drag.source);drag.placeholder=placeholder;document.body.appendChild(drag.source);Object.assign(drag.source.style,{position:'fixed',left:`${r.left}px`,top:`${r.top}px`,width:`${r.width}px`,margin:'0',zIndex:'99999',pointerEvents:'none'});drag.rowDetached=true;
  }
  drag.source.style.translate=`${ev.clientX-drag.x}px ${ev.clientY-drag.y}px`;drag.source.classList.add('fm-drag-source');
  const under=document.elementFromPoint(ev.clientX,ev.clientY),field=under?.closest('.shape-field'),exact=under?.closest('.shape-field [data-slot]'),preview=exact||(field&&nearestSlot(field,ev.clientX,ev.clientY));
  const valid=!!field&&(drag.kind==='shirt'||!!preview&&((preview.dataset.slot==='0')===(drag.row.dataset.playerPos==='GK'))),hover=preview||null;
  if(drag.hover!==hover){drag.hover?.classList.remove('fm-drop-target','fm-drop-invalid');drag.hover=hover;}
  if(hover)hover.classList.add(valid?'fm-drop-target':'fm-drop-invalid');
  drag.drop={field,marker:exact,preview,valid};
 });
 function restore(d){
  if(d.rowDetached&&d.placeholder?.parentNode){d.placeholder.parentNode.insertBefore(d.source,d.placeholder);d.placeholder.remove();for(const key of ['position','left','top','width','margin','zIndex','pointerEvents'])d.source.style[key]='';}
  d.source.style.translate='';d.source.classList.remove('fm-drag-source');
 }
 function finish(ev,cancel){
  if(drag?.id!==ev.pointerId)return;
  const d=drag;drag=null;d.hover?.classList.remove('fm-drop-target','fm-drop-invalid');
  if(!d.moving)return;
  suppressUntil=performance.now()+350;
  if(cancel){restore(d);return;}
  const under=document.elementFromPoint(ev.clientX,ev.clientY),field=under?.closest('.shape-field'),exact=under?.closest('.shape-field [data-slot]'),preview=exact||(field&&nearestSlot(field,ev.clientX,ev.clientY));
  if(d.kind==='player'){
   if(!field||!preview||(preview.dataset.slot==='0')!==(d.row.dataset.playerPos==='GK')){restore(d);return;}
   const slot=Number(preview.dataset.slot),placement=!exact?moveValue(field,slot,ev.clientX,ev.clientY):null;restore(d);
   act(`pick|${slot}|${d.playerId}`);if(placement)act(placement);
  }else{
   if(!field){restore(d);return;}
   const command=exact&&exact.dataset.slot!==String(d.shirt.dataset.slot)?`swap|${d.shirt.dataset.slot}|${exact.dataset.slot}`:moveValue(field,d.shirt.dataset.slot,ev.clientX,ev.clientY);restore(d);act(command);
  }
 }
 root.addEventListener('pointerup',ev=>finish(ev,false));
 root.addEventListener('pointercancel',ev=>finish(ev,true));
 root.addEventListener('lostpointercapture',ev=>finish(ev,true));
}g.TLBoardRoom={render,bind,project,positionalNumbers};})(typeof window==='undefined'?globalThis:window);
