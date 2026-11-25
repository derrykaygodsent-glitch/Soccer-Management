const { test } = require("node:test"),
  a = require("node:assert/strict"),
  vm = require("node:vm"),
  fs = require("node:fs");
const g = {
  TLManagerLife: { date: String },
  TLClubUI: { esc: String, art: () => "" },
  TLData: require("../src/data"),
  TLKit: require("../src/squad-registration"),
  TLPress: { conferencePanel: (s, c) => `<div data-conference="${c.id}">${c.status}</div>` },
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
test("Unread filter excludes opened mail without changing read state", () => {
  const s = {
    mail: [
      { day: 2, from: "Training ground", text: "Running" },
      { day: 1, from: "National FA", text: "Licence", opened: true },
    ],
  };
  const unread = g.TLOfficeOrganiser.inbox(s, { filter: "Unread" }), openedId = s.mail[1].mailId;
  a.doesNotMatch(unread, new RegExp(`data-mail="${openedId}"`));
  a.equal(s.mail[0].opened, undefined);
  a.equal(s.mail[1].opened, true);
});
test('desk briefing captures the exact arrival before acknowledging it, without consuming mail or closing bids',()=>{const s={day:3,mail:[{from:'Transfer desk',topic:'transferBid',text:'Port offered for Sol.'}],bids:{sol:{id:'sol',name:'Sol',to:'Port',status:'open',opened:3}}};const first=g.TLDeskAttention.badges(s,'bids');a.equal(first.fresh.length,2);const html=g.TLDeskAttention.digest(first.fresh.map(([,x])=>x));a.match(html,new RegExp(`data-update-mail="${s.mail[0].mailId}"`));a.match(html,/Sol · Port · open/);const back=g.TLDeskAttention.badges(s,'bids');a.equal(back.fresh.length,0);a.equal(back.actions.bids,1);a.equal(back.counts.inbox,1);s.bids.sol.status='agreed';const change=g.TLDeskAttention.badges(s,'bids');a.equal(change.actions.bids,0);a.equal(change.fresh.length,1);a.match(change.fresh[0][1].label,/agreed/);});
test('mail IDs survive newly arrived mail and still select the original message',()=>{const O=g.TLOfficeOrganiser,s={id:'stable-mail',day:3,mail:[{day:1,from:'Club accountant',text:'Original report'}]};O.ensureMailIds(s);const id=s.mail[0].mailId;s.mail.unshift({day:3,from:'National FA',text:'New message'});O.ensureMailIds(s);a.equal(s.mail[1].mailId,id);const html=O.inbox(s,{mail:id});a.match(html,new RegExp(`data-mail="${id}"`));a.match(html,new RegExp(`data-read-mail="${s.mail[0].mailId}"`));a.match(html,/Original report/);a.match(html,/data-life="go" data-v="finance"/);});
test('Inbox All, New, Tasks, and Unread filters distinguish arrival day, pending work, and read state',()=>{const O=g.TLOfficeOrganiser,s={id:'filter-mail',day:4,mail:[{day:4,from:'Training ground',text:'New unread'},{day:2,from:'National FA',text:'Still unread'},{day:4,from:'Club accountant',text:'Already seen',opened:true},{day:3,from:'Meridian Wire',text:'Briefing',pressConferenceId:'c'}],pressConferences:[{id:'c',status:'invited'}]};const html=filter=>O.inbox(s,{filter});a.match(html('All mail'),/4 messages/);a.match(html('New'),/New unread/);a.doesNotMatch(html('New'),/Still unread/);a.match(html('Needs response'),/Briefing/);a.doesNotMatch(html('Needs response'),/New unread/);a.match(html('Unread'),/Still unread/);a.doesNotMatch(html('Unread'),/Already seen/);});
test('Inbox keeps the quick filters and removes the separate search/filter/sort panel',()=>{const html=g.TLOfficeOrganiser.inbox({id:'compact-inbox',day:1,mail:[{day:1,from:'National FA',text:'A message'}]},{});a.match(html,/data-inbox-filter="All mail"/);a.match(html,/data-inbox-filter="New"/);a.match(html,/data-inbox-filter="Needs response"/);a.match(html,/data-inbox-filter="Unread"/);a.doesNotMatch(html,/Filter and sort|data-post=|mail-tools|inbox-icon-button/);});
test('press request inbox actions target its own conference instead of bypassing the conference engine',()=>{const O=g.TLOfficeOrganiser,s={id:'press-inbox',day:4,club:{name:'Port FC'},mail:[{day:4,from:'Meridian Wire',text:'Attend the briefing.',pressConferenceId:'post:fixture'}],pressConferences:[{id:'post:fixture',status:'invited',type:'postmatch',title:'Post-match conference',day:4,club:'Port FC',context:{opponent:'Rovers'},questions:[{id:'q1',journalistId:'reporter',prompt:'What did you make of the match?'}]}]};const html=O.inbox(s,{});a.match(html,/Press conference briefing/);a.match(html,/data-inbox-start="post:fixture"/);a.doesNotMatch(html,/data-life="mediaAttend|mediaDelegate|mediaEnd|pressAnswer"/);});
test('conference room, leave, and press history stay within the Inbox route',()=>{const O=g.TLOfficeOrganiser,c={id:'post:history',status:'answered',title:'Post-match conference',type:'postmatch',club:'Port FC',day:2,answeredDay:3,answers:[{},{}]},s={id:'press-focus',day:3,mail:[],pressConferences:[c]};const room=O.inbox(s,{pressView:'room',pressId:c.id});a.match(room,/inbox-press-focus/);a.match(room,/Leave session/);a.match(room,/data-conference="post:history"/);a.doesNotMatch(room,/mail-layout/);const history=O.inbox(s,{pressView:'history'});a.match(history,/Press history/);a.match(history,/data-inbox-history-open="post:history"/);const detail=O.inbox(s,{pressView:'history-detail',pressId:c.id});a.match(detail,/Back to Press history/);a.match(detail,/data-conference="post:history"/);const router=fs.readFileSync(require.resolve('../src/manager-desk.js'),'utf8');a.match(router,/if\(b\.dataset\.inboxStart\)/);a.doesNotMatch(router,/case 'mediaRoom'/);});
test('mail destinations distinguish founding, licensing, disciplinary, finance and career-history messages',()=>{const O=g.TLOfficeOrganiser;for(const [m,page] of [[{from:'National FA',text:'Founding decision'},'create'],[{from:'National FA licensing manager',text:'Licence decision'},'faOffice'],[{from:'Independent National FA appeals panel',text:'Appeal decision'},'faOffice'],[{from:'Club accounts',text:'Fine paid'},'finance'],[{from:'Managers’ desk',text:'You stepped down at Port FC.'},'succession']]){a.equal(O.classify(m)[3],page);const html=O.inbox({id:'route-test',day:3,mail:[{...m,day:2}]},{});a.match(html,new RegExp(`data-life="go" data-v="${page}"`));}});
test('new and historical Terrace trial mail resolve the actual application, without a match diary fallback',()=>{const O=g.TLOfficeOrganiser,app={id:'keeper',day:7,name:'Rafael Neri'},post={id:'manager:2',call:{until:9,apps:[app]}},s={day:8,network:{updates:[post]}},old={from:'Terrace · Trial requests',text:'Rafael Neri replied to your goalkeeper call: …',day:7};for(const m of [old,{...old,topic:'terraceTrial',postId:post.id,applicantId:app.id}]){a.equal(O.classify(m)[3],'social');a.equal(O.trialTarget(s,m).app,app);a.ok(O.pending(s,m));a.equal(O.trialTarget({day:12},m),null);}a.equal(O.classify({from:'Unknown',text:'Hello'})[3],null);a.equal(O.classify({from:'Match correspondent',text:'Full time'})[3],'fixtures');});
