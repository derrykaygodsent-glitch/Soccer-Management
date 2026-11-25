/* Persistent club rivalries inferred only from archived, meaningful league meetings. */
(function(g){'use strict';
const WINDOW=5,MAX=300;
const key=(a,b)=>JSON.stringify([a,b].sort((x,y)=>x.localeCompare(y)));
function inspect(rec){
  const clubs=rec?.clubs||[],table=rec?.table||[],rows=new Map(table.map(([name,p,gd,pts],index)=>[name,{index,p,gd,pts}]));
  const meetings=new Map();
  for(const [home,away,hg,ag] of rec?.results||[]){
    const a=clubs[home],b=clubs[away];if(!a||!b||a===b)continue;
    const pair=key(a,b),row=meetings.get(pair)||{clubs:[a,b].sort((x,y)=>x.localeCompare(y)),matches:0,close:0,draws:0,scores:[]};
    const margin=Math.abs((Number(hg)||0)-(Number(ag)||0));row.matches++;
    if(margin<=1)row.close++;
    if(margin===0)row.draws++;
    row.scores.push(`${a} ${hg}–${ag} ${b}`);meetings.set(pair,row);
  }
  const evidence=[];
  for(const row of meetings.values()){
    const [a,b]=row.clubs,ra=rows.get(a),rb=rows.get(b);if(!ra||!rb)continue;
    const titleRace=ra.index<2&&rb.index<2&&Math.abs(ra.pts-rb.pts)<=5;
    if(row.close>=2||titleRace&&row.close>=1)evidence.push({...row,titleRace,qualified:true});
  }
  return evidence;
}
function update(state,archive){
  const all=state.clubRivalries||(state.clubRivalries={}),year=Number(archive?.year);if(!Number.isFinite(year))return all;
  for(const [nation,rec] of Object.entries(archive.nations||{}))for(const signal of inspect(rec)){
    const id=key(...signal.clubs),prior=all[id]||{id,clubs:signal.clubs,nations:[],seasons:[]};
    prior.nations=[...new Set([...(prior.nations||[]),nation])].sort();
    const seasons=(prior.seasons||[]).filter(x=>x.year!==year);
    seasons.push({year,nation,matches:signal.matches,close:signal.close,draws:signal.draws,titleRace:signal.titleRace,scores:signal.scores.slice(-4)});
    prior.seasons=seasons.sort((a,b)=>a.year-b.year).slice(-WINDOW);
    const qualifying=prior.seasons.filter(x=>x.close>=2||x.titleRace&&x.close>=1),recent=prior.seasons.at(-1);
    prior.status=year-(qualifying.at(-1)?.year??-99)>=2?'Dormant':qualifying.length>=2?'Established':'Emerging';
    prior.lastEvidence=qualifying.at(-1)?.year??null;
    prior.closeMeetings=prior.seasons.reduce((n,x)=>n+x.close,0);
    prior.history=prior.seasons.map(x=>({year:x.year,nation:x.nation,close:x.close,titleRace:x.titleRace,scores:x.scores}));
    prior.lastSeen=recent?.year??year;all[id]=prior;
  }
  for(const [id,r] of Object.entries(all)){
    const qualifying=(r.seasons||[]).filter(x=>x.close>=2||x.titleRace&&x.close>=1);
    r.status=year-(r.lastEvidence??-99)>=2?'Dormant':qualifying.length>=2?'Established':'Emerging';
    if(year-(r.lastEvidence??year)>5)delete all[id];
  }
  const entries=Object.entries(all).sort((a,b)=>(b[1].lastEvidence||0)-(a[1].lastEvidence||0)||a[0].localeCompare(b[0]));
  for(const [id] of entries.slice(MAX))delete all[id];
  return all;
}
function forClub(state,club){const order={Established:0,Emerging:1,Dormant:2};return Object.values(state?.clubRivalries||{}).filter(r=>r.status!=='Dormant'&&r.clubs?.includes(club)).sort((a,b)=>(order[a.status]??3)-(order[b.status]??3)||(b.lastEvidence||0)-(a.lastEvidence||0)||a.clubs.join('').localeCompare(b.clubs.join('')));}
const api={inspect,update,forClub,WINDOW,MAX};g.TLClubRivalries=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
