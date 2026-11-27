'use strict';
/**
 * Token inventory — what the stylesheet actually uses today.
 *
 * Reads src/*.css in build order and counts colours, font sizes, radii and spacing so the
 * token layer is built from facts instead of taste. Prints a frequency table plus the
 * selectors behind the smallest type, because that is the Phase 0 problem.
 *
 *   node scripts/ui-inventory.cjs
 *   node scripts/ui-inventory.cjs --json   // machine-readable
 */

const fs = require('node:fs');
const path = require('node:path');

const SRC = path.resolve(__dirname, '..', 'src');
const ORDER = ['style.css', 'home.css', 'club.css', 'matchday.css', 'season.css', 'office.css', 'reading.css'];
const asJson = process.argv.includes('--json');

/** Walk the stylesheet keeping the selector that owns each declaration. */
function declarations(css) {
  const out = [];
  let selector = '';
  let buffer = '';
  let depth = 0;
  for (const ch of css) {
    if (ch === '{') {
      selector = buffer.split(/[;}]/).pop().trim();
      buffer = '';
      depth++;
      continue;
    }
    if (ch === '}') {
      buffer = '';
      depth = Math.max(0, depth - 1);
      continue;
    }
    buffer += ch;
    if (ch === ';') {
      const decl = buffer.slice(0, -1).trim();
      const colon = decl.indexOf(':');
      if (colon > 0) out.push({ selector, prop: decl.slice(0, colon).trim().toLowerCase(), value: decl.slice(colon + 1).trim() });
      buffer = '';
    }
  }
  return out;
}

const tally = new Map();
const bump = (key, selector) => {
  const row = tally.get(key) || { count: 0, selectors: new Set() };
  row.count++;
  if (selector && row.selectors.size < 4) row.selectors.add(selector.slice(0, 70));
  tally.set(key, row);
};

const sizes = [];
const colours = new Map();
const radii = new Map();
let total = 0;

for (const file of ORDER) {
  const css = fs.readFileSync(path.join(SRC, file), 'utf8');
  for (const d of declarations(css)) {
    total++;
    if (d.prop === 'font-size') {
      const px = /^([\d.]+)px$/.exec(d.value);
      const rem = /^([\d.]+)rem$/.exec(d.value);
      const em = /^([\d.]+)em$/.exec(d.value);
      let value = null;
      if (px) value = Number(px[1]);
      else if (rem) value = Number(rem[1]) * 16;
      else if (em) value = Number(em[1]) * 14;
      if (value != null) sizes.push({ px: Math.round(value * 100) / 100, selector: d.selector, file, raw: d.value });
    }
    if (d.prop === 'color' || d.prop === 'background' || d.prop === 'background-color' || d.prop === 'border-color') {
      for (const m of d.value.matchAll(/#[0-9a-f]{3,8}\b/gi)) colours.set(m[0].toLowerCase(), (colours.get(m[0].toLowerCase()) || 0) + 1);
    }
    if (d.prop === 'border-radius') {
      const v = d.value.split(' ')[0];
      radii.set(v, (radii.get(v) || 0) + 1);
      bump('radius:' + v, d.selector);
    }
  }
}

const buckets = { '<9px': 0, '9–10.9px': 0, '11–12.9px': 0, '13–15.9px': 0, '16px+': 0 };
for (const s of sizes) {
  if (s.px < 9) buckets['<9px']++;
  else if (s.px < 11) buckets['9–10.9px']++;
  else if (s.px < 13) buckets['11–12.9px']++;
  else if (s.px < 16) buckets['13–15.9px']++;
  else buckets['16px+']++;
}

const smallest = sizes.filter(s => s.px < 11).sort((a, b) => a.px - b.px);
const glyphish = /star|pip|dot|badge|avatar|crest|icon|shirt|number|rank|meter|spark|flag|emblem|mark|tick|chev|arrow|●|★|☆/i;

if (asJson) {
  console.log(JSON.stringify({
    files: ORDER, declarations: total,
    sizes: { buckets, smallest: smallest.slice(0, 120) },
    colours: [...colours.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40),
    radii: [...radii.entries()].sort((a, b) => b[1] - a[1])
  }, null, 2));
  process.exit(0);
}

console.log(`stylesheets: ${ORDER.join(', ')}`);
console.log(`declarations: ${total}\n`);

console.log('TYPE');
for (const [k, v] of Object.entries(buckets)) console.log(`  ${k.padEnd(10)} ${String(v).padStart(4)}`);
console.log(`  smallest   ${smallest.length ? smallest[0].px + 'px  (' + smallest[0].selector + ')' : '—'}\n`);

console.log(`FONT SIZES BELOW 11px — ${smallest.length} declarations`);
const bySize = new Map();
for (const s of smallest) {
  const row = bySize.get(s.px) || [];
  row.push(s);
  bySize.set(s.px, row);
}
for (const px of [...bySize.keys()].sort((a, b) => a - b)) {
  const rows = bySize.get(px);
  const glyph = rows.filter(r => glyphish.test(r.selector)).length;
  console.log(`  ${String(px).padStart(5)}px  ${String(rows.length).padStart(3)} decls  (${glyph} look like glyphs/badges)`);
  for (const r of rows.slice(0, 3)) console.log(`          ${r.file}  ${r.selector.slice(0, 88)}`);
}

console.log('\nTOP COLOURS');
for (const [hex, n] of [...colours.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) console.log(`  ${hex.padEnd(10)} ${n}`);
console.log(`  unique hex values: ${colours.size}`);

console.log('\nRADII');
for (const [v, n] of [...radii.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`  ${v.padEnd(12)} ${n}`);
