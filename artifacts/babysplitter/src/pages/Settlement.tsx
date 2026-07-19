import { useState, useMemo } from 'react';
import { AppBar } from '@/components/AppBar';
import { BottomNav } from '@/components/BottomNav';
import { useExpenses } from '@/hooks/useQueries';
import { useMutations } from '@/hooks/useMutations';
import { calculateTransfers } from '@/lib/settlementEngine';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { CheckCircle2, Check, ArrowRight, Layers } from 'lucide-react';
import { ExpenseWithDetails } from '@/types';

function SettlementCard({ expense }: { expense: ExpenseWithDetails }) {
  const [expanded, setExpanded] = useState(false);
  const { identity } = useAuth();
  const { settleTransaction } = useMutations();

  const currencySymbol = expense.currency === 'BDT' ? '৳' : expense.currency === 'INR' ? '₹' : '$';

  const payers = expense.payers.map(p => ({ memberName: p.member_name, amountPaid: p.amount_paid }));
  const participants = expense.participants.map(p => p.member_name);
  const transfers = useMemo(() => calculateTransfers(expense.total_amount, payers, participants), [expense.total_amount, payers, participants]);
  const settledRecords = expense.settlements || [];
  
  const statusColors = {
    unsettled: "bg-destructive/10 text-destructive border-destructive/20",
    partial: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    settled: "bg-green-500/10 text-green-600 border-green-500/20"
  };

  return (
    <motion.div layout className="glass-panel rounded-3xl overflow-hidden mb-4">
      <div 
        className="p-5 flex items-center justify-between cursor-pointer active:bg-white/20 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-lg">{expense.title}</h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
            <span>{format(new Date(expense.expense_date), 'dd MMM yyyy')}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="font-bold text-lg">{currencySymbol}{expense.total_amount.toLocaleString()}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${statusColors[expense.status]}`}>
            {expense.status}
          </span>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/10 bg-white/30 dark:bg-black/20"
          >
            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground bg-white/40 dark:bg-white/5 p-3 rounded-xl border border-white/10">
                <div className="flex flex-col">
                  <span className="uppercase tracking-wider font-bold mb-1">Equal Share</span>
                  <span className="font-medium text-foreground">
                    {currencySymbol}{(expense.total_amount / Math.max(1, participants.length)).toFixed(2)}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="uppercase tracking-wider font-bold mb-1">Participants</span>
                  <span className="font-medium text-foreground">{participants.length}</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">Who Owes Whom</h4>
                {transfers.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-1">No transfers needed.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {transfers.map((t, idx) => {
                      const isSettled = settledRecords.some(s => s.debtor === t.debtor && s.creditor === t.creditor && s.amount === t.amount);
                      
                      return (
                        <div key={idx} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${isSettled ? 'bg-white/20 dark:bg-white/5 border-white/10 opacity-60' : 'glass-panel'}`}>
                          <div className="flex items-center gap-2 flex-1">
                            <span className="font-medium text-sm">{t.debtor}</span>
                            <ArrowRight size={14} className="text-muted-foreground" />
                            <span className="font-medium text-sm">{t.creditor}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-sm">{currencySymbol}{t.amount.toLocaleString()}</span>
                            {isSettled ? (
                              <div className="bg-green-500/20 text-green-600 border border-green-500/20 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                                <Check size={12} strokeWidth={3} /> Settled
                              </div>
                            ) : (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const unsettledCount = transfers.filter(tr => !settledRecords.some(sr => sr.debtor === tr.debtor && sr.creditor === tr.creditor && sr.amount === tr.amount)).length;
                                  const newStatus = unsettledCount === 1 ? 'settled' : 'partial';
                                  settleTransaction.mutate({
                                    expense_id: expense.id,
                                    expense_title: expense.title,
                                    expense_date: expense.expense_date,
                                    debtor: t.debtor,
                                    creditor: t.creditor,
                                    amount: t.amount,
                                    settled_by: identity!,
                                    new_status: newStatus
                                  });
                                }}
                                disabled={settleTransaction.isPending}
                                className="glass-button bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 px-3 py-1.5 rounded-xl text-xs font-bold"
                              >
                                Settle
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Settlement() {
  const { data: expenses } = useExpenses();
  const { settleMultiple } = useMutations();
  const { identity } = useAuth();
  const [isSettleAllModalOpen, setIsSettleAllModalOpen] = useState(false);

  const unsettledExpenses = expenses?.filter(e => e.status !== 'settled') || [];

  const allUnsettledTransfers = useMemo(() => {
    const result: Array<{
      expense_id: string;
      expense_title: string;
      expense_date: string;
      debtor: string;
      creditor: string;
      amount: number;
      new_status: 'partial' | 'settled';
    }> = [];

    unsettledExpenses.forEach(expense => {
      const payers = expense.payers.map(p => ({ memberName: p.member_name, amountPaid: p.amount_paid }));
      const participants = expense.participants.map(p => p.member_name);
      const transfers = calculateTransfers(expense.total_amount, payers, participants);
      const settledRecords = expense.settlements || [];
      
      const unsettledForThisExpense = transfers.filter(tr => 
        !settledRecords.some(sr => sr.debtor === tr.debtor && sr.creditor === tr.creditor && sr.amount === tr.amount)
      );

      unsettledForThisExpense.forEach(tr => {
        result.push({
          expense_id: expense.id,
          expense_title: expense.title,
          expense_date: expense.expense_date,
          debtor: tr.debtor,
          creditor: tr.creditor,
          amount: tr.amount,
          new_status: 'settled' 
        });
      });
    });
    return result;
  }, [unsettledExpenses]);

  const handleSettleAll = () => {
    settleMultiple.mutate({
      transactions: allUnsettledTransfers,
      settled_by: identity!
    }, {
      onSuccess: () => setIsSettleAllModalOpen(false)
    });
  };

  return (
    <div className="min-h-[100dvh] pt-24 pb-24 px-4 flex flex-col max-w-md mx-auto relative">
      <AppBar 
        title="Settlement" 
        action={allUnsettledTransfers.length > 0 ? (
          <button 
            onClick={() => setIsSettleAllModalOpen(true)}
            className="px-3 h-10 rounded-full glass-button text-xs font-bold flex items-center gap-1.5 outline-none bg-primary/10 text-primary border-primary/20"
          >
            <Layers size={14} /> Settle All
          </button>
        ) : undefined}
      />
      
      {unsettledExpenses.length > 0 ? (
        <div className="flex flex-col">
          {unsettledExpenses.map((expense) => (
            <SettlementCard key={expense.id} expense={expense} />
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 text-muted-foreground px-8">
          <div className="w-24 h-24 rounded-full glass-panel flex items-center justify-center mb-4">
            <CheckCircle2 size={40} className="opacity-20 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-foreground">All Settled Up!</h2>
          <p className="text-sm">There are no unsettled expenses.</p>
        </div>
      )}

      <AnimatePresence>
        {isSettleAllModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
              onClick={() => setIsSettleAllModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm glass-panel-heavy rounded-3xl p-6 flex flex-col gap-4 overflow-hidden"
            >
              <h2 className="text-xl font-bold text-center">Settle All</h2>
              <p className="text-sm text-center text-muted-foreground">You are about to settle {allUnsettledTransfers.length} remaining transactions.</p>
              
              <div className="max-h-48 overflow-y-auto hide-scrollbar flex flex-col gap-2 my-2 bg-white/20 dark:bg-white/5 rounded-2xl p-3 border border-white/10">
                {allUnsettledTransfers.map((t, i) => (
                  <div key={i} className="flex justify-between items-center text-xs border-b border-white/10 last:border-0 pb-2 mb-2 last:pb-0 last:mb-0">
                    <span className="flex-1 truncate pr-2">{t.expense_title}</span>
                    <span className="text-muted-foreground whitespace-nowrap">{t.debtor} → {t.creditor}</span>
                    <span className="font-bold ml-3">{t.amount}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 mt-2">
                <button 
                  onClick={() => setIsSettleAllModalOpen(false)}
                  className="flex-1 py-3 rounded-xl glass-button font-semibold text-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSettleAll}
                  disabled={settleMultiple.isPending}
                  className="flex-1 py-3 rounded-xl glass-button-primary font-semibold text-sm"
                >
                  {settleMultiple.isPending ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
