import { useState, useMemo } from 'react';
import { AppBar } from '@/components/AppBar';
import { BottomNav } from '@/components/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { useMembers, useExpenses } from '@/hooks/useQueries';
import { useMutations } from '@/hooks/useMutations';
import { useTheme } from '@/components/theme-provider';
import {
  Moon, Sun, User, Users, Info, Plus, X, Pencil, Trash2,
  ChevronDown, ChevronUp, TrendingUp, Zap, Receipt,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Settings() {
  const { identity, changeIdentity, canChangeIdentity } = useAuth();
  const { theme, setTheme } = useTheme();
  const { data: members } = useMembers();
  const { data: expenses } = useExpenses();
  const { addMember, renameMember, deleteMember } = useMutations();

  const [isChangingIdentity, setIsChangingIdentity] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [profileExpanded, setProfileExpanded] = useState(false);
  const [membersExpanded, setMembersExpanded] = useState(false);

  // ── Monthly stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthExpenses = (expenses || []).filter(
      e => new Date(e.expense_date) >= monthStart
    );

    const totalSpent = monthExpenses.reduce((s, e) => s + e.total_amount, 0);
    const count = monthExpenses.length;

    // Top payer by amount paid
    const spenderMap: Record<string, number> = {};
    monthExpenses.forEach(e =>
      e.payers.forEach(p => {
        spenderMap[p.member_name] = (spenderMap[p.member_name] || 0) + p.amount_paid;
      })
    );
    const topSpender = Object.entries(spenderMap).sort((a, b) => b[1] - a[1])[0] ?? null;

    // Last 7 days spending for bar chart
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      const dayTotal = monthExpenses
        .filter(e => e.expense_date.startsWith(dateStr))
        .reduce((s, e) => s + e.total_amount, 0);
      return {
        label: d.toLocaleDateString('en', { weekday: 'short' }),
        amount: dayTotal,
      };
    });
    const maxDay = Math.max(...last7.map(d => d.amount), 1);

    // Currency of most recent expense
    const currency = monthExpenses[0]?.currency ?? 'BDT';
    const sym = currency === 'BDT' ? '৳' : currency === 'INR' ? '₹' : '$';

    return { totalSpent, count, topSpender, last7, maxDay, sym };
  }, [expenses]);

  const handleAddMember = () => {
    if (!newMemberName.trim()) return;
    const name = newMemberName.trim();
    if (members?.some(m => m.current_name === name)) {
      alert('Name already exists');
      return;
    }
    addMember.mutate({ original_name: name, current_name: name }, {
      onSuccess: () => setNewMemberName(''),
    });
  };

  const handleRename = (id: string) => {
    if (!editName.trim()) return;
    renameMember.mutate({ id, current_name: editName.trim() }, {
      onSuccess: () => { setEditingMemberId(null); setEditName(''); },
    });
  };

  return (
    <div className="min-h-[100dvh] pt-24 pb-24 px-4 flex flex-col max-w-md mx-auto relative gap-5">
      <AppBar title="Settings" showRefresh={false} />

      {/* ── Profile Card — collapsible — FIRST ── */}
      <div className="glass-panel rounded-3xl overflow-hidden">
        <button
          className="w-full px-5 py-4 flex items-center justify-between"
          onClick={() => setProfileExpanded(v => !v)}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full glass-panel-heavy border-primary/20 flex items-center justify-center text-lg font-bold bg-primary/5 text-primary shrink-0">
              {identity?.charAt(0)}
            </div>
            <div className="text-left">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Identity</p>
              <h2 className="text-base font-bold leading-tight">{identity}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" title="Synced" />
            <div className="text-muted-foreground">
              {profileExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>
        </button>
        <AnimatePresence>
          {profileExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="border-t border-white/20 dark:border-white/10 px-5 pb-5 pt-4">
                {canChangeIdentity && (
                  <button
                    onClick={() => setIsChangingIdentity(true)}
                    className="glass-button w-full py-3 rounded-2xl text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <User size={16} /> Change Identity (1 left)
                  </button>
                )}
                {!canChangeIdentity && (
                  <p className="text-xs text-muted-foreground text-center py-1">
                    Identity cannot be changed again.
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Monthly Stats Card ── */}
      <div className="glass-panel rounded-3xl p-5 flex flex-col gap-4 overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">This Month</p>
              <p className="text-xs font-semibold text-foreground">Group Spending</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums">
              {stats.totalSpent > 0
                ? `${stats.sym}${stats.totalSpent.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                : '—'}
            </p>
            <p className="text-[10px] text-muted-foreground">{stats.count} expense{stats.count !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Stat chips */}
        <div className="flex gap-2">
          <div className="flex-1 bg-white/40 dark:bg-white/5 rounded-2xl px-3 py-2 border border-white/30 dark:border-white/10">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5 flex items-center gap-1">
              <Zap size={9} /> Top spender
            </p>
            <p className="text-xs font-semibold truncate">
              {stats.topSpender ? stats.topSpender[0] : '—'}
            </p>
            {stats.topSpender && (
              <p className="text-[10px] text-primary font-bold">
                {stats.sym}{stats.topSpender[1].toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            )}
          </div>
          <div className="flex-1 bg-white/40 dark:bg-white/5 rounded-2xl px-3 py-2 border border-white/30 dark:border-white/10">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5 flex items-center gap-1">
              <Receipt size={9} /> Expenses
            </p>
            <p className="text-xl font-bold tabular-nums">{stats.count}</p>
            <p className="text-[10px] text-muted-foreground">this month</p>
          </div>
        </div>

        {/* Animated bar chart — last 7 days */}
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Last 7 days
          </p>
          <div className="flex items-end gap-1 h-14">
            {stats.last7.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center" style={{ height: '44px' }}>
                  <motion.div
                    className="w-full rounded-t-lg"
                    style={{
                      background: day.amount > 0
                        ? 'linear-gradient(to top, hsl(var(--primary)/0.4), hsl(var(--primary)/0.25))'
                        : 'rgba(255,255,255,0.15)',
                      minHeight: day.amount > 0 ? '3px' : '2px',
                    }}
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max((day.amount / stats.maxDay) * 44, day.amount > 0 ? 4 : 2)}px` }}
                    transition={{ delay: i * 0.06 + 0.1, duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
                <span className="text-[8px] text-muted-foreground leading-none">{day.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Theme Card ── */}
      <div className="glass-panel rounded-3xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
          </div>
          <span className="font-semibold">Appearance</span>
        </div>
        <div className="flex bg-white/20 dark:bg-black/40 p-1 rounded-2xl border border-white/10">
          <button
            onClick={() => setTheme('light')}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${theme === 'light' ? 'bg-white text-black shadow-sm' : 'text-muted-foreground'}`}
          >
            Light
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${theme === 'dark' ? 'bg-black text-white shadow-sm border border-white/10' : 'text-muted-foreground'}`}
          >
            Dark
          </button>
        </div>
      </div>

      {/* ── Members Card — collapsible ── */}
      <div className="glass-panel rounded-3xl overflow-hidden">
        <button
          className="w-full px-5 py-4 flex items-center justify-between"
          onClick={() => setMembersExpanded(v => !v)}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
              <Users size={20} />
            </div>
            <span className="font-semibold text-base">Members</span>
          </div>
          <div className="text-muted-foreground">
            {membersExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        <AnimatePresence>
          {membersExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="border-t border-white/20 dark:border-white/10 px-5 pb-5 pt-4 flex flex-col gap-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add new member..."
                    value={newMemberName}
                    onChange={e => setNewMemberName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddMember()}
                    className="glass-input flex-1 text-sm py-3"
                  />
                  <button
                    onClick={handleAddMember}
                    disabled={addMember.isPending || !newMemberName.trim()}
                    className="glass-button bg-primary/10 text-primary border-primary/20 px-4 rounded-xl font-medium"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <div className="flex flex-col divide-y divide-white/10">
                  {members?.map(m => (
                    <div key={m.id} className="py-3 flex items-center justify-between">
                      {editingMemberId === m.id ? (
                        <div className="flex gap-2 flex-1 mr-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="glass-input flex-1 py-1 px-3 text-sm h-8"
                            autoFocus
                          />
                          <button onClick={() => handleRename(m.id)} className="text-green-500 bg-green-500/10 p-1.5 rounded-lg border border-green-500/20">
                            <CheckIcon size={14} />
                          </button>
                          <button onClick={() => setEditingMemberId(null)} className="text-muted-foreground bg-white/10 p-1.5 rounded-lg">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{m.current_name}</span>
                          {m.is_preset && (
                            <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                              Preset
                            </span>
                          )}
                        </div>
                      )}
                      {editingMemberId !== m.id && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setEditingMemberId(m.id); setEditName(m.current_name); }}
                            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          {!m.is_preset && (
                            <button
                              onClick={() => { if (confirm(`Delete ${m.current_name}?`)) deleteMember.mutate(m.id); }}
                              className="p-2 text-destructive/70 hover:text-destructive transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── About ── */}
      <div className="glass-panel rounded-3xl p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
          <Info size={20} />
        </div>
        <div className="flex flex-col gap-1.5">
          {(() => {
            const metaVersion = document.querySelector("meta[name='app-version']")?.getAttribute("content");
            return <span className="font-bold">BabySplitter {metaVersion || 'v3.7'}</span>;
          })()}
          <p className="text-xs text-muted-foreground leading-relaxed">
            A premium, personal shared expense tracker built for close friends.
            Real-time sync powered by Supabase.
          </p>
          <p className="text-xs text-muted-foreground/70 font-medium mt-0.5">
            Developed by <span className="text-primary font-semibold">benzavraar</span>
          </p>
        </div>
      </div>

      {/* Identity Change Modal */}
      <AnimatePresence>
        {isChangingIdentity && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsChangingIdentity(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm glass-panel-heavy rounded-3xl p-6 flex flex-col gap-4 overflow-hidden"
            >
              <h2 className="text-xl font-bold text-center">Change Identity</h2>
              <div className="p-3 bg-orange-500/10 text-orange-600 rounded-2xl text-xs font-medium border border-orange-500/20 text-center leading-relaxed">
                Warning: You can only change your identity once. Choose carefully.
              </div>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {members?.filter(m => m.is_preset).map(member => (
                  <button
                    key={member.id}
                    onClick={() => {
                      if (changeIdentity(member.current_name)) setIsChangingIdentity(false);
                    }}
                    className={`p-3 rounded-2xl border text-sm font-semibold transition-all ${member.current_name === identity ? 'bg-primary/20 border-primary/50 text-foreground' : 'glass-button'}`}
                  >
                    {member.current_name}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setIsChangingIdentity(false)}
                className="mt-2 w-full py-3 rounded-xl glass-button font-semibold text-sm"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}

function CheckIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
