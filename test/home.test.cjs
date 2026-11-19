'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const H = require('../src/home-data.js');
const D = require('../src/data.js');
const K = require('../src/season-calendar.js');
const S = require('../src/season-state.js');

test('Home advertises the same next fixture as the date-gated season', () => {
  const season=S.open().value, f=K.next(season);
  assert.equal(f.id,H.next.id);
  assert.equal(K.due(season),null);
  const config = H.matchConfig();
  assert.equal(D.CLUBS[config.home].id, H.homeId);
  assert.equal(D.CLUBS[config.away].id, H.next.opponent);
  assert.equal(config.competition, H.competition[H.next.comp]);
  assert.equal(H.next, H.fixtures.find(f => !f.score));
  assert.equal(H.leadTime(H.start, H.next.date), '4 days');
  assert.equal(H.leadTime(H.next.date, H.next.date), 'Today');
  assert.deepEqual(H.calendar(H.start), { day: 'Mon 17:15', date: '26 Oct 2026', long: 'Monday 26th October 2026' });
  assert.equal(H.shortDate(H.next.date), '30/10');
});

test('Home standings are ordered and the player leaders belong to the real Riverside squad', () => {
  const ids = new Set();
  for (let i = 0; i < H.standings.length; i++) {
    const row = H.standings[i];
    assert.ok(H.clubs[row.id]); assert.ok(!ids.has(row.id)); ids.add(row.id);
    assert.equal(row.played, row.w + row.d + row.l);
    assert.equal(row.pts, 3 * row.w + row.d);
    assert.equal(row.gd, row.gf - row.ga);
    const prev = H.standings[i - 1];
    if (prev) assert.ok(prev.pts > row.pts || (prev.pts === row.pts && prev.gd >= row.gd));
  }
  const sum = key => H.standings.reduce((total, row) => total + row[key], 0);
  assert.equal(H.standings.length, 20);
  assert.equal(sum('w'), sum('l'));
  assert.equal(sum('gf'), sum('ga'));
  assert.equal(sum('d') % 2, 0);
  const roster = D.genSquad(H.clubs[H.homeId], D.seedFor(H.homeId));
  for (const leader of H.leaders) {
    assert.ok(roster.some(p => p.id === leader.player.id && p.name === leader.player.name));
    assert.ok(H.portraitFor[leader.player.id]);
  }
});

test('the bundled Club Home precedes the initially hidden match and carries the portraits and editorial art offline', () => {
  const page = readFileSync(join(__dirname, '../index.html'), 'utf8');
  assert.match(page, /id="homeScreen">/);
  assert.match(page, /id="matchScreen" hidden[>\s]/);
  assert.ok(page.indexOf('id="homeScreen"') < page.indexOf('id="matchScreen"'));
  assert.match(page, /id="homeContinue"/);
  assert.equal((page.match(/data:image\/webp;base64,/g) || []).length, 13);
  assert.doesNotMatch(page, /@HOME_PORTRAITS@|@CLUB_MEDIA@|\{\{HOME(?:_ICONS)?\}\}/);
});
