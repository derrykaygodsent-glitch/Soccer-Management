const { test } = require("node:test"),
  a = require("node:assert/strict"),
  vm = require("node:vm"),
  fs = require("node:fs");
const g = {
  TLManagerLife: { date: String },
  TLClubUI: { esc: String, art: () => "" },
  TLData: require("../src/data"),
  TLKit: require("../src/squad-registration"),
};
for (const name of ["office-organiser", "desk-attention"])
  vm.runInNewContext(
    fs.readFileSync(require.resolve("../src/" + name), "utf8"),
    { window: g },
  );
test("viewing the registration tab, reading post, and completing a filing are independent", () => {
  const m = {
      from: "Registration office",
      text: "Due today",
      kit: "League",
      day: 0,
      start: -3,
      end: 0,
      club: "Port",
    },
    s = { club: { name: "Port" }, day: 0, mail: [m] };
  let v = g.TLDeskAttention.badges(s, "home");
  a.equal(v.counts.inbox, 1);
  a.equal(v.counts.kitOffice, 1);
  v = g.TLDeskAttention.badges(s, "kitOffice");
  a.equal(v.counts.kitOffice, 0);
  a.equal(v.counts.inbox, 1);
  m.opened = true;
  v = g.TLDeskAttention.badges(JSON.parse(JSON.stringify(s)), "inbox");
  a.equal(v.counts.inbox, 0);
  a.equal(v.actions.kitOffice, 1);
  s.kitRegister = {
    list: [{ title: "League", day: 0, year: 2026, club: "Port" }],
  };
  a.equal(g.TLDeskAttention.badges(s, "inbox").actions.kitOffice, 0);
});
test("inbox filter/search/order do not mark mail as read", () => {
  const s = {
    mail: [
      { day: 2, from: "Training ground", text: "Running" },
      { day: 1, from: "National FA", text: "Licence", opened: true },
    ],
  };
  const inbox = (u) => g.TLOfficeOrganiser.inbox(s, u);
  a.doesNotMatch(inbox({ filter: "Unread" }), /data-mail="0"/);
  a.doesNotMatch(inbox({ query: "running" }), /data-mail="0"/);
  const html = inbox({ order: "Oldest first" });
  a.ok(html.indexOf('data-mail="0"') < html.indexOf('data-mail="1"'));
  a.equal(s.mail[0].opened, undefined);
});
test('desk briefing captures the exact arrival before acknowledging it, without consuming mail or closing bids',()=>{const s={day:3,mail:[{from:'Transfer desk',topic:'transferBid',text:'Port offered for Sol.'}],bids:{sol:{id:'sol',name:'Sol',to:'Port',status:'open',opened:3}}};const first=g.TLDeskAttention.badges(s,'bids');a.equal(first.fresh.length,2);const html=g.TLDeskAttention.digest(first.fresh.map(([,x])=>x));a.match(html,/data-update-mail="0"/);a.match(html,/Sol · Port · open/);const back=g.TLDeskAttention.badges(s,'bids');a.equal(back.fresh.length,0);a.equal(back.actions.bids,1);a.equal(back.counts.inbox,1);s.bids.sol.status='agreed';const change=g.TLDeskAttention.badges(s,'bids');a.equal(change.actions.bids,0);a.equal(change.fresh.length,1);a.match(change.fresh[0][1].label,/agreed/);});
