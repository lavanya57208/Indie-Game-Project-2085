import { useEffect, useRef, useState } from 'react';
import { GameEngine, GameStats } from '../game/GameEngine';
import { CharacterId } from '../game/constants';
import { HUD } from './HUD';
import { PauseScreen } from './PauseScreen';
import { GameOverScreen } from './GameOverScreen';
import { VictoryScreen } from './VictoryScreen';
import { useSettings } from '../stores/settings';

interface GameScreenProps {
  character: CharacterId;
  onExit: () => void;
  onGameOver: (stats: GameStats) => void;
}

export function GameScreen({ character, onExit, onGameOver }: GameScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [stats, setStats] = useState<GameStats | null>(null);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);
  const { settings } = useSettings();

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new GameEngine(containerRef.current, character, {
      onStatsUpdate: (s) => setStats(s),
      onGameOver: (s) => { setStats(s); setGameOver(true); onGameOver(s); },
      onVictory: (s) => { setStats(s); setVictory(true); },
      onMapChange: () => {},
      onWeatherChange: () => {},
      onChaseStart: () => {},
      onChaseEnd: () => {},
      onCollect: () => {},
      onCrash: () => {},
    });

    engineRef.current = engine;
    engine.setQuality(settings.graphics);
    engine.setCameraShake(settings.cameraShake);
    engine.setWeatherEnabled(settings.dynamicWeather);
    engine.setDayNightEnabled(settings.dayNight);
    engine.setMotionBlur(settings.motionBlur);
    engine.start();

    // Pause hotkey
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyP' || e.code === 'Escape') {
        setPaused(p => {
          if (p) { engine.resume(); return false; }
          else { engine.pause(); return true; }
        });
      }
      if (e.code === 'KeyR') {
        setGameOver(false);
        setVictory(false);
        setPaused(false);
        engine.restart();
      }
    };
    window.addEventListener('keydown', handleKey);

    return () => {
      window.removeEventListener('keydown', handleKey);
      engine.destroy();
      engineRef.current = null;
    };
  }, [character]);

  const handlePause = () => {
    if (gameOver || victory) return;
    setPaused(p => {
      if (p) { engineRef.current?.resume(); return false; }
      else { engineRef.current?.pause(); return true; }
    });
  };

  const handleResume = () => {
    setPaused(false);
    engineRef.current?.resume();
  };

  const handleRestart = () => {
    setGameOver(false);
    setVictory(false);
    setPaused(false);
    engineRef.current?.restart();
  };

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ background: '#050a14' }}>
      <div ref={containerRef} className="absolute inset-0" />

      {stats && !gameOver && !victory && (
        <HUD
          stats={stats}
          onPause={handlePause}
          onRestart={handleRestart}
        />
      )}

      {paused && !gameOver && !victory && (
        <PauseScreen
          onResume={handleResume}
          onRestart={handleRestart}
          onExit={onExit}
        />
      )}

      {gameOver && stats && (
        <GameOverScreen
          stats={stats}
          onRestart={handleRestart}
          onExit={onExit}
        />
      )}

      {victory && stats && (
        <VictoryScreen
          stats={stats}
          onRestart={handleRestart}
          onExit={onExit}
        />
      )}
    </div>
  );
}
