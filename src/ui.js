/* TOUCHLINE 26 — UI application layer (original code) */
(function (global) {
  'use strict';
  const D = global.TLData, E = global.TLEngine, R = global.TLRender, A = global.TLAudio;
  const $ = id => document.getElementById(id);
  const SPEEDS = [0, 6, 12, 24];
  const H = 1 / 40;

  const state = {
    mode: 'prematch', home: 0, away: 1, preForm: '4-3-3', preMent: 2,
    match: null, renderer: null,
    speed: 1, paused: false, acc: 0,
    replay: null, lastGoalFrames: null, autoReplay: true,
    buffer: [], playerMeta: {},
    subMode: null, ff: false, ffBudget: 0,
    keyOnly: false, statsT: 0, selected: null
  };

  const ICONS = {
    goal: '⚽', og: '⚽', penscore: '⚽', save: '🧤', catch: '🧤', miss: '↗', block: '🛡️', post: '⚡',
    foul: '📣', yellow: '🟨', red: '🟥', pen: '🎯', penmiss: '🧤', offside: '🚫', corner: '🚩',
    throwin: '↪', goalkick: '⬡', freekick: '📣', sub: '🔁', kickoff: '▶', ht: '⏸', ft: '⏹',
    stoppage: '⏱', header: '👤', cross: '↪', longshot: '🚀', tackle: '💥', clear: '⬆', chance: '❗', preview: '📋'
  };
  const ALWAYS_KEY = new Set(['goal', 'og', 'penscore', 'pen', 'penmiss', 'red', 'yellow', 'sub', 'ht', 'ft', 'post', 'kickoff']);

  /* ---------- prematch ---------- */
  function clubCard(club, idx, side) {
    const el = document.createElement('div');
    el.className = 'club-card';
    el.innerHTML = `<span class="cc-badge" style="background:${club.primary};color:${club.secondary}">${club.short}</span>
      <span class="cc-name">${club.name}</span>
      <span class="cc-meta">${'★'.repeat(Math.round(club.rep / 20))} · ${club.style.toUpperCase()}</span>`;
    el.onclick = () => {
      if (side === 'home') state.home = idx; else state.away = idx;
      if (state.home === state.away) { if (side === 'home') state.away = (idx + 1) % D.CLUBS.length; else state.home = (idx + 1) % D.CLUBS.length; }
      refreshPrematch();
    };
    el.dataset.idx = idx; el.dataset.side = side;
    return el;
  }
  function refreshPrematch() {
    document.querySelectorAll('.club-card').forEach(el => {
      const i = +el.dataset.idx;
      el.classList.toggle('sel', (el.dataset.side === 'home' && i === state.home) || (el.dataset.side === 'away' && i === state.away));
    });
    const squad = D.genSquad(D.CLUBS[state.home], D.seedFor(D.CLUBS[state.home].id));
    const { xi } = D.bestXI(squad, state.preForm);
    $('preXI').innerHTML = xi.map(s => `<span><b>${s.player.num}</b> ${s.player.name.split(' ').pop()} <i>${s.role}</i></span>`).join('');
  }
  function buildPrematch() {
    const hg = $('homeGrid'), ag = $('awayGrid');
    D.CLUBS.forEach((c, i) => { hg.appendChild(clubCard(c, i, 'home')); ag.appendChild(clubCard(c, i, 'away')); });
    const fs = $('preForm');
    Object.keys(D.FORMATIONS).forEach(f => { const o = document.createElement('option'); o.value = f; o.textContent = f; fs.appendChild(o); });
    fs.value = state.preForm;
    fs.onchange = () => { state.preForm = fs.value; refreshPrematch(); };
    const ms = $('preMent');
    D.MENTALITIES.forEach((m, i) => { const o = document.createElement('option'); o.value = i; o.textContent = m; ms.appendChild(o); });
    ms.value = state.preMent;
    ms.onchange = () => { state.preMent = +ms.value; };
    $('preReplay').onchange = e => { state.autoReplay = e.target.checked; $('optReplay').checked = e.target.checked; };
    $('preSound').onchange = e => { A.setMuted(!e.target.checked); $('optSound').checked = e.target.checked; };
    $('btnKick').onclick = startMatch;
    refreshPrematch();
  }

  /* ---------- match lifecycle ---------- */
  function startMatch() {
    A.init(); A.resume();
    const homeClub = D.CLUBS[state.home], awayClub = D.CLUBS[state.away];
    const homeTactics = { ...D.defaultTactics(homeClub.style), formation: state.preForm, mentality: state.preMent };
    state.buffer = []; state.lastGoalFrames = null; state.replay = null; state.subMode = null; state.ff = false;
    state.match = new E.Match(homeClub, awayClub, {
      seed: (Date.now() % 1000000007) | 0,
      homeTactics,
      onEvent: onEvent,
      onSnapshot: snap => { state.buffer.push(snap); if (state.buffer.length > 700) state.buffer.shift(); }
    });
    state.playerMeta = {};
    for (const t of state.match.teams) for (const p of t.players) state.playerMeta[p.id] = { team: p.team, num: p.num, name: p.name, pos: p.pos, id: p.id, yellow: 0, dir: 0 };
    state.mode = 'match'; state.paused = false; state.speed = 1; state.acc = 0;
    $('prematch').classList.add('hidden'); $('app').classList.remove('hidden'); $('overlay').classList.add('hidden');
    $('comlist').innerHTML = '';
    // scoreboard
    $('nameH').textContent = homeClub.short; $('nameA').textContent = awayClub.short;
    $('badgeH').style.background = homeClub.primary; $('badgeH').style.color = homeClub.secondary; $('badgeH').textContent = homeClub.short;
    $('badgeA').style.background = awayClub.primary; $('badgeA').style.color = awayClub.secondary; $('badgeA').textContent = awayClub.short;
    document.documentElement.style.setProperty('--home-col', homeClub.primary);
    document.documentElement.style.setProperty('--away-col', awayClub.primary);
    buildTacticsTab(); refreshSquad(); updateHUD(); updateStats(true);
    state.renderer.resize();
    A.whistle(false);
  }

  function onEvent(ev) {
    const m = state.match;
    // commentary
    if (ev.text && ev.type !== 'preview') addCommentary(ev);
    const isKey = ALWAYS_KEY.has(ev.type) || ev.key;
    if (state.ff && isKey && !['kickoff', 'stoppage'].includes(ev.type)) { state.ff = false; $('ffBadge').classList.add('hidden'); }
    switch (ev.type) {
      case 'goal': case 'og': case 'penscore': {
        updateHUD();
        const team = m.teams[ev.team];
        const lineX = team.attackDir > 0 ? E.L : 0;
        state.renderer.spawnGoalParticles(m, lineX);
        A.goal();
        showGoalBanner(ev, team);
        const goalT = (ev.half === 2 ? 2700 : 0) + ev.t;
        const frames = state.buffer.filter(f => f.t >= goalT - 8 && f.t <= goalT + 0.06);
        if (frames.length > 10) {
          state.lastGoalFrames = frames;
          if (state.autoReplay) startReplay(frames);
        }
        flashScore(ev.team);
        break;
      }
      case 'save': case 'catch': case 'block': A.kick(0.8); if (ev.key) A.bigChance(); break;
      case 'post': A.kick(1); A.bigChance(); toast('OFF THE POST!'); break;
      case 'miss': A.kick(0.7); break;
      case 'pen': A.whistle(false); A.bigChance(); toast('PENALTY!'); break;
      case 'penmiss': A.bigChance(); break;
      case 'foul': A.foul(); break;
      case 'offside': A.whistle(false); break;
      case 'yellow': toast('🟨 Yellow — ' + (ev.player ? ev.player.name : '')); refreshSquad(); A.foul(); break;
      case 'red': toast('🟥 RED CARD — ' + (ev.player ? ev.player.name : '')); refreshSquad(); A.whistle(true); break;
      case 'sub': refreshSquad(); break;
      case 'stoppage': updateHUD(); break;
      case 'ht': A.whistle(true); state.paused = true; showOverlay('ht'); break;
      case 'ft': A.whistle(false, true); state.paused = true; showOverlay('ft'); break;
      case 'kickoff': if (ev.minute > 1) A.whistle(false); updateHUD(); break;
    }
    if (['goal', 'og', 'penscore', 'sub', 'yellow', 'red'].includes(ev.type)) updateStats(true);
  }

  function addCommentary(ev) {
    const list = $('comlist');
    const el = document.createElement('div');
    const isKey = ALWAYS_KEY.has(ev.type) || ev.key;
    el.className = 'com-item' + (isKey ? ' key' : '');
    el.innerHTML = `<span class="com-min">${ev.minute}'</span><span class="com-ico">${ICONS[ev.type] || '•'}</span><span class="com-txt">${ev.text}</span>`;
    list.prepend(el);
    while (list.children.length > 90) list.removeChild(list.lastChild);
  }

  /* ---------- overlays / banners ---------- */
  let gbTimer = null;
  function showGoalBanner(ev, team) {
    const gb = $('goalBanner');
    const lg = state.match.lastGoal;
    gb.style.borderColor = team.club.primary;
    gb.style.setProperty('--gb-col', team.club.primary);
    $('gbTeam').textContent = team.club.name.toUpperCase();
    $('gbScorer').textContent = lg.og ? 'OWN GOAL — ' + lg.scorer : '⚽ ' + lg.scorer;
    $('gbMeta').textContent = `${lg.minute}' · ${lg.assist ? 'Assist: ' + lg.assist + ' · ' : ''}${lg.pen ? 'Penalty · ' : ''}xG ${lg.xg.toFixed(2)}`;
    gb.classList.remove('hidden');
    clearTimeout(gbTimer);
    gbTimer = setTimeout(() => gb.classList.add('hidden'), 5200);
  }
  function flashScore(team) {
    const el = $('score');
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  }
  let toastTimer = null;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add('hidden'), 2600);
  }

  function scorersList() {
    const m = state.match;
    return m.events.filter(e => ['goal', 'og', 'penscore'].includes(e.type))
      .map(e => {
        const t = m.teams[e.team];
        return `<div class="ov-scorer"><span class="dot" style="background:${t.club.primary}"></span>${e.minute}' ${e.player ? e.player.name : ''} ${e.type === 'og' ? '(OG)' : e.type === 'penscore' ? '(P)' : ''} <i>${t.club.short}</i></div>`;
      }).join('') || '<div class="ov-scorer">No goals</div>';
  }
  function showOverlay(kind) {
    const m = state.match;
    const ov = $('overlay');
    ov.classList.remove('hidden');
    $('ovTitle').textContent = kind === 'ht' ? 'HALF TIME' : 'FULL TIME';
    $('ovScore').innerHTML = `<span>${m.teams[0].club.short}</span> <b>${m.teams[0].score} – ${m.teams[1].score}</b> <span>${m.teams[1].club.short}</span>`;
    $('ovScorers').innerHTML = scorersList();
    const s0 = m.teams[0].stats, s1 = m.teams[1].stats;
    const pt = m.possTime[0] + m.possTime[1] || 1;
    const rows = [
      ['Possession', Math.round(m.possTime[0] / pt * 100) + '%', Math.round(m.possTime[1] / pt * 100) + '%'],
      ['Shots', s0.shots, s1.shots], ['On target', s0.onTarget, s1.onTarget],
      ['xG', s0.xG.toFixed(2), s1.xG.toFixed(2)],
      ['Passes', s0.passes, s1.passes], ['Corners', s0.corners, s1.corners]
    ];
    $('ovStats').innerHTML = rows.map(r => `<div class="ov-row"><span>${r[1]}</span><em>${r[0]}</em><span>${r[2]}</span></div>`).join('');
    if (kind === 'ft') {
      let motm = null;
      for (const t of m.teams) for (const s of t.slots) if (!motm || s.player.rating > motm.rating) motm = s.player;
      $('ovMotm').innerHTML = motm ? `🏅 Player of the Match: <b>${motm.name}</b> (${m.teams[motm.team].club.short}) — ${motm.rating.toFixed(1)}` : '';
      $('ovContinue').textContent = 'NEW MATCH ▸';
      $('ovContinue').onclick = () => { ov.classList.add('hidden'); $('app').classList.add('hidden'); $('prematch').classList.remove('hidden'); state.mode = 'prematch'; };
    } else {
      $('ovMotm').innerHTML = '';
      $('ovContinue').textContent = 'SECOND HALF ▸';
      $('ovContinue').onclick = () => {
        ov.classList.add('hidden');
        m.continueSecondHalf();
        state.paused = false;
        refreshSquad(); updateHUD();
      };
    }
  }

  /* ---------- replay ---------- */
  function startReplay(frames) {
    state.replay = { frames, i: 0, acc: 0, frame: null };
    $('replayBadge').classList.remove('hidden');
    $('replayBars').classList.remove('hidden');
  }
  function endReplay() {
    state.replay = null;
    $('replayBadge').classList.add('hidden');
    $('replayBars').classList.add('hidden');
  }
  function buildReplayFrame() {
    const rp = state.replay;
    const snap = rp.frames[rp.i];
    const prev = rp.frames[Math.max(0, rp.i - 1)];
    const players = [];
    for (let j = 0; j < snap.n; j++) {
      const meta = state.playerMeta[snap.ids[j]];
      const x = snap.arr[j * 2], y = snap.arr[j * 2 + 1];
      const px = prev.arr[j * 2], py = prev.arr[j * 2 + 1];
      const dir = (Math.abs(x - px) + Math.abs(y - py)) > 0.005 ? Math.atan2(y - py, x - px) : meta.dir;
      meta.dir = dir;
      players.push({ ...meta, x, y, dir, yellow: 0 });
    }
    rp.frame = { players, bx: snap.arr[snap.n * 2], by: snap.arr[snap.n * 2 + 1], bz: snap.arr[snap.n * 2 + 2], ownerIdx: snap.arr[snap.n * 2 + 3] };
  }

  /* ---------- tabs ---------- */
  function buildTacticsTab() {
    const m = state.match;
    const t = m.teams[0].tactics;
    const mk = (id, label, opts, val, key, numeric) => {
      const row = document.createElement('div'); row.className = 'tac-row';
      row.innerHTML = `<label>${label}</label>`;
      const sel = document.createElement('select');
      opts.forEach((o, i) => { const op = document.createElement('option'); op.value = numeric ? i : o; op.textContent = o; sel.appendChild(op); });
      sel.value = val;
      sel.onchange = () => { m.setTactics(0, { [key]: numeric ? +sel.value : sel.value }); if (key === 'formation') refreshSquad(); toast('Tactics updated'); };
      row.appendChild(sel);
      $(id).appendChild(row);
    };
    $('tab-tactics').innerHTML = '<div class="tac-note">Instructions apply live — players adapt instantly.</div>';
    mk('tab-tactics', 'Formation', Object.keys(D.FORMATIONS), t.formation, 'formation', false);
    mk('tab-tactics', 'Mentality', D.MENTALITIES, t.mentality, 'mentality', true);
    mk('tab-tactics', 'Passing', D.PASSING, t.passing, 'passing', true);
    mk('tab-tactics', 'Tempo', D.TEMPO, t.tempo, 'tempo', true);
    mk('tab-tactics', 'Pressing', D.PRESS, t.press, 'press', true);
    mk('tab-tactics', 'Width', D.WIDTH, t.width, 'width', true);
    mk('tab-tactics', 'Defensive Line', D.LINE, t.line, 'line', true);
    const away = document.createElement('div'); away.className = 'tac-away';
    const at = m.teams[1].tactics;
    away.innerHTML = `<b>Opposition setup</b><br>${m.teams[1].club.name}: ${at.formation} · ${D.MENTALITIES[at.mentality]} · ${D.PASSING[at.passing]} passing · ${D.PRESS[at.press]} press`;
    $('tab-tactics').appendChild(away);
  }

  function condColor(c) { return c > 0.75 ? '#3ddc84' : c > 0.55 ? '#ffd166' : '#ff6b6b'; }
  function ratingColor(r) { return r >= 7.5 ? '#3ddc84' : r >= 6.8 ? '#a3e635' : r >= 6.2 ? '#ffd166' : '#ff6b6b'; }

  function refreshSquad() {
    const m = state.match; if (!m) return;
    const team = m.teams[0];
    $('subsLeft').textContent = (5 - team.subsUsed) + ' subs remaining';
    const xi = $('xiList'); xi.innerHTML = '';
    for (const s of team.slots) {
      const p = s.player;
      const row = document.createElement('div');
      row.className = 'pl-row' + (state.subMode ? ' replaceable' : '');
      row.innerHTML = `<span class="pl-num">${p.num}</span><span class="pl-name">${p.name}</span>
        <span class="pl-role">${s.role}</span>
        <span class="pl-cond"><i style="width:${Math.round(p.cond * 100)}%;background:${condColor(p.cond)}"></i></span>
        <span class="pl-rating" style="color:${ratingColor(p.rating)}">${p.rating.toFixed(1)}</span>
        <span class="pl-cards">${p.yellow ? '🟨'.repeat(Math.min(p.yellow, 1)) : ''}</span>`;
      row.onclick = () => {
        if (state.subMode) doSub(p.id);
        else showPlayerCard(p);
      };
      xi.appendChild(row);
    }
    const bench = $('benchList'); bench.innerHTML = '';
    for (const p of team.bench) {
      const row = document.createElement('div'); row.className = 'pl-row bench';
      row.innerHTML = `<span class="pl-num">${p.num}</span><span class="pl-name">${p.name}</span><span class="pl-role">${p.pos}</span>`;
      const btn = document.createElement('button'); btn.className = 'sub-btn'; btn.textContent = 'ON';
      btn.onclick = e => {
        e.stopPropagation();
        if (team.subsUsed >= 5) { toast('No substitutions remaining'); return; }
        state.subMode = { benchId: p.id };
        $('subBanner').classList.remove('hidden');
        $('subBanner').innerHTML = `🔁 Bringing on <b>${p.name}</b> — click a starting player to replace (Esc to cancel)`;
        refreshSquad();
      };
      row.appendChild(btn);
      bench.appendChild(row);
    }
  }
  function doSub(outId) {
    const res = state.match.substitute(0, outId, state.subMode.benchId);
    state.subMode = null;
    $('subBanner').classList.add('hidden');
    if (!res.ok) toast(res.msg);
    refreshSquad();
  }

  function showPlayerCard(p) {
    state.selected = p.id;
    state.renderer.selected = p.id;
    const card = $('playerCard');
    const team = state.match.teams[p.team];
    const a = p.attrs;
    const top = Object.entries(a).filter(([k]) => !['handling', 'reflexes'].includes(k) || p.pos === 'GK')
      .sort((x, y) => y[1] - x[1]).slice(0, 4);
    card.innerHTML = `<div class="pc-head" style="border-color:${team.club.primary}">
        <b>#${p.num} ${p.name}</b><span>${p.role || p.pos} · ${p.age}y · ${team.club.short}</span></div>
      <div class="pc-grid">
        <span>Rating <b style="color:${ratingColor(p.rating)}">${p.rating.toFixed(1)}</b></span>
        <span>Condition <b style="color:${condColor(p.cond)}">${Math.round(p.cond * 100)}%</b></span>
        ${p.stats.goals ? `<span>Goals <b>${p.stats.goals}</b></span>` : ''}
        ${p.stats.assists ? `<span>Assists <b>${p.stats.assists}</b></span>` : ''}
        <span>Shots <b>${p.stats.shots}</b></span>
        <span>Passes <b>${p.stats.passWon}/${p.stats.passes}</b></span>
        ${p.pos === 'GK' ? `<span>Saves <b>${p.stats.saves}</b></span>` : `<span>Tackles <b>${p.stats.tackles}</b></span>`}
      </div>
      <div class="pc-attrs">${top.map(([k, v]) => `<span>${k.slice(0, 3).toUpperCase()} <b>${v}</b></span>`).join('')}</div>`;
    card.classList.remove('hidden');
  }

  /* ---------- stats ---------- */
  function statRow(label, a, b, fmtA, fmtB) {
    const va = fmtA != null ? fmtA : a, vb = fmtB != null ? fmtB : b;
    const total = (typeof a === 'number' && typeof b === 'number') ? (a + b || 1) : 0;
    const pa = total ? a / total * 100 : 50;
    return `<div class="st-row"><span class="st-a">${va}</span><span class="st-l">${label}</span><span class="st-b">${vb}</span></div>
      ${total ? `<div class="st-bar"><i style="width:${pa}%"></i></div>` : ''}`;
  }
  function updateStats(force) {
    const m = state.match; if (!m) return;
    const s0 = m.teams[0].stats, s1 = m.teams[1].stats;
    const pt = m.possTime[0] + m.possTime[1] || 1;
    const p0 = Math.round(m.possTime[0] / pt * 100), p1 = 100 - p0;
    $('statsBody').innerHTML =
      statRow('Possession', p0, p1, p0 + '%', p1 + '%') +
      statRow('Shots', s0.shots, s1.shots) +
      statRow('On target', s0.onTarget, s1.onTarget) +
      statRow('xG', s0.xG, s1.xG, s0.xG.toFixed(2), s1.xG.toFixed(2)) +
      statRow('Pass accuracy', s0.passes ? s0.passWon / s0.passes : 0, s1.passes ? s1.passWon / s1.passes : 0,
        Math.round((s0.passes ? s0.passWon / s0.passes : 0) * 100) + '%', Math.round((s1.passes ? s1.passWon / s1.passes : 0) * 100) + '%') +
      statRow('Tackles', s0.tackles, s1.tackles) +
      statRow('Fouls', s0.fouls, s1.fouls) +
      statRow('Corners', s0.corners, s1.corners) +
      statRow('Offsides', s0.offsides, s1.offsides) +
      statRow('Saves', s0.saves, s1.saves) +
      statRow('Cards', s0.yellow + s0.red, s1.yellow + s1.red);
    drawMomentum(); drawShotMap();
  }
  function drawMomentum() {
    const cv = $('momCv'); if (!cv) return;
    const m = state.match;
    const w = cv.width = cv.parentElement.clientWidth - 2;
    const h = cv.height = 64;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#0d1319'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
    const maxT = 5700;
    for (const s of m.momentum) {
      const x = s.t / maxT * w;
      const bh = Math.abs(s.v) * (h / 2 - 3);
      ctx.fillStyle = s.v >= 0 ? m.teams[0].club.primary : m.teams[1].club.primary;
      ctx.globalAlpha = 0.85;
      if (s.v >= 0) ctx.fillRect(x, h / 2 - bh, Math.max(1.5, w / 300), bh);
      else ctx.fillRect(x, h / 2, Math.max(1.5, w / 300), bh);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '8px system-ui';
    ctx.fillText('HT', w / 2 - 5, 9);
  }
  function drawShotMap() {
    const cv = $('shotCv'); if (!cv) return;
    const m = state.match;
    const w = cv.width = cv.parentElement.clientWidth - 2;
    const h = cv.height = Math.round(w * 0.62);
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#12331c'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
    ctx.strokeRect(2, 2, w - 4, h - 4);
    ctx.beginPath(); ctx.moveTo(w / 2, 2); ctx.lineTo(w / 2, h - 2); ctx.stroke();
    ctx.strokeRect(2, h / 2 - h * 0.28, w * 0.15, h * 0.56);
    ctx.strokeRect(w - 2 - w * 0.15, h / 2 - h * 0.28, w * 0.15, h * 0.56);
    const homeDir = m.teams[0].attackDir;
    const cols = { goal: '#ffd700', save: '#38e1ff', miss: '#8b98a5', block: '#f97316', post: '#c084fc' };
    for (const s of m.shotMap) {
      const nx = homeDir > 0 ? s.x / E.L : 1 - s.x / E.L;
      const x = 2 + nx * (w - 4), y = 2 + (s.y / E.W) * (h - 4);
      ctx.fillStyle = cols[s.outcome] || '#fff';
      ctx.globalAlpha = s.team === 0 ? 0.95 : 0.55;
      ctx.beginPath(); ctx.arc(x, y, 2 + s.xg * 9, 0, Math.PI * 2); ctx.fill();
      if (s.team === 1) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.8; ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- HUD ---------- */
  function updateHUD() {
    const m = state.match; if (!m) return;
    $('score').textContent = m.teams[0].score + ' – ' + m.teams[1].score;
    $('clock').textContent = m.clockStr();
    const added = m.added[m.half - 1];
    $('added').textContent = m.t > 2700 && added ? '+' + Math.ceil(added / 60) : '';
    let phase = m.half === 1 ? '1ST HALF' : '2ND HALF';
    if (m.phase === 'halftime') phase = 'HALF TIME';
    if (m.phase === 'fulltime') phase = 'FULL TIME';
    if (state.replay) phase = 'REPLAY';
    else if (state.paused && m.phase !== 'halftime' && m.phase !== 'fulltime') phase = 'PAUSED';
    $('phaseBadge').textContent = phase;
    $('btnPause').textContent = state.paused ? '▶' : '⏸';
    document.querySelectorAll('.spd').forEach(b => b.classList.toggle('active', +b.dataset.s === state.speed && !state.paused));
  }

  /* ---------- controls ---------- */
  function wireControls() {
    $('btnPause').onclick = () => { if (state.match && !['halftime', 'fulltime'].includes(state.match.phase)) { state.paused = !state.paused; updateHUD(); } };
    document.querySelectorAll('.spd').forEach(b => b.onclick = () => { state.speed = +b.dataset.s; state.paused = false; updateHUD(); });
    $('btnSkip').onclick = () => {
      if (state.replay) { endReplay(); return; }
      if (!state.match || ['halftime', 'fulltime'].includes(state.match.phase)) return;
      state.ff = true; state.ffBudget = 150; state.paused = false;
      $('ffBadge').classList.remove('hidden');
      updateHUD();
    };
    $('optCamera').onclick = () => {
      const r = state.renderer;
      r.camera = r.camera === 'full' ? 'follow' : 'full';
      $('optCamera').textContent = r.camera === 'full' ? '📷 Full pitch' : '📷 Follow ball';
      $('optCamera').classList.toggle('active', r.camera === 'follow');
    };
    $('optNames').onclick = () => { state.renderer.showNames = !state.renderer.showNames; $('optNames').classList.toggle('active', state.renderer.showNames); };
    $('optDebug').onclick = () => { state.renderer.debug = !state.renderer.debug; $('optDebug').classList.toggle('active', state.renderer.debug); };
    $('optReplayGoal').onclick = () => { if (state.lastGoalFrames) startReplay(state.lastGoalFrames); else toast('No goal to replay yet'); };
    $('optReplay').onchange = e => { state.autoReplay = e.target.checked; };
    $('optSound').onchange = e => { A.init(); A.setMuted(!e.target.checked); };
    $('comFilter').onclick = () => { state.keyOnly = !state.keyOnly; $('comlist').classList.toggle('key-only', state.keyOnly); $('comFilter').textContent = state.keyOnly ? 'ALL EVENTS' : 'KEY ONLY'; $('comFilter').classList.toggle('active', state.keyOnly); };
    document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => {
      document.querySelectorAll('#tabs button').forEach(x => x.classList.remove('active'));
      document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      $('tab-' + b.dataset.tab).classList.add('active');
      if (b.dataset.tab === 'stats') updateStats(true);
      if (b.dataset.tab === 'squad') refreshSquad();
    });
    $('pitch').addEventListener('click', e => {
      if (!state.match) return;
      const rect = e.target.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const p = state.renderer.pickPlayer(mx, my, state.match);
      if (state.subMode) { if (p && p.team === 0) doSub(p.id); return; }
      if (p) showPlayerCard(p);
      else { $('playerCard').classList.add('hidden'); state.selected = null; state.renderer.selected = null; }
    });
    document.addEventListener('keydown', e => {
      if (state.mode !== 'match') return;
      if (e.code === 'Space') { e.preventDefault(); $('btnPause').click(); }
      if (e.key === '1') { state.speed = 1; state.paused = false; updateHUD(); }
      if (e.key === '2') { state.speed = 2; state.paused = false; updateHUD(); }
      if (e.key === '3') { state.speed = 3; state.paused = false; updateHUD(); }
      if (e.key === 'c' || e.key === 'C') $('optCamera').click();
      if (e.key === 'n' || e.key === 'N') $('optNames').click();
      if (e.key === 'd' || e.key === 'D') $('optDebug').click();
      if (e.key === 'r' || e.key === 'R') $('optReplayGoal').click();
      if (e.key === 's' || e.key === 'S') $('btnSkip').click();
      if (e.key === 'Escape') {
        if (state.subMode) { state.subMode = null; $('subBanner').classList.add('hidden'); refreshSquad(); }
        $('playerCard').classList.add('hidden'); state.selected = null; state.renderer.selected = null;
      }
    });
    global.addEventListener('resize', () => { if (state.renderer) state.renderer.resize(); });
  }

  /* ---------- main loop ---------- */
  let lastT = 0;
  function loop(t) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
    lastT = t;
    if (state.mode !== 'match' || !state.match) return;
    const m = state.match;
    if (state.replay) {
      const rp = state.replay;
      rp.acc += dt;
      let advanced = false;
      while (rp.acc >= 1 / 24) { rp.acc -= 1 / 24; rp.i++; advanced = true; }
      if (rp.i >= rp.frames.length) { endReplay(); }
      else {
        if (advanced || !rp.frame) buildReplayFrame();
        state.renderer.draw(m, rp.frame, dt);
      }
      updateHUD();
      return;
    }
    if (!state.paused && !['halftime', 'fulltime'].includes(m.phase)) {
      state.acc += dt * SPEEDS[state.speed];
      let n = 0;
      const cap = state.ff ? 1600 : 40;
      while (state.acc >= H && n < cap) {
        m.step(H);
        state.acc -= H; n++;
        if (state.ff) {
          state.ffBudget -= H;
          if (state.ffBudget <= 0) { state.ff = false; $('ffBadge').classList.add('hidden'); toast('No highlight in the next 2½ minutes'); break; }
          if (['halftime', 'fulltime'].includes(m.phase)) { state.ff = false; $('ffBadge').classList.add('hidden'); break; }
        }
        if (['halftime', 'fulltime'].includes(m.phase)) break;
      }
      if (state.acc > H * 40) state.acc = 0;
    }
    state.renderer.draw(m, null, dt);
    updateHUD();
    state.statsT += dt;
    if (state.statsT > 0.4) { state.statsT = 0; updateStats(); if (document.querySelector('#tab-squad.active')) refreshSquad(); }
  }

  function init() {
    state.renderer = new R.Renderer($('pitch'));
    buildPrematch();
    wireControls();
    requestAnimationFrame(loop);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof window !== 'undefined' ? window : globalThis);
