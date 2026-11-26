'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Match, L, CY, BOX_L, BOX_HALF } = require('../src/engine.js');
const { CLUBS } = require('../src/data.js');
const { Renderer } = require('../src/render.js');
const SeasonMatch = require('../src/season-match.js');

const game = seed => new Match(CLUBS[1], CLUBS[0], { seed });
const player = (m, team, role) => m.teams[team].players.find(p => p.role === role);

test('reported open-play xG is calibrated to observed goals while retaining the raw shot-model input', () => {
  const m = game(300), shooter = player(m, 0, 'ST'), d = m.teams[0].attackDir, gx = d > 0 ? L : 0;
  assert.ok(m.calibrateXG(.30) < .12 && m.calibrateXG(.30) > .08);
  assert.ok(m.calibrateXG(.30) > m.calibrateXG(.10), 'better raw chances remain better after calibration');
  Object.assign(m.ball, { x: gx - d * 12, y: CY, z: .12, owner: shooter, lastTouch: shooter });
  const flight = m.doShot(shooter);
  assert.ok(flight.modelXG > flight.xG, 'the keeper model retains its original input while the reported xG is calibrated');
  assert.equal(flight.shot.xg, flight.xG);
  assert.equal(m.teams[0].stats.xG, flight.xG);
});

function receiverScene({ control = 10, pressure = 1.2, speed = 14 } = {}) {
  const m = game(301), carrier = player(m, 0, 'CM'), passer = player(m, 0, 'ST'), marker = player(m, 1, 'DM');
  Object.assign(passer, { x: 32, y: CY });
  Object.assign(carrier, { x: 52, y: CY, contactT: 0, stunT: 0 });
  Object.assign(marker, { x: 52 + pressure, y: CY, contactT: 0, stunT: 0 });
  for (const key of ['firstTouch', 'technique', 'composure']) carrier.attrs[key] = control;
  m.playersCache = [passer, carrier, marker];
  Object.assign(m, { phase: 'open', elapsed: .4 });
  Object.assign(m.ball, { x: carrier.x, y: carrier.y, z: .12, vx: speed, vy: 0, vz: 0,
    owner: null, lastTouch: passer, releaseT: 0,
    flight: { kind: 'pass', team: 0, from: passer, intended: carrier, technique: 'switch', totalDist: 30 } });
  m.rnd = () => .5;
  return { m, carrier };
}

test('fast, long, pressured receptions can spill loose while a technical receiver cushions the same pass', () => {
  const clean = receiverScene({ control: 18 }), bobble = receiverScene({ control: 1 });
  clean.m.interactions(1 / 40);
  bobble.m.interactions(1 / 40);
  assert.equal(clean.m.ball.owner, clean.carrier);
  assert.equal(bobble.m.ball.owner, null);
  assert.equal(bobble.m.ball.flight, null, 'the heavy touch becomes an ordinary live ball, not a dead pass');
  assert.equal(bobble.m.ball.lastTouch, bobble.carrier);
  assert.ok(Math.hypot(bobble.m.ball.vx, bobble.m.ball.vy) > 1.5, 'the deflection remains contestable');
  assert.ok(bobble.m.events.some(event => event.type === 'bobble' && /under pressure/.test(event.text)), 'a pressured spill is surfaced to matchday presentation');
});

test('long-switch scatter increases under pressure and falls for a composed, technical receiver', () => {
  function scatter({ control, pressure }) {
    const m = game(302), passer = player(m, 0, 'CM'), receiver = player(m, 0, 'W'), marker = player(m, 1, 'DM');
    Object.assign(passer, { x: 42, y: 31, dir: 0 });
    Object.assign(receiver, { x: 71, y: 10 });
    Object.assign(marker, { x: 42 + pressure, y: 31 });
    for (const key of ['firstTouch', 'technique', 'composure']) receiver.attrs[key] = control;
    m.playersCache = [passer, receiver, marker];
    Object.assign(m.ball, { x: passer.x, y: passer.y, owner: passer, lastTouch: passer, z: .08 });
    m.rnd = () => .9;
    m.doPassTo(passer, { target: receiver, lead: { x: receiver.x, y: receiver.y }, technique: 'switch' });
    const flight = m.ball.flight;
    return Math.hypot(flight.targetX - receiver.x, flight.targetY - receiver.y);
  }
  const calmSkilled = scatter({ control: 18, pressure: 8 });
  const pressedSkilled = scatter({ control: 18, pressure: 1.2 });
  const pressedRaw = scatter({ control: 1, pressure: 1.2 });
  assert.ok(pressedSkilled > calmSkilled);
  assert.ok(pressedRaw > pressedSkilled);
});

test('switches and crosses rise into a visible ballZ arc and the renderer separates ball from grass', () => {
  const m = game(303), passer = player(m, 0, 'CM'), receiver = player(m, 0, 'W');
  Object.assign(passer, { x: 43, y: 31, dir: 0 });
  Object.assign(receiver, { x: 70, y: 10 });
  m.playersCache = [passer, receiver];
  Object.assign(m.ball, { x: passer.x, y: passer.y, owner: passer, lastTouch: passer, z: .08 });
  m.doPassTo(passer, { target: receiver, lead: { x: receiver.x, y: receiver.y }, technique: 'switch' });
  const flight = m.ball.flight;
  assert.equal(flight.technique, 'switch');
  const launchHeight = m.ball.z;
  m.updateBall(.32);
  assert.ok(m.ball.z > launchHeight + .6, `switch arc should climb above ${launchHeight.toFixed(2)}m`);

  const crossing = game(305), winger = player(crossing, 0, 'W'), striker = player(crossing, 0, 'ST');
  Object.assign(winger, { x: 84, y: CY - 18, dir: 0 });
  Object.assign(striker, { x: 94, y: CY - 2 });
  crossing.playersCache = [winger, striker];
  Object.assign(crossing.ball, { x: winger.x, y: winger.y, owner: winger, lastTouch: winger, z: .08 });
  crossing.doCross(winger, false, { target: striker, merit: .6 });
  assert.equal(crossing.ball.flight.kind, 'cross');
  const crossLaunch = crossing.ball.z;
  crossing.updateBall(.32);
  assert.ok(crossing.ball.z > crossLaunch + .5, 'the actual cross delivery lifts through an arc');

  const renderer = Object.create(Renderer.prototype);
  Object.assign(renderer, { scale: 10, ox: 0, oy: 0 });
  const low = renderer.ballProjection(50, 25, 0), high = renderer.ballProjection(50, 25, 4);
  assert.ok(high.y < low.y, 'the sprite rises above its ground coordinate');
  assert.ok(high.shadowY > low.shadowY, 'the shadow remains offset on the grass');
  assert.ok(renderer.ballRadius(4) > renderer.ballRadius(0), 'the airborne ball gains a subtle size cue');
});

test('touchline shouts nudge the live action utility for four minutes then expire cleanly', () => {
  const m = game(308); m.begin(); m.phase = 'open';
  const carrier = player(m, 0, 'CM'), marker = player(m, 1, 'DM');
  Object.assign(carrier, { x: 66, y: CY, dir: 0 }); Object.assign(marker, { x: 71, y: CY + 2 });
  m.playersCache = [carrier, marker, ...m.teams[0].players.filter(p => p !== carrier)];
  m.ball.owner = carrier; Object.assign(m.ball, { x: carrier.x, y: carrier.y, z: .1 });
  const read = m.readPlay(carrier, m.nearestOppDist(carrier));
  const score = () => m.decisionOptions(carrier, read).find(option => option.kind === 'carry').score;
  const before = score();
  assert.equal(m.touchlineCall(0, 'demand').ok, true);
  assert.equal(m.activeTouchlineCall(0), 'demand');
  assert.ok(score() > before, 'Demand More raises the carrier option without changing random streams');
  assert.equal(m.activeTouchlineCall(1), null, 'the call is scoped to the instructed team');
  assert.equal(m.touchlineCall(0, 'unknown').ok, false);
  m.elapsed = 240;
  assert.equal(m.activeTouchlineCall(0), null, 'the utility modifier expires at four simulated minutes');
  assert.equal(score(), before);
  assert.ok(m.events.some(event => event.type === 'shout' && event.team === 0));
  const frame = m.snapshotFrame();
  assert.equal(frame.directions.length, m.playersCache.length);
  assert.equal(frame.conditions.length, m.playersCache.length);
});

test('the same recorded touchline shout stays deterministic across a resumed seeded fixture', () => {
  const a = game(309), b = game(309);
  a.begin(); b.begin();
  for (let i = 0; i < 240; i++) { a.step(1 / 40); b.step(1 / 40); }
  assert.deepEqual(a.snapshotFrame(), b.snapshotFrame());
  const command = { type: 'shout', shout: 'push' };
  assert.equal(SeasonMatch.applyCommand(a, 0, command).ok, true);
  assert.equal(SeasonMatch.applyCommand(b, 0, command).ok, true);
  for (let i = 0; i < 2400; i++) { a.step(1 / 40); b.step(1 / 40); }
  assert.deepEqual(a.snapshotFrame(), b.snapshotFrame());
  assert.deepEqual(a.teams.map(team => team.score), b.teams.map(team => team.score));
  assert.deepEqual(a.events.map(event => [event.type, event.elapsed, event.text]), b.events.map(event => [event.type, event.elapsed, event.text]));
});

test('possession expands the attacking width while the defensive block shifts toward the ball', () => {
  const m = game(306); m.begin();
  const team = m.teams[0], winger = team.slots.find(slot => slot.player.role === 'W' && slot.player.slotY < .5).player;
  const carrier = team.slots.find(slot => slot.player.role === 'CM').player;
  const opponent = m.teams[1].slots.find(slot => slot.player.role === 'DM').player;
  m.phase = 'open'; m.elapsed = 20; m.possessionTurn = 0; m.shapeX = 54;
  Object.assign(carrier, { x: 54, y: CY }); Object.assign(opponent, { x: 54, y: CY });
  Object.assign(winger, { running: 0, runUntil: 0, runT: 1000, runType: null });
  const target = (possession, ballY) => {
    m.controlTeam = possession; m.shapeY = ballY;
    m.ball.owner = possession === 0 ? carrier : opponent;
    Object.assign(m.ball, { x: 54, y: ballY });
    m.computeContext();
    m.chasers[0] = carrier; m.computeTargets();
    return winger.ty;
  };
  const wide = target(0, CY), compact = target(1, CY);
  assert.ok(Math.abs(wide - CY) > Math.abs(compact - CY) + 3, 'the in-possession winger holds a wider lane');
  const narrowTeam = () => { team.tactics.width = 0; return target(0, CY); };
  const broadTeam = () => { team.tactics.width = 2; return target(0, CY); };
  assert.ok(Math.abs(broadTeam() - CY) > Math.abs(narrowTeam() - CY) + 1, 'team width instructions expand the attacking shape');
  const blockNear = target(1, 10), blockFar = target(1, 58);
  assert.ok(blockNear < blockFar, 'the defensive block slides laterally toward the ball-side');
  team.tactics.width = 1;
  team.tactics.club = { block: 'Low block', lost: 'Regroup' };
  const lowBlock = target(1, CY);
  team.tactics.club = { block: 'High press', lost: 'Regroup' };
  const highPress = target(1, CY);
  assert.ok(Math.abs(highPress - CY) > Math.abs(lowBlock - CY) + 1, 'OOP block style changes the defensive shell');
});

test('sub-60% condition reduces acceleration, turning agility and pressured first-touch composure', () => {
  function moving(condition) {
    const m = game(307), p = player(m, 0, 'CM');
    m.playersCache = [p];
    Object.assign(p, { x: 20, y: 20, tx: 30, ty: 30, vx: 0, vy: 1, dir: 0, cond: condition });
    const topSpeed = m.speed(p);
    m.movePlayers(1 / 40, false);
    return { topSpeed, acceleration: Math.hypot(p.vx, p.vy), turn: p.dir };
  }
  const fresh = moving(1), tired = moving(.43);
  assert.ok(tired.topSpeed < fresh.topSpeed * .9);
  assert.ok(tired.acceleration < fresh.acceleration);
  assert.ok(tired.turn < fresh.turn, 'a tired player turns more slowly to recover');

  const touch = condition => {
    const s = receiverScene({ control: 18 });
    s.carrier.cond = condition; s.m.rnd = () => .80; s.m.interactions(1 / 40);
    return s.m.ball.owner === s.carrier;
  };
  assert.equal(touch(1), true);
  assert.equal(touch(.43), false, 'fatigue makes the same pressured touch less secure');
});

test('a keeper who reads the penalty direction has a realistic chance to reach it', () => {
  const m = game(305), shooter = player(m, 0, 'ST'), keeper = player(m, 1, 'GK');
  const d = m.teams[0].attackDir, gx = d > 0 ? L : 0;
  Object.assign(keeper, { x: gx - d * .5, y: CY + 2.2, shotTried: null, stunT: 0 });
  m.playersCache = [shooter, keeper];
  m.elapsed = .5;
  const shot = { outcome: 'pending' };
  const flight = { id: 990, kind: 'shot', shooter, goalX: gx, onFrame: true, pen: true,
    modelXG: .78, xG: .78, shot, tx: gx, ty: CY + 2.2 };
  m.rnd = () => .42;
  assert.equal(m.shotContact(flight, { x: gx, y: CY + 2.2, z: .75 }, { x: gx, y: CY + 2.2, z: .75 }), true);
  assert.equal(shot.outcome, 'save');
  assert.equal(m.teams[1].stats.saves, 1);
});

test('a well-placed shot past a badly positioned keeper can still beat them', () => {
  const m = game(306), shooter = player(m, 0, 'ST'), keeper = player(m, 1, 'GK');
  Object.assign(shooter, { x: L - 10, y: CY });
  Object.assign(keeper, { x: L - 4.2, y: CY, shotTried: null, stunT: 0 });
  m.playersCache = [shooter, keeper];
  m.elapsed = .5;
  const shot = { outcome: 'pending' };
  const flight = { id: 992, kind: 'shot', shooter, goalX: L, onFrame: true, pen: false, xG: .34, shot,
    tx: L, ty: CY + 1.9, vx: 0, vy: 0, vz: 0, x: L - 2, y: CY + 1.9, z: .75 };
  const draws = [.99, .5, .5, .5];
  m.rnd = () => draws.shift() ?? .5;
  assert.equal(m.shotContact(flight, { x: L - 2, y: CY + 1.9, z: .75 }, { x: L - 3, y: CY, z: .75 }), false);
  assert.equal(keeper.shotTried, flight.id, 'the keeper reaches for the shot but cannot stop it');
  assert.equal(shot.outcome, 'pending', 'the continuing shot is resolved at the goal line');
});

test('a difficult on-target box save can spill a live, elevated rebound back into play', () => {
  const m = game(304), shooter = player(m, 0, 'ST'), keeper = player(m, 1, 'GK');
  Object.assign(shooter, { x: L - 10, y: CY });
  Object.assign(keeper, { x: L - 3.5, y: CY, shotTried: null, stunT: 0 });
  m.playersCache = [shooter, keeper];
  m.elapsed = .5;
  const shot = { outcome: 'pending' };
  const flight = { id: 991, kind: 'shot', shooter, goalX: L, onFrame: true, pen: false, xG: .34, shot };
  Object.assign(m.ball, { x: L - 5, y: CY, z: .72, vx: 24, vy: 0, vz: 0, owner: null, flight,
    releaseT: 0, lastTouch: shooter });
  const draws = [0, .99, .5, .5, .5];
  m.rnd = () => draws.shift() ?? .5;
  assert.equal(m.shotContact(flight, { x: L - 5, y: CY, z: .72 }, { x: L - 3, y: CY, z: .72 }), true);
  assert.equal(flight.rebound, true);
  assert.equal(shot.rebound, true);
  assert.equal(shot.outcome, 'save');
  assert.equal(m.ball.flight, null);
  assert.equal(m.ball.owner, null);
  assert.ok(Math.hypot(m.ball.vx, m.ball.vy) > 3 && m.ball.z > .7);
  assert.ok(m.events.some(event => event.type === 'save' && /rebound is loose/.test(event.text)));
  assert.ok(m.goalDepth(keeper.team, m.ball.x) <= BOX_L + 1);
  assert.ok(Math.abs(m.ball.y - CY) <= BOX_HALF + 3);
});
