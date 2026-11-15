'use server';

import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { recordAuditLog } from '@/lib/audit';
import { sendDinushaOtpEmail } from '@/lib/mailer';
import { resolveAllowedModules, type ErpModuleId } from '@/lib/rbac';
import type { UserRole } from '@/db/schema/users';

const ERP_SESSION_COOKIE = 'dinusha_erp_session';
const ERP_USER_COOKIE = 'dinusha_erp_user';
const ERP_UID_COOKIE = 'dinusha_erp_uid';
const ERP_EMAIL_COOKIE = 'dinusha_erp_email';
const ERP_ROLE_COOKIE = 'dinusha_erp_role';

export interface ErpSessionInfo {
  authenticated: boolean;
  userId: string | null;
  email: string | null;
  userLabel: string | null;
  role: UserRole | null;
  allowedModules: ErpModuleId[];
}

function hashOtpCode(email: string, code: string): string {
  return crypto
    .createHash('sha256')
    .update(`${email.toLowerCase()}::${code}`)
    .digest('hex');
}

async function createAndSendOtp(params: {
  email: string;
  purpose: 'otp_login' | 'password_reset';
}): Promise<{ success: boolean; error?: string }> {
  const email = params.email.trim().toLowerCase();
  if (!email) {
    return { success: false, error: 'Please enter your registered email address.' };
  }

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('id, auth_user_id, full_name, role, is_active')
    .eq('email', email)
    .maybeSingle();

  if (!profile) {
    return {
      success: false,
      error: 'No ERP user account is registered with that email address.',
    };
  }
  if (profile.is_active === false) {
    return {
      success: false,
      error: 'This account is disabled. Contact Super Admin.',
    };
  }

  const code = String(crypto.randomInt(100000, 1000000));
  const codeHash = hashOtpCode(email, code);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error: insertErr } = await supabaseAdmin.from('erp_email_otps').insert({
    email,
    purpose: params.purpose,
    code_hash: codeHash,
    expires_at: expiresAt,
  });

  if (insertErr) {
    return { success: false, error: 'Failed to generate verification code.' };
  }

  const mailRes = await sendDinushaOtpEmail({
    to: email,
    recipientName: String(profile.full_name || 'Team Member'),
    code,
    purpose: params.purpose,
  });

  if (!mailRes.success) {
    return { success: false, error: mailRes.error };
  }

  await recordAuditLog({
    actor: {
      userId: String(profile.auth_user_id),
      email,
      name: String(profile.full_name),
      role: String(profile.role),
    },
    module: 'Auth',
    action: params.purpose === 'password_reset' ? 'PASSWORD_RESET_OTP_SENT' : 'OTP_EMAIL_SENT',
    summary: `Dinusha Embroidery sent a 6-digit ${
      params.purpose === 'password_reset' ? 'password reset' : 'login'
    } verification code to ${email}.`,
  });

  return { success: true };
}

async function consumeOtpRecord(params: {
  email: string;
  code: string;
  purpose: 'otp_login' | 'password_reset';
}): Promise<{ valid: boolean; error?: string }> {
  const email = params.email.trim().toLowerCase();
  const code = params.code.trim();
  const expectedHash = hashOtpCode(email, code);

  const { data: latest } = await supabaseAdmin
    .from('erp_email_otps')
    .select('id, code_hash, expires_at, used_at')
    .eq('email', email)
    .eq('purpose', params.purpose)
    .is('used_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latest) {
    return { valid: false, error: 'No active verification code found. Please request a new code.' };
  }
  if (new Date(latest.expires_at).getTime() < Date.now()) {
    return { valid: false, error: 'Verification code has expired. Please request a new code.' };
  }
  if (latest.code_hash !== expectedHash) {
    return { valid: false, error: 'Invalid 6-digit verification code.' };
  }

  await supabaseAdmin
    .from('erp_email_otps')
    .update({ used_at: new Date().toISOString() })
    .eq('id', latest.id);

  return { valid: true };
}

async function setErpSessionCookies(profile: {
  authUserId: string;
  email: string;
  fullName: string;
  role: UserRole;
}) {
  const cookieStore = await cookies();
  const opts = {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 12,
  };
  cookieStore.set(ERP_SESSION_COOKIE, 'authorized', opts);
  cookieStore.set(ERP_UID_COOKIE, profile.authUserId, opts);
  cookieStore.set(ERP_EMAIL_COOKIE, profile.email, opts);
  cookieStore.set(ERP_USER_COOKIE, profile.fullName, opts);
  cookieStore.set(ERP_ROLE_COOKIE, profile.role, opts);
}

export async function clearErpSessionCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(ERP_SESSION_COOKIE);
  cookieStore.delete(ERP_UID_COOKIE);
  cookieStore.delete(ERP_EMAIL_COOKIE);
  cookieStore.delete(ERP_USER_COOKIE);
  cookieStore.delete(ERP_ROLE_COOKIE);
}

export async function checkErpSessionAction(): Promise<ErpSessionInfo> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ERP_SESSION_COOKIE)?.value;
  const uid = cookieStore.get(ERP_UID_COOKIE)?.value || null;
  const emailCookie = cookieStore.get(ERP_EMAIL_COOKIE)?.value || null;

  if (sessionToken !== 'authorized' || !uid) {
    return {
      authenticated: false,
      userId: null,
      email: null,
      userLabel: null,
      role: null,
      allowedModules: [],
    };
  }

  // Always verify live profile & permissions from DB
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('auth_user_id, full_name, email, role, allowed_modules, is_active')
    .eq('auth_user_id', uid)
    .maybeSingle();

  if (!profile || profile.is_active === false) {
    return {
      authenticated: false,
      userId: null,
      email: null,
      userLabel: null,
      role: null,
      allowedModules: [],
    };
  }

  const role = (profile.role as UserRole) || 'PRODUCTION_MANAGER';
  const allowedModules = resolveAllowedModules(
    role,
    (profile.allowed_modules as string[] | null) ?? null
  );

  return {
    authenticated: true,
    userId: String(profile.auth_user_id),
    email: String(profile.email || emailCookie || ''),
    userLabel: String(profile.full_name || profile.email || 'ERP User'),
    role,
    allowedModules,
  };
}

export async function loginToErpAction(input: {
  email: string;
  password: string;
}): Promise<{ success: boolean; error?: string }> {
  const email = (input.email || '').trim().toLowerCase();
  const password = input.password || '';

  if (!email || !password) {
    return { success: false, error: 'Please enter both email and password.' };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return {
        success: false,
        error: error?.message || 'Invalid email or password.',
      };
    }

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('id, auth_user_id, full_name, email, role, is_active')
      .eq('auth_user_id', data.user.id)
      .maybeSingle();

    if (!profile) {
      return {
        success: false,
        error: 'No ERP access profile found for this account. Contact Super Admin.',
      };
    }

    if (profile.is_active === false) {
      return {
        success: false,
        error: 'Your ERP account has been disabled by Super Admin.',
      };
    }

    await supabaseAdmin
      .from('user_profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', profile.id);

    const role = (profile.role as UserRole) || 'PRODUCTION_MANAGER';
    await setErpSessionCookies({
      authUserId: String(profile.auth_user_id),
      email: String(profile.email),
      fullName: String(profile.full_name),
      role,
    });

    await recordAuditLog({
      actor: {
        userId: String(profile.auth_user_id),
        email: String(profile.email),
        name: String(profile.full_name),
        role,
      },
      module: 'Auth',
      action: 'LOGIN',
      summary: `${profile.full_name} (${role}) signed in via email & password.`,
    });

    return { success: true };
  } catch {
    return {
      success: false,
      error: 'Unable to sign in right now. Please try again.',
    };
  }
}

export async function requestPasswordResetAction(input: {
  email: string;
}): Promise<{ success: boolean; error?: string }> {
  return createAndSendOtp({ email: input.email, purpose: 'password_reset' });
}

export async function completePasswordResetWithOtpAction(input: {
  email: string;
  token: string;
  newPassword: string;
}): Promise<{ success: boolean; error?: string }> {
  const email = (input.email || '').trim().toLowerCase();
  const token = (input.token || '').trim();
  const newPassword = input.newPassword || '';

  if (!email || !token) {
    return { success: false, error: 'Please enter your email and 6-digit verification code.' };
  }
  if (newPassword.length < 6) {
    return { success: false, error: 'New password must be at least 6 characters.' };
  }

  const check = await consumeOtpRecord({ email, code: token, purpose: 'password_reset' });
  if (!check.valid) {
    return { success: false, error: check.error };
  }

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('id, auth_user_id, full_name, email, role, is_active')
    .eq('email', email)
    .maybeSingle();

  if (!profile || profile.is_active === false) {
    return { success: false, error: 'ERP account not found or disabled.' };
  }

  const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
    String(profile.auth_user_id),
    { password: newPassword }
  );
  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  await supabaseAdmin
    .from('user_profiles')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', profile.id);

  const role = (profile.role as UserRole) || 'PRODUCTION_MANAGER';
  await setErpSessionCookies({
    authUserId: String(profile.auth_user_id),
    email: String(profile.email),
    fullName: String(profile.full_name),
    role,
  });

  await recordAuditLog({
    actor: {
      userId: String(profile.auth_user_id),
      email: String(profile.email),
      name: String(profile.full_name),
      role,
    },
    module: 'Auth',
    action: 'PASSWORD_UPDATED',
    summary: `${profile.full_name} reset their password using Dinusha Embroidery email OTP.`,
  });

  return { success: true };
}

export async function sendEmailOtpAction(input: {
  email: string;
}): Promise<{ success: boolean; error?: string }> {
  return createAndSendOtp({ email: input.email, purpose: 'otp_login' });
}

export async function verifyEmailOtpAction(input: {
  email: string;
  token: string;
}): Promise<{ success: boolean; error?: string }> {
  const email = (input.email || '').trim().toLowerCase();
  const token = (input.token || '').trim();
  if (!email || !token) {
    return { success: false, error: 'Please enter your email and 6-digit verification code.' };
  }

  const check = await consumeOtpRecord({ email, code: token, purpose: 'otp_login' });
  if (!check.valid) {
    return { success: false, error: check.error };
  }

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('id, auth_user_id, full_name, email, role, is_active')
    .eq('email', email)
    .maybeSingle();

  if (!profile || profile.is_active === false) {
    return {
      success: false,
      error: 'ERP account not found or disabled.',
    };
  }

  await supabaseAdmin
    .from('user_profiles')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', profile.id);

  const role = (profile.role as UserRole) || 'PRODUCTION_MANAGER';
  await setErpSessionCookies({
    authUserId: String(profile.auth_user_id),
    email: String(profile.email),
    fullName: String(profile.full_name),
    role,
  });

  await recordAuditLog({
    actor: {
      userId: String(profile.auth_user_id),
      email: String(profile.email),
      name: String(profile.full_name),
      role,
    },
    module: 'Auth',
    action: 'OTP_LOGIN',
    summary: `${profile.full_name} (${role}) signed in via Dinusha Embroidery email OTP.`,
  });

  return { success: true };
}

export async function updateOwnPasswordAction(input: {
  newPassword: string;
}): Promise<{ success: boolean; error?: string }> {
  const newPassword = input.newPassword || '';
  if (newPassword.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters.' };
  }

  const supabase = await createServerSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return {
      success: false,
      error: 'Password reset session expired. Please request a new reset email.',
    };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    return { success: false, error: error.message };
  }

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('auth_user_id, full_name, email, role')
    .eq('auth_user_id', userData.user.id)
    .maybeSingle();

  if (profile) {
    await setErpSessionCookies({
      authUserId: String(profile.auth_user_id),
      email: String(profile.email),
      fullName: String(profile.full_name),
      role: profile.role as UserRole,
    });
    await recordAuditLog({
      actor: {
        userId: String(profile.auth_user_id),
        email: String(profile.email),
        name: String(profile.full_name),
        role: String(profile.role),
      },
      module: 'Auth',
      action: 'PASSWORD_UPDATED',
      summary: `${profile.full_name} reset their password via email verification.`,
    });
  }

  return { success: true };
}

export async function logoutFromErpAction(): Promise<{ success: boolean }> {
  await recordAuditLog({
    module: 'Auth',
    action: 'LOGOUT',
    summary: 'User signed out of the ERP system.',
  });
  await clearErpSessionCookies();
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  } catch {
    // Ignore if Supabase Auth session does not exist
  }
  return { success: true };
}
