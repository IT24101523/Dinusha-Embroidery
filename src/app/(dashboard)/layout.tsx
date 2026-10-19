import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

  // If live credentials are provided, enforce session check
  if (!supabaseUrl.includes('placeholder')) {
    try {
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        redirect('/login');
      }
    } catch {
      // In case of network interruption, middleware handles route protection
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {children}
    </div>
  );
}
