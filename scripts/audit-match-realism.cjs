/* Reproducible seeded match audit. Keep this diagnostic separate from the
 * regression tests: it measures distributions, it does not tune them. */
const { Match, L, CY, BOX_L, BOX_HALF } = require('../src/engine.js');
const D = require('../src/data.js');
const Decisions = require('../src/decisions.js');

const basePick = Decisions.pick;
let activeDecisionTotals = null;
Decisions.pick = (options, random, margin) => {
  if (activeDecisionTotals) {
    activeDecisionTotals.decisions++;
    const kinds = [...new Set(options.map(option => option.kind))];
    for (const kind of kinds) activeDecisionTotals.available[kind] = (activeDecisionTotals.available[kind] || 0) + 1;
    if (kinds.includes('shot')) activeDecisionTotals.shotOffered++;
  }
  const selected = basePick(options, random, margin);
  if (activeDecisionTotals && selected) {
    activeDecisionTotals.chosen[selected.kind] = (activeDecisionTotals.chosen[selected.kind] || 0) + 1;
    const detail = selected.kind === 'pass' ? (selected.pass?.through ? 'through' : selected.purpose || 'pass') : selected.kind;
    activeDecisionTotals.chosenDetails[detail] = (activeDecisionTotals.chosenDetails[detail] || 0) + 1;
  }
  return selected;
};

const count = Math.max(1, Number.parseInt(process.argv[2] || '50', 10));
const seedOffset = Number.parseInt(process.argv[3] || '7', 10);
const bins = [0, .05, .1, .2, .3, .5, 1];
const binKey = (xg) => {
  const i = bins.findIndex((edge, index) => index < bins.length - 1 && xg >= edge && xg < bins[index + 1]);
  return i < 0 ? 'other' : `${bins[i].toFixed(2)}-${bins[i + 1].toFixed(2)}`;
};
const out = {
  matches: count,
  scorelines: {},
  totals: { goals: 0, shots: 0, onTarget: 0, xG: 0, deliveries: 0, completedDeliveries: 0, possessionPct: 0, fouls: 0, corners: 0, offsides: 0, yellows: 0, reds: 0, penalties: 0, saves: 0 },
  perTeam: [0, 1].map(() => ({ goals: 0, shots: 0, onTarget: 0, xG: 0, deliveries: 0, completedDeliveries: 0, possessionPct: 0, fouls: 0, corners: 0, offsides: 0, yellows: 0, reds: 0, saves: 0 })),
  events: {},
  shots: { shots: 0, xG: 0, goals: 0, outcomes: {}, xGCalibration: {}, penalties: { shots: 0, xG: 0, goals: 0, outcomes: {} } },
  shotZones: {},
  shotGeometry: {},
  redReasons: {},
  redOffenders: [],
  penaltyLocations: [],
  decisions: { decisions: 0, shotOffered: 0, available: {}, chosen: {}, chosenDetails: {} },
  matchRows: []
};
for (let m = 0; m < count; m++) {
  const home = D.CLUBS[m % D.CLUBS.length];
  const away = D.CLUBS[(m + 3) % D.CLUBS.length];
  const seed = m * 101 + seedOffset;
  const decisionCounts = { decisions: 0, shotOffered: 0, available: {}, chosen: {}, chosenDetails: {} };
  activeDecisionTotals = decisionCounts;
  const match = new Match(home, away, { seed });
  let steps = 0;
  while (match.phase !== 'fulltime' && steps < 40 * 60 * 110) {
    match.step(1 / 40);
    if (match.phase === 'halftime') match.continueSecondHalf();
    steps++;
  }
  activeDecisionTotals = null;
  if (match.phase !== 'fulltime') throw new Error(`Seed ${seed} did not finish.`);
  if (match.shotMap.some(shot => !shot.outcome || shot.outcome === 'pending')) throw new Error(`Seed ${seed} has an unresolved shot.`);

  const [h, a] = match.teams;
  const score = `${h.score}-${a.score}`;
  out.scorelines[score] = (out.scorelines[score] || 0) + 1;
  const row = { seed, home: home.short, away: away.short, score, goals: h.score + a.score, shots: [h.stats.shots, a.stats.shots],
    onTarget: [h.stats.onTarget, a.stats.onTarget], xG: [Number(h.stats.xG.toFixed(3)), Number(a.stats.xG.toFixed(3))],
    fouls: [h.stats.fouls, a.stats.fouls], corners: [h.stats.corners, a.stats.corners], offsides: [h.stats.offsides, a.stats.offsides],
    possessionPct: [], deliveries: [], passCompletionPct: [], penalties: 0, yellows: 0, reds: 0 };
  out.totals.goals += h.score + a.score;
  out.totals.shots += h.stats.shots + a.stats.shots;
  out.totals.xG += h.stats.xG + a.stats.xG;
  out.totals.fouls += h.stats.fouls + a.stats.fouls;
  out.totals.corners += h.stats.corners + a.stats.corners;
  out.totals.offsides += h.stats.offsides + a.stats.offsides;
  out.totals.yellows += h.stats.yellow + a.stats.yellow;
  out.totals.reds += h.stats.red + a.stats.red;
  out.totals.saves += h.stats.saves + a.stats.saves;
  const possessionTotal = match.possTime[0] + match.possTime[1];
  for (const team of match.teams) {
    const teamRow = out.perTeam[team.idx];
    for (const key of ['goals', 'shots', 'onTarget', 'xG', 'passes', 'passWon', 'fouls', 'corners', 'offsides', 'yellow', 'red', 'saves']) {
      const outputKey = key === 'yellow' ? 'yellows' : key === 'red' ? 'reds' : key === 'passes' ? 'deliveries' : key === 'passWon' ? 'completedDeliveries' : key;
      teamRow[outputKey] += key === 'goals' ? team.score : team.stats[key];
    }
    const teamPossession = possessionTotal ? match.possTime[team.idx] / possessionTotal * 100 : 50;
    teamRow.possessionPct += teamPossession;
    row.possessionPct.push(Number(teamPossession.toFixed(3)));
    row.deliveries.push(team.stats.passes);
    row.passCompletionPct.push(team.stats.passes ? Number((team.stats.passWon / team.stats.passes * 100).toFixed(3)) : 0);
  }
  for (const [type, total] of Object.entries(match.events.reduce((counts, event) => {
    counts[event.type] = (counts[event.type] || 0) + 1; return counts;
  }, {}))) out.events[type] = (out.events[type] || 0) + total;
  out.totals.onTarget += h.stats.onTarget + a.stats.onTarget;
  out.totals.deliveries += h.stats.passes + a.stats.passes;
  out.totals.completedDeliveries += h.stats.passWon + a.stats.passWon;
  out.totals.possessionPct += possessionTotal ? match.possTime[0] / possessionTotal * 100 : 50;
  row.choices = decisionCounts;
  out.decisions.decisions += decisionCounts.decisions;
  out.decisions.shotOffered += decisionCounts.shotOffered;
  for (const [kind, value] of Object.entries(decisionCounts.available)) out.decisions.available[kind] = (out.decisions.available[kind] || 0) + value;
  for (const [kind, value] of Object.entries(decisionCounts.chosen)) out.decisions.chosen[kind] = (out.decisions.chosen[kind] || 0) + value;
  for (const [detail, value] of Object.entries(decisionCounts.chosenDetails)) out.decisions.chosenDetails[detail] = (out.decisions.chosenDetails[detail] || 0) + value;

  for (const shot of match.shotMap) {
    if (shot.outcome === 'disallowed') continue;
    const outcome = shot.outcome || 'pending';
    const isPenalty = !!shot.pen;
    const target = isPenalty ? out.shots.penalties : out.shots;
    const bucket = isPenalty ? 'penalties' : binKey(shot.xg);
    target.shots++;
    target.xG += shot.xg;
    target.outcomes[outcome] = (target.outcomes[outcome] || 0) + 1;
    if (outcome === 'goal') target.goals++;
    if (!isPenalty) {
      const cal = out.shots.xGCalibration[bucket] ||= { shots: 0, xG: 0, goals: 0, outcomes: {} };
      cal.shots++;
      cal.xG += shot.xg;
      if (outcome === 'goal') cal.goals++;
      cal.outcomes[outcome] = (cal.outcomes[outcome] || 0) + 1;
      const direction = shot.direction ?? match.teams[shot.team].attackDir;
      const goalX = direction > 0 ? L : 0;
      const depth = Math.abs(goalX - shot.x), lateral = Math.abs(CY - shot.y);
      const zone = depth <= 10 ? '0-10m' : depth <= BOX_L ? '10-16.5m' : depth <= 25 ? '16.5-25m' : '25m+';
      const area = out.shotZones[zone] ||= { shots: 0, xG: 0, goals: 0, onTarget: 0, outcomes: {} };
      area.shots++; area.xG += shot.xg;
      if (outcome === 'goal') area.goals++;
      if (outcome === 'goal' || outcome === 'save') area.onTarget++;
      area.outcomes[outcome] = (area.outcomes[outcome] || 0) + 1;
      const lateralBand = lateral < 6 ? 'central' : lateral < 12 ? 'halfspace' : 'wide';
      const geometryKey = `${zone}/${lateralBand}`;
      const geometry = out.shotGeometry[geometryKey] ||= { shots: 0, xG: 0, goals: 0, onTarget: 0, outcomes: {} };
      geometry.shots++; geometry.xG += shot.xg;
      if (outcome === 'goal') geometry.goals++;
      if (outcome === 'goal' || outcome === 'save') geometry.onTarget++;
      geometry.outcomes[outcome] = (geometry.outcomes[outcome] || 0) + 1;
    }
  }

  const redEvents = match.events.filter(event => event.type === 'red');
  const yellowEvents = match.events.filter(event => event.type === 'yellow');
  const penaltyEvents = match.events.filter(event => event.type === 'pen');
  out.totals.penalties += penaltyEvents.length;
  row.penalties = penaltyEvents.length;
  row.yellows = yellowEvents.length;
  row.reds = redEvents.length;
  for (const event of redEvents) {
    const reason = event.reason || 'unspecified';
    out.redReasons[reason] = (out.redReasons[reason] || 0) + 1;
    out.redOffenders.push({ seed, minute: event.clock, name: event.player?.name, reason,
      fouls: event.player?.stats?.fouls, yellows: event.player?.yellow, aggression: event.player?.attrs?.aggression });
  }
  for (const event of penaltyEvents) {
    const defense = match.teams[1 - event.team];
    const goalX = defense.attackDir > 0 ? 0 : L;
    out.penaltyLocations.push({ seed, minute: event.clock, x: Number(event.x?.toFixed(1)), y: Number(event.y?.toFixed(1)),
      depthFromGoal: Number(Math.abs(goalX - event.x).toFixed(1)), lateralFromCenter: Number(Math.abs(CY - event.y).toFixed(1)) });
  }
  out.matchRows.push(row);
}

const round = n => Number(n.toFixed(3));
for (const key of Object.keys(out.totals)) out.totals[key] = round(out.totals[key] / count);
out.totals.passCompletionPct = out.totals.deliveries ? round(out.totals.completedDeliveries / out.totals.deliveries * 100) : 0;
out.perTeam = out.perTeam.map(team => {
  const averages = Object.fromEntries(Object.entries(team).map(([key, value]) => [key, round(value / count)]));
  averages.passCompletionPct = averages.deliveries ? round(averages.completedDeliveries / averages.deliveries * 100) : 0;
  return averages;
});
out.totals.goals = round(out.totals.goals);
out.shots.xGCalibration = Object.fromEntries(Object.entries(out.shots.xGCalibration).map(([key, v]) => [key, {
  ...v, xG: round(v.xG), observedGoalRate: v.shots ? round(v.goals / v.shots) : 0,
  meanXG: v.shots ? round(v.xG / v.shots) : 0
}]));
out.shotZones = Object.fromEntries(Object.entries(out.shotZones).map(([key, v]) => [key, {
  ...v, xG: round(v.xG), meanXG: v.shots ? round(v.xG / v.shots) : 0,
  observedGoalRate: v.shots ? round(v.goals / v.shots) : 0,
  onTargetRate: v.shots ? round(v.onTarget / v.shots) : 0
}]));
out.shotGeometry = Object.fromEntries(Object.entries(out.shotGeometry).map(([key, v]) => [key, {
  ...v, xG: round(v.xG), meanXG: v.shots ? round(v.xG / v.shots) : 0,
  observedGoalRate: v.shots ? round(v.goals / v.shots) : 0,
  onTargetRate: v.shots ? round(v.onTarget / v.shots) : 0
}]));
out.shots.penalties = { ...out.shots.penalties, xG: round(out.shots.penalties.xG), observedGoalRate: out.shots.penalties.shots ? round(out.shots.penalties.goals / out.shots.penalties.shots) : 0 };
const summarize = values => {
  const sorted = values.slice().sort((a, b) => a - b);
  const at = q => sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * q))];
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const sd = Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, values.length - 1));
  return { n: values.length, mean: round(mean), sd: round(sd), p10: round(at(.1)), median: round(at(.5)), p90: round(at(.9)), min: round(sorted[0]), max: round(sorted.at(-1)) };
};
out.distributions = {
  matchGoals: summarize(out.matchRows.map(row => row.goals)),
  matchShots: summarize(out.matchRows.map(row => row.shots.reduce((a, b) => a + b, 0))),
  matchXG: summarize(out.matchRows.map(row => row.xG.reduce((a, b) => a + b, 0))),
  matchFouls: summarize(out.matchRows.map(row => row.fouls.reduce((a, b) => a + b, 0))),
  teamShots: summarize(out.matchRows.flatMap(row => row.shots)),
  teamOnTarget: summarize(out.matchRows.flatMap(row => row.onTarget)),
  teamPossessionPct: summarize(out.matchRows.flatMap(row => row.possessionPct)),
  teamPassCompletionPct: summarize(out.matchRows.flatMap(row => row.passCompletionPct))
};
console.log(JSON.stringify(out, null, 2));
