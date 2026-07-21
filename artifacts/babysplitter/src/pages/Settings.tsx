import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useExpenses, useMembers } from '@/hooks/useQueries';
import { useMutations } from '@/hooks/useMutations';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, Link } from 'wouter';
import { Shield, KeyRound, CheckCircle2, AlertCircle, Users, UserPlus, RefreshCw, Moon, Sun, ChevronDown, ChevronUp, Home, ArrowLeftRight, MessageSquare, BookOpen, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Settings() {
  const { identity } = useAuth();
  const { data: expenses } = useExpenses();
  const { data: members } = useMembers();
  const { addMember } = useMutations();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Collapsible states
  const [showIdentityDetails, setShowIdentityDetails] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmittingPin, setIsSubmittingPin] = useState(false);

  const [showMembersList, setShowMembersList] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [memberMessage, setMemberMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Current Logged-in Member profile from Supabase
  const currentMember = members?.find(
    (m: any) => (m.current_name || m.name) === identity
  );

  // Theme state synced with current document class
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });

  const toggleTheme = (dark: boolean) => {
    setIsDarkMode(dark);
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Group Spending & All-Time Frequency-based Obesity Breakdown Computation
  const stats = useMemo(() => {
    const list = expenses || [];

    let totalExpended = 0;
    let totalUnsettledAmount = 0;
    let unsettledCount = 0;
    let settledCount = 0;

    const uniqueDatesSet = new Set<string>();
    const dailyCountMap: Record<string, number> = {};
    let earliestDate: Date | null = null;
    let latestDate: Date | null = null;

    list.forEach((e: any) => {
      const rawAmount = e.amount ?? e.total_amount ?? e.cost ?? 0;
      const amt = typeof rawAmount === 'string' ? parseFloat(rawAmount) || 0 : Number(rawAmount || 0);

      totalExpended += amt;

      const isSettled = Boolean(e.is_settled || e.settled || e.status === 'settled');

      if (isSettled) {
        settledCount++;
      } else {
        unsettledCount++;
        totalUnsettledAmount += amt;
      }

      const rawDate = e.created_at || e.date || e.timestamp;
      if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          const dayKey = d.toISOString().split('T')[0];
          uniqueDatesSet.add(dayKey);
          dailyCountMap[dayKey] = (dailyCountMap[dayKey] || 0) + 1;

          if (!earliestDate || d < earliestDate) earliestDate = d;
          if (!latestDate || d > latestDate) latestDate = d;
        }
      }
    });

    const uniqueDaysCount = uniqueDatesSet.size;
    let obesityPercent = 0;

    if (earliestDate && latestDate && uniqueDaysCount > 0) {
      const diffTime = Math.abs((latestDate as Date).getTime() - (earliestDate as Date).getTime());
      const totalSpanDays = Math.max(Math.ceil(diffTime / (1000 * 60 * 60 * 24)), 30);

      const activeRatio = uniqueDaysCount / totalSpanDays;
      let baseScore = (activeRatio / (25 / 30)) * 90;

      const multiMealDays = Object.values(dailyCountMap).filter(count => count >= 2).length;
      const snackBonus = Math.min(multiMealDays * 1.5, 10);

      obesityPercent = Math.min(Math.round(baseScore + snackBonus), 100);
    } else if (list.length > 0) {
      obesityPercent = Math.min(list.length * 3, 90);
    }

    let obesityStatus = 'Light';
    if (obesityPercent >= 90) {
      obesityStatus = 'Severe Obesity';
    } else if (obesityPercent > 60) {
      obesityStatus = 'Chonky';
    } else if (obesityPercent > 30) {
      obesityStatus = 'Gaining';
    }

    return {
      totalExpended,
      totalUnsettledAmount,
      unsettledCount,
      settledCount,
      obesityPercent,
      obesityStatus
    };
  }, [expenses]);

  const handlePinUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identity || !currentMember) {
      setStatusMessage({ type: 'error', text: 'Member profile not loaded.' });
      return;
    }

    const actualPin = currentMember.pin || '1234';

    if (currentPinInput !== actualPin) {
      setStatusMessage({ type: 'error', text: 'Current PIN is incorrect.' });
      return;
    }

    if (newPinInput.length < 4) {
      setStatusMessage({ type: 'error', text: 'New PIN must be at least 4 digits.' });
      return;
    }

    setIsSubmittingPin(true);
    try {
      const { error: updateErr } = await supabase
        .from('members')
        .update({ pin: newPinInput })
        .eq('id', currentMember.id);

      if (updateErr) throw updateErr;

      await queryClient.invalidateQueries({ queryKey: ['members'] });

      setStatusMessage({ type: 'success', text: 'Security PIN saved to Supabase!' });
      setCurrentPinInput('');
      setNewPinInput('');
      setTimeout(() => {
        setShowPinModal(false);
        setStatusMessage(null);
      }, 1500);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to update PIN.' });
    } finally {
      setIsSubmittingPin(false);
    }
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    addMember.mutate(newMemberName.trim(), {
      onSuccess: () => {
        setMemberMessage({ type: 'success', text: `Added "${newMemberName.trim()}" successfully!` });
        setNewMemberName('');
        setTimeout(() => setMemberMessage(null), 3000);
      },
      onError: (err: any) => {
        setMemberMessage({ type: 'error', text: err?.message || 'Failed to add member.' });
      }
    });
  };

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/settle', label: 'Settle', icon: ArrowLeftRight },
    { href: '/chat', label: 'Chat', icon: MessageSquare },
    { href: '/history', label: 'History', icon: BookOpen },
    { href: '/settings', label: 'More', icon: SlidersHorizontal },
  ];

  return (
    <div className="min-h-[100dvh] bg-zinc-50 dark:bg-black text-zinc-900 dark:text-white pb-36 p-4 flex flex-col gap-4 w-full">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      {/* 1. Identity Card */}
      <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800/80 rounded-3xl p-5 flex flex-col gap-3 shadow-sm dark:shadow-none">
        <div
          onClick={() => setShowIdentityDetails(!showIdentityDetails)}
          className="flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 dark:bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400 font-bold text-lg">
              {identity?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <p className="text-[10px] tracking-wider text-zinc-400 dark:text-zinc-500 font-bold uppercase">Identity</p>
              <p className="text-base font-bold">{identity || 'Select Profile'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            {showIdentityDetails ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
          </div>
        </div>

        <AnimatePresence>
          {showIdentityDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-col gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowPinModal(!showPinModal)}
                  className="text-xs text-sky-600 dark:text-sky-400 font-semibold flex items-center gap-1.5 hover:underline"
                >
                  <Shield className="w-4 h-4" />
                  <span>{showPinModal ? 'Hide PIN Manager' : 'Change Security PIN'}</span>
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem('babysplitter_identity');
                    setLocation('/');
                  }}
                  className="text-xs bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 px-3 py-1.5 rounded-xl font-semibold hover:bg-red-500/20 transition-colors"
                >
                  Switch Profile
                </button>
              </div>

              {showPinModal && (
                <form onSubmit={handlePinUpdate} className="flex flex-col gap-2.5 pt-2">
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Current PIN"
                    value={currentPinInput}
                    onChange={e => setCurrentPinInput(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-sky-500"
                  />
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="New PIN (4+ digits)"
                    value={newPinInput}
                    onChange={e => setNewPinInput(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-sky-500"
                  />
                  {statusMessage && (
                    <div className={`flex items-center gap-2 p-2 rounded-xl text-xs ${
                      statusMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'
                    }`}>
                      {statusMessage.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                      <span>{statusMessage.text}</span>
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={isSubmittingPin}
                    className="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-semibold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-sky-500/20"
                  >
                    {isSubmittingPin ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                    <span>Save New PIN</span>
                  </button>
                </form>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2. Group Damage Card */}
      <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800/80 rounded-3xl p-5 flex flex-col gap-4 shadow-sm dark:shadow-none">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] tracking-wider text-zinc-400 dark:text-zinc-500 font-bold uppercase">
              OVERALL ACTIVITY
            </p>
            <h2 className="text-base font-bold opacity-90">Group Damage</h2>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold font-mono">৳{stats.totalExpended.toLocaleString()}</span>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Total Expended</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/80 rounded-2xl p-3 flex flex-col gap-0.5">
            <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500">Unsettled Expenses</span>
            <span className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">{stats.unsettledCount}</span>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/80 rounded-2xl p-3 flex flex-col gap-0.5">
            <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500">Settled Expenses</span>
            <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">{stats.settledCount}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/80 rounded-2xl p-3 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500">Total Unsettled Amount</span>
            <span className="text-xl font-bold font-mono text-sky-600 dark:text-sky-400 mt-2">
              ৳{stats.totalUnsettledAmount.toLocaleString()}
            </span>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/80 rounded-2xl p-3 flex flex-col gap-1.5 justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500">Obesity Bar</span>
              <span className="text-[10px] font-bold text-rose-500 uppercase">{stats.obesityStatus}</span>
            </div>

            <div className="w-full bg-zinc-200 dark:bg-zinc-700/60 rounded-full h-2.5 overflow-hidden my-0.5">
              <div
                className="bg-gradient-to-r from-sky-400 via-amber-400 to-rose-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${stats.obesityPercent}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[9px] font-mono text-zinc-400 dark:text-zinc-500">
              <span>Frequency</span>
              <span className="font-bold text-zinc-700 dark:text-zinc-300">{stats.obesityPercent}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Appearance Card */}
      <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800/80 rounded-3xl p-4 flex items-center justify-between shadow-sm dark:shadow-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            {isDarkMode ? <Moon className="w-5 h-5 text-sky-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
          </div>
          <span className="text-base font-medium">Appearance</span>
        </div>

        <div className="bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 p-1 rounded-2xl flex items-center gap-1">
          <button
            onClick={() => toggleTheme(false)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${!isDarkMode ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-white'}`}
          >
            Light
          </button>
          <button
            onClick={() => toggleTheme(true)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${isDarkMode ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            Dark
          </button>
        </div>
      </div>

      {/* 4. Members Card */}
      <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800/80 rounded-3xl p-5 flex flex-col gap-3 shadow-sm dark:shadow-none">
        <div
          onClick={() => setShowMembersList(!showMembersList)}
          className="flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <Users className="w-5 h-5 text-sky-500" />
            </div>
            <span className="text-base font-medium">Members</span>
          </div>
          {showMembersList ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
        </div>

        <AnimatePresence>
          {showMembersList && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-col gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 overflow-hidden"
            >
              <div className="flex flex-wrap gap-2">
                {members?.map(m => (
                  <span key={m.id} className="text-xs bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-xl font-medium text-zinc-700 dark:text-zinc-300">
                    {m.current_name} {m.is_preset && '★'}
                  </span>
                ))}
              </div>

              <form onSubmit={handleAddMember} className="flex flex-col gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <label className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500">Add Permanent Member</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Member name"
                    value={newMemberName}
                    onChange={e => setNewMemberName(e.target.value)}
                    className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-3.5 py-2 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="submit"
                    disabled={addMember.isPending || !newMemberName.trim()}
                    className="bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white px-3.5 py-2 rounded-2xl text-xs font-semibold flex items-center gap-1 shrink-0"
                  >
                    {addMember.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                    <span>Add</span>
                  </button>
                </div>
                {memberMessage && (
                  <p className={`text-xs ${memberMessage.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {memberMessage.text}
                  </p>
                )}
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 5. App Info Card */}
      <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800/80 rounded-3xl p-5 flex items-start gap-4 shadow-sm dark:shadow-none">
        <img
          src="/icon-192.png"
          alt="BabySplitter App Icon"
          className="w-12 h-12 rounded-2xl object-cover shrink-0 mt-0.5 border border-zinc-200 dark:border-zinc-800 shadow-sm"
        />
        <div className="flex flex-col gap-1">
          <h2 className="font-bold text-sm tracking-tight">BabySplitter v3.7</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            A premium, personal shared expense tracker built for close friends. Real-time sync powered by Supabase.
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
            Developed by <span className="text-sky-600 dark:text-sky-400 font-semibold">benzavraar</span>
          </p>
        </div>
      </div>

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-t border-zinc-200 dark:border-zinc-800 px-6 py-2.5 z-50 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || (item.href === '/settings' && location === '/settings');
          return (
            <Link key={item.href} href={item.href}>
              <button
                className={`flex flex-col items-center gap-1 transition-all ${
                  isActive ? 'text-sky-600 dark:text-sky-400' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
                }`}
              >
                <div
                  className={`p-1.5 rounded-2xl transition-all ${
                    isActive ? 'bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400' : 'bg-transparent'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-medium tracking-tight">{item.label}</span>
              </button>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
