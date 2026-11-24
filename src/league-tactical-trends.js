/* Slow, local tactical fashions inferred from repeated successful league finishes. */
(function(g){'use strict';
const WINDOW=5,STYLES=['press','counter','possession','direct','defend','attack'];
const D=g.TLData||require('./data.js');
function season(year,record,styles={}){const clubs=record?.table||[];return {year,podium:clubs.slice(0,3).map(([club],i)=>({club,rank:i+1,style:STYLES.includes(styles[club])?styles[club]:null}))};}
function profile(rows=[]){
  const seasons=rows.slice(-WINDOW),counts=new Map(),styleYears=new Map(),clubsByStyle=new Map();let total=0;
  for(const row of seasons){const seen=new Set();for(const entry of row.podium||[]){if(!STYLES.includes(entry.style))continue;total++;counts.set(entry.style,(counts.get(entry.style)||0)+1);if(!seen.has(entry.style)){styleYears.set(entry.style,(styleYears.get(entry.style)||0)+1);seen.add(entry.style);}if(!clubsByStyle.has(entry.style))clubsByStyle.set(entry.style,new Set());clubsByStyle.get(entry.style).add(entry.club);}}
  const choices=[...counts.keys()].sort((a,b)=>counts.get(b)-counts.get(a)||a.localeCompare(b)),candidate=choices[0],support=candidate&&counts.get(candidate)||0,share=total?support/total:0,seasonsSupporting=styleYears.get(candidate)||0,distinctClubs=clubsByStyle.get(candidate)?.size||0;
  const established=seasons.length>=3&&seasonsSupporting>=3&&distinctClubs>=2&&share>=.5;
  return {seasonsObserved:seasons.length,style:established?candidate:null,candidateStyle:candidate||null,supportingSeasons:seasonsSupporting,supportingClubs:distinctClubs,supportShare:share,podiumAppearances:support};
}
function update(state,archive,stylesByNation={}){
  const all=state.leagueTacticalTrends||(state.leagueTacticalTrends={}),year=Number(archive?.year);if(!Number.isFinite(year))return all;
  for(const [nation,record] of Object.entries(archive.nations||{})){
    const prior=all[nation]||{seasons:[],identity:{style:null,sinceYear:null}},rows=(prior.seasons||[]).filter(r=>r.year!==year);
    rows.push(season(year,record,stylesByNation[nation]||{}));rows.sort((a,b)=>a.year-b.year);const seasons=rows.slice(-WINDOW),identity=profile(seasons),style=identity.style;
    const sinceYear=style?(prior.identity?.style===style?prior.identity.sinceYear??year:seasons.filter(r=>r.podium.some(x=>x.style===style)).at(-3)?.year??year):null;
    all[nation]={seasons,identity:{...identity,sinceYear}};
  }
  return all;
}
function trend(state,nation){const row=state?.leagueTacticalTrends?.[nation];return row?.identity?.style?row.identity:null;}
function adoption(state,nation,club){const current=trend(state,nation);if(!current||!club)return null;const roll=D.seedFor(`league-style-adoption:${nation}:${club}:${current.style}:${current.sinceYear}`)%100;return roll<28?current.style:null;}
const api={season,profile,update,trend,adoption,WINDOW,STYLES};g.TLLeagueTacticalTrends=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
