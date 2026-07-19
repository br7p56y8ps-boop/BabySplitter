import { useState } from 'react';
import { AppBar } from '@/components/AppBar';
import { BottomNav } from '@/components/BottomNav';
import { useExpenses } from '@/hooks/useQueries';
import { useMutations } from '@/hooks/useMutations';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { RotateCcw, Clock, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExpenseWithDetails } from '@/types';

function HistoryCard({
  expense,
  onUndo,
  isUndoPending,
}: {
  expense: ExpenseWithDetails;
  onUndo: () => void;
  isUndoPending: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const currency = expense.currency;
  const currencySymbol = currency === 'BDT' ? '৳' : currency === 'INR' ? '₹' : '$';
  const sharePerPerson = expense.participants.length > 0
    ? expense.total_amount / expense.participants.length
    : 0;

  // Use the latest settlement date as the card's settled date
  const latestSettlement = expense.settlements.length > 0
    ? expense.settlements.reduce((a, b) => new Date(a.settled_at) > new Date(b.settled_at) ? a : b)
    : null;

  return (
    <motion.div layout className="glass-panel rounded-3xl overflow-hidden">
      {/* Collapsed header */}
      <div
        className="px-5 py-4 flex items-center justify-between cursor-pointer select-none"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex flex-col gap-0.5 min-w-0 mr-3">
          <h4 className="font-semibold text-base leading-tight truncate">{expense.title}</h4>
          <span className="text-xs text-muted-foreground font-medium">
            {format(new Date(expense.expense_date), 'dd MMM yyyy')}
            {latestSettlement && (
              <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-semibold">· Settled</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-bold text-base tabular-nums">
            {currencySymbol}{expense.total_amount.toLocaleString()}
          </span>
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
              {expense.payers.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Paid By
                  </p>
                  <div className="flex flex-col gap-1">
                    {expense.payers.map(p => (
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

              {/* Participants + equal share */}
              {expense.participants.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Split — {expense.participants.length} people · {currencySymbol}{sharePerPerson.toFixed(2)} each
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {expense.participants.map(p => (
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
              {expense.settlements.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
                    Transactions
                  </p>
                  <div className="flex flex-col gap-2.5">
                    {expense.settlements.map(s => (
                      <div
                        key={s.id}
                        className="rounded-2xl border border-white/30 dark:border-white/10 bg-white/30 dark:bg-white/5 p-3 flex flex-col gap-2"
                      >
                        {/* Flow: debtor → amount → creditor */}
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-semibold">{s.debtor}</span>
                          <div className="flex-1 flex items-center gap-1 min-w-0">
                            <div className="flex-1 h-px bg-white/30 dark:bg-white/15" />
                            <span className="text-xs font-bold tabular-nums px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                              {currencySymbol}{s.amount.toLocaleString()}
                            </span>
                            <div className="flex-1 h-px bg-white/30 dark:bg-white/15" />
                            <ArrowRight size={12} className="text-muted-foreground shrink-0" />
                          </div>
                          <span className="font-semibold">{s.creditor}</span>
                        </div>

                        {/* Meta: date + settled by */}
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-muted-foreground font-medium">
                              {format(new Date(s.settled_at), 'dd MMM yyyy, HH:mm')}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-medium">
                              Settled by {s.settled_by}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Single Undo for the whole expense */}
              <button
                onClick={() => {
                  if (confirm('Undo all settlements for this expense? It will move back to Home and Settlement.')) {
                    onUndo();
                  }
                }}
                disabled={isUndoPending}
                className="w-full py-2.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold text-orange-500 bg-orange-500/10 hover:bg-orange-500/15 border border-orange-500/20 transition-colors"
              >
                <RotateCcw size={14} />
                {isUndoPending ? 'Undoing…' : 'Undo — Move Back to Home'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function History() {
  const { data: expenses } = useExpenses();
  const { resetExpense } = useMutations();
  const { identity } = useAuth();

  // Only fully-settled expenses appear in History
  const settledExpenses = (expenses || [])
    .filter(e => e.status === 'settled')
    .sort((a, b) => {
      // Sort by the latest settlement date, newest first
      const latestA = a.settlements.length > 0
        ? Math.max(...a.settlements.map(s => new Date(s.settled_at).getTime()))
        : 0;
      const latestB = b.settlements.length > 0
        ? Math.max(...b.settlements.map(s => new Date(s.settled_at).getTime()))
        : 0;
      return latestB - latestA;
    });

  return (
    <div className="min-h-[100dvh] pt-24 pb-24 px-4 flex flex-col max-w-md mx-auto relative">
      <AppBar title="History" />

      {settledExpenses.length > 0 ? (
        <div className="flex flex-col gap-3 pt-2">
          {settledExpenses.map(expense => (
            <HistoryCard
              key={expense.id}
              expense={expense}
              onUndo={() => resetExpense.mutate(expense.id)}
              isUndoPending={resetExpense.isPending}
            />
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 text-muted-foreground px-8">
          <div className="w-24 h-24 rounded-full glass-panel flex items-center justify-center mb-4">
            <Clock size={40} className="opacity-20" />
          </div>
          <h2 className="text-xl font-bold text-foreground">No history yet</h2>
          <p className="text-sm">Fully settled expenses will appear here.</p>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
