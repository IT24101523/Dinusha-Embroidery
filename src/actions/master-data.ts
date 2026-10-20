'use server';

import { supabaseAdmin } from '@/lib/supabase/admin';

export interface DbMachine {
  id: string;
  machine_number: number;
  machine_name: string;
  brand: string | null;
  heads: number | null;
  speed: number | null;
  status: 'RUNNING' | 'SETUP' | 'MAINTENANCE' | 'IDLE';
  operator_name: string | null;
  helper_name: string | null;
  is_active: boolean;
}

export interface DbClient {
  id: string;
  name: string;
  color_scheme: string;
  is_active: boolean;
}

export interface DbStyle {
  id: string;
  client_id: string;
  style_name: string;
  target_per_hour: number | null;
  is_active: boolean;
  client?: DbClient;
}

// MACHINES
export async function fetchDbMachines(): Promise<DbMachine[]> {
  const { data, error } = await supabaseAdmin
    .from('machines')
    .select('*')
    .order('machine_number', { ascending: true });

  if (error) {
    console.error('fetchDbMachines error:', error);
    return [];
  }
  return data || [];
}

export async function createDbMachine(payload: {
  machine_number: number;
  machine_name: string;
  brand?: string;
  heads?: number;
  speed?: number;
  status?: 'RUNNING' | 'SETUP' | 'MAINTENANCE' | 'IDLE';
}) {
  const { data, error } = await supabaseAdmin
    .from('machines')
    .insert([
      {
        machine_number: payload.machine_number,
        machine_name: payload.machine_name,
        brand: payload.brand || 'Tajima',
        heads: payload.heads || 15,
        speed: payload.speed || 1000,
        status: payload.status || 'IDLE',
        is_active: true,
      },
    ])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateDbMachine(
  id: string,
  payload: Partial<{
    machine_number: number;
    machine_name: string;
    brand: string;
    heads: number;
    speed: number;
    status: 'RUNNING' | 'SETUP' | 'MAINTENANCE' | 'IDLE';
    operator_name: string | null;
    helper_name: string | null;
    is_active: boolean;
  }>
) {
  const { data, error } = await supabaseAdmin
    .from('machines')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteDbMachine(id: string) {
  const { error } = await supabaseAdmin.from('machines').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
}

// CLIENTS
export async function fetchDbClients(): Promise<DbClient[]> {
  const { data, error } = await supabaseAdmin
    .from('clients')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('fetchDbClients error:', error);
    return [];
  }
  return data || [];
}

export async function createDbClient(name: string, color_scheme: string = 'slate') {
  const { data, error } = await supabaseAdmin
    .from('clients')
    .insert([{ name, color_scheme, is_active: true }])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteDbClient(id: string) {
  const { error } = await supabaseAdmin.from('clients').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
}

// STYLES
export async function fetchDbStyles(): Promise<DbStyle[]> {
  const { data, error } = await supabaseAdmin
    .from('styles')
    .select('*, client:clients(*)')
    .order('style_name', { ascending: true });

  if (error) {
    console.error('fetchDbStyles error:', error);
    return [];
  }
  return data || [];
}

export async function createDbStyle(payload: {
  client_id: string;
  style_name: string;
  target_per_hour?: number;
}) {
  const { data, error } = await supabaseAdmin
    .from('styles')
    .insert([
      {
        client_id: payload.client_id,
        style_name: payload.style_name,
        target_per_hour: payload.target_per_hour || 20,
        is_active: true,
      },
    ])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteDbStyle(id: string) {
  const { error } = await supabaseAdmin.from('styles').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
}
