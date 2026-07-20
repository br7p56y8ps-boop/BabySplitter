import { useState, useMemo } from 'react';
import { AppBar } from '@/components/AppBar';
import { BottomNav } from '@/components/BottomNav';
import { useExpenses } from '@/hooks/useQueries';
import { useMutations } from '@/hooks/useMutations';
import { calculateTransfers } from '@/lib/settlementEngine';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import {
  CheckCircle2, Check, ArrowRight, Layers,
  Square, CheckSquare, ChevronDown, ChevronUp, Info
} from 'lucide-react';
import { ExpenseWithDetails } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type RawTransaction = {
  expense_id: string;
  expense_title: string;
  expense_date: string;
  debtor: string;
  creditor: string;
  amount: number;
  new_status: 'partial' | 'settled';
};

type NetTransfer = { debtor: string; creditor: string; amount: number };
type PersonRow = { name: string; paid: number; owes: number; net: number };

type NetGroup = {
  currency: string;
  symbol: string;
  transfers: NetTransfer[];
  personBreakdown: PersonRow[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function currencySymbol(c: string) {
  return c === 'BDT' ? '৳' : c === 'INR' ? '₹' : '$';
}

function calcNetGroups(expenses: ExpenseWithDetails[]): NetGroup[] {
  const byCurrency: Record<string, ExpenseWithDetails[]> = {};
  for (const e of expenses) {
    if (!byCurrency[e.currency]) byCurrency[e.currency] = [];
    byCurrency[e.currency].push(e);
  }

  return Object.entries(byCurrency).map(([currency, exps]) => {
    const sym = currencySymbol(currency);
    const balances: Record<string, { paid: number; owes: number }> = {};

    for (const expense of exps) {
      if (expense.participants.length === 0) continue;
      const share = expense.total_amount / expense.participants.length;
      expense.participants.forEach(p => {
        if (!balances[p.member_name]) balances[p.member_name] = { paid: 0, owes: 0 };
        balances[p.member_name].owes += share;
      });
      expense.payers.forEach(p => {
        if (!balances[p.member_name]) balances[p.member_name] = { paid: 0, owes: 0 };
        balances[p.member_name].paid += p.amount_paid;
      });
    }

    const personBreakdown: PersonRow[] = Object.entries(balances)
      .map(([name, b]) => ({
        name,
        paid: parseFloat(b.paid.toFixed(2)),
        owes: parseFloat(b.owes.toFixed(2)),
        net: parseFloat((b.paid - b.owes).toFixed(2)),
      }))
      .sort((a, b) => b.net - a.net);

    const d = personBreakdown
      .filter(r => r.net < -0.01)
      .map(r => ({ name: r.name, balance: Math.abs(r.net) }))
      .sort((a, b) => b.balance - a.balance)
      .map(x => ({ ...x }));
    const c = personBreakdown
      .filter(r => r.net > 0.01)
      .map(r => ({ name: r.name, balance: r.net }))
      .sort((a, b) => b.balance - a.balance)
      .map(x => ({ ...x }));

    const transfers: NetTransfer[] = [];
    let i = 0, j = 0;
    while (i < d.length && j < c.length) {
      const amount = Math.min(d[i].balance, c[j].balance);
      transfers.push({ debtor: d[i].name, creditor: c[j].name, amount: parseFloat(amount.toFixed(2)) });
      d[i].balance -= amount;
      c[j].balance -= amount;
      if (d[i].balance < 0.01) i++;
      if (c[j].balance < 0.01) j++;
    }

    return { currency, symbol: sym, transfers, personBreakdown };
  });
}

function buildRawTransactions(expenses: ExpenseWithDetails[]): RawTransaction[] {
  const result: RawTransaction[] = [];
  for (const expense of expenses) {
    const payers = expense.payers.map(p => ({ memberName: p.member_name, amountPaid: p.amount_paid }));
    const participants = expense.participants.map(p => p.member_name);
    const transfers = calculateTransfers(expense.total_amount, payers, participants);
    const settled = expense.settlements || [];
    const unsettled = transfers.filter(
      tr => !settled.some(sr => sr.debtor === tr.debtor && sr.creditor === tr.creditor && sr.amount === tr.amount)
    );
    unsettled.forEach(tr =>
      result.push({
        expense_id: expense.id,
        expense_title: expense.title,
        expense_date: expense.expense_date,
        debtor: tr.debtor,
        creditor: tr.creditor,
        amount: tr.amount,
        new_status: 'settled',
      })
    );
  }
  return result;
}

// ─── SettleConfirmDialog ──────────────────────────────────────────────────────

function SettleConfirmDialog({
  expenses,
  onConfirm,
  onClose,
  isPending,
}: {
  expenses: ExpenseWithDetails[];
  onConfirm: (raw: RawTransaction[]) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [showExplanation, setShowExplanation] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const netGroups = useMemo(() => calcNetGroups(expenses), [expenses]);
  const rawTransactions = useMemo(() => buildRawTransactions(expenses), [expenses]);
  const totalTransfers = netGroups.reduce((sum, g) => sum + g.transfers.length, 0);

  const scopeLabel = expenses.length === 1
    ? `"${expenses[0].title}"`
    : `${expenses.length} expenses`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="relative w-full max-w-xs glass-panel-heavy rounded-3xl flex flex-col overflow-hidden"
        style={{ maxHeight: 'min(560px, 88dvh)' }}
      >
        <div className="px-5 pt-5 pb-3 shrink-0">
          <h2 className="text-base font-bold text-center">Confirm Settlement</h2>
          <p className="text-[11px] text-center text-muted-foreground mt-1">
            Settling {scopeLabel} · {totalTransfers} net payment{totalTransfers !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="px-4 overflow-y-auto flex-1 hide-scrollbar">
          {netGroups.map(group => (
            <div key={group.currency} className="mb-3">
              {netGroups.length > 1 && (
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  {group.currency}
                </p>
              )}
              {group.transfers.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Already balanced — no payments needed.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {group.transfers.map((t, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 bg-white/20 dark:bg-white/5 border border-white/15 dark:border-white/8 rounded-2xl px-3 py-2"
                    >
                      <span className="text-xs font-semibold flex-1 min-w-0 truncate">{t.debtor}</span>
                      <ArrowRight size={12} className="text-muted-foreground shrink-0" />
                      <span className="text-xs font-semibold flex-1 min-w-0 truncate text-right">{t.creditor}</span>
                      {/* Amount — red (not yet settled) */}
                      <span className="text-xs font-bold tabular-nums ml-1 shrink-0 text-red-500">
                        {group.symbol}{t.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* How is this calculated? */}
          <div className="mt-2 mb-1 rounded-2xl border border-white/15 dark:border-white/8 bg-white/10 dark:bg-white/3 overflow-hidden">
            <button
              onClick={() => setShowExplanation(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-[11px] font-semibold text-muted-foreground"
            >
              <span className="flex items-center gap-1.5">
                <Info size={11} />
                How is this calculated?
              </span>
              {showExplanation ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            <AnimatePresence>
              {showExplanation && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pb-3 flex flex-col gap-2">
                    <p className="text-[10px] leading-relaxed text-muted-foreground">
                      Instead of settling each expense separately, we calculate each person's overall
                      balance (total paid minus their fair share) and net it against everyone else's.
                      This gives the fewest possible payments to clear all balances — the same end
                      result, just fewer transactions.
                    </p>
                    <button
                      onClick={() => setShowBreakdown(v => !v)}
                      className="flex items-center gap-1 text-[10px] font-semibold text-primary self-start"
                    >
                      {showBreakdown ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                      Per-person breakdown
                    </button>
                    <AnimatePresence>
                      {showBreakdown && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          {netGroups.map(group => (
                            <div key={group.currency} className="flex flex-col gap-1 mt-1">
                              {netGroups.length > 1 && (
                                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                                  {group.currency}
                                </p>
                              )}
                              {group.personBreakdown
                                .filter(r => r.paid > 0 || r.owes > 0)
                                .map(r => (
                                  <div key={r.name} className="text-[10px] text-muted-foreground leading-snug">
                                    <span className="font-semibold text-foreground">{r.name}</span>
                                    {': '}Paid {group.symbol}{r.paid.toLocaleString()}, Owes {group.symbol}{r.owes.toLocaleString()}
                                    {' → '}
                                    <span className={r.net >= 0 ? 'text-emerald-500 font-semibold' : 'text-rose-400 font-semibold'}>
                                      {r.net >= 0
                                        ? `+${group.symbol}${r.net.toLocaleString()} (to receive)`
                                        : `−${group.symbol}${Math.abs(r.net).toLocaleString()} (to pay)`}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="px-4 py-4 flex gap-2.5 shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl glass-button font-semibold text-sm">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(rawTransactions)}
            disabled={isPending || rawTransactions.length === 0}
            className="flex-1 py-2.5 rounded-xl glass-button-primary font-semibold text-sm disabled:opacity-50"
          >
            {isPending ? 'Settling…' : 'Confirm'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── SettlementCard ───────────────────────────────────────────────────────────

function SettlementCard({
  expense,
  isSelected,
  onToggleSelect,
  onSettleSingle,
}: {
  expense: ExpenseWithDetails;
  isSelected: boolean;
  onToggleSelect: () => void;
  onSettleSingle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { identity } = useAuth();
  const { settleTransaction } = useMutations();

  const sym = currencySymbol(expense.currency);
  const payers = expense.payers.map(p => ({ memberName: p.member_name, amountPaid: p.amount_paid }));
  const participants = expense.participants.map(p => p.member_name);
  const transfers = useMemo(
    () => calculateTransfers(expense.total_amount, payers, participants),
    [expense.total_amount, payers, participants]
  );
  const settledRecords = expense.settlements || [];

  const unsettledTransfers = transfers.filter(
    tr => !settledRecords.some(sr => sr.debtor === tr.debtor && sr.creditor === tr.creditor && sr.amount === tr.amount)
  );

  const statusColors = {
    unsettled: 'bg-destructive/10 text-destructive border-destructive/20',
    partial: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    settled: 'bg-green-500/10 text-green-600 border-green-500/20',
  };

  return (
    <motion.div layout className="glass-panel rounded-3xl overflow-hidden mb-3">
      <div className="flex items-stretch">
        {/* Select checkbox */}
        <button
          onClick={e => { e.stopPropagation(); onToggleSelect(); }}
          className="pl-4 pr-2 flex items-center justify-center shrink-0 text-muted-foreground"
        >
          {isSelected
            ? <CheckSquare size={18} className="text-primary" />
            : <Square size={18} className="opacity-40" />}
        </button>

        {/* Main tappable area */}
        <div
          className="flex-1 p-4 pl-1 flex items-center justify-between cursor-pointer active:bg-white/20 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex flex-col gap-0.5">
            <h3 className="font-semibold text-base leading-tight">{expense.title}</h3>
            <span className="text-xs text-muted-foreground font-medium">
              {format(new Date(expense.expense_date), 'dd MMM yyyy')}
            </span>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0 ml-3">
            <span className="font-bold text-base tabular-nums">{sym}{expense.total_amount.toLocaleString()}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${statusColors[expense.status]}`}>
              {expense.status}
            </span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/10 bg-white/30 dark:bg-black/20 overflow-hidden"
          >
            <div className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground bg-white/40 dark:bg-white/5 p-3 rounded-xl border border-white/10">
                <div className="flex flex-col">
                  <span className="uppercase tracking-wider font-bold mb-0.5 text-[10px]">Equal Share</span>
                  <span className="font-medium text-foreground">
                    {sym}{(expense.total_amount / Math.max(1, participants.length)).toFixed(2)}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="uppercase tracking-wider font-bold mb-0.5 text-[10px]">Participants</span>
                  <span className="font-medium text-foreground">{participants.length}</span>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-0.5">
                  Who Owes Whom
                </h4>
                {transfers.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No transfers needed.</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {transfers.map((t, idx) => {
                      const isSettled = settledRecords.some(
                        s => s.debtor === t.debtor && s.creditor === t.creditor && s.amount === t.amount
                      );
                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all ${
                            isSettled
                              ? 'bg-white/20 dark:bg-white/5 border-white/10 opacity-55'
                              : 'glass-panel'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <span className="font-medium text-xs truncate">{t.debtor}</span>
                            <ArrowRight size={12} className="text-muted-foreground shrink-0" />
                            <span className="font-medium text-xs truncate">{t.creditor}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            {/* Amount color: green if settled, red if not */}
                            <span className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded-full border ${
                              isSettled
                                ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                : 'bg-red-500/10 text-red-500 border-red-500/20'
                            }`}>
                              {sym}{t.amount.toLocaleString()}
                            </span>
                            {isSettled ? (
                              <div className="bg-green-500/20 text-green-600 border border-green-500/20 px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1">
                                <Check size={10} strokeWidth={3} /> Done
                              </div>
                            ) : (
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  const newStatus = unsettledTransfers.length === 1 ? 'settled' : 'partial';
                                  settleTransaction.mutate({
                                    expense_id: expense.id,
                                    expense_title: expense.title,
                                    expense_date: expense.expense_date,
                                    debtor: t.debtor,
                                    creditor: t.creditor,
                                    amount: t.amount,
                                    settled_by: identity!,
                                    new_status: newStatus,
                                  });
                                }}
                                disabled={settleTransaction.isPending}
                                className="glass-button bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 px-2.5 py-1 rounded-xl text-[10px] font-bold"
                              >
                                Settle
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {unsettledTransfers.length > 0 && (
                <button
                  onClick={e => { e.stopPropagation(); onSettleSingle(); }}
                  className="w-full py-2 rounded-2xl text-xs font-bold glass-button-primary flex items-center justify-center gap-1.5"
                >
                  <Layers size={13} />
                  Settle This Expense
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Settlement page ──────────────────────────────────────────────────────────

export default function Settlement() {
  const { data: expenses } = useExpenses();
  const { settleMultiple } = useMutations();
  const { identity } = useAuth();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dialogExpenses, setDialogExpenses] = useState<ExpenseWithDetails[] | null>(null);

  const unsettledExpenses = expenses?.filter(e => e.status !== 'settled') || [];

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedExpenses = unsettledExpenses.filter(e => selectedIds.has(e.id));

  const handleConfirm = (raw: RawTransaction[]) => {
    settleMultiple.mutate(
      { transactions: raw, settled_by: identity! },
      {
        onSuccess: () => {
          setDialogExpenses(null);
          setSelectedIds(new Set());
        },
      }
    );
  };

  // "Settle Selected" — always visible in AppBar when there are unsettled expenses,
  // disabled/dimmed when nothing is checked
  const appBarAction = unsettledExpenses.length > 0 ? (
    <button
      onClick={() => selectedIds.size > 0 && setDialogExpenses(selectedExpenses)}
      disabled={selectedIds.size === 0}
      className={`px-3.5 h-9 rounded-full text-xs font-bold flex items-center gap-1.5 border-2 transition-all ${
        selectedIds.size > 0
          ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30 scale-100'
          : 'bg-transparent text-muted-foreground border-white/20 dark:border-white/15 opacity-45 cursor-default'
      }`}
    >
      <Check size={13} strokeWidth={selectedIds.size > 0 ? 2.5 : 2} />
      {selectedIds.size > 0 ? `Settle (${selectedIds.size})` : 'Settle Selected'}
    </button>
  ) : undefined;

  return (
    <div className="min-h-[100dvh] pt-24 pb-24 px-4 flex flex-col max-w-md mx-auto relative">
      <AppBar title="Settlement" action={appBarAction} />

      {unsettledExpenses.length > 0 ? (
        <div className="flex flex-col pt-1">
          {unsettledExpenses.map(expense => (
            <SettlementCard
              key={expense.id}
              expense={expense}
              isSelected={selectedIds.has(expense.id)}
              onToggleSelect={() => toggleSelect(expense.id)}
              onSettleSingle={() => setDialogExpenses([expense])}
            />
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
        {dialogExpenses && (
          <SettleConfirmDialog
            expenses={dialogExpenses}
            onConfirm={handleConfirm}
            onClose={() => setDialogExpenses(null)}
            isPending={settleMultiple.isPending}
          />
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
