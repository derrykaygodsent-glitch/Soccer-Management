/* Touchline 26 — Classic 2D match simulation. Positions in metres, time in seconds. */
(function (global) {
  'use strict';
  const D = (typeof require !== 'undefined' && typeof window === 'undefined') ? require('./data.js') : global.TLData;

  const P = typeof window === 'undefined' ? require('./physics.js') : global.TLPhysics;
  const AI = typeof window === 'undefined' ? require('./decisions.js') : global.TLDecisions;

  const L = 105, W = 68, CX = 52.5, CY = 34;
  const GOAL_HALF = 3.66, GOAL_H = 2.44;
  const BOX_L = 16.5, BOX_HALF = 20.16, SIX_L = 5.5, SIX_HALF = 9.16, PEN = 11;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const lerp = (a, b, t) => a + (b - a) * t;
  const DEFENSIVE_ROWS = { DC: 0, FB: 2.5, WB: 6, DM: 8.2, CM: 13.7, AM: 20.4, W: 20.8, ST: 27.6 };
  const BRAIN_TICK = .125;
  const TEMPO_HOLD = [1.23, 1, .84];

  const TXT = {
    goal: [
      'GOAL! {p} finishes it off for {team}! {a}',
      'GOAL! {p} finds the net! {team} erupt! {a}',
      'It\'s in! {p} scores for {team}! {a}',
      'Clinical from {p}! {team} have their goal! {a}'
    ],
    og: ['Disaster! {p} turns it into his own net! {team} lead!'],
    save: ['{p} lets fly — but what a save by {k}!', 'Brilliant stop! {k} denies {p}.', '{p} strikes it well, {k} gets down smartly.'],
    catch: ['{p} shoots, {k} gathers it comfortably.', 'Straight at {k} — {p} will be disappointed.'],
    miss: ['{p} drags it wide! Should have done better.', 'Over the bar from {p}! That was a chance.', '{p} blazes it over! The keeper watches it sail past.'],
    block: ['{p} shoots — blocked! {d} throws himself in the way.', 'A vital block from {d} as {p} pulls the trigger!'],
    post: ['OFF THE POST! {p} is inches away!', 'The woodwork rescues {opp}! {p} rattles the frame!'],
    chance: ['Big chance for {team}! {p} is through...'],
    foul: ['Foul by {p} on {v}. Free kick to {opp}.', '{p} brings down {v} — the referee\'s whistle goes.'],
    yellow: ['Yellow card for {p} — a cynical challenge.'],
    red: ['RED CARD! {p} is off! {team} are down to {n} men!'],
    pen: ['PENALTY! {p} brings down {v} in the box! Huge moment!'],
    penscore: ['GOAL from the spot! {p} keeps his cool!'],
    penmiss: ['SAVED! {k} guesses right and denies {p} from twelve yards!'],
    offside: ['Flag\'s up — {p} is offside.'],
    corner: ['Corner to {team}.', '{team} win a corner — bodies forward.'],
    throwin: ['Throw-in for {team}.'],
    goalkick: ['Goal kick, {team} build from the back.'],
    freekick: ['Free kick to {team} in a promising area.'],
    sub: ['{team} make a change: {on} replaces {off}.'],
    kickoff: ['We\'re underway at {stadium}!', 'Second half underway!'],
    ht: ['Half time. {h} {hs} - {as} {a}.'],
    ft: ['Full time! {h} {hs} - {as} {a}.'],
    stoppage: ['{n} minutes of added time.'],
    tackle: ['{p} wins it back with a strong challenge.'],
    cross: ['{p} whips a dangerous ball into the box!'],
    header: ['{p} rises highest — header!'],
    clear: ['{p} hooks it clear.'],
    longshot: ['{p} tries his luck from distance!']
  };

  function fmt(tpl, map) { return tpl.replace(/\{(\w+)\}/g, (_, k) => map[k] != null ? map[k] : ''); }

  class Match {
    constructor(homeClub, awayClub, opts = {}) {
      this.seed = opts.seed != null ? opts.seed : (Math.random() * 1e9) | 0;
      this.rnd = D.mulberry32(this.seed);
      this.choiceRnd = D.mulberry32(this.seed ^ 0x9dd147a5);
      this.textRnd = D.mulberry32(this.seed ^ 0x7a19d143);
      this.onEvent = opts.onEvent || (() => {});
      this.onSnapshot = opts.onSnapshot || null;
      this.snapEvery = 2; this.snapCount = 0;
      this.events = [];
      this.shotMap = [];
      this.momentum = [];
      this.momT = 0;
      this.possTime = [0, 0];
      this.t = 0; this.half = 1; this.elapsed = 0; this.controlTeam = 0; this.brainIn = 0;
      this.added = [0, 0]; this.addedAnnounced = [false, false];
      this.phase = 'pre';
      this.phaseTimer = 0;
      this.setpiece = null;
      this.lastPass = null;
      this.teams = [homeClub, awayClub].map((club, i) => {
        const players = D.genSquad(club, D.seedFor(club.id));
        const tactics = (i === 0 ? opts.homeTactics : opts.awayTactics) || D.defaultTactics(club.style);
        const { xi, bench } = D.bestXI(players, tactics.formation);
        const team = {
          idx: i, club, players, tactics: { ...tactics }, bench,
          slots: xi.map(s => ({ ...s })),
          attackDir: i === 0 ? 1 : -1,
          subsUsed: 0, score: 0,
          stats: { shots: 0, onTarget: 0, xG: 0, passes: 0, passWon: 0, tackles: 0, fouls: 0, corners: 0, offsides: 0, saves: 0, yellow: 0, red: 0, possession: 0 }
        };
        players.forEach(p => {
          p.team = i; p.onPitch = false;
          p.x = 0; p.y = 0; p.vx = 0; p.vy = 0; p.tx = 0; p.ty = 0;
          p.decisionT = 0; p.tackleT = 0; p.stunT = 0; p.contactT = 0; p.runT = 2 + this.rnd() * 6; p.runUntil = 0; p.running = 0;
          p.offsideFlag = false; p.cond = 1; p.dir = 0; p.dribPhase = this.rnd() * 6;
          p.holding = false; p.sprint = false;
          p.reading = AI.profile(p, D.seedFor(p.id));
          p.runSince = p.receivedAt = -Infinity; p.quickControl = false; p.ballPlan = null;
        });
        team.slots.forEach(s => this.assignSlot(s.player, s, team));
        return team;
      });
      this.ball = { x: CX, y: CY, z: 0, vx: 0, vy: 0, vz: 0, ax: 0, ay: 0, owner: null, lastTouch: null, releaseT: -9, flight: null, bounces: 0 };
      this.playersCache = this.onPitchPlayers(); this.shotId = 0;
      this.chasers = [null, null]; this.chasers2 = [null, null];
      this.watchdog = 0;
      this.kickoffTeam = 0;
      this.setupKickoff(0);
      this.emit('preview', { text: 'Teams are out. ' + homeClub.name + ' vs ' + awayClub.name + ' at ' + homeClub.stadium + '.' });
    }

    assignSlot(p, slot, team) {
      p.onPitch = true; p.role = slot.role; p.slotX = slot.x; p.slotY = slot.y; p.teamRef = team;
      const h = this.homePos(p, team);
      p.x = h.x; p.y = h.y; p.tx = h.x; p.ty = h.y;
    }

    homePos(p, team) {
      const d = team.attackDir;
      const x = d > 0 ? p.slotX * L : L - p.slotX * L;
      const widthF = [0.78, 1, 1.2][team.tactics.width];
      const y = CY + (p.slotY * W - CY) * widthF;
      return { x: clamp(x, 2, L - 2), y: clamp(y, 2, W - 2) };
    }

    onPitchPlayers() {
      const out = [];
      for (const t of this.teams) for (const s of t.slots) if (s.player.onPitch && !s.player.red) out.push(s.player);
      return out;
    }
    gk(team) {
      const s = team.slots.find(sl => sl.role === 'GK' || sl.player.pos === 'GK') || team.slots[0];
      return s ? s.player : null;
    }

    minute() {
      const base = this.half === 2 ? 45 : 0;
      return Math.min(base + Math.floor(this.t / 60) + 1, base + 45 + Math.ceil(this.added[this.half - 1] / 60));
    }
    clockStr() {
      const base = this.half === 2 ? 2700 : 0;
      const s = Math.floor(base + this.t);
      return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    }

    emit(type, data = {}) {
      const ev = { type, t: this.t, half: this.half, minute: this.minute(), clock: this.clockStr(), ...data };
      this.events.push(ev);
      this.onEvent(ev);
      return ev;
    }
    say(type, map, extra = {}) {
      const pool = TXT[type];
      const tpl = pool[(this.textRnd() * pool.length) | 0];
      return this.emit(type, { text: fmt(tpl, map), ...extra });
    }
    teamName(i) { return this.teams[i].club.name; }
    shortName(i) { return this.teams[i].club.short; }

    /* ---------------- setup / phases ---------------- */

    setupKickoff(teamIdx, afterGoal = false) {
      this.phase = 'kickoff'; this.phaseTimer = afterGoal ? 7.2 : 2.65; this.kickoffTeam = teamIdx;
      this.controlTeam = teamIdx; this.lastPass = null; this.brainIn = 0;
      this.shapeX = CX; this.shapeY = CY;
      const b = this.ball;
      Object.assign(b, { x: CX, y: CY, z: 0, vx: 0, vy: 0, vz: 0, ax: 0, ay: 0, bounces: 0, flight: null, lastTouch: null });
      this.playersCache = this.onPitchPlayers();
      for (const p of this.playersCache) {
        const team = this.teams[p.team], d = team.attackDir, home = this.homePos(p, team);
        const depth = d > 0 ? home.x : L - home.x;
        const lined = depth < 38 ? depth : Math.min(CX - 2.45, 38 + (depth - 38) * .296);
        p.tx = d > 0 ? lined : L - lined; p.ty = home.y;
        p.kickoffHold = true; p.sprint = afterGoal; p.offsideFlag = false; p.spRole = null;
        p.running = 0; p.runUntil = this.elapsed; p.runT = this.elapsed + 2 + this.rnd() * 9;
        p.ballPlan = null; p.receivedAt = -Infinity; p.quickControl = false;
      }
      const kt = this.teams[teamIdx];
      const slots = kt.slots.filter(s => s.role !== 'GK');
      const taker = (slots.find(s => s.role === 'ST') || slots[slots.length - 1] || kt.slots[0]).player;
      taker.tx = CX - kt.attackDir * .76; taker.ty = CY;
      if (!afterGoal) for (const p of this.playersCache) {
        p.x = p.prevX = p.tx; p.y = p.prevY = p.ty; p.vx = p.vy = 0; p.dir = this.teams[p.team].attackDir > 0 ? 0 : Math.PI;
      }
      b.owner = b.lastTouch = taker; b.releaseT = this.elapsed;
      this.kickoffTaker = taker;
      const text = afterGoal ? `${this.teamName(teamIdx)} get the game going again.` : this.half === 2 ? 'The second half is underway.' : `We’re underway at ${this.teams[0].club.stadium}.`;
      this.emit('kickoff', { text, team: teamIdx, key: !afterGoal });
    }

    begin() { if (this.phase === 'pre') this.setupKickoff(0); }

    continueSecondHalf() {
      if (this.phase !== 'halftime') return;
      this.half = 2; this.t = 0; this.brainIn = 0;
      for (const team of this.teams) {
        team.attackDir *= -1;
        for (const s of team.slots) { s.player.cond = Math.min(1, s.player.cond + 0.065); }
      }
      this.setupKickoff(1);
    }

    setTactics(ti, partial) {
      const team = this.teams[ti];
      const oldForm = team.tactics.formation;
      Object.assign(team.tactics, partial); this.brainIn = 0;
      if (partial.formation && partial.formation !== oldForm) this.reassignFormation(ti);
    }

    reassignFormation(ti) {
      const team = this.teams[ti];
      const on = team.slots.map(s => s.player).filter(p => p.onPitch && !p.red);
      const { xi } = D.bestXI(on, team.tactics.formation);
      team.slots = xi.map(s => ({ ...s }));
      team.slots.forEach(s => { s.player.role = s.role; s.player.slotX = s.x; s.player.slotY = s.y; });
      this.playersCache = this.onPitchPlayers(); this.brainIn = 0;
    }

    substitute(ti, outId, inId) {
      const team = this.teams[ti];
      if (team.subsUsed >= 5) return { ok: false, msg: 'No substitutions remaining.' };
      const slot = team.slots.find(s => s.player.id === outId);
      const np = team.players.find(p => p.id === inId);
      if (!slot || !np) return { ok: false, msg: 'Invalid substitution.' };
      if (np.onPitch || np.red) return { ok: false, msg: 'Player not available.' };
      const old = slot.player;
      if ((old.pos === 'GK') !== (np.pos === 'GK')) return { ok: false, msg: 'Goalkeepers can only be replaced by goalkeepers.' };
      old.onPitch = false;
      np.onPitch = true; np.cond = 1; np.rating = 6.5;
      np.x = old.x; np.y = old.y; np.vx = old.vx; np.vy = old.vy;
      np.role = slot.role; np.slotX = slot.x; np.slotY = slot.y; np.teamRef = team;
      np.decisionT = 0; np.tackleT = 0; np.stunT = 0; np.runT = 3; np.running = 0; np.contactT = 0; np.runUntil = 0; np.offsideFlag = false; np.holding = false;
      np.ballPlan = null; np.runSince = np.receivedAt = -Infinity; np.quickControl = false;
      slot.player = np;
      team.bench = team.players.filter(p => !p.onPitch && !p.red);
      team.subsUsed++;
      if (this.ball.owner === old) { this.ball.owner = np; this.ball.lastTouch = np; }
      this.playersCache = this.onPitchPlayers(); this.brainIn = 0;
      this.say('sub', { team: this.teamName(ti), on: np.name, off: old.name }, { team: ti, key: true });
      return { ok: true };
    }

    sendOff(p, reason) {
      p.red = true; p.onPitch = false;
      const team = this.teams[p.team];
      team.stats.red++;
      this.adjust(p, -0.8);
      team.slots = team.slots.filter(s => s.player !== p);
      this.reassignFormation(p.team);
      team.bench = team.players.filter(pp => !pp.onPitch && !pp.red);
      if (this.ball.owner === p) this.ball.owner = null;
      const n = team.slots.length;
      this.say('red', { p: p.name, team: this.teamName(p.team), n }, { team: p.team, player: p, key: true, reason });
    }

    adjust(p, d) { p.rating = clamp(p.rating + d, 4.0, 10.0); }

    /* ---------------- set pieces ---------------- */

    startSetPiece(type, teamIdx, x, y, extra = {}) {
      const team = this.teams[teamIdx];
      const b = this.ball;
      b.x = clamp(x, 0.3, L - 0.3); b.y = clamp(y, 0.3, W - 0.3); b.z = 0; b.vx = b.vy = b.vz = 0; b.owner = null; b.flight = null; b.ax = b.ay = b.bounces = 0;
      this.phase = type; this.brainIn = 0; this.lastPass = null;
      for (const p of this.playersCache) { p.spRole = null; p.sprint = false; }
      this.phaseTimer = type === 'penalty' ? 8.0 : type === 'corner' ? 8.0 : type === 'freekick' ? 7.0 : 4.5;
      // taker: nearest suitable outfield player (GK for goal kick)
      let taker;
      if (type === 'goalkick') taker = this.gk(team);
      else if (type === 'penalty') taker = extra.taker || this.bestShooter(team);
      else {
        const cands = team.slots.map(s => s.player).filter(p => p.onPitch && p.pos !== 'GK');
        if (type === 'corner') cands.sort((a, b2) => (b2.attrs.passing + (b2.role === 'W' ? 6 : 0)) - (a.attrs.passing + (a.role === 'W' ? 6 : 0)));
        else cands.sort((a, b2) => dist(a.x, a.y, b.x, b.y) - dist(b2.x, b2.y, b.x, b.y));
        taker = cands[0];
      }
      this.setpiece = { type, team: teamIdx, taker, x: b.x, y: b.y, ...extra };
      // targets
      const d = team.attackDir;
      const opp = this.teams[1 - teamIdx];
      if (type === 'corner') {
        const spots = [
          { x: L / 2 + d * (L / 2 - PEN + 1), y: CY - 3 }, { x: L / 2 + d * (L / 2 - 7), y: CY + 3.5 },
          { x: L / 2 + d * (L / 2 - 12), y: CY - 6 }, { x: L / 2 + d * (L / 2 - 14), y: CY + 7 }
        ];
        const attackers = team.slots.map(s => s.player).filter(p => p !== taker && p.pos !== 'GK' && ['ST', 'DC', 'AM', 'CM', 'W'].includes(p.role))
          .sort((a, b2) => (b2.attrs.positioning + b2.attrs.shooting) - (a.attrs.positioning + a.attrs.shooting)).slice(0, 4);
        attackers.forEach((p, i) => { p.tx = spots[i].x; p.ty = spots[i].y; p.spRole = 'box'; });
        const defenders = opp.slots.map(s => s.player).filter(p => p.pos !== 'GK')
          .sort((a, b2) => (b2.attrs.tackling + b2.attrs.positioning) - (a.attrs.tackling + a.attrs.positioning)).slice(0, 5);
        defenders.forEach((p, i) => {
          if (i < attackers.length) { p.tx = attackers[i].tx + d * 1.45; p.ty = attackers[i].ty; }
          else { p.tx = L / 2 + d * (L / 2 - 10); p.ty = CY + (i - 3) * 5; }
          p.spRole = 'boxdef';
        });
        for (const p of this.onPitchPlayers()) if (!p.spRole && p !== taker && p.pos !== 'GK') {
          p.tx = clamp(b.x - d * 22, 8, L - 8); p.ty = clamp(b.y + (p.slotY - 0.5) * 18, 6, W - 6);
        }
      } else if (type === 'freekick' && extra.direct) {
        // wall
        const gx = d > 0 ? L : 0;
        const ang = Math.atan2(CY - b.y, gx - b.x);
        const wallers = opp.slots.map(s => s.player).filter(p => p.pos !== 'GK')
          .sort((a, b2) => (b2.attrs.tackling + b2.attrs.composure) - (a.attrs.tackling + a.attrs.composure)).slice(0, 3);
        wallers.forEach((p, i) => {
          const off = (i - 1) * 1.1;
          p.tx = b.x + Math.cos(ang) * 9.15 - Math.sin(ang) * off;
          p.ty = b.y + Math.sin(ang) * 9.15 + Math.cos(ang) * off;
          p.spRole = 'wall';
        });
        for (const p of this.onPitchPlayers()) if (!p.spRole && p !== taker && p.pos !== 'GK') {
          const h = this.homePos(p, this.teams[p.team]);
          p.tx = h.x; p.ty = h.y;
        }
      } else if (type === 'penalty') {
        const gx = d > 0 ? L - PEN : PEN;
        b.x = gx; b.y = CY;
        taker.tx = gx - d * 3.5; taker.ty = CY;
        this.setpiece.x = b.x; this.setpiece.y = b.y;
        const keeper = this.gk(opp);
        keeper.tx = d > 0 ? L - 0.6 : 0.6; keeper.ty = CY;
        for (const p of this.onPitchPlayers()) if (p !== taker && p.pos !== 'GK') {
          const h = this.homePos(p, this.teams[p.team]);
          p.tx = clamp(h.x, 12, L - 12); p.ty = h.y;
          // outside the box
          const inBoxX = d > 0 ? p.tx > L - BOX_L - 1 : p.tx < BOX_L + 1;
          if (inBoxX && Math.abs(p.ty - CY) < BOX_HALF + 1) p.tx = d > 0 ? L - BOX_L - 2 - this.rnd() * 4 : BOX_L + 2 + this.rnd() * 4;
        }
      } else {
        for (const p of this.onPitchPlayers()) if (p !== taker && p.pos !== 'GK') {
          const h = this.homePos(p, this.teams[p.team]);
          p.tx = h.x; p.ty = h.y;
          if (dist(p.tx, p.ty, b.x, b.y) < 4 && p.team !== teamIdx) {
            const a = Math.atan2(p.ty - b.y, p.tx - b.x);
            p.tx = b.x + Math.cos(a) * 5; p.ty = b.y + Math.sin(a) * 5;
          }
        }
      }
      taker.tx = b.x - (type === 'throwin' ? 0 : d * 0.8); taker.ty = b.y;
      taker.spRole = 'taker';
      if (type === 'throwin') { taker.tx = b.x; taker.ty = b.y < CY ? -0.8 : W + 0.8; }
      this.spClearRolesAt = this.t + this.phaseTimer + 0.5;
    }

    bestShooter(team) {
      const c = team.slots.map(s => s.player).filter(p => p.pos !== 'GK');
      const pool = c.length ? c : team.slots.map(s => s.player);
      return pool.sort((a, b) => (b.attrs.shooting + b.attrs.composure) - (a.attrs.shooting + a.attrs.composure))[0];
    }

    executeSetPiece() {
      const sp = this.setpiece; if (!sp) { this.phase = 'open'; return; }
      const team = this.teams[sp.team];
      const taker = sp.taker;
      const b = this.ball;
      b.x = sp.x; b.y = sp.y;
      b.owner = taker; b.lastTouch = taker;
      for (const p of this.playersCache) p.spRole = null;
      this.phase = 'open'; this.brainIn = 0; this.controlTeam = sp.team; this.lastPass = null;
      if (sp.type === 'throwin') {
        this.doPass(taker, { noOffside: true, technique: 'throw', maxDist: 22 });
      } else if (sp.type === 'goalkick') {
        if (team.tactics.passing === 2 || this.rnd() < 0.35) this.doLongBall(taker, true);
        else this.doPass(taker, { noOffside: true, maxDist: 31 });
      } else if (sp.type === 'corner') {
        team.stats.corners++;
        this.doCross(taker, true);
      } else if (sp.type === 'freekick') {
        if (sp.direct) {
          this.doShot(taker, { fk: true });
        } else this.doPass(taker, { noOffside: false });
      } else if (sp.type === 'penalty') {
        const d = team.attackDir;
        taker.x = b.x - d * 0.6; taker.y = b.y; taker.dir = d > 0 ? 0 : Math.PI;
        this.doShot(taker, { pen: true });
      }
      this.setpiece = null;
    }

    /* ---------------- main step ---------------- */

    step(h) {
      if (this.phase === 'pre' || this.phase === 'halftime' || this.phase === 'fulltime') return;
      const b = this.ball;
      b.prevX = b.x; b.prevY = b.y; b.prevZ = b.z;
      this.t += h; this.elapsed += h;
      const period = this.half - 1;
      if (!this.addedAnnounced[period] && this.t >= 2700) {
        this.addedAnnounced[period] = true;
        const n = this.events.filter(e => e.half === this.half && ['goal', 'og', 'penscore', 'yellow', 'red', 'sub', 'pen'].includes(e.type)).length;
        const mins = this.half === 1 ? 1 + Math.min(3, Math.round(n * .34)) : 2 + Math.min(4, Math.round(n * .4));
        this.added[period] = mins * 60;
        this.say('stoppage', { n: mins }, { key: false });
      }
      const halfLimit = 2700 + this.added[period];
      const hasShot = b.flight && b.flight.kind === 'shot';
      if (this.t >= halfLimit && this.phase !== 'goal' && this.phase !== 'penalty' && !(hasShot && this.t < halfLimit + 5)) {
        if (hasShot) this.finishShot(b.flight, 'miss');
        this.phase = this.half === 1 ? 'halftime' : 'fulltime';
        this.say(this.half === 1 ? 'ht' : 'ft', { h: this.shortName(0), a: this.shortName(1), hs: this.teams[0].score, as: this.teams[1].score }, { key: true });
        return;
      }
      if (this.phase !== 'open') {
        this.phaseTimer -= h;
        this.movePlayers(h, true);
        if (this.phase === 'goal') {
          this.settleNet(h);
          if (this.phaseTimer <= 0) this.setupKickoff(this.concedeTeam, true);
        } else if (this.phase === 'kickoff') {
          if (this.phaseTimer <= 0) {
            const taker = this.kickoffTaker;
            if (dist(taker.x, taker.y, CX, CY) > 1.6 && this.phaseTimer > -6) { this.snapshot(); return; }
            for (const p of this.playersCache) p.kickoffHold = false;
            this.phase = 'open'; this.brainIn = 0;
            b.owner = taker; this.doPass(taker, { noOffside: true, back: true, maxDist: 26 });
          }
        } else if (this.phaseTimer <= 0) {
          const taker = this.setpiece && this.setpiece.taker;
          if (!taker || dist(taker.x, taker.y, b.x, b.y) < 2.1 || this.phaseTimer < -5) this.executeSetPiece();
        }
        this.snapshot(); return;
      }

      this.brainIn -= h;
      if (this.brainIn <= 1e-8) {
        this.brainIn += BRAIN_TICK;
        this.computeContext(); this.computeTargets();
      }
      this.movePlayers(h, false);
      this.updateBall(h);
      if (this.phase === 'open') this.interactions(h);
      if (this.phase === 'open') this.possTime[this.controlTeam] += h;
      this.momT += h;
      if (this.momT >= 12) {
        this.momT -= 12;
        let v = ((b.x - CX) / CX) * this.teams[0].attackDir;
        v += this.controlTeam === 0 ? .21 : -.21;
        this.momentum.push({ t: this.elapsed, v: clamp(v * .85, -1, 1) });
        if (this.momentum.length > 600) this.momentum.shift();
      }
      this.snapshot();
    }

    snapshot() {
      if (this.onSnapshot && ++this.snapCount % this.snapEvery === 0) this.onSnapshot(this.snapshotFrame());
    }

    snapshotFrame() {
      const ps = this.playersCache, b = this.ball;
      const arr = new Float32Array(ps.length * 2 + 4);
      for (let i = 0; i < ps.length; i++) { arr[2 * i] = ps[i].x; arr[2 * i + 1] = ps[i].y; }
      arr.set([b.x, b.y, b.z, ps.indexOf(b.owner)], ps.length * 2);
      return { t: this.t + (this.half === 2 ? 2700 : 0), elapsed: this.elapsed, half: this.half, n: ps.length, arr, ids: ps.map(p => p.id) };
    }

    computeContext() {
      const b = this.ball, ps = this.playersCache, flying = !b.owner && (b.z > .45 || b.vz > 2);
      const horizon = flying ? clamp(P.landingTime(b.z, b.vz), .2, 2.75) : .38;
      const marker = b.owner ? b : P.forecast(b, horizon);
      const intended = b.flight && b.flight.intended;
      // Lines slide together as play moves; the carrier and pressers react to the ball itself.
      this.shapeX = lerp(this.shapeX, b.x, .23);
      this.shapeY = lerp(this.shapeY, b.y, .23);
      for (const team of this.teams) {
        const d = team.attackDir, idx = team.idx;
        this.offsideLine(team);
        team.possession = this.controlTeam === idx;
        let first = null, second = null, best = Infinity, next = Infinity;
        const ownDepth = d > 0 ? b.x : L - b.x;
        const radius = [15.4, 22.8, 31.5][team.tactics.press] + (ownDepth < 37 ? 9.6 : 0);
        for (const q of ps) {
          if (q.team !== idx || q.role === 'GK' || q.stunT > .1) continue;
          const gap = dist(q.x, q.y, marker.x, marker.y);
          if (b.owner && b.owner.team !== idx && gap > radius) continue;
          const caughtBehind = b.owner && b.owner.team !== idx && (q.x - marker.x) * d > 1.8;
          const screen = b.owner && b.owner.team !== idx && ownDepth < 33 && q.role === 'DC' && gap > 5.8;
          const time = gap / this.speed(q) + (caughtBehind ? (ownDepth < 39 ? .49 : .31) : 0)
            + (screen ? .38 : 0) - (q === intended ? 1.12 : 0) - (q === this.chasers[idx] ? .085 : 0);
          if (time < best) { second = first; next = best; first = q; best = time; }
          else if (time < next) { second = q; next = time; }
        }
        if (b.owner && b.owner.team === idx) { this.chasers[idx] = b.owner; this.chasers2[idx] = null; }
        else {
          this.chasers[idx] = first;
          this.chasers2[idx] = b.owner ? ((team.tactics.press === 2 || ownDepth < 33) && next < (ownDepth < 33 ? 2.44 : 2.69) ? second : null) : (next < (flying ? 2.2 : 1.1) && (!intended || intended.team !== idx) ? second : null);
        }
      }
    }

    offsideLine(team) {
      const d = team.attackDir;
      let last = -Infinity, second = -Infinity;
      for (const q of this.playersCache) if (q.team !== team.idx) {
        const depth = q.x * d;
        if (depth > last) { second = last; last = depth; } else if (depth > second) second = depth;
      }
      team.offsideLine = Number.isFinite(second) ? second * d : (d > 0 ? L : 0);
      return team.offsideLine;
    }

    meetBall(p) {
      const b = this.ball;
      const speed = this.speed(p) * .94;
      const duration = Math.max(.75, Math.min(2.7, P.landingTime(b.z, b.vz) + .4));
      let point = b;
      for (let t = .16; t <= duration; t += .18) {
        const aim = P.forecast(b, t);
        if (aim.x < -1 || aim.x > L + 1 || aim.y < -1 || aim.y > W + 1) break;
        point = aim;
        if (point.z <= 1.75 && dist(p.x, p.y, point.x, point.y) < speed * (t + .12) + .52) break;
      }
      return point;
    }

    speed(p) {
      let v = (5.97 + p.attrs.pace * .107) * (.79 + .21 * p.cond);
      if (p.stunT > 0) v *= .46;
      if (this.ball.owner === p) v *= .69 + p.attrs.dribbling * .0045 - clamp((4.1 - (p.pressure ?? 5)) * .046, 0, .18);
      return v;
    }

    computeTargets() {
      const b = this.ball, ps = this.playersCache, marked = new Set();
      for (const p of ps) {
        p.sprint = false;
        const team = this.teams[p.team], d = team.attackDir, atk = team.possession;
        const progress = d > 0 ? b.x : L - b.x;
        const home = this.homePos(p, team), role = p.role;
        const line = team.tactics.line, ment = team.tactics.mentality;
        const cb = role === 'DC', back = cb || role === 'FB', wing = role === 'W' || role === 'WB' || role === 'FB';
        p.running = Math.max(0, p.runUntil - this.elapsed);
        if (role === 'GK') { this.gkTarget(p, team); continue; }
        if (p === b.owner) { this.dribbleTarget(p, team); continue; }
        if (!b.owner && (p === this.chasers[p.team] || p === this.chasers2[p.team])) {
          const point = this.meetBall(p);
          p.tx = clamp(point.x, -.35, L + .35); p.ty = clamp(point.y, -.35, W + .35); p.sprint = true; continue;
        }
        if (b.owner && !atk && p === this.chasers[p.team]) {
          // Press to the carrier’s inside shoulder rather than past the ball.
          const close = dist(p.x, p.y, b.owner.x, b.owner.y) < 3.7;
          const anticipate = close ? .095 : .41;
          p.tx = clamp(b.owner.x + b.owner.vx * anticipate - d * (close ? .12 : .85), .45, L - .45);
          p.ty = clamp(b.owner.y + b.owner.vy * anticipate + (b.y - b.owner.y) * .72, .45, W - .45);
          p.sprint = true; continue;
        }
        const shapeDepth = d > 0 ? this.shapeX : L - this.shapeX;
        const shift = clamp((shapeDepth - 50) * (atk ? .36 : .48), -22, 26);
        let tx = home.x + d * (shift + (atk ? 2 + (ment - 1) * 2.4 : -4) + (back || role === 'DM' ? (line - 1) * 4.1 : 0));
        let ty = CY + (home.y - CY) * (atk ? 1 : .83) + (this.shapeY - CY) * (wing ? .18 : .25);
        if (atk) {
          const flank = p.slotY < .5 ? -1 : 1;
          const pivot = progress > 28 && progress < 86;
          if (role === 'DM' || role === 'CM' || role === 'AM') {
            const offset = role === 'DM' ? -9 : role === 'AM' ? 10 : (p.slotY < .5 ? 7 : -4);
            tx = lerp(tx, b.x + d * offset, (progress < 34 ? .51 : .37));
            const anchor = clamp(b.y + flank * (role === 'DM' ? 7 : 12), 7, W - 7);
            ty = lerp(ty, anchor, .38);
          }
          if ((role === 'FB' || role === 'WB') && !cb) {
            const sameLane = Math.sign(b.y - CY) === flank;
            if (sameLane && ment >= 2 && progress > 42) {
              tx = d > 0 ? Math.max(tx, b.x + 5) : Math.min(tx, b.x - 5);
              ty = p.slotY < .5 ? 5.2 : W - 5.2;
            } else if (progress < 41 && Math.abs(b.y - p.y) < 25) {
              tx = lerp(tx, b.x + d * 5, .28);
            }
          }
          if (role === 'ST' || role === 'AM' || role === 'W' || role === 'WB') {
            if (this.elapsed >= p.runT && p.running <= 0 && pivot && b.owner && progress > 39) {
              p.runSince = this.elapsed;
              p.runUntil = this.elapsed + 2.6 + this.rnd() * 1.8;
              p.runT = p.runUntil + 4 + this.rnd() * 6.5;
              p.runType = this.rnd() < (role === 'ST' ? .72 : .58) ? 'behind' : 'short';
              p.channel = role === 'W' || role === 'WB' ? 19 : (p.slotY !== .5 ? flank : (b.y > CY ? -1 : 1)) * 8;
              if (role === 'W' || role === 'WB') p.channel *= flank;
              p.running = p.runUntil - this.elapsed;
              if (p.runType === 'behind') this.noticeRun(b.owner, p, team);
            }
            if (p.running > 0 && pivot) {
              if (p.runType === 'behind') {
                let limit = Math.max(team.offsideLine * d, b.x * d) - .58;
                if (b.flight && b.flight.intended === p) limit += 7.5;
                const preferred = Math.max(tx * d + 6, b.x * d + (role === 'ST' ? 20 : 16));
                tx = d * Math.max(b.x * d - 1, Math.min(preferred, limit));
                ty = lerp(ty, CY + p.channel, .68); p.sprint = true;
              } else { tx = lerp(tx, b.x + d * 7, .62); ty = lerp(ty, CY + (p.slotY - .5) * 33, .53); }
            }
            if (role === 'ST' && progress > 70 && p.running <= 0) {
              tx = lerp(tx, b.x + d * 11, .29); ty = lerp(ty, CY + (p.slotY - .5) * 19, .46);
            }
          }
          if (cb) tx = d > 0 ? Math.min(tx, 56) : Math.max(tx, L - 56);
        } else {
          const lineDepth = clamp(5.5 + Math.min(shapeDepth, progress + 6) * .36 + (line - 1) * 4.3, 4.9, [34, 39, 44][line]);
          const targetDepth = lineDepth + (DEFENSIVE_ROWS[role] || 0) + (shapeDepth > 70 ? 2.5 : 0);
          tx = d > 0 ? targetDepth : L - targetDepth;
          // Squeeze the central entry lanes; a switch still finds the far flank.
          if (progress < 40) {
            const narrow = back ? (progress < 23 ? .73 : .85) : (role === 'DM' || role === 'CM' ? .81 : .94);
            ty = CY + (ty - CY) * narrow;
          }
          if (cb && progress < 16) {
            const depth = Math.max(1.9, Math.min(targetDepth, progress * .46 + 2.75));
            tx = d > 0 ? depth : L - depth;
            ty = CY + (ty - CY) * .78;
          }
          if (b.owner && p === this.chasers2[p.team]) {
            tx = lerp(tx, b.x - d * 3.9, .72); ty = lerp(ty, CY + (b.y - CY) * .74, .75); p.sprint = true;
          } else if ((back || role === 'DM' || role === 'WB') && progress < 74) {
            const own = d > 0 ? tx : L - tx;
            let threat = null, best = cb ? 15 : 13.5;
            for (const q of ps) {
              if (q.team === p.team || q.role === 'GK' || q === b.owner || marked.has(q)) continue;
              const qt = d > 0 ? q.x : L - q.x;
              if (qt > Math.max(progress + 8, own + 9) || qt < own - 15) continue;
              const score = Math.abs(q.y - ty) * .93 + Math.abs(qt - own) * .46 - (q.running > 0 ? 2.3 : 0);
              if (score < best) { best = score; threat = q; }
            }
            if (threat) {
              marked.add(threat);
              tx += clamp((threat.x - d * 2.2 - tx), -7.0, 6.6) * .74;
              ty = lerp(ty, CY + (threat.y - CY) * .91, cb ? .61 : .69);
            }
          }
          if (progress < 31 && !back && role !== 'ST') tx = lerp(tx, b.x + d * (role === 'DM' ? 5.2 : 10), .16);
        }
        p.tx = clamp(tx, .55, L - .55); p.ty = clamp(ty, .65, W - .65);
        p.sprint ||= dist(p.x, p.y, p.tx, p.ty) > (atk ? 13.4 : 11.5);
      }
    }

    dribbleTarget(p, team) {
      const d = team.attackDir, depth = d > 0 ? p.x : L - p.x;
      p.pressure = this.nearestOppDist(p);
      const plan = p.ballPlan;
      if (plan && this.elapsed < plan.until && (plan.kind !== 'inside' || p.pressure > 1.3)) {
        p.tx = plan.x; p.ty = plan.y;
        p.sprint = plan.kind === 'inside' && p.pressure > 2.25 && p.cond > .5;
        return;
      }
      p.ballPlan = null;
      const wide = (p.role === 'W' || p.role === 'WB') && depth < 82;
      const centre = wide ? (p.slotY < .5 ? 7 : W - 7) : CY;
      let best = -Infinity, tx = p.x, ty = p.y;
      const wingEnd = depth > 91 && Math.abs(p.y - CY) > 9.6;
      for (const delta of [0, -4.5, 4.5, -8.3, 8.3]) {
        const target = p.x + d * (wingEnd ? (depth > 97 ? -1.8 : 1.1) : depth > 89 ? 2.6 : p.pressure < 2.6 ? 4.5 : 7.0);
        const laneEnd = wingEnd ? 6.3 : 3.3;
        const ax = clamp(target, laneEnd, L - laneEnd);
        const ay = clamp(p.y + clamp((centre - p.y) * .27, -6.2, 6.2) + delta, 1.4, W - 1.4);
        let room = 6;
        for (const q of this.playersCache) if (q.team !== p.team && (q.x - p.x) * d > -.8 && Math.abs(q.x - p.x) < 12 && Math.abs(q.y - p.y) < 14) {
          room = Math.min(room, dist(q.x, q.y, lerp(p.x, ax, .62), lerp(p.y, ay, .62)));
        }
        const s = room * .37 - Math.abs(delta) * .12 - (wide ? Math.abs(ay - centre) * .035 : Math.abs(ay - CY) * .018);
        if (s > best) { best = s; tx = ax; ty = ay; }
      }
      p.tx = tx; p.ty = ty; p.sprint = best > 1.18 && p.pressure > 2.45 && p.cond > .48;
    }

    gkTarget(p, team) {
      const b = this.ball, d = team.attackDir, own = d > 0 ? 0 : L;
      const depth = (b.x - own) * d;
      if (b.owner === p) { p.tx = own + d * 6; p.ty = clamp(p.y, CY - 7, CY + 7); return; }
      if (b.flight && b.flight.kind === 'shot' && b.flight.goalX === own) {
        const f = b.flight, reaction = .105 + (20 - p.attrs.reflexes) * .011;
        if (this.elapsed - b.releaseT < reaction) { p.tx = p.x; p.ty = p.y; return; }
        const advance = f.pen ? .72 : f.header || depth < 7 ? 1.55 : 2.25;
        p.tx = own + d * advance;
        const ahead = Math.abs((p.tx - b.x) / (Math.abs(b.vx) < .05 ? d : b.vx));
        p.ty = f.pen ? f.guessY : clamp(P.forecast(b, Math.min(.72, ahead)).y, CY - GOAL_HALF - .52, CY + GOAL_HALF + .52);
        p.sprint = true; return;
      }
      const loose = !b.owner && depth < BOX_L - .5 && Math.abs(b.y - CY) < BOX_HALF - .5;
      const expected = b.flight && b.flight.intended === p;
      const approaching = b.owner && b.owner.team !== p.team && depth < 13.5 && Math.abs(b.y - CY) < 9.7;
      if (approaching) {
        const intercept = depth < 7.5 ? .57 + depth * .315 : clamp(1.9 + depth * .37, 1.6, 6.15);
        p.tx = own + d * intercept;
        const stick = depth < 6.5 ? .88 : Math.min(.72, intercept / Math.max(2.2, depth) + .13);
        p.ty = CY + clamp((b.y - CY) * stick, -GOAL_HALF - 1.1, GOAL_HALF + 1.1);
        p.sprint = dist(p.x, p.y, b.x, b.y) < 7.6; return;
      }
      if ((loose || expected) && dist(p.x, p.y, b.x, b.y) < (expected ? 19 : 10.6)) {
        const aim = P.forecast(b, Math.min(.65, Math.max(.21, P.landingTime(b.z, b.vz))));
        p.tx = clamp(aim.x, .55, L - .55); p.ty = clamp(aim.y, 1, W - 1); p.sprint = true; return;
      }
      const offset = clamp(1.85 + depth * .047, 1.85, 5.65) + (team.possession ? 1.65 : 0);
      p.tx = own + d * offset;
      p.ty = CY + clamp((b.y - CY) * Math.min(.295, offset / Math.max(6, depth) + .085), -6.65, 6.65);
    }

    movePlayers(h, locked) {
      const players = this.playersCache;
      for (const p of players) { p.prevX = p.x; p.prevY = p.y; }
      for (const p of players) {
        p.stunT = Math.max(0, p.stunT - h); p.tackleT = Math.max(0, p.tackleT - h); p.contactT = Math.max(0, (p.contactT || 0) - h);
        const dx = p.tx - p.x, dy = p.ty - p.y, distance = Math.hypot(dx, dy);
        const sprint = (p.sprint || (locked && distance > 8)) && (locked || p.cond > .38);
        const limit = this.speed(p) * (sprint ? 1 : locked ? .76 : .685);
        const braking = Math.sqrt(2 * 6.9 * Math.max(0, distance - .075));
        const ratio = distance > .05 ? Math.min(limit, braking) / distance : 0;
        let vx = dx * ratio, vy = dy * ratio;
        for (const q of players) {
          if (q === p) continue;
          const x = p.prevX - q.prevX, y = p.prevY - q.prevY;
          if (Math.abs(x) > 1.54 || Math.abs(y) > 1.54) continue;
          const dd = Math.hypot(x, y);
          if (dd > .0001 && dd < 1.54) {
            const ux = x / dd, uy = y / dd, repel = (1.54 - dd) * 4.6;
            const approach = vx * ux + vy * uy;
            const shield = approach < 0 && q.team !== p.team && this.ball.owner === p ? -approach * clamp((1.54 - dd) / .66, 0, .95) : 0;
            vx += ux * (repel + shield); vy += uy * (repel + shield);
          }
        }
        const dvx = vx - p.vx, dvy = vy - p.vy, change = Math.hypot(dvx, dvy);
        const maxChange = h * (distance < 2.2 ? 8.9 : 5.8 + p.attrs.pace * .072);
        const k = change > maxChange ? maxChange / change : 1;
        p.vx += dvx * k; p.vy += dvy * k;
        p.x = clamp(p.x + p.vx * h, -1.35, L + 1.35); p.y = clamp(p.y + p.vy * h, -1.35, W + 1.35);
        const speed = Math.hypot(p.vx, p.vy);
        if (speed > .24) {
          const turn = Math.atan2(p.vy, p.vx) - p.dir;
          const delta = Math.atan2(Math.sin(turn), Math.cos(turn));
          p.dir += clamp(delta, -h * 6.7, h * 6.7);
        }
        const drain = speed > 5.65 ? .00017 : speed > 2.3 ? .000068 : .000012;
        p.cond = Math.max(.43, p.cond - drain * h * (1.30 - p.attrs.stamina * .029));
        p.dribPhase += h * (3.4 + speed * .88);
      }
    }

    updateBall(h) {
      const b = this.ball, before = { x: b.x, y: b.y, z: b.z };
      if (b.owner) {
        const o = b.owner, speed = Math.hypot(o.vx, o.vy), angle = o.dir;
        const stride = o.holding ? .34 : .47 + Math.min(.29, speed * .048) * (.73 + .27 * Math.sin(o.dribPhase));
        const toward = 1 - Math.exp(-h * (speed > 1.5 ? 18.5 : 15));
        b.x += (o.x + Math.cos(angle) * stride - b.x) * toward;
        b.y += (o.y + Math.sin(angle) * stride - b.y) * toward;
        b.z = Math.max(0, b.z - h * 7); b.vx = o.vx; b.vy = o.vy; b.vz = 0;
      } else P.advance(b, h);
      const exit = P.firstExit(before, b, L, W);
      if (b.flight && b.flight.kind === 'shot') {
        const f = b.flight;
        if (this.shotContact(f, before, exit || b)) return;
        if (exit && exit.axis === 'x' && exit.line === f.goalX) { this.resolveShotLine(exit.line, exit); return; }
        if (exit || this.elapsed - b.releaseT > 5.6 || (b.z === 0 && Math.hypot(b.vx, b.vy) < 1.1)) {
          this.finishShot(f, 'miss'); b.flight = null;
          this.describeMiss(f, exit && exit.z > GOAL_H ? 'over' : 'wide');
        }
      }
      if (!exit) return;
      if (exit.axis === 'y') {
        const team = b.lastTouch ? 1 - b.lastTouch.team : this.controlTeam;
        this.say('throwin', { team: this.teamName(team) }, { team });
        this.startSetPiece('throwin', team, exit.x, exit.line === 0 ? .22 : W - .22);
        return;
      }
      const defending = this.teams.find(t => (t.attackDir > 0 ? 0 : L) === exit.line);
      if (Math.abs(exit.y - CY) <= GOAL_HALF - P.RADIUS * .55 && exit.z < GOAL_H - P.RADIUS * .45) {
        b.x = exit.x; b.y = exit.y; b.z = exit.z; this.goalScored(exit.line); return;
      }
      this.goalRestart(exit.line, exit.y, defending);
    }

    goalRestart(line, y, defending) {
      const b = this.ball;
      if (b.lastTouch && b.lastTouch.team === defending.idx) {
        const team = 1 - defending.idx;
        this.say('corner', { team: this.teamName(team) }, { team });
        this.startSetPiece('corner', team, line === 0 ? .42 : L - .42, y < CY ? .42 : W - .42);
      } else {
        this.say('goalkick', { team: this.teamName(defending.idx) }, { team: defending.idx });
        this.startSetPiece('goalkick', defending.idx, line === 0 ? SIX_L - .5 : L - SIX_L + .5, CY + (y > CY ? 4 : -4));
      }
    }

    interactions(h) {
      const b = this.ball, ps = this.playersCache, age = this.elapsed - b.releaseT;
      if (!b.owner && b.z <= 2.7 && age > .105 && !(b.flight && b.flight.kind === 'shot')) {
        let choice = null, best = -Infinity;
        const speed = Math.hypot(b.vx, b.vy), flight = b.flight;
        for (const q of ps) {
          const hand = this.canGather(q, b, flight);
          const reach = hand ? 1.49 : b.z > 1.23 ? .91 : flight && flight.intended === q ? 1.14 : .97;
          if (q.contactT > 0 || q.stunT > .08 || (q === b.lastTouch && age < .51) || (!hand && b.z > (b.vz > 1.7 ? 1.25 : 2.28))) continue;
          const dx = q.x - b.x, dy = q.y - b.y;
          if (Math.abs(dx) > reach || Math.abs(dy) > reach) continue;
          const gap = Math.hypot(dx, dy);
          if (gap > reach) continue;
          const score = (1 - gap / reach) + (flight && flight.intended === q ? .23 : 0) + (hand ? .46 : .0037 * q.attrs.positioning);
          if (score > best) { choice = q; best = score; }
        }
        if (choice) {
          const q = choice, hand = this.canGather(q, b, flight);
          if (flight && flight.offsideCheck && q.offsideFlag && q.team === flight.team) { this.offside(q); return; }
          if (!hand && b.z > 1.28 && b.vz < -.55 && flight && this.aerialTouch(q, flight)) return;
          let chance = hand ? .93 : .68 + q.attrs.composure * .012 + (flight && flight.intended === q ? .085 : 0);
          if (!hand) chance -= clamp((speed - 11.2) * .027, 0, .44) + Math.max(0, b.z - .53) * .15;
          if (!hand) {
            const pressure = this.nearestOppDist(q);
            const finalThird = (q.x - CX) * this.teams[q.team].attackDir > 19;
            chance -= clamp((2.7 - pressure) * (finalThird ? .16 : .10), 0, .22);
          }
          if (speed < 2.25 && b.z < .38) chance = .998;
          q.contactT = .19 + this.rnd() * .14;
          if (this.rnd() <= clamp(chance, .2, .99)) { this.claim(q, speed, hand); return; }
          // A heavy touch is an actual deflection; it leaves the ball contestable.
          const turn = Math.atan2(b.vy, b.vx) + (this.rnd() - .48) * .92;
          const pace = Math.max(1.55, speed * (hand ? .42 : .51));
          if (flight && flight.team !== q.team) q.stats.interceptions++;
          b.vx = Math.cos(turn) * pace; b.vy = Math.sin(turn) * pace; b.vz = b.z > .34 ? -.35 : .8;
          b.ax = b.ay = 0; b.releaseT = this.elapsed; b.lastTouch = q; b.flight = null; this.lastPass = null;
          this.brainIn = 0; return;
        }
      }
      const o = b.owner;
      if (!o) {
        if (Math.hypot(b.vx, b.vy) < .4 && b.z < .05) this.watchdog += h; else this.watchdog = 0;
        if (this.watchdog > 3.5) this.brainIn = 0;
        return;
      }
      this.watchdog = 0;
      const keeper = this.gk(this.teams[1 - o.team]);
      if (keeper && keeper.contactT <= 0 && this.canHandle(keeper, b) && b.z < .55 && dist(keeper.x, keeper.y, b.x, b.y) < 1.46 && dist(keeper.x, keeper.y, o.x, o.y) > .39) {
        keeper.contactT = .75;
        if (this.rnd() < .69 + keeper.attrs.handling * .01) {
          this.claim(keeper, 0, true);
          this.emit('catch', { text: `${keeper.name} comes out to smother the ball.`, team: keeper.team });
          return;
        }
      }
      if (!o.holding) for (const q of ps) {
        if (q.team === o.team || q.role === 'GK' || q.tackleT > 0 || q.stunT > 0) continue;
        if (Math.abs(q.x - b.x) > 1.37 || Math.abs(q.y - b.y) > 1.37 || dist(q.x, q.y, b.x, b.y) > 1.45 || dist(q.x, q.y, o.x, o.y) > 1.71) continue;
        q.tackleT = 2.1 + this.rnd() * 1.41;
        const team = this.teams[q.team], inside = this.canHandle(q, b);
        const behind = Math.cos(o.dir) * (q.x - o.x) + Math.sin(o.dir) * (q.y - o.y) < -.26;
        const commit = (inside ? .455 : [.39, .46, .54][team.tactics.press]) - (behind ? .17 : 0);
        if (this.rnd() > commit) continue;
        const foul = (.007 + q.attrs.aggression * .00275 + (behind ? .030 : 0)) * (inside ? .38 : 1);
        const wins = clamp((inside ? .61 : .50) + (q.attrs.tackling - o.attrs.dribbling) * .027 - (behind ? .13 : 0), .16, .84);
        const roll = this.rnd();
        if (roll < foul) { this.foul(q, o); return; }
        if (roll < foul + wins * (1 - foul)) {
          const angle = Math.atan2(q.y - b.y, q.x - b.x) + (this.rnd() - .5) * .86;
          b.owner = null; b.lastTouch = q; b.releaseT = this.elapsed; b.flight = null;
          b.vx = Math.cos(angle) * 3.5; b.vy = Math.sin(angle) * 3.5; b.vz = .59; b.ax = b.ay = 0;
          this.lastPass = null; this.brainIn = 0;
          o.stunT = .39; q.stats.tackles++; team.stats.tackles++;
          this.adjust(q, .06); this.adjust(o, -.035); return;
        }
        q.stunT = .26;
      }
      o.decisionT -= h;
      if (o.role === 'GK') {
        if (o.decisionT <= 0) {
          const team = this.teams[o.team], pressure = this.nearestOppDist(o);
          if (pressure < 4.2 || team.tactics.passing === 2 || this.rnd() < (team.tactics.passing === 0 ? .23 : .42)) this.doLongBall(o);
          else this.doPass(o, { maxDist: 32 });
        }
      } else if (o.decisionT <= 0) this.decide(o, this.nearestOppDist(o));
    }

    canHandle(p, ball) {
      const d = this.teams[p.team].attackDir;
      return (d > 0 ? ball.x : L - ball.x) <= BOX_L && Math.abs(ball.y - CY) <= BOX_HALF;
    }

    canGather(p, ball, flight) {
      return p.role === 'GK' && this.canHandle(p, ball) && (!flight || flight.team !== p.team || flight.kind === 'shot');
    }

    aerialTouch(p, flight) {
      const b = this.ball, team = this.teams[p.team], gx = team.attackDir > 0 ? L : 0;
      const range = dist(b.x, b.y, gx, CY), same = p.team === flight.team;
      const pressure = this.nearestOppDist(p);
      if (same && range <= 13.9 && (flight.kind === 'cross' || b.z > 1.72) && Math.abs(b.y - CY) < 10.4) {
        if (this.rnd() > .36 + p.attrs.positioning * .017 - (pressure < 1.9 ? .17 : 0)) return false;
        if (b.lastTouch && b.lastTouch.team === p.team && b.lastTouch !== p) this.completePass(b.lastTouch, p);
        this.say('header', { p: p.name }, { team: p.team });
        this.doShot(p, { header: true }); return true;
      }
      if (!same && this.canHandle(p, b) && b.z > 1.45 && (pressure < 4.5 || b.z > 1.86)) {
        if (this.rnd() > .52 + p.attrs.positioning * .018) return false;
        this.say('clear', { p: p.name }, { team: p.team });
        this.doLongBall(p, false, true); return true;
      }
      return false;
    }

    nearestOppDist(p) {
      let m = 1e9;
      for (const q of this.playersCache) if (q.team !== p.team) { const d = dist(p.x, p.y, q.x, q.y); if (d < m) m = d; }
      return m;
    }

    completePass(from, to) {
      const t = this.teams[to.team];
      t.stats.passWon++; from.stats.passWon++; this.adjust(from, .012);
      this.lastPass = { player: from, receiver: to, t: this.elapsed, team: to.team };
    }

    claim(p, ballSpeed, holding = false) {
      const b = this.ball, f = b.flight, from = b.lastTouch;
      if (f && (f.kind === 'pass' || f.kind === 'cross') && from && from.team === p.team && from !== p) this.completePass(from, p);
      else if (p.team !== this.controlTeam || (f && from !== p)) {
        if (f && f.team !== p.team) { p.stats.interceptions++; this.adjust(p, .064); }
        this.lastPass = null;
      }
      this.controlTeam = p.team; this.brainIn = 0;
      for (const q of this.playersCache) q.offsideFlag = false;
      b.owner = p; b.lastTouch = p; b.flight = null; b.ax = b.ay = 0;
      const team = this.teams[p.team], depth = team.attackDir > 0 ? p.x : L - p.x;
      const bodyRoom = this.nearestOppDist(p);
      const openTime = clamp((bodyRoom - 2.35) * .16, 0, 1.06);
      const base = p.role === 'GK' ? 2.58 + this.rnd() * 1.48 : (depth > 74 ? .82 : 1.64) + this.choiceRnd() * .72 + openTime;
      p.decisionT = base * TEMPO_HOLD[team.tactics.tempo] + Math.max(0, ballSpeed - 11) * .029 + Math.max(0, b.z - .36) * .16;
      p.receivedAt = this.elapsed;
      p.ballPlan = null;
      p.quickControl = !holding && p.role !== 'GK' && f?.kind === 'pass' && f.team === p.team && f.intended === p && b.z < .61 && ballSpeed < 11.8;
      if (p.quickControl) {
        // Only a clean reception in a useful body position opens a first-time look.
        const face = AI.facing(p, team.attackDir, (CY - p.y) * .034);
        const readiness = .27 + (p.reading.vision - 12) * .038 + (team.tactics.tempo - 1) * .085 + face * .11 - (1 - p.cond) * .26;
        if ((depth > 76 || (bodyRoom > 1.6 && bodyRoom < 3.3)) && face > -.27 && this.choiceRnd() < clamp(readiness, .07, .58)) {
          p.decisionT = .17 + (1 - clamp(readiness, 0, 1)) * .16 + this.choiceRnd() * .08;
        }
      }
      p.holding = holding;
    }

    offside(p) {
      const b = this.ball;
      const team = 1 - p.team;
      this.teams[p.team].stats.offsides++;
      this.adjust(p, -0.03);
      this.say('offside', { p: p.name }, { team: p.team });
      for (const q of this.playersCache) q.offsideFlag = false;
      this.startSetPiece('freekick', team, clamp(b.x, 4, L - 4), clamp(b.y, 4, W - 4), { direct: false });
    }

    foul(p, victim) {
      const b = this.ball;
      const team = this.teams[p.team];
      team.stats.fouls++; p.stats.fouls++;
      this.adjust(p, -0.06);
      b.owner = null; b.vx = b.vy = b.vz = 0; b.flight = null;
      const foulGoalX = this.teams[p.team].attackDir > 0 ? 0 : L;
      const inBox = (this.teams[p.team].attackDir > 0 ? b.x < BOX_L : b.x > L - BOX_L) && Math.abs(b.y - CY) < BOX_HALF;
      // card logic
      const lastMan = dist(victim.x, victim.y, foulGoalX, CY) < 25 && this.isLastDefender(p, victim);
      let card = null;
      const roll = this.rnd();
      if (inBox && lastMan && roll < .065) card = 'red';
      else if (roll < .0035 || (lastMan && roll < .022)) card = 'red';
      else if (roll < .135 || p.yellow >= 1 && roll < .23) card = 'yellow';
      if (card === 'yellow') {
        p.yellow++; team.stats.yellow++; this.adjust(p, -0.2);
        this.say('yellow', { p: p.name }, { team: p.team, player: p, key: true });
        if (p.yellow >= 2) { this.sendOff(p, 'second yellow'); }
      } else if (card === 'red') {
        this.sendOff(p, 'serious foul');
      }
      if (inBox && !p.red) {
        this.say('pen', { p: p.name, v: victim.name }, { team: victim.team, key: true });
        this.startSetPiece('penalty', victim.team, 0, 0, { taker: this.bestShooter(this.teams[victim.team]) });
      } else if (inBox && p.red) {
        // sent off but penalty still stands
        this.say('pen', { p: p.name, v: victim.name }, { team: victim.team, key: true });
        this.startSetPiece('penalty', victim.team, 0, 0, { taker: this.bestShooter(this.teams[victim.team]) });
      } else {
        this.say('foul', { p: p.name, v: victim.name, opp: this.teamName(victim.team) }, { team: p.team });
        const nearGoal = dist(b.x, b.y, foulGoalX, CY) < 26 && Math.abs(b.y - CY) < 16;
        this.startSetPiece('freekick', victim.team, clamp(b.x, 3, L - 3), clamp(b.y, 3, W - 3), { direct: nearGoal });
      }
    }

    isLastDefender(p, victim) {
      const team = this.teams[p.team];
      const d = team.attackDir;
      const ownGoalX = d > 0 ? 0 : L;
      const px = (p.x - ownGoalX) * d;
      for (const s of team.slots) {
        const q = s.player;
        if (q === p || !q.onPitch || q.pos === 'GK') continue;
        if ((q.x - ownGoalX) * d < px - 0.5) return false;
      }
      return true;
    }

    /* ---------------- decisions ---------------- */

    noticeRun(p, runner, team) {
      if (!p || p === runner || p.team !== runner.team || p.role === 'GK' || p.decisionT < .48 || this.elapsed - p.receivedAt < .36) return;
      const dx = runner.x - p.x, dy = runner.y - p.y, gain = dx * team.attackDir;
      if (gain < 5 || gain > 34 || Math.abs(dy) > 22 || runner.x * team.attackDir > Math.max(team.offsideLine * team.attackDir, CX * team.attackDir) + .25) return;
      const look = AI.facing(p, dx, dy), squeeze = clamp((3.9 - this.nearestOppDist(p)) / 2.8, 0, 1);
      if (look < -.30 || this.nearestOppDist(runner) < 2.6) return;
      const delay = AI.readDelay(p, look, squeeze) * TEMPO_HOLD[team.tactics.tempo];
      p.decisionT = Math.min(p.decisionT, delay + .21);
    }

    readPlay(p, pressure) {
      const team = this.teams[p.team], b = this.ball, d = team.attackDir;
      let room = pressure;
      for (const q of this.playersCache) {
        if (q.team === p.team || Math.abs(q.x - p.x) > 7.2 || Math.abs(q.y - p.y) > 7.2) continue;
        room = Math.min(room, dist(p.x + p.vx * .28, p.y + p.vy * .28, q.x + q.vx * .28, q.y + q.vy * .28));
      }
      const need = AI.gameNeed(team.score - this.teams[1 - p.team].score, this.minute());
      return {
        rush: clamp((3.8 - room) / 2.6, 0, 1), pressure, need,
        intent: (team.tactics.mentality - 2) * .032 + need * .09 + p.reading.risk * .48,
        first: p.quickControl && this.elapsed - p.receivedAt < .43 && b.z < .55,
        depth: (b.x - CX) * d + CX,
        face: AI.facing(p, d, (CY - b.y) * .03)
      };
    }

    decisionOptions(p, read) {
      const team = this.teams[p.team], d = team.attackDir, gx = d > 0 ? L : 0, b = this.ball;
      const { depth, pressure, rush, need, intent, first, face } = read;
      const dd = dist(b.x, b.y, gx, CY), space = this.spaceAhead(p);
      const opts = [];
      let shot = -Infinity;
      const xg = dd < 28 ? this.estimateXG(b.x, b.y, gx, pressure) : 0;
      if (dd < 26 && xg > .068) {
        const lane = this.laneRisk(b.x, b.y, gx, CY, p.team, 1.5);
        shot = .038 + xg * (1.70 + p.attrs.shooting * .027) + (p.role === 'ST' ? .064 : 0)
          - lane * .43 - clamp((2.05 - pressure) * .10, 0, .14) + intent + p.reading.finish * .47;
        // The usable shooting window shrinks if the defender is already
        // leaning in. A clean early strike can beat that closing window.
        const set = clamp((face + .22) / 1.22, 0, 1);
        shot -= (1 - face) * (first ? .145 : .093) + (1 - p.cond) * .061;
        shot -= rush * (first ? .057 : .141) * (1.17 - set * .42);
        if (pressure < 1.12 && dd > 14) shot -= .19;
        if (first && face > .37 && xg > .17 && lane < .39) shot += .142 + rush * .048;
        if (shot > .27) opts.push({ kind: 'shot', score: shot, first });
      }
      let safeOutlet = 0;
      for (const pass of this.passOptions(p, {}, read)) {
        const easy = pass.technique === 'ground' && pass.dist <= 18 && pass.risk < .28;
        const recycle = pass.gain < 3.2 && pass.technique === 'ground';
        const ambitious = pass.through || pass.gain > 13;
        let score = pass.score + rush * (easy ? .135 : .02) + (ambitious ? intent : -need * .055);
        if (first) score += easy || pass.technique === 'cutback' ? .044 : -.066;
        if (recycle && pass.opening > 5.4 && depth > 63 && shot < .65) score += .032;
        if (pass.gain > 3 && depth > 72 && pass.opening > 4 && pass.risk < .29) score += .044;
        if (score >= .38 && pass.risk < 1.03) {
          if (easy) safeOutlet = Math.max(safeOutlet, score);
          const purpose = recycle ? 'recycle' : pass.through ? 'through' : pass.technique === 'cutback' ? 'cutback' : 'progress';
          opts.push({ kind: 'pass', score, pass, first, purpose });
        }
      }
      const carry = .574 + p.attrs.dribbling * .013 + clamp(space, 0, 13) * .022
        - clamp((2.86 - pressure) * .229, 0, .38) - (depth > 89 ? .115 : 0) - (p.role === 'DC' ? .138 : 0)
        + p.reading.carry * .72 + intent * .50 - rush * .044;
      opts.push({ kind: 'carry', score: carry, space });
      const yOffset = CY - b.y;
      if (depth > 62 && depth < 96 && Math.abs(yOffset) > 9 && pressure > 1.42 && p.attrs.dribbling >= 9) {
        const x = clamp(p.x + d * (depth > 86 ? 2.0 : 3.6), 2.5, L - 2.5);
        const y = clamp(p.y + clamp(yOffset, -6.4, 6.4), 3, W - 3);
        const lane = this.laneRisk(b.x, b.y, x, y, p.team, 1.82);
        let room = 8;
        for (const q of this.playersCache) if (q.team !== p.team && Math.abs(q.x - x) < 8 && Math.abs(q.y - y) < 8) room = Math.min(room, dist(q.x + q.vx * .26, q.y + q.vy * .26, x, y));
        if (lane < .53 && room > 2.0) {
          const score = carry - .103 + (room - 3.4) * .036 - lane * .28 + (p.role === 'W' || p.role === 'AM' ? .048 : 0);
          opts.push({ kind: 'carry', style: 'inside', score, x, y });
        }
      }
      if (first && shot > .36 && face < .70 && pressure > 2.15) {
        const control = .073 + Math.max(0, .55 - face) * .064 - rush * .077;
        opts.push({ kind: 'carry', style: 'settle', score: Math.max(carry, shot) + control });
      }
      if (depth > 78.6 && Math.abs(b.y - CY) > 14) {
        const delivery = this.crossOption(p);
        if (delivery && delivery.merit > .13) {
          const score = .442 + delivery.merit * .88 + rush * .032 + intent * .52 + (team.tactics.width - 1) * .028 - (1 - face) * .036;
          opts.push({ kind: 'cross', score, delivery });
        }
      }
      // A short, open outlet usually beats a hopeful clearance. Near the
      // goal under severe pressure it can still be safer to get rid of it.
      if (depth < 20 && (pressure < 2.35 || rush > .86)) {
        const score = .68 + (2.68 - pressure) * .155 + rush * .073 - need * .047 - clamp((safeOutlet - .58) * .42, 0, .20);
        opts.push({ kind: 'clear', score });
      }
      return opts;
    }

    decide(p, pressure) {
      const team = this.teams[p.team], b = this.ball, read = this.readPlay(p, pressure);
      const margin = clamp(.175 + read.rush * .067 + (13 - p.attrs.composure) * .006, .125, .28);
      const action = AI.pick(this.decisionOptions(p, read), this.choiceRnd, margin);
      // Choice RNG is separate from the ball, contact and finishing RNG.
      p.decisionT = (1.62 + this.choiceRnd() * .77) * TEMPO_HOLD[team.tactics.tempo];
      p.ballPlan = null;
      if (action.kind === 'shot') this.doShot(p, { firstTime: action.first });
      else if (action.kind === 'pass') this.doPassTo(p, action.pass, { firstTime: action.first, purpose: action.purpose });
      else if (action.kind === 'cross') this.doCross(p, false, action.delivery);
      else if (action.kind === 'clear') this.doLongBall(p, false, true);
      else if (action.style === 'inside') {
        p.ballPlan = { kind: 'inside', x: action.x, y: action.y, until: this.elapsed + .89 };
        p.decisionT = (.86 + this.choiceRnd() * .33) * TEMPO_HOLD[team.tactics.tempo];
        this.brainIn = 0;
      } else if (action.style === 'settle') {
        // Let a closed body open up or a teammate become available. The ball
        // remains live: a nearby defender can still take it before the next look.
        const wiggle = clamp(CY - p.y, -2.0, 2.0);
        p.ballPlan = { kind: 'settle', x: clamp(p.x + team.attackDir * 1.15, 1.5, L - 1.5), y: p.y + wiggle, until: this.elapsed + .46 };
        p.decisionT = .43 + this.choiceRnd() * .29;
        this.brainIn = 0;
      } else if (action.space > 10 && read.depth < 83 && this.choiceRnd() < .16) {
        // A sprint touch stays in the dribbler's lane, not a recorded pass.
        const s = this.speed(p), aimX = clamp(p.x + Math.cos(p.dir) * 3.3, 1, L - 1), aimY = clamp(p.y + Math.sin(p.dir) * 3.3, 1, W - 1);
        this.kick(p, aimX, aimY, { kind: 'carry', technique: 'touch', intended: p }, { arrival: s * .75 });
      }
    }

    estimateXG(x, y, gx, pressure = 4) {
      const depth = Math.max(.4, Math.abs(gx - x));
      const opening = Math.abs(Math.atan2(CY + GOAL_HALF - y, depth) - Math.atan2(CY - GOAL_HALF - y, depth));
      const dd = dist(x, y, gx, CY);
      const angle = clamp(opening / .58, .16, 1.23);
      const space = clamp(.73 + pressure * .062, .75, 1.04);
      return clamp(.68 * Math.exp(-dd / 13.6) * angle * space, .012, .77);
    }

    spaceAhead(p) {
      const d = this.teams[p.team].attackDir;
      let m = 14;
      for (const q of this.playersCache) {
        if (q.team === p.team) continue;
        const ahead = (q.x - p.x) * d;
        if (ahead > 0 && ahead < m && Math.abs(q.y - p.y) < 4) m = ahead;
      }
      return m;
    }

    laneRisk(x0, y0, x1, y1, teamIdx, base = 1.62, loft = false) {
      let risk = 0;
      const dx = x1 - x0, dy = y1 - y0, len2 = dx * dx + dy * dy || 1;
      for (const q of this.playersCache) {
        if (q.team === teamIdx || q.role === 'GK') continue;
        const t = ((q.x - x0) * dx + (q.y - y0) * dy) / len2;
        if (t < .036 || t > .96) continue;
        const lead = clamp(t * .43 + .035, .04, .48);
        const gap = dist(q.x + q.vx * lead, q.y + q.vy * lead, x0 + dx * t, y0 + dy * t);
        const pad = base + t * .44;
        if (gap < pad) risk += (1 - gap / pad) * (.72 + q.attrs.positioning * .014) * (loft && t > .19 && t < .78 ? .20 : 1);
      }
      return Math.min(risk, 2.4);
    }

    passOptions(p, opts = {}, read = null) {
      const team = this.teams[p.team], style = team.tactics.passing, d = team.attackDir, b = this.ball;
      const max = Math.min(opts.maxDist || 65, [33, 46, 62][style]);
      const depth = (b.x - CX) * d + CX, line = this.offsideLine(team) * d;
      const candidates = [];
      for (const q of this.playersCache) {
        if (q.team !== p.team || q === p || q.stunT > .20) continue;
        const dd = dist(b.x, b.y, q.x, q.y), gain = (q.x - b.x) * d;
        if (dd < (opts.back ? 2.4 : 4.3) || dd > max || (opts.back && gain > -1.05)) continue;
        if (q.role === 'GK' && depth > CX - 12) continue;
        if (!opts.noOffside && q.x * d > Math.max(line, b.x * d, CX * d) + .24) continue;
        const opening = this.nearestOppDist(q);
        const look = read ? AI.facing(p, q.x - b.x, q.y - b.y) : 1;
        const run = q.running > 0 && q.runType === 'behind' && gain > 4.4 && opening > 2.25 && dd > 10 && dd < 38 && p.attrs.passing >= 11;
        const seesRun = run && (!read || (look > -.49 && q.vx * d > .8 && this.elapsed - q.runSince >= AI.readDelay(p, look, read.rush)));
        const cutback = depth > CX + 30 && Math.abs(b.y - CY) > 14 && gain < -.6 && gain > -18 && Math.abs(q.y - CY) < 13.3 && dd < 25 && opening > 2.4;
        const shapes = read ? (seesRun && !cutback ? [false, true] : [false]) : [seesRun];
        for (const through of shapes) {
          const receiving = clamp(dd * .042, .26, 1.1);
          const lead = read && seesRun && !through ? receiving * .70 : receiving;
          const ax = clamp(q.x + q.vx * lead + (through ? d * Math.min(3.8, (opening - 1.5) * .73) : 0), 1.35, L - 1.35);
          const ay = clamp(q.y + q.vy * lead * .84, 1.45, W - 1.45);
          let risk = this.laneRisk(b.x, b.y, ax, ay, p.team, 1.8 + Math.min(.49, dd * .016));
          const swing = Math.abs(q.y - b.y) > 25 && dd > 31 && opening > 8.9 && (style > 0 || risk > .22);
          let technique = opts.technique || (through ? 'through' : cutback ? 'cutback' : 'ground');
          if (!opts.technique && (!through || !read) && !cutback && (swing || (dd > 31 && style > 0 && gain > 13)) && opening > 3.2) technique = swing ? 'switch' : 'long';
          else if (!opts.technique && (!through || !read) && !cutback && risk > .46 && dd > 12 && dd < 27 && p.attrs.passing > 11 && opening > 3.3) technique = 'chip';
          const air = !['ground', 'through', 'cutback'].includes(technique);
          if (air) risk = this.laneRisk(b.x, b.y, ax, ay, p.team, 1.66, true);
          const entry = gain > 3.4 && depth + gain > 76 && Math.abs(q.y - CY) < 14.7;
          let score = .426 + clamp(gain / 34, -.40, .86) * [.32, .395, .475][style] + clamp(opening / 8.8, 0, 1) * .43;
          score -= risk * .71 + Math.max(0, (entry ? 4.95 : 3.95) - opening) * (entry ? .083 : .064)
            + Math.max(0, dd - 22) * (style === 0 ? .014 : .0072);
          if (through) score += opening > 5.1 ? .136 : .065;
          if (depth > 64 && gain < 4 && opening > 6.5) score += .055;
          if (cutback) score += .24;
          if (swing) score += .096;
          if (q.role === 'GK') score -= .27;
          if (air && !opts.technique) score -= (opening < 5 ? .155 : technique === 'long' || technique === 'switch' ? .101 : .034);
          if (q === this.lastPass?.player && this.elapsed - this.lastPass.t < 5.4 && gain < 4) score -= .24;
          if (opts.back) score += Math.min(.19, 1 / (dd + 1) * 1.9);
          if (read) {
            const ambitious = through || dd > 22;
            const back = Math.max(0, -look);
            score -= (1 - look) * (through ? .071 : .015) + (ambitious ? back * .045 + read.rush * .082 : 0);
            if (swing) score += clamp((p.reading.vision - 9) * .009 * (1 - read.rush), 0, .08);
            if (through) score += (p.reading.vision - 12) * .012 + (style - 1) * .046 - Math.max(0, risk - .28) * .14;
          } else score += (this.rnd() - .5) * (.136 - p.attrs.passing * .0032);
          candidates.push({ target: q, lead: { x: ax, y: ay }, score, through, technique, dist: dd, risk, opening, gain });
        }
      }
      return candidates;
    }

    bestPassOption(p, opts = {}) {
      let best = null;
      for (const pass of this.passOptions(p, opts)) if (!best || pass.score > best.score) best = pass;
      return best;
    }

    doPass(p, opts = {}) {
      const choice = this.bestPassOption(p, opts);
      if (choice && (choice.score > .10 || opts.back || opts.technique)) this.doPassTo(p, choice, opts);
      else this.doLongBall(p, !!opts.noOffside);
    }

    setOffside(p, enabled) {
      const team = this.teams[p.team], sign = team.attackDir, line = this.offsideLine(team) * sign, b = this.ball;
      for (const q of this.playersCache) if (q.team === p.team) {
        q.offsideFlag = !!enabled && q !== p && q.x * sign > Math.max(line, b.x * sign, CX * sign) + .33;
      }
    }

    kick(p, tx, ty, f, k) {
      const b = this.ball;
      if (dist(b.x, b.y, p.x, p.y) > 2.14) {
        const direction = Math.atan2(ty - p.y, tx - p.x);
        b.x = p.x + Math.cos(direction) * .44; b.y = p.y + Math.sin(direction) * .44;
      }
      f.team = p.team; f.from = p; f.targetX = tx; f.targetY = ty;
      b.owner = null; b.lastTouch = p; b.releaseT = this.elapsed; b.flight = f;
      p.holding = false;
      p.ballPlan = null;
      f.totalDist = dist(b.x, b.y, tx, ty);
      if (k.seconds) {
        b.z = k.startZ != null ? k.startZ : Math.max(.075, b.z);
        f.travelTime = P.aerial(b, tx, ty, k.seconds, k.height || 0, k.bend || 0);
      } else f.travelTime = P.ground(b, tx, ty, k.arrival);
      this.brainIn = 0;
      p.decisionT = .44;
      return f;
    }

    deliveryReleased(p, f) {
      const t = this.teams[p.team];
      t.stats.passes++; p.stats.passes++;
      this.setOffside(p, f.offsideCheck);
      if (f.technique === 'through') this.adjust(p, .028);
    }

    doPassTo(p, option, opts = {}) {
      const team = this.teams[p.team], b = this.ball, pressure = this.nearestOppDist(p);
      const technique = opts.technique || option.technique || (option.through ? 'through' : 'ground');
      const air = !['ground', 'through', 'cutback'].includes(technique);
      const dd = dist(b.x, b.y, option.lead.x, option.lead.y);
      const variance = (.24 + dd * .024) * (1.54 - p.attrs.passing * .054) * (pressure < 2.25 ? 1.37 : 1) * (air ? 1.16 : 1);
      const tx = clamp(option.lead.x + (this.rnd() * 2 - 1) * variance, .72, L - .72);
      const ty = clamp(option.lead.y + (this.rnd() * 2 - 1) * variance, .72, W - .72);
      const k = air ? {
        seconds: technique === 'throw' ? clamp(.83 + dd * .034, 1.03, 1.71) : technique === 'chip' ? clamp(.72 + dd * .032, 1.02, 1.82) : clamp(.58 + dd * .042, 1.57, 3.12),
        startZ: technique === 'throw' ? 1.70 : .084,
        bend: technique === 'throw' ? 0 : (this.rnd() - .5) * .68
      } : { arrival: clamp(4.42 + dd * .111 + team.tactics.tempo * .58 + (technique === 'through' ? .84 : 0), 4.8, 10.75) };
      const f = this.kick(p, tx, ty, { kind: 'pass', intended: option.target, technique, through: !!option.through, firstTime: !!opts.firstTime, purpose: opts.purpose, offsideCheck: !opts.noOffside }, k);
      this.deliveryReleased(p, f);
    }

    doLongBall(p, noOffside = false, clearance = false) {
      const b = this.ball, team = this.teams[p.team], d = team.attackDir, line = this.offsideLine(team) * d;
      let target = null, best = -Infinity;
      for (const q of this.playersCache) {
        const gain = (q.x - b.x) * d, dd = dist(b.x, b.y, q.x, q.y);
        if (q.team !== p.team || q.role === 'GK' || q === p || gain < 18 || dd > 70 || (!noOffside && q.x * d > Math.max(line, b.x * d, CX * d) + .25)) continue;
        const score = (q.role === 'ST' ? 3 : ['W', 'AM'].includes(q.role) ? 2 : 0) + clamp(this.nearestOppDist(q), 0, 11) - Math.abs(gain - 39) * .13 + this.rnd() * 1.5;
        if (score > best) { best = score; target = q; }
      }
      const scatter = clearance ? 6.8 : 2.9 + (20 - p.attrs.passing) * .142;
      const tx = clamp((target ? target.x + target.vx * .69 + d * 2.3 : b.x + d * (32 + this.rnd() * 15)) + (this.rnd() - .5) * scatter, 3.1, L - 3.1);
      const ty = clamp((target ? target.y + target.vy * .8 : lerp(b.y, CY, .57) + (this.rnd() - .5) * 29) + (this.rnd() - .5) * scatter, 3.1, W - 3.1);
      const dd = dist(b.x, b.y, tx, ty), seconds = clamp(.65 + dd * .042, 1.56, 3.22);
      const f = this.kick(p, tx, ty, { kind: 'pass', intended: target, technique: clearance ? 'clearance' : 'long', offsideCheck: !noOffside }, {
        seconds, startZ: b.z > 1.2 && clearance ? b.z : .095, bend: (this.rnd() - .5) * .78
      });
      this.deliveryReleased(p, f);
    }

    crossOption(p, exempt = false) {
      const b = this.ball, team = this.teams[p.team], d = team.attackDir, gx = d > 0 ? L : 0;
      const line = Math.max(this.offsideLine(team) * d, b.x * d, CX * d);
      let best = null;
      for (const q of this.playersCache) {
        const goal = (gx - q.x) * d;
        if (q.team !== p.team || q === p || q.role === 'GK' || (!exempt && q.x * d > line + .24) || goal < 1.4 || goal > 26 || Math.abs(q.y - CY) > 15.2 || Math.abs(q.y - b.y) < 8.5) continue;
        const width = this.nearestOppDist(q), head = q.role === 'ST' ? .084 : 0;
        if (!exempt && (q.stunT > .20 || width < 2.32 || goal > 20.0)) continue;
        const merit = .015 + clamp((width - 1.75) / 7.6, 0, .8) * .20 + head + (goal < 13.8 ? .086 : 0);
        if (!best || merit > best.merit) best = { target: q, merit };
      }
      return best;
    }

    doCross(p, corner = false, delivery = null) {
      const b = this.ball, team = this.teams[p.team], d = team.attackDir, gx = d > 0 ? L : 0;
      const info = delivery || this.crossOption(p, corner), q = info && info.target;
      const tx = q ? clamp(q.x + q.vx * .57 + d * 1.4, Math.min(gx - d * 3, gx - d * 19.5), Math.max(gx - d * 3, gx - d * 19.5)) : gx - d * (7 + this.rnd() * 7);
      const ty = clamp(q ? q.y + q.vy * .60 + (this.rnd() - .5) * 1.7 : CY + (this.rnd() - .5) * 11, CY - 14, CY + 14);
      const distance = dist(b.x, b.y, tx, ty);
      const bent = (b.y < CY ? 1 : -1) * d * (.92 + this.rnd() * .85);
      const f = this.kick(p, tx, ty, { kind: 'cross', technique: 'cross', intended: q, offsideCheck: !corner }, { seconds: clamp(.77 + distance * .042, 1.23, 2.77), startZ: .11, bend: bent });
      this.deliveryReleased(p, f);
      if (!corner) this.say('cross', { p: p.name }, { team: p.team });
    }

    doShot(p, opts = {}) {
      const b = this.ball, team = this.teams[p.team], d = team.attackDir, gx = d > 0 ? L : 0;
      const goalLine = gx + d * (P.RADIUS + .014);
      const dd = dist(b.x, b.y, gx, CY), pressure = this.nearestOppDist(p), keeper = this.gk(this.teams[1 - p.team]);
      const minute = this.minute();
      const nearLine = this.laneRisk(b.x, b.y, gx, CY, p.team, 1.45);
      const coverage = keeper && (keeper.x - b.x) * d > 0 ? .82 : 1.04;
      let xg = opts.pen ? .78 : clamp(this.estimateXG(b.x, b.y, gx, pressure) * coverage * clamp(1 - nearLine * .25, .45, 1), .014, .79);
      if (opts.header) xg = Math.max(.018, xg * .68);
      if (opts.fk) xg = Math.max(.018, xg * .64);
      const keeperGap = Math.abs(keeper.x - gx);
      const lob = !opts.pen && !opts.fk && !opts.header && dd > 10 && dd < 28 && keeperGap > 4.4 && pressure > 2.3 && p.attrs.shooting >= 13 && this.rnd() < .27;
      let on = .242 + p.attrs.shooting * .014 + xg * .62 - Math.max(0, dd - 14) * .0085 - (pressure < 2.05 ? .123 : 0) - (opts.header ? .095 : 0) - (opts.fk ? .085 : 0);
      if (opts.pen) on = .87 + (p.attrs.composure - 14) * .009;
      const onFrame = this.rnd() < clamp(on, .105, .94);
      let side = this.rnd() < .5 ? -1 : 1;
      if (!opts.pen && Math.abs(keeper.y - CY) > 1.2 && this.rnd() < .64) side = keeper.y > CY ? -1 : 1;
      let y, z;
      if (onFrame) {
        const placement = clamp(.23 + .53 * this.rnd() + p.attrs.composure * .006 + (opts.pen ? .079 : 0), .3, .92);
        y = CY + side * (GOAL_HALF - .17) * placement;
        z = lob ? .52 + this.rnd() * 1.08 : this.rnd() < .63 ? .16 + this.rnd() * .62 : 1.03 + this.rnd() * 1.02;
      } else {
        const near = this.rnd();
        if (near < .084) { y = CY + side * (GOAL_HALF - .012); z = .45 + this.rnd() * 1.33; }
        else if (near < .42) { y = CY + side * (1 + this.rnd() * 2.37); z = GOAL_H + .27 + this.rnd() * 1.78; }
        else { y = CY + side * (GOAL_HALF + .32 + this.rnd() * 3.67); z = .18 + this.rnd() * 1.4; }
      }
      const power = opts.pen ? 27.1 : opts.header ? 16 + this.rnd() * 2.5 : 18.5 + p.attrs.shooting * .43 + this.rnd() * 3.4;
      const distLine = dist(b.x, b.y, goalLine, y);
      const flightTime = lob ? clamp(1.24 + dd * .018, 1.48, 1.83) : Math.max(.11, P.airTime(distLine, power));
      const pass = this.lastPass;
      const assist = !opts.pen && pass && pass.team === p.team && pass.receiver === p && pass.player !== p && this.elapsed - pass.t < 8.4 ? pass.player : null;
      const shot = { x: b.x, y: b.y, team: p.team, xg, outcome: 'pending', minute, half: this.half, direction: d, pen: !!opts.pen };
      this.shotMap.push(shot); team.stats.shots++; team.stats.xG += xg; p.stats.shots++;
      if (assist) assist.stats.keyPasses++;
      const f = this.kick(p, goalLine, y, {
        id: ++this.shotId, kind: 'shot', technique: lob ? 'lob' : opts.header ? 'header' : 'shot', shooter: p, firstTime: !!opts.firstTime,
        xG: xg, goalX: gx, targetZ: z, onFrame, assist, shot, pen: !!opts.pen, header: !!opts.header, fk: !!opts.fk,
        guessY: CY + (this.rnd() < .5 ? -1 : 1) * (1.9 + this.rnd() * .68)
      }, flightTime < .49 && z < .38 && !opts.header && !lob ? { arrival: power * .91 } : {
        seconds: flightTime, height: z, bend: opts.fk ? (this.rnd() - .5) * 3.6 : opts.header || lob ? 0 : (this.rnd() - .5) * 1.34,
        startZ: opts.header ? Math.max(1.28, b.z) : .093
      });
      this.adjust(p, .02); this.setOffside(p, !opts.pen);
      if (lob) this.emit('chance', { text: `${p.name} tries to lift it over the keeper…`, team: p.team, key: xg > .20 });
      else if (dd > 24.5 && !opts.pen) this.say('longshot', { p: p.name }, { team: p.team });
      return f;
    }

    finishShot(f, outcome) {
      if (!f || f.kind !== 'shot' || f.shot.outcome !== 'pending') return;
      f.shot.outcome = outcome;
      if (outcome === 'goal' || outcome === 'save') { this.teams[f.shooter.team].stats.onTarget++; f.shooter.stats.onTarget++; }
    }

    shotContact(f, before, until) {
      const b = this.ball, age = this.elapsed - b.releaseT;
      if (age < .062) return false;
      const dx = until.x - before.x, dy = until.y - before.y, den = dx * dx + dy * dy || .00001;
      const dxGoal = Math.abs(until.x - f.goalX);
      for (const q of this.playersCache) {
        if (q.team === f.shooter.team || q.shotTried === f.id || q.stunT > .15) continue;
        const hand = q.role === 'GK' && this.canHandle(q, until);
        if (f.pen && !hand) continue;
        if (hand && age < .137 + (20 - q.attrs.reflexes) * .009) continue;
        const reach = hand ? (f.pen ? 1.98 : 2.02 + q.attrs.reflexes * .054) : .94;
        if (Math.abs(q.x - until.x) > reach + 1 || Math.abs(q.y - until.y) > reach + 1) continue;
        const fraction = clamp(((q.x - before.x) * dx + (q.y - before.y) * dy) / den, 0, 1);
        const x = before.x + dx * fraction, y = before.y + dy * fraction, z = lerp(before.z, until.z, fraction);
        const gap = dist(q.x, q.y, x, y);
        if (gap > reach || z > (hand ? (2.10 + q.attrs.reflexes * .033) - gap * .18 : 1.50 - gap * .28)) continue;
        q.shotTried = f.id;
        const speed = Math.hypot(b.vx, b.vy);
        const room = 1 - gap / reach;
        const chance = hand ? (f.pen ? .26 + room * .14 + (q.attrs.reflexes - 14) * .012 : .76 + room * .22 + (q.attrs.reflexes + q.attrs.handling - 28) * .014 - f.xG * .45 - Math.max(0, speed - 25) * .009) : .37 + q.attrs.positioning * .016 + room * .23;
        if (this.rnd() >= clamp(chance, .11, hand ? .94 : .88)) continue;
        b.x = x; b.y = y; b.z = z; b.flight = null; b.ax = b.ay = 0;
        b.lastTouch = q; b.releaseT = this.elapsed; this.lastPass = null; this.brainIn = 0;
        if (hand) {
          const shotOnTarget = f.onFrame;
          this.finishShot(f, shotOnTarget ? 'save' : 'miss');
          if (shotOnTarget) { q.stats.saves++; this.teams[q.team].stats.saves++; this.adjust(q, .17 + f.xG * .38); }
          const catches = this.rnd() < clamp(.22 + room * .51 + q.attrs.handling * .012 - speed * .010, .17, .82);
          if (f.pen) this.say('penmiss', { k: q.name, p: f.shooter.name }, { team: q.team, key: true });
          else if (!shotOnTarget) this.emit('catch', { text: `${q.name} gets a hand to it.`, team: q.team });
          else this.say(catches ? 'catch' : 'save', { p: f.shooter.name, k: q.name }, { team: q.team, key: f.xG > .17 });
          if (catches) { b.vx = b.vy = b.vz = 0; this.claim(q, 0, true); }
          else {
            const d = this.teams[q.team].attackDir, flank = y > q.y ? 1 : -1;
            const behind = dxGoal < 5.7 && Math.abs(y - CY) > 3.0 && room < .48 && this.rnd() < .62;
            b.vx = d * (behind ? -4.2 - this.rnd() * 3.7 : 4.8 + this.rnd() * 5.5);
            b.vy = (behind ? (y < CY ? -1 : 1) : flank) * (4.3 + this.rnd() * 5.7);
            b.vz = 1.35 + this.rnd() * 2.8;
          }
        } else {
          this.finishShot(f, 'block'); this.adjust(q, .13);
          const wanted = Math.atan2(dy, dx) + (this.rnd() < .5 ? -1 : 1) * (1.12 + this.rnd() * 1.05);
          b.vx = Math.cos(wanted) * speed * .37; b.vy = Math.sin(wanted) * speed * .37; b.vz = 1.9 + this.rnd() * 2.1;
          this.say('block', { p: f.shooter.name, d: q.name }, { team: q.team, key: f.xG > .17 });
        }
        return true;
      }
      return false;
    }

    describeMiss(f, how) {
      this.adjust(f.shooter, -.044);
      const text = f.pen ? `${f.shooter.name} puts the penalty ${how}!` : how === 'over' ? `${f.shooter.name} sends it over the bar.` : `${f.shooter.name} sends the shot wide.`;
      this.emit(f.pen ? 'penmiss' : 'miss', { text, team: f.shooter.team, key: f.pen || f.xG > .19 });
    }

    resolveShotLine(lineX, at = this.ball) {
      const b = this.ball, f = b.flight;
      if (!f || f.kind !== 'shot') { this.goalScored(lineX); return; }
      const offset = Math.abs(at.y - CY);
      const post = Math.abs(offset - GOAL_HALF) <= .157 && at.z <= GOAL_H + .065;
      const bar = offset < GOAL_HALF + .075 && Math.abs(at.z - GOAL_H) <= .124;
      b.x = at.x; b.y = at.y; b.z = at.z;
      if (!post && !bar && offset < GOAL_HALF - .062 && at.z < GOAL_H - .056) { this.goalScored(lineX, f); return; }
      b.flight = null;
      if (post || bar) {
        this.finishShot(f, 'post');
        const d = lineX === 0 ? 1 : -1;
        b.x = lineX + d * .086;
        b.vx = d * Math.max(3.15, Math.abs(b.vx) * (post ? .45 : .29));
        b.vy = post ? (b.y > CY ? -1 : 1) * (2.2 + this.rnd() * 3.4) : b.vy * .51;
        b.vz = bar ? -2.85 : 1.15; b.ax = b.ay = 0; b.releaseT = this.elapsed; this.brainIn = 0;
        if (bar) this.emit('post', { text: `${f.shooter.name} hits the crossbar!`, team: f.shooter.team, key: true });
        else this.say('post', { p: f.shooter.name, opp: this.teamName(1 - f.shooter.team) }, { team: f.shooter.team, key: true });
        return;
      }
      this.finishShot(f, 'miss'); this.describeMiss(f, at.z > GOAL_H ? 'over' : 'wide');
      this.goalRestart(lineX, at.y, this.teams[1 - f.shooter.team]);
    }

    goalScored(lineX, shot = null) {
      const b = this.ball;
      const team = this.teams.find(t => (t.attackDir > 0 ? L : 0) === lineX), si = team.idx;
      const scorer = (shot && shot.shooter) || b.lastTouch || team.slots[team.slots.length - 1].player;
      const og = scorer.team !== si;
      const assist = !og && shot && !shot.pen ? shot.assist : null;
      team.score++;
      if (shot) this.finishShot(shot, 'goal');
      if (!og) {
        scorer.stats.goals++; this.adjust(scorer, .9);
        if (assist && assist !== scorer) { assist.stats.assists++; this.adjust(assist, .50); }
      } else this.adjust(scorer, -.6);
      const xg = shot ? shot.xG : .04;
      b.flight = null; b.owner = null; b.ax = b.ay = 0;
      b.vx *= .63; b.vy *= .45; b.vz *= .26;
      this.netLine = lineX;
      this.concedeTeam = 1 - si; this.phase = 'goal'; this.phaseTimer = 8.0; this.lastPass = null;
      this.lastGoal = { team: si, scorer: scorer.name, assist: assist ? assist.name : null, minute: this.minute(), og, xg, pen: !!(shot && shot.pen) };
      const cornerX = lineX === 0 ? 4 : L - 4, cornerY = scorer.y < CY ? 4 : W - 4;
      for (const slot of team.slots) {
        const p = slot.player;
        if (p.role !== 'GK') {
          p.tx = cornerX + (p === scorer ? 0 : (this.rnd() - .5) * 8);
          p.ty = cornerY + (p === scorer ? 0 : (this.rnd() - .5) * 8);
          p.sprint = true;
        }
      }
      for (const slot of this.teams[1 - si].slots) { const p = slot.player, h = this.homePos(p, this.teams[p.team]); p.tx = h.x; p.ty = h.y; p.sprint = false; }
      if (og) this.emit('og', { text: `${scorer.name} turns it into his own net. Goal for ${team.club.name}!`, team: si, player: scorer, key: true, goal: true, xg });
      else if (shot && shot.pen) this.say('penscore', { p: scorer.name }, { team: si, player: scorer, key: true, goal: true, xg });
      else this.say('goal', { p: scorer.name, team: team.club.name, a: assist ? `Assist: ${assist.name}.` : '' }, { team: si, player: scorer, key: true, goal: true, xg });
    }

    settleNet(h) {
      const b = this.ball, line = this.netLine, d = line === 0 ? -1 : 1;
      if (Math.abs(b.vx) + Math.abs(b.vy) + Math.abs(b.vz) + b.z < .014) return;
      P.advance(b, h);
      if ((b.x - line) * d > 2.29) { b.x = line + d * 2.29; b.vx *= -.17; b.vy *= .37; }
      if ((b.x - line) * d < P.RADIUS) { b.x = line + d * P.RADIUS; b.vx = 0; }
      if (Math.abs(b.y - CY) > GOAL_HALF - .10) { b.y = CY + Math.sign(b.y - CY) * (GOAL_HALF - .10); b.vy *= -.20; }
    }

  }

  const api = { Match, L, W, CX, CY, GOAL_HALF, GOAL_H, BOX_L, BOX_HALF, SIX_L, SIX_HALF, PEN };
  global.TLEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
