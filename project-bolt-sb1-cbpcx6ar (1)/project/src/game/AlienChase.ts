import * as THREE from 'three';
import { COLORS } from './constants';

export class AlienChase {
  group: THREE.Group;
  active = false;
  warning = false;
  timer = 0;
  warningTimer = 0;
  nextChaseTime: number;
  aggression = 0.5;

  private animTime = 0;
  private retreating = false;
  private retreatTimer = 0;
  private retreatParticles: THREE.Points | null = null;

  // Body parts for animation
  private head: THREE.Mesh;
  private torso: THREE.Mesh;
  private leftArm: THREE.Group;
  private rightArm: THREE.Group;
  private leftLeg: THREE.Group;
  private rightLeg: THREE.Group;
  private leftEye: THREE.Mesh;
  private rightEye: THREE.Mesh;
  private eyeLight: THREE.PointLight;
  private glowLight: THREE.PointLight;
  private particleSystem: THREE.Points | null = null;

  // Current distance behind player
  private currentGap = 10;

  constructor() {
    this.group = new THREE.Group();
    this.group.visible = false;
    this.nextChaseTime = 30;

    const skinMat = new THREE.MeshStandardMaterial({
      color: COLORS.alienRed,
      emissive: COLORS.alienRed,
      emissiveIntensity: 0.3,
      metalness: 0.5,
      roughness: 0.4,
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x2a0505,
      metalness: 0.7,
      roughness: 0.3,
      emissive: COLORS.alienPurple,
      emissiveIntensity: 0.15,
    });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });

    // Torso (elongated ribcage)
    this.torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 0.9, 6, 12), skinMat);
    this.torso.position.y = 1.7;
    this.torso.castShadow = true;
    this.group.add(this.torso);

    // Head (alien skull shape)
    this.head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 16), darkMat);
    this.head.position.y = 2.55;
    this.head.scale.set(0.85, 1, 1.1);
    this.head.castShadow = true;
    this.group.add(this.head);

    // Glowing eyes
    this.leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), eyeMat);
    this.leftEye.position.set(-0.14, 2.6, 0.32);
    this.group.add(this.leftEye);

    this.rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), eyeMat);
    this.rightEye.position.set(0.14, 2.6, 0.32);
    this.group.add(this.rightEye);

    // Eye glow light
    this.eyeLight = new THREE.PointLight(0xff3300, 1.5, 5);
    this.eyeLight.position.set(0, 2.6, 0.4);
    this.group.add(this.eyeLight);

    // Arms (upper + lower segments grouped)
    this.leftArm = this.createLimb(skinMat, darkMat);
    this.leftArm.position.set(-0.55, 2.1, 0);
    this.group.add(this.leftArm);

    this.rightArm = this.createLimb(skinMat, darkMat);
    this.rightArm.position.set(0.55, 2.1, 0);
    this.group.add(this.rightArm);

    // Legs (upper + lower segments grouped)
    this.leftLeg = this.createLimb(skinMat, darkMat, 1.2);
    this.leftLeg.position.set(-0.22, 1.15, 0);
    this.group.add(this.leftLeg);

    this.rightLeg = this.createLimb(skinMat, darkMat, 1.2);
    this.rightLeg.position.set(0.22, 1.15, 0);
    this.group.add(this.rightLeg);

    // Ambient glow
    this.glowLight = new THREE.PointLight(COLORS.alienRed, 2, 12);
    this.glowLight.position.set(0, 2, 0);
    this.group.add(this.glowLight);

    // Ambient particles
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(40 * 3);
    for (let i = 0; i < 40; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 2;
      pos[i * 3 + 1] = Math.random() * 3;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: COLORS.alienRed,
      size: 0.15,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.particleSystem = new THREE.Points(geo, mat);
    this.particleSystem.frustumCulled = false;
    this.group.add(this.particleSystem);

    // Retreat particle system (hidden until retreat)
    const rGeo = new THREE.BufferGeometry();
    const rPos = new Float32Array(60 * 3);
    for (let i = 0; i < 60; i++) {
      rPos[i * 3] = (Math.random() - 0.5) * 3;
      rPos[i * 3 + 1] = Math.random() * 4;
      rPos[i * 3 + 2] = (Math.random() - 0.5) * 3;
    }
    rGeo.setAttribute('position', new THREE.BufferAttribute(rPos, 3));
    const rMat = new THREE.PointsMaterial({
      color: 0xff6600,
      size: 0.25,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.retreatParticles = new THREE.Points(rGeo, rMat);
    this.retreatParticles.frustumCulled = false;
    this.retreatParticles.visible = false;
    this.group.add(this.retreatParticles);
  }

  private createLimb(mat: THREE.Material, darkMat: THREE.Material, length = 0.9): THREE.Group {
    const limb = new THREE.Group();
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, length * 0.55, 8), mat);
    upper.position.y = -length * 0.275;
    upper.castShadow = true;
    limb.add(upper);

    const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.07, length * 0.5, 8), mat);
    lower.position.y = -length * 0.75;
    lower.castShadow = true;
    limb.add(lower);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.3), darkMat);
    foot.position.set(0, -length, 0.08);
    foot.castShadow = true;
    limb.add(foot);

    return limb;
  }

  startWarning() {
    this.warning = true;
    this.warningTimer = 3;
    this.group.visible = true;
    this.group.position.set(0, 0, 15);
    this.currentGap = 15;
    this.retreating = false;
    this.retreatParticles!.visible = false;
    this.retreatParticles!.material.opacity = 0;
  }

  startChase() {
    this.warning = false;
    this.active = true;
    this.timer = 0;
    this.group.visible = true;
    this.group.position.set(0, 0, 12);
    this.currentGap = 10;
  }

  endChase() {
    this.active = false;
    this.warning = false;
    this.retreating = true;
    this.retreatTimer = 0;
    this.retreatParticles!.visible = true;
    this.retreatParticles!.material.opacity = 0.8;
  }

  update(dt: number, playerZ: number, playerSpeed: number, _playerEnergy: number): number {
    this.animTime += dt;

    if (this.warning) {
      this.warningTimer -= dt;
      const pulse = 0.8 + Math.sin(this.animTime * 8) * 0.2;
      this.group.position.z = playerZ + 15 - (3 - this.warningTimer) * 2;
      this.glowLight.intensity = 2 * pulse;
      this.eyeLight.intensity = 1.5 * pulse;
      this.group.scale.setScalar(pulse);
      if (this.warningTimer <= 0) return 1;
      return 0;
    }

    if (this.active) {
      this.timer += dt;

      // Target gap: closer if player is slow, farther if fast
      const speedRatio = Math.min(1, playerSpeed / 30);
      const targetGap = 9 - speedRatio * 3 - this.aggression * 2;
      this.currentGap += (targetGap - this.currentGap) * dt * 2;

      // Smooth chase — match player Z plus gap, follow lane slightly
      const targetZ = playerZ + this.currentGap;
      this.group.position.z += (targetZ - this.group.position.z) * dt * 3;
      this.group.position.x += (0 - this.group.position.x) * dt * 2;

      // Running animation
      const runCycle = this.animTime * (6 + this.aggression * 4);
      const armSwing = Math.sin(runCycle) * 0.8;
      const legSwing = Math.sin(runCycle + Math.PI) * 0.7;

      this.leftArm.rotation.x = armSwing;
      this.rightArm.rotation.x = -armSwing;
      this.leftLeg.rotation.x = legSwing;
      this.rightLeg.rotation.x = -legSwing;

      // Torso bob
      this.torso.position.y = 1.7 + Math.abs(Math.sin(runCycle)) * 0.08;
      this.head.position.y = 2.55 + Math.abs(Math.sin(runCycle)) * 0.06;

      // Lean forward
      this.torso.rotation.x = 0.15;
      this.head.rotation.x = -0.1;

      // Glowing eyes pulse
      const eyePulse = 1 + Math.sin(this.animTime * 7) * 0.5;
      this.eyeLight.intensity = 1.5 * eyePulse;
      (this.leftEye.material as THREE.MeshBasicMaterial).color.setHSL(0.05, 1, 0.5 + eyePulse * 0.1);
      (this.rightEye.material as THREE.MeshBasicMaterial).color.setHSL(0.05, 1, 0.5 + eyePulse * 0.1);

      // Glow pulse
      this.glowLight.intensity = 2 + Math.sin(this.animTime * 5) * 1;
      this.group.scale.setScalar(1 + Math.sin(this.animTime * 6) * 0.05);

      if (this.timer >= 10) {
        return 2;
      }
    }

    if (this.retreating) {
      this.retreatTimer += dt;
      const t = this.retreatTimer;

      // Move alien backward and fade
      this.group.position.z += dt * 8;
      const fade = Math.max(0, 1 - t / 1.5);
      this.group.scale.setScalar(fade);

      // Fade all materials
      this.traverseMaterials((mat) => {
        mat.transparent = true;
        mat.opacity = fade;
      });

      // Expand retreat particles
      if (this.retreatParticles) {
        const positions = this.retreatParticles.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < 60; i++) {
          positions[i * 3] *= 1 + dt * 2;
          positions[i * 3 + 1] += dt * 3;
          positions[i * 3 + 2] *= 1 + dt * 2;
        }
        this.retreatParticles.geometry.attributes.position.needsUpdate = true;
        (this.retreatParticles.material as THREE.PointsMaterial).opacity = fade * 0.8;
      }

      if (t >= 1.5) {
        this.retreating = false;
        this.group.visible = false;
        this.group.scale.setScalar(1);
        this.traverseMaterials((mat) => {
          mat.opacity = 1;
          mat.transparent = false;
        });
        this.retreatParticles!.visible = false;
      }
    }

    return -1;
  }

  private traverseMaterials(cb: (mat: THREE.MeshStandardMaterial) => void) {
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m) => cb(m as THREE.MeshStandardMaterial));
      }
    });
  }

  adaptAggression(playerSurvivalTime: number, playerEnergy: number) {
    if (playerEnergy > 70 && playerSurvivalTime > 60) {
      this.aggression = Math.min(1, this.aggression + 0.05);
      this.nextChaseTime = Math.max(20, this.nextChaseTime - 1);
    } else if (playerEnergy < 30) {
      this.aggression = Math.max(0.3, this.aggression - 0.03);
      this.nextChaseTime = Math.min(45, this.nextChaseTime + 3);
    }
  }

  reset() {
    this.active = false;
    this.warning = false;
    this.retreating = false;
    this.group.visible = false;
    this.group.scale.setScalar(1);
    this.timer = 0;
    this.warningTimer = 0;
    this.aggression = 0.5;
    this.nextChaseTime = 30;
    this.retreatParticles!.visible = false;
    this.traverseMaterials((mat) => {
      mat.opacity = 1;
      mat.transparent = false;
    });
  }
}
