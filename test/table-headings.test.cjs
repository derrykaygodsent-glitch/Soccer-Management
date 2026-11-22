const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

class Element {
  constructor(text = '', tagName = 'DIV') {
    this._text = text; this.tagName = tagName; this.dataset = {}; this.attributes = {};
    this.children = []; this.hidden = false; this.disabled = false; this.style = {};
    this.listeners = {}; const classes = new Set(); this.classList = { add: value => classes.add(value), remove: value => classes.delete(value), contains: value => classes.has(value) };
  }
  get textContent() { return this.children.length ? this.children.map(x => x.textContent || x.nodeValue || '').join('') : this._text; }
  set textContent(value) { this._text = String(value); this.children = []; }
  append(...nodes) {
    for (const node of nodes) {
      this.children.push(node); node.parentNode = this;
      if (this.cells) this.cells.push(node);
    }
  }
  before() {}
  replaceChildren(...nodes) { this.children = nodes; for (const node of nodes) node.parentNode = this; }
  setAttribute(name, value) { this.attributes[name] = value; }
  removeAttribute(name) { delete this.attributes[name]; }
  addEventListener(name, fn) { this.listeners[name] = fn; }
  querySelector(selector) {
    if (selector === '[colspan]') return this.colSpan ? this : null;
    if (selector === 'input,select') return null;
    if (selector === 'button') return this.children.find(x => x.tagName === 'BUTTON') || null;
    return null;
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
  const head = { cells: headers, append(node) { headers.push(node); node.parentNode = head; } };
  const table = new Element('', 'TABLE');
  table.dataset = { sortTable: 'scouting', columnOptions: 'player' };
  table.tHead = { rows: [head] }; table.tBodies = [body];
  return { table, headers, body, rows };
}

function harness() {
  const document = { listeners: {}, body: new Element('', 'BODY') };
  const bodyClasses = new Set();
  document.body.classList = { add: value => bodyClasses.add(value), remove: value => bodyClasses.delete(value), contains: value => bodyClasses.has(value) };
  document.createElement = name => new Element('', name.toUpperCase());
  document.createDocumentFragment = () => new Element();
  document.addEventListener = (name, fn) => { document.listeners[name] = fn; };
  document.removeEventListener = name => { delete document.listeners[name]; };
  const window = { TLManagerLife: { pool: [
    { id: 'p1', attrs: { pace: 80 }, value: 100, stats: {} },
    { id: 'p2', attrs: { pace: 65 }, value: 80, stats: {} },
  ], money: n => '£' + n } };
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/table-headings.js'), 'utf8'), {
    window, document, Intl, innerWidth: 1000, innerHeight: 800,
  });
  return { document, headings: window.TLTableHeadings, bodyClasses };
}

test('right-click column headers customize, hide and add columns; rows remain in place', () => {
  const { table, headers, rows } = fixture(), { document, headings } = harness();
  headings.bind({ querySelectorAll: () => [table] }, 'career', 'scouting');
  assert.equal(table.columnTools, undefined, 'no always-visible Columns toolbar is added');
  assert.equal(rows.length, 2);
  headers[1].listeners.contextmenu({ preventDefault() {}, clientX: 40, clientY: 50 });
  let addPace = document.body.children[0].children.find(item => item.textContent === 'Add: Pace');
  assert.ok(addPace, 'context menu offers available player-stat columns');
  addPace.onclick();
  assert.equal(headers.length, 4);
  assert.equal(headers[3].textContent, 'Pace');
  assert.equal(rows[0].cells[3].textContent, '80');
  assert.equal(rows[1].cells[3].textContent, '65');
  assert.equal(rows.length, 2);
  headers[3].listeners.contextmenu({ preventDefault() {}, clientX: 40, clientY: 50 });
  const hide = document.body.children[0].children.find(item => item.textContent === 'Hide column: Pace');
  hide.onclick();
  assert.equal(headers[3].hidden, true);
  assert.equal(rows[0].cells[3].hidden, true);
  headers[3].listeners.contextmenu({ preventDefault() {}, clientX: 40, clientY: 50 });
  const restore = document.body.children[0].children.find(item => item.textContent === 'Restore: Pace');
  restore.onclick();
  assert.equal(headers[3].hidden, false);
  headers[3].listeners.contextmenu({ preventDefault() {}, clientX: 40, clientY: 50 });
  document.body.children[0].children.find(item => item.textContent === 'Reset columns and widths').onclick();
  assert.equal(headers.length, 3, 'reset removes added columns');
  assert.equal(rows[0].cells.length, 3);
  assert.equal(rows.length, 2);
});

test('column drag resizes a field and persists the width without drawing vertical gridlines', () => {
  const { table, headers } = fixture(), { document, headings, bodyClasses } = harness();
  headings.bind({ querySelectorAll: () => [table] }, 'career-resize', 'scouting');
  const handle = headers[1].children.at(-1);
  handle.onpointerdown({ button: 0, clientX: 10, preventDefault() {}, stopPropagation() {} });
  document.listeners.pointermove({ clientX: 35 });
  assert.equal(headers[1].style.width, '125px');
  document.listeners.pointerup();
  assert.equal(table.style.tableLayout, 'fixed');
  assert.equal(bodyClasses.has('resizing-table-column'), false);
});
