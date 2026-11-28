(function(g){'use strict';let selected=null,selectedBench=null,context='',workspaceTab='shape',rolePicker=null,benchOpen=false,libraryOpen=false,markerMenu=null;const B=()=>g.TLMatchBoard,e=x=>g.TLClubUI.esc(String(x??''));
// Match coordinates describe compact playing positions. Stretch the lines on the chalkboard
// without changing the underlying tactic, and invert the same projection for touch placement.
const depth=[[0,5],[.035,8],[.10,24],[.32,41],[.45,56],[.59,72],[.75,89],[1,95]];
function project(value,inverse=false){const a=inverse?1:0,b=1-a;let i=1;while(i<depth.length-1&&value>depth[i][a])i++;const l=depth[i-1],r=depth[i];return l[b]+(value-l[a])*(r[b]-l[b])/(r[a]-l[a]);}
function nearestTarget(field,selector,x,y,padding=16){let best=null,distance=Infinity;for(const target of [...(field?.querySelectorAll?.(selector)||[])]){const r=target.getBoundingClientRect(),dx=Math.max(r.left-x,0,x-r.right),dy=Math.max(r.top-y,0,y-r.bottom),d=Math.hypot(dx,dy);if(d<distance){best=target;distance=d;}}return distance<=padding?best:null;}
function positionalNumbers(f){const used=new Set([1]),roles=g.TLData.FORMATIONS[f];return [1,...roles.map(({role,y})=>{const preferred=({FB:y<.5?[3]:[2],WB:y<.5?[3,11]:[2,7],DC:[5,4,6],DM:[6,4,8],CM:[8,6,10],AM:[10,8],W:y<.5?[11,7]:[7,11],ST:[9,10]})[role]||[];const n=[...preferred, ...Array.from({length:10},(_,i)=>i+2)].find(n=>!used.has(n));used.add(n);return n;})];}
const roleTargets=[
 {code:'GK',job:'Goalkeeper',x:.035,y:.5,keeper:true},
 {code:'RB',job:'Full-Back',x:.14,y:.88},{code:'LB',job:'Full-Back',x:.14,y:.12},
 {code:'CB',job:'Centre-Back',x:.14,y:.32},{code:'CB',job:'Centre-Back',x:.14,y:.68},{code:'CB',job:'Centre-Back',x:.14,y:.5,flexible:true},
 {code:'DM',job:'Defensive Midfielder',x:.32,y:.5},{code:'DM',job:'Defensive Midfielder',x:.32,y:.32,flexible:true},{code:'DM',job:'Defensive Midfielder',x:.32,y:.68,flexible:true},
 {code:'CM',job:'Central Midfielder',x:.45,y:.32},{code:'CM',job:'Central Midfielder',x:.45,y:.68},{code:'CM',job:'Central Midfielder',x:.45,y:.5,flexible:true},
 {code:'RM',job:'Wide Midfielder',x:.45,y:.88},{code:'LM',job:'Wide Midfielder',x:.45,y:.12},
 {code:'AM',job:'Attacking Midfielder',x:.59,y:.5},{code:'AM',job:'Attacking Midfielder',x:.59,y:.68,flexible:true},
 {code:'RW',job:'Winger',x:.75,y:.88},{code:'LW',job:'Winger',x:.75,y:.12},
 {code:'ST',job:'Striker',x:.9,y:.5},{code:'ST',job:'Striker',x:.9,y:.32,flexible:true},{code:'ST',job:'Striker',x:.9,y:.68,flexible:true}
];
const fieldLines=`<svg class="board-lines" viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width=".6"><rect x="1" y="1" width="98" height="138"/><path d="M1 70h98M20 1v21h60V1M37 1v8h26V1M20 139v-21h60v21M37 139v-8h26v8M39 22q11 9 22 0M39 118q11-9 22 0"/><circle cx="50" cy="70" r="11"/></g></svg>`;
function jersey(n){return `<svg class="tactic-shirt" viewBox="0 0 42 38" aria-hidden="true"><path d="m14 2-8 3-5 9 7 4 3-5-1 22q11 2 22 0l-1-22 3 5 7-4-5-9-8-3q-7 6-14 0Z" fill="currentColor" stroke="#d6e9ea" stroke-width="1.2"/><path d="m15 2 6 6 6-6" fill="none" stroke="#d6e9ea"/><text x="21" y="26" text-anchor="middle" fill="white" font-size="16" font-weight="800">${n}</text></svg>`;}
function render(s,players){
  const stars=g.TLDynamics.squadStars(players),lists=g.TLKit.current(s).filter(r=>r.day<=s.day),filed=lists.find(r=>r.title===s.kitScope),numbers=(filed||lists.find(r=>r.title===g.TLKit.league))?.numbers||{},defaults=positionalNumbers(s.tactic);
  if(filed)players=players.filter(p=>filed.numbers[p.id]);
  const key=[s.id,s.boardIndex,s.tactic,s.kitScope].join(':');if(context!==key){selected=null;selectedBench=null;workspaceTab='shape';rolePicker=null;markerMenu=null;context=key;}
  const {slots,bench}=B().sheet(s.tactic,B().active(s),players),W=g.TLManagerLife,Z=g.TLZones,D=g.TLData,plan=B().active(s),phaseRaw=s.boardPhase||'base',phase=phaseRaw==='transition'?'base':phaseRaw,inst=Z.settings(plan),visualMode=phase,defenseName=Object.hasOwn(D.FORMATIONS,plan.defenseFormation)?plan.defenseFormation:s.tactic,defenseCustomNumber=B().formationNumber(slots.slice(1).map(v=>({x:v.x,y:v.y}))),attackCustomNumber=B().formationNumber(slots.slice(1).map(v=>v.attack||v)),defenseChoice=plan.defenseFormation==='Custom'?'Custom':defenseName,attackName=plan.attackFormation||'Same as defensive shape',attackChoice=plan.attackFormation||((plan.attack||Object.keys(plan.attackByPlayer||{}).length||plan.phaseCoordinates?.attack)?'Custom':'Same as defensive shape'),defenseLabel=defenseChoice==='Custom'?`Custom${defenseCustomNumber?` (${defenseCustomNumber})`:''}`:defenseName,attackLabel=attackChoice==='Custom'?`Custom${attackCustomNumber?` (${attackCustomNumber})`:''}`:attackName;
  const options=(values,current,display=v=>v)=>values.map(v=>`<option value="${e(v)}"${v===current?' selected':''}>${e(display(v))}</option>`).join('');
  const picker=(label,cmd,values,current,display=v=>v)=>`<label><span>${label}</span><select aria-label="${label}" data-plan="${cmd}">${options(values,current,display)}</select></label>`;
  const familiarity=g.TLTacticalAnalysis?.familiarity(slots,s.boardReps)||{position:0,role:0,coordination:0};
  const warnings=g.TLTacticalAnalysis?.evaluate(slots,plan,{reps:s.boardReps,readiness:g.TLDynamics.snapshot(s,players).players,familiarity:true})||[];
  /* one line per player: the full sentence stays in the tooltip */
  const shortRisks=(()=>{const seen=new Set(),out=[];for(const w of warnings||[]){const m=/^(.+?) has a (\d+)% fit for (.+?) (out of possession|in possession);/.exec(w.text||'');const label=(w.text||'').match(/sustain the selected press/)?'press workload':(w.text||'').match(/no holding midfielder/)?'no holding midfielder':(w.text||'').match(/Counter-pressing immediately/)?'conflicting transitions':(w.text||'').match(/little shared rehearsal/)?'low familiarity':(w.text||'').split(';')[0].slice(0,52);const short=m?`${m[1]} · ${m[3]} · ${m[2]}% fit`:`${w.player?w.player+' · ':''}${label}`;if(!short||seen.has(short))continue;seen.add(short);out.push({short,full:w.text||short});if(out.length===3)break;}return out;})();
  const readiness=g.TLDynamics.snapshot(s,players).players,selectedZone=s.tacticZone||'middle-centre';
  const zoneCols=['left','centre','right'],zoneNames={defense:'Own third',middle:'Middle third',attack:'Final third'},zoneSide={left:'Left channel',centre:'Central area',right:'Right channel'};
  const zoneCells=['attack','middle','defense'].flatMap(row=>zoneCols.map(col=>({id:`${row}-${col}`,row,col,label:`${zoneNames[row]} · ${zoneSide[col]}`})));
  const intensity=Math.round(((inst.fine?.tempo??inst.tempo??1)+(inst.fine?.press??inst.press??1))/4*100);
  const status=p=>{if(!p)return '';const v=readiness[p.id];if(!v)return '';if(v.knock)return '<i class="fm-pip bad" title="Carrying a knock">Injured</i>';if(v.fitness<70)return '<i class="fm-pip warn" title="Low condition">Low</i>';if(v.sharp<70)return '<i class="fm-pip warn" title="Needs match sharpness">Sharpness</i>';return '<i class="fm-pip good" title="Ready">Ready</i>';};
  const starsOf=p=>{const n=p?(stars[p.id]||0):0;return `<span class="fm-stars" role="img" aria-label="Squad ability ${n} of 5"><span>${'★'.repeat(n)}</span><i>${'☆'.repeat(5-n)}</i></span>`;};
  const code=(role,job,duty)=>{const names={'Goalkeeper':'GK','Sweeper Keeper':'SK','Ball-Playing Goalkeeper':'BPG','Centre-Back':'CB','Ball-Playing Defender':'BPD','No-Nonsense Centre-Back':'NNCB','Libero':'Lib','Stopper':'Stop','Cover Defender':'Cov','Full-Back':'FB','Wing-Back':'WB','Complete Wing-Back':'CWB','Inverted Wing-Back':'IWB','Inverted Full-Back':'IFB','No-Nonsense Full-Back':'NNFB','Defensive Midfielder':'DM','Anchor':'A','Half-Back':'HB','Deep-Lying Playmaker':'DLP','Segundo Volante':'SV','Regista':'Reg','Ball-Winning Midfielder':'BWM','Central Midfielder':'CM','Box-to-Box Midfielder':'BBM','Mezzala':'Mez','Carrilero':'Car','Advanced Playmaker':'AP','Roaming Playmaker':'RPM','Attacking Midfielder':'AM','Shadow Striker':'SS','Trequartista':'Treq','Enganche':'Eng','Wide Midfielder':'WM','Wide Playmaker':'WP','Winger':'W','Defensive Winger':'DW','Inside Forward':'IF','Inverted Winger':'IW','Advanced Winger':'AW','Raumdeuter':'Rau','Wide Target Forward':'WTF','Striker':'ST','Advanced Forward':'AF','Complete Forward':'CF','Deep-Lying Forward':'DLF','Target Forward':'TF','Poacher':'P','Pressing Forward':'PF','False Nine':'F9','Defensive Forward':'DF'};return names[job]||job||role;};
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
    const viewKey=`${mode}:${orientation}`,menuOpen=i=>markerMenu!==null&&markerMenu.slot===i&&(markerMenu.key==null||markerMenu.key===viewKey);
    const wide=orientation==='wide',zone=selectedZone;
    const anchorsX=[.14,.32,.45,.59,.75,.9],anchorsY=[.12,.32,.5,.68,.88],gridTargets=anchorsX.flatMap(x=>anchorsY.map(y=>({x,y,job:Z.choices(Z.zone(x,y))[0],hidden:true}))),visibleAt=new Set(roleTargets.map(t=>`${t.x},${t.y}`)),hiddenTargets=gridTargets.filter(t=>!visibleAt.has(`${t.x},${t.y}`)),allTargets=[...roleTargets,...hiddenTargets];
    const targets=allTargets.length&&!withZones?allTargets.map((target,index)=>{const left=wide?project(target.x):8+84*target.y,bottom=wide?8+84*(1-target.y):project(target.x),slot=target.keeper?0:slots.slice(1).reduce((best,v,j)=>{const point=location(v,j+1,mode).point,current=location(slots[best],best,mode).point;return Math.hypot(point.x-target.x,point.y-target.y)<Math.hypot(current.x-target.x,current.y-target.y)?j+1:best;},1),hidden=target.hidden,code=target.code||'',label=code?`${code} · ${target.job}${target.flexible?' · additional line position':''}`:hidden?'Hidden pitch position':'Additional pitch position';return `<button type="button" tabindex="-1" class="${hidden?'fm-hidden-position-target':'fm-role-target'+(target.keeper?' keeper':'')+(target.flexible?' flexible':'')}" data-role-target="${index}" data-role-code="${code}" data-role-slot="${slot}" data-role-x="${target.x}" data-role-y="${target.y}" data-role-job="${e(target.job)}" data-role-phase="${mode}" data-role-keeper="${target.keeper?'true':'false'}" aria-label="${e(label)}" title="${e(label)}" style="left:${left}%;bottom:${bottom}%">${code?`<span>${e(code)}</span>`:''}</button>`;}).join(''):'';
    const markers=slots.map((v,i)=>{
      const {point,role,job}=location(v,i,mode),p=v.player,n=numbers[p?.id]??p?.num??defaults[i]??'–',label=p?.name||'Open position',isSelected=selected===i,left=wide?project(point.x):8+84*point.y,bottom=wide?8+84*(1-point.y):project(point.x),rolePhase=mode==='attack'||mode==='combined'?'attack':'defense',chosenRole=rolePhase==='attack'?(v.attackPosition||v.position):v.position,chosenJob=rolePhase==='attack'?v.attackJob:v.job,substitutes=bench.filter(q=>(q.pos==='GK')===(i===0)&&!q.red&&!readiness[q.id]?.knock).sort((a,b)=>Z.fit(b,chosenRole,chosenJob?.[0],s.boardReps)-Z.fit(a,chosenRole,chosenJob?.[0],s.boardReps)||(stars[b.id]||0)-(stars[a.id]||0)||a.name.localeCompare(b.name)),dockX=left<28?'dock-left':left>72?'dock-right':'',dockY=bottom<18?'dock-above':bottom>82?'dock-below':'';
      const platePhase=rolePhase==='attack'?'In possession':'Out of possession',plateCode=code(chosenRole,chosenJob?.[0],chosenJob?.[2]),plateDuty=(chosenJob?.[2]||'').slice(0,2),groupOf=pos=>{const c=(pos||'').toUpperCase();if(c==='GK')return 'gk';if(/^(CB|LB|RB|WB|LWB|RWB|FB|SW|LIB|CD|BPD|NNCB|IFB|COV|STOP)/.test(c))return 'def';if(/^(ST|CF|PF|AF|LW|RW|LF|RF|W|S)$/.test(c))return 'att';return 'mid';};
      const rows=`<button type="button" class="fm-marker-role" data-role-picker-open="${i}" data-role-picker-phase="${rolePhase}" aria-haspopup="dialog" title="${e(plateCode)}${plateDuty?' - '+e(plateDuty):''} · ${platePhase} role" aria-label="${platePhase} role: ${e(chosenJob?.[0]||chosenRole)}. Choose a role"><span>${e(plateCode)}${plateDuty?` - ${e(plateDuty)}`:''}</span></button><div class="fm-marker-player${menuOpen(i)?' is-open':''}" data-marker-player="${i}"><button type="button" class="fm-marker-player-trigger" data-marker-substitute="${i}" aria-haspopup="listbox" aria-expanded="${menuOpen(i)}" title="${e(label)} · Choose a substitute"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4.2 4.2 0 1 0 0-8.4A4.2 4.2 0 0 0 12 12Zm0 2.1c-4.1 0-7.4 2.2-7.4 4.9V21h14.8v-2c0-2.7-3.3-4.9-7.4-4.9Z"/></svg><span>${e(p?p.name.split(' ').filter(Boolean).pop():label)}</span><i aria-hidden="true"></i></button>${menuOpen(i)?`<div class="fm-marker-menu" role="dialog" aria-labelledby="fm-swap-title-${i}"><header class="fm-swap-head"><div><small>${e((chosenJob?.[0]||chosenRole||role).toUpperCase())}${plateDuty?` · ${e(({'Su':'Support','De':'Defend','At':'Attack'}[plateDuty]||plateDuty).toUpperCase())}`:''}</small><b id="fm-swap-title-${i}">${p?`Swap ${e(p.name.split(' ').filter(Boolean).pop())} with…`:`Choose a ${e(chosenJob?.[0]||chosenRole||role)}`}</b></div><button type="button" class="fm-swap-close" data-marker-close="${i}" aria-label="Close swap list">×</button></header><div class="fm-swap-cols"><span aria-hidden="true"></span><span>Player</span><span title="Best role for this position">Role</span><span title="Natural position">Pos</span><span title="Role ability">Abil</span><span title="Condition">Con</span><span title="Sharpness">Shp</span><span title="Morale">Mor</span></div>${substitutes.length?substitutes.map(q=>{const v=readiness[q.id]||{},ranked=Z.choices(chosenRole).map(name=>[name,Z.fit(q,chosenRole,name,s.boardReps?.[q.id])]).sort((a,b)=>(b[1]??0)-(a[1]??0)),best=ranked[0]||[chosenRole,0],bestRole=best[0],fit=best[1],rating=Z.fitRating(fit),fitness=v.fitness??'–',sharp=v.sharp??'–',mood=v.mood??'–',num=numbers[q.id]??q.num??'–';return `<button type="button" data-marker-pick="${e(q.id)}" data-marker-slot="${i}" class="fm-swap-row${v.knock?' is-knock':''}" title="${e(q.name)} · best role ${e(bestRole)} · ${rating}/5 ${e(Z.fitBand(fit))} · condition ${fitness}% · sharpness ${sharp}% · morale ${mood}%"><span class="fm-swap-num">${e(num)}</span><span class="fm-swap-name">${e(q.name)}</span><span class="fm-swap-tag">${e(code(chosenRole,bestRole))}</span><span class="fm-swap-tag">${e(q.pos)}</span><span class="fm-swap-stars" role="img" aria-label="Role ability ${rating} of 5"><span>${'★'.repeat(rating)}</span><i>${'☆'.repeat(5-rating)}</i></span><span class="fm-swap-stat">${fitness}</span><span class="fm-swap-stat">${sharp}</span><span class="fm-swap-stat${mood!=='–'&&mood<55?' is-low':''}">${mood}</span></button>`;}).join(''):`<p class="fm-swap-empty">No ${i===0?'goalkeeper':'substitute'} available for this position.</p>`}${i>0&&p?`<footer class="fm-swap-foot"><button type="button" data-marker-remove="${i}">Remove ${e(p.name.split(' ').filter(Boolean).pop())} from position</button></footer>`:''}</div>`:''}</div>`;
      return `<div class="fm-pitch-marker${isSelected?' is-selected':''}${dockX?' '+dockX:''}${dockY?' '+dockY:''}" style="left:${left}%;bottom:${bottom}%;z-index:${menuOpen(i)?320:isSelected?160:120-Math.round(bottom)}"><div class="fm-marker-card" data-group="${groupOf(chosenRole)}"><button type="button" title="${e(label)} · Drag to move or swap; click to select" data-slot="${i}" data-player-id="${e(p?.id||'')}" class="shirt-marker${i===0?' keeper':''}${p?'':' vacant'}${isSelected?' selected':''}" aria-label="Select ${e(role)} · ${e(label)} · shirt ${e(n)}" aria-pressed="${isSelected}">${jersey(n)}</button>${rows}</div></div>`;
    }).join('');
    const fieldSvg=wide?`<svg class="board-lines" viewBox="0 0 140 100" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width=".6"><rect x="1" y="1" width="138" height="98"/><path d="M70 1v98M1 20h21V80H1M1 37h8v26H1M139 20h-21v60h21m0-43h-8v26h8"/><circle cx="70" cy="50" r="11"/></g></svg>`:fieldLines;
    const markersInZone=withZones?`<div class="fm-zone-overlay" aria-label="Select a tactical pitch zone">${zoneCells.map(z=>`<button type="button" data-board="zone|0|${z.id}" aria-label="${e(z.label)}" aria-pressed="${zone===z.id}"></button>`).join('')}</div>`:'';
    const tracks=['both','combined'].includes(mode)?`<svg class="phase-arrows" viewBox="0 0 100 100" aria-hidden="true"><defs><marker id="phase-arrow" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto"><path d="M0 0 L4 2 L0 4" fill="none" stroke="#e5f3a4" stroke-width=".7"/></marker></defs>${slots.filter(v=>v.player&&v.attack).map(v=>{const f=location(v,slots.indexOf(v),mode),a=v,b=v.attack;if(wide)return `<line x1="${project(a.x)}" y1="${100-(8+84*(1-a.y))}" x2="${project(b.x)}" y2="${100-(8+84*(1-b.y))}"/>`;return `<line x1="${8+84*a.y}" y1="${100-project(a.x)}" x2="${8+84*b.y}" y2="${100-project(b.x)}"/>`;}).join('')}</svg>`:'';
    return `<div class="shape-field${wide?' field-wide':''}" data-orientation="${orientation}" data-phase-view="${mode}" aria-label="${mode==='combined'?'Combined average positions':mode==='attack'?'In-possession shape':mode==='both'?'Both tactical phases':'Out-of-possession shape'}">${fieldSvg}${tracks}${targets}${markersInZone}${markers}</div>`;
  };
  const posSelect=(slot,phaseName)=>{
    if(!slot?.player)return '<p class="fm-editor-empty">Select a player to edit their assignment.</p>';
    const attack=phaseName==='attack',job=attack?slot.attackJob:slot.job,fit=Z.fit(slot.player,attack?(slot.attackPosition||slot.position):slot.position,job[0],s.boardReps?.[slot.player.id]);
    return `<div class="fm-assignment-row"><div><button type="button" data-role-picker-open="${selected}" data-role-picker-phase="${phaseName}" aria-haspopup="dialog" title="${attack?'In-possession':'Out-of-possession'} role">${e(job[0])} · ${Z.fitRating(fit)}/5 ${e(Z.fitBand(fit))}</button></div></div>`;
  };
  const instructionEditor=slot=>{
    if(!slot?.player)return '<div class="fm-player-editor empty"><p>Select a player.</p></div>';
    const p=slot.player;
    const phasePanel=phaseName=>{const groups=Object.entries(Z.individualInstructions).filter(([k])=>Z.individualInstructionChoices(phaseName,k).length);return `<section class="fm-player-phase"><header><b>${phaseName==='attack'?'In Possession':'Out of Possession'}</b><span>${phaseName==='attack'?code(slot.attackPosition||slot.position,slot.attackJob[0],slot.attackJob[2]):code(slot.position,slot.job[0],slot.job[2])}</span></header>${posSelect(slot,phaseName)}<div class="fm-player-instruction-grid">${groups.map(([k])=>{const choices=Z.individualInstructionChoices(phaseName,k);return `<label>${({position:'Positioning',risk:'Passing risk',shooting:'Shooting',dribbling:'Dribbling',pressing:'Pressing'})[k]}<select data-player-instruction="${phaseName}|${e(p.id)}|${k}">${options(choices,slot.instructions?.[phaseName]?.[k]||'Team default')}</select></label>`;}).join('')}</div></section>`;};
    return `<section class="fm-player-editor"><header class="fm-player-editor-head"><div><h3>${e(p.name)}</h3><p>${e(p.pos)} · Shirt ${e(numbers[p.id]??p.num??'—')}</p></div><div class="fm-player-readiness">${starsOf(p)} ${status(p)} <b>${readiness[p.id]?.fitness??'—'}% condition</b></div><button type="button" data-league-player="${e(p.id)}">Player profile</button></header><div class="fm-player-phase-grid">${phasePanel('attack')}${phasePanel('defense')}</div><footer><small>Familiarity ${slot.experience||0}/20 · Out of possession ${Z.fitRating(Z.fit(p,slot.position,slot.job[0],s.boardReps?.[p.id]))}/5 · In possession ${Z.fitRating(Z.fit(p,slot.attackPosition||slot.position,slot.attackJob[0],s.boardReps?.[p.id]))}/5</small></footer></section>`;
  };
  const playerPicker=(slot,i)=>`<select class="fm-player-picker" data-player-pick="${i}" aria-label="Choose player for ${e(slot.position)}" title="Choose a player for ${e(slot.position)}"><option value="">Pick</option>${players.filter(p=>!p.red&&!readiness[p.id]?.knock).map(p=>`<option value="${e(p.id)}"${slot.player?.id===p.id?' selected':''}>${e(p.name)} · ${e(p.pos)}</option>`).join('')}</select>`;
  const roleCell=(slot,index,phaseName)=>{const attack=phaseName==='attack',position=attack?(slot.attackPosition||slot.position):slot.position,job=attack?slot.attackJob[0]:slot.job[0],player=slot.player,fit=player?Z.fit(player,position,job,s.boardReps?.[player.id]):null;return `<div class="fm-role-cell"><button type="button" data-role-picker-open="${index}" data-role-picker-phase="${phaseName}" aria-haspopup="dialog" aria-label="Choose ${phaseName==='attack'?'In Possession':'Out of Possession'} role for ${e(player?.name||position)}">${e(job)}</button>${fit==null?'<small>Awaiting player</small>':`<small>${Z.fitRating(fit)}/5 · ${e(Z.fitBand(fit))}</small>`}</div>`;};
  const row=(slot,i)=>{
    const p=slot.player,attack=phase==='attack',combined=phase==='combined',averaged=combined?location(slot,i,'combined'):null,pos=combined?averaged.role:attack&&slot.attack?slot.attackPosition:slot.position,ready=p?readiness[p.id]:null;
    const fitDefense=p?Z.fit(p,slot.position,slot.job?.[0],s.boardReps?.[p.id]):null,fitAttack=p?Z.fit(p,slot.attackPosition||slot.position,slot.attackJob?.[0]||slot.job?.[0],s.boardReps?.[p.id]):null;
    const shownFit=phase==='both'?`${Z.fitRating(fitDefense)}/5 / ${Z.fitRating(fitAttack)}/5`:attack?`${Z.fitRating(fitAttack)}/5`:`${Z.fitRating(fitDefense)}/5`;
    const fitTitle=p?`${p.name}: Out of possession ${slot.job?.[0]} fit ${fitDefense}%; In possession ${slot.attackJob?.[0]||slot.job?.[0]} fit ${fitAttack}%.`:'No player assigned to this position.';
    return `<tr class="fm-row${selected===i||(workspaceTab==='players'&&selected==null&&i===0)?' on':''}" role="button" tabindex="0" data-slot="${i}" data-player-id="${e(p?.id||'')}" data-player-pos="${e(p?.pos||'')}" aria-pressed="${selected===i}"><td class="fm-sheet-pos"><span class="position-tag">${e(pos)}</span></td><td class="fm-sheet-role">${roleCell(slot,i,'attack')}</td><td class="fm-sheet-role">${roleCell(slot,i,'defense')}</td><td class="fm-sheet-ability">${starsOf(p)}</td><td class="fm-sheet-player fm-person"><i class="fm-number">${p?e(numbers[p.id]??p.num??defaults[i]??'—'):'—'}</i><span class="fm-player-name" title="${e(p?.name||'Open position')}">${e(p?.name||'Open')}</span>${playerPicker(slot,i)}${p?.id===captain?'<b title="Match captain">(c)</b>':''}</span></td><td class="fm-sheet-fit fm-suitability" title="${e(fitTitle)}">${p?shownFit:'—'}</td><td class="fm-sheet-status fm-status">${status(p)}</td><td class="fm-sheet-cond fm-stat">${ready?.fitness!=null?ready.fitness+'%':'—'}</td></tr>`;
  };
  const subRow=(p,i)=>`<tr class="fm-row fm-sub${selectedBench===p.id?' on':''}" role="button" tabindex="0" data-bench="${e(p.id)}" data-board="${selected!=null?`pick|${selected}|${e(p.id)}`:`bench|${e(p.id)}`}" data-player-id="${e(p.id)}" data-player-pos="${e(p.pos)}" aria-pressed="${selectedBench===p.id}"><td class="fm-sheet-pos"><span class="position-tag reserve">S${i+1}</span></td><td class="fm-sheet-role"><div class="fm-role-cell">—</div></td><td class="fm-sheet-role"><div class="fm-role-cell">—</div></td><td class="fm-sheet-ability">${starsOf(p)}</td><td class="fm-sheet-player fm-person"><i class="fm-number">${e(numbers[p.id]??p.num??'—')}</i><span>${e(p.name)}</span></td><td class="fm-sheet-fit fm-suitability">${e(p.pos)}</td><td class="fm-sheet-status fm-status">${status(p)}</td><td class="fm-sheet-cond fm-stat">${readiness[p.id]?.fitness!=null?readiness[p.id].fitness+'%':'—'}</td></tr>`;
  const SHEET_COLUMNS=['POS','In possession role','Out of possession role','Ability','Player','Fit · IP / OOP','Status','Cond.'];
  const sheetRows=()=>slots.map((slot,index)=>row(slot,index)).join('');
  const squad=(title='First-team selection')=>`<aside class="fm-squad-panel${benchOpen?' is-bench-open':''}" id="tactic-roles"><header class="fm-panel-head"><div><small>TEAM SHEET</small><h3>${title}</h3></div><div class="fm-panel-actions"><button type="button" class="fm-btn-quiet" data-board="rotate" ${bench.some(p=>!p.red&&!readiness[p.id]?.knock)?'':'disabled'}>Rotate squad</button><button type="button" data-board="bestXI">Auto-pick best XI</button></div></header><div class="fm-squad-table" data-tl-bar><table class="fm-sheet-table" data-sort-table="teamsheet" data-sort-default="off" data-column-options="player" data-phone-sort="off" data-col-min="44"><caption class="sr-only">First-team selection</caption><thead><tr>${SHEET_COLUMNS.map(label=>`<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>${sheetRows()}<tr class="fm-sheet-divider"><th scope="colgroup" colspan="${SHEET_COLUMNS.length}"><button type="button" class="fm-squad-subhead" data-bench-toggle aria-expanded="${benchOpen}"><span>SUBSTITUTES · ${bench.length}</span><small>${benchOpen?'Hide':'Show'}</small></button></th></tr>${bench.map(subRow).join('')||`<tr><td class="fm-empty" colspan="${SHEET_COLUMNS.length}">No substitutes available.</td></tr>`}</tbody></table></div>${selected!=null?instructionEditor(slots[selected]):''}</aside>`;
  const roleDialog=rolePicker?(()=>{const {slot:index,phase:phaseName}=rolePicker,slot=slots[index];if(!slot)return '';const attack=phaseName==='attack',position=attack?(slot.attackPosition||slot.position):slot.position,current=attack?slot.attackJob[0]:slot.job[0],candidates=Z.choices(position).map(name=>({name,fit:slot.player?Z.fit(slot.player,position,name,s.boardReps?.[slot.player.id]):null,info:Z.roleInfo(name)})).sort((a,b)=>a.fit==null?0:b.fit==null?-1:b.fit-a.fit||a.name.localeCompare(b.name));return `<div class="fm-role-dialog-backdrop"><section class="fm-role-dialog" role="dialog" aria-modal="true" aria-labelledby="fm-role-dialog-title"><header><div><small>TOUCHLINE ROLE GUIDE · ${attack?'IN POSSESSION':'OUT OF POSSESSION'}</small><h2 id="fm-role-dialog-title">Choose a role for ${e(slot.player?.name||position)}</h2><p>${e(position)} position · roles are saved to this tactical position, so a replacement inherits its instructions.</p></div><button type="button" data-role-picker-close aria-label="Close role guide">×</button></header><div class="fm-role-dialog-list">${candidates.map(({name,fit,info})=>`<button type="button" class="fm-role-option${current===name?' is-current':''}" data-role-choice="${e(name)}" data-role-choice-slot="${index}" data-role-choice-phase="${phaseName}" aria-pressed="${current===name}"><span class="fm-role-option-head"><b>${e(name)}</b><strong>${fit==null?'Player fit shown after selection':`${Z.fitRating(fit)}/5 · ${Z.fitBand(fit)} (${fit}%)`}</strong></span><span>${e(info.description)}</span><small>Key attributes · ${e(info.attributes.join(' · '))}</small><small>Tactical behaviour · ${e(info.behaviour)}</small>${current===name?'<i>Current role</i>':'<em>Select role</em>'}</button>`).join('')}</div></section></div>`;})():'';
  const phaseButtons=()=>`<div class="fm-shape-switch" role="group" aria-label="Team shape view">${[['combined','Combined'],['attack','In Possession'],['base','Out of Possession'],['both','Both']].map(([v,label])=>`<button type="button" data-board="phase|0|${v}" aria-pressed="${phase===v}">${label}</button>`).join('')}</div>`;
  const defenseOptions=[...Object.keys(D.FORMATIONS),'Custom'],attackChoices=B().phaseFormationOptions();
  const shapeFormationControls=`<div class="fm-shape-controls">${picker('Out of possession','tactic',defenseOptions,defenseChoice,v=>v==='Custom'&&defenseCustomNumber?`Custom (${defenseCustomNumber})`:v)}<label><span>In-possession formation</span><select aria-label="In-possession formation" data-attack-formation>${options(attackChoices,attackChoice,v=>v==='Custom'&&attackCustomNumber?`Custom (${attackCustomNumber})`:v)}</select></label>${picker('Mentality','mentality',['Very Defensive','Defensive','Cautious','Balanced','Positive','Attacking','Very Attacking'],s.mentality||'Balanced')}<label><span>Team system</span><select aria-label="Team system" data-system><option value="">${e(s.style||'Balanced shape')}</option>${options(Object.keys(Z.systems),plan.system)}</select></label></div>`;
  const undoSelection=plan.previousXI?.shape===s.tactic&&plan.previousXI.scope===(s.kitScope||'')?'<button type="button" data-board="undoXI">Undo selection</button>':'';const quickSelect=undoSelection?`<div class="fm-quick-actions">${undoSelection}</div>`:'';
  const viewSummary=`<div class="fm-phase-caption"><span>${phase==='attack'?'IN POSSESSION':phase==='both'?'PHASE COMPARISON':phase==='combined'?'AVERAGE POSITIONS':'OUT OF POSSESSION'}</span><b>${e(defenseLabel)} OOP · ${e(attackLabel)} IP</b></div>`;
  const shapeToolbar=()=>`<div class="fm-shape-toolbar">${phaseButtons()}</div>`;
  const shapeContent=phase==='both'?`<div class="fm-both-view">${shapeToolbar()}<div class="fm-both-pitches"><section class="fm-pitch-card${markerMenu?.key==='defense:wide'?' is-swap-open':''}"><header><b>Out of Possession</b><small>${e(defenseLabel)}</small></header>${field('defense','wide')}</section><section class="fm-pitch-card${markerMenu?.key==='attack:wide'?' is-swap-open':''}"><header><b>In Possession</b><small>${e(attackLabel)}</small></header>${field('attack','wide')}</section></div>${squad()}${quickSelect}</div>`:`<div class="fm-shape-workspace"><div class="fm-shape-main"><section class="fm-pitch-card fm-primary-pitch${markerMenu!==null?' is-swap-open':''}"><div class="fm-pitch-phases">${phaseButtons()}</div><h3 class="sr-only">${phase==='attack'?'In Possession':phase==='combined'?'Combined · average player positions':'Out of Possession'}</h3>${field(phase==='attack'?'attack':phase==='combined'?'combined':'defense')}${quickSelect}</section></div><aside class="fm-shape-side">${squad()}</aside></div>`;
  const selectedZoneLabel=zoneCells.find(z=>z.id===selectedZone)?.label||'Middle third · Centre';
  const zoneLabel=(row,col)=>`${zoneNames[row]} · ${zoneSide[col]}`;
  const selectedZonePositions=slots.filter((v,i)=>zoneOf((phase==='attack'?v.attack||v:v),i)===selectedZone);
  const zoneContext=zoneParts=>{
    const row=zoneParts[0],col=zoneParts[1],attack=row==='attack',center=col==='centre';
    if(phase==='attack')return attack?['tempo','width','build','deliveryCross']:row==='middle'?['passing','tempo','build','trigger']:['passing','build','won'];
    return attack?['press','trigger','block','step']:row==='middle'?['press','block','duels','trigger']:['line','block','step','duels'];
  };
  const instructionPhase=phaseRaw==='attack'?'attack':phaseRaw==='transition'?'transition':'defense',instructionKeys=instructionPhase==='transition'?[]:zoneContext(selectedZone.split('-'));
  const choiceValues=k=>k==='passing'?['Much shorter','Shorter','Standard','More direct','Much more direct']:k==='tempo'?['Much lower','Lower','Standard','Higher','Much higher']:k==='press'?['Much less often','Less often','Standard','More often','Much more often']:k==='width'?['Narrow','Fairly narrow','Standard','Fairly wide','Wide']:k==='line'?['Much lower','Lower','Standard','Higher','Much higher']:null;
  const instructionControl=k=>{
    const axis=choiceValues(k);
    if(axis){const value=inst.fine?.[k]??inst[k]??1,custom=Object.hasOwn(plan.instructions||{},k);return `<label class="fm-instruction-control" data-customized="${custom}"><span>${({passing:'Passing directness',tempo:'Tempo',press:'Trigger press',width:'Attacking width',line:'Defensive line'})[k]}${custom?'<i>EDITED</i>':''}</span><select data-axis="${k}">${axis.map((v,i)=>`<option value="${i/2}"${i/2===value?' selected':''}>${v}</option>`).join('')}</select></label>`;}
    const labels={build:'Build-up approach',deliveryCross:'Crossing style',trigger:'Press trigger',lost:'When possession is lost',won:'When possession is won',block:'Line of engagement',step:'Defensive line behaviour',duels:'Tackling approach',gk:'Goalkeeper tempo',target:'Goalkeeper target',delivery:'Goalkeeper distribution'};
    const values=Z.choicesTeam[k]||[];if(!values.length)return '';
    const chosen=inst.club?.[k],custom=Object.hasOwn(plan.orders||{},k);return `<label class="fm-instruction-control" data-customized="${custom}"><span>${labels[k]||k}${custom?'<i>EDITED</i>':''}</span><select data-order="${k}"><option value=""${chosen?'':' selected'}>Use system default</option>${options(values,chosen)}</select></label>`;
  };
  const contextualGroups=instructionPhase==='transition'?`${instructionControl('lost')}${instructionControl('won')}<section class="fm-transition-control-group"><h4>Goalkeeper distribution</h4>${instructionControl('gk')}${instructionControl('target')}${instructionControl('delivery')}</section>`:instructionKeys.map(k=>instructionControl(k)).filter(Boolean).join('');
  const zoneOverlay=instructionPhase==='transition'?`<div class="fm-transition-visual"><section><b>Possession lost</b></section><i aria-hidden="true">THEN</i><section><b>Possession won</b></section></div>`:field(instructionPhase,'portrait',true);
  const overview=()=>`<aside class="fm-tactical-overview"><dl><div><dt>Formation</dt><dd>${e(defenseLabel)}${plan.attackFormation?` / ${e(attackLabel)}`:''}</dd></div><div><dt>Mentality</dt><dd>${e(s.mentality||'Balanced')}</dd></div><div><dt>Pressing</dt><dd>${e(inst.club?.trigger||inst.trigger||'System default')}</dd></div><div><dt>Familiarity</dt><dd>${familiarity.position}% <small>positions</small></dd></div></dl><section class="fm-overview-risks">${warnings.length?`<b>Priority review</b>${shortRisks.map(t=>`<p class="fm-warning" title="${e(t.full)}">${e(t.short)}</p>`).join('')}`:''}</section></aside>`;
  const instructionContent=`<section class="fm-instruction-workspace"><aside class="fm-instruction-visual"><div class="fm-instruction-phase"><button type="button" data-board="phase|0|attack" aria-pressed="${instructionPhase==='attack'}">In Possession</button><button type="button" data-board="phase|0|transition" aria-pressed="${instructionPhase==='transition'}">Transitions</button><button type="button" data-board="phase|0|base" aria-pressed="${instructionPhase==='defense'}">Out of Possession</button></div>${zoneOverlay}</aside><div class="fm-instruction-side"><section class="fm-context-controls"><header><h3>${instructionPhase==='transition'?'Transitions & goalkeeper distribution':`${instructionPhase==='attack'?'In Possession':'Out of Possession'} · ${e(selectedZoneLabel)}`}</h3></header><div class="fm-context-control-list">${contextualGroups||'<p>No team instruction is assigned to this context.</p>'}</div>${instructionPhase==='transition'?'':`<section class="fm-player-context"><h4>Players in this area</h4>${selectedZonePositions.length?selectedZonePositions.map(v=>`<button type="button" data-slot="${slots.indexOf(v)}">${e(v.player?.name||'Open slot')} <small>${e(v.attackPosition||v.position)} · ${e(v.attackJob?.[0]||v.job[0])}</small></button>`).join(''):'<p>Choose another zone to inspect its assigned players.</p>'}</section>`}</section>${overview()}</div></section>${selected!=null?`<section class="fm-instruction-player-detail">${instructionEditor(slots[selected])}</section>`:''}`;
  const playerContent=`<section class="fm-player-workspace"><div class="fm-player-list"><header><h3>Player assignments</h3></header><div class="fm-squad-table"><table class="fm-sheet-table fm-player-table"><caption class="sr-only">Player assignments</caption><thead><tr>${['POS','Player','Fit'].map(label=>`<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>${slots.map(row).join('')}${bench.map(subRow).join('')}</tbody></table></div></div><div class="fm-player-detail">${instructionEditor(slots[selected==null?0:selected])}</div></section>`;
  const library=B().presetLibrary(s),savedOptions=library.map(x=>`<option value="${e(x.id)}"${s.activeTacticPreset===x.id?' selected':''}>${e(x.name)}</option>`).join('');
  const nav=[['shape','Team Shape'],['instructions','Team Instructions'],['players','Player Instructions']];
  const reviewLabel=warnings.length?`Needs review · ${warnings.length}`:'Ready for review',reviewHelp=warnings.length?warnings.map(w=>w.text).join('\n'):'No structural risks are currently flagged.';
  const header=`<header class="fm-workspace-header${libraryOpen?' is-library-open':''}"><div class="fm-title-group"><small>TACTICS · ${e(s.club?.name||'FIRST TEAM')}</small><h2>${e(plan.system||s.style||'Balanced shape')}</h2><p><span>${e(defenseLabel)} OOP</span><i aria-hidden="true"></i><span>${e(attackLabel)} IP</span><em>${e(s.mentality||'Balanced')} mentality</em></p></div><button type="button" class="fm-library-toggle" data-library-toggle aria-expanded="${libraryOpen}">Tactics library</button><div class="fm-save-controls"><label class="sr-only" for="fm-tactic-name">Saved tactic name</label><input id="fm-tactic-name" type="text" data-preset-name maxlength="48" placeholder="Name this tactic"><button type="button" data-library-action="save">Save tactic</button><select aria-label="Load saved tactic" data-preset-select><option value="">Saved tactics</option>${savedOptions}</select><button type="button" data-library-action="load" ${library.length?'':'disabled'}>Load</button></div></header>`;
  const attentionActions=(g.TLDeskAttention&&g.TLDeskAttention.badges?(g.TLDeskAttention.badges(s,'tactics').actions||{}):{});const reviewEntries=Object.entries(attentionActions).filter(([,v])=>Number(v)>0);const reviewCount=reviewEntries.reduce((n,[,v])=>n+Number(v),0);const reviewTarget=reviewEntries.length?(reviewEntries[0][0]==='home'?'interviewDesk':reviewEntries[0][0]):'';const reviewBadge=reviewCount?`<button type="button" class="fm-review-badge" data-life="go" data-v="${reviewTarget}" title="${reviewCount} to review · open" aria-label="${reviewCount} to review · open">${reviewCount}</button>`:'';const workspaceNav=`<div class="fm-desk-bar"><nav class="fm-workspace-nav" aria-label="Tactical workspace">${nav.map(([id,label])=>`<button type="button" data-workspace-tab="${id}" aria-current="${workspaceTab===id?'page':'false'}">${label}</button>`).join('')}</nav><div class="fm-header-metrics">${reviewBadge}<span><small>Familiarity</small><b>${familiarity.position}%</b><i><b style="width:${familiarity.position}%"></b></i></span><span><small>Intensity</small><b>${intensity}%</b><i><b style="width:${intensity}%"></b></i></span><span class="fm-status-chip ${warnings.length?'has-risks':'is-clear'}" role="status" title="${e(reviewHelp)}">${e(reviewLabel)}</span></div></div>`;
  const content=workspaceTab==='instructions'?instructionContent:workspaceTab==='players'?playerContent:shapeContent;
  const strip=`<div class="fm-tactics-strip"><span class="fm-strip-label">TOUCHLINE 26 <i aria-hidden="true">/</i> MATCH PREPARATION</span><div class="fm-strip-controls">${shapeFormationControls}</div></div>`;
  return `<section class="board-room fm-tactics-workspace">${strip}${header}${workspaceNav}<main class="fm-workspace-content" data-workspace="${workspaceTab}">${content}</main>${roleDialog}</section>`;
}
function bind(root,change,draw){
 let drag=null,suppressUntil=0;
 const act=value=>{
  const [cmd,a,b]=value.split('|'),i=cmd==='move'?a:null;
  if(cmd==='bench'){selected=null;selectedBench=b||a;draw();return;}
  const button=()=>root.querySelector(`.shape-field [data-slot="${i}"]`),before=i&&button()?.getBoundingClientRect();
  if(['bestXI','rotate','undoXI','preset','loadPreset','importPreset','move'].includes(cmd)){selected=null;selectedBench=null;}
  else if(['pick','swap'].includes(cmd)){selected=Number(a);selectedBench=null;}
  change('matchBoard',value);
  const after=i&&button()?.getBoundingClientRect();
  if(before&&after&&!matchMedia('(prefers-reduced-motion: reduce)').matches)button().animate([{translate:`${before.left-after.left}px ${before.top-after.top}px`},{translate:'0 0'}],{duration:170,easing:'ease-out'});
 };
 root.addEventListener('change',ev=>{
  if(ev.target.hasAttribute('data-tactic-import')){const file=ev.target.files?.[0];if(file)file.text().then(text=>change('matchBoard',`importPreset|0|${encodeURIComponent(text)}`)).catch(()=>change('matchBoard','importPreset|0|invalid'));return;}
  else if(ev.target.hasAttribute('data-plan')){if(ev.target.dataset.plan==='tactic')act(`formation|0|${ev.target.value}`);else if(ev.target.dataset.plan==='mentality')act(`mentality|0|${ev.target.value}`);}
  else if(ev.target.hasAttribute('data-marker-role')){const [rolePhase,index]=ev.target.dataset.markerRole.split('|');if(rolePhase==='attack')act(`phaseJob|attack|${index}|${ev.target.value}`);else act(`job|${index}|${ev.target.value}`);}
  else if(ev.target.hasAttribute('data-attack-formation'))act(`attackFormation|0|${ev.target.value}`);
  else if(ev.target.hasAttribute('data-phase-job')){const [phase,index]=ev.target.dataset.phaseJob.split('|');act(`phaseJob|${phase}|${index}|${ev.target.value}`);}
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
 const afterPaint=fn=>{if(typeof requestAnimationFrame==='function')requestAnimationFrame(fn);else fn();};
 function placeMenu(){
  const menu=root.querySelector('.fm-marker-player.is-open > .fm-marker-menu');
  if(!menu)return;
  const card=menu.closest('.fm-marker-card'),pitch=menu.closest('.shape-field')||card,wrap=menu.parentElement;
  if(!card||!wrap)return;
  for(const key of ['top','bottom','left','right','transform','maxHeight'])menu.style.removeProperty(key);
  menu.classList.remove('menu-up','menu-start','menu-end');
  const wr=wrap.getBoundingClientRect(),cb=card.getBoundingClientRect(),pr=pitch.getBoundingClientRect();
  const gap=5,pad=6,edgeLeft=pr.left+pad,edgeRight=Math.min(pr.right,innerWidth)-pad,edgeTop=pad,edgeBottom=innerHeight-pad;
  const roomBelow=edgeBottom-cb.bottom-gap,roomAbove=cb.top-edgeTop-gap,height=menu.getBoundingClientRect().height;
  const up=roomBelow<height&&roomAbove>roomBelow;
  if(up){menu.style.setProperty('top','auto');menu.style.setProperty('bottom',Math.round(Math.max(0,wr.bottom-cb.top)+gap)+'px');}
  else menu.style.setProperty('bottom','auto');
  const room=Math.max(0,up?roomAbove:roomBelow);
  if(height>room)menu.style.setProperty('max-height',Math.max(72,Math.floor(room))+'px');
  let box=menu.getBoundingClientRect();
  if(box.left<edgeLeft){menu.style.setProperty('left',Math.round(edgeLeft-wr.left)+'px');menu.style.setProperty('transform','none');}
  else if(box.right>edgeRight){menu.style.setProperty('left',Math.round(edgeRight-wr.left-box.width)+'px');menu.style.setProperty('transform','none');}
 }
 root.addEventListener('click',ev=>{
  if(performance.now()<suppressUntil&&ev.target.closest('.shape-field,.fm-squad-panel .fm-row'))return;
  if(markerMenu!==null&&!ev.target.closest?.('.fm-marker-player')){markerMenu=null;draw();}
  if(ev.target.closest('[data-player-pick]')||ev.target.closest('select'))return;
  const field=ev.target.closest?.('.shape-field');
  if(field&&!ev.target.closest('.shape-field [data-slot],.shape-field [data-role-target],.fm-zone-overlay,.fm-pitch-marker')){if(selected!==null||selectedBench){selected=null;selectedBench=null;draw();}return;}
  const benchRow=ev.target.closest('.fm-sub[data-board]');
  if(benchRow){act(benchRow.dataset.board);return;}
  const row=ev.target.closest('.fm-row[data-slot]');
  const b=ev.target.closest('button');
  if(b?.hasAttribute('data-bench-toggle')){benchOpen=!benchOpen;const panel=root.querySelector('.fm-squad-panel');panel?.classList.toggle('is-bench-open',benchOpen);b.setAttribute('aria-expanded',String(benchOpen));const hint=b.querySelector('small');if(hint)hint.textContent=benchOpen?'Hide':'Show';return;}
  if(b?.hasAttribute('data-library-toggle')){libraryOpen=!libraryOpen;root.querySelector('.fm-workspace-header')?.classList.toggle('is-library-open',libraryOpen);b.setAttribute('aria-expanded',String(libraryOpen));if(libraryOpen)root.querySelector('#fm-tactic-name')?.focus?.();return;}
  if(b?.hasAttribute('data-role-picker-open')){markerMenu=null;rolePicker={slot:Number(b.dataset.rolePickerOpen),phase:b.dataset.rolePickerPhase==='attack'?'attack':'defense'};draw();root.querySelector('[data-role-picker-close]')?.focus?.();return;}
  if(b?.hasAttribute('data-role-picker-close')){const target=rolePicker;rolePicker=null;draw();root.querySelector(`[data-role-picker-open="${target?.slot}"][data-role-picker-phase="${target?.phase}"]`)?.focus?.();return;}
  if(b?.hasAttribute('data-role-choice')){const slot=b.dataset.roleChoiceSlot,phase=b.dataset.roleChoicePhase,job=b.dataset.roleChoice;rolePicker=null;act(`phaseJob|${phase}|${slot}|${job}`);draw();root.querySelector(`[data-role-picker-open="${slot}"][data-role-picker-phase="${phase}"]`)?.focus?.();return;}
  if(ev.target.classList?.contains('fm-role-dialog-backdrop')){rolePicker=null;draw();return;}
  if(b?.dataset.workspaceTab){workspaceTab=b.dataset.workspaceTab;selected=null;selectedBench=null;rolePicker=null;draw();return;}
  if(b?.dataset.tacticJump){root.querySelector('#tactic-'+b.dataset.tacticJump)?.scrollIntoView({behavior:'smooth',block:'start'});return;}
  if(b?.dataset.libraryAction){const id=root.querySelector('[data-preset-select]')?.value,name=root.querySelector('[data-preset-name]')?.value?.trim()||'',action=b.dataset.libraryAction;if(action==='save')act(`savePreset|0|${name}`);else if(!id)return;else if(action==='load')act(`loadPreset|0|${id}`);else if(action==='rename')act(`renamePreset|0|${id}|${name}`);else if(action==='duplicate')act(`duplicatePreset|0|${id}|${name}`);else if(action==='delete')act(`deletePreset|0|${id}`);return;}
  if(b?.hasAttribute('data-tactic-export')){const name=root.querySelector('[data-preset-select]')?.selectedOptions?.[0]?.textContent||`${s.tactic} ${B().active(s).system||'Custom'}`,data={version:1,name,formation:Object.hasOwn(g.TLData.FORMATIONS,B().active(s).defenseFormation)?B().active(s).defenseFormation:s.tactic,plan:B().copyPlan(B().active(s))},blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'tactic'}.json`;a.click();URL.revokeObjectURL(url);return;}
  if(b?.dataset.board){act(b.dataset.board);return;}
  if(b?.hasAttribute('data-clear-slot')){selected=null;selectedBench=null;draw();return;}
  if(b?.hasAttribute('data-marker-substitute')&&b.classList.contains('fm-marker-player-trigger')){const i=Number(b.dataset.markerSubstitute),fieldEl=ev.target.closest?.('.shape-field'),viewKey=fieldEl?`${fieldEl.dataset.phaseView||''}:${fieldEl.dataset.orientation||''}`:null;markerMenu=markerMenu&&markerMenu.slot===i&&markerMenu.key===viewKey?null:{slot:i,key:viewKey};draw();if(markerMenu!==null){root.querySelector(`[data-marker-substitute="${i}"]`)?.focus?.({preventScroll:true});afterPaint(placeMenu);}return;}
  if(b?.hasAttribute('data-marker-pick')){const i=b.dataset.markerSlot,pick=b.dataset.markerPick;markerMenu=null;act(`pick|${i}|${pick}`);draw();return;}
  if(b?.hasAttribute('data-marker-close')){const i=Number(b.dataset.markerClose);markerMenu=null;draw();root.querySelector(`[data-marker-substitute="${i}"]`)?.focus?.({preventScroll:true});return;}
  if(b?.hasAttribute('data-marker-remove')){const i=Number(b.dataset.markerRemove);markerMenu=null;selected=null;selectedBench=null;act(`clear|${i}`);draw();return;}
  const cardTap=ev.target.closest('.fm-pitch-marker .fm-marker-card');
  if(cardTap&&!ev.target.closest('button,select,label,input')){const tapSlot=cardTap.querySelector('[data-slot]')?.dataset.slot;if(tapSlot!=null){const i=+tapSlot;if(selectedBench)act(`pick|${i}|${selectedBench}`);else{selected=selected===i?null:i;draw();}}return;}
  if(row||b?.hasAttribute('data-slot')){const target=row||b,i=+target.dataset.slot;if(selectedBench)act(`pick|${i}|${selectedBench}`);else{selected=selected===i?null:i;draw();}return;}
 });
 root.addEventListener('keydown',ev=>{
  if(ev.key==='Escape'&&markerMenu!==null){const i=markerMenu.slot;markerMenu=null;draw();root.querySelector(`[data-marker-substitute="${i}"]`)?.focus?.();return;}
  if(ev.key==='Escape'&&rolePicker){const target=rolePicker;rolePicker=null;draw();root.querySelector(`[data-role-picker-open="${target.slot}"][data-role-picker-phase="${target.phase}"]`)?.focus?.();return;}
  if(ev.key==='Tab'&&rolePicker){const items=[...root.querySelectorAll('.fm-role-dialog button:not(:disabled)')],first=items[0],last=items.at(-1);if(ev.shiftKey&&ev.target===first){ev.preventDefault();last?.focus();return;}if(!ev.shiftKey&&ev.target===last){ev.preventDefault();first?.focus();return;}}
  if(ev.target.closest('select,input,textarea,button,[contenteditable="true"]'))return;
  const benchRow=ev.target.closest('.fm-sub[data-board][role="button"]');
  if(benchRow&&['Enter',' '].includes(ev.key)){ev.preventDefault();act(benchRow.dataset.board);return;}
  const row=ev.target.closest('.fm-row[data-slot][role="button"]');
  if(!row||!['Enter',' '].includes(ev.key))return;
  ev.preventDefault();const i=+row.dataset.slot;
  if(selectedBench)act(`pick|${i}|${selectedBench}`);else{selected=selected===i?null:i;draw();}
 });
 function begin(ev){
  if(!ev.isPrimary||ev.button!==0)return;
  const shirt=ev.target.closest('.shape-field [data-slot]'),row=shirt?null:ev.target.closest('.fm-squad-panel .fm-row[data-player-id]');
  if((!shirt&&!row)||(row&&(!row.dataset.playerId||ev.target.closest('select,input,option'))))return;
  drag={id:ev.pointerId,kind:shirt?'shirt':'player',shirt,row,playerId:shirt?.dataset.playerId||row?.dataset.playerId,playerLabel:row?.querySelector('.fm-person span')?.textContent||row?.dataset.playerId,x:ev.clientX,y:ev.clientY,source:shirt||row,markerCard:shirt?.closest('.fm-pitch-marker'),origin:shirt?.closest('.fm-pitch-marker')?.getBoundingClientRect?.()||shirt?.getBoundingClientRect?.()||row?.getBoundingClientRect?.()||null,moving:false,hover:null};
 }
 root.addEventListener('pointerdown',begin);
 root.addEventListener('pointermove',ev=>{
  if(drag?.id!==ev.pointerId)return;
  if(!drag.moving&&Math.hypot(ev.clientX-drag.x,ev.clientY-drag.y)<7)return;
  if(!drag.moving){root.setPointerCapture?.(ev.pointerId);drag.captured=true;}
  drag.moving=true;drag.markerCard?.classList.add('fm-marker-dragging');
  if(drag.kind==='player'&&!drag.rowDetached){
   const detach=drag.source,r=detach.getBoundingClientRect(),isRow=detach.tagName==='TR',placeholder=document.createElement(isRow?'tr':'div'),cellWidths=isRow?[...detach.cells].map(()=>0):[];
   placeholder.className='fm-drag-placeholder';
   if(isRow){const spacer=document.createElement('td');spacer.colSpan=cellWidths.length||99;spacer.style.height=`${r.height}px`;placeholder.append(spacer);}
   else{placeholder.style.height=`${r.height}px`;placeholder.style.width=`${r.width}px`;}
   drag.source.parentNode?.insertBefore(placeholder,drag.source);drag.placeholder=placeholder;
   if(isRow){
    drag.source.classList.add('fm-drag-hidden');
    const ghost=document.createElement('div'),tag=document.createElement('b'),who=document.createElement('span'),fit=document.createElement('i');
    ghost.className='fm-drag-ghost';
    tag.textContent=drag.source.querySelector('.fm-sheet-pos')?.textContent.trim()||'';
    who.textContent=drag.playerLabel||'';
    fit.textContent=drag.source.querySelector('.fm-sheet-fit')?.textContent.trim().split('·')[0].trim()||'';
    ghost.append(tag,who,fit);
    Object.assign(ghost.style,{position:'fixed',left:'0px',top:'0px',zIndex:'99999',pointerEvents:'none'});
    drag.ghostOffset={x:Math.min(Math.max(drag.x-r.left,26),150),y:Math.max(drag.y-r.top,20)};
    document.body.appendChild(ghost);drag.holder=ghost;
   }else{
    document.body.appendChild(drag.source);Object.assign(drag.source.style,{position:'fixed',left:`${r.left}px`,top:`${r.top}px`,width:`${r.width}px`,margin:'0',zIndex:'99999',pointerEvents:'none'});
   }
   drag.rowDetached=true;
  }
  (drag.holder||drag.source).classList.add('fm-drag-source');
  const under=document.elementFromPoint(ev.clientX,ev.clientY),field=under?.closest('.shape-field'),directExact=under?.closest('.shape-field [data-slot]'),directRole=under?.closest('.shape-field [data-role-target]');
  if(drag.activeField!==field){drag.activeField?.classList?.remove('fm-dragging');drag.activeField=field;field?.classList?.add('fm-dragging');}
  const roleTarget=directRole||(directExact?null:nearestTarget(field,'[data-role-target]',ev.clientX,ev.clientY)),exact=directExact||(roleTarget?null:nearestTarget(field,'[data-slot]',ev.clientX,ev.clientY)),preview=roleTarget||exact;
  const destination=roleTarget?.dataset.roleSlot??preview?.dataset.slot,playerKeeper=drag.kind==='shirt'?drag.shirt.dataset.slot==='0':drag.row.dataset.playerPos==='GK',valid=!!field&&(roleTarget?((roleTarget.dataset.roleKeeper==='true')===playerKeeper):drag.kind==='shirt'||!!preview&&((destination==='0')===playerKeeper)),hover=preview||null;
  if(drag.hover!==hover){drag.hover?.classList.remove('fm-drop-target','fm-drop-invalid');drag.hover=hover;}
  if(hover)hover.classList.add(valid?'fm-drop-target':'fm-drop-invalid');
  const targetRect=valid?hover?.getBoundingClientRect?.():null;
  const mover=(drag.kind==='shirt'&&drag.markerCard)||drag.detached||drag.holder||drag.source;
  if(drag.kind==='shirt'&&drag.origin&&targetRect){mover.classList.add('fm-snap-preview');mover.style.translate=`${targetRect.left+targetRect.width/2-drag.origin.left-drag.origin.width/2}px ${targetRect.top+targetRect.height/2-drag.origin.top-drag.origin.height/2}px`;}
  else{mover.classList.remove('fm-snap-preview');mover.style.translate=drag.ghostOffset?`${ev.clientX-drag.ghostOffset.x}px ${ev.clientY-drag.ghostOffset.y}px`:`${ev.clientX-drag.x}px ${ev.clientY-drag.y}px`;}
  drag.drop={field,marker:exact,preview,valid};
 });
 function restore(d){
  const back=d.detached||d.source,mover=(d.kind==='shirt'&&d.markerCard)||d.detached||d.holder||d.source;
  if(d.rowDetached&&d.placeholder?.parentNode){d.placeholder.parentNode.insertBefore(back,d.placeholder);d.placeholder.remove();for(const key of ['position','left','top','width','height','transform','margin','zIndex','pointerEvents'])back.style[key]='';if(d.holder){d.holder.remove();d.holder=null;}back.classList.remove('fm-drag-hidden');d.detached=null;d.ghostOffset=null;}
  d.activeField?.classList?.remove('fm-dragging');d.markerCard?.classList.remove('fm-marker-dragging');mover.style.translate='';mover.classList.remove('fm-drag-source','fm-snap-preview');
 }
 function finish(ev,cancel){
  if(drag?.id!==ev.pointerId)return;
  const d=drag;drag=null;d.hover?.classList.remove('fm-drop-target','fm-drop-invalid');
  if(!d.moving)return;
  suppressUntil=performance.now()+350;
  if(cancel){restore(d);return;}
  const under=document.elementFromPoint(ev.clientX,ev.clientY),field=under?.closest('.shape-field'),directExact=under?.closest('.shape-field [data-slot]'),directRole=under?.closest('.shape-field [data-role-target]'),roleTarget=directRole||(directExact?null:nearestTarget(field,'[data-role-target]',ev.clientX,ev.clientY)),exact=directExact||(roleTarget?null:nearestTarget(field,'[data-slot]',ev.clientX,ev.clientY)),preview=roleTarget||exact;
  if(d.kind==='player'){
   const destination=roleTarget?.dataset.roleSlot??preview?.dataset.slot;
   if(!field||!preview||(roleTarget?roleTarget.dataset.roleKeeper==='true':destination==='0')!==(d.row.dataset.playerPos==='GK')){restore(d);return;}
   const slot=Number(destination),placement=roleTarget?(roleTarget.dataset.rolePhase==='combined'?`move|${slot}|${roleTarget.dataset.roleX}|${roleTarget.dataset.roleY}|combined`:roleTarget.dataset.roleJob?`moveRole|${slot}|${roleTarget.dataset.roleX}|${roleTarget.dataset.roleY}|${roleTarget.dataset.roleJob}|${roleTarget.dataset.rolePhase}`:`move|${slot}|${roleTarget.dataset.roleX}|${roleTarget.dataset.roleY}|${roleTarget.dataset.rolePhase}`):null;restore(d);
   act(`pick|${slot}|${d.playerId}`);if(placement)act(placement);
  }else{
   if(!field||(!roleTarget&&!exact)){restore(d);return;}
   if(roleTarget&&(roleTarget.dataset.roleKeeper==='true')!==(d.shirt.dataset.slot==='0')){restore(d);return;}
   if(exact&&exact.dataset.slot===String(d.shirt.dataset.slot)&&!roleTarget){restore(d);return;}
   const command=roleTarget?(roleTarget.dataset.rolePhase==='combined'?`move|${d.shirt.dataset.slot}|${roleTarget.dataset.roleX}|${roleTarget.dataset.roleY}|combined`:roleTarget.dataset.roleJob?`moveRole|${d.shirt.dataset.slot}|${roleTarget.dataset.roleX}|${roleTarget.dataset.roleY}|${roleTarget.dataset.roleJob}|${roleTarget.dataset.rolePhase}`:`move|${d.shirt.dataset.slot}|${roleTarget.dataset.roleX}|${roleTarget.dataset.roleY}|${roleTarget.dataset.rolePhase}`):`swap|${d.shirt.dataset.slot}|${exact.dataset.slot}`;restore(d);act(command);
  }
 }
 root.addEventListener('pointerup',ev=>finish(ev,false));
 root.addEventListener('pointercancel',ev=>finish(ev,true));
 root.addEventListener('lostpointercapture',ev=>finish(ev,true));
}g.TLBoardRoom={render,bind,project,positionalNumbers};})(typeof window==='undefined'?globalThis:window);
