#!/usr/bin/env node
'use strict';

// Reproducible Phase 3 analysis of the frozen, validated confirmatory shards.
// This script reads outcomes only; it does not change the simulation or game.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Data = require('../src/data');
const Trends = require('../src/league-tactical-trends');

const ROOT = path.resolve(__dirname, '..');
const DOCS = path.join(ROOT, 'docs');
const MANIFEST_PATH = path.join(DOCS, 'tactical-fit-calibration-manifest.json');
const EXPECTED_MANIFEST_SHA = '373bc37833a2e92b1f4682346b7715029390b5be7a247e2c34b0be2da7943ad4';
const CONDITIONS = ['neutral', 'relevant', 'control'];
const CONTROL = ['throwing', 'throwPower', 'freeKicks', 'penalties'];
const STYLES = Trends.STYLES;
const REPS = [50, 60, 75];
const ALPHA = 0.05;
const FAMILY = STYLES.length * REPS.length;
const BOOTSTRAPS = Number(process.argv.find(x => x.startsWith('--bootstrap='))?.split('=')[1] || 100000);
const HEADERS = ['style','rep','scoreBand','baseSeed','matchSeed','venue','condition','proxyScore','proxyReady','formation','boostAttributes','boostPlayers','requestedPerAttribute','realizedAttributePoints','realizedMeanPerTarget','focalXg','opponentXg','xgDiff','focalGoals','opponentGoals','goalDiff','focalShots','opponentShots','focalOnTarget','opponentOnTarget','focalPossession','opponentPossession','focalPasses','opponentPasses','focalPassWon','opponentPassWon'];
if (!Number.isInteger(BOOTSTRAPS) || BOOTSTRAPS < 10000) throw new Error('--bootstrap must be an integer >= 10000');
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const assert = (ok, message) => { if (!ok) throw new Error(message); };

function parseCsv(text) {
  const lines = text.trimEnd().split('\n');
  return lines.map(line => {
    const out = []; let value = '', quoted = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (quoted) {
        if (c === '"' && line[i + 1] === '"') { value += '"'; i++; }
        else if (c === '"') quoted = false;
        else value += c;
      } else if (c === '"') quoted = true;
      else if (c === ',') { out.push(value); value = ''; }
      else value += c;
    }
    assert(!quoted, 'Malformed CSV quoting'); out.push(value); return out;
  });
}
function blockKey(b) { return [b.style,b.rep,b.scoreBand,b.baseSeed,b.matchSeed,b.venue,b.proxyScore,b.formation].join('/'); }
function rowsFromArtifacts() {
  assert(sha256(MANIFEST_PATH) === EXPECTED_MANIFEST_SHA, 'Frozen manifest hash mismatch');
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  assert(manifest.preregistered && manifest.blocks.length === 2592, 'Frozen manifest is incomplete');
  const files = ['scripts/run-tactical-fit-confirmatory.cjs','src/engine.js','src/data.js','src/league-tactical-trends.js'];
  const codeHashes = Object.fromEntries(files.map(f => [f, sha256(path.join(ROOT, f))]));
  const seen = new Set(), allRows = [];
  for (let shard = 0; shard < 2; shard++) {
    const stem = `tactical-fit-confirmatory-shard${shard}`;
    const csvPath = path.join(DOCS, `${stem}.csv`), checkpointPath = path.join(DOCS, `${stem}.checkpoint.jsonl`), metaPath = path.join(DOCS, `${stem}.meta.json`);
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    assert(meta.status === 'complete-shard' && meta.shard === shard && meta.shardCount === 2 && meta.limitBlocks === null, `Shard ${shard} is not complete`);
    assert(meta.manifestSha256 === EXPECTED_MANIFEST_SHA && meta.runnerSha256 === codeHashes[files[0]] && meta.engineSha256 === codeHashes[files[1]], `Shard ${shard} metadata provenance mismatch`);
    const expectedBlocks = manifest.blocks.filter((_, i) => Math.floor(i / 2) % 2 === shard);
    assert(expectedBlocks.length === 1296 && meta.manifestBlocks === 1296 && meta.completedBlocks === 1296 && meta.rows === 3888, `Shard ${shard} metadata counts mismatch`);
    const checkpoint = fs.readFileSync(checkpointPath, 'utf8').trimEnd().split('\n').map(JSON.parse);
    const identity = checkpoint.shift()?._run;
    const expectedIdentity = { manifestSha256: EXPECTED_MANIFEST_SHA, codeHashes, shard, shardCount: 2, limitBlocks: 0 };
    assert(JSON.stringify(identity) === JSON.stringify(expectedIdentity), `Shard ${shard} checkpoint identity mismatch`);
    const parsed = parseCsv(fs.readFileSync(csvPath, 'utf8'));
    assert(parsed[0].join(',') === HEADERS.join(',') && parsed.length === 3889 && checkpoint.length === 3888, `Shard ${shard} CSV shape/count mismatch`);
    const checkpointCsv = new Set(checkpoint.map(r => HEADERS.map(k => csvCell(r[k])).join(',')));
    const rawCsv = new Set(parsed.slice(1).map(cells => cells.join(',')));
    assert(checkpointCsv.size === 3888 && rawCsv.size === 3888, `Shard ${shard} duplicate rows`);
    assert([...checkpointCsv].every(row => rawCsv.has(row)), `Shard ${shard} CSV/checkpoint mismatch`);
    const blockAssignments = new Set(expectedBlocks.map(blockKey));
    const triplets = new Map(), counts = Object.fromEntries(CONDITIONS.map(c => [c, 0]));
    for (const cells of parsed.slice(1)) {
      assert(cells.length === HEADERS.length, `Shard ${shard} malformed row`);
      const r = Object.fromEntries(HEADERS.map((h, i) => [h, cells[i]]));
      const rowKey = HEADERS.map(h => csvCell(r[h])).join(',');
      assert(checkpointCsv.has(rowKey), `Shard ${shard} CSV/checkpoint mismatch`);
      assert(blockAssignments.has(blockKey(r)), `Shard ${shard} contains an unexpected manifest block`);
      assert(CONDITIONS.includes(r.condition), `Shard ${shard} has an unknown condition`);
      assert(['true','false'].includes(r.proxyReady), `Shard ${shard} has an invalid proxy flag`);
      const id = [r.style,r.rep,r.scoreBand,r.baseSeed,r.matchSeed,r.venue].join('/');
      if (!triplets.has(id)) triplets.set(id, new Set());
      assert(!triplets.get(id).has(r.condition), `Duplicate condition for ${id}`);
      triplets.get(id).add(r.condition); counts[r.condition]++;
      const unique = `${shard}/${id}/${r.condition}`;
      assert(!seen.has(unique), 'Shard overlap'); seen.add(unique);
      const numeric = ['rep','baseSeed','matchSeed','proxyScore','boostPlayers','requestedPerAttribute','realizedAttributePoints','realizedMeanPerTarget','focalXg','opponentXg','xgDiff','focalGoals','opponentGoals','goalDiff','focalShots','opponentShots','focalOnTarget','opponentOnTarget','focalPossession','opponentPossession','focalPasses','opponentPasses','focalPassWon','opponentPassWon'];
      for (const col of numeric) assert(Number.isFinite(Number(r[col])), `Invalid ${col} in shard ${shard}`);
      assert(Math.abs((Number(r.focalXg) - Number(r.opponentXg)) - Number(r.xgDiff)) < 0.00011, `xG difference mismatch in shard ${shard}`);
      if (r.condition === 'neutral') assert(!r.boostAttributes && Number(r.realizedAttributePoints) === 0, 'Neutral row has an intervention');
      const attrs = r.boostAttributes ? r.boostAttributes.split('|') : [];
      if (r.condition === 'control') assert(attrs.join('|') === CONTROL.join('|'), 'Control bundle mismatch');
      if (r.condition === 'relevant') assert(attrs.join('|') === Trends.squadFit([], r.style).attributes.join('|'), `FIT attribute list mismatch for ${r.style}`);
      allRows.push({ ...r, rep: Number(r.rep), baseSeed: Number(r.baseSeed), matchSeed: Number(r.matchSeed), proxyScore: Number(r.proxyScore), xgDiff: Number(r.xgDiff) });
    }
    assert(triplets.size === 1296 && [...triplets.values()].every(s => s.size === 3 && CONDITIONS.every(c => s.has(c))), `Shard ${shard} incomplete triplets`);
    assert(CONDITIONS.every(c => counts[c] === 1296 && meta.conditionCounts[c] === 1296), `Shard ${shard} condition totals mismatch`);
  }
  assert(allRows.length === 7776 && seen.size === 7776, 'Combined row count or shard coverage mismatch');
  return { manifest, rows: allRows, codeHashes, manifestSha256: EXPECTED_MANIFEST_SHA };
}
function csvCell(v) { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replaceAll('"','""')}"` : s; }

// Lanczos log-gamma and regularized incomplete beta for Student-t tails.
function logGamma(z) {
  const p=[676.5203681218851,-1259.1392167224028,771.32342877765313,-176.61502916214059,12.507343278686905,-0.13857109526572012,9.9843695780195716e-6,1.5056327351493116e-7];
  if(z<0.5)return Math.log(Math.PI)-Math.log(Math.sin(Math.PI*z))-logGamma(1-z);
  z-=1;let x=0.99999999999980993;for(let i=0;i<p.length;i++)x+=p[i]/(z+i+1);const t=z+p.length-0.5;return 0.9189385332046727+(z+0.5)*Math.log(t)-t+Math.log(x);
}
function betaCf(a,b,x) {
  const max=300,eps=3e-14,tiny=1e-300;const qab=a+b,qap=a+1,qam=a-1;let c=1,d=1-qab*x/qap;if(Math.abs(d)<tiny)d=tiny;d=1/d;let h=d;
  for(let m=1;m<=max;m++){const m2=2*m;let aa=m*(b-m)*x/((qam+m2)*(a+m2));d=1+aa*d;if(Math.abs(d)<tiny)d=tiny;c=1+aa/c;if(Math.abs(c)<tiny)c=tiny;d=1/d;h*=d*c;aa=-(a+m)*(qab+m)*x/((a+m2)*(qap+m2));d=1+aa*d;if(Math.abs(d)<tiny)d=tiny;c=1+aa/c;if(Math.abs(c)<tiny)c=tiny;d=1/d;const delta=d*c;h*=delta;if(Math.abs(delta-1)<eps)break;}
  return h;
}
function regBeta(x,a,b) {
  if(x<=0)return 0;if(x>=1)return 1;
  const bt=Math.exp(logGamma(a+b)-logGamma(a)-logGamma(b)+a*Math.log(x)+b*Math.log1p(-x));
  return x<(a+1)/(a+b+2)?bt*betaCf(a,b,x)/a:1-bt*betaCf(b,a,1-x)/b;
}
function tCdf(t,df) { const x=df/(df+t*t),ib=regBeta(x,df/2,0.5);return t>=0?1-ib/2:ib/2; }
function tQuantile(p,df) { if(p===0.5)return 0;let lo=0,hi=1;while(tCdf(hi,df)<p&&hi<1e8)hi*=2;for(let i=0;i<90;i++){const mid=(lo+hi)/2;if(tCdf(mid,df)<p)lo=mid;else hi=mid;}return p<0.5?-(lo+hi)/2:(lo+hi)/2; }
function mean(a) { return a.reduce((s,x)=>s+x,0)/a.length; }
function sd(a) { const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1)); }
function tSummary(values, alpha=0.05) { const m=mean(values),s=sd(values),se=s/Math.sqrt(values.length),df=values.length-1,t=m/se,p=Math.min(1,2*(1-tCdf(Math.abs(t),df))),q=tQuantile(1-alpha/2,df);return {n:values.length,mean:m,sd:s,se,t,df,p,ci:[m-q*se,m+q*se]}; }
function rngFor(label) { const seed=crypto.createHash('sha256').update(`${EXPECTED_MANIFEST_SHA}:${label}`).digest().readUInt32LE(0);return Data.mulberry32(seed); }
function quantile(sorted,p) { const pos=(sorted.length-1)*p,lo=Math.floor(pos),hi=Math.ceil(pos);return sorted[lo]+(sorted[hi]-sorted[lo])*(pos-lo); }
function bootstrap(values,label,reps=BOOTSTRAPS) {
  const rand=rngFor(label),n=values.length,observed=mean(values),boot=new Array(reps);let extreme=0;
  for(let b=0;b<reps;b++){let sum=0;for(let i=0;i<n;i++)sum+=values[Math.floor(rand()*n)];const bm=sum/n;boot[b]=bm;if(Math.abs(bm-observed)>=Math.abs(observed))extreme++;}
  boot.sort((a,b)=>a-b);
  return {ci95:[quantile(boot,0.025),quantile(boot,0.975)],ciFamily:[quantile(boot,ALPHA/(2*FAMILY)),quantile(boot,1-ALPHA/(2*FAMILY))],pCentered:(extreme+1)/(reps+1)};
}
function signTest(values) { const nz=values.filter(x=>x!==0),k=nz.filter(x=>x>0).length,n=nz.length;if(!n)return {n:0,positive:0,negative:0,ties:values.length,p:1};const probs=new Array(n+1);probs[0]=2**(-n);for(let i=1;i<=n;i++)probs[i]=probs[i-1]*(n-i+1)/i;const tailLo=probs.slice(0,k+1).reduce((a,b)=>a+b,0),tailHi=probs.slice(k).reduce((a,b)=>a+b,0);return {n,positive:k,negative:n-k,ties:values.length-n,p:Math.min(1,2*Math.min(tailLo,tailHi))}; }
function pairDiffs(rows,left,right) {
  const map=new Map();for(const r of rows){const key=[r.style,r.rep,r.baseSeed,r.matchSeed,r.venue].join('/');if(!map.has(key))map.set(key,{});map.get(key)[r.condition]=r.xgDiff;}
  const out=[];for(const v of map.values())if(Number.isFinite(v[left])&&Number.isFinite(v[right]))out.push(v[left]-v[right]);return out;
}
function grouped(rows,keyFn) { const m=new Map();for(const r of rows){const k=keyFn(r);if(!m.has(k))m.set(k,[]);m.get(k).push(r);}return m; }
function contrastRows(rows,left,right) {
  const m=new Map();for(const r of rows){const k=[r.style,r.rep,r.scoreBand,r.baseSeed,r.matchSeed,r.venue].join('/');if(!m.has(k))m.set(k,{});m.get(k)[r.condition]=r;}
  return [...m.values()].filter(x=>x[left]&&x[right]).map(x=>({...x[left],delta:x[left].xgDiff-x[right].xgDiff}));
}
function round(x,d=4) { const p=10**d;return Math.round((x+Number.EPSILON)*p)/p; }
function fmt(x,d=3) { if(x===null||x===undefined||!Number.isFinite(x))return '—';return round(x,d).toFixed(d); }
function fmtP(p) { if(p<0.0001)return '<0.0001';return p.toFixed(4); }
function markdownTable(headers, rows) { return [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(()=>':--').join(' | ')} |`,
  ...rows.map(r=>`| ${r.join(' | ')} |`)
].join('\n'); }

const { manifest, rows, codeHashes, manifestSha256 } = rowsFromArtifacts();
function dummyVenue(cell,venue){return pairDiffs(cell.filter(r=>r.venue===venue),'relevant','control');}
const BOOTSTRAPS_SECONDARY = Math.max(10000, Math.floor(BOOTSTRAPS / 4));
const primary=[];
const secondary=[];
const venueRows=[];
const bandRows=[];
const summaryRows=[];
for(const rep of REPS) for(const style of STYLES){
  const cell=rows.filter(r=>r.rep===rep&&r.style===style);
  const d=pairDiffs(cell,'relevant','control');
  assert(d.length===144,`Expected 144 primary pairs for rep ${rep}, ${style}; got ${d.length}`);
  const homeN=dummyVenue(cell,'home').length,awayN=dummyVenue(cell,'away').length;
  assert(homeN===72&&awayN===72,`Venue balance mismatch for rep ${rep}, ${style}`);
  const t=tSummary(d,ALPHA/FAMILY);
  const boot=bootstrap(d,`primary:${rep}:${style}`,BOOTSTRAPS);
  const sign=signTest(d);
  const item={rep,style,n:d.length,homeN,awayN,mean:round(mean(d)),sd:round(sd(d)),
    bootstrapCI95:boot.ci95.map(x=>round(x)),familywiseBootstrapCI:boot.ciFamily.map(x=>round(x)),
    bootstrapP:boot.pCentered,bonferroniP:Math.min(1,boot.pCentered*FAMILY),
    pairedTP:t.p,bonferroniTP:Math.min(1,t.p*FAMILY),
    signTest:sign,signTestBonferroniP:Math.min(1,sign.p*FAMILY),
    mde:1.0,excludesZeroAfterFamilywiseCI:boot.ciFamily[0]>0||boot.ciFamily[1]<0,
    entirelyAboveMDE:boot.ciFamily[0]>1.0,entirelyBelowMDE:boot.ciFamily[1]<1.0};
  primary.push(item);

  const neutral=pairDiffs(cell,'relevant','neutral');
  const neutralBoot=bootstrap(neutral,`secondary-neutral:${rep}:${style}`,BOOTSTRAPS_SECONDARY);
  secondary.push({rep,style,n:neutral.length,mean:round(mean(neutral)),sd:round(sd(neutral)),ci95:neutralBoot.ci95.map(x=>round(x)),bootstrapP:neutralBoot.pCentered});

  for(const venue of ['home','away']){
    const vd=dummyVenue(cell,venue);const vb=bootstrap(vd,`venue:${rep}:${style}:${venue}`,BOOTSTRAPS_SECONDARY);
    venueRows.push({rep,style,venue,n:vd.length,mean:round(mean(vd)),ci95:vb.ci95.map(x=>round(x))});
  }

  const byBand=grouped(contrastRows(cell,'relevant','control'),r=>r.scoreBand);
  for(const [scoreBand,pairs] of byBand){
    const bd=pairs.map(x=>x.delta);const bb=bootstrap(bd,`score-band:${rep}:${style}:${scoreBand}`,BOOTSTRAPS_SECONDARY);
    bandRows.push({rep,style,scoreBand,n:bd.length,mean:round(mean(bd)),ci95:bb.ci95.map(x=>round(x))});
  }
  console.log(`Analyzed ${rep}/${style}: ${d.length} primary pairs.`);
}

const allBands=grouped(rows.filter(r=>r.condition==='neutral'),r=>`${r.rep}/${r.scoreBand}`);
const scoreCoverage=[...allBands].map(([cell,rs])=>({cell,blocks:rs.length,styles:[...new Set(rs.map(r=>r.style))].length,proxyMin:Math.min(...rs.map(r=>r.proxyScore)),proxyMax:Math.max(...rs.map(r=>r.proxyScore))})).sort((a,b)=>a.cell.localeCompare(b.cell));
const primaryP=primary.filter(x=>x.bonferroniP<ALPHA);
const robustP=primary.filter(x=>x.signTestBonferroniP<ALPHA);
const primaryFamilyCi=primary.filter(x=>x.excludesZeroAfterFamilywiseCI);
const aboveMde=primary.filter(x=>x.entirelyAboveMDE);
const belowMde=primary.filter(x=>x.entirelyBelowMDE);
const analysis={
  generatedAt:new Date().toISOString(),
  protocol:{manifestSha256,manifestBlocks:manifest.blocks.length,rows:rows.length,primaryOutcome:'focal xG difference (focal xG minus opponent xG); paired effect is relevant minus control',secondaryComparator:'relevant minus neutral',styles:STYLES,reputations:REPS,primaryContrasts:FAMILY,alpha:ALPHA,bonferroniAlpha:ALPHA/FAMILY,mdeXgPerMatch:1.0,bootstrapReplicatesPrimary:BOOTSTRAPS,bootstrapReplicatesSecondary:BOOTSTRAPS_SECONDARY,bootstrapSeed:'SHA-256 of manifest hash and contrast label; seeded via TLData.mulberry32',primaryBootstrapP:'two-sided, centered nonparametric block bootstrap under a zero-mean null; plus-one correction',primaryCI:'percentile paired-block bootstrap; familywise coverage 1 - 0.05/18',sensitivity:'paired exact sign test, Bonferroni-adjusted over the 18 primary cells',unit:'base squad / match seed / venue block; the three conditions within a block are paired'},
  provenance:{gitCommit:'a102a7a2d811db0d747c8f511722a0b14ca4a47f',node:process.version,analysisSha256:sha256(__filename),manifestSha256,runnerSha256:codeHashes['scripts/run-tactical-fit-confirmatory.cjs'],engineSha256:codeHashes['src/engine.js'],dataSha256:codeHashes['src/data.js'],fitSha256:codeHashes['src/league-tactical-trends.js'],csvSha256:[0,1].map(i=>sha256(path.join(DOCS,`tactical-fit-confirmatory-shard${i}.csv`)))},
  primary,secondaryRelevantMinusNeutral:secondary,venueSensitivity:venueRows,scoreBandExploratory:bandRows,scoreCoverage,
  summary:{primaryContrastsSignificantAfterBootstrapBonferroni:primaryP.length,primaryContrastsFamilywiseBootstrapCIExcludingZero:primaryFamilyCi.length,primaryContrastsSignTestBonferroniSignificant:robustP.length,contrastsWithFamilywiseCIEntirelyAboveMde:aboveMde.length,contrastsWithFamilywiseCIEntirelyBelowMde:belowMde.length}
};
const analysisPath=path.join(DOCS,'tactical-fit-confirmatory-analysis.json');
fs.writeFileSync(analysisPath,JSON.stringify(analysis,null,2)+'\n');

const pRows=primary.map(x=>[String(x.rep),x.style,String(x.n),`${x.homeN}/${x.awayN}`,fmt(x.mean),`[${fmt(x.familywiseBootstrapCI[0])}, ${fmt(x.familywiseBootstrapCI[1])}]`,fmtP(x.bootstrapP),fmtP(x.bonferroniP),fmtP(x.signTestBonferroniP),x.entirelyAboveMDE?'yes':x.entirelyBelowMDE?'upper CI < 1':'no']);
const nRows=secondary.map(x=>[String(x.rep),x.style,String(x.n),fmt(x.mean),`[${fmt(x.ci95[0])}, ${fmt(x.ci95[1])}]`]);
const vRows=venueRows.map(x=>[String(x.rep),x.style,x.venue,String(x.n),fmt(x.mean),`[${fmt(x.ci95[0])}, ${fmt(x.ci95[1])}]`]);
const bRows=bandRows.map(x=>[String(x.rep),x.style,x.scoreBand,String(x.n),fmt(x.mean),`[${fmt(x.ci95[0])}, ${fmt(x.ci95[1])}]`]);
const coverageRows=scoreCoverage.map(x=>[x.cell,String(x.blocks),String(x.styles),`${fmt(x.proxyMin,2)}–${fmt(x.proxyMax,2)}`]);
const report=`# Confirmatory Tactical Squad-Fit Analysis

**Status:** Phase 3 analysis completed on the validated frozen confirmatory data. This is a simulation-specific evaluation; it does not justify a gameplay change by itself.

## Design and analysis

- Frozen manifest SHA-256: ${manifestSha256}; **2,592 paired blocks / 7,776 matches**, all included.
- Primary endpoint: focal-team xG difference (focal xG minus opponent xG). Primary contrast: **relevant-FIT attribute boost minus active control-attribute boost**, paired within base-squad / match-seed / venue block.
- There are 18 primary style-by-reputation contrasts (six styles × reps 50, 60, 75), each n=144 paired blocks, balanced 72 home / 72 away. Family-wise alpha is 0.05 with Bonferroni correction across 18 tests (per-test alpha ${(ALPHA/FAMILY).toFixed(7)}).
- Primary p-values use a two-sided centered block bootstrap under a zero-mean null, with a plus-one correction; primary intervals are percentile paired-block bootstrap intervals at family-wise coverage 1 − 0.05/18. Replicates: ${BOOTSTRAPS.toLocaleString()} per primary cell. A paired exact sign test, Bonferroni adjusted across 18, is a direction/zero-effect sensitivity check. Paired t-test p-values are retained in the JSON as a supplementary parametric check, not the decision metric. The preregistered smallest practically meaningful effect is **+1.0 xG-difference per match**.
- Relevant-minus-neutral, home/away splits, and score-band splits are secondary/descriptive and are not used to claim confirmatory significance. Secondary bootstrap intervals are nominal 95%.
- Provenance and full cell-level output are in [tactical-fit-confirmatory-analysis.json](tactical-fit-confirmatory-analysis.json). Analysis script: [analyze-tactical-fit-confirmatory.cjs](../scripts/analyze-tactical-fit-confirmatory.cjs).

## Primary confirmatory results

Effect is relevant minus control in xG-difference per match. Familywise intervals account for the 18 primary contrasts. Bootstrap p is unadjusted; Bonferroni p is the familywise-adjusted value. The sign-test p is already Bonferroni adjusted.

${markdownTable(['Rep','Style','Blocks','Home/Away','Mean effect','Familywise 99.72% CI','Bootstrap p','Bonferroni p','Sign-test p adj.','vs +1.0 MDE'],pRows)}

**Across the 18 primary contrasts:** ${primaryP.length} have bootstrap Bonferroni p < .05; ${primaryFamilyCi.length} familywise bootstrap intervals exclude zero; ${robustP.length} pass the Bonferroni sign-test sensitivity; ${aboveMde.length} have a familywise interval entirely above +1.0; ${belowMde.length} have an interval entirely below +1.0. An interval crossing zero is inconclusive, not evidence of no effect. An interval entirely below +1.0 does not establish that the true effect is zero; it only places the interval below the preregistered practical target.

## Secondary: relevant versus neutral

These nominal 95% intervals are descriptive; no multiple-testing adjustment is applied.

${markdownTable(['Rep','Style','Blocks','Mean effect','95% paired-bootstrap CI'],nRows)}

## Venue sensitivity: relevant minus control

Home/away subgroup intervals are nominal 95% and descriptive. The design balances venues overall; these splits have half the primary sample size.

${markdownTable(['Rep','Style','Venue','Blocks','Mean effect','95% paired-bootstrap CI'],vRows)}

## Score-band exploration

These are within-reputation/style descriptive estimates; they do not constitute a separately powered or multiplicity-adjusted threshold test.

${markdownTable(['Rep','Style','Pre-outcome score band','Blocks','Mean effect','95% paired-bootstrap CI'],bRows)}

### Frozen score coverage

${markdownTable(['Rep / score band','Neutral rows / blocks','Styles represented','Proxy-score range'],coverageRows)}

## Interpretation and decision

The confirmatory contrasts estimate the effect of the simulated attribute interventions for these frozen rosters, seeds, match engine and default tactics. They do **not** prove that style-fit attributes cause better real-football performance, that league fashions cause success, or that a gate predicts manager adoption outcomes. The active control bundle is a comparator, not an inert placebo. The score-band results are exploratory, with uneven coverage across reputation strata; do not pool them as if roster strength were randomized across bands.

**Decision:** keep all gameplay, fit attributes and the 11.5/20 cutoff unchanged for now. Review the full contrast pattern and uncertainty before proposing any follow-up; any threshold change should be separately preregistered and tested with broader overlapping score coverage. No gameplay source was changed by this analysis.

## Reproduction

Run node scripts/analyze-tactical-fit-confirmatory.cjs (optional --bootstrap=100000; default is 100,000 primary and 25,000 secondary replicates). The script verifies the frozen manifest, shard metadata, checkpoint identities, row counts, paired structure and relevant/control attribute bundles before calculating estimates.
`
const reportPath=path.join(DOCS,'tactical-fit-confirmatory-analysis.md');
fs.writeFileSync(reportPath,report);
console.log(`Primary cells with Bonferroni bootstrap p < .05: ${primaryP.length}/${FAMILY}`);
console.log(`Familywise bootstrap intervals excluding zero: ${primaryFamilyCi.length}/${FAMILY}`);
console.log(`Bonferroni sign-test sensitivity passes: ${robustP.length}/${FAMILY}`);
console.log(`Wrote ${path.relative(ROOT,reportPath)} and ${path.relative(ROOT,analysisPath)}`);
