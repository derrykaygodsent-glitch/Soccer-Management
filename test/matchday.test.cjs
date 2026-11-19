'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {runInNewContext}=require('node:vm');
const H=require('../src/home-data.js');
const C=require('../src/club-data.js');
const M=require('../src/matchday-data.js');
const bundle=()=>readFileSync(join(__dirname,'../index.html'),'utf8');
function browserVM(){
  const ctx={document:{readyState:'loading',addEventListener(){}}};ctx.window=ctx;
  for(const [,script] of bundle().matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) runInNewContext(script,ctx);
  return ctx;
}

test('matchday preview dates and lineups use Riverside identities without editing the advertised fixture',()=>{
  assert.equal(M.fixture,H.next);
  assert.equal(M.matchTitle,'Riverside FC v Harbourport Town');
  const original=H.matchConfig();
  assert.deepEqual(M.reviewDays.map(x=>x.id),['2024-10-26','2024-10-27','2024-10-28','2024-10-29','2024-10-30']);
  let day=M.day('').id;for(let i=0;i<4;i++)day=M.dateForNextDay(day);
  assert.equal(day,M.fixtureDay);assert.equal(M.dateForNextDay(day),undefined);assert.equal(M.time(day),H.next.date);
  for(const formation of M.formationOptions){
    const {xi,bench,out}=M.sheet(formation);
    const squad=[...xi.map(s=>s.player),...bench,...out];
    assert.equal(squad.length,18);
    assert.equal(new Set(squad.map(p=>p.id)).size,squad.length);
    assert.equal(xi.length,11);
    assert.equal(bench.length,6);
    assert.ok(xi.every(s=>s.label&&C.players[s.player.id]&&s.player.injury?.status!=='Out'));
  }
  assert.equal(M.opposition.xi.length,11);
  assert.ok(M.opposition.xi.every(s=>s.player.id.startsWith(H.next.opponent+'_')));
  assert.deepEqual(H.matchConfig(),original);
  assert.equal(H.next.score,null);
});

test('scoreboards and xG are derived from the sample timeline, with a separate historical result',()=>{
  const ht=M.snapshot(45),ft=M.snapshot(90);
  assert.deepEqual(ht.score,[1,0]);assert.deepEqual(ft.score,[2,1]);
  assert.ok(ht.notable.every(e=>e.min<=45));
  assert.ok(ft.notable.some(e=>e.min===56&&e.kind==='medical'&&e.player===M.knock.id));
  assert.ok(ht.xi.some(s=>s.player.id===M.knock.id));
  assert.ok(ft.xi.some(s=>s.player.id===M.knock.sub));
  assert.ok(!ft.xi.some(s=>s.player.id===M.knock.id));
  for(const snap of [ht,ft])for(let side=0;side<2;side++){
    const chances=snap.attempts.filter(a=>a.side===side);
    const stat=k=>snap.stats.find(r=>r[0]===k)[side+1];
    assert.equal(chances.length,stat('Shots'));
    assert.equal(chances.filter(a=>a.on).length,stat('On Target'));
    assert.equal(chances.reduce((v,a)=>v+a.xg,0).toFixed(2),stat('xG'));
    assert.equal(snap.notable.filter(e=>e.kind==='ball'&&e.side===side).length,snap.score[side]);
  }
  assert.deepEqual(M.cupFixtures.find(r=>r[1]===H.homeId)[3],ft.score);
  assert.deepEqual(M.leagueFixtures.find(r=>r[2]===H.homeId)[3],[0,4]);
  assert.equal(H.next.score,null);
});

test('the review path and alternate matchday screens exist in the offline bundle',()=>{
  const ctx=browserVM(), U=ctx.TLClubUI, matchday=U.views.matchday;
  const s=ctx.TLClubState.normalize(), fiscal=ctx.TLClubState.budgets(s);
  let route={page:'matchday',tab:'calendar',id:''};
  let c={get r(){return route;},ui:{},s,fiscal,now:H.start,narrow:()=>false,unread:()=>[],crest:()=>'<svg aria-hidden="true"></svg>',portrait:()=>'',go(page,tab,id){route={page,tab:page==='home'?'':tab,id:id||''};}};
  const expected=[...Array(4).fill('Next Day'),'Fixtures','Briefing','Lineups','Half Time','Team Talk','Second Half','Full Time','Team Talk','Inbox','Club Home'];
  for(const label of expected){assert.equal(matchday.nextLabel(c),label);matchday.advance(c);}
  assert.equal(route.page,'home');
  const screens=[['calendar','2024-10-29',/Tomorrow/],['fixtures','league',/Premier Division standings/],['fixtures','cup',/Tactical meeting/],['fixtures','cup-results',/2 – 1/],['briefing','',/Notable reactions/],['lineups','hpt',/hpt"/],['half','',/Half-time backroom advice/],['half','talk',/Hand over to assistant/],['touchline','',/has picked up a knock/],['full','',/Staff feedback/],['full','talk',/Final team talk/],['post','report',/match desk/],['post','press',/Likely talking points/],['post','risk',/Risk assessment/],['post','knock',/post-match medical note/i]];
  for(const [tab,id,expected] of screens){
    route={page:'matchday',tab,id};
    const html=matchday.render(c);
    assert.match(html,expected,`${tab}/${id}`);
    assert.match(html,/Scripted example · No season, save or match changes/);
    assert.doesNotMatch(html,/src="(?:undefined|https?:)/);
  }
  route={page:'tactics',tab:'transition',id:''};
  assert.match(U.views.tactics.render(c),/When possession is lost.*Counter-press[\s\S]*?When possession is won[\s\S]*?Goalkeeper in possession/);
  route={page:'player',tab:'attributes',id:'rvr_14'};
  assert.match(U.views.player.render(c),/Diego Berg/);
  assert.match(U.views.player.render(c),/Technical[\s\S]*Mental[\s\S]*Physical/);
});
