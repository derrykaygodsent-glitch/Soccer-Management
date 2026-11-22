const test = require('node:test'), a = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs');
// Render every redesigned career page against a realistic founder save and fail on a crash or empty page.
const read = n => fs.readFileSync(require.resolve('../src/' + n), 'utf8');
const esc = v => String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;');
const attrs = { pace: 12, passing: 13, shooting: 11, tackling: 10, positioning: 12, composure: 11, stamina: 12, vision: 11 };
const player = (id, name, pos, age, club) => ({ id, name, pos, age, nation: 'Zandora', club, attrs, value: 42000, num: 9 });
const pool = [
  player('p1', 'Amar Neri', 'ST', 24, 'Kay FC'),
  player('p2', 'Haru Vale', 'ST', 20, 'Kay FC'),
  player('p3', 'Luca Novak', 'CB', 19, 'Kay FC'),
  player('p4', 'Kofi Vico', 'CM', 27, 'Kay FC'),
];
const day = d => new Date(Date.UTC(2026, 9, 26 + d)).toISOString().slice(0, 10);
const money = n => '₥' + Number(n || 0).toLocaleString('en-GB');
const career = {
  day: 14,
  cash: 3119,
  fund: 31376,
  profile: { name: 'Derry Kay Godsent', nation: 'Zandora', job: 'Community coach', path: 'found', marital: 'Single', children: [] },
  club: {
    name: 'Kay FC', owner: true, appointed: 3, nick: 'The Destroyers', emblem: '★', board: 'Founding members',
    promise: { answer: 'budget', reserve: 20000, nation: 'Zandora', target: 4, day: 5 },
    report: 'First month: 4 players, 0 staff and ₥31,376 in the club account.',
    governance: { members: [{ i: 0, share: 60 }], minutes: [{ day: 9, text: 'Season lease: approved (2/2).', votes: [] }], gates: [{ day: 12, opponent: 'East Pier', attendance: 620, capacity: 900, net: 3900 }], lease: { name: 'Kay FC Municipal Ground', capacity: 900, until: 200 } },
  },
  roster: pool.map(p => p.id),
  staff: ['Assistant coach'],
  contracts: { p1: { wage: 120, end: 100 }, p2: { wage: 90, end: 100 } },
  plans: [{ kind: 'training', id: 'Team practice', due: 15 }],
  seasonBook: [{ year: 2026, nations: { Zandora: { honours: [{ level: 'Zandora', title: 'League champions', club: 'Kay FC', cash: 5000 }] } }, cupAwards: [{ title: 'District Cup', club: 'Kay FC', level: 'Zandora' }] }],
  entries: { 2026: { nation: 'Zandora', name: 'Kay FC', ids: pool.map(p => p.id) } },
  armband: [],
  dressing: { club: 'Kay FC', people: { p1: { day: 14, fitness: 92, sharp: 88, mood: 74, settled: 86, injuredUntil: 0, missed: 0, reason: 'Trusted with match minutes.' }, p2: { day: 14, fitness: 88, sharp: 52, mood: 61, settled: 70, injuredUntil: 0, missed: 1, reason: 'Wants more minutes.' }, p3: { day: 14, fitness: 70, sharp: 60, mood: 48, settled: 55, injuredUntil: 20, missed: 0, reason: 'Carrying a knock; rest is advised.' }, p4: { day: 14, fitness: 95, sharp: 90, mood: 80, settled: 90, injuredUntil: 0, missed: 0, reason: 'Ready for selection.' } }, ties: { 'p2|p3': -3, 'p1|p4': 4 }, diary: [{ day: 13, text: 'Amar Neri: spoke with Kofi Vico about the disagreement.' }], workload: { p1: { minutes: 540, sessions: 6 }, p2: { minutes: 90, sessions: 4 } } },
  enterprise: { deposit: { principal: 10000, due: 40 }, stall: { setupCost: 800, next: 20, paid: 120, weeks: 2 } },
};
const table = [{ rank: 1, name: 'Kay FC', p: 6, w: 4, d: 1, l: 1, gs: 12, gc: 6, pts: 13, gd: 6, form: ['W', 'W', 'D', 'L', 'W'] }, { rank: 2, name: 'East Pier', p: 6, w: 3, d: 2, l: 1, gs: 9, gc: 5, pts: 11, gd: 4, form: ['D', 'W', 'W', 'D', 'L'] }];
const ROLE_WEIGHTS = Object.fromEntries(['GK', 'CB', 'FB', 'DM', 'CM', 'AM', 'W', 'ST'].map(p => [p, a2 => Object.values(a2).reduce((n, v) => n + v, 0)]));
const g = {
  TLClubUI: { esc, art: () => '<img class="cc-art" alt="">' },
  TLData: { ROLE_WEIGHTS, seedFor: () => 7 },
  TLEstate: { venue: s => s.club?.governance?.lease || null },
  TLLuma: { personalWealth: s => ({ total: s.cash + 45000, rows: [['Wallet', s.cash], ['Home', 45000]] }), format: money },
  TLPlayerMind: { personality: () => ({ adaptability: 5 }) },
  TLDynamics: {
    state: (s, p) => s.dressing?.people[p.id] || null,
    room: s => s.dressing,
    snapshot: s => ({ players: s.dressing.people, ties: s.dressing.ties }),
  },
  TLManagerLife: { money, date: day, pool, nations: { Zandora: ['Kay FC', 'East Pier'] }, table: () => table, jobs: ['Assistant coach'] },
};
for (const file of ['club-profile.js', 'career-development.js', 'training-room.js', 'team-dynamics.js']) {
  vm.runInNewContext(read(file), { window: g, module: undefined });
}
const pages = {
  'club profile': () => g.TLClubProfile.render(career),
  'player development': () => g.TLCareerDevelopment.render(career),
  'training': () => g.TLTrainingRoom.render(career, pool),
  'squad dynamics': () => g.TLDynamics.render(career, pool),
  'medical centre': () => g.TLDynamics.render(career, pool, true),
};
for (const [name, run] of Object.entries(pages)) {
  test(`${name} renders real content`, () => {
    const html = run();
    a.ok(html.length > 700, `${name} is suspiciously short (${html.length})`);
    a.doesNotMatch(html, /undefined|NaN|\[object Object\]/, `${name} leaked a raw value`);
  });
}
test('club profile reports identity, ground, honours and league position', () => {
  const html = g.TLClubProfile.render(career);
  for (const bit of ['Kay FC', 'The Destroyers', 'League position', 'Municipal Ground', 'District Cup', 'club story']) a.ok(html.includes(bit), `missing ${bit}`);
});
test('player development shows a projected ceiling and minutes', () => {
  const html = g.TLCareerDevelopment.render(career);
  a.match(html, /Projected growth/);
  a.match(html, /540/, 'minutes should be shown');
});
test('dynamics flags the unhappy player and the knock', () => {
  const html = g.TLDynamics.render(career, pool);
  a.match(html, /Friction|unhappy|Knock/i);
  a.match(html, /Cohesion/);
});
test('an empty club renders an invitation instead of crashing', () => {
  const empty = { ...career, club: null, roster: [], staff: [], dressing: null, seasonBook: [], enterprise: {} };
  a.match(g.TLClubProfile.render(empty), /No club yet/);
  a.match(g.TLCareerDevelopment.render(empty), /No players to develop yet/);
});
