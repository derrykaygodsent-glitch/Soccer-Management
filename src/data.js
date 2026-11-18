/* TOUCHLINE 26 — original data layer. Fictional clubs & players. */
(function (global) {
  'use strict';

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const FIRST = ['Kofi', 'Mateo', 'Lukas', 'Dario', 'Yusuf', 'Emeka', 'Jonas', 'Rafael', 'Tomas', 'Idris',
    'Marco', 'Nils', 'Pavel', 'Andres', 'Kwame', 'Soren', 'Luca', 'Dmitri', 'Arda', 'Felipe',
    'Owen', 'Thiago', 'Mikkel', 'Sami', 'Bruno', 'Elias', 'Noah', 'Ivan', 'Diego', 'Karim',
    'Finn', 'Aleks', 'Joel', 'Ravi', 'Sergio', 'Tariq', 'Viktor', 'Wes', 'Yannick', 'Zane',
    'Adam', 'Bilal', 'Cesar', 'Dani', 'Erik', 'Fabio', 'Gavin', 'Hugo', 'Iker', 'Jamal'];
  const LAST = ['Mensah', 'Vidic', 'Larsson', 'Moreau', 'Okafor', 'Silva', 'Kovacs', 'Diallo', 'Petrov', 'Haaland',
    'Ferreira', 'Nakamura', 'Olsen', 'Castillo', 'Boateng', 'Lindgren', 'Rossi', 'Volkov', 'Yilmaz', 'Torres',
    'Brennan', 'Costa', 'Andersen', 'Haddad', 'Almeida', 'Berg', 'Clarke', 'Markovic', 'Herrera', 'Ndiaye',
    'Ozdemir', 'Novak', 'Meyer', 'Kaur', 'Ramos', 'Farouk', 'Sokolov', 'Hughes', 'Dubois', 'Adeyemi',
    'Keller', 'Santos', 'Weiss', 'Iqbal', 'Duran', 'Conti', 'Walsh', 'Vargas', 'Zidane', 'Keita',
    'Stojan', 'Baptiste', 'Eriksen', 'Foden', 'Guerrero', 'Hansen', 'Ito', 'Jensen', 'Kone', 'Lombardi'];

  const CLUBS = [
    { id: 'nbu', name: 'Northbridge United', short: 'NBU', city: 'Northbridge', rep: 88, primary: '#d62839', secondary: '#ffffff', gk: '#f4a300', stadium: 'The Ironworks', style: 'attack' },
    { id: 'rvr', name: 'Riverside FC', short: 'RVR', city: 'Riverside', rep: 85, primary: '#1f6fd6', secondary: '#cfe3ff', gk: '#3ddc84', stadium: 'Quayside Park', style: 'possession' },
    { id: 'kgd', name: 'Kingsdown Athletic', short: 'KGD', city: 'Kingsdown', rep: 82, primary: '#6d28d9', secondary: '#f2e9ff', gk: '#ff7ab6', stadium: 'Crown Meadow', style: 'press' },
    { id: 'efc', name: 'Eastvale City', short: 'EVC', city: 'Eastvale', rep: 78, primary: '#0ea5a4', secondary: '#063f3e', gk: '#ffd166', stadium: 'Vale Arena', style: 'counter' },
    { id: 'hpt', name: 'Harbourport Town', short: 'HPT', city: 'Harbourport', rep: 74, primary: '#f59e0b', secondary: '#232323', gk: '#7dd3fc', stadium: 'Dockside Road', style: 'direct' },
    { id: 'swl', name: 'Silverlake Wanderers', short: 'SLW', city: 'Silverlake', rep: 71, primary: '#e2e8f0', secondary: '#111827', gk: '#fb7185', stadium: 'Lakeview Ground', style: 'balanced' },
    { id: 'oak', name: 'Oakfield Rovers', short: 'OAK', city: 'Oakfield', rep: 68, primary: '#15803d', secondary: '#fde68a', gk: '#c084fc', stadium: 'The Acorn', style: 'defend' },
    { id: 'crl', name: 'Cinderlane FC', short: 'CRL', city: 'Cinderlane', rep: 64, primary: '#334155', secondary: '#f97316', gk: '#a3e635', stadium: 'Ember Lane', style: 'counter' }
  ];

  // role archetypes: key attributes weighted
  const ARCH = {
    GK: { keys: ['handling', 'reflexes', 'positioning'], num: [1, 13] },
    DC: { keys: ['tackling', 'positioning', 'composure'], num: [4, 5, 6, 15] },
    FB: { keys: ['pace', 'tackling', 'workRate'], num: [2, 3, 12] },
    DM: { keys: ['tackling', 'passing', 'positioning'], num: [6, 14, 16] },
    CM: { keys: ['passing', 'workRate', 'composure'], num: [8, 10, 16, 18] },
    AM: { keys: ['passing', 'dribbling', 'shooting'], num: [10, 20] },
    W:  { keys: ['pace', 'dribbling', 'passing'], num: [7, 11, 17] },
    ST: { keys: ['shooting', 'pace', 'composure'], num: [9, 19, 21] }
  };

  const SQUAD_PLAN = ['GK', 'GK', 'DC', 'DC', 'DC', 'DC', 'FB', 'FB', 'FB', 'DM', 'CM', 'CM', 'CM', 'AM', 'W', 'W', 'ST', 'ST'];

  function genSquad(club, seed) {
    const rnd = mulberry32(seed);
    const usedNames = new Set();
    const numCount = {};
    const players = [];
    SQUAD_PLAN.forEach((pos, i) => {
      let name;
      do { name = FIRST[(rnd() * FIRST.length) | 0] + ' ' + LAST[(rnd() * LAST.length) | 0]; } while (usedNames.has(name));
      usedNames.add(name);
      const base = 6 + club.rep * 0.085; // ~11.4 .. 13.5
      const attrs = {};
      const keys = ['pace', 'passing', 'shooting', 'tackling', 'dribbling', 'positioning', 'composure', 'aggression', 'workRate', 'stamina', 'handling', 'reflexes'];
      keys.forEach(k => {
        let v = base + (rnd() * 6 - 3);
        if (ARCH[pos].keys.includes(k)) v += 2.2 + rnd() * 2.4;
        if (pos === 'GK' && ['shooting', 'pace', 'dribbling', 'tackling'].includes(k)) v -= 6;
        if (pos !== 'GK' && ['handling', 'reflexes'].includes(k)) v = 3 + rnd() * 3;
        if (pos === 'ST' && k === 'tackling') v -= 3;
        if (pos === 'DC' && k === 'shooting') v -= 3;
        if (pos === 'DC' && k === 'pace') v -= 1.2;
        if ((pos === 'W' || pos === 'FB') && k === 'pace') v += 1.6;
        attrs[k] = Math.max(3, Math.min(20, Math.round(v)));
      });
      // Specialty ratings have an independent identity stream; assigning one
      // doesn't change the player's ordinary attributes or anyone's lineup.
      const deadBall = mulberry32(seedFor(club.id + ':dead-ball:' + i));
      const rate = n => Math.max(3, Math.min(20, Math.round(n)));
      attrs.throwing = rate(5 + deadBall() * 10 + (pos === 'FB' ? 3 : 0) + (attrs.passing - 12) * .30);
      attrs.throwPower = rate(5 + deadBall() * 11 + (pos === 'FB' ? 2.7 : pos === 'DC' ? 1 : 0));
      attrs.freeKicks = rate(attrs.shooting * .51 + attrs.passing * .25 + 1 + deadBall() * 7);
      attrs.penalties = rate(attrs.shooting * .55 + attrs.composure * .28 + deadBall() * 6);
      const pool = ARCH[pos].num;
      let num = pool[(numCount[pos] || 0) % pool.length];
      numCount[pos] = (numCount[pos] || 0) + 1;
      if (numCount[pos] > pool.length) num = 22 + i;
      players.push({
        id: club.id + '_' + i, name, pos, num, attrs,
        age: 19 + ((rnd() * 14) | 0),
        fitness: 1, rating: 6.7, yellow: 0, red: false,
        stats: { goals: 0, assists: 0, shots: 0, onTarget: 0, passes: 0, passWon: 0, tackles: 0, interceptions: 0, saves: 0, fouls: 0, keyPasses: 0 }
      });
    });
    return players;
  }

  // formation slots: x = fraction from own goal toward opp goal, y = fraction left->right
  const FORMATIONS = {
    '4-4-2': [
      { role: 'FB', x: 0.16, y: 0.10 }, { role: 'DC', x: 0.10, y: 0.36 }, { role: 'DC', x: 0.10, y: 0.64 }, { role: 'FB', x: 0.16, y: 0.90 },
      { role: 'W', x: 0.46, y: 0.10 }, { role: 'CM', x: 0.42, y: 0.38 }, { role: 'CM', x: 0.42, y: 0.62 }, { role: 'W', x: 0.46, y: 0.90 },
      { role: 'ST', x: 0.70, y: 0.40 }, { role: 'ST', x: 0.70, y: 0.60 }
    ],
    '4-3-3': [
      { role: 'FB', x: 0.16, y: 0.10 }, { role: 'DC', x: 0.10, y: 0.36 }, { role: 'DC', x: 0.10, y: 0.64 }, { role: 'FB', x: 0.16, y: 0.90 },
      { role: 'DM', x: 0.32, y: 0.50 }, { role: 'CM', x: 0.47, y: 0.30 }, { role: 'CM', x: 0.47, y: 0.70 },
      { role: 'W', x: 0.68, y: 0.10 }, { role: 'ST', x: 0.74, y: 0.50 }, { role: 'W', x: 0.68, y: 0.90 }
    ],
    '4-2-3-1': [
      { role: 'FB', x: 0.16, y: 0.10 }, { role: 'DC', x: 0.10, y: 0.36 }, { role: 'DC', x: 0.10, y: 0.64 }, { role: 'FB', x: 0.16, y: 0.90 },
      { role: 'DM', x: 0.33, y: 0.38 }, { role: 'DM', x: 0.33, y: 0.62 },
      { role: 'W', x: 0.58, y: 0.12 }, { role: 'AM', x: 0.55, y: 0.50 }, { role: 'W', x: 0.58, y: 0.88 },
      { role: 'ST', x: 0.74, y: 0.50 }
    ],
    '3-5-2': [
      { role: 'DC', x: 0.10, y: 0.26 }, { role: 'DC', x: 0.09, y: 0.50 }, { role: 'DC', x: 0.10, y: 0.74 },
      { role: 'WB', x: 0.44, y: 0.07 }, { role: 'CM', x: 0.42, y: 0.34 }, { role: 'DM', x: 0.34, y: 0.50 }, { role: 'CM', x: 0.42, y: 0.66 }, { role: 'WB', x: 0.44, y: 0.93 },
      { role: 'ST', x: 0.71, y: 0.40 }, { role: 'ST', x: 0.71, y: 0.60 }
    ],
    '5-3-2': [
      { role: 'FB', x: 0.15, y: 0.08 }, { role: 'DC', x: 0.09, y: 0.28 }, { role: 'DC', x: 0.08, y: 0.50 }, { role: 'DC', x: 0.09, y: 0.72 }, { role: 'FB', x: 0.15, y: 0.92 },
      { role: 'CM', x: 0.42, y: 0.28 }, { role: 'CM', x: 0.40, y: 0.50 }, { role: 'CM', x: 0.42, y: 0.72 },
      { role: 'ST', x: 0.69, y: 0.40 }, { role: 'ST', x: 0.69, y: 0.60 }
    ],
    '4-4-2 Diamond': [
      { role: 'FB', x: 0.16, y: 0.10 }, { role: 'DC', x: 0.10, y: 0.36 }, { role: 'DC', x: 0.10, y: 0.64 }, { role: 'FB', x: 0.16, y: 0.90 },
      { role: 'DM', x: 0.30, y: 0.50 }, { role: 'CM', x: 0.44, y: 0.28 }, { role: 'CM', x: 0.44, y: 0.72 }, { role: 'AM', x: 0.56, y: 0.50 },
      { role: 'ST', x: 0.71, y: 0.40 }, { role: 'ST', x: 0.71, y: 0.60 }
    ]
  };

  const ROLE_FIT = {
    GK: { GK: 1 }, DC: { DC: 1, FB: 0.72, DM: 0.6 }, FB: { FB: 1, WB: 0.92, DC: 0.75, W: 0.72 },
    WB: { FB: 0.9, W: 0.85, FB2: 0 }, DM: { DM: 1, CM: 0.9, DC: 0.62 }, CM: { CM: 1, DM: 0.9, AM: 0.88 },
    AM: { AM: 1, CM: 0.88, W: 0.85, ST: 0.8 }, W: { W: 1, AM: 0.85, WB: 0.82, ST: 0.78, FB: 0.6 },
    ST: { ST: 1, AM: 0.8, W: 0.78 }
  };
  ROLE_FIT.WB = { FB: 0.92, W: 0.88, CM: 0.6 };

  const ROLE_WEIGHTS = {
    GK: p => p.handling * 2 + p.reflexes * 2 + p.positioning,
    DC: p => p.tackling * 2 + p.positioning * 1.6 + p.composure + p.pace * 0.5,
    FB: p => p.pace * 1.5 + p.tackling * 1.5 + p.workRate + p.passing * 0.6,
    WB: p => p.pace * 1.6 + p.workRate * 1.4 + p.passing + p.tackling,
    DM: p => p.tackling * 1.6 + p.passing * 1.5 + p.positioning * 1.3,
    CM: p => p.passing * 2 + p.workRate * 1.2 + p.composure + p.tackling * 0.6,
    AM: p => p.passing * 1.7 + p.dribbling * 1.5 + p.shooting + p.composure * 0.6,
    W: p => p.pace * 2 + p.dribbling * 1.7 + p.passing * 0.8,
    ST: p => p.shooting * 2.2 + p.pace * 1.2 + p.composure * 1.1 + p.dribbling * 0.5
  };

  function roleFit(playerPos, slotRole) {
    if (playerPos === slotRole) return 1;
    const m = ROLE_FIT[slotRole] || {};
    return m[playerPos] || 0.35;
  }

  function bestXI(players, formationName) {
    const slots = FORMATIONS[formationName];
    const avail = players.filter(p => !p.red);
    const picked = [];
    const used = new Set();
    // Use an on-field outfielder if the only available keeper was sent off.
    const keepers = avail.filter(p => p.pos === 'GK');
    const gk = (keepers.length ? keepers : avail.slice()).sort((a, b) => ROLE_WEIGHTS.GK(b.attrs) - ROLE_WEIGHTS.GK(a.attrs))[0];
    if (gk) { picked.push({ player: gk, role: 'GK', x: 0.035, y: 0.5 }); used.add(gk.id); }
    const order = slots.map((s, i) => ({ s, i })).sort((a, b) => {
      const w = { DC: 0, FB: 1, WB: 2, DM: 3, CM: 4, AM: 5, W: 6, ST: 7 };
      return w[a.s.role] - w[b.s.role];
    });
    for (const { s } of order) {
      let best = null, bestScore = -1;
      for (const p of avail) {
        if (used.has(p.id) || p.pos === 'GK') continue;
        const score = ROLE_WEIGHTS[s.role](p.attrs) * roleFit(p.pos, s.role);
        if (score > bestScore) { bestScore = score; best = p; }
      }
      if (best) { picked.push({ player: best, role: s.role, x: s.x, y: s.y }); used.add(best.id); }
    }
    // restore formation order (GK first then slots order)
    const xi = gk ? [picked[0]] : [];
    slots.forEach(s => {
      const f = picked.find(p => p.role === s.role && p.x === s.x && p.y === s.y && !xi.includes(p));
      if (f) xi.push(f);
    });
    const bench = players.filter(p => !used.has(p.id));
    return { xi, bench };
  }

  const MENTALITIES = ['Cautious', 'Balanced', 'Positive', 'Attacking', 'All-Out Attack'];
  const PASSING = ['Short', 'Mixed', 'Direct'];
  const TEMPO = ['Slow', 'Normal', 'High'];
  const PRESS = ['Low', 'Medium', 'High'];
  const WIDTH = ['Narrow', 'Normal', 'Wide'];
  const LINE = ['Deep', 'Normal', 'High'];

  function defaultTactics(style) {
    const t = { formation: '4-3-3', mentality: 2, passing: 1, tempo: 1, press: 1, width: 1, line: 1 };
    if (style === 'attack') { t.formation = '4-2-3-1'; t.mentality = 3; t.press = 2; t.line = 2; }
    if (style === 'possession') { t.formation = '4-3-3'; t.mentality = 2; t.passing = 0; t.tempo = 1; }
    if (style === 'press') { t.formation = '4-3-3'; t.press = 2; t.tempo = 2; t.line = 2; t.mentality = 3; }
    if (style === 'counter') { t.formation = '5-3-2'; t.mentality = 1; t.passing = 2; t.line = 0; t.press = 0; }
    if (style === 'direct') { t.formation = '4-4-2'; t.passing = 2; t.tempo = 2; t.mentality = 2; }
    if (style === 'defend') { t.formation = '4-4-2'; t.mentality = 1; t.line = 0; t.width = 0; }
    return t;
  }

  function seedFor(clubId) {
    let h = 2166136261;
    for (let i = 0; i < clubId.length; i++) { h ^= clubId.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0) % 1000000;
  }

  global.TLData = { mulberry32, CLUBS, genSquad, seedFor, FORMATIONS, bestXI, roleFit, ROLE_WEIGHTS, MENTALITIES, PASSING, TEMPO, PRESS, WIDTH, LINE, defaultTactics };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.TLData;
})(typeof window !== 'undefined' ? window : globalThis);
