'use server';

import { supabaseAdmin, formatSupabaseError } from '@/lib/supabase/admin';
import { checkErpSessionAction } from '@/actions/auth';
import { recordAuditLog } from '@/lib/audit';
import { fetchMonthlyRecordsAction } from '@/actions/payroll';

export interface FinanceRevenueLog {
  id: string;
  date: string;
  machine: string;
  styleCode: string;
  qty: number;
  paymentStatus: 'Received' | 'Pending';
}

export interface FinanceSalaryLog {
  id: string;
  month: string;
  name: string;
  basic: number;
  ot: number;
  epf12: number;
  etf3: number;
  status: 'Paid' | 'Pending';
}

export interface FinanceCogsLog {
  id: string;
  date: string;
  category: string;
  desc: string;
  amount: number;
}

export interface FinanceOpexLog {
  id: string;
  date: string;
  category: string;
  desc: string;
  amount: number;
  billBase64: string | null;
}

export interface FinanceBundle {
  cloudReady: boolean;
  revenueLogs: FinanceRevenueLog[];
  salaryLogs: FinanceSalaryLog[];
  erpPayrollLogs: FinanceSalaryLog[];
  cogsLogs: FinanceCogsLog[];
  opexLogs: FinanceOpexLog[];
}

function normalizePayrollMonth(raw: string): string {
  const trimmed = String(raw || '').trim();
  if (/^\d{4}-\d{2}$/.test(trimmed)) return trimmed;
  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
  ];
  const parts = trimmed.toLowerCase().split(/\s+/);
  if (parts.length === 2) {
    const mIdx = monthNames.indexOf(parts[0]);
    const year = parseInt(parts[1], 10);
    if (mIdx >= 0 && year > 2000) {
      return `${year}-${String(mIdx + 1).padStart(2, '0')}`;
    }
  }
  return trimmed;
}

async function ensureFinanceSession() {
  const session = await checkErpSessionAction();
  if (!session.authenticated) {
    return { ok: false as const, error: 'Authentication required' };
  }
  if (!session.allowedModules.includes('finance')) {
    return { ok: false as const, error: 'You do not have access to Financial Governance' };
  }
  return { ok: true as const, session };
}

function isMissingTableError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = (err as { code?: string }).code;
  const msg = String((err as { message?: string }).message || '');
  return code === 'PGRST205' || msg.includes('Could not find the table');
}

export async function fetchFinanceBundleAction(): Promise<{
  success: boolean;
  data?: FinanceBundle;
  error?: string;
}> {
  try {
    const auth = await ensureFinanceSession();
    if (!auth.ok) return { success: false, error: auth.error };

    const [revRes, salRes, cogsRes, opexRes, erpPayRes] = await Promise.all([
      supabaseAdmin.from('finance_revenue_logs').select('*').order('log_date', { ascending: false }),
      supabaseAdmin.from('finance_salary_logs').select('*').order('payroll_month', { ascending: false }),
      supabaseAdmin.from('finance_cogs_logs').select('*').order('log_date', { ascending: false }),
      supabaseAdmin.from('finance_opex_logs').select('*').order('log_date', { ascending: false }),
      supabaseAdmin
        .from('payroll_records')
        .select('*, employees!inner(is_active, deleted_at)')
        .eq('employees.is_active', true)
        .is('employees.deleted_at', null)
        .order('month', { ascending: false }),
    ]);

    const erpPayrollLogs: FinanceSalaryLog[] = (erpPayRes.data || []).map((r) => {
      const otAndAllowances =
        (Number(r.prod_allow) || 0) +
        (Number(r.grade_allow) || 0) +
        (Number(r.att_allow) || 0) +
        (Number(r.trans_allow) || 0) +
        (Number(r.night_allow) || 0) +
        (Number(r.checking_allow) || 0) +
        (Number(r.ot_amt) || 0) +
        (Number(r.sot_amt) || 0) +
        (Number(r.tot_amt) || 0) +
        (Number(r.poya_day_amt) || 0) +
        (Number(r.sunday_amt) || 0) +
        (Number(r.special_leave_amt) || 0);

      const basic = Number(r.basic) || 0;
      const epf12 = Number(r.epf_12) || Math.round(basic * 0.12 * 100) / 100;
      const etf3 = Number(r.etf_3) || Math.round(basic * 0.03 * 100) / 100;

      return {
        id: `erp-${String(r.id)}`,
        month: normalizePayrollMonth(String(r.month || '')),
        name: `${String(r.name || 'Employee')} (EPF-${String(r.epf_no || '')})`,
        basic,
        ot: Math.round(otAndAllowances * 100) / 100,
        epf12,
        etf3,
        status: String(r.status || '').toUpperCase() === 'PAID' ? 'Paid' : 'Pending',
      };
    });

    const firstError = revRes.error || salRes.error || cogsRes.error || opexRes.error;
    if (firstError) {
      if (isMissingTableError(firstError)) {
        return {
          success: true,
          data: {
            cloudReady: false,
            revenueLogs: [],
            salaryLogs: [],
            erpPayrollLogs,
            cogsLogs: [],
            opexLogs: [],
          },
        };
      }
      return { success: false, error: formatSupabaseError(firstError) };
    }

    return {
      success: true,
      data: {
        cloudReady: true,
        revenueLogs: (revRes.data || []).map((r) => ({
          id: String(r.id),
          date: String(r.log_date),
          machine: String(r.machine_name),
          styleCode: String(r.style_code),
          qty: Number(r.qty) || 0,
          paymentStatus: r.payment_status === 'Pending' ? 'Pending' : 'Received',
        })),
        salaryLogs: (salRes.data || []).map((r) => ({
          id: String(r.id),
          month: String(r.payroll_month),
          name: String(r.employee_name),
          basic: Number(r.basic_salary) || 0,
          ot: Number(r.ot_allowances) || 0,
          epf12: Number(r.epf_12) || 0,
          etf3: Number(r.etf_3) || 0,
          status: r.payment_status === 'Pending' ? 'Pending' : 'Paid',
        })),
        erpPayrollLogs,
        cogsLogs: (cogsRes.data || []).map((r) => ({
          id: String(r.id),
          date: String(r.log_date),
          category: String(r.category),
          desc: String(r.description),
          amount: Number(r.amount) || 0,
        })),
        opexLogs: (opexRes.data || []).map((r) => ({
          id: String(r.id),
          date: String(r.log_date),
          category: String(r.category),
          desc: String(r.description),
          amount: Number(r.amount) || 0,
          billBase64: r.bill_data_url ? String(r.bill_data_url) : null,
        })),
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to load financial data',
    };
  }
}

export async function createFinanceRevenueAction(input: {
  date: string;
  machine: string;
  styleCode: string;
  qty: number;
  paymentStatus: 'Received' | 'Pending';
}): Promise<{ success: boolean; data?: FinanceRevenueLog; cloudSaved?: boolean; error?: string }> {
  const auth = await ensureFinanceSession();
  if (!auth.ok) return { success: false, error: auth.error };

  const { data, error } = await supabaseAdmin
    .from('finance_revenue_logs')
    .insert({
      log_date: input.date,
      machine_name: input.machine,
      style_code: input.styleCode,
      qty: input.qty,
      payment_status: input.paymentStatus,
      created_by: auth.session.userId,
    })
    .select('*')
    .single();

  if (error) {
    if (isMissingTableError(error)) {
      return { success: true, cloudSaved: false };
    }
    return { success: false, error: formatSupabaseError(error) };
  }

  await recordAuditLog({
    actor: {
      userId: auth.session.userId,
      email: auth.session.email,
      role: auth.session.role,
    },
    module: 'finance',
    action: 'create_revenue_log',
    summary: `Logged machine revenue ${input.machine} (${input.styleCode}) x${input.qty} [${input.paymentStatus}]`,
    metadata: { id: data.id },
  });

  return {
    success: true,
    cloudSaved: true,
    data: {
      id: String(data.id),
      date: String(data.log_date),
      machine: String(data.machine_name),
      styleCode: String(data.style_code),
      qty: Number(data.qty),
      paymentStatus: data.payment_status === 'Pending' ? 'Pending' : 'Received',
    },
  };
}

export async function toggleFinanceRevenueStatusAction(
  id: string,
  nextStatus: 'Received' | 'Pending'
): Promise<{ success: boolean; error?: string }> {
  const auth = await ensureFinanceSession();
  if (!auth.ok) return { success: false, error: auth.error };

  const { error } = await supabaseAdmin
    .from('finance_revenue_logs')
    .update({ payment_status: nextStatus })
    .eq('id', id);

  if (error) {
    if (isMissingTableError(error)) return { success: true };
    return { success: false, error: formatSupabaseError(error) };
  }

  await recordAuditLog({
    actor: {
      userId: auth.session.userId,
      email: auth.session.email,
      role: auth.session.role,
    },
    module: 'finance',
    action: 'toggle_revenue_status',
    summary: `Marked machine revenue ${id} as ${nextStatus}`,
    metadata: { id },
  });

  return { success: true };
}

export async function deleteFinanceRecordAction(
  table: 'finance_revenue_logs' | 'finance_salary_logs' | 'finance_cogs_logs' | 'finance_opex_logs',
  id: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await ensureFinanceSession();
  if (!auth.ok) return { success: false, error: auth.error };

  const { error } = await supabaseAdmin.from(table).delete().eq('id', id);
  if (error) {
    if (isMissingTableError(error)) return { success: true };
    return { success: false, error: formatSupabaseError(error) };
  }

  await recordAuditLog({
    actor: {
      userId: auth.session.userId,
      email: auth.session.email,
      role: auth.session.role,
    },
    module: 'finance',
    action: 'delete_finance_record',
    summary: `Deleted record ${id} from ${table}`,
    metadata: { table, id },
  });

  return { success: true };
}

export async function createFinanceSalaryAction(input: {
  month: string;
  name: string;
  basic: number;
  ot: number;
  epf12: number;
  etf3: number;
  status: 'Paid' | 'Pending';
}): Promise<{ success: boolean; data?: FinanceSalaryLog; cloudSaved?: boolean; error?: string }> {
  const auth = await ensureFinanceSession();
  if (!auth.ok) return { success: false, error: auth.error };

  const { data, error } = await supabaseAdmin
    .from('finance_salary_logs')
    .insert({
      payroll_month: input.month,
      employee_name: input.name,
      basic_salary: input.basic,
      ot_allowances: input.ot,
      epf_12: input.epf12,
      etf_3: input.etf3,
      payment_status: input.status,
      created_by: auth.session.userId,
    })
    .select('*')
    .single();

  if (error) {
    if (isMissingTableError(error)) return { success: true, cloudSaved: false };
    return { success: false, error: formatSupabaseError(error) };
  }

  await recordAuditLog({
    actor: {
      userId: auth.session.userId,
      email: auth.session.email,
      role: auth.session.role,
    },
    module: 'finance',
    action: 'create_salary_log',
    summary: `Logged salary for ${input.name} (${input.month}) [${input.status}]`,
    metadata: { id: data.id },
  });

  return {
    success: true,
    cloudSaved: true,
    data: {
      id: String(data.id),
      month: String(data.payroll_month),
      name: String(data.employee_name),
      basic: Number(data.basic_salary),
      ot: Number(data.ot_allowances),
      epf12: Number(data.epf_12),
      etf3: Number(data.etf_3),
      status: data.payment_status === 'Pending' ? 'Pending' : 'Paid',
    },
  };
}

export async function toggleFinanceSalaryStatusAction(
  id: string,
  nextStatus: 'Paid' | 'Pending'
): Promise<{ success: boolean; error?: string }> {
  const auth = await ensureFinanceSession();
  if (!auth.ok) return { success: false, error: auth.error };

  const { error } = await supabaseAdmin
    .from('finance_salary_logs')
    .update({ payment_status: nextStatus })
    .eq('id', id);

  if (error) {
    if (isMissingTableError(error)) return { success: true };
    return { success: false, error: formatSupabaseError(error) };
  }

  return { success: true };
}

export async function createFinanceCogsAction(input: {
  date: string;
  category: string;
  desc: string;
  amount: number;
}): Promise<{ success: boolean; data?: FinanceCogsLog; cloudSaved?: boolean; error?: string }> {
  const auth = await ensureFinanceSession();
  if (!auth.ok) return { success: false, error: auth.error };

  const { data, error } = await supabaseAdmin
    .from('finance_cogs_logs')
    .insert({
      log_date: input.date,
      category: input.category,
      description: input.desc,
      amount: input.amount,
      created_by: auth.session.userId,
    })
    .select('*')
    .single();

  if (error) {
    if (isMissingTableError(error)) return { success: true, cloudSaved: false };
    return { success: false, error: formatSupabaseError(error) };
  }

  await recordAuditLog({
    actor: {
      userId: auth.session.userId,
      email: auth.session.email,
      role: auth.session.role,
    },
    module: 'finance',
    action: 'create_cogs_log',
    summary: `Logged COGS ${input.category}: ${input.desc} (LKR ${input.amount})`,
    metadata: { id: data.id },
  });

  return {
    success: true,
    cloudSaved: true,
    data: {
      id: String(data.id),
      date: String(data.log_date),
      category: String(data.category),
      desc: String(data.description),
      amount: Number(data.amount),
    },
  };
}

export async function createFinanceOpexAction(input: {
  date: string;
  category: string;
  desc: string;
  amount: number;
  billBase64: string | null;
}): Promise<{ success: boolean; data?: FinanceOpexLog; cloudSaved?: boolean; error?: string }> {
  const auth = await ensureFinanceSession();
  if (!auth.ok) return { success: false, error: auth.error };

  const { data, error } = await supabaseAdmin
    .from('finance_opex_logs')
    .insert({
      log_date: input.date,
      category: input.category,
      description: input.desc,
      amount: input.amount,
      bill_data_url: input.billBase64,
      created_by: auth.session.userId,
    })
    .select('*')
    .single();

  if (error) {
    if (isMissingTableError(error)) return { success: true, cloudSaved: false };
    return { success: false, error: formatSupabaseError(error) };
  }

  await recordAuditLog({
    actor: {
      userId: auth.session.userId,
      email: auth.session.email,
      role: auth.session.role,
    },
    module: 'finance',
    action: 'create_opex_log',
    summary: `Logged OPEX ${input.category}: ${input.desc} (LKR ${input.amount})`,
    metadata: { id: data.id },
  });

  return {
    success: true,
    cloudSaved: true,
    data: {
      id: String(data.id),
      date: String(data.log_date),
      category: String(data.category),
      desc: String(data.description),
      amount: Number(data.amount),
      billBase64: data.bill_data_url ? String(data.bill_data_url) : null,
    },
  };
}

export async function importErpPayrollMonthAction(month: string): Promise<{
  success: boolean;
  data?: Omit<FinanceSalaryLog, 'id'>[];
  error?: string;
}> {
  const auth = await ensureFinanceSession();
  if (!auth.ok) return { success: false, error: auth.error };

  let res = await fetchMonthlyRecordsAction(month);
  if (res.success && (!res.data || res.data.length === 0)) {
    const [y, m] = month.split('-');
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const mIdx = parseInt(m, 10) - 1;
    if (y && mIdx >= 0 && mIdx < 12) {
      res = await fetchMonthlyRecordsAction(`${monthNames[mIdx]} ${y}`);
    }
  }

  if (!res.success || !res.data) {
    return { success: false, error: res.error || 'Failed to read ERP payroll records' };
  }

  const mapped: Omit<FinanceSalaryLog, 'id'>[] = res.data.map((rec) => {
    const otAndAllowances =
      (Number(rec.totalOt) || 0) +
      (Number(rec.totalAllowances) || 0) +
      (Number(rec.totalSpecialIncentives) || 0);

    return {
      month,
      name: `${rec.name} (EPF-${rec.epfNo})`,
      basic: Number(rec.basic) || 0,
      ot: Math.round(otAndAllowances * 100) / 100,
      epf12: Number(rec.epf12) || 0,
      etf3: Number(rec.etf3) || 0,
      status: rec.status === 'PAID' ? 'Paid' : 'Pending',
    };
  });

  return { success: true, data: mapped };
}
