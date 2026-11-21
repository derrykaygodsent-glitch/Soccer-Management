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
    recent("social", s.kitWire);
    recent("social", s.transferWire);
    recent("social", s.neighbourhood?.posts);
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
  // Reorder existing nodes, never clone or remove form fields. Keep table divisions and headings in place.
  function lists(root) {
    const targets = new Map();
    function group(rows) {
      for (const row of rows) {
        const parent = row.parentElement;
        if (!targets.has(parent)) targets.set(parent, []);
        targets.get(parent).push(row);
      }
    }
    group(
      root.querySelectorAll(
        ".pulse-stream > article,.sq-unit > [data-squad-player],[data-kit-list] > label,.dyn-players > article,.work-list > article,.org-agenda > details,.comp-board > .comp-player,.org > article.org-agenda,.org > details.org-agenda,.org-agenda > p:not(:has(button,input,select)),.depth-layout .sq-unit > p",
      ),
    );
    for (const body of root.querySelectorAll("tbody"))
      group([...body.rows].filter((r) => !r.querySelector("[colspan]")));
    for (const [parent, rows] of targets) {
      if (rows.length < 2) continue;
      const table = parent.closest("table"),
        box = document.createElement("div");
      box.className = "desk-tools";
      box.innerHTML =
        '<label>Find in list <input type="search"></label><label>Order <select><option>Original order</option><option>A–Z</option><option>Z–A</option></select></label><button type="button">Reset</button><small aria-live="polite"></small>';
      (table || rows[0]).before(box);
      const input = box.querySelector("input"),
        sort = box.querySelector("select"),
        out = box.querySelector("small"),
        heads = table?.tHead?.rows[0]?.cells;
      if (heads)
        for (const h of heads) {
          for (const dir of ["↑", "↓"])
            sort.add(new Option(h.textContent + " " + dir));
        }
      const kit = parent.hasAttribute("data-kit-list");
      let status;
      if (kit) {
        const label = document.createElement("label");
        label.textContent = "Shirts";
        status = document.createElement("select");
        for (const name of ["All players", "Number assigned", "Omitted"])
          status.add(new Option(name));
        label.append(status);
        box.prepend(label);
      }
      const metrics = ["age", "value", "fit", "day"].filter((key) =>
        rows.every((r) => r.dataset[key] != null),
      );
      for (const key of metrics)
        for (const dir of ["↑", "↓"])
          sort.add(new Option(key + " " + dir, key + dir));
      const anchors = rows.map((r) => {
          const a = document.createComment("list slot");
          r.before(a);
          return a;
        }),
        groups = [];
      let last;
      rows.forEach((r, i) => {
        const split =
          i === 0 || anchors[i].previousElementSibling !== rows[i - 1];
        if (split) groups.push((last = []));
        last.push(i);
      });
      const text = (r) =>
        r.querySelector("strong,h3,th[scope=row]")?.textContent ||
        r.textContent;
      function apply() {
        const query = input.value.trim().toLowerCase();
        let n = 0;
        for (const indices of groups) {
          const sorted = indices.map((i) => rows[i]);
          if (sort.selectedIndex) {
            const j = sort.selectedIndex,
              col = Math.floor((j - 3) / 2),
              metric = metrics.find((key) => sort.value.startsWith(key)),
              key = (r) =>
                metric
                  ? r.dataset[metric]
                  : j < 3
                    ? text(r)
                    : r.cells[col]?.textContent || "";
            sorted.sort(
              (a, b) =>
                key(a).localeCompare(key(b), undefined, { numeric: true }) *
                (j === 2 || (j >= 3 && (j - 3) % 2) ? -1 : 1),
            );
          }
          indices.forEach((idx, i) => {
            const row = sorted[i];
            anchors[idx].after(row);
            row.hidden =
              !row.textContent.toLowerCase().includes(query) ||
              !!(
                status?.selectedIndex &&
                (status.selectedIndex === 1) !==
                  !!row.querySelector("[data-kit-id]").value
              );
            if (!row.hidden) n++;
          });
        }
        out.textContent = n + " / " + rows.length;
      }
      if (status) status.onchange = apply;
      input.oninput = sort.onchange = apply;
      box.querySelector("button").onclick = () => {
        input.value = "";
        if (status) status.selectedIndex = 0;
        sort.selectedIndex = 0;
        apply();
      };
      apply();
    }
  }
  g.TLDeskAttention = { badges, lists };
})(window);
