'use server';

import { supabaseAdmin, formatSupabaseError } from '@/lib/supabase/admin';
import { recordAuditLog } from '@/lib/audit';
import { checkErpSessionAction } from '@/actions/auth';
import { revalidatePath } from 'next/cache';

export type QuotationStatus = 'New' | 'Reviewed' | 'Quoted' | 'Converted' | 'Archived';

export interface ProductionQuotationEntity {
  id: string;
  customerName: string;
  companyName: string;
  email: string;
  phone: string;
  serviceType: string;
  estimatedQty: number | null;
  requirements: string;
  status: QuotationStatus;
  adminNotes: string;
  handledBy: string;
  createdAt: string;
  updatedAt: string;
}

function mapQuotation(row: Record<string, unknown>): ProductionQuotationEntity {
  const rawStatus = String(row.status || 'New');
  const validStatuses: QuotationStatus[] = ['New', 'Reviewed', 'Quoted', 'Converted', 'Archived'];
  const status = validStatuses.includes(rawStatus as QuotationStatus)
    ? (rawStatus as QuotationStatus)
    : 'New';

  return {
    id: String(row.id),
    customerName: String(row.customer_name || ''),
    companyName: String(row.company_name || ''),
    email: String(row.email || ''),
    phone: String(row.phone || ''),
    serviceType: String(row.service_type || ''),
    estimatedQty:
      row.estimated_qty !== null && row.estimated_qty !== undefined
        ? Number(row.estimated_qty)
        : null,
    requirements: String(row.requirements || ''),
    status,
    adminNotes: String(row.admin_notes || ''),
    handledBy: String(row.handled_by || ''),
    createdAt: String(row.created_at || ''),
    updatedAt: String(row.updated_at || ''),
  };
}

export async function submitQuotationAction(input: {
  customerName: string;
  companyName?: string;
  email: string;
  phone: string;
  serviceType: string;
  estimatedQty?: number | null;
  requirements: string;
}): Promise<{ success: boolean; quotation?: ProductionQuotationEntity; error?: string }> {
  const customerName = (input.customerName || '').trim();
  const email = (input.email || '').trim();
  const phone = (input.phone || '').trim();
  const requirements = (input.requirements || '').trim();

  if (customerName.length < 2 || !email || !phone || requirements.length < 3) {
    return {
      success: false,
      error: 'Please fill in your name, email, phone, and order requirements.',
    };
  }

  const { data, error } = await supabaseAdmin
    .from('production_quotations')
    .insert({
      customer_name: customerName,
      company_name: (input.companyName || '').trim() || null,
      email,
      phone,
      service_type: (input.serviceType || 'Industrial Embroidery').trim(),
      estimated_qty:
        input.estimatedQty && Number.isFinite(input.estimatedQty) && input.estimatedQty > 0
          ? Math.round(input.estimatedQty)
          : null,
      requirements,
      status: 'New',
    })
    .select('*')
    .single();

  if (error || !data) {
    return {
      success: false,
      error: error ? formatSupabaseError(error) : 'Failed to submit quotation request.',
    };
  }

  await recordAuditLog({
    actor: {
      email,
      name: customerName,
      role: 'PUBLIC_CLIENT',
    },
    module: 'Quotations',
    action: 'QUOTATION_SUBMITTED',
    summary: `New quotation request from ${customerName}${
      input.companyName ? ` (${input.companyName})` : ''
    } for ${input.serviceType}.`,
  });

  revalidatePath('/erp');
  return { success: true, quotation: mapQuotation(data) };
}

export async function fetchQuotationsAction(): Promise<{
  success: boolean;
  data?: ProductionQuotationEntity[];
  error?: string;
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from('production_quotations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: formatSupabaseError(error) };
    }

    return {
      success: true,
      data: (data || []).map((row) => mapQuotation(row)),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to load quotations.',
    };
  }
}

export async function updateQuotationStatusAction(input: {
  id: string;
  status: QuotationStatus;
  adminNotes?: string;
}): Promise<{ success: boolean; quotation?: ProductionQuotationEntity; error?: string }> {
  const session = await checkErpSessionAction();
  if (!session.authenticated) {
    return { success: false, error: 'Unauthorized.' };
  }

  const { data, error } = await supabaseAdmin
    .from('production_quotations')
    .update({
      status: input.status,
      admin_notes: (input.adminNotes || '').trim() || null,
      handled_by: session.userLabel || session.email || 'Management',
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id)
    .select('*')
    .single();

  if (error || !data) {
    return {
      success: false,
      error: error ? formatSupabaseError(error) : 'Failed to submit quotation request.',
    };
  }

  await recordAuditLog({
    module: 'Quotations',
    action: 'UPDATE',
    summary: `Updated quotation for ${data.customer_name} to "${input.status}".`,
  });

  revalidatePath('/erp');
  return { success: true, quotation: mapQuotation(data) };
}

export async function deleteQuotationAction(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const session = await checkErpSessionAction();
  if (!session.authenticated) {
    return { success: false, error: 'Unauthorized.' };
  }

  const { data: existing } = await supabaseAdmin
    .from('production_quotations')
    .select('customer_name')
    .eq('id', id)
    .maybeSingle();

  const { error } = await supabaseAdmin.from('production_quotations').delete().eq('id', id);
  if (error) {
    return { success: false, error: formatSupabaseError(error) };
  }

  await recordAuditLog({
    module: 'Quotations',
    action: 'DELETE',
    summary: `Deleted quotation request from ${existing?.customer_name || id}.`,
  });

  revalidatePath('/erp');
  return { success: true };
}
