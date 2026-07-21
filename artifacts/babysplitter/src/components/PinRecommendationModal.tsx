import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMembers } from '@/hooks/useQueries';
import { useLocation } from 'wouter';
import { ShieldAlert, ArrowRight, X } from 'lucide-react';

export function PinRecommendationModal() {
  const { identity } = useAuth();
  const { data: members } = useMembers();
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!identity || !members) return;

    const currentMember = members.find(
      (m: any) => (m.current_name || m.name) === identity
    );

    const dismissed = sessionStorage.getItem(`dismissed_pin_prompt_${identity}`);
    const pin = currentMember?.pin || '1234';

    if (pin === '1234' && !dismissed) {
      setIsOpen(true);
    }
  }, [identity, members]);

  if (!isOpen) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(`dismissed_pin_prompt_${identity}`, 'true');
    setIsOpen(false);
  };

  const handleGoToSettings = () => {
    handleDismiss();
    setLocation('/settings');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-amber-500/30 rounded-3xl p-6 max-w-xs w-full shadow-2xl flex flex-col gap-4 relative text-white">
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <div className="text-center flex flex-col gap-1">
          <h3 className="font-bold text-base">Security Recommendation</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            You are currently using the default PIN (<strong className="text-zinc-200 font-mono">1234</strong>). We strongly recommend setting a custom PIN in Settings.
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={handleGoToSettings}
            className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors shadow-md shadow-amber-500/20"
          >
            <span>Change PIN in Settings</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleDismiss}
            className="w-full bg-zinc-800/80 hover:bg-zinc-800 text-zinc-400 font-medium py-2.5 rounded-xl text-xs transition-colors"
          >
            Remind Me Later
          </button>
        </div>
      </div>
    </div>
  );
}
