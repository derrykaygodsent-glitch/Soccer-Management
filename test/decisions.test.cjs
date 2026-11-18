'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const AI = require('../src/decisions.js');
const { Match, L, W, CY } = require('../src/engine.js');
const { CLUBS, mulberry32, seedFor } = require('../src/data.js');

function scene({ seed = 1, depth = 56, y = CY, heading = 0, role = 'CM', mirror = false } = {}) {
  const m = new Match(CLUBS[1], CLUBS[0], { seed });
  const [home, away] = m.teams.map(t => t.slots.map(s => s.player));
  const carrier = home.find(p => p.role === role);
  const teammates = home.filter(p => p !== carrier && p.role !== 'GK');
  const opponents = away.filter(p => p.role !== 'GK');
  const keeper = away.find(p => p.role === 'GK');
  const d = mirror ? -1 : 1;
  m.teams[0].attackDir = d; m.teams[1].attackDir = -d;
  Object.assign(m, { phase: 'open', elapsed: 35, t: 35, controlTeam: 0, playersCache: [] });
  function put(p, x, y, vx = 0, vy = 0, angle = 0) {
    Object.assign(p, { x: mirror ? L - x : x, y, vx: vx * d, vy, dir: mirror ? Math.PI - angle : angle, decisionT: 2 });
    if (!m.playersCache.includes(p)) m.playersCache.push(p);
    return p;
  }
  put(carrier, depth, y, 0, 0, heading);
  Object.assign(m.ball, { owner: carrier, lastTouch: carrier, x: carrier.x, y, z: .08 });
  return { m, carrier, teammates, opponents, keeper, put };
}

function midfield(mirror = false) {
  const s = scene({ mirror });
  const { m, teammates, opponents, keeper, put } = s;
  const runner = put(teammates.find(p => p.role === 'ST'), 70, 31, 3.6);
  const outlet = put(teammates[1], 52, 23);
  put(keeper, 102, 34); put(opponents[0], 86, 48); put(opponents[1], 59.2, 36.1); put(opponents[2], 72, 48);
  Object.assign(runner, { runType: 'behind', running: 2, runSince: m.elapsed - 1.15 });
  return { ...s, runner, outlet };
}

const read = (m, p) => m.readPlay(p, m.nearestOppDist(p));
const options = (m, p) => m.decisionOptions(p, read(m, p));
const best = candidates => candidates.reduce((a, b) => !a || b.score > a.score ? b : a, null);

test('an onside moving runner offers feet or space, but only after the carrier reads the run', () => {
  for (const mirror of [false, true]) {
    const { m, carrier, runner, outlet } = midfield(mirror);
    const team = m.teams[0];
    const forRunner = () => m.passOptions(carrier, {}, read(m, carrier)).filter(p => p.target === runner);
    const [feet, space] = forRunner();
    assert.ok(feet && !feet.through && space?.through);
    assert.ok((space.lead.x - feet.lead.x) * team.attackDir > 1, 'the lead pass runs further into space');
    runner.runSince = m.elapsed;
    assert.ok(!forRunner().some(c => c.through), 'a run has to be noticed');
    m.offsideLine(team);
    m.noticeRun(carrier, runner, team);
    assert.ok(carrier.decisionT > 0 && carrier.decisionT < 1, 'a clear run can bring a decision forward');
    carrier.decisionT = 2; carrier.dir += Math.PI;
    m.noticeRun(carrier, runner, team);
    assert.equal(carrier.decisionT, 2, 'a run outside the field of view does not force a release');
    runner.runSince = m.elapsed - 1.15;
    assert.ok(!forRunner().some(c => c.through));
    carrier.dir -= Math.PI;
    runner.x = mirror ? L - 90 : 90;
    assert.equal(forRunner().length, 0, 'no pass to the offside runner');
    assert.equal(best(options(m, carrier)).pass?.target, outlet, 'the safe outlet is still available');
    outlet.stunT = .3;
    assert.ok(!options(m, carrier).some(c => c.kind === 'pass'), 'an unavailable receiver cannot be picked');
  }
});

test('a closing defender changes the decision even before reaching the ball', () => {
  const { m, carrier, runner, outlet, opponents } = midfield();
  const presser = opponents[1];
  presser.y = carrier.y;
  presser.vx = 3;
  assert.equal(best(options(m, carrier)).pass?.target, runner, 'there is time to use the forward option');
  const movingAway = read(m, carrier);
  presser.vx = -4.9;
  assert.equal(read(m, carrier).pressure, movingAway.pressure);
  assert.ok(read(m, carrier).rush > movingAway.rush + .4);
  const safer = best(options(m, carrier));
  assert.equal(safer.pass?.target, outlet);
  assert.equal(safer.purpose, 'recycle');
  presser.x = 59.2; presser.y = 36.1; presser.vx = 0;
  const ambitious = best(options(m, carrier));
  assert.equal(ambitious.pass.target, runner);
  assert.equal(ambitious.purpose, 'through');
});

function reception({ heading = 0, depth = 95, y = CY, speed = 7, height = .08 } = {}) {
  const s = scene({ heading, depth, y, role: 'ST' });
  const { m, carrier, teammates, opponents, keeper, put } = s;
  const feeder = put(teammates[0], depth - 7, y + 6);
  put(keeper, 102, 34);
  put(opponents[0], depth === 95 ? 89 : 93, depth === 95 ? 36 : 32, -.3);
  Object.assign(m.ball, { flight: { team: 0, kind: 'pass', intended: carrier }, lastTouch: feeder, z: height });
  m.choiceRnd = () => 0; // Reproduce the early look on each clean reception.
  m.claim(carrier, speed);
  return s;
}

test('a clean reception can produce a first-time finish, a supporting pass or an extra touch', () => {
  const release = ({ m, carrier }, draw) => {
    assert.ok(carrier.decisionT < .43);
    m.elapsed += carrier.decisionT;
    m.choiceRnd = () => draw;
    assert.equal(read(m, carrier).first, true);
    m.decide(carrier, m.nearestOppDist(carrier));
  };
  const open = reception();
  release(open, .95);
  assert.equal(open.m.ball.flight?.kind, 'shot');
  assert.equal(open.m.ball.flight.firstTime, true);
  const closed = reception({ heading: 1.13 });
  release(closed, .95);
  assert.equal(closed.m.ball.owner, closed.carrier);
  assert.equal(closed.carrier.ballPlan?.kind, 'settle');
  assert.equal(closed.m.shotMap.length, 0, 'the extra touch is not a shot');
  closed.m.dribbleTarget(closed.carrier, closed.m.teams[0]);
  assert.ok(closed.carrier.tx > closed.carrier.x && closed.carrier.tx < L);
  // Taking the extra touch leaves time for an ordinary tackle.
  closed.m.elapsed += .22;
  assert.equal(read(closed.m, closed.carrier).first, false);
  closed.put(closed.opponents[0], closed.carrier.x + .65, closed.carrier.y + .12);
  closed.m.rnd = () => .2;
  closed.m.updateBall(1 / 40);
  closed.m.interactions(1 / 40);
  assert.equal(closed.m.ball.owner?.id, undefined);
  assert.equal(closed.m.ball.lastTouch?.id, closed.opponents[0].id);
  assert.equal(closed.m.shotMap.length, 0);
  const runnerUp = reception({ depth: 91, y: 30, heading: 1.10 });
  release(runnerUp, 0);
  assert.equal(runnerUp.m.ball.flight?.kind, 'pass');
  assert.equal(runnerUp.m.ball.flight.firstTime, true);
  for (const poor of [{ speed: 15 }, { height: .92 }]) {
    const { m, carrier } = reception(poor);
    assert.equal(carrier.quickControl, false);
    assert.ok(carrier.decisionT > .63);
    assert.equal(read(m, carrier).first, false);
  }
});

test('cross, cut inside, and carry can all win the same flank decision, without ignoring the defence', () => {
  const wing = seed => {
    const s = scene({ seed, depth: 80, y: 15, role: 'W' });
    const { teammates, opponents, keeper, put } = s;
    const target = put(teammates.find(p => p.role === 'ST'), 92, 31);
    put(keeper, 102, 34); put(opponents[0], 83, 17); put(opponents[1], 101, 46);
    return { ...s, target };
  };
  const actions = new Set();
  for (let seed = 1; seed <= 100; seed++) {
    const { m, carrier, target } = wing(seed);
    m.decide(carrier, m.nearestOppDist(carrier));
    if (m.ball.flight?.kind === 'cross') {
      actions.add('cross');
      assert.equal(m.ball.flight.intended, target);
    } else if (carrier.ballPlan) {
      actions.add(carrier.ballPlan.kind);
      assert.equal(m.ball.owner, carrier);
      assert.ok(carrier.ballPlan.y > carrier.y && carrier.ballPlan.y < CY, 'cuts towards the middle');
      assert.ok(carrier.ballPlan.x > carrier.x && carrier.ballPlan.x < L);
    } else if (!m.ball.flight || m.ball.flight.kind === 'carry') actions.add('carry');
  }
  assert.deepEqual(actions, new Set(['carry', 'inside', 'cross']));
  const { m, carrier, opponents, put } = wing(1);
  put(opponents[2], 92.4, 31.4); put(opponents[3], 84, 21);
  assert.ok(!options(m, carrier).some(c => c.kind === 'cross' || c.style === 'inside'), 'marked target and blocked lane remove those options');
});

test('mentality, passing instructions, player identity and fatigue skew the choice rather than replacing it', () => {
  const { m, carrier, runner, outlet } = midfield();
  const link = () => options(m, carrier).find(c => c.pass?.target === runner && c.pass.through);
  const tendency = () => link().score - options(m, carrier).find(c => c.pass?.target === outlet).score;
  const short = tendency();
  m.setTactics(0, { mentality: 4, passing: 2 });
  assert.ok(tendency() > short + .1, 'attacking and direct play favor the run over the same safe outlet');
  m.t = 2400; m.half = 2;
  m.teams[1].score = 1;
  const chasing = link().score;
  m.teams[0].score = 2;
  assert.ok(chasing > link().score + .1, 'chasing and protecting a late lead give different reads');
  const identity = seedFor(carrier.id), natural = AI.profile(carrier, identity);
  assert.deepEqual(natural, AI.profile(carrier, identity));
  assert.notDeepEqual(natural, AI.profile(carrier, identity ^ (7 << 11)));
  const bright = AI.readDelay(carrier, 1, .1);
  carrier.reading = AI.profile({ attrs: { ...carrier.attrs, passing: 11, composure: 7, positioning: 7 } }, identity);
  assert.ok(AI.readDelay(carrier, 1, .1) > bright + .2);
  const fresh = AI.readDelay(carrier, 1, .1);
  carrier.cond = .45;
  assert.ok(AI.readDelay(carrier, 1, .1) > fresh + .1);
});

test('the seed breaks ties among plausible actions, not between good play and implausible risks', () => {
  const candidates = [{ kind: 'pass', score: 1 }, { kind: 'carry', score: .98 }, { kind: 'shot', score: .4 }];
  const sample = () => {
    const random = mulberry32(85);
    return Array.from({ length: 160 }, () => AI.pick(candidates, random, .17).kind);
  };
  assert.deepEqual(new Set(sample()), new Set(['pass', 'carry']));
  assert.deepEqual(sample(), sample());
  const random = mulberry32(58), dup = mulberry32(58);
  for (let i = 0; i < 100; i++) {
    assert.equal(AI.pick(candidates, random, .17).kind,
      AI.pick([...candidates, ...Array.from({ length: 9 }, () => ({ kind: 'pass', score: .45 }))], dup, .17).kind);
  }
});

test('live decisions repeat with the seed and delayed deliveries still reach legal targets', { timeout: 10000 }, () => {
  function play(seed) {
    const m = new Match(CLUBS[1], CLUBS[0], { seed });
    const seen = new Set(), events = [];
    const decide = m.decide, delivery = m.deliveryReleased, kick = m.kick;
    m.decide = function (p, pressure) {
      decide.call(m, p, pressure);
      const kind = p.ballPlan?.kind;
      if (kind) { seen.add(kind); events.push([m.elapsed, p.id, kind]); }
    };
    m.kick = function (p, x, y, f, k) {
      if (f.kind === 'shot') { seen.add('shot'); events.push([m.elapsed, p.id, 'shot']); }
      return kick.call(m, p, x, y, f, k);
    };
    m.deliveryReleased = function (p, f) {
      delivery.call(m, p, f);
      assert.ok(f.targetX > 0 && f.targetX < L && f.targetY > 0 && f.targetY < W);
      if (f.intended) assert.ok(f.intended.team === p.team && f.intended.onPitch && !f.intended.red);
      if (f.committedAt != null) {
        assert.ok(m.elapsed - f.committedAt >= .15 - 1e-8 && m.elapsed - f.committedAt < .61);
        seen.add('delayed');
      }
      const kind = f.firstTime ? 'early-pass' : f.technique;
      seen.add(kind);
      if (f.purpose) seen.add(f.purpose);
      events.push([m.elapsed, p.id, kind, f.purpose, f.intended?.id]);
    };
    for (let i = 0; i < 205 * 40; i++) m.step(1 / 40);
    return { seen, events };
  }
  const a = play(342), b = play(902);
  assert.deepEqual(a, play(342));
  assert.notDeepEqual(a.events.map(ev => ev[2]), b.events.map(ev => ev[2]));
  const seen = new Set([...a.seen, ...b.seen]);
  for (const kind of ['through', 'delayed', 'recycle', 'early-pass', 'inside', 'cross', 'shot']) assert.ok(seen.has(kind), `no live ${kind} in the seeded openings`);
});
