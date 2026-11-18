/* TOUCHLINE 26 — procedural WebAudio (crowd / whistle / kick). No assets. */
(function (global) {
  'use strict';
  const Audio = {
    ctx: null, master: null, crowdGain: null, crowdFilter: null, muted: false, ready: false,
    init() {
      if (this.ready) return;
      try {
        const AC = global.AudioContext || global.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.9;
        this.master.connect(this.ctx.destination);
        // crowd: looping brown noise -> lowpass -> gain
        const len = this.ctx.sampleRate * 3;
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        let last = 0;
        for (let i = 0; i < len; i++) {
          const white = Math.random() * 2 - 1;
          last = (last + 0.02 * white) / 1.02;
          data[i] = last * 3.2;
        }
        const src = this.ctx.createBufferSource();
        src.buffer = buf; src.loop = true;
        this.crowdFilter = this.ctx.createBiquadFilter();
        this.crowdFilter.type = 'lowpass'; this.crowdFilter.frequency.value = 650; this.crowdFilter.Q.value = 0.4;
        this.crowdGain = this.ctx.createGain(); this.crowdGain.gain.value = 0.05;
        src.connect(this.crowdFilter); this.crowdFilter.connect(this.crowdGain); this.crowdGain.connect(this.master);
        src.start();
        // slow swell LFO
        const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.07;
        const lfoG = this.ctx.createGain(); lfoG.gain.value = 0.015;
        lfo.connect(lfoG); lfoG.connect(this.crowdGain.gain); lfo.start();
        this.ready = true;
      } catch (e) { /* audio unavailable */ }
    },
    resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
    setMuted(m) {
      this.muted = m;
      if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.05);
    },
    excitement(v, dur = 2.5) {
      if (!this.ready || this.muted) return;
      const t = this.ctx.currentTime;
      this.crowdGain.gain.cancelScheduledValues(t);
      this.crowdGain.gain.setTargetAtTime(0.05 + v * 0.22, t, 0.08);
      this.crowdFilter.frequency.setTargetAtTime(650 + v * 1400, t, 0.1);
      this.crowdGain.gain.setTargetAtTime(0.05, t + dur, 1.2);
      this.crowdFilter.frequency.setTargetAtTime(650, t + dur, 1.5);
    },
    noiseBurst(freq, dur, gain, type = 'bandpass') {
      if (!this.ready || this.muted) return;
      const t = this.ctx.currentTime;
      const len = Math.ceil(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = 1.2;
      const g = this.ctx.createGain(); g.gain.value = gain;
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start(t); src.stop(t + dur);
    },
    kick(power = 1) {
      if (!this.ready || this.muted) return;
      this.noiseBurst(220, 0.07, 0.10 * power, 'lowpass');
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.08);
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0.12 * power, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.1);
    },
    whistle(long = false, triple = false) {
      if (!this.ready || this.muted) return;
      const blow = (start, dur) => {
        const t = this.ctx.currentTime + start;
        const o = this.ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 2350;
        const trem = this.ctx.createOscillator(); trem.frequency.value = 38;
        const tremG = this.ctx.createGain(); tremG.gain.value = 0.35;
        const g = this.ctx.createGain();
        trem.connect(tremG); tremG.connect(g.gain);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.09, t + 0.02);
        g.gain.setValueAtTime(0.09, t + dur - 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(this.master);
        o.start(t); o.stop(t + dur); trem.start(t); trem.stop(t + dur);
      };
      if (triple) { blow(0, 0.18); blow(0.24, 0.18); blow(0.48, 0.5); }
      else blow(0, long ? 0.7 : 0.28);
    },
    goal() {
      this.excitement(1.0, 4.5);
      this.noiseBurst(1500, 1.8, 0.12, 'bandpass');
      this.whistle(false);
    },
    bigChance() { this.excitement(0.55, 1.6); },
    foul() { this.whistle(false); this.excitement(0.2, 1.0); }
  };
  global.TLAudio = Audio;
})(typeof window !== 'undefined' ? window : globalThis);
