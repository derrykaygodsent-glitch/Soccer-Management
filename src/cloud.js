/* Optional manual handoff. No network access until a manager signs in. */
(function(global){
  'use strict';
  const config=/* @CLOUD@ */ {}, backupKey='touchline.manager.cloud.backup.v2', linkKey='touchline.manager.cloud.link.v2';
  const sessionKey='touchline.manager.cloud.tab';
  function init(game){
    let token,user,link;function currentLink(){try{return JSON.parse(localStorage.getItem(linkKey)||'{}')[game.current()?.id]||null;}catch{return null;}}
    function bind(id,value){const links=JSON.parse(localStorage.getItem(linkKey)||'{}');links[id]=value;localStorage.setItem(linkKey,JSON.stringify(links));}
    const dialog=document.createElement('dialog');dialog.className='cc-dialog cloud-dialog';dialog.setAttribute('aria-label','Cloud saves');
    dialog.innerHTML=`<fieldset><header class="locker-hero"><div><small>TOUCHLINE　 /　 CAREER SERVICES</small><h2>Cloud locker</h2><p>Your career, on either device.</p></div><button type="button" aria-label="Close cloud locker" data-action="close">×</button></header>
    <main class="locker-body"><section data-auth><form data-credentials><h3 data-auth-title>Welcome back</h3><label>Email address<input required type="email" inputmode="email" autocapitalize="none" spellcheck="false" autocomplete="username" placeholder="you@example.com"></label><label>Password<input required type="password" autocomplete="current-password" enterkeyhint="go"></label><button class="locker-primary" type="submit" data-auth-submit>Sign in</button></form><button data-action="authMode" class="locker-link">New here? Create an account</button></section>
    <section data-slots hidden><small id="cloudUser"></small><article data-device><small>ON THIS DEVICE</small><h3 data-manager></h3><p data-link-state></p><button class="locker-primary" data-action="upload">Upload career</button></article><article><small>IN YOUR CLOUD LOCKER</small><h3 data-cloud-count>Private careers</h3><label data-picker>Choose a career<select aria-label="Cloud career"></select></label><p data-cloud-detail></p><button class="locker-primary" data-action="load">Continue cloud career →</button><button class="locker-link" data-action="list">Refresh</button></article></section>
    <p role="status" aria-live="polite"></p><details class="locker-tools"><summary>Backup &amp; account options</summary><section data-cloud-tools hidden><label>Separate copy name<input maxlength="64" value="Manager career"></label><button data-action="create">Upload a separate copy</button><button data-action="logout">Sign out</button></section><button data-action="export">Export career file</button><label>Import career file<input type="file" accept="application/json,.json" data-import></label><button data-action="recover">Restore previous local backup</button></details></main></fieldset>`;
    document.body.append(dialog);
    const el=q=>dialog.querySelector(q),status=t=>el('[role=status]').textContent=t;
    let signup=false,rows=[];function selected(){const r=rows.find(x=>x.id===el('select').value)||rows[0];el('[data-cloud-count]').textContent=r?r.name:'No uploads yet';el('[data-cloud-detail]').textContent=r?'Saved '+new Date(r.updated_at).toLocaleString()+' · revision '+r.revision:'Upload from the device where you last played.';el('[data-picker]').hidden=rows.length<2;el('[data-action=load]').hidden=!r;}
    el('select').onchange=selected;
    const account=()=>{link=currentLink();const c=game.current(),linked=!!link&&link.owner===user?.id;el('[data-auth]').hidden=!!token;el('[data-slots]').hidden=!token;el('[data-cloud-tools]').hidden=!token;el('#cloudUser').textContent=user?.email||'';el('[data-device]').hidden=!c;el('[data-manager]').textContent=c?c.profile.name+' · Day '+c.day:'';el('[data-link-state]').textContent=linked?'Linked · last known revision '+link.revision:'Saved on this device. Upload before switching.';el('[data-action=upload]').textContent=linked?'Update cloud save ↑':'Upload this career ↑';el('[data-action=create]').disabled=!c;el('[data-action=export]').disabled=!c;selected();};
    try{const cached=JSON.parse(sessionStorage.getItem(sessionKey));if(cached?.until>Date.now()&&cached.user?.id){token=cached.token;user=cached.user;}}catch{}
    const capture=()=>({format:2,kind:'touchline-manager',engine:config.engine,career:game.current()});
    function check(snapshot){const c=snapshot?.career;if(snapshot?.format!==2||snapshot.kind!=='touchline-manager'||typeof c?.id!=='string'||!c.id||!c.profile?.name||!Array.isArray(c.profile.children)||!Number.isInteger(c.day)||!['roster','plans','mail','staff'].every(k=>Array.isArray(c[k]))||!Number.isFinite(c.fund)||!Number.isFinite(c.cash))throw Error('Not a compatible manager save. Local careers are unchanged.');if((c.practice||c.leagueSession)&&snapshot.engine!==config.engine)throw Error('This match checkpoint uses another engine version. Finish the match on its original device and upload again.');return c;}
    function restore(snapshot,next){const c=check(snapshot),old=game.find(c.id);if(!confirm(`Load ${c.profile.name}, game day ${c.day}? ${old?'The existing local copy of this career will be backed up.':'Other local careers will be kept.'}`))return;if(old)localStorage.setItem(backupKey,JSON.stringify({snapshot:{...snapshot,career:old,engine:config.engine},link:JSON.parse(localStorage.getItem(linkKey)||'{}')[c.id]||null}));game.import(c);bind(c.id,next);try{sessionStorage.setItem('touchline.cloud.resumeOnce',c.id);}catch{}location.reload();}
    el('[data-import]').onchange=async ev=>{try{const f=ev.target.files[0];if(f){if(f.size>12000000)throw Error('File is too large.');restore(JSON.parse(await f.text()),null);}}catch(err){status(err.message);}finally{ev.target.value='';}};
    async function api(path,body){
      const r=await fetch(config.url+path,{method:body?'POST':'GET',headers:{apikey:config.key,...(token?{Authorization:'Bearer '+token}:{}),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,cache:'no-store'});
      const text=await r.text(),data=text?JSON.parse(text):{};if(!r.ok){if(r.status===401){token=user=null;rows=[];try{sessionStorage.removeItem(sessionKey);}catch{}account();}throw Error(data.msg||data.message||data.error_description||'Request failed.');}return data;
    }
    async function list(){const previous=el('select').value;rows=await api('/rest/v1/touchline_careers?select=id,name,revision,updated_at&order=updated_at.desc');el('select').replaceChildren(...rows.map(r=>new Option(`${r.name} · rev ${r.revision} · ${new Date(r.updated_at).toLocaleString()}`,r.id)));const preferred=[previous,currentLink()?.id].find(id=>rows.some(r=>r.id===id));if(preferred)el('select').value=preferred;selected();}
    async function act(a){
      if(a==='close')return dialog.close();if(a==='authMode'){signup=!signup;el('[data-auth-title]').textContent=signup?'Create your locker':'Welcome back';el('[data-auth-submit]').textContent=signup?'Create account':'Sign in';el('[type=password]').autocomplete=signup?'new-password':'current-password';el('[data-action=authMode]').textContent=signup?'Already registered? Sign in':'New here? Create an account';status('');return;}if(a==='upload'){a=currentLink()?.owner===user?.id?'save':'create';el('[maxlength]').value=game.current()?.profile.name||'Manager career';}
      if(a==='export'){const snap=capture(),c=check(snap),u=URL.createObjectURL(new Blob([JSON.stringify(snap)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='Touchline-day-'+c.day+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);return status('Career file exported. Keep it private.');}
      if(a==='recover'){const b=JSON.parse(localStorage.getItem(backupKey));if(!b)throw Error('No previous local backup.');if(confirm('Swap this career with your previous local backup?'))restore(b.snapshot,b.link);return;}
      if(!config.url)throw Error('Cloud saves are not configured for this build. Local saves still work.');
      if(a==='login'||a==='signup'){
        const password=el('[type=password]'),body={email:el('[type=email]').value.trim(),password:password.value};password.value='';
        const data=await api(a==='login'?'/auth/v1/token?grant_type=password':'/auth/v1/signup',body);
        if(!data.access_token)return status('Check your email to confirm your account, then sign in.');
        token=data.access_token;user=data.user;try{sessionStorage.setItem(sessionKey,JSON.stringify({token,user:{id:user.id,email:user.email},until:Date.now()+(data.expires_in||3600)*1000-30000}));}catch{}account();await list();return status('Signed in. Nothing has been uploaded.');
      }
      if(a==='logout'){try{await api('/auth/v1/logout',{});}finally{token=user=null;rows=[];try{sessionStorage.removeItem(sessionKey);}catch{}account();}return status('Signed out.');}
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
    async function run(a){const lock=el('fieldset');if(lock.disabled)return;lock.disabled=true;try{await act(a);}catch(err){status(err.message);}finally{lock.disabled=false;}}
    document.addEventListener('click',async e=>{if(!e.target.closest('[data-cloud]'))return;account();el('[maxlength]').value=game.current()?.profile.name||'Manager career';status(config.url?'':'Cloud is unavailable. Local saves still work.');dialog.showModal();if(token)await run('list');});
    el('[data-credentials]').onsubmit=e=>{e.preventDefault();run(signup?'signup':'login');};
    dialog.addEventListener('keydown',e=>e.stopPropagation());
    dialog.addEventListener('cancel',e=>{if(el('fieldset').disabled)e.preventDefault();});
    dialog.addEventListener('click',e=>{const a=e.target.closest('[data-action]')?.dataset.action;if(a)return run(a);});
  }
  global.TLCloud={init};
})(window);
