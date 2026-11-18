/* Touchline 26 — dead-ball decisions and geometry, independent of the broadcast. */
(function (global) {
  'use strict';
  const { L, W, CX, CY, GOAL_HALF, FREE_DISTANCE } = typeof window === 'undefined' ? require('./pitch.js') : global.TLPitch;
  const AI = typeof window === 'undefined' ? require('./decisions.js') : global.TLDecisions;
  const clamp = (x, a, b) => Math.max(a, Math.min(x, b));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const byDistance = (players, spot, merit = () => 0) => players.slice().sort((a, b) => (distance(a, spot) - merit(a)) - (distance(b, spot) - merit(b)));

  function freeKickShape(spot, attack, indirect = false) {
    const gx = attack > 0 ? L : 0, dx = Math.abs(gx - spot.x), dy = Math.abs(CY - spot.y);
    const range = Math.hypot(dx, dy), angle = Math.atan2(dy, Math.max(.2, dx));
    const shotLane = !indirect && range <= 32 && angle < .79;
    const wide = dx <= 34 && dy >= 12 && range <= 44;
    const dangerous = shotLane || wide || dx <= 18;
    // The keeper covers the open side. Screen the near-side lane as seen
    // from the spot, not a fixed column of players at every foul.
    const side = spot.y < CY ? -1 : 1;
    let count = shotLane ? (range <= 22 && angle < .47 ? 5 : range <= 27 && angle < .62 ? 4 : range <= 29 ? 3 : 2)
      : wide && dx < 27 && range < 38 ? (dx < 18 ? 2 : 1) : indirect && dx < 18 && dy < 15 ? 3 : 0;
    const pivotY = CY + side * GOAL_HALF * (shotLane ? .58 : .84);
    const bearing = Math.atan2(pivotY - spot.y, gx - spot.x), ux = Math.cos(bearing), uy = Math.sin(bearing);
    const wall = [];
    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) * .5) * 1.19;
      const x = spot.x + ux * (FREE_DISTANCE + .59) - uy * offset;
      const y = spot.y + uy * (FREE_DISTANCE + .59) + ux * offset;
      if (x > .25 && x < L - .25 && y > .25 && y < W - .25) wall.push({ x, y });
      else if (indirect && dx < FREE_DISTANCE && Math.abs(y - CY) <= GOAL_HALF - .16) {
        wall.push({ x: gx, y }); // Law 13: defenders on their own goal line, between the posts.
      }
    }
    return { shotLane, wide, dangerous, range, angle, wall, keeperY: CY - side * (wall.length > 2 ? 1.36 : wall.length ? .76 : 0) };
  }

  const throwReach = p => (11.8 + p.attrs.throwPower * .90) * (.91 + .09 * p.cond);
  const throwSpeed = p => (10.8 + p.attrs.throwPower * .43) * (.90 + .10 * p.cond);

  function throwOptions(m, sp) {
    const p = sp.taker, team = m.teams[p.team], d = team.attackDir;
    const depth = CX + (sp.x - CX) * d, inward = sp.y < CY ? 1 : -1;
    const reach = throwReach(p), need = AI.gameNeed(team.score - m.teams[1 - p.team].score, m.minute());
    const direct = team.tactics.passing - 1, press = m.teams[1 - p.team].tactics.press;
    const choices = [];
    for (const q of m.playersCache) {
      if (q.team !== p.team || q === p || q.stunT > .25 || (q.role === 'GK' && depth > 24)) continue;
      const nearby = distance(sp, q);
      if (nearby < 2.2 || nearby > reach + 1.8) continue;
      const lead = clamp(nearby * .035, .16, .78);
      const x = clamp(q.x + q.vx * lead, 1.8, L - 1.8);
      const y = clamp(q.y + q.vy * lead, 2.0, W - 2.0);
      const dd = distance(sp, { x, y }), gain = (x - sp.x) * d;
      if (dd > reach || (y - sp.y) * inward < 1.9) continue;
      const room = m.nearestOppDist(q);
      const crowd = m.laneRisk(sp.x, sp.y, x, y, p.team, 1.4, dd >= 12);
      const receiver = (q.attrs.composure + q.attrs.positioning - 24) * .009;
      const far = dd > 13.3;
      const goalDepth = CX + (x - CX) * d;
      const intoBox = depth >= 75 && goalDepth >= 88.5 && Math.abs(y - CY) <= 20.0;
      const forward = clamp(gain / 13, -1, 1);
      let kind = gain < -1.8 ? 'recycle' : 'short';
      let score = .72 + clamp((room - 2.2) * .076, -.21, .34) - crowd * .23 + receiver
        - Math.max(0, dd - 6) * .019 + (direct * .05 + need * .105) * forward;
      if (!far) score += gain < -1.8 ? .075 + (depth < 43 ? .035 : 0) : .048;
      else {
        kind = intoBox && dd > 16.5 ? 'long' : 'line';
        score += (p.attrs.throwing - 11) * .008 + forward * (.15 + direct * .032) + (room < 2 && press === 2 ? -.055 : 0);
        if (kind === 'long') score += .30 + (p.attrs.throwPower - 14) * .023 + direct * .10 + need * .055 + (q.attrs.positioning - 11) * .014;
      }
      // Avoid feeding an already marked keeper in front of goal. A throw
      // to a teammate's feet still leaves the opponent free to challenge.
      if (q.role === 'GK') score -= .13;
      choices.push({ kind, target: q, x, y, distance: dd, score });
    }
    return choices;
  }

  function chooseThrow(m, sp, options = throwOptions(m, sp)) {
    const choice = AI.pick(options, m.choiceRnd, .18 + (16 - sp.taker.attrs.throwing) * .004);
    if (choice) return choice;
    const d = m.teams[sp.team].attackDir;
    // A throw into nearby grass is still a throw; no generic long-ball fallback.
    const x = clamp(sp.x + d * 5.2, 2, L - 2), y = sp.y < CY ? 4.2 : W - 4.2;
    return { kind: 'short', target: null, x, y, distance: distance(sp, { x, y }) };
  }

  const api = { freeKickShape, byDistance, throwReach, throwSpeed, throwOptions, chooseThrow };
  global.TLSetPieces = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
