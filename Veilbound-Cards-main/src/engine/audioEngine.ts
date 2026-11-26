/**
 * Procedural Web Audio API synthesizer for SFX, dynamic music states, and regional environmental ambience.
 * Uses masterGain -> sfxGain / musicGain / ambientGain with strict single-instance timers so tracks never overlap.
 */

import type { GameSettings, RegionAmbienceTheme } from '../types/game';

export type MusicState =
  | 'menu'
  | 'sanctuary'
  | 'map'
  | 'combat'
  | 'elite'
  | 'boss'
  | 'victory'
  | 'defeat'
  | 'discovery';

export type AmbienceTheme = RegionAmbienceTheme | 'none' | 'sanctuary' | 'cursed';

export type SfxKind =
  | 'click'
  | 'hover'
  | 'map_select'
  | 'discover'
  | 'upgrade'
  | 'relic'
  | 'curse'
  | 'trap'
  | 'reaction'
  | 'stance'
  | 'ritual'
  | 'enemy_defeat'
  | 'shrine'
  | 'card'
  | 'slash'
  | 'heavy_slash'
  | 'pierce'
  | 'hit'
  | 'crit'
  | 'block'
  | 'spell'
  | 'fire'
  | 'poison'
  | 'shadow'
  | 'heal'
  | 'companion'
  | 'support'
  | 'turn_start'
  | 'victory'
  | 'defeat'
  | 'hero_ability'
  | 'boss_phase'
  | 'arrow'
  | 'arcane';

interface MusicProfile {
  chords: number[][];
  intervalMs: number;
  bassPulse: boolean;
  leadArp: boolean;
  filterHz: number;
  padWave: OscillatorType;
  loop: boolean;
}

const MUSIC_PROFILES: Record<MusicState, MusicProfile> = {
  menu: {
    chords: [
      [110.0, 130.81, 164.81, 220.0], // Am
      [98.0, 123.47, 146.83, 196.0], // G
      [87.31, 103.83, 130.81, 174.61], // Fm
      [82.41, 110.0, 130.81, 164.81], // Em/A
    ],
    intervalMs: 4800,
    bassPulse: false,
    leadArp: true,
    filterHz: 460,
    padWave: 'triangle',
    loop: true,
  },
  sanctuary: {
    chords: [
      [130.81, 164.81, 196.0, 246.94], // Cmaj7
      [110.0, 130.81, 164.81, 246.94], // Am9
      [87.31, 130.81, 174.61, 220.0], // Fmaj7
      [98.0, 146.83, 196.0, 246.94], // G6
    ],
    intervalMs: 5200,
    bassPulse: false,
    leadArp: true,
    filterHz: 520,
    padWave: 'sine',
    loop: true,
  },
  map: {
    chords: [
      [98.0, 116.54, 146.83, 196.0], // Gm
      [87.31, 103.83, 130.81, 174.61], // Fm
      [73.42, 110.0, 138.59, 174.61], // Dm
      [82.41, 110.0, 146.83, 196.0], // Em7
    ],
    intervalMs: 4200,
    bassPulse: false,
    leadArp: true,
    filterHz: 480,
    padWave: 'triangle',
    loop: true,
  },
  combat: {
    chords: [
      [82.41, 123.47, 146.83, 196.0], // Em
      [73.42, 110.0, 130.81, 174.61], // Dm
      [65.41, 98.0, 123.47, 155.56], // Cm
      [73.42, 110.0, 146.83, 164.81], // Dsus
    ],
    intervalMs: 2600,
    bassPulse: true,
    leadArp: false,
    filterHz: 620,
    padWave: 'sawtooth',
    loop: true,
  },
  elite: {
    chords: [
      [73.42, 110.0, 138.59, 174.61], // Dm(maj7)
      [69.3, 103.83, 130.81, 164.81], // C#dim
      [65.41, 98.0, 116.54, 155.56], // Cm7
      [61.74, 92.5, 123.47, 146.83], // Bm
    ],
    intervalMs: 2100,
    bassPulse: true,
    leadArp: true,
    filterHz: 760,
    padWave: 'sawtooth',
    loop: true,
  },
  boss: {
    chords: [
      [55.0, 82.41, 110.0, 130.81, 164.81], // Deep A minor
      [51.91, 77.78, 103.83, 138.59, 155.56], // G# tension
      [49.0, 73.42, 98.0, 116.54, 146.83], // Gm
      [55.0, 87.31, 110.0, 138.59, 164.81], // Phrygian cadence
    ],
    intervalMs: 1800,
    bassPulse: true,
    leadArp: true,
    filterHz: 900,
    padWave: 'sawtooth',
    loop: true,
  },
  discovery: {
    chords: [
      [146.83, 220.0, 261.63, 329.63], // Dm9
      [130.81, 196.0, 246.94, 293.66], // Cmaj9
    ],
    intervalMs: 3600,
    bassPulse: false,
    leadArp: true,
    filterHz: 680,
    padWave: 'sine',
    loop: true,
  },
  victory: {
    chords: [
      [130.81, 164.81, 196.0, 261.63],
      [146.83, 174.61, 220.0, 293.66],
      [196.0, 246.94, 293.66, 392.0],
      [261.63, 329.63, 392.0, 523.25],
    ],
    intervalMs: 2800,
    bassPulse: false,
    leadArp: true,
    filterHz: 780,
    padWave: 'triangle',
    loop: false,
  },
  defeat: {
    chords: [
      [82.41, 98.0, 123.47, 146.83],
      [73.42, 87.31, 110.0, 130.81],
      [65.41, 77.78, 98.0, 116.54],
      [55.0, 65.41, 82.41, 110.0],
    ],
    intervalMs: 3600,
    bassPulse: false,
    leadArp: false,
    filterHz: 320,
    padWave: 'sine',
    loop: false,
  },
};

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;

  private musicState: MusicState = 'menu';
  private musicStarted = false;
  private musicSessionId = 0;
  private musicTimer: number | null = null;

  private ambientTheme: AmbienceTheme = 'none';
  private ambientSessionId = 0;
  private ambientTimer: number | null = null;
  private ambientNodes: AudioNode[] = [];
  private noiseBuffer: AudioBuffer | null = null;

  private settings: GameSettings = {
    masterVolume: 0.75,
    sfxVolume: 0.85,
    musicVolume: 0.45,
    ambientVolume: 0.45,
    muted: false,
    combatSpeed: 'normal',
    fastAnimations: false,
    reducedMotion: false,
    confirmEndTurn: false,
    graphicsQuality: 'balanced',
  };

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.ambientGain = this.ctx.createGain();

      this.sfxGain.connect(this.masterGain);
      this.musicGain.connect(this.masterGain);
      this.ambientGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const length = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      // Soft pink/brownish noise for smooth atmospheric wind/ember beds
      lastOut = (lastOut + 0.04 * white) / 1.04;
      data[i] = lastOut * 2.6;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  updateSettings(next: GameSettings): void {
    this.settings = { ...next };
    this.applyVolumes();

    // If the user unmutes after returning from a backgrounded tab, resume the
    // existing context from this settings interaction instead of waiting for
    // an unrelated later sound effect to unlock it.
    if (!this.settings.muted && this.ctx?.state === 'suspended') {
      void this.ctx.resume().catch(() => undefined);
    }
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.masterGain || !this.sfxGain || !this.musicGain || !this.ambientGain) return;
    const now = this.ctx.currentTime;
    const master = this.settings.muted ? 0 : this.settings.masterVolume;
    this.masterGain.gain.setTargetAtTime(master, now, 0.04);
    this.sfxGain.gain.setTargetAtTime(this.settings.sfxVolume, now, 0.04);
    this.musicGain.gain.setTargetAtTime(this.settings.musicVolume, now, 0.08);
    this.ambientGain.gain.setTargetAtTime(this.settings.ambientVolume ?? 0.45, now, 0.1);
  }

  unlock(): void {
    this.ensureContext();
    if (!this.musicStarted) {
      this.startMusicLoop();
    }
    if (this.ambientTheme !== 'none' && this.ambientNodes.length === 0) {
      this.startAmbienceLoop();
    }
  }

  suspendForBackground(): void {
    if (this.ctx && this.ctx.state === 'running') {
      void this.ctx.suspend();
    }
  }

  resumeFromForeground(): void {
    if (this.ctx && this.ctx.state === 'suspended' && !this.settings.muted) {
      void this.ctx.resume();
    }
  }

  setMusicState(next: MusicState): void {
    if (this.musicState === next && this.musicStarted) return;
    this.musicState = next;
    if (this.ctx || this.musicStarted) {
      this.startMusicLoop();
    }
  }

  private clearMusicTimer(): void {
    if (this.musicTimer !== null) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private startMusicLoop(): void {
    this.clearMusicTimer();
    this.musicStarted = true;
    this.musicSessionId += 1;
    const sessionId = this.musicSessionId;
    let step = 0;

    const tick = () => {
      if (!this.musicStarted || this.musicSessionId !== sessionId) return;
      const profile = MUSIC_PROFILES[this.musicState];
      const ctx = this.ctx;

      if (ctx && this.musicGain && ctx.state === 'running' && !this.settings.muted) {
        const chord = profile.chords[step % profile.chords.length];
        const now = ctx.currentTime;
        const durSec = profile.intervalMs / 1000;

        chord.forEach((freq, idx) => {
          if (!this.musicGain) return;
          const osc = ctx.createOscillator();
          const filter = ctx.createBiquadFilter();
          const env = ctx.createGain();
          osc.type = idx === 0 ? profile.padWave : 'sine';
          osc.frequency.setValueAtTime(freq, now);
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(profile.filterHz, now);

          const peak = idx === 0 ? 0.075 : 0.032;
          env.gain.setValueAtTime(0.0001, now);
          env.gain.linearRampToValueAtTime(peak, now + Math.min(1.4, durSec * 0.32));
          env.gain.exponentialRampToValueAtTime(0.0001, now + durSec + 0.35);

          osc.connect(filter);
          filter.connect(env);
          env.connect(this.musicGain);
          osc.start(now);
          osc.stop(now + durSec + 0.45);
        });

        // Combat/Elite/Boss bass rhythmic pulse
        if (profile.bassPulse) {
          const pulses = this.musicState === 'boss' ? 4 : 2;
          const stepSec = durSec / pulses;
          for (let p = 0; p < pulses; p++) {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            const t = now + p * stepSec;
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(chord[0] * (p % 2 === 0 ? 1 : 1.5), t);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.linearRampToValueAtTime(0.065, t + 0.04);
            g.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(0.45, stepSec * 0.85));
            osc.connect(g);
            g.connect(this.musicGain);
            osc.start(t);
            osc.stop(t + stepSec);
          }
        }

        // Subtle atmospheric arpeggio shimmer
        if (profile.leadArp) {
          const notes = [chord[1], chord[2], chord[chord.length - 1]];
          notes.forEach((nFreq, nIdx) => {
            if (!this.musicGain) return;
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            const t = now + nIdx * (durSec / 3.4);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(nFreq * 2, t);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.linearRampToValueAtTime(0.022, t + 0.08);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
            osc.connect(g);
            g.connect(this.musicGain);
            osc.start(t);
            osc.stop(t + 1.2);
          });
        }
      }

      step += 1;
      const profileAfter = MUSIC_PROFILES[this.musicState];
      if (!profileAfter.loop && step >= profileAfter.chords.length) {
        return;
      }
      this.musicTimer = window.setTimeout(tick, profileAfter.intervalMs);
    };

    this.musicTimer = window.setTimeout(tick, 180);
  }

  stopMusic(): void {
    this.musicStarted = false;
    this.musicSessionId += 1;
    this.clearMusicTimer();
  }

  setAmbience(theme: AmbienceTheme): void {
    if (this.ambientTheme === theme && (theme === 'none' || this.ambientNodes.length > 0)) {
      return;
    }
    this.ambientTheme = theme;
    this.stopAmbienceLoop();
    if (theme !== 'none' && this.ctx) {
      this.startAmbienceLoop();
    }
  }

  private stopAmbienceLoop(): void {
    this.ambientSessionId += 1;
    if (this.ambientTimer !== null) {
      clearTimeout(this.ambientTimer);
      this.ambientTimer = null;
    }
    for (const node of this.ambientNodes) {
      try {
        if ('stop' in node && typeof (node as AudioBufferSourceNode).stop === 'function') {
          (node as AudioBufferSourceNode).stop();
        }
        node.disconnect();
      } catch {
        // Ignore already-stopped nodes
      }
    }
    this.ambientNodes = [];
  }

  private startAmbienceLoop(): void {
    const ctx = this.ctx;
    if (!ctx || !this.ambientGain || this.ambientTheme === 'none') return;

    this.stopAmbienceLoop();
    const sessionId = this.ambientSessionId;
    const theme = this.ambientTheme;

    // Continuous softly filtered ambient noise bed
    const src = ctx.createBufferSource();
    src.buffer = this.getNoiseBuffer(ctx);
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    const bedGain = ctx.createGain();
    const now = ctx.currentTime;

    switch (theme) {
      case 'embers':
      case 'obsidian':
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(theme === 'obsidian' ? 240 : 340, now);
        bedGain.gain.setValueAtTime(0.08, now);
        break;
      case 'wind':
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(520, now);
        filter.Q.setValueAtTime(1.6, now);
        bedGain.gain.setValueAtTime(0.11, now);
        break;
      case 'drowned':
      case 'catacombs':
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(280, now);
        bedGain.gain.setValueAtTime(0.07, now);
        break;
      case 'spores':
      case 'sanctuary':
      case 'cursed':
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(360, now);
        filter.Q.setValueAtTime(0.9, now);
        bedGain.gain.setValueAtTime(0.055, now);
        break;
      default:
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300, now);
        bedGain.gain.setValueAtTime(0.05, now);
    }

    src.connect(filter);
    filter.connect(bedGain);
    bedGain.connect(this.ambientGain);
    src.start(now);
    this.ambientNodes.push(src, filter, bedGain);

    // Scheduled micro-events (drips, crackles, chimes, gusts, hums)
    const scheduleMicroEvent = () => {
      if (this.ambientSessionId !== sessionId || this.ambientTheme !== theme) return;
      const c = this.ctx;
      if (c && this.ambientGain && c.state === 'running' && !this.settings.muted) {
        const t = c.currentTime;
        if (theme === 'drowned' || theme === 'catacombs') {
          // Water drip resonance
          const osc = c.createOscillator();
          const g = c.createGain();
          const base = theme === 'drowned' ? 760 + Math.random() * 440 : 520 + Math.random() * 280;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(base, t);
          osc.frequency.exponentialRampToValueAtTime(base * 1.45, t + 0.09);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(0.045, t + 0.012);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
          osc.connect(g);
          g.connect(this.ambientGain);
          osc.start(t);
          osc.stop(t + 0.18);
        } else if (theme === 'embers' || theme === 'obsidian') {
          // Soft ember crackle
          const osc = c.createOscillator();
          const g = c.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(1600 + Math.random() * 1400, t);
          osc.frequency.exponentialRampToValueAtTime(320, t + 0.045);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(0.032, t + 0.005);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
          osc.connect(g);
          g.connect(this.ambientGain);
          osc.start(t);
          osc.stop(t + 0.06);
        } else if (theme === 'sanctuary' || theme === 'spores') {
          // Shimmering faint chime
          const osc = c.createOscillator();
          const g = c.createGain();
          const freq = theme === 'sanctuary' ? [392, 523.25, 659.25][Math.floor(Math.random() * 3)] : 440 + Math.random() * 180;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(0.025, t + 0.2);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
          osc.connect(g);
          g.connect(this.ambientGain);
          osc.start(t);
          osc.stop(t + 1.5);
        } else if (theme === 'wind') {
          // Wind swell modulation
          filter.frequency.setTargetAtTime(360 + Math.random() * 520, t, 0.8);
        } else if (theme === 'cursed') {
          // Low ominous drone shimmer
          const osc = c.createOscillator();
          const g = c.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(65.41, t);
          const lp = c.createBiquadFilter();
          lp.type = 'lowpass';
          lp.frequency.setValueAtTime(190, t);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(0.035, t + 0.5);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
          osc.connect(lp);
          lp.connect(g);
          g.connect(this.ambientGain);
          osc.start(t);
          osc.stop(t + 1.9);
        }
      }
      const nextMs =
        theme === 'embers'
          ? 700 + Math.random() * 1600
          : theme === 'wind'
          ? 1800 + Math.random() * 1800
          : 1500 + Math.random() * 2400;
      this.ambientTimer = window.setTimeout(scheduleMicroEvent, nextMs);
    };

    this.ambientTimer = window.setTimeout(scheduleMicroEvent, 600);
  }

  play(sfx: SfxKind, delaySec = 0): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.settings.muted) return;
    const baseTime = ctx.currentTime + Math.max(0, delaySec);
    const jitter = 0.96 + Math.random() * 0.08;

    const tone = (
      freqStart: number,
      freqEnd: number,
      duration: number,
      type: OscillatorType,
      gainPeak: number,
      offset = 0
    ) => {
      if (!this.sfxGain) return;
      const t = baseTime + offset;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freqStart * jitter, t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd * jitter), t + duration);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(gainPeak, t + 0.014);
      g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + duration + 0.025);
    };

    switch (sfx) {
      case 'click':
        tone(520, 320, 0.06, 'triangle', 0.12);
        break;
      case 'hover':
        tone(680, 740, 0.035, 'sine', 0.045);
        break;
      case 'map_select':
        tone(340, 510, 0.12, 'triangle', 0.14);
        tone(680, 880, 0.14, 'sine', 0.08, 0.04);
        break;
      case 'discover':
        tone(392.0, 523.25, 0.22, 'triangle', 0.15, 0);
        tone(587.33, 783.99, 0.34, 'sine', 0.14, 0.08);
        break;
      case 'upgrade':
        tone(440, 660, 0.14, 'triangle', 0.15, 0);
        tone(660, 990, 0.22, 'sine', 0.14, 0.06);
        break;
      case 'relic':
        tone(523.25, 659.25, 0.18, 'triangle', 0.16, 0);
        tone(783.99, 1046.5, 0.3, 'sine', 0.15, 0.09);
        break;
      case 'curse':
        tone(174.61, 116.54, 0.32, 'sawtooth', 0.16, 0);
        tone(123.47, 82.41, 0.38, 'triangle', 0.14, 0.08);
        break;
      case 'trap':
        tone(720, 220, 0.12, 'sawtooth', 0.17, 0);
        tone(420, 140, 0.15, 'triangle', 0.13, 0.03);
        break;
      case 'reaction':
        tone(480, 960, 0.12, 'triangle', 0.16, 0);
        tone(960, 640, 0.16, 'sine', 0.12, 0.04);
        break;
      case 'stance':
        tone(293.66, 440, 0.18, 'triangle', 0.15, 0);
        tone(440, 587.33, 0.26, 'sine', 0.12, 0.06);
        break;
      case 'ritual':
        tone(246.94, 369.99, 0.28, 'sine', 0.14, 0);
        tone(369.99, 554.37, 0.32, 'triangle', 0.11, 0.08);
        break;
      case 'shrine':
        tone(329.63, 493.88, 0.26, 'sine', 0.14, 0);
        tone(659.25, 783.99, 0.36, 'sine', 0.11, 0.1);
        break;
      case 'enemy_defeat':
        tone(220, 75, 0.28, 'sawtooth', 0.18, 0);
        tone(330, 110, 0.22, 'triangle', 0.12, 0.05);
        break;
      case 'card':
        tone(310, 620, 0.09, 'sine', 0.12);
        break;
      case 'slash':
        tone(460, 120, 0.13, 'sawtooth', 0.16);
        tone(220, 80, 0.15, 'triangle', 0.14, 0.02);
        break;
      case 'heavy_slash':
        tone(240, 58, 0.24, 'sawtooth', 0.22);
        tone(140, 46, 0.26, 'triangle', 0.2, 0.03);
        break;
      case 'pierce':
        tone(980, 260, 0.14, 'sawtooth', 0.16);
        tone(1420, 680, 0.09, 'sine', 0.11, 0.02);
        break;
      case 'arrow':
        tone(1280, 420, 0.11, 'triangle', 0.16);
        tone(760, 220, 0.09, 'sine', 0.11, 0.03);
        break;
      case 'arcane':
        tone(440, 880, 0.18, 'sine', 0.15);
        tone(659.25, 1318.5, 0.24, 'triangle', 0.11, 0.04);
        break;
      case 'hit':
        tone(150, 48, 0.16, 'sawtooth', 0.21);
        break;
      case 'crit':
        tone(220, 65, 0.24, 'sawtooth', 0.26);
        tone(587.33, 880, 0.18, 'triangle', 0.16, 0.02);
        tone(880, 1174.66, 0.22, 'sine', 0.12, 0.06);
        break;
      case 'block':
        tone(280, 420, 0.13, 'triangle', 0.15);
        tone(560, 560, 0.12, 'sine', 0.1, 0.03);
        break;
      case 'spell':
        tone(330, 660, 0.22, 'sine', 0.15);
        tone(495, 990, 0.24, 'triangle', 0.1, 0.05);
        break;
      case 'fire':
        tone(210, 95, 0.26, 'sawtooth', 0.16);
        tone(420, 740, 0.18, 'triangle', 0.1, 0.04);
        break;
      case 'poison':
        tone(380, 240, 0.22, 'sine', 0.14);
        tone(510, 310, 0.22, 'triangle', 0.09, 0.06);
        break;
      case 'shadow':
        tone(190, 110, 0.26, 'sine', 0.17);
        tone(285, 570, 0.22, 'triangle', 0.1, 0.04);
        break;
      case 'heal':
        tone(392, 523.25, 0.2, 'sine', 0.14);
        tone(523.25, 659.25, 0.24, 'sine', 0.12, 0.08);
        break;
      case 'companion':
        tone(293.66, 440, 0.18, 'triangle', 0.15);
        tone(440, 587.33, 0.22, 'sine', 0.11, 0.06);
        break;
      case 'support':
        tone(349.23, 466.16, 0.18, 'sine', 0.13);
        tone(523.25, 659.25, 0.2, 'triangle', 0.09, 0.05);
        break;
      case 'turn_start':
        tone(261.63, 392.0, 0.16, 'triangle', 0.11);
        break;
      case 'hero_ability':
        tone(220, 440, 0.22, 'triangle', 0.19, 0);
        tone(440, 880, 0.28, 'sine', 0.16, 0.04);
        tone(659.25, 987.77, 0.34, 'triangle', 0.12, 0.09);
        break;
      case 'boss_phase':
        tone(110, 55, 0.55, 'sawtooth', 0.25);
        tone(165, 220, 0.45, 'triangle', 0.18, 0.12);
        break;
      case 'victory':
        tone(261.63, 261.63, 0.18, 'triangle', 0.16, 0);
        tone(329.63, 329.63, 0.18, 'triangle', 0.16, 0.12);
        tone(392.0, 392.0, 0.22, 'triangle', 0.18, 0.24);
        tone(523.25, 523.25, 0.45, 'sine', 0.2, 0.36);
        break;
      case 'defeat':
        tone(220, 196, 0.25, 'triangle', 0.18, 0);
        tone(174.61, 146.83, 0.3, 'triangle', 0.16, 0.2);
        tone(130.81, 82.41, 0.55, 'sawtooth', 0.14, 0.42);
        break;
    }
  }
}

export const audioEngine = new AudioEngine();
