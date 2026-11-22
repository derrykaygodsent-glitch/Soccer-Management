/* Scouting reports, recruitment work, transfer drafts and clauses. */
(function (global) {
  'use strict';
  const U=global.TLClubUI, {H,C,views,esc,icon,btn,link,card,empty,values,tag,select,search,table,tr,avatar,grade,stars,compact,nation,lookup,resource,clubName,tabs}=U;
  const range = (from,to) => `${compact(from)}–${compact(to)}`;
  const player = (p,label=p.name,kind='text')=>link('scouting',label,'report',p.id,kind,kind!=='text');
  const prospectMark = p=>[p.pos==='GK'?10:p.pos==='DC'?7:p.pos==='FB'?6:p.pos==='DM'?4:p.pos==='CM'?4:p.pos==='AM'?1:p.pos==='W'?2:1,p.pos==='GK'?null:p.pos==='DC'?8:p.pos==='FB'?8:p.pos==='W'?0:null];
  function miniPitch(p){const markers=prospectMark(p);return `<span class="cc-pos-plot" aria-hidden="true">${Array.from({length:12},(_,j)=>`<i${markers.includes(j)?' class="cc-pos-lit"':''}></i>`).join('')}</span>`;}
  const transferFunds = c => resource('Transfer budget',`<b>${H.millions(c.fiscal.transfer)}</b>`,`Next season: ${H.millions(c.fiscal.nextSeason)}`);
  const wages = c => resource('Weekly wage room',`<b>${H.millions(c.fiscal.wage-c.fiscal.committed)} p/w</b>`,'','case');
  function scoutStrip(c){
    return `<div class="cc-resource-strip cc-resource-four">${resource('Transfer window','<b class="cc-bad">● Closed</b>','Reopens 1 January 2027','swap')}${resource('Scouting range',`<b>${c.fiscal.scoutingRange}</b>`,'Senior recruitment coverage','globe')}${resource('Scouting budget',`<b>${compact(c.fiscal.scouting)}</b>`,`Initial season budget: ${compact(c.fiscal.scoutingOriginal)}`,'search')}<div class="cc-resource-pair">${transferFunds(c)}${wages(c)}</div></div>`;
  }
  const scopes = c => c.s.focus.map(f=>f.region);
  function worldMap(c){
    const active=scopes(c);
    return `<svg class="cc-map" viewBox="0 0 248 142" role="img" aria-label="Recruitment coverage: ${esc(active.length?[...new Set(active)].join(', '):'no active focuses')}">
      <g fill="#456675" stroke="#557684" stroke-width=".6" stroke-linejoin="round"><path d="m11 36 11-6 9 1 2-5 12-2 10-9 9 6 9-4 12 4 5 12-5 10-12 3-2 8-6 3-4 12-9-2-5-8-7-4-11-12-9 2-9-4Z"/><path d="m51 64 6-3 11 7 1 6 9 6 0 6-11-2-6-6-7-4Z"/><path d="m74 83 8-1 8 6 8 2 7 9-3 7-6 11-6 3-4 11-6 2-2-11-5-7-2-9-5-10 3-9Z"/><path d="m98 21 6-10 15 1 7 8-7 14-9 5-7-4 2-8Z"/><path d="m113 57 4-8 10-4 5-15 6-5 8 5-6 16 9-8 10 1 13-4 7 4 13-8 14 3 9 5 14-1 11 5-5 7-10 3-3 8-11 3-4 11-7 2-3 9-8-2-5-10-6 4-1 9-6 4-6-12-5-1-4 4-7-8-7 2-7-7-4 3-8-8-2-5-8 5-6-3Z"/><path d="m117 72 12-3 9 4 7 6 5 10-5 10-5 13-8 7-5-5-1-13-8-4-4-10 1-6Z"/><path d="m158 91 5 8-5 10-4-2 2-10ZM186 89l5 4 3 8-4 1-6-10Zm11 13 10 2 8 6-11 0-7-4Zm2 14 8-5 8 3 9-2 6 9-1 8-10 3-11-4-6 3-6-6Zm36 11 3 4-4 7-4 1 2-6Z"/><path d="m115 43 3-6 4 3-1 6Zm107 25 4-7 1 5-3 7-5 4Z"/></g>
      ${C.regions.map(([name,x,y])=>active.includes(name)?`<circle cx="${x}" cy="${y}" r="5.2" fill="#4eeefe23" stroke="#6fdfeb78"/><circle cx="${x}" cy="${y}" r="2.2" fill="#91fcff"><title>${esc(name)}</title></circle>`:'').join('')}</svg>`;
  }
  const focusList = c => c.s.focus.length?`<div class="cc-focus-list">${c.s.focus.map(f=>`<div><span class="cc-icon-text">${icon('globe')}<span><b>${esc(f.region)}</b><small>${C.roles[f.pos]?.[0]||esc(f.pos)} · ${esc(f.priority)}</small></span></span><div class="cc-focus-actions">${btn('View','focus-open',f.id,{label:`View ${f.region} focus`})}${btn('Edit','focus-edit',f.id,{label:`Edit ${f.region} focus`})}${btn('×','focus-remove',f.id,{label:`Remove ${f.region} focus`})}</div></div>`).join('')}</div>`:empty('No active focuses','Add a region to start a recruitment focus.');
  function scoutLeft(c){
    return `<aside class="cc-scout-left"><div><h2 class="cc-title">Recruitment focuses</h2><p class="cc-eyebrow">All active assignments</p>${focusList(c)}<div class="cc-actions cc-actions-left">${btn('New focus','focus-edit','',{kind:'outline'})}</div></div><div class="cc-coverage"><h2>${link('scouting','Scouting coverage','coverage',null,'text')}</h2><p class="cc-muted"><i class="cc-dot cc-teal"></i> Currently scouting</p>${worldMap(c)}</div></aside>`;
  }
  function prospectTable(c,entries,caption){
    return entries.length?table(caption,['Inf','Focus','Name','Position','Age','Type','Transfer value','Rec'],entries.map(p=>tr([
      c.s.shortlist.includes(p.id)?tag('List','good'):c.s.dismissed.includes(p.id)?tag('Done','info'):'',`<span class="cc-icon-text">${icon('globe')}${esc(p.region)}</span>`,
      `<div class="cc-prospect-name">${player(p)}<small>${p.clubId?c.crest(p.clubId):''}${esc(p.club)}</small></div>`,
      `<span class="cc-poscell">${miniPitch(p)}<span>${esc(C.roles[p.pos][1])}<small>${esc(C.roles[p.pos][2])}</small></span></span>`,p.age,esc(p.source),`<span class="cc-price-chip">${H.millions(p.value)}</span>`,grade(p.grade)
    ])),'prospects','cc-prospects-table'):empty('No players found','Change the filters or add a player to the shortlist.');
  }
  const filters = c=>`<div class="cc-toolbar">${search('q',c.ui.q,'Search scouted players')}${select('region','Scouting region',[['all','All regions'],...C.regions.map(x=>x[0])],c.ui.region||'all')}${select('pos','Player position',[['all','All positions'],...Object.keys(C.roles).map(k=>[k,C.roles[k][0]])],c.ui.pos||'all')}${U.check('reviewed','Show reviewed',c.ui.reviewed)}</div>`;
  function filtered(c,shortlist=false){
    return C.prospects.filter(p=> (shortlist?c.s.shortlist.includes(p.id):c.ui.reviewed||!c.s.dismissed.includes(p.id))&&(!c.ui.region||c.ui.region==='all'||c.ui.region===p.region)&&(!c.ui.pos||c.ui.pos==='all'||p.pos===c.ui.pos)&&U.textMatch(c.ui.q,p.name,p.club,p.region));
  }
  function overview(c){
    const entries=C.prospects.filter(p=>!c.s.dismissed.includes(p.id));
    return `<div class="cc-scout cc-fill">${scoutStrip(c)}<div class="cc-scout-grid">${scoutLeft(c)}<section class="cc-scout-results"><div class="cc-toolbar"><h2 class="cc-title">Scouting recommendations</h2><span class="cc-spacer"></span>${link('scouting','Scouting Centre','centre')}</div>${prospectTable(c,entries,'Scouting recommendations')}</section></div></div>`;
  }
  function recruitment(c){
    const focus=lookup(c.s.focus,c.r.id);
    return `<div class="cc-grid-rail">${card('Recruitment focuses',`${focusList(c)}<div class="cc-actions cc-actions-left">${btn('New focus','focus-edit','',{kind:'outline'})}</div>`)}${card(focus?`${focus.region} · Focus matches`:'Active focus matches',focus?`<div class="cc-toolbar">${tag(focus.priority,'teal')}${tag(C.roles[focus.pos]?.[0]||focus.pos,'info')}</div>${prospectTable(c,C.prospects.filter(p=>p.region===focus.region&&(focus.pos==='All positions'||p.pos===focus.pos)),`${focus.region} focus`)}`:`<p class="cc-muted">Select a focus to view matching reports for that region and role.</p>${prospectTable(c,C.prospects.filter(p=>c.s.focus.some(f=>f.region===p.region&&(f.pos==='All positions'||f.pos===p.pos))),'Active focus matches')}`)}</div>`;
  }
  function coverage(c){
    return `<div class="cc-grid2">${card('Scouting coverage',`${worldMap(c)}<p class="cc-muted"><i class="cc-dot cc-teal"></i> Active assignments</p>`,'cc-map-card')}${card('Regional knowledge',table('Regional scouting coverage',['Region','Activity','Reports'],C.regions.map(([name])=>tr([esc(name),tag(scopes(c).includes(name)?'Currently scouting':'No active focus',scopes(c).includes(name)?'teal':'info'),C.prospects.filter(p=>p.region===name).length])),'coverage')+`<div class="cc-actions">${link('scouting','Recruitment focuses','recruitment')}</div>`)}</div>`;
  }
  function scoutReport(c,p){
    const isShort=c.s.shortlist.includes(p.id), isDone=c.s.dismissed.includes(p.id), enquiry=c.s.agent.includes(p.id);
    const fee=c.s.offers[p.id], club=p.clubId?clubName(c,p.clubId):esc(p.club), title=p.grade.startsWith('A')?'Would be an excellent signing.':'Would be a quality signing.';
    const items=(list,tone,symbols)=>`<ul class="cc-scout-notes">${list.map((copy,i)=>`<li><span class="cc-note-icon cc-${tone}">${icon(symbols[i%symbols.length])}</span>${esc(copy)}</li>`).join('')}</ul>`;
    return `<section class="cc-scout-report" data-c-owner="scouting"><div class="cc-scout-profile"><div class="cc-person">${avatar(c,p.name,undefined,'cc-avatar-lg')}<div><strong>${esc(p.name)}</strong><p>${nation(p.nat)} · ${p.age}-year-old ${esc(C.roles[p.pos][0].toLowerCase())}</p><p class="cc-muted">${esc(C.roles[p.pos][1])} · ${esc(C.roles[p.pos][2])}</p></div></div><div>${club}</div><div><strong class="cc-good">${esc(p.knowledge)} knowledge</strong><small>${p.id==='marin'?'Completed on 26 October 2026':'October 2026 · Scouting desk'}</small></div></div>
      <div class="cc-scout-evaluation"><div><p class="cc-muted">${p.id==='marin'?`I have now finished scouting ${esc(p.name)}. He played 280 minutes across four matches, and impressed with his finishing and movement.`:`The scouting team has assessed ${esc(p.name)} for his best role as a ${esc(C.roles[p.pos][2].toLowerCase())}.`}</p><div class="cc-scout-verdict">${grade(p.grade)}<strong>${title}</strong></div><h3 class="cc-title">Key information</h3><div class="cc-scout-stars"><div><h4>Current ability</h4>${stars(p.ability)}</div><div><h4>Potential ability</h4>${stars(p.potential)}</div></div><hr><h3 class="cc-title">Other information</h3>${values([['Transfer interest',p.interest],['Loan interest','Unknown'],['Transfer value',H.millions(p.value)],['Estimated wage',`${range(p.wage,p.wage+45000)} p/w`]])}</div>
      <div><h3 class="cc-good">Pros</h3>${items(p.pros,'good',['tactics','ball','rating','trend'])}<h3 class="cc-bad">Cons</h3>${items(p.cons,'bad',['medical','radar','case','globe'])}</div></div>
      ${enquiry?`<p class="cc-callout cc-teal">Agent enquiry noted. Reported interest: ${esc(p.interest)}.</p>`:''}${fee?`<p class="cc-callout">Draft: ${H.money(fee)} · ${link('transfers','View transfer activity','centre',null,'text')}</p>`:''}
      <div class="cc-actions cc-actions-left">${btn(isShort?'Shortlisted':'Shortlist','scout-list',p.id,{kind:'outline',pressed:isShort,icon:'plan'})}${btn(enquiry?'Agent enquiry noted':'Approach agent','scout-agent',p.id,{kind:'teal',disabled:enquiry})}${btn(fee?'Edit draft offer':'Draft offer','scout-offer',p.id,{kind:'green'})}${btn(isDone?'Restore recommendation':'Mark reviewed','scout-review',p.id,{pressed:isDone})}</div></section>`;
  }
  function scoutAction(c,cmd,id){
    const p=lookup(C.prospects,id);
    if(cmd==='focus-open') return c.go('scouting','recruitment',id);
    if(cmd==='focus-edit'){
      const f=lookup(c.s.focus,id);
      c.show(f?'Edit recruitment focus':'New recruitment focus',U.editForm('focus',id,U.formSelect('region','Region',C.regions.map(r=>r[0]),f?.region)+U.formSelect('pos','Position',['All positions',...Object.keys(C.roles).map(k=>[k,C.roles[k][0]])],f?.pos)+U.formSelect('priority','Priority',['High','Standard','Low'],f?.priority||'Standard'),'Save focus'));
    } else if(cmd==='focus-remove'){
      const f=lookup(c.s.focus,id); if(!f)return;
      c.show(`Remove ${f.region} focus?`,`<div data-c-owner="scouting"><p>Reports already received will stay in Scouted Players.</p><div class="cc-actions">${btn('Remove focus','focus-confirm',id,{kind:'primary'})}</div></div>`);
    } else if(cmd==='focus-confirm'){
      c.apply('focus-delete',id);c.close();c.render();c.note('Recruitment focus removed.');
    } else if(cmd==='scout-list'&&p){
      const removed=c.s.shortlist.includes(id);c.apply('shortlist',id);c.render();c.note(removed?`${p.name} removed from shortlist.`:`${p.name} added to shortlist.`);
    } else if(cmd==='scout-review'&&p) {
      c.apply('dismissed',id);c.render();c.note(c.s.dismissed.includes(id)?'Report marked as reviewed.':'Recommendation restored.');
    } else if(cmd==='scout-agent'&&p) {
      if(!c.s.agent.includes(id))c.apply('agent',id);
      c.render();c.note('Agent enquiry recorded in this starter save.');
    } else if(cmd==='scout-offer'&&p){
      const max=c.fiscal.transfer;
      if(max<1000)return c.note('No transfer budget is available for a draft.');
      c.show(`Draft offer · ${p.name}`,`<div data-c-owner="scouting">${U.editForm('offer',id,U.formField('fee','Proposed fee (£)','number',Math.min(c.s.offers[id]||p.value,max),`min="1000" max="${max}" step="1"`),'Save draft',`Available transfer budget: ${H.money(max)}. This adds a draft to Transfer Activity; no offer is sent.`)}</div>`);
    }
  }
  function scoutSubmit(c,cmd,id,data){
    if(cmd==='focus') {
      const key=id||c.serial('focus',c.s.focus.map(f=>f.id));
      if(!c.apply('focus-put',{id:key,region:data.get('region'),pos:data.get('pos'),priority:data.get('priority')}))return 'Check the focus criteria. The desk can hold up to 12 active focuses.';
      c.close();c.render();c.note('Recruitment focus saved.');
    } else if(cmd==='offer'){
      if(!c.apply('offer',{id,fee:Number(data.get('fee'))}))return 'Enter a fee within your remaining transfer budget.';
      c.close();c.go('transfers','centre','draft-'+id);c.note('Offer drafted. No bid was sent.');
    }
  }
  U.scoutAction=scoutAction; U.scoutSubmit=scoutSubmit; U.scoutReport=scoutReport;
  views.scouting={
    title:'Scouting',subtitle:()=> 'Recruitment and opposition analysis',tabs:tabs(['overview','Overview'],['centre','Scouting Centre'],['players','Players'],['recruitment','Recruitment Focus'],['coverage','Scouting Coverage'],['shortlist','Shortlist'],['report','Scout Report']),
    enter(c){ if(c.r.tab==='report'&&lookup(C.prospects,c.r.id))c.ui.report=c.r.id; },
    render(c){
      const tab=c.r.tab;
      if(tab==='overview')return overview(c);
      if(tab==='coverage')return coverage(c);
      if(tab==='recruitment')return recruitment(c);
      if(tab==='report'){
        const p=lookup(C.prospects,c.r.id)||lookup(C.prospects,c.ui.report)||C.prospects[0];
        return card('Scouting report',`${scoutReport(c,p)}<div class="cc-actions">${link('scouting','Scouted players','players')}${link('scouting','Shortlist','shortlist')}</div>`,'cc-report-page');
      }
      return `<div class="cc-stack">${scoutStrip(c)}${card(tab==='shortlist'?'Shortlisted players':tab==='centre'?'Scouting Centre':'Scouted players',`${filters(c)}${prospectTable(c,filtered(c,tab==='shortlist'),'Player reports')}`)}</div>`;
    },
    action:scoutAction,submit:scoutSubmit
  };

  const responsibilitiesForm = (c,selected=Object.keys(C.responsibility))=>`<div class="cc-delegation">${selected.map(task=>`<label class="cc-form-field"><span>${esc(C.responsibilityLabels[task])}</span><select class="cc-select" data-c-field="delegate:${task}">${U.optionTags(C.responsibility[task],c.s.delegation[task])}</select></label>`).join('')}</div>`;
  const delegationField = (c,key,owner)=>{
    if(!key.startsWith('delegate:'))return false;
    if(c.apply('delegate',{task:key.slice(9),owner})){c.render();c.note('Staff responsibility updated.');}
    return true;
  };
  U.responsibilitiesForm=responsibilitiesForm; U.delegationField=delegationField;
  function transferStrip(c){
    const resp=c.s.delegation.transfers;
    return `<div class="cc-resource-strip cc-resource-three">${resource('Transfer and contract responsibilities',`<span>${esc(resp)}</span> · ${link('staff','Change owner','responsibilities',null,'text',false)}`,'Delegated staff member','team')}${resource('Scouting Centre',link('scouting',`${C.prospects.filter(p=>!c.s.dismissed.includes(p.id)).length} recommendations`,'centre',null,'text'),`${c.s.focus.length} active recruitment focuses`,'search')}<div class="cc-resource-pair">${transferFunds(c)}${wages(c)}</div></div>`;
  }
  function clauses(c,rail=false){
    if(rail)return `<section class="cc-clause-section"><div class="cc-toolbar"><h2>${link('transfers','Clauses','clauses',null,'text')}</h2><span class="cc-eyebrow">${C.clauses.length} available to review</span></div><div class="cc-clause-rail" data-c-scroll="clauses" tabindex="0" role="region" aria-label="Transfer clause cards">${C.clauses.map(x=>`<button type="button" data-c-do="clause" data-c-val="${x.id}"><span class="cc-${x.direction==='Payable'?'bad':'good'}">${icon('swap')}</span><span><strong>${esc(x.name)}</strong><small>${x.percent}% sell-on clause</small></span>${icon('chevron')}</button>`).join('')}</div></section>`;
    return card('Transfer clauses',`<p class="cc-muted">Review sell-on terms recorded before the starter date. No funds are moved here.</p>${table('Transfer clauses',['Player','Club','Clause','Type','Estimate','Review'],C.clauses.map(x=>tr([btn(x.name,'clause',x.id,{kind:'text'}),clubName(c,x.club),`${x.percent}% ${esc(x.type)}`,tag(x.direction,x.direction==='Payable'?'warn':'good'),compact(x.estimate),c.s.clauses.includes(x.id)?tag('Reviewed','teal'):btn('Review','clause',x.id,{kind:'outline'})])),'clause-table')}`);
  }
  function activity(c,history=false){
    const drafts = Object.entries(c.s.offers).map(([id,fee])=>{const p=lookup(C.prospects,id);return {id:'draft-'+id,prospect:id,name:p.name,club:p.club,pos:p.pos,fee,date:H.start,direction:'In',status:'Draft'};});
    const statusField=history?'historyStatus':'transferStatus';
    const direction=c.ui.direction||'All', status=c.ui[statusField]||'all';
    const dataset=history?C.transfers.filter(x=>x.status==='Completed'):[...drafts,...C.transfers];
    const list=dataset.filter(t=>(direction==='All'||t.direction===direction)&&(!c.ui.inactive||['Draft','Watching'].includes(t.status)||history)&&(!c.ui.showFilters||status==='all'||t.status===status)&&(!c.ui.showFilters||U.textMatch(c.ui.transferQ,t.name,t.club)));
    const head=['Name','Club','Position','Status','Cost',history?'Date':'Action'];
    return `<section class="cc-transfer-activity"><div class="cc-toolbar"><h2 class="cc-title">${history?'Transfer History':'Transfer activity'}</h2><span class="cc-spacer"></span>${history?'':U.check('inactive','Hide inactive deals',c.ui.inactive)}${btn(c.ui.showFilters?'Hide filters':'Show filters','transfer-filters','',{pressed:!!c.ui.showFilters})}</div><div class="cc-chip-tabs" aria-label="Transfer direction">${['All','In','Out'].map(x=>btn(x,'direction',x,{pressed:direction===x,icon:'swap'})).join('')}</div>
      ${c.ui.showFilters?`<div class="cc-toolbar">${search('transferQ',c.ui.transferQ,'Find a deal')}${select(statusField,'Deal status',[['all','All statuses'],...(history?['Completed']:['Draft','Watching','Completed','Closed'])],status)}</div>`:''}
      ${list.length?table('Transfer activity',head,list.map(t=>tr([
        `<span class="cc-icon-text cc-${t.direction==='In'?'good':'bad'}">${icon('swap')}<span>${esc(t.name)}</span></span>`,esc(t.club),esc(C.roles[t.pos][0]),tag(t.status,t.status==='Draft'?'teal':t.status==='Watching'?'warn':t.status==='Completed'?'good':'muted'),H.money(t.fee),history?H.shortDate(t.date):t.status==='Draft'?`${player(lookup(C.prospects,t.prospect),'Edit','outline')} ${btn('Delete','draft-remove',t.prospect,{label:`Delete draft for ${t.name}`})}`:t.status==='Watching'?player(lookup(C.prospects,'velden'),'View report','outline'):'–'
      ],c.r.id===t.id?'cc-club-row':'')),history?'history':'activity'):empty('No deals match these filters','Drafts from scouting will appear here.')}
      ${history?'':`<footer class="cc-transfer-total"><span>Draft offers: <b>${drafts.length}</b></span><span>Proposed fees: <b>${H.money(drafts.reduce((a,t)=>a+t.fee,0))}</b></span><span>Potential outgoing income: <b>£0</b></span></footer>`}</section>`;
  }
  views.transfers={
    title:'Transfers',subtitle:c=>`${Object.keys(c.s.offers).length} draft ${Object.keys(c.s.offers).length===1?'offer':'offers'} · No live negotiations`,tabs:tabs(['centre','Transfer Centre'],['director','Director of Football'],['clauses','Clauses'],['history','Transfer History']),
    enter(c){ if(c.r.id.startsWith('draft-')) { c.ui.direction='All';c.ui.inactive=false;c.ui.showFilters=false; } },
    render(c){
      if(c.r.tab==='clauses')return clauses(c);
      if(c.r.tab==='director')return `<div class="cc-stack">${transferStrip(c)}${card('Transfer and contract responsibilities',`<p class="cc-muted">These assignments also appear in Staff. They don’t start negotiations.</p>${responsibilitiesForm(c,['transfers','contracts'])}<div class="cc-actions">${link('staff','All responsibilities','responsibilities')}</div>`)}</div>`;
      if(c.r.tab==='history')return activity(c,true);
      return `<div class="cc-transfers cc-fill">${transferStrip(c)}${clauses(c,true)}${activity(c)}</div>`;
    },
    field:delegationField,
    action(c,cmd,id){
      if(cmd==='direction'){c.ui.direction=id;c.render();}
      else if(cmd==='transfer-filters'){c.ui.showFilters=!c.ui.showFilters;c.render();}
      else if(cmd==='clause'){
        const x=lookup(C.clauses,id);if(!x)return;
        c.show(`${x.name} · Transfer clause`,`${values([['Club',H.clubs[x.club].name],['Term',`${x.percent}% sell-on clause`],['Type',x.direction],['Estimated settlement',H.money(x.estimate)]])}<p>A settlement can be discussed outside this starter save. Review the clause without adjusting funds.</p><div class="cc-actions">${btn(c.s.clauses.includes(id)?'Reviewed':'Mark reviewed','clause-review',id,{kind:'primary',disabled:c.s.clauses.includes(id)})}</div>`);
      } else if(cmd==='clause-review'){c.apply('clauses',id);c.close();c.render();c.note('Clause marked as reviewed.');}
      else if(cmd==='draft-remove'){
        const p=lookup(C.prospects,id);if(p)c.show(`Remove draft for ${p.name}?`,`<p>No offer was sent. This will remove your proposed fee from Transfer Activity.</p><div class="cc-actions">${btn('Remove draft','draft-confirm',id,{kind:'primary'})}</div>`);
      } else if(cmd==='draft-confirm'){c.apply('offer-delete',id);c.close();c.render();c.note('Draft offer removed.');}
    }
  };
})(window);
