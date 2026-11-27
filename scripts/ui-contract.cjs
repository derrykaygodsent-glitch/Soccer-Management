'use strict';
/**
 * UI contract checker — the rebuild's proof engine.
 *
 * Walks every destination at 1440 and 390 and reports how far the markup is from the six
 * contracts in docs/ui-rebuild-plan.md §2. In Phase 0 almost everything is a baseline:
 * the number is supposed to be large now and fall phase by phase.
 *
 *   node scripts/ui-contract.cjs              // baseline report, always exits 0
 *   node scripts/ui-contract.cjs --strict     // exit 1 if any contract is violated
 *   node scripts/ui-contract.cjs --career=.audit/career.json
 *
 * Output: .audit/contract.json + a printed table.
 */

const fs = require('node:fs');
const path = require('node:path');
const chromium = require('@sparticuz/chromium').default;
const { chromium: pw } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const STRICT = process.argv.includes('--strict');
const LIVE = process.argv.includes('--live');
const say = (text) => {
  if (!LIVE) return;
  const req = require('node:http').get({ host: '127.0.0.1', port: 4180, path: '/log?text=' + encodeURIComponent(text) }, res => res.resume());
  req.on('error', () => {});
};
const careerArg = process.argv.find(a => a.startsWith('--career='));
const careerFile = careerArg ? path.resolve(ROOT, careerArg.slice(9)) : path.join(ROOT, '.audit', 'career.json');
const GAME = process.env.GAME_URL || 'http://127.0.0.1:4173';
const WIDTHS = [1440, 390];

/** Runs in the page. Returns raw contract observations for one screen. */
const PROBE = () => {
  const visible = el => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  const textOf = el => (el.textContent || '').replace(/\s+/g, ' ').trim();
  const RANGE = /\b\d+\s*[–-]\s*\d+\s*(of|\/)\s*\d+\b|\bshowing\s+\d+|\bof\s+\d+\b/i;
  const isMeta = el => !!el.closest('[data-tl-meta], .tl-meta, .tl-status, time, small');

  const scope = document.querySelector('#clubPage') || document.body;

  /* 1. page — the title lives in the shell header, so h1 is counted document-wide */
  const h1s = [...document.querySelectorAll('h1')].filter(visible);
  const pageAnchors = scope.querySelectorAll('[data-tl-page]').length;
  const primaryActions = [...scope.querySelectorAll('[data-tl-action="primary"]')].filter(visible).length;

  /* 2. status */
  const chips = [...scope.querySelectorAll('[data-tl-status]')].filter(visible);
  const chipsWithoutWords = chips.filter(c => !textOf(c)).length;
  const chipsNotStyled = chips.filter(c => !c.classList.contains('tl-status')).length;

  /* 3. lists with more than 25 rows need a visible range */
  const longLists = [];
  for (const el of scope.querySelectorAll('ul, ol, tbody, [data-tl-list], main, section, div')) {
    if (!visible(el)) continue;
    /* a month grid is a layout, not a list of records: nothing is hidden in it */
    if (el.hasAttribute('data-tl-grid') || el.closest('[data-tl-grid]')) continue;
    const kids = [...el.children];
    const rows = kids.length;
    if (rows <= 25) continue;
    /* list-like: most children share a tag (rows, cards, articles) */
    const counts = new Map();
    for (const k of kids) counts.set(k.tagName, (counts.get(k.tagName) || 0) + 1);
    if (Math.max(...counts.values()) < rows * 0.8) continue;
    const box = el.closest('[data-tl-list]') || el.parentElement;
    const hasRange = !!box && (RANGE.test(textOf(box)) || box.querySelector('[data-tl-pager]'));
    if (!hasRange) longLists.push({ tag: el.tagName.toLowerCase(), rows, cls: String(el.className).slice(0, 40) });
  }

  /* 4. tables must declare a phone mode */
  const tables = [...scope.querySelectorAll('table')].filter(visible);
  const undeclaredTables = tables.filter(t => !t.hasAttribute('data-tl-table') && !t.closest('[data-tl-table-wrap]')).length;

  /* 5. danger needs preflight */
  const danger = [...document.querySelectorAll('[data-tl-action="danger"]')].filter(visible);
  const dangerNoPreflight = danger.filter(el => !el.hasAttribute('data-tl-preflight')).length;

  /* 6. navigation */
  const backControls = [...document.querySelectorAll('button,a')].filter(el =>
    visible(el) && /(^|\s)(back|go back)(\s|$)/i.test((el.getAttribute('aria-label') || '') + ' ' + textOf(el))
  ).length;
  const breadcrumb = !!document.querySelector('[data-tl-breadcrumb]');

  /* 7. type floor: text under 11px that is not metadata, a chip or a glyph */
  const GLYPH = /star|pip|dot|badge|avatar|crest|icon|shirt|marker|rating|grade|initials|shield|emblem|meter/i;
  let tinyText = 0;
  const tinySamples = [];
  for (const el of scope.querySelectorAll('*')) {
    if (el.children.length) continue;
    if (el.closest('svg')) continue; /* SVG labels are artwork and scale with the drawing */
    const t = textOf(el);
    if (!t) continue;
    if (!visible(el)) continue;
    const px = parseFloat(getComputedStyle(el).fontSize);
    if (px >= 11) continue;
    if (isMeta(el) || GLYPH.test((el.className || '').toString())) continue;
    tinyText++;
    if (tinySamples.length < 3) tinySamples.push(`${px}px "${t.slice(0, 16)}"`);
  }

  /* 8. contrast on measurable text */
  const rgb = s => { const m = String(s).match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, b, a = 1] = m[1].split(',').map(Number); return { r, g, b, a }; };
  const lum = ({ r, g, b }) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + .05) / (y + .05); };
  const unmeasurable = el => {
    if (el.closest('[role="img"],.life-face,.tl-initials,[class*="avatar"],[class*="crest"],.mail-shield')) return true;
    let node = el;
    while (node && node !== document.documentElement) {
      const cs = getComputedStyle(node);
      const p = rgb(cs.backgroundColor);
      if (p && p.a > .55) return false;
      if (cs.backgroundImage !== 'none') return true;
      node = node.parentElement;
    }
    return false;
  };
  const bgOf = el => {
    let node = el;
    while (node && node !== document.documentElement) {
      const p = rgb(getComputedStyle(node).backgroundColor);
      if (p && p.a > .55) return p;
      node = node.parentElement;
    }
    return { r: 13, g: 20, b: 30 };
  };
  let contrastFails = 0;
  for (const el of scope.querySelectorAll('*')) {
    if (el.children.length || !textOf(el) || !visible(el)) continue;
    if (unmeasurable(el)) continue;
    const cs = getComputedStyle(el);
    const fg = rgb(cs.color); if (!fg) continue;
    const px = parseFloat(cs.fontSize);
    const large = px >= 18 || (px >= 14 && +cs.fontWeight >= 700);
    if (ratio(fg, bgOf(el)) < (large ? 3 : 4.5)) contrastFails++;
  }

  return {
    h1: h1s.length,
    pageAnchors,
    primaryActions,
    statusChips: chips.length,
    statusWithoutWords: chipsWithoutWords,
    statusNotStyled: chipsNotStyled,
    longLists: longLists.length,
    longListRows: longLists.reduce((a, l) => a + l.rows, 0),
    tables: tables.length,
    undeclaredTables,
    danger: danger.length,
    dangerNoPreflight,
    backControls,
    breadcrumb,
    tinyText,
    tinySamples,
    contrastFails
  };
};

(async () => {
  const browser = LIVE
    ? await pw.connectOverCDP(process.env.CDP_URL || 'http://127.0.0.1:9222')
    : await pw.launch({
      executablePath: await chromium.executablePath().catch(() => '/tmp/chromium'),
      args: [...chromium.args, '--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
      env: { ...process.env, LD_LIBRARY_PATH: process.env.LD_LIBRARY_PATH || '/tmp/al2023/lib' },
      headless: true
    });
  const liveContext = LIVE ? (browser.contexts()[0] || await browser.newContext()) : null;
  if (LIVE) say('contract check · ' + WIDTHS.join('/') + 'px');

  const rows = [];
  const errors = [];

  for (const width of WIDTHS) {
    const viewport = { width, height: width === 390 ? 844 : 900 };
    const context = LIVE ? liveContext : await browser.newContext({ viewport, deviceScaleFactor: 1 });
    if (fs.existsSync(careerFile)) {
      const save = JSON.parse(fs.readFileSync(careerFile, 'utf8')).career;
      await context.addInitScript((c) => {
        localStorage.setItem('touchline.careers.v2', JSON.stringify([c]));
        localStorage.setItem('touchline.recent.v2', c.id);
      }, save);
    }
    const page = await context.newPage();
    if (LIVE) await page.setViewportSize(viewport);
    page.on('pageerror', e => errors.push({ width, message: e.message.slice(0, 160) }));
    await page.goto(GAME, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(900);

    /* The service worker can take over and reload the tab on first load, which destroys the
       execution context mid-run. Wait for the rail to be complete, and reload if it never is. */
    const railReady = async () => page.waitForFunction(
      () => document.querySelectorAll('#homeNav [data-hc-open]').length >= 30,
      null, { timeout: 8000 }).then(() => true).catch(() => false);
    if (!(await railReady())) {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1200);
      await railReady();
    }

    const pages = await page.evaluate(() => [...new Set([...document.querySelectorAll('#homeNav [data-hc-open]')].map(b => b.dataset.hcOpen))]);
    for (const id of pages) {
      const clicked = await page.evaluate((pid) => {
        const el = document.querySelector(`#homeNav [data-hc-open="${pid}"]`);
        if (!el) return false;
        el.click();
        return true;
      }, id);
      if (!clicked) continue;
      await page.waitForTimeout(320);
      let result = null;
      for (let attempt = 0; attempt < 3 && !result; attempt++) {
        try {
          result = await page.evaluate(PROBE);
        } catch (error) {
          if (attempt === 2) { errors.push({ width, page: id, message: error.message.slice(0, 160) }); break; }
          /* A reload wiped the context: settle, then reopen the same destination. */
          await page.waitForLoadState('domcontentloaded').catch(() => {});
          await page.waitForTimeout(700);
          await page.evaluate(pid => document.querySelector(`#homeNav [data-hc-open="${pid}"]`)?.click(), id).catch(() => {});
          await page.waitForTimeout(350);
        }
      }
      if (result) rows.push({ width, page: id, ...result });
    }
    await page.close();
  }

  if (!LIVE) await browser.close();
  else say('contract check finished');

  const sum = rows.reduce((a, r) => {
    a.pageAnchors += r.pageAnchors ? 1 : 0;
    a.noH1 += r.h1 === 1 ? 0 : 1;
    a.primaryMissing += r.primaryActions === 1 ? 0 : 1;
    a.statusWithoutWords += r.statusWithoutWords;
    a.statusNotStyled += r.statusNotStyled;
    a.longLists += r.longLists;
    a.longListRows += r.longListRows;
    a.tables += r.tables;
    a.undeclaredTables += r.undeclaredTables;
    a.dangerNoPreflight += r.dangerNoPreflight;
    a.backDuplicates += Math.max(0, r.backControls - 1);
    a.noBreadcrumb += r.breadcrumb ? 0 : 1;
    a.tinyText += r.tinyText;
    a.contrastFails += r.contrastFails;
    return a;
  }, { pageAnchors: 0, noH1: 0, primaryMissing: 0, statusWithoutWords: 0, statusNotStyled: 0, longLists: 0, longListRows: 0, tables: 0, undeclaredTables: 0, dangerNoPreflight: 0, backDuplicates: 0, noBreadcrumb: 0, tinyText: 0, contrastFails: 0 });

  const states = rows.length;
  const report = {
    at: new Date().toISOString(),
    states,
    widths: WIDTHS,
    contracts: sum,
    errors,
    rows
  };
  fs.mkdirSync(path.join(ROOT, '.audit'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, '.audit', 'contract.json'), JSON.stringify(report, null, 1));

  const line = (label, value, note) => console.log(`  ${label.padEnd(34)} ${String(value).padStart(4)}   ${note}`);
  console.log(`\nUI contracts — ${states} screens at ${WIDTHS.join(' / ')}px (${errors.length} errors)\n`);
  line('page anchors [data-tl-page]', sum.pageAnchors, `of ${states} screens have one`);
  line('screens with exactly one h1', states - sum.noH1, `of ${states}`);
  line('screens with one primary action', states - sum.primaryMissing, `of ${states}`);
  line('status chips', sum.statusWithoutWords + (rows.reduce((a, r) => a + r.statusChips, 0)), `${sum.statusWithoutWords} without words`);
  line('long lists without a range', sum.longLists, `${sum.longListRows} rows hidden from the manager`);
  line('tables without a phone mode', sum.undeclaredTables, `of ${sum.tables} tables`);
  line('danger actions w/o preflight', sum.dangerNoPreflight, 'must all be zero');
  line('duplicate Back controls', sum.backDuplicates, 'one Back only');
  line('screens without a breadcrumb', sum.noBreadcrumb, `of ${states}`);
  line('text under 11px (not metadata)', sum.tinyText, 'floor is 11px');
  line('contrast failures', sum.contrastFails, 'must be zero');

  if (errors.length) {
    console.log('\n  runtime errors:');
    for (const e of errors.slice(0, 6)) console.log(`    ${e.width}px ${e.page || ''} ${e.message}`);
  }

  console.log(`\n  report: .audit/contract.json`);
  const failing = sum.contrastFails + sum.dangerNoPreflight + sum.backDuplicates + sum.noH1 + errors.length;
  if (STRICT) {
    console.log(failing ? `\nSTRICT: ${failing} blocking violations.\n` : '\nSTRICT: clean.\n');
    process.exit(failing ? 1 : 0);
  }
  console.log('  baseline mode — contracts are reported, not enforced yet.\n');
  /* a CDP connection keeps the event loop alive; end the script, not the browser */
  if (LIVE) process.exit(0);
})().catch(error => {
  console.error('contract check failed:', error.message);
  process.exit(1);
});
