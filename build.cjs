/* Build the offline Classic 2D preview. Fonts and icons travel with the HTML. */
'use strict';
const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const src = join(__dirname, 'src');
const read = name => readFileSync(join(src, name), 'utf8');
const font = name => readFileSync(join(src, 'fonts', name)).toString('base64');
const css = read('style.css')
  .replace('{{INTER}}', () => font('inter-variable.woff2'))
  .replace('{{BARLOW}}', () => font('barlow-condensed-700.woff2'));
const files = ['data.js', 'physics.js', 'decisions.js', 'engine.js', 'referee.js', 'render.js', 'audio.js', 'broadcast.js', 'highlights.js', 'ui.js'];
const js = files.map(name => `/* ===== ${name} ===== */\n${read(name)}`).join('\n;\n');
const html = read('template.html').replace('{{CSS}}', () => css).replace('{{JS}}', () => js);
writeFileSync(join(__dirname, 'index.html'), html);
console.log(`Built Classic 2D index.html (${(Buffer.byteLength(html) / 1024).toFixed(1)} KiB)`);
