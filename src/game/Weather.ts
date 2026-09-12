import * as THREE from 'three';
import { WeatherType, COLORS } from './constants';

export class WeatherSystem {
  private scene: THREE.Scene;
  private current: WeatherType = 'sunny';
  private rain: THREE.Points | null = null;
  private snow: THREE.Points | null = null;
  private fog: THREE.FogExp2 | null = null;
  private lightning: THREE.PointLight | null = null;
  private lightningTimer = 0;
  private active = true;
  private particleCount = 500;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  setActive(active: boolean) { this.active = active; }

  setWeather(type: WeatherType, quality: 'low' | 'medium' | 'high' | 'ultra') {
    this.current = type;
    this.clearParticles();
    this.particleCount = quality === 'low' ? 200 : quality === 'medium' ? 400 : quality === 'high' ? 600 : 1000;

    switch (type) {
      case 'rain':
      case 'thunderstorm':
        this.createRain();
        if (type === 'thunderstorm') {
          this.lightning = new THREE.PointLight(0xccddff, 0, 50);
          this.lightning.position.set(0, 20, -10);
          this.scene.add(this.lightning);
        }
        this.fog = new THREE.FogExp2(0x0a1929, 0.015);
        this.scene.fog = this.fog;
        break;
      case 'snow':
        this.createSnow();
        this.fog = new THREE.FogExp2(0xb0c4d8, 0.02);
        this.scene.fog = this.fog;
        break;
      case 'fog':
        this.fog = new THREE.FogExp2(0x333333, 0.04);
        this.scene.fog = this.fog;
        break;
      case 'autumn':
        this.createLeaves();
        this.fog = new THREE.FogExp2(0x3a2a1a, 0.01);
        this.scene.fog = this.fog;
        break;
      case 'sunny':
        this.scene.fog = new THREE.FogExp2(0x0a1929, 0.008);
        break;
    }
  }

  private createRain() {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const velocities = new Float32Array(this.particleCount);
    for (let i = 0; i < this.particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = Math.random() * 20;
      positions[i * 3 + 2] = -Math.random() * 60;
      velocities[i] = 0.3 + Math.random() * 0.2;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('velocity', new THREE.BufferAttribute(velocities, 1));
    const mat = new THREE.PointsMaterial({ color: 0x88ccff, size: 0.08, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
    this.rain = new THREE.Points(geo, mat);
    this.rain.frustumCulled = false;
    this.scene.add(this.rain);
  }

  private createSnow() {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    for (let i = 0; i < this.particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = Math.random() * 20;
      positions[i * 3 + 2] = -Math.random() * 60;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, transparent: true, opacity: 0.8, depthWrite: false });
    this.snow = new THREE.Points(geo, mat);
    this.snow.frustumCulled = false;
    this.scene.add(this.snow);
  }

  private createLeaves() {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    for (let i = 0; i < this.particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = Math.random() * 20;
      positions[i * 3 + 2] = -Math.random() * 60;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: COLORS.neonOrange, size: 0.2, transparent: true, opacity: 0.7, depthWrite: false });
    this.snow = new THREE.Points(geo, mat);
    this.snow.frustumCulled = false;
    this.scene.add(this.snow);
  }

  private clearParticles() {
    if (this.rain) { this.scene.remove(this.rain); this.rain.geometry.dispose(); (this.rain.material as THREE.Material).dispose(); this.rain = null; }
    if (this.snow) { this.scene.remove(this.snow); this.snow.geometry.dispose(); (this.snow.material as THREE.Material).dispose(); this.snow = null; }
    if (this.lightning) { this.scene.remove(this.lightning); this.lightning = null; }
  }

  update(dt: number, cameraZ: number) {
    if (!this.active) return;

    if (this.rain) {
      const pos = this.rain.geometry.getAttribute('position') as THREE.BufferAttribute;
      const vel = this.rain.geometry.getAttribute('velocity') as THREE.BufferAttribute;
      for (let i = 0; i < this.particleCount; i++) {
        pos.array[i * 3 + 1] -= vel.array[i] * dt * 30;
        pos.array[i * 3] += dt * 2;
        if (pos.array[i * 3 + 1] < 0) {
          pos.array[i * 3 + 1] = 20;
          pos.array[i * 3] = (Math.random() - 0.5) * 30;
          pos.array[i * 3 + 2] = cameraZ - Math.random() * 60;
        }
      }
      pos.needsUpdate = true;
    }

    if (this.snow && (this.current === 'snow' || this.current === 'autumn')) {
      const pos = this.snow.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < this.particleCount; i++) {
        pos.array[i * 3 + 1] -= dt * 2;
        pos.array[i * 3] += Math.sin(performance.now() / 1000 + i) * dt * 1.5;
        if (pos.array[i * 3 + 1] < 0) {
          pos.array[i * 3 + 1] = 20;
          pos.array[i * 3] = (Math.random() - 0.5) * 30;
          pos.array[i * 3 + 2] = cameraZ - Math.random() * 60;
        }
      }
      pos.needsUpdate = true;
    }

    if (this.lightning && this.current === 'thunderstorm') {
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        this.lightning.intensity = 3 + Math.random() * 5;
        this.lightningTimer = 0.1;
      } else {
        this.lightning.intensity *= 0.85;
      }
    }
  }

  dispose() {
    this.clearParticles();
    this.scene.fog = null;
  }
}
