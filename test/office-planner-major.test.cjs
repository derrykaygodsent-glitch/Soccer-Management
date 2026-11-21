const test = require("node:test"),
  a = require("node:assert/strict"),
  P = require("../src/office-planner"),
  L = require("../src/district-life"),
  M = require("../src/major-leagues"),
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
test("four 20-team professional leagues have 19 home and away fixtures per club; seeded cup qualifies 16 and crowns one winner", () => {
  const s = { id: "world", day: Y.dayOf(2027, 5, 20) };
  for (const n of M.names) {
    const { games, rows } = M.league(s, n, 2026);
    a.equal(games.length, 380);
    a.equal(new Set(games.map((f) => f.a + "|" + f.b)).size, 380);
    a.equal(rows.length, 20);
    for (const r of rows) {
      a.equal(r.p, 38);
      a.equal(games.filter((x) => x.a === r.name).length, 19);
    }
  }
  const c = M.cup(s, 2026);
  a.equal(new Set(c.groups.flatMap((q) => q.rows.map((x) => x.name))).size, 16);
  a.deepEqual(
    c.knockouts.map((r) => r.length),
    [4, 2, 1],
  );
  a.equal(c.winner, c.knockouts[2][0].winner);
  a.deepEqual(c, M.cup({ ...s }, 2026));
  a.equal(M.cup({ ...s, day: Y.dayOf(2026, 8, 1) }, 2026).winner, null);
});
