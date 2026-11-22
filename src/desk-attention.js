/* Read receipts belong to a career. Opening a desk acknowledges its updates, not its mail or decisions. */
(function (g) {
  "use strict";
const showMoney=n=>(g.TLLuma||require('./luma')).format(n);
  function describe(s, desk, r) {
    const name=id=>g.TLManagerLife.pool?.find(p=>p.id===id)?.name||String(id);
    if(Array.isArray(r)){const [id,v]=r;if(desk==='scouting')return `${name(v)} · scouting report from ${id}`;if(desk==='kitOffice')return `${v} · filed ${g.TLManagerLife.date(id)}`;if(desk==='medical')return `${name(id)} · recovery until ${g.TLManagerLife.date(v)}`;if(desk==='development')return `${name(id)} · ${v.sessions} training sessions, ${v.minutes} match minutes`;return `${name(id)} · contact updated`;}
    if(typeof r==='string')return ['squad','tactics','planner'].includes(desk)?name(r):r;
    if(typeof r==='number')return `Season review · ${r}`;
    if(r.kind&&r.due!=null)return `${String(r.kind).replace(/([A-Z])/g,' $1')} · ${name(r.id)} · ${g.TLManagerLife.date(r.due)}`;
    if(r.label&&r.personal!=null)return `${r.label} · wallet ${showMoney(r.personal)}, club ${showMoney(r.club)}`;
    if(r.approved)return 'FA hearing · '+r.approved.join(', ');
    if(desk==='bids')return `${r.name} · ${r.to} · ${r.status}`;
    if(desk==='fixtures')return `${r.team} ${r.result?.join('–')||'v'} ${r.host}`;
    if(desk==='transfers')return `${name(r.id)} · From ${r.from||'Free agent'} to ${r.to||'Released'}`;
    return r.title||r.text||r.name||r.club||r.opponent||r.label||`Record dated ${g.TLManagerLife.date(r.day??s.day)}`;
  }
  function updates(s,details,page) {
    const groups = {},
      add = (desk, id, item) => {
        if(desk===page) details.set(String(id),item);
        (groups[desk] ||= new Set()).add(String(id));
      };
    s.mail.forEach((m, i) =>
      add(g.TLOfficeOrganiser.classify(m)[3], "post:" + (s.mail.length - i),{label:m.report?.title||m.text,mail:s.mail.length-1-i}),
    );
    function recent(desk, rows) {
      for (const r of rows || [])
        add(desk, g.TLData.seedFor(JSON.stringify(r)),desk===page?{label:describe(s,desk,r),record:r}:null);
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
    recent("scouting", Object.entries(s.fieldNotes || {}).flatMap(([nation,ids])=>ids.map(id=>[nation,id])));
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
        if (g.TLWorldService.visible(s, p.id, p.topic)) add("social", p.id,{label:p.title,story:p.id});
    return groups;
  }
  function badges(s, page) {
    const details=new Map(),groups = updates(s,details,page),
      seen = s.deskSeen || {},
      counts = {},
      actions = {};
    const fresh=[...details.entries()].filter(([id])=>!(seen[page]||[]).includes(id));
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
    return { counts, actions, dirty, fresh, details };
  }
  // Keep the arrival snapshot for this visit, including while filtering or sorting the desk.
  function digest(items){if(!items.length)return '';const e=g.TLClubUI.esc,row=x=>`<li><small class="attention-tag">New</small> ${x.mail!=null?`<button data-update-mail="${x.mail}">Open ${e(x.label)}</button>`:e(x.label)}</li>`;return `<section class="arrival-brief"><small>DESK BRIEFING</small><h3>New since your last visit · ${items.length}</h3><ul>${items.slice(0,3).map(row).join('')}</ul>${items.length>3?`<details><summary>Show ${items.length-3} more</summary><ul>${items.slice(3).map(row).join('')}</ul></details>`:''}</section>`;}
  function mark(root,s,page,items){const tags=new WeakMap();function tag(node,text){if(!node)return;const used=tags.get(node)||[];if(used.includes(text))return;tags.set(node,[...used,text]);const chip=document.createElement('small');chip.className='attention-tag'+(text==='Needs response'?' due':'');chip.textContent=text;node.append(' ',chip);}
    const find=(attr,val)=>[...root.querySelectorAll('['+attr+']')].find(el=>el.getAttribute(attr)===String(val));
    for(const x of items){const r=x.record;if(page==='scouting'&&Array.isArray(r)){const cell=[...root.querySelectorAll('[data-life=recOpen]')].find(el=>el.dataset.v===r[1]);tag(cell?.closest('th'),'New');}if(page==='squad'&&typeof r==='string')tag(find('data-squad-player',r)?.closest('th'),'New');if(page==='bids'&&r)tag(find('data-bid-id',r.id)?.querySelector('h3'),'New');if(page==='kitOffice'&&Array.isArray(r))tag(find('data-kit-list',r[1])?.closest('details')?.querySelector('summary'),'New');if(page==='social'){const story=x.story||(r&&(s.kitWire?.includes(r)?'register:'+r.id:s.transferWire?.includes(r)?'transfer:'+r.id+':'+r.day:'district:'+r.day+r.title));if(story)tag(find('data-pulse-like',story)?.closest('article')?.querySelector('header'),'New');}}
    if(page==='bids')for(const b of Object.values(s.bids||{}))if(b.status==='open')tag(find('data-bid-id',b.id)?.querySelector('h3'),'Needs response');
    if(page==='kitOffice')for(const m of s.mail)if(m.kit&&g.TLOfficeOrganiser.pending(s,m))tag(find('data-kit-list',m.kit)?.closest('details')?.querySelector('summary'),'Needs response');
    if(page==='neighbourhood'&&s.neighbourhood?.invite&&!s.neighbourhood.invite.choice)tag(root.querySelector('[data-life=neighbourChoice][data-v=share]')?.closest('article')?.querySelector('h3'),'Needs response');
    if(page==='interviewDesk'&&s.interview)tag(root.querySelector('[data-life=answer]')?.parentElement,'Needs response');
    if(page==='create'&&s.mail.some(m=>m.entry&&g.TLOfficeOrganiser.pending(s,m)))tag(find('data-life','fileEntry'),'Needs response');
  }
  g.TLDeskAttention = { badges,digest,mark };
})(window);
