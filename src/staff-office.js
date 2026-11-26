/* Backroom operations: appointments own recurring work, targets, reports and transfer recommendations. */
(function(g){'use strict';
const D=g.TLData||require('./data'),F=g.TLFASeason||require('./fa-season'),R=g.TLDynamics||require('./team-dynamics'),Mind=g.TLPlayerMind||require('./player-intelligence');
const specs=[
 {name:'Assistant coach',group:'Coaching',mark:'AC',wage:260,duties:['First-team sharpness','Develop under-23s'],task:'coaching'},
 {name:'Physio',group:'Medical',mark:'PH',wage:210,duties:['Fitness recovery','Injury rehabilitation'],task:'physio'},
 {name:'Youth scout',group:'Scouting',mark:'YS',wage:180,duties:['Local prospects','Find a goalkeeper'],task:'scout'},
 {name:'Head coach',group:'Coaching',mark:'HC',wage:520,duties:['Plan the first-team week','Develop under-23s'],task:'coach'},
 {name:'Tactical coach',group:'Coaching',mark:'TC',wage:430,duties:['Current tactic','Defensive shape'],task:'tactics'},
 {name:'Goalkeeping coach',group:'Coaching',mark:'GK',wage:350,duties:['Senior keepers','Youth keepers'],task:'keeper'},
 {name:'Fitness coach',group:'Coaching',mark:'FC',wage:380,duties:['Condition & recovery','Match fitness'],task:'fitness'},
 {name:'Youth development coach',group:'Academy',mark:'YD',wage:390,duties:['Technical development','Physical development'],task:'development'},
 {name:'Sports scientist',group:'Medical',mark:'SS',wage:420,duties:['Injury prevention','Training load'],task:'science'},
 {name:'Chief scout',group:'Recruitment',mark:'CS',wage:480,duties:['First-team targets','Under-21 prospects'],task:'scout'},
 {name:'First-team scout',group:'Recruitment',mark:'FS',wage:310,duties:['First-team targets','Value signings'],task:'scout'},
 {name:'Recruitment analyst',group:'Recruitment',mark:'RA',wage:390,duties:['Evaluate reports','Compare contract cost'],task:'analysis'},
 {name:'Director of football',group:'Recruitment',mark:'DoF',wage:780,duties:['First-team recruitment','Squad succession'],task:'director'},
 {name:'Contract negotiator',group:'Recruitment',mark:'CN',wage:540,duties:['Prepare transfer terms','Review renewals'],task:'negotiator'},
 {name:'Performance analyst',group:'Analysis',mark:'PA',wage:370,duties:['Team performance','Upcoming opponent'],task:'analysis'},
 {name:'Academy manager',group:'Academy',mark:'AM',wage:460,duties:['Youth pathway','Find academy prospects'],task:'academy'},
];
const roles=specs.map(x=>x.name),cash=n=>(g.TLLuma||require('./luma')).format(n),rate=(s,n)=>F.rate(s,s.profile.nation,n,'wages'),date=day=>{const iso=g.TLManagerLife.date(Number(day)),d=new Date(iso+'T12:00:00Z');return Number.isNaN(d.getTime())?iso:d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});},clip=(x,a,b)=>Math.max(a,Math.min(b,x));
function candidate(s,i,j){const h=D.seedFor([s.id,s.club.name,i,j].join('|'))>>>0;return {name:['Ama','Ivo','Nia','Emil','Mara','Sol','Kojo','Inés'][h%8]+' '+['Soro','Keita','Marin','Varela','Mensah','Novak','Bell','Rivas'][(h>>>4)%8],skill:55+(h%13)+j*20,wage:rate(s,specs[i].wage+j*125),fee:2500+j*1000};}
function member(s,i,j=0){const c=candidate(s,i,j);return {...c,duty:0,joined:s.day,end:s.day+182,next:s.day+7,weeks:0,hits:0,periodHits:0,periodWeeks:0,periodStart:s.day,grade:50,log:[],arrears:0,target:3};}
function read(s){if(!s.club)return null;const o=s.club.staffOffice||{members:{},cap:0,spent:0,from:s.day,debts:[],recommendations:[],approvals:[]};return {...o,recommendations:o.recommendations||[],approvals:o.approvals||[],members:Object.fromEntries(roles.flatMap((role,i)=>s.staff.includes(role)?[[i,o.members[i]||member(s,i)]]:[]))};}
const reportAreas={training:{title:'Training staff reports',roles:[0,3,4,5,6]},development:{title:'Player-development reports',roles:[7,15]},medical:{title:'Medical staff reports',roles:[1,6,8]},scouting:{title:'Scouting and recruitment reports',roles:[2,9,10,11,12,13,14]}};
function performance(m){if(m.lastReview==null)return {label:'Awaiting first review',tone:'info',score:null};const score=Number(m.grade)||0;return score>=120?{label:'Overperforming',tone:'high',score}:score>=100?{label:'On target',tone:'good',score}:score>=50?{label:'Needs support',tone:'warn',score}:{label:'Failing target',tone:'low',score};}
function reports(s,area,limit=6){const group=reportAreas[area];if(!s.club||!group)return [];const o=read(s);return group.roles.flatMap(i=>{const m=o.members[i];if(!m)return [];return (m.log||[]).map(row=>({day:row.day,role:specs[i].name,staff:m.name,duty:specs[i].duties[m.duty]||specs[i].duties[0],text:row.text,success:!!row.success,player:row.player,performance:performance(m)}));}).sort((a,b)=>b.day-a.day).slice(0,limit);}
function reportPanel(s,area){const group=reportAreas[area];if(!group||!s.club)return '';const e=g.TLClubUI?.esc||String,o=read(s),team=group.roles.map(i=>({i,m:o.members[i],spec:specs[i]})).filter(x=>x.m);if(!team.length)return `<section class="org-agenda staff-destination-reports"><header><small>BACKROOM ACCOUNTABILITY</small><h3>${group.title}</h3></header><p class="staff-report-empty">No relevant staff appointed. Delegate the work in Staff; you remain responsible until then.</p><button data-life="go" data-v="staff">Open staff office</button></section>`;const work=reports(s,area,5),assigned=team.map(({i,m,spec})=>{const score=performance(m);return `<div class="staff-assignment"><b>${e(m.name)}</b><span>${e(spec.name)} · ${e(spec.duties[m.duty]||spec.duties[0])} · next report due ${e(date(m.next))}</span><em class="staff-rating staff-rating-${score.tone}">${e(score.label)}${score.score==null?'':' · '+score.score+'/120'}</em></div>`;}).join(''),items=work.map(r=>`<article class="staff-destination-report"><div><b>${e(r.staff)}</b><small>${e(r.role)} · ${e(r.duty)} · ${e(date(r.day))}</small><em class="staff-report-state ${r.success?'is-delivered':'needs-attention'}">${r.success?'Delivered':'Needs follow-up'}</em></div><p>${e(r.text)}</p></article>`).join('');return `<section class="org-agenda staff-destination-reports"><header><small>BACKROOM ACCOUNTABILITY</small><h3>${group.title}</h3><p>Named responsibility, latest completed work and the current review rating. Ratings inform your decisions; contracts remain under your control.</p></header><div class="staff-assignments">${assigned}</div><div class="staff-destination-log">${items||'<p class="staff-report-empty">No completed reports yet. The assigned staff member’s first update is due on the date shown in Staff.</p>'}</div><button data-life="go" data-v="staff">Review staff and assignments</button></section>`;}
function remove(s,o,i,m){if(m.arrears)o.debts.push({name:m.name,amount:m.arrears});delete o.members[i];s.staff=s.staff.filter(r=>r!==roles[i]);}
function act(s,cmd,v){if(!s.club)throw Error('Take charge of a club to manage staff.');const o=s.club.staffOffice=read(s),[a,b]=String(v).split('|'),i=Number(a),j=Number(b),check=(ok,msg)=>{if(!ok)throw Error(msg);};if(cmd==='staffBudget'){const cap=Number(a);check([0,250,750,1500,5000,10000].includes(cap),'Choose a scouting cap.');o.cap=cap;return;}check(Number.isInteger(i)&&specs[i],'Unknown staff role.');const m=o.members[i];if(cmd==='staffHire'){check(!m&&[0,1].includes(j),'This position is already filled or the candidate is unavailable.');const hire=member(s,i,j);check(s.fund>=hire.fee+hire.wage,'Keep the signing fee and one week of wages in club funds.');s.fund-=hire.fee;s.staff.push(roles[i]);o.members[i]=hire;return;}check(m,'This position is vacant.');if(cmd==='staffDuty'){check(Number.isInteger(j)&&specs[i].duties[j],'Unknown responsibility.');m.duty=j;}else if(cmd==='staffTarget'){const n=Number(b);check([2,3,4].includes(n),'Choose a target of two, three or four productive assignments a month.');m.target=n;}else if(cmd==='staffRaise'){check(m.ask&&s.fund>=m.ask,'No affordable salary request is pending.');m.wage=m.ask;delete m.ask;m.review=s.day;}else if(cmd==='staffRenew'){check(m.end-s.day<=42,'Renewals open in the final six weeks.');m.end+=182;}else if(cmd==='staffDismiss'){check(s.fund>=m.wage,'One week of severance is required.');s.fund-=m.wage;remove(s,o,i,m);}else throw Error('Unknown personnel decision.');}
function squad(s,pool){return pool.filter(p=>s.roster.includes(p.id));}
function report(o,p,m,kind,s){const existing=o.recommendations.find(x=>x.id===p.id&&x.status!=='declined'&&x.status!=='signed');if(existing){existing.seenBy=[...new Set([...(existing.seenBy||[]),m.name])];return existing;}const val=Math.max(500,p.value||10000),r={id:p.id,name:p.name,pos:p.pos,age:p.age,nation:p.nation,club:p.club||'Free agent',scout:m.name,day:s.day,kind,grade:null,status:'new',fee:Math.max(0,Math.round(val/100)*100),wage:rate(s,Math.max(80,Math.round(val/1000))),seenBy:[m.name]};o.recommendations.unshift(r);o.recommendations=o.recommendations.slice(0,40);((s.fieldNotes||={})[p.nation]||=[]).push(p.id);s.fieldNotes[p.nation]=[...new Set(s.fieldNotes[p.nation])];return r;}
function tacticalWork(s,team,m,kind){const B=g.TLMatchBoard,Z=g.TLZones;if(!B||!Z||!team.length)return null;const plan=B.active(s),sheet=B.sheet(s.tactic,plan,team);let n=0;for(const slot of sheet.slots){const p=slot.player,defensive=['GK','CB','LB','RB','LWB','RWB','DM'].includes(slot.position);if(!p||kind==='keeper'&&p.pos!=='GK'||kind==='development'&&p.age>23||kind==='tactics'&&m.duty===1&&!defensive)continue;const row=(s.boardReps||={})[p.id]||((s.boardReps||={})[p.id]={});const keys=kind==='tactics'?[slot.job[0],slot.scheme,'zone:'+slot.position]:[slot.job[0],slot.scheme];for(const key of keys)if(key)row[key]=Math.min(20,(row[key]||0)+1);n++;}return n?`${m.name} rehearsed ${m.duty&&kind==='tactics'?'the defensive unit':kind==='keeper'?'goalkeeper roles':s.tactic} with ${n} players.`:null;}
function coachWork(s,pool,m,i){const team=squad(s,pool),spec=specs[i],duty=m.duty;let text;
 if(i===0){const choices=team.filter(p=>p.age<=23===!!duty).map(p=>({p,v:R.state(s,p)})).filter(x=>!x.v.knock&&x.v.sharp<100).sort((a,b)=>a.v.sharp-b.v.sharp);const t=choices[0];if(t){t.v.sharp=Math.min(100,t.v.sharp+(m.skill>=75?5:3));s.dressing=R.room(s);s.dressing.people[t.p.id]=t.v;text=`${spec.duties[duty]} · ${t.p.name}: sharpness ${t.v.sharp}%.`;}}
 else if(i===1){const choices=team.map(p=>({p,v:R.state(s,p)})).filter(x=>duty?x.v.knock:x.v.fitness<100).sort((a,b)=>duty?a.v.fitness-b.v.fitness:a.v.fitness-b.v.fitness);const t=choices[0];if(t){if(duty)t.v.injuredUntil=Math.max(s.day,t.v.injuredUntil-1);else t.v.fitness=Math.min(100,t.v.fitness+(m.skill>=75?5:3));s.dressing=R.room(s);s.dressing.people[t.p.id]=t.v;text=`${spec.duties[duty]} · ${t.p.name}: ${duty?'recovery brought forward one day':'condition '+t.v.fitness+'%'}.`;}}
 else if(['coach','tactics'].includes(spec.task)){text=tacticalWork(s,team,m,spec.task);if(text&&spec.task==='coach')for(const p of team){const v=R.state(s,p);if(!v.knock&&v.sharp<99){v.sharp=Math.min(100,v.sharp+(m.skill>=75?2:1));(s.dressing=R.room(s)).people[p.id]=v;}}}
 else if(spec.task==='keeper'){const gks=team.filter(p=>p.pos==='GK'&&(duty?p.age<=23:true)).map(p=>({p,v:R.state(s,p)})).filter(x=>!x.v.knock&&x.v.sharp<100).sort((a,b)=>a.v.sharp-b.v.sharp);const t=gks[0];if(t){t.v.sharp=Math.min(100,t.v.sharp+(m.skill>=75?6:4));(s.dressing=R.room(s)).people[t.p.id]=t.v;text=`${spec.duties[duty]} · ${t.p.name} to ${t.v.sharp}% sharpness.`;}}
 else if(spec.task==='fitness'||spec.task==='science'){if(spec.task==='science'&&duty===0){const t=team.map(p=>({p,v:R.state(s,p)})).filter(x=>x.v.knock).sort((a,b)=>a.v.injuredUntil-b.v.injuredUntil)[0];if(t){t.v.injuredUntil=Math.max(s.day,t.v.injuredUntil-1);(s.dressing=R.room(s)).people[t.p.id]=t.v;text=`Injury prevention review · ${t.p.name}’s return brought forward one day.`;}}else{const candidates=team.map(p=>({p,v:R.state(s,p)})).filter(x=>!x.v.knock&&x.v.fitness<100).sort((a,b)=>a.v.fitness-b.v.fitness),t=candidates[0];if(t){t.v.fitness=Math.min(100,t.v.fitness+(m.skill>=75?5:3));if(spec.task==='science')t.v.sharp=Math.max(0,t.v.sharp-1);(s.dressing=R.room(s)).people[t.p.id]=t.v;text=`${spec.duties[duty]} · ${t.p.name} to ${t.v.fitness}% condition.`;}}}
 else if(spec.task==='development'||spec.task==='academy'){
   const players=team.filter(p=>p.age<=23&&(spec.task==='academy'?p.age<=18:true)).map(p=>({p,v:R.state(s,p)})).filter(x=>!x.v.knock).sort((a,b)=>(a.p.age-b.p.age)||((s.staffGrowth?.[a.p.id]?.sessions||0)-(s.staffGrowth?.[b.p.id]?.sessions||0)));
   const t=players[0];if(t){const progress=(s.staffGrowth||={})[t.p.id]||((s.staffGrowth||={})[t.p.id]={sessions:0,points:0,history:[]});progress.sessions++;progress.points++;const groups=duty===0?['corners','crossing','dribbling','finishing','firstTouch','freeKicks','passing','tackling','technique']:['acceleration','agility','balance','jumpingReach','naturalFitness','pace','stamina','strength'],ratings=Mind.read(t.p).ratings,key=groups.map(k=>[k,Number(t.p.attrs?.[k]??ratings[k]??0)]).filter(([,value])=>value<20).sort((a,b)=>a[1]-b[1])[0]?.[0];let grown='';if(progress.points>=4&&key){const g=(s.playerGrowth||={})[t.p.id]||((s.playerGrowth||={})[t.p.id]={attrs:{},log:[]});g.attrs[key]=(g.attrs[key]||0)+1;g.log||=[];g.log.unshift({day:s.day,staff:m.name,attribute:key,delta:1,source:spec.name});g.log=g.log.slice(0,12);progress.points=0;grown=` · ${key} +1 after a four-week block`;}text=`${spec.duties[duty]} · ${t.p.name}: development session ${progress.sessions}${grown}.`;}}
 return text||`${spec.duties[duty]} · no eligible player this week; work reviewed.`;
}
function scoutWork(s,pool,m,o,i){const fee=F.rate(s,s.profile.nation,100),used=new Set(o.recommendations.filter(x=>x.status!=='declined'&&x.status!=='signed').map(x=>x.id)),duty=specs[i].duties[m.duty].toLowerCase(),matchesDuty=p=>i===2&&m.duty===1?p.pos==='GK':i===2?p.age<=23:specs[i].task==='academy'||duty.includes('under-21')||duty.includes('youth')?p.age<=21:duty.includes('value')?(!p.club||(p.value||0)<60000):true;let targets=pool.filter(p=>!s.roster.includes(p.id)&&!used.has(p.id)&&p.nation===s.profile.nation&&(i===2?!p.club:true)&&matchesDuty(p));
 if(fee>o.cap-o.spent||fee>s.fund)return `Field visit blocked · budget is ${cash(Math.max(0,o.cap-o.spent))} remaining; visit costs ${cash(fee)}.`;
 if(!targets.length)targets=pool.filter(p=>!s.roster.includes(p.id)&&!used.has(p.id)&&p.nation===s.profile.nation&&(!p.club||p.club!==s.club.name)&&matchesDuty(p));
 if(!targets.length)return 'Search complete · no new eligible player in this assignment.';
 targets.sort((a,b)=>(D.ROLE_WEIGHTS[b.pos]?.(b.attrs)||0)-(D.ROLE_WEIGHTS[a.pos]?.(a.attrs)||0)||a.age-b.age);
 const seen=targets.slice(0,m.skill>=75?5:2),p=seen[(D.seedFor(m.name+s.day)>>>0)%seen.length];s.fund-=fee;o.spent+=fee;const r=report(o,p,m,'staff scouting',s);return {text:`Filed ${m.skill>=75?'a '+seen.length+'-player shortlist':'a player report'} on ${p.name} · ${cash(fee)} fieldwork.`,player:p.id};
}
function doWork(s,pool,o,i,m){const spec=specs[i];if(spec.task==='scout')return scoutWork(s,pool,m,o,i);if(['coach','tactics','keeper','fitness','science','development','academy'].includes(spec.task))return coachWork(s,pool,m,i);if(spec.task==='analysis'&&i===14){const team=squad(s,pool),work=team.map(p=>s.dressing?.workload?.[p.id]||{}),minutes=work.reduce((n,x)=>n+(x.minutes||0),0),sessions=work.reduce((n,x)=>n+(x.sessions||0),0),snap=R.snapshot(s,team).players,fitness=team.length?Math.round(team.reduce((n,p)=>n+(snap[p.id]?.fitness||0),0)/team.length):0;const briefing={day:s.day,staff:m.name,minutes,sessions,fitness,summary:`First-team review: ${minutes} squad minutes logged, ${sessions} training sessions and ${fitness}% average condition.`};(s.staffBriefings||=[]).unshift(briefing);s.staffBriefings.length=Math.min(20,s.staffBriefings.length);return briefing.summary;}
 if(spec.task==='analysis'){
 const r=o.recommendations.find(x=>x.status==='new'||x.grade==null);if(r){const p=pool.find(x=>x.id===r.id);if(p){const weights=D.ROLE_WEIGHTS[p.pos],ability=weights?Math.round(100*weights(p.attrs)/weights(new Proxy({}, {get:()=>1}))):50;r.grade=clip(Math.round((ability*.55+(m.skill*.45))+(D.seedFor(p.id+m.name)%13)-6),1,99);r.analysis=m.name;r.analyzed=s.day;r.status='assessed';return `Evaluated ${p.name}: ${r.grade}/100 football fit, ${cash(r.fee+4*r.wage)} estimated first-year commitment.`;}}
 return 'No new scouting report to assess; monitoring the recruitment shortlist.';}
 if(spec.task==='director'||spec.task==='negotiator'){
   if(spec.task==='negotiator'&&m.duty===1){const deals=Object.entries(s.contracts||{}).map(([id,c])=>({id,c,p:pool.find(x=>x.id===id)})).filter(x=>x.p&&s.roster.includes(x.id)&&x.c.end-s.day<=120).sort((a,b)=>a.c.end-b.c.end);const x=deals[0];if(x){const text=`Renewal brief: ${x.p.name} · contract expires ${date(x.c.end)} · current wage ${cash(x.c.wage||0)}.`;(s.staffBriefings||=[]).unshift({day:s.day,staff:m.name,player:x.id,summary:text});return text;}return 'No first-team contracts enter the renewal window this week.';}
   const r=o.recommendations.find(x=>x.status==='assessed'&&(spec.task!=='director'||m.duty===0||x.age<=21)&&!o.approvals.some(a=>a.id===x.id&&['pending','offer submitted'].includes(a.status)));
   if(r){r.status='terms prepared';const approval={id:r.id,name:r.name,pos:r.pos,day:s.day,preparedBy:m.name,grade:r.grade,fee:r.fee,wage:r.wage,status:'pending',role:spec.name};o.approvals.unshift(approval);return `${m.name} prepared a ${cash(r.fee)} transfer and ${cash(r.wage)}/week contract for ${r.name}. Manager signature required.`;}
   return 'Recruitment desk reviewed; waiting for an assessed scout recommendation.';}
 return `${spec.duties[m.duty]} · weekly report filed.`;
}
function approve(s,id,pool){const o=s.club?.staffOffice&&read(s);if(!o)throw Error('No staff office is active.');const a=o.approvals.find(x=>x.id===id&&x.status==='pending'),p=pool.find(x=>x.id===id);if(!a||!p)throw Error('This staff proposal is no longer available.');if(!s.staff.includes('Director of football')&&!s.staff.includes('Contract negotiator'))throw Error('Hire a director of football or contract negotiator to prepare a signing proposal.');const known=(g.TLFieldwork||require('./scouting-travel')).known(s,p);if(!known)throw Error('The scout report has not completed fieldwork on this player yet.');if(p.club)(g.TLMarket||require('./transfer-market')).order(s,p,pool,'buy');else (g.TLContracts||require('./player-contracts')).offer(s,p,'standard');a.status='offer submitted';a.approved=s.day;a.signature=s.profile.name;const r=o.recommendations.find(x=>x.id===id);if(r)r.status='offer submitted';return;}
function finishDeal(s,id){const o=s.club?.staffOffice;if(!o)return;const a=o.approvals?.find(x=>x.id===id&&x.status==='offer submitted');if(!a)return;const signed=s.roster.includes(id)&&s.contracts?.[id];a.status=signed?'signed':'failed';a.completed=s.day;const r=o.recommendations?.find(x=>x.id===id);if(r)r.status=signed?'signed':'deal fell through';if(signed)s.mail.unshift({day:s.day,from:'Club secretary',topic:'staff',text:`Staff proposal completed: ${a.name} joined after your signature. ${a.preparedBy} prepared the deal.`});}
function morning(s,pool){if(!s.club||(!s.staff?.length&&!s.club.staffOffice))return;const o=s.club.staffOffice=read(s);if(s.day-o.from>=28){o.from=s.day;o.spent=0;}for(const d of o.debts){const pay=Math.min(Math.max(0,s.fund),d.amount);s.fund-=pay;d.amount-=pay;}o.debts=o.debts.filter(d=>d.amount);
 for(const [k,m] of Object.entries(o.members)){const i=+k,spec=specs[i];if(s.day>=m.next){m.next+=7;m.arrears+=m.wage;const pay=Math.min(m.arrears,Math.max(0,s.fund));s.fund-=pay;m.arrears-=pay;m.weeks++;m.periodWeeks=(m.periodWeeks||0)+1;let text='Payroll shortfall · assignment paused',success=false,player=null;if(!m.arrears){const result=doWork(s,pool,o,i,m);text=typeof result==='string'?result:result.text;player=typeof result==='string'?null:result.player;success=!/paused|no eligible|no new eligible|waiting for|no new scouting/i.test(text);if(success){m.hits++;m.periodHits=(m.periodHits||0)+1;}}
  m.log.unshift({day:s.day,text,success,player});m.log.length=Math.min(16,m.log.length);
  if(s.day-(m.periodStart??m.joined)>=28){m.grade=clip(Math.round(100*(m.periodHits||0)/Math.max(1,m.target||3)),0,120);m.lastReview=s.day;m.lastTarget=m.target;m.reviewResult=performance(m).label;if((m.periodHits||0)<(m.target||3))s.mail.unshift({day:s.day,from:'Club secretary',topic:'staff',text:`${m.name} completed ${m.periodHits||0} of ${m.target||3} assigned weekly tasks. Review the work log and rating in Staff; you decide whether to support, reassign, renew or dismiss.`});m.periodHits=0;m.periodWeeks=0;m.periodStart=s.day;}
  if(!m.ask&&m.hits>=3&&s.day-(m.review??m.joined)>=28){m.ask=Math.ceil(m.wage*1.12);s.mail.unshift({day:s.day,from:m.name,topic:'staff',text:`I’d like to discuss a weekly wage of ${cash(m.ask)}. My work record is in Staff.`});}
 }
 if(s.day===m.end-28)s.mail.unshift({day:s.day,from:'Club secretary',text:`${m.name} has four weeks left. Renew the ${spec.name} contract in Staff.`});if(s.day>=m.end){remove(s,o,i,m);s.mail.unshift({day:s.day,from:'Club secretary',text:`${m.name} completed their contract. The ${spec.name} position is now open.`});}}
}
function tagFor(rating){return rating.score==null?'':rating.tone==='high'||rating.tone==='good'?'good':rating.tone==='low'?'bad':'info';}
function render(s,tab='overview',focus=null,roleFocus=null){
  const e=g.TLClubUI.esc,art=g.TLClubUI.art;
  const btn=(cmd,v,label,disabled=false,klass='')=>`<button class="${klass}" data-life="${cmd}" data-v="${e(v)}" ${disabled?'disabled':''}>${label}</button>`;
  if(!s.club)return `<section class="personnel"><header><small>FOOTBALL OPERATIONS</small><h2>Build a backroom team</h2></header><p>Take charge of a club to hire coaches, medical staff, scouts and recruitment specialists. Appointments and fieldwork are paid from club funds, not your wallet.</p></section>`;
  const o=read(s);
  const team=Object.entries(o.members).map(([i,m])=>({i:+i,m,spec:specs[+i]})).sort((a,b)=>a.i-b.i);
  const roll=team.reduce((n,x)=>n+x.m.wage,0);
  const pending=o.approvals.filter(x=>x.status==='pending');
  const groups=[...new Set(specs.map(x=>x.group))];
  const budgetSpent=o.spent||0;
  const owed=team.reduce((n,x)=>n+(x.m.arrears||0),0);
  const payAsks=team.filter(x=>x.m.ask);
  const ending=team.filter(x=>x.m.end-s.day<=42);
  const debts=o.debts.reduce((n,d)=>n+d.amount,0);
  const vacancies=specs.filter((x,i)=>!o.members[i]);
  const view=['overview','people','recruitment','reports'].includes(tab)?tab:'overview';

  const dept=(name)=>groups.includes(name)?name:null;
  function tag(rating){const tone=tagFor(rating);return `<span class="dv-tag${tone?' '+tone:''}">${e(rating.label)}${rating.score==null?'':' · '+rating.score+'/120'}</span>`;}

  const tabs=[['overview','Overview',''],['people','People',team.length+' appointed'],['recruitment','Recruitment',pending.length?pending.length+' to sign':(vacancies.length?vacancies.length+' open':'')],['reports','Reports','']];
  const nav=`<nav class="st-nav" aria-label="Staff views">${tabs.map(([id,label,note])=>`<button type="button" data-staff-tab="${id}" aria-pressed="${id===view}">${label}${note?`<small>${e(note)}</small>`:''}</button>`).join('')}</nav>`;

  const hero=`<header class="staff-hero">${art('training')}<div><small>FOOTBALL OPERATIONS · ${e(s.club.name)}</small><h2>Backroom &amp; recruitment</h2><p>${team.length} of ${roles.length} positions filled · ${cash(roll)}/week payroll · ${cash(s.fund)} in club funds</p></div></header>`;

  function scoreboard(){
    const tiles=[
      ['Appointments',`${team.length} / ${roles.length}`,team.length?'':'No staff appointed yet'],
      ['Weekly payroll',cash(roll),owed?cash(owed)+' unpaid':'Paid up to date'],
      ['Scouting spend',`${cash(budgetSpent)} / ${cash(o.cap)}`,`28-day cap · resets ${date(o.from+28)}`],
      ['Awaiting signature',String(pending.length),pending.length?'Staff proposals need you':'Nothing to sign']
    ];
    return `<div class="st-kpis">${tiles.map(([label,value,note])=>`<div><small>${e(label)}</small><b>${e(value)}</b><em>${e(note)}</em></div>`).join('')}</div>`;
  }

  function needs(){
    const rows=[];
    if(pending.length)rows.push([`${pending.length} ${pending.length===1?'staff proposal waits':'staff proposals wait'} for your signature`,'recruitment','Review']);
    if(owed)rows.push([`${cash(owed)} of staff wages is unpaid`,'people','Open']);
    if(payAsks.length)rows.push([`${payAsks.length} pay ${payAsks.length===1?'review':'reviews'} requested`,'people','Open']);
    if(ending.length)rows.push([`${ending.length} staff ${ending.length===1?'contract ends':'contracts end'} within six weeks`,'people','Open']);
    if(!team.length)rows.push(['No staff appointed. Every backroom task is yours this week','recruitment','Hire']);
    if(!rows.length)return `<article class="st-panel"><h3>Nothing needs you</h3><p class="cp-muted">No signature, wage or contract decision is waiting in the backroom. Work continues weekly on the assignments below.</p></article>`;
    return `<article class="st-panel"><small>NEEDS YOU</small><div class="st-needs">${rows.map(([text,go,label])=>`<div><p>${e(text)}</p><button type="button" data-staff-tab="${go}">${label}</button></div>`).join('')}</div></article>`;
  }

  function departments(){
    return `<article class="st-panel"><small>DEPARTMENTS</small><div class="st-depts">${groups.map(name=>{
      const all=specs.map((x,i)=>({x,i})).filter(y=>y.x.group===name);
      const filled=all.filter(y=>o.members[y.i]);
      const wage=filled.reduce((n,y)=>n+o.members[y.i].wage,0);
      const open=all.length-filled.length;
      return `<div class="st-dept"><div role="presentation"><b>${e(name)}</b><small>${filled.length} of ${all.length} appointed${open?' · '+open+' open':''} · ${cash(wage)}/week</small></div><button type="button" data-staff-tab="${open?'recruitment':'people'}">${open?'Hire':'Open'}</button></div>`;
    }).join('')}</div></article>`;
  }

  function delegation(){
    return `<article class="st-panel st-how"><small>DELEGATION AND BUDGET</small><p class="cp-muted">Each specialist delivers one named responsibility a week and the monthly rating compares completed work with your target: 100 is the target met, above 100 is overperformance, 50 to 99 needs support, below 50 is failing. No fixed three-person cap applies; appoint as many specialists as the budget allows.</p><form data-staff-cap><label>Scouting and fieldwork budget<select name="cap">${[0,250,750,1500,5000,10000].map(n=>`<option value="${n}" ${n===o.cap?'selected':''}>${n?cash(n)+' per 28 days':'Pause paid fieldwork'}</option>`).join('')}</select></label><button>Update cap</button></form></article>`;
  }

  function peopleView(){
    if(!team.length)return `<article class="st-panel"><h3>No staff appointed</h3><p class="cp-muted">Hire a coach, a physio or a scout and their weekly work starts on the next review.</p><button type="button" data-staff-tab="recruitment">Open recruitment</button></article>`;
    const chosen=team.find(x=>x.i===Number(focus))||team[0];
    const roster=`<article class="st-panel"><small>APPOINTMENTS · ${team.length}</small><p class="cp-muted">Pick a member to set the weekly responsibility, the monthly target and the contract decision.</p><div class="st-roster">${team.map(({i,m,spec})=>{const rating=performance(m);return `<button type="button" class="st-roster-row${i===chosen.i?' is-on':''}" data-staff-focus="${i}" aria-pressed="${i===chosen.i}"><span class="st-mark">${e(spec.mark)}</span><span><b>${e(m.name)}</b><small>${e(spec.name)} · ${cash(m.wage)}/week</small></span><span class="dv-tag${tagFor(rating)?' '+tagFor(rating):''}">${e(rating.label)}</span></button>`;}).join('')}</div></article>`;
    const {i,m,spec}=chosen,rating=performance(m),target=m.target||3,period=m.periodHits||0,progress=Math.min(100,Math.round(period/target*100));
    const panel=`<article class="st-panel"><small>${e(spec.group.toUpperCase())} · ${e(spec.name.toUpperCase())}</small><div class="st-person st-person-focus"><header><span class="st-mark">${e(spec.mark)}</span><div><b>${e(m.name)}</b><small>${cash(m.wage)}/week · contract to ${e(date(m.end))}${m.arrears?' · '+cash(m.arrears)+' owed':''}</small></div>${tag(rating)}</header>
      <label class="st-field">Weekly responsibility<select data-staff-duty="${i}">${spec.duties.map((d,j)=>`<option value="${j}" ${m.duty===j?'selected':''}>${e(d)}</option>`).join('')}</select></label>
      <div class="st-target"><span>MONTHLY TARGET · ${period} of ${target} completed this month</span><i><b style="width:${progress}%"></b></i><label>Set target<select data-staff-target="${i}">${[2,3,4].map(n=>`<option value="${n}" ${n===target?'selected':''}>${n} a month</option>`).join('')}</select></label></div>
      <p class="st-latest"><small>LATEST WORK · ${e(date(m.log[0]?.day||m.next))}</small>${e(m.log[0]?.text||'Assignment begins '+date(m.next)+'.')}</p>
      <p class="cp-muted">${m.hits} productive weeks in ${m.weeks} paid · next assignment ${e(date(m.next))} · renewal window opens ${e(date(m.end-42))}</p>
      <div class="st-actions">${m.ask?btn('staffRaise',i,'Approve pay rise · '+cash(m.ask),s.fund<m.ask):''}${m.end-s.day<=42?btn('staffRenew',i,'Renew 26 weeks'):''}${btn('staffDismiss',i,'Dismiss · '+cash(m.wage)+' severance',s.fund<m.wage,'staff-dismiss')}<button type="button" data-staff-tab="reports">Open the work log</button></div></div></article>`;
    return roster+panel;
  }

  function recruitmentView(){
    const approvals=pending.length?`<article class="st-panel"><small>MANAGER SIGNATURE REQUIRED</small><div class="st-approvals">${pending.slice(0,8).map(a=>`<div class="st-approval"><div><b>${e(a.name)}</b><small>${e(a.pos)} · ${e(a.role)} · fit ${a.grade}/100 · prepared ${e(date(a.day))} by ${e(a.preparedBy)}</small></div><span>${cash(a.fee)} fee + ${cash(a.wage)}/week</span>${btn('staffApprove',a.id,'Review and sign',s.fund<a.fee+4*a.wage,'staff-sign')}</div>`).join('')}</div></article>`:'';
    const open=o.recommendations.filter(r=>!pending.some(a=>a.id===r.id));
    const recs=open.length?`<article class="st-panel"><small>SCOUTING, ANALYSIS, NEGOTIATION</small><div class="st-reports">${open.slice(0,6).map(r=>`<div class="st-report"><div><b>${e(r.name)}</b><small>${e(r.pos)} · ${e(r.age)} · ${e(r.club)} · ${e(r.scout)} · ${e(date(r.day))}</small></div><span>${r.grade==null?'Awaiting analysis':r.grade+'/100'}</span><p>${cash(r.fee)} fee · ${cash(r.wage)}/week · ${cash(r.fee+4*r.wage)} first-year commitment${r.status==='offer submitted'?' · offer in progress':''}</p><button data-league-player="${e(r.id)}">Open player file</button></div>`).join('')}</div></article>`:pending.length?'<article class="st-panel"><h3>No report waiting for analysis</h3><p class="cp-muted">The scouting work behind the proposals above is already prepared. Sign or dismiss a proposal to free the desk for the next report.</p></article>':'<article class="st-panel"><h3>No scouting reports yet</h3><p class="cp-muted">Hire a scout, set a fieldwork budget above zero and Continue through a weekly review.</p></article>';
    const pool=vacancies.length?(()=>{
      const chosen=specs.findIndex((spec,i)=>i===roleFocus&&!o.members[i])>=0?Number(roleFocus):specs.findIndex((spec,i)=>!o.members[i]);
      const list=`<div class="st-roster">${groups.map(name=>{
        const openRoles=specs.map((spec,i)=>({spec,i})).filter(x=>x.spec.group===name&&!o.members[x.i]);
        if(!openRoles.length)return '';
        return `<small class="st-roster-group">${e(name)}</small>${openRoles.map(({spec,i})=>`<button type="button" class="st-roster-row${i===chosen?' is-on':''}" data-staff-role="${i}" aria-pressed="${i===chosen}"><span class="st-mark">${e(spec.mark)}</span><span><b>${e(spec.name)}</b><small>${e(spec.group)} · ${cash(spec.wage)}/week guide</small></span><span class="dv-tag">Open</span></button>`).join('')}`;
      }).join('')}</div>`;
      const spec=specs[chosen],cs=[0,1].map(j=>candidate(s,chosen,j));
      const panel=`<article class="st-panel"><small>${e(spec.group.toUpperCase())} · HIRING</small><div class="st-person st-person-focus"><header><span class="st-mark">${e(spec.mark)}</span><div><b>${e(spec.name)}</b><small>${e(spec.duties.join(' · '))}</small></div></header>
      <p class="cp-muted">Two candidates are available for this position. The signing fee is paid from club funds and the wage is paid weekly from the same account. Any number of appointments can be made; there is no fixed three-person cap.</p>
      <div class="st-cands">${cs.map((c,j)=>`<div class="st-cand"><div><b>${e(c.name)}</b><small>Specialist ability ${c.skill}/100 · ${cash(c.wage)}/week</small></div>${btn('staffHire',chosen+'|'+j,'Appoint · '+cash(c.fee),s.fund<c.fee+c.wage)}</div>`).join('')}</div></div></article>`;
      return `<article class="st-panel"><small>OPEN POSITIONS · ${vacancies.length}</small><p class="cp-muted">Pick a position to see the two candidates and the cost.</p>${list}</article>`+panel;
    })():'';
    return (approvals||'')+recs+pool;
  }

  function reportsView(){
    if(!team.length)return `<article class="st-panel"><h3>No reports yet</h3><p class="cp-muted">Appoint staff and their completed weekly work is logged here.</p><button type="button" data-staff-tab="recruitment">Open recruitment</button></article>`;
    return `<article class="st-panel"><small>WEEKLY WORK LOG</small><p class="cp-muted">Every appointment reports weekly. The latest delivery is shown for each; open a name for the earlier ones and the review rating.</p>${team.map(({i,m,spec})=>{
      const rating=performance(m),log=(m.log||[]);
      const line=(x)=>`<div class="st-log"><time>${e(date(x.day))}</time><p>${e(x.text)}</p><span class="dv-tag${x.success?' good':' info'}">${x.success?'Delivered':'Needs follow-up'}</span></div>`;
      return `<section class="st-report-panel"><header><div><b>${e(m.name)}</b><small>${e(spec.name)} · ${e(spec.duties[m.duty])} · next assignment ${e(date(m.next))}</small></div>${tag(rating)}</header>${log.length?line(log[0]):`<p class="cp-muted">No completed assignment yet. The first report is due ${e(date(m.next))}.</p>`}${log.length>1?`<details class="st-more" open><summary>Earlier reports · showing 2 of ${log.length-1}</summary>${log.slice(1,3).map(line).join('')}</details>`:''}</section>`;
    }).join('')}</article>`;
  }

  const body=view==='people'?peopleView():view==='recruitment'?recruitmentView():view==='reports'?reportsView():`${scoreboard()}${needs()}${departments()}${delegation()}`;
  return `<section class="personnel staff-office staff-split">${hero}${nav}${body}${debts?`<aside class="staff-debts">Former staff payroll outstanding: ${cash(debts)}</aside>`:''}</section>`;
}
const api={read,act,morning,approve,finishDeal,render,performance,reports,reportPanel,roles,specs};g.TLStaffOffice=api;if(typeof module!=='undefined')module.exports=api;})(typeof window==='undefined'?globalThis:window);
