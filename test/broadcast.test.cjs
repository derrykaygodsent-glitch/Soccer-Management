'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { L, CX, CY } = require('../src/engine.js');
const { Clock, targetPace } = require('../src/broadcast.js');
const { STEP, indexAt } = require('../src/highlights.js');

function match() {
  return { elapsed: 0, phase: 'open', controlTeam: 0, teams: [{ attackDir: 1 }, { attackDir: -1 }], ball: { x: CX, y: CY, z: 0 } };
}

test('the shared broadcast moves routine play along and keeps attacks readable in either direction', () => {
  const m = match();
  const routine = targetPace(m);
  assert.ok(routine >= 4 && routine <= 4.70, 'routine play is slower than the previous 5.35 pace');
  m.ball.x = L - 17;
  const attack = targetPace(m);
  assert.ok(attack < routine);
  m.controlTeam = 1; m.ball.x = 17;
  assert.equal(targetPace(m), attack);
  m.ball.flight = { kind: 'shot' };
  assert.ok(targetPace(m) < 1.9 && targetPace(m) < attack, 'shots are slower than v0.4.5');
  m.ball.x = CX; m.ball.flight = { kind: 'pass' }; m.ball.z = 8;
  assert.ok(targetPace(m) < routine, 'an aerial delivery gets time on screen');
  m.phase = 'penalty';
  assert.ok(targetPace(m) < attack);
});

test('the broadcast clock integrates fixed ticks and preserves the timestamp of a buffered event', () => {
  const m = match(), clock = new Clock(m);
  const quietRate = clock.pace;
  assert.equal(clock.time, 0);
  m.phase = 'penalty';
  m.elapsed += STEP;
  const stamp = clock.stamp(m.elapsed);
  clock.observe(m);
  assert.equal(clock.time, stamp);
  assert.ok(clock.pace < quietRate && clock.pace > targetPace(m), 'a change of tempo eases in');
  const frames = [{ elapsed: 0, screen: 0 }, { elapsed: m.elapsed, screen: stamp }];
  for (let i = 0; i < 40; i++) {
    m.elapsed += STEP;
    const time = clock.stamp(m.elapsed);
    clock.observe(m);
    assert.equal(clock.time, time);
    assert.ok(time > frames.at(-1).screen);
    frames.push({ elapsed: m.elapsed, screen: time });
  }
  const goal = frames.at(-1);
  assert.ok(indexAt(frames, goal.screen - .001, 'screen') < frames.length - 1);
  assert.equal(indexAt(frames, goal.screen, 'screen'), frames.length - 1);
  assert.ok(clock.time > m.elapsed / quietRate, 'slower moments take longer to display without changing match time');
});
