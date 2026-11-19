/* Riverside's local season ledger. Only the active date can open a match session. */
(function(global){
  'use strict';
  const node=typeof window==='undefined', H=node?require('./home-data.js'):global.TLHomeData, C=node?require('./club-data.js'):global.TLClubData, K=node?require('./season-calendar.js'):global.TLSeasonCalendar, M=node?require('./matchday-data.js'):global.TLMatchdayData;
  const {date,day,iso,DAY,HOUR}=K, key='touchline26.2026.riverside.season.v1';
  const mail=(id,ts,from,role,category,subject,body,options=[],required=false)=>({id,date:ts,from,role,category,subject,body,options,required,type:'season'});
  const asst=C.namedStaff['Assistant Manager'], phys=C.namedStaff['Head of Sports Science'];
  const scheduled=[
    mail('load-review',date('2026-10-27',10),phys,'Head of Sports Science','Injuries','Approve the cup-week training load',`${C.players.rvr_12.name} and ${C.players.rvr_14.name} are carrying a heavy workload. We need your decision before assigning Wednesday’s sessions. Individual recovery improves their condition for Friday.`,[['light','Give at-risk players recovery','Individual recovery added for the at-risk players.'],['normal','Keep the planned sessions','All available players will follow the main group.']],true),
    mail('staff-cup',date('2026-10-28',9),asst,'Assistant Manager','Club','Coaches’ meeting: priorities for Harbourport','We can use the last slot on Thursday to work on first contact at set pieces or rehearse our response to a direct attack. Pick a focus in the coaches’ meeting.',[['set','Rehearse set-piece delivery','Set pieces added to Thursday’s programme.'],['shape','Rehearse defensive shape','Defensive shape added to Thursday’s programme.']],true),
    mail('press-cup',date('2026-10-28',14,15),'Sam Ellis','Press Officer','Media','Confirm the pre-match press appearance','The press want to ask about Friday’s cup tie. Please give us a line to publish, or send the assistant in your place.',[['respect','“We respect their threat.”','You told the press Riverside will respect Harbourport’s threat.'],['confidence','“We’ll take the game to them.”','You backed Riverside to take the game to Harbourport.'],['delegate','Send Elliot Marsh','Elliot Marsh will handle the press conference.']],true),
    mail('board-cup',date('2026-10-28',16),'Eleanor Voss','Chairperson','Club','Board meeting: the Quayside cup allocation','We can hold a block of seats for community groups or release it for general sale. Let me know which you prefer.',[['community','Reserve seats for community groups','The board reserved a community allocation for Friday.'],['sale','Release them for general sale','The board opened the remaining allocation for general sale.']]),
    mail('cup-observations',date('2026-10-29',12),'Iona Wallace','Performance Analyst','Scouting','Harbourport: protect the space behind the back line','Harbourport’s first pass often goes long. Keep a covering defender close to the second ball, and use width to move their two banks apart.'),
    mail('cup-logistics',date('2026-10-29',16),'June Fletcher','Club Secretary','Club','Friday’s match arrangements','The tie kicks off at 19:45 at Quayside Park. The tactical meeting takes place before team submission. A draw after 90 minutes goes straight to penalties.'),
    mail('cup-reminder',date('2026-10-30',11),asst,'Assistant Manager','Match','Tactical meeting at Quayside Park','We’ll discuss our expected opposition and your selection before the teams are submitted.')
  ];
  const copy=v=>JSON.parse(JSON.stringify(v));
  const stages=['meeting','selection','briefing','news','preTalk','preview','live','half','halfTalk','full','fullTalk'];
  const maxTicks=300000;
  const optionalPosts=(f,r)=>{
    const rival=H.clubs[f.opponent].name, score=r.goals.join('–'), home=f.home===H.homeId, won=(r.pen||r.goals)[home?0:1]>(r.pen||r.goals)[home?1:0], tie=r.goals[0]===r.goals[1]&&!r.pen;
    const posts=[mail(`result-${f.id}`,K.finish(f),'Sam Ellis','Press Officer','Match',`Full time: ${H.clubs[f.home].name} ${score} ${H.clubs[f.away].name}`,`Riverside ${tie?'drew with':won?'beat':'lost to'} ${rival}${r.pen?` on penalties (${r.pen.join('–')})`:''}. The staff report includes match statistics, key events and player ratings.`),
      mail(`press-${f.id}`,K.finish(f)+10*6e4,'Sam Ellis','Press Officer','Media',`Press reaction requested: ${rival}`,`The media are asking for a response to the ${score} result. You can give a quote or let Elliot Marsh speak for the club.`,[['team','Credit the work of the team','You told reporters the team’s work was the focus.'],['next','Turn attention to the next fixture','You told reporters attention now turns to the next fixture.'],['delegate','Send Elliot Marsh','Elliot Marsh spoke for the club.']])];
    const hurt=r.players[home?0:1].filter(p=>Number.isInteger(p.injury)&&p.injury>0);
    if(hurt.length)posts.push(mail(`injury-${f.id}`,K.finish(f)+7*6e4,C.namedStaff['Head Physio'],'Head Physio','Injuries',`Medical update after ${rival}`,hurt.map(p=>`${p.name} took a knock and is expected to return on ${H.calendar(day(K.finish(f))+p.injury*DAY).date}.`).join(' ')));
    return posts;
  };
  function messages(s){
    const completed=K.clubFixtures(s).filter(f=>s.results[f.id]).flatMap(f=>optionalPosts(f,s.results[f.id]));
    return [...C.inbox,...scheduled,...completed].filter(m=>m.date<=s.now).sort((a,b)=>b.date-a.date||a.id.localeCompare(b.id));
  }
  const pending=s=>messages(s).filter(m=>m.required&&!Object.hasOwn(s.answers,m.id)).reverse();
  const unread=(s,oldRead)=>messages(s).filter(m=>!(m.type==='season'?s.read:oldRead).includes(m.id));
  function activities(s,at){
    const d=iso(at), fixtures=K.onDate(s,at), f=fixtures.find(K.isClub), next=K.next(s), last=K.clubFixtures(s).filter(x=>x.score&&day(x.date)===day(at)-DAY).at(-1);
    const mailEvents=messages(s).filter(m=>m.type==='season'&&day(m.date)===day(at));
    // Future activities are visible on the planning strip without exposing future Inbox items.
    const agenda=[...scheduled.filter(m=>day(m.date)===day(at)&&m.date>s.now),...mailEvents];
    const session=(h,min,label,desc,kind='training')=>({time:day(at)+h*HOUR+min*6e4,label,desc,kind});
    const work=d==='2026-10-26'?[session(9,30,'Match preparation','Set plays and shape')]
      :d==='2026-10-27'?[session(9,30,'Recovery','First team · North Quayside'),session(13,30,'Rest','Individual recovery')]
      :d==='2026-10-28'?[session(9,30,'Endurance','First team · On-pitch'),session(13,30,s.answers['load-review']==='light'?'Individual recovery':'Resistance','Strength & conditioning')]
      :d==='2026-10-29'?[session(9,30,'Quickness','First team · North Quayside'),session(15,0,s.answers['staff-cup']==='set'?'Set-piece rehearsal':s.answers['staff-cup']==='shape'?'Defensive shape':'Match preparation','Tactical session')]
      :f?[session(10,30,'Match preparation','First team · Tactical review')]
      :last?[session(9,30,'Recovery','Post-match recovery'),session(13,30,'Rest','First team')]
      :next&&day(next.date)===day(at)+DAY?[session(10,0,'Match preparation','Shape and set pieces'),session(14,0,next.venue==='A'?'Travel':'Team briefing','Staff & first team','staff')]
      :new Date(at).getUTCDay()===0?[session(10,0,'Rest','First team')]:[session(9,30,'Team training',['Technical work','Possession drills','Core fitness'][Math.floor(day(at)/DAY)%3])];
    return [...work,...agenda.map(m=>({id:m.id,time:m.date,label:m.subject,desc:m.from,kind:m.category==='Media'?'press':m.category==='Match'?'news':m.id.includes('board')||m.id.includes('staff')?'staff':'mail',required:m.required,done:!!s.answers[m.id]})),...(f?[{id:f.id,time:f.date,label:`${H.clubs[f.home].short} v ${H.clubs[f.away].short}`,desc:H.fixtureCompetition(f),kind:'fixture',done:!!f.result}]:[])].sort((a,b)=>a.time-b.time);
  }
  function condition(s,id){
    const elapsed=(day(s.now)-day(H.start))/DAY, p=C.players[id];if(!p)return 100;
    if(s.injuries[id]>s.now)return 39;
    const recent=Object.values(s.results).reverse().find(r=>r.players?.flat().some(q=>q.id===id)), played=recent?.players.flat().find(q=>q.id===id);
    if(recent&&played){const days=(day(s.now)-day(recent.date))/DAY;return Math.min(100,Math.round(played.cond+Math.max(0,days)*8));}
    const risk=p.injury?.risk;if(p.injury?.status==='Out'&&iso(s.now)<'2026-11-04')return 39;
    if(risk==='High'||risk==='Elevated')return Math.min(100,(risk==='High'?80:84)+elapsed*(s.answers['load-review']==='light'?4:2));
    return Math.min(100,93+(p.num%5)+elapsed*2);
  }
  function availability(s,id){
    const p=M.byPlayer(id), info=p?.injury, returnDate=Math.max(s.injuries[id]||0,info?.status==='Out'?Date.UTC(2026,10,4):0);
    const out=returnDate>s.now, today=condition(s,id), risk=!out&&info?.status!=='Out'&&today<96?info?.risk||'Low':'Low';
    return {p,returnDate,out,today,risk,status:out?'Out':today<92?'Managing load':'Available',issue:out?(s.injuries[id]?'Match knock':info.issue):risk!=='Low'?info.issue:'–'};
  }
  // All appearances below the opening snapshot are counted from completed
  // competitive fixtures, never from selection, the interval or a replay.
  const statCache=new WeakMap(), competitive=s=>K.clubFixtures(s).filter(f=>f.comp!=='FR'&&s.results[f.id]);
  function playerStats(s){
    if(statCache.has(s.results))return statCache.get(s.results);
    const initial=Object.fromEntries(C.roster.map(p=>[p.id,{...p,ratingTotal:p.rating*p.appearances,livePass:0,liveWon:0,live:0,form:[]} ]));
    for(const f of competitive(s)){
      const r=s.results[f.id], team=r.players[f.home===H.homeId?0:1], best=r.players.flat().slice().sort((a,b)=>b.rating-a.rating)[0];
      for(const q of team){
        const p=initial[q.id];if(!p)continue;
        p.appearances++;p.live++;p.goals+=q.stats.goals;p.assists+=q.stats.assists;p.ratingTotal+=q.rating;p.yellow+=q.yellow||0;p.redCards+=Number(q.red);
        p.livePass+=q.stats.passes;p.liveWon+=q.stats.passWon;p.awards+=Number(q.id===best?.id);
        p.form.push({date:f.date,id:f.id,rating:q.rating});
      }
    }
    for(const p of Object.values(initial)){
      p.rating=p.appearances?+(p.ratingTotal/p.appearances).toFixed(2):0;
      if(p.livePass)p.pass=Math.round(p.liveWon/p.livePass*100);
      const last=C.matchReport.ratings[p.id];if(last!=null)p.form.unshift({date:C.reportFixture.date,id:C.reportFixture.id,rating:Number(last)});
    }
    statCache.set(s.results,initial);return initial;
  }
  function leaders(s){
    if(!competitive(s).length)return H.leaders;
    const metrics=['goals','rating','assists','pass','awards','yellow','redCards'], labels=['goals','','assists','%','Player of the Match awards','yellow cards','red cards'];
    const players=Object.values(playerStats(s));
    return H.leaders.map((row,i)=>{
      const key=metrics[i], player=players.slice().sort((a,b)=>b[key]-a[key]||b.appearances-a.appearances||a.name.localeCompare(b.name))[0];
      const n=player[key], value=i===1?n.toFixed(2):i===3?`${n}%`:`${n} ${labels[i]}`;
      return {...row,player,value};
    });
  }
  const numbersUnlocked=(s,f)=>f?.comp==='FR'||(iso(s.now)>='2027-06-01'&&iso(s.now)<='2027-08-31');
  const validScore=v=>Array.isArray(v)&&v.length===2&&v.every(n=>Number.isInteger(n)&&n>=0&&n<100);
  function validReport(r){
    return !!r&&Number.isFinite(r.date)&&validScore(r.goals)&&(r.pen==null||validScore(r.pen)&&r.pen[0]!==r.pen[1]&&r.goals[0]===r.goals[1])&&
      Array.isArray(r.clubs)&&r.clubs.length===2&&r.clubs.every(id=>Object.hasOwn(H.clubs,id))&&r.clubs.includes(H.homeId)&&
      Array.isArray(r.stats)&&r.stats.length===2&&r.stats.every(t=>Number.isFinite(t?.xG))&&
      Array.isArray(r.players)&&r.players.length===2&&r.players.every(team=>Array.isArray(team)&&team.length&&team.every(p=>p?.id&&typeof p.name==='string'&&p.stats&&Number.isFinite(p.rating)&&Number.isFinite(p.cond)))&&
      ['events','shots','possession','lineup','benches','shapes','added'].every(k=>Array.isArray(r[k]));
  }
  function validManifest(a){
    const p=a?.sheet;
    if(!p||!a.fitness||!M.formationOptions.includes(p.tactics?.form)||!Array.isArray(p.xi)||p.xi.length!==11||!Array.isArray(p.bench)||p.bench.length>6||!Array.isArray(p.roles)||p.roles.length!==11||!p.set||!p.numbers)return false;
    const list=p.xi.concat(p.bench);
    return new Set(list).size===list.length&&list.every(id=>typeof id==='string'&&M.byPlayer(id)&&Number.isInteger(p.numbers[id])&&Number.isFinite(a.fitness[id]));
  }
  const object=o=>o&&typeof o==='object'&&!Array.isArray(o)?o:{};
  function normalize(raw,legacy){
    const src=object(raw), now=Number.isFinite(src.now)&&src.now>=H.start&&src.now<K.end+DAY?src.now:H.start;
    const results=Object.fromEntries(Object.entries(object(src.results)).filter(([id,r])=>/^[\da-z-]+$/.test(id)&&validReport(r)&&r.date<=now&&r.date>=H.start));
    const injuries=Object.fromEntries(Object.entries(object(src.injuries)).filter(([id,t])=>C.players[id]&&Number.isFinite(t)&&t>now));
    const read=Array.isArray(src.read)?[...new Set(src.read.filter(id=>typeof id==='string'))]:[];
    const answers=Object.fromEntries(messages({now,results}).map(m=>[m.id,m.options?.some(([v])=>v===src.answers?.[m.id])?src.answers[m.id]:null]).filter(([,v])=>v));
    const s={now,read,answers,results,injuries,plan:M.plan(src.plan,now,injuries,legacy),session:null};
    const a=object(src.session), current=K.slate(s).find(f=>f.id===a.id&&K.isClub(f)&&day(f.date)===day(now));
    if(current&&stages.includes(a.stage)&&(!['half','halfTalk'].includes(a.stage)||validReport(a.half))&&((a.stage==='full'||a.stage==='fullTalk')===!!results[current.id])&&(!results[current.id]||a.submitted)){
      if(['meeting','selection'].includes(a.stage))s.session={id:a.id,stage:a.stage};
      else if(validManifest(a.submitted)){
        const checkpoint=object(a.checkpoint);
        s.session={id:a.id,stage:a.stage,submitted:copy(a.submitted),talks:object(a.talks),checkpoint:{started:checkpoint.started===true,ticks:Number.isInteger(checkpoint.ticks)?Math.max(0,Math.min(maxTicks,checkpoint.ticks)):0,commands:Array.isArray(checkpoint.commands)?checkpoint.commands.slice(0,2000):[]},half:validReport(a.half)?a.half:null};
      }
    }
    return s;
  }
  function open(storage,legacy=[]){
    let raw;try{raw=JSON.parse(storage?.getItem(key)||'null');}catch{}
    let s=normalize(raw,legacy);
    const commit=patch=>{s={...s,...patch};try{storage?.setItem(key,JSON.stringify(s));}catch{}return true;};
    const session=patch=>s.session&&commit({session:{...s.session,...patch}});
    const fixture=()=>s.session&&K.slate(s).find(f=>f.id===s.session.id);
    const getMail=id=>messages(s).find(m=>m.id===id);
    return {
      get value(){return s;}, fixture,
      advance(){
        if(s.session||pending(s).length||K.due(s)||day(s.now)>=K.end)return false;
        const d=day(s.now)+DAY, next=K.next(s), now=next&&day(next.date)===d?next.date:d+17*HOUR+15*6e4;
        const injuries=Object.fromEntries(Object.entries(s.injuries).filter(([,t])=>t>now));
        return commit({now,injuries,plan:M.plan(s.plan,now,injuries)});
      },
      read(id){return getMail(id)?.type==='season'&&!s.read.includes(id)&&commit({read:[...s.read,id]});},
      readAll(){return commit({read:messages(s).filter(m=>m.type==='season').map(m=>m.id)});},
      answer(id,v){const m=getMail(id);return !!(m?.options?.some(o=>o[0]===v)&&!s.answers[id]&&commit({answers:{...s.answers,[id]:v},read:[...new Set([...s.read,id])]}));},
      enter(){const due=K.due(s);return !s.session&&!pending(s).length&&due&&commit({session:{id:due.id,stage:'meeting'}});},
      leave(){return s.session?.stage==='meeting'&&commit({session:null});},
      move(from,to){
        const legal={meeting:'selection',selection:'meeting',briefing:'news',news:'preTalk',preTalk:'preview',preview:'live',half:'halfTalk',full:'fullTalk'};
        return s.session?.stage===from&&legal[from]===to&&session({stage:to});
      },
      edit(field,value){
        if(s.session&&!['meeting','selection'].includes(s.session.stage))return false;
        const p=M.edit(s.plan,field,value,s.now,s.injuries,numbersUnlocked(s,fixture()));return p&&p!==s.plan&&commit({plan:p});
      },
      submit(){
        if(s.session?.stage!=='selection'||pending(s).length||K.due(s)?.id!==s.session.id)return false;
        const p=s.plan, sheet=M.sheet(p,s.now,s.injuries);if(sheet.xi.length!==11)return false;
        const resolve=(...ids)=>ids.find(id=>p.xi.includes(id))||p.xi[1];
        const captain=resolve(p.set.captain,p.set.vice,C.leaders.captain);
        const vice=resolve(...[p.set.vice,p.set.captain,C.leaders.vice,...p.xi].filter(id=>id!==captain));
        const manifest={...copy(p),set:{...p.set,captain,vice}};
        const fitness=Object.fromEntries(C.roster.map(q=>[q.id,condition(s,q.id)]));
        const morale=Object.values(s.results).at(-1), days=morale?(s.now-morale.date)/DAY:99;
        const mood=days<8?Object.assign({},...(morale.talks||[]).map(t=>t.reactions)):{};
        return session({stage:'briefing',submitted:{sheet:manifest,fitness,mood,focus:s.answers['staff-cup']||'',press:s.answers['press-cup']||''},talks:{},checkpoint:{started:false,ticks:0,commands:[]},half:null});
      },
      talk(phase,talk){
        if(s.session?.stage!==({pre:'preTalk',half:'halfTalk',full:'fullTalk'})[phase])return false;
        const ledger=s.session.talks[phase]||[];if(ledger.some(t=>t.audience===talk.audience&&(talk.audience!=='Individuals'||t.id===talk.id)))return false;
        return session({talks:{...s.session.talks,[phase]:[...ledger.slice(0,29),copy(talk)]}});
      },
      checkpoint(ticks,command,started=s.session?.checkpoint?.started){
        if(!['live','half','halfTalk'].includes(s.session?.stage)||!Number.isInteger(ticks)||ticks<0||ticks>maxTicks)return false;
        const old=s.session.checkpoint;if(ticks<old.ticks)return false;
        if(!command&&ticks===old.ticks&&started===old.started)return true;
        return session({checkpoint:{started,ticks,commands:command?[...old.commands,{tick:ticks,...copy(command)}]:old.commands}});
      },
      break(type,report,ticks){
        if(s.session?.stage!=='live'||!['ht','ft'].includes(type)||!validReport(report)||report.date!==fixture()?.date||!Number.isInteger(ticks)||ticks<1||ticks>maxTicks)return false;
        if((type==='ht'&&(s.session.half||report.minutes!==45||report.events.at(-1)?.type!=='ht'))||(type==='ft'&&(!s.session.half||report.minutes!==90||report.events.at(-1)?.type!=='ft')))return false;
        const a={...s.session,stage:type==='ht'?'half':'full',checkpoint:{...s.session.checkpoint,ticks,started:true}};
        if(type==='ht'){a.half=copy(report);return commit({session:a});}
        if(type!=='ft'||s.results[a.id]||fixture().comp==='LC'&&report.goals[0]===report.goals[1]&&!validScore(report.pen))return false;
        const clock=Math.max(s.now,K.finish(fixture())+10*6e4), injuries={...s.injuries};
        for(const p of report.players.flat())if(p.injury&&C.players[p.id])injuries[p.id]=day(clock)+p.injury*DAY;
        return commit({now:clock,results:{...s.results,[a.id]:{...copy(report),finishedAt:clock}},session:a,injuries,plan:M.plan(s.plan,clock,injuries)});
      },
      secondHalf(ticks){
        if(s.session?.stage!=='halfTalk'||ticks!==s.session.checkpoint.ticks)return false;
        const command={tick:ticks,type:'second',talks:s.session.talks.half||[]};
        return session({stage:'live',checkpoint:{...s.session.checkpoint,commands:[...s.session.checkpoint.commands,copy(command)]}});
      },
      saveLive(tactics){
        if(!['live','half','halfTalk'].includes(s.session?.stage)||!s.session.checkpoint.started)return false;
        const p=M.edit(s.plan,'form',tactics.form,s.now,s.injuries)||s.plan;
        return commit({plan:M.plan({...p,tactics},s.now,s.injuries)});
      },
      close(){
        if(s.session?.stage!=='fullTalk'||!s.results[s.session.id])return false;
        const id=s.session.id, r=s.results[id], talks=s.session.talks.full||[];
        return commit({session:null,results:{...s.results,[id]:{...r,talks}}});
      }
    };
  }
  const api={key,stages,open,normalize,messages,unread,pending,activities,condition,availability,playerStats,leaders,numbersUnlocked};
  global.TLSeasonState=api;if(node)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
