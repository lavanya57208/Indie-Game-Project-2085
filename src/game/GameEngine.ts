import * as THREE from 'three';
import { Player } from './Player';
import { Track, SegmentData } from './Track';
import { CameraRig } from './CameraRig';
import { WeatherSystem } from './Weather';
import { AlienChase } from './AlienChase';
import { input, InputAction } from './input';
import { audioEngine } from './audio';
import {
  SEGMENT_LENGTH, SEGMENT_COUNT, MAP_ORDER, WEATHER_CYCLE, TRACK_WIDTH,
  CHASE_DURATION, CHASE_WARNING_TIME, CHASE_ENERGY_DRAIN_INTERVAL,
  CHASE_ENERGY_DRAIN, MAGNETIC_BOOTS_DRAIN, SHIELD_COOLDOWN, BARRIER_DURATION,
  MAP_CHANGE_INTERVAL, WEATHER_CHANGE_INTERVAL, WIN_AI_CHIPS,
  PLAYER_START_ENERGY, COLORS, GraphicsQuality, CharacterId, MapType, WeatherType,
} from './constants';

export interface GameStats {
  energy: number;
  waterDrops: number;
  aiChips: number;
  distance: number;
  speed: number;
  isChasing: boolean;
  chaseWarning: boolean;
  magneticBootsReady: boolean;
  shieldReady: boolean;
  barrierReady: boolean;
  shieldActive: boolean;
  barrierActive: boolean;
  currentMap: MapType;
  currentWeather: WeatherType;
  timeAlive: number;
  mapTransition: boolean;
  won: boolean;
  winReason: string;
}

export type GameCallbacks = {
  onStatsUpdate: (stats: GameStats) => void;
  onGameOver: (stats: GameStats) => void;
  onVictory: (stats: GameStats) => void;
  onMapChange: (map: MapType) => void;
  onWeatherChange: (weather: WeatherType) => void;
  onChaseStart: () => void;
  onChaseEnd: () => void;
  onCollect: (type: 'water' | 'aiChip') => void;
  onCrash: () => void;
};

export class GameEngine {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private cameraRig: CameraRig;
  private player: Player;
  private track: Track;
  private weather: WeatherSystem;
  private alien: AlienChase;
  private segments: SegmentData[] = [];
  private clock = new THREE.Clock();
  private running = false;
  private paused = false;
  private rafId: number | null = null;
  private container: HTMLElement;
  private callbacks: GameCallbacks;
  private character: CharacterId;

  // Game state
  private energy = PLAYER_START_ENERGY;
  private waterDrops = 0;
  private aiChips = 0;
  private distance = 0;
  private timeAlive = 0;
  private mapIndex = 0;
  private weatherIndex = 0;
  private mapTimer = 0;
  private weatherTimer = 0;
  private chaseTimer = 0;
  private chaseActive = false;
  private chaseWarningActive = false;
  private chaseEnergyTimer = 0;
  private alienAudioTimer = 0;
  private alienBreathTimer = 0;
  private magneticBootsActive = false;
  private shieldCooldown = 0;
  private shieldActive = false;
  private barrierActive = false;
  private barrierTimer = 0;
  private mapTransitioning = false;
  private transitionTimer = 0;
  private won = false;
  private lost = false;
  private quality: GraphicsQuality = 'high';
  private dayNightEnabled = true;
  private weatherEnabled = true;
  private cameraShakeEnabled = true;
  private dayNightTimer = 0;
  private hemisphereLight: THREE.HemisphereLight;
  private directionalLight: THREE.DirectionalLight;
  private sprintTimer = 0;

  constructor(container: HTMLElement, character: CharacterId, callbacks: GameCallbacks) {
    this.container = container;
    this.character = character;
    this.callbacks = callbacks;

    this.renderer = new THREE.WebGLRenderer({ antialias: this.quality !== 'low', powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality === 'ultra' ? 2 : this.quality === 'high' ? 1.5 : 1));
    this.renderer.shadowMap.enabled = this.quality !== 'low';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a1929, 0.008);
    this.scene.background = new THREE.Color(0x0a1929);

    this.hemisphereLight = new THREE.HemisphereLight(0x4488ff, 0x0a1929, 0.6);
    this.scene.add(this.hemisphereLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    this.directionalLight.position.set(5, 20, 10);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.set(1024, 1024);
    this.directionalLight.shadow.camera.left = -15;
    this.directionalLight.shadow.camera.right = 15;
    this.directionalLight.shadow.camera.top = 15;
    this.directionalLight.shadow.camera.bottom = -15;
    this.directionalLight.shadow.camera.far = 50;
    this.scene.add(this.directionalLight);

    this.cameraRig = new CameraRig(container.clientWidth / container.clientHeight);
    this.cameraRig.setShakeEnabled(this.cameraShakeEnabled);

    this.player = new Player(character);
    this.player.z = 0;
    this.scene.add(this.player.group);

    this.track = new Track();
    this.track.setMapType(MAP_ORDER[0]);
    this.initSegments();

    this.weather = new WeatherSystem(this.scene);
    this.weather.setWeather(WEATHER_CYCLE[0], this.quality);

    this.alien = new AlienChase();
    this.scene.add(this.alien.group);

    // Nova starts with shield
    if (character.ability === 'shield') {
      this.shieldActive = true;
    }

    this.setupInput();
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
  }

  private initSegments() {
    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const z = -i * SEGMENT_LENGTH;
      const diff = Math.min(1, this.timeAlive / 120);
      const seg = this.track.createSegment(z, diff);
      this.scene.add(seg.group);
      this.segments.push(seg);
    }
  }

  private setupInput() {
    input.init(this.container);
    input.onAction((action: InputAction) => {
      if (!this.running || this.paused) return;
      switch (action) {
        case 'jump': this.player.jump(); audioEngine.playSound('jump'); break;
        case 'slide': this.player.slide(); audioEngine.playSound('slide'); break;
        case 'left': this.player.moveLeft(); audioEngine.playSound('laneSwitch'); break;
        case 'right': this.player.moveRight(); audioEngine.playSound('laneSwitch'); break;
        case 'ability': this.handleAbility(); break;
      }
    });
  }

  private handleAbility() {
    if (this.chaseActive && !this.magneticBootsActive) {
      this.magneticBootsActive = true;
      audioEngine.playSound('ability');
    } else if (this.shieldCooldown <= 0 && !this.shieldActive) {
      this.shieldActive = true;
      this.shieldCooldown = SHIELD_COOLDOWN;
      audioEngine.playSound('shield');
    } else if (!this.barrierActive && this.chaseActive) {
      this.barrierActive = true;
      this.barrierTimer = BARRIER_DURATION;
      audioEngine.playSound('barrier');
    }
  }

  start() {
    this.running = true;
    this.paused = false;
    this.clock.start();
    audioEngine.init();
    audioEngine.resume();
    audioEngine.startMusic();
    this.loop();
  }

  pause() {
    this.paused = true;
    audioEngine.stopMusic();
  }

  resume() {
    this.paused = false;
    this.clock.start();
    audioEngine.startMusic();
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    audioEngine.stopAll();
  }

  destroy() {
    this.stop();
    input.destroy();
    window.removeEventListener('resize', this.handleResize);
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }

  private handleResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.renderer.setSize(w, h);
    this.cameraRig.resize(w / h);
  }

  setQuality(q: GraphicsQuality) {
    this.quality = q;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, q === 'ultra' ? 2 : q === 'high' ? 1.5 : 1));
    this.weather.setWeather(WEATHER_CYCLE[this.weatherIndex], q);
  }

  setCameraShake(enabled: boolean) { this.cameraShakeEnabled = enabled; this.cameraRig.setShakeEnabled(enabled); }
  setWeatherEnabled(enabled: boolean) { this.weatherEnabled = enabled; this.weather.setActive(enabled); }
  setDayNightEnabled(enabled: boolean) { this.dayNightEnabled = enabled; }
  setMotionBlur(_enabled: boolean) {}

  private loop = () => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.loop);

    if (this.paused) {
      this.renderer.render(this.scene, this.cameraRig.camera);
      return;
    }

    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.update(dt);
    this.renderer.render(this.scene, this.cameraRig.camera);
  };

  private update(dt: number) {
    this.timeAlive += dt;

    // Slow time ability
    const timeScale = this.player.slowTimeTimer > 0 ? 0.5 : 1;
    const scaledDt = dt * timeScale;

    // Player update
    this.player.update(scaledDt);
    this.player.z -= this.player.speed * scaledDt;
    this.distance += this.player.speed * scaledDt;

    // Sprint timer (magnetic boots speed boost)
    if (this.magneticBootsActive) {
      this.sprintTimer += dt;
      this.player.speed = Math.min(this.player.speed + dt * 5, 50);
    }

    // Track update
    this.track.updateObstacles(scaledDt);
    this.recycleSegments();

    // Weather
    if (this.weatherEnabled) {
      this.weather.update(dt, this.player.z);
    }

    // Day/night
    if (this.dayNightEnabled) {
      this.dayNightTimer += dt;
      const phase = (Math.sin(this.dayNightTimer / 30) + 1) / 2;
      this.hemisphereLight.intensity = 0.3 + phase * 0.5;
      this.directionalLight.intensity = 0.5 + phase * 0.8;
    }

    // Map change
    this.mapTimer += dt;
    if (this.mapTimer >= MAP_CHANGE_INTERVAL && !this.mapTransitioning) {
      this.startMapTransition();
    }
    if (this.mapTransitioning) {
      this.transitionTimer += dt;
      this.updateMapTransition();
    }

    // Weather change
    this.weatherTimer += dt;
    if (this.weatherTimer >= WEATHER_CHANGE_INTERVAL && this.weatherEnabled) {
      this.weatherTimer = 0;
      this.weatherIndex = (this.weatherIndex + 1) % WEATHER_CYCLE.length;
      this.weather.setWeather(WEATHER_CYCLE[this.weatherIndex], this.quality);
      this.callbacks.onWeatherChange(WEATHER_CYCLE[this.weatherIndex]);
    }

    // Alien chase
    this.updateChase(dt);

    // Shield cooldown
    if (this.shieldCooldown > 0) this.shieldCooldown -= dt;

    // Barrier timer
    if (this.barrierActive) {
      this.barrierTimer -= dt;
      if (this.barrierTimer <= 0) {
        this.barrierActive = false;
      }
    }

    // Collisions
    this.checkCollisions();

    // Camera
    this.cameraRig.update(dt, this.player, this.chaseActive, this.magneticBootsActive, this.alien.group.position.z);

    // Emit stats
    this.emitStats();

    // Win check
    if (this.aiChips >= WIN_AI_CHIPS && !this.won) {
      this.won = true;
      this.callbacks.onVictory(this.getStats());
      audioEngine.playSound('victory');
      this.stop();
    }

    // Energy check
    if (this.energy <= 0 && !this.lost) {
      this.gameOver();
    }
  }

  private updateChase(dt: number) {
    this.chaseTimer += dt;

    // Warning phase
    if (!this.chaseActive && !this.chaseWarningActive && this.chaseTimer >= this.alien.nextChaseTime - CHASE_WARNING_TIME) {
      this.chaseWarningActive = true;
      this.alien.startWarning();
      audioEngine.playSound('chaseWarning');
      audioEngine.playSound('alienRoar');
      this.cameraRig.addShake(0.15);
    }

    // Start chase
    if (this.chaseWarningActive && this.chaseTimer >= this.alien.nextChaseTime) {
      this.chaseWarningActive = false;
      this.chaseActive = true;
      this.chaseEnergyTimer = 0;
      this.alien.startChase();
      audioEngine.setChaseMode(true);
      audioEngine.playSound('chaseStart');
      audioEngine.playSound('alienGrowl');
      this.cameraRig.addShake(0.4);
      this.callbacks.onChaseStart();
    }

    // During chase
    if (this.chaseActive) {
      const result = this.alien.update(dt, this.player.z, this.player.speed, this.energy, this.barrierActive);
      this.chaseEnergyTimer += dt;

      // Alien footsteps and breathing — periodic
      this.alienAudioTimer += dt;
      if (this.alienAudioTimer >= 0.4) {
        audioEngine.playSound('alienFootstep');
        this.alienAudioTimer = 0;
      }
      this.alienBreathTimer += dt;
      if (this.alienBreathTimer >= 1.5) {
        audioEngine.playSound('alienBreath');
        this.alienBreathTimer = 0;
      }

      // Energy drain
      if (this.chaseEnergyTimer >= CHASE_ENERGY_DRAIN_INTERVAL) {
        this.chaseEnergyTimer = 0;
        if (this.magneticBootsActive) {
          this.energy -= MAGNETIC_BOOTS_DRAIN / (CHASE_DURATION / CHASE_ENERGY_DRAIN_INTERVAL);
        } else {
          this.energy -= CHASE_ENERGY_DRAIN;
        }
        this.cameraRig.addShake(0.15);
      }

      // Alien attack — damage player
      if (result === 3) {
        this.energy -= 20;
        audioEngine.playSound('alienAttack');
        this.cameraRig.addShake(0.5);
      }

      // Barrier destroyed by alien
      if (result === 4) {
        this.barrierActive = false;
        audioEngine.playSound('barrierSmash');
        audioEngine.playSound('alienGrowl');
        this.cameraRig.addShake(0.4);
      }

      if (result === 2) {
        this.endChase();
      }
    }
  }

  private endChase() {
    this.chaseActive = false;
    this.magneticBootsActive = false;
    this.sprintTimer = 0;
    this.alien.endChase();
    audioEngine.setChaseMode(false);
    audioEngine.playSound('chaseEnd');
    this.chaseTimer = 0;
    // Adaptive AI
    this.alien.adaptAggression(this.timeAlive, this.energy);
    this.callbacks.onChaseEnd();
  }

  private startMapTransition() {
    this.mapTransitioning = true;
    this.transitionTimer = 0;
    this.mapIndex = (this.mapIndex + 1) % MAP_ORDER.length;
    audioEngine.playSound('mapTransition');
  }

  private updateMapTransition() {
    const t = this.transitionTimer / 2; // 2 second transition
    if (t < 0.5) {
      // Fade out current
      this.scene.background = new THREE.Color(0x0a1929).lerp(new THREE.Color(COLORS.cyan), t * 2);
    } else if (t < 1) {
      // Switch and fade in
      if (t > 0.5 && this.track['mapType'] !== MAP_ORDER[this.mapIndex]) {
        this.track.setMapType(MAP_ORDER[this.mapIndex]);
        // Rebuild segments
        for (const seg of this.segments) {
          this.scene.remove(seg.group);
          this.track.disposeSegment(seg);
        }
        this.segments = [];
        this.initSegments();
        this.callbacks.onMapChange(MAP_ORDER[this.mapIndex]);
      }
      this.scene.background = new THREE.Color(COLORS.cyan).lerp(new THREE.Color(0x0a1929), (t - 0.5) * 2);
    } else {
      this.mapTransitioning = false;
      this.mapTimer = 0;
      this.scene.background = new THREE.Color(0x0a1929);
    }
  }

  private recycleSegments() {
    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      if (seg.group.position.z > this.player.z + SEGMENT_LENGTH * 2) {
        // Recycle: move to front
        const minZ = Math.min(...this.segments.map(s => s.group.position.z));
        this.scene.remove(seg.group);
        this.track.disposeSegment(seg);
        const diff = Math.min(1, this.timeAlive / 120);
        const newSeg = this.track.createSegment(minZ - SEGMENT_LENGTH, diff);
        this.scene.add(newSeg.group);
        this.segments[i] = newSeg;
      }
    }
  }

  private checkCollisions() {
    const playerZ = this.player.z;

    for (const seg of this.segments) {
      const segWorldZ = seg.group.position.z;
      for (const obs of seg.obstacles) {
        const obsWorldZ = segWorldZ + obs.z;
        if (Math.abs(obsWorldZ - playerZ) > 2) continue;

        if (!obs.active || !obs.isDangerous) continue;
        if (this.player.invincible || this.shieldActive) {
          if (this.shieldActive && obs.isDangerous) {
            this.shieldActive = false;
            audioEngine.playSound('shield');
            continue;
          }
          continue;
        }

        // Check lane overlap
        if (obs.type === 'upperLaser' || obs.type === 'lowerLaser' || obs.type === 'rotatingLaser') {
          // Full width - check height
          if (obs.type === 'upperLaser' && this.player.state !== 'sliding') {
            this.handleCrash();
            return;
          }
          if (obs.type === 'lowerLaser' && this.player.state !== 'jumping' && this.player.y < 0.5) {
            this.handleCrash();
            return;
          }
          if (obs.type === 'rotatingLaser') {
            const armAngle = (obs.mesh as THREE.Object3D).rotation.z % (Math.PI * 2);
            const playerAngle = Math.atan2(this.player.y - 1, this.player.x || 0.001);
            if (Math.abs(armAngle - playerAngle) < 0.3 && Math.abs(this.player.x) < TRACK_WIDTH / 2) {
              this.handleCrash();
              return;
            }
          }
        } else {
          // Lane-specific
          if (obs.lane === this.player.lane) {
            if (obs.type === 'drone') {
              if (this.player.state !== 'sliding' && Math.abs(obsWorldZ - playerZ) < 1.5) {
                this.handleCrash();
                return;
              }
            } else if (obs.type === 'mine') {
              if (this.player.y < 0.5 && Math.abs(obsWorldZ - playerZ) < 1) {
                this.handleCrash();
                return;
              }
            } else if (obs.type === 'laserGate') {
              if (obs.active && Math.abs(obsWorldZ - playerZ) < 1) {
                this.handleCrash();
                return;
              }
            } else if (obs.type === 'debris') {
              if (Math.abs(obsWorldZ - playerZ) < 1.5) {
                this.handleCrash();
                return;
              }
            }
          }
        }
      }

      // Collectibles
      for (const col of seg.collectibles) {
        if (col.collected) continue;
        const colWorldZ = segWorldZ + col.z;
        if (Math.abs(colWorldZ - playerZ) > 1.5) continue;
        if (col.lane !== this.player.lane) continue;
        if (Math.abs(this.player.y + 1 - col.y) > 1.5) continue;

        col.collected = true;
        col.mesh.visible = false;

        if (col.type === 'water') {
          const restore = this.character.ability === 'extraWater' ? 15 : 10;
          this.energy = Math.min(100, this.energy + restore);
          this.waterDrops++;
          audioEngine.playSound('collectWater');
          this.callbacks.onCollect('water');
        } else if (col.type === 'aiChip') {
          this.aiChips++;
          audioEngine.playSound('collectChip');
          this.callbacks.onCollect('aiChip');
        } else if (col.type === 'fakeWater') {
          this.energy = Math.max(0, this.energy - 10);
          audioEngine.playSound('laser');
        } else if (col.type === 'fakeChip') {
          this.energy = Math.max(0, this.energy - 5);
          audioEngine.playSound('laser');
        }
      }
    }
  }

  private handleCrash() {
    if (this.shieldActive) {
      this.shieldActive = false;
      audioEngine.playSound('shield');
      this.player.invincibleTimer = 1;
      this.player.invincible = true;
      return;
    }
    audioEngine.playSound('crash');
    audioEngine.playSound('explosion');
    this.cameraRig.addShake(1);
    this.callbacks.onCrash();
    this.gameOver();
  }

  private gameOver() {
    if (this.lost) return;
    this.lost = true;
    this.player.die();
    audioEngine.playSound('gameOver');
    this.callbacks.onGameOver(this.getStats());
    setTimeout(() => this.stop(), 500);
  }

  private emitStats() {
    this.callbacks.onStatsUpdate(this.getStats());
  }

  private getStats(): GameStats {
    return {
      energy: Math.max(0, Math.round(this.energy)),
      waterDrops: this.waterDrops,
      aiChips: this.aiChips,
      distance: Math.round(this.distance),
      speed: Math.round(this.player.speed),
      isChasing: this.chaseActive,
      chaseWarning: this.chaseWarningActive,
      magneticBootsReady: this.chaseActive && !this.magneticBootsActive,
      shieldReady: this.shieldCooldown <= 0 && !this.shieldActive,
      shieldActive: this.shieldActive,
      barrierReady: this.chaseActive && !this.barrierActive,
      barrierActive: this.barrierActive,
      currentMap: MAP_ORDER[this.mapIndex],
      currentWeather: WEATHER_CYCLE[this.weatherIndex],
      timeAlive: this.timeAlive,
      mapTransition: this.mapTransitioning,
      won: this.won,
      winReason: this.aiChips >= WIN_AI_CHIPS ? 'AI Control System Disabled' : '',
    };
  }

  restart() {
    this.energy = PLAYER_START_ENERGY;
    this.waterDrops = 0;
    this.aiChips = 0;
    this.distance = 0;
    this.timeAlive = 0;
    this.mapTimer = 0;
    this.weatherTimer = 0;
    this.chaseTimer = 0;
    this.chaseActive = false;
    this.chaseWarningActive = false;
    this.chaseEnergyTimer = 0;
    this.alienAudioTimer = 0;
    this.alienBreathTimer = 0;
    this.magneticBootsActive = false;
    this.shieldActive = this.character.ability === 'shield';
    this.shieldCooldown = 0;
    this.barrierActive = false;
    this.mapTransitioning = false;
    this.won = false;
    this.lost = false;
    this.mapIndex = 0;
    this.weatherIndex = 0;

    for (const seg of this.segments) {
      this.scene.remove(seg.group);
      this.track.disposeSegment(seg);
    }
    this.segments = [];
    this.track.setMapType(MAP_ORDER[0]);
    this.initSegments();
    this.weather.setWeather(WEATHER_CYCLE[0], this.quality);
    this.alien.reset();
    this.player.reset();
    this.lost = false;
    this.running = true;
    this.paused = false;
    this.clock.start();
    audioEngine.startMusic();
    if (!this.rafId) this.loop();
  }
}

