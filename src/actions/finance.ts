'use server';

import { supabaseAdmin } from '@/lib/supabase/admin';

export interface DbFinanceTransaction {
  id: string;
  type: 'REVENUE' | 'COGS' | 'OPEX';
  transaction_date: string;
  machine?: string | null;
  style_code?: string | null;
  category?: string | null;
  description?: string | null;
  amount: number;
  qty?: number | null;
  bill_image_url?: string | null;
  created_at: string;
}

export async function fetchFinanceTransactions(type?: 'REVENUE' | 'COGS' | 'OPEX'): Promise<DbFinanceTransaction[]> {
  let query = supabaseAdmin.from('finance_transactions').select('*');
  if (type) {
    query = query.eq('type', type);
  }
  const { data, error } = await query.order('transaction_date', { ascending: false });

  if (error) {
    console.error('fetchFinanceTransactions error:', error);
    return [];
  }
  return data || [];
}

export async function createFinanceTransaction(payload: {
  type: 'REVENUE' | 'COGS' | 'OPEX';
  transaction_date: string;
  machine?: string;
  style_code?: string;
  category?: string;
  description?: string;
  amount: number;
  qty?: number;
  bill_image_url?: string | null;
}) {
  const { data, error } = await supabaseAdmin
    .from('finance_transactions')
    .insert([payload])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteFinanceTransaction(id: string) {
  const { error } = await supabaseAdmin
    .from('finance_transactions')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
  return true;
}
