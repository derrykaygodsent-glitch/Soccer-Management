/* A feed says how much it holds and turns pages instead of unrolling every story and post. */
(function (g) {
  'use strict';
  const at = new Map();

  function perPage(el) {
    const wide = Number(el.dataset.wireSize) || 8;
    const narrow = Number(el.dataset.wireSizePhone) || Math.min(wide, 5);
    const width = typeof innerWidth === 'number' ? innerWidth : 1280;
    return width < 900 ? narrow : wide;
  }

  function pagesOf(total, per) {
    return Math.max(1, Math.ceil(total / Math.max(1, per)));
  }

  function pageOf(total, per, index) {
    return Math.min(Math.max(0, Number(index) || 0), pagesOf(total, per) - 1);
  }

  function label(from, to, total, noun) {
    const word = total === 1 ? String(noun).replace(/s$/, '') : noun;
    return from <= 1 && to >= total ? `Showing all ${total} ${word}` : `Showing ${from} to ${to} of ${total} ${word}`;
  }

  function items(el) {
    return [...el.children].filter(k => !(k.classList && k.classList.contains('wire-pager')));
  }

  function paint(el) {
    const doc = el.ownerDocument || (typeof document === 'undefined' ? null : document);
    if (!doc) return;
    const key = el.dataset.wireKey || 'wire';
    const noun = el.dataset.wireNoun || 'stories';
    const list = items(el);
    const per = perPage(el);
    const total = list.length;
    const index = pageOf(total, per, at.get(key) || 0);
    at.set(key, index);
    const from = index * per + 1;
    const to = Math.min(total, (index + 1) * per);
    list.forEach((row, i) => {
      row.hidden = i < index * per || i >= to;
    });
    let pager = el.__wirePager;
    if (!pager || pager.parentNode !== el) {
      pager = el.__wirePager = doc.createElement('nav');
      pager.className = 'wire-pager';
      el.append(pager);
    }
    if (!total) {
      pager.hidden = true;
      return;
    }
    pager.hidden = false;
    const pages = pagesOf(total, per);
    pager.setAttribute('data-wire-pager', '');
    pager.setAttribute('aria-label', `Pages of ${noun}`);
    const range = `<p class="tl-range" role="status">${label(from, to, total, noun)}</p>`;
    if (pages < 2) {
      pager.innerHTML = range;
      return;
    }
    pager.innerHTML =
      range +
      `<div class="wire-page-nav">` +
      `<button type="button" data-wire-step="-1"${index === 0 ? ' disabled' : ''}>Previous</button>` +
      `<span>Page ${index + 1} of ${pages}</span>` +
      `<button type="button" data-wire-step="1"${index >= pages - 1 ? ' disabled' : ''}>Next</button>` +
      `</div>`;
  }

  function step(stream, delta) {
    const key = stream.dataset.wireKey || 'wire';
    const total = items(stream).length;
    const per = perPage(stream);
    at.set(key, pageOf(total, per, (at.get(key) || 0) + delta));
    paint(stream);
    const box = stream.closest ? stream.closest('main') : null;
    if (box && box.scrollTo && stream.getBoundingClientRect && box.getBoundingClientRect) {
      const top = box.scrollTop + stream.getBoundingClientRect().top - box.getBoundingClientRect().top;
      box.scrollTo({ top: Math.max(0, top - 8) });
    } else if (stream.scrollIntoView) {
      stream.scrollIntoView({ block: 'start' });
    }
  }

  function apply(root) {
    if (!root || !root.querySelectorAll) return;
    for (const el of root.querySelectorAll('[data-wire-stream]')) paint(el);
  }

  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('click', event => {
      const button = event.target.closest ? event.target.closest('[data-wire-step]') : null;
      if (!button) return;
      const stream = button.closest('[data-wire-stream]');
      if (!stream) return;
      step(stream, Number(button.dataset.wireStep) || 0);
      if (button.blur) button.blur();
    });
  }

  const api = { apply, paint, step, perPage, pagesOf, pageOf, label, reset: key => (key ? at.delete(key) : at.clear()) };
  g.TLWirePager = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
