(function(){
  if(!window.location)return;
  let status='Preparing offline copy…';
  const show=text=>{status=text;document.querySelectorAll('[data-offline-status]').forEach(el=>el.textContent=text);};
  window.TLOffline={status:()=>status};
  if(location.protocol==='file:'){show('Local offline copy');return;}
  if(!('serviceWorker' in navigator)||!window.isSecureContext){show('Offline reopening unavailable in this browser');return;}
  async function register(){try{
    const r=await navigator.serviceWorker.register('./offline-worker.js',{updateViaCache:'none'});
    const check=()=>{if(r.active?.state==='activated')show('Ready to reopen offline');else if(r.installing?.state==='redundant'||!(r.installing||r.active||r.waiting))show('Offline copy unavailable · reopen online to retry');};
    r.installing?.addEventListener('statechange',check);check();
    await navigator.serviceWorker.ready;show('Ready to reopen offline');
  }catch{show('Offline copy unavailable · reopen online to retry');}}
  register();
})();
