/* Touchline 26 — playback rate and on-screen restart context. */
(function (global) {
  'use strict';
  const SPEEDS = [1, 2, 4];
  // One real second is one simulation second at 1×, regardless of the action.
  // Highlight selection can skip time, but never rescales the footage itself.
  const matchSeconds = (realSeconds, speed) => realSeconds * (SPEEDS[speed - 1] ?? SPEEDS[0]);

  // Read-only view of an active set piece or its just-taken delivery.
  function restartAt(match, follow = 7.5) {
    const { phase, setpiece, lastRestart, elapsed, ball } = match;
    if (setpiece && phase === setpiece.type) return setpiece;
    if (phase !== 'open' || !lastRestart) return null;
    const delivery = lastRestart.id != null && ball.flight?.restartId === lastRestart.id;
    return elapsed - lastRestart.takenAt < follow || delivery ? lastRestart : null;
  }

  const api = { matchSeconds, restartAt };
  global.TLBroadcast = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
