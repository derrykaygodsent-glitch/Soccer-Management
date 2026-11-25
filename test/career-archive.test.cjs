const test=require('node:test'),assert=require('node:assert/strict'),Archive=require('../src/career-archive');

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

test('version-2 restore replaces only matching compact stubs and is idempotent',async()=>{
 const bundle=await Archive.packV2(career()),stubs=records.map((row,i)=>({...row,nations:{Valdoria:{table:row.nations.Valdoria.table,resultsCount:row.nations.Valdoria.results.length}},seasonArchive:{format:1,detail:'external',archiveId:bundle.archiveId,recordSha256:bundle.records[i].sha256}})),compact=career('archive-test',stubs),before=JSON.stringify(compact);
 const restored=await Archive.mergeAny(compact,bundle);assert.equal(restored.restored,2);assert.deepEqual(restored.career.seasonBook,records);assert.equal(JSON.stringify(compact),before);
 const again=await Archive.mergeAny(restored.career,bundle);assert.equal(again.restored,0);assert.equal(again.added,0);
 const mismatched=career('archive-test',[{...stubs[0],seasonArchive:{...stubs[0].seasonArchive,archiveId:'other-archive'}}]);await assert.rejects(Archive.mergeAny(mismatched,bundle),/compact archive reference/i);
});
