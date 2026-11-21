const test=require('node:test'),a=require('node:assert/strict');global.TLData=require('../src/data');require('../src/board-room');const B=global.TLBoardRoom;
test('every formation has eleven distinct positional shirt numbers, keeper first',()=>{for(const f of Object.keys(TLData.FORMATIONS)){const ns=B.positionalNumbers(f);a.equal(ns[0],1);a.deepEqual(ns.slice().sort((a,b)=>a-b),Array.from({length:11},(_,i)=>i+1));}});
test('moving a marker on the stretched pitch inverts the display coordinates',()=>{for(let i=0;i<=100;i++){const x=i/100;a.ok(Math.abs(B.project(B.project(x),true)-x)<1e-8);}});
