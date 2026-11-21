const test=require('node:test'),a=require('node:assert/strict'),R=require('../src/team-dynamics');
test('stars normalize by natural role and ties stay equal',()=>{const p=(id,pos,n)=>({id,pos,attrs:new Proxy({}, {get:()=>n})});a.deepEqual(R.squadStars([p('a','GK',16),p('b','ST',16),p('c','FB',5)]),{a:4,b:4,c:1});});
test('match form waits for evidence and compares equal windows',()=>{for(const [rs,k] of [[[],'pending'],[[7],'pending'],[[7,7.2],'up'],[[7,6.8],'down'],[[8,6,6,6,6],'steady']])a.equal(R.formTrend(rs),k);});
