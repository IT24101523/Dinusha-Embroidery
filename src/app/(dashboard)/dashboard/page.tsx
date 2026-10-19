import { createServerSupabaseClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { userProfiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { DashboardClient } from './dashboard-client';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  let userEmail = 'admin@dinusha.lk';
  let userName = 'Factory Operations Manager';
  let userRole = 'FACTORY_MANAGER';

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
