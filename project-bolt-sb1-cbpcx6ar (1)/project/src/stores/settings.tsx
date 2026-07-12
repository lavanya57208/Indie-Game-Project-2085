import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GraphicsQuality, ThemeMode } from '../game/constants';

export interface GameSettings {
  graphics: GraphicsQuality;
  theme: ThemeMode;
  musicVolume: number;
  sfxVolume: number;
  dynamicWeather: boolean;
  dayNight: boolean;
  cameraShake: boolean;
  motionBlur: boolean;
  sensitivity: number;
}

const DEFAULT_SETTINGS: GameSettings = {
  graphics: 'high',
  theme: 'dark',
  musicVolume: 0.4,
  sfxVolume: 0.6,
  dynamicWeather: true,
  dayNight: true,
  cameraShake: true,
  motionBlur: true,
  sensitivity: 1,
};

interface SettingsContextType {
  settings: GameSettings;
  updateSettings: (partial: Partial<GameSettings>) => void;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<GameSettings>(() => {
    const stored = localStorage.getItem('aqua_settings');
    if (stored) {
      try { return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }; } catch { return DEFAULT_SETTINGS; }
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem('aqua_settings', JSON.stringify(settings));
    document.body.className = settings.theme === 'light' ? 'theme-light' : '';
  }, [settings]);

  const updateSettings = (partial: Partial<GameSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
