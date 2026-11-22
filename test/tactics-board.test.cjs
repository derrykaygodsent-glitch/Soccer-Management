const test = require('node:test'), a = require('node:assert/strict'), path = require('node:path');
// The tactics board renders the FM-style three-column layout and its swap/remove commands work.
global.window = global;
const src = n => require(path.join('..', 'src', n));
for (const f of ['data.js', 'player-intelligence.js', 'team-dynamics.js', 'tactical-zones.js', 'squad-registration.js', 'match-board.js']) src(f);
const esc = v => String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;');
global.TLClubUI = { esc, art: () => '' };
global.TLManagerLife = { money: n => '₥' + n, date: d => '2026-11-' + d };
src('board-room.js');

const attrs = { pace: 12, passing: 13, shooting: 11, tackling: 10, positioning: 12, composure: 11, stamina: 12, vision: 11, handling: 12, reflexes: 13, aerial: 11, strength: 11, dribbling: 12, crossing: 11, workrate: 12, decisions: 11, aggression: 10, jumping: 11, heading: 10, longpass: 11 };
const mk = (id, name, pos, age) => ({ id, name, pos, age, nation: 'Zandora', club: 'Kay FC', attrs, value: 42000, num: 9 });
const pool = [
  mk('p1', 'Amar Neri', 'ST', 24), mk('p2', 'Haru Vale', 'ST', 20), mk('p3', 'Luca Novak', 'CB', 19),
  mk('p4', 'Kofi Vico', 'CM', 27), mk('p5', 'Ben Ash', 'GK', 30), mk('p6', 'Oli Reed', 'W', 22),
  mk('p7', 'Sam Cole', 'FB', 25), mk('p8', 'Ike Mbaye', 'DM', 23), mk('p9', 'Jo Pinto', 'AM', 21),
  mk('p10', 'Teo Ruiz', 'CB', 28), mk('p11', 'Max Idris', 'FB', 26), mk('p12', 'Kweku Boat', 'W', 24),
  mk('p13', 'Ebo Quartey', 'ST', 23), mk('p14', 'Rui Fonte', 'CM', 29),
];
const career = () => ({
  id: 'c1', day: 14, cash: 3000,
  profile: { name: 'Derry Kay Godsent', nation: 'Zandora' },
  club: { name: 'Kay FC', owner: true, governance: { lease: { capacity: 900, until: 200 } } },
  roster: pool.map(p => p.id), tactic: '4-2-3-1', style: 'Balanced shape', mentality: 'Positive',
  boards: { 0: {} }, boardIndex: 0, armband: [],
  dressing: { club: 'Kay FC', people: Object.fromEntries(pool.map(p => [p.id, { day: 14, fitness: 90, sharp: 80, mood: 70, settled: 80, injuredUntil: 0, missed: 0 }])), ties: {} },
});

test('tactics board renders the FM-style rail, pitch and squad list', () => {
  const html = TLBoardRoom.render(career(), pool);
  for (const needle of ['fm-layout', 'fm-rail', 'fm-pitch', 'fm-squad', 'TACTICAL STYLE', 'IN POSSESSION', 'IN TRANSITION', 'OUT OF POSSESSION', 'TEAM FLUIDITY', 'FORMATION', 'Quick selection'])
    a.ok(html.includes(needle), 'missing ' + needle);
  a.equal((html.match(/›› Change/g) || []).length, 4, 'four instruction cards offer a change control');
  a.equal((html.match(/class="fm-row"/g) || []).length, 11, 'eleven starting rows');
  a.ok((html.match(/class="fm-row fm-sub"/g) || []).length >= 1, 'bench rows are listed');
  a.ok(!/undefined|NaN|\[object Object\]/.test(html), 'no template garbage');
});

test('the swap panel offers replacements and clearing a slot empties it', () => {
  const s = career();
  let { slots, bench } = TLMatchBoard.sheet(s.tactic, TLMatchBoard.active(s), pool);
  const out = slots[10].player.id, inn = bench.find(p => p.pos !== 'GK').id;
  TLMatchBoard.update(s, `pick|10|${inn}`, pool); // swap the bench striker in for the starting striker
  let next = TLMatchBoard.sheet(s.tactic, TLMatchBoard.active(s), pool);
  a.equal(next.slots[10].player.id, inn);
  a.ok(next.bench.some(p => p.id === out), 'outgoing player drops to the bench');
  TLMatchBoard.update(s, 'clear|10', pool); // remove from position
  next = TLMatchBoard.sheet(s.tactic, TLMatchBoard.active(s), pool);
  a.equal(next.slots[10].player, undefined);
  a.throws(() => TLMatchBoard.update(s, 'pick|10|', pool), /goalkeeper/i, 'a bare pick cannot empty a slot');
});
