const test = require('node:test'), a = require('node:assert/strict'), path = require('node:path'), fs = require('node:fs'), vm = require('node:vm');
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

test('role guide provides role-specific behaviour, key attributes and a five-point suitability scale',()=>{
  const info=TLZones.roleInfo('Advanced Forward');a.match(info.description,/attacks space/i);a.ok(info.attributes.includes('Acceleration'));a.ok(info.behaviour.length>25);a.equal(TLZones.fitRating(90),'4.5');a.equal(TLZones.fitBand(90),'Good fit');
});

test('tactics workspace gives shape, squad and instructions dedicated space', () => {
  const s = career(), html = TLBoardRoom.render(s, pool);
  for (const needle of ['fm-workspace-header', 'fm-workspace-nav', 'Team Shape', 'Team Instructions', 'Player Instructions', 'fm-shape-workspace', 'fm-primary-pitch', 'fm-squad-panel', 'Out of Possession', 'In Possession', 'Combined', 'Both', 'Save tactic', 'Familiarity', 'Intensity', 'data-slot="0"', 'data-board="bestXI"'])
    a.ok(html.includes(needle), 'missing ' + needle);
  a.equal((html.match(/class="fm-row(?: on)?"/g) || []).length, 11, 'eleven starters share selection rows');
  a.ok((html.match(/class="fm-row fm-sub"/g) || []).length >= 1, 'actual substitutes are listed');
  a.match(html, /<table class="fm-sheet-table" data-sort-table="teamsheet" data-sort-default="off"/, 'the team sheet is a sortable data table');
  a.match(html, /<div class="fm-squad-table" data-tl-bar>/, 'the sheet hosts the column view bar');
  a.equal((html.match(/<th scope="col">/g) || []).length, 8, 'eight team-sheet headings');
  for (const heading of ['POS', 'In possession role', 'Out of possession role', 'Ability', 'Player', 'Fit · IP / OOP', 'Status', 'Cond.'])
    a.ok(html.includes('>' + heading + '<') || html.includes(heading), 'missing heading ' + heading);
  a.ok(!html.includes('fm-squad-group'), 'no position-group bands inside the sheet');
  a.ok(!html.includes('fm-squad-columns'), 'no static heading strip above the sheet');
  a.match(html, /<tr class="fm-row fm-sub[^"]*" role="button" tabindex="0" data-bench="[^"]+" data-board="bench\|[^"]+"/, 'substitutes are table rows that carry their own command');
  const sheetRows = (html.match(/<tr class="fm-row[^"]*" role="button" tabindex="0"/g) || []).length;
  a.ok(sheetRows >= 11, 'the sheet lists every starter as a focusable row');
  a.equal((html.match(/<td class="fm-sheet-pos"/g) || []).length, sheetRows, 'every sheet row starts with a position cell');
  a.equal((html.match(/<td class="fm-sheet-player fm-person"/g) || []).length, sheetRows, 'every sheet row carries the player column');
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
  a.match(instructionScreen, /Central area/);
  a.match(instructionScreen, /fm-overview-risks/, 'the overview keeps only flagged risks');
  a.doesNotMatch(instructionScreen, /TACTICAL VISUALISER|CONTEXTUAL TEAM INSTRUCTIONS|Nine-zone responsibilities/,
    'the instruction desk carries no restated chrome');
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
  a.equal((selected.match(/class="shirt-marker[^\"]* selected"/g)||[]).length, 1, 'clicking one player selects only that marker');
  a.equal((html.match(/data-role-target="\d+"/g)||[]).length, 31, 'all thirty pitch grid markers plus the goalkeeper target are available');
  a.equal((html.match(/data-role-code="[A-Z]+"/g)||[]).length, 21, 'only main and expandable line positions receive visible role letters');
  for (const [code,count] of Object.entries({CB:3,DM:3,CM:3,AM:2,ST:3})) a.equal((html.match(new RegExp(`data-role-code="${code}"`,'g'))||[]).length,count,`${code} line exposes the requested capacity`);
  for (const code of ['GK','RB','LB','CB','DM','CM','RM','LM','AM','RW','LW','ST']) a.match(html,new RegExp(`<span>${code}<\\/span>`),`missing ${code} destination`);
  const roleCss=fs.readFileSync(path.join(__dirname,'../src/reading.css'),'utf8');
  a.match(roleCss,/\.fm-primary-pitch \.shape-field \.fm-role-target[\s\S]*?border:0!important/,'destination markers are plain letters without a border');
  a.match(roleCss,/color:#cbd0d4[^}]*opacity:\.48/,'the always-visible role letters use subdued light grey');
  a.match(selected, /fm-player-editor/);
  a.match(selected,/data-role-picker-open="3" data-role-picker-phase="attack"/);
  a.match(selected, /data-player-instruction="defense\|p/);
  a.match(selected,/class="fm-pitch-marker[^\"]*is-selected/,'the selected jersey is flagged on the pitch');
  a.match(selected,/data-marker-substitute="3"/);
  a.match(selected,/class="fm-marker-card" data-group="def"/,'the plate is tinted for the line the player holds');
  a.equal((selected.match(/class="fm-marker-card"/g)||[]).length,(selected.match(/class="shirt-marker/g)||[]).length,'every jersey carries its own plate');
  a.match(selected,/data-role-picker-open="3" data-role-picker-phase="attack"/,'the plate opens the role picker for the shown phase');
  a.ok(!/Substitution<|Player role · /.test(selected),'the plate carries no labelled rows');
  a.ok(!/ROLE \/ DUTY|Defensive duty|data-phase-duty|Role duty/.test(selected),'player tactics no longer presents legacy role duties');
  const starterSheet=TLMatchBoard.sheet(s.tactic,plan,pool),starter=starterSheet.slots[3],subSelect=selected.match(/<select data-marker-substitute="3"[^>]*>([\s\S]*?)<\/select>/)?.[1]||'',listed=[...subSelect.matchAll(/<option value="([^"]+)"/g)].map(m=>m[1]).filter(Boolean),suitability=p=>TLZones.fit(p,starter.position,starter.job[0],s.boardReps),stars=TLDynamics.squadStars(pool),expectedSubs=starterSheet.bench.filter(p=>(p.pos==='GK')===false&&!p.red&&!TLDynamics.snapshot(s,pool).players[p.id]?.knock).sort((x,y)=>suitability(y)-suitability(x)||(stars[y.id]||0)-(stars[x.id]||0)||x.name.localeCompare(y.name)).map(p=>p.id);
  a.ok(!listed.includes(starter.player.id),'the player being replaced is never offered as their own substitute');
  a.deepEqual(listed,expectedSubs,'available substitutes are ordered by fit for the selected role, then squad ability');
  const playerId = TLMatchBoard.sheet(s.tactic, plan, pool).slots[3].player.id;
  const instruction = { value: TLZones.individualInstructions.pressing[0], dataset: { playerInstruction: `defense|${playerId}|pressing` }, hasAttribute: name => name === 'data-player-instruction' };
  handlers.change({ target: instruction });
  a.equal(plan.playerInstructions[playerId].defense.pressing, instruction.value, 'phase-specific instruction updates the engine plan');
  const starterPosition=TLMatchBoard.sheet(s.tactic,plan,pool).slots[3].position,roleChoice=TLZones.choices(starterPosition).find(name=>name!==TLMatchBoard.sheet(s.tactic,plan,pool).slots[3].job[0]),openRole={dataset:{rolePickerOpen:'3',rolePickerPhase:'defense'},hasAttribute:name=>name==='data-role-picker-open'};
  handlers.click({target:{closest:selector=>selector==='button'?openRole:null}});
  const guide=TLBoardRoom.render(s,pool);a.match(guide,/role="dialog" aria-modal="true"/);a.match(guide,/Key attributes/);a.match(guide,/Tactical behaviour/);a.match(guide,/Good fit|Excellent fit|Useful fit|Limited fit/);
  const roleCard={dataset:{roleChoice:roleChoice,roleChoiceSlot:'3',roleChoicePhase:'defense'},hasAttribute:name=>name==='data-role-choice'};
  handlers.click({target:{closest:selector=>selector==='button'?roleCard:null}});a.equal(plan.phaseRoles[3].defense.job,roleChoice,'the role guide assigns the selected role to the tactical position');
  const replacement=TLMatchBoard.sheet(s.tactic,plan,pool).bench.find(p=>p.pos!=='GK'),subControl={value:replacement.id,dataset:{markerSubstitute:'3'},hasAttribute:name=>name==='data-marker-substitute'};
  handlers.change({target:subControl});const swapped=TLMatchBoard.sheet(s.tactic,plan,pool).slots[3];a.equal(swapped.player.id,replacement.id,'the substitution dropdown replaces the selected player');a.equal(swapped.job[0],roleChoice,'the incoming player inherits the position role');
});

test('clicking a selected position or empty pitch space never moves a player; dragging is required', () => {
  const s = career(); s.id = 'drag-only-movement';
  TLBoardRoom.render(s, pool);
  const handlers = {}, actions = [], root = { addEventListener: (kind, fn) => { handlers[kind] = fn; }, querySelector: () => null };
  TLBoardRoom.bind(root, (action, value) => { actions.push(value); if (action === 'matchBoard') TLMatchBoard.update(s, value, pool); }, () => {});
  const field = { closest: selector => selector === '.shape-field' ? field : null };
  const marker = slot => { const el = { dataset: { slot: String(slot) }, hasAttribute: name => name === 'data-slot', closest: selector => ['button','.shape-field [data-slot],.shape-field [data-role-target],.fm-zone-overlay,.fm-pitch-marker'].includes(selector) ? el : selector === '.shape-field' ? field : null }; return el; };
  const click = target => handlers.click({ target, clientX: 60, clientY: 60 });
  click(marker(5));
  a.equal((TLBoardRoom.render(s, pool).match(/class="shirt-marker[^\"]* selected"/g)||[]).length, 1, 'a player can be selected');
  click(marker(10));
  a.equal((TLBoardRoom.render(s, pool).match(/class="shirt-marker[^\"]* selected"/g)||[]).length, 1, 'selecting another player replaces the selection');
  click(marker(10));
  a.equal((TLBoardRoom.render(s, pool).match(/class="shirt-marker[^\"]* selected"/g)||[]).length, 0, 'clicking the selected player again deselects them');
  click(marker(5));
  click(field);
  a.equal((TLBoardRoom.render(s, pool).match(/class="shirt-marker[^\"]* selected"/g)||[]).length, 0, 'clicking empty pitch space deselects the player');
  a.deepEqual(actions, [], 'selection and pitch clicks do not swap or reposition players');
});

test('a pitch drag outside a role or hidden grid marker is rejected', () => {
  const s=career();s.id='reject-freeform-drag';const actions=[],handlers={},root={addEventListener:(kind,fn)=>{handlers[kind]=fn;},setPointerCapture(){},querySelector:()=>null};
  TLBoardRoom.bind(root,(action,value)=>{actions.push(value);if(action==='matchBoard')TLMatchBoard.update(s,value,pool);},()=>{});TLBoardRoom.render(s,pool);
  const field={closest:selector=>selector==='.shape-field'?field:null},classes=()=>({add(){},remove(){}}),shirt={dataset:{slot:'5',playerId:'p6'},classList:classes(),style:{},closest:selector=>selector==='.shape-field [data-slot]'?shirt:selector==='.shape-field'?field:null};
  const oldDocument=global.document;global.document={elementFromPoint:()=>field};
  try{const ev=(x,y)=>({target:shirt,isPrimary:true,button:0,pointerId:12,clientX:x,clientY:y});handlers.pointerdown(ev(5,5));handlers.pointermove(ev(40,50));handlers.pointerup(ev(40,50));a.deepEqual(actions,[],'a drop outside every destination marker does not move the player');a.equal(TLMatchBoard.active(s).moves,undefined);}finally{global.document=oldDocument;}
});

test('a near miss snaps to the nearest role marker instead of cancelling the drag', () => {
  const s=career();s.id='near-target-snap';const plan=TLMatchBoard.active(s),slot=TLMatchBoard.sheet(s.tactic,plan,pool).slots[5],handlers={},root={addEventListener:(kind,fn)=>{handlers[kind]=fn;},setPointerCapture(){},querySelector:()=>null};
  TLBoardRoom.bind(root,(action,value)=>{if(action==='matchBoard')TLMatchBoard.update(s,value,pool);},()=>{});TLBoardRoom.render(s,pool);
  const classes=()=>{const set=new Set();return{add:(...v)=>v.forEach(x=>set.add(x)),remove:(...v)=>v.forEach(x=>set.delete(x)),contains:v=>set.has(v)};};
  const field={dataset:{orientation:'portrait',phaseView:'defense'},classList:classes(),querySelectorAll:selector=>selector==='[data-role-target]'?[target]:[],closest:selector=>selector==='.shape-field'?field:null};
  const target={dataset:{roleTarget:'8',roleSlot:'5',roleX:'.59',roleY:'.5',roleJob:'Attacking Midfielder',rolePhase:'defense',roleKeeper:'false'},classList:classes(),getBoundingClientRect:()=>({left:50,top:50,right:74,bottom:68,width:24,height:18}),closest:selector=>selector==='.shape-field [data-role-target]'?target:selector==='.shape-field'?field:null};
  const shirt={dataset:{slot:'5',playerId:slot.player.id},classList:classes(),style:{},getBoundingClientRect:()=>({left:0,top:0,width:20,height:20}),closest:selector=>selector==='.shape-field [data-slot]'?shirt:selector==='.shape-field'?field:null};
  const oldDocument=global.document;global.document={elementFromPoint:()=>field};
  try{const ev=(x,y)=>({target:shirt,isPrimary:true,button:0,pointerId:13,clientX:x,clientY:y});handlers.pointerdown(ev(5,5));handlers.pointermove(ev(40,58));handlers.pointerup(ev(40,58));a.equal(plan.moves[5].x,.59,'a release just outside the marker hitbox still snaps in');a.equal(plan.jobs[5],'Attacking Midfielder','the snapped destination records its role');}finally{global.document=oldDocument;}
});

test('Both view supports an ordinary click to select either phase without capturing a tap as a drag', () => {
  const s = career(); s.id = 'both-click-select'; s.boardPhase = 'both';
  TLBoardRoom.render(s, pool);
  const handlers = {}, captures = [], root = { addEventListener: (kind, fn) => { handlers[kind] = fn; }, setPointerCapture: id => captures.push(id), querySelector: () => null };
  TLBoardRoom.bind(root, () => {}, () => {});
  const field = { closest: selector => selector === '.shape-field' ? field : null };
  const marker = { dataset: { slot: '5', playerId: 'p6' }, hasAttribute: name => name === 'data-slot', closest: selector => ['button','.shape-field [data-slot]','.shape-field [data-role-target]','.fm-zone-overlay','.shape-field [data-slot],.shape-field [data-role-target],.fm-zone-overlay,.fm-pitch-marker'].includes(selector) ? marker : selector === '.shape-field' ? field : null };
  const ev = { target: marker, isPrimary: true, button: 0, pointerId: 9, clientX: 20, clientY: 20 };
  handlers.pointerdown(ev); handlers.pointerup(ev);
  handlers.click({ target: marker, clientX: 20, clientY: 20 });
  a.deepEqual(captures, [], 'pointer capture starts only after movement crosses the drag threshold');
  const selectedHtml = TLBoardRoom.render(s, pool);
  a.equal((selectedHtml.match(/class="shirt-marker[^\"]* selected"/g)||[]).length, 2, 'the same player is selected on both phase pitches');
  for (const phase of ['defense','attack']) a.match(selectedHtml, new RegExp(`data-role-picker-phase="${phase}"`), `the Both view exposes the ${phase} role on its own pitch`);
});

test('Combined selects a marker on an intentional click and its plate edits the in-possession role', () => {
  const s = career(); s.id = 'combined-card-click'; s.boardPhase = 'combined';
  const handlers = {}, root = { addEventListener: (kind, fn) => { handlers[kind] = fn; }, querySelector: () => null };
  TLBoardRoom.bind(root, () => {}, () => {}); TLBoardRoom.render(s, pool);
  const marker = { dataset: { slot: '5', playerId: 'p6' }, hasAttribute: name => name === 'data-slot', closest: selector => selector === 'button' || selector === '.shape-field [data-slot]' ? marker : null };
  handlers.click({ target: marker });
  const html = TLBoardRoom.render(s, pool);
  a.match(html, /class="fm-pitch-marker[^\"]*is-selected/,'the click selects the player');
  a.match(html, /data-role-picker-open="5" data-role-picker-phase="attack"/,'the plate edits the in-possession role');
  a.match(html, /data-marker-substitute="5"/);
});

test('dragging in Combined repositions both phases without auto-opening the marker controls', () => {
  const s = career(); s.id = 'combined-drag-no-card'; s.boardPhase = 'combined';
  const plan = TLMatchBoard.active(s), before = TLMatchBoard.sheet(s.tactic, plan, pool).slots[5], handlers = {};
  const root = { addEventListener: (kind, fn) => { handlers[kind] = fn; }, setPointerCapture() {}, querySelector: () => null };
  TLBoardRoom.bind(root, (action, value) => { if (action === 'matchBoard') TLMatchBoard.update(s, value, pool); }, () => {}); TLBoardRoom.render(s, pool);
  const classes = () => { const values = new Set(); return { add: (...items) => items.forEach(x => values.add(x)), remove: (...items) => items.forEach(x => values.delete(x)), toggle: (x,on) => on ? values.add(x) : values.delete(x), contains: x => values.has(x) }; };
  const rect = { left: 0, top: 0, right: 140, bottom: 100, width: 140, height: 100 }, field = { dataset: { orientation: 'wide', phaseView: 'combined' }, classList: classes(), getBoundingClientRect: () => rect, closest: selector => selector === '.shape-field' ? field : null };
  const shirt = { dataset: { slot: '5', playerId: before.player.id }, classList: classes(), style: {}, getBoundingClientRect: () => ({left:30,top:30,width:20,height:20}), closest: selector => selector === '.shape-field [data-slot]' ? shirt : selector === '.shape-field' ? field : null };
  const target = { dataset: { roleTarget: '8', roleSlot: '5', roleX: '.75', roleY: '.88', roleJob: '', rolePhase: 'combined', roleKeeper: 'false' }, classList: classes(), getBoundingClientRect: () => ({left:90,top:10,width:10,height:10}), closest: selector => selector === '.shape-field [data-role-target]' ? target : selector === '.shape-field' ? field : null };
  const oldDocument = global.document; global.document = { elementFromPoint: () => target };
  try {
    const ev = (x,y) => ({ target: shirt, isPrimary: true, button: 0, pointerId: 18, clientX: x, clientY: y });
    handlers.pointerdown(ev(40,40)); handlers.pointermove(ev(90,15)); handlers.pointerup(ev(90,15));
    const after = TLMatchBoard.sheet(s.tactic, plan, pool).slots[5];
    a.notDeepEqual({x:after.x,y:after.y},{x:before.x,y:before.y},'defensive position moved');
    a.notDeepEqual(after.attack,{x:before.x,y:before.y},'attacking position moved with it');
    a.doesNotMatch(TLBoardRoom.render(s,pool),/class="fm-pitch-marker[^\"]*is-selected/,'the drag does not select the marker');
  } finally { global.document = oldDocument; }
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

test('an unfilled tactical position can retain its phase-specific role',()=>{
  const s=career(),plan=TLMatchBoard.active(s);plan.ids=TLMatchBoard.sheet(s.tactic,plan,pool).slots.map(slot=>slot.player?.id||null);plan.ids[3]=null;
  const position=TLMatchBoard.sheet(s.tactic,plan,pool).slots[3].position,job=TLZones.choices(position).at(-1);
  TLMatchBoard.update(s,`phaseJob|defense|3|${job}`,pool);a.equal(TLMatchBoard.sheet(s.tactic,plan,pool).slots[3].job[0],job);
});

test('legacy player-keyed phase roles migrate to the tactical position and survive substitution',()=>{
  const s=career(),plan=TLMatchBoard.active(s),slots=TLMatchBoard.sheet(s.tactic,plan,pool).slots,index=3,starter=slots[index],replacement=TLMatchBoard.sheet(s.tactic,plan,pool).bench.find(p=>p.pos!=='GK'),attackPosition=starter.attackPosition||starter.position,legacyRole=TLZones.choices(attackPosition).find(name=>name!==starter.attackJob[0]);
  plan.phaseJobs={[starter.player.id]:{attack:{job:legacyRole,duty:'Attack'}}};
  a.equal(TLMatchBoard.sheet(s.tactic,plan,pool).slots[index].attackJob[0],legacyRole,'legacy player-keyed role remains visible before migration');
  TLMatchBoard.update(s,`pick|${index}|${replacement.id}`,pool);
  a.equal(plan.phaseRoles[index].attack.job,legacyRole,'legacy role is pinned to the tactical position before the outgoing player is removed');
  a.equal(TLMatchBoard.sheet(s.tactic,plan,pool).slots[index].attackJob[0],legacyRole,'the substitute inherits the tactical position role');
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
  a.equal(plan.defenseFormation, '4-4-2', 'a small adjustment keeps the nearest preset identity instead of hiding it as Custom');
  a.equal(plan.defenseAdjusted, true, 'the named defensive preset remains marked as adjusted');
  a.match(TLBoardRoom.render(s, pool), /4-4-2 OOP/);
  a.doesNotMatch(TLBoardRoom.render(s, pool), /Custom shape · 4-2-3-1 base/);
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
  a.match(html, /<tr class="fm-row[^\"]*" role="button" tabindex="0" data-slot="0"/);
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
  const picker = { closest: selector => selector === 'select,input,textarea,button,[contenteditable="true"]' ? picker : selector === '.fm-row[data-slot][role="button"]' ? row : null };
  handlers.keydown({ target: picker, key: 'Enter', preventDefault() {} });
  a.equal(draws, 2, 'the row keyboard shortcut does not steal keyboard interaction from the nested player picker');
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

test('the sidebar stays a dismissible drawer on Tactics, exactly as on every other screen', () => {
  // Ported from the tactics branch, whose shell pins a 215px rail. This branch's shell has no
  // rail at any width: the drawer IS the navigation, so Tactics must not resurrect a pinned one.
  const css = fs.readFileSync(path.join(__dirname, '../src/reading.css'), 'utf8'), homeCss = fs.readFileSync(path.join(__dirname, '../src/home.css'), 'utf8'), home = fs.readFileSync(path.join(__dirname, '../src/home.js'), 'utf8'), desk = fs.readFileSync(path.join(__dirname, '../src/manager-desk.js'), 'utf8');
  a.doesNotMatch(css, /#homeScreen\.hc-shell:has\(\.fm-tactics-workspace\)\{display:grid!important;grid-template-columns:215px/, 'Tactics does not pin a rail the rest of the app does not have');
  a.doesNotMatch(css, /\.hc-shell\.hc-rail-collapsed\{grid-template-columns:0 minmax\(0,1fr\)\}/, 'no rail means no rail-collapse rule');
  a.match(css, /@media\(max-width:980px\)\{[\s\S]*?\.hc-sidebar\.hc-open\{visibility:visible!important;transform:translateX\(0\)!important\}/);
  a.doesNotMatch(css, /\.hc-sidebar\{display:flex!important;position:relative!important/);
  a.match(homeCss, /\.hc-sidebar\{position:fixed;inset:0 auto 0 0;[\s\S]{0,200}visibility:hidden;transform:translateX\(-100%\)/);
  a.match(homeCss, /\.hc-sidebar\.hc-open\{visibility:visible;transform:translateX\(0\)/);
  a.match(desk, /if\(b\.id==='homeMenu'\|\|b\.id==='homeScrim'\)\{toggleDrawer\(b\.id==='homeMenu',true\);return;\}/, 'the hamburger opens the drawer and the scrim closes it');
  a.match(home, /function toggleDrawer\(open,focus=false\)\{[\s\S]{0,300}\$\('homeSidebar'\)\.classList\.toggle\('hc-open',open\)/);

  const makeClassList=()=>{const set=new Set();return{toggle:(name,on)=>on?set.add(name):set.delete(name),contains:name=>set.has(name),remove:name=>set.delete(name)};};
  const els={homeScreen:{classList:makeClassList()},homeSidebar:{classList:makeClassList()},homeScrim:{hidden:true},homeFrame:{inert:false},homeMenu:{attrs:{},setAttribute(k,v){this.attrs[k]=v;},focus(){this.focused=true;}},homeNav:{querySelector:()=>({focus(){}})}};
  let toggleDrawer,keydown;
  const browser={TLHomeData:{},TLSeasonCalendar:{},TLSeasonState:{},TLCalendarProgress:{},TLClubUI:{esc:String,icon:()=>''},TLClubOffice:{},TLManagerDesk:{install:api=>{toggleDrawer=api.toggleDrawer;}},document:{readyState:'complete',getElementById:id=>els[id]},matchMedia:()=>({matches:true,addEventListener(){}}),addEventListener:(type,fn)=>{if(type==='keydown')keydown=fn;}};
  vm.runInNewContext(home,{window:browser,document:browser.document,matchMedia:browser.matchMedia});
  toggleDrawer(true,true);
  a.ok(els.homeSidebar.classList.contains('hc-open')&&!els.homeScrim.hidden&&els.homeFrame.inert,'opening the drawer shows it and blocks the tactics page beneath');
  toggleDrawer(false,true);
  a.ok(!els.homeSidebar.classList.contains('hc-open')&&els.homeScrim.hidden&&!els.homeFrame.inert,'closing the drawer restores access to the page');
  toggleDrawer(true,true);toggleDrawer(false,true);
  a.ok(!els.homeSidebar.classList.contains('hc-open')&&els.homeScrim.hidden,'repeated toggles always land on the drawer state that was asked for');
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
  const hiddenTarget = { dataset: { roleTarget: '23', roleSlot: '5', roleX: '.59', roleY: '.32', roleJob: 'Attacking Midfielder', rolePhase: 'defense', roleKeeper: 'false' }, classList: classes(), closest: selector => selector === '.shape-field [data-role-target]' ? hiddenTarget : selector === '.shape-field' ? field : null };
  const oldDocument = global.document;
  global.document = { body: { appendChild() {} }, createElement: () => ({ classList: classes(), style: {}, setAttribute() {}, remove() {}, append() {} }), elementFromPoint: () => hiddenTarget };
  try {
    const ev = (x, y) => ({ target: shirt, isPrimary: true, button: 0, pointerId: 2, clientX: x, clientY: y });
    handlers.pointerdown(ev(5, 5)); handlers.pointermove(ev(45, 80));
    a.equal(shirt.style.translate, '40px 75px', 'the dragged jersey itself follows the pointer');
    handlers.pointerup(ev(45, 80));
    a.ok(TLMatchBoard.active(s).moves?.[5], 'the drop commits a defensive position');
    a.equal(TLMatchBoard.active(s).attackByPlayer, undefined, 'it does not move the attacking position');
  } finally { global.document = oldDocument; }
});

test('dragging the In Possession jersey in Both edits only that phase and accepts a hidden line marker', () => {
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
  const destination = { dataset: { roleTarget: '4', roleSlot: '5', roleX: '.75', roleY: '.88', roleJob: '', rolePhase: 'attack', roleKeeper: 'false' }, classList: classes(), closest: selector => selector === '.shape-field [data-role-target]' ? destination : selector === '.shape-field' ? field : null };
  const oldDocument = global.document; global.document = { elementFromPoint: () => destination };
  try {
    const ev = (target, x, y) => ({ target, isPrimary: true, button: 0, pointerId: 10, clientX: x, clientY: y });
    handlers.pointerdown(ev(shirt, 10, 10)); handlers.pointermove(ev(shirt, 70, 25));
    a.ok(destination.classList.contains('fm-drop-target'), 'the hidden in-possession marker is highlighted in Both');
    a.equal(shirt.style.translate, '60px 15px', 'the actual jersey follows the pointer');
    handlers.pointerup(ev(shirt, 70, 25));
    const after = TLMatchBoard.sheet(s.tactic, plan, pool).slots[5];
    a.deepEqual({ x: after.x, y: after.y }, base, 'the out-of-possession position remains unchanged');
    a.ok(plan.attackByPlayer?.[playerId], 'the in-possession position is stored for this player');
    a.deepEqual(plan.attackByPlayer[playerId], {x:.75,y:.88}, 'the hidden destination stores its exact snapped position');
  } finally { global.document = oldDocument; }
});

test('dragging a shirt onto a visible formation destination moves it to that role', () => {
  const s = career(); s.id = 'role-destination-drag';
  const plan = TLMatchBoard.active(s), before = TLMatchBoard.sheet(s.tactic, plan, pool).slots[5];
  const handlers = {}, root = { addEventListener: (kind, fn) => { handlers[kind] = fn; }, setPointerCapture() {}, querySelector: () => null };
  TLBoardRoom.bind(root, (action, value) => { if (action === 'matchBoard') TLMatchBoard.update(s, value, pool); }, () => {});
  TLBoardRoom.render(s, pool);
  const classes = () => { const set = new Set(); return { add: (...v) => v.forEach(x => set.add(x)), remove: (...v) => v.forEach(x => set.delete(x)), toggle: (v, on) => on ? set.add(v) : set.delete(v), contains: v => set.has(v) }; };
  const field = { dataset: { orientation: 'portrait', phaseView: 'defense' }, classList: classes(), getBoundingClientRect: () => ({ left: 0, top: 0, right: 100, bottom: 140, width: 100, height: 140 }), closest: selector => selector === '.shape-field' ? field : null };
  const shirt = { dataset: { slot: '5', playerId: before.player.id }, parentElement: field, classList: classes(), style: {}, getBoundingClientRect: () => ({left:0,top:0,width:20,height:20}), closest: selector => selector === '.shape-field [data-slot]' ? shirt : selector === '.shape-field' ? field : null };
  const destination = { dataset: { roleTarget: '29', roleSlot: '5', roleX: '.92', roleY: '.5', roleJob: 'Striker', rolePhase: 'defense', roleKeeper: 'false' }, classList: classes(), getBoundingClientRect: () => ({left:100,top:200,width:20,height:10}), closest: selector => selector === '.shape-field [data-role-target]' ? destination : selector === '.shape-field' ? field : null };
  const oldDocument = global.document; global.document = { elementFromPoint: () => destination };
  try {
    const ev = (x, y) => ({ target: shirt, isPrimary: true, button: 0, pointerId: 11, clientX: x, clientY: y });
    handlers.pointerdown(ev(10, 10)); handlers.pointermove(ev(40, 60));
    a.ok(field.classList.contains('fm-dragging'), 'the pitch reveals role targets during a drag');
    a.ok(destination.classList.contains('fm-drop-target'), 'the destination role is highlighted');
    a.ok(shirt.classList.contains('fm-snap-preview'), 'the dragged shirt magnetically previews the target');
    a.equal(shirt.style.translate,'100px 195px','the shirt glides to the target centre');
    handlers.pointerup(ev(40, 60));
    a.equal(plan.moves[5].x, .9, 'the dragged player is placed at the selected role destination');
    a.equal(plan.moves[5].y, .5);
    a.equal(plan.defenseFormation, 'Custom', 'a single extreme move remains a custom position instead of falsely matching another template');
    a.match(TLBoardRoom.render(s, pool), /Custom \(\d+(?:-\d+)+\) OOP/, 'the custom shape shows its live numbered line distribution');
    a.ok(!field.classList.contains('fm-dragging'), 'temporary target emphasis clears after drop');
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

test('dragged defensive coordinates recognize 4-2-1-3 and update the formation control without touching the other phase', () => {
  const s = career(); s.tactic = '4-4-2'; s.boardPhase = 'base';
  const plan = TLMatchBoard.active(s), before = TLMatchBoard.sheet(s.tactic, plan, pool).slots.map(v => v.player?.id || null);
  plan.attackFormation = '4-3-3';
  plan.ids = before;
  const snap = p => ({ x: p.x < .225 ? .14 : p.x < .38 ? .32 : p.x < .54 ? .45 : p.x < .665 ? .59 : p.x < .87 ? .75 : .9, y: p.y < .23 ? .12 : p.y < .42 ? .32 : p.y > .77 ? .88 : p.y > .58 ? .68 : .5 });
  const target = TLData.FORMATIONS['4-2-1-3'];
  plan.moves = Array(11).fill(null);
  target.slice(0, 9).forEach((point, index) => { plan.moves[index + 1] = snap(point); });
  const last = snap(target[9]);
  TLMatchBoard.update(s, `move|10|${last.x}|${last.y}|defense`, pool);
  a.equal(plan.defenseFormation, '4-2-1-3');
  a.equal(s.tactic, '4-2-1-3', 'the engine-facing formation and displayed shape stay synchronized');
  a.equal(plan.defenseAdjusted, true, 'the recognized defensive preset remains flagged as adjusted');
  a.equal(plan.attackFormation, '4-3-3', 'the defensive drag does not relabel the in-possession shape');
  a.deepEqual(TLMatchBoard.sheet(s.tactic, plan, pool).slots.map(v => v.player?.id || null), before, 'recognition does not change player identities');
  const html = TLBoardRoom.render(s, pool);
  a.match(html, /4-2-1-3 OOP/);
  a.match(html, /<option value="4-2-1-3" selected>4-2-1-3<\/option>/, 'the out-of-possession picker follows the recognized shape');
});

test('dragging In Possession updates its own formation picker and label, like Out of Possession', () => {
  const single = career(); single.tactic = '4-4-2'; single.boardPhase = 'attack';
  TLMatchBoard.update(single, 'move|5|0.9|0.5|attack', pool);
  a.equal(TLMatchBoard.active(single).attackFormation, 'Custom', 'an individual attacking move changes the detected formation instead of leaving a stale preset label');
  a.match(TLBoardRoom.render(single, pool), /Custom \(\d+(?:-\d+)+\) IP/);
  a.match(TLBoardRoom.render(single, pool), /<option value="Custom" selected>Custom \(\d+(?:-\d+)+\)<\/option>/);

  const s = career(); s.tactic = '4-4-2'; s.boardPhase = 'attack';
  const plan = TLMatchBoard.active(s), defensiveBefore = plan.defenseFormation || s.tactic;
  const snap = p => ({ x: p.x < .225 ? .14 : p.x < .38 ? .32 : p.x < .54 ? .45 : p.x < .665 ? .59 : p.x < .87 ? .75 : .9, y: p.y < .23 ? .12 : p.y < .42 ? .32 : p.y > .77 ? .88 : p.y > .58 ? .68 : .5 });
  const target = TLData.FORMATIONS['4-2-1-3'];
  target.forEach((point, index) => { const p = snap(point); TLMatchBoard.update(s, `move|${index + 1}|${p.x}|${p.y}|attack`, pool); });
  a.equal(plan.attackFormation, '4-2-1-3');
  a.equal(plan.defenseFormation || s.tactic, defensiveBefore, 'attacking drags do not relabel the defensive shape');
  a.equal(plan.attackAdjusted, true, 'the recognized attacking shape can report snapped pitch spacing');
  const html = TLBoardRoom.render(s, pool);
  a.match(html, /4-2-1-3 IP/);
  a.match(html, /<option value="4-2-1-3" selected>4-2-1-3<\/option>/, 'the in-possession picker follows the detected formation');
});

test('formation catalogue covers the supplied recognised shapes and custom positions produce a numbered line shape', () => {
  const names = ['4-4-1-1','4-1-3-2','4-2-4','4-1-2-3','4-3-3 with False Nine','4-1-1-3-1','3-4-1-2','3-3-1-3','3-2-4-1','3-1-4-2','3-1-3-3','3-1-4-1-1','3-2-3-2','5-2-2-1','5-3-1-1','5-1-3-1','5-1-2-2','5-4-1 Diamond','3-2-2-3','2-3-5','2-3-2-3','2-5-3','1-3-3-3','1-4-3-2','1-4-2-3','1-4-4-1','1-5-3-1','1-3-4-2','1-3-5-1'];
  for (const name of names) {
    a.equal(TLData.FORMATIONS[name]?.length, 10, `${name} has ten outfield positions`);
    a.equal(TLMatchBoard.detectFormation(TLData.FORMATIONS[name], name), name, `${name} is selectable and recognizable`);
  }
  a.equal(TLMatchBoard.formationNumber(TLData.FORMATIONS['4-4-2']), '4-4-2');
  a.equal(TLMatchBoard.formationNumber(TLData.FORMATIONS['4-2-3-1']), '4-2-3-1');
});

test('formation matching falls back to Custom for an ambiguous or distant arrangement', () => {
  a.equal(TLMatchBoard.detectFormation(Array(10).fill({ x: .5, y: .5 })), 'Custom');
  const duplicate = TLData.FORMATIONS['4-4-2 Diamond'].map(point => ({ ...point }));
  TLData.FORMATIONS['__ambiguous fixture'] = duplicate; TLData.LEGACY_FORMATIONS.push('__ambiguous fixture');
  try {
    a.equal(TLMatchBoard.detectFormation(duplicate), 'Custom', 'duplicate catalogue geometry is not guessed without a preferred label');
    a.equal(TLMatchBoard.detectFormation(duplicate, '4-4-2 Diamond'), '4-4-2 Diamond', 'an existing selected preset resolves equivalent template geometry');
  } finally { TLData.LEGACY_FORMATIONS.pop(); delete TLData.FORMATIONS['__ambiguous fixture']; }
  a.equal(TLMatchBoard.detectFormation(TLData.FORMATIONS['3-2-5']), '3-2-5', 'the existing attacking-only 3-2-5 option can now be recognized as a shared shape');
});

test('selecting a defensive formation lays out players while preserving identities and role settings', () => {
  const s = career(), plan = TLMatchBoard.active(s), before = TLMatchBoard.sheet(s.tactic, plan, pool).slots;
  const identities = before.map(v => v.player?.id || null), role = TLZones.choices(before[5].position)[0];
  plan.phaseRoles = Array(11).fill(null); plan.phaseRoles[5] = { defense: { job: role } };
  TLMatchBoard.update(s, 'formation|0|4-2-1-3', pool);
  const after = TLMatchBoard.sheet(s.tactic, plan, pool).slots;
  a.equal(plan.defenseFormation, '4-2-1-3');
  a.deepEqual(after.map(v => v.player?.id || null), identities, 'the formation change keeps every player in the same assignment');
  a.deepEqual(after.slice(1).map(v => ({ x: v.x, y: v.y })).sort((x, y) => x.x - y.x || x.y - y.y), TLData.FORMATIONS['4-2-1-3'].map(({ x, y }) => ({ x, y })).sort((x, y) => x.x - y.x || x.y - y.y));
  a.deepEqual(plan.phaseRoles[5], { defense: { job: role } }, 'phase-specific player role instructions survive the layout update');
});

test('recognized formation coordinates and labels survive saved preset and career JSON reload', () => {
  const s = career(); TLMatchBoard.update(s, 'formation|0|4-2-1-3', pool);
  TLMatchBoard.update(s, 'savePreset|0|Recognized shape', pool);
  const persisted = JSON.parse(JSON.stringify(s)), saved = TLMatchBoard.active(persisted);
  a.equal(saved.defenseFormation, '4-2-1-3');
  TLMatchBoard.update(persisted, 'formation|0|4-3-3', pool);
  TLMatchBoard.update(persisted, `loadPreset|0|${persisted.activeTacticPreset}`, pool);
  a.equal(TLMatchBoard.active(persisted).defenseFormation, '4-2-1-3');
  a.equal(persisted.tactic, '4-2-1-3');
  a.deepEqual(TLMatchBoard.sheet(persisted.tactic, TLMatchBoard.active(persisted), pool).slots.slice(1).map(v => ({ x: v.x, y: v.y })).sort((x, y) => x.x - y.x || x.y - y.y), TLData.FORMATIONS['4-2-1-3'].map(({ x, y }) => ({ x, y })).sort((x, y) => x.x - y.x || x.y - y.y));
});

test('the out-of-possession formation picker applies the selected template to the linked board', () => {
  const s = career(), handlers = {}, root = { addEventListener: (kind, fn) => { handlers[kind] = fn; }, querySelector: () => null };
  s.boardPhase = 'both';
  TLBoardRoom.bind(root, (action, value) => { if (action === 'matchBoard') TLMatchBoard.update(s, value, pool); }, () => {});
  const control = { value: '4-2-1-3', dataset: { plan: 'tactic' }, hasAttribute: name => name === 'data-plan' };
  handlers.change({ target: control });
  a.equal(s.boardPhase, 'both', 'changing a formation in Both keeps the side-by-side comparison visible');
  a.equal(s.tactic, '4-2-1-3');
  a.equal(TLMatchBoard.formation(s), '4-2-1-3');
  a.equal(TLMatchBoard.active(s).ids.length, 11, 'the selected formation retains all linked pitch assignments');
  s.boardPhase = 'combined';
  TLMatchBoard.update(s, 'attackFormation|0|4-2-3-1', pool);
  a.equal(s.boardPhase, 'combined', 'changing the in-possession preset does not switch away from the selected view');
  TLMatchBoard.update(s, 'formation|0|4-3-3', pool);
  a.equal(s.boardPhase, 'combined', 'changing the out-of-possession preset also keeps the selected view');
});

test('Out of Possession, In Possession, Combined and Both expose the same role and hidden-position markers', () => {
  const s = career(), counts = {};
  for (const phase of ['base', 'attack', 'combined', 'both']) {
    s.boardPhase = phase;
    const html = TLBoardRoom.render(s, pool), fields = phase === 'both' ? 2 : 1;
    counts[phase] = {
      targets: (html.match(/data-role-target="\d+"/g) || []).length,
      roleLabels: (html.match(/data-role-code="[A-Z]+"/g) || []).length,
    };
    a.equal(counts[phase].targets, fields * 31, `${phase} uses the same 31 draggable targets per pitch`);
    a.equal(counts[phase].roleLabels, fields * 21, `${phase} shows the same labeled roles per pitch`);
  }
  s.boardPhase = 'both';
  const both = TLBoardRoom.render(s, pool);
  a.match(both, /data-attack-formation/, 'Both keeps the formation controls available alongside the phase comparison');
  a.match(both, /data-plan="tactic"/);
});

test('attacking markers use phase-local destinations, assign their role, and persist unified phase coordinates', () => {
  const s = career(), plan = TLMatchBoard.active(s), slot = TLMatchBoard.sheet(s.tactic, plan, pool).slots[5];
  TLMatchBoard.update(s, 'moveRole|5|0.9|0.5|Advanced Forward|attack', pool);
  const moved = TLMatchBoard.sheet(s.tactic, plan, pool).slots[5];
  a.equal(moved.attack.x, .9);
  a.equal(moved.attack.y, .5);
  a.equal(plan.phaseRoles[5].attack.job, 'Advanced Forward');
  a.equal(plan.phaseCoordinates.attack[5].x, .9);
  a.equal(plan.phaseCoordinates.attack[5].y, .5);
  a.equal(plan.phaseCoordinates.defense, undefined, 'an attacking marker does not create defensive edits');
  a.equal(plan.moves, undefined, 'legacy out-of-possession coordinates remain untouched');
  a.equal(moved.player.id, slot.player.id, 'the marker keeps the player linked to the same slot');
  const matchLineup = TLMatchBoard.lineup(s.tactic, plan, pool), engineSlot = matchLineup.xi.find(v => v.player.id === slot.player.id);
  a.deepEqual({ x: engineSlot.attack.x, y: engineSlot.attack.y }, { x: .9, y: .5 }, 'the match lineup receives the same in-possession coordinates shown on the board');
  const roundTrip = JSON.parse(JSON.stringify(plan));
  a.deepEqual(roundTrip.phaseCoordinates.attack[5], plan.phaseCoordinates.attack[5], 'phase coordinates survive career serialization');
});

test('imported tactic presets validate and preserve the unified coordinates for both phases', () => {
  const s = career(), payload = {
    version: 1, name: 'Dual-phase coordinates', formation: '4-2-1-3',
    plan: {
      defenseFormation: '4-2-1-3', attackFormation: '4-3-3',
      phaseCoordinates: {
        defense: Array.from({ length: 11 }, (_, i) => i ? { x: .14 + i * .01, y: .5 } : null),
        attack: Array.from({ length: 11 }, (_, i) => i ? { x: .2 + i * .01, y: .4 } : null),
      },
    },
  };
  TLMatchBoard.update(s, `importPreset|0|${encodeURIComponent(JSON.stringify(payload))}`, pool);
  const plan = TLMatchBoard.active(s);
  a.deepEqual(plan.phaseCoordinates.defense[5], { x: .19, y: .5 });
  a.deepEqual(plan.phaseCoordinates.attack[5], { x: .25, y: .4 });
  a.equal(plan.defenseFormation, '4-2-1-3');
  a.equal(s.tactic, '4-2-1-3');
});

test('player instructions expose only settings that have an effect in the selected possession phase',()=>{
 const s=career();s.id='phase-aware-player-instructions';let handlers={};const root={addEventListener:(kind,fn)=>handlers[kind]=fn,querySelector:()=>null};TLBoardRoom.bind(root,(action,value)=>{if(action==='matchBoard')TLMatchBoard.update(s,value,pool);},()=>{});TLBoardRoom.render(s,pool);
 handlers.click({target:{closest:selector=>selector==='button'?{dataset:{workspaceTab:'players'},hasAttribute:()=>false}:null}});
 handlers.click({target:{closest:selector=>selector==='.fm-row[data-slot]'?{dataset:{slot:'3'}}:null}});
 s.boardPhase='attack';let html=TLBoardRoom.render(s,pool);a.match(html,/data-player-instruction="attack\|p\d+\|risk"/);a.match(html,/data-player-instruction="attack\|p\d+\|dribbling"/);a.doesNotMatch(html,/data-player-instruction="attack\|p\d+\|pressing"/);let attackPosition=html.match(/<select data-player-instruction="attack\|p\d+\|position">([\s\S]*?)<\/select>/)?.[1]||'';a.doesNotMatch(attackPosition,/Hold defensive position/);
 s.boardPhase='base';html=TLBoardRoom.render(s,pool);a.match(html,/data-player-instruction="defense\|p\d+\|pressing"/);a.match(html,/data-player-instruction="defense\|p\d+\|position"/);a.doesNotMatch(html,/data-player-instruction="defense\|p\d+\|(?:risk|shooting|dribbling)"/);let defensePosition=html.match(/<select data-player-instruction="defense\|p\d+\|position">([\s\S]*?)<\/select>/)?.[1]||'';a.doesNotMatch(defensePosition,/Get further forward/);
});

test('Team Instructions has a distinct transition and distribution panel without rewriting either phase shape',()=>{
 const s=career();s.id='team-transition-instructions';const before={tactic:s.tactic,plan:JSON.parse(JSON.stringify(TLMatchBoard.active(s)))},handlers={};const root={addEventListener:(kind,fn)=>handlers[kind]=fn,querySelector:()=>null};TLBoardRoom.bind(root,(action,value)=>{if(action==='matchBoard')TLMatchBoard.update(s,value,pool);},()=>{});TLBoardRoom.render(s,pool);
 handlers.click({target:{closest:selector=>selector==='button'?{dataset:{workspaceTab:'instructions'},hasAttribute:()=>false}:null}});TLBoardRoom.render(s,pool);TLMatchBoard.update(s,'phase|0|transition',pool);let html=TLBoardRoom.render(s,pool);
 for(const group of ['lost','won','gk','target','delivery'])a.match(html,new RegExp(`data-order="${group}"`));for(const label of ['When possession is lost','When possession is won','Goalkeeper distribution','Transitions & goalkeeper distribution'])a.ok(html.includes(label),`missing ${label}`);
 for(const [group,value] of [['lost','Counter-press'],['won','Play forward immediately'],['gk','Distribute quickly'],['target','Flanks'],['delivery','Take long kicks']])handlers.change({target:{value,dataset:{order:group},hasAttribute:name=>name==='data-order'}});
 const saved=JSON.parse(JSON.stringify(s)),plan=TLMatchBoard.active(saved);a.deepEqual(plan.orders,{lost:'Counter-press',won:'Play forward immediately',gk:'Distribute quickly',target:'Flanks',delivery:'Take long kicks'});a.equal(saved.boardPhase,'transition');a.equal(saved.tactic,before.tactic);for(const key of ['defenseFormation','attackFormation','phaseCoordinates','playerInstructions','instructions'])a.deepEqual(plan[key],before.plan[key],`transition settings preserve ${key}`);
 TLMatchBoard.update(saved,'phase|0|attack',pool);a.equal(TLMatchBoard.active(saved).orders.lost,'Counter-press');a.equal(TLMatchBoard.active(saved).orders.won,'Play forward immediately');
});
