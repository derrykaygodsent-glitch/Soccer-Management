const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

class Element {
  constructor(text = '', tagName = 'DIV') {
    this._text = text; this.tagName = tagName; this.dataset = {}; this.attributes = {};
    this.children = []; this.hidden = false; this.disabled = false; this.style = {};
    this.listeners = {}; const classes = new Set(); this.classList = { add: value => classes.add(value), remove: value => classes.delete(value), contains: value => classes.has(value), toggle: (value, force) => { if (force === false) classes.delete(value); else classes.add(value); } };
  }
  get textContent() { return this.children.length ? this.children.map(x => x.textContent || x.nodeValue || '').join('') : this._text; }
  set textContent(value) { this._text = String(value); this.children = []; }
  append(...nodes) {
    for (const node of nodes) {
      const i = this.children.indexOf(node); if (i >= 0) this.children.splice(i, 1);
      this.children.push(node); node.parentNode = this;
      if (this.cells) { const j = this.cells.indexOf(node); if (j >= 0) this.cells.splice(j, 1); this.cells.push(node); }
    }
  }
  before() {}
  replaceChildren(...nodes) { this.children = nodes; for (const node of nodes) node.parentNode = this; }
  setAttribute(name, value) { this.attributes[name] = value; }
  getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null; }
  hasAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attributes, name); }
  removeAttribute(name) { delete this.attributes[name]; }
  addEventListener(name, fn) { this.listeners[name] = fn; }
  insertBefore(node, before) {
    const index = before ? this.children.indexOf(before) : -1;
    this.children.splice(index < 0 ? this.children.length : index, 0, node);
    node.parentNode = this;
    return node;
  }
  cloneNode() { const copy = new Element(this._text, this.tagName); copy.dataset = { ...this.dataset }; return copy; }
  get innerHTML() { return this._html || ''; }
  set innerHTML(value) { this._html = String(value); this.children = []; }
  querySelectorAll() { return []; }
  querySelector(selector) {
    if (selector === '[colspan]') return this.colSpan ? this : null;
    if (selector === 'tr:not(.tr-group) td:not([colspan])') return null;
    if (selector === 'input,select,button') return null;
    if (selector === 'button') return this.children.find(x => x.tagName === 'BUTTON') || null;
    if (selector === '.column-sort') return this.children.find(x => x.className === 'column-sort') || null;
    this._queried = this._queried || {};
    if (!this._queried[selector]) this._queried[selector] = new Element('', 'FAKE');
    return this._queried[selector];
  }
  closest() { return null; }
  getBoundingClientRect() { return { width: Number.parseFloat(this.style.width) || 100, left: 10, bottom: 20 }; }
  focus() {}
  contains(node) { return this === node || this.children.some(child => child.contains?.(node)); }
  remove() {
    const siblings = this.parentNode?.children;
    if (siblings) { const i = siblings.indexOf(this); if (i >= 0) siblings.splice(i, 1); }
    const cells = this.parentNode?.cells;
    if (cells) { const i = cells.indexOf(this); if (i >= 0) cells.splice(i, 1); }
  }
}

function fixture() {
  const headers = ['Club', 'Played', 'Points'].map(label => new Element(label, 'TH'));
  const rows = [
    ['North', '8', '17'],
    ['South', '8', '12'],
  ].map((values, i) => {
    const row = new Element('', 'TR'); row.dataset.playerId = i ? 'p2' : 'p1';
    row.cells = values.map(value => new Element(value, 'TD'));
    return row;
  });
  const body = {
    rows,
    insertBefore(row, before) {
      const index = rows.indexOf(row); if (index >= 0) rows.splice(index, 1);
      const target = before == null ? -1 : rows.indexOf(before);
      rows.splice(target < 0 ? rows.length : target, 0, row);
    },
  };
  for (const row of rows) Object.defineProperty(row, 'nextSibling', { get() { return rows[rows.indexOf(row) + 1] || null; } });
  const head = { cells: headers, append(node) { const i = headers.indexOf(node); if (i >= 0) headers.splice(i, 1); headers.push(node); node.parentNode = head; } };
  const table = new Element('', 'TABLE');
  table.dataset = { sortTable: 'scouting', columnOptions: 'player' };
  table.tHead = { rows: [head] }; table.tBodies = [body];
  const panel = new Element('', 'DIV');
  panel.className = 'panel';
  panel.append(table);
  table.parentElement = panel;
  return { table, headers, body, rows, panel };
}

function harness() {
  const document = { listeners: {}, body: new Element('', 'BODY') };
  const bodyClasses = new Set();
  document.body.classList = { add: value => bodyClasses.add(value), remove: value => bodyClasses.delete(value), contains: value => bodyClasses.has(value) };
  document.createElement = name => new Element('', name.toUpperCase());
  const storage = new Map();
  const localStorage = {
    getItem: key => (storage.has(key) ? storage.get(key) : null),
    setItem: (key, value) => storage.set(key, String(value)),
  };
  document.createDocumentFragment = () => new Element();
  document.addEventListener = (name, fn) => { document.listeners[name] = fn; };
  document.removeEventListener = name => { delete document.listeners[name]; };
  const window = { TLManagerLife: { pool: [
    { id: 'p1', attrs: { pace: 80 }, value: 100, stats: {} },
    { id: 'p2', attrs: { pace: 65 }, value: 80, stats: {} },
  ], money: n => '£' + n } };
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/table-headings.js'), 'utf8'), {
    window, document, Intl, innerWidth: 1000, innerHeight: 800, localStorage,
  });
  return { document, headings: window.TLTableHeadings, bodyClasses, storage };
}

test('column menu inserts, hides and resets player columns; rows stay with their headings', () => {
  const { table, headers, rows, panel } = fixture(), { document, headings } = harness();
  headings.bind({ querySelectorAll: () => [table] }, 'career', 'scouting');
  assert.equal(rows.length, 2);
  assert.equal(panel.children[0].className, 'tl-col-views', 'the view bar sits above the table');

  headers[1].listeners.contextmenu({ preventDefault() {}, clientX: 40, clientY: 50 });
  const menu = document.body.children[0];
  const items = menu.children.map(item => item.textContent);
  assert.ok(items.includes('Pace'), 'context menu offers available player-stat columns');
  assert.ok(items.includes('Hide column') && items.includes('Auto-fit column'), 'menu offers the column commands');
  assert.ok(items.includes('Reset columns and widths'));

  menu.children.find(item => item.textContent === 'Pace').onclick();
  assert.equal(headers.length, 4);
  assert.equal(headers[1].textContent, 'Pace', 'insert places the column where it was asked for');
  assert.equal(rows[0].cells[1].textContent, '80');
  assert.equal(rows[1].cells[1].textContent, '65');
  assert.equal(rows[0].cells[2].textContent, '8', 'row data moves with its heading');
  assert.equal(rows.length, 2);

  headers[1].listeners.contextmenu({ preventDefault() {}, clientX: 40, clientY: 50 });
  document.body.children[0].children.find(item => item.textContent === 'Hide column').onclick();
  assert.equal(headers[1].hidden, true);
  assert.equal(rows[0].cells[1].hidden, true, 'hidden columns drop their data cells too');

  headers[1].listeners.contextmenu({ preventDefault() {}, clientX: 40, clientY: 50 });
  document.body.children[0].children.find(item => item.textContent === 'Reset columns and widths').onclick();
  assert.equal(headers.length, 3, 'reset removes added columns');
  assert.equal(rows[0].cells.length, 3);
  assert.equal(rows.length, 2);
});

test('a pinned column width only moves that column and is persisted per view', () => {
  const { table, headers } = fixture(), { document, headings, bodyClasses, storage } = harness();
  headings.bind({ querySelectorAll: () => [table] }, 'career-resize', 'scouting');
  const handle = headers[1].children.at(-1);
  handle.onpointerdown({ button: 0, clientX: 10, preventDefault() {}, stopPropagation() {} });
  document.listeners.pointermove({ clientX: 35 });
  assert.equal(headers[1].style.width, '125px');
  assert.equal(headers[0].style.width, '100px', 'neighbouring columns keep the width they had');
  assert.equal(headers[2].style.width, '100px');
  document.listeners.pointerup();
  assert.equal(table.style.tableLayout, 'fixed');
  assert.equal(bodyClasses.has('resizing-table-column'), false);

  const record = JSON.parse(storage.get('touchline.tables.v2'))['career-resize|scouting|scouting'];
  assert.equal(record.views.General.widths.b1, 125, 'the width is stored on the active view');
  assert.equal(record.active, 'General');
});

test('views keep their own column setup and presets stay available', () => {
  const { table, headers, panel } = fixture(), { document, headings, storage } = harness();
  headings.bind({ querySelectorAll: () => [table] }, 'career-views', 'scouting');
  headers[1].listeners.contextmenu({ preventDefault() {}, clientX: 40, clientY: 50 });
  document.body.children[0].children.find(item => item.textContent === 'Pace').onclick();

  const store = () => JSON.parse(storage.get('touchline.tables.v2'))['career-views|scouting|scouting'];
  assert.deepEqual(store().views.General.added, ['pace'], 'General records the added column');
  assert.deepEqual(store().views.General.hidden, []);

  const select = panel.children[0].querySelector('select');
  select.value = 'Attributes';
  select.onchange();
  assert.equal(store().active, 'Attributes');
  assert.deepEqual(store().views.General.added, ['pace'], 'another view does not rewrite General');
  assert.deepEqual(store().views.Attributes.added.slice(0, 2), ['pace', 'shooting'], 'preset views carry their own columns');
  assert.ok(headers.length > 4, 'switching to a preset shows its extra columns');
});
