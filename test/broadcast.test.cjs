'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { matchSeconds, restartAt } = require('../src/broadcast.js');
const { STEP } = require('../src/highlights.js');

test('1× is real time, and 2× and 4× scale the same visible footage', () => {
  for (const wall of [0, .016, STEP, .1, 1, 10]) {
    assert.equal(matchSeconds(wall, 1), wall);
    assert.equal(matchSeconds(wall, 2), wall * 2);
    assert.equal(matchSeconds(wall, 3), wall * 4);
  }
  assert.equal(matchSeconds(5), 5, 'an absent or invalid setting defaults to real time');
  assert.equal(matchSeconds(5, 4), 5);
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
