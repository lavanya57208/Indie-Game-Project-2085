// Fully synthesized futuristic audio engine — no external assets
import { GraphicsQuality } from './constants';

type SoundName =
  | 'jump' | 'slide' | 'laneSwitch' | 'collectWater' | 'collectChip'
  | 'laser' | 'explosion' | 'crash' | 'uiClick' | 'uiHover'
  | 'chaseWarning' | 'chaseStart' | 'chaseEnd' | 'shield' | 'barrier'
  | 'victory' | 'gameOver' | 'ability' | 'mapTransition'
  | 'alienRoar' | 'alienFootstep' | 'alienBreath' | 'alienGrowl'
  | 'alienAttack' | 'barrierSmash';

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
      // Alien roar — deep, menacing dual-tone growl
      case 'alienRoar': this.osc(80, 'sawtooth', 1.2, 0.25, 40); this.osc(120, 'sawtooth', 1.2, 0.15, 60); this.noise(1.0, 0.2, 300, 'lowpass'); break;
      // Heavy footstep — low thud with noise
      case 'alienFootstep': this.osc(60, 'sine', 0.15, 0.2, 30); this.noise(0.1, 0.08, 200, 'lowpass'); break;
      // Heavy breathing — rhythmic air bursts
      case 'alienBreath': this.noise(0.3, 0.1, 800, 'bandpass'); this.osc(100, 'sine', 0.3, 0.05, 60); break;
      // Mid-chase growl — shorter, aggressive
      case 'alienGrowl': this.osc(90, 'sawtooth', 0.4, 0.15, 50); this.osc(130, 'square', 0.4, 0.08, 70); break;
      // Attack swipe — sharp impact
      case 'alienAttack': this.noise(0.3, 0.15, 1500, 'highpass'); this.osc(200, 'sawtooth', 0.2, 0.2, 80); this.osc(400, 'square', 0.2, 0.1, 100); break;
      // Barrier smash — heavy metallic crash
      case 'barrierSmash': this.noise(0.6, 0.3, 600, 'lowpass'); this.osc(120, 'sawtooth', 0.5, 0.25, 40); this.osc(200, 'square', 0.3, 0.1, 80); break;
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
    this.stopIntro();
  }

  // --- Intro cinematic audio ---
  // Hollywood-style immersive sound design with reverb, spatial panning,
  // AI voice synthesis, and scene-synchronized layered SFX.
  // All synthesized — no external assets.

  private introNodes: AudioNode[] = [];
  private introTimers: number[] = [];
  private introPadGain: GainNode | null = null;
  private introReverb: ConvolverNode | null = null;
  private introReverbGain: GainNode | null = null;

  // Create a synthetic reverb impulse response for spatial echo between skyscrapers
  private createReverb(ctx: AudioContext): ConvolverNode {
    const convolver = ctx.createConvolver();
    const length = ctx.sampleRate * 2.5; // 2.5s reverb tail
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const decay = Math.pow(1 - i / length, 2.5);
        data[i] = (Math.random() * 2 - 1) * decay;
      }
    }
    convolver.buffer = impulse;
    return convolver;
  }

  // Spatial SFX — plays a sound with stereo panning and reverb send
  private spatialOsc(freq: number, type: OscillatorType, dur: number, vol: number, pan: number, slideTo?: number) {
    if (!this.ctx || !this.sfxGain || !this.introReverb) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(0.01, slideTo), ctx.currentTime + dur);
    }
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(panner);
    panner.connect(this.sfxGain);
    // Reverb send
    const sendGain = ctx.createGain();
    sendGain.gain.value = 0.3;
    gain.connect(sendGain);
    sendGain.connect(this.introReverb);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  private spatialNoise(dur: number, vol: number, filterFreq: number, pan: number, filterType: BiquadFilterType = 'lowpass') {
    if (!this.ctx || !this.sfxGain || !this.introReverb) return;
    const ctx = this.ctx;
    const bufferSize = ctx.sampleRate * dur;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(this.sfxGain);
    const sendGain = ctx.createGain();
    sendGain.gain.value = 0.25;
    gain.connect(sendGain);
    sendGain.connect(this.introReverb);
    source.start();
  }

  // AI voice synthesis — formant-based speech simulation with robotic effects
  private speakAI(text: string, baseFreq = 180, duration = 2.5) {
    if (!this.ctx || !this.sfxGain || !this.introReverb) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Create a carrier oscillator with vibrato for robotic voice quality
    const carrier = ctx.createOscillator();
    carrier.type = 'sawtooth';
    carrier.frequency.setValueAtTime(baseFreq, now);

    // Vibrato for robotic effect
    const vibrato = ctx.createOscillator();
    const vibratoGain = ctx.createGain();
    vibrato.frequency.value = 6;
    vibratoGain.gain.value = 4;
    vibrato.connect(vibratoGain);
    vibratoGain.connect(carrier.frequency);

    // Formant filter for vowel-like character
    const formant = ctx.createBiquadFilter();
    formant.type = 'bandpass';
    formant.frequency.value = 800;
    formant.Q.value = 5;

    // Second formant
    const formant2 = ctx.createBiquadFilter();
    formant2.type = 'bandpass';
    formant2.frequency.value = 1200;
    formant2.Q.value = 8;

    // Envelope
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.1);
    gain.gain.setValueAtTime(0.08, now + duration - 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // Panner for spatial presence
    const panner = ctx.createStereoPanner();
    panner.pan.value = 0;

    carrier.connect(formant);
    formant.connect(formant2);
    formant2.connect(gain);
    gain.connect(panner);
    panner.connect(this.sfxGain);

    // Reverb send for spatial depth
    const sendGain = ctx.createGain();
    sendGain.gain.value = 0.35;
    gain.connect(sendGain);
    sendGain.connect(this.introReverb);

    // Modulate formant frequencies to simulate syllables
    const syllableCount = text.split(' ').length;
    for (let i = 0; i < syllableCount; i++) {
      const t = now + (i / syllableCount) * duration;
      formant.frequency.setValueAtTime(600 + Math.random() * 400, t);
      formant2.frequency.setValueAtTime(900 + Math.random() * 600, t);
      // Slight pitch contour
      carrier.frequency.setValueAtTime(baseFreq + (Math.random() - 0.5) * 20, t);
    }

    carrier.start(now);
    vibrato.start(now);
    carrier.stop(now + duration);
    vibrato.stop(now + duration);
  }

  // Cinematic orchestral hit — powerful impact for mission reveal
  private cinematicHit() {
    if (!this.ctx || !this.sfxGain || !this.introReverb) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Deep bass impact
    [55, 110, 165].forEach((f) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 0.5, now + 1.5);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      const send = ctx.createGain();
      send.gain.value = 0.4;
      gain.connect(send);
      send.connect(this.introReverb!);
      osc.start(now);
      osc.stop(now + 2);
    });

    // Noise burst for impact texture
    const bufferSize = ctx.sampleRate * 0.3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000;
    const gain = ctx.createGain();
    gain.gain.value = 0.2;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    const send = ctx.createGain();
    send.gain.value = 0.3;
    gain.connect(send);
    send.connect(this.introReverb);
    source.start(now);
  }

  startIntro() {
    if (!this.ctx || !this.musicGain) return;
    this.stopIntro();
    const ctx = this.ctx;
    const musicGain = this.musicGain;
    const now = ctx.currentTime;

    // --- Reverb system for spatial echo between skyscrapers ---
    this.introReverb = this.createReverb(ctx);
    this.introReverbGain = ctx.createGain();
    this.introReverbGain.gain.value = 0.6;
    this.introReverb.connect(this.introReverbGain);
    this.introReverbGain.connect(musicGain);

    // --- Continuous soundtrack pad (runs the full ~42s, builds over time) ---
    const padGain = ctx.createGain();
    this.introPadGain = padGain;
    padGain.gain.setValueAtTime(0, now);
    padGain.gain.linearRampToValueAtTime(0.05, now + 3);       // quiet start
    padGain.gain.linearRampToValueAtTime(0.08, now + 16);       // build during narration
    padGain.gain.linearRampToValueAtTime(0.13, now + 28);       // intense during chase
    padGain.gain.linearRampToValueAtTime(0.16, now + 36);       // climax peak
    padGain.gain.linearRampToValueAtTime(0.10, now + 42);       // settle for transition
    padGain.gain.linearRampToValueAtTime(0.06, now + 45);        // crossfade tail
    padGain.connect(musicGain);

    // Deep cinematic sub-bass drone (throughout)
    const drone = ctx.createOscillator();
    drone.type = 'sawtooth';
    drone.frequency.setValueAtTime(55, now);
    drone.frequency.linearRampToValueAtTime(42, now + 42);
    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0, now);
    droneGain.gain.linearRampToValueAtTime(0.14, now + 4);
    drone.connect(droneGain);
    droneGain.connect(padGain);
    // Reverb send on drone
    const droneSend = ctx.createGain();
    droneSend.gain.value = 0.2;
    droneGain.connect(droneSend);
    droneSend.connect(this.introReverb);
    drone.start(now);
    drone.stop(now + 46);
    this.introNodes.push(drone, droneGain);

    // Mid pad chord (detuned sines) — futuristic ambient background music
    const padFreqs = [110, 165, 220, 277, 330];
    padFreqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = f;
      lfo.frequency.value = 0.12 + i * 0.04;
      lfoGain.gain.value = 2 + i * 0.5;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      gain.gain.value = 0.04;
      osc.connect(gain);
      gain.connect(padGain);
      osc.start(now);
      lfo.start(now);
      osc.stop(now + 46);
      lfo.stop(now + 46);
      this.introNodes.push(osc, lfo, gain, lfoGain);
    });

    // High shimmer (enters at chase for tension)
    const shimmer = ctx.createOscillator();
    shimmer.type = 'sine';
    shimmer.frequency.value = 880;
    const shimmerGain = ctx.createGain();
    shimmerGain.gain.setValueAtTime(0, now);
    shimmerGain.gain.setValueAtTime(0, now + 16);
    shimmerGain.gain.linearRampToValueAtTime(0.03, now + 20);
    shimmerGain.gain.linearRampToValueAtTime(0.05, now + 36);
    shimmerGain.gain.linearRampToValueAtTime(0, now + 42);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(padGain);
    shimmer.start(now);
    shimmer.stop(now + 44);
    this.introNodes.push(shimmer, shimmerGain);

    // --- Timed cinematic SFX with spatial panning ---
    const sfx = (delay: number, fn: () => void) => {
      const id = window.setTimeout(fn, delay * 1000);
      this.introTimers.push(id);
    };

    // ACT 1 — Narration (0–16s): city ambience, wind, electrical hum, drones, sirens
    // Wind blowing through the futuristic city (left to right pan)
    sfx(0.5, () => this.spatialNoise(4, 0.04, 400, -0.5, 'lowpass'));
    sfx(2.0, () => this.spatialNoise(3, 0.03, 300, 0.6, 'lowpass'));       // wind gust right
    // Soft electrical humming from AI buildings
    sfx(1.5, () => this.spatialOsc(180, 'sine', 3, 0.04, -0.3, 120));
    sfx(3.0, () => this.spatialOsc(200, 'sine', 2, 0.03, 0.4, 150));        // building hum right
    // Flying vehicle passing overhead (left to right doppler)
    sfx(4.0, () => this.spatialOsc(300, 'sawtooth', 1.2, 0.06, -0.8, 200));
    sfx(4.3, () => this.spatialOsc(250, 'sawtooth', 1.0, 0.05, 0, 180));
    sfx(4.6, () => this.spatialOsc(200, 'sawtooth', 0.8, 0.04, 0.8, 160));
    // Drone engine sounds
    sfx(5.5, () => this.spatialOsc(120, 'sawtooth', 1.5, 0.05, -0.5, 80));
    sfx(6.5, () => this.spatialOsc(140, 'sawtooth', 1.0, 0.04, 0.6, 90));
    // AI server/data center humming
    sfx(7.0, () => this.spatialOsc(100, 'sine', 2, 0.05, 0, 70));
    sfx(8.0, () => this.spatialOsc(150, 'sine', 2, 0.04, -0.4, 100));
    // Alien warning sirens (distant, panned)
    sfx(9.5, () => this.spatialOsc(220, 'sawtooth', 1.5, 0.08, -0.6, 110));
    sfx(10.5, () => this.spatialOsc(200, 'sawtooth', 1.5, 0.07, 0.5, 100));
    // Radio emergency broadcast
    sfx(11.5, () => this.spatialNoise(1.5, 0.05, 600, -0.3, 'bandpass'));
    sfx(12.5, () => this.spatialNoise(1, 0.04, 800, 0.4, 'bandpass'));
    // Holographic advertisement sounds (digital notifications)
    sfx(13.0, () => this.spatialOsc(800, 'sine', 0.15, 0.04, -0.7, 1200));
    sfx(13.5, () => this.spatialOsc(1000, 'sine', 0.15, 0.03, 0.7, 1500));
    // Low menace build
    sfx(14.0, () => this.spatialOsc(150, 'sawtooth', 2, 0.06, 0, 75));
    sfx(15.0, () => this.spatialNoise(2, 0.05, 300, -0.2, 'lowpass'));        // wind gust

    // ACT 2 — Escape (16–28s): fast chase music, breathing, footsteps, lasers, explosions
    // Drone engine approaching
    sfx(16.2, () => this.spatialOsc(70, 'sawtooth', 1.5, 0.12, -0.5, 50));
    // Heavy player breathing
    sfx(16.5, () => this.spatialNoise(0.4, 0.08, 800, 0, 'bandpass'));       // breath in
    sfx(17.0, () => this.spatialNoise(0.5, 0.07, 600, 0, 'bandpass'));       // breath out
    // Footsteps matching running animation
    sfx(17.2, () => this.spatialOsc(80, 'sine', 0.1, 0.1, 0, 40));
    sfx(17.5, () => this.spatialOsc(80, 'sine', 0.1, 0.1, 0, 40));
    sfx(17.8, () => this.spatialOsc(80, 'sine', 0.1, 0.09, 0, 40));
    sfx(18.1, () => this.spatialOsc(80, 'sine', 0.1, 0.09, 0, 40));
    // Laser blasts (spatial)
    sfx(17.5, () => this.spatialOsc(1200, 'sawtooth', 0.2, 0.1, -0.6, 400));
    sfx(18.5, () => { this.spatialNoise(0.6, 0.22, 800, 0.3, 'lowpass'); this.spatialOsc(80, 'sawtooth', 0.5, 0.18, 0, 30); }); // explosion
    // More footsteps
    sfx(18.5, () => this.spatialOsc(80, 'sine', 0.1, 0.08, 0, 40));
    sfx(18.8, () => this.spatialOsc(80, 'sine', 0.1, 0.08, 0, 40));
    // Glass breaking
    sfx(19.0, () => this.spatialNoise(0.4, 0.12, 4000, 0.5, 'highpass'));
    // Building collapse
    sfx(19.5, () => this.spatialNoise(0.5, 0.18, 600, -0.4, 'lowpass'));
    sfx(20.0, () => this.spatialNoise(0.3, 0.1, 2000, 0.6, 'bandpass'));      // falling concrete
    // More breathing (faster)
    sfx(20.0, () => this.spatialNoise(0.3, 0.07, 700, 0, 'bandpass'));
    sfx(20.5, () => this.spatialNoise(0.3, 0.06, 700, 0, 'bandpass'));
    // Laser blasts
    sfx(21.0, () => this.spatialOsc(1100, 'sawtooth', 0.2, 0.1, 0.7, 350));
    sfx(21.5, () => this.spatialOsc(1200, 'sawtooth', 0.15, 0.08, -0.5, 400));
    // Heartbeat increasing as danger rises
    sfx(22.0, () => this.heartbeat());
    sfx(22.7, () => this.heartbeat());
    sfx(23.4, () => this.heartbeat());
    sfx(24.1, () => this.heartbeat());
    // Fire effects
    sfx(23.0, () => this.spatialNoise(1.0, 0.06, 500, -0.3, 'lowpass'));       // fire roar
    // Big explosion with debris
    sfx(25.0, () => { this.spatialNoise(0.7, 0.25, 700, 0.2, 'lowpass'); this.spatialOsc(60, 'sawtooth', 0.6, 0.2, 0, 25); });
    sfx(25.3, () => this.spatialNoise(0.3, 0.08, 3000, -0.5, 'highpass'));    // flying debris
    // More laser
    sfx(26.0, () => this.spatialOsc(1000, 'sawtooth', 0.2, 0.1, 0.4, 300));
    // Alien growl getting closer (louder)
    sfx(26.5, () => this.spatialOsc(90, 'sawtooth', 0.5, 0.15, -0.3, 50));   // alien growl
    sfx(27.0, () => this.heartbeat());
    sfx(27.5, () => this.spatialNoise(0.3, 0.08, 800, 0, 'bandpass'));        // fast breathing

    // ACT 3 — Climax (28–36s): bridge collapse, massive laser, tower reveal, mission
    // Intense heartbeat
    sfx(28.5, () => this.heartbeat());
    sfx(29.2, () => this.heartbeat());
    sfx(29.9, () => this.heartbeat());
    // Alien roar (close and loud)
    sfx(29.5, () => this.spatialOsc(80, 'sawtooth', 1.0, 0.22, 0, 40));
    // Energy weapon charging
    sfx(30.0, () => this.spatialOsc(200, 'sawtooth', 0.5, 0.1, 0, 600));     // charging up
    // Massive laser + explosion
    sfx(30.5, () => { this.spatialNoise(1.0, 0.3, 500, 0, 'lowpass'); this.spatialOsc(50, 'sawtooth', 1, 0.25, 20); });
    // Bridge collapse
    sfx(31.5, () => this.spatialNoise(0.8, 0.22, 600, -0.3, 'lowpass'));
    sfx(32.0, () => this.spatialNoise(0.5, 0.15, 800, 0.4, 'lowpass'));       // falling concrete
    sfx(32.5, () => this.spatialNoise(0.4, 0.1, 3000, -0.5, 'highpass'));    // debris
    // Tower hum rises
    sfx(33.5, () => this.spatialOsc(140, 'sine', 2, 0.08, 0, 70));

    // MISSION REVEAL — Powerful cinematic orchestral hit + digital SFX
    sfx(34.0, () => this.cinematicHit());
    sfx(34.2, () => this.spatialOsc(2000, 'sine', 0.3, 0.06, 0, 3000));      // futuristic digital SFX

    // AI voice narration — calm, futuristic AI voice with robotic effects
    sfx(34.5, () => this.speakAI('Human Survival Protocol Activated', 180, 2.0));
    sfx(36.5, () => this.speakAI('Collect Water Drops', 170, 1.5));
    sfx(38.0, () => this.speakAI('Collect AI Chips', 170, 1.5));
    sfx(39.5, () => this.speakAI('Destroy the Alien AI Control System', 175, 2.0));
    sfx(41.5, () => this.speakAI('Save Humanity', 190, 1.5));

    // ACT 4 — Transition (36–42s): music settles, crossfades into gameplay
    sfx(38.0, () => this.spatialOsc(220, 'sine', 3, 0.05, 0, 330));
    sfx(40.0, () => this.spatialOsc(330, 'sine', 3, 0.04, 0, 440));
    // Hope motif
    sfx(35.0, () => this.playMelody([392, 523, 659, 784], 0.25, 'sine'));
  }

  // Heartbeat — two thumps (lub-dub) for intense moments
  private heartbeat() {
    if (!this.ctx || !this.sfxGain || !this.introReverb) return;
    const ctx = this.ctx;
    const playThump = (offset: number, vol: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(60, ctx.currentTime + offset);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + offset + 0.15);
      gain.gain.setValueAtTime(0, ctx.currentTime + offset);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + offset + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.2);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      const send = ctx.createGain();
      send.gain.value = 0.2;
      gain.connect(send);
      send.connect(this.introReverb!);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.25);
    };
    playThump(0, 0.18);
    playThump(0.18, 0.12);
  }

  stopIntro() {
    this.introNodes.forEach(n => { try { (n as any).stop?.(); } catch {} });
    this.introNodes = [];
    this.introTimers.forEach(id => clearTimeout(id));
    this.introTimers = [];
    if (this.introPadGain) {
      try { this.introPadGain.disconnect(); } catch {}
      this.introPadGain = null;
    }
    if (this.introReverbGain) {
      try { this.introReverbGain.disconnect(); } catch {}
      this.introReverbGain = null;
    }
    if (this.introReverb) {
      try { this.introReverb.disconnect(); } catch {}
      this.introReverb = null;
    }
  }
}

export const audioEngine = new AudioEngine();
