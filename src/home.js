/* Touchline 26 — clubhouse navigation and calendar handover. */
(function(global){
  'use strict';
  const M=global.TLHomeData, K=global.TLSeasonCalendar, S=global.TLSeasonState, P=global.TLCalendarProgress;
  const U=global.TLClubUI, Office=global.TLClubOffice, {esc,icon}=U;
  const portraitImages=/* @HOME_PORTRAITS@ */ {};
  const $=id=>document.getElementById(id);
  const text=(id,value)=>{$(id).textContent=value;};
  const state={drawer:false,note:'',target:null,last:null,homeSnapshot:null};
  let desk,season,match,processor;
  const NOTE_KEY='touchline26.2026.clubhouse.notebook', PAUSE_KEY='touchline26.2026.calendar-pause.v1';
  const nav=[
    ['Clubhouse',[['Home','home','home'],['Inbox','mail','inbox'],['Social Feed','social','social']]],
    ['First Team',[['Squad','i-shirt','squad'],['Squad Planner','plan','planner'],['Tactics','tactics','tactics'],['Dynamics','team','dynamics'],['Training','cone','training'],['Medical Centre','medical','medical']]],
    ['Season',[['Schedule','calendar','fixtures'],['Competitions','cup','league']]],
    ['Club Operations',[['Scouting','radar','scouting'],['Transfers','swap','transfers'],['Staff','team','staff'],['Development Centre','trend','development']]],
    ['Front Office',[['Club Info','shield','club'],['Club Vision','case','vision'],['Finances','money','finance']]]
  ];
  const routes={
    home:['Home','home'], inbox:['Inbox','inbox','messages'], social:['Social Feed','inbox','social'], news:['News','inbox','news'], squad:['Squad','squad'], planner:['Squad Planner','planner'],
    dynamics:['Dynamics','dynamics'], tactics:['Tactics','tactics'], staff:['Staff','staff'], medical:['Medical Centre','medical'], training:['Training','training'],
    fixtures:['Schedule & fixtures','schedule'], league:['Competitions & league table','competitions','competitions','PD'], day:['Calendar Desk','day','today'],
    scouting:['Scouting','scouting'], transfers:['Transfers','transfers'], club:['Club information','club'], vision:['Club Vision','vision'],
    finance:['Finances','finance'], development:['Development Centre','development'], leaders:['Player stats','squad','stats'], player:['Player profile','player']
  };
  const tabs=[['Overview','home'],['Calendar Desk','day'],['Club vision','vision']];
  const modalTitles={profile:'Manager profile',search:'Search',notebook:'Notebook',help:'Clubhouse guide'};

  function crest(id) {
    const c = typeof id === 'string' ? M.clubs[id] : id;
    if (!c) return '';
    const box = '<svg class="hc-crest" viewBox="0 0 100 100" aria-hidden="true" focusable="false">';
    if (id === 'rvr') return `${box}
      <circle cx="50" cy="50" r="47" fill="#123c71" stroke="#e9bd57" stroke-width="1.8"/>
      <circle cx="50" cy="50" r="42.5" fill="#1c64aa" stroke="#f6d78a" stroke-width=".6"/>
      <circle cx="50" cy="50" r="29" fill="#e9f2fa" stroke="#e8bd5c" stroke-width="1.8"/>
      <text x="50" y="18.6" fill="#fff1cc" text-anchor="middle" font-size="9.2" font-weight="900" letter-spacing=".7">RIVERSIDE</text>
      <text x="50" y="87" fill="#fff1cc" text-anchor="middle" font-size="8.2" font-weight="850" letter-spacing=".8">FC · 1896</text>
      <path d="M25 51c9-6 16-6 24-1 9 5 15 5 26-2v5c-11 7-18 7-27 2-8-4-15-4-23 1Zm4 9c7-4 14-3 20 1 8 4 14 3 22-1l-4 7c-7 2-12 1-18-2-6-3-10-3-15-1Z" fill="#215c9d"/>
      <path d="M45 29h10v19H45zM41 37h18v4H41z" fill="#204d88"/>
      <path d="M50 24l2 5h-4z" fill="#cd943e"/><circle cx="13" cy="49" r="3.2" fill="#f6c267"/><circle cx="87" cy="49" r="3.2" fill="#f6c267"/>
    </svg>`;
    if (id === 'hpt') return `${box}
      <path d="M8 3h84v45c0 24-13 41-42 50C21 89 8 72 8 48Z" fill="#e8c539" stroke="#fff060" stroke-width="2"/>
      <path d="M13 8h74v40c0 22-11 36-37 44C24 84 13 70 13 48Z" fill="#b8e4f5" stroke="#1d3a5c" stroke-width="3"/>
      <path d="M24 22h52v28c0 14-8 25-26 33-18-8-26-19-26-33Z" fill="#f4cc49" stroke="#283a51" stroke-width="2"/>
      <path d="M24 22h52v10H24zm0 42c9 0 13-5 21-5s13 5 21 5h9c-5 8-12 14-25 19-12-5-20-11-26-19Z" fill="#253c5b"/>
      <path d="M50 37v21m-9-16h18m-22 5c0 10 7 15 13 15s13-5 13-15m-26 0-4 4m30-4 4 4" fill="none" stroke="#273850" stroke-width="3.2" stroke-linecap="round"/>
      <circle cx="50" cy="35" r="3.5" fill="none" stroke="#273850" stroke-width="2"/>
      <path d="m46 13 4-4 4 4-4 4Z" fill="#dba421"/>
      <text x="50" y="76" fill="#f6edc6" text-anchor="middle" font-size="8.8" font-weight="900" letter-spacing=".6">HPT</text>
    </svg>`;
    const shield = 'M8 5h84v45c0 20-13 36-42 46C21 86 8 70 8 50Z';
    const glyphs = {
      nbu: '<path d="M23 63V40l13 7V33l14 8V29l15 8 12-3v29Z" fill="currentColor"/><path d="M31 62h38" fill="none" stroke="#bd263d" stroke-width="3"/>',
      kgd: '<path d="m26 39 10 9 14-19 14 19 10-9-5 25H31Z" fill="currentColor"/><circle cx="50" cy="28" r="4" fill="currentColor"/>',
      efc: '<path d="M27 64V45h13v19m5 0V33h12v31m5 0V44h12v20" fill="none" stroke="currentColor" stroke-width="6"/>',
      swl: '<path d="m22 62 19-27 14 20 8-10 15 17H22Z" fill="currentColor"/><path d="M20 69h60" stroke="currentColor" stroke-width="3"/>',
      oak: '<path d="M47 69v-9c-11 7-20-2-17-11-8-7-1-16 7-16 3-11 23-11 26 0 8 0 15 9 7 16 3 9-6 18-17 11v9Z" fill="currentColor"/>',
      crl: '<path d="M52 27c-4 10-18 18-18 28 0 11 7 17 16 17 10 0 17-6 17-15 0-8-6-15-10-18 1 8-5 11-8 12 5-7 5-15 3-24Z" fill="currentColor"/>'
    };
    return `${box}<path d="${shield}" fill="${c.primary}" stroke="${c.secondary}" stroke-width="5"/><path d="M14 18h72m-65 53h58" stroke="${c.secondary}" stroke-opacity=".7" stroke-width="2"/>
      <g style="color:${c.secondary}">${glyphs[id] || `<text x="50" y="60" fill="currentColor" text-anchor="middle" font-size="29" font-family="Barlow Condensed,sans-serif" font-weight="900">${esc(c.short.slice(0,2))}</text>`}</g>
      <text x="50" y="83" fill="${c.secondary}" text-anchor="middle" font-size="10" font-weight="900" letter-spacing=".9">${esc(c.short)}</text></svg>`;
  }

  function navigation(){
    $('homeNav').innerHTML=nav.map(([group,rows])=>`<div class="hc-nav-group"><p>${group}</p>${rows.map(([label,glyph,id])=>`<button class="hc-nav-button" type="button" data-hc-open="${id}"${id==='home'?' aria-current="page"':''}>${icon(glyph)}<span>${label}</span>${id==='inbox'?'<small class="hc-inbox-badge" id="homeUnread" hidden></small>':''}</button>`).join('')}</div>`).join('');
    $('homeHeaderCrest').textContent='◇';
    homeTabs();
  }
  function homeTabs(){
    $('homeTabs').innerHTML=tabs.map(([label,id])=>`<button class="hc-tab" type="button" data-hc-open="${id}"${id==='home'?' aria-current="page"':''}>${label}</button>`).join('');
  }
  const datum=(label,value)=>`<p class="hc-datum"><strong>${esc(value)}</strong><span>${esc(label)}</span></p>`;
  function search(){
    const input=$('homeSearchInput'), q=input.value.trim().toLowerCase(), entries=[...Object.entries(routes).map(([id,[label]])=>[id,label]),['profile',modalTitles.profile],['notebook',modalTitles.notebook]];
    const results=entries.filter(([id,label])=>!q||`${id} ${label} ${id==='club'?'Riverside FC':''}`.toLowerCase().includes(q));
    $('homeSearchResults').innerHTML=results.length?results.map(([id,label])=>`<button class="hc-dialog-link" type="button" data-hc-open="${id}">${esc(label)}${icon('i-arrow')}</button>`).join(''):'<p class="cc-empty">No matching sections.</p>';
  }
  function showPanel(title,body){
    toggleDrawer(false);
    text('homeDialogTitle',title);$('homeDialogBody').innerHTML=body;
    const dlg=$('homeDialog');if(!dlg.open)dlg.showModal();
    $('homeDialogBody').scrollTop=0;
  }
  function openPanel(id){
    if(Object.hasOwn(routes,id)){
      const [,page,tab,key]=routes[id];
      toggleDrawer(false,state.drawer&&desk.route().page===page);
      return desk.go(page,tab,key);
    }
    if(!Object.hasOwn(modalTitles,id))return;
    const body={
      profile:datum('Manager',M.manager)+datum('Current club',M.clubs[M.homeId].name)+datum('Role','First-team manager')+datum('Club date',M.calendar(season.value.now).date),
      search:'<label for="homeSearchInput">Find a page in the clubhouse</label><input class="hc-search-field" type="search" id="homeSearchInput" autocomplete="off" placeholder="Try fixtures, scouting or finances"><div id="homeSearchResults"></div>',
      notebook:'<p>Keep notes about the club. They stay on this device when local storage is available.</p><label class="hc-sr" for="homeNotes">Club notes</label><textarea class="hc-notebook" id="homeNotes" maxlength="16000" placeholder="Write a note…"></textarea>',
      help:`<p>Manage Riverside through the fictional 2026/27 season.</p><ul class="hc-details-list"><li><b>Continue</b> or <kbd>Space</kbd> starts automatic calendar processing. <b>Stop processing</b>, <kbd>Space</kbd> or <kbd>Esc</kbd> stops at the saved date.</li><li>The clock pauses for mandatory Inbox decisions and Riverside matchday. Select a future date in Calendar Desk to add an optional one-time stop.</li><li>Opening a message does not answer it. While reading the Inbox, <b>Next Unread</b> opens the next message without advancing the calendar.</li><li>On matchday open the tactical meeting, submit the team, and brief your players. Kick off manually from the pitch.</li><li>Live changes are match-only unless saved. The final whistle records the real result. Saves stay in this browser where local storage is allowed.</li></ul>`
    };
    showPanel(modalTitles[id],body[id]);
    if(id==='search'){search();$('homeSearchInput').focus();}
    if(id==='notebook'){$('homeNotes').value=state.note;$('homeNotes').focus();}
  }
  const navKey=(r,view)=>r.page==='inbox'&&r.tab==='social'?'social':r.page==='day'?'fixtures':r.page==='competitions'?'league':(view?.nav||r.page);
  function onPage(r,view,history){
    const root=$('homeScreen'), page=navKey(r,view);root.dataset.page=r.page;
    $('homeMain').hidden=r.page!=='home';
    if(!view)homeTabs();
    const title=view?.heading?.(desk.context())||view?.title||'Home';
    text('homeTitle',title);
    text('homeSection',nav.find(([,entries])=>entries.some(([, ,key])=>key===page))?.[0]||'Clubhouse');
    for(const b of $('homeNav').querySelectorAll('[data-hc-open]')){
      if(b.dataset.hcOpen===page)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
    }
    $('homeBack').disabled=!history.back;$('homeForward').disabled=!history.forward;
    document.title=`Touchline 26 — ${r.page==='home'?'Manager’s Office':title}`;
    syncClub();
  }
  function action(){
    if(processor?.running)return ['Stop processing','stop','Stop at the current club date (Esc or Space)','stop'];
    const s=season.value,r=desk.route(), unread=desk.unread();
    if(r.page==='inbox'&&r.tab==='messages'&&unread.length)return ['Next Unread','next-unread','Open the next unread message','mail'];
    const g=P.gate(s);
    if(g?.reason==='decision')return ['Inbox','required',`${g.messages.length} ${g.messages.length===1?'decision requires':'decisions require'} your attention`,'mail'];
    if(g?.reason==='fixture')return ['Tactical Meeting','meeting','Prepare for today’s fixture','tactics'];
    if(g?.reason==='end')return ['Season complete','end','All published calendar dates have passed','check'];
    return ['Continue','day','Process the club calendar (Space)','i-arrow'];
  }
  function clock(now){
    const date=M.calendar(now);
    $('homeClock').dateTime=new Date(now).toISOString();text('homeDay',date.day);text('homeDate',date.date);
  }
  function syncClub(){
    if(!desk||!season)return;
    const c=desk.context(), s=season.value, unread=c.unread().length;
    clock(s.now);
    const badge=$('homeUnread');badge.hidden=unread===0;badge.textContent=unread;badge.setAttribute('aria-label',`${unread} unread messages`);
    const b=$('homeContinue'),[label,cmd,tip,glyph]=action();
    b.querySelector('span').textContent=label;b.title=tip;b.dataset.action=cmd;b.disabled=cmd==='end';
    $('homeContinueIcon').setAttribute('href',`#${glyph.startsWith('i-')?glyph:'hc-i-'+glyph}`);
    if(!processor?.running&&c.r.page==='home'&&(state.homeSnapshot?.s!==s||state.homeSnapshot?.club!==c.s)){
      state.homeSnapshot={s,club:c.s};$('homeMain').innerHTML=Office.clubhouse(c);
    }
  }
  function toggleDrawer(open,focus=false){
    if(open&&processor?.running)return;
    const wasOpen=state.drawer;state.drawer=open;
    $('homeSidebar').classList.toggle('hc-open',open);$('homeScrim').hidden=!open;$('homeFrame').inert=open;
    $('homeMenu').setAttribute('aria-expanded',String(open));
    if(open&&focus)($('homeNav').querySelector('[aria-current=page]')||$('homeNav').querySelector('button')).focus();
    else if(wasOpen&&focus)$('homeMenu').focus();
  }
  function dayDesk(focus=true){
    const s=season.value, tab=K.onDate(s,s.now).length?'fixtures':'today', r=desk.route();
    if(r.page==='day'&&r.tab===tab&&!r.id){desk.render(false);$('clubPage').scrollTop=0;}
    else desk.go('day',tab);
    if(focus)$('homeContinue').focus({preventScroll:true});
  }
  function setPause(value){
    const ts=Number(value);
    if(value!==null&&(!Number.isFinite(ts)||K.day(ts)!==ts||ts<=K.day(season.value.now)||ts>K.end))return false;
    state.target=value===null?null:ts;
    try{if(state.target===null)global.localStorage.removeItem(PAUSE_KEY);else global.localStorage.setItem(PAUSE_KEY,String(ts));}catch{}
    return true;
  }
  function processingUI(on){
    const root=$('homeScreen'), pane=$('homeProcessing');
    root.dataset.processing=String(on);pane.hidden=!on;
    for(const id of ['homeSidebar','homeTabs','homeMain','clubPage','homeCalendarLink','homeMenu','homeBack','homeForward'])$(id).inert=on;
    for(const control of root.querySelectorAll('.hc-bar [data-hc-open]'))control.inert=on;
  }
  function drawProgress(frame){
    if(!frame.days){state.last=null;processingUI(true);syncClub();$('homeProcessing').scrollTop=0;$('homeContinue').focus({preventScroll:true});}
    else clock(frame.now);
    $('processingCount').innerHTML=`<strong>${frame.days}</strong><span>${frame.days===1?'DAY':'DAYS'}<br>PROCESSED</span>`;
    $('processingDays').innerHTML=Office.processing(desk.context(),frame);
    $('processingTarget').hidden=frame.target==null;
    if(frame.target!=null)text('processingTarget',`Selected pause: ${M.calendar(frame.target).date}`);
    text('processingSpeech',`${M.calendar(frame.now).date}. ${frame.days} ${frame.days===1?'day':'days'} processed.`);
  }
  function finishProgress(result){
    state.last=result;if(state.target!==null&&state.target<=K.day(result.now))setPause(null);
    processingUI(false);dayDesk();
  }
  function progress(){
    if($('homeScreen').hidden||$('homeDialog').open||state.drawer)return;
    const [,cmd]=action();
    if(cmd==='stop')return processor.stop();
    if(cmd==='next-unread')return desk.act('next-unread');
    if(cmd==='required')return desk.message(S.pending(season.value)[0].id);
    if(cmd==='meeting'&&season.enter())return match.open();
    if(cmd==='day')return processor.start();
  }
  function init(){
    global.TLManagerDesk.install({navigation,toggleDrawer});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window);
