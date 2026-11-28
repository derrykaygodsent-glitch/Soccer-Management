'use strict';
/* The section menus in the header follow the pointer, and the team-sheet role cells
   stopped drawing a boxed ring when they are hovered or opened. */
const test = require('node:test');
const vm = require('node:vm');
const path = require('node:path');
const fs = require('node:fs');
const a = require('node:assert/strict');

const read = name => fs.readFileSync(path.join(__dirname, '../src', name), 'utf8');

function harness() {
  const listeners = new Map();
  const focused = [];
  const hub = {
    dataset: { hub: 'squad' },
    attrs: {},
    setAttribute(k, v) { this.attrs[k] = v; },
    getAttribute(k) { return this.attrs[k]; },
    closest() { return this; }
  };
  const item = { focus: () => focused.push('item') };
  const panel = { dataset: { hubPanel: 'squad' }, hidden: true, querySelector: () => item };
  const nav = {
    querySelector(sel) {
      if (sel.includes('[data-hc-open]')) return item;
      if (sel.includes('[data-hub-panel="squad"]')) return panel;
      if (sel.includes('[data-hub="squad"]')) return hub;
      return null;
    },
    querySelectorAll(sel) {
      if (sel === '[data-hub]') return [hub];
      if (sel === '[data-hub-panel]') return [panel];
      return [];
    }
  };
  const document = {
    documentElement: { setAttribute() {} },
    getElementById: id => (id === 'homeNav' ? nav : null),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(fn); }
  };
  const window = { document, localStorage: { getItem: () => null, setItem() {} }, setTimeout, clearTimeout };
  const context = vm.createContext({ window, document, localStorage: window.localStorage, setTimeout, clearTimeout, console, globalThis: {} });
  vm.runInContext(read('shell-nav.js'), context, { filename: 'shell-nav.js' });
  const fire = (type, event) => { for (const fn of listeners.get(type) || []) fn(event); };
  const hubTarget = { closest: sel => (sel === '#homeNav' ? nav : sel === '[data-hub]' ? hub : null) };
  return { fire, hub, panel, focused, nav, hubTarget };
}

const outside = { closest: () => null };

test('a section menu opens on hover, without stealing the pointer’s focus', () => {
  const h = harness();
  h.fire('pointerover', { pointerType: 'mouse', target: h.hubTarget });
  a.equal(h.panel.hidden, false, 'hovering the section shows its panel');
  a.equal(h.hub.attrs['aria-expanded'], 'true', 'the button reports itself expanded');
  a.deepEqual(h.focused, [], 'hovering never moves the keyboard focus');
});

test('leaving the nav row or the panel closes the menu after a moment', async () => {
  const h = harness();
  h.fire('pointerover', { pointerType: 'mouse', target: h.hubTarget });
  a.equal(h.panel.hidden, false);
  /* moving into the panel keeps it: the panel lives inside #homeNav */
  h.fire('pointerout', { pointerType: 'mouse', target: h.hubTarget, relatedTarget: { closest: () => h.nav } });
  h.fire('pointerover', { pointerType: 'mouse', target: { closest: sel => (sel === '#homeNav' ? h.nav : null) } });
  await new Promise(resolve => setTimeout(resolve, 240));
  a.equal(h.panel.hidden, false, 'crossing from the button into its panel keeps the menu open');
  h.fire('pointerout', { pointerType: 'mouse', target: h.hubTarget, relatedTarget: outside });
  await new Promise(resolve => setTimeout(resolve, 260));
  a.equal(h.panel.hidden, true, 'leaving the row lets the menu go');
  a.equal(h.hub.attrs['aria-expanded'], 'false');
});

test('a click keeps a hover-opened menu, closes it next, and a key press parks focus inside', () => {
  const h = harness();
  h.fire('pointerover', { pointerType: 'mouse', target: h.hubTarget });
  a.equal(h.panel.hidden, false);
  h.fire('click', { detail: 1, target: { closest: sel => (sel === '[data-hub]' ? h.hub : null) } });
  a.equal(h.panel.hidden, false, 'clicking the button under a hover-opened menu does not flicker it shut');
  h.fire('click', { detail: 1, target: { closest: sel => (sel === '[data-hub]' ? h.hub : null) } });
  a.equal(h.panel.hidden, true, 'the next click closes it');

  h.fire('pointerover', { pointerType: 'mouse', target: h.hubTarget });
  h.fire('click', { detail: 0, target: { closest: sel => (sel === '[data-hub]' ? h.hub : null) } });
  a.equal(h.panel.hidden, false, 'a keyboard activation keeps the menu open');
  a.deepEqual(h.focused, ['item'], 'and moves the keyboard into it');

  h.fire('keydown', { key: 'Escape', target: { tagName: 'BUTTON', closest: () => null } });
  a.equal(h.panel.hidden, true, 'Escape closes the menu');
});

test('touch and keyboard still open a section menu by activating the button', () => {
  const h = harness();
  h.fire('click', { detail: 1, target: { closest: sel => (sel === '[data-hub]' ? h.hub : null) } });
  a.equal(h.panel.hidden, false, 'a tap opens the panel');
  a.deepEqual(h.focused, ['item'], 'the keyboard lands on the first destination');
});

test('the team-sheet role cell behaves like the player cell: no ring, no underline, a live arrow', () => {
  const css = read('tactics-desk.css'), board = read('board-room.js');
  a.match(css, /\.fm-sheet-table \.fm-role-cell button:hover,[\s\S]{0,320}border-color: transparent[^}]*background: none[^}]*outline: 0[^}]*text-decoration: none/, 'the sheet cells drop the ring and the underline alike');
  a.doesNotMatch(css, /\.fm-sheet-table \.fm-role-cell button:hover,[^}]*underline/, 'no hover underline anywhere on the role cells');
  a.doesNotMatch(css, /td\.fm-sheet-player:hover \.fm-player-name \{[^}]*underline/, 'and none on the player column either');
  a.match(css, /\.fm-sheet-table \.fm-role-cell button::before \{[^}]*position: absolute;[^}]*inset: 0;/, 'the whole cell answers the pointer, so the arrow is part of the control');
  a.match(css, /\.fm-sheet-table \.fm-role-cell \{[^}]*position: relative;[^}]*padding-right: 0;/, 'the cell no longer reserves a dead strip for the arrow');
  a.match(css, /:has\(button\[aria-expanded="true"\]\)::after \{[^}]*transform: rotate\(225deg\)/, 'the arrow turns over while its sheet is open');
  /* the sheet clears the whole cell, name and fit line, instead of covering them */
  a.match(board, /const anchorEl=rolePicker\.kind==='marker'\?cell:cell\?\.closest\('\.fm-role-cell'\)\|\|cell;/, 'the sheet is placed from the cell block, not the single line of text');
});

test('no link or text button in the game is underlined', () => {
  const css = read('tactics-desk.css');
  a.match(css, /\/\* No underlines anywhere in the game[\s\S]*?a:hover,[\s\S]{0,400}text-decoration: none !important;/, 'the bundle ends with a blanket rule for links and buttons');
  for (const name of ['style.css', 'home.css', 'club.css', 'matchday.css', 'season.css', 'office.css', 'reading.css', 'tactics-desk.css']) {
    const sheet = read(name);
    const leftovers = sheet.split('\n').filter(line => /text-decoration\s*:\s*(underline|underline\s)/.test(line));
    a.deepEqual(leftovers, [], `${name} declares no underline`);
  }
});
