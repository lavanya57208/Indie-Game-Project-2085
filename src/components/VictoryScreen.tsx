import { RotateCcw, Home, Cpu, Droplet, Gauge, Clock, Trophy } from 'lucide-react';
import { GameStats } from '../game/GameEngine';
import { audioEngine } from '../game/audio';
import { WIN_AI_CHIPS } from '../game/constants';

interface VictoryScreenProps {
  stats: GameStats;
  onRestart: () => void;
  onExit: () => void;
}

export function VictoryScreen({ stats, onRestart, onExit }: VictoryScreenProps) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center" style={{ background: 'rgba(0,20,10,0.9)', backdropFilter: 'blur(10px)' }}>
      <div className="hud-panel p-8 flex flex-col items-center gap-6 animate-scale-in min-w-[400px] max-w-[500px]" style={{ borderColor: '#00ff9c', boxShadow: '0 0 30px rgba(0,255,156,0.3)' }}>
        <div className="text-center">
          <Trophy size={48} className="text-green-400 mx-auto mb-2" style={{ filter: 'drop-shadow(0 0 15px #00ff9c)' }} />
          <h2 className="font-display text-4xl font-black text-green-400 neon-text tracking-widest" style={{ color: '#00ff9c', textShadow: '0 0 20px #00ff9c' }}>
            VICTORY
          </h2>
          <p className="text-green-300/70 mt-2 tracking-widest uppercase text-sm">{stats.winReason}</p>
          <p className="text-green-200/50 mt-1 text-sm">Humanity has been saved.</p>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full">
          <StatCard icon={Cpu} label="AI Chips" value={`${stats.aiChips}/${WIN_AI_CHIPS}`} color="#00ff9c" />
          <StatCard icon={Gauge} label="Distance" value={`${stats.distance}m`} color="#00e5ff" />
          <StatCard icon={Droplet} label="Water Drops" value={`${stats.waterDrops}`} color="#4fc3f7" />
          <StatCard icon={Clock} label="Time Survived" value={`${Math.round(stats.timeAlive)}s`} color="#ffc400" />
        </div>

        <div className="w-full text-center hud-panel p-3" style={{ borderColor: '#00ff9c' }}>
          <div className="text-xs text-green-300/50 uppercase tracking-wider">Final Score</div>
          <div className="text-3xl font-black text-green-400" style={{ textShadow: '0 0 15px #00ff9c' }}>{stats.distance}</div>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <button onClick={() => { audioEngine.playSound('uiClick'); onRestart(); }} className="btn-primary flex items-center justify-center gap-2 animate-pulse-glow" style={{ borderColor: '#00ff9c', color: '#00ff9c' }}>
            <RotateCcw size={20} /> Play Again
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
        <div className="text-xs text-green-300/50 uppercase tracking-wider">{label}</div>
        <div className="text-lg font-bold" style={{ color }}>{value}</div>
      </div>
    </div>
  );
}
