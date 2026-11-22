/* A deal room, not a squad directory. Read registration history, not current valuations. */
(function (g) {
  "use strict";
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
      tab = Object.hasOwn(sets, ui.tab)
        ? ui.tab
        : sets.out[0]?.offer
          ? "out"
          : sets.in.length
            ? "in"
            : sets.out.length
              ? "out"
              : "world",
      rows = sets[tab],
      i = Math.min(Math.max(0, ui.index || 0), Math.max(0, rows.length - 1)),
      r = rows[i];
    const n =
        Object.keys(W.nations).find((k) => W.nations[k].includes(club)) ||
        s.profile.nation,
      w = g.TLMarket.windowAt(s, n),
      open = Object.values(s.bids || {}).filter(
        (b) => b.status === "open",
      ).length;
    const go = (dest, t) =>
        `<button data-life="go" data-v="${dest}">${t}</button>`,
      badge = (club, label) => {
        const letters = (club || "")
          .split(/\s+/)
          .slice(0, 2)
          .map((s) => s[0])
          .join("");
        return `<div class="tc-club"><i style="--tc-h:${g.TLData.seedFor(club || label) % 360}">${e(letters || "FC")}</i><div><small>${label}</small><strong>${e(club || "Unattached")}</strong></div></div>`;
      };
    const hero = `<header class="tc-hero">${U.art("dressing")}<div><small>FOOTBALL OPERATIONS　/　${e(n)}</small><h2>Transfer centre</h2><p>${e(club || "Independent manager")} · ${W.date(s.day)}</p></div></header><div class="tc-pulse"><div><small>Registration window</small><strong>${w.active ? "Open" : "Closed"}</strong><span>${w.active ? "Closes" : "Opens"} ${W.date(w.active ? w.close : w.open)}</span></div><div><small>Club treasury</small><strong>${club ? m(s.fund) : "No club"}</strong></div><button data-life="go" data-v="bids"><small>Negotiations</small><strong>${open} open</strong></button></div>`;
    const tabs = `<nav class="tc-tabs" aria-label="Transfer activity">${Object.entries(
      { in: "Arrivals", out: "Departures", world: "Around the leagues" },
    )
      .map(
        ([k, t]) =>
          `<button data-transfer-tab="${k}" aria-pressed="${k === tab}">${t} <b>${sets[k].length}</b></button>`,
      )
      .join("")}</nav>`;
    let story = "";
    if (r) {
      const p = W.pool.find((p) => p.id === r.id),
        name = r.name || p?.name || "Former player",
        fresh = updates.some(
          (x) => x.record?.id === r.id && x.record.day === r.day,
        ),
        amount =
          r.price == null
            ? "Undisclosed"
            : r.price === 0
              ? "No fee"
              : m(r.price),
        nav = (j, title) =>
          `<button aria-label="${j < i ? "Previous deal" : "Next deal"}" data-transfer-index="${j}" ${j < 0 || j >= rows.length ? "disabled" : ""}>${title}</button>`;
      story = `<article class="tc-story"><header><small>${tab === "world" ? "MARKET WIRE" : "CLUB DEAL ROOM"}　/　${W.date(r.day)}</small><b>${fresh ? "New · " : ""}${e(r.status)}</b></header><div class="tc-signing"><div class="tc-face">${g.TLScoutCentre.face({ id: r.id })}</div><div><small>${e(r.type)}</small><h3>${e(name)}</h3>${p ? `<span>${e(p.pos)}　·　${e(p.nation)}</span>` : ""}</div></div><div class="tc-route">${badge(r.from, "From")}${badge(r.to || (r.personal ? "Manager’s project" : null), "To")}</div><div class="tc-terms"><div><small>${r.offer ? "Offer on table" : r.type === "Loan" ? "Loan fee" : "Transfer fee"}</small><strong>${amount}</strong></div>${r.wage != null ? `<div><small>Weekly wage</small><strong>${m(r.wage)}</strong></div>` : ""}${r.pending || r.offer ? `<div><small>${r.offer ? "Reply by" : "Registration due"}</small><strong>${W.date(r.deadline ?? r.due)}</strong></div>` : ""}</div><footer>${r.offer ? go("bids", "Review offer") : p ? `<button ${s.roster.includes(p.id) ? "data-squad-player" : "data-league-player"}="${e(p.id)}">Player file</button>` : ""}<nav aria-label="Browse deals">${nav(i - 1, "Previous")}<span>${i + 1} / ${rows.length}</span>${nav(i + 1, "Next")}</nav></footer></article>`;
    } else
      story = `<article class="tc-empty"><small>DEAL ROOM</small><h3>${tab === "out" ? "No departures yet" : tab === "in" ? "No arrivals yet" : "The wire is quiet"}</h3><p>${tab === "in" ? "Scout a player or make an approach. Agreed deals will appear here before registration." : tab === "out" ? "Offers for your players, sales and loan returns appear here." : "Confirmed moves will appear as clubs do business."}</p>${go(tab === "out" ? "squad" : "scouting", tab === "out" ? "View squad" : "Open scouting")}</article>`;
    const payroll = Object.values(s.contracts || {}).reduce((n, c) => n + (c.wage || 0), 0);
    const squadValue = (W.pool || []).filter((p) => (s.roster || []).includes(p.id)).reduce((n, p) => n + (p.value || 0), 0);
    const business = `<div class="cp-kpis tc-business">${[["Squad value", club ? m(squadValue) : "–", `${(s.roster || []).length} players`], ["Wage bill", payroll ? `${m(payroll)}/wk` : "No wages", `${Object.keys(s.contracts || {}).length} contracts`], ["Transfer budget", club ? m(s.fund) : "No club", "Club funds, not your wallet"], ["Window", w.active ? "Open" : "Closed", w.active ? `${Math.max(0, w.close - s.day)} days left` : `Opens ${W.date(w.open)}`]].map(([label, value, note]) => `<div><small>${e(label)}</small><b>${e(value)}</b><em>${e(note)}</em></div>`).join("")}</div>`;
    const list = rows.length ? `<article class="org-agenda tc-list"><h3>${e({ in: "Arrivals", out: "Departures", world: "Around the leagues" }[tab])} · ${rows.length}</h3>${rows.slice(0, 12).map((row, index) => `<button class="tc-row${index === i ? " tc-row-on" : ""}" data-transfer-index="${index}" aria-pressed="${index === i}"><span>${e(row.player?.name || row.name || "Unnamed player")}</span><small>${e(row.headline || row.status || row.club || "")}</small><em>${row.fee != null ? m(row.fee) : ""}</em></button>`).join("")}${rows.length > 12 ? `<p class="cp-muted">${rows.length - 12} more in this list. Use the arrows on the deal card to step through them.</p>` : ""}</article>` : "";
    return `<section class="tc-centre">${hero}${business}${tabs}<div class="tc-layout"><div>${story}</div>${list}</div><div class="tc-links">${go("scouting", "Scout players")} ${go("squad", "Manage squad")} ${go("bids", "Transfer talks")}</div></section>`;
  }
  const api = { deals, render };
  g.TLTransferCentre = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window === "undefined" ? globalThis : window);
