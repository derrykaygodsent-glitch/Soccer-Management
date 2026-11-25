#!/usr/bin/env node
'use strict';

// Reproducible, seeded calibration of style-fit attribute bundles against the
// current headless match engine. Deliberately manual: a run is several minutes.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const Data = require('../src/data');
const Engine = require('../src/engine');
const Trends = require('../src/league-tactical-trends');

const ALL_STYLES = Trends.STYLES;
// Fixed before running outcomes; these non-FIT technical specialties affect
// dead-ball/throw-in situations and form an active comparator, not a placebo.
const CONTROL = ['throwing', 'throwPower', 'freeKicks', 'penalties'];
const CONDITIONS = ['neutral', 'relevant', 'control'];
const VENUES = ['home', 'away'];
const DEFAULT_BASE_SEEDS = [79, 113];
const DEFAULT_MATCH_SEEDS = [4101, 5102, 6103, 7104];
const DEFAULT_REPS = [60, 75];
const OUTFILE = 'docs/tactical-fit-calibration-raw.csv';

function listArg(name, fallback) {
  const token = process.argv.find(x => x.startsWith(`--${name}=`));
  return token ? token.slice(name.length + 3).split(',').filter(Boolean).map(Number) : fallback;
}
function arg(name, fallback) {
  const token = process.argv.find(x => x.startsWith(`--${name}=`));
  return token ? token.slice(name.length + 3) : fallback;
}
const STYLES = arg('styles', ALL_STYLES.join(',')).split(',').filter(Boolean);
const reps = listArg('reps', DEFAULT_REPS);
const baseSeeds = listArg('base-seeds', DEFAULT_BASE_SEEDS);
const matchSeeds = listArg('match-seeds', DEFAULT_MATCH_SEEDS);
const out = path.resolve(arg('out', OUTFILE));
if (!STYLES.length || STYLES.some(style => !ALL_STYLES.includes(style)) || !reps.length || !baseSeeds.length || !matchSeeds.length || reps.some(x => !Number.isFinite(x))) {
  throw new Error('Use --styles=press,possession (optional) and comma-separated numeric --reps=60,75 --base-seeds=2601,2602 --match-seeds=4101,5102');
}
const opponentClub = { id: 'calibration-neutral', name: 'Calibration Neutral XI', short: 'CAL', rep: 70, stadium: 'Calibration Ground', style: 'balanced' };
const opponentSquad = Data.genSquad(opponentClub, 880070);
const opponentTactics = Data.defaultTactics('balanced');
const clubFor = rep => ({ id: `calibration-rep-${rep}`, name: `Calibration ${rep}`, short: `CAL${rep}`, rep, stadium: 'Calibration Ground', style: 'balanced' });
const clone = value => JSON.parse(JSON.stringify(value));
const csvCell = value => {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};
function sha256(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function gitCommit() { try { return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { return 'unavailable'; } }
const headers = ['style','rep','baseSeed','matchSeed','venue','condition','proxyScore','proxyReady','formation','boostAttributes','boostPlayers','requestedPerAttribute','realizedAttributePoints','realizedMeanPerTarget','focalXg','opponentXg','xgDiff','focalGoals','opponentGoals','goalDiff','focalShots','opponentShots','focalOnTarget','opponentOnTarget','focalPossession','opponentPossession','focalPasses','opponentPasses','focalPassWon','opponentPassWon'];
const rows = [];
let completed = 0;
const total = STYLES.length * reps.length * baseSeeds.length * matchSeeds.length * CONDITIONS.length;

function boostedSquad(base, players, attrs) {
  const squad = clone(base);
  let points = 0;
  for (const p of squad) {
    if (!players.has(p.id)) continue;
    for (const key of attrs) {
      const before = Number(p.attrs[key]) || 0;
      const after = Math.min(20, before + 3);
      p.attrs[key] = after;
      points += after - before;
    }
  }
  return { squad, points };
}
function runMatch({ style, rep, baseSeed, matchSeed, venue, condition, base, XIIds, fit }) {
  const attrs = condition === 'relevant' ? fit.attributes : condition === 'control' ? CONTROL : [];
  const edited = boostedSquad(base, XIIds, attrs);
  const focalClub = clubFor(rep);
  const away = venue === 'away';
  const homeClub = away ? opponentClub : focalClub;
  const awayClub = away ? focalClub : opponentClub;
  const squads = away ? [opponentSquad, edited.squad] : [edited.squad, opponentSquad];
  const focalTactics = Data.defaultTactics(style);
  const opts = away
    ? { squads, seed: matchSeed, homeTactics: opponentTactics, awayTactics: focalTactics }
    : { squads, seed: matchSeed, homeTactics: focalTactics, awayTactics: opponentTactics };
  const match = new Engine.Match(homeClub, awayClub, opts);
  const dt = 1 / 40;
  let steps = 0;
  while (match.phase !== 'fulltime' && steps < 40 * 60 * 110) {
    match.step(dt);
    if (match.phase === 'halftime') match.continueSecondHalf();
    steps++;
  }
  if (match.phase !== 'fulltime') throw new Error(`Incomplete match: ${style}/${rep}/${baseSeed}/${matchSeed}/${venue}/${condition}`);
  const focalIndex = away ? 1 : 0;
  const opponentIndex = 1 - focalIndex;
  const focal = match.teams[focalIndex], other = match.teams[opponentIndex];
  const totalPossession = match.possTime[0] + match.possTime[1] || 1;
  const proxy = Trends.squadFit(base, style);
  return {
    style, rep, baseSeed, matchSeed, venue, condition,
    proxyScore: proxy.score, proxyReady: proxy.ready, formation: proxy.formation,
    boostAttributes: attrs.join('|'), boostPlayers: attrs.length ? XIIds.size : 0,
    requestedPerAttribute: attrs.length ? 3 : 0,
    realizedAttributePoints: edited.points,
    realizedMeanPerTarget: attrs.length && XIIds.size ? +(edited.points / (attrs.length * XIIds.size)).toFixed(3) : 0,
    focalXg: +focal.stats.xG.toFixed(4), opponentXg: +other.stats.xG.toFixed(4),
    xgDiff: +(focal.stats.xG - other.stats.xG).toFixed(4),
    focalGoals: focal.score, opponentGoals: other.score, goalDiff: focal.score - other.score,
    focalShots: focal.stats.shots, opponentShots: other.stats.shots,
    focalOnTarget: focal.stats.onTarget, opponentOnTarget: other.stats.onTarget,
    focalPossession: +(match.possTime[focalIndex] / totalPossession).toFixed(4),
    opponentPossession: +(match.possTime[opponentIndex] / totalPossession).toFixed(4),
    focalPasses: focal.stats.passes, opponentPasses: other.stats.passes,
    focalPassWon: focal.stats.passWon, opponentPassWon: other.stats.passWon,
  };
}

const start = Date.now();
for (const rep of reps) {
  const club = clubFor(rep);
  for (const baseSeed of baseSeeds) {
    const base = Data.genSquad(club, baseSeed);
    for (const style of STYLES) {
      const proxy = Trends.squadFit(base, style);
      const xi = Data.bestXI(base, proxy.formation).xi
        .filter(slot => slot.player?.pos !== 'GK').map(slot => slot.player.id);
      const XIIds = new Set(xi);
      for (const matchSeed of matchSeeds) {
        // Balanced, paired venue assignment: same venue for every condition in
        // a block; alternate home/away across the fixed seed roster.
        const venue = VENUES[(baseSeeds.indexOf(baseSeed) + matchSeeds.indexOf(matchSeed)) % VENUES.length];
        for (const condition of CONDITIONS) {
          const row = runMatch({ style, rep, baseSeed, matchSeed, venue, condition, base, XIIds, fit: proxy });
          rows.push(row);
          completed++;
          if (completed % 12 === 0 || completed === total) {
            console.log(`${completed}/${total} matches (${((Date.now() - start) / 1000).toFixed(0)}s) · ${style} rep ${rep} · seed ${matchSeed} · ${venue} · ${condition}`);
          }
        }
      }
    }
  }
}
fs.mkdirSync(path.dirname(out), { recursive: true });
const csv = [headers.join(','), ...rows.map(row => headers.map(key => csvCell(row[key])).join(','))].join('\n') + '\n';
fs.writeFileSync(out, csv);
console.log(`Wrote ${rows.length} complete match records to ${out}`);

// Pre-registered paired contrasts; venue legs are averaged within a block so
// they are not treated as independent. Bootstrap resamples base/seed blocks.
function percentile(sorted, p) { return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]; }
function stats(values, seed) {
  if (!values.length) return { n: 0, mean: null, median: null, sd: null, ci95: [null, null] };
  const sorted = values.slice().sort((a, b) => a - b);
  const mean = values.reduce((s, x) => s + x, 0) / values.length;
  const sd = values.length > 1 ? Math.sqrt(values.reduce((s, x) => s + (x - mean) ** 2, 0) / (values.length - 1)) : null;
  if (values.length < 2) return { n: 1, mean: +mean.toFixed(4), median: +percentile(sorted, .5).toFixed(4), sd: null, ci95: [null, null] };
  const rnd = Data.mulberry32(seed);
  const boot = Array.from({ length: 4000 }, () => {
    let total = 0;
    for (let i = 0; i < values.length; i++) total += values[Math.floor(rnd() * values.length)];
    return total / values.length;
  }).sort((a, b) => a - b);
  return { n: values.length, mean: +mean.toFixed(4), median: +percentile(sorted, .5).toFixed(4), sd: +sd.toFixed(4), ci95: [+percentile(boot, .025).toFixed(4), +percentile(boot, .975).toFixed(4)] };
}
const summaries = [];
for (const rep of reps) for (const style of STYLES) for (const [label, lhs, rhs] of [['relevant-minus-control','relevant','control'],['relevant-minus-neutral','relevant','neutral']]) {
  const group = rows.filter(r => r.rep === rep && r.style === style);
  const blocks = new Map();
  for (const row of group) {
    const key = `${row.baseSeed}/${row.matchSeed}`;
    if (!blocks.has(key)) blocks.set(key, new Map());
    blocks.get(key).set(`${row.condition}/${row.venue}`, row);
  }
  const diffs = [], venueDiffs = { home: [], away: [] };
  for (const block of blocks.values()) {
    const legs = VENUES.map(venue => {
      const a = block.get(`${lhs}/${venue}`), b = block.get(`${rhs}/${venue}`);
      return a && b ? { venue, diff: a.xgDiff - b.xgDiff } : null;
    }).filter(Boolean);
    if (legs.length) diffs.push(legs.reduce((n, x) => n + x.diff, 0) / legs.length);
    for (const leg of legs) venueDiffs[leg.venue].push(leg.diff);
  }
  const seed = Data.seedFor(`tactical-fit-bootstrap:${rep}:${style}:${label}`);
  summaries.push({ rep, style, contrast: label, pairedBlocks: stats(diffs, seed), homeOnly: stats(venueDiffs.home, seed ^ 0x3411), awayOnly: stats(venueDiffs.away, seed ^ 0x7a91) });
}
console.log('Paired xG-difference contrasts (bootstrap resamples paired base-squad/match-seed blocks; interpret pilot intervals cautiously):');
for (const s of summaries) console.log(JSON.stringify(s));
const metadata = {
  generatedAt: new Date().toISOString(), gitCommit: gitCommit(), node: process.version,
  configuration: { styles: STYLES, reps, baseSeeds, matchSeeds, conditions: CONDITIONS, venueLevels: VENUES, venueSchedule: 'same venue for matched conditions; alternates by base-seed index + match-seed index', controlAttributes: CONTROL, requestedBoost: 3, target: 'projected-XI outfield players only', opponent: { club: opponentClub.id, rep: opponentClub.rep, seed: 880070, tactic: 'balanced default' }, dt: '1/40 second' },
  hashes: Object.fromEntries(['scripts/calibrate-tactical-fit.cjs','src/engine.js','src/data.js','src/league-tactical-trends.js'].map(file => [file, sha256(path.resolve(__dirname, '..', file))])),
  rowCount: rows.length, rawCsv: path.basename(out), primaryOutcome: 'focal team xG minus opponent xG',
  pairedAnalysis: 'relevant-minus-control and relevant-minus-neutral; venue legs averaged within base-squad/match-seed block; 4000 deterministic paired bootstrap resamples',
  summaries,
};
const metadataFile = out.replace(/\.csv$/i, '.meta.json');
fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2) + '\n');
console.log(`Wrote run metadata and paired estimates to ${metadataFile}`);
