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
  created_at?: string;
  updated_at?: string;
}

export async function fetchEmployees(): Promise<DbEmployee[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('employees')
      .select('*')
      .order('epf_no', { ascending: true });

    if (error) {
      console.error('fetchEmployees error:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Failed to fetch employees:', err);
    return [];
  }
}

export async function createEmployee(payload: {
  epf_no: number;
  full_name: string;
  dob?: string | null;
  gender?: string | null;
  nic: string;
  address?: string | null;
  phone?: string | null;
  emergency_phone?: string | null;
  role: string;
  basic_salary?: number;
  is_active?: boolean;
}) {
  const { data, error } = await supabaseAdmin
    .from('employees')
    .insert([
      {
        epf_no: payload.epf_no,
        full_name: payload.full_name,
        dob: payload.dob || null,
        gender: payload.gender || null,
        nic: payload.nic,
        address: payload.address || null,
        phone: payload.phone || null,
        emergency_phone: payload.emergency_phone || null,
        role: payload.role,
        basic_salary: payload.basic_salary || 0,
        is_active: payload.is_active !== undefined ? payload.is_active : true,
      },
    ])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateEmployee(
  id: string,
  payload: Partial<{
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
  }>
) {
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
