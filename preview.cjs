'use strict';

const { createServer } = require('node:http');
const { readFile, stat } = require('node:fs');
const { join } = require('node:path');
const { createHash } = require('node:crypto');

const port = Number(process.env.PORT || 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}
const index = join(__dirname, 'index.html');

/* The build stamp: the page watches it and reloads itself when it changes, so a rebuild shows up
   without anyone pressing refresh. The service worker is dropped on reload so it cannot serve the
   previous build from cache. */
let stamp = '';
function refreshStamp() {
  stat(index, (error, info) => {
    if (error) return;
    const next = createHash('sha1').update(`${info.mtimeMs}:${info.size}`).digest('hex').slice(0, 12);
    if (next !== stamp) stamp = next;
  });
}
refreshStamp();
setInterval(refreshStamp, 700).unref();

const LIVE_RELOAD = `<script>(function(){
  var seen = null;
  function check() {
    fetch('/__build', { cache: 'no-store' }).then(function (r) { return r.text(); }).then(function (id) {
      if (!seen) { seen = id; return; }
      if (id && id !== seen) {
        var done = function () { location.reload(); };
        if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
          navigator.serviceWorker.getRegistrations().then(function (list) {
            Promise.all(list.map(function (r) { return r.unregister(); })).then(done, done);
          }, done);
        } else { done(); }
      }
    }).catch(function () {});
  }
  setInterval(check, 1200);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); });
})();</script>`;

const server = createServer((request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }

  const path = (request.url || '/').split('?', 1)[0];
  if (path === '/favicon.ico') {
    response.writeHead(204).end();
    return;
  }
  if (path === '/__build') {
    response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(stamp || 'none');
    return;
  }
  if (path !== '/' && path !== '/index.html' && path !== '/offline-worker.js') {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  const worker = path === '/offline-worker.js';
  readFile(worker ? join(__dirname,'offline-worker.js') : index, (error, page) => {
    if (error) {
      console.error(error.message);
      response.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Build index.html with npm run build, then reload.');
      return;
    }
    /* the reload hook is injected here, not in the build, so the built file stays plain */
    const body = worker ? page : Buffer.from(page.toString('utf8').replace('</body>', `${LIVE_RELOAD}</body>`));
    response.writeHead(200, {
      'Content-Type': worker ? 'application/javascript' : 'text/html; charset=utf-8',
      'Content-Length': body.length,
      'Cache-Control': 'no-store, must-revalidate',
      'X-Content-Type-Options': 'nosniff'
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  });
});

server.on('error', error => {
  console.error(`Unable to start the Touchline 26 preview: ${error.message}`);
  process.exitCode = 1;
});
server.listen(port, '0.0.0.0', () => console.log(`Touchline 26 ready on port ${port}`));
