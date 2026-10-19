import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { userProfiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { DashboardClient } from './dashboard-client';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  let userEmail = 'manager@dinusha.com';
  let userName = 'Kamal Silva';
  let userRole = 'FACTORY_MANAGER';

  try {
    const cookieStore = await cookies();
    const localSession = cookieStore.get('factory_local_session')?.value;
    if (localSession) {
      try {
        const parsed = JSON.parse(localSession);
        if (parsed.email) userEmail = parsed.email;
        if (parsed.fullName) userName = parsed.fullName;
        if (parsed.role) userRole = parsed.role;
      } catch {
        // ignore parse error
      }
    }
  } catch {
    // ignore cookie read error
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      userEmail = user.email || userEmail;
      userName = user.user_metadata?.full_name || userName;
      userRole = user.user_metadata?.role || userRole;

      try {
        const profile = await db.query.userProfiles.findFirst({
          where: eq(userProfiles.authUserId, user.id),
        });
        if (profile) {
          userName = profile.fullName;
          userRole = profile.role;
        }
      } catch (err) {
        console.warn('Could not query user_profiles from DB:', err);
      }
    }
  } catch (err) {
    console.warn('Supabase auth check bypassed:', err);
  }

  return (
    <DashboardClient
      user={{
        email: userEmail,
        fullName: userName,
        role: userRole,
      }}
    />
  );
}
