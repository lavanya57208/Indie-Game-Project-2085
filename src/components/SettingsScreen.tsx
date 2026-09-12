import { ChevronLeft, Monitor, Sun, Moon, Volume2, Gamepad2, Sliders } from 'lucide-react';
import { useSettings } from '../stores/settings';
import { audioEngine } from '../game/audio';
import { GraphicsQuality } from '../game/constants';

interface SettingsScreenProps {
  onBack: () => void;
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { settings, updateSettings } = useSettings();

  return (
    <div className="relative w-full h-screen overflow-y-auto" style={{ background: settings.theme === 'light' ? '#e8f0f8' : '#050a14' }}>
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 50% 30%, rgba(0,229,255,0.05) 0%, transparent 60%)'
      }} />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => { audioEngine.playSound('uiClick'); onBack(); }} className="btn-secondary flex items-center gap-2">
            <ChevronLeft size={20} /> Back
          </button>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-cyan-400 neon-text tracking-wider">
            SETTINGS
          </h2>
        </div>

        <div className="space-y-4">
          {/* Graphics Quality */}
          <SettingsCard icon={Monitor} title="Graphics Quality">
            <div className="grid grid-cols-4 gap-2">
              {(['low', 'medium', 'high', 'ultra'] as GraphicsQuality[]).map(q => (
                <button
                  key={q}
                  onClick={() => { audioEngine.playSound('uiClick'); updateSettings({ graphics: q }); }}
                  className={`py-2 px-3 rounded text-sm font-semibold uppercase tracking-wider transition-all ${settings.graphics === q ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {q}
                </button>
              ))}
            </div>
          </SettingsCard>

          {/* Theme */}
          <SettingsCard icon={settings.theme === 'dark' ? Moon : Sun} title="Theme">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { audioEngine.playSound('uiClick'); updateSettings({ theme: 'dark' }); }}
                className={`py-2 px-4 rounded flex items-center justify-center gap-2 font-semibold uppercase tracking-wider transition-all ${settings.theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
              >
                <Moon size={18} /> Dark Mode
              </button>
              <button
                onClick={() => { audioEngine.playSound('uiClick'); updateSettings({ theme: 'light' }); }}
                className={`py-2 px-4 rounded flex items-center justify-center gap-2 font-semibold uppercase tracking-wider transition-all ${settings.theme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
              >
                <Sun size={18} /> Light Mode
              </button>
            </div>
          </SettingsCard>

          {/* Audio */}
          <SettingsCard icon={Volume2} title="Audio">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-cyan-300 font-semibold">Music Volume</span>
                  <span className="text-cyan-400 font-bold">{Math.round(settings.musicVolume * 100)}%</span>
                </div>
                <input
                  type="range" min={0} max={1} step={0.05}
                  value={settings.musicVolume}
                  onChange={e => { updateSettings({ musicVolume: parseFloat(e.target.value) }); audioEngine.setMusicVolume(parseFloat(e.target.value)); }}
                  className="w-full"
                />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-cyan-300 font-semibold">Sound Effects</span>
                  <span className="text-cyan-400 font-bold">{Math.round(settings.sfxVolume * 100)}%</span>
                </div>
                <input
                  type="range" min={0} max={1} step={0.05}
                  value={settings.sfxVolume}
                  onChange={e => { updateSettings({ sfxVolume: parseFloat(e.target.value) }); audioEngine.setSfxVolume(parseFloat(e.target.value)); }}
                  className="w-full"
                />
              </div>
            </div>
          </SettingsCard>

          {/* Gameplay */}
          <SettingsCard icon={Sliders} title="Gameplay">
            <div className="space-y-3">
              <Toggle label="Dynamic Weather" checked={settings.dynamicWeather} onChange={v => updateSettings({ dynamicWeather: v })} />
              <Toggle label="Dynamic Day/Night" checked={settings.dayNight} onChange={v => updateSettings({ dayNight: v })} />
              <Toggle label="Camera Shake" checked={settings.cameraShake} onChange={v => updateSettings({ cameraShake: v })} />
              <Toggle label="Motion Blur" checked={settings.motionBlur} onChange={v => updateSettings({ motionBlur: v })} />
            </div>
          </SettingsCard>

          {/* Controls */}
          <SettingsCard icon={Gamepad2} title="Controls">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <ControlRow keys="W / ↑" action="Jump" />
                <ControlRow keys="S / ↓" action="Slide" />
                <ControlRow keys="A / ←" action="Move Left" />
                <ControlRow keys="D / →" action="Move Right" />
                <ControlRow keys="Q / Shift" action="Ability" />
                <ControlRow keys="P / Esc" action="Pause" />
                <ControlRow keys="R" action="Restart" />
                <ControlRow keys="Touch" action="Swipe / Tap" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-cyan-300 font-semibold">Sensitivity</span>
                  <span className="text-cyan-400 font-bold">{Math.round(settings.sensitivity * 100)}%</span>
                </div>
                <input
                  type="range" min={0.5} max={2} step={0.1}
                  value={settings.sensitivity}
                  onChange={e => updateSettings({ sensitivity: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>
          </SettingsCard>
        </div>
      </div>
    </div>
  );
}

function SettingsCard({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="hud-panel p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={20} className="text-cyan-400" />
        <h3 className="font-display text-lg font-bold text-cyan-300 tracking-wider uppercase">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-cyan-200 font-semibold">{label}</span>
      <button
        onClick={() => { audioEngine.playSound('uiClick'); onChange(!checked); }}
        className="relative w-12 h-6 rounded-full transition-all"
        style={{ background: checked ? '#00e5ff44' : '#333', border: `1px solid ${checked ? '#00e5ff' : '#555'}` }}
      >
        <div
          className="absolute top-0.5 w-5 h-5 rounded-full transition-all"
          style={{ left: checked ? '26px' : '2px', background: checked ? '#00e5ff' : '#888', boxShadow: checked ? '0 0 8px #00e5ff' : 'none' }}
        />
      </button>
    </div>
  );
}

function ControlRow({ keys, action }: { keys: string; action: string }) {
  return (
    <div className="flex items-center justify-between hud-panel px-3 py-2">
      <span className="text-cyan-300/70">{action}</span>
      <kbd className="px-2 py-1 rounded text-xs font-mono text-cyan-400" style={{ background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.3)' }}>{keys}</kbd>
    </div>
  );
}
