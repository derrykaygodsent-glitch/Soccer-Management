const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),Archive=require('../src/career-archive');

const records=[
 {year:2026,nations:{Valdoria:{table:[['North FC',20,14,42]],results:[[0,1,2,1]],honours:[{name:'Ada',title:'Champion'}]}},development:{'m1:ada':{club:'North FC',stats:[12,4,0],change:{pace:1}}},departures:[],intake:0},
 {year:2027,nations:{Valdoria:{table:[['North FC',22,17,48]],results:[[0,1,3,0]],honours:[]}},development:{},departures:[],intake:0}
];
function career(id='archive-test',book=records){return{id,profile:{name:'Ada Manager'},day:900,seasonYears:[2027,2028],seasonBook:JSON.parse(JSON.stringify(book)),worldCheckpoint:{throughYear:2028,version:1},club:{name:'North FC'}};}

 test('versioned season-history sidecar round-trips exact full records without changing a career',()=>{
 const source=career(),before=JSON.stringify(source),bundle=Archive.pack(source),decoded=JSON.parse(JSON.stringify(bundle));
 assert.equal(bundle.version,Archive.VERSION);assert.equal(bundle.kind,Archive.KIND);assert.deepEqual(Archive.inspect(decoded).seasons,records);assert.equal(JSON.stringify(source),before);
 const applied=Archive.merge(career('archive-test',[]),decoded);assert.equal(applied.added,2);assert.deepEqual(applied.career.seasonBook,records);assert.deepEqual(applied.career.seasonYears,[2027,2028]);assert.deepEqual(applied.career.worldCheckpoint,source.worldCheckpoint);
});

test('history restore is idempotent and never overwrites a conflicting season',()=>{
 const source=career(),bundle=Archive.pack(source),identical=Archive.merge(career(),bundle);assert.equal(identical.added,0);assert.equal(identical.career.seasonBook.length,2);
 const conflicting=career();conflicting.seasonBook[0].nations.Valdoria.table[0][3]=999;const before=JSON.stringify(conflicting);
 assert.throws(()=>Archive.merge(conflicting,bundle),/different history/i);assert.equal(JSON.stringify(conflicting),before);
});

test('history restore rejects the wrong career, unknown timeline years, and altered archive bytes',()=>{
 const source=career(),bundle=Archive.pack(source);assert.throws(()=>Archive.merge(career('another-career'),bundle),/different career/i);
 const changed=JSON.parse(JSON.stringify(bundle));changed.seasons[0].nations.Valdoria.table[0][3]++;assert.throws(()=>Archive.inspect(changed),/checksum/i);
 const shortTimeline=career();shortTimeline.seasonYears=[2028];assert.throws(()=>Archive.merge(shortTimeline,bundle),/not part of this career timeline/i);
});

test('archive validation rejects duplicate or out-of-range years',()=>{
 const source=career();source.seasonBook=[{year:2026},{year:2026}];assert.throws(()=>Archive.pack(source),/invalid or repeated season/i);
 source.seasonBook=[{year:100001}];assert.throws(()=>Archive.pack(source),/invalid or repeated season/i);
});

test('version-2 sidecar hashes canonical records and rejects malformed, reordered, or altered payloads',async()=>{
 const bundle=await Archive.packV2(career()),roundTrip=await Archive.inspectV2(JSON.parse(JSON.stringify(bundle)));
 assert.equal(bundle.kind,Archive.V2_KIND);assert.equal(bundle.version,Archive.ARCHIVE_VERSION);assert.deepEqual(roundTrip.seasons,records);
 const changed=JSON.parse(JSON.stringify(bundle));changed.records[0].record.nations.Valdoria.table[0][3]++;await assert.rejects(Archive.inspectV2(changed),/record digest/i);
 const extra=JSON.parse(JSON.stringify(bundle));extra.injected=true;await assert.rejects(Archive.inspectV2(extra),/compatible version-2/i);
 const reordered=JSON.parse(JSON.stringify(bundle));reordered.records.reverse();await assert.rejects(Archive.inspectV2(reordered),/malformed or out of order/i);
 const badCoverage=JSON.parse(JSON.stringify(bundle));badCoverage.lastSeason++;await assert.rejects(Archive.inspectV2(badCoverage),/coverage/i);
 const badManifest=JSON.parse(JSON.stringify(bundle));badManifest.managerName='Changed';await assert.rejects(Archive.inspectV2(badManifest),/manifest digest/i);
});

test('read-only attachment resolves only digest-matched compact rows and never changes the career',async()=>{
 const full=career('archive-test',[records[0]]),bundle=await Archive.packV2(full),verified=await Archive.attach(full,bundle);assert.equal(verified.matched,1);Archive.detach(full.id);const stub={...records[0],nations:{Valdoria:{...records[0].nations.Valdoria,resultsCount:1}}};delete stub.nations.Valdoria.results;stub.seasonArchive={format:1,detail:'external',archiveId:bundle.archiveId,recordSha256:bundle.records[0].sha256};const compact=career('archive-test',[stub]),before=JSON.stringify(compact);
 const result=await Archive.attach(compact,bundle);assert.equal(result.matched,1);assert.deepEqual(Archive.readRecord(compact,2026),records[0]);assert.equal(JSON.stringify(compact),before);
 const wrong=await Archive.packV2(career('other-career'));await assert.rejects(Archive.attach(compact,wrong),/different career/i);
 Archive.detach(compact.id);
});

test('version-1 sidecars remain readable as external details when the exact digest matches',async()=>{
 const full=career('archive-test',[records[0]]),v2=await Archive.packV2(full),v1=Archive.pack(full),stub={...records[0],seasonArchive:{format:1,detail:'external',archiveId:v2.archiveId,recordSha256:v2.records[0].sha256}},compact=career('archive-test',[stub]);
 assert.equal((await Archive.attach(compact,v1)).matched,1);assert.deepEqual(Archive.readRecord(compact,2026),records[0]);Archive.detach(compact.id);
});

test('selected archive verification requires the complete exact version-2 export before any replacement',async()=>{
 const source=career('verify-export'),before=JSON.stringify(source),archive=await Archive.packV2(source),verified=await Archive.verifyCompleteArchive(source,archive);assert.deepEqual(verified,{careerId:source.id,archiveId:archive.archiveId,archiveSha256:archive.sha256,version:2,records:2,firstSeason:2026,lastSeason:2027,archiveBytes:Buffer.byteLength(JSON.stringify(archive))});assert.equal(JSON.stringify(source),before);
 const partial=await Archive.packV2(career(source.id,[records[0]]));await assert.rejects(Archive.verifyCompleteArchive(source,partial),/every completed season/i);await assert.rejects(Archive.verifyCompleteArchive(career('other'),archive),/different career/i);await assert.rejects(Archive.verifyCompleteArchive(source,Archive.pack(source)),/version-2/i);
 const damaged=JSON.parse(JSON.stringify(archive));damaged.records[0].record.nations.Valdoria.honours[0].title='Altered';await assert.rejects(Archive.verifyCompleteArchive(source,damaged),/record digest/i);assert.equal(JSON.stringify(source),before,'verification must not change the career');
});

test('version-2 restore replaces only matching compact stubs and is idempotent',async()=>{
 const bundle=await Archive.packV2(career()),stubs=records.map((row,i)=>({...row,nations:{Valdoria:{table:row.nations.Valdoria.table,resultsCount:row.nations.Valdoria.results.length}},seasonArchive:{format:1,detail:'external',archiveId:bundle.archiveId,recordSha256:bundle.records[i].sha256}})),compact=career('archive-test',stubs),before=JSON.stringify(compact);
 const restored=await Archive.mergeAny(compact,bundle);assert.equal(restored.restored,2);assert.deepEqual(restored.career.seasonBook,records);assert.equal(JSON.stringify(compact),before);
 const again=await Archive.mergeAny(restored.career,bundle);assert.equal(again.restored,0);assert.equal(again.added,0);
 const mismatched=career('archive-test',[{...stubs[0],seasonArchive:{...stubs[0].seasonArchive,archiveId:'other-archive'}}]);await assert.rejects(Archive.mergeAny(mismatched,bundle),/compact archive reference/i);
});

test('dry-run compaction returns a non-mutating candidate and exact external archive only for checkpoint-covered old rows',async()=>{
 const long=career('dry-run',Array.from({length:8},(_,i)=>({year:2026+i,nations:{Valdoria:{clubs:['North FC'],table:[['North FC',20,14,42]],results:Array.from({length:30},(_,j)=>[0,1,i+j,0]),honours:[]}},development:{player:{stats:[i,0,0]}},departures:[],intake:0})));long.seasonYears=Array.from({length:8},(_,i)=>2027+i);long.worldCheckpoint={throughYear:2030,version:1};const before=JSON.stringify(long),calls=[];
 const result=await Archive.dryRunCompact(long,async probe=>{calls.push(JSON.stringify(probe.worldCheckpoint));return true;});
 assert.equal(JSON.stringify(long),before,'source career must not be changed');assert.equal(calls.length,1);assert.deepEqual(result.compactedYears,[2026,2027,2028]);assert.deepEqual(result.removedResultRows,[1,1,1]);assert.deepEqual(result.candidate.seasonYears,long.seasonYears);assert.deepEqual(result.candidate.seasonBook.slice(3),long.seasonBook.slice(3));assert.equal(result.candidate.seasonBook[0].nations.Valdoria.resultsCount,30);assert.equal(Object.hasOwn(result.candidate.seasonBook[0].nations.Valdoria,'results'),false);assert.deepEqual(result.candidate.seasonBook[0].development,long.seasonBook[0].development);assert.equal(result.candidate.seasonBook[0].seasonArchive.archiveId,result.archive.archiveId);assert.equal(result.archive.records.length,long.seasonBook.length);assert.ok(result.afterBytes<result.beforeBytes);assert.equal(result.savedBytes,result.beforeBytes-result.afterBytes);
 assert.deepEqual((await Archive.inspectV2(result.archive)).seasons,long.seasonBook);await assert.rejects(Archive.dryRunCompact(long,async()=>false),/checkpoint validation failed/i);
});

test('dry-run compaction rejects missing validation, active work, incomplete timelines, and already compacted rows',async()=>{
 const source=career('blocked',records);await assert.rejects(Archive.dryRunCompact(source),/validator is required/i);const validate=async()=>true;
 for(const key of ['leagueSession','practice','interview']){const active={...source,[key]:{active:true}};await assert.rejects(Archive.dryRunCompact(active,validate),/finish active matches/i);}
 const openBid={...source,bids:{x:{status:'open'}}};await assert.rejects(Archive.dryRunCompact(openBid,validate),/open bids/i);
 const noTimeline={...source,seasonYears:[]};await assert.rejects(Archive.dryRunCompact(noTimeline,validate),/timeline-matched checkpoint/i);
 const legacy={...source};delete legacy.worldCheckpoint;const legacyBefore=JSON.stringify(legacy),legacyValidator=async()=>{throw Error('must not validate a missing checkpoint');};await assert.rejects(Archive.dryRunCompact(legacy,legacyValidator),/timeline-matched checkpoint/i);assert.equal(JSON.stringify(legacy),legacyBefore,'legacy careers without checkpoints remain unchanged and ineligible');
 const compacted={...source,seasonBook:[{...source.seasonBook[0],seasonArchive:{format:1}}]};await assert.rejects(Archive.dryRunCompact(compacted,validate),/restore compacted rows/i);
});

test('oversized archive export/import are refused under a reduced test limit without changing source history',async()=>{
 const sourceText=fs.readFileSync('src/career-archive.js','utf8'),limitedText=sourceText.replace('MAX_BYTES=64*1024*1024','MAX_BYTES=1024');assert.notEqual(limitedText,sourceText);const window={crypto:require('node:crypto').webcrypto},context={window,TextEncoder:require('node:util').TextEncoder,unescape};vm.runInNewContext(limitedText,context);const Limited=context.window.TLCareerArchive,source=career('size-limit',[{year:2026,large:'x'.repeat(2048)}]),before=JSON.stringify(source);
 await assert.rejects(Limited.packV2(source),/safety limit/i);assert.equal(JSON.stringify(source),before,'refused export must leave the original untouched');
 const oversized=await Archive.packV2(source);await assert.rejects(Limited.inspectV2(oversized),/safety limit/i);assert.equal(JSON.stringify(source),before,'refused import must not change the original');
});
