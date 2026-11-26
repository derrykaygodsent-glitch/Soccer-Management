/* Football-manager-style sortable, resizable and configurable table columns. */
(function (g) {
  'use strict';
  const STORE = 'touchline.tables.v1';
  const readStore = () => { try { return JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch { return {}; } };
  const writeStore = (key, value) => { try { const all = readStore(); all[key] = value; localStorage.setItem(STORE, JSON.stringify(all)); } catch { /* storage full or blocked */ } };
  const memory = new Map(), compare = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' }),
    positions = ['GK', 'DC', 'FB', 'WB', 'DM', 'CM', 'AM', 'W', 'ST'];
  let openMenu = null, stopOutside = null;
  function dismissMenu() {
    if (stopOutside) { document.removeEventListener('pointerdown', stopOutside); stopOutside = null; }
    if (openMenu) { openMenu.remove(); openMenu = null; }
  }
  const playerColumns = [
    ['pace', 'Pace', p => p.attrs?.pace], ['shooting', 'Shooting', p => p.attrs?.shooting],
    ['passing', 'Passing', p => p.attrs?.passing], ['dribbling', 'Dribbling', p => p.attrs?.dribbling],
    ['tackling', 'Tackling', p => p.attrs?.tackling], ['stamina', 'Stamina', p => p.attrs?.stamina],
    ['fitness', 'Fitness', p => Math.round((p.fitness ?? 1) * 100) + '%', p => Math.round((p.fitness ?? 1) * 100)],
    ['rating', 'Match rating', p => p.rating?.toFixed(1) ?? '–', p => p.rating ?? -1],
    ['goals', 'Goals', p => p.stats?.goals ?? 0], ['assists', 'Assists', p => p.stats?.assists ?? 0],
    ['passes', 'Passes', p => p.stats?.passes ?? 0],
  ].map(([key, label, value, sort = value]) => ({ key, label, value, sort }));

  function bind(root, career, page) {
    dismissMenu();
    for (const table of root.querySelectorAll('table[data-sort-table]')) {
      const head = table.tHead?.rows?.[0], body = table.tBodies?.[0];
      if (!head || !body) continue;
      let headers = Array.from(head.cells), labels = headers.map(h => h.textContent.trim());
      const key = JSON.stringify([career, page, table.dataset.sortTable]);
      if (!memory.has(key)) { const saved = readStore()[key]; if (saved) memory.set(key, saved); }
      const prior = memory.get(key) || {},
        hidden = new Set(prior.hidden || []), added = new Set(prior.added || []), widths = { ...(prior.widths || {}) }, groups = [];
      let group = [];
      for (const row of Array.from(body.rows)) {
        if (row.querySelector('[colspan]')) { if (group.length) groups.push(group); group = []; }
        else group.push(row);
      }
      if (group.length) groups.push(group);
      const extraEnabled = table.dataset.columnOptions === 'player' ? playerColumns : [];
      const tablePlayer = row => g.TLManagerLife.pool?.find(p => p.id === row.dataset.playerId);

      function persist(extra = {}) {
        const value = { ...memory.get(key), hidden: [...hidden], added: [...added], widths: { ...widths }, ...extra };
        memory.set(key, value);
        writeStore(key, value);
      }
      function applyWidths() {
        const visible = [];
        headers.forEach((header, col) => {
          const width = widths[labels[col]];
          if (width) {
            header.style.width = width + 'px';
            for (const row of Array.from(body.rows)) if (!row.querySelector('[colspan]') && row.cells[col]) row.cells[col].style.width = width + 'px';
          }
          if (!hidden.has(col)) visible.push(width || header.getBoundingClientRect().width || 100);
        });
        if (Object.keys(widths).length) {
          table.style.tableLayout = 'fixed';
          table.style.width = Math.max(100, visible.reduce((sum, width) => sum + width, 0)) + 'px';
        }
      }
      function applyVisibility() {
        headers.forEach((cell, col) => { cell.hidden = hidden.has(col); });
        for (const row of Array.from(body.rows)) {
          const spanning = row.querySelector('[colspan]');
          if (spanning) { spanning.colSpan = Math.max(1, headers.length - hidden.size); continue; }
          Array.from(row.cells).forEach((cell, col) => { cell.hidden = hidden.has(col); });
        }
        applyWidths();
      }
      function sortBy(col, dir) {
        headers.forEach((header, i) => {
          if (i === col) header.setAttribute('aria-sort', dir === 1 ? 'ascending' : 'descending');
          else header.removeAttribute('aria-sort');
        });
        for (const rows of groups) {
          const end = rows[rows.length - 1].nextSibling;
          const value = row => {
            const cell = row.cells[col], field = headers[col].dataset.columnKey;
            if (field) { const p = tablePlayer(row), spec = extraEnabled.find(option => option.key === field); return p && spec ? spec.sort(p) : ''; }
            if (labels[col] === 'Position') return positions.indexOf(cell.textContent.trim());
            return cell.querySelector('input,select')?.value ?? cell.dataset.key ?? cell.textContent.trim();
          };
          rows.sort((a, b) => {
            const x = value(a), y = value(b);
            return (x !== '' && y !== '' && Number.isFinite(+x) && Number.isFinite(+y) ? Number(x) - Number(y) : compare.compare(String(x), String(y))) * dir;
          });
          for (const row of rows) body.insertBefore(row, end);
        }
      }
      function addSorter(header, col) {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'column-sort'; button.textContent = labels[col];
        button.title = 'Sort by ' + (header.title || labels[col]);
        header.replaceChildren(button);
        button.onclick = () => {
          const previous = memory.get(key) || {}, dir = previous.col === col ? -previous.dir : header.dataset.first === 'desc' ? -1 : 1;
          persist({ col, dir });
          sortBy(col, dir);
        };
        button.onkeydown = event => {
          if ((event.shiftKey && event.key === 'F10') || event.key === 'ContextMenu') { event.preventDefault(); showMenu(col, header); }
        };
        return button;
      }
      function addResizeHandle(header, col) {
        const handle = document.createElement('span');
        handle.className = 'table-column-resizer'; handle.tabIndex = 0; handle.setAttribute('role', 'separator');
        handle.setAttribute('aria-orientation', 'vertical'); handle.setAttribute('aria-label', 'Resize ' + labels[col] + ' column');
        handle.onkeydown = event => {
          if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
          const delta = event.key === 'ArrowRight' ? 10 : -10;
          widths[labels[col]] = Math.max(48, Math.min(900, (widths[labels[col]] || header.getBoundingClientRect().width || 100) + delta));
          applyWidths(); persist(); event.preventDefault();
        };
        handle.onpointerdown = event => {
          if (event.button !== 0) return;
          event.preventDefault(); event.stopPropagation();
          const startX = event.clientX, startWidth = header.getBoundingClientRect().width || 100, label = labels[col];
          document.body.classList.add('resizing-table-column');
          const move = e => { const width = Math.max(48, Math.min(900, Math.round(startWidth + e.clientX - startX))); widths[label] = width; applyWidths(); };
          const up = () => {
            document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up);
            document.body.classList.remove('resizing-table-column'); persist();
          };
          document.addEventListener('pointermove', move); document.addEventListener('pointerup', up);
        };
        header.append(handle);
      }
      function menuButton(text, action, disabled = false) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = text; button.disabled = disabled;
        button.onclick = () => { action(); dismissMenu(); };
        openMenu.append(button);
      }
      function showMenu(col, anchor, event) {
        dismissMenu();
        const current = labels[col], isHidden = hidden.has(col);
        const menu = document.createElement('div');
        menu.className = 'table-context-menu'; menu.setAttribute('role', 'menu'); menu.tabIndex = -1;
        openMenu = menu;
        const title = document.createElement('strong'); title.textContent = 'Customize table'; menu.append(title);
        menuButton((isHidden ? 'Show' : 'Hide') + ' column: ' + current, () => {
          if (isHidden) hidden.delete(col); else if (hidden.size < headers.length - 1) hidden.add(col);
          persist(); applyVisibility(); phoneBar?.fill();
        }, !isHidden && hidden.size >= headers.length - 1);
        const extras = extraEnabled.filter(spec => !added.has(spec.key) && !labels.includes(spec.label));
        const hiddenCols = headers.map((header, index) => ({ header, index })).filter(x => hidden.has(x.index));
        if (hiddenCols.length || extras.length) {
          const sub = document.createElement('small'); sub.textContent = 'Add a column'; menu.append(sub);
          for (const item of hiddenCols) menuButton('Restore: ' + labels[item.index], () => { hidden.delete(item.index); persist(); applyVisibility(); phoneBar?.fill(); });
          for (const spec of extras) menuButton('Add: ' + spec.label, () => addExtra(spec));
        }
        menuButton('Reset columns and widths', reset, false);
        menuButton('Close', dismissMenu);
        document.body.append(menu);
        const rect = anchor.getBoundingClientRect(), x = event?.clientX ?? rect.left, y = event?.clientY ?? rect.bottom,
          bounds = menu.getBoundingClientRect();
        menu.style.position = 'fixed'; menu.style.left = Math.max(8, Math.min(x, innerWidth - (bounds.width || 270) - 8)) + 'px';
        menu.style.top = Math.max(8, Math.min(y, innerHeight - (bounds.height || 360) - 8)) + 'px';
        stopOutside = e => { if (!menu.contains(e.target)) dismissMenu(); };
        document.addEventListener('pointerdown', stopOutside);
        menu.onkeydown = e => { if (e.key === 'Escape') { e.preventDefault(); dismissMenu(); anchor.querySelector('button')?.focus(); } };
        menu.focus();
      }
      function addExtra(spec, save = true) {
        if (added.has(spec.key)) return;
        const header = document.createElement('th'); header.dataset.columnKey = spec.key;
        headers.push(header); labels.push(spec.label); added.add(spec.key);
        addSorter(header, headers.length - 1); addResizeHandle(header, headers.length - 1);
        const newCol = headers.length - 1;
        header.addEventListener('contextmenu', event => { event.preventDefault(); showMenu(newCol, header, event); });
        head.append(header);
        for (const row of Array.from(body.rows)) {
          const spanning = row.querySelector('[colspan]');
          if (spanning) { spanning.colSpan = headers.length; continue; }
          const cell = document.createElement('td'), player = tablePlayer(row), value = player ? spec.value(player) : '';
          cell.textContent = value == null ? '' : String(value);
          const numeric = player && spec.sort(player);
          if (numeric != null && Number.isFinite(Number(numeric))) cell.dataset.key = String(numeric);
          row.append(cell);
        }
        if (save) { persist(); applyVisibility(); phoneBar?.fill(); }
      }
      function reset() {
        for (let col = headers.length - 1; col >= 0; col--) {
          const field = headers[col].dataset.columnKey;
          if (!field) continue;
          headers[col].remove();
          for (const row of Array.from(body.rows)) if (!row.querySelector('[colspan]')) row.cells[col]?.remove();
          headers.splice(col, 1); labels.splice(col, 1); added.delete(field);
        }
        hidden.clear(); for (const label of Object.keys(widths)) delete widths[label];
        for (const header of headers) { header.style.width = ''; }
        for (const row of Array.from(body.rows)) for (const cell of Array.from(row.cells)) cell.style.width = '';
        table.style.width = ''; table.style.tableLayout = '';
        for (const header of headers) { const col = headers.indexOf(header); addSorter(header, col); addResizeHandle(header, col); }
        memory.set(key, { col: Number(table.dataset.initial || 0), dir: table.dataset.direction === 'desc' ? -1 : 1 }); applyVisibility(); phoneBar?.fill();
      }
      for (const header of headers) {
        const col = headers.indexOf(header); addSorter(header, col); addResizeHandle(header, col);
        header.addEventListener('contextmenu', event => { event.preventDefault(); showMenu(col, header, event); });
      }
      for (const spec of extraEnabled) if (added.has(spec.key)) addExtra(spec, false);
      function phoneSortBar() {
        if (table.dataset.phoneSort === 'off' || table.closest('.tl-table-sort')) return;
        if (!table.tBodies[0] || !table.tBodies[0].querySelector('tr:not(.tr-group) td:not([colspan])')) return;
        const bar = document.createElement('div');
        bar.className = 'tl-table-sort';
        const label = document.createElement('label');
        const text = document.createElement('span');
        text.textContent = 'Sort by';
        label.append(text);
        const select = document.createElement('select');
        const dir = document.createElement('button');
        dir.type = 'button';
        const fill = () => {
          select.replaceChildren();
          headers.forEach((header, index) => {
            if (header.hidden) return;
            const option = document.createElement('option');
            option.value = String(index);
            option.textContent = labels[index] || 'Column ' + (index + 1);
            select.append(option);
          });
          const current = memory.get(key) || {};
          select.value = String(current.col ?? 0);
          dir.textContent = current.dir === -1 ? 'High to low' : 'Low to high';
          dir.setAttribute('aria-label', 'Reverse the sort order');
        };
        const run = (col, direction) => {
          persist({ col, dir: direction });
          sortBy(col, direction);
          fill();
        };
        select.onchange = () => run(Number(select.value), (memory.get(key) || {}).dir ?? 1);
        dir.onclick = () => run(Number(select.value), (memory.get(key) || {}).dir === -1 ? 1 : -1);
        label.append(select);
        bar.append(label, dir);
        table.parentElement.insertBefore(bar, table);
        fill();
        return { fill };
      }
      const phoneBar = table.dataset.tlTable === 'cards' ? phoneSortBar() : null;
      const initial = memory.get(key) || { col: Number(table.dataset.initial || 0), dir: table.dataset.direction === 'desc' ? -1 : 1 };
      if (!memory.has(key)) memory.set(key, initial);
      sortBy(initial.col, initial.dir); applyVisibility();
    }
  }
  g.TLTableHeadings = { bind };
})(window);
