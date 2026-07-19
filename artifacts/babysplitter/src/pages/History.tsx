import { useState } from 'react';
import { AppBar } from '@/components/AppBar';
import { BottomNav } from '@/components/BottomNav';
import { useSettlements, useExpenses } from '@/hooks/useQueries';
import { useMutations } from '@/hooks/useMutations';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { RotateCcw, Clock, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SettlementRecord, ExpenseWithDetails } from '@/types';

type ExpenseGroup = {
  expense_id: string;
  expense_title: string;
  expense_date: string;
  expense?: ExpenseWithDetails;
  settlements: SettlementRecord[];
};

function HistoryGroup({
  group,
  onUndo,
  isUndoPending,
  identity,
}: {
  group: ExpenseGroup;
  onUndo: (s: SettlementRecord) => void;
  isUndoPending: boolean;
  identity: string | null;
}) {
  const [expanded, setExpanded] = useState(false);

  const activeSettlements = group.settlements.filter(s => !s.is_undone);
  const totalSettled = activeSettlements.reduce((sum, s) => sum + s.amount, 0);
  const expenseTotal = group.expense?.total_amount;
  const currency = group.expense?.currency || 'BDT';
  const currencySymbol = currency === 'BDT' ? '৳' : currency === 'INR' ? '₹' : '$';

  const payers = group.expense?.payers || [];
  const participants = group.expense?.participants || [];
  const sharePerPerson = participants.length > 0 && expenseTotal
    ? expenseTotal / participants.length
    : null;

  const hasAnyUndone = group.settlements.some(s => s.is_undone);

  return (
    <motion.div layout className="glass-panel rounded-3xl overflow-hidden">
      {/* Collapsed header */}
      <div
        className="px-5 py-4 flex items-center justify-between cursor-pointer select-none"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex flex-col gap-0.5 min-w-0 mr-3">
          <h4 className="font-semibold text-base leading-tight truncate">{group.expense_title}</h4>
          <span className="text-xs text-muted-foreground font-medium">
            {format(new Date(group.expense_date), 'dd MMM yyyy')}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex flex-col items-end gap-0.5">
            {expenseTotal != null && (
              <span className="font-bold text-sm tabular-nums">
                {currencySymbol}{expenseTotal.toLocaleString()}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground font-medium tabular-nums">
              {activeSettlements.length} txn{activeSettlements.length !== 1 ? 's' : ''}
              {hasAnyUndone && <span className="ml-1 text-orange-500">· some undone</span>}
            </span>
          </div>
          <div className="text-muted-foreground">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/20 dark:border-white/10 bg-white/25 dark:bg-black/20 px-5 py-4 flex flex-col gap-5">

              {/* Paid By */}
              {payers.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Paid By
                  </p>
                  <div className="flex flex-col gap-1">
                    {payers.map(p => (
                      <div key={p.id} className="flex justify-between items-center text-sm py-1 border-b border-white/10 last:border-0">
                        <span className="font-medium">{p.member_name}</span>
                        <span className="font-semibold tabular-nums">
                          {currencySymbol}{p.amount_paid.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Participants + equal shares */}
              {participants.length > 0 && sharePerPerson != null && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Split ({participants.length} people · {currencySymbol}{sharePerPerson.toFixed(2)} each)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {participants.map(p => (
                      <span
                        key={p.id}
                        className="text-xs px-3 py-1 rounded-full bg-white/50 dark:bg-white/8 border border-white/30 dark:border-white/10 font-medium"
                      >
                        {p.member_name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Transactions */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
                  Transactions
                </p>
                <div className="flex flex-col gap-3">
                  {group.settlements.map(s => (
                    <div
                      key={s.id}
                      className={`relative rounded-2xl border p-3 flex flex-col gap-2 transition-all ${
                        s.is_undone
                          ? 'border-white/10 dark:border-white/5 opacity-50'
                          : 'border-white/30 dark:border-white/10 bg-white/30 dark:bg-white/5'
                      }`}
                    >
                      {/* Debtor → Creditor flow */}
                      <div className="flex items-center gap-2 text-sm">
                        <span className={`font-semibold ${s.is_undone ? 'line-through text-muted-foreground' : ''}`}>
                          {s.debtor}
                        </span>
                        <div className="flex-1 flex items-center gap-1">
                          <div className="flex-1 h-px bg-white/30 dark:bg-white/15" />
                          <span className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded-full ${
                            s.is_undone
                              ? 'bg-muted/50 text-muted-foreground'
                              : 'bg-primary/10 text-primary border border-primary/20'
                          }`}>
                            {currencySymbol}{s.amount.toLocaleString()}
                          </span>
                          <div className="flex-1 h-px bg-white/30 dark:bg-white/15" />
                          <ArrowRight size={12} className="text-muted-foreground shrink-0" />
                        </div>
                        <span className={`font-semibold ${s.is_undone ? 'line-through text-muted-foreground' : ''}`}>
                          {s.creditor}
                        </span>
                      </div>

                      {/* Meta row */}
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {format(new Date(s.settled_at), 'dd MMM yyyy, HH:mm')}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-medium">
                            Settled by {s.settled_by}
                          </span>
                        </div>

                        {s.is_undone ? (
                          <span className="text-[10px] font-bold text-orange-500 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                            Undone
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              if (confirm('Undo this settlement?')) {
                                onUndo(s);
                              }
                            }}
                            disabled={isUndoPending}
                            className="flex items-center gap-1 text-[10px] font-bold text-orange-500 bg-orange-500/10 hover:bg-orange-500/20 transition-colors px-2.5 py-1.5 rounded-lg border border-orange-500/20"
                          >
                            <RotateCcw size={11} />
                            {isUndoPending ? 'Undoing…' : 'Undo'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function History() {
  const { data: settlements } = useSettlements();
  const { data: expenses } = useExpenses();
  const { undoSettlement } = useMutations();
  const { identity } = useAuth();

  // Build expense map for payer/participant lookup
  const expenseMap = (expenses || []).reduce<Record<string, ExpenseWithDetails>>(
    (acc, e) => { acc[e.id] = e; return acc; },
    {}
  );

  // Group settlements by expense_id, preserving most-recent-first order
  const groups: ExpenseGroup[] = [];
  const seen = new Set<string>();

  (settlements || []).forEach(s => {
    if (!seen.has(s.expense_id)) {
      seen.add(s.expense_id);
      groups.push({
        expense_id: s.expense_id,
        expense_title: s.expense_title,
        expense_date: s.expense_date,
        expense: expenseMap[s.expense_id],
        settlements: [],
      });
    }
    groups.find(g => g.expense_id === s.expense_id)!.settlements.push(s);
  });

  return (
    <div className="min-h-[100dvh] pt-24 pb-24 px-4 flex flex-col max-w-md mx-auto relative">
      <AppBar title="History" />

      {groups.length > 0 ? (
        <div className="flex flex-col gap-3 pt-2">
          {groups.map(group => (
            <HistoryGroup
              key={group.expense_id}
              group={group}
              onUndo={s => undoSettlement.mutate({ id: s.id, expense_id: s.expense_id, undone_by: identity! })}
              isUndoPending={undoSettlement.isPending}
              identity={identity}
            />
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 text-muted-foreground px-8">
          <div className="w-24 h-24 rounded-full glass-panel flex items-center justify-center mb-4">
            <Clock size={40} className="opacity-20" />
          </div>
          <h2 className="text-xl font-bold text-foreground">No History</h2>
          <p className="text-sm">Settlement history will appear here.</p>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
