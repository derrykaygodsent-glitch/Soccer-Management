/* Matches is the match week: one fixture in focus, six preparation jobs, and the season behind it. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const read = (dir, name) => fs.readFileSync(path.join(__dirname, '..', dir, name), 'utf8');
const iso = day => new Date(Date.UTC(2026, 10, 1) + day * 864e5).toISOString().slice(0, 10);

global.TLClubUI = {
  esc: value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]),
};

/* The desk reads the career, not the match shell: every seam is a stub so the tests state the contract. */
const FIXTURES = [
  { day: 90, team: 'Mavelle Teachers', host: 'Kay FC', key: 'k0', kickoff: '15:00' },
  { day: 104, team: 'Kay FC', host: 'Kintaba Teachers', key: 'k1', kickoff: '17:30' },
  { day: 118, team: 'Koroba Railway', host: 'Kay FC', key: 'k2', kickoff: '' },
];
const PLAYERS = Array.from({ length: 14 }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}` }));
const NUMBERS = Object.fromEntries(PLAYERS.map((p, i) => [p.id, i + 1]));
global.TLManagerLife = { pool: PLAYERS, nations: { Zandora: ['Kay FC', 'Mavelle Teachers', 'Kintaba Teachers', 'Koroba Railway'] }, date: iso };
global.TLFASeason = {
  fixtures: () => FIXTURES,
  leagueName: () => 'Zandora Premier League',
  kickoff: () => '',
};
global.TLTurnover = { season: () => 2027 };
global.TLCups = { circuit: () => [] };
global.TLLeagueMatchday = { fixture: () => null };
global.TLSeasonCalendar = {};
global.TLData = {};
global.TLMatchBoard = {};
global.TLDynamics = { snapshot: () => ({ players: Object.fromEntries(PLAYERS.map(p => [p.id, { fitness: 91, injuredUntil: 0 }])) }) };
const kitState = { numbers: NUMBERS };
const faState = { bans: [] };
global.TLKit = { matchNumbers: () => kitState.numbers };
global.TLFAOffice = { suspendedPlayers: () => faState.bans };

const Matches = require('../src/matches-desk');

function career(extra = {}) {
  return {
    id: 'matches-test',
    day: 100,
    profile: { nation: 'Zandora' },
    club: { name: 'Kay FC' },
    roster: PLAYERS.map(p => p.id),
    leagueScores: { k0: { score: [1, 0] } },
    boards: [{ ids: PLAYERS.slice(0, 11).map(p => p.id), defenseFormation: '4-1-4-1', system: 'Gegenpressing' }],
    boardIndex: 0,
    friendlyHistory: [],
    practices: [],
    ...extra,
  };
}

test('two sections, the fixture first, and the open one says so', () => {
  const html = Matches.render(career());
  const tabs = [...html.matchAll(/data-match-tab="([a-z]+)"[^>]*aria-pressed="(\w+)"/g)].map(m => [m[1], m[2]]);
  assert.deepEqual(tabs, [['next', 'true'], ['season', 'false']]);
  assert.match(html, /NEXT MATCH/);
  assert.match(Matches.render(career(), 'season'), /data-match-tab="season" aria-pressed="true"/);
  assert.match(Matches.render(career(), 'nonsense'), /data-match-tab="next" aria-pressed="true"/, 'an unknown section falls back to the fixture');
});

test('the fixture in focus names both clubs, the date, the venue and the countdown', () => {
  const soon = Matches.render(career());
  assert.match(soon, /Kay FC<\/span> <em>v<\/em> <span>Kintaba Teachers/, 'the next fixture is the one after today');
  assert.match(soon, /In 4 days/);
  assert.match(soon, /Home/);
  const today = Matches.render(career({ day: 104 }));
  assert.match(today, /<b>Today<\/b>/);
  assert.match(today, /Enter matchday/, 'a league fixture due today offers the matchday');
});

test('six preparation jobs, each one click from the page that does it', () => {
  const html = Matches.render(career());
  const jobs = [...html.matchAll(/class="match-job[^"]*" data-life="go" data-v="([a-zA-Z]+)"><b>([^<]+)<\/b><span>([^<]+)<\/span>/g)].map(m => [m[2], m[3], m[1]]);
  assert.equal(jobs.length, 6, 'six jobs, no more');
  assert.deepEqual(jobs.map(j => j[0]), ['Team selection', 'Shape and orders', 'Condition', 'Squad numbers', 'Discipline', 'Training']);
  assert.deepEqual(jobs.map(j => j[2]), ['tactics', 'tactics', 'medical', 'kitOffice', 'faOffice', 'training']);
  assert.match(jobs[0][1], /11 of 11 named/);
  assert.match(jobs[1][1], /4-1-4-1 · Gegenpressing/);
  assert.match(jobs[2][1], /14 available/);
  assert.match(jobs[3][1], /Every named player is numbered/);
  assert.match(jobs[4][1], /No suspension for this fixture/);
  assert.equal((html.match(/Needs you/g) || []).length, 0, 'nothing needs the manager in this career');
});

test('a gap in the preparation is stated on the job and counted in the header', () => {
  const nine = PLAYERS.slice(0, 9).map(p => p.id);
  const s = career({ boards: [{ ids: nine, defenseFormation: '4-4-2' }] });
  kitState.numbers = Object.fromEntries(PLAYERS.slice(0, 8).map((p, i) => [p.id, i + 1]));
  faState.bans = ['Amar Neri'];
  try {
    const html = Matches.render(s);
    assert.match(html, /9 of 11 named/);
    assert.match(html, /1 named player has no number/);
    assert.match(html, /1 suspension for this fixture/);
    assert.match(html, /3 to look at/);
    assert.equal((html.match(/Needs you/g) || []).length, 3, 'selection, numbers and discipline are flagged');
  } finally {
    kitState.numbers = NUMBERS;
    faState.bans = [];
  }
});

test('the season states the record, the next five and every played match, paged', () => {
  const html = Matches.render(career(), 'season');
  assert.match(html, /<small>Played<\/small><b>1<\/b>/, 'a fixture is counted once even when every season asks for it');
  assert.match(html, /<small>Lost<\/small><b>1<\/b>/);
  assert.match(html, /<small>Goals<\/small><b>0–1<\/b>/);
  assert.match(html, /Coming up/);
  assert.match(html, /data-wire-stream="season" data-wire-key="matches:season" data-wire-size="14" data-wire-size-phone="8" data-wire-noun="matches"/);
  assert.match(html, /match-score match-score-l">0–1</, 'a defeat is marked as one');
  assert.doesNotMatch(html, /data-none/, 'no placeholder markup is left in the page');
});

test('a career with no club, or a finished one, is told the truth instead of an empty fixture', () => {
  const noClub = Matches.render(career({ club: null }));
  assert.match(noClub, /No fixture scheduled/);
  assert.match(noClub, /Find a club/);
  const ended = Matches.render(career({ legacy: { exit: true } }));
  assert.match(ended, /Your management duties have ended/);
  assert.match(ended, /data-v="legacy"/);
});

test('the shell gives Matches its own desk and leaves the diary on the calendar page', () => {
  const desk = read('src', 'manager-desk.js');
  assert.match(desk, /let matchView='next'/, 'the section a manager was reading survives a redraw');
  assert.match(desk, /case 'fixtures':return g\.TLMatchesDesk\.render\(s,matchView\);/);
  assert.match(desk, /case 'day':return btn\('advance','Advance one day'\)\+g\.TLOfficeOrganiser\.calendar\(s,organiser\);/);
  assert.doesNotMatch(desk, /case 'fixtures':case 'day':/, 'the two pages are no longer the same page');
  assert.match(desk, /if\(b\.dataset\.matchTab\)\{matchView=b\.dataset\.matchTab;draw\(\);/, 'a section click redraws');
  assert.match(desk, /if\(!e\.detail\)root\.querySelector\(`\[data-match-tab=/, 'only a keyboard click moves focus');
  assert.match(read('.', 'build.cjs'), /'matches-desk\.js'/, 'the module ships');
  const css = read('src', 'office.css');
  for (const rule of ['.match-nav', '.match-job', '.match-row', '.match-record', '.match-facts']) assert.ok(css.includes(rule), `${rule} is styled`);
  assert.match(css, /@media\(max-width:860px\)\{\s*\.match-hero/, 'a phone gets its own row shape');
});
