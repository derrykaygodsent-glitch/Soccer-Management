/* Touchline 26 — shared presentation clock, independent of highlight selection. */
(function (global) {
  'use strict';
  const { L, CY } = typeof window === 'undefined' ? require('./engine.js') : global.TLEngine;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const smooth = n => { const t = clamp(n, 0, 1); return t * t * (3 - 2 * t); };
  const SPEEDS = [1, 2, 4];
  const multiplier = speed => SPEEDS[speed - 1] ?? SPEEDS[0];
  const ROUTINE = 5.35;

  function targetPace(match) {
    const b = match.ball, flight = b.flight, phase = match.phase;
    // Every mode sees the same movement at a given timestamp: the current
    // action, not the eventual result or the clip's rank, sets the tempo.
    if (phase === 'goal' || phase === 'penalty' || flight?.kind === 'shot') return 2.15;
    if (phase === 'corner' || (phase === 'freekick' && match.setpiece?.direct)) return 2.85;
    if (phase === 'kickoff') return 3.7;
    if (phase !== 'open') return ROUTINE;
    const attack = match.teams[b.owner?.team ?? flight?.team ?? match.controlTeam].attackDir;
    const toGoal = attack > 0 ? L - b.x : b.x;
    const box = smooth((30 - toGoal) / 22) * (.64 + .36 * smooth((25 - Math.abs(b.y - CY)) / 16));
    const delivery = flight?.kind === 'cross' ? .77 : .62 * smooth((b.z - .35) / 4.2);
    return ROUTINE - (ROUTINE - 2.5) * Math.max(box, delivery);
  }

  class Clock {
    constructor(match) {
      this.elapsed = match.elapsed;
      this.time = 0;
      this.pace = targetPace(match);
    }

    cost(step) { return step / this.pace; }

    // Events and regular snapshots arrive inside Match.step, just before observe.
    stamp(elapsed) { return this.time + this.cost(elapsed - this.elapsed); }

    observe(match) {
      const time = this.stamp(match.elapsed), dt = time - this.time;
      this.elapsed = match.elapsed;
      this.time = time;
      const target = targetPace(match);
      // Ease both into a chance and back to the broader play, avoiding abrupt
      // speed changes when a pass, shot or set piece begins or ends.
      const settle = target < this.pace ? .15 : .36;
      this.pace += (target - this.pace) * Math.min(1, dt / settle);
    }
  }

  const api = { Clock, multiplier, targetPace };
  global.TLBroadcast = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
