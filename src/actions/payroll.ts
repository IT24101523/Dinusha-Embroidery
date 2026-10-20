'use server';

import { supabaseAdmin } from '@/lib/supabase/admin';

export interface DbEmployee {
  id: string;
  epf_no: number;
  full_name: string;
  dob: string | null;
  gender: string | null;
  nic: string;
  address: string | null;
  phone: string | null;
  emergency_phone: string | null;
  role: string;
  basic_salary: number;
  is_active: boolean;
  created_at: string;
}

export interface DbPayrollRecord {
  id: string;
  month: string;
  employee_id: string | null;
  epf_no: number;
  name: string;
  nic: string;
  role: string;
  basic: number;
  prod_allow: number;
  grade_allow: number;
  att_allow: number;
  trans_allow: number;
  night_allow: number;
  ot_hours: number;
  ot_amt: number;
  sot_hours: number;
  sot_amt: number;
  gross: number;
  epf8: number;
  epf12: number;
  etf3: number;
  late_hours: number;
  late_deduction: number;
  unpaid_hours: number;
  unpaid_deduction: number;
  advance: number;
  total_deductions: number;
  net: number;
  created_at: string;
}

export async function fetchEmployees(): Promise<DbEmployee[]> {
  const { data, error } = await supabaseAdmin
    .from('employees')
    .select('*')
    .order('epf_no', { ascending: true });

  if (error) {
    console.error('fetchEmployees error:', error);
    return [];
  }
  return data || [];
}

export async function createEmployee(payload: {
  epf_no: number;
  full_name: string;
  dob?: string;
  gender?: string;
  nic: string;
  address?: string;
  phone?: string;
  emergency_phone?: string;
  role: string;
  basic_salary: number;
}) {
  const { data, error } = await supabaseAdmin
    .from('employees')
    .insert([payload])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateEmployee(id: string, payload: Partial<{
  full_name: string;
  dob: string;
  gender: string;
  nic: string;
  address: string;
  phone: string;
  emergency_phone: string;
  role: string;
  basic_salary: number;
}>) {
  const { data, error } = await supabaseAdmin
    .from('employees')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteEmployee(id: string) {
  const { error } = await supabaseAdmin.from('employees').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
}

export async function fetchPayrollRecords(month?: string): Promise<DbPayrollRecord[]> {
  let query = supabaseAdmin.from('payroll_records').select('*');
  if (month) {
    query = query.eq('month', month);
  }
  const { data, error } = await query.order('epf_no', { ascending: true });

  if (error) {
    console.error('fetchPayrollRecords error:', error);
    return [];
  }
  return data || [];
}

export async function savePayrollRecords(records: Omit<DbPayrollRecord, 'id' | 'created_at'>[]) {
  if (records.length === 0) return [];

  // Delete existing records for that month to prevent duplicates upon re-calculation
  const month = records[0].month;
  await supabaseAdmin.from('payroll_records').delete().eq('month', month);

  const { data, error } = await supabaseAdmin
    .from('payroll_records')
    .insert(records)
    .select();

  if (error) throw new Error(error.message);
  return data;
}
