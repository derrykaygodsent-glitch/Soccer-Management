'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const ManagerAI = require('../src/manager-match-ai.js');
const Technical = require('../src/technical-area.js');
const ManagerProfile = require('../src/manager-profile.js');
const { Match } = require('../src/engine.js');
const { CLUBS, defaultTactics } = require('../src/data.js');

test('AI manager traits are stable per identity and old records receive deterministic defaults', () => {
  const coach = Technical.person('career:manager:stable');
  assert.deepEqual(coach.traits, Technical.managerTraits(coach.id));
  assert.deepEqual(Technical.person(coach.id).traits, coach.traits);
  assert.ok(coach.traits.adaptability >= 1 && coach.traits.adaptability <= 5);
  assert.ok(coach.traits.riskTolerance >= 1 && coach.traits.riskTolerance <= 5);
  const migrated = Technical.withTraits({ id: 'legacy-coach', name: 'Legacy Coach', style: 'counter' });
  assert.deepEqual(migrated.traits, Technical.managerTraits('legacy-coach'));
  assert.deepEqual(Technical.withTraits(migrated), migrated);
  assert.deepEqual(Technical.withTraits({ ...coach, traits: { adaptability: 4, riskTolerance: 2 } }).traits,
    { adaptability: 4, riskTolerance: 2 }, 'valid saved ratings remain authoritative');
});

test('established club style influences manager appointments without replacing an available matching coach', () => {
  const state = { id: 'club-style-hiring', day: 470, clubWorldHistory: { Harbour: { identity: { seasonsObserved: 3, recurringStyle: 'possession' } } } };
  const matching = { id: 'former-possession', style: 'possession' }, other = { id: 'former-direct', style: 'direct' };
  assert.equal(Technical.hireCoach(state, 'Harbour', [other, matching]), matching,
    'a stable multi-season philosophy prefers an available former coach who already matches it');
  assert.equal(Technical.hireCoach(state, 'Harbour', []).style, 'possession',
    'a new identity is aligned with the club when no former coach is available');
  state.clubWorldHistory.Harbour.identity.seasonsObserved = 2;
  assert.equal(Technical.hireCoach(state, 'Harbour', []).style,
    Technical.person(state.id + ':hire:Harbour:' + state.day).style,
    'a short or unproven history does not constrain a new appointment');
});

test('manager traits are visible in the dugout and manager dossier', () => {
  const coach = Technical.person('career:manager:visible');
  global.TLManagerLife = { nations: { Testland: ['Harbour Rovers'] }, date: day => String(day), money: value => String(value), table: () => [] };
  global.TLClubUI = { esc: value => String(value), art: () => '' };
  const state = { id: 'trait-display', day: 20, profile: { nation: 'Testland', name: 'User' }, plans: [], benches: { 'Harbour Rovers': [{ day: 1, coach, reason: 'Appointed' }] }, clubWorldHistory: { 'Harbour Rovers': { identity: { seasonsObserved: 3, recurringStyle: 'possession', youthStartShare: .31, youthPathwayEstablished: true, netSpend: 1400 } } } };
  assert.match(Technical.render(state, 'Testland'), /Club identity evidence · 3 seasons/);
  assert.match(Technical.render(state, 'Testland'), /Possession style recurring/);
  assert.match(Technical.render(state, 'Testland'), /youth starter share 31% · sustained youth pathway/);
  assert.match(Technical.render(state, 'Testland'), new RegExp(`Adaptability ${coach.traits.adaptability}/5`));
  assert.match(Technical.render(state, 'Testland'), new RegExp(`Risk tolerance ${coach.traits.riskTolerance}/5`));
  const dossier = ManagerProfile.renderWorld(state, coach.id, 'Harbour Rovers');
  assert.match(dossier, new RegExp(`Adaptability · ${coach.traits.adaptability}/5`));
  assert.match(dossier, new RegExp(`Risk tolerance · ${coach.traits.riskTolerance}/5`));
});

test('AI half-time responses are bounded, score-based, and preserve the preferred shape', () => {
  assert.equal(ManagerAI.halfTimePlan({ goalsFor: 1, goalsAgainst: 1 }), null, 'no scoreline trigger when level');
  assert.equal(ManagerAI.halfTimePlan({ style: 'press', tactics: { mentality: 2, press: 2 }, goalsFor: 0, goalsAgainst: 1 }).change.mentality, 3,
    'a one-goal deficit changes intent but does not replace the plan');

  const chase = ManagerAI.halfTimePlan({
    style: 'counter', tactics: { formation: '5-3-2', mentality: 1, tempo: 1 }, goalsFor: 0, goalsAgainst: 2, adaptability: 4, riskTolerance: 4,
  });
  assert.deepEqual(chase.change, { mentality: 2, tempo: 2 });
  assert.match(chase.reason, /more tempo/);
  assert.equal(chase.change.formation, undefined, 'the preferred formation is retained');

  const protect = ManagerAI.halfTimePlan({
    style: 'defend', tactics: { formation: '4-4-2', mentality: 2, line: 1 }, goalsFor: 3, goalsAgainst: 1, riskTolerance: 1,
  });
  assert.deepEqual(protect.change, { mentality: 1, line: 0 });
  assert.match(protect.reason, /defensive line/);
  assert.equal(ManagerAI.halfTimePlan({ style: 'defend', tactics: { mentality: 0, line: 0 }, goalsFor: 3, goalsAgainst: 1 }), null,
    'already conservative plans do not receive meaningless adjustments');

  assert.equal(ManagerAI.halfTimePlan({ style: 'balanced', tactics: { mentality: 2 }, goalsFor: 0, goalsAgainst: 1, adaptability: 1, riskTolerance: 4 }), null,
    'low adaptability waits until the deficit is clearer');
  assert.deepEqual(ManagerAI.halfTimePlan({ style: 'balanced', tactics: { mentality: 2 }, goalsFor: 0, goalsAgainst: 1, adaptability: 5, riskTolerance: 4 }).change,
    { mentality: 3 }, 'high adaptability responds to a one-goal deficit');
  assert.deepEqual(ManagerAI.halfTimePlan({ style: 'balanced', tactics: { mentality: 2, press: 1 }, goalsFor: 2, goalsAgainst: 0, adaptability: 3, riskTolerance: 1 }).change,
    { mentality: 1, press: 0 }, 'cautious managers protect a two-goal lead by easing the press');
  assert.equal(ManagerAI.halfTimePlan({ style: 'balanced', tactics: { mentality: 2, press: 1 }, goalsFor: 2, goalsAgainst: 0, adaptability: 3, riskTolerance: 5 }), null,
    'risk-tolerant managers do not automatically shut down a two-goal lead');

  const underPressure = ManagerAI.halfTimePlan({ style: 'press', tactics: { mentality: 2, line: 2, press: 2 }, goalsFor: 0, goalsAgainst: 0, adaptability: 4, riskTolerance: 1, xgFor: .2, xgAgainst: 1, shotsFor: 1, shotsAgainst: 4 });
  assert.deepEqual(underPressure.change, { line: 1, press: 1 }, 'sustained opposition threat prompts a deeper, less exposed shape');
  assert.match(underPressure.reason, /first-half danger/);
  assert.equal(ManagerAI.halfTimePlan({ style: 'press', tactics: { line: 2 }, goalsFor: 0, goalsAgainst: 0, adaptability: 1, xgFor: .2, xgAgainst: .8, shotsAgainst: 3 }), null,
    'a low-adaptability manager waits for stronger evidence before responding to chance pressure');
});

test('in-play plans target high presses, high lines and packed defensive shapes', () => {
  const highPress = ManagerAI.inPlayPlan({
    ownTactics: { formation: '4-4-2', passing: 1, tempo: 1, width: 1 },
    opponentTactics: { formation: '4-3-3', press: 2, line: 2 },
    opponentRoles: ['GK', 'FB', 'DC', 'DC', 'FB', 'DM', 'CM', 'CM', 'W', 'W', 'ST'],
    adaptability: 5, riskTolerance: 4,
  });
  assert.deepEqual(highPress.change, { passing: 2, tempo: 2 });
  assert.match(highPress.reason, /direct passing/);

  const deepFive = ManagerAI.inPlayPlan({
    ownTactics: { formation: '4-4-2', passing: 1, tempo: 1, width: 1 },
    opponentTactics: { formation: '5-3-2', press: 1, line: 0 },
    opponentRoles: ['GK', 'DC', 'DC', 'DC', 'WB', 'WB', 'CM', 'CM', 'AM', 'ST', 'ST'],
    adaptability: 4,
  });
  assert.deepEqual(deepFive.change, { width: 2 });
  assert.match(deepFive.reason, /crowded back line/);
  assert.equal(ManagerAI.inPlayPlan({ ownTactics: { passing: 2, tempo: 2, width: 2 }, opponentTactics: { press: 2, line: 2 } }), null,
    'the planner avoids issuing changes that are already in place');
});

test('in-play scouting exploits a repeatedly exposed flank but requires enough evidence', () => {
  const plan = ManagerAI.inPlayPlan({
    ownTactics: { width: 1 }, opponentTactics: { formation: '4-3-3', press: 1, line: 1 },
    flankObservations: { left: { samples: 5, averageGap: 16.4 }, right: { samples: 4, averageGap: 14.2 } },
    adaptability: 4, riskTolerance: 3,
  });
  assert.deepEqual(plan.change, { width: 2 });
  assert.equal(plan.focusFlank, 'left');
  assert.match(plan.reason, /left flank/);
  assert.match(plan.reason, /5 observations/);

  assert.equal(ManagerAI.inPlayPlan({
    ownTactics: { width: 1 }, opponentTactics: { formation: '4-3-3' },
    flankObservations: { left: { samples: 2, averageGap: 22 }, right: { samples: 8, averageGap: 10 } },
    adaptability: 4,
  }), null, 'a few isolated carries or a tightly covered channel are not enough to trigger a change');
  assert.equal(ManagerAI.inPlayPlan({
    ownTactics: { width: 1 }, opponentTactics: { formation: '4-3-3' },
    flankObservations: { left: { samples: 8, averageGap: 18 } }, adaptability: 1,
  }), null, 'low adaptability managers do not overreact to scouting evidence');
  assert.equal(ManagerAI.inPlayPlan({
    ownTactics: { width: 2 }, opponentTactics: { formation: '4-3-3' },
    flankObservations: { left: { samples: 8, averageGap: 18 } }, adaptability: 4,
  }), null, 'the planner does not repeat a flank response when already playing wide');
});

test('half-time substitution targets injuries or severe fatigue and respects role fit and remaining changes', () => {
  const out = { id: 'out-cm', name: 'Tired Midfielder', onPitch: true, pos: 'CM', cond: .43, injury: 0 };
  const injured = { id: 'injured-cm', name: 'Injured Midfielder', onPitch: true, pos: 'CM', cond: .9, injury: 3 };
  const slot = player => ({ role: 'CM', player });
  const bench = [{ id: 'fresh-cm', name: 'Fresh Midfielder', pos: 'CM', cond: 1, attrs: {} }];
  const canPlay = () => 1;
  const plan = ManagerAI.halfTimeSubstitution({ slots: [slot(out), slot(injured)], bench, roleFit: canPlay, adaptability: 3, riskTolerance: 3 });
  assert.equal(plan.outId, injured.id, 'an injury takes priority over routine fatigue');
  assert.equal(plan.inId, 'fresh-cm');
  assert.match(plan.reason, /injury assessment/);
  assert.equal(ManagerAI.halfTimeSubstitution({ slots: [slot(injured)], bench: [], roleFit: canPlay }), null);
  assert.equal(ManagerAI.halfTimeSubstitution({ slots: [slot(injured)], bench, subsUsed: 5, roleFit: canPlay }), null);
  assert.equal(ManagerAI.halfTimeSubstitution({ slots: [slot(out)], bench, roleFit: () => .5 }), null,
    'the AI does not use a clearly unsuitable replacement');
  assert.equal(ManagerAI.halfTimeSubstitution({ slots: [slot(out)], bench, roleFit: canPlay, adaptability: 1, riskTolerance: 5 }), null,
    'a high-risk, low-adaptability manager tolerates ordinary fatigue longer');
});

test('the match engine applies and records half-time AI decisions only for configured AI managers', () => {
  const m = new Match(CLUBS[0], CLUBS[1], {
    seed: 941,
    homeTactics: defaultTactics('balanced'),
    awayTactics: defaultTactics('counter'),
    managerAITeams: [1],
    managerStyles: ['balanced', 'counter'],
    managerProfiles: [null, { style: 'counter', traits: { adaptability: 4, riskTolerance: 4 } }],
  });
  const humanPlan = { ...m.teams[0].tactics };
  m.teams[0].score = 2;
  m.teams[1].score = 0;
  m.phase = 'halftime';
  m.continueSecondHalf();

  assert.deepEqual(m.teams[0].tactics, humanPlan, 'the configured human side is not changed by AI');
  assert.equal(m.teams[1].tactics.formation, '5-3-2');
  assert.equal(m.teams[1].tactics.mentality, 2);
  assert.equal(m.teams[1].tactics.tempo, 2);
  const [change] = m.tacticalMetrics.changes;
  assert.equal(change.team, 1);
  assert.equal(change.source, 'AI manager');
  assert.match(change.reason, /Trailing by 2/);
  assert.ok(m.events.some(event => event.type === 'tactic' && event.text.includes('Trailing by 2')),
    'the manager change is explained in the match event feed');
});

test('the engine makes and records an AI injury substitution at half-time', () => {
  const m = new Match(CLUBS[0], CLUBS[1], {
    seed: 942,
    managerAITeams: [1],
    managerStyles: ['balanced', 'balanced'],
    managerProfiles: [null, { style: 'balanced', traits: { adaptability: 4, riskTolerance: 3 } }],
  });
  m.begin();
  const team = m.teams[1], slot = team.slots.find(value => value.role === 'CM');
  assert.ok(slot);
  const injured = slot.player;
  injured.injury = 3;
  const replacement = team.bench.find(player => player.pos !== 'GK');
  assert.ok(replacement);
  replacement.pos = slot.role;
  m.phase = 'halftime';
  m.continueSecondHalf();

  assert.equal(team.subsUsed, 1);
  assert.notEqual(slot.player, injured);
  assert.equal(injured.subbedOff, true);
  assert.equal(slot.player.subbedOn, true);
  const record = m.tacticalMetrics.changes.find(value => value.team === 1 && value.change.substitution);
  assert.equal(record.change.substitution.in, slot.player.id);
  assert.equal(record.source, 'AI manager');
  assert.match(record.reason, /injury assessment/);
  assert.ok(m.events.some(event => event.type === 'tactic' && /injury assessment/.test(event.text)));
});

test('the match engine records evidence-based flank scouting and its tactical response', () => {
  const m = new Match(CLUBS[0], CLUBS[1], {
    seed: 944, homeTactics: defaultTactics('balanced'), awayTactics: defaultTactics('balanced'),
    managerAITeams: [0], managerStyles: ['balanced', 'balanced'],
    managerProfiles: [{ style: 'balanced', traits: { adaptability: 4, riskTolerance: 3 } }, null],
  });
  m.begin();
  m.phase = 'open';
  m.elapsed = m.t = 900;
  m.managerFlankObservations[0].left = { samples: 5, gapTotal: 82 };
  m.considerManagerAIInPlay();
  assert.equal(m.teams[0].tactics.width, 2);
  assert.equal(m.teams[0].tactics.managerFocusFlank, 'left', 'the match engine carries the identified channel into pass selection');
  const entry = m.tacticalMetrics.changes.find(change => change.team === 0 && change.source === 'AI manager');
  assert.equal(entry.change.managerFocusFlank, 'left');
  assert.equal(entry.trigger, 'observed flank exposure');
  assert.match(entry.reason, /left flank/);
  assert.ok(m.events.some(event => event.type === 'tactic' && /left flank/.test(event.text)));
});

test('an AI manager responds during play to a high press, then a changed low-block plan', () => {
  const m = new Match(CLUBS[0], CLUBS[1], {
    seed: 943,
    homeTactics: defaultTactics('balanced'),
    awayTactics: defaultTactics('press'),
    managerAITeams: [0],
    managerStyles: ['balanced', 'press'],
    managerProfiles: [{ style: 'balanced', traits: { adaptability: 5, riskTolerance: 4 } }, null],
  });
  m.begin();
  m.phase = 'open';
  m.elapsed = m.t = 900;
  m.considerManagerAIInPlay();
  assert.equal(m.teams[0].tactics.passing, 2, 'direct passing counters the opponent high press');
  assert.equal(m.teams[0].tactics.tempo, 2, 'high adaptability and risk exploit the high line quickly');
  assert.ok(m.tacticalMetrics.changes.some(change => change.source === 'AI manager' && change.trigger === 'opponent tactical shape'));

  m.teams[1].tactics = defaultTactics('defend');
  m.elapsed = m.t = 1200;
  m.considerManagerAIInPlay();
  assert.equal(m.teams[0].tactics.width, 2, 'the AI stretches play after the opponent switches to a deep block');
  assert.ok(m.tacticalMetrics.changes.some(change => change.reason.includes('sitting deep')));
  const count = m.tacticalMetrics.changes.length;
  m.elapsed = m.t = 1500;
  m.considerManagerAIInPlay();
  assert.equal(m.tacticalMetrics.changes.length, count, 'the same observed plan does not cause repeated adjustments');
});
