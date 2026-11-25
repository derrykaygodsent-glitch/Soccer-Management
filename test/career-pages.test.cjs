const test = require('node:test'), a = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs');
// Render every redesigned career page against a realistic founder save and fail on a crash or empty page.
const read = n => fs.readFileSync(require.resolve('../src/' + n), 'utf8');
const esc = v => String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;');
const attrs = { pace: 12, passing: 13, shooting: 11, tackling: 10, positioning: 12, composure: 11, stamina: 12, vision: 11, dribbling:12, workRate:12, handling:8, reflexes:8, aggression:10 };
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
  dressing: { club: 'Kay FC', people: { p1: { day: 14, fitness: 92, sharp: 88, mood: 74, settled: 86, injuredUntil: 0, missed: 0, reason: 'Trusted with match minutes.' }, p2: { day: 14, fitness: 88, sharp: 52, mood: 61, settled: 70, injuredUntil: 0, missed: 1, talkDay:14, reason: 'Wants more minutes.' }, p3: { day: 14, fitness: 70, sharp: 60, mood: 48, settled: 55, injuredUntil: 20, missed: 0, reason: 'Carrying a knock; rest is advised.' }, p4: { day: 14, fitness: 95, sharp: 90, mood: 80, settled: 90, injuredUntil: 0, missed: 0, reason: 'Ready for selection.' } }, ties: { 'p2|p3': -3, 'p1|p4': 4 }, diary: [{ day: 13, text: 'Amar Neri: spoke with Kofi Vico about the disagreement.' }], workload: { p1: { minutes: 540, sessions: 6 }, p2: { minutes: 90, sessions: 4 } } },
  staffGrowth:{p2:{sessions:6,points:2}},playerGrowth:{p2:{log:[{day:13,staff:'Youth Coach',attribute:'passing',delta:1,source:'Youth development coach'}]}},
  enterprise: { deposit: { principal: 10000, due: 40 }, stall: { setupCost: 800, next: 20, paid: 120, weeks: 2 } },
};
career.clubRivalries = { [JSON.stringify(['East Pier', 'Kay FC'])]: { id: JSON.stringify(['East Pier', 'Kay FC']), clubs: ['East Pier', 'Kay FC'], status: 'Established', seasons: [{ year: 2027 }, { year: 2028 }], closeMeetings: 4, history: [{ year: 2027, close: 2, titleRace: false }, { year: 2028, close: 2, titleRace: true }] } };
const table = [{ rank: 1, name: 'Kay FC', p: 6, w: 4, d: 1, l: 1, gs: 12, gc: 6, pts: 13, gd: 6, form: ['W', 'W', 'D', 'L', 'W'] }, { rank: 2, name: 'East Pier', p: 6, w: 3, d: 2, l: 1, gs: 9, gc: 5, pts: 11, gd: 4, form: ['D', 'W', 'W', 'D', 'L'] }];
const ROLE_WEIGHTS = require('../src/data').ROLE_WEIGHTS;
pool[1].ceiling=180;pool[2].ceiling=150;pool[2].change={pace:-1};
const g = {
  TLClubUI: { esc, art: () => '<img class="cc-art" alt="">' },
  TLData: { ROLE_WEIGHTS, seedFor: () => 7 },
  TLEstate: { venue: s => s.club?.governance?.lease || null },
  TLLuma: { personalWealth: s => ({ total: s.cash + 45000, rows: [['Wallet', s.cash], ['Home', 45000]] }), format: money },
  TLPlayerMind: { personality: () => ({ adaptability: 5 }) },
  TLZones: { ability:p=>({pa:p.ceiling||140}) },
  TLDynamics: {
    state: (s, p) => s.dressing?.people[p.id] || null,
    room: s => s.dressing,
    snapshot: s => ({ players: s.dressing.people, ties: s.dressing.ties }),
  },
  TLManagerLife: { money, date: day, pool, nations: { Zandora: ['Kay FC', 'East Pier'] }, table: () => table, jobs: ['Assistant coach'] },
  TLClubRivalries: require('../src/club-rivalries'),
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
  for (const bit of ['Kay FC', 'The Destroyers', 'League position', 'Municipal Ground', 'District Cup', 'club story', 'Rivalries from the record', 'East Pier', 'established']) a.ok(html.includes(bit), `missing ${bit}`);
  const average=html.match(/<dt>Average ability<\/dt><dd>(\d+)\/100/);
  a.ok(average,'average ability should be a bounded score out of 100');
  a.ok(+average[1]>=0&&+average[1]<=100);
  a.ok(g.TLClubProfile.ability(pool[2])>0,'central defenders should use the DC role weighting');
});
test('training plan shows the scheduled session and season workload totals',()=>{
  const html=g.TLTrainingRoom.render(career,pool);
  a.match(html,/Team practice/);
  a.match(html,/Season training record/);
  a.match(html,/Team sessions/);
  a.match(html,/>10<\/dd>/);
});
test('player development shows individual potential estimates, specific attribute movement, coach sessions and minutes', () => {
  const html = g.TLCareerDevelopment.render(career);
  a.match(html, /Youth development/);
  a.match(html, /Estimated potential/);
  a.match(html, /UP \+1/);
  a.match(html, /DOWN -1/);
  a.match(html, /Passing/);
  a.match(html, /Youth Coach/);
  a.match(html, /2\/4 toward the next attribute increase/);
  a.match(html, /540/, 'minutes should be shown');
  a.equal(g.TLCareerDevelopment.ceiling(pool[1]),90);
  a.equal(g.TLCareerDevelopment.ceiling(pool[2]),75);
});
test('dynamics flags the unhappy player and knock, explains match impact, and shows talk cooldown', () => {
  const html = g.TLDynamics.render(career, pool);
  a.match(html, /Friction|unhappy|Knock/i);
  a.match(html, /Cohesion/);
  a.match(html,/Low morale can affect match readiness/);
  a.match(html,/Conversation follow-up available/);
});
test('medical view gives return dates, distinguishes condition from injury, and lists medical staff only',()=>{
  const med={...career,dressing:{...career.dressing,people:{...career.dressing.people,p2:{...career.dressing.people.p2,fitness:64}}}};
  const html=g.TLDynamics.render(med,pool,true);
  a.match(html,/Expected return from/);
  a.match(html,/Estimated days remaining/);
  a.match(html,/Manage load/);
  a.match(html,/Not injured/);
  a.match(html,/No physio or sports scientist appointed/);
  a.match(html,/Low condition can reduce match performance/);
});
test('an empty club renders an invitation instead of crashing', () => {
  const empty = { ...career, club: null, roster: [], staff: [], dressing: null, seasonBook: [], enterprise: {} };
  a.match(g.TLClubProfile.render(empty), /No club yet/);
  a.match(g.TLCareerDevelopment.render(empty), /No players to develop yet/);
});
