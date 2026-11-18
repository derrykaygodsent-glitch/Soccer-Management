'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Match, L, W, CY, BOX_L } = require('../src/engine.js');
const { FREE_DISTANCE } = require('../src/pitch.js');
const { CLUBS } = require('../src/data.js');
const P = require('../src/physics.js');
const S = require('../src/setpieces.js');
const { STEP } = require('../src/highlights.js');

function game(seed = 44, second = false) {
  const m = new Match(CLUBS[1], CLUBS[0], { seed });
  if (second) { m.phase = 'halftime'; m.continueSecondHalf(); }
  return m;
}
const park = (p, x, y) => Object.assign(p, { x, y, tx: x, ty: y, vx: 0, vy: 0 });
const out = (m, team) => m.playersCache.filter(p => p.team === team && p.role !== 'GK');
const latest = (m, type) => m.events.findLast(e => e.type === type);
const atDepth = (m, x) => m.teams[0].attackDir > 0 ? x : L - x;
const afterRelease = (m, sp, see = () => {}) => {
  for (let i = 0; i < 28 / STEP && m.phase === sp.type; i++) {
    m.step(STEP);
    see(m);
  }
  assert.equal(m.phase, 'open', `stalled ${sp.type} at ${sp.stage}`);
  assert.equal(m.lastRestart.id, sp.id);
  return m.ball.flight;
};

test('throws with no outlet stay two-handed releases from the correct touchline in both halves', () => {
  for (const [second, side] of [[false, 0], [false, W], [true, 0], [true, W]]) {
    const m = game(65, second), x = atDepth(m, 62), inside = side === 0 ? 1 : -1;
    const team = out(m, 0), taker = team[1];
    for (const p of m.playersCache) park(p, atDepth(m, 16 + p.num % 10 * 4), CY + (p.team ? 4 : -4));
    park(taker, x, side + inside * .9);
    park(out(m, 1)[0], x + 1.3, side + inside * .1);
    // The old program fell back to a long kick when no teammate was available.
    const sp = m.startSetPiece('throwin', 0, x, side);
    assert.equal(sp.y, side);
    assert.equal(sp.taker, taker);
    assert.equal(taker.tx, x);
    assert.ok((taker.ty - side) * inside < 0);
    const heights = [], plant = [];
    const flight = afterRelease(m, sp, m => {
      if (sp.stage === 'windup' && m.setpiece === sp) {
        const pose = m.snapshotFrame().restartPose;
        assert.equal(pose.thrower, taker.id);
        assert.ok((taker.y - side) * inside <= 0);
        heights.push(m.ball.z); plant.push([taker.x, taker.y]);
      }
    });
    assert.ok(heights.length > 25 && Math.max(...heights) > 1.88);
    assert.deepEqual(plant.at(-1), plant[0], 'both feet remain planted during the throw');
    assert.deepEqual([m.ball.x, m.ball.y], [x, side]);
    assert.equal(flight.kind, 'throw');
    assert.equal(flight.intended, null);
    assert.equal(flight.offsideCheck, false);
    assert.ok(m.ball.z >= 2 && m.ball.z <= 2.2);
    assert.ok((flight.targetY - side) * inside > 1.5);
    assert.ok(flight.totalDist < 9 && Math.hypot(m.ball.vx, m.ball.vy, m.ball.vz) <= S.throwSpeed(taker) + 1e-9);
    assert.ok(m.playersCache.filter(p => p.team !== 0).every(p => Math.hypot(p.x - x, p.y - side) >= 2));
    assert.equal(latest(m, 'restartkick').technique, 'throw');
    assert.equal(m.ball.restart.indirect, true, 'no direct goal');
  }
});

test('local marking changes the throw choice, and only a suitable arm can threaten the box', () => {
  const m = game(), [p, recycling, forward, box] = out(m, 0);
  const [markA, markB] = out(m, 1);
  const spot = { x: 90, y: 0, team: 0, taker: p };
  m.teams[0].tactics.passing = 2;
  m.playersCache = [p, recycling, forward, box, markA, markB];
  park(p, 90, -.53); park(recycling, 84, 4); park(forward, 100, 5); park(box, 97, 19.5);
  park(markA, 103, 6.1); park(markB, 96, 23);
  p.attrs.throwPower = 6;
  assert.ok(!S.throwOptions(m, spot).some(c => c.kind === 'long'));
  m.choiceRnd = () => .01;
  assert.equal(S.chooseThrow(m, spot).target, recycling, 'safe outlet behind the thrower');
  park(markA, 84.2, 4.5); park(markB, 81, 4);
  assert.equal(S.chooseThrow(m, spot).target, forward, 'cut off the recycle lane and the throw goes forward');
  park(markA, 87, 5.8); park(markB, 100.5, 5.5);
  Object.assign(p.attrs, { throwing: 19, throwPower: 20 });
  assert.ok(S.throwOptions(m, spot).some(c => c.kind === 'long' && c.target === box));
  const long = S.chooseThrow(m, spot);
  assert.equal(long.kind, 'long');
  const sp = m.startSetPiece('throwin', 0, spot.x, spot.y);
  sp.taker = p; sp.throwPlan = long;
  m.executeSetPiece();
  assert.ok(m.ball.flight.totalDist >= 17 && m.ball.flight.totalDist < 30);
  const landing = P.forecast(m.ball, P.landingTime(m.ball.z, m.ball.vz));
  assert.ok(Math.hypot(landing.x - spot.x, landing.y - spot.y) < 32);
});

test('a ceremonial kick waits for real wall positions, the referee, and the physical run-up', () => {
  for (const second of [false, true]) {
    const m = game(91, second), x = atDepth(m, 83), y = CY + 2, [offender] = out(m, 1), [victim] = out(m, 0);
    park(offender, x + .1, y); park(victim, x - .1, y);
    Object.assign(m.ball, { x, y, owner: victim });
    m.rnd = () => .85; m.choiceRnd = () => .99;
    m.foul(offender, victim);
    const sp = m.setpiece;
    assert.ok(sp.managed && sp.dangerous && sp.wall.length >= 4);
    assert.ok(sp.wall.every(p => p.team !== 0 && p.role !== 'GK'));
    assert.ok(sp.wall.every(p => Math.hypot(p.tx - x, p.ty - y) >= FREE_DISTANCE));
    assert.ok(sp.wall.slice(1).every((p, i) => Math.abs(Math.hypot(p.tx - sp.wall[i].tx, p.ty - sp.wall[i].ty) - 1.19) < .025));
    m.phaseTimer = .025;
    const signals = new Set();
    m.step(STEP);
    assert.equal(m.phase, 'freekick'); assert.equal(latest(m, 'restartwhistle'), undefined);
    const flight = afterRelease(m, sp, m => signals.add(m.snapshotFrame().referee.signal?.kind));
    for (const kind of ['direction', 'wait', 'whistle']) assert.ok(signals.has(kind), kind);
    assert.ok(sp.wall.every(p => Math.hypot(p.x - p.tx, p.y - p.ty) <= .57));
    assert.ok(m.restartSpaceReady(sp));
    assert.ok(Math.hypot(sp.taker.x - x, sp.taker.y - y) <= .89);
    assert.equal(flight.restartId, sp.id);
    assert.ok(latest(m, 'foul').elapsed < latest(m, 'restartwhistle').elapsed);
    assert.ok(latest(m, 'restartwhistle').elapsed < latest(m, 'restartkick').elapsed);
  }
});

test('taking an open short option quickly does not wait for a wall or whistle', () => {
  const m = game(12), [p, receiver] = out(m, 0), [q, line] = out(m, 1);
  for (const player of m.playersCache) if (player !== p && player !== receiver && player !== q) park(player, 27, player.team ? 12 : 20);
  park(p, 81, CY + .3); park(receiver, 84, CY + 9); park(q, 81.7, CY - 1.0);
  park(line, 88, CY - 14); park(m.gk(m.teams[1]), 103, CY);
  Object.assign(m.ball, { x: 81.3, y: CY, owner:p });
  m.rnd = () => .8; m.choiceRnd = () => .001;
  m.foul(q, p);
  const sp = m.setpiece;
  assert.ok(sp.dangerous && sp.quick && !sp.managed);
  assert.equal(sp.taker, p);
  assert.equal(sp.wall.length, 0);
  const f = afterRelease(m, sp);
  assert.equal(f.kind, 'pass');
  assert.equal(f.intended, receiver);
  assert.equal(latest(m, 'restartwhistle'), undefined);
  assert.ok(m.elapsed - sp.awardedAt < 1.8);
});

test('defending a wide kick with one or two players is distinct from deep and central kicks', () => {
  for (const [attack, x] of [[1, L], [-1, 0]]) {
    const wide = S.freeKickShape({ x: x - attack * 16.8, y: CY - 23 }, attack);
    assert.ok(wide.wide && wide.dangerous && !wide.shotLane);
    assert.equal(wide.wall.length, 2);
    const center = S.freeKickShape({ x: x - attack * 19, y: CY + 1 }, attack);
    assert.equal(center.wall.length, 5);
    const deeper = S.freeKickShape({ x: x - attack * 44, y: CY - 12 }, attack);
    assert.equal(deeper.wall.length, 0);
    assert.equal(deeper.dangerous, false);
  }
});

test('penalty players and goalkeeper actually reach their legal release positions', () => {
  const m = game(13, true), x = atDepth(m, L - 9), y = CY + 6;
  const [p] = out(m, 0), [q] = out(m, 1), keeper = m.gk(m.teams[1]);
  park(p, x, y); park(q, x - .13, y + .2); park(keeper, BOX_L - 1, CY + 8);
  Object.assign(m.ball, { x, y, owner: p }); m.rnd = () => .8;
  m.foul(q, p);
  const sp = m.setpiece, signals = new Set();
  assert.equal(sp.type,"penalty");
  m.phaseTimer = 0;
  const f = afterRelease(m, sp, m => signals.add(m.referee.pose(m).signal?.kind));
  assert.ok(signals.has('penalty') && signals.has('whistle'));
  assert.ok(f.pen && f.shooter === sp.taker);
  assert.ok(m.onGoalLine(keeper));
  assert.ok(m.restartSpaceReady(sp));
  assert.ok(Math.hypot(sp.taker.x - sp.x, sp.taker.y - sp.y) < .90);
  assert.equal(m.ball.x, atDepth(m, L - 11));
  assert.equal(m.ball.y, CY);
});

test('penalty skill shifts conversion rather than guaranteeing a goal', () => {
  const outcomes = [new Map(), new Map()];
  for (const [i, skill] of [[0, 6], [1, 20]]) {
    for (let seed = 11; seed < 211; seed++) {
      const m = game(seed), [p] = out(m, 0), keeper = m.gk(m.teams[1]);
      const sp = m.startSetPiece('penalty', 0, L - 10, CY, { taker: p });
      Object.assign(p.attrs, { shooting: skill, penalties: skill, composure: skill });
      park(p, sp.x - .8, CY); park(keeper, L, CY);
      // Isolate taker and keeper to measure this mechanism, not fixture strength.
      m.playersCache = [p, keeper];
      m.executeSetPiece();
      const shot = m.shotMap[0];
      for (let j = 0; j < 160 && shot.outcome === 'pending'; j++) m.step(STEP);
      outcomes[i].set(shot.outcome, (outcomes[i].get(shot.outcome) ?? 0) + 1);
    }
  }
  const [weaker, elite] = outcomes;
  assert.ok(elite.get('goal') - weaker.get('goal') >= 25, JSON.stringify(outcomes.map(o => [...o])));
  assert.ok(elite.get('miss') > 0 && elite.get('save') > 0 && elite.get('goal') < 200);
});
