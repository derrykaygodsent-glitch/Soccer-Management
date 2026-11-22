/* Tactical evaluation and familiarity are derived from the same lineup plan executed by the match engine. */
(function(g){'use strict';
const Z=g.TLZones||(typeof require==='function'?require('./tactical-zones'):null);
function familiarity(slots,reps={}){
 const rows=(slots||[]).filter(v=>v.player);
 const mean=values=>values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length):0;
 const position=mean(rows.flatMap(v=>{
  const r=reps[v.player.id]||{};
  return [Z.familiarity(v.player,v.position,r)*100,(v.attackPosition?Z.familiarity(v.player,v.attackPosition,r)*100:null)].filter(Number.isFinite);
 }));
 const role=mean(rows.flatMap(v=>{
  const r=reps[v.player.id]||{};
  return [v.job?.[0],v.attackJob?.[0]].filter(Boolean).map(k=>Math.min(20,r[k]||0)*5);
 }));
 const coordination=mean(rows.map(v=>Math.min(20,reps[v.player.id]?.[v.scheme]||0)*5));
 return {position,role,coordination,explanation:{position:'Natural and rehearsed positions in each tactical phase.',role:'Repeated role sessions and match appearances, capped at twenty.',coordination:'Shared team-plan rehearsals for the current instruction scheme.'}};
}
function evaluate(slots,plan={},options={}){
 const warnings=[],players=(slots||[]).filter(v=>v.player),orders=plan.orders||{},system=plan.system||'',pressing=orders.block||'Mid block';
 for(const slot of players){
  const phases=[['out of possession',slot.position,slot.job?.[0]],['in possession',slot.attackPosition||slot.position,slot.attackJob?.[0]||slot.job?.[0]]];
  for(const [phase,pos,job] of phases){const fit=Z.fit(slot.player,pos,job,options.reps?.[slot.player.id]);if(fit<42)warnings.push({level:'warning',player:slot.player.name,text:`${slot.player.name} has a ${fit}% fit for ${job} ${phase}; the role demands attributes or positional experience they currently lack.`});}
  if(['Gegenpress','Gegenpressing','High Press'].includes(system)){
   const stamina=Number(slot.player.attrs?.stamina)||0,work=Number(slot.player.attrs?.workRate)||0;
   if((stamina<11||work<11)&&Number(options.readiness?.[slot.player.id]?.fitness??100)<76)warnings.push({level:'caution',player:slot.player.name,text:`${slot.player.name} may struggle to sustain the selected press: stamina ${stamina}/20, work rate ${work}/20, fitness ${options.readiness?.[slot.player.id]?.fitness??100}%.`});
  }
 }
 const defensiveMid=players.filter(v=>['DM','Anchor','Half-Back','Defensive Midfielder','Ball-Winning Midfielder'].includes(v.job?.[0])).length;
 if(pressing==='High press'&&defensiveMid===0)warnings.push({level:'caution',text:'High engagement with no holding midfielder leaves the centre-backs exposed when the first press is bypassed.'});
 if(orders.lost==='Counter-press'&&pressing==='Low block')warnings.push({level:'caution',text:'Counter-pressing immediately while asking the team to defend in a low block creates conflicting recovery distances.'});
 if(options.familiarity){const f=familiarity(players,options.reps);if(f.coordination<20)warnings.push({level:'info',text:'The current team shape has little shared rehearsal; coordinated rotations and pressing cover may arrive late.'});}
 return warnings;
}
const api={familiarity,evaluate};g.TLTacticalAnalysis=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
