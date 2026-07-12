import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { CHARACTERS, CharacterId } from '../game/constants';
import { audioEngine } from '../game/audio';
import { useSettings } from '../stores/settings';
import { ChevronLeft, Check } from 'lucide-react';

class CharacterPreview {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private rafId: number | null = null;
  private character: THREE.Group | null = null;
  private animTime = 0;

  constructor(container: HTMLElement, characterId: CharacterId) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 50);
    this.camera.position.set(0, 2, 5);
    this.camera.lookAt(0, 1.3, 0);

    const hemi = new THREE.HemisphereLight(0x4488ff, 0x050a14, 0.6);
    this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(3, 5, 3);
    this.scene.add(dir);
    const point = new THREE.PointLight(characterId.accentColor, 1.5, 8);
    point.position.set(0, 2, 2);
    this.scene.add(point);

    this.buildCharacter(characterId);
  }

  private buildCharacter(char: CharacterId) {
    const c = char.color;
    const ac = char.accentColor;
    const bodyMat = new THREE.MeshStandardMaterial({ color: c, metalness: 0.6, roughness: 0.3, emissive: c, emissiveIntensity: 0.2 });
    const accentMat = new THREE.MeshStandardMaterial({ color: ac, metalness: 0.8, roughness: 0.2, emissive: ac, emissiveIntensity: 0.4 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, metalness: 0.7, roughness: 0.3 });

    this.character = new THREE.Group();

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.4), bodyMat);
    torso.position.y = 1.3;
    this.character.add(torso);

    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.42), accentMat);
    chest.position.set(0, 1.35, 0.01);
    this.character.add(chest);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), darkMat);
    head.position.y = 2.0;
    this.character.add(head);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.02), new THREE.MeshBasicMaterial({ color: ac }));
    visor.position.set(0, 2.05, 0.23);
    this.character.add(visor);

    const armGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.7, 8);
    const armL = new THREE.Mesh(armGeo, bodyMat);
    armL.position.set(-0.5, 1.3, 0);
    armL.name = 'armL';
    this.character.add(armL);
    const armR = new THREE.Mesh(armGeo, bodyMat);
    armR.position.set(0.5, 1.3, 0);
    armR.name = 'armR';
    this.character.add(armR);

    const legGeo = new THREE.CylinderGeometry(0.15, 0.12, 0.8, 8);
    const legL = new THREE.Mesh(legGeo, darkMat);
    legL.position.set(-0.22, 0.45, 0);
    legL.name = 'legL';
    this.character.add(legL);
    const legR = new THREE.Mesh(legGeo, darkMat);
    legR.position.set(0.22, 0.45, 0);
    legR.name = 'legR';
    this.character.add(legR);

    // Platform
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.5, 0.1, 16),
      new THREE.MeshStandardMaterial({ color: 0x0a1929, emissive: ac, emissiveIntensity: 0.2, metalness: 0.8, roughness: 0.2 })
    );
    platform.position.y = -0.05;
    this.character.add(platform);

    this.scene.add(this.character);
  }

  start() { this.loop(); }

  private loop = () => {
    this.rafId = requestAnimationFrame(this.loop);
    this.animTime += 0.016;
    if (this.character) {
      this.character.rotation.y = this.animTime * 0.5;
      this.character.position.y = Math.sin(this.animTime * 1.5) * 0.05;
      const armL = this.character.getObjectByName('armL');
      const armR = this.character.getObjectByName('armR');
      const legL = this.character.getObjectByName('legL');
      const legR = this.character.getObjectByName('legR');
      if (armL && armR) { armL.rotation.x = Math.sin(this.animTime * 2) * 0.3; armR.rotation.x = -Math.sin(this.animTime * 2) * 0.3; }
      if (legL && legR) { legL.rotation.x = -Math.sin(this.animTime * 2) * 0.3; legR.rotation.x = Math.sin(this.animTime * 2) * 0.3; }
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

interface CharacterSelectionProps {
  onSelect: (character: CharacterId) => void;
  onBack: () => void;
}

export function CharacterSelection({ onSelect, onBack }: CharacterSelectionProps) {
  const [selected, setSelected] = useState(0);
  const [previewEl, setPreviewEl] = useState<HTMLDivElement | null>(null);
  const previewRef = useRef<CharacterPreview | null>(null);
  const { settings } = useSettings();

  useEffect(() => {
    if (!previewEl) return;
    if (previewRef.current) { previewRef.current.destroy(); previewRef.current = null; }
    const preview = new CharacterPreview(previewEl, CHARACTERS[selected]);
    previewRef.current = preview;
    preview.start();

    const handleResize = () => { if (previewRef.current) previewRef.current.resize(previewEl.clientWidth, previewEl.clientHeight); };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      preview.destroy();
      previewRef.current = null;
    };
  }, [selected, previewEl]);

  const handleSelect = (i: number) => {
    audioEngine.playSound('uiClick');
    setSelected(i);
  };

  const handleConfirm = () => {
    audioEngine.playSound('uiClick');
    onSelect(CHARACTERS[selected]);
  };

  const char = CHARACTERS[selected];

  return (
    <div className="relative w-full h-screen overflow-y-auto" style={{ background: settings.theme === 'light' ? '#e8f0f8' : '#050a14' }}>
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 30% 50%, rgba(0,229,255,0.05) 0%, transparent 60%)'
      }} />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => { audioEngine.playSound('uiClick'); onBack(); }} className="btn-secondary flex items-center gap-2">
            <ChevronLeft size={20} /> Back
          </button>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-cyan-400 neon-text tracking-wider">
            SELECT YOUR OPERATIVE
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 3D Preview */}
          <div className="space-y-4">
            <div ref={setPreviewEl} className="w-full h-80 md:h-96 rounded-lg overflow-hidden neon-border" style={{ background: 'rgba(5,10,20,0.5)' }} />
            <div className="hud-panel p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-4 h-4 rounded-full" style={{ background: `#${char.color.toString(16).padStart(6, '0')}`, boxShadow: `0 0 10px #${char.color.toString(16).padStart(6, '0')}` }} />
                <h3 className="font-display text-2xl font-bold text-white">{char.name}</h3>
              </div>
              <div className="inline-block px-3 py-1 rounded text-sm font-semibold mb-3" style={{ background: `#${char.accentColor.toString(16).padStart(6, '0')}33`, color: `#${char.accentColor.toString(16).padStart(6, '0')}`, border: `1px solid #${char.accentColor.toString(16).padStart(6, '0')}66` }}>
                {char.skill}
              </div>
              <p className="text-cyan-200/70 text-sm leading-relaxed">{char.description}</p>
            </div>
            <button onClick={handleConfirm} className="btn-primary w-full animate-pulse-glow flex items-center justify-center gap-2">
              <Check size={20} /> Deploy {char.name}
            </button>
          </div>

          {/* Character grid */}
          <div className="grid grid-cols-2 gap-3">
            {CHARACTERS.map((c, i) => (
              <button
                key={c.id}
                onClick={() => handleSelect(i)}
                onMouseEnter={() => audioEngine.playSound('uiHover')}
                className={`relative p-4 rounded-lg transition-all duration-300 text-left ${selected === i ? 'scale-105' : 'hover:scale-102'}`}
                style={{
                  background: selected === i ? `#${c.color.toString(16).padStart(6, '0')}22` : 'rgba(5,10,20,0.5)',
                  border: selected === i ? `2px solid #${c.accentColor.toString(16).padStart(6, '0')}` : '1px solid rgba(0,229,255,0.2)',
                  boxShadow: selected === i ? `0 0 20px #${c.accentColor.toString(16).padStart(6, '0')}44` : 'none',
                }}
              >
                {selected === i && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: `#${c.accentColor.toString(16).padStart(6, '0')}` }}>
                    <Check size={14} className="text-black" />
                  </div>
                )}
                <div className="w-12 h-12 rounded-lg mb-3 flex items-center justify-center" style={{ background: `#${c.color.toString(16).padStart(6, '0')}33`, border: `1px solid #${c.accentColor.toString(16).padStart(6, '0')}66` }}>
                  <div className="w-6 h-6 rounded" style={{ background: `#${c.accentColor.toString(16).padStart(6, '0')}` }} />
                </div>
                <div className="font-display font-bold text-lg" style={{ color: `#${c.accentColor.toString(16).padStart(6, '0')}` }}>{c.name}</div>
                <div className="text-xs text-cyan-200/60 mt-1">{c.skill}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
