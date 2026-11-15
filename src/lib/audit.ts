import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/admin';

export interface AuditActor {
  userId?: string | null;
  email?: string | null;
  name?: string | null;
  role?: string | null;
}

export async function getActorFromCookies(): Promise<AuditActor> {
  try {
    const cookieStore = await cookies();
    return {
      userId: cookieStore.get('dinusha_erp_uid')?.value || null,
      email: cookieStore.get('dinusha_erp_email')?.value || null,
      name: cookieStore.get('dinusha_erp_user')?.value || 'System User',
      role: cookieStore.get('dinusha_erp_role')?.value || null,
    };
  } catch {
    return { name: 'System' };
  }
}

export async function recordAuditLog(params: {
  actor?: AuditActor;
  module: string;
  action: string;
  summary: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const actor = params.actor || (await getActorFromCookies());
    await supabaseAdmin.from('erp_audit_logs').insert({
      actor_user_id: actor.userId || null,
      actor_email: actor.email || null,
      actor_name: actor.name || 'System',
      actor_role: actor.role || null,
      module: params.module,
      action: params.action,
      summary: params.summary,
      metadata: params.metadata || {},
    });
  } catch (err) {
    console.warn('[AuditLog] Failed to record audit log:', err);
  }
}
