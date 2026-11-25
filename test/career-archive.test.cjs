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
