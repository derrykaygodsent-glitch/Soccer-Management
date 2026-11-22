const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sources = fs.readdirSync(path.resolve('src'))
  .filter(name => name.endsWith('.js') || name.endsWith('.html'))
  .map(name => path.resolve('src', name));

test('all game disclosure panels render expanded and stale arrow and chevron icons are absent', () => {
  for (const file of [...sources, path.resolve('index.html')]) {
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(/<details\b[^>]*>/g)) {
      assert.match(match[0], /(?:^|\s)open(?:\s|>)/, `${path.basename(file)} has a collapsed disclosure: ${match[0]}`);
    }
    assert.doesNotMatch(text, /i-arrow|hc-i-chevron|[\u2190-\u21ff‹›➜➤⟶▶▸►⮕]/, `${path.basename(file)} contains a directional arrow icon`);
  }
});
