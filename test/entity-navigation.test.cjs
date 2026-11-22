const test = require('node:test');
const assert = require('node:assert/strict');
const W = require('../src/manager-life');
const T = require('../src/technical-area');
const D = require('../src/data');
const FA = require('../src/fa-season');
const guide = require('../src/world-guide');
const meridian = require('../src/meridian');
const managerProfile = require('../src/manager-profile');
const clubProfile = require('../src/club-profile');

global.TLData = D;
global.TLTechnical = T;
global.TLFASeason = FA;
global.TLClubUI = {
  esc: value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]),
  art: () => '',
};

function career() {
  return W.create({
    name: 'Nia Bell', age: 31, gender: 'Female', nation: 'Valdoria',
    job: 'Community coach', marital: 'Single', children: [], face: 'Oval',
    skin: 'Brown', path: 'apply',
  }, 'entity-links');
}

test('world guide club labels are openable dossiers while settlement jump metadata remains available', () => {
  const html = guide.club('Valdoria', 'Grandessa FC');
  assert.match(html, /data-world-club="Grandessa FC"/);
  assert.match(html, /data-guide-country="VLD"/);
  assert.match(html, /data-guide-place="VLD-grandessa"/);
  assert.match(guide.results('Grandessa FC'), /data-world-club="Grandessa FC"/);
  assert.match(guide.passport('VLD', 'grandessa'), /data-world-club="Grandessa FC"/);
});

test('world club and manager files expose cross-links to their related entities', () => {
  const s = career();
  const nation = 'Valdoria';
  const club = W.nations[nation][1];
  const office = T.office(s, club, nation, W.nations[nation]);
  const managerHtml = managerProfile.renderWorld(s, office.coach.id, club);
  assert.match(managerHtml, new RegExp(`data-world-club="${club}"`));
  assert.match(managerHtml, new RegExp(office.coach.name));

  const clubHtml = clubProfile.renderWorld(s, club);
  assert.match(clubHtml, new RegExp(`data-world-manager="${office.coach.id}"`));
  assert.match(clubHtml, /data-world-league="Valdoria"/);
  const player = W.pool.find(p => p.club === club);
  if (player) assert.match(clubHtml, new RegExp(`data-league-player="${player.id}"`));

  const guideOnly = meridian.countries.flatMap(country => country.members.map(member => ({ country, member }))).find(({ member }) => !Object.values(W.nations).flat().includes(member.name));
  if (guideOnly) {
    const fallback = clubProfile.renderWorld(s, guideOnly.member.name);
    assert.match(fallback, /world guide/);
    assert.match(fallback, new RegExp(`data-guide-country="${guideOnly.country.code}"`));
  }
});
