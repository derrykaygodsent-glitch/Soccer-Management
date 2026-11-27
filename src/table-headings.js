/* Football-manager-style table columns: ordering, widths, visibility, views.
   One system, every data table. Persisted per career, per screen, per view. */
(function (g) {
  'use strict';

  const STORE = 'touchline.tables.v2';
  const LEGACY = 'touchline.tables.v1';
  const MIN_WIDTH = 44;
  const MAX_WIDTH = 900;

  const readAll = key => {
    try { return JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch { return {}; }
  };
  const writeAll = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage blocked */ }
  };
  const clone = value => JSON.parse(JSON.stringify(value));
  const compare = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  const positions = ['GK', 'DC', 'FB', 'WB', 'DM', 'CM', 'AM', 'W', 'ST'];
  const store = readAll(STORE);

  let openMenu = null, stopOutside = null, openModal = null;
  const dismissMenu = () => {
    if (stopOutside) { document.removeEventListener('pointerdown', stopOutside, true); stopOutside = null; }
    if (openMenu) { openMenu.remove(); openMenu = null; }
  };
  const closeModal = () => { if (openModal) { openModal.remove(); openModal = null; } };

  const playerColumns = [
    ['pace', 'Pace', p => p.attrs?.pace], ['shooting', 'Shooting', p => p.attrs?.shooting],
    ['passing', 'Passing', p => p.attrs?.passing], ['dribbling', 'Dribbling', p => p.attrs?.dribbling],
    ['tackling', 'Tackling', p => p.attrs?.tackling], ['stamina', 'Stamina', p => p.attrs?.stamina],
    ['fitness', 'Fitness', p => Math.round((p.fitness ?? 1) * 100) + '%', p => Math.round((p.fitness ?? 1) * 100)],
    ['rating', 'Match rating', p => p.rating?.toFixed(1) ?? '–', p => p.rating ?? -1],
    ['goals', 'Goals', p => p.stats?.goals ?? 0], ['assists', 'Assists', p => p.stats?.assists ?? 0],
    ['passes', 'Passes', p => p.stats?.passes ?? 0], ['age', 'Age', p => p.age ?? ''],
  ].map(([key, label, value, sort = value]) => ({ key, label, value, sort }));

  const PRESETS = [
    { name: 'Attributes', add: ['pace', 'shooting', 'passing', 'dribbling', 'tackling'] },
    { name: 'Performance', add: ['rating', 'goals', 'assists', 'passes'] },
    { name: 'Physical', add: ['stamina', 'fitness', 'pace'] },
    { name: 'Contract', add: ['age'] },
  ];

  function bind(root, career, page) {
    dismissMenu();
    closeModal();

    for (const table of root.querySelectorAll('table[data-sort-table]')) {
      const head = table.tHead?.rows?.[0], body = table.tBodies?.[0];
      if (!head || !body) continue;

      const tableId = table.dataset.sortTable || 'table';
      const key = [career || 'career', page || 'page', tableId].join('|');
      const extras = table.dataset.columnOptions === 'player' ? playerColumns : [];
      const original = Array.from(head.cells);
      const labels = original.map(cell => cell.textContent.trim());
      const builtins = original.map((cell, index) => ({
        id: 'b' + index,
        label: labels[index] || 'Column ' + (index + 1),
        first: cell.dataset.first,
      }));
      const minWidth = Number(table.dataset.colMin) || MIN_WIDTH;
      const maxWidth = Number(table.dataset.colMax) || MAX_WIDTH;
      const groupRows = () => Array.from(body.rows).filter(row => row.querySelector('[colspan]'));
      const dataRows = () => Array.from(body.rows).filter(row => !row.querySelector('[colspan]'));

      const specOf = id => (id.startsWith('x:') ? extras.find(spec => spec.key === id.slice(2)) : null);

      /* ---------- saved state: one record per table, one layout per view ---------- */
      const defaults = () => {
        const order = builtins.map(item => item.id);
        const base = { order, widths: {}, hidden: [], added: [], sort: { id: builtins[Number(table.dataset.initial || 0)]?.id || order[0], dir: table.dataset.direction === 'desc' ? -1 : 1 } };
        const views = { General: clone(base) };
        if (extras.length) {
          for (const preset of PRESETS) {
            const addable = preset.add.filter(name => extras.some(spec => spec.key === name));
            if (!addable.length) continue;
            const layout = clone(base);
            addable.forEach(name => { if (!layout.order.includes('x:' + name)) { layout.order.push('x:' + name); layout.added.push(name); } });
            views[preset.name] = layout;
          }
        }
        return { active: 'General', views };
      };
      const normalise = record => {
        const clean = clone(record);
        if (!clean.views || !Object.keys(clean.views).length) return defaults();
        if (!clean.active || !clean.views[clean.active]) clean.active = Object.keys(clean.views)[0];
        return clean;
      };

      let record = store[key] ? normalise(store[key]) : null;
      if (!record) {
        const legacy = readAll(LEGACY)[key];
        record = defaults();
        if (legacy) {
          const general = record.views.General;
          if (Array.isArray(legacy.hidden)) general.hidden = legacy.hidden.map(index => 'b' + index).filter(id => builtins.some(item => item.id === id));
          if (legacy.widths) Object.entries(legacy.widths).forEach(([label, width]) => {
            const item = builtins.find(entry => entry.label === label);
            if (item) general.widths[item.id] = width;
          });
          if (legacy.col != null) general.sort.id = 'b' + legacy.col;
          if (legacy.dir != null) general.sort.dir = legacy.dir;
        }
        store[key] = record;
      }
      const save = () => { store[key] = record; writeAll(STORE, store); };
      const view = () => record.views[record.active];
      const customNames = () => Object.keys(record.views).filter(name => !isBuiltinView(name));
      const isBuiltinView = name => name === 'General' || PRESETS.some(preset => preset.name === name);

      /* ---------- column plumbing ---------- */
      const ensureIds = () => {
        Array.from(head.cells).forEach((cell, index) => {
          if (!cell.dataset.colId) cell.dataset.colId = 'b' + index;
        });
        for (const row of dataRows()) {
          let index = 0;
          for (const cell of Array.from(row.cells)) {
            if (cell.hasAttribute('colspan')) continue;
            if (!cell.dataset.colId) cell.dataset.colId = 'b' + index;
            index += 1;
          }
        }
      };
      const headerOf = id => Array.from(head.cells).find(cell => cell.dataset.colId === id);
      const cellOf = (row, id) => Array.from(row.cells).find(cell => cell.dataset.colId === id);
      const visibleIds = () => view().order.filter(id => headerOf(id) && !view().hidden.includes(id));

      function createExtra(spec) {
        const id = 'x:' + spec.key;
        if (headerOf(id)) return headerOf(id);
        const header = document.createElement('th');
        header.dataset.colId = id;
        header.dataset.columnKey = spec.key;
        header.dataset.extra = '1';
        header.append(sortButton(header));
        addResizeHandle(header, id);
        header.addEventListener('contextmenu', event => { event.preventDefault(); showMenu(id, header, event); });
        attachDrag(header);
        head.append(header);
        for (const row of dataRows()) {
          const cell = document.createElement('td');
          cell.dataset.colId = id;
          const player = tablePlayer(row);
          const value = player ? spec.value(player) : '';
          cell.textContent = value == null ? '' : String(value);
          const numeric = player && spec.sort(player);
          if (numeric != null && Number.isFinite(Number(numeric))) cell.dataset.key = String(numeric);
          row.append(cell);
        }
        return header;
      }

      function tablePlayer(row) {
        const id = row.dataset.playerId || row.querySelector('[data-player-id]')?.dataset.playerId;
        return id ? g.TLManagerLife?.pool?.find(player => player.id === id) : null;
      }

      function removeExtra(id) {
        const header = headerOf(id);
        if (!header || !header.dataset.extra) return;
        header.remove();
        for (const row of dataRows()) cellOf(row, id)?.remove();
      }

      /* ---------- order, width, visibility ---------- */
      function applyOrder(ids) {
        const ordered = ids.filter(id => headerOf(id));
        for (const id of ordered) head.append(headerOf(id));
        for (const row of dataRows()) for (const id of ordered) { const cell = cellOf(row, id); if (cell) row.append(cell); }
        view().order = ordered.slice();
      }

      /* Widths stay exact: every visible column is pinned in pixels, so resizing one
         column never re-flows its neighbours. The last visible column absorbs the
         spare width once, when the layout is first pinned. */
      const natural = {};
      function cloneMeasure(id) {
        const host = table.parentElement;
        if (!host) return 0;
        const clone = table.cloneNode(true);
        clone.removeAttribute('id');
        clone.removeAttribute('style');
        /* keep [data-sort-table] so the measuring clone inherits the real th/td padding */
        clone.dataset.sortTable = '';
        clone.style.cssText = 'position:absolute;left:-20000px;top:0;visibility:hidden;pointer-events:none;table-layout:auto;width:auto;min-width:0;max-width:none;margin:0;';
        for (const section of [clone.tHead, ...Array.from(clone.tBodies || [])]) {
          if (!section) continue;
          for (const row of Array.from(section.rows)) {
            const cells = Array.from(row.cells);
            if (cells.some(cell => cell.hasAttribute('colspan'))) { row.remove(); continue; }
            for (const cell of cells) {
              if (cell.dataset.colId !== id) { cell.remove(); continue; }
              cell.removeAttribute('style');
              cell.hidden = false;
              for (const node of cell.querySelectorAll('[hidden]')) node.hidden = false;
            }
          }
        }
        /* percentage-wide sort buttons collapse to zero max-content inside a
           shrink-to-fit clone, so let the heading measure its own text */
        for (const button of clone.querySelectorAll('th .column-sort')) { button.style.width = 'auto'; button.style.display = 'inline-block'; }
        for (const label of clone.querySelectorAll('th .tl-col-label')) { label.style.overflow = 'visible'; label.style.textOverflow = 'clip'; }
        host.append(clone);
        const width = clone.getBoundingClientRect().width;
        clone.remove();
        return Math.round(width);
      }

      function naturalOf(id) {
        if (natural[id]) return natural[id];
        const header = headerOf(id);
        let width = 0;
        if (header && table.style.tableLayout !== 'fixed' && !header.hidden) width = Math.round(header.getBoundingClientRect().width);
        if (!width) width = cloneMeasure(id) + 6;
        if (!width) width = 96;
        natural[id] = Math.max(minWidth, Math.min(maxWidth, width));
        return natural[id];
      }

      function seedNatural() {
        if (table.style.tableLayout === 'fixed') return;
        for (const header of Array.from(head.cells)) {
          const id = header.dataset.colId;
          if (header.hidden) continue;
          const width = Math.round(header.getBoundingClientRect().width);
          if (width >= minWidth) natural[id] = Math.min(maxWidth, width);
        }
      }

      const effectiveWidth = id => {
        const stored = view().widths[id];
        return Math.max(minWidth, Math.min(maxWidth, Math.round(stored || naturalOf(id))));
      };

      function clearWidths() {
        table.style.tableLayout = '';
        table.style.width = '';
        table.style.minWidth = '';
        for (const header of Array.from(head.cells)) header.style.width = '';
      }

      function applyWidths({ refill = false } = {}) {
        const layout = view();
        for (const header of Array.from(head.cells)) header.style.position = 'relative';
        if (!Object.keys(layout.widths).length) { clearWidths(); labelTruncation(); return; }
        const visible = visibleIds();
        if (!visible.length) { clearWidths(); labelTruncation(); return; }
        const widths = {};
        for (const id of visible) widths[id] = effectiveWidth(id);
        /* once a layout is pinned every shown column keeps an explicit width, so a
           reload or a re-render can never drift from what the user set up */
        for (const id of visible) layout.widths[id] = widths[id];
        const tableWidth = Math.max(120, visible.reduce((sum, id) => sum + widths[id], 0));
        table.style.tableLayout = 'fixed';
        table.style.width = tableWidth + 'px';
        table.style.minWidth = tableWidth + 'px';
        for (const header of Array.from(head.cells)) {
          const width = widths[header.dataset.colId];
          header.style.width = width ? Math.round(width) + 'px' : '';
        }
        labelTruncation();
      }

      function applyVisibility() {
        const layout = view();
        for (const header of Array.from(head.cells)) header.hidden = layout.hidden.includes(header.dataset.colId);
        for (const row of groupRows()) { const span = row.querySelector('[colspan]'); if (span) span.colSpan = Math.max(1, visibleIds().length); }
        for (const row of dataRows()) for (const cell of Array.from(row.cells)) cell.hidden = layout.hidden.includes(cell.dataset.colId);
        applyWidths({ refill: true });
        phoneBar?.fill();
      }

      function labelTruncation() {
        for (const header of Array.from(head.cells)) {
          const button = header.querySelector('.column-sort');
          if (!button || header.hidden) { header.removeAttribute('title'); continue; }
          const text = (button.textContent || '').trim();
          const clipped = button.scrollWidth > button.clientWidth + 1;
          header.title = clipped ? text : '';
          button.title = (clipped ? text + ' · ' : '') + 'Sort by ' + text;
        }
        for (const row of dataRows()) {
          for (const cell of Array.from(row.cells)) {
            if (cell.hidden || cell.querySelector('input,select,button')) { cell.removeAttribute('title'); continue; }
            const text = (cell.textContent || '').trim();
            if (!text) { cell.removeAttribute('title'); continue; }
            if (cell.scrollWidth > cell.clientWidth + 1) cell.title = text;
            else cell.removeAttribute('title');
          }
        }
      }

      function sortBy(id, dir) {
        const layout = view();
        layout.sort = { id, dir };
        for (const header of Array.from(head.cells)) {
          if (header.dataset.colId === id) header.setAttribute('aria-sort', dir === 1 ? 'ascending' : 'descending');
          else header.removeAttribute('aria-sort');
        }
        const groups = [];
        let group = [];
        for (const row of Array.from(body.rows)) {
          if (row.querySelector('[colspan]')) { if (group.length) groups.push(group); group = []; }
          else group.push(row);
        }
        if (group.length) groups.push(group);
        for (const rows of groups) {
          const end = rows[rows.length - 1].nextSibling;
          const value = row => {
            const cell = cellOf(row, id);
            if (!cell) return '';
            const spec = specOf(id);
            if (spec) { const player = tablePlayer(row); return player ? spec.sort(player) : ''; }
            if (id.startsWith('b') && (labels[Number(id.slice(1))] || '') === 'Position') return positions.indexOf(cell.textContent.trim());
            return cell.querySelector('input,select')?.value ?? cell.dataset.key ?? cell.textContent.trim();
          };
          rows.sort((a, b) => {
            const x = value(a), y = value(b);
            return (x !== '' && y !== '' && Number.isFinite(+x) && Number.isFinite(+y) ? Number(x) - Number(y) : compare.compare(String(x), String(y))) * dir;
          });
          for (const row of rows) body.insertBefore(row, end);
        }
      }

      function render({ reorder = false } = {}) {
        const layout = view();
        /* an extra column only exists while it is added, so it can never stay hidden */
        layout.hidden = layout.hidden.filter(id => !id.startsWith('x:') || layout.added.includes(id.slice(2)));
        for (const name of layout.added) { const spec = extras.find(entry => entry.key === name); if (spec) createExtra(spec); }
        for (const header of Array.from(head.cells)) { const id = header.dataset.colId; if (id.startsWith('x:') && !layout.added.includes(id.slice(2))) removeExtra(id); }
        const known = Array.from(head.cells).map(cell => cell.dataset.colId);
        const order = layout.order.filter(id => known.includes(id));
        for (const id of known) if (!order.includes(id)) order.push(id);
        applyOrder(order);
        applyVisibility();
        sortBy(layout.sort.id, layout.sort.dir);
        viewBar?.fill();
      }

      /* ---------- header controls ---------- */
      function sortButton(header) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'column-sort';
        const label = document.createElement('span');
        label.className = 'tl-col-label';
        label.textContent = header.dataset.colId?.startsWith('x:')
          ? (specOf(header.dataset.colId)?.label || '')
          : labels[Number(header.dataset.colId?.slice(1))] || header.textContent.trim();
        button.append(label);
        button.onclick = () => {
          const layout = view(), id = header.dataset.colId;
          const dir = layout.sort.id === id ? -layout.sort.dir : header.dataset.first === 'desc' ? -1 : 1;
          sortBy(id, dir);
          save();
          button.title = 'Sort by ' + button.textContent;
        };
        button.onkeydown = event => {
          if ((event.shiftKey && event.key === 'F10') || event.key === 'ContextMenu') { event.preventDefault(); showMenu(header.dataset.colId, header); }
        };
        button.title = 'Sort by ' + button.textContent;
        return button;
      }

      function addResizeHandle(header, id) {
        const handle = document.createElement('span');
        handle.className = 'table-column-resizer';
        handle.tabIndex = 0;
        handle.setAttribute('role', 'separator');
        handle.setAttribute('aria-orientation', 'vertical');
        handle.setAttribute('aria-label', 'Resize ' + (header.textContent.trim() || 'column') + ' column');
        handle.addEventListener('pointerdown', event => event.stopPropagation());
        const baseWidth = () => Math.max(minWidth, Math.round(header.getBoundingClientRect().width || 100));
        const pin = () => { if (!Object.keys(view().widths).length) { seedNatural(); applyWidths({ refill: true }); } };
        handle.onkeydown = event => {
          if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
          pin();
          const layout = view();
          const current = effectiveWidth(id);
          layout.widths[id] = Math.max(minWidth, Math.min(maxWidth, current + (event.key === 'ArrowRight' ? 10 : -10)));
          applyWidths(); save(); event.preventDefault();
        };
        handle.onpointerdown = event => {
          if (event.button !== 0) return;
          event.preventDefault(); event.stopPropagation();
          pin();
          const startX = event.clientX, startWidth = baseWidth();
          document.body.classList.add('resizing-table-column');
          const move = e => {
            const layout = view();
            layout.widths[id] = Math.max(minWidth, Math.min(maxWidth, Math.round(startWidth + e.clientX - startX)));
            applyWidths();
          };
          const up = () => {
            document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up);
            document.body.classList.remove('resizing-table-column');
            save();
          };
          document.addEventListener('pointermove', move); document.addEventListener('pointerup', up);
        };
        handle.ondblclick = event => { event.preventDefault(); event.stopPropagation(); autoFit(id); };
        header.append(handle);
      }

      function autoFit(id) {
        const header = headerOf(id);
        if (!header) return;
        const layout = view();
        if (!Object.keys(layout.widths).length) seedNatural();
        const measured = cloneMeasure(id) || Math.round(header.getBoundingClientRect().width) || 96;
        natural[id] = Math.max(minWidth, Math.min(maxWidth, measured + 6));
        layout.widths[id] = natural[id];
        applyWidths();
        save();
      }

      /* ---------- drag to reorder ---------- */
      let dragState = null;
      function attachDrag(header) {
        header.addEventListener('pointerdown', event => {
          if (event.button !== 0) return;
          if (event.target.closest('.table-column-resizer')) return;
          const startX = event.clientX, startY = event.clientY;
          let dragging = false;
          const indicator = document.createElement('div');
          indicator.className = 'tl-col-drop';
          const move = e => {
            if (!dragging) {
              if (Math.abs(e.clientX - startX) < 6 && Math.abs(e.clientY - startY) < 6) return;
              dragging = true;
              header.classList.add('tl-col-drag-source');
              document.body.classList.add('tl-col-dragging');
              document.body.append(indicator);
              header.setPointerCapture?.(event.pointerId);
            }
            const ids = visibleIds();
            const cells = ids.map(id => headerOf(id)).filter(Boolean);
            let target = cells.length;
            cells.forEach((cell, index) => {
              const rect = cell.getBoundingClientRect();
              if (e.clientX > rect.left + rect.width / 2) target = Math.max(target === cells.length ? index + 1 : target, index + 1);
            });
            if (e.clientX < cells[0]?.getBoundingClientRect().left) target = 0;
            dragState = { id: header.dataset.colId, target };
            const anchor = cells[Math.min(target, cells.length - 1)];
            const rect = anchor?.getBoundingClientRect();
            if (rect) {
              const x = target >= cells.length ? rect.right : rect.left;
              indicator.style.cssText = `position:fixed;left:${Math.round(x - 1)}px;top:${Math.round(rect.top)}px;height:${Math.round(rect.height)}px;`;
            }
          };
          const up = () => {
            document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up);
            indicator.remove();
            document.body.classList.remove('tl-col-dragging');
            header.classList.remove('tl-col-drag-source');
            if (dragging && dragState) {
              const layout = view();
              const ids = layout.order.filter(id => headerOf(id));
              const from = ids.indexOf(dragState.id);
              const visible = ids.filter(id => !layout.hidden.includes(id));
              const anchorId = visible[dragState.target];
              ids.splice(from, 1);
              let to;
              if (dragState.target >= visible.length) to = ids.length;
              else if (anchorId === dragState.id) to = from;
              else {
                const anchorIndex = ids.indexOf(anchorId);
                to = anchorIndex < 0 ? ids.length : dragState.target > from ? anchorIndex + 1 : anchorIndex;
                if (dragState.target > from) to = Math.min(to, ids.length);
              }
              ids.splice(Math.max(0, Math.min(ids.length, to)), 0, dragState.id);
              layout.order = ids;
              save();
              render({ reorder: true });
              viewBar?.fill();
            }
            dragState = null;
          };
          document.addEventListener('pointermove', move);
          document.addEventListener('pointerup', up);
        });
      }

      /* ---------- context menu ---------- */
      function menuItem(text, action, disabled = false) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = text;
        button.disabled = disabled;
        button.onclick = () => { if (button.disabled) return; action(); dismissMenu(); };
        openMenu.append(button);
      }

      function availableExtras() {
        const layout = view();
        return extras.filter(spec => !headerOf('x:' + spec.key) && !layout.added.includes(spec.key));
      }

      function insertExtraAt(spec, index) {
        const layout = view();
        if (!layout.added.includes(spec.key)) layout.added.push(spec.key);
        createExtra(spec);
        const ids = layout.order.filter(id => headerOf(id));
        const id = 'x:' + spec.key;
        ids.splice(Math.max(0, Math.min(ids.length, index)), 0, id);
        layout.order = ids;
        save(); render(); viewBar?.fill();
      }

      function showMenu(id, anchor, event) {
        dismissMenu();
        const layout = view();
        const header = headerOf(id);
        const label = header?.querySelector('.column-sort')?.textContent?.trim() || header?.textContent?.trim() || 'column';
        const visible = visibleIds();
        const position = visible.indexOf(id);
        const menu = document.createElement('div');
        menu.className = 'table-context-menu tl-col-menu';
        menu.setAttribute('role', 'menu');
        menu.tabIndex = -1;
        openMenu = menu;
        const title = document.createElement('strong');
        title.textContent = label;
        menu.append(title);
        menuItem('Hide column', () => { if (visible.length > 1) { layout.hidden.push(id); save(); render(); } }, visible.length <= 1);
        const extrasLeft = availableExtras();
        if (extrasLeft.length) {
          const before = document.createElement('small'); before.textContent = 'Insert before'; menu.append(before);
          for (const spec of extrasLeft) menuItem(spec.label, () => insertExtraAt(spec, Math.max(0, position)));
          const after = document.createElement('small'); after.textContent = 'Insert after'; menu.append(after);
          for (const spec of extrasLeft) menuItem(spec.label, () => insertExtraAt(spec, Math.max(0, position) + 1));
        } else {
          menuItem('Insert column', () => manage(), false);
        }
        menuItem('Auto-fit column', () => autoFit(id));
        menuItem('Reset column width', () => { delete layout.widths[id]; save(); applyWidths(); });
        const rule = document.createElement('small'); rule.textContent = 'Columns'; menu.append(rule);
        menuItem('Manage columns…', () => manage());
        menuItem('Reset columns and widths', () => resetAll(true));
        document.body.append(menu);
        const rect = anchor.getBoundingClientRect();
        const x = event?.clientX ?? rect.left, y = event?.clientY ?? rect.bottom;
        const bounds = menu.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.left = Math.max(8, Math.min(x, innerWidth - (bounds.width || 240) - 8)) + 'px';
        menu.style.top = Math.max(8, Math.min(y, innerHeight - (bounds.height || 320) - 8)) + 'px';
        stopOutside = e => { if (!menu.contains(e.target)) dismissMenu(); };
        document.addEventListener('pointerdown', stopOutside, true);
        menu.onkeydown = e => {
          if (e.key === 'Escape') { e.preventDefault(); dismissMenu(); anchor.querySelector('button')?.focus(); }
        };
        menu.focus();
      }

      /* ---------- manage columns ---------- */
      function manage() {
        dismissMenu();
        closeModal();
        const layout = view();
        const all = builtins.map(item => ({ id: item.id, label: item.label }))
          .concat(extras.map(spec => ({ id: 'x:' + spec.key, label: spec.label })));
        const seeded = layout.order.filter(id => all.some(item => item.id === id))
          .map(id => ({ ...all.find(item => item.id === id), visible: !layout.hidden.includes(id) && !!headerOf(id) }));
        for (const item of all) if (!seeded.some(entry => entry.id === item.id)) seeded.push({ ...item, visible: false });
        const draft = seeded.map(item => ({ ...item }));
        const overlay = document.createElement('div');
        overlay.className = 'tl-col-overlay';
        overlay.innerHTML = `<div class="tl-col-modal" role="dialog" aria-modal="true" aria-label="Manage columns">
          <header><h3>Manage columns</h3><button type="button" class="tl-col-close" aria-label="Close">×</button></header>
          <div class="tl-col-search"><input type="search" placeholder="Search columns" aria-label="Search columns"></div>
          <div class="tl-col-body">
            <section class="tl-col-pane"><h4>Visible</h4><ul class="tl-col-visible" aria-label="Visible columns"></ul></section>
            <section class="tl-col-pane"><h4>Available</h4><ul class="tl-col-available" aria-label="Available columns"></ul></section>
          </div>
          <footer><button type="button" class="tl-col-restore">Restore defaults</button><span class="tl-col-spacer"></span><button type="button" class="tl-col-cancel">Cancel</button><button type="button" class="tl-col-apply">Apply</button></footer>
        </div>`;
        document.body.append(overlay);
        openModal = overlay;
        const visibleList = overlay.querySelector('.tl-col-visible');
        const availableList = overlay.querySelector('.tl-col-available');
        const search = overlay.querySelector('input');
        let dragId = null;

        const draw = () => {
          const query = search.value.trim().toLowerCase();
          visibleList.replaceChildren();
          availableList.replaceChildren();
          for (const item of draft) {
            if (query && !item.label.toLowerCase().includes(query)) continue;
            const li = document.createElement('li');
            li.draggable = item.visible;
            li.dataset.id = item.id;
            li.classList.toggle('is-hidden', !item.visible);
            const handle = document.createElement('span');
            handle.className = 'tl-col-grip';
            handle.setAttribute('aria-hidden', 'true');
            handle.textContent = '⋮⋮';
            const name = document.createElement('span');
            name.className = 'tl-col-name';
            name.textContent = item.label;
            const toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'tl-col-toggle';
            toggle.textContent = item.visible ? 'Remove' : 'Add';
            toggle.setAttribute('aria-label', (item.visible ? 'Hide ' : 'Show ') + item.label);
            toggle.onclick = () => { item.visible = !item.visible; draw(); };
            li.append(handle, name, toggle);
            li.addEventListener('dragstart', () => { dragId = item.id; li.classList.add('dragging'); });
            li.addEventListener('dragend', () => { dragId = null; li.classList.remove('dragging'); });
            li.addEventListener('dragover', event => { if (dragId) event.preventDefault(); });
            li.addEventListener('drop', event => {
              event.preventDefault();
              if (!dragId || dragId === item.id) return;
              const from = draft.findIndex(entry => entry.id === dragId);
              const to = draft.findIndex(entry => entry.id === item.id);
              if (from < 0 || to < 0) return;
              const [moved] = draft.splice(from, 1);
              draft.splice(to, 0, moved);
              draw();
            });
            (item.visible ? visibleList : availableList).append(li);
          }
          if (!visibleList.children.length) {
            const empty = document.createElement('li');
            empty.className = 'tl-col-empty';
            empty.textContent = 'No columns';
            visibleList.append(empty);
          }
          if (!availableList.children.length) {
            const empty = document.createElement('li');
            empty.className = 'tl-col-empty';
            empty.textContent = 'No columns';
            availableList.append(empty);
          }
        };
        search.oninput = draw;
        overlay.querySelector('.tl-col-close').onclick = closeModal;
        overlay.querySelector('.tl-col-cancel').onclick = closeModal;
        overlay.querySelector('.tl-col-restore').onclick = () => {
          const fresh = defaults().views.General;
          draft.length = 0;
          all.forEach(item => draft.push({ ...item, visible: fresh.order.includes(item.id) && !fresh.hidden.includes(item.id) }));
          draft.sort((a, b) => {
            const ai = fresh.order.indexOf(a.id), bi = fresh.order.indexOf(b.id);
            return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
          });
          draw();
        };
        overlay.querySelector('.tl-col-apply').onclick = () => {
          const ids = draft.map(item => item.id);
          const visible = draft.filter(item => item.visible).map(item => item.id);
          if (!visible.length) draft[0].visible = true;
          layout.order = ids;
          layout.hidden = ids.filter(id => !visible.includes(id));
          /* only columns that are actually shown exist in the DOM; the rest stay available */
          layout.added = visible.filter(id => id.startsWith('x:')).map(id => id.slice(2));
          layout.hidden = layout.hidden.filter(id => !id.startsWith('x:'));
          save();
          render();
          viewBar?.fill();
          closeModal();
        };
        overlay.addEventListener('pointerdown', event => { if (event.target === overlay) closeModal(); });
        overlay.addEventListener('keydown', event => { if (event.key === 'Escape') closeModal(); });
        draw();
        search.focus();
      }

      /* ---------- views ---------- */
      function resetAll(silent) {
        const fresh = defaults();
        record = { active: 'General', views: fresh.views };
        save();
        for (const header of Array.from(head.cells)) { if (header.dataset.extra) removeExtra(header.dataset.colId); }
        render();
        viewBar?.fill();
        if (!silent) phoneBar?.fill();
      }

      function setView(name) {
        if (!record.views[name]) return;
        record.active = name;
        save();
        render();
        viewBar?.fill();
      }

      function addView(name) {
        const clean = String(name || '').trim().slice(0, 28);
        if (!clean || record.views[clean]) return false;
        record.views[clean] = clone(view());
        record.active = clean;
        save();
        render();
        viewBar?.fill();
        return true;
      }

      let viewBar = null;
      function buildViewBar() {
        if (table.dataset.tlTable === 'cards' && !table.closest('.tl-col-wrap')) { /* still wrap */ }
        const bar = document.createElement('div');
        bar.className = 'tl-col-views';
        bar.innerHTML = `<label class="tl-col-views-label"><span>View</span><select class="tl-col-view-select" aria-label="Table view"></select></label>
          <button type="button" class="tl-col-btn" data-col-view="new">New view</button>
          <button type="button" class="tl-col-btn" data-col-view="manage">Manage columns</button>
          <button type="button" class="tl-col-btn tl-col-more" data-col-view="more" aria-haspopup="menu" aria-label="View options">⋯</button>`;
        table.parentElement.insertBefore(bar, table);
        const select = bar.querySelector('select');
        const wrap = bar;
        const fill = () => {
          select.replaceChildren();
          for (const name of Object.keys(record.views)) {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            select.append(option);
          }
          select.value = record.active;
          wrap.classList.toggle('is-custom', !isBuiltinView(record.active));
        };
        select.onchange = () => setView(select.value);
        bar.querySelector('[data-col-view="new"]').onclick = () => {
          const form = document.createElement('form');
          form.className = 'tl-col-inline';
          form.innerHTML = '<input type="text" maxlength="28" placeholder="View name" aria-label="New view name"><button type="submit">Save</button><button type="button" data-cancel>Cancel</button>';
          bar.append(form);
          const input = form.querySelector('input');
          input.focus();
          form.onsubmit = event => {
            event.preventDefault();
            if (addView(input.value)) form.remove();
            else input.select();
          };
          form.querySelector('[data-cancel]').onclick = () => form.remove();
        };
        bar.querySelector('[data-col-view="manage"]').onclick = () => manage();
        bar.querySelector('[data-col-view="more"]').onclick = event => {
          dismissMenu();
          const menu = document.createElement('div');
          menu.className = 'table-context-menu tl-col-menu';
          menu.setAttribute('role', 'menu');
          openMenu = menu;
          const head = document.createElement('strong');
          head.textContent = record.active;
          menu.append(head);
          const action = (text, run, disabled) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = text;
            button.disabled = !!disabled;
            button.onclick = () => { run(); dismissMenu(); };
            menu.append(button);
          };
          action('Rename view', () => {
            const next = prompt('Rename view', record.active);
            const clean = String(next || '').trim().slice(0, 28);
            if (!clean || clean === record.active || record.views[clean]) return;
            record.views[clean] = record.views[record.active];
            delete record.views[record.active];
            record.active = clean;
            save(); render(); fill();
          }, isBuiltinView(record.active));
          action('Duplicate view', () => {
            let name = record.active + ' copy';
            let n = 2;
            while (record.views[name]) name = record.active + ' copy ' + n++;
            record.views[name] = clone(view());
            record.active = name;
            save(); render(); fill();
          });
          action('Delete view', () => {
            delete record.views[record.active];
            record.active = Object.keys(record.views)[0] || 'General';
            if (!record.views[record.active]) record = defaults();
            save(); render(); fill();
          }, !customNames().length);
          action('Save changes to this view', () => { save(); });
          action('Reset this view', () => { record.views[record.active] = clone(defaults().views.General); save(); render(); fill(); });
          document.body.append(menu);
          const rect = event.currentTarget.getBoundingClientRect();
          menu.style.position = 'fixed';
          menu.style.left = Math.max(8, Math.min(rect.left, innerWidth - 260)) + 'px';
          menu.style.top = Math.min(rect.bottom + 4, innerHeight - 320) + 'px';
          stopOutside = e => { if (!menu.contains(e.target)) dismissMenu(); };
          document.addEventListener('pointerdown', stopOutside, true);
        };
        fill();
        return { fill };
      }

      /* ---------- phone sort bar (existing behaviour) ---------- */
      function phoneSortBar() {
        if (table.dataset.phoneSort === 'off' || table.closest('.tl-table-sort')) return null;
        if (!body.querySelector('tr:not(.tr-group) td:not([colspan])')) return null;
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
          visibleIds().forEach(id => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = headerOf(id)?.querySelector('.column-sort')?.textContent || 'Column';
            select.append(option);
          });
          select.value = view().sort.id;
          dir.textContent = view().sort.dir === -1 ? 'High to low' : 'Low to high';
          dir.setAttribute('aria-label', 'Reverse the sort order');
        };
        select.onchange = () => { sortBy(select.value, view().sort.dir); save(); fill(); };
        dir.onclick = () => { sortBy(select.value, view().sort.dir === -1 ? 1 : -1); save(); fill(); };
        label.append(select);
        bar.append(label, dir);
        table.parentElement.insertBefore(bar, table);
        fill();
        return { fill };
      }

      /* ---------- boot ---------- */
      clearWidths();
      ensureIds();
      for (const header of Array.from(head.cells)) {
        const id = header.dataset.colId;
        header.style.position = 'relative';
        const button = header.querySelector('button');
        if (button && button.classList.contains('column-sort')) { /* already wired by previous pass */ }
        header.replaceChildren(sortButton(header));
        addResizeHandle(header, id);
        if (!header._tlMenu) {
          header._tlMenu = true;
          header.addEventListener('contextmenu', event => { event.preventDefault(); showMenu(id, header, event); });
          attachDrag(header);
        }
      }
      seedNatural();
      const phoneBar = table.dataset.tlTable === 'cards' ? phoneSortBar() : null;
      viewBar = buildViewBar();
      render();
    }
  }

  g.TLTableHeadings = { bind };
  if (typeof module !== 'undefined') module.exports = g.TLTableHeadings;
})(typeof window === 'undefined' ? globalThis : window);
