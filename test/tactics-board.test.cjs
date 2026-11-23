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
  a.equal((html.match(/class="fm-row(?: on)?"/g) || []).length, 11, 'eleven starters share selection rows');
  a.ok((html.match(/class="fm-row fm-sub"/g) || []).length >= 1, 'actual substitutes are listed');
  a.ok(!html.includes('fm-tactical-nav'), 'the long legacy navigation rail is gone');
  a.ok(!/undefined|NaN|\[object Object\]/.test(html), 'no template garbage');

  s.boardPhase = 'both';
  const both = TLBoardRoom.render(s, pool);
  a.equal((both.match(/class="shape-field field-wide"/g) || []).length, 2, 'Both shows two side-by-side landscape pitches');
  a.match(both, /data-phase-view="defense"/);
  a.match(both, /data-phase-view="attack"/);
  s.boardPhase = 'combined';
  a.match(TLBoardRoom.render(s, pool), /Combined · average player positions/);

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

test('clicking a selected position or empty pitch space never moves a player; dragging is required', () => {
  const s = career(); s.id = 'drag-only-movement';
  TLBoardRoom.render(s, pool);
  const handlers = {}, actions = [], root = { addEventListener: (kind, fn) => { handlers[kind] = fn; }, querySelector: () => null };
  TLBoardRoom.bind(root, (action, value) => { actions.push(value); if (action === 'matchBoard') TLMatchBoard.update(s, value, pool); }, () => {});
  const field = { closest: selector => selector === '.shape-field' ? field : null };
  const marker = slot => { const el = { dataset: { slot: String(slot) }, hasAttribute: name => name === 'data-slot', closest: selector => selector === 'button' ? el : selector === '.shape-field' ? field : null }; return el; };
  const click = target => handlers.click({ target, clientX: 60, clientY: 60 });
  click(marker(5));
  click(marker(10));
  click(field);
  a.deepEqual(actions, [], 'selection and pitch clicks do not swap or reposition players');
});

test('Both view supports an ordinary click to select either phase without capturing a tap as a drag', () => {
  const s = career(); s.id = 'both-click-select'; s.boardPhase = 'both';
  TLBoardRoom.render(s, pool);
  const handlers = {}, captures = [], root = { addEventListener: (kind, fn) => { handlers[kind] = fn; }, setPointerCapture: id => captures.push(id), querySelector: () => null };
  TLBoardRoom.bind(root, () => {}, () => {});
  const field = { closest: selector => selector === '.shape-field' ? field : null };
  const marker = { dataset: { slot: '5', playerId: 'p6' }, hasAttribute: name => name === 'data-slot', closest: selector => ['button','.shape-field [data-slot]'].includes(selector) ? marker : selector === '.shape-field' ? field : null };
  const ev = { target: marker, isPrimary: true, button: 0, pointerId: 9, clientX: 20, clientY: 20 };
  handlers.pointerdown(ev); handlers.pointerup(ev);
  handlers.click({ target: marker, clientX: 20, clientY: 20 });
  a.deepEqual(captures, [], 'pointer capture starts only after movement crosses the drag threshold');
  a.equal((TLBoardRoom.render(s, pool).match(/class="shirt-marker[^\"]* selected"/g)||[]).length, 2, 'the same player is selected on both phase pitches');
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

test('substitutes stay actionable and support either select-then-replace order', () => {
  const s = career(); s.id = 'bench-interactions';
  const handlers = {}, root = { addEventListener: (kind, fn) => { handlers[kind] = fn; }, querySelector: () => null };
  let draws = 0;
  TLBoardRoom.bind(root, (action, value) => { if (action === 'matchBoard') TLMatchBoard.update(s, value, pool); }, () => draws++);
  const html = TLBoardRoom.render(s, pool), subId = TLMatchBoard.sheet(s.tactic, TLMatchBoard.active(s), pool).bench[0].id;
  a.match(html, new RegExp(`data-board="bench\\|${subId}"`));
  a.doesNotMatch(html, /class="fm-row fm-sub[^\"]*"[^>]*disabled/);
  const target = button => ({ closest: selector => selector === 'button' ? button : null });
  handlers.click({ target: target({ dataset: { board: `bench|${subId}` }, hasAttribute: name => name === 'data-board' }), clientX: 0, clientY: 0 });
  a.match(TLBoardRoom.render(s, pool), new RegExp(`data-player-id="${subId}"[^>]*aria-pressed="true"`));
  handlers.click({ target: target({ dataset: { slot: '10' }, hasAttribute: name => name === 'data-slot' }), clientX: 0, clientY: 0 });
  a.equal(TLMatchBoard.sheet(s.tactic, TLMatchBoard.active(s), pool).slots[10].player.id, subId);
  a.equal(draws, 1, 'choosing a substitute first immediately asks the view to show the pending selection');

  const second = career(); second.id = 'bench-direct-replace';
  const handlers2 = {}, root2 = { addEventListener: (kind, fn) => { handlers2[kind] = fn; }, querySelector: () => null };
  TLBoardRoom.bind(root2, (action, value) => { if (action === 'matchBoard') TLMatchBoard.update(second, value, pool); }, () => {});
  TLBoardRoom.render(second, pool);
  const replacement = TLMatchBoard.sheet(second.tactic, TLMatchBoard.active(second), pool).bench[0].id;
  handlers2.click({ target: target({ dataset: { slot: '10' }, hasAttribute: name => name === 'data-slot' }), clientX: 0, clientY: 0 });
  handlers2.click({ target: target({ dataset: { board: `pick|10|${replacement}` }, hasAttribute: name => name === 'data-board' }), clientX: 0, clientY: 0 });
  a.equal(TLMatchBoard.sheet(second.tactic, TLMatchBoard.active(second), pool).slots[10].player.id, replacement);
});

test('dragging a squad player to the pitch previews its destination and assigns it', () => {
  const s = career(); s.id = 'drag-player';
  const sub = TLMatchBoard.sheet(s.tactic, TLMatchBoard.active(s), pool).bench.find(p => p.pos !== 'GK');
  let handlers = {}, root = { addEventListener: (kind, fn) => { handlers[kind] = fn; }, querySelector: () => null };
  TLBoardRoom.bind(root, (action, value) => { if (action === 'matchBoard') TLMatchBoard.update(s, value, pool); }, () => {});
  TLBoardRoom.render(s, pool);
  const classes = () => { const set = new Set(); return { add: (...v) => v.forEach(x => set.add(x)), remove: (...v) => v.forEach(x => set.delete(x)), toggle: (v, on) => on ? set.add(v) : set.delete(v), contains: v => set.has(v) }; };
  const field = { dataset: { orientation: 'portrait', phaseView: 'defense' }, getBoundingClientRect: () => ({ left: 0, top: 0, right: 100, bottom: 140, width: 100, height: 140 }) };
  const marker = { dataset: { slot: '10' }, classList: classes(), closest: selector => selector === '.shape-field' ? field : selector === '.shape-field [data-slot]' ? marker : null };
  const parent = { insertBefore(node) { node.parentNode = parent; }, removeChild(node) { node.parentNode = null; } };
  const row = { dataset: { playerId: sub.id, playerPos: sub.pos }, classList: classes(), style: {}, parentNode: parent, getBoundingClientRect: () => ({ left: 5, top: 5, width: 80, height: 35 }), querySelector: () => ({ textContent: sub.name }), closest: selector => selector === '.fm-squad-panel .fm-row[data-player-id]' ? row : null };
  const oldDocument = global.document;
  global.document = { body: { appendChild(node) { node.parentNode = this; } }, createElement: () => ({ classList: classes(), style: {}, setAttribute() {}, remove() { this.parentNode = null; }, append() {} }), elementFromPoint: () => marker };
  try {
    const ev = (target, x, y) => ({ target, isPrimary: true, button: 0, pointerId: 1, clientX: x, clientY: y });
    handlers.pointerdown(ev(row, 5, 5));
    handlers.pointermove(ev(row, 20, 20));
    a.ok(marker.classList.contains('fm-drop-target'), 'valid replacement slot is visibly highlighted');
    a.equal(row.style.translate, '15px 15px', 'the actual squad row tracks the pointer; no lifted clone is used');
    handlers.pointerup(ev(row, 20, 20));
    a.equal(TLMatchBoard.sheet(s.tactic, TLMatchBoard.active(s), pool).slots[10].player.id, sub.id);
  } finally { global.document = oldDocument; }
});

test('explicit pitch phase edits stay in that phase, including from Both and Combined views', () => {
  const s = career(), plan = TLMatchBoard.active(s);
  s.boardPhase = 'both';
  TLMatchBoard.update(s, 'move|5|0.7|0.4|defense', pool);
  a.ok(plan.moves?.[5], 'a defensive pitch edit stores an out-of-possession coordinate');
  a.equal(plan.attackByPlayer, undefined, 'the defensive pitch does not accidentally edit in-possession positions');
  const slot = TLMatchBoard.sheet(s.tactic, plan, pool).slots[5], baseBefore = { x: slot.x, y: slot.y }, attackBefore = slot.attack || baseBefore;
  const target = { x: .9, y: .5 };
  TLMatchBoard.update(s, `move|5|${target.x}|${target.y}|combined`, pool);
  const moved = TLMatchBoard.sheet(s.tactic, plan, pool).slots[5], movedAttack = moved.attack || moved, avg = { x: (moved.x + movedAttack.x) / 2, y: (moved.y + movedAttack.y) / 2 };
  a.ok(Math.abs(avg.x - target.x) < .04 && Math.abs(avg.y - target.y) < .04, 'combined movement translates both phase positions together');
  a.ok(Math.abs((moved.x - baseBefore.x) - (movedAttack.x - attackBefore.x)) < .01, 'both phase positions move by the same amount');
});

test('starter rows allow real player selection without invalid nested buttons around the player picker', () => {
  const s = career(); s.id = 'starter-row-selection';
  const html = TLBoardRoom.render(s, pool);
  a.match(html, /<div class="fm-row[^\"]*" role="button" tabindex="0" data-slot="0"/);
  a.doesNotMatch(html, /<button[^>]*class="fm-row[^>]*>[\s\S]*?<select class="fm-player-picker/);
  const handlers = {}, root = { addEventListener: (kind, fn) => { handlers[kind] = fn; }, querySelector: () => null };
  let draws = 0;
  TLBoardRoom.bind(root, () => {}, () => draws++);
  const row = { dataset: { slot: '0' }, hasAttribute: name => name === 'data-slot', closest: selector => ['.fm-row[data-slot]', '.fm-row[data-slot][role="button"]'].includes(selector) ? row : null };
  handlers.click({ target: { closest: selector => selector === '[data-player-pick]' ? null : selector === '.fm-row[data-slot]' ? row : null } });
  a.equal(draws, 1, 'clicking the starter row selects it and opens its player detail editor');
  a.match(TLBoardRoom.render(s, pool), /class="fm-row on" role="button"[^>]*aria-pressed="true"/);
  handlers.keydown({ target: row, key: 'Enter', preventDefault() {} });
  a.equal(draws, 2, 'keyboard activation can deselect the focused player row');
});

test('player names and phase-specific role-fit warnings remain available in the Team Shape table', () => {
  src('tactical-analysis.js');
  const s = career(); s.id = 'fit-warning-tooltip';
  const plan = TLMatchBoard.active(s); plan.ids = TLMatchBoard.sheet(s.tactic, plan, pool).slots.map(slot => slot.player?.id || null);
  const weakPool = pool.map(p => p.id === 'p7' ? { ...p, name: 'Luca Marin', attrs: Object.fromEntries(Object.keys(attrs).map(k => [k, 1])) } : p);
  const html = TLBoardRoom.render(s, weakPool);
  a.match(html, /class="fm-player-name" title="Luca Marin">Luca Marin<\/span>/, 'the table prints the player name rather than relying on the picker text');
  a.match(html, /Luca Marin has a \d+% fit for Centre-Back out of possession; the role demands attributes or positional experience they currently lack\./, 'the Needs review text exposes the complete fit explanation on hover');
  a.match(html, /Luca Marin: Out of possession Centre-Back fit \d+%; In possession Centre-Back fit \d+%\./, 'the fit cell tooltip explains both phases');
  const css = fs.readFileSync(path.join(__dirname, '../src/reading.css'), 'utf8');
  a.match(css, /fm-squad-panel \.fm-person \.fm-player-name\{[^}]*font-size:12px/);
  a.match(css, /fm-shape-intel>div:last-child span\{display:block;[^}]*overflow:visible/);
});

test('tactics sidebar can collapse on desktop and returns to a real dismissible drawer on mobile', () => {
  const css = fs.readFileSync(path.join(__dirname, '../src/reading.css'), 'utf8'), homeCss = fs.readFileSync(path.join(__dirname, '../src/home.css'), 'utf8'), home = fs.readFileSync(path.join(__dirname, '../src/home.js'), 'utf8'), desk = fs.readFileSync(path.join(__dirname, '../src/manager-desk.js'), 'utf8');
  a.match(css, /hc-rail-collapsed:has\(\.fm-tactics-workspace\)\{grid-template-columns:0 minmax\(0,1fr\)!important\}/);
  a.match(css, /@media\(max-width:980px\)\{[\s\S]*?\.hc-sidebar\.hc-open\{visibility:visible!important;transform:translateX\(0\)!important\}/);
  a.doesNotMatch(css, /\.hc-sidebar\{display:flex!important;position:relative!important/);
  a.match(homeCss, /\.hc-shell\.hc-rail-collapsed\{grid-template-columns:0 minmax\(0,1fr\)\}/);
  a.match(home, /if\(open===null\)[\s\S]*?root\.classList\.toggle\('hc-rail-collapsed'\)/);
  a.match(desk, /if\(b\.id==='homeMenu'\)\{toggleDrawer\(null,true\);return;\}if\(b\.id==='homeScrim'\)/);
});

test('status and squad metrics are legible text, with team-instruction responsibilities wrapping cleanly', () => {
  const s = career(); s.id = 'tactics-status-layout';
  const html = TLBoardRoom.render(s, pool);
  a.match(html, /<span class="fm-status-chip (?:has-risks|is-clear)" role="status"/);
  a.ok(!/<button[^>]*class="fm-status-chip/.test(html), 'review state is informational, not an inert button');
  a.match(html, /data-board="bench\|[^\"]+"/);
  const css = fs.readFileSync(path.join(__dirname, '../src/reading.css'), 'utf8');
  a.match(css, /fm-zone-analysis>div\{display:grid;grid-template-columns:repeat\(auto-fit/);
  a.match(css, /fm-squad-panel \.fm-row\.on \.fm-suitability[^}]*color:#bce5e0!important/);
  a.match(css, /fm-status-chip\.has-risks[^}]*#f2cd8e!important/);
  a.doesNotMatch(css, /fm-drag-ghost/, 'dragging uses the source item, not a cloned lifted ghost');
});

test('opening a player picker does not accidentally press its containing squad row', () => {
  const s = career(); s.id = 'player-picker-click';
  const handlers = {}, root = { addEventListener: (kind, fn) => { handlers[kind] = fn; }, querySelector: () => null };
  TLBoardRoom.bind(root, () => {}, () => {});
  const html = TLBoardRoom.render(s, pool);
  a.doesNotMatch(html, /class="fm-row on"/);
  const picker = { dataset: { playerPick: '5' } };
  handlers.click({ target: { closest: selector => selector === '[data-player-pick]' ? picker : null }, clientX: 0, clientY: 0 });
  a.doesNotMatch(TLBoardRoom.render(s, pool), /class="fm-row on"/);
});

test('shirt drag on the defensive pitch moves that phase even while Both is selected', () => {
  const s = career(); s.id = 'defensive-drag-from-both'; s.boardPhase = 'both';
  const handlers = {}, root = { addEventListener: (kind, fn) => { handlers[kind] = fn; }, querySelector: () => null };
  TLBoardRoom.bind(root, (action, value) => { if (action === 'matchBoard') TLMatchBoard.update(s, value, pool); }, () => {});
  TLBoardRoom.render(s, pool);
  const classes = () => ({ add() {}, remove() {}, toggle() {} });
  const field = { dataset: { orientation: 'portrait', phaseView: 'defense' }, getBoundingClientRect: () => ({ left: 0, top: 0, right: 100, bottom: 140, width: 100, height: 140 }), closest: selector => selector === '.shape-field' ? field : null };
  const shirt = { dataset: { slot: '5', playerId: 'p6' }, parentElement: field, classList: classes(), style: {}, setPointerCapture() {}, cloneNode: () => ({}), closest: selector => selector === '.shape-field [data-slot]' ? shirt : null };
  const oldDocument = global.document;
  global.document = { body: { appendChild() {} }, createElement: () => ({ classList: classes(), style: {}, setAttribute() {}, remove() {}, append() {} }), elementFromPoint: () => field };
  try {
    const ev = (x, y) => ({ target: shirt, isPrimary: true, button: 0, pointerId: 2, clientX: x, clientY: y });
    handlers.pointerdown(ev(5, 5)); handlers.pointermove(ev(45, 80));
    a.equal(shirt.style.translate, '40px 75px', 'the dragged jersey itself follows the pointer');
    handlers.pointerup(ev(45, 80));
    a.ok(TLMatchBoard.active(s).moves?.[5], 'the drop commits a defensive position');
    a.equal(TLMatchBoard.active(s).attackByPlayer, undefined, 'it does not move the attacking position');
  } finally { global.document = oldDocument; }
});

test('dragging the In Possession jersey in Both edits only that phase and maps open pitch space correctly', () => {
  const s = career(); s.id = 'both-attack-drag'; s.boardPhase = 'both';
  const plan = TLMatchBoard.active(s), initial = TLMatchBoard.sheet(s.tactic, plan, pool).slots[5], base = { x: initial.x, y: initial.y }, playerId = initial.player.id;
  const handlers = {}, root = { addEventListener: (kind, fn) => { handlers[kind] = fn; }, setPointerCapture() {}, querySelector: () => null };
  TLBoardRoom.bind(root, (action, value) => { if (action === 'matchBoard') TLMatchBoard.update(s, value, pool); }, () => {});
  TLBoardRoom.render(s, pool);
  const classes = () => { const set = new Set(); return { add: (...v) => v.forEach(x => set.add(x)), remove: (...v) => v.forEach(x => set.delete(x)), toggle: (v, on) => on ? set.add(v) : set.delete(v), contains: v => set.has(v) }; };
  const rect = { left: 0, top: 0, right: 140, bottom: 100, width: 140, height: 100 };
  const field = { dataset: { orientation: 'wide', phaseView: 'attack' }, getBoundingClientRect: () => rect, querySelectorAll: () => [nearest], closest: selector => selector === '.shape-field' ? field : null };
  const nearest = { dataset: { slot: '5' }, classList: classes(), getBoundingClientRect: () => ({ left: 68, top: 22, width: 4, height: 4 }) };
  const shirt = { dataset: { slot: '5', playerId }, classList: classes(), style: {}, closest: selector => selector === '.shape-field [data-slot]' ? shirt : selector === '.shape-field' ? field : null };
  const oldDocument = global.document; global.document = { elementFromPoint: () => field };
  try {
    const ev = (target, x, y) => ({ target, isPrimary: true, button: 0, pointerId: 10, clientX: x, clientY: y });
    handlers.pointerdown(ev(shirt, 10, 10)); handlers.pointermove(ev(shirt, 70, 25));
    a.ok(nearest.classList.contains('fm-drop-target'), 'the in-possession mapped marker is highlighted in Both');
    a.equal(shirt.style.translate, '60px 15px', 'the actual jersey follows the pointer');
    handlers.pointerup(ev(shirt, 70, 25));
    const after = TLMatchBoard.sheet(s.tactic, plan, pool).slots[5];
    a.deepEqual({ x: after.x, y: after.y }, base, 'the out-of-possession position remains unchanged');
    a.ok(plan.attackByPlayer?.[playerId], 'the in-possession position is stored for this player');
    a.equal(plan.attackByPlayer[playerId].y, .88, 'wide-pitch drag accounts for its inset playing area before snapping');
  } finally { global.document = oldDocument; }
});

test('dragging an actual shirt onto another mapped shirt swaps those exact players in Both', () => {
  const s = career(); s.id = 'both-shirt-swap'; s.boardPhase = 'both';
  const plan = TLMatchBoard.active(s), before = TLMatchBoard.sheet(s.tactic, plan, pool).slots;
  const moving = before[5].player.id, displaced = before[10].player.id;
  const handlers = {}, root = { addEventListener: (kind, fn) => { handlers[kind] = fn; }, querySelector: () => null };
  TLBoardRoom.bind(root, (action, value) => { if (action === 'matchBoard') TLMatchBoard.update(s, value, pool); }, () => {});
  TLBoardRoom.render(s, pool);
  const classes = () => { const set = new Set(); return { add: (...v) => v.forEach(x => set.add(x)), remove: (...v) => v.forEach(x => set.delete(x)), toggle: (v, on) => on ? set.add(v) : set.delete(v), contains: v => set.has(v) }; };
  const field = { dataset: { orientation: 'wide', phaseView: 'defense' }, getBoundingClientRect: () => ({ left: 0, top: 0, right: 140, bottom: 100, width: 140, height: 100 }) };
  const shirt = (slot, id) => { const el = { dataset: { slot: String(slot), playerId: id }, parentElement: field, classList: classes(), style: {}, setPointerCapture() {}, closest: selector => selector === '.shape-field [data-slot]' ? el : selector === '.shape-field' ? field : null }; return el; };
  const from = shirt(5, moving), to = shirt(10, displaced), oldDocument = global.document;
  global.document = { elementFromPoint: () => to };
  try {
    const ev = (target, x, y) => ({ target, isPrimary: true, button: 0, pointerId: 3, clientX: x, clientY: y });
    handlers.pointerdown(ev(from, 10, 10)); handlers.pointermove(ev(from, 80, 75)); handlers.pointerup(ev(from, 80, 75));
    const after = TLMatchBoard.sheet(s.tactic, plan, pool).slots;
    a.equal(after[5].player.id, displaced);
    a.equal(after[10].player.id, moving);
    a.equal(s.boardPhase, 'both', 'the swap applies to the shared XI while Both remains selected');
  } finally { global.document = oldDocument; }
});
