/* A career plan stores catalogue IDs and pitch coordinates, never copies of players. */
(function(g){'use strict';
const D=g.TLData||require('./data');
const Z=g.TLZones||require('./tactical-zones');
const spots=f=>[{role:'GK',x:.035,y:.5},...D.FORMATIONS[f]];
function active(s){return s.boards?.[s.boardIndex||0]||{};}
function copyPlan(plan){return JSON.parse(JSON.stringify(plan||{}));}
function presetLibrary(s){if(!Array.isArray(s.tacticLibrary))s.tacticLibrary=[];return s.tacticLibrary;}
function nextPresetId(s,library){const prefix=`saved-${Number(s.day)||0}-`,highest=library.reduce((n,x)=>typeof x.id==='string'&&x.id.startsWith(prefix)?Math.max(n,Number(x.id.slice(prefix.length))||0):n,0);s.tacticPresetSeq=Math.max(Number(s.tacticPresetSeq)||0,highest)+1;return prefix+s.tacticPresetSeq;}
function safePlan(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('This tactic has no valid plan.');
 const out={},copyCoords=(v)=>v&&typeof v==='object'&&!Array.isArray(v)&&Number.isFinite(+v.x)&&Number.isFinite(+v.y)&&+v.x>=0&&+v.x<=1&&+v.y>=0&&+v.y<=1?{x:+v.x,y:+v.y,...(typeof v.role==='string'&&Object.hasOwn(Z.families,v.role)?{role:v.role}:{})}:null;
 if(Object.hasOwn(D.FORMATIONS,raw.quickShape))out.quickShape=raw.quickShape;
 if(Array.isArray(raw.ids))out.ids=raw.ids.slice(0,11).map(x=>typeof x==='string'?x.slice(0,96):null);
 for(const k of ['jobs','duties'])if(Array.isArray(raw[k]))out[k]=raw[k].slice(0,11).map(x=>typeof x==='string'?x.slice(0,48):null);
 if(Array.isArray(raw.moves))out.moves=raw.moves.slice(0,11).map(copyCoords);
 if(Array.isArray(raw.attack))out.attack=raw.attack.slice(0,11).map(copyCoords);
 if(raw.attackByPlayer&&typeof raw.attackByPlayer==='object'&&!Array.isArray(raw.attackByPlayer))out.attackByPlayer=Object.fromEntries(Object.entries(raw.attackByPlayer).slice(0,30).filter(([,v])=>copyCoords(v)).map(([id,v])=>[id.slice(0,96),copyCoords(v)]));
 if(['Same as defensive shape','3-2-5','Custom',...Object.keys(D.FORMATIONS)].includes(raw.attackFormation))out.attackFormation=raw.attackFormation;
 if(Object.hasOwn(Z.systems,raw.system))out.system=raw.system;
 if(raw.orders&&typeof raw.orders==='object'&&!Array.isArray(raw.orders))out.orders=Object.fromEntries(Object.entries(raw.orders).filter(([k,v])=>Object.hasOwn(Z.choicesTeam,k)&&Z.choicesTeam[k].includes(v)));
 if(raw.instructions&&typeof raw.instructions==='object'&&!Array.isArray(raw.instructions))out.instructions=Object.fromEntries(Object.entries(raw.instructions).filter(([k,v])=>Z.axes.includes(k)&&Number.isFinite(+v)&&+v>=0&&+v<=2).map(([k,v])=>[k,+v]));
 if(raw.phaseJobs&&typeof raw.phaseJobs==='object'&&!Array.isArray(raw.phaseJobs)){out.phaseJobs={};for(const [id,phases] of Object.entries(raw.phaseJobs).slice(0,30)){if(!phases||typeof phases!=='object'||Array.isArray(phases))continue;const clean={};for(const phase of ['attack','defense']){const x=phases[phase];if(!x||typeof x!=='object'||Array.isArray(x))continue;const row={};if(typeof x.job==='string'&&Object.hasOwn(Z.jobs,x.job))row.job=x.job;if(typeof x.duty==='string'&&row.job&&Z.jobs[row.job].duties.includes(x.duty))row.duty=x.duty;if(Object.keys(row).length)clean[phase]=row;}if(Object.keys(clean).length)out.phaseJobs[id.slice(0,96)]=clean;}}
 if(raw.playerInstructions&&typeof raw.playerInstructions==='object'&&!Array.isArray(raw.playerInstructions)){out.playerInstructions={};for(const [id,phases] of Object.entries(raw.playerInstructions).slice(0,30)){if(!phases||typeof phases!=='object'||Array.isArray(phases))continue;const clean={};for(const phase of ['attack','defense']){const vals=phases[phase];if(!vals||typeof vals!=='object'||Array.isArray(vals))continue;const row=Object.fromEntries(Object.entries(vals).filter(([k,v])=>Object.hasOwn(Z.individualInstructions,k)&&Z.individualInstructions[k].includes(v)));if(Object.keys(row).length)clean[phase]=row;}if(Object.keys(clean).length)out.playerInstructions[id.slice(0,96)]=clean;}}
 if(raw.responses&&typeof raw.responses==='object'){const entries=Array.isArray(raw.responses)?raw.responses.map((v,i)=>[i,v]):Object.entries(raw.responses);out.responses=Array.isArray(raw.responses)?[]:{};for(const [key,v] of entries.slice(0,11)){if(!v||typeof v!=='object'||Array.isArray(v))continue;const row={};for(const [kind,choices] of Object.entries(overrides))if(choices.includes(v[kind])&&v[kind]!=='Team instruction')row[kind]=v[kind];if(Object.keys(row).length)out.responses[key]=row;}}
 if(raw.familiarity&&typeof raw.familiarity==='object'&&!Array.isArray(raw.familiarity)){out.familiarity={};for(const [id,reps] of Object.entries(raw.familiarity).slice(0,30)){if(!reps||typeof reps!=='object'||Array.isArray(reps))continue;out.familiarity[id.slice(0,96)]=Object.fromEntries(Object.entries(reps).filter(([k,v])=>(Object.hasOwn(Z.jobs,k)||k.startsWith('zone:')||k.startsWith('scheme:'))&&Number.isFinite(+v)&&+v>=0&&+v<=20).map(([k,v])=>[k,+v]));}}
 return out;
}
const overrides={loss:['Team instruction','Hunt the ball','Recover position'],gain:['Team instruction','Break forward','Offer support']};
// Sort keys so recreating the same instructions in another order counts as rehearsal.
function stable(v){return v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;}
function scheme(f,plan){return 'scheme:'+D.seedFor(JSON.stringify(stable([f,...['system','orders','instructions','moves','attack','attackByPlayer','attackFormation','phaseJobs','playerInstructions','responses'].map(k=>plan[k]||null)])));}
function frontFive(slots){const byDepth=slots.map((v,i)=>({...v,i})).slice(1).sort((a,b)=>a.x-b.x||a.y-b.y);const attack={};let start=0;for(const [n,x] of [[3,.18],[2,.43],[5,.76]]){byDepth.slice(start,start+n).sort((a,b)=>a.y-b.y).forEach((v,j)=>attack[v.i]={x,y:(j+.5)/n});start+=n;}return attack;}
const phaseFormationOptions=()=>['Same as defensive shape','3-2-5',...Object.keys(D.FORMATIONS),'Custom'];
function phaseTargets(slots,formation){
 if(!formation||formation==='Same as defensive shape')return {};
 const result={};
 if(formation==='3-2-5'){
  const indexed=frontFive(slots);
  for(const [i,pos] of Object.entries(indexed)){const p=slots[i]?.player;if(p)result[p.id]={...pos,role:Z.zone(pos.x,pos.y)};}
  return result;
 }
 const form=D.FORMATIONS[formation];if(!form)return result;
 const available=slots.slice(1).filter(v=>v.player).map(v=>({slot:v,player:v.player}));
 for(const target of [...form].sort((a,b)=>a.x-b.x||a.y-b.y)){
  if(!available.length)break;
  available.sort((a,b)=>{
   const score=x=>D.roleFit(x.player.pos,target.role)*4-Math.hypot(x.slot.x-target.x,x.slot.y-target.y)*.55;
   return score(b)-score(a);
  });
  const chosen=available.shift();result[chosen.player.id]={x:target.x,y:target.y,role:Z.zone(target.x,target.y)};
 }
 return result;
}
function setPhaseFormation(s,plan,formation,slots){
 if(!phaseFormationOptions().includes(formation))throw Error('Choose a supported in-possession formation.');
 plan.attackFormation=formation;
 if(formation==='Custom')return;
 plan.attackByPlayer=phaseTargets(slots,formation);
 delete plan.attack;
 s.boardPhase='attack';
}
function sheet(f,plan,players){
 const rehearsal=scheme(f,plan),base=spots(f),auto=D.bestXI(players,f).xi,used=new Set(),slots=base.map((v,i)=>{
  const p=players.find(p=>p.id===plan.ids?.[i]&&!p.red&&(p.pos==='GK')===(i===0));if(p)used.add(p.id);
  const move=plan.moves?.[i],pos=move?Z.zone(move.x,move.y,!i):({GK:'GK',DC:'CB',FB:v.y<.5?'LB':'RB',WB:v.y<.5?'LWB':'RWB',W:v.x<.54?(v.y<.5?'ML':'MR'):(v.y<.5?'LW':'RW'),ST:'CF'})[v.role]||v.role;
  const options=Z.choices(pos),job=options.includes(plan.jobs?.[i])?plan.jobs[i]:options[0];
  return {...v,...move,position:pos,scheme:rehearsal,response:plan.responses?.[i]||{},role:Z.families[pos],experience:plan.familiarity?.[p?.id]?.[job]||0,job:[job,null,Z.duty(job,plan.duties?.[i])],player:p};
 });
 slots.forEach((v,i)=>{if(v.player||plan.quickShape===f&&plan.ids?.[i]===null)return;const fits=p=>!used.has(p.id)&&!p.red&&(p.pos==='GK')===(i===0);const p=auto.find(a=>a.x===base[i].x&&a.y===base[i].y&&fits(a.player))?.player||players.filter(fits).sort((a,b)=>score(b,v.role)-score(a,v.role))[0];if(p){v.player=p;used.add(p.id);}});
 const generated=plan.attackFormation&&plan.attackFormation!=='Custom'?phaseTargets(slots,plan.attackFormation):{};
 slots.forEach((v,i)=>{
  const id=v.player?.id,point=(id&&plan.attackByPlayer?.[id])||plan.attack?.[i]||(id&&generated[id]);
  if(point){v.attack={x:point.x,y:point.y};v.attackPosition=point.role||Z.zone(point.x,point.y,!i);v.attackRole=Z.families[v.attackPosition]||v.role;}
  const phases=plan.phaseJobs?.[id]||{},a=phases.attack||{},d=phases.defense||{};
  const attackChoices=Z.choices(v.attackPosition||v.position),attackJob=attackChoices.includes(a.job)?a.job:attackChoices.includes(v.job[0])?v.job[0]:attackChoices[0];
  v.attackJob=[attackJob,null,Z.duty(attackJob,a.duty)];
  v.defenseJob=[v.job[0],null,Z.duty(v.job[0],d.duty||v.job[2])];
  v.instructions=plan.playerInstructions?.[id]||{};
  v.experience=plan.familiarity?.[id]?.[v.job[0]]||0;
 });
 return {slots,bench:players.filter(p=>!used.has(p.id))};
}
const score=(p,r)=>D.ROLE_WEIGHTS[r](p.attrs)*D.roleFit(p.pos,r);
// Maximum-weight assignment over the eleven pitch slots. Each player can enter
// only once; a versatile player cannot steal a specialist's only viable slot.
function quickXI(s,slots,players,mode,squad){const stars=mode==='bestXI'?(g.TLDynamics||require('./team-dynamics')).squadStars(squad):null,current=new Set(slots.map(v=>v.player?.id)),ready=(g.TLDynamics||require('./team-dynamics')).snapshot(s,players).players;
 const pool=players.filter(p=>!p.red&&!ready[p.id].knock),size=1<<slots.length,dp=new Float64Array(size).fill(-Infinity),steps=[];dp[0]=0;
 for(const p of pool){const log=new Int8Array(size),r=ready[p.id],weights=slots.map((v,i)=>{if((p.pos==='GK')!==(i===0))return -Infinity;
 const fit=Z.fit(p,v.position,v.job[0],s.boardReps?.[p.id]),quality=score(p,v.role),bench=mode==='rotate'&&!current.has(p.id)?32:0;
 const ability=stars?18*stars[p.id]*D.roleFit(p.pos,v.role):0;
 return 1000+ability+fit+.35*quality+(mode==='rotate'?.4:.12)*r.fitness+.05*r.sharp+bench;});
 for(let mask=size-1;mask>=0;mask--){if(!Number.isFinite(dp[mask]))continue;for(let i=0;i<slots.length;i++){const bit=1<<i;if(mask&bit)continue;const next=mask|bit,w=dp[mask]+weights[i];if(w>dp[next]){dp[next]=w;log[next]=i+1;}}}steps.push(log);}
 let best=0;for(let i=1;i<size;i++)if(dp[i]>dp[best])best=i;const ids=slots.map(()=>null);for(let j=pool.length-1;j>=0;j--){const i=steps[j][best]-1;if(i>=0){ids[i]=pool[j].id;best^=1<<i;}}return ids;}
function update(s,raw,players,squad=players){const [cmd,a,b,c,d]=raw.split('|'),i=Number(a);s.boards||={};const plan=s.boards[s.boardIndex||0]||={};const slots=sheet(s.tactic,plan,players).slots;
 if(cmd==='bestXI'||cmd==='rotate'){const ids=quickXI(s,slots,players,cmd,squad);plan.previousXI={shape:s.tactic,scope:s.kitScope||'',ids:slots.map(v=>v.player?.id||null)};plan.ids=ids;plan.quickShape=s.tactic;return;}
 if(cmd==='undoXI'){const last=plan.previousXI;if(!last||last.shape!==s.tactic||last.scope!==(s.kitScope||''))throw Error('No selection to restore for this squad.');plan.ids=last.ids;plan.quickShape=s.tactic;delete plan.previousXI;return;}
 if(['pick','swap','move'].includes(cmd))delete plan.previousXI;
 if(cmd==='preset'&&[0,1,2].includes(i)){Object.assign(plan,{formation:s.tactic,style:s.style,mentality:s.mentality});s.boardIndex=i;const next=active(s);s.tactic=next.formation||['4-4-2','4-3-3','4-4-2'][i];s.style=next.style||['Balanced shape','Win it high','Break into space'][i];s.mentality=next.mentality||['Balanced','Positive','Cautious'][i];return;}
 if(cmd==='savePreset'){const name=raw.split('|').slice(2).join('|').trim().slice(0,48)||`${s.tactic} · ${plan.system||'Custom'}`,library=presetLibrary(s),id=nextPresetId(s,library);library.push({id,name,formation:s.tactic,plan:copyPlan(plan)});s.activeTacticPreset=id;return;}
 if(cmd==='loadPreset'){const saved=presetLibrary(s).find(x=>x.id===b);if(!saved)throw Error('That saved tactic is no longer available.');(s.boards||={})[s.boardIndex||0]=copyPlan(saved.plan);s.tactic=Object.hasOwn(D.FORMATIONS,saved.formation)?saved.formation:s.tactic;s.activeTacticPreset=saved.id;return;}
 if(cmd==='renamePreset'||cmd==='duplicatePreset'){const parts=raw.split('|'),id=parts[2],name=parts.slice(3).join('|').trim().slice(0,48),library=presetLibrary(s),saved=library.find(x=>x.id===id);if(!saved||!name)throw Error('Choose a saved tactic and enter a name.');if(cmd==='renamePreset')saved.name=name;else library.push({id:nextPresetId(s,library),name,formation:saved.formation,plan:copyPlan(saved.plan)});return;}
 if(cmd==='deletePreset'){const library=presetLibrary(s),at=library.findIndex(x=>x.id===b);if(at<0)return;library.splice(at,1);if(s.activeTacticPreset===b)delete s.activeTacticPreset;return;}
 if(cmd==='importPreset'){let imported;try{imported=JSON.parse(decodeURIComponent(b));}catch{throw Error('The selected file is not valid tactic JSON.');}if(imported?.version!==1||!Object.hasOwn(D.FORMATIONS,imported.formation)||!imported.plan||typeof imported.plan!=='object'||Array.isArray(imported.plan))throw Error('This tactic file has an unsupported or incomplete format.');const library=presetLibrary(s),name=String(imported.name||'Imported tactic').slice(0,48),saved={id:nextPresetId(s,library),name,formation:imported.formation,plan:safePlan(imported.plan)};library.push(saved);(s.boards||={})[s.boardIndex||0]=copyPlan(saved.plan);s.tactic=saved.formation;s.activeTacticPreset=saved.id;return;}
 if(cmd==='frontFive'){setPhaseFormation(s,plan,'3-2-5',slots);return;}
 if(cmd==='attackFormation'){setPhaseFormation(s,plan,b,slots);return;}
 if(cmd==='resetAttack'){plan.attackFormation='Same as defensive shape';delete plan.attackByPlayer;delete plan.attack;return;}
 if(cmd==='phase'){s.boardPhase=['attack','both','combined'].includes(b)?b:'base';return;}
 if(cmd==='zone'&&['defense-left','defense-centre','defense-right','middle-left','middle-centre','middle-right','attack-left','attack-centre','attack-right'].includes(b)){s.tacticZone=b;return;}
 if(cmd==='phaseJob'&&['attack','defense'].includes(a)&&Number.isInteger(Number(b))&&slots[Number(b)]?.player&&Z.choices(a==='attack'?slots[Number(b)].attackPosition||slots[Number(b)].position:slots[Number(b)].position).includes(c)){const slot=slots[Number(b)];if(a==='defense'){(plan.jobs||={})[Number(b)]=c;return;}const row=(plan.phaseJobs||={})[slot.player.id]||=((plan.phaseJobs||={})[slot.player.id]={});(row[a]||={}).job=c;return;}
 if(cmd==='phaseDuty'&&['attack','defense'].includes(a)&&Number.isInteger(Number(b))&&slots[Number(b)]?.player){const slot=slots[Number(b)];if(a==='defense'){if(Z.jobs[slot.job[0]]?.duties.includes(c))(plan.duties||={})[Number(b)]=c;return;}const row=(plan.phaseJobs||={})[slot.player.id]||=((plan.phaseJobs||={})[slot.player.id]={}),phase=row[a]||={};if(Z.jobs[phase.job||slot.job[0]]?.duties.includes(c))phase.duty=c;return;}
 if(cmd==='individual'){const [phase,id,group,...rest]=raw.split('|').slice(1),value=rest.join('|');if(!['attack','defense'].includes(phase)||!players.some(p=>p.id===id)||!['position','risk','shooting','dribbling','pressing'].includes(group)||!Z.individualInstructions[group]?.includes(value))return;(plan.playerInstructions||={})[id]||={};(plan.playerInstructions[id][phase]||={})[group]=value;return;}
 if(cmd==='system'&&(!b||Object.hasOwn(Z.systems,b))){plan.system=b;plan.instructions={};return;}
 if(cmd==='order'&&Z.choicesTeam[b]?.includes(c)){(plan.orders||={})[b]=c;return;}
 if(cmd==='axis'&&Z.axes.includes(b)&&['0','0.5','1','1.5','2'].includes(c)){(plan.instructions||={})[b]=+c;return;}
 if(cmd==='clear'&&i>0&&slots[i]){plan.ids=slots.map(v=>v.player?.id||null);plan.ids[i]=null;plan.quickShape=s.tactic;delete plan.previousXI;return;}
 if(cmd==='focus'){s.sheetFocus=!s.sheetFocus;return;}
 if(cmd==='skipper'&&[0,1,2].includes(i)&&(!b||players.some(p=>p.id===b))){s.armband=Array.from({length:3},(_,j)=>j===i?b:s.armband?.[j]===b?'':s.armband?.[j]||'');return;}
 if(!Number.isInteger(i)||!slots[i])throw Error('Choose a pitch position.');
 if(cmd==='response'&&i>0&&overrides[b]?.includes(c)){const r=(plan.responses||={})[i]||={};if(c==='Team instruction')delete r[b];else r[b]=c;return;}
 if(cmd==='job'&&Z.choices(slots[i].position).includes(b)){(plan.jobs||={})[i]=b;return;}
 if(cmd==='duty'&&Z.jobs[slots[i].job[0]].duties.includes(b)){(plan.duties||={})[i]=b;return;}
 if(cmd==='move'&&i&&[b,c].every(x=>Number.isFinite(+x)&&+x>=.03&&+x<=.97)){const phase=['defense','attack','combined'].includes(d)?d:(['attack','both','combined'].includes(s.boardPhase)?'attack':'defense'),k=phase==='attack'?'attack':'moves';plan.ids=slots.map(v=>v.player?.id||null);const x=+b,y=+c,wide=y<.23||y>.77,anchor={x:x<.225?.14:x<.38?.32:x<.54?.45:x<.665?.59:x<.87?.75:.9,y:wide?(y<.5?.12:.88):y<.42?.32:y>.58?.68:.5};if(phase==='combined'&&slots[i].player){const slot=slots[i],base={x:slot.x,y:slot.y},forward=slot.attack||base,dx=anchor.x-(base.x+forward.x)/2,dy=anchor.y-(base.y+forward.y)/2,clamp=v=>Math.max(.03,Math.min(.97,v)),moves=(plan.moves||={});moves[i]={x:clamp(base.x+dx),y:clamp(base.y+dy)};(plan.attackByPlayer||={})[slot.player.id]={x:clamp(forward.x+dx),y:clamp(forward.y+dy)};plan.attackFormation='Custom';return;}const other=slots.findIndex((v,j)=>{const q=k==='attack'?v.attack||v:v;return j!==i&&Math.abs(q.x-anchor.x)<.04&&Math.abs(q.y-anchor.y)<.09;});const moves=(plan[k]||={});if(k==='attack'&&slots[i].player){(plan.attackByPlayer||={})[slots[i].player.id]=anchor;plan.attackFormation='Custom';if(other>0&&slots[other].player){const prior=slots[i].attack||slots[i];moves[slots[other].player.id]={x:prior.x,y:prior.y};}}else{if(other>0){const prev=slots[i];moves[other]={x:prev.x,y:prev.y};}moves[i]=anchor;}return;}
 if(cmd==='pick'||cmd==='swap'){const j=cmd==='swap'?Number(b):slots.findIndex(v=>v.player?.id===b),p=cmd==='swap'?slots[j]?.player:players.find(p=>p.id===b);if(cmd==='swap'&&(!slots[j]||(!i)!==(!j))||p&&(p.pos==='GK')!==(i===0)||cmd==='pick'&&!p)throw Error('Keep the goalkeeper in goal.');plan.ids=slots.map(v=>v.player?.id||null);if(j>=0)plan.ids[j]=plan.ids[i];plan.ids[i]=p?.id||null;return;}throw Error('Unknown board change.');}
function freeze(s,players=[]){return JSON.parse(JSON.stringify({...active(s),readiness:(g.TLDynamics||require('./team-dynamics')).snapshot(s,players),familiarity:s.boardReps||{},captains:s.armband||[]}));}
function lineup(f,plan,players){const {slots,bench}=sheet(f,plan,players);return {xi:slots.filter(v=>v.player),bench,readiness:plan.readiness,fitness:Object.fromEntries(Object.entries(plan.readiness?.players||{}).map(([id,v])=>[id,v.fitness])),familiarity:plan.familiarity||{}};}
function learn(reps,slots){const next={...reps};for(const v of slots){const id=v.player?.id;if(!id)continue;next[id]={...next[id]};const keys=new Set([v.job?.[0],v.attackJob?.[0],v.scheme,v.position&&'zone:'+v.position,v.attackPosition&&'zone:'+v.attackPosition].filter(Boolean));for(const k of keys)next[id][k]=Math.min(20,1+(next[id][k]||0));}return next;}
// Include starters who have already been substituted, but never unused bench players.
function learnMatch(reps,team){const next={...reps};for(const p of (team?.players||[]).filter(x=>x.appeared&&x.assignment)){const a=p.assignment,d=a.defense||a,o=a.attack||a;next[p.id]={...next[p.id]};for(const k of new Set([d.name,o.name,a.scheme,d.pos&&'zone:'+d.pos,o.pos&&'zone:'+o.pos].filter(Boolean)))next[p.id][k]=Math.min(20,1+(next[p.id][k]||0));}return next;}
function captain(team){if(!team.tactics.captains)return null;const xi=team.slots.map(v=>v.player).filter(p=>!p.red);return team.tactics.captains.map(id=>xi.find(p=>p.id===id)).find(Boolean)||xi.sort((a,b)=>b.attrs.composure-a.attrs.composure||b.age-a.age)[0];}
const api={scheme,overrides,sheet,update,active,score,freeze,lineup,learn,learnMatch,captain,phaseFormationOptions,phaseTargets,setPhaseFormation,presetLibrary,copyPlan};g.TLMatchBoard=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
