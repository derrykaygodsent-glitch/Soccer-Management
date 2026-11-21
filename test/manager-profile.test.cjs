const test = require("node:test"),
  a = require("node:assert/strict"),
  B = require("../src/manager-profile"),
  W = require("../src/manager-life");
function start() {
  return W.create(
    {
      name: "Nia <Bell>",
      age: 31,
      gender: "Female",
      nation: "Valdoria",
      job: "Community coach",
      marital: "Single",
      children: [],
      face: "Oval",
      skin: "Brown",
      path: "apply",
    },
    "file",
  );
}
test("private history recovers old memories and keeps later relationship choices and interviews even if source logs roll off", () => {
  let s = start();
  W.activate(s);
  s.household = {
    ...global.TLHousehold.read(s),
    log: [{ day: 0, text: "Walked home from the market." }],
  };
  s = W.act(s, "districtTravel", "cafe");
  s = W.act(s, "houseScene", "life");
  s = W.act(s, "houseScene", "numbers");
  s = W.act(s, "houseScene", "close");
  const name = s.household.partner.name;
  const club = W.invited(s)[0].name;
  s = W.act(s, "boardVisit", club);
  s = W.act(s, "answer", "academy");
  s.household.log = [];
  const rows = B.history(JSON.parse(JSON.stringify(s)));
  a.ok(
    rows.some(
      (r) =>
        r.kind === "football" &&
        r.text.includes(club) &&
        r.text.includes("youth"),
    ),
  );
  a.ok(
    rows.some(
      (r) =>
        r.kind === "social" &&
        r.text.includes(name) &&
        r.text.includes("exchange numbers"),
    ),
  );
  a.equal(
    rows.filter((r) => r.text === "Walked home from the market.").length,
    1,
  );
  a.deepEqual(B.history(s), rows);
  a.equal(B.history(start()).length, 1);
});
test("profile uses real identity and escaped biography, with navigable sections and category filtering", () => {
  const s = start();
  global.TLClubUI = {
    esc: (v) => String(v).replaceAll("<", "&lt;"),
    art: () => "",
  };
  global.TLCareerEntry = { portrait: () => "<svg></svg>" };
  a.match(B.render(s), /Nia &lt;Bell>/);
  a.match(B.render(s), /Save management/);
  a.match(
    B.render(s, { tab: "history", kind: "social" }),
    /No moments in this chapter yet/,
  );
  a.match(B.render(s, { tab: "history" }), /Opening chapter/);
});
