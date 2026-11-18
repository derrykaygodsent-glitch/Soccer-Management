/* TOUCHLINE 26 — original 2D match engine. Pure logic, no DOM. */
(function (global) {
  'use strict';
  const D = (typeof require !== 'undefined' && typeof window === 'undefined') ? require('./data.js') : global.TLData;

  const L = 105, W = 68, CX = 52.5, CY = 34;
  const GOAL_HALF = 3.66, GOAL_H = 2.44;
  const BOX_L = 16.5, BOX_HALF = 20.16, SIX_L = 5.5, SIX_HALF = 9.16, PEN = 11;
  const G = 9.81;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const lerp = (a, b, t) => a + (b - a) * t;

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
      this.onEvent = opts.onEvent || (() => {});
      this.onSnapshot = opts.onSnapshot || null;
      this.snapEvery = 2; this.snapCount = 0;
      this.events = [];
      this.shotMap = [];
      this.momentum = [];
      this.momT = 0;
      this.possTime = [0, 0];
      this.h = 1 / 40;
      this.t = 0; this.half = 1;
      this.added = [0, 0]; this.addedAnnounced = [false, false];
      this.phase = 'pre';
      this.phaseTimer = 0;
      this.setpiece = null;
      this.lastPass = null;
      this.lastGoalFrames = null;
      this.fastForward = false;
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
          p.decisionT = 0; p.tackleT = 0; p.stunT = 0; p.runT = 2 + this.rnd() * 6; p.running = 0;
          p.offsideFlag = false; p.cond = 1; p.dir = 0; p.dribPhase = this.rnd() * 6;
          p.gkHold = 0;
        });
        team.slots.forEach(s => this.assignSlot(s.player, s, team));
        return team;
      });
      this.ball = { x: CX, y: CY, z: 0, vx: 0, vy: 0, vz: 0, owner: null, lastTouch: null, releaseT: -9, flight: null };
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
      const s = team.slots.find(sl => sl.player.pos === 'GK') || team.slots[0];
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
      const tpl = pool[(this.rnd() * pool.length) | 0];
      return this.emit(type, { text: fmt(tpl, map), ...extra });
    }
    teamName(i) { return this.teams[i].club.name; }
    shortName(i) { return this.teams[i].club.short; }

    /* ---------------- setup / phases ---------------- */

    setupKickoff(teamIdx, afterGoal = false) {
      this.phase = 'kickoff'; this.phaseTimer = 4.0;
      this.kickoffTeam = teamIdx;
      const b = this.ball;
      b.x = CX; b.y = CY; b.z = 0; b.vx = b.vy = b.vz = 0; b.flight = null; b.lastTouch = null;
      for (const team of this.teams) {
        const d = team.attackDir;
        for (const s of team.slots) {
          const p = s.player; if (!p.onPitch) continue;
          const h = this.homePos(p, team);
          let x = h.x, y = h.y;
          // clamp into own half
          x = d > 0 ? Math.min(x, CX - 2) : Math.max(x, CX + 2);
          p.tx = x; p.ty = y; p.kickoffHold = true;
        }
      }
      const kt = this.teams[teamIdx];
      let pool = kt.slots.filter(s => s.role === 'ST' || s.role === 'AM' || s.role === 'CM');
      if (!pool.length) pool = kt.slots.filter(s => s.player.pos !== 'GK');
      if (!pool.length) pool = kt.slots;
      const striker = pool.sort((a, b2) => b2.x - a.x)[0].player;
      striker.tx = CX - kt.attackDir * 0.7; striker.ty = CY;
      const partner = kt.slots.filter(s => s.player !== striker && (s.role === 'ST' || s.role === 'CM' || s.role === 'AM')).sort((a, b2) => b2.x - a.x)[0];
      if (partner) { partner.player.tx = CX - kt.attackDir * 4; partner.player.ty = CY + 3; }
      b.owner = striker; b.lastTouch = striker;
      this.kickoffTaker = striker;
      if (afterGoal) this.emit('kickoff', { text: this.teamName(teamIdx) + ' restart — plenty still to play for.', team: teamIdx, key: false });
      else this.say('kickoff', { stadium: this.teams[0].club.stadium }, { team: teamIdx, key: true });
    }

    begin() { if (this.phase === 'pre') this.setupKickoff(0); }

    continueSecondHalf() {
      if (this.phase !== 'halftime') return;
      this.half = 2; this.t = 0;
      for (const team of this.teams) {
        team.attackDir *= -1;
        for (const s of team.slots) { s.player.cond = Math.min(1, s.player.cond + 0.14); }
      }
      this.setupKickoff(1);
    }

    setTactics(ti, partial) {
      const team = this.teams[ti];
      const oldForm = team.tactics.formation;
      Object.assign(team.tactics, partial);
      if (partial.formation && partial.formation !== oldForm) this.reassignFormation(ti);
    }

    reassignFormation(ti) {
      const team = this.teams[ti];
      const on = team.slots.map(s => s.player).filter(p => p.onPitch && !p.red);
      const { xi } = D.bestXI(on, team.tactics.formation);
      team.slots = xi.map(s => ({ ...s }));
      team.slots.forEach(s => { s.player.role = s.role; s.player.slotX = s.x; s.player.slotY = s.y; });
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
      np.decisionT = 0; np.tackleT = 0; np.stunT = 0; np.runT = 3; np.running = 0; np.offsideFlag = false; np.gkHold = 0;
      slot.player = np;
      team.bench = team.players.filter(p => !p.onPitch && !p.red);
      team.subsUsed++;
      if (this.ball.owner === old) { this.ball.owner = np; this.ball.lastTouch = np; }
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
      b.x = clamp(x, 0.3, L - 0.3); b.y = clamp(y, 0.3, W - 0.3); b.z = 0; b.vx = b.vy = b.vz = 0; b.owner = null; b.flight = null;
      this.phase = type;
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
      const oppD = opp.attackDir;
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
          if (i < attackers.length) { p.tx = attackers[i].x + d * 1.2; p.ty = attackers[i].y; }
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
      for (const p of this.onPitchPlayers()) p.spRole = null;
      this.phase = 'open';
      if (sp.type === 'throwin') {
        this.doPass(taker, { noOffside: true, loft: true, maxDist: 26 });
      } else if (sp.type === 'goalkick') {
        if (team.tactics.passing === 2 || this.rnd() < 0.35) this.doLongBall(taker);
        else this.doPass(taker, { noOffside: true, maxDist: 40 });
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
      if (['pre', 'halftime', 'fulltime'].includes(this.phase)) return;
      this.playersCache = this.onPitchPlayers();
      this.t += h;
      const halfLimit = 2700 + this.added[this.half - 1];
      // stoppage announcement
      if (!this.addedAnnounced[this.half - 1] && this.t >= 2700) {
        this.addedAnnounced[this.half - 1] = true;
        const evCount = this.events.filter(e => ['goal', 'yellow', 'red', 'sub', 'penalty'].includes(e.type) && e.half === this.half).length;
        const mins = this.half === 1 ? 1 + Math.min(3, Math.round(evCount * 0.4)) : 2 + Math.min(5, Math.round(evCount * 0.5));
        this.added[this.half - 1] = mins * 60;
        this.say('stoppage', { n: mins }, { key: false });
      }
      const shotInFlight = this.ball.flight && this.ball.flight.kind === 'shot';
      if (this.t >= halfLimit && this.phase !== 'goal' && !(shotInFlight && this.t < halfLimit + 5)) {
        if (this.half === 1) {
          this.phase = 'halftime';
          this.say('ht', { h: this.shortName(0), a: this.shortName(1), hs: this.teams[0].score, as: this.teams[1].score }, { key: true });
        } else {
          this.phase = 'fulltime';
          this.say('ft', { h: this.shortName(0), a: this.shortName(1), hs: this.teams[0].score, as: this.teams[1].score }, { key: true });
        }
        return;
      }

      if (this.phase === 'goal') {
        this.phaseTimer -= h;
        this.movePlayers(h, true);
        if (this.phaseTimer <= 0) this.setupKickoff(this.concedeTeam, true);
        return;
      }
      if (this.phase === 'kickoff') {
        this.phaseTimer -= h;
        this.movePlayers(h, true);
        if (this.phaseTimer <= 0) {
          for (const p of this.onPitchPlayers()) p.kickoffHold = false;
          this.phase = 'open';
          const taker = this.kickoffTaker;
          this.ball.owner = taker;
          this.doPass(taker, { noOffside: true, back: true });
        }
        return;
      }
      if (['throwin', 'goalkick', 'corner', 'freekick', 'penalty'].includes(this.phase)) {
        this.phaseTimer -= h;
        this.movePlayers(h, true);
        if (this.phaseTimer <= 0) this.executeSetPiece();
        return;
      }

      // ---- open play ----
      this.computeContext();
      this.computeTargets();
      this.movePlayers(h, false);
      this.updateBall(h);
      this.interactions(h);
      // possession
      if (this.ball.owner) this.possTime[this.ball.owner.team] += h;
      // momentum
      this.momT += h;
      if (this.momT >= 12) {
        this.momT = 0;
        const home = this.teams[0];
        let v = ((this.ball.x - CX) / CX) * home.attackDir;
        if (this.ball.owner) v += this.ball.owner.team === 0 ? 0.25 * home.attackDir : -0.25 * home.attackDir;
        this.momentum.push({ t: (this.half === 2 ? 2700 : 0) + this.t, v: clamp(v * 0.85, -1, 1) });
        if (this.momentum.length > 600) this.momentum.shift();
      }
      // snapshot for replay
      this.snapCount++;
      if (this.onSnapshot && this.snapCount % this.snapEvery === 0) {
        const ps = this.onPitchPlayers();
        const arr = new Float32Array(ps.length * 2 + 4);
        ps.forEach((p, i) => { arr[i * 2] = p.x; arr[i * 2 + 1] = p.y; });
        arr[ps.length * 2] = this.ball.x; arr[ps.length * 2 + 1] = this.ball.y; arr[ps.length * 2 + 2] = this.ball.z;
        arr[ps.length * 2 + 3] = this.ball.owner ? ps.indexOf(this.ball.owner) : -1;
        this.onSnapshot({ t: (this.half === 2 ? 2700 : 0) + this.t, n: ps.length, arr, ids: ps.map(p => p.id) });
      }
    }

    computeContext() {
      const b = this.ball;
      const players = this.onPitchPlayers();
      this.playersCache = players;
      // offside lines: second-last opponent x (incl GK) from attacker perspective
      for (const team of this.teams) {
        const opp = this.teams[1 - team.idx];
        const d = team.attackDir;
        const xs = opp.slots.map(s => s.player).filter(p => p.onPitch).map(p => p.x * d).sort((a, b2) => b2 - a);
        team.offsideLine = (xs.length > 1 ? xs[1] : xs[0] || 0) / d;
        team.possession = b.owner ? b.owner.team === team.idx : (b.lastTouch ? b.lastTouch.team === team.idx : false);
      }
      // chasers
      for (const team of this.teams) {
        const cands = team.slots.map(s => s.player).filter(p => p.onPitch && p.pos !== 'GK' && p.stunT <= 0);
        const bx = b.x + b.vx * 0.5, by = b.y + b.vy * 0.5;
        cands.sort((a, b2) => dist(a.x, a.y, bx, by) / this.speed(a) - dist(b2.x, b2.y, bx, by) / this.speed(b2));
        if (b.owner && b.owner.team === team.idx) {
          this.chasers[team.idx] = b.owner;
          this.chasers2[team.idx] = null;
        } else if (b.owner) {
          this.chasers[team.idx] = cands[0] || null;
          const ownGoalX2 = team.attackDir > 0 ? 0 : L;
          const ownerInOwnBox = (team.attackDir > 0 ? b.owner.x < BOX_L + 3 : b.owner.x > L - BOX_L - 3) && Math.abs(b.owner.y - CY) < BOX_HALF + 3;
          this.chasers2[team.idx] = (cands[1] && ((ownerInOwnBox && dist(cands[1].x, cands[1].y, b.owner.x, b.owner.y) < 9) || (team.tactics.press === 2 && dist(cands[1].x, cands[1].y, b.owner.x, b.owner.y) < 18))) ? cands[1] : null;
        } else {
          // if pass in flight to this team, intended receiver chases
          if (b.flight && b.flight.kind === 'pass' && b.flight.intended && b.flight.intended.team === team.idx && b.flight.intended.onPitch) {
            this.chasers[team.idx] = b.flight.intended;
          } else this.chasers[team.idx] = cands[0] || null;
          const ownGoalX = team.attackDir > 0 ? 0 : L;
          const ballInOwnBox = (team.attackDir > 0 ? b.x < BOX_L + 4 : b.x > L - BOX_L - 4) && Math.abs(b.y - CY) < BOX_HALF + 4;
          this.chasers2[team.idx] = (cands[1] && (ballInOwnBox || dist(cands[1].x, cands[1].y, bx, by) < 12) && (!b.flight || b.flight.kind !== 'pass' || ballInOwnBox)) ? cands[1] : null;
          this.chasers3 = this.chasers3 || [null, null];
          this.chasers3[team.idx] = (ballInOwnBox && cands[2]) ? cands[2] : null;
        }
      }
    }

    speed(p) {
      const a = p.attrs;
      let s = 6.4 * (0.78 + (a.pace / 20) * 0.4) * (0.72 + 0.28 * p.cond);
      if (p.stunT > 0) s *= 0.45;
      if (this.ball.owner === p) s *= 0.84;
      return s;
    }

    computeTargets() {
      const b = this.ball;
      const players = this.playersCache;
      for (const p of players) {
        p.runT -= this.h;
        if (p.running > 0) p.running -= this.h;
        const team = this.teams[p.team];
        const d = team.attackDir;
        const attacking = team.possession;
        const hpos = this.homePos(p, team);
        let tx = hpos.x, ty = hpos.y;
        // shape shift with ball
        const progress = (b.x - CX) * d;
        const ment = team.tactics.mentality; // 0..4
        const lineAdj = (team.tactics.line - 1) * 4;
        let shiftX = clamp(progress * 0.34, -15, 15);
        if (attacking) shiftX += 3 + ment * 2.4 + (['DC', 'FB'].includes(p.role) ? lineAdj : 0);
        else shiftX -= 5 - team.tactics.line * 1.5 + (p.role === 'ST' ? -4 : 0);
        if (p.role === 'GK') shiftX = 0;
        tx += d * clamp(shiftX, -20, 22);
        ty += (b.y - CY) * (['W', 'FB', 'WB'].includes(p.role) ? 0.16 : 0.28);
        // clamp role zones
        if (p.role === 'DC') tx = d > 0 ? Math.min(tx, CX + 12) : Math.max(tx, CX - 12);
        if (p.role === 'GK') { tx = d > 0 ? 3.2 : L - 3.2; ty = CY + clamp((b.y - CY) * 0.22, -5.5, 5.5); }
        tx = clamp(tx, 1.5, L - 1.5); ty = clamp(ty, 1.5, W - 1.5);

        if (p.role === 'GK') { this.gkTarget(p, team); continue; }

        const chaser = this.chasers[p.team], chaser2 = this.chasers2[p.team];
        if (!b.owner) {
          if (p === chaser || p === chaser2 || p === (this.chasers3 && this.chasers3[p.team])) {
            const tt = p === chaser ? 0.55 : 0.9;
            p.tx = clamp(b.x + b.vx * tt, -1, L + 1); p.ty = clamp(b.y + b.vy * tt, -1, W + 1);
            p.sprint = true;
            continue;
          }
        } else if (b.owner.team !== p.team) {
          if (p === chaser) {
            p.tx = b.owner.x + b.owner.vx * 0.3; p.ty = b.owner.y + b.owner.vy * 0.3; p.sprint = true; continue;
          }
          if (p === chaser2) {
            // cut passing lane toward goal
            const gx = d > 0 ? 0 : L; // own goal (defending)
            p.tx = (b.owner.x + gx) / 2; p.ty = (b.owner.y + CY) / 2; p.sprint = true; continue;
          }
          // marking: defenders goal-side of nearest dangerous opponent in zone
          if (['DC', 'FB', 'DM', 'WB'].includes(p.role)) {
            let mark = null, md = 15;
            for (const q of players) {
              if (q.team === p.team || q.pos === 'GK' || q === b.owner) continue;
              let zoneD = dist(q.x, q.y, hpos.x, hpos.y);
              if (q.running > 0 && q.runType === 'behind') zoneD -= 6; // priority: track runners
              if (zoneD < md) { md = zoneD; mark = q; }
            }
            if (mark) {
              const ownGoalX = d > 0 ? 0 : L;
              const a = Math.atan2(CY - mark.y, ownGoalX - mark.x);
              const gap = (mark.running > 0 && mark.runType === 'behind') ? 0.9 : 1.6;
              tx = mark.x + Math.cos(a) * gap; ty = mark.y + Math.sin(a) * gap;
            }
          }
        } else {
          // attacking off-ball
          if (p === b.owner) { this.dribbleTarget(p, team); continue; }
          const finalThird = (b.x - CX) * d > 8;
          if (['ST', 'W', 'AM', 'WB'].includes(p.role) && finalThird) {
            if (p.runT <= 0 && p.running <= 0) {
              p.running = 2.2 + this.rnd() * 1.8;
              p.runT = 7 + this.rnd() * 8;
              p.runType = this.rnd() < 0.62 ? 'behind' : 'short';
            }
            if (p.running > 0) {
              const line = team.offsideLine;
              if (p.runType === 'behind') {
                let rx = line - d * (2.2 - (this.rnd() < 0.4 ? 3.0 : 0)); // timed run, sometimes gambles
                rx = d > 0 ? Math.min(rx, L - 7) : Math.max(rx, 7);
                const channel = p.slotY < 0.35 ? CY - 12 : p.slotY > 0.65 ? CY + 12 : CY + (this.rnd() < 0.5 ? -7 : 7);
                tx = rx; ty = lerp(p.y, channel, 0.5);
                p.sprint = true;
              } else {
                tx = b.owner.x - d * 7; ty = b.owner.y + (p.slotY - 0.5) * 22;
              }
            }
          } else if (['CM', 'AM', 'DM'].includes(p.role) && attacking) {
            // support angle
            tx = lerp(tx, b.owner.x + d * 6, 0.35);
            ty = lerp(ty, b.owner.y + (p.slotY - 0.5) * 26, 0.3);
          } else if (['FB', 'WB'].includes(p.role) && attacking && ment >= 2) {
            // overlap
            tx = Math.max(tx, b.owner.x + d * 4) * (d > 0 ? 1 : 1);
            if (d < 0) tx = Math.min(hpos.x + shiftX * d, b.owner.x + d * 4);
            ty = p.slotY < 0.5 ? 3 : W - 3;
          }
        }
        p.tx = clamp(tx, 0.5, L - 0.5); p.ty = clamp(ty, 0.5, W - 0.5);
        p.sprint = p.sprint || dist(p.x, p.y, p.tx, p.ty) > 14;
      }
    }

    dribbleTarget(p, team) {
      const d = team.attackDir;
      const gx = d > 0 ? L : 0;
      let ax = gx, ay = CY;
      // steer around nearest opponent ahead
      let nearest = null, nd = 6;
      for (const q of this.playersCache) {
        if (q.team === p.team) continue;
        const dd = dist(q.x, q.y, p.x, p.y);
        const ahead = (q.x - p.x) * d > -1;
        if (dd < nd && ahead) { nd = dd; nearest = q; }
      }
      if (nearest) {
        const side = p.y > nearest.y ? 1 : -1;
        ay = p.y + side * 9;
        ax = p.x + d * 6;
      }
      p.tx = clamp(lerp(p.x, ax, 0.25), 1, L - 1);
      p.ty = clamp(lerp(p.y, ay, 0.3), 1, W - 1);
      p.sprint = true;
    }

    gkTarget(p, team) {
      const b = this.ball;
      const d = team.attackDir;
      const ownX = d > 0 ? 0 : L;
      if (b.owner === p) { p.tx = ownX + d * 4; p.ty = CY; return; }
      // shot in flight toward our goal -> move to intercept
      if (b.flight && b.flight.kind === 'shot' && b.flight.goalX === ownX) {
        const f = b.flight;
        const tToLine = Math.abs((ownX - b.x) / (b.vx || 0.01));
        const py = clamp(b.y + b.vy * Math.min(tToLine, 1.2), CY - GOAL_HALF - 1, CY + GOAL_HALF + 1);
        p.tx = ownX + d * clamp(1.2 - tToLine * 0.5, 0.3, 1.4);
        p.ty = py; p.sprint = true;
        return;
      }
      // sweep loose balls in box
      const inBox = d > 0 ? b.x < BOX_L : b.x > L - BOX_L;
      if (!b.owner && inBox && Math.abs(b.y - CY) < BOX_HALF && dist(p.x, p.y, b.x, b.y) < 11) {
        p.tx = b.x + b.vx * 0.4; p.ty = b.y + b.vy * 0.4; p.sprint = true; return;
      }
      // position on arc toward ball
      const ang = Math.atan2(b.y - CY, b.x - ownX);
      const adv = clamp(dist(b.x, b.y, ownX, CY) * 0.06, 1.2, 5.5);
      p.tx = ownX + Math.cos(ang) * adv;
      p.ty = CY + Math.sin(ang) * adv * 0.8;
    }

    movePlayers(h, locked) {
      const players = this.playersCache || this.onPitchPlayers();
      for (const p of players) {
        if (p.stunT > 0) p.stunT -= h;
        if (p.tackleT > 0) p.tackleT -= h;
        const targetX = p.tx, targetY = p.ty;
        const dx = targetX - p.x, dy = targetY - p.y;
        const dd = Math.hypot(dx, dy);
        let maxS = this.speed(p) * (p.sprint ? 1 : 0.72);
        if (locked && p.kickoffHold) maxS = this.speed(p);
        const arrive = dd < 1.6 ? dd / 1.6 : 1;
        let dvx = dd > 0.05 ? (dx / dd) * maxS * arrive : 0;
        let dvy = dd > 0.05 ? (dy / dd) * maxS * arrive : 0;
        // separation
        for (const q of players) {
          if (q === p) continue;
          const sx = p.x - q.x, sy = p.y - q.y;
          const sd = Math.hypot(sx, sy);
          if (sd < 1.3 && sd > 0.001) { dvx += (sx / sd) * (1.3 - sd) * 5; dvy += (sy / sd) * (1.3 - sd) * 5; }
        }
        const k = Math.min(1, h * 7.5);
        p.vx += (dvx - p.vx) * k; p.vy += (dvy - p.vy) * k;
        p.x += p.vx * h; p.y += p.vy * h;
        p.x = clamp(p.x, -1.5, L + 1.5); p.y = clamp(p.y, -1.5, W + 1.5);
        const sp = Math.hypot(p.vx, p.vy);
        if (sp > 0.4) p.dir = Math.atan2(p.vy, p.vx);
        // fatigue
        const drain = sp > 5.4 ? 0.00105 : sp > 2.5 ? 0.00045 : 0.00012;
        p.cond = Math.max(0.45, p.cond - drain * h * (1.35 - p.attrs.stamina / 20 * 0.7));
        p.sprint = false;
        p.dribPhase += h * (4 + sp);
      }
    }

    updateBall(h) {
      const b = this.ball;
      if (b.owner) {
        const o = b.owner;
        const sp = Math.hypot(o.vx, o.vy);
        const lead = 0.75 + Math.sin(o.dribPhase) * 0.22 * clamp(sp / 6, 0, 1);
        const dx = sp > 0.5 ? o.vx / sp : Math.cos(o.dir), dy = sp > 0.5 ? o.vy / sp : Math.sin(o.dir);
        b.x = o.x + dx * lead; b.y = o.y + dy * lead; b.z = 0;
        b.vx = o.vx; b.vy = o.vy; b.vz = 0;
        return;
      }
      const prevX = b.x;
      b.x += b.vx * h; b.y += b.vy * h;
      b.z += b.vz * h; b.vz -= G * h;
      if (b.z <= 0) {
        b.z = 0;
        if (b.vz < -1.5) { b.vz = -b.vz * 0.42; b.vx *= 0.82; b.vy *= 0.82; }
        else b.vz = 0;
        const sp = Math.hypot(b.vx, b.vy);
        if (sp > 0) {
          const dec = 3.4 * h;
          const ns = Math.max(0, sp - dec);
          b.vx *= ns / sp; b.vy *= ns / sp;
        }
      } else {
        b.vx *= (1 - 0.12 * h); b.vy *= (1 - 0.12 * h);
      }
      const f = b.flight;
      if (f) {
        f.traveled += Math.hypot(b.vx, b.vy) * h;
        if (f.kind === 'shot') {
          if (f.blockDist != null && f.traveled >= f.blockDist) { this.resolveBlock(); return; }
          const crossedHome = prevX > 0 && b.x <= 0;
          const crossedAway = prevX < L && b.x >= L;
          if (crossedHome || crossedAway) { this.resolveShotLine(crossedAway ? L : 0); return; }
        }
        if (f.kind === 'cross' && b.z === 0 && f.traveled > f.totalDist * 0.8) { this.resolveCross(); return; }
        if (f.kind === 'pass' && b.z === 0 && Math.hypot(b.vx, b.vy) < 2.5) { b.flight = null; }
      }
      // boundaries
      if (b.y < 0 || b.y > W) {
        const teamIdx = b.lastTouch ? 1 - b.lastTouch.team : 0;
        this.say('throwin', { team: this.teamName(teamIdx) }, { team: teamIdx });
        this.startSetPiece('throwin', teamIdx, clamp(b.x, 2, L - 2), b.y < 0 ? 0.2 : W - 0.2);
        return;
      }
      if (b.x < 0 || b.x > L) {
        const lineX = b.x < 0 ? 0 : L;
        const defending = this.teams.find(t => (t.attackDir > 0 ? 0 : L) === lineX);
        const inMouth = Math.abs(b.y - CY) <= GOAL_HALF && b.z <= GOAL_H;
        if (inMouth) { this.goalScored(lineX); return; }
        if (b.lastTouch && b.lastTouch.team === defending.idx) {
          const att = 1 - defending.idx;
          this.say('corner', { team: this.teamName(att) }, { team: att });
          this.startSetPiece('corner', att, lineX === 0 ? 0.4 : L - 0.4, b.y < CY ? 0.4 : W - 0.4);
        } else {
          this.say('goalkick', { team: this.teamName(defending.idx) }, { team: defending.idx });
          this.startSetPiece('goalkick', defending.idx, lineX === 0 ? SIX_L - 1 : L - SIX_L + 1, CY + (this.rnd() < 0.5 ? -4 : 4));
        }
      }
    }

    interactions(h) {
      const b = this.ball;
      const players = this.playersCache;
      // claims on free ball
      if (!b.owner && b.z < 1.5 && this.t - b.releaseT > 0.3) {
        const near = players.filter(p => dist(p.x, p.y, b.x, b.y) < (p.pos === 'GK' ? 1.6 : 1.15))
          .sort((a, b2) => dist(a.x, a.y, b.x, b.y) - dist(b2.x, b2.y, b.x, b.y));
        for (const p of near) {
          if (p === b.lastTouch && this.t - b.releaseT < 0.6) continue;
          if (p.stunT > 0) continue;
          const r = p.pos === 'GK' ? 1.5 : 1.05;
          if (dist(p.x, p.y, b.x, b.y) > r) continue;
          const isOpp = b.lastTouch && p.team !== b.lastTouch.team;
          const sp = Math.hypot(b.vx, b.vy);
          let control = isOpp ? 0.30 + p.attrs.positioning / 70 : 0.88;
          if (sp > 13) control -= (sp - 13) * 0.025;
          const npd = this.nearestOppDistTo(p);
          if (!isOpp && npd < 2.5) control -= (2.5 - npd) * 0.09;
          if (p.pos === 'GK') control = 0.92;
          if (this.rnd() < control) {
            // offside check
            if (b.flight && b.flight.offsideCheck && p.offsideFlag && b.lastTouch && p.team === b.lastTouch.team) {
              this.offside(p); return;
            }
            this.claim(p, sp);
            return;
          } else {
            // failed control: sometimes a deflection, usually plays through
            if (isOpp && b.flight && b.flight.kind === 'pass' && this.rnd() < 0.30) {
              const a = this.rnd() * Math.PI * 2;
              b.vx = Math.cos(a) * sp * 0.35; b.vy = Math.sin(a) * sp * 0.35; b.vz = 1.2;
              b.lastTouch = p; b.releaseT = this.t; b.flight = null;
              p.stats.interceptions++; this.adjust(p, 0.05);
            }
            continue;
          }
        }
      }
      // tackles on owner
      if (b.owner) {
        const o = b.owner;
        for (const p of players) {
          if (p.team === o.team || p.tackleT > 0 || p.stunT > 0 || p.pos === 'GK') continue;
          if (dist(p.x, p.y, o.x, o.y) > 1.25) continue;
          p.tackleT = 1.0 + this.rnd() * 0.9;
          const inOwnBox = (this.teams[p.team].attackDir > 0 ? o.x < BOX_L : o.x > L - BOX_L) && Math.abs(o.y - CY) < BOX_HALF;
          if (this.rnd() > (inOwnBox ? 0.28 : 0.72)) continue; // jockey, don't commit
          const winP = clamp(0.50 + (p.attrs.tackling - o.attrs.dribbling) * 0.024, 0.18, 0.82);
          const fromBehind = Math.cos(o.dir) * (p.x - o.x) + Math.sin(o.dir) * (p.y - o.y) < -0.3;
          const foulP = (0.055 + p.attrs.aggression * 0.005 + (fromBehind ? 0.07 : 0)) * (inOwnBox ? 0.25 : 1);
          const roll = this.rnd();
          if (roll < foulP) { this.foul(p, o); return; }
          if (roll < foulP + winP * (1 - foulP)) {
            // won
            b.owner = null; b.lastTouch = p; b.releaseT = this.t;
            const a = Math.atan2(p.y - o.y, p.x - o.x) + (this.rnd() - 0.5);
            b.vx = Math.cos(a) * 4; b.vy = Math.sin(a) * 4; b.vz = 0.8; b.flight = null;
            o.stunT = 0.4; p.stats.tackles++; this.adjust(p, 0.06); this.adjust(o, -0.03);
            o.offsideFlag = false;
            return;
          } else {
            p.stunT = 0.4; // beaten
            this.adjust(o, 0.03);
          }
        }
        // owner decisions
        o.decisionT -= h;
        const pressure = this.nearestOppDist(o);
        if (o.pos === 'GK') {
          o.gkHold += h;
          if (o.gkHold > 1.6 + this.rnd() * 1.2 || (pressure < 3 && o.gkHold > 0.7)) {
            o.gkHold = 0;
            if (pressure < 4 || this.teams[o.team].tactics.passing === 2) this.doLongBall(o);
            else this.doPass(o, { maxDist: 42 });
          }
        } else if (o.decisionT <= 0 || pressure < 1.6) {
          this.decide(o, pressure);
        }
      }
      // watchdog: stuck ball
      if (!b.owner && Math.hypot(b.vx, b.vy) < 0.4 && b.z === 0) {
        this.watchdog += h;
        if (this.watchdog > 2.5) {
          let best = null, bd = 1e9;
          for (const p of players) { const dd = dist(p.x, p.y, b.x, b.y); if (dd < bd && p.pos !== 'GK') { bd = dd; best = p; } }
          if (best) { best.tx = b.x; best.ty = b.y; best.sprint = true; }
          if (this.watchdog > 6 && best) { this.claim(best, 0); this.watchdog = 0; }
        }
      } else this.watchdog = 0;
    }

    nearestOppDist(p) {
      let m = 1e9;
      for (const q of this.playersCache) if (q.team !== p.team) { const d = dist(p.x, p.y, q.x, q.y); if (d < m) m = d; }
      return m;
    }

    claim(p, ballSpeed) {
      const b = this.ball;
      const f = b.flight;
      const prevTouch = b.lastTouch;
      // pass completion
      if (f && f.kind === 'pass' && prevTouch && prevTouch.team === p.team && prevTouch !== p) {
        this.teams[p.team].stats.passWon++;
        prevTouch.stats.passWon++;
        this.adjust(prevTouch, 0.008);
        this.lastPass = { player: prevTouch, t: this.t, team: p.team };
      } else if (f && f.kind === 'pass' && prevTouch && prevTouch.team !== p.team) {
        p.stats.interceptions++; this.adjust(p, 0.07);
        this.lastPass = null;
      }
      for (const q of this.playersCache) q.offsideFlag = false;
      b.owner = p; b.lastTouch = p; b.flight = null; b.vx = b.vy = b.vz = 0; b.z = 0;
      const danger = (p.x - CX) * this.teams[p.team].attackDir > 12;
      p.decisionT = danger ? 0.16 + this.rnd() * 0.15 : 0.35 + this.rnd() * 0.4;
      p.gkHold = 0;
      // bad first touch on fast balls
      if (ballSpeed > 15 && p.pos !== 'GK') {
        const badP = clamp((ballSpeed - 15) * 0.03 * (1.4 - p.attrs.composure / 20), 0, 0.4);
        if (this.rnd() < badP) {
          b.owner = null; b.releaseT = this.t;
          const a = p.dir + (this.rnd() - 0.5) * 1.5;
          b.vx = Math.cos(a) * 5; b.vy = Math.sin(a) * 5; b.vz = 1;
          this.adjust(p, -0.04);
        }
      }
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
      const d = this.teams[victim.team].attackDir;
      const ownGoalX = d > 0 ? 0 : L; // goal defended by fouling team p? victim attacks toward opp goal
      const foulGoalX = this.teams[p.team].attackDir > 0 ? 0 : L;
      const inBox = (this.teams[p.team].attackDir > 0 ? b.x < BOX_L : b.x > L - BOX_L) && Math.abs(b.y - CY) < BOX_HALF;
      // card logic
      const lastMan = this.isLastDefender(p, victim);
      let card = null;
      const roll = this.rnd();
      if (inBox && lastMan && this.rnd() < 0.18) card = 'red';
      else if (roll < 0.008 || (lastMan && roll < 0.04)) card = 'red';
      else if (roll < 0.16 || p.yellow >= 1 && roll < 0.34) card = 'yellow';
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

    decide(p, pressure) {
      const team = this.teams[p.team];
      const d = team.attackDir;
      const gx = d > 0 ? L : 0;
      const b = this.ball;
      const distGoal = dist(p.x, p.y, gx, CY);
      const tempo = team.tactics.tempo;
      p.decisionT = (1.15 + this.rnd() * 0.85) * [1.25, 1, 0.78][tempo];
      const noise = () => (this.rnd() - 0.5) * (1.5 - p.attrs.composure / 20) * 0.5;

      // shoot utility
      let shootU = -1;
      if (distGoal < 30 && p.pos !== 'GK') {
        const xg = this.estimateXG(p.x, p.y, gx);
        shootU = xg * (2.6 + p.attrs.shooting / 12) + (p.role === 'ST' ? 0.12 : 0) + noise() * 0.4;
        if (distGoal > 22) shootU *= 0.55;
      }
      // pass utility
      const passOpt = this.bestPassOption(p);
      let passU = passOpt ? passOpt.score + noise() * 0.3 : -1;
      if (pressure < 2.2) passU += 0.22;
      // dribble utility
      let dribU = 0.48 + p.attrs.dribbling / 40 + noise() * 0.3;
      const aheadSpace = this.spaceAhead(p);
      dribU += clamp(aheadSpace / 12, 0, 0.5);
      if (pressure < 1.8) dribU -= 0.45;
      if (distGoal < 16) dribU += 0.25;
      if (p.role === 'DC' || p.role === 'FB') dribU -= 0.22;
      // clearance
      let clearU = -1;
      const ownThird = (p.x - CX) * d < -18;
      if (ownThird && pressure < 2.6) clearU = 0.9 + noise();
      if (pressure < 1.3 && ownThird) clearU += 0.5;

      const best = Math.max(shootU, passU, dribU, clearU);
      if (best === shootU && shootU > 0.16 && !(pressure < 1.4 && this.estimateXG(p.x, p.y, gx) < 0.3)) this.doShot(p, {});
      else if (best === clearU && clearU > 0) {
        const ownGoalX = d > 0 ? 0 : L;
        const inOwnBoxNow = (d > 0 ? p.x < BOX_L : p.x > L - BOX_L) && Math.abs(p.y - CY) < BOX_HALF;
        if (inOwnBoxNow && pressure < 2.0 && this.rnd() < 0.45) {
          const b2 = this.ball;
          b2.owner = null; b2.lastTouch = p; b2.releaseT = this.t;
          b2.vx = -d * 9; b2.vy = (p.y < CY ? -1 : 1) * 7; b2.vz = 2; b2.flight = null;
          p.decisionT = 0.8;
        } else this.doLongBall(p);
      }
      else if (best === passU && passOpt) this.doPassTo(p, passOpt);
      else {
        // keep dribbling; maybe knock-on big space
        if (aheadSpace > 9 && p.attrs.pace > 13 && this.rnd() < 0.3) {
          const b2 = this.ball;
          b2.owner = null; b2.lastTouch = p; b2.releaseT = this.t;
          b2.vx = Math.cos(p.dir) * 11; b2.vy = Math.sin(p.dir) * 11; b2.flight = { kind: 'pass', intended: p, traveled: 0, offsideCheck: false };
          p.decisionT = 0.8;
        }
      }
    }

    estimateXG(x, y, gx) {
      const dd = dist(x, y, gx, CY);
      const ang = Math.abs(Math.atan2(y - CY, Math.abs(gx - x) || 1));
      const angleF = clamp(1 - ang / 1.1, 0.15, 1);
      let xg = 0.40 * Math.exp(-dd / 8.5) * angleF;
      if (dd < 6) xg = (0.34 + (6 - dd) * 0.045) * clamp(angleF + 0.25, 0.3, 1);
      return clamp(xg, 0.01, 0.7);
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

    laneRisk(x0, y0, x1, y1, teamIdx, minGap = 1.4) {
      let risk = 0;
      const dx = x1 - x0, dy = y1 - y0;
      const len = Math.hypot(dx, dy) || 1;
      for (const q of this.playersCache) {
        if (q.team === teamIdx) continue;
        const t = clamp(((q.x - x0) * dx + (q.y - y0) * dy) / (len * len), 0.05, 0.95);
        const px = x0 + dx * t, py = y0 + dy * t;
        const gap = dist(q.x, q.y, px, py);
        if (gap < minGap) risk += (minGap - gap) / minGap * (0.5 + q.attrs.positioning / 30);
      }
      return risk;
    }

    bestPassOption(p) {
      const team = this.teams[p.team];
      const d = team.attackDir;
      const style = team.tactics.passing;
      const b = this.ball;
      let best = null;
      const mates = this.playersCache.filter(q => q.team === p.team && q !== p);
      for (const q of mates) {
        const dd = dist(p.x, p.y, q.x, q.y);
        if (dd < 4 || dd > [34, 46, 62][style]) continue;
        if (q.pos === 'GK' && (p.x - CX) * d > -10) continue; // no backpass to keeper in opp half
        const progress = ((q.x - p.x) * d) / 30;
        const openness = clamp(this.nearestOppDistTo(q) / 8, 0, 1);
        const risk = this.laneRisk(p.x, p.y, q.x, q.y, p.team);
        let score = 0.34 + progress * 0.55 + openness * 0.5 - risk * 0.85 - Math.max(0, (3 - this.nearestOppDistTo(q)) / 3) * 0.45;
        score -= Math.max(0, dd - 30) * 0.012;
        if (q.running > 0 && q.runType === 'behind') score += 0.18;
        if (q.role === 'ST' && (q.x - CX) * d > 10) score += 0.1;
        if (q.pos === 'GK') score -= 0.35;
        // through-ball into space
        let lead = { x: q.x + q.vx * 0.7, y: q.y + q.vy * 0.7 };
        let through = false;
        if (q.running > 0 && q.runType === 'behind' && dd > 12 && (p.attrs.passing > 14 || this.rnd() < 0.15)) {
          const line = team.offsideLine;
          let sx = line + d * 2.2;
          sx = d > 0 ? Math.min(sx, L - 8) : Math.max(sx, 8);
          lead = { x: sx, y: q.y + q.vy * 0.8 };
          if (this.laneRisk(p.x, p.y, lead.x, lead.y, p.team) < 0.2) { through = true; score += 0.2; }
        }
        score += (this.rnd() - 0.5) * (1.6 - p.attrs.passing / 20) * 0.45;
        if (!best || score > best.score) best = { target: q, lead, score, through, dist: dd };
      }
      return best && best.score > 0.1 ? best : null;
    }

    nearestOppDistTo(q) {
      let m = 1e9;
      for (const r of this.playersCache) if (r.team !== q.team) { const dd = dist(r.x, r.y, q.x, q.y); if (dd < m) m = dd; }
      return m;
    }

    doPass(p, opts = {}) {
      const opt = this.bestPassOption(p);
      if (opt) { this.doPassTo(p, opt, opts); return; }
      // no option: hoof it
      this.doLongBall(p);
    }

    doPassTo(p, opt, opts = {}) {
      const b = this.ball;
      const team = this.teams[p.team];
      const d = team.attackDir;
      const q = opt.target;
      const maxD = opts.maxDist || 99;
      let tx = opt.lead.x, ty = opt.lead.y;
      if (opt.dist > maxD) { tx = lerp(p.x, tx, maxD / opt.dist); ty = lerp(p.y, ty, maxD / opt.dist); }
      if (opts.back) { tx = p.x - d * 8; ty = p.y + (this.rnd() < 0.5 ? -6 : 6); }
      const dd = dist(p.x, p.y, tx, ty);
      // error
      const pressure = this.nearestOppDist(p);
      const errScale = (1.5 - p.attrs.passing / 20) * (0.5 + dd * 0.035) * (pressure < 2 ? 1.5 : 1);
      tx += (this.rnd() - 0.5) * errScale * 1.5;
      ty += (this.rnd() - 0.5) * errScale * 1.5;
      tx = clamp(tx, 0.5, L - 0.5); ty = clamp(ty, 0.5, W - 0.5);
      const risk = this.laneRisk(p.x, p.y, tx, ty, p.team);
      let loft = opts.loft || (risk > 0.8 && dd > 16) || (team.tactics.passing === 2 && dd > 26 && this.rnd() < 0.5);
      const speed = loft ? clamp(dd * 0.95 + 5, 10, 24) : clamp(dd * 1.05 + 5, 9, 25);
      const T = dd / speed;
      const ang = Math.atan2(ty - p.y, tx - p.x);
      b.owner = null; b.lastTouch = p; b.releaseT = this.t;
      b.x = p.x + Math.cos(ang) * 0.6; b.y = p.y + Math.sin(ang) * 0.6; b.z = 0.05;
      b.vx = Math.cos(ang) * speed; b.vy = Math.sin(ang) * speed;
      b.vz = loft ? G * T * 0.5 : 0;
      b.flight = { kind: 'pass', intended: opts.back ? null : q, traveled: 0, totalDist: dd, offsideCheck: !opts.noOffside, through: opt.through };
      team.stats.passes++; p.stats.passes++;
      if (opt.through) { p.stats.keyPasses++; this.adjust(p, 0.1); }
      // offside flags
      if (!opts.noOffside) {
        const line = team.offsideLine;
        for (const r of this.playersCache) {
          if (r.team !== p.team || r === p) continue;
          const beyond = d > 0 ? r.x > line + 0.6 : r.x < line - 0.6;
          const aheadBall = d > 0 ? r.x > b.x + 0.3 : r.x < b.x - 0.3;
          const oppHalf = d > 0 ? r.x > CX : r.x < CX;
          r.offsideFlag = beyond && aheadBall && oppHalf;
        }
      }
      p.decisionT = 0.6;
    }

    doLongBall(p) {
      const b = this.ball;
      const team = this.teams[p.team];
      const d = team.attackDir;
      const tx = clamp(p.x + d * (30 + this.rnd() * 22), 6, L - 6);
      const ty = clamp(CY + (this.rnd() - 0.5) * 40, 6, W - 6);
      const dd = dist(p.x, p.y, tx, ty);
      const speed = clamp(dd * 0.9 + 6, 14, 26);
      const T = dd / speed;
      const ang = Math.atan2(ty - p.y, tx - p.x);
      b.owner = null; b.lastTouch = p; b.releaseT = this.t;
      b.x = p.x; b.y = p.y; b.z = 0.05;
      b.vx = Math.cos(ang) * speed; b.vy = Math.sin(ang) * speed; b.vz = G * T * 0.5;
      b.flight = { kind: 'pass', intended: null, traveled: 0, totalDist: dd, offsideCheck: true };
      team.stats.passes++; p.stats.passes++;
      const line = team.offsideLine;
      for (const r of this.playersCache) {
        if (r.team !== p.team || r === p) continue;
        const beyond = d > 0 ? r.x > line + 0.6 : r.x < line - 0.6;
        r.offsideFlag = beyond && (d > 0 ? r.x > CX : r.x < CX);
      }
      p.decisionT = 0.7;
    }

    doCross(p, fromCorner = false) {
      const b = this.ball;
      const team = this.teams[p.team];
      const d = team.attackDir;
      const gx = d > 0 ? L : 0;
      const tx = gx - d * (5.5 + this.rnd() * 6);
      const ty = CY + (this.rnd() - 0.5) * 12;
      const dd = dist(p.x, p.y, tx, ty);
      const speed = clamp(dd * 0.85 + 6, 13, 24);
      const T = dd / speed;
      const ang = Math.atan2(ty - p.y, tx - p.x);
      const err = (1.5 - p.attrs.passing / 20) * 2.2;
      b.owner = null; b.lastTouch = p; b.releaseT = this.t;
      b.x = p.x; b.y = p.y; b.z = 0.05;
      b.vx = Math.cos(ang) * speed; b.vy = Math.sin(ang) * speed; b.vz = G * T * 0.5 + 1.2;
      b.flight = { kind: 'cross', intended: null, traveled: 0, totalDist: dd + err, target: { x: tx, y: ty }, offsideCheck: !fromCorner };
      team.stats.passes++; p.stats.passes++;
      if (!fromCorner) this.say('cross', { p: p.name }, { team: p.team });
      p.decisionT = 0.8;
    }

    resolveCross() {
      const b = this.ball;
      const f = b.flight;
      b.flight = null;
      // contest at landing
      let att = null, def = null, ad = 3.2, dd2 = 3.2;
      for (const p of this.playersCache) {
        const dd = dist(p.x, p.y, b.x, b.y);
        if (p.pos === 'GK') {
          if (dd < 2.2) { this.claim(p, 5); return; }
          continue;
        }
        const attTeam = b.lastTouch ? b.lastTouch.team : 0;
        if (p.team === attTeam) { if (dd < ad) { ad = dd; att = p; } }
        else { if (dd < dd2) { dd2 = dd; def = p; } }
      }
      if (att && (!def || this.rnd() < clamp(0.45 + (att.attrs.positioning - (def ? def.attrs.positioning : 10)) * 0.03 + (att.role === 'ST' ? 0.12 : 0), 0.15, 0.8))) {
        this.say('header', { p: att.name }, { team: att.team });
        b.x = att.x; b.y = att.y;
        this.doShot(att, { header: true, distOverride: dist(att.x, att.y, this.teams[1 - att.team].attackDir > 0 ? 0 : L, CY) });
      } else if (def) {
        this.say('clear', { p: def.name }, { team: def.team });
        const d = this.teams[def.team].attackDir;
        b.vx = d * (8 + this.rnd() * 6); b.vy = (this.rnd() - 0.5) * 10; b.vz = 4;
        b.lastTouch = def; b.releaseT = this.t;
        this.adjust(def, 0.05);
      } else {
        b.vx *= 0.3; b.vy *= 0.3;
      }
    }

    doShot(p, opts = {}) {
      const b = this.ball;
      const team = this.teams[p.team];
      const d = team.attackDir;
      const gx = d > 0 ? L : 0;
      const keeper = this.gk(this.teams[1 - p.team]);
      const dd = opts.distOverride || dist(p.x, p.y, gx, CY);
      const pressure = this.nearestOppDist(p);
      let xg = opts.pen ? 0.79 : this.estimateXG(p.x, p.y, gx);
      if (opts.header) xg = clamp(xg * 1.15, 0.05, 0.65);
      if (opts.fk) xg = clamp(xg * 0.65, 0.02, 0.25);
      // on target?
      let onP = clamp(0.24 + p.attrs.shooting / 20 * 0.30 - Math.max(0, dd - 14) * 0.014 - (pressure < 2.2 ? 0.15 : 0) - (opts.header ? 0.06 : 0) - (opts.fk ? 0.1 : 0), 0.08, 0.8);
      if (opts.pen) onP = 0.88;
      const onTarget = this.rnd() < onP;
      // block chance (defenders in lane)
      let blockDist = null, blocker = null;
      if (!opts.pen) {
        const steps = Math.floor(dd);
        for (let i = 2; i < steps; i++) {
          const t = i / steps;
          const px = lerp(p.x, gx, t), py = lerp(p.y, CY, t);
          for (const q of this.playersCache) {
            if (q.team === p.team || q.pos === 'GK') continue;
            if (dist(q.x, q.y, px, py) < 1.2 && this.rnd() < 0.30 + q.attrs.positioning / 80) {
              blockDist = dist(p.x, p.y, px, py); blocker = q; break;
            }
          }
          if (blockDist != null) break;
        }
      }
      // placement & save
      const placement = Math.pow(this.rnd(), 1.35 - p.attrs.composure / 30); // 0..1, higher = better corner
      let outcome, targetY, targetZ;
      if (!onTarget) {
        outcome = 'miss';
        targetY = CY + (this.rnd() < 0.5 ? -1 : 1) * (GOAL_HALF + 0.6 + this.rnd() * 2.5);
        targetZ = this.rnd() < 0.5 ? GOAL_H + 0.5 + this.rnd() * 2 : this.rnd() * 1.5;
        if (this.rnd() < 0.06) { outcome = 'post'; targetY = CY + (this.rnd() < 0.5 ? -GOAL_HALF : GOAL_HALF); targetZ = 1; }
      } else {
        const side = this.rnd() < 0.5 ? -1 : 1;
        targetY = CY + side * placement * (GOAL_HALF - 0.25);
        targetZ = this.rnd() < 0.6 ? 0.25 + this.rnd() * 0.7 : 1.2 + this.rnd() * 1.0;
        let saveP = clamp(0.82 + (keeper.attrs.reflexes + keeper.attrs.handling) / 40 * 0.26 - placement * 0.5 - (xg - 0.08) * 0.7, 0.22, 0.96);
        const kd = dist(keeper.x, keeper.y, p.x, p.y);
        if (kd < 9 && !opts.pen) saveP += (9 - kd) * 0.028;
        if (opts.pen) saveP = clamp(0.24 + keeper.attrs.reflexes / 60 - placement * 0.12, 0.1, 0.45);
        if (opts.header) saveP = clamp(saveP + 0.08, 0.1, 0.95);
        outcome = this.rnd() < saveP ? 'save' : 'goal';
      }
      const catchIt = outcome === 'save' && this.rnd() < 0.3 + keeper.attrs.handling / 40;
      const speed = opts.pen ? 24 : opts.header ? 16 : clamp(17 + p.attrs.shooting * 0.45 + this.rnd() * 4, 16, 30);
      const total = dist(p.x, p.y, gx, targetY);
      const T = total / speed;
      const ang = Math.atan2(targetY - p.y, gx - p.x);
      b.owner = null; b.lastTouch = p; b.releaseT = this.t;
      b.x = p.x + Math.cos(ang) * 0.6; b.y = p.y + Math.sin(ang) * 0.6; b.z = opts.header ? 1.6 : 0.1;
      b.vx = Math.cos(ang) * speed; b.vy = Math.sin(ang) * speed;
      b.vz = (targetZ - b.z + 0.5 * G * T * T) / T;
      b.flight = {
        kind: 'shot', outcome, catchIt, shooter: p, xG: xg, goalX: gx, targetY, targetZ,
        blockDist, blocker, traveled: 0, totalDist: total, onTarget, pen: !!opts.pen, header: !!opts.header, fk: !!opts.fk
      };
      team.stats.shots++; p.stats.shots++;
      if (onTarget && outcome !== 'miss') { team.stats.onTarget++; p.stats.onTarget++; }
      team.stats.xG += xg;
      this.shotMap.push({ x: p.x, y: p.y, team: p.team, xg, outcome: blockDist != null ? 'block' : outcome, minute: this.minute() });
      this.adjust(p, 0.02);
      if (this.lastPass && this.lastPass.team === p.team && this.t - this.lastPass.t < 6) {
        this.pendingAssist = this.lastPass.player;
        this.lastPass.player.stats.keyPasses++;
      } else this.pendingAssist = null;
      if (dd > 24 && !opts.pen) this.say('longshot', { p: p.name }, { team: p.team });
      if (opts.pen) this.pendingPen = p;
      p.decisionT = 1.0;
      for (const r of this.playersCache) r.offsideFlag = false;
    }

    resolveBlock() {
      const b = this.ball, f = b.flight;
      const q = f.blocker;
      b.flight = null;
      if (this.rnd() < 0.35) {
        const dAtt = this.teams[f.shooter.team].attackDir;
        b.vx = dAtt * 7; b.vy = (this.rnd() < 0.5 ? -1 : 1) * (6 + this.rnd() * 5); b.vz = 1.5;
      } else {
        b.vx = -b.vx * 0.25 + (this.rnd() - 0.5) * 6;
        b.vy = (this.rnd() - 0.5) * 10; b.vz = 2.5;
      }
      b.lastTouch = q; b.releaseT = this.t;
      this.adjust(q, 0.12);
      this.say('block', { p: f.shooter.name, d: q.name }, { team: q.team, key: f.xG > 0.15 });
    }

    resolveShotLine(lineX) {
      const b = this.ball, f = b.flight;
      if (!f) { this.goalScored(lineX); return; }
      const p = f.shooter;
      const keeper = this.gk(this.teams[1 - p.team]);
      const inMouth = Math.abs(b.y - CY) <= GOAL_HALF && b.z <= GOAL_H;
      b.flight = null;
      if (f.outcome === 'goal' && inMouth) {
        this.goalScored(lineX);
        return;
      }
      if (f.outcome === 'save' && inMouth) {
        keeper.stats.saves++; this.teams[keeper.team].stats.saves++;
        this.adjust(keeper, 0.12 + f.xG * 0.3);
        if (f.pen) {
          this.say('penmiss', { k: keeper.name, p: p.name }, { team: keeper.team, key: true });
        } else {
          this.say(f.catchIt ? 'catch' : 'save', { p: p.name, k: keeper.name }, { team: keeper.team, key: f.xG > 0.18 });
        }
        if (f.catchIt) {
          b.x = keeper.x; b.y = keeper.y; b.z = 0; b.vx = b.vy = b.vz = 0;
          b.owner = keeper; b.lastTouch = keeper; keeper.gkHold = 0;
        } else {
          // parry
          const d = this.teams[keeper.team].attackDir;
          const side = this.rnd() < 0.5 ? -1 : 1;
          b.x = lineX + d * 1.5; b.y = CY + side * (2 + this.rnd() * 3);
          b.vx = d * (4 + this.rnd() * 5); b.vy = side * (3 + this.rnd() * 5); b.vz = 1.8;
          b.lastTouch = keeper; b.releaseT = this.t;
          if (this.rnd() < 0.6) {
            // parried behind for corner
            b.vx = -d * 3.5; b.vy = side * 8;
          }
        }
        return;
      }
      if (f.outcome === 'post' && inMouth) {
        this.say('post', { p: p.name, opp: this.teamName(1 - p.team) }, { team: p.team, key: true });
        const d = this.teams[keeper.team].attackDir;
        b.x = lineX + d * 1; b.vx = d * (6 + this.rnd() * 6); b.vy = (this.rnd() - 0.5) * 8; b.vz = 2;
        b.lastTouch = p; b.releaseT = this.t;
        return;
      }
      // miss / wide / over
      if (f.pen) {
        this.say('penmiss', { k: keeper.name, p: p.name }, { team: keeper.team, key: true });
      } else {
        this.say('miss', { p: p.name }, { team: p.team, key: f.xG > 0.18 });
      }
      this.adjust(p, -0.05);
      const defending = this.teams.find(t => (t.attackDir > 0 ? 0 : L) === lineX);
      this.startSetPiece('goalkick', defending.idx, lineX === 0 ? SIX_L - 1 : L - SIX_L + 1, CY + (this.rnd() < 0.5 ? -4 : 4));
    }

    goalScored(lineX) {
      const b = this.ball;
      const scoringTeam = this.teams.find(t => (t.attackDir > 0 ? L : 0) === lineX);
      const si = scoringTeam.idx;
      let scorer = b.lastTouch;
      let og = false;
      if (!scorer || scorer.team !== si) {
        og = scorer && scorer.team !== si;
        scorer = og ? scorer : (this.pendingAssist || scoringTeam.slots[scoringTeam.slots.length - 1].player);
      }
      scoringTeam.score++;
      const assist = (!og && this.pendingAssist && this.pendingAssist !== scorer && this.pendingAssist.team === si) ? this.pendingAssist : null;
      if (!og) {
        scorer.stats.goals++; this.adjust(scorer, 0.9);
        if (assist) { assist.stats.assists++; this.adjust(assist, 0.5); }
      } else {
        this.adjust(scorer, -0.6);
      }
      const f = b.flight;
      const xg = f ? f.xG : 0.1;
      b.flight = null; b.vx = b.vy = b.vz = 0; b.z = 0;
      b.x = lineX === 0 ? -0.6 : L + 0.6;
      b.owner = null;
      this.concedeTeam = 1 - si;
      this.phase = 'goal'; this.phaseTimer = 10.0;
      this.lastGoal = { team: si, scorer: scorer.name, assist: assist ? assist.name : null, minute: this.minute(), og, xg, pen: f && f.pen };
      // celebration targets
      const cornerX = lineX === 0 ? 4 : L - 4;
      const cornerY = scorer.y < CY ? 4 : W - 4;
      for (const s of scoringTeam.slots) {
        const p = s.player;
        if (p === scorer) { p.tx = cornerX; p.ty = cornerY; p.sprint = true; }
        else if (p.pos !== 'GK') { p.tx = cornerX + (this.rnd() - 0.5) * 8; p.ty = cornerY + (this.rnd() - 0.5) * 8; }
      }
      for (const s of this.teams[1 - si].slots) {
        const p = s.player; const h = this.homePos(p, this.teams[1 - si]);
        p.tx = h.x; p.ty = h.y;
      }
      const assistTxt = assist ? 'Assist: ' + assist.name + '.' : (f && f.pen ? 'From the penalty spot.' : '');
      if (og) this.say('og', { p: scorer.name, team: this.teamName(si) }, { team: si, player: scorer, key: true, goal: true, xg });
      else if (f && f.pen) this.say('penscore', { p: scorer.name }, { team: si, player: scorer, key: true, goal: true, xg });
      else this.say('goal', { p: scorer.name, team: this.teamName(si), a: assistTxt }, { team: si, player: scorer, key: true, goal: true, xg });
      this.pendingAssist = null;
      // snapshot replay marker
      if (this.onGoalReplay) this.onGoalReplay(this.lastGoal);
    }
  }

  const api = { Match, L, W, CX, CY, GOAL_HALF, GOAL_H, BOX_L, BOX_HALF, SIX_L, SIX_HALF, PEN };
  global.TLEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
