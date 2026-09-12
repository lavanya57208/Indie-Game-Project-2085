import * as THREE from 'three';
import { COLORS } from './constants';

// ============================================================
// Project Aqua: 2085 — Cinematic Intro
// 4 acts: City Narration → Escape Chase → Climax Bridge → Transition
// Total ~42 seconds. Skippable. No external assets.
// ============================================================

const TOTAL_DURATION = 42;

// Act timeline (seconds)
const ACT = {
  narration: { start: 0, end: 16 },     // Act 1: city reveal + story narration
  escape: { start: 16, end: 28 },        // Act 2: chase through destroyed streets
  climax: { start: 28, end: 36 },        // Act 3: bridge collapse + AI tower
  transition: { start: 36, end: 42 },    // Act 4: fly behind player, into gameplay
} as const;

export type IntroPhase = 'narration' | 'escape' | 'climax' | 'transition';

// Narration sentences shown one at a time during Act 1
const NARRATION: { time: number; text: string }[] = [
  { time: 0.5, text: 'YEAR 2085...' },
  { time: 2.8, text: 'Earth has fallen.' },
  { time: 5.0, text: 'Alien civilizations conquered humanity using advanced Artificial Intelligence.' },
  { time: 8.0, text: 'The world\'s largest cities have become automated alien strongholds.' },
  { time: 10.5, text: 'Every human network... every machine... every communication system...' },
  { time: 12.5, text: '...is now under Alien AI Control.' },
  { time: 14.0, text: 'The aliens are harvesting Earth\'s freshwater to power their AI civilization.' },
  { time: 16.0, text: 'Only a few survivors remain...' },
];

export interface IntroCallbacks {
  onPhaseChange: (phase: IntroPhase) => void;
  onNarration: (text: string | null) => void;
  onMission: (show: boolean) => void;
  onComplete: () => void;
  onProgress: (progress: number) => void;
}

class IntroCinematic {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private rafId: number | null = null;
  private clock = new THREE.Clock();
  private elapsed = 0;
  private callbacks: IntroCallbacks;
  private destroyed = false;
  private currentPhase: IntroPhase | null = null;
  private currentNarrationIndex = -1;

  // Persistent world (one continuous city that evolves across acts)
  private buildings: THREE.Mesh[] = [];
  private buildingWindows: THREE.Mesh[] = [];
  private ledWalls: THREE.Mesh[] = [];
  private holograms: THREE.Mesh[] = [];
  private holoFaces: THREE.Mesh[] = [];
  private energyCables: THREE.Line[] = [];
  private flyingVehicles: THREE.Group[] = [];
  private patrolDrones: THREE.Group[] = [];
  private deliveryDrones: THREE.Group[] = [];
  private skyTrains: THREE.Group[] = [];
  private surveillanceTowers: THREE.Mesh[] = [];
  private aiCoreTowers: THREE.Mesh[] = [];
  private satelliteDishes: THREE.Mesh[] = [];
  private constructionArms: THREE.Group[] = [];
  private skyBridges: THREE.Mesh[] = [];
  private floatingPlatforms: THREE.Mesh[] = [];
  private rain: THREE.Points | null = null;
  private fog: THREE.FogExp2;
  private lightning: THREE.PointLight | null = null;
  private lightningTimer = 0;
  private ground: THREE.Mesh;

  // Chase elements (Act 2)
  private player: THREE.Group;
  private alien: THREE.Group;
  private combatDrones: THREE.Group[] = [];
  private laserBeams: THREE.Mesh[] = [];
  private explosions: { mesh: THREE.Mesh; life: number; maxLife: number }[] = [];
  private debris: { mesh: THREE.Mesh; vx: number; vy: number; vz: number; rot: THREE.Vector3 }[] = [];
  private smoke: THREE.Points | null = null;
  private sparks: THREE.Points | null = null;
  private collapsingBuildings: { mesh: THREE.Mesh; falling: boolean; vy: number }[] = [];

  // Climax (Act 3)
  private bridge: THREE.Group | null = null;
  private bridgeSegments: { mesh: THREE.Mesh; falling: boolean; vy: number; vx: number; vz: number }[] = [];
  private aiTower: THREE.Group | null = null;
  private missionHolo: THREE.Mesh | null = null;

  // Camera rig
  private camShake = 0;
  private camBaseFOV = 55;
  private camTargetFOV = 55;
  private slowMo = 1;

  constructor(container: HTMLElement, callbacks: IntroCallbacks) {
    this.callbacks = callbacks;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x000000, 1);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.fog = new THREE.FogExp2(0x050a14, 0.012);
    this.scene.fog = this.fog;

    this.camera = new THREE.PerspectiveCamera(this.camBaseFOV, container.clientWidth / container.clientHeight, 0.1, 600);
    this.camera.position.set(0, 8, 20);

    // Build persistent world
    this.ground = this.buildGround();
    this.scene.add(this.ground);
    this.buildCity();
    this.buildRain();
    this.buildLightning();
    this.buildSmoke();
    this.buildSparks();

    // Player + alien (hidden until Act 2)
    this.player = this.buildPlayerModel();
    this.player.visible = false;
    this.scene.add(this.player);

    this.alien = this.buildAlienModel();
    this.alien.visible = false;
    this.scene.add(this.alien);

    this.buildCombatDrones();
    this.buildClimaxElements();
  }

  // ===========================================================
  // World builders
  // ===========================================================

  private buildGround(): THREE.Mesh {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshStandardMaterial({ color: 0x0a1929, metalness: 0.85, roughness: 0.25 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    return ground;
  }

  private buildCity() {
    // Lighting — blue and purple cyberpunk with volumetric feel
    const hemi = new THREE.HemisphereLight(0x4466ff, 0x050a14, 0.55);
    this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(0x88aaff, 0.7);
    dir.position.set(15, 30, 10);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.far = 100;
    this.scene.add(dir);
    const pink = new THREE.PointLight(0xff0080, 2, 50);
    pink.position.set(-15, 8, -10);
    this.scene.add(pink);
    const cyanPt = new THREE.PointLight(0x00e5ff, 2, 50);
    cyanPt.position.set(15, 8, -20);
    this.scene.add(cyanPt);

    // Reflective ground grid
    const grid = new THREE.GridHelper(400, 80, 0x00e5ff, 0x0a1929);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.2;
    grid.position.y = -0.48;
    this.scene.add(grid);

    // --- Procedural futuristic skyscrapers — each unique ---
    const BUILDING_COUNT = 55;
    for (let i = 0; i < BUILDING_COUNT; i++) {
      const isLeft = i % 2 === 0;
      const x = isLeft ? -(5 + Math.random() * 18) : (5 + Math.random() * 18);
      const z = -i * 3.5 - Math.random() * 3;
      const style = i % 8;
      const building = this.buildSkyscraper(style, i);
      building.position.set(x, 0, z);
      building.userData = { style, seed: i };
      this.scene.add(building);
      // Register main mesh for collapse tracking + window meshes for animation
      building.traverse((c) => {
        if (c instanceof THREE.Mesh) {
          if (c.userData.isMain) this.buildings.push(c);
          if (c.userData.isWindow) this.buildingWindows.push(c);
          if (c.userData.isLED) this.ledWalls.push(c);
        }
      });
    }

    // --- Giant holographic AI faces ---
    for (let i = 0; i < 3; i++) {
      const face = new THREE.Mesh(
        new THREE.PlaneGeometry(6, 8),
        new THREE.MeshBasicMaterial({
          color: i % 2 === 0 ? 0x7c4dff : COLORS.cyan,
          transparent: true,
          opacity: 0.12,
          side: THREE.DoubleSide,
        })
      );
      face.position.set((i - 1) * 12, 12, -20 - i * 10);
      face.userData = { isHoloFace: true, seed: i };
      this.scene.add(face);
      this.holoFaces.push(face);
    }

    // --- Holographic billboards / floating ads ---
    for (let i = 0; i < 8; i++) {
      const holo = new THREE.Mesh(
        new THREE.PlaneGeometry(4, 6),
        new THREE.MeshBasicMaterial({
          color: i % 3 === 0 ? COLORS.cyan : i % 3 === 1 ? 0x7c4dff : 0xff0080,
          transparent: true,
          opacity: 0.18,
          side: THREE.DoubleSide,
        })
      );
      holo.position.set((i % 2 === 0 ? -1 : 1) * (8 + i * 2), 8 + Math.random() * 4, -10 - i * 6);
      this.scene.add(holo);
      this.holograms.push(holo);
    }

    // --- Energy beams connecting skyscrapers ---
    for (let i = 0; i < 16; i++) {
      const x1 = (Math.random() - 0.5) * 30;
      const x2 = x1 + (Math.random() > 0.5 ? 5 : -5) + (Math.random() - 0.5) * 3;
      const y = 6 + Math.random() * 12;
      const z = -i * 4 - 5;
      const points = [
        new THREE.Vector3(x1, y, z),
        new THREE.Vector3((x1 + x2) / 2, y - 1.5, z),
        new THREE.Vector3(x2, y, z),
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const cable = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.45 }));
      this.scene.add(cable);
      this.energyCables.push(cable);
    }

    // --- Flying vehicles (taxis, hover buses) ---
    for (let i = 0; i < 14; i++) {
      const v = new THREE.Group();
      const isBus = i % 4 === 0;
      const body = new THREE.Mesh(
        isBus ? new THREE.BoxGeometry(1.2, 0.5, 2.5) : new THREE.BoxGeometry(0.8, 0.2, 1.6),
        new THREE.MeshStandardMaterial({ color: 0x222, emissive: i % 3 === 0 ? 0x7c4dff : COLORS.cyan, emissiveIntensity: 0.5, metalness: 0.9, roughness: 0.15 })
      );
      v.add(body);
      const glow = new THREE.PointLight(i % 3 === 0 ? 0x7c4dff : COLORS.cyan, 1, 8);
      glow.position.y = -0.15;
      v.add(glow);
      v.position.set((Math.random() - 0.5) * 35, 5 + Math.random() * 10, -Math.random() * 60);
      v.userData = { speed: 0.06 + Math.random() * 0.14, dir: Math.random() > 0.5 ? 1 : -1, isBus };
      this.scene.add(v);
      this.flyingVehicles.push(v);
    }

    // --- Patrol drones (security swarms) ---
    for (let i = 0; i < 22; i++) {
      const d = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x333, emissive: 0xff1744, emissiveIntensity: 0.6, metalness: 0.8, roughness: 0.2 })
      );
      d.add(body);
      const light = new THREE.PointLight(0xff1744, 0.5, 6);
      d.add(light);
      d.position.set((Math.random() - 0.5) * 30, 2 + Math.random() * 6, -Math.random() * 50);
      d.userData = { speed: 0.04 + Math.random() * 0.06, phase: Math.random() * Math.PI * 2 };
      this.scene.add(d);
      this.patrolDrones.push(d);
    }

    // --- Delivery drones ---
    for (let i = 0; i < 8; i++) {
      const d = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.15, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x444, emissive: 0x00ff9c, emissiveIntensity: 0.4, metalness: 0.7, roughness: 0.3 })
      );
      d.add(body);
      const light = new THREE.PointLight(0x00ff9c, 0.4, 4);
      d.add(light);
      d.position.set((Math.random() - 0.5) * 25, 3 + Math.random() * 4, -Math.random() * 40);
      d.userData = { speed: 0.03 + Math.random() * 0.04, phase: Math.random() * Math.PI * 2 };
      this.scene.add(d);
      this.deliveryDrones.push(d);
    }

    // --- High-speed magnetic sky trains ---
    for (let i = 0; i < 3; i++) {
      const train = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1, 0.6, 4),
        new THREE.MeshStandardMaterial({ color: 0x1a1a2e, emissive: COLORS.cyan, emissiveIntensity: 0.3, metalness: 0.9, roughness: 0.15 })
      );
      train.add(body);
      const glow = new THREE.PointLight(COLORS.cyan, 1.5, 12);
      train.add(glow);
      train.position.set((i - 1) * 15, 8 + i * 2, -20 - i * 15);
      train.userData = { speed: 0.2 + i * 0.05, dir: i % 2 === 0 ? 1 : -1 };
      this.scene.add(train);
      this.skyTrains.push(train);
    }

    // --- Laser surveillance towers with rotating heads ---
    for (let i = 0; i < 6; i++) {
      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.5, 12, 8),
        new THREE.MeshStandardMaterial({ color: 0x1a1a2e, emissive: 0xff1744, emissiveIntensity: 0.2, metalness: 0.85, roughness: 0.3 })
      );
      tower.position.set((i % 2 === 0 ? -1 : 1) * (10 + i * 2), 6, -i * 8 - 8);
      tower.castShadow = true;
      this.scene.add(tower);
      this.surveillanceTowers.push(tower);

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xff1744 })
      );
      head.position.copy(tower.position);
      head.position.y = 12;
      head.userData = { isHead: true, towerIdx: i };
      this.scene.add(head);
    }

    // --- Giant AI Core towers dominating the skyline ---
    for (let i = 0; i < 4; i++) {
      const coreTower = new THREE.Mesh(
        new THREE.CylinderGeometry(2.5, 4, 35, 16),
        new THREE.MeshStandardMaterial({ color: 0x0a0a2a, emissive: 0x7c4dff, emissiveIntensity: 0.3, metalness: 0.9, roughness: 0.2 })
      );
      coreTower.position.set((i - 1.5) * 16, 17.5, -70 - i * 8);
      this.scene.add(coreTower);
      this.aiCoreTowers.push(coreTower);
      const glow = new THREE.PointLight(0x7c4dff, 3, 40);
      glow.position.copy(coreTower.position);
      glow.position.y = 25;
      this.scene.add(glow);
    }

    // --- Rotating satellite dishes on rooftops ---
    for (let i = 0; i < 10; i++) {
      const dish = new THREE.Mesh(
        new THREE.SphereGeometry(0.6, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0x888, metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide })
      );
      dish.position.set((Math.random() - 0.5) * 30, 8 + Math.random() * 15, -Math.random() * 50);
      dish.userData = { isDish: true, seed: i };
      this.scene.add(dish);
      this.satelliteDishes.push(dish);
    }

    // --- Moving robotic construction arms ---
    for (let i = 0; i < 5; i++) {
      const arm = new THREE.Group();
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.3, 1, 6),
        new THREE.MeshStandardMaterial({ color: 0x555, metalness: 0.8, roughness: 0.3 })
      );
      arm.add(base);
      const segment1 = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 2, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x666, metalness: 0.8, roughness: 0.3 })
      );
      segment1.position.y = 1.5;
      arm.add(segment1);
      const segment2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 1.5, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x777, metalness: 0.8, roughness: 0.3 })
      );
      segment2.position.set(1, 2.5, 0);
      segment2.rotation.z = -Math.PI / 4;
      arm.add(segment2);
      arm.position.set((i - 2) * 8, 0, -15 - i * 8);
      arm.userData = { isArm: true, seed: i, seg1: segment1, seg2: segment2 };
      this.scene.add(arm);
      this.constructionArms.push(arm);
    }

    // --- Multi-level sky bridges between buildings ---
    for (let i = 0; i < 6; i++) {
      const bridge = new THREE.Mesh(
        new THREE.BoxGeometry(8, 0.3, 1.5),
        new THREE.MeshStandardMaterial({ color: 0x1a1a2e, emissive: COLORS.cyan, emissiveIntensity: 0.15, metalness: 0.8, roughness: 0.25 })
      );
      bridge.position.set((Math.random() - 0.5) * 10, 5 + Math.random() * 10, -i * 8 - 10);
      this.scene.add(bridge);
      this.skyBridges.push(bridge);
    }

    // --- Floating sky platforms ---
    for (let i = 0; i < 5; i++) {
      const platform = new THREE.Mesh(
        new THREE.CylinderGeometry(3, 3, 0.2, 16),
        new THREE.MeshStandardMaterial({ color: 0x1a1a2e, emissive: 0x7c4dff, emissiveIntensity: 0.1, metalness: 0.85, roughness: 0.2 })
      );
      platform.position.set((Math.random() - 0.5) * 25, 10 + Math.random() * 8, -i * 12 - 15);
      this.scene.add(platform);
      this.floatingPlatforms.push(platform);
    }

    // --- Distant megastructures: space elevators, orbital arrays, mothership ---
    this.buildDistantMegastructures();
  }

  // --- Procedural skyscraper generator — 8 unique architectural styles ---
  private buildSkyscraper(style: number, seed: number): THREE.Group {
    const g = new THREE.Group();
    const h = 8 + Math.random() * 30;
    const w = 2 + Math.random() * 2.5;
    const emissiveColor = seed % 3 === 0 ? COLORS.cyan : seed % 3 === 1 ? 0x7c4dff : 0xff0080;

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x0a1929, emissive: emissiveColor, emissiveIntensity: 0.1, metalness: 0.9, roughness: 0.15,
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a14, metalness: 0.88, roughness: 0.22,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: emissiveColor, emissive: emissiveColor, emissiveIntensity: 0.6, metalness: 0.7, roughness: 0.2,
    });

    let mainMesh: THREE.Mesh;

    switch (style) {
      case 0: {
        // Twisted glass tower — stacked rotated segments
        const segments = Math.floor(h / 3);
        for (let s = 0; s < segments; s++) {
          const seg = new THREE.Mesh(new THREE.BoxGeometry(w, 3, w), glassMat);
          seg.position.y = 1.5 + s * 3;
          seg.rotation.y = s * 0.15;
          seg.castShadow = true;
          seg.userData.isMain = s === 0;
          g.add(seg);
        }
        mainMesh = g.children[0] as THREE.Mesh;
        break;
      }
      case 1: {
        // Spiral tower — helical cylinder with twisting accent strips
        mainMesh = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, h, 12), glassMat);
        mainMesh.position.y = h / 2;
        mainMesh.castShadow = true;
        mainMesh.userData.isMain = true;
        g.add(mainMesh);
        for (let s = 0; s < 4; s++) {
          const strip = new THREE.Mesh(new THREE.BoxGeometry(0.08, h, 0.15), accentMat);
          strip.position.y = h / 2;
          strip.position.x = Math.cos(s * Math.PI / 2) * (w / 2 + 0.05);
          strip.position.z = Math.sin(s * Math.PI / 2) * (w / 2 + 0.05);
          strip.rotation.y = s * Math.PI / 2;
          g.add(strip);
        }
        break;
      }
      case 2: {
        // Organic AI-generated — stacked tapered cylinders (varying radii)
        const layers = Math.floor(h / 2.5);
        for (let s = 0; s < layers; s++) {
          const r = w / 2 * (1 - s * 0.04) * (1 + Math.sin(s * 0.8) * 0.15);
          const layer = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.1, 2.5, 10), s % 2 === 0 ? glassMat : darkMat);
          layer.position.y = 1.25 + s * 2.5;
          layer.castShadow = true;
          layer.userData.isMain = s === 0;
          g.add(layer);
        }
        mainMesh = g.children[0] as THREE.Mesh;
        break;
      }
      case 3: {
        // Transparent crystal tower — octagonal prism with emissive edges
        mainMesh = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, h, 8), glassMat);
        mainMesh.position.y = h / 2;
        mainMesh.castShadow = true;
        mainMesh.userData.isMain = true;
        g.add(mainMesh);
        // Crystal cap
        const cap = new THREE.Mesh(new THREE.ConeGeometry(w / 2, 2, 8), accentMat);
        cap.position.y = h + 1;
        g.add(cap);
        break;
      }
      case 4: {
        // Curved facade — cylinder with flat back, LED wall on front
        mainMesh = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, h, 8, 1, false, 0, Math.PI), glassMat);
        mainMesh.position.y = h / 2;
        mainMesh.castShadow = true;
        mainMesh.userData.isMain = true;
        g.add(mainMesh);
        // LED wall panel
        const led = new THREE.Mesh(
          new THREE.PlaneGeometry(w * 0.8, h * 0.7),
          new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
        );
        led.position.set(0, h / 2, w / 2 + 0.02);
        led.userData.isLED = true;
        g.add(led);
        break;
      }
      case 5: {
        // Self-illuminating stacked blocks — offset cubes
        const blocks = Math.floor(h / 3);
        for (let s = 0; s < blocks; s++) {
          const bw = w * (0.9 - s * 0.03);
          const block = new THREE.Mesh(new THREE.BoxGeometry(bw, 3, bw), s % 2 === 0 ? glassMat : accentMat);
          block.position.set(s % 2 === 0 ? 0.2 : -0.2, 1.5 + s * 3, 0);
          block.castShadow = true;
          block.userData.isMain = s === 0;
          g.add(block);
        }
        mainMesh = g.children[0] as THREE.Mesh;
        break;
      }
      case 6: {
        // Twin connected towers with sky bridge
        const t1 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.4, h, w * 0.4), glassMat);
        t1.position.set(-w * 0.3, h / 2, 0);
        t1.castShadow = true;
        t1.userData.isMain = true;
        g.add(t1);
        const t2 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.4, h * 0.8, w * 0.4), glassMat);
        t2.position.set(w * 0.3, h * 0.4, 0);
        t2.castShadow = true;
        g.add(t2);
        const link = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.5, w * 0.4), accentMat);
        link.position.set(0, h * 0.6, 0);
        g.add(link);
        mainMesh = t1;
        break;
      }
      default: {
        // Energy reactor tower — cylinder with glowing core sphere on top
        mainMesh = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2 + 0.5, h, 12), darkMat);
        mainMesh.position.y = h / 2;
        mainMesh.castShadow = true;
        mainMesh.userData.isMain = true;
        g.add(mainMesh);
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 12), new THREE.MeshBasicMaterial({ color: emissiveColor }));
        core.position.y = h + 1;
        g.add(core);
        const coreLight = new THREE.PointLight(emissiveColor, 2, 15);
        coreLight.position.y = h + 1;
        g.add(coreLight);
        break;
      }
    }

    // Add animated windows to all buildings
    const winRows = Math.floor(h / 2);
    for (let j = 0; j < winRows; j++) {
      for (let k = 0; k < 2; k++) {
        const win = new THREE.Mesh(
          new THREE.PlaneGeometry(0.12, 0.12),
          new THREE.MeshBasicMaterial({
            color: Math.random() > 0.3 ? COLORS.cyan : 0xff0080,
            transparent: true,
            opacity: 0.3 + Math.random() * 0.5,
          })
        );
        const wx = (k === 0 ? -w / 2 - 0.01 : w / 2 + 0.01);
        win.position.set(wx, 1 + j * 2, 0);
        win.rotation.y = k === 0 ? -Math.PI / 2 : Math.PI / 2;
        win.userData.isWindow = true;
        g.add(win);
      }
    }

    // Rooftop antenna / helipad
    if (seed % 3 === 0) {
      const antenna = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 3, 4),
        new THREE.MeshStandardMaterial({ color: 0x666, metalness: 0.8, roughness: 0.3 })
      );
      antenna.position.y = h + 1.5;
      g.add(antenna);
      const antennaLight = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
      antennaLight.position.y = h + 3;
      g.add(antennaLight);
    } else if (seed % 3 === 1) {
      const helipad = new THREE.Mesh(
        new THREE.CylinderGeometry(1, 1, 0.1, 12),
        new THREE.MeshStandardMaterial({ color: 0x333, emissive: COLORS.cyan, emissiveIntensity: 0.2, metalness: 0.7, roughness: 0.3 })
      );
      helipad.position.y = h + 0.1;
      g.add(helipad);
    }

    return g;
  }

  // --- Distant megastructures on the horizon ---
  private buildDistantMegastructures() {
    // Space elevator — extremely tall thin tower
    const elevator = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 1.5, 80, 8),
      new THREE.MeshStandardMaterial({ color: 0x0a0a2a, emissive: 0x00e5ff, emissiveIntensity: 0.15, metalness: 0.9, roughness: 0.2 })
    );
    elevator.position.set(-40, 40, -120);
    this.scene.add(elevator);
    const elevatorLight = new THREE.PointLight(0x00e5ff, 2, 60);
    elevatorLight.position.set(-40, 70, -120);
    this.scene.add(elevatorLight);

    // Orbital communication array — ring structure
    const array = new THREE.Mesh(
      new THREE.TorusGeometry(5, 0.3, 8, 24),
      new THREE.MeshStandardMaterial({ color: 0x1a1a2e, emissive: 0x7c4dff, emissiveIntensity: 0.2, metalness: 0.85, roughness: 0.25 })
    );
    array.position.set(35, 50, -130);
    array.rotation.x = Math.PI / 3;
    this.scene.add(array);

    // Alien mothership — massive dark disc in the sky
    const mothership = new THREE.Mesh(
      new THREE.CylinderGeometry(8, 10, 2, 16),
      new THREE.MeshStandardMaterial({ color: 0x1a0a0a, emissive: 0xff1744, emissiveIntensity: 0.15, metalness: 0.9, roughness: 0.2 })
    );
    mothership.rotation.x = Math.PI / 2;
    mothership.position.set(10, 45, -140);
    this.scene.add(mothership);
    const shipLight = new THREE.PointLight(0xff1744, 3, 50);
    shipLight.position.copy(mothership.position);
    this.scene.add(shipLight);

    // Fusion reactor — glowing sphere complex
    const reactor = new THREE.Mesh(
      new THREE.SphereGeometry(4, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0x0a0a2a, emissive: 0x00ff9c, emissiveIntensity: 0.25, metalness: 0.9, roughness: 0.2 })
    );
    reactor.position.set(-25, 8, -100);
    this.scene.add(reactor);
    const reactorLight = new THREE.PointLight(0x00ff9c, 3, 40);
    reactorLight.position.copy(reactor.position);
    this.scene.add(reactorLight);

    // Energy dome over city center
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(20, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.05, side: THREE.DoubleSide })
    );
    dome.position.set(0, 0, -80);
    this.scene.add(dome);
  }

  private buildRain() {
    const count = 600;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 80;
      pos[i * 3 + 1] = Math.random() * 30;
      pos[i * 3 + 2] = -Math.random() * 80;
      vel[i] = 0.3 + Math.random() * 0.3;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('velocity', new THREE.BufferAttribute(vel, 1));
    this.rain = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0x88ccff, size: 0.12, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.rain.frustumCulled = false;
    this.scene.add(this.rain);
  }

  private buildLightning() {
    this.lightning = new THREE.PointLight(0xffffff, 0, 80);
    this.lightning.position.set(0, 25, -30);
    this.scene.add(this.lightning);
  }

  private buildSmoke() {
    const count = 80;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 1] = Math.random() * 8;
      pos[i * 3 + 2] = -Math.random() * 40;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.smoke = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0x333344, size: 1.5, transparent: true, opacity: 0, depthWrite: false,
    }));
    this.smoke.frustumCulled = false;
    this.scene.add(this.smoke);
  }

  private buildSparks() {
    const count = 60;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = Math.random() * 5;
      pos[i * 3 + 2] = -Math.random() * 20;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.sparks = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xffaa00, size: 0.15, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.sparks.frustumCulled = false;
    this.scene.add(this.sparks);
  }

  // ===========================================================
  // Player & Alien models (original, low-poly stylized)
  // ===========================================================

  private buildPlayerModel(): THREE.Group {
    const player = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a2a3a, metalness: 0.7, roughness: 0.3, emissive: 0x00e5ff, emissiveIntensity: 0.18 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 0.7 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.4), bodyMat);
    torso.position.y = 1.3;
    torso.castShadow = true;
    player.add(torso);

    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.42), accentMat);
    chest.position.set(0, 1.35, 0.01);
    player.add(chest);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), new THREE.MeshStandardMaterial({ color: 0x1a1a2e, metalness: 0.7, roughness: 0.3 }));
    head.position.y = 2.0;
    head.castShadow = true;
    player.add(head);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.02), new THREE.MeshBasicMaterial({ color: 0x00e5ff }));
    visor.position.set(0, 2.05, 0.23);
    player.add(visor);

    const armGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.7, 8);
    const armL = new THREE.Mesh(armGeo, bodyMat);
    armL.position.set(-0.5, 1.3, 0);
    armL.castShadow = true;
    player.add(armL);
    const armR = new THREE.Mesh(armGeo, bodyMat);
    armR.position.set(0.5, 1.3, 0);
    armR.castShadow = true;
    player.add(armR);

    const legGeo = new THREE.CylinderGeometry(0.15, 0.12, 0.8, 8);
    const legL = new THREE.Mesh(legGeo, new THREE.MeshStandardMaterial({ color: 0x1a1a2e, metalness: 0.7, roughness: 0.3 }));
    legL.position.set(-0.22, 0.45, 0);
    legL.castShadow = true;
    player.add(legL);
    const legR = new THREE.Mesh(legGeo, new THREE.MeshStandardMaterial({ color: 0x1a1a2e, metalness: 0.7, roughness: 0.3 }));
    legR.position.set(0.22, 0.45, 0);
    legR.castShadow = true;
    player.add(legR);

    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.2), accentMat);
    pack.position.set(0, 1.4, -0.25);
    player.add(pack);

    const glow = new THREE.PointLight(0x00e5ff, 1.5, 6);
    glow.position.set(0, 1.5, 0);
    player.add(glow);

    return player;
  }

  private buildAlienModel(): THREE.Group {
    const alien = new THREE.Group();
    const armorMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, metalness: 0.88, roughness: 0.22, emissive: 0x0a0a1a, emissiveIntensity: 0.12 });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1.1, 8, 16), armorMat);
    torso.position.y = 1.9;
    torso.castShadow = true;
    alien.add(torso);

    const lowerTorso = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.5, 6, 12), armorMat);
    lowerTorso.position.y = 1.0;
    alien.add(lowerTorso);

    const head = new THREE.Group();
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), armorMat);
    skull.scale.set(0.8, 1.2, 1.15);
    skull.castShadow = true;
    head.add(skull);
    head.position.y = 2.95;
    alien.add(head);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x00ddff });
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), eyeMat);
    leftEye.position.set(-0.13, 3.0, 0.3);
    alien.add(leftEye);
    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), eyeMat);
    rightEye.position.set(0.13, 3.0, 0.3);
    alien.add(rightEye);

    const eyeLight = new THREE.PointLight(0x00ddff, 2, 8);
    eyeLight.position.set(0, 3.0, 0.4);
    alien.add(eyeLight);

    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.6, 8), armorMat);
      upper.position.y = -0.35;
      arm.add(upper);
      const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.55, 8), armorMat);
      fore.position.y = -0.95;
      arm.add(fore);
      for (let i = 0; i < 3; i++) {
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.3, 4), new THREE.MeshStandardMaterial({ color: 0x0a0a1a, metalness: 0.9, roughness: 0.15, emissive: 0x00ddff, emissiveIntensity: 0.35 }));
        claw.position.set(side * Math.sin((i - 1) * 0.35) * 0.08, -1.4, Math.cos((i - 1) * 0.35) * 0.08);
        claw.rotation.x = Math.PI + (i - 1) * 0.35 * 0.5;
        arm.add(claw);
      }
      arm.position.set(side * 0.6, 2.3, 0);
      alien.add(arm);
    }

    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.7, 8), armorMat);
      thigh.position.y = -0.4;
      leg.add(thigh);
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.65, 8), armorMat);
      shin.position.y = -1.1;
      leg.add(shin);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.35), armorMat);
      foot.position.set(0, -1.45, 0.08);
      leg.add(foot);
      leg.position.set(side * 0.25, 1.25, 0);
      alien.add(leg);
    }

    const glow = new THREE.PointLight(0x0044aa, 2, 12);
    glow.position.set(0, 2, 0);
    alien.add(glow);

    return alien;
  }

  private buildCombatDrones() {
    for (let i = 0; i < 6; i++) {
      const d = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 10, 10),
        new THREE.MeshStandardMaterial({ color: 0x222, emissive: 0xff1744, emissiveIntensity: 0.5, metalness: 0.85, roughness: 0.2 })
      );
      d.add(body);
      const light = new THREE.PointLight(0xff1744, 1.2, 8);
      d.add(light);
      d.visible = false;
      d.userData = { offset: i };
      this.scene.add(d);
      this.combatDrones.push(d);
    }

    // Laser beams (reused)
    for (let i = 0; i < 4; i++) {
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 20, 4),
        new THREE.MeshBasicMaterial({ color: 0xff1744, transparent: true, opacity: 0 })
      );
      beam.rotation.x = Math.PI / 2;
      beam.visible = false;
      this.scene.add(beam);
      this.laserBeams.push(beam);
    }
  }

  private buildClimaxElements() {
    // Collapsing bridge
    this.bridge = new THREE.Group();
    for (let i = 0; i < 8; i++) {
      const seg = new THREE.Mesh(
        new THREE.BoxGeometry(3, 0.4, 3),
        new THREE.MeshStandardMaterial({ color: 0x3a3a4a, metalness: 0.6, roughness: 0.5, emissive: 0x00e5ff, emissiveIntensity: 0.05 })
      );
      seg.position.set(0, 0.2, -i * 3 - 5);
      seg.castShadow = true;
      this.bridge.add(seg);
      this.bridgeSegments.push({ mesh: seg, falling: false, vy: 0, vx: 0, vz: 0 });
    }
    this.bridge.visible = false;
    this.scene.add(this.bridge);

    // Giant Alien AI Tower
    this.aiTower = new THREE.Group();
    const towerBase = new THREE.Mesh(
      new THREE.CylinderGeometry(3, 5, 40, 12),
      new THREE.MeshStandardMaterial({ color: 0x0a0a2a, emissive: 0x7c4dff, emissiveIntensity: 0.25, metalness: 0.9, roughness: 0.2 })
    );
    towerBase.position.y = 20;
    towerBase.castShadow = true;
    this.aiTower.add(towerBase);
    const towerTop = new THREE.Mesh(
      new THREE.SphereGeometry(3, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0x7c4dff })
    );
    towerTop.position.y = 42;
    this.aiTower.add(towerTop);
    const towerLight = new THREE.PointLight(0x7c4dff, 4, 60);
    towerLight.position.y = 42;
    this.aiTower.add(towerLight);
    this.aiTower.position.set(0, 0, -60);
    this.aiTower.visible = false;
    this.scene.add(this.aiTower);

    // Mission hologram
    this.missionHolo = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 5),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0, side: THREE.DoubleSide })
    );
    this.missionHolo.position.set(0, 8, -40);
    this.missionHolo.visible = false;
    this.scene.add(this.missionHolo);
  }

  // ===========================================================
  // Camera rig — cinematic moves per act
  // ===========================================================

  private updateCamera(t: number) {
    // Determine act
    let phase: IntroPhase;
    if (t < ACT.escape.start) phase = 'narration';
    else if (t < ACT.climax.start) phase = 'escape';
    else if (t < ACT.transition.start) phase = 'climax';
    else phase = 'transition';

    if (phase !== this.currentPhase) {
      this.currentPhase = phase;
      this.callbacks.onPhaseChange(phase);
    }

    // FOV interpolation
    this.camera.fov += (this.camTargetFOV - this.camera.fov) * 0.05;
    this.camera.updateProjectionMatrix();

    // Compute base camera position per phase
    if (phase === 'narration') {
      this.cameraNarration(t);
    } else if (phase === 'escape') {
      this.cameraEscape(t);
    } else if (phase === 'climax') {
      this.cameraClimax(t);
    } else {
      this.cameraTransition(t);
    }

    // Apply camera shake (decaying)
    if (this.camShake > 0.01) {
      this.camera.position.x += (Math.random() - 0.5) * this.camShake * 0.6;
      this.camera.position.y += (Math.random() - 0.5) * this.camShake * 0.6;
      this.camera.position.z += (Math.random() - 0.5) * this.camShake * 0.6;
      this.camShake *= 0.92;
    }
  }

  private cameraNarration(t: number) {
    // Slow push-in over the city, gentle drift
    const local = (t - ACT.narration.start) / (ACT.narration.end - ACT.narration.start);
    const e = this.easeInOut(Math.min(1, local));
    this.camTargetFOV = 55;
    this.camera.position.set(
      Math.sin(t * 0.08) * 4,
      8 + e * 4,
      22 - e * 8
    );
    this.camera.lookAt(0, 6, -10);
  }

  private cameraEscape(t: number) {
    // Dynamic chase cam — switches between angles
    const local = (t - ACT.escape.start) / (ACT.escape.end - ACT.escape.start);
    const playerZ = this.player.position.z;

    // Cycle through shot types every ~3s
    const shotCycle = Math.floor(local * 4);
    this.camTargetFOV = 62;

    if (shotCycle === 0) {
      // Third-person behind
      this.camera.position.set(0, 3.5, playerZ + 7);
      this.camera.lookAt(0, 1.5, playerZ - 3);
    } else if (shotCycle === 1) {
      // Side tracking
      this.camera.position.set(6, 2.5, playerZ + 2);
      this.camera.lookAt(0, 1.5, playerZ - 2);
    } else if (shotCycle === 2) {
      // Close-up
      this.camera.position.set(1.5, 2.2, playerZ + 4);
      this.camera.lookAt(0, 1.8, playerZ);
    } else {
      // Aerial drone view
      this.camera.position.set(Math.sin(t * 0.5) * 3, 8, playerZ + 3);
      this.camera.lookAt(0, 1, playerZ - 2);
    }
  }

  private cameraClimax(t: number) {
    const local = (t - ACT.climax.start) / (ACT.climax.end - ACT.climax.start);
    this.camTargetFOV = 65;

    if (local < 0.4) {
      // Follow player jumping across bridge
      this.camera.position.set(2, 3, this.player.position.z + 6);
      this.camera.lookAt(0, 1.5, this.player.position.z - 2);
    } else if (local < 0.7) {
      // Slow-motion close-up of bridge exploding
      this.camera.position.set(-3, 4, this.player.position.z - 4);
      this.camera.lookAt(0, 1, this.player.position.z - 8);
    } else {
      // Reveal AI Tower
      this.camera.position.set(0, 6, this.player.position.z + 5);
      this.camera.lookAt(0, 20, -60);
    }
  }

  private cameraTransition(t: number) {
    // Fly behind player, settle into gameplay follow position
    const local = (t - ACT.transition.start) / (ACT.transition.end - ACT.transition.start);
    const e = this.easeInOut(Math.min(1, local));
    this.camTargetFOV = 55 + (1 - e) * 10;
    const playerZ = this.player.position.z;
    this.camera.position.set(
      0,
      4.5 - e * 0.5,
      playerZ + 8 - e * 1
    );
    this.camera.lookAt(0, 1.5, playerZ - 5);
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  // ===========================================================
  // Per-act scene updates
  // ===========================================================

  private updateWorld(t: number, dt: number) {
    // Always-on ambient world animation
    const speedFactor = this.currentPhase === 'escape' || this.currentPhase === 'climax' ? 3 : 1;

    // Building window flicker — thousands of animated windows
    for (let i = 0; i < this.buildingWindows.length; i++) {
      const w = this.buildingWindows[i];
      if (i % 7 === Math.floor(t * 4) % 7) {
        (w.material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.random() * 0.6;
      }
    }

    // LED wall animation — changing color patterns
    this.ledWalls.forEach((led, i) => {
      const mat = led.material as THREE.MeshBasicMaterial;
      const phase = t * 1.5 + i * 0.7;
      mat.opacity = 0.2 + Math.sin(phase) * 0.15;
      const hue = (Math.sin(phase * 0.3) + 1) / 2;
      mat.color.setRGB(
        hue > 0.5 ? 0 : 0.5 * hue,
        0.5 + hue * 0.5,
        1 - hue * 0.3
      );
    });

    // Holographic billboards flicker
    this.holograms.forEach((h, i) => {
      (h.material as THREE.MeshBasicMaterial).opacity = 0.12 + Math.sin(t * 2 + i) * 0.08;
    });

    // Giant holographic AI faces — pulse and shift
    this.holoFaces.forEach((face, i) => {
      const mat = face.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.08 + Math.sin(t * 0.5 + i) * 0.06;
      face.rotation.y = Math.sin(t * 0.15 + i) * 0.08;
    });

    // Flying vehicles (taxis, hover buses)
    this.flyingVehicles.forEach((v) => {
      v.position.x += v.userData.dir * v.userData.speed * speedFactor;
      if (Math.abs(v.position.x) > 30) v.userData.dir *= -1;
      v.position.y += Math.sin(t + v.position.z) * 0.01;
    });

    // Patrol drones — swarming
    this.patrolDrones.forEach((d, i) => {
      d.position.z -= d.userData.speed * speedFactor;
      if (d.position.z < -60) d.position.z = 5;
      d.position.x += Math.sin(t * 0.5 + d.userData.phase) * 0.03;
      d.position.y += Math.cos(t * 0.7 + i) * 0.02;
      d.rotation.y += dt * 1.5;
    });

    // Delivery drones — slower, carrying packages
    this.deliveryDrones.forEach((d, i) => {
      d.position.z -= d.userData.speed * speedFactor;
      if (d.position.z < -50) d.position.z = 5;
      d.position.x += Math.sin(t * 0.3 + d.userData.phase) * 0.02;
      d.position.y += Math.cos(t * 0.4 + i) * 0.015;
      d.rotation.y += dt * 0.5;
    });

    // Sky trains — high speed on fixed routes
    this.skyTrains.forEach((train) => {
      train.position.z -= train.userData.speed * train.userData.dir * speedFactor;
      if (train.userData.dir > 0 && train.position.z < -80) train.position.z = 10;
      if (train.userData.dir < 0 && train.position.z > 10) train.position.z = -80;
    });

    // Surveillance tower heads rotate
    this.scene.children.forEach((c) => {
      if (c instanceof THREE.Mesh && c.userData.isHead) {
        c.rotation.y = t * 0.5;
      }
    });

    // AI core towers pulse
    this.aiCoreTowers.forEach((tower, i) => {
      const mat = tower.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.25 + Math.sin(t * 0.8 + i) * 0.15;
    });

    // Satellite dishes rotate
    this.satelliteDishes.forEach((dish, i) => {
      dish.rotation.y = t * (0.2 + i * 0.05);
      dish.rotation.x = Math.sin(t * 0.3 + i) * 0.2;
    });

    // Construction arms — animated segments
    this.constructionArms.forEach((arm, i) => {
      const seg1 = arm.userData.seg1 as THREE.Mesh;
      const seg2 = arm.userData.seg2 as THREE.Mesh;
      if (seg1) seg1.rotation.y = Math.sin(t * 0.5 + i) * 0.8;
      if (seg2) seg2.rotation.z = -Math.PI / 4 + Math.sin(t * 0.7 + i) * 0.5;
    });

    // Rain
    if (this.rain) {
      const pos = this.rain.geometry.getAttribute('position') as THREE.BufferAttribute;
      const vel = this.rain.geometry.getAttribute('velocity') as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        pos.array[i * 3 + 1] -= vel.array[i] * speedFactor;
        if (pos.array[i * 3 + 1] < 0) {
          pos.array[i * 3 + 1] = 30;
          pos.array[i * 3] = (Math.random() - 0.5) * 80;
          pos.array[i * 3 + 2] = -Math.random() * 80;
        }
      }
      pos.needsUpdate = true;
    }

    // Lightning flashes (random)
    if (this.lightning) {
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        if (Math.random() > 0.7) {
          this.lightning.intensity = 4 + Math.random() * 3;
          this.camShake = Math.max(this.camShake, 0.15);
        }
        this.lightningTimer = 0.3 + Math.random() * 1.5;
      }
      this.lightning.intensity *= 0.85;
    }

    // Smoke opacity rises during escape/climax
    if (this.smoke) {
      const targetOpacity = (this.currentPhase === 'escape' || this.currentPhase === 'climax') ? 0.3 : 0.05;
      const mat = this.smoke.material as THREE.PointsMaterial;
      mat.opacity += (targetOpacity - mat.opacity) * 0.02;
      const pos = this.smoke.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        pos.array[i * 3 + 1] += 0.02;
        if (pos.array[i * 3 + 1] > 12) pos.array[i * 3 + 1] = 0;
      }
      pos.needsUpdate = true;
    }

    // Sparks during escape
    if (this.sparks) {
      const targetOpacity = this.currentPhase === 'escape' ? 0.6 : 0;
      const mat = this.sparks.material as THREE.PointsMaterial;
      mat.opacity += (targetOpacity - mat.opacity) * 0.05;
      const pos = this.sparks.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        pos.array[i * 3 + 1] += 0.1;
        pos.array[i * 3] += (Math.random() - 0.5) * 0.1;
        if (pos.array[i * 3 + 1] > 8) {
          pos.array[i * 3 + 1] = 0;
          pos.array[i * 3] = (Math.random() - 0.5) * 20;
        }
      }
      pos.needsUpdate = true;
    }
  }

  private updateNarration(t: number) {
    // Find current narration line
    let activeIndex = -1;
    for (let i = NARRATION.length - 1; i >= 0; i--) {
      if (t >= NARRATION[i].time) {
        activeIndex = i;
        break;
      }
    }
    if (activeIndex !== this.currentNarrationIndex) {
      this.currentNarrationIndex = activeIndex;
      if (activeIndex >= 0 && t < NARRATION[NARRATION.length - 1].time + 2) {
        this.callbacks.onNarration(NARRATION[activeIndex].text);
      } else {
        this.callbacks.onNarration(null);
      }
    }
  }

  private updateEscape(t: number, dt: number) {
    // Show player + alien
    this.player.visible = true;
    this.alien.visible = true;

    // Player runs forward
    const escapeT = t - ACT.escape.start;
    this.player.position.z = -escapeT * 8;
    this.player.position.x = Math.sin(escapeT * 1.5) * 1.5;

    // Running animation
    const runCycle = t * 12;
    const swing = Math.sin(runCycle) * 0.7;
    const armL = this.player.children[5];
    const armR = this.player.children[6];
    const legL = this.player.children[7];
    const legR = this.player.children[8];
    if (armL) armL.rotation.x = -swing;
    if (armR) armR.rotation.x = swing;
    if (legL) legL.rotation.x = swing;
    if (legR) legR.rotation.x = -swing;
    this.player.position.y = Math.abs(Math.sin(runCycle)) * 0.1;

    // Alien chases from behind
    this.alien.position.z = this.player.position.z + 6 - Math.sin(escapeT * 0.8) * 1.5;
    this.alien.position.x = this.player.position.x + Math.sin(escapeT * 2) * 0.5;
    const alienCycle = t * 9;
    const aSwing = Math.sin(alienCycle) * 0.9;
    this.alien.children.forEach((c) => {
      if (c instanceof THREE.Group && c.position.y > 2 && c.position.x !== 0) {
        c.rotation.x = c.position.x > 0 ? -aSwing : aSwing;
      }
      if (c instanceof THREE.Group && c.position.y > 1 && c.position.x !== 0 && c.position.y < 2) {
        c.rotation.x = c.position.x < 0 ? aSwing : -aSwing;
      }
    });
    this.alien.position.y = Math.abs(Math.sin(alienCycle)) * 0.12;

    // Combat drones appear and fire
    this.combatDrones.forEach((d, i) => {
      d.visible = true;
      const targetZ = this.player.position.z + 2 - i * 1.5;
      d.position.z += (targetZ - d.position.z) * 0.05;
      d.position.x = Math.sin(t * 0.7 + i * 1.3) * 3;
      d.position.y = 3 + Math.sin(t + i) * 0.5;
      d.rotation.y += dt * 2;
    });

    // Laser beams fire periodically
    const laserPhase = (Math.sin(t * 3) + 1) / 2;
    this.laserBeams.forEach((beam, i) => {
      if (laserPhase > 0.7 && !beam.visible) {
        beam.visible = true;
        const drone = this.combatDrones[i % this.combatDrones.length];
        beam.position.copy(drone.position);
        beam.position.y -= 1;
        beam.lookAt(this.player.position);
        beam.rotateX(Math.PI / 2);
        (beam.material as THREE.MeshBasicMaterial).opacity = 0.9;
        this.camShake = Math.max(this.camShake, 0.2);
      }
      if (beam.visible) {
        const mat = beam.material as THREE.MeshBasicMaterial;
        mat.opacity *= 0.85;
        if (mat.opacity < 0.05) beam.visible = false;
      }
    });

    // Explosions
    if (Math.random() > 0.93) {
      this.spawnExplosion(
        (Math.random() - 0.5) * 10,
        1 + Math.random() * 3,
        this.player.position.z - Math.random() * 15
      );
      this.camShake = Math.max(this.camShake, 0.4);
    }

    // Debris
    if (Math.random() > 0.9) {
      this.spawnDebris(
        (Math.random() - 0.5) * 8,
        2 + Math.random() * 5,
        this.player.position.z - Math.random() * 10
      );
    }

    // Collapsing buildings
    if (Math.random() > 0.97) {
      const candidates = this.buildings.filter(b => b.position.z > this.player.position.z - 20 && b.position.z < this.player.position.z + 5);
      if (candidates.length > 0) {
        const target = candidates[Math.floor(Math.random() * candidates.length)];
        const existing = this.collapsingBuildings.find(cb => cb.mesh === target);
        if (!existing) {
          this.collapsingBuildings.push({ mesh: target, falling: true, vy: 0 });
        }
      }
    }

    this.collapsingBuildings.forEach((cb) => {
      if (cb.falling) {
        cb.vy -= 15 * dt;
        cb.mesh.position.y += cb.vy * dt;
        cb.mesh.rotation.z += dt * 0.5;
        if (cb.mesh.position.y < -10) cb.falling = false;
      }
    });
    this.collapsingBuildings = this.collapsingBuildings.filter(cb => cb.falling || cb.mesh.position.y > -10);

    // Update explosions
    this.explosions.forEach((e) => {
      e.life -= dt;
      const scale = 1 + (1 - e.life / e.maxLife) * 2;
      e.mesh.scale.setScalar(scale);
      (e.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, e.life / e.maxLife);
    });
    this.explosions = this.explosions.filter(e => e.life > 0);
    this.explosions.forEach(e => { if (!e.mesh.parent) this.scene.add(e.mesh); });

    // Update debris
    this.debris.forEach((d) => {
      d.vy -= 20 * dt;
      d.mesh.position.x += d.vx * dt;
      d.mesh.position.y += d.vy * dt;
      d.mesh.position.z += d.vz * dt;
      d.mesh.rotation.x += d.rot.x * dt;
      d.mesh.rotation.y += d.rot.y * dt;
      d.mesh.rotation.z += d.rot.z * dt;
    });
    this.debris = this.debris.filter(d => d.mesh.position.y > -5);
  }

  private spawnExplosion(x: number, y: number, z: number) {
    const geo = new THREE.SphereGeometry(0.5, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff6a00, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    this.explosions.push({ mesh, life: 0.8, maxLife: 0.8 });
  }

  private spawnDebris(x: number, y: number, z: number) {
    const size = 0.2 + Math.random() * 0.4;
    const geo = new THREE.BoxGeometry(size, size, size);
    const mat = new THREE.MeshStandardMaterial({ color: 0x444455, metalness: 0.6, roughness: 0.5 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    this.scene.add(mesh);
    this.debris.push({
      mesh,
      vx: (Math.random() - 0.5) * 4,
      vy: 3 + Math.random() * 3,
      vz: (Math.random() - 0.5) * 4,
      rot: new THREE.Vector3(Math.random() * 4, Math.random() * 4, Math.random() * 4),
    });
  }

  private updateClimax(t: number, dt: number) {
    const local = (t - ACT.climax.start) / (ACT.climax.end - ACT.climax.start);

    // Player jumps across bridge
    this.player.visible = true;
    this.alien.visible = true;

    if (local < 0.5) {
      // Player runs and jumps
      const jumpT = local / 0.5;
      this.player.position.z = -28 - jumpT * 12;
      this.player.position.y = Math.sin(jumpT * Math.PI) * 3;
      this.player.position.x = Math.sin(jumpT * Math.PI * 2) * 0.5;
      const runCycle = t * 14;
      const swing = Math.sin(runCycle) * 0.8;
      const armL = this.player.children[5];
      const armR = this.player.children[6];
      const legL = this.player.children[7];
      const legR = this.player.children[8];
      if (armL) armL.rotation.x = -swing;
      if (armR) armR.rotation.x = swing;
      if (legL) legL.rotation.x = swing;
      if (legR) legR.rotation.x = -swing;
    } else {
      // Player lands and looks at tower
      this.player.position.z = -40;
      this.player.position.y = 0;
      this.player.position.x = 0;
    }

    // Alien fires massive laser behind player at ~40% through
    if (local > 0.35 && local < 0.55) {
      this.alien.position.z = this.player.position.z + 8;
      this.alien.position.y = 1;
      // Big laser beam
      const beam = this.laserBeams[0];
      beam.visible = true;
      beam.position.copy(this.alien.position);
      beam.position.y = 2;
      beam.lookAt(this.player.position.x, this.player.position.y + 1, this.player.position.z - 5);
      beam.rotateX(Math.PI / 2);
      (beam.material as THREE.MeshBasicMaterial).opacity = 1;
      this.camShake = Math.max(this.camShake, 0.6);
    }

    // Bridge collapses
    if (local > 0.4) {
      this.bridge!.visible = true;
      this.bridgeSegments.forEach((seg, i) => {
        if (!seg.falling && local > 0.4 + i * 0.03) {
          seg.falling = true;
          seg.vy = 0;
          seg.vx = (Math.random() - 0.5) * 2;
          seg.vz = -1 - Math.random() * 2;
          this.spawnExplosion(seg.mesh.position.x, seg.mesh.position.y, seg.mesh.position.z);
          this.camShake = Math.max(this.camShake, 0.5);
        }
        if (seg.falling) {
          seg.vy -= 20 * dt;
          seg.mesh.position.x += seg.vx * dt;
          seg.mesh.position.y += seg.vy * dt;
          seg.mesh.position.z += seg.vz * dt;
          seg.mesh.rotation.x += dt * 1.5;
          seg.mesh.rotation.z += dt * 0.8;
        }
      });
    }

    // AI Tower appears
    if (local > 0.6) {
      this.aiTower!.visible = true;
      const revealT = (local - 0.6) / 0.4;
      const mat = (this.aiTower!.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.25 + Math.sin(t * 2) * 0.1 + revealT * 0.3;
    }

    // Mission hologram
    if (local > 0.75) {
      this.missionHolo!.visible = true;
      const mat = this.missionHolo!.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.min(0.6, mat.opacity + dt * 1.5);
      this.missionHolo!.rotation.y = Math.sin(t * 0.5) * 0.1;
      this.callbacks.onMission(true);
    }
  }

  private updateTransition(t: number, dt: number) {
    const local = (t - ACT.transition.start) / (ACT.transition.end - ACT.transition.start);

    // Player runs forward, camera settles behind
    this.player.visible = true;
    this.alien.visible = false;
    this.missionHolo!.visible = false;
    this.aiTower!.visible = false;

    this.player.position.z = -40 - local * 30;
    this.player.position.x = 0;
    this.player.position.y = 0;

    const runCycle = t * 10;
    const swing = Math.sin(runCycle) * 0.6;
    const armL = this.player.children[5];
    const armR = this.player.children[6];
    const legL = this.player.children[7];
    const legR = this.player.children[8];
    if (armL) armL.rotation.x = -swing;
    if (armR) armR.rotation.x = swing;
    if (legL) legL.rotation.x = swing;
    if (legR) legR.rotation.x = -swing;

    // Fade fog for cleaner gameplay look
    this.fog.density = Math.max(0.006, this.fog.density - dt * 0.002);

    // Combat drones retreat
    this.combatDrones.forEach((d) => { d.visible = false; });
  }

  // ===========================================================
  // Main loop
  // ===========================================================

  start() {
    this.clock.start();
    this.loop();
  }

  private loop = () => {
    if (this.destroyed) return;
    this.rafId = requestAnimationFrame(this.loop);

    const rawDt = Math.min(0.05, this.clock.getDelta());
    const dt = rawDt * this.slowMo;
    this.elapsed += dt;
    const t = this.elapsed;

    if (t >= TOTAL_DURATION) {
      this.callbacks.onComplete();
      return;
    }

    // Update world (always)
    this.updateWorld(t, dt);

    // Phase-specific updates
    if (t < ACT.escape.start) {
      this.updateNarration(t);
    } else if (t < ACT.climax.start) {
      this.updateEscape(t, dt);
    } else if (t < ACT.transition.start) {
      this.updateClimax(t, dt);
    } else {
      this.updateTransition(t, dt);
    }

    // Camera
    this.updateCamera(t);

    // Progress
    this.callbacks.onProgress(t / TOTAL_DURATION);

    this.renderer.render(this.scene, this.camera);
  };

  resize(w: number, h: number) {
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  destroy() {
    this.destroyed = true;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach(m => m.dispose());
          else o.material.dispose();
        }
      }
      if (o instanceof THREE.Points && o.geometry) o.geometry.dispose();
      if (o instanceof THREE.Line && o.geometry) o.geometry.dispose();
    });
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}

export function createIntroCinematic(container: HTMLElement, callbacks: IntroCallbacks): IntroCinematic {
  return new IntroCinematic(container, callbacks);
}
