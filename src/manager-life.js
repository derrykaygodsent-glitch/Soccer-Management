/* Personal career ledger: decisions are resolved by the manager's calendar, not by opening a tab. */
(function(g){'use strict';
const D=g.TLData||require('./data.js');
const atlas=g.TLMeridian||require('./meridian.js');
const legacy={Ovela:['Loombridge Athletic','Mill End','Claybank','Willow Vale'],Nerava:['Lantern Quay','East Pier','Saltworks','Ferry Town'],Istren:['Cairn Bell','Stonebridge','Summit Vale','High Tor']};
const meridian=Object.fromEntries(atlas.countries.map(c=>[c.name,c.places.map(p=>p.club.name)]));
let nations=meridian;
const careers={'Unemployed':80,'Former footballer':500,'Corporate official':900,'Community coach':240};
const faces=['Round','Oval','Square'],skins=['Light','Tan','Brown','Deep'],emblems=['★','◆','⚓','♜'];
const styles={'Balanced shape':'Keep support close and hold the team shape.','Win it high':'Close down early and attack before the defence settles.','Break into space':'Sit compact and release runners after winning the ball.','Keep the ball':'Offer short passes and wait for an opening.'};
const mentalities={Cautious:'Protect the space behind your midfield.',Balanced:'Choose when to commit players forward.',Positive:'Take calculated risks in the final third.',Attacking:'Commit more runners beyond the ball.'};
const jobs=['Assistant coach','Physio','Youth scout'];
const date=(day)=>new Date(Date.UTC(2026,9,26+day)).toISOString().slice(0,10);
function create(p,id){if(!p.name?.trim()||!Object.hasOwn(nations,p.nation)||!Object.hasOwn(careers,p.job)||!Number.isInteger(p.age)||p.age<18||p.age>90||!['Male','Female'].includes(p.gender)||!['Single','Married'].includes(p.marital)||!Array.isArray(p.children)||p.children.length>12||p.children.some(x=>!['Girl','Boy'].includes(x))||!faces.includes(p.face)||!skins.includes(p.skin)||!['found','apply'].includes(p.path))throw Error('Please complete your manager profile.');return {id,worldVersion:atlas.version,profile:{...p,name:p.name.trim().slice(0,48),children:p.marital==='Married'?p.children:[]},day:0,cash:careers[p.job],fund:0,club:null,draft:null,roster:[],staff:[],tactic:'4-4-2',plans:[],mail:[{day:0,from:'District office',text:'Welcome. Your club applications, scouting replies and FA letters arrive here.'}],applications:{},approached:{},interview:null,activity:'Settling in',trained:null};}
const makePool=nations=>Object.keys(nations).flatMap(nation=>[true,false].flatMap(local=>{const id=nation+(local?'-trials':'-first');return D.genSquad({id,rep:54},D.seedFor(id)).map(p=>({...p,nation,value:500+100*p.attrs.passing,local}));}));
let pool=makePool(nations);
function activate(s){const next=!s.worldVersion&&Object.hasOwn(legacy,s.profile.nation)?legacy:meridian;if(nations!==next){nations=next;pool=makePool(next);}}
const firstClub=n=>nations[n][0];
function table(n,day){const rows=nations[n].map(name=>({name,p:0,pts:0,gd:0})),round=3+Math.floor(day/7),pairs=[[[0,1],[2,3]],[[0,2],[1,3]],[[0,3],[1,2]]];if(rows.length===5){pairs.length=0;let ring=[0,1,2,3,4,-1];for(let k=0;k<5;k++){pairs.push([0,1,2].map(j=>[ring[j],ring[5-j]]).filter(pair=>!pair.includes(-1)));ring.splice(1,0,ring.pop());}}
for(let i=round-round%(pairs.length*2);i<round;i++)for(const [a,b] of pairs[i%pairs.length]){const r=D.mulberry32(D.seedFor(n+i+a)),diff=Math.floor(r()*4)-Math.floor(r()*4);for(const [j,d] of [[a,diff],[b,-diff]]){rows[j].p++;rows[j].gd+=d;rows[j].pts+=d>0?3:d===0?1:0;}}return rows.sort((a,b)=>b.pts-a.pts||b.gd-a.gd);}
function act(old,cmd,v){const s=JSON.parse(JSON.stringify(old)),p=s.profile,mail=(from,text)=>s.mail.unshift({day:s.day,from,text}),queue=(kind,id,days)=>s.plans.push({kind,id,due:s.day+days}),require=(ok,msg)=>{if(!ok)throw Error(msg);};
 const install=(name,owner)=>{s.club={name,owner,nick:owner?s.draft.nick:'The first team',emblem:owner?s.draft.emblem:'◆',board:owner?'Founding members':'Elected directors'};};
 switch(cmd){case 'advance':s.day++;break;
 case 'shift':case 'family':case 'date':require(!s.plans.some(x=>x.kind==='diary'),'You already have plans tomorrow.');if(cmd==='date'){require(s.cash>=20,'A night out costs 20.');s.cash-=20;}queue('diary',cmd,1);break;
 case 'deposit':require(s.cash>=100,'You need 100 personal funds.');s.cash-=100;s.fund+=100;break;
 case 'apply':require(!s.club&&!s.draft&&!s.interview&&!s.plans.some(x=>['application','decision'].includes(x.kind))&&Object.values(nations).some(xs=>xs[0]===v)&&(!s.applications[v]||s.applications[v]<=s.day),'This vacancy is not open to you right now.');s.applications[v]=s.day+14;queue('application',v,2);break;
 case 'answer':require(s.interview&&!s.club&&['academy','promotion','budget'].includes(v),'No open interview.');queue('decision',s.interview+'|'+v,1);s.interview=null;break;
 case 'register':require(!s.club&&!s.draft&&!s.plans.some(x=>['decision','application'].includes(x.kind))&&!s.interview&&v.name.trim()&&v.nick.trim()&&emblems.includes(v.emblem)&&s.fund>=200,'Choose a name, nickname and emblem, and reserve 200 club funds. Finish any open application first.');s.fund-=200;s.draft={name:v.name.trim().slice(0,48),nick:v.nick.trim().slice(0,32),emblem:v.emblem};queue('licence',s.draft.name,3);break;
 case 'shortlist':require(pool.some(x=>x.id===v),'Unknown player.');s.shortlist=s.shortlist||[];s.shortlist=s.shortlist.includes(v)?s.shortlist.filter(id=>id!==v):[...s.shortlist,v];break;
 case 'scout':{const target=pool.find(x=>x.id===v);require(target?.local&&!s.approached[v]&&!s.roster.includes(v),'Player is not available.');const fare=target.nation===p.nation?0:p.job==='Former footballer'?30:120;require(s.cash>=fare,'Not enough travel money.');s.cash-=fare;s.approached[v]=true;queue('reply',v,2);break;}
 case 'hire':require(s.club&&jobs.includes(v)&&!s.staff.includes(v)&&s.fund>=100,'A registered club and 100 club funds are required.');s.fund-=100;s.staff.push(v);mail('Club secretary',v+' joined the staff.');break;
 case 'train':require(s.roster.length&&!s.plans.some(x=>x.kind==='training'),'Recruit someone first, or finish the planned session.');queue('training','Team practice',1);break;
 case 'style':require(Object.hasOwn(styles,v),'Unknown style.');s.style=v;break;
 case 'mentality':require(Object.hasOwn(mentalities,v),'Unknown mentality.');s.mentality=v;break;
 case 'tactic':require(Object.hasOwn(D.FORMATIONS,v),'Unknown formation.');s.tactic=v;break;
 default:throw Error('Unknown action.');}
 if(cmd==='advance'){for(const e of s.plans.filter(e=>e.due<=s.day)){const roll=D.seedFor(s.id+e.kind+e.id+s.day)%100;
 if(e.kind==='diary'){s.activity={shift:'Completed a paid shift (+100)',family:'Spent time with family and friends',date:'Went out on a date'}[e.id];if(e.id==='shift')s.cash+=100;}
 if(e.kind==='training'){s.trained=s.day;mail('Training ground','Team practice completed.');}
 if(e.kind==='application'){if(roll<(p.job==='Former footballer'||p.job==='Community coach'?85:45)){s.interview=e.id;mail(e.id,'Interview invitation: tell the board your first priority in Home.');}else mail(e.id,'Your application was unsuccessful. You can apply again in two weeks.');}
 if(e.kind==='decision'){const [name,answer]=e.id.split('|');if(roll<(answer==='budget'?80:answer==='academy'?65:45)){install(name,false);let nation=Object.keys(nations).find(n=>firstClub(n)===name);s.roster=[...new Set([...s.roster,...pool.filter(x=>x.nation===nation&&!x.local).map(x=>x.id)])];s.fund+=1200;mail(name,'You have been appointed manager. Your squad and club budget are ready.');}else mail(name,'The board appointed another candidate. Your career continues.');}
 if(e.kind==='licence'){if(Object.values(nations).flat().some(n=>n.toLowerCase()===s.draft.name.toLowerCase())){mail('National FA','That name is already registered. Your fee was refunded.');s.fund+=200;}else{install(s.draft.name,true);mail('National FA','Registration approved. You are recorded as the founder.');}s.draft=null;}
 if(e.kind==='reply'){const x=pool.find(x=>x.id===e.id);if(roll<65){s.roster.push(x.id);mail(x.name,'I accept your invitation. Count me in.');}else mail(x.name,'Thank you, but I will not join at this time.');}}
 s.plans=s.plans.filter(e=>e.due>s.day);}return s;}
const api={styles,mentalities,create,act,date,get nations(){return nations;},careers,get pool(){return pool;},activate,atlas,table,faces,skins,emblems,jobs};g.TLManagerLife=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
