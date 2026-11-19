/* Club route history, reusable rendering context, and event delegation. */
(function (global) {
  'use strict';
  const U = global.TLClubUI, {C,views,esc} = U, S = global.TLClubState;
  function create({ root, content, tabs, dialog, crest, portrait, showPanel, onPage, onState, scrollHome, calendar }) {
    let storage;
    try { storage = global.localStorage; } catch { /* standalone file preview */ }
    const store = S.open(storage), Season=global.TLSeasonState, Calendar=global.TLSeasonCalendar;
    // Import an existing planning sheet once, but make a fresh competitive XI
    // for new clubs instead of treating default draft picks as deliberate edits.
    let savedSheet=[];
    try { if(storage?.getItem(S.key))savedSheet=store.value.sheet; } catch {}
    const season=Season.open(storage,savedSheet);
    const mail=()=>Season.messages(season.value);
    const unread=()=>Season.unread(season.value,store.value.read);
    const isRead=m=>(m.type==='season'?season.value.read:store.value.read).includes(m.id);
    const fixtures=()=>Calendar.clubFixtures(season.value);
    const history = [{page:'home',tab:'',id:''}];
    const pageState = Object.create(null);
    let cursor = 0, serial = 0, timer;
    const heading = document.getElementById('homeTitle');
    const status = document.getElementById('clubStatus');
    const route = () => history[cursor];
    const current = () => views[route().page];
    const ui = () => pageState[route().page] ||= {};
    const narrow = () => global.matchMedia('(max-width:720px)').matches;
    const tabsOf = view => view.tabs || [];
    const tabMarkup = (r,view) => tabsOf(view).map(([id,label])=>`<button class="hc-tab" type="button" data-c-go="${r.page}" data-c-tab="${esc(id)}"${view.retainId&&r.id?` data-c-id="${esc(r.id)}"`: ''}${r.tab===id?' aria-current="page"':''}>${esc(label)}</button>`).join('');
    function note(message) {
      status.textContent = message;
      status.hidden = false;
      clearTimeout(timer);
      timer = setTimeout(()=>{ status.hidden=true; }, 3800);
    }
    function actionState(type, value) {
      const changed = type==='read'&&mail().some(m=>m.id===value&&m.type==='season')?season.read(value):store.apply(type,value);
      if(type==='read-all')season.readAll();
      if (changed) onState();
      return changed;
    }
    function context() {
      return { r:route(), ui:ui(), get s(){ return store.value; }, get fiscal(){return S.budgets(store.value); }, now:season.value.now, season, mail, isRead, fixtures, standings:()=>Calendar.standings(season.value), crest,portrait,narrow,go,render,note,calendar,
        apply:actionState, show:showPanel, close:()=>dialog.open&&dialog.close(), unread,
        serial(prefix, existing=[]) { let id; do { id=`${prefix}-${++serial}`; } while(existing.includes(id)); return id; }
      };
    }
    function go(page, tab = '', id = '', replace = false) {
      const view = views[page];
      if (page!=='home' && !view) return;
      const target = { page, tab:view?(tabsOf(view).some(([t])=>t===tab)?tab:tabsOf(view)[0]?.[0]||''):'', id:String(id||'') };
      const previous = route();
      if (previous.page===target.page && previous.tab===target.tab && previous.id===target.id) {
        if (dialog.open) dialog.close();
        return;
      }
      if (replace) history[cursor]=target;
      else { history.splice(cursor+1,Infinity,target); cursor++; }
      enter(previous);
    }
    function step(direction){
      const next=cursor+direction;
      if (next<0||next>=history.length) return;
      const previous=route(); cursor=next; enter(previous);
    }
    function enter(previous) {
      if (dialog.open) dialog.close();
      const view=current(), r=route(), major=previous.page!==r.page;
      if (view) view.enter?.(context());
      const keep = !major && previous.tab===r.tab;
      render(keep);
      onPage(r,view, { back:cursor>0, forward:cursor<history.length-1 });
      const panel=view?content:document.getElementById('homeMain');
      if((!keep||view?.retainId)&&!global.matchMedia('(prefers-reduced-motion: reduce)').matches){
        panel.getAnimations().filter(a=>a.id==='tl-reveal').forEach(a=>a.cancel());
        const anim=panel.animate([{opacity:.55,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:190,easing:'cubic-bezier(.2,.7,.25,1)'});
        anim.id='tl-reveal';
      }
      if (!keep) {
        if (view) content.scrollTop=0; else scrollHome();
        global.scrollTo(0,0);
      }
      if (major || dialog.contains(document.activeElement)) heading.focus({preventScroll:true});
      if (view && (!keep || view.retainId)) {
        const active=tabs.querySelector('[aria-current="page"]');
        if (active) {
          const tab=active.getBoundingClientRect(), bar=tabs.getBoundingClientRect();
          if (tab.left<bar.left) tabs.scrollLeft-=bar.left-tab.left+5;
          else if (tab.right>bar.right) tabs.scrollLeft+=tab.right-bar.right+5;
          if (!major && previous.tab!==r.tab) active.focus({preventScroll:true});
        }
      }
      view?.after?.(context(),previous);
    }
    function focusKey(el) {
      if (!el || !['BUTTON','INPUT','SELECT','SUMMARY'].includes(el.tagName)) return '';
      const d=el.dataset;
      return [el.tagName,d.cGo,d.cTab,d.cId,d.cDo,d.cVal,d.cField,d.cSearch,d.cKey].join('|');
    }
    function saveScroll() {
      const parts = [...content.querySelectorAll('[data-c-scroll]')].map(el=>[el.dataset.cScroll,el.scrollTop,el.scrollLeft]);
      return new Map(parts.map(([id,y,x])=>[id,[y,x]]));
    }
    function render(keep = true) {
      const view=current(), r=route();
      if (view) {
        const oldFocus = document.activeElement;
        const inContent=content.contains(oldFocus);
        const key=inContent?focusKey(oldFocus):'';
        let caret;
        if(inContent && oldFocus.tagName==='INPUT') { try {caret=[oldFocus.selectionStart,oldFocus.selectionEnd];} catch {} }
        const scrolled=keep?saveScroll():new Map();
        const top=keep?content.scrollTop:0;
        content.dataset.room=r.page;
        content.dataset.view=r.tab;
        content.innerHTML=global.TLClubOffice.room(context(),view);
        if (keep) {
          content.scrollTop=top;
          content.querySelectorAll('[data-c-scroll]').forEach(el=>{const xy=scrolled.get(el.dataset.cScroll); if(xy) [el.scrollTop,el.scrollLeft]=xy; });
          if(key) {
            const matching=[...content.querySelectorAll('button,input,select,summary')].find(el=>focusKey(el)===key&&!el.disabled);
            matching?.focus({preventScroll:true});
            if(caret?.[0]!=null&&matching) { try { matching.setSelectionRange(...caret); } catch {} }
          }
        }
        const markup=tabMarkup(r,view);
        if(tabs.dataset.cTabPage!==`${r.page}:${r.tab}:${view.retainId?r.id:''}`) {
          tabs.innerHTML=markup; tabs.dataset.cTabPage=`${r.page}:${r.tab}:${view.retainId?r.id:''}`;
        }
      } else delete tabs.dataset.cTabPage;
      content.hidden=!view;
      onState();
    }
    function message(id){
      const i=pageState.inbox ||= {}; i.filter='all'; i.q=''; i.closed=[];
      return go('inbox','messages',id);
    }
    function act(action,value,button) {
      const c=context();
      if(action==='player' && Object.hasOwn(C.players,value)) return go('player','overview',value);
      if(action==='fixture') return go('schedule','fixtures',value);
      if(action==='next-unread') {
        const next=c.unread()[0]; if(!next) return;
        return message(next.id);
      }
      // A dialog may have been opened from a different destination.
      const ns=button?.closest('[data-c-owner]')?.dataset.cOwner;
      return (ns?views[ns]:current())?.action?.(c,action,value,button);
    }
    root.addEventListener('click',event=>{
      const button=event.target.closest('button');
      if(!button) {
        const row=event.target.closest('[data-fixture-row]');
        if(row && content.contains(row)) go('schedule','fixtures',row.dataset.fixtureRow);
        return;
      }
      if(button.disabled) return;
      if(button.dataset.cGo) go(button.dataset.cGo,button.dataset.cTab,button.dataset.cId);
      else if(button.dataset.cDo) act(button.dataset.cDo,button.dataset.cVal,button);
      else if(button.hasAttribute('data-c-submit')) submitForm(button.closest('[data-c-form]'));
    });
    root.addEventListener('change',event=>{
      const t=event.target, field=t.dataset.cField;
      if(!field || !content.contains(t)) return;
      const value=t.type==='checkbox'?t.checked:t.value;
      ui()[field]=value;
      if(!current()?.field?.(context(),field,value)) render();
    });
    root.addEventListener('input',event=>{
      const t=event.target,field=t.dataset.cSearch;
      if(field && content.contains(t)) { ui()[field]=t.value; render(); }
    });
    // The offline viewer allows scripts, not form navigation. Validate and apply
    // edits locally rather than depending on a native submit event in that iframe.
    function submitForm(f) {
      if (!f || !f.reportValidity()) return;
      const owner=f.closest('[data-c-owner]')?.dataset.cOwner;
      const error=(owner?views[owner]:current())?.submit?.(context(),f.dataset.cForm,f.dataset.cVal,new FormData(f));
      const el=f.querySelector('.cc-form-error');
      if(error && el) { el.textContent=error; el.hidden=false; }
    }
    root.addEventListener('keydown',event=>{
      if(event.key!=='Enter'||event.isComposing||!event.target.matches('input:not([type=checkbox])')) return;
      const form=event.target.closest('[data-c-form]');
      if(form) {event.preventDefault();submitForm(form);}
    });
    root.addEventListener('submit',event=>{
      if(event.target.dataset.cForm){event.preventDefault();submitForm(event.target);}
    });
    return {go,step,act,render,route,context,view:current,unread,season,message,note,budgets:()=>S.budgets(store.value)};
  }
  global.TLClubDesk={create};
})(window);
