const test = require('node:test');
const a = require('node:assert/strict');
const W = require('../src/manager-life');
const G = require('../src/world-guide');

global.TLManagerLife = W;
global.TLAtlasMap = { mapView: (code, town) => `<div class="map-stub" data-map="${code}:${town}"></div>` };

const A = W.atlas;
const career = nation => ({ profile: { nation }, day: 0 });
const rows = html => (html.match(/class="atlas-row"/g) || []).length;

test('the atlas opens as a country index, not a poster: every nation is one row inside its continent', () => {
  const html = G.atlas(career('Zandora'), {});
  a.match(html, /aria-pressed="true">Countries</, 'the list view is the default');
  a.match(html, new RegExp(`${A.countries.length} nations · ${A.countries.reduce((n, c) => n + c.members.length, 0)} registered clubs · ${A.continents.length} continents`));
  a.equal(rows(html), A.countries.length, 'one row per nation');
  a.equal((html.match(/class="atlas-group"/g) || []).length, A.continents.filter(k => A.countries.some(c => c.continent === k.name)).length, 'one group per used continent');
  for (const c of A.countries) {
    a.match(html, new RegExp(`data-atlas-choose="${c.code}"`), `${c.name} opens its dossier`);
    a.match(html, new RegExp(`${c.members.length} clubs`), `${c.name} counts its registered clubs`);
    a.match(html, new RegExp(`data-world-league="${c.name}"`), `${c.name} reaches its league in one press`);
  }
  a.equal((html.match(/class="atlas-major"/g) || []).length, 0, 'no major badge when the season layer is absent');
});

test('continent pills carry their real counts and the major badge only marks nations that have one', () => {
  global.TLFASeason = { major: (_s, nation) => nation === 'Zandora' };
  const html = G.atlas(career('Zandora'), {});
  a.match(html, new RegExp(`data-atlas-continent="" aria-pressed="true">All ${A.countries.length}<`));
  for (const k of A.continents) {
    const count = A.countries.filter(c => c.continent === k.name).length;
    if (count) a.match(html, new RegExp(`data-atlas-continent="${k.name}" aria-pressed="false">${k.name} ${count}<`));
  }
  a.equal((html.match(/class="atlas-major"/g) || []).length, 1, 'only Zandora is flagged major here');
  a.match(html, /atlas-major">Major league</);
  global.TLFASeason = undefined;
});

test('the map view stays an enhancement that names the country it shows and can be left', () => {
  const html = G.atlas(career('Zandora'), { view: 'map' });
  a.match(html, /aria-pressed="true">Map</);
  const zandora = A.countries.find(c => c.name === 'Zandora');
  a.match(html, new RegExp(`<b>Zandora</b> · ${zandora.continent} · capital ${zandora.capital}`), 'the pick line names nation, continent and capital');
  a.match(html, new RegExp(`Back to all ${A.countries.length} countries`), 'the list is one press away');
  a.match(html, /class="map-stub" data-map="ZAN:/, 'the map receives the chosen country');
  a.match(html, /Continental competition/, 'facts name the continental competition');
  a.match(html, /Registered clubs/);
  a.equal(rows(html), 0, 'the map view is not a second list');
});

test('an explicit country wins over the manager home nation and a missing one falls back to the first', () => {
  const westmark = A.countries.find(c => c.name === 'Westmark');
  a.match(G.atlas(career('Zandora'), { view: 'map', code: westmark.code }), new RegExp(`<b>${westmark.name}</b>`));
  a.match(G.atlas(career('Zandora'), { view: 'map', code: 'NOPE' }), new RegExp(`<b>Zandora</b>`));
  a.match(G.atlas({ profile: { nation: 'NOPE' }, day: 0 }, { view: 'map' }), new RegExp(`<b>${A.countries[0].name}</b>`));
});
