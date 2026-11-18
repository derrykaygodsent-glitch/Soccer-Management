/* Touchline 26 — Classic 2D match controls and replay playback. */
(function (global) {
  'use strict';
  const D = global.TLData, E = global.TLEngine, A = global.TLAudio;
  const $ = id => document.getElementById(id);
  // Physics uses a fixed step; display speed never changes the simulation outcome.
  const H = 1 / 40, RATES = [0, 1.65, 3.3, 6.6], REPLAY_RATE = 1.5;
  const REPLAY_BUILDUP = 12, REPLAY_AFTERMATH = 1.05;
  const GOALS = new Set(['goal', 'og', 'penscore']);
  const HIGHLIGHTS = new Set(['goal', 'og', 'penscore', 'pen', 'penmiss', 'red', 'post', 'ht', 'ft']);
  const CHANCES = new Set(['save', 'catch', 'block', 'miss', 'chance']);
  const TACTICS = [
    ['formation', 'Formation', Object.keys(D.FORMATIONS)], ['mentality', 'Mentality', D.MENTALITIES],
    ['passing', 'Passing', D.PASSING], ['tempo', 'Tempo', D.TEMPO], ['press', 'Pressing', D.PRESS],
    ['width', 'Width', D.WIDTH], ['line', 'Defensive line', D.LINE]
  ];
  const marks = {
    nbu: '<path d="M7 15v-5l3 1.5V8l3 2V7l4 3v5Z" fill="currentColor"/><path d="M8 16h8"/>',
    rvr: '<path d="M6.8 10.8c2.3-2.5 3.5.8 5.7-1.1 1.9-1.7 3.2-.8 4.8-.9M7.2 14c2-2.1 3.6.6 5.4-1.1 1.7-1.6 2.9-.8 4.3-1.1M8.5 16.5c1.7-.9 2.9.3 4.5-.9 1-.8 1.7-.7 2.7-.8"/>',
    kgd: '<path d="m6.8 9.5 3 2 2.3-3.6 2.3 3.6 2.8-2-1 5.7H8Z" fill="currentColor"/><path d="M8 16.5h8"/>',
    efc: '<path d="M7.6 15.8v-4.3h2.3v4.3m1-7.6h2.2v7.6m1-5h2.3v5M7 16.6h10"/>',
    hpt: '<circle cx="12" cy="8.7" r="1.4"/><path d="M12 10.1v6.6m-2.5-4.5h5m-7.2 1.3c1.1 4.4 8.1 4.5 9.4 0"/>',
    swl: '<path d="m6.5 14.1 3.4-5 2 2.8 1.9-2.3 3.7 4.5M8 16.1h8"/>',
    oak: '<path d="M12 16.4v-4.3m0 .9c-4.1.5-5.6-2.2-3.1-3 0-2.6 5.9-2.6 6.1 0 2.8 1-.4 3.7-3 3Z" fill="currentColor"/>',
    crl: '<path d="M12.3 7.5c.7 3.8-4.8 4.1-3.7 7.6.8 2.6 6.3 2.4 7-.8.5-2.4-.8-4.7-3.3-6.8Zm-.2 6c.9.7 1.2 1.4.4 2-.6.6-1.9-.1-1.3-1 .2-.4.6-.6.9-1Z" fill="currentColor" stroke="none"/>'
  };
  const state = {
    match: null, renderer: null, ready: true, paused: true, speed: 1, acc: 0,
    config: { home: 1, away: 0, auto: true, sound: false }, names: false, sound: false,
    selected: null, subMode: null, desk: 'tactics', returnBreak: false,
    buffer: [], replay: null, replayQueue: null, goalFrames: null, events: [], meta: {}, skip: null,
    lastFrame: null, lastFeedWall: 0, previousFlight: null, tileT: 0,
    goalTimer: 0, toastTimer: 0, breakQueued: null
  };

  const html = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const clockMinute = n => String(Math.max(0, n)).padStart(2, '0') + '′';
  const condition = p => Math.round(p.cond * 100);
  const colorCond = p => p.cond >= .75 ? '#b3da90' : p.cond >= .55 ? '#eed08a' : '#e69482';
  const shapeLabel = s => s.replace(/-/g, '–');
  const portraitKit = color => color === '#334155' ? '#647690' : color === '#15803d' ? '#35a75c' : color;
  const activeDialog = () => ['setupDialog', 'deskDialog', 'breakDialog'].some(id => $(id).open);

  function crest(club) {
    const fore = club.id === 'swl' ? '#243947' : '#f5f4e9';
    return `<svg viewBox="0 0 24 27" aria-hidden="true" style="color:${fore}" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M2.1 3.9 12 1l9.9 2.9v9.6c0 5.1-4 9.5-9.9 12.4-5.9-2.9-9.9-7.3-9.9-12.4Z" fill="${club.primary}" stroke="#f6f5e5" stroke-width="1.05"/><path d="M3.8 13.25 20.2 5.5v7.65c0 4.15-2.6 8.12-8.2 10.95-4.7-2.4-7.7-5.9-8.2-10.85Z" fill="#111f18" fill-opacity=".16"/><g stroke="currentColor" stroke-width="1.12">${marks[club.id] || ''}</g></svg>`;
  }

  function text(id, next) {
    const el = $(id), value = String(next);
    if (el.textContent !== value) el.textContent = value;
  }
  function attr(el, key, next) { const value = String(next); if (el.getAttribute(key) !== value) el.setAttribute(key, value); }
  function notify(message) {
    const outlet = $('deskDialog').open && document.querySelector('.desk-tab:not([hidden]) .desk-feedback');
    if (outlet) { outlet.textContent = message; return; }
    text('toast', message); $('toast').hidden = false;
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => { $('toast').hidden = true; }, 2600);
  }

  function setSound(enabled, gesture) {
    state.sound = !!enabled;
    if (enabled && gesture) { A.init(); A.resume(); }
    A.setMuted(!enabled);
    attr($('btnSound'), 'aria-pressed', enabled);
    attr($('soundIcon'), 'href', enabled ? '#i-sound' : '#i-mute');
    $('btnSound').title = enabled ? 'Mute stadium sound' : 'Enable stadium sound';
  }

  function setFeed(message, event, label) {
    const team = event && event.team != null ? state.match.teams[event.team] : null;
    $('commentary').style.setProperty('--feed-accent', team ? portraitKit(team.club.primary) : '#c7ea91');
    text('feedLabel', label || (team ? team.club.short + ' feed' : 'Match feed'));
    text('feedText', message);
    text('feedTime', clockMinute(event && event.minute != null ? event.minute : 0));
    state.lastFeedWall = performance.now();
  }

  function prepare(config) {
    state.config = { ...config };
    state.ready = state.paused = true;
    state.speed = 1; state.acc = 0; state.skip = null; state.replay = null;
    state.goalFrames = null; state.replayQueue = null; state.buffer = []; state.events = []; state.previousFlight = null;
    state.selected = null; state.subMode = null; state.returnBreak = false; state.breakQueued = null;
    $('goalBanner').hidden = $('playerFocus').hidden = $('toast').hidden = true;
    clearTimeout(state.goalTimer); clearTimeout(state.toastTimer);
    const home = D.CLUBS[config.home], away = D.CLUBS[config.away];
    const homeTactics = { ...D.defaultTactics(home.style) };
    if (config.formation) homeTactics.formation = config.formation;
    if (config.mentality != null) homeTactics.mentality = config.mentality;
    state.match = new E.Match(home, away, {
      seed: Date.now() % 1000000007,
      homeTactics,
      onEvent,
      onSnapshot: snapshot => {
        state.buffer.push(snapshot);
        if (state.buffer.length > 350) state.buffer.splice(0, 35);
      }
    });
    state.meta = Object.fromEntries(state.match.teams.flatMap(t => t.players.map(p => [p.id, p])));
    document.documentElement.style.setProperty('--home', home.primary);
    document.documentElement.style.setProperty('--away', away.primary);
    text('fixtureTitle', home.stadium);
    text('stadiumStamp', home.stadium);
    $('fixtureTeams').innerHTML = `${html(home.name)} <span>vs</span> ${html(away.name)}`;
    text('nameH', home.short); text('nameA', away.short); text('teamTitle', home.name);
    $('badgeH').innerHTML = $('lineupCrest').innerHTML = crest(home);
    $('badgeA').innerHTML = crest(away);
    setSound(config.sound, false);
    setFeed('The players are in position. Kick off when you’re ready.');
    renderLineup(); updateHUD(); draw();
  }

  function currentStatus() {
    if (state.ready) return ['ready', 'Ready'];
    if (state.replay) return ['replay', 'Replay'];
    if (state.match.phase === 'halftime') return ['paused', 'Half time'];
    if (state.match.phase === 'fulltime') return ['paused', 'Full time'];
    if (state.skip) return ['live', 'Skipping'];
    if (state.paused) return ['paused', 'Paused'];
    return ['live', state.match.half === 1 ? '1st half' : '2nd half'];
  }
  function updateHUD() {
    const m = state.match;
    if (!m) return;
    text('clock', m.clockStr());
    const added = m.added[m.half - 1];
    $('added').hidden = !(m.t >= 2700 && added);
    if (!$('added').hidden) text('added', '+' + Math.ceil(added / 60));
    const score = `${m.teams[0].score}:${m.teams[1].score}`;
    if ($('score').dataset.score !== score) {
      $('score').dataset.score = score;
      $('score').innerHTML = `${m.teams[0].score}<span class="score-dash">–</span>${m.teams[1].score}`;
      attr($('score'), 'aria-label', `${m.teams[0].club.name} ${m.teams[0].score}, ${m.teams[1].club.name} ${m.teams[1].score}`);
    }
    const [status, phase] = currentStatus();
    if ($('matchStatus').dataset.status !== status) $('matchStatus').dataset.status = status;
    text('phaseBadge', phase);
    const atBreak = ['halftime', 'fulltime'].includes(m.phase);
    const stopped = state.ready || (state.replay ? state.replay.paused : state.paused);
    const label = state.ready ? 'Kick off' : atBreak ? phase : stopped ? 'Resume' : 'Pause';
    text('playLabel', label); attr($('playIcon'), 'href', stopped || atBreak ? '#i-play' : '#i-pause');
    $('btnPlay').title = atBreak ? label : `${label} (Space)`;
    $('btnPlay').disabled = atBreak;
    for (const b of document.querySelectorAll('[data-speed]')) attr(b, 'aria-pressed', Number(b.dataset.speed) === state.speed);
    const replayButton = $('btnReplay');
    replayButton.disabled = !state.goalFrames || !!state.replayQueue || state.ready || atBreak;
    textReplayButton(state.replay ? 'Exit replay' : 'Replay');
    $('btnSkip').disabled = state.ready || atBreak;
    const skipLabel = state.replay ? 'Exit replay' : state.skip ? 'Cancel skip' : 'Next highlight';
    text('skipLabel', skipLabel);
    $('btnSkip').title = `${skipLabel} (S)`;
    $('replayIndicator').hidden = !state.replay && !state.skip;
    if (!$('replayIndicator').hidden) text('indicatorText', state.replay ? state.replay.paused ? 'Replay paused' : 'Goal replay' : 'Scanning for a highlight');
  }
  function textReplayButton(message) {
    const el = $('btnReplay').querySelector('span');
    if (el.textContent !== message) el.textContent = message;
    $('btnReplay').title = message === 'Replay' ? 'Replay last goal (R)' : 'Exit replay (R)';
  }

  function togglePlay() {
    const m = state.match;
    if (!m || ['halftime', 'fulltime'].includes(m.phase)) return;
    if (state.replay) { state.replay.paused = !state.replay.paused; updateHUD(); return; }
    if (state.ready) {
      state.ready = false; state.paused = false; state.acc = 0;
      setSound(state.sound, true); A.whistle(false);
      const event = { type: 'kickoff', minute: 1, team: 0, text: `We’re underway at ${m.teams[0].club.stadium}.`, key: true };
      state.events.push(event); setFeed(event.text, event, 'Kick-off');
    } else {
      state.skip = null; state.acc = 0;
      state.paused = !state.paused;
    }
    updateHUD();
  }
  function setSpeed(speed) {
    state.speed = speed; state.skip = null; state.acc = 0;
    if (state.replay) endReplay();
    updateHUD();
  }
  function toggleSkip() {
    if ($('btnSkip').disabled) return;
    if (state.replay) { endReplay(); return; }
    if (state.skip) state.skip = null;
    else { state.skip = { remaining: 150 }; state.paused = false; state.acc = 0; }
    updateHUD();
  }

  function recordReplay(event) {
    const m = state.match, elapsed = m.elapsed;
    const frames = state.buffer.filter(f => f.half === event.half && f.elapsed < elapsed - .001 && f.elapsed >= elapsed - REPLAY_BUILDUP);
    if (frames.length < 12) return null;
    frames.push(m.snapshotFrame());
    return frames;
  }
  function replayFrame(snap, next = snap, amount = 0) {
    const mix = (a, b, w) => a + (b - a) * w;
    const players = [];
    for (let i = 0; i < snap.n; i++) {
      const id = snap.ids[i], meta = state.meta[id];
      if (!meta) continue;
      const j = next.ids[i] === id ? i : next.ids.indexOf(id);
      let x = snap.arr[i * 2], y = snap.arr[i * 2 + 1];
      if (j >= 0 && Math.abs(next.arr[j * 2] - x) + Math.abs(next.arr[j * 2 + 1] - y) < 2.8) {
        x = mix(x, next.arr[j * 2], amount); y = mix(y, next.arr[j * 2 + 1], amount);
      }
      players.push({ id, team: meta.team, name: meta.name, num: meta.num, role: meta.role, pos: meta.pos, yellow: meta.yellow, x, y });
    }
    const i = snap.n * 2, j = next.n * 2;
    const w = Math.abs(snap.arr[i] - next.arr[j]) + Math.abs(snap.arr[i + 1] - next.arr[j + 1]) < 3 ? amount : 0;
    const ball = { x: mix(snap.arr[i], next.arr[j], w), y: mix(snap.arr[i + 1], next.arr[j + 1], w), z: mix(snap.arr[i + 2], next.arr[j + 2], w) };
    return { players, ball, ownerId: snap.ids[snap.arr[i + 3]] };
  }
  function startReplay() {
    if (!state.goalFrames || state.replayQueue) return;
    state.skip = null; state.acc = 0;
    const frames = state.goalFrames;
    state.replay = { frames, time: frames[0].elapsed, index: 0, frame: replayFrame(frames[0]), paused: false };
    $('goalBanner').hidden = true;
    updateHUD(); draw();
  }
  function endReplay() { state.replay = null; state.acc = 0; updateHUD(); draw(); }
  function tickReplay(dt) {
    const rp = state.replay;
    if (rp.paused) return;
    rp.time += dt * REPLAY_RATE;
    const frames = rp.frames, end = frames.length - 1;
    if (rp.time > frames[end].elapsed + .72) { endReplay(); return; }
    while (rp.index < end && frames[rp.index + 1].elapsed <= rp.time) rp.index++;
    const a = frames[rp.index], b = frames[Math.min(end, rp.index + 1)];
    const alpha = a === b ? 0 : Math.max(0, Math.min(1, (rp.time - a.elapsed) / (b.elapsed - a.elapsed)));
    rp.frame = replayFrame(a, b, alpha);
  }
  function completeReplayCapture() {
    const queue = state.replayQueue;
    if (!queue || state.match.elapsed < queue.end) return;
    const net = state.buffer.filter(s => s.half === queue.half && s.elapsed > queue.goal + .001 && s.elapsed <= queue.end + H);
    if (state.goalFrames) state.goalFrames.push(...net);
    state.replayQueue = null;
    if (queue.auto) startReplay();
  }

  function onEvent(ev) {
    if (state.ready || !state.match) return; // Constructor/setup events belong to the parked fixture.
    const m = state.match;
    const goal = GOALS.has(ev.type);
    const key = goal || HIGHLIGHTS.has(ev.type) || !!ev.key;
    const message = ev.type === 'kickoff' && ev.half === 2 && ev.t < .1 ? 'The second half is underway.' : ev.text;
    if (message && ev.type !== 'preview') {
      state.events.push({ ...ev, text: message, key });
      if (state.events.length > 245) state.events.shift();
      setFeed(message, ev, goal ? 'Goal' : ev.type === 'pen' ? 'Penalty' : null);
    }
    if (state.skip && (HIGHLIGHTS.has(ev.type) || (ev.key && CHANCES.has(ev.type)))) { state.skip = null; state.acc = 0; }
    if (goal) {
      const g = m.lastGoal, club = m.teams[ev.team].club;
      text('goalSide', `Goal · ${club.short}`); text('goalTime', clockMinute(ev.minute));
      text('goalScorer', g && g.scorer ? g.scorer + (g.og ? ' (OG)' : '') : club.name);
      $('goalBanner').style.setProperty('--accent', portraitKit(club.primary));
      $('goalBanner').hidden = false;
      clearTimeout(state.goalTimer);
      state.goalTimer = setTimeout(() => { $('goalBanner').hidden = true; }, 3900);
      A.goal();
      state.goalFrames = recordReplay(ev);
      if (state.goalFrames) {
        state.replayQueue = { goal: m.elapsed, end: m.elapsed + REPLAY_AFTERMATH, half: m.half, auto: state.config.auto };
      }
    } else if (ev.type === 'ht' || ev.type === 'ft') {
      state.paused = true; state.skip = null; state.acc = 0; state.breakQueued = ev.type;
      A.whistle(ev.type === 'ht', ev.type === 'ft');
    } else if (ev.type === 'pen' || ev.type === 'offside') { A.whistle(false); }
    else if (ev.type === 'post' || ev.type === 'save') { A.kick(.7); if (ev.key) A.bigChance(); }
    else if (ev.type === 'foul' || ev.type === 'red' || ev.type === 'yellow') { A.foul(); }
    if (['sub', 'red', 'yellow'].includes(ev.type)) renderLineup();
    updateHUD();
  }

  function renderLineup() {
    const home = state.match.teams[0];
    const lineup = $('lineup'), from = lineup.scrollLeft;
    text('formationLabel', shapeLabel(home.tactics.formation));
    lineup.innerHTML = home.slots.map(({ player: p, role }) => `<button type="button" class="player-tile" data-player="${html(p.id)}" aria-label="${html(p.name)}, number ${p.num}, ${role}" aria-pressed="${state.selected === p.id}" title="${html(p.name)}" style="--kit:${portraitKit(role === 'GK' ? home.club.gk : home.club.primary)};--condition:${condition(p)}%;--condition-color:${colorCond(p)}"><span class="tile-head"><span>${role}${p.yellow ? ' · YC' : ''}</span><span class="tile-no">${p.num}</span></span><span class="tile-main">${icon('shirt')}<span class="tile-name">${html(p.name.split(' ').pop())}</span></span><span class="tile-cond" aria-hidden="true"><i></i></span></button>`).join('');
    lineup.scrollLeft = from;
    if (state.selected && !state.match.onPitchPlayers().some(p => p.id === state.selected)) selectPlayer(null);
  }
  function updateLineupCondition() {
    for (const button of $('lineup').querySelectorAll('[data-player]')) {
      const p = state.meta[button.dataset.player];
      if (!p) continue;
      button.style.setProperty('--condition', condition(p) + '%');
      button.style.setProperty('--condition-color', colorCond(p));
    }
    if (state.selected) updateFocus(state.meta[state.selected]);
  }
  function updateFocus(p) {
    if (!p) return;
    text('focusMeta', `#${p.num} · ${p.role || p.pos} · ${state.match.teams[p.team].club.short}`);
    text('focusName', p.name);
    text('focusStats', `${condition(p)}% condition${state.ready ? '' : ` · ${p.rating.toFixed(1)} rating`}`);
  }
  function selectPlayer(p) {
    state.selected = p ? p.id : null;
    $('playerFocus').hidden = !p;
    if (p) updateFocus(state.meta[p.id] || p);
    for (const b of $('lineup').querySelectorAll('[data-player]')) attr(b, 'aria-pressed', b.dataset.player === state.selected);
    draw();
  }

  const options = (items, isIndex = true) => items.map((entry, i) => `<option value="${html(isIndex ? i : entry)}">${html(entry)}</option>`).join('');
  function refreshFixturePicks() {
    const h = Number($('preHome').value), a = Number($('preAway').value);
    $('setupHomeCrest').innerHTML = crest(D.CLUBS[h]); $('setupAwayCrest').innerHTML = crest(D.CLUBS[a]);
  }
  function openSetup() {
    state.skip = null;
    $('preHome').value = state.config.home; $('preAway').value = state.config.away;
    $('preForm').value = state.match.teams[0].tactics.formation; $('preMent').value = state.match.teams[0].tactics.mentality;
    $('preReplay').checked = state.config.auto; $('preSound').checked = state.sound;
    refreshFixturePicks();
    text('setupNote', state.ready ? 'Set your fixture and starting instructions.' : 'Loading a fixture ends the current match.');
    $('setupDialog').showModal(); updateHUD();
  }
  function fixtureSelection(changed) {
    if ($('preHome').value === $('preAway').value) {
      const other = changed === 'preHome' ? 'preAway' : 'preHome';
      $(other).value = (+$(changed).value + 1) % D.CLUBS.length;
      changed = 'preHome';
    }
    if (changed === 'preHome') {
      const tactics = D.defaultTactics(D.CLUBS[+$('preHome').value].style);
      $('preForm').value = tactics.formation; $('preMent').value = tactics.mentality;
    }
    refreshFixturePicks();
  }

  function renderTactics() {
    const m = state.match, t = m.teams[0].tactics, away = m.teams[1];
    $('tab-tactics').innerHTML = `<p class="help-text desk-feedback" role="status">Set how your side plays. Changes apply when play resumes.</p><div class="desk-grid">${TACTICS.map(([key, title, values]) => `<label class="tactic-control">${title}<select data-tactic="${key}">${options(values, key !== 'formation')}</select></label>`).join('')}</div><div class="opposition"><strong>${html(away.club.name)} · Opposition setup</strong>${shapeLabel(away.tactics.formation)} · ${html(D.MENTALITIES[away.tactics.mentality])} · ${html(D.PRESS[away.tactics.press])} press</div>`;
    for (const select of $('tab-tactics').querySelectorAll('[data-tactic]')) select.value = t[select.dataset.tactic];
  }
  function renderSquad() {
    const t = state.match.teams[0];
    const available = !state.ready && state.match.phase !== 'fulltime';
    const inPlayer = t.players.find(p => p.id === state.subMode);
    const row = (p, role, bench) => `<div class="squad-row"><span>${p.num}</span><span>${html(p.name)}</span><span class="row-role">${role}</span><span class="row-cond">${condition(p)}%</span>${bench ? `<button type="button" class="button" data-bench="${html(p.id)}" ${!available || t.subsUsed >= 5 ? 'disabled' : ''}>Bring on</button>` : inPlayer ? `<button type="button" class="button" data-out="${html(p.id)}" ${(p.pos === 'GK') !== (inPlayer.pos === 'GK') ? 'disabled' : ''}>Replace</button>` : '<span></span>'}</div>`;
    $('tab-squad').innerHTML = `<p class="help-text desk-feedback" role="status">${state.ready ? 'Substitutions are available after kick-off.' : `${Math.max(0, 5 - t.subsUsed)} substitutions remaining.`}</p>${inPlayer ? `<div class="sub-note">Bring on ${html(inPlayer.name)}. Pick a player to replace.<button class="button" type="button" data-cancel-sub>Cancel</button></div>` : ''}<div class="squad-head"><strong>On the pitch</strong><span>${t.slots.length} players</span></div>${t.slots.map(s => row(s.player, s.role, false)).join('')}<div class="squad-head"><strong>On the bench</strong></div>${t.bench.map(p => row(p, p.pos, true)).join('')}`;
  }

  const statLine = (title, a, b) => `<div class="stat-line"><strong>${a}</strong><span>${title}</span><strong>${b}</strong></div>`;
  function statsMarkup(short) {
    const m = state.match, [a, b] = m.teams.map(t => t.stats);
    const total = m.possTime[0] + m.possTime[1];
    const possession = total ? Math.round(m.possTime[0] / total * 100) : 50;
    const passPct = s => s.passes ? Math.round(s.passWon / s.passes * 100) + '%' : '–';
    return statLine('Possession', possession + '%', (100 - possession) + '%') +
      statLine('Shots', a.shots, b.shots) + statLine('On target', a.onTarget, b.onTarget) +
      statLine('Expected goals', a.xG.toFixed(2), b.xG.toFixed(2)) + statLine('Passes completed', a.passWon, b.passWon) +
      (short ? '' : statLine('Pass accuracy', passPct(a), passPct(b)) + statLine('Corners', a.corners, b.corners) + statLine('Fouls', a.fouls, b.fouls) + statLine('Saves', a.saves, b.saves));
  }
  function renderStats() {
    const m = state.match;
    $('tab-stats').innerHTML = `<div class="stats-title"><span>${m.teams[0].club.short}</span><span>${m.teams[1].club.short}</span></div>${statsMarkup(false)}<h3 class="section-heading">Shot locations</h3><canvas class="mini-pitch" width="840" height="420" id="miniPitch" role="img" aria-label="Shot locations on the pitch"></canvas>`;
    const cv = $('miniPitch'), ctx = cv.getContext('2d'), w = cv.width, h = cv.height, pad = 13;
    const x = n => pad + (w - pad * 2) * n / E.L, y = n => pad + (h - pad * 2) * n / E.W;
    ctx.fillStyle = '#385332'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#d5e5cc9a'; ctx.lineWidth = 2;
    ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
    ctx.strokeRect(pad, y(E.CY - E.BOX_HALF), x(E.BOX_L) - pad, y(E.CY + E.BOX_HALF) - y(E.CY - E.BOX_HALF));
    ctx.strokeRect(x(E.L - E.BOX_L), y(E.CY - E.BOX_HALF), x(E.BOX_L) - pad, y(E.CY + E.BOX_HALF) - y(E.CY - E.BOX_HALF));
    ctx.beginPath(); ctx.moveTo(w / 2, pad); ctx.lineTo(w / 2, h - pad); ctx.stroke();
    for (const shot of m.shotMap) {
      ctx.beginPath(); ctx.arc(x(shot.x), y(shot.y), 4 + shot.xg * 14, 0, Math.PI * 2);
      ctx.fillStyle = shot.outcome === 'goal' ? '#e6f6c5' : portraitKit(m.teams[shot.team].club.primary);
      ctx.fill(); ctx.strokeStyle = '#f0f9e5bc'; ctx.stroke();
    }
  }
  function renderEvents() {
    $('tab-events').innerHTML = state.events.length ? `<ul class="events">${state.events.slice(-90).reverse().map(ev => `<li${ev.key ? ' class="key"' : ''}><time>${clockMinute(ev.minute)}</time><span>${html(ev.text)}</span></li>`).join('')}</ul>` : '<p class="help-text">Match events will appear here after kick-off.</p>';
  }
  function setDesk(tab) {
    state.desk = tab;
    for (const button of $('deskTabs').querySelectorAll('[data-tab]')) {
      const active = button.dataset.tab === tab;
      attr(button, 'aria-selected', active); button.tabIndex = active ? 0 : -1;
      $('tab-' + button.dataset.tab).hidden = !active;
    }
    ({ tactics: renderTactics, squad: renderSquad, stats: renderStats, events: renderEvents })[tab]();
    $('deskDialog').scrollTop = 0;
  }
  function openDesk(tab) {
    state.skip = null;
    setDesk(tab);
    if (!$('deskDialog').open) $('deskDialog').showModal();
    updateHUD();
  }
  function showBreak(type) {
    state.breakQueued = null;
    const [h, a] = state.match.teams;
    text('breakTitle', type === 'ht' ? 'Half time' : 'Full time');
    $('breakScore').innerHTML = `<span>${h.club.short}</span><strong>${h.score} – ${a.score}</strong><span>${a.club.short}</span>`;
    $('breakStats').innerHTML = statsMarkup(true);
    text('btnBreakContinue', type === 'ht' ? 'Second half' : 'Rematch');
    if (!$('breakDialog').open) $('breakDialog').showModal();
    updateHUD();
  }

  function observePlay() {
    const m = state.match, ball = m.ball, f = ball.flight;
    if (f === state.previousFlight) return;
    state.previousFlight = f;
    if (!f || state.skip || state.replay || !ball.lastTouch) return;
    const from = ball.lastTouch.name, to = f.intended && f.intended.name;
    const loft = ['chip', 'switch', 'long', 'clearance'].includes(f.technique);
    if (performance.now() - state.lastFeedWall < (loft ? 930 : 2150)) return;
    let words;
    if (loft) {
      if (f.technique === 'chip') words = `${from} clips it ${to ? `towards ${to}` : 'into space'}.`;
      else if (f.technique === 'switch') words = `${from} switches play with a high diagonal.`;
      else if (f.technique === 'clearance') words = `${from} lifts the clearance away.`;
      else words = `${from} sends a long ball${to ? ` towards ${to}` : ' upfield'}.`;
    } else if (f.kind === 'pass' && to && f.intended !== ball.lastTouch && f.totalDist >= 12) {
      words = f.technique === 'through' ? `${from} looks to slip ${to} in behind.` : f.technique === 'cutback' ? `${from} cuts it back towards ${to}.` : `${from} looks for ${to}.`;
    }
    if (words) setFeed(words, { team: ball.lastTouch.team, minute: m.minute() });
  }

  function advance(dt) {
    const m = state.match;
    if (state.skip) {
      const limit = performance.now() + 7;
      for (let i = 0; state.skip && i < 160 && (i < 2 || performance.now() < limit); i++) {
        m.step(H);
        if (state.skip && (state.skip.remaining -= H) <= 0) { state.skip = null; notify('No highlight in the next 2½ match minutes.'); }
      }
    } else {
      state.acc += dt * RATES[state.speed];
      let n = 0;
      while (state.acc >= H && n++ < 48 && !state.replay && !state.paused) { state.acc -= H; m.step(H); }
      if (state.acc > .6) state.acc = 0;
    }
    observePlay(); completeReplayCapture();
  }
  function draw() {
    state.renderer.draw(state.match, {
      ready: state.ready, names: state.names, selected: state.selected,
      live: !state.ready && !(state.skip && !state.replay), frame: state.replay && state.replay.frame,
      alpha: !state.replay && !state.paused && !state.skip ? Math.max(0, Math.min(1, state.acc / H)) : 1
    });
  }
  function loop(t) {
    requestAnimationFrame(loop);
    const dt = state.lastFrame == null ? 0 : Math.max(0, Math.min(.05, (t - state.lastFrame) / 1000));
    state.lastFrame = t;
    if (state.breakQueued && !activeDialog()) showBreak(state.breakQueued);
    let changed = false;
    if (!document.hidden && !activeDialog()) {
      if (state.replay && !state.replay.paused) { tickReplay(dt); changed = true; }
      else if (!state.replay && !state.ready && !state.paused) { advance(dt); changed = true; }
    }
    if (changed && t - state.tileT > 540) { state.tileT = t; if (!state.replay) updateLineupCondition(); }
    if (changed) updateHUD();
    if (changed || state.renderer.needsPaint) draw();
  }

  function wire() {
    $('btnPlay').addEventListener('click', togglePlay);
    $('btnSkip').addEventListener('click', toggleSkip);
    for (const b of document.querySelectorAll('[data-speed]')) b.addEventListener('click', () => setSpeed(+b.dataset.speed));
    $('btnNames').addEventListener('click', () => { state.names = !state.names; attr($('btnNames'), 'aria-pressed', state.names); draw(); });
    $('btnSound').addEventListener('click', () => { setSound(!state.sound, true); state.config.sound = state.sound; });
    $('btnReplay').addEventListener('click', () => state.replay ? endReplay() : startReplay());
    $('btnClearPlayer').addEventListener('click', () => selectPlayer(null));
    $('pitch').addEventListener('click', e => {
      const b = $('pitch').getBoundingClientRect();
      selectPlayer(state.renderer.pickPlayer(e.clientX - b.left, e.clientY - b.top));
    });
    $('lineup').addEventListener('click', e => {
      const b = e.target.closest('[data-player]');
      if (b) selectPlayer(state.selected === b.dataset.player ? null : state.meta[b.dataset.player]);
    });
    $('btnSetup').addEventListener('click', openSetup);
    for (const id of ['preHome', 'preAway']) {
      $(id).innerHTML = options(D.CLUBS.map(c => c.name));
      $(id).addEventListener('change', () => fixtureSelection(id));
    }
    $('preForm').innerHTML = options(Object.keys(D.FORMATIONS), false);
    $('preMent').innerHTML = options(D.MENTALITIES);
    $('setupForm').addEventListener('submit', e => {
      e.preventDefault();
      const config = { home: +$('preHome').value, away: +$('preAway').value, formation: $('preForm').value, mentality: +$('preMent').value, auto: $('preReplay').checked, sound: $('preSound').checked };
      $('setupDialog').close(); prepare(config);
    });
    for (const b of document.querySelectorAll('[data-close]')) b.addEventListener('click', () => $(b.dataset.close).close());
    for (const [button, panel] of [['btnTactics', 'tactics'], ['btnStats', 'stats'], ['btnEvents', 'events']]) $(button).addEventListener('click', () => openDesk(panel));
    $('deskTabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) setDesk(b.dataset.tab); });
    $('deskTabs').addEventListener('keydown', e => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      const tabs = [...$('deskTabs').querySelectorAll('[data-tab]')], i = tabs.indexOf(e.target);
      if (i < 0) return;
      e.preventDefault();
      const next = e.key === 'Home' ? tabs[0] : e.key === 'End' ? tabs[tabs.length - 1] : tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      setDesk(next.dataset.tab); next.focus();
    });
    $('tab-tactics').addEventListener('change', e => {
      const key = e.target.dataset.tactic;
      if (!key) return;
      const m = state.match;
      m.setTactics(0, { [key]: key === 'formation' ? e.target.value : +e.target.value });
      if (key === 'formation' || key === 'width') {
        if (state.ready) m.setupKickoff(0);
        renderLineup();
      }
      notify('Instruction updated.'); draw();
    });
    $('tab-squad').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      if (b.hasAttribute('data-cancel-sub')) { state.subMode = null; renderSquad(); }
      else if (b.dataset.bench) { state.subMode = b.dataset.bench; renderSquad(); }
      else if (b.dataset.out && state.subMode) {
        const result = state.match.substitute(0, b.dataset.out, state.subMode);
        state.subMode = null; renderSquad(); renderLineup();
        notify(result.ok ? 'Substitution made.' : result.msg);
      }
    });
    $('deskDialog').addEventListener('close', () => {
      state.subMode = null;
      if (state.returnBreak) { state.returnBreak = false; showBreak(state.match.phase === 'halftime' ? 'ht' : 'ft'); }
    });
    $('breakDialog').addEventListener('cancel', e => e.preventDefault());
    $('btnBreakDesk').addEventListener('click', () => {
      state.returnBreak = true; $('breakDialog').close(); openDesk(state.match.phase === 'halftime' ? 'tactics' : 'stats');
    });
    $('btnBreakContinue').addEventListener('click', () => {
      $('breakDialog').close();
      if (state.match.phase === 'halftime') {
        state.paused = false; state.acc = 0; state.match.continueSecondHalf(); renderLineup(); updateHUD();
      } else prepare({ ...state.config, formation: state.match.teams[0].tactics.formation, mentality: state.match.teams[0].tactics.mentality });
    });
    document.addEventListener('keydown', e => {
      if (activeDialog() || e.altKey || e.ctrlKey || e.metaKey || e.repeat || e.target.matches('input, select, textarea, [contenteditable]')) return;
      const key = e.key.toLowerCase();
      if (e.code === 'Space' && !e.target.closest('button')) { e.preventDefault(); togglePlay(); }
      else if (['1', '2', '3'].includes(key)) setSpeed(+key);
      else if (key === 'n') $('btnNames').click();
      else if (key === 's') toggleSkip();
      else if (key === 'r' && !$('btnReplay').disabled) $('btnReplay').click();
      else if (key === 'escape') { if (state.replay) endReplay(); else selectPlayer(null); }
    });
  }
  function init() {
    state.renderer = new global.TLRender.Renderer($('pitch'));
    wire(); prepare(state.config);
    if (document.fonts) document.fonts.ready.then(draw);
    requestAnimationFrame(loop);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})(typeof window !== 'undefined' ? window : globalThis);
