/* Federation handbook. The common July archive is not a common league opening date. */
(function(g){'use strict';const A=g.TLMeridian||require('./meridian'),Y=g.TLTurnover||require('./season-turnover');
// Opening month/day, weeks between district rounds, domestic cup offset, local income index, identity.
const profiles={Valdoria:[8,16,3,0,100,'Many towns grew around train stations. Local football clubs are part of town life.'],Estavelle:[8,23,3,4,112,'These cities have old cathedrals. Many football clubs are run by their members.'],Caldria:[9,6,3,8,96,'Ships bring goods into the ports. Many people play football in the evening.'],Monteluce:[9,13,3,12,118,'People work in small shops on the hillsides. Town councils provide football grounds.'],Zandora:[11,7,3,3,76,'Markets are busy meeting places. People play football on shared fields.'],Nembala:[10,10,3,7,82,'People trade goods along the river. Towns hold festivals where young players meet and play.'],Kordane:[11,14,3,11,88,'Many people work at the ports. Workers have unions and some workplaces have their own football teams.'],Tavira:[10,24,3,15,79,'Farmers work together to grow and sell food. Local districts have their own football grounds.'],Norvaska:[1,9,2,5,141,'People play indoors during winter. The outdoor football season is short.'],Westmark:[8,9,4,9,128,'Many towns grew around mills. Fans often stand together to watch matches.'],Dravonia:[9,20,3,13,93,'Many people work in factories. Clubs from towns along the railway play big local matches against each other.'],Ravensk:[1,16,2,17,121,'People work in ports where the water is cold. The football season starts in spring.'],Azmara:[10,3,3,2,132,'Large cities have football schools for young players. Busy train and bus routes connect the districts.'],Veloria:[2,6,2,6,136,'People make goods in factories near the coast. Many young players first play for their school.'],Sorelia:[1,23,2,10,108,'Several towns have universities. Football schools help young players practise their skills.'],Kintaro:[10,17,3,14,101,'Ferries connect the islands. Some football fields are close to the ports.'],Meridia:[9,27,3,1,91,'People live in valleys along the rivers. Local fans stand close together to watch their teams.'],Solmera:[1,30,2,5,85,'Farmers grow fruit in the valleys. People play football through the summer.'],Bellvaria:[9,5,4,9,89,'People trade in mountain markets. Some football grounds have steep banks on either side.'],Orvessa:[10,31,3,13,97,'Many people fish for a living. Matches between nearby coastal towns are a big part of local life.']};
// Settlement entries follow the canonical atlas order (capital then four district grounds).
const districts=[
  [
    "People change trains here. Workers also move goods from one train to another.",
    "People take a ferry north from here.",
    "Workers make iron here.",
    "People sell goods near the mill.",
    "Families live in rows of houses near the brick factory."
  ],
  [
    "The old cathedral stands here.",
    "People come here to walk in the public gardens.",
    "Students learn to play and coach sports here.",
    "People share an open field on the west side of town.",
    "Workers make and repair things for the royal family here."
  ],
  [
    "People gather in the square for festivals.",
    "Traders buy and sell goods brought in by ship.",
    "People shop at a market on the hill.",
    "People make and sell cloth along these streets.",
    "Trains run through the east side of town."
  ],
  [
    "People walk along a path by the sea.",
    "Farmers grow fruit trees in this valley.",
    "Local teams play on fields near the church.",
    "Boats take people across the lake.",
    "People gather on the open ground by the old fort."
  ],
  [
    "People come to the capital to buy and sell goods at the market.",
    "People train to become coaches here.",
    "Boats stop here to let people and goods on and off.",
    "Many people here drive trucks that carry goods.",
    "People work in small workshops on the east side of town."
  ],
  [
    "People hold festivals on this open ground.",
    "Boats bring goods to this town on the river.",
    "People sell cloth they have woven at the market.",
    "Local players practise on these fields.",
    "Farmers buy and sell cattle here."
  ],
  [
    "Traders set up stalls in the town square.",
    "Workers keep and repair trains here.",
    "Students come here to train as teachers.",
    "These streets are lined with buildings where goods are stored.",
    "Large ships can come close to shore here to load goods."
  ],
  [
    "Farmers bring food here to sell.",
    "Farmers work together and share equipment.",
    "School teams play football here.",
    "Workers turn grain into flour here.",
    "Vehicles stop here between trips."
  ],
  [
    "People play sports indoors here when it is cold.",
    "Fishing boats leave from this town.",
    "People catch a ferry here.",
    "People make things from wood near the forest.",
    "Young players can train here during winter."
  ],
  [
    "Many people run shops and market stalls here.",
    "The old mills stand beside the canal.",
    "People use this open space for market days.",
    "Rows of houses stand beside the railway.",
    "Traders store goods in large buildings by the port."
  ],
  [
    "Many people here work in the steel factory.",
    "Workers keep and repair train engines here.",
    "Students learn how to work in mines.",
    "Families live in homes built near the factories.",
    "Goods are loaded here before they travel by train or truck."
  ],
  [
    "The town holds a fair here in spring.",
    "Workers build and repair ships here.",
    "Several mills stand along the river.",
    "Young players train on the hill.",
    "People meet and shop in the town square."
  ],
  [
    "Young footballers train at a big city academy.",
    "Workers load boats and repair equipment by the harbour.",
    "Students learn the skills they need for factory work.",
    "Students play on the university football fields.",
    "Workers load large metal boxes of goods onto ships here."
  ],
  [
    "Several train lines meet here.",
    "Workers make and repair machine parts here.",
    "Many of the town’s schools are here.",
    "People meet in this public park.",
    "Factories stand on the east side of town."
  ],
  [
    "Many students live near the university here.",
    "Trams run beside the river.",
    "Students study sport and train here.",
    "Several technology companies have offices here.",
    "People wait here for the ferry."
  ],
  [
    "People change ferries here to reach other islands.",
    "People build boats here.",
    "Players travel to this island to train.",
    "Traders sell goods close to the harbour.",
    "Port workers play football on this field."
  ],
  [
    "The capital city sits in a valley.",
    "Mills stand beside the river.",
    "People make things by hand in small workshops.",
    "Trains stop at a station in the mountains.",
    "People buy and sell goods in a market near the palm trees."
  ],
  [
    "Farmers bring their crops here to sell.",
    "Boats carry fruit from this port.",
    "Farmers grow oranges and other citrus fruit in this valley.",
    "Families gather in the square near the school.",
    "People come to this raised spot to look out over the town."
  ],
  [
    "The capital city stands on a hill.",
    "Traders set up stalls along the steps.",
    "Farmers grow crops on the mountain slopes.",
    "Teams from nearby churches play each other here.",
    "Workers cut stone from the ground here."
  ],
  [
    "Fishing boats still use the old port.",
    "People make and sell things by hand here.",
    "Families live in housing areas on the north side of town.",
    "Fishing boats stop here to unload their catch.",
    "People shop at a market by the sea."
  ]
];
function identity(n,town){const i=A.countries.findIndex(c=>c.name===n),j=A.countries[i]?.places.findIndex(t=>t.name===town);return districts[i]?.[j]||'';}
function modern(s,y){return !!s?.faCalendarFrom&&y>=s.faCalendarFrom;}
// Day zero is Monday. Keep old draws until the next July turnover.
const weekday=d=>((d+1)%7+7)%7;
function weekly(s,y){return !!s&&y>=(s.weeklyLeagueFrom??(Y.season(s.day)+1));}
function kickoff(f){return f.kickoff?' · '+f.kickoff+' local time':'';}
function stamp(s,n,y,out){if(!weekly(s,y))return out;for(const f of out){const w=weekday(f.day);f.kickoff=f.i===9&&f.day===f.original?'15:00':w===0?['14:00','16:30'][(f.i+f.a)%2]:w===6?['15:00','15:00','17:30'][(f.i+f.b)%3]:'19:45';}return out;}
function dates(s,n,y){const p=profiles[n];if(!p||!modern(s,y))return Array.from({length:10},(_,i)=>y===2026?(i-2)*7:Y.dayOf(y,7,1)+i*21);const start=Y.dayOf(y+(p[0]<7?1:0),p[0]-1,p[1]);if(weekly(s,y)){const first=start+(6-weekday(start)+7)%7;return Array.from({length:10},(_,i)=>first+7*i);}return Array.from({length:10},(_,i)=>start+i*p[2]*7);}
function clubs(s,n,y){const list=A.countries.find(c=>c.name===n)?.places.map(t=>t.club.name)||[];if(s?.entries?.[y]?.nation===n)list.push(s.entries[y].name);return list;}
// Inaugural standings seed the ladder. Stable atlas indices keep match and player IDs portable.
function divisions(s,n,y){const upper=s?.ladders?.[y]?.[n];if(!upper)return null;const list=clubs(s,n,y);return [list.filter(k=>upper.includes(k)),list.filter(k=>!upper.includes(k))];}
function seal(s,n,y,rows,archive,mail){const prior=divisions(s,n,y-1),ranked=rows.map(r=>r.name);let upper;if(prior){const top=ranked.filter(k=>prior[0].includes(k)),lower=ranked.filter(k=>prior[1].includes(k)),down=top.at(-1),up=lower[0];if(!up||!down)return;upper=top.slice(0,-1).concat(up);archive.divisions=[top,lower];archive.movement={up,down};if(n===s.profile.nation||[up,down].includes(s.club?.name))mail('League office',`${up} promoted to Division One. ${down} relegated to Division Two.`);for(const [club,amount] of [[up,salary(n,16000)],[down,salary(n,4000)]]){if(club===s.club?.name){s.fund+=amount;mail('League office',`${club} received ₥${amount}: ${club===up?'promotion grant':'one-off relegation relief'}.`);}else{const funds=s.marketFunds||={},D=g.TLData||require('./data');funds[club]=(funds[club]??65000+D.seedFor(club)%180000)+amount;}}}else{upper=ranked.slice(0,3);archive.qualification=upper;if(n===s.profile.nation)mail('League office',`Inaugural classification complete: ${upper.join(', ')} qualify for Division One. Other admitted clubs enter Division Two.`);}((s.ladders||={})[y]||={})[n]=upper;}
function tierGames(s,n,y,groups,list,ds){const out=[];for(const [tier,group] of groups.entries()){if(group.length<2)continue;const ring=group.map(c=>list.indexOf(c));if(ring.length%2)ring.push(-1);const cycle=ring.length-1,rounds=cycle===1?4:cycle*2;for(let i=0;i<rounds;i++){const slot=Math.round(i*9/(rounds-1));for(let j=0;j<ring.length/2;j++){let a=ring[j],b=ring[ring.length-1-j];if(a<0||b<0)continue;if(Math.floor(i/cycle)%2)[a,b]=[b,a];const key=[y,n,slot,a,b].join('|'),date=weekly(s,y)?ds[i]+(i===rounds-1?0:(j+tier+i)%2):ds[slot];out.push({key,i:slot,a,b,tier:tier+1,team:list[a],host:list[b],original:date,day:s.postponements?.[key]??date});}ring.splice(1,0,ring.pop());}}return out;}
function fixtures(s,n,y){const list=clubs(s,n,y),ds=dates(s,n,y),ring=[0,1,2,3,4,list.length===6?5:-1],out=[],groups=divisions(s,n,y);if(groups)return stamp(s,n,y,tierGames(s,n,y,groups,list,ds));for(let i=0;i<10;i++){for(let j=0;j<3;j++){let a=ring[j],b=ring[5-j];if(a<0||b<0)continue;if(i>=5&&modern(s,y))[a,b]=[b,a];const key=[y,n,i,a,b].join('|'),date=ds[i]+(weekly(s,y)&&i!==9?(i+j)%2:0);out.push({key,i,a,b,team:list[a],host:list[b],original:date,day:s?.postponements?.[key]??date});}ring.splice(1,0,ring.pop());}return stamp(s,n,y,out);}
function salary(n,base){return Math.round(base*(profiles[n]?.[4]??100)/100);}
function windowInfo(s,n){let y=Y.season(s.day);while(dates(s,n,y)[0]-7<s.day)y++;return {year:y,lock:dates(s,n,y)[0]-7,opening:dates(s,n,y)[0]};}
function update(s,pool,mail){const n=s.profile.nation,y=Y.season(s.day);if(!modern(s,y))return;if(s.club?.owner&&dates(s,n,y)[0]-7===s.day){const squad=pool.filter(p=>s.roster.includes(p.id)),eligible=squad.some(p=>p.pos==='GK')&&squad.filter(p=>p.pos!=='GK').length>=10;if(eligible){(s.entries||={})[y]={nation:n,name:s.club.name,ids:squad.map(p=>p.id)};mail('National FA',s.club.name+' admitted for the full district season. Fixtures are now in Calendar.');}else mail('National FA','Entry deadline missed: one goalkeeper and ten outfield players are required. Next opportunity: next season.');}
// Confirm knockout participation before a league round; preserve both identity and original date.
const possible=A.countries.filter(c=>dates(s,c.name,y).some(d=>d===s.day||weekly(s,y)&&d+1===s.day)||Object.keys(s.postponements||{}).some(k=>k.startsWith(y+'|'+c.name+'|')&&s.postponements[k]===s.day));if(!possible.length)return;const cups=(g.TLCups||require('./cup-circuit')).circuit(s,pool).flatMap(c=>c.rounds.flat()).filter(f=>!f.national&&f.team&&f.host);for(const c of possible){const games=fixtures(s,c.name,y);for(const f of games.filter(x=>x.day===s.day)){const overlap=x=>[x.team,x.host].some(v=>v===f.team||v===f.host);if(!cups.some(x=>x.day===s.day&&overlap(x)))continue;const gap=weekly(s,y)?3:1;let day=s.day+gap;while((gap>1&&![0,2,3,6].includes(weekday(day)))||cups.some(x=>Math.abs(x.day-day)<gap&&overlap(x))||games.some(x=>x.key!==f.key&&Math.abs(x.day-day)<gap&&overlap(x)))day++;(s.postponements||={})[f.key]=day;f.day=day;if(c.name===n||[f.team,f.host].includes(s.club?.name))mail('League office',`${f.team} v ${f.host}: cup clash. Rearranged for ${new Date(Date.UTC(2026,9,26+day)).toISOString().slice(0,10)}.`);}}}
const api={weekly,kickoff,seal,divisions,identity,profiles,modern,dates,clubs,fixtures,salary,windowInfo,update};g.TLFASeason=api;if(typeof module!=='undefined')module.exports=api;})(typeof window==='undefined'?globalThis:window);
