'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Match, L, CX, CY } = require('../src/engine.js');
const { CLUBS } = require('../src/data.js');
const V = require('../src/highlights.js');
const { full, comprehensive, extended, key } = V.MODES;

function game(seed = 342) {
  return new Match(CLUBS[1], CLUBS[0], { seed });
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
  for (const ev of ['goal', 'og', 'penscore', 'penmiss', 'pen', 'red', 'yellow', 'post', 'varcheck', 'varresult', 'corner']) assert.equal(V.eventRank({ type: ev }, m), key.rank);
  for (const ev of ['throwin', 'offside']) assert.equal(V.eventRank({ type: ev }, m), extended.rank);
  for (const ev of ['goalkick', 'catch']) assert.equal(V.eventRank({ type: ev }, m), comprehensive.rank);
  assert.equal(V.eventRank({ type: 'preview' }, m), Infinity);
  const cross = { type: 'cross', team: 0 };
  m.ball.flight = { kind: 'cross', intended: {}, targetX: L - 11, targetY: CY + 4 };
  assert.equal(V.eventRank(cross, m), extended.rank);
  m.ball.flight.targetX = L - 19;
  assert.equal(V.eventRank(cross, m), comprehensive.rank);
  m.teams[0].attackDir = -1; m.ball.flight.targetX = 12;
  assert.equal(V.eventRank(cross, m), extended.rank);
  m.phase = 'freekick'; m.setpiece = { direct: true, team: 0 };
  assert.equal(V.eventRank({ type: 'foul' }, m), extended.rank);
  m.setpiece.dangerous = true;
  assert.equal(V.eventRank({ type: 'foul' }, m), key.rank);
  assert.equal(V.shotRank({ outcome: 'miss', xg: .35 }), key.rank);
  assert.equal(V.shotRank({ outcome: 'save', xg: .29 }), key.rank);
  assert.equal(V.shotRank({ outcome: 'save', xg: .23 }), extended.rank);
  assert.equal(V.shotRank({ outcome: 'save', xg: .10 }), extended.rank);
  assert.equal(V.shotRank({ outcome: 'save', xg: .04 }), comprehensive.rank);
  assert.equal(V.shotRank({ outcome: 'block', xg: .14 }), extended.rank);
  assert.equal(V.shotRank({ outcome: 'miss', xg: .09 }), comprehensive.rank);
  assert.equal(V.shotRank({ outcome: 'pending', xg: .60 }), Infinity);
  assert.equal(V.shotRank({ outcome: 'disallowed', xg: .60 }), Infinity, 'only the review, not a disallowed shot, makes the cut');
  assert.equal(V.shotRank({ outcome: 'goal', xg: .04 }), key.rank, 'even an unlikely goal must make Key');
});

test('viewing settings change coverage but do not specify a playback speed', () => {
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
  const f = (elapsed, half) => ({ elapsed, half, t: elapsed, score: elapsed === 207 ? [1, 0] : [0, 0] });
  const first = f(120, 2), last = f(207, 2);
  const hidden = V.visibleStart(first.elapsed, last.elapsed, key);
  const history = [f(118, 1), f(121, 2), f(138, 2), f(hidden - .02, 2), f(hidden + .03, 2), f(195, 2), last];
  assert.equal(hidden, 207 - key.lead);
  assert.equal(V.visibleStart(first.elapsed, last.elapsed, comprehensive, hidden), hidden);
  assert.ok(hidden >= V.visibleStart(first.elapsed, 206, key));
  assert.ok(V.visibleStart(first.elapsed, last.elapsed, extended, 0, 2) < V.visibleStart(first.elapsed, last.elapsed, extended, 0, 1));
  assert.equal(V.visibleStart(first.elapsed, last.elapsed, extended, 0, 1), hidden);
  const film = V.clipFrames(history, first, last, hidden);
  assert.deepEqual(film.map(x => x.elapsed), [hidden - .02, hidden + .03, 195, 207]);
  assert.deepEqual(film[V.indexAt(film, hidden)].score, [0, 0]);
  assert.deepEqual(film[V.indexAt(film, 206.99)].score, [0, 0]);
  assert.deepEqual(film[V.indexAt(film, 207)].score, [1, 0]);
  assert.equal(V.frameAt(history, 120, first), first);
});

test('the same seed and changes on the same tick give identical play under all four policies', () => {
  const n = 40 * 795, changeAt = 40 * 748;
  const simulate = policy => {
    const m = game(342), scout = new V.Scout(m);
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
  for (const event of ['throwin', 'restartkick', 'goal']) assert.ok(continuous.state.events.some(e => e[0] === event), event);
  for (const playback of [narrow, normal, broad]) assert.deepEqual(playback.state, continuous.state);
});

test('a dangerous kick, corner or booked foul is queued at the award, not at a later shot', () => {
  const m = game(), scout = new V.Scout(m);
  const cue = (type, phase, at, extra = {}, meta = {}) => {
    m.phase = phase; m.elapsed = at;
    m.setpiece = { type: phase, team: 0, ...extra }; m.events.push({ type, team: 0, ...meta });
    return scout.check(m);
  };
  assert.equal(cue('foul', 'freekick', 50), extended.rank);
  assert.equal(scout.cue, 'freekick');
  assert.equal(cue('foul', 'freekick', 51), extended.rank, 'no ordinary free-kick quota in Extended');
  assert.equal(cue('foul', 'freekick', 120, { wide: true, dangerous: true }), key.rank);
  assert.equal(cue('foul', 'freekick', 140, {}, { discipline: true }), key.rank);
  assert.equal(cue('offside', 'freekick', 150, { indirect: true }), extended.rank);
  assert.equal(scout.cue, 'offside');
  assert.equal(cue('corner', 'corner', 180), key.rank);
  assert.equal(cue('throwin', 'throwin', 198), extended.rank);
  assert.equal(cue('goalkick', 'goalkick', 280), comprehensive.rank);
});

test('earlier minor moments cannot jump into the protected buildup to a future incident', () => {
  const goal = 202, initial = 30;
  for (const policy of [key, extended, comprehensive]) {
    for (const early of [174, 180, 191, 199, 201]) {
      const target = goal - V.CORE_LEAD;
      const searching = V.searchStart(initial, early, policy);
      for (let rank = 1; rank <= policy.rank; rank++) {
        const extra = V.visibleStart(initial, early, policy, searching, rank);
        assert.ok(extra <= target, `${policy.id} published footage has not skipped the next buildup`);
      }
      assert.equal(V.visibleStart(initial, goal, policy, searching, 1), target);
    }
  }
});

test('a selected restart stops the search at the award and keeps showing through the actual kick and the follow-up', () => {
  const m = stub((m, i) => {
    if (i === 64) {
      m.phase = 'freekick'; m.setpiece = { type: 'freekick', team: 0, indirect: true, reason: 'offside' };
      m.events.push({ type: 'offside', team: 1 });
    }
  });
  const scout = new V.Scout(m);
  assert.deepEqual(V.scanBatch(m, scout, extended, { now: () => 0 }), { type: 'moment', rank: 2, cue: 'offside', ticks: 64 });
  assert.ok(V.holdingAction(m));
  m.elapsed += 28; // long setup; an elapsed-time clip tail must not cut it off
  assert.ok(V.holdingAction(m));
  m.phase = 'open'; m.lastRestart = { ...m.setpiece, takenAt: m.elapsed }; m.setpiece = null;
  m.elapsed += 5;
  assert.ok(V.holdingAction(m));
  m.elapsed += 8;
  assert.ok(!V.holdingAction(m));
});
