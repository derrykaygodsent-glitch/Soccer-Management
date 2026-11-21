/* Office appointments use the district clock. A shift books travel time, not wages. */
(function (g) {
  "use strict";
  const L = g.TLDistrictLife || require("./district-life");
  const desks = {
    scouting: "Scout players",
    interviewDesk: "Review vacancies & interviews",
    create: "Club licence",
    jobs: "Job market",
    district: "Visit the district",
    people: "Meet contacts",
    household: "Household plans",
    neighbourhood: "Community business",
    social: "Supporters network",
    finance: "Review accounts",
    inbox: "Answer mail",
    training: "Plan training",
    tactics: "Tactics session",
    squad: "Review squad",
    staff: "Staff appointments",
    kitOffice: "File registrations",
    vision: "Board business",
    bids: "Transfer talks",
    fixtures: "Match preparation",
    transfers: "Transfer market",
    medical: "Medical review",
    development: "Player development",
    planner: "Squad selection",
    dynamics: "Dressing room",
    league: "Competition briefing",
    clubPromises: "Review promises",
    succession: "Career planning",
    legacy: "Personal wellbeing",
    profile: "Manager profile",
    atlas: "Research a district",
    club: "Club profile",
  };
  const time = (h) => String(h).padStart(2, "0") + ":00",
    entries = (s) => s.appointments || [],
    today = (s) =>
      s.legacy?.exit
        ? undefined
        : entries(s)
            .filter((p) => p.day === s.day)
            .sort((a, b) => a.hour - b.hour)[0];
  function choices() {
    return [
      ...Object.entries(L.jobs)
        .sort((a, b) => a[1][2] - b[1][2])
        .map(([id, j]) => ({
          id: "shift:" + id,
          label: j[0],
          duration: j[3],
          start: j[6],
          end: j[7] - j[3],
          place: j[1],
        })),
      ...Object.entries(desks).map(([id, label]) => ({
        id,
        label,
        duration: 1,
        start: 8,
        end: 21,
      })),
    ];
  }
  function option(id) {
    return choices().find((x) => x.id === id);
  }
  function book(s, { day, hour, id }) {
    const opt = option(id),
      now = L.state(s);
    if (
      !opt ||
      !Number.isInteger(day) ||
      day < s.day ||
      !Number.isInteger(hour) ||
      hour < Math.max(8, opt.start) ||
      hour > opt.end ||
      (day === s.day && hour < now.hour)
    )
      throw Error("Choose an available start time.");
    if (
      entries(s).some(
        (p) =>
          p.day === day &&
          hour < p.hour + option(p.id).duration &&
          p.hour < hour + opt.duration,
      )
    )
      throw Error("Another appointment uses that time.");
    if (opt.place) {
      const other = entries(s)
          .filter((p) => p.day === day && p.hour < hour)
          .sort((a, b) => b.hour - a.hour)[0],
        place = other
          ? option(other.id).place || (day === s.day ? now.place : "home")
          : day === s.day
            ? now.place
            : "home",
        from = other
          ? other.hour + option(other.id).duration
          : day === s.day
            ? now.hour
            : 8;
      if (
        place !== opt.place &&
        from +
          L.route({ ...s, districtLife: { ...now, place } }, opt.place).hours >
          hour
      )
        throw Error("Leave enough time to travel before the shift.");
    }
    (s.appointments ||= []).push({ day, hour, id });
  }
  function cancel(s, p) {
    s.appointments = entries(s).filter(
      (a) => a.day !== p.day || a.hour !== p.hour,
    );
  }
  function arrive(s) {
    const p = today(s);
    if (!p) return;
    const o = option(p.id),
      d = L.state(s);
    if (
      o.place &&
      d.place !== o.place &&
      !s.trip &&
      d.hour + L.route(s, o.place).hours <= p.hour
    ) {
      try {
        L.act(s, "districtTravel", o.place);
      } catch {
        /* Fare or energy unavailable: leave the choice to the manager. */
      }
    }
    if (L.state(s).hour < p.hour) {
      if (s.trip) {
        (s.districtLife ||= { ...L.state(s) }).hour = p.hour;
      } else L.act(s, "districtWait", p.hour);
    }
  }
  function hours(s, day, id) {
    const opt = option(id),
      start = Math.max(8, opt.start, day === s.day ? L.state(s).hour : 8),
      options = [];
    for (let hour = start; hour <= opt.end; hour++) {
      try {
        book({ ...s, appointments: [...entries(s)] }, { day, hour, id });
        options.push(hour);
      } catch {
        /* Overlaps and impossible journeys are not offered. */
      }
    }
    return options.length
      ? options.map((h) => `<option value="${h}">${time(h)}</option>`).join("")
      : '<option value="" disabled selected>No available times</option>';
  }
  function render(s, day) {
    const e = g.TLClubUI.esc,
      ps = entries(s)
        .filter((p) => p.day === day)
        .sort((a, b) => a.hour - b.hour),
      now = L.state(s).hour;
    return `<section class="org-agenda appointment-book"><small>OFFICE PLANNER</small><h3>${day === s.day ? "Today · " + time(now) : "Appointments"}</h3>${ps
      .map((p) => {
        const o = option(p.id);
        return `<p><b>${time(p.hour)}–${time(p.hour + o.duration)}</b>　${e(o.label)} ${day === s.day && now >= p.hour ? `<button data-attend="${p.hour}">${o.place ? "Take shift" : "Open desk"}</button>` : ""} <button data-unbook="${p.hour}">Remove</button></p>`;
      })
      .join("")}${
      day >= s.day
        ? `<form data-appointment><label>Activity <select name="id">${choices()
            .map(
              (o) =>
                `<option value="${o.id}">${e(o.label)} · ${o.duration}h${o.place ? " · " + time(o.start) + "–" + time(o.end) + " starts" : ""}</option>`,
            )
            .join(
              "",
            )}</select></label> <label>Start <select name="hour" required>${hours(s, day, choices()[0].id)}</select></label> <button>Book time</button></form><p>Continue stops at each appointment. Shifts include the usual journey, fare and energy cost. You decide whether to work when you arrive.</p>`
        : ""
    }</section>`;
  }
  const api = {
    hours,
    choices,
    option,
    time,
    book,
    cancel,
    arrive,
    today,
    render,
    entries,
  };
  g.TLOfficePlanner = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window === "undefined" ? globalThis : window);
