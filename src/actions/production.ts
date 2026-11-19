'use server';

import { supabaseAdmin, formatSupabaseError } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export interface ClientCompanyEntity {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address?: string;
  colorScheme: string;
  isActive: boolean;
}

export type EmbroideryTypeOption = 'Normal' | 'Chenille' | 'Sequence';
export type MachineOperationalStatus = 'Active' | 'Setup' | 'Maintenance';

export interface MachineEntity {
  id: string;
  machineNumber: number | null;
  name: string;
  brand: string;
  heads: number;
  speed: number;
  embroideryTypes: EmbroideryTypeOption[];
  status: MachineOperationalStatus;
  operatorName: string;
  helperName: string;
  isActive: boolean;
}

export interface StyleThreadItem {
  color: string;
  shade: string;
  brand: string;
  mLen: number;
  cLen: number;
}

export interface StylePartItem {
  name: string;
  qty: number;
  backing: string;
  needle: string;
  threads: StyleThreadItem[];
}

export interface StyleSizeItem {
  size: string;
  qty: number;
}

export interface StyleMasterEntity {
  id: string;
  clientId: string | null;
  code: string;
  company: string;
  name: string;
  fabric: string;
  target: number;
  currency: string;
  price: number;
  qty: number;
  sizeBreakdown: StyleSizeItem[];
  parts: StylePartItem[];
  isCompleted: boolean;
  completedAt: string | null;
  isActive: boolean;
}

export interface ProductionBlockEntity {
  id: string;
  machineId: string | null;
  machineName: string;
  styleId: string | null;
  styleCode: string;
  styleName: string;
  partName: string;
  clientName: string;
  date: string;
  shift: string;
  size: string;
  startHour: number; // 1..11 (representing column 1..11 for 08:00..18:00)
  spanHours: number; // 1..11
  planQty: number;
  actualQty: number;
  operatorName: string;
  helperName: string;
}

export interface ProductionBundle {
  companies: ClientCompanyEntity[];
  machines: MachineEntity[];
  styles: StyleMasterEntity[];
  plans: ProductionBlockEntity[];
  needles?: string[];
}

const COLOR_SCHEMES = ['indigo', 'amber', 'emerald', 'purple', 'rose', 'cyan', 'blue'];

function mapCompany(row: Record<string, unknown>, idx = 0): ClientCompanyEntity {
  const rawContact = String(row.contact_person || '');
  const [contactPart, packedAddress] = rawContact.includes(' ||| ')
    ? rawContact.split(' ||| ')
    : [rawContact, ''];
  const address = String(row.address || packedAddress || '').trim();
  return {
    id: String(row.id),
    name: String(row.name || ''),
    contactPerson: contactPart.trim(),
    email: String(row.email || ''),
    phone: String(row.phone || ''),
    address,
    colorScheme: String(row.color_scheme || COLOR_SCHEMES[idx % COLOR_SCHEMES.length]),
    isActive: row.is_active !== false,
  };
}

function mapMachine(row: Record<string, unknown>): MachineEntity {
  let types: EmbroideryTypeOption[] = ['Normal'];
  if (Array.isArray(row.embroidery_types)) {
    types = row.embroidery_types.filter(
      (t): t is EmbroideryTypeOption => t === 'Normal' || t === 'Chenille' || t === 'Sequence'
    );
    if (types.length === 0) types = ['Normal'];
  }
  const rawOpStatus = String(row.operational_status || '');
  const dbEnumStatus = String(row.status || 'RUNNING');
  let status: MachineOperationalStatus = 'Active';
  if (rawOpStatus === 'Maintenance' || dbEnumStatus === 'MAINTENANCE') {
    status = 'Maintenance';
  } else if (rawOpStatus === 'Setup' || dbEnumStatus === 'SETUP') {
    status = 'Setup';
  }

  return {
    id: String(row.id),
    machineNumber: row.machine_number !== null && row.machine_number !== undefined ? Number(row.machine_number) : null,
    name: String(row.machine_name || ''),
    brand: String(row.brand || 'Tajima'),
    heads: Number(row.heads || 15),
    speed: Number(row.speed || 1000),
    embroideryTypes: types,
    status,
    operatorName: String(row.operator_name || ''),
    helperName: String(row.helper_name || 'None'),
    isActive: row.is_active !== false,
  };
}

function mapStyle(
  row: Record<string, unknown>,
  clientsById?: Map<string, string>
): StyleMasterEntity {
  let parts: StylePartItem[] = [];
  if (Array.isArray(row.parts)) {
    parts = row.parts.map((p: Record<string, unknown>) => ({
      name: String(p.name || ''),
      qty: Math.max(1, Number(p.qty || 1)),
      backing: String(p.backing || 'Tearaway (Standard)'),
      needle: String(p.needle || ''),
      threads: Array.isArray(p.threads)
        ? p.threads.map((t: Record<string, unknown>) => ({
            color: String(t.color || ''),
            shade: String(t.shade || ''),
            brand: String(t.brand || 'Madeira'),
            mLen: Number(t.mLen || 0),
            cLen: Number(t.cLen || 5000),
          }))
        : [],
    }));
  }

  let sizeBreakdown: StyleSizeItem[] = [];
  if (Array.isArray(row.size_breakdown)) {
    sizeBreakdown = row.size_breakdown
      .map((sz: Record<string, unknown>) => ({
        size: String(sz.size || '').trim(),
        qty: Math.max(0, Math.round(Number(sz.qty || 0))),
      }))
      .filter((sz) => sz.size && sz.qty > 0);
  }

  const clientIdStr = row.client_id ? String(row.client_id) : null;
  const resolvedCompany =
    String(row.company_name || '').trim() ||
    (clientIdStr && clientsById?.get(clientIdStr)) ||
    '';

  return {
    id: String(row.id),
    clientId: clientIdStr,
    code: String(row.style_code || ''),
    company: resolvedCompany,
    name: String(row.style_name || ''),
    fabric: String(row.fabric_color || 'White'),
    target: Number(row.target_per_hour || 20),
    currency: String(row.currency || 'LKR'),
    price: Number(row.garment_price || 0),
    qty: Number(row.order_qty || 1000),
    sizeBreakdown,
    parts,
    isCompleted: row.is_completed === true,
    completedAt: row.completed_at ? String(row.completed_at) : null,
    isActive: row.is_active !== false,
  };
}

function mapPlan(row: Record<string, unknown>): ProductionBlockEntity {
  return {
    id: String(row.id),
    machineId: row.machine_id ? String(row.machine_id) : null,
    machineName: String(row.machine_name || ''),
    styleId: row.style_id ? String(row.style_id) : null,
    styleCode: String(row.style_code || ''),
    styleName: String(row.style_name || ''),
    partName: String(row.part_name || ''),
    clientName: String(row.client_name || ''),
    date: String(row.assignment_date || new Date().toISOString().split('T')[0]),
    shift: String(row.shift || 'day'),
    size: String(row.garment_size || 'L'),
    startHour: Math.min(11, Math.max(1, Number(row.start_hour || 1))),
    spanHours: Math.min(11, Math.max(1, Number(row.span_hours || 1))),
    planQty: Math.max(0, Number(row.plan_qty || 0)),
    actualQty: Math.max(0, Number(row.actual_qty || 0)),
    operatorName: String(row.operator_name || ''),
    helperName: String(row.helper_name || 'None'),
  };
}

export async function fetchProductionBundleAction(): Promise<{
  success: boolean;
  data?: ProductionBundle;
  error?: string;
}> {
  try {
    const [clientsRes, machinesRes, stylesRes, plansRes, needlesRes] = await Promise.all([
      supabaseAdmin
        .from('clients')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true }),
      supabaseAdmin
        .from('machines')
        .select('*')
        .eq('is_active', true)
        .order('machine_number', { ascending: true, nullsFirst: false })
        .order('machine_name', { ascending: true }),
      supabaseAdmin
        .from('styles')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('production_assignments')
        .select('*')
        .order('assignment_date', { ascending: false })
        .order('start_hour', { ascending: true }),
      supabaseAdmin
        .from('needle_types')
        .select('*')
        .order('created_at', { ascending: true }),
    ]);

    if (clientsRes.error) throw new Error(formatSupabaseError(clientsRes.error));
    if (machinesRes.error) throw new Error(formatSupabaseError(machinesRes.error));
    if (stylesRes.error) throw new Error(formatSupabaseError(stylesRes.error));
    if (plansRes.error) throw new Error(formatSupabaseError(plansRes.error));

    const companies = (clientsRes.data || []).map((r, i) => mapCompany(r, i));
    const clientsById = new Map<string, string>(
      companies.map((c) => [c.id, c.name])
    );

    const dbNeedles = Array.from(
      new Set(
        (needlesRes.data || [])
          .filter((n: Record<string, unknown>) => n.system && n.size)
          .map((n: Record<string, unknown>) => `${String(n.system)} / ${String(n.size)}`)
      )
    );

    return {
      success: true,
      data: {
        companies,
        machines: (machinesRes.data || []).map(mapMachine),
        styles: (stylesRes.data || []).map((r) => mapStyle(r, clientsById)),
        plans: (plansRes.data || []).map(mapPlan),
        needles: dbNeedles,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch production data',
    };
  }
}

export async function saveCompanyAction(
  payload: {
    name: string;
    contactPerson: string;
    email: string;
    phone: string;
    address?: string;
    colorScheme?: string;
  },
  id?: string
): Promise<{ success: boolean; company?: ClientCompanyEntity; error?: string }> {
  try {
    const name = payload.name.trim();
    const contactPerson = payload.contactPerson.trim();
    const email = payload.email.trim();
    const phone = payload.phone.trim();
    const address = (payload.address || '').trim();

    if (name.length < 2 || name.length > 120) {
      return { success: false, error: 'Company name must be between 2 and 120 characters.' };
    }
    if (contactPerson.length < 2 || contactPerson.length > 100) {
      return { success: false, error: 'Contact person must be between 2 and 100 characters.' };
    }

    const rowData = {
      name,
      contact_person: address ? `${contactPerson} ||| ${address}` : contactPerson,
      email,
      phone,
      color_scheme: payload.colorScheme || 'indigo',
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    if (id) {
      const { data, error } = await supabaseAdmin
        .from('clients')
        .update(rowData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(formatSupabaseError(error));
      await supabaseAdmin
        .from('styles')
        .update({ company_name: name })
        .eq('client_id', id);
      revalidatePath('/');
      return { success: true, company: mapCompany(data) };
    } else {
      const { data, error } = await supabaseAdmin
        .from('clients')
        .insert([rowData])
        .select()
        .single();
      if (error) throw new Error(formatSupabaseError(error));
      revalidatePath('/');
      return { success: true, company: mapCompany(data) };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to save company',
    };
  }
}

export async function deleteCompanyAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin.from('clients').delete().eq('id', id);
    if (error) throw new Error(formatSupabaseError(error));
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete company',
    };
  }
}

export async function saveMachineAction(
  payload: {
    name: string;
    brand: string;
    heads: number;
    speed: number;
    embroideryTypes: EmbroideryTypeOption[];
    status: MachineOperationalStatus;
    operatorName?: string;
    helperName?: string;
  },
  id?: string
): Promise<{ success: boolean; machine?: MachineEntity; error?: string }> {
  try {
    const name = payload.name.trim();
    const brand = payload.brand.trim();
    const heads = Math.round(Number(payload.heads));
    const speed = Math.round(Number(payload.speed));

    if (name.length < 2 || name.length > 60) {
      return { success: false, error: 'Machine name must be between 2 and 60 characters.' };
    }
    if (brand.length < 2 || brand.length > 60) {
      return { success: false, error: 'Machine brand must be between 2 and 60 characters.' };
    }
    if (!Number.isFinite(heads) || heads < 1 || heads > 60) {
      return { success: false, error: 'Head count must be between 1 and 60.' };
    }
    if (!Number.isFinite(speed) || speed < 100 || speed > 3000) {
      return { success: false, error: 'Speed (SPM) must be between 100 and 3,000.' };
    }
    if (!payload.embroideryTypes || payload.embroideryTypes.length === 0) {
      return { success: false, error: 'Select at least one supported embroidery type.' };
    }

    const dbEnumStatus =
      payload.status === 'Maintenance'
        ? 'MAINTENANCE'
        : payload.status === 'Setup'
        ? 'SETUP'
        : 'RUNNING';

    const rowData: Record<string, unknown> = {
      machine_name: name,
      brand,
      heads,
      speed,
      embroidery_types: payload.embroideryTypes,
      operational_status: payload.status,
      status: dbEnumStatus,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    const opTrim = payload.operatorName !== undefined ? payload.operatorName.trim() : undefined;
    const helpTrim =
      payload.helperName !== undefined ? payload.helperName.trim() || 'None' : undefined;

    if (opTrim && helpTrim && helpTrim !== 'None' && opTrim.toLowerCase() === helpTrim.toLowerCase()) {
      return {
        success: false,
        error: 'Operator and Helper on the same machine cannot be the same employee.',
      };
    }

    if (opTrim || (helpTrim && helpTrim !== 'None')) {
      const { data: otherMachines } = await supabaseAdmin
        .from('machines')
        .select('id, machine_name, operator_name, helper_name')
        .eq('is_active', true);

      for (const om of otherMachines || []) {
        if (id && String(om.id) === id) continue;
        if (!id && String(om.machine_name || '').toLowerCase() === name.toLowerCase()) continue;

        const omOp = String(om.operator_name || '').trim();
        const omHelp = String(om.helper_name || '').trim();

        if (
          opTrim &&
          (omOp.toLowerCase() === opTrim.toLowerCase() ||
            (omHelp && omHelp !== 'None' && omHelp.toLowerCase() === opTrim.toLowerCase()))
        ) {
          return {
            success: false,
            error: `${opTrim} danatamath ${String(om.machine_name)} ekata assign karala thiyenne! Machine operatorsla duplicate wenna ba.`,
          };
        }

        if (
          helpTrim &&
          helpTrim !== 'None' &&
          (omOp.toLowerCase() === helpTrim.toLowerCase() ||
            (omHelp && omHelp !== 'None' && omHelp.toLowerCase() === helpTrim.toLowerCase()))
        ) {
          return {
            success: false,
            error: `${helpTrim} danatamath ${String(om.machine_name)} ekata assign karala thiyenne! Machine crew duplicate wenna ba.`,
          };
        }
      }
    }

    if (opTrim !== undefined) rowData.operator_name = opTrim;
    if (helpTrim !== undefined) rowData.helper_name = helpTrim;

    if (id) {
      const { data, error } = await supabaseAdmin
        .from('machines')
        .update(rowData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(formatSupabaseError(error));
      revalidatePath('/');
      return { success: true, machine: mapMachine(data) };
    } else {
      const { data, error } = await supabaseAdmin
        .from('machines')
        .insert([rowData])
        .select()
        .single();
      if (error) throw new Error(formatSupabaseError(error));
      revalidatePath('/');
      return { success: true, machine: mapMachine(data) };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to save machine',
    };
  }
}

export async function assignMachineCrewAction(
  machineId: string,
  operatorName: string,
  helperName: string
): Promise<{ success: boolean; machine?: MachineEntity; error?: string }> {
  try {
    const opTrim = operatorName.trim();
    const helpTrim = helperName.trim() || 'None';

    if (opTrim && helpTrim !== 'None' && opTrim.toLowerCase() === helpTrim.toLowerCase()) {
      return {
        success: false,
        error: 'Operator and Helper on the same machine cannot be the same employee.',
      };
    }

    if (opTrim || helpTrim !== 'None') {
      const { data: otherMachines } = await supabaseAdmin
        .from('machines')
        .select('id, machine_name, operator_name, helper_name')
        .eq('is_active', true)
        .neq('id', machineId);

      for (const om of otherMachines || []) {
        const omOp = String(om.operator_name || '').trim();
        const omHelp = String(om.helper_name || '').trim();

        if (
          opTrim &&
          (omOp.toLowerCase() === opTrim.toLowerCase() ||
            (omHelp && omHelp !== 'None' && omHelp.toLowerCase() === opTrim.toLowerCase()))
        ) {
          return {
            success: false,
            error: `${opTrim} danatamath ${String(om.machine_name)} ekata assign karala thiyenne! Machine operatorsla duplicate wenna ba.`,
          };
        }

        if (
          helpTrim !== 'None' &&
          (omOp.toLowerCase() === helpTrim.toLowerCase() ||
            (omHelp && omHelp !== 'None' && omHelp.toLowerCase() === helpTrim.toLowerCase()))
        ) {
          return {
            success: false,
            error: `${helpTrim} danatamath ${String(om.machine_name)} ekata assign karala thiyenne! Machine crew duplicate wenna ba.`,
          };
        }
      }
    }

    const { data, error } = await supabaseAdmin
      .from('machines')
      .update({
        operator_name: opTrim,
        helper_name: helpTrim,
        updated_at: new Date().toISOString(),
      })
      .eq('id', machineId)
      .select()
      .single();

    if (error) throw new Error(formatSupabaseError(error));

    const todayColombo = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Colombo',
    }).format(new Date());

    if (opTrim) {
      await supabaseAdmin
        .from('production_assignments')
        .update({
          operator_name: opTrim,
          helper_name: helpTrim,
          updated_at: new Date().toISOString(),
        })
        .eq('machine_id', machineId)
        .gte('assignment_date', todayColombo);
    }

    revalidatePath('/');
    return { success: true, machine: mapMachine(data) };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to assign machine operator',
    };
  }
}

export async function deleteMachineAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin.from('machines').delete().eq('id', id);
    if (error) throw new Error(formatSupabaseError(error));
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete machine',
    };
  }
}

export async function saveStyleAction(
  payload: {
    clientId?: string | null;
    code: string;
    company: string;
    name: string;
    fabric: string;
    target?: number;
    currency: string;
    price: number;
    qty: number;
    sizeBreakdown: StyleSizeItem[];
    parts: StylePartItem[];
  },
  id?: string
): Promise<{ success: boolean; style?: StyleMasterEntity; error?: string }> {
  try {
    const code = payload.code.trim();
    const company = payload.company.trim();
    const name = payload.name.trim();
    const fabric = payload.fabric.trim() || 'White';
    const target = Number.isFinite(Number(payload.target))
      ? Math.max(0, Math.round(Number(payload.target)))
      : 0;
    const currency = payload.currency.trim() || 'LKR';
    const price = Number(payload.price);
    const qty = Math.round(Number(payload.qty));

    if (!code || code.length > 60) {
      return { success: false, error: 'Style Code is required (max 60 characters).' };
    }
    if (!company) {
      return { success: false, error: 'Please select a registered Client / Company.' };
    }
    if (!name || name.length > 120) {
      return { success: false, error: 'Style Name is required (max 120 characters).' };
    }
    if (!Number.isFinite(price) || price < 0 || price > 1000000) {
      return { success: false, error: 'Garment Price must be between 0 and 1,000,000.' };
    }
    if (!Number.isFinite(qty) || qty < 1 || qty > 1000000) {
      return { success: false, error: 'Total Order Qty must be between 1 and 1,000,000.' };
    }
    const cleanedSizes: StyleSizeItem[] = (payload.sizeBreakdown || [])
      .map((sz) => ({
        size: String(sz.size || '').trim(),
        qty: Math.max(0, Math.round(Number(sz.qty || 0))),
      }))
      .filter((sz) => sz.size && sz.qty > 0);

    if (cleanedSizes.length === 0) {
      return {
        success: false,
        error: 'Please enter at least one Garment Size and Quantity.',
      };
    }

    const sizeTotal = cleanedSizes.reduce((sum, item) => sum + item.qty, 0);
    if (sizeTotal > qty) {
      return {
        success: false,
        error: `Size Breakdown total (${sizeTotal.toLocaleString()} Pcs) cannot exceed Total Order Qty (${qty.toLocaleString()} Pcs).`,
      };
    }

    if (!payload.parts || payload.parts.length === 0) {
      return { success: false, error: 'Please add at least one Garment Part.' };
    }

    const rowData = {
      client_id: payload.clientId || null,
      style_code: code,
      company_name: company,
      style_name: name,
      fabric_color: fabric,
      target_per_hour: target,
      currency,
      garment_price: price,
      order_qty: qty,
      size_breakdown: cleanedSizes,
      parts: payload.parts,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    if (id) {
      const { data, error } = await supabaseAdmin
        .from('styles')
        .update(rowData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(formatSupabaseError(error));
      revalidatePath('/');
      return { success: true, style: mapStyle(data) };
    } else {
      const { data, error } = await supabaseAdmin
        .from('styles')
        .insert([rowData])
        .select()
        .single();
      if (error) throw new Error(formatSupabaseError(error));
      revalidatePath('/');
      return { success: true, style: mapStyle(data) };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to save style',
    };
  }
}

export async function toggleStyleCompletedAction(
  id: string,
  isCompleted: boolean
): Promise<{ success: boolean; style?: StyleMasterEntity; error?: string }> {
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('styles')
      .update({
        is_completed: isCompleted,
        completed_at: isCompleted ? nowIso : null,
        updated_at: nowIso,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(formatSupabaseError(error));
    revalidatePath('/');
    return { success: true, style: mapStyle(data) };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update style completion status',
    };
  }
}

export async function deleteStyleAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin.from('styles').delete().eq('id', id);
    if (error) throw new Error(formatSupabaseError(error));
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete style',
    };
  }
}

export async function saveProductionBlockAction(
  payload: {
    machineId?: string | null;
    machineName: string;
    styleId?: string | null;
    styleCode: string;
    styleName: string;
    partName?: string;
    clientName: string;
    date: string;
    shift: string;
    size: string;
    startHour: number;
    spanHours: number;
    planQty: number;
    actualQty: number;
    operatorName: string;
    helperName: string;
  },
  id?: string
): Promise<{ success: boolean; block?: ProductionBlockEntity; error?: string }> {
  try {
    const startHour = Math.round(Number(payload.startHour));
    const spanHours = Math.round(Number(payload.spanHours));
    const planQty = Math.round(Number(payload.planQty));
    const actualQty = Math.round(Number(payload.actualQty));

    if (!payload.machineName) {
      return { success: false, error: 'Please select a Machine.' };
    }
    if (!payload.styleName) {
      return { success: false, error: 'Please select a Style.' };
    }
    const opTrim = (payload.operatorName || '').trim();
    const helpTrim = (payload.helperName || '').trim() || 'None';

    if (!opTrim || opTrim.toLowerCase() === 'unassigned') {
      return {
        success: false,
        error: `Please assign a valid Operator to ${payload.machineName} before scheduling production.`,
      };
    }
    if (helpTrim !== 'None' && opTrim.toLowerCase() === helpTrim.toLowerCase()) {
      return {
        success: false,
        error: 'Operator and Helper on the same machine cannot be the same employee.',
      };
    }

    const { data: otherMachines } = await supabaseAdmin
      .from('machines')
      .select('id, machine_name, operator_name, helper_name')
      .eq('is_active', true);

    for (const om of otherMachines || []) {
      const isSameMac =
        (payload.machineId && String(om.id) === payload.machineId) ||
        String(om.machine_name || '').toLowerCase() === payload.machineName.trim().toLowerCase();
      if (isSameMac) continue;

      const omOp = String(om.operator_name || '').trim();
      const omHelp = String(om.helper_name || '').trim();

      if (
        omOp.toLowerCase() === opTrim.toLowerCase() ||
        (omHelp && omHelp !== 'None' && omHelp.toLowerCase() === opTrim.toLowerCase())
      ) {
        return {
          success: false,
          error: `${opTrim} danatamath ${String(om.machine_name)} ekata assign karala thiyenne! Machine operatorsla duplicate wenna ba.`,
        };
      }
      if (
        helpTrim !== 'None' &&
        (omOp.toLowerCase() === helpTrim.toLowerCase() ||
          (omHelp && omHelp !== 'None' && omHelp.toLowerCase() === helpTrim.toLowerCase()))
      ) {
        return {
          success: false,
          error: `${helpTrim} danatamath ${String(om.machine_name)} ekata assign karala thiyenne! Machine crew duplicate wenna ba.`,
        };
      }
    }
    if (startHour < 1 || startHour > 11 || spanHours < 1 || startHour + spanHours - 1 > 11) {
      return { success: false, error: 'Invalid shift time slot selection (must fit within H1–H11).' };
    }
    if (planQty < 1 || planQty > 500000) {
      return { success: false, error: 'Plan Qty must be between 1 and 500,000.' };
    }
    if (actualQty < 0 || actualQty > 500000) {
      return { success: false, error: 'Actual Qty must be between 0 and 500,000.' };
    }

    const todayColombo = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Colombo',
    }).format(new Date());

    if (payload.date >= todayColombo && actualQty > 0) {
      return {
        success: false,
        error: `Actual Done Qty cannot be filled until the scheduled day (${payload.date}) ends. Please fill Actual Qty on the next day.`,
      };
    }

    const rowData = {
      machine_id: payload.machineId || null,
      machine_name: payload.machineName,
      style_id: payload.styleId || null,
      style_code: payload.styleCode,
      style_name: payload.styleName,
      part_name: payload.partName || '',
      client_name: payload.clientName,
      assignment_date: payload.date,
      shift: payload.shift || 'day',
      garment_size: payload.size || 'L',
      start_hour: startHour,
      span_hours: spanHours,
      plan_qty: planQty,
      actual_qty: actualQty,
      operator_name: payload.operatorName,
      helper_name: payload.helperName || 'None',
      updated_at: new Date().toISOString(),
    };

    // Also update the machine's current operator & helper in machines table if machineId is present
    if (payload.machineId) {
      await supabaseAdmin
        .from('machines')
        .update({
          operator_name: payload.operatorName,
          helper_name: payload.helperName || 'None',
          updated_at: new Date().toISOString(),
        })
        .eq('id', payload.machineId);
    }

    let savedRow: Record<string, unknown>;
    if (id) {
      const { data, error } = await supabaseAdmin
        .from('production_assignments')
        .update(rowData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(formatSupabaseError(error));
      savedRow = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from('production_assignments')
        .insert([rowData])
        .select()
        .single();
      if (error) throw new Error(formatSupabaseError(error));
      savedRow = data;
    }

    if (payload.styleId) {
      const [{ data: styleRow }, { data: stylePlans }] = await Promise.all([
        supabaseAdmin
          .from('styles')
          .select('id, order_qty, is_completed, completed_at')
          .eq('id', payload.styleId)
          .maybeSingle(),
        supabaseAdmin
          .from('production_assignments')
          .select('actual_qty')
          .eq('style_id', payload.styleId),
      ]);

      if (styleRow) {
        const totalDone = (stylePlans || []).reduce(
          (sum, r: Record<string, unknown>) => sum + Math.max(0, Number(r.actual_qty || 0)),
          0
        );
        const orderQty = Math.max(1, Number(styleRow.order_qty || 1));
        if (totalDone >= orderQty && !styleRow.is_completed) {
          const nowIso = new Date().toISOString();
          await supabaseAdmin
            .from('styles')
            .update({
              is_completed: true,
              completed_at: styleRow.completed_at || nowIso,
              updated_at: nowIso,
            })
            .eq('id', payload.styleId);
        }
      }
    }

    revalidatePath('/');
    return { success: true, block: mapPlan(savedRow) };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to save production plan block',
    };
  }
}

export async function deleteProductionBlockAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin.from('production_assignments').delete().eq('id', id);
    if (error) throw new Error(formatSupabaseError(error));
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete production plan block',
    };
  }
}
