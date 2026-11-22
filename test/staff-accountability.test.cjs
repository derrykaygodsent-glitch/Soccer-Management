const test=require('node:test'),a=require('node:assert/strict');
const money=n=>'₥'+Number(n||0).toLocaleString('en-GB');
global.TLManagerLife={date:d=>'Day '+d,money};
global.TLLuma={format:money,record:()=>{}};
global.TLClubUI={esc:v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;'),art:()=>''};
global.TLDynamics=require('../src/team-dynamics');
const O=require('../src/staff-office'),Training=require('../src/training-room'),Development=require('../src/career-development'),W=require('../src/manager-life'),FA=require('../src/fa-hearing');
const make=()=>({id:'accountability',club:{name:'Kay FC'},profile:{nation:'Zandora',name:'Manager'},staff:[],fund:500000,cash:5000,day:0,roster:[],mail:[],plans:[]});
const player={id:'young',name:'Kofi Mensah',pos:'CM',age:18,nation:'Zandora',club:'Kay FC',attrs:{pace:12,passing:13,shooting:11,tackling:10,dribbling:12,positioning:12,composure:11,aggression:10,workRate:12,stamina:12,handling:8,reflexes:8}};

test('training page names its coaching staff, explains their practical contribution, and shows their reports',()=>{
  const s=make();O.act(s,'staffHire','3|0');const m=s.club.staffOffice.members[3];m.duty=0;m.log=[{day:7,text:'Head coach filed the first-team week plan for 11 players.',success:true}];m.lastReview=28;m.grade=120;m.reviewResult='Overperforming';
  const html=Training.render(s,[]);
  a.match(html,/team-practice coaching bonus: \+0 sharpness/);
  a.match(html,/first-team week plan/);
  a.match(html,/Head coach/);
  a.match(html,/Plan the first-team week/);
  a.match(html,/Overperforming/);
});

test('monthly staff rating compares delivered work with the agreed target and preserves manager control',()=>{
  const s=make();s.roster=[player.id];O.act(s,'staffHire','7|0');O.act(s,'staffDuty','7|0');
  for(const day of [7,14,21,28]){s.day=day;O.morning(s,[player]);}
  const m=s.club.staffOffice.members[7];
  a.equal(m.grade,120);
  a.equal(m.reviewResult,'Overperforming');
  a.equal(O.performance(m).label,'Overperforming');
  const report=O.reportPanel(s,'development');
  a.match(report,/Youth development coach/);
  a.match(report,/Technical development/);
  a.match(report,/development session/);
  a.match(report,/Overperforming/);
  a.match(Development.render(s),/BACKROOM ACCOUNTABILITY/);
  a.equal(s.contracts?.[player.id],undefined,'staff development does not automatically create a player contract');
});

test('club-founding applications close on their own FA window while submitted hearings remain active',()=>{
  const s=W.create({name:'Nia',age:30,gender:'Female',nation:'Zandora',job:'Community coach',marital:'Single',children:[],face:'Oval',skin:'Brown',path:'found'},'licence-status'),form={name:'Trial Harbour FC',nick:'Harbours',emblem:'★'};
  let window=FA.foundingWindow(s);
  s.day=window.open;W.activate(s);window=FA.foundingWindow(s);
  a.equal(window.active,true);
  s.fund=25000;
  a.deepEqual(FA.blockers(s,form,W.emblems),[]);
  const open=FA.application(s);
  a.match(open,/Club-founding applications are open/);
  a.match(open,new RegExp(W.date(window.close)));
  a.match(open,/<form id="faForm"/);
  a.match(open,/year-round licensing applications for existing clubs/);
  const closedSave={...s,day:window.close+1};W.activate(closedSave);
  const closed=FA.application(closedSave);
  a.match(closed,/Founding window closed/);
  a.match(closed,/year-round licensing applications for existing clubs/);
  a.match(closed,new RegExp(W.date(FA.foundingWindow(closedSave).open)));
  a.doesNotMatch(closed,/<form id="faForm"/);
  a.doesNotMatch(closed,/one goalkeeper and ten other players/);
  a.throws(()=>W.act(closedSave,'register',form),/founding window closed/i);
  const lastDay={...s,day:window.close};W.activate(lastDay);
  const submitted=W.act(lastDay,'register',form);
  a.equal(submitted.draft.name,form.name);
  const afterDeadline={...submitted,day:window.close+1};
  a.match(FA.application(afterDeadline),/application remains active/);
  a.doesNotMatch(FA.application(afterDeadline),/<form id="faForm"/);
});

test('relevant staff reports are routed to their football area and no unrelated department leaks into it',()=>{
  const s=make();O.act(s,'staffHire','1|0');O.act(s,'staffHire','2|0');
  const office=s.club.staffOffice;
  office.members[1].log=[{day:7,text:'Fitness recovery · Kofi Mensah: condition 85%.',success:true,player:player.id}];
  office.members[2].log=[{day:7,text:'Filed a player report on Ama Soro.',success:true,player:'scout-target'}];
  a.match(O.reportPanel(s,'medical'),/Physio/);
  a.doesNotMatch(O.reportPanel(s,'medical'),/Youth Scout/);
  a.match(O.reportPanel(s,'scouting'),/Youth scout/);
  a.doesNotMatch(O.reportPanel(s,'scouting'),/Physio/);
});
