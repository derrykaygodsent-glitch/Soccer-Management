/* Optional manual handoff. No network access until a manager signs in. */
(function(global){
  'use strict';
  const config=/* @CLOUD@ */ {}, backupKey='touchline.cloud.2026.backup', linkKey='touchline.cloud.2026.link';
  const extras=['touchline26.2026.clubhouse.notebook','touchline26.2026.calendar-pause.v1','touchline26.2026.social.v1'];
  function init(game){
    const C=global.TLClubState,S=global.TLSeasonState,keys=[C.key,S.key,...extras];
    let token,user,link;
    try{link=JSON.parse(localStorage.getItem(linkKey));}catch{}
    const dialog=document.createElement('dialog');dialog.className='cc-dialog cloud-dialog';dialog.setAttribute('aria-label','Cloud saves');
    dialog.innerHTML=`<header><h2>Cloud saves</h2></header><p>Local play is always available. Upload manually before switching devices.</p>
    <fieldset><section data-auth><label>Email <input type="email" autocomplete="email"></label> <label>Password <input type="password" autocomplete="current-password"></label><p><button data-action="login">Sign in</button> <button data-action="signup">Create account</button></p></section>
    <section data-slots hidden><p id="cloudUser"></p><label>New slot name <input maxlength="64" value="Riverside"></label> <button data-action="create">Upload as new slot</button> <button data-action="save">Save linked slot</button><p>Private slots</p><select aria-label="Private slots"></select> <button data-action="load">Open selected slot</button> <button data-action="list">Refresh</button> <button data-action="logout">Sign out</button></section>
    <p role="status"></p><button data-action="recover">Restore previous local backup</button> <button data-action="close">Close</button></fieldset>`;
    document.body.append(dialog);
    const el=q=>dialog.querySelector(q), status=t=>el('[role=status]').textContent=t;
    const account=()=>{el('[data-auth]').hidden=!!token;el('[data-slots]').hidden=!token;el('#cloudUser').textContent=user?.email||'';el('[data-action=save]').disabled=!link||link.owner!==user?.id;};
    const capture=()=>({format:1,engine:config.engine,club:game.club(),season:game.season(),extras:[game.note(),game.target()==null?null:String(game.target()),localStorage.getItem(extras[2])]});
    function check(s){
      if(s?.format!==1||s.engine!==config.engine||!s.club?.sheet||!s.season?.plan||!Number.isFinite(s.season.now)||!Array.isArray(s.extras)||s.extras.length!==3||!s.extras.every(x=>x===null||typeof x==='string'))throw Error('Incompatible career. Your local game has not been replaced.');
      const season=S.normalize(s.season,s.club.sheet);C.normalize(s.club);
      if(season.session?.checkpoint?.commands.length!==s.season.session?.checkpoint?.commands.length||season.session?.checkpoint?.ticks!==s.season.session?.checkpoint?.ticks||season.now!==s.season.now||season.session?.stage!==s.season.session?.stage||Object.keys(season.results).length!==Object.keys(s.season.results).length)throw Error('Invalid career data.');
    }
    function put(k,v){if(v==null)localStorage.removeItem(k);else localStorage.setItem(k,v);}
    function restore(s,next){
      check(s);
      const old=capture(), all=[...keys,linkKey], raw=all.map(k=>localStorage.getItem(k));
      localStorage.setItem(backupKey,JSON.stringify({snapshot:old,link:link?JSON.stringify(link):null}));
      try{[JSON.stringify(s.club),JSON.stringify(s.season),...s.extras,next].forEach((v,i)=>put(all[i],v));}
      catch(error){all.forEach((k,i)=>put(k,raw[i]));throw error;}
      // Old match pagehide handlers must not write over the newly imported ledger.
      global.TLMatchView.unloadClub();
      location.reload();
    }
    async function api(path,body){
      const r=await fetch(config.url+path,{method:body?'POST':'GET',headers:{apikey:config.key,...(token?{Authorization:'Bearer '+token}:{}),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,cache:'no-store'});
      const text=await r.text(),data=text?JSON.parse(text):{};if(!r.ok){if(r.status===401){token=user=null;account();}throw Error(data.msg||data.message||data.error_description||'Request failed.');}return data;
    }
    async function list(){const rows=await api('/rest/v1/touchline_careers?select=id,name,revision,updated_at&order=updated_at.desc');el('select').replaceChildren(...rows.map(r=>new Option(`${r.name} · rev ${r.revision} · ${new Date(r.updated_at).toLocaleString()}`,r.id)));}
    async function act(a){
      if(a==='close')return dialog.close();
      if(a==='recover'){const b=JSON.parse(localStorage.getItem(backupKey));if(!b)throw Error('No previous local backup.');if(confirm('Swap this career with your previous local backup?'))restore(b.snapshot,b.link);return;}
      if(!config.url)throw Error('Cloud saves are not configured for this build. Local saves still work.');
      if(a==='login'||a==='signup'){
        const password=el('[type=password]'),body={email:el('[type=email]').value.trim(),password:password.value};password.value='';
        const data=await api(a==='login'?'/auth/v1/token?grant_type=password':'/auth/v1/signup',body);
        if(!data.access_token)return status('Check your email to confirm your account, then sign in.');
        token=data.access_token;user=data.user;account();await list();return status('Signed in. Nothing has been uploaded.');
      }
      if(a==='logout'){try{await api('/auth/v1/logout',{});}finally{token=user=null;account();}return status('Signed out.');}
      if(a==='list'){await list();return status('Slot list refreshed.');}
      if(a==='load'){
        const id=el('select').value;if(!id)throw Error('Select a slot first.');
        const [r]=await api('/rest/v1/touchline_careers?select=id,name,revision,payload&id=eq.'+encodeURIComponent(id));check(r?.payload);
        if(confirm(`Open ${r.name}, ${new Date(r.payload.season.now).toISOString().slice(0,10)} (${r.payload.season.session?.stage||'clubhouse'})? This device’s current career will be backed up.`))restore(r.payload,JSON.stringify({owner:user.id,id,revision:r.revision}));return;
      }
      const fresh=a==='create',label=el('[maxlength]').value.trim();if(fresh&&!label)throw Error('Name the new slot.');
      if(!fresh&&link?.owner!==user.id)throw Error('Open or create a slot first.');
      const snapshot=capture();check(snapshot);
      const [saved]=await api('/rest/v1/rpc/touchline_save',{slot:fresh?null:link.id,expected:fresh?0:link.revision,label,snapshot});
      if(!saved)throw Error('A newer save exists. Upload this device as a new slot, or open the cloud version. Neither was overwritten.');
      link={owner:user.id,id:saved.slot_id,revision:saved.saved_revision};localStorage.setItem(linkKey,JSON.stringify(link));account();status('Saved to cloud · revision '+link.revision);try{await list();}catch{status('Saved to cloud · revision '+link.revision+'. Refresh the slot list to see it.');}
    }
    document.addEventListener('click',e=>{if(!e.target.closest('[data-cloud]'))return;game.pause();account();status(config.url?'':'Cloud is not configured in this build.');dialog.showModal();});
    dialog.addEventListener('keydown',e=>e.stopPropagation());
    dialog.addEventListener('cancel',e=>{if(el('fieldset').disabled)e.preventDefault();});
    dialog.addEventListener('click',async e=>{const a=e.target.closest('[data-action]')?.dataset.action;if(!a)return;el('fieldset').disabled=true;try{await act(a);}catch(err){status(err.message);}finally{el('fieldset').disabled=false;}});
  }
  global.TLCloud={init};
})(window);
