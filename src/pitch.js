/* Touchline 26 - shared pitch geometry, in metres. */
(function (global) {
  'use strict';
  const api = Object.freeze({
    L: 105, W: 68, CX: 52.5, CY: 34, GOAL_HALF: 3.66, GOAL_H: 2.44,
    BOX_L: 16.5, BOX_HALF: 20.16, SIX_L: 5.5, SIX_HALF: 9.16, PEN: 11,
    FREE_DISTANCE: 9.15, THROW_DISTANCE: 2,
    APRON_END: 11.7, APRON_SIDE: 7.65
  });
  global.TLPitch = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
