'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Match, L, W, CY, BOX_L, BOX_HALF, PEN } = require('../src/engine.js');
const { CLUBS } = require('../src/data.js');
const P = require('../src/physics.js');
const H = require('../src/highlights.js');
const STEP = H.STEP;

function match(half = 1) {
  const m = new Match(CLUBS[1], CLUBS[0], { seed: 53 });
  if (half === 2) { m.phase = 'halftime'; m.continueSecondHalf(); }
  Object.assign(m, { phase: 'open', t: 50, elapsed: 50 + (half - 1) * 2700 });
  m.rnd = () => .75;
  return m;
}
const direction = m => m.teams[0].attackDir;
const xFromGoal = (m, d) => direction(m) > 0 ? L - d : d;
const pick = (m, team, role) => m.teams[team].slots.find(s => s.role === role).player;
const events = (m, type) => m.events.filter(e => e.type === type);
const finishReview = m => {
  assert.equal(m.phase, 'review');
  for (let i = 0; i < 12 / STEP && m.phase === 'review'; i++) m.step(STEP);
  assert.notEqual(m.phase, 'review');
  assert.equal(m.review, null);
  return events(m, 'varresult').at(-1);
};
function contact(m, distance, ballDistance = distance, y = CY) {
  const foul = pick(m, 1, 'DC'), victim = pick(m, 0, 'ST');
  Object.assign(foul, { x: xFromGoal(m, distance - .17), y: y + .1 });
  Object.assign(victim, { x: xFromGoal(m, distance + .17), y: y - .1 });
  Object.assign(m.ball, { owner: victim, lastTouch: victim, x: xFromGoal(m, ballDistance), y });
  return { foul, victim };
}

function crossLine(m, lastTouch, sideY = 3) {
  const line = xFromGoal(m, 0), d = direction(m);
  Object.assign(m.ball, { owner: null, lastTouch, x: line - d * .035, y: sideY, z: .1, vx: d * 10, vy: 0, vz: 0, ax: 0, ay: 0 });
  m.updateBall(STEP);
}

function finishFlight(m, y, onFrame) {
  const { ball } = m, line = xFromGoal(m, 0), f = ball.flight;
  assert.equal(f.kind, 'shot');
  f.onFrame = onFrame;
  P.aerial(ball, line + direction(m) * (P.RADIUS + .02), y, .61, .38);
  for (let i = 0; i < 85 && m.phase === 'open' && ball.flight === f; i++) {
    m.elapsed += STEP; m.t += STEP; m.updateBall(STEP);
  }
  assert.notEqual(f.shot.outcome, 'pending', 'flight resolved before the watchdog');
  return f;
}

test('a real tackle outside the box is whistled once and a direct free kick is taken from the foul spot', () => {
  for (const half of [1, 2]) {
    const m = match(half), { foul, victim } = contact(m, 20);
    const keeper = pick(m, 1, 'GK');
    m.playersCache = [foul, victim, keeper];
    // First two draws select the attempted tackle, the third makes it a foul.
    const rolls = [.45, .2, .01, .8];
    m.rnd = () => rolls.shift() ?? .8;
    m.interactions(STEP);
    assert.equal(m.phase, 'freekick');
    assert.equal(m.setpiece.team, victim.team);
    assert.equal(m.setpiece.x, xFromGoal(m, 20));
    assert.equal(m.setpiece.y, CY);
    assert.equal(m.setpiece.direct, true);
    assert.equal(events(m, 'foul').length, 1);
    assert.equal(m.teams[1].stats.fouls, 1);
    assert.equal(m.ball.owner, null);
    assert.equal(events(m, 'pen').length, 0);
    assert.ok(Math.abs(m.ball.vx) + Math.abs(m.ball.vy) < 1e-8);
    assert.ok(m.teams[1].slots.filter(s => s.player.spRole === 'wall').every(({ player }) => Math.hypot(player.tx - m.ball.x, player.ty - CY) >= 9.15 - 1e-6));
    m.executeSetPiece();
    assert.equal(m.phase, 'open');
    assert.equal(m.ball.flight.fk, true);
    assert.equal(m.ball.flight.pen, false);
    assert.equal(m.setpiece, null);
  }
});

test('a deeper foul restarts with a pass; replacing the taker during a stoppage transfers the kick', () => {
  const m = match(), { foul, victim } = contact(m, 46);
  m.foul(foul, victim);
  const old = m.setpiece.taker, sub = m.teams[0].bench.find(p => p.pos !== 'GK');
  assert.equal(m.phase, 'freekick');
  assert.equal(m.setpiece.direct, false);
  assert.equal(m.setpiece.indirect, undefined);
  assert.ok(m.substitute(0, old.id, sub.id).ok);
  assert.equal(m.setpiece.taker, sub);
  assert.equal(sub.spRole, 'taker');
  m.executeSetPiece();
  assert.equal(m.ball.flight.from, sub);
  assert.equal(m.ball.flight.kind, 'pass');
  assert.equal(m.ball.flight.indirectRestart, false);
  assert.equal(old.onPitch, false);
});

test('corner versus goal kick uses the last touch and the whole ball crossing, in both directions', () => {
  for (const half of [1, 2]) {
    const m = match(half), def = pick(m, 1, 'DC'), atk = pick(m, 0, 'ST');
    const line = xFromGoal(m, 0), sideY = half === 1 ? 5 : W - 5;
    Object.assign(m.ball, { owner: null, lastTouch: def, x: line, y: sideY, z: 0, vx: direction(m), vy: 0, vz: 0 });
    m.updateBall(STEP);
    assert.equal(m.phase, 'open', 'the whole ball has not crossed yet');
    crossLine(m, def, sideY);
    assert.equal(m.phase, 'corner');
    assert.equal(m.setpiece.team, 0);
    assert.ok(Math.hypot(m.ball.x - line, m.ball.y - (half === 1 ? 0 : W)) < 1, 'placed within the correct corner arc');
    assert.equal(events(m, 'corner').length, 1);
    m.executeSetPiece();
    assert.equal(m.ball.flight.technique, 'cross');
    assert.equal(m.ball.flight.offsideCheck, false, 'no offside directly from a corner');
    assert.equal(m.teams[0].stats.corners, 1);
    m.ball.flight = null;
    crossLine(m, atk, sideY);
    assert.equal(m.phase, 'goalkick');
    assert.equal(m.setpiece.team, 1);
    assert.equal(m.setpiece.taker.role, 'GK');
    m.executeSetPiece();
    assert.equal(m.ball.flight.offsideCheck, false, 'no offside directly from a goal kick');
    assert.equal(m.teams[0].stats.corners, 1);
  }
});

test('penalty placement, goal, save and miss are resolved by the live ball with consistent stats', () => {
  for (const outcome of ['goal', 'save', 'miss']) {
    const m = match(outcome === 'save' ? 2 : 1), { foul, victim } = contact(m, 11.5);
    m.foul(foul, victim);
    assert.equal(m.phase, 'penalty');
    assert.equal(m.ball.x, xFromGoal(m, PEN));
    assert.equal(m.ball.y, CY);
    assert.equal(events(m, 'pen').length, 1);
    const keeper = pick(m, 1, 'GK'), taker = m.setpiece.taker;
    assert.equal(keeper.tx, xFromGoal(m, 0));
    for (const p of m.playersCache) if (p !== keeper && p !== taker) {
      assert.ok(direction(m) * (p.tx - m.ball.x) <= 0, 'behind the penalty mark');
      assert.ok(Math.hypot(p.tx - m.ball.x, p.ty - CY) >= 9.15, 'outside the arc');
      assert.ok(m.areaMargin(p.tx, p.ty, m.teams[1]) < 0, 'outside the penalty area');
    }
    m.executeSetPiece();
    m.playersCache = [taker, keeper];
    Object.assign(keeper, { x: xFromGoal(m, .35), y: outcome === 'save' ? CY : CY + 8 });
    m.rnd = () => .01;
    const f = finishFlight(m, outcome === 'miss' ? CY - 7 : CY, outcome !== 'miss');
    assert.equal(f.pen, true);
    assert.equal(f.shot.outcome, outcome);
    assert.equal(m.teams[0].stats.shots, 1);
    assert.equal(m.teams[0].stats.onTarget, +(outcome !== 'miss'));
    assert.equal(m.teams[1].stats.saves, +(outcome === 'save'));
    assert.equal(m.teams[0].score, +(outcome === 'goal'));
    assert.equal(events(m, outcome === 'goal' ? 'penscore' : 'penmiss').length, 1);
  }
});

test('a penalty still finishes if the allotted time expires while setting up the kick', () => {
  const m = match();
  m.addedAnnounced[0] = true; m.added[0] = 60; m.t = 2759.9;
  const { foul, victim } = contact(m, 8);
  m.foul(foul, victim);
  for (let i = 0; i < 15 / STEP && m.phase === 'penalty'; i++) m.step(STEP);
  assert.equal(m.phase, 'open');
  const { ball } = m, f = ball.flight, keeper = pick(m, 1, 'GK');
  assert.ok(m.t > 2765 && f?.pen);
  assert.ok(Math.abs(keeper.x - L) < .25, 'the keeper has reached the goal line at the kick');
  m.playersCache = [keeper, f.shooter];
  keeper.y = keeper.ty = CY + 11;
  P.aerial(ball, L + P.RADIUS + .02, CY, .55, .38);
  for (let i = 0; i < 500 && m.phase !== 'halftime'; i++) m.step(STEP);
  assert.equal(f.shot.outcome, 'goal');
  assert.equal(m.phase, 'halftime');
  assert.ok(m.events.findIndex(e => e.type === 'ht') > m.events.findIndex(e => e.type === 'penscore'));
});

for (const [label, contactDistance, ballDistance, yOffset, ruling, changed] of [
  ['outside even though the ball is inside', BOX_L + .24, BOX_L - .12, 0, 'freekick', true],
  ['inside even though the ball is outside', BOX_L - .21, BOX_L + .15, 0, 'penalty', true],
  ['on the front line', BOX_L, BOX_L - .12, 0, 'penalty', false],
  ['on the side line of the box', 12, 12, BOX_HALF, 'penalty', false]
]) {
  test(`VAR rules on contact ${label}`, () => {
    const m = match(yOffset ? 2 : 1), { foul, victim } = contact(m, contactDistance, ballDistance, CY + yOffset);
    const scout = new H.Scout(m), xy = [m.ball.x, m.ball.y];
    m.foul(foul, victim);
    assert.equal(m.phase, 'review');
    assert.equal(events(m, 'pen').length, 0, 'the kick is not awarded before review');
    assert.equal(scout.check(m), 1, 'the incident is eligible in every edited mode');
    for (const mode of Object.values(H.MODES)) assert.ok(H.holdingAction(m, mode));
    const position = foul.x;
    m.step(STEP);
    assert.equal(foul.x, position, 'play is stopped');
    assert.ok(!m.substitute(0, victim.id, m.teams[0].bench.find(p => p.pos !== 'GK').id).ok);
    const result = finishReview(m);
    assert.deepEqual([m.phase, result.ruling, result.changed, result.review], [ruling, ruling, changed, 'area']);
    assert.equal(m.teams[1].stats.fouls, 1);
    assert.equal(m.setpiece.team, 0);
    assert.equal(m.t > 50 + 5.5, true);
    assert.ok(m.reviewTime[m.half - 1] > 5.5);
    const x = ruling === 'penalty' ? xFromGoal(m, PEN) : xFromGoal(m, contactDistance);
    assert.ok(Math.abs(m.ball.x - x) < 1e-8, `restart moved from ${xy} to the correct spot`);
  });
}

function buildReview(gap, reset = false) {
  const m = match(), p = pick(m, 0, 'CM'), runner = pick(m, 0, 'ST');
  const d = pick(m, 1, 'DC'), keeper = pick(m, 1, 'GK');
  m.playersCache = [p, runner, d, keeper];
  Object.assign(p, { x: 74, y: CY }); Object.assign(d, { x: 84, y: CY - 9 });
  Object.assign(keeper, { x: L - .3, y: CY + 10 }); Object.assign(runner, { x: d.x + gap, y: CY });
  Object.assign(m.ball, { x: p.x, y: p.y, z: .04, owner: p });
  m.doPassTo(p, { target: runner, lead: { x: runner.x, y: runner.y }, technique: 'ground' });
  assert.ok(!runner.offsideFlag, 'close on-field judgement lets the move play');
  const touchX = runner.x;
  Object.assign(m.ball, { x: touchX, y: CY, vx: 1, vy: 0, z: .04 });
  m.elapsed += .42;
  m.interactions(STEP);
  assert.equal(m.ball.owner?.id, runner.id, 'the player actually took part in the attack');
  assert.ok(Math.abs(m.attackCheck.gap - gap) < 1e-8);
  if (reset) {
    m.claim(keeper, 0, true);
    assert.equal(m.attackCheck, null, 'controlled defensive possession ends the reviewed phase');
  }
  m.elapsed += 2;
  Object.assign(runner, { x: L - 8, y: CY });
  Object.assign(m.ball, { owner: runner, lastTouch: runner, x: runner.x, y: CY, z: .04 });
  const shot = m.doShot(runner);
  P.aerial(m.ball, L + P.RADIUS + .02, CY, .46, .38);
  for (let i = 0; i < 44 && m.phase === 'open'; i++) { m.elapsed += STEP; m.updateBall(STEP); }
  return { m, shot, runner, touchX };
}

test('a reviewed goal stays provisional until offside is resolved and disallowed attempts do not count', () => {
  for (const gap of [-.09, .18]) {
    const { m, shot, runner, touchX } = buildReview(gap);
    assert.equal(m.phase, 'review');
    assert.equal(shot.shot.outcome, 'pending');
    assert.equal(m.teams[0].score, 0);
    assert.equal(m.lastGoal, undefined);
    assert.equal(events(m, 'goal').length, 0);
    const result = finishReview(m);
    if (gap > 0) {
      assert.equal(result.ruling, 'offside');
      assert.equal(m.teams[0].score, 0);
      assert.equal(m.teams[0].stats.shots, 0);
      assert.equal(m.teams[0].stats.xG, 0);
      assert.equal(m.teams[0].stats.onTarget, 0);
      assert.equal(m.shotMap[0].outcome, 'disallowed');
      assert.equal(m.setpiece.team, 1);
      assert.equal(m.setpiece.indirect, true);
      assert.equal(m.ball.x, touchX);
      assert.equal(events(m, 'goal').length, 0);
    } else {
      assert.equal(result.ruling, 'goal');
      assert.equal(m.teams[0].score, 1);
      assert.equal(m.teams[0].stats.onTarget, 1);
      assert.equal(m.lastGoal.scorer, runner.name);
      assert.equal(events(m, 'goal').length, 1);
    }
  }
  const { m } = buildReview(.18, true);
  assert.equal(m.phase, 'goal', 'a later, independent goal is not overturned');
  assert.equal(events(m, 'varcheck').length, 0);
});

test('a throw or indirect free kick cannot score directly without a second player touching the ball', () => {
  for (const type of ['throwin', 'freekick']) {
    const m = match();
    m.startSetPiece(type, 0, L - 17, type === 'throwin' ? .3 : CY, { indirect: type === 'freekick' });
    m.executeSetPiece();
    assert.equal(m.ball.flight.indirectRestart, true);
    if (type === 'throwin') assert.equal(m.ball.flight.offsideCheck, false);
    crossLine(m, m.ball.flight.from, CY);
    assert.equal(m.teams[0].score, 0);
    assert.equal(m.phase, 'goalkick');
    assert.equal(m.setpiece.team, 1);
  }
});

test('a second caution sends the offender off before the free kick, not after it', () => {
  const m = match(), { foul, victim } = contact(m, 28);
  foul.yellow = 1; m.teams[1].stats.yellow = 1;
  m.rnd = () => .18;
  m.foul(foul, victim);
  assert.equal(m.teams[1].stats.yellow, 2);
  assert.equal(m.teams[1].stats.red, 1);
  assert.equal(m.teams[1].stats.fouls, 1);
  assert.equal(events(m, 'red').at(-1).reason, 'second yellow');
  assert.ok(!m.playersCache.includes(foul));
  assert.equal(m.phase, 'freekick');
  assert.equal(m.setpiece.team, 0);
});

test('a VAR stop in added time is resolved before the half ends', () => {
  const m = match(), { foul, victim } = contact(m, BOX_L + .2, BOX_L - .1);
  m.added[0] = 60; m.addedAnnounced[0] = true; m.t = 2759.925;
  m.foul(foul, victim);
  const result = finishReview(m);
  assert.equal(result.ruling, 'freekick');
  assert.ok(Math.abs(m.added[0] - 60 - m.reviewTime[0]) < 1e-8);
  assert.equal(events(m, 'ht').length, 0);
  for (let i = 0; i < 10 && m.phase !== 'halftime'; i++) m.step(STEP);
  assert.equal(m.phase, 'halftime');
  assert.equal(events(m, 'ht').length, 1);
});

test('dismissal leaves a side short-handed, including when a keeper has to be replaced', () => {
  const m = match(), keeper = pick(m, 1, 'GK');
  m.sendOff(keeper, 'serious foul');
  const deputy = m.gk(m.teams[1]);
  assert.equal(keeper.onPitch, false);
  assert.equal(m.teams[1].stats.red, 1);
  assert.equal(deputy.role, 'GK');
  assert.equal(deputy.onPitch, true);
  assert.equal(m.teams[1].slots.length, 10);
  const benchKeeper = m.teams[1].bench.find(p => p.pos === 'GK');
  assert.ok(m.substitute(1, deputy.id, benchKeeper.id).ok);
  assert.equal(m.gk(m.teams[1]).id, benchKeeper.id);
  assert.equal(m.teams[1].slots.length, 10);
});
