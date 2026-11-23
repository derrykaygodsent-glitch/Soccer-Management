const test = require('node:test'), a = require('node:assert/strict'), path = require('node:path'), fs = require('node:fs');
// The tactics board renders the FM-inspired split selection layout and its swap/remove commands work.
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

test('tactics workspace gives shape, squad and instructions dedicated space', () => {
  const s = career(), html = TLBoardRoom.render(s, pool);
  for (const needle of ['fm-workspace-header', 'fm-workspace-nav', 'Team Shape', 'Team Instructions', 'Player Instructions', 'fm-shape-workspace', 'fm-primary-pitch', 'fm-squad-panel', 'Out of Possession', 'In Possession', 'Combined', 'Both', 'Save tactic', 'Familiarity', 'Intensity', 'data-slot="0"', 'data-board="bestXI"'])
    a.ok(html.includes(needle), 'missing ' + needle);
  a.equal((html.match(/class="fm-planner-row/g) || []).length, 11 + TLMatchBoard.sheet(s.tactic, TLMatchBoard.active(s), pool).bench.length, 'complete starting XI and substitute table');
  a.ok((html.match(/data-phase-job="attack\|\d+"/g) || []).length === 11, 'each starter has an in-possession role selector');
  a.ok((html.match(/data-job="\d+"/g) || []).length === 11, 'each starter has an out-of-possession role selector');
  a.ok(html.includes('fm-bench-card') && html.includes('fm-planner-group'), 'substitutes are visible under the pitch and in the squad table');
  a.ok(html.includes('fm-shape-toolbar') && html.includes('fm-planner-table-scroll'), 'Team Shape uses the full-width header and a scrollable player sheet');
  a.ok(!html.includes('fm-tactical-nav'), 'the long legacy navigation rail is gone');
  a.ok(!/undefined|NaN|\[object Object\]/.test(html), 'no template garbage');

  s.boardPhase = 'both';
  const both = TLBoardRoom.render(s, pool);
  a.equal((both.match(/class="shape-field field-wide"/g) || []).length, 2, 'Both shows two side-by-side landscape pitches');
  a.match(both, /data-phase-view="defense"/);
  a.match(both, /data-phase-view="attack"/);
  s.boardPhase = 'combined';
  a.match(TLBoardRoom.render(s, pool), /Combined average positions/);

  const handlers = {}, root = { addEventListener: (kind, fn) => { handlers[kind] = fn; }, querySelector: () => null };
  let draws = 0;
  TLBoardRoom.bind(root, (action, value) => { if (action === 'matchBoard') TLMatchBoard.update(s, value, pool); }, () => draws++);
  const navButton = { dataset: { workspaceTab: 'instructions' }, hasAttribute: () => false };
  handlers.click({ target: { closest: selector => selector === 'button' ? navButton : null } });
  a.equal(draws, 1);
  a.match(TLBoardRoom.render(s, pool), /data-workspace="instructions"/);
  a.match(TLBoardRoom.render(s, pool), /fm-instruction-workspace/);
  const overlayScreen = TLBoardRoom.render(s, pool);
  a.equal((overlayScreen.match(/data-board="zone\|0\|/g) || []).length, 9, 'pitch has nine zone hit areas');
  const zoneRule = fs.readFileSync(path.join(__dirname, '../src/reading.css'), 'utf8').match(/\.fm-zone-overlay button\{([^}]*)\}/)?.[1] || '';
  a.match(zoneRule, /position:relative/);
  a.match(zoneRule, /transform:none/);
  const instructionScreen = overlayScreen;
  a.match(instructionScreen, /fm-tactical-overview/);
  a.match(instructionScreen, /Match plan/);
  a.match(instructionScreen, /Central area/);
  a.match(instructionScreen, /Tactical risks/);
  a.ok(!instructionScreen.includes('Active team orders'), 'overview prioritizes concise, actionable data');

  const zoneButton = { dataset: { board: 'zone|0|attack-left' }, hasAttribute: name => name === 'data-board' };
  handlers.click({ target: { closest: selector => selector === 'button' ? zoneButton : null } });
  a.equal(s.tacticZone, 'attack-left', 'zone selection persists through the board action');
  const plan = TLMatchBoard.active(s), axis = { value: '2', dataset: { axis: 'tempo' }, hasAttribute: name => name === 'data-axis' };
  handlers.change({ target: axis });
  a.equal(plan.instructions.tempo, 2, 'tempo control updates the existing tactical plan');
  const orderValue = TLZones.choicesTeam.trigger[0], order = { value: orderValue, dataset: { order: 'trigger' }, hasAttribute: name => name === 'data-order' };
  handlers.change({ target: order });
  a.equal(plan.orders.trigger, orderValue, 'contextual team order updates the existing tactical plan');
  a.match(TLBoardRoom.render(s, pool), /data-customized="true"/);
  a.match(TLBoardRoom.render(s, pool), /<i>EDITED<\/i>/, 'custom team instructions receive visible state feedback');

  const selectButton = { dataset: { slot: '3' }, hasAttribute: name => name === 'data-slot' };
  handlers.click({ target: { closest: selector => selector === 'button' ? selectButton : null } });
  const selected = TLBoardRoom.render(s, pool);
  a.equal(draws, 2);
  a.match(selected, /fm-player-editor/);
  a.match(selected, /data-phase-job="attack\|3"/);
  a.match(selected, /data-player-instruction="defense\|p/);
  const playerId = TLMatchBoard.sheet(s.tactic, plan, pool).slots[3].player.id;
  const instruction = { value: TLZones.individualInstructions.pressing[0], dataset: { playerInstruction: `defense|${playerId}|pressing` }, hasAttribute: name => name === 'data-player-instruction' };
  handlers.change({ target: instruction });
  a.equal(plan.playerInstructions[playerId].defense.pressing, instruction.value, 'phase-specific instruction updates the engine plan');
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

test('saved and imported tactic presets survive career JSON reload with validated dual-phase instructions',()=>{
  const s=career(),slots=TLMatchBoard.sheet(s.tactic,TLMatchBoard.active(s),pool).slots,id=slots[6].player.id;
  TLMatchBoard.update(s,'attackFormation|0|3-2-5',pool);
  TLMatchBoard.update(s,`individual|attack|${id}|position|Get further forward`,pool);
  TLMatchBoard.update(s,'savePreset|0|Home press',pool);
  const savedId=s.activeTacticPreset,restored=JSON.parse(JSON.stringify(s));
  restored.boards[0]={};restored.tactic='4-4-2';
  TLMatchBoard.update(restored,`loadPreset|0|${savedId}`,pool);
  a.equal(restored.tactic,'4-2-3-1');
  a.equal(TLMatchBoard.active(restored).attackFormation,'3-2-5');
  a.equal(TLMatchBoard.active(restored).playerInstructions[id].attack.position,'Get further forward');
  TLMatchBoard.update(restored,`duplicatePreset|0|${savedId}|Away variation`,pool);
  const duplicate=restored.tacticLibrary.at(-1);
  a.notEqual(duplicate.id,savedId);
  TLMatchBoard.update(restored,`renamePreset|0|${duplicate.id}|Away press`,pool);
  a.equal(duplicate.name,'Away press');
  const exported={version:1,name:'Imported shape',formation:restored.tactic,plan:TLMatchBoard.copyPlan(TLMatchBoard.active(restored))};
  exported.plan.untrusted='<script>';
  TLMatchBoard.update(restored,`importPreset|0|${encodeURIComponent(JSON.stringify(exported))}`,pool);
  a.equal(restored.tacticLibrary.at(-1).name,'Imported shape');
  a.equal(TLMatchBoard.active(restored).untrusted,undefined);
  a.throws(()=>TLMatchBoard.update(restored,'importPreset|0|bad',pool),/valid tactic JSON/i);
});
