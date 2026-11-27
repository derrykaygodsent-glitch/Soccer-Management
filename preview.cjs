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
const LIVE_PORT = Number(process.env.LIVE_PORT || 4180);

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

const LIVE_VIEWER = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Live screen — the agent's browser</title>
<style>
  :root{--bg:#0a111b;--panel:#121d2a;--edge:#26374a;--ink:#e8f1fb;--dim:#93a7bd;--lime:#d7f889}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:16px}
  h1{margin:0 0 4px;font-size:15px;letter-spacing:.05em;text-transform:uppercase;color:var(--lime)}
  p{margin:0 0 12px;color:var(--dim);font-size:12px}
  .bar{display:flex;gap:12px;align-items:center;margin:0 0 10px;color:var(--dim);font-size:12px;flex-wrap:wrap}
  .dot{width:9px;height:9px;border-radius:50%;background:#c05a5a;display:inline-block}
  .dot.on{background:var(--lime)}
  .stage{border:1px solid var(--edge);border-radius:12px;overflow:hidden;background:#05090f;max-width:100%}
  .stage img{display:block;width:100%;height:auto}
  .stage .wait{padding:28px;text-align:center;color:var(--dim)}
  ol.log{list-style:none;margin:8px 0 0;padding:0;font-size:12px;color:var(--dim);display:grid;gap:3px}
  ol.log b{color:var(--ink);font-weight:600;font-variant-numeric:tabular-nums}
</style></head><body>
<h1>Live screen</h1>
<p>The browser this workspace drives, mirrored from port 4180 onto this one.</p>
<div class="bar"><span class="dot" id="dot"></span><b id="live">connecting…</b><span id="tick">frame 0</span></div>
<div class="stage"><img id="view" alt="Live view of the agent's browser"><div class="wait" id="wait">Waiting for the first frame…</div></div>
<h1 style="margin-top:16px">Work log</h1>
<ol class="log" id="log"><li>no entries yet</li></ol>
<script>
  var img = document.getElementById('view'), dot = document.getElementById('dot'),
      live = document.getElementById('live'), tick = document.getElementById('tick'), wait = document.getElementById('wait');
  img.hidden = true;
  function pull() {
    img.src = '/live/frame.jpg?t=' + Date.now();
  }
  img.addEventListener('load', function () {
    img.hidden = false; wait.hidden = true; dot.className = 'dot on'; live.textContent = 'live';
    tick.textContent = 'frame ' + (Number(img.dataset.n || 0) + 1);
    img.dataset.n = String((Number(img.dataset.n) || 0) + 1);
  });
  img.addEventListener('error', function () { dot.className = 'dot'; live.textContent = 'reconnecting…'; });
  pull();
  setInterval(pull, 1000);
  var log = document.getElementById('log');
  function pullState() {
    fetch('/live/state').then(function (r) { return r.json(); }).then(function (s) {
      tick.textContent = 'frame ' + s.seq + ' · picture ' + Math.round(s.frameAgeMs / 1000) + 's old';
      if (s.log && s.log.length) {
        log.innerHTML = s.log.slice(-8).reverse().map(function (row) {
          return '<li><b>' + row.at + '</b> ' + String(row.text).replace(/[<>&]/g, '') + '</li>';
        }).join('');
      }
      if (s.url) live.textContent = s.frameAgeMs < 4000 ? 'live' : 'stalled';
    }).catch(function () { live.textContent = 'screen offline'; });
  }
  pullState();
  setInterval(pullState, 2500);
</script></body></html>`;

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
  /* The live screen sits on its own port (4180). Some workspace proxies only expose the port a
     process announces at startup, so the same picture is mirrored here, on the port that is
     already open: /live is a viewer, /live/frame.jpg and /live/state pass straight through. */
  if (path === '/live' || path === '/live/') {
    const body = Buffer.from(LIVE_VIEWER);
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': body.length });
    response.end(request.method === 'HEAD' ? undefined : body);
    return;
  }
  if (path === '/live/frame.jpg' || path === '/live/state') {
    const upstream = require('node:http').get({ host: '127.0.0.1', port: LIVE_PORT, path: path.slice(5) }, up => {
      response.writeHead(up.statusCode || 502, {
        'Content-Type': up.headers['content-type'] || 'application/octet-stream',
        'Cache-Control': 'no-store'
      });
      up.pipe(response);
    });
    upstream.on('error', () => {
      response.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('The live screen is not running. Start scripts/live-screen.cjs.');
    });
    upstream.setTimeout(10000, () => upstream.destroy());
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
