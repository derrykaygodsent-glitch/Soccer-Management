/* Evidence-backed, rolling club-identity signals derived from completed seasons. */
(function (g) {
  'use strict';

  const WINDOW = 5;
  const styles = ['press', 'counter', 'possession', 'direct', 'defend', 'attack'];
  const validStyle = value => styles.includes(value) ? value : null;
  const bounded = (n, low, high) => Math.max(low, Math.min(high, Number(n) || 0));

  function snapshot(year, club, evidence, transfers = []) {
    const squad = Array.isArray(evidence?.players) ? evidence.players : [];
    let totalStarts = 0, youthStarts = 0;
    for (const player of squad) {
      const starts = Math.max(0, Number(player.appearances) || 0);
      totalStarts += starts;
      if (Number(player.age) <= 21 || Number(player.intakeYear) >= year - 3) youthStarts += starts;
    }
    let arrivals = 0, departures = 0, netSpend = 0;
    for (const move of transfers) {
      if (move.day < evidence.startDay || move.day > evidence.endDay || move.type !== 'Permanent transfer') continue;
      const price = Math.max(0, Number(move.price) || 0);
      if (move.to === club) { arrivals++; netSpend += price; }
      if (move.from === club) { departures++; netSpend -= price; }
    }
    return {
      year, coachStyle: validStyle(evidence?.style),
      squadSize: squad.length, totalStarts, youthStarts,
      youthStartShare: totalStarts ? youthStarts / totalStarts : 0,
      permanentArrivals: arrivals, permanentDepartures: departures, netSpend,
    };
  }

  function profile(seasons = []) {
    const rows = seasons.slice(-WINDOW), stylesBySeason = new Map();
    for (const row of rows) if (row.coachStyle) stylesBySeason.set(row.coachStyle, (stylesBySeason.get(row.coachStyle) || 0) + 1);
    const styleEntries = [...stylesBySeason.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const youthStarts = rows.reduce((n, row) => n + row.youthStarts, 0);
    const totalStarts = rows.reduce((n, row) => n + row.totalStarts, 0);
    return {
      seasonsObserved: rows.length,
      recurringStyle: rows.length >= 3 && styleEntries[0]?.[1] >= 3 ? styleEntries[0][0] : null,
      styleSeasons: styleEntries[0]?.[1] || 0,
      youthStartShare: totalStarts ? youthStarts / totalStarts : 0,
      youthPathwayEstablished: rows.length >= 3 && totalStarts > 0 && youthStarts / totalStarts >= .2,
      permanentArrivals: rows.reduce((n, row) => n + row.permanentArrivals, 0),
      permanentDepartures: rows.reduce((n, row) => n + row.permanentDepartures, 0),
      netSpend: rows.reduce((n, row) => n + row.netSpend, 0),
    };
  }

  function update(state, year, evidenceByClub, transfers = []) {
    const all = state.clubWorldHistory || (state.clubWorldHistory = {});
    const keys = Object.keys(evidenceByClub || {}).sort();
    for (const club of keys) {
      const evidence = evidenceByClub[club] || {};
      const history = (all[club]?.seasons || []).filter(row => row.year !== year);
      history.push(snapshot(year, club, evidence, transfers));
      history.sort((a, b) => a.year - b.year);
      const seasons = history.slice(-WINDOW);
      all[club] = { seasons, identity: profile(seasons) };
    }
    return all;
  }

  const api = { snapshot, profile, update, WINDOW };
  g.TLClubWorldHistory = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
