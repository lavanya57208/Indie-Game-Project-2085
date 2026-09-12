import { RotateCcw, Home, Droplet, Cpu, Gauge, Clock } from 'lucide-react';
import { GameStats } from '../game/GameEngine';
import { audioEngine } from '../game/audio';

interface GameOverScreenProps {
  stats: GameStats;
  onRestart: () => void;
  onExit: () => void;
}

export function GameOverScreen({ stats, onRestart, onExit }: GameOverScreenProps) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center" style={{ background: 'rgba(5,10,20,0.9)', backdropFilter: 'blur(10px)' }}>
      <div className="hud-panel p-8 flex flex-col items-center gap-6 animate-scale-in min-w-[400px] max-w-[500px]">
        <div className="text-center">
          <h2 className="font-display text-4xl font-black text-red-500 neon-text tracking-widest" style={{ color: '#ff1744', textShadow: '0 0 20px #ff1744' }}>
            GAME OVER
          </h2>
          <p className="text-red-300/60 mt-2 tracking-widest uppercase text-sm">The alien AI has claimed another survivor</p>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full">
          <StatCard icon={Gauge} label="Distance" value={`${stats.distance}m`} color="#00e5ff" />
          <StatCard icon={Clock} label="Survived" value={`${Math.round(stats.timeAlive)}s`} color="#ffc400" />
          <StatCard icon={Droplet} label="Water Drops" value={`${stats.waterDrops}`} color="#4fc3f7" />
          <StatCard icon={Cpu} label="AI Chips" value={`${stats.aiChips}`} color="#00ff9c" />
        </div>

        <div className="flex flex-col gap-3 w-full">
          <button onClick={() => { audioEngine.playSound('uiClick'); onRestart(); }} className="btn-primary flex items-center justify-center gap-2 animate-pulse-glow">
            <RotateCcw size={20} /> Try Again
          </button>
          <button onClick={() => { audioEngine.playSound('uiClick'); onExit(); }} className="btn-secondary flex items-center justify-center gap-2">
            <Home size={20} /> Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="hud-panel p-3 flex items-center gap-3">
      <Icon size={20} style={{ color }} />
      <div>
        <div className="text-xs text-cyan-300/50 uppercase tracking-wider">{label}</div>
        <div className="text-lg font-bold" style={{ color }}>{value}</div>
      </div>
    </div>
  );
}
