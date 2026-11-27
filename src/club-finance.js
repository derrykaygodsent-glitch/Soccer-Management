/* Club finances share a single budget across Home, scouting and transfers. */
(function (global) {
  'use strict';
  const U=global.TLClubUI, {H,C,views,esc,icon,btn,link,card,empty,values,tag,table,tr,meter,resource,breakdown,chart,tabs}=U;
  const S=global.TLClubState;
  const F=C.finance;
  const monthProfit=F.income-F.expenditure;
  const currency = n => n<0?`(${H.money(-n)})`:H.money(n);
  const budgetButtons = c => `<div class="cc-budget-actions">${btn('Make budget adjustment','adjust-budget','',{kind:'outline',icon:'swap'})}${btn('Make board request','finance-board','',{kind:'outline',icon:'case'})}</div>`;
  function budgets(c){
    const f=c.fiscal;
    return `<aside class="cc-card cc-budget-panel"><header class="cc-icon-text"><span class="cc-resource-icon">${icon('money')}</span><h2>Budgets</h2></header><section><h3>Transfer budget</h3><strong>${H.money(f.transfer)}</strong><p>Original budget was ${H.millions(f.original)}.</p><p>${f.retention}% of transfer revenue is made available.</p><p>Next season’s minimum: ${H.millions(f.nextSeason)}.</p></section>
    <section><h3>Wage budget</h3><strong>${H.money(f.wage)} p/w</strong><p>Currently spending ${H.money(f.spending)} p/w</p><p>Committed spending ${H.money(f.committed)} p/w</p><p>Available: ${H.money(f.wage-f.committed)} p/w</p></section>
    <section><h3>Scouting budget</h3><strong>${H.money(f.scouting)}</strong></section><section><h3>Adjust budgets</h3>${budgetButtons(c)}${c.s.budgetShift?`<p>Local adjustment: ${c.s.budgetShift>0?'+':''}${H.money(c.s.budgetShift)} p/w</p>`:''}</section></aside>`;
  }
  function ffp(c,detail=false){
    return `<section class="cc-ffp"><h2 class="cc-title">Financial Fair Play progress</h2><div class="cc-grid2">${C.ffp.map(r=>`<article><h3>${esc(r.name)} 2026/27</h3><p><span aria-hidden="true">✓</span> Riverside are on course to meet the regulations for the current period.</p>${detail?`<p>Estimated headroom: <strong>${H.millions(r.margin)}</strong></p>`:''}</article>`).join('')}</div>${detail?'<p class="cc-muted">Starter-season assessment. Draft offers, board requests and budget reallocations do not move cash or recalculate this forecast.</p>':''}</section>`;
  }
  const settings = {
    balance:{label:'Overall balance',max:500,min:-400,color:'#ed639a',ticks:[500,200,0,-200,-400]},
    profit:{label:'Profit or loss per month',max:500,min:-400,color:'#ad61ba',ticks:[500,300,100,-100,-300]},
    income:{label:'Monthly income',max:600,min:0,color:'#c7c9ca',ticks:[600,400,200,0]},
    expenditure:{label:'Monthly expenditure',max:400,min:0,color:'#76ac48',ticks:[400,300,200,100,0]}
  };
  const metric = (label,value,symbol='money')=>resource(label,`<b${value<0?' class="cc-bad"':''}>${currency(value)}</b>`,'',symbol);
  const balance = () => `<section class="cc-fin-zone cc-balance">${metric('Overall balance',F.balance,'money')}${chart(F.history,settings.balance)}</section>`;
  const profit = () => `<section class="cc-fin-zone cc-profit"><div class="cc-profit-head">${metric('Profit / (loss) this month',monthProfit,'trend')}<div><p class="cc-eyebrow">This season</p><strong>${H.money(F.profit)}</strong></div><div><p class="cc-eyebrow">Last season</p><strong>${H.money(F.previousProfit)}</strong></div></div>${chart(F.monthlyProfit,settings.profit)}</section>`;
  function flows(income){
    const key=income?'income':'expenditure', value=income?F.income:F.expenditure;
    return `<section class="cc-fin-flow">${metric(`${income?'Income':'Expenditure'} this month`,value,income?'trend':'swap')}${chart(income?F.monthlyIncome:F.monthlySpend,settings[key])}<h3 class="cc-eyebrow">Breakdown this month</h3>${breakdown(income?F.incomeParts:F.expenseParts)}</section>`;
  }
  function overview(c){
    return `<div class="cc-finances cc-fill"><div class="cc-fin-layout"><div class="cc-fin-plots">${balance()}${profit()}<div class="cc-fin-duo">${flows(true)}${flows(false)}</div></div>${budgets(c)}</div>${ffp(c)}</div>`;
  }
  function detail(c,income){
    return `<div class="cc-fin-layout"><div>${card(income?'Club income':'Club expenditure',`${flows(income)}<div class="cc-actions">${link('finance','Financial summary','summary')}</div>`,'cc-fin-detail')}</div>${budgets(c)}</div>`;
  }
  function wages(c){
    const f=c.fiscal, used=Math.min(100,Math.round(100*f.committed/f.wage));
    return `<div class="cc-fin-layout"><div>${card('Wage budget',`${values([['Weekly budget',`${H.money(f.wage)} p/w`],['Currently spending',`${H.money(f.spending)} p/w`],['Committed spending',`${H.money(f.committed)} p/w`],['Available',`${H.money(f.wage-f.committed)} p/w`]])}<p class="cc-eyebrow">Share committed: ${used}%</p>${meter(used,'Wages committed','teal')}`)}</div>${budgets(c)}</div>`;
  }
  views.finance={
    title:'Finances',subtitle:()=> 'Financial status: Strong',tabs:tabs(['summary','Summary'],['income','Income'],['expenditure','Expenditure'],['wages','Wages'],['ffp','FFP'],['debt','Debt and Loans'],['sponsors','Sponsors and Other'],['projection','Projection']),
    render(c){
      const tab=c.r.tab;
      if(tab==='summary')return overview(c);
      if(tab==='income'||tab==='expenditure')return detail(c,tab==='income');
      if(tab==='wages')return wages(c);
      if(tab==='ffp')return ffp(c,true);
      if(tab==='debt')return card('Debt and loans',table('Debt and loans',['Facility','Outstanding','Annual repayment'],F.debt.map(([name,principal,year])=>tr([esc(name),H.money(principal),H.money(year)])),'debt'));
      if(tab==='sponsors')return card('Sponsors and other income',`<p class="cc-muted">Annual sponsorship already agreed in the starter season.</p>${table('Sponsorship contracts',['Sponsor','Agreement','Annual value'],F.sponsors.map(([name,term,value])=>tr([esc(name),esc(term),H.money(value)])),'sponsors')}`);
      return `<div class="cc-fin-layout"><div>${card('Financial projection',`<p>Illustrative outlook using the October balance and the current transfer and wage allocations. No future transactions are simulated.</p>${values([['Current balance',H.money(F.balance)],['Next season’s minimum transfer budget',H.money(F.nextSeason)],['Annualised committed wages',H.money(c.fiscal.committed*52)],['Annual room in wage budget',H.money((c.fiscal.wage-c.fiscal.committed)*52)]])}${ffp(c,true)}`)}</div>${budgets(c)}</div>`;
    },
    action(c,cmd){
      if(cmd==='finance-board')return views.vision.action(c,'board-request');
      if(cmd==='adjust-budget'){
        const f=c.fiscal, limits=S.limits;
        c.show('Adjust transfer and wage budgets',`${values([['Transfer budget',H.money(f.transfer)],['Wage budget',H.money(f.wage)+' p/w']])}${U.editForm('budget','',U.formField('shift','Weekly wage allocation change from original (£)','number',c.s.budgetShift,`min="${limits.min}" max="${limits.max}" step="5000"`),'Apply adjustment','Positive amounts move 52 times the weekly change from transfers to wages. Negative amounts move it back, without cutting into committed wages. Enter 0 to restore the starting split.')}`);
      }
    },
    submit(c,cmd,id,data){
      if(cmd==='board')return views.vision.submit(c,cmd,id,data);
      if(cmd==='budget'){
        if(!c.apply('budget',Number(data.get('shift'))))return 'Choose a £5,000 step within the transfer and committed wage limits.';
        c.close();c.render();c.note('Allocation updated across Home, Scouting and Transfers.');
      }
    }
  };
})(window);
