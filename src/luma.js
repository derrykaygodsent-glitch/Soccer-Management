/* Whole luma are the existing career accounting unit. Formatting never changes balances. */
(function(g){'use strict';const number=new Intl.NumberFormat('en-GB',{maximumFractionDigits:0});
function format(n){if(!Number.isSafeInteger(n))return '–';return (n<0?'−':'')+'₥'+number.format(Math.abs(n));}
// Cost basis for property and stall; the car has an explicit resale price.
function personalWealth(s){const cost=n=>(g.TLFASeason||require('./fa-season')).salary(s.profile.nation,n),home=s.familyLife;
 const rows=[['Personal wallet',s.cash??0],['Household reserve',s.household?.reserve??0],['Fixed-term deposit',s.enterprise?.deposit?.principal??0],['Home or construction',home?.owned||home?.building!=null?(home.propertyCost??cost(home.owned==='Townhouse'?95000:72000)):0],['Kit-printing stall',s.enterprise?.stall?(s.enterprise.stall.setupCost??cost(5000)):0],['Car resale value',s.neighbourhood?.car?(g.TLFASeason||require('./fa-season')).rate(s,s.profile.nation,2800):0],['Outstanding personal loan',-(s.support?.loan?.balance||0)]];
 return {rows,total:rows.reduce((sum,[,v])=>sum+v,0)};}
// Older saves contain already-written reports. Group currency tokens at display time only.
function inText(value){return String(value??'').replace(/([₥£])(-?)(\d{4,})(?!\d)/g,(_,unit,sign,digits)=>sign+unit+digits.replace(/\B(?=(\d{3})+(?!\d))/g,','));}
const labels={shareBuy:'Personal share buyback',boardDividend:'Shareholder distribution',personalInvest:'Personal investment',sponsorSign:'Sponsor production cost',sponsorAppear:'Sponsor appearance income',estateMotion:'Club ground investment',homeProperty:'Property purchase or construction',homeMove:'First rent payment',childSupport:'Child enrichment',houseDeposit:'Transfer to household reserve',personChoice:'Personal support',districtTravel:'District travel',districtJob:'District earnings',deposit:'Personal contribution to club',register:'Club founding application fee',date:'Date night booking',bookDiary:'Diary booking',hire:'Staff appointment',scout:'Scouting travel',groundMotion:'Ground agreement',advance:'Calendar settlement'};
function record(old,s,cmd){const personal=s.cash-old.cash,club=s.fund-old.fund;if(!personal&&!club)return;const journal=s.lumaJournal||=[];journal.unshift({day:s.day,label:cmd==='districtJob'?s.activity.split(' · ')[0]:labels[cmd]||'Career transaction',personal,club});journal.length=Math.min(journal.length,60);}
// The statement projects the existing journal; switching accounts never touches the save.
function statement(s, account='all', days=3, from=null, label='', ui={}){
 const W=g.TLManagerLife,{esc}=g.TLClubUI, groups=new Map(),journal=s.lumaJournal||[];
 for(const row of journal){
   if(account!=='all'&&!row[account])continue;
   if(from!=null&&row.day<from)continue;
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
 return `<section class="lm-statement" aria-label="Recent money movements"><header><small>ACCOUNT ACTIVITY${label?`<span class="lm-window"> · ${esc(label)}</span>`:''}</small><h3>Recent movements</h3></header><nav aria-label="Filter movements by account">${[['all','All activity'],['personal','Wallet'],['club','Club']].map(([k,label])=>`<button type="button" data-lm-account="${k}" aria-pressed="${account===k}">${label}</button>`).join('')}</nav>${ui.page?'<div class="lm-days" data-wire-stream="movements" data-wire-key="personal:movements" data-wire-size="10" data-wire-size-phone="6" data-wire-noun="days">':''}${dates.slice(0,days).map(day=>{const date=W.date(day),rows=groups.get(day);return `<section class="lm-day"><h4><time datetime="${date}">${day===s.day?'Today · ':day===s.day-1?'Yesterday · ':''}${weekday.format(new Date(date+'T12:00:00Z'))}</time><span>${rows.length} ${rows.length===1?'movement':'movements'}</span></h4><ul>${rows.map(movement).join('')}</ul></section>`}).join('')||`<div class="lm-empty">${journal.length?'No movements for this account yet.':'New payments and transfers will appear here.'}</div>`}${dates.length>days?`<button type="button" class="lm-more" data-lm-more="${days+3}" data-lm-current="${account}">Show earlier activity</button>`:''}${ui.page?'</div>':''}</section>`;
}
const PERIODS=[['1','Today'],['7','7 days'],['30','30 days'],['all','Season']];
function windowFrom(s,key){const n=key==='all'?null:Number(key);return n==null||!Number.isFinite(n)||n<1?null:Math.max(1,s.day-n+1);}
function windowLabel(s,key){const n=key==='all'?null:Number(key);return n==null?'the season so far':n===1?'today':`the last ${n} days`;}
function fullDay(iso){const d=new Date(iso+'T12:00:00Z');return Number.isNaN(d.getTime())?iso:d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});}
function shortDay(iso){const d=new Date(iso+'T12:00:00Z');return Number.isNaN(d.getTime())?iso:d.toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'});}
function wageBill(s){return Object.values(s.contracts||{}).reduce((n,c)=>n+(c.wage||0),0);}
function windowRows(s,from){return (s.lumaJournal||[]).filter(r=>from==null||r.day>=from);}
// The rail states the money that exists: what you can spend, what the club can spend, and what payroll is.
function rail(s,ui){const W=g.TLManagerLife,wage=wageBill(s),from=windowFrom(s,ui.period),rows=windowRows(s,from),
  club=rows.reduce((n,r)=>n+(r.club||0),0),personal=rows.reduce((n,r)=>n+(r.personal||0),0),net=club+personal,
  cell=(label,value,note,cls='')=>`<div><small>${g.TLClubUI.esc(label)}</small><b${cls?` class="${cls}"`:''}>${value}</b><em>${g.TLClubUI.esc(note)}</em></div>`;
 return `<div class="cp-kpis lm-rail">${cell('Personal wallet',format(s.cash??0),'Yours to spend — income from work')}${cell('Club treasury',format(s.fund??0),'Club money — registration, staff, ground')}${cell('Wage bill',wage?`${format(wage)}/wk`:'No contracts',wage?'Committed weekly wages':`${(s.roster||[]).length} players on amateur terms`)}${cell(`Net · ${(PERIODS.find(([k])=>k===ui.period)||[])[1]||'30 days'}`,`${net>0?'+':''}${format(net)}`,`Wallet ${personal>=0?'+':''}${format(personal)} · club ${club>=0?'+':''}${format(club)}`,net>0?'lm-good':'lm-bad')}</div>`;}
// Burn is measured on club money over the last 30 days, whatever period the statement is showing.
function runway(s){const j=s.lumaJournal||[],from=Math.max(1,s.day-29),rows=j.filter(r=>r.day>=from),out=rows.reduce((n,r)=>n-Math.min(0,r.club||0),0),span=Math.max(1,Math.min(30,s.day-from+1)),burn=out/span;
 if(!out)return {ok:true,text:`No club spending in the last 30 days, so there is no burn to run down against a treasury of ${format(s.fund??0)}.`};
 const days=Math.floor((s.fund??0)/burn);
 if(!Number.isFinite(days)||days<=0)return {ok:false,text:`At ${format(Math.round(burn))} a day the treasury is already spent: it covers less than a day of club spending.`};
 return {ok:days>=30,text:`At the last 30 days' rate (${format(Math.round(burn))} a day) the treasury covers about ${days} ${days===1?'day':'days'} of club spending.`};}
function dailyClub(s,from){const map=new Map();
 for(const r of windowRows(s,from)){const n=r.club||0;if(!n)continue;const d=map.get(r.day)||{day:r.day,in:0,out:0};if(n>0)d.in+=n;else d.out-=n;map.set(r.day,d);}
 return [...map.values()].sort((a,b)=>a.day-b.day);}
// A chart with the same numbers available as a table: nothing here is only drawn.
const BAR_CAP=14;
function chartBlock(s,ui){const W=g.TLManagerLife,from=windowFrom(s,ui.period),all=dailyClub(s,from),drawn=all.slice(-BAR_CAP),
 head=(title)=>`<header class="lm-chart-head"><h3>${title}</h3><div class="lm-view" role="group" aria-label="Show club money as"><button type="button" data-lm-view="chart" aria-pressed="${ui.view!=='table'}">Chart</button><button type="button" data-lm-view="table" aria-pressed="${ui.view==='table'}">Table</button></div></header>`;
 if(!all.length)return `<section class="lm-overview"><div class="lm-chart-block">${head('Club money')}<p class="cp-muted">No club movements ${windowLabel(s,ui.period)}. The treasury has not moved in this period.</p></div></section>`;
 const totalIn=all.reduce((n,d)=>n+d.in,0),totalOut=all.reduce((n,d)=>n+d.out,0),net=totalIn-totalOut,
  span=`${fullDay(W.date(from??all[0].day))} to ${fullDay(W.date(s.day))}`,
  note=drawn.length<all.length?` · last ${drawn.length} of ${all.length} days drawn`:'';
 if(ui.view==='table'){
  return `<section class="lm-overview"><div class="lm-chart-block">${head('Club money')}<p class="lm-range" data-tl-meta>${all.length} ${all.length===1?'day':'days'} with club movements · ${span}</p><table class="cp-table lm-table" data-tl-table="cards"><caption>Club movements ${windowLabel(s,ui.period)}</caption><thead><tr><th data-col="day">Day</th><th data-col="in">In</th><th data-col="out">Out</th><th data-col="net">Net</th></tr></thead><tbody>${all.slice().reverse().map(d=>`<tr><th scope="row" data-col="day">${fullDay(W.date(d.day))}</th><td data-col="in">${format(d.in)}</td><td data-col="out">${format(d.out)}</td><td data-col="net" data-key="${d.in-d.out}">${format(d.in-d.out)}</td></tr>`).join('')}</tbody><tfoot><tr><th scope="row" data-col="day">Total</th><td data-col="in">${format(totalIn)}</td><td data-col="out">${format(totalOut)}</td><td data-col="net">${format(net)}</td></tr></tfoot></table></div></section>`;
 }
 const max=Math.max(1,...drawn.map(d=>Math.abs(d.in-d.out)));
 const bars=drawn.map(d=>{const v=d.in-d.out,h=Math.max(2,Math.round(Math.abs(v)/max*46)),style=v<0?`top:50%;height:${h}%`:`bottom:50%;height:${h}%`;
   return `<div class="lm-bar"><div class="lm-bar-track"><i class="${v<0?'debit':'credit'}" style="${style}" title="${fullDay(W.date(d.day))}: in ${format(d.in)}, out ${format(d.out)}, net ${format(v)}"></i></div><span>${shortDay(W.date(d.day))}</span></div>`;}).join('');
 return `<section class="lm-overview"><div class="lm-chart-block">${head('Club money')}<p class="lm-range" data-tl-meta><i class="lm-swatch credit"></i> in ${format(totalIn)} · <i class="lm-swatch debit"></i> out ${format(totalOut)} · net ${format(net)}${note}</p><div class="lm-bars" role="img" aria-label="Club money in and out, ${windowLabel(s,ui.period)}: ${format(totalIn)} in, ${format(totalOut)} out, net ${format(net)}. Green above the line is money in, red below is money out. The same numbers are available as a table.">${bars}</div></div></section>`;}
function wallet(s, ui = {}){const W=g.TLManagerLife,{esc}=g.TLClubUI,full=!!ui.full,
 period=PERIODS.some(([k])=>k===ui.period)?ui.period:'30',view=ui.view==='table'?'table':'chart',from=windowFrom(s,period),state=runway(s),
 accounts=`<div class="luma-accounts">${[['Personal wallet',s.cash,'Income from work and personal spending.'],['Club treasury',s.fund,'Registration, investment, staff and ground costs.']].map(([label,n,desc])=>`<article class="org-agenda"><small>${label}</small><h2>${format(n)}</h2><p>${desc}</p></article>`).join('')}</div>`;
 return `<section class="org"><header class="org-cover luma-cover"><div><small>MERIDIAN MONETARY UNION　 /　 MLU</small><h2>Meridian luma</h2><p>One currency across all twenty countries.</p></div><b aria-hidden="true">₥</b></header>${full?rail(s,{period})+`<nav class="lm-period" aria-label="Statement period">${PERIODS.map(([k,t])=>`<button type="button" data-lm-period="${k}" aria-pressed="${period===k}">${t}</button>`).join('')}</nav>`+chartBlock(s,{period,view})+`<p class="lm-runway ${state.ok?'ok':'warn'}">${esc(state.text)}</p>`:accounts}${[100,1000,5000,25000].map(v=>`<button data-life="deposit" data-v="${v}" ${s.cash<v?'disabled':''}>Contribute ${format(v)}</button>`).join(' ')}${ui.movements===false?'':statement(s,'all',3,full?from:null,full?windowLabel(s,period):'')}</section>`;}
const api={personalWealth,format,inText,record,statement,wallet,windowFrom,windowLabel,runway,rail};g.TLLuma=api;if(typeof module!=='undefined')module.exports=api;})(typeof window==='undefined'?globalThis:window);
