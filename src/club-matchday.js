/* An isolated sequential match shell. No addressable stages in clubhouse navigation. */
(function(global){
  'use strict';
  const X=global.TLMatchdayUI, {M,U}=X, {H,C}=U, P=global.TLMatchPrep, R=global.TLMatchReview, K=global.TLSeasonCalendar, Q=global.TLSeasonMatch;
  const stages={
    meeting:['TACTICAL MEETING','Team Selection','selection','01 / PREPARATION'],
    selection:['TEAM SELECTION','Submit Team',null,'02 / SELECTION'],
    briefing:['BRIEFING','Go to Match','news','03 / BRIEFING'],
    news:['TEAM NEWS','Dressing Room','preTalk','04 / OFFICIAL LINEUPS'],
    preTalk:['DRESSING ROOM','Match Preview','preview','05 / TEAM TALK'],
    preview:['MATCH PREVIEW','Go to Pitch','live','06 / BROADCAST'],
    half:['HALF TIME','Dressing Room','halfTalk','INTERVAL / ANALYSIS'],
    halfTalk:['HALF-TIME TEAM TALK','Start Second Half',null,'INTERVAL / DRESSING ROOM'],
    full:['FULL TIME','Dressing Room','fullTalk','FULL TIME / ANALYSIS'],
    fullTalk:['FINAL TEAM TALK','Return to Clubhouse',null,'FULL TIME / DRESSING ROOM']
  };
  const tunnel=[['meeting','Tactical meeting','Meet'],['selection','Team selection','XI'],['briefing','Briefing','Brief'],['news','Team news','News'],['preTalk','Dressing room','Talk'],['preview','Broadcast','Pitch'],['half','Half time','HT'],['full','Full time','FT']];
  function create({store,crest,portrait,onReturn}){
    const $=id=>document.getElementById(id), shell=$('seasonMatch'), body=$('seasonMatchBody'), live=$('matchScreen'), club=$('homeScreen'), view=()=>global.TLMatchView;
    const ui={};let timer;
    function note(text){const el=$('seasonMatchStatus');el.textContent=text;el.hidden=false;clearTimeout(timer);timer=setTimeout(()=>el.hidden=true,3300);}
    const a=()=>store.value.session;
    function ctx(){
      const s=store.value, a=s.session, f=store.fixture(), side=Q.managed(f), opposition=M.opponent(K.club(side?f.home:f.away)), our=a.submitted?M.sheet(a.submitted.sheet,f.date):null;
      return {s,a,f,side,opposition,our,official:K.officials(f),crest,portrait,ui};
    }
    function screens(mode){club.hidden=mode!=='club';shell.hidden=mode!=='shell';live.hidden=mode!=='live';}
    function liveOpts(c){
      return {fixture:c.f,side:c.side,session:c.a,store,crest,report(type,m){
        if(store.break(type,Q.report(m,c.f,type==='ft'),Q.ticks(m))){ui.reportMode='overview'; ui.reportSide=c.side;render(true);}
      }};
    }
    function showLive(interval=false,resume=false){
      const c=ctx();screens('live');global.scrollTo(0,0);
      document.title=`Touchline 26 — ${interval?'Half-time instructions':'Classic 2D'}`;
      view().openClub(liveOpts(c),()=>{
        if(resume)view().startSecondHalf();
        else if(interval)view().intervalDesk(()=>render(false));
        else $('btnPlay').focus({preventScroll:true});
      });
    }
    function render(reset=false){
      if(!a())return;
      if(a().stage==='live')return showLive();
      view().suspend();screens('shell');
      const c=ctx(), stage=c.a.stage, [title,label,,kicker]=stages[stage];
      const old=document.activeElement, focusKey=old?.dataset.msField?[`[data-ms-field]`,'msField',old.dataset.msField]:old?.dataset.msDo?[`[data-ms-do]`,'msDo',old.dataset.msDo,old.dataset.msVal]:null;
      const saved=new Map([...body.querySelectorAll('[data-c-scroll]')].map(el=>[el.dataset.cScroll,[el.scrollLeft,el.scrollTop]]));
      const moved=shell.dataset.stage!==stage;
      shell.dataset.stage=stage;
      if(moved){
        const active=tunnel.findIndex(([key])=>key===({halfTalk:'half',fullTalk:'full'})[stage]||key===stage);
        $('seasonMatchRoute').innerHTML=tunnel.map(([,name,short],i)=>`<li${i===active?' aria-current="step"':i<active?' data-complete="true"':''}><span>${String(i+1).padStart(2,'0')}</span><b>${name}</b><small>${short}</small></li>`).join('');
      }
      $('seasonMatchTitle').textContent=title;
      $('seasonMatchKicker').textContent=kicker;
      $('seasonMatchMeta').textContent=`${H.clubs[c.f.home].name} v ${H.clubs[c.f.away].name} · ${P.meta(c.f)}`;
      $('seasonMatchClock').dateTime=new Date(c.f.date).toISOString();
      $('seasonMatchClock').textContent=`${H.calendar(c.f.date).day} · ${H.calendar(c.f.date).date}`;
      $('seasonMatchBack').hidden=!['meeting','selection'].includes(stage);
      $('seasonMatchBack').setAttribute('aria-label',stage==='meeting'?'Back to clubhouse':'Back to tactical meeting');
      const advance=$('seasonMatchAdvance');advance.querySelector('span').textContent=label;
      advance.disabled=stage==='selection'&&c.s.plan.xi.filter(Boolean).length!==11;
      document.title=`Touchline 26 — ${title}`;
      const html=({meeting:P.advice,selection:P.picker,briefing:P.briefing,news:P.teamNews,preTalk:c=>R.room(c,'pre'),preview:P.preview,half:c=>R.report(c,c.a.half,false),halfTalk:c=>R.room(c,'half'),full:c=>R.report(c,c.s.results[c.a.id],true),fullTalk:c=>R.room(c,'full')})[stage](c);
      body.innerHTML=html;
      if(reset&&moved&&!global.matchMedia('(prefers-reduced-motion: reduce)').matches)body.animate([{opacity:.74,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}],{duration:240,easing:'cubic-bezier(.2,.7,.25,1)'});
      if(reset){$('seasonMatchStatus').hidden=true;global.scrollTo(0,0);$('seasonMatchTitle').focus({preventScroll:true});}
      else {
        for(const el of body.querySelectorAll('[data-c-scroll]'))if(saved.has(el.dataset.cScroll))[el.scrollLeft,el.scrollTop]=saved.get(el.dataset.cScroll);
        if(focusKey)[...body.querySelectorAll(focusKey[0])].find(el=>el.dataset[focusKey[1]]===focusKey[2]&&(focusKey.length===3||el.dataset.msVal===focusKey[3])&&!el.disabled)?.focus({preventScroll:true});
      }
    }
    function change(key,value){
      if(!store.edit(key,value)){render();note(key.startsWith('number:')?'Use a unique number from 1 to 99.':'This player can’t be used in that slot.');}
      else render();
    }
    shell.addEventListener('change',e=>{
      const key=e.target.dataset.msField;
      if(a()?.stage==='selection'&&key)change(key,e.target.value);
      else if(['preTalk','halfTalk','fullTalk'].includes(a()?.stage)&&key==='talk-player'){ui.talk={...ui.talk,id:e.target.value};render();}
    });
    shell.addEventListener('click',e=>{
      const b=e.target.closest('[data-ms-do]');if(!b||b.disabled||!a())return;
      const {msDo:key,msVal:v}=b.dataset, stage=a().stage, dlg=$('submitTeamDialog');
      if(key==='next'){
        if(dlg.open)return;
        if(stage==='selection')return dlg.showModal();
        if(stage==='halfTalk'&&store.secondHalf(a().checkpoint.ticks)){ui.talk={};return showLive(false,true);}
        if(stage==='fullTalk'&&store.close()){screens('club');view().unloadClub();onReturn('result');return;}
        const next=stages[stage]?.[2];
        if(next&&store.move(stage,next)){ui.talk={};return render(true);}
      }
      if(key==='back'&&stage==='selection'&&store.move(stage,'meeting'))return render(true);
      if(key==='back'&&stage==='meeting'&&store.leave()){screens('club');onReturn('meeting');return;}
      if(key==='cancel-submit'&&dlg.open)return dlg.close();
      if(key==='confirm-submit'&&dlg.open&&stage==='selection'){
        if(!store.submit())return note('Choose a complete, available starting XI before submitting.');
        dlg.close();return render(true);
      }
      if(stage==='meeting'&&key==='advice'){
        const keys=v.split(':'), value=keys.pop();return change(keys.join(':'),value);
      }
      if(stage==='selection'){
        if(key==='pick')return change('pick','');
        if(key==='select-tab')ui.tab=v;else if(key==='layout')ui.layout=v;else return;
        return render();
      }
      if(stage==='half'||stage==='full'){
        if(key==='report-mode')ui.reportMode=v;else if(key==='report-side')ui.reportSide=Number(v);
        else if(key==='interval-desk'&&stage==='half')return showLive(true);
        else return;
        return render();
      }
      const phase=({preTalk:'pre',halfTalk:'half',fullTalk:'full'})[stage];if(!phase)return;
      if(key==='audience'||key==='gesture'){ui.talk={...ui.talk,[key]:v};return render();}
      if(key==='statement'||key==='assistant'){
        const c=ctx(), ps=R.talkPlayers(c,phase), r=phase==='half'?c.a.half:phase==='full'?c.s.results[c.a.id]:null;
        const talk=Q.reaction(phase,c.f,c.side,{audience:ui.talk?.audience||'Room',gesture:ui.talk?.gesture||'No gesture',id:ui.talk?.id||ps[0].id,tone:v,assistant:key==='assistant'},ps,r);
        if(talk&&store.talk(phase,talk))return render();
        note('You have already addressed this audience.');
      }
    });
    return {open(){if(a()){ui.layout='expanded';ui.tab='overview';ui.reportMode='overview';render(true);}}};
  }
  global.TLClubMatch={create};
})(window);
