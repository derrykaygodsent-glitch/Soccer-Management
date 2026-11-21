/* Professional competitions above the local district circuit. Results derive from the save,
   season and fixture, so reopening an old table never rerolls a result. */
(function (g) {
  "use strict";
  const D = g.TLData || require("./data"),
    Y = g.TLTurnover || require("./season-turnover");
  const specs = {
    Valdoria: [
      "Crown Premier League",
      "Alderford|Bracken|Highmoor|Kingsport|Northwick|Stoneleigh|Eastmere|Redbourne|Fenwick|Westhaven",
      "United",
      "Athletic",
    ],
    Estavelle: [
      "Ligue des Cités",
      "Beaulac|Vallon|Rochefort|Clairmont|Montbrun|Chantilly|Belrive|Port Doré|Vernay|Lacourt",
      "Sporting",
      "Olympique",
    ],
    Caldria: [
      "Liga del Sol",
      "Puerto Luna|Santa Alba|Villa Real|Monte Oro|Sierra Azul|Costa Luz|Valle Verde|Mirador|San León|Río Claro",
      "Deportivo",
      "Atlético",
    ],
    Monteluce: [
      "Serie Aurea",
      "Portofino|Colleverde|San Luca|Valdoro|Borgoforte|Altoriva|Castelnero|Villachiara|Roccapiana|Pietraluce",
      "Calcio",
      "Virtus",
    ],
  };
  const names = Object.keys(specs),
    teams = (n) =>
      specs[n][1]
        .split("|")
        .flatMap((t) => specs[n].slice(2).map((s) => t + " " + s));
  function pairs(field) {
    const ring = [...field],
      rounds = [];
    for (let r = 0; r < ring.length - 1; r++) {
      const games = [];
      for (let i = 0; i < ring.length / 2; i++) {
        const a = ring[i],
          b = ring[ring.length - 1 - i];
        games.push(r % 2 ? [b, a] : [a, b]);
      }
      rounds.push(games);
      ring.splice(1, 0, ring.pop());
    }
    return rounds;
  }
  function result(seed, a, b) {
    const rng = D.mulberry32(D.seedFor(seed)),
      power = (c) => (D.seedFor(c) % 101) / 1000;
    return [a, b].map((c, i) =>
      Array.from(
        { length: 6 },
        () => +(rng() < 0.17 + power(c) + (i ? 0 : 0.04)),
      ).reduce((x, y) => x + y),
    );
  }
  function table(field, games) {
    const rows = new Map(
      field.map((name) => [name, { name, p: 0, pts: 0, gf: 0, gd: 0 }]),
    );
    for (const { a, b, score } of games) {
      if (!score) continue;
      for (const [i, c] of [a, b].entries()) {
        const r = rows.get(c),
          d = score[i] - score[1 - i];
        r.p++;
        r.gd += d;
        r.gf += score[i];
        r.pts += d > 0 ? 3 : d === 0 ? 1 : 0;
      }
    }
    return [...rows.values()].sort(
      (a, b) =>
        b.pts - a.pts ||
        b.gd - a.gd ||
        b.gf - a.gf ||
        a.name.localeCompare(b.name),
    );
  }
  function league(s, n, y, through = s.day) {
    const field = teams(n),
      rounds = pairs(field),
      start = Y.dayOf(y, 7, 8),
      games = [];
    for (let r = 0; r < 38; r++)
      for (const pair of rounds[r % 19]) {
        const [a, b] = r < 19 ? pair : [pair[1], pair[0]],
          day = start + r * 7;
        games.push({
          a,
          b,
          day,
          score:
            day < through
              ? result([s.id, y, n, r, a, b].join("|"), a, b)
              : null,
        });
      }
    return { games, rows: table(field, games) };
  }
  function cup(s, y) {
    const pots = names.map((n) =>
      league(s, n, y - 1, Y.dayOf(y, 6, 1)).rows.slice(0, 4),
    );
    const groups = [],
      knockouts = [],
      start = Y.dayOf(y, 8, 15);
    for (let i = 0; i < 4; i++) {
      const field = pots.map((pot, j) => pot[(i + j) % 4].name),
        games = [];
      for (const [r, round] of pairs(field).entries())
        for (const [a, b] of round) {
          const day = start + r * 14;
          games.push({
            a,
            b,
            day,
            score:
              day < s.day
                ? result([s.id, y, "groups", a, b].join("|"), a, b)
                : null,
          });
        }
      groups.push({ games, rows: table(field, games) });
    }
    let field = groups.every((q) => q.games.every((f) => f.score))
      ? [0, 1, 2, 3].flatMap((i) => [
          groups[i].rows[0].name,
          groups[i ^ 1].rows[1].name,
        ])
      : [];
    for (let r = 0; field.length > 1; r++) {
      const round = [],
        next = [],
        day = Y.dayOf(y + 1, 2 + r, 10);
      for (let j = 0; j < field.length; j += 2) {
        const a = field[j],
          b = field[j + 1],
          key = [s.id, y, "finals", a, b].join("|"),
          score = day < s.day ? result(key, a, b) : null,
          tied = score && score[0] === score[1],
          winner = score
            ? tied
              ? D.seedFor(key + "pens") % 2
                ? b
                : a
              : score[0] > score[1]
                ? a
                : b
            : null;
        round.push({ a, b, score, day, winner, tied });
        if (winner) next.push(winner);
      }
      knockouts.push(round);
      field = next;
    }
    return { groups, knockouts, winner: field.length === 1 ? field[0] : null };
  }
  function render(s, n) {
    n = names.includes(n) ? n : names[0];
    const y = Y.season(s.day),
      l = league(s, n, y),
      c = cup(s, y),
      e = g.TLClubUI.esc,
      date = g.TLManagerLife.date,
      stand = (rs) =>
        `<table><thead><tr><th>#</th><th>Club</th><th>P</th><th>GD</th><th>Pts</th></tr></thead><tbody>${rs.map((r, i) => `<tr><td>${i + 1}</td><th>${e(r.name)}</th><td>${r.p}</td><td>${r.gd}</td><td>${r.pts}</td></tr>`).join("")}</tbody></table>`,
      game = (f) =>
        `<p><small>${date(f.day)}</small>　${e(f.a)} <b>${f.score?.join("–") || "v"}</b> ${e(f.b)}${f.tied ? " · " + e(f.winner) + " on penalties" : ""}</p>`;
    return `<section class="org-agenda major-board"><small>EUROPA　 /　 PROFESSIONAL FOOTBALL　 /　 ${y}–${y + 1}</small><h2>${specs[n][0]}</h2><p>20 clubs · 38 matchdays · the top four qualify for next season’s Europa Masters Cup.</p><nav>${names.map((k) => `<button data-major="${k}" aria-pressed="${k === n}">${specs[k][0]}</button>`).join("")}</nav>${stand(l.rows)}<details><summary>League fixtures & results</summary>${Array.from(
      { length: 38 },
      (_, i) =>
        `<details><summary>Matchday ${i + 1} · ${date(l.games[i * 10].day)}</summary>${l.games
          .slice(i * 10, i * 10 + 10)
          .map(game)
          .join("")}</details>`,
    ).join(
      "",
    )}</details><h2>Europa Masters Cup</h2><p>Four groups of four. The top two advance to the quarter-finals.</p>${c.groups.map((q, i) => `<details><summary>Group ${"ABCD"[i]}</summary>${stand(q.rows)}${q.games.map(game).join("")}</details>`).join("")}${c.knockouts.map((r, i) => `<h3>${["Quarter-finals", "Semi-finals", "Final"][i]}</h3>${r.map(game).join("")}`).join("")}${c.winner ? `<strong>Champions · ${e(c.winner)}</strong>` : ""}</section>`;
  }
  const api = { names, teams, league, cup, render };
  g.TLMajorLeagues = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window === "undefined" ? globalThis : window);
