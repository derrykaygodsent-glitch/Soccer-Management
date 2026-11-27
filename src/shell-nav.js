/* The shell a manager already knows: sections along the top, pinned screens, a command palette
   and a thumb dock on a phone. Every destination stays reachable in one or two clicks. */
(function (g) {
  'use strict';
  const PIN_KEY = 'touchline.pins.v2';
  const FALLBACK_PINS = ['inbox', 'squad', 'tactics'];
  let mounted = false;
  let openHub = null;

  const $ = id => document.getElementById(id);
  const nav = () => $('homeNav');
  const titles = () => g.TLScreenHead?.titles?.() || new Map();

  function pins() {
    try {
      const raw = JSON.parse(localStorage.getItem(PIN_KEY) || 'null');
      if (Array.isArray(raw) && raw.length) return raw.slice(0, 6);
    } catch { /* storage may be unavailable */ }
    return FALLBACK_PINS.slice();
  }

  function setPins(list) {
    try { localStorage.setItem(PIN_KEY, JSON.stringify(list.slice(0, 6))); } catch { /* ignore */ }
    paintPins();
  }

  function togglePin(id) {
    const list = pins();
    setPins(list.includes(id) ? list.filter(x => x !== id) : [id, ...list]);
  }

  const isPinned = id => pins().includes(id);

  function go(id) {
    nav()?.querySelector(`[data-hc-open="${id}"]`)?.click();
  }

  function paintPins() {
    const host = nav()?.querySelector('[data-tl-pins]');
    if (!host) return;
    const map = titles();
    host.innerHTML = pins().filter(id => map.has(id)).map(id =>
      `<button type="button" class="tl-pin" data-pin="${id}" title="Pinned: ${map.get(id)}"><span>${map.get(id)}</span></button>`).join('');
    for (const el of document.querySelectorAll('[data-tl-pin]')) {
      const on = isPinned(el.dataset.tlPin);
      el.setAttribute('aria-pressed', String(on));
      el.textContent = on ? 'Pinned' : 'Pin';
    }
  }

  function closeHub() {
    openHub = null;
    for (const button of nav()?.querySelectorAll('[data-hub]') || []) button.setAttribute('aria-expanded', 'false');
    for (const panel of nav()?.querySelectorAll('[data-hub-panel]') || []) panel.hidden = true;
  }

  function openPanel(id) {
    if (openHub === id) { closeHub(); return; }
    closeHub();
    openHub = id;
    nav()?.querySelector(`[data-hub="${id}"]`)?.setAttribute('aria-expanded', 'true');
    const panel = nav()?.querySelector(`[data-hub-panel="${id}"]`);
    if (panel) {
      panel.hidden = false;
      panel.querySelector('[data-hc-open]')?.focus({ preventScroll: true });
    }
  }

  /* ---- command palette ---------------------------------------------------------------- */
  const PALETTE = () => {
    let box = $('tlPalette');
    if (box) return box;
    box = document.createElement('div');
    box.id = 'tlPalette';
    box.className = 'tl-palette';
    box.hidden = true;
    box.innerHTML = `<div class="tl-palette-box" role="dialog" aria-modal="true" aria-label="Jump to a screen">
      <div class="tl-palette-field"><input id="tlPaletteInput" type="search" autocomplete="off" placeholder="Jump to a screen" aria-label="Jump to a screen" aria-controls="tlPaletteList"><kbd>esc</kbd></div>
      <ol id="tlPaletteList" class="tl-palette-list" role="listbox" aria-label="Screens"></ol></div>`;
    ($('homeScreen') || document.body).appendChild(box);
    box.addEventListener('click', event => { if (event.target === box) closePalette(); });
    $('tlPaletteInput').addEventListener('input', () => paintPalette());
    return box;
  };

  let paletteIndex = 0;

  function paletteMatches(query) {
    const q = String(query || '').trim().toLowerCase();
    const map = titles();
    const rows = [...map].map(([id, label]) => ({ id, label }));
    if (!q) return rows;
    return rows.filter(r => r.label.toLowerCase().includes(q) || r.id.toLowerCase().includes(q));
  }

  function paintPalette() {
    const input = $('tlPaletteInput');
    if (!input) return;
    const rows = paletteMatches(input.value).slice(0, 9);
    paletteIndex = Math.min(paletteIndex, Math.max(0, rows.length - 1));
    $('tlPaletteList').innerHTML = rows.length
      ? rows.map((r, i) => `<li role="option" aria-selected="${i === paletteIndex}"><button type="button" class="tl-palette-row" data-palette="${r.id}"${i === paletteIndex ? ' data-active="true"' : ''}><span>${r.label}</span><small>${r.id === 'home' ? 'Today' : ''}</small></button></li>`).join('')
      : '<li class="tl-palette-empty">No screen with that name.</li>';
  }

  function openPalette() {
    const box = PALETTE();
    box.hidden = false;
    paletteIndex = 0;
    const input = $('tlPaletteInput');
    input.value = '';
    paintPalette();
    input.focus({ preventScroll: true });
  }

  function closePalette() {
    const box = $('tlPalette');
    if (box) box.hidden = true;
  }

  const paletteOpen = () => !!$('tlPalette') && !$('tlPalette').hidden;

  function choosePalette(id) {
    closePalette();
    go(id);
  }

  /* ---- phone dock ---------------------------------------------------------------------- */
  const DOCK = [['home', 'Today'], ['inbox', 'Inbox'], ['squad', 'Squad'], ['tactics', 'Tactics']];

  function paintDock() {
    let bar = $('tlDock');
    if (!bar) {
      bar = document.createElement('nav');
      bar.id = 'tlDock';
      bar.className = 'tl-dock';
      bar.setAttribute('aria-label', 'Quick navigation');
      ($('homeScreen') || document.body).appendChild(bar);
    }
    bar.innerHTML = DOCK.map(([id, label]) => `<button type="button" class="tl-dock-item" data-dock="${id}"><span>${label}</span></button>`).join('')
      + `<button type="button" class="tl-dock-continue" data-dock="continue"><span>Continue</span></button>`;
    markDock();
  }

  function markDock() {
    const current = document.querySelector('#clubPage [data-tl-page]')?.dataset.tlPage || 'home';
    for (const item of document.querySelectorAll('[data-dock]')) {
      if (item.dataset.dock === 'continue') continue;
      item.toggleAttribute('aria-current', item.dataset.dock === current);
    }
  }

  /* ---- mounting and events -------------------------------------------------------------- */
  function mount() {
    if (mounted) return;
    const header = document.querySelector('.hc-header');
    const list = nav();
    if (!header || !list) return;
    const top = document.createElement('div');
    top.className = 'tl-topnav';
    header.insertBefore(top, header.querySelector('.hc-tabs'));
    top.appendChild(list);
    mounted = true;
    document.documentElement.setAttribute('data-tl-shell', 'topnav');
    paintPins();
    paintDock();
  }

  document.addEventListener('click', event => {
    const hub = event.target.closest('[data-hub]');
    if (hub) { openPanel(hub.dataset.hub); return; }
    const pin = event.target.closest('[data-pin]');
    if (pin) { go(pin.dataset.pin); closeHub(); return; }
    const pinButton = event.target.closest('[data-tl-pin]');
    if (pinButton) { togglePin(pinButton.dataset.tlPin); return; }
    const row = event.target.closest('[data-palette]');
    if (row) { choosePalette(row.dataset.palette); return; }
    const dockItem = event.target.closest('[data-dock]');
    if (dockItem) {
      if (dockItem.dataset.dock === 'continue') $('homeContinue')?.click();
      else go(dockItem.dataset.dock);
      return;
    }
    if (event.target.closest('[data-hub-panel] [data-hc-open]')) {
      closeHub();
      setTimeout(() => { paintPins(); markDock(); }, 0);
      return;
    }
    if (!event.target.closest('.tl-topnav')) closeHub();
    /* any navigation refreshes which screen is marked as current */
    if (event.target.closest('[data-hc-open]')) setTimeout(() => { paintPins(); markDock(); }, 0);
  });

  document.addEventListener('keydown', event => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.isContentEditable;
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      paletteOpen() ? closePalette() : openPalette();
      return;
    }
    if (event.key === 'Escape') {
      if (paletteOpen()) { event.stopPropagation(); closePalette(); }
      closeHub();
      return;
    }
    if (!paletteOpen()) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const rows = paletteMatches($('tlPaletteInput').value);
      if (!rows.length) return;
      paletteIndex = (paletteIndex + (event.key === 'ArrowDown' ? 1 : rows.length - 1)) % rows.length;
      paintPalette();
      $('tlPaletteList').querySelector('[data-active="true"]')?.focus({ preventScroll: true });
      return;
    }
    if (event.key === 'Enter') {
      const active = $('tlPaletteList').querySelector('[data-active="true"]');
      if (active) { event.preventDefault(); choosePalette(active.dataset.palette); }
    }
  });

  g.TLShellNav = { mount, pins, setPins, togglePin, isPinned, closeHub, openPalette, closePalette, paintPins, markDock, go };
  if (typeof module !== 'undefined') module.exports = g.TLShellNav;
})(typeof window === 'undefined' ? globalThis : window);
