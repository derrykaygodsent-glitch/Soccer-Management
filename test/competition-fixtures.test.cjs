'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

/* The competition module reaches for browser globals at call time; the pure helpers do not. */
global.window = global;
global.TLManagerLife = { date: d => d, atlas: { countries: [] }, nations: {}, pool: [], district: () => ({}) };
global.TLClubUI = { esc: v => String(v), art: () => '' };
global.TLData = { seedFor: () => 0 };
global.TLTurnover = { season: () => 2027, round: () => 1 };
global.TLFASeason = { major: () => true, fixtures: () => [], profiles: {}, dates: () => [], kickoff: () => '' };
const C = require(path.join(__dirname, '..', 'src', 'competition-room.js'));

const fx = (i, day, a, b, extra = {}) => ({ i, day, a, b, team: `T${a}`, host: `T${b}`, ...extra });

test('a round is one matchday, even when it runs over two days', () => {
  const rounds = C.groupRounds([fx(0, 383, 0, 19), fx(0, 384, 1, 18), fx(1, 390, 0, 18)]);
  assert.equal(rounds.length, 2);
  assert.equal(rounds[0].number, 1);
  assert.equal(rounds[0].fixtures.length, 2);
  assert.deepEqual(rounds[0].days, [383, 384]);
  assert.equal(rounds[1].number, 2);
});

test('rounds are numbered in date order, whatever order the schedule arrives in', () => {
  const rounds = C.groupRounds([fx(5, 430, 1, 2), fx(3, 400, 2, 3), fx(4, 415, 3, 4)]);
  assert.deepEqual(rounds.map(r => [r.number, r.from]), [[1, 400], [2, 415], [3, 430]]);
});

test('upcoming keeps the round being played, results are the rounds already behind it', () => {
  const rounds = C.groupRounds([fx(0, 370, 0, 1), fx(1, 383, 0, 2), fx(2, 390, 0, 3)]);
  assert.deepEqual(C.roundsFor(rounds, 'upcoming', 383).map(r => r.number), [2, 3]);
  assert.deepEqual(C.roundsFor(rounds, 'results', 383).map(r => r.number), [1]);
  assert.deepEqual(C.roundsFor(rounds, 'all', 383).map(r => r.number), [1, 2, 3]);
});

test('a score is found by the fixture pair the league simulated', () => {
  const results = [[0, 19, 2, 1], [1, 18, 0, 0]];
  assert.deepEqual(C.scoreOf(fx(0, 383, 0, 19), results), [2, 1]);
  assert.deepEqual(C.scoreOf(fx(0, 383, 1, 18), results), [0, 0]);
  // a reversed pair is a different match, not the same one written backwards
  assert.equal(C.scoreOf(fx(0, 383, 19, 0), results), null);
  assert.equal(C.scoreOf(fx(0, 383, 0, 19), []), null);
  assert.equal(C.scoreOf(fx(0, 383, 0, 19), undefined), null);
});

test('a one-day round reads as one date, a two-day round as a span', () => {
  assert.equal(C.spanText('2027-11-13', '2027-11-13'), '13 Nov 2027');
  assert.equal(C.spanText('2027-11-13', '2027-11-14'), '13–14 Nov 2027');
  assert.equal(C.spanText('2027-11-28', '2027-12-02'), '28 Nov 2027 – 2 Dec 2027');
});
