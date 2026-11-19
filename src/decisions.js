/* Touchline 26: read the situation, then choose among sound football options. */
(function (global) {
  'use strict';
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  function profile(player, identity) {
    const a = player.attrs;
    const tilt = i => ((identity >>> i) & 7) / 7 - .5;
    return {
      vision: clamp(a.passing * .53 + a.positioning * .23 + a.composure * .24 + tilt(3) * 2.2, 3, 20),
      risk: clamp((a.aggression - 12) * .012 + tilt(11) * .09, -.15, .15),
      carry: clamp((a.dribbling - a.passing) * .014 + tilt(17) * .085, -.15, .15),
      finish: clamp((a.shooting - 12) * .013 + tilt(23) * .085, -.13, .13)
    };
  }

  function facing(player, dx, dy) {
    return (Math.cos(player.dir) * dx + Math.sin(player.dir) * dy) / (Math.hypot(dx, dy) || 1);
  }

  function readDelay(player, look, squeeze) {
    return clamp(.53 - (player.reading.vision - 12) * .048 + (1 - look) * .26 + squeeze * .27 + (1 - player.cond) * .26, .16, 1.38);
  }

  function gameNeed(score, minute) {
    // A small bias, not a scripted late chance or a forced tactical switch.
    const late = clamp((minute - 55) / 28, 0, 1);
    return score < 0 ? late * (score < -1 ? .85 : 1) : score > 0 ? -.8 * late : 0;
  }

  function prefer(candidates, random, margin) {
    if (candidates.length <= 1) return candidates[0];
    const best = Math.max(...candidates.map(c => c.score));
    const plausible = candidates.filter(c => best - c.score < margin);
    if (plausible.length === 1) return plausible[0];
    const weights = plausible.map(c => (1 - (best - c.score) / margin) ** 2.45);
    let roll = random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < plausible.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return plausible[i];
    }
    return plausible.at(-1);
  }

  function pick(candidates, random, gap) {
    const groups = new Map();
    // A team with eight outlets is not eight times as likely to pass. First
    // compare the best option in each family; then choose an outlet within it.
    for (const option of candidates) {
      if (!Number.isFinite(option.score)) continue;
      if (!groups.has(option.kind)) groups.set(option.kind, []);
      groups.get(option.kind).push(option);
    }
    const kinds = [];
    for (const group of groups.values()) {
      group.sort((a, b) => b.score - a.score);
      kinds.push({ score: group[0].score, group });
    }
    const choice = prefer(kinds, random, gap);
    return choice && prefer(choice.group.slice(0, 4), random, gap * .9);
  }

  const api = { profile, facing, readDelay, gameNeed, pick };
  global.TLDecisions = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
