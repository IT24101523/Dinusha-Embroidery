'use server';

import { headers } from 'next/headers';
import { supabaseAdmin, formatSupabaseError } from '@/lib/supabase/admin';
import { checkErpSessionAction, requestPasswordResetAction } from '@/actions/auth';
import { recordAuditLog } from '@/lib/audit';
import { resolveAllowedModules, type ErpModuleId } from '@/lib/rbac';
import { payrollRepository } from '@/modules/payroll/repositories/payroll-repository';
import type { UserRole } from '@/db/schema/users';
import { revalidatePath } from 'next/cache';

export type ApprovalRequestKind =
  | 'PAYROLL_EDIT'
  | 'INVOICE_EDIT'
  | 'INVOICE_DELETE';

export type ApprovalRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ErpApprovalRequestEntity {
  id: string;
  requestKind: ApprovalRequestKind;
  status: ApprovalRequestStatus;
  targetId: string;
  targetLabel: string;
  amountLabel: string;
  reason: string;
  requestedByName: string;
  requestedByEmail: string;
  requestedByRole: string;
  createdAt: string;
  resolvedAt: string | null;
  resolvedByName: string | null;
  adminNote: string | null;
  employeeId?: string;
  epfNo?: number;
  employeeName?: string;
  month?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  customerName?: string;
}

const INTERNAL_USERNAME_DOMAIN = 'users.dinushaemb.com';
const USERNAME_REGEX = /^[a-z0-9][a-z0-9._-]{2,31}$/;

function normalizeUsername(raw: string | undefined | null): string {
  return (raw || '').trim().toLowerCase().replace(/^@+/, '');
}

export interface ErpUserAccountEntity {
  id: string;
  authUserId: string;
  fullName: string;
  username: string;
  email: string;
  hasRealEmail: boolean;
  role: UserRole;
  allowedModules: ErpModuleId[];
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface ErpAuditLogEntity {
  id: string;
  actorUserId: string | null;
  actorEmail: string;
  actorName: string;
  actorRole: string;
  module: string;
  action: string;
  summary: string;
  createdAt: string;
}

function mapUserProfile(
  row: Record<string, unknown>,
  authUsernameMap?: Map<string, string>
): ErpUserAccountEntity {
  const role = (row.role as UserRole) || 'PRODUCTION_MANAGER';
  const authUserId = String(row.auth_user_id);
  const email = String(row.email || '').trim().toLowerCase();
  const hasRealEmail = Boolean(email) && !email.endsWith(`@${INTERNAL_USERNAME_DOMAIN}`);
  const metaUsername = authUsernameMap?.get(authUserId);
  const fallbackUsername = email ? email.split('@')[0] : '';
  const username = normalizeUsername(metaUsername || fallbackUsername);

  return {
    id: String(row.id),
    authUserId,
    fullName: String(row.full_name || ''),
    username,
    email,
    hasRealEmail,
    role,
    allowedModules: resolveAllowedModules(
      role,
      (row.allowed_modules as string[] | null) ?? null
    ),
    isActive: row.is_active !== false,
    lastLoginAt: row.last_login_at ? String(row.last_login_at) : null,
    createdAt: String(row.created_at || ''),
  };
}

function mapAuditLog(row: Record<string, unknown>): ErpAuditLogEntity {
  return {
    id: String(row.id),
    actorUserId: row.actor_user_id ? String(row.actor_user_id) : null,
    actorEmail: String(row.actor_email || ''),
    actorName: String(row.actor_name || 'System'),
    actorRole: String(row.actor_role || ''),
    module: String(row.module || ''),
    action: String(row.action || ''),
    summary: String(row.summary || ''),
    createdAt: String(row.created_at || ''),
  };
}

function mapApprovalRequest(row: Record<string, unknown>): ErpApprovalRequestEntity {
  const meta =
    row.metadata && typeof row.metadata === 'object'
      ? (row.metadata as Record<string, unknown>)
      : {};
  const rawAction = String(row.action || meta.status || 'PENDING').toUpperCase();
  const status: ApprovalRequestStatus =
    rawAction === 'APPROVED' || rawAction === 'REJECTED' ? rawAction : 'PENDING';
  const rawKind = String(meta.requestKind || 'INVOICE_EDIT');
  const requestKind: ApprovalRequestKind =
    rawKind === 'PAYROLL_EDIT' || rawKind === 'INVOICE_DELETE' ? rawKind : 'INVOICE_EDIT';

  return {
    id: String(row.id),
    requestKind,
    status,
    targetId: String(meta.targetId || ''),
    targetLabel: String(meta.targetLabel || row.summary || ''),
    amountLabel: String(meta.amountLabel || ''),
    reason: String(meta.reason || ''),
    requestedByName: String(row.actor_name || meta.requestedByName || 'System User'),
    requestedByEmail: String(row.actor_email || meta.requestedByEmail || ''),
    requestedByRole: String(row.actor_role || meta.requestedByRole || ''),
    createdAt: String(row.created_at || ''),
    resolvedAt: meta.resolvedAt ? String(meta.resolvedAt) : null,
    resolvedByName: meta.resolvedByName ? String(meta.resolvedByName) : null,
    adminNote: meta.adminNote ? String(meta.adminNote) : null,
    employeeId: meta.employeeId ? String(meta.employeeId) : undefined,
    epfNo: typeof meta.epfNo === 'number' ? meta.epfNo : undefined,
    employeeName: meta.employeeName ? String(meta.employeeName) : undefined,
    month: meta.month ? String(meta.month) : undefined,
    invoiceId: meta.invoiceId ? String(meta.invoiceId) : undefined,
    invoiceNumber: meta.invoiceNumber ? String(meta.invoiceNumber) : undefined,
    customerName: meta.customerName ? String(meta.customerName) : undefined,
  };
}

async function requireSuperAdmin() {
  const session = await checkErpSessionAction();
  if (!session.authenticated || (session.role !== 'SUPER_ADMIN' && session.role !== 'CEO')) {
    return { ok: false as const, session };
  }
  return { ok: true as const, session };
}

export async function fetchAdminUsersAndLogsAction(): Promise<{
  success: boolean;
  users?: ErpUserAccountEntity[];
  logs?: ErpAuditLogEntity[];
  requests?: ErpApprovalRequestEntity[];
  error?: string;
}> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) {
    return { success: false, error: 'Admin access required.' };
  }

  const [usersRes, authListRes, logsRes, reqRes] = await Promise.all([
    supabaseAdmin.from('user_profiles').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
    supabaseAdmin
      .from('erp_audit_logs')
      .select('*')
      .neq('module', 'APPROVAL_REQUEST')
      .neq('module', 'EMPLOYEE_ANNUAL_LEAVE')
      .order('created_at', { ascending: false })
      .limit(250),
    supabaseAdmin
      .from('erp_audit_logs')
      .select('*')
      .eq('module', 'APPROVAL_REQUEST')
      .order('created_at', { ascending: false })
      .limit(200),
  ]);

  if (usersRes.error) {
    return {
      success: false,
      error: formatSupabaseError(usersRes.error),
    };
  }

  const authUsernameMap = new Map<string, string>();
  for (const au of authListRes.data?.users || []) {
    const metaU = normalizeUsername(String(au.user_metadata?.username || ''));
    if (metaU) authUsernameMap.set(au.id, metaU);
  }

  return {
    success: true,
    users: (usersRes.data || []).map((r) => mapUserProfile(r, authUsernameMap)),
    logs: (logsRes.data || []).map((r) => mapAuditLog(r)),
    requests: (reqRes.data || []).map((r) => mapApprovalRequest(r)),
  };
}

export async function fetchAuditLogsAction(): Promise<{
  success: boolean;
  logs?: ErpAuditLogEntity[];
  error?: string;
}> {
  const session = await checkErpSessionAction();
  if (!session.authenticated) {
    return { success: false, error: 'Unauthorized.' };
  }

  const { data, error } = await supabaseAdmin
    .from('erp_audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(250);

  if (error) {
    return { success: false, error: formatSupabaseError(error) };
  }

  return {
    success: true,
    logs: (data || []).map((r) => mapAuditLog(r)),
  };
}

async function isUsernameTaken(username: string, excludeAuthUserId?: string): Promise<boolean> {
  const norm = normalizeUsername(username);
  if (!norm) return false;
  const internalEmail = `${norm}@${INTERNAL_USERNAME_DOMAIN}`;

  const [authListRes, profRes] = await Promise.all([
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
    supabaseAdmin.from('user_profiles').select('auth_user_id, email'),
  ]);

  for (const u of authListRes.data?.users || []) {
    if (excludeAuthUserId && u.id === excludeAuthUserId) continue;
    const metaU = normalizeUsername(String(u.user_metadata?.username || ''));
    if (metaU === norm) return true;
    if ((u.email || '').toLowerCase() === internalEmail) return true;
  }

  for (const p of profRes.data || []) {
    if (excludeAuthUserId && String(p.auth_user_id) === excludeAuthUserId) continue;
    if (String(p.email || '').toLowerCase() === internalEmail) return true;
  }

  return false;
}

export async function createErpUserAction(input: {
  fullName: string;
  username: string;
  email?: string;
  role: UserRole;
  password: string;
  allowedModules: ErpModuleId[];
}): Promise<{ success: boolean; user?: ErpUserAccountEntity; error?: string }> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) {
    return { success: false, error: 'Super Admin access required.' };
  }

  const fullName = (input.fullName || '').trim();
  const username = normalizeUsername(input.username);
  const rawEmail = (input.email || '').trim().toLowerCase();
  const password = input.password || '';

  if (fullName.length < 2) {
    return { success: false, error: 'Please provide a valid full name (at least 2 characters).' };
  }
  if (!USERNAME_REGEX.test(username)) {
    return {
      success: false,
      error:
        'Username must be 3–32 characters (lowercase letters, numbers, dots, underscores, or hyphens).',
    };
  }
  if (rawEmail && !rawEmail.includes('@')) {
    return { success: false, error: 'Please enter a valid work email or leave it blank.' };
  }
  if (password.length < 6) {
    return { success: false, error: 'Initial password must be at least 6 characters.' };
  }

  if (await isUsernameTaken(username)) {
    return {
      success: false,
      error: `Username "@${username}" is already taken. Please choose another username.`,
    };
  }

  const finalEmail = rawEmail || `${username}@${INTERNAL_USERNAME_DOMAIN}`;

  const { data: createdAuth, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email: finalEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, username },
  });

  if (authErr || !createdAuth.user) {
    return {
      success: false,
      error: authErr?.message || 'Failed to create Auth user.',
    };
  }

  const resolvedModules = resolveAllowedModules(input.role, input.allowedModules);

  const { data: profile, error: profErr } = await supabaseAdmin
    .from('user_profiles')
    .insert({
      auth_user_id: createdAuth.user.id,
      full_name: fullName,
      email: finalEmail,
      role: input.role,
      allowed_modules: resolvedModules,
      is_active: true,
    })
    .select('*')
    .single();

  if (profErr || !profile) {
    await supabaseAdmin.auth.admin.deleteUser(createdAuth.user.id);
    return {
      success: false,
      error: profErr ? formatSupabaseError(profErr) : 'Failed to save user profile.',
    };
  }

  await recordAuditLog({
    module: 'User Access',
    action: 'CREATE',
    summary: `Created user ${fullName} (@${username}) with role ${input.role} and ${resolvedModules.length} accessible module(s).`,
  });

  revalidatePath('/erp');
  const uMap = new Map<string, string>([[createdAuth.user.id, username]]);
  return { success: true, user: mapUserProfile(profile, uMap) };
}

export async function updateErpUserAction(input: {
  id: string;
  authUserId?: string;
  fullName: string;
  username?: string;
  email?: string;
  role: UserRole;
  isActive: boolean;
  allowedModules: ErpModuleId[];
}): Promise<{ success: boolean; user?: ErpUserAccountEntity; error?: string }> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) {
    return { success: false, error: 'Super Admin access required.' };
  }

  const { data: existingProf, error: fetchErr } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('id', input.id)
    .single();

  if (fetchErr || !existingProf) {
    return { success: false, error: 'User profile not found.' };
  }

  const authUserId = input.authUserId || String(existingProf.auth_user_id);
  const fullNameTrim = input.fullName.trim();
  if (fullNameTrim.length < 2) {
    return { success: false, error: 'Full Name must be at least 2 characters.' };
  }

  const nextUsername = input.username ? normalizeUsername(input.username) : '';
  if (nextUsername && !USERNAME_REGEX.test(nextUsername)) {
    return {
      success: false,
      error:
        'Username must be 3–32 characters (lowercase letters, numbers, dots, underscores, or hyphens).',
    };
  }

  if (nextUsername && (await isUsernameTaken(nextUsername, authUserId))) {
    return {
      success: false,
      error: `Username "@${nextUsername}" is already used by another account.`,
    };
  }

  const currentEmail = String(existingProf.email || '').trim().toLowerCase();
  const isCurrentlyInternal = currentEmail.endsWith(`@${INTERNAL_USERNAME_DOMAIN}`);
  const rawNextEmail = typeof input.email === 'string' ? input.email.trim().toLowerCase() : undefined;

  let nextEmail = currentEmail;
  if (rawNextEmail !== undefined) {
    if (rawNextEmail === '') {
      nextEmail = nextUsername
        ? `${nextUsername}@${INTERNAL_USERNAME_DOMAIN}`
        : currentEmail;
    } else if (!rawNextEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid work email or leave it blank.' };
    } else {
      nextEmail = rawNextEmail;
    }
  } else if (isCurrentlyInternal && nextUsername) {
    nextEmail = `${nextUsername}@${INTERNAL_USERNAME_DOMAIN}`;
  }

  // Sync Supabase Auth metadata & email if changed
  const authUpdatePayload: {
    email?: string;
    email_confirm?: boolean;
    user_metadata: { full_name: string; username?: string };
  } = {
    user_metadata: {
      full_name: fullNameTrim,
      ...(nextUsername ? { username: nextUsername } : {}),
    },
  };
  if (nextEmail && nextEmail !== currentEmail) {
    authUpdatePayload.email = nextEmail;
    authUpdatePayload.email_confirm = true;
  }

  const { error: authUpdErr } = await supabaseAdmin.auth.admin.updateUserById(
    authUserId,
    authUpdatePayload
  );
  if (authUpdErr) {
    return { success: false, error: authUpdErr.message || 'Failed to update auth credentials.' };
  }

  const resolvedModules = resolveAllowedModules(input.role, input.allowedModules);

  const { data: profile, error } = await supabaseAdmin
    .from('user_profiles')
    .update({
      full_name: fullNameTrim,
      email: nextEmail,
      role: input.role,
      is_active: input.isActive,
      allowed_modules: resolvedModules,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id)
    .select('*')
    .single();

  if (error || !profile) {
    return {
      success: false,
      error: error ? formatSupabaseError(error) : 'Failed to update user account.',
    };
  }

  await recordAuditLog({
    module: 'User Access',
    action: 'UPDATE',
    summary: `Updated ${profile.full_name} (@${nextUsername || nextEmail.split('@')[0]}): role=${input.role}, active=${input.isActive}, modules=[${resolvedModules.join(', ')}].`,
  });

  revalidatePath('/erp');
  const uMap = nextUsername ? new Map<string, string>([[authUserId, nextUsername]]) : undefined;
  return { success: true, user: mapUserProfile(profile, uMap) };
}

export async function toggleErpUserActiveAction(input: {
  id: string;
  authUserId: string;
  isActive: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) {
    return { success: false, error: 'Super Admin access required.' };
  }
  if (!input.isActive && guard.session.userId === input.authUserId) {
    return { success: false, error: 'You cannot disable your own active Super Admin account.' };
  }

  const { data: profile, error } = await supabaseAdmin
    .from('user_profiles')
    .update({
      is_active: input.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id)
    .select('full_name, email')
    .single();

  if (error) {
    return { success: false, error: formatSupabaseError(error) };
  }

  await recordAuditLog({
    module: 'User Access',
    action: input.isActive ? 'ENABLE' : 'DISABLE',
    summary: `${input.isActive ? 'Enabled' : 'Disabled'} user account ${profile?.full_name || ''} (${profile?.email || ''}).`,
  });

  revalidatePath('/erp');
  return { success: true };
}

export async function adminResetUserPasswordAction(input: {
  authUserId: string;
  email: string;
  mode: 'direct' | 'email';
  newPassword?: string;
}): Promise<{ success: boolean; error?: string }> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) {
    return { success: false, error: 'Super Admin access required.' };
  }

  if (input.mode === 'direct') {
    const pw = input.newPassword || '';
    if (pw.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters.' };
    }
    const { error } = await supabaseAdmin.auth.admin.updateUserById(input.authUserId, {
      password: pw,
    });
    if (error) {
      return { success: false, error: error.message };
    }

    await recordAuditLog({
      module: 'User Access',
      action: 'PASSWORD_RESET',
      summary: `Super Admin directly reset password for ${input.email}.`,
    });
    return { success: true };
  }

  // Send Dinusha Embroidery branded 6-digit reset OTP email
  const resetRes = await requestPasswordResetAction({ email: input.email });
  if (!resetRes.success) {
    return { success: false, error: resetRes.error };
  }
  return { success: true };
}

export async function deleteErpUserAction(input: {
  id: string;
  authUserId: string;
  email: string;
}): Promise<{ success: boolean; error?: string }> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) {
    return { success: false, error: 'Super Admin access required.' };
  }

  if (guard.session.userId === input.authUserId) {
    return { success: false, error: 'You cannot delete your own Super Admin account.' };
  }

  const { error: delProfErr } = await supabaseAdmin
    .from('user_profiles')
    .delete()
    .eq('id', input.id);
  if (delProfErr) {
    return {
      success: false,
      error: formatSupabaseError(delProfErr),
    };
  }

  await supabaseAdmin.auth.admin.deleteUser(input.authUserId);

  await recordAuditLog({
    module: 'User Access',
    action: 'DELETE',
    summary: `Deleted user account ${input.email}.`,
  });

  revalidatePath('/erp');
  return { success: true };
}

export async function logClientAuditAction(input: {
  module: string;
  action: string;
  summary: string;
}): Promise<void> {
  await recordAuditLog({
    module: input.module,
    action: input.action,
    summary: input.summary,
  });
}

export async function fetchApprovalRequestsAction(): Promise<{
  success: boolean;
  requests?: ErpApprovalRequestEntity[];
  error?: string;
}> {
  const session = await checkErpSessionAction();
  if (!session.authenticated) {
    return { success: false, error: 'Authentication required.' };
  }

  const { data, error } = await supabaseAdmin
    .from('erp_audit_logs')
    .select('*')
    .eq('module', 'APPROVAL_REQUEST')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return { success: false, error: formatSupabaseError(error) };
  }

  return {
    success: true,
    requests: (data || []).map((r) => mapApprovalRequest(r)),
  };
}

export async function submitApprovalRequestAction(input: {
  requestKind: ApprovalRequestKind;
  targetId: string;
  targetLabel: string;
  amountLabel: string;
  reason: string;
  employeeId?: string;
  epfNo?: number;
  employeeName?: string;
  month?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  customerName?: string;
}): Promise<{
  success: boolean;
  request?: ErpApprovalRequestEntity;
  error?: string;
}> {
  const session = await checkErpSessionAction();
  if (!session.authenticated) {
    return { success: false, error: 'Authentication required.' };
  }

  const reasonTrim = (input.reason || '').trim();
  if (reasonTrim.length < 3) {
    return {
      success: false,
      error: 'Please provide a clear reason (at least 3 characters) for Admin review.',
    };
  }

  const kindLabel =
    input.requestKind === 'PAYROLL_EDIT'
      ? 'Edit Paid Payroll'
      : input.requestKind === 'INVOICE_DELETE'
        ? 'Delete Paid Invoice'
        : 'Update Paid Invoice';

  const summary = `[${kindLabel}] ${input.targetLabel} (${input.amountLabel}) — Reason: ${reasonTrim}`;

  const metadata = {
    requestKind: input.requestKind,
    status: 'PENDING' as ApprovalRequestStatus,
    targetId: input.targetId,
    targetLabel: input.targetLabel,
    amountLabel: input.amountLabel,
    reason: reasonTrim,
    requestedByName: session.userLabel || 'ERP User',
    requestedByEmail: session.email || '',
    requestedByRole: session.role || '',
    employeeId: input.employeeId,
    epfNo: input.epfNo,
    employeeName: input.employeeName,
    month: input.month,
    invoiceId: input.invoiceId,
    invoiceNumber: input.invoiceNumber,
    customerName: input.customerName,
    resolvedAt: null,
    resolvedByName: null,
    adminNote: null,
  };

  const { data, error } = await supabaseAdmin
    .from('erp_audit_logs')
    .insert({
      actor_user_id: session.userId || null,
      actor_email: session.email || null,
      actor_name: session.userLabel || 'ERP User',
      actor_role: session.role || null,
      module: 'APPROVAL_REQUEST',
      action: 'PENDING',
      summary,
      metadata,
    })
    .select('*')
    .single();

  if (error || !data) {
    return {
      success: false,
      error: error ? formatSupabaseError(error) : 'Failed to submit approval request.',
    };
  }

  await recordAuditLog({
    module: input.requestKind === 'PAYROLL_EDIT' ? 'Payroll' : 'Invoices & Billing',
    action: 'REQUEST_ADMIN_APPROVAL',
    summary: `Submitted request to Admin: ${summary}`,
  });

  revalidatePath('/erp');
  return {
    success: true,
    request: mapApprovalRequest(data),
  };
}

export async function resolveApprovalRequestAction(input: {
  requestId: string;
  decision: 'APPROVED' | 'REJECTED';
  adminNote?: string;
}): Promise<{
  success: boolean;
  request?: ErpApprovalRequestEntity;
  error?: string;
}> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) {
    return { success: false, error: 'Admin access required to approve or reject requests.' };
  }

  const { data: existingRow, error: fetchErr } = await supabaseAdmin
    .from('erp_audit_logs')
    .select('*')
    .eq('id', input.requestId)
    .single();

  if (fetchErr || !existingRow) {
    return {
      success: false,
      error: fetchErr ? formatSupabaseError(fetchErr) : 'Approval request not found.',
    };
  }

  const parsed = mapApprovalRequest(existingRow);

  // Execute underlying unlock / delete action when APPROVED
  if (input.decision === 'APPROVED') {
    if (parsed.requestKind === 'PAYROLL_EDIT' && parsed.employeeId && parsed.month) {
      try {
        await payrollRepository.updateRecordStatus(
          parsed.employeeId,
          parsed.month,
          'APPROVED'
        );
      } catch (err) {
        return {
          success: false,
          error:
            err instanceof Error
              ? err.message
              : 'Failed to unlock paid salary record in database.',
        };
      }
    } else if (
      parsed.requestKind === 'INVOICE_DELETE' &&
      parsed.invoiceId &&
      !parsed.invoiceId.startsWith('local-')
    ) {
      await supabaseAdmin.from('billing_invoices').delete().eq('id', parsed.invoiceId);
    }
  }

  const prevMeta =
    existingRow.metadata && typeof existingRow.metadata === 'object'
      ? (existingRow.metadata as Record<string, unknown>)
      : {};

  const updatedMeta = {
    ...prevMeta,
    status: input.decision,
    resolvedAt: new Date().toISOString(),
    resolvedByName: guard.session.userLabel || guard.session.email || 'Super Admin',
    adminNote: (input.adminNote || '').trim() || null,
  };

  const { data: updatedRow, error: updErr } = await supabaseAdmin
    .from('erp_audit_logs')
    .update({
      action: input.decision,
      metadata: updatedMeta,
    })
    .eq('id', input.requestId)
    .select('*')
    .single();

  if (updErr || !updatedRow) {
    return {
      success: false,
      error: updErr ? formatSupabaseError(updErr) : 'Failed to update approval request.',
    };
  }

  await recordAuditLog({
    module: 'Admin Approvals',
    action: input.decision === 'APPROVED' ? 'APPROVE_REQUEST' : 'REJECT_REQUEST',
    summary: `Admin ${input.decision.toLowerCase()} request: ${parsed.targetLabel} (${parsed.requestKind}).`,
  });

  revalidatePath('/erp');
  revalidatePath('/payroll');
  return {
    success: true,
    request: mapApprovalRequest(updatedRow),
  };
}
