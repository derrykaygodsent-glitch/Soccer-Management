/* DOM-shim smoke test: run the real UI through a full match headlessly. */
'use strict';
const fs = require('fs');

function makeCtx() {
  const grad = { addColorStop() {} };
  return {
    setTransform() {}, fillRect() {}, strokeRect() {}, clearRect() {},
    beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, fill() {},
    arc() {}, ellipse() {}, save() {}, restore() {}, fillText() {}, setLineDash() {},
    measureText() { return { width: 10 }; },
    createRadialGradient() { return grad; }, createLinearGradient() { return grad; }
  };
}
let elCount = 0;
function makeEl(tag) {
  const el = {
    tag, id: '', children: [], style: { setProperty() {} }, dataset: {},
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
      toggle(c, f) { if (f === undefined) f = !this._s.has(c); f ? this._s.add(c) : this._s.delete(c); return f; },
      contains(c) { return this._s.has(c); }
    },
    _innerHTML: '', textContent: '', value: '', checked: true, width: 280, height: 64,
    clientWidth: 280, clientHeight: 200, offsetWidth: 100,
    onclick: null, onchange: null,
    set innerHTML(v) { this._innerHTML = v; this.children = []; },
    get innerHTML() { return this._innerHTML; },
    appendChild(c) { this.children.push(c); c.parentElement = this; return c; },
    prepend(c) { this.children.unshift(c); c.parentElement = this; },
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); },
    get lastChild() { return this.children[this.children.length - 1] || null; },
    addEventListener() {}, removeEventListener() {},
    getBoundingClientRect() { return { width: 900, height: 500, left: 0, top: 0 }; },
    getContext() { return makeCtx(); },
    querySelectorAll() { return []; },
    click() { if (this.onclick) this.onclick({ stopPropagation() {}, target: this, clientX: 100, clientY: 100 }); }
  };
  el.parentElement = { getBoundingClientRect: () => ({ width: 900, height: 500 }), clientWidth: 280 };
  elCount++;
  return el;
}
const byId = {};
global.window = global;
global.devicePixelRatio = 1;
global.document = {
  readyState: 'complete',
  getElementById(id) { if (!byId[id]) { byId[id] = makeEl('div'); byId[id].id = id; } return byId[id]; },
  createElement(tag) { return makeEl(tag); },
  querySelectorAll() { return []; },
  querySelector() { return null; },
  addEventListener() {},
  documentElement: { style: { setProperty() {} } }
};
let rafCb = null;
global.requestAnimationFrame = cb => { rafCb = cb; };
global.addEventListener = () => {};
global.AudioContext = undefined;

// load the real source in order
for (const f of ['data.js', 'engine.js', 'render.js', 'audio.js', 'ui.js']) {
  require('../src/' + f);
}
console.log('init OK, elements created:', elCount);

// kick off
byId['btnKick'].click();
console.log('startMatch OK');

// pump frames until full time (dt clamped 0.05 → 0.3 match-s/frame at 1x)
let t = 0, frames = 0, goals = 0, replays = 0, errors = 0;
const origGoal = global.TLEngine.Match.prototype; // events via commentary list growth
let lastComCount = 0;
function pump(n) {
  for (let i = 0; i < n; i++) {
    t += 100; frames++;
    try { rafCb(t); } catch (e) { errors++; console.error('FRAME ERROR @', frames, e.stack.split('\n').slice(0, 3).join('\n')); if (errors > 3) process.exit(1); }
  }
}
// run to HT
pump(12000);
const comHTML = byId['comlist'].children.length;
console.log('after 12000 frames: commentary items =', comHTML, '| overlay title =', byId['ovTitle'].textContent);
// exercise substitution if bench buttons exist
let subDone = false;
for (let bi = 0; bi < byId['benchList'].children.length && !subDone; bi++) {
  const brow = byId['benchList'].children[bi];
  if (!brow.children.length) continue;
  brow.children[0].click(); // ON button
  const xiRows = byId['xiList'].children;
  for (let xi = 1; xi < xiRows.length; xi++) {
    xiRows[xi].click();
    if (byId['subsLeft'].textContent.startsWith('4')) { subDone = true; break; }
    if (!byId['subBanner'].classList.contains('hidden')) continue;
  }
}
console.log('legal substitution executed:', subDone, '| subsLeft =', byId['subsLeft'].textContent);
// continue second half
if (byId['ovContinue'].onclick) byId['ovContinue'].click();
pump(14000);
console.log('after HT+14000 frames: overlay title =', byId['ovTitle'].textContent, '| score =', byId['score'].textContent);
console.log('commentary items total =', byId['comlist'].children.length);
// new match flow
if (byId['ovContinue'].onclick) byId['ovContinue'].click();
console.log('new-match flow OK');
console.log(errors === 0 ? 'SMOKE TEST PASSED ✔ (no runtime errors across full match + subs + overlays)' : 'FAILED');
process.exit(errors === 0 ? 0 : 1);
