'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Match, L, W, CY, GOAL_H } = require('../src/engine.js');
const { CLUBS, genSquad, defaultTactics, bestXI, seedFor } = require('../src/data.js');
const { APRON_END, APRON_SIDE } = require('../src/pitch.js');
const P = require('../src/physics.js');
const { STEP } = require('../src/highlights.js');

const clubs = [CLUBS[1], CLUBS[4]];
const fixture = opts => new Match(...clubs, { seed: 124, ...opts });
const rendered = m => {
  const f = m.snapshotFrame();
  return Array.from(f.arr.slice(f.n*2, f.n*2+3));
};
const launch = (m, props) => {
  Object.assign(m, { phase: 'open', brainIn: 1 });
  Object.assign(m.ball, { owner: null, flight: null, lastTouch: m.teams[1].slots[0].player,
    z: 0, vx: 0, vy: 0, vz: 0, ax: 0, ay: 0, ...props });
};

function watchCollection(m, depth, wanted) {
  const sp = m.setpiece;
  let peak = 0, outsideTicks = 0, handover = false;
  for (let i = 0; i < 400 && !sp.runoff.finished; i++) {
    const before = rendered(m);
    m.step(STEP);
    assert.equal(m.setpiece, sp, 'the dead ball is recovered before the normal release');
    const after = rendered(m);
    assert.ok(Math.hypot(after[0]-before[0], after[1]-before[1]) < 1, 'no teleport between rendered frames');
    peak = Math.max(peak, depth(after));
    if (depth(after) > .35) outsideTicks++;
    handover ||= m.snapshotFrame().carried > .3;
    assert.equal(m.ball.x, sp.x, 'only the view moves; the legal restart spot does not');
    assert.equal(m.ball.y, sp.y);
    assert.equal(m.ball.owner, null);
  }
  assert.ok(sp.runoff.finished, 'retrieval settles during setup');
  assert.ok(peak > wanted, `visible runoff depth ${peak.toFixed(2)} m`);
  assert.ok(outsideTicks >= 12, 'remains clearly out of bounds across frames');
  assert.ok(handover, 'retrieval pose is kept in recorded footage');
  const [x,y,z] = rendered(m);
  assert.ok(Math.abs(x-sp.x) < .001 && Math.abs(y-sp.y) < .001 && z === 0);
  return peak;
}

test('a ball carries its actual motion beyond either touchline and is returned to the throw spot', () => {
  for (const yLine of [0, W]) {
    const m = fixture(), sign = yLine === 0 ? -1 : 1;
    launch(m, { x: 21, y: yLine, vx: 1.5, vy: sign });
    m.updateBall(STEP);
    assert.equal(m.phase, 'open', 'just overlapping the line is not out');
    Object.assign(m.ball, { vx: 1.5, vy: sign*17 });
    const before = rendered(m);
    m.step(STEP);
    assert.equal(m.phase, 'throwin');
    assert.equal(m.setpiece.team, 0);
    assert.equal(m.setpiece.y, yLine);
    assert.ok((rendered(m)[1] - yLine)*sign > P.RADIUS);
    assert.ok(Math.hypot(rendered(m)[0]-before[0], rendered(m)[1]-before[1]) < .55);
    const peak = watchCollection(m, ([, y]) => (y-yLine)*sign, 5);
    assert.ok(peak <= APRON_SIDE + .0001);
    while (m.phase === 'throwin' && m.elapsed < 20) m.step(STEP);
    assert.equal(m.lastRestart.type, 'throwin', 'the throw still actually takes place');
    assert.equal(m.events.filter(e => e.type === 'throwin').length, 1);
  }
});

test('the same visible ball rolls deep behind the goal line for a corner, in either half', () => {
  for (const half of [1, 2]) {
    const m = fixture();
    if (half === 2) { m.phase = 'halftime'; m.continueSecondHalf(); }
    const sign = m.teams[0].attackDir, xLine = sign > 0 ? L : 0;
    launch(m, { x: xLine - sign*.20, y: 19, vx: sign*30, vy: 3 });
    m.step(STEP);
    assert.equal(m.phase, 'corner');
    assert.equal(m.setpiece.team, 0);
    assert.ok((rendered(m)[0]-xLine)*sign > P.RADIUS);
    assert.ok(Math.abs(m.ball.x-xLine) < .5 && Math.abs(m.ball.y) < .5);
    const peak = watchCollection(m, ([x]) => (x-xLine)*sign, 9);
    assert.ok(peak <= APRON_END + .0001);
    assert.equal(m.teams[0].stats.corners, 0, 'awarding a corner is not taking it');
    while (m.phase === 'corner' && m.t < 32) m.step(STEP);
    assert.equal(m.lastRestart.type, 'corner');
    assert.equal(m.teams[0].stats.corners, 1);
  }
});

test('a shot over the bar retains its height and velocity when a goal kick is awarded', () => {
  const m = fixture(), shooter = m.teams[0].slots.at(-1).player;
  Object.assign(shooter, { x: L-9.5, y: CY });
  launch(m, { x: shooter.x, y: shooter.y, owner: shooter, lastTouch: shooter });
  const shot = m.doShot(shooter);
  m.playersCache = [shooter];
  P.aerial(m.ball, L+.15, CY, .39, GOAL_H+.88);
  for (let i = 0; i < 30 && m.phase === 'open'; i++) m.step(STEP);
  assert.equal(shot.shot.outcome, 'miss');
  assert.equal(m.phase, 'goalkick');
  assert.equal(m.setpiece.team, 1);
  assert.ok(rendered(m)[0] > L && rendered(m)[2] > GOAL_H);
  watchCollection(m, ([x]) => x-L, 8);
  assert.equal(m.teams[0].score, 0);
  assert.equal(m.events.filter(e => e.type === 'goalkick').length, 1);
});

test('both dugouts retain their seats in older footage after a listed substitution', () => {
  const lineups = clubs.map(c => {
    const { xi, bench } = bestXI(genSquad(c, seedFor(c.id)), defaultTactics(c.style).formation);
    return { xi, bench: bench.slice(0, 6) };
  });
  const m = fixture({ lineups });
  const original = m.snapshotFrame(), team = m.teams[1];
  assert.deepEqual(original.dugouts.map(d => d.length), [6, 6]);
  for (const [i, d] of original.dugouts.entries()) assert.deepEqual(d.map(s => s.id), lineups[i].bench.map(p => p.id));
  const seat = team.bench.findIndex(p => p.pos !== 'GK'), entering = team.bench[seat], exiting = team.slots[1].player;
  assert.ok(m.substitute(team.idx, exiting.id, entering.id).ok);
  const live = m.snapshotFrame();
  assert.deepEqual(original.dugouts[1][seat], { id: entering.id, used: false });
  assert.deepEqual(live.dugouts[1][seat], { id: exiting.id, used: true });
  assert.deepEqual(live.dugouts[0], original.dugouts[0]);
  assert.ok(live.ids.includes(entering.id) && !live.ids.includes(exiting.id));
  assert.ok(!team.bench.some(p => p.id === exiting.id));
  m.phase = 'halftime'; m.continueSecondHalf();
  assert.deepEqual(m.snapshotFrame().dugouts, live.dugouts);
});
