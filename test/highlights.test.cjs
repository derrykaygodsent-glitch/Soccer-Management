'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Match, CX, CY } = require('../src/engine.js');
const { CLUBS } = require('../src/data.js');
const V = require('../src/highlights.js');
const { full, comprehensive, extended, standard, key } = V.MODES;

function game() {
  return new Match(CLUBS[1], CLUBS[0], { seed: 231 });
}

test('the four highlight settings have cumulative coverage and distinct buildup lengths', () => {
  const m = game();
  for (const ev of ['goal', 'og', 'penscore', 'penmiss', 'pen', 'red', 'post']) assert.equal(V.eventRank({ type: ev }, m), key.rank);
  for (const ev of ['corner', 'cross']) assert.equal(V.eventRank({ type: ev }, m), extended.rank);
  for (const ev of ['offside', 'yellow', 'catch']) assert.equal(V.eventRank({ type: ev }, m), comprehensive.rank);
  for (const ev of ['throwin', 'goalkick', 'preview']) assert.equal(V.eventRank({ type: ev }, m), Infinity);
  assert.equal(V.shotRank({ outcome: 'miss', xg: .30 }), key.rank);
  assert.equal(V.shotRank({ outcome: 'save', xg: .04 }), standard.rank);
  assert.equal(V.shotRank({ outcome: 'block', xg: .19 }), standard.rank);
  assert.equal(V.shotRank({ outcome: 'miss', xg: .09 }), extended.rank);
  assert.equal(V.shotRank({ outcome: 'pending', xg: .60 }), Infinity);
  assert.equal(V.shotRank({ outcome: 'goal', xg: .04 }), key.rank, 'even an unlikely goal must make Key');
  assert.equal(V.modeFor('invalid'), full);
  for (const [i, p] of [full, key, standard, extended, comprehensive].entries()) {
    assert.equal(p.rank, i);
    if (i > 1) assert.ok(p.lead > [full, key, standard, extended][i - 1].lead);
  }
});

test('a scout notes a promising entry once per spell, without letting it mask big moments', () => {
  const m = game(), scout = new V.Scout(m);
  m.phase = 'open';
  m.ball.owner = m.teams[0].slots.find(slot => slot.role === 'ST').player;
  m.ball.x = 79;
  assert.equal(scout.check(m), comprehensive.rank);
  assert.equal(scout.check(m), Infinity);
  m.ball.x = 61; m.elapsed = 8;
  scout.check(m);
  m.ball.x = 84;
  assert.equal(scout.check(m), Infinity, 'small gaps between attacks do not create back-to-back previews');
  m.events.push({ type: 'goal' });
  assert.equal(scout.check(m), key.rank);
});

function stub(makeEvent) {
  return { ticks: 0, half: 1, elapsed: 0, phase: 'open', events: [], shotMap: [], ball: { x: CX, y: CY, owner: null },
    step(h) { this.elapsed += h; makeEvent(this, ++this.ticks); } };
}

test('search is bounded per animation frame, with an independent wall-time deadline', () => {
  const m = stub(() => {}), scout = new V.Scout(m);
  let wall = 0;
  const wait = V.scanBatch(m, scout, key, { maxSteps: 2000, budget: 3, now: () => wall += 8 });
  assert.equal(wait.type, 'search');
  assert.ok(wait.ticks >= 1 && wait.ticks <= 8);
  const cap = V.scanBatch(m, scout, key, { now: () => 0 });
  assert.deepEqual(cap, { type: 'search', ticks: V.MAX_SCAN_STEPS });
});

test('search stops on the exact goal or whistle tick, never simulating past a break', () => {
  const m = stub((m, i) => {
    if (i === 4) m.events.push({ type: 'cross' });
    if (i === 11) m.events.push({ type: 'goal' });
    if (i === 18) { m.events.push({ type: 'ht' }); m.phase = 'halftime'; }
    if (i > 18) throw Error('Overshot half-time');
  });
  const scout = new V.Scout(m);
  assert.deepEqual(V.scanBatch(m, scout, key, { now: () => 0 }), { type: 'moment', rank: 1, ticks: 11 });
  assert.equal(m.ticks, 11);
  assert.deepEqual(V.scanBatch(m, scout, key, { now: () => 0 }), { type: 'break', ticks: 7 });
  assert.equal(m.ticks, 18);
  assert.deepEqual(V.scanBatch(m, scout, key, { now: () => 0 }), { type: 'break', ticks: 0 });
});

test('a cut starts at the published clock and cannot include frames from the previous half', () => {
  const s = (elapsed, half) => ({ elapsed, half, t: elapsed, score: elapsed === 107 ? [1, 0] : [0, 0] });
  const first = s(78, 2), last = s(107, 2);
  const hidden = V.visibleStart(first.elapsed, last.elapsed, key);
  const history = [s(74, 1), s(79, 2), s(91, 2), s(97.98, 2), s(98.03, 2), s(102, 2), last];
  assert.equal(hidden, 98);
  assert.ok(hidden >= V.visibleStart(first.elapsed, 106, key));
  const film = V.clipFrames(history, first, last, hidden);
  assert.deepEqual(film.map(x => x.elapsed), [97.98, 98.03, 102, 107]);
  assert.deepEqual(film[V.indexAt(film, hidden)].score, [0, 0]);
  assert.deepEqual(film[V.indexAt(film, 106.99)].score, [0, 0]);
  assert.deepEqual(film[V.indexAt(film, 107)].score, [1, 0]);
  assert.equal(V.frameAt(history, 78, first), first);
});

test('an equivalent seed and tick count yield the same events, ball and score during a search', () => {
  const live = game(), highlights = game(), scout = new V.Scout(highlights);
  const n = 40 * 305;
  for (let i = 0; i < n; i++) live.step(V.STEP);
  let left = n, seen = 0;
  while (left > 0) {
    const r = V.scanBatch(highlights, scout, key, { now: () => 0, maxSteps: Math.min(left, V.MAX_SCAN_STEPS) });
    assert.ok(r.ticks > 0);
    left -= r.ticks;
    if (r.type === 'moment') seen++;
  }
  const brief = m => ({
    score: m.teams.map(team => team.score),
    events: m.events.map(e => [e.type, e.clock, e.text]),
    shotMap: m.shotMap,
    frame: m.snapshotFrame()
  });
  assert.ok(seen > 0);
  assert.ok(live.teams.some(team => team.score));
  assert.deepEqual(brief(live), brief(highlights));
});
