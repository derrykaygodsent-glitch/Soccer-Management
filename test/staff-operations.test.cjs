const test=require('node:test'),a=require('node:assert/strict');
const O=require('../src/staff-office');
const money=n=>'₥'+Number(n||0).toLocaleString('en-GB');
global.TLManagerLife={date:d=>'Day '+d,money};
global.TLLuma={format:money};
global.TLClubUI={esc:v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;'),art:()=>''};
const make=()=>({id:'ops',club:{name:'Kay FC'},profile:{nation:'Zandora',name:'Manager'},staff:[],fund:500000,cash:5000,day:0,roster:[],mail:[],plans:[]});
const hire=(s,i,j=0)=>O.act(s,'staffHire',`${i}|${j}`);

test('the backroom has specialist departments beyond three posts and renders recurring work targets',()=>{
  const s=make();hire(s,3);hire(s,4);hire(s,10);hire(s,11);hire(s,12);
  const html=O.render(s);
  a.equal(s.staff.length,5);
  a.equal(O.roles.length,16);
  for(const role of ['Head coach','Tactical coach','Goalkeeping coach','Fitness coach','Youth development coach','Sports scientist','Chief scout','First-team scout','Recruitment analyst','Director of football','Contract negotiator','Performance analyst','Academy manager'])a.ok(html.toLowerCase().includes(role.toLowerCase()),`missing ${role}`);
  a.match(html,/No fixed three-person cap/);
  a.match(html,/MONTHLY TARGET/);
  a.match(html,/Weekly responsibility/);
});

test('youth coaching produces saved attribute growth and a weekly work record',()=>{
  const s=make(),player={id:'young',name:'Kofi Mensah',pos:'CM',age:18,nation:'Zandora',club:'Kay FC',attrs:{pace:12,passing:13,shooting:11,tackling:10,dribbling:12,positioning:12,composure:11,aggression:10,workRate:12,stamina:12,handling:8,reflexes:8}};
  s.roster=[player.id];hire(s,7);s.staff=s.staff.filter(x=>x!=='Youth development coach');s.staff.push('Youth development coach');O.act(s,'staffDuty','7|0');
  for(const day of [7,14,21,28]){s.day=day;O.morning(s,[player]);}
  a.equal(s.staffGrowth.young.sessions,4);
  a.equal(s.staffGrowth.young.points,0);
  a.equal(Object.values(s.playerGrowth.young.attrs).reduce((n,x)=>n+x,0),1);
  a.equal(s.club.staffOffice.members[7].hits,4);
  a.match(s.club.staffOffice.members[7].log[0].text,/four-week block/);
});

test('scouts, analyst and director prepare a proposal but only the manager signature submits it',()=>{
  const s=make();
  const player={id:'target',name:'Ama Soro',pos:'ST',age:21,nation:'Zandora',club:'East Pier',value:60000,attrs:{pace:14,passing:12,shooting:15,tackling:5,dribbling:13,positioning:14,composure:13,aggression:8,workRate:12,stamina:13,handling:4,reflexes:4}};
  const own={id:'own',name:'Ben Cole',pos:'GK',age:25,nation:'Zandora',club:'Kay FC',value:50000,attrs:player.attrs};
  s.roster=[own.id];hire(s,10);hire(s,11);hire(s,12);O.act(s,'staffBudget','10000');
  s.day=7;O.morning(s,[own,player]);
  const o=s.club.staffOffice;
  a.ok(o.recommendations.some(r=>r.id===player.id));
  a.equal(o.approvals.length,1);
  a.equal(o.approvals[0].status,'pending');
  a.ok(s.fieldNotes.Zandora.includes(player.id),'fieldwork unlocks the player file');
  let signed=0;global.TLFieldwork={known:()=>true};global.TLMarket={order(save,p,pool,kind){signed++;a.equal(p.id,player.id);a.equal(kind,'buy');}};
  O.approve(s,player.id,[own,player]);
  a.equal(signed,1);
  a.equal(o.approvals[0].status,'offer submitted');
  a.equal(o.approvals[0].signature,'Manager');
});
