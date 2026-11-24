const test=require('node:test'),assert=require('node:assert/strict');
const Trends=require('../src/league-tactical-trends'),Technical=require('../src/technical-area');
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
  const elected=[];for(let i=0;i<40;i++){const club=`New Club ${i}`;if(Trends.adoption(state,'Valdoria',club))elected.push(club);}
  assert.ok(elected.length>5&&elected.length<20,'only a minority of new appointments should echo the trend');
  const adopted=elected[0],other='Different Club';
  assert.equal(Technical.hireCoach(state,adopted,[],'Valdoria').style,'press');
  const unchanged=Technical.hireCoach({...state,leagueTacticalTrends:{}},other,[],'Valdoria');
  assert.deepEqual(Technical.hireCoach(state,other,[],'Valdoria'),unchanged,'non-adopters retain their independent generated style');
  const rooted={...state,clubWorldHistory:{Rooted:{identity:{seasonsObserved:5,recurringStyle:'defend'}}}};
  assert.equal(Technical.hireCoach(rooted,'Rooted',[],'Valdoria').style,'defend','a sustained club identity resists the league fashion');
  const returning=[{id:'old-press',style:'press'},{id:'old-direct',style:'direct'}];
  assert.equal(Technical.hireCoach(state,adopted,returning,'Valdoria').style,'press','a matching former coach is favored when the trend is adopted');
  global.TLManagerLife={nations:{Valdoria:['Harbour','Rovers','Vale']},money:String,date:String};global.TLClubUI={esc:String,art:()=>''};
  const html=Technical.render(state,'Valdoria');assert.match(html,/League tactical trend · High press in 67% of top-three coach seasons across 3 seasons and 2 clubs/);
});
test('league trend evidence is rolling, bounded, and idempotent across a saved season',()=>{
  const state={};for(let year=2020;year<2030;year++)Trends.update(state,archive(year),{Valdoria:seasonStyles()});
  assert.equal(state.leagueTacticalTrends.Valdoria.seasons.length,Trends.WINDOW);
  const before=JSON.stringify(state.leagueTacticalTrends);Trends.update(state,archive(2029),{Valdoria:seasonStyles()});
  assert.equal(JSON.stringify(state.leagueTacticalTrends),before,'reprocessing a year does not duplicate its observation');
  const restored=JSON.parse(JSON.stringify(state));assert.equal(Trends.trend(restored,'Valdoria').style,'press');
});
