import { Droplet, Cpu, Heart, Zap, Shield, AlertTriangle, Gauge, MapPin, Cloud, Pause, RotateCcw } from 'lucide-react';
import { GameStats } from '../game/GameEngine';

interface HUDProps {
  stats: GameStats;
  onPause: () => void;
  onRestart: () => void;
}

const MAP_NAMES: Record<string, string> = {
  cyberCity: 'Cyber City',
  industrialFactory: 'Industrial Factory',
  brokenHighway: 'Broken Highway',
  denseForest: 'Dense Forest',
  snowMountains: 'Snow Mountains',
  undergroundLab: 'Underground Lab',
  spaceStation: 'Space Station',
};

const WEATHER_NAMES: Record<string, string> = {
  sunny: 'Clear',
  rain: 'Rain',
  autumn: 'Autumn',
  snow: 'Snow',
  fog: 'Fog',
  thunderstorm: 'Thunderstorm',
};

export function HUD({ stats, onPause, onRestart }: HUDProps) {
  const energyColor = stats.energy > 60 ? '#00ff9c' : stats.energy > 30 ? '#ffc400' : '#ff1744';

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-start justify-between p-4">
        {/* Left: Energy + Collectibles */}
        <div className="hud-panel p-3 space-y-2 min-w-[200px]">
          {/* Energy */}
          <div className="flex items-center gap-2">
            <Heart size={18} style={{ color: energyColor }} fill={energyColor} />
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-cyan-300 font-semibold tracking-wider">ENERGY</span>
                <span style={{ color: energyColor }} className="font-bold">{stats.energy}</span>
              </div>
              <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${stats.energy}%`, background: energyColor, boxShadow: `0 0 8px ${energyColor}` }} />
              </div>
            </div>
          </div>

          {/* Water Drops */}
          <div className="flex items-center gap-2">
            <Droplet size={18} className="text-blue-400" style={{ filter: 'drop-shadow(0 0 4px #4fc3f7)' }} />
            <span className="text-blue-300 font-bold text-lg">{stats.waterDrops}</span>
            <span className="text-blue-300/50 text-xs uppercase tracking-wider">Water Drops</span>
          </div>

          {/* AI Chips */}
          <div className="flex items-center gap-2">
            <Cpu size={18} className="text-green-400" style={{ filter: 'drop-shadow(0 0 4px #00ff9c)' }} />
            <span className="text-green-300 font-bold text-lg">{stats.aiChips}</span>
            <span className="text-green-300/50 text-xs uppercase tracking-wider">AI Chips</span>
            <span className="text-green-300/30 text-xs ml-auto">/ {1000}</span>
          </div>
        </div>

        {/* Center: Chase warning */}
        {stats.chaseWarning && (
          <div className="hud-panel p-3 px-6 animate-chase-warning border-red-500" style={{ borderColor: '#ff1744' }}>
            <div className="flex items-center gap-2 text-red-400 font-display font-bold tracking-widest animate-pulse">
              <AlertTriangle size={20} />
              ALIEN INCOMING
            </div>
          </div>
        )}

        {/* Right: Distance + Speed + Map */}
        <div className="hud-panel p-3 space-y-2 min-w-[180px] text-right">
          <div className="flex items-center justify-end gap-2">
            <Gauge size={16} className="text-cyan-400" />
            <span className="text-cyan-300 font-bold text-lg">{stats.distance}m</span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Zap size={16} className="text-yellow-400" />
            <span className="text-yellow-300 font-semibold">{stats.speed} km/h</span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <MapPin size={14} className="text-cyan-500" />
            <span className="text-cyan-400/70 text-xs uppercase tracking-wider">{MAP_NAMES[stats.currentMap]}</span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Cloud size={14} className="text-cyan-500" />
            <span className="text-cyan-400/70 text-xs uppercase tracking-wider">{WEATHER_NAMES[stats.currentWeather]}</span>
          </div>
        </div>
      </div>

      {/* Chase indicator */}
      {stats.isChasing && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 hud-panel p-2 px-6 border-red-500 animate-pulse" style={{ borderColor: '#ff1744' }}>
          <div className="flex items-center gap-2 text-red-400 font-display font-bold tracking-widest">
            <AlertTriangle size={16} />
            ALIEN CHASE ACTIVE
          </div>
        </div>
      )}

      {/* Bottom: Abilities */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
        {/* Magnetic Boots */}
        <AbilityButton
          icon={Zap}
          label="Boots"
          ready={stats.magneticBootsReady}
          color="#ffc400"
        />
        {/* Shield */}
        <AbilityButton
          icon={Shield}
          label="Shield"
          ready={stats.shieldReady}
          active={stats.shieldActive}
          color="#00e5ff"
        />
        {/* Barrier */}
        <AbilityButton
          icon={AlertTriangle}
          label="Barrier"
          ready={stats.barrierReady}
          active={stats.barrierActive}
          color="#ff0080"
        />
      </div>

      {/* Pause + Restart buttons */}
      <div className="absolute top-1/2 right-4 -translate-y-1/2 flex flex-col gap-2 pointer-events-auto">
        <button onClick={onPause} className="hud-panel p-2 hover:bg-cyan-500/20 transition-colors" title="Pause (P)">
          <Pause size={20} className="text-cyan-400" />
        </button>
        <button onClick={onRestart} className="hud-panel p-2 hover:bg-cyan-500/20 transition-colors" title="Restart (R)">
          <RotateCcw size={20} className="text-cyan-400" />
        </button>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-4 right-4 hud-panel p-2 text-xs text-cyan-300/50 space-y-1">
        <div>W/↑ Jump · S/↓ Slide</div>
        <div>A/← Left · D/→ Right</div>
        <div>Q Ability · P Pause · R Restart</div>
      </div>

      {/* Map transition overlay */}
      {stats.mapTransition && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,229,255,0.1)' }}>
          <div className="font-display text-3xl text-cyan-400 neon-text animate-pulse tracking-widest">
            ENTERING NEW SECTOR...
          </div>
        </div>
      )}
    </div>
  );
}

function AbilityButton({ icon: Icon, label, ready, active, color }: { icon: any; label: string; ready: boolean; active?: boolean; color: string }) {
  return (
    <div
      className="hud-panel p-2 flex flex-col items-center gap-1 transition-all duration-300"
      style={{
        opacity: ready || active ? 1 : 0.4,
        borderColor: ready || active ? color : undefined,
        boxShadow: active ? `0 0 15px ${color}` : ready ? `0 0 8px ${color}44` : 'none',
      }}
    >
      <Icon size={20} style={{ color: ready || active ? color : '#666' }} />
      <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: ready || active ? color : '#666' }}>{label}</span>
    </div>
  );
}
