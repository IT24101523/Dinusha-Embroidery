'use server';

import { supabaseAdmin, formatSupabaseError } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export type CheckerOperationalStatus = 'Active' | 'Break' | 'Offline';

export interface QualityCheckerStationEntity {
  id: string;
  stationNumber: number | null;
  name: string;
  employeeName: string;
  status: CheckerOperationalStatus;
  isActive: boolean;
}

export interface QualityBlockEntity {
  id: string;
  stationId: string | null;
  stationName: string;
  checkerName: string;
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
  defectQty: number;
}

export interface QualityDeliveryTargetEntity {
  id: string;
  styleId: string | null;
  styleName: string;
  date: string;
  deliveryQty: number;
}

export interface QualityBundle {
  checkers: QualityCheckerStationEntity[];
  blocks: QualityBlockEntity[];
  deliveryTargets: QualityDeliveryTargetEntity[];
}

function mapCheckerStation(row: Record<string, unknown>): QualityCheckerStationEntity {
  const rawStatus = String(row.operational_status || 'Active');
  let status: CheckerOperationalStatus = 'Active';
  if (rawStatus === 'Break') status = 'Break';
  else if (rawStatus === 'Offline') status = 'Offline';

  return {
    id: String(row.id),
    stationNumber:
      row.station_number !== null && row.station_number !== undefined
        ? Number(row.station_number)
        : null,
    name: String(row.station_name || ''),
    employeeName: String(row.employee_name || ''),
    status,
    isActive: row.is_active !== false,
  };
}

function mapQualityBlock(row: Record<string, unknown>): QualityBlockEntity {
  return {
    id: String(row.id),
    stationId: row.station_id ? String(row.station_id) : null,
    stationName: String(row.station_name || ''),
    checkerName: String(row.checker_name || ''),
    styleId: row.style_id ? String(row.style_id) : null,
    styleCode: String(row.style_code || ''),
    styleName: String(row.style_name || ''),
    partName: String(row.part_name || ''),
    clientName: String(row.client_name || ''),
    date: String(row.assignment_date || new Date().toISOString().split('T')[0]),
    shift: String(row.shift || 'day'),
    size: String(row.garment_size || 'Free Size'),
    startHour: Math.min(11, Math.max(1, Number(row.start_hour || 1))),
    spanHours: Math.min(11, Math.max(1, Number(row.span_hours || 1))),
    planQty: Math.max(0, Number(row.plan_qty || 0)),
    actualQty: Math.max(0, Number(row.actual_qty || 0)),
    defectQty: Math.max(0, Number(row.defect_qty || 0)),
  };
}

function mapDeliveryTarget(row: Record<string, unknown>): QualityDeliveryTargetEntity {
  return {
    id: String(row.id),
    styleId: row.style_id ? String(row.style_id) : null,
    styleName: String(row.style_name || ''),
    date: String(row.target_date || new Date().toISOString().split('T')[0]),
    deliveryQty: Math.max(0, Number(row.delivery_qty || 0)),
  };
}

export async function fetchQualityBundleAction(): Promise<{
  success: boolean;
  data?: QualityBundle;
  error?: string;
}> {
  try {
    const [checkersRes, blocksRes, targetsRes] = await Promise.all([
      supabaseAdmin
        .from('quality_checkers')
        .select('*')
        .eq('is_active', true)
        .order('station_number', { ascending: true, nullsFirst: false })
        .order('station_name', { ascending: true }),
      supabaseAdmin
        .from('quality_assignments')
        .select('*')
        .order('assignment_date', { ascending: false })
        .order('start_hour', { ascending: true }),
      supabaseAdmin
        .from('quality_delivery_targets')
        .select('*')
        .order('target_date', { ascending: false }),
    ]);

    if (checkersRes.error) throw new Error(formatSupabaseError(checkersRes.error));
    if (blocksRes.error) throw new Error(formatSupabaseError(blocksRes.error));
    if (targetsRes.error) throw new Error(formatSupabaseError(targetsRes.error));

    return {
      success: true,
      data: {
        checkers: (checkersRes.data || []).map(mapCheckerStation),
        blocks: (blocksRes.data || []).map(mapQualityBlock),
        deliveryTargets: (targetsRes.data || []).map(mapDeliveryTarget),
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch quality checking data',
    };
  }
}

export async function assignCheckerEmployeeAction(
  stationId: string,
  employeeName: string
): Promise<{
  success: boolean;
  checker?: QualityCheckerStationEntity;
  error?: string;
}> {
  try {
    const empTrim = employeeName.trim();

    if (empTrim) {
      const { data: otherCheckers, error: checkErr } = await supabaseAdmin
        .from('quality_checkers')
        .select('id, station_name, employee_name')
        .eq('is_active', true)
        .neq('id', stationId);
      if (checkErr) throw new Error(formatSupabaseError(checkErr));

      for (const oc of otherCheckers || []) {
        const ocEmp = String(oc.employee_name || '').trim();
        if (ocEmp && ocEmp.toLowerCase() === empTrim.toLowerCase()) {
          throw new Error(
            `${empTrim} danatamath ${oc.station_name} ekata assign karala thiyenne! Checkersla duplicate wenna ba.`
          );
        }
      }
    }

    const { data, error } = await supabaseAdmin
      .from('quality_checkers')
      .update({
        employee_name: empTrim,
        updated_at: new Date().toISOString(),
      })
      .eq('id', stationId)
      .select('*')
      .single();

    if (error) throw new Error(formatSupabaseError(error));

    const updatedChecker = mapCheckerStation(data);
    if (empTrim) {
      const todayIso = new Date().toISOString().split('T')[0];
      await supabaseAdmin
        .from('quality_assignments')
        .update({
          checker_name: empTrim,
          updated_at: new Date().toISOString(),
        })
        .eq('station_name', updatedChecker.name)
        .gte('assignment_date', todayIso);
    }

    revalidatePath('/');
    return { success: true, checker: updatedChecker };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to assign checker employee',
    };
  }
}

export async function saveCheckerStationAction(
  payload: {
    name: string;
    status: CheckerOperationalStatus;
    employeeName?: string;
  },
  existingId?: string
): Promise<{
  success: boolean;
  checker?: QualityCheckerStationEntity;
  error?: string;
}> {
  try {
    const nameTrim = payload.name.trim();
    if (!nameTrim) throw new Error('Checker Station Name is required');

    const empTrim = (payload.employeeName ?? '').trim();
    if (empTrim) {
      const { data: otherCheckers, error: checkErr } = await supabaseAdmin
        .from('quality_checkers')
        .select('id, station_name, employee_name')
        .eq('is_active', true);
      if (checkErr) throw new Error(formatSupabaseError(checkErr));

      for (const oc of otherCheckers || []) {
        if (existingId && String(oc.id) === existingId) continue;
        if (String(oc.station_name || '').trim().toLowerCase() === nameTrim.toLowerCase()) continue;
        const ocEmp = String(oc.employee_name || '').trim();
        if (ocEmp && ocEmp.toLowerCase() === empTrim.toLowerCase()) {
          throw new Error(
            `${empTrim} danatamath ${oc.station_name} ekata assign karala thiyenne! Checkersla duplicate wenna ba.`
          );
        }
      }
    }

    const numMatch = nameTrim.match(/\d+/);
    const parsedNum = numMatch ? parseInt(numMatch[0], 10) : null;

    if (existingId) {
      const { data, error } = await supabaseAdmin
        .from('quality_checkers')
        .update({
          station_name: nameTrim,
          operational_status: payload.status,
          employee_name: empTrim,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingId)
        .select('*')
        .single();
      if (error) throw new Error(formatSupabaseError(error));
      revalidatePath('/');
      return { success: true, checker: mapCheckerStation(data) };
    } else {
      const { data, error } = await supabaseAdmin
        .from('quality_checkers')
        .insert({
          station_number: parsedNum,
          station_name: nameTrim,
          operational_status: payload.status,
          employee_name: empTrim,
          is_active: true,
        })
        .select('*')
        .single();
      if (error) throw new Error(formatSupabaseError(error));
      revalidatePath('/');
      return { success: true, checker: mapCheckerStation(data) };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to save checker station',
    };
  }
}

export async function deleteCheckerStationAction(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { error } = await supabaseAdmin.from('quality_checkers').delete().eq('id', id);
    if (error) throw new Error(formatSupabaseError(error));
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete checker station',
    };
  }
}

export async function saveQualityBlockAction(
  payload: {
    stationId: string | null;
    stationName: string;
    checkerName: string;
    styleId: string | null;
    styleCode: string;
    styleName: string;
    partName: string;
    clientName: string;
    date: string;
    shift: string;
    size: string;
    startHour: number;
    spanHours: number;
    planQty: number;
    actualQty: number;
    defectQty?: number;
  },
  existingId?: string
): Promise<{
  success: boolean;
  block?: QualityBlockEntity;
  error?: string;
}> {
  try {
    const startHour = Math.min(11, Math.max(1, Math.round(Number(payload.startHour) || 1)));
    const spanHours = Math.min(
      11 - startHour + 1,
      Math.max(1, Math.round(Number(payload.spanHours) || 1))
    );
    const planQty = Math.max(1, Math.round(Number(payload.planQty) || 1));
    const requestedActualQty = Math.max(0, Math.round(Number(payload.actualQty) || 0));
    const defectQty = Math.max(0, Math.round(Number(payload.defectQty) || 0));

    const nowLocal = new Date();
    const todayStr = `${nowLocal.getFullYear()}-${String(nowLocal.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(nowLocal.getDate()).padStart(2, '0')}`;

    if (payload.date >= todayStr && requestedActualQty > 0) {
      throw new Error(
        `Actual Checked Qty eka e dawasa (${payload.date}) iwara wenakan fill karanna ba! Pahuwada (${payload.date} dawasa iwara unata passe) Actual Qty eka fill karanna.`
      );
    }
    const actualQty = payload.date >= todayStr ? 0 : requestedActualQty;

    const checkerTrim = (payload.checkerName || '').trim();
    if (!checkerTrim || !/^EPF\s*#\d+\s*-\s*.+/i.test(checkerTrim)) {
      throw new Error(
        `${payload.stationName} ekata aththa Checker kenek (Employee Registry eken) assign karanna one! Checker kenek assign karanne nathuwa checking plan danna ba.`
      );
    }

    // Prevent duplicate checker across stations
    const { data: allCheckers, error: checkErr } = await supabaseAdmin
      .from('quality_checkers')
      .select('id, station_name, employee_name')
      .eq('is_active', true);
    if (checkErr) throw new Error(formatSupabaseError(checkErr));

    for (const oc of allCheckers || []) {
      const isSameStation =
        (payload.stationId && String(oc.id) === payload.stationId) ||
        String(oc.station_name || '').trim().toLowerCase() ===
          payload.stationName.trim().toLowerCase();
      if (isSameStation) continue;

      const ocEmp = String(oc.employee_name || '').trim();
      if (ocEmp && ocEmp.toLowerCase() === checkerTrim.toLowerCase()) {
        throw new Error(
          `${checkerTrim} danatamath ${oc.station_name} ekata assign karala thiyenne! Checkersla duplicate wenna ba.`
        );
      }
    }

    // Enforce Style Order Qty & Size Qty ceiling across quality_assignments
    const { data: styleRows } = await supabaseAdmin
      .from('styles')
      .select('id, style_code, style_name, order_qty, size_breakdown')
      .eq('is_active', true);

    const matchedStyleRow = (styleRows || []).find(
      (s: Record<string, unknown>) =>
        (payload.styleId && String(s.id) === payload.styleId) ||
        (payload.styleCode && String(s.style_code || '') === payload.styleCode) ||
        String(s.style_name || '') === payload.styleName
    );

    if (matchedStyleRow) {
      const styleOrderQty = Math.max(0, Number(matchedStyleRow.order_qty || 0));
      const { data: existingBlocks } = await supabaseAdmin
        .from('quality_assignments')
        .select('id, style_id, style_code, style_name, garment_size, plan_qty');

      const otherStyleBlocks = (existingBlocks || []).filter((b: Record<string, unknown>) => {
        if (existingId && String(b.id) === existingId) return false;
        return (
          (payload.styleId && String(b.style_id || '') === payload.styleId) ||
          (payload.styleCode && String(b.style_code || '') === payload.styleCode) ||
          String(b.style_name || '') === payload.styleName
        );
      });

      const existingStylePlanned = otherStyleBlocks.reduce(
        (sum: number, b: Record<string, unknown>) => sum + Math.max(0, Number(b.plan_qty || 0)),
        0
      );

      if (styleOrderQty > 0 && existingStylePlanned + planQty > styleOrderQty) {
        const remainingStyle = Math.max(0, styleOrderQty - existingStylePlanned);
        throw new Error(
          `Order Qty (${styleOrderQty.toLocaleString()} Pcs) walata wada Checking Plan Qty (${(
            existingStylePlanned + planQty
          ).toLocaleString()} Pcs) wadiyen danna ba! Thawa ithuru wela thiyenne ${remainingStyle.toLocaleString()} Pcs witharai.`
        );
      }

      if (Array.isArray(matchedStyleRow.size_breakdown) && matchedStyleRow.size_breakdown.length > 0) {
        const targetSizeEntry = matchedStyleRow.size_breakdown.find(
          (sz: Record<string, unknown>) =>
            String(sz.size || '').trim().toLowerCase() ===
            String(payload.size || '').trim().toLowerCase()
        ) as Record<string, unknown> | undefined;

        if (targetSizeEntry) {
          const sizeOrderQty = Math.max(0, Number(targetSizeEntry.qty || 0));
          const existingSizePlanned = otherStyleBlocks
            .filter(
              (b: Record<string, unknown>) =>
                String(b.garment_size || '').trim().toLowerCase() ===
                String(payload.size || '').trim().toLowerCase()
            )
            .reduce(
              (sum: number, b: Record<string, unknown>) =>
                sum + Math.max(0, Number(b.plan_qty || 0)),
              0
            );

          if (sizeOrderQty > 0 && existingSizePlanned + planQty > sizeOrderQty) {
            const remainingSize = Math.max(0, sizeOrderQty - existingSizePlanned);
            throw new Error(
              `Size "${payload.size}" wala Qty (${sizeOrderQty.toLocaleString()} Pcs) walata wada Checking Plan Qty (${(
                existingSizePlanned + planQty
              ).toLocaleString()} Pcs) wadiyen danna ba! Size "${
                payload.size
              }" wala ithuru ${remainingSize.toLocaleString()} Pcs witharai.`
            );
          }
        }
      }
    }

    const dbRow = {
      station_id: payload.stationId || null,
      station_name: payload.stationName.trim(),
      checker_name: checkerTrim,
      style_id: payload.styleId || null,
      style_code: payload.styleCode.trim(),
      style_name: payload.styleName.trim(),
      part_name: payload.partName.trim(),
      client_name: payload.clientName.trim(),
      assignment_date: payload.date,
      shift: payload.shift || 'day',
      garment_size: payload.size || 'Free Size',
      start_hour: startHour,
      span_hours: spanHours,
      plan_qty: planQty,
      actual_qty: actualQty,
      defect_qty: defectQty,
      status: 'ACTIVE',
      updated_at: new Date().toISOString(),
    };

    let savedRow: Record<string, unknown>;
    if (existingId) {
      const { data, error } = await supabaseAdmin
        .from('quality_assignments')
        .update(dbRow)
        .eq('id', existingId)
        .select('*')
        .single();
      if (error) throw new Error(formatSupabaseError(error));
      savedRow = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from('quality_assignments')
        .insert(dbRow)
        .select('*')
        .single();
      if (error) throw new Error(formatSupabaseError(error));
      savedRow = data;
    }

    // Keep quality_checkers.employee_name synced with the assigned checker
    if (payload.stationId) {
      await supabaseAdmin
        .from('quality_checkers')
        .update({
          employee_name: checkerTrim,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payload.stationId);
    } else if (payload.stationName) {
      await supabaseAdmin
        .from('quality_checkers')
        .update({
          employee_name: checkerTrim,
          updated_at: new Date().toISOString(),
        })
        .eq('station_name', payload.stationName.trim());
    }

    revalidatePath('/');
    return {
      success: true,
      block: mapQualityBlock(savedRow),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to save quality checking block',
    };
  }
}

export async function deleteQualityBlockAction(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { error } = await supabaseAdmin.from('quality_assignments').delete().eq('id', id);
    if (error) throw new Error(formatSupabaseError(error));
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete quality checking block',
    };
  }
}

export async function saveQualityDeliveryTargetAction(payload: {
  styleId: string | null;
  styleName: string;
  date: string;
  deliveryQty: number;
}): Promise<{
  success: boolean;
  target?: QualityDeliveryTargetEntity;
  error?: string;
}> {
  try {
    const styleNameTrim = payload.styleName.trim();
    if (!styleNameTrim) throw new Error('Style Name is required');
    const deliveryQty = Math.max(0, Math.round(Number(payload.deliveryQty) || 0));

    const { data, error } = await supabaseAdmin
      .from('quality_delivery_targets')
      .upsert(
        {
          style_id: payload.styleId || null,
          style_name: styleNameTrim,
          target_date: payload.date,
          delivery_qty: deliveryQty,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'style_name,target_date' }
      )
      .select('*')
      .single();

    if (error) throw new Error(formatSupabaseError(error));
    revalidatePath('/');
    return {
      success: true,
      target: mapDeliveryTarget(data),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to save today delivery target',
    };
  }
}
