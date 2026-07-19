import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Payer } from '@/lib/settlementEngine';

export function useMutations() {
  const queryClient = useQueryClient();

  const addExpense = useMutation({
    mutationFn: async (params: {
      title: string;
      total_amount: number;
      currency: string;
      expense_date: string;
      created_by: string;
      temp_members: string[];
      payers: Payer[];
      participants: string[];
    }) => {
      const { data: exp, error: exError } = await supabase.from('expenses').insert({
        title: params.title,
        total_amount: params.total_amount,
        currency: params.currency,
        expense_date: params.expense_date,
        created_by: params.created_by,
        temp_members: params.temp_members,
        status: 'unsettled'
      }).select().single();
      if (exError) throw exError;

      const payerRecords = params.payers.map(p => ({
        expense_id: exp.id,
        member_name: p.memberName,
        amount_paid: p.amountPaid
      }));
      const { error: payError } = await supabase.from('expense_payers').insert(payerRecords);
      if (payError) throw payError;

      const partRecords = params.participants.map(name => ({
        expense_id: exp.id,
        member_name: name
      }));
      const { error: partError } = await supabase.from('expense_participants').insert(partRecords);
      if (partError) throw partError;

      // Add Notification
      await supabase.from('notifications').insert({
        type: 'expense_added',
        title: 'New Expense',
        body: `${params.created_by} added ${params.title} (${params.currency} ${params.total_amount})`
      });

      return exp;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    }
  });

  const resetExpense = useMutation({
    mutationFn: async (id: string) => {
      // mark all settlements as undone for this expense
      await supabase.from('settlements').update({ is_undone: true }).eq('expense_id', id);
      const { error } = await supabase.from('expenses').update({ status: 'unsettled' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
    }
  });

  const settleTransaction = useMutation({
    mutationFn: async (params: {
      expense_id: string;
      expense_title: string;
      expense_date: string;
      debtor: string;
      creditor: string;
      amount: number;
      settled_by: string;
      new_status: 'partial' | 'settled';
    }) => {
      const { error: sError } = await supabase.from('settlements').insert({
        expense_id: params.expense_id,
        expense_title: params.expense_title,
        expense_date: params.expense_date,
        debtor: params.debtor,
        creditor: params.creditor,
        amount: params.amount,
        settled_by: params.settled_by,
        settlement_type: 'partial'
      });
      if (sError) throw sError;

      const { error: eError } = await supabase.from('expenses').update({ status: params.new_status }).eq('id', params.expense_id);
      if (eError) throw eError;
      
      await supabase.from('notifications').insert({
        type: 'settlement',
        title: 'Settled',
        body: `${params.settled_by} settled ${params.debtor} to ${params.creditor} for ${params.expense_title}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
    }
  });

  const settleMultiple = useMutation({
    mutationFn: async (params: {
      transactions: Array<{
        expense_id: string;
        expense_title: string;
        expense_date: string;
        debtor: string;
        creditor: string;
        amount: number;
        new_status: 'partial' | 'settled';
      }>;
      settled_by: string;
    }) => {
      for (const t of params.transactions) {
        await supabase.from('settlements').insert({
          expense_id: t.expense_id,
          expense_title: t.expense_title,
          expense_date: t.expense_date,
          debtor: t.debtor,
          creditor: t.creditor,
          amount: t.amount,
          settled_by: params.settled_by,
          settlement_type: 'full'
        });
        await supabase.from('expenses').update({ status: t.new_status }).eq('id', t.expense_id);
      }
      
      await supabase.from('notifications').insert({
        type: 'settlement',
        title: 'Multiple Settled',
        body: `${params.settled_by} settled ${params.transactions.length} transactions`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
    }
  });

  const undoSettlement = useMutation({
    mutationFn: async (params: { id: string, expense_id: string, undone_by: string }) => {
      await supabase.from('settlements').update({ is_undone: true }).eq('id', params.id);
      
      // check if any other active settlements exist for this expense
      const { data: remaining } = await supabase.from('settlements').select('id').eq('expense_id', params.expense_id).eq('is_undone', false);
      const newStatus = remaining && remaining.length > 0 ? 'partial' : 'unsettled';
      await supabase.from('expenses').update({ status: newStatus }).eq('id', params.expense_id);
      
      await supabase.from('notifications').insert({
        type: 'settlement_undo',
        title: 'Settlement Undone',
        body: `Settlement undone by ${params.undone_by}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
    }
  });

  const sendChatMessage = useMutation({
    mutationFn: async (params: { member_name: string; message: string }) => {
      const { error } = await supabase.from('chat_messages').insert(params);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat_messages'] });
    }
  });

  const addMember = useMutation({
    mutationFn: async (params: { original_name: string; current_name: string }) => {
      const { error } = await supabase.from('members').insert({
        ...params,
        is_preset: false
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    }
  });

  const renameMember = useMutation({
    mutationFn: async (params: { id: string; current_name: string }) => {
      const { error } = await supabase.from('members').update({ current_name: params.current_name }).eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    }
  });
  
  const deleteMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('members').delete().eq('id', id).eq('is_preset', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    }
  });

  return {
    addExpense,
    deleteExpense,
    resetExpense,
    settleTransaction,
    settleMultiple,
    undoSettlement,
    sendChatMessage,
    addMember,
    renameMember,
    deleteMember
  };
}