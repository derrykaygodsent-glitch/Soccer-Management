/* TOUCHLINE 26 — canvas renderer (original code) */
(function (global) {
  'use strict';
  const E = global.TLEngine;
  const { L, W, CX, CY, GOAL_HALF, GOAL_H, BOX_L, BOX_HALF, SIX_L, SIX_HALF, PEN } = E;

  class Renderer {
    constructor(canvas) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d');
      this.camera = 'full';
      this.showNames = false;
      this.debug = false;
      this.camX = CX; this.camY = CY; this.camS = 1;
      this.trail = [];
      this.particles = [];
      this.selected = null;
      this.time = 0;
      this.resize();
    }

    resize() {
      const r = this.cv.parentElement.getBoundingClientRect();
      const dpr = Math.min(2, global.devicePixelRatio || 1);
      this.cw = Math.max(320, r.width); this.ch = Math.max(240, r.height);
      this.cv.width = this.cw * dpr; this.cv.height = this.ch * dpr;
      this.cv.style.width = this.cw + 'px'; this.cv.style.height = this.ch + 'px';
      this.dpr = dpr;
      this.baseScale = Math.min((this.cw - 40) / (L + 12), (this.ch - 40) / (W + 12));
    }

    worldToScreen(x, y, scale, ox, oy) { return [ox + x * scale, oy + y * scale]; }

    draw(match, frame, dt) {
      this.time += dt;
      const ctx = this.ctx;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      // background / stands
      ctx.fillStyle = '#0c1210';
      ctx.fillRect(0, 0, this.cw, this.ch);

      const ball = frame ? { x: frame.bx, y: frame.by, z: frame.bz } : match.ball;
      // camera
      let scale, ox, oy;
      if (this.camera === 'follow') {
        const target = this.baseScale * 2.25;
        this.camS += (target - this.camS) * Math.min(1, dt * 4);
        this.camX += (ball.x - this.camX) * Math.min(1, dt * 3.2);
        this.camY += (ball.y - this.camY) * Math.min(1, dt * 3.2);
        scale = this.camS;
        const halfW = this.cw / 2 / scale, halfH = this.ch / 2 / scale;
        const cx = Math.max(halfW - 6, Math.min(L - halfW + 6, this.camX));
        const cy = Math.max(halfH - 6, Math.min(W - halfH + 6, this.camY));
        ox = this.cw / 2 - cx * scale; oy = this.ch / 2 - cy * scale;
      } else {
        this.camS = this.baseScale; this.camX = CX; this.camY = CY;
        scale = this.baseScale;
        ox = (this.cw - L * scale) / 2; oy = (this.ch - W * scale) / 2;
      }
      this.scale = scale; this.ox = ox; this.oy = oy;
      const S = (x, y) => this.worldToScreen(x, y, scale, ox, oy);

      this.drawPitch(ctx, S, scale, match);
      // entities
      const players = frame ? frame.players : match.onPitchPlayers();
      const owner = frame ? (frame.ownerIdx >= 0 ? players[frame.ownerIdx] : null) : match.ball.owner;
      // shadows + players sorted by y
      const sorted = players.slice().sort((a, b) => a.y - b.y);
      for (const p of sorted) this.drawPlayer(ctx, S, scale, p, match, owner, frame);
      this.drawBall(ctx, S, scale, ball, match, frame, dt);
      this.drawParticles(ctx, S, scale, dt);
      if (this.debug && !frame) this.drawDebug(ctx, S, scale, match);
      // vignette
      const g = ctx.createRadialGradient(this.cw / 2, this.ch / 2, Math.min(this.cw, this.ch) * 0.45, this.cw / 2, this.ch / 2, Math.max(this.cw, this.ch) * 0.75);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.35)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, this.cw, this.ch);
    }

    drawPitch(ctx, S, scale, match) {
      const m = 5; // margin grass
      const [px, py] = S(-m, -m);
      const pw = (L + m * 2) * scale, ph = (W + m * 2) * scale;
      // surround
      ctx.fillStyle = '#1d5c30';
      ctx.fillRect(px - 14, py - 14, pw + 28, ph + 28);
      // ad boards
      ctx.fillStyle = '#101820';
      ctx.fillRect(px - 12, py - 12, pw + 24, 8);
      ctx.fillRect(px - 12, py + ph + 4, pw + 24, 8);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = `${Math.max(5, 6 * scale / 8)}px system-ui`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const boards = ['TOUCHLINE 26', 'NORTHBRIDGE', 'RIVERSIDE', 'KINGSDOWN', 'EASTVALE', 'HARBOURPORT', 'SILVERLAKE', 'OAKFIELD', 'CINDERLANE'];
      for (let i = 0; i < 9; i++) {
        const bx = px + (i + 0.5) * pw / 9;
        ctx.fillText(boards[i], bx, py - 8);
        ctx.fillText(boards[(i + 4) % 9], bx, py + ph + 8);
      }
      // stripes
      const stripes = 12;
      for (let i = 0; i < stripes; i++) {
        ctx.fillStyle = i % 2 ? '#3a9448' : '#339041';
        const [sx, sy] = S(i * L / stripes, 0);
        ctx.fillRect(sx, sy, L / stripes * scale + 0.5, W * scale);
      }
      // subtle side shading
      const sg = ctx.createLinearGradient(px, py, px, py + ph);
      sg.addColorStop(0, 'rgba(255,255,255,0.05)'); sg.addColorStop(0.5, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(0,0,0,0.10)');
      ctx.fillStyle = sg; ctx.fillRect(px, py, pw, ph);

      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = Math.max(1, 0.12 * scale);
      const line = (x1, y1, x2, y2) => { const [a, b] = S(x1, y1); const [c, d] = S(x2, y2); ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); };
      const rect = (x, y, w, h) => { const [a, b] = S(x, y); ctx.strokeRect(a, b, w * scale, h * scale); };
      const circ = (x, y, r, a0 = 0, a1 = Math.PI * 2) => { const [a, b] = S(x, y); ctx.beginPath(); ctx.arc(a, b, r * scale, a0, a1); ctx.stroke(); };
      const dot = (x, y) => { const [a, b] = S(x, y); ctx.beginPath(); ctx.arc(a, b, Math.max(1.5, 0.25 * scale), 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill(); };
      rect(0, 0, L, W);
      line(CX, 0, CX, W);
      circ(CX, CY, 9.15);
      dot(CX, CY);
      // boxes both ends
      rect(0, CY - BOX_HALF, BOX_L, BOX_HALF * 2);
      rect(L - BOX_L, CY - BOX_HALF, BOX_L, BOX_HALF * 2);
      rect(0, CY - SIX_HALF, SIX_L, SIX_HALF * 2);
      rect(L - SIX_L, CY - SIX_HALF, SIX_L, SIX_HALF * 2);
      dot(PEN, CY); dot(L - PEN, CY);
      // D arcs
      const th = Math.acos((BOX_L - PEN) / 9.15);
      circ(PEN, CY, 9.15, -th, th);
      circ(L - PEN, CY, 9.15, Math.PI - th, Math.PI + th);
      // corner arcs
      circ(0, 0, 1, 0, Math.PI / 2); circ(L, 0, 1, Math.PI / 2, Math.PI);
      circ(L, W, 1, Math.PI, Math.PI * 1.5); circ(0, W, 1, Math.PI * 1.5, Math.PI * 2);
      // goals + nets
      for (const side of [0, 1]) {
        const gx = side === 0 ? 0 : L;
        const dir = side === 0 ? -1 : 1;
        const [a, b] = S(gx, CY - GOAL_HALF);
        const gw = 2.2 * scale * dir, gh = GOAL_HALF * 2 * scale;
        ctx.fillStyle = 'rgba(255,255,255,0.10)';
        ctx.fillRect(side === 0 ? a + gw : a, b, Math.abs(gw), gh);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = Math.max(0.5, 0.04 * scale);
        const nx = 6, ny = 8;
        for (let i = 1; i < nx; i++) {
          const x = a + gw * i / nx;
          ctx.beginPath(); ctx.moveTo(x, b); ctx.lineTo(x, b + gh); ctx.stroke();
        }
        for (let i = 1; i < ny; i++) {
          const y = b + gh * i / ny;
          ctx.beginPath(); ctx.moveTo(a, y); ctx.lineTo(a + gw, y); ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.95)';
        ctx.lineWidth = Math.max(1.5, 0.22 * scale);
        ctx.strokeRect(side === 0 ? a + gw : a, b, Math.abs(gw), gh);
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = Math.max(1, 0.12 * scale);
      }
    }

    drawPlayer(ctx, S, scale, p, match, owner, frame) {
      const team = match.teams[p.team];
      const [x, y] = S(p.x, p.y);
      const r = Math.max(4.5, 1.0 * scale);
      const isGK = p.pos === 'GK';
      const col = isGK ? team.club.gk : team.club.primary;
      const sec = team.club.secondary;
      // shadow
      ctx.fillStyle = 'rgba(0,0,0,0.30)';
      ctx.beginPath(); ctx.ellipse(x + r * 0.18, y + r * 0.32, r * 0.95, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
      // owner pulse
      if (owner === p) {
        const pulse = 1 + Math.sin(this.time * 6) * 0.12;
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = Math.max(1, 0.14 * scale);
        ctx.beginPath(); ctx.arc(x, y, r * 1.45 * pulse, 0, Math.PI * 2); ctx.stroke();
      }
      // selected
      if (this.selected === p.id) {
        ctx.strokeStyle = '#38e1ff';
        ctx.lineWidth = Math.max(1.5, 0.18 * scale);
        ctx.beginPath(); ctx.arc(x, y, r * 1.7, 0, Math.PI * 2); ctx.stroke();
      }
      // body
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = sec;
      ctx.lineWidth = Math.max(1, 0.16 * scale);
      ctx.stroke();
      // direction tick
      const dir = p.dir != null ? p.dir : 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = Math.max(1, 0.12 * scale);
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(dir) * r * 0.55, y + Math.sin(dir) * r * 0.55);
      ctx.lineTo(x + Math.cos(dir) * r * 1.05, y + Math.sin(dir) * r * 1.05);
      ctx.stroke();
      // number
      const lum = this.luminance(col);
      ctx.fillStyle = lum > 0.55 ? '#101418' : '#ffffff';
      ctx.font = `700 ${Math.max(6, r * 1.05)}px system-ui`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(p.num), x, y + 0.5);
      // card badge
      if (p.yellow > 0 && !frame) {
        ctx.fillStyle = p.yellow >= 2 ? '#e11d48' : '#facc15';
        ctx.fillRect(x + r * 0.7, y - r * 1.5, r * 0.55, r * 0.8);
      }
      // name
      if (this.showNames || this.selected === p.id) {
        const label = p.name.split(' ').slice(-1)[0];
        ctx.font = `600 ${Math.max(7, 0.85 * scale)}px system-ui`;
        const tw = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(8,12,16,0.72)';
        ctx.fillRect(x - tw / 2 - 3, y + r * 1.35, tw + 6, Math.max(9, scale * 1.05));
        ctx.fillStyle = '#e8f0f4';
        ctx.fillText(label, x, y + r * 1.35 + Math.max(4.5, scale * 0.52));
      }
    }

    luminance(hex) {
      const h = hex.replace('#', '');
      const r = parseInt(h.substr(0, 2), 16) / 255, g = parseInt(h.substr(2, 2), 16) / 255, b = parseInt(h.substr(4, 2), 16) / 255;
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    drawBall(ctx, S, scale, ball, match, frame, dt) {
      const sp = frame ? 0 : Math.hypot(match.ball.vx, match.ball.vy);
      if (!frame && sp > 11) {
        this.trail.push({ x: ball.x, y: ball.y, z: ball.z, a: 0.5 });
        if (this.trail.length > 16) this.trail.shift();
      }
      for (const t of this.trail) t.a -= dt * 1.6;
      this.trail = this.trail.filter(t => t.a > 0);
      if (this.trail.length > 1) {
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = Math.max(1, 0.14 * scale);
        ctx.beginPath();
        this.trail.forEach((t, i) => {
          const [x, y] = S(t.x, t.y);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }
      const z = ball.z || 0;
      const [sx, sy] = S(ball.x + z * 0.3, ball.y + z * 0.45);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(sx, sy, Math.max(2, 0.4 * scale), Math.max(1.2, 0.24 * scale), 0, 0, Math.PI * 2); ctx.fill();
      const [bx, by] = S(ball.x, ball.y);
      const br = Math.max(2.6, 0.42 * scale) * (1 + z * 0.06);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(bx, by - z * scale * 0.5, br, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = Math.max(0.5, 0.05 * scale);
      ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.arc(bx + br * 0.25, by - z * scale * 0.5 - br * 0.15, br * 0.3, 0, Math.PI * 2); ctx.fill();
    }

    spawnGoalParticles(match, lineX) {
      const team = match.teams.find(t => (t.attackDir > 0 ? L : 0) === lineX);
      const cols = [team.club.primary, team.club.secondary, '#ffffff', '#ffd700'];
      for (let i = 0; i < 70; i++) {
        this.particles.push({
          x: lineX, y: CY + (Math.random() - 0.5) * 7,
          vx: (lineX === 0 ? 1 : -1) * (2 + Math.random() * 9), vy: (Math.random() - 0.5) * 14,
          z: Math.random() * 3, vz: 3 + Math.random() * 6,
          col: cols[(Math.random() * cols.length) | 0], life: 1.6 + Math.random()
        });
      }
    }

    drawParticles(ctx, S, scale, dt) {
      for (const p of this.particles) {
        p.life -= dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= 12 * dt;
        if (p.z < 0) { p.z = 0; p.vz *= -0.4; }
        const [x, y] = S(p.x, p.y);
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
        ctx.fillStyle = p.col;
        ctx.fillRect(x, y - p.z * scale * 0.5, Math.max(2, 0.3 * scale), Math.max(2, 0.3 * scale));
      }
      ctx.globalAlpha = 1;
      this.particles = this.particles.filter(p => p.life > 0);
    }

    drawDebug(ctx, S, scale, match) {
      // offside lines
      for (const team of match.teams) {
        const lx = team.offsideLine;
        if (lx == null) continue;
        const [a, b] = S(lx, 0); const [c, d] = S(lx, W);
        ctx.strokeStyle = team.idx === 0 ? 'rgba(56,225,255,0.5)' : 'rgba(255,120,120,0.5)';
        ctx.setLineDash([6, 6]); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke();
        ctx.setLineDash([]);
      }
      for (const p of match.onPitchPlayers()) {
        const [x, y] = S(p.x, p.y); const [tx, ty] = S(p.tx, p.ty);
        ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke();
        ctx.fillStyle = p.offsideFlag ? 'rgba(255,80,80,0.9)' : 'rgba(255,255,255,0.4)';
        ctx.fillRect(tx - 2, ty - 2, 4, 4);
      }
    }

    pickPlayer(mx, my, match) {
      let best = null, bd = 1e9;
      for (const p of match.onPitchPlayers()) {
        const [x, y] = this.worldToScreen(p.x, p.y, this.scale, this.ox, this.oy);
        const d = Math.hypot(mx - x, my - y);
        if (d < Math.max(10, this.scale * 1.4) && d < bd) { bd = d; best = p; }
      }
      return best;
    }
  }

  global.TLRender = { Renderer };
})(typeof window !== 'undefined' ? window : globalThis);
