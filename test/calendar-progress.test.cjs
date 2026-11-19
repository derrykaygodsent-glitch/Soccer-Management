'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const K=require('../src/season-calendar');
const S=require('../src/season-state');
const {create,gate}=require('../src/calendar-progress');
const pauseDay=K.date('2026-10-29');
function fixture(){
  const memory=new Map(), storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};
  const store=S.open(storage), frames=[], stops=[], timers=new Map();let id=0;
  const timer=(fn,delay)=>{assert.ok(delay>0);timers.set(++id,fn);return id;};
  const machine=pauseAt=>create({store,pauseAt,schedule:timer,cancel:k=>timers.delete(k),onFrame:f=>frames.push(f),onStop:f=>stops.push(f)});
  const step=()=>{const [key,fn]=timers.entries().next().value;timers.delete(key);fn();};
  return {machine,store,storage,frames,stops,step,timers};
}
function decisions(store){
  assert.ok(store.answer('staff-cup','set'));
  assert.ok(store.answer('press-cup','respect'));
}

test('Continue walks the guarded date ledger until mandatory decisions; read alone does not resume',()=>{
  const {store,machine,step,frames,stops,timers}=fixture(), p=machine();
  assert.ok(p.start());assert.ok(p.running);assert.equal(frames[0].days,0);assert.equal(timers.size,1);
  assert.equal(p.start(),false);step();
  assert.equal(K.iso(store.value.now),'2026-10-27');assert.equal(stops[0].reason,'decision');assert.deepEqual(stops[0].messages,['load-review']);assert.equal(stops[0].days,1);
  store.read('load-review');assert.equal(p.start(),false);assert.equal(p.running,false);assert.equal(timers.size,0);
  assert.ok(store.answer('load-review','light'));
  assert.ok(p.start());step();
  assert.equal(K.iso(store.value.now),'2026-10-28');assert.deepEqual(stops[1].messages,['staff-cup','press-cup']);assert.equal(timers.size,0);
  assert.equal(p.running,false);assert.equal(store.value.session,null);
});

test('one Continue traverses multiple quiet dates and stops at matchday without entering or playing a fixture',()=>{
  const {store,machine,step,frames,stops,timers,storage}=fixture(), p=machine();
  assert.ok(store.advance());assert.ok(store.answer('load-review','light'));assert.ok(store.advance());
  assert.ok(store.answer('staff-cup','set'));assert.ok(store.answer('press-cup','respect'));
  assert.ok(p.start());step();assert.equal(K.iso(store.value.now),'2026-10-29');assert.ok(p.running);
  assert.deepEqual(frames.map(f=>f.days),[0,1]);step();
  assert.equal(p.running,false);assert.equal(timers.size,0);assert.equal(stops.at(-1).reason,'fixture');assert.equal(stops.at(-1).days,2);
  assert.equal(stops.at(-1).fixture,'2026-10-30-hpt');assert.equal(store.value.session,null);assert.deepEqual(store.value.results,{});
  const reloaded=S.open(storage);assert.equal(reloaded.value.now,store.value.now);assert.equal(gate(reloaded.value).reason,'fixture');
  assert.ok(reloaded.enter());assert.equal(reloaded.value.session.stage,'meeting');assert.equal(gate(reloaded.value).reason,'session');
});

test('manual stop keeps the last committed date and cannot leave a stale timer advancing a new run',()=>{
  const {store,machine,frames,stops,step,timers,storage}=fixture(), p=machine();
  assert.ok(store.advance());assert.ok(store.answer('load-review','light'));assert.ok(store.advance());decisions(store);
  p.start();step();const now=store.value.now, old=[...timers.values()][0];assert.ok(p.stop());
  assert.equal(stops.at(-1).reason,'manual');assert.equal(stops.at(-1).days,1);assert.equal(p.running,false);assert.equal(timers.size,0);
  assert.equal(S.open(storage).value.now,now);assert.equal(p.stop(),false);p.start();old();
  assert.equal(store.value.now,now);assert.ok(p.running);assert.equal(frames.at(-1).days,0);assert.equal(timers.size,1);
  step();assert.equal(stops.at(-1).reason,'fixture');assert.equal(stops.at(-1).days,1);
});

test('a chosen date pauses once in the view; gates have priority over an optional stop',()=>{
  const {store,machine,step,stops}=fixture();
  assert.ok(store.advance());assert.ok(store.answer('load-review','light'));assert.ok(store.advance());decisions(store);
  const p=machine(()=>pauseDay);assert.ok(p.start());step();assert.equal(stops[0].reason,'target');assert.equal(store.value.session,null);
  assert.ok(p.start());step();assert.equal(stops[1].reason,'fixture');assert.equal(gate(store.value,K.day(store.value.now)).reason,'fixture');
});

test('the season-end fence keeps the day and refuses any further processing',()=>{
  let s=S.open().value;
  // Mock a concluded fixture list using the same read-only clock gate at end of schedule.
  // The already archived Riverside results are not needed to prove the end branch:
  // K.due only opens fixtures on their actual date, never at the August fence.
  s={...s,now:K.end,answers:{'load-review':'light','staff-cup':'set','press-cup':'respect'}};
  const store={value:s,advance:()=>assert.fail('the season end must not tick')};
  const p=create({store,schedule:()=>assert.fail('do not enqueue beyond the fence')});
  assert.equal(gate(s).reason,'end');assert.equal(p.start(),false);assert.equal(p.running,false);
});
