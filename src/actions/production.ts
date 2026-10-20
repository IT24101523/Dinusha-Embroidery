'use server';

import { supabaseAdmin } from '@/lib/supabase/admin';

export interface ProductionScheduleItem {
  id: string;
  machine_id: string;
  style_id: string;
  assignment_date: string;
  start_hour: number;
  span_hours: number;
  plan_qty: number;
  actual_qty: number;
  machine?: {
    id: string;
    machine_number: number;
    machine_name: string;
    status: string;
    operator_name: string | null;
    helper_name: string | null;
  };
  style?: {
    id: string;
    style_name: string;
    target_per_hour: number | null;
    client?: {
      id: string;
      name: string;
    };
  };
}

export interface MachineStyleBlock {
  styleName: string;
  clientName: string;
  clientColorScheme: string;
  startHour: number;
  spanHours: number;
  planQty: number;
  actualQty: number;
}

export interface MachineWithAssignments {
  id: string;
  machineNumber: number;
  machineName: string;
  brand: string | null;
  status: string;
  operatorName: string | null;
  helperName: string | null;
  styles: MachineStyleBlock[];
}

export interface StyleAggregate {
  styleName: string;
  clientName: string;
  clientColorScheme: string;
  totalPlan: number;
  totalActual: number;
}

export interface ProductionDashboardData {
  machines: MachineWithAssignments[];
  styleAggregates: StyleAggregate[];
  dateStr: string;
  totalPlan: number;
  totalActual: number;
  activeMachineCount: number;
}

export async function fetchProductionSchedule(dateStr?: string): Promise<ProductionScheduleItem[]> {
  const targetDate = dateStr || new Date().toISOString().split('T')[0];

  const { data, error } = await supabaseAdmin
    .from('production_assignments')
    .select('*, machine:machines(*), style:styles(*, client:clients(*))')
    .eq('assignment_date', targetDate)
    .order('start_hour', { ascending: true });

  if (error) {
    console.error('fetchProductionSchedule error:', error);
    return [];
  }

  return data || [];
}

export async function createProductionAssignment(payload: {
  machine_id: string;
  style_id: string;
  assignment_date: string;
  start_hour: number;
  span_hours: number;
  plan_qty: number;
  actual_qty?: number;
}) {
  const { data, error } = await supabaseAdmin
    .from('production_assignments')
    .insert([
      {
        machine_id: payload.machine_id,
        style_id: payload.style_id,
        assignment_date: payload.assignment_date,
        start_hour: payload.start_hour,
        span_hours: payload.span_hours,
        plan_qty: payload.plan_qty,
        actual_qty: payload.actual_qty || 0,
      },
    ])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateProductionActualQty(id: string, actual_qty: number) {
  const { data, error } = await supabaseAdmin
    .from('production_assignments')
    .update({ actual_qty })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteProductionAssignment(id: string) {
  const { error } = await supabaseAdmin
    .from('production_assignments')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
  return true;
}
