/* Touchline 26 - ball mechanics in metres and seconds; no renderer or random rolls. */
(function (global) {
  'use strict';
  const G = 9.81, DRAG = .105, ROLL = 2.65, RADIUS = .11;
  const EPS = 1e-7;
  const airRange = t => -Math.expm1(-DRAG * t) / DRAG;
  const airTime = (d, speed) => -Math.log1p(-Math.min(.95, DRAG * d / Math.max(.01, speed))) / DRAG;
  const bendRange = t => (t - airRange(t)) / DRAG;
  const landingTime = (z, vz) => (vz + Math.sqrt(Math.max(0, vz * vz + 2 * G * Math.max(0, z)))) / G;

  function ground(ball, tx, ty, arrivalSpeed = 6) {
    const dx = tx - ball.x, dy = ty - ball.y;
    const d = Math.hypot(dx, dy), v = Math.sqrt(arrivalSpeed * arrivalSpeed + 2 * ROLL * d);
    ball.z = 0;
    ball.vx = d > EPS ? dx * v / d : 0; ball.vy = d > EPS ? dy * v / d : 0;
    ball.vz = ball.ax = ball.ay = ball.bounces = 0;
    return d > EPS ? 2 * d / (arrivalSpeed + v) : 0;
  }

  function aerial(ball, tx, ty, seconds, targetZ = 0, bend = 0) {
    const t = Math.max(.16, seconds), dx = tx - ball.x, dy = ty - ball.y;
    const d = Math.hypot(dx, dy) || 1, spread = airRange(t), curve = bendRange(t);
    ball.z = Math.max(.025, ball.z || 0);
    ball.ax = -dy / d * bend; ball.ay = dx / d * bend;
    ball.vx = (dx - ball.ax * curve) / spread;
    ball.vy = (dy - ball.ay * curve) / spread;
    ball.vz = (targetZ - ball.z) / t + .5 * G * t;
    ball.bounces = 0;
    return t;
  }

  // Both hands release above the head. Solve towards a playable height,
  // then cap launch speed in 3D: an ambitious throw can come up short.
  function overarm(ball, tx, ty, seconds, arrivalZ, speedLimit) {
    const t = aerial(ball, tx, ty, seconds, arrivalZ);
    const limit = Math.min(1, speedLimit / Math.max(EPS, Math.hypot(ball.vx, ball.vy, ball.vz)));
    ball.vx *= limit; ball.vy *= limit; ball.vz *= limit;
    const duration = Math.min(t, landingTime(ball.z, ball.vz)), reach = airRange(duration);
    return { duration, x: ball.x + ball.vx * reach, y: ball.y + ball.vy * reach };
  }

  function roll(ball, t) {
    const v = Math.hypot(ball.vx, ball.vy);
    ball.z = ball.vz = 0;
    if (v <= EPS) { ball.vx = ball.vy = 0; return; }
    const used = Math.min(t, v / ROLL), delta = v * used - .5 * ROLL * used * used;
    ball.x += ball.vx * delta / v; ball.y += ball.vy * delta / v;
    const ratio = Math.max(0, 1 - (ROLL * used) / v);
    ball.vx *= ratio; ball.vy *= ratio;
  }

  function fly(ball, t) {
    const range = airRange(t), curve = (t - range) / DRAG, decay = 1 - DRAG * range;
    const ax = ball.ax || 0, ay = ball.ay || 0;
    ball.x += ball.vx * range + ax * curve; ball.y += ball.vy * range + ay * curve;
    ball.vx = ball.vx * decay + ax * range; ball.vy = ball.vy * decay + ay * range;
    ball.z = Math.max(0, ball.z + ball.vz * t - .5 * G * t * t);
    ball.vz -= G * t;
  }

  function advance(ball, dt) {
    let left = dt, hops = 0;
    while (left > EPS && hops++ < 7) {
      if (ball.z <= EPS && ball.vz <= EPS) { roll(ball, left); return; }
      const until = landingTime(ball.z, ball.vz);
      if (until > left) { fly(ball, left); return; }
      fly(ball, until);
      left -= until;
      const impact = Math.abs(ball.vz);
      const hop = impact >= 1.65;
      ball.z = 0; ball.vz = hop ? impact * .37 : 0;
      if (hop) ball.bounces = (ball.bounces || 0) + 1;
      const retained = hop ? .74 : .92;
      ball.vx *= retained; ball.vy *= retained;
      ball.ax = ball.ay = 0;
    }
  }

  function forecast(ball, t) {
    const future = { x: ball.x, y: ball.y, z: ball.z, vx: ball.vx, vy: ball.vy, vz: ball.vz, ax: ball.ax, ay: ball.ay };
    advance(future, t);
    return future;
  }

  // Swept boundary check. x/y refers to the ball centre: the entire ball must leave.
  function firstExit(before, after, length, width, radius = RADIUS) {
    let hit = null;
    const cross = (axis, plane, line, sign) => {
      if ((after[axis] - plane) * sign < 0 || (after[axis] - before[axis]) * sign <= EPS) return;
      const fraction = Math.max(0, Math.min(1, (plane - before[axis]) / (after[axis] - before[axis])));
      if (hit && fraction >= hit.fraction) return;
      const at = k => before[k] + fraction * (after[k] - before[k]);
      hit = { axis, line, fraction, x: axis === 'x' ? plane : at('x'), y: axis === 'y' ? plane : at('y'), z: Math.max(0, at('z')) };
    };
    cross('x', -radius, 0, -1); cross('x', length + radius, length, 1);
    cross('y', -radius, 0, -1); cross('y', width + radius, width, 1);
    return hit;
  }

  const api = { G, DRAG, ROLL, RADIUS, airRange, airTime, landingTime, ground, aerial, overarm, advance, forecast, firstExit };
  global.TLPhysics = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
