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

  // Playback speed is global. A mode selects footage, never its playback rate.
  const RATES = [0, 1.65, 3.3, 6.6];
  const playbackRate = speed => RATES[speed] ?? RATES[1];
  const DEFAULT_MODE = 'extended';
  const ATTACK_GAP = 365, CONTEXT_GAP = 445;
  const MODES = Object.freeze(Object.fromEntries([
    { id: 'full', label: 'Full Match', rank: 0, lead: 0, tail: 0, opening: 0,
      estimate: '55–60', bestFor: 'Tactical analysis', detail: 'Continuous play, including possession and movement between chances.' },
    { id: 'comprehensive', label: 'Comprehensive', rank: 3, lead: 21, tail: 14, opening: 16,
      estimate: '14–21', bestFor: 'Important matches', detail: 'More buildup, attacking spells, defensive recoveries and restarts.' },
    { id: 'extended', label: 'Extended', rank: 2, lead: 18, tail: 12, opening: 10,
      estimate: '7–13', bestFor: 'Normal league matches', detail: 'Key moments plus a selection of attacks, chances and attacking set pieces.' },
    { id: 'key', label: 'Key', rank: 1, lead: 16, tail: 11, opening: 7,
      estimate: '2–6', bestFor: 'Quick season progression', detail: 'Only goals, major chances, penalties, woodwork and dismissals.' }
  ].map(mode => [mode.id, Object.freeze(mode)])));
  const modeFor = id => Object.hasOwn(MODES, id) ? MODES[id] : MODES[DEFAULT_MODE];
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
    if (ev.type === 'foul' && match.phase === 'freekick' && match.setpiece && depthFor(match, match.setpiece.team) > 76) return 3;
    return Infinity;
  }

  function shotRank(shot) {
    if (!shot || shot.outcome === 'pending') return Infinity;
    if (shot.pen || shot.outcome === 'goal' || shot.outcome === 'post' || shot.xg >= .26 || (shot.outcome === 'save' && shot.xg >= .22)) return 1;
    if (shot.outcome === 'save' || shot.xg >= .14) return 2;
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
      if (match.half !== this.half) {
        this.half = match.half;
        this.spell = null;
        this.lastAttack = this.lastContext = -Infinity;
      }
      let rank = Infinity, cross = Infinity;
      for (; this.events < match.events.length; this.events++) {
        const ev = match.events[this.events], quality = eventRank(ev, match);
        if (ev.type === 'cross') cross = Math.min(cross, quality);
        else rank = Math.min(rank, quality);
      }
      const shot = match.shotMap.at(-1);
      if (shot !== this.shot || shot?.outcome !== this.outcome) {
        this.shot = shot;
        this.outcome = shot?.outcome;
        rank = Math.min(rank, shotRank(shot));
      }
      const t = match.elapsed;
      // Crosses and runs compete for an extra passage; actual shots and decisive
      // events are never suppressed by these repeat-action cooldowns.
      if (cross === 2 && rank > 2 && !this.spell?.attack && t - this.lastAttack >= ATTACK_GAP) {
        this.lastAttack = t;
        if (this.spell) this.spell.attack = this.spell.context = true;
        rank = 2;
      } else if (cross <= 3 && rank > 3 && !this.spell?.context && t - this.lastContext >= CONTEXT_GAP) {
        this.lastContext = t;
        if (this.spell) this.spell.context = true;
        rank = 3;
      }
      if (match.phase !== 'open') {
        // Set pieces interrupt an open-play possession.
        this.spell = null;
        return rank;
      }
      const owner = match.ball.owner;
      if (!owner) return rank; // A pass in flight is still part of the same possession.
      const team = owner.team, depth = depthFor(match, team);
      const spell = this.spell;
      if (!spell || spell.team !== team) {
        const recovery = !!spell && spell.high >= 77 && depth <= 28;
        this.spell = { team, start: t, low: depth, high: depth, recovery, attack: false, context: false };
        return rank;
      }
      spell.low = Math.min(spell.low, depth);
      spell.high = Math.max(spell.high, depth);
      if (t - spell.start < 1) return rank;
      const gain = depth - spell.low;
      if (rank > 2 && depth >= 80 && gain >= 19 && !spell.attack && t - this.lastAttack >= ATTACK_GAP) {
        spell.attack = spell.context = true;
        this.lastAttack = t;
        return 2;
      }
      const buildup = depth >= 69 && gain >= 15;
      if (rank > 3 && !spell.context && t - this.lastContext >= CONTEXT_GAP && (buildup || spell.recovery)) {
        spell.context = true;
        this.lastContext = t;
        return 3;
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
