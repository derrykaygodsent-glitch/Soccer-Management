/* Personal capital only. Settlement is driven by career mornings, never page views. Club funds are never used. */
(function(g){'use strict';
const U=g.TLClubUI||{}, esc=U.esc||String;
const showMoney=n=>(g.TLLuma||require('./luma')).format(n);
const D=g.TLData||require('./data'),F=g.TLFASeason||require('./fa-season');
const fee=s=>F.rate(s,s.profile.nation,5000);
const tiers=[1000,10000,100000];
const PROPERTY=45000, SHARES=20000, VENTURE=15000;
function invest(s,v){const p=s.enterprise||={};
  if(v==='stall'){const cost=fee(s);if(p.stall||s.cash<cost)throw Error('You need the setup cost in your wallet and can own only one stall.');s.cash-=cost;p.stall={setupCost:cost,next:s.day+7,paid:0,weeks:0};s.activity='Your kit-printing stall opens today. First takings arrive in seven days.';}
  else if(v==='property'){if(p.property||s.cash<PROPERTY)throw Error('Buy one home when you can afford it.');s.cash-=PROPERTY;p.property={acquired:s.day};s.activity='You bought a place of your own. It is yours, whatever happens at the club.';}
  else if(v==='shares'){if(p.shares||s.cash<SHARES)throw Error('Only one investment can run at a time.');s.cash-=SHARES;p.shares={principal:SHARES,due:s.day+28};s.activity='You put money into shares. It locks in for 28 days.';}
  else if(v==='venture'){if(p.venture||s.cash<VENTURE)throw Error('One local venture at a time.');s.cash-=VENTURE;p.venture={principal:VENTURE,due:s.day+28,paid:0,next:s.day+7};s.activity='You started a local venture, creating jobs in the district.';}
  else{const n=Number(v);if(!tiers.includes(n)||p.deposit||s.cash<n)throw Error('Choose an affordable deposit. Only one fixed term can run at a time.');s.cash-=n;p.deposit={principal:n,due:s.day+28};s.activity='Your deposit is locked until maturity.';}
}
function morning(s){const p=s.enterprise;if(!p)return;
  const d=p.deposit;if(d&&s.day>=d.due){const interest=Math.floor(d.principal*.01);s.cash+=d.principal+interest;p.lastInterest=interest;delete p.deposit;s.mail.unshift({day:s.day,from:'Personal account',text:`Your bank deposit matured. ${showMoney(d.principal)} principal and ${showMoney(interest)} interest returned to your wallet.`});}
  const sh=p.shares;if(sh&&s.day>=sh.due){const roll=D.seedFor(`${s.id}:shares:${sh.due}`)%41;const pct=3+roll%12;const interest=Math.floor(sh.principal*pct/100);s.cash+=sh.principal+interest;p.lastShares=interest;delete p.shares;s.mail.unshift({day:s.day,from:'Personal account',text:`Your shares matured. ${showMoney(sh.principal)} returned with ${showMoney(interest)} (about ${pct}%).`});}
  const t=p.stall;if(t&&s.day>=t.next){const pct=D.seedFor(`${s.id}:kit-stall:${t.next}`)%19,net=Math.floor(fee(s)*pct/100);s.cash+=net;t.paid+=net;t.last=net;t.weeks++;t.next=s.day+7;}
  const v=p.venture;if(v&&s.day>=v.next){const roll=D.seedFor(`${s.id}:venture:${v.next}`)%13;const net=Math.floor(v.principal*roll/200);s.cash+=net;v.paid+=net;v.last=net;v.next=s.day+7;}
}
function render(s){const W=g.TLManagerLife,m=W.money,p=s.enterprise||{},d=p.deposit,sh=p.shares,t=p.stall,v=p.venture;
  const button=(id,title,disabled)=>`<button data-life=\"personalInvest\" data-v=\"${esc(id)}\" ${disabled?'disabled':''}>${esc(title)}</button>`;
  return `<section class="venture-room"><header><small>OFF THE PITCH / PERSONAL CAPITAL</small><h3>Put your wallet to work</h3><p>Wallet ${m(s.cash)} · Club funds are never used.</p></header><div class="venture-grid">
  <article><small>BANK</small><h4>Fixed-term deposit</h4>${d?`<p>${m(d.principal)} locked. ${m(d.principal+Math.floor(d.principal*.01))} returns on ${W.date(d.due)}.</p>`:`<p>Lock savings for 28 days. Principal plus 1% interest returns automatically; no early withdrawal.</p>${tiers.map(n=>button(''+n,'Deposit '+m(n),s.cash<n)).join(' ')}`}${p.lastInterest!=null?`<small>Last interest: ${m(p.lastInterest)}</small>`:''}</article>
  <article><small>SHARES</small><h4>Investment fund</h4>${sh?`<p>${m(SHARES)} invested. Projected return ${m(sh.principal+Math.floor(sh.principal*(3+((D.seedFor(`${s.id}:shares:${sh.due}`)%41)%12))/100))} on ${W.date(sh.due)}.</p>`:`<p>Invest ${m(SHARES)} for 28 days. Returns vary with the market; principal plus profit comes back automatically.</p>${button('shares','Invest '+m(SHARES),s.cash<SHARES)}`}${p.lastShares!=null?`<small>Last return: ${m(p.lastShares)}</small>`:''}</article>
  <article><small>PROPERTY</small><h4>Buy a home</h4>${p.property?`<p>You own a place in ${esc(s.profile.nation)}. Bought ${W.date(p.property.acquired)}.</p>`:`<p>Buy your own home for ${m(PROPERTY)}. It adds to your personal net worth and is never touched by club business.</p>${button('property','Buy home · '+m(PROPERTY),s.cash<PROPERTY)}`}</article>
  <article><small>LOCAL BUSINESS</small><h4>Start a venture</h4>${t?`<p>Open for business · ${t.weeks} trading weeks. Total net income ${m(t.paid)}. Next payout ${W.date(t.next)}.</p>`:`<p>Launch a local venture for ${m(VENTURE)}. It creates jobs in the district and pays you weekly takings.</p>${button('venture','Launch venture · '+m(VENTURE),s.cash<VENTURE)}`}</article>
  <article><small>STREET STALL</small><h4>Kit-printing stall</h4>${t?`<p>Open for business · ${t.weeks} trading weeks. Total net income ${m(t.paid)}. Next payout ${W.date(t.next)}.</p>`:`<p>Pay ${m(fee(s))} once for equipment. A local operator runs the stall. Weekly net takings vary from zero to ${m(Math.floor(fee(s)*.18))}; setup costs are not refunded.</p>${button('stall','Launch stall · '+m(fee(s)),s.cash<fee(s))}`}</article>
</div></section>`;}
const api={invest,morning,render};g.TLPersonalEnterprise=api;if(typeof module!=='undefined')module.exports=api;})(typeof window==='undefined'?globalThis:window);
