'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {runInNewContext}=require('node:vm');
const H=require('../src/home-data.js');
const C=require('../src/club-data.js');
const S=require('../src/club-state.js');
const sum=(rows, project)=>rows.reduce((t,row)=>t+project(row),0);

test('Home, Schedule and the historical report share one dated fixture list and scoring convention',()=>{
  assert.equal(H.fixtures.length,new Set(H.fixtures.map(f=>f.id)).size);
  assert.ok(H.fixtures.every((f,i)=>!!H.clubs[f.opponent]&&(!i||f.date>H.fixtures[i-1].date)));
  assert.ok(H.homeFixtures.includes(H.next));
  assert.ok(H.homeFixtures.includes(C.reportFixture));
  assert.equal(H.next.id,'2024-10-30-hpt');
  assert.equal(H.fixtureCompetition(H.next),H.matchConfig().competition);
  const record=H.standings.find(r=>r.id===H.homeId);
  const played=H.fixtures.filter(f=>f.comp==='PD'&&f.score);
  assert.equal(played.length,record.played);
  assert.equal(sum(played,f=>f.score[0]),record.gf);
  assert.equal(sum(played,f=>f.score[1]),record.ga);
  assert.equal(sum(played,f=>f.score[0]>f.score[1]?3:f.score[0]===f.score[1]?1:0),record.pts);
  assert.equal(H.form.length,6);
  assert.ok(H.form.every(f=>f.score[0]>f.score[1]));
  assert.equal(C.reportFixture.venue,'A');
  assert.equal(C.matchReport.goals.length,C.reportFixture.score[0]);
  assert.ok(C.matchReport.goals.every(([,id])=>C.players[id]));
  assert.ok(C.inbox.every((m,i)=>m.date<=H.start&&(!i||m.date<=C.inbox[i-1].date)));
  assert.equal(C.leagues[0].rows,H.standings);
});

test('first-team roles, leaders and Quick Pick use the deterministic Riverside roster',()=>{
  assert.deepEqual(C.roster.map(p=>p.id),H.squad.map(p=>p.id));
  const forward=C.players[C.leaders.forward], winger=C.players[C.leaders.winger];
  assert.equal(forward.goals,16); assert.equal(forward.rating,8.38);
  assert.equal(winger.assists,11);
  assert.equal(sum(C.roster,p=>p.goals),sum(H.fixtures.filter(f=>f.score&&f.comp!=='FR'),f=>f.score[0]));
  for (const mode of ['balanced','fitness']) {
    const sheet=C.quickPick(mode);
    assert.equal(sheet.length,new Set(sheet).size);
    assert.equal(sheet.length,17);
    assert.ok(sheet.slice(0,11).every(id=>C.players[id].injury?.status!=='Out'));
    if(mode==='fitness') assert.ok(sheet.slice(0,11).every(id=>C.players[id].injury?.risk!=='High'));
  }
  let s=S.normalize();
  const gk=s.sheet[0], previousSlot=s.sheet.indexOf('rvr_17');
  s=S.reduce(s,'sheet-player',{id:'rvr_17',slot:0});
  assert.equal(s.sheet[0],'rvr_17');assert.equal(s.sheet[previousSlot],gk);
  assert.equal(S.reduce(s,'sheet-player',{id:'rvr_11',slot:1}),s);
  assert.equal(S.reduce(s,'clear-sheet').sheet.length,0);
});

test('Inbox unread is per message and starter-save decisions survive a reload without affecting match config',()=>{
  const entries=new Map();
  const storage={getItem:key=>entries.get(key),setItem:(key,value)=>entries.set(key,value)};
  const store=S.open(storage);
  const original=H.matchConfig();
  assert.equal(S.unread(store.value).length,4);
  assert.equal(store.apply('read','match'),true);
  assert.equal(store.apply('read','match'),false);
  assert.equal(S.unread(store.value).length,3);
  assert.equal(store.apply('read','constructor'),false);
  store.apply('read-all'); assert.equal(S.unread(store.value).length,0);
  store.apply('media','delegated'); assert.equal(store.apply('media','attended'),false);
  store.apply('shortlist','marin'); store.apply('agent','marin');
  store.apply('reminders',H.next.id);
  store.apply('watch',C.youth[0].id);
  store.apply('staffList',C.staffPool[0].id);
  store.apply('delegate',{task:'transfers',owner:'Leon Rook'});
  store.apply('board',C.boardOptions[0]); assert.equal(store.apply('board',C.boardOptions[0]),false);
  store.apply('meeting',C.meetingTopics[0]);
  assert.deepEqual(S.open(storage).value,store.value);
  assert.deepEqual(H.matchConfig(),original);
  const opaque = S.open({ getItem(){throw Error('blocked');}, setItem(){throw Error('blocked');} });
  assert.equal(opaque.apply('shortlist','marin'),true);
  assert.deepEqual(opaque.value.shortlist,['marin']);
});

test('scout reports and transfer drafts do not spend cash; budget adjustments preserve the annual allocation',()=>{
  assert.equal(sum(C.finance.incomeParts,x=>x[1]),C.finance.income);
  assert.equal(sum(C.finance.expenseParts,x=>x[1]),C.finance.expenditure);
  assert.equal(C.finance.monthlyProfit.at(-1)*1e6,C.finance.income-C.finance.expenditure);
  const s=S.normalize();
  assert.equal(S.budgets(s).transfer,H.finance.transfer);
  const adjusted=S.reduce(s,'budget',20000), budget=S.budgets(adjusted);
  assert.equal(budget.transfer,H.finance.transfer-20000*52);
  assert.equal(budget.wage,H.finance.wage+20000);
  assert.equal(budget.transfer+52*budget.wage,H.finance.transfer+52*H.finance.wage);
  assert.equal(S.reduce(adjusted,'budget',S.limits.min-5000),adjusted);
  assert.equal(S.reduce(adjusted,'budget',S.limits.max+5000),adjusted);
  const scout=C.prospects[0];
  assert.equal(S.reduce(adjusted,'offer',{id:scout.id,fee:budget.transfer+1}),adjusted);
  const drafted=S.reduce(adjusted,'offer',{id:scout.id,fee:scout.value});
  assert.equal(drafted.offers[scout.id],scout.value);
  assert.deepEqual(S.budgets(drafted),budget);
  assert.deepEqual(S.reduce(drafted,'offer-delete',scout.id).offers,{});
});

test('planning changes validate known identifiers and preserve the cup fixture',()=>{
  const state=S.normalize({offers:{fake:10,marin:-1},focus:[{id:'portugal',region:'unlisted'}],sheet:[{toString:null},'rvr_11','rvr_17','rvr_17'],budgetShift:'21000'});
  assert.deepEqual(state.offers,{});assert.deepEqual(state.focus,[]);assert.equal(state.budgetShift,0);
  assert.equal(state.sheet[0],null);assert.equal(state.sheet[1],null);assert.equal(state.sheet[2],'rvr_17');assert.equal(state.sheet[3],null);
  const focus={id:'test-focus',region:'Finland',pos:'CM',priority:'High'};
  let s=S.reduce(state,'focus-put',focus);assert.deepEqual(s.focus,[focus]);
  s=S.reduce(s,'focus-put',{...focus,priority:'Low'});assert.equal(s.focus[0].priority,'Low');
  s=S.reduce(s,'focus-delete',focus.id);assert.deepEqual(s.focus,[]);
  const friendly=(date)=>({id:`friendly-${date}-nbu`,date,opponent:'nbu',venue:'A'});
  assert.equal(S.reduce(s,'friendly',friendly('2024-10-30')),s);
  assert.equal(S.reduce(s,'friendly',friendly('2024-11-02')),s);
  const draft=friendly('2024-12-07'); s=S.reduce(s,'friendly',draft);
  assert.deepEqual(s.friendlies,[draft]); assert.equal(S.reduce(s,'friendly',draft),s);
  assert.deepEqual(S.reduce(s,'friendly-delete',draft.id).friendlies,[]);
  assert.equal(H.next.id,'2024-10-30-hpt');
});

test('every enabled clubhouse destination and tab renders in the offline bundle',()=>{
  const page=readFileSync(join(__dirname,'../index.html'),'utf8');
  const context={document:{readyState:'loading',addEventListener(){}}};context.window=context;
  for (const [,source] of page.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) runInNewContext(source,context);
  const views=context.TLClubUI.views;
  const names=['inbox','schedule','squad','scouting','transfers','club','competitions','vision','dynamics','staff','development','finance','tactics','player','matchday','medical','training'];
  assert.deepEqual(Object.keys(views).sort(),names.sort());
  const s=context.TLClubState.normalize(), fiscal=context.TLClubState.budgets(s);
  let count=0;
  for(const [key,view] of Object.entries(views))for (const [tab] of view.tabs) {
    const html=view.render({r:{page:key,tab,id:''},ui:{},s,fiscal,now:H.start,narrow:()=>false,unread:()=>S.unread(s),crest:()=>'<svg aria-hidden="true"></svg>',portrait:()=>''});
    assert.ok(html.length>300,`${key}/${tab} must show the workspace`);
    assert.doesNotMatch(html,/src="(?:undefined|https?:)/);
    for(const [,target] of html.matchAll(/data-c-go="([^"]+)"/g)) assert.ok(target==='home'||views[target],`${key}/${tab} routes to ${target}`);
    count++;
  }
  assert.ok(count>=80);
});
