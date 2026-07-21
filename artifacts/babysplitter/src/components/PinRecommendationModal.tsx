import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMembers } from '@/hooks/useQueries';
import { useLocation } from 'wouter';
import { ShieldAlert, ArrowRight, X } from 'lucide-react';

export default function PinRecommendationModal() {
  const { user } = useAuth();
  const { data: members } = useMembers();
  const [, setLocation] = useLocation();
  const [dismissed, setDismissed] = useState(false);

  // Find the currently logged in member profile
  const currentMember = members?.find(
    (m: any) => (m.current_name || m.name) === user
  );

  // Check if current PIN is '1234'
  const isDefaultPin = currentMember && (currentMember.pin || '1234') === '1234';

  if (!isDefaultPin || dismissed) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 text-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
        <button 
          onClick={() => setDismissed(true)}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 p-1"
          aria-label="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-bold tracking-tight">Security Recommendation</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            You are currently using the default PIN (<code className="text-amber-400 font-mono">1234</code>). Please set a personal PIN to secure your profile.
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={() => {
              setDismissed(true);
              setLocation('/settings');
            }}
            className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-sky-500/20 transition-colors"
          >
            <span>Change PIN in Settings</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setDismissed(true)}
            className="w-full bg-zinc-800/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 font-medium py-2.5 rounded-xl text-xs transition-colors"
          >
            Remind Me Later
          </button>
        </div>
      </div>
    </div>
  );
}
