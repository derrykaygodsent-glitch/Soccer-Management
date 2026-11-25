'use strict';
/**
 * Attach to the browser that scripts/live-screen.cjs is already streaming, so anything you
 * drive from a terminal is visible in the live view. Falls back to a fresh headless browser
 * when the live screen is not running, so audits and measurements still work unattended.
 *
 *   const { openLive } = require('./scripts/live-browser.cjs');
 *   const { browser, page, attached } = await openLive({ viewport: [1440, 900] });
 */

const fs = require('node:fs');
const path = require('node:path');
const chromium = require('@sparticuz/chromium').default;
const { chromium: pw } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const CDP_URL = process.env.CDP_URL || 'http://127.0.0.1:9222';
const GAME = process.env.GAME_URL || 'http://127.0.0.1:4173';

function saveScript() {
  const file = path.join(ROOT, '.audit', 'career.json');
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')).career || null;
  } catch {
    return null;
  }
}

async function openLive({ viewport = [1280, 800], careerFile = null } = {}) {
  const career = careerFile === false ? null : saveScript();
  let attachError = null;
  try {
    const browser = await pw.connectOverCDP(CDP_URL);
    const context = browser.contexts()[0] || await browser.newContext();
    const page = context.pages()[0] || await context.newPage();
    if (!page.url().startsWith('http')) await page.goto(GAME, { waitUntil: 'domcontentloaded' });
    return { browser, context, page, attached: true, close: async () => {} };
  } catch (error) {
    attachError = error;
    if (process.env.LIVE_DEBUG) console.log('attach failed:', error.message.split('\n')[0]);
    const executablePath = await chromium.executablePath().catch(() => '/tmp/chromium');
    const browser = await pw.launch({
      executablePath,
      args: [...chromium.args, '--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
      env: { ...process.env, LD_LIBRARY_PATH: process.env.LD_LIBRARY_PATH || '/tmp/al2023/lib' },
      headless: true
    });
    const context = await browser.newContext({ viewport: { width: viewport[0], height: viewport[1] }, deviceScaleFactor: 1 });
    if (career) {
      await context.addInitScript((c) => {
        localStorage.setItem('touchline.careers.v2', JSON.stringify([c]));
        localStorage.setItem('touchline.recent.v2', c.id);
      }, career);
    }
    const page = await context.newPage();
    await page.goto(GAME, { waitUntil: 'networkidle' });
    return { browser, context, page, attached: false, close: () => browser.close() };
  }
}

/** Post a line to the control room's work log (ignored when nothing is listening). */
function log(text) {
  const body = JSON.stringify({ text });
  const req = require('node:http').request(
    { host: '127.0.0.1', port: Number(process.env.LIVE_PORT || 4180), path: '/log?text=' + encodeURIComponent(text), method: 'GET' },
    (res) => res.resume()
  );
  req.on('error', () => {});
  req.end(body);
}

module.exports = { openLive, log, GAME };
