/* Personal money reads in four sections, states its movements range, and never mixes ledgers. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const read = name => fs.readFileSync(path.join(__dirname, '..', 'src', name), 'utf8');

global.TLClubUI = {
  esc: value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]),
  art: () => '',
};

const Life = require('../src/manager-life');
const Luma = require('../src/luma');
const Accounts = require('../src/personal-accounts');

global.TLLuma = Luma;
global.TLManagerLife = Life;

function career() {
  const s = Life.create({ name: 'Jo', age: 28, gender: 'Female', nation: 'Valdoria', job: 'Corporate official', marital: 'Single', children: [], face: 'Oval', skin: 'Brown', path: 'found' }, 'accounts');
  Life.activate(s);
  s.lumaJournal = [
    { day: s.day, personal: -20, club: 0, label: 'Date night' },
    { day: s.day - 1, personal: 100, club: 0, label: 'Shift pay' },
    { day: s.day - 2, personal: 0, club: 50, label: 'Gate receipts' },
  ];
  return s;
}

test('the page offers four named sections and opens on the overview', () => {
  const html = Accounts.render(career());
  const tabs = [...html.matchAll(/data-account-tab="([a-z]+)"/g)].map(m => m[1]);
  assert.deepEqual([...new Set(tabs)], ['overview', 'movements', 'investments', 'travel'], 'four sections, no more');
  assert.match(html, /aria-pressed="true">Overview/);
  assert.doesNotMatch(html, /Recent movements/, 'the overview does not repeat the statement');
});

test('movements state their range and turn pages of days', () => {
  const s = career();
  s.lumaJournal = Array.from({ length: 40 }, (_, i) => ({ day: s.day - i, personal: -5, club: 0, label: `Movement ${i}` }));
  const html = Accounts.render(s, 'movements');
  assert.match(html, /data-wire-stream="movements"/);
  assert.match(html, /data-wire-size="10" data-wire-size-phone="6" data-wire-noun="days"/, 'ten days a page on a desk, six on a phone');
  assert.match(html, /lm-days/, 'the day list is the thing that pages');
  assert.match(html, /<\/div><\/section>$/, 'and the page wrapper closes cleanly');
  const closes = (html.match(/<div/g) || []).length - (html.match(/<\/div>/g) || []).length;
  assert.ok(closes >= 0, 'the wrapper does not swallow the statement');
});

test('the wallet still renders its own accounts and the movements can be hidden', () => {
  const s = career();
  const full = Luma.wallet(s);
  assert.match(full, /Recent movements/, 'the shared wallet keeps its statement by default');
  const bare = Luma.wallet(s, { movements: false });
  assert.doesNotMatch(bare, /Recent movements/, 'and can leave it to the movements section');
  assert.match(bare, /Personal wallet/, 'without losing the accounts');
});

test('each section keeps its own facts and the club account stays a different page', () => {
  const s = career();
  const investments = Accounts.render(s, 'investments');
  assert.match(investments, /Investments &amp; property/);
  const travel = Accounts.render(s, 'travel');
  assert.match(travel, /account-cards/, 'the district cards are wrapped so a desk can show them in two columns');
  assert.doesNotMatch(travel, /Family paths/, 'the home and family facts live in Household, not here');
  const desk = read('manager-desk.js');
  assert.match(desk, /case 'personal':return g\.TLPersonalAccounts\.render\(s,accountView\)/, 'the shell draws the new page');
  assert.match(desk, /if\(b\.dataset\.accountTab\)\{accountView=b\.dataset\.accountTab;draw\(\);/, 'and a section click redraws it');
  assert.match(desk, /if\(!e\.detail\)root\.querySelector\(`\[data-account-tab=/, 'only a keyboard click moves focus');
  assert.match(fs.readFileSync(path.join(__dirname,'..','build.cjs'),'utf8'), /'wire-pager\.js', 'personal-accounts\.js'/, 'the module ships in the bundle');
});
