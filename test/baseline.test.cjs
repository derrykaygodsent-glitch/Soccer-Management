'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { execFileSync } = require('node:child_process');
const { cpSync, copyFileSync, mkdtempSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { runInNewContext } = require('node:vm');
const { Match } = require('../src/engine.js');
const { CLUBS } = require('../src/data.js');

const root = resolve(__dirname, '..');
const bundle = () => readFileSync(join(root, 'index.html'), 'utf8');

test('a clean build recreates the standalone index.html', () => {
  const work = mkdtempSync(join(tmpdir(), 'touchline-build-'));
  try {
    cpSync(join(root, 'src'), join(work, 'src'), { recursive: true });
    copyFileSync(join(root, 'build.cjs'), join(work, 'build.cjs'));
    execFileSync(process.execPath, ['build.cjs'], { cwd: work });
    assert.ok(bundle() === readFileSync(join(work, 'index.html'), 'utf8'),
      'The bundle is stale. Run npm run build.');
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});

test('the browser bundle loads its modules without external script or style files', () => {
  const page = bundle();
  const scripts = [...page.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length > 0, 'Expected an inline browser script.');
  assert.doesNotMatch(page, /\{\{(?:CSS|JS)\}\}/);
  assert.doesNotMatch(page, /<link\b[^>]*\brel\s*=\s*["']?stylesheet\b/i);
  let initialize;
  const context = {
    document: {
      readyState: 'loading',
      addEventListener(type, handler) {
        if (type === 'DOMContentLoaded') initialize = handler;
      }
    }
  };
  context.window = context;
  for (const [, attributes, script] of scripts) {
    assert.doesNotMatch(attributes, /\bsrc\s*=/i);
    runInNewContext(script, context, { filename: 'index.html' });
  }
  assert.ok(context.TLData.CLUBS.length >= 2);
  assert.equal(typeof context.TLPhysics.aerial, 'function');
  assert.equal(typeof context.TLEngine.Match, 'function');
  const fixture = new context.TLEngine.Match(context.TLData.CLUBS[0], context.TLData.CLUBS[1], { seed: 71 });
  for (let i = 0; i < 160; i++) fixture.step(.025);
  assert.equal(fixture.phase, 'open');
  assert.ok(Number.isFinite(fixture.ball.x));
  assert.equal(typeof context.TLRender.Renderer, 'function');
  assert.equal(typeof context.TLReferee.Referee, 'function');
  assert.equal(typeof context.TLAudio.init, 'function');
  assert.equal(Object.keys(context.TLHighlights.MODES).length, 4);
  assert.equal(context.TLHighlights.DEFAULT_MODE, 'extended');
  assert.equal(typeof context.TLHighlights.scanBatch, 'function');
  assert.equal(typeof initialize, 'function');
});

test('a seeded fixture produces reproducible opening play and replay snapshots', () => {
  function play() {
    let snapshotCount = 0;
    let lastSnapshot;
    const match = new Match(CLUBS[0], CLUBS[1], {
      seed: 7,
      onSnapshot(snapshot) {
        snapshotCount++;
        lastSnapshot = snapshot;
      }
    });
    assert.equal(match.onPitchPlayers().length, 22);
    for (let i = 0; i < 40 * 90; i++) match.step(1 / 40);
    assert.equal(match.half, 1);
    assert.ok(match.t >= 89.9 && match.t <= 90.1);
    assert.ok(match.events.some(event => event.type === 'kickoff'));
    assert.ok(snapshotCount > 0, 'Expected replay frames from opening play.');
    const { x, y, z } = match.ball;
    const positions = match.onPitchPlayers().map(player => [player.id, player.x, player.y]);
    assert.ok([x, y, z, ...positions.flatMap(([, px, py]) => [px, py])].every(Number.isFinite));
    return {
      score: match.teams.map(team => team.score),
      timeline: match.events.map(event => [event.type, event.t, event.team, event.text]),
      ball: [x, y, z],
      positions,
      snapshotCount,
      lastSnapshot
    };
  }
  assert.deepEqual(play(), play());
});
