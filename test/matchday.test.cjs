'use strict';

const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {runInNewContext}=require('node:vm');
const H=require('../src/home-data.js');
const C=require('../src/club-data.js');
const D=require('../src/data.js');
const M=require('../src/matchday-data.js');
const K=require('../src/season-calendar.js');
const S=require('../src/season-state.js');
const Q=require('../src/season-match.js');
const V=require('../src/highlights.js');
const Z=require('../src/tactical-zones.js');
const storage=()=>{const rows=new Map();return {getItem:k=>rows.get(k),setItem:(k,v)=>rows.set(k,v)};};

function openTie(store){
  assert.ok(store.advance());
  assert.ok(store.answer('load-review','light'));assert.ok(store.advance());
  assert.ok(store.answer('staff-cup','set'));assert.ok(store.answer('press-cup','respect'));
  assert.ok(store.advance());assert.ok(store.advance());assert.ok(store.enter());
  assert.equal(store.fixture().id,H.next.id);
}
function putOnPitch(store){
  for(const [from,to] of [['briefing','news'],['news','preTalk'],['preTalk','preview'],['preview','live']])assert.ok(store.move(from,to));
}
function runTo(m,phase){
  for(let i=0;i<126000&&m.phase!==phase;i++)m.step(V.STEP);
  assert.equal(m.phase,phase);
}
function auditReport(r){
  assert.ok(r.goals.every(Number.isInteger));
  for(let side=0;side<2;side++){
    const shots=r.shots.filter(s=>s.team===side), stats=r.stats[side];
    assert.equal(shots.length,stats.shots);
    assert.ok(shots.every(s=>Number.isFinite(s.x)&&Number.isFinite(s.y)&&Number.isFinite(s.xg)));
    assert.ok(Math.abs(shots.reduce((n,s)=>n+s.xg,0)-stats.xG)<1e-7);
    assert.equal(r.events.filter(e=>e.team===side&&['goal','og','penscore'].includes(e.type)).length,r.goals[side]);
    assert.ok(r.lineup[side].every(s=>r.players[side].some(p=>p.id===s.id&&p.active)));
    assert.ok(r.players[side].every(p=>[p.rating,p.cond].every(Number.isFinite)));
  }
}

test('calendar releases background results by date and never plays Riverside in the background',()=>{
  const s=S.open().value;
  assert.equal(s.now,H.start);
  assert.equal(K.countdown(H.start,H.next.date),'4 days');
  const initial=K.onDate(s,s.now);
  assert.equal(initial.length,5);
  assert.equal(initial.filter(f=>f.result).length,4);
  const pending=initial.find(f=>!f.result);
  assert.equal(K.outcome(pending,{...s,now:K.finish(pending)-1}),null);
  const after={...s,now:K.finish(pending)};
  assert.ok(K.outcome(pending,after));
  assert.equal(K.onDate(after,H.next.date).every(f=>!f.result),true);
  assert.equal(K.onDate({...s,now:K.finish(H.next)},H.next.date).filter(f=>!f.result).length,1);
  assert.equal(K.next({...s,now:K.end}).id,H.next.id);
  assert.equal(K.due(after),null);
  assert.equal(K.standings(after).find(r=>r.id===H.homeId).played,11);
});

test('a full league calendar has unique future pairings and equal games played',()=>{
  const s={now:K.end,results:{}};
  const fixtures=K.slate(s), dated=fixtures.filter(f=>f.comp==='PD'&&!f.archived);
  assert.equal(new Set(fixtures.map(f=>f.id)).size,fixtures.length);
  assert.equal(new Set(dated.map(f=>`${f.home}:${f.away}`)).size,dated.length);
  for(const f of dated.filter(K.isClub))s.results[f.id]={goals:[1,0]};
  const table=K.standings(s);
  assert.ok(table.every(x=>x.played===38&&x.pts===3*x.w+x.d&&x.gd===x.gf-x.ga));
  assert.equal(table.reduce((n,r)=>n+r.gf-r.ga,0),0);
  assert.equal(K.positions(s).at(-1),table.findIndex(r=>r.id===H.homeId)+1);
});

test('reading and browsing dates do not clear required decisions or skip an eligible fixture',()=>{
  const disk=storage(), store=S.open(disk), initial=store.value;
  assert.ok(!store.enter());assert.ok(!store.answer('staff-cup','set'));
  assert.ok(S.activities(initial,H.next.date).some(x=>x.kind==='fixture'));
  assert.ok(!S.messages(initial).some(x=>x.id==='cup-reminder'));
  assert.ok(store.advance());
  assert.equal(S.pending(store.value)[0].id,'load-review');
  assert.ok(store.read('load-review'));store.readAll();
  assert.equal(S.unread(store.value,C.inbox.map(m=>m.id)).length,0);
  assert.equal(store.advance(),false);
  const normal=S.condition(store.value,'rvr_12');
  assert.ok(!store.answer('load-review','fake'));
  assert.ok(store.answer('load-review','light'));assert.ok(S.condition(store.value,'rvr_12')>normal);
  assert.ok(store.advance());
  assert.deepEqual(S.pending(store.value).map(m=>m.id),['staff-cup','press-cup']);
  assert.ok(store.answer('staff-cup','set'));assert.ok(!store.advance());
  assert.ok(store.answer('press-cup','delegate'));assert.ok(store.advance());
  const reload=S.open(disk);
  assert.equal(K.countdown(reload.value.now,H.next.date),'Tomorrow');
  assert.deepEqual(reload.value.answers,store.value.answers);
  assert.deepEqual(reload.value.read,store.value.read);
  assert.equal(reload.value.session,null);
  assert.ok(reload.advance());assert.equal(reload.value.now,H.next.date);assert.equal(reload.advance(),false);
  assert.ok(reload.enter());assert.ok(!reload.enter());assert.ok(reload.leave());assert.ok(reload.enter());
});

test('selection uses available players, natural slots and unique, registered numbers',()=>{
  const base=M.plan();
  for(const form of M.formationOptions){
    const p=M.edit(base,'form',form,H.start), {xi,bench,out}=M.sheet(p);
    const squad=[...xi.map(s=>s.player),...bench,...out];
    assert.equal(squad.length,18);
    assert.equal(new Set(squad.map(p=>p.id)).size,18);
    assert.equal(new Set(squad.map(p=>p.num)).size,18);
    assert.equal(xi.length,11);assert.equal(bench.length,6);
    assert.equal(xi[0].player.pos,'GK');assert.ok(xi.every(s=>s.label&&s.job&&C.players[s.player.id]&&s.player.injury?.status!=='Out'));
    assert.equal(M.edit(p,'xi:0','rvr_17',H.start),null);
  }
  const form=M.edit(base,'form','4-2-3-1',H.start), {xi}=M.sheet(form);
  assert.ok(xi.some(s=>s.role==='ST'&&s.player.id===C.leaders.forward));
  assert.equal(M.edit(base,'number:rvr_0',72,H.start),null);
  const camp=K.date('2027-07-26',15), from=M.plan(base,camp);
  const edit=M.edit(from,'number:rvr_0','72',camp,{},true);
  assert.equal(edit.numbers.rvr_0,72);
  assert.equal(M.edit(edit,'number:rvr_3','72',camp,{},true),null);
  const injured={[base.xi[1]]:H.next.date+K.DAY};
  const fit=M.plan(base,H.next.date,injured);
  assert.ok(![...fit.xi,...fit.bench].includes(base.xi[1]));
  assert.equal(H.next.score,null);
});

test('the sealed briefing defines both engine lineups, controls, roles, takers and pre-match talk',()=>{
  const disk=storage(), store=S.open(disk);
  openTie(store);
  assert.ok(!store.submit());assert.ok(store.edit('line','Deeper'));assert.ok(store.move('meeting','selection'));
  assert.ok(store.edit('form','4-2-3-1'));assert.ok(store.edit('role:1','WB'));assert.ok(store.edit('width','Fairly wide'));
  assert.ok(store.edit('set:captain','rvr_17'));assert.ok(store.edit('set:vice','rvr_17'));
  const take=store.value.plan.xi.at(-1);
  assert.ok(store.edit('set:penalty',take));assert.ok(store.submit());assert.ok(!store.submit());
  const {submitted}=store.value.session;
  assert.notEqual(submitted.sheet.set.captain,submitted.sheet.set.vice);
  assert.deepEqual(S.open(disk).value.session.submitted,submitted);
  assert.ok(!store.edit('line','Higher'));assert.ok(!store.move('briefing','selection'));
  assert.ok(store.move('briefing','news'));assert.ok(store.move('news','preTalk'));
  const f=store.fixture(), baseline=Q.create(f,store.value.session);
  const group=M.sheet(submitted.sheet,f.date).xi.map(s=>({...s.player,role:s.role,active:true}));
  const talk=Q.reaction('pre',f,0,{tone:'demand',audience:'Room',gesture:'Hands on hips'},group);
  assert.ok(Object.values(talk.reactions).some(r=>r.delta<0));
  assert.ok(store.talk('pre',talk));assert.ok(!store.talk('pre',talk));
  assert.ok(store.move('preTalk','preview'));assert.ok(store.move('preview','live'));
  const m=Q.create(f,store.value.session), team=m.teams[0];
  assert.deepEqual(team.slots.map(s=>s.player.id),submitted.sheet.xi);
  assert.deepEqual(team.bench.map(p=>p.id),submitted.sheet.bench);
  assert.equal(m.teams[1].bench.length,6);
  assert.equal(m.teams[1].slots.length,11);
  assert.equal(team.tactics.formation,'4-2-3-1');assert.equal(team.tactics.line,0);assert.equal(team.tactics.width,2);
  assert.equal(team.slots[1].player.job,'WB');assert.equal(team.slots[1].player.duty,'Attack');
  assert.equal(m.bestPenaltyTaker(team).id,take);
  assert.notDeepEqual(team.slots.map(s=>s.player.attrs.composure),baseline.teams[0].slots.map(s=>s.player.attrs.composure));
  for(const p of team.players)assert.equal(p.cond,submitted.fitness[p.id]/100);
});

test('actual whistles, journal replay, result archive, medical and next game are one season', {timeout:120000},()=>{
  const disk=storage();let store=S.open(disk);
  openTie(store);assert.ok(store.move('meeting','selection'));assert.ok(store.submit());putOnPitch(store);
  const f=store.fixture(), submitted=store.value.session.submitted, m=Q.create(f,store.value.session), t=m.teams[0];
  assert.ok(store.checkpoint(0,null,true));
  for(let i=0;i<4000;i++)m.step(V.STEP);
  const cmd={type:'tactic',change:{formation:'3-5-2',line:0}};
  Q.applyCommand(m,0,cmd);assert.ok(store.checkpoint(Q.ticks(m),cmd));
  const out=t.slots.find(s=>s.role==='DC').player.id, into=t.bench.find(p=>p.pos!=='GK').id, sub={type:'sub',out,in:into};
  assert.ok(Q.applyCommand(m,0,sub).ok);assert.ok(store.checkpoint(Q.ticks(m),sub));
  assert.ok(!m.substitute(0,into,out).ok);
  const nonListed=t.players.find(p=>!p.appeared&&!t.listed.has(p.id));
  assert.ok(!m.substitute(0,into,nonListed.id).ok);
  const restored=Q.create(f,S.open(disk).value.session);
  assert.equal(Q.ticks(restored),Q.ticks(m));assert.equal(restored.teams[0].subsUsed,1);
  assert.deepEqual(restored.snapshotFrame(),m.snapshotFrame());
  assert.deepEqual(Q.report(restored,f),Q.report(m,f));
  runTo(m,'halftime');const ht=Q.report(m,f);auditReport(ht);
  assert.ok(ht.added[0]>=1);assert.ok(ht.events.some(e=>e.type==='stoppage'&&e.time==='45+1′'));
  assert.ok(store.break('ht',ht,Q.ticks(m)));assert.equal(store.value.session.stage,'half');
  assert.equal(Object.keys(store.value.results).length,0);assert.ok(!store.advance());
  store=S.open(disk);
  assert.deepEqual(store.value.session.half,ht);
  assert.equal(Q.create(f,store.value.session).phase,'halftime');
  assert.equal(store.value.plan.tactics.form,submitted.sheet.tactics.form);
  assert.ok(store.saveLive(Q.tacticsFrom(store.value.plan.tactics,t.tactics)));
  assert.equal(store.value.plan.tactics.form,'3-5-2');assert.deepEqual(store.value.session.submitted,submitted);
  assert.ok(!store.value.plan.xi.includes(into));
  assert.ok(store.move('half','halfTalk'));
  const group=t.slots.map(s=>({...s.player,active:true}));
  const line=Q.reaction('half',f,0,{tone:'calm',audience:'Room',gesture:'Hands together'},group,ht);
  assert.ok(store.talk('half',line));assert.ok(store.secondHalf(Q.ticks(m)));assert.ok(!store.secondHalf(Q.ticks(m)));
  const cmd2=store.value.session.checkpoint.commands.at(-1);
  assert.equal(cmd2.type,'second');Q.applyCommand(m,0,cmd2);
  assert.equal(m.half,2);assert.equal(m.t,0);
  runTo(m,'fulltime');const ft=Q.report(m,f,true);auditReport(ft);
  assert.ok(ft.added[1]>=2);assert.ok(ft.events.some(e=>e.type==='stoppage'&&e.time==='90+1′'));
  assert.ok(ft.events.some(e=>e.type==='sub'));assert.ok(ft.stats.some(t=>t.shots));
  assert.ok(store.break('ft',ft,Q.ticks(m)));assert.equal(store.break('ft',ft,Q.ticks(m)),false);
  assert.deepEqual(store.value.results[f.id].goals,ft.goals);
  assert.equal(S.messages(store.value).filter(msg=>msg.id===`result-${f.id}`).length,1);
  assert.equal(S.messages(store.value).filter(msg=>msg.id===`press-${f.id}`).length,1);
  const stats=S.playerStats(store.value);
  assert.equal(stats[into].appearances,C.players[into].appearances+1);assert.ok(stats[into].form.some(e=>e.id===f.id));
  for(const p of ft.players[0].filter(p=>p.injury)){
    assert.ok(S.availability(store.value,p.id).out);assert.ok(!M.avail(store.value.now,store.value.injuries).some(q=>q.id===p.id));
    assert.equal(S.messages(store.value).filter(msg=>msg.id===`injury-${f.id}`).length,1);
  }
  store=S.open(disk);assert.equal(store.value.session.stage,'full');assert.deepEqual(store.value.results[f.id].goals,ft.goals);
  assert.ok(store.move('full','fullTalk'));assert.ok(store.close());assert.ok(!store.close());
  assert.equal(K.next(store.value).id,'2026-11-02-swl');assert.equal(K.due(store.value),null);
  assert.ok(store.advance());assert.equal(K.iso(store.value.now),'2026-10-31');
  assert.ok(store.advance());assert.ok(store.advance());assert.ok(store.enter());
  assert.equal(store.fixture().id,'2026-11-02-swl');assert.deepEqual(Object.keys(store.value.results),[f.id]);
  assert.deepEqual(C.reportFixture.score,[4,0]);assert.equal(H.next.score,null);
});

test('Club Season dual-phase tactics execute live, replay after reload and produce evidence-backed tactical review', {timeout:120000},()=>{
  const disk=storage();let store=S.open(disk);openTie(store);assert.ok(store.move('meeting','selection'));
  assert.ok(store.edit('attackFormation','3-2-5'));assert.ok(store.edit('press','Much more often'));assert.ok(store.edit('trigger','On a backward pass'));
  let plan=store.value.plan, setup=M.sheet(plan,store.value.now,store.value.injuries), selected=setup.xi.find(x=>x.attackJob&&Z.choices(x.attackPosition).length>1);
  assert.ok(selected);const attackRole=Z.choices(selected.attackPosition).find(x=>x!==selected.attackJob[0]);
  assert.ok(store.edit(`phaseRole:${selected.player.id}:attack`,attackRole));assert.ok(store.edit(`phaseDuty:${selected.player.id}:attack`,Z.jobs[attackRole].duties[0]));assert.ok(store.edit(`individual:${selected.player.id}:attack:risk`,'Take more risks'));
  assert.ok(store.submit());putOnPitch(store);const f=store.fixture(),side=Q.managed(f),submitted=store.value.session.submitted,m=Q.create(f,store.value.session),team=m.teams[side];
  assert.equal(team.tactics.formation,submitted.sheet.tactics.form);assert.equal(team.tactics.attackFormation,'3-2-5');
  assert.ok(team.slots.some(x=>x.attack&&x.attackPosition!==x.position));
  const configured=team.slots.find(x=>x.player.id===selected.player.id);assert.equal(configured.attackJob[0],attackRole);assert.equal(configured.instructions.attack.risk,'Take more risks');
  assert.ok(store.checkpoint(0,null,true));for(let i=0;i<2400;i++)m.step(V.STEP);
  const before={elapsed:m.elapsed,score:team.score,events:m.events.length,subs:team.subsUsed,players:Object.fromEntries(team.slots.map(x=>[x.player.id,{x:x.player.x,y:x.player.y,cond:x.player.cond,injury:x.player.injury||0}]))};
  const shape=['4-2-3-1','3-5-2','4-4-2'].find(x=>x!==team.tactics.formation&&D.FORMATIONS[x]);
  const shapeCommand={type:'tactic',change:{formation:shape,attackFormation:'3-2-5',press:2,trigger:'Carrier facing own goal'}};
  assert.ok(Q.applyCommand(m,side,shapeCommand).ok);assert.ok(store.checkpoint(Q.ticks(m),shapeCommand));
  assert.equal(team.tactics.formation,shape);assert.equal(team.tactics.club.trigger,'Carrier facing own goal');
  assert.equal(m.elapsed,before.elapsed);assert.equal(team.score,before.score);assert.equal(m.events.length,before.events);assert.equal(team.subsUsed,before.subs);
  for(const [id,p] of Object.entries(before.players)){const now=team.players.find(x=>x.id===id);assert.equal(now.x,p.x);assert.equal(now.y,p.y);assert.equal(now.cond,p.cond);assert.equal(now.injury||0,p.injury);}
  const playerSlot=team.slots.find(x=>x.player.id===selected.player.id),available=Z.choices(playerSlot.attackPosition),liveRole=available.find(x=>x!==playerSlot.attackJob[0])||available[0];
  const roleCommand={type:'tactic-role',change:{id:selected.player.id,phase:'attack',job:liveRole,duty:Z.duty(liveRole,'Attack')}};
  assert.ok(Q.applyCommand(m,side,roleCommand).ok);assert.ok(store.checkpoint(Q.ticks(m),roleCommand));
  const instructionControl=Q.create(f,S.open(disk).value.session),instructionCommand={type:'tactic-instruction',change:{id:selected.player.id,phase:'attack',group:'risk',value:'Take fewer risks'}};
  assert.ok(Q.applyCommand(m,side,instructionCommand).ok);assert.ok(store.checkpoint(Q.ticks(m),instructionCommand));
  assert.equal(playerSlot.player.assignment.attack.name,liveRole);assert.equal(playerSlot.player.assignment.instructions.attack.risk,'Take fewer risks');
  const passScores=engine=>{const p=engine.teams[side].players.find(x=>x.id===selected.player.id),read=engine.readPlay(p,4),options=engine.decisionOptions(p,read);return new Map(options.filter(x=>x.kind==='pass').map(x=>[`${x.purpose}:${x.pass.target.id}`,x.score]));},beforeRisk=passScores(instructionControl),afterRisk=passScores(m),common=[...beforeRisk.keys()].filter(key=>afterRisk.has(key));
  assert.ok(common.some(key=>afterRisk.get(key)>beforeRisk.get(key)+.05),'Take fewer risks must change at least one subsequent safe-pass score in the Club Season engine');
  const out=team.slots.find(x=>x.role!=='GK').player.id,into=team.bench.find(x=>x.pos!=='GK').id,subCommand={type:'sub',out,in:into};
  assert.ok(Q.applyCommand(m,side,subCommand).ok);assert.ok(store.checkpoint(Q.ticks(m),subCommand));
  const restored=Q.create(f,S.open(disk).value.session);assert.deepEqual(restored.snapshotFrame(),m.snapshotFrame());
  assert.equal(restored.teams[side].tactics.club.trigger,'Carrier facing own goal');assert.equal(restored.teams[side].subsUsed,1);
  assert.equal(restored.teams[side].slots.find(x=>x.player.id===selected.player.id).player.assignment.instructions.attack.risk,'Take fewer risks');
  assert.deepEqual(Q.report(restored,f),Q.report(m,f));
  assert.ok(store.saveLive(Q.tacticsFrom(store.value.plan.tactics,team.tactics)));assert.equal(store.value.plan.tactics.form,shape);assert.equal(store.value.plan.tactics.trigger,'Carrier facing own goal');assert.equal(store.value.plan.tactics.phaseJobs[selected.player.id].attack.job,liveRole);assert.equal(store.value.plan.tactics.playerInstructions[selected.player.id].attack.risk,'Take fewer risks');assert.deepEqual(store.value.session.submitted,submitted);
  runTo(m,'halftime');const ht=Q.report(m,f);assert.ok(ht.tactical[side].execution.attackObservations>0);assert.ok(ht.opposition[side].recommendations.every(x=>x.action&&x.reason));
  assert.ok(store.break('ht',ht,Q.ticks(m)));assert.deepEqual(S.open(disk).value.session.half,ht);assert.ok(store.move('half','halfTalk'));assert.ok(store.secondHalf(Q.ticks(m)));
  Q.applyCommand(m,side,store.value.session.checkpoint.commands.at(-1));runTo(m,'fulltime');const ft=Q.report(m,f,true),review=ft.tactical[side];
  assert.ok(review.planQuality.basis.includes('Recorded shot'));assert.notEqual(review.result.goals,undefined);assert.ok(review.execution.players.some(p=>p.id===into));
  assert.match(review.execution.measurementNotes.shape,/proxy/);assert.match(review.execution.measurementNotes.press,/5.5 metres/);assert.ok(review.execution.players.every(p=>p.defenseFit==null||p.defenseFit<=1));assert.match(review.execution.measurementNotes.press,/proxy/i);assert.deepEqual(review.evidence.observed.label,'Observed match events');assert.deepEqual(review.evidence.calculated.label,'Calculated simulation metrics');assert.deepEqual(review.evidence.estimated.label,'Estimated tactical interpretations');assert.match(ft.opposition[side].scope,/not inferred/);
  assert.ok(review.execution.changes.length>=3);assert.ok(review.recommendations.every(x=>x.action&&x.reason));assert.ok(ft.opposition[side].shots===ft.stats[1-side].shots);
  assert.ok(store.break('ft',ft,Q.ticks(m)));store=S.open(disk);assert.deepEqual(store.value.results[f.id].tactical,ft.tactical);assert.deepEqual(store.value.results[f.id].opposition,ft.opposition);
});

test('an away fixture controls the correct side and a tied cup has a reproducible shootout',()=>{
  const s=S.open().value,f=K.clubFixtures(s).find(f=>!f.score&&f.venue==='A');
  const p=M.plan({},f.date), session={submitted:{sheet:p,fitness:{},focus:'',mood:{}},talks:{},checkpoint:{started:false,ticks:0,commands:[]}};
  const m=Q.create(f,session);assert.equal(Q.managed(f),1);
  assert.deepEqual(m.teams[1].slots.map(s=>s.player.id),p.xi);
  const own=m.teams[1], other=m.teams[0], sub={type:'sub',out:own.slots[1].player.id,in:own.bench.find(p=>p.pos!=='GK').id};
  assert.ok(Q.applyCommand(m,1,sub).ok);assert.equal(other.subsUsed,0);assert.equal(own.subsUsed,1);
  // At an equal score, the cup decision uses the actual finishers, not the original bench.
  const cup={...f,comp:'LC',stage:'Quarter-Final',id:`${f.id}-test-tie`};
  const first=own.slots.find(s=>s.role==='ST').player;own.assignments={...own.assignments,penalty:first.id};
  assert.equal(Q.report(m,f,true).pen,null);
  const a=Q.report(m,cup,true), b=Q.report(m,cup,true);
  assert.deepEqual(a,b);assert.deepEqual(a.goals,[0,0]);assert.notEqual(a.pen[0],a.pen[1]);
  assert.deepEqual(a.pen,[0,1].map(i=>a.kicks.filter(k=>k.team===i&&k.scored).length));
  assert.equal(a.kicks.find(k=>k.team===1).player,first.name);
  assert.ok(a.kicks.every(k=>m.teams[k.team].slots.some(s=>s.player.name===k.player)));
  const result={...a,date:H.next.date,clubs:[H.homeId,H.next.opponent],pen:[5,4]};
  const state={...s,now:K.finish(H.next)+K.HOUR,results:{[H.next.id]:result}};
  assert.equal(K.clubFixtures(state).find(f=>f.stage==='Quarter-Final').home,H.homeId);
});

test('the offline bundle has an isolated match shell, not a stage picker or a result script',()=>{
  const page=readFileSync(join(__dirname,'../index.html'),'utf8');
  assert.match(page,/id="seasonMatch" class="season-match" hidden/);
  assert.match(page,/id="submitTeamDialog"/);
  assert.match(page,/id="clubWaiting" hidden/);
  assert.match(page,/In-possession formation/);assert.match(page,/Player roles & instructions/);assert.match(page,/data-tactical-role/);assert.match(page,/TACTICAL REVIEW/);assert.match(page,/Opposition · observed match evidence/);
  assert.doesNotMatch(page,/Scripted example|Play Classic 2D|Review-only Riverside|Sample data · Changes do not affect/);
});

test('Club Season preparation renders the separate phases and stable-ID role/duty instructions',()=>{
  const page=readFileSync(join(__dirname,'../index.html'),'utf8'),context={document:{readyState:'loading',addEventListener(){}},console,setTimeout,clearTimeout};context.window=context;
  for(const [,script] of page.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))runInNewContext(script,context);
  const store=context.TLSeasonState.open(),s=store.value,M=context.TLMatchdayData,K=context.TLSeasonCalendar,f=K.next(s),opposition=M.opponent(K.club(f.home===M.home.id?f.away:f.home)),base={s,f,opposition,crest:()=>'<svg></svg>'};
  const overview=context.TLMatchPrep.picker({...base,ui:{tab:'overview',layout:'expanded',phase:'attack'}});
  assert.match(overview,/In-possession shape/);assert.match(overview,/Without the ball/);assert.match(overview,/In possession/);
  const individual=context.TLMatchPrep.picker({...base,ui:{tab:'individual',layout:'expanded',instructionPhase:'attack'}});
  assert.match(individual,/data-ms-field="phaseRole:/);assert.match(individual,/data-ms-field="phaseDuty:/);assert.match(individual,/Take more risks/);
});
