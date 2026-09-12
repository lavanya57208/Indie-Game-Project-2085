import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { COLORS } from '../game/constants';

class HomeBackground {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private rafId: number | null = null;
  private buildings: THREE.Mesh[] = [];
  private drones: THREE.Group[] = [];
  private particles: THREE.Points | null = null;
  private fog: THREE.FogExp2;
  private animTime = 0;

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.fog = new THREE.FogExp2(0x050a14, 0.012);
    this.scene.fog = this.fog;

    this.camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 200);
    this.camera.position.set(0, 5, 15);
    this.camera.lookAt(0, 4, 0);

    this.buildScene();
  }

  private buildScene() {
    // Lights
    const hemi = new THREE.HemisphereLight(0x4488ff, 0x050a14, 0.5);
    this.scene.add(hemi);

    const dir = new THREE.DirectionalLight(0x00e5ff, 0.6);
    dir.position.set(5, 10, 5);
    this.scene.add(dir);

    const point = new THREE.PointLight(0xff0080, 1, 30);
    point.position.set(-5, 3, 5);
    this.scene.add(point);

    // Ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshStandardMaterial({ color: 0x0a1929, metalness: 0.8, roughness: 0.3 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    this.scene.add(ground);

    // Grid
    const grid = new THREE.GridHelper(100, 40, 0x00e5ff, 0x0a1929);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.3;
    grid.position.y = -0.48;
    this.scene.add(grid);

    // Buildings skyline
    for (let i = 0; i < 30; i++) {
      const h = 3 + Math.random() * 12;
      const w = 1 + Math.random() * 2;
      const mat = new THREE.MeshStandardMaterial({
        color: 0x0a1929,
        emissive: Math.random() > 0.5 ? COLORS.cyan : COLORS.neonPink,
        emissiveIntensity: 0.15 + Math.random() * 0.2,
        metalness: 0.8,
        roughness: 0.3,
      });
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat);
      const side = Math.random() > 0.5 ? 1 : -1;
      b.position.set(side * (5 + Math.random() * 20), h / 2, -Math.random() * 40);
      this.scene.add(b);
      this.buildings.push(b);

      // Windows
      for (let j = 0; j < 3; j++) {
        const win = new THREE.Mesh(
          new THREE.PlaneGeometry(0.15, 0.15),
          new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.6 })
        );
        win.position.set(b.position.x, 1 + j * 1.5, b.position.z + w / 2 + 0.01);
        this.scene.add(win);
      }
    }

    // Drones
    for (let i = 0; i < 5; i++) {
      const drone = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x333, emissive: COLORS.alienRed, emissiveIntensity: 0.5, metalness: 0.8, roughness: 0.2 })
      );
      drone.add(body);
      const light = new THREE.PointLight(COLORS.alienRed, 0.5, 5);
      drone.add(light);
      drone.position.set((Math.random() - 0.5) * 20, 3 + Math.random() * 5, -Math.random() * 30);
      this.scene.add(drone);
      this.drones.push(drone);
    }

    // Particles
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(200 * 3);
    for (let i = 0; i < 200; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 1] = Math.random() * 15;
      pos[i * 3 + 2] = -Math.random() * 40;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.particles = new THREE.Points(geo, new THREE.PointsMaterial({ color: COLORS.cyan, size: 0.1, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.particles.frustumCulled = false;
    this.scene.add(this.particles);
  }

  start() {
    this.loop();
  }

  private loop = () => {
    this.rafId = requestAnimationFrame(this.loop);
    this.animTime += 0.016;

    // Camera slow pan
    this.camera.position.x = Math.sin(this.animTime * 0.1) * 3;
    this.camera.position.y = 5 + Math.sin(this.animTime * 0.05) * 1;
    this.camera.lookAt(0, 4, 0);

    // Buildings pulse
    this.buildings.forEach((b, i) => {
      const mat = b.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.15 + Math.sin(this.animTime * 0.5 + i) * 0.1;
    });

    // Drones move
    this.drones.forEach((d, i) => {
      d.position.x += Math.sin(this.animTime * 0.3 + i) * 0.02;
      d.position.y += Math.sin(this.animTime * 0.5 + i * 2) * 0.01;
      d.rotation.y += 0.02;
    });

    // Particles
    if (this.particles) {
      const pos = this.particles.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < 200; i++) {
        pos.array[i * 3 + 1] += 0.02;
        if (pos.array[i * 3 + 1] > 15) pos.array[i * 3 + 1] = 0;
      }
      pos.needsUpdate = true;
    }

    this.renderer.render(this.scene, this.camera);
  };

  resize(w: number, h: number) {
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}

export function HomeBackground3D({ containerRef }: { containerRef: React.RefObject<HTMLDivElement> }) {
  const bgRef = useRef<HomeBackground | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const bg = new HomeBackground(containerRef.current);
    bgRef.current = bg;
    bg.start();

    const handleResize = () => {
      if (containerRef.current && bgRef.current) {
        bgRef.current.resize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      bg.destroy();
      bgRef.current = null;
    };
  }, [containerRef]);

  return null;
}
