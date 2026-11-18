/* Touchline 26 — viewing policy only. The match engine never depends on this module. */
(function (global) {
  'use strict';

  const { L } = typeof window === 'undefined' ? require('./engine.js') : global.TLEngine;
  const STEP = 1 / 40;
  const MAX_SCAN_STEPS = 480;
  const SCAN_BUDGET_MS = 7;
  const EPS = 1e-6;
  const GOALS = new Set(['goal', 'og', 'penscore']);
  const BREAKS = new Set(['ht', 'ft']);
  const DECISIVE = new Set([...GOALS, 'pen', 'penmiss', 'red', 'post']);
  const DELIVERY = new Set(['cross', 'corner']);
  const OTHER = new Set(['offside', 'yellow', 'catch']);

  // Lower ranks are more selective. All the settings are cumulative.
  const MODES = Object.freeze(Object.fromEntries([
    { id: 'full', label: 'Full Match', rank: 0, lead: 0, tail: 0, opening: 0,
      detail: 'Watch continuously from kickoff to full time.' },
    { id: 'comprehensive', label: 'Comprehensive', rank: 4, lead: 23, tail: 17, opening: 22,
      detail: 'Extended highlights plus promising attacks, more restarts and defensive moments.' },
    { id: 'extended', label: 'Extended', rank: 3, lead: 20, tail: 14, opening: 15,
      detail: 'Every shot, dangerous crosses and attacking set pieces, with more buildup.' },
    { id: 'standard', label: 'Standard', rank: 2, lead: 16.5, tail: 12, opening: 10,
      detail: 'Key moments, shots on target and other good chances.' },
    { id: 'key', label: 'Key', rank: 1, lead: 9, tail: 6, opening: 6,
      detail: 'Goals, penalties, red cards, woodwork and the clearest chances.' }
  ].map(mode => [mode.id, Object.freeze(mode)])));
  const modeFor = id => Object.hasOwn(MODES, id) ? MODES[id] : MODES.full;
  const atBreak = m => m.phase === 'halftime' || m.phase === 'fulltime';

  function eventRank(ev, match) {
    if (DECISIVE.has(ev.type)) return 1;
    if (DELIVERY.has(ev.type) || (ev.type === 'foul' && match.phase === 'freekick' && match.setpiece?.direct)) return 3;
    if (OTHER.has(ev.type)) return 4;
    if (ev.type === 'foul' && match.phase === 'freekick' && match.setpiece) {
      const team = match.teams[match.setpiece.team];
      const depth = team.attackDir > 0 ? match.ball.x : L - match.ball.x;
      if (depth > 62) return 4;
    }
    return Infinity;
  }

  function shotRank(shot) {
    if (!shot || shot.outcome === 'pending') return Infinity;
    if (shot.pen || shot.outcome === 'goal' || shot.outcome === 'post' || shot.xg >= .28) return 1;
    if (shot.outcome === 'save' || shot.xg >= .165) return 2;
    return 3;
  }

  class Scout {
    constructor(match) {
      this.events = match.events.length;
      this.shot = match.shotMap.at(-1);
      this.outcome = this.shot?.outcome;
      this.half = match.half;
      this.inThird = [false, false];
      this.lastEntry = -Infinity;
    }

    check(match) {
      let rank = Infinity;
      for (; this.events < match.events.length; this.events++) rank = Math.min(rank, eventRank(match.events[this.events], match));
      const shot = match.shotMap.at(-1);
      if (shot !== this.shot || shot?.outcome !== this.outcome) {
        this.shot = shot;
        this.outcome = shot?.outcome;
        rank = Math.min(rank, shotRank(shot));
      }
      if (match.half !== this.half) {
        this.half = match.half;
        this.inThird = [false, false];
        this.lastEntry = -Infinity;
      }
      if (match.phase !== 'open') {
        this.inThird[0] = this.inThird[1] = false;
      } else if (match.ball.owner && match.ball.owner.role !== 'GK') {
        // Controlled entries, with a cooldown so the broadest mode still skips ordinary passages.
        const i = match.ball.owner.team, team = match.teams[i];
        const depth = team.attackDir > 0 ? match.ball.x : L - match.ball.x;
        if (depth < 64) this.inThird[i] = false;
        if (depth > 76 && !this.inThird[i]) {
          this.inThird[i] = true;
          if (match.elapsed - this.lastEntry > 78) {
            this.lastEntry = match.elapsed;
            rank = Math.min(rank, 4);
          }
        }
      }
      return rank;
    }
  }

  function scanBatch(match, scout, mode, options = {}) {
    const now = options.now || (() => performance.now());
    const limit = now() + (options.budget ?? SCAN_BUDGET_MS);
    const max = options.maxSteps ?? MAX_SCAN_STEPS;
    let ticks = 0;
    if (atBreak(match)) return { type: 'break', ticks };
    while (ticks < max && (ticks < 1 || ticks % 8 !== 0 || now() < limit)) {
      match.step(STEP);
      ticks++;
      const rank = scout.check(match);
      if (atBreak(match)) return { type: 'break', ticks };
      if (rank <= mode.rank) return { type: 'moment', rank, ticks };
    }
    return { type: 'search', ticks };
  }

  // Expose only the search position that can no longer be part of the buildup.
  // At the cut, this is exactly where playback picks up, never a clock rewind.
  const visibleStart = (from, at, policy) => Math.max(from, at - policy.lead);

  function indexAt(frames, time) {
    let low = 0, high = frames.length - 1;
    while (low < high) {
      const middle = (low + high + 1) >> 1;
      if (frames[middle].elapsed <= time + EPS) low = middle;
      else high = middle - 1;
    }
    return low;
  }

  function frameAt(history, time, first) {
    if (!history.length) return first;
    const frame = history[indexAt(history, time)];
    return frame.half === first.half && frame.elapsed > first.elapsed && frame.elapsed <= time + EPS ? frame : first;
  }

  function clipFrames(history, first, last, time) {
    const start = frameAt(history, time, first);
    const frames = [start];
    for (const frame of history) {
      if (frame.half === first.half && frame.elapsed > start.elapsed + EPS && frame.elapsed < last.elapsed - EPS) frames.push(frame);
    }
    if (last.elapsed > start.elapsed + EPS) frames.push(last);
    return frames;
  }

  function holdingAction(match, policy) {
    if (match.phase === 'penalty' || match.phase === 'goal' || match.ball.flight?.kind === 'shot') return true;
    return policy.rank >= 3 && (match.phase === 'corner' || (match.phase === 'freekick' && !!match.setpiece?.direct));
  }

  const api = { STEP, SCAN_BUDGET_MS, MAX_SCAN_STEPS, GOALS, BREAKS, DECISIVE, MODES, modeFor, atBreak, eventRank, shotRank, Scout, scanBatch, visibleStart, indexAt, frameAt, clipFrames, holdingAction };
  global.TLHighlights = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
