import { useState } from "react";
import { AppBar } from "@/components/AppBar";
import { BottomNav } from "@/components/BottomNav";
import { AddExpenseModal } from "@/components/AddExpenseModal";
import { useExpenses } from "@/hooks/useQueries";
import { useMutations } from "@/hooks/useMutations";
import { format } from "date-fns";
import { Plus, Edit2, Trash2, RefreshCw, Receipt } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ExpenseWithDetails } from "@/types";

function ExpenseCard({ expense, onEdit }: { expense: ExpenseWithDetails; onEdit: (e: ExpenseWithDetails) => void }) {
  const [expanded, setExpanded] = useState(false);
  const { deleteExpense } = useMutations();

  const currencySymbol = expense.currency === 'BDT' ? '৳' : expense.currency === 'INR' ? '₹' : '$';

  const statusStyles: Record<string, string> = {
    unsettled: "bg-red-500/10 text-red-500 border-red-500/20",
    partial:   "bg-orange-500/10 text-orange-500 border-orange-500/20",
  };

  return (
    <motion.div layout className="glass-panel rounded-3xl overflow-hidden mb-3">
      <div
        className="px-5 py-4 flex items-center justify-between cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex flex-col gap-0.5 min-w-0 mr-3">
          <h3 className="font-semibold text-base leading-tight truncate">{expense.title}</h3>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mt-0.5">
            <span>{format(new Date(expense.expense_date), 'dd MMM yyyy')}</span>
            <span>·</span>
            <span>by {expense.created_by}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className="font-bold text-base tabular-nums">
            {currencySymbol}{expense.total_amount.toLocaleString()}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${statusStyles[expense.status] ?? ''}`}>
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
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/20 dark:border-white/10 bg-white/25 dark:bg-black/20 px-5 py-4 flex flex-col gap-4">
              {/* Paid By */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Paid By</p>
                <div className="flex flex-col gap-1">
                  {expense.payers.map(p => (
                    <div key={p.id} className="flex justify-between items-center text-sm py-1 border-b border-white/10 last:border-0">
                      <span className="font-medium">{p.member_name}</span>
                      <span className="font-semibold tabular-nums">{currencySymbol}{p.amount_paid.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Split Among */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Split Among</p>
                <div className="flex flex-wrap gap-1.5">
                  {expense.participants.map(p => (
                    <span key={p.id} className="text-xs px-3 py-1 rounded-full bg-white/50 dark:bg-white/8 border border-white/30 dark:border-white/10 font-medium">
                      {p.member_name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={e => { e.stopPropagation(); onEdit(expense); }}
                  className="flex-1 py-2.5 rounded-xl glass-button text-sm font-semibold flex items-center justify-center gap-1.5"
                >
                  <Edit2 size={13} /> Edit
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    if (confirm("Delete this expense? This cannot be undone.")) {
                      deleteExpense.mutate(expense.id);
                    }
                  }}
                  disabled={deleteExpense.isPending}
                  className="flex-1 py-2.5 rounded-xl glass-button text-sm font-semibold flex items-center justify-center gap-1.5 text-destructive"
                >
                  {deleteExpense.isPending
                    ? <RefreshCw size={13} className="animate-spin" />
                    : <><Trash2 size={13} /> Delete</>
                  }
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function HomePage() {
  const { data: expenses, isLoading } = useExpenses();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseWithDetails | null>(null);

  // Only show unsettled / partial — fully settled expenses live in History
  const visibleExpenses = (expenses || []).filter(e => e.status !== 'settled');

  return (
    <div className="min-h-[100dvh] pt-24 pb-24 px-4 flex flex-col max-w-md mx-auto relative">
      <AppBar title="BabySplitter" showBell />

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="animate-spin text-muted-foreground" />
        </div>
      ) : visibleExpenses.length > 0 ? (
        <div className="flex flex-col pt-2">
          {visibleExpenses.map(expense => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              onEdit={e => { setEditingExpense(e); setIsAddModalOpen(true); }}
            />
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 text-muted-foreground px-8">
          <div className="w-24 h-24 rounded-full glass-panel flex items-center justify-center mb-4">
            <Receipt size={40} className="opacity-20" />
          </div>
          <h2 className="text-xl font-bold text-foreground">No expenses yet</h2>
          <p className="text-sm">Tap the + button below to add your first shared expense.</p>
        </div>
      )}

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => { setEditingExpense(null); setIsAddModalOpen(true); }}
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full glass-button-primary shadow-lg flex items-center justify-center z-30"
      >
        <Plus size={26} />
      </motion.button>

      <AddExpenseModal
        isOpen={isAddModalOpen}
        onClose={() => { setIsAddModalOpen(false); setEditingExpense(null); }}
        editExpense={editingExpense}
      />

      <BottomNav />
    </div>
  );
}
