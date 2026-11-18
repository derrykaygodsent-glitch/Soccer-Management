/* Headless engine validation: run complete seeded matches. */
const assert = require('node:assert/strict');
const { Match } = require('../src/engine.js');
const D = require('../src/data.js');

const N = parseInt(process.argv[2] || '3', 10);
const verbose = process.argv.includes('-v');
let tot = { goals: 0, shots: [0, 0], onT: [0, 0], passes: [0, 0], passPct: [0, 0], poss: [0, 0], fouls: [0, 0], corners: [0, 0], off: [0, 0], yellow: 0, red: 0, pens: 0, xG: [0, 0], saves: [0, 0] };
let errors = 0;
const t0 = Date.now();
for (let m = 0; m < N; m++) {
  const home = D.CLUBS[m % D.CLUBS.length];
  const away = D.CLUBS[(m + 3) % D.CLUBS.length];
  const events = [];
  try {
    const match = new Match(home, away, { seed: m * 101 + 7, onEvent: e => events.push(e) });
    let steps = 0;
    const h = 1 / 40;
    while (match.phase !== 'fulltime' && steps < 40 * 60 * 110) {
      match.step(h);
      if (match.phase === 'halftime') match.continueSecondHalf();
      steps++;
      // sanity checks
      if (!Number.isFinite(match.ball.x) || !Number.isFinite(match.ball.y) || !Number.isFinite(match.ball.z) || match.ball.z < 0) throw new Error('Invalid ball at t=' + match.t.toFixed(1));
      for (const p of match.playersCache) {
        if (!isFinite(p.x) || !isFinite(p.y)) throw new Error('player NaN ' + p.name);
      }
    }
    if (match.phase !== 'fulltime') throw new Error('match never ended, phase=' + match.phase + ' t=' + match.t.toFixed(0) + ' half=' + match.half);
    assert.equal(events.filter(e => e.type === 'ht').length, 1);
    assert.equal(events.filter(e => e.type === 'ft').length, 1);
    assert.ok(Math.abs(match.elapsed - 5400 - match.added[0] - match.added[1]) < 20, 'Unexpected match duration');
    for (const team of match.teams) {
      const goals = events.filter(e => e.goal && e.team === team.idx);
      assert.equal(team.score, goals.length, 'Goal events and score disagree');
      assert.ok(goals.every(e => Number.isFinite(e.xg)), 'Missing goal xG');
      const shots = match.shotMap.filter(s => s.team === team.idx);
      assert.equal(shots.length, team.stats.shots);
      assert.equal(shots.filter(s => s.outcome === 'goal' || s.outcome === 'save').length, team.stats.onTarget);
      assert.ok(shots.every(s => s.outcome !== 'pending'), 'Unresolved shots at full time');
      assert.ok(team.stats.passWon <= team.stats.passes);
    }
    const s0 = match.teams[0].stats, s1 = match.teams[1].stats;
    tot.goals += match.teams[0].score + match.teams[1].score;
    tot.shots[0] += s0.shots; tot.shots[1] += s1.shots;
    tot.onT[0] += s0.onTarget; tot.onT[1] += s1.onTarget;
    tot.passes[0] += s0.passes; tot.passes[1] += s1.passes;
    tot.passPct[0] += s0.passes ? s0.passWon / s0.passes : 0; tot.passPct[1] += s1.passes ? s1.passWon / s1.passes : 0;
    const pt = match.possTime[0] + match.possTime[1] || 1;
    tot.poss[0] += match.possTime[0] / pt; tot.poss[1] += match.possTime[1] / pt;
    tot.fouls[0] += s0.fouls; tot.fouls[1] += s1.fouls;
    tot.corners[0] += s0.corners; tot.corners[1] += s1.corners;
    tot.off[0] += s0.offsides; tot.off[1] += s1.offsides;
    tot.yellow += s0.yellow + s1.yellow; tot.red += s0.red + s1.red;
    tot.pens += events.filter(e => e.type === 'pen').length;
    tot.xG[0] += s0.xG; tot.xG[1] += s1.xG;
    tot.saves[0] += s0.saves; tot.saves[1] += s1.saves;
    if (verbose && m < 3) {
      console.log(`\n=== Match ${m}: ${home.short} ${match.teams[0].score}-${match.teams[1].score} ${away.short} ===`);
      events.filter(e => e.text && !['throwin', 'goalkick', 'preview', 'tackle', 'clear', 'stoppage'].includes(e.type)).forEach(e => console.log(`  ${e.clock} [${e.type}] ${e.text}`));
      console.log('  stats', JSON.stringify(s0), JSON.stringify(s1));
    }
  } catch (err) {
    errors++;
    console.error(`MATCH ${m} ERROR:`, err.message);
    if (errors > 4) break;
  }
}
const secs = (Date.now() - t0) / 1000;
console.log(`\n${N} matches in ${secs.toFixed(1)}s (${(secs / N * 1000).toFixed(0)} ms/match), errors: ${errors}`);
const avg = (v) => (v / N).toFixed(2);
console.log('goals/match      ', avg(tot.goals), ' (target ~2.7)');
console.log('shots/team       ', avg(tot.shots[0]), avg(tot.shots[1]), ' (target 9-15)');
console.log('onTarget/team    ', avg(tot.onT[0]), avg(tot.onT[1]));
console.log('xG/team          ', avg(tot.xG[0]), avg(tot.xG[1]));
console.log('passes/team      ', avg(tot.passes[0]), avg(tot.passes[1]), ' (target 280-520)');
console.log('pass%            ', avg(tot.passPct[0] * 100), avg(tot.passPct[1] * 100), ' (target 72-86)');
console.log('possession%      ', avg(tot.poss[0] * 100), avg(tot.poss[1] * 100));
console.log('fouls/team       ', avg(tot.fouls[0]), avg(tot.fouls[1]), ' (target 8-13)');
console.log('corners/team     ', avg(tot.corners[0]), avg(tot.corners[1]), ' (target 3-7)');
console.log('offsides/team    ', avg(tot.off[0]), avg(tot.off[1]), ' (target 1-3)');
console.log('yellows/match    ', avg(tot.yellow), ' reds/match', avg(tot.red), ' pens/match', avg(tot.pens));
console.log('saves/team       ', avg(tot.saves[0]), avg(tot.saves[1]));
