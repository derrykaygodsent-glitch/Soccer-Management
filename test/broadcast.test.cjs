'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { NORMAL_SPEED, SPEEDS, matchSeconds, speedFor, restartAt } = require('../src/broadcast.js');
const { STEP } = require('../src/highlights.js');

test('finer viewing speeds are real multipliers, with 1× remaining real time', () => {
  assert.equal(NORMAL_SPEED, 1);
  assert.deepEqual(SPEEDS, [.75, 1, 1.25, 1.5, 1.75, 2, 4]);
  for (const wall of [0, .016, STEP, .1, 1, 10]) {
    for (const rate of SPEEDS) assert.equal(matchSeconds(wall, rate), wall * rate);
  }
});

test('absent or invalid speed settings fall back to real time', () => {
  for (const bad of [undefined, NaN, Infinity, null, 0, -1, 3]) {
    assert.equal(speedFor(bad), NORMAL_SPEED);
    assert.equal(matchSeconds(5, bad), 5);
  }
});

test('the active set piece is shown during setup, cards and the taker’s windup', () => {
  for (const type of ['freekick', 'corner', 'throwin', 'goalkick', 'penalty']) {
    const sp = { type, stage: 'setup' };
    const match = { phase: type, setpiece: sp, elapsed: 10, ball: {} };
    assert.equal(restartAt(match), sp);
    sp.stage = 'windup';
    assert.equal(restartAt(match), sp);
    match.phase = 'review';
    assert.equal(restartAt(match), null, 'a VAR review is not a visible restart');
  }
});

test('a restart caption follows the delivery, not unrelated play', () => {
  const restart = { id: 5, type: 'throwin', takenAt: 20 };
  const match = { phase: 'open', lastRestart: restart, ball: {}, elapsed: 21 };
  assert.equal(restartAt(match, 5.5), restart);
  match.elapsed = 27;
  assert.equal(restartAt(match, 5.5), null);
  match.ball.flight = { kind: 'throw', restartId: 5 };
  assert.equal(restartAt(match, 5.5), restart);
  match.ball.flight = { kind: 'cross', restartId: 7 };
  assert.equal(restartAt(match, 5.5), null);
});
