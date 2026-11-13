import { createClient } from '@supabase/supabase-js';

function sanitizeEnvValue(val: string | undefined): string {
  if (!val) return '';
  return val.trim().replace(/^["']|["']$/g, '').trim();
}

const supabaseUrl = sanitizeEnvValue(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
);
const supabaseServiceKey = sanitizeEnvValue(
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export function formatSupabaseError(error: { message: string; details?: string; hint?: string }): string {
  const details = error.details ? ` (${error.details})` : '';
  if (error.message.includes('fetch failed')) {
    let host = 'missing';
    try {
      host = supabaseUrl ? new URL(supabaseUrl).host : 'missing';
    } catch {
      host = 'invalid-url';
    }
    return `Database connection failed [target: ${host}]${details} — Check Vercel Environment Variables (NEXT_PUBLIC_SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY).`;
  }
  return `${error.message}${details}`;
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
