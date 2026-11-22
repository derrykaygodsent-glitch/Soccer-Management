const test=require('node:test'),a=require('node:assert/strict'),D=require('../src/data'),Z=require('../src/tactical-zones'),B=require('../src/match-board'),E=require('../src/engine');
test('a midfielder moved up front stays the same person but gets a forward position, job list and engine role',()=>{const s={tactic:'4-4-2'},players=D.genSquad(D.CLUBS[0],31),run=v=>B.update(s,v,players),get=()=>B.sheet(s.tactic,B.active(s),players).slots[6],id=get().player.id;run('move|6|.79|.5');a.equal(get().position,'CF');a.equal(get().role,'ST');a.equal(get().player.id,id);run('job|6|False Nine');run('phase|0|attack');run('move|6|.52|.22');a.equal(get().x,.75);a.equal(get().attack.x,.45);const l=B.lineup(s.tactic,B.freeze(s),players),m=new E.Match(...D.CLUBS.slice(0,2),{seed:2,squads:[players],lineups:[l]});a.equal(m.teams[0].slots[6].player.job,'False Nine');a.equal(m.teams[0].slots[6].player.attackSlot.y,.12);});
test('every formation has ten outfield slots; job fit responds to attributes; potential never below current',()=>{for(const f of Object.values(D.FORMATIONS))a.equal(f.length,10);const p=D.genSquad(D.CLUBS[0],4).find(p=>p.pos==='CM'),poor={...p,attrs:{...p.attrs,passing:1,composure:1,dribbling:1}};a.ok(Z.fit(p,'CM','Advanced Playmaker')>Z.fit(poor,'CM','Advanced Playmaker'));const iq=Z.intelligence(p);a.ok(iq.pa>=iq.ca&&iq.pa<=200);for(const [x,y,expected] of [[.1,.1,'LB'],[.31,.91,'RWB'],[.45,.1,'ML'],[.64,.5,'AM'],[.7,.9,'RW'],[.95,.5,'ST']])a.equal(Z.zone(x,y),expected);});
test('role-fit review tolerates older players whose saved attributes omit specialist ratings',()=>{const p=D.genSquad(D.CLUBS[0],72).find(p=>p.pos==='ST'),legacy={...p,attrs:{pace:12,stamina:11}};a.ok(Number.isFinite(Z.fit(legacy,'ST','Striker')));a.ok(Number.isFinite(Z.fit(legacy,'ST','Advanced Forward')));});

test('dual-phase 4-3-3 to 3-2-5 keeps one stable-ID XI, assigns phase jobs and carries instructions into the engine',()=>{
 const s={tactic:'4-3-3',boardPhase:'base'},players=D.genSquad(D.CLUBS[0],93),run=v=>B.update(s,v,players);
 const initial=B.sheet(s.tactic,B.active(s),players).slots.filter(v=>v.player).map(v=>v.player.id).sort();
 run('attackFormation|0|3-2-5');s.boardPhase='attack';
 let slots=B.sheet(s.tactic,B.active(s),players).slots;
 a.deepEqual(slots.filter(v=>v.player).map(v=>v.player.id).sort(),initial);
 a.equal(slots.filter(v=>v.attack&&v.attack.x===.18).length,3);
 a.equal(slots.filter(v=>v.attack&&v.attack.x===.43).length,2);
 a.equal(slots.filter(v=>v.attack&&v.attack.x===.76).length,5);
 const wide=slots.findIndex(v=>['LW','RW'].includes(v.attackPosition));a.ok(wide>0);
 run(`phaseJob|attack|${wide}|Inverted Winger`);
 const id=slots[wide].player.id;
 run(`individual|attack|${id}|shooting|Shoot less often`);
 slots=B.sheet(s.tactic,B.active(s),players).slots;
 a.equal(slots[wide].attackJob[0],'Inverted Winger');
 a.equal(slots[wide].instructions.attack.shooting,'Shoot less often');
 const lineup=B.lineup(s.tactic,B.freeze(s,players),players),m=new E.Match(...D.CLUBS.slice(0,2),{seed:93,squads:[players],lineups:[lineup]});
 const enginePlayer=m.teams[0].players.find(p=>p.id===id);
 a.equal(enginePlayer.assignment.attack.name,'Inverted Winger');
 a.equal(enginePlayer.assignment.instructions.attack.shooting,'Shoot less often');
 a.equal(enginePlayer.attackSlot.x,slots[wide].attack.x);
});

test('press triggers can react to goalkeepers, poor touches, backward passes and carriers facing their own goal',()=>{
 const players=D.genSquad(D.CLUBS[0],18),m=new E.Match(...D.CLUBS.slice(0,2),{seed:18,squads:[players]});
 const pressing=m.teams[0],carrier=m.teams[1].slots[0].player;carrier.role='GK';carrier.receivedAt=m.elapsed;carrier.quickControl=false;m.ball.owner=carrier;
 pressing.tactics.club={trigger:'Goalkeeper receives'};a.equal(m.pressSignal(pressing),true);
 pressing.tactics.club.trigger='Poor first touch';a.equal(m.pressSignal(pressing),true);
 pressing.tactics.club.trigger='Carrier facing own goal';carrier.dir=pressing.attackDir>0?Math.PI:0;a.equal(m.pressSignal(pressing),true);
 pressing.tactics.club.trigger='On a backward pass';pressing.backPassAt=m.elapsed;a.equal(m.pressSignal(pressing),true);
});

test('individual phase instructions change actual match-engine target positioning',()=>{
 const players=D.genSquad(D.CLUBS[0],94);
 const run=instruction=>{const s={tactic:'4-3-3',boardPhase:'attack'},apply=v=>B.update(s,v,players);apply('attackFormation|0|3-2-5');let slots=B.sheet(s.tactic,B.active(s),players).slots;const i=slots.findIndex(v=>v.attackPosition==='LW'||v.attackPosition==='RW');a.ok(i>1);if(instruction)apply(`individual|attack|${slots[i].player.id}|position|${instruction}`);const lineup=B.lineup(s.tactic,B.freeze(s,players),players),m=new E.Match(...D.CLUBS.slice(0,2),{seed:94,squads:[players],lineups:[lineup]});m.begin();for(let tick=0;tick<400;tick++)m.step(1/40);m.phase='open';m.controlTeam=0;m.teams[0].possession=true;m.possessionTurn=m.elapsed-8;m.ball.owner=m.teams[0].slots.find(v=>v.player.id!==slots[i].player.id).player;m.ball.x=42;m.ball.y=34;m.computeTargets();return m.teams[0].players.find(p=>p.id===slots[i].player.id).tx;};
 const base=run(null),advanced=run('Get further forward');a.ok(advanced>base+2,'the player’s actual in-possession target advances when instructed');
});
