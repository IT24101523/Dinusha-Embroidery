'use server';

import { supabaseAdmin, formatSupabaseError } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export type BundleMdStatus = 'PENDING' | 'PASS' | 'FAIL';
export type BundleWorkflowStatus = 'IN_HOUSE' | 'READY_FOR_OUT' | 'DISPATCHED';

export interface StyleInBatchEntity {
  id: string;
  batchNo: string;
  receivedDate: string;
  styleId: string | null;
  styleCode: string;
  styleName: string;
  companyName: string;
  cutNo: string;
  color: string;
  partsNote: string;
  clientRefNo: string;
  receivedBy: string;
  checkedBy: string;
  remarks: string;
  createdAt: string;
}

export interface StyleBundleEntity {
  id: string;
  batchId: string | null;
  styleId: string | null;
  styleCode: string;
  styleName: string;
  companyName: string;
  receivedDate: string;
  cutNo: string;
  jobNo: string;
  bundleNo: string;
  ratio: string;
  noRange: string;
  size: string;
  partName: string;
  tagQty: number;
  goodQty: number;
  mdQty: number;
  edQty: number;
  fabDamageQty: number;
  printDamageQty: number;
  mdStatus: BundleMdStatus;
  status: BundleWorkflowStatus;
  checkedBy: string;
  checkedDate: string | null;
  despatchId: string | null;
  remarks: string;
  createdAt: string;
}

export interface StyleDespatchEntity {
  id: string;
  despatchNo: string;
  gatepassNo: string;
  checklistNo: string;
  despatchDate: string;
  companyName: string;
  toPerson: string;
  vehicleNo: string;
  driverName: string;
  mdStatus: 'PASS' | 'FAIL';
  checkedBy: string;
  despatchedBy: string;
  authorizedBy: string;
  receivedBy: string;
  remarks: string;
  totalBundles: number;
  totalQty: number;
  totalEd: number;
  totalMd: number;
  createdAt: string;
}

export interface StyleInOutBundle {
  cloudReady: boolean;
  batches: StyleInBatchEntity[];
  bundles: StyleBundleEntity[];
  despatches: StyleDespatchEntity[];
}

function isMissingTableError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = (err as { code?: string }).code;
  const msg = String((err as { message?: string }).message || '');
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    msg.includes('Could not find the table') ||
    msg.includes('does not exist')
  );
}

function mapBatch(row: Record<string, unknown>): StyleInBatchEntity {
  return {
    id: String(row.id),
    batchNo: String(row.batch_no || ''),
    receivedDate: String(row.received_date || new Date().toISOString().split('T')[0]),
    styleId: row.style_id ? String(row.style_id) : null,
    styleCode: String(row.style_code || ''),
    styleName: String(row.style_name || ''),
    companyName: String(row.company_name || ''),
    cutNo: String(row.cut_no || ''),
    color: String(row.color || ''),
    partsNote: String(row.parts_note || ''),
    clientRefNo: String(row.client_ref_no || ''),
    receivedBy: String(row.received_by || ''),
    checkedBy: String(row.checked_by || ''),
    remarks: String(row.remarks || ''),
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

function mapBundle(row: Record<string, unknown>): StyleBundleEntity {
  const rawMd = String(row.md_status || 'PENDING').toUpperCase();
  const mdStatus: BundleMdStatus =
    rawMd === 'PASS' ? 'PASS' : rawMd === 'FAIL' ? 'FAIL' : 'PENDING';
  const rawStatus = String(row.status || 'IN_HOUSE').toUpperCase();
  const status: BundleWorkflowStatus =
    rawStatus === 'DISPATCHED'
      ? 'DISPATCHED'
      : rawStatus === 'READY_FOR_OUT'
      ? 'READY_FOR_OUT'
      : 'IN_HOUSE';

  return {
    id: String(row.id),
    batchId: row.batch_id ? String(row.batch_id) : null,
    styleId: row.style_id ? String(row.style_id) : null,
    styleCode: String(row.style_code || ''),
    styleName: String(row.style_name || ''),
    companyName: String(row.company_name || ''),
    receivedDate: String(row.received_date || new Date().toISOString().split('T')[0]),
    cutNo: String(row.cut_no || ''),
    jobNo: String(row.job_no || ''),
    bundleNo: String(row.bundle_no || ''),
    ratio: String(row.ratio || ''),
    noRange: String(row.no_range || ''),
    size: String(row.size || ''),
    partName: String(row.part_name || ''),
    tagQty: Math.max(0, Number(row.tag_qty || 0)),
    goodQty: Math.max(0, Number(row.good_qty || 0)),
    mdQty: Math.max(0, Number(row.md_qty || 0)),
    edQty: Math.max(0, Number(row.ed_qty || 0)),
    fabDamageQty: Math.max(0, Number(row.fab_damage_qty || 0)),
    printDamageQty: Math.max(0, Number(row.print_damage_qty || 0)),
    mdStatus,
    status,
    checkedBy: String(row.checked_by || ''),
    checkedDate: row.checked_date ? String(row.checked_date) : null,
    despatchId: row.despatch_id ? String(row.despatch_id) : null,
    remarks: String(row.remarks || ''),
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

function mapDespatch(row: Record<string, unknown>): StyleDespatchEntity {
  const rawMd = String(row.md_status || 'PASS').toUpperCase();
  return {
    id: String(row.id),
    despatchNo: String(row.despatch_no || ''),
    gatepassNo: String(row.gatepass_no || ''),
    checklistNo: String(row.checklist_no || ''),
    despatchDate: String(row.despatch_date || new Date().toISOString().split('T')[0]),
    companyName: String(row.company_name || ''),
    toPerson: String(row.to_person || ''),
    vehicleNo: String(row.vehicle_no || ''),
    driverName: String(row.driver_name || ''),
    mdStatus: rawMd === 'FAIL' ? 'FAIL' : 'PASS',
    checkedBy: String(row.checked_by || ''),
    despatchedBy: String(row.despatched_by || ''),
    authorizedBy: String(row.authorized_by || ''),
    receivedBy: String(row.received_by || ''),
    remarks: String(row.remarks || ''),
    totalBundles: Math.max(0, Number(row.total_bundles || 0)),
    totalQty: Math.max(0, Number(row.total_qty || 0)),
    totalEd: Math.max(0, Number(row.total_ed || 0)),
    totalMd: Math.max(0, Number(row.total_md || 0)),
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

export async function fetchStyleInOutBundleAction(): Promise<{
  success: boolean;
  data?: StyleInOutBundle;
  error?: string;
}> {
  try {
    const [batchesRes, bundlesRes, despatchesRes] = await Promise.all([
      supabaseAdmin
        .from('style_in_batches')
        .select('*')
        .order('received_date', { ascending: false })
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('style_bundles')
        .select('*')
        .order('received_date', { ascending: false })
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('style_despatches')
        .select('*')
        .order('despatch_date', { ascending: false })
        .order('created_at', { ascending: false }),
    ]);

    if (
      isMissingTableError(batchesRes.error) ||
      isMissingTableError(bundlesRes.error) ||
      isMissingTableError(despatchesRes.error)
    ) {
      return {
        success: true,
        data: {
          cloudReady: false,
          batches: [],
          bundles: [],
          despatches: [],
        },
      };
    }

    if (batchesRes.error) throw new Error(formatSupabaseError(batchesRes.error));
    if (bundlesRes.error) throw new Error(formatSupabaseError(bundlesRes.error));
    if (despatchesRes.error) throw new Error(formatSupabaseError(despatchesRes.error));

    return {
      success: true,
      data: {
        cloudReady: true,
        batches: (batchesRes.data || []).map(mapBatch),
        bundles: (bundlesRes.data || []).map(mapBundle),
        despatches: (despatchesRes.data || []).map(mapDespatch),
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch Style In & Out records',
    };
  }
}

export interface CreateStyleInBatchPayload {
  batchNo: string;
  receivedDate: string;
  styleId: string | null;
  styleCode: string;
  styleName: string;
  companyName: string;
  cutNo: string;
  color: string;
  partsNote: string;
  clientRefNo: string;
  receivedBy: string;
  checkedBy: string;
  remarks: string;
  bundles: Array<{
    cutNo: string;
    jobNo?: string;
    bundleNo: string;
    ratio?: string;
    noRange?: string;
    size: string;
    partName?: string;
    tagQty: number;
    fabDamageQty?: number;
    printDamageQty?: number;
    remarks?: string;
  }>;
}

export async function createStyleInBatchAction(
  payload: CreateStyleInBatchPayload
): Promise<{
  success: boolean;
  cloudReady?: boolean;
  batch?: StyleInBatchEntity;
  bundles?: StyleBundleEntity[];
  error?: string;
}> {
  try {
    const { data: batchRow, error: batchErr } = await supabaseAdmin
      .from('style_in_batches')
      .insert({
        batch_no: payload.batchNo.trim(),
        received_date: payload.receivedDate,
        style_id: payload.styleId || null,
        style_code: payload.styleCode.trim(),
        style_name: payload.styleName.trim(),
        company_name: payload.companyName.trim(),
        cut_no: payload.cutNo.trim(),
        color: payload.color.trim(),
        parts_note: payload.partsNote.trim(),
        client_ref_no: payload.clientRefNo.trim(),
        received_by: payload.receivedBy.trim(),
        checked_by: payload.checkedBy.trim(),
        remarks: payload.remarks.trim(),
      })
      .select('*')
      .single();

    if (batchErr) {
      if (isMissingTableError(batchErr)) {
        return { success: false, cloudReady: false, error: 'CLOUD_TABLE_MISSING' };
      }
      throw new Error(formatSupabaseError(batchErr));
    }

    const mappedBatch = mapBatch(batchRow as Record<string, unknown>);

    const bundleInserts = payload.bundles.map((b) => {
      const tagQty = Math.max(0, Math.round(Number(b.tagQty) || 0));
      const fabDmg = Math.max(0, Math.round(Number(b.fabDamageQty) || 0));
      const printDmg = Math.max(0, Math.round(Number(b.printDamageQty) || 0));
      return {
        batch_id: mappedBatch.id,
        style_id: payload.styleId || null,
        style_code: payload.styleCode.trim(),
        style_name: payload.styleName.trim(),
        company_name: payload.companyName.trim(),
        received_date: payload.receivedDate,
        cut_no: (b.cutNo || payload.cutNo || '').trim(),
        job_no: (b.jobNo || b.cutNo || payload.cutNo || '').trim(),
        bundle_no: b.bundleNo.trim(),
        ratio: (b.ratio || '').trim(),
        no_range: (b.noRange || '').trim(),
        size: b.size.trim(),
        part_name: (b.partName || payload.partsNote || '').trim(),
        tag_qty: tagQty,
        good_qty: Math.max(0, tagQty - fabDmg - printDmg),
        md_qty: 0,
        ed_qty: 0,
        fab_damage_qty: fabDmg,
        print_damage_qty: printDmg,
        md_status: 'PENDING',
        status: 'IN_HOUSE',
        checked_by: payload.checkedBy.trim(),
        remarks: (b.remarks || '').trim(),
      };
    });

    const { data: bundleRows, error: bundleErr } = await supabaseAdmin
      .from('style_bundles')
      .insert(bundleInserts)
      .select('*');

    if (bundleErr) {
      throw new Error(formatSupabaseError(bundleErr));
    }

    revalidatePath('/erp');
    return {
      success: true,
      cloudReady: true,
      batch: mappedBatch,
      bundles: (bundleRows || []).map((r) => mapBundle(r as Record<string, unknown>)),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to save Cut-In batch',
    };
  }
}

export async function deleteStyleInBatchAction(batchId: string): Promise<{
  success: boolean;
  cloudReady?: boolean;
  error?: string;
}> {
  try {
    const { error } = await supabaseAdmin.from('style_in_batches').delete().eq('id', batchId);
    if (error) {
      if (isMissingTableError(error)) {
        return { success: false, cloudReady: false, error: 'CLOUD_TABLE_MISSING' };
      }
      throw new Error(formatSupabaseError(error));
    }
    revalidatePath('/erp');
    return { success: true, cloudReady: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete batch',
    };
  }
}

export interface UpdateStyleBundlePayload {
  id: string;
  jobNo?: string;
  goodQty?: number;
  mdQty?: number;
  edQty?: number;
  mdStatus?: BundleMdStatus;
  status?: BundleWorkflowStatus;
  checkedBy?: string;
  checkedDate?: string | null;
  remarks?: string;
}

export async function updateStyleBundleCheckAction(
  payload: UpdateStyleBundlePayload
): Promise<{
  success: boolean;
  cloudReady?: boolean;
  bundle?: StyleBundleEntity;
  error?: string;
}> {
  try {
    const updateObj: Record<string, unknown> = {};
    if (payload.jobNo !== undefined) updateObj.job_no = payload.jobNo.trim();
    if (payload.goodQty !== undefined)
      updateObj.good_qty = Math.max(0, Math.round(Number(payload.goodQty) || 0));
    if (payload.mdQty !== undefined)
      updateObj.md_qty = Math.max(0, Math.round(Number(payload.mdQty) || 0));
    if (payload.edQty !== undefined)
      updateObj.ed_qty = Math.max(0, Math.round(Number(payload.edQty) || 0));
    if (payload.mdStatus !== undefined) updateObj.md_status = payload.mdStatus;
    if (payload.status !== undefined) updateObj.status = payload.status;
    if (payload.checkedBy !== undefined) updateObj.checked_by = payload.checkedBy.trim();
    if (payload.checkedDate !== undefined) updateObj.checked_date = payload.checkedDate;
    if (payload.remarks !== undefined) updateObj.remarks = payload.remarks.trim();

    const { data, error } = await supabaseAdmin
      .from('style_bundles')
      .update(updateObj)
      .eq('id', payload.id)
      .select('*')
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        return { success: false, cloudReady: false, error: 'CLOUD_TABLE_MISSING' };
      }
      throw new Error(formatSupabaseError(error));
    }

    revalidatePath('/erp');
    return {
      success: true,
      cloudReady: true,
      bundle: mapBundle(data as Record<string, unknown>),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update bundle',
    };
  }
}

export async function bulkUpdateStyleBundlesStatusAction(
  bundleIds: string[],
  updates: {
    status?: BundleWorkflowStatus;
    mdStatus?: BundleMdStatus;
    checkedBy?: string;
    checkedDate?: string;
  }
): Promise<{
  success: boolean;
  cloudReady?: boolean;
  bundles?: StyleBundleEntity[];
  error?: string;
}> {
  try {
    if (bundleIds.length === 0) return { success: true, cloudReady: true, bundles: [] };
    const updateObj: Record<string, unknown> = {};
    if (updates.status) updateObj.status = updates.status;
    if (updates.mdStatus) updateObj.md_status = updates.mdStatus;
    if (updates.checkedBy !== undefined) updateObj.checked_by = updates.checkedBy.trim();
    if (updates.checkedDate !== undefined) updateObj.checked_date = updates.checkedDate;

    const { data, error } = await supabaseAdmin
      .from('style_bundles')
      .update(updateObj)
      .in('id', bundleIds)
      .select('*');

    if (error) {
      if (isMissingTableError(error)) {
        return { success: false, cloudReady: false, error: 'CLOUD_TABLE_MISSING' };
      }
      throw new Error(formatSupabaseError(error));
    }

    revalidatePath('/erp');
    return {
      success: true,
      cloudReady: true,
      bundles: (data || []).map((r) => mapBundle(r as Record<string, unknown>)),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update bundles',
    };
  }
}

export async function deleteStyleBundleAction(bundleId: string): Promise<{
  success: boolean;
  cloudReady?: boolean;
  error?: string;
}> {
  try {
    const { error } = await supabaseAdmin.from('style_bundles').delete().eq('id', bundleId);
    if (error) {
      if (isMissingTableError(error)) {
        return { success: false, cloudReady: false, error: 'CLOUD_TABLE_MISSING' };
      }
      throw new Error(formatSupabaseError(error));
    }
    revalidatePath('/erp');
    return { success: true, cloudReady: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete bundle',
    };
  }
}

export interface CreateStyleDespatchPayload {
  despatchNo: string;
  gatepassNo: string;
  checklistNo: string;
  despatchDate: string;
  companyName: string;
  toPerson: string;
  vehicleNo: string;
  driverName: string;
  mdStatus: 'PASS' | 'FAIL';
  checkedBy: string;
  despatchedBy: string;
  authorizedBy: string;
  receivedBy: string;
  remarks: string;
  bundleItems: Array<{
    bundleId: string;
    jobNo: string;
    goodQty: number;
    edQty: number;
    mdQty: number;
    remarks: string;
  }>;
}

export async function createStyleDespatchAction(
  payload: CreateStyleDespatchPayload
): Promise<{
  success: boolean;
  cloudReady?: boolean;
  despatch?: StyleDespatchEntity;
  updatedBundles?: StyleBundleEntity[];
  error?: string;
}> {
  try {
    const totalBundles = payload.bundleItems.length;
    const totalQty = payload.bundleItems.reduce((s, i) => s + Math.max(0, i.goodQty), 0);
    const totalEd = payload.bundleItems.reduce((s, i) => s + Math.max(0, i.edQty), 0);
    const totalMd = payload.bundleItems.reduce((s, i) => s + Math.max(0, i.mdQty), 0);

    const { data: despatchRow, error: despatchErr } = await supabaseAdmin
      .from('style_despatches')
      .insert({
        despatch_no: payload.despatchNo.trim(),
        gatepass_no: payload.gatepassNo.trim(),
        checklist_no: payload.checklistNo.trim(),
        despatch_date: payload.despatchDate,
        company_name: payload.companyName.trim(),
        to_person: payload.toPerson.trim(),
        vehicle_no: payload.vehicleNo.trim(),
        driver_name: payload.driverName.trim(),
        md_status: payload.mdStatus,
        checked_by: payload.checkedBy.trim(),
        despatched_by: payload.despatchedBy.trim(),
        authorized_by: payload.authorizedBy.trim(),
        received_by: payload.receivedBy.trim(),
        remarks: payload.remarks.trim(),
        total_bundles: totalBundles,
        total_qty: totalQty,
        total_ed: totalEd,
        total_md: totalMd,
      })
      .select('*')
      .single();

    if (despatchErr) {
      if (isMissingTableError(despatchErr)) {
        return { success: false, cloudReady: false, error: 'CLOUD_TABLE_MISSING' };
      }
      throw new Error(formatSupabaseError(despatchErr));
    }

    const mappedDespatch = mapDespatch(despatchRow as Record<string, unknown>);
    const updatedBundles: StyleBundleEntity[] = [];

    for (const item of payload.bundleItems) {
      const { data: bRow, error: bErr } = await supabaseAdmin
        .from('style_bundles')
        .update({
          job_no: item.jobNo.trim(),
          good_qty: Math.max(0, Math.round(Number(item.goodQty) || 0)),
          ed_qty: Math.max(0, Math.round(Number(item.edQty) || 0)),
          md_qty: Math.max(0, Math.round(Number(item.mdQty) || 0)),
          md_status: payload.mdStatus,
          status: 'DISPATCHED',
          despatch_id: mappedDespatch.id,
          checked_by: payload.checkedBy.trim(),
          checked_date: payload.despatchDate,
          remarks: item.remarks.trim(),
        })
        .eq('id', item.bundleId)
        .select('*')
        .single();

      if (bErr) throw new Error(formatSupabaseError(bErr));
      if (bRow) updatedBundles.push(mapBundle(bRow as Record<string, unknown>));
    }

    revalidatePath('/erp');
    return {
      success: true,
      cloudReady: true,
      despatch: mappedDespatch,
      updatedBundles,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create Despatch Note & Gate Pass',
    };
  }
}

export async function deleteStyleDespatchAction(despatchId: string): Promise<{
  success: boolean;
  cloudReady?: boolean;
  error?: string;
}> {
  try {
    // Revert bundles back to READY_FOR_OUT before deleting despatch
    const { error: revertErr } = await supabaseAdmin
      .from('style_bundles')
      .update({
        status: 'READY_FOR_OUT',
        despatch_id: null,
      })
      .eq('despatch_id', despatchId);

    if (revertErr) {
      if (isMissingTableError(revertErr)) {
        return { success: false, cloudReady: false, error: 'CLOUD_TABLE_MISSING' };
      }
      throw new Error(formatSupabaseError(revertErr));
    }

    const { error: delErr } = await supabaseAdmin
      .from('style_despatches')
      .delete()
      .eq('id', despatchId);

    if (delErr) throw new Error(formatSupabaseError(delErr));

    revalidatePath('/erp');
    return { success: true, cloudReady: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to cancel despatch',
    };
  }
}
