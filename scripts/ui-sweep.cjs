/**
 * Touchline 26 — UI measurement sweep.
 *
 * Walks every clubhouse page and tab at several widths and records measurable
 * UI facts (overflow, tap targets, type sizes, contrast, fold depth, scroll
 * traps, tables). Read-only: it never advances the calendar or changes a save.
 *
 * Requirements (both come from the npm registry, no browser download needed):
 *   npm i -D playwright @sparticuz/chromium
 *   node -e "require('@sparticuz/chromium').default.executablePath()"   // extracts /tmp/chromium
 *   node -e "const z=require('zlib'),f=require('fs');f.writeFileSync('/tmp/al2023.tar',z.brotliDecompressSync(f.readFileSync('node_modules/@sparticuz/chromium/bin/al2023.tar.br')))"
 *   mkdir -p /tmp/al2023 && tar xf /tmp/al2023.tar -C /tmp/al2023
 *
 * Usage:
 *   node build.cjs && node preview.cjs &          // serve on :4173
 *   NODE_PATH=$PWD/node_modules node scripts/ui-sweep.cjs
 *
 * Output:
 *   .audit/sweep.json          raw measurements
 *   .audit/shots/*.png         screenshots for the flagship screens
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const chromium = require('@sparticuz/chromium').default;
const { chromium: pw } = require('playwright');

const BASE = process.env.SWEEP_URL || 'http://127.0.0.1:4173';
const OUT = path.join(__dirname, '..', '.audit');
const WIDTHS = [390, 768, 1440];
const SHOT_PAGES = new Set(['home', 'inbox', 'squad', 'tactics', 'schedule', 'leagues', 'finance', 'dynamics']);

/* Runs inside the page. Returns one flat object of measurements. */
function measure() {
  const rgb = s => {
    const m = String(s).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a = 1] = m[1].split(',').map(Number);
    return { r, g, b, a };
  };
  const lum = ({ r, g, b }) => {
    const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const bgOf = el => {
    let node = el;
    while (node && node !== document.documentElement) {
      const c = getComputedStyle(node).backgroundColor;
      const p = rgb(c);
      if (p && p.a > 0.55) return p;
      node = node.parentElement;
    }
    return { r: 13, g: 20, b: 30, a: 1 };
  };

  const vw = innerWidth, vh = innerHeight;
  const visible = el => {
    if (!el || el.offsetParent === null) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const all = [...document.querySelectorAll('body *')];

  /* page-level horizontal overflow */
  const docOverflow = Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth);

  /* the main content scroller */
  const scroller = ['#clubPage', '#homeMain', '#homeProcessing']
    .map(s => document.querySelector(s))
    .find(el => el && !el.hidden) || document.scrollingElement;

  const foldRatio = +(scroller.scrollHeight / Math.max(1, vh)).toFixed(2);

  /* interactives + tap targets */
  const controls = [...document.querySelectorAll('button,a[href],[role="button"],select,input,summary')]
    .filter(el => visible(el) && !el.disabled);
  let small = 0;
  const smallSamples = [];
  for (const el of controls) {
    const r = el.getBoundingClientRect();
    if (r.height < 44 || r.width < 24) {
      small++;
      if (smallSamples.length < 4) smallSamples.push(`${(el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 18)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
  }

  /* smallest rendered text */
  let minFont = 99;
  const smallText = new Set();
  let contrastFails = 0, contrastSamples = [];
  const textEls = all.filter(el => visible(el) && el.children.length === 0 && (el.textContent || '').trim().length > 1).slice(0, 600);
  for (const el of textEls) {
    const cs = getComputedStyle(el);
    const fs = parseFloat(cs.fontSize);
    if (fs < minFont) minFont = fs;
    if (fs < 11) smallText.add(Math.round(fs * 10) / 10);
    const fg = rgb(cs.color);
    if (fg) {
      const bg = bgOf(el);
      const r = ratio(fg, bg);
      const large = fs >= 18 || (fs >= 14 && +cs.fontWeight >= 700);
      if (r < (large ? 3 : 4.5)) {
        contrastFails++;
        if (contrastSamples.length < 3) contrastSamples.push(`${(el.textContent || '').trim().slice(0, 14)} ${r.toFixed(1)}:1 @${fs}px`);
      }
    }
  }

  /* nested scrollers (scroll traps) */
  let scrollers = 0;
  for (const el of all) {
    if (el === scroller || !visible(el)) continue;
    const cs = getComputedStyle(el);
    const scrollsY = /(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 2;
    const scrollsX = /(auto|scroll)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 2;
    if (scrollsY || scrollsX) scrollers++;
  }

  /* tables */
  const tables = [...document.querySelectorAll('table')].filter(visible);
  const wideTables = tables.filter(t => (t.parentElement?.scrollWidth || 0) > (t.parentElement?.clientWidth || 0) + 2).length;

  /* tab strip overflow */
  const strip = document.querySelector('#homeTabs');
  const stripOverflow = strip ? Math.max(0, strip.scrollWidth - strip.clientWidth) : 0;

  const h1 = [...document.querySelectorAll('h1')].filter(visible);

  return {
    viewport: `${vw}x${vh}`,
    title: (document.querySelector('#homeTitle') || document.querySelector('#careerEntry h1') || {}).textContent?.trim().slice(0, 40) || '',
    route: (document.getElementById('homeScreen')?.hidden ? 'entry' : 'game') + ':' + (document.getElementById('homeSection')?.textContent || ''),
    docOverflow,
    foldRatio,
    controls: controls.length,
    smallTargets: small,
    smallSamples,
    minFont: minFont === 99 ? null : minFont,
    subElevenSizes: [...smallText].sort((a, b) => a - b),
    contrastFails,
    contrastSamples,
    scrollers,
    tables: tables.length,
    wideTables,
    tabs: strip ? strip.querySelectorAll('button').length : 0,
    tabStripOverflow: stripOverflow,
    h1Count: h1.length
  };
}

(async () => {
  fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });
  const browser = await pw.launch({
    executablePath: '/tmp/chromium',
    args: [...chromium.args, '--no-sandbox', '--disable-gpu', '--font-render-hinting=none'],
    env: { ...process.env, LD_LIBRARY_PATH: '/tmp/al2023/lib' },
    headless: true
  });

  const rows = [];
  const errors = [];

  for (const width of WIDTHS) {
    const page = await browser.newPage({
      viewport: { width, height: width <= 480 ? 844 : width <= 1024 ? 1024 : 900 }
    });
    page.on('pageerror', e => errors.push(`${width}px pageerror: ${e.message.slice(0, 120)}`));
    page.on('console', m => { if (m.type() === 'error') errors.push(`${width}px console: ${m.text().slice(0, 120)}`); });

    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(400);
    await page.click('text=Enter Touchline');
    await page.waitForTimeout(300);
    await page.click('#careerEntry [data-entry="new"]');
    await page.waitForTimeout(300);
    await page.click('#careerEntry [data-entry="found"]');
    await page.waitForSelector('#careerEntry [data-entry="blank"]', { timeout: 45000 });
    await page.click('#careerEntry [data-entry="blank"]');
    await page.waitForSelector('#careerEntry input[name="name"]', { timeout: 20000 });
    await page.fill('#careerEntry input[name="name"]', 'Alex Mercer');
    /* The wizard advances with <button type="submit"> (Personal → Appearance → Review → Begin career). */
    for (let step = 0; step < 6; step++) {
      const inGame = await page.evaluate(() => !document.getElementById('homeScreen').hidden);
      if (inGame) break;
      const submit = page.locator('#careerEntry button[type="submit"]').first();
      if (!(await submit.count())) break;
      await submit.click();
      await page.waitForTimeout(800);
    }
    const inGame = await page.evaluate(() => !document.getElementById('homeScreen').hidden);
    if (!inGame) { errors.push(`${width}px: could not reach the clubhouse`); await page.close(); continue; }
    await page.waitForTimeout(600);

    const pages = await page.$$eval('#homeNav [data-hc-open]', els => [...new Set(els.map(e => e.dataset.hcOpen))]);
    for (const id of pages) {
      /* Navigate in-page: on phones the sidebar is a closed drawer, so a real
         click can't reach it. HTMLElement.click() still fires the delegated handler. */
      await page.evaluate(sel => document.querySelector(sel)?.click(), `#homeNav [data-hc-open="${id}"]`);
      await page.waitForTimeout(260);
      const push = async label => {
        const m = await page.evaluate(measure);
        rows.push({ width, page: id, tab: label, ...m });
      };
      await push('(default)');
      if (SHOT_PAGES.has(id) && (width === 390 || width === 1440)) {
        await page.screenshot({ path: path.join(OUT, 'shots', `${width}-${id}.png`) });
      }
      const tabs = await page.$$eval('#homeTabs button', els => els.map(e => (e.textContent || '').trim()).filter(Boolean));
      for (const tabLabel of tabs) {
        const clicked = await page.evaluate(l => {
          const b = [...document.querySelectorAll('#homeTabs button')].find(x => (x.textContent || '').trim() === l);
          if (!b || b.getAttribute('aria-current') === 'page') return false;
          b.click(); return true;
        }, tabLabel);
        if (!clicked) continue;
        await page.waitForTimeout(260);
        await push(tabLabel);
      }
    }
    await page.close();
    console.log(`done ${width}px — ${rows.filter(r => r.width === width).length} screens`);
  }

  await browser.close();
  fs.writeFileSync(path.join(OUT, 'sweep.json'), JSON.stringify({ rows, errors }, null, 1));

  /* console summary */
  for (const width of WIDTHS) {
    const rs = rows.filter(r => r.width === width);
    if (!rs.length) continue;
    const overflow = rs.filter(r => r.docOverflow > 0);
    const traps = rs.filter(r => r.scrollers > 1);
    const worst = rs.slice().sort((a, b) => b.smallTargets - a.smallTargets).slice(0, 3);
    console.log(`\n== ${width}px: ${rs.length} screens`);
    console.log(`   pages with horizontal overflow: ${overflow.length}${overflow.length ? ' → ' + overflow.slice(0, 5).map(r => r.page).join(', ') : ''}`);
    console.log(`   pages with nested scroll traps: ${traps.length}`);
    console.log(`   widest fold: ${Math.max(...rs.map(r => r.foldRatio))} viewports`);
    console.log(`   smallest text seen: ${Math.min(...rs.map(r => r.minFont ?? 99))}px`);
    console.log(`   most sub-44px targets: ${worst.map(w => `${w.page}/${w.tab}:${w.smallTargets}`).join(', ')}`);
  }
  if (errors.length) console.log(`\n${errors.length} runtime errors (first 5):\n  ` + [...new Set(errors)].slice(0, 5).join('\n  '));
})().catch(e => { console.error('SWEEP FAILED', e.message); process.exit(1); });
