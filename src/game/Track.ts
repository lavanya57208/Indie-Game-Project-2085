import * as THREE from 'three';
import { SEGMENT_LENGTH, TRACK_WIDTH, LANES, COLORS, MapType } from './constants';

export type ObstacleType =
  | 'upperLaser' | 'lowerLaser' | 'rotatingLaser' | 'laserGate'
  | 'drone' | 'mine' | 'debris' | 'collapsingRoad' | 'brokenBridge' | 'movingPlatform';

export type CollectibleType = 'water' | 'aiChip' | 'fakeWater' | 'fakeChip';

interface Obstacle {
  mesh: THREE.Object3D;
  type: ObstacleType;
  lane: number;
  z: number;
  passed: boolean;
  update?: (dt: number, z: number) => void;
  requires: 'jump' | 'slide' | 'avoid' | 'none';
  isDangerous: boolean;
  active: boolean;
}

interface Collectible {
  mesh: THREE.Object3D;
  type: CollectibleType;
  lane: number;
  z: number;
  collected: boolean;
  y: number;
  spin: number;
}

export interface SegmentData {
  group: THREE.Group;
  z: number;
  obstacles: Obstacle[];
  collectibles: Collectible[];
  decorations: THREE.Object3D[];
  hasHiddenArea: boolean;
  hiddenAreaMesh: THREE.Object3D | null;
}

export class Track {
  segments: SegmentData[] = [];
  private mapType: MapType = 'cyberCity';
  totalDistance = 0;

  constructor() {}

  setMapType(type: MapType) { this.mapType = type; }

  getGroundColor(): number {
    switch (this.mapType) {
      case 'cyberCity': return 0x1a1a3e;
      case 'industrialFactory': return 0x2e2e1a;
      case 'brokenHighway': return 0x3a3a3a;
      case 'denseForest': return 0x1a3a1a;
      case 'snowMountains': return 0xc8d8e8;
      case 'undergroundLab': return 0x2a2a3a;
      case 'spaceStation': return 0x1a1a2e;
    }
  }

  getFogColor(): number {
    switch (this.mapType) {
      case 'cyberCity': return 0x0a1929;
      case 'industrialFactory': return 0x1a1505;
      case 'brokenHighway': return 0x222222;
      case 'denseForest': return 0x0a2a0a;
      case 'snowMountains': return 0xb0c4d8;
      case 'undergroundLab': return 0x1a1a2a;
      case 'spaceStation': return 0x000018;
    }
  }

  getDecorationColor(): number {
    switch (this.mapType) {
      case 'cyberCity': return COLORS.cyan;
      case 'industrialFactory': return COLORS.neonOrange;
      case 'brokenHighway': return 0x888888;
      case 'denseForest': return 0x4a8a4a;
      case 'snowMountains': return 0xffffff;
      case 'undergroundLab': return COLORS.neonGreen;
      case 'spaceStation': return 0x6666ff;
    }
  }

  createSegment(z: number, difficulty: number): SegmentData {
    const group = new THREE.Group();
    group.position.z = z;
    const obstacles: Obstacle[] = [];
    const collectibles: Collectible[] = [];
    const decorations: THREE.Object3D[] = [];

    this.buildGround(group, z);
    this.buildDecorations(group, decorations, z);
    this.spawnObstacles(group, obstacles, z, difficulty);
    this.spawnCollectibles(group, collectibles, z, difficulty);

    const hasHiddenArea = Math.random() < 0.15 + difficulty * 0.05;
    let hiddenAreaMesh: THREE.Object3D | null = null;
    if (hasHiddenArea) {
      hiddenAreaMesh = this.buildHiddenArea(group, z);
    }

    return { group, z, obstacles, collectibles, decorations, hasHiddenArea, hiddenAreaMesh };
  }

  private buildGround(group: THREE.Group, _z: number) {
    const groundColor = this.getGroundColor();
    const groundMat = new THREE.MeshStandardMaterial({ color: groundColor, metalness: 0.5, roughness: 0.7 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(TRACK_WIDTH, SEGMENT_LENGTH), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.z = -SEGMENT_LENGTH / 2;
    ground.receiveShadow = true;
    group.add(ground);

    // Lane lines
    const lineMat = new THREE.MeshBasicMaterial({ color: this.getDecorationColor(), transparent: true, opacity: 0.4 });
    for (let i = 0; i < 2; i++) {
      const lineX = -TRACK_WIDTH / 2 + (i + 1) * (TRACK_WIDTH / 3);
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.1, SEGMENT_LENGTH), lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(lineX, 0.02, -SEGMENT_LENGTH / 2);
      group.add(line);
    }

    // Edge walls
    const wallMat = new THREE.MeshStandardMaterial({ color: groundColor, metalness: 0.6, roughness: 0.4, emissive: this.getDecorationColor(), emissiveIntensity: 0.1 });
    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.5, SEGMENT_LENGTH), wallMat);
      wall.position.set(side * (TRACK_WIDTH / 2 + 0.15), 0.75, -SEGMENT_LENGTH / 2);
      group.add(wall);
    }
  }

  private buildDecorations(group: THREE.Group, decorations: THREE.Object3D[], _z: number) {
    const decColor = this.getDecorationColor();
    const decMat = new THREE.MeshStandardMaterial({ color: decColor, emissive: decColor, emissiveIntensity: 0.3, metalness: 0.7, roughness: 0.3 });

    switch (this.mapType) {
      case 'cyberCity': {
        for (let i = 0; i < 4; i++) {
          const h = 8 + Math.random() * 15;
          const b = new THREE.Mesh(new THREE.BoxGeometry(2 + Math.random() * 2, h, 2 + Math.random() * 2), decMat);
          b.position.set(-8 - Math.random() * 4, h / 2, -i * 8 - Math.random() * 4);
          b.castShadow = true;
          group.add(b); decorations.push(b);
          const b2 = b.clone();
          b2.position.x = 8 + Math.random() * 4;
          group.add(b2); decorations.push(b2);
        }
        break;
      }
      case 'industrialFactory': {
        for (let i = 0; i < 3; i++) {
          const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 12, 8), decMat);
          pipe.position.set(-7 - Math.random() * 3, 6, -i * 10);
          group.add(pipe); decorations.push(pipe);
          const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 6, 8), decMat);
          tank.position.set(7 + Math.random() * 3, 3, -i * 10 - 5);
          group.add(tank); decorations.push(tank);
        }
        break;
      }
      case 'brokenHighway': {
        for (let i = 0; i < 3; i++) {
          const pillar = new THREE.Mesh(new THREE.BoxGeometry(1, 6, 1), decMat);
          pillar.position.set(-6, 3, -i * 10);
          group.add(pillar); decorations.push(pillar);
          const pillar2 = pillar.clone(); pillar2.position.x = 6;
          group.add(pillar2); decorations.push(pillar2);
        }
        break;
      }
      case 'denseForest': {
        const treeMat = new THREE.MeshStandardMaterial({ color: 0x2d5a2d, metalness: 0.2, roughness: 0.8 });
        for (let i = 0; i < 8; i++) {
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 3, 6), treeMat);
          trunk.position.set(-6 - Math.random() * 4, 1.5, -Math.random() * SEGMENT_LENGTH);
          group.add(trunk); decorations.push(trunk);
          const leaves = new THREE.Mesh(new THREE.ConeGeometry(2, 4, 6), new THREE.MeshStandardMaterial({ color: 0x3a6a3a, metalness: 0.1, roughness: 0.9 }));
          leaves.position.copy(trunk.position); leaves.position.y = 4;
          group.add(leaves); decorations.push(leaves);
          const trunk2 = trunk.clone(); trunk2.position.x = 6 + Math.random() * 4;
          group.add(trunk2); decorations.push(trunk2);
          const leaves2 = leaves.clone(); leaves2.position.copy(trunk2.position); leaves2.position.y = 4;
          group.add(leaves2); decorations.push(leaves2);
        }
        break;
      }
      case 'snowMountains': {
        for (let i = 0; i < 4; i++) {
          const m = new THREE.Mesh(new THREE.ConeGeometry(4 + Math.random() * 3, 10 + Math.random() * 8, 4), new THREE.MeshStandardMaterial({ color: 0xe0e8f0, metalness: 0.3, roughness: 0.6 }));
          m.position.set(-9 - Math.random() * 3, 5, -i * 8);
          group.add(m); decorations.push(m);
          const m2 = m.clone(); m2.position.x = 9 + Math.random() * 3;
          group.add(m2); decorations.push(m2);
        }
        break;
      }
      case 'undergroundLab': {
        for (let i = 0; i < 4; i++) {
          const tank = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 8), new THREE.MeshStandardMaterial({ color: decColor, emissive: decColor, emissiveIntensity: 0.4, transparent: true, opacity: 0.7 }));
          tank.position.set(-5, 2, -i * 7);
          group.add(tank); decorations.push(tank);
          const tank2 = tank.clone(); tank2.position.x = 5;
          group.add(tank2); decorations.push(tank2);
        }
        // Ceiling
        const ceil = new THREE.Mesh(new THREE.PlaneGeometry(TRACK_WIDTH + 10, SEGMENT_LENGTH), new THREE.MeshStandardMaterial({ color: 0x1a1a2a, metalness: 0.5, roughness: 0.6 }));
        ceil.rotation.x = Math.PI / 2;
        ceil.position.set(0, 8, -SEGMENT_LENGTH / 2);
        group.add(ceil);
        break;
      }
      case 'spaceStation': {
        for (let i = 0; i < 3; i++) {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(3, 0.3, 8, 16), decMat);
          ring.position.set(-7, 2 + Math.random() * 3, -i * 10);
          ring.rotation.y = Math.PI / 2;
          group.add(ring); decorations.push(ring);
          const ring2 = ring.clone(); ring2.position.x = 7;
          group.add(ring2); decorations.push(ring2);
        }
        // Stars
        const starGeo = new THREE.BufferGeometry();
        const starPos = new Float32Array(30 * 3);
        for (let i = 0; i < 30; i++) {
          starPos[i * 3] = (Math.random() - 0.5) * 40;
          starPos[i * 3 + 1] = Math.random() * 20;
          starPos[i * 3 + 2] = -Math.random() * SEGMENT_LENGTH;
        }
        starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
        const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.3 }));
        group.add(stars); decorations.push(stars);
        break;
      }
    }
  }

  private spawnObstacles(group: THREE.Group, obstacles: Obstacle[], _z: number, difficulty: number) {
    // Grace period: no obstacles for the first 10 seconds (difficulty < ~0.083)
    const GRACE_THRESHOLD = 10 / 120;
    if (difficulty < GRACE_THRESHOLD) return;

    // Medium difficulty: max 2 obstacles per segment, ramping from 1 to 2
    const count = Math.min(2, 1 + Math.floor(difficulty * 1.5));
    const usedLanes = new Set<number>();
    const usedZs: number[] = [];
    const MIN_SPACING = 10; // generous spacing between obstacles for comfortable reaction time

    for (let i = 0; i < count; i++) {
      const lane = Math.floor(Math.random() * 3);
      // Even spacing with minor jitter, no compression
      const obsZ = -5 - i * (SEGMENT_LENGTH / (count + 1)) - Math.random() * 2;

      // Skip if too close to another obstacle in ANY lane (prevents impossible combos)
      if (usedZs.some(uz => Math.abs(uz - obsZ) < MIN_SPACING)) continue;
      // Skip if this lane already has an obstacle (prevents lane stacking)
      if (usedLanes.has(lane)) continue;

      usedLanes.add(lane);
      usedZs.push(obsZ);

      // Gradual type introduction — slower ramp for balanced difficulty
      const types: ObstacleType[] = ['upperLaser', 'lowerLaser'];
      if (difficulty > 0.25) types.push('rotatingLaser');
      if (difficulty > 0.4) types.push('laserGate', 'drone');
      if (difficulty > 0.6) types.push('mine', 'debris');
      if (difficulty > 0.8) types.push('collapsingRoad', 'brokenBridge', 'movingPlatform');

      const type = types[Math.floor(Math.random() * types.length)];
      const obs = this.createObstacle(type, lane, obsZ);
      if (obs) {
        group.add(obs.mesh);
        obstacles.push(obs);
      }
    }
  }

  private createObstacle(type: ObstacleType, lane: number, z: number): Obstacle | null {
    const x = LANES[lane];
    const base: Obstacle = {
      mesh: new THREE.Object3D(),
      type, lane, z, passed: false, isDangerous: true, active: true,
      requires: 'none',
    };

    switch (type) {
      case 'upperLaser': {
        const beam = new THREE.Mesh(
          new THREE.CylinderGeometry(0.15, 0.15, TRACK_WIDTH, 8),
          new THREE.MeshBasicMaterial({ color: COLORS.alienRed, transparent: true, opacity: 0.8 })
        );
        beam.rotation.z = Math.PI / 2;
        beam.position.set(0, 1.8, z);
        base.mesh = beam;
        base.requires = 'slide';
        break;
      }
      case 'lowerLaser': {
        const beam = new THREE.Mesh(
          new THREE.CylinderGeometry(0.15, 0.15, TRACK_WIDTH, 8),
          new THREE.MeshBasicMaterial({ color: COLORS.alienRed, transparent: true, opacity: 0.8 })
        );
        beam.rotation.z = Math.PI / 2;
        beam.position.set(0, 0.6, z);
        base.mesh = beam;
        base.requires = 'jump';
        break;
      }
      case 'rotatingLaser': {
        const pivot = new THREE.Object3D();
        pivot.position.set(0, 2, z);
        const arm = new THREE.Mesh(
          new THREE.BoxGeometry(TRACK_WIDTH, 0.1, 0.1),
          new THREE.MeshBasicMaterial({ color: COLORS.alienRed, transparent: true, opacity: 0.7 })
        );
        arm.position.y = 0;
        pivot.add(arm);
        const core = new THREE.Mesh(
          new THREE.SphereGeometry(0.3, 8, 8),
          new THREE.MeshBasicMaterial({ color: COLORS.alienRed })
        );
        pivot.add(core);
        base.mesh = pivot;
        base.requires = 'avoid';
        base.update = (dt: number) => { pivot.rotation.z += dt * 2; };
        break;
      }
      case 'laserGate': {
        const gate = new THREE.Group();
        gate.position.set(x, 0, z);
        const frame = new THREE.Mesh(
          new THREE.BoxGeometry(1.8, 3, 0.2),
          new THREE.MeshStandardMaterial({ color: 0x333344, metalness: 0.8, roughness: 0.3 })
        );
        gate.add(frame);
        const laser = new THREE.Mesh(
          new THREE.BoxGeometry(1.6, 2.5, 0.05),
          new THREE.MeshBasicMaterial({ color: COLORS.alienRed, transparent: true, opacity: 0.6 })
        );
        laser.position.z = 0.05;
        gate.add(laser);
        base.mesh = gate;
        base.requires = 'avoid';
        base.active = true;
        base.update = (_dt: number, _z: number) => {
          const t = performance.now() / 1000;
          const open = Math.sin(t * 1.5) > 0.3;
          laser.visible = !open;
          base.active = !open;
        };
        break;
      }
      case 'drone': {
        const drone = new THREE.Group();
        drone.position.set(x, 2.5, z);
        const body = new THREE.Mesh(
          new THREE.SphereGeometry(0.4, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0x333, metalness: 0.8, roughness: 0.2, emissive: COLORS.alienRed, emissiveIntensity: 0.3 })
        );
        drone.add(body);
        const eye = new THREE.Mesh(
          new THREE.SphereGeometry(0.15, 8, 8),
          new THREE.MeshBasicMaterial({ color: COLORS.alienRed })
        );
        eye.position.z = 0.35;
        drone.add(eye);
        const light = new THREE.PointLight(COLORS.alienRed, 1, 4);
        drone.add(light);
        base.mesh = drone;
        base.requires = 'avoid';
        base.update = (dt: number) => {
          drone.position.y = 2.5 + Math.sin(performance.now() / 500) * 0.3;
          drone.rotation.y += dt * 2;
        };
        break;
      }
      case 'mine': {
        const mine = new THREE.Group();
        mine.position.set(x, 0.3, z);
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.35, 8, 8),
          new THREE.MeshStandardMaterial({ color: COLORS.neonOrange, emissive: COLORS.neonOrange, emissiveIntensity: 0.5, metalness: 0.6, roughness: 0.3 })
        );
        mine.add(sphere);
        for (let i = 0; i < 4; i++) {
          const spike = new THREE.Mesh(
            new THREE.ConeGeometry(0.08, 0.2, 4),
            new THREE.MeshBasicMaterial({ color: COLORS.neonOrange })
          );
          const angle = (i / 4) * Math.PI * 2;
          spike.position.set(Math.cos(angle) * 0.35, 0, Math.sin(angle) * 0.35);
          spike.rotation.x = Math.PI / 2;
          spike.rotation.z = angle;
          mine.add(spike);
        }
        base.mesh = mine;
        base.requires = 'jump';
        base.update = () => { sphere.scale.setScalar(1 + Math.sin(performance.now() / 200) * 0.15); };
        break;
      }
      case 'debris': {
        const debris = new THREE.Mesh(
          new THREE.BoxGeometry(1.5, 1.5, 1.5),
          new THREE.MeshStandardMaterial({ color: 0x555, metalness: 0.5, roughness: 0.7 })
        );
        debris.position.set(x, 0.75, z);
        debris.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        base.mesh = debris;
        base.requires = 'avoid';
        base.update = (dt: number) => { debris.rotation.x += dt * 0.5; debris.rotation.y += dt * 0.3; };
        break;
      }
      case 'collapsingRoad': {
        const section = new THREE.Mesh(
          new THREE.BoxGeometry(TRACK_WIDTH * 0.8, 0.1, 4),
          new THREE.MeshStandardMaterial({ color: 0x444, metalness: 0.4, roughness: 0.8, emissive: COLORS.warning, emissiveIntensity: 0.2 })
        );
        section.position.set(0, 0.05, z);
        base.mesh = section;
        base.requires = 'jump';
        base.isDangerous = false;
        base.update = () => {
          const t = performance.now() / 1000;
          const shake = Math.sin(t * 8) * 0.05;
          section.position.y = 0.05 + shake;
          if (Math.sin(t * 3) > 0.7) {
            section.position.y = -0.5;
            base.isDangerous = false;
          } else {
            base.isDangerous = false;
          }
        };
        break;
      }
      case 'brokenBridge': {
        const bridge = new THREE.Group();
        bridge.position.set(0, 0, z);
        for (let i = 0; i < 3; i++) {
          const plank = new THREE.Mesh(
            new THREE.BoxGeometry(TRACK_WIDTH / 3 - 0.1, 0.15, 3),
            new THREE.MeshStandardMaterial({ color: 0x4a3a2a, metalness: 0.3, roughness: 0.8 })
          );
          plank.position.set(-TRACK_WIDTH / 3 + i * (TRACK_WIDTH / 3), 0, (i - 1) * 1.5);
          bridge.add(plank);
        }
        base.mesh = bridge;
        base.requires = 'jump';
        base.isDangerous = false;
        break;
      }
      case 'movingPlatform': {
        const plat = new THREE.Mesh(
          new THREE.BoxGeometry(2, 0.2, 3),
          new THREE.MeshStandardMaterial({ color: COLORS.cyan, emissive: COLORS.cyan, emissiveIntensity: 0.3, metalness: 0.7, roughness: 0.3 })
        );
        plat.position.set(x, 0.1, z);
        base.mesh = plat;
        base.requires = 'none';
        base.isDangerous = false;
        base.update = () => {
          const t = performance.now() / 1000;
          plat.position.x = LANES[lane] + Math.sin(t * 1.5) * 1.5;
        };
        break;
      }
      default: return null;
    }

    return base;
  }

  private spawnCollectibles(group: THREE.Group, collectibles: Collectible[], _z: number, _difficulty: number) {
    // Water drops in lines
    const waterLines = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < waterLines; i++) {
      const lane = Math.floor(Math.random() * 3);
      const startZ = -3 - Math.random() * (SEGMENT_LENGTH - 10);
      for (let j = 0; j < 4; j++) {
        const cz = startZ - j * 1.5;
        const isFake = Math.random() < 0.05;
        const c = this.createCollectible(isFake ? 'fakeWater' : 'water', lane, cz);
        group.add(c.mesh);
        collectibles.push(c);
      }
    }

    // AI chips
    if (Math.random() < 0.6) {
      const lane = Math.floor(Math.random() * 3);
      const cz = -5 - Math.random() * (SEGMENT_LENGTH - 10);
      const isFake = Math.random() < 0.05;
      const c = this.createCollectible(isFake ? 'fakeChip' : 'aiChip', lane, cz);
      group.add(c.mesh);
      collectibles.push(c);
    }
  }

  private createCollectible(type: CollectibleType, lane: number, z: number): Collectible {
    const x = LANES[lane];
    const y = type === 'aiChip' || type === 'fakeChip' ? 1.2 : 1;

    let mesh: THREE.Object3D;
    if (type === 'water' || type === 'fakeWater') {
      const color = type === 'fakeWater' ? 0x6644aa : COLORS.water;
      mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 12, 12),
        new THREE.MeshStandardMaterial({
          color, emissive: color, emissiveIntensity: 0.5,
          metalness: 0.3, roughness: 0.1, transparent: true, opacity: 0.85,
        })
      );
      mesh.position.set(x, y, z);
    } else {
      const color = type === 'fakeChip' ? 0x6644aa : COLORS.aiChip;
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.35, 0.05),
        new THREE.MeshStandardMaterial({
          color, emissive: color, emissiveIntensity: 0.6,
          metalness: 0.8, roughness: 0.2,
        })
      );
      mesh.position.set(x, y, z);
      mesh.rotation.x = Math.PI / 4;
    }
    return { mesh, type, lane, z, collected: false, y, spin: 0 };
  }

  private buildHiddenArea(group: THREE.Group, _z: number): THREE.Object3D {
    const area = new THREE.Group();
    const isRooftop = Math.random() < 0.5;
    if (isRooftop) {
      const platform = new THREE.Mesh(
        new THREE.BoxGeometry(3, 0.2, 4),
        new THREE.MeshStandardMaterial({ color: COLORS.cyan, emissive: COLORS.cyan, emissiveIntensity: 0.3, metalness: 0.6, roughness: 0.3 })
      );
      platform.position.set(-3, 3, -SEGMENT_LENGTH / 2);
      area.add(platform);
      // Bonus water drops
      for (let i = 0; i < 3; i++) {
        const drop = new THREE.Mesh(
          new THREE.SphereGeometry(0.25, 8, 8),
          new THREE.MeshStandardMaterial({ color: COLORS.water, emissive: COLORS.water, emissiveIntensity: 0.5, transparent: true, opacity: 0.85 })
        );
        drop.position.set(-3, 3.5, -SEGMENT_LENGTH / 2 - i);
        area.add(drop);
      }
    } else {
      // Underground tunnel
      const tunnel = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.2, 4),
        new THREE.MeshStandardMaterial({ color: COLORS.neonGreen, emissive: COLORS.neonGreen, emissiveIntensity: 0.3 })
      );
      tunnel.position.set(3, -0.5, -SEGMENT_LENGTH / 2);
      area.add(tunnel);
    }
    group.add(area);
    return area;
  }

  updateObstacles(dt: number) {
    for (const seg of this.segments) {
      for (const obs of seg.obstacles) {
        if (obs.update) obs.update(dt, seg.z);
      }
      for (const col of seg.collectibles) {
        if (!col.collected) {
          col.spin += dt * 3;
          col.mesh.rotation.y = col.spin;
          col.mesh.position.y = col.y + Math.sin(col.spin * 2) * 0.1;
        }
      }
    }
  }

  disposeSegment(seg: SegmentData) {
    seg.group.traverse(o => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.material) {
        if (Array.isArray(m.material)) m.material.forEach(mat => mat.dispose());
        else m.material.dispose();
      }
    });
  }
}
