/* Open Ground: six minutes of football, on the same fixed clock as Classic 2D. */
(function(g){'use strict';
const D=g.TLData||require('./data'), W=g.TLManagerLife||require('./manager-life'),E=g.TLEngine||require('./engine');
const LIMIT=6*60*40,STEP=1/40;
const officials=['Ama Soro','Ivo Larne','Mara Vico','Tari Fen','Nico Arven','Rina Daro','Sol Amani','Davi Renn'];
function visit(s){const country=W.atlas.countries.find(c=>c.name===s.profile.nation);if(!country)return null;
 const place=country.places[Math.floor(s.day/7)%country.places.length],seed=D.seedFor(place.id);
 return {place:place.name,ground:place.name+' Community Ground',host:place.club.name,hostId:place.club.id,coach:officials[seed%8],official:officials[(seed+3)%8]};}
function fixture(s){const venue=visit(s),signed=W.pool.filter(p=>s.roster.includes(p.id)),locals=W.pool.filter(p=>p.nation===s.profile.nation&&p.local&&!s.roster.includes(p.id));
 const players=signed.slice();for(const pos of ['GK',...D.FORMATIONS[s.tactic].map(x=>x.role)]){const need=pos==='GK'?1:D.FORMATIONS[s.tactic].filter(x=>x.role===pos).length;while(players.filter(p=>p.pos===pos).length<need){const i=locals.findIndex(p=>p.pos===pos);if(i<0)break;players.push(locals.splice(i,1)[0]);}}
 while(players.length<11&&locals.length)players.push(locals.shift());
 const staff=(g.TLTechnical||require('./technical-area')).office(s,venue.host,s.profile.nation,W.nations[s.profile.nation]);return {...venue,awayStyle:staff.coach?.style||'direct',catalogue:1,seed:D.seedFor(`${s.id}:${s.day}:district`),day:s.day,team:s.club?.name||`${s.profile.name.split(' ')[0]}'s XI`,ids:players.map(p=>p.id),signed:s.roster.slice(),formation:s.tactic,mentality:s.mentality||'Balanced',style:s.style||'Balanced shape',ticks:0};}
function replay(f){const auto={'Win it high':'press','Break into space':'counter','Keep the ball':'possession'},home={...D.CLUBS[1],id:'district-select',name:f.team,short:'SEL',stadium:f.ground,primary:'#207561',secondary:'#e3f1d9'},away={...D.CLUBS[0],id:f.hostId,name:f.host+' XI',short:'HST',rep:54};const squad=f.ids.map((id,i)=>({...W.pool.find(p=>p.id===id),num:i+1}));const m=new E.Match(home,away,{seed:f.seed,awayTactics:f.awayStyle?D.defaultTactics(f.awayStyle):undefined,squads:[squad,f.catalogue?W.pool.filter(p=>p.club===f.host):null],homeTactics:{...D.defaultTactics(auto[f.style]),formation:f.formation,mentality:Math.max(0,D.MENTALITIES.indexOf(f.mentality))}});
 for(let i=0;i<f.ticks;i++)m.step(STEP);return m;}
function report(f,m){return {day:f.day,ground:f.ground,home:f.team,away:f.host+' XI',goals:m.teams.map(t=>t.score),shots:m.teams.map(t=>t.stats.shots),xi:m.teams[0].slots.map(slot=>slot.player.id),scorers:m.events.filter(e=>e.goal).map(e=>e.text)};}
const api={visit,fixture,replay,report,STEP,LIMIT};g.TLDistrict=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
