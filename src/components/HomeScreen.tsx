import { useRef } from 'react';
import { Droplet, Cpu, Play, Users, Image, Trophy, Settings, Info, Mail } from 'lucide-react';
import { HomeBackground3D } from './HomeBackground3D';
import { audioEngine } from '../game/audio';
import { useSettings } from '../stores/settings';

export type ScreenName = 'home' | 'character' | 'game' | 'gallery' | 'leaderboard' | 'settings' | 'about' | 'contact';

interface HomeScreenProps {
  onNavigate: (screen: ScreenName) => void;
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  const bgRef = useRef<HTMLDivElement>(null);
  const { settings } = useSettings();

  const handleNav = (screen: ScreenName) => {
    audioEngine.init();
    audioEngine.resume();
    audioEngine.playSound('uiClick');
    onNavigate(screen);
  };

  const buttons = [
    { label: 'Play Now', icon: Play, screen: 'character' as ScreenName, primary: true },
    { label: 'Characters', icon: Users, screen: 'character' as ScreenName },
    { label: 'Gallery', icon: Image, screen: 'gallery' as ScreenName },
    { label: 'Leaderboard', icon: Trophy, screen: 'leaderboard' as ScreenName },
    { label: 'Settings', icon: Settings, screen: 'settings' as ScreenName },
    { label: 'About', icon: Info, screen: 'about' as ScreenName },
    { label: 'Contact', icon: Mail, screen: 'contact' as ScreenName },
  ];

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ background: settings.theme === 'light' ? '#e8f0f8' : '#050a14' }}>
      <div ref={bgRef} className="absolute inset-0" />
      <HomeBackground3D containerRef={bgRef} />

      {/* Fog overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at center, transparent 0%, rgba(5,10,20,0.6) 70%, rgba(5,10,20,0.95) 100%)'
      }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-4">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Droplet size={48} className="text-cyan-400 neon-text" style={{ filter: 'drop-shadow(0 0 10px #00e5ff)' }} />
            <h1 className="font-display font-black text-5xl md:text-7xl tracking-wider"
              style={{
                background: 'linear-gradient(180deg, #00e5ff 0%, #2196f3 50%, #00ff9c 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 20px rgba(0,229,255,0.5))',
              }}>
              PROJECT AQUA
            </h1>
            <Cpu size={48} className="text-green-400 neon-text" style={{ filter: 'drop-shadow(0 0 10px #00ff9c)' }} />
          </div>
          <div className="font-display text-2xl md:text-4xl font-bold text-cyan-300 tracking-[0.5em] neon-text">
            : 2085 :
          </div>
          <p className="font-body text-lg md:text-xl text-cyan-200/70 mt-4 tracking-[0.3em] uppercase">
            Run. Survive. Save Humanity.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3 w-full max-w-xs animate-scale-in">
          {buttons.map((btn) => {
            const Icon = btn.icon;
            return (
              <button
                key={btn.label}
                onClick={() => handleNav(btn.screen)}
                onMouseEnter={() => audioEngine.playSound('uiHover')}
                className={btn.primary ? 'btn-primary animate-pulse-glow flex items-center justify-center gap-3' : 'btn-secondary flex items-center justify-center gap-3'}
              >
                <Icon size={20} />
                {btn.label}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="absolute bottom-4 left-0 right-0 text-center text-xs text-cyan-500/40 font-body tracking-widest uppercase">
          An Original Sci-Fi Infinite Runner
        </div>
      </div>
    </div>
  );
}
