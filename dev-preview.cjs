'use strict';

// Build and serve the single-file game locally, rebuilding and refreshing open
// preview tabs whenever a source file changes. This is a sandbox-only server.
const { createServer } = require('node:http');
const { execFileSync } = require('node:child_process');
const { existsSync, readFileSync, readdirSync, statSync } = require('node:fs');
const { join, relative } = require('node:path');

const root = __dirname;
const port = Number(process.env.PORT || 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('PORT must be an integer between 1 and 65535.');
const clients = new Set();
const sourceFiles = () => {
  const all = [];
  const visit = dir => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile()) all.push(path);
    }
  };
  visit(join(root, 'src'));
  for (const name of ['build.cjs', 'package.json']) if (existsSync(join(root, name))) all.push(join(root, name));
  return all.sort();
};
const fingerprint = () => sourceFiles().map(path => {
  const stat = statSync(path);
  return `${relative(root, path)}:${stat.size}:${stat.mtimeMs}`;
}).join('\n');
const build = () => execFileSync(process.execPath, [join(root, 'build.cjs')], { cwd: root, stdio: 'inherit' });
const sendReload = () => {
  for (const response of clients) {
    try { response.write('event: reload\ndata: updated\n\n'); }
    catch { clients.delete(response); }
  }
};
setInterval(() => {
  for (const response of clients) {
    try { response.write(': keep-alive\n\n'); }
    catch { clients.delete(response); }
  }
}, 15000).unref();

build();
let observed = fingerprint(), candidate = null, candidateSince = 0, building = false;
setInterval(() => {
  const current = fingerprint();
  if (current === observed || building) { candidate = null; return; }
  if (candidate !== current) { candidate = current; candidateSince = Date.now(); return; }
  if (Date.now() - candidateSince < 650) return;
  building = true;
  try {
    build();
    observed = fingerprint();
    candidate = null;
    console.log('Source updated · refreshing connected preview tabs');
    sendReload();
  } catch (error) {
    console.error('Live preview build failed:', error.message);
    candidateSince = Date.now() + 3000;
  } finally { building = false; }
}, 350).unref();

const server = createServer((request, response) => {
  response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  const path = (request.url || '/').split('?', 1)[0];
  if (path === '/favicon.ico') { response.writeHead(204).end(); return; }
  if (path === '/__version') {
    const version = Buffer.from(observed);
    response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': version.length, 'Cache-Control': 'no-store, no-cache, must-revalidate' });
    response.end(request.method === 'HEAD' ? undefined : version);
    return;
  }
  if (path === '/__live') {
    response.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    response.write('retry: 1000\n\n');
    clients.add(response);
    response.on('close', () => clients.delete(response));
    return;
  }
  if (!['/', '/index.html', '/offline-worker.js'].includes(path)) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
    return;
  }
  try {
    if (path === '/offline-worker.js') {
      const worker = readFileSync(join(root, 'offline-worker.js'));
      response.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Content-Length': worker.length, 'Service-Worker-Allowed': '/' });
      response.end(request.method === 'HEAD' ? undefined : worker);
      return;
    }
    let page = readFileSync(join(root, 'index.html'), 'utf8');
    // The live preview uses EventSource instead of the app shell's offline cache,
    // so an old service-worker response cannot hide freshly built UI changes.
    page = page.replace("if(!('serviceWorker' in navigator)||!window.isSecureContext)", 'if(true)');
    const liveReload = `<script>(()=>{navigator.serviceWorker?.getRegistrations?.().then(rs=>rs.forEach(r=>r.unregister())).catch(()=>{});let version=null,reloading=false;const check=()=>fetch('/__version',{cache:'no-store'}).then(r=>r.ok?r.text():null).then(next=>{if(!next)return;if(version!==null&&next!==version&&!reloading){reloading=true;location.reload()}version=next}).catch(()=>{});check();setInterval(check,1800);const events=new EventSource('/__live');events.addEventListener('reload',()=>location.reload())})()</script>`;
    page = page.replace('</head>', `${liveReload}</head>`);
    const body = Buffer.from(page);
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': body.length, 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch (error) {
    console.error('Live preview request failed:', error.message);
    response.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Build the preview again with npm run preview:live.');
  }
});
server.on('error', error => { console.error(`Unable to start the live preview: ${error.message}`); process.exitCode = 1; });
server.listen(port, '0.0.0.0', () => console.log(`Touchline 26 live preview on port ${port} · watching src/`));
