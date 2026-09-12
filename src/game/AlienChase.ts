import * as THREE from 'three';
import { COLORS } from './constants';

// Alien animation states — blend between these for smooth transitions
export type AlienState =
  | 'idle' | 'walk' | 'run' | 'sprint'
  | 'attack' | 'roar' | 'hit'
  | 'barrierBreak' | 'defeat' | 'retreat';

export class AlienChase {
  group: THREE.Group;
  active = false;
  warning = false;
  timer = 0;
  warningTimer = 0;
  nextChaseTime: number;
  aggression = 0.5;
  state: AlienState = 'idle';

  private animTime = 0;
  private stateTimer = 0;
  private retreating = false;
  private retreatTimer = 0;
  private retreatParticles: THREE.Points | null = null;

  // Body parts
  private head: THREE.Group;
  private torso: THREE.Mesh;
  private lowerTorso: THREE.Mesh;
  private leftArm: THREE.Group;
  private rightArm: THREE.Group;
  private leftLeg: THREE.Group;
  private rightLeg: THREE.Group;
  private leftEye: THREE.Mesh;
  private rightEye: THREE.Mesh;
  private eyeLight: THREE.PointLight;
  private glowLight: THREE.PointLight;
  private veinLines: THREE.LineSegments[] = [];
  private particleSystem: THREE.Points | null = null;

  // Chase movement
  private currentGap = 10;
  private alienSpeed = 0;
  private attackCooldown = 0;
  private hasAttacked = false;
  private barrierAttackTimer = 0;

  constructor() {
    this.group = new THREE.Group();
    this.group.visible = false;
    this.nextChaseTime = 30;

    // Dark biomechanical armor material
    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      metalness: 0.85,
      roughness: 0.25,
      emissive: 0x0a0a1a,
      emissiveIntensity: 0.1,
    });
    // Dark red muscle tissue underneath
    const tissueMat = new THREE.MeshStandardMaterial({
      color: 0x4a0a0a,
      metalness: 0.4,
      roughness: 0.6,
      emissive: COLORS.alienRed,
      emissiveIntensity: 0.08,
    });
    // Glowing blue eye material
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x00ddff });
    // Neon vein material
    const veinMat = new THREE.LineBasicMaterial({
      color: 0x00ddff,
      transparent: true,
      opacity: 0.7,
    });

    // --- Torso: tall, segmented biomechanical chest ---
    const torsoGroup = new THREE.Group();
    this.torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.5, 1.1, 8, 16),
      armorMat
    );
    this.torso.position.y = 1.9;
    this.torso.castShadow = true;
    torsoGroup.add(this.torso);

    // Chest plate detail
    const chestPlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.6, 0.15),
      armorMat
    );
    chestPlate.position.set(0, 2.1, 0.3);
    chestPlate.castShadow = true;
    torsoGroup.add(chestPlate);

    // Lower torso / pelvis
    this.lowerTorso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.38, 0.5, 6, 12),
      armorMat
    );
    this.lowerTorso.position.y = 1.0;
    this.lowerTorso.castShadow = true;
    torsoGroup.add(this.lowerTorso);

    // Spine ridge (back spikes)
    for (let i = 0; i < 5; i++) {
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.06, 0.3, 4),
        armorMat
      );
      spike.position.set(0, 1.4 + i * 0.35, -0.35);
      spike.rotation.x = -0.3;
      spike.castShadow = true;
      torsoGroup.add(spike);
    }
    this.group.add(torsoGroup);

    // --- Head: elongated alien skull ---
    this.head = new THREE.Group();
    const skull = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 16, 16),
      armorMat
    );
    skull.scale.set(0.8, 1.2, 1.15);
    skull.castShadow = true;
    this.head.add(skull);

    // Cranial ridges
    for (let i = 0; i < 3; i++) {
      const ridge = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.2, 0.3),
        armorMat
      );
      ridge.position.set((i - 1) * 0.12, 0.15, 0.1);
      this.head.add(ridge);
    }

    // Jaw plate
    const jaw = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.08, 0.35),
      armorMat
    );
    jaw.position.set(0, -0.25, 0.05);
    this.head.add(jaw);

    this.head.position.y = 2.95;
    this.group.add(this.head);

    // --- Glowing blue eyes ---
    this.leftEye = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 12, 12),
      eyeMat
    );
    this.leftEye.position.set(-0.13, 3.0, 0.3);
    this.group.add(this.leftEye);

    this.rightEye = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 12, 12),
      eyeMat
    );
    this.rightEye.position.set(0.13, 3.0, 0.3);
    this.group.add(this.rightEye);

    // Eye glow
    this.eyeLight = new THREE.PointLight(0x00ddff, 2, 6);
    this.eyeLight.position.set(0, 3.0, 0.4);
    this.group.add(this.eyeLight);

    // --- Arms with claws ---
    this.leftArm = this.createArm(armorMat, tissueMat, true);
    this.leftArm.position.set(-0.6, 2.3, 0);
    this.group.add(this.leftArm);

    this.rightArm = this.createArm(armorMat, tissueMat, false);
    this.rightArm.position.set(0.6, 2.3, 0);
    this.group.add(this.rightArm);

    // --- Legs ---
    this.leftLeg = this.createLeg(armorMat, tissueMat);
    this.leftLeg.position.set(-0.25, 1.25, 0);
    this.group.add(this.leftLeg);

    this.rightLeg = this.createLeg(armorMat, tissueMat);
    this.rightLeg.position.set(0.25, 1.25, 0);
    this.group.add(this.rightLeg);

    // --- Neon energy veins on torso ---
    const veinPoints = new Float32Array([
      // Left chest veins
      -0.3, 1.6, 0.35,  -0.4, 1.9, 0.35,
      -0.4, 1.9, 0.35,  -0.35, 2.2, 0.35,
      -0.35, 2.2, 0.35, -0.2, 2.4, 0.35,
      // Right chest veins
      0.3, 1.6, 0.35,  0.4, 1.9, 0.35,
      0.4, 1.9, 0.35,  0.35, 2.2, 0.35,
      0.35, 2.2, 0.35, 0.2, 2.4, 0.35,
      // Abdominal veins
      -0.15, 1.0, 0.35,  0.15, 1.0, 0.35,
      -0.15, 1.3, 0.35, 0.15, 1.3, 0.35,
    ]);
    const veinGeo = new THREE.BufferGeometry();
    veinGeo.setAttribute('position', new THREE.BufferAttribute(veinPoints, 3));
    const veins = new THREE.LineSegments(veinGeo, veinMat);
    this.group.add(veins);
    this.veinLines.push(veins);

    // --- Ambient glow ---
    this.glowLight = new THREE.PointLight(0x0044aa, 1.5, 10);
    this.glowLight.position.set(0, 2, 0);
    this.group.add(this.glowLight);

    // --- Ambient particles ---
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(30 * 3);
    for (let i = 0; i < 30; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 2;
      pos[i * 3 + 1] = Math.random() * 3.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x00ddff,
      size: 0.12,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.particleSystem = new THREE.Points(geo, pMat);
    this.particleSystem.frustumCulled = false;
    this.group.add(this.particleSystem);

    // --- Retreat particle system ---
    const rGeo = new THREE.BufferGeometry();
    const rPos = new Float32Array(80 * 3);
    for (let i = 0; i < 80; i++) {
      rPos[i * 3] = (Math.random() - 0.5) * 3;
      rPos[i * 3 + 1] = Math.random() * 4;
      rPos[i * 3 + 2] = (Math.random() - 0.5) * 3;
    }
    rGeo.setAttribute('position', new THREE.BufferAttribute(rPos, 3));
    const rMat = new THREE.PointsMaterial({
      color: 0x00ddff,
      size: 0.2,
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

  private createArm(armorMat: THREE.Material, _tissueMat: THREE.Material, isLeft: boolean): THREE.Group {
    const arm = new THREE.Group();
    const sign = isLeft ? -1 : 1;

    // Shoulder
    const shoulder = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 12, 12),
      armorMat
    );
    shoulder.castShadow = true;
    arm.add(shoulder);

    // Upper arm
    const upper = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.1, 0.6, 8),
      armorMat
    );
    upper.position.y = -0.35;
    upper.castShadow = true;
    arm.add(upper);

    // Elbow joint
    const elbow = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 10, 10),
      armorMat
    );
    elbow.position.y = -0.65;
    arm.add(elbow);

    // Forearm
    const fore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.08, 0.55, 8),
      armorMat
    );
    fore.position.y = -0.95;
    fore.castShadow = true;
    arm.add(fore);

    // Claw hand — three blade-like claws
    const clawGroup = new THREE.Group();
    clawGroup.position.y = -1.25;
    for (let i = 0; i < 3; i++) {
      const claw = new THREE.Mesh(
        new THREE.ConeGeometry(0.04, 0.3, 4),
        new THREE.MeshStandardMaterial({
          color: 0x0a0a1a,
          metalness: 0.9,
          roughness: 0.15,
          emissive: 0x00ddff,
          emissiveIntensity: 0.3,
        })
      );
      const angle = (i - 1) * 0.35;
      claw.position.set(sign * Math.sin(angle) * 0.08, -0.15, Math.cos(angle) * 0.08);
      claw.rotation.x = Math.PI + angle * 0.5;
      claw.castShadow = true;
      clawGroup.add(claw);
    }
    // Wrist plate
    const wrist = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.08, 0.14),
      armorMat
    );
    clawGroup.add(wrist);

    arm.add(clawGroup);

    return arm;
  }

  private createLeg(armorMat: THREE.Material, _tissueMat: THREE.Material): THREE.Group {
    const leg = new THREE.Group();

    // Hip joint
    const hip = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 12, 12),
      armorMat
    );
    hip.castShadow = true;
    leg.add(hip);

    // Thigh
    const thigh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.12, 0.7, 8),
      armorMat
    );
    thigh.position.y = -0.4;
    thigh.castShadow = true;
    leg.add(thigh);

    // Knee
    const knee = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 10, 10),
      armorMat
    );
    knee.position.y = -0.75;
    leg.add(knee);

    // Shin
    const shin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.09, 0.65, 8),
      armorMat
    );
    shin.position.y = -1.1;
    shin.castShadow = true;
    leg.add(shin);

    // Foot — clawed
    const foot = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.06, 0.35),
      armorMat
    );
    foot.position.set(0, -1.45, 0.08);
    foot.castShadow = true;
    leg.add(foot);

    // Toe claws
    for (let i = 0; i < 3; i++) {
      const toeClaw = new THREE.Mesh(
        new THREE.ConeGeometry(0.03, 0.15, 4),
        new THREE.MeshStandardMaterial({
          color: 0x0a0a1a,
          metalness: 0.9,
          roughness: 0.15,
          emissive: 0x00ddff,
          emissiveIntensity: 0.2,
        })
      );
      toeClaw.position.set((i - 1) * 0.06, -1.5, 0.22);
      toeClaw.rotation.x = Math.PI / 2;
      leg.add(toeClaw);
    }

    return leg;
  }

  startWarning() {
    this.warning = true;
    this.warningTimer = 3;
    this.setState('roar');
    this.group.visible = true;
    this.group.position.set(0, 0, 18);
    this.currentGap = 18;
    this.retreating = false;
    this.retreatParticles!.visible = false;
    (this.retreatParticles!.material as THREE.PointsMaterial).opacity = 0;
    this.hasAttacked = false;
  }

  startChase() {
    this.warning = false;
    this.active = true;
    this.timer = 0;
    this.setState('run');
    this.group.visible = true;
    this.group.position.set(0, 0, 12);
    this.currentGap = 10;
    this.alienSpeed = 0;
    this.hasAttacked = false;
  }

  endChase() {
    this.active = false;
    this.warning = false;
    this.retreating = true;
    this.retreatTimer = 0;
    this.setState('retreat');
    this.retreatParticles!.visible = true;
    (this.retreatParticles!.material as THREE.PointsMaterial).opacity = 0.8;
  }

  // State machine — smooth transitions between animation states
  private setState(newState: AlienState) {
    if (this.state === newState) return;
    this.state = newState;
    this.stateTimer = 0;
  }

  // Returns: 0 = nothing, 1 = start chase, 2 = end chase, 3 = attack hit (damage player), 4 = barrier destroyed
  update(dt: number, playerZ: number, playerSpeed: number, _playerEnergy: number, barrierActive: boolean): number {
    this.animTime += dt;
    this.stateTimer += dt;
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);

    if (this.warning) {
      this.warningTimer -= dt;
      const pulse = 0.85 + Math.sin(this.animTime * 8) * 0.15;
      // Alien slowly approaches during warning
      const approachZ = playerZ + 18 - (3 - this.warningTimer) * 2.5;
      this.group.position.z += (approachZ - this.group.position.z) * dt * 3;
      this.glowLight.intensity = 1.5 * pulse;
      this.eyeLight.intensity = 2 * pulse;
      this.group.scale.setScalar(pulse);
      this.animateRoar(pulse);
      if (this.warningTimer <= 0) return 1;
      return 0;
    }

    if (this.active) {
      this.timer += dt;

      // Speed up gradually based on aggression and time
      const targetSpeed = 5 + this.aggression * 4 + Math.min(3, this.timer * 0.3);
      this.alienSpeed += (targetSpeed - this.alienSpeed) * dt * 1.5;

      // Target gap: closer if player is slow, farther if fast
      const speedRatio = Math.min(1, playerSpeed / 30);
      const targetGap = 8 - speedRatio * 2.5 - this.aggression * 2;
      this.currentGap += (targetGap - this.currentGap) * dt * 2;

      // Smooth chase — match player Z, stay behind
      const targetZ = playerZ + this.currentGap;
      this.group.position.z += (targetZ - this.group.position.z) * dt * 4;
      this.group.position.x += (0 - this.group.position.x) * dt * 2;

      // Check if alien is close enough to attack
      const gap = this.group.position.z - playerZ;
      const inAttackRange = gap < 3.5;

      if (inAttackRange && this.attackCooldown <= 0 && !this.hasAttacked) {
        if (barrierActive) {
          // Attack the barrier instead of the player
          this.setState('barrierBreak');
          this.barrierAttackTimer = 0;
          this.attackCooldown = 5; // Barrier lasts 5 seconds
          return 0;
        } else {
          this.setState('attack');
          this.attackCooldown = 1.5;
          this.hasAttacked = true;
          return 3; // Signal: damage player
        }
      }

      // Handle barrier break animation
      if (this.state === 'barrierBreak') {
        this.barrierAttackTimer += dt;
        this.animateBarrierBreak();
        if (this.barrierAttackTimer >= 5) {
          this.setState('run');
          this.hasAttacked = false;
          return 4; // Signal: barrier destroyed, resume chase
        }
        return 0;
      }

      // Handle attack animation
      if (this.state === 'attack') {
        this.animateAttack();
        if (this.stateTimer >= 0.6) {
          this.setState('run');
          this.hasAttacked = false;
        }
        return 0;
      }

      // Determine movement state based on speed (skip if in attack/barrier animation)
      const currentState = this.state as string;
      const inAttackAnim = currentState === 'attack' || currentState === 'barrierBreak';
      if (!inAttackAnim) {
        if (this.alienSpeed > 8) this.setState('sprint');
        else if (this.alienSpeed > 5) this.setState('run');
        else this.setState('walk');
      }

      // Animate based on current state
      this.animateRun(this.alienSpeed);

      // Glowing eyes and veins pulse
      const eyePulse = 1 + Math.sin(this.animTime * 6) * 0.4;
      this.eyeLight.intensity = 2 * eyePulse;
      this.glowLight.intensity = 1.5 + Math.sin(this.animTime * 4) * 0.5;

      // Vein pulsing
      for (const vein of this.veinLines) {
        (vein.material as THREE.LineBasicMaterial).opacity =
          0.5 + Math.sin(this.animTime * 5) * 0.3;
      }

      if (this.timer >= 10) {
        return 2;
      }
    }

    if (this.retreating) {
      this.retreatTimer += dt;
      const t = this.retreatTimer;

      // Move alien backward and fade
      this.group.position.z += dt * 10;
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
        for (let i = 0; i < 80; i++) {
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

  // --- Animation methods ---

  private animateRun(speed: number) {
    const cycleSpeed = 4 + speed * 0.6 + this.aggression * 3;
    const cycle = this.animTime * cycleSpeed;
    const intensity = Math.min(1, speed / 10);

    // Arm swing — claws extended
    const armSwing = Math.sin(cycle) * (0.6 + intensity * 0.4);
    this.leftArm.rotation.x = armSwing;
    this.rightArm.rotation.x = -armSwing;

    // Leg swing
    const legSwing = Math.sin(cycle + Math.PI) * (0.5 + intensity * 0.3);
    this.leftLeg.rotation.x = legSwing;
    this.rightLeg.rotation.x = -legSwing;

    // Torso bob and lean
    const bob = Math.abs(Math.sin(cycle)) * 0.06 * (0.5 + intensity);
    this.torso.position.y = 1.9 + bob;
    this.lowerTorso.position.y = 1.0 + bob * 0.5;
    this.head.position.y = 2.95 + bob * 0.7;

    // Forward lean increases with speed
    const lean = 0.1 + intensity * 0.15;
    this.torso.rotation.x = lean;
    this.head.rotation.x = -0.05 - intensity * 0.1;

    // Slight scale pulse for running impact
    this.group.scale.setScalar(1 + Math.sin(cycle * 2) * 0.02 * intensity);
  }

  private animateRoar(pulse: number) {
    // Head back, arms spread, claws out
    this.head.rotation.x = -0.4;
    this.leftArm.rotation.x = -0.8;
    this.rightArm.rotation.x = -0.8;
    this.leftArm.rotation.z = 0.5;
    this.rightArm.rotation.z = -0.5;
    this.leftLeg.rotation.x = 0;
    this.rightLeg.rotation.x = 0;
    this.torso.rotation.x = -0.1;
    // Eye glow intensifies
    this.eyeLight.intensity = 3 * pulse;
  }

  private animateAttack() {
    const t = this.stateTimer / 0.6;
    // Lunge forward with claws
    const swipe = Math.sin(t * Math.PI);
    this.rightArm.rotation.x = -1.5 * swipe;
    this.rightArm.rotation.z = -0.8 * swipe;
    this.leftArm.rotation.x = -1.2 * swipe;
    this.head.rotation.x = 0.2 * swipe;
    this.torso.rotation.x = 0.25 * swipe;
    // Step forward
    this.leftLeg.rotation.x = 0.4 * swipe;
    this.rightLeg.rotation.x = -0.3 * swipe;
  }

  private animateBarrierBreak() {
    const cycle = this.animTime * 8;
    // Repeated heavy swipes
    const swipePhase = Math.sin(cycle) * 0.5 + 0.5;
    this.leftArm.rotation.x = -1.8 * swipePhase;
    this.rightArm.rotation.x = -1.8 * (1 - swipePhase);
    this.torso.rotation.x = 0.2 + Math.sin(cycle * 2) * 0.1;
    this.head.rotation.x = 0.15;
    // Stomp legs
    this.leftLeg.rotation.x = Math.sin(cycle * 2) * 0.3;
    this.rightLeg.rotation.x = -Math.sin(cycle * 2) * 0.3;
  }

  private traverseMaterials(cb: (mat: THREE.MeshStandardMaterial) => void) {
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m) => cb(m as THREE.MeshStandardMaterial));
      } else if (child instanceof THREE.LineSegments && child.material) {
        cb(child.material as unknown as THREE.MeshStandardMaterial);
      } else if (child instanceof THREE.Points && child.material) {
        cb(child.material as unknown as THREE.MeshStandardMaterial);
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
    this.state = 'idle';
    this.stateTimer = 0;
    this.alienSpeed = 0;
    this.attackCooldown = 0;
    this.hasAttacked = false;
    this.barrierAttackTimer = 0;
    this.retreatParticles!.visible = false;
    this.traverseMaterials((mat) => {
      mat.opacity = 1;
      mat.transparent = false;
    });
  }
}
