/* Private manager dossier. Archive facts, never rendered HTML or inferred relationships. */
(function (g) {
  "use strict";
  const labels = {
    football: "Football",
    social: "Social life",
    life: "Personal life",
  };
  function facts(s, since = -Infinity) {
    const out = [],
      add = (day, kind, title, text) => {
        if (Number.isInteger(day) && day >= since && text)
          out.push({ day, kind, title, text });
      };
    const p = s.profile || {},
      start = s.startDay ?? 0;
    add(
      start,
      "life",
      "Opening chapter",
      `${p.name || "The manager"} began in ${p.nation}, aged ${Number.isInteger(p.age) ? p.age : "not recorded"}, ${p.path === "found" ? "setting out to build a club from scratch" : "seeking a first appointment with an existing club"}.`,
    );
    for (const r of [...(s.household?.log || [])].reverse())
      add(r.day, "social", "Relationships", r.text);
    for (const r of [...(s.familyLife?.news || [])].reverse())
      add(r.day, "life", "Family & home", r.text);
    for (const r of [...(s.legacy?.history || [])].reverse())
      add(r.day, "life", "Personal milestone", r.text);
    for (const r of [...(s.districtLife?.history || [])].reverse())
      if (!/^(Arrived at|Waited until|Rested at home)/.test(r.text))
        add(r.day, "life", "In the district", r.text);
    for (const r of Object.values(s.people || {}))
      for (const [day, text] of r.log || [])
        add(day, "social", `${r.name} · ${r.town}`, text);
    for (const r of [...(s.neighbourhood?.posts || [])].reverse())
      add(r.day, 'social', r.title, r.text);
    for (const c of [...(s.pressConferences || [])].reverse())
      if (['answered', 'delegated', 'ended'].includes(c.status))
        add(c.answeredDay ?? c.endedDay ?? c.day, 'football', c.title || 'Press conference', `${c.headline || c.title}. ${c.answers?.length || 0} recorded answer(s); ${c.status === 'delegated' ? `handled by ${c.delegatedTo || 'an assistant'}` : c.status === 'ended' ? 'ended before all questions were answered' : 'attended personally'}.`);
    // Attribute a season only to a club the manager actually led at the whistle.
    const spells = [...(s.careerSpells || [])];
    if(s.club) spells.push({club:s.club.name,from:s.club.appointed,until:s.legacy?.exit?.day??s.day});
    for(const season of s.seasonBook||[]){
      const day=(Date.UTC(season.year+1,5,30)-Date.UTC(2026,9,26))/86400000;
      if(day<since)continue;
      const spell=spells.find(c=>c.from<=day&&day<=c.until);
      if(!spell)continue;
      for(const [nation,book] of Object.entries(season.nations||{})){
        const row=book.table?.find(r=>r[0]===spell.club);if(!row)continue;
        add(day,'football','Season review',`${spell.club} closed the ${season.year}/${String(season.year+1).slice(-2)} league season in ${nation} with ${row[3]} points from ${row[1]} games.`);
      }
      for(const award of season.cupAwards||[])if(award.club===spell.club)add(day,'football','Silverware',`${spell.club} won the ${award.title}.`);
    }
    if (s.network) {
      add(
        s.network.joined,
        "social",
        "Supporters’ Network",
        `Joined the supporters’ conversation as @${s.network.handle}.`,
      );
      for (const t of s.network.threads || [])
        for (const r of t.posts)
          add(
            r.day,
            "social",
            "From the touchline",
            `“${r.text}”. Posted by @${s.network.handle}. ${r.fan} replied: “${r.response}”`,
          );
    }
    for (const c of [...(s.careerSpells || []), ...(s.club ? [s.club] : [])]) {
      const name = c.club || c.name,
        found = c.founder ?? c.owner;
      add(
        c.from ?? c.appointed,
        "football",
        found ? "Club founded" : "Appointment",
        found ? `Founded ${name}.` : `Took charge of ${name}.`,
      );
      add(
        c.until,
        "football",
        "End of a spell",
        `The spell at ${name} came to an end.`,
      );
    }
    for (const r of s.practices || [])
      add(
        r.day,
        "football",
        "Community ground",
        `${r.home} ${r.goals.join("–")} ${r.away} at ${r.ground}.`,
      );
    for (const m of s.mail || []) {
      if (m.day < since) continue;
      if (
        m.report?.score ||
        (["League office", "Cup office", "Preseason"].includes(m.from) &&
          m.report &&
          !m.preview)
      )
        add(m.day, "football", m.from, m.text);
      else if (
        [
          "Club directors",
          "Founding members",
          "Club secretary",
          "Training ground",
          "Transfer desk",
          "Player representative",
        ].includes(m.from) ||
        /Interview invitation|Your application was unsuccessful|board appointed another candidate|Count me in as an amateur/.test(
          m.text,
        )
      )
        add(m.day, "football", m.from, m.text);
      else if (m.from === "Supporters Network" && /verified/.test(m.text))
        add(m.day, "social", "Supporters’ Network", m.text);
    }
    return out;
  }
  const key = (r) => JSON.stringify([r.day, r.kind, r.title, r.text]);
  function unique(rows) {
    const seen = new Set();
    return rows.filter((r) => {
      const k = key(r);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }
  function capture(old, s, cmd, v) {
    if (!s.profile?.name) return;
    if (s.managerHistory && s.managerHistory === old.managerHistory)
      s.managerHistory = s.managerHistory.slice();
    const archive = (s.managerHistory ||= unique(facts(old)));
    const rows = facts(s, old.day);
    const add = (kind, title, text) =>
      rows.push({ day: s.day, kind, title, text });
    if (cmd === "apply")
      add("football", "Application", `Applied for the manager’s job at ${v}.`);
    if (cmd === "answer")
      add(
        "football",
        "Board interview",
        `At ${old.interview}, made ${{ academy: "youth development", promotion: "promotion", budget: "financial discipline" }[v]} the first priority.`,
      );
    if (cmd === "bookFlight" && s.trip)
      add(
        "football",
        "Scouting abroad",
        `Booked a scouting visit to ${s.trip.n}.`,
      );
    if (cmd === "funding" && s.activity !== old.activity)
      add("life", "Making a living", s.activity);
    if (cmd === "neighbourChoice" && s.activity !== old.activity)
      add("social", "Community life", s.activity);
    if (cmd === "personalInvest" && s.activity !== old.activity)
      add("life", "Personal enterprise", s.activity);
    if (old.network?.verified !== s.network?.verified && s.network?.verified)
      add(
        "social",
        "Verified manager",
        `The supporters’ network verified @${s.network.handle}.`,
      );
    if (old.club?.name && s.club?.name === old.club.name) {
      const before = new Set(old.roster || []),
        joined = (s.roster || []).filter((id) => !before.has(id));
      if (joined.length) {
        const names = new Map(
          (g.TLManagerLife?.pool || []).map((p) => [p.id, p.name]),
        );
        for (const id of joined)
          if (names.has(id))
            add(
              "football",
              "Squad arrival",
              `${names.get(id)} joined the squad at ${s.club.name}.`,
            );
      }
    }
    const seen = new Set(archive.filter((r) => r.day >= old.day).map(key));
    for (const r of rows) {
      const k = key(r);
      if (!seen.has(k)) {
        archive.push(r);
        seen.add(k);
      }
    }
  }
  function history(s) {
    return unique([...(s.managerHistory || []), ...facts(s)])
      .reverse()
      .sort((a, b) => b.day - a.day);
  }
  const H_ordinal = n => {
    const v = Number(n) || 0;
    return `${v}${v % 100 >= 11 && v % 100 <= 13 ? "th" : { 1: "st", 2: "nd", 3: "rd" }[v % 10] || "th"}`;
  };
  function render(s, ui = {}) {
    const W = g.TLManagerLife,
      { esc: e, art } = g.TLClubUI,
      p = s.profile,
      f = g.TLFamilyPaths.read(s),
      h = g.TLHousehold.read(s),
      l = g.TLLegacy.read(s),
      age = g.TLLegacy.age(s),
      start = s.startDay ?? 0,
      rows = history(s),
      club = s.club,
      active = club && !l.exit,
      status = l.exit
        ? l.status
        : active
          ? club.owner
            ? "Founder & manager"
            : "First-team manager"
          : s.interview
            ? "In interview"
            : s.draft
              ? "Licence applicant"
              : "Independent manager";
    const wealth = g.TLLuma.personalWealth(s);
    const factsList = (items) =>
        `<dl class="mp-facts">${items.map(([k, v]) => `<div><dt>${e(k)}</dt><dd>${e(v)}</dd></div>`).join("")}</dl>`,
      button = (id, label) =>
        `<button type="button" data-profile-view="${id}" aria-pressed="${(ui.tab || "overview") === id}">${label}</button>`;
    const first = rows.find((r) => r.kind === "football"),
      social = rows.find((r) => r.kind === "social"),
      kind = ui.kind || "all",
      filtered = rows.filter((r) => kind === "all" || r.kind === kind),
      shown = filtered.slice(0, ui.limit || 30);
    const family = h.partner ? `${h.stage} · ${h.partner.name}` : p.marital;
    const header = `<header class="mp-hero">${art("terrace")}<div class="mp-identity"><div class="mp-portrait">${g.TLCareerEntry.portrait(p)}</div><div><small>TOUCHLINE　/　 MANAGER DOSSIER</small><h2>${e(p.name)}</h2><strong>${e(status)}</strong><p>${e(active ? club.name : p.nation)} · Age ${age}</p></div></div></header><nav class="mp-tabs" aria-label="Profile sections">${button("overview", "Profile")}${button("history", "Biography & history")}</nav>`;
    const name = p.name.split(" ")[0],
      spells = s.careerSpells || [],
      careerText = spells.length
        ? `${name} previously managed ${spells.map((c) => c.club).join(", ")}.`
        : "",
      partner = h.partner,
      homeText = partner?.met
        ? `${name} met ${partner.name} at ${partner.met.place} on ${W.date(partner.met.day)}. ${h.stage === "Acquaintances" ? "They exchanged numbers and are getting to know each other." : h.stage === "Married" ? "They are now married." : "They are now dating."}`
        : partner
          ? `${partner.name} is part of ${name}’s life (${h.stage.toLowerCase()}).`
          : "";
    const kidsText = f.kids.length ? `They have ${f.kids.map((k)=>`${k.name}, aged ${g.TLFamilyPaths.age(k,s.day)}`).join(" and ")}.` : "";
    const managed = new Set(spells.map((c) => c.club));
    if (club) managed.add(club.name);
    const trophies = [...new Set((s.seasonBook || []).flatMap((season) => season.cupAwards || []).filter((a) => managed.has(a.club)).map((a) => a.title))];
    const honoursPara = trophies.length
      ? `<p><b>Achievements</b> · ${trophies.map((t) => `won the ${e(t)}`).join(", ")}.</p>`
      : "";
    const todayText = l.exit
      ? "That managerial career has since ended."
      : active
        ? `Today, ${name} manages ${club.name}.`
        : s.interview
          ? `An interview with ${s.interview} is the next step.`
          : s.careerSpells?.length
            ? "The last club spell has ended."
            : "No club is currently under management.";
    const nextSteps = active
      ? `Next: keep ${club.name} competitive and build on what is already there.`
      : s.interview
        ? `Next: the interview with ${s.interview}.`
        : "Next: find the next club and start the story again.";
    let league = null;
    try {
      const nation = club?.owner ? p.nation : Object.keys(W.nations || {}).find(k => (W.nations[k] || []).includes(club?.name)) || p.nation;
      league = (W.table(nation, s.day) || []).find(r => r.name === club?.name) || null;
    } catch {}
    const founding = club?.owner
      ? ` ${name} founded ${club.name}${club.nick ? ` (${club.nick})` : ""} and remains its owner. The FA registered the club on ${W.date(club.appointed)}${s.faDecision?.ok ? ` after the licence hearing` : ""}.`
      : club
        ? ` ${name} took charge of ${club.name} on ${W.date(club.appointed)}.`
        : "";
    const seasonLine = league?.p
      ? `The club has played ${league.p} league matches: ${league.w} won, ${league.d} drawn, ${league.l} lost, ${league.gs} scored and ${league.gc} conceded, sitting ${H_ordinal(league.rank)} with ${league.pts} points.`
      : "";
    const clubStats = active
      ? `<article class="mp-card"><small>CLUB AT A GLANCE</small><h3>${e(club.name)}</h3>${factsList([["Role", club.owner ? "Founder & manager" : "First-team manager"], ["Appointed", W.date(club.appointed)], ["League position", league?.rank ? `#${league.rank} of the table` : "Season not started"], ["Record", league?.p ? `${league.p}P ${league.w}W ${league.d}D ${league.l}L` : "No matches played"], ["Squad", `${s.roster.length} players`], ["Backroom", `${(s.staff || []).length} appointments`], ["Club funds", W.money(s.fund)]])}<div class="mp-split"><button data-profile-view="history">Club story in your biography</button><button data-life="go" data-v="club">Open the club profile</button></div></article>`
      : "";
    const origin = `${p.name} began this career in ${p.nation} on ${W.date(start)}, ${p.path === "found" ? "with plans to found a club" : "looking for a club to manage"}.${founding}`,
      chapter = `<article class="mp-card mp-story"><small>THE STORY SO FAR</small><h3>Biography</h3><p>${e(origin)} ${e(careerText)}</p><p>${e(todayText)}</p>${honoursPara}${homeText ? `<p>${e(homeText)}</p>` : ""}${kidsText ? `<p>${e(kidsText)}</p>` : ""}${seasonLine ? `<p><b>This season</b> ${e(seasonLine)}</p>` : ""}${first ? `<p><b>In football · ${W.date(first.day)}</b> ${e(first.text)}</p>` : ""}${social ? `<p><b>Off the pitch · ${W.date(social.day)}</b> ${e(social.text)}</p>` : ""}<p><b>What’s next</b> · ${e(nextSteps)}</p></article>`;
    const pressRows = (s.pressConferences || []).filter(c => ['answered', 'delegated', 'ended'].includes(c.status)).slice().sort((a,b)=>(b.answeredDay||b.endedDay||b.day)-(a.answeredDay||a.endedDay||a.day));
    const pressHistory = `<section class="mp-card mp-press-history"><small>MEDIA &amp; PUBLIC RECORD</small><h3>Press conference history · ${pressRows.length}</h3>${pressRows.length ? pressRows.map(c => `<article class="mp-entry"><small>${e(W.date(c.answeredDay || c.endedDay || c.day))} · ${e(c.title)} · ${e(c.status)}</small><strong>${e(c.headline || c.title)}</strong><p>${e(c.club || s.club?.name || '')}${c.context?.opponent ? ` v ${e(c.context.opponent)}` : ''}${c.delegatedTo ? ` · handled by ${e(c.delegatedTo)}` : ''}</p>${c.questions.map(q => { const a = c.answers.find(x => x.questionId === q.id), j = g.TLMediaConference.byId[q.journalistId]; return `<details open><summary>${e(j?.name || 'Reporter')} · ${e(j?.publication || '')}: ${e(q.prompt)}</summary><p>${e(a?.quote || 'No answer recorded.')}</p></details>`; }).join('')}</article>`).join('') : '<p>No conference has been completed yet. Major football events may generate a media request.</p>'}</section>`;
    const timeline = `${pressHistory}${chapter}${clubStats}<section class="mp-card"><small>FROM THE PRIVATE ARCHIVE</small><h3>Life history</h3><nav class="mp-filters" aria-label="History category">${Object.entries(
      { all: "All chapters", ...labels },
    )
      .map(
        ([k, v]) =>
          `<button data-profile-kind="${k}" aria-pressed="${kind === k}">${v}</button>`,
      )
      .join(
        "",
      )}</nav><p>${filtered.length} recorded ${filtered.length === 1 ? "moment" : "moments"} · newest dates first</p>${shown.map((r, i) => `${!i || W.date(r.day).slice(0, 4) !== W.date(shown[i - 1].day).slice(0, 4) ? `<h4>${W.date(r.day).slice(0, 4)}</h4>` : ""}<article class="mp-entry ${r.kind}"><small><time>${W.date(r.day)}</time> · ${labels[r.kind]}</small><strong>${e(r.title)}</strong><p>${e(r.text)}</p></article>`).join("") || "<p>No moments in this chapter yet.</p>"}${shown.length < filtered.length ? "<button data-profile-more>Show older moments</button>" : ""}</section>`;
    const switcher = `<nav class="profile-switch" aria-label="Switch profile"><button type="button" aria-pressed="false" data-life="go" data-v="club">Club profile</button><button type="button" aria-pressed="true" data-life="go" data-v="profile">Manager profile</button></nav>`;
    return `<section class="manager-passport">${switcher}${header}${
      ui.tab === "history"
        ? timeline
        : `<article class="mp-card mp-wealth"><small>PERSONAL FINANCES</small><h3>Estimated net worth · ${W.money(wealth.total)}</h3><p>Available in your wallet: <b>${W.money(s.cash)}</b></p><details open><summary>How this is calculated</summary>${factsList(wealth.rows.filter(([,v],i)=>!i||v).map(([label,v])=>[label,W.money(v)]))}<p>Property and business equipment are valued at cost. Club funds and future income are excluded.</p></details></article><div class="mp-grid"><article class="mp-card"><small>IDENTITY</small><h3>Personal file</h3>${factsList(
            [
              ["Home nation", p.nation],
              ["Age", age],
              ["Gender", p.gender],
              ["Career background", p.job],
              ["Home", g.TLFamilyPaths.titles[f.home] || f.home],
              ["Relationship", family],
              [
                "Children",
                f.kids
                  .map((k) => `${k.name} (${g.TLFamilyPaths.age(k, s.day)})`)
                  .join(", ") || "None",
              ],
              ["Wellbeing", l.status],
            ],
          )}</article><article class="mp-card"><small>THE DUGOUT</small><h3>Managerial record</h3>${factsList(
            [
              ["Career started", W.date(start)],
              [
                "Career route",
                p.path === "found" ? "Found a club" : "Apply to a team",
              ],
              ["Current role", status],
              ["Club", active ? club.name : "No current club"],
              ["Previous spells", (s.careerSpells || []).length],
              ...(active
                ? [
                    ["Formation", s.tactic],
                    ["Mentality", s.mentality || "Balanced"],
                    ["First-team squad", s.roster.length],
                  ]
                : []),
            ],
          )}</article></div><article class="mp-card"><small>PRIVATE JOURNAL</small><h3>Your life in football</h3><p>${e(origin)}</p><button data-profile-view="history">Read biography and history</button></article><details open class="mp-card"><summary>Save management</summary><p>This affects the local copy of this manager’s career.</p><button class="cc-btn" data-remove-current>Delete local profile &amp; save</button></details>`
    }</section>`;
  }
  function renderWorld(s, id, clubHint = '') {
    const W = g.TLManagerLife, T = g.TLTechnical, e = g.TLClubUI.esc;
    const entries = [];
    for (const [nation, clubs] of Object.entries(W.nations || {})) {
      for (const club of clubs) {
        const office = T.office(s, club, nation, clubs);
        if (office.coach?.id === id) entries.push({ nation, club, coach: office.coach, day: office.day, current: true });
        for (const item of s.benches?.[club] || []) {
          for (const person of [item.coach, item.former]) {
            if (person?.id === id) entries.push({ nation, club, coach: person, day: item.day, current: office.coach?.id === id });
          }
        }
      }
    }
    const found = entries.find(x => x.club === clubHint) || entries.at(-1);
    if (!found) {
      const back = clubHint ? `<button data-world-club="${e(clubHint)}">Open ${e(clubHint)}</button>` : '';
      return `<section class="org mp-profile world-manager-file"><header class="org-cover">${g.TLClubUI.art('briefing')}<div><small>WORLD MANAGER DOSSIER</small><h2>Manager record unavailable</h2></div></header><p>This manager is no longer attached to a recorded dugout in the current world.</p>${back}</section>`;
    }
    const all = [...new Map(entries.map(x => [x.club + '|' + x.day + '|' + x.coach.id, x])).values()].sort((a, b) => a.day - b.day);
    const clubRow = (W.table(found.nation, s.day) || []).find(x => x.name === found.club);
    const history = (s.benches?.[found.club] || []).filter(x => x.coach?.id === id || x.former?.id === id).slice().reverse();
    const rank = clubRow?.rank ? '#' + clubRow.rank : 'Not ranked';
    const points = clubRow ? `${clubRow.pts} points · ${clubRow.p} played` : 'Season not started';
    const appointments = all.length ? all.map(x => `<p>${e(W.date(x.day))} · <button data-world-club="${e(x.club)}">${e(x.club)}</button> · ${x.current ? 'In post' : 'Recorded appointment'}</p>`).join('') : '<p>No appointment history is recorded.</p>';
    const events = history.length ? `<article class="mp-card"><small>TOUCHLINE ARCHIVE</small><h3>Decisions and changes</h3>${history.map(x => `<p>${e(W.date(x.day))} · ${e(x.reason)} · ${x.coach?.id === id ? 'Appointed' : 'Left the post'}</p>`).join('')}</article>` : '';
    const style = T.labels[found.coach.style] || found.coach.style;
    const formation = g.TLData.defaultTactics(found.coach.style).formation;
    const target = T.office(s, found.club, found.nation, W.nations[found.nation]).target;
    return `<section class="org mp-profile world-manager-file"><header class="org-cover">${g.TLClubUI.art('briefing')}<div><small>WORLD MANAGER DOSSIER · ${e(found.nation).toUpperCase()}</small><h2>${e(found.coach.name)}</h2><p>${e(style)} · ${found.current ? 'Currently in the dugout' : 'Managerial record'}</p></div></header><div class="cp-kpis"><div><small>Current club</small><b><button data-world-club="${e(found.club)}">${e(found.club)}</button></b><em>${e(found.nation)}</em></div><div><small>League standing</small><b>${rank}</b><em>${points}</em></div><div><small>Career appointments</small><b>${all.length}</b><em>${all.length > 1 ? 'Recorded world roles' : 'One recorded role'}</em></div><div><small>Approach</small><b>${e(style)}</b><em>${e(formation)} formation</em></div></div><div class="cp-grid"><article class="mp-card"><small>CAREER RECORD</small><h3>Appointments</h3>${appointments}</article><article class="mp-card"><small>CLUB CONTEXT</small><h3>${e(found.club)}</h3><p>${found.current ? 'Currently responsible for the first team.' : 'Last recorded club appointment.'} The club’s board target is a top-${target} finish.</p><button data-world-club="${e(found.club)}">Open club dossier</button></article>${events}</div></section>`;
  }
  const api = { capture, history, render, renderWorld };
  g.TLManagerProfile = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window === "undefined" ? globalThis : window);
