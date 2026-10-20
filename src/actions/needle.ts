'use server';

import { supabaseAdmin } from '@/lib/supabase/admin';

export interface DbNeedleType {
  id: string;
  system: string;
  size: string;
  ref: string;
  point: string;
  stock: number;
  created_at: string;
}

export interface DbNeedleLog {
  id: string;
  log_date: string;
  style_no: string;
  epf_no: string;
  seam_location: string;
  size: string;
  needle_type: string;
  log_time: string;
  traced: string;
  mc_number: string;
  sign: string;
  action_type: 'BROKEN' | 'BLUNT' | 'MISSING' | 'SWITCH';
  created_at: string;
}

export async function fetchNeedleTypes(): Promise<DbNeedleType[]> {
  const { data, error } = await supabaseAdmin
    .from('needle_types')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('fetchNeedleTypes error:', error);
    return [];
  }
  return data || [];
}

export async function createNeedleType(payload: {
  system: string;
  size: string;
  ref: string;
  point: string;
  stock: number;
}) {
  const { data, error } = await supabaseAdmin
    .from('needle_types')
    .insert([payload])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateNeedleStock(id: string, delta: number) {
  // Read current stock
  const { data: current, error: readError } = await supabaseAdmin
    .from('needle_types')
    .select('stock')
    .eq('id', id)
    .single();

  if (readError) throw new Error(readError.message);

  const newStock = Math.max(0, (current?.stock || 0) + delta);
  const { data, error } = await supabaseAdmin
    .from('needle_types')
    .update({ stock: newStock, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteNeedleType(id: string) {
  const { error } = await supabaseAdmin.from('needle_types').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
}

export async function fetchNeedleLogs(): Promise<DbNeedleLog[]> {
  const { data, error } = await supabaseAdmin
    .from('needle_logs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('fetchNeedleLogs error:', error);
    return [];
  }
  return data || [];
}

export async function createNeedleLog(payload: {
  log_date: string;
  style_no: string;
  epf_no: string;
  seam_location: string;
  size: string;
  needle_type: string;
  log_time: string;
  traced: string;
  mc_number: string;
  sign: string;
  action_type: 'BROKEN' | 'BLUNT' | 'MISSING' | 'SWITCH';
}) {
  const { data, error } = await supabaseAdmin
    .from('needle_logs')
    .insert([payload])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteNeedleLog(id: string) {
  const { error } = await supabaseAdmin.from('needle_logs').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
}
