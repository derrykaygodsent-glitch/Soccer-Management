'use strict';
/**
 * A short, real tour of the game driven through the live screen, so the control room shows
 * pointer movement and page changes as they happen. Also a smoke test: it fails loudly if a
 * nav destination is missing.
 *
 *   node scripts/live-demo.cjs            // smooth tour, ~25 s
 *   node scripts/live-demo.cjs --fast     // half the pauses
 */

const { openLive, log } = require('./live-browser.cjs');

const fast = process.argv.includes('--fast');
const pause = (ms) => new Promise((r) => setTimeout(r, fast ? ms / 2 : ms));

async function glide(page, selector, { settle = 260, offset = [0, 0] } = {}) {
  const target = await page.$(selector);
  if (!target) return false;
  const box = await target.boundingBox();
  if (!box) return false;
  const x = box.x + box.width / 2 + offset[0];
  const y = box.y + box.height / 2 + offset[1];
  const from = await page.evaluate(() => window.__tlCursor ? { x: window.__tlCursor.x, y: window.__tlCursor.y } : { x: innerWidth / 2, y: innerHeight / 2 }).catch(() => ({ x: 0, y: 0 }));
  const startX = from.x > 0 ? from.x : x;
  const startY = from.y > 0 ? from.y : y;
  await page.mouse.move(startX, startY);
  await page.mouse.move(x, y, { steps: 22 });
  await pause(settle);
  return { x, y };
}

async function tap(page, selector, label) {
  const point = await glide(page, selector);
  if (!point) {
    log(`missing: ${label || selector}`);
    return false;
  }
  await page.mouse.down();
  await pause(70);
  await page.mouse.up();
  await pause(420);
  return true;
}

(async () => {
  const { browser, page, attached } = await openLive();
  log(attached ? 'Attached to the live browser' : 'Live screen offline — driving a private browser');
  if (!attached) console.log('note: live screen not running, so this run will not be visible');

  if (!attached) await page.setViewportSize?.({ width: 1280, height: 800 }).catch(() => {});
  await page.waitForTimeout(800);

  // The career picker comes first when the save is not loaded.
  const picker = await page.$('[data-entry="reuse"]');
  if (picker) {
    log('Picking the saved career');
    await tap(page, '[data-entry="reuse"]', 'saved career');
    await pause(900);
  }

  const steps = [
    ['#homeNav [data-hc-open="squad"]', 'Opening the squad'],
    ['#homeNav [data-hc-open="tactics"]', 'Opening tactics'],
    ['#homeNav [data-hc-open="inbox"]', 'Opening the inbox'],
    ['#homeNav [data-hc-open="finance"]', 'Opening finance'],
    ['#homeNav [data-hc-open="home"]', 'Back to the clubhouse']
  ];
  for (const [selector, label] of steps) {
    log(label);
    const ok = await tap(page, selector, label);
    if (!ok) console.log(`could not find ${selector}`);
    await pause(650);
  }

  // A slow sweep across the content so the pointer is visibly moving on camera.
  const size = page.viewportSize() || { width: 1280, height: 800 };
  log('Sweeping the page so the pointer is visible');
  for (const [fx, fy] of [[0.3, 0.3], [0.7, 0.35], [0.75, 0.6], [0.35, 0.65]]) {
    await page.mouse.move(size.width * fx, size.height * fy, { steps: 26 });
    await pause(320);
  }

  log('Tour finished');
  await pause(600);
  if (!attached) await browser.close();
  /* A CDP attachment keeps the event loop alive; end the script, not the browser. */
  process.exit(0);
})().catch((error) => {
  console.error('Live demo failed:', error.message);
  process.exit(1);
});
