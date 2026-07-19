export type Member = {
  id: string;
  original_name: string;
  current_name: string;
  is_preset: boolean;
  created_at: string;
};

export type Expense = {
  id: string;
  title: string;
  total_amount: number;
  currency: string;
  expense_date: string;
  created_by: string;
  status: 'unsettled' | 'partial' | 'settled';
  temp_members: string[];
  created_at: string;
  updated_at: string;
};

export type ExpensePayer = {
  id: string;
  expense_id: string;
  member_name: string;
  amount_paid: number;
};

export type ExpenseParticipant = {
  id: string;
  expense_id: string;
  member_name: string;
};

export type SettlementRecord = {
  id: string;
  expense_id: string;
  debtor: string;
  creditor: string;
  amount: number;
  settled_at: string;
  settled_by: string;
  settlement_type: 'full' | 'partial';
  expense_title: string;
  expense_date: string;
  is_undone: boolean;
};

export type ChatMessage = {
  id: string;
  member_name: string;
  message: string;
  created_at: string;
};

export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  created_at: string;
  read_by: string[];
};

// Joined type for UI
export type ExpenseWithDetails = Expense & {
  payers: ExpensePayer[];
  participants: ExpenseParticipant[];
  settlements: SettlementRecord[];
};
