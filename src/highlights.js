/* Touchline 26 — viewing policy only. The match engine never depends on this module. */
(function (global) {
  'use strict';

  const { L, CY } = typeof window === 'undefined' ? require('./engine.js') : global.TLEngine;
  const { restartAt } = typeof window === 'undefined' ? require('./broadcast.js') : global.TLBroadcast;
  const STEP = 1 / 40;
  const MAX_SCAN_STEPS = 640;
  const SCAN_BUDGET_MS = 7;
  const EPS = 1e-6;
  const GOALS = new Set(['goal', 'og', 'penscore']);
  const BREAKS = new Set(['ht', 'ft']);
  const DECISIVE = new Set([...GOALS, 'pen', 'penmiss', 'red', 'post', 'varcheck', 'varresult']);
  const OTHER = new Set(['yellow', 'catch']);

  // This module selects footage. The shared broadcast clock sets its pace.
  const DEFAULT_MODE = 'extended';
  const ATTACK_GAP = 295, CONTEXT_GAP = 270, ROUTINE_RESTART_GAP = 1150;
  // A dead ball is a natural cut point. Use a short incident-specific lead
  // here rather than replaying a minute of unrelated buildup for every foul.
  const RESTART_CLIPS = { corner: [16, 17], offside: [17, 15], freekick: [10, 14] };
  // The largest window protects the buildup to a decisive incident. Shorter
  // passages for ordinary chances and tactical context keep the cuts distinct.
  // These are simulation seconds: with the slower shared pace they still give
  // the viewer time to see the buildup, without speeding up individual modes.
  const MODES = Object.freeze(Object.fromEntries([
    { id: 'full', label: 'Full Match', rank: 0, lead: 0, tail: 0, opening: 0,
      estimate: '15–25', bestFor: 'Tactical analysis', detail: 'Continuous play, including possession and movement between chances.' },
    { id: 'comprehensive', label: 'Comprehensive', rank: 3, lead: 65, tail: 44, opening: 17,
      extraLead: 37, extraTail: 25,
      estimate: '10–18', bestFor: 'Important matches', detail: 'More buildup and defensive recoveries, plus ordinary free kicks and other restarts.' },
    { id: 'extended', label: 'Extended', rank: 2, lead: 59, tail: 40, opening: 12,
      extraLead: 28, extraTail: 19,
      estimate: '7–12', bestFor: 'Normal league matches', detail: 'Key moments plus selected attacks, corners, offsides and a selection of free kicks.' },
    { id: 'key', label: 'Key', rank: 1, lead: 55, tail: 34, opening: 7,
      estimate: '3–7', bestFor: 'Quick season progression', detail: 'Goals, major chances, penalties, woodwork, dismissals and VAR checks.' }
  ].map(mode => [mode.id, Object.freeze(mode)])));
  const modeFor = id => Object.hasOwn(MODES, id) ? MODES[id] : MODES[DEFAULT_MODE];
  const leadFor = (policy, rank, cue) => rank > 1 ? (cue ? RESTART_CLIPS[cue][0] + (policy.rank === 3 ? 6 : 0) : policy.extraLead ?? policy.lead) : policy.lead;
  const tailFor = (policy, rank, cue) => rank > 1 ? (cue ? RESTART_CLIPS[cue][1] + (policy.rank === 3 ? 4 : 0) : policy.extraTail ?? policy.tail) : policy.tail;
  const atBreak = m => m.phase === 'halftime' || m.phase === 'fulltime';
  const depthFor = (match, team) => match.teams[team].attackDir > 0 ? match.ball.x : L - match.ball.x;

  function eventRank(ev, match) {
    if (DECISIVE.has(ev.type)) return 1;
    if (ev.type === 'corner' || ev.type === 'offside') return 2;
    if (ev.type === 'foul' && match.phase === 'freekick' && match.setpiece) {
      const sp = match.setpiece;
      return !sp.indirect && (sp.direct || sp.wide || depthFor(match, sp.team) > 73) ? 2 : 3;
    }
    if (ev.type === 'cross') {
      const f = match.ball.flight, team = match.teams[ev.team];
      if (f?.kind !== 'cross' || !f.intended || !team) return 3;
      const distanceToGoal = team.attackDir > 0 ? L - f.targetX : f.targetX;
      return distanceToGoal <= 15 && Math.abs(f.targetY - CY) <= 12 ? 2 : 3;
    }
    if (OTHER.has(ev.type)) return 3;
    return Infinity;
  }

  function shotRank(shot) {
    if (!shot || shot.outcome === 'pending' || shot.outcome === 'disallowed') return Infinity;
    // Key keeps decisive incidents and the clearest chances. Routine saves
    // still count in the match, but belong in the broader edits.
    if (shot.pen || shot.outcome === 'goal' || shot.outcome === 'post' || shot.xg >= .33 || (shot.outcome === 'save' && shot.xg >= .285)) return 1;
    if (shot.xg >= .14 || (shot.outcome === 'save' && shot.xg >= .095)) return 2;
    return 3;
  }

  class Scout {
    constructor(match) {
      this.events = match.events.length;
      this.shot = match.shotMap.at(-1);
      this.outcome = this.shot?.outcome;
      this.half = match.half;
      this.spell = null;
      this.lastAttack = this.lastContext = this.lastRoutineRestart = -Infinity;
      this.cue = null;
    }

    check(match) {
      if (match.half !== this.half) {
        this.half = match.half;
        this.spell = null;
        this.lastAttack = this.lastContext = this.lastRoutineRestart = -Infinity;
      }
      this.cue = null;
      const t = match.elapsed;
      let rank = Infinity, cross = Infinity;
      for (; this.events < match.events.length; this.events++) {
        const ev = match.events[this.events];
        let quality = eventRank(ev, match);
        const cue = ev.type === 'corner' || ev.type === 'offside' ? ev.type : ev.type === 'foul' && quality <= 3 ? 'freekick' : null;
        if (ev.type === 'cross') { cross = Math.min(cross, quality); continue; }
        // Extended includes a few ordinary restarts as well as attacking ones.
        // Comprehensive can see the rest. This only edits existing footage.
        if (cue === 'freekick' && quality === 3 && !match.setpiece?.indirect && t - this.lastRoutineRestart >= ROUTINE_RESTART_GAP) {
          this.lastRoutineRestart = t;
          quality = 2;
        }
        if (quality < rank || (quality === rank && !cue)) { rank = quality; this.cue = cue; }
      }
      const shot = match.shotMap.at(-1);
      if (shot !== this.shot || shot?.outcome !== this.outcome) {
        this.shot = shot;
        this.outcome = shot?.outcome;
        const quality = shotRank(shot);
        if (quality <= rank) { rank = quality; this.cue = null; }
      }
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
    const afterStep = options.afterStep;
    let ticks = 0;
    if (atBreak(match)) return { type: 'break', ticks };
    while (ticks < max && (ticks < 1 || ticks % 8 !== 0 || now() < limit)) {
      match.step(STEP);
      if (afterStep) afterStep(match);
      ticks++;
      const rank = scout.check(match);
      if (atBreak(match)) return { type: 'break', ticks };
      if (rank <= mode.rank) return scout.cue ? { type: 'moment', rank, ticks, cue: scout.cue } : { type: 'moment', rank, ticks };
    }
    return { type: 'search', ticks };
  }

  // Expose only the search position that can no longer be part of the buildup.
  // At the cut, this is exactly where playback picks up, never a clock rewind.
  const visibleStart = (from, at, policy, published = from, rank = 1, cue = null) => Math.max(from, published, at - leadFor(policy, rank, cue));

  function indexAt(frames, time, key = 'elapsed') {
    let low = 0, high = frames.length - 1;
    while (low < high) {
      const middle = (low + high + 1) >> 1;
      if (frames[middle][key] <= time + EPS) low = middle;
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

  function holdingAction(match) {
    const phase = match.phase;
    // If a restart is already on screen, let the taker actually play the ball
    // and show the immediate aftermath. It does not qualify on this alone.
    return phase === 'review' || phase === 'penalty' || phase === 'goal' || match.ball.flight?.kind === 'shot' || !!restartAt(match);
  }

  const api = { STEP, SCAN_BUDGET_MS, MAX_SCAN_STEPS, GOALS, BREAKS, DECISIVE, DEFAULT_MODE, MODES, modeFor, leadFor, tailFor, atBreak, eventRank, shotRank, Scout, scanBatch, visibleStart, indexAt, frameAt, clipFrames, holdingAction };
  global.TLHighlights = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
