/* Office appointments use the district clock. A shift books travel time, not wages. */
(function (g) {
  "use strict";
  const L = g.TLDistrictLife || require("./district-life");
  const desks = {
    scouting: "Scout players",
    interviewDesk: "Review vacancies & interviews",
    create: "Club founding application",
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
  // Desks can be used where you are. Carry the last physical location through
  // them, so inserting a personal appointment cannot erase a later commute.
  function itinerary(s, day, rows, planning=true) {
    const current = planning && day === s.day, now = L.state(s);
    let place = current ? now.place : "home", free = current ? now.hour : 5;
    return [...rows].filter(p=>p.day===day).sort((a,b)=>a.hour-b.hour).map(p=>{
      const o=option(p.id), trip=o.place && o.place!==place
        ? L.route({...s,day,districtLife:{...now,place}},o.place) : {hours:0,fare:0,energy:0};
      const depart=p.hour-trip.hours, reachable=depart>=free;
      free=p.hour+o.duration;place=o.place||place;
      return {...p,depart,trip,reachable,end:free};
    });
  }
  function book(s,{day,hour,id}) {
    const opt=option(id);
    if(hour==null && opt)hour=slots(s,day,id)[0]?.hour;
    if(!opt||!Number.isInteger(day)||day<s.day||!Number.isInteger(hour)||hour<opt.start||hour>opt.end)
      throw Error("No available start time on this date.");
    if(entries(s).some(p=>p.day===day&&hour<p.hour+option(p.id).duration&&p.hour<hour+opt.duration))throw Error("Another appointment uses that time.");
    const p={day,hour,id}, plan=itinerary(s,day,[...entries(s),p]);
    if(plan.some(r=>!r.reachable))throw Error("Leave enough time for travel between bookings.");
    (s.appointments||=[]).push(p);
  }
  function slots(s,day,id){const o=option(id),result=[];if(!o||day<s.day)return result;
    for(let hour=o.start;hour<=o.end;hour++){const copy={...s,appointments:[...entries(s)]};try{book(copy,{day,hour,id});result.push(itinerary(s,day,copy.appointments).find(p=>p.hour===hour));}catch{}}
    return result;
  }
  function wake(s){const first=itinerary(s,s.day,entries(s),false)[0];if(first&&first.depart<8)(s.districtLife||={...L.state(s)}).hour=first.depart;}
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
    if(o.place && d.place!==o.place){
      if(s.trip)throw Error("You are away on a scouting trip. Remove or rebook this shift.");
      const depart=p.hour-L.route(s,o.place).hours;
      if(d.hour>depart)throw Error("Too late for this commute. Remove this booking and choose another available shift.");
      // Check the fare before waiting; a failed journey must never burn the time slot.
      const trip=L.route(s,o.place);
      if(s.cash<trip.fare||d.energy<trip.energy)throw Error("Cannot travel yet: this journey needs "+g.TLLuma.format(trip.fare)+" and "+trip.energy+" energy. Fund the trip or rebook.");
      if(d.hour<depart)L.act(s,"districtWait",depart);
      L.act(s,"districtTravel",o.place);
    }
    if (L.state(s).hour < p.hour) {
      if (s.trip) {
        (s.districtLife ||= { ...L.state(s) }).hour = p.hour;
      } else L.act(s, "districtWait", p.hour);
    }
  }
  function hours(s, day, id) {
    const available=slots(s,day,id),label=p=>(p.trip.hours?"Leave "+time(p.depart)+" · ":"")+time(p.hour)+"–"+time(p.end);
    return available.length?available.map((p,i)=>`<option value="${p.hour}">${i?'':'Auto · '}${label(p)}</option>`).join(''):'<option value="" disabled selected>No reachable slot on this date</option>';
  }
  function render(s, day) {
    const e = g.TLClubUI.esc,
      ps = entries(s)
        .filter((p) => p.day === day)
        .sort((a, b) => a.hour - b.hour),
      now = L.state(s).hour;
    /* The planner never said how much of the day was left. An hour window of 06:00 to 22:00. */
    const bookedHours = ps.reduce((sum, p) => sum + (Number(option(p.id).duration) || 1), 0),
      freeHours = Math.max(0, 16 - bookedHours),
      load = `<span class="tl-status" data-tl-status="${bookedHours ? 'due' : 'done'}"><small>${bookedHours} booked</small>${freeHours ? freeHours + ' free hours' : 'Day full'}</span>`;
    return `<section class="org-agenda appointment-book"><small>OFFICE PLANNER</small><h3>${day === s.day ? "Today · " + time(now) : g.TLManagerLife.date(day)} ${load}</h3>${ps
      .map((p) => {
        const o = option(p.id);
        return `<p><b>${time(p.hour)}–${time(p.hour + o.duration)}</b>　${e(o.label)} ${(()=>{const r=itinerary(s,day,entries(s),day===s.day).find(r=>r.hour===p.hour);return r.trip.hours?`<small>Leave ${time(r.depart)} · ${r.trip.hours}h travel · ${g.TLLuma.format(r.trip.fare)}</small>`:""})()} ${day === s.day && now >= p.hour ? `<button data-attend="${p.hour}">${o.place ? "Take shift" : "Open desk"}</button>` : ""} <button data-unbook="${p.hour}">Remove</button></p>`;
      })
      .join("")}${
      day >= s.day
        ? `<form data-appointment><label>Activity <select name="id">${choices()
            .map(
              (o) =>
                `<option value="${o.id}">${e(o.label)} · ${o.duration}h${o.place ? " · " + time(o.start) + "–" + time(o.end) + " start window" : ""}</option>`,
            )
            .join(
              "",
            )}</select></label> <label>Suggested slot <select name="hour" required>${hours(s, day, choices()[0].id)}</select></label> <button>Book time</button></form><p>The earliest reachable slot is selected for you. Book it as shown or choose a later one. Continue handles the journey before work, including an early start on future days. Bring the fare and energy; you decide whether to take the shift.</p>`
        : ""
    }</section>`;
  }
  const api = {
    wake, slots, hours,
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
