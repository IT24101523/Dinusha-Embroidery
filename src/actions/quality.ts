'use server';

import { supabaseAdmin } from '@/lib/supabase/admin';

export interface DbQualityAssignment {
  id: string;
  checker_name: string;
  client_name: string;
  style_name: string;
  assignment_date: string;
  start_hour: number;
  span_hours: number;
  plan_qty: number;
  actual_qty: number;
  status: string;
  created_at: string;
}

export async function fetchQualityAssignments(dateStr?: string): Promise<DbQualityAssignment[]> {
  const targetDate = dateStr || new Date().toISOString().split('T')[0];

  const { data, error } = await supabaseAdmin
    .from('quality_assignments')
    .select('*')
    .eq('assignment_date', targetDate)
    .order('start_hour', { ascending: true });

  if (error) {
    console.error('fetchQualityAssignments error:', error);
    return [];
  }
  return data || [];
}

export async function createQualityAssignment(payload: {
  checker_name: string;
  client_name: string;
  style_name: string;
  assignment_date: string;
  start_hour: number;
  span_hours: number;
  plan_qty: number;
  actual_qty?: number;
}) {
  const { data, error } = await supabaseAdmin
    .from('quality_assignments')
    .insert([
      {
        checker_name: payload.checker_name,
        client_name: payload.client_name,
        style_name: payload.style_name,
        assignment_date: payload.assignment_date,
        start_hour: payload.start_hour,
        span_hours: payload.span_hours,
        plan_qty: payload.plan_qty,
        actual_qty: payload.actual_qty || 0,
        status: 'ACTIVE',
      },
    ])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateQualityActualQty(id: string, actual_qty: number) {
  const { data, error } = await supabaseAdmin
    .from('quality_assignments')
    .update({ actual_qty, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteQualityAssignment(id: string) {
  const { error } = await supabaseAdmin
    .from('quality_assignments')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
  return true;
}
