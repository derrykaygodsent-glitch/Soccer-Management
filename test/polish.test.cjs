'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync, readdirSync } = require('node:fs');
const { join, resolve } = require('node:path');

const root = resolve(__dirname, '..');
const src = join(root, 'src');
const bundle = () => readFileSync(join(root, 'index.html'), 'utf8');

const ARROWS = ['\u2192', '\u2190', '\u2191', '\u2193', '\u27f6', '\u2794', '\u279c', '\u279d', '\u279e', '\u27a1'];
const typography = file => {
  const text = readFileSync(file, 'utf8');
  return {
    em: (text.match(/\u2014/g) || []).length,
    arrows: ARROWS.reduce((total, glyph) => total + text.split(glyph).length - 1, 0),
    text
  };
};

test('the game text uses no em dashes or arrow characters', () => {
  const files = readdirSync(src)
    .filter(name => /\.(js|css|html)$/.test(name))
    .map(name => join(src, name));
  for (const file of files) {
    const { em, arrows } = typography(file);
    assert.equal(em, 0, `${file} still contains an em dash`);
    assert.equal(arrows, 0, `${file} still contains an arrow glyph`);
  }
  const page = bundle();
  assert.equal((page.match(/\u2014/g) || []).length, 0, 'the bundled HTML contains an em dash');
  assert.equal(ARROWS.reduce((total, glyph) => total + page.split(glyph).length - 1, 0), 0,
    'the bundled HTML contains an arrow glyph');
});

test('the interaction layer ships hover colour, live motion and a reduced-motion guard', () => {
  const page = bundle();
  const css = [...page.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(([, body]) => body).join('\n');
  assert.match(css, /Touchline 26 interaction and motion layer/, 'polish.css is part of the build');
  const hoverRules = css.match(/:hover[^{]*\{[^}]*background[^}]*\}/g) || [];
  assert.ok(hoverRules.length >= 20, `expected broad hover colour, found ${hoverRules.length}`);
  assert.match(css, /--hover-wash|linear-gradient\(90deg,#2a3f57/, 'selections show a colour wash');
  for (const keyframe of ['mo-rise', 'mo-bump', 'mo-live', 'mo-drift', 'mo-score']) {
    assert.ok(css.includes(`@keyframes ${keyframe}`), `${keyframe} motion is bundled`);
  }
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)\{\*,\*::before,\*::after\{[^}]*animation:none!important/,
    'reduced motion still disables every animation');
  assert.match(css, /#score\[data-hit\]/, 'a goal pulses the scoreboard');
});

test('icons are drawn, selected and animated rather than pointed at', () => {
  const page = bundle();
  assert.doesNotMatch(page, /<symbol id="i-arrow"[^>]*><path d="M4 12h15/, 'the arrow symbol is not a pointer');
  assert.doesNotMatch(page, /<symbol id="i-skip"[^>]*><path d="m5 6 7 6/, 'the skip symbol is not a pointer');
  assert.doesNotMatch(page, /<symbol id="i-replay"[^>]*><path d="M3\.5 11\.5/, 'the replay symbol is not a loop arrow');
  assert.match(page, /\.md-attack-glyph\{[^}]*mo-bob/, 'the attacking-direction mark animates');
});
