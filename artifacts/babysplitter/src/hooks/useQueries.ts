import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { ExpenseWithDetails, Member, SettlementRecord, ChatMessage, Notification } from '@/types';

const PRESET_MEMBERS: Member[] = [
  { id: 'preset-1', original_name: 'Avraar', current_name: 'Avraar', is_preset: true, created_at: '' },
  { id: 'preset-2', original_name: 'Chetan', current_name: 'Chetan', is_preset: true, created_at: '' },
  { id: 'preset-3', original_name: 'Tenzing', current_name: 'Tenzing', is_preset: true, created_at: '' },
  { id: 'preset-4', original_name: 'Sanajaoba', current_name: 'Sanajaoba', is_preset: true, created_at: '' },
  { id: 'preset-5', original_name: 'Balbir', current_name: 'Balbir', is_preset: true, created_at: '' },
  { id: 'preset-6', original_name: 'Dhanaraj', current_name: 'Dhanaraj', is_preset: true, created_at: '' },
];

export function useMembers() {
  return useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const { data, error } = await supabase.from('members').select('*').order('created_at');
      if (error) {
        // Table doesn't exist yet — return preset members as fallback
        return PRESET_MEMBERS;
      }
      // If Supabase has no members yet, return preset fallback
      return (data && data.length > 0) ? data as Member[] : PRESET_MEMBERS;
    }
  });
}

export function useExpenses() {
  return useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data: expenses, error: exError } = await supabase.from('expenses').select('*').order('expense_date', { ascending: false }).order('created_at', { ascending: false });
      if (exError) {
         if (exError.code === '42P01') return [];
         throw exError;
      }
      
      const { data: payers, error: payError } = await supabase.from('expense_payers').select('*');
      if (payError) throw payError;
      
      const { data: participants, error: partError } = await supabase.from('expense_participants').select('*');
      if (partError) throw partError;
      
      const { data: settlements, error: setError } = await supabase.from('settlements').select('*').eq('is_undone', false);
      if (setError) throw setError;

      return expenses.map(ex => ({
        ...ex,
        payers: payers.filter(p => p.expense_id === ex.id),
        participants: participants.filter(p => p.expense_id === ex.id),
        settlements: settlements.filter(s => s.expense_id === ex.id)
      })) as ExpenseWithDetails[];
    }
  });
}

export function useSettlements() {
  return useQuery({
    queryKey: ['settlements'],
    queryFn: async () => {
      const { data, error } = await supabase.from('settlements').select('*').order('settled_at', { ascending: false });
      if (error) {
         if (error.code === '42P01') return [];
         throw error;
      }
      return data as SettlementRecord[];
    }
  });
}

export function useChatMessages() {
  return useQuery({
    queryKey: ['chat_messages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('chat_messages').select('*').order('created_at', { ascending: true });
      if (error) {
         if (error.code === '42P01') return [];
         throw error;
      }
      return data as ChatMessage[];
    }
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(20);
      if (error) {
         if (error.code === '42P01') return [];
         throw error;
      }
      return data as Notification[];
    }
  });
}
