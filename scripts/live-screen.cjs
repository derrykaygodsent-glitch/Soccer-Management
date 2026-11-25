'use strict';
/**
 * Live screen — a real-time window into the browser this workspace drives.
 *
 * Opens Touchline 26 in a headless Chromium, streams the page over MJPEG, and reports
 * the pointer position so the viewer can draw a cursor where the automation is clicking.
 * Nothing is faked: the frames are CDP screencast frames, the cursor is the last real
 * mousemove/mousedown the page received.
 *
 * Usage:
 *   node preview.cjs &                        // game on :4173
 *   node scripts/live-screen.cjs              // control room on :4180
 *
 * Ports:
 *   4180  control room (this script)          -> open this one to watch
 *   9222  CDP endpoint                        -> scripts/live-browser.cjs attaches here
 *
 * Requires the local Chromium recipe (see docs/workspace-setup.md). If the sandbox is
 * new, run that recipe first; the script exits with a plain message if Chromium is gone.
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.LIVE_PORT || 4180);
const GAME = process.env.GAME_URL || 'http://127.0.0.1:4173';
const VIEW_W = Number(process.env.LIVE_W || 1200);
const VIEW_H = Number(process.env.LIVE_H || 760);
const QUALITY = Number(process.env.LIVE_Q || 58);
const CDP_PORT = Number(process.env.CDP_PORT || 9222);

let chromium;
try {
  chromium = require('@sparticuz/chromium').default;
} catch {
  console.error('Missing @sparticuz/chromium. Run the setup recipe in docs/workspace-setup.md.');
  process.exit(1);
}
const { chromium: pw } = require('playwright');

const state = {
  frame: null,
  frameAt: 0,
  seq: 0,
  fps: 0,
  cursor: null,
  click: null,
  url: '',
  title: '',
  viewport: { w: VIEW_W, h: VIEW_H },
  log: []
};
const clients = new Set();
let framesThisSecond = 0;
let lastPush = 0;
let activeCdp = null;

function pushFrame(buf) {
  state.frame = buf;
  state.frameAt = Date.now();
  state.seq++;
  framesThisSecond++;
  /* Chrome paints up to 60 fps; the wire gets ~12 fps so a proxy can keep up. */
  const now = Date.now();
  if (!clients.size || now - lastPush < 80) return;
  lastPush = now;
  const head = Buffer.from(`--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${buf.length}\r\n\r\n`);
  for (const res of clients) {
    try { res.write(head); res.write(buf); res.write('\r\n'); } catch { clients.delete(res); }
  }
}

const note = (text) => {
  const line = { at: new Date().toISOString().slice(11, 19), text: String(text).slice(0, 240) };
  state.log.push(line);
  if (state.log.length > 40) state.log.shift();
  console.log(`[${line.at}] ${line.text}`);
};

/* Runs in the page: remembers where the pointer really is, and reports the page identity. */
const trackPointer = () => {
  window.__tlCursor = { x: -1, y: -1, at: 0 };
  window.__tlClick = null;
  addEventListener('mousemove', (e) => { window.__tlCursor = { x: e.clientX, y: e.clientY, at: Date.now() }; }, true);
  addEventListener('mousedown', (e) => { window.__tlClick = { x: e.clientX, y: e.clientY, at: Date.now() }; }, true);
};

function pageHtml() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Live screen — agent workspace</title>
<style>
  :root{--bg:#0a111b;--panel:#121d2a;--edge:#26374a;--ink:#e8f1fb;--dim:#93a7bd;--lime:#d7f889;--cyan:#7fd7ff}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
  .wrap{display:grid;grid-template-columns:minmax(0,1fr) 310px;gap:14px;padding:14px;min-height:100dvh}
  @media(max-width:900px){.wrap{grid-template-columns:minmax(0,1fr)}}
  h1{margin:0 0 2px;font-size:15px;letter-spacing:.04em;text-transform:uppercase;color:var(--lime)}
  .sub{color:var(--dim);font-size:12px;margin:0 0 10px}
  .stage{position:relative;border:1px solid var(--edge);border-radius:12px;overflow:hidden;background:#05090f;align-self:start}
  .stage img{display:block;width:100%;height:auto}
  .cursor{position:absolute;width:0;height:0;pointer-events:none;transition:transform .05s linear;z-index:3}
  .cursor:before{content:"";position:absolute;left:-6px;top:-6px;width:12px;height:12px;border-radius:50%;background:#fff;box-shadow:0 0 0 2px #0a111b,0 0 14px 4px #7fd7ffcc}
  .ring{position:absolute;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:2px solid var(--lime);opacity:0;pointer-events:none;z-index:2}
  .ring.go{animation:pulse .5s ease-out}
  @keyframes pulse{0%{opacity:.95;transform:scale(.4)}100%{opacity:0;transform:scale(1.35)}}
  .badge{position:absolute;right:10px;top:10px;z-index:4;display:flex;gap:6px;align-items:center;padding:4px 8px;border-radius:999px;background:#05090fcc;border:1px solid var(--edge);font-size:11px;color:var(--dim)}
  .dot{width:7px;height:7px;border-radius:50%;background:var(--lime)}
  .dot.off{background:#ef7184}
  aside{display:grid;align-content:start;gap:10px;min-width:0}
  .card{background:var(--panel);border:1px solid var(--edge);border-radius:10px;padding:10px 12px;min-width:0}
  .card h2{margin:0 0 6px;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--dim)}
  .kv{display:grid;grid-template-columns:64px minmax(0,1fr);gap:2px 8px;font-size:12px}
  .kv b{color:var(--dim);font-weight:600}
  .kv span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-variant-numeric:tabular-nums}
  ol{margin:0;padding:0;list-style:none;display:grid;gap:5px;font-size:12px;max-height:250px;overflow:auto}
  li{display:grid;grid-template-columns:52px minmax(0,1fr);gap:7px;color:var(--ink)}
  li time{color:var(--dim);font-variant-numeric:tabular-nums}
  .hint{color:var(--dim);font-size:11.5px;margin:0}
  .fallback{display:none;padding:16px;color:var(--dim);font-size:12.5px}
</style></head><body>
<div class="wrap">
  <main>
    <h1>Live screen</h1>
    <p class="sub">This is the actual headless browser this workspace drives — frames straight from Chrome, cursor from the last real mouse event.</p>
    <div class="stage" id="stage">
      <div class="badge"><span class="dot off" id="dot"></span><span id="live">connecting…</span></div>
      <img id="view" alt="Live view of the agent's browser" src="/stream">
      <div class="ring" id="ring"></div>
      <div class="cursor" id="cursor"></div>
      <div class="fallback" id="fallback">Waiting for the first frame. Keep this tab open; the browser is starting.</div>
    </div>
  </main>
  <aside>
    <div class="card">
      <h2>Now showing</h2>
      <div class="kv">
        <b>Page</b><span id="title">—</span>
        <b>URL</b><span id="url">—</span>
        <b>Frame</b><span id="seq">0</span>
        <b>Rate</b><span id="fps">0 fps</span>
        <b>Size</b><span id="size">—</span>
      </div>
    </div>
    <div class="card">
      <h2>Work log</h2>
      <ol id="log"><li><time>—</time><span>waiting for the first action…</span></li></ol>
    </div>
    <div class="card">
      <h2>How to read this</h2>
      <p class="hint">White dot = pointer position. Lime ring = click. Page changes appear as they happen because the frames are the browser's own output.</p>
    </div>
  </aside>
</div>
<script>
(() => {
  const img = document.getElementById('view');
  const cursor = document.getElementById('cursor');
  const ring = document.getElementById('ring');
  const dot = document.getElementById('dot');
  const liveEl = document.getElementById('live');
  const fallback = document.getElementById('fallback');
  let lastSeq = -1, useStream = true, lastClick = 0;
  const $ = id => document.getElementById(id);

  const streamBroken = () => {
    if (!useStream) return;
    useStream = false;
    img.removeAttribute('src');
    fallback.style.display = 'block';
    poll();
  };
  setTimeout(() => { if (lastSeq < 0) streamBroken(); }, 4000);
  img.addEventListener('error', streamBroken);

  let polling = null;
  function poll() {
    if (polling) return;
    const tick = () => {
      img.src = '/frame.jpg?t=' + Date.now();
      polling = setTimeout(tick, 130);
    };
    tick();
  }
  img.addEventListener('load', () => {
    fallback.style.display = 'none';
    lastSeq = Math.max(lastSeq, 0);
  });

  async function state() {
    try {
      const r = await fetch('/state', { cache: 'no-store' });
      const s = await r.json();
      $('title').textContent = s.title || '—';
      $('url').textContent = (s.url || '').replace(/^https?:\\/\\/[^/]+/, '') || '/';
      $('seq').textContent = s.seq;
      $('fps').textContent = s.fps + ' fps';
      $('size').textContent = s.viewport.w + '×' + s.viewport.h;
      const fresh = s.frameAgeMs < 4000;
      dot.className = 'dot' + (fresh ? '' : ' off');
      liveEl.textContent = fresh ? 'live' : 'waiting';
      const log = $('log');
      log.innerHTML = s.log.slice().reverse().map(l => '<li><time>' + l.at + '</time><span>' + l.text.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c])) + '</span></li>').join('') || '<li><time>—</time><span>idle</span></li>';

      const stage = document.getElementById('stage').getBoundingClientRect();
      const box = img.getBoundingClientRect();
      if (s.cursor && s.cursor.x >= 0 && box.width) {
        const sx = box.width / s.viewport.w, sy = box.height / s.viewport.h;
        cursor.style.transform = 'translate(' + (box.left - stage.left + s.cursor.x * sx) + 'px,' + (box.top - stage.top + s.cursor.y * sy) + 'px)';
      }
      if (s.click && s.click.at > lastClick) {
        lastClick = s.click.at;
        const sx = box.width / s.viewport.w, sy = box.height / s.viewport.h;
        ring.style.transform = 'translate(' + (box.left - stage.left + s.click.x * sx) + 'px,' + (box.top - stage.top + s.click.y * sy) + 'px)';
        ring.classList.remove('go');
        void ring.offsetWidth;
        ring.classList.add('go');
      }
    } catch { /* keep the last known state */ }
    setTimeout(state, 220);
  }
  state();
})();
</script></body></html>`;
}

async function main() {
  const executablePath = await chromium.executablePath().catch(() => '/tmp/chromium');
  if (!fs.existsSync(executablePath)) {
    console.error(`Chromium not found at ${executablePath}. Run the setup recipe in docs/workspace-setup.md.`);
    process.exit(1);
  }

  const browser = await pw.launch({
    executablePath,
    args: [
      ...chromium.args,
      '--no-sandbox',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--remote-debugging-port=${CDP_PORT}`,
      `--window-size=${VIEW_W},${VIEW_H}`
    ],
    env: { ...process.env, LD_LIBRARY_PATH: process.env.LD_LIBRARY_PATH || '/tmp/al2023/lib' },
    headless: true
  });

  const context = await browser.newContext({ viewport: { width: VIEW_W, height: VIEW_H }, deviceScaleFactor: 1 });
  await context.addInitScript(trackPointer);

  const savePath = path.join(ROOT, '.audit', 'career.json');
  if (fs.existsSync(savePath)) {
    try {
      const save = JSON.parse(fs.readFileSync(savePath, 'utf8')).career;
      await context.addInitScript((career) => {
        try {
          localStorage.setItem('touchline.careers.v2', JSON.stringify([career]));
          localStorage.setItem('touchline.recent.v2', career.id);
        } catch { /* ignore quota problems in the stream browser */ }
      }, save);
      note('Career loaded from .audit/career.json');
    } catch {
      note('Save file present but unreadable; starting without it');
    }
  }

  const streaming = new WeakSet();
  async function attach(page) {
    if (streaming.has(page)) return;
    streaming.add(page);
    const cdp = await context.newCDPSession(page).catch(() => null);
    if (!cdp) return;
    cdp.on('Page.screencastFrame', async ({ data, sessionId }) => {
      pushFrame(Buffer.from(data, 'base64'));
      try { await cdp.send('Page.screencastFrameAck', { sessionId }); } catch { /* page closed */ }
    });
    activeCdp = cdp;
    /* Page.enable must come first: starting the screencast before the Page domain is up
       yields zero frames on this Chromium build. */
    await cdp.send('Page.enable').catch(() => {});
    const start = () => cdp.send('Page.startScreencast', {
      format: 'jpeg',
      quality: QUALITY,
      maxWidth: VIEW_W,
      maxHeight: VIEW_H,
      everyNthFrame: 1
    }).catch(() => {});
    await start();
    note(`Streaming ${page.url()}`);
    /* Watchdog: a navigation or a stalled compositor can silently end the screencast. */
    const guard = setInterval(() => {
      if (Date.now() - state.frameAt > 5000) start();
    }, 4000);
    page.once('close', () => clearInterval(guard));
  }

  context.on('page', (page) => { attach(page).catch(() => {}); });

  const page = await context.newPage();
  await attach(page);
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) note(`Navigated to ${new URL(frame.url()).pathname}`);
  });

  await page.goto(GAME, { waitUntil: 'domcontentloaded' }).catch(() => note('Game not reachable yet; will show whatever loads'));
  note('Live screen ready');

  const readState = async () => {
    try {
      const info = await page.evaluate(() => ({
        x: window.__tlCursor?.x ?? -1,
        y: window.__tlCursor?.y ?? -1,
        at: window.__tlCursor?.at ?? 0,
        click: window.__tlClick && Date.now() - window.__tlClick.at < 2500 ? window.__tlClick : null,
        title: document.title || '',
        url: location.href,
        w: innerWidth,
        h: innerHeight
      }));
      state.cursor = { x: info.x, y: info.y, at: info.at };
      state.click = info.click;
      state.url = info.url;
      state.title = info.title;
      if (info.w > 0 && info.h > 0) state.viewport = { w: info.w, h: info.h };
    } catch { /* navigating */ }
  };
  setInterval(readState, 160);

  setInterval(() => {
    state.fps = framesThisSecond;
    framesThisSecond = 0;
  }, 1000);

  /* A page that is not painting emits no screencast frames. When someone is watching and the
     picture goes quiet, capture a real screenshot instead of leaving the viewer on a stale
     frame — still the browser's own output, just asked for. */
  setInterval(async () => {
    if (!activeCdp || !clients.size) return;
    if (Date.now() - state.frameAt < 1500) return;
    try {
      const shot = await activeCdp.send('Page.captureScreenshot', { format: 'jpeg', quality: QUALITY });
      if (shot?.data) pushFrame(Buffer.from(shot.data, 'base64'));
    } catch { /* page busy or closing */ }
  }, 1000);

  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (url.pathname === '/') {
      const body = pageHtml();
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
      res.end(req.method === 'HEAD' ? undefined : body);
      return;
    }
    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, frames: state.seq, fps: state.fps, attached: clients.size }));
      return;
    }
    if (url.pathname === '/state') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        seq: state.seq,
        fps: state.fps,
        frameAgeMs: state.frame ? Date.now() - state.frameAt : -1,
        cursor: state.cursor,
        click: state.click,
        url: state.url,
        title: state.title,
        viewport: state.viewport,
        log: state.log.slice(-14)
      }));
      return;
    }
    if (url.pathname === '/frame.jpg') {
      if (!state.frame) { res.writeHead(204).end(); return; }
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Content-Length': state.frame.length });
      res.end(state.frame);
      return;
    }
    if (url.pathname === '/stream') {
      res.writeHead(200, {
        'Content-Type': 'multipart/x-mixed-replace; boundary=frame',
        'Cache-Control': 'no-store, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no'
      });
      clients.add(res);
      if (state.frame) {
        res.write(Buffer.from(`--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${state.frame.length}\r\n\r\n`));
        res.write(state.frame);
        res.write('\r\n');
      }
      req.on('close', () => clients.delete(res));
      return;
    }
    if (url.pathname === '/log') {
      const text = url.searchParams.get('text');
      if (text) note(text);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, log: state.log.slice(-6) }));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Live screen on port ${PORT} (CDP ${CDP_PORT})`);
    console.log(`Watch: http://localhost:${PORT}/`);
  });

  const shutdown = async () => {
    try { await browser.close(); } catch { /* already gone */ }
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((error) => {
  console.error('Live screen failed:', error.message);
  process.exit(1);
});
