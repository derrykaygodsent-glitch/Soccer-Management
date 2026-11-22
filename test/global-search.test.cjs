const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

global.window = global;
global.TLData = require('../src/data');
global.TLMeridian = require('../src/meridian');
global.TLManagerLife = require('../src/manager-life');
global.TLClubUI = { esc: value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]) };
global.TLPlayerContracts = { representative: player => player.id === global.TLManagerLife.pool[0].id ? 'Agency Test' : null };
global.TLTechnical = { office: (_s, club, nation) => ({ coach: { id: `manager:${nation}:${club}`, name: `Coach ${club}`, nation } }) };
global.TLFASeason = { leagueName: (_s, nation) => `${nation} League` };
global.TLTurnover = { season: () => 2026 };
global.TLCups = { circuit: () => [] };
const W = global.TLManagerLife;
const search = require('../src/global-search');

function career() {
  return W.create({
    name: 'Nia Bell', age: 31, gender: 'Female', nation: 'Valdoria',
    job: 'Community coach', marital: 'Single', children: [], face: 'Oval', skin: 'Brown', path: 'apply',
  }, 'global-search-tests');
}

test('global search indexes and ranks real player and club IDs as well as names', () => {
  const s = career(), player = W.pool.find(person => person.club === W.nations.Valdoria[0]);
  const playerResult = search.search(s, player.id)[0];
  assert.equal(playerResult.type, 'Player');
  assert.equal(playerResult.target.id, player.id);
  assert.match(search.results(s, player.id), new RegExp(`ID ${player.id}`));
  assert.match(search.results(s, player.name), new RegExp(`data-search-club-squad="${player.club}"`));
  const country = global.TLMeridian.countries.find(item => item.name === 'Valdoria');
  const club = country.members.find(item => item.id);
  const clubResult = search.search(s, club.id).find(result => result.type === 'Club');
  assert.equal(clubResult.target.name, club.name);
  assert.match(search.results(s, club.id), new RegExp(`data-world-club="${club.name}"`));
});

test('global search covers agents, managers, nations, competitions, settlements and desks', () => {
  const s = career(), player = W.pool[0], agent = search.search(s, 'Agency Test').find(row => row.type === 'Agent');
  assert.ok(agent);
  assert.match(search.agentPanel(s, 'Agency Test'), new RegExp(`data-(?:squad|league)-player="${player.id}"`));
  assert.ok(search.search(s, 'manager:Valdoria:')[0]?.type === 'Manager');
  assert.ok(search.search(s, 'VLD')[0]?.type === 'Nation');
  assert.ok(search.search(s, 'Valdoria League')[0]?.type === 'Competition');
  assert.ok(search.search(s, 'VLD-grandessa')[0]?.type === 'Settlement');
  assert.ok(search.search(s, 'scouting centre')[0]?.target.page === 'scouting');
});

test('mobile search input keeps usable text width and pins results inside the viewport', () => {
  const css = fs.readFileSync(require.resolve('../src/home.css'), 'utf8');
  assert.match(css, /\.hc-global-search input\{flex:1 1 0;width:0;min-width:0/);
  assert.ok(css.includes('@media(max-width:660px)'));
  assert.ok(css.includes('.hc-global-results{position:fixed;top:65px;left:12px;right:12px;width:auto'));
});

test('search result markup preserves entity IDs and emits actionable direct routes', () => {
  const s = career(), player = W.pool.find(person => person.club && person.club !== '');
  const html = search.results(s, player.id);
  assert.match(html, /data-global-result/);
  assert.match(html, /data-league-player=/);
  assert.match(html, /data-search-club-squad=/);
  assert.doesNotMatch(html, /No matching game entities/);
  assert.match(search.results(s, 'no-such-entity'), /No matching game entities/);
  const router = fs.readFileSync(require.resolve('../src/manager-desk.js'), 'utf8');
  for (const target of ['searchClubSquad', 'searchCompetition', 'searchAgent', 'searchPage', 'worldClub', 'worldManager', 'worldLeague', 'guideCountry', 'leaguePlayer', 'squadPlayer']) {
    assert.match(router, new RegExp(`target\\.${target}|b\\.dataset\\.${target}`), `${target} action has a manager-desk route`);
  }
});
