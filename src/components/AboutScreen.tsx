import { ChevronLeft, Droplet, Cpu, AlertTriangle, Shield, Zap, MapPin, Cloud, Users } from 'lucide-react';
import { audioEngine } from '../game/audio';
import { useSettings } from '../stores/settings';

interface AboutScreenProps {
  onBack: () => void;
}

export function AboutScreen({ onBack }: AboutScreenProps) {
  const { settings } = useSettings();

  return (
    <div className="relative w-full h-screen overflow-y-auto" style={{ background: settings.theme === 'light' ? '#e8f0f8' : '#050a14' }}>
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 30% 20%, rgba(0,229,255,0.05) 0%, transparent 60%)'
      }} />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => { audioEngine.playSound('uiClick'); onBack(); }} className="btn-secondary flex items-center gap-2">
            <ChevronLeft size={20} /> Back
          </button>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-cyan-400 neon-text tracking-wider">
            ABOUT
          </h2>
        </div>

        {/* Story */}
        <div className="hud-panel p-6 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Droplet size={24} className="text-cyan-400" />
            <h3 className="font-display text-xl font-bold text-cyan-300 tracking-wider">THE STORY</h3>
          </div>
          <p className="text-cyan-100/70 leading-relaxed mb-3">
            The year is 2085. Earth has been invaded by intelligent aliens who have taken control of every major city
            using advanced Artificial Intelligence systems. They use massive AI-controlled data centers to control
            human technology and consume Earth's freshwater resources, creating a worldwide water crisis.
          </p>
          <p className="text-cyan-100/70 leading-relaxed">
            You are one of the last surviving humans. Your mission: escape the alien-controlled city, collect Water
            Drops to survive, collect AI Chips to weaken the Alien AI Control System, and ultimately save humanity.
          </p>
        </div>

        {/* Gameplay */}
        <div className="hud-panel p-6 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={24} className="text-yellow-400" />
            <h3 className="font-display text-xl font-bold text-cyan-300 tracking-wider">GAMEPLAY</h3>
          </div>
          <p className="text-cyan-100/70 leading-relaxed mb-3">
            Your character automatically runs forward through a procedurally generated alien-controlled city.
            Jump over low lasers, slide under high lasers, and dodge between three lanes to avoid obstacles.
            The game speed gradually increases, and the alien AI adapts to your skill level.
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <ControlItem keys="W / ↑" action="Jump" />
            <ControlItem keys="S / ↓" action="Slide" />
            <ControlItem keys="A / ←" action="Move Left" />
            <ControlItem keys="D / →" action="Move Right" />
            <ControlItem keys="Q / Shift" action="Activate Ability" />
            <ControlItem keys="P / Esc" action="Pause" />
          </div>
        </div>

        {/* Objectives */}
        <div className="hud-panel p-6 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Cpu size={24} className="text-green-400" />
            <h3 className="font-display text-xl font-bold text-cyan-300 tracking-wider">OBJECTIVES</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Droplet size={18} className="text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-cyan-100/70"><span className="text-blue-300 font-semibold">Water Drops</span> — Collect to restore Energy. If Energy reaches 0, you lose.</p>
            </div>
            <div className="flex items-start gap-3">
              <Cpu size={18} className="text-green-400 mt-0.5 flex-shrink-0" />
              <p className="text-cyan-100/70"><span className="text-green-300 font-semibold">AI Chips</span> — Collect to weaken the Alien AI Control System. Reach 70 to win.</p>
            </div>
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-cyan-100/70"><span className="text-red-300 font-semibold">Avoid Obstacles</span> — Lasers, drones, mines, debris, and more. One hit means Game Over.</p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="hud-panel p-6 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={24} className="text-cyan-400" />
            <h3 className="font-display text-xl font-bold text-cyan-300 tracking-wider">FEATURES</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <FeatureItem icon={AlertTriangle} text="Adaptive Alien AI chase system" color="#ff1744" />
            <FeatureItem icon={Shield} text="Special abilities: Magnetic Boots, Shield, Barrier" color="#00e5ff" />
            <FeatureItem icon={MapPin} text="7 unique maps with cinematic transitions" color="#00ff9c" />
            <FeatureItem icon={Cloud} text="Dynamic weather: rain, snow, fog, thunderstorm" color="#4fc3f7" />
            <FeatureItem icon={Users} text="8 unique characters with special abilities" color="#ff0080" />
            <FeatureItem icon={Zap} text="Progressive difficulty scaling" color="#ffc400" />
          </div>
        </div>

        {/* Win Conditions */}
        <div className="hud-panel p-6">
          <div className="flex items-center gap-2 mb-3">
            <Cpu size={24} className="text-green-400" />
            <h3 className="font-display text-xl font-bold text-cyan-300 tracking-wider">WIN CONDITIONS</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <span className="font-display text-green-400 font-bold mt-0.5">01</span>
              <p className="text-cyan-100/70">Collect 70 AI Chips and disable the Alien AI Control System.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="font-display text-green-400 font-bold mt-0.5">02</span>
              <p className="text-cyan-100/70">Reach the Scientific Laboratory and permanently shut down the Alien AI Core.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ControlItem({ keys, action }: { keys: string; action: string }) {
  return (
    <div className="flex items-center justify-between hud-panel px-3 py-2">
      <span className="text-cyan-300/70">{action}</span>
      <kbd className="px-2 py-1 rounded text-xs font-mono text-cyan-400" style={{ background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.3)' }}>{keys}</kbd>
    </div>
  );
}

function FeatureItem({ icon: Icon, text, color }: { icon: any; text: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={16} style={{ color }} />
      <span className="text-cyan-100/70">{text}</span>
    </div>
  );
}
