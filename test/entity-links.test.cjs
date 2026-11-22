const { test } = require('node:test');
const assert = require('node:assert/strict');
const W = require('../src/manager-life');
const D = require('../src/data');
const fs = require('node:fs');
const Meridian = require('../src/meridian');
global.TLData = D;
global.TLManagerLife = W;
global.TLMeridian = Meridian;
global.TLTechnical = require('../src/technical-area');
global.TLSeasonCalendar = require('../src/season-calendar');
const links = require('../src/entity-links');

function openCareer() {
  const s = W.create({
    name: 'Nia Bell', age: 31, gender: 'Female', nation: 'Valdoria',
    job: 'Community coach', marital: 'Single', children: [], face: 'Oval',
    skin: 'Brown', path: 'apply',
  }, 'auto-links');
  W.activate(s);
  return s;
}

test('entity names resolve to dossier targets for clubs, players, AI managers and the user manager', () => {
  const s = openCareer(), club = W.nations.Valdoria[1], player = W.pool.find(p => p.club === club), manager = global.TLTechnical.office(s, club, 'Valdoria', W.nations.Valdoria).coach;
  assert.equal(links.descriptor(club, s).kind, 'club');
  assert.equal(links.descriptor('Valdoria', s).kind, 'league');
  assert.equal(links.descriptor('Grandessa', s).kind, 'place');
  assert.equal(links.descriptor(player.name, s).id, player.id);
  assert.equal(links.descriptor(player.name, { ...s, roster: [player.id] }).kind, 'squad');
  assert.equal(links.descriptor(manager.name, s).id, manager.id);
  assert.deepEqual(links.descriptor(s.profile.name, s), { kind: 'manager', id: 'user:' + s.id });
});

test('registered stadiums and referees resolve only to stable, live dossier identities', () => {
  const s = openCareer(), ground = D.CLUBS.find(c => c.id && c.stadium), referee = global.TLSeasonCalendar.referees[0];
  assert.deepEqual(links.descriptor(ground.stadium, s), { kind: 'dossier', type: 'stadium', id: ground.id });
  assert.deepEqual(links.descriptor(referee.name, s), { kind: 'dossier', type: 'referee', id: referee.id });
  assert.equal(links.descriptor('Not a registered venue or person', s), null);
});

test('generated destinations are handled by the manager desk router', () => {
  const source = fs.readFileSync(require.resolve('../src/manager-desk.js'), 'utf8');
  for (const route of ['worldClub', 'worldManager', 'worldLeague', 'guideCountry', 'leaguePlayer', 'squadPlayer']) {
    assert.match(source, new RegExp(`b\\.dataset\\.${route}`), `${route} click handler exists`);
  }
  assert.match(source, /addEventListener\('popstate'/, 'back navigation restores saved dossier state');
  assert.match(source, /addEventListener\('contextmenu'/, 'right-click context actions are shared by entity links');
  assert.match(source, /dataset\.entityContextOpen/, 'context action routes through the shared click handler');
  assert.match(source, /dataset\.dossierAction==='dossier'/, 'dossier cross-links use delegated navigation');
});

test('mention linker creates actionable buttons, preserves surrounding text, and skips existing controls', () => {
  const s = openCareer(), club = W.nations.Valdoria[1], player = W.pool.find(p => p.club === club);
  const button = { tagName: 'BUTTON', parentElement: null };
  const textNode = value => ({ nodeValue: value, parentElement: null, parentNode: null });
  const plain = textNode(`Visit ${club}; read ${player.name}.`);
  plain.parentElement = { tagName: 'P', parentElement: null, hasAttribute: () => false, getAttribute: () => null };
  const protectedText = textNode(player.name);
  protectedText.parentElement = button;
  const root = {
    nodes: [plain, protectedText],
    querySelectorAll: () => [],
    replaceChild(fragment, old) {
      const at = this.nodes.indexOf(old);
      this.nodes.splice(at, 1, ...fragment.children);
    },
  };
  plain.parentNode = root;
  protectedText.parentNode = root;
  const fakeDocument = {
    createTreeWalker(target) {
      let i = 0;
      return { nextNode() { return target.nodes[i++] || null; }, get currentNode() { return target.nodes[i - 1]; } };
    },
    createDocumentFragment() { return { children: [], append(...items) { this.children.push(...items); } }; },
    createTextNode(value) { return { nodeType: 3, nodeValue: value }; },
    createElement() { return { dataset: {}, textContent: '', setAttribute() {}, className: '' }; },
  };
  const previous = global.document;
  global.document = fakeDocument;
  try {
    const count = links.link(root, s);
    assert.equal(count, 2);
    const generated = root.nodes.filter(node => node.dataset);
    assert.equal(generated.length, 2);
    assert.equal(generated[0].dataset.worldClub, club);
    assert.equal(generated[1].dataset.leaguePlayer, player.id);
    assert.equal(root.nodes.at(-1).nodeValue, player.name, 'existing buttons are not nested or rewritten');
  } finally {
    global.document = previous;
  }
});
