/* Persistent club tactics and immutable submitted team sheets. No display-only lineups. */
(function (global) {
  'use strict';
  const node=typeof window==='undefined', H=node?require('./home-data.js'):global.TLHomeData, C=node?require('./club-data.js'):global.TLClubData, D=node?require('./data.js'):global.TLData;
  const home=H.clubs[H.homeId];
  const choices={
    mentality:D.MENTALITIES,passing:['Shorter','Standard','More direct'],tempo:['Lower','Standard','Higher'],width:['Narrow','Standard','Fairly wide'],build:['Play out of defence','Run at defence','Pass into space'],
    lost:['Counter-press','Regroup'],won:['Counter','Hold shape'],gk:['Distribute quickly','Slow pace down'],target:['Over opposition','Target forward','Flanks','Playmaker','Full-backs','Centre-backs'],delivery:['Roll it out','Throw it long','Take short kicks','Take long kicks'],
    line:['Deeper','Standard','Higher'],press:['Less often','Standard','More often','Much more often'],block:['Low block','Mid block','High press'],duels:['Stay on feet','Get stuck in'],corner:['Mixed','Short option','Cross into the box'],free:['Mixed','Look for a shot','Look for a delivery']
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
    const i=Number.isInteger(raw.preset)&&presets[raw.preset]?raw.preset:0, t=presets[i];
    return {preset:i,name:t.name,form:formationOptions.includes(raw.form)?raw.form:t.form,...Object.fromEntries(Object.entries(choices).map(([k,v])=>[k,v.includes(raw[k])?raw[k]:t[k]]))};
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
    const roles=shape.map((s,i)=>{const options=roleOptions[s.role];return (options.find(o=>o[0]===source.roles?.[i])||options[0])[0];});
    const set=Object.fromEntries(takers.map(([key,,id])=>[key,byPlayer(source.set?.[key])?source.set[key]:id]));
    const used=new Set(), nums=Object.fromEntries(C.roster.map(p=>{let n=source.numbers?.[p.id];if(!Number.isInteger(n)||n<1||n>99||used.has(n))n=numbers[p.id];while(used.has(n))n=n%99+1;used.add(n);return [p.id,n];}));
    return {tactics:t,xi:assembled,bench,roles,set,numbers:nums};
  }
  function sheet(p, at=H.start, injuries={}) {
    const make=id=>({...C.players[id],num:p.numbers[id]});
    const active=avail(at,injuries).map(q=>q.id);
    return {club:home.id,shape:p.tactics.form,xi:slots(p.tactics.form).map((s,i)=>({...s,player:p.xi[i]?make(p.xi[i]):null,job:roleOptions[s.role].find(r=>r[0]===p.roles[i])||roleNames[s.role]})).filter(s=>s.player),bench:p.bench.map(make),out:C.roster.filter(q=>!active.includes(q.id)).map(q=>make(q.id))};
  }
  function opponent(club) {
    const shape=D.defaultTactics(club.style).formation, players=D.genSquad(club,D.seedFor(club.id)), used=new Set();
    players.forEach(p=>{while(used.has(p.num))p.num=p.num%99+1;used.add(p.num);});
    const {xi,bench}=D.bestXI(players,shape);
    return {club:club.id,shape,xi:xi.map(s=>({...s,label:roleLabel(s,shape)})),bench:bench.slice(0,6)};
  }
  function edit(p,field,value,at,injuries={},numbersUnlocked=false){
    let next={...p,tactics:{...p.tactics},xi:p.xi.slice(),bench:p.bench.slice(),roles:p.roles.slice(),set:{...p.set},numbers:{...p.numbers}};
    const [key,data]=field.split(':');
    if(key==='preset'&&presets[+value]){next.tactics=settings({preset:+value});next.xi=bestXI(avail(at,injuries),next.tactics.form).map(s=>s.player.id);next.roles=[];}
    else if(key==='form'&&formationOptions.includes(value)){
      if(value===p.tactics.form)return p;
      next.tactics.form=value;next.xi=bestXI(p.xi.map(byPlayer).filter(Boolean),value).map(s=>s.player.id);next.roles=[];
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
    }else if(key==='role'){
      const s=slots(p.tactics.form)[+data];if(!s||!roleOptions[s.role].some(r=>r[0]===value))return null;next.roles[+data]=value;
    }else if(key==='set'&&takers.some(([k])=>k===data)&&byPlayer(value))next.set[data]=value;
    else if(key==='number'&&numbersUnlocked&&byPlayer(data)){
      const n=Number(value);if(!Number.isInteger(n)||n<1||n>99||Object.entries(next.numbers).some(([k,v])=>k!==data&&v===n))return null;next.numbers[data]=n;
    }else return null;
    return plan(next,at,injuries);
  }
  const engineTactics=t=>({formation:t.form,mentality:D.MENTALITIES.indexOf(t.mentality),passing:choices.passing.indexOf(t.passing),tempo:choices.tempo.indexOf(t.tempo),width:choices.width.indexOf(t.width),press:Math.min(2,choices.press.indexOf(t.press)),line:choices.line.indexOf(t.line),club:{build:t.build,lost:t.lost,won:t.won,gk:t.gk,target:t.target,delivery:t.delivery,block:t.block,duels:t.duels,corner:t.corner,free:t.free}});
  const api={home,iso,choices,presets,roleNames,roleOptions,formationOptions,takers,roleLabel,byPlayer,bestXI,plan,sheet,opponent,edit,avail,engineTactics};
  global.TLMatchdayData=api;if(node)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
