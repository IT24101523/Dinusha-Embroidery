import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { EmailOtpType } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') || '/erp';

  const supabase = await createServerSupabaseClient();
  let authUserId: string | null = null;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      authUserId = data.user.id;
    }
  } else if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (!error && data.user) {
      authUserId = data.user.id;
    }
  }

  if (!authUserId) {
    return NextResponse.redirect(`${origin}/?login=1&auth_error=invalid_link`);
  }

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('id, auth_user_id, full_name, email, role, is_active')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (!profile || profile.is_active === false) {
    return NextResponse.redirect(`${origin}/?login=1&auth_error=inactive_profile`);
  }

  const cookieStore = await cookies();
  const opts = {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 12,
  };
  cookieStore.set('dinusha_erp_session', 'authorized', opts);
  cookieStore.set('dinusha_erp_uid', String(profile.auth_user_id), opts);
  cookieStore.set('dinusha_erp_email', String(profile.email), opts);
  cookieStore.set('dinusha_erp_user', String(profile.full_name), opts);
  cookieStore.set('dinusha_erp_role', String(profile.role), opts);

  return NextResponse.redirect(`${origin}${next.startsWith('/') ? next : '/erp'}`);
}
