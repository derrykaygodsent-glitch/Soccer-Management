/* The clock is fictional UTC. All scheduled times, news and results use it, never wall time. */
(function(global){
  'use strict';
  const node=typeof window==='undefined', H=node?require('./home-data.js'):global.TLHomeData, D=node?require('./data.js'):global.TLData;
  const {homeId:R, clubs}=H, DAY=864e5, HOUR=36e5, end=Date.UTC(2027,7,31);
  const day=t=>Math.floor(t/DAY)*DAY;
  const date=(s,h=0,m=0)=>Date.parse(`${s}T00:00:00Z`)+h*HOUR+m*6e4;
  const iso=t=>new Date(t).toISOString().slice(0,10);
  const finish=f=>f.date+110*6e4;
  const isClub=f=>f.home===R||f.away===R;
  const make=(time,home,away,comp,stage='',id=`${iso(time)}-${comp.toLowerCase()}-${home}-${away}`)=>({id,date:time,home,away,comp,stage});
  const clubFixture=f=>({...make(f.date,f.venue==='A'?f.opponent:R,f.venue==='A'?R:f.opponent,f.comp,f.stage,f.id),venue:f.venue,opponent:f.opponent,archived:f.score?(f.venue==='A'?f.score.slice().reverse():f.score):null});
  const base=H.fixtures.map(clubFixture);
  const cupRound=[['nbu','wst'],['kgd','elm'],['ash','lyd'],['dun','efc'],['swl','oak'],['red','crt'],['crl','sby']].map(([h,a])=>make(H.next.date,h,a,'LC','Fourth Round'));
  // The two pending opener ties bring the four clubs with a game in hand level.
  const opener=[
    {...make(date('2026-10-26',12,30),'ash','elm','PD'),archived:[1,0]},
    {...make(date('2026-10-26',15),'oak','kgd','PD'),archived:[2,2]},
    {...make(date('2026-10-26',15),'hpt','swl','PD'),archived:[1,0]},
    make(date('2026-10-26',19,45),'nbu','wst','PD'),
    make(date('2026-10-27',14),'mer','kgd','PD')
  ];
  // Continue the published fixture list with Riverside's outstanding home and away league dates.
  const used=new Set(base.filter(f=>f.comp==='PD').map(f=>`${f.home}:${f.away}`));
  let n=0;
  const remaining=H.standings.map(r=>r.id).filter(x=>x!==R);
  for(let i=0;i<remaining.length;i++){
    for(const [h,a] of [[R,remaining[i]],[remaining[(i+7)%remaining.length],R]]){
      if(used.has(`${h}:${a}`))continue;
      const d=date('2026-12-07',15)+n++*7*DAY;
      base.push(clubFixture({id:`${iso(d)}-${h===R?a:h}`,date:d,venue:h===R?'H':'A',opponent:h===R?a:h,comp:'PD'}));
    }
  }
  base.push(clubFixture({id:'2027-07-26-hpt',date:date('2027-07-26',15),venue:'H',opponent:'hpt',comp:'FR',stage:'Pre-season'}));
  // A circle schedule yields one home and one away meeting per opponent.
  // Pin Riverside's pre-announced fixtures to their actual dates, and fill
  // each of those same rounds with the corresponding background pairings.
  const pairOrder=['crt','kgd','efc','oak','crl','hpt','swl','wst','sby','brk','ard','dun','ash','red','val','nbu','elm','lyd','mer'];
  const rounds=new Map(), circle=[R,...pairOrder];
  for(let i=0;i<circle.length-1;i++){
    const pairs=Array.from({length:circle.length/2},(_,j)=>{
      const pair=[circle[j],circle.at(-1-j)];return (i+j)%2?pair.reverse():pair;
    });
    const other=pairs[0].find(id=>id!==R);
    rounds.set(other,{venue:pairs[0][0]===R?'H':'A',pairs:pairs.slice(1)});
    circle.splice(1,0,circle.pop());
  }
  const outer=base.filter(f=>!f.archived&&f.comp==='PD').flatMap(f=>{
    const round=rounds.get(f.opponent), flip=round.venue!==f.venue;
    return round.pairs.map(([h,a],j)=>make(day(f.date)+(j===0?12.5:j===round.pairs.length-1?17.5:15)*HOUR,...(flip?[a,h]:[h,a]),'PD'));
  });
  const continental=base.filter(f=>!f.archived&&f.comp==='CC').flatMap(f=>[['nbu','oak'],['brk','crl']].map(([h,a])=>make(f.date,h,a,'CC','League Phase')));
  const fixed=[...base,...opener,...outer,...continental,...cupRound].sort((a,b)=>a.date-b.date||a.id.localeCompare(b.id));
  const backgroundCache=new Map();
  function background(f){
    if(backgroundCache.has(f.id))return backgroundCache.get(f.id);
    const rng=D.mulberry32(D.seedFor(`${f.id}:2026`)), chance=(id,home)=>{
      const row=H.standings.find(x=>x.id===id), factor=(row?.pts??17)/45;
      let g=0; for(let i=0;i<7;i++)if(rng()<.11+factor*.25+(home?.035:0))g++;
      return g;
    };
    const goals=[chance(f.home,true),chance(f.away,false)];
    const pen=goals[0]===goals[1]&&f.comp==='LC'?(rng()<.5?[5,4]:[3,4]):null;
    const result={goals,pen};backgroundCache.set(f.id,result);return result;
  }
  function outcome(f,s){
    if(f.archived)return {goals:f.archived,pen:null};
    if(isClub(f)){const r=s.results[f.id];return r&&(r.finishedAt??finish(f))<=s.now?r:null;}
    return finish(f)<=s.now?background(f):null;
  }
  const winner=(f,r)=>!r?null:(r.pen||r.goals)[0]>(r.pen||r.goals)[1]?f.home:f.away;
  function slate(s){
    const rows=fixed.slice();let round=[base.find(f=>f.id===H.next.id),...cupRound];
    for(const [d,stage] of [['2026-12-18','Quarter-Final'],['2027-01-15','Semi-Final'],['2027-03-16','Final']]){
      const teams=round.map(f=>winner(f,outcome(f,s)));if(teams.some(x=>!x))break;
      round=Array.from({length:teams.length/2},(_,i)=>make(date(d,stage==='Final'?16:19,stage==='Final'?0:45),teams[i*2+(stage==='Semi-Final'?1:0)],teams[i*2+(stage==='Semi-Final'?0:1)],'LC',stage));
      rows.push(...round);
    }
    return rows.sort((a,b)=>a.date-b.date||a.id.localeCompare(b.id));
  }
  function clubFixtures(s){return slate(s).filter(isClub).map(f=>{const r=outcome(f,s),a=f.away===R;return {...f,venue:f.venue||(a?'A':'H'),opponent:a?f.home:f.away,score:r?(a?r.goals.slice().reverse():r.goals):null,pen:r?.pen?(a?r.pen.slice().reverse():r.pen):null};});}
  const next=s=>clubFixtures(s).find(f=>!f.score)||null;
  const due=s=>{const f=next(s);return f&&day(f.date)===day(s.now)?f:null;};
  const countdown=(now,then)=>{const days=(day(then)-day(now))/DAY;return days<=0?'Today':days===1?'Tomorrow':`${days} days`;};
  const onDate=(s,ts)=>slate(s).filter(f=>day(f.date)===day(ts)).map(f=>({...f,result:outcome(f,s)}));
  function tables(s,start,comp){
    const rows=start.map(r=>({...r})), by=Object.fromEntries(rows.map(r=>[r.id,r]));
    for(const f of fixed){
      if(f.comp!==comp||f.archived)continue;
      const score=outcome(f,s)?.goals;if(!score)continue;
      [f.home,f.away].forEach((id,i)=>{const r=by[id], a=score[i], b=score[1-i];if(!r)return;r.played++;r.gf+=a;r.ga+=b;r.gd=r.gf-r.ga;r.pts+=a>b?3:a===b?1:0;r[a>b?'w':a===b?'d':'l']++;});
    }
    return rows.sort((a,b)=>b.pts-a.pts||b.gd-a.gd||b.gf-a.gf||a.id.localeCompare(b.id));
  }
  const continentalStandings=(s,base)=>tables(s,base,'CC');
  function standings(s){
    const rows=tables(s,H.standings,'PD');
    if(s.now>H.start){
      const previous=tables({...s,now:Math.max(H.start,day(s.now)-1)},H.standings,'PD');
      rows.forEach((r,i)=>{r.move=Math.sign(previous.findIndex(x=>x.id===r.id)-i);});
    }
    return rows;
  }
  const positions=s=>{
    const days=[...new Set(fixed.filter(f=>f.comp==='PD'&&!f.archived&&outcome(f,s)).map(f=>day(f.date)))];
    return [...H.positionHistory,...days.map(d=>tables({...s,now:Math.min(s.now,d+DAY-1)},H.standings,'PD').findIndex(x=>x.id===R)+1)];
  };
  const cupId=/^(2026-12-18|2027-01-15|2027-03-16)-lc-([a-z]+)-([a-z]+)$/;
  const fixtureId=id=>{
    if(typeof id!=='string')return false;
    if(base.some(f=>!f.archived&&f.id===id))return true;
    const m=cupId.exec(id);return !!m&&m[2]!==m[3]&&[m[2],m[3]].includes(R)&&Object.hasOwn(clubs,m[2])&&Object.hasOwn(clubs,m[3]);
  };
  const announcedDate=d=>base.some(f=>iso(f.date)===d);
  const style=['direct','defend','counter','press','possession'];
  function club(id){const c=clubs[id];if(c.stadium)return c;const i=H.standings.findIndex(r=>r.id===id);return {...c,city:c.name.split(' ')[0],stadium:`${c.name.split(' ')[0]} Ground`,style:style[i%5],rep:Math.max(54,74-i*.7),gk:'#d2a743',away:'#e0e9e6'};}
  const officials=f=>{
    const pool=['Rowan Bell','Amelia Brooks','Isaac Reid','Tariq Evans','Maya Sutton','Ellis Cole','Robin Grant','Asha Foster','Daniel Webb'];
    const i=D.seedFor(f.id)%pool.length;return [pool[i],pool[(i+2)%pool.length],pool[(i+4)%pool.length],pool[(i+6)%pool.length]];
  };
  const manager=id=>id===R?H.manager:id==='hpt'?H.opponentManager:['Rory Haines','Amir Bennett','Tessa Cole','Jonas Pike','Nia Grant'][D.seedFor(id)%5];
  const api={DAY,HOUR,end,day,date,iso,finish,isClub,slate,clubFixtures,next,due,countdown,onDate,standings,continentalStandings,positions,fixtureId,announcedDate,club,officials,manager,outcome,winner};
  global.TLSeasonCalendar=api;if(node)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
