class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private musicEnabled = true;
  private hapticsEnabled = true;
  private musicIntervalId: number | null = null;
  private musicStep = 0;

  private cutAudioBuffer: AudioBuffer | null = null;
  private cutBufferLoading = false;
  private cutFallbackAudio: HTMLAudioElement | null = null;
  private cutAudioUnlocked = false;
  private lastCutKey = '';
  private lastCutPlayedAtMs = 0;

  public setEnabled(val: boolean): void {
    this.enabled = val;
  }

  public setMusicEnabled(val: boolean): void {
    this.musicEnabled = val;
    if (!val) {
      this.stopMusic();
    } else if (this.ctx && this.ctx.state === 'running') {
      this.startMusicLoop();
    }
  }

  public setHapticsEnabled(val: boolean): void {
    this.hapticsEnabled = val;
  }

  public vibrate(pattern: number | number[]): void {
    if (!this.hapticsEnabled) return;
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch {
      // Ignore environments without vibration support
    }
  }

  private preloadCutAudio(ctx: AudioContext): void {
    if (typeof window === 'undefined') return;

    if (!this.cutFallbackAudio && typeof Audio !== 'undefined') {
      const audio = new Audio('/faaah.mp3');
      audio.preload = 'auto';
      this.cutFallbackAudio = audio;
    }

    if (this.cutFallbackAudio && !this.cutAudioUnlocked) {
      this.cutAudioUnlocked = true;
      try {
        const prevMuted = this.cutFallbackAudio.muted;
        this.cutFallbackAudio.muted = true;
        const p = this.cutFallbackAudio.play();
        if (p && typeof p.then === 'function') {
          void p
            .then(() => {
              if (this.cutFallbackAudio) {
                this.cutFallbackAudio.pause();
                this.cutFallbackAudio.currentTime = 0;
                this.cutFallbackAudio.muted = prevMuted;
              }
            })
            .catch(() => {
              if (this.cutFallbackAudio) {
                this.cutFallbackAudio.muted = prevMuted;
              }
            });
        }
      } catch {
        // Ignore autoplay prime restriction
      }
    }

    if (this.cutAudioBuffer || this.cutBufferLoading || typeof fetch !== 'function') {
      return;
    }
    this.cutBufferLoading = true;
    void fetch('/faaah.mp3')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .then((buf) => ctx.decodeAudioData(buf))
      .then((decoded) => {
        this.cutAudioBuffer = decoded;
      })
      .catch(() => {
        // Fallback audio element or synthesized capture sound handles playback cleanly
      })
      .finally(() => {
        this.cutBufferLoading = false;
      });
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    this.preloadCutAudio(this.ctx);

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().then(() => {
        if (this.musicEnabled) {
          this.startMusicLoop();
        }
      }).catch(() => {});
    } else if (this.musicEnabled && this.musicIntervalId === null) {
      this.startMusicLoop();
    }
    return this.ctx;
  }

  private getSfxContext(): AudioContext | null {
    const ctx = this.ensureContext();
    if (!this.enabled || !ctx) return null;
    return ctx;
  }

  public unlockAndStartMusic(): void {
    const ctx = this.ensureContext();
    if (ctx && this.musicEnabled) {
      this.startMusicLoop();
    }
  }

  public stopMusic(): void {
    if (this.musicIntervalId !== null && typeof window !== 'undefined') {
      window.clearInterval(this.musicIntervalId);
      this.musicIntervalId = null;
    }
  }

  private startMusicLoop(): void {
    if (!this.musicEnabled || typeof window === 'undefined') return;
    if (this.musicIntervalId !== null) return;

    // Gentle royal marimba pentatonic arpeggio progression (C5 - A4 - F4 - G4)
    const melody = [
      523.25, 659.25, 783.99, 659.25,
      440.0, 523.25, 659.25, 523.25,
      349.23, 440.0, 523.25, 440.0,
      392.0, 493.88, 587.33, 493.88,
    ];
    const bass = [
      130.81, 0, 196.0, 0,
      110.0, 0, 164.81, 0,
      87.31, 0, 130.81, 0,
      98.0, 0, 146.83, 0,
    ];

    this.musicIntervalId = window.setInterval(() => {
      if (!this.musicEnabled || !this.ctx || this.ctx.state !== 'running') {
        return;
      }
      if (typeof document !== 'undefined' && document.hidden) return;

      const idx = this.musicStep % melody.length;
      this.musicStep += 1;
      const now = this.ctx.currentTime;

      // Soft marimba pluck
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(melody[idx], now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.028, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.34);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.36);

      // Warm subtle bass pulse on downbeats
      const bFreq = bass[idx];
      if (bFreq > 0) {
        const bOsc = this.ctx.createOscillator();
        const bGain = this.ctx.createGain();
        bOsc.type = 'triangle';
        bOsc.frequency.setValueAtTime(bFreq, now);
        bGain.gain.setValueAtTime(0.0001, now);
        bGain.gain.linearRampToValueAtTime(0.022, now + 0.02);
        bGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.45);
        bOsc.connect(bGain);
        bGain.connect(this.ctx.destination);
        bOsc.start(now);
        bOsc.stop(now + 0.48);
      }
    }, 380);
  }

  public playUiClick(): void {
    const ctx = this.getSfxContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(560, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.045);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  public playCoinReward(): void {
    this.vibrate([20, 25, 30]);
    const ctx = this.getSfxContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [987.77, 1318.51, 1567.98].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.065);
      gain.gain.setValueAtTime(0.11, now + i * 0.065);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.065 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.065);
      osc.stop(now + i * 0.065 + 0.27);
    });
  }

  public playDiceRoll(): void {
    this.vibrate(18);
    const ctx = this.getSfxContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const taps = [0, 0.06, 0.13, 0.21, 0.3];
    taps.forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const base = 240 + (idx % 3) * 55 + Math.random() * 40;
      osc.frequency.setValueAtTime(base, now + offset);
      osc.frequency.exponentialRampToValueAtTime(95, now + offset + 0.045);
      gain.gain.setValueAtTime(0.12 - idx * 0.014, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.055);
    });
  }

  public playDiceLand(isSix: boolean): void {
    this.vibrate(isSix ? [22, 30, 35] : 15);
    const ctx = this.getSfxContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (isSix) {
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.055);
        gain.gain.setValueAtTime(0.11, now + i * 0.055);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.055 + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.055);
        osc.stop(now + i * 0.055 + 0.24);
      });
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.07);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.085);
    }
  }

  public playTokenHop(stepIndex: number): void {
    const ctx = this.getSfxContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const freq = 340 + Math.min(stepIndex, 6) * 32;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.25, now + 0.055);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playTokenDeploy(): void {
    this.vibrate(25);
    const ctx = this.getSfxContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [392, 523.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      gain.gain.setValueAtTime(0.12, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.2);
    });
  }

  public playCapture(cutEventKey?: string): void {
    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (cutEventKey && cutEventKey === this.lastCutKey) {
      return;
    }
    if (nowMs - this.lastCutPlayedAtMs < 120) {
      return;
    }
    this.lastCutPlayedAtMs = nowMs;
    if (cutEventKey) {
      this.lastCutKey = cutEventKey;
    }

    this.vibrate([45, 30, 65]);
    if (!this.enabled) return;

    const ctx = this.ensureContext();
    if (ctx && this.cutAudioBuffer) {
      const source = ctx.createBufferSource();
      source.buffer = this.cutAudioBuffer;
      const gain = ctx.createGain();
      gain.gain.value = 0.92;
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(ctx.currentTime);
      return;
    }

    if (this.cutFallbackAudio) {
      try {
        this.cutFallbackAudio.muted = false;
        this.cutFallbackAudio.volume = 0.92;
        this.cutFallbackAudio.currentTime = 0;
        const p = this.cutFallbackAudio.play();
        if (p && typeof p.catch === 'function') {
          void p.catch(() => {
            this.playFallbackSynthCapture(ctx);
          });
        }
        return;
      } catch {
        // Fall through to synth fallback
      }
    }

    this.playFallbackSynthCapture(ctx);
  }

  private playFallbackSynthCapture(ctx: AudioContext | null): void {
    if (!ctx || !this.enabled) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.35);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playHomeGoal(): void {
    this.vibrate([25, 30, 45]);
    const ctx = this.getSfxContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.065);
      gain.gain.setValueAtTime(0.12, now + i * 0.065);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.065 + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.065);
      osc.stop(now + i * 0.065 + 0.3);
    });
  }

  public playVictoryFanfare(): void {
    this.vibrate([50, 40, 50, 40, 100]);
    const ctx = this.getSfxContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.09);
      gain.gain.setValueAtTime(0.14, now + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 0.48);
    });
  }
}

export const soundEngine = new SoundEngine();
