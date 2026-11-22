'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs');
const Season=require('../src/season-state.js'),Club=require('../src/club-state.js');
const Q=require('../src/season-match.js'),V=require('../src/highlights.js');

test('private slot round trip, replay, RLS and stale revision rejection',async t=>{
  const db=new PGlite();t.after(()=>db.close());
  const alice='00000000-0000-4000-8000-000000000001',bob='00000000-0000-4000-8000-000000000002';
  // Only GoTrue identity plumbing is stubbed; run the release migration as written.
  await db.exec(`create role anon;create role authenticated;create schema auth;
    create table auth.users(id uuid primary key);insert into auth.users values ('${alice}'),('${bob}');
    create function auth.uid() returns uuid language sql stable as $$ select current_setting('app.uid',true)::uuid $$;
    grant usage on schema auth to authenticated;`);
  await db.exec(fs.readFileSync('supabase/migrations/202611190001_careers.sql','utf8'));
  const s=Season.open(),c=Club.open();c.apply('budget',5000);
  s.advance();s.answer('load-review','light');s.advance();s.answer('staff-cup','set');s.answer('press-cup','respect');s.advance();s.advance();s.enter();s.move('meeting','selection');s.submit();
  for(const [from,to] of [['briefing','news'],['news','preTalk'],['preTalk','preview'],['preview','live']])s.move(from,to);
  assert.equal(s.value.session.checkpoint.started,false);
  const m=Q.create(s.fixture(),s.value.session);for(let i=0;i<400;i++)m.step(V.STEP);
  const cmd={type:'tactic',change:{formation:'3-5-2',line:0}};Q.applyCommand(m,0,cmd);s.checkpoint(Q.ticks(m),cmd,true);
  const career={format:1,engine:'test',season:s.value,club:c.value,extras:['Laptops notes',null,null]};
  const write=(slot,rev)=>db.query('select * from public.touchline_save($1,$2,$3,$4)',[slot,rev,'Riverside',JSON.stringify(career)]);
  await db.exec(`set role authenticated;set app.uid='${alice}'`);
  const {slot_id:id}= (await write(null,0)).rows[0];
  assert.equal((await write(id,1)).rows[0].saved_revision,2);assert.deepEqual((await write(id,1)).rows,[]);
  const [{payload}]=(await db.query('select payload from touchline_careers')).rows;
  const phone=new Map([[Season.key,JSON.stringify(payload.season)],[Club.key,JSON.stringify(payload.club)]]),storage={getItem:k=>phone.get(k)};
  const restored=Season.open(storage);assert.deepEqual(restored.value,s.value);assert.deepEqual(Club.open(storage).value,c.value);
  assert.deepEqual(Q.create(restored.fixture(),restored.value.session).snapshotFrame(),m.snapshotFrame());
  await db.exec(`set app.uid='${bob}'`);assert.deepEqual((await db.query('select * from touchline_careers')).rows,[]);assert.deepEqual((await write(id,2)).rows,[]);
  await assert.rejects(db.exec('update touchline_careers set revision=3'),/permission denied/);
  await db.exec('reset role;set role anon');await assert.rejects(write(null,0),/permission denied/);await assert.rejects(db.query('select * from touchline_careers'),/permission denied/);
});

test('cloud slots are capped per account and owners can delete only the current revision',async t=>{
  const db=new PGlite();t.after(()=>db.close());
  const alice='00000000-0000-4000-8000-000000000011',bob='00000000-0000-4000-8000-000000000012';
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);insert into auth.users values ('${alice}'),('${bob}');create function auth.uid() returns uuid language sql stable as $$ select current_setting('app.uid',true)::uuid $$;grant usage on schema auth to authenticated;`);
  await db.exec(fs.readFileSync('supabase/migrations/202611190001_careers.sql','utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/202611190003_cloud_slot_limits_and_delete.sql','utf8'));
  const save=(label)=>db.query('select * from public.touchline_save($1,$2,$3,$4)',[null,0,label,JSON.stringify({career:{label}})]),remove=(id,rev)=>db.query('select * from public.touchline_delete($1,$2)',[id,rev]);
  await db.exec(`set role authenticated;set app.uid='${alice}'`);
  const ids=[];for(let i=0;i<10;i++)ids.push((await save('slot '+i)).rows[0].slot_id);
  await assert.rejects(save('eleventh'),/Cloud save limit reached/);
  assert.deepEqual((await remove(ids[0],99)).rows,[],'stale delete cannot remove a newer revision');
  await db.exec(`set app.uid='${bob}'`);assert.deepEqual((await remove(ids[0],1)).rows,[],'another account cannot delete the save');
  await db.exec(`set app.uid='${alice}'`);assert.equal((await remove(ids[0],1)).rows[0].deleted_id,ids[0]);
  assert.equal((await save('replacement')).rows.length,1,'a freed slot can be reused');
  await assert.rejects(db.exec('delete from public.touchline_careers'),/permission denied/);
});
