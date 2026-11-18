/* Touchline 26 — Classic 2D match controls and replay playback. */
(function (global) {
  'use strict';
  const D = global.TLData, E = global.TLEngine, A = global.TLAudio, V = global.TLHighlights, O = global.TLReferee, B = global.TLBroadcast;
  const $ = id => document.getElementById(id);
  // Physics uses a fixed step; display speed never changes the simulation outcome.
  const H = V.STEP;
  const SPEED_SHORTCUTS = { 1: B.NORMAL_SPEED, 2: 2, 3: 4 };
  const REPLAY_BUILDUP = 12, REPLAY_AFTERMATH = 1.05;
  const HISTORY = Math.ceil((V.MODES.comprehensive.lead + 6) / (H * 2));
  const SCAN_YIELD = 6, MAX_FRAME_DT = .12;
  const GOALS = V.GOALS, BREAKS = V.BREAKS;
  const LINEUP_EVENTS = new Set(['sub', 'dismissed', 'yellow']);
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
    match: null, renderer: null, ready: true, paused: true, speed: B.NORMAL_SPEED, acc: 0,
    config: { home: 1, away: 0, auto: true, sound: false, highlights: V.DEFAULT_MODE }, names: false, sound: false,
    selected: null, subMode: null, desk: 'tactics', returnBreak: false,
    buffer: [], replay: null, replayQueue: null, goalFrames: null, events: [], meta: {},
    scout: null, scan: null, scanJob: null, scene: null, visiblePlay: null, nextSearch: null, lineupDirty: false,
    frameJob: null, lastFrame: null, lastFeedWall: 0, previousFlight: null, tileT: 0,
    goalTimer: 0, toastTimer: 0, breakQueued: null
  };

  const html = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const clockMinute = n => String(Math.max(0, n)).padStart(2, '0') + '′';
  const condition = p => Math.round(p.cond * 100);
  const colorCond = p => p.cond >= .75 ? '#b3da90' : p.cond >= .55 ? '#eed08a' : '#e69482';
  const shapeLabel = s => s.replace(/-/g, '–');
  const portraitKit = color => color === '#334155' ? '#647690' : color === '#15803d' ? '#35a75c' : color;
  const viewingMatch = () => !$('matchScreen').hidden;
  const activeDialog = () => ['setupDialog', 'deskDialog', 'breakDialog'].some(id => $(id).open);
  const chosenMode = () => V.modeFor(state.config.highlights);
  const filmView = () => state.scene || state.scan;
  const viewingReview = () => !state.scan && (state.scene?.view.phase ?? state.match.phase) === 'review';
  const viewingRestart = () => state.ready || state.scan || state.replay ? null : state.scene ? state.scene.view.restart : restartFrame();
  const fraction = (t, a, b) => b > a ? Math.max(0, Math.min(1, (t - a) / (b - a))) : 0;
  const clockAt = t => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

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
    state.config = { ...config, highlights: V.modeFor(config.highlights).id };
    state.ready = state.paused = true;
    state.speed = B.NORMAL_SPEED; state.acc = 0; state.replay = null;
    stopScanWork();
    state.scan = state.scene = state.visiblePlay = state.nextSearch = null;
    state.lineupDirty = false;
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
        state.buffer.push(state.scan ? withView(snapshot) : snapshot);
        if (state.buffer.length > HISTORY) state.buffer.splice(0, 44);
      }
    });
    state.scout = new V.Scout(state.match);
    syncSpeed(); syncWatchMode();
    state.meta = Object.fromEntries(state.match.teams.flatMap(t => t.players.map(p => [p.id, p])));
    document.documentElement.style.setProperty('--home', home.primary);
    document.documentElement.style.setProperty('--away', away.primary);
    text('fixtureTitle', home.stadium);
    text('fixtureCompetition', config.competition || 'Friendly');
    text('stadiumStamp', home.stadium);
    $('fixtureTeams').innerHTML = `${html(home.name)} <span>vs</span> ${html(away.name)}`;
    text('nameH', home.short); text('nameA', away.short); text('teamTitle', home.name);
    $('badgeH').innerHTML = $('lineupCrest').innerHTML = crest(home);
    $('badgeA').innerHTML = crest(away);
    setSound(config.sound, false);
    setFeed('The players are in position. Kick off when you’re ready.');
    renderLineup(); updateHUD(); draw();
  }

  function currentStatus(restart) {
    if (state.ready) return ['ready', 'Ready'];
    if (state.replay) return ['replay', 'Replay'];
    if (state.match.phase === 'halftime') return ['paused', 'Half time'];
    if (state.match.phase === 'fulltime') return ['paused', 'Full time'];
    if (state.paused) return ['paused', 'Paused'];
    if (state.scan) return ['live', 'Skipping'];
    if (viewingReview()) return ['review', 'VAR check'];
    if (restart) return ['restart', restartTitle(restart)];
    if (state.scene?.policy.rank || state.visiblePlay) return ['live', 'Highlight'];
    return ['live', state.match.half === 1 ? '1st half' : '2nd half'];
  }
  function updateHUD() {
    const m = state.match;
    if (!m) return;
    const film = filmView();
    const time = film ? film.view.t + Math.max(0, film.time - film.view.elapsed) : m.t + (m.half === 2 ? 2700 : 0);
    text('clock', film ? clockAt(time) : m.clockStr());
    const half = film ? film.view.half : m.half;
    const added = m.added[half - 1];
    $('added').hidden = !(time >= half * 2700 && added);
    if (!$('added').hidden) text('added', '+' + Math.floor(added / 60));
    const [homeScore, awayScore] = film ? film.view.score : [m.teams[0].score, m.teams[1].score];
    const score = `${homeScore}:${awayScore}`;
    if ($('score').dataset.score !== score) {
      $('score').dataset.score = score;
      $('score').innerHTML = `${homeScore}<span class="score-dash">–</span>${awayScore}`;
      attr($('score'), 'aria-label', `${m.teams[0].club.name} ${homeScore}, ${m.teams[1].club.name} ${awayScore}`);
    }
    const restart = viewingRestart();
    const [status, phase] = currentStatus(restart);
    if ($('matchStatus').dataset.status !== status) $('matchStatus').dataset.status = status;
    text('phaseBadge', phase);
    const atBreak = V.atBreak(m);
    const stopped = state.ready || (state.replay ? state.replay.paused : state.paused);
    const label = state.ready ? 'Kick off' : atBreak ? phase : stopped ? 'Resume' : 'Pause';
    text('playLabel', label); attr($('playIcon'), 'href', stopped || atBreak ? '#i-play' : '#i-pause');
    $('btnPlay').title = atBreak ? label : `${label} (Space)`;
    $('btnPlay').disabled = atBreak;
    const replayButton = $('btnReplay');
    const reviewing = viewingReview();
    replayButton.disabled = !state.goalFrames || !!state.replayQueue || state.ready || atBreak || reviewing || !!state.scene;
    textReplayButton(state.replay ? 'Exit replay' : 'Replay');
    const protectedPlay = !state.scan && !state.replay && (state.scene || V.holdingAction(m) || state.visiblePlay?.rank === 1);
    $('btnSkip').disabled = state.ready || atBreak || !!protectedPlay || (!!state.replayQueue && !state.replay);
    const skipLabel = state.replay ? 'Exit replay' : state.scan ? 'Stop here' : 'Next highlight';
    text('skipLabel', skipLabel);
    attr($('btnSkip'), 'aria-label', skipLabel);
    $('btnSkip').title = protectedPlay ? 'This passage is still in play' : state.scan ? 'Show this passage without changing highlight mode (S)' : `${skipLabel} (S)`;
    const indicator = $('replayIndicator');
    const view = state.replay ? 'replay' : state.scan ? 'search' : state.scene || (state.visiblePlay && !state.paused) ? 'highlight' : '';
    indicator.hidden = !(view || restart);
    if ($('pitchwrap').dataset.view !== view) $('pitchwrap').dataset.view = view;
    if (indicator.dataset.view !== view) indicator.dataset.view = view;
    if (restart) {
      const { title, detail, kind } = restartCopy(restart, m);
      if (indicator.dataset.restart !== kind) indicator.dataset.restart = kind;
      // Don't sit over the taker at the upper-left flag on a narrow pitch.
      const side = restart.x < E.CX && restart.y < 19 ? 'right' : 'left';
      if (indicator.dataset.side !== side) indicator.dataset.side = side;
      text('indicatorText', title); text('indicatorDetail', detail);
    } else {
      if (indicator.dataset.restart) { delete indicator.dataset.restart; delete indicator.dataset.side; }
      if (view) {
        const policy = (state.scene || state.visiblePlay)?.policy;
        text('indicatorText', state.replay ? (state.replay.paused ? 'Replay paused' : 'Goal replay') :
          state.scan ? (state.paused ? 'Search paused' : 'Skipping quiet play') :
          state.paused ? 'Playback paused' : policy.rank ? `${policy.label} highlights` : 'Returning to live play');
      }
    }
  }
  function textReplayButton(message) {
    const el = $('btnReplay').querySelector('span');
    if (el.textContent !== message) el.textContent = message;
    attr($('btnReplay'), 'aria-label', message);
    $('btnReplay').title = message === 'Replay' ? 'Replay last goal (R)' : 'Exit replay (R)';
  }

  function togglePlay() {
    const m = state.match;
    if (!m || V.atBreak(m)) return;
    if (state.replay) { state.replay.paused = !state.replay.paused; updateHUD(); return; }
    if (state.ready) {
      state.ready = false; state.paused = false; state.acc = 0;
      setSound(state.sound, true); A.whistle(false);
      const event = { type: 'kickoff', minute: 1, team: 0, text: `We’re underway at ${m.teams[0].club.stadium}.`, key: true };
      state.events.push(event); setFeed(event.text, event, 'Kick-off');
      startOpening();
    } else {
      state.acc = 0;
      state.paused = !state.paused;
    }
    updateHUD(); draw(); queueScan();
  }
  function syncSpeed() {
    const picker = $('playbackSpeed'), speed = state.speed;
    picker.value = String(speed);
    picker.title = speed === B.NORMAL_SPEED ? '1× · Normal speed (100%)' : `${speed}× · ${speed * 100}% of normal speed`;
  }
  function setSpeed(speed) {
    state.speed = B.speedFor(speed);
    syncSpeed();
  }

  const timingLabel = policy => `${policy.estimate} min at 1×`;

  function syncWatchMode() {
    const policy = chosenMode(), select = $('highlightMode');
    select.value = policy.id;
    select.title = `${policy.label} · ${policy.rank ? 'About ' : ''}${timingLabel(policy)} · ${policy.bestFor}. ${policy.detail}`;
  }

  function updateWatchGuide(policy) {
    text('watchEstimate', `${policy.rank ? '≈ ' : ''}${timingLabel(policy)}`);
    text('watchUse', policy.bestFor);
    text('watchDetail', policy.detail);
  }

  function setWatchMode(id) {
    const policy = V.modeFor(id);
    if (chosenMode() === policy) return;
    state.config.highlights = policy.id;
    state.nextSearch = null; state.acc = 0;
    // The selected policy takes over after the current passage. Never throw away
    // buffered play or publish its score because the viewer changed a setting.
    if (state.scan) showBuffered(state.scan, policy, policy.tail);
    else {
      if (state.scene) state.scene.policy = policy;
      // Full disables future cuts, not the current passage's protection. If
      // the viewer switches back before its end, keep the same aftermath.
      if (state.visiblePlay) state.visiblePlay.policy = policy;
    }
    syncWatchMode(); updateHUD(); draw(); queueScan();
  }

  function startOpening() {
    const policy = chosenMode();
    state.visiblePlay = policy.rank ? { policy, until: state.match.elapsed + policy.opening } : null;
  }

  function toggleSkip() {
    if ($('btnSkip').disabled) return;
    if (state.replay) { endReplay(); return; }
    if (state.scan) {
      const policy = chosenMode();
      showBuffered(state.scan, policy, policy.rank ? 12 : 0);
      updateHUD(); draw();
      return;
    }
    closeCut();
    state.paused = false;
    // A manual cut can reach the start of a buffered review; still wait for
    // its verdict rather than jumping over a decision in progress.
    if (viewingReview()) {
      const ev = state.events.findLast(e => e.type === 'varcheck');
      if (ev) setFeed(ev.text, ev, 'VAR check');
      updateHUD(); draw(); return;
    }
    const policy = chosenMode().rank ? chosenMode() : V.MODES.key;
    if (state.replayQueue) {
      state.replayQueue.auto = false;
      state.nextSearch = policy;
    } else beginSearch(policy);
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
      players.push({ id, team: meta.team, name: meta.name, num: meta.num, role: snap.roles ? snap.roles[i] : meta.role, pos: meta.pos, yellow: snap.cards ? snap.cards[i] : meta.yellow, x, y });
    }
    const i = snap.n * 2, j = next.n * 2;
    const w = Math.abs(snap.arr[i] - next.arr[j]) + Math.abs(snap.arr[i + 1] - next.arr[j + 1]) < 3 ? amount : 0;
    const ball = { x: mix(snap.arr[i], next.arr[j], w), y: mix(snap.arr[i + 1], next.arr[j + 1], w), z: mix(snap.arr[i + 2], next.arr[j + 2], w) };
    const referee = snap.referee && O.between(snap.referee, next.referee || snap.referee, amount);
    let restartPose = snap.restartPose;
    if (restartPose?.thrower && next.restartPose?.thrower === restartPose.thrower) {
      restartPose = { ...restartPose, load: mix(restartPose.load, next.restartPose.load, amount) };
    }
    return { elapsed: mix(snap.elapsed, next.elapsed, amount), players, ball, referee, restartPose, ownerId: snap.ids[snap.arr[i + 3]] };
  }
  function startReplay() {
    if (!state.goalFrames || state.replayQueue || state.scene) return;
    stopScanWork();
    state.nextSearch = null; state.acc = 0;
    const frames = state.goalFrames;
    state.replay = { frames, time: frames[0].elapsed, index: 0, frame: replayFrame(frames[0]), paused: false };
    $('goalBanner').hidden = true;
    updateHUD(); draw();
  }
  function endReplay() { state.replay = null; state.acc = 0; updateHUD(); draw(); queueScan(); }
  function tickReplay(seconds) {
    const rp = state.replay;
    if (rp.paused) return;
    rp.time += seconds;
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

  // Simulation events are recorded immediately but played only when the viewing cursor
  // reaches them. The score, goal audio and celebration cannot spoil a buffered attack.
  function onEvent(ev) {
    if (state.ready || !state.match) return;
    const film = filmView();
    if (film) film.entries.push({ elapsed: state.match.elapsed, ev });
    else publishEvent(ev);
  }

  function publishEvent(ev, quiet = false) {
    const m = state.match;
    const goal = GOALS.has(ev.type), end = BREAKS.has(ev.type);
    const key = V.DECISIVE.has(ev.type) || end || !!ev.key;
    const message = ev.type === 'kickoff' && ev.half === 2 && ev.t < .1 ? 'The second half is underway.' : ev.text;
    if (message && ev.type !== 'preview') {
      state.events.push({ ...ev, text: message, key });
      if (state.events.length > 245) state.events.shift();
      const label = goal ? 'Goal' : ev.type === 'pen' ? 'Penalty' : ev.type === 'varcheck' ? 'VAR check' : ev.type === 'varresult' ? 'VAR decision' :
        ev.type === 'offside' ? 'Offside' : ev.type === 'foul' ? 'Free kick' : ev.type === 'corner' ? 'Corner' :
        ev.type === 'yellow' ? 'Yellow card' : ev.type === 'red' ? 'Red card' : ev.type === 'throwin' ? 'Throw-in' : ev.type === 'goalkick' ? 'Goal kick' :
        ev.type === 'restartkick' ? restartTitle({ type: ev.restart, indirect: ev.indirect }) : null;
      if (!quiet || goal || end) setFeed(message, ev, label);
    }
    if (goal) {
      if (!quiet) {
        const g = m.lastGoal, club = m.teams[ev.team].club;
        text('goalSide', `Goal · ${club.short}`); text('goalTime', clockMinute(ev.minute));
        text('goalScorer', g && g.scorer ? g.scorer + (g.og ? ' (OG)' : '') : club.name);
        $('goalBanner').style.setProperty('--accent', portraitKit(club.primary));
        $('goalBanner').hidden = false;
        clearTimeout(state.goalTimer);
        state.goalTimer = setTimeout(() => { $('goalBanner').hidden = true; }, 3900);
        A.goal();
      }
      state.goalFrames = recordReplay(ev);
      if (state.goalFrames) {
        state.replayQueue = { goal: m.elapsed, end: m.elapsed + REPLAY_AFTERMATH, half: m.half, auto: state.config.auto && !quiet };
      }
    } else if (end) {
      state.paused = true; state.visiblePlay = state.nextSearch = null; state.acc = 0; state.breakQueued = ev.type;
      A.whistle(ev.type === 'ht', ev.type === 'ft');
    } else if (!quiet) {
      if (ev.type === 'restartwhistle' || ev.type === 'varcheck' || (['pen', 'offside', 'foul'].includes(ev.type) && !viewingReview())) A.whistle(false);
      else if (ev.type === 'restartkick' && ev.restart !== 'throwin') A.kick(.48);
      else if (ev.type === 'post' || ev.type === 'save') { A.kick(.7); if (ev.key) A.bigChance(); }
      else if (ev.type === 'red' || ev.type === 'yellow') A.bigChance();
    }
    if (LINEUP_EVENTS.has(ev.type)) state.lineupDirty = true;
  }

  const RESTART_TITLES = { corner: 'Corner', penalty: 'Penalty', throwin: 'Throw-in', goalkick: 'Goal kick', freekick: 'Free kick' };
  function restartTitle(sp) {
    return sp.reason === 'offside' && !sp.taken ? 'Offside' : sp.indirect ? 'Indirect free kick' : RESTART_TITLES[sp.type];
  }

  function restartFrame() {
    const sp = B.restartAt(state.match, 5.5);
    if (!sp) return null;
    const wall = sp.wall ?? [];
    return { type: sp.type, reason: sp.reason, indirect: !!sp.indirect, taken: sp.takenAt != null, technique: sp.technique, style: sp.style,
      stage: sp.stage, wall: wall.length, wallReady: wall.every(p => Math.hypot(p.x - p.tx, p.y - p.ty) <= .58),
      card: sp.card?.kind, offender: sp.offender?.name, team: sp.team, x: sp.x, y: sp.y,
      quick: sp.quick, managed: sp.managed, taker: sp.taker?.name || state.match.teams[sp.team].club.short };
  }

  function restartCopy(sp, match) {
    const club = match.teams[sp.team].club.short;
    if (sp.reason === 'offside' && !sp.taken) {
      return { title: `Offside · ${match.teams[1 - sp.team].club.short}`, detail: `Indirect free kick · ${club}`, kind: 'offside' };
    }
    const title = restartTitle(sp);
    const kind = sp.indirect ? 'indirect' : sp.type;
    if (sp.card) return { title: `${sp.card === 'red' ? 'Red card' : 'Yellow card'} · ${match.teams[1 - sp.team].club.short}`,
      detail: `${sp.offender} · ${title.toLowerCase()} to ${club}`, kind: sp.card };
    let action = 'to take';
    if (sp.taken) action = sp.technique === 'shot' ? 'shoots' : sp.technique === 'cross' ? 'delivers' : sp.type === 'corner' ? 'plays it short'
      : sp.type === 'throwin' ? ({ long: 'throws long', line: 'throws down the line', recycle: 'throws back', short: 'throws short' })[sp.style] || 'throws in'
      : sp.quick ? 'restarts quickly' : 'restarts play';
    else if (sp.stage === 'windup') action = 'raises the ball';
    else if (sp.stage === 'runup' && sp.managed) action = 'given the whistle';
    else if (sp.wall) action = sp.wallReady ? `waits · ${sp.wall} in the wall` : `to take · Wall forming`;
    else if (sp.managed) action = 'waits for the whistle';
    return { title: `${title} · ${club}`, detail: `${sp.taker} ${action}`, kind };
  }

  function withView(snap = state.match.snapshotFrame()) {
    const m = state.match;
    snap.phase = m.phase;
    snap.restart = restartFrame();
    snap.score = m.teams.map(team => team.score);
    snap.stats = m.teams.map(team => ({ ...team.stats }));
    snap.poss = m.possTime.slice();
    snap.shotCount = m.shotMap.length;
    snap.lastOutcome = m.shotMap.at(-1)?.outcome;
    snap.roles = m.playersCache.map(p => p.role);
    snap.cards = m.playersCache.map(p => p.yellow);
    return snap;
  }

  function drainEntries(entries, until, quiet) {
    let i = 0;
    while (i < entries.length && entries[i].elapsed <= until + 1e-6) {
      const { ev } = entries[i++];
      publishEvent(ev, quiet && !BREAKS.has(ev.type));
    }
    if (i) entries.splice(0, i);
  }

  function closeCut(quiet = true) {
    const film = filmView();
    if (!film) return;
    stopScanWork();
    state.scan = state.scene = null;
    state.acc = 0;
    drainEntries(film.entries, Infinity, quiet);
    if (state.lineupDirty) renderLineup();
  }

  const canScan = () => viewingMatch() && state.scan && !state.paused && !state.replay && !document.hidden && !activeDialog();

  function stopScanWork() {
    clearTimeout(state.scanJob);
    state.scanJob = null;
  }

  function queueScan() {
    if (!canScan() || state.scanJob != null) return;
    // A bounded timer advances the match even when the renderer's frame rate is low.
    // Pause, dialogs and tab visibility gate both presentation and search.
    const search = state.scan;
    state.scanJob = setTimeout(() => {
      state.scanJob = null;
      if (search !== state.scan || !canScan()) return;
      advanceSearch(); updateHUD();
      if (!state.scan) draw();
      queueScan();
    }, SCAN_YIELD);
  }

  function beginSearch(policy) {
    const first = withView();
    state.visiblePlay = state.nextSearch = null;
    state.scan = { first, view: first, time: first.elapsed, policy, entries: [], still: replayFrame(first) };
    state.acc = 0;
    updateHUD(); draw(); queueScan();
  }

  function updateScanView(scan, rank) {
    scan.time = rank == null ? V.searchStart(scan.first.elapsed, state.match.elapsed, scan.policy, scan.time)
      : V.visibleStart(scan.first.elapsed, state.match.elapsed, scan.policy, scan.time, rank);
    scan.view = V.frameAt(state.buffer, scan.time, scan.first);
    drainEntries(scan.entries, scan.time, true);
  }

  function showBuffered(scan, policy, tail, rank = Infinity) {
    const last = withView(), frames = V.clipFrames(state.buffer, scan.first, last, scan.time);
    stopScanWork();
    state.scan = null;
    state.visiblePlay = tail > 0 ? { policy, rank, until: last.elapsed + tail } : null;
    state.scene = { policy, entries: scan.entries, frames, view: frames[0], time: scan.time, frame: null };
    advanceScene(0);
  }

  function advanceSearch() {
    const scan = state.scan;
    const result = V.scanBatch(state.match, state.scout, scan.policy);
    if (result.type === 'break') { closeCut(); return; }
    updateScanView(scan, result.rank);
    if (result.type === 'moment') showBuffered(scan, scan.policy, V.tailFor(scan.policy, result.rank), result.rank);
  }

  function advanceScene(seconds) {
    const scene = state.scene, frames = scene.frames, last = frames.at(-1);
    // The playhead uses match seconds directly; clips have no separate pace.
    const next = scene.time + seconds;
    scene.time = Math.min(last.elapsed, next);
    const i = V.indexAt(frames, scene.time), a = frames[i], b = frames[Math.min(i + 1, frames.length - 1)];
    scene.view = a;
    scene.frame = replayFrame(a, b, fraction(scene.time, a.elapsed, b.elapsed));
    drainEntries(scene.entries, scene.time, false);
    if (scene.time >= last.elapsed) {
      closeCut(false);
      // Keep the unused fraction of this frame for the live handoff.
      if (!state.paused) state.acc = next - last.elapsed;
    }
  }

  function renderLineup() {
    state.lineupDirty = false;
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
    $('preHighlights').value = chosenMode().id;
    updateWatchGuide(chosenMode());
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

  // Desk dialogs freeze the engine at its current tick. An edit ends any active
  // search, lets the unseen frames play, then keeps the next live passage on screen.
  function touchlineChange() {
    const m = state.match, policy = chosenMode();
    state.nextSearch = null;
    if (state.scan) showBuffered(state.scan, policy, 0);
    if (policy.rank && !state.ready && !V.atBreak(m)) {
      state.visiblePlay = { policy, until: Math.max(m.elapsed + 12, state.visiblePlay?.until ?? 0) };
    }
    return !!state.scene;
  }

  function renderTactics() {
    const m = state.match, t = m.teams[0].tactics, away = m.teams[1];
    const timing = filmView() ? `Changes take effect at ${m.clockStr()}, when the current footage ends.` : 'Set how your side plays. Changes apply when play resumes.';
    $('tab-tactics').innerHTML = `<p class="help-text desk-feedback" role="status">${timing}</p><div class="desk-grid">${TACTICS.map(([key, title, values]) => `<label class="tactic-control">${title}<select data-tactic="${key}">${options(values, key !== 'formation')}</select></label>`).join('')}</div><div class="opposition"><strong>${html(away.club.name)} · Opposition setup</strong>${shapeLabel(away.tactics.formation)} · ${html(D.MENTALITIES[away.tactics.mentality])} · ${html(D.PRESS[away.tactics.press])} press</div>`;
    for (const select of $('tab-tactics').querySelectorAll('[data-tactic]')) select.value = t[select.dataset.tactic];
  }
  function renderSquad() {
    const t = state.match.teams[0];
    const pendingReview = state.match.phase === 'review';
    const available = !state.ready && state.match.phase !== 'fulltime' && !pendingReview;
    const inPlayer = t.players.find(p => p.id === state.subMode);
    const row = (p, role, bench) => `<div class="squad-row"><span>${p.num}</span><span>${html(p.name)}</span><span class="row-role">${role}</span><span class="row-cond">${condition(p)}%</span>${bench ? `<button type="button" class="button" data-bench="${html(p.id)}" ${!available || t.subsUsed >= 5 ? 'disabled' : ''}>Bring on</button>` : inPlayer ? `<button type="button" class="button" data-out="${html(p.id)}" ${!available || (role === 'GK') !== (inPlayer.pos === 'GK') ? 'disabled' : ''}>Replace</button>` : '<span></span>'}</div>`;
    const timing = filmView() ? ` · changes take effect at ${state.match.clockStr()}` : '';
    $('tab-squad').innerHTML = `<p class="help-text desk-feedback" role="status">${state.ready ? 'Substitutions are available after kick-off.' : pendingReview ? 'Wait for the VAR decision before substituting.' : `${Math.max(0, 5 - t.subsUsed)} substitutions remaining${timing}.`}</p>${inPlayer ? `<div class="sub-note">Bring on ${html(inPlayer.name)}. Pick a player to replace.<button class="button" type="button" data-cancel-sub>Cancel</button></div>` : ''}<div class="squad-head"><strong>On the pitch</strong><span>${t.slots.length} players</span></div>${t.slots.map(s => row(s.player, s.role, false)).join('')}<div class="squad-head"><strong>On the bench</strong></div>${t.bench.map(p => row(p, p.pos, true)).join('')}`;
  }

  const statLine = (title, a, b) => `<div class="stat-line"><strong>${a}</strong><span>${title}</span><strong>${b}</strong></div>`;
  function statsMarkup(short) {
    const m = state.match, view = filmView()?.view;
    const [a, b] = view ? view.stats : m.teams.map(t => t.stats);
    const poss = view ? view.poss : m.possTime;
    const total = poss[0] + poss[1];
    const possession = total ? Math.round(poss[0] / total * 100) : 50;
    const passPct = s => s.passes ? Math.round(s.passWon / s.passes * 100) + '%' : '–';
    return statLine('Possession', possession + '%', (100 - possession) + '%') +
      statLine('Shots', a.shots, b.shots) + statLine('On target', a.onTarget, b.onTarget) +
      statLine('Expected goals', a.xG.toFixed(2), b.xG.toFixed(2)) + statLine('Passes completed', a.passWon, b.passWon) +
      (short ? '' : statLine('Pass accuracy', passPct(a), passPct(b)) + statLine('Corners', a.corners, b.corners) + statLine('Offsides', a.offsides, b.offsides) + statLine('Fouls', a.fouls, b.fouls) + statLine('Saves', a.saves, b.saves));
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
    const view = filmView()?.view, count = view ? view.shotCount : m.shotMap.length;
    for (let i = 0; i < count; i++) {
      const shot = m.shotMap[i], outcome = view && i === count - 1 ? view.lastOutcome : shot.outcome;
      if (outcome === 'disallowed') continue;
      ctx.beginPath(); ctx.arc(x(shot.x), y(shot.y), 4 + shot.xg * 14, 0, Math.PI * 2);
      ctx.fillStyle = outcome === 'goal' ? '#e6f6c5' : portraitKit(m.teams[shot.team].club.primary);
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
    if (!f || filmView() || state.replay || !ball.lastTouch) return;
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

  function advance(seconds) {
    const m = state.match, policy = chosenMode();
    if (state.scene) { advanceScene(seconds); return; }
    if (state.scan) return;
    if (!state.replayQueue) {
      if (state.nextSearch) { beginSearch(state.nextSearch); return; }
      if (state.visiblePlay && m.elapsed >= state.visiblePlay.until && !V.holdingAction(m)) state.visiblePlay = null;
      if (policy.rank && !state.visiblePlay && !V.holdingAction(m)) { beginSearch(policy); return; }
    }
    state.acc += seconds;
    while (!state.replay && !state.paused && state.acc >= H) {
      state.acc -= H;
      m.step(H);
      const rank = state.scout.check(m);
      if (state.visiblePlay && rank <= state.visiblePlay.policy.rank) {
        state.visiblePlay.rank = Math.min(state.visiblePlay.rank ?? Infinity, rank);
        state.visiblePlay.until = Math.max(state.visiblePlay.until, m.elapsed + V.tailFor(state.visiblePlay.policy, rank));
      } else if (policy.rank && rank <= policy.rank && !state.paused) {
        state.visiblePlay = { policy, rank, until: m.elapsed + V.tailFor(policy, rank) };
      }
    }
    if (state.lineupDirty) renderLineup();
    observePlay(); completeReplayCapture();
  }

  function draw() {
    const frame = state.replay?.frame || state.scene?.frame || state.scan?.still;
    const alpha = !frame && !state.paused ? fraction(state.acc, 0, H) : 1;
    state.renderer.draw(state.match, {
      ready: state.ready, names: state.names, selected: state.selected,
      live: !state.ready && !state.scan, frame, alpha, restart: viewingRestart(),
      referee: frame ? null : state.match.referee.pose(state.match, state.match.elapsed - (state.paused ? 0 : H * (1 - alpha)))
    });
  }
  function loop(t) {
    if (!viewingMatch()) { state.frameJob = null; state.lastFrame = null; return; }
    state.frameJob = requestAnimationFrame(loop);
    const dt = state.lastFrame == null ? 0 : Math.max(0, Math.min(MAX_FRAME_DT, (t - state.lastFrame) / 1000));
    state.lastFrame = t;
    if (state.breakQueued && !activeDialog()) showBreak(state.breakQueued);
    let changed = false;
    if (!document.hidden && !activeDialog()) {
      const seconds = B.matchSeconds(dt, state.speed);
      if (state.replay) {
        if (!state.replay.paused) { tickReplay(seconds); changed = true; }
      } else if (state.scan) queueScan();
      else if (!state.ready && !state.paused) { advance(seconds); changed = true; }
    }
    if (changed && t - state.tileT > 540) { state.tileT = t; if (!state.replay && !filmView()) updateLineupCondition(); }
    if (changed) updateHUD();
    if ((changed && (!state.scan || state.replay)) || state.renderer.needsPaint) draw();
  }

  function wire() {
    $('btnPlay').addEventListener('click', togglePlay);
    $('btnSkip').addEventListener('click', toggleSkip);
    const modeOptions = Object.values(V.MODES).map(mode => `<option value="${mode.id}">${mode.label}</option>`).join('');
    $('highlightMode').innerHTML = $('preHighlights').innerHTML = modeOptions;
    $('highlightMode').addEventListener('change', e => setWatchMode(e.target.value));
    $('preHighlights').addEventListener('change', e => updateWatchGuide(V.modeFor(e.target.value)));
    document.addEventListener('visibilitychange', queueScan);
    for (const id of ['setupDialog', 'deskDialog', 'breakDialog']) $(id).addEventListener('close', queueScan);
    const speedPicker = $('playbackSpeed');
    speedPicker.innerHTML = B.SPEEDS.map(speed => `<option value="${speed}"${speed === B.NORMAL_SPEED ? ' aria-label="1×, normal speed"' : ''}>${speed}×</option>`).join('');
    speedPicker.addEventListener('change', e => setSpeed(Number(e.target.value)));
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
      const config = { home: +$('preHome').value, away: +$('preAway').value, formation: $('preForm').value, mentality: +$('preMent').value, auto: $('preReplay').checked, sound: $('preSound').checked, highlights: $('preHighlights').value };
      if (config.home === state.config.home && config.away === state.config.away) config.competition = state.config.competition;
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
      const m = state.match, buffered = touchlineChange();
      m.setTactics(0, { [key]: key === 'formation' ? e.target.value : +e.target.value });
      if (key === 'formation' || key === 'width') {
        if (state.ready) m.setupKickoff(0);
        if (buffered) state.lineupDirty = true;
        else renderLineup();
      }
      notify(buffered ? `Instruction set for ${m.clockStr()}, after the current footage.` : 'Instruction updated.');
      updateHUD(); draw();
    });
    $('tab-squad').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      if (b.hasAttribute('data-cancel-sub')) { state.subMode = null; renderSquad(); }
      else if (b.dataset.bench) { state.subMode = b.dataset.bench; renderSquad(); }
      else if (b.dataset.out && state.subMode) {
        const buffered = touchlineChange(), m = state.match;
        const result = m.substitute(0, b.dataset.out, state.subMode);
        state.subMode = null; renderSquad();
        if (!buffered) renderLineup();
        notify(result.ok ? (buffered ? `Substitution set for ${m.clockStr()}, after the current footage.` : 'Substitution made.') : result.msg);
        updateHUD(); draw();
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
        state.paused = false; state.acc = 0; state.match.continueSecondHalf();
        startOpening(); renderLineup(); updateHUD();
      } else prepare({ ...state.config, formation: state.match.teams[0].tactics.formation, mentality: state.match.teams[0].tactics.mentality });
    });
    document.addEventListener('keydown', e => {
      if (!viewingMatch() || activeDialog() || e.altKey || e.ctrlKey || e.metaKey || e.repeat || e.target.matches('input, select, textarea, [contenteditable]')) return;
      const key = e.key.toLowerCase();
      if (e.code === 'Space' && !e.target.closest('button')) { e.preventDefault(); togglePlay(); }
      else if (Object.hasOwn(SPEED_SHORTCUTS, key)) setSpeed(SPEED_SHORTCUTS[key]);
      else if (key === 'n') $('btnNames').click();
      else if (key === 's') toggleSkip();
      else if (key === 'r' && !$('btnReplay').disabled) $('btnReplay').click();
      else if (key === 'escape') { if (state.replay) endReplay(); else selectPlayer(null); }
    });
  }
  // Home hides the broadcast without rebuilding its match or advancing a tick.
  function open(config) {
    if (!viewingMatch()) return;
    if (!state.renderer) {
      state.renderer = new global.TLRender.Renderer($('pitch'));
      wire(); prepare({ ...state.config, ...config });
      if (document.fonts) document.fonts.ready.then(() => { if (viewingMatch()) draw(); });
    } else {
      state.renderer.resize();
      A.setMuted(!state.sound);
      if (V.atBreak(state.match) && !activeDialog()) showBreak(state.match.phase === 'halftime' ? 'ht' : 'ft');
      else updateHUD();
      draw();
    }
    state.lastFrame = null;
    if (state.frameJob == null) state.frameJob = requestAnimationFrame(loop);
    queueScan();
  }
  function suspend() {
    stopScanWork();
    if (state.frameJob != null) cancelAnimationFrame(state.frameJob);
    state.frameJob = state.lastFrame = null;
    A.setMuted(true);
    if ($('breakDialog').open) $('breakDialog').close();
  }
  global.TLMatchView = { open, suspend };
})(typeof window !== 'undefined' ? window : globalThis);
