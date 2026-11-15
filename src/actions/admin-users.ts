'use server';

import { headers } from 'next/headers';
import { supabaseAdmin, formatSupabaseError } from '@/lib/supabase/admin';
import { checkErpSessionAction, requestPasswordResetAction } from '@/actions/auth';
import { recordAuditLog } from '@/lib/audit';
import { resolveAllowedModules, type ErpModuleId } from '@/lib/rbac';
import type { UserRole } from '@/db/schema/users';
import { revalidatePath } from 'next/cache';

export interface ErpUserAccountEntity {
  id: string;
  authUserId: string;
  fullName: string;
  email: string;
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

function mapUserProfile(row: Record<string, unknown>): ErpUserAccountEntity {
  const role = (row.role as UserRole) || 'PRODUCTION_MANAGER';
  return {
    id: String(row.id),
    authUserId: String(row.auth_user_id),
    fullName: String(row.full_name || ''),
    email: String(row.email || ''),
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

async function requireSuperAdmin() {
  const session = await checkErpSessionAction();
  if (!session.authenticated || session.role !== 'SUPER_ADMIN') {
    return { ok: false as const, session };
  }
  return { ok: true as const, session };
}

export async function fetchAdminUsersAndLogsAction(): Promise<{
  success: boolean;
  users?: ErpUserAccountEntity[];
  logs?: ErpAuditLogEntity[];
  error?: string;
}> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) {
    return { success: false, error: 'Super Admin access required.' };
  }

  const [usersRes, logsRes] = await Promise.all([
    supabaseAdmin.from('user_profiles').select('*').order('created_at', { ascending: false }),
    supabaseAdmin
      .from('erp_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(250),
  ]);

  if (usersRes.error) {
    return {
      success: false,
      error: formatSupabaseError(usersRes.error),
    };
  }

  return {
    success: true,
    users: (usersRes.data || []).map((r) => mapUserProfile(r)),
    logs: (logsRes.data || []).map((r) => mapAuditLog(r)),
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

export async function createErpUserAction(input: {
  fullName: string;
  email: string;
  role: UserRole;
  password: string;
  allowedModules: ErpModuleId[];
}): Promise<{ success: boolean; user?: ErpUserAccountEntity; error?: string }> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) {
    return { success: false, error: 'Super Admin access required.' };
  }

  const fullName = (input.fullName || '').trim();
  const email = (input.email || '').trim().toLowerCase();
  const password = input.password || '';

  if (fullName.length < 2 || !email.includes('@')) {
    return { success: false, error: 'Please provide a valid full name and email address.' };
  }
  if (password.length < 6) {
    return { success: false, error: 'Initial password must be at least 6 characters.' };
  }

  const { data: createdAuth, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
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
      email,
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
    summary: `Created user ${fullName} (${email}) with role ${input.role} and ${resolvedModules.length} accessible module(s).`,
  });

  revalidatePath('/erp');
  return { success: true, user: mapUserProfile(profile) };
}

export async function updateErpUserAction(input: {
  id: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  allowedModules: ErpModuleId[];
}): Promise<{ success: boolean; user?: ErpUserAccountEntity; error?: string }> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) {
    return { success: false, error: 'Super Admin access required.' };
  }

  const resolvedModules = resolveAllowedModules(input.role, input.allowedModules);

  const { data: profile, error } = await supabaseAdmin
    .from('user_profiles')
    .update({
      full_name: input.fullName.trim(),
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
    summary: `Updated ${profile.full_name} (${profile.email}): role=${input.role}, active=${input.isActive}, modules=[${resolvedModules.join(', ')}].`,
  });

  revalidatePath('/erp');
  return { success: true, user: mapUserProfile(profile) };
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
