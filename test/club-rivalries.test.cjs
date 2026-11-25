const test=require('node:test'),assert=require('node:assert/strict'),R=require('../src/club-rivalries');
function archive(year,results){return {year,nations:{Valdoria:{clubs:['Harbour','Rovers','Vale'],table:[['Harbour',20,15,44],['Rovers',20,12,41],['Vale',20,-27,10]],results}}};}
test('a runaway scorer is not a rivalry; repeated close league meetings become an explainable club rivalry',()=>{
  const state={};R.update(state,archive(2026,[[0,1,5,0],[1,0,0,4],[0,2,0,3]]));
  assert.deepEqual(Object.keys(state.clubRivalries),[]);
  R.update(state,archive(2027,[[0,1,1,0],[1,0,2,1],[0,2,0,3]]));
  const id=JSON.stringify(['Harbour','Rovers']);let rivalry=state.clubRivalries[id];
  assert.ok(rivalry);assert.equal(rivalry.status,'Emerging');assert.equal(rivalry.seasons[0].close,2);
  R.update(state,archive(2028,[[0,1,0,0],[1,0,1,1],[0,2,0,3]]));
  rivalry=state.clubRivalries[id];assert.equal(rivalry.status,'Established');assert.equal(rivalry.seasons.length,2);
  assert.equal(rivalry.closeMeetings,4);assert.deepEqual(R.forClub(state,'Harbour').map(x=>x.id),[id]);
});
test('a close title race can qualify on one close match, reloaded evidence is idempotent and rivalries go dormant',()=>{
  let state={};const first=archive(2030,[[0,1,1,0]]);first.nations.Valdoria.table[1][3]=42;
  R.update(state,first);const id=JSON.stringify(['Harbour','Rovers']);
  assert.equal(state.clubRivalries[id].seasons[0].titleRace,true);
  state=JSON.parse(JSON.stringify(state));R.update(state,first);
  assert.equal(state.clubRivalries[id].seasons.length,1,'reprocessing a season replaces its evidence');
  R.update(state,archive(2031,[]));assert.equal(state.clubRivalries[id].status,'Emerging');
  R.update(state,archive(2032,[]));assert.equal(state.clubRivalries[id].status,'Dormant');
  assert.deepEqual(R.forClub(state,'Harbour'),[],'dormant records stay archived but are not presented as active');
});
test('club rivalry archive remains bounded',()=>{
  const state={clubRivalries:{}};for(let i=0;i<R.MAX+5;i++){const clubs=[`Club ${String(i).padStart(3,'0')}`,`Rival ${String(i).padStart(3,'0')}`];state.clubRivalries[JSON.stringify(clubs)]= {id:JSON.stringify(clubs),clubs,lastEvidence:2040};}
  R.update(state,archive(2040,[]));assert.ok(Object.keys(state.clubRivalries).length<=R.MAX);
});
