const test = require('node:test');
const assert = require('node:assert/strict');
const W = require('../src/manager-life');
const Circle = require('../src/district-circle');
const Terrace = require('../src/terrace-world');
const Talent = require('../src/world-talent');
const Household = require('../src/household');
const People = require('../src/district-people');

global.TLTerraceWorld = Terrace;
global.TLTalentNetwork = Talent;
global.TLClubUI = {
  esc: value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]),
  art: () => '',
};

function start() {
  const s = W.create({
    name: 'Nia Bell', age: 31, gender: 'Female', nation: 'Valdoria',
    job: 'Community coach', marital: 'Single', children: [], face: 'Oval',
    skin: 'Brown', path: 'found',
  }, 'contact-network');
  W.activate(s);
  s.districtLife = { place: 'cafe', hour: 10, energy: 100, trust: 5, contacts: [], done: [], history: [] };
  s.club = { name: 'Harbour FC', owner: true, appointed: 0 };
  s.terraceClubs = { 'club:Harbour FC': { name: 'Harbour FC', followers: 600, growth: 0, activity: 1, posts: [] } };
  let index = 0;
  while (!Circle.details(s, { id: 'contact-' + index }).link) index++;
  const source = { id: 'contact-' + index, name: 'Nora Bell', work: 'Community organiser' };
  s.household = { contacts: [source], circleProgress: {}, log: [] };
  return { s, source };
}

test('professional exchanges are saved to a reputation-scored contacts notebook', () => {
  const { s, source } = start();
  const before = Circle.reputation(s).score;
  const result = Circle.exchange(s, source, 'Supporters’ corner');
  assert.equal(result.entry.id, 'personal:' + source.id);
  assert.equal(result.entry.reputationAtExchange, before);
  assert.equal(Circle.reputation(s).score, before);
  const html = Circle.notebook(s);
  assert.match(html, /Contacts &amp; connections/);
  assert.match(html, /Nora Bell/);
  assert.match(html, /Reputation/);
  assert.match(html, /Ask for an introduction/);
  assert.match(Household.render(s), /data-v="connections"/);
  assert.match(People.render(s, 'people'), /data-v="connections"/);
});

test('earned reputation makes the introduction chain deliver local access, club reach and a national player lead', () => {
  const { s, source } = start();
  const mail = (from, text) => s.mail.unshift({ day: s.day, from, text });
  const local = Circle.step(s, s.household, source, mail);
  assert.match(local.outcome, /trusted local contact/);
  assert.equal(s.connections.people[0].role, Circle.details(s, source).link);
  assert.ok(Talent.connections(s, W.pool).includes('Valdoria'));
  assert.equal(s.household.circleProgress[source.id].level, 1);

  s.day += 14;
  const account = Terrace.ensure(s, s.club.name);
  const followersBefore = account.followers;
  const project = Circle.step(s, s.household, source, mail);
  assert.match(project.outcome, /published on its Terrace account/);
  assert.ok(account.followers > followersBefore);
  assert.ok(account.posts.some(post => post.kind === 'community' && post.text.includes('community project')));
  assert.equal(s.household.circleProgress[source.id].level, 2);

  account.followers = Math.max(500, account.followers);
  s.day += 14;
  const official = Circle.step(s, s.household, source, mail);
  assert.match(official.contact, /President/);
  assert.ok(official.report);
  assert.equal(s.worldTalentReports.length, 1);
  assert.equal(s.worldTalentReports[0].source, 'National sports council referral');
  assert.equal(s.household.circleProgress[source.id].level, 3);
  assert.equal(s.connections.history.length, 3);
  const html = Circle.notebook(s);
  assert.match(html, /national player lead/);
  assert.match(html, /Nora Bell/);
});

test('reputation and audience gates are reported before an introduction can be used', () => {
  const { s, source } = start();
  s.districtLife.trust = 0;
  s.club = null;
  assert.match(Circle.availability(s, source), /Need 5 reputation/);
  assert.throws(() => Circle.step(s, s.household, source), /Need 5 reputation/);
  s.districtLife.trust = 10;
  Circle.step(s, s.household, source);
  s.day += 14;
  assert.match(Circle.availability(s, source), /Establish a club/);
});
