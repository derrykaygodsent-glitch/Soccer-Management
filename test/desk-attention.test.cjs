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
  const unread = inbox({ filter: "Unread" }), openedId = s.mail[1].mailId;
  a.doesNotMatch(unread, new RegExp(`data-mail="${openedId}"`));
  a.doesNotMatch(inbox({ query: "running" }), new RegExp(`data-mail="${openedId}"`));
  const html = inbox({ order: "Oldest first" });
  a.ok(html.indexOf(`data-mail="${s.mail[1].mailId}"`) < html.indexOf(`data-mail="${s.mail[0].mailId}"`));
  a.equal(s.mail[0].opened, undefined);
});
test('desk briefing captures the exact arrival before acknowledging it, without consuming mail or closing bids',()=>{const s={day:3,mail:[{from:'Transfer desk',topic:'transferBid',text:'Port offered for Sol.'}],bids:{sol:{id:'sol',name:'Sol',to:'Port',status:'open',opened:3}}};const first=g.TLDeskAttention.badges(s,'bids');a.equal(first.fresh.length,2);const html=g.TLDeskAttention.digest(first.fresh.map(([,x])=>x));a.match(html,new RegExp(`data-update-mail="${s.mail[0].mailId}"`));a.match(html,/Sol · Port · open/);const back=g.TLDeskAttention.badges(s,'bids');a.equal(back.fresh.length,0);a.equal(back.actions.bids,1);a.equal(back.counts.inbox,1);s.bids.sol.status='agreed';const change=g.TLDeskAttention.badges(s,'bids');a.equal(change.actions.bids,0);a.equal(change.fresh.length,1);a.match(change.fresh[0][1].label,/agreed/);});
test('mail IDs survive newly arrived mail and still select the original message',()=>{const O=g.TLOfficeOrganiser,s={id:'stable-mail',day:3,mail:[{day:1,from:'Club accountant',text:'Original report'}]};O.ensureMailIds(s);const id=s.mail[0].mailId;s.mail.unshift({day:3,from:'National FA',text:'New message'});O.ensureMailIds(s);a.equal(s.mail[1].mailId,id);const html=O.inbox(s,{mail:id});a.match(html,new RegExp(`data-mail="${id}"`));a.match(html,new RegExp(`data-read-mail="${s.mail[0].mailId}"`));a.match(html,/Original report/);a.match(html,/data-life="go" data-v="finance"/);});
test('mail destinations distinguish founding, licensing, disciplinary, finance and career-history messages',()=>{const O=g.TLOfficeOrganiser;for(const [m,page] of [[{from:'National FA',text:'Founding decision'},'create'],[{from:'National FA licensing manager',text:'Licence decision'},'faOffice'],[{from:'Independent National FA appeals panel',text:'Appeal decision'},'faOffice'],[{from:'Club accounts',text:'Fine paid'},'finance'],[{from:'Managers’ desk',text:'You stepped down at Port FC.'},'succession']]){a.equal(O.classify(m)[3],page);const html=O.inbox({id:'route-test',day:3,mail:[{...m,day:2}]},{});a.match(html,new RegExp(`data-life="go" data-v="${page}"`));}});
test('new and historical Terrace trial mail resolve the actual application, without a match diary fallback',()=>{const O=g.TLOfficeOrganiser,app={id:'keeper',day:7,name:'Rafael Neri'},post={id:'manager:2',call:{until:9,apps:[app]}},s={day:8,network:{updates:[post]}},old={from:'Terrace · Trial requests',text:'Rafael Neri replied to your goalkeeper call: …',day:7};for(const m of [old,{...old,topic:'terraceTrial',postId:post.id,applicantId:app.id}]){a.equal(O.classify(m)[3],'social');a.equal(O.trialTarget(s,m).app,app);a.ok(O.pending(s,m));a.equal(O.trialTarget({day:12},m),null);}a.equal(O.classify({from:'Unknown',text:'Hello'})[3],null);a.equal(O.classify({from:'Match correspondent',text:'Full time'})[3],'fixtures');});
