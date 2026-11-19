/* Illustrative matchday snapshots. Do not import these into the engine or save reducer. */
(function (global) {
  'use strict';
  const node=typeof window==='undefined';
  const H=node?require('./home-data.js'):global.TLHomeData;
  const C=node?require('./club-data.js'):global.TLClubData;
  const D=node?require('./data.js'):global.TLData;
  const fixture=H.next, home=H.clubs[H.homeId], away=H.clubs[fixture.opponent];
  const matchTitle=`${home.name} v ${away.name}`;
  const dayMs=864e5, iso=date=>new Date(date).toISOString().slice(0,10);
  const fixtureDay=iso(fixture.date), firstDay=iso(H.start);
  const plan = [
    ['2024-10-25',['Attacking movement','Travel','Match preview']],
    [firstDay,['Match review']],
    ['2024-10-27',['Recovery','Rest','Rest']],
    ['2024-10-28',['Endurance','Tactical shape','Rest']],
    ['2024-10-29',['Quickness','Set-piece routines','Match preview']],
    [fixtureDay,['Team briefing']],
    ['2024-10-31',['Recovery','Match review','Rest']],
    ['2024-11-01',['Defensive shape','Rest','Match preview']],
    ['2024-11-02',['Team briefing']]
  ].map(([id,sessions])=>({id,sessions,date:Date.parse(id+'T10:00:00Z'),fixture:H.fixtures.find(f=>iso(f.date)===id),youth:C.youthFixtures.u21.find(([date])=>date===id)}));
  const reviewDays=plan.filter(d=>d.id>=firstDay&&d.id<=fixtureDay);
  const day=id=>reviewDays.find(d=>d.id===id)||reviewDays[0];
  const byDate=id=>plan.find(d=>d.id===id);
  const time=id=>id===firstDay?H.start:id===fixtureDay?fixture.date:byDate(id)?.date||H.start;
  const dateForNextDay=id=>reviewDays[reviewDays.indexOf(day(id))+1]?.id;
  const presets=[
    {name:'Control Possession',form:'4-3-3',mentality:'Positive',familiarity:87,intensity:69,passing:'Shorter',tempo:'Standard',width:'Fairly wide',build:'Play out of defence',lost:'Counter-press',won:'Hold shape',gk:'Slow pace down',target:'Centre-backs',delivery:'Take short kicks',line:'Higher',press:'More often',block:'High press',duels:'Stay on feet'},
    {name:'High Press',form:'4-2-3-1',mentality:'Attacking',familiarity:72,intensity:89,passing:'Standard',tempo:'Higher',width:'Fairly wide',build:'Run at defence',lost:'Counter-press',won:'Counter',gk:'Distribute quickly',target:'Full-backs',delivery:'Roll it out',line:'Higher',press:'Much more often',block:'High press',duels:'Stay on feet'},
    {name:'Direct Counter',form:'4-4-2',mentality:'Balanced',familiarity:78,intensity:51,passing:'More direct',tempo:'Higher',width:'Standard',build:'Pass into space',lost:'Regroup',won:'Counter',gk:'Distribute quickly',target:'Flanks',delivery:'Take long kicks',line:'Standard',press:'Standard',block:'Mid block',duels:'Stay on feet'}
  ];
  const formationOptions=['4-3-3','4-2-3-1','4-4-2','3-5-2','5-3-2'];
  const roleNames={GK:['SK','Sweeper Keeper','Defend'],FB:['FB','Full-Back','Support'],WB:['WB','Wing-Back','Support'],DC:['BPD','Ball-Playing Defender','Defend'],DM:['BWM','Ball-Winning Midfielder','Defend'],CM:['DLP','Deep-Lying Playmaker','Support'],AM:['AP','Advanced Playmaker','Support'],W:['IW','Inverted Winger','Attack'],ST:['AF','Advanced Forward','Attack']};
  function position(slot,formation) {
    const side=slot.y<.5?'L':'R';
    return ({GK:'GK',DC:slot.y===.5?'DC':`DC${side}`,FB:`D${side}`,WB:`WB${side}`,DM:formation==='4-2-3-1'?`DM${side}`:'DM',CM:slot.y===.5?'MC':`MC${side}`,AM:'AMC',W:formation==='4-4-2'?`M${side}`:`AM${side}`,ST:slot.y===.5?'ST':`ST${side}`})[slot.role];
  }
  const filled=(slots,formation)=>slots.map(slot=>({...slot,label:position(slot,formation)}));
  const available=C.roster.filter(p=>p.injury?.status!=='Out');
  const visitors=D.genSquad(away,D.seedFor(away.id));
  const out=C.roster.filter(p=>p.injury?.status==='Out');
  function sheet(formation='4-3-3', club=home.id) {
    const visiting=club===away.id;
    const shape=visiting?D.defaultTactics(away.style).formation:formationOptions.includes(formation)?formation:presets[0].form;
    const {xi,bench}=D.bestXI(visiting?visitors:available,shape);
    return { club, shape, xi:filled(xi,shape), bench:visiting?bench.slice(0,6):bench, out:visiting?[]:out };
  }
  // Fixed sample cup tie. Both lineups, scoreboxes, xG, stats, events and coverage
  // use these snapshots. They are independent of the playable fixture and save.
  const starting=sheet(), opposition=sheet(undefined,away.id);
  const knock={min:56,id:'rvr_6',sub:'rvr_8',condition:41,issue:'Ankle knock'};
  const byPlayer=id=>C.players[id]||visitors.find(p=>p.id===id);
  const matchSide=[home.id,away.id];
  const shots=[
    [4,0,.08,0],[7,1,.06,0],[9,0,.13,1],[12,0,.06,0],[16,1,.11,1],
    [20,0,.21,1],[24,0,.34,1,'rvr_17'],[31,0,.04,0],[34,1,.10,0],
    [38,0,.18,1],[43,0,.09,0],[47,0,.08,0],[50,1,.18,0],[54,0,.05,0],
    [59,1,.26,1],[64,0,.19,1],[67,0,.11,0],[71,0,.29,1,'rvr_17'],
    [75,1,.31,1,'hpt_17'],[77,1,.07,0],[79,0,.06,0],[82,0,.12,1],[86,1,.14,1]
  ].map(([min,side,xg,on,scorer])=>({min,side,xg,on:!!on,scorer}));
  const extras=[{min:28,side:1,kind:'card',player:'hpt_3'}, {min:40,side:0,kind:'card',player:'rvr_9'},
    {min:knock.min,side:0,kind:'medical',player:knock.id}, {min:58,side:0,kind:'swap',player:knock.sub}, {min:69,side:1,kind:'card',player:'hpt_11'}];
  const events=[...shots.filter(s=>s.scorer).map(s=>({min:s.min,side:s.side,kind:'ball',player:s.scorer})),...extras].sort((a,b)=>a.min-b.min);
  const halftimeRatings={rvr_0:6.9,rvr_7:6.9,rvr_5:7.2,rvr_2:7.0,rvr_6:7.0,rvr_9:6.8,rvr_12:7.3,rvr_10:7.2,rvr_15:6.8,rvr_17:7.8,rvr_14:7.5};
  const finalRatings={rvr_0:7.1,rvr_7:7.0,rvr_5:7.3,rvr_2:6.9,rvr_6:6.9,rvr_8:7.1,rvr_9:7.0,rvr_12:7.5,rvr_10:7.6,rvr_15:7.2,rvr_17:9.1,rvr_14:8.3};
  function snapshot(min) {
    const minutes=Number(min)===45?45:90, ht=minutes===45;
    const attempts=shots.filter(s=>s.min<=minutes), groups=matchSide.map((_,side)=>attempts.filter(s=>s.side===side));
    const score=groups.map(g=>g.filter(s=>s.scorer).length), xg=groups.map(g=>+(g.reduce((sum,s)=>sum+s.xg,0).toFixed(2)));
    const notable=events.filter(s=>s.min<=minutes), ratings=ht?halftimeRatings:finalRatings;
    const xi=ht?starting.xi:starting.xi.map(s=>s.player.id===knock.id?{...s,player:C.players[knock.sub]}:s);
    const best=Object.keys(ratings).sort((a,b)=>ratings[b]-ratings[a])[0];
    const stats=[['Shots',...groups.map(g=>g.length)],['On Target',...groups.map(g=>g.filter(s=>s.on).length)],['xG',...xg.map(n=>n.toFixed(2))],
      ['Corners',...(ht?[3,1]:[6,3])],['Fouls',...(ht?[5,7]:[10,13])],['Yellow Cards',...matchSide.map((_,i)=>notable.filter(e=>e.side===i&&e.kind==='card').length)],
      ['Passes completed',...(ht?['88%','74%']:['86%','76%'])],['Possession',...(ht?['62%','38%']:['60%','40%'])]];
    return {minutes,score,xg,attempts,notable,stats,ratings,xi,best};
  }

  const leagueFixtures=[
    ['12:30','oak','sby',[2,1],['T. Sinclair 19′, 66′','N. Duarte 75′']],
    ['15:00','kgd','dun',[3,0],['C. Seong 14′, 59′ · I. Field 80′','']],
    ['15:00','swl','ard',[1,1],['A. Larsen 32′','F. Bako 71′']],
    [H.calendar(C.reportFixture.date).day.slice(4),C.reportFixture.opponent,home.id,C.reportFixture.score.slice().reverse(),['',C.matchReport.goals.map(([m,id])=>`${byPlayer(id).name} ${m}′`).join(' · ')]],
    ['15:00','wst','val',[2,0],['J. Finch 12′ · M. Sato 54′','']],
    ['17:30','hpt','lyd',[1,0],['Jonas Vidic 63′','']]
  ];
  const cupFixtures=[
    ['19:45','kgd','crl',[1,0],['C. Seong 68′','']],
    [H.calendar(fixture.date).day.slice(4),home.id,away.id,snapshot(90).score,['Fabio Novak 24′, 71′','Jonas Vidic 75′']],
    ['19:45','nbu','wst',[2,0],['M. Lund 13′ · E. Hunt 64′','']],
    ['19:45','oak','swl',[2,1],['T. Sinclair 12′ · C. Hardy 88′','A. Larsen 51′']]
  ];
  const tabs=[['calendar','Calendar'],['fixtures','Fixtures & Results'],['briefing','Briefing'],['lineups','Lineups'],['half','Half Time'],['touchline','In-play Tactics'],['full','Full Time'],['post','Post-match Inbox']];
  const messages=[
    {id:'player-of-match',time:'21:39',kind:'Match',from:'Sam Ellis',subject:'FW: Novak at the double as Riverside go through'},
    {id:'report',time:'21:32',kind:'Match',from:'Sam Ellis',subject:'FW: League Cup · Riverside edge Harbourport'},
    {id:'knock',time:'21:27',kind:'Injuries',from:C.namedStaff['Head Physio'],subject:`${byPlayer(knock.id).name} to be assessed`},
    {id:'press',time:'21:21',kind:'Media',from:'Sam Ellis',subject:'Post-match press conference about to begin'},
    {id:'risk',time:'09:53',kind:'Injuries',from:C.namedStaff['Head of Sports Science'],subject:'Riverside injury risk update'}
  ];
  const data={fixture,home,away,matchTitle,fixtureDay,firstDay,reviewDays,plan,day,byDate,time,dateForNextDay,iso,presets,formationOptions,roleNames,starting,opposition,sheet,knock,byPlayer,matchSide,snapshot,leagueFixtures,cupFixtures,tabs,messages};
  global.TLMatchdayData=data;
  if(typeof module!=='undefined'&&module.exports)module.exports=data;
})(typeof window!=='undefined'?window:globalThis);
