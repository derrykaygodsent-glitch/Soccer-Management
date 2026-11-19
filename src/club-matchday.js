/* Standalone route through the mock matchday, isolated from Continue on Club Home. */
(function (global) {
  'use strict';
  const X=global.TLMatchdayUI,{M,U,preview,stage}=X;
  const {btn,select}=U;
  const jumps=[
    ['calendar','Calendar · Saturday 26 Oct',M.firstDay],['calendar','Calendar · Day before the match','2024-10-29'],
    ['fixtures','League results','league'],['fixtures','Matchday cup fixtures','cup'],['fixtures','Sample cup results','cup-results'],
    ['briefing','Briefing feedback'],['lineups','Riverside starting lineup',M.home.id],['lineups','Harbourport starting lineup',M.away.id],
    ['half','Half-time analysis'],['half','Half-time team talk','talk'],['touchline','In-play injury & tactics'],
    ['full','Full-time analysis'],['full','Final team talk','talk'],['post','Post-match Inbox'],['post','Injury risk update','risk'],['post','Press conference','press']
  ];
  const key=(tab,id='')=>`${tab}:${id}`;
  const keyFor=c=>{
    const defaults={calendar:M.firstDay,fixtures:'cup',lineups:M.home.id}, id=c.r.id||defaults[c.r.tab]||'';
    const result=key(c.r.tab,id);
    return jumps.some(row=>key(row[0],row[2])===result)?result:key(c.r.tab,defaults[c.r.tab]||'');
  };
  const renderers={calendar:X.calendar,fixtures:X.fixtures,briefing:X.briefing,lineups:X.lineups,half:c=>c.r.id==='talk'?X.dressing(c):X.half(c),touchline:X.touchline,full:c=>c.r.id==='talk'?X.dressing(c):X.full(c),post:X.post};
  const heading=c=>({calendar:'Matchday Calendar',fixtures:c.r.id==='league'?U.H.division:'League Cup',briefing:'Briefing',lineups:'Lineups',half:c.r.id==='talk'?'Team Talk':'Half Time',touchline:'In-play Tactics',full:c.r.id==='talk'?'Final Team Talk':'Full Time',post:'Post-match Inbox'})[c.r.tab];
  const next=c=>{
    const {tab,id}=c.r;
    switch(tab){
      case 'calendar':{const day=M.dateForNextDay(id);return day?['Next Day','calendar',day]:['Fixtures','fixtures','cup'];}
      case 'fixtures':return id==='league'?['Cup Fixtures','fixtures','cup']:id==='cup-results'?['Full Time','full','']:['Briefing','briefing',''];
      case 'briefing':return ['Lineups','lineups',''];
      case 'lineups':return ['Half Time','half',''];
      case 'half':return id==='talk'?['Second Half','touchline','']:['Team Talk','half','talk'];
      case 'touchline':return ['Full Time','full',''];
      case 'full':return id==='talk'?['Inbox','post','']:['Team Talk','full','talk'];
      case 'post':return ['Club Home','home',''];
    }
  };
  const date=c=>c.r.tab==='calendar'?M.time(M.day(c.r.id).id):c.r.tab==='fixtures'&&c.r.id==='league'?Date.parse(M.firstDay+'T19:45:00Z'):c.r.tab==='post'&&c.r.id==='risk'?Date.parse(M.fixtureDay+'T09:53:00Z'):c.r.tab==='post'?Date.parse(M.fixtureDay+'T21:45:00Z'):c.r.tab==='fixtures'&&c.r.id==='cup-results'?Date.parse(M.fixtureDay+'T21:40:00Z'):M.fixture.date;
  const jumpsFor=c=>c.r.tab==='calendar'&&!jumps.some(row=>row[0]==='calendar'&&row[2]===M.day(c.r.id).id)?[...jumps,[c.r.tab,U.H.calendar(M.day(c.r.id).date).date,M.day(c.r.id).id]]:jumps;
  U.views.matchday={title:'Matchday',tabs:M.tabs,heading,clock:date,subtitle:c=>`Screen preview · ${c.r.tab==='fixtures'&&c.r.id==='league'?'Premier Division results':M.matchTitle}`,
    nextLabel:c=>next(c)?.[0],advance(c){const action=next(c);if(action)c.go(action[1]==='home'?'home':'matchday',action[1],action[2]);},
    render(c){
      const selected=c.r.tab==='calendar'?key('calendar',M.day(c.r.id).id):keyFor(c);
      const controls=`<div class="md-preview-controls">${select('mdJump','Jump to a preview screen',[['','Jump to a screen…'],...jumpsFor(c).map(([tab,label,id])=>[key(tab,id),label])],selected)}${btn('Play Classic 2D','go-match','',{kind:'solid',icon:'i-play'})}</div>`;
      return `<div class="md-matchday" data-preview-stage="${c.r.tab}">${preview('Matchday preview','Scripted example · No season, save or match changes.',controls)}${renderers[c.r.tab](c)}</div>`;
    },
    after(c,previous){
      if(c.r.tab==='calendar')document.querySelector('.md-cal-active')?.scrollIntoView({block:'nearest',inline:'center'});
      if(previous.page==='matchday'&&previous.tab===c.r.tab&&previous.id!==c.r.id){
        if(c.r.tab==='half'||c.r.tab==='full'){document.getElementById('clubPage').scrollTop=0;global.scrollTo(0,0);document.getElementById('homeTitle').focus({preventScroll:true});}
        if(c.r.tab==='post'){
          const reader=document.querySelector('.md-post-inbox .cc-reader-copy');if(reader)reader.scrollTop=0;
          if(c.narrow()){global.scrollTo(0,0);if(c.r.id)document.querySelector('#md-post-subject')?.focus({preventScroll:true});}
        }
      }
    },
    field(c,name,val){
      if(name==='mdJump'){
        const option=jumpsFor(c).find(([tab,,id])=>key(tab,id)===val);
        if(option)c.go('matchday',option[0],option[2]);else c.render();
        return true;
      }
      if(name==='mdDay'){c.go('matchday','calendar',val);return true;}
      if(name==='mdFixtureDate'){c.go('matchday','fixtures',val);return true;}
      return X.gameField(c,name,val);
    },
    action(c,cmd,val){X.preAction(c,cmd,val);X.gameAction(c,cmd,val);X.postAction(c,cmd,val);}
  };
})(window);
