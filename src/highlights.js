/* Touchline 26 — viewing policy only. The match engine never depends on this module. */
(function (global) {
  'use strict';

  const { L, CY } = typeof window === 'undefined' ? require('./engine.js') : global.TLEngine;
  const STEP = 1 / 40;
  const MAX_SCAN_STEPS = 640;
  const SCAN_BUDGET_MS = 7;
  const EPS = 1e-6;
  const GOALS = new Set(['goal', 'og', 'penscore']);
  const BREAKS = new Set(['ht', 'ft']);
  const DECISIVE = new Set([...GOALS, 'pen', 'penmiss', 'red', 'post']);
  const OTHER = new Set(['offside', 'yellow', 'catch']);

  // Full bypasses the filter; the other three tiers include all lower ranks.
  // Pace is simulated seconds per real second of visible play, not a physics input.
  const DEFAULT_MODE = 'extended';
  const SPEED_MULTIPLIERS = [0, 1, 2, 4];
  const MODES = Object.freeze(Object.fromEntries([
    { id: 'full', label: 'Full Match', rank: 0, lead: 0, tail: 0, opening: 0, pace: 4.65,
      estimate: '15–25', bestFor: 'Tactical analysis', detail: 'Continuous play, including possession and movement between chances.' },
    { id: 'comprehensive', label: 'Comprehensive', rank: 3, lead: 23, tail: 15, opening: 17, pace: 4.45,
      estimate: '10–18', bestFor: 'Important matches', detail: 'More buildup, attacking spells, defensive recoveries and restarts.' },
    { id: 'extended', label: 'Extended', rank: 2, lead: 18, tail: 12, opening: 10, pace: 4,
      estimate: '7–12', bestFor: 'Normal league matches', detail: 'Key moments plus a selection of attacks, chances and attacking set pieces.' },
    { id: 'key', label: 'Key', rank: 1, lead: 16, tail: 11, opening: 7, pace: 1.12,
      estimate: '3–7', bestFor: 'Quick season progression', detail: 'Goals, major chances, penalties, woodwork and dismissals shown at a more readable pace.' }
  ].map(mode => [mode.id, Object.freeze(mode)])));
  const modeFor = id => Object.hasOwn(MODES, id) ? MODES[id] : MODES[DEFAULT_MODE];
  const playbackRate = (mode, speed) => mode.pace * SPEED_MULTIPLIERS[speed];
  const atBreak = m => m.phase === 'halftime' || m.phase === 'fulltime';
  const depthFor = (match, team) => match.teams[team].attackDir > 0 ? match.ball.x : L - match.ball.x;

  function eventRank(ev, match) {
    if (DECISIVE.has(ev.type)) return 1;
    if (ev.type === 'corner' || (ev.type === 'foul' && match.phase === 'freekick' && match.setpiece?.direct)) return 2;
    if (ev.type === 'cross') {
      const f = match.ball.flight, team = match.teams[ev.team];
      if (f?.kind !== 'cross' || !f.intended || !team) return 3;
      const distanceToGoal = team.attackDir > 0 ? L - f.targetX : f.targetX;
      return distanceToGoal <= 15 && Math.abs(f.targetY - CY) <= 12 ? 2 : 3;
    }
    if (OTHER.has(ev.type)) return 3;
    if (ev.type === 'foul' && match.phase === 'freekick' && match.setpiece && depthFor(match, match.setpiece.team) > 62) return 3;
    return Infinity;
  }

  function shotRank(shot) {
    if (!shot || shot.outcome === 'pending') return Infinity;
    if (shot.pen || shot.outcome === 'goal' || shot.outcome === 'post' || shot.xg >= .26 || (shot.outcome === 'save' && shot.xg >= .22)) return 1;
    if (shot.outcome === 'save' || shot.xg >= .12) return 2;
    return 3;
  }

  class Scout {
    constructor(match) {
      this.events = match.events.length;
      this.shot = match.shotMap.at(-1);
      this.outcome = this.shot?.outcome;
      this.half = match.half;
      this.spell = null;
      this.lastAttack = this.lastContext = -Infinity;
    }

    check(match) {
      let rank = Infinity;
      for (; this.events < match.events.length; this.events++) {
        rank = Math.min(rank, eventRank(match.events[this.events], match));
      }
      const shot = match.shotMap.at(-1);
      if (shot !== this.shot || shot?.outcome !== this.outcome) {
        this.shot = shot;
        this.outcome = shot?.outcome;
        rank = Math.min(rank, shotRank(shot));
      }
      if (match.half !== this.half) {
        this.half = match.half;
        this.spell = null;
        this.lastAttack = this.lastContext = -Infinity;
      }
      if (match.phase !== 'open') {
        // Set-piece phases interrupt an open-play possession.
        this.spell = null;
        return rank;
      }
      const owner = match.ball.owner;
      if (!owner) return rank; // A pass in flight is still part of the same possession.
      const t = match.elapsed, team = owner.team, depth = depthFor(match, team);
      let spell = this.spell;
      if (!spell || spell.team !== team) {
        // A genuine regain under a previous attack, not a generic pass in one's own half.
        const recovery = !!spell && spell.high >= 74 && depth <= 31;
        this.spell = { team, start: t, low: depth, high: depth, recovery, attack: false, context: false };
        return rank;
      }
      spell.low = Math.min(spell.low, depth);
      spell.high = Math.max(spell.high, depth);
      if (t - spell.start < 1) return rank;
      const gain = depth - spell.low;
      const attack = depth >= 76 && gain >= 16;
      if (attack && !spell.attack && t - this.lastAttack >= 114) {
        spell.attack = spell.context = true;
        this.lastAttack = t;
        return Math.min(rank, 2);
      }
      const buildup = depth >= 62 && gain >= 10;
      if (!spell.context && t - this.lastContext >= 108 && (buildup || spell.recovery)) {
        spell.context = true;
        this.lastContext = t;
        return Math.min(rank, 3);
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
  const visibleStart = (from, at, policy, published = from) => Math.max(from, published, at - policy.lead);

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
    return policy.rank >= 2 && (match.phase === 'corner' || (match.phase === 'freekick' && !!match.setpiece?.direct));
  }

  const api = { STEP, SCAN_BUDGET_MS, MAX_SCAN_STEPS, GOALS, BREAKS, DECISIVE, DEFAULT_MODE, MODES, modeFor, playbackRate, atBreak, eventRank, shotRank, Scout, scanBatch, visibleStart, indexAt, frameAt, clipFrames, holdingAction };
  global.TLHighlights = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
