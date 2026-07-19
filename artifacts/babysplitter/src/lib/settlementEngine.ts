export type Payer = { memberName: string; amountPaid: number };
export type Transfer = { debtor: string; creditor: string; amount: number };

export function calculateTransfers(
  totalAmount: number,
  payers: Payer[],
  participants: string[]
): Transfer[] {
  if (participants.length === 0 || totalAmount === 0) return [];
  
  const equalShare = totalAmount / participants.length;
  
  // Calculate balances (positive = gets money back, negative = owes money)
  const balances: Record<string, number> = {};
  
  participants.forEach(p => balances[p] = -equalShare);
  
  payers.forEach(p => {
    if (balances[p.memberName] !== undefined) {
      balances[p.memberName] += p.amountPaid;
    } else {
      balances[p.memberName] = p.amountPaid;
    }
  });

  const debtors = Object.entries(balances)
    .filter(([_, balance]) => balance < -0.01)
    .map(([name, balance]) => ({ name, balance: Math.abs(balance) }))
    .sort((a, b) => b.balance - a.balance);
    
  const creditors = Object.entries(balances)
    .filter(([_, balance]) => balance > 0.01)
    .map(([name, balance]) => ({ name, balance }))
    .sort((a, b) => b.balance - a.balance);

  const transfers: Transfer[] = [];
  
  let i = 0; // debtors index
  let j = 0; // creditors index
  
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    
    const amount = Math.min(debtor.balance, creditor.balance);
    
    transfers.push({
      debtor: debtor.name,
      creditor: creditor.name,
      amount: parseFloat(amount.toFixed(2))
    });
    
    debtor.balance -= amount;
    creditor.balance -= amount;
    
    if (debtor.balance < 0.01) i++;
    if (creditor.balance < 0.01) j++;
  }
  
  return transfers;
}
