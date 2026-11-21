/* Read receipts belong to a career. Opening a desk acknowledges its updates, not its mail or decisions. */
(function (g) {
  "use strict";
  function updates(s) {
    const groups = {},
      add = (desk, id) => {
        (groups[desk] ||= new Set()).add(String(id));
      };
    s.mail.forEach((m, i) =>
      add(g.TLOfficeOrganiser.classify(m)[3], "post:" + (s.mail.length - i)),
    );
    function recent(desk, rows) {
      for (const r of rows || [])
        add(desk, g.TLData.seedFor(JSON.stringify(r)));
    }
    recent("finance", s.lumaJournal);
    recent("household", s.household?.history);
    recent("people", Object.entries(s.people || {}));
    recent("create", s.faRecords);
    recent("club", s.faRecords);
    recent("league", s.seasonYears);
    recent(
      "training",
      (s.planHistory || []).filter((p) => p.kind === "training"),
    );
    recent("staff", s.staff);
    recent("vision", s.club?.governance?.minutes);
    recent("finance", s.club?.governance?.gates);
    recent("bids", Object.values(s.bids || {}));
    recent("clubPromises", Object.values(s.footballPromises || {}));
    recent("legacy", s.legacy?.history);
    recent("succession", s.careerSpells);
    recent(
      "kitOffice",
      Object.values(s.kitRegister || {})
        .map((rs) => rs.at(-1))
        .filter((r) => r?.club === s.club?.name)
        .map((r) => [r.day, r.title]),
    );
    recent("planner", s.roster);
    recent("tactics", s.roster);
    recent(
      "development",
      s.dressing?.workload ? Object.entries(s.dressing.workload) : [],
    );
    recent("dynamics", s.dressing?.diary);
    const currentNews=rows=>(rows||[]).filter(r=>s.day>=r.day&&s.day-r.day<7);
    recent("social", currentNews(s.kitWire));
    recent("social", currentNews(s.transferWire));
    recent("social", currentNews(s.neighbourhood?.posts));
    recent("day", s.plans);
    recent("fixtures", s.friendlyHistory?.slice(-5));
    recent("transfers", s.moves?.slice(-5));
    recent("scouting", Object.entries(s.fieldNotes || {}));
    recent("development", s.seasonYears?.slice(-3));
    recent("squad", s.roster);
    recent(
      "medical",
      Object.entries(s.dressing?.people || {})
        .filter(([, v]) => v.injuredUntil > s.day)
        .map(([id, v]) => [id, v.injuredUntil]),
    );
    if (s.worldVersion)
      for (const p of g.TLWorldService.editions(s, "For you").slice(0, 4))
        if (g.TLWorldService.visible(s, p.id, p.topic)) add("social", p.id);
    return groups;
  }
  function badges(s, page) {
    const groups = updates(s),
      seen = s.deskSeen || {},
      counts = {},
      actions = {};
    let dirty = false;
    if (page !== "inbox" && groups[page]) {
      const keys = [...groups[page]];
      if (JSON.stringify(keys) !== JSON.stringify(seen[page])) {
        (s.deskSeen ||= {})[page] = keys;
        dirty = true;
      }
    }
    for (const [k, ids] of Object.entries(groups))
      counts[k] = [...ids].filter(
        (id) => !(s.deskSeen?.[k] || []).includes(id),
      ).length;
    counts.inbox = s.mail.filter((m) => !m.opened).length;
    const due = new Set(
      s.mail
        .filter((m) => m.kit && g.TLOfficeOrganiser.pending(s, m))
        .map((m) => m.kit),
    );
    actions.kitOffice = due.size;
    actions.create = Number(
      s.mail.some((m) => m.entry && g.TLOfficeOrganiser.pending(s, m)),
    );
    actions.bids = Object.values(s.bids || {}).filter(
      (b) => b.status === "open",
    ).length;
    actions.home = Number(!!s.interview);
    actions.neighbourhood = Number(
      !!s.neighbourhood?.invite && !s.neighbourhood.invite.choice,
    );
    return { counts, actions, dirty };
  }
  g.TLDeskAttention = { badges };
})(window);
