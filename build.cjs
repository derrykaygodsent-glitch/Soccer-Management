/* Build the offline game. Fonts, icons and player portraits travel with the HTML. */
'use strict';
const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const src = join(__dirname, 'src');
const read = name => readFileSync(join(src, name), 'utf8');
const base64 = name => readFileSync(join(src, name)).toString('base64');
const css = [read('style.css'), read('home.css')].join('\n')
  .replace('{{INTER}}', () => base64('fonts/inter-variable.woff2'))
  .replace('{{BARLOW}}', () => base64('fonts/barlow-condensed-700.woff2'));
const portraits = Object.fromEntries(['forward', 'winger', 'defender', 'midfielder'].map(id => [id, 'data:image/webp;base64,' + base64(`media/home-player-${id}.webp`)]));
const files = ['data.js', 'home-data.js', 'pitch.js', 'physics.js', 'decisions.js', 'setpieces.js', 'referee.js', 'engine.js', 'render.js', 'audio.js', 'broadcast.js', 'highlights.js', 'ui.js', 'home.js'];
const js = files.map(name => `/* ===== ${name} ===== */\n${read(name)}`).join('\n;\n')
  .replace('/* @HOME_PORTRAITS@ */ {}', () => JSON.stringify(portraits));
const html = read('template.html')
  .replace('{{CSS}}', () => css)
  .replace('{{HOME_ICONS}}', () => read('home-icons.html'))
  .replace('{{HOME}}', () => read('home.html'))
  .replace('{{JS}}', () => js);
writeFileSync(join(__dirname, 'index.html'), html);
console.log(`Built Touchline 26 — Club Home and Classic 2D (${(Buffer.byteLength(html) / 1024).toFixed(1)} KiB)`);
