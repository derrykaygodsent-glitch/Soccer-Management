const test=require('node:test'),assert=require('node:assert/strict');
const Trends=require('../src/league-tactical-trends'),Technical=require('../src/technical-area'),Data=require('../src/data');
function archive(year,styles){const clubs=['Harbour','Rovers','Vale'];return {year,nations:{Valdoria:{table:clubs.map((club,i)=>[club,20,10,45-i*2]),results:[]}},styles};}
function seasonStyles(){return {Harbour:'press',Rovers:'press',Vale:'counter'};}
test('top-three tactical trend requires three seasons and multiple adopting clubs, then tolerates one contrary season',()=>{
  const state={};for(let year=2026;year<2028;year++)Trends.update(state,archive(year),{Valdoria:seasonStyles()});
  assert.equal(Trends.trend(state,'Valdoria'),null,'two successful seasons do not start a league fashion');
  Trends.update(state,archive(2028),{Valdoria:seasonStyles()});
  const trend=Trends.trend(state,'Valdoria');assert.equal(trend.style,'press');assert.equal(trend.seasonsObserved,3);assert.equal(trend.supportingClubs,2);assert.equal(trend.supportShare,2/3);
  Trends.update(state,archive(2029),{Valdoria:{Harbour:'counter',Rovers:'press',Vale:'counter'}});
  assert.equal(Trends.trend(state,'Valdoria').style,'press','a single contrary finish should not erase a repeated trend');
  const singleClub={};for(let year=2026;year<2029;year++)Trends.update(singleClub,archive(year),{Valdoria:{Harbour:'press',Rovers:'counter',Vale:'direct'}});
  assert.equal(Trends.trend(singleClub,'Valdoria'),null,'one dominant club cannot manufacture a league-wide trend');
});
test('appointments copy a sustained league fashion selectively while established club identity wins',()=>{
  const state={id:'trend-test',day:90,profile:{nation:'Valdoria'},plans:[]};
  for(let year=2026;year<2029;year++)Trends.update(state,archive(year),{Valdoria:seasonStyles()});
  const clubs=Array.from({length:40},(_,i)=>`New Club ${i}`),pool=clubs.flatMap(club=>Data.genSquad({id:club,rep:85},Data.seedFor(club)).map(p=>({...p,club})));global.TLManagerLife={pool,nations:{Valdoria:['Harbour','Rovers','Vale']},money:String,date:String};
  const fitClubs=clubs.filter(club=>Trends.squadFit(pool.filter(p=>p.club===club),'press').ready),elected=fitClubs.filter(club=>Trends.adoption(state,'Valdoria',club,pool.filter(p=>p.club===club)));
  assert.ok(elected.length>3&&elected.length<fitClubs.length,'only a minority of tactically suitable clubs should echo the trend');
  const underpowered=Data.genSquad({id:'Underpowered',rep:54},Data.seedFor('Underpowered')).map(p=>({...p,club:'Underpowered',attrs:Object.fromEntries(Object.keys(p.attrs).map(k=>[k,7]))}));pool.push(...underpowered);assert.equal(Trends.squadFit(underpowered,'press').ready,false);assert.equal(Trends.adoption(state,'Valdoria','Underpowered',underpowered),null,'a club without the relevant attributes cannot copy the fashion');const underpoweredBaseline=Technical.hireCoach({...state,leagueTacticalTrends:{}},'Underpowered',[],'Valdoria');assert.deepEqual(Technical.hireCoach(state,'Underpowered',[],'Valdoria'),underpoweredBaseline,'a low-fit club keeps its generated style');
  const adopted=elected[0],other=clubs.find(club=>!elected.includes(club));
  assert.equal(Technical.hireCoach(state,adopted,[],'Valdoria').style,'press');
  const unchanged=Technical.hireCoach({...state,leagueTacticalTrends:{}},other,[],'Valdoria');
  assert.deepEqual(Technical.hireCoach(state,other,[],'Valdoria'),unchanged,'non-adopters retain their independent generated style');
  const rooted={...state,clubWorldHistory:{Rooted:{identity:{seasonsObserved:5,recurringStyle:'defend'}}}};
  assert.equal(Technical.hireCoach(rooted,'Rooted',[],'Valdoria').style,'defend','a sustained club identity resists the league fashion');
  const returning=[{id:'old-press',style:'press'},{id:'old-direct',style:'direct'}];
  assert.equal(Technical.hireCoach(state,adopted,returning,'Valdoria').style,'press','a matching former coach is favored when the trend is adopted');
  global.TLManagerLife={nations:{Valdoria:['Harbour','Rovers','Vale']},money:String,date:String};global.TLClubUI={esc:String,art:()=>''};
  const html=Technical.render(state,'Valdoria');assert.match(html,/League tactical trend · High press in 67% of top-three coach seasons across 3 seasons and 2 clubs/);assert.match(html,/performance correlation, not proof that the tactic caused success/);
});
test('league trend evidence is rolling, bounded, and idempotent across a saved season',()=>{
  const state={};for(let year=2020;year<2030;year++)Trends.update(state,archive(year),{Valdoria:seasonStyles()});
  assert.equal(state.leagueTacticalTrends.Valdoria.seasons.length,Trends.WINDOW);
  const before=JSON.stringify(state.leagueTacticalTrends);Trends.update(state,archive(2029),{Valdoria:seasonStyles()});
  assert.equal(JSON.stringify(state.leagueTacticalTrends),before,'reprocessing a year does not duplicate its observation');
  const restored=JSON.parse(JSON.stringify(state));assert.equal(Trends.trend(restored,'Valdoria').style,'press');
});
