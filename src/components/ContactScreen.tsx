import { useState } from 'react';
import { ChevronLeft, Mail, Send, User, MessageSquare } from 'lucide-react';
import { audioEngine } from '../game/audio';
import { useSettings } from '../stores/settings';

interface ContactScreenProps {
  onBack: () => void;
}

export function ContactScreen({ onBack }: ContactScreenProps) {
  const { settings } = useSettings();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    audioEngine.playSound('uiClick');
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setName('');
      setEmail('');
      setMessage('');
    }, 3000);
  };

  return (
    <div className="relative w-full h-screen overflow-y-auto" style={{ background: settings.theme === 'light' ? '#e8f0f8' : '#050a14' }}>
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 50% 30%, rgba(0,229,255,0.05) 0%, transparent 60%)'
      }} />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => { audioEngine.playSound('uiClick'); onBack(); }} className="btn-secondary flex items-center gap-2">
            <ChevronLeft size={20} /> Back
          </button>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-cyan-400 neon-text tracking-wider">
            CONTACT
          </h2>
        </div>

        <div className="hud-panel p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail size={24} className="text-cyan-400" />
            <h3 className="font-display text-lg font-bold text-cyan-300 tracking-wider">SEND A TRANSMISSION</h3>
          </div>

          {sent ? (
            <div className="text-center py-8 animate-scale-in">
              <Send size={40} className="text-green-400 mx-auto mb-3" style={{ filter: 'drop-shadow(0 0 10px #00ff9c)' }} />
              <p className="font-display text-xl text-green-400 tracking-widest">TRANSMISSION SENT</p>
              <p className="text-cyan-200/50 mt-2">Your message has been received.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-cyan-300/70 mb-2 font-semibold uppercase tracking-wider">
                  <User size={14} className="inline mr-1" /> Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded bg-black/30 border border-cyan-500/30 text-cyan-100 focus:border-cyan-400 focus:outline-none focus:shadow-glow transition-all"
                  style={{ boxShadow: '0 0 0 rgba(0,229,255,0)' }}
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label className="block text-sm text-cyan-300/70 mb-2 font-semibold uppercase tracking-wider">
                  <Mail size={14} className="inline mr-1" /> Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded bg-black/30 border border-cyan-500/30 text-cyan-100 focus:border-cyan-400 focus:outline-none transition-all"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label className="block text-sm text-cyan-300/70 mb-2 font-semibold uppercase tracking-wider">
                  <MessageSquare size={14} className="inline mr-1" /> Message
                </label>
                <textarea
                  required
                  rows={5}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="w-full px-4 py-3 rounded bg-black/30 border border-cyan-500/30 text-cyan-100 focus:border-cyan-400 focus:outline-none transition-all resize-none"
                  placeholder="Enter your message"
                />
              </div>

              <button type="submit" className="btn-primary w-full animate-pulse-glow flex items-center justify-center gap-2">
                <Send size={20} /> Send Transmission
              </button>
            </form>
          )}
        </div>

        <div className="mt-4 hud-panel p-4 text-center text-sm text-cyan-300/40">
          <p>Project Aqua: 2085 — An Original Sci-Fi Infinite Runner</p>
        </div>
      </div>
    </div>
  );
}
