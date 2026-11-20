/* Optional manual handoff. No network access until a manager signs in. */
(function(global){
  'use strict';
  const config=/* @CLOUD@ */ {}, backupKey='touchline.manager.cloud.backup.v2', linkKey='touchline.manager.cloud.link.v2';
  const extras=['touchline26.2026.clubhouse.notebook','touchline26.2026.calendar-pause.v1','touchline26.2026.social.v1'];
  function init(game){
    let token,user,link;function currentLink(){try{return JSON.parse(localStorage.getItem(linkKey)||'{}')[game.current()?.id]||null;}catch{return null;}}
    function bind(id,value){const links=JSON.parse(localStorage.getItem(linkKey)||'{}');links[id]=value;localStorage.setItem(linkKey,JSON.stringify(links));}
    const dialog=document.createElement('dialog');dialog.className='cc-dialog cloud-dialog';dialog.setAttribute('aria-label','Cloud saves');
    dialog.innerHTML=`<header><h2>Cloud saves</h2></header><p>Local play is always available. Upload manually before switching devices.</p>
    <fieldset><section data-auth><label>Email <input type="email" autocomplete="email"></label> <label>Password <input type="password" autocomplete="current-password"></label><p><button data-action="login">Sign in</button> <button data-action="signup">Create account</button></p></section>
    <section data-slots hidden><p id="cloudUser"></p><label>New slot name <input maxlength="64" value="Manager career"></label> <button data-action="create">Upload as new slot</button> <button data-action="save">Save linked slot</button><p>Private slots</p><select aria-label="Private slots"></select> <button data-action="load">Open selected slot</button> <button data-action="list">Refresh</button> <button data-action="logout">Sign out</button></section>
    <p role="status"></p><button data-action="export">Export career file</button> <label>Import career file <input type="file" accept="application/json,.json" data-import></label><button data-action="recover">Restore previous local backup</button> <button data-action="close">Close</button></fieldset>`;
    document.body.append(dialog);
    const el=q=>dialog.querySelector(q), status=t=>el('[role=status]').textContent=t;
    const account=()=>{link=currentLink();el('[data-auth]').hidden=!!token;el('[data-slots]').hidden=!token;el('#cloudUser').textContent=user?.email||'';el('[data-action=create]').disabled=!game.current();el('[data-action=export]').disabled=!game.current();el('[data-action=save]').disabled=!link||link.owner!==user?.id;};
    const capture=()=>({format:2,kind:'touchline-manager',engine:config.engine,career:game.current()});
    function check(snapshot){const c=snapshot?.career;if(snapshot?.format!==2||snapshot.kind!=='touchline-manager'||typeof c?.id!=='string'||!c.id||!c.profile?.name||!Array.isArray(c.profile.children)||!Number.isInteger(c.day)||!['roster','plans','mail','staff'].every(k=>Array.isArray(c[k]))||!Number.isFinite(c.fund)||!Number.isFinite(c.cash))throw Error('Not a compatible manager save. Local careers are unchanged.');if((c.practice||c.leagueSession)&&snapshot.engine!==config.engine)throw Error('This match checkpoint uses another engine version. Finish the match on its original device and upload again.');return c;}
    function restore(snapshot,next){const c=check(snapshot),old=game.find(c.id);if(!confirm(`Load ${c.profile.name}, game day ${c.day}? ${old?'The existing local copy of this career will be backed up.':'Other local careers will be kept.'}`))return;if(old)localStorage.setItem(backupKey,JSON.stringify({snapshot:{...snapshot,career:old,engine:config.engine},link:JSON.parse(localStorage.getItem(linkKey)||'{}')[c.id]||null}));game.import(c);bind(c.id,next);location.reload();}
    el('[data-import]').onchange=async ev=>{try{const f=ev.target.files[0];if(f){if(f.size>12000000)throw Error('File is too large.');restore(JSON.parse(await f.text()),null);}}catch(err){status(err.message);}finally{ev.target.value='';}};
    async function api(path,body){
      const r=await fetch(config.url+path,{method:body?'POST':'GET',headers:{apikey:config.key,...(token?{Authorization:'Bearer '+token}:{}),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,cache:'no-store'});
      const text=await r.text(),data=text?JSON.parse(text):{};if(!r.ok){if(r.status===401){token=user=null;account();}throw Error(data.msg||data.message||data.error_description||'Request failed.');}return data;
    }
    async function list(){const rows=await api('/rest/v1/touchline_careers?select=id,name,revision,updated_at&order=updated_at.desc');el('select').replaceChildren(...rows.map(r=>new Option(`${r.name} · rev ${r.revision} · ${new Date(r.updated_at).toLocaleString()}`,r.id)));}
    async function act(a){
      if(a==='close')return dialog.close();
      if(a==='export'){const snap=capture(),c=check(snap),u=URL.createObjectURL(new Blob([JSON.stringify(snap)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='Touchline-day-'+c.day+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);return status('Career file exported. Keep it private.');}
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
        restore(r.payload,{owner:user.id,id,revision:r.revision});return;
      }
      const fresh=a==='create',label=el('[maxlength]').value.trim();if(fresh&&!label)throw Error('Name the new slot.');
      if(!fresh&&link?.owner!==user.id)throw Error('Open or create a slot first.');
      const snapshot=capture();check(snapshot);
      const [saved]=await api('/rest/v1/rpc/touchline_save',{slot:fresh?null:link.id,expected:fresh?0:link.revision,label,snapshot});
      if(!saved)throw Error('A newer save exists. Upload this device as a new slot, or open the cloud version. Neither was overwritten.');
      link={owner:user.id,id:saved.slot_id,revision:saved.saved_revision};bind(snapshot.career.id,link);account();status('Saved to cloud · revision '+link.revision);try{await list();}catch{status('Saved to cloud · revision '+link.revision+'. Refresh the slot list to see it.');}
    }
    document.addEventListener('click',e=>{if(!e.target.closest('[data-cloud]'))return;account();el('[maxlength]').value=game.current()?.profile.name||'Manager career';status(config.url?'Device autosave is local. Upload on the original device, then open the slot here with the same account.':'Cloud is not configured in this build.');dialog.showModal();});
    dialog.addEventListener('keydown',e=>e.stopPropagation());
    dialog.addEventListener('cancel',e=>{if(el('fieldset').disabled)e.preventDefault();});
    dialog.addEventListener('click',async e=>{const a=e.target.closest('[data-action]')?.dataset.action;if(!a)return;el('fieldset').disabled=true;try{await act(a);}catch(err){status(err.message);}finally{el('fieldset').disabled=false;}});
  }
  global.TLCloud={init};
})(window);
