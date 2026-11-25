'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),Archive=require('../src/career-archive');
const source=fs.readFileSync('src/season-book.js','utf8');
function renderWith(career){const window={TLClubUI:{esc:x=>String(x),art:()=>''},TLTurnover:{season:()=>2028},TLManagerLife:{nations:{Valdoria:['Home','Away']},pool:[]},TLCareerArchive:Archive};vm.runInNewContext(source,{window});return window.TLSeasonBook.render(career,'Valdoria');}
const fullRecord={year:2026,nations:{Valdoria:{clubs:['Home','Away'],table:[['Home',1,1,3],['Away',1,-1,0]],results:[[0,1,2,1]],honours:[],boot:['Ada','Home',1]}},departures:[],intake:0,worldAwards:[],cupAwards:[],cupHonours:[]};

test('compact season renders useful tables without pretending missing results are empty',async()=>{
 const bundle=await Archive.packV2({id:'viewer',profile:{name:'Ada'},seasonYears:[2027],seasonBook:[fullRecord]}),stub={...fullRecord,nations:{Valdoria:{...fullRecord.nations.Valdoria,resultsCount:1}}};delete stub.nations.Valdoria.results;stub.seasonArchive={format:1,detail:'external',archiveId:bundle.archiveId,recordSha256:bundle.records[0].sha256};const career={id:'viewer',day:0,seasonYears:[2027],seasonBook:[stub]};
 const summary=renderWith(career);assert.match(summary,/compact summary/);assert.match(summary,/Home/);assert.match(summary,/Exact match results are in this season’s external history archive/);assert.doesNotMatch(summary,/2–1/);
 await Archive.attach(career,bundle);const exact=renderWith(career);assert.match(exact,/2–1/);assert.doesNotMatch(exact,/Attach the matching season-history archive/);Archive.detach(career.id);
});
