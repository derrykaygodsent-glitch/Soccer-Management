/* Bounded half-time decisions for AI managers. Traits are stable per manager. */
(function (global) {
  'use strict';

  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const rating = (value, fallback = 3) => Number.isFinite(value) ? clamp(Math.round(value), 1, 5) : fallback;
  const intensityLever = style => {
    if (style === 'press' || style === 'balanced' || style === 'attack') return 'press';
    if (style === 'defend') return 'line';
    return 'tempo';
  };

  function halfTimePlan({ style = 'balanced', tactics = {}, goalsFor = 0, goalsAgainst = 0, adaptability = 3, riskTolerance = 3, xgFor = 0, xgAgainst = 0, shotsFor = 0, shotsAgainst = 0 } = {}) {
    const goalDifference = goalsFor - goalsAgainst;
    const change = {}, reasons = [];
    const mentality = Number.isFinite(tactics.mentality) ? tactics.mentality : 2;
    const adaptabilityRating = rating(adaptability);
    const riskRating = rating(riskTolerance);
    const lever = intensityLever(style);
    const currentLever = Number.isFinite(tactics[lever]) ? tactics[lever] : 1;

    if (goalDifference < 0) {
      const deficit = -goalDifference;
      // Low-adaptability coaches wait for a clearer problem; the more adaptable
      // ones will make a measured response after falling one goal behind.
      if (deficit >= (adaptabilityRating <= 2 ? 2 : 1)) {
        if (mentality < 4) change.mentality = mentality + 1;
        // A risk-tolerant or highly adaptable manager is more willing to add a
        // style-consistent second lever when chasing a multi-goal deficit.
        if (deficit >= 2 && riskRating + adaptabilityRating >= 7 && currentLever < 2) change[lever] = currentLever + 1;
        reasons.push(`Trailing by ${deficit} at half-time: ${lever === 'press' ? 'increase the press' : lever === 'line' ? 'raise the defensive line' : 'play with more tempo'} while keeping the preferred shape.`);
      }
    } else if (goalDifference > 0) {
      // Protecting a lead is itself a risk preference. Cautious managers act
      // earlier; more adventurous managers wait for a larger cushion.
      const lead = goalDifference;
      const protectAt = riskRating >= 4 ? 3 : 2;
      if (lead >= protectAt && (adaptabilityRating > 1 || lead >= 3)) {
        if (mentality > 0) change.mentality = mentality - 1;
        if (riskRating <= 2 && currentLever > 0) change[lever] = currentLever - 1;
        if (Object.keys(change).length) reasons.push(`Leading by ${lead} at half-time: ${riskRating <= 2 ? `reduce ${lever === 'press' ? 'pressing intensity' : lever === 'line' ? 'the defensive line' : 'tempo'} and manage the advantage` : 'lower the overall risk while retaining the preferred intensity'}.`);
      }
    }

    // Respond to sustained chance pressure, not just the score. Better-adapting
    // managers need less evidence before asking the back line to protect space.
    const pressureGap = (Number(shotsAgainst) >= 0 ? Number(shotsAgainst) : 0) >= (adaptabilityRating <= 2 ? 4 : 2)
      && (Number(xgAgainst) - Number(xgFor)) >= (adaptabilityRating <= 2 ? .7 : .45);
    const line = Number.isFinite(tactics.line) ? tactics.line : 1;
    if (pressureGap) {
      if (change.line == null && line > 0) {
        change.line = line - 1;
        reasons.push(`The opposition created more first-half danger (${Number(xgAgainst).toFixed(2)} to ${Number(xgFor).toFixed(2)} xG): drop the line to protect space.`);
      }
      if (riskRating <= 2 && change.press == null && Number.isFinite(tactics.press) && tactics.press > 0) {
        change.press = tactics.press - 1;
        reasons.push(`The opposition created more first-half danger (${Number(xgAgainst).toFixed(2)} to ${Number(xgFor).toFixed(2)} xG): ease pressing intensity to protect space.`);
      }
    }

    if (!Object.keys(change).length) return null;
    return { change, reason: reasons.join(' ') };
  }

  function inPlayPlan({ ownTactics = {}, opponentTactics = {}, opponentRoles = [], flankObservations = {}, adaptability = 3, riskTolerance = 3 } = {}) {
    const adaptive = rating(adaptability), risk = rating(riskTolerance);
    if (adaptive <= 1) return null;
    const change = {}, reasons = [];
    const pressure = Number(opponentTactics.press ?? 1), line = Number(opponentTactics.line ?? 1);
    const formDefenders = Number.parseInt(String(opponentTactics.formation || '').split('-')[0], 10) || 0;
    const centralDefenders = opponentRoles.filter(role => role === 'DC').length;
    const backFive = Math.max(formDefenders, opponentRoles.filter(role => ['DC', 'FB', 'WB'].includes(role)).length) >= 5;
    const threeCentreBacks = centralDefenders >= 3;

    if ((pressure >= 2 && line >= 1 || line >= 2) && Number(ownTactics.passing ?? 1) < 2) {
      change.passing = 2;
      reasons.push('The opposition are pressing high: use more direct passing to get beyond their first line.');
      if (line >= 2 && risk >= 4 && Number(ownTactics.tempo ?? 1) < 2) {
        change.tempo = 2;
        reasons.push('Their high line also leaves space to attack quickly.');
      }
    }
    let focusFlank = null;
    const flankEvidence = ['left', 'right'].map(side => {
      const observation = flankObservations[side] || {};
      return { side, samples: Math.max(0, Number(observation.samples) || 0), gap: Math.max(0, Number(observation.averageGap) || 0) };
    }).filter(item => item.samples >= Math.max(3, 7 - adaptive) && item.gap >= 13)
      .sort((a, b) => b.gap - a.gap || b.samples - a.samples);
    if (flankEvidence.length) {
      focusFlank = flankEvidence[0].side;
      if (Number(ownTactics.width ?? 1) < 2) {
        change.width = 2;
        reasons.push(`Repeated advanced carries expose space on the opposition’s ${focusFlank} flank (${flankEvidence[0].samples} observations; nearest cover averaging ${flankEvidence[0].gap.toFixed(1)} units away): attack that channel and stretch their defensive line.`);
      }
    }
    if ((line <= 0 && pressure <= 1 || backFive || threeCentreBacks) && Number(ownTactics.width ?? 1) < 2) {
      change.width = 2;
      reasons.push(backFive || threeCentreBacks
        ? 'The opposition are defending with a crowded back line: stretch the pitch to create wider routes.'
        : 'The opposition are sitting deep: stretch the pitch to open wider routes.');
    }
    if (!Object.keys(change).length) return null;
    return { change, reason: reasons.join(' '), opponentShape: opponentTactics.formation || 'their current shape', focusFlank };
  }

  function halfTimeSubstitution({ slots = [], bench = [], subsUsed = 0, adaptability = 3, riskTolerance = 3, roleFit = () => 1, roleScore = () => 0 } = {}) {
    if (subsUsed >= 5 || !bench.length) return null;
    const adaptive = rating(adaptability), risk = rating(riskTolerance);
    const fatigueLimit = clamp(.48 + (3 - risk) * .025 + (adaptive - 3) * .01, .39, .56);
    const candidates = [];
    for (const [index, slot] of slots.entries()) {
      const player = slot.player;
      if (!player?.onPitch || player.red) continue;
      const injured = Number(player.injury) > 0;
      const limit = fatigueLimit - (slot.role === 'GK' ? .14 : 0);
      if (!injured && (!(player.cond < limit) || slot.role === 'GK')) continue;
      const replacements = bench.map(replacement => {
        if (!replacement || replacement.onPitch || replacement.red || replacement.subbedOff || replacement.subbedOn) return null;
        if ((slot.role === 'GK') !== (replacement.pos === 'GK')) return null;
        const fit = roleFit(replacement.pos, slot.role);
        if (!Number.isFinite(fit) || fit < .65) return null;
        if (!injured && (replacement.cond ?? 1) < (player.cond ?? 1) + .08) return null;
        const score = roleScore(replacement, slot.role) * fit + fit * 18 + (replacement.cond ?? 1) * 4;
        return { replacement, fit, score };
      }).filter(Boolean).sort((a, b) => b.score - a.score || String(a.replacement.id).localeCompare(String(b.replacement.id)));
      if (!replacements.length) continue;
      const urgency = injured ? 100 + Math.min(10, Number(player.injury) || 0) : 40 + (limit - player.cond) * 100;
      candidates.push({ slot, player, index, injured, urgency, replacement: replacements[0] });
    }
    candidates.sort((a, b) => b.urgency - a.urgency || a.index - b.index);
    const chosen = candidates[0];
    if (!chosen) return null;
    const reason = chosen.injured
      ? `Replace ${chosen.player.name} after the injury assessment.`
      : `Replace ${chosen.player.name} to manage low condition (${Math.round(chosen.player.cond * 100)}%).`;
    return { outId: chosen.player.id, inId: chosen.replacement.replacement.id, playerName: chosen.player.name, replacementName: chosen.replacement.replacement.name, role: chosen.slot.role, reason };
  }

  const api = { halfTimePlan, inPlayPlan, halfTimeSubstitution };
  global.TLManagerMatchAI = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
