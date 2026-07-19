import { useState, useMemo } from "react";
import { useMembers } from "@/hooks/useQueries";
import { useMutations } from "@/hooks/useMutations";
import { useAuth } from "@/hooks/useAuth";
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
    const updated = [...payers];
    updated[index] = { ...updated[index], [field]: value };
    setPayers(updated);
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
    setParticipants(
      participants.length === allMembersList.length ? [] : [...allMembersList]
    );
  };

  const toggleParticipant = (name: string) => {
    setParticipants(prev =>
      prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]
    );
  };

  const handleSubmit = () => {
    const totalAmount = parseFloat(amount);
    if (!title || isNaN(totalAmount) || totalAmount <= 0 || payers.length === 0 || participants.length === 0) {
      alert("Please fill all required fields and select participants.");
      return;
    }
    const payerTotal = payers.reduce((sum, p) => sum + p.amountPaid, 0);
    if (Math.abs(payerTotal - totalAmount) > 0.1) {
      alert(`Payer amounts (${payerTotal.toFixed(2)}) do not match total (${totalAmount.toFixed(2)})`);
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
      participants,
    }, { onSuccess: () => onClose() });
  };

  if (!isOpen) return null;

  const currencySymbol = currency === 'BDT' ? '৳' : currency === 'INR' ? '₹' : '$';

  return (
    /* Full-screen overlay — fixed, never scrolls */
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog — fixed size, no scroll, no drag */}
      <div
        className="relative w-full max-w-sm glass-panel-heavy rounded-3xl flex flex-col overflow-hidden"
        style={{ maxHeight: 'min(640px, 90dvh)' }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/20 dark:border-white/10 shrink-0">
          <h2 className="text-base font-bold tracking-tight">
            {editExpense ? 'Edit Expense' : 'Add Expense'}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center glass-button rounded-full text-muted-foreground"
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Body — NO overflow, everything fits ── */}
        <div className="px-5 py-3 flex flex-col gap-2.5 shrink-0">

          {editExpense && editExpense.status !== 'unsettled' && (
            <p className="text-[11px] text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2 font-medium leading-snug">
              This expense has settled transactions. Delete and recreate to edit.
            </p>
          )}

          {/* Title */}
          <input
            type="text"
            placeholder="What was it for?"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="glass-input w-full text-sm font-semibold placeholder:font-normal placeholder:text-muted-foreground"
            disabled={!!editExpense}
          />

          {/* Amount + Currency — same row, aligned edges */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm pointer-events-none select-none z-10">
                {currencySymbol}
              </span>
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="glass-input w-full pl-7 text-sm"
                disabled={!!editExpense}
              />
            </div>
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="glass-input w-[4.5rem] shrink-0 text-sm text-center appearance-none cursor-pointer"
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

          <div className="h-px bg-white/25 dark:bg-white/10" />

          {/* Temp Member — before Paid By */}
          {!editExpense && (
            <div className="flex gap-2">
              <input
                type="text"
                value={tempMemberInput}
                onChange={e => setTempMemberInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddTempMember()}
                placeholder="Add temp member (optional)…"
                className="glass-input flex-1 text-xs"
              />
              <button
                onClick={handleAddTempMember}
                className="glass-button px-3 rounded-xl text-xs font-semibold shrink-0"
              >
                Add
              </button>
            </div>
          )}

          <div className="h-px bg-white/25 dark:bg-white/10" />

          {/* Paid By */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Paid By</p>
            {payers.map((payer, idx) => (
              <div key={idx} className="flex gap-2">
                <select
                  value={payer.memberName}
                  onChange={e => handlePayerChange(idx, 'memberName', e.target.value)}
                  className="glass-input flex-1 min-w-0 text-xs"
                  disabled={!!editExpense}
                >
                  <option value="" disabled>Select member</option>
                  {allMembersList.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <input
                  type="number"
                  value={payer.amountPaid || ""}
                  onChange={e => handlePayerChange(idx, 'amountPaid', parseFloat(e.target.value) || 0)}
                  placeholder="Amount"
                  className="glass-input w-[4.5rem] shrink-0 text-xs"
                  disabled={!!editExpense}
                />
                {!editExpense && payers.length > 1 && (
                  <button
                    onClick={() => setPayers(p => p.filter((_, i) => i !== idx))}
                    className="w-8 shrink-0 flex items-center justify-center text-destructive"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            ))}
            {!editExpense && (
              <button
                onClick={() => setPayers(p => [...p, { memberName: "", amountPaid: 0 }])}
                className="text-primary text-[11px] font-semibold flex items-center gap-1 self-start"
              >
                <Plus size={11} /> Add payer
              </button>
            )}
          </div>

          <div className="h-px bg-white/25 dark:bg-white/10" />

          {/* Split Among */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Split Among</p>
              {!editExpense && (
                <button onClick={handleSelectAll} className="text-primary text-[11px] font-semibold">
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
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-left ${
                      isSelected
                        ? 'bg-primary/15 border-primary/40 text-foreground'
                        : 'bg-white/20 dark:bg-white/5 border-white/15 dark:border-white/8 text-muted-foreground'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? 'bg-primary border-primary text-white' : 'border-muted-foreground/40'
                    }`}>
                      {isSelected && <Check size={9} strokeWidth={3} />}
                    </div>
                    <span className="font-medium text-xs truncate">{name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-3.5 border-t border-white/20 dark:border-white/10 shrink-0">
          {!editExpense ? (
            <button
              onClick={handleSubmit}
              disabled={addExpense.isPending}
              className="w-full py-3 rounded-2xl glass-button-primary font-semibold text-sm flex items-center justify-center gap-2"
            >
              {addExpense.isPending ? <RefreshCw className="animate-spin" size={16} /> : 'Save Expense'}
            </button>
          ) : (
            <button
              onClick={() => {
                if (confirm("Delete this expense? This cannot be undone.")) {
                  deleteExpense.mutate(editExpense.id, { onSuccess: () => onClose() });
                }
              }}
              disabled={deleteExpense.isPending}
              className="w-full py-3 rounded-2xl bg-destructive/90 hover:bg-destructive text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-97"
            >
              {deleteExpense.isPending ? <RefreshCw className="animate-spin" size={16} /> : 'Delete Expense'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
