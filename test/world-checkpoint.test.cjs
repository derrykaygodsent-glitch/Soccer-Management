const test=require('node:test'),assert=require('node:assert/strict'),Checkpoint=require('../src/world-checkpoint'),W=require('../src/manager-life'),Y=require('../src/season-turnover'),Family=require('../src/family-paths');

test('compact world checkpoints round-trip changed and newly generated players and reject tampering',()=>{
 const template=[{id:'m1:one',name:'Original',age:20,value:300,attrs:{pace:10,passing:12},club:'A',stats:{goals:0}},{id:'m1:two',name:'Second',age:30,value:200,attrs:{pace:8,passing:9},club:'B'}],players=[{...template[0],age:25,value:320,attrs:{pace:11,passing:12},change:{pace:1}},{...template[1],age:31,value:190,attrs:{pace:7,passing:9},ceiling:13},{id:'y1:2031:A:1',name:'New Player',age:17,value:100,attrs:{pace:8,passing:10},club:'A'}];
 const cp=Checkpoint.pack(players,template,2031,'catalogue');assert.deepEqual(Checkpoint.unpack(cp,template),players);const altered=JSON.parse(JSON.stringify(cp));altered.rows[0][1]++;assert.throws(()=>Checkpoint.unpack(altered,template),/validation/i);assert.throws(()=>Checkpoint.unpack(cp,template.slice(1)),/validation/i);assert.throws(()=>Checkpoint.unpack(cp,template.map((p,i)=>i? p:{...p,age:p.age+1})),/validation/i);
});

test('a five-season save reloads from its checkpoint with the exact full-replay world state',()=>{
 let s={id:'checkpoint-parity',worldVersion:'1',profile:{nation:'Valdoria'},day:0,roster:[],plans:[],mail:[]};W.activate(s);
 for(let year=2027;year<2032;year++){s.day=Y.dayOf(year,6,1)-1;s=W.act(s,'advance');}
 assert.equal(s.seasonYears.length,5);assert.equal(s.worldCheckpoint.throughYear,2031);assert.equal(s.worldCheckpoint.version,Checkpoint.VERSION);assert.ok(Buffer.byteLength(JSON.stringify(s.worldCheckpoint))<800_000,'checkpoint stays compact enough to be useful in long saves');
 const saved=JSON.parse(JSON.stringify(s)),fullReplay=JSON.parse(JSON.stringify(saved));delete fullReplay.worldCheckpoint;W.activate(fullReplay);const expected=JSON.parse(JSON.stringify(W.pool));
 W.activate(saved);assert.deepEqual(JSON.parse(JSON.stringify(W.pool)),expected);assert.equal(W.pool.length,3888);
 const damaged=JSON.parse(JSON.stringify(saved));damaged.worldCheckpoint.checksum='not-valid';W.activate(damaged);assert.deepEqual(JSON.parse(JSON.stringify(W.pool)),expected,'invalid checkpoints safely fall back to replay');
 const nextEvolution=state=>{W.activate(state);const players=W.pool.filter(p=>p.id.startsWith('m1:')||p.id.startsWith('y1:')),next=Y.evolve(players,state.id,2032,{}).next;Family.applyNames(state,next);return JSON.parse(JSON.stringify(next));};assert.deepEqual(nextEvolution(saved),nextEvolution(fullReplay),'future world evolution remains identical after checkpoint reload');
 const olderSave=JSON.parse(JSON.stringify(saved));delete olderSave.worldCheckpoint;olderSave.day=Y.dayOf(2032,6,1)-1;W.activate(olderSave);const upgraded=W.act(olderSave,'advance');assert.equal(upgraded.worldCheckpoint.throughYear,2032,'a long old save gets a checkpoint at its next season boundary');
});
