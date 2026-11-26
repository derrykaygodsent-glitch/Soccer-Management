/* Persistent club tactics and immutable submitted team sheets. No display-only lineups. */
(function (global) {
  'use strict';
  const node=typeof window==='undefined', H=node?require('./home-data.js'):global.TLHomeData, C=node?require('./club-data.js'):global.TLClubData, D=node?require('./data.js'):global.TLData, Z=node?require('./tactical-zones.js'):global.TLZones;
  const home=H.clubs[H.homeId];
  const phaseFormationOptions=['Same as defensive shape','3-2-5',...Object.keys(D.FORMATIONS),'Custom'];
  const jobCode={Goalkeeper:'GK','Sweeper Keeper':'SK','Full-Back':'FB','Wing-Back':'WB','No-Nonsense Full-Back':'DFB','Ball-Playing Defender':'BPD','Centre-Back':'CD','Ball-Winning Midfielder':'BWM','Deep-Lying Playmaker':'DLP','Box-to-Box Midfielder':'BBM','Defensive Midfielder':'HCM','Advanced Playmaker':'AP','Shadow Striker':'SS','Inverted Winger':'IW',Winger:'W','Advanced Forward':'AF','Deep-Lying Forward':'DLF','Pressing Forward':'PF'};
  const engineJob=(code,pos,duty)=>{const name=Z.jobs[code]?code:({SK:'Sweeper Keeper',GK:'Goalkeeper',FB:'Full-Back',WB:'Wing-Back',DFB:'No-Nonsense Full-Back',BPD:'Ball-Playing Defender',CD:'Centre-Back',BWM:'Ball-Winning Midfielder',DLP:'Deep-Lying Playmaker',BBM:'Box-to-Box Midfielder',HCM:'Defensive Midfielder',AP:'Advanced Playmaker',SS:'Shadow Striker',IW:'Inverted Winger',W:'Winger',AF:'Advanced Forward',DLF:'Deep-Lying Forward',PF:'Pressing Forward'})[code];const allowed=Z.choices(pos)||[];const selected=name&&allowed.includes(name)?name:allowed[0]||'Central Midfielder';return [selected,null,Z.duty(selected,duty)];};
  const legacyCode=(pos,name,duty)=>{const code=jobCode[name];return (roleOptions[pos]||[]).some(x=>x[0]===code)?code:(roleOptions[pos]||[]).find(x=>x[2]===duty)?.[0]||(roleOptions[pos]||[])[0]?.[0];};
  const plain=x=>x&&typeof x==='object'&&!Array.isArray(x)?x:{};
  const targetPositions=(slots,formation,custom={})=>{if(formation==='Custom')return custom;if(!formation||formation==='Same as defensive shape')return {};const B=node?require('./match-board.js'):global.TLMatchBoard;return B?.phaseTargets?.(slots,formation)||{};};
  const choices={
    mentality:D.MENTALITIES,passing:['Shorter','Standard','More direct'],tempo:['Lower','Standard','Higher'],width:['Narrow','Standard','Fairly wide'],build:['Play out of defence','Run at defence','Pass into space'],
    lost:['Counter-press','Regroup'],won:['Counter','Hold shape'],gk:['Distribute quickly','Slow pace down'],target:['Over opposition','Target forward','Flanks','Playmaker','Full-backs','Centre-backs'],delivery:['Roll it out','Throw it long','Take short kicks','Take long kicks'],
    trigger:['Always available','Trap on touchline','On a backward pass','Carrier facing own goal','Goalkeeper receives','Poor first touch','Press in own half','Press in final third'],line:['Deeper','Standard','Higher'],press:['Less often','Standard','More often','Much more often'],block:['Low block','Mid block','High press'],duels:['Stay on feet','Get stuck in'],corner:['Mixed','Short option','Cross into the box'],free:['Mixed','Look for a shot','Look for a delivery']
  };
  const presets=[
    {name:'Control Possession',form:'4-3-3',mentality:'Positive',passing:'Shorter',tempo:'Standard',width:'Standard',build:'Play out of defence',lost:'Regroup',won:'Hold shape',gk:'Slow pace down',target:'Centre-backs',delivery:'Take short kicks',line:'Standard',press:'Standard',block:'Mid block',duels:'Stay on feet',corner:'Mixed',free:'Mixed'},
    {name:'High Press',form:'4-2-3-1',mentality:'Attacking',passing:'Standard',tempo:'Higher',width:'Fairly wide',build:'Run at defence',lost:'Counter-press',won:'Counter',gk:'Distribute quickly',target:'Full-backs',delivery:'Roll it out',line:'Higher',press:'Much more often',block:'High press',duels:'Stay on feet',corner:'Cross into the box',free:'Mixed'},
    {name:'Direct Counter',form:'4-4-2',mentality:'Balanced',passing:'More direct',tempo:'Higher',width:'Standard',build:'Pass into space',lost:'Regroup',won:'Counter',gk:'Distribute quickly',target:'Flanks',delivery:'Take long kicks',line:'Deeper',press:'Less often',block:'Low block',duels:'Stay on feet',corner:'Mixed',free:'Mixed'}
  ];
  const roleOptions={GK:[['SK','Sweeper Keeper','Defend'],['GK','Goalkeeper','Defend']],FB:[['FB','Full-Back','Support'],['WB','Overlapping Full-Back','Attack'],['DFB','Defensive Full-Back','Defend']],WB:[['WB','Wing-Back','Support'],['AWB','Attacking Wing-Back','Attack'],['DWB','Defensive Wing-Back','Defend']],DC:[['BPD','Ball-Playing Defender','Defend'],['CD','Central Defender','Defend']],DM:[['BWM','Ball-Winning Midfielder','Defend'],['DLP','Deep-Lying Playmaker','Support']],CM:[['DLP','Deep-Lying Playmaker','Support'],['BBM','Box-to-Box Midfielder','Attack'],['HCM','Holding Midfielder','Defend']],AM:[['AP','Advanced Playmaker','Support'],['SS','Shadow Striker','Attack']],W:[['IW','Inverted Winger','Attack'],['W','Wide Winger','Support']],ST:[['AF','Advanced Forward','Attack'],['DLF','Deep-Lying Forward','Support'],['PF','Pressing Forward','Attack']]};
  const roleNames=Object.fromEntries(Object.entries(roleOptions).map(([k,v])=>[k,v[0]]));
  const formationOptions=Object.keys(D.FORMATIONS);
  const takers=[['captain','Captain','rvr_3'],['vice','Vice-captain','rvr_12'],['penalty','Penalties','rvr_17'],['freekick','Free kicks','rvr_17'],['cornerL','Left corners','rvr_14'],['cornerR','Right corners','rvr_10'],['throwin','Throw-ins','rvr_7']];
  const byPlayer=id=>Object.hasOwn(C.players,id)?C.players[id]:null;
  const numbers=(()=>{const used=new Set();return Object.fromEntries(C.roster.map(p=>{let n=p.num;while(used.has(n))n++;used.add(n);return [p.id,n];}));})();
  const iso=d=>new Date(d).toISOString().slice(0,10);
  const roleLabel=(s,form)=>{const side=s.y<.5?'L':'R';return ({GK:'GK',FB:`D${side}`,DC:s.y===.5?'DC':`DC${side}`,WB:`WB${side}`,DM:form==='4-2-3-1'?`DM${side}`:'DM',CM:s.y===.5?'MC':`MC${side}`,AM:'AMC',W:form==='4-4-2'?`M${side}`:`AM${side}`,ST:s.y===.5?'ST':`ST${side}`})[s.role];};
  const slots=form=>[{role:'GK',x:.035,y:.5},...D.FORMATIONS[form]].map(s=>({...s,label:roleLabel(s,form)}));
  const fit=(p,role)=>typeof p?.id==='string'&&(p.pos==='GK')===(role==='GK');
  const avail=(at,injuries={})=>C.roster.filter(p=>(p.injury?.status!=='Out'||iso(at)>='2026-11-04')&&!(injuries[p.id]>at));
  // Reserve natural positions across the whole shape instead of greedily spending
  // the best striker on a wing before the forward slots have been considered.
  function bestXI(players,form){
    const shape=slots(form), out=players.filter(p=>p.pos!=='GK'&&!p.red), keep=players.filter(p=>p.pos==='GK'&&!p.red).sort((a,b)=>D.ROLE_WEIGHTS.GK(b.attrs)-D.ROLE_WEIGHTS.GK(a.attrs))[0];
    if(out.length<10||!keep)return D.bestXI(players,form).xi;
    const targets=shape.slice(1), unit=Object.fromEntries(Object.entries(D.ROLE_WEIGHTS).map(([k,fn])=>[k,fn(new Proxy({},{get:()=>20}))]));
    // Minimum-cost rectangular assignment (potential adjustment and augmenting paths).
    const u=Array(11).fill(0), v=Array(out.length+1).fill(0), donor=v.slice(), way=v.slice();
    for(let i=1;i<=10;i++){
      donor[0]=i;
      let j=0;const cost=v.map(()=>Infinity), visited=v.map(()=>false);
      do {
        visited[j]=true;const row=donor[j], role=targets[row-1].role;
        let delta=Infinity, next=0;
        for(let col=1;col<=out.length;col++)if(!visited[col]){
          const p=out[col-1], fit=D.roleFit(p.pos,role), benefit=fit*.70+D.ROLE_WEIGHTS[role](p.attrs)/unit[role]*fit*.30;
          const c=1-benefit-u[row]-v[col];if(c<cost[col]){cost[col]=c;way[col]=j;}
          if(cost[col]<delta){delta=cost[col];next=col;}
        }
        for(let col=0;col<=out.length;col++){if(visited[col]){u[donor[col]]+=delta;v[col]-=delta;}else cost[col]-=delta;}
        j=next;
      }while(donor[j]);
      do{const prev=way[j];donor[j]=donor[prev];j=prev;}while(j);
    }
    const xi=[{...shape[0],player:keep}];
    for(let j=1;j<=out.length;j++)if(donor[j])xi[donor[j]]={...shape[donor[j]],player:out[j-1]};
    return xi;
  }
  function settings(raw={}){
    const i=Number.isInteger(raw.preset)&&presets[raw.preset]?raw.preset:0, t=presets[i],source=plain(raw);
    const out={preset:i,name:t.name,form:formationOptions.includes(source.form)?source.form:t.form,...Object.fromEntries(Object.entries(choices).map(([k,v])=>[k,v.includes(source[k])?source[k]:t[k]]))};
    out.trigger=choices.trigger.includes(source.trigger)?source.trigger:'Always available';
    out.attackFormation=phaseFormationOptions.includes(source.attackFormation)?source.attackFormation:'Same as defensive shape';
    out.attackByPlayer=Object.fromEntries(Object.entries(plain(source.attackByPlayer)).filter(([,v])=>Number.isFinite(+v?.x)&&Number.isFinite(+v?.y)&&+v.x>=0&&+v.x<=1&&+v.y>=0&&+v.y<=1).map(([id,v])=>[id,{x:+v.x,y:+v.y}]));
    out.phaseJobs={};for(const [id,phases] of Object.entries(plain(source.phaseJobs)).slice(0,30)){const clean={};for(const phase of ['attack','defense']){const x=plain(phases?.[phase]),job=typeof x.job==='string'&&Object.hasOwn(Z.jobs,x.job)?x.job:null;if(job)clean[phase]={job,duty:Z.duty(job,x.duty)};}if(Object.keys(clean).length)out.phaseJobs[id]=clean;}
    out.phaseRoles=Array.isArray(source.phaseRoles)?source.phaseRoles.slice(0,11).map(phases=>{const clean={};for(const phase of ['attack','defense']){const name=plain(phases)[phase]?.job;if(typeof name==='string'&&Object.hasOwn(Z.jobs,name))clean[phase]={job:name};}return clean;}):[];
    out.playerInstructions={};for(const [id,phases] of Object.entries(plain(source.playerInstructions)).slice(0,30)){const clean={};for(const phase of ['attack','defense']){const vals=plain(phases?.[phase]),row=Object.fromEntries(Object.entries(vals).filter(([k,v])=>Z.individualInstructionAllowed(phase,k,v)));if(Object.keys(row).length)clean[phase]=row;}if(Object.keys(clean).length)out.playerInstructions[id]=clean;}
    return out;
  }
  function plan(raw={}, at=H.start, injuries={}, legacy=[]){
    const source=raw&&typeof raw==='object'?raw:{}, t=settings(source.tactics||{}), shape=slots(t.form), pool=avail(at,injuries), available=Object.fromEntries(pool.map(p=>[p.id,p]));
    const assembled=Array(11).fill(null), chosen=new Set(), proposed=Array.isArray(source.xi)?source.xi:legacy.slice(0,11);
    for(let i=0;i<11;i++) {const p=available[proposed[i]];if(fit(p,shape[i].role)&&!chosen.has(p.id)){assembled[i]=p.id;chosen.add(p.id);}}
    const ideal=bestXI(pool,t.form);
    for(let i=0;i<11;i++)if(!assembled[i]){
      const p=[ideal[i]?.player,...pool.filter(q=>fit(q,shape[i].role)).sort((a,b)=>D.roleFit(b.pos,shape[i].role)-D.roleFit(a.pos,shape[i].role))].find(x=>fit(x,shape[i].role)&&!chosen.has(x.id));
      if(p){assembled[i]=p.id;chosen.add(p.id);}
    }
    const bench=[...(Array.isArray(source.bench)?source.bench:legacy.slice(11)),...pool.map(p=>p.id)].filter(id=>{if(!Object.hasOwn(available,id)||chosen.has(id))return false;chosen.add(id);return true;}).slice(0,6);
    const phaseJobs={...t.phaseJobs},phaseRoles=t.phaseRoles.map(x=>({...x})),provisional=shape.map((slot,i)=>({...slot,player:assembled[i]?available[assembled[i]]:null})),generated=targetPositions(provisional,t.attackFormation,t.attackByPlayer);
    for(let i=0;i<shape.length;i++){const id=assembled[i],slot=shape[i],position=Z.zone(slot.x,slot.y,slot.role==='GK'),point=id&&(t.attackByPlayer[id]||generated[id]),attackPosition=point?.role||Z.zone(point?.x??slot.x,point?.y??slot.y,slot.role==='GK'),legacy=id?phaseJobs[id]||{}:{},existing=phaseRoles[i]||{},legacyCodeValue=(roleOptions[slot.role]||[]).find(o=>o[0]===source.roles?.[i]),legacyDefense=legacyCodeValue?engineJob(legacyCodeValue[0],position,legacyCodeValue[2])[0]:null,defense=Z.choices(position).includes(existing.defense?.job)?existing.defense.job:Z.choices(position).includes(legacy.defense?.job)?legacy.defense.job:Z.choices(position).includes(legacyDefense)?legacyDefense:Z.choices(position)[0],attack=Z.choices(attackPosition).includes(existing.attack?.job)?existing.attack.job:Z.choices(attackPosition).includes(legacy.attack?.job)?legacy.attack.job:Z.choices(attackPosition).includes(defense)?defense:Z.choices(attackPosition)[0];phaseRoles[i]={defense:{job:defense},attack:{job:attack}};}
    t.phaseJobs=phaseJobs;t.phaseRoles=phaseRoles;
    const set=Object.fromEntries(takers.map(([key,,id])=>[key,byPlayer(source.set?.[key])?source.set[key]:id]));
    const used=new Set(), nums=Object.fromEntries(C.roster.map(p=>{let n=source.numbers?.[p.id];if(!Number.isInteger(n)||n<1||n>99||used.has(n))n=numbers[p.id];while(used.has(n))n=n%99+1;used.add(n);return [p.id,n];}));
    return {tactics:t,xi:assembled,bench,set,numbers:nums};
  }
  function sheet(p, at=H.start, injuries={}) {
    const make=id=>({...C.players[id],num:p.numbers[id]}),base=slots(p.tactics.form).map((s,i)=>{const player=p.xi[i]?make(p.xi[i]):null,id=player?.id,position=Z.zone(s.x,s.y,s.role==='GK'),stored=id&&p.tactics.phaseJobs?.[id]?.defense,canonical=p.tactics.phaseRoles?.[i]?.defense?.job,legacy=id&&legacyCode(s.role,stored?.job,stored?.duty),code=legacy||roleNames[s.role]?.[0],old=canonical&&Z.choices(position).includes(canonical)?(roleOptions[s.role]||[]).find(v=>engineJob(v[0],position)[0]===canonical)||[canonical,canonical,Z.duty(canonical,stored?.duty)]:(roleOptions[s.role]||[]).find(v=>v[0]===code)||roleNames[s.role],engine=canonical?engineJob(canonical,position,stored?.duty):stored?engineJob(stored.job,position,stored.duty):engineJob(code,position,old?.[2]);return {...s,position,player,job:old||['CM','Central Midfielder','Support'],engineJob:engine,defenseJob:engine,response:{}};});
    const generated=targetPositions(base,p.tactics.attackFormation,p.tactics.attackByPlayer),xi=base.map((slot,index)=>{if(!slot.player)return null;const id=slot.player.id,point=p.tactics.attackByPlayer?.[id]||generated[id],attackPosition=point?.role||Z.zone(point?.x??slot.x,point?.y??slot.y,slot.role==='GK'),phases=p.tactics.phaseJobs?.[id]||{},att=phases.attack||{},canonical=p.tactics.phaseRoles?.[index]?.attack?.job,defaultAttack=engineJob(legacyCode(attackPosition,slot.engineJob[0],slot.engineJob[2])||jobCode[slot.engineJob[0]]||slot.job[0],attackPosition,slot.job[2]),attackJob=canonical&&Z.choices(attackPosition).includes(canonical)?engineJob(canonical,attackPosition,att.duty):att.job?engineJob(att.job,attackPosition,att.duty):defaultAttack;return {...slot,attack:point?{x:point.x,y:point.y}:undefined,attackPosition,attackJob,attackRole:Z.families[attackPosition],instructions:p.tactics.playerInstructions?.[id]||{}};}).filter(Boolean);
    const active=avail(at,injuries).map(q=>q.id);
    return {club:home.id,shape:p.tactics.form,xi,bench:p.bench.map(make),out:C.roster.filter(q=>!active.includes(q.id)).map(q=>make(q.id))};
  }
  function opponent(club) {
    const shape=D.defaultTactics(club.style).formation, players=D.genSquad(club,D.seedFor(club.id)), used=new Set();
    players.forEach(p=>{while(used.has(p.num))p.num=p.num%99+1;used.add(p.num);});
    const {xi,bench}=D.bestXI(players,shape);
    return {club:club.id,shape,xi:xi.map(s=>({...s,label:roleLabel(s,shape)})),bench:bench.slice(0,6)};
  }
  function pinPositionRoles(p,next,at,injuries){const current=sheet(p,at,injuries),roles=next.tactics.phaseRoles||[];for(let i=0;i<p.xi.length;i++){const id=p.xi[i],slot=current.xi.find(x=>x.player.id===id);if(!slot)continue;const row={...(roles[i]||{})},legacy=p.tactics.phaseJobs?.[id]||{};for(const phase of ['attack','defense']){if(row[phase]?.job)continue;const position=phase==='attack'?slot.attackPosition:slot.position,job=phase==='attack'?(legacy.attack?.job||slot.attackJob?.[0]):(legacy.defense?.job||slot.engineJob?.[0]);if(job&&Z.choices(position).includes(job))row[phase]={job};}roles[i]=row;}next.tactics.phaseRoles=roles;}
  function edit(p,field,value,at,injuries={},numbersUnlocked=false){
    let next={...p,tactics:{...p.tactics,phaseJobs:{...p.tactics.phaseJobs},phaseRoles:(p.tactics.phaseRoles||[]).map(x=>({...x})),playerInstructions:{...p.tactics.playerInstructions},attackByPlayer:{...p.tactics.attackByPlayer}},xi:p.xi.slice(),bench:p.bench.slice(),set:{...p.set},numbers:{...p.numbers}};
    const [key,data]=field.split(':');
    pinPositionRoles(p,next,at,injuries);
    if(key==='preset'&&presets[+value]){next.tactics=settings({preset:+value});next.xi=bestXI(avail(at,injuries),next.tactics.form).map(s=>s.player.id);}
    else if(key==='form'&&formationOptions.includes(value)){
      if(value===p.tactics.form)return p;
      next.tactics.form=value;next.xi=bestXI(p.xi.map(byPlayer).filter(Boolean),value).map(s=>s.player.id);
    }else if(Object.hasOwn(choices,key)&&choices[key].includes(value))next.tactics[key]=value;
    else if(key==='pick'){
      const ids=avail(at,injuries);next.xi=bestXI(ids,next.tactics.form).map(s=>s.player.id);next.bench=ids.filter(x=>!next.xi.includes(x.id)).slice(0,6).map(p=>p.id);
    }else if(key==='xi'||key==='bench'){
      const list=next[key], i=Number(data), p=byPlayer(value);
      if(!Number.isInteger(i)||i<0||i>=list.length||!avail(at,injuries).some(q=>q.id===value))return null;
      const orig=[...next.xi,...next.bench].indexOf(value), slot=key==='xi'?slots(next.tactics.form)[i]:null;
      if(slot&&!fit(p,slot.role))return null;
      if(orig>=0&&orig<11&&!fit(byPlayer(list[i]),slots(next.tactics.form)[orig].role))return null;
      if(orig>=0) (orig<11?next.xi:next.bench)[orig<11?orig:orig-11]=list[i];
      list[i]=value;
    }else if(key==='role'||key==='phaseRole'){
      const parts=field.split(':'),index=Number(data),s=slots(p.tactics.form)[index],id=p.xi[index],phase=key==='role'?'defense':parts[2],target=sheet(p,at,injuries).xi.find(x=>x.player.id===id),position=phase==='attack'?target?.attackPosition:target?.position;if(!s||!id||!target||!['attack','defense'].includes(phase))return null;
      let name=value;if(key==='role'){const option=(roleOptions[s.role]||[]).find(r=>r[0]===value);if(!option)return null;name=engineJob(value,position,option[2])[0];}
      if(!Object.hasOwn(Z.jobs,name)||!(Z.choices(position)||[]).includes(name))return null;next.tactics.phaseRoles[index]={...(next.tactics.phaseRoles[index]||{}),[phase]:{job:name}};
    }else if(key==='attackFormation'&&phaseFormationOptions.includes(value)){next.tactics.attackFormation=value;if(value!=='Custom')next.tactics.attackByPlayer={};}
    else if(key==='individual'){const [,id,phase,group]=field.split(':');if(!p.xi.includes(id)||!['attack','defense'].includes(phase)||!Z.individualInstructionAllowed(phase,group,value))return null;const player=next.tactics.playerInstructions[id]||{},row={...(player[phase]||{})};if(value==='Team default')delete row[group];else row[group]=value;next.tactics.playerInstructions[id]={...player,[phase]:row};}
    else if(key==='phaseDuty'){const [,id,phase]=field.split(':');if(!p.xi.includes(id)||!['attack','defense'].includes(phase))return null;const target=sheet(p,at,injuries).xi.find(x=>x.player.id===id),old=next.tactics.phaseJobs[id]||{},job=old[phase]?.job||(phase==='attack'?target?.attackJob?.[0]:target?.engineJob?.[0]);if(!job||!Z.jobs[job]?.duties.includes(value))return null;next.tactics.phaseJobs[id]={...old,[phase]:{job,duty:value}};}
    else if(key==='attackMove'){const [,id]=field.split(':');const x=value&&+value.x,y=value&&+value.y;if(!p.xi.includes(id)||!Number.isFinite(x)||!Number.isFinite(y)||x<.03||x>.97||y<.03||y>.97)return null;next.tactics.attackFormation='Custom';next.tactics.attackByPlayer[id]={x,y};}
    else if(key==='set'&&takers.some(([k])=>k===data)&&byPlayer(value))next.set[data]=value;
    else if(key==='number'&&numbersUnlocked&&byPlayer(data)){
      const n=Number(value);if(!Number.isInteger(n)||n<1||n>99||Object.entries(next.numbers).some(([k,v])=>k!==data&&v===n))return null;next.numbers[data]=n;
    }else return null;
    return plan(next,at,injuries);
  }
  const engineTactics=t=>({formation:t.form,attackFormation:t.attackFormation||'Same as defensive shape',mentality:D.MENTALITIES.indexOf(t.mentality),passing:choices.passing.indexOf(t.passing),tempo:choices.tempo.indexOf(t.tempo),width:choices.width.indexOf(t.width),press:Math.min(2,choices.press.indexOf(t.press)),line:choices.line.indexOf(t.line),club:{build:t.build,lost:t.lost,won:t.won,gk:t.gk,target:t.target,delivery:t.delivery,block:t.block,duels:t.duels,corner:t.corner,free:t.free,trigger:t.trigger},tactical:{attackByPlayer:t.attackByPlayer||{},phaseJobs:t.phaseJobs||{},phaseRoles:t.phaseRoles||[],playerInstructions:t.playerInstructions||{}}});
  const api={home,iso,choices,presets,roleNames,roleOptions,formationOptions,phaseFormationOptions,takers,roleLabel,byPlayer,bestXI,plan,sheet,opponent,edit,avail,engineTactics,engineJob,legacyCode};
  global.TLMatchdayData=api;if(node)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
