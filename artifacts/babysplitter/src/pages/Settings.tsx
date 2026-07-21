import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useExpenses, useMembers } from '@/hooks/useQueries';
import { useMutations } from '@/hooks/useMutations';
import { useLocation } from 'wouter';
import { Shield, KeyRound, CheckCircle2, AlertCircle, TrendingUp, Calendar, Users, Info, UserPlus, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Settings() {
  const { identity } = useAuth();
  const { data: expenses } = useExpenses();
  const { data: members } = useMembers();
  const { addMember } = useMutations();
  const [, setLocation] = useLocation();

  const [showPinModal, setShowPinModal] = useState(false);
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New member state
  const [newMemberName, setNewMemberName] = useState('');
  const [memberMessage, setMemberMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Compute graph data with 7-day filter and smart fallback to full period
  const chartData = useMemo(() => {
    const list = expenses || [];
    if (list.length === 0) return { data: [], label: 'No Expenses Yet', isFullPeriod: false };

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let recent = list.filter(e => new Date(e.expense_date) >= sevenDaysAgo);
    let isFullPeriod = false;

    if (recent.length === 0) {
      recent = list;
      isFullPeriod = true;
    }

    recent.sort((a, b) => new Date(a.expense_date).getTime() - new Date(b.expense_date).getTime());

    const points = recent.map(e => ({
      date: new Date(e.expense_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      amount: Number(e.amount || 0)
    }));

    return {
      data: points,
      label: isFullPeriod ? 'Full Period Overview' : 'Last 7 Days',
      isFullPeriod
    };
  }, [expenses]);

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
    setTimeout(() => {
      setShowPinModal(false);
      setStatusMessage(null);
    }, 1500);
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    addMember.mutate(newMemberName.trim(), {
      onSuccess: () => {
        setMemberMessage({ type: 'success', text: `Added "${newMemberName.trim()}" as permanent member!` });
        setNewMemberName('');
        setTimeout(() => setMemberMessage(null), 3000);
      },
      onError: (err: any) => {
        setMemberMessage({ type: 'error', text: err?.message || 'Failed to add member.' });
      }
    });
  };

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-32 p-6 max-w-md mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        {(() => {
          const metaVersion = document.querySelector("meta[name='app-version']")?.getAttribute("content");
          return <span className="text-xs bg-white/10 px-3 py-1 rounded-full text-white/70 font-medium">BabySplitter {metaVersion || 'v3.7'}</span>;
        })()}
      </div>

      {/* Identity Card with collapsible Change PIN */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
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
            className="text-xs bg-red-500/25 hover:bg-red-500/35 text-red-300 border border-red-500/30 px-3.5 py-2 rounded-xl font-semibold transition-colors"
          >
            Switch Profile
          </button>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <button
            onClick={() => setShowPinModal(!showPinModal)}
            className="text-xs text-primary font-semibold flex items-center gap-1.5 hover:underline"
          >
            <Shield className="w-4 h-4" />
            <span>{showPinModal ? 'Hide PIN Security' : 'Manage Security PIN'}</span>
          </button>
          <span className="text-[10px] text-white/40">Secured Identity</span>
        </div>

        <AnimatePresence>
          {showPinModal && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handlePinUpdate}
              className="flex flex-col gap-3 pt-2 border-t border-white/10 overflow-hidden"
            >
              <div>
                <label className="text-xs text-white/60 font-medium mb-1 block">Current PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter current PIN"
                  value={currentPinInput}
                  onChange={e => setCurrentPinInput(e.target.value)}
                  className="w-full bg-black/50 border border-white/20 rounded-2xl px-3 py-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div>
                <label className="text-xs text-white/60 font-medium mb-1 block">New PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter new PIN (4+ digits)"
                  value={newPinInput}
                  onChange={e => setNewPinInput(e.target.value)}
                  className="w-full bg-black/50 border border-white/20 rounded-2xl px-3 py-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {statusMessage && (
                <div className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-medium ${
                  statusMessage.type === 'success' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}>
                  {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{statusMessage.text}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 rounded-xl transition-all shadow-md shadow-primary/25 flex items-center justify-center gap-2 text-xs"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Update Security PIN</span>
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {/* Animated Expense Statistics Line Graph Card */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-base">Expense Statistics</h2>
              <p className="text-xs text-white/50 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {chartData.label}
              </p>
            </div>
          </div>
        </div>

        <div className="w-full h-36 bg-black/40 border border-white/10 rounded-2xl p-3 flex flex-col justify-end relative overflow-hidden">
          {chartData.data.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-white/40 font-medium">
              No expense records found
            </div>
          ) : (
            <>
              <div className="absolute inset-x-3 top-3 bottom-8 flex flex-col justify-between pointer-events-none opacity-20">
                <div className="border-b border-white/20 w-full" />
                <div className="border-b border-white/20 w-full" />
                <div className="border-b border-white/20 w-full" />
              </div>

              <div className="w-full h-24 relative flex items-end">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 100 50" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary, #6366f1)" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="var(--primary, #6366f1)" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {(() => {
                    const max = Math.max(...chartData.data.map(d => d.amount), 1);
                    const pts = chartData.data.map((d, i) => {
                      const x = chartData.data.length === 1 ? 50 : (i / (chartData.data.length - 1)) * 100;
                      const y = 45 - (d.amount / max) * 40;
                      return { x, y };
                    });

                    const pathString = pts.reduce((acc, p, idx) => idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, '');
                    const areaString = `${pathString} L 100 50 L 0 50 Z`;

                    return (
                      <>
                        <motion.path
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.8 }}
                          d={areaString}
                          fill="url(#lineGradient)"
                        />
                        <motion.path
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 1, ease: "easeInOut" }}
                          d={pathString}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="text-primary"
                        />
                        {pts.map((p, idx) => (
                          <motion.circle
                            key={idx}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: idx * 0.1, duration: 0.3 }}
                            cx={p.x}
                            cy={p.y}
                            r="2"
                            className="fill-primary stroke-white stroke-1"
                          />
                        ))}
                      </>
                    );
                  })()}
                </svg>
              </div>

              <div className="flex justify-between text-[10px] text-white/50 px-1 mt-1 font-medium">
                <span>{chartData.data[0]?.date}</span>
                <span>{chartData.data[chartData.data.length - 1]?.date}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Project Members Card with Add Permanent Member Feature */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-base">Project Members</h2>
            <p className="text-xs text-white/50">{members?.length || 0} active participants</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {members?.map(m => (
            <span key={m.id} className="text-xs bg-white/10 px-3 py-1.5 rounded-xl font-medium text-white/90">
              {m.current_name} {m.is_preset && '★'}
            </span>
          ))}
        </div>

        {/* Add Permanent Member Form */}
        <form onSubmit={handleAddMember} className="flex flex-col gap-2.5 pt-3 border-t border-white/10 mt-1">
          <label className="text-xs text-white/60 font-medium">Add Permanent Member</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Member name"
              value={newMemberName}
              onChange={e => setNewMemberName(e.target.value)}
              className="flex-1 bg-black/50 border border-white/20 rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-primary transition-colors"
            />
            <button
              type="submit"
              disabled={addMember.isPending || !newMemberName.trim()}
              className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0"
            >
              {addMember.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
              <span>Add</span>
            </button>
          </div>

          {memberMessage && (
            <div className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-medium mt-1 ${
              memberMessage.type === 'success' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
            }`}>
              {memberMessage.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
              <span>{memberMessage.text}</span>
            </div>
          )}
        </form>
      </div>

      {/* App Info Card */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
            <Info className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-base">BabySplitter Engine</h2>
            <p className="text-xs text-white/50">Secure split & expense tracker</p>
          </div>
        </div>
        <span className="text-xs bg-white/10 px-3 py-1 rounded-full text-white/70 font-medium">v3.7</span>
      </div>
    </div>
  );
}
