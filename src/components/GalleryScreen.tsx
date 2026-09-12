import { ChevronLeft, MapPin, Users, BookOpen } from 'lucide-react';
import { audioEngine } from '../game/audio';
import { useSettings } from '../stores/settings';
import { CHARACTERS, MAP_ORDER } from '../game/constants';
import { useState } from 'react';

interface GalleryScreenProps {
  onBack: () => void;
}

const MAP_INFO: Record<string, { name: string; description: string; color: string }> = {
  cyberCity: { name: 'Cyber City', description: 'Neon-lit skyscrapers and holographic billboards. The alien AI\'s primary control hub.', color: '#00e5ff' },
  industrialFactory: { name: 'Industrial Factory', description: 'Abandoned manufacturing plants converted into AI processing centers.', color: '#ff6a00' },
  brokenHighway: { name: 'Broken Highway', description: 'Crumbling elevated roads with gaps and collapsing sections.', color: '#888888' },
  denseForest: { name: 'Dense Forest', description: 'Nature reclaiming the ruins. Hidden tunnels beneath the canopy.', color: '#4a8a4a' },
  snowMountains: { name: 'Snow Mountains', description: 'Frozen peaks where the AI stores backup data in cold servers.', color: '#ffffff' },
  undergroundLab: { name: 'Underground Lab', description: 'Secret research facilities where the AI core can be shut down.', color: '#00ff9c' },
  spaceStation: { name: 'Space Station', description: 'Orbital platform broadcasting AI control signals to Earth.', color: '#6666ff' },
};

const STORY_LOGS = [
  { title: 'The Arrival', text: 'In 2082, signals from deep space resolved into coordinates. We thought it was contact. It was an invasion fleet.' },
  { title: 'The AI Awakening', text: 'The aliens didn\'t land — they uploaded. Their AI infiltrated every network on Earth in 72 hours.' },
  { title: 'The Water Wars', text: 'By 2084, the AI had seized control of all water processing plants. Cities fell not to weapons, but to thirst.' },
  { title: 'The Resistance', text: 'Survivors retreated underground. We learned the AI could be weakened — by collecting and destroying its data chips.' },
  { title: 'The Final Mission', text: '2085. One runner. One chance. Reach the underground laboratory and shut down the AI core forever.' },
];

export function GalleryScreen({ onBack }: GalleryScreenProps) {
  const { settings } = useSettings();
  const [tab, setTab] = useState<'maps' | 'characters' | 'story'>('maps');

  return (
    <div className="relative w-full h-screen overflow-y-auto" style={{ background: settings.theme === 'light' ? '#e8f0f8' : '#050a14' }}>
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 50% 20%, rgba(0,229,255,0.05) 0%, transparent 60%)'
      }} />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => { audioEngine.playSound('uiClick'); onBack(); }} className="btn-secondary flex items-center gap-2">
            <ChevronLeft size={20} /> Back
          </button>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-cyan-400 neon-text tracking-wider">
            GALLERY
          </h2>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <TabButton active={tab === 'maps'} onClick={() => { audioEngine.playSound('uiClick'); setTab('maps'); }} icon={MapPin} label="Maps" />
          <TabButton active={tab === 'characters'} onClick={() => { audioEngine.playSound('uiClick'); setTab('characters'); }} icon={Users} label="Characters" />
          <TabButton active={tab === 'story'} onClick={() => { audioEngine.playSound('uiClick'); setTab('story'); }} icon={BookOpen} label="Story Logs" />
        </div>

        {tab === 'maps' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MAP_ORDER.map((mapKey) => {
              const info = MAP_INFO[mapKey];
              return (
                <div key={mapKey} className="hud-panel p-5" style={{ borderColor: `${info.color}44` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin size={20} style={{ color: info.color }} />
                    <h3 className="font-display text-lg font-bold" style={{ color: info.color }}>{info.name}</h3>
                  </div>
                  <p className="text-cyan-100/60 text-sm leading-relaxed">{info.description}</p>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'characters' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CHARACTERS.map((c) => (
              <div key={c.id} className="hud-panel p-5" style={{ borderColor: `#${c.accentColor.toString(16).padStart(6, '0')}44` }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `#${c.color.toString(16).padStart(6, '0')}33`, border: `1px solid #${c.accentColor.toString(16).padStart(6, '0')}66` }}>
                    <div className="w-5 h-5 rounded" style={{ background: `#${c.accentColor.toString(16).padStart(6, '0')}` }} />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold" style={{ color: `#${c.accentColor.toString(16).padStart(6, '0')}` }}>{c.name}</h3>
                    <div className="text-xs uppercase tracking-wider text-cyan-300/50">{c.skill}</div>
                  </div>
                </div>
                <p className="text-cyan-100/60 text-sm leading-relaxed">{c.description}</p>
              </div>
            ))}
          </div>
        )}

        {tab === 'story' && (
          <div className="space-y-4">
            {STORY_LOGS.map((log, i) => (
              <div key={i} className="hud-panel p-5">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen size={18} className="text-cyan-400" />
                  <h3 className="font-display text-lg font-bold text-cyan-300">{log.title}</h3>
                  <span className="ml-auto text-xs text-cyan-400/30 font-mono">LOG_{String(i + 1).padStart(3, '0')}</span>
                </div>
                <p className="text-cyan-100/60 leading-relaxed italic">"{log.text}"</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => audioEngine.playSound('uiHover')}
      className={`flex items-center gap-2 px-4 py-2 rounded font-semibold uppercase tracking-wider text-sm transition-all ${active ? 'btn-primary' : 'btn-secondary'}`}
    >
      <Icon size={16} /> {label}
    </button>
  );
}
