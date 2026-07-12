// Fully synthesized futuristic audio engine — no external assets
import { GraphicsQuality } from './constants';

type SoundName =
  | 'jump' | 'slide' | 'laneSwitch' | 'collectWater' | 'collectChip'
  | 'laser' | 'explosion' | 'crash' | 'uiClick' | 'uiHover'
  | 'chaseWarning' | 'chaseStart' | 'chaseEnd' | 'shield' | 'barrier'
  | 'victory' | 'gameOver' | 'ability' | 'mapTransition';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicInterval: number | null = null;
  private chaseLayer: AudioNode[] = [];
  private musicVolume = 0.4;
  private sfxVolume = 0.6;
  private musicPlaying = false;

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVolume;
      this.sfxGain.gain.value = this.sfxVolume;
      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMusicVolume(v: number) {
    this.musicVolume = v;
    if (this.musicGain) this.musicGain.gain.value = v;
  }

  setSfxVolume(v: number) {
    this.sfxVolume = v;
    if (this.sfxGain) this.sfxGain.gain.value = v;
  }

  setQuality(_q: GraphicsQuality) {}

  private osc(freq: number, type: OscillatorType, dur: number, vol: number, slideTo?: number) {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(0.01, slideTo), this.ctx.currentTime + dur);
    }
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + dur);
  }

  private noise(dur: number, vol: number, filterFreq: number, filterType: BiquadFilterType = 'lowpass') {
    if (!this.ctx || !this.sfxGain) return;
    const bufferSize = this.ctx.sampleRate * dur;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    source.start();
  }

  playSound(name: SoundName) {
    if (!this.ctx) return;
    switch (name) {
      case 'jump': this.osc(400, 'square', 0.2, 0.15, 800); break;
      case 'slide': this.noise(0.3, 0.12, 2000, 'lowpass'); this.osc(200, 'sawtooth', 0.2, 0.08, 100); break;
      case 'laneSwitch': this.osc(600, 'sine', 0.08, 0.1, 900); break;
      case 'collectWater': this.osc(800, 'sine', 0.15, 0.15, 1200); this.osc(1200, 'sine', 0.15, 0.08, 1600); break;
      case 'collectChip': this.osc(1000, 'square', 0.1, 0.1, 1400); this.osc(1500, 'square', 0.1, 0.06, 2000); break;
      case 'laser': this.osc(1200, 'sawtooth', 0.15, 0.1, 400); break;
      case 'explosion': this.noise(0.6, 0.3, 800, 'lowpass'); this.osc(80, 'sawtooth', 0.5, 0.2, 30); break;
      case 'crash': this.noise(0.4, 0.25, 400); this.osc(60, 'square', 0.3, 0.15, 20); break;
      case 'uiClick': this.osc(800, 'sine', 0.05, 0.08, 1000); break;
      case 'uiHover': this.osc(600, 'sine', 0.03, 0.04, 700); break;
      case 'chaseWarning': this.osc(440, 'sawtooth', 0.5, 0.12, 220); break;
      case 'chaseStart': this.noise(0.8, 0.2, 500); this.osc(100, 'sawtooth', 0.8, 0.15, 200); break;
      case 'chaseEnd': this.osc(200, 'sine', 0.6, 0.1, 600); break;
      case 'shield': this.osc(300, 'sine', 0.3, 0.12, 600); this.osc(500, 'sine', 0.3, 0.08, 800); break;
      case 'barrier': this.osc(200, 'sine', 0.4, 0.1, 400); this.noise(0.2, 0.08, 1000, 'bandpass'); break;
      case 'victory': this.playMelody([523, 659, 784, 1047], 0.2); break;
      case 'gameOver': this.playMelody([400, 350, 300, 200], 0.3, 'sawtooth'); break;
      case 'ability': this.osc(600, 'square', 0.2, 0.1, 1200); this.osc(900, 'sine', 0.2, 0.06, 1500); break;
      case 'mapTransition': this.osc(300, 'sine', 0.8, 0.1, 600); this.osc(500, 'sine', 0.8, 0.06, 800); break;
    }
  }

  private playMelody(freqs: number[], noteDur: number, type: OscillatorType = 'sine') {
    freqs.forEach((f, i) => {
      setTimeout(() => this.osc(f, type, noteDur, 0.12), i * noteDur * 1000);
    });
  }

  startMusic() {
    if (!this.ctx || this.musicPlaying) return;
    this.musicPlaying = true;
    this.playAmbientLayer();
    this.musicInterval = window.setInterval(() => this.playAmbientLayer(), 4000);
  }

  private playAmbientLayer() {
    if (!this.ctx || !this.musicGain) return;
    const ctx = this.ctx;
    const musicGain = this.musicGain;
    const baseFreqs = [110, 165, 220, 277];
    baseFreqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = f;
      lfo.frequency.value = 0.3 + i * 0.1;
      lfoGain.gain.value = 5;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 1);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 3.8);
      osc.connect(gain);
      gain.connect(musicGain);
      osc.start();
      lfo.start();
      osc.stop(ctx.currentTime + 4);
      lfo.stop(ctx.currentTime + 4);
    });
  }

  setChaseMode(active: boolean) {
    if (active) {
      this.startChaseLayer();
    } else {
      this.stopChaseLayer();
    }
  }

  private startChaseLayer() {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 55;
    lfo.frequency.value = 8;
    lfoGain.gain.value = 10;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start();
    lfo.start();
    this.chaseLayer = [osc, lfo, gain, lfoGain];
  }

  private stopChaseLayer() {
    if (!this.ctx) return;
    const gain = this.chaseLayer[2] as GainNode | undefined;
    if (gain) gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
    setTimeout(() => {
      this.chaseLayer.forEach(n => { try { (n as any).stop?.(); } catch {} });
      this.chaseLayer = [];
    }, 600);
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.musicInterval) { clearInterval(this.musicInterval); this.musicInterval = null; }
    this.stopChaseLayer();
  }

  stopAll() {
    this.stopMusic();
  }
}

export const audioEngine = new AudioEngine();
