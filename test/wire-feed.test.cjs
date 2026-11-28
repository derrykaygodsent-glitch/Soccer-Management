/* The Wire and the Terrace state their range and turn pages instead of unrolling everything. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const read = name => fs.readFileSync(path.join(__dirname, '..', 'src', name), 'utf8');
const Pager = require('../src/wire-pager.js');

/* A hand-made element is enough: the pager only needs children, a document and a class list. */
function node(tag, className = '') {
  const classes = new Set(className.split(' ').filter(Boolean));
  return {
    tagName: tag.toUpperCase(),
    className,
    get classList() {
      const self = this;
      return { contains: c => String(self.className || '').split(' ').includes(c), add: () => {} };
    },
    dataset: {},
    children: [],
    hidden: false,
    attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
    append(child) { child.parentNode = this; this.children.push(child); },
    querySelectorAll: (sel) => (sel === '[data-wire-stream]' ? [this] : []),
    ownerDocument: { createElement: t => node(t) },
  };
}

function stream(count, size, sizePhone) {
  const el = node('div', 'terrace-stream');
  el.dataset.wireKey = 'terrace:all';
  el.dataset.wireSize = String(size);
  el.dataset.wireSizePhone = String(sizePhone || size);
  el.dataset.wireNoun = 'posts';
  for (let i = 0; i < count; i += 1) el.append(node('article', 'terrace-post'));
  return el;
}

const items = el => el.children.filter(k => !(k.classList && k.classList.contains('wire-pager')));
const pagerOf = el => el.__wirePager;
const rangeOf = el => (pagerOf(el).innerHTML.match(/Showing [^<]+/) || [''])[0];
const navOf = el => (pagerOf(el).innerHTML.match(/Page \d+ of \d+/) || [''])[0];
const disabled = (el, step) => new RegExp(`data-wire-step="${step}"[^>]*disabled`).test(pagerOf(el).innerHTML);

test('the feed states a range and pages, six at a time on a desk and four on a phone', () => {
  const wide = stream(26, 6, 4);
  global.innerWidth = 1440;
  Pager.paint(wide);
  assert.equal(items(wide).filter(k => !k.hidden).length, 6, 'six posts on a desk');
  assert.equal(rangeOf(wide), 'Showing 1 to 6 of 26 posts');
  assert.equal(navOf(wide), 'Page 1 of 5');
  assert.ok(disabled(wide, -1), 'there is no page before the first');
  assert.ok(!disabled(wide, 1), 'and there is one after it');

  global.innerWidth = 390;
  const phone = stream(26, 6, 4);
  Pager.paint(phone);
  assert.equal(items(phone).filter(k => !k.hidden).length, 4, 'four posts on a phone');
  assert.equal(rangeOf(phone), 'Showing 1 to 4 of 26 posts');
  assert.equal(navOf(phone), 'Page 1 of 7');
  delete global.innerWidth;
});

test('turning a page moves the range, the page number and both arrows', () => {
  global.innerWidth = 1440;
  const el = stream(26, 6, 4);
  Pager.paint(el);
  Pager.step(el, 1);
  assert.equal(rangeOf(el), 'Showing 7 to 12 of 26 posts');
  assert.equal(navOf(el), 'Page 2 of 5');
  assert.ok(!disabled(el, -1), 'now there is a page before');
  Pager.step(el, 1); Pager.step(el, 1); Pager.step(el, 1);
  assert.equal(navOf(el), 'Page 5 of 5');
  assert.equal(rangeOf(el), 'Showing 25 to 26 of 26 posts');
  assert.ok(disabled(el, 1), 'the last page has no next');
  Pager.step(el, 1);
  assert.equal(navOf(el), 'Page 5 of 5', 'and it stops there');
  Pager.step(el, -9);
  assert.equal(navOf(el), 'Page 1 of 5', 'nor does it run off the front');
  delete global.innerWidth;
});

test('a short stream says it is showing everything and offers no arrows', () => {
  global.innerWidth = 390;
  const el = stream(3, 6, 4);
  Pager.paint(el);
  assert.equal(rangeOf(el), 'Showing all 3 posts');
  assert.equal(navOf(el), '');
  assert.equal(items(el).filter(k => k.hidden).length, 0);
  const one = stream(1, 6, 4);
  Pager.paint(one);
  assert.equal(rangeOf(one), 'Showing all 1 post', 'a single post is not "1 posts"');
  delete global.innerWidth;
});

test('the pager names its pages for screen readers and hides nothing else', () => {
  const el = stream(9, 6, 4);
  Pager.paint(el);
  const pager = pagerOf(el);
  assert.equal(pager.tagName, 'NAV');
  assert.equal(pager.attributes['data-wire-pager'], '');
  assert.equal(pager.attributes['aria-label'], 'Pages of posts');
  assert.match(pager.innerHTML, /role="status"/);
  assert.equal(items(el).length, 9, 'every post stays in the document, only its page decides visibility');
});

test('the two streams declare the pager, Wire leads the scopes, threads stay out of the document until opened', () => {
  const feed = read('meridian-feed.js');
  const terrace = read('supporters-network.js');

  assert.match(feed, /\[\['For you','Wire'\],\['Discussions','Terrace'\],\['Local','Local'\],\['World','World'\],\['My feed','My feed'\]\]/, 'five named scopes, Wire first');
  assert.match(feed, /class="pulse-stream" data-wire-stream="wire" data-wire-key="wire:\$\{e\(tab\)\}"[^>]*data-wire-noun="stories"/, 'the Wire stream is paged and states "stories"');
  assert.match(terrace, /class="terrace-stream" data-wire-stream="terrace" data-wire-key="terrace:[^"]*"[^>]*data-wire-noun="posts"/, 'the Terrace stream is paged and states "posts"');
  assert.doesNotMatch(terrace, /data-tl-list/, 'the old show-more pager steps aside for the new one');
  assert.match(terrace, /\$\{s\.networkFocus===p\.id\?`<details open class="terrace-thread" data-thread-id="\$\{id\}" id="thread-\$\{id\}">/, 'a thread is only in the document while its post is the one being read');
  assert.match(terrace, /data-thread-toggle data-thread-for="\$\{id\}" aria-controls="thread-\$\{id\}" aria-expanded="\$\{s\.networkFocus===p\.id\?'true':'false'\}"/, 'the comments button says whether the thread is open and what it controls');
  assert.match(feed, /breaking\.text&&breaking\.text!==breaking\.title\?`<p>/, 'a breaking line that has no extra copy does not repeat its own headline');
  assert.match(read('football-press.js'), /<h3>\$\{e\(p\.title\)\}<\/h3>\$\{p\.text&&p\.text!==p\.title\?/, 'and the press cards do the same');
});

test('the shell runs the feed pager after every draw', () => {
  const desk = read('manager-desk.js');
  assert.match(desk, /g\.TLListPager\?\.apply\(desk,page\+'::'\+s\.id\);g\.TLWirePager\?\.apply\(desk\);/, 'the pager is applied with the other post-render passes');
  assert.match(desk, /let terraceClub='';let feedTab='For you';/, 'the page opens on the Wire, not on twenty-six posts');
  const build = fs.readFileSync(path.join(__dirname, '..', 'build.cjs'), 'utf8');
  assert.match(build, /'list-pager\.js', 'wire-pager\.js'/, 'the module is in the bundle');
});
