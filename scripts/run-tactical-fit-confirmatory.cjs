#!/usr/bin/env node
'use strict';

// Execute the frozen confirmatory manifest in restartable, auditable shards.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const Data = require('../src/data');
const Engine = require('../src/engine');
const Trends = require('../src/league-tactical-trends');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST = path.resolve(ROOT, 'docs/tactical-fit-calibration-manifest.json');
const EXPECTED_MANIFEST_SHA = '373bc37833a2e92b1f4682346b7715029390b5be7a247e2c34b0be2da7943ad4';
const CONDITIONS = ['neutral','relevant','control'];
const CONTROL = ['throwing','throwPower','freeKicks','penalties'];
const headers = ['style','rep','scoreBand','baseSeed','matchSeed','venue','condition','proxyScore','proxyReady','formation','boostAttributes','boostPlayers','requestedPerAttribute','realizedAttributePoints','realizedMeanPerTarget','focalXg','opponentXg','xgDiff','focalGoals','opponentGoals','goalDiff','focalShots','opponentShots','focalOnTarget','opponentOnTarget','focalPossession','opponentPossession','focalPasses','opponentPasses','focalPassWon','opponentPassWon'];
const arg = (key, fallback) => process.argv.find(x => x.startsWith(`--${key}=`))?.slice(key.length + 3) ?? fallback;
const has = key => process.argv.includes(`--${key}`);
const shard = Number(arg('shard', '0'));
const shardCount = Number(arg('shards', '2'));
const limitBlocks = Number(arg('limit-blocks', '0'));
const out = path.resolve(ROOT, arg('out', `docs/tactical-fit-confirmatory-shard${shard}.csv`));
const checkpoint = out.replace(/\.csv$/i, '.checkpoint.jsonl');
const metaOut = out.replace(/\.csv$/i, '.meta.json');
if (!Number.isInteger(shard) || !Number.isInteger(shardCount) || shardCount < 1 || shard < 0 || shard >= shardCount || !Number.isInteger(limitBlocks) || limitBlocks < 0) throw new Error('Invalid shard options.');
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const commit = () => { try { return execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(); } catch { return 'unavailable'; } };
if (sha256(MANIFEST) !== EXPECTED_MANIFEST_SHA) throw new Error('Frozen seed manifest hash does not match the preregistered plan.');
const manifest = JSON.parse(fs.readFileSync(MANIFEST,'utf8'));
if (!manifest.preregistered || manifest.blocks.length !== 2592) throw new Error('Unexpected or incomplete manifest.');
const codeHashes = Object.fromEntries(['scripts/run-tactical-fit-confirmatory.cjs','src/engine.js','src/data.js','src/league-tactical-trends.js'].map(file => [file,sha256(path.resolve(ROOT,file))]));
const checkpointIdentity = { manifestSha256: EXPECTED_MANIFEST_SHA, codeHashes, shard, shardCount, limitBlocks };
const resume = has('resume');
if (fs.existsSync(checkpoint) && !resume) throw new Error(`Checkpoint exists at ${checkpoint}; pass --resume to continue, or choose a new --out.`);
if (!fs.existsSync(checkpoint) && resume) throw new Error(`Cannot resume: checkpoint not found at ${checkpoint}`);
fs.mkdirSync(path.dirname(out),{recursive:true});
let prior = [];
if (resume) {
  const lines = fs.readFileSync(checkpoint,'utf8').split('\n').filter(Boolean);
  if (!lines.length) throw new Error('Checkpoint is empty.');
  const priorIdentity = JSON.parse(lines[0])._run;
  if (JSON.stringify(priorIdentity) !== JSON.stringify(checkpointIdentity)) throw new Error('Checkpoint identity differs (manifest, engine, runner, or shard options changed).');
  prior = lines.slice(1).map(line => JSON.parse(line));
} else {
  fs.writeFileSync(checkpoint,JSON.stringify({_run:checkpointIdentity})+'\n');
}
const completed = new Set(prior.map(row => `${row.style}/${row.rep}/${row.baseSeed}/${row.matchSeed}/${row.venue}/${row.condition}`));
const allBlocks = manifest.blocks.filter((_,index) => Math.floor(index / 2) % shardCount === shard);
const blocks = limitBlocks ? allBlocks.slice(0,limitBlocks) : allBlocks;
const completedKeys = new Set();
for (const row of prior) completedKeys.add(`${row.style}/${row.rep}/${row.baseSeed}/${row.matchSeed}/${row.venue}`);
if (prior.length && prior.some(row => !blocks.some(b => b.style===row.style&&b.rep===row.rep&&b.baseSeed===row.baseSeed&&b.matchSeed===row.matchSeed&&b.venue===row.venue))) throw new Error('Checkpoint contains rows outside this shard selection.');
const opponentClub = { id:'calibration-neutral',name:'Calibration Neutral XI',short:'CAL',rep:70,stadium:'Calibration Ground',style:'balanced' };
const opponentSquad = Data.genSquad(opponentClub,880070);
const opponentTactics = Data.defaultTactics('balanced');
const clubFor = rep => ({ id:`calibration-rep-${rep}`,name:`Calibration ${rep}`,short:`CAL${rep}`,rep,stadium:'Calibration Ground',style:'balanced' });
const clone = value => JSON.parse(JSON.stringify(value));
const csvCell = value => { const s=String(value??''); return /[",\n]/.test(s)?`"${s.replaceAll('"','""')}"`:s; };
const usedPerBlock = new Map();
const blockKey = b => `${b.style}/${b.rep}/${b.baseSeed}/${b.matchSeed}/${b.venue}`;
for (const row of prior) usedPerBlock.set(blockKey(row),true);
function boost(base, xiIds, attrs) {
  const squad=clone(base);let points=0;
  for(const p of squad) if(xiIds.has(p.id)) for(const key of attrs){const before=Number(p.attrs[key])||0,after=Math.min(20,before+3);p.attrs[key]=after;points+=after-before;}
  return {squad,points};
}
function play(block,base,fit,xiIds,condition) {
  const attributes=condition==='relevant'?fit.attributes:condition==='control'?CONTROL:[];
  const treated=boost(base,xiIds,attributes),away=block.venue==='away',focalClub=clubFor(block.rep);
  const homeClub=away?opponentClub:focalClub,awayClub=away?focalClub:opponentClub;
  const squads=away?[opponentSquad,treated.squad]:[treated.squad,opponentSquad];
  const focalTactics=Data.defaultTactics(block.style);
  const opts=away?{squads,seed:block.matchSeed,homeTactics:opponentTactics,awayTactics:focalTactics}:{squads,seed:block.matchSeed,homeTactics:focalTactics,awayTactics:opponentTactics};
  const match=new Engine.Match(homeClub,awayClub,opts),dt=1/40;let steps=0;
  while(match.phase!=='fulltime'&&steps<40*60*110){match.step(dt);if(match.phase==='halftime')match.continueSecondHalf();steps++;}
  if(match.phase!=='fulltime')throw new Error(`Incomplete match ${blockKey(block)} condition=${condition}`);
  const fi=away?1:0,oi=1-fi,focal=match.teams[fi],other=match.teams[oi],total=match.possTime[0]+match.possTime[1]||1;
  return {style:block.style,rep:block.rep,scoreBand:block.scoreBand,baseSeed:block.baseSeed,matchSeed:block.matchSeed,venue:block.venue,condition,proxyScore:fit.score,proxyReady:fit.ready,formation:fit.formation,boostAttributes:attributes.join('|'),boostPlayers:attributes.length?xiIds.size:0,requestedPerAttribute:attributes.length?3:0,realizedAttributePoints:treated.points,realizedMeanPerTarget:attributes.length&&xiIds.size?+(treated.points/(attributes.length*xiIds.size)).toFixed(3):0,focalXg:+focal.stats.xG.toFixed(4),opponentXg:+other.stats.xG.toFixed(4),xgDiff:+(focal.stats.xG-other.stats.xG).toFixed(4),focalGoals:focal.score,opponentGoals:other.score,goalDiff:focal.score-other.score,focalShots:focal.stats.shots,opponentShots:other.stats.shots,focalOnTarget:focal.stats.onTarget,opponentOnTarget:other.stats.onTarget,focalPossession:+(match.possTime[fi]/total).toFixed(4),opponentPossession:+(match.possTime[oi]/total).toFixed(4),focalPasses:focal.stats.passes,opponentPasses:other.stats.passes,focalPassWon:focal.stats.passWon,opponentPassWon:other.stats.passWon};
}

const start=Date.now();let newMatches=0,newBlocks=0;
for(let i=0;i<blocks.length;i++){
  const block=blocks[i],key=blockKey(block);
  const base=Data.genSquad(clubFor(block.rep),block.baseSeed),fit=Trends.squadFit(base,block.style);
  if(fit.score!==block.proxyScore||fit.formation!==block.formation)throw new Error(`Manifest score/formation mismatch in ${key}`);
  const xi=Data.bestXI(base,fit.formation).xi.filter(slot=>slot.player?.pos!=='GK').map(slot=>slot.player.id),xiIds=new Set(xi);
  for(const condition of CONDITIONS){
    const rowKey=`${key}/${condition}`;
    if(completed.has(rowKey))continue;
    const row=play(block,base,fit,xiIds,condition);
    fs.appendFileSync(checkpoint,JSON.stringify(row)+'\n');
    prior.push(row);completed.add(rowKey);newMatches++;
  }
  if(!completedKeys.has(key)){completedKeys.add(key);newBlocks++;}
  if((i+1)%6===0||i+1===blocks.length){
    const elapsed=(Date.now()-start)/1000,done=i+1,rate=done?elapsed/done:0,eta=Math.max(0,blocks.length-done)*rate;
    console.log(`shard ${shard}/${shardCount}: ${done}/${blocks.length} blocks (${newMatches} new matches; ${elapsed.toFixed(0)}s elapsed; ETA ${(eta/3600).toFixed(2)}h)`);
  }
}
const rows=prior.slice().sort((a,b)=>a.rep-b.rep||a.style.localeCompare(b.style)||a.baseSeed-b.baseSeed||a.matchSeed-b.matchSeed||a.condition.localeCompare(b.condition));
fs.writeFileSync(out,[headers.join(','),...rows.map(row=>headers.map(key=>csvCell(row[key])).join(','))].join('\n')+'\n');
const conditionCounts=Object.fromEntries(CONDITIONS.map(c=>[c,rows.filter(x=>x.condition===c).length]));
const scoreSummary={};for(const row of rows){const key=`${row.rep}/${row.style}/${row.scoreBand}`;(scoreSummary[key]||=new Set()).add(row.baseSeed);}
const metadata={generatedAt:new Date().toISOString(),status:blocks.length===allBlocks.length?'complete-shard':'limited-smoke',gitCommit:commit(),node:process.version,manifestSha256:EXPECTED_MANIFEST_SHA,runnerSha256:codeHashes['scripts/run-tactical-fit-confirmatory.cjs'],engineSha256:codeHashes['src/engine.js'],shard,shardCount,limitBlocks:limitBlocks||null,manifestBlocks:blocks.length,completedBlocks:completedKeys.size,rows:rows.length,newMatches,newBlocks,conditionCounts,uniqueBaseSeedsByScoreCell:Object.fromEntries(Object.entries(scoreSummary).map(([k,v])=>[k,v.size])),elapsedSeconds:(Date.now()-start)/1000,rawCsv:path.basename(out),checkpoint:path.basename(checkpoint),primaryOutcome:'focal xG minus opponent xG',conditions:{neutral:'no attribute intervention',relevant:'plus 3 to each style FIT attribute on projected XI outfield players (cap 20)',control:`plus 3 to ${CONTROL.join(', ')} on projected XI outfield players (cap 20)`},venuePairing:'one venue per independent base/seed block; balanced by frozen manifest'};
fs.writeFileSync(metaOut,JSON.stringify(metadata,null,2)+'\n');
console.log(`Shard ${shard} wrote ${rows.length} rows (${conditionCounts.neutral||0} neutral, ${conditionCounts.relevant||0} relevant, ${conditionCounts.control||0} control) to ${out}`);
