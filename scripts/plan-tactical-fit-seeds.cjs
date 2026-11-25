#!/usr/bin/env node
'use strict';

// Pre-outcome seed screen and fixed manifest for the confirmatory calibration.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const Data = require('../src/data');
const Trends = require('../src/league-tactical-trends');

const STYLES = Trends.STYLES;
const REPS = [50, 60, 75];
const SCREEN_START = 40000;
const SCREEN_COUNT = 2000;
const REQUIRED_PER_BAND = 72;
const REQUIRED_PER_CELL = 144;
const OUTFILE = path.resolve(process.argv.find(x => x.startsWith('--out='))?.slice(6) || 'docs/tactical-fit-calibration-manifest.json');
const bands = score => score < 11.5 ? 'below-11.5' : score < 12.5 ? 'near-11.5' : 'high-12.5-plus';
const bandsByRep = { 50: ['below-11.5','near-11.5'], 60: ['near-11.5','high-12.5-plus'], 75: ['high-12.5-plus'] };
const clubFor = rep => ({ id: `calibration-rep-${rep}`, name: `Calibration ${rep}`, short: `CAL${rep}`, rep, stadium: 'Calibration Ground', style: 'balanced' });
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const commit = () => { try { return execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(); } catch { return 'unavailable'; } };
const screen = new Map();
for (const rep of REPS) {
  const club = clubFor(rep);
  const byStyle = Object.fromEntries(STYLES.map(style => [style, { 'below-11.5': [], 'near-11.5': [], 'high-12.5-plus': [] }]));
  for (let seed = SCREEN_START; seed < SCREEN_START + SCREEN_COUNT; seed++) {
    const squad = Data.genSquad(club, seed);
    for (const style of STYLES) {
      const fit = Trends.squadFit(squad, style);
      byStyle[style][bands(fit.score)].push({ seed, score: fit.score, formation: fit.formation });
    }
  }
  screen.set(rep, byStyle);
}

const blocks = [];
for (const rep of REPS) for (const style of STYLES) {
  const selected = [];
  for (const band of bandsByRep[rep]) {
    const candidates = screen.get(rep)[style][band].slice().sort((a,b) => {
      const ah = Data.seedFor(`fit-screen-order:${rep}:${style}:${band}:${a.seed}`);
      const bh = Data.seedFor(`fit-screen-order:${rep}:${style}:${band}:${b.seed}`);
      return ah - bh || a.seed - b.seed;
    });
    const count = rep === 75 ? REQUIRED_PER_CELL : REQUIRED_PER_BAND;
    if (candidates.length < count) throw new Error(`Not enough screened squads for rep ${rep} ${style} ${band}: ${candidates.length}/${count}`);
    selected.push(...candidates.slice(0,count).map(x => ({...x,band})));
  }
  if (selected.length !== REQUIRED_PER_CELL) throw new Error(`Wrong block count for ${rep}/${style}: ${selected.length}`);
  const usedMatchSeeds = new Set();
  selected.forEach((entry,index) => {
    let matchSeed = Data.seedFor(`fit-match-seed:${rep}:${style}:${entry.band}:${entry.seed}`);
    while (usedMatchSeeds.has(matchSeed)) matchSeed = (matchSeed + 1) % 1000000;
    usedMatchSeeds.add(matchSeed);
    blocks.push({ rep, style, scoreBand: entry.band, baseSeed: entry.seed, matchSeed, venue: index % 2 ? 'away' : 'home', proxyScore: entry.score, formation: entry.formation });
  });
}

const summaries = [];
for (const rep of REPS) for (const style of STYLES) {
  const group = blocks.filter(x => x.rep === rep && x.style === style);
  const byBand = Object.fromEntries([...new Set(group.map(x => x.scoreBand))].map(band => [band, group.filter(x => x.scoreBand === band).length]));
  summaries.push({ rep, style, blocks: group.length, byBand, venueCounts: { home: group.filter(x => x.venue === 'home').length, away: group.filter(x => x.venue === 'away').length }, scoreRange: [Math.min(...group.map(x => x.proxyScore)),Math.max(...group.map(x => x.proxyScore))] });
}
const selectionFile = {
  preregistered: true,
  selectionRule: 'Screen only generated-player attributes and projected-XI fit; select lowest deterministic seed-order hashes within the declared score band. No match outcomes were generated or inspected for selection.',
  screen: { startSeed: SCREEN_START, countPerReputation: SCREEN_COUNT, reps: REPS, scoreBands: { 'below-11.5': '<11.5', 'near-11.5': '>=11.5 and <12.5', 'high-12.5-plus': '>=12.5' }, quotas: bandsByRep },
  perCell: { blocks: REQUIRED_PER_CELL, uniqueBaseSquads: true, uniqueMatchSeeds: true, balancedVenues: true },
  blockDefinition: 'one independently generated base squad plus one deterministic match seed; all three attribute conditions share that seed and venue',
  createdAt: new Date().toISOString(),
  blocks,
  summaries,
};
fs.mkdirSync(path.dirname(OUTFILE),{recursive:true});
fs.writeFileSync(OUTFILE,JSON.stringify(selectionFile,null,2)+'\n');
console.log(`Wrote ${blocks.length} pre-outcome blocks to ${OUTFILE}`);
for (const row of summaries) console.log(JSON.stringify(row));
console.log(JSON.stringify({ commit: commit(), node: process.version, screenScriptSha256: hash(__filename), manifestSha256: hash(OUTFILE) }));
