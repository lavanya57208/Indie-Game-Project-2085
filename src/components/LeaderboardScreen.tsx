import { useEffect, useState } from 'react';
import { ChevronLeft, Trophy, Droplet, Cpu, Gauge } from 'lucide-react';
import { supabase, LeaderboardEntry } from '../lib/supabase';
import { audioEngine } from '../game/audio';
import { useSettings } from '../stores/settings';

interface LeaderboardScreenProps {
  onBack: () => void;
}

export function LeaderboardScreen({ onBack }: LeaderboardScreenProps) {
  const { settings } = useSettings();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .order('score', { ascending: false })
        .limit(20);
      if (!error && data) setEntries(data as LeaderboardEntry[]);
      setLoading(false);
    })();
  }, []);

  const best = entries[0] || { distance: 0, water_drops: 0, ai_chips: 0, completion_time: 0, score: 0, player_name: '—' } as LeaderboardEntry;

  return (
    <div className="relative w-full h-screen overflow-y-auto" style={{ background: settings.theme === 'light' ? '#e8f0f8' : '#050a14' }}>
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 50% 20%, rgba(0,229,255,0.05) 0%, transparent 60%)'
      }} />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => { audioEngine.playSound('uiClick'); onBack(); }} className="btn-secondary flex items-center gap-2">
            <ChevronLeft size={20} /> Back
          </button>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-cyan-400 neon-text tracking-wider">
            LEADERBOARD
          </h2>
        </div>

        {/* Best stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <BestCard icon={Trophy} label="Highest Score" value={`${best.score}`} color="#ffc400" />
          <BestCard icon={Gauge} label="Longest Distance" value={`${best.distance}m`} color="#00e5ff" />
          <BestCard icon={Droplet} label="Water Drops" value={`${best.water_drops}`} color="#4fc3f7" />
          <BestCard icon={Cpu} label="AI Chips" value={`${best.ai_chips}`} color="#00ff9c" />
        </div>

        {/* Table */}
        <div className="hud-panel p-4">
          {loading ? (
            <div className="text-center py-8 text-cyan-400/50 font-display tracking-widest">LOADING...</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-cyan-400/50">
              <Trophy size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-display tracking-widest">NO RECORDS YET</p>
              <p className="text-sm mt-2">Play the game to set the first record!</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs uppercase tracking-wider text-cyan-400/50 font-semibold px-3 pb-2 border-b border-cyan-500/20">
                <div className="col-span-1">#</div>
                <div className="col-span-3">Name</div>
                <div className="col-span-2 text-right">Score</div>
                <div className="col-span-2 text-right">Distance</div>
                <div className="col-span-2 text-right">Water</div>
                <div className="col-span-2 text-right">Chips</div>
              </div>
              {entries.map((e, i) => (
                <div
                  key={e.id}
                  className="grid grid-cols-12 gap-2 px-3 py-2 rounded items-center transition-all hover:bg-cyan-500/10"
                  style={{ background: i === 0 ? 'rgba(255,196,0,0.1)' : i === 1 ? 'rgba(192,192,192,0.05)' : i === 2 ? 'rgba(205,127,50,0.05)' : 'transparent' }}
                >
                  <div className="col-span-1 font-display font-bold" style={{ color: i === 0 ? '#ffc400' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#00e5ff80' }}>
                    {i + 1}
                  </div>
                  <div className="col-span-3 font-semibold text-white truncate">{e.player_name}</div>
                  <div className="col-span-2 text-right text-cyan-300 font-bold">{e.score}</div>
                  <div className="col-span-2 text-right text-cyan-200/70">{e.distance}m</div>
                  <div className="col-span-2 text-right text-blue-300/70">{e.water_drops}</div>
                  <div className="col-span-2 text-right text-green-300/70">{e.ai_chips}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BestCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="hud-panel p-4 flex items-center gap-3">
      <Icon size={24} style={{ color }} />
      <div>
        <div className="text-xs text-cyan-300/50 uppercase tracking-wider">{label}</div>
        <div className="text-xl font-bold" style={{ color }}>{value}</div>
      </div>
    </div>
  );
}
