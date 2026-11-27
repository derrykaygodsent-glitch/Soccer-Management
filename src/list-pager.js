/* Long lists say how many rows exist and show them a page at a time instead of hiding the rest. */
(function (g) {
  'use strict';
  const PAGE = 25;
  const shown = new Map();

  /* A list is a run of siblings that mostly share a tag: rows, cards or table rows. */
  function rowsOf(el) {
    const kids = [...el.children];
    if (kids.length <= PAGE) return null;
    const counts = new Map();
    for (const k of kids) counts.set(k.tagName, (counts.get(k.tagName) || 0) + 1);
    if (Math.max(...counts.values()) < kids.length * 0.8) return null;
    return kids;
  }

  function label(shownCount, total) {
    return shownCount >= total
      ? `Showing all ${total}`
      : `Showing 1 to ${shownCount} of ${total}`;
  }

  function pageSize(pager) {
    return Number(pager.dataset.tlPageSize) || PAGE;
  }

  function paint(pager, kids, limit) {
    kids.forEach((row, i) => { row.hidden = i >= limit; });
    pager.innerHTML = `<p class="tl-range" data-tl-meta>${label(Math.min(limit, kids.length), kids.length)}</p>` +
      (limit < kids.length
        ? `<button type="button" class="tl-more" data-tl-more>Show ${Math.min(pageSize(pager), kids.length - limit)} more</button>`
        : '');
  }

  function apply(root, pageKey) {
    if (!root) return;
    if (root.querySelectorAll('[data-tl-list]').length === 0 && !root.querySelector('ul, ol, tbody')) return;
    let index = 0;
    for (const el of root.querySelectorAll('ul, ol, tbody, [data-tl-list]')) {
      const kids = rowsOf(el);
      if (!kids) continue;
      index += 1;
      const key = `${pageKey || 'page'}::${index}`;
      const size = Number(el.dataset.tlPageSize) || PAGE;
      const limit = shown.get(key) || size;
      if (el.closest('[data-tl-grid]') || el.hasAttribute('data-tl-grid')) continue;
      if (el.nextElementSibling?.classList.contains('tl-pager')) el.nextElementSibling.remove();
      const pager = document.createElement('div');
      pager.className = 'tl-pager';
      pager.setAttribute('data-tl-pager', '');
      if (el.dataset.tlPageSize) pager.dataset.tlPageSize = el.dataset.tlPageSize;
      pager.dataset.tlList = key;

      if (el.hasAttribute('data-tl-list') && el.tagName === 'DIV') {
        /* the list is its own wrapper, so the range has to live inside it to be seen */
        el.append(pager);
      } else if (el.tagName === 'TBODY') {
        /* a div cannot live inside a table, so the pager sits under it and the wrapper carries the range */
        const table = el.closest('table');
        table.parentElement?.setAttribute('data-tl-list', '');
        table.after(pager);
      } else {
        el.after(pager);
        const wrap = el.closest('[data-tl-list]') || el.parentElement;
        wrap?.setAttribute('data-tl-list', '');
      }
      pager.__rows = kids;
      paint(pager, kids, limit);
      shown.set(key, Math.min(limit, kids.length));
    }
  }

  /* Reading a page never needs a redraw: the rows are already in the document. */
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-tl-more]');
    if (!button) return;
    const pager = button.closest('.tl-pager');
    const rows = pager?.__rows;
    if (!rows) return;
    const next = Math.min(rows.length, (shown.get(pager.dataset.tlList) || pageSize(pager)) + pageSize(pager));
    shown.set(pager.dataset.tlList, next);
    paint(pager, rows, next);
    button.blur();
  });

  g.TLListPager = { apply, PAGE };
  if (typeof module !== 'undefined') module.exports = g.TLListPager;
})(typeof window === 'undefined' ? globalThis : window);
