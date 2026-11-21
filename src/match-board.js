/* A career plan stores catalogue IDs and pitch coordinates, never copies of players. */
(function(g){'use strict';
const D=g.TLData||require('./data');
const Z=g.TLZones||require('./tactical-zones');
const spots=f=>[{role:'GK',x:.035,y:.5},...D.FORMATIONS[f]];
function active(s){return s.boards?.[s.boardIndex||0]||{};}
const overrides={loss:['Team instruction','Hunt the ball','Recover position'],gain:['Team instruction','Break forward','Offer support']};
// Sort keys so recreating the same instructions in another order counts as rehearsal.
function stable(v){return v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;}
function scheme(f,plan){return 'scheme:'+D.seedFor(JSON.stringify(stable([f,...['system','orders','instructions','moves','attack','responses'].map(k=>plan[k]||null)])));}
function frontFive(slots){const byDepth=slots.map((v,i)=>({...v,i})).slice(1).sort((a,b)=>a.x-b.x||a.y-b.y);const attack={};let start=0;for(const [n,x] of [[3,.18],[2,.43],[5,.76]]){byDepth.slice(start,start+n).sort((a,b)=>a.y-b.y).forEach((v,j)=>attack[v.i]={x,y:(j+.5)/n});start+=n;}return attack;}
function sheet(f,plan,players){const rehearsal=scheme(f,plan),base=spots(f),auto=D.bestXI(players,f).xi,used=new Set();const slots=base.map((v,i)=>{const p=players.find(p=>p.id===plan.ids?.[i]&&!p.red&&(p.pos==='GK')===(i===0));if(p)used.add(p.id);const move=plan.moves?.[i],pos=move?Z.zone(move.x,move.y,!i):({GK:'GK',DC:'CB',FB:v.y<.5?'LB':'RB',WB:v.y<.5?'LWB':'RWB',W:v.x<.54?(v.y<.5?'ML':'MR'):(v.y<.5?'LW':'RW'),ST:'CF'})[v.role]||v.role;const options=Z.choices(pos),job=options.includes(plan.jobs?.[i])?plan.jobs[i]:options[0];return {...v,...move,position:pos,scheme:rehearsal,response:plan.responses?.[i]||{},role:Z.families[pos],attack:plan.attack?.[i],experience:plan.familiarity?.[p?.id]?.[job]||0,job:[job,null,Z.duty(job,plan.duties?.[i])],player:p};});slots.forEach((v,i)=>{if(v.player||plan.quickShape===f&&plan.ids?.[i]===null)return;const fits=p=>!used.has(p.id)&&!p.red&&(p.pos==='GK')===(i===0);const p=auto.find(a=>a.x===base[i].x&&a.y===base[i].y&&fits(a.player))?.player||players.filter(fits).sort((a,b)=>score(b,v.role)-score(a,v.role))[0];if(p){v.player=p;used.add(p.id);}});slots.forEach(v=>v.experience=plan.familiarity?.[v.player?.id]?.[v.job[0]]||0);return {slots,bench:players.filter(p=>!used.has(p.id))};}
const score=(p,r)=>D.ROLE_WEIGHTS[r](p.attrs)*D.roleFit(p.pos,r);
// Maximum-weight assignment over the eleven pitch slots. Each player can enter
// only once; a versatile player cannot steal a specialist's only viable slot.
function quickXI(s,slots,players,mode){const current=new Set(slots.map(v=>v.player?.id)),ready=(g.TLDynamics||require('./team-dynamics')).snapshot(s,players).players;
 const pool=players.filter(p=>!p.red&&!ready[p.id].knock),size=1<<slots.length,dp=new Float64Array(size).fill(-Infinity),steps=[];dp[0]=0;
 for(const p of pool){const log=new Int8Array(size),r=ready[p.id],weights=slots.map((v,i)=>{if((p.pos==='GK')!==(i===0))return -Infinity;
 const fit=Z.fit(p,v.position,v.job[0],s.boardReps?.[p.id]),quality=score(p,v.role),bench=mode==='rotate'&&!current.has(p.id)?32:0;
 return 1000+fit+.35*quality+(mode==='rotate'?.4:.12)*r.fitness+.05*r.sharp+bench;});
 for(let mask=size-1;mask>=0;mask--){if(!Number.isFinite(dp[mask]))continue;for(let i=0;i<slots.length;i++){const bit=1<<i;if(mask&bit)continue;const next=mask|bit,w=dp[mask]+weights[i];if(w>dp[next]){dp[next]=w;log[next]=i+1;}}}steps.push(log);}
 let best=0;for(let i=1;i<size;i++)if(dp[i]>dp[best])best=i;const ids=slots.map(()=>null);for(let j=pool.length-1;j>=0;j--){const i=steps[j][best]-1;if(i>=0){ids[i]=pool[j].id;best^=1<<i;}}return ids;}
function update(s,raw,players){const [cmd,a,b,c]=raw.split('|'),i=Number(a);s.boards||={};const plan=s.boards[s.boardIndex||0]||={};const slots=sheet(s.tactic,plan,players).slots;
 if(cmd==='bestXI'||cmd==='rotate'){const ids=quickXI(s,slots,players,cmd);plan.previousXI={shape:s.tactic,scope:s.kitScope||'',ids:slots.map(v=>v.player?.id||null)};plan.ids=ids;plan.quickShape=s.tactic;return;}
 if(cmd==='undoXI'){const last=plan.previousXI;if(!last||last.shape!==s.tactic||last.scope!==(s.kitScope||''))throw Error('No selection to restore for this squad.');plan.ids=last.ids;plan.quickShape=s.tactic;delete plan.previousXI;return;}
 if(['pick','swap','move'].includes(cmd))delete plan.previousXI;
 if(cmd==='preset'&&[0,1,2].includes(i)){Object.assign(plan,{formation:s.tactic,style:s.style,mentality:s.mentality});s.boardIndex=i;const next=active(s);s.tactic=next.formation||['4-4-2','4-3-3','4-4-2'][i];s.style=next.style||['Balanced shape','Win it high','Break into space'][i];s.mentality=next.mentality||['Balanced','Positive','Cautious'][i];return;}
 if(cmd==='frontFive'){plan.attack=frontFive(slots);s.boardPhase='attack';return;}
 if(cmd==='resetAttack'){delete plan.attack;return;}
 if(cmd==='phase'){s.boardPhase=b==='attack'?'attack':'base';return;}
 if(cmd==='system'&&(!b||Object.hasOwn(Z.systems,b))){plan.system=b;plan.instructions={};return;}
 if(cmd==='order'&&Z.choicesTeam[b]?.includes(c)){(plan.orders||={})[b]=c;return;}
 if(cmd==='axis'&&Z.axes.includes(b)&&['0','0.5','1','1.5','2'].includes(c)){(plan.instructions||={})[b]=+c;return;}
 if(cmd==='focus'){s.sheetFocus=!s.sheetFocus;return;}
 if(cmd==='skipper'&&[0,1,2].includes(i)&&(!b||players.some(p=>p.id===b))){s.armband=Array.from({length:3},(_,j)=>j===i?b:s.armband?.[j]===b?'':s.armband?.[j]||'');return;}
 if(!Number.isInteger(i)||!slots[i])throw Error('Choose a pitch position.');
 if(cmd==='response'&&i>0&&overrides[b]?.includes(c)){const r=(plan.responses||={})[i]||={};if(c==='Team instruction')delete r[b];else r[b]=c;return;}
 if(cmd==='job'&&Z.choices(slots[i].position).includes(b)){(plan.jobs||={})[i]=b;return;}
 if(cmd==='duty'&&Z.jobs[slots[i].job[0]].duties.includes(b)){(plan.duties||={})[i]=b;return;}
 if(cmd==='move'&&i&&[b,c].every(x=>Number.isFinite(+x)&&+x>=.03&&+x<=.97)){const k=s.boardPhase==='attack'?'attack':'moves';plan.ids=slots.map(v=>v.player?.id||null);(plan[k]||={})[i]={x:+b,y:+c};return;}
 if(cmd==='pick'||cmd==='swap'){const j=cmd==='swap'?Number(b):slots.findIndex(v=>v.player?.id===b),p=cmd==='swap'?slots[j]?.player:players.find(p=>p.id===b);if(cmd==='swap'&&(!slots[j]||(!i)!==(!j))||p&&(p.pos==='GK')!==(i===0)||cmd==='pick'&&!p)throw Error('Keep the goalkeeper in goal.');plan.ids=slots.map(v=>v.player?.id||null);if(j>=0)plan.ids[j]=plan.ids[i];plan.ids[i]=p?.id||null;return;}throw Error('Unknown board change.');}
function freeze(s,players=[]){return JSON.parse(JSON.stringify({...active(s),readiness:(g.TLDynamics||require('./team-dynamics')).snapshot(s,players),familiarity:s.boardReps||{},captains:s.armband||[]}));}
function lineup(f,plan,players){const {slots,bench}=sheet(f,plan,players);return {xi:slots.filter(v=>v.player),bench,readiness:plan.readiness,fitness:Object.fromEntries(Object.entries(plan.readiness?.players||{}).map(([id,v])=>[id,v.fitness])),familiarity:plan.familiarity||{}};}
function learn(reps,slots){const next={...reps};for(const v of slots){const id=v.player?.id,name=v.job?.[0];if(!id||!name)continue;next[id]={...next[id]};for(const k of [name,...(v.scheme?[v.scheme]:[]),...(v.position?['zone:'+v.position]:[])])next[id][k]=Math.min(20,1+(next[id][k]||0));}return next;}
// Include starters who have already been substituted, but never unused bench players.
function learnMatch(reps,team){return learn(reps,(team?.players||[]).filter(p=>p.appeared&&p.assignment).map(player=>({player,job:[player.assignment.name],scheme:player.assignment.scheme,position:player.assignment.pos})));}
function captain(team){if(!team.tactics.captains)return null;const xi=team.slots.map(v=>v.player).filter(p=>!p.red);return team.tactics.captains.map(id=>xi.find(p=>p.id===id)).find(Boolean)||xi.sort((a,b)=>b.attrs.composure-a.attrs.composure||b.age-a.age)[0];}
const api={scheme,overrides,sheet,update,active,score,freeze,lineup,learn,learnMatch,captain};g.TLMatchBoard=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
