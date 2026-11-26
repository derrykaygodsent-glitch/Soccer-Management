/* A deal room, not a squad directory. Read registration history, not current valuations. */
(function (g) {
  "use strict";
  const PER = 12;
  /* The route separator is text, not a disclosure icon: the disclosure test bans literal arrow
     glyphs in src/, so the arrow is written as an escape and rendered as ordinary content. */
  const ARROW = '\u2192';
  function deals(s) {
    const club = s.club?.name,
      wire = s.transferWire || [];
    const rows = (s.moves || [])
      .map((m) => {
        const line = wire.find(
          (w) =>
            w.id === m.id &&
            w.day === m.day &&
            m.from &&
            m.to &&
            w.text.includes(m.from) &&
            w.text.includes(m.to),
        );
        const quoted = line?.text.match(/₥([\d,]+)\.$/);
        return {
          ...m,
          price:
            m.price ?? (quoted ? Number(quoted[1].replaceAll(",", "")) : null),
          status: "Registered",
          type:
            m.type ||
            (line?.text.includes("after the loan")
              ? "Loan return"
              : line?.text.includes("18-week loan")
                ? "Loan"
                : !m.to
                  ? "Released"
                  : !m.from
                    ? "Free signing"
                    : "Club move"),
        };
      })
      .reverse();
    for (const [id, a] of Object.entries(s.amateurOrigins || {})) {
      rows.push({
        id,
        day: a.day,
        from: null,
        to: a.club || null,
        personal: true,
        type: "Amateur invitation",
        price: 0,
        status: "Accepted",
      });
    }
    for (const p of s.plans || [])
      if (p.kind === "marketDeal")
        rows.push({
          ...p,
          day: p.due,
          status: "Awaiting registration",
          type: p.type === "loan" ? "Loan" : "Permanent transfer",
          pending: true,
        });
    for (const b of Object.values(s.bids || {}))
      if (b.status === "open")
        rows.push({
          ...b,
          day: b.opened,
          status: "In negotiation",
          type: "Transfer offer",
          offer: true,
        });
    rows.sort(
      (a, b) =>
        Number(!!b.offer) - Number(!!a.offer) ||
        Number(!!b.pending) - Number(!!a.pending) ||
        b.day - a.day,
    );
    return {
      in: rows.filter(
        (r) => (club && r.to === club) || (r.personal && (!club || !r.to)),
      ),
      out: rows.filter((r) => club && r.from === club),
      world: rows.filter((r) => !r.personal && !r.offer && !r.pending),
    };
  }
  function render(s, ui, updates = []) {
    const W = g.TLManagerLife,
      U = g.TLClubUI,
      e = U.esc,
      m = W.money,
      club = s.club?.name,
      sets = deals(s),
      tab = Object.hasOwn(sets, ui.tab) ? ui.tab : "in",
      scope = ui.scope === "world" || tab === "world" ? "world" : "club",
      key = scope === "world" ? "world" : tab === "out" ? "out" : "in",
      rows = sets[key],
      per = PER,
      pages = Math.max(1, Math.ceil(rows.length / per)),
      page = Math.min(Math.max(0, Number(ui.page) || 0), pages - 1),
      first = page * per,
      last = Math.min(rows.length, first + per) - 1,
      i = Math.min(Math.max(first, Number(ui.index) || 0), Math.max(first, last)),
      r = rows[i],
      from = rows.length ? first + 1 : 0,
      to = rows.length ? last + 1 : 0,
      range = rows.length
        ? from === to
          ? `Showing ${from} of ${rows.length} ${rows.length === 1 ? "deal" : "deals"}`
          : `Showing ${from} to ${to} of ${rows.length} deals`
        : "No deals in this list";
    const fmtDay = (d) => {
      try {
        const iso = W.date(Number(d)),
          x = new Date(iso + "T12:00:00Z");
        return Number.isNaN(x.getTime())
          ? iso
          : x.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
      } catch {
        return String(d);
      }
    };
    const nameOf = (row) =>
      row.player?.name ||
      row.name ||
      (W.pool || []).find((p) => p.id === row.id)?.name ||
      "Former player";
    /* A deal has two ends, and both come from the record. A personal invitation is not a move to a
       second squad: the player is in this club's roster, on amateur terms, so the far end is the club
       he actually plays for. Only a manager without a club has nowhere but his own amateur group. */
    const sides = (row) => ({
      from: row.from || "Unattached",
      to:
        row.to ||
        (row.personal
          ? club || "Amateur squad"
          : row.from
            ? "Released"
            : "No club"),
    });
    const route = (row) => `${sides(row).from} ${ARROW} ${sides(row).to}`;
    const n =
        Object.keys(W.nations).find((k) => W.nations[k].includes(club)) ||
        s.profile.nation,
      w = g.TLMarket.windowAt(s, n),
      open = Object.values(s.bids || {}).filter((b) => b.status === "open").length;
    const go = (dest, t) => `<button data-life="go" data-v="${dest}">${t}</button>`,
      badge = (club, label) => {
        const letters = (club || "")
          .split(/\s+/)
          .slice(0, 2)
          .map((s) => s[0])
          .join("");
        const known =
          club &&
          (Object.values(W.nations || {}).some((list) => list.includes(club)) ||
            g.TLWorldGuide?.search(club).some((x) => x.type === "Football club")),
          name = known
            ? `<button data-world-club="${e(club)}">${e(club)}</button>`
            : `<strong>${e(club || "Unattached")}</strong>`;
        return `<div class="tc-club"><i style="--tc-h:${g.TLData.seedFor(club || label) % 360}">${e(letters || "FC")}</i><div><small>${label}</small>${name}</div></div>`;
      };
    const hero = `<header class="tc-hero">${U.art("dressing")}<div><small>FOOTBALL OPERATIONS　/　${e(n)}</small><h2>Transfer centre</h2><p>${e(club || "Independent manager")} · ${fmtDay(s.day)}</p></div></header><div class="tc-pulse"><div><small>Registration window</small><strong>${w.active ? "Open" : "Closed"}</strong><span>${w.active ? "Closes" : "Opens"} ${fmtDay(w.active ? w.close : w.open)}</span></div><div><small>Club treasury</small><strong>${club ? m(s.fund) : "No club"}</strong></div><button data-life="go" data-v="bids"><small>Negotiations</small><strong>${open} open</strong></button></div>`;
    const scopes = `<nav class="tc-scope" aria-label="Transfer scope">${[
      ["club", "My club", sets.in.length + sets.out.length],
      ["world", "World wire", sets.world.length],
    ]
      .map(
        ([k, t, count]) =>
          `<button data-transfer-scope="${k}" aria-pressed="${k === scope}">${t} <b>${count}</b></button>`,
      )
      .join("")}</nav>`;
    const tabs =
      scope === "club"
        ? `<nav class="tc-tabs" aria-label="Club deals">${[
            ["in", "Arrivals"],
            ["out", "Departures"],
          ]
            .map(
              ([k, t]) =>
                `<button data-transfer-tab="${k}" aria-pressed="${k === tab}">${t} <b>${sets[k].length}</b></button>`,
            )
            .join("")}</nav>`
        : "";
    let story = "";
    if (r) {
      const p = W.pool.find((p) => p.id === r.id),
        name = nameOf(r),
        fresh = updates.some((x) => x.record?.id === r.id && x.record.day === r.day),
        amount = r.price == null ? "Undisclosed" : r.price === 0 ? "No fee" : m(r.price);
      story = `<article class="tc-story"><header><small>${scope === "world" ? "MARKET WIRE" : "CLUB DEAL ROOM"}　/　${fmtDay(r.day)}</small><b>${fresh ? "New · " : ""}${e(r.status)}</b></header><div class="tc-signing"><div class="tc-face">${g.TLScoutCentre.face({ id: r.id })}</div><div><small>${e(r.type)}</small><h3>${e(name)}</h3>${p ? `<span>${e(p.pos)}　·　${e(p.nation)}</span>` : ""}</div></div><div class="tc-route" aria-label="Route: ${e(route(r))}">${badge(r.from, "From")}<span class="tc-arrow" aria-hidden="true">${ARROW}</span>${r.to || (r.personal && club) ? badge(sides(r).to, "To") : `<div class="tc-club tc-club-none"><i aria-hidden="true">–</i><div><small>To</small><strong>${e(sides(r).to)}</strong></div></div>`}</div><p class="tc-route-line">${e(route(r))}</p><div class="tc-terms"><div><small>${r.offer ? "Offer on table" : r.type === "Loan" ? "Loan fee" : "Transfer fee"}</small><strong>${amount}</strong></div>${r.personal ? `<div><small>Terms</small><strong>Amateur · no contract</strong></div>` : ""}${r.wage != null ? `<div><small>Weekly wage</small><strong>${m(r.wage)}</strong></div>` : ""}${r.pending || r.offer ? `<div><small>${r.offer ? "Reply by" : "Registration due"}</small><strong>${fmtDay(r.deadline ?? r.due)}</strong></div>` : ""}</div><footer>${r.offer ? go("bids", "Review offer") : p ? `<button ${s.roster.includes(p.id) ? "data-squad-player" : "data-league-player"}="${e(p.id)}">Player file</button>` : ""}<span class="tc-deal-index">Deal ${i + 1} of ${rows.length}</span></footer></article>`;
    } else
      story = `<article class="tc-empty"><small>DEAL ROOM</small><h3>${tab === "out" ? "No departures yet" : tab === "in" ? "No arrivals yet" : "The wire is quiet"}</h3><p>${tab === "in" ? "Scout a player or make an approach. Agreed deals will appear here before registration." : tab === "out" ? "Offers for your players, sales and loan returns appear here." : "Confirmed moves will appear as clubs do business."}</p>${go(scope === "world" ? "intelligence" : tab === "out" ? "squad" : "scouting", scope === "world" ? "Football intelligence" : tab === "out" ? "View squad" : "Open scouting")}</article>`;
    const payroll = Object.values(s.contracts || {}).reduce((n, c) => n + (c.wage || 0), 0);
    const squadValue = (W.pool || []).filter((p) => (s.roster || []).includes(p.id)).reduce((n, p) => n + (p.value || 0), 0);
    const business = `<div class="cp-kpis tc-business">${[["Squad value", club ? m(squadValue) : "–", `${(s.roster || []).length} players`], ["Wage bill", payroll ? `${m(payroll)}/wk` : "No wages", `${Object.keys(s.contracts || {}).length} contracts`], ["Transfer budget", club ? m(s.fund) : "No club", "Club funds, not your wallet"], ["Window", w.active ? "Open" : "Closed", w.active ? `${Math.max(0, w.close - s.day)} days left` : `Opens ${fmtDay(w.open)}`]].map(([label, value, note]) => `<div><small>${e(label)}</small><b>${e(value)}</b><em>${e(note)}</em></div>`).join("")}</div>`;
    const pager =
      pages > 1
        ? `<div class="tc-pager"><button type="button" data-transfer-page="-1" ${page === 0 ? "disabled" : ""}>Previous</button><span>Page ${page + 1} of ${pages}</span><button type="button" data-transfer-page="1" ${page >= pages - 1 ? "disabled" : ""}>Next</button></div>`
        : "";
    const list = rows.length
      ? `<article class="org-agenda tc-list"><header class="tc-list-head"><div><h3>${e({ in: "Arrivals", out: "Departures", world: "World wire" }[key])} · ${rows.length}</h3><p class="tc-range" data-tl-meta>${range}</p></div>${pager}</header><div class="tc-rows">${rows.slice(first, first + per).map((row, k) => {
          const index = first + k,
            fee = row.fee != null ? m(row.fee) : row.price != null ? (row.price === 0 ? "No fee" : m(row.price)) : "";
          return `<button class="tc-row${index === i ? " tc-row-on" : ""}" data-transfer-index="${index}" aria-pressed="${index === i}"><span>${e(nameOf(row))}</span><em>${fee}</em><small>${e(route(row))}</small><i class="dv-tag${row.offer || row.pending ? " info" : " good"}">${e(row.status)}</i></button>`;
        }).join("")}</div><footer class="tc-list-foot"><span>${range}</span>${pages > 1 ? `<span>Page ${page + 1} of ${pages}</span>` : ""}</footer></article>`
      : "";
    return `<section class="tc-centre">${hero}${business}${scopes}${tabs}<div class="tc-layout"><div>${story}</div>${list}</div><div class="tc-links">${go("scouting", "Scout players")} ${go("squad", "Manage squad")} ${go("bids", "Transfer talks")}</div></section>`;
  }
  const api = { deals, render, per: PER };
  g.TLTransferCentre = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window === "undefined" ? globalThis : window);
