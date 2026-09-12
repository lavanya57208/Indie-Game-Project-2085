import { useEffect, useRef, useState, useCallback } from 'react';
import { SkipForward } from 'lucide-react';
import { createIntroCinematic, IntroPhase } from '../game/IntroCinematic';
import { audioEngine } from '../game/audio';

interface IntroScreenProps {
  onComplete: () => void;
}

const MISSION_LINES = [
  'PROJECT AQUA',
  'Human Survival Protocol Activated',
  'Mission:',
  'Collect Water Drops.',
  'Collect AI Chips.',
  'Destroy the Alien AI Control System.',
  'Save Humanity.',
];

export function IntroScreen({ onComplete }: IntroScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<IntroPhase>('narration');
  const [narration, setNarration] = useState<string | null>(null);
  const [showMission, setShowMission] = useState(false);
  const [progress, setProgress] = useState(0);
  const completedRef = useRef(false);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    audioEngine.stopIntro();
    // Crossfade into gameplay music
    audioEngine.startMusic();
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (!containerRef.current) return;

    audioEngine.init();
    audioEngine.resume();
    audioEngine.startIntro();

    const cinematic = createIntroCinematic(containerRef.current, {
      onPhaseChange: (p) => setPhase(p),
      onNarration: (text) => setNarration(text),
      onMission: (show) => setShowMission(show),
      onProgress: (prog) => setProgress(prog),
      onComplete: () => finish(),
    });

    cinematic.start();

    const handleResize = () => {
      if (containerRef.current) {
        cinematic.resize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    // Skip on any key
    const handleKey = (e: KeyboardEvent) => {
      e.preventDefault();
      finish();
    };
    window.addEventListener('keydown', handleKey);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKey);
      audioEngine.stopIntro();
      cinematic.destroy();
    };
  }, [finish]);

  const handleSkip = () => finish();

  const isTransition = phase === 'transition';
  const isClimax = phase === 'climax';

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black select-none">
      <div ref={containerRef} className="absolute inset-0" />

      {/* Cinematic letterbox bars */}
      <div className="absolute top-0 left-0 right-0 h-[8vh] bg-black z-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-[8vh] bg-black z-20 pointer-events-none" />

      {/* Vignette overlay for cinematic depth */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)',
        }}
      />

      {/* Scanline overlay for sci-fi feel */}
      <div
        className="absolute inset-0 z-10 pointer-events-none opacity-20"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,229,255,0.03) 2px, rgba(0,229,255,0.03) 4px)',
        }}
      />

      {/* Narration text — one sentence at a time (Acts 1) */}
      {phase === 'narration' && narration && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
          <div
            key={narration}
            className="text-center px-8 max-w-3xl"
            style={{ animation: 'fade-in 1s ease-out forwards' }}
          >
            <p
              className="font-display text-2xl md:text-4xl font-bold tracking-[0.15em]"
              style={{
                color: narration.startsWith('YEAR') ? '#00e5ff' : '#c8e6ff',
                textShadow: '0 0 20px rgba(0,229,255,0.6), 0 0 40px rgba(0,229,255,0.3)',
                lineHeight: 1.4,
              }}
            >
              {narration}
            </p>
          </div>
        </div>
      )}

      {/* Escape phase — intensity text */}
      {phase === 'escape' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
          <div
            className="text-center"
            style={{ animation: 'fade-in 0.5s ease-out forwards' }}
          >
            <p
              className="font-display text-3xl md:text-5xl font-black tracking-[0.3em]"
              style={{
                color: '#ff1744',
                textShadow: '0 0 20px rgba(255,23,68,0.8), 0 0 40px rgba(255,23,68,0.4)',
                animation: 'flicker 0.3s ease-in-out infinite',
              }}
            >
              RUN
            </p>
          </div>
        </div>
      )}

      {/* Climax — mission hologram */}
      {isClimax && showMission && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
          <div
            className="text-center px-8"
            style={{ animation: 'fade-in 1.5s ease-out forwards' }}
          >
            <h2
              className="font-display text-4xl md:text-6xl font-black tracking-[0.2em] mb-4"
              style={{
                background: 'linear-gradient(180deg, #00e5ff 0%, #2196f3 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 20px rgba(0,229,255,0.6))',
              }}
            >
              PROJECT AQUA
            </h2>
            <p
              className="font-body text-base md:text-xl text-cyan-200/80 tracking-[0.25em] uppercase mb-6"
              style={{ textShadow: '0 0 10px rgba(0,229,255,0.4)' }}
            >
              Human Survival Protocol Activated
            </p>
            <div className="space-y-1">
              {MISSION_LINES.slice(2).map((line, i) => (
                <p
                  key={i}
                  className="font-body text-sm md:text-lg text-cyan-100/70 tracking-[0.15em]"
                  style={{
                    animation: `fade-in 0.8s ease-out ${i * 0.3}s forwards`,
                    opacity: 0,
                    color: line === 'Save Humanity.' ? '#00ff9c' : undefined,
                    textShadow: line === 'Save Humanity.' ? '0 0 15px rgba(0,255,156,0.5)' : undefined,
                  }}
                >
                  {line}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Transition — fade in HUD hint */}
      {isTransition && (
        <div
          className="absolute inset-0 z-30 flex items-end justify-center pb-[14vh] pointer-events-none"
          style={{ animation: 'fade-in 1s ease-out forwards' }}
        >
          <p className="font-display text-lg md:text-2xl text-cyan-300/80 tracking-[0.4em] uppercase">
            Run. Survive. Save Humanity.
          </p>
        </div>
      )}

      {/* Progress bar */}
      <div className="absolute bottom-[8vh] left-0 right-0 h-0.5 bg-white/10 z-30 pointer-events-none">
        <div
          className="h-full transition-all duration-100"
          style={{
            width: `${progress * 100}%`,
            background: 'linear-gradient(90deg, #00e5ff, #7c4dff, #00ff9c)',
            boxShadow: '0 0 10px rgba(0,229,255,0.5)',
          }}
        />
      </div>

      {/* Skip button */}
      <button
        onClick={handleSkip}
        className="absolute top-[10vh] right-6 z-40 flex items-center gap-2 px-4 py-2 rounded-md bg-black/50 backdrop-blur-sm border border-cyan-500/30 text-cyan-300/70 hover:text-cyan-300 hover:border-cyan-500/60 transition-all duration-300 text-sm font-body tracking-wider uppercase"
      >
        <SkipForward size={16} />
        Skip Intro
      </button>

      {/* Skip hint */}
      <div className="absolute top-[10vh] right-6 z-40 mt-10 text-xs text-cyan-500/40 font-body tracking-widest uppercase pointer-events-none">
        Press any key to skip
      </div>
    </div>
  );
}
