/* Touchline 26 - original, fixed-overhead presentation for the Classic 2D view. */
(function (global) {
  'use strict';
  const { L, W, CX, CY, GOAL_HALF, BOX_L, BOX_HALF, SIX_L, SIX_HALF, PEN } = global.TLEngine;
  const { APRON_END, APRON_SIDE } = global.TLPitch;
  const TAU = Math.PI * 2;
  // Fixed to the venue, not to the direction of attack. The dugouts don't
  // trade places when the teams change ends.
  const AREA = { inset: 8, middleGap: 2.4, back: -7.12, front: -1.12, seatsY: -5.82, coachY: -2.48 };
  const areaWidth = CX - AREA.inset - AREA.middleGap;
  const dugoutLeft = side => side ? CX + AREA.middleGap : AREA.inset;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const mix = (a, b, t) => a + (b - a) * t;
  const surname = p => p.name.split(' ').pop();
  const paint = (ctx, x, y, r, fill) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = fill; ctx.fill(); };

  function round(ctx, x, y, w, h, radius) {
    const r = Math.min(radius, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }

  // One small fixed-seed texture. It never draws from the match RNG.
  function lawnGrain() {
    const bitmap = document.createElement('canvas');
    bitmap.width = bitmap.height = 96;
    const ctx = bitmap.getContext('2d');
    const image = ctx.createImageData(96, 96);
    let seed = 441537;
    for (let i = 0; i < image.data.length; i += 4) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const light = (seed >>> 24) & 1 ? 247 : 9;
      image.data[i] = light; image.data[i + 1] = light; image.data[i + 2] = light;
      image.data[i + 3] = 2 + ((seed >>> 16) & 13);
    }
    ctx.putImageData(image, 0, 0);
    return bitmap;
  }

  function lightKit(hex) {
    const h = hex.replace('#', '');
    return (.21 * parseInt(h.slice(0, 2), 16) + .72 * parseInt(h.slice(2, 4), 16) + .07 * parseInt(h.slice(4, 6), 16)) > 163;
  }

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.back = document.createElement('canvas');
      this.grain = lawnGrain();
      this.dpr = 1;
      this.drawn = [];
      this.touchline = [];
      this.reduced = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)');
      this.resize();
      if (typeof global.ResizeObserver === 'function') {
        this.observer = new global.ResizeObserver(() => this.resize());
        this.observer.observe(canvas.parentElement);
      }
      this.onResize = () => this.resize();
      global.addEventListener('resize', this.onResize, { passive: true });
    }

    dispose() { this.observer?.disconnect(); global.removeEventListener('resize', this.onResize); }
    resize() {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width)), height = Math.max(1, Math.round(rect.height));
      const dpr = Math.min(2, global.devicePixelRatio || 1);
      if (width === this.width && height === this.height && dpr === this.dpr) return;
      this.width = width; this.height = height; this.dpr = dpr; this.needsPaint = true;
      this.canvas.width = this.back.width = Math.round(width * dpr);
      this.canvas.height = this.back.height = Math.round(height * dpr);
      this.compact = width < 650;
      const margin = this.compact ? 8 : 14;
      this.scale = Math.min((width - margin) / (L + 2 * (APRON_END + .95)), (height - margin) / (W + 2 * (APRON_SIDE + 1.1)));
      this.scale = Math.max(.05, this.scale);
      this.ox = (width - L * this.scale) / 2;
      this.oy = (height - W * this.scale) / 2 + this.scale * .28;
      this.radius = clamp(this.scale * 1.03 + .35, 4.1, 9.6);
      this.seating = null;
      this.buildStadium();
    }

    buildStadium() {
      const ctx = this.back.getContext('2d');
      const s = this.scale, x = n => this.ox + n * s, y = n => this.oy + n * s;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const bg = ctx.createRadialGradient(this.width / 2, this.height * .51, s * 19, this.width / 2, this.height * .51, this.width * .59);
      bg.addColorStop(0, '#2b3f31'); bg.addColorStop(.54, '#1b2a21'); bg.addColorStop(1, '#111a14');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, this.width, this.height);

      ctx.save();
      ctx.strokeStyle = 'rgba(170,192,171,.027)'; ctx.lineWidth = 1;
      for (let k = -this.height; k < this.width; k += 14) {
        ctx.beginPath(); ctx.moveTo(k, this.height); ctx.lineTo(k + this.height, 0); ctx.stroke();
      }
      ctx.restore();

      const shell = (padX, padY, r, fill, stroke) => {
        round(ctx, x(-padX), y(-padY), (L + 2 * padX) * s, (W + 2 * padY) * s, r * s);
        if (fill) { ctx.fillStyle = fill; ctx.fill(); }
        if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = Math.max(.5, .1 * s); ctx.stroke(); }
      };
      shell(APRON_END + .88, APRON_SIDE + .9, 4, '#29372e', '#43564a');
      shell(APRON_END, APRON_SIDE, 3.1, '#38483c', '#69806f');
      // A real strip of grass and service path runs beyond the white lines;
      // the near fence is not the edge of the camera.
      shell(APRON_END - 2.15, APRON_SIDE - .65, 2.8, '#313f35', '#45594a');
      shell(5.2, 3.9, .65, '#405b3b', '#728f69');
      const strip = (x0, y0, ww, hh, color) => { ctx.fillStyle = color; ctx.fillRect(x(x0), y(y0), ww * s, hh * s); };
      for (let a = 0; a <= L - 2.1; a += 2.75) {
        const alternate = Math.round(a * 3) % 4 === 0;
        strip(a, W + 5.75, 2.04, .78, alternate ? '#617467' : '#465a4c');
        if (a < 6 || a > L - 7) strip(a, -6.55, 2.04, .79, '#4f6454');
      }
      for (let a = 2.1; a < W - 2.1; a += 2.65) {
        strip(-8.98, a, .66, 1.98, '#506658');
        strip(L + 8.32, a, .66, 1.98, '#506658');
      }

      const grass = ctx.createLinearGradient(x(-2), y(0), x(L), y(W));
      grass.addColorStop(0, '#4e6b3d'); grass.addColorStop(.47, '#526f43'); grass.addColorStop(1, '#405e39');
      shell(3.95, 2.98, .55, '#4a633f', '#9bb08a');
      const lx = x(0), ly = y(0), lw = L * s, lh = W * s;
      ctx.fillStyle = grass; ctx.fillRect(lx, ly, lw, lh);
      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = i % 2 ? 'rgba(212,227,170,.055)' : 'rgba(12,27,19,.054)';
        ctx.fillRect(lx + i * lw / 12, ly, lw / 12 + .2, lh);
      }
      ctx.save();
      ctx.beginPath(); ctx.rect(lx, ly, lw, lh); ctx.clip();
      ctx.fillStyle = ctx.createPattern(this.grain, 'repeat') || 'transparent';
      ctx.fillRect(lx, ly, lw, lh);
      ctx.restore();

      // Dugout shelters sit behind the marked technical areas on the far side.
      const line = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x(x1), y(y1)); ctx.lineTo(x(x2), y(y2)); ctx.stroke(); };
      const rect = (x0, y0, ww, hh) => ctx.strokeRect(x(x0), y(y0), ww * s, hh * s);
      ctx.fillStyle = '#79956e';
      for (const a of [5, 17, 29, 67, 79, 91]) ctx.fillRect(x(a), y(W + 3.72), 9.2 * s, .44 * s);
      for (const side of [0, 1]) {
        const a = dugoutLeft(side), w = areaWidth, inner = side ? a + 8.1 : a + .45;
        round(ctx, x(a), y(AREA.back), w * s, (AREA.front - AREA.back) * s, .5 * s);
        ctx.fillStyle = '#355447'; ctx.fill();
        ctx.strokeStyle = '#96b4a2'; ctx.lineWidth = Math.max(.55, s * .095); ctx.stroke();
        round(ctx, x(inner), y(AREA.back + .19), (w - 8.55) * s, 2.61 * s, .49 * s);
        ctx.fillStyle = '#182c25'; ctx.fill();
        ctx.strokeStyle = '#708b7c'; ctx.lineWidth = Math.max(.5, s * .085); ctx.stroke();
        ctx.strokeStyle = '#c2d6b8b8'; ctx.lineWidth = Math.max(.56, s * .092);
        ctx.setLineDash([Math.max(2, s * .65), Math.max(2, s * .65)]);
        line(a + .4, AREA.front, a + w - .4, AREA.front);
        ctx.setLineDash([]);
      }

      // Line widths are physical where possible, with a floor for small phones.
      const circle = (x0, y0, r, lo = 0, hi = TAU) => {
        ctx.beginPath(); ctx.arc(x(x0), y(y0), r * s, lo, hi); ctx.stroke();
      };
      ctx.strokeStyle = '#e4ecd9de'; ctx.lineWidth = Math.max(.87, s * .133);
      rect(0, 0, L, W); line(CX, 0, CX, W);
      circle(CX, CY, 9.15);
      for (const gx of [0, L]) {
        const a = gx === 0 ? 1 : -1;
        rect(a > 0 ? 0 : L - BOX_L, CY - BOX_HALF, BOX_L, 2 * BOX_HALF);
        rect(a > 0 ? 0 : L - SIX_L, CY - SIX_HALF, SIX_L, 2 * SIX_HALF);
        const th = Math.acos((BOX_L - PEN) / 9.15), mid = a > 0 ? 0 : Math.PI;
        circle(gx + PEN * a, CY, 9.15, mid - th, mid + th);
        paint(ctx, x(gx + PEN * a), y(CY), Math.max(1.05, s * .16), '#e3edda');
      }
      paint(ctx, x(CX), y(CY), Math.max(1.2, s * .18), '#e3edda');
      circle(0, 0, 1, 0, Math.PI / 2); circle(L, 0, 1, Math.PI / 2, Math.PI);
      circle(L, W, 1, Math.PI, Math.PI * 1.5); circle(0, W, 1, Math.PI * 1.5, TAU);
      for (const gx of [0, L]) {
        const side = gx === 0 ? -1 : 1, depth = 2.55;
        const gx0 = gx === 0 ? -depth : L;
        ctx.fillStyle = '#182a226b'; ctx.fillRect(x(gx0), y(CY - GOAL_HALF + .35), depth * s, (GOAL_HALF * 2 + .33) * s);
        ctx.fillStyle = '#d6e6d824'; ctx.fillRect(x(gx0), y(CY - GOAL_HALF), depth * s, GOAL_HALF * 2 * s);
        ctx.strokeStyle = '#dfe8dc64'; ctx.lineWidth = Math.max(.32, s * .059);
        for (let i = 1; i < 5; i++) line(gx + side * depth * i / 5, CY - GOAL_HALF, gx + side * depth * i / 5, CY + GOAL_HALF);
        for (let i = 1; i < 10; i++) {
          const z = CY - GOAL_HALF + GOAL_HALF * 2 * i / 10;
          line(gx, z, gx + side * depth, z);
        }
        ctx.strokeStyle = '#e4ecd7de'; ctx.lineWidth = Math.max(.9, s * .148);
        rect(gx0, CY - GOAL_HALF, depth, GOAL_HALF * 2);
        for (const yy of [CY - GOAL_HALF, CY + GOAL_HALF]) paint(ctx, x(gx), y(yy), Math.max(.8, .17 * s), '#f6f8ed');
      }
      for (const xx of [0, L]) for (const yy of [0, W]) {
        paint(ctx, x(xx), y(yy), Math.max(.9, .16 * s), '#f0d372');
      }
    }

    ballProjection(x, y, height) {
      const s = this.scale, z = Math.max(0, height || 0), rise = z * s;
      const gx = this.ox + x * s, gy = this.oy + y * s;
      // Compress lift only at the very top edge: keep the ball in view without moving the pitch.
      const room = Math.max(0, gy - 6), lift = rise * .82, softLimit = room * .80;
      const vertical = lift <= softLimit ? lift : softLimit + (room - softLimit) * (1 - Math.exp(-(lift - softLimit) / Math.max(.01, room - softLimit)));
      const shadowX = clamp(gx - rise * .12, this.ox + Math.min(0, x) * s, this.ox + Math.max(L, x) * s);
      const shadowY = clamp(gy + rise * .24, this.oy + Math.min(0, y) * s, this.oy + Math.max(W, y) * s);
      return { x: gx + rise * .10, y: gy - vertical, shadowX, shadowY, z };
    }

    drawReferee(referee, showName) {
      const ctx = this.ctx, s = this.scale;
      const x = this.ox + referee.x * s, y = this.oy + referee.y * s;
      const r = Math.max(4.9, this.radius * .92), d = r * 2;
      round(ctx, x - r + .8, y - r + 1.4, d, d, r * .34);
      ctx.fillStyle = '#09180db8'; ctx.fill();
      round(ctx, x - r, y - r, d, d, r * .34);
      ctx.fillStyle = '#142722'; ctx.fill();
      ctx.strokeStyle = '#bae9e3'; ctx.lineWidth = 1.15; ctx.stroke();
      ctx.fillStyle = '#effffa';
      ctx.font = `850 ${Math.max(7.7, r * 1.27)}px Inter,system-ui,sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('R', x, y + .35);
      const badge = { x: x - r - 1, y: y - r - 1, w: d + 2, h: d + 2 };
      if (referee.signal) this.drawSignal(x, y, r, referee.signal);
      if (!showName) return [badge];
      const label = this.compact ? 'REF' : 'REFEREE', size = this.compact ? 8 : 9;
      ctx.font = `780 ${size}px Inter,system-ui,sans-serif`;
      const w = ctx.measureText(label).width + 8, h = size + 5;
      const tag = { x: clamp(x - w / 2, 2, this.width - w - 2), y: Math.min(y + r + 3, this.height - h - 2), w, h };
      round(ctx, tag.x, tag.y, w, h, 4);
      ctx.fillStyle = '#142722ed'; ctx.fill();
      ctx.fillStyle = '#d1f8ee'; ctx.fillText(label, tag.x + w / 2, tag.y + h / 2 + .4);
      return [badge, tag];
    }

    drawSignal(x, y, radius, signal) {
      const ctx = this.ctx, { kind } = signal, r = radius;
      const colour = kind === 'red' ? '#ff535b' : kind === 'yellow' ? '#ffdf58' : kind === 'check' ? '#90daf2' : '#e5f7ee';
      let dx = signal.dir ?? .55, dy = signal.dir ? -.14 : -.84;
      if (Number.isFinite(signal.x)) {
        dx = this.ox + signal.x * this.scale - x; dy = this.oy + signal.y * this.scale - y;
      }
      if (kind === 'indirect' || kind === 'yellow' || kind === 'red') { dx = kind === 'indirect' ? .11 : .53; dy = -1; }
      const norm = Math.hypot(dx, dy) || 1, u = dx / norm, v = dy / norm;
      const arm = r * (kind === 'whistle' || kind === 'check' ? 1.60 : 2.45);
      const ax = clamp(x + u * arm, 7, this.width - 7), ay = clamp(y + v * arm, 9, this.height - 7);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(x + u * r * .82, y + v * r * .82); ctx.lineTo(ax, ay);
      ctx.strokeStyle = '#15251cf0'; ctx.lineWidth = 4.8; ctx.stroke();
      ctx.strokeStyle = colour; ctx.lineWidth = 2.15; ctx.stroke();
      if (kind === 'yellow' || kind === 'red') {
        const w = Math.max(7.5, r * 1.32), h = Math.max(10, r * 1.72);
        round(ctx, ax - w / 2, clamp(ay - h * .75, 2, this.height - h - 1), w, h, 1.25);
        ctx.fillStyle = colour; ctx.fill(); ctx.strokeStyle = '#18231d'; ctx.lineWidth = 1.45; ctx.stroke();
      } else if (kind === 'wait') {
        paint(ctx, ax, ay, 3.55, '#15251c'); paint(ctx, ax, ay, 2.4, colour);
      } else if (kind === 'whistle' || kind === 'check') {
        ctx.strokeStyle = colour; ctx.lineWidth = 1.35;
        ctx.beginPath(); ctx.arc(x, y, r + 4.2, -.86, 1.02); ctx.stroke();
      } else if (kind !== 'indirect') {
        ctx.beginPath(); ctx.moveTo(ax - u * 4 - v * 2.55, ay - v * 4 + u * 2.55); ctx.lineTo(ax, ay);
        ctx.lineTo(ax - u * 4 + v * 2.55, ay - v * 4 - u * 2.55); ctx.stroke();
      }
      ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
    }

    drawThrowHands(x, y, pose, ball, kit) {
      const ctx = this.ctx, r = this.radius, sideX = -Math.sin(pose.dir), sideY = Math.cos(pose.dir);
      const { x: bx, y: by } = this.ballProjection(ball.x, ball.y, ball.z);
      const bend = r * (1.28 + Math.sin(pose.load * Math.PI) * .48);
      // Keep the paired hands legible beside the ball marker on a small pitch.
      const grip = Math.max(3.75, r * .73);
      for (const sign of [-1, 1]) {
        const hx = bx + sideX * grip * sign, hy = by + sideY * grip * sign;
        ctx.beginPath(); ctx.moveTo(x + sideX * r * .66 * sign, y + sideY * r * .66 * sign);
        ctx.quadraticCurveTo((x + bx) * .5 + sideX * bend * sign, (y + by) * .5 + sideY * bend * sign, hx, hy);
        ctx.lineCap = 'round'; ctx.strokeStyle = '#17271b'; ctx.lineWidth = 3.9; ctx.stroke();
        ctx.strokeStyle = kit; ctx.lineWidth = 2.1; ctx.stroke();
        paint(ctx, hx, hy, 1.54, '#f1d9ae');
      }
      ctx.lineCap = 'butt';
    }

    // The same pixel coordinates paint the badges and position native hit targets.
    // Only recompute them for a new frame roster or a viewport change.
    positionDugouts(match, frame, managers) {
      const home = frame?.dugouts?.[0] || match.teams[0].dugout;
      const away = frame?.dugouts?.[1] || match.teams[1].dugout;
      const last = this.seating;
      if (last && last.match === match && last.home === home && last.away === away && last.managers === managers) return;
      this.seating = { match, home, away, managers };
      const s = this.scale;
      this.touchline = match.teams.flatMap((team, side) => {
        const seats = side ? away : home, byId = new Map(team.players.map(p => [p.id, p]));
        const staffX = CX - 5.94, managerRadius = clamp(s * 1.04, 5.8, 8.25);
        const benchRadius = clamp(s * .96, 4.25, 7.4), span = areaWidth - 12.4;
        const point = (x, y, r, tapW, tapH) => ({
          x: this.ox + (side ? L-x : x) * s, y: this.oy + y * s, r, tapW, tapH
        });
        const bench = seats.map(({ id, used }, i) => {
          const p = byId.get(id);
          const xx = AREA.inset + 2.5 + (seats.length === 1 ? span / 2 : i * span / Math.max(1, seats.length-1));
          return { id, name: p.name, num: p.num, role: p.pos, team: side, club: team.club, kind: used ? 'Substituted off' : 'Substitute',
            ...point(xx, AREA.seatsY, benchRadius, clamp(span * s / Math.max(1, seats.length-1) - .65, 9, 25), clamp(benchRadius*2+8, 17, 28)) };
        });
        const manager = { id: `manager-${side}`, name: managers?.[side] || `${team.club.name} manager`, team: side, club: team.club, kind: 'Manager',
          ...point(staffX, AREA.coachY, managerRadius, clamp(s*7.5, 16, 30), clamp(managerRadius*2+8, 19, 30)) };
        return [...bench, manager];
      });
    }

    drawDugouts(match, frame, managers, selected) {
      this.positionDugouts(match, frame, managers);
      const ctx = this.ctx, s = this.scale;
      for (const t of match.teams) {
        ctx.fillStyle = t.club.primary;
        ctx.fillRect(this.ox + (dugoutLeft(t.idx) + .40) * s, this.oy + (AREA.back + .12) * s, (areaWidth - .8) * s, Math.max(.95, s * .23));
      }
      for (const p of this.touchline) {
        const { x, y, r } = p, isManager = p.kind === 'Manager', off = p.kind === 'Substituted off';
        const kit = off ? '#405548' : p.role === 'GK' ? p.club.gk : p.club.primary;
        paint(ctx, x + .42, y + .85, r + .84, '#0e1b17b8');
        if (p.id === selected) {
          ctx.beginPath(); ctx.arc(x, y, r + 2.15, 0, TAU);
          ctx.strokeStyle = '#e2ffb8'; ctx.lineWidth = 1.22; ctx.stroke();
        }
        paint(ctx, x, y, r, kit);
        ctx.strokeStyle = off ? '#bbc8bd' : '#f2f9ed'; ctx.lineWidth = isManager ? 1.03 : .74; ctx.stroke();
        ctx.fillStyle = lightKit(kit) ? '#151d18' : '#f8fbf8';
        ctx.font = `800 ${clamp(r*1.21, 6.4, 9.6)}px Inter,system-ui,sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(isManager ? 'M' : p.num, x, y+.22);
      }
    }

    drawAttendant(ball, projection) {
      if (!(ball.carried > .006)) return;
      const ctx = this.ctx, s = this.scale, r = clamp(s * .71, 2.6, 5.30);
      const end = Math.abs(ball.x-CX)/L > Math.abs(ball.y-CY)/W;
      const x = this.ox + ball.x*s + (end ? Math.sign(ball.x-CX) * r*1.30 : r*.74);
      const y = this.oy + ball.y*s + (!end ? Math.sign(ball.y-CY) * r*1.18 : r*.56);
      ctx.save(); ctx.globalAlpha = ball.carried;
      paint(ctx, x+.55, y+.94, r+1.04, '#1620189c');
      paint(ctx, x, y, r, '#cbd981');
      ctx.strokeStyle = '#17271c'; ctx.lineWidth = .85; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(projection.x, projection.y);
      ctx.strokeStyle = '#b5c574'; ctx.lineWidth = Math.max(1.3, r*.50); ctx.stroke();
      ctx.restore();
    }

    draw(match, options = {}) {
      if (!match) return;
      this.needsPaint = false;
      const ctx = this.ctx, frame = options.frame;
      const players = frame ? frame.players : match.onPitchPlayers();
      const ball = frame ? frame.ball : match.visibleBall();
      const pose = frame ? frame.restartPose : match.restartPose();
      const referee = frame ? frame.referee : options.referee;
      const ownerId = frame ? frame.ownerId : ball.owner && ball.owner.id;
      const receiver = !frame && !options.ready && ball.flight && ball.flight.kind === 'pass' && ball.flight.intended;
      const active = !options.ready && options.live !== false;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(this.back, 0, 0);
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const s = this.scale, r = this.radius, alpha = options.alpha == null ? 1 : options.alpha;
      const toScreen = (x, y) => [this.ox + x * s, this.oy + y * s];
      this.drawDugouts(match, frame, options.managers, options.technical);
      const positions = players.map(p => {
        let x = p.x, y = p.y;
        if (!frame && alpha < 1 && Number.isFinite(p.prevX) && Math.abs(x - p.prevX) + Math.abs(y - p.prevY) < 2.2) {
          x = mix(p.prevX, x, alpha); y = mix(p.prevY, y, alpha);
        }
        if (options.ready && !frame) {
          const team = match.teams[p.team], d = team.attackDir;
          const home = match.homePos(p, team);
          const depth = d > 0 ? home.x : L - home.x;
          // Compress only the forward line into its own half for the parked view;
          // unlike the engine’s clamped restart targets, this keeps markers apart.
          const lined = depth < 38 ? depth : Math.min(CX - 2.45, 38 + (depth - 38) * .296);
          x = d > 0 ? lined : L - lined; y = home.y;
          if (p === match.kickoffTaker) { x = p.tx; y = p.ty; }
        }
        return { p, xy: toScreen(x, y) };
      }).sort((a, b) => a.xy[1] - b.xy[1]);
      const restart = options.restart;
      if (restart && !restart.taken && restart.stage !== 'windup') {
        const [x, y] = toScreen(restart.x, restart.y);
        ctx.beginPath(); ctx.arc(x, y, clamp(s * 1.62, 6.8, 14), 0, TAU);
        ctx.strokeStyle = restart.indirect ? '#ffe3a2d9' : '#ebf3c2db'; ctx.lineWidth = 1.25; ctx.stroke();
      }
      this.drawn = [];
      for (const { p, xy: [x, y] } of positions) {
        // Full-size 2D markers would overlap in a real shoulder-to-shoulder wall.
        const wall = pose?.wall?.includes(p.id);
        const r = wall ? clamp(s * .52, 1.8, this.radius * .69) : this.radius;
        const club = match.teams[p.team].club, keeper = (p.role || p.pos) === 'GK';
        const kit = keeper ? club.gk : club.primary;
        const selected = p.id === options.selected;
        const carded = p.id === referee?.signal?.player;
        paint(ctx, x + (wall ? .35 : 1), y + (wall ? .9 : 1.65), r + (wall ? .55 : .95), 'rgba(8,18,12,.51)');
        if (selected || (active && p.id === ownerId)) {
          ctx.beginPath(); ctx.arc(x, y, r + (selected ? 3.3 : 2.65), 0, TAU);
          ctx.strokeStyle = selected ? '#defaaf' : '#d9e8c9b0'; ctx.lineWidth = 1.1; ctx.stroke();
        }
        paint(ctx, x, y, r, kit);
        ctx.strokeStyle = '#f1f3e7eb'; ctx.lineWidth = wall ? .68 : Math.max(.75, Math.min(1.25, r * .145)); ctx.stroke();
        if (carded) {
          ctx.beginPath(); ctx.arc(x, y, r + 2.5, 0, TAU);
          ctx.strokeStyle = referee.signal.kind === 'red' ? '#ff7378' : '#ffe18a'; ctx.lineWidth = 1.25; ctx.stroke();
        }
        ctx.fillStyle = lightKit(kit) ? '#101913' : '#fff';
        ctx.font = `750 ${clamp(r * 1.24, 5.65, 11.2)}px Inter,system-ui,sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (!wall) ctx.fillText(String(p.num), x, y + .25);
        if (p.yellow > 0 && !wall) {
          ctx.fillStyle = '#f9da72'; ctx.fillRect(x + r * .6, y - r * 1.12, Math.max(2, r * .4), Math.max(3, r * .67));
        }
        if (pose?.thrower === p.id) this.drawThrowHands(x, y, pose, ball, kit);
        this.drawn.push({ p, x, y });
      }

      const officialLabels = referee ? this.drawReferee(referee, options.ready || options.names) : [];

      // x/y is where the ball is over the grass; z raises its sprite independently.
      const interpolate = !frame && alpha < 1 && Number.isFinite(ball.prevX) && Math.abs(ball.x - ball.prevX) + Math.abs(ball.y - ball.prevY) < 2.55;
      const bxGround = interpolate ? mix(ball.prevX, ball.x, alpha) : ball.x;
      const byGround = interpolate ? mix(ball.prevY, ball.y, alpha) : ball.y;
      const projection = this.ballProjection(bxGround, byGround, interpolate ? mix(ball.prevZ, ball.z, alpha) : ball.z);
      const { x: bx, y: by, shadowX, shadowY, z } = projection;
      const base = clamp(s * .37 + 1.3, 2.6, 4.25);
      const radius = base * (1 + Math.min(z, 10) * .012);
      if (z < .05) paint(ctx, bx + 1, by + 1.7, radius + 1.15, '#0c170d77');
      else {
        const spread = base + 1.25 + Math.min(2.85, z * .19);
        ctx.save();
        ctx.translate(shadowX + .64, shadowY + 1.12);
        ctx.scale(1.20, .66);
        const shadow = ctx.createRadialGradient(0, 0, spread * .23, 0, 0, spread);
        const darkness = clamp(.71 - z * .018, .46, .68);
        shadow.addColorStop(0, `rgba(9,18,11,${darkness})`);
        shadow.addColorStop(.56, `rgba(9,18,11,${darkness * .77})`);
        shadow.addColorStop(1, 'rgba(9,18,11,0)');
        paint(ctx, 0, 0, spread, shadow);
        ctx.restore();
      }
      if (!frame && options.live && !(this.reduced && this.reduced.matches) && !ball.owner && !this.compact && z < .75) {
        const speed = Math.hypot(ball.vx, ball.vy);
        if (speed > 16.5) {
          const trail = Math.min(s * 1.78, (speed - 15.5) * .64);
          const tx = bx - ball.vx / speed * trail, ty = by - ball.vy / speed * trail;
          const streak = ctx.createLinearGradient(tx, ty, bx, by);
          streak.addColorStop(0, '#e5eddd00'); streak.addColorStop(1, '#e5eddd69');
          ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(bx, by); ctx.strokeStyle = streak; ctx.lineWidth = 1.05; ctx.stroke();
        }
      }
      if (ball.carried) this.drawAttendant({ x: bxGround, y: byGround, carried: ball.carried }, projection);
      paint(ctx, bx, by, radius + 1.05, '#182019');
      paint(ctx, bx, by, radius, '#fffdf1');
      if (radius > 3.2) paint(ctx, bx + radius * .26, by + radius * .23, radius * .31, '#849087');

      if (options.names || options.selected || active) {
        const used = officialLabels;
        const priority = p => p.id === options.selected ? 3 : active && p.id === ownerId ? 2 : receiver && p.id === receiver.id ? 1 : 0;
        const labeled = this.drawn.filter(({ p }) => options.names || priority(p)).sort((a, b) => priority(b.p) - priority(a.p));
        for (const { p, x, y } of labeled) {
          const name = surname(p), size = this.compact ? 8.6 : clamp(s * 1.35, 9.5, 12);
          ctx.font = `650 ${size}px Inter,system-ui,sans-serif`;
          const w = ctx.measureText(name).width + 7, h = size + 5;
          const lx = clamp(x - w / 2, 2, this.width - w - 2);
          let ly = y + r + 3;
          if (ly + h > this.height - 2) ly = y - r - h - 3;
          if (used.some(a => lx < a.x + a.w && lx + w > a.x && ly < a.y + a.h && ly + h > a.y)) continue;
          if (Math.abs(lx + w / 2 - bx) < w / 2 + 2 && by >= ly - 2 && by <= ly + h + 2) ly = y - r - h - 3;
          used.push({ x: lx, y: ly, w, h });
          round(ctx, lx, ly, w, h, 4);
          ctx.fillStyle = p.id === options.selected ? '#2b4127ed' : '#142018e2'; ctx.fill();
          ctx.fillStyle = '#f0f4e8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(name, lx + w / 2, ly + h / 2 + .25);
        }
      }
    }

    pickPlayer(x, y) {
      let best = null, distance = Math.max(10, this.radius * 1.7);
      for (const item of this.drawn) {
        const d = Math.hypot(item.x - x, item.y - y);
        if (d < distance) { best = item.p; distance = d; }
      }
      return best;
    }
  }

  global.TLRender = { Renderer };
})(typeof window !== 'undefined' ? window : globalThis);
