/* Touchline 26 — the club dashboard and the door into the existing match centre. */
(function (global) {
  'use strict';
  const M = global.TLHomeData;
  const portraitImages = /* @HOME_PORTRAITS@ */ {};
  const $ = id => document.getElementById(id);
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = name => `<svg class="hc-icon" aria-hidden="true"><use href="#${name.startsWith('i-') ? name : 'hc-i-' + name}"/></svg>`;
  const text = (id, value) => { $(id).textContent = value; };
  const state = { now: M.start, entered: false, drawer: false, note: '', pageY: 0, contentY: 0 };
  let desk;
  const NOTE_KEY = 'touchline26.clubhouse.notebook';
  const nav = [
    [['Home', 'home', 'home'], ['Inbox', 'mail', 'inbox']],
    [['Squad', 'i-shirt', 'squad'], ['Squad Planner', 'plan'], ['Dynamics', 'team', 'dynamics'], ['Tactics', 'tactics'], ['Data Hub', 'radar'], ['Staff', 'team', 'staff'], ['Training', 'cone'], ['Medical Centre', 'medical']],
    [['Schedule', 'calendar', 'fixtures'], ['Competitions', 'cup', 'league']],
    [['Scouting', 'search', 'scouting'], ['Transfers', 'swap', 'transfers']],
    [['Club Info', 'shield', 'club'], ['Club Vision', 'case', 'vision'], ['Finances', 'money', 'finance']],
    [['Dev. Centre', 'trend', 'development']]
  ];
  const tabs = [
    ['Home', 'home'], ['My Profile', 'profile', true], ['My Contract', null, true], ['Promises'], ['Relationships'], ['My History', null, true], ['Notebook', 'notebook']
  ];

  function crest(id) {
    const c = typeof id === 'string' ? M.clubs[id] : id;
    if (!c) return '';
    const box = '<svg class="hc-crest" viewBox="0 0 100 100" aria-hidden="true" focusable="false">';
    if (id === 'rvr') return `${box}
      <circle cx="50" cy="50" r="47" fill="#123c71" stroke="#e9bd57" stroke-width="1.8"/>
      <circle cx="50" cy="50" r="42.5" fill="#1c64aa" stroke="#f6d78a" stroke-width=".6"/>
      <circle cx="50" cy="50" r="29" fill="#e9f2fa" stroke="#e8bd5c" stroke-width="1.8"/>
      <text x="50" y="18.6" fill="#fff1cc" text-anchor="middle" font-size="9.2" font-weight="900" letter-spacing=".7">RIVERSIDE</text>
      <text x="50" y="87" fill="#fff1cc" text-anchor="middle" font-size="8.2" font-weight="850" letter-spacing=".8">FC · 1896</text>
      <path d="M25 51c9-6 16-6 24-1 9 5 15 5 26-2v5c-11 7-18 7-27 2-8-4-15-4-23 1Zm4 9c7-4 14-3 20 1 8 4 14 3 22-1l-4 7c-7 2-12 1-18-2-6-3-10-3-15-1Z" fill="#215c9d"/>
      <path d="M45 29h10v19H45zM41 37h18v4H41z" fill="#204d88"/>
      <path d="M50 24l2 5h-4z" fill="#cd943e"/><circle cx="13" cy="49" r="3.2" fill="#f6c267"/><circle cx="87" cy="49" r="3.2" fill="#f6c267"/>
    </svg>`;
    if (id === 'hpt') return `${box}
      <path d="M8 3h84v45c0 24-13 41-42 50C21 89 8 72 8 48Z" fill="#e8c539" stroke="#fff060" stroke-width="2"/>
      <path d="M13 8h74v40c0 22-11 36-37 44C24 84 13 70 13 48Z" fill="#b8e4f5" stroke="#1d3a5c" stroke-width="3"/>
      <path d="M24 22h52v28c0 14-8 25-26 33-18-8-26-19-26-33Z" fill="#f4cc49" stroke="#283a51" stroke-width="2"/>
      <path d="M24 22h52v10H24zm0 42c9 0 13-5 21-5s13 5 21 5h9c-5 8-12 14-25 19-12-5-20-11-26-19Z" fill="#253c5b"/>
      <path d="M50 37v21m-9-16h18m-22 5c0 10 7 15 13 15s13-5 13-15m-26 0-4 4m30-4 4 4" fill="none" stroke="#273850" stroke-width="3.2" stroke-linecap="round"/>
      <circle cx="50" cy="35" r="3.5" fill="none" stroke="#273850" stroke-width="2"/>
      <path d="m46 13 4-4 4 4-4 4Z" fill="#dba421"/>
      <text x="50" y="76" fill="#f6edc6" text-anchor="middle" font-size="8.8" font-weight="900" letter-spacing=".6">HPT</text>
    </svg>`;
    const shield = 'M8 5h84v45c0 20-13 36-42 46C21 86 8 70 8 50Z';
    const glyphs = {
      nbu: '<path d="M23 63V40l13 7V33l14 8V29l15 8 12-3v29Z" fill="currentColor"/><path d="M31 62h38" fill="none" stroke="#bd263d" stroke-width="3"/>',
      kgd: '<path d="m26 39 10 9 14-19 14 19 10-9-5 25H31Z" fill="currentColor"/><circle cx="50" cy="28" r="4" fill="currentColor"/>',
      efc: '<path d="M27 64V45h13v19m5 0V33h12v31m5 0V44h12v20" fill="none" stroke="currentColor" stroke-width="6"/>',
      swl: '<path d="m22 62 19-27 14 20 8-10 15 17H22Z" fill="currentColor"/><path d="M20 69h60" stroke="currentColor" stroke-width="3"/>',
      oak: '<path d="M47 69v-9c-11 7-20-2-17-11-8-7-1-16 7-16 3-11 23-11 26 0 8 0 15 9 7 16 3 9-6 18-17 11v9Z" fill="currentColor"/>',
      crl: '<path d="M52 27c-4 10-18 18-18 28 0 11 7 17 16 17 10 0 17-6 17-15 0-8-6-15-10-18 1 8-5 11-8 12 5-7 5-15 3-24Z" fill="currentColor"/>'
    };
    return `${box}<path d="${shield}" fill="${c.primary}" stroke="${c.secondary}" stroke-width="5"/><path d="M14 18h72m-65 53h58" stroke="${c.secondary}" stroke-opacity=".7" stroke-width="2"/>
      <g style="color:${c.secondary}">${glyphs[id] || `<text x="50" y="60" fill="currentColor" text-anchor="middle" font-size="29" font-family="Barlow Condensed,sans-serif" font-weight="900">${esc(c.short.slice(0,2))}</text>`}</g>
      <text x="50" y="83" fill="${c.secondary}" text-anchor="middle" font-size="10" font-weight="900" letter-spacing=".9">${esc(c.short)}</text></svg>`;
  }

  function navigation() {
    $('homeNav').innerHTML = nav.map(group => `<div class="hc-nav-group">${group.map(([label, symbol, page]) => {
      const current = page === 'home' ? ' aria-current="page"' : '';
      const target = page ? ` data-hc-open="${page}"` : ' disabled title="Screen not added yet"';
      return `<button type="button" class="hc-nav-button"${current}${target}>${icon(symbol)}<span>${label}</span>${page === 'inbox' ? `<small class="hc-inbox-badge" id="homeUnread" aria-label="Unread messages" hidden></small>` : ''}</button>`;
    }).join('')}</div>`).join('');
    homeTabs();
  }
  function homeTabs() {
    $('homeTabs').innerHTML = tabs.map(([label, page, more]) => `<button class="hc-tab" type="button"${page === 'home' ? ' aria-current="page"' : ''}${page ? ` data-hc-open="${page}"` : ' disabled title="Screen not added yet"'}>${label}${more ? icon('down') : ''}</button>`).join('');
  }

  function fixtureRows() {
    return M.homeFixtures.map(f => {
      const club = M.clubs[f.opponent], next = f === M.next;
      const result = f.score ? `${f.score[0]} - ${f.score[1]}` : f.comp;
      const venue = f.venue === 'H' ? 'Home' : 'Away';
      return `<button class="hc-fixture-row" type="button" data-hc-fixture="${f.id}" data-next="${next}" aria-label="${M.shortDate(f.date)}, ${venue} against ${esc(club.name)}, ${f.score ? result : esc(M.fixtureCompetition(f))}">
        <time datetime="${new Date(f.date).toISOString()}">${M.shortDate(f.date)}</time><span title="${venue}">${f.venue}</span><span class="hc-fixture-club">${crest(club.id)}<span>${esc(club.name)}</span></span>${f.score ? '<i class="hc-form-dot" aria-hidden="true"></i>' : '<span></span>'}<span class="hc-fixture-result">${result}</span></button>`;
    }).join('');
  }

  function leagueChart() {
    const grid = Array.from({length:39}, (_, i) => `M${3 + i * 7} 7v28`).join('');
    const points = M.positionHistory.map((pos, i) => [4 + i * 6.3, 6 + pos * 1.7]);
    return `<svg class="hc-league-chart" viewBox="0 0 273 38" preserveAspectRatio="none" role="img" aria-label="Riverside rose back to first in the league positions chart">
      <path d="${grid}M3 7h266M3 30h266" stroke="currentColor" stroke-width=".7" opacity=".48" fill="none"/>
      <polyline points="${points.map(p => p.join(',')).join(' ')}" fill="none" stroke="#858dd1" stroke-width="1.4"/>
      ${points.map(([x,y]) => `<circle cx="${x}" cy="${y}" r="1.85" fill="#969de1"/>`).join('')}</svg>`;
  }
  function table() {
    return `<div class="hc-table-wrap" tabindex="0" role="region" aria-label="Scrollable league table"><table class="hc-table"><caption class="hc-sr">League table summary</caption><thead><tr><th scope="col">POS</th><th scope="col">TEAM</th><th scope="col" title="Played">P</th><th scope="col" title="Goal difference">GD</th><th scope="col" title="Points">PTS</th></tr></thead>
      <tbody>${M.standings.map((row, index) => {
        const club = M.clubs[row.id], move = row.move > 0 ? 'up' : 'down';
        return `<tr class="${row.id === M.homeId ? 'hc-table-home' : index < 7 ? 'hc-tier' : ''}"><td><span class="hc-place">${M.ordinal(index + 1)}${row.move ? `<span class="hc-move" data-move="${move}" title="Moved ${move}">${row.move > 0 ? '⌃' : '⌄'}</span>` : ''}</span></td>
          <td><span class="hc-club-cell">${crest(row.id)}<span title="${esc(club.name)}">${esc(club.name)}</span></span></td><td>${row.played}</td><td>${row.gd}</td><td>${row.pts}</td></tr>`;
      }).join('')}</tbody></table></div>`;
  }

  function leaderRows() {
    return M.leaders.map(({icon: metric, label, player, value}) => `<article class="hc-leader"><span class="hc-leader-art">${icon(metric)}<img class="hc-portrait" src="${portraitImages[M.portraitFor[player.id]]}" alt="" width="45" height="52"></span><p class="hc-leader-copy"><span>${esc(label)}</span><strong>${esc(player.name)}</strong><small>${esc(value)}</small></p></article>`).join('');
  }

  function financeChart() {
    const x0 = 74, x1 = 247, top = 9, bottom = 140;
    const y = value => top + (500 - value) * (bottom - top) / 900;
    const base = +y(0).toFixed(2);
    const points = M.finance.history.map((value, i, a) => `${(x0 + i * (x1 - x0) / (a.length - 1)).toFixed(2)},${y(value).toFixed(2)}`);
    const labels = [500, 300, 100, -100, -300].map(value => {
      const py = y(value).toFixed(2), amount = value < 0 ? `(£${-value}M)` : `£${value}M`;
      return `<path d="M${x0-4} ${py}h4"/><text x="${x0-6}" y="${py}" dy=".3em" text-anchor="end" stroke="none">${amount}</text>`;
    }).join('');
    const ticks = Array.from({length:28}, (_, i) => `M${(x0 + i * (x1 - x0) / 27).toFixed(1)} ${base}v5`).join('');
    return `<svg class="hc-finance-chart" viewBox="0 0 274 146" role="img" aria-label="Season balance history: below zero in September, recovering through October to 347 million pounds">
      <path d="M${x0} ${base} L${points.join(' L')} L${x1} ${base} Z" fill="#ec609b"/>
      <g stroke="#8990a6" stroke-width=".75" fill="none"><path d="M${x0} ${top}v${bottom-top}M${x0} ${base}h${x1-x0}"/><path d="${ticks}"/></g>
      <g font-family="Inter, sans-serif" font-size="12" fill="#f2eff8" stroke="#8990a6" stroke-width=".75">${labels}</g>
      <g font-family="Inter, sans-serif" font-size="10.5" fill="#f4f3fb"><text x="${x0+2}" y="${base+16}">Sep</text><text x="${x0+81}" y="${base+16}">Oct</text><text x="${x1-11}" y="${base+16}">Oct</text></g></svg>`;
  }
  function finance() {
    const f = desk.budgets();
    return `${financeChart()}<div class="hc-finance-metrics"><div><strong>Overall balance</strong><span class="hc-amount">${M.money(f.balance)}</span></div><div><strong>Profit/(loss) this season</strong><span class="hc-amount">${M.money(f.profit)}</span></div></div>
      <section class="hc-budget"><h3>Transfer budget</h3><span class="hc-amount">${M.money(f.transfer)}</span><p>Original budget was ${M.millions(f.original)}<br>${f.retention}% of transfer revenue is made available<br>Next season’s minimum guaranteed budget will be ${M.millions(f.nextSeason)}.</p></section>
      <section class="hc-budget"><h3>Wage budget</h3><span class="hc-amount">${M.money(f.wage)} p/w</span><p>Currently spending ${M.money(f.spending)} p/w<br>Committed spending ${M.money(f.committed)} p/w<br>Available Wage Budget: ${M.millions(f.wage - f.committed)} per week</p></section>`;
  }

  function refreshTime() {
    const now = M.calendar(state.now), next = M.calendar(M.next.date);
    $('homeClock').dateTime = new Date(state.now).toISOString();
    $('homeNextDate').dateTime = new Date(M.next.date).toISOString();
    text('homeDay', now.day); text('homeDate', now.date);
    text('homeNextDate', `${next.long} (${M.leadTime(state.now, M.next.date)})`);
    syncClub();
  }

  function renderHome() {
    const home = M.clubs[M.homeId], away = M.clubs[M.next.opponent];
    const host = M.next.venue === 'H' ? home : away;
    text('homeManager', `${M.manager} – ${home.name}`);
    text('homeFixtureTitle', `${host.name} v ${(host === home ? away : home).name}`);
    text('homeCompetition', M.competition[M.next.comp]);
    text('homeStadium', host.stadium);
    text('homeOpponentManager', M.opponentManager);
    text('homeFixturesTitle', `${home.city} fixtures`);
    for (const id of ['homeHeaderCrest', 'homeBigCrest']) $(id).innerHTML = crest(home.id);
    $('homeOpponentCrest').innerHTML = crest(away.id);
    $('homeFixtures').innerHTML = fixtureRows();
    $('homeLeague').innerHTML = `<div class="hc-league-top"><span>League Positions</span><span class="hc-form" aria-label="Recent form: five wins" title="Recent form: five wins"><i></i><i></i><i></i><i></i><i></i></span></div>${leagueChart()}${table()}`;
    $('homeLeaders').innerHTML = leaderRows();
    $('homeFinance').innerHTML = finance();
    refreshTime();
  }

  const routes = {
    home:['Home','home'], inbox:['Inbox','inbox'], squad:['Squad','squad'], dynamics:['Dynamics','dynamics'], staff:['Staff','staff'],
    fixtures:['Schedule & fixtures','schedule'], league:['Competitions & league table','competitions','competitions','PD'],
    scouting:['Scouting','scouting'], transfers:['Transfers','transfers'], club:['Club information','club'], vision:['Club Vision','vision'],
    finance:['Finances','finance'], development:['Development Centre','development'], leaders:['Player stats','squad','stats']
  };
  const modalTitles = {profile:'Manager profile',search:'Search',notebook:'Notebook',help:'Clubhouse guide'};
  const datum = (label, value) => `<p class="hc-datum"><strong>${esc(value)}</strong><span>${esc(label)}</span></p>`;
  const sectionLink = (id, label) => `<button class="hc-dialog-link" type="button" data-hc-open="${id}">${esc(label)}${icon('chevron')}</button>`;
  function sectionBody(id) {
    const c = M.clubs[M.homeId];
    switch (id) {
      case 'profile': return datum('Manager', M.manager) + datum('Current club', c.name) + datum('Role', 'First-team manager');
      case 'search': return '<label for="homeSearchInput">Find a section of the clubhouse</label><input class="hc-search-field" type="search" id="homeSearchInput" autocomplete="off" placeholder="Try fixtures, scouting or finances"><div id="homeSearchResults"></div>';
      case 'notebook': return '<p>Keep your own notes about the club. Notes stay on this device when storage is available.</p><label class="hc-sr" for="homeNotes">Club notes</label><textarea class="hc-notebook" id="homeNotes" maxlength="16000" placeholder="Write a note…"></textarea>';
      case 'help': return `<p>Explore Riverside’s fictional 2024/25 season. The club pages share the fixtures, squad and budgets you see on Home.</p><ul class="hc-details-list"><li>Continue opens the displayed cup fixture without kicking off. Home holds the match at its current playhead.</li><li>In the Inbox reader, Next Unread opens the next unread message. Switch to Home or Schedule to enter the match at any time.</li><li>Planning changes stay in this browser when storage is allowed. Drafts and requests aren’t sent. No living season or transfer market runs in the background.</li></ul>`;
      default: return '';
    }
  }
  function search() {
    const input = $('homeSearchInput'), list = $('homeSearchResults'), q = input.value.trim().toLowerCase();
    const entries = [...Object.entries(routes).map(([id,[label]])=>[id,label]), ['profile',modalTitles.profile], ['notebook',modalTitles.notebook]];
    const match = entries.filter(([id,label]) => !q || `${id} ${label} ${id==='club'?'Riverside FC':''}`.toLowerCase().includes(q));
    list.innerHTML = match.length ? match.map(([id,label])=>sectionLink(id,label)).join('') : '<p class="hc-message">No matching sections.</p>';
  }
  function showPanel(title, body) {
    toggleDrawer(false);
    text('homeDialogTitle', title);
    $('homeDialogBody').innerHTML = body;
    const dlg = $('homeDialog');
    if (!dlg.open) dlg.showModal();
    dlg.scrollTop = 0;
  }
  function openPanel(id) {
    if (Object.hasOwn(routes,id)) {
      const [,page,tab,detail] = routes[id];
      toggleDrawer(false, state.drawer && desk.route().page===page);
      desk.go(page,tab,detail);
      return;
    }
    if (!Object.hasOwn(modalTitles,id)) return;
    showPanel(modalTitles[id], sectionBody(id));
    if (id === 'search') { search(); $('homeSearchInput').focus(); }
    else if (id === 'notebook') { $('homeNotes').value = state.note; $('homeNotes').focus(); }
  }
  function onPage(r, view, history) {
    const root=$('homeScreen'); root.dataset.page = r.page;
    $('homeMain').hidden = r.page!=='home';
    if (!view) homeTabs();
    text('homeTitle', view?.title || 'Home');
    const navButtons = $('homeNav').querySelectorAll('[data-hc-open]');
    for (const b of navButtons) {
      if (routes[b.dataset.hcOpen]?.[1]===r.page) b.setAttribute('aria-current','page');
      else b.removeAttribute('aria-current');
    }
    $('homeBack').disabled=!history.back; $('homeForward').disabled=!history.forward;
    document.title = `Touchline 26 — ${view?.title || 'Club Home'}`;
    syncClub();
  }
  function syncClub() {
    if (!desk) return;
    const r=desk.route(), unread=desk.unread().length, badge=$('homeUnread');
    badge.hidden=unread===0; badge.textContent=unread; badge.setAttribute('aria-label',`${unread} unread messages`);
    const continueButton=$('homeContinue'), nextUnread=r.page==='inbox'&&r.tab==='messages'&&unread>0;
    continueButton.querySelector('span').textContent=nextUnread?'Next Unread':'Continue';
    continueButton.title=nextUnread?'Open the next unread message':state.entered?'Return to your match':'Advance to the next fixture';
    if (r.page==='home') text('homeManager', `${M.manager} – ${M.clubs[M.homeId].name}`);
    else text('homeManager', desk.view()?.subtitle?.(desk.context()) || `${M.ordinal(M.standings.findIndex(row=>row.id===M.homeId)+1)} in ${M.division} · Next: ${M.clubs[M.next.opponent].name} (${M.next.venue}) · ${M.leadTime(state.now,M.next.date)}`);
    const f=desk.budgets(), financeKey=`${f.transfer}:${f.wage}`;
    if ($('homeFinance').dataset.allocation!==financeKey) {
      $('homeFinance').innerHTML=finance(); $('homeFinance').dataset.allocation=financeKey;
    }
  }

  function toggleDrawer(open, focus = false) {
    const wasOpen = state.drawer;
    state.drawer = open;
    $('homeSidebar').classList.toggle('hc-open', open);
    $('homeScrim').hidden = !open;
    $('homeFrame').inert = open;
    $('homeMenu').setAttribute('aria-expanded', String(open));
    if (open && focus) ($('homeNav').querySelector('[aria-current=page]') || $('homeNav').querySelector('button')).focus();
    else if (wasOpen && focus) $('homeMenu').focus();
  }
  function enterMatch() {
    if ($('homeScreen').hidden) return;
    if ($('homeDialog').open) $('homeDialog').close();
    toggleDrawer(false);
    state.entered = true; state.now = M.next.date;
    refreshTime();
    state.pageY = global.scrollY; state.contentY = $('homeMain').scrollTop;
    state.entryPage = desk.route().page;
    $('homeScreen').hidden = true;
    $('matchScreen').hidden = false;
    document.title = 'Touchline 26 — Classic 2D';
    global.scrollTo(0, 0);
    global.TLMatchView.open(M.matchConfig());
    $('btnPlay').focus({ preventScroll: true });
  }
  function returnHome() {
    if ($('matchScreen').hidden) return;
    global.TLMatchView.suspend();
    $('matchScreen').hidden = true;
    $('homeScreen').hidden = false;
    desk.go('home');
    document.title = 'Touchline 26 — Club Home';
    if (state.entryPage === 'home') {
      $('homeMain').scrollTop = state.contentY;
      global.scrollTo(0, state.pageY);
    }
    $('homeContinue').focus({ preventScroll: true });
  }

  function init() {
    try { state.note = global.localStorage.getItem(NOTE_KEY) || ''; } catch { /* Opaque offline iframe. */ }
    const root = $('homeScreen');
    desk = global.TLClubDesk.create({ root, content:$('clubPage'), tabs:$('homeTabs'), dialog:$('homeDialog'), crest,
      portrait:id=>portraitImages[M.portraitFor[id]], showPanel, onPage, onState:syncClub, scrollHome:()=>$('homeMain').scrollTop=0, now:()=>state.now });
    navigation(); renderHome();
    root.dataset.page='home';
    root.addEventListener('club-play', enterMatch);
    root.addEventListener('click', e => {
      const button = e.target.closest('button');
      if (!button || button.disabled) return;
      if (button.id === 'homeContinue') {
        if (desk.route().page==='inbox' && desk.route().tab==='messages' && desk.unread().length) desk.act('next-unread');
        else enterMatch();
      } else if (button.id === 'homeBack') desk.step(-1);
      else if (button.id === 'homeForward') desk.step(1);
      else if (button.id === 'homeDialogClose') $('homeDialog').close();
      else if (button.id === 'homeMenu') toggleDrawer(!state.drawer, true);
      else if (button.id === 'homeScrim') toggleDrawer(false, true);
      else if (button.hasAttribute('data-hc-open')) openPanel(button.dataset.hcOpen);
      else if (button.hasAttribute('data-hc-fixture')) desk.go('schedule','fixtures',button.dataset.hcFixture);
      else if (button.hasAttribute('data-hc-collapse')) {
        const body = $(button.dataset.hcCollapse);
        body.hidden = !body.hidden;
        button.setAttribute('aria-expanded', String(!body.hidden));
      }
    });
    root.addEventListener('input', e => {
      if (e.target.id === 'homeSearchInput') search();
      else if (e.target.id === 'homeNotes') {
        state.note = e.target.value;
        try { global.localStorage.setItem(NOTE_KEY, state.note); } catch { /* Keep the current session editable. */ }
      }
    });
    document.querySelectorAll('[data-return-home]').forEach(button => button.addEventListener('click', returnHome));
    document.addEventListener('keydown', e => {
      if (!root.hidden && state.drawer && e.key === 'Escape' && !$('homeDialog').open) toggleDrawer(false, true);
    });
    global.matchMedia?.('(max-width:925px)').addEventListener?.('change', () => toggleDrawer(false));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})(typeof window !== 'undefined' ? window : globalThis);
