import { supabase } from '@/lib/supabase';
import type { Transaction } from '@/types/database';

export async function getTransactions(buId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('business_unit_id', buId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createTransaction(payload: Partial<Transaction>): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .insert(payload)
    .select()
    .single();

  if (error || !data) throw error ?? new Error('Failed to create transaction');
  return data;
}

export async function updateTransaction(id: string, payload: Partial<Transaction>): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) throw error ?? new Error('Failed to update transaction');
  return data;
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getContractProfitability(contractId: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('contract_id', contractId)
    .order('date', { ascending: false });

  if (error) throw error;
  
  const transactions = (data ?? []) as Transaction[];
  const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
  
  const netProfit = income - expense;
  // If there's income, standard margin. If no income but expenses, -100%. If none, 0%.
  const margin = income > 0 
    ? (netProfit / income) * 100 
    : (expense > 0 ? -100 : 0);

  return { income, expense, netProfit, margin, transactions };
}
