'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Match, L, CX, CY } = require('../src/engine.js');
const { CLUBS } = require('../src/data.js');
const V = require('../src/highlights.js');
const { full, comprehensive, extended, key } = V.MODES;

function game() {
  return new Match(CLUBS[1], CLUBS[0], { seed: 231 });
}

test('four cumulative viewing settings, with Extended as the default', () => {
  const m = game();
  assert.deepEqual(Object.keys(V.MODES), ['full', 'comprehensive', 'extended', 'key']);
  assert.equal(V.modeFor(V.DEFAULT_MODE), extended);
  assert.equal(V.modeFor('standard'), extended, 'an old or unrecognized selection falls back to Extended');
  assert.equal(full.rank, 0, 'Full Match bypasses the highlight filter');
  assert.deepEqual([key, extended, comprehensive].map(p => p.rank), [1, 2, 3]);
  for (const period of ['lead', 'tail', 'opening']) {
    assert.ok(key[period] > 0 && extended[period] > key[period] && comprehensive[period] > extended[period]);
  }
  for (const ev of ['goal', 'og', 'penscore', 'penmiss', 'pen', 'red', 'post']) assert.equal(V.eventRank({ type: ev }, m), key.rank);
  assert.equal(V.eventRank({ type: 'corner' }, m), extended.rank);
  for (const ev of ['offside', 'yellow', 'catch']) assert.equal(V.eventRank({ type: ev }, m), comprehensive.rank);
  for (const ev of ['throwin', 'goalkick', 'preview']) assert.equal(V.eventRank({ type: ev }, m), Infinity);
  const cross = { type: 'cross', team: 0 };
  m.ball.flight = { kind: 'cross', intended: {}, targetX: L - 11, targetY: CY + 4 };
  assert.equal(V.eventRank(cross, m), extended.rank);
  m.ball.flight.targetX = L - 19;
  assert.equal(V.eventRank(cross, m), comprehensive.rank);
  m.teams[0].attackDir = -1; m.ball.flight.targetX = 12;
  assert.equal(V.eventRank(cross, m), extended.rank);
  m.phase = 'freekick'; m.setpiece = { direct: true, team: 0 };
  assert.equal(V.eventRank({ type: 'foul' }, m), extended.rank);
  assert.equal(V.shotRank({ outcome: 'miss', xg: .30 }), key.rank);
  assert.equal(V.shotRank({ outcome: 'save', xg: .23 }), key.rank);
  assert.equal(V.shotRank({ outcome: 'save', xg: .04 }), extended.rank);
  assert.equal(V.shotRank({ outcome: 'block', xg: .14 }), extended.rank);
  assert.equal(V.shotRank({ outcome: 'miss', xg: .09 }), comprehensive.rank);
  assert.equal(V.shotRank({ outcome: 'pending', xg: .60 }), Infinity);
  assert.equal(V.shotRank({ outcome: 'goal', xg: .04 }), key.rank, 'even an unlikely goal must make Key');
});

test('the speed buttons use the approved pace independently of footage selection', () => {
  assert.deepEqual([1, 2, 3].map(V.playbackRate), [1.65, 3.3, 6.6]);
  for (const policy of [full, comprehensive, extended, key]) {
    assert.ok(!Object.hasOwn(policy, 'pace'), `${policy.label} does not control playback speed`);
  }
  assert.equal(extended.bestFor, 'Normal league matches');
});

test('scouting preserves possession across passes and distinguishes progression from recovery', () => {
  const m = game(), scout = new V.Scout(m);
  const [home, away] = m.teams.map(t => t.slots.find(s => s.role !== 'GK').player);
  const control = (owner, x, elapsed) => {
    Object.assign(m, { elapsed }); Object.assign(m.ball, { owner, x });
    return scout.check(m);
  };
  m.phase = 'open';
  assert.equal(control(home, 48, 0), Infinity, 'ordinary possession is not a highlight');
  assert.equal(control(null, 56, 2), Infinity, 'an airborne pass keeps the spell alive');
  assert.equal(control(home, 83, 3), extended.rank, 'a progressive attack can qualify without a shot');
  assert.equal(control(home, 84, 4), Infinity, 'do not repeat the same attack');
  assert.equal(control(away, 83, 5), Infinity, 'the regain must be controlled');
  assert.equal(control(away, 81, 6.1), comprehensive.rank, 'a defensive recovery provides extra context');
  assert.equal(control(away, 79, 7), Infinity, 'do not repeat the same recovery');
  m.events.push({ type: 'goal' });
  assert.equal(scout.check(m), key.rank, 'progression cannot mask a decisive incident');
});

test('repeat crosses do not crowd out other highlights or suppress an actual chance', () => {
  const m = game(), scout = new V.Scout(m);
  const attacker = m.teams[0].slots.find(s => s.role !== 'GK').player;
  m.phase = 'open'; m.ball.x = 69; m.ball.owner = attacker;
  scout.check(m);
  m.elapsed = 5; m.ball.owner = null;
  m.ball.flight = { kind: 'cross', intended: attacker, targetX: L - 9, targetY: CY };
  m.events.push({ type: 'cross', team: 0 });
  assert.equal(scout.check(m), extended.rank);
  m.elapsed = 9; m.events.push({ type: 'cross', team: 0 });
  assert.equal(scout.check(m), Infinity);
  m.shotMap.push({ outcome: 'save', xg: .18 });
  assert.equal(scout.check(m), extended.rank, 'a resolved shot is not gated by the cross cooldown');
  m.events.push({ type: 'goal', team: 0 });
  assert.equal(scout.check(m), key.rank);
});

function stub(makeEvent) {
  return { ticks: 0, half: 1, elapsed: 0, phase: 'open', events: [], shotMap: [], teams: [], ball: { x: CX, y: CY, owner: null },
    step(h) { this.elapsed += h; makeEvent(this, ++this.ticks); } };
}

test('each search batch has a tick cap, with an independent wall-time deadline', () => {
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
  const history = [s(74, 1), s(79, 2), s(86, 2), s(90.98, 2), s(91.03, 2), s(102, 2), last];
  assert.equal(hidden, 91);
  assert.equal(V.visibleStart(first.elapsed, last.elapsed, comprehensive, hidden), hidden);
  assert.ok(hidden >= V.visibleStart(first.elapsed, 106, key));
  const film = V.clipFrames(history, first, last, hidden);
  assert.deepEqual(film.map(x => x.elapsed), [90.98, 91.03, 102, 107]);
  assert.deepEqual(film[V.indexAt(film, hidden)].score, [0, 0]);
  assert.deepEqual(film[V.indexAt(film, 106.99)].score, [0, 0]);
  assert.deepEqual(film[V.indexAt(film, 107)].score, [1, 0]);
  assert.equal(V.frameAt(history, 78, first), first);
});

test('the same seed and changes on the same tick give identical play under all four policies', () => {
  const n = 40 * 445, changeAt = 40 * 305;
  const simulate = policy => {
    const m = game(), scout = new V.Scout(m);
    let ticks = 0, seen = 0;
    while (ticks < n) {
      if (ticks === changeAt) {
        m.setTactics(0, { mentality: 3 });
        const team = m.teams[0];
        const out = team.slots.find(s => s.player.pos !== 'GK').player;
        const replacement = team.bench.find(p => p.pos !== 'GK');
        assert.equal(m.substitute(0, out.id, replacement.id).ok, true);
      }
      if (policy.rank) {
        const end = ticks < changeAt ? changeAt : n;
        const r = V.scanBatch(m, scout, policy, { now: () => 0, maxSteps: Math.min(end - ticks, V.MAX_SCAN_STEPS) });
        assert.ok(r.ticks > 0);
        ticks += r.ticks;
        seen += r.type === 'moment';
      } else {
        m.step(V.STEP);
        ticks++;
      }
    }
    return { seen, state: {
      score: m.teams.map(team => team.score), stats: m.teams.map(team => team.stats),
      possession: m.possTime, events: m.events.map(e => [e.type, e.clock, e.text]),
      shots: m.shotMap, frame: m.snapshotFrame()
    } };
  };
  const continuous = simulate(full), narrow = simulate(key), normal = simulate(extended), broad = simulate(comprehensive);
  assert.ok(narrow.seen > 0 && normal.seen > narrow.seen && broad.seen > normal.seen);
  assert.ok(continuous.state.events.some(e => e[0] === 'sub'));
  for (const playback of [narrow, normal, broad]) assert.deepEqual(playback.state, continuous.state);
});
