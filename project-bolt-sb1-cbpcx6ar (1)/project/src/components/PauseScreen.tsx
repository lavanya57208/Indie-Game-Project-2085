import { Play, RotateCcw, Home } from 'lucide-react';
import { audioEngine } from '../game/audio';

interface PauseScreenProps {
  onResume: () => void;
  onRestart: () => void;
  onExit: () => void;
}

export function PauseScreen({ onResume, onRestart, onExit }: PauseScreenProps) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center" style={{ background: 'rgba(5,10,20,0.85)', backdropFilter: 'blur(8px)' }}>
      <div className="hud-panel p-8 flex flex-col items-center gap-6 animate-scale-in min-w-[300px]">
        <h2 className="font-display text-3xl font-bold text-cyan-400 neon-text tracking-widest">PAUSED</h2>
        <div className="flex flex-col gap-3 w-full">
          <button onClick={() => { audioEngine.playSound('uiClick'); onResume(); }} className="btn-primary flex items-center justify-center gap-2">
            <Play size={20} /> Resume
          </button>
          <button onClick={() => { audioEngine.playSound('uiClick'); onRestart(); }} className="btn-secondary flex items-center justify-center gap-2">
            <RotateCcw size={20} /> Restart
          </button>
          <button onClick={() => { audioEngine.playSound('uiClick'); onExit(); }} className="btn-secondary flex items-center justify-center gap-2">
            <Home size={20} /> Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}
