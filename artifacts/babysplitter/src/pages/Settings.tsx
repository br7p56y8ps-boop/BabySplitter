import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { Shield, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Settings() {
  const { identity } = useAuth();
  const [, setLocation] = useLocation();

  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handlePinUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identity) return;

    const pinKey = `babysplitter_pin_${identity}`;
    const savedPin = localStorage.getItem(pinKey);

    if (savedPin && savedPin !== currentPinInput) {
      setStatusMessage({ type: 'error', text: 'Current PIN is incorrect.' });
      return;
    }

    if (newPinInput.length < 4) {
      setStatusMessage({ type: 'error', text: 'New PIN must be at least 4 digits.' });
      return;
    }

    localStorage.setItem(pinKey, newPinInput);
    setStatusMessage({ type: 'success', text: 'Security PIN updated successfully!' });
    setCurrentPinInput('');
    setNewPinInput('');
  };

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-24 p-6 max-w-md mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        {(() => {
          const metaVersion = document.querySelector("meta[name='app-version']")?.getAttribute("content");
          return <span className="text-xs bg-white/10 px-3 py-1 rounded-full text-white/70 font-medium">BabySplitter {metaVersion || 'v3.7'}</span>;
        })()}
      </div>

      {/* Identity Card */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-lg">
            {identity?.charAt(0)}
          </div>
          <div>
            <p className="text-xs text-white/50 font-medium">Logged in as</p>
            <p className="text-lg font-bold">{identity}</p>
          </div>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem('babysplitter_identity');
            setLocation('/');
          }}
          className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 px-3.5 py-2 rounded-xl font-semibold transition-colors"
        >
          Switch Profile
        </button>
      </div>

      {/* PIN Security Management */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-base">Identity PIN Security</h2>
            <p className="text-xs text-white/50">Manage your passcode lock</p>
          </div>
        </div>

        <form onSubmit={handlePinUpdate} className="flex flex-col gap-3 mt-2">
          <div>
            <label className="text-xs text-white/60 font-medium mb-1.5 block">Current PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter current PIN"
              value={currentPinInput}
              onChange={e => setCurrentPinInput(e.target.value)}
              className="w-full bg-black/50 border border-white/20 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-white/60 font-medium mb-1.5 block">New PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter new PIN (4+ digits)"
              value={newPinInput}
              onChange={e => setNewPinInput(e.target.value)}
              className="w-full bg-black/50 border border-white/20 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {statusMessage && (
            <div className={`flex items-center gap-2 p-3 rounded-2xl text-xs font-medium ${
              statusMessage.type === 'success' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
            }`}>
              {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full mt-2 bg-primary hover:bg-primary/90 text-white font-semibold py-3 rounded-2xl transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2 text-sm"
          >
            <KeyRound className="w-4 h-4" />
            <span>Update PIN</span>
          </button>
        </form>
      </div>
    </div>
  );
}
