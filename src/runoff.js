/* The visible, dead ball outside the lines. Not a second playable ball. */
(function (global) {
  'use strict';
  const node = typeof window === 'undefined';
  const P = node ? require('./physics.js') : global.TLPhysics;
  const { L, W, APRON_END, APRON_SIDE } = node ? require('./pitch.js') : global.TLPitch;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const curve = (a, b, c, d, t) => (1-t)**3*a + 3*(1-t)**2*t*b + 3*(1-t)*t*t*c + t**3*d;

  function capture(ball, before, exit, dt) {
    const { x, y, z, vx, vy, vz, ax, ay, bounces } = ball;
    return { x, y, z, vx: ball.owner && dt ? (x-before.x)/dt : vx, vy: ball.owner && dt ? (y-before.y)/dt : vy,
      vz, ax, ay, bounces, prevX: before.x, prevY: before.y, prevZ: before.z, axis: exit.axis, line: exit.line };
  }

  function start(ball, sp, setupSeconds) {
    // Fit inside the preparation that was already going to happen. In particular
    // a quick throw and a saved match's command timings must not change.
    const seconds = setupSeconds - .065;
    const coast = Math.min(seconds * .55, .53 + ball.z * .095 + Math.hypot(ball.vx, ball.vy) * .012, 1.28);
    return { ball, x: sp.x, y: sp.y, seconds, coast, age: 0, pickup: null, finished: false };
  }

  function coast(ball, dt) {
    P.advance(ball, dt);
    const x = clamp(ball.x, -APRON_END, L + APRON_END), y = clamp(ball.y, -APRON_SIDE, W + APRON_SIDE);
    // The outer perimeter stops a hard clearance going off camera. A soft roll
    // can come to rest much closer to the line, without hitting the perimeter.
    if (x !== ball.x) { ball.x = x; ball.vx *= -.09; ball.vy *= .38; ball.ax = ball.ay = 0; }
    if (y !== ball.y) { ball.y = y; ball.vy *= -.09; ball.vx *= .38; ball.ax = ball.ay = 0; }
    if ((ball[ball.axis] - ball.line) * (ball.line === 0 ? -1 : 1) < P.RADIUS) {
      // Do not let a rebound from the perimeter resume play.
      ball[ball.axis] = ball.line + (ball.line === 0 ? -1 : 1) * P.RADIUS;
      ball['v' + ball.axis] = ball['a' + ball.axis] = 0;
    }
  }

  function collect(track) {
    const a = track.ball, { x, y } = track, { axis, line } = a, sign = line === 0 ? -1 : 1;
    // Follow the apron before coming to the restart spot; returning a corner
    // straight across the goalmouth would look like a new ball in play.
    const u = axis === 'x' ? { x: a.x, y: mix(a.y, y, .50) } : { x: mix(a.x, x, .50), y: a.y };
    const v = axis === 'x' ? { x: line + sign * .72, y } : { x, y: line + sign * .45 };
    const path = Math.hypot(a.x-u.x, a.y-u.y) + Math.hypot(u.x-v.x, u.y-v.y) + Math.hypot(v.x-x, v.y-y);
    return { x: a.x, y: a.y, z: a.z, u, v, duration: Math.min(track.seconds-track.coast, Math.max(.52, path/7.5 + .28)) };
  }

  function advance(track, dt) {
    if (!track || track.finished) return;
    const b = track.ball, elapsed = track.age;
    b.prevX = b.x; b.prevY = b.y; b.prevZ = b.z;
    if (elapsed < track.coast) coast(b, Math.min(dt, track.coast-elapsed));
    track.age += dt;
    if (track.age < track.coast) return;
    const a = track.pickup ||= collect(track);
    const t = clamp((track.age-track.coast)/a.duration, 0, 1), p = smooth(t);
    b.x = curve(a.x, a.u.x, a.v.x, track.x, p);
    b.y = curve(a.y, a.u.y, a.v.y, track.y, p);
    b.z = mix(a.z, .64, smooth(t/.27)) * (1-smooth((t-.70)/.30));
    b.vx = b.vy = 0;
    b.carried = smooth(t/.17)*(1-smooth((t-.78)/.22));
    track.finished = t >= 1;
  }

  const api = { capture, start, advance };
  global.TLRunoff = api;
  if (node) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
