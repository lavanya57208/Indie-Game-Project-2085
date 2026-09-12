import { useState } from 'react';
import { SettingsProvider } from './stores/settings';
import { HomeScreen, ScreenName } from './components/HomeScreen';
import { CharacterSelection } from './components/CharacterSelection';
import { GameScreen } from './components/GameScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { LeaderboardScreen } from './components/LeaderboardScreen';
import { AboutScreen } from './components/AboutScreen';
import { ContactScreen } from './components/ContactScreen';
import { GalleryScreen } from './components/GalleryScreen';
import { IntroScreen } from './components/IntroScreen';
import { GameStats } from './game/GameEngine';
import { CharacterId } from './game/constants';
import { supabase } from './lib/supabase';

function AppInner() {
  const [showIntro, setShowIntro] = useState(() => !sessionStorage.getItem('aqua_intro_seen'));
  const [screen, setScreen] = useState<ScreenName>('home');
  const [character, setCharacter] = useState<CharacterId | null>(null);

  const handleIntroComplete = () => {
    sessionStorage.setItem('aqua_intro_seen', '1');
    setShowIntro(false);
  };

  const handleNavigate = (s: ScreenName) => {
    setScreen(s);
  };

  const handleCharacterSelect = (c: CharacterId) => {
    setCharacter(c);
    setScreen('game');
  };

  const handleGameOver = async (stats: GameStats) => {
    const name = localStorage.getItem('aqua_player_name') || 'Anonymous Runner';
    const score = Math.round(stats.distance + stats.waterDrops * 5 + stats.aiChips * 10);
    try {
      await supabase.from('leaderboard').insert({
        player_name: name,
        score,
        distance: stats.distance,
        water_drops: stats.waterDrops,
        ai_chips: stats.aiChips,
        completion_time: Math.round(stats.timeAlive),
      });
    } catch {
      // Silently fail — leaderboard is non-critical
    }
  };

  const renderScreen = () => {
    switch (screen) {
      case 'home': return <HomeScreen onNavigate={handleNavigate} />;
      case 'character': return <CharacterSelection onSelect={handleCharacterSelect} onBack={() => setScreen('home')} />;
      case 'game': return character ? <GameScreen character={character} onExit={() => setScreen('home')} onGameOver={handleGameOver} /> : <HomeScreen onNavigate={handleNavigate} />;
      case 'gallery': return <GalleryScreen onBack={() => setScreen('home')} />;
      case 'leaderboard': return <LeaderboardScreen onBack={() => setScreen('home')} />;
      case 'settings': return <SettingsScreen onBack={() => setScreen('home')} />;
      case 'about': return <AboutScreen onBack={() => setScreen('home')} />;
      case 'contact': return <ContactScreen onBack={() => setScreen('home')} />;
      default: return <HomeScreen onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="w-full h-screen overflow-hidden">
      {showIntro ? <IntroScreen onComplete={handleIntroComplete} /> : renderScreen()}
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <AppInner />
    </SettingsProvider>
  );
}
