'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const P = require('../src/physics.js');
const { Match, L, W, CX, CY } = require('../src/engine.js');
const { CLUBS } = require('../src/data.js');
const H = 1 / 40;

const ballAt = (x, y, z = 0) => ({ x, y, z, vx: 0, vy: 0, vz: 0, ax: 0, ay: 0, bounces: 0 });
const close = (actual, expected, tolerance = 1e-6) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≉ ${expected}`);

test('a weighted ground pass slows to its requested arrival pace, then rolls to a stop', () => {
  const ball = ballAt(25, 17, .06);
  const t = P.ground(ball, 39, 25, 6.3);
  const start = Math.hypot(ball.vx, ball.vy);
  assert.ok(start > 6.3 && t > 1);
  P.advance(ball, t);
  close(ball.x, 39); close(ball.y, 25); close(ball.z, 0);
  close(Math.hypot(ball.vx, ball.vy), 6.3);
  P.advance(ball, 8);
  assert.ok(ball.x > 39 && ball.y > 25);
  assert.deepEqual([ball.vx, ball.vy, ball.vz, ball.z], [0, 0, 0, 0]);
});

test('chips, crosses and long balls rise, descend and bounce on the grass', () => {
  for (const leg of [
    { dx: 15, dy: 3, time: 1.35, minZ: 1.9 },
    { dx: 8, dy: 26, time: 1.95, minZ: 4.4 },
    { dx: 49, dy: -6, time: 2.8, minZ: 9.3 }
  ]) {
    const ball = ballAt(20, 26, .09), x = ball.x + leg.dx, y = ball.y + leg.dy;
    P.aerial(ball, x, y, leg.time, 0, .65);
    const before = { ...ball };
    const peak = P.forecast(ball, leg.time / 2);
    const landing = P.forecast(ball, leg.time);
    assert.deepEqual(ball, before, 'forecast must not advance the live ball');
    assert.ok(peak.z >= leg.minZ);
    assert.ok(P.forecast(ball, leg.time * .85).z < peak.z);
    close(landing.x, x); close(landing.y, y); close(landing.z, 0);
    P.advance(ball, leg.time + .15);
    assert.ok(ball.bounces === 1 && ball.z > .05);
    assert.ok(Math.hypot(ball.vx, ball.vy) < Math.hypot(before.vx, before.vy));
    P.advance(ball, 12);
    close(ball.z, 0); close(Math.hypot(ball.vx, ball.vy), 0);
  }
});

test('line crossings use the first complete exit and carry the crossing height', () => {
  const before = { x: L - .30, y: W - .5, z: 2.4 };
  const after = { x: L + .80, y: W + .2, z: 1.8 };
  const exit = P.firstExit(before, after, L, W);
  assert.equal(exit.axis, 'x'); assert.equal(exit.line, L);
  close(exit.x, L + P.RADIUS);
  close(exit.z, 2.4 - .6 * (exit.x - before.x) / (after.x - before.x));
  assert.equal(P.firstExit(before, { x: L + .02, y: W - .1, z: 1.8 }, L, W), null);
});

test('a player accelerates, then brakes into a support position without snapping', () => {
  const m = new Match(CLUBS[1], CLUBS[0], { seed: 42 });
  const p = m.onPitchPlayers().find(q => q.role === 'CM');
  p.x = 20; p.y = 9; p.tx = 36; p.ty = 9; p.sprint = true;
  m.playersCache = [p];
  m.movePlayers(H, false);
  assert.ok(p.vx > .1 && p.vx < .26 && p.x < 20.01);
  let peak = 0, crossing = false;
  for (let i = 0; i < 160; i++) {
    const old = p.vx;
    m.movePlayers(H, false);
    assert.ok(Math.abs(p.vx - old) < .23, 'per-tick acceleration cap');
    crossing ||= p.x >= 36;
    peak = Math.max(peak, p.vx);
  }
  assert.ok(peak > 5.5, 'move turns into a run');
  assert.ok(p.x > 35.8 && p.x < 36.2 && Math.abs(p.vx) < .2, `did not settle: x=${p.x}; speed=${p.vx}; crossed=${crossing}`);
});

test('seeded live play produces a cross, a high clearance and ordered replay heights', { timeout: 5000 }, () => {
  const frames = [], releases = new Set();
  const m = new Match(CLUBS[1], CLUBS[0], { seed: 710, onSnapshot: snap => frames.push(snap) });
  for (let i = 0; i < 40 * 130; i++) {
    m.step(H);
    if (m.ball.flight) releases.add(m.ball.flight.technique);
  }
  assert.ok(releases.has('ground') && releases.has('cross') && releases.has('clearance'));
  assert.ok(frames.some(s => s.arr[s.n * 2 + 2] > 3), '3D ball height is retained');
  for (let i = 1; i < frames.length; i++) {
    const a = frames[i - 1], b = frames[i];
    assert.ok(b.elapsed > a.elapsed);
    assert.equal(b.arr.length, b.n * 2 + 4);
    assert.equal(new Set(b.ids).size, b.n);
    assert.ok(b.arr.every(Number.isFinite));
  }
  const snap = m.snapshotFrame();
  m.ball.z += 123;
  assert.ok(snap.arr[snap.n * 2 + 2] < 30, 'held replays are not mutated with the live ball');
});

test('a goal retains the shooter, assist, and shot outcome as the ball settles in the net', () => {
  const m = new Match(CLUBS[1], CLUBS[0], { seed: 7 });
  const p = m.teams[0].slots.find(s => s.role === 'ST').player;
  const assist = m.teams[0].slots.find(s => s.role === 'CM').player;
  p.x = L - 8; p.y = CY; p.dir = 0;
  Object.assign(m.ball, ballAt(p.x + .5, CY), { owner: p, lastTouch: p });
  m.lastPass = { player: assist, receiver: p, t: m.elapsed, team: p.team };
  m.phase = 'open';
  const f = m.doShot(p);
  // Hold this fixture on a known on-target line so the test is about resolution, not shot RNG.
  P.aerial(m.ball, L + P.RADIUS + .014, CY, .40, .38);
  for (let i = 0; i < 20 && m.phase === 'open'; i++) m.updateBall(H);
  assert.equal(m.phase, 'goal');
  assert.equal(f.shot.outcome, 'goal');
  assert.equal(m.teams[0].score, 1);
  assert.equal(m.teams[0].stats.onTarget, 1);
  assert.equal(m.lastGoal.scorer, p.name);
  assert.equal(m.lastGoal.assist, assist.name);
  assert.ok(m.lastGoal.xg > 0);
  for (let i = 0; i < 44; i++) m.settleNet(H);
  assert.ok(m.ball.x > L && m.ball.x < L + 2.4);
  assert.ok(m.ball.z < .1);
});
