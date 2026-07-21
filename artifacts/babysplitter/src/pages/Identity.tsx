import { useAuth } from '@/hooks/useAuth';
import { useMembers } from '@/hooks/useQueries';
import { useLocation } from 'wouter';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ShieldCheck, ArrowRight, X } from 'lucide-react';

export default function Identity() {
  const { identity, login, loading } = useAuth();
  const { data: members, isLoading } = useMembers();
  const [, setLocation] = useLocation();

  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [mode, setMode] = useState<'create' | 'verify'>('create');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && identity) {
      setLocation('/home');
    }
  }, [identity, loading, setLocation]);

  if (loading || isLoading || identity) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-black">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const presetMembers = members?.filter(m => m.is_preset) || [];

  const handleMemberClick = (name: string) => {
    setSelectedMember(name);
    setPin('');
    setError('');
    
    // Check if this member already has a PIN configured
    const existingPin = localStorage.getItem(`babysplitter_pin_${name}`);
    if (existingPin) {
      setMode('verify');
    } else {
      setMode('create');
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    if (pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }

    const pinKey = `babysplitter_pin_${selectedMember}`;

    if (mode === 'create') {
      // Save new PIN and log in
      localStorage.setItem(pinKey, pin);
      login(selectedMember);
    } else {
      // Verify existing PIN
      const savedPin = localStorage.getItem(pinKey);
      if (savedPin === pin) {
        login(selectedMember);
      } else {
        setError('Incorrect PIN. Try again.');
        setPin('');
      }
    }
  };

  return (
    <div className="min-h-[100dvh] relative overflow-hidden flex flex-col items-center justify-center p-6 bg-black">
      <div className="absolute inset-0 z-0">
        <img src={import.meta.env.BASE_URL + "hero.png"} alt="Background" className="w-full h-full object-cover opacity-40 blur-sm scale-105" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/90" />
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold text-white tracking-tight">BabySplitter</h1>
          <p className="text-white/70 font-medium">Who are you?</p>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full">
          {presetMembers.map((member, i) => (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={member.id}
              onClick={() => handleMemberClick(member.current_name)}
              className="bg-white/10 backdrop-blur-xl border border-white/20 py-6 rounded-3xl flex flex-col items-center justify-center gap-2 hover:bg-white/20 active:scale-95 transition-all shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] group relative"
            >
              <div className="absolute top-3 right-3 text-white/40">
                {localStorage.getItem(`babysplitter_pin_${member.current_name}`) ? (
                  <Lock className="w-3.5 h-3.5 text-primary" />
                ) : null}
              </div>
              <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xl font-bold text-white group-hover:bg-primary group-hover:border-primary transition-colors">
                {member.current_name.charAt(0)}
              </div>
              <span className="text-white font-medium">{member.current_name}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* PIN Modal */}
      <AnimatePresence>
        {selectedMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xs bg-zinc-900 border border-white/10 rounded-3xl p-6 shadow-2xl relative flex flex-col gap-6"
            >
              <button
                onClick={() => setSelectedMember(null)}
                className="absolute top-4 right-4 text-white/50 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center text-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
                  {mode === 'create' ? <ShieldCheck className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                </div>
                <h2 className="text-xl font-bold text-white">
                  {selectedMember}
                </h2>
                <p className="text-xs text-white/60">
                  {mode === 'create'
                    ? 'Set a 4+ digit PIN to permanently secure your identity profile.'
                    : 'Enter your secure PIN to sign in.'}
                </p>
              </div>

              <form onSubmit={handlePinSubmit} className="flex flex-col gap-4">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter PIN"
                  value={pin}
                  onChange={e => {
                    setPin(e.target.value);
                    setError('');
                  }}
                  autoFocus
                  className="w-full bg-black/50 border border-white/20 rounded-2xl px-4 py-3 text-center text-2xl tracking-widest text-white placeholder:text-white/20 focus:outline-none focus:border-primary transition-colors"
                />

                {error && <p className="text-xs text-red-400 text-center font-medium">{error}</p>}

                <button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 rounded-2xl transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
                >
                  <span>{mode === 'create' ? 'Secure & Sign In' : 'Unlock & Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
