/* Whole luma are the existing career accounting unit. Formatting never changes balances. */
(function(g){'use strict';const number=new Intl.NumberFormat('en-GB',{maximumFractionDigits:0});
function format(n){if(!Number.isSafeInteger(n))return '–';return (n<0?'−':'')+'₥'+number.format(Math.abs(n));}
// Cost basis for property and stall; the car has an explicit resale price.
function personalWealth(s){const cost=n=>(g.TLFASeason||require('./fa-season')).salary(s.profile.nation,n),home=s.familyLife;
 const rows=[['Personal wallet',s.cash??0],['Household reserve',s.household?.reserve??0],['Fixed-term deposit',s.enterprise?.deposit?.principal??0],['Home or construction',home?.owned||home?.building!=null?(home.propertyCost??cost(home.owned==='Townhouse'?95000:72000)):0],['Kit-printing stall',s.enterprise?.stall?(s.enterprise.stall.setupCost??cost(5000)):0],['Car resale value',s.neighbourhood?.car?(g.TLFASeason||require('./fa-season')).rate(s,s.profile.nation,2800):0],['Outstanding personal loan',-(s.support?.loan?.balance||0)]];
 return {rows,total:rows.reduce((sum,[,v])=>sum+v,0)};}
// Older saves contain already-written reports. Group currency tokens at display time only.
function inText(value){return String(value??'').replace(/([₥£])(-?)(\d{4,})(?!\d)/g,(_,unit,sign,digits)=>sign+unit+digits.replace(/\B(?=(\d{3})+(?!\d))/g,','));}
const labels={shareBuy:'Personal share buyback',boardDividend:'Shareholder distribution',personalInvest:'Personal investment',sponsorSign:'Sponsor production cost',sponsorAppear:'Sponsor appearance income',estateMotion:'Club ground investment',homeProperty:'Property purchase or construction',homeMove:'First rent payment',childSupport:'Child enrichment',houseDeposit:'Transfer to household reserve',personChoice:'Personal support',districtTravel:'District travel',districtJob:'District earnings',deposit:'Personal contribution to club',register:'FA registration fee',date:'Date night booking',bookDiary:'Diary booking',hire:'Staff appointment',scout:'Scouting travel',groundMotion:'Ground agreement',advance:'Calendar settlement'};
function record(old,s,cmd){const personal=s.cash-old.cash,club=s.fund-old.fund;if(!personal&&!club)return;const journal=s.lumaJournal||=[];journal.unshift({day:s.day,label:cmd==='districtJob'?s.activity.split(' · ')[0]:labels[cmd]||'Career transaction',personal,club});journal.length=Math.min(journal.length,60);}
// The statement projects the existing journal; switching accounts never touches the save.
function statement(s, account='all', days=3){
 const W=g.TLManagerLife,{esc}=g.TLClubUI, groups=new Map(),journal=s.lumaJournal||[];
 for(const row of journal){
   if(account!=='all'&&!row[account])continue;
   if(!groups.has(row.day))groups.set(row.day,[]);
   groups.get(row.day).push(row);
 }
 const dates=[...groups.keys()].sort((a,b)=>b-a), weekday=new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
 const amount=n=>`<strong class="lm-amount ${n>0?'credit':'debit'}">${n>0?'+':''}${format(n)}</strong>`;
 function movement(r){
   const transfer=r.label===labels.deposit&&r.personal<0&&r.personal===-r.club;
   const parts=[['personal','Wallet',r.personal],['club','Club',r.club]].filter(([k,,n])=>n&&(account==='all'||k===account));
   const kind=transfer?'transfer':parts.length>1?'combined':parts[0]?.[2]>0?'credit':'debit';
   return `<li class="lm-row"><span class="lm-mark ${kind}" aria-hidden="true">${({transfer:'T',combined:'+',credit:'+',debit:'−'})[kind]}</span><div class="lm-purpose"><b>${esc(r.label)}</b><small>${transfer?'Wallet to club treasury':parts.length>1?'Wallet and club':parts[0]?.[0]==='club'?'Club treasury':'Personal wallet'}</small></div><div class="lm-values">${parts.map(([,label,n])=>`<span>${parts.length>1?`<small>${label}</small>`:''}${amount(n)}</span>`).join('')}</div></li>`;
 }
 return `<section class="lm-statement" aria-label="Recent money movements"><header><small>ACCOUNT ACTIVITY</small><h3>Recent movements</h3></header><nav aria-label="Filter movements by account">${[['all','All activity'],['personal','Wallet'],['club','Club']].map(([k,label])=>`<button type="button" data-lm-account="${k}" aria-pressed="${account===k}">${label}</button>`).join('')}</nav>${dates.slice(0,days).map(day=>{const date=W.date(day),rows=groups.get(day);return `<section class="lm-day"><h4><time datetime="${date}">${day===s.day?'Today · ':day===s.day-1?'Yesterday · ':''}${weekday.format(new Date(date+'T12:00:00Z'))}</time><span>${rows.length} ${rows.length===1?'movement':'movements'}</span></h4><ul>${rows.map(movement).join('')}</ul></section>`}).join('')||`<div class="lm-empty">${journal.length?'No movements for this account yet.':'New payments and transfers will appear here.'}</div>`}${dates.length>days?`<button type="button" class="lm-more" data-lm-more="${days+3}" data-lm-current="${account}">Show earlier activity</button>`:''}</section>`;
}
function wallet(s){const W=g.TLManagerLife,{esc}=g.TLClubUI;return `<section class="org"><header class="org-cover luma-cover"><div><small>MERIDIAN MONETARY UNION　 /　 MLU</small><h2>Meridian luma</h2><p>One currency across all twenty countries.</p></div><b aria-hidden="true">₥</b></header><div class="luma-accounts">${[['Personal wallet',s.cash,'Income from work and personal spending.'],['Club treasury',s.fund,'Registration, investment, staff and ground costs.']].map(([label,n,desc])=>`<article class="org-agenda"><small>${label}</small><h2>${format(n)}</h2><p>${desc}</p></article>`).join('')}</div>${[100,1000,5000,25000].map(v=>`<button data-life="deposit" data-v="${v}" ${s.cash<v?'disabled':''}>Contribute ${format(v)}</button>`).join(' ')}${statement(s)}</section>`;}
const api={personalWealth,format,inText,record,statement,wallet};g.TLLuma=api;if(typeof module!=='undefined')module.exports=api;})(typeof window==='undefined'?globalThis:window);
