/* Touchline 26: on-field referee movement and signals; never draws a random number. */
(function (global) {
  'use strict';
  const { L, W, CX, CY, PEN } = typeof window === 'undefined' ? require('./pitch.js') : global.TLPitch;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const SPEED = 6.2;
  const between = (a, b, weight) => ({
    x: a.x + (b.x - a.x) * weight,
    y: a.y + (b.y - a.y) * weight,
    ...(a.signal ? { signal: a.signal } : {})
  });

  function signal(match) {
    const sp = match.setpiece;
    if (match.phase === 'review') return { kind: 'check' };
    if (sp) {
      const dir = match.teams[sp.team].attackDir;
      if (sp.card) return { kind: sp.card.kind, player: sp.offender?.id };
      if (sp.stage === 'runup' && sp.managed && !sp.indirect) return { kind: 'whistle', x: sp.x, y: sp.y };
      if (sp.type === 'penalty') {
        if (match.elapsed - sp.awardedAt < 1.85) return { kind: 'penalty', x: sp.x, y: CY };
        if (sp.cards?.length) return null;
        return { kind: 'wait', x: sp.x, y: CY };
      }
      if (sp.type === 'freekick') {
        if (sp.indirect) return { kind: 'indirect', dir };
        if (match.elapsed - sp.awardedAt < (sp.quick ? 2.8 : 1.85)) return { kind: 'direction', dir };
        if (!sp.cards?.length && sp.managed) return { kind: 'wait', x: sp.wall?.[0]?.tx ?? sp.x, y: sp.wall?.[0]?.ty ?? sp.y };
      }
      if (sp.type === 'throwin' && match.elapsed - sp.awardedAt < 2.25) return { kind: 'direction', dir };
    }
    if (match.phase === 'open' && match.lastRestart) {
      const release = match.lastRestart;
      if (release.indirect && match.ball.restart?.taker === release.taker) return { kind: 'indirect', dir: match.teams[release.team].attackDir };
      if (release.type === 'penalty' && match.elapsed - release.takenAt < .50) return { kind: 'whistle', x: release.x, y: release.y };
    }
    return null;
  }

  class Referee {
    constructor(elapsed = 0, side = 1) {
      this.previous = this.current = { elapsed, x: CX - 6.5 * side, y: CY + 12 * side };
      this.side = side;
      this.vx = this.vy = 0;
    }

    pocket(sp, attack) {
      const side = sp.y < 13 ? 1 : sp.y > W - 13 ? -1 : this.side;
      if (sp.type === 'penalty') return { x: (attack > 0 ? L : 0) - attack * (PEN + 2.8), y: CY + side * 10.6 };
      return { x: clamp(sp.x - attack * 3.6, 2, L - 2), y: clamp(sp.y + side * 7.3, 2, W - 2) };
    }

    target(match) {
      const b = match.ball, sp = match.setpiece, team = sp?.team ?? match.controlTeam;
      const attack = match.teams[team].attackDir;
      const review = match.phase === 'review', incident = review ? match.review : sp?.incident;
      const offender = sp?.offender;
      if (offender && (sp.card || sp.cards?.length) && match.elapsed - sp.awardedAt > 1.1) {
        const side = offender.y < 8 ? 1 : offender.y > W - 8 ? -1 : this.side;
        return { x: offender.x - attack * 1.55, y: offender.y + side * 2.05, hurry: true };
      }
      if ((review || (incident && match.elapsed - sp.awardedAt < 1.95)) && Number.isFinite(incident?.x)) {
        const side = incident.y < 8 ? 1 : incident.y > W - 8 ? -1 : this.side;
        return { x: incident.x - attack * 2.2, y: incident.y + side * 2.55, hurry: true };
      }
      if (sp?.managed) {
        // After marking the spot, close in beside the assembling wall.
        // Then get out of its sightline before giving the signal to take it.
        const wall = sp.wall[0];
        if (wall && sp.stage === 'setup' && match.elapsed - sp.awardedAt < 4.15) {
          const side = wall.ty < 8 ? 1 : wall.ty > W - 8 ? -1 : this.side;
          return { x: wall.tx - attack * 1.25, y: wall.ty + side * 4.6, hurry: true };
        }
        return { ...this.pocket(sp, attack), hurry: true };
      }
      if (sp?.type === 'freekick' || sp?.type === 'throwin') return this.pocket(sp, attack);
      const kickoff = match.phase === 'kickoff';
      const x = clamp(b.x, 0, L), y = clamp(b.y, 0, W);
      const lane = CY + this.side * (kickoff ? 12 : 9 + .22 * (x - CX));
      return { x: clamp(x - attack * (kickoff ? 6.5 : 10.9), 6, L - 6), y: clamp(lane - .43 * (y - CY), 6, W - 6) };
    }

    track(match) {
      const a = this.current, t = match.elapsed, dt = Math.min(.10, t - a.elapsed);
      if (dt <= 0) return a;
      const target = this.target(match);
      let vx = (target.x - a.x) * (target.hurry ? 1.35 : .9), vy = (target.y - a.y) * (target.hurry ? 1.35 : .9);
      // Steer around players without making them react to the official.
      for (const p of match.playersCache) {
        const dx = a.x - p.x, dy = a.y - p.y, square = dx * dx + dy * dy;
        const radius = target.hurry ? 2.35 : 3.55;
        if (square >= radius * radius || square < .0001) continue;
        const gap = Math.sqrt(square), push = (radius - gap) * 1.36 / gap;
        vx += dx * push; vy += dy * push;
      }
      const cap = SPEED / Math.max(SPEED, Math.hypot(vx, vy));
      const blend = 1 - Math.exp(-4.8 * dt);
      this.vx += (vx * cap - this.vx) * blend; this.vy += (vy * cap - this.vy) * blend;
      this.previous = a;
      this.current = { elapsed: t, x: clamp(a.x + this.vx * dt, 2, L - 2), y: clamp(a.y + this.vy * dt, 2, W - 2) };
      return this.current;
    }

    view(elapsed) {
      const a = this.previous, b = this.current, span = b.elapsed - a.elapsed;
      return span > 0 ? between(a, b, clamp((elapsed - b.elapsed) / span + 1, 0, 1)) : b;
    }

    pose(match, elapsed = match.elapsed) {
      return { ...this.view(elapsed), signal: signal(match) };
    }
  }

  const api = { Referee, between };
  global.TLReferee = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
