// Only cache the self-contained public game. Never intercept cloud APIs or store career data.
const prefix = 'touchline-shell-', cacheName = prefix + '1fa7c8450eecf96bef18';
const shell = new URL('./index.html', self.registration.scope).href;
self.addEventListener('install', event => event.waitUntil((async () => {
  const page = await fetch(shell, {cache:'reload'});
  if (!page.ok || !page.headers.get('content-type')?.includes('text/html') || !(await page.clone().text()).includes('id="matchScreen"')) throw Error('Game download incomplete');
  await (await caches.open(cacheName)).put(shell,page);
  await self.skipWaiting();
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  await Promise.all((await caches.keys()).filter(k=>k.startsWith(prefix)&&k!==cacheName).map(k=>caches.delete(k)));
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  const u=new URL(event.request.url);
  if(event.request.mode!=='navigate'||event.request.method!=='GET'||u.origin!==self.location.origin||![new URL('./',shell).pathname,new URL(shell).pathname].includes(u.pathname))return;
  event.respondWith((async()=>{
    // Use the installed build immediately, including on a weak mobile signal.
    // A changed worker installs its matching shell atomically for the next visit.
    const page=await (await caches.open(cacheName)).match(shell);
    return page || fetch(event.request);
  })());
});
