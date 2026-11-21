const test = require("node:test"),
  a = require("node:assert/strict"),
  P = require("../src/office-planner"),
  L = require("../src/district-life"),
  F = require("../src/fa-season"),
  Y = require("../src/season-turnover"),
  W = require("../src/manager-life");
test("booked shifts stop the daily reducer; travel, wage and subsequent appointment survive reload", () => {
  let s = W.create(
    {
      name: "K",
      age: 32,
      gender: "Male",
      nation: "Valdoria",
      job: "Unemployed",
      marital: "Single",
      children: [],
      face: "Oval",
      skin: "Brown",
      path: "apply",
    },
    "planner",
  );
  W.activate(s);
  s = W.act(s, "bookTime", { day: 2, hour: 10, id: "shift:porter" });
  a.throws(
    () => W.act(s, "bookTime", { day: 2, hour: 11, id: "scouting" }),
    /uses that time/,
  );
  s = W.act(s, "bookTime", { day: 2, hour: 15, id: "scouting" });
  s = W.act(W.act(s, "advance"), "advance");
  a.throws(() => W.act(s, "advance"), /appointment/);
  s = W.act(JSON.parse(JSON.stringify(s)), "arriveTime");
  a.equal(L.state(s).hour, 10);
  a.equal(L.state(s).place, "market");
  const cash = s.cash;
  s = W.act(s, "attendTime", 10);
  a.ok(s.cash > cash);
  a.equal(L.state(s).hour, 14);
  s = W.act(s, "arriveTime");
  a.equal(L.state(s).hour, 15);
  s = W.act(s, "cancelTime", { day: 2, hour: 15 });
  a.equal(P.today(s), undefined);
  a.equal(W.act(s, "advance").day, 3);
});
test('Atlas associations use real club squads and playable domestic draws; published old saves keep their season',()=>{
 const s={id:'atlas',worldVersion:1,atlasLeagueFrom:2026,day:0,profile:{nation:'Zandora'},plans:[],roster:[],tactic:'4-4-2'};W.activate(s);
 for(const [n,count] of [['Zandora',19],['Westmark',19],['Azmara',19]]){const clubs=F.clubs(s,n,2026),games=F.fixtures(s,n,2026);a.equal(clubs.length,count);a.equal(new Set(games.map(f=>f.team+'|'+f.host)).size,count*(count-1));a.ok(games.every(f=>f.day<Y.dayOf(2027,6,1)));const name=clubs.at(-1),ps=W.pool.filter(p=>p.club===name);a.ok(ps.length>=11&&ps.every(p=>p.nation===n));a.ok(W.nations[n].includes(name));const career={...s,club:{name},day:F.dates(s,n,2026)[0],roster:ps.map(p=>p.id)},L=require('../src/league-matchday'),f=L.fixture(career);a.ok(f.own>=0);a.equal(L.replay(f,career).teams[f.own].slots.length,11);}
 const c=require('../src/cup-circuit').circuit({...s,day:Y.dayOf(2027,5,30)},W.pool).find(x=>x.title==='World Club Championship');a.equal(c.groups.length,8);a.ok(c.groups.flat().every(r=>r.p===3));a.ok(c.entries.includes(c.winner));const old={...s};delete old.atlasLeagueFrom;W.activate(old);a.equal(F.clubs(old,'Zandora',2026).length,5);a.equal(F.clubs(old,'Zandora',2027).length,19);
});
