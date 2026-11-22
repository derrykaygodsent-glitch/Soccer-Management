const test=require('node:test'),assert=require('node:assert/strict'),B=require('../src/match-board'),D=require('../src/data'),E=require('../src/engine');

// Paired counterfactuals share seed, XI, ball state and opponent positions; only the
// tactical lever under test changes. These are narrow on-pitch signatures, not proof
// that a complete 90-minute match already reproduces a whole football philosophy.
function fixture(seed=41){
  const state={tactic:'4-3-3'},players=D.genSquad(D.CLUBS[0],seed),lineup=B.lineup('4-3-3',B.freeze(state),players);
  const match=new E.Match(...D.CLUBS.slice(0,2),{seed,squads:[players],lineups:[lineup]});
  match.begin();match.phase='open';match.elapsed=20;match.possessionTurn=0;
  const team=match.teams[0],carrier=match.teams[1].slots[6].player;
  match.controlTeam=1;match.ball.owner=carrier;Object.assign(match.ball,{x:55,y:34});Object.assign(carrier,{x:55,y:34});
  for(const p of match.playersCache)if(p!==carrier){const home=match.homePos(p,match.teams[p.team]);Object.assign(p,{x:home.x,y:home.y});}
  return {match,team};
}
function targetLine(line){const {match,team}=fixture();team.tactics.line=line;team.possession=false;match.computeTargets();return team.slots.find(s=>s.role==='DC').player.tx;}
function observedDefenderX(line){const {match,team}=fixture();team.tactics.line=line;team.possession=false;match.computeContext();const defender=team.slots.find(s=>s.role==='DC').player;for(let i=0;i<80;i++)match.step(1/40);return defender.x;}
test('low defensive line produces deeper defender targets and actual on-pitch positioning than a high line',()=>{
  const deep=targetLine(0),high=targetLine(2),deepPosition=observedDefenderX(0),highPosition=observedDefenderX(2);
  assert.ok(deep<high,`deep-line target ${deep.toFixed(1)} should sit behind high-line target ${high.toFixed(1)}`);
  assert.ok(deepPosition<highPosition-1,`after two simulated seconds the defender should still be deeper (low=${deepPosition.toFixed(1)}, high=${highPosition.toFixed(1)})`);
});

test('counter-attacking regain sends more teammates forward than retaining possession',()=>{
  const forwardRuns=won=>{const {match,team}=fixture();match.controlTeam=0;team.possession=true;match.possessionTurn=match.elapsed-2;team.tactics.club={won};match.ball.owner=team.slots[4].player;Object.assign(match.ball,{x:50,y:34});match.computeTargets();return team.slots.filter(s=>['FB','DC','DM','CM'].includes(s.role)&&s.player!==match.ball.owner).reduce((sum,s)=>sum+(s.player.tx-match.homePos(s.player,team).x)*team.attackDir,0);};
  const counter=forwardRuns('Counter'),retain=forwardRuns('Retain possession');
  assert.ok(counter>retain+10,`counter transition should move runners forward (counter=${counter.toFixed(1)}, retain=${retain.toFixed(1)})`);
});

test('wide attacking width moves actual winger targets toward the touchlines',()=>{
  const wingerSpread=width=>{const {match,team}=fixture();team.tactics.width=width;team.possession=true;match.controlTeam=0;match.ball.owner=team.slots[4].player;Object.assign(match.ball,{x:50,y:34});match.computeTargets();return team.slots.filter(s=>s.role==='W').reduce((sum,s)=>sum+Math.abs(s.player.ty-34),0);};
  const narrow=wingerSpread(0),wide=wingerSpread(2);
  assert.ok(wide>narrow+3,`wide settings should spread winger targets (wide=${wide.toFixed(1)}, narrow=${narrow.toFixed(1)})`);
});

test('short-passing and direct styles expose different viable passing ranges',()=>{
  const passOptions=style=>{const {match,team}=fixture();team.tactics.passing=style;team.possession=true;match.controlTeam=0;const passer=team.slots[4].player;Object.assign(passer,{x:40,y:34});match.ball.owner=passer;Object.assign(match.ball,{x:40,y:34});team.slots.forEach((slot,i)=>{if(slot.player!==passer)Object.assign(slot.player,{x:22+i*5,y:5+(i%3)*20});});match.teams[1].players.forEach((p,i)=>Object.assign(p,{x:95,y:4+i*4}));return match.passOptions(passer,{},null).map(o=>o.dist);};
  const short=passOptions(0),direct=passOptions(2);
  assert.ok(short.length>0&&direct.length>short.length,'direct style should add viable longer-pass options beyond the short style envelope');
  assert.ok(Math.max(...short)<=33&&Math.max(...direct)>33,'the option range should follow the actual engine constraints');
});
