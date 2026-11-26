'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),Archive=require('../src/career-archive'),Transaction=require('../src/career-compaction');
function store(initial=null){let value=initial;return{get:()=>value,set:next=>{value=next;},value:()=>value};}
async function fixture(){const seasons=Array.from({length:8},(_,i)=>({year:2026+i,nations:{Valdoria:{clubs:['North FC'],table:[['North FC',20,14,42]],results:Array.from({length:20},(_,j)=>[0,1,i+j,0]),honours:[]}},development:{player:{stats:[i,0,0]}},departures:[],intake:0})),source={id:'production-transaction',profile:{name:'Ada'},day:900,seasonYears:Array.from({length:8},(_,i)=>2027+i),seasonBook:seasons,worldCheckpoint:{throughYear:2030,version:1}};const archive=await Archive.packV2(source),dry=await Archive.dryRunCompact(source,async()=>true,archive);return{source,archive,dry};}
const options=(f,extra={})=>({source:f.source,reviewedCandidate:f.dry.candidate,verifiedArchive:f.archive,validateCheckpoint:async()=>true,backupStore:store(),careerStore:store(JSON.stringify(f.source)),makeBackup:career=>({snapshot:{format:2,kind:'touchline-manager',engine:'test-engine',career},link:null}),...extra});

test('production local transaction verifies the exact archive, backs up, replaces, and can restore the original',async()=>{
 const f=await fixture(),original=JSON.stringify(f.source),backupStore=store('old recovery copy'),careerStore=store(original);let confirmations=0;const result=await Transaction.commitLocal(options(f,{backupStore,careerStore,confirmReplaceBackup:async()=>{confirmations++;return true;}}));
 assert.equal(confirmations,1);assert.deepEqual(result.career,f.dry.candidate);assert.equal(careerStore.value(),JSON.stringify(f.dry.candidate));assert.deepEqual(JSON.parse(backupStore.value()).snapshot.career,f.source);assert.equal(JSON.stringify(f.source),original);assert.equal(result.archiveId,f.archive.archiveId);
 const backup=JSON.parse(backupStore.value());careerStore.set(JSON.stringify(backup.snapshot.career));assert.deepEqual(JSON.parse(careerStore.value()),f.source,'the durable recovery copy restores the full career');
});

test('production local transaction refuses archive, career, checkpoint, or backup-confirmation mismatches before replacement',async()=>{
 const f=await fixture(),original=JSON.stringify(f.source);
 const wrong=await Archive.packV2({...f.source,id:'another-career'});await assert.rejects(Transaction.commitLocal(options(f,{verifiedArchive:wrong})),/different career/i);
 const altered=JSON.parse(JSON.stringify(f.dry.candidate));altered.seasonBook[0].nations.Valdoria.table[0][3]++;await assert.rejects(Transaction.commitLocal(options(f,{reviewedCandidate:altered})),/changed since review/i);
 const invalidCareer=store(JSON.stringify({...f.source,day:901}));await assert.rejects(Transaction.commitLocal(options(f,{careerStore:invalidCareer})),/saved career changed/i);
 const prior=store('keep this backup'),saved=store(original);await assert.rejects(Transaction.commitLocal(options(f,{backupStore:prior,careerStore:saved,confirmReplaceBackup:async()=>false})),/existing recovery backup was kept/i);assert.equal(prior.value(),'keep this backup');assert.equal(saved.value(),original);
 await assert.rejects(Transaction.commitLocal(options(f,{validateCheckpoint:async()=>false})),/checkpoint validation failed/i);
});

test('production local transaction blocks replacement on backup failure and rolls back failed candidate writes',async()=>{
 const f=await fixture(),original=JSON.stringify(f.source),failedBackup={get:()=>null,set:()=>{throw Error('quota full');}},untouched=store(original);
 await assert.rejects(Transaction.commitLocal(options(f,{backupStore:failedBackup,careerStore:untouched})),/career was not replaced/i);assert.equal(untouched.value(),original);
 const backupStore=store();let current=original,failCandidate=true;const failingCareer={get:()=>current,set:text=>{if(failCandidate&&text===JSON.stringify(f.dry.candidate)){failCandidate=false;throw Error('candidate write failed');}current=text;}};
 await assert.rejects(Transaction.commitLocal(options(f,{backupStore,careerStore:failingCareer})),/candidate write failed/i);assert.equal(current,original);assert.deepEqual(JSON.parse(backupStore.value()).snapshot.career,f.source);
 const badVerifyBackup=store();let current2=original,corruptOnce=true;const badRead={get:()=>{if(corruptOnce&&current2===JSON.stringify(f.dry.candidate)){corruptOnce=false;return'{partial';}return current2;},set:text=>{current2=text;}};
 await assert.rejects(Transaction.commitLocal(options(f,{backupStore:badVerifyBackup,careerStore:badRead})),/candidate did not verify/i);assert.equal(current2,original);assert.deepEqual(JSON.parse(badVerifyBackup.value()).snapshot.career,f.source);
});
