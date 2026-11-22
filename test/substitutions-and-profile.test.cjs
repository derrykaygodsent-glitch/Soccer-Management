const test = require('node:test'), a = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
// Substitutions: a player who has been substituted can never be offered or used again.
const E = require('../src/engine'), D = require('../src/data');
function match(withLineup) {
  const clubs = [D.CLUBS[0], D.CLUBS[1]];
  const squads = clubs.map(c => D.genSquad(c, D.seedFor(c.id)));
  const opts = { seed: 5, squads };
  if (withLineup) {
    opts.lineups = squads.map(sq => {
      const { xi, bench } = D.bestXI(sq, '4-4-2');
      return { xi: xi.map(s => ({ player: s.player, role: s.role })), bench: bench.slice(0, 5), set: {} };
    });
  }
  const m = new E.Match(clubs[0], clubs[1], opts);
  m.begin();
  return m;
}
for (const listed of [false, true]) {
  test(`substitution removes the outgoing player from the bench (${listed ? 'filed sheet' : 'no sheet'})`, () => {
    const m = match(listed);
    const team = m.teams[0];
    const out = team.slots.find(s => s.role !== 'GK').player;
    const inn = team.bench.find(p => p.pos !== 'GK' && !p.red);
    a.ok(inn, 'a bench player should exist');
    const r = m.substitute(0, out.id, inn.id);
    a.equal(r.ok, true, r.msg);
    a.ok(!team.bench.some(p => p.id === out.id), 'the player who came off must not stay on the bench');
    a.ok(!team.bench.some(p => p.id === inn.id), 'the player who came on must not stay on the bench');
    a.ok(team.slots.some(s => s.player.id === inn.id), 'the replacement must be on the pitch');
  });
}
test('a substituted-out player cannot be brought back on', () => {
  const m = match(true);
  const team = m.teams[0];
  const out = team.slots.find(s => s.role !== 'GK').player;
  const inn = team.bench.find(p => p.pos !== 'GK' && !p.red);
  a.equal(m.substitute(0, out.id, inn.id).ok, true);
  const second = m.substitute(0, team.slots.find(s => s.role !== 'GK' && s.player.id !== inn.id).player.id, out.id);
  a.equal(second.ok, false, 'the subbed-off player must be rejected');
  a.match(second.msg, /already been substituted/);
});
test('a player who came on cannot be swapped straight back off', () => {
  const m = match(true);
  const team = m.teams[0];
  const out = team.slots.find(s => s.role !== 'GK').player;
  const inn = team.bench.find(p => p.pos !== 'GK' && !p.red);
  a.equal(m.substitute(0, out.id, inn.id).ok, true);
  const another = team.bench.find(p => p.pos !== 'GK' && !p.red);
  a.ok(another, 'a second bench player should exist');
  a.equal(m.substitute(0, inn.id, another.id).ok, true, 'the player who came on may be replaced by someone new');
  a.equal(m.substitute(0, team.slots.find(s => s.player.id === another.id).player.id, out.id).ok, false);
});
test('the substitute cap still applies', () => {
  const m = match(true);
  const team = m.teams[0];
  for (let i = 0; i < 5; i++) {
    const out = team.slots.find(s => s.role !== 'GK' && !s.player.subbedOn).player;
    const inn = team.bench.find(p => p.pos !== 'GK' && !p.red);
    if (!inn) break;
    a.equal(m.substitute(0, out.id, inn.id).ok, true);
  }
  const out = team.slots.find(s => s.role !== 'GK').player;
  const inn = team.bench.find(p => p.pos !== 'GK' && !p.red);
  if (inn) a.match(m.substitute(0, out.id, inn.id).msg, /No substitutions remaining/);
});
test('the manager dossier renders both tabs, including a trophy line', () => {
  const esc = v => String(v ?? '');
  const g = {
    TLClubUI: { esc, art: () => '<img>' },
    TLFamilyPaths: { read: () => ({ partner: null, kids: [], home: 'flat' }), titles: { flat: 'A flat' }, age: () => 6 },
    TLHousehold: { read: () => ({ partner: null, stage: 'Single' }) },
    TLLegacy: { read: () => ({ exit: false, status: 'Healthy' }), age: () => 35 },
    TLLuma: { personalWealth: () => ({ total: 48000, rows: [['Wallet', 3000]] }), format: n => '₥' + n },
    TLCareerEntry: { portrait: () => '<svg></svg>' },
    TLManagerLife: { money: n => '₥' + n, date: d => '2026-11-' + String(d).padStart(2, '0'), table: () => [{ rank: 1, name: 'Kay FC', p: 6, w: 4, d: 1, l: 1, gs: 12, gc: 6, pts: 13 }], nations: { Zandora: ['Kay FC'] }, pool: [] },
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/manager-profile'), 'utf8'), { window: g });
  const s = {
    day: 14, cash: 3119, fund: 31376, roster: ['a', 'b'], staff: ['Assistant coach'],
    profile: { name: 'Derry Kay Godsent', nation: 'Zandora', job: 'Community coach', path: 'found', marital: 'Single', age: 35, children: [], gender: 'Male', face: 'Round', skin: 'Tan' },
    club: { name: 'Kay FC', owner: true, appointed: 3, nick: 'The Destroyers', emblem: '★', board: 'Founding members' },
    seasonBook: [{ year: 2026, nations: {}, cupAwards: [{ title: 'District Cup', club: 'Kay FC', level: 'Zandora' }] }],
    careerSpells: [],
  };
  for (const tab of [undefined, 'history']) {
    const html = g.TLManagerProfile.render(s, { tab });
    a.ok(html.length > 500, `${tab || 'overview'} must not be blank`);
    a.match(html, /Derry Kay Godsent/);
    a.doesNotMatch(html, /undefined|NaN|\[object Object\]/);
  }
  a.match(g.TLManagerProfile.render(s, { tab: 'history' }), /District Cup/, 'trophy line must render');
});
