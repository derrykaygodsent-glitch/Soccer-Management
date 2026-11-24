const test = require('node:test');
const assert = require('node:assert/strict');
const ClubHistory = require('../src/club-world-history.js');
const Market = require('../src/transfer-market.js');

test('club identity signals are evidence-based, rolling, and require repeated seasons', () => {
  const state = {};
  for (const year of [2026, 2027]) {
    ClubHistory.update(state, year, {
      Harbour: {
        style: 'possession', startDay: year * 100, endDay: year * 100 + 99,
        players: [
          { id: 'y1:prospect', age: 19, intakeYear: year - 1, appearances: 12 },
          { id: 'veteran', age: 28, appearances: 28 },
        ],
      },
    }, [
      { day: year * 100 + 3, from: 'Elsewhere', to: 'Harbour', type: 'Permanent transfer', price: 500 },
      { day: year * 100 + 4, from: 'Harbour', to: 'Elsewhere', type: 'Permanent transfer', price: 200 },
      { day: year * 100 + 5, from: 'Elsewhere', to: 'Harbour', type: 'Loan', price: 900 },
      { day: year * 100 + 101, from: 'Elsewhere', to: 'Harbour', type: 'Permanent transfer', price: 700 },
    ]);
    assert.equal(state.clubWorldHistory.Harbour.identity.recurringStyle, null,
      'a repeated style is not established from fewer than three seasons');
    assert.equal(state.clubWorldHistory.Harbour.identity.youthPathwayEstablished, false);
  }
  ClubHistory.update(state, 2028, {
    Harbour: {
      style: 'possession', startDay: 202800, endDay: 202899,
      players: [
        { id: 'y1:prospect', age: 20, intakeYear: 2027, appearances: 12 },
        { id: 'veteran', age: 29, appearances: 28 },
      ],
    },
  });
  const profile = state.clubWorldHistory.Harbour.identity;
  assert.equal(profile.seasonsObserved, 3);
  assert.equal(profile.recurringStyle, 'possession');
  assert.equal(profile.styleSeasons, 3);
  assert.equal(profile.youthPathwayEstablished, true);
  assert.equal(profile.permanentArrivals, 2);
  assert.equal(profile.permanentDepartures, 2);
  assert.equal(profile.netSpend, 600);

  ClubHistory.update(state, 2029, { Harbour: { style: 'direct', players: [] } });
  assert.equal(state.clubWorldHistory.Harbour.seasons.length, 4);
  assert.equal(state.clubWorldHistory.Harbour.identity.recurringStyle, 'possession',
    'a stable identity persists through a single contrary season');
  ClubHistory.update(state, 2030, { Harbour: { style: 'direct', players: [] } });
  assert.equal(state.clubWorldHistory.Harbour.identity.recurringStyle, 'possession');
  ClubHistory.update(state, 2031, { Harbour: { style: 'direct', players: [] } });
  assert.equal(state.clubWorldHistory.Harbour.identity.recurringStyle, 'direct',
    'the recurring style shifts only after the rolling evidence favors the new pattern');
});

test('repeated net investment or selling establishes a spending style only after three seasons', () => {
  const state = {};
  const observe = (year, direction) => ClubHistory.update(state, year, {
    Club: { players: [], startDay: year * 100, endDay: year * 100 + 99 },
  }, direction ? [{ day: year * 100 + 1, from: direction > 0 ? 'Elsewhere' : 'Club', to: direction > 0 ? 'Club' : 'Elsewhere', type: 'Permanent transfer', price: 100 }] : []);
  observe(2026, 1); observe(2027, 1);
  assert.equal(state.clubWorldHistory.Club.identity.spendingStyle, null,
    'two positive seasons are still too little evidence');
  observe(2028, 1);
  assert.equal(state.clubWorldHistory.Club.identity.spendingStyle, 'investor');
  observe(2029, 1); observe(2030, -1); observe(2031, -1); observe(2032, -1);
  assert.equal(state.clubWorldHistory.Club.identity.spendingStyle, 'seller',
    'the rolling profile follows the new repeated pattern after older seasons leave the window');
});

test('twenty seasons of spending evidence shift recruitment preferences only as the rolling pattern matures', () => {
  const state = {}, team = [{ pos: 'ST' }];
  const expensive = { id: 'expensive', pos: 'ST', age: 29, value: 1000 };
  const economical = { id: 'economical', pos: 'ST', age: 24, value: 300 };
  let investorObserved = false, sellerObserved = false;
  for (let year = 2026; year < 2046; year++) {
    const direction = year < 2034 ? 1 : -1;
    ClubHistory.update(state, year, {
      Club: { players: [], startDay: year * 100, endDay: year * 100 + 99 },
    }, [{ day: year * 100 + 1, from: direction > 0 ? 'Elsewhere' : 'Club', to: direction > 0 ? 'Club' : 'Elsewhere', type: 'Permanent transfer', price: 100 }]);
    const profile = state.clubWorldHistory.Club.identity;
    assert.equal(state.clubWorldHistory.Club.seasons.length, Math.min(ClubHistory.WINDOW, year - 2025));
    const chosen = Market.rankTargets([economical, expensive], team, false, profile.spendingStyle)[0];
    if (profile.spendingStyle === 'investor') {
      investorObserved = true;
      assert.equal(chosen, expensive, 'an investor identity preserves the normal value-based choice');
    } else if (profile.spendingStyle === 'seller') {
      sellerObserved = true;
      assert.equal(chosen, economical, 'a sustained seller identity biases toward the lower-cost option');
    } else {
      assert.equal(profile.spendingStyle, null, 'a mixed or short evidence window stays unclassified');
      assert.equal(chosen, expensive);
    }
  }
  assert.ok(investorObserved && sellerObserved, 'both sustained patterns should influence choices over the two-decade run');
  assert.equal(state.clubWorldHistory.Club.identity.spendingStyle, 'seller');
});

test('club history replaces duplicate season observations and retains a bounded window', () => {
  const state = {};
  for (let year = 2020; year < 2030; year++) {
    ClubHistory.update(state, year, { Club: { style: 'press', players: [] } });
  }
  assert.deepEqual(state.clubWorldHistory.Club.seasons.map(row => row.year), [2025, 2026, 2027, 2028, 2029]);
  ClubHistory.update(state, 2029, { Club: { style: 'counter', players: [] } });
  assert.equal(state.clubWorldHistory.Club.seasons.length, ClubHistory.WINDOW);
  assert.equal(state.clubWorldHistory.Club.seasons.at(-1).coachStyle, 'counter');
});
