/* Bundle TOUCHLINE 26 into a single self-contained index.html */
const fs = require('fs');
const path = require('path');
const root = __dirname;
const css = fs.readFileSync(path.join(root, 'src/style.css'), 'utf8');
const files = ['data.js', 'engine.js', 'render.js', 'audio.js', 'ui.js'];
const js = files.map(f => `/* ===== ${f} ===== */\n` + fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('\n;\n');
let html = fs.readFileSync(path.join(root, 'src/template.html'), 'utf8');
html = html.replace('{{CSS}}', () => css).replace('{{JS}}', () => js);
fs.writeFileSync(path.join(root, 'index.html'), html);
console.log('Built index.html:', (html.length / 1024).toFixed(1) + ' KB');
