/* Instantiate the Classic engine from a sealed manifest; replay a fixed-tick journal on resume. */
(function(global){
  'use strict';
  const node=typeof window==='undefined', H=node?require('./home-data.js'):global.TLHomeData, D=node?require('./data.js'):global.TLData, K=node?require('./season-calendar.js'):global.TLSeasonCalendar, M=node?require('./matchday-data.js'):global.TLMatchdayData, E=node?require('./engine.js'):global.TLEngine, V=node?require('./highlights.js'):global.TLHighlights;
  const R=H.homeId, clamp=(n,a,b)=>Math.max(a,Math.min(b,n)), ticks=m=>Math.round(m.elapsed/V.STEP), managed=f=>f.home===R?0:1;
  const notables=new Set(['goal','og','penscore','penmiss','pen','yellow','red','sub','injury','stoppage','ht','ft']);
  const eventTime=ev=>ev.t>2700?`${ev.half===1?45:90}+${Math.max(1,Math.floor((ev.t-2700-1e-4)/60)+1)}′`:`${ev.minute}′`;
  const teamStats=(stats,poss)=>{
    const pc=poss[0]+poss[1]?Math.round(100*poss[0]/(poss[0]+poss[1])):50;
    const map=k=>stats.map(s=>s[k]??0), pass=stats.map(s=>s.passes?`${Math.round(100*s.passWon/s.passes)}%`:'–');
    return [['Possession',`${pc}%`,`${100-pc}%`],['Shots',...map('shots')],['On target',...map('onTarget')],['Expected goals',...map('xG').map(x=>x.toFixed(2))],['Passes completed',...map('passWon')],['Pass accuracy',...pass],['Corners',...map('corners')],['Fouls',...map('fouls')],['Yellow cards',...map('yellow')],['Red cards',...map('red')],['Saves',...map('saves')]];
  };
  function analyst(report,side){
    const s=report.stats[side], a=report.stats[1-side], diff=s.xG-a.xG, gd=report.goals[side]-report.goals[1-side];
    if(report.minutes===90){
      const {pen,goals}=report, decided=(pen||goals)[side]-(pen||goals)[1-side];
      const exchange=`Riverside took ${s.shots} ${s.shots===1?'shot':'shots'} (${s.xG.toFixed(2)} xG) and conceded ${a.shots} (${a.xG.toFixed(2)} xG).`;
      if(pen)return {title:'Decided from the spot',copy:`${exchange} Neither side was ahead after 90 minutes. ${decided>0?'Riverside held their nerve in the shootout.':'The opposition won the shootout.'}`};
      if(gd>0)return {title:diff>0?'Chances turned into a result':'Clinical when it mattered',copy:`${exchange} ${gd===1?'A one-goal margin made the difference.':`Riverside finished ${gd} goals clear.`}`};
      if(gd<0)return {title:'Review the chances conceded',copy:`${exchange} ${diff>.25?'The better chance quality did not show on the scoreboard.':'The staff will review the moments that put the defence under pressure.'}`};
      return {title:'Nothing between the sides on the scoreline',copy:`${exchange} The result was level at the final whistle.`};
    }
    if(!s.shots)return {title:'Create a route into the box',copy:'We haven’t taken a shot. Get a runner beyond the ball and give the carrier a passing option between the lines.',hint:'Look for Support and Attack duties in different lanes.',shape:'run'};
    if(a.xG>s.xG+.09&&a.onTarget>0)return {title:'Protect the space in behind',copy:`They’ve put ${a.onTarget} ${a.onTarget===1?'shot':'shots'} on target and lead the chance quality ${a.xG.toFixed(2)} to ${s.xG.toFixed(2)}. Keep a spare defender and close down the first pass.`,hint:'A deeper line or a holding midfielder can help.',shape:'deep'};
    if(s.shots>=3&&s.xG/s.shots<.06)return {title:'Work a better shooting angle',copy:`Our ${s.shots} attempts produced ${s.xG.toFixed(2)} xG. The shot volume is there, but passes across the box could create clearer chances.`,hint:'Avoid rushing low-value attempts.',shape:'build'};
    if(diff>.07&&gd<=0)return {title:'Keep creating the same chances',copy:`Riverside have the higher xG (${s.xG.toFixed(2)} to ${a.xG.toFixed(2)}), but the score hasn’t followed. Keep getting into those positions.`,hint:'Keep options available ahead of the ball.',shape:'run'};
    if(gd>0)return {title:'Keep control of the next phase',copy:`Riverside lead by ${gd}. We’ve created ${s.onTarget} on-target ${s.onTarget===1?'attempt':'attempts'} and conceded ${a.onTarget}. Keep the midfield connected rather than chasing the game.`,hint:'Use the ball to keep the opposition moving.',shape:'build'};
    return {title:'The margins are still narrow',copy:`Riverside have ${s.shots} attempts to their ${a.shots}, with ${s.xG.toFixed(2)} xG to ${a.xG.toFixed(2)}. Make the next opportunity count.`,hint:'Stay compact without the ball and offer width in possession.',shape:'press'};
  }
  function shootout(m,f){
    if(f.comp!=='LC'||m.teams[0].score!==m.teams[1].score)return null;
    const rng=D.mulberry32(D.seedFor(f.id+':shootout')), goals=[0,0], kicks=[];
    const size=Math.min(...m.teams.map(t=>t.slots.length));
    const order=m.teams.map(t=>t.slots.map(s=>s.player).filter(p=>!p.red).sort((a,b)=>
      (b.id===t.assignments?.penalty)-(a.id===t.assignments?.penalty)||(b.attrs.penalties+b.attrs.composure*.25)-(a.attrs.penalties+a.attrs.composure*.25)).slice(0,size));
    const kick=(team,i)=>{const p=order[team][i%size], keeper=m.gk(m.teams[1-team]);const probability=clamp(.72+(p.attrs.penalties-12)*.016+(p.attrs.composure-12)*.011-(1-p.cond)*.12-(keeper.attrs.reflexes-12)*.01,.48,.91), scored=rng()<probability;
      if(scored)goals[team]++;kicks.push({team,player:p.name,scored});};
    for(let i=0;;i++){
      kick(0,i);
      if(i<5&&(goals[0]>goals[1]+5-i||goals[1]>goals[0]+4-i))break;
      kick(1,i);
      if(i<4?Math.abs(goals[0]-goals[1])>4-i:goals[0]!==goals[1])break;
    }
    return {goals,kicks};
  }
  function tacticalAssessment(m,side){
    const team=m.teams[side],other=m.teams[1-side],metrics=m.tacticalMetrics||{},avg=phase=>{const x=metrics.phase?.[phase]?.[side]||{distance:0,samples:0};return x.samples?+(x.distance/x.samples).toFixed(2):null;},slotsById=new Map(team.slots.map(s=>[s.player.id,s])),players=team.players.filter(p=>p.appeared).map(p=>{const s=slotsById.get(p.id)||{},a=p.assignment||{},def=a.defense||a,att=a.attack||a;return {id:p.id,name:p.name,position:s.position||def.pos||null,attackPosition:s.attackPosition||att.pos||null,defenseRole:def.name||s.engineJob?.[0]||s.job?.[0]||null,attackRole:att.name||s.attackJob?.[0]||null,defenseFit:Number.isFinite(def.skill)?+clamp(def.skill,0,1).toFixed(3):null,attackFit:Number.isFinite(att.skill)?+clamp(att.skill,0,1).toFixed(3):null,defenseFamiliarity:Number.isFinite(def.familiarity)?+def.familiarity.toFixed(3):null,attackFamiliarity:Number.isFinite(att.familiarity)?+att.familiarity.toFixed(3):null,duty:def.duty||s.job?.[2]||null,attackDuty:att.duty||s.attackJob?.[2]||null,instructions:s.instructions||a.instructions||{},condition:+(p.cond*100).toFixed(1)};}),weak=players.filter(p=>[p.defenseFit,p.attackFit].some(Number.isFinite)&&Math.min(...[p.defenseFit,p.attackFit].filter(Number.isFinite))<.65).map(p=>({id:p.id,name:p.name,role:(p.defenseFit!=null&&p.attackFit!=null?(p.defenseFit<=p.attackFit?p.defenseRole:p.attackRole):p.defenseFit!=null?p.defenseRole:p.attackRole)||null,fit:Math.min(...[p.defenseFit,p.attackFit].filter(Number.isFinite))})),rotations=players.filter(p=>p.attackPosition&&p.position&&p.attackPosition!==p.position).map(p=>({id:p.id,name:p.name,from:p.position,to:p.attackPosition,role:p.attackRole})),changes=(metrics.changes||[]).filter(x=>x.team===side).map(x=>({tick:x.tick,minute:x.minute,change:x.change,source:x.source||'manager',reason:x.reason||''})),opponentAdjustments=(metrics.changes||[]).filter(x=>x.team!==side).map(x=>({tick:x.tick,minute:x.minute,change:x.change,source:x.source||'manager',reason:x.reason||''})),xg=team.stats.xG||0,against=other.stats.xG||0,signal=metrics.pressSignals?.[side]||0,engagement=metrics.pressEngagements?.[side]||0,recoveries=metrics.pressRecoveries?.[side]||0,defensiveActions=metrics.defensiveActions?.[side]||0,coverSamples=metrics.defensiveSamples?.[side]||0,coverSupported=metrics.coverSupported?.[side]||0,attackError=avg('attack'),defenseError=avg('defense'),recommendations=[];
    if(against>xg+.08)recommendations.push({action:'Protect the space in front of the back line',reason:`The opposition created ${against.toFixed(2)} xG against Riverside’s ${xg.toFixed(2)} from recorded shots.`});
    if((metrics.phase?.attack?.[side]?.samples||0)>=22&&(attackError??0)>10)recommendations.push({action:'Review attacking distances and support lanes',reason:`Observed attacking shape was an average ${attackError.toFixed(1)} metres from its phase anchors across ${metrics.phase.attack[side].samples} player observations; anchor distance is a model proxy, not a quality score.`});
    if(signal>=10&&engagement<signal*.35)recommendations.push({action:'Reconsider the press trigger or line of engagement',reason:`Among ${signal} trigger-eligible samples, the nearest presser came within 5.5m ${engagement} times; this is a proximity proxy, not a measure of press success.`});
    if(coverSamples>=20&&coverSupported/coverSamples<.35)recommendations.push({action:'Keep a covering player behind the first presser',reason:`The cover-position heuristic was met in ${coverSupported} of ${coverSamples} defensive samples (${Math.round(100*coverSupported/coverSamples)}%); it measures spacing, not whether a chance was prevented.`});
    if(weak.length)recommendations.push({action:'Review role demands for the low-fit assignments',reason:`${weak.length} active role assignment(s) had a modelled fit below 65%; the player-by-player list records the actual fit values.`});
    if(opponentAdjustments.length)recommendations.push({action:'Respond to the opposition’s in-match tactical changes',reason:`The engine recorded ${opponentAdjustments.length} opposition tactical adjustment(s) during this match.`});
    if(!recommendations.length)recommendations.push({action:'Keep the current plan under review',reason:`The recorded shot model produced ${xg.toFixed(2)} xG for Riverside and ${against.toFixed(2)} against; the final score is assessed separately.`});
    return {plan:{defensiveShape:team.tactics.formation,attackingShape:team.tactics.attackFormation||team.tactics.tactical?.attackFormation||'Same as defensive shape',mentality:team.tactics.mentality,press:team.tactics.press,line:team.tactics.line,pressTrigger:team.tactics.club?.trigger||'Always available'},evidence:{observed:{label:'Observed match events',shots:team.stats.shots,goals:team.score,passesReleased:team.stats.passes,substitutions:team.subsUsed||0},calculated:{label:'Calculated simulation metrics',xG:+xg.toFixed(2),opponentXG:+against.toFixed(2),attackAnchorErrorMetres:attackError,defenseAnchorErrorMetres:defenseError},estimated:{label:'Estimated tactical interpretations',recommendations:recommendations.length,proxyMeasures:['shape anchor distance','press proximity','cover spacing']}},execution:{attackAnchorErrorMetres:attackError,defenseAnchorErrorMetres:defenseError,attackObservations:metrics.phase?.attack?.[side]?.samples||0,defenseObservations:metrics.phase?.defense?.[side]?.samples||0,rotations,press:{triggerEligibleSamples:signal,nearestWithin5_5m:engagement,recoveriesWithin3sOfSignal:recoveries},cover:{supportedSamples:coverSupported,samples:coverSamples,supportRate:coverSamples?+(coverSupported/coverSamples).toFixed(3):null,tackleAndInterceptionActions:defensiveActions},roleDifficulty:weak,players,changes,opponentCommandsLogged:opponentAdjustments,measurementNotes:{shape:'Mean Euclidean distance to phase anchors, sampled every 0.5 seconds; positional proxy only.',press:'Eligible samples follow the selected trigger; engagement means the nearest assigned presser came within 5.5 metres, a proximity proxy rather than a success measure.',cover:'A teammate behind the nearest presser and within 18 metres of the carrier; spacing heuristic only.'}},planQuality:{forXg:+xg.toFixed(2),againstXg:+against.toFixed(2),chanceBalance:+(xg-against).toFixed(2),basis:'Recorded shot locations and modelled xG; independent of final score'},result:{goals:team.score,opponentGoals:other.score},recommendations};
  }
  function oppositionAnalysis(m,side){const other=1-side,team=m.teams[other],shots=m.shotMap.filter(s=>s.team===other&&s.outcome!=='disallowed'&&s.outcome!=='pending'),central=shots.filter(s=>s.y>=20&&s.y<=48),wide=shots.length-central.length,nearGoal=shots.filter(s=>other===0?s.x>=84:s.x<=21),xg=shots.reduce((n,s)=>n+s.xg,0),tactic=m.tacticalMetrics||{},changes=(tactic.changes||[]).filter(x=>x.team===other).map(x=>({tick:x.tick,minute:x.minute,change:x.change,source:x.source||'manager',reason:x.reason||''})),recommendations=[];
    if(central.length>=2&&central.length>wide)recommendations.push({action:'Close central shooting lanes',reason:`${central.length} of ${shots.length} recorded opposition shots came from the central channel (y 20–48m).`});
    if(nearGoal.length>=2)recommendations.push({action:'Protect the space nearest goal',reason:`${nearGoal.length} recorded opposition attempts originated within 21m of the attacking goal; total opposition shot xG was ${xg.toFixed(2)}.`});
    if(shots.length>=3&&xg/shots.length<.055)recommendations.push({action:'Keep forcing lower-value attempts',reason:`${shots.length} opposition shots generated ${xg.toFixed(2)} xG (${(100*xg/shots.length).toFixed(1)}% average per attempt).`});
    if(changes.length)recommendations.push({action:'Review the opposition’s logged tactical commands',reason:`${changes.length} opponent-side tactical command(s) were explicitly logged; this report does not infer unrecorded AI adjustments.`});
    if(!recommendations.length)recommendations.push({action:'Use the observed shot map to set the next defensive focus',reason:`${shots.length} opposition attempts produced ${xg.toFixed(2)} xG; ${central.length} were central and ${wide} were wide. No unobserved style assumption was used.`});
    return {shape:team.tactics.formation,attackShape:team.tactics.attackFormation||'Same as defensive shape',shots:shots.length,xg:+xg.toFixed(2),centralShots:central.length,wideShots:wide,nearGoalShots:nearGoal.length,goals:team.score,loggedCommands:changes,recommendations,evidence:{observed:{label:'Observed match events',shots:shots.length,goals:team.score,loggedCommands:changes.length},calculated:{label:'Calculated simulation metrics',modelledXG:+xg.toFixed(2)},estimated:{label:'Estimated tactical interpretations',recommendations:recommendations.length}},scope:'Observed shot locations and logged commands are distinct from calculated model xG and estimated recommendations; unlogged opponent behaviour is not inferred.'};}
  function report(m,f,full=false){
    const pens=full?shootout(m,f):null;
    return {date:f.date,clubs:[f.home,f.away],goals:m.teams.map(t=>t.score),pen:pens?.goals||null,kicks:pens?.kicks||[],stats:m.teams.map(t=>({...t.stats})),possession:m.possTime.slice(),added:m.added.map(x=>Math.floor(x/60)),tactical:m.teams.map((_,side)=>tacticalAssessment(m,side)),opposition:m.teams.map((_,side)=>oppositionAnalysis(m,side)),
      events:m.events.filter(e=>e.text&&notables.has(e.type)).map(e=>({type:e.type,team:e.team??null,time:eventTime(e),minute:e.minute,text:e.text})),
      shots:m.shotMap.filter(s=>s.outcome!=='disallowed'&&s.outcome!=='pending').map(s=>({team:s.team,x:s.x,y:s.y,xg:s.xg,minute:(s.half-1)*45+Math.min(45,(s.periodTime??((s.minute-1)%45)*60)/60),outcome:s.outcome})),
      players:m.teams.map(t=>t.players.filter(p=>p.appeared).map(p=>({id:p.id,name:p.name,num:p.num,pos:p.pos,rating:+p.rating.toFixed(2),cond:Math.round(p.cond*100),stats:{...p.stats},yellow:p.yellow,red:p.red,injury:p.injury||0,active:p.onPitch}))),
      lineup:m.teams.map(t=>t.slots.map(s=>({id:s.player.id,role:s.role,label:M.roleLabel(s,t.tactics.formation),x:s.x,y:s.y}))),benches:m.teams.map(t=>t.bench.map(p=>({id:p.id,name:p.name,num:p.num,pos:p.pos,cond:Math.round(p.cond*100)}))),
      shapes:m.teams.map(t=>t.tactics.formation), captain:m.teams[managed(f)].assignments?.captain, clock:m.clockStr(), minutes:full?90:45};
  }
  const choices={pre:[['encourage','Go out and play our football. Trust the work you’ve done.'],['demand','I expect a win. Set the standard right from kick-off.'],['relax','There’s no pressure. Be brave on the ball.']],half:[['encourage','Stay together. The next goal can change this match.'],['praise','I’m pleased with the work so far. Keep it going.'],['demand','We need a better performance. Show me more.'],['calm','Take a breath and look after the ball.']],full:[['praise','Well done. I’m proud of the work you put in.'],['demand','That wasn’t good enough. We need more next time.'],['encourage','Stay together. Take what we learned into the next game.']]};
  const gestures=['No gesture','Hands together','Hands on hips','Pump fists','Outstretched arms'];
  const audiences=['Room','Defenders','Midfielders','Attackers','Individuals'];
  const group=role=>['GK','DC','FB','WB'].includes(role)?'Defenders':['DM','CM','AM'].includes(role)?'Midfielders':'Attackers';
  function reaction(phase,fixture,side,opts,players,r){
    const tone=opts.tone, record=choices[phase].find(([key])=>key===tone);
    if(!record&&!opts.assistant)return null;
    const audience=opts.assistant?'Room':opts.audience, difference=r?r.goals[side]-r.goals[1-side]:0;
    const gd=r?.pen&&difference===0?Math.sign(r.pen[side]-r.pen[1-side]):difference;
    const x=r?r.stats[side].xG-r.stats[1-side].xG:0;
    const effective=opts.assistant?(gd>0?'praise':'encourage'):tone;
    const rng=D.mulberry32(D.seedFor(`${fixture.id}:${phase}:${effective}:${audience}:${opts.gesture}:${opts.id||''}`));
    const respond=p=>{
      const natural=H.squad.find(q=>q.id===p.id), resolve=natural?.attrs.composure||12;
      let strength=effective==='praise'?(gd>0?1.4:gd<0?-1.24:x>.4?.66:-.3):effective==='demand'?(gd>0?-1.55:gd<0?.58:resolve>13?.7:-.76):effective==='relax'?(resolve<13?.87:-.56):effective==='calm'?(gd<0?.15:.60):.59;
      if(opts.gesture==='Hands on hips')strength+=effective==='demand'?(gd>0?-.42:.26):-.37;
      if(opts.gesture==='Pump fists')strength+=effective==='encourage'||effective==='praise'?.24:-.10;
      if(opts.gesture==='Outstretched arms') strength+=effective==='relax'||effective==='calm'?.22:-.13;
      strength+=(rng()-.5)*1.38+(p.id===r?.captain? .10:0);
      if(!p.active&&phase!=='pre')strength-=.24;
      const delta=+clamp(strength*.92,-1.8,1.8).toFixed(2), mood=delta>.34?(delta>1?'Inspired':'Encouraged'):delta<-.34?(delta< -1?'Frustrated':'Unsettled'):'Composed';
      return [p.id,{delta,mood}];
    };
    const addressed=players.filter(p=>audience==='Room'||(audience==='Individuals'?p.id===opts.id:group(p.role||p.pos)===audience));
    if(!addressed.length)return null;
    return {audience,id:opts.id||'',gesture:opts.gesture,tone:effective,text:opts.assistant?`Elliot Marsh: ${choices[phase].find(([id])=>id===effective)?.[1]||'Stay together and focus on the next phase.'}`:record[1],reactions:Object.fromEntries(addressed.map(respond))};
  }
  function applyTalk(m, side, talks, scale=1){
    const team=m.teams[side];
    for(const p of team.players){
      const delta=talks.reduce((n,t)=> n+(t.reactions?.[p.id]?.delta||0),0);
      if(!delta)continue;
      p.confidence=clamp((p.confidence||0)+delta*scale,-2.5,2.5);
      p.attrs.composure=clamp((p.originalComposure??=p.attrs.composure)+p.confidence,1,20);
      p.reading={...p.reading,risk:clamp((p.originalRisk??=p.reading.risk)+p.confidence*.018,-.5,.5)};
    }
  }
  function applyCommand(m, side, cmd){
    if(cmd.type==='tactic')m.setTactics(side,cmd.change);
    else if(cmd.type==='shout')return m.touchlineCall(side,cmd.shout);
    else if(cmd.type==='tactic-role')return m.setPlayerRole(side,cmd.change);
    else if(cmd.type==='tactic-instruction')return m.setPlayerInstruction(side,cmd.change);
    else if(cmd.type==='sub')return m.substitute(side,cmd.out,cmd.in);
    else if(cmd.type==='second'){applyTalk(m,side,cmd.talks);m.continueSecondHalf();}
    return {ok:true};
  }
  function replayer(f, session){
    const side=managed(f), submitted=session.submitted, p=submitted.sheet, clubs=[K.club(f.home),K.club(f.away)], oppos=M.opponent(clubs[1-side]);
    // Availability is frozen with the manifest. Don't regenerate a different XI after submission.
    const homePlan={...M.sheet(p,f.date),set:p.set,numbers:p.numbers,fitness:submitted.fitness,focus:f.date===H.next.date?submitted.focus:''};
    const lineups=side?[oppos,homePlan]:[homePlan,oppos], t=M.engineTactics(p.tactics),T=node?require('./technical-area.js'):global.TLTechnical;
    const managerProfiles=clubs.map((c,i)=>i===side?null:{...T.person(`season-match:${c.id}`),style:c.style||'balanced'});
    const m=new E.Match(...clubs,{seed:D.seedFor(`${f.id}:2026-27`),lineups,homeTactics:side?null:t,awayTactics:side?t:null,managerAITeams:[1-side],managerStyles:clubs.map(c=>c.style||'balanced'),managerProfiles});
    m.optimizeXI=M.bestXI;
    applyTalk(m,side,[{reactions:submitted.mood||{}}],.45);
    applyTalk(m,side,session.talks?.pre||[]);
    const cp=session.checkpoint, commands=cp?.commands||[], goal=cp?.ticks||0;
    let at=0,j=0,done=false;
    return {match:m,get progress(){return !goal?1:at/goal;},advance(limit){
      for(let n=0;n<limit&&!done;n++){
        while(j<commands.length&&commands[j].tick===at)applyCommand(m,side,commands[j++]);
        if(at===goal||V.atBreak(m)){done=true;break;}
        m.step(V.STEP);at++;
      }
      return done;
    }};
  }
  function create(f,session,handlers={}){
    const r=replayer(f,session);r.advance(Infinity);
    for(const k of ['onEvent','onSnapshot'])if(handlers[k])r.match[k]=handlers[k];
    return r.match;
  }
  const tacticsFrom=(old,t)=>{
    const nums={mentality:M.choices.mentality,passing:M.choices.passing,tempo:M.choices.tempo,width:M.choices.width,line:M.choices.line}, tactical=t.tactical||{};
    return {...old,...t.club,form:t.formation,attackFormation:t.attackFormation||tactical.attackFormation||old.attackFormation,attackByPlayer:{...(tactical.attackByPlayer||old.attackByPlayer||{})},phaseJobs:{...(tactical.phaseJobs||old.phaseJobs||{})},phaseRoles:tactical.phaseRoles||old.phaseRoles||[],playerInstructions:{...(tactical.playerInstructions||old.playerInstructions||{})},trigger:t.club?.trigger||old.trigger,...Object.fromEntries(Object.entries(nums).map(([k,v])=>[k,v[t[k]]])),press:M.engineTactics(old).press===t.press?old.press:['Less often','Standard','More often'][t.press]||old.press};
  };
  const api={ticks,managed,notables,eventTime,teamStats,analyst,report,choices,gestures,audiences,group,reaction,applyTalk,applyCommand,replayer,create,tacticsFrom};
  global.TLSeasonMatch=api;if(node)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
