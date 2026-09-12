import * as THREE from 'three';
import { LANES, GRAVITY, JUMP_VELOCITY, SLIDE_DURATION, BASE_SPEED, MAX_SPEED, CharacterId } from './constants';

export type PlayerState = 'running' | 'jumping' | 'sliding' | 'dead';

export class Player {
  group: THREE.Group;
  state: PlayerState = 'running';
  lane = 1;
  x = 0;
  y = 0;
  z = 0;
  velocityY = 0;
  speed = BASE_SPEED;
  slideTimer = 0;
  hasDoubleJumped = false;
  invincible = false;
  invincibleTimer = 0;
  ghostTimer = 0;
  slowTimeTimer = 0;
  wallRunTimer = 0;
  shieldActive = false;
  character: CharacterId;
  private animTime = 0;
  private bodyParts: { [k: string]: THREE.Mesh } = {};
  private trail: THREE.Points | null = null;
  private trailPositions: Float32Array;
  private trailIndex = 0;

  constructor(character: CharacterId) {
    this.character = character;
    this.group = new THREE.Group();
    this.trailPositions = new Float32Array(60 * 3);
    this.build();
  }

  private build() {
    const c = this.character.color;
    const ac = this.character.accentColor;
    const bodyMat = new THREE.MeshStandardMaterial({ color: c, metalness: 0.6, roughness: 0.3, emissive: c, emissiveIntensity: 0.15 });
    const accentMat = new THREE.MeshStandardMaterial({ color: ac, metalness: 0.8, roughness: 0.2, emissive: ac, emissiveIntensity: 0.3 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, metalness: 0.7, roughness: 0.3 });

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.4), bodyMat);
    torso.position.y = 1.3;
    torso.castShadow = true;
    this.bodyParts.torso = torso;
    this.group.add(torso);

    // Chest accent
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.42), accentMat);
    chest.position.set(0, 1.35, 0.01);
    this.group.add(chest);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), darkMat);
    head.position.y = 2.0;
    head.castShadow = true;
    this.bodyParts.head = head;
    this.group.add(head);

    // Visor
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.02), new THREE.MeshStandardMaterial({ color: ac, emissive: ac, emissiveIntensity: 0.8 }));
    visor.position.set(0, 2.05, 0.23);
    this.group.add(visor);

    // Arms
    const armGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.7, 8);
    const armL = new THREE.Mesh(armGeo, bodyMat);
    armL.position.set(-0.5, 1.3, 0);
    armL.castShadow = true;
    this.bodyParts.armL = armL;
    this.group.add(armL);

    const armR = new THREE.Mesh(armGeo, bodyMat);
    armR.position.set(0.5, 1.3, 0);
    armR.castShadow = true;
    this.bodyParts.armR = armR;
    this.group.add(armR);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.15, 0.12, 0.8, 8);
    const legL = new THREE.Mesh(legGeo, darkMat);
    legL.position.set(-0.22, 0.45, 0);
    legL.castShadow = true;
    this.bodyParts.legL = legL;
    this.group.add(legL);

    const legR = new THREE.Mesh(legGeo, darkMat);
    legR.position.set(0.22, 0.45, 0);
    legR.castShadow = true;
    this.group.add(legR);
    this.bodyParts.legR = legR;

    // Energy backpack
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.2), accentMat);
    pack.position.set(0, 1.4, -0.25);
    this.group.add(pack);

    // Glow point light
    const light = new THREE.PointLight(ac, 1.5, 5);
    light.position.set(0, 1.5, 0);
    this.group.add(light);

    // Trail
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    const trailMat = new THREE.PointsMaterial({ color: ac, size: 0.15, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
    this.trail = new THREE.Points(trailGeo, trailMat);
    this.trail.frustumCulled = false;
    this.group.add(this.trail);
  }

  jump() {
    if (this.state === 'dead') return;
    if (this.state === 'running' || this.state === 'sliding') {
      this.state = 'jumping';
      this.velocityY = JUMP_VELOCITY;
      this.hasDoubleJumped = false;
      this.endSlide();
    } else if (this.state === 'jumping' && !this.hasDoubleJumped && this.character.ability === 'doubleJump') {
      this.velocityY = JUMP_VELOCITY * 0.85;
      this.hasDoubleJumped = true;
    }
  }

  slide() {
    if (this.state === 'dead') return;
    if (this.state === 'running') {
      this.state = 'sliding';
      this.slideTimer = SLIDE_DURATION;
    } else if (this.state === 'jumping') {
      this.velocityY = -JUMP_VELOCITY;
    }
  }

  moveLeft() {
    if (this.lane > 0) this.lane--;
  }

  moveRight() {
    if (this.lane < LANES.length - 1) this.lane++;
  }

  endSlide() {
    if (this.state === 'sliding') this.state = 'running';
    this.slideTimer = 0;
    this.bodyParts.torso?.scale.set(1, 1, 1);
  }

  activateAbility() {
    switch (this.character.ability) {
      case 'ghost': this.ghostTimer = 1.5; this.invincible = true; break;
      case 'slowTime': this.slowTimeTimer = 3; break;
      case 'shield': this.shieldActive = true; break;
    }
  }

  update(dt: number) {
    if (this.state === 'dead') return;

    // Speed ramp
    if (this.speed < MAX_SPEED) this.speed += dt * 0.12;

    // Lane interpolation
    const targetX = LANES[this.lane];
    this.x += (targetX - this.x) * Math.min(1, dt * 12);

    // Jump physics
    if (this.state === 'jumping') {
      this.velocityY -= GRAVITY * dt;
      this.y += this.velocityY * dt;
      if (this.y <= 0) {
        this.y = 0;
        this.velocityY = 0;
        this.state = 'running';
        this.hasDoubleJumped = false;
      }
    }

    // Slide timer
    if (this.state === 'sliding') {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0) this.endSlide();
    }

    // Timers
    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= dt;
      if (this.invincibleTimer <= 0 && this.ghostTimer <= 0) this.invincible = false;
    }
    if (this.ghostTimer > 0) {
      this.ghostTimer -= dt;
      if (this.ghostTimer <= 0) this.invincible = false;
    }
    if (this.slowTimeTimer > 0) this.slowTimeTimer -= dt;

    // Update group position
    this.group.position.set(this.x, this.y, this.z);

    // Animation
    this.animTime += dt * this.speed * 0.6;
    this.animate();

    // Trail
    this.updateTrail();
  }

  private animate() {
    const t = this.animTime;
    const isSliding = this.state === 'sliding';
    const isJumping = this.state === 'jumping';

    if (isSliding) {
      this.group.rotation.x = -Math.PI / 2.2;
      this.bodyParts.torso.scale.set(1, 0.5, 1);
    } else {
      this.group.rotation.x = 0;
      this.bodyParts.torso.scale.set(1, 1, 1);
    }

    if (isJumping) {
      this.bodyParts.legL.rotation.x = -0.5;
      this.bodyParts.legR.rotation.x = 0.5;
      this.bodyParts.armL.rotation.x = 0.8;
      this.bodyParts.armR.rotation.x = -0.8;
    } else if (!isSliding) {
      const swing = Math.sin(t * 2) * 0.6;
      this.bodyParts.legL.rotation.x = swing;
      this.bodyParts.legR.rotation.x = -swing;
      this.bodyParts.armL.rotation.x = -swing;
      this.bodyParts.armR.rotation.x = swing;
      this.bodyParts.torso.position.y = 1.3 + Math.abs(Math.sin(t * 2)) * 0.05;
      this.bodyParts.head.position.y = 2.0 + Math.abs(Math.sin(t * 2)) * 0.03;
    }

    // Ghost mode transparency
    if (this.ghostTimer > 0) {
      this.group.traverse(o => {
        if ((o as THREE.Mesh).material) {
          const m = (o as THREE.Mesh).material as THREE.Material;
          m.transparent = true;
          m.opacity = 0.4 + Math.sin(t * 10) * 0.2;
        }
      });
    } else if (this.invincible) {
      this.group.traverse(o => {
        if ((o as THREE.Mesh).material) {
          const m = (o as THREE.Mesh).material as THREE.Material;
          m.transparent = true;
          m.opacity = 0.5 + Math.sin(t * 15) * 0.3;
        }
      });
    } else {
      this.group.traverse(o => {
        if ((o as THREE.Mesh).material) {
          const m = (o as THREE.Mesh).material as THREE.Material;
          if (m.opacity !== 1) { m.transparent = false; m.opacity = 1; }
        }
      });
    }
  }

  private updateTrail() {
    const i = this.trailIndex * 3;
    this.trailPositions[i] = this.group.position.x + (Math.random() - 0.5) * 0.3;
    this.trailPositions[i + 1] = this.group.position.y + 0.5 + Math.random() * 0.5;
    this.trailPositions[i + 2] = this.group.position.z - 0.5;
    this.trailIndex = (this.trailIndex + 1) % 60;
    if (this.trail) {
      (this.trail.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    }
  }

  getBoundingBox(): THREE.Box3 {
    const box = new THREE.Box3();
    if (this.state === 'sliding') {
      box.setFromCenterAndSize(
        new THREE.Vector3(this.x, 0.3, this.z),
        new THREE.Vector3(0.8, 0.6, 0.8)
      );
    } else {
      box.setFromCenterAndSize(
        new THREE.Vector3(this.x, 1, this.z),
        new THREE.Vector3(0.8, 2, 0.8)
      );
    }
    return box;
  }

  die() {
    this.state = 'dead';
  }

  reset() {
    this.state = 'running';
    this.lane = 1;
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.velocityY = 0;
    this.speed = BASE_SPEED;
    this.slideTimer = 0;
    this.invincible = false;
    this.invincibleTimer = 0;
    this.ghostTimer = 0;
    this.slowTimeTimer = 0;
    this.shieldActive = false;
    this.hasDoubleJumped = false;
    this.group.position.set(0, 0, 0);
  }
}
