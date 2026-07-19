import { useState, useMemo } from "react";
import { useMembers } from "@/hooks/useQueries";
import { useMutations } from "@/hooks/useMutations";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Check, RefreshCw } from "lucide-react";
import { ExpenseWithDetails } from "@/types";
import { Payer } from "@/lib/settlementEngine";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  editExpense?: ExpenseWithDetails | null;
};

export function AddExpenseModal({ isOpen, onClose, editExpense }: Props) {
  const { identity } = useAuth();
  const { data: members } = useMembers();
  const { addExpense, deleteExpense } = useMutations();
  
  const [title, setTitle] = useState(editExpense?.title || "");
  const [amount, setAmount] = useState(editExpense?.total_amount.toString() || "");
  const [currency, setCurrency] = useState(editExpense?.currency || "BDT");
  const [date, setDate] = useState(
    editExpense
      ? new Date(editExpense.expense_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  
  const [tempMemberInput, setTempMemberInput] = useState("");
  const [tempMembers, setTempMembers] = useState<string[]>(editExpense?.temp_members || []);
  
  const allMembersList = useMemo(() => {
    const dbMembers = (members || []).map(m => m.current_name);
    return [...new Set([...dbMembers, ...tempMembers])];
  }, [members, tempMembers]);

  const [payers, setPayers] = useState<Payer[]>(
    editExpense?.payers.map(p => ({ memberName: p.member_name, amountPaid: p.amount_paid })) ||
    [{ memberName: identity || "", amountPaid: 0 }]
  );
  
  const [participants, setParticipants] = useState<string[]>(
    editExpense?.participants.map(p => p.member_name) || []
  );

  const handlePayerChange = (index: number, field: keyof Payer, value: string | number) => {
    const newPayers = [...payers];
    newPayers[index] = { ...newPayers[index], [field]: value };
    setPayers(newPayers);
    if (field === 'memberName' && typeof value === 'string' && value && !participants.includes(value)) {
      setParticipants(prev => [...prev, value]);
    }
  };

  const handleAddTempMember = () => {
    const name = tempMemberInput.trim();
    if (name && !allMembersList.includes(name)) {
      setTempMembers(prev => [...prev, name]);
      setParticipants(prev => [...prev, name]);
      setTempMemberInput("");
    }
  };

  const handleSelectAll = () => {
    if (participants.length === allMembersList.length) {
      setParticipants([]);
    } else {
      setParticipants(allMembersList);
    }
  };

  const toggleParticipant = (name: string) => {
    setParticipants(prev =>
      prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]
    );
  };

  const isSubmitting = addExpense.isPending;

  const handleSubmit = () => {
    const totalAmount = parseFloat(amount);
    if (!title || isNaN(totalAmount) || totalAmount <= 0 || payers.length === 0 || participants.length === 0) {
      alert("Please fill all required fields and select participants.");
      return;
    }
    const payerTotal = payers.reduce((sum, p) => sum + p.amountPaid, 0);
    if (Math.abs(payerTotal - totalAmount) > 0.1) {
      alert(`Payer amounts (${payerTotal}) do not match total amount (${totalAmount})`);
      return;
    }
    addExpense.mutate({
      title,
      total_amount: totalAmount,
      currency,
      expense_date: date,
      created_by: identity!,
      temp_members: tempMembers,
      payers: payers.filter(p => p.amountPaid > 0),
      participants
    }, { onSuccess: () => onClose() });
  };

  if (!isOpen) return null;

  const currencySymbol = currency === 'BDT' ? '৳' : currency === 'INR' ? '₹' : '$';

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 dark:bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative w-full max-w-md mx-auto glass-panel-heavy rounded-t-3xl sm:rounded-3xl flex flex-col"
        style={{ maxHeight: '92dvh' }}
      >
        {/* Header — fixed */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/20 dark:border-white/10 shrink-0">
          <h2 className="text-lg font-bold tracking-tight">
            {editExpense ? 'Edit Expense' : 'Add Expense'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center glass-button rounded-full text-muted-foreground"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto hide-scrollbar px-5 py-4 flex flex-col gap-3 min-h-0">

          {editExpense && editExpense.status !== 'unsettled' && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-2xl text-xs font-medium border border-destructive/20 leading-relaxed">
              Warning: This expense has settled transactions. Delete and recreate to make changes.
            </div>
          )}

          {/* Title */}
          <input
            type="text"
            placeholder="What was it for?"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="glass-input w-full text-base font-semibold placeholder:font-normal placeholder:text-muted-foreground"
            disabled={!!editExpense}
          />

          {/* Amount row */}
          <div className="flex gap-2 items-center">
            <div className="relative flex-1 min-w-0">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm pointer-events-none select-none z-10">
                {currencySymbol}
              </span>
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="glass-input w-full pl-8 text-sm"
                disabled={!!editExpense}
              />
            </div>
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="glass-input w-20 shrink-0 text-sm text-center appearance-none"
              disabled={!!editExpense}
            >
              <option value="BDT">BDT</option>
              <option value="INR">INR</option>
              <option value="USD">USD</option>
            </select>
          </div>

          {/* Date */}
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="glass-input w-full text-sm"
            disabled={!!editExpense}
          />

          <div className="h-px bg-white/30 dark:bg-white/10 my-1" />

          {/* Temp member — BEFORE Paid By */}
          {!editExpense && (
            <div className="flex flex-col gap-1.5">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-0.5">
                Temporary Member
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tempMemberInput}
                  onChange={e => setTempMemberInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddTempMember()}
                  placeholder="Add a one-off person..."
                  className="glass-input flex-1 text-sm"
                />
                <button
                  onClick={handleAddTempMember}
                  className="glass-button px-4 rounded-xl text-sm font-semibold"
                >
                  Add
                </button>
              </div>
              {tempMembers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {tempMembers.map(name => (
                    <span
                      key={name}
                      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-medium"
                    >
                      {name}
                      <button
                        onClick={() => setTempMembers(p => p.filter(n => n !== name))}
                        className="ml-0.5 opacity-60 hover:opacity-100"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="h-px bg-white/30 dark:bg-white/10 my-1" />

          {/* Paid By */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-0.5">
              Paid By
            </h3>
            {payers.map((payer, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <select
                  value={payer.memberName}
                  onChange={e => handlePayerChange(idx, 'memberName', e.target.value)}
                  className="glass-input flex-1 min-w-0 text-sm"
                  disabled={!!editExpense}
                >
                  <option value="" disabled>Select member</option>
                  {allMembersList.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={payer.amountPaid || ""}
                  onChange={e => handlePayerChange(idx, 'amountPaid', parseFloat(e.target.value) || 0)}
                  placeholder="Amount"
                  className="glass-input w-24 shrink-0 text-sm"
                  disabled={!!editExpense}
                />
                {!editExpense && payers.length > 1 && (
                  <button
                    onClick={() => setPayers(p => p.filter((_, i) => i !== idx))}
                    className="w-7 h-7 flex items-center justify-center text-destructive shrink-0"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            ))}
            {!editExpense && (
              <button
                onClick={() => setPayers(p => [...p, { memberName: "", amountPaid: 0 }])}
                className="text-primary text-xs font-semibold flex items-center gap-1 self-start px-0.5"
              >
                <Plus size={13} /> Add another payer
              </button>
            )}
          </div>

          <div className="h-px bg-white/30 dark:bg-white/10 my-1" />

          {/* Split Among */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-0.5">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Split Among
              </h3>
              {!editExpense && (
                <button onClick={handleSelectAll} className="text-primary text-xs font-semibold">
                  {participants.length === allMembersList.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {allMembersList.map(name => {
                const isSelected = participants.includes(name);
                return (
                  <button
                    key={name}
                    disabled={!!editExpense}
                    onClick={() => toggleParticipant(name)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl border transition-all text-left ${
                      isSelected
                        ? 'bg-primary/15 border-primary/40 text-foreground'
                        : 'bg-white/20 dark:bg-white/5 border-white/20 dark:border-white/8 text-muted-foreground'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-primary border-primary text-white' : 'border-muted-foreground/40'
                    }`}>
                      {isSelected && <Check size={10} strokeWidth={3} />}
                    </div>
                    <span className="font-medium text-sm truncate">{name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer — fixed */}
        <div className="px-5 py-4 border-t border-white/20 dark:border-white/10 shrink-0">
          {!editExpense ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl glass-button-primary font-semibold text-base flex items-center justify-center gap-2"
            >
              {isSubmitting ? <RefreshCw className="animate-spin" size={18} /> : 'Save Expense'}
            </button>
          ) : (
            <button
              onClick={() => {
                if (confirm("Delete this expense? This cannot be undone.")) {
                  deleteExpense.mutate(editExpense.id, { onSuccess: () => onClose() });
                }
              }}
              disabled={deleteExpense.isPending}
              className="w-full py-3.5 rounded-2xl bg-destructive/90 hover:bg-destructive text-white font-semibold text-base flex items-center justify-center gap-2 transition-all active:scale-97"
            >
              {deleteExpense.isPending ? <RefreshCw className="animate-spin" size={18} /> : 'Delete Expense'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
