/* The household reads in sections with one next step, and its journal turns pages. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const read = name => fs.readFileSync(path.join(__dirname, '..', 'src', name), 'utf8');
global.TLClubUI = {
  esc: value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]),
  art: () => '',
};
let Household;
let Life;

test('the household module loads with the club UI available', () => {
  Household = require('../src/household.js');
  Life = require('../src/manager-life');
  assert.ok(Household.render && Life.create);
});

function career(marital = 'Married') {
  return Life.create({ name: 'Jo', age: 28, gender: 'Female', nation: 'Valdoria', job: 'Corporate official', marital, children: [], face: 'Oval', skin: 'Brown', path: 'found' }, 'home');
}

test('the household opens on one overview with a single next step', () => {
  const s = career();
  const html = Household.render(s);
  const tabs = [...html.matchAll(/data-house-tab="([a-z]+)"/g)].map(m => m[1]);
  assert.deepEqual(tabs, ['overview', 'relationship', 'money', 'circle', 'family', 'journal'], 'six named sections in a fixed order');
  assert.match(html, /aria-pressed="true">Overview/, 'and it opens on the overview');
  assert.match(html, /YOUR NEXT STEP/, 'which names one thing worth doing next');
  const actions = html.slice(html.indexOf('YOUR NEXT STEP'));
  assert.equal((actions.match(/data-life=/g) || []).length, 1, 'exactly one action on the overview, not a rack of them');
});

test('every section keeps the facts it owns and nothing else', () => {
  const s = career();
  const relationship = Household.render(s, 'relationship');
  assert.match(relationship, /Relationship decisions/, 'the relationship section keeps its decisions');
  assert.match(relationship, /Send a personal message|Checked in today/);
  const money = Household.render(s, 'money');
  assert.match(money, /HOUSEHOLD ACCOUNT/);
  assert.match(money, /houseDeposit/, 'the reserve can still be topped up');
  assert.match(money, /houseBudget/, 'and the weekly payment can still be paused');
  const circle = Household.render(s, 'circle');
  assert.match(circle, /YOUR PERSONAL CIRCLE/);
  assert.match(circle, /data-v="connections"/);
  const family = Household.render(s, 'family');
  assert.ok(family.length > 500, 'the family section renders the family paths');
  const journal = Household.render(s, 'journal');
  assert.match(journal, /FAMILY ALBUM/);
  for (const view of ['overview', 'money', 'circle', 'family', 'journal']) {
    assert.doesNotMatch(Household.render(s, view), /data-life="houseEnd"/, `${view} does not repeat the relationship decisions`);
  }
  assert.match(relationship, /data-life="houseEnd"/, 'only the relationship section can end it');
});

test('the journal is a paged stream, not an eighty-entry scroll', () => {
  const s = career();
  s.household = { ...Household.read(s), log: Array.from({ length: 40 }, (_, i) => ({ day: 380 - i, text: `Entry ${i}` })) };
  const journal = Household.render(s, 'journal');
  assert.match(journal, /data-wire-stream="journal"/, 'the album uses the feed pager');
  assert.match(journal, /data-wire-size="12" data-wire-size-phone="8"/, 'twelve entries on a desk, eight on a phone');
  assert.match(journal, /data-wire-noun="entries"/, 'and it counts entries');
  assert.equal((journal.match(/Entry \d+/g) || []).length, 40, 'every entry stays in the document for the pager to show');
});

test('an unknown section falls back to the overview instead of an empty page', () => {
  const s = career();
  assert.match(Household.render(s, 'nonsense'), /YOUR NEXT STEP/);
  assert.match(Household.render(s, undefined), /YOUR NEXT STEP/);
});

test('the shell remembers the section and draws it', () => {
  const desk = read('manager-desk.js');
  assert.match(desk, /let houseView='overview'/, 'the section starts on the overview');
  assert.match(desk, /case 'household':return g\.TLHousehold\.render\(s,houseView\)/, 'and is handed to the renderer');
  assert.match(desk, /if\(b\.dataset\.houseTab\)\{houseView=b\.dataset\.houseTab;draw\(\);/, 'clicking a section redraws the page');
  assert.match(desk, /if\(!e\.detail\)root\.querySelector\(`\[data-house-tab="\$\{houseView\}"\]`\)\?\.focus/, 'only a keyboard click takes focus with it');
  const css = read('office.css');
  assert.match(css, /\.house-nav button\[aria-pressed="true"\]\{color:#dafa8a;border-bottom-color:#dafa8a\}/, 'the open section is marked by colour and a rule, no ring');
  assert.match(css, /\.house-nav button\{width:auto;min-height:44px/, 'and its targets are thumb sized');
});
