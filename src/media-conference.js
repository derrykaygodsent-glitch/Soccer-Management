/* Context-first press conference data, journalistic identities and persistent consequences. */
(function(g){'use strict';
const journalists=[
 {id:'nora-quaye',name:'Nora Quaye',publication:'Meridian Wire',nation:'Zandora',specialty:'tactics',personality:'curious',style:'Analytical; asks for evidence behind your plan.',credibility:86},
 {id:'david-wilson',name:'David Wilson',publication:'The Football Chronicle',nation:'Zandora',specialty:'results',personality:'direct',style:'Direct questions about results and expectations.',credibility:82},
 {id:'ama-mensah',name:'Ama Mensah',publication:'Touchline Sports',nation:'Zandora',specialty:'players',personality:'supportive',style:'Interested in player development and dressing-room trust.',credibility:78},
 {id:'kofi-adjei',name:'Kofi Adjei',publication:'Saturday Review',nation:'Zandora',specialty:'transfers',personality:'sceptical',style:'Tests the evidence behind recruitment and spending.',credibility:88},
 {id:'florence-shaw',name:'Florence Shaw',publication:'The Sporting Post',nation:'Zandora',specialty:'supporters',personality:'community',style:'Asks what decisions mean for the club’s people.',credibility:80},
 {id:'jack-hale',name:'Jack Hale',publication:'The Evening Desk',nation:'Zandora',specialty:'controversy',personality:'provocative',style:'Looks for a clear answer when pressure rises.',credibility:74},
 {id:'dina-brooks',name:'Dina Brooks',publication:'Riverside Chronicle',nation:'Zandora',specialty:'club',personality:'local',style:'Local reporting, focused on club identity and supporters.',credibility:76},
 {id:'stefan-miles',name:'Stefan Miles',publication:'Planet Football',nation:'International',specialty:'managers',personality:'theatrical',style:'Big-picture questions about reputation and rivalries.',credibility:84}
];
const byId=Object.fromEntries(journalists.map(x=>[x.id,x]));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const quote=(s)=>'“'+s+'”';
function hash(seed){const D=g.TLData;if(D?.seedFor)return D.seedFor(seed);let h=2166136261;for(const c of seed)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
function pickReporter(seed,used=[]){const start=hash(seed)%journalists.length;for(let n=0;n<journalists.length;n++){const j=journalists[(start+n)%journalists.length];if(!used.includes(j.id))return j;}return journalists[start];}
function chosenHistory(history,key){return (history||[]).flatMap(c=>c.questions||[]).filter(q=>q.key===key).length;}
function responseOptions(type, target, facts={}){
 const base=[
  {id:'credit-team',tone:'diplomatic',label:'Credit the players and staff for the work they put in.',line:'The players carried out the plan and deserve the credit.',truth:1,board:1,supporters:2,dressing:2},
  {id:'honest-review',tone:'honest',label:'Be measured: recognise the result and name what still needs work.',line:'We earned the result, but there are details we need to improve.',truth:2,board:2,supporters:1,dressing:1},
  {id:'boast',tone:'confident',label:'Make a bold statement about your team’s quality.',line:'We showed what this team is capable of. We can do it again.',truth:facts.won?1:-1,board:facts.won?1:-1,supporters:2,dressing:1},
  {id:'evasive',tone:'evasive',label:'Decline to be drawn and move the conversation on.',line:'I’m focused on the next match, not a wider debate.',truth:0,board:0,supporters:0,dressing:0}
 ];
 if(type==='appointment')return [
  {id:'interested',tone:'honest',label:'Confirm the application and explain why the project interests you.',line:'Yes, I applied. The football project interests me and I would welcome a conversation.',truth:2,board:2,supporters:1,dressing:1},
  {id:'measured',tone:'diplomatic',label:'Confirm it, but stress that your current responsibilities come first.',line:'I did apply. I will consider it carefully and keep my focus on today’s work.',truth:2,board:1,supporters:1,dressing:2},
  {id:'exclusive',tone:'evasive',label:'Keep private applications confidential.',line:'I do not discuss private applications before a club makes a decision.',truth:0,board:0,supporters:0,dressing:1},
  {id:'deny',tone:'defensive',label:'Deny the rumour.',line:'There is nothing I wish to add to that rumour.',truth:-2,board:-2,supporters:-1,dressing:-1}
 ];
 if(target&&['player','performance','postmatch'].includes(type))return [
  {id:'back-player',tone:'supportive',label:`Back ${target.name} and recognise their contribution.`,line:`${target.name} has our backing. One performance never tells the whole story.`,truth:1,board:0,supporters:1,dressing:2,playerMood:4},
  {id:'specific-praise',tone:'positive',label:`Praise ${target.name} for the specific work they did.`,line:`${target.name} earned that praise with the work they showed today.`,truth:2,board:1,supporters:1,dressing:2,playerMood:5},
  {id:'fair-standard',tone:'honest',label:'Set a clear standard without singling anyone out.',line:'We judge the performance honestly, then work together on the next one.',truth:2,board:2,supporters:0,dressing:1,playerMood:1},
  {id:'criticise-player',tone:'critical',label:`Say ${target.name} must respond to the performance.`,line:`${target.name} knows the standard. We expect a response in training.`,truth:facts.poor?1:-2,board:facts.poor?1:-1,supporters:0,dressing:-1,playerMood:facts.poor?-1:-5}
 ];
 if(type==='postmatch'&&facts.opponent)return [
  ...base.slice(0,2),
  {id:'mind-games',tone:'provocative',label:`Challenge ${facts.opponent} to respond next time.`,line:`${facts.opponent} will need a better answer when we meet again.`,truth:facts.won?1:-1,board:0,supporters:2,dressing:1,rival:-2},
  base[3]
 ];
 if(type==='pre-match'&&facts.opponent)return [
  {id:'respect-opponent',tone:'diplomatic',label:`Show respect for ${facts.opponent} and explain the preparation.`,line:`${facts.opponent} have strengths. We have prepared for them and will focus on our own work.`,truth:2,board:1,supporters:1,dressing:1},
  {id:'confident-plan',tone:'confident',label:'Back your plan and say you expect a strong performance.',line:'We trust our preparation and expect to play with purpose.',truth:1,board:1,supporters:2,dressing:1},
  {id:'tactical-detail',tone:'analytical',label:'Discuss the tactical challenge without revealing your selection.',line:'The key will be our distances and what we do when possession changes.',truth:2,board:2,supporters:0,dressing:1},
  {id:'evasive',tone:'evasive',label:'Keep your answer private until kick-off.',line:'We will do our talking on the pitch.',truth:0,board:0,supporters:1,dressing:0}
 ];
 return base;
}
function question(key,prompt,reporter,target,facts,type,history){const n=chosenHistory(history,key),phrases=[prompt,prompt.replace(/^How do you assess/, 'What is your assessment of').replace(/\?$/, ' now?'),prompt.replace(/^What does/, 'How much does').replace(/\?$/, ' mean for the next game?')];return {id:`q${(history?.length||0)+1}-${key}`,key,prompt:phrases[n%phrases.length],journalistId:reporter.id,topic:key,targetPlayerId:target?.id||null,answers:[],options:responseOptions(type,target,facts)};}
function create(id,type,context={},history=[]){
 const ctx={...context},recent=(history||[]).slice(0,5),used=recent.flatMap(c=>(c.questions||[]).map(q=>q.journalistId)),seed=String(id),questions=[];let slots=[];
 if(type==='appointment')slots=['application','project','focus'];
 else if(type==='pre-match')slots=['opponent','selection','expectation'];
 else if(type==='postmatch')slots=['result','player','next'];
 else if(type==='signing')slots=['fee','player','squad'];
 else if(type==='injury')slots=['medical','player','return'];
 else if(type==='contract')slots=['future','player','expectation'];
 else if(type==='trophy')slots=['achievement','players','future'];
 else if(type==='deadline')slots=['business','player','squad'];
 else if(type==='draw')slots=['opponent','route','expectation'];
 else slots=['breaking','context','next'];
 for(let i=0;i<slots.length;i++){
   const key=slots[i],reporter=pickReporter(`${seed}:${key}`,used);used.push(reporter.id);let prompt,target=null,facts={...ctx,...ctx.facts};
   if(key==='application')prompt=`${ctx.club||'the club'} have confirmed your application. Is this a serious interest or an exploratory move?`;
   else if(key==='project')prompt=`What in ${ctx.club||'the club'}’s project convinced you to apply?`;
   else if(key==='focus')prompt=`If appointed, what would be your first priority at ${ctx.club||'the club'}?`;
   else if(key==='opponent')prompt=`You face ${ctx.opponent||'your next opponent'}${ctx.opponentStyle?`, who are known for ${ctx.opponentStyle}`:''}. What is the main tactical challenge?`;
   else if(key==='selection')prompt=`There are questions about injuries and selection ahead of ${ctx.opponent||'the match'}. How much can you reveal?`;
   else if(key==='expectation')prompt=`What would you consider a good result against ${ctx.opponent||'this opponent'}?`;
   else if(key==='result'){const [forGoals,against]=ctx.score||[0,0];facts.won=forGoals>against;prompt=`${ctx.club||'Your side'} ${forGoals}–${against} ${ctx.opponent||'their opponents'}. What did this result tell you about the performance?`;}
   else if(key==='player'){target=ctx.performer||ctx.player||null;facts.poor=!!ctx.poor;prompt=target?`${target.name}${ctx.hatTrick?' scored a hat-trick':ctx.performerGoals>1?` scored ${ctx.performerGoals} goals`:' stood out in the match'}. What did you make of that performance?`:`What did you make of the players’ performance today?`;}
   else if(key==='next')prompt=ctx.upcoming?`You next face ${ctx.upcoming}. What needs to improve before then?`:`Does this result change your expectations for the rest of the season?`;
   else if(key==='fee')prompt=`You have signed ${ctx.player?.name||'a new player'}${ctx.fee?` for a reported fee of ${ctx.fee}`:''}. Was the investment justified?`;
   else if(key==='squad')prompt=`Where does ${ctx.player?.name||'the new signing'} fit, and what does that mean for competition in the squad?`;
   else if(key==='medical'||key==='return')prompt=`${ctx.player?.name||'A first-team player'} is unavailable${ctx.returnDate?` until around ${ctx.returnDate}`:''}. How will you manage the situation?`;
   else if(key==='future')prompt=`Your contract situation is attracting attention. What can you tell supporters about your future?`;
   else if(key==='achievement')prompt=`You have won ${ctx.trophy||'silverware'}. Where does this achievement rank in your career?`;
   else if(key==='players')prompt=`Which players deserve particular credit for this achievement?`;
   else if(key==='business')prompt=`The deadline has passed. Are you satisfied with the club’s transfer business?`;
   else if(key==='route')prompt=`What is the route to the next round after drawing ${ctx.opponent||'this opponent'}?`;
   else if(key==='breaking')prompt=ctx.prompt||'A major story has emerged around the club. What is your response?';
   else prompt=ctx.summary?`How does this development affect ${ctx.summary}?`:`What message do you have for the supporters after this development?`;
   questions.push(question(key,prompt,reporter,target,facts,type,history));
 }
 return {id,type,title:({appointment:'Managerial application', 'pre-match':'Pre-match briefing',postmatch:'Post-match press conference',signing:'New signing conference',injury:'Medical update interview',contract:'Contract interview',trophy:'Trophy celebration',deadline:'Transfer deadline interview',draw:'Competition draw interview',breaking:'Breaking-news interview'})[type]||'Media conference',club:ctx.club||null,nation:ctx.nation||null,outlet:ctx.outlet||questions[0]?.journalistId||'Meridian Wire',day:ctx.day??0,context:ctx,questions,answers:[],status:'invited',display:'room'};
}
function personality(media){const counts=media?.personality||{},entries=Object.entries(counts).sort((a,b)=>b[1]-a[1]),[trait,n]=entries[0]||[];if(!trait||n<3)return 'Still emerging';return ({diplomatic:'The Diplomat',analytical:'The Tactical Professor',provocative:'The Controversial Manager',supportive:'The Players’ Champion',evasive:'The Media Enemy',mindgames:'The Mind Games Specialist',honest:'The Straight-Talking Manager',confident:'The Confident Builder'})[trait]||'The Straight-Talking Manager';}
function effect(s,c,q,opt,comment='',players=[]){
 const m=s.media||(s.media={journalists:{},personality:{},history:[],reputation:50,boardTrust:50,supporterTrust:50,dressingRoom:50});m.journalists||={};m.personality||={};
 const journalist=byId[q.journalistId],rel=m.journalists[q.journalistId]||(m.journalists[q.journalistId]={score:0,interactions:0,stories:[]});
 let truth=opt.truth||0;const trust=truth>0?1:truth<0?-1:0, styleFit=journalist?.personality==='provocative'&&opt.tone==='evasive'?-1:journalist?.personality==='supportive'&&opt.tone==='supportive'?1:opt.tone==='honest'||opt.tone==='diplomatic'?1:0;
 rel.score=clamp(rel.score+trust+styleFit,-10,10);rel.interactions++;rel.lastDay=s.day;rel.lastTopic=q.topic;
 const amount=(key,v)=>m[key]=clamp((m[key]??50)+v,0,100);
 amount('reputation',truth>0?1:truth<0?-2:0);amount('boardTrust',opt.board||0);amount('supporterTrust',opt.supporters||0);amount('dressingRoom',opt.dressing||0);
 const trait=opt.tone==='provocative'?'provocative':opt.tone==='analytical'?'analytical':opt.tone==='supportive'?'supportive':opt.tone==='evasive'?'evasive':opt.tone==='honest'?'honest':opt.tone==='confident'?'confident':'diplomatic';m.personality[trait]=(m.personality[trait]||0)+1;
 if(q.targetPlayerId&&opt.playerMood){const p=players.find(x=>x.id===q.targetPlayerId);if(p){const Room=g.TLDynamics,r=s.dressing&&s.dressing.club===(s.club?.name||'Independent')?s.dressing:(s.dressing={club:s.club?.name||'Independent',people:{},ties:{},diary:[]});const v=Room?.state?Room.state(s,p,r):r.people[p.id]||{mood:65,settled:65,fitness:100,sharp:72};v.mood=clamp(v.mood+opt.playerMood,0,100);v.reason=opt.playerMood>0?'Publicly backed by the manager.':'Public criticism from the manager.';r.people[p.id]=v;r.diary||=[];r.diary.unshift({day:s.day,text:`${p.name}: ${v.reason}`});r.diary=r.diary.slice(0,24);}}
 const answer={questionId:q.id,journalistId:q.journalistId,optionId:opt.id,tone:opt.tone,label:opt.label,quote:opt.line+(comment?` ${comment}`:''),comment,day:s.day,accuracy:truth,relationship:rel.score};q.answers.push(answer);return answer;
}
function apply(s,c,choice,comment='',players=[]){const q=c.questions[c.cursor||0];if(!q||c.status!=='invited')throw Error('This press conference is no longer taking responses.');const opt=q.options.find(o=>o.id===choice);if(!opt)throw Error('Choose one of the responses offered to this question.');const answer=effect(s,c,q,opt,String(comment||'').trim().slice(0,180),players);c.answers.push(answer);c.cursor=(c.cursor||0)+1;if(c.type==='appointment'&&c.cursor===1)c.answer=choice==='interested'?'interested':choice==='measured'?'measured':choice==='exclusive'?'no-comment':choice==='deny'?'no-comment':choice;
 if(c.cursor>=c.questions.length){c.status='answered';c.answeredDay=s.day;c.completed=true;}return {answer,complete:c.status==='answered',personality:personality(s.media)};}
function transcript(c){return (c?.answers||[]).map(a=>({question:c.questions.find(q=>q.id===a.questionId)?.prompt||'',journalist:byId[a.journalistId]?.name||'Reporter',publication:byId[a.journalistId]?.publication||'',quote:a.quote,tone:a.tone}));}
const api={journalists,byId,create,apply,personality,transcript};g.TLMediaConference=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:globalThis);
