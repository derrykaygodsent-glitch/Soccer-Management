/* Career-local worldwide acquisitions: a control purchase brings cash and a new board mandate. */
(function(g){'use strict';
const D=g.TLData||require('./data'),Y=g.TLTurnover||require('./season-turnover');
const brands=['Northstar','Meridian','Asterion','Harbourlight','Crownbridge','Sable','Bluehaven','Keystone','Redwood','Atlas'];
const suffix=['Capital Partners','Football Group','Sporting Holdings','Consortium','Global Sport'];
const reasons=['A long-term investment in the academy and training ground','A push to qualify for continental competition','A new multi-club sporting project','A commitment to modernise recruitment and facilities'];
function name(id){const h=D.seedFor(id);return brands[h%brands.length]+' '+suffix[Math.floor(h/17)%suffix.length];}
function morning(s,countries,mail){if(!s.worldVersion||s.legacy?.exit||s.day%70!==0||s.lastConsortiumReviewDay===s.day)return null;const candidates=[];for(const [nation,clubs] of Object.entries(countries||{}))for(const club of clubs){if(club===s.club?.name)continue;const old=s.clubOwnership?.[club];if(old&&s.day-old.acquired<1460)continue;candidates.push({nation,club});}if(!candidates.length){s.lastConsortiumReviewDay=s.day;return null;}s.lastConsortiumReviewDay=s.day;
 const choice=candidates[D.seedFor(s.id+':consortium-cycle:'+Math.floor(s.day/70))%candidates.length],key=`${choice.club}|${s.day}`,consortium=name(s.id+':'+key),funds=250000+D.seedFor(key+':capital')%1000001,oldBudget=s.marketFunds?.[choice.club]??65000+D.seedFor(choice.club)%180000,coach=g.TLTechnical.person(s.id+':consortium-coach:'+key),previous=g.TLTechnical.office(s,choice.club,choice.nation,countries[choice.nation]).coach,target=1+D.seedFor(key+':target')%3;
 (s.marketFunds||={})[choice.club]=oldBudget+funds;(s.clubOwnership||={})[choice.club]={consortium,shares:60,acquired:s.day,capital:funds,target,nation:choice.nation};g.TLTechnical.record(s,choice.club,coach,'Consortium takeover',previous||null);
 const deal={id:key,day:s.day,club:choice.club,nation:choice.nation,consortium,shares:60,capital:funds,target,reason:reasons[D.seedFor(key+':reason')%reasons.length],formerCoach:previous?.name||null,newCoach:coach.name};(s.takeoverHistory||=[]).unshift(deal);s.takeoverHistory.length=Math.min(100,s.takeoverHistory.length);
 mail('Meridian Wire',`${consortium} completed a 60% controlling acquisition of ${choice.club} (${choice.nation}), committing ${g.TLManagerLife.money(funds)} to the club. ${deal.reason}. ${coach.name} takes charge with a top-${target} board target.`);return deal;
}
function current(s,club){return s.clubOwnership?.[club]||null;}
function history(s,club){return (s.takeoverHistory||[]).filter(x=>!club||x.club===club);}
const api={morning,current,history,name};g.TLConsortium=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
