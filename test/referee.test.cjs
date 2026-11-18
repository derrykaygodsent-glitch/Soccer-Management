'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Match, L, W, CX, CY } = require('../src/engine.js');
const { CLUBS } = require('../src/data.js');
const { Referee, between } = require('../src/referee.js');

const h = .025;

test('the referee starts off the centre spot and follows play without teleporting', () => {
  const ref = new Referee(), initial = ref.current;
  assert.ok(Math.hypot(initial.x - CX, initial.y - CY) > 8);
  const ball = Object.freeze({ x: 90, y: 8 });
  const player = Object.freeze({ x: 77, y: 42 });
  const match = { elapsed: 0, phase: 'open', ball, controlTeam: 0, teams: [{ attackDir: 1 }], playersCache: [player] };
  let last = ref.current;
  for (let i = 1; i <= 200; i++) {
    match.elapsed = i * h * 2;
    const now = ref.track(match);
    assert.ok(Math.hypot(now.x - last.x, now.y - last.y) <= 6.201 * h * 2);
    assert.ok(now.x > 0 && now.x < L && now.y > 0 && now.y < W);
    last = now;
  }
  assert.ok(last.x > initial.x + 12);
  assert.deepEqual(initial, { elapsed: 0, x: CX - 6.5, y: CY + 12 }, 'saved frames do not move when the live referee moves');
  assert.deepEqual(ref.view(last.elapsed), { x: last.x, y: last.y });
  assert.deepEqual(between({x: 19, y: 23}, {x: 21, y: 25}, .5), {x: 20, y: 24});
  assert.equal(ref.track(match), last, 'the same tick cannot advance the referee twice');
});

test('the visual referee does not enter the player roster or change match events or stats', () => {
  const control = new Match(CLUBS[1], CLUBS[0], { seed: 231 });
  const ref = new Referee();
  const observed = new Match(CLUBS[1], CLUBS[0], { seed: 231, onSnapshot(snap) {
    snap.referee = ref.track(observed);
  } });
  for (let i = 0; i < 40 * 92; i++) { control.step(h); observed.step(h); }
  assert.ok(Math.hypot(ref.current.x - CX, ref.current.y - CY) > 3);
  assert.deepEqual(observed.snapshotFrame(), control.snapshotFrame());
  assert.deepEqual(observed.teams.map(t => [t.score, t.stats]), control.teams.map(t => [t.score, t.stats]));
  assert.deepEqual(observed.events.map(e => e.text), control.events.map(e => e.text));
});
