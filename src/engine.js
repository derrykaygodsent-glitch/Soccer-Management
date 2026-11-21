/* Touchline 26 · Classic 2D match simulation. Positions in metres, time in seconds. */
(function (global) {
  'use strict';
  const D = (typeof require !== 'undefined' && typeof window === 'undefined') ? require('./data.js') : global.TLData;

  const Z=global.TLZones||(typeof require==='function'?require('./tactical-zones'):null);
  const Mind=global.TLPlayerMind||(typeof require==='function'?require('./player-intelligence'):null);
  const delta=(p,k)=>(p?.mind?.ratings[k]??10)-10,secret=(p,k)=>(p?.mind?.hidden[k]??10)-10,habit=(p,k)=>p?.mind?.traits.includes(k);
  const P = typeof window === 'undefined' ? require('./physics.js') : global.TLPhysics;
  const AI = typeof window === 'undefined' ? require('./decisions.js') : global.TLDecisions;

  const { L, W, CX, CY, GOAL_HALF, GOAL_H, BOX_L, BOX_HALF, SIX_L, SIX_HALF, PEN, FREE_DISTANCE, THROW_DISTANCE } = typeof window === 'undefined' ? require('./pitch.js') : global.TLPitch;
  const S = typeof window === 'undefined' ? require('./setpieces.js') : global.TLSetPieces;
  const Runoff = typeof window === 'undefined' ? require('./runoff.js') : global.TLRunoff;
  const { Referee } = typeof window === 'undefined' ? require('./referee.js') : global.TLReferee;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const lerp = (a, b, t) => a + (b - a) * t;
  const DEFENSIVE_ROWS = { DC: 0, FB: 2.5, WB: 6, DM: 8.2, CM: 13.7, AM: 20.4, W: 20.8, ST: 27.6 };
  const BRAIN_TICK = .125;
  const TEMPO_HOLD = [1.23, 1, .84];
  const REVIEW_SECONDS = 5.8, AREA_CHECK_RANGE = .75;
  // The 2D model uses player centres. Keep a small level tolerance for a
  // video verdict, and a wider on-field margin for a close, unflagged run.
  const OFFSIDE_LEVEL = .035, OFFSIDE_FLAG = .33, ATTACK_CHECK_WINDOW = 21;

  const TXT = {
    goal: [
      'GOAL! {p} finishes it off for {team}! {a}',
      'GOAL! {p} finds the net! {team} erupt! {a}',
      'It\'s in! {p} scores for {team}! {a}',
      'Clinical from {p}! {team} have their goal! {a}'
    ],
    og: ['Disaster! {p} turns it into his own net! {team} lead!'],
    save: ['{p} lets fly · but what a save by {k}!', 'Brilliant stop! {k} denies {p}.', '{p} strikes it well, {k} gets down smartly.'],
    catch: ['{p} shoots, {k} gathers it comfortably.', 'Straight at {k} · {p} will be disappointed.'],
    miss: ['{p} drags it wide! Should have done better.', 'Over the bar from {p}! That was a chance.', '{p} blazes it over! The keeper watches it sail past.'],
    block: ['{p} shoots · blocked! {d} throws himself in the way.', 'A vital block from {d} as {p} pulls the trigger!'],
    post: ['OFF THE POST! {p} is inches away!', 'The woodwork rescues {opp}! {p} rattles the frame!'],
    chance: ['Big chance for {team}! {p} is through...'],
    foul: ['Foul by {p} on {v}. Free kick to {opp}.', '{p} brings down {v}. Free kick to {opp}.'],
    yellow: ['Yellow card for {p}.'],
    red: ['RED CARD! {p} is off! {team} are down to {n} men!'],
    pen: ['PENALTY! {p} brings down {v} in the box! Huge moment!'],
    penscore: ['GOAL from the spot! {p} keeps his cool!'],
    penmiss: ['SAVED! {k} guesses right and denies {p} from twelve yards!'],
    offside: ['Flag\'s up · {p} is offside. Indirect free kick to {opp}.'],
    corner: ['Corner to {team}.', '{team} win a corner · bodies forward.'],
    throwin: ['Throw-in for {team}.'],
    goalkick: ['Goal kick to {team}.'],
    freekick: ['Free kick to {team} in a promising area.'],
    sub: ['{team} make a change: {on} replaces {off}.'],
    kickoff: ['We\'re underway at {stadium}!', 'Second half underway!'],
    ht: ['Half time. {h} {hs} - {as} {a}.'],
    ft: ['Full time! {h} {hs} - {as} {a}.'],
    stoppage: ['{n} minutes of added time.'],
    tackle: ['{p} wins it back with a strong challenge.'],
    cross: ['{p} whips a dangerous ball into the box!'],
    header: ['{p} rises highest · header!'],
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
      this.season = !!opts.lineups;
      this.injuryRnd = this.season ? D.mulberry32(this.seed ^ 0x2e95160b) : null;
      this.possessionTurn = -Infinity;
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
      this.referee = new Referee();
      this.restartId = 0;
      this.setpiece = this.lastRestart = null;
      this.review = this.attackCheck = null;
      this.reviewTime = [0, 0];
      this.lastPass = null;
      this.teams = [homeClub, awayClub].map((club, i) => {
        // Supplied career players are copied: match fatigue and cards must not mutate the world database.
        const players = opts.squads?.[i] ? JSON.parse(JSON.stringify(opts.squads[i])) : D.genSquad(club, D.seedFor(club.id));
        const tactics = (i === 0 ? opts.homeTactics : opts.awayTactics) || D.defaultTactics(club.style);
        let { xi, bench } = D.bestXI(players, tactics.formation);
        if(opts.selectStarters){const chosen=opts.selectStarters(club.name,players,xi);if(chosen!==xi){const incoming=chosen.find(v=>!xi.some(o=>o.player.id===v.player.id)).player,outgoing=xi.find(v=>!chosen.some(o=>o.player.id===v.player.id)).player;bench=bench.map(p=>p.id===incoming.id?outgoing:p);xi=chosen;}}
        const lineup = opts.lineups?.[i];
        if (lineup) {
          const by = Object.fromEntries(players.map(p => [p.id, p]));
          xi = lineup.xi.map(({player, ...slot}) => ({...slot, player:by[player.id]}));
          bench = lineup.bench.map(p => by[p.id]);
          for (const p of players) {
            if (lineup.numbers?.[p.id]) p.num = lineup.numbers[p.id];
            else p.num = lineup.xi.find(s=>s.player.id===p.id)?.player.num ?? lineup.bench.find(q=>q.id===p.id)?.num ?? p.num;
            p.appeared = false;
          }
        }
        const team = {
          starterIds:xi.map(slot=>slot.player.id), idx: i, club, players, tactics: { ...tactics }, bench,
          // Seat numbers stay put when the incoming player swaps with the outgoing one.
          dugout: bench.map(p => ({ id: p.id, used: false })),
          listed: lineup ? new Set(bench.map(p=>p.id)) : null, assignments: lineup?.set || null, familiarity:lineup?.familiarity||{},
          slots: xi.map(s => ({ ...s })),
          attackDir: i === 0 ? 1 : -1,
          subsUsed: 0, score: 0,
          stats: { shots: 0, onTarget: 0, xG: 0, passes: 0, passWon: 0, tackles: 0, fouls: 0, corners: 0, offsides: 0, saves: 0, yellow: 0, red: 0, possession: 0 }
        };
        players.forEach(p => {
          if(opts.playerIntelligence){p.mind=Mind.match(p,this.seed);p.iq=p.mind.ratings;}
          p.team = i; p.onPitch = false;
          p.x = 0; p.y = 0; p.vx = 0; p.vy = 0; p.tx = 0; p.ty = 0;
          p.decisionT = 0; p.tackleT = 0; p.stunT = 0; p.contactT = 0; p.runT = 2 + this.rnd() * 6; p.runUntil = 0; p.running = 0;
          p.offsideFlag = false; p.cond = (lineup?.fitness?.[p.id] ?? 100) / 100; p.dir = 0; p.dribPhase = this.rnd() * 6;
          if (lineup?.focus === 'set') p.attrs = {...p.attrs, freeKicks:Math.min(20,p.attrs.freeKicks+1), passing:Math.min(20,p.attrs.passing+1)};
          if (lineup?.focus === 'shape') p.attrs = {...p.attrs, positioning:Math.min(20,p.attrs.positioning+1)};
          p.holding = false; p.sprint = false;
          p.reading = AI.profile(p, D.seedFor(p.id));
          p.runSince = p.receivedAt = -Infinity; p.quickControl = false; p.ballPlan = p.releasePlan = null;
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

    // Under pressure the ball can arrive across the body, forcing a weaker-foot contact.
    footCost(p,pressure,fallbackSide=0){const bio=p.assignment?.foot;if(!bio)return 0;
      const lateral=(this.ball.y-p.y)*this.teams[p.team].attackDir;
      const side=Math.abs(lateral)>.16?Math.sign(lateral):fallbackSide;
      if(!side||(side>0?'Right':'Left')===bio.foot)return 0;
      return (5-bio.weak)/4*clamp((5-pressure)/4,0,1);}
    careerAssignment(p,slot,team) {
      const name=slot.job?.[0],spec=Z?.jobs[name];if(!spec)return;
      const pos=slot.position||Z.zone(slot.x,slot.y,slot.role==='GK'),reps=team.familiarity[p.id];
      p.assignment={pos,name,spec,scheme:slot.scheme,rehearsal:Math.min(1,(reps?.[slot.scheme]||0)/20),response:slot.response||{},foot:Z.identity(p),footFit:Z.footFactor(p,pos,name),familiarity:Z.familiarity(p,pos,reps)};
      p.reps=reps?.[name]||0;p.iq=p.mind?.ratings||Z.intelligence(p);p.roleSkill=.45+Z.fit(p,pos,name,reps)/150;
    }
    assignSlot(p, slot, team) {
      p.onPitch = true; p.role = slot.role; p.slotX = slot.x; p.slotY = slot.y; p.teamRef = team;p.attackSlot=slot.attack;p.reps=slot.experience||0;this.careerAssignment(p,slot,team);
      if (team.listed) { p.appeared = true; p.job = slot.job?.[0]; p.duty = slot.job?.[2]; }
      const h = this.homePos(p, team);
      p.x = h.x; p.y = h.y; p.tx = h.x; p.ty = h.y;
    }

    homePos(p, team) {
      const d = team.attackDir;
      const x = d > 0 ? p.slotX * L : L - p.slotX * L;
      const widthF = team.tactics.fine?.width!=null?.79+.21*team.tactics.fine.width:[0.78,1,1.2][team.tactics.width];
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
      const ev = { type, elapsed: this.elapsed, t: this.t, half: this.half, minute: this.minute(), clock: this.clockStr(), ...data };
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
      this.possessionTurn=-Infinity;for(const t of this.teams)t.backPassAt=-Infinity;this.controlTeam = teamIdx; this.lastPass = null; this.brainIn = 0;
      this.setpiece = this.lastRestart = this.review = this.attackCheck = null;
      this.shapeX = CX; this.shapeY = CY;
      for (const team of this.teams) team.seenLine = null;
      const b = this.ball;
      Object.assign(b, { x: CX, y: CY, z: 0, vx: 0, vy: 0, vz: 0, ax: 0, ay: 0, bounces: 0, flight: null, lastTouch: null, offside: null, restart: null });
      this.playersCache = this.onPitchPlayers();
      for (const p of this.playersCache) {
        const team = this.teams[p.team], d = team.attackDir, home = this.homePos(p, team);
        const depth = d > 0 ? home.x : L - home.x;
        const lined = depth < 38 ? depth : Math.min(CX - 2.45, 38 + (depth - 38) * .296);
        p.tx = d > 0 ? lined : L - lined; p.ty = home.y;
        p.kickoffHold = true; p.sprint = afterGoal; p.offsideFlag = false; p.offsideGap = null; p.spRole = null;
        p.running = 0; p.runUntil = this.elapsed; p.runT = this.elapsed + 2 + this.rnd() * 9;
        p.ballPlan = p.releasePlan = null; p.receivedAt = -Infinity; p.quickControl = false;
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
      this.referee = new Referee(this.elapsed, -1);
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
      const previous = team.listed ? new Map(team.slots.map(s=>[s.player.id,s])) : null;
      const on = team.slots.map(s => s.player).filter(p => p.onPitch && !p.red);
      const xi = (this.optimizeXI&&on.length===11) ? this.optimizeXI(on,team.tactics.formation) : D.bestXI(on,team.tactics.formation).xi;
      team.slots = xi.map(s => {
        const before=previous?.get(s.player.id);
        return before?.role===s.role&&before.job?{...s,job:before.job}:{...s};
      });
      team.slots.forEach(s => { s.player.role = s.role; s.player.slotX = s.x; s.player.slotY = s.y; if(team.listed) {s.player.job=s.job?.[0]; s.player.duty=s.job?.[2];} });
      this.playersCache = this.onPitchPlayers(); this.brainIn = 0;
    }

    substitute(ti, outId, inId) {
      const team = this.teams[ti];
      if (this.phase === 'review') return { ok: false, msg: 'Wait for the VAR decision before making a substitution.' };
      if (team.subsUsed >= 5) return { ok: false, msg: 'No substitutions remaining.' };
      const slot = team.slots.find(s => s.player.id === outId);
      const np = team.players.find(p => p.id === inId);
      if (!slot || !np) return { ok: false, msg: 'Invalid substitution.' };
      if (np.onPitch || np.red || (team.listed && (!team.listed.has(np.id) || np.appeared))) return { ok: false, msg: 'Player not available from the submitted bench.' };
      if (this.season && this.phase === 'fulltime') return { ok:false, msg:'Substitutions are only available during the match.' };
      const old = slot.player;
      const sp = this.setpiece;
      if (sp?.offender === old && (sp.card || sp.cards.length)) return { ok: false, msg: 'Wait for the referee to finish dealing with the foul.' };
      if (sp?.taker === old && (sp.stage === 'windup' || sp.stage === 'runup')) return { ok: false, msg: 'The restart is already being taken.' };
      if ((slot.role === 'GK') !== (np.pos === 'GK')) return { ok: false, msg: 'Choose a replacement for the same position type (keeper or outfield).' };
      old.onPitch = false;
      np.onPitch = true; if (!team.listed) np.cond = 1; np.rating = 6.5;
      if (team.listed) { np.appeared = true; np.job = slot.job?.[0]; np.duty = slot.job?.[2]; }
      np.x = np.prevX = old.x; np.y = np.prevY = old.y; np.vx = old.vx; np.vy = old.vy;
      np.tx = old.tx; np.ty = old.ty; np.dir = old.dir; np.spRole = old.spRole; np.kickoffHold = old.kickoffHold;
      np.attackSlot=slot.attack;np.reps=0;this.careerAssignment(np,slot,team);np.role = slot.role; np.slotX = slot.x; np.slotY = slot.y; np.teamRef = team;
      np.decisionT = 0; np.tackleT = 0; np.stunT = 0; np.runT = 3; np.running = 0; np.contactT = 0; np.runUntil = 0; np.offsideFlag = false; np.holding = false;
      np.ballPlan = np.releasePlan = null; np.runSince = np.receivedAt = -Infinity; np.quickControl = false;
      np.offsideFlag = old.offsideFlag; np.offsideGap = old.offsideGap;
      slot.player = np;
      if (this.kickoffTaker === old) this.kickoffTaker = np;
      if (sp?.taker === old) sp.taker = np;
      if (sp?.throwPlan?.target === old) sp.throwPlan.target = np;
      if (sp?.wall?.includes(old)) sp.wall = sp.wall.map(p => p === old ? np : p);
      team.bench = team.players.filter(p => !p.onPitch && !p.red && (!team.listed || (team.listed.has(p.id) && !p.appeared)));
      team.dugout = team.dugout.map(seat => seat.id === np.id ? { id: old.id, used: !!team.listed } : seat);
      team.subsUsed++;
      if (this.ball.owner === old) { this.ball.owner = np; this.ball.lastTouch = np; }
      this.playersCache = this.onPitchPlayers(); this.brainIn = 0;
      this.say('sub', { team: this.teamName(ti), on: np.name, off: old.name }, { team: ti, key: true });
      return { ok: true };
    }

    sendOff(p, reason, announce = true) {
      p.red = true; p.onPitch = false;
      const team = this.teams[p.team];
      team.stats.red++;
      this.adjust(p, -0.8);
      team.slots = team.slots.filter(s => s.player !== p);
      this.reassignFormation(p.team);
      team.bench = team.players.filter(pp => !pp.onPitch && !pp.red && (!team.listed || (team.listed.has(pp.id) && !pp.appeared)));
      if (this.ball.owner === p) this.ball.owner = null;
      const n = team.slots.length;
      if (announce) this.say('red', { p: p.name, team: this.teamName(p.team), n }, { team: p.team, player: p, key: true, reason });
    }

    adjust(p, d) { p.rating = clamp(p.rating + d, 4.0, 10.0); }

    /* ---------------- set pieces ---------------- */

    startSetPiece(type, teamIdx, x, y, extra = {}, departure = null) {
      const team = this.teams[teamIdx], opp = this.teams[1 - teamIdx], d = team.attackDir;
      const gx = d > 0 ? L : 0, b = this.ball;
      x = clamp(x, .3, L - .3);
      y = type === 'throwin' ? (y < CY ? 0 : W) : clamp(y, .3, W - .3);
      if (type === 'penalty') { x = gx - d * PEN; y = CY; }
      if (type === 'freekick' && extra.indirect && Math.abs(gx - x) < SIX_L && Math.abs(y - CY) < SIX_HALF) x = gx - d * SIX_L;
      Object.assign(b, { x, y, z: 0, vx: 0, vy: 0, vz: 0, ax: 0, ay: 0, bounces: 0, owner: null, flight: null, offside: null, restart: null });
      this.phase = type; this.brainIn = 0; this.lastPass = this.attackCheck = this.lastRestart = null;
      const outfield = team.slots.map(s => s.player).filter(p => p.role !== 'GK');
      const shape = type === 'freekick' ? S.freeKickShape(b, d, !!extra.indirect) : null;
      const cards = extra.cards || [];
      const near = S.byDistance(outfield, b);
      const key = type === 'corner' ? ((y < CY) === (d > 0) ? 'cornerL' : 'cornerR') : type;
      const named = outfield.find(p => p.id === team.assignments?.[key] && !p.injury);
      const quick = shape && !named && !extra.reviewed && !cards.length ? this.quickFreeKick(team, near, shape) : null;
      let taker;
      if (type === 'goalkick') taker = this.gk(team);
      else if (type === 'penalty') taker = extra.taker || this.bestPenaltyTaker(team);
      else if (named) taker = named;
      else if (quick) taker = quick;
      else {
        const worth = p => type === 'throwin' ? delta(p,'longThrows')*.42+p.attrs.throwing * .27 + (Math.abs(gx - x) < 25 && team.tactics.passing !== 0 ? p.attrs.throwPower * .46 : 0) + (p.role === 'FB' ? 1.55 : 0)
          : shape?.shotLane ? p.attrs.freeKicks * 1.30 + p.attrs.composure * .39
          : type === 'corner' || shape?.wide ? delta(p,type==='corner'?'corners':'crossing')*.65+p.attrs.passing * 1.53 + p.attrs.freeKicks * .40 : p.attrs.passing * .22;
        taker = S.byDistance(outfield, b, worth)[0] || this.gk(team);
      }
      const sp = this.setpiece = { ...extra, id: ++this.restartId, type, team: teamIdx, taker, x, y, awardedAt: this.elapsed,
        shape, direct: type === 'freekick' && !extra.indirect, wide: !!shape?.wide, shotLane: !!shape?.shotLane, dangerous: !!shape?.dangerous,
        quick: !!quick, managed: type === 'penalty' || (!!shape && !quick && (shape.wall.length > 0 || cards.length > 0 || extra.reviewed)),
        stage: 'setup', wall: [], cards };
      const delay = type === 'penalty' ? 7.8 : type === 'corner' ? 6.2 : type === 'throwin' ? 1.6
        : type === 'freekick' ? (sp.quick ? .9 : sp.managed ? 5.6 : 3.35) : 3.1;
      this.phaseTimer = delay + this.choiceRnd() * (sp.quick ? .5 : 1.05);
      if (departure) sp.runoff = Runoff.start(departure, sp, this.phaseTimer);
      for (const p of this.playersCache) {
        p.spRole = p.ballPlan = p.releasePlan = null;
        p.offsideFlag = p.sprint = false; p.offsideGap = null;
        // A dead ball doesn't instantly reset either team to its team sheet.
        const h = this.homePos(p, this.teams[p.team]), weight = sp.quick || type === 'throwin' ? .04 : .22;
        p.tx = lerp(clamp(p.x + p.vx * .23, .35, L - .35), h.x, weight);
        p.ty = lerp(clamp(p.y + p.vy * .23, .35, W - .35), h.y, weight);
      }
      if (type === 'corner' || (!sp.quick && sp.wide)) this.arrangeDelivery(sp, team, opp);
      if (sp.managed && shape?.wall.length) this.arrangeWall(sp, opp);
      if (type === 'throwin') this.arrangeThrow(sp, team, opp);
      if (type === 'penalty') this.arrangePenalty(sp, opp);
      if (sp.offender && sp.cards.length) {
        const p = sp.offender;
        p.tx = clamp(sp.incident.x - d * 1.6, .35, L - .35);
        p.ty = clamp(sp.incident.y + (sp.incident.y < 9 ? 2.9 : -2.9), .35, W - .35);
        p.spRole = 'booked';
      }
      this.stationTaker(sp, d);
      this.clearRestartSpace(sp);
      return sp;
    }

    quickFreeKick(team, near, shape) {
      const b = this.ball, p = near.find(q => q.stunT < .15);
      if (!p || dist(b.x, b.y, p.x, p.y) > 2.8) return null;
      const option = this.freeKickPasses(p, true).sort((a, b2) => b2.score - a.score)[0];
      if (!option || option.risk > .85 || option.opening < 2.25) return null;
      const need = AI.gameNeed(team.score - this.teams[1 - team.idx].score, this.minute());
      const go = .40 + (team.tactics.tempo - 1) * .13 + need * .15 + (p.attrs.composure - 12) * .016
        + clamp(option.gain * .016, -.10, .22) - (shape.shotLane ? .43 : shape.dangerous ? .17 : 0);
      return this.choiceRnd() < clamp(go, .035, .83) ? p : null;
    }

    arrangeDelivery(sp, team, opp) {
      const d = team.attackDir, gx = d > 0 ? L : 0, near = sp.y < CY ? -1 : 1;
      const spots = [
        { x: gx - d * 10, y: CY + near * 3 }, { x: gx - d * 7, y: CY - near * 3.5 },
        { x: gx - d * 12, y: CY + near * 6.2 }, { x: gx - d * 15, y: CY - near * 7 }
      ];
      const pool = this.playersCache.filter(p => p.team === team.idx && p !== sp.taker && p.role !== 'GK');
      const outlet = S.byDistance(pool.filter(p => !['DC', 'ST'].includes(p.role)), sp)[0];
      if (outlet && dist(outlet.x, outlet.y, sp.x, sp.y) <= 22) {
        outlet.tx = clamp(sp.x - d * 7.8, 1.5, L - 1.5); outlet.ty = sp.y - near * 3.85; outlet.spRole = 'outlet';
      }
      const runners = pool.filter(p => !p.spRole && ['ST', 'DC', 'AM', 'CM', 'W'].includes(p.role))
        .sort((a, b) => (b.attrs.positioning + b.attrs.shooting - a.attrs.positioning - a.attrs.shooting));
      const count = clamp(2 + team.tactics.mentality - +(opp.tactics.line === 2), 2, spots.length);
      const defenders = this.playersCache.filter(p => p.team === opp.idx && p.role !== 'GK' && p !== sp.offender);
      spots.slice(0, count).forEach((spot, i) => {
        const p = runners[i]; if (!p) return;
        p.tx = spot.x; p.ty = spot.y; p.spRole = 'box';
        const mark = { x: spot.x + d * (opp.tactics.line === 2 ? .76 : 1.79), y: spot.y + near * .82 };
        const q = S.byDistance(defenders.filter(q => !q.spRole), mark, q => q.attrs.positioning * .24 + (q.role === 'DC' ? 2.3 : 0))[0];
        if (q) { q.tx = mark.x; q.ty = mark.y; q.spRole = 'boxdef'; }
      });
      const keeper = this.gk(opp);
      if (keeper) { keeper.tx = gx - d * 1.54; keeper.ty = CY + near * 1.32; }
    }

    arrangeWall(sp, opp) {
      const { shape, x, y } = sp, gx = opp.attackDir > 0 ? 0 : L;
      sp.wall = [];
      const pool = this.playersCache.filter(p => p.team === opp.idx && p.role !== 'GK' && !(p === sp.offender && (sp.cards.length || sp.card)));
      for (const spot of shape.wall) {
        const q = S.byDistance(pool.filter(p => !sp.wall.includes(p)), spot, p => p.attrs.positioning * .29 + p.attrs.composure * .18 - (p.spRole === 'boxdef' ? 2.2 : 0))[0];
        if (!q) break;
        q.tx = spot.x; q.ty = spot.y; q.spRole = 'wall'; sp.wall.push(q);
      }
      const keeper = this.gk(opp);
      if (keeper && sp.wall.length) { keeper.tx = gx + opp.attackDir * (Math.abs(gx - x) < FREE_DISTANCE ? 0 : .86); keeper.ty = shape.keeperY; }
    }

    arrangeThrow(sp, team, opp) {
      const d = team.attackDir, inward = sp.y === 0 ? 1 : -1, depth = CX + (sp.x - CX) * d;
      const pool = this.playersCache.filter(p => p.team === team.idx && p !== sp.taker && p.role !== 'GK');
      const distance = S.throwReach(sp.taker);
      const options = [
        { dx: -6.2, dy: 4.6 }, { dx: 4.9, dy: 7.4 }, { dx: 12.8, dy: 3.5 }
      ];
      if (depth >= 79 && distance > 22.5) options.push({ dx: clamp(96 - depth, -6.3, 16.4), dy: 20.1 });
      const defenders = this.playersCache.filter(p => p.team === opp.idx && p.role !== 'GK');
      for (const { dx, dy } of options) {
        const spot = { x: clamp(sp.x + d * dx, 1.8, L - 1.8), y: sp.y + inward * dy };
        const q = S.byDistance(pool.filter(p => !p.spRole), spot, p => p.attrs.positioning * .16)[0];
        if (!q || dist(q.x, q.y, spot.x, spot.y) > 24) continue;
        q.tx = spot.x; q.ty = spot.y; q.spRole = 'offer';
        const mark = S.byDistance(defenders.filter(p => !p.spRole), spot, p => p.attrs.positioning * .15)[0];
        if (!mark || dist(mark.x, mark.y, spot.x, spot.y) > 16 + opp.tactics.press * 3) continue;
        mark.tx = clamp(spot.x + d * (dx < 0 ? -2 : 1.9), 1.1, L - 1.1);
        mark.ty = clamp(spot.y + inward * ([3.0, 1.8, 1.15][opp.tactics.press]), 1.1, W - 1.1);
        mark.spRole = 'mark';
      }
    }

    arrangePenalty(sp, opp) {
      const keeper = this.gk(opp), d = -opp.attackDir, gx = d > 0 ? L : 0;
      if (keeper) { keeper.tx = gx; keeper.ty = CY; keeper.spRole = 'linekeeper'; }
      for (const p of this.playersCache) if (p !== sp.taker && p !== keeper) {
        const h = this.homePos(p, this.teams[p.team]);
        p.ty = lerp(p.y, h.y, .31);
        const fromCentre = Math.abs(p.ty - CY);
        const back = Math.max(fromCentre <= BOX_HALF + .65 ? BOX_L - PEN + .9 : .92, Math.sqrt(Math.max(0, 10.1 ** 2 - fromCentre ** 2)));
        p.tx = sp.x - d * Math.max(back, (sp.x - p.tx) * d);
      }
    }

    stationTaker(sp, attack) {
      const { taker, type, x, y } = sp;
      taker.spRole = 'taker';
      if (type === 'throwin') {
        taker.tx = x; taker.ty = y === 0 ? -.53 : W + .53; return;
      }
      const gx = attack > 0 ? L : 0;
      const forward = type === 'corner' ? 0 : (gx - x);
      const across = type === 'corner' || sp.wide || sp.shotLane ? CY - y : 0;
      const gap = Math.hypot(forward, across) || 1;
      const run = sp.quick ? .52 : type === 'penalty' ? 2.95 : type === 'corner' ? 1.54 : (sp.shotLane || sp.wide) ? 2.36 : 1.18;
      sp.approach = { x: clamp(x - forward / gap * run, -.85, L + .85), y: clamp(y - across / gap * run, -.85, W + .85) };
      taker.tx = sp.approach.x; taker.ty = sp.approach.y;
    }

    onGoalLine(p, x = p.x, y = p.y) {
      return Math.abs(x - (this.teams[p.team].attackDir > 0 ? 0 : L)) < .12 && Math.abs(y - CY) < GOAL_HALF;
    }

    keepRestartDistance(p, x, y, min, lineException = false) {
      const tx = clamp(p.tx, .28, L - .28), ty = clamp(p.ty, .28, W - .28);
      if (dist(tx, ty, x, y) >= min || (lineException && this.onGoalLine(p, p.tx, p.ty))) return;
      const angle = Math.atan2(ty - y, tx - x);
      let best = null, cost = Infinity;
      for (const turn of [0, .22, -.22, .43, -.43, .7, -.7, 1.06, -1.06, 1.47, -1.47, 1.9, -1.9, 2.52, -2.52, Math.PI]) {
        const a = angle + turn, xx = x + Math.cos(a) * min, yy = y + Math.sin(a) * min;
        if (xx < .28 || xx > L - .28 || yy < .28 || yy > W - .28) continue;
        let merit = Math.abs(turn) * .75;
        for (const q of this.playersCache) if (q !== p) merit += Math.max(0, 1.95 - dist(xx, yy, q.tx, q.ty)) * 1.2;
        if (merit < cost) { best = { x: xx, y: yy }; cost = merit; }
      }
      if (best) { p.tx = best.x; p.ty = best.y; }
    }

    clearRestartSpace(sp) {
      const { type, team, x, y } = sp, defendingKick = this.canHandle(sp.taker, sp);
      const cx = type === 'corner' ? (x < CX ? 0 : L) : x;
      const cy = type === 'corner' ? (y < CY ? 0 : W) : y;
      for (const p of this.playersCache) {
        if (p === sp.taker || p.spRole === 'booked') continue;
        if (type === 'penalty' && p.spRole !== 'linekeeper') {
          const d = this.teams[team].attackDir, dy = Math.abs(p.ty - CY);
          const back = Math.max(dy <= BOX_HALF + .4 ? BOX_L - PEN + .85 : .9, Math.sqrt(Math.max(0, 10.05 ** 2 - dy ** 2)));
          p.tx = d > 0 ? Math.min(p.tx, x - back) : Math.max(p.tx, x + back);
        }
        if (p.team === team) {
          if (sp.wall.length >= 3) for (const w of sp.wall) this.keepRestartDistance(p, w.tx, w.ty, 2.35);
          continue;
        }
        if (type === 'throwin') this.keepRestartDistance(p, x, y, THROW_DISTANCE + .65);
        if (type === 'corner') this.keepRestartDistance(p, cx, cy, FREE_DISTANCE + .88);
        if (type === 'freekick' && p.spRole !== 'wall') this.keepRestartDistance(p, x, y, FREE_DISTANCE + .90, true);
        if (type === 'goalkick' || (type === 'freekick' && defendingKick)) {
          const d = this.teams[team].attackDir;
          if (Math.abs(p.ty - CY) <= BOX_HALF + .46) p.tx = d > 0 ? Math.max(p.tx, BOX_L + .7) : Math.min(p.tx, L - BOX_L - .7);
        }
      }
    }

    restartSpaceReady(sp) {
      const { type, team, x, y } = sp;
      const opp = this.teams[1 - team], d = this.teams[team].attackDir;
      if (sp.quick) return true; // opponents may still be retreating; the ball is live after the kick
      if (type === 'penalty') {
        const keeper = this.gk(opp);
        return (!keeper || this.onGoalLine(keeper)) && this.playersCache.every(p => p === sp.taker || p === keeper
          || ((p.x - x) * d <= 0 && this.areaMargin(p.x, p.y, opp) < 0 && dist(p.x, p.y, x, y) >= FREE_DISTANCE));
      }
      if (sp.wall.some(p => dist(p.x, p.y, p.tx, p.ty) > .57)) return false;
      const defendingKick = type === 'goalkick' || (type === 'freekick' && this.canHandle(sp.taker, sp));
      const cx = type === 'corner' ? (x < CX ? 0 : L) : x, cy = type === 'corner' ? (y < CY ? 0 : W) : y;
      return this.playersCache.every(p => {
        if (p.team === team) return sp.wall.length < 3 || sp.wall.every(q => dist(q.x, q.y, p.x, p.y) >= 1);
        if (defendingKick && this.areaMargin(p.x, p.y, this.teams[team]) >= 0) return false;
        const gap = dist(p.x, p.y, cx, cy);
        if (type === 'throwin') return gap >= THROW_DISTANCE;
        return type === 'goalkick' || gap >= FREE_DISTANCE || (type === 'freekick' && this.onGoalLine(p));
      });
    }

    bestPenaltyTaker(team) {
      const pool = team.slots.map(s => s.player).filter(p => p.role !== 'GK');
      const skill = p => p.attrs.penalties * .68 + p.attrs.composure * .21 + p.attrs.shooting * .11 - (1 - p.cond) * 2.1;
      return pool.find(p=>p.id===team.assignments?.penalty&&!p.injury) || pool.sort((a, b) => skill(b) - skill(a))[0] || this.gk(team);
    }

    progressDiscipline(sp) {
      if (sp.card) {
        if (this.elapsed < sp.card.until) return true;
        if (sp.card.kind === 'red') {
          this.sendOff(sp.offender, sp.card.reason, false);
          this.emit('dismissed', { team: sp.offender.team, player: sp.offender });
          const opp = this.teams[1 - sp.team];
          if (sp.type === 'penalty') this.arrangePenalty(sp, opp);
          else if (sp.shape.wall.length) this.arrangeWall(sp, opp);
        }
        sp.card = null;
        if (!sp.cards.length && sp.offender.onPitch) {
          sp.offender.spRole = null;
          this.clearRestartSpace(sp);
        }
      }
      if (!sp.cards.length) return false;
      const p = sp.offender, ref = this.referee.current;
      if (this.elapsed - sp.awardedAt < 1.75 || dist(ref.x, ref.y, p.x, p.y) > 4.1) return true;
      const card = sp.cards.shift(), team = this.teams[p.team];
      sp.card = { ...card, until: this.elapsed + (card.kind === 'red' ? 2.45 : 1.95) };
      if (card.kind === 'yellow') {
        p.yellow++; team.stats.yellow++; this.adjust(p, -.20);
        this.say('yellow', { p: p.name }, { team: p.team, player: p, key: true, restartId: sp.id });
      } else {
        this.say('red', { p: p.name, team: this.teamName(p.team), n: team.slots.length - 1 }, { team: p.team, player: p, key: true, reason: card.reason, restartId: sp.id });
      }
      return true;
    }

    advanceSetPiece(h) {
      const sp = this.setpiece;
      if (!sp) { this.phase = 'open'; return; }
      Runoff.advance(sp.runoff, h);
      const d = this.teams[sp.team].attackDir, p = sp.taker;
      if (this.progressDiscipline(sp)) return;
      if (sp.stage === 'windup') {
        if (!this.restartSpaceReady(sp)) { sp.readyAt += h; return; }
        const load = clamp((this.elapsed - sp.readyAt) / sp.windup, 0, 1);
        const inward = sp.y === 0 ? 1 : -1;
        this.ball.x = sp.x; this.ball.y = sp.y - inward * (.52 + Math.sin(load * Math.PI) * .36) * (1 - load);
        this.ball.z = lerp(1.30, sp.releaseHeight, load) + Math.sin(load * Math.PI) * .34;
        if (load >= 1) this.executeSetPiece();
        return;
      }
      if (this.phaseTimer > 0) return;
      if (sp.type === 'throwin') {
        // Wait for the actual feet at the touchline, not a global phase timer.
        if (dist(p.x, p.y, p.tx, p.ty) > .28 || Math.hypot(p.vx, p.vy) > .47 || !this.restartSpaceReady(sp)) return;
        sp.throwPlan = S.chooseThrow(this, sp);
        p.dir = Math.atan2(sp.throwPlan.y - p.y, sp.throwPlan.x - p.x);
        sp.stage = 'windup'; sp.readyAt = this.elapsed;
        sp.windup = sp.throwPlan.kind === 'long' ? 1.24 : .95 + (20 - p.attrs.throwing) * .012;
        sp.releaseHeight = 1.98 + p.attrs.throwPower * .008;
        return;
      }
      if (sp.stage === 'setup') {
        if (dist(p.x, p.y, sp.approach.x, sp.approach.y) > (sp.quick ? 1.18 : .72) || !this.restartSpaceReady(sp)) return;
        if (sp.managed) {
          const o = this.referee.pocket(sp, d), a = this.referee.current;
          if (dist(o.x, o.y, a.x, a.y) > 3.25) return;
          this.emit('restartwhistle', { restartId: sp.id, restart: sp.type, team: sp.team });
        }
        sp.stage = 'runup'; sp.readyAt = this.elapsed;
      }
      if (this.elapsed - sp.readyAt < (sp.managed ? .58 : 0)) return;
      p.tx = sp.x; p.ty = sp.y; p.sprint = true;
      if (dist(p.x, p.y, sp.x, sp.y) <= .89 && this.restartSpaceReady(sp)) this.executeSetPiece();
    }

    doThrow(sp) {
      const b = this.ball, p = sp.taker, aim = sp.throwPlan || S.chooseThrow(this, sp);
      const long = aim.kind === 'long', line = aim.kind === 'line';
      const scatter = (1-delta(p,'longThrows')*.023)*(.22 + aim.distance * .049) * (1.54 - p.attrs.throwing * .046) * (1 + (1 - p.cond) * .56);
      let x = clamp(aim.x + (this.rnd() * 2 - 1) * scatter, .66, L - .66);
      let y = clamp(aim.y + (this.rnd() * 2 - 1) * scatter, 1.25, W - 1.25);
      const dd = dist(sp.x, sp.y, x, y), limit = Math.min(29.8, S.throwReach(p));
      if (dd > limit) { x = lerp(sp.x, x, limit / dd); y = lerp(sp.y, y, limit / dd); }
      const seconds = long ? clamp(.64 + dd * .045, 1.43, 1.91) : line ? clamp(.65 + dd * .041, 1.12, 1.67) : clamp(.48 + dd * .043, .6, 1.06);
      b.z = sp.releaseHeight ?? 1.98 + p.attrs.throwPower * .008;
      const target = P.overarm(b, x, y, seconds, long ? 1.54 : line ? .72 : .28, S.throwSpeed(p));
      const f = b.flight = { kind: 'throw', technique: 'throw', style: aim.kind, team: p.team, from: p, intended: aim.target, offsideCheck: false,
        targetX: target.x, targetY: target.y, totalDist: dist(b.x, b.y, target.x, target.y), travelTime: target.duration };
      b.owner = null; b.lastTouch = p; b.releaseT = this.elapsed;
      p.dir = Math.atan2(y - sp.y, x - sp.x); p.ballPlan = p.releasePlan = null; p.holding = false; p.decisionT = .44;
      this.deliveryReleased(p, f);
    }

    freeKickPasses(p, quick) {
      return this.passOptions(p, { maxDist: quick ? 25 : 44, restart: true }).filter(o => !quick || (o.dist <= 25 && ['ground', 'through'].includes(o.technique)));
    }

    chooseFreeKick(sp) {
      const p = sp.taker, team = this.teams[sp.team], d = team.attackDir;
      const need = AI.gameNeed(team.score - this.teams[1 - team.idx].score, this.minute());
      const style = team.tactics.passing - 1;
      const options = this.freeKickPasses(p, sp.quick).map(pass => ({ kind: 'pass', pass, score: .42 + pass.score * .31 }));
      if (!sp.quick && sp.dangerous && (sp.wide || sp.indirect)) {
        const delivery = this.crossOption(p);
        if (delivery) options.push({ kind: 'cross', delivery, score: .60 + delivery.merit * .59 + style * .055 + need * .07 });
      }
      if (sp.shotLane && !sp.quick) {
        const { range, angle } = sp.shape;
        const shot = .985 - (range - 18) * .026 - angle * .24 + (p.attrs.freeKicks - 13) * .033 + need * .078 + (team.tactics.mentality - 2) * .037;
        options.push({ kind: 'shot', score: shot });
      }
      const prefer = {'Look for a shot':'shot','Look for a delivery':'cross'}[team.tactics.club?.free];
      if (prefer) for (const o of options) if (o.kind===prefer) o.score += .45;
      const action = AI.pick(options, this.choiceRnd, .19 + (16 - p.attrs.composure) * .004);
      if (action?.kind === 'shot') this.doShot(p, { fk: true, wall: sp.wall });
      else if (action?.kind === 'cross') this.doCross(p, false, action.delivery);
      else if (action?.kind === 'pass') this.doPassTo(p, action.pass);
      else if (sp.quick) {
        // A lane can close during the short approach. Put the kick in nearby
        // space rather than switching to an unprepared 50-metre delivery.
        const tx = clamp(sp.x + d * 7, .5, L - .5), ty = lerp(sp.y, CY, .20);
        this.deliveryReleased(p, this.kick(p, tx, ty, { kind: 'pass', technique: 'ground', offsideCheck: true }, { arrival: 4.8 }));
      } else if (sp.wide) this.doCross(p);
      else this.doLongBall(p);
    }

    executeSetPiece() {
      const sp = this.setpiece; if (!sp) { this.phase = 'open'; return; }
      const team = this.teams[sp.team], taker = sp.taker, b = this.ball;
      b.x = sp.x; b.y = sp.y; b.owner = taker; b.lastTouch = taker;
      const outlet = this.playersCache.find(p => p.team === sp.team && p.spRole === 'outlet');
      for (const p of this.playersCache) p.spRole = null;
      this.phase = 'open'; this.brainIn = 0; this.possessionTurn=-Infinity;for(const t of this.teams)t.backPassAt=-Infinity;this.controlTeam = sp.team; this.lastPass = null;
      if (sp.type === 'throwin') this.doThrow(sp);
      else if (sp.type === 'goalkick') {
        const preferred=team.tactics.club?.delivery;
        const short = this.bestPassOption(taker, { noOffside: true, maxDist: preferred==='Roll it out'?23:31 });
        if (!short || preferred==='Take long kicks'||preferred==='Throw it long'||this.choiceRnd() < clamp(.26 + (team.tactics.passing - 1) * .22 + short.risk * .18 - (preferred ? .35 : 0), preferred ? .07 : .12, .84)) this.doLongBall(taker, true);
        else this.doPassTo(taker, short, { noOffside: true });
      } else if (sp.type === 'corner') {
        team.stats.corners++;
        const short = outlet && dist(outlet.x, outlet.y, b.x, b.y) > 4.5 && dist(outlet.x, outlet.y, b.x, b.y) < 13
          && this.laneRisk(b.x, b.y, outlet.x, outlet.y, sp.team) < .33 && this.nearestOppDist(outlet) > 2.9;
        const corner=team.tactics.club?.corner;
        if (short && (corner==='Short option'||(corner!=='Cross into the box'&&this.choiceRnd() < [.54, .30, .15][team.tactics.passing]))) {
          this.doPassTo(taker, { target: outlet, lead: { x: outlet.x, y: outlet.y }, technique: 'ground' }, { noOffside: true });
        } else this.doCross(taker, true);
      } else if (sp.type === 'freekick') this.chooseFreeKick(sp);
      else if (sp.type === 'penalty') this.doShot(taker, { pen: true });
      const f = b.flight;
      if (f) {
        f.restartId = sp.id;
        b.restart = { id: sp.id, type: sp.type, taker, indirect: !!sp.indirect || sp.type === 'throwin' };
      }
      this.setpiece = null;
      const { id, type, x, y, awardedAt, quick, managed, shotLane, wide, dangerous, reason } = sp;
      const technique = f?.kind === 'shot' ? 'shot' : f?.technique;
      this.lastRestart = { id, type, x, y, awardedAt, quick, managed, shotLane, wide, dangerous, reason, team: sp.team, taker,
        indirect: !!sp.indirect, takenAt: this.elapsed, technique, style: f?.style, wall: sp.wall, distance: f?.totalDist };
      const action = type === 'throwin' ? (f?.style === 'long' ? 'launches a long throw' : f?.style === 'line' ? 'throws down the line' : f?.style === 'recycle' ? 'throws back to keep possession' : 'takes the throw short')
        : type === 'goalkick' ? (technique === 'long' ? 'sends the goal kick long' : 'plays the goal kick short')
        : type === 'penalty' ? 'strikes the penalty'
        : type === 'corner' ? (technique === 'cross' ? 'swings the corner into the box' : 'takes the corner short')
        : sp.indirect ? 'takes the indirect free kick' : technique === 'shot' ? 'shoots from the free kick'
        : technique === 'cross' ? 'floats the free kick into the area' : quick ? 'takes the free kick quickly' : 'takes the free kick';
      this.emit('restartkick', { id, restart: type, team: sp.team, indirect: !!sp.indirect, reason, technique, style: f?.style, quick, managed,
        wall: sp.wall.length, distance: f?.totalDist, text: `${taker.name} ${action}.` });
    }

    restartPose() {
      const sp = this.setpiece;
      if (sp?.stage === 'windup') return { thrower: sp.taker.id, dir: sp.taker.dir, load: clamp((this.elapsed - sp.readyAt) / sp.windup, 0, 1) };
      if (sp?.wall.length) return { wall: sp.wall.map(p => p.id) };
      const r = this.lastRestart;
      if (r?.wall?.length && this.elapsed - r.takenAt < .28) return { wall: r.wall.map(p => p.id) };
      return null;
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
        const n = this.events.filter(e => e.half === this.half && ['goal', 'og', 'penscore', 'yellow', 'red', 'sub', 'pen', 'injury'].includes(e.type)).length;
        const mins = this.half === 1 ? 1 + Math.min(3, Math.round(n * .34)) : 2 + Math.min(4, Math.round(n * .4));
        this.added[period] = mins * 60 + this.reviewTime[period];
        this.say('stoppage', { n: mins }, { key: false });
      }
      const halfLimit = 2700 + this.added[period];
      const hasShot = b.flight && b.flight.kind === 'shot';
      if (this.phase === 'review') {
        this.reviewTime[period] += h;
        if (this.addedAnnounced[period]) this.added[period] += h;
        this.phaseTimer -= h;
        if (this.phaseTimer <= 1e-8) this.resolveReview();
        this.snapshot(); return;
      }
      if (this.t >= halfLimit && this.phase !== 'goal' && this.phase !== 'penalty' && !(this.setpiece?.card || this.setpiece?.cards.length) && !(hasShot && (b.flight.pen || this.t < halfLimit + 5))) {
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
            b.owner = taker; this.doPass(taker, { back: true, maxDist: 26 });
          }
        } else this.advanceSetPiece(h);
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
      this.referee.track(this);
      if (this.onSnapshot && ++this.snapCount % this.snapEvery === 0) this.onSnapshot(this.snapshotFrame());
    }

    visibleBall() {
      const runway = this.setpiece?.runoff;
      return runway && !runway.finished ? runway.ball : this.ball;
    }

    snapshotFrame() {
      const ps = this.playersCache, b = this.visibleBall();
      const arr = new Float32Array(ps.length * 2 + 4);
      for (let i = 0; i < ps.length; i++) { arr[2 * i] = ps[i].x; arr[2 * i + 1] = ps[i].y; }
      arr.set([b.x, b.y, b.z, ps.indexOf(this.ball.owner)], ps.length * 2);
      return { t: this.t + (this.half === 2 ? 2700 : 0), elapsed: this.elapsed, half: this.half, n: ps.length, arr, ids: ps.map(p => p.id),
        carried: b.carried || 0, dugouts: this.teams.map(t => t.dugout),
        referee: this.referee.pose(this), restartPose: this.restartPose() };
    }

    // Blend anchors, not player coordinates. A turnover cannot teleport a full-back home.
    phaseWeight(team,p){const attacking=this.controlTeam===team.idx,age=this.elapsed-this.possessionTurn;
      if(age>=6||!p.assignment)return Number(attacking);
      const gain=p.assignment.response.gain,loss=p.assignment.response.loss,orders=team.tactics.club||{};
      const rush=attacking?(gain?gain==='Break forward':orders.won==='Counter'):(loss?loss==='Recover position':orders.lost==='Regroup');
      const seconds=(rush?2.7:5.8)*(1-.34*p.assignment.rehearsal-secret(p,'adaptability')*.008);
      return lerp(p.phaseFrom??Number(!attacking),Number(attacking),clamp(age/seconds,0,1));}
    phaseLabel(team){if(!team||this.phase!=='open')return '';const won=this.controlTeam===team.idx;if(this.elapsed-this.possessionTurn>=6)return won?'In possession':'Defensive shape';return won?(team.tactics.club?.won||'Building after regain'):(team.tactics.club?.lost||'Recovering after loss');}
    pressSignal(team){const trigger=team.tactics.club?.trigger;return trigger==='Trap on touchline'?Math.min(this.ball.y,W-this.ball.y)<10:trigger==='On a backward pass'?this.elapsed-(team.backPassAt??-Infinity)<3:false;}
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
        const line = this.offsideLine(team) * d;
        team.seenLine = lerp(team.seenLine ?? line, line, .35);
        team.possession = this.controlTeam === idx;
        let first = null, second = null, best = Infinity, next = Infinity;
        const ownDepth = d > 0 ? b.x : L - b.x;
        const club = team.tactics.club, transition = this.elapsed - this.possessionTurn < 6;
        const signal=this.pressSignal(team),conditional=club?.trigger&&club.trigger!=='Always available';
        const radius = (conditional?(signal?8:-6):0)+(team.tactics.fine?.press!=null?15.4+8.05*team.tactics.fine.press:[15.4,22.8,31.5][team.tactics.press]) + (ownDepth < 37 ? 9.6 : 0)
          + (club?.block==='High press'?4:club?.block==='Low block'?-4:0) + (transition ? (club?.lost==='Counter-press'?6:club?.lost==='Regroup'?-3:0) : 0);
        for (const q of ps) {
          if (q.team !== idx || q.role === 'GK' || q.stunT > .1) continue;
          const gap = dist(q.x, q.y, marker.x, marker.y);
          const loss=transition&&q.assignment?.response.loss,regroup=transition&&(loss?loss==='Recover position':club?.lost==='Regroup'),hunt=transition&&(loss?loss==='Hunt the ball':club?.lost==='Counter-press');
          if(b.owner&&b.owner.team!==idx&&gap>(regroup&&ownDepth>26?7:radius+(hunt?4:0)))continue;
          const caughtBehind = b.owner && b.owner.team !== idx && (q.x - marker.x) * d > 1.8;
          const screen = b.owner && b.owner.team !== idx && ownDepth < 33 && q.role === 'DC' && gap > 5.8;
          const time = -(delta(q,'bravery')+delta(q,'determination'))*.004+(q.assignment?(1-q.assignment.familiarity)*.23-q.assignment.spec.hunt:0)+(q.iq?(12-q.iq.anticipation)*.016:0)+gap / this.speed(q) + (caughtBehind ? (ownDepth < 39 ? .49 : .31) : 0)
            + (screen ? .38 : 0) - (q === intended ? 1.12 : 0) - (q === this.chasers[idx] ? .085 : 0);
          if (time < best) { second = first; next = best; first = q; best = time; }
          else if (time < next) { second = q; next = time; }
        }
        if (b.owner && b.owner.team === idx) { this.chasers[idx] = b.owner; this.chasers2[idx] = null; }
        else {
          this.chasers[idx] = first;
          this.chasers2[idx] = b.owner ? ((team.tactics.press===2||ownDepth<33||signal||transition&&(second?.assignment?.response.loss==='Hunt the ball'||club?.lost==='Counter-press')) && next < (signal||transition&&club?.lost==='Counter-press'?4.2:ownDepth<33?2.44:2.69) ? second : null) : (next < (flying ? 2.2 : 1.1) && (!intended || intended.team !== idx) ? second : null);
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
      if (p.injury) v *= .68;
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
              p.seenLine = team.offsideLine * d;
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
                const actual = team.offsideLine * d;
                // Runners judge a moving line with a short delay; the official
                // still measures the real line, at the instant of contact.
                p.seenLine = lerp(p.seenLine ?? actual, actual, .44);
                let limit = Math.max(p.seenLine, b.x * d) - .48;
                const release = b.owner?.releasePlan;
                const anticipation = clamp(.36 + (13 - p.attrs.positioning) * .022 + (14 - p.attrs.composure) * .012 + (team.tactics.tempo - 1) * .06 + (1 - p.cond) * .12, .13, .51);
                if (release?.pass.target === p && release.at - this.elapsed <= anticipation) limit += 4.0;
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
        if(p.mind){if(atk){const forward=habit(p,'Gets forward')||habit(p,'Gets into the box')||habit(p,'Beats the offside trap');tx+=d*((forward?2.6:habit(p,'Comes deep')?-3:0)+(!back?delta(p,'offTheBall')*.15:0));}else if(b.owner){const pull=clamp(.025+delta(p,'marking')*.0025+(habit(p,'Marks tightly')?.05:0),0,.12);if(!wing)ty=lerp(ty,b.owner.y,pull);}}
        const assignment=p.assignment;if(assignment){const {spec,footFit}=assignment,q=p.roleSkill;
          if(atk){tx+=d*spec.x*q;ty+=(p.slotY<.5?-1:1)*spec.y*q*footFit;}
          else {tx=lerp(tx,b.x,spec.hunt*q);ty=lerp(ty,b.y,spec.hunt*q);}}
        const orders=team.tactics.club;if(!atk&&back&&p.mind)ty=lerp(ty,home.y,.015+.001*delta(this.gk(team),'communication'));if(!atk&&back)tx+=d*((team.tactics.fine?.line??line)-line)*4;if(!atk&&back)tx+=d*(orders?.step==='Step up more'?2.5:orders?.step==='Drop off more'?-2.5:0);if(atk&&['FB','WB'].includes(role)&&['Overlap','Underlap'].includes(orders?.build)){tx+=d*4;ty=lerp(ty,orders.build==='Underlap'?CY:p.slotY<.5?2:W-2,.23);}
        if(p.attackSlot){const weight=this.phaseWeight(team,p);tx+=d*(p.attackSlot.x-p.slotX)*L*weight;ty+=(p.attackSlot.y-p.slotY)*W*weight;}
        if (atk && p.duty && (!cb||p.assignment)) tx += d * (p.duty==='Attack'?3.3:p.duty==='Defend'?-3.3:0);
        if(atk&&this.elapsed-this.possessionTurn<6){const gain=p.assignment?.response.gain||team.tactics.club?.won;if(gain==='Break forward'||gain==='Counter'&&!back)tx+=d*4;else if(gain==='Offer support'||gain==='Hold shape'){tx=lerp(tx,home.x+d*3,.35);ty=lerp(ty,home.y,.2);}}
        if (atk && p.job==='W') ty = lerp(ty,p.slotY<.5?3.7:W-3.7,.24);
        if (atk && p.job==='DLF') tx-=d*2.8;
        p.tx = clamp(tx, .55, L - .55); p.ty = clamp(ty, .65, W - .65);
        p.sprint ||= dist(p.x, p.y, p.tx, p.ty) > (atk ? 13.4 : 11.5);
      }
    }

    dribbleTarget(p, team) {
      const d = team.attackDir, depth = d > 0 ? p.x : L - p.x;
      p.pressure = this.nearestOppDist(p);
      const delivery = p.releasePlan;
      if (delivery) {
        const dx = delivery.pass.lead.x - p.x, dy = delivery.pass.lead.y - p.y;
        const gap = Math.hypot(dx, dy) || 1;
        p.tx = clamp(p.x + dx / gap * 1.45, 1, L - 1);
        p.ty = clamp(p.y + dy / gap * 1.45, 1, W - 1);
        p.sprint = false;
        return;
      }
      const plan = p.ballPlan;
      if (plan && this.elapsed < plan.until && (plan.kind !== 'inside' || p.pressure > 1.3)) {
        p.tx = plan.x; p.ty = plan.y;
        p.sprint = plan.kind === 'inside' && p.pressure > 2.25 && p.cond > .5;
        return;
      }
      p.ballPlan = null;
      const wide = (p.role === 'W' || p.role === 'WB') && depth < 82;
      const centre = habit(p,'Runs down the right')?W-7:habit(p,'Runs through centre')||habit(p,p.slotY<.5?'Cuts inside from left':'Cuts inside from right')?CY:wide && (p.assignment?.spec.y??1)<0?CY:wide ? (p.slotY < .5 ? 7 : W - 7) : CY;
      let best = -Infinity, tx = p.x, ty = p.y;
      const wingEnd = depth > 91 && Math.abs(p.y - CY) > 9.6;
      for (const delta of [0, -4.5, 4.5, -8.3, 8.3]) {
        const target = p.x + d * (wingEnd ? (depth > 97 ? -1.8 : 1.1) : depth > 89 ? 2.6 : p.pressure < 2.6 ? 4.5 : 7.0);
        const laneEnd = wingEnd ? 3.1 : 3.3;
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
        const f = b.flight, reaction = .105 + (20 - p.attrs.reflexes) * .011 + (f.screened ? .078 : 0);
        if (this.elapsed - b.releaseT < reaction) { p.tx = p.x; p.ty = p.y; return; }
        const advance = delta(p,'oneOnOnes')*.05+(f.pen ? .72 : f.header || depth < 7 ? 1.55 : 2.25);
        p.tx = own + d * advance;
        const ahead = Math.abs((p.tx - b.x) / (Math.abs(b.vx) < .05 ? d : b.vx));
        p.ty = f.pen ? f.guessY : clamp(P.forecast(b, Math.min(.72, ahead)).y, CY - GOAL_HALF - .52, CY + GOAL_HALF + .52);
        p.sprint = true; return;
      }
      const loose = !b.owner && depth < BOX_L - .5 && Math.abs(b.y - CY) < BOX_HALF - .5;
      const expected = b.flight && b.flight.intended === p;
      const approaching = b.owner && b.owner.team !== p.team && depth < 13.5+delta(p,'rushingOut')*.18+delta(p,'eccentricity')*.09 && Math.abs(b.y - CY) < 9.7;
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
      const offset = clamp(1.85 + depth * .047, 1.85, 5.65) + (team.possession ? 1.65+(p.job==='Ball-Playing Goalkeeper'&&p.duty==='Support'?1.4:0) : 0) + ((p.job==='SK'||p.job==='Sweeper Keeper')&&depth>25?(p.duty==='Attack'?3.8:p.duty==='Support'?2.6:1.8):0);
      p.tx = own + d * offset;
      p.ty = CY + clamp((b.y - CY) * Math.min(.295, offset / Math.max(6, depth) + .085), -6.65, 6.65);
    }

    movePlayers(h, locked) {
      const players = this.playersCache, sp = locked ? this.setpiece : null;
      for (const p of players) { p.prevX = p.x; p.prevY = p.y; }
      for (const p of players) {
        p.stunT = Math.max(0, p.stunT - h); p.tackleT = Math.max(0, p.tackleT - h); p.contactT = Math.max(0, (p.contactT || 0) - h);
        if (sp?.stage === 'windup' && p === sp.taker) { p.vx = p.vy = 0; continue; } // planted feet
        const dx = p.tx - p.x, dy = p.ty - p.y, distance = Math.hypot(dx, dy);
        const sprint = (p.sprint || (locked && distance > 8)) && (locked || p.cond > .38);
        const limit = this.speed(p) * (sprint ? 1 : locked ? .76 : .685);
        const braking = Math.sqrt(2 * 6.9 * Math.max(0, distance - .075));
        const ratio = distance > .05 ? Math.min(limit, braking) / distance : 0;
        let vx = dx * ratio, vy = dy * ratio;
        for (const q of players) {
          if (q === p || (sp && p === sp.taker && (sp.stage === 'runup' || sp.type === 'throwin') && distance < 2.5)
            || (locked && ['wall', 'linekeeper'].includes(p.spRole) && q.spRole !== 'wall')) continue;
          const spacing = locked && p.spRole === 'wall' ? 1.03 : locked ? 1.28 : 1.54;
          const x = p.prevX - q.prevX, y = p.prevY - q.prevY;
          if (Math.abs(x) > spacing || Math.abs(y) > spacing) continue;
          const dd = Math.hypot(x, y);
          if (dd > .0001 && dd < spacing) {
            const ux = x / dd, uy = y / dd, repel = (spacing - dd) * 4.6;
            const approach = vx * ux + vy * uy;
            const shield = approach < 0 && q.team !== p.team && this.ball.owner === p ? -approach * clamp((1.54 - dd) / .66, 0, .95) : 0;
            vx += ux * (repel + shield); vy += uy * (repel + shield);
          }
        }
        const dvx = vx - p.vx, dvy = vy - p.vy, change = Math.hypot(dvx, dvy);
        const maxChange = (1+delta(p,'agility')*.014)*(p.iq?.acceleration?(.83+p.iq.acceleration*.015):1)*h * (distance < 2.2 ? 8.9 : 5.8 + p.attrs.pace * .072);
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
        p.cond = Math.max(.43, p.cond - drain*h*(1-delta(p,'naturalFitness')*.018)*(1.30 - p.attrs.stamina * .029));
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
        if (exit && exit.axis === 'x' && exit.line === f.goalX) { this.resolveShotLine(exit.line, exit, before, h); return; }
        if (exit || this.elapsed - b.releaseT > 5.6 || (b.z === 0 && Math.hypot(b.vx, b.vy) < 1.1)) {
          this.finishShot(f, 'miss'); b.flight = null;
          this.describeMiss(f, exit && exit.z > GOAL_H ? 'over' : 'wide');
        }
      }
      if (!exit) return;
      const departure = Runoff.capture(b, before, exit, h);
      if (exit.axis === 'y') {
        const team = b.lastTouch ? 1 - b.lastTouch.team : this.controlTeam;
        this.startSetPiece('throwin', team, exit.x, exit.line, {}, departure);
        this.say('throwin', { team: this.teamName(team) }, { team, restartId: this.setpiece.id });
        return;
      }
      const defending = this.teams.find(t => (t.attackDir > 0 ? 0 : L) === exit.line);
      if (Math.abs(exit.y - CY) <= GOAL_HALF - P.RADIUS * .55 && exit.z < GOAL_H - P.RADIUS * .45) {
        b.x = exit.x; b.y = exit.y; b.z = exit.z; this.considerGoal(exit.line, null, departure); return;
      }
      this.goalRestart(exit.line, exit.y, defending, departure);
    }

    goalRestart(line, y, defending, departure) {
      const b = this.ball;
      if (b.lastTouch && b.lastTouch.team === defending.idx) {
        const team = 1 - defending.idx;
        this.startSetPiece('corner', team, line === 0 ? .42 : L - .42, y < CY ? .42 : W - .42, {}, departure);
        this.say('corner', { team: this.teamName(team) }, { team, restartId: this.setpiece.id });
      } else {
        this.startSetPiece('goalkick', defending.idx, line === 0 ? SIX_L - .5 : L - SIX_L + .5, CY + (y > CY ? 4 : -4), {}, departure);
        this.say('goalkick', { team: this.teamName(defending.idx) }, { team: defending.idx, restartId: this.setpiece.id });
      }
    }

    interactions(h) {
      const b = this.ball, ps = this.playersCache, age = this.elapsed - b.releaseT;
      if (!b.owner && b.z <= 2.7 && age > .105 && !(b.flight && b.flight.kind === 'shot')) {
        let choice = null, contender = null, best = -Infinity, challengeGap = Infinity;
        const speed = Math.hypot(b.vx, b.vy), flight = b.flight, offside = b.offside;
        for (const q of ps) {
          const hand = this.canGather(q, b, flight);
          const reach = hand ? 1.49 : b.z > 1.23 ? .91 : flight && flight.intended === q ? 1.14 : .97;
          if (q.contactT > 0 || q.stunT > .08 || (q === b.lastTouch && age < .51) || (!hand && b.z > (b.vz > 1.7 ? 1.25 : 2.28))) continue;
          const dx = q.x - b.x, dy = q.y - b.y;
          if (Math.abs(dx) > reach || Math.abs(dy) > reach) continue;
          const gap = Math.hypot(dx, dy);
          if (gap > reach) continue;
          if (offside?.team === q.team && q.offsideFlag && gap < challengeGap
            && (flight?.intended === q || this.chasers[q.team] === q) && (dx * q.vx + dy * q.vy < -.22 || (flight?.intended === q && dx * b.vx + dy * b.vy > .5))) { contender = q; challengeGap = gap; }
          const score = (1 - gap / reach) + (flight && flight.intended === q ? .23 : 0) + (hand ? .46 : .0037 * q.attrs.positioning);
          if (score > best) { choice = q; best = score; }
        }
        if (choice) {
          const q = choice, hand = this.canGather(q, b, flight);
          if (b.restart?.taker === q) { this.secondTouch(q); return; }
          b.restart = null;
          if (offside?.team === q.team && q.offsideFlag) { this.offside(q); return; }
          // Two players actually contending for this ball, not merely an
          // attacker occupying an offside position elsewhere on the pitch.
          if (contender && q.team !== contender.team && dist(q.x, q.y, contender.x, contender.y) < 1.35) { this.offside(contender); return; }
          this.noteInvolvement(q, offside);
          if (flight && flight.team !== q.team && q.role !== 'GK' && (flight.kind === 'cross' || flight.technique === 'cutback') && this.goalDepth(q.team, b.x) < 8.2 && Math.abs(b.y - CY) > 4.1 && b.z < 1.76 && speed > 6.5 && this.rnd() < .52 && this.turnBehind(q, speed)) {
            this.deflection(q);
            this.emit('crossblock', { text: `${q.name} gets a foot to the delivery.`, team: q.team });
            return;
          }
          if (!hand && b.z > 1.28 && b.vz < -.55 && flight && this.aerialTouch(q, flight)) return;
          let chance = hand ? .93 : .68+delta(q,'firstTouch')*.012 + q.attrs.composure * .012 + (flight && flight.intended === q ? .085 : 0);
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
          // A further attacking touch takes a new offside picture. An
          // involuntary ricochet off an opponent leaves the original one intact.
          if (offside?.team === q.team || flight?.team === q.team) this.setOffside(q, true);
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
        const commit = (inside ? .455 : [.39, .46, .54][team.tactics.press]) - (behind ? .17 : 0) + (team.tactics.club?.duels==='Get stuck in'?.056:team.tactics.club?.duels==='Stay on feet'?-.048:0);
        if (this.rnd() > commit) continue;
        const foul = (1+(secret(q,'dirtiness')-secret(q,'sportsmanship')-secret(q,'temperament'))*.012+(habit(q,'Dives into tackles')?.15:0))*(.007 + q.attrs.aggression * .00275 + (behind ? .030 : 0)) * (inside ? .38 : 1) * (team.tactics.club?.duels==='Get stuck in'?1.25:1);
        const wins = clamp((delta(q,'strength')-delta(o,'balance'))*.006+(inside ? .61 : .50) + (q.attrs.tackling - o.attrs.dribbling) * .027 - (behind ? .13 : 0), .16, .84);
        const roll = this.rnd();
        if (roll < foul) { this.foul(q, o); return; }
        if (roll < foul + wins * (1 - foul)) {
          const angle = Math.atan2(q.y - b.y, q.x - b.x) + (this.rnd() - .5) * .86;
          const closingByline = this.goalDepth(q.team, b.x) < 5.9 && Math.abs(b.y - CY) > 6 && (q.x - o.x) * team.attackDir < -.12 && o.vx * team.attackDir < -.8;
          const pokeBehind = closingByline && this.turnBehind(q, 8.2);
          b.owner = null; b.lastTouch = q; b.releaseT = this.elapsed; b.flight = null;
          if (!pokeBehind) { b.vx = Math.cos(angle) * 3.5; b.vy = Math.sin(angle) * 3.5; b.vz = .59; b.ax = b.ay = 0; }
          this.lastPass = null; this.brainIn = 0;
          o.releasePlan = null; o.stunT = .39; q.stats.tackles++; team.stats.tackles++;
          this.adjust(q, .06); this.adjust(o, -.035); return;
        }
        q.stunT = .26;
      }
      o.decisionT -= h;
      if (o.releasePlan) {
        const release = o.releasePlan;
        if (this.elapsed + 1e-8 >= release.at) {
          o.releasePlan = null;
          const q = release.pass.target;
          if (q.onPitch && !q.red && q.stunT < .24) {
            // The runner may have crossed the line while the passer took the
            // extra stride. Judge at the kick, not at the earlier read.
            const lead = { x: clamp(release.pass.lead.x + (q.x - release.x) * .62, 1.35, L - 1.35), y: clamp(release.pass.lead.y + (q.y - release.y) * .62, 1.45, W - 1.45) };
            this.doPassTo(o, { ...release.pass, lead }, { purpose: release.purpose, committedAt: release.since });
          } else this.decide(o, this.nearestOppDist(o));
        }
        return;
      }
      if (o.role === 'GK') {
        if (o.decisionT <= 0) {
          const team = this.teams[o.team], pressure = this.nearestOppDist(o);
          const delivery=team.tactics.club?.delivery;
          if(!delivery&&pressure>4&&(o.job==='Ball-Playing Goalkeeper'||habit(o,'Looks for a short outlet')))this.doPass(o,{maxDist:28});else if (delivery&&pressure>=3.65) {
            if (delivery==='Take long kicks'||delivery==='Throw it long') this.doLongBall(o);
            else this.doPass(o,{maxDist:delivery==='Roll it out'?22:32});
          } else if (pressure < 4.2 || team.tactics.passing === 2 || this.rnd() < (team.tactics.passing === 0 ? .23 : .42)) this.doLongBall(o);
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
        if (this.rnd() > .36 + delta(p,'jumpingReach')*.009+delta(p,'heading')*.008+p.attrs.positioning * .017 - (pressure < 1.9 ? .17 : 0)) return false;
        if (b.lastTouch && b.lastTouch.team === p.team && b.lastTouch !== p) this.completePass(b.lastTouch, p);
        this.say('header', { p: p.name }, { team: p.team });
        this.doShot(p, { header: true }); return true;
      }
      if (!same && this.canHandle(p, b) && b.z > 1.45 && (pressure < 4.5 || b.z > 1.86)) {
        if (this.rnd() > .52 + delta(p,'commandOfArea')*.014+p.attrs.positioning * .018) return false;
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
      if (f && (f.kind === 'pass' || f.kind === 'cross' || f.kind === 'throw') && from && from.team === p.team && from !== p) this.completePass(from, p);
      else if (p.team !== this.controlTeam || (f && from !== p)) {
        if (f && f.team !== p.team) { p.stats.interceptions++; this.adjust(p, .064); }
        this.lastPass = null;
      }
      if(from&&from.team===p.team&&f?.kind==='pass'&&(p.x-from.x)*this.teams[p.team].attackDir < -3)this.teams[1-p.team].backPassAt=this.elapsed;
      if((this.season||this.teams.some(t=>t.tactics.captains))&&this.controlTeam!==p.team){for(const t of this.teams){t.backPassAt=-Infinity;for(const slot of t.slots)slot.player.phaseFrom=this.phaseWeight(t,slot.player);}this.possessionTurn=this.elapsed;}
      this.controlTeam = p.team; this.brainIn = 0;
      if (this.attackCheck?.team !== p.team) this.attackCheck = null;
      for (const q of this.playersCache) { q.offsideFlag = false; q.offsideGap = null; }
      b.owner = p; b.lastTouch = p; b.flight = b.offside = b.restart = null; b.ax = b.ay = 0;
      const team = this.teams[p.team], depth = team.attackDir > 0 ? p.x : L - p.x;
      const bodyRoom = this.nearestOppDist(p);
      const openTime = clamp((bodyRoom - 2.35) * .16, 0, 1.06);
      const base = p.role === 'GK' ? 2.58 + this.rnd() * 1.48 : (depth > 74 ? .82 : 1.64) + this.choiceRnd() * .72 + openTime;
      p.decisionT = base*(habit(p,'Distributes early')?.78:1) * (TEMPO_HOLD[team.tactics.tempo]*(1+((team.tactics.tempo)-(team.tactics.fine?.tempo??team.tactics.tempo))*.20)) + Math.max(0, ballSpeed - 11) * .029 + Math.max(0, b.z - .36) * .16;
      if(p.role==='GK'&&team.tactics.club) p.decisionT*=team.tactics.club.gk==='Distribute quickly'?.65:1.13;
      p.receivedAt = this.elapsed;
      p.ballPlan = p.releasePlan = null;
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

    /* ---------------- refereeing ---------------- */

    offside(p, at = this.ball) {
      const team = 1 - p.team;
      this.teams[p.team].stats.offsides++;
      this.adjust(p, -0.03);
      this.startSetPiece('freekick', team, at.x, at.y, { indirect: true, reason: 'offside', offender: p });
      this.say('offside', { p: p.name, opp: this.teamName(team) }, { team: p.team, awardedTo: team, restartId: this.setpiece.id });
    }

    secondTouch(p) {
      const team = 1 - p.team;
      this.startSetPiece('freekick', team, this.ball.x, this.ball.y, { indirect: true, reason: 'double-touch', offender: p });
      this.emit('foul', { team, restartId: this.setpiece.id, text: `${p.name} touches the ball twice. Indirect free kick to ${this.teamName(team)}.` });
    }

    areaMargin(x, y, defending) {
      const depth = defending.attackDir > 0 ? x : L - x;
      return Math.min(BOX_L - depth, BOX_HALF - Math.abs(y - CY));
    }

    foul(p, victim) {
      const b = this.ball, defending = this.teams[p.team];
      // The tackle model uses two player markers. Measure their contact point,
      // not the ball, which may already be on the other side of the box line.
      const x = clamp((p.x + victim.x) / 2, .3, L - .3);
      const y = clamp((p.y + victim.y) / 2, .3, W - .3);
      const observed = this.areaMargin(b.x, b.y, defending);
      const measured = this.areaMargin(x, y, defending);
      const lastMan = dist(victim.x, victim.y, defending.attackDir > 0 ? 0 : L, CY) < 25 && this.isLastDefender(p, victim);
      const incident = { kind: 'area', p, victim, x, y, lastMan, roll: this.rnd(), fieldPenalty: observed >= -1e-8, actualPenalty: measured >= -1e-8 };
      defending.stats.fouls++; p.stats.fouls++;
      this.adjust(p, -.06);
      b.owner = null; b.vx = b.vy = b.vz = b.ax = b.ay = 0; b.flight = b.offside = b.restart = null;
      b.x = x; b.y = y; b.z = 0;
      if (Math.abs(measured) <= AREA_CHECK_RANGE || incident.fieldPenalty !== incident.actualPenalty) {
        const call = incident.fieldPenalty ? 'Penalty given' : 'Free kick given';
        this.beginReview(incident, victim.team, `${call}. VAR is checking the contact at the edge of the box.`);
      } else this.awardFoul(incident);
      if (this.injuryRnd && !victim.injury && this.injuryRnd() < (.019+(1-victim.cond)*.082)*(1+secret(victim,'injuryProneness')*.045)) {
        victim.injury=2+Math.floor(this.injuryRnd()*5);victim.cond=Math.max(.28,victim.cond-.19);
        this.emit('injury',{team:victim.team,player:victim,key:true,text:`${victim.name} has taken a knock. The physio signals for assessment.`});
      }
    }

    awardFoul(incident, reviewed = false) {
      const { p, victim, x, y, lastMan, roll, actualPenalty } = incident;
      const cards = [];
      const reckless = (p.attrs.aggression - 12) * .005;
      if ((actualPenalty && lastMan && roll < .065) || roll < .0035 || (lastMan && roll < .022)) cards.push({ kind: 'red', reason: 'serious foul' });
      else if (roll < .135 + reckless || (p.yellow >= 1 && roll < .23 + reckless)) {
        cards.push({ kind: 'yellow' });
        if (p.yellow >= 1) cards.push({ kind: 'red', reason: 'second yellow' });
      }
      const sp = this.startSetPiece(actualPenalty ? 'penalty' : 'freekick', victim.team, x, y,
        { incident, offender: p, reason: 'foul', cards, reviewed });
      const data = { team: victim.team, restartId: sp.id, player: p, x, y, dangerous: sp.dangerous, quick: sp.quick, discipline: cards.length > 0 };
      if (actualPenalty) this.say('pen', { p: p.name, v: victim.name }, { ...data, key: true });
      else this.say('foul', { p: p.name, v: victim.name, opp: this.teamName(victim.team) }, data);
    }

    beginReview(incident, team, text) {
      this.review = incident;
      this.phase = 'review'; this.phaseTimer = REVIEW_SECONDS;
      this.emit('varcheck', { review: incident.kind, team, text, key: true });
    }

    resolveReview() {
      const incident = this.review;
      this.review = null;
      if (incident.kind === 'area') {
        const { actualPenalty, fieldPenalty, victim } = incident;
        const changed = actualPenalty !== fieldPenalty;
        this.awardFoul(incident, true);
        const text = actualPenalty
          ? (changed ? 'Decision changed: penalty. The foul was inside the area.' : 'Penalty confirmed. The contact was in the penalty area.')
          : (changed ? 'Penalty overturned: free kick. The foul was outside the area.' : 'Free kick confirmed. The foul was outside the area.');
        this.emit('varresult', { review: 'area', changed, ruling: this.phase, team: victim.team, text, key: true });
        return;
      }
      const { line, shot, team, evidence } = incident;
      if (evidence.gap > OFFSIDE_LEVEL) {
        // Retain the historical shot entry for buffered views, but remove the
        // disallowed attempt from the official counts and shot map display.
        if (shot?.shot.outcome === 'pending') {
          this.finishShot(shot, 'disallowed');
          const stats = this.teams[shot.shooter.team].stats;
          stats.shots--; stats.xG = Math.max(0, stats.xG - shot.xG);
          shot.shooter.stats.shots--;
          if (shot.assist) shot.assist.stats.keyPasses--;
        }
        this.offside(evidence.player, evidence);
        this.emit('varresult', { review: 'goal', changed: true, ruling: 'offside', team, text: 'No goal. VAR found offside in the buildup.', key: true });
      } else {
        this.emit('varresult', { review: 'goal', changed: false, ruling: 'goal', team, text: 'Goal confirmed. The player was onside.', key: true });
        this.goalScored(line, shot);
      }
    }

    noteInvolvement(p, offside) {
      if (offside?.team !== p.team || p.offsideGap == null || p.offsideGap < -.18 || p.offsideGap > OFFSIDE_FLAG) return;
      const b = this.ball, team = this.teams[p.team];
      if ((b.x - CX) * team.attackDir < 20) return;
      const previous = this.attackCheck;
      if (previous?.team === p.team && this.elapsed - previous.at <= ATTACK_CHECK_WINDOW && previous.gap > OFFSIDE_LEVEL) return;
      this.attackCheck = { team: p.team, player: p, gap: p.offsideGap, x: b.x, y: b.y, at: this.elapsed };
    }

    isLastDefender(p, victim) {
      const team = this.teams[p.team];
      const d = team.attackDir;
      const ownGoalX = d > 0 ? 0 : L;
      const px = (p.x - ownGoalX) * d;
      for (const s of team.slots) {
        const q = s.player;
        if (q === p || !q.onPitch || q.role === 'GK') continue;
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
      const delay = AI.readDelay(p, look, squeeze) * (TEMPO_HOLD[team.tactics.tempo]*(1+((team.tactics.tempo)-(team.tactics.fine?.tempo??team.tactics.tempo))*.20));
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
        if (score >= .38-(ambitious?delta(p,'vision')*.006:0) && pass.risk < 1.03) {
          if (easy) safeOutlet = Math.max(safeOutlet, score);
          const purpose = recycle ? 'recycle' : pass.through ? 'through' : pass.technique === 'cutback' ? 'cutback' : 'progress';
          opts.push({ kind: 'pass', score, pass, first, purpose });
        }
      }
      const carry = .574 + p.attrs.dribbling * .013 + clamp(space, 0, 13) * .022
        - clamp((2.86 - pressure) * .229, 0, .38) - (depth > 89 ? .115 : 0) - (p.role === 'DC' ? .138 : 0)
        + p.reading.carry * .72 + intent * .50 - rush * .044 + (team.tactics.club?.build==='Run at defence'?.14:0);
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
      for(const o of opts){if(p.mind)o.score+=Mind.bias(p.mind,o,read);const build=team.tactics.club?.build;if(o.kind==='pass')o.score+=((team.tactics.fine?.passing??team.tactics.passing)-team.tactics.passing)*(o.purpose==='progress'||o.purpose==='through'?.09:-.09);if(o.kind==='shot')o.score+=build==='Shoot on sight'?.1:build==='Work ball into box'&&dd>15?-.12:0;}
      if(this.elapsed-this.possessionTurn<6&&p.assignment){const gain=p.assignment.response.gain||team.tactics.club?.won;
        for(const o of opts)if(o.kind==='pass'){const safe=o.purpose==='recycle'||o.pass.dist<16,vertical=o.pass.gain>7||o.pass.through;if(gain==='Counter'||gain==='Break forward')o.score+=vertical?.12:0;else if(gain==='Hold shape'||gain==='Offer support')o.score+=safe?.12:vertical?-.06:0;}}
      const preferred=p.assignment?.spec.action;if(preferred)for(const o of opts){const match=o.kind===preferred||(o.kind==='pass'&&(o.purpose===preferred||(preferred==='short'&&o.pass.dist<=18)));if(match)o.score+=.12*p.roleSkill*(p.duty==='Attack'&&['shot','carry','cross'].includes(o.kind)?1.2:1);}
      return opts;
    }

    decide(p, pressure) {
      const team = this.teams[p.team], b = this.ball, read = this.readPlay(p, pressure);
      const leader=team.tactics.captains&&team.score<this.teams[1-p.team].score&&(globalThis.TLMatchBoard||require('./match-board')).captain(team);
      const stakes=this.minute()>70&&Math.abs(team.score-this.teams[1-p.team].score)<=1?1:0;
      const margin = clamp(.175-(delta(p,'concentration')+secret(p,'pressure')*read.rush+secret(p,'importantMatches')*stakes)*.0013-(p.mind?.form||0)*.018 - (p.iq?(p.iq.decisions-10)*.002+(p.reps||0)*.0007:0) - (leader?Math.max(0,leader.attrs.composure-10+delta(leader,'leadership')*.6)*.002:0) + read.rush * .067 + (13 - p.attrs.composure) * .006, .125, .28);
      const action = AI.pick(this.decisionOptions(p, read), this.choiceRnd, margin);
      // Choice RNG is separate from the ball, contact and finishing RNG.
      p.decisionT = (1.62 + this.choiceRnd() * .77) * (TEMPO_HOLD[team.tactics.tempo]*(1+((team.tactics.tempo)-(team.tactics.fine?.tempo??team.tactics.tempo))*.20));
      p.ballPlan = p.releasePlan = null;
      if (action.kind === 'shot') this.doShot(p, { firstTime: action.first });
      else if (action.kind === 'pass') {
        const q = action.pass.target, d = team.attackDir;
        if (!action.first && q.runType === 'behind' && q.running > .28 && q.vx * d > .84 && action.pass.gain > 4.4 && action.pass.dist >= 10) {
          const look = AI.facing(p, action.pass.lead.x - p.x, action.pass.lead.y - p.y);
          const stride = clamp(.225 + (1 - look) * .125 + read.rush * .14 + (17 - p.attrs.passing) * .013 + (1 - p.cond) * .10 - (team.tactics.tempo - 1) * .052, .15, .58);
          p.releasePlan = { at: this.elapsed + stride, since: this.elapsed, x: q.x, y: q.y, pass: action.pass, purpose: action.purpose };
          this.brainIn = 0;
        } else this.doPassTo(p, action.pass, { firstTime: action.first, purpose: action.purpose });
      }
      else if (action.kind === 'cross') this.doCross(p, false, action.delivery);
      else if (action.kind === 'clear') this.doLongBall(p, false, true);
      else if (action.style === 'inside') {
        p.ballPlan = { kind: 'inside', x: action.x, y: action.y, until: this.elapsed + .89 };
        p.decisionT = (.86 + this.choiceRnd() * .33) * (TEMPO_HOLD[team.tactics.tempo]*(1+((team.tactics.tempo)-(team.tactics.fine?.tempo??team.tactics.tempo))*.20));
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
        const look = read ? AI.facing(p, q.x - b.x, q.y - b.y) : 1;
        // A player looking up while pressed reads a line that's already moving.
        // Penalize doubtful passes rather than turning marginal reads into a ban.
        const lag = read && team.seenLine != null ? clamp(.57 + read.rush * .38 - look * .13 + (13 - p.reading.vision) * .036, .23, 1) : 0;
        const guessed = lerp(line, team.seenLine ?? line, lag);
        const doubt = opts.noOffside ? 0 : Math.max(0, q.x * d - Math.max(guessed, b.x * d, CX * d));
        if (doubt > (read ? .48 : .24)) continue;
        const opening = this.nearestOppDist(q);
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
          score -= doubt * .26 + risk * .71 + Math.max(0, (entry ? 4.95 : 3.95) - opening) * (entry ? .083 : .064)
            + Math.max(0, dd - 22) * (style === 0 ? .014 : .0072);
          if (through) score += opening > 5.1 ? .136 : .065;
          if (depth > 64 && gain < 4 && opening > 6.5) score += .055;
          if (cutback) score += .24;
          if (swing) score += .096;
          if (q.role === 'GK') score -= .27;
          const club=team.tactics.club;
          if (club?.build==='Play out of defence'&&depth<38&&dd<21&&!air) score+=.115;
          if (club?.build==='Pass into space'&&through) score+=.12;
          if (p.job==='BPD'&&gain>9&&dd>14) score+=.085;
          if (p.role==='GK'&&club?.target) score+=this.keeperTargetBias(q,club.target);
          if (air && !opts.technique) score -= (opening < 5 ? .155 : technique === 'long' || technique === 'switch' ? .101 : .034);
          if (q === this.lastPass?.player && this.elapsed - this.lastPass.t < 5.4 && gain < 4) score -= habit(p,'Plays one-twos')?.06:.24;
          if (opts.back) score += Math.min(.19, 1 / (dd + 1) * 1.9);
          if (read) {
            const ambitious = through || dd > 22;
            const back = Math.max(0, -look);
            score -= (1 - look) * (through ? .071 : .015) + (ambitious ? back * .045 + read.rush * .082 : 0);
            if (swing) score += clamp((p.reading.vision - 9) * .009 * (1 - read.rush), 0, .08);
            if (through) score += (p.reading.vision - 12) * .012 + (style - 1) * .046 - Math.max(0, risk - .28) * .14;
          } else if (!opts.restart) score += (this.rnd() - .5) * (.136 - p.attrs.passing * .0032);
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
      if (choice && (choice.score > .10 || opts.back)) this.doPassTo(p, choice, opts);
      else this.doLongBall(p, !!opts.noOffside);
    }

    setOffside(p, enabled) {
      const team = this.teams[p.team], sign = team.attackDir, b = this.ball;
      const line = Math.max(this.offsideLine(team) * sign, b.x * sign);
      b.offside = enabled ? { team: p.team, line: line * sign, at: this.elapsed } : null;
      for (const q of this.playersCache) if (q.team === p.team) {
        q.offsideGap = enabled && q !== p && q.x * sign > CX * sign ? q.x * sign - line : null;
        q.offsideFlag = q.offsideGap !== null && q.offsideGap > OFFSIDE_FLAG;
      }
    }

    kick(p, tx, ty, f, k) {
      const b = this.ball;
      if (this.setpiece?.taker !== p && dist(b.x, b.y, p.x, p.y) > 2.14) {
        const direction = Math.atan2(ty - p.y, tx - p.x);
        b.x = p.x + Math.cos(direction) * .44; b.y = p.y + Math.sin(direction) * .44;
      }
      f.team = p.team; f.from = p; f.targetX = tx; f.targetY = ty;
      if (this.attackCheck?.team !== p.team) this.attackCheck = null;
      b.owner = null; b.lastTouch = p; b.releaseT = this.elapsed; b.flight = f; b.offside = b.restart = null;
      p.holding = false;
      p.ballPlan = p.releasePlan = null;
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
      const technique = option.technique || (option.through ? 'through' : 'ground');
      const air = !['ground', 'through', 'cutback'].includes(technique);
      const dd = dist(b.x, b.y, option.lead.x, option.lead.y);
      const variance = (1-delta(p,'technique')*.02-(p.mind?.form||0)*.08)*(1+.36*this.footCost(p,pressure))*(1+(1-(p.assignment?.footFit??1))*(pressure<3?2:1))*(.24 + dd * .024) * (1.54 - p.attrs.passing * .054) * (pressure < 2.25 ? 1.37 : 1) * (air ? 1.16 : 1);
      const tx = clamp(option.lead.x + (this.rnd() * 2 - 1) * variance, .72, L - .72);
      const ty = clamp(option.lead.y + (this.rnd() * 2 - 1) * variance, .72, W - .72);
      const k = air ? {
        seconds: technique === 'chip' ? clamp(.72 + dd * .032, 1.02, 1.82) : clamp(.58 + dd * .042, 1.57, 3.12),
        startZ: .084, bend: (this.rnd() - .5) * .68
      } : { arrival: clamp(4.42 + dd * .111 + team.tactics.tempo * .58 + (technique === 'through' ? .84 : 0), 4.8, 10.75) };
      const f = this.kick(p, tx, ty, { kind: 'pass', intended: option.target, technique, through: !!option.through, firstTime: !!opts.firstTime, purpose: opts.purpose, committedAt: opts.committedAt, offsideCheck: !opts.noOffside }, k);
      this.deliveryReleased(p, f);
    }

    keeperTargetBias(q, target) {
      if(target==='Flanks')return Math.abs(q.y-CY)>15?.21:0;
      if(target==='Target forward')return q.role==='ST'?.28:0;
      if(target==='Playmaker')return ['DM','CM','AM'].includes(q.role)?.23:0;
      if(target==='Full-backs')return q.role==='FB'||q.role==='WB'?.23:0;
      if(target==='Centre-backs')return q.role==='DC'?.23:0;
      return ['ST','W'].includes(q.role)?.16:0;
    }

    doLongBall(p, noOffside = false, clearance = false) {
      const b = this.ball, team = this.teams[p.team], d = team.attackDir, line = this.offsideLine(team) * d;
      let target = null, best = -Infinity;
      for (const q of this.playersCache) {
        const gain = (q.x - b.x) * d, dd = dist(b.x, b.y, q.x, q.y);
        if (q.team !== p.team || q.role === 'GK' || q === p || gain < 18 || dd > 70 || (!noOffside && q.x * d > Math.max(line, b.x * d, CX * d) + .25)) continue;
        const score = (q.role === 'ST' ? 3 : ['W', 'AM'].includes(q.role) ? 2 : 0) + clamp(this.nearestOppDist(q), 0, 11) - Math.abs(gain - 39) * .13 + this.rnd() * 1.5 + (p.role==='GK'&&team.tactics.club?.target ? this.keeperTargetBias(q,team.tactics.club.target)*12 : 0);
        if (score > best) { best = score; target = q; }
      }
      const scatter = (clearance ? 6.8 : 2.9+(20-p.attrs.passing)*.142)*(1-delta(p,'kicking')*.025);
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
      const ty = clamp(q ? q.y + q.vy * .60 + (this.rnd() - .5) * (1-delta(p,corner?'corners':'crossing')*.04)*(1.7+2*this.footCost(p,this.nearestOppDist(p),p.slotY>.5?1:-1)) : CY + (this.rnd() - .5) * 11, CY - 14, CY + 14);
      const distance = dist(b.x, b.y, tx, ty);
      const bent = (b.y < CY ? 1 : -1) * d * (.92 + this.rnd() * .85);
      const f = this.kick(p, tx, ty, { kind: 'cross', technique: 'cross', intended: q, offsideCheck: !corner }, { seconds: clamp(.77 + distance * .042, 1.23, 2.77)*({'Low crosses':.65,'Whipped crosses':.85,'Floated crosses':1.2}[team.tactics.club?.deliveryCross]||1), startZ: .11, bend: bent*(team.tactics.club?.deliveryCross==='Whipped crosses'?1.4:1) });
      this.deliveryReleased(p, f);
      if (!corner && !this.setpiece) this.say('cross', { p: p.name }, { team: p.team });
    }

    doShot(p, opts = {}) {
      const b = this.ball, team = this.teams[p.team], d = team.attackDir, gx = d > 0 ? L : 0;
      const goalLine = gx + d * (P.RADIUS + .014);
      const dd = dist(b.x, b.y, gx, CY), pressure = this.nearestOppDist(p), keeper = this.gk(this.teams[1 - p.team]);
      const minute = this.minute();
      const penSkill = p.attrs.penalties, fkSkill = p.attrs.freeKicks;
      const stakes = clamp((minute - 68) / 25, 0, 1) * (Math.abs(team.score - this.teams[1 - team.idx].score) <= 1 ? 1 : .3);
      const wall = opts.wall || [];
      const leap = wall.length > 1 && this.choiceRnd() < .81;
      const curl = opts.fk && this.choiceRnd() < clamp(.43 + (fkSkill - 12) * .045 + wall.length * .05, .30, .83);
      const screened = wall.some(q => {
        const dx = keeper.x - b.x, dy = keeper.y - b.y, t = ((q.x - b.x) * dx + (q.y - b.y) * dy) / Math.max(1, dx * dx + dy * dy);
        return t > 0 && t < 1 && dist(q.x, q.y, b.x + dx * t, b.y + dy * t) < .68;
      });
      const nearLine = this.laneRisk(b.x, b.y, gx, CY, p.team, 1.45);
      const coverage = keeper && (keeper.x - b.x) * d > 0 ? .82 : 1.04;
      let xg = opts.pen ? .78 : clamp(this.estimateXG(b.x, b.y, gx, pressure) * coverage * clamp(1 - nearLine * .25, .45, 1), .014, .79);
      if (opts.header) xg = Math.max(.018, xg * .68);
      if (opts.fk) xg = Math.max(.018, xg * .64);
      const keeperGap = Math.abs(keeper.x - gx);
      const lob = !opts.pen && !opts.fk && !opts.header && dd > 10 && dd < 28 && keeperGap > 4.4 && pressure > 2.3 && p.attrs.shooting >= 13 && this.rnd() < .27;
      let on = .242+delta(p,opts.header?'heading':dd>19?'longShots':'finishing')*.012 + p.attrs.shooting * .014 + xg * .62 - Math.max(0, dd - 14) * .0085 - (pressure < 2.05 ? .123 : 0) - (opts.header ? .095 : 0) - (opts.fk ? .085 : 0);
      if (opts.fk) on += (fkSkill - 12) * .022 - (1 - p.cond) * .079;
      if (opts.pen) on = .86 + (penSkill - 13) * .015 + (p.attrs.composure - 13) * .008
        - (1 - p.cond) * .107 - stakes * clamp(.042 - (p.attrs.composure - 12) * .004, .012, .072);
      if(!opts.header&&!opts.pen&&p.assignment&&pressure<3)on-=(1-p.assignment.footFit)*.28+.075*this.footCost(p,pressure);
      const onFrame = this.rnd() < clamp(on, .105, .94);
      let side = this.rnd() < .5 ? -1 : 1;
      if (!opts.pen && Math.abs(keeper.y - CY) > 1.2 && this.rnd() < .64) side = keeper.y > CY ? -1 : 1;
      let y, z;
      if (onFrame) {
        const placement = clamp(.23 + .53 * this.rnd() + p.attrs.composure * .006 + (opts.pen ? .052 + (penSkill - 11) * .009 : 0), .28, .93);
        y = CY + side * (GOAL_HALF - .17) * placement;
        z = lob ? .52 + this.rnd() * 1.08 : this.rnd() < .63 ? .16 + this.rnd() * .62 : 1.03 + this.rnd() * 1.02;
      } else {
        const near = this.rnd();
        if (near < .084) { y = CY + side * (GOAL_HALF - .012); z = .45 + this.rnd() * 1.33; }
        else if (near < .42) { y = CY + side * (1 + this.rnd() * 2.37); z = GOAL_H + .27 + this.rnd() * 1.78; }
        else { y = CY + side * (GOAL_HALF + .32 + this.rnd() * 3.67); z = .18 + this.rnd() * 1.4; }
      }
      const power = opts.pen ? 23.5 + penSkill * .22 + this.rnd() * 5.4
        : opts.header ? 16 + this.rnd() * 2.5 : (curl ? 15.0 : 18.5) + p.attrs.shooting * .43 + this.rnd() * 3.4;
      const distLine = dist(b.x, b.y, goalLine, y);
      const flightTime = lob ? clamp(1.24 + dd * .018, 1.48, 1.83) : Math.max(.11, P.airTime(distLine, power));
      const pass = this.lastPass;
      const assist = !opts.pen && pass && pass.team === p.team && pass.receiver === p && pass.player !== p && this.elapsed - pass.t < 8.4 ? pass.player : null;
      const shot = { x: b.x, y: b.y, team: p.team, xg, outcome: 'pending', minute, half: this.half, periodTime:this.t, direction: d, pen: !!opts.pen };
      this.shotMap.push(shot); team.stats.shots++; team.stats.xG += xg; p.stats.shots++;
      if (assist) assist.stats.keyPasses++;
      const guessSide = opts.pen && keeper && this.rnd() < clamp(.40 + keeper.attrs.positioning * .008 - (penSkill - 11) * .006, .32, .59)
        ? side : this.rnd() < .5 ? -1 : 1;
      const f = this.kick(p, goalLine, y, {
        id: ++this.shotId, kind: 'shot', technique: lob ? 'lob' : opts.header ? 'header' : 'shot', shooter: p, firstTime: !!opts.firstTime,
        xG: xg, goalX: gx, targetZ: z, onFrame, assist, shot, pen: !!opts.pen, header: !!opts.header, fk: !!opts.fk,
        wallIds: wall.map(q => q.id), screened, leap,
        guessY: CY + guessSide * (1.89 + this.rnd() * .69)
      }, flightTime < .49 && z < .38 && !opts.header && !lob ? { arrival: power * .91 } : {
        seconds: flightTime, height: z, bend: curl ? -side * (2.05 + this.rnd() * 2.3) : opts.fk ? (this.rnd() - .5) * 1.9 : opts.header || lob ? 0 : (this.rnd() - .5) * 1.34,
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

    goalDepth(defending, x) { return this.teams[defending].attackDir > 0 ? x : L - x; }

    // An emergency tip or glance uses the contact and the available change
    // of direction. It does not award anything; the live ball can still be
    // played before it crosses the line.
    turnBehind(p, speed, high = false) {
      const b = this.ball, d = this.teams[p.team].attackDir, line = d > 0 ? 0 : L;
      const depth = (b.x - line) * d;
      if (depth < 0 || depth > 8.3) return false;
      const seconds = clamp((depth + P.RADIUS) / clamp(speed * .42, 3.5, 10), .14, .74);
      const x = line - d * (P.RADIUS + .035);
      if (high && b.z > 1.32 && (GOAL_H + .28 - b.z) / seconds < 8.2) {
        P.aerial(b, x, b.y, seconds, GOAL_H + .32);
        return true;
      }
      const side = b.y >= CY ? 1 : -1;
      const y = clamp(b.y + side * Math.max(1.1, GOAL_HALF + .73 - Math.abs(b.y - CY)), .35, W - .35);
      if (Math.abs(y - b.y) > seconds * clamp(speed * .55, 5, 13.2) || Math.abs(y - CY) < GOAL_HALF + .28) return false;
      P.aerial(b, x, y, seconds, Math.max(.32, b.z * .68));
      return true;
    }

    deflection(p) {
      const b = this.ball;
      b.owner = null; b.flight = null; b.lastTouch = p; b.releaseT = this.elapsed;
      p.contactT = .40; this.lastPass = null; this.brainIn = 0;
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
        if (hand && age < .137 + (20 - q.attrs.reflexes) * .009 + (f.screened ? .075 : 0)) continue;
        const wall = f.wallIds?.includes(q.id) && age < .8;
        const reach = hand ? delta(q,'aerialReach')*.025+(f.pen ? 1.98 : 2.02 + q.attrs.reflexes * .054) : .94;
        if (Math.abs(q.x - until.x) > reach + 1 || Math.abs(q.y - until.y) > reach + 1) continue;
        const fraction = clamp(((q.x - before.x) * dx + (q.y - before.y) * dy) / den, 0, 1);
        const x = before.x + dx * fraction, y = before.y + dy * fraction, z = lerp(before.z, until.z, fraction);
        const gap = dist(q.x, q.y, x, y);
        const jump = wall && f.leap && age > .22;
        if (gap > reach || z > (hand ? (2.10 + q.attrs.reflexes * .033) - gap * .18 : (jump ? 2.06 : 1.52) - gap * .28) || (jump && z < .20)) continue;
        q.shotTried = f.id;
        const speed = Math.hypot(b.vx, b.vy);
        const room = 1 - gap / reach;
        const chance = hand ? delta(q,'oneOnOnes')*.003+(f.pen ? .26 + room * .14 + (q.attrs.reflexes - 14) * .012 : .76 + room * .22 + (q.attrs.reflexes + q.attrs.handling - 28) * .014 - f.xG * .45 - Math.max(0, speed - 25) * .009) : .37 + q.attrs.positioning * .016 + room * .23 + (wall ? .12 : 0);
        if (this.rnd() >= clamp(chance, .11, hand ? .94 : .88)) continue;
        b.x = x; b.y = y; b.z = z; b.flight = b.restart = null; b.ax = b.ay = 0;
        b.lastTouch = q; b.releaseT = this.elapsed; this.lastPass = null; this.brainIn = 0;
        if (hand) {
          const shotOnTarget = f.onFrame;
          this.finishShot(f, shotOnTarget ? 'save' : 'miss');
          if (shotOnTarget) { q.stats.saves++; this.teams[q.team].stats.saves++; this.adjust(q, .17 + f.xG * .38); }
          const stretched = 1 - room;
          const catches = this.rnd() < clamp(.22 + room * .51 + q.attrs.handling * .012 - speed * .010 - Math.max(0, z - 1.1) * .10, .14, .82);
          const tip = !catches && dxGoal < 6.7 && (z > 1.40 || Math.abs(y - CY) > 1.38 || stretched > .59)
            && this.rnd() < .54 + stretched * .29 && this.turnBehind(q, speed, z > 1.48 && Math.abs(y - CY) < 3.1);
          if (f.pen) this.say('penmiss', { k: q.name, p: f.shooter.name }, { team: q.team, key: true });
          else if (tip) this.emit('save', { text: `${q.name} gets a hand to it and tips it away.`, team: q.team, key: shotOnTarget && f.xG > .17 });
          else if (!shotOnTarget) this.emit('catch', { text: `${q.name} gets a hand to it.`, team: q.team });
          else this.say(catches ? 'catch' : 'save', { p: f.shooter.name, k: q.name }, { team: q.team, key: f.xG > .17 });
          if (catches) { b.vx = b.vy = b.vz = 0; this.claim(q, 0, true); }
          else if (tip) this.deflection(q);
          else {
            const d = this.teams[q.team].attackDir, flank = y > q.y ? 1 : -1;
            b.vx = d * (4.8 + this.rnd() * 5.5);
            b.vy = flank * (4.3 + this.rnd() * 5.7);
            b.vz = 1.35 + this.rnd() * 2.8;
          }
        } else {
          this.finishShot(f, 'block'); this.adjust(q, .13);
          const wanted = Math.atan2(dy, dx) + (this.rnd() < .5 ? -1 : 1) * (1.12 + this.rnd() * 1.05);
          if (dxGoal < 8.3 && Math.abs(y - CY) > 2.55 && this.rnd() < .61 && this.turnBehind(q, speed)) this.deflection(q);
          else { b.vx = Math.cos(wanted) * speed * .37; b.vy = Math.sin(wanted) * speed * .37; b.vz = 1.9 + this.rnd() * 2.1; }
          if (wall) this.emit('block', { text: `${q.name} blocks the free kick in the wall.`, team: q.team });
          else this.say('block', { p: f.shooter.name, d: q.name }, { team: q.team, key: f.xG > .17 });
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

    resolveShotLine(lineX, at = this.ball, before = this.ball, dt = 0) {
      const b = this.ball, f = b.flight;
      if (!f || f.kind !== 'shot') { this.considerGoal(lineX); return; }
      const offset = Math.abs(at.y - CY);
      const post = Math.abs(offset - GOAL_HALF) <= .157 && at.z <= GOAL_H + .065;
      const bar = offset < GOAL_HALF + .075 && Math.abs(at.z - GOAL_H) <= .124;
      const departure = !post && !bar ? Runoff.capture(b, before, { axis: 'x', line: lineX }, dt) : null;
      b.x = at.x; b.y = at.y; b.z = at.z;
      if (!post && !bar && offset < GOAL_HALF - .062 && at.z < GOAL_H - .056) { this.considerGoal(lineX, f, departure); return; }
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
      this.goalRestart(lineX, at.y, this.teams[1 - f.shooter.team], departure);
    }

    considerGoal(line, shot = null, departure) {
      const scoringTeam = this.teams.find(t => (t.attackDir > 0 ? L : 0) === line).idx;
      const restart = this.ball.restart;
      if (restart && (restart.indirect || restart.taker.team !== scoringTeam)) {
        this.goalRestart(line, this.ball.y, this.teams[1 - scoringTeam], departure);
        return;
      }
      const evidence = this.attackCheck;
      if (evidence?.team === scoringTeam && this.elapsed - evidence.at <= ATTACK_CHECK_WINDOW) {
        this.beginReview({ kind: 'goal', line, shot, team: scoringTeam, evidence }, scoringTeam, 'VAR is checking for offside in the buildup. The score stays as it is for now.');
        return;
      }
      this.goalScored(line, shot);
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
      this.concedeTeam = 1 - si; this.phase = 'goal'; this.phaseTimer = 8.0; this.lastPass = null; this.attackCheck = null;
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
