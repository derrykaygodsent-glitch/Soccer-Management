/* Pitch depth grows towards the opponent; width is from our attacking left. */
(function(g){'use strict';
const D=g.TLData||require('./data'),Mind=g.TLPlayerMind||require('./player-intelligence');
function zone(x,y,keeper=false){if(keeper)return 'GK';const wide=y<.23||y>.77,left=y<.5;if(x<.225)return wide?(left?'LB':'RB'):'CB';if(x<.38)return wide?(left?'LWB':'RWB'):'DM';if(x<.54)return wide?(left?'ML':'MR'):'CM';if(wide)return left?'LW':'RW';return x<.665?'AM':x<.87?'CF':'ST';}
const families={GK:'GK',LB:'FB',RB:'FB',CB:'DC',LWB:'WB',RWB:'WB',DM:'DM',CM:'CM',ML:'W',MR:'W',AM:'AM',LW:'W',RW:'W',CF:'ST',ST:'ST'};
// Each behaviour has a skill fingerprint, attacking depth/width and preferred ball action.
const patterns={stop:['handling reflexes positioning',0,0,'pass'],sweep:['pace positioning reflexes',3,0,'pass'],build:['passing composure positioning',1,0,'pass'],clear:['tackling positioning aggression',-2,0,'clear'],screen:['positioning tackling composure',-3,0,'pass'],hunt:['workRate tackling aggression',2,0,'tackle'],cover:['pace positioning tackling',-4,0,'pass'],wide:['pace dribbling passing',2,4,'carry'],inside:['dribbling pace shooting',3,-5,'carry'],invert:['passing positioning tackling',1,-6,'pass'],create:['passing composure dribbling',0,-2,'pass'],link:['passing composure positioning',-4,0,'pass'],run:['stamina workRate pace',4,1,'carry'],finish:['shooting pace composure',5,0,'shot'],target:['positioning composure passing',-2,1,'pass'],channel:['dribbling passing workRate',2,3,'pass']};
const lists={GK:'Goalkeeper:stop|Sweeper Keeper:sweep|Ball-Playing Goalkeeper:build',DC:'Centre-Back:screen|Ball-Playing Defender:build|No-Nonsense Centre-Back:clear|Libero:invert|Stopper:hunt|Cover Defender:cover|Wide Centre-Back:channel',FB:'Full-Back:cover|Wing-Back:wide|Complete Wing-Back:run|Inverted Wing-Back:invert|Inverted Full-Back:screen|No-Nonsense Full-Back:clear',DM:'Defensive Midfielder:screen|Anchor:cover|Half-Back:link|Deep-Lying Playmaker:build|Segundo Volante:run|Regista:create|Ball-Winning Midfielder:hunt',CM:'Central Midfielder:build|Box-to-Box Midfielder:run|Mezzala:channel|Carrilero:wide|Advanced Playmaker:create|Roaming Playmaker:channel|Ball-Winning Midfielder:hunt',AM:'Attacking Midfielder:create|Shadow Striker:finish|Trequartista:channel|Enganche:link|Advanced Playmaker:create',WM:'Wide Midfielder:channel|Wide Playmaker:create|Winger:wide|Defensive Winger:hunt',W:'Winger:wide|Inside Forward:finish|Inverted Winger:inside|Advanced Winger:run|Raumdeuter:inside|Wide Target Forward:target',ST:'Striker:finish|Advanced Forward:run|Complete Forward:create|Deep-Lying Forward:link|Target Forward:target|Poacher:finish|Pressing Forward:hunt|False Nine:link|Trequartista:channel|Defensive Forward:hunt'};
lists.WB=lists.FB;const profiles={},roles={};for(const [k,list] of Object.entries(lists))roles[k]=list.split('|').map(pair=>{const [name,key]=pair.split(':');profiles[name]=patterns[key];return name;});
// Attack depth / lateral movement (metres), pressure on loss, ball preference and allowed duties.
// Positive width holds the touchline; negative width attacks the inside channel.
const jobs=Object.fromEntries(`Goalkeeper|0|0|0|short|D
Sweeper Keeper|3|0|0|through|DSA
Ball-Playing Goalkeeper|1|0|0|short|DS
Centre-Back|0|0|.02|short|D
Ball-Playing Defender|1|0|.02|through|D
No-Nonsense Centre-Back|-2|0|.03|clear|D
Libero|6|-2|.04|progress|DS
Stopper|1|0|.18|clear|D
Cover Defender|-4|0|0|short|D
Wide Centre-Back|2|4|.05|progress|DSA
Full-Back|1|2|.05|short|DSA
Wing-Back|4|5|.07|cross|DSA
Complete Wing-Back|6|4|.08|carry|SA
Inverted Wing-Back|4|-6|.07|through|DSA
Inverted Full-Back|0|-5|.03|short|D
No-Nonsense Full-Back|-2|2|.04|clear|D
Defensive Midfielder|0|0|.08|short|DS
Anchor|-3|0|0|short|D
Half-Back|-6|0|.02|progress|D
Deep-Lying Playmaker|-2|0|.04|through|DS
Segundo Volante|6|1|.09|shot|SA
Regista|1|2|.05|through|S
Ball-Winning Midfielder|0|0|.23|short|DS
Central Midfielder|1|0|.07|progress|DSA
Box-to-Box Midfielder|5|0|.14|carry|S
Mezzala|4|4|.05|through|SA
Carrilero|0|5|.1|short|S
Advanced Playmaker|2|-1|.04|through|SA
Roaming Playmaker|3|3|.09|progress|S
Attacking Midfielder|3|0|.06|progress|SA
Shadow Striker|7|-1|.12|shot|A
Trequartista|2|3|0|through|A
Enganche|-1|0|0|through|S
Wide Midfielder|2|2|.1|short|DSA
Wide Playmaker|0|-4|.04|through|SA
Winger|3|6|.05|cross|SA
Defensive Winger|0|4|.19|cross|DS
Inside Forward|6|-7|.04|shot|SA
Inverted Winger|2|-5|.06|through|SA
Advanced Winger|6|5|.06|carry|A
Raumdeuter|7|-4|.02|shot|A
Wide Target Forward|1|3|.03|short|SA
Striker|4|0|.05|shot|SA
Advanced Forward|7|2|.06|carry|A
Complete Forward|3|1|.08|progress|SA
Deep-Lying Forward|-4|0|.06|short|SA
Target Forward|-1|0|.04|short|SA
Poacher|8|0|.01|shot|A
Pressing Forward|4|0|.22|shot|DSA
False Nine|-6|1|.07|through|S
Defensive Forward|0|0|.18|short|DS`.split('\n').map(s=>{const [name,x,y,hunt,action,ds]=s.split('|');return [name,{x:+x,y:+y,hunt:+hunt,action,duties:[...ds].map(c=>({S:'Support',D:'Defend',A:'Attack'})[c])}];}));
function identity(p){const h=D.seedFor(p.id+':foot'),foot=h%100<29?'Left':'Right',weak=1+D.seedFor(p.id+':other-foot')%5,side=D.seedFor(p.id+':side')%5===0?(foot==='Right'?'L':'R'):foot[0];const natural=({GK:'GK',DC:'CB',FB:side+'B',WB:side+'WB',DM:'DM',CM:'CM',AM:'AM',W:side+'W',ST:'CF'})[p.pos]||'CM';const alternatives=Object.keys(families).filter(z=>z!==natural&&D.roleFit(p.pos,families[z])>=.78).sort((a,b)=>D.seedFor(p.id+a)-D.seedFor(p.id+b)).slice(0,2);return {foot,weak,natural,alternatives};}
function familiarity(p,z,reps={}){const bio=identity(p),base=z===bio.natural?1:bio.alternatives.includes(z)?.86:Math.min(.76,D.roleFit(p.pos,families[z])*.86);return Math.min(1,base+(.008+.0006*Mind.personality(p).versatility)*Math.min(20,reps?.['zone:'+z]||0));}
function footFactor(p,z,job){const {foot,weak}=identity(p),side=({LB:'Left',LWB:'Left',ML:'Left',LW:'Left',RB:'Right',RWB:'Right',MR:'Right',RW:'Right'})[z];if(!side)return 1;const inverted=['Inside Forward','Inverted Winger','Inverted Wing-Back','Wide Playmaker'].includes(job);return (side===foot)!==inverted?1:1-(5-weak)*.035;}
function duty(job,value){const ds=jobs[job].duties;return ds.includes(value)?value:ds.includes('Support')?'Support':ds[0];}

function choices(z){return roles[['ML','MR'].includes(z)?'WM':families[z]];}
const detailedAttributes={'Advanced Forward':'acceleration pace finishing offTheBall anticipation composure','Deep-Lying Playmaker':'passing vision decisions technique firstTouch composure','Ball-Winning Midfielder':'tackling workRate stamina aggression anticipation','Inverted Winger':'dribbling acceleration pace technique decisions','Target Forward':'strength jumpingReach heading firstTouch','Poacher':'finishing offTheBall anticipation composure','Winger':'pace dribbling crossing','Ball-Playing Goalkeeper':'kicking passing firstTouch decisions'};
function fit(p,z,name,reps){const keys=(detailedAttributes[name]||profiles[name][0]).split(' '),ratings=keys.some(k=>p.attrs?.[k]==null)?Mind.read(p).ratings:null;return Math.round(keys.reduce((v,k)=>v+(p.attrs?.[k]??ratings?.[k]??10),0)/keys.length*5*familiarity(p,z,reps)*footFactor(p,z,name));}
const roleDescriptions={
 'Advanced Forward':'Leads the line, attacks space behind the defence and looks to finish moves.',
 'Deep-Lying Playmaker':'Shows in deeper areas to receive the ball and progress play with precise passing.',
 'Ball-Winning Midfielder':'Closes opponents quickly and uses anticipation and tackling to recover possession.',
 'Screening Midfielder':'Protects the central lane, blocks routes into the forwards and helps the defence retain its shape.',
 'Attacking Wing-Back':'Provides width and forward support from the back line, arriving high to create crossing options.',
 'Centre Forward':'Leads the attack, occupies central defenders and links or finishes forward moves.',
 'Inside Forward':'Starts wide, then attacks the inside channel and goal with direct runs.',
 'Wide Midfielder':'Balances width with defensive recovery and supports play along the flank.',
 'Full-Back':'Protects the outside channel and offers measured support in possession.',
 'Wing-Back':'Uses the full flank as an outlet, supporting attacks while recovering into the defensive line.',
 'Centre-Back':'Holds the central defensive line, contests forwards and protects space in front of goal.',
 'Defensive Midfielder':'Screens the defence from midfield and offers a safe central passing option.',
 'Central Midfielder':'Connects the lines, supporting circulation and movement through central areas.',
 'Attacking Midfielder':'Finds space between midfield and defence to create chances or arrive near the box.',
 'Winger':'Stretches the pitch and carries the ball into crossing positions.',
 'Striker':'Leads the forward line and provides a central target for passes and chances.'
};
const attributeLabels={acceleration:'Acceleration',pace:'Pace',finishing:'Finishing',offTheBall:'Off the ball',anticipation:'Anticipation',composure:'Composure',passing:'Passing',vision:'Vision',decisions:'Decisions',technique:'Technique',firstTouch:'First touch',tackling:'Tackling',workRate:'Work rate',stamina:'Stamina',aggression:'Aggression',dribbling:'Dribbling',crossing:'Crossing',strength:'Strength',jumpingReach:'Aerial reach',heading:'Heading',kicking:'Kicking',reflexes:'Reflexes',positioning:'Positioning'};
const actionLabels={short:'keeps passes simple',through:'looks to play incisive passes',progress:'carries or passes play forward',carry:'drives forward with the ball',cross:'looks to deliver from wide areas',shot:'looks to finish attacks',clear:'prioritises clearing danger'};
function roleInfo(name){const spec=jobs[name],keys=(detailedAttributes[name]||profiles[name]?.[0]||'decisions technique').split(' '),movement=spec?(spec.x>=4?'makes forward runs':spec.x<=-3?'holds a deeper position':'supports from the assigned line'):'supports the team from the assigned position',width=spec?(spec.y>=4?'and holds width':spec.y<=-4?'and moves into inside channels':'and protects or connects through central areas'):'';return {name,description:roleDescriptions[name]||`${name} ${movement} ${width}.`,attributes:keys.slice(0,5).map(k=>attributeLabels[k]||k),behaviour:`${movement} ${width}; ${actionLabels[spec?.action]||'contributes to team play'}.${spec?.hunt>=.16?' Applies strong pressure when possession is lost.':spec?.hunt<=.03?' Prioritises position and defensive shape.':' Presses actively when the situation calls for it.'}`.replace(/\s+/g,' ').trim()};}
function fitRating(value){return (Math.max(0,Math.min(100,Number(value)||0))/20).toFixed(1);}
function fitBand(value){const rating=Number(fitRating(value));return rating>=4.6?'Excellent fit':rating>=3.8?'Good fit':rating>=2.8?'Fair fit':'Limited fit';}
const systems={'Tiki-Taka':[0,0,1,1,1],'Vertical Tiki-Taka':[0,2,1,1,2],Gegenpress:[1,2,2,1,2],Gegenpressing:[1,2,2,1,2],'High Press':[1,1,2,2,2],'Low Block':[1,0,0,0,0],'Counter-Attack':[2,2,0,1,0],'Counter-Attacking':[2,2,0,1,0],'Direct Counter-Attack':[2,2,0,2,1],'Fluid Counter-Attack':[1,2,1,1,0],'Wing Play':[1,2,1,2,1],'Route One':[2,2,1,1,1],'Possession Football':[0,0,1,1,1],Custom:[1,1,1,1,1]};
const axes=['passing','tempo','press','width','line'];function settings(plan){const a=systems[plan?.system];return {...(a?Object.fromEntries(axes.map((k,i)=>[k,a[i]])):{}),...Object.fromEntries(Object.entries(plan?.instructions||{}).map(([k,v])=>[k,Math.round(v)])),fine:{...plan?.instructions},club:{...(plan?.system==='Gegenpressing'?{lost:'Counter-press'}:{}),...(plan?.system==='Counter-Attacking'?{won:'Counter'}:{}),...plan?.orders}};}
const choicesTeam={trigger:['Always available','Trap on touchline','On a backward pass','Carrier facing own goal','Goalkeeper receives','Poor first touch','Press in own half','Press in final third'],lost:['Counter-press','Regroup','Immediate recovery runs','Protect central areas','Protect wide channels'],won:['Counter','Hold shape','Retain possession','Play forward immediately','Slow the game down'],block:['High press','Mid block','Low block'],build:['Play out of defence','Direct from goalkeeper','Work ball into box','Shoot on sight','Overlap','Underlap','Run at defence'],deliveryCross:['Low crosses','Whipped crosses','Floated crosses'],duels:['Stay on feet','Get stuck in'],step:['Hold line','Drop off more','Step up more']};
const individualInstructions={position:['Team default','Hold position','Roam from position','Stay wider','Move into channels','Sit narrower','Get further forward','Hold defensive position'],risk:['Team default','Take more risks','Take fewer risks'],shooting:['Team default','Shoot less often','Shoot more often'],dribbling:['Team default','Dribble more','Dribble less'],pressing:['Team default','Press more','Press less']};
function ability(p){const a=p.attrs,hash=D.seedFor(String(p.id));const ca=Math.max(1,Math.min(200,Math.round(200*D.ROLE_WEIGHTS[p.pos](a)/D.ROLE_WEIGHTS[p.pos](new Proxy({},{get:()=>20})))));return {ca,pa:Math.max(ca,Math.min(200,p.ceiling??(ca+Math.round(Math.max(0,30-p.age)*(.6+(hash%25)/10))))),professionalism:Mind.personality(p).professionalism};}
function intelligence(p){const m=Mind.read(p);return {...ability(p),...m.ratings,trait:m.traits.join(' · ')};}
const systemSkills={'Tiki-Taka':['passing','firstTouch','technique','decisions','vision'],'Vertical Tiki-Taka':['passing','firstTouch','vision','offTheBall'],Gegenpressing:['workRate','stamina','acceleration','aggression','teamwork'],'High Press':['workRate','stamina','teamwork','anticipation'],'Low Block':['positioning','concentration','tackling','marking','decisions'],'Counter-Attacking':['pace','acceleration','anticipation','passing','offTheBall'],'Wing Play':['crossing','pace','acceleration','dribbling'],'Route One':['strength','jumpingReach','heading','passing']};
function compatibility(slots,system){const skills=systemSkills[system];if(!skills)return null;const units=[slots.filter(v=>['GK','DC','FB','WB'].includes(v.role)),slots.filter(v=>['CM','AM','DM'].includes(v.role)),slots.filter(v=>['W','ST'].includes(v.role))].filter(u=>u.length);const means=units.map(u=>u.reduce((n,v)=>{if(!v.player)return n;const ratings=Mind.read(v.player).ratings;return n+skills.reduce((a,k)=>a+ratings[k],0)*5/skills.length;},0)/u.length);return Math.round((Math.min(...means)+means.reduce((a,b)=>a+b,0)/means.length)/2);}
function report(p,reps){const bio=identity(p),iq=intelligence(p),z=bio.natural,rs=choices(z).map(name=>[name,fit(p,z,name,reps)]).sort((a,b)=>b[1]-a[1]);return `<article class="org-agenda"><small>TACTICAL SCOUTING</small><h3>Player intelligence</h3><p>Ability ${iq.ca}/200 · Estimated ceiling ${iq.pa}/200<br>Preferred move: ${iq.trait}</p><p>Acceleration ${iq.acceleration} · Anticipation ${iq.anticipation} · Decisions ${iq.decisions} · Vision ${iq.vision} (out of 20)</p><h3>Role suitability</h3><p>Preferred foot: ${bio.foot} · Weak foot ${bio.weak}/5<br>Natural: ${z} · Alternatives: ${bio.alternatives.join(', ')||'Specialist'}<br>Rehearsed positions: ${Object.keys(reps||{}).filter(k=>k.startsWith('zone:')).map(k=>k.slice(5)+' '+Math.round(100*familiarity(p,k.slice(5),reps))+'%').join(', ')||'None yet'}. Estimates use positional fit and the skills required for each job.</p>${rs.map(([n,v])=>`<div class="role-meter"><span>${n}</span><meter min="0" max="100" value="${v}"></meter><b>${v}%</b></div>`).join('')}</article>`;}
const mentality=m=>({'Very Defensive':-2,Defensive:-1,'Very Attacking':4}[m]??Math.max(0,D.MENTALITIES.indexOf(m||'Balanced')));
const api={systemSkills,ability,jobs,identity,familiarity,footFactor,duty,mentality,zone,families,choices,profiles,fit,fitRating,fitBand,roleInfo,systems,axes,settings,compatibility,choicesTeam,individualInstructions,intelligence,report};g.TLZones=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
