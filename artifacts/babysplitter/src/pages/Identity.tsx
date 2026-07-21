import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMembers } from '@/hooks/useQueries';
import { useLocation } from 'wouter';
import { KeyRound, Shield, RefreshCw } from 'lucide-react';

export default function Identity() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { data: members, isLoading } = useMembers();

  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState('');

  const handleSelectMember = (member: any) => {
    setSelectedMember(member);
    setPinInput('');
    setError('');
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    setError('');

    const actualPin = selectedMember.pin || '1234';
    if (pinInput !== actualPin) {
      setError('Incorrect PIN. Please try again.');
      return;
    }

    login(selectedMember.current_name || selectedMember.name);
    setLocation('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-black text-white flex items-center justify-center p-4">
        <RefreshCw className="w-6 h-6 animate-spin text-sky-400" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-black text-white flex flex-col justify-center p-4 max-w-md mx-auto relative overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center filter blur-2xl opacity-20 scale-125 pointer-events-none"
        style={{ backgroundImage: `url('/icon-192.png')` }}
      />
      <div className="absolute inset-0 bg-black/60 pointer-events-none" />

      <div className="relative z-10 bg-zinc-900/90 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-6 shadow-2xl flex flex-col gap-6">
        <div className="text-center flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Select Profile</h1>
          <p className="text-xs text-zinc-400">Choose who you are to access BabySplitter</p>
        </div>

        {/* Member Selector Buttons */}
        <div className="grid grid-cols-2 gap-3">
          {members?.map((m: any) => {
            const name = m.current_name || m.name;
            const isSelected = selectedMember?.id === m.id;
            return (
              <button
                key={m.id}
                onClick={() => handleSelectMember(m)}
                className={`p-3 rounded-2xl border text-sm font-semibold transition-all ${
                  isSelected
                    ? 'bg-sky-500/20 border-sky-500 text-sky-400'
                    : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-300 hover:border-zinc-500'
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>

        {/* PIN Form */}
        {selectedMember && (
          <form onSubmit={handleVerifyPin} className="border-t border-zinc-800 pt-5 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
              <span>Enter PIN for <strong className="text-white">{selectedMember.current_name || selectedMember.name}</strong></span>
              <KeyRound className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="PIN"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-sky-500 font-mono tracking-widest text-center"
              autoFocus
            />
            {error && <p className="text-xs text-red-400 text-center">{error}</p>}
            <button
              type="submit"
              className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold py-3 rounded-xl text-xs shadow-md shadow-sky-500/20 transition-colors"
            >
              Enter App
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
