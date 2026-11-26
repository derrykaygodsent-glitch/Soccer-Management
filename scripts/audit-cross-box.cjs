/* Paired cross-selection experiment. The control reproduces the previous
 * single-target merit rule; treatment is the live box-balance rule in engine.js.
 * Outcomes remain noisy at small n, so this is a diagnostic rather than a
 * football-realism claim. Usage: node scripts/audit-cross-box.cjs [pairs] [seed]. */
'use strict';
const { Match, L, CX, CY } = require('../src/engine.js');
const D = require('../src/data.js');
const liveCrossOption = Match.prototype.crossOption;

function singleTargetMerit(p, exempt = false) {
  const b = this.ball, team = this.teams[p.team], d = team.attackDir, gx = d > 0 ? L : 0;
  const line = Math.max(this.offsideLine(team) * d, b.x * d, CX * d);
  let best = null;
  for (const q of this.playersCache) {
    const goal = (gx - q.x) * d;
    if (q.team !== p.team || q === p || q.role === 'GK' || (!exempt && q.x * d > line + .24)
      || goal < 1.4 || goal > 26 || Math.abs(q.y - CY) > 15.2 || Math.abs(q.y - b.y) < 8.5) continue;
    const width = this.nearestOppDist(q), head = q.role === 'ST' ? .084 : 0;
    if (!exempt && (q.stunT > .20 || width < 2.32 || goal > 20.0)) continue;
    const merit = .015 + Math.max(0, Math.min(.8, (width - 1.75) / 7.6)) * .20 + head + (goal < 13.8 ? .086 : 0);
    if (!best || merit > best.merit) best = { target: q, merit };
  }
  return best;
}

function play(seed, crossOption) {
  Match.prototype.crossOption = crossOption;
  const match = new Match(D.CLUBS[0], D.CLUBS[3], { seed });
  let steps = 0;
  while (match.phase !== 'fulltime' && steps < 40 * 60 * 110) {
    if (match.phase === 'halftime') match.continueSecondHalf();
    match.step(1 / 40);
    steps++;
  }
  if (match.phase !== 'fulltime') throw new Error(`Seed ${seed} did not finish.`);
  return {
    seed,
    score: match.teams.map(team => team.score),
    shots: match.teams.reduce((sum, team) => sum + team.stats.shots, 0),
    xG: Number(match.teams.reduce((sum, team) => sum + team.stats.xG, 0).toFixed(3)),
    crosses: match.events.filter(event => event.type === 'cross').length,
    corners: match.teams.reduce((sum, team) => sum + team.stats.corners, 0),
    passes: match.teams.reduce((sum, team) => sum + team.stats.passes, 0)
  };
}

const pairs = Math.max(1, Number.parseInt(process.argv[2] || '4', 10));
const firstSeed = Number.parseInt(process.argv[3] || '731', 10);
const rows = [];
for (let i = 0; i < pairs; i++) {
  const seed = firstSeed + i * 107;
  const control = play(seed, singleTargetMerit);
  const treatment = play(seed, liveCrossOption);
  rows.push({ seed, control, treatment, difference: {
    goals: treatment.score.reduce((a, b) => a + b, 0) - control.score.reduce((a, b) => a + b, 0),
    shots: treatment.shots - control.shots, xG: Number((treatment.xG - control.xG).toFixed(3)),
    crosses: treatment.crosses - control.crosses, corners: treatment.corners - control.corners,
    passes: treatment.passes - control.passes
  } });
}
const mean = key => Number((rows.reduce((sum, row) => sum + row.difference[key], 0) / pairs).toFixed(3));
console.log(JSON.stringify({
  pairs, firstSeed, interpretation: 'Paired same-seed control vs box-aware cross merit; small samples are exploratory.',
  meanDifference: Object.fromEntries(['goals', 'shots', 'xG', 'crosses', 'corners', 'passes'].map(key => [key, mean(key)])),
  rows
}, null, 2));
