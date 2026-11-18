/* Touchline 26 — visual-only positioning for the on-pitch official. */
(function (global) {
  'use strict';
  const { L, W, CX, CY } = typeof window === 'undefined' ? require('./engine.js') : global.TLEngine;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const SPEED = 6.2;
  const between = (a, b, weight) => ({
    x: a.x + (b.x - a.x) * weight,
    y: a.y + (b.y - a.y) * weight
  });

  class Referee {
    constructor(elapsed = 0, side = 1) {
      this.previous = this.current = { elapsed, x: CX - 6.5 * side, y: CY + 12 * side };
      this.side = side;
      this.vx = this.vy = 0;
    }

    // Called on the match's regular snapshot ticks, never from the renderer. No
    // match properties, events, or random number generators are changed here.
    track(match) {
      const a = this.current, t = match.elapsed, dt = Math.min(.1, t - a.elapsed);
      if (dt <= 0) return a;
      const b = match.ball, team = match.setpiece?.team ?? match.controlTeam;
      const attack = match.teams[team].attackDir;
      const restart = match.phase === 'kickoff';
      const x = clamp(b.x, 0, L), y = clamp(b.y, 0, W);
      const tx = clamp(x - attack * (restart ? 6.5 : 11.5), 6, L - 6);
      const lane = CY + this.side * (restart ? 12 : 9 + .22 * (x - CX));
      const ty = clamp(lane - .42 * (y - CY), 6, W - 6);
      let vx = (tx - a.x) * .88, vy = (ty - a.y) * .88;
      // Prefer a clear sightline beside play and don't queue on top of a player.
      for (const p of match.playersCache) {
        const dx = a.x - p.x, dy = a.y - p.y, square = dx * dx + dy * dy;
        if (square >= 16 || square < .0001) continue;
        const gap = Math.sqrt(square), push = (4 - gap) * 1.45 / gap;
        vx += dx * push; vy += dy * push;
      }
      const cap = SPEED / Math.max(SPEED, Math.hypot(vx, vy));
      const blend = 1 - Math.exp(-4 * dt);
      this.vx += (vx * cap - this.vx) * blend;
      this.vy += (vy * cap - this.vy) * blend;
      this.previous = a;
      this.current = { elapsed: t, x: clamp(a.x + this.vx * dt, 5, L - 5), y: clamp(a.y + this.vy * dt, 5, W - 5) };
      return this.current;
    }

    view(elapsed) {
      const a = this.previous, b = this.current, span = b.elapsed - a.elapsed;
      return span > 0 ? between(a, b, clamp((elapsed - b.elapsed) / span + 1, 0, 1)) : b;
    }
  }

  const api = { Referee, between };
  global.TLReferee = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
