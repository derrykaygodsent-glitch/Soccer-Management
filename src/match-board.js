/* A career plan stores catalogue IDs and pitch coordinates, never copies of players. */
(function(g){'use strict';
const D=g.TLData||require('./data');
const Z=g.TLZones||require('./tactical-zones');
const spots=f=>[{role:'GK',x:.035,y:.5},...D.FORMATIONS[f]];
function active(s){return s.boards?.[s.boardIndex||0]||{};}
function sheet(f,plan,players){const base=spots(f),auto=D.bestXI(players,f).xi,used=new Set();const slots=base.map((v,i)=>{const p=players.find(p=>p.id===plan.ids?.[i]&&!p.red&&(p.pos==='GK')===(i===0));if(p)used.add(p.id);const move=plan.moves?.[i],pos=move?Z.zone(move.x,move.y,!i):({GK:'GK',DC:'CB',FB:v.y<.5?'LB':'RB',WB:v.y<.5?'LWB':'RWB',W:v.x<.54?(v.y<.5?'ML':'MR'):(v.y<.5?'LW':'RW'),ST:'CF'})[v.role]||v.role;const options=Z.choices(pos),job=options.includes(plan.jobs?.[i])?plan.jobs[i]:options[0];return {...v,...move,position:pos,role:Z.families[pos],attack:plan.attack?.[i],experience:plan.familiarity?.[p?.id]?.[job]||0,job:[job,null,plan.duties?.[i]||'Support'],player:p};});slots.forEach((v,i)=>{if(v.player)return;const fits=p=>!used.has(p.id)&&!p.red&&(p.pos==='GK')===(i===0);const p=auto.find(a=>a.x===base[i].x&&a.y===base[i].y&&fits(a.player))?.player||players.filter(fits).sort((a,b)=>score(b,v.role)-score(a,v.role))[0];if(p){v.player=p;used.add(p.id);}});slots.forEach(v=>v.experience=plan.familiarity?.[v.player?.id]?.[v.job[0]]||0);return {slots,bench:players.filter(p=>!used.has(p.id))};}
const score=(p,r)=>D.ROLE_WEIGHTS[r](p.attrs)*D.roleFit(p.pos,r);
function update(s,raw,players){const [cmd,a,b,c]=raw.split('|'),i=Number(a);s.boards||={};const plan=s.boards[s.boardIndex||0]||={};const slots=sheet(s.tactic,plan,players).slots;
 if(cmd==='preset'&&[0,1,2].includes(i)){Object.assign(plan,{formation:s.tactic,style:s.style,mentality:s.mentality});s.boardIndex=i;const next=active(s);s.tactic=next.formation||['4-4-2','4-3-3','4-4-2'][i];s.style=next.style||['Balanced shape','Win it high','Break into space'][i];s.mentality=next.mentality||['Balanced','Positive','Cautious'][i];return;}
 if(cmd==='phase'){s.boardPhase=b==='attack'?'attack':'base';return;}
 if(cmd==='system'&&(!b||Object.hasOwn(Z.systems,b))){plan.system=b;plan.instructions={};return;}
 if(cmd==='order'&&Z.choicesTeam[b]?.includes(c)){(plan.orders||={})[b]=c;return;}
 if(cmd==='axis'&&Z.axes.includes(b)&&['0','0.5','1','1.5','2'].includes(c)){(plan.instructions||={})[b]=+c;return;}
 if(cmd==='focus'){s.sheetFocus=!s.sheetFocus;return;}
 if(cmd==='skipper'&&[0,1,2].includes(i)&&(!b||players.some(p=>p.id===b))){s.armband=Array.from({length:3},(_,j)=>j===i?b:s.armband?.[j]===b?'':s.armband?.[j]||'');return;}
 if(!Number.isInteger(i)||!slots[i])throw Error('Choose a pitch position.');
 if(cmd==='job'&&Z.choices(slots[i].position).includes(b)){(plan.jobs||={})[i]=b;return;}
 if(cmd==='duty'&&['Attack','Support','Defend'].includes(b)){(plan.duties||={})[i]=b;return;}
 if(cmd==='move'&&i&&[b,c].every(x=>Number.isFinite(+x)&&+x>=.03&&+x<=.97)){const k=s.boardPhase==='attack'?'attack':'moves';plan.ids=slots.map(v=>v.player?.id||null);(plan[k]||={})[i]={x:+b,y:+c};return;}
 if(cmd==='pick'||cmd==='swap'){const j=cmd==='swap'?Number(b):slots.findIndex(v=>v.player?.id===b),p=cmd==='swap'?slots[j]?.player:players.find(p=>p.id===b);if(cmd==='swap'&&(!slots[j]||(!i)!==(!j))||p&&(p.pos==='GK')!==(i===0)||cmd==='pick'&&!p)throw Error('Keep the goalkeeper in goal.');plan.ids=slots.map(v=>v.player?.id||null);if(j>=0)plan.ids[j]=plan.ids[i];plan.ids[i]=p?.id||null;return;}throw Error('Unknown board change.');}
function freeze(s){return JSON.parse(JSON.stringify({...active(s),familiarity:s.boardReps||{},captains:s.armband||[]}));}
function lineup(f,plan,players){const {slots,bench}=sheet(f,plan,players);return {xi:slots.filter(v=>v.player),bench};}
function learn(reps,slots){const next={...reps};for(const v of slots){const id=v.player?.id,name=v.job?.[0];if(!id||!name)continue;next[id]={...next[id],[name]:Math.min(20,1+(next[id]?.[name]||0))};}return next;}
function captain(team){if(!team.tactics.captains)return null;const xi=team.slots.map(v=>v.player).filter(p=>!p.red);return team.tactics.captains.map(id=>xi.find(p=>p.id===id)).find(Boolean)||xi.sort((a,b)=>b.attrs.composure-a.attrs.composure||b.age-a.age)[0];}
const api={sheet,update,active,score,freeze,lineup,learn,captain};g.TLMatchBoard=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
