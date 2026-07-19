import { useAuth } from '@/hooks/useAuth';
import { useMembers } from '@/hooks/useQueries';
import { useLocation } from 'wouter';
import { useEffect } from 'react';
import { motion } from 'framer-motion';

export default function Identity() {
  const { identity, login, loading } = useAuth();
  const { data: members, isLoading } = useMembers();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && identity) {
      setLocation('/home');
    }
  }, [identity, loading, setLocation]);

  if (loading || isLoading || identity) {
    return <div className="min-h-[100dvh] flex items-center justify-center bg-black"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  const presetMembers = members?.filter(m => m.is_preset) || [];

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
              onClick={() => login(member.current_name)}
              className="bg-white/10 backdrop-blur-xl border border-white/20 py-6 rounded-3xl flex flex-col items-center justify-center gap-2 hover:bg-white/20 active:scale-95 transition-all shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] group"
            >
              <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xl font-bold text-white group-hover:bg-primary group-hover:border-primary transition-colors">
                {member.current_name.charAt(0)}
              </div>
              <span className="text-white font-medium">{member.current_name}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
