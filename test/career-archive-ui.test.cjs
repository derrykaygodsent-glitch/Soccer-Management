'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),Archive=require('../src/career-archive'),Compaction=require('../src/career-compaction');
const source=fs.readFileSync('src/cloud.js','utf8').replace('/* @CLOUD@ */ {}',JSON.stringify({url:'',key:'',engine:'test-engine'}));
function setup(career,{failImportOnce=false,confirm=true}={}){
 const nodes=new Map(),local=new Map(),session=new Map(),listeners={},blobs=[],confirmations=[],window={TLCareerArchive:Archive,TLCareerCompaction:Compaction,TLManagerLife:{validateCheckpoint:()=>true},TLCareerFiles:{confirm:async(...args)=>{confirmations.push(args);return confirm;}}},location={reloaded:false,reload(){this.reloaded=true;}};
 local.set('touchline.careers.v2',JSON.stringify([career]));
 const node=selector=>{if(!nodes.has(selector))nodes.set(selector,{value:'',textContent:'',disabled:false,hidden:false});return nodes.get(selector);};
 const dialog={querySelector:node,setAttribute(){},addEventListener:(name,fn)=>listeners[name]=fn};
 const document={createElement:tag=>tag==='dialog'?dialog:{click(){}},body:{append(){}},addEventListener(){}};
 const URLMock={createObjectURL:blob=>{blobs.push(blob);return'blob:test';},revokeObjectURL(){}};
 const storage={getItem:k=>local.has(k)?local.get(k):null,setItem:(k,v)=>local.set(k,v),removeItem:k=>local.delete(k)};
 vm.runInNewContext(source,{window,document,TextEncoder,Date,JSON,URL:URLMock,Blob,location,localStorage:storage,sessionStorage:{setItem:(k,v)=>session.set(k,v),getItem:k=>session.get(k)||null,removeItem:k=>session.delete(k)},setTimeout(){}});
 let saved=null,refreshes=0,fail=failImportOnce,imports=0;
 window.TLCloud.init({current:()=>career,find:id=>career.id===id?career:null,import:c=>{imports++;if(fail){fail=false;throw Error('simulated interruption before local save replacement');}saved=c;career=c;const slots=JSON.parse(local.get('touchline.careers.v2')||'[]');local.set('touchline.careers.v2',JSON.stringify(slots.filter(x=>x.id!==c.id).concat(c)));local.set('touchline.recent.v2',c.id);},refresh:()=>refreshes++});
 const fire=async action=>listeners.click({target:{closest:selector=>selector==='[data-action]'?{dataset:{action}}:null}});
 return{nodes,node,local,session,location,window,blobs,confirmations,get refreshes(){return refreshes;},get imports(){return imports;},current:()=>career,restorePrevious:()=>fire('recover'),exportHistory:()=>fire('exportHistory'),reviewCompaction:()=>fire('reviewCompaction'),compactReviewed:()=>fire('compactReviewed'),verifyHistory:async archive=>{const input=node('[data-history-verify]'),text=JSON.stringify(archive);await input.onchange({target:{files:[{name:'saved-history.json',size:Buffer.byteLength(text),text:async()=>text}],value:''}});},importArchive:async archive=>{const input=node('[data-history-import]');await input.onchange({target:{files:[{size:Buffer.byteLength(JSON.stringify(archive)),text:async()=>JSON.stringify(archive)}],value:''}});return saved;},attachArchive:async archive=>{const input=node('[data-history-attach]');await input.onchange({target:{files:[{size:Buffer.byteLength(JSON.stringify(archive)),text:async()=>JSON.stringify(archive)}],value:''}});return saved;}};
}

test('locker restore backs up the active career and imports exact missing archive records',async()=>{
 const original={id:'same-career',profile:{name:'Ari'},day:42,seasonYears:[2027],seasonBook:[],plans:[],mail:[],roster:[],staff:[],fund:100,cash:30},bundle=Archive.pack({...original,seasonBook:[{year:2026,nations:{A:{results:[[0,1,2,1]]}}}]});
 const app=setup(original),saved=await app.importArchive(bundle);assert.equal(saved.seasonBook.length,1);assert.deepEqual(JSON.parse(JSON.stringify(saved.seasonBook[0])),{year:2026,nations:{A:{results:[[0,1,2,1]]}}});assert.equal(app.location.reloaded,true);const backup=JSON.parse(app.local.get('touchline.manager.cloud.backup.v2'));assert.equal(backup.snapshot.career.seasonBook.length,0);
});

test('locker refuses a conflicting archive without replacing or reloading the career',async()=>{
 const original={id:'same-career',profile:{name:'Ari'},day:42,seasonYears:[2027],seasonBook:[{year:2026,result:'played'}],plans:[],mail:[],roster:[],staff:[],fund:100,cash:30},bundle=Archive.pack({...original,seasonBook:[{year:2026,result:'different'}]});
 const app=setup(original),saved=await app.importArchive(bundle);assert.equal(saved,null);assert.equal(app.location.reloaded,false);assert.match(app.node('[role=status]').textContent,/different history/);
});

test('locker verifies the selected saved archive only after export and binds proof to the unchanged career and exact manifest',async()=>{
 const career={id:'proof-career',profile:{name:'Ari'},day:42,seasonYears:[2027,2028],seasonBook:[{year:2026,nations:{A:{table:[['North',1,2,3]],results:[[0,1,2,1]]}}},{year:2027,nations:{A:{table:[['North',2,3,6]],results:[[0,1,3,2]]}}}]},app=setup(career);
 await app.verifyHistory(await Archive.packV2(career));assert.match(app.node('[role=status]').textContent,/Export the full season history first/);
 await app.exportHistory();assert.match(app.node('[role=status]').textContent,/Select that saved file/);const savedFile=JSON.parse(await app.blobs[0].text());await app.verifyHistory(savedFile);assert.match(app.node('[role=status]').textContent,/Saved file verified: saved-history\.json · 2 exact seasons/);assert.match(app.node('[role=status]').textContent,/Career unchanged/);
 await app.exportHistory();const exported=JSON.parse(await app.blobs[1].text()),differentArchive=await Archive.packV2(career);assert.notEqual(exported.archiveId,differentArchive.archiveId);await app.verifyHistory(differentArchive);assert.match(app.node('[role=status]').textContent,/not the exact archive exported/);
 await app.exportHistory();const newest=JSON.parse(await app.blobs[2].text());career.day++;await app.verifyHistory(newest);assert.match(app.node('[role=status]').textContent,/Export the full season history first/);assert.equal(career.day,43,'verification must not mutate or replace the career');
});

test('locker attachment is read-only, session-scoped, and does not reload or save the career',async()=>{
 const full={id:'same-career',profile:{name:'Ari'},day:42,seasonYears:[2027],seasonBook:[{year:2026,nations:{A:{results:[[0,1,2,1]]}}}]},bundle=await Archive.packV2(full),stub={...full.seasonBook[0],nations:{A:{resultsCount:1}},seasonArchive:{format:1,detail:'external',archiveId:bundle.archiveId,recordSha256:bundle.records[0].sha256}},compact={...full,seasonBook:[stub]},app=setup(compact),before=JSON.stringify(compact);
 const saved=await app.attachArchive(bundle);assert.equal(saved,null);assert.equal(app.location.reloaded,false);assert.equal(app.refreshes,1);assert.equal(JSON.stringify(compact),before);assert.match(app.node('[role=status]').textContent,/Attached 1 exact season record/);assert.deepEqual(Archive.readRecord(compact,2026),full.seasonBook[0]);Archive.detach(compact.id);
});

test('interruption before local replacement leaves the copied career intact and recovery restores its backup',async()=>{
 const original={id:'interrupt-copy',profile:{name:'Ari',children:[]},day:42,seasonYears:[2027],seasonBook:[],plans:[],mail:[],roster:[],staff:[],fund:100,cash:30},before=JSON.stringify(original),bundle=Archive.pack({...original,seasonBook:[{year:2026,nations:{A:{results:[[0,1,2,1]]}}}]}),app=setup(original,{failImportOnce:true});
 await app.importArchive(bundle);assert.equal(JSON.stringify(app.current()),before,'failure before replacement must keep the active save unchanged');assert.equal(app.location.reloaded,false);assert.match(app.node('[role=status]').textContent,/simulated interruption/);const backup=JSON.parse(app.local.get('touchline.manager.cloud.backup.v2'));assert.equal(JSON.stringify(backup.snapshot.career),before,'the pre-change copy must already be durable');
 await app.restorePrevious();assert.equal(JSON.stringify(app.current()),before,'recovery must restore the pre-change state');assert.equal(app.location.reloaded,true);assert.equal(app.imports,2);
});

test('locker requires the saved export, shows a dry run, and only compacts after a separate confirmed local action',async()=>{
 const seasons=Array.from({length:8},(_,i)=>({year:2026+i,nations:{Valdoria:{table:[['North FC',20,14,42]],results:Array.from({length:20},(_,j)=>[0,1,i+j,0])}},development:{},departures:[],intake:0})),career={id:'local-compact-ui',profile:{name:'Ari',children:[]},day:900,seasonYears:Array.from({length:8},(_,i)=>2027+i),seasonBook:seasons,worldCheckpoint:{throughYear:2030,version:1},plans:[],mail:[],roster:[],staff:[],fund:100,cash:30},before=JSON.stringify(career),app=setup(career);
 await app.reviewCompaction();assert.match(app.node('[role=status]').textContent,/Export and verify/);
 await app.exportHistory();const archive=JSON.parse(await app.blobs[0].text());await app.verifyHistory(archive);assert.equal(app.node('[data-action=reviewCompaction]').hidden,false);await app.reviewCompaction();assert.match(app.node('[data-compaction-summary]').textContent,/Review only · seasons 2026, 2027, 2028/);assert.equal(JSON.stringify(app.current()),before,'review is non-mutating');assert.equal(app.node('[data-action=compactReviewed]').hidden,false);
 await app.compactReviewed();assert.equal(app.location.reloaded,true);const compact=app.current();assert.ok(compact.seasonBook[0].seasonArchive);assert.equal(Object.hasOwn(compact.seasonBook[0].nations.Valdoria,'results'),false);assert.equal(compact.seasonBook.at(-1).nations.Valdoria.results.length,20);const backup=JSON.parse(app.local.get('touchline.manager.cloud.backup.v2'));assert.equal(JSON.stringify(backup.snapshot.career),before);assert.equal(app.confirmations.length,1);assert.match(app.confirmations[0][0],/does not update any cloud save/i);
 await app.restorePrevious();assert.equal(JSON.stringify(app.current()),before,'recovery restores the full source without overwriting the recovery copy; status: '+app.node('[role=status]').textContent);assert.equal(app.location.reloaded,true);assert.equal(JSON.stringify(JSON.parse(app.local.get('touchline.manager.cloud.backup.v2')).snapshot.career),before,'the full recovery backup remains available after restore');
});

test('declining local compaction keeps both the active career and prior recovery backup unchanged',async()=>{
 const seasons=Array.from({length:8},(_,i)=>({year:2026+i,nations:{Valdoria:{results:[[0,1,i,0]]}}})),career={id:'declined-local-compact',profile:{name:'Ari'},day:900,seasonYears:Array.from({length:8},(_,i)=>2027+i),seasonBook:seasons,worldCheckpoint:{throughYear:2030,version:1},plans:[],mail:[],roster:[],staff:[],fund:100,cash:30},before=JSON.stringify(career),app=setup(career,{confirm:false});
 await app.exportHistory();await app.verifyHistory(JSON.parse(await app.blobs[0].text()));await app.reviewCompaction();app.local.set('touchline.manager.cloud.backup.v2','prior-recovery');await app.compactReviewed();assert.equal(JSON.stringify(app.current()),before);assert.equal(app.local.get('touchline.manager.cloud.backup.v2'),'prior-recovery');assert.equal(app.location.reloaded,false);assert.match(app.node('[role=status]').textContent,/cancelled/i);
});
