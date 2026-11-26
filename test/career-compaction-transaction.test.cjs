'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),Archive=require('../src/career-archive'),Transaction=require('./helpers/compaction-transaction.cjs');
function store(initial=''){let value=initial;return{get:()=>value,set:next=>{value=next;},value:()=>value};}
const commit=options=>Transaction.commitCopied({validateCheckpoint:async()=>true,...options});
async function fixture(){const seasons=Array.from({length:8},(_,i)=>({year:2026+i,nations:{Valdoria:{clubs:['North FC'],table:[['North FC',20,14,42]],results:Array.from({length:20},(_,j)=>[0,1,i+j,0]),honours:[]}},development:{player:{stats:[i,0,0]}},departures:[],intake:0})),source={id:'transaction-copy',profile:{name:'Ada'},day:900,seasonYears:Array.from({length:8},(_,i)=>2027+i),seasonBook:seasons,worldCheckpoint:{throughYear:2030,version:1}};const dry=await Archive.dryRunCompact(source,async()=>true);return{source,dry};}

test('copied-save transaction writes and verifies backup before replacement; recovery restores original idempotently',async()=>{
 const {source,dry}=await fixture(),original=JSON.stringify(source),backupStore=store('older-recovery-copy'),careerStore=store(original),result=await commit({source,candidate:dry.candidate,archive:dry.archive,archiveConfirmed:true,backupStore,careerStore,confirmReplaceBackup:async()=>true});
 assert.deepEqual(result.career,dry.candidate);assert.equal(careerStore.value(),JSON.stringify(dry.candidate));assert.deepEqual(JSON.parse(backupStore.value()).career,source);assert.equal(JSON.stringify(source),original);
 assert.deepEqual(Transaction.recoverCopied({backupStore,careerStore,careerId:source.id}),source);assert.deepEqual(Transaction.recoverCopied({backupStore,careerStore,careerId:source.id}),source,'recovery can be safely repeated');assert.equal(careerStore.value(),original);
});

test('interruption after backup leaves old save; interruption after replacement is recoverable',async()=>{
 const {source,dry}=await fixture(),original=JSON.stringify(source);
 for(const stopAt of ['after-backup','after-replace']){const backupStore=store(),careerStore=store(original);await assert.rejects(commit({source,candidate:dry.candidate,archive:dry.archive,archiveConfirmed:true,backupStore,careerStore,stopAt}),/Simulated interruption/i);assert.deepEqual(JSON.parse(backupStore.value()).career,source);if(stopAt==='after-backup')assert.equal(careerStore.value(),original,'before replacement the original remains active');else assert.equal(careerStore.value(),JSON.stringify(dry.candidate),'a crash after replacement leaves the verified recovery copy available');assert.deepEqual(Transaction.recoverCopied({backupStore,careerStore,careerId:source.id}),source);assert.equal(careerStore.value(),original);}
});

test('unverified archive, declined backup replacement, and archive mismatch never replace the career',async()=>{
 const {source,dry}=await fixture(),original=JSON.stringify(source),backupStore=store('prior-recovery-copy'),careerStore=store(original);
 await assert.rejects(commit({source,candidate:dry.candidate,archive:dry.archive,archiveConfirmed:false,backupStore,careerStore}),/separately exported and verified/i);
 await assert.rejects(commit({source,candidate:dry.candidate,archive:dry.archive,archiveConfirmed:true,backupStore,careerStore,confirmReplaceBackup:async()=>false}),/existing recovery backup was kept/i);assert.equal(backupStore.value(),'prior-recovery-copy');assert.equal(careerStore.value(),original);
 const altered=JSON.parse(JSON.stringify(dry.candidate));altered.seasonBook[0].nations.Valdoria.table[0][3]++;await assert.rejects(commit({source,candidate:altered,archive:dry.archive,archiveConfirmed:true,backupStore:store(),careerStore}),/candidate compact summary differs/i);assert.equal(careerStore.value(),original);
});

test('failed or unverifiable candidate writes roll back from the durable backup',async()=>{
 const {source,dry}=await fixture(),original=JSON.stringify(source),backupStore=store();let current=original,throwCandidate=true;const failingStore={get:()=>current,set:value=>{if(throwCandidate&&value===JSON.stringify(dry.candidate)){throwCandidate=false;throw Error('simulated storage write failure');}current=value;}};
 await assert.rejects(commit({source,candidate:dry.candidate,archive:dry.archive,archiveConfirmed:true,backupStore,careerStore:failingStore}),/simulated storage write failure/i);assert.equal(current,original);assert.deepEqual(JSON.parse(backupStore.value()).career,source);
 const failedBackup={get:()=>null,set:()=>{throw Error('simulated backup quota failure');}},untouched=store(original);await assert.rejects(commit({source,candidate:dry.candidate,archive:dry.archive,archiveConfirmed:true,backupStore:failedBackup,careerStore:untouched}),/simulated backup quota failure/i);assert.equal(untouched.value(),original,'backup failure must block candidate replacement');
 const backup2=store();let value=original,corruptRead=true;const badVerify={get:()=>{if(corruptRead&&value===JSON.stringify(dry.candidate)){corruptRead=false;return '{partial write';}return value;},set:next=>{value=next;}};
 await assert.rejects(commit({source,candidate:dry.candidate,archive:dry.archive,archiveConfirmed:true,backupStore:backup2,careerStore:badVerify}),/did not verify; the original career was restored/i);assert.equal(value,original);assert.deepEqual(JSON.parse(backup2.value()).career,source);
});
